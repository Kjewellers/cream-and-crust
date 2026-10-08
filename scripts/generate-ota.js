import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const archiver = require('archiver');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '../dist');
const ZIP_PATH = path.join(DIST_DIR, 'update.zip');
const MANIFEST_PATH = path.join(DIST_DIR, 'version.json');

// ECDSA P-256 Private Key - STORE SECURELY IN CI/CD ENV VARIABLES!
const OTA_PRIVATE_KEY = process.env.OTA_PRIVATE_KEY || `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQggmKMNozJwNThGQqe
SrWQrd4rfpq12SQT264CeDMwf36hRANCAATLZOjguxSb35i5B4YWOLR8MkgRcBrR
0a8+4J/NeVUBW8rdxj+qw8UOQqZnC+oLXdmDRRmSVsLFZcWYXMmJqJzC
-----END PRIVATE KEY-----`;

async function generateOTA() {
  console.log('📦 Generating OTA Update Bundle...');

  if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ dist/ directory not found. Did you run vite build?');
    process.exit(1);
  }

  // 1. Create ZIP
  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(ZIP_PATH);
    const archive = new archiver.ZipArchive({ zlib: { level: 9 } });

    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    // Add all files in dist EXCEPT the zip itself and version.json
    archive.glob('**/*', {
      cwd: DIST_DIR,
      ignore: ['update.zip', 'version.json']
    });
    archive.finalize();
  });

  console.log(`✅ Created update.zip (${fs.statSync(ZIP_PATH).size} bytes)`);

  // 2. Generate Checksum
  const fileBuffer = fs.readFileSync(ZIP_PATH);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  const checksum = hashSum.digest('hex');

  // 3. Create Manifest
  // We use the timestamp as the version for continuous integration
  const version = `1.1.${Date.now()}`; 
  
  const manifest = {
    version: version,
    minimumNative: 1,  // The minimum Android versionCode this JS bundle supports
    maximumNative: 999,
    disabled: false,
    rollout: 100, // Default 100% rollout for testing
    checksum: checksum,
    releaseNotes: 'Automated OTA Update',
    publishedAt: new Date().toISOString(),
    priority: 'NORMAL', // LOW, NORMAL, HIGH, CRITICAL
    otaEnabled: true
  };

  // 4. Generate Signature (ECDSA P-256)
  const sign = crypto.createSign('SHA256');
  sign.update(JSON.stringify(manifest));
  sign.end();
  
  manifest.signature = sign.sign(OTA_PRIVATE_KEY, 'hex');

  // Write Manifest
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`✅ Created version.json (Version: ${version})`);
  console.log('🚀 OTA Bundle Ready in dist/ !');
}

generateOTA().catch(console.error);
