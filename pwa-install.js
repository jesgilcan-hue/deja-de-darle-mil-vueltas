// pwa-install.js - Prompt elegante y minimalista estilo Menos Ruido para instalar la PWA
let deferredPrompt = null;

export function initPwaInstall() {
  // Comprobar si ya está instalada o en modo standalone
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isStandalone) return;

  // Comprobar si el usuario la descartó recientemente (hace menos de 7 días)
  const lastDismissed = localStorage.getItem('mr_pwa_dismissed');
  if (lastDismissed && Date.now() - parseInt(lastDismissed, 10) < 7 * 24 * 60 * 60 * 1000) {
    return;
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  // Escuchar evento estándar de instalación (Android / Chrome / Edge)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showPwaBanner('standard');
  });

  // Para iOS Safari (no soporta beforeinstallprompt de forma nativa)
  if (isIOS && !isStandalone) {
    // Mostrar tras unos segundos de navegación si es móvil
    setTimeout(() => {
      showPwaBanner('ios');
    }, 4000);
  }
}

function showPwaBanner(type = 'standard') {
  if (document.getElementById('pwa-install-banner')) return;

  const bannerHtml = `
    <div id="pwa-install-banner" class="pwa-banner-wrap">
      <div class="pwa-banner-card">
        <div class="pwa-banner-icon">
          <img src="/logo_icono_verde.png" alt="Menos Ruido" />
        </div>
        <div class="pwa-banner-text">
          <h4>Menos Ruido en tu móvil</h4>
          <p>Accede a tus planificadores y lecturas a pantalla completa, sin barras ni distracciones.</p>
        </div>
        <div class="pwa-banner-actions">
          <button type="button" class="btn-pwa-install" id="btn-pwa-install">Instalar app</button>
          <button type="button" class="btn-pwa-dismiss" id="btn-pwa-dismiss" aria-label="Cerrar aviso">×</button>
        </div>
      </div>
    </div>

    <!-- Modal con pasos específicos para Safari iOS -->
    <div id="pwa-ios-modal" class="auth-modal-overlay" style="display: none;">
      <div class="auth-modal-card pwa-ios-card">
        <button type="button" class="auth-modal-close" id="btn-close-ios-modal">×</button>
        <div class="auth-modal-header">
          <span class="auth-modal-brand">Menos Ruido</span>
          <h2 class="auth-modal-title">Añadir a pantalla de inicio</h2>
          <p class="auth-modal-subtitle">Ten tus herramientas siempre a mano en tu iPhone o iPad en 2 pasos:</p>
        </div>
        <div class="pwa-ios-steps">
          <div class="pwa-ios-step">
            <span class="step-num">1</span>
            <p>Pulsa el botón de <strong>Compartir</strong> <span style="font-size: 1.2rem;">⎋</span> en la barra inferior de Safari.</p>
          </div>
          <div class="pwa-ios-step">
            <span class="step-num">2</span>
            <p>Baja en el menú y selecciona <strong>«Añadir a la pantalla de inicio»</strong> <span style="font-size: 1.2rem;">➕</span>.</p>
          </div>
        </div>
        <button type="button" class="btn-auth-email" id="btn-ios-done" style="margin-top: 20px;">
          Entendido
        </button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', bannerHtml);

  const banner = document.getElementById('pwa-install-banner');
  const installBtn = document.getElementById('btn-pwa-install');
  const dismissBtn = document.getElementById('btn-pwa-dismiss');
  const iosModal = document.getElementById('pwa-ios-modal');
  const closeIosBtn = document.getElementById('btn-close-ios-modal');
  const doneIosBtn = document.getElementById('btn-ios-done');

  // Dismiss banner
  dismissBtn?.addEventListener('click', () => {
    banner.remove();
    localStorage.setItem('mr_pwa_dismissed', Date.now().toString());
  });

  // Botón Instalar
  installBtn?.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        banner.remove();
      }
      deferredPrompt = null;
    } else if (type === 'ios' || !deferredPrompt) {
      // Mostrar guía iOS
      if (iosModal) iosModal.style.display = 'flex';
    }
  });

  closeIosBtn?.addEventListener('click', () => {
    iosModal.style.display = 'none';
    banner?.remove();
    localStorage.setItem('mr_pwa_dismissed', Date.now().toString());
  });

  doneIosBtn?.addEventListener('click', () => {
    iosModal.style.display = 'none';
    banner?.remove();
    localStorage.setItem('mr_pwa_dismissed', Date.now().toString());
  });
}

// Iniciar automáticamente
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPwaInstall);
  } else {
    initPwaInstall();
  }
}
