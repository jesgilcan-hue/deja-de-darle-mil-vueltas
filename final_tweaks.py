import os
import re

base_dir = r"C:\Users\IA\Documents\Antigravity\MENOS RUIDO\web\web-menos-ruido"
index_path = os.path.join(base_dir, "index.html")

with open(index_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: btn-full background color
content = content.replace('background: var(--color-primary);', 'background: var(--color-accent); transition: opacity 0.3s ease; opacity: 0.9;')
content = content.replace('.btn-full:hover {\n            background: var(--color-text);\n        }', '.btn-full:hover {\n            background: var(--color-accent-hover);\n            opacity: 1;\n        }')

# Fix 2: Remove a tag around product images
content = content.replace('<a href="./deja-de-darle-mil-vueltas.html">\n                                <img src="/cover_deja.jpg" alt="Deja de darle mil vueltas">\n                            </a>', '<img src="/cover_deja.jpg" alt="Deja de darle mil vueltas" style="cursor: zoom-in;">')
content = content.replace('<a href="./planificador-90-dias.html">\n                                <img src="/cover_90.jpg" alt="Planificador 90 Días">\n                            </a>', '<img src="/cover_90.jpg" alt="Planificador 90 Días" style="cursor: zoom-in;">')
content = content.replace('<a href="./planificador-180-dias.html">\n                                <img src="/cover_180.jpg" alt="Planificador 180 Días">\n                            </a>', '<img src="/cover_180.jpg" alt="Planificador 180 Días" style="cursor: zoom-in;">')

# Fix 3: Add Contacto to footer
contact_html = '<a href="#" onclick="event.preventDefault(); navigator.clipboard.writeText(\'contacto@editorialmenosruido.com\'); const original = this.innerText; this.innerText = \'¡Copiado al portapapeles!\'; setTimeout(() => this.innerText = original, 2000);">Contacto</a>\n                    <a href="./aviso-legal.html">Aviso Legal</a>'
content = content.replace('<a href="./aviso-legal.html">Aviso Legal</a>', contact_html)

with open(index_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Final tweaks applied to index.html!")
