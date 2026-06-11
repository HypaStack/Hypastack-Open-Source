const fs = require('fs');
const path = require('path');

const cssContent = fs.readFileSync('app/globals.css', 'utf8');

// Find all CSS variables defined (e.g. --var-name: value;)
const varRegex = /--([a-zA-Z0-9-]+):/g;
const definedVars = new Set();
let match;
while ((match = varRegex.exec(cssContent)) !== null) {
  definedVars.add('--' + match[1]);
}

// Find all font-faces defined
const fontRegex = /font-family:\s*"([^"]+)"/g;
const definedFonts = new Set();
while ((match = fontRegex.exec(cssContent)) !== null) {
  definedFonts.add(match[1]);
}

console.log('Defined Vars (' + definedVars.size + '):', [...definedVars].join(', '));
console.log('Defined Fonts (' + definedFonts.size + '):', [...definedFonts].join(', '));

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (f !== 'node_modules' && f !== '.next' && f !== '.git') {
        walkDir(dirPath, callback);
      }
    } else {
      if (dirPath.endsWith('.tsx') || dirPath.endsWith('.ts') || dirPath.endsWith('.css') || dirPath.endsWith('.js') || dirPath.endsWith('.mjs')) {
        callback(dirPath);
      }
    }
  });
}

const varUsageCount = {};
for (let v of definedVars) varUsageCount[v] = 0;
const fontUsageCount = {};
for (let f of definedFonts) fontUsageCount[f] = 0;

walkDir('.', (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  for (let v of definedVars) {
    // Check if the variable name is used in the file
    // Tailwind v4 uses it without -- in class names, e.g. text-sidebar-foreground
    // We should check both --varname and the varname part.
    let varName = v.substring(2);
    if (content.includes(v) || content.includes(varName)) {
      varUsageCount[v]++;
    }
  }
  for (let f of definedFonts) {
    if (content.includes(f) || content.includes(f.toLowerCase()) || content.includes(f.replace(/\s+/g, '-').toLowerCase())) {
      fontUsageCount[f]++;
    }
  }
});

console.log('\n--- UNUSED CSS VARIABLES ---');
for (let v of definedVars) {
  // Check if it's genuinely unused
  if (varUsageCount[v] <= 1) { // 1 means it's only found in globals.css itself
    // Double check because sometimes globals.css uses it internally, e.g. --radius-sm: var(--radius)
    // Actually, if it's 1, it might only be the definition.
    console.log(v);
  }
}

console.log('\n--- UNUSED FONTS ---');
for (let f of definedFonts) {
  if (fontUsageCount[f] <= 1) {
    console.log(f);
  }
}
