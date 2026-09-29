const fs = require('fs');
const path = require('path');
const mappings = {
  'Ã©': 'é',
  'Ã¨': 'è',
  'Ãª': 'ê',
  'Ã«': 'ë',
  'Ã ': 'à',
  'Ã¢': 'â',
  'Ã®': 'î',
  'Ã¯': 'ï',
  'Ã´': 'ô',
  'Ã¶': 'ö',
  'Ã»': 'û',
  'Ã¼': 'ü',
  'Ã¹': 'ù',
  'Ã§': 'ç',
  'Å“': 'œ',
  'Ã€': 'À',
  'Ã‰': 'É'
};
function fix(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            fix(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let changed = false;
            for (const [bad, good] of Object.entries(mappings)) {
                if (content.includes(bad)) {
                    content = content.split(bad).join(good);
                    changed = true;
                }
            }
            if (changed) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Fixed ' + fullPath);
            }
        }
    }
}
fix('c:/Users/kleve/Sprintflow/sprintys-app/src');
fix('c:/Users/kleve/Sprintflow/sprintys-app/app');
