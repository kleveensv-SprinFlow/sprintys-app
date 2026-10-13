// Sets a unique, increasing build number for store uploads (CI only).
// Usage: node scripts/set-build-number.js <number>
const fs = require('fs');
const path = require('path');

const n = parseInt(process.argv[2], 10);
if (!Number.isFinite(n) || n <= 0) {
  console.error('Build number missing');
  process.exit(1);
}
const file = path.join(__dirname, '..', 'app.json');
const config = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
config.expo.android.versionCode = n;
config.expo.ios.buildNumber = String(n);
fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n');
console.log(`Build number set to ${n}`);
