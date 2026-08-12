import os
import re

base_dir = r"C:\Users\IA\Documents\Antigravity\MENOS RUIDO\web\web-menos-ruido"

files = [
    "index.html",
    "deja-de-darle-mil-vueltas.html",
    "planificador-90-dias.html",
    "planificador-180-dias.html"
]

new_nav = """            <nav>
                <a href="/">Home</a>
                <div class="dropdown">
                    <a href="/#libros" style="cursor: default;">Libros ▾</a>
                    <div class="dropdown-content">
                        <a href="/deja-de-darle-mil-vueltas.html">Deja de darle mil vueltas</a>
                        <a href="/planificador-90-dias.html">Planificador de 90 Días</a>
                        <a href="/planificador-180-dias.html">Planificador de 180 Días</a>
                    </div>
                </div>
            </nav>"""

for filename in files:
    filepath = os.path.join(base_dir, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace the <nav> block
    content = re.sub(r'<nav>.*?</nav>', new_nav, content, flags=re.DOTALL)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Nav updated with dropdown!")
