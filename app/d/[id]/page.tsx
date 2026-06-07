"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MIcon } from "@/components/ui/material-icon";
import { importKeyFromBase64, decryptChunk, MULTIPART_THRESHOLD } from "@/lib/multipart";
import { motion } from "motion/react";

interface FileInfo {
  id: string; name: string; size: number; contentType: string; expiresAt: string;
  downloadCount: number; hasPin: boolean; burnOnRead: boolean; customFilename?: string;
  note?: string; encryptionChunkSize?: number | null; encryptionTotalParts?: number | null;
}

function fmt(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024, s = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + s[i];
}

function daysLeft(d: string): number {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 864e5);
}

export default function DownloadPage() {
  const { id: fileId } = useParams() as { id: string };
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitError, setRateLimitError] = useState<{ message: string; retryAfter: number } | null>(null);
  const [downloadCooldown, setDownloadCooldown] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [burned, setBurned] = useState(false);
  const [encryptionKeyBase64, setEncryptionKeyBase64] = useState<string | null>(null);
  const [missingKey, setMissingKey] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [decryptProgress, setDecryptProgress] = useState(0);
  const [downloadPhase, setDownloadPhase] = useState<'idle' | 'downloading' | 'decrypting' | 'done'>('idle');
  const [forceLocked, setForceLocked] = useState(false);

  useEffect(() => {
    if (downloadCooldown <= 0) return;
    const t = setInterval(() => setDownloadCooldown(p => { if (p <= 1) { clearInterval(t); return 0 } return p - 1 }), 1000);
    return () => clearInterval(t);
  }, [downloadCooldown]);

  useEffect(() => {
    const m = window.location.hash.match(/key=([A-Za-z0-9_-]+)/);
    if (m) {
      setEncryptionKeyBase64(m[1]);
      (async () => {
        try {
          const r = await fetch(`/api/v2/files/${fileId}`);
          const d = await r.json();
          if (!r.ok) { setError(d.error || "File not found"); return }
          setFileInfo(d.file);
          if (d.file?.name) document.title = `Download ${d.file.customFilename || d.file.name} - Hypastack`;
        } catch { setError("Failed to load file information") }
        finally { setLoading(false) }
      })();
    } else {
      setMissingKey(true);
      setLoading(false);
    }
  }, [fileId]);

  const handleDownload = async () => {
    if (!fileInfo || burned || downloadCooldown > 0) return;
    setDownloading(true); setRateLimitError(null); setDownloadProgress(0); setDecryptProgress(0);
    setDownloadPhase('idle');

    let wasBurned = false;
    let downloadUrl = "";

    try {
      const r = await fetch(`/api/v2/files/${fileId}/download`, { method: "POST" });
      const data = await r.json();
      if (r.status === 429) {
        setRateLimitError({ message: data.message || "Too many downloads.", retryAfter: Math.ceil(data.retryAfter || 60) });
        setDownloadCooldown(Math.ceil(data.retryAfter || 60));
        setDownloading(false);
        return;
      }
      if (!r.ok) { setError(data.error || "Download failed"); setDownloading(false); return }      wasBurned = !!data.burned;
      downloadUrl = data.downloadUrl;
    } catch {
      setError("Failed to start download");
      setDownloading(false);
      return;
    }    try {
      if (encryptionKeyBase64) {
        const encKey = await importKeyFromBase64(encryptionKeyBase64);
        setDownloadPhase('downloading');
        const encR = await fetch(downloadUrl);
        if (!encR.ok) throw new Error(`HTTP ${encR.status}`);
        const encData = await encR.arrayBuffer();
        setDownloadProgress(100); setDownloadPhase('decrypting');
        const OH = 28, tp = fileInfo?.encryptionTotalParts ?? null, cs = fileInfo?.encryptionChunkSize ?? null;
        const isMP = tp !== null && tp > 1 && cs !== null;
        let parts: ArrayBuffer[] = [];
        const dn = fileInfo?.customFilename || fileInfo?.name || "download";
        const canStream = 'showSaveFilePicker' in window && encData.byteLength > MULTIPART_THRESHOLD;
        let fs: FileSystemWritableFileStream | null = null;
        if (canStream) {
          try {
            const h = await (window as any).showSaveFilePicker({ suggestedName: dn });
            fs = await h.createWritable();
          } catch (e: any) {
            if (e.name === 'AbortError') { setDownloadPhase('done'); setDownloading(false); return }
            fs = null;
          }
        }
        if (isMP) {
          const efc = cs! + OH; let off = 0, tb = encData.byteLength;
          while (off < tb) {
            const sz = Math.min(efc, tb - off);
            const dec = await decryptChunk(encKey, encData.slice(off, off + sz));
            if (fs) await fs.write(dec); else parts.push(dec);
            off += sz;
            setDecryptProgress(Math.min(99, Math.round((off / tb) * 100)));
          }
        } else {
          const dec = await decryptChunk(encKey, encData);
          if (fs) await fs.write(dec); else parts.push(dec);
        }
        setDecryptProgress(100);
        if (fs) {
          await fs.close();
        } else {
          const total = parts.reduce((a, p) => a + p.byteLength, 0), buf = new Uint8Array(total); let wo = 0;
          for (const p of parts) { buf.set(new Uint8Array(p), wo); wo += p.byteLength }
          const blob = new Blob([buf], { type: fileInfo?.contentType || "application/octet-stream" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a"); a.href = url; a.download = dn; a.rel = "noopener";
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
        setDownloadPhase('done');
      } else {
        const a = document.createElement("a"); a.href = downloadUrl; a.rel = "noopener";
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      }

      setDownloaded(true);      if (wasBurned) {
        setBurned(true);
        setForceLocked(true);
        setTimeout(() => window.location.reload(), 2500);
      }
    } catch {
      setError("Decryption failed. The link may be invalid.");
    } finally {
      setDownloading(false);
    }
  };

  const displayName = fileInfo ? (fileInfo.customFilename || fileInfo.name) : "";
  const ext = displayName.includes(".") ? displayName.split(".").pop()?.toUpperCase() : "FILE";

  if (missingKey) {
    return (
      <main className="min-h-screen relative font-sans bg-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 flex flex-col justify-center items-center px-4"
        >
          <div className="max-w-[440px] w-full text-center flex flex-col items-center">
            <div className="flex items-center gap-3 mb-3">
              <MIcon name="key_off" style={{ color: '#ef4444' }} size={28} />
              <h2 className="text-[20px] font-semibold text-[#111] tracking-tight">
                Locked
              </h2>
            </div>
            <p className="text-[14px] text-[#888] leading-relaxed">
              You are missing the #key= portion of the URL. Viewing and downloading is completely disabled.
            </p>
          </div>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-8 font-sans bg-white">
      <div className="relative w-full max-w-[440px]">
        <div className="flex justify-center mb-8">
          <Link href="/" className="hover:opacity-80 transition-opacity active:scale-[0.97]">
            <img src="https://r2.hypastack.com/cdn/u1y77k752jdm/icon.webp" className="select-none h-14 w-14 rounded-[12px]" alt="Hypastack" draggable={false} />
          </Link>
        </div>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24">
            <svg className="animate-spin h-8 w-8 text-[#ccc]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </motion.div>
        )}

        {error && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 24, border: '1px solid #e5e5e5', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
              <div className="flex items-center gap-3 mb-3">
                <MIcon name="error" className="text-red-500" size={28} />
                <h2 className="text-[20px] font-semibold text-[#111] tracking-tight">
                  {error === "File has expired" ? "Link expired" : "File not found"}
                </h2>
              </div>
              <p className="text-[13px] text-[#888] mb-6 leading-relaxed">
                {error === "File has expired" ? "This file has been permanently deleted from our servers." : "The file you're looking for doesn't exist or has been removed."}
              </p>
              <div className="flex gap-2">
                <Link
                  href="/manage/files"
                  className="hover:bg-[#111] active:scale-[0.97] transition-all duration-75 flex items-center justify-center"
                  style={{ height: 38, paddingLeft: 16, paddingRight: 16, borderRadius: 12, fontSize: 13, fontWeight: 600, color: '#ffffff', backgroundColor: '#030303' }}
                >Upload a file</Link>
                <Link
                  href="/"
                  className="hover:bg-[#f0f0f0] active:scale-[0.97] transition-all duration-75 flex items-center justify-center"
                  style={{ height: 38, paddingLeft: 16, paddingRight: 16, borderRadius: 12, fontSize: 13, fontWeight: 500, color: '#333', backgroundColor: '#f5f5f5', border: '1px solid #e5e5e5' }}
                >Home</Link>
              </div>
            </div>
          </motion.div>
        )}

        {fileInfo && !error && !missingKey && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: 20, overflow: 'hidden', border: '1px solid #e5e5e5', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
              <div style={{ padding: '20px 20px 16px' }}>
                <h1 className={`text-[18px] font-semibold tracking-tight break-all leading-snug mb-2 ${!encryptionKeyBase64 ? 'text-[#bbb] italic' : 'text-[#111]'}`}>
                  {encryptionKeyBase64 ? displayName : "Unavailable"}
                </h1>
                <div className="flex items-center gap-2">
                  {encryptionKeyBase64 && <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#888', backgroundColor: '#f0f0f0', border: '1px solid #e5e5e5', padding: '2px 6px', borderRadius: 5 }}>{ext}</span>}
                  <span style={{ fontSize: 13, color: '#888' }}>
                    {encryptionKeyBase64 ? fmt(fileInfo.size) : <span className="flex items-center gap-1.5"><MIcon name="visibility_off" size={14} />Unavailable</span>}
                  </span>
                </div>
              </div>

              {fileInfo.note && fileInfo.note.trim() && encryptionKeyBase64 && (
                <div style={{ margin: '0 12px 12px', borderRadius: 14, backgroundColor: '#f9f9f9', border: '1px solid #ebebeb', padding: '12px 14px' }}>
                  <p className="text-[13px] font-medium text-[#333] break-words leading-relaxed">{fileInfo.note}</p>
                  <p className="text-[11px] text-[#aaa] mt-2">This note was attached by the uploader. Hypastack is not responsible for its content.</p>
                </div>
              )}

              <div style={{ margin: '0 12px 12px', borderRadius: 14, backgroundColor: '#f9f9f9', border: '1px solid #ebebeb', padding: 4 }}>
                {[
                  { icon: "schedule", label: "Expires", value: encryptionKeyBase64 ? `${daysLeft(fileInfo.expiresAt)} days` : "Unavailable", show: true, color: !encryptionKeyBase64 ? "text-[#ccc]" : "text-[#333]" },
                  { icon: "local_fire_department", label: "Burn on read", value: burned ? "Burned" : "Active", show: !!fileInfo.burnOnRead && !!encryptionKeyBase64, color: burned ? "text-red-500" : "text-amber-500" },
                  { icon: "shield", label: "Encryption", value: "End-to-end", show: true, color: encryptionKeyBase64 ? "text-[#111] underline underline-offset-2" : "text-[#ccc]" },
                ].filter(r => r.show).map((r, i, arr) => (
                  <div key={i}>
                    <div
                      className="flex items-center justify-between hover:bg-[#f0f0f0] transition-all duration-75"
                      style={{ height: 38, paddingLeft: 12, paddingRight: 12, borderRadius: 10 }}
                    >
                      <span className="flex items-center gap-2.5" style={{ fontSize: 13, color: '#888' }}>
                        <MIcon name={r.icon} size={14} style={{ color: '#bbb' }} />{r.label}
                      </span>
                      <span className={`text-[13px] font-medium ${r.color || "text-[#333]"}`}>{r.value}</span>
                    </div>
                    {i < arr.length - 1 && <div style={{ height: 1, margin: '0 8px', backgroundColor: '#ebebeb' }} />}
                  </div>
                ))}
              </div>

              {downloadPhase === 'downloading' && (
                <div style={{ margin: '0 12px 12px', borderRadius: 14, backgroundColor: '#f9f9f9', border: '1px solid #ebebeb', padding: '10px 14px' }}>
                  <p className="text-[12px] text-[#888] mb-1.5">Downloading...</p>
                  <div className="w-full h-1.5 rounded-full bg-[#ebebeb] overflow-hidden">
                    <div className="h-full bg-[#111] rounded-full transition-all duration-300" style={{ width: `${downloadProgress}%` }} />
                  </div>
                </div>
              )}

              {downloadPhase === 'decrypting' && (
                <div style={{ margin: '0 12px 12px', borderRadius: 14, backgroundColor: '#f9f9f9', border: '1px solid #ebebeb', padding: '10px 14px' }}>
                  <p className="text-[12px] text-[#888] mb-1.5">Decrypting... {decryptProgress}%</p>
                  <div className="w-full h-1.5 rounded-full bg-[#ebebeb] overflow-hidden">
                    <div className="h-full bg-[#111] rounded-full transition-all duration-300" style={{ width: `${decryptProgress}%` }} />
                  </div>
                </div>
              )}

              <div style={{ padding: '0 12px 12px' }}>
                {(rateLimitError || downloadCooldown > 0) && (
                  <div className="mb-3 text-center" style={{ borderRadius: 12, backgroundColor: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', padding: '10px 14px' }}>
                    <p className="text-[12px] font-medium text-amber-600">{rateLimitError?.message || "Too many downloads."}</p>
                    <p className="text-[11px] text-amber-500/60 mt-0.5">Try again in {downloadCooldown}s</p>
                  </div>
                )}
                {downloaded ? (
                  <div className="space-y-2">
                    <button
                      onClick={!burned ? handleDownload : undefined}
                      disabled={burned || downloadCooldown > 0}
                      className={`w-full flex items-center justify-center gap-2 active:scale-[0.97] transition-all duration-75 ${burned ? 'cursor-default' : 'hover:bg-[#f0f0f0] disabled:opacity-40'}`}
                      style={{ height: 42, borderRadius: 14, fontSize: 14, fontWeight: 600, color: burned ? '#bbb' : '#333', backgroundColor: '#f5f5f5', border: '1px solid #e5e5e5' }}
                    >
                      {burned ? (
                        <><MIcon name="local_fire_department" className="text-red-400" size={16} />File burned</>
                      ) : downloadCooldown > 0 ? (
                        <><MIcon name="schedule" size={16} />Wait {downloadCooldown}s</>
                      ) : (
                        <><MIcon name="download" size={16} />Download again</>
                      )}
                    </button>
                    {burned && <p className="text-[12px] text-[#bbb] text-center">This file has been permanently deleted after download.</p>}
                  </div>
                ) : (
                  <button
                    onClick={handleDownload}
                    disabled={downloading || downloadCooldown > 0 || !encryptionKeyBase64 || forceLocked}
                    className="w-full flex items-center justify-center gap-2 hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ height: 42, borderRadius: 14, fontSize: 14, fontWeight: 600, color: '#fff', backgroundColor: '#030303' }}
                  >
                    {downloading && !forceLocked ? (
                      <><svg className="animate-spin h-4 w-4 text-[#888]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Preparing…</>
                    ) : downloadCooldown > 0 ? (
                      <><MIcon name="schedule" size={16} />Wait {downloadCooldown}s</>
                    ) : !encryptionKeyBase64 || forceLocked ? (
                      <><MIcon name="lock" size={16} />Locked</>
                    ) : (
                      <><MIcon name="download" size={16} />Download</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
