import fs from 'fs';
import path from 'path';

const src = 'C:/Users/poona/.gemini/antigravity/brain/993ff928-73c3-44a6-bb20-83ea8a766b88/login_mascot_1779637376106.png';
const dest = path.join(process.cwd(), 'public', 'login_bg.png');

try {
  fs.copyFileSync(src, dest);
  console.log('✅ Mascot image successfully copied to public/login_bg.png!');
} catch (err) {
  console.error('❌ Failed to copy image:', err.message);
}
