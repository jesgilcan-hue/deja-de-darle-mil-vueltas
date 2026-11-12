const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '..');
const TEMPLATE_FILE = path.join(WEB_ROOT, 'visor-planificador-90-dias.html');
const template = fs.readFileSync(TEMPLATE_FILE, 'utf8');

const BOOKS = [
  {
    slug: 'libro-pasatiempos-abuelos',
    title: 'El Gran Cuaderno de los Abuel@s',
    localDir: 'c:/Users/IA/Documents/Antigravity/Pasatiempos/Libro_Abuelos/output/3D-Completo',
    pagesCount: 160,
    spineCm: '0.91',
    bookW: 8.5,
    bookH: 11,
    bookD: 0.3603
  },
  {
    slug: 'libro-pasatiempos-docentes',
    title: 'El Gran Libro de los Docentes · Cuaderno de Claustro',
    localDir: 'c:/Users/IA/Documents/Antigravity/Pasatiempos/Libro_Docentes/output/3D-Completo',
    pagesCount: 146,
    spineCm: '0.84',
    bookW: 8.5,
    bookH: 11,
    bookD: 0.3288
  },
  {
    slug: 'libro-pasatiempos-enfermeria',
    title: 'Turno de Noche: Enfermería',
    localDir: 'c:/Users/IA/Documents/Antigravity/Pasatiempos/Libro_Enfermeria_Turno_Noche/output/3D-Completo',
    pagesCount: 146,
    spineCm: '0.84',
    bookW: 8.5,
    bookH: 11,
    bookD: 0.3288
  },
  {
    slug: 'libro-pasatiempos-navidad',
    title: 'Pasatiempos de Navidad',
    localDir: 'c:/Users/IA/Documents/Antigravity/Pasatiempos/Libro_Navidad/output/3D-Completo',
    pagesCount: 146,
    spineCm: '0.84',
    bookW: 8.5,
    bookH: 11,
    bookD: 0.3288
  }
];

function generateHtml(book, isLocal) {
  let html = template;

  // 1. Title & Meta
  html = html.replace(
    /<title>.*?<\/title>/,
    `<title>Visor 3D Completo · ${book.title} | Editorial Menos Ruido</title>`
  );

  // 2. Header info
  const headerRegex = /<div class="header">[\s\S]*?<\/div>\s*<\/div>/;
  const newHeader = `<div class="header">
            <div class="brand">Colección Menos Ruido · Pasatiempos</div>
            <div class="title">${book.title}</div>
            <div class="specs">
                <span>Formato 8.5" × 11" (21,59 × 27,94 cm)</span>
                <span>·</span>
                <span>${book.pagesCount} Páginas</span>
                <span>·</span>
                <span class="badge">Lomo ${book.spineCm} cm (${book.bookD.toFixed(3)}")</span>
                <span class="badge">Tapa Blanda</span>
            </div>
        </div>`;
  html = html.replace(headerRegex, newHeader);

  // 3. Modal header title
  html = html.replace(
    /<div class="modal-book-title">.*?<\/div>/,
    `<div class="modal-book-title">${book.title}</div>`
  );
  html = html.replace(
    /<div class="modal-book-subtitle">.*?<\/div>/,
    `<div class="modal-book-subtitle">Muestra de pasatiempos interior · 16 páginas</div>`
  );

  // 4. Page images
  const pagesBasePath = isLocal ? './pages' : `/books/${book.slug}`;
  for (let i = 1; i <= 16; i++) {
    const numStr = String(i).padStart(2, '0');
    const oldRegex = new RegExp(
      `/books/planificador-90-dias/page_${numStr}\\.webp`,
      'g'
    );
    html = html.replace(oldRegex, `${pagesBasePath}/page_${numStr}.webp`);
  }
  // Alt text
  html = html.replace(/Planificador 90 Días/g, book.title);

  // 5. Script paths for local vs web
  if (isLocal) {
    html = html.replace(/src="\/three\.min\.js"/g, 'src="./three.min.js"');
    html = html.replace(/src="\/orbit-controls\.js"/g, 'src="./orbit-controls.js"');
    html = html.replace(/src="\/page-flip\.browser\.js"/g, 'src="./page-flip.browser.js"');
  }

  // 6. Texture paths
  const texBasePath = isLocal ? './textures' : `/books/${book.slug}/3d`;
  html = html.replace(/\/books\/planificador-90-dias\/3d/g, texBasePath);

  // 7. BOOK DIMENSIONS & CAMERA DISTANCE
  html = html.replace(/const BOOK_W = 6;/, `const BOOK_W = ${book.bookW};`);
  html = html.replace(/const BOOK_H = 9;/, `const BOOK_H = ${book.bookH};`);
  html = html.replace(/const BOOK_D = 0\.3355;/, `const BOOK_D = ${book.bookD};`);

  // Sizing camera distance for 8.5" x 11" (24 keeps the same headroom as 20 for 6" x 9")
  html = html.replace(/camera\.position\.set\(0, 0, 20\);/, 'camera.position.set(0, 0, 24);');
  html = html.replace(/let transStartRadius = 20;/, 'let transStartRadius = 24;');
  html = html.replace(/let transTargetRadius = 20;/, 'let transTargetRadius = 24;');
  html = html.replace(/const dist = 20;/, 'const dist = 24;');

  // 8. BRIGHTNESS & COLORS: PREVENT MURKY/DARK COVERS
  // Set material colors to 0xffffff so cover textures are rendered at 100% full original brightness
  html = html.replace(
    /const matSpine = new THREE\.MeshStandardMaterial\(\{[\s\S]*?color:\s*0x[0-9a-fA-F]+,/m,
    `const matSpine = new THREE.MeshStandardMaterial({\n            color: 0xffffff,`
  );
  html = html.replace(
    /const matFront = new THREE\.MeshStandardMaterial\(\{[\s\S]*?color:\s*0x[0-9a-fA-F]+,/m,
    `const matFront = new THREE.MeshStandardMaterial({\n            color: 0xffffff,`
  );
  html = html.replace(
    /const matBack = new THREE\.MeshStandardMaterial\(\{[\s\S]*?color:\s*0x[0-9a-fA-F]+,/m,
    `const matBack = new THREE.MeshStandardMaterial({\n            color: 0xffffff,`
  );
  // Slightly higher roughness/metalness tuning for soft cover
  html = html.replace(/roughness: 0\.5,/g, 'roughness: 0.45,');
  html = html.replace(/metalness: 0\.05/g, 'metalness: 0.02');
  html = html.replace(/roughness: 0\.45,/g, 'roughness: 0.42,');
  html = html.replace(/metalness: 0\.04/g, 'metalness: 0.02');

  // Lighting boost for vibrancy
  html = html.replace(
    /const ambientLight = new THREE\.AmbientLight\(0xffffff, 0\.75\);/,
    'const ambientLight = new THREE.AmbientLight(0xffffff, 0.90);'
  );
  html = html.replace(
    /const keyLight = new THREE\.DirectionalLight\(0xfff6ea, 1\.25\);/,
    'const keyLight = new THREE.DirectionalLight(0xfff6ea, 1.35);'
  );
  html = html.replace(
    /const fillLight = new THREE\.DirectionalLight\(0xe8f0ff, 0\.6\);/,
    'const fillLight = new THREE.DirectionalLight(0xe8f0ff, 0.70);'
  );
  html = html.replace(
    /const rimLight = new THREE\.DirectionalLight\(0xffffff, 0\.8\);/,
    'const rimLight = new THREE.DirectionalLight(0xffffff, 0.85);'
  );
  html = html.replace(
    /renderer\.toneMappingExposure = 1\.05;/,
    'renderer.toneMappingExposure = 1.15;'
  );

  // 9. FLIPBOOK SIZE & PROPORTIONS FOR 8.5" x 11"
  // For 8.5x11, single page aspect ratio is 8.5:11 (0.7727)
  // baseW = 550, baseH = 712 (550 * 11 / 8.5 = 711.76)
  html = html.replace(/const baseW = 550;\s*const baseH = 825;/, 'const baseW = 550;\n            const baseH = 712;');
  html = html.replace(/minWidth: 260,\s*maxWidth: 900,\s*minHeight: 380,\s*maxHeight: 900,/, 'minWidth: 280,\n                maxWidth: 1200,\n                minHeight: 360,\n                maxHeight: 1200,');

  // Extra flipbook update on open to ensure it stretches to full container size immediately
  html = html.replace(
    /setTimeout\(\(\) => \{\s*if \(pageFlip\) \{\s*pageFlip\.update\(\);\s*updateCounter\(\);\s*\}\s*\}, 80\);/,
    `setTimeout(() => {
                if (pageFlip) {
                    pageFlip.update();
                    updateCounter();
                }
            }, 80);
            setTimeout(() => {
                if (pageFlip) {
                    pageFlip.update();
                    updateCounter();
                }
            }, 250);`
  );

  return html;
}

// Write web visors and local standalone index.html
BOOKS.forEach((book) => {
  const webHtml = generateHtml(book, false);
  const webPath = path.join(WEB_ROOT, `visor-${book.slug}.html`);
  fs.writeFileSync(webPath, webHtml, 'utf8');
  console.log(`[OK] Web visor escrito: visor-${book.slug}.html`);

  const localHtml = generateHtml(book, true);
  const localPath = path.join(book.localDir, 'index.html');
  fs.writeFileSync(localPath, localHtml, 'utf8');
  console.log(`[OK] Local visor escrito: ${localPath}`);
});

console.log('¡Todos los visores regenerados con el template exacto del Planificador 90 Días!');
