import fs from 'fs';

const filePortadas = 'c:/Users/IA/Documents/Antigravity/MENOS RUIDO/web/web-menos-ruido/generador-portadas.html';
let content = fs.readFileSync(filePortadas, 'utf8');

// Normalizar saltos para reemplazo seguro
const isCrlf = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

const searchSection = `            // Comprobar si venimos con un cuaderno configurado desde la cesta o visor de pedido
            let hasLoadedCartItem = false;
            try {
                const cartCoverRaw = localStorage.getItem('mr_cart_cover_item');
                if (cartCoverRaw) {
                    const cartItem = JSON.parse(cartCoverRaw);
                    if (cartItem.title) {
                        coverState.title = cartItem.title;
                        const titleInp = document.getElementById('coverTitle');
                        if (titleInp) titleInp.value = cartItem.title;
                    }
                    if (cartItem.bindingType) {
                        coverState.bindingType = cartItem.bindingType === 'perfect' ? 'softcover' : cartItem.bindingType;
                    }
                    if (cartItem.pageCount) {
                        coverState.pageCount = parseInt(cartItem.pageCount, 10) || coverState.pageCount;
                        const pageInp = document.getElementById('pageCount');
                        if (pageInp) pageInp.value = coverState.pageCount;
                    }
                    if (cartItem.data) {
                        if (cartItem.data.subtitle !== undefined) {
                            coverState.subtitle = cartItem.data.subtitle;
                            const subInp = document.getElementById('coverSubtitle');
                            if (subInp) subInp.value = cartItem.data.subtitle;
                        }
                        if (cartItem.data.author !== undefined) {
                            coverState.author = cartItem.data.author;
                            const authInp = document.getElementById('coverAuthor');
                            if (authInp) authInp.value = cartItem.data.author;
                        }
                        if (cartItem.data.spineText !== undefined) {
                            coverState.spineText = cartItem.data.spineText;
                            const spineInp = document.getElementById('spineText');
                            if (spineInp) spineInp.value = cartItem.data.spineText;
                        }
                    }
                    hasLoadedCartItem = true;
                }
            } catch (e) {
                console.warn('Aviso cargando mr_cart_cover_item:', e);
            }

            if (!hasLoadedCartItem) {
                const urlParams = new URLSearchParams(window.location.search);
                const fromInterior = urlParams.get('from') === 'interior';
                const hasLocalDraft = !!localStorage.getItem('mr_complete_book_config');

                // Si viene de pulsar "Diseñar Portada" o hay borrador local, manda el libro recién editado
                if (fromInterior || (hasLocalDraft && window.availableInteriorBooks.length === 0)) {
                    syncFromBookBuilder(false);
                } else if (window.availableInteriorBooks.length > 0) {
                    applyInteriorBookObject(window.availableInteriorBooks[0], false);
                } else {
                    syncFromBookBuilder(false);
                }
            }`;

const replacement = `            const urlParams = new URLSearchParams(window.location.search);
            const fromInterior = urlParams.get('from') === 'interior';

            // Comprobar si venimos con un cuaderno configurado desde la cesta o visor de pedido
            let hasLoadedCartItem = false;
            if (!fromInterior) {
                try {
                    const cartCoverRaw = localStorage.getItem('mr_cart_cover_item');
                    if (cartCoverRaw) {
                        const cartItem = JSON.parse(cartCoverRaw);
                        if (cartItem.title) {
                            coverState.title = cartItem.title;
                            const titleInp = document.getElementById('coverTitle');
                            if (titleInp) titleInp.value = cartItem.title;
                        }
                        if (cartItem.bindingType) {
                            coverState.bindingType = (cartItem.bindingType === 'softcover' || cartItem.bindingType === 'perfect') ? 'perfect' : cartItem.bindingType;
                        }
                        if (cartItem.pageCount) {
                            coverState.pageCount = parseInt(cartItem.pageCount, 10) || coverState.pageCount;
                            const pageInp = document.getElementById('pageCount');
                            if (pageInp) pageInp.value = coverState.pageCount;
                        }
                        if (cartItem.data) {
                            if (cartItem.data.subtitle !== undefined) {
                                coverState.subtitle = cartItem.data.subtitle;
                                const subInp = document.getElementById('coverSubtitle');
                                if (subInp) subInp.value = cartItem.data.subtitle;
                            }
                            if (cartItem.data.author !== undefined) {
                                coverState.author = cartItem.data.author;
                                const authInp = document.getElementById('coverAuthor');
                                if (authInp) authInp.value = cartItem.data.author;
                            }
                            if (cartItem.data.spineText !== undefined) {
                                coverState.spineText = cartItem.data.spineText;
                                const spineInp = document.getElementById('spineText');
                                if (spineInp) spineInp.value = cartItem.data.spineText;
                            }
                        }
                        hasLoadedCartItem = true;
                    }
                } catch (e) {
                    console.warn('Aviso cargando mr_cart_cover_item:', e);
                }
            } else {
                try { localStorage.removeItem('mr_cart_cover_item'); } catch(e) {}
            }

            if (!hasLoadedCartItem) {
                const hasLocalDraft = !!localStorage.getItem('mr_complete_book_config');
                // Si viene de pulsar "Diseñar Portada" o hay borrador local, manda el libro recién editado
                if (fromInterior || hasLocalDraft) {
                    syncFromBookBuilder(false);
                } else if (window.availableInteriorBooks.length > 0) {
                    applyInteriorBookObject(window.availableInteriorBooks[0], false);
                } else {
                    syncFromBookBuilder(false);
                }
            }`;

if (content.includes(searchSection)) {
  content = content.replace(searchSection, replacement);
  if (isCrlf) content = content.replace(/\n/g, '\r\n');
  fs.writeFileSync(filePortadas, content, 'utf8');
  console.log('✓ generador-portadas.html sincronización estricta actualizada.');
} else {
  console.error('Target block not found in normalized content');
}
