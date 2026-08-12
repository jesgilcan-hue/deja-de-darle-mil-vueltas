import re

files = [
    r"C:\Users\IA\Documents\Antigravity\MENOS RUIDO\web\web-menos-ruido\index.html",
    r"C:\Users\IA\Documents\Antigravity\MENOS RUIDO\web\web-menos-ruido\deja-de-darle-mil-vueltas.html",
    r"C:\Users\IA\Documents\Antigravity\MENOS RUIDO\web\web-menos-ruido\planificador-90-dias.html",
    r"C:\Users\IA\Documents\Antigravity\MENOS RUIDO\web\web-menos-ruido\planificador-180-dias.html"
]

header_html = """
    <header class="navbar">
        <div class="container nav-content">
            <a href="/" class="logo" style="text-decoration: none; color: inherit;">Menos Ruido</a>
            <nav>
                <a href="/">Home</a>
                <a href="/#libros">Libros</a>
                <a href="/#quienes-somos">Quiénes Somos</a>
                <a href="mailto:hola.menosruido@gmail.com">Contacto</a>
            </nav>
            <a href="https://link.amazon/B09WcSwcz" target="_blank" rel="noopener noreferrer" class="btn-secondary">Comprar</a>
        </div>
    </header>
"""

# HTML for the interior sections
interior_html_90 = """
        <section class="section">
            <div class="container">
                <div class="section-header">
                    <h2>Interior del Planificador</h2>
                    <p>Un diseño pensado para acompañarte, no para agobiarte.</p>
                </div>
                <div style="text-align: center; margin-top: 2rem;">
                    <img src="/interior_planificador_mockup.jpg" alt="Interior del planificador 90 días" style="max-width: 100%; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);" />
                </div>
            </div>
        </section>
"""

interior_html_180 = interior_html_90.replace("interior_planificador_mockup.jpg", "interior_180d_pag_37_38.jpg").replace("90", "180")

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace header
    content = re.sub(r'<header class="navbar">.*?</header>', header_html.strip(), content, flags=re.DOTALL)
    
    # Fix image paths
    content = content.replace('./public/cover_deja.jpg', '/cover_deja.jpg')
    content = content.replace('./public/cover_90.jpg', '/cover_90.jpg')
    content = content.replace('./public/cover_180.jpg', '/cover_180.jpg')
    content = content.replace('./public/illustration.jpg', '/illustration.jpg')
    content = content.replace('./cover_90.jpg', '/cover_90.jpg')
    content = content.replace('./cover_180.jpg', '/cover_180.jpg')
    content = content.replace('./illustration.jpg', '/illustration.jpg')
    content = content.replace('./cover.png', '/cover_deja.jpg')
    content = content.replace('./interior-paso-10.jpg', '/interior-paso-10.jpg')
    
    # Inject interior HTML before the comparison section if it's a planner
    if "90" in filepath:
        if "Interior del Planificador" not in content:
            content = content.replace('<section id="comparativa"', interior_html_90 + '\n        <section id="comparativa"')
    elif "180" in filepath:
        if "Interior del Planificador" not in content:
            content = content.replace('<section id="comparativa"', interior_html_180 + '\n        <section id="comparativa"')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Headers, paths and mockups fixed!")
