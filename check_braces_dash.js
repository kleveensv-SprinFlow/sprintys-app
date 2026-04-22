const fs = require('fs');
const content = fs.readFileSync('src/screens/DashboardScreen.tsx', 'utf8');

let oB = 0, cB = 0;
for (let char of content) {
  if (char === '{') oB++;
  if (char === '}') cB++;
}
console.log(`Braces Diff: ${oB - cB}`);
