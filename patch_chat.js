const fs = require('fs');

const files = [
  'app/chat/sprinty.tsx',
  'app/(coach)/chat.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    
    // Remove LinearGradient component
    code = code.replace(/<LinearGradient[\s\S]*?style=\{StyleSheet\.absoluteFillObject\}[\s\S]*?\/>/, "");
    
    // Change container background to transparent
    code = code.replace(/container: \{ flex: 1, backgroundColor: '#09090D' \}/, "container: { flex: 1, backgroundColor: 'transparent' }");
    
    fs.writeFileSync(file, code);
  }
}
console.log('Fixed chat gradients');
