const fs = require('fs');

let css = fs.readFileSync('app/globals.css', 'utf8');

// 1. Update font-mono to SF Pro Display
css = css.replace(/--font-mono:.*?;/g, '--font-mono: "SF Pro Display", system-ui, sans-serif;');

// 2. Remove unused blocks using regex that matches the block and its contents
const lines = css.split('\n');
let newLines = [];
let skipBlock = false;
let braceDepth = 0;

const unusedSelectors = [
  '.card-bordered',
  '.btn-primary',
  '.btn-secondary',
  '.launch-pill',
  '.hairline',
  '.upload-rainbow',
  '@keyframes logo-poof',
  '@keyframes swirl-drift',
  '@keyframes swirl-hue'
];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (!skipBlock && unusedSelectors.some(sel => line.includes(sel))) {
    skipBlock = true;
    braceDepth = 0;
  }
  
  if (skipBlock) {
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    braceDepth += opens - closes;
    
    if (braceDepth <= 0 && opens === 0 && closes > 0) {
      skipBlock = false;
    } else if (braceDepth === 0 && closes > 0) {
       skipBlock = false;
    }
  } else {
    newLines.push(line);
  }
}

fs.writeFileSync('app/globals.css', newLines.join('\n'));
console.log('Cleaned globals.css deeply');
