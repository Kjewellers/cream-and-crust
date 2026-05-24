const https = require('https');
const fs = require('fs');
const path = require('path');

const GITHUB_API_URL = 'https://api.github.com/repos/Kjewellers/cream-and-crust/contents/src';
const LOCAL_SRC_DIR = path.join(__dirname, 'src');

const requestOptions = {
  headers: {
    'User-Agent': 'NodeJS-Sync-Script',
    'Accept': 'application/vnd.github.v3+json'
  }
};

function patchAppJsx(content) {
  let modified = content;
  
  // Inject imports if not present
  if (!modified.includes('MenuBuilder')) {
    modified = modified.replace(
      "import Portfolio from './pages/Portfolio';",
      "import Portfolio from './pages/Portfolio';\nimport MenuBuilder from './pages/MenuBuilder';\nimport PublicMenu from './pages/PublicMenu';"
    );
  }
  
  if (!modified.includes('UtensilsCrossed')) {
    modified = modified.replace(
      "import { LayoutDashboard", 
      "import { UtensilsCrossed, LayoutDashboard"
    );
  }

  // Inject routing
  if (!modified.includes('path="/menu/:username"')) {
    modified = modified.replace(
      "<Route path=\"/portfolio/:username\" element={<Portfolio />} />",
      "<Route path=\"/portfolio/:username\" element={<Portfolio />} />\n            <Route path=\"/menu/:username\" element={<PublicMenu />} />"
    );
  }
  
  // Inject admin sidebar items
  if (!modified.includes('/menu-builder')) {
    modified = modified.replace(
      "{ to: '/portfolio-builder', icon: Menu, label: 'Website Builder' },",
      "{ to: '/portfolio-builder', icon: Menu, label: 'Website Builder' },\n      { to: '/menu-builder', icon: UtensilsCrossed, label: 'Menu Builder' },"
    );
  }

  return modified;
}

function downloadFile(fileUrl, destinationPath) {
  return new Promise((resolve, reject) => {
    https.get(fileUrl, requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.content && json.encoding === 'base64') {
            let decoded = Buffer.from(json.content, 'base64').toString('utf8');
            
            // Protect new files built locally today
            if (destinationPath.endsWith('MenuBuilder.jsx') || destinationPath.endsWith('PublicMenu.jsx')) {
              console.log('Skipping (preserving local file):', destinationPath);
              return resolve();
            }
            
            // Auto patch App.jsx to preserve the Menu feature
            if (destinationPath.endsWith('App.jsx')) {
              decoded = patchAppJsx(decoded);
            }
            
            fs.writeFileSync(destinationPath, decoded, 'utf8');
            console.log('Restored:', destinationPath);
          }
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function processDirectory(url, localDirPath) {
  if (!fs.existsSync(localDirPath)) {
    fs.mkdirSync(localDirPath, { recursive: true });
  }

  https.get(url, requestOptions, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', async () => {
      try {
        const items = JSON.parse(data);
        if (!Array.isArray(items)) {
          console.error('Error fetching directory:', data);
          return;
        }

        for (const item of items) {
          const itemLocalPath = path.join(localDirPath, item.name);
          if (item.type === 'file') {
            await downloadFile(item.url, itemLocalPath);
          } else if (item.type === 'dir') {
            processDirectory(item.url, itemLocalPath);
          }
        }
      } catch (e) {
        console.error('Error processing directory:', e);
      }
    });
  }).on('error', (e) => console.error(e));
}

console.log('Starting exact sync from Live Domain (Vercel/GitHub)...');
processDirectory(GITHUB_API_URL, LOCAL_SRC_DIR);
