const fs = require('fs');
const path = require('path');

const sprintyDir = 'src/assets/sprinty';
const outputFile = 'src/data/sprintyAssets.ts';

const files = {
  neutral: 'neutral.svg',
  happy: 'happy.svg',
  hot: 'hot.svg',
  cold: 'cold.svg'
};

let output = 'export const SPRINTY_ASSETS: Record<string, string> = {\n';

for (const [key, filename] of Object.entries(files)) {
  const filePath = path.join(sprintyDir, filename);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    output += `  ${key}: \`${content.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`,\n`;
  }
}

output += '};\n';

fs.writeFileSync(outputFile, output);
console.log('Sprinty assets generated!');
