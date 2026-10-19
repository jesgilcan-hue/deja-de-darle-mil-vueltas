// dev-guard.js - Control estricto de acceso para páginas ocultas de desarrollo
// Exclusivo para jesgilcan@gmail.com + Lista Blanca de máximo 3 dispositivos (PC, Móvil, Tablet)
import { auth, isDeveloper, onAuthStateChanged } from './firebase-config.js';
import { verifyAndEnforceThreeDevices } from './device-guard.js';

export function protectDevPage() {
  let authResolved = false;

  onAuthStateChanged(auth, async (user) => {
    authResolved = true;
    if (user && isDeveloper(user)) {
      const deviceCheck = await verifyAndEnforceThreeDevices(user);
      if (deviceCheck.allowed) {
        revealPage();
      } else {
        console.warn('⛔ Dispositivo bloqueado (fuera del cupo de 3 dispositivos):', deviceCheck.reason);
        kickOut();
      }
    } else {
      // Para cualquier usuario que no sea jesgilcan@gmail.com: 404 inmediato
      kickOut();
    }
  });

  // Temporizador de seguridad: si Firebase Auth no certifica jesgilcan@gmail.com, expulsión a 404
  setTimeout(async () => {
    if (!authResolved) {
      if (auth.currentUser && isDeveloper(auth.currentUser)) {
        const deviceCheck = await verifyAndEnforceThreeDevices(auth.currentUser);
        if (deviceCheck.allowed) {
          revealPage();
        } else {
          kickOut();
        }
      } else {
        kickOut();
      }
    }
  }, 2200);
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
