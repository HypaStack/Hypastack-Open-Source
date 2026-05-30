/**
 * Input validation and sanitization utilities
 */

// Invalid characters for filenames (Windows + Unix restrictions)
const INVALID_FILENAME_CHARS = /[<>:"\/\\|?*\x00-\x1f]/g
// Reserved Windows filenames
const RESERVED_FILENAMES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i
// Only allow printable ASCII for notes (no control characters)
const NOTE_REGEX = /^[\x20-\x7E\s]*$/

export interface ValidationResult {
  valid: boolean
  error?: string
  sanitized?: string
}

/**
 * Sanitize and validate custom filename
 * - Max 100 characters
 * - Remove invalid characters
 * - Prevent path traversal (../)
 */
export function validateCustomFilename(filename: string): ValidationResult {
  if (!filename || filename.trim().length === 0) {
    return { valid: true, sanitized: "" }
  }
  
  if (filename.length > 100) {
    return { valid: false, error: "Filename too long (max 100 characters)" }
  }
  
  // Remove path traversal attempts
  let sanitized = filename.replace(/\.{2,}[\\/]/g, "")
  sanitized = sanitized.replace(/[\\/]/g, "")
  
  // Remove invalid characters
  sanitized = sanitized.replace(INVALID_FILENAME_CHARS, "")
  
  // Check for reserved Windows filenames
  if (RESERVED_FILENAMES.test(sanitized)) {
    return { valid: false, error: "Reserved filename not allowed" }
  }
  
  // Trim whitespace
  sanitized = sanitized.trim()
  
  if (sanitized.length === 0) {
    return { valid: true, sanitized: "" }
  }
  
  return { valid: true, sanitized }
}

/**
 * Sanitize and validate note
 * - Max 100 characters
 * - No HTML/script tags
 * - Basic XSS prevention
 */
export function validateNote(note: string): ValidationResult {
  if (!note || note.trim().length === 0) {
    return { valid: true, sanitized: "" }
  }
  
  if (note.length > 100) {
    return { valid: false, error: "Note too long (max 100 characters)" }
  }
  
  // Remove HTML/script tags
  let sanitized = note.replace(/<[^>]*>/g, "")
  
  // Trim whitespace
  sanitized = sanitized.trim()
  
  // Prevent common XSS patterns (case insensitive)
  const lowerSanitized = sanitized.toLowerCase()
  if (lowerSanitized.includes('javascript:') || 
      lowerSanitized.includes('data:') || 
      lowerSanitized.includes('vbscript:')) {
    return { valid: false, error: "Invalid characters in note" }
  }
  
  return { valid: true, sanitized }
}

/**
 * Escape HTML for safe display
 */
export function escapeHtml(text: string): string {
  const div = typeof document !== "undefined" ? document.createElement("div") : null
  if (div) {
    div.textContent = text
    return div.innerHTML
  }
  // Server-side fallback
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
