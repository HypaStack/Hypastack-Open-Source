
const INVALID_FILENAME_CHARS = /[<>:"\/\\|?*\x00-\x1f]/g
const RESERVED_FILENAMES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i
const NOTE_REGEX = /^[\x20-\x7E\s]*$/

export interface ValidationResult {
  valid: boolean
  error?: string
  sanitized?: string
}

export function validateCustomFilename(filename: string): ValidationResult {
  if (!filename || filename.trim().length === 0) {
    return { valid: true, sanitized: "" }
  }
  
  if (filename.length > 100) {
    return { valid: false, error: "Filename too long (max 100 characters)" }
  }
  
  let sanitized = filename.replace(/\.{2,}[\\/]/g, "")
  sanitized = sanitized.replace(/[\\/]/g, "")
  sanitized = sanitized.replace(INVALID_FILENAME_CHARS, "")
  if (RESERVED_FILENAMES.test(sanitized)) {
    return { valid: false, error: "Reserved filename not allowed" }
  }
  
  sanitized = sanitized.trim()
  
  if (sanitized.length === 0) {
    return { valid: true, sanitized: "" }
  }
  
  return { valid: true, sanitized }
}

export function validateNote(note: string): ValidationResult {
  if (!note || note.trim().length === 0) {
    return { valid: true, sanitized: "" }
  }
  
  if (note.length > 100) {
    return { valid: false, error: "Note too long (max 100 characters)" }
  }
  
  let sanitized = note.replace(/[<>]/g, "")
  sanitized = sanitized.trim()
  const lowerSanitized = sanitized.toLowerCase()
  if (lowerSanitized.includes('javascript:') || 
      lowerSanitized.includes('data:') || 
      lowerSanitized.includes('vbscript:')) {
    return { valid: false, error: "Invalid characters in note" }
  }
  
  return { valid: true, sanitized }
}

export function escapeHtml(text: string): string {
  const div = typeof document !== "undefined" ? document.createElement("div") : null
  if (div) {
    div.textContent = text
    return div.innerHTML
  }
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
