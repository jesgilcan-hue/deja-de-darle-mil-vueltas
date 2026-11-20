// Publica automáticamente lecturas programadas en lecturas-programadas/ cuya publishDate <= hoy (Europe/Madrid)
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const QUEUE_DIR = path.join(ROOT, 'lecturas-programadas');
const LECTURAS_HTML = path.join(ROOT, 'lecturas.html');
const VITE_CONFIG = path.join(ROOT, 'vite.config.js');

function getTodayMadrid() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildCardHtml(meta) {
  const isPasatiempos = meta.section === 'pasatiempos';
  const isEntreno = meta.section === 'entreno';
  const borderColor = isPasatiempos ? '#111111' : (isEntreno ? '#2d4a3e' : 'var(--color-accent)');
  const badgeText = meta.badge || 'Nuevo';
  const slugUrl = `/${meta.slug}`;

  return `                        <!-- Artículo (${escapeHtml(meta.publishDate)}): ${escapeHtml(meta.title)} -->
                        <div class="reading-card" style="display: flex; flex-direction: column; justify-content: space-between; cursor: default; border-top: 4px solid ${borderColor}; background: linear-gradient(180deg, #ffffff 0%, #fdfaf7 100%);">
                            <div>
                                <a href="${slugUrl}" class="reading-card-thumb" style="text-decoration: none;">
                                    <img src="${escapeHtml(meta.image)}" alt="${escapeHtml(meta.imageAlt || meta.title)}" loading="lazy">
                                </a>
                                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.6rem; align-items: center;">
                                    <span class="reading-tag" style="margin-bottom: 0;">${escapeHtml(meta.tag || 'Lecturas')}</span>
                                    <span class="video-card-badge" style="background: rgba(135,85,59,0.12); color: var(--color-accent); font-weight: 700;">${escapeHtml(badgeText)}</span>
                                </div>
                                <h3 style="margin-top: 0.2rem;"><a href="${slugUrl}" style="text-decoration: none; color: inherit;">${escapeHtml(meta.title)}</a></h3>
                                <p>${escapeHtml(meta.description)}</p>
                            </div>
                            <div class="reading-footer" style="margin-top: 1.25rem;">
                                <span>${escapeHtml(meta.readTime || '5 min de lectura')}</span>
                                <a href="${slugUrl}" class="read-more" style="text-decoration: none;">Leer &rarr;</a>
                            </div>
                        </div>`;
}

function main() {
  if (!fs.existsSync(QUEUE_DIR)) {
    console.log('No existe carpeta lecturas-programadas/. Nada que publicar.');
    return;
  }

  const today = getTodayMadrid();
  const jsonFiles = fs.readdirSync(QUEUE_DIR).filter(f => f.endsWith('.json')).sort();
  if (!jsonFiles.length) {
    console.log(`Cola vacía (${today}). Nada que publicar.`);
    return;
  }

  const due = [];
  for (const jf of jsonFiles) {
    const fullJsonPath = path.join(QUEUE_DIR, jf);
    const meta = JSON.parse(fs.readFileSync(fullJsonPath, 'utf8'));
    if (!meta.publishDate || !meta.slug) continue;
    if (meta.publishDate <= today) {
      const baseName = jf.replace(/\.json$/i, '');
      const candidates = [
        path.join(QUEUE_DIR, `${baseName}.html`),
        path.join(QUEUE_DIR, `${meta.slug}.html`)
      ];
      const htmlSrc = candidates.find(c => fs.existsSync(c));
      if (!htmlSrc) {
        console.warn(`Falta el archivo HTML para ${jf}, se omite.`);
        continue;
      }
      due.push({ meta, fullJsonPath, htmlSrc });
    }
  }

  if (!due.length) {
    console.log(`Ninguna lectura programada para hoy o antes (${today}).`);
    return;
  }

  let lecturasHtml = fs.readFileSync(LECTURAS_HTML, 'utf8');
  let viteConfig = fs.readFileSync(VITE_CONFIG, 'utf8');
  let publishedCount = 0;

  for (const { meta, fullJsonPath, htmlSrc } of due) {
    const destHtml = path.join(ROOT, `${meta.slug}.html`);
    fs.renameSync(htmlSrc, destHtml);

    // Registrar en vite.config.js si no existe
    const viteKey = meta.viteKey || `ensayo_${meta.slug.replace(/[^a-zA-Z0-9]/g, '_')}`;
    if (!viteConfig.includes(`'${meta.slug}.html'`) && !viteConfig.includes(`"${meta.slug}.html"`)) {
      const anchor = "lecturas: resolve(__dirname, 'lecturas.html'),";
      if (viteConfig.includes(anchor)) {
        viteConfig = viteConfig.replace(
          anchor,
          `${anchor}\n        ${viteKey}: resolve(__dirname, '${meta.slug}.html'),`
        );
      }
    }

    // Insertar tarjeta en lecturas.html si no existe
    if (!lecturasHtml.includes(`href="/${meta.slug}"`)) {
      const marker =
        meta.section === 'pasatiempos'
          ? '<!-- AUTO-PASATIEMPOS-INICIO -->'
          : meta.section === 'entreno'
          ? '<!-- AUTO-ENTRENO-INICIO -->'
          : '<!-- AUTO-LECTURAS-INICIO -->';
      if (lecturasHtml.includes(marker)) {
        lecturasHtml = lecturasHtml.replace(marker, `${marker}\n${buildCardHtml(meta)}`);
      }
    }

    fs.unlinkSync(fullJsonPath);
    publishedCount++;
    console.log(`✓ Publicada lectura: /${meta.slug} (fecha programada: ${meta.publishDate})`);
  }

  fs.writeFileSync(LECTURAS_HTML, lecturasHtml, 'utf8');
  fs.writeFileSync(VITE_CONFIG, viteConfig, 'utf8');

  if (publishedCount > 0) {
    execSync('node scripts/generate-sitemap.js', { cwd: ROOT, stdio: 'inherit' });
    console.log(`✓ Total publicadas hoy (${today}): ${publishedCount}`);
  }
}

main();
