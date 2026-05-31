import { fileTypeFromBuffer } from 'file-type';

/**
 * DESIGN DECISION — All file types permitted on the Drive (normal) upload path.
 *
 * Hypastack Drive is a zero-knowledge file sharing service. Users encrypt files
 * client-side before upload; the server never inspects file contents. Because
 * files are stored AES-256-GCM encrypted and served back only to holders of
 * the decryption key embedded in the share URL fragment, blocking specific
 * extensions or MIME types at the server level provides no additional security
 * benefit and would unnecessarily restrict legitimate use cases (e.g., sharing
 * executables, scripts, or developer tooling between trusted parties).
 *
 * CDN uploads DO enforce an extension allowlist (see lib/security/zero-trust.ts
 * sanitizeCdnFilename) because CDN assets are publicly served and embeddable.
 */

// Get file extension from filename
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.slice(lastDot).toLowerCase() : '';
}

/**
 * Extension blocklist — used ONLY for CDN uploads (publicly served assets).
 * Drive uploads explicitly allow all file types (see design decision above).
 */
const CDN_BLOCKED_EXTENSIONS = new Set([
  'exe', 'msi', 'com', 'scr', 'pif', 'gadget',
  'bat', 'cmd', 'ps1', 'psm1', 'vbs', 'vbe',
  'wsf', 'wsh', 'msc', 'reg', 'sh', 'bash',
  'zsh', 'csh', 'command', 'bin', 'out',
  'php', 'asp', 'aspx', 'jsp', 'cgi',
  'py', 'pyw', 'pl', 'rb', 'jar',
  'iso', 'img', 'lnk',
]);

export function isExtensionBlocked(filename: string): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.') + 1);
  return CDN_BLOCKED_EXTENSIONS.has(ext);
}


// Validate file type by magic bytes — always passes for Drive uploads.
// Retained for the upload-complete route which calls it for non-multipart
// uploads to confirm a file was actually stored in R2 before promotion.
export async function validateFileType(buffer: Buffer): Promise<{ valid: boolean; error?: string }> {
  try {
    await fileTypeFromBuffer(buffer); // parse only, result not used to gate
    return { valid: true };
  } catch (error) {
    console.error('[FileValidation] Error reading file magic bytes:', error);
    return { valid: true }; // Allow on error — Drive permits all file types
  }
}

