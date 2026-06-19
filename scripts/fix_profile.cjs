const fs = require('fs');

try {
  const file = 'src/pages/Profile.jsx';
  let content = fs.readFileSync(file, 'utf8');

  // Find start of old renderAchievements
  let startIndex = content.indexOf('/* ─────────────────────────────────────────────\r\n     Render: Achievements Section (collapsible card)');
  if (startIndex === -1) startIndex = content.indexOf('/* ─────────────────────────────────────────────\n     Render: Achievements Section (collapsible card)');

  // Find start of completenessMessage
  let endIndex = content.indexOf('const completenessMessage = useMemo(() => {');

  if (startIndex !== -1 && endIndex !== -1) {
    const keepStart = content.substring(0, startIndex);
    const keepEnd = content.substring(endIndex);
    fs.writeFileSync(file, keepStart + keepEnd);
    console.log('Removed duplicate old renderAchievements.');
  } else {
    console.error('Markers not found', { startIndex, endIndex });
  }
} catch (e) {
  console.error(e);
}
