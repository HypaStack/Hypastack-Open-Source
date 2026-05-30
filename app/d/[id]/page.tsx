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
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [decryptProgress, setDecryptProgress] = useState(0);
  const [downloadPhase, setDownloadPhase] = useState<'idle' | 'downloading' | 'decrypting' | 'done'>('idle');
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [totalDownloadBytes, setTotalDownloadBytes] = useState(0);
  const [forceLocked, setForceLocked] = useState(false);

  useEffect(() => {
    if (downloadCooldown <= 0) return;
    const t = setInterval(() => setDownloadCooldown(p => { if (p <= 1) { clearInterval(t); return 0 } return p - 1 }), 1000);
    return () => clearInterval(t);
  }, [downloadCooldown]);

  useEffect(() => {
    const m = window.location.hash.match(/key=([A-Za-z0-9_-]+)/);
    if (m) setEncryptionKeyBase64(m[1]);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/v2/files/${fileId}`);
        const d = await r.json();
        if (!r.ok) { setError(d.error || "File not found"); return }
        setFileInfo(d.file);
        if (d.file?.name) document.title = `Download ${d.file.customFilename || d.file.name} — Hypastack`;
      } catch { setError("Failed to load file information") }
      finally { setLoading(false) }
    })();
  }, [fileId]);

  const handleDownload = async () => {
    if (!fileInfo || burned || downloadCooldown > 0) return;
    setDownloading(true); setRateLimitError(null); setDownloadProgress(0); setDecryptProgress(0);
    setDownloadPhase('idle'); setDownloadSpeed(0); setDownloadedBytes(0); setTotalDownloadBytes(0);
    try {
      const r = await fetch(`/api/v2/files/${fileId}/download`, { method: "POST" });
      const data = await r.json();
      if (r.status === 429) { setRateLimitError({ message: data.message || "Too many downloads.", retryAfter: data.retryAfter || 60 }); setDownloadCooldown(data.retryAfter || 60); setDownloading(false); return }
      if (!r.ok) { setError(data.error || "Download failed"); return }
      if (data.burned) {
        setBurned(true);
        setForceLocked(true);
        setTimeout(() => window.location.reload(), 1000);
      }

      if (encryptionKeyBase64) {
        try {
          const encKey = await importKeyFromBase64(encryptionKeyBase64);
          setDownloadPhase('downloading');
          const encR = await fetch(data.downloadUrl);
          if (!encR.ok) throw new Error(`HTTP ${encR.status}`);
          const encData = await encR.arrayBuffer();
          setDownloadProgress(100); setDownloadPhase('decrypting');
          const OH = 28, tp = fileInfo?.encryptionTotalParts ?? null, cs = fileInfo?.encryptionChunkSize ?? null;
          const isMP = tp !== null && tp > 1 && cs !== null;
          let parts: ArrayBuffer[] = [];
          const dn = fileInfo?.customFilename || fileInfo?.name || "download";
          const canStream = 'showSaveFilePicker' in window && encData.byteLength > MULTIPART_THRESHOLD;
          let fs: any = null;
          if (canStream) { try { const h = await (window as any).showSaveFilePicker({ suggestedName: dn }); fs = await h.createWritable() } catch (e: any) { if (e.name === 'AbortError') { setDownloadPhase('done'); return } fs = null } }
          if (isMP) {
            const efc = cs! + OH; let off = 0, tb = encData.byteLength;
            while (off < tb) { const sz = Math.min(efc, tb - off); const dec = await decryptChunk(encKey, encData.slice(off, off + sz)); if (fs) await fs.write(dec); else parts.push(dec); off += sz; setDecryptProgress(Math.min(99, Math.round((off / tb) * 100))) }
          } else { const dec = await decryptChunk(encKey, encData); if (fs) await fs.write(dec); else parts.push(dec) }
          setDecryptProgress(100);
          if (fs) { await fs.close(); setDownloadPhase('done'); setDownloaded(true); return }
          const total = parts.reduce((a, p) => a + p.byteLength, 0), buf = new Uint8Array(total); let wo = 0;
          for (const p of parts) { buf.set(new Uint8Array(p), wo); wo += p.byteLength }
          const blob = new Blob([buf], { type: fileInfo?.contentType || "application/octet-stream" });
          const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = dn; a.rel = "noopener"; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
          setDownloadPhase('done');
        } catch { setError("Decryption failed. The link may be invalid."); return }
      } else {
        const a = document.createElement("a"); a.href = data.downloadUrl; a.rel = "noopener"; document.body.appendChild(a); a.click(); document.body.removeChild(a);
      }
      setDownloaded(true);
    } catch { setError("Failed to start download") }
    finally { setDownloading(false) }
  };

  const displayName = fileInfo ? (fileInfo.customFilename || fileInfo.name) : "";
  const ext = displayName.includes(".") ? displayName.split(".").pop()?.toUpperCase() : "FILE";

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-8 font-sans" style={{ backgroundColor: '#0f0f0f' }}>
      {/* Subtle radial glow */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255,255,255,0.02) 0%, transparent 70%)" }} />

      <div className="relative w-full max-w-[440px]">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <img src="https://r2.hypastack.com/cdn/u1y77k752jdm/icon.webp" className="select-none pointer-events-none h-7 w-7 rounded-[6px]" alt="Hypastack" draggable={false} />
          <span className="text-[14px] font-medium text-[#555] tracking-tight">hypastack</span>
        </div>

        {/* Loading */}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24">
            <img src="https://r2.hypastack.com/cdn/u1y77k752jdm/icon.webp" className="select-none pointer-events-none h-10 w-10 rounded-[8px] animate-[spin_1.5s_ease-in-out_infinite] mb-5 opacity-40" alt="" draggable={false} />
            <p className="text-[13px] text-[#555] font-medium">Decrypting metadata…</p>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ padding: 4, borderRadius: 20, backgroundColor: '#1f1f1f', boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 2px 6px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.22)' }}>
              <div style={{ backgroundColor: '#111111', borderRadius: 16, padding: 24 }}>
                <div className="flex items-center gap-3 mb-3">
                  <MIcon name="error" className="text-red-500" size={28} />
                  <h2 className="text-[20px] font-semibold text-white tracking-tight" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>
                    {error === "File has expired" ? "Link expired" : "File not found"}
                  </h2>
                </div>
                <p className="text-[13px] text-[#777] mb-6 leading-relaxed">
                  {error === "File has expired" ? "This file has been permanently deleted from our servers." : "The file you\u2019re looking for doesn\u2019t exist or has been removed."}
                </p>
                <div className="flex gap-2">
                  <Link
                    href="/manage/files"
                    className="hover:bg-[#e2e2e8] active:scale-[0.97] transition-all duration-75 flex items-center justify-center"
                    style={{ height: 38, paddingLeft: 16, paddingRight: 16, borderRadius: 12, fontSize: 13, fontWeight: 600, color: '#0a0a0a', backgroundColor: '#ffffff' }}
                  >Upload a file</Link>
                  <Link
                    href="/"
                    className="hover:bg-[#313131] active:scale-[0.97] transition-all duration-75 flex items-center justify-center"
                    style={{ height: 38, paddingLeft: 16, paddingRight: 16, borderRadius: 12, fontSize: 13, fontWeight: 500, color: '#ccc', backgroundColor: '#171717' }}
                  >Home</Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* File card */}
        {fileInfo && !error && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div style={{ padding: 4, borderRadius: 20, backgroundColor: '#1f1f1f', boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 2px 6px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.22)' }}>
              <div style={{ backgroundColor: '#111111', borderRadius: 16, overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ padding: '20px 20px 16px' }}>
                <h1 className={`text-[18px] font-semibold tracking-tight break-all leading-snug mb-2 ${!encryptionKeyBase64 ? 'text-zinc-500 italic' : 'text-white'}`} style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>
                  {encryptionKeyBase64 ? displayName : "Unavailable"}
                </h1>
                <div className="flex items-center gap-2">
                  {encryptionKeyBase64 && <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#888', backgroundColor: '#171717', padding: '2px 6px', borderRadius: 5 }}>{ext}</span>}
                  <span style={{ fontSize: 13, color: '#b4b4b8' }}>
                    {encryptionKeyBase64 ? fmt(fileInfo.size) : <span className="flex items-center gap-1.5"><MIcon name="visibility_off" size={14} />Unavailable</span>}
                  </span>
                </div>
              </div>

              {/* Note */}
              {fileInfo.note && fileInfo.note.trim() && encryptionKeyBase64 && (
                <div style={{ margin: '0 12px 12px', borderRadius: 14, backgroundColor: '#171717', padding: '12px 14px' }}>
                  <p className="text-[13px] font-medium text-[#e3e3e3] break-words leading-relaxed">{fileInfo.note}</p>
                  <p className="text-[11px] text-[#555] mt-2">This note was attached by the uploader. Hypastack is not responsible for its content.</p>
                </div>
              )}

              {/* Metadata */}
              <div style={{ margin: '0 12px 12px', borderRadius: 14, backgroundColor: '#171717', padding: 4 }}>
                {[
                  { icon: "schedule", label: "Expires", value: encryptionKeyBase64 ? `${daysLeft(fileInfo.expiresAt)} days` : "Unavailable", show: true, color: !encryptionKeyBase64 ? "text-zinc-600" : undefined },
                  { icon: "local_fire_department", label: "Burn on read", value: burned ? "Burned" : "Active", show: !!fileInfo.burnOnRead && !!encryptionKeyBase64, color: burned ? "text-red-400" : "text-amber-400" },
                  { icon: "shield", label: "Encryption", value: "End-to-end", show: true, color: encryptionKeyBase64 ? "text-emerald-400" : "text-zinc-500" },
                ].filter(r => r.show).map((r, i, arr) => (
                  <div key={i}>
                    <div
                      className="flex items-center justify-between hover:bg-[#222] transition-all duration-75"
                      style={{ height: 38, paddingLeft: 12, paddingRight: 12, borderRadius: 10 }}
                    >
                      <span className="flex items-center gap-2.5" style={{ fontSize: 13, color: '#888' }}>
                        <MIcon name={r.icon} size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />{r.label}
                      </span>
                      <span className={`text-[13px] font-medium ${r.color || "text-[#e3e3e3]"}`}>{r.value}</span>
                    </div>
                    {i < arr.length - 1 && <div style={{ height: 1, margin: '0 8px', backgroundColor: 'rgba(255,255,255,0.05)' }} />}
                  </div>
                ))}
              </div>

              {/* Progress */}
              {downloading && encryptionKeyBase64 && downloadPhase !== 'idle' && (
                <div style={{ margin: '0 20px 16px' }} className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-[12px] mb-1.5">
                      <span className={`font-medium flex items-center gap-1.5 ${downloadPhase === 'downloading' ? 'text-white' : 'text-[#666]'}`}>
                        {downloadPhase === 'downloading' && <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />}
                        {downloadProgress >= 100 ? '✓ Downloaded' : 'Downloading…'}
                      </span>
                      <span className="text-[#555] font-mono tabular-nums">{downloadProgress}%</span>
                    </div>
                    <div style={{ height: 3, borderRadius: 2, backgroundColor: '#171717', overflow: 'hidden' }}>
                      <div className={`h-full transition-all ${downloadProgress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${downloadProgress}%`, borderRadius: 2 }} />
                    </div>
                  </div>
                  {(downloadPhase === 'decrypting' || downloadPhase === 'done') && (
                    <div>
                      <div className="flex items-center justify-between text-[12px] mb-1.5">
                        <span className={`font-medium flex items-center gap-1.5 ${downloadPhase === 'decrypting' ? 'text-white' : 'text-[#666]'}`}>
                          {downloadPhase === 'decrypting' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                          {downloadPhase === 'done' ? '✓ Decrypted' : 'Decrypting…'}
                        </span>
                        <span className="text-[#555] font-mono tabular-nums">{decryptProgress}%</span>
                      </div>
                      <div style={{ height: 3, borderRadius: 2, backgroundColor: '#171717', overflow: 'hidden' }}>
                        <div className={`h-full transition-all ${decryptProgress >= 100 ? 'bg-emerald-500' : 'bg-emerald-400'}`} style={{ width: `${decryptProgress}%`, borderRadius: 2 }} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action area */}
              <div style={{ padding: '0 12px 12px' }}>
                {(rateLimitError || downloadCooldown > 0) && (
                  <div className="mb-3 text-center" style={{ borderRadius: 12, backgroundColor: 'rgba(245,158,11,0.06)', padding: '10px 14px' }}>
                    <p className="text-[12px] font-medium text-amber-400">{rateLimitError?.message || "Too many downloads."}</p>
                    <p className="text-[11px] text-amber-400/60 mt-0.5">Try again in {downloadCooldown}s</p>
                  </div>
                )}
                {downloaded ? (
                  <div className="space-y-2">
                    <button onClick={!burned ? handleDownload : undefined} disabled={burned || downloadCooldown > 0}
                      className={`w-full flex items-center justify-center gap-2 active:scale-[0.97] transition-all duration-75 ${
                        burned ? 'cursor-default' : 'hover:bg-[#313131] disabled:opacity-40'
                      }`}
                      style={{ height: 42, borderRadius: 14, fontSize: 14, fontWeight: 600, color: burned ? '#a1a1aa' : '#e3e3e3', backgroundColor: '#171717' }}
                    >
                      {burned ? (
                        <><MIcon name="local_fire_department" className="text-red-400" size={16} />File burned</>
                      ) : downloadCooldown > 0 ? (
                        <><MIcon name="schedule" size={16} />Wait {downloadCooldown}s</>
                      ) : (
                        <><MIcon name="download" size={16} />Download again</>
                      )}
                    </button>
                    {burned && <p className="text-[12px] text-[#444] text-center">This file has been permanently deleted after download.</p>}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button onClick={handleDownload} disabled={downloading || downloadCooldown > 0 || !encryptionKeyBase64 || forceLocked}
                      className="w-full flex items-center justify-center gap-2 hover:bg-[#e2e2e8] active:scale-[0.97] transition-all duration-75 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ height: 42, borderRadius: 14, fontSize: 14, fontWeight: 600, color: '#0a0a0a', backgroundColor: '#ffffff' }}
                    >
                      {downloading && !forceLocked ? (
                        <><img src="https://r2.hypastack.com/cdn/u1y77k752jdm/icon.webp" className="select-none pointer-events-none h-4 w-4 rounded-[3px] animate-[spin_1.2s_ease-in-out_infinite]" alt="" draggable={false} />Preparing…</>
                      ) : downloadCooldown > 0 ? (
                        <><MIcon name="schedule" size={16} />Wait {downloadCooldown}s</>
                      ) : !encryptionKeyBase64 || forceLocked ? (
                        <><MIcon name="lock" size={16} />Locked</>
                      ) : (
                        <><MIcon name="download" size={16} />Download</>
                      )}
                    </button>
                    {!encryptionKeyBase64 && (
                      <div className="text-center mt-4 px-2">
                        <p className="text-[13px] leading-relaxed text-red-400 font-bold mb-2">
                          This file is completely locked down due to a missing key fragment.
                        </p>
                        <p className="text-[12px] leading-relaxed text-zinc-400 mb-3">
                          You are missing the <code className="text-zinc-300">#key=</code> portion of the URL. Downloading is completely disabled because the file contents are mathematically impossible to read without it.
                        </p>
                        <p className="text-[11px] text-zinc-500 font-medium pb-2">
                          Ask the person who sent this to give you the full URL.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex items-center justify-center gap-4 px-1">
              <Link href="/about" className="text-[12px] text-[#555] hover:text-[#999] transition-colors font-medium">What is Hypastack</Link>
              <span className="text-[#333] text-[10px]">●</span>
              <Link href="/goal" className="text-[12px] text-[#555] hover:text-[#999] transition-colors font-medium">What&apos;s our goal</Link>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
