import { auth, isDeveloper, onAuthStateChanged } from './firebase-config.js';

export function protectDevPage() {
  let resolved = false;

  onAuthStateChanged(auth, (user) => {
    resolved = true;
    if (isDeveloper(user)) {
      revealPage();
    } else {
      kickOut();
    }
  });

  // Temporizador de seguridad: si en 1.5 segundos no está autenticado como desarrollador, expulsar a 404
  setTimeout(() => {
    if (!resolved) {
      const user = auth.currentUser;
      if (isDeveloper(user)) {
        revealPage();
      } else {
        kickOut();
      }
    }
  }, 1500);
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

// Ejecutar automáticamente al cargar el script
protectDevPage();
