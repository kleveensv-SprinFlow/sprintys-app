const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}
const files = [...walk('app'), ...walk('src')];
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  if (c.includes('@react-navigation/native')) {
    c = c.replace(/from '@react-navigation\/native'/g, "from 'expo-router'");
    fs.writeFileSync(f, c, 'utf8');
    console.log('Fixed', f);
  }
});
