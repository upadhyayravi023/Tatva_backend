const fs = require('fs');
const path = require('path');

function fixDir(dir) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat.isDirectory() && !file.includes('node_modules')) {
      fixDir(file);
    } else if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.tsx')) {
      let content = fs.readFileSync(file, 'utf8');
      if (content.includes('\\`')) {
        content = content.replace(/\\`/g, '`');
        fs.writeFileSync(file, content);
        console.log('Fixed', file);
      }
    }
  });
}

fixDir(path.resolve(__dirname, '..'));
