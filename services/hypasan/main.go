// hypasan is a tiny sidecar that offloads user-input validation from the Node
// app. It speaks HTTP over a Unix domain socket and provides:
//
// /sanitize — mirrors the note pipeline in lib/security/zeroTrust.ts:
//
//	1. trim whitespace
//	2. strip ALL HTML tags, keep text content (bluemonday StrictPolicy,
//	   the Go equivalent of DOMPurify with ALLOWED_TAGS: [])
//	3. strip injection patterns (control chars, protocol handlers, NoSQL
//	   operators, template markers, SQL keywords, null bytes)
//	4. clamp to the caller-supplied max length
//
// The caller sends max_len so the length limit has a single source of truth
// (MAX_NOTE_LENGTH in the Node constants).
//
// /sniff — magic-byte content detection (the file-type equivalent). Takes the
// raw head bytes of a file, returns {mime, ext} or empty strings when unknown.
// The allow/block decisions stay in Node (constants/security.ts); this only
// detects.
package main

import (
	"encoding/json"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"regexp"
	"strings"
	"syscall"

	"github.com/gabriel-vasile/mimetype"
	"github.com/microcosm-cc/bluemonday"
)

var stripAllTags = bluemonday.StrictPolicy()

// Ported 1:1 from stripInjectionPatterns in lib/security/zeroTrust.ts.
var (
	reControlChars = regexp.MustCompile(`[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]`)
	reJavascript   = regexp.MustCompile(`(?i)javascript\s*:`)
	reData         = regexp.MustCompile(`(?i)data\s*:`)
	reVbscript     = regexp.MustCompile(`(?i)vbscript\s*:`)
	reMongoOps     = regexp.MustCompile(`(?i)\$(?:gt|gte|lt|lte|ne|eq|in|nin|or|and|not|nor|exists|type|regex|where|expr|jsonSchema|all|elemMatch|size|set|unset|inc|push|pull|addToSet|rename|currentDate|min|max|mul)\b`)
	reSQL          = regexp.MustCompile(`(?i)('|--|;|\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|UNION|TRUNCATE|DECLARE|CAST|CONVERT|WAITFOR|xp_)\b)`)
)

func stripInjectionPatterns(s string) string {
	s = reControlChars.ReplaceAllString(s, "")
	s = reJavascript.ReplaceAllString(s, "")
	s = reData.ReplaceAllString(s, "")
	s = reVbscript.ReplaceAllString(s, "")
	s = reMongoOps.ReplaceAllString(s, "")
	s = strings.ReplaceAll(s, "${", "\\${") // template literal injection
	s = strings.ReplaceAll(s, "{{", "{ {")  // template engine injection
	s = reSQL.ReplaceAllString(s, "")
	s = strings.ReplaceAll(s, "\x00", "") // null bytes (belt-and-suspenders)
	return strings.TrimSpace(s)
}

func sanitizeNote(note string, maxLen int) string {
	s := strings.TrimSpace(note)
	if s == "" {
		return ""
	}
	s = stripAllTags.Sanitize(s)
	s = stripInjectionPatterns(s)
	if runes := []rune(s); maxLen > 0 && len(runes) > maxLen {
		s = string(runes[:maxLen])
	}
	return s
}

type sanitizeReq struct {
	Note   string `json:"note"`
	MaxLen int    `json:"max_len"`
}

type sanitizeResp struct {
	Sanitized string `json:"sanitized"`
}

func handleSanitize(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req sanitizeReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<16)).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	resp := sanitizeResp{Sanitized: sanitizeNote(req.Note, req.MaxLen)}
	w.Header().Set("content-type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

type sniffResp struct {
	Mime string `json:"mime"`
	Ext  string `json:"ext"`
}

// handleSniff detects content type from raw head bytes (application/octet-stream
// body). Unknown/binary-without-signature comes back as empty strings so the
// Node caller can apply its own fallback (text heuristic).
func handleSniff(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	head, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 1<<20))
	if err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	resp := sniffResp{}
	if len(head) > 0 {
		mtype := mimetype.Detect(head)
		mime := mtype.String()
		if i := strings.IndexByte(mime, ';'); i >= 0 {
			mime = strings.TrimSpace(mime[:i]) // drop "; charset=..." params
		}
		// The root of mimetype's tree means "no signature matched" — report
		// unknown rather than a meaningless application/octet-stream.
		if mime != "application/octet-stream" {
			resp.Mime = mime
			resp.Ext = strings.TrimPrefix(mtype.Extension(), ".")
		}
	}

	w.Header().Set("content-type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

func main() {
	socketPath := os.Getenv("SAN_SOCKET_PATH")
	if socketPath == "" {
		socketPath = "/run/hypasan/san.sock"
	}

	// Clear any stale socket left by an unclean shutdown.
	if err := os.Remove(socketPath); err != nil && !os.IsNotExist(err) {
		log.Fatalf("remove stale socket %s: %v", socketPath, err)
	}

	ln, err := net.Listen("unix", socketPath)
	if err != nil {
		log.Fatalf("listen %s: %v", socketPath, err)
	}
	// Owner+group rw so the co-mounted Node container (same host uid) can connect.
	if err := os.Chmod(socketPath, 0o660); err != nil {
		log.Fatalf("chmod %s: %v", socketPath, err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/sanitize", handleSanitize)
	mux.HandleFunc("/sniff", handleSniff)
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) })

	srv := &http.Server{Handler: mux}

	go func() {
		sig := make(chan os.Signal, 1)
		signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
		<-sig
		_ = srv.Close()
		_ = os.Remove(socketPath)
	}()

	log.Printf("hypasan listening on %s", socketPath)
	if err := srv.Serve(ln); err != nil && err != http.ErrServerClosed {
		log.Fatalf("serve: %v", err)
	}
}
