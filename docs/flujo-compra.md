# Flujo de compra (cesta → pedido → seguimiento) · Menos Ruido

> **Documento de referencia único.** Cualquier cambio en la cesta, el pago o los pedidos se apunta aquí en el mismo commit.
> Si una conversación nueva va a tocar la compra, **lee esto antes de abrir el código**.

Última actualización: **Paso 0 completado** (limpieza). Pendientes: Paso 1, 1.5, 2 y 2.5 (ver abajo).

---

## 1. Dónde vive cada cosa (código activo)

| Pieza | Archivo | Qué hace |
| :--- | :--- | :--- |
| Botón «Añadir a la cesta» | `generador-portadas.html` (`#devCartWrapper`, `handleAddToCart()`) | Solo visible para cuentas de prueba (`isDeveloper` / `isTestCustomer`). La visibilidad se decide en el `<script type="module">` del final de la página. |
| Pop-up «añadido a la cesta» | `generador-portadas.html` (`#addedToCartModal`) | **Dos botones:** «Seguir editando» y «Ir a mi cesta». No hay «Comprar ahora». |
| Cesta | `mi-espacio.js` → `clientPendingBasket` (localStorage `mr_pending_payment_books`) | Lista de libros pendientes de pago. Se pinta en `renderClientOrdersAndBasketViews()`. |
| Botón único de pago | `mi-espacio.html` → `#client-basket-checkout-bar` / `#btn-basket-checkout` | Abajo a la derecha de la cesta. Muestra total y abre `openBasketCheckoutModal()`. Lo actualiza `updateBasketCheckoutBar()`. |
| Resumen y pago | `mi-espacio.js` → `openBasketCheckoutModal()` + `handleConfirmCheckoutOrder()` | Envía **todos** los libros a `/api/create-checkout-session`. |
| Vuelta de Stripe | `mi-espacio.js` → `checkAndHandleStripeCheckoutReturn()` | Crea el pedido en Firestore (`orders/{orderNumber}`), vacía de la cesta lo comprado y manda emails. |
| Dirección de entrega | `mi-espacio.html` → pestaña **Ajustes y mis datos** (`executeSaveDirecciones()`) | **Único sitio** donde se edita. Al guardar se aplica a todos los libros de la cesta. En la cesta solo hay un botón que lleva a Ajustes. |
| Seguimiento (4 fases) | `mi-espacio.js` (escuchas `onSnapshot`) + `admin-pedidos.js` (gestor, PIN) | `pending_review` → `printing` → `shipped` → `delivered`. |

---

## 2. Eliminado en el Paso 0 (no volver a crear)

Todo esto se ha borrado del proyecto. Si aparece en una copia vieja, **no es código activo**.

- **`cart-drawer.js` (archivo completo).** Carrito lateral antiguo de un solo libro: botón flotante «Tu carrito» (`#mrDevCartFab`), botón flotante «Finalizar compra» (`#mrBtnFloatingBuy`), panel «Rayos X Lulu», pago individual a Stripe y registro de pedido directo. Quitadas también sus etiquetas `<script>` en `mi-espacio.html`, `generador-portadas.html` y `generador-libro-completo.html`, y el botón «Carrito & Cortacircuitos» del panel dev.
- **Botón «Comprar ahora»** del pop-up de añadido a la cesta y el parámetro `?buy_now=1` que pulsaba solo el botón de compra.
- **Botón «Comprar» en cada libro de la cesta** (`data-buy-pending`). Ahora solo existe el botón único de abajo.
- **Pop-up de dirección por libro** (`#basket-edit-address-modal` y sus funciones). Cambiaba la dirección de un libro y no de los demás.
- **Formulario «Envíos e Imprenta (Lulu API)» del panel dev** (`#envio-form`). Guardaba `users/{uid}.shipping` con otro formato y pisaba la dirección de Ajustes.
- **Generadores de datos falsos:** `seedPendingBasketBook()`, `seedFullProfileOrder()`, botones «Añadir libro pendiente de pago», «Crear pedido completo en perfil», «Simular pedido de prueba» y el **pedido falso que se creaba solo** al entrar el desarrollador sin pedidos.
- **Duplicado de la portada en la cesta:** `mr_cart_cover_item` ya no se mete en la cesta al cargar (se usa solo para pasar datos al descargar la portada en PDF).
- **«Flujo B» del generador de portadas:** modal `#orderModal`, `openOrderModal()`, `simulateTransparentOrder()`, `refreshLuluPayloadPreview()` y su CSS. Nunca se llamaba.
- En la revisión de textos de la portada se quitó la copia de los campos (que son de solo lectura) al estado.

---

## 3. Plan acordado

| Paso | Contenido | Estado |
| :--- | :--- | :--- |
| **0** | Limpieza de código obsoleto (este documento, sección 2). | ✅ Hecho |
| **1** | Cesta universal (mismo formato para cualquier producto), validación al **guardar** (libro y portada), límites de páginas, encuadernaciones bloqueadas con aviso, pago demo 0 € y paso limpio a «Mis pedidos». | Pendiente |
| **1.5** | Revisión conjunta del Paso 1. | Pendiente |
| **2** | Email desde la sesión (sin escribirlo), dirección en casillas (calle y nº, piso/puerta, CP 5 dígitos con comprobación de provincia, población, notas) y verificación en una sola línea. | Pendiente |
| **2.5** | Revisión conjunta del Paso 2 y prueba completa. | Pendiente |

### Límites de páginas (1 página = 1 cara; 1 hoja = 2 páginas; siempre número par)

| Encuadernación | Mínimo | Máximo |
| :--- | :--- | :--- |
| Anillas (Wire-O) | 16 | 450 |
| Tapa blanda | 32 | 365 |
| Tapa dura | 60 | 365 |

---

## 4. Pendiente detectado en el Paso 0 (se resuelve en Paso 1/2)

- `handleAddToCart()` (portadas) suma 1 página en silencio si el número es impar → sustituir por validación con aviso (Paso 1).
- La casilla «He revisado los textos» vive en cada libro de la cesta → pasa al guardado del libro/portada (Paso 1).
- La cesta y el checkout rellenan datos de ejemplo (dirección, teléfono, email) cuando faltan → deben salir de Ajustes y de la sesión (Paso 2).
- Ajustes guarda `notes` pero `populateShippingFields()` no rellena el campo de notas (Paso 2).
