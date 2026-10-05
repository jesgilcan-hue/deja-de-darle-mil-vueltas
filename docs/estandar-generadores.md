# Estándar Oficial de Generadores Editoriales · Menos Ruido

Este documento establece el **patrón maestro y blueprint técnico** validado en los generadores **Diario** y **Semanal**, el cual debe aplicarse rigurosamente a los nuevos desarrollos (**Planificador Mensual**, **Planificador Anual** y futuras herramientas).

---

## 1. Reglas de Nomenclatura de Archivos PDF al Guardar

El nombre del archivo generado nunca debe contener nombres genéricos de PC ni prefijos residuales:

| Tipo de Generador | Descarga Personalizada (con datos) | Descarga en Blanco (para escribir a mano) |
| :--- | :--- | :--- |
| **Planificador Diario** | `Menos_Ruido_Planificador_Diario_${dia}_${fecha}.pdf`<br>*(Ej: `Menos_Ruido_Planificador_Diario_Martes_06_10_2026.pdf`)*<br>*Si no hay día/fecha: `Menos_Ruido_Planificador_Diario.pdf`* | `Menos_Ruido_Plantilla_Diaria.pdf`<br>*(Si varias páginas: `Menos_Ruido_Plantilla_Diaria_7_dias.pdf`)* |
| **Planificador Semanal** | `Menos_Ruido_Planificador_Semanal_${semana}.pdf`<br>*(Ej: `Menos_Ruido_Planificador_Semanal_48.pdf`)*<br>*Si no hay semana: `Menos_Ruido_Planificador_Semanal.pdf`* | `Menos_Ruido_Plantilla_Semanal.pdf`<br>*(Si varias páginas: `Menos_Ruido_Plantilla_Semanal_4_semanas.pdf`)* |
| **Planificador Mensual** | `Menos_Ruido_Planificador_Mensual_${mes}.pdf`<br>*(Ej: `Menos_Ruido_Planificador_Mensual_Noviembre.pdf`)*<br>*Si no hay mes: `Menos_Ruido_Planificador_Mensual.pdf`* | `Menos_Ruido_Plantilla_Mensual.pdf`<br>*(Si varias páginas: `Menos_Ruido_Plantilla_Mensual_3_meses.pdf`)* |
| **Planificador Anual** | `Menos_Ruido_Planificador_Anual_${anio}.pdf`<br>*(Ej: `Menos_Ruido_Planificador_Anual_2027.pdf`)*<br>*Si no hay año: `Menos_Ruido_Planificador_Anual.pdf`* | `Menos_Ruido_Plantilla_Anual.pdf` |

---

## 2. Acceso y Seguridad con PIN (`1 1 1 1`)

- **Persistencia:** Guardar siempre en `localStorage.setItem('mr_apps_unlocked', '1')` y `sessionStorage.setItem('mr_apps_unlocked', '1')`.
- **Guardia en `<head>`:**
```html
<script>
    if (localStorage.getItem('mr_apps_unlocked') !== '1' && sessionStorage.getItem('mr_apps_unlocked') !== '1') {
        window.location.replace('/apps.html?return=' + encodeURIComponent(window.location.pathname));
    }
</script>
```
- **Sin bucles:** Una vez introducido el PIN en cualquier pestaña, el usuario queda permanentemente autenticado en su navegador hasta que pulse voluntariamente "Bloquear / Salir".

---

## 3. Disposición UX: Formulario Centrado y Vista Previa Oculta por Defecto

1. **Estado Inicial:**
   - La página arranca con la clase `preview-hidden`.
   - El panel de control/formulario de escritura queda **completamente centrado en la pantalla**.
2. **Botón de Activación:**
   - Botón superior e inferior: `👁️‍🗨️ Ver previa` y `Vista previa: Oculta (Clic para ver)`.
   - Al pulsar, despliega la columna de vista previa a la derecha en escritorio y actualiza el botón a `Vista previa: Activada`.
3. **Barra Superior de la Vista Previa:**
   - Caja redondeada homogénea:
```css
.preview-banner, .preview-header-bar {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #f1ede5;
    border: 1px solid #e1dcce;
    padding: 8px 14px;
    border-radius: 8px;
    margin-bottom: 12px;
    font-size: 0.8rem;
    color: #665f54;
    box-sizing: border-box;
}
```
   - Contenido textual estricto: `<span>👁️ <strong>Vista previa</strong></span>`.

---

## 4. Comportamiento de «Rellenar ejemplo» y «Limpiar»

- **Rellenar ejemplo:**
  - Los campos del formulario (`<textarea>`, `<input>`) se mantienen **completamente limpios y vacíos**. El usuario nunca tiene que borrar texto de muestra antes de escribir lo suyo.
  - La **vista previa** se despliega automáticamente y muestra los datos del objeto de ejemplo (`MONTHLY_EXAMPLE`, etc.).
  - En cuanto el usuario pulsa una tecla en cualquier campo, su texto toma el control inmediato en tiempo real de esa sección.
- **Limpiar:**
  - Vacía todos los campos (`value = ''`).
  - Resetea la altura de los textareas (`style.height = ''`).
  - La vista previa vuelve al estado de **plantilla en blanco sin textos residuales**.

---

## 5. Cajas de Entrada con Auto-crecimiento, Scrollbar y Redimensión Manual

Todos los cajones de texto multilínea (objetivos, prioridades, notas, etc.) deben ser `<textarea>` y contar con:
1. **Auto-expansión dinámica mientras se escribe:**
```javascript
function autoResizeTextarea(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = (el.scrollHeight + 2) + 'px';
}
```
2. **CSS obligatorio:**
```css
textarea {
    width: 100%;
    padding: 9px 12px;
    font-size: 0.9rem;
    border: 1.5px solid #e0dbd1;
    border-radius: 6px;
    background: #faf9f6;
    color: #222;
    font-family: inherit;
    line-height: 1.4;
    resize: vertical;      /* Permite al usuario agrandar o encoger manualmente */
    overflow-y: auto;      /* Barra espaciadora/scrollbar vertical cuando se necesita */
    box-sizing: border-box;
    transition: border-color 0.2s;
}
```
3. **Escuchadores automáticos en DOMContentLoaded:**
```javascript
document.querySelectorAll('textarea').forEach(ta => {
    ta.addEventListener('input', function() { autoResizeTextarea(this); });
    autoResizeTextarea(ta);
});
```

---

## 6. Motor PDF Vectorial (jsPDF)

- Utilizar la librería local offline UMD: `<script src="./jspdf.umd.min.js"></script>`.
- Fondo crema editorial mate: `#fffefb` (`rgb(255, 254, 251)`).
- Líneas en gris editorial suave: `#28231e` (títulos principales), `#555` (textos secundarios), `#dcd7ce` (rejillas y guías).
- Selector modal de formato:
  - Formato libro nativo encuadernable o Folio estándar DIN A4.
  - Opciones de descarga con datos o plantilla limpia en blanco (de 1 a varios meses/semanas).

---

## 7. Despliegue y Sincronización de Archivos

- No usar nunca la palabra `demo` en enlaces visibles de producción.
- Ruta canónica: `/generador-planificador-mensual.html`.
- Cada cambio debe sincronizarse en la raíz y en `public/` para que Vite compile a `dist/` con total paridad.
