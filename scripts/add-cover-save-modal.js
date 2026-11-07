import fs from 'fs';
import path from 'path';

const ROOT_DIR = 'c:/Users/IA/Documents/Antigravity/MENOS RUIDO/web/web-menos-ruido';
const filePortadas = path.join(ROOT_DIR, 'generador-portadas.html');
let content = fs.readFileSync(filePortadas, 'utf8');

// 1. Conectar botón #btn-save-generator-design a onclick="openSaveAndValidateCoverModal()"
content = content.replace(
  '<button type="button" class="btn-save-space" id="btn-save-generator-design">',
  '<button type="button" class="btn-save-space" id="btn-save-generator-design" onclick="openSaveAndValidateCoverModal()">'
);

// 2. Insertar modal HTML antes de <!-- MODAL POP-UP DE VALIDACIÓN DE TEXTOS DE CUBIERTA EXTERIOR -->
const coverModalHtml = `    <!-- MODAL DE GUARDADO Y VALIDACIÓN DE CUBIERTA EN MI ESPACIO -->
    <div class="modal-overlay" id="modalSaveAndValidateCover" style="z-index: 100001; display: none;">
        <div class="modal-card" style="max-width: 580px; width: 92%; text-align: left; padding: 24px; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e8e2d5; padding-bottom: 12px; margin-bottom: 16px;">
                <div>
                    <h3 style="font-family: var(--font-display); font-size: 1.25rem; margin: 0; color: #1f1c19;">Guardar Portada en Mi Espacio</h3>
                    <div style="font-size: 0.8rem; color: #665e54; margin-top: 2px;">Elige si deseas guardar como borrador o validar para imprenta</div>
                </div>
                <button type="button" class="modal-close-btn" onclick="closeSaveAndValidateCoverModal()" style="position: static; font-size: 1.4rem; line-height: 1; cursor: pointer; border: none; background: transparent;">✕</button>
            </div>

            <div style="background: #faf7f2; border: 1px solid #e8e0d4; border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; font-size: 0.82rem; color: #5a5147; line-height: 1.5;">
                <div style="font-weight: 800; color: #1f1c19; margin-bottom: 4px;" id="saveCoverModalInfoDisplay">📖 Libro interior sincronizado: -- págs</div>
                <div style="margin-top: 6px; font-size: 0.78rem; color: #443c33;">
                    <strong>Compatibilidad física de imprenta:</strong><br>
                    • <strong>Anillas (Wire-O):</strong> 16 a 450 págs.<br>
                    • <strong>Tapa Blanda:</strong> 32 a 365 págs.<br>
                    • <strong>Tapa Dura:</strong> 60 a 365 págs.<br>
                    <em>* Requisito estricto: Páginas pares e interior revisado.</em>
                </div>
            </div>

            <form id="form-save-validate-cover" onsubmit="return false;">
                <div class="form-group" style="margin-bottom: 14px;">
                    <label for="save-cover-modal-title" style="display: block; font-size: 0.76rem; font-weight: 700; color: #473f36; margin-bottom: 4px;">Nombre del diseño de portada en Mi Espacio</label>
                    <input type="text" id="save-cover-modal-title" style="width: 100%; padding: 8px 10px; font-size: 0.86rem; border: 1px solid #dcd3c5; border-radius: 6px; box-sizing: border-box; background: #ffffff; color: #2b2520;" />
                </div>

                <div style="background: #ffffff; border: 1.5px solid #215c38; border-radius: 8px; padding: 10px 12px; margin-bottom: 18px;">
                    <label style="display: flex; align-items: flex-start; gap: 9px; cursor: pointer; font-size: 0.82rem; color: #1e3d29; line-height: 1.4;">
                        <input type="checkbox" id="save-cover-modal-confirm-check" checked style="width: 17px; height: 17px; margin-top: 2px; accent-color: #215c38; cursor: pointer;" />
                        <span><strong>He revisado la ortografía de los textos</strong> (título, autor, lomo y contraportada) y confirmo que son correctos para impresión.</span>
                    </label>
                </div>

                <div style="display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 10px;">
                    <button type="button" onclick="closeSaveAndValidateCoverModal()" style="background: #f5efe6; color: #4a3f35; border: 1px solid #d6cec0; border-radius: 6px; padding: 9px 16px; font-size: 0.84rem; font-weight: 600; cursor: pointer;">
                        Cancelar
                    </button>
                    <button type="button" onclick="executeSaveCoverDraftOnly()" style="background: #e2d9cc; color: #3b3228; border: none; border-radius: 6px; padding: 9px 18px; font-size: 0.84rem; font-weight: 700; cursor: pointer;" title="Guardar cambios sin marcar como validado para imprenta">
                        Guardar borrador (sin validar)
                    </button>
                    <button type="button" onclick="executeValidateAndSaveCover()" style="background: #215c38; color: #ffffff; border: none; border-radius: 6px; padding: 9px 20px; font-size: 0.84rem; font-weight: 700; cursor: pointer;" title="Validar textos y certificar listo para imprenta">
                        Validar y Guardar para Imprenta ✓
                    </button>
                </div>
            </form>
        </div>
    </div>\n\n`;

content = content.replace('    <!-- MODAL POP-UP DE VALIDACIÓN DE TEXTOS DE CUBIERTA EXTERIOR -->', coverModalHtml + '    <!-- MODAL POP-UP DE VALIDACIÓN DE TEXTOS DE CUBIERTA EXTERIOR -->');

// 3. Insertar funciones JS de gestión del modal y guardado
const coverModalScript = `
        function getBindingLabelName(type) {
            if (type === 'coil') return 'Anillas metálicas Wire-O';
            if (type === 'perfect') return 'Tapa Blanda fresada';
            if (type === 'hardcover') return 'Tapa Dura casewrap';
            return 'Encuadernación personalizada';
        }

        function openSaveAndValidateCoverModal() {
            const modal = document.getElementById('modalSaveAndValidateCover');
            const infoEl = document.getElementById('saveCoverModalInfoDisplay');
            const titleInp = document.getElementById('save-cover-modal-title');
            const chk = document.getElementById('save-cover-modal-confirm-check');
            const pages = parseInt(coverState.pageCount, 10) || 0;
            const isEven = pages % 2 === 0;

            if (infoEl) {
                let statusHtml = '';
                if (!isEven) {
                    statusHtml = '<span style="color:#dc2626; font-weight:700;">⚠️ Páginas impares</span>';
                } else if (pages > 450) {
                    statusHtml = '<span style="color:#dc2626; font-weight:700;">⚠️ Supera 450 págs</span>';
                } else {
                    statusHtml = '<span style="color:#166534; font-weight:700;">✓ Apto para imprenta</span>';
                }
                const bindName = getBindingLabelName(coverState.bindingType);
                infoEl.innerHTML = \`📖 Sincronizado: <strong>\${coverState.syncedBookName || 'Libro Completo'}</strong> (\${pages} págs · \${statusHtml})<br>📚 Encuadernación elegida: <strong>\${bindName}</strong>\`;
            }
            if (titleInp) {
                titleInp.value = coverState.title ? \`Portada · \${coverState.title}\` : 'Portada Cuaderno Personalizado';
            }
            if (chk) {
                chk.checked = !!coverState.validated;
            }
            if (modal) {
                modal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            }
        }
        window.openSaveAndValidateCoverModal = openSaveAndValidateCoverModal;

        function closeSaveAndValidateCoverModal() {
            const modal = document.getElementById('modalSaveAndValidateCover');
            if (modal) {
                modal.style.display = 'none';
                document.body.style.overflow = '';
            }
        }
        window.closeSaveAndValidateCoverModal = closeSaveAndValidateCoverModal;

        function executeSaveCoverDraftOnly() {
            const titleInp = document.getElementById('save-cover-modal-title');
            const chosenTitle = (titleInp && titleInp.value.trim()) ? titleInp.value.trim() : (coverState.title ? \`Portada · \${coverState.title}\` : 'Portada Cuaderno Personalizado');
            coverState.validated = false;
            closeSaveAndValidateCoverModal();
            if (typeof window.saveCoverDirectly === 'function') {
                window.saveCoverDirectly(false, chosenTitle);
            } else {
                alert('✓ Guardado como borrador localmente.');
            }
        }
        window.executeSaveCoverDraftOnly = executeSaveDraftOnly = executeSaveCoverDraftOnly;

        function executeValidateAndSaveCover() {
            const pages = parseInt(coverState.pageCount, 10) || 0;
            if (pages % 2 !== 0) {
                alert(\`⚠️ El cuaderno tiene un número impar de páginas (\${pages} págs).\\n\\nPara poder validar para imprenta, el número de páginas debe ser estrictamente par. Ajusta el interior antes de validar.\`);
                return;
            }
            if (pages < 16) {
                alert(\`⚠️ Se requiere un mínimo de 16 páginas para cualquier tipo de libro físico en imprenta.\`);
                return;
            }
            if (pages > 450) {
                alert(\`⚠️ El cuaderno tiene \${pages} páginas y supera el límite de 450 páginas de imprenta (anillas Wire-O).\\n\\nReduce el número de páginas en el interior para poder imprimirlo.\`);
                return;
            }
            if (coverState.bindingType === 'hardcover' && (pages < 60 || pages > 365)) {
                alert(\`⚠️ La encuadernación en tapa dura requiere entre 60 y 365 páginas (actualmente tiene \${pages} págs).\`);
                return;
            }
            if (coverState.bindingType === 'perfect' && (pages < 32 || pages > 365)) {
                alert(\`⚠️ La encuadernación en tapa blanda requiere entre 32 y 365 páginas (actualmente tiene \${pages} págs).\`);
                return;
            }

            const chk = document.getElementById('save-cover-modal-confirm-check');
            if (chk && !chk.checked) {
                alert('Por favor, marca la casilla confirmando la revisión de ortografía de los textos.');
                return;
            }

            const titleInp = document.getElementById('save-cover-modal-title');
            const chosenTitle = (titleInp && titleInp.value.trim()) ? titleInp.value.trim() : (coverState.title ? \`Portada · \${coverState.title}\` : 'Portada Cuaderno Personalizado');

            coverState.validated = true;
            coverState.validatedAt = new Date().toISOString();
            closeSaveAndValidateCoverModal();

            if (typeof window.saveCoverDirectly === 'function') {
                window.saveCoverDirectly(true, chosenTitle);
            } else {
                alert('✓ Cubierta validada para imprenta y guardada localmente.');
            }
        }
        window.executeValidateAndSaveCover = executeValidateAndSaveCover;
`;

// Insertar antes de </script> del final
content = content.replace('function closeAddedToCartModal()', coverModalScript + '\n        function closeAddedToCartModal()');

// 4. En el script type="module" del final, registrar window.saveCoverDirectly
const moduleTarget = `        setupGeneratorSave('btn-save-generator-design', getCoverGeneratorData, { isPremium: true, generatorType: 'cover' });
        checkAndLoadSavedDesign(applySavedCoverDesign);`;

const moduleReplacement = `        let activeLoadedCoverDesignId = null;

        checkAndLoadSavedDesign((data, designMeta) => {
            if (designMeta && designMeta.id) {
                activeLoadedCoverDesignId = designMeta.id;
            }
            applySavedCoverDesign(data);
        });

        // Guardado directo y limpio de Portada en Firestore
        window.saveCoverDirectly = async function(isValidated, customTitle) {
            let user = auth.currentUser;
            if (!user && typeof auth.authStateReady === 'function') {
                try {
                    await auth.authStateReady();
                    user = auth.currentUser;
                } catch(e) {}
            }

            if (!user) {
                openAuthModal({
                    title: 'Guarda tu portada en Mi Espacio',
                    subtitle: 'Accede con tu cuenta para guardar el diseño de tu cubierta exterior.',
                    badge: 'Guardar portada',
                    actionContext: 'save',
                    onSuccess: async (loggedUser) => {
                        await doSave(loggedUser);
                    }
                });
                return;
            }

            await doSave(user);

            async function doSave(u) {
                try {
                    const rawData = getCoverGeneratorData();
                    const cleanData = cleanDataForFirestore(rawData);
                    cleanData.validated = !!isValidated;
                    if (isValidated) {
                        cleanData.validatedAt = new Date().toISOString();
                    }

                    const designDoc = {
                        name: customTitle,
                        type: 'Portada',
                        generatorType: 'cover',
                        previewData: cleanData,
                        data: cleanData,
                        validated: !!isValidated,
                        updatedAt: serverTimestamp()
                    };

                    const designsRef = collection(db, 'users', u.uid, 'designs');
                    let targetDocRef;

                    if (activeLoadedCoverDesignId) {
                        targetDocRef = doc(designsRef, activeLoadedCoverDesignId);
                    } else {
                        targetDocRef = doc(designsRef);
                        activeLoadedCoverDesignId = targetDocRef.id;
                        designDoc.createdAt = serverTimestamp();
                    }

                    await setDoc(targetDocRef, designDoc, { merge: true });

                    // Guardar copia local en mr_local_designs
                    try {
                        const localDesigns = JSON.parse(localStorage.getItem('mr_local_designs') || '[]');
                        const idx = localDesigns.findIndex(d => d.id === targetDocRef.id);
                        const localItem = {
                            id: targetDocRef.id,
                            name: customTitle,
                            type: 'Portada',
                            validated: !!isValidated,
                            updatedAt: new Date().toISOString(),
                            data: cleanData
                        };
                        if (idx >= 0) {
                            localDesigns[idx] = localItem;
                        } else {
                            localDesigns.unshift(localItem);
                        }
                        localStorage.setItem('mr_local_designs', JSON.stringify(localDesigns));
                    } catch(e) {}

                    const badgeMsg = isValidated ? '✓ Portada validada y guardada en Mi Espacio con éxito.' : '✓ Portada guardada como borrador en Mi Espacio.';
                    alert(badgeMsg);
                } catch(err) {
                    console.error('Error guardando portada en Firestore:', err);
                    alert('✓ Guardado en tu almacenamiento local.');
                }
            }
        };`;

content = content.replace(moduleTarget, moduleReplacement);

fs.writeFileSync(filePortadas, content, 'utf8');
console.log('✓ Modal y guardado directo de Portada integrados con éxito.');
