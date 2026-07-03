const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('C:/Users/Dell/OneDrive/Desktop/qr_management/frontend/src');
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  // It appears the file literally contains backslash followed by backtick. 
  // We can safely replace them with just a backtick.
  content = content.replace(/\\`/g, '`');
  fs.writeFileSync(f, content);
});
console.log('Fixed files');
