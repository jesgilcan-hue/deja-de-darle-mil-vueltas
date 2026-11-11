const fs = require('fs');

const files = [
    "c:/Users/IA/Documents/Antigravity/MENOS RUIDO/web/web-menos-ruido/visor-afirmaciones-diarias.html",
    "c:/Users/IA/Documents/Antigravity/MENOS RUIDO/web/web-menos-ruido/visor-3d-cuaderno-afirmaciones.html",
    "C:/Users/IA/Documents/Antigravity/MENOS RUIDO/Afirmaciones diarias/output/3D-Completo/index.html"
];

for (const f of files) {
    if (!fs.existsSync(f)) continue;
    let html = fs.readFileSync(f, 'utf-8');

    // Add scroll properties to .toolbar
    if (!html.includes('overflow-x: auto')) {
        html = html.replace('.toolbar {', `.toolbar {
            max-width: calc(100vw - 32px);
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            -ms-overflow-style: none;`);
        
        // Hide scrollbar
        html = html.replace('.toolbar {', `.toolbar::-webkit-scrollbar { display: none; }\n        .toolbar {`);
    }

    // Ensure .btn doesn't shrink
    if (!html.includes('flex-shrink: 0')) {
        html = html.replace('white-space: nowrap;', 'white-space: nowrap;\n            flex-shrink: 0;');
    }

    // Media query mobile enhancements
    const mobileCss = `
        @media (max-width: 768px) {
            .toolbar {
                bottom: 14px !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
                max-width: calc(100vw - 20px) !important;
                width: max-content !important;
                box-sizing: border-box !important;
                padding: 6px 8px !important;
                gap: 6px !important;
                border-radius: 30px !important;
            }
            .btn {
                padding: 7px 12px !important;
                font-size: 11px !important;
            }
            .btn-open-book {
                padding: 7px 14px !important;
                font-size: 11px !important;
            }
            .hint {
                bottom: 64px !important;
                font-size: 11px !important;
                width: 90% !important;
                text-align: center !important;
                white-space: normal !important;
            }
            .specs {
                display: none !important;
            }
            .header {
                top: 14px !important;
                left: 14px !important;
            }
            .title {
                font-size: 16px !important;
            }
            .theme-toggle {
                top: 14px !important;
                right: 14px !important;
            }
        }`;

    if (!html.includes('.toolbar {') || html.includes('bottom: 14px !important;')) {
        // already added
    } else {
        html = html.replace('</style>', `${mobileCss}\n    </style>`);
    }

    fs.writeFileSync(f, html, 'utf-8');
    console.log("Successfully patched:", f);
}
