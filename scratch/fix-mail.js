const fs = require('fs');

let code = fs.readFileSync('lib/mail.ts', 'utf8');

// Add a colon and a non-breaking space to the label, and ensure there is a space before the value.
code = code.replace(/<span class="card-label">(.*?)<\/span>\s*<span class="card-value">/g, '<span class="card-label">$1:</span>&nbsp;\n        <span class="card-value">');

fs.writeFileSync('lib/mail.ts', code);
console.log('Fixed mail.ts formatting');
