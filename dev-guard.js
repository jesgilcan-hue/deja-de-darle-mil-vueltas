// dev-guard.js - Control estricto de acceso para páginas ocultas de desarrollo
// A cualquier usuario ajeno le devuelve 404. Exclusivo para jesgilcan@gmail.com autenticado en Firebase Auth.
import { auth, isDeveloper, onAuthStateChanged } from './firebase-config.js';

export function protectDevPage() {
  // 1. Si ya está autenticado en memoria como jesgilcan@gmail.com en Firebase Auth
  if (auth.currentUser && isDeveloper(auth.currentUser)) {
    revealPage();
    return;
  }

  let authResolved = false;

  onAuthStateChanged(auth, (user) => {
    authResolved = true;
    if (user && isDeveloper(user)) {
      revealPage();
    } else {
      // Para cualquier usuario que no sea jesgilcan@gmail.com: 404 inmediato
      kickOut();
    }
  });

  // Temporizador de seguridad: si Firebase Auth no certifica jesgilcan@gmail.com, expulsión a 404
  setTimeout(() => {
    if (!authResolved) {
      if (auth.currentUser && isDeveloper(auth.currentUser)) {
        revealPage();
      } else {
        kickOut();
      }
    }
  }, 2000);
}

function kickOut() {
  try {
    localStorage.removeItem('mr_apps_unlocked');
    sessionStorage.removeItem('mr_apps_unlocked');
    localStorage.removeItem('mr_dev_authorized');
    sessionStorage.removeItem('mr_dev_authorized');
  } catch (e) {}
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
