// dev-guard.js - Control estricto de acceso para páginas ocultas
// A cualquier usuario de fuera le sale 404. Solo jesgilcan@gmail.com puede entrar.
import { auth, isDeveloper, onAuthStateChanged, DEVELOPER_PIN } from './firebase-config.js';

export function protectDevPage() {
  // 0. Si estamos en desarrollo local (localhost / 127.0.0.1) o ya se desbloqueó con PIN en /apps
  if (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    localStorage.getItem('mr_apps_unlocked') === '1' ||
    sessionStorage.getItem('mr_apps_unlocked') === '1'
  ) {
    revealPage();
    return;
  }

  // 1. Si se accede con la clave maestra en la URL (?pin=1111 o ?key=1111), autorizar
  const urlParams = new URLSearchParams(window.location.search);
  const pinParam = urlParams.get('pin') || urlParams.get('key');
  if (pinParam === DEVELOPER_PIN) {
    try {
      localStorage.setItem('mr_dev_authorized', 'jesgilcan@gmail.com');
      sessionStorage.setItem('mr_dev_authorized', 'jesgilcan@gmail.com');
    } catch (e) {}
    revealPage();
    return;
  }

  // 2. Si ya está autenticado como jesgilcan@gmail.com en Firebase Auth
  if (auth.currentUser && isDeveloper(auth.currentUser)) {
    try {
      localStorage.setItem('mr_dev_authorized', 'jesgilcan@gmail.com');
    } catch (e) {}
    revealPage();
    return;
  }

  // 3. Comprobar si este navegador ya fue autenticado previamente por jesgilcan
  let isKnownDevDevice = false;
  try {
    isKnownDevDevice = (
      localStorage.getItem('mr_dev_authorized') === 'jesgilcan@gmail.com' ||
      sessionStorage.getItem('mr_dev_authorized') === 'jesgilcan@gmail.com'
    );
  } catch (e) {}

  let authResolved = false;

  onAuthStateChanged(auth, (user) => {
    authResolved = true;
    if (isDeveloper(user)) {
      try {
        localStorage.setItem('mr_dev_authorized', 'jesgilcan@gmail.com');
      } catch (e) {}
      revealPage();
    } else {
      // Para cualquier usuario que no sea jesgilcan: 404 inmediato
      kickOut();
    }
  });

  // Temporizador de seguridad: si no se resuelve como desarrollador, 404 absoluto
  const timeoutMs = isKnownDevDevice ? 3000 : 800;
  setTimeout(() => {
    if (!authResolved) {
      if (auth.currentUser && isDeveloper(auth.currentUser)) {
        revealPage();
      } else {
        kickOut();
      }
    }
  }, timeoutMs);
}

function kickOut() {
  window.location.replace('/404.html');
}

function revealPage() {
  const style = document.getElementById('mr-dev-guard-style');
  if (style) style.remove();
  document.documentElement.style.display = '';
  if (document.body) document.body.style.display = '';
}

// Ejecutar automáticamente al cargar
protectDevPage();
