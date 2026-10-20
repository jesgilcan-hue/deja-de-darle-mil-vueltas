import fs from 'fs';
import path from 'path';

const src = 'C:\\Users\\IA\\AppData\\Local\\Microsoft\\Edge\\User Data\\Default';
const dst = 'C:\\Users\\IA\\AppData\\Local\\Temp\\edge_test_profile\\Default';

function copyRecursiveSync(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (let entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      copyRecursiveSync(srcPath, destPath);
    } else {
      try {
        fs.copyFileSync(srcPath, destPath);
      } catch (err) {
        // Ignore files locked by running Edge
      }
    }
  }
}

try {
  console.log('Copying IndexedDB and Local Storage...');
  copyRecursiveSync(path.join(src, 'IndexedDB'), path.join(dst, 'IndexedDB'));
  copyRecursiveSync(path.join(src, 'Local Storage'), path.join(dst, 'Local Storage'));
  copyRecursiveSync(path.join(src, 'Network'), path.join(dst, 'Network'));
  console.log('Done copying session data.');
} catch (e) {
  console.error('Error copying:', e.message);
}
