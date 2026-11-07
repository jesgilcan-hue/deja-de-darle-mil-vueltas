import fs from 'fs';

const file = 'c:/Users/IA/Documents/Antigravity/MENOS RUIDO/web/web-menos-ruido/generador-portadas.html';
let content = fs.readFileSync(file, 'utf8');

const target = `            const applyBtn = (btn, allowed, tooltip) => {
                if (!btn) return;
                btn.title = tooltip;
                if (allowed) {
                    btn.classList.remove('binding-disabled');
                    btn.removeAttribute('disabled');
                } else {
                    btn.classList.add('binding-disabled');
                }
            };`;

const replacement = `            const applyBtn = (btn, allowed, tooltip) => {
                if (!btn) return;
                btn.title = tooltip;
                if (allowed) {
                    btn.classList.remove('binding-disabled');
                    btn.removeAttribute('disabled');
                    btn.style.opacity = '1';
                    btn.style.cursor = 'pointer';
                } else {
                    btn.classList.add('binding-disabled');
                    btn.setAttribute('disabled', 'true');
                    btn.style.opacity = '0.38';
                    btn.style.cursor = 'not-allowed';
                }
            };`;

const isCrlf = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

if (content.includes(target.replace(/\r\n/g, '\n'))) {
  content = content.replace(target.replace(/\r\n/g, '\n'), replacement.replace(/\r\n/g, '\n'));
  if (isCrlf) content = content.replace(/\n/g, '\r\n');
  fs.writeFileSync(file, content, 'utf8');
  console.log('✓ applyBtn successfully disabled in generador-portadas.html');
} else {
  console.error('applyBtn target not found');
}
