import os
import re

html_90 = """
    <main>
        <section class="hero">
            <div class="container hero-content">
                <div class="hero-text">
                    <span class="badge">Nuevo Lanzamiento</span>
                    <h1 class="fade-in-up">Planificador de<br/><span class="highlight">90 Días</span></h1>
                    <p class="subtitle fade-in-up delay-1">Un método compasivo para organizar tu trimestre eligiendo una sola prioridad al día y avanzando sin quemarte.</p>
                </div>
                <div class="hero-image fade-in delay-3">
                    <img src="./cover_90.jpg" class="cover-zoom" alt="Portada del Planificador 90 Días" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: -10px 10px 30px rgba(0,0,0,0.15);" />
                </div>
            </div>
            <div class="bg-shape"></div>
        </section>

        <section id="problema" class="section split-section">
            <div class="container">
                <div class="split-content">
                    <div class="text-content">
                        <h2>Recupera el control de tu trimestre</h2>
                        <p>¿Sientes que tus listas de tareas son infinitas y que el día se te escapa entre urgencias y pantallas? Es hora de pensar en papel y recuperar el control.</p>
                        <p>Te presentamos el Planificador de 90 Días de Menos Ruido, un método físico, práctico y compasivo diseñado para ayudarte a definir tus prioridades trimestrales, organizar tus jornadas sin quemarte y separar la señal del ruido diario.</p>
                        <p>A diferencia de las agendas convencionales, este planificador no te pide rellenar cada hora con tareas. Te obliga a elegir una sola prioridad al día y proteger tu descanso.</p>
                    </div>
                    <div class="image-content">
                        <img src="./illustration.jpg" alt="Mente enredada" class="illustration" />
                    </div>
                </div>
            </div>
        </section>

        <section class="section" style="background-color: var(--color-bg);">
            <div class="container">
                <div class="section-header">
                    <h2>Productividad Tranquila</h2>
                    <p>Su horizonte de 90 días (13 semanas) es el punto dulce de la planificación.</p>
                </div>
                <div class="features-grid">
                    <div class="feature-card">
                        <h3>Una prioridad diaria</h3>
                        <p>Fuerza tu enfoque eligiendo lo más importante antes de dejar que las urgencias del día te arrastren.</p>
                    </div>
                    <div class="feature-card">
                        <h3>Descanso protegido</h3>
                        <p>El descanso no es el premio, es el requisito. Registra y asegura tus horas de sueño y pausas analógicas.</p>
                    </div>
                    <div class="feature-card">
                        <h3>Registro de ruido</h3>
                        <p>Una sección diaria para volcar esos pensamientos o distracciones y no dejarlos en tu cabeza.</p>
                    </div>
                </div>
            </div>
        </section>

        <section id="comparativa" class="section">
            <div class="container">
                <div class="section-header">
                    <h2>90 Días vs 180 Días</h2>
                    <p>¿Cuál es el mejor planificador para ti?</p>
                </div>
                <div style="display: flex; gap: 2rem; margin-top: 2rem; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 300px; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 2px solid var(--color-accent);">
                        <h3 style="margin-top: 0;">Planificador de 90 Días</h3>
                        <p><strong>Ideal para:</strong> Proyectos a corto plazo, sprints de trabajo intensos o si estás probando este sistema por primera vez.</p>
                        <ul style="padding-left: 1rem; color: var(--color-text);">
                            <li>13 semanas de planificación</li>
                            <li>Más ligero y manejable para llevar a cualquier parte</li>
                            <li>Sentimiento de logro rápido al completarlo</li>
                        </ul>
                    </div>
                    <div style="flex: 1; min-width: 300px; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                        <h3 style="margin-top: 0;">Planificador de 180 Días</h3>
                        <p><strong>Ideal para:</strong> Hábitos de largo recorrido, planificación semestral o personas que prefieren mantener su historial todo el año en 2 volúmenes.</p>
                        <ul style="padding-left: 1rem; color: var(--color-text);">
                            <li>26 semanas de planificación</li>
                            <li>Mayor espacio para retrospectivas trimestrales</li>
                            <li>Menos necesidad de cambiar de cuaderno</li>
                        </ul>
                        <div style="margin-top: 1.5rem;">
                            <a href="./planificador-180-dias.html" style="color: var(--color-primary); text-decoration: underline;">Ver Planificador 180 Días &rarr;</a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </main>
"""

html_180 = html_90.replace("Planificador de<br/><span class=\"highlight\">90 Días</span>", "Planificador de<br/><span class=\"highlight\">180 Días</span>")
html_180 = html_180.replace("cover_90.jpg", "cover_180.jpg")
html_180 = html_180.replace("Planificador de 90 Días de Menos Ruido", "Planificador de 180 Días de Menos Ruido")
html_180 = html_180.replace("Su horizonte de 90 días (13 semanas)", "Su horizonte de 180 días (26 semanas)")
# Swap the highlighting for the comparison box
html_180 = html_180.replace("border: 2px solid var(--color-accent);", "")
html_180 = html_180.replace("box-shadow: 0 4px 15px rgba(0,0,0,0.05);\">", "box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 2px solid var(--color-accent);\">")
html_180 = html_180.replace("<a href=\"./planificador-180-dias.html\" style=\"color: var(--color-primary); text-decoration: underline;\">Ver Planificador 180 Días &rarr;</a>", "<a href=\"./planificador-90-dias.html\" style=\"color: var(--color-primary); text-decoration: underline;\">&larr; Ver Planificador 90 Días</a>")


def update_html(filename, new_main):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace everything between <main> and </main>
    pattern = re.compile(r'<main>.*?</main>', re.DOTALL)
    new_content = pattern.sub(new_main.strip(), content)
    
    # Update title
    if "90" in filename:
        new_content = re.sub(r'<title>.*?</title>', '<title>Planificador 90 Días | Menos Ruido</title>', new_content)
    else:
        new_content = re.sub(r'<title>.*?</title>', '<title>Planificador 180 Días | Menos Ruido</title>', new_content)

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(new_content)

update_html(r"C:\Users\IA\Documents\Antigravity\MENOS RUIDO\web\web-menos-ruido\planificador-90-dias.html", html_90)
update_html(r"C:\Users\IA\Documents\Antigravity\MENOS RUIDO\web\web-menos-ruido\planificador-180-dias.html", html_180)

print("Pages updated successfully!")
