import { fileTypeFromBuffer } from 'file-type';

export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.slice(lastDot).toLowerCase() : '';
}

// CDN-only blocklist — Drive allows all types since files are client-encrypted
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

export async function validateFileType(buffer: Buffer): Promise<{ valid: boolean; error?: string }> {
  try {
    await fileTypeFromBuffer(buffer);
    return { valid: true };
  } catch (error) {
    console.error('[FileValidation] Error reading file magic bytes:', error);
    return { valid: true };
  }
}
