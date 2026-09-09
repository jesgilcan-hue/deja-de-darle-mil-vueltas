import os
import re

base_dir = r"C:\Users\IA\Documents\Antigravity\MENOS RUIDO\web\web-menos-ruido"

files = [
    "index.html",
    "habla-claro.html",
    "deja-de-darle-mil-vueltas.html",
    "planificador-90-dias.html",
    "planificador-180-dias.html",
    "planificador-semanal-simple.html",
    "planificador-semanal-reversible.html",
    "aviso-legal.html",
    "politica-privacidad.html",
    "politica-cookies.html"
]

new_nav = """            <nav>
                <a href="/">Home</a>
                <div class="dropdown">
                    <a href="/#libros" style="cursor: default;">Libros ▾</a>
                    <div class="dropdown-content">
                        <a href="/habla-claro.html">Habla Claro</a>
                        <a href="/deja-de-darle-mil-vueltas.html">Deja de darle mil vueltas</a>
                        <a href="/planificador-90-dias.html">Planificador de 90 Días</a>
                        <a href="/planificador-180-dias.html">Planificador de 180 Días</a>
                        <a href="/planificador-semanal-simple.html">Planificador Semanal Atemporal</a>
                        <a href="/planificador-semanal-reversible.html">Planificador Semanal Reversible</a>
                    </div>
                </div>
                <div class="dropdown">
                    <a href="#" style="cursor: default;">Simuladores ▾</a>
                    <div class="dropdown-content">
                        <a href="/simulador-habla-claro.html">Habla Claro</a>
                        <a href="/simulador-deja-de-darle-mil-vueltas.html">Deja de darle mil vueltas</a>
                        <a href="/simulador-90-dias.html">Planificador de 90 Días</a>
                        <a href="/simulador-180-dias.html">Planificador de 180 Días</a>
                        <a href="/simulador-semanal-simple.html">Planificador Semanal Atemporal</a>
                        <a href="/simulador-semanal-reversible.html">Planificador Semanal Reversible</a>
                    </div>
                </div>
            </nav>"""

for filename in files:
    filepath = os.path.join(base_dir, filename)
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Replace the <nav> block
        content = re.sub(r'<nav>.*?</nav>', new_nav, content, flags=re.DOTALL)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

sim_nav = new_nav.replace('<nav>', '<nav class="topbar-nav">')
sim_files = [
    "simulador-habla-claro.html",
    "simulador-deja-de-darle-mil-vueltas.html",
    "simulador-90-dias.html",
    "simulador-180-dias.html"
]

for s_file in sim_files:
    s_path = os.path.join(base_dir, s_file)
    if os.path.exists(s_path):
        with open(s_path, 'r', encoding='utf-8') as f:
            content = f.read()
        content = re.sub(r'<nav class="topbar-nav">.*?</nav>', sim_nav, content, flags=re.DOTALL)
        with open(s_path, 'w', encoding='utf-8') as f:
            f.write(content)

print("Nav updated with all books and simulators across static pages and simulators!")

# --- AUDIT CHECKS ---
html_files = [f for f in os.listdir(base_dir) if f.endswith('.html')]
pub_dir = os.path.join(base_dir, 'public')

print("\n=== AUDITORÍA DE IMÁGENES ===")
missing_imgs = []
for h in html_files:
    with open(os.path.join(base_dir, h), 'r', encoding='utf-8') as f:
        content = f.read()
    imgs = re.findall(r'src=["\']([^"\']+\.(?:png|jpg|jpeg|svg|webp))["\']', content, re.IGNORECASE)
    for img in imgs:
        if img.startswith('http'):
            continue
        clean_img = img.lstrip('/')
        if not (os.path.exists(os.path.join(base_dir, clean_img)) or os.path.exists(os.path.join(pub_dir, clean_img))):
            missing_imgs.append((h, img))

if missing_imgs:
    print(f"ALERTA: {len(missing_imgs)} imagenes no encontradas:")
    for m in missing_imgs:
        print(f"  En {m[0]}: {m[1]}")
else:
    print("[OK] 100% de las imagenes referenciadas existen fisicamente en public/")

print("\n=== AUDITORIA DE ENLACES INTERNOS ===")
broken_links = []
for h in html_files:
    with open(os.path.join(base_dir, h), 'r', encoding='utf-8') as f:
        content = f.read()
    links = re.findall(r'href=["\']([^"\']+\.html)["\']', content)
    for l in links:
        if l.startswith('http') or l.startswith('#'):
            continue
        target = l.lstrip('./').lstrip('/')
        if not os.path.exists(os.path.join(base_dir, target)):
            broken_links.append((h, l))

if broken_links:
    print(f"ALERTA: {len(broken_links)} enlaces rotos:")
    for b in broken_links:
        print(f"  En {b[0]}: {b[1]}")
else:
    print("[OK] 100% de los enlaces internos HTML existen")

print("\n=== AUDITORIA DE PRECIOS EN TEXTO ===")
price_matches = []
for h in html_files:
    with open(os.path.join(base_dir, h), 'r', encoding='utf-8') as f:
        content = f.read()
    # Check for euro signs, dollar signs, or price numbers like 6,99 / 9,99 / 12,99
    found = re.findall(r'(\d+[\.,]\d{2}\s*€|€\s*\d+|\d+\s*€|\$\d+)', content)
    if found:
        price_matches.append((h, found))

if price_matches:
    print(f"ALERTA: Se encontraron posibles menciones de precios:")
    for p in price_matches:
        print(f"  En {p[0]}: {p[1]}")
else:
    print("[OK] Cero precios detectados en el contenido de la web")

