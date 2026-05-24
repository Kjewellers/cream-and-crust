const https = require('https');
const fs = require('fs');
const path = require('path');

const domain = 'https://creamandcrust.online';
const targetDir = path.join(__dirname, 'src_recovered');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch ${url}: ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function run() {
  try {
    console.log('Fetching live app HTML...');
    const html = await fetch(domain);
    
    // Look for <script type="module" crossorigin src="/assets/index-XXXX.js"></script>
    const scriptMatch = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
    if (!scriptMatch) {
      console.log('Could not find main JS bundle in HTML.');
      return;
    }
    
    const bundleUrl = domain + scriptMatch[1];
    console.log('Found JS Bundle:', bundleUrl);
    
    // The sourcemap URL is usually the bundle URL + '.map' in Vite.
    const sourcemapUrl = bundleUrl + '.map';
    console.log('Fetching sourcemap from:', sourcemapUrl);
    
    const mapData = await fetch(sourcemapUrl);
    console.log('Sourcemap fetched successfully. Parsing...');
    
    const map = JSON.parse(mapData);
    
    if (!map.sources || !map.sourcesContent) {
      console.log('Sourcemap does not contain sources or sourcesContent!');
      return;
    }
    
    let filesRecovered = 0;
    
    for (let i = 0; i < map.sources.length; i++) {
      let sourcePath = map.sources[i];
      let sourceContent = map.sourcesContent[i];
      
      if (!sourceContent) continue;
      
      // We only want files from 'src'
      // Example sourcePath: "../src/App.jsx" or "src/App.jsx"
      if (sourcePath.includes('/src/') || sourcePath.startsWith('src/')) {
        // Clean up path to just be relative to src
        const match = sourcePath.match(/src\/(.*)/);
        if (match) {
          const relativePath = match[1];
          const fullPath = path.join(targetDir, relativePath);
          
          const dir = path.dirname(fullPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          
          fs.writeFileSync(fullPath, sourceContent, 'utf-8');
          filesRecovered++;
        }
      }
    }
    
    console.log(`SUCCESS! Recovered ${filesRecovered} source files into src_recovered.`);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
