const fs = require('fs');
const path = require('path');
function checkImports(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory() && file !== 'node_modules' && file !== 'dist') {
            checkImports(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const regex = /import.*from\s+['"]([^'"]+)['"]/g;
            let match;
            while ((match = regex.exec(content)) !== null) {
                const importPath = match[1];
                if (importPath.startsWith('.')) {
                    // Try to resolve
                    let target = path.resolve(dir, importPath);
                    // Check if target exists exactly (case-sensitive)
                    let ext = '';
                    if (!fs.existsSync(target)) {
                        if (fs.existsSync(target + '.js')) ext = '.js';
                        else if (fs.existsSync(target + '.jsx')) ext = '.jsx';
                        else if (fs.existsSync(target + '/index.js')) { target = path.join(target, 'index.js'); }
                        else if (fs.existsSync(target + '/index.jsx')) { target = path.join(target, 'index.jsx'); }
                    }
                    if (fs.existsSync(target + ext)) {
                        target += ext;
                        const dirName = path.dirname(target);
                        const baseName = path.basename(target);
                        const actualFiles = fs.readdirSync(dirName);
                        if (!actualFiles.includes(baseName)) {
                            console.log('Case mismatch in ' + fullPath + ' -> ' + importPath + ' (Expected: ' + baseName + ')');
                        }
                    } else {
                        console.log('Not found in ' + fullPath + ' -> ' + importPath);
                    }
                }
            }
        }
    }
}
checkImports('./src');
