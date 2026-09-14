const fs = require('fs');
const path = require('path');

const gradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
if (!fs.existsSync(gradlePath)) {
  console.error('build.gradle not found at ' + gradlePath);
  process.exit(1);
}

const keystorePassword = process.env.ANDROID_KEYSTORE_PASSWORD || 'sprintflow2026';
const keyAlias = process.env.ANDROID_KEY_ALIAS || 'sprintflow-key';
const keyPassword = process.env.ANDROID_KEY_PASSWORD || 'sprintflow2026';

let gradle = fs.readFileSync(gradlePath, 'utf8');

const releaseSigningBlock = `signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            storeFile file('release.keystore')
            storePassword '${keystorePassword}'
            keyAlias '${keyAlias}'
            keyPassword '${keyPassword}'
        }
    }`;

// Replace the entire signingConfigs block
gradle = gradle.replace(/signingConfigs\s*\{[\s\S]*?debug\s*\{[\s\S]*?\}\s*\}/, releaseSigningBlock);

// Replace signingConfig ONLY in release buildType
gradle = gradle.replace(
  /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?signingConfig\s+)signingConfigs\.debug/,
  '$1signingConfigs.release'
);

fs.writeFileSync(gradlePath, gradle, 'utf8');
console.log('Successfully configured release signing in build.gradle');
