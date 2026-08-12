import os
import re

base_dir = r"C:\Users\IA\Documents\Antigravity\MENOS RUIDO\web\web-menos-ruido"

# Update index.html
index_path = os.path.join(base_dir, "index.html")
with open(index_path, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('<img src="/illustration.jpg" alt="Mente enredada"', '<img src="/favicon.svg" alt="Menos Ruido Logo"')
with open(index_path, 'w', encoding='utf-8') as f:
    f.write(content)

# Update planificador-90-dias.html
p90_path = os.path.join(base_dir, "planificador-90-dias.html")
with open(p90_path, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('src="/illustration.jpg" alt="Mente enredada" class="illustration"', 'src="/contraportada_90.jpg" alt="Contraportada 90 días" class="illustration" style="max-width: 100%; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);"')
with open(p90_path, 'w', encoding='utf-8') as f:
    f.write(content)

# Update planificador-180-dias.html
p180_path = os.path.join(base_dir, "planificador-180-dias.html")
with open(p180_path, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('src="/illustration.jpg" alt="Mente enredada" class="illustration"', 'src="/contraportada_180.jpg" alt="Contraportada 180 días" class="illustration" style="max-width: 100%; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);"')
with open(p180_path, 'w', encoding='utf-8') as f:
    f.write(content)

# Update main.js
js_path = os.path.join(base_dir, "main.js")
with open(js_path, 'a', encoding='utf-8') as f:
    f.write("""

// --- Generic Lightbox ---
const lightbox = document.createElement('div');
lightbox.id = 'generic-lightbox';
lightbox.className = 'lightbox';
lightbox.innerHTML = '<img src="" alt="Ampliada" />';
document.body.appendChild(lightbox);

lightbox.addEventListener('click', () => {
    lightbox.classList.remove('show');
});

// Make all non-linked images zoomable
const allImages = document.querySelectorAll('img:not(a img)');
allImages.forEach(img => {
    // Skip favicon/logos and tiny images
    if(img.src.includes('favicon')) return;
    
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', (e) => {
        // Try to avoid conflicts with existing manual lightboxes
        if (img.getAttribute('onclick') && img.getAttribute('onclick').includes('lightbox')) {
            return;
        }
        e.stopPropagation();
        const lightboxImg = lightbox.querySelector('img');
        lightboxImg.src = img.src;
        lightbox.classList.add('show');
    });
});
""")

print("Images and lightbox JS updated successfully!")
