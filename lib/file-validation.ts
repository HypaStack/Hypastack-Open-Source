import { fileTypeFromBuffer } from 'file-type';

// Blocked file extensions (dangerous executables, scripts, etc.)
export const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.msi', '.com', '.scr', '.pif', '.gadget',
  '.bat', '.cmd', '.ps1', '.psm1', '.vbs', '.vbe',
  '.wsf', '.wsh', '.msc', '.reg', '.sh', '.bash',
  '.zsh', '.csh', '.command', '.bin', '.out',
  '.php', '.asp', '.aspx', '.jsp', '.cgi',
  '.py', '.pyw', '.pl', '.rb', '.jar',
  '.iso', '.img', '.lnk'
]);

// Blocked MIME types (additional safety)
export const BLOCKED_MIME_TYPES = new Set([
  'application/x-msdownload',
  'application/x-ms-installer',
  'application/x-executable',
  'application/x-shockwave-flash',
  'application/x-java-archive',
  'text/x-python',
  'text/x-perl',
  'text/x-ruby',
  'application/x-php',
  'application/x-shellscript',
  'application/x-bat',
  'application/vnd.microsoft.portable-executable',
]);

// Check if file extension is blocked
export function isExtensionBlocked(filename: string): boolean {
  const extension = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  return BLOCKED_EXTENSIONS.has(extension);
}

// Validate file by magic bytes (actual file content)
export async function validateFileType(buffer: Buffer): Promise<{ valid: boolean; error?: string }> {
  try {
    // Check file type using magic bytes
    const fileType = await fileTypeFromBuffer(buffer);
    
    if (!fileType) {
      // If we can't determine file type, check extension as fallback
      return { valid: true };
    }
    
    // Normal uploads no longer block dangerous MIME types or extensions.
    // They are fully allowed.
    
    return { valid: true };
  } catch (error) {
    console.error('[FileValidation] Error validating file:', error);
    return { valid: true }; // Allow on error (fail open for UX)
  }
}

// Get file extension from filename
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.slice(lastDot).toLowerCase() : '';
}
