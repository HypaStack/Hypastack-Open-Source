"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MIcon } from "@/components/ui/material-icon";
import { importKeyFromBase64, decryptChunk, MULTIPART_THRESHOLD } from "@/lib/multipart";
import { motion } from "motion/react";
import { apiFetch } from "@/lib/fetch"
import { Button } from "@/components/ui/button"

interface FileInfo {
  id: string; name: string; size: number; contentType: string; expiresAt: string;
  downloadCount: number; burnOnRead: boolean; customFilename?: string;
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
          const r = await apiFetch(`/api/v2/files/${fileId}`);
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
      const r = await apiFetch(`/api/v2/files/${fileId}/download`, { method: "POST" });
      const data = await r.json();
      if (r.status === 429) {
        setRateLimitError({ message: data.message || "Too many downloads.", retryAfter: Math.ceil(data.retryAfter || 60) });
        setDownloadCooldown(Math.ceil(data.retryAfter || 60));
        setDownloading(false);
        return;
      }
      wasBurned = !!data.burned;
      if (!r.ok) { setError(data.error || "Download failed"); setDownloading(false); return }
      downloadUrl = data.downloadUrl;
    } catch {
      setError("Failed to start download");
      setDownloading(false);
      return;
    } try {
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

    if (wasBurned) {
      setDownloaded(true);
        setBurned(true);
        setForceLocked(true);
        setTimeout(() => window.location.reload(), 5000);
      }
    } catch {
      if (wasBurned) {
        // Download failed but the file is already marked burned server-side.
        // Show a specific error so the user knows the file is gone.
        setError("Download failed and this burn-on-read file has been consumed. The file is no longer available.");
        setBurned(true);
        setForceLocked(true);
      } else {
        setError("Decryption failed. The link may be invalid.");
      }
    } finally {
      setDownloading(false);
    }
  };

  const displayName = fileInfo ? (fileInfo.customFilename || fileInfo.name) : "";
  const ext = displayName.includes(".") ? displayName.split(".").pop()?.toUpperCase() : "FILE";

  if (missingKey) {
    return (
      <main className="min-h-screen relative font-sans bg-[#08090a]">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 flex flex-col justify-center items-center px-4"
        >
          <div className="max-w-[440px] w-full text-center flex flex-col items-center">
            <div className="flex items-center gap-3 mb-3">
              <MIcon name="key_off" style={{ color: '#ef4444' }} size={28} />
              <h2 className="text-[20px] font-semibold text-[#f7f8f8] tracking-tight">
                Locked
              </h2>
            </div>
            <p className="text-[14px] text-[#898e97] leading-relaxed">
              You are missing the #key= portion of the URL. Viewing and downloading is completely disabled.
            </p>
          </div>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-8 font-sans bg-[#08090a]">
      <div className="relative w-full max-w-[440px]">
        <div className="flex justify-center mb-8">
          <Link href="/" className="hover:opacity-80 transition-opacity active:scale-[0.97]">
            <img src="https://r2.hypastack.com/cdn/lvko6iovrtq7/footer.webp" className="select-none h-14 w-14 rounded-md" alt="Hypastack" draggable={false} />
          </Link>
        </div>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24">
            <svg className="animate-spin h-8 w-8 text-[#898e97]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </motion.div>
        )}

        {error && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-[#0a0b0c] border border-[rgba(255,255,255,0.08)] rounded-[8px] p-6">
              <div className="flex items-center gap-3 mb-3">
                <MIcon name="error" className="text-red-500" size={28} />
                <h2 className="text-[20px] font-semibold text-[#f7f8f8] tracking-tight">
                  {error === "File has expired" ? "Link expired" : "File not found"}
                </h2>
              </div>
              <p className="text-[13px] text-[#898e97] mb-6 leading-relaxed">
                {error === "File has expired" ? "This file has been permanently deleted from our servers." : "The file you're looking for doesn't exist or has been removed."}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="landing-primary"
                  onClick={() => { window.location.href = "/manage/files" }}
                  className="flex-1"
                >Upload a file</Button>
                <Button
                  variant="landing-secondary"
                  onClick={() => { window.location.href = "/" }}
                  className="flex-1"
                >Home</Button>
              </div>
            </div>
          </motion.div>
        )}

        {fileInfo && !error && !missingKey && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="bg-[#0a0b0c] border border-[rgba(255,255,255,0.08)] rounded-[8px] overflow-hidden">
              <div style={{ padding: '20px 20px 16px' }}>
                <h1 className={`text-[18px] font-semibold tracking-tight break-all leading-snug mb-2 ${!encryptionKeyBase64 ? 'text-[#898e97] italic' : 'text-[#f7f8f8]'}`}>
                  {encryptionKeyBase64 ? displayName : "Unavailable"}
                </h1>
                <div className="flex items-center gap-2">
                  {encryptionKeyBase64 && <span className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[#898e97] rounded-[5px] px-[6px] py-[2px] text-[10px] font-semibold tracking-wide uppercase">{ext}</span>}
                  <span className="text-[13px] text-[#898e97]">
                    {encryptionKeyBase64 ? fmt(fileInfo.size) : <span className="flex items-center gap-1.5"><MIcon name="visibility_off" size={14} />Unavailable</span>}
                  </span>
                </div>
              </div>

              {fileInfo.note && fileInfo.note.trim() && encryptionKeyBase64 && (
                <div className="mx-3 mb-3 p-3.5 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-[6px]">
                  <p className="text-[13px] font-medium text-[#f7f8f8] break-words leading-relaxed">{fileInfo.note}</p>
                  <p className="text-[11px] text-[#898e97] mt-2">This note was attached by the uploader. Hypastack is not responsible for its content.</p>
                </div>
              )}

              <div className="mx-3 mb-3 p-1 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-[6px]">
                {[
                  { icon: "schedule", label: "Expires", value: encryptionKeyBase64 ? `${daysLeft(fileInfo.expiresAt)} days` : "Unavailable", show: true, color: !encryptionKeyBase64 ? "text-[#898e97]" : "text-[#f7f8f8]" },
                  { icon: "local_fire_department", label: "Burn on read", value: burned ? "Burned" : "Active", show: !!fileInfo.burnOnRead && !!encryptionKeyBase64, color: burned ? "text-red-500" : "text-amber-500" },
                  { icon: "shield", label: "Encryption", value: "End-to-end", show: true, color: encryptionKeyBase64 ? "text-[#f7f8f8] underline underline-offset-2" : "text-[#898e97]" },
                ].filter(r => r.show).map((r, i, arr) => (
                  <div key={i}>
                    <div
                      className="flex items-center justify-between hover:bg-[rgba(255,255,255,0.04)] transition-all duration-75 px-3 rounded-[6px] h-[38px]"
                    >
                      <span className="flex items-center gap-2.5 text-[13px] text-[#898e97]">
                        <MIcon name={r.icon} size={14} className="text-[#898e97]" />{r.label}
                      </span>
                      <span className={`text-[13px] font-medium ${r.color || "text-[#f7f8f8]"}`}>{r.value}</span>
                    </div>
                    {i < arr.length - 1 && <div className="h-px mx-2 bg-[rgba(255,255,255,0.08)]" />}
                  </div>
                ))}
              </div>

              {downloadPhase === 'downloading' && (
                <div className="mx-3 mb-3 p-3.5 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-[6px]">
                  <div className="flex gap-2">
                    <MIcon name="info" size={16} className="text-[#898e97] shrink-0 mt-0.5" />
                    <p className="text-[12px] text-[#898e97] leading-relaxed">
                      Your file is downloading securely in the background. It will automatically save to your device once finished, this may take a moment depending on your connection speed.
                    </p>
                  </div>
                </div>
              )}

              {downloadPhase === 'decrypting' && (
                <div className="mx-3 mb-3 p-3.5 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-[6px]">
                  <p className="text-[12px] text-[#898e97] mb-1.5">Decrypting... {decryptProgress}%</p>
                  <div className="w-full h-1.5 rounded-full bg-[rgba(255,255,255,0.08)] overflow-hidden">
                    <div className="h-full bg-[#f7f8f8] rounded-full transition-all duration-300" style={{ width: `${decryptProgress}%` }} />
                  </div>
                </div>
              )}

              <div style={{ padding: '0 12px 12px' }}>
                {(rateLimitError || downloadCooldown > 0) && (
                  <div className="mb-3 text-center flex flex-col items-center gap-1 text-[13px] text-[#f59e0b] bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.15)] px-4 py-3 rounded-full">
                    <span className="font-medium">{rateLimitError?.message || "Too many downloads."}</span>
                    <span className="text-[11px] opacity-70">Try again in {downloadCooldown}s</span>
                  </div>
                )}
                {downloaded ? (
                  <div className="space-y-2">
                    <Button
                      onClick={!burned ? handleDownload : undefined}
                      disabled={burned || downloadCooldown > 0}
                      variant="landing-secondary"
                      className="w-full flex items-center justify-center gap-2"
                    >
                      {burned ? (
                        <><MIcon name="local_fire_department" className="text-red-400" size={16} />File burned</>
                      ) : downloadCooldown > 0 ? (
                        <><MIcon name="schedule" size={16} />Wait {downloadCooldown}s</>
                      ) : (
                        <><MIcon name="download" size={16} />Download again</>
                      )}
                    </Button>
                    {burned && <p className="text-[12px] text-[#898e97] text-center mt-2">This file has been permanently deleted after download.</p>}
                  </div>
                ) : (
                  <Button
                    onClick={handleDownload}
                    disabled={downloading || downloadCooldown > 0 || !encryptionKeyBase64 || forceLocked}
                    variant="landing-primary"
                    className="w-full flex items-center justify-center gap-2"
                  >
                    {downloading && !forceLocked ? (
                      <><svg className="animate-spin h-4 w-4 text-[#898e97]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Downloading…</>
                    ) : downloadCooldown > 0 ? (
                      <><MIcon name="schedule" size={16} />Wait {downloadCooldown}s</>
                    ) : !encryptionKeyBase64 || forceLocked ? (
                      <><MIcon name="lock" size={16} />Locked</>
                    ) : (
                      <><MIcon name="download" size={16} />Download</>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
