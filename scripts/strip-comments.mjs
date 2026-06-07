import ts from 'typescript'
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'

const ROOT = process.cwd()
const SKIP = ['node_modules', '.next', 'dist', '.git', 'scripts']

function getAllFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP.some(s => entry === s)) continue
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) getAllFiles(full, files)
    else if (['.ts', '.tsx'].includes(extname(entry))) files.push(full)
  }
  return files
}

function stripComments(filePath) {
  const original = readFileSync(filePath, 'utf8')
  const lines = original.split('\n')
  const result = []

  let inBlockComment = false

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    let outputLine = ''
    let j = 0
    let inString = false
    let stringChar = ''
    let inTemplateLiteral = false
    let lineChanged = false

    while (j < line.length) {
      const ch = line[j]
      const next = line[j + 1]

      if (inBlockComment) {
        if (ch === '*' && next === '/') {
          inBlockComment = false
          j += 2
          lineChanged = true
          continue
        }
        j++
        lineChanged = true
        continue
      }

      if (inString) {
        outputLine += ch
        if (ch === '\\') {
          j++
          if (j < line.length) outputLine += line[j]
        } else if (ch === stringChar) {
          inString = false
        }
        j++
        continue
      }

      if (inTemplateLiteral) {
        outputLine += ch
        if (ch === '\\') {
          j++
          if (j < line.length) outputLine += line[j]
        } else if (ch === '`') {
          inTemplateLiteral = false
        }
        j++
        continue
      }

      if (ch === '"' || ch === "'") {
        inString = true
        stringChar = ch
        outputLine += ch
        j++
        continue
      }

      if (ch === '`') {
        inTemplateLiteral = true
        outputLine += ch
        j++
        continue
      }

      if (ch === '/' && next === '/') {
        lineChanged = true
        break
      }

      if (ch === '/' && next === '*') {
        inBlockComment = true
        lineChanged = true
        j += 2
        continue
      }

      outputLine += ch
      j++
    }

    const trimmedOutput = outputLine.trimEnd()

    if (!inBlockComment && !lineChanged) {
      result.push(line)
    } else if (trimmedOutput.length > 0) {
      result.push(trimmedOutput)
    } else if (inBlockComment) {
    } else {
    }
  }

  const newSource = result.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n'

  if (newSource !== original) {
    writeFileSync(filePath, newSource, 'utf8')
    return true
  }
  return false
}

const files = getAllFiles(ROOT)
let changed = 0
let errors = 0

for (const file of files) {
  try {
    const wasChanged = stripComments(file)
    if (wasChanged) {
      changed++
      console.log('Cleaned:', file.replace(ROOT, '.'))
    }
  } catch (err) {
    errors++
    console.error('ERROR on', file.replace(ROOT, '.'), '-', err.message)
  }
}

console.log(`\nDone. ${changed} files cleaned, ${errors} errors.`)
