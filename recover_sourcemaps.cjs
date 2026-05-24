const fs = require('fs');
const path = require('path');

const domain = 'https://creamandcrust.online';
const targetDir = path.join(__dirname, 'src_recovered');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

async function run() {
  try {
    console.log('Fetching live app HTML...');
    const response = await fetch(domain);
    if (!response.ok) throw new Error(`Failed to fetch domain: ${response.status}`);
    const html = await response.text();
    
    // Look for <script type="module" crossorigin src="/assets/index-XXXX.js"></script>
    const scriptMatch = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
    if (!scriptMatch) {
      console.log('Could not find main JS bundle in HTML.');
      // Also check if there's any script tag with /assets/
      const altMatch = html.match(/\/assets\/[a-zA-Z0-9_-]+\.js/);
      if (altMatch) {
          console.log('Found alternative JS bundle:', altMatch[0]);
      } else {
          return;
      }
    }
    
    const bundleUrl = domain + (scriptMatch ? scriptMatch[1] : altMatch[0]);
    console.log('Found JS Bundle:', bundleUrl);
    
    const sourcemapUrl = bundleUrl + '.map';
    console.log('Fetching sourcemap from:', sourcemapUrl);
    
    const mapResponse = await fetch(sourcemapUrl);
    if (!mapResponse.ok) {
        console.log(`Failed to fetch sourcemap. Status: ${mapResponse.status}`);
        return;
    }
    console.log('Sourcemap fetched successfully. Parsing...');
    
    const map = await mapResponse.json();
    
    if (!map.sources || !map.sourcesContent) {
      console.log('Sourcemap does not contain sources or sourcesContent!');
      return;
    }
    
    let filesRecovered = 0;
    
    for (let i = 0; i < map.sources.length; i++) {
      let sourcePath = map.sources[i];
      let sourceContent = map.sourcesContent[i];
      
      if (!sourceContent) continue;
      
      if (sourcePath.includes('/src/') || sourcePath.startsWith('src/')) {
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
    
    console.log(`\n=======================================\nSUCCESS! Recovered ${filesRecovered} source files into src_recovered.\n=======================================`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

run();
