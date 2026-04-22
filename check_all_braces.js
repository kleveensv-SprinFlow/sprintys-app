const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let b = 0, p = 0, k = 0;
  for (let char of content) {
    if (char === '{') b++; if (char === '}') b--;
    if (char === '(') p++; if (char === ')') p--;
    if (char === '[') k++; if (char === ']') k--;
  }
  if (b !== 0) console.log(`${filePath}: Braces imbalance ${b}`);
  // Parens and brackets might be imbalanced in strings, so we only warn if braces are off.
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules') walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      checkFile(fullPath);
    }
  }
}

walk('src');
walk('.'); // Also check root files like App.tsx
