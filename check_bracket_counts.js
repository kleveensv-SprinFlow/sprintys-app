const fs = require('fs');
const content = fs.readFileSync('src/screens/AddWorkoutScreen.tsx', 'utf8');

let oP = 0, cP = 0;
let oB = 0, cB = 0;
let oK = 0, cK = 0;

for (let char of content) {
  if (char === '(') oP++;
  if (char === ')') cP++;
  if (char === '{') oB++;
  if (char === '}') cB++;
  if (char === '[') oK++;
  if (char === ']') cK++;
}

console.log(`Open Parens: ${oP}, Closed Parens: ${cP}, Diff: ${oP - cP}`);
console.log(`Open Braces: ${oB}, Closed Braces: ${cB}, Diff: ${oB - cB}`);
console.log(`Open Brackets: ${oK}, Closed Brackets: ${cK}, Diff: ${oK - cK}`);
