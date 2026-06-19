const fs = require('fs');

try {
  const file = 'src/pages/Profile.jsx';
  let content = fs.readFileSync(file, 'utf8');

  let index = content.indexOf('/* ─────────────────────────────────────────────\r\n     Render: Hero card');
  if (index === -1) index = content.indexOf('/* ─────────────────────────────────────────────\n     Render: Hero card');

  if (index === -1) {
      console.error('Marker not found in Profile.jsx');
      process.exit(1);
  }

  const keep = content.substring(0, index);
  const newRenders = fs.readFileSync('scripts/new_renders.txt', 'utf8');

  fs.writeFileSync(file, keep + newRenders);
  console.log('Successfully updated Profile.jsx');
} catch (e) {
  console.error(e);
}
