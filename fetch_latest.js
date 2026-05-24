import fs from 'fs';
import https from 'https';
import path from 'path';

const filesToFetch = [
  'src/pages/Dashboard.jsx',
  'src/App.jsx',
  'src/index.css'
];

const basePath = 'C:\\Users\\poona\\.gemini\\antigravity\\scratch\\cream-and-crust';

const downloadFile = (file) => {
  return new Promise((resolve, reject) => {
    const url = `https://raw.githubusercontent.com/Kjewellers/cream-and-crust/main/${file}`;
    const dest = path.join(basePath, file);
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // If it's App.jsx, we need to preserve the MenuBuilder and PublicMenu routes
        if (file === 'src/App.jsx') {
          // We won't overwrite App.jsx completely, we will just download it to a temp file to inspect
          fs.writeFileSync(dest + '.latest', data);
        } else {
          fs.writeFileSync(dest, data);
        }
        console.log(`Downloaded: ${file}`);
        resolve();
      });
    }).on('error', reject);
  });
};

async function main() {
  for (const file of filesToFetch) {
    await downloadFile(file);
  }
}

main();
