const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/hooks/useAppRetention.js',
  'src/hooks/useAnalyticsAndCrashlytics.js',
  'src/context/PermissionContext.jsx',
  'src/api.js',
  'src/utils/photoPicker.js',
  'src/utils/openLink.js'
];

filesToFix.forEach(relPath => {
  const fullPath = path.join(__dirname, relPath);
  if (!fs.existsSync(fullPath)) return;
  
  let content = fs.readFileSync(fullPath, 'utf-8');
  
  // Calculate relative path to Platform.js
  const platformDir = path.join(__dirname, 'src/platform');
  const fileDir = path.dirname(fullPath);
  let relToPlatform = path.relative(fileDir, platformDir).replace(/\\/g, '/');
  if (!relToPlatform.startsWith('.')) relToPlatform = './' + relToPlatform;
  
  // Replace Capacitor import with Platform import
  content = content.replace(/import\s*\{\s*Capacitor\s*\}\s*from\s*['"]@capacitor\/core['"];?/g, `import Platform from '${relToPlatform}/Platform';`);
  
  // Replace Capacitor.isNativePlatform() with Platform.isAndroid()
  content = content.replace(/Capacitor\.isNativePlatform\(\)/g, 'Platform.isAndroid()');
  
  // Replace Capacitor.getPlatform() === 'android' with Platform.isAndroid()
  content = content.replace(/Capacitor\.getPlatform\(\)\s*===\s*['"]android['"]/g, 'Platform.isAndroid()');
  
  fs.writeFileSync(fullPath, content);
  console.log('Fixed', relPath);
});
