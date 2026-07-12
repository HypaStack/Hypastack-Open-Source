"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MIcon } from "@/components/ui/material-icon";
import { importKeyFromBase64, decryptChunk, MULTIPART_THRESHOLD } from "@/lib/storage/multipart";
import { motion } from "motion/react";
import { apiFetch } from "@/lib/http/fetch"
import { ShineButton } from "@/components/ui/shine-button"
import { SecondaryButton } from "@/components/ui/secondary-button"
import { ShineCard } from "@/components/ui/shine-card"
import { AlertMessage } from "@/components/ui/alert-message"
import { LoadingSvg } from "@/components/ui/loading-svg"

interface FileInfo {
  id: string; name: string; size: number; contentType: string; expiresAt: string;
  burnOnRead: boolean; customFilename?: string;
  note?: string; encryptionChunkSize?: number | null; encryptionTotalParts?: number | null;
}

interface Uploader {
  bannerUrl: string;
  avatarUrl: string | null;
  displayName: string | null;
  verified: boolean;
}

function fmt(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024, s = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + s[i];
}

function timeLeft(d: string): string {
  const ms = new Date(d).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${Math.max(1, mins)} minute${mins === 1 ? "" : "s"}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.ceil(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

export default function DownloadPage() {
  const router = useRouter();
  const { id: fileId } = useParams() as { id: string };
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [uploader, setUploader] = useState<Uploader | null>(null);
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
    // The decryption key lives in the URL fragment as a bare value (`#<key>`).
    // Legacy links used `#key=<key>`, so still accept that form for back-compat.
    const raw = window.location.hash.replace(/^#/, "");
    const legacy = raw.match(/(?:^|[#&])key=([A-Za-z0-9_-]+)/);
    const key = legacy ? legacy[1] : (/^[A-Za-z0-9_-]+$/.test(raw) ? raw : null);
    if (key) {
      setEncryptionKeyBase64(key);
      (async () => {
        try {
          const r = await apiFetch(`/api/v2/files/${fileId}`);
          const d = await r.json();
          if (!r.ok) { setError(d.message || "File not found"); return }
          setFileInfo(d.file);
          setUploader(d.uploader ?? null);
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
      if (!r.ok) { setError(data.message || "Download failed"); setDownloading(false); return }
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
          } catch (e) {
            if (e instanceof Error && e.name === 'AbortError') { setDownloadPhase('done'); setDownloading(false); return }
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
  // Split so the base name can truncate while the extension always stays visible.
  const dotIndex = displayName.lastIndexOf(".");
  const baseName = dotIndex > 0 ? displayName.slice(0, dotIndex) : displayName;
  const extSuffix = dotIndex > 0 ? displayName.slice(dotIndex) : "";

  // Primary action button, full-width at the bottom of the card.
  const downloadButton = downloaded ? (
    <SecondaryButton
      onClick={!burned ? handleDownload : undefined}
      disabled={burned || downloadCooldown > 0}
      size="lg"
      fullWidth
      style={{ gap: 8 }}
    >
      {burned ? (
        <><MIcon name="local_fire_department" className="text-red-400" size={16} />Burned</>
      ) : downloadCooldown > 0 ? (
        <><MIcon name="schedule" size={16} />Wait {downloadCooldown}s</>
      ) : (
        <><MIcon name="download" size={16} />Download again</>
      )}
    </SecondaryButton>
  ) : (
    <SecondaryButton
      onClick={handleDownload}
      disabled={downloading || downloadCooldown > 0 || !encryptionKeyBase64 || forceLocked}
      size="lg"
      fullWidth
      style={{ gap: 8 }}
    >
      {downloading && !forceLocked ? (
        <><LoadingSvg size={16} />Downloading…</>
      ) : downloadCooldown > 0 ? (
        <><MIcon name="schedule" size={16} />Wait {downloadCooldown}s</>
      ) : !encryptionKeyBase64 || forceLocked ? (
        <><MIcon name="lock" size={16} />Locked</>
      ) : (
        <><MIcon name="download" size={16} />Download</>
      )}
    </SecondaryButton>
  );

  if (missingKey) {
    return (
      <main className="min-h-screen relative font-sans bg-[#08090a]">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 flex flex-col justify-center items-center px-4"
        >
          <div className="max-w-[440px] w-full">
            <AlertMessage tone="error" style={{ marginBottom: 0 }}>
              This file either doesn't exist or you're missing the # fragment
            </AlertMessage>
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
            <LoadingSvg variant="white" size={32} />
          </motion.div>
        )}

        {error && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <ShineCard radius={16} className="p-6">
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
                <ShineButton
                  onClick={() => router.push("/manage/files")}
                  className="flex-1"
                >Upload a file</ShineButton>
                <SecondaryButton
                  size="lg"
                  onClick={() => router.push("/")}
                  className="flex-1"
                >Home</SecondaryButton>
              </div>
            </ShineCard>
          </motion.div>
        )}

        {fileInfo && !error && !missingKey && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <ShineCard radius={16} tilt={0}>
              {uploader && (
                <div className="h-[150px] w-full bg-[#151616]">
                  <img decoding="async" src={uploader.bannerUrl} alt="" className="w-full h-full object-cover select-none pointer-events-none" draggable={false} />
                </div>
              )}

              <div className="px-5 pt-4 pb-4">
                {uploader && (
                  <div className="flex items-start">
                    <img
                      src={uploader.avatarUrl || "https://r2.hypastack.com/cdn/564y1z5zojge/no-pfp.webp"}
                      alt=""
                      className="-mt-[59px] h-[86px] w-[86px] rounded-md object-cover border-2 border-[#1a1a1a] bg-[#151616] select-none pointer-events-none"
                      draggable={false}
                      onError={(e) => { (e.target as HTMLImageElement).src = "https://r2.hypastack.com/cdn/564y1z5zojge/no-pfp.webp" }}
                    />
                  </div>
                )}

                {uploader?.displayName && (
                  <div className="mt-3 flex items-center gap-1.5 min-w-0">
                    <p className="text-[22px] font-bold tracking-tight text-[#f7f8f8] truncate leading-tight">@{uploader.displayName}</p>
                    {uploader.verified && (
                      <span title="Verified account" className="shrink-0 inline-flex items-center text-[#3ba7ff]">
                        <MIcon name="verified" size={19} />
                      </span>
                    )}
                  </div>
                )}

                <div className={uploader?.displayName ? "mt-1.5" : uploader ? "mt-3" : "mt-1"}>
                  <div className="flex items-center gap-2 min-w-0">
                    <h1 className={`flex items-baseline min-w-0 text-[18px] font-semibold tracking-tight leading-snug ${!encryptionKeyBase64 ? 'text-[#898e97] italic' : 'text-[#c9ccd1]'}`}>
                      {encryptionKeyBase64 ? (
                        <>
                          <span className="truncate min-w-0">{baseName}</span>
                          {extSuffix && <span className="shrink-0">{extSuffix}</span>}
                        </>
                      ) : "Unavailable"}
                    </h1>
                    {encryptionKeyBase64 && <span className="shrink-0 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[#898e97] rounded-[5px] px-[6px] py-[2px] text-[10px] font-semibold tracking-wide uppercase">{ext}</span>}
                    <span className="shrink-0 text-[13px] text-[#898e97]">
                      {encryptionKeyBase64 ? fmt(fileInfo.size) : <span className="flex items-center gap-1.5"><MIcon name="visibility_off" size={14} />Unavailable</span>}
                    </span>
                  </div>
                </div>
              </div>

              {fileInfo.note && fileInfo.note.trim() && encryptionKeyBase64 && (
                <div className="mx-3 mb-3 p-4 rounded-[10px] bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.08)]">
                  <p className="text-[13px] font-medium text-[#f7f8f8] break-words leading-relaxed">{fileInfo.note}</p>
                  <p className="text-[11px] text-[#898e97] mt-2.5 leading-relaxed">This note and file were attached by the uploader. Hypastack isn't responsible for their content.</p>
                </div>
              )}

              <div className="mx-3 mb-3 rounded-[10px] bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.08)] overflow-hidden">
                {[
                  { icon: "schedule", label: "Expires", value: encryptionKeyBase64 ? timeLeft(fileInfo.expiresAt) : "Unavailable", show: true, color: !encryptionKeyBase64 ? "text-[#898e97]" : "text-[#f7f8f8]" },
                  { icon: "local_fire_department", label: "Burn after download", value: burned ? "Burned" : "Active", show: !!fileInfo.burnOnRead && !!encryptionKeyBase64, color: burned ? "text-red-500" : "text-[#f7f8f8]" },
                  { icon: "shield", label: "Encryption", value: "End-to-end", show: true, color: encryptionKeyBase64 ? "text-[#f7f8f8]" : "text-[#898e97]" },
                ].filter(r => r.show).map((r, i, arr) => (
                  <div key={i}>
                    <div className="flex items-center justify-between px-4 h-[44px]">
                      <span className="flex items-center gap-2.5 text-[13px] text-[#898e97]">
                        <MIcon name={r.icon} size={15} className="text-[#898e97]" />
                        {r.label}
                      </span>
                      <span className={`text-[13px] font-semibold ${r.color || "text-[#f7f8f8]"}`}>{r.value}</span>
                    </div>
                    {i < arr.length - 1 && <div className="h-px mx-4 bg-[rgba(255,255,255,0.07)]" />}
                  </div>
                ))}
              </div>

              {downloadPhase !== 'idle' && (
                <div className="mx-3 mb-3">
                  <AlertMessage tone={downloadPhase === 'done' ? 'success' : 'info'} style={{ marginBottom: 0 }}>
                    {downloadPhase === 'done'
                      ? "Your file finished downloading and should be saved to your device now."
                      : "Your file is downloading securely in the background. It will automatically save to your device once finished, this may take a moment depending on your connection speed."}
                  </AlertMessage>
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

              {(rateLimitError || downloadCooldown > 0 || (downloaded && burned)) && (
                <div className="mx-3 mb-3">
                  {(rateLimitError || downloadCooldown > 0) && (
                    <AlertMessage tone="error" style={{ marginBottom: 0 }}>
                      <span className="font-medium">{rateLimitError?.message || "Too many downloads."}</span>
                      <span className="block text-[11px] opacity-70 mt-0.5">Try again in {downloadCooldown}s</span>
                    </AlertMessage>
                  )}
                  {downloaded && burned && (
                    <p className="text-[12px] text-[#898e97] text-center mt-3">This file has been permanently deleted after download.</p>
                  )}
                </div>
              )}

              <div className="px-3 pb-3">
                {downloadButton}
              </div>
            </ShineCard>

            {uploader && (
              <p className="mt-3 px-2 text-[11px] leading-relaxed text-[#6b7079] text-center">
                Anyone can set a name and banner. Hypastack doesn&apos;t vet profiles, so a banner alone proves nothing. Only accounts showing a{" "}
                <span className="inline-flex items-center gap-0.5 align-middle text-[#8a9099]"><MIcon name="verified" size={12} />Verified</span>{" "}
                badge are confirmed. Don&apos;t trust a file just because it looks branded.
              </p>
            )}
          </motion.div>
        )}
      </div>
    </main>
  );
}
