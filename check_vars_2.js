const fs = require('fs');
const path = require('path');

const cssContent = fs.readFileSync('app/globals.css', 'utf8');

// Find all CSS variables defined (e.g. --var-name: value;)
// Only check :root and @theme
const varRegex = /--([a-zA-Z0-9-]+):/g;
const definedVars = new Set();
let match;
while ((match = varRegex.exec(cssContent)) !== null) {
  definedVars.add(match[1]); // e.g. 'sidebar-foreground', 'color-sidebar'
}

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (f !== 'node_modules' && f !== '.next' && f !== '.git') {
        walkDir(dirPath, callback);
      }
    } else {
      if (dirPath.endsWith('.tsx') || dirPath.endsWith('.ts') || dirPath.endsWith('.css')) {
        callback(dirPath);
      }
    }
  });
}

const varUsageCount = {};
for (let v of definedVars) varUsageCount[v] = 0;

walkDir('.', (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  for (let v of definedVars) {
    // A variable is used if it's referenced as var(--v)
    // Or if it's a theme color, Tailwind exposes it as bg-v, text-v, border-v, ring-v, etc.
    // If it has 'color-' prefix, Tailwind removes it: e.g. --color-sidebar -> bg-sidebar
    let tailwindName = v.replace(/^color-/, '');
    
    // Create a regex to match common usages:
    // var(--v)
    // -tailwindName (e.g. bg-sidebar, text-sidebar)
    // [tailwindName] (e.g. text-[color:var(--sidebar)])
    
    // We can just do a simple string includes check for the tailwindName (which is highly effective)
    // since we want to find genuinely unused ones.
    if (filePath !== 'app\\globals.css' && filePath !== 'app/globals.css') {
      if (content.includes(`var(--${v})`) || content.includes(`-${tailwindName}`)) {
        varUsageCount[v]++;
      }
    }
  }
});

const unusedVars = [];
for (let v of definedVars) {
  if (varUsageCount[v] === 0) {
    // Double check if it's used internally inside globals.css
    // We already know it's defined, so we check if it appears MORE than once in globals.css
    let occurrences = cssContent.split(v).length - 1;
    if (occurrences <= 1) {
       unusedVars.push(v);
    }
  }
}

console.log('Unused Variables:', unusedVars.join(', '));
