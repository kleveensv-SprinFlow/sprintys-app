const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('.expo')) {
                results = results.concat(walk(file));
            }
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('.');
const reps = {
    'Ã©': 'é', 'Ã¨': 'è', 'Ãª': 'ê', 'Ã«': 'ë', 'Ã ': 'à',
    'Ã¢': 'â', 'Ã®': 'î', 'Ã¯': 'ï', 'Ã´': 'ô', 'Ã¶': 'ö',
    'Ã»': 'û', 'Ã¼': 'ü', 'Ã§': 'ç', 'Â°': '°', 'â€™': '’',
    'â€œ': '“', 'â€\x9D': '”', 'Ã‰': 'É', 'Ã€': 'À', 'ÃŠ': 'Ê',
    'ÃŽ': 'Î', 'Â ': ' ', 'Å“': 'œ'
};

let changed = 0;
files.forEach(f => {
    try {
        let str = fs.readFileSync(f, 'utf8');
        let initStr = str;
        for (const [k, v] of Object.entries(reps)) {
            str = str.split(k).join(v);
        }
        if (str !== initStr) {
            fs.writeFileSync(f, str, 'utf8');
            console.log('Fixed', f);
            changed++;
        }
    } catch(e) {}
});
console.log('Fixed files:', changed);
