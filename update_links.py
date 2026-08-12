import os

def update_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

base_dir = r"C:\Users\IA\Documents\Antigravity\MENOS RUIDO\web\web-menos-ruido"

# 1. Update planificador-90-dias.html
cta_90 = """
        <section class="section" style="text-align: center; background-color: var(--color-bg); margin-top: 4rem;">
            <div class="container">
                <h2>¿Listo para enfocar tu trimestre?</h2>
                <p style="margin-bottom: 2rem;">Recupera tu tiempo eligiendo una prioridad al día.</p>
                <a href="https://link.amazon/B0dImN3ac" target="_blank" rel="noopener noreferrer" class="btn-primary" style="font-size: 1.2rem; padding: 1rem 3rem;">Comprar en Amazon</a>
            </div>
        </section>
    </main>
"""
update_file(os.path.join(base_dir, "planificador-90-dias.html"), [
    ('href="https://link.amazon/B09WcSwcz" target="_blank" rel="noopener noreferrer" class="btn-secondary">Comprar</a>', 
     'href="https://link.amazon/B0dImN3ac" target="_blank" rel="noopener noreferrer" class="btn-secondary">Comprar</a>'),
    ('</main>', cta_90)
])

# 2. Update planificador-180-dias.html
cta_180 = """
        <section class="section" style="text-align: center; background-color: var(--color-bg); margin-top: 4rem;">
            <div class="container">
                <h2>¿Listo para organizar tu semestre?</h2>
                <p style="margin-bottom: 2rem;">Mantén el rumbo a largo plazo sin abrumarte.</p>
                <a href="https://link.amazon/B0doI8Yaj" target="_blank" rel="noopener noreferrer" class="btn-primary" style="font-size: 1.2rem; padding: 1rem 3rem;">Comprar en Amazon</a>
            </div>
        </section>
    </main>
"""
update_file(os.path.join(base_dir, "planificador-180-dias.html"), [
    ('href="https://link.amazon/B09WcSwcz" target="_blank" rel="noopener noreferrer" class="btn-secondary">Comprar</a>', 
     'href="https://link.amazon/B0doI8Yaj" target="_blank" rel="noopener noreferrer" class="btn-secondary">Comprar</a>'),
    ('</main>', cta_180)
])

# 3. Update index.html to add author link in 'quienes somos'
author_link_html = """
                        <p>Nuestra misión es simple: crear herramientas físicas que te ayuden a pensar mejor, planificar con intención y, en definitiva, vivir con menos ruido.</p>
                        <p style="margin-top: 2rem;">
                            <a href="https://link.amazon/B01r9meh3" target="_blank" rel="noopener noreferrer" class="btn-secondary" style="display: inline-block;">Ver perfil de Autor en Amazon</a>
                        </p>
"""
update_file(os.path.join(base_dir, "index.html"), [
    ('<p>Nuestra misión es simple: crear herramientas físicas que te ayuden a pensar mejor, planificar con intención y, en definitiva, vivir con menos ruido.</p>', author_link_html)
])

print("Links and CTAs updated successfully!")
