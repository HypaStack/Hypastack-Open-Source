// hypahash is a tiny sidecar that offloads password-key derivation from the
// Node app. It speaks HTTP over a Unix domain socket and reproduces the exact
// hash the Node code produces, so stored access-key hashes stay compatible:
//
//	salt = 16 random bytes, hex-encoded (32 chars)
//	key  = PBKDF2-HMAC-SHA512(password, saltHexBytes, 100000 iters, 64 bytes)
//	hash = "<salt>:<hex(key)>"
//
// The salt fed into PBKDF2 is the ASCII bytes of the hex string (matching
// Node's crypto.pbkdf2Sync(password, saltHexString, ...)), NOT the decoded
// 16 bytes.
package main

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
)

const (
	iterations = 100000
	keyLen     = 64
	saltBytes  = 16
)

// pbkdf2SHA512 is the standard RFC 2898 derivation. Kept in-tree (no external
// dependency) so the build has zero module fetches and the algorithm is pinned.
func pbkdf2SHA512(password, salt []byte, iter, keyLength int) []byte {
	prf := hmac.New(sha512.New, password)
	hLen := prf.Size()
	numBlocks := (keyLength + hLen - 1) / hLen

	dk := make([]byte, 0, numBlocks*hLen)
	U := make([]byte, 0, hLen)
	T := make([]byte, hLen)
	var idx [4]byte

	for block := 1; block <= numBlocks; block++ {
		idx[0] = byte(block >> 24)
		idx[1] = byte(block >> 16)
		idx[2] = byte(block >> 8)
		idx[3] = byte(block)

		prf.Reset()
		prf.Write(salt)
		prf.Write(idx[:])
		U = prf.Sum(U[:0])
		copy(T, U)

		for n := 2; n <= iter; n++ {
			prf.Reset()
			prf.Write(U)
			U = prf.Sum(U[:0])
			for x := range T {
				T[x] ^= U[x]
			}
		}
		dk = append(dk, T...)
	}
	return dk[:keyLength]
}

func genSalt() (string, error) {
	b := make([]byte, saltBytes)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

type deriveReq struct {
	Password string `json:"password"`
	Salt     string `json:"salt"`
}

type deriveResp struct {
	Hash string `json:"hash"`
	Salt string `json:"salt"`
}

// handleDerive computes the hash for a password. If no salt is supplied one is
// generated (register); when a salt is supplied the caller is verifying and
// does the constant-time compare itself.
func handleDerive(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req deriveReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<16)).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	if req.Password == "" {
		http.Error(w, "password required", http.StatusBadRequest)
		return
	}

	salt := req.Salt
	if salt == "" {
		s, err := genSalt()
		if err != nil {
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
		salt = s
	}

	dk := pbkdf2SHA512([]byte(req.Password), []byte(salt), iterations, keyLen)
	resp := deriveResp{Hash: salt + ":" + hex.EncodeToString(dk), Salt: salt}

	w.Header().Set("content-type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

func main() {
	socketPath := os.Getenv("HASH_SOCKET_PATH")
	if socketPath == "" {
		socketPath = "/run/hypahash/hash.sock"
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
	mux.HandleFunc("/derive", handleDerive)
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) })

	srv := &http.Server{Handler: mux}

	go func() {
		sig := make(chan os.Signal, 1)
		signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
		<-sig
		_ = srv.Close()
		_ = os.Remove(socketPath)
	}()

	log.Printf("hypahash listening on %s", socketPath)
	if err := srv.Serve(ln); err != nil && err != http.ErrServerClosed {
		log.Fatalf("serve: %v", err)
	}
}
