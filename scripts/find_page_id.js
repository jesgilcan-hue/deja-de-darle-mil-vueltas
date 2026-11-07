import fs from 'fs';

const content = fs.readFileSync('c:/Users/IA/Documents/Antigravity/MENOS RUIDO/web/web-menos-ruido/generador-portadas.html', 'utf8');
const matches = content.match(/id=["'][^"']*page[^"']*["']/gi);
console.log('Matches:', matches);

// Check PLANNER_COVER_PRESETS
const idx = content.indexOf('PLANNER_COVER_PRESETS');
if (idx !== -1) {
  console.log('PLANNER_COVER_PRESETS:', content.substring(idx, idx + 800));
}
