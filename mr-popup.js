// mr-popup.js - Sistema unificado de diálogos y pop-ups con la estética oficial de Editorial Menos Ruido

let popupOverlay = null;

function ensurePopupDOM() {
  if (popupOverlay && document.body.contains(popupOverlay)) return popupOverlay;

  const overlay = document.createElement('div');
  overlay.id = 'mr-popup-overlay';
  overlay.style.cssText = `
    display: none;
    position: fixed;
    inset: 0;
    z-index: 9999999;
    background: rgba(28, 24, 21, 0.52);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    align-items: center;
    justify-content: center;
    padding: 18px;
    opacity: 0;
    transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;

  overlay.innerHTML = `
    <div id="mr-popup-card" style="
      background: #faf8f5;
      border: 1px solid #e6ded3;
      border-radius: 12px;
      box-shadow: 0 18px 48px rgba(0, 0, 0, 0.16), 0 4px 14px rgba(0, 0, 0, 0.06);
      max-width: 440px;
      width: 100%;
      padding: 26px 24px 22px;
      position: relative;
      transform: scale(0.96) translateY(6px);
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      box-sizing: border-box;
      color: #2b2520;
    ">
      <button type="button" id="mr-popup-close-btn" aria-label="Cerrar" style="
        position: absolute;
        top: 14px;
        right: 14px;
        background: transparent;
        border: none;
        font-size: 1.3rem;
        color: #8c8276;
        cursor: pointer;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: background 0.15s, color 0.15s;
        line-height: 1;
      ">×</button>

      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
        <span style="font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #87553b;" id="mr-popup-badge">Editorial Menos Ruido</span>
      </div>

      <h3 id="mr-popup-title" style="
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 1.28rem;
        margin: 0 0 10px 0;
        color: #1a1714;
        font-weight: 700;
        line-height: 1.3;
      ">Aviso</h3>

      <div id="mr-popup-message" style="
        font-size: 0.88rem;
        line-height: 1.55;
        color: #4a423a;
        margin-bottom: 22px;
        white-space: pre-line;
      "></div>

      <div id="mr-popup-actions" style="
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      ">
        <button type="button" id="mr-popup-cancel-btn" style="
          display: none;
          background: #f0e9df;
          color: #5c5247;
          border: 1px solid #dcd2c4;
          padding: 10px 18px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.86rem;
          cursor: pointer;
          transition: background 0.15s;
        ">Cancelar</button>

        <button type="button" id="mr-popup-confirm-btn" style="
          background: #24211e;
          color: #ffffff;
          border: none;
          padding: 10px 22px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.86rem;
          cursor: pointer;
          transition: background 0.15s;
          box-shadow: 0 2px 6px rgba(0,0,0,0.12);
        ">Aceptar</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  popupOverlay = overlay;

  const closeBtn = overlay.querySelector('#mr-popup-close-btn');
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.background = '#ede6db';
    closeBtn.style.color = '#1f1c19';
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.background = 'transparent';
    closeBtn.style.color = '#8c8276';
  });

  return overlay;
}

export function showMrAlert(message, options = {}) {
  return new Promise((resolve) => {
    const overlay = ensurePopupDOM();
    const card = overlay.querySelector('#mr-popup-card');
    const titleEl = overlay.querySelector('#mr-popup-title');
    const badgeEl = overlay.querySelector('#mr-popup-badge');
    const msgEl = overlay.querySelector('#mr-popup-message');
    const confirmBtn = overlay.querySelector('#mr-popup-confirm-btn');
    const cancelBtn = overlay.querySelector('#mr-popup-cancel-btn');
    const closeBtn = overlay.querySelector('#mr-popup-close-btn');

    titleEl.textContent = options.title || 'Información';
    badgeEl.textContent = options.badge || 'Editorial Menos Ruido';
    msgEl.textContent = typeof message === 'string' ? message : JSON.stringify(message, null, 2);
    confirmBtn.textContent = options.confirmText || options.buttonText || 'Entendido';
    cancelBtn.style.display = 'none';

    if (options.type === 'error' || options.type === 'warning') {
      badgeEl.style.color = '#b91c1c';
      confirmBtn.style.background = '#24211e';
    } else if (options.type === 'success') {
      badgeEl.style.color = '#15803d';
      confirmBtn.style.background = '#1e3a29';
    } else {
      badgeEl.style.color = '#87553b';
      confirmBtn.style.background = '#24211e';
    }

    const cleanup = () => {
      overlay.style.opacity = '0';
      card.style.transform = 'scale(0.96) translateY(6px)';
      setTimeout(() => {
        overlay.style.display = 'none';
      }, 200);
      confirmBtn.removeEventListener('click', onConfirm);
      closeBtn.removeEventListener('click', onClose);
      overlay.removeEventListener('click', onBackdrop);
      window.removeEventListener('keydown', onKey);
    };

    const onConfirm = () => { cleanup(); resolve(true); };
    const onClose = () => { cleanup(); resolve(true); };
    const onBackdrop = (e) => { if (e.target === overlay) { cleanup(); resolve(true); } };
    const onKey = (e) => { if (e.key === 'Escape' || e.key === 'Enter') { cleanup(); resolve(true); } };

    confirmBtn.addEventListener('click', onConfirm);
    closeBtn.addEventListener('click', onClose);
    overlay.addEventListener('click', onBackdrop);
    window.addEventListener('keydown', onKey);

    overlay.style.display = 'flex';
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      card.style.transform = 'scale(1) translateY(0)';
      confirmBtn.focus();
    });
  });
}

export function showMrConfirm(message, options = {}) {
  return new Promise((resolve) => {
    const overlay = ensurePopupDOM();
    const card = overlay.querySelector('#mr-popup-card');
    const titleEl = overlay.querySelector('#mr-popup-title');
    const badgeEl = overlay.querySelector('#mr-popup-badge');
    const msgEl = overlay.querySelector('#mr-popup-message');
    const confirmBtn = overlay.querySelector('#mr-popup-confirm-btn');
    const cancelBtn = overlay.querySelector('#mr-popup-cancel-btn');
    const closeBtn = overlay.querySelector('#mr-popup-close-btn');

    titleEl.textContent = options.title || 'Confirmación';
    badgeEl.textContent = options.badge || 'Editorial Menos Ruido';
    msgEl.textContent = typeof message === 'string' ? message : JSON.stringify(message, null, 2);
    confirmBtn.textContent = options.confirmText || 'Aceptar';
    cancelBtn.textContent = options.cancelText || 'Cancelar';
    cancelBtn.style.display = 'inline-block';

    const cleanup = () => {
      overlay.style.opacity = '0';
      card.style.transform = 'scale(0.96) translateY(6px)';
      setTimeout(() => {
        overlay.style.display = 'none';
      }, 200);
      confirmBtn.removeEventListener('click', onConfirm);
      cancelBtn.removeEventListener('click', onCancel);
      closeBtn.removeEventListener('click', onClose);
      overlay.removeEventListener('click', onBackdrop);
      window.removeEventListener('keydown', onKey);
    };

    const onConfirm = () => { cleanup(); resolve(true); };
    const onCancel = () => { cleanup(); resolve(false); };
    const onClose = () => { cleanup(); resolve(false); };
    const onBackdrop = (e) => { if (e.target === overlay) { cleanup(); resolve(false); } };
    const onKey = (e) => {
      if (e.key === 'Escape') { cleanup(); resolve(false); }
      if (e.key === 'Enter') { cleanup(); resolve(true); }
    };

    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);
    closeBtn.addEventListener('click', onClose);
    overlay.addEventListener('click', onBackdrop);
    window.addEventListener('keydown', onKey);

    overlay.style.display = 'flex';
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      card.style.transform = 'scale(1) translateY(0)';
      confirmBtn.focus();
    });
  });
}

// Inyección y reemplazo del alert nativo para que todos los avisos tengan la estética de Menos Ruido
if (typeof window !== 'undefined') {
  window.mrAlert = showMrAlert;
  window.mrConfirm = showMrConfirm;
  window.alert = function(msg) {
    let cleanTitle = 'Aviso';
    let type = 'info';
    const text = String(msg || '');
    if (text.startsWith('⚠️')) {
      cleanTitle = 'Revisión requerida';
      type = 'warning';
    } else if (text.startsWith('✓') || text.startsWith('🎉')) {
      cleanTitle = 'Operación completada';
      type = 'success';
    } else if (text.startsWith('❌')) {
      cleanTitle = 'Error';
      type = 'error';
    }
    showMrAlert(text, { title: cleanTitle, type });
  };
}
