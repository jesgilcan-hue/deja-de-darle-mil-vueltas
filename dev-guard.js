// dev-guard.js - Control de acceso infranqueable para páginas ocultas de desarrollador
import { auth, googleProvider, isDeveloper, DEVELOPER_PIN, onAuthStateChanged, signInWithPopup } from './firebase-config.js';

let isUnlocked = false;

export function protectDevPage() {
  // 1. Verificación instantánea si ya está desbloqueado en esta sesión del navegador
  try {
    if (sessionStorage.getItem('mr_dev_pin_verified') === 'true') {
      revealPage();
      return;
    }
  } catch (e) {}

  // 2. Comprobar si Firebase Auth ya tiene la sesión del desarrollador activa
  if (auth.currentUser && isDeveloper(auth.currentUser)) {
    grantAccess();
    return;
  }

  // 3. Escuchar cambios de estado en Firebase Auth
  onAuthStateChanged(auth, (user) => {
    if (isDeveloper(user)) {
      grantAccess();
    }
  });

  // 4. Si en 600 ms no se ha autenticado automáticamente, mostrar pantalla de desbloqueo dev
  setTimeout(() => {
    if (!isUnlocked) {
      // Comprobar una última vez por si Firebase tardó un poco
      if (auth.currentUser && isDeveloper(auth.currentUser)) {
        grantAccess();
        return;
      }
      showDevAuthOverlay();
    }
  }, 600);
}

function grantAccess() {
  isUnlocked = true;
  try {
    sessionStorage.setItem('mr_dev_pin_verified', 'true');
  } catch (e) {}
  hideDevAuthOverlay();
  revealPage();
}

function revealPage() {
  isUnlocked = true;
  const style = document.getElementById('mr-dev-guard-style');
  if (style) style.remove();
  document.documentElement.style.display = '';
  if (document.body) document.body.style.display = '';
}

function hideDevAuthOverlay() {
  const overlay = document.getElementById('mr-dev-guard-overlay');
  if (overlay) overlay.remove();
}

let failedAttempts = 0;

function showDevAuthOverlay() {
  if (document.getElementById('mr-dev-guard-overlay')) return;

  // Quitar el display none global para poder renderizar el overlay de seguridad
  const style = document.getElementById('mr-dev-guard-style');
  if (style) style.remove();
  document.documentElement.style.display = '';
  if (document.body) document.body.style.display = '';

  const overlay = document.createElement('div');
  overlay.id = 'mr-dev-guard-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: #141312;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    box-sizing: border-box;
    font-family: system-ui, -apple-system, sans-serif;
  `;

  overlay.innerHTML = `
    <div style="background: #1f1d1a; border: 1px solid rgba(255,255,255,0.12); border-radius: 16px; padding: 36px 28px; max-width: 420px; width: 100%; box-shadow: 0 25px 60px rgba(0,0,0,0.6); text-align: center; color: #f3eee5;">
      <div style="font-size: 2.4rem; margin-bottom: 12px;">🔒</div>
      <h2 style="font-size: 1.35rem; font-weight: 700; margin: 0 0 8px 0; color: #ffffff; letter-spacing: -0.01em;">Acceso Desarrollador</h2>
      <p style="color: #a89f91; font-size: 0.88rem; line-height: 1.45; margin: 0 0 24px 0;">Esta página es privada. Introduce tu PIN maestro o accede con tu cuenta autorizada.</p>

      <!-- PIN Input -->
      <form id="mr-dev-pin-form" onsubmit="return false;" style="margin-bottom: 20px;">
        <label for="mr-dev-guard-pin" style="display: block; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; color: #c4b5a2; margin-bottom: 8px; font-weight: 600;">PIN Maestro (4 dígitos)</label>
        <input type="password" id="mr-dev-guard-pin" maxlength="4" placeholder="••••" autocomplete="off" autofocus style="width: 160px; text-align: center; font-size: 1.6rem; letter-spacing: 0.35em; padding: 10px; border-radius: 10px; border: 2px solid rgba(255,255,255,0.15); background: #141312; color: #ffffff; outline: none; margin: 0 auto 12px; display: block;" />
        <button type="submit" id="mr-btn-unlock-pin" style="width: 100%; padding: 12px; background: #87553b; color: #ffffff; border: none; border-radius: 10px; font-weight: 600; font-size: 0.95rem; cursor: pointer; transition: background 0.2s;">Desbloquear con PIN</button>
      </form>

      <div style="display: flex; align-items: center; margin: 20px 0; gap: 12px;">
        <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.1);"></div>
        <span style="font-size: 0.78rem; color: #8a8275; text-transform: uppercase;">o con tu cuenta</span>
        <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.1);"></div>
      </div>

      <!-- Botón Google -->
      <button type="button" id="mr-btn-dev-google" style="width: 100%; padding: 11px; background: #2a2724; color: #f3eee5; border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; font-weight: 500; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 18px;">
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
        Entrar con Google (jesgilcan@gmail.com)
      </button>

      <div id="mr-dev-guard-error" style="color: #f87171; font-size: 0.85rem; margin-bottom: 14px; display: none;"></div>

      <a href="/" style="display: inline-block; color: #8a8275; text-decoration: none; font-size: 0.82rem; transition: color 0.2s;">← Volver a la web pública</a>
    </div>
  `;

  document.body.appendChild(overlay);

  const pinInput = document.getElementById('mr-dev-guard-pin');
  const pinForm = document.getElementById('mr-dev-pin-form');
  const googleBtn = document.getElementById('mr-btn-dev-google');
  const errorBox = document.getElementById('mr-dev-guard-error');

  function showError(msg) {
    if (errorBox) {
      errorBox.textContent = msg;
      errorBox.style.display = 'block';
    }
  }

  pinForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const pin = pinInput?.value.trim();
    if (pin === DEVELOPER_PIN) {
      grantAccess();
    } else {
      failedAttempts++;
      showError('PIN incorrecto.');
      if (pinInput) {
        pinInput.value = '';
        pinInput.focus();
      }
      if (failedAttempts >= 5) {
        window.location.replace('/');
      }
    }
  });

  googleBtn?.addEventListener('click', async () => {
    try {
      showError('Conectando con Google...');
      const result = await signInWithPopup(auth, googleProvider);
      if (isDeveloper(result.user)) {
        grantAccess();
      } else {
        showError(`Cuenta no autorizada (${result.user.email || 'desconocida'}). Acceso denegado.`);
      }
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        showError('Error al iniciar sesión con Google.');
      }
    }
  });

  setTimeout(() => pinInput?.focus(), 100);
}

// Ejecutar automáticamente al cargar el script
protectDevPage();
