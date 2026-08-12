import re

files = [
    r"C:\Users\IA\Documents\Antigravity\MENOS RUIDO\web\web-menos-ruido\planificador-90-dias.html",
    r"C:\Users\IA\Documents\Antigravity\MENOS RUIDO\web\web-menos-ruido\planificador-180-dias.html"
]

# New HTML for the interior section with TWO images
new_interior_html = """
        <section class="section">
            <div class="container">
                <div class="section-header">
                    <h2>Interior del Planificador</h2>
                    <p>Un diseño pensado para acompañarte, no para agobiarte.</p>
                </div>
                <div style="display: flex; gap: 2rem; margin-top: 2rem; flex-wrap: wrap; justify-content: center;">
                    <div style="flex: 1; min-width: 300px; text-align: center;">
                        <img src="/interior_planificador_mockup.jpg" alt="Interior del planificador vista 1" style="max-width: 100%; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);" />
                    </div>
                    <div style="flex: 1; min-width: 300px; text-align: center;">
                        <img src="/interior_180d_pag_37_38.jpg" alt="Interior del planificador vista 2" style="max-width: 100%; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);" />
                    </div>
                </div>
            </div>
        </section>
"""

# Regex to find the existing interior section and replace it
# We know it starts with <section class="section"> ... <h2>Interior del Planificador</h2> ... </section>
pattern = re.compile(r'<section class="section">\s*<div class="container">\s*<div class="section-header">\s*<h2>Interior del Planificador</h2>.*?</section>', re.DOTALL)

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = pattern.sub(new_interior_html.strip(), content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Mockups updated to show both images!")
