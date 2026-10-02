# Estándar Editorial y Técnico: Visores 3D de Páginas Reales (Menos Ruido)

Este documento define la arquitectura y especificaciones obligatorias para la creación y mantenimiento de visores 3D interactivos (`PageFlip`) en la web de Editorial Menos Ruido. Cualquier nuevo visor que se cree en el futuro debe construirse siguiendo este estándar sin variaciones para mantener una experiencia uniforme y optimizada.

---

## 1. Experiencia de Usuario y Especificaciones Visuales

### 1.1 Altura y Auto-ajuste en Portátiles (100% visible sin scroll)
- En pantallas de escritorio y portátiles al 100% de zoom de navegador, el libro **debe verse completo de arriba a abajo** sin obligar al usuario a hacer scroll vertical.
- Para ello, la altura máxima (`maxPageH`) se calcula dinámicamente restando el espacio ocupado por la cabecera y la barra inferior:
  - Espacio útil vertical: `const availH = Math.max(380, window.innerHeight - 130);`
  - Libros verticales (6×9"): `maxPageH = Math.min(680, Math.round(availH * 0.96)); maxPageW = Math.round(maxPageH * (440 / 660));`
  - Cuadernos apaisados (landscape): `maxPageH = Math.min(520, Math.round(availH * 0.95)); maxPageW = Math.round(maxPageH * (550 / 400));`

### 1.2 Controles de Zoom Integrados
- En la barra de herramientas inferior se incluye un control de zoom (`−`, `100%`, `+`):
  - Pasos de zoom: `[0.5, 0.65, 0.8, 0.9, 1.0, 1.15, 1.3, 1.5]` (50% a 150%).
  - Valor inicial por defecto: `1.0` (100%).
  - Al hacer clic en el porcentaje central `100%`, el zoom se restablece a escala original.
  - Atajos de teclado: `+` o `=` para acercar, `-` o `_` para alejar.

### 1.3 Barra Inferior Compacta para Móvil
- **Contador de páginas limpio**: Muestra únicamente los números (ej. `1 de 16`, `2 - 3 de 16`, `16 de 16`). **Nunca incluir la palabra "Página"** para evitar desbordar los controles táctiles en pantallas móviles estrechas.
- **Botón de sonido solo con icono**: Muestra únicamente `🔇` o `🔊` sin etiquetas de texto. Sonido sintetizado en tiempo real con Web Audio API (efecto de roce de papel orgánico).
- **Botón de pantalla completa solo con icono**: Muestra únicamente `⛶` sin etiquetas de texto.
- En móvil (`@media (max-width: 768px)`):
  - La barra se distribuye con `justify-content: space-between`.
  - Tamaño de botones táctiles: `34px x 34px`.
  - Ocultar título superior para ganar espacio vertical.

---

## 2. Generador Automatizado

Para generar un nuevo visor sin iteraciones manuales, se utiliza el script:
```bash
python crear_visor_3d.py
```
O importando `build_viewer` desde Python:
```python
from crear_visor_3d import build_viewer

html_code, js_code = build_viewer(
    book_title="Título del Libro",
    slug="slug-del-libro",
    back_url="/slug-del-libro.html",
    amazon_url="https://www.amazon.es/dp/...",
    image_urls=[f"/images/visor-slug/page-{i:02d}.webp" for i in range(1, 17)],
    orientation="portrait" # o "landscape"
)
```

---

## 3. Registro en Vite
Cada nuevo visor debe agregarse al bloque `rollupOptions.input` en `vite.config.js`:
```javascript
visorNuevo: resolve(__dirname, 'visor-nuevo-libro.html'),
```
Y compilar con `npm run build` para validar que todo empaqueta correctamente antes de desplegar.
