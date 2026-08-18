const fs = require('fs');
const path = require('path');

const dir = 'c:\\Kortex';
const ignoreDirs = new Set(['node_modules', '.git', '.next', 'scratch']);
const ignoreExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot', '.pdf', '.webp', '.zip', '.tar', '.gz']);

function walk(directory) {
  let results = [];
  const list = fs.readdirSync(directory);
  list.forEach((file) => {
    if (ignoreDirs.has(file)) return;
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else {
      const ext = path.extname(fullPath).toLowerCase();
      if (!ignoreExtensions.has(ext)) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const files = walk(dir);
let changedCount = 0;

files.forEach((file) => {
  // don't edit this script
  if (file.includes('scratch_rename.js')) return;
  // skip lock files as they are auto-generated
  if (file.endsWith('pnpm-lock.yaml')) return;
  
  try {
    const original = fs.readFileSync(file, 'utf8');
    let content = original;
    
    // Order matters! Replace longest first.
    content = content.replace(/DeskcommCRM/g, 'Kortex');
    content = content.replace(/deskcommcrm/g, 'kortex');
    content = content.replace(/Deskcomm/g, 'Kortex');
    content = content.replace(/deskcomm/g, 'kortex');
    content = content.replace(/DESKCOMM/g, 'KORTEX');
    
    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      changedCount++;
      console.log(`Updated ${file}`);
    }
  } catch (err) {
    console.error(`Error reading/writing ${file}: ${err.message}`);
  }
});

console.log(`\nReplaced strings in ${changedCount} files.`);
