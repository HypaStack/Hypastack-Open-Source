// Post-build script: Create font-manifest.json for backwards compatibility
// Hosting servers with older Next.js expect this filename

const fs = require('fs')
const path = require('path')

const serverDir = path.join(process.cwd(), '.next', 'server')
const newManifest = path.join(serverDir, 'next-font-manifest.json')
const oldManifest = path.join(serverDir, 'font-manifest.json')

if (fs.existsSync(newManifest)) {
  fs.copyFileSync(newManifest, oldManifest)
  console.log('[postbuild] Created font-manifest.json for compatibility')
} else {
  // Create empty manifest if nothing exists
  fs.writeFileSync(oldManifest, JSON.stringify({ pages: {}, app: {} }))
  console.log('[postbuild] Created empty font-manifest.json')
}
