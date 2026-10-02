#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador y Estandarizador de Visores 3D (PageFlip) para Menos Ruido.

Este script memoriza y aplica todos los requisitos finales aprobados:
1. Auto-ajuste dinamico de altura en portatiles para ver el libro 100% visible sin scroll.
2. Controles de zoom superior/inferior (−, 100%, +) con escala de 50% a 150%.
3. Barra inferior compacta para moviles:
   - Contador de paginas limpio (ej: "1 de 16", "2 - 3 de 16") sin la palabra "Pagina".
   - Boton de sonido solo con icono (🔇 / 🔊) sin texto redundante.
   - Boton de pantalla completa solo con icono (⛶) sin texto redundante.
4. Soporte para formato vertical (6x9 pulgadas) y formato horizontal/apaisado (cuadernos de espiral).
5. Efectos de sonido realistas sintetizados via Web Audio API (sin dependencias de archivos externos de audio).
6. Teclas de acceso rapido (Flechas, Inicio, Fin, F, M, +, -, Escape).
"""

import sys
import os
import re

# Plantilla HTML estandar para visores 3D
HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Hojear en 3D: {book_title} | Menos Ruido</title>
    <meta name="description" content="Hojea las páginas reales de {book_title} con una experiencia interactiva en 3D a alta resolución.">
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {{
            --bg-color: #121214;
            --surface-color: #1c1c20;
            --surface-border: #2e2e36;
            --text-main: #f0f0f4;
            --text-muted: #9a9aa8;
            --accent: #87553b;
            --accent-hover: #a36748;
            --shadow-book: 0 20px 50px rgba(0, 0, 0, 0.65), 0 5px 15px rgba(0, 0, 0, 0.4);
            --header-h: 56px;
            --toolbar-h: 60px;
        }}

        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-tap-highlight-color: transparent;
        }}

        body {{
            font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            user-select: none;
            -webkit-user-select: none;
        }}

        .viewer-header {{
            height: var(--header-h);
            background: rgba(28, 28, 32, 0.85);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-bottom: 1px solid var(--surface-border);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 1.25rem;
            z-index: 50;
            flex-shrink: 0;
        }}

        .brand-area {{
            display: flex;
            align-items: center;
            gap: 0.75rem;
            text-decoration: none;
            color: var(--text-main);
        }}

        .brand-area:hover .logo-text {{
            color: var(--accent-hover);
        }}

        .logo-text {{
            font-family: 'Cinzel', Georgia, serif;
            font-size: 1.05rem;
            font-weight: 600;
            letter-spacing: 0.5px;
            transition: color 0.2s;
        }}

        .badge-sample {{
            font-size: 0.65rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            background: rgba(135, 85, 59, 0.25);
            color: #d89f81;
            padding: 3px 8px;
            border-radius: 999px;
            border: 1px solid rgba(135, 85, 59, 0.4);
            font-weight: 600;
        }}

        .book-title-header {{
            font-size: 0.95rem;
            font-weight: 500;
            color: var(--text-main);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 45vw;
            text-align: center;
        }}

        .header-actions {{
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }}

        .btn-amazon-header {{
            background: var(--accent);
            color: #ffffff !important;
            padding: 0.45rem 0.9rem;
            border-radius: 6px;
            font-size: 0.8rem;
            font-weight: 600;
            text-decoration: none;
            transition: background 0.2s, transform 0.15s;
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
        }}

        .btn-amazon-header:hover {{
            background: var(--accent-hover);
            transform: translateY(-1px);
        }}

        .btn-close {{
            background: transparent;
            border: 1px solid var(--surface-border);
            color: var(--text-muted);
            width: 34px;
            height: 34px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
            text-decoration: none;
            font-size: 1.1rem;
        }}

        .btn-close:hover {{
            background: var(--surface-color);
            color: var(--text-main);
            border-color: #444;
        }}

        .viewer-stage {{
            flex: 1;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            padding: 1rem 0.5rem;
            background: radial-gradient(circle at center, #1e1e24 0%, #101013 100%);
        }}

        .flipbook-container {{
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s ease-out;
            transform-origin: center center;
        }}

        .page-wrapper {{
            background-color: #fff;
            overflow: hidden;
            box-shadow: 0 0 20px rgba(0,0,0,0.2);
        }}

        .page-content {{
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #ffffff;
            position: relative;
            overflow: hidden;
        }}

        .page-content img {{
            width: 100%;
            height: 100%;
            object-fit: fill;
            display: block;
            pointer-events: none;
        }}

        .page-corner-hint {{
            position: absolute;
            bottom: 0;
            right: 0;
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, transparent 50%, rgba(135, 85, 59, 0.4) 50%);
            pointer-events: none;
            opacity: 0.6;
        }}

        .page-cover-front {{
            border-radius: 2px 8px 8px 2px;
            overflow: hidden;
        }}

        .page-cover-back {{
            border-radius: 8px 2px 2px 8px;
            overflow: hidden;
        }}

        .viewer-toolbar {{
            height: var(--toolbar-h);
            background: rgba(24, 24, 28, 0.95);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-top: 1px solid var(--surface-border);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 1.25rem;
            padding: 0 1rem;
            z-index: 50;
            flex-shrink: 0;
        }}

        .nav-controls {{
            display: flex;
            align-items: center;
            gap: 0.4rem;
        }}

        .control-btn {{
            background: var(--surface-color);
            border: 1px solid var(--surface-border);
            color: var(--text-main);
            width: 38px;
            height: 38px;
            border-radius: 8px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.15s;
            font-size: 1rem;
        }}

        .control-btn:hover:not(:disabled) {{
            background: #2a2a32;
            border-color: #555562;
            transform: translateY(-1px);
        }}

        .control-btn:active:not(:disabled) {{
            transform: translateY(0);
        }}

        .control-btn:disabled {{
            opacity: 0.35;
            cursor: not-allowed;
        }}

        .page-counter {{
            font-size: 0.86rem;
            font-weight: 600;
            color: var(--text-muted);
            min-width: 95px;
            text-align: center;
            font-variant-numeric: tabular-nums;
            letter-spacing: 0.3px;
        }}

        .secondary-controls {{
            display: flex;
            align-items: center;
            gap: 0.5rem;
            border-left: 1px solid var(--surface-border);
            padding-left: 1rem;
        }}

        .zoom-controls {{
            display: flex;
            align-items: center;
            background: var(--surface-color);
            border: 1px solid var(--surface-border);
            border-radius: 8px;
            overflow: hidden;
        }}

        .zoom-btn {{
            background: transparent;
            border: none;
            color: var(--text-main);
            width: 30px;
            height: 32px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 1.05rem;
            font-weight: 600;
            transition: background 0.15s;
        }}

        .zoom-btn:hover {{
            background: rgba(255, 255, 255, 0.08);
        }}

        .zoom-level {{
            font-size: 0.76rem;
            font-weight: 600;
            color: var(--text-muted);
            min-width: 44px;
            text-align: center;
            font-variant-numeric: tabular-nums;
            cursor: pointer;
            user-select: none;
            padding: 0 2px;
        }}

        .zoom-level:hover {{
            color: var(--text-main);
        }}

        .sound-icon {{
            font-size: 1.15rem;
            line-height: 1;
        }}

        .btn-hint-floating {{
            position: absolute;
            top: 1rem;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(20, 20, 24, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #c0c0cc;
            font-size: 0.76rem;
            padding: 6px 14px;
            border-radius: 999px;
            pointer-events: none;
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            gap: 6px;
            animation: fadeInOut 5s forwards;
            z-index: 40;
        }}

        @keyframes fadeInOut {{
            0% {{ opacity: 0; transform: translate(-50%, -10px); }}
            15% {{ opacity: 1; transform: translate(-50%, 0); }}
            80% {{ opacity: 1; transform: translate(-50%, 0); }}
            100% {{ opacity: 0; transform: translate(-50%, -10px); pointer-events: none; }}
        }}

        @media (max-width: 768px) {{
            .book-title-header {{ display: none; }}
            .btn-hint-floating {{ display: none; }}
            .viewer-toolbar {{
                padding: 0.5rem 0.5rem;
                gap: 0.4rem;
                justify-content: space-between;
            }}
            .nav-controls {{ gap: 0.25rem; }}
            .control-btn {{
                width: 34px;
                height: 34px;
                font-size: 0.95rem;
            }}
            .page-counter {{
                min-width: 70px;
                font-size: 0.78rem;
                padding: 0 2px;
            }}
            .secondary-controls {{
                padding-left: 0.4rem;
                gap: 0.35rem;
            }}
            .zoom-btn {{
                width: 26px;
                height: 26px;
            }}
            .zoom-level {{
                min-width: 36px;
                font-size: 0.7rem;
            }}
        }}
    </style>
</head>
<body>

    <header class="viewer-header">
        <a href="{back_url}" class="brand-area" title="Volver a la página del cuaderno">
            <span class="logo-text">Menos Ruido</span>
            <span class="badge-sample">Muestra 3D</span>
        </a>

        <div class="book-title-header">{book_title}</div>

        <div class="header-actions">
            <a href="{amazon_url}" target="_blank" rel="noopener noreferrer" class="btn-amazon-header">
                <span>Comprar en Amazon</span>
                <span style="font-size: 0.85rem;">↗</span>
            </a>
            <a href="{back_url}" class="btn-close" aria-label="Cerrar visor" title="Cerrar visor (Esc)">✕</a>
        </div>
    </header>

    <main class="viewer-stage" id="viewer-stage">
        <div class="btn-hint-floating">
            <span>💡</span> Usa las flechas del teclado o arrastra las esquinas de las páginas para hojear
        </div>

        <div class="flipbook-container" id="flipbook-container">
            <div id="flipbook">
{pages_html}
            </div>
        </div>
    </main>

    <footer class="viewer-toolbar">
        <div class="nav-controls">
            <button id="btn-first" class="control-btn" aria-label="Primera página" title="Portada (Inicio)">⏮</button>
            <button id="btn-prev" class="control-btn" aria-label="Página anterior" title="Página anterior (←)">◀</button>
            <span id="page-counter" class="page-counter">1 de {total_pages}</span>
            <button id="btn-next" class="control-btn" aria-label="Página siguiente" title="Página siguiente (→)">▶</button>
            <button id="btn-last" class="control-btn" aria-label="Última página" title="Contraportada (Fin)">⏭</button>
        </div>

        <div class="secondary-controls">
            <div class="zoom-controls" title="Ajustar tamaño del libro">
                <button id="btn-zoom-out" class="zoom-btn" aria-label="Reducir tamaño" title="Reducir (−)">−</button>
                <span id="zoom-level" class="zoom-level" title="Restablecer tamaño (100%)">100%</span>
                <button id="btn-zoom-in" class="zoom-btn" aria-label="Aumentar tamaño" title="Aumentar (+)">+</button>
            </div>
            <button id="btn-sound-toggle" class="control-btn muted" aria-label="Activar o silenciar sonido de pasar página" title="Sonido de papel al hojear">
                <span class="sound-icon">🔇</span>
            </button>
            <button id="btn-fullscreen" class="control-btn" aria-label="Pantalla completa" title="Alternar pantalla completa">
                <span style="font-size: 1.1rem; line-height: 1;">⛶</span>
            </button>
        </div>
    </footer>

    <script type="module" src="/{js_bundle_path}"></script>
</body>
</html>
"""

# Plantilla JS estandar para visores 3D
JS_TEMPLATE = """import {{ PageFlip }} from 'page-flip';

document.addEventListener('DOMContentLoaded', () => {{
    const flipbookEl = document.getElementById('flipbook');
    const containerEl = document.getElementById('flipbook-container');
    const btnFirst = document.getElementById('btn-first');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnLast = document.getElementById('btn-last');
    const pageCounter = document.getElementById('page-counter');
    const btnFullscreen = document.getElementById('btn-fullscreen');
    const btnSoundToggle = document.getElementById('btn-sound-toggle');
    const soundIcon = btnSoundToggle ? btnSoundToggle.querySelector('.sound-icon') : null;
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');
    const zoomLevelEl = document.getElementById('zoom-level');

    if (!flipbookEl) return;

    // --- CONFIGURACION Y ESTADO DE ZOOM ---
    const ZOOM_STEPS = [0.5, 0.65, 0.8, 0.9, 1.0, 1.15, 1.3, 1.5];
    let currentZoomIdx = 4; // Por defecto 1.0 (100%)

    function updateZoomUI() {{
        const factor = ZOOM_STEPS[currentZoomIdx];
        if (containerEl) {{
            containerEl.style.transform = `scale(${{factor}})`;
        }}
        if (zoomLevelEl) {{
            zoomLevelEl.textContent = `${{Math.round(factor * 100)}}%`;
        }}
        if (btnZoomOut) btnZoomOut.disabled = (currentZoomIdx === 0);
        if (btnZoomIn) btnZoomIn.disabled = (currentZoomIdx === ZOOM_STEPS.length - 1);
    }}

    if (btnZoomIn) {{
        btnZoomIn.addEventListener('click', () => {{
            if (currentZoomIdx < ZOOM_STEPS.length - 1) {{
                currentZoomIdx++;
                updateZoomUI();
            }}
        }});
    }}

    if (btnZoomOut) {{
        btnZoomOut.addEventListener('click', () => {{
            if (currentZoomIdx > 0) {{
                currentZoomIdx--;
                updateZoomUI();
            }}
        }});
    }}

    if (zoomLevelEl) {{
        zoomLevelEl.addEventListener('click', () => {{
            currentZoomIdx = 4; // Reset to 100%
            updateZoomUI();
        }});
    }}

    updateZoomUI();

    // --- MOTOR DE SONIDO (Web Audio API) ---
    let soundEnabled = false;
    let audioCtx = null;

    function playPageFlipSound() {{
        if (!soundEnabled) return;
        try {{
            if (!audioCtx) {{
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                audioCtx = new AudioContextClass();
            }}
            if (audioCtx.state === 'suspended') {{
                audioCtx.resume();
            }}

            const now = audioCtx.currentTime;
            const bufferSize = audioCtx.sampleRate * 0.12;
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {{
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
            }}

            const noise = audioCtx.createBufferSource();
            noise.buffer = buffer;

            const filter = audioCtx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(800, now);
            filter.frequency.exponentialRampToValueAtTime(300, now + 0.12);
            filter.Q.value = 1.2;

            const gain = audioCtx.createGain();
            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(audioCtx.destination);

            noise.start(now);
        }} catch (err) {{
            console.warn('Audio feedback fallback:', err);
        }}
    }}

    if (btnSoundToggle) {{
        btnSoundToggle.addEventListener('click', () => {{
            soundEnabled = !soundEnabled;
            if (soundEnabled) {{
                btnSoundToggle.classList.remove('muted');
                if (soundIcon) soundIcon.textContent = '🔊';
                btnSoundToggle.setAttribute('title', 'Silenciar sonido');
                playPageFlipSound();
            }} else {{
                btnSoundToggle.classList.add('muted');
                if (soundIcon) soundIcon.textContent = '🔇';
                btnSoundToggle.setAttribute('title', 'Activar sonido de papel');
            }}
        }});
    }}

    // --- CALCULO DE DIMENSIONES DINAMICAS ({orientation}) ---
    {dimension_logic}

    const pageFlip = new PageFlip(flipbookEl, {{
        width: baseWidth,
        height: baseHeight,
        size: 'fixed',
        minWidth: minW,
        maxWidth: maxPageW,
        minHeight: minH,
        maxHeight: maxPageH,
        maxShadowOpacity: 0.5,
        showCover: true,
        useMouseEvents: true,
        swipeDistance: 30,
        showPageCorners: true,
        drawShadow: true,
        flippingTime: 700
    }});

    const pages = flipbookEl.querySelectorAll('.page-wrapper');
    pageFlip.loadFromHTML(pages);

    function updateCounter(pageIndex) {{
        const total = pageFlip.getPageCount();
        if (pageCounter) {{
            if (pageIndex === 0) {{
                pageCounter.textContent = `1 de ${{total}}`;
            }} else if (pageIndex >= total - 1) {{
                pageCounter.textContent = `${{total}} de ${{total}}`;
            }} else {{
                pageCounter.textContent = `${{pageIndex + 1}} - ${{pageIndex + 2}} de ${{total}}`;
            }}
        }}

        if (btnFirst) btnFirst.disabled = (pageIndex === 0);
        if (btnPrev) btnPrev.disabled = (pageIndex === 0);
        if (btnNext) btnNext.disabled = (pageIndex >= total - 1);
        if (btnLast) btnLast.disabled = (pageIndex >= total - 1);
    }}

    pageFlip.on('flip', (e) => {{
        playPageFlipSound();
        updateCounter(e.data);
    }});

    pageFlip.on('init', () => {{
        updateCounter(0);
    }});

    if (btnFirst) btnFirst.addEventListener('click', () => pageFlip.flip(0));
    if (btnPrev) btnPrev.addEventListener('click', () => pageFlip.flipPrev());
    if (btnNext) btnNext.addEventListener('click', () => pageFlip.flipNext());
    if (btnLast) btnLast.addEventListener('click', () => pageFlip.flip(pageFlip.getPageCount() - 1));

    if (btnFullscreen) {{
        btnFullscreen.addEventListener('click', () => {{
            if (!document.fullscreenElement) {{
                document.documentElement.requestFullscreen().catch(err => console.warn(err));
            }} else {{
                document.exitFullscreen().catch(err => console.warn(err));
            }}
        }});
    }}

    window.addEventListener('keydown', (e) => {{
        if (e.key === 'ArrowRight' || e.key === 'PageDown') {{
            e.preventDefault();
            pageFlip.flipNext();
        }} else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {{
            e.preventDefault();
            pageFlip.flipPrev();
        }} else if (e.key === 'Home') {{
            e.preventDefault();
            pageFlip.flip(0);
        }} else if (e.key === 'End') {{
            e.preventDefault();
            pageFlip.flip(pageFlip.getPageCount() - 1);
        }} else if (e.key.toLowerCase() === 'f') {{
            if (!document.fullscreenElement) {{
                document.documentElement.requestFullscreen().catch(err => console.warn(err));
            }} else {{
                document.exitFullscreen().catch(err => console.warn(err));
            }}
        }} else if (e.key.toLowerCase() === 'm' && btnSoundToggle) {{
            btnSoundToggle.click();
        }} else if (e.key === '+' || e.key === '=') {{
            if (btnZoomIn) btnZoomIn.click();
        }} else if (e.key === '-' || e.key === '_') {{
            if (btnZoomOut) btnZoomOut.click();
        }}
    }});
}});
"""

PORTRAIT_DIMENSIONS = """
    // Vertical (6x9 pulgadas):
    const availH = Math.max(380, window.innerHeight - 130);
    const maxPageH = Math.min(680, Math.round(availH * 0.96));
    const maxPageW = Math.round(maxPageH * (440 / 660));
    const baseWidth = 440;
    const baseHeight = 660;
    const minW = 200;
    const minH = 300;
"""

LANDSCAPE_DIMENSIONS = """
    // Apaisado / Horizontal:
    const availH = Math.max(340, window.innerHeight - 130);
    const maxPageH = Math.min(520, Math.round(availH * 0.95));
    const maxPageW = Math.round(maxPageH * (550 / 400));
    const baseWidth = 550;
    const baseHeight = 400;
    const minW = 260;
    const minH = 200;
"""

def generate_pages_html(image_urls):
    """
    Genera el HTML de las páginas con las clases correspondientes para portada,
    páginas interiores y contraportada.
    """
    total = len(image_urls)
    lines = []
    for idx, url in enumerate(image_urls):
        if idx == 0:
            wrapper_cls = "page-wrapper page-cover-front"
            density = 'data-density="hard"'
            hint = '<div class="page-corner-hint"></div>'
        elif idx == total - 1:
            wrapper_cls = "page-wrapper page-cover-back"
            density = 'data-density="hard"'
            hint = ''
        else:
            wrapper_cls = "page-wrapper"
            density = 'data-density="soft"'
            hint = ''
        
        lines.append(f"""                <div class="{wrapper_cls}" {density}>
                    <div class="page-content">
                        <img src="{url}" alt="Página {idx + 1}" loading="lazy">
                        {hint}
                    </div>
                </div>""")
    return "\n".join(lines)


def build_viewer(book_title, slug, back_url, amazon_url, image_urls, orientation="portrait", js_name=None):
    """
    Genera los ficheros HTML y JS del visor 3D garantizando todos los estándares de diseño.
    """
    total_pages = len(image_urls)
    pages_html = generate_pages_html(image_urls)
    js_filename = js_name if js_name else f"visor-{slug}.js"
    
    dim_logic = PORTRAIT_DIMENSIONS if orientation == "portrait" else LANDSCAPE_DIMENSIONS
    
    html_content = HTML_TEMPLATE.format(
        book_title=book_title,
        back_url=back_url,
        amazon_url=amazon_url,
        total_pages=total_pages,
        pages_html=pages_html,
        js_bundle_path=js_filename
    )
    
    js_content = JS_TEMPLATE.format(
        orientation=orientation,
        dimension_logic=dim_logic
    )
    
    return html_content, js_content


if __name__ == "__main__":
    print("Script estandarizador de visores 3D cargado correctamente.")
    print("Usar build_viewer(book_title, slug, back_url, amazon_url, image_urls, orientation) para instanciar.")
