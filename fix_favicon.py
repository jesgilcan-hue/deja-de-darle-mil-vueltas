import os
import re

base_dir = r"C:\Users\IA\Documents\Antigravity\MENOS RUIDO\web\web-menos-ruido"

files = [
    "index.html",
    "deja-de-darle-mil-vueltas.html",
    "planificador-90-dias.html",
    "planificador-180-dias.html"
]

for filename in files:
    filepath = os.path.join(base_dir, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace <link rel="icon"...> with the correct one
    # We might have different formats
    content = re.sub(r'<link rel="icon" type="image/svg\+xml" href=".*?favicon\.svg" />', '<link rel="icon" type="image/png" href="/favicon.png" />', content)
    content = re.sub(r'<link rel="icon" type="image/png" href="\./favicon\.png" />', '<link rel="icon" type="image/png" href="/favicon.png" />', content)
    
    # Update the img src in the body
    content = content.replace('src="/favicon.svg"', 'src="/favicon.png"')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Favicon replaced everywhere!")
