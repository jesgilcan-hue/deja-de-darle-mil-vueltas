const fs = require('fs');
const file = 'c:/Users/IA/Documents/Antigravity/MENOS RUIDO/web/web-menos-ruido/scripts/test_cruzadas_gen.cjs';
let code = fs.readFileSync(file, 'utf8');

// Modify to print details of the best attempt
code = code.replace(
    'if (!bestGrid || placed.length > bestPlaced.length) {',
    'if (!bestGrid || placed.length > bestPlaced.length) {\n        console.log("New best attempt:", attempt, "count:", placed.length);'
);
fs.writeFileSync(file, code, 'utf8');
