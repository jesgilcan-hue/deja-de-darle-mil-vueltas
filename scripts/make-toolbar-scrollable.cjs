const fs = require('fs');

const files = [
    "c:/Users/IA/Documents/Antigravity/MENOS RUIDO/web/web-menos-ruido/visor-afirmaciones-diarias.html",
    "c:/Users/IA/Documents/Antigravity/MENOS RUIDO/web/web-menos-ruido/visor-3d-cuaderno-afirmaciones.html",
    "C:/Users/IA/Documents/Antigravity/MENOS RUIDO/Afirmaciones diarias/output/3D-Completo/index.html"
];

for (const f of files) {
    if (!fs.existsSync(f)) continue;
    let html = fs.readFileSync(f, 'utf-8');

    // Update .toolbar CSS
    const oldToolbar = `.toolbar {
            position: absolute;
            bottom: 28px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10;
            display: flex;
            gap: 8px;
            background: rgba(20, 20, 20, 0.88);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            padding: 6px 10px;
            border-radius: 40px;
            border: 1px solid rgba(255, 255, 255, 0.14);
            box-shadow: 0 12px 35px rgba(0, 0, 0, 0.7);
        }`;

    const newToolbar = `.toolbar {
            position: absolute;
            bottom: 28px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10;
            display: flex;
            gap: 8px;
            background: rgba(20, 20, 20, 0.88);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            padding: 6px 10px;
            border-radius: 40px;
            border: 1px solid rgba(255, 255, 255, 0.14);
            box-shadow: 0 12px 35px rgba(0, 0, 0, 0.7);
            max-width: calc(100vw - 32px);
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            -ms-overflow-style: none;
        }
        .toolbar::-webkit-scrollbar {
            display: none;
        }`;

    html = html.replace(oldToolbar, newToolbar);

    // Ensure .btn has flex-shrink: 0
    html = html.replace(
        `white-space: nowrap;\n        }`,
        `white-space: nowrap;\n            flex-shrink: 0;\n        }`
    );

    // Media query updates for toolbar
    const oldMedia = `@media (max-width: 768px) {
            .kbd-hint, .tool-divider:nth-of-type(2) {
                display: none;
            }
            .modal-book-subtitle {
                display: none;
            }
        }`;

    const newMedia = `@media (max-width: 768px) {
            .kbd-hint, .tool-divider:nth-of-type(2) {
                display: none;
            }
            .modal-book-subtitle {
                display: none;
            }
            .toolbar {
                bottom: 14px;
                left: 50%;
                transform: translateX(-50%);
                max-width: calc(100vw - 20px);
                box-sizing: border-box;
                padding: 6px 8px;
                gap: 6px;
                border-radius: 30px;
            }
            .btn {
                padding: 7px 12px;
                font-size: 11px;
            }
            .btn-open-book {
                padding: 7px 14px !important;
                font-size: 11px !important;
            }
            .hint {
                bottom: 64px;
                font-size: 11px;
                width: 90%;
                text-align: center;
                white-space: normal;
            }
            .specs {
                display: none;
            }
            .header {
                top: 14px;
                left: 14px;
            }
            .title {
                font-size: 16px;
            }
            .theme-toggle {
                top: 14px;
                right: 14px;
            }
        }`;

    html = html.replace(oldMedia, newMedia);

    fs.writeFileSync(f, html, 'utf-8');
    console.log(`Updated mobile scrollable toolbar in: ${f}`);
}
