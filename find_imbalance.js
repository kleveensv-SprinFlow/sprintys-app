const fs = require('fs');

function findImbalance(filename) {
  const content = fs.readFileSync(filename, 'utf8');
  let parens = 0;
  let brackets = 0;
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let char of line) {
      if (char === '(') parens++;
      if (char === ')') parens--;
      if (char === '[') brackets++;
      if (char === ']') brackets--;
    }
    if (parens < 0 || brackets < 0) {
      console.log(`${filename}: Negative balance at line ${i+1}. Parens: ${parens}, Brackets: ${brackets}`);
      // return;
    }
  }
  console.log(`${filename} FINAL: Parens: ${parens}, Brackets: ${brackets}`);
}

findImbalance('src/screens/AddWorkoutScreen.tsx');
