const fs = require('fs');

function checkBalanceDetail(filename) {
  const content = fs.readFileSync(filename, 'utf8');
  let braces = 0;
  let parens = 0;
  let brackets = 0;
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let char of line) {
      if (char === '{') braces++;
      if (char === '}') braces--;
      if (char === '(') parens++;
      if (char === ')') parens--;
      if (char === '[') brackets++;
      if (char === ']') brackets--;
    }
    if (braces !== 0 || parens !== 0 || brackets !== 0) {
      // console.log(`Line ${i+1}: B:${braces} P:${parens} K:${brackets}`);
    }
  }
  console.log(`${filename} FINAL: B:${braces} P:${parens} K:${brackets}`);
}

checkBalanceDetail('src/screens/AddWorkoutScreen.tsx');
