// Script de generación automática de sitemap.xml para Editorial Menos Ruido
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.resolve(rootDir, 'public');
const sitemapPath = path.resolve(publicDir, 'sitemap.xml');

const BASE_URL = 'https://www.editorialmenosruido.com';
const TODAY = new Date().toISOString().split('T')[0];

// Páginas privadas / internas que NUNCA deben indexarse en Google
const EXCLUDED_FILES = new Set([
  'apps.html',
  'generador-libro-completo-v1.html',
  'pre-lecturas.html',
  'presentacion-generador-planificador-semanal.html',
  'mi-espacio.html',
  '404.html',
  'generador-bitacora-enfoque.html'
]);

// Configuración de prioridades y frecuencias según el tipo de página
function getPageMeta(filename) {
  if (filename === 'index.html') {
    return { priority: '1.0', changefreq: 'daily', loc: `${BASE_URL}/` };
  }

  const cleanSlug = filename.replace(/\.html$/, '');

  // Páginas principales de libros
  if ([
    'habla-claro.html',
    'deja-de-darle-mil-vueltas.html',
    'planificador-semanal-simple.html',
    'planificador-semanal-reversible.html',
    'planificador-90-dias.html',
    'planificador-180-dias.html'
  ].includes(filename)) {
    return { priority: '0.95', changefreq: 'weekly', loc: `${BASE_URL}/${cleanSlug}` };
  }

  // Generadores interactivos
  if (filename.startsWith('generador-planificador-') || filename === 'generador.html') {
    return { priority: '0.90', changefreq: 'weekly', loc: `${BASE_URL}/${cleanSlug}` };
  }

  // Lecturas, ensayos y archivo de lecturas
  if (
    filename === 'lecturas.html' ||
    filename.startsWith('como-') ||
    filename.startsWith('la-') ||
    filename.startsWith('por-que-') ||
    filename.startsWith('el-sindrome-') ||
    filename.startsWith('comprar-') ||
    filename.startsWith('aprender-') ||
    filename.startsWith('planificacion-')
  ) {
    return { priority: '0.85', changefreq: 'weekly', loc: `${BASE_URL}/${cleanSlug}` };
  }

  // Tutoriales de generadores y guías de uso
  if (filename.startsWith('tutorial-') || filename.startsWith('guia-uso-')) {
    return { priority: '0.75', changefreq: 'monthly', loc: `${BASE_URL}/${cleanSlug}` };
  }

  // Simuladores y visores 3D
  if (filename.startsWith('simulador-') || filename.startsWith('visor-')) {
    return { priority: '0.70', changefreq: 'monthly', loc: `${BASE_URL}/${cleanSlug}` };
  }

  // Enlaces / Bio
  if (filename === 'links.html') {
    return { priority: '0.50', changefreq: 'monthly', loc: `${BASE_URL}/${cleanSlug}` };
  }

  // Páginas legales
  if (['aviso-legal.html', 'politica-privacidad.html', 'politica-cookies.html'].includes(filename)) {
    return { priority: '0.30', changefreq: 'yearly', loc: `${BASE_URL}/${cleanSlug}` };
  }

  // Por defecto para cualquier otra página pública
  return { priority: '0.60', changefreq: 'monthly', loc: `${BASE_URL}/${cleanSlug}` };
}

export function generateSitemap() {
  const files = fs.readdirSync(rootDir).filter(f => f.endsWith('.html') && !EXCLUDED_FILES.has(f));

  // Ordenar lógicamente: index primero, luego por prioridad descendente
  const entries = files.map(file => {
    const meta = getPageMeta(file);
    return {
      file,
      ...meta,
      lastmod: TODAY
    };
  }).sort((a, b) => {
    if (a.file === 'index.html') return -1;
    if (b.file === 'index.html') return 1;
    return parseFloat(b.priority) - parseFloat(a.priority);
  });

  const xmlEntries = entries.map(e => `  <url>
    <loc>${e.loc}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlEntries}
</urlset>
`;

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(sitemapPath, xml, 'utf8');
  console.log(`✓ Sitemap generado con éxito en ${sitemapPath} (${entries.length} URLs públicas indexables).`);
}

// Ejecutar si se llama directamente
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateSitemap();
}
