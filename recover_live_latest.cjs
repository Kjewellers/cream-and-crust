const https = require('https');
const fs = require('fs');
const path = require('path');

const domain = 'https://creamandcrust.online';
const out = path.join(__dirname, 'src_live_recovered');
const assetOut = path.join(__dirname, 'live_assets');
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(assetOut, { recursive: true });

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchBuffer(new URL(res.headers.location, url).toString()));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (res.statusCode !== 200) {
          const err = new Error(`HTTP ${res.statusCode} for ${url}: ${buf.toString('utf8').slice(0, 200)}`);
          err.statusCode = res.statusCode;
          return reject(err);
        }
        resolve(buf);
      });
    }).on('error', reject);
  });
}

(async () => {
  const html = (await fetchBuffer(domain + '/')).toString('utf8');
  fs.writeFileSync(path.join(assetOut, 'live.html'), html);
  const scripts = [...html.matchAll(/src="([^"]+\.js)"/g)].map(m => m[1]);
  const css = [...html.matchAll(/href="([^"]+\.css)"/g)].map(m => m[1]);
  console.log('scripts', scripts);
  console.log('css', css);
  for (const asset of [...scripts, ...css]) {
    const url = new URL(asset, domain).toString();
    const name = path.basename(asset);
    const buf = await fetchBuffer(url);
    fs.writeFileSync(path.join(assetOut, name), buf);
    console.log('downloaded', name, buf.length);
    try {
      const mapBuf = await fetchBuffer(url + '.map');
      fs.writeFileSync(path.join(assetOut, name + '.map'), mapBuf);
      console.log('downloaded map', name + '.map', mapBuf.length);
      const map = JSON.parse(mapBuf.toString('utf8'));
      let recovered = 0;
      if (map.sources && map.sourcesContent) {
        for (let i = 0; i < map.sources.length; i++) {
          const src = map.sources[i].replaceAll('\\\\', '/');
          const content = map.sourcesContent[i];
          if (!content) continue;
          const match = src.match(/(?:^|\.\.\/|\/)(src\/.*)$/);
          if (!match) continue;
          const rel = match[1].replace(/^src\//, '');
          const dest = path.join(out, rel);
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.writeFileSync(dest, content, 'utf8');
          recovered++;
        }
      }
      console.log('recovered source files from map:', recovered);
    } catch (e) {
      console.log('no map for', name, e.message);
    }
  }
})();
