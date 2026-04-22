const fs = require('fs');

function checkBalance(filename) {
  const content = fs.readFileSync(filename, 'utf8');
  let braces = 0;
  let parens = 0;
  let brackets = 0;
  
  for (let char of content) {
    if (char === '{') braces++;
    if (char === '}') braces--;
    if (char === '(') parens++;
    if (char === ')') parens--;
    if (char === '[') brackets++;
    if (char === ']') brackets--;
  }
  
  console.log(`${filename}: Braces: ${braces}, Parens: ${parens}, Brackets: ${brackets}`);
}

checkBalance('src/screens/AddWorkoutScreen.tsx');
checkBalance('src/screens/DashboardScreen.tsx');
checkBalance('src/screens/WeatherDetailScreen.tsx');
checkBalance('src/shared/components/SprintyAvatar.tsx');
checkBalance('App.tsx');
