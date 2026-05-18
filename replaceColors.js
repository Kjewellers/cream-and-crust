const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const replacements = [
  { search: /#F97316/gi, replace: '#F472B6' },
  { search: /249, 115, 22/g, replace: '244, 114, 182' },
  { search: /249,115,22/g, replace: '244,114,182' },
  { search: /#EA580C/gi, replace: '#DB2777' },
  { search: /#FDBA74/gi, replace: '#FBCFE8' },
  { search: /212, 113, 74/g, replace: '244, 114, 182' },
  { search: /212,113,74/g, replace: '244,114,182' }
];

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.css') || fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const { search, replace } of replacements) {
        if (content.match(search)) {
          content = content.replace(search, replace);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated:', fullPath);
      }
    }
  }
}

processDir(srcDir);
