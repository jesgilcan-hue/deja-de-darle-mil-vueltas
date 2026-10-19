// auth-modal.js - Modal de acceso y gestión del estado del usuario en la cabecera
import { 
  auth, 
  googleProvider, 
  syncUserProfile, 
  isDeveloper,
  getUserEmail,
  getUserDisplayName
} from './firebase-config.js';
import { verifyAndEnforceThreeDevices } from './device-guard.js';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
} from 'firebase/auth';

// Crear e inyectar el Modal de Acceso en el DOM si no existe
let pendingAuthOptions = null;

// Crear e inyectar el Modal de Acceso en el DOM si no existe
function injectAuthModal() {
  if (document.getElementById('auth-modal-overlay')) return;

  const modalHtml = `
    <div id="auth-modal-overlay" class="auth-modal-overlay" style="display: none;">
      <div class="auth-modal-card">
        <button type="button" class="auth-modal-close" id="auth-modal-close-btn" aria-label="Cerrar ventana">×</button>
        
        <div class="auth-modal-header">
          <span class="auth-modal-brand" id="auth-modal-brand">Menos Ruido</span>
          <h2 class="auth-modal-title" id="auth-modal-title">Tu espacio personal</h2>
          <p class="auth-modal-subtitle" id="auth-modal-subtitle">Guarda tus configuraciones, tus páginas personalizadas y tus datos sin fricción.</p>
        </div>

        <div class="auth-modal-body">
          <!-- Botón Google -->
          <button type="button" class="btn-auth-google" id="btn-google-login">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Continuar con Google
          </button>

          <div class="auth-divider">
            <span>o con tu correo electrónico</span>
          </div>

          <!-- Acceso por email (Passwordless / Enlace de acceso) -->
          <form id="auth-email-form" class="auth-form" onsubmit="return false;">
            <div class="auth-input-group">
              <label for="auth-email-input">Correo electrónico</label>
              <input type="email" id="auth-email-input" placeholder="tu@email.com" required autocomplete="email" />
            </div>
            <button type="submit" class="btn-auth-email" id="btn-email-submit">
              Enviar enlace de acceso
            </button>
            <p class="auth-form-help">Te enviaremos un enlace seguro a tu bandeja de entrada. Sin necesidad de recordar contraseñas.</p>
          </form>

          <!-- Consentimiento RGPD para Boletín y Novedades -->
          <div class="auth-newsletter-box" style="margin-top: 15px; margin-bottom: 6px; text-align: left; font-size: 0.81rem; color: #5a524b; display: flex; align-items: flex-start; gap: 9px; line-height: 1.45; background: #faf8f5; border: 1px solid #ebd8c8; border-radius: 8px; padding: 10px 12px;">
            <input type="checkbox" id="auth-newsletter-checkbox" style="margin-top: 2px; accent-color: #87553b; cursor: pointer; flex-shrink: 0;" />
            <label for="auth-newsletter-checkbox" style="cursor: pointer; user-select: none;">
              Quiero recibir avisos de nuevos lanzamientos, recursos en PDF y ofertas de Editorial Menos Ruido (puedes darte de baja cuando quieras con un solo clic).
            </label>
          </div>

          <div id="auth-status-msg" class="auth-status-msg" style="display: none;"></div>
        </div>

        <div class="auth-modal-footer">
          <p>Al acceder, aceptas el uso de cookies técnicas para mantener tu sesión activa.</p>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Event Listeners del Modal
  const overlay = document.getElementById('auth-modal-overlay');
  const closeBtn = document.getElementById('auth-modal-close-btn');
  const googleBtn = document.getElementById('btn-google-login');
  const emailForm = document.getElementById('auth-email-form');
  const emailInput = document.getElementById('auth-email-input');
  const statusMsg = document.getElementById('auth-status-msg');

  closeBtn?.addEventListener('click', closeAuthModal);
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) closeAuthModal();
  });

  // Inicio de sesión con Google
  googleBtn?.addEventListener('click', async () => {
    try {
      showStatus('Conectando con Google...', 'info');
      const newsletterConsent = !!document.getElementById('auth-newsletter-checkbox')?.checked;
      const result = await signInWithPopup(auth, googleProvider);
      await syncUserProfile(result.user, { newsletterConsent });
      if (isDeveloper(result.user)) {
        try { sessionStorage.setItem('mr_dev_pin_verified', 'true'); } catch (e) {}
      }
      showStatus('¡Acceso concedido!', 'success');
      setTimeout(() => {
        closeAuthModal();

        const opts = pendingAuthOptions;
        pendingAuthOptions = null;

        // Si se abrió para completar una acción pendiente (guardar o descargar), ejecutarla sin recargar página
        if (opts && typeof opts.onSuccess === 'function') {
          try {
            opts.onSuccess(result.user);
          } catch (cbErr) {
            console.error('Error en onSuccess tras login:', cbErr);
          }
          window.dispatchEvent(new CustomEvent('mr-auth-success', { detail: result.user }));
          return;
        }

        // Si hay una URL de retorno o estamos en un generador, nos quedamos o volvemos a la página
        const returnUrl = window.localStorage.getItem('mr_auth_return_url');
        if (returnUrl) {
          window.localStorage.removeItem('mr_auth_return_url');
          if (returnUrl !== window.location.href) {
            window.location.href = returnUrl;
            return;
          }
        }
        // Si estamos en Mi Espacio (soporta /mi-espacio y /mi-espacio.html por cleanUrls), recargar la página
        const currentPath = window.location.pathname.toLowerCase();
        if (currentPath.includes('mi-espacio')) {
          window.location.reload();
        } else {
          // Si estamos en un generador o página de libro, emitir evento para actualizar navbar sin parpadeo
          window.dispatchEvent(new CustomEvent('mr-auth-success', { detail: result.user }));
        }
      }, 500);
    } catch (err) {
      console.error('Error Google Auth:', err);
      if (err.code === 'auth/unauthorized-domain') {
        showStatus(`El dominio "${window.location.hostname}" no está autorizado en Firebase. Añádelo en Firebase Console > Authentication > Ajustes > Dominios autorizados.`, 'error');
      } else if (err.code !== 'auth/popup-closed-by-user') {
        showStatus(`Error (${err.code || 'desconocido'}): No se pudo completar el acceso con Google.`, 'error');
      } else {
        hideStatus();
      }
    }
  });

  // Inicio de sesión por enlace sin contraseña
  emailForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    if (!email) return;

    try {
      showStatus('Generando tu enlace de acceso seguro...', 'info');
      const newsletterConsent = !!document.getElementById('auth-newsletter-checkbox')?.checked;
      try {
        window.localStorage.setItem('mr_pending_newsletter_consent', newsletterConsent ? 'true' : 'false');
      } catch (e) {}

      const returnUrl = window.location.href;
      window.localStorage.setItem('mr_auth_return_url', returnUrl);
      const actionCodeSettings = {
        url: returnUrl,
        handleCodeInApp: true
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      showStatus(`Enlace enviado a ${email}. Revisa tu bandeja de entrada y pulsa en el enlace para entrar.`, 'success');
      emailInput.value = '';
    } catch (err) {
      console.error('Error enlace email:', err);
      showStatus('No se pudo enviar el enlace. Verifica el correo e inténtalo de nuevo.', 'error');
    }
  });
}

function showStatus(text, type = 'info') {
  const el = document.getElementById('auth-status-msg');
  if (!el) return;
  el.textContent = text;
  el.className = `auth-status-msg auth-status-${type}`;
  el.style.display = 'block';
}

function hideStatus() {
  const el = document.getElementById('auth-status-msg');
  if (el) el.style.display = 'none';
}

export function openAuthModal(options = null) {
  pendingAuthOptions = options;
  injectAuthModal();
  const overlay = document.getElementById('auth-modal-overlay');
  const titleEl = document.getElementById('auth-modal-title');
  const subtitleEl = document.getElementById('auth-modal-subtitle');
  const brandEl = document.getElementById('auth-modal-brand');
  const checkboxEl = document.getElementById('auth-newsletter-checkbox');

  if (titleEl) {
    titleEl.textContent = options?.title || 'Tu espacio personal';
  }
  if (subtitleEl) {
    subtitleEl.textContent = options?.subtitle || 'Guarda tus configuraciones, tus páginas personalizadas y tus datos sin fricción.';
  }
  if (brandEl) {
    brandEl.textContent = options?.badge || 'Menos Ruido';
  }
  if (checkboxEl) {
    checkboxEl.checked = false; // RGPD: siempre desmarcada por defecto
  }

  if (overlay) {
    hideStatus();
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

export function closeAuthModal() {
  const overlay = document.getElementById('auth-modal-overlay');
  if (overlay) {
    overlay.style.display = 'none';
    document.body.style.overflow = '';
  }
}

// Función auxiliar para escapar texto en HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Inyectar o actualizar el botón de usuario en la barra de navegación y en el menú lateral
export function setupNavbarAuth() {
  if (window.__mrNavbarAuthInitialized) return;
  window.__mrNavbarAuthInitialized = true;

  injectAuthModal();

  // Buscar el header de navegación
  let userWrap = document.getElementById('header-user-btn-wrap');

  if (!userWrap) {
    userWrap = document.createElement('div');
    userWrap.id = 'header-user-btn-wrap';
    userWrap.className = 'header-user-btn-wrap';

    const container = document.querySelector('header .container') || document.querySelector('header');
    if (container) {
      container.appendChild(userWrap);
    }
  }

  // Actualizar icono de usuario y tarjeta en el menú drawer lateral
  const updateDrawerUser = (user) => {
    const drawerBtn = document.getElementById('drawer-user-btn');
    const drawerCardWrap = document.getElementById('drawer-user-card-wrap');

    if (user) {
      const email = getUserEmail(user);
      const name = getUserDisplayName(user);
      const initial = (name || email || 'U').charAt(0).toUpperCase();

      if (drawerBtn) {
        drawerBtn.innerHTML = user.photoURL 
          ? `<img src="${user.photoURL}" alt="" />`
          : `<span class="drawer-user-initial">${initial}</span>`;
        drawerBtn.title = `Mi Espacio (${name})`;
        drawerBtn.onclick = () => {
          document.body.classList.remove('nav-open');
          window.location.href = '/mi-espacio.html';
        };
      }

      if (drawerCardWrap) {
        drawerCardWrap.innerHTML = `
          <div class="drawer-user-card">
            <div class="drawer-user-card-header">
              <div class="drawer-user-card-avatar">${user.photoURL ? `<img src="${user.photoURL}" alt="" />` : initial}</div>
              <div class="drawer-user-card-info">
                <div class="drawer-user-card-name">${escapeHtml(name)}</div>
                <div class="drawer-user-card-email">${escapeHtml(user.email || '')}</div>
              </div>
            </div>
            <div class="drawer-user-card-links">
              <a href="/mi-espacio.html" class="drawer-user-pill-link" onclick="document.body.classList.remove('nav-open')">
                👤 Mi Espacio
              </a>
              <a href="/mi-espacio.html?tab=disenos" class="drawer-user-pill-link" onclick="document.body.classList.remove('nav-open')">
                📐 Mis Plantillas
              </a>
            </div>
          </div>
        `;
      }
    } else {
      if (drawerBtn) {
        drawerBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      `;
        drawerBtn.title = 'Acceder a tu cuenta';
        drawerBtn.onclick = () => {
          document.body.classList.remove('nav-open');
          openAuthModal();
        };
      }

      if (drawerCardWrap) {
        drawerCardWrap.innerHTML = `
          <div class="drawer-unauth-box">
            <button type="button" class="drawer-unauth-btn" id="drawer-login-action-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Acceder a Mi Espacio</span>
            </button>
          </div>
        `;
        document.getElementById('drawer-login-action-btn')?.addEventListener('click', () => {
          document.body.classList.remove('nav-open');
          openAuthModal();
        });
      }
    }
  };

  // Escuchar cambios de autenticación en tiempo real
  onAuthStateChanged(auth, async (user) => {
    updateDrawerUser(user);

    if (user) {
      const email = getUserEmail(user);
      const name = getUserDisplayName(user);
      let isDev = false;
      if (isDeveloper(user)) {
        const devDeviceCheck = await verifyAndEnforceThreeDevices(user);
        isDev = !!devDeviceCheck.allowed;
      }
      const initial = (name || email || 'U').charAt(0).toUpperCase();

      // Guardar en caché para carga ultrarrápida (nunca cachear permisos dev en aparatos no autorizados)
      try {
        if (email) {
          localStorage.setItem('mr_user_pdf_email', email);
        }
        localStorage.setItem('mr_cached_user', JSON.stringify({
          displayName: name,
          email: email,
          photoURL: user.photoURL || '',
          isDev: false
        }));
      } catch (e) {}
      window.mrAuthUserEmail = email;

      // Sincronizar en segundo plano solo si hace más de 24h para no penalizar la velocidad de navegación
      try {
        const lastSync = parseInt(localStorage.getItem('mr_last_sync') || '0', 10);
        const now = Date.now();
        if (now - lastSync > 24 * 60 * 60 * 1000) {
          localStorage.setItem('mr_last_sync', String(now));
          syncUserProfile(user).catch(err => console.warn('Sync profile bg:', err));
        }
      } catch (e) {}

      const firstName = name.split(' ')[0];

      userWrap.innerHTML = `
        <div class="nav-user-dropdown-wrap" id="nav-user-dropdown-wrap">
          <button type="button" class="nav-user-pill ${isDev ? 'is-dev' : ''}" id="nav-user-pill-toggle" aria-expanded="false" title="Mi Cuenta">
            <span class="user-pill-avatar">${user.photoURL ? `<img src="${user.photoURL}" alt="" />` : initial}</span>
            <span class="user-pill-name">${escapeHtml(firstName)}</span>
            ${isDev ? '<span class="dev-badge">DEV</span>' : ''}
            <svg class="user-pill-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M1 1l4 4 4-4"/></svg>
          </button>
          <div class="nav-user-dropdown-menu" id="nav-user-dropdown-menu">
            <div class="dropdown-user-header">
              <div class="dropdown-user-name">${escapeHtml(name)}</div>
              <div class="dropdown-user-email">${escapeHtml(email || '')}</div>
            </div>
            <div class="dropdown-user-divider"></div>
            <a href="/mi-espacio.html" class="dropdown-user-item">
              <span class="item-icon">👤</span>
              <span>Mi Espacio</span>
            </a>
            <a href="/mi-espacio.html?tab=disenos" class="dropdown-user-item">
              <span class="item-icon">📐</span>
              <span>Mis Plantillas y Diseños</span>
            </a>
            <a href="/mi-espacio.html?tab=ajustes" class="dropdown-user-item">
              <span class="item-icon">⚙️</span>
              <span>Ajustes de cuenta</span>
            </a>
            ${isDev ? `
            <a href="/mi-espacio.html?tab=dev" class="dropdown-user-item item-dev" id="nav-dropdown-dev-link">
              <span class="item-icon">⚡</span>
              <span>Panel Desarrollador</span>
              <span class="dev-badge">DEV</span>
            </a>
            ` : ''}
            <div class="dropdown-user-divider"></div>
            <button type="button" class="dropdown-user-item item-logout" id="dropdown-logout-btn">
              <span class="item-icon">🚪</span>
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      `;

      // Interacción Dropdown
      const dropdownWrap = document.getElementById('nav-user-dropdown-wrap');
      const toggleBtn = document.getElementById('nav-user-pill-toggle');
      const logoutBtn = document.getElementById('dropdown-logout-btn');
      const devLink = document.getElementById('nav-dropdown-dev-link');

      devLink?.addEventListener('click', (e) => {
        if (window.location.pathname.toLowerCase().includes('mi-espacio')) {
          e.preventDefault();
          window.location.search = '?tab=dev';
        }
      });

      toggleBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdownWrap.classList.toggle('is-open');
        toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });

      logoutBtn?.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await signOut(auth);
          window.location.href = '/';
        } catch (err) {
          console.error('Error al cerrar sesión:', err);
        }
      });

      // Cerrar dropdown al hacer clic fuera
      document.addEventListener('click', (e) => {
        if (dropdownWrap && !dropdownWrap.contains(e.target)) {
          dropdownWrap.classList.remove('is-open');
          toggleBtn?.setAttribute('aria-expanded', 'false');
        }
      });

    } else {
      // Usuario no autenticado
      userWrap.innerHTML = `
        <button type="button" class="nav-login-btn" id="header-login-btn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>Acceder</span>
        </button>
      `;

      document.getElementById('header-login-btn')?.addEventListener('click', openAuthModal);
    }
  });

  // Re-chequear el botón del drawer tras montar el DOM
  setTimeout(() => {
    updateDrawerUser(auth.currentUser);
  }, 350);

  // Verificar si venimos de un enlace de email sin contraseña
  checkEmailLinkCallback();
}

// Modal elegante estilo Menos Ruido para confirmar el correo al pulsar en el enlace
function promptEmailConfirmation(callback) {
  let modal = document.getElementById('email-confirm-modal');
  if (!modal) {
    const html = `
      <div id="email-confirm-modal" class="auth-modal-overlay" style="display: flex;">
        <div class="auth-modal-card">
          <div class="auth-modal-header">
            <span class="auth-modal-brand">Menos Ruido</span>
            <h2 class="auth-modal-title">Confirma tu correo</h2>
            <p class="auth-modal-subtitle">Para completar el acceso con tu enlace seguro, escribe o confirma la dirección de correo a la que lo enviamos:</p>
          </div>
          <form id="email-confirm-form" class="auth-form" onsubmit="return false;">
            <div class="auth-input-group">
              <label for="email-confirm-input">Correo electrónico</label>
              <input type="email" id="email-confirm-input" placeholder="tu@email.com" required autocomplete="email" autofocus />
            </div>
            <button type="submit" class="btn-auth-email" id="btn-email-confirm-submit">
              Completar acceso
            </button>
            <div id="email-confirm-status" class="auth-status-msg" style="display: none;"></div>
          </form>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    modal = document.getElementById('email-confirm-modal');
  }

  const form = document.getElementById('email-confirm-form');
  const input = document.getElementById('email-confirm-input');
  const status = document.getElementById('email-confirm-status');

  form.onsubmit = async (e) => {
    e.preventDefault();
    const email = input.value.trim();
    if (!email) return;

    status.textContent = 'Verificando enlace...';
    status.className = 'auth-status-msg auth-status-info';
    status.style.display = 'block';

    callback(email, (success, errMsg) => {
      if (success) {
        status.textContent = '¡Acceso completado! Entrando a tu espacio...';
        status.className = 'auth-status-msg auth-status-success';
        setTimeout(() => {
          modal.remove();
          const returnUrl = window.localStorage.getItem('mr_auth_return_url');
          if (returnUrl) {
            window.localStorage.removeItem('mr_auth_return_url');
            if (returnUrl !== window.location.href) {
              window.location.href = returnUrl;
              return;
            }
          }
          if (window.location.pathname.endsWith('mi-espacio.html')) {
            window.location.reload();
          } else {
            window.dispatchEvent(new CustomEvent('mr-auth-success', { detail: auth.currentUser }));
          }
        }, 700);
      } else {
        status.textContent = errMsg || 'El enlace no es válido o ha expirado. Vuelve a solicitar otro.';
        status.className = 'auth-status-msg auth-status-error';
      }
    });
  };
}

// Procesa el callback si el usuario pulsó en el correo
async function checkEmailLinkCallback() {
  if (isSignInWithEmailLink(auth, window.location.href)) {
    let email = window.localStorage.getItem('emailForSignIn');
    const pendingConsent = window.localStorage.getItem('mr_pending_newsletter_consent');
    const extraData = {};
    if (pendingConsent !== null) {
      extraData.newsletterConsent = pendingConsent === 'true';
      window.localStorage.removeItem('mr_pending_newsletter_consent');
    }

    if (email) {
      try {
        const result = await signInWithEmailLink(auth, email, window.location.href);
        window.localStorage.removeItem('emailForSignIn');
        await syncUserProfile(result.user, extraData);
        window.history.replaceState({}, document.title, window.location.pathname);
        const returnUrl = window.localStorage.getItem('mr_auth_return_url');
        if (returnUrl) {
          window.localStorage.removeItem('mr_auth_return_url');
          if (returnUrl !== window.location.href) {
            window.location.href = returnUrl;
            return;
          }
        }
        if (window.location.pathname.endsWith('mi-espacio.html')) {
          window.location.reload();
        } else {
          window.dispatchEvent(new CustomEvent('mr-auth-success', { detail: result.user }));
        }
      } catch (err) {
        console.error('Error auto-login email link:', err);
        promptEmailConfirmation((em, done) => performSignInWithEmail(em, extraData, done));
      }
    } else {
      promptEmailConfirmation((em, done) => performSignInWithEmail(em, extraData, done));
    }
  }
}

async function performSignInWithEmail(email, extraData, done) {
  try {
    const result = await signInWithEmailLink(auth, email, window.location.href);
    window.localStorage.removeItem('emailForSignIn');
    await syncUserProfile(result.user, extraData || {});
    window.history.replaceState({}, document.title, window.location.pathname);
    done(true);
  } catch (err) {
    console.error('Error signInWithEmailLink:', err);
    done(false, 'El enlace ha expirado o ya fue utilizado.');
  }
}

// Inicializar automáticamente cuando el DOM esté listo
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupNavbarAuth);
  } else {
    setupNavbarAuth();
  }
}
