// device-guard.js - Candado Silencioso de Doble Llave para Máximo 3 Dispositivos Autorizados (PC, Móvil, Tablet)
// 1. Si un 4.º dispositivo entra con jesgilcan@gmail.com: la web NO muestra absolutamente nada (vista normal de cliente).
// 2. En segundo plano se registra la solicitud y se envía un email automático a jesgilcan@gmail.com (Llave 1).
// 3. Hasta que no se pulse el enlace del email Y se autorice el reemplazo desde uno de los 3 dispositivos ya validados (Llave 2), el nuevo dispositivo tiene acceso CERO.

import { db, isDeveloper } from './firebase-config.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const MAX_AUTHORIZED_DEVICES = 3;
const DEVICE_TOKEN_STORAGE_KEY = 'mr_dev_hardware_token_v1';
const PENDING_EMAIL_VERIFY_STORAGE_KEY = 'mr_pending_device_email_verify';

// Capturar silenciosamente el token de verificación por email si viene en la URL y limpiar la barra de direcciones
function captureEmailVerificationFromUrl() {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('device_email_verify');
    if (code) {
      localStorage.setItem(PENDING_EMAIL_VERIFY_STORAGE_KEY, code.trim());
      params.delete('device_email_verify');
      const rest = params.toString();
      const cleanUrl = window.location.pathname + (rest ? `?${rest}` : '') + (window.location.hash || '');
      window.history.replaceState({}, document.title, cleanUrl);
      return code.trim();
    }
    return localStorage.getItem(PENDING_EMAIL_VERIFY_STORAGE_KEY) || null;
  } catch (e) {
    return null;
  }
}

// Ejecutar captura al cargar el módulo
captureEmailVerificationFromUrl();

/**
 * Detecta el tipo y nombre amigable del dispositivo actual (PC, Móvil o Tablet)
 */
export function detectCurrentDeviceMeta() {
  const ua = navigator.userAgent || '';
  const isIPad = /iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isTablet = isIPad || /Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua));
  const isMobile = !isTablet && /Mobi|Android|iPhone|iPod/i.test(ua);

  let os = 'Sistema';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (isIPad) os = 'iPadOS';
  else if (/iPhone/i.test(ua)) os = 'iOS (iPhone)';
  else if (/Mac/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Navegador';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = 'Opera';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';

  if (isTablet) {
    return { type: 'tablet', icon: '📟', name: `Tablet · ${os} (${browser})` };
  }
  if (isMobile) {
    return { type: 'mobile', icon: '📱', name: `Móvil · ${os} (${browser})` };
  }
  return { type: 'pc', icon: '💻', name: `PC · ${os} (${browser})` };
}

/**
 * Obtiene o genera el token único persistente de este dispositivo
 */
export function getOrCreateLocalDeviceToken() {
  try {
    let token = localStorage.getItem(DEVICE_TOKEN_STORAGE_KEY);
    if (!token) {
      const rand = crypto.randomUUID
        ? crypto.randomUUID()
        : ('dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 12));
      const meta = detectCurrentDeviceMeta();
      token = `${meta.type}_${rand}`;
      localStorage.setItem(DEVICE_TOKEN_STORAGE_KEY, token);
    }
    return token;
  } catch (e) {
    return 'fallback_session_device';
  }
}

/**
 * Envía en segundo plano y en total silencio el correo de alerta a jesgilcan@gmail.com
 * cuando un 4.º dispositivo no autorizado inicia sesión con su cuenta de Google.
 */
export async function sendSilentDeviceVerificationEmail(user, pendingDevice) {
  if (!user || !isDeveloper(user) || !pendingDevice) return false;

  try {
    const idToken = await user.getIdToken();
    const origin = (typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost'))
      ? window.location.origin
      : 'https://www.editorialmenosruido.com';

    const verifyUrl = `${origin}/mi-espacio.html?device_email_verify=${encodeURIComponent(pendingDevice.emailVerificationCode)}`;
    const dateFormatted = new Date(pendingDevice.detectedAt || Date.now()).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const subject = `🔐 Nuevo dispositivo detectado en silencio (${pendingDevice.name})`;
    const bodyText = [
      `Se ha detectado un inicio de sesión con tu cuenta de Google (jesgilcan@gmail.com) desde un dispositivo o navegador que NO está entre tus 3 equipos autorizados.`,
      `Tal y como está configurado el candado silencioso, la página web NO ha mostrado ningún mensaje ni rastro del panel de desarrollador en ese dispositivo.`,
      `Datos del dispositivo detectado:\n• Equipo / Navegador: ${pendingDevice.icon || '💻'} ${pendingDevice.name}\n• Resolución de pantalla: ${pendingDevice.screen || 'N/A'}\n• Fecha y hora: ${dateFormatted}`,
      `Si eres tú y quieres autorizar este nuevo dispositivo para sustituir a uno de tus 3 equipos actuales (PC, Móvil o Tablet), completa los 2 pasos obligatorios:\n\n1. PASO 1 (Desde este correo en tu Gmail): Pulsa el botón de abajo para validar la Llave 1.\n2. PASO 2 (Desde uno de tus dispositivos ya autorizados): Entra en tu Panel de Desarrollador desde tu PC, Móvil o Tablet actual y confirma a qué equipo sustituye (Llave 2).`,
      `Si no quieres autorizar este navegador o estás haciendo una prueba, simplemente ignora este mensaje: ese dispositivo seguirá viendo únicamente la web normal de cliente.`
    ].join('\n\n');

    const payload = {
      to: 'jesgilcan@gmail.com',
      subject,
      preheader: `Solicitud silenciosa de nuevo dispositivo: ${pendingDevice.name}`,
      bodyText,
      buttonText: '🔐 Paso 1/2: Validar este nuevo dispositivo desde mi Gmail',
      buttonUrl: verifyUrl,
      senderType: 'contacto',
      showSecondaryLinks: false,
      showUnsubscribe: false
    };

    let res = null;
    try {
      res = await fetch('/api/send-admin-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(payload)
      });
    } catch (localErr) {
      // Fallback a producción si se prueba desde localhost
      res = await fetch('https://www.editorialmenosruido.com/api/send-admin-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(payload)
      });
    }

    if (res && res.ok) {
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Verifica en silencio si este dispositivo es uno de los 3 autorizados.
 * - También procesa en segundo plano cualquier código ?device_email_verify=... pendiente.
 * - Si los 3 huecos ya están ocupados y entra un 4.º dispositivo, NO muestra nada en la web,
 *   guarda el intento en pendingDevices y dispara el email a jesgilcan@gmail.com.
 */
export async function verifyAndEnforceThreeDevices(user) {
  if (!user || !isDeveloper(user)) {
    return { allowed: false, silentLock: true, devices: [], pendingDevices: [] };
  }

  const localToken = getOrCreateLocalDeviceToken();
  const meta = detectCurrentDeviceMeta();
  const userRef = doc(db, 'users', user.uid);
  const pendingEmailCode = captureEmailVerificationFromUrl();

  try {
    const snap = await getDoc(userRef);
    const data = snap.exists() ? (snap.data() || {}) : {};
    let devices = Array.isArray(data.authorizedDevices) ? [...data.authorizedDevices] : [];
    let pendingDevices = Array.isArray(data.pendingDevices) ? [...data.pendingDevices] : [];
    let threeDevicesSealed = !!data.threeDevicesSealed || devices.length >= MAX_AUTHORIZED_DEVICES;
    let emailJustVerified = false;
    let verifiedDeviceName = '';

    // 0. ¿Venimos de pulsar el enlace de verificación del email (Paso 1/2)?
    if (pendingEmailCode) {
      const pIdx = pendingDevices.findIndex(p => p && p.emailVerificationCode === pendingEmailCode);
      if (pIdx !== -1) {
        pendingDevices[pIdx].emailVerified = true;
        pendingDevices[pIdx].emailVerifiedAt = new Date().toISOString();
        emailJustVerified = true;
        verifiedDeviceName = pendingDevices[pIdx].name || 'Nuevo dispositivo';
        await setDoc(userRef, { pendingDevices }, { merge: true });
      }
      try { localStorage.removeItem(PENDING_EMAIL_VERIFY_STORAGE_KEY); } catch (e) {}
    }

    // 1. ¿Es este aparato uno de los 3 dispositivos autorizados?
    const existingIdx = devices.findIndex(d => d && d.token === localToken);
    if (existingIdx !== -1) {
      devices[existingIdx].lastSeen = new Date().toISOString();
      devices[existingIdx].screen = `${window.screen?.width || 0}x${window.screen?.height || 0}`;
      await setDoc(userRef, {
        authorizedDevices: devices,
        threeDevicesSealed: devices.length >= MAX_AUTHORIZED_DEVICES ? true : threeDevicesSealed
      }, { merge: true });

      return {
        allowed: true,
        currentToken: localToken,
        slotNumber: existingIdx + 1,
        devices,
        pendingDevices,
        emailJustVerified,
        verifiedDeviceName
      };
    }

    // 2. Si aún no se habían sellado los 3 dispositivos iniciales (< 3), registrar hueco inicial
    if (devices.length < MAX_AUTHORIZED_DEVICES && !threeDevicesSealed) {
      const newDevice = {
        token: localToken,
        type: meta.type,
        icon: meta.icon,
        name: meta.name,
        screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
        registeredAt: new Date().toISOString(),
        lastSeen: new Date().toISOString()
      };
      devices.push(newDevice);
      const nowSealed = devices.length >= MAX_AUTHORIZED_DEVICES;
      await setDoc(userRef, {
        authorizedDevices: devices,
        threeDevicesSealed: nowSealed
      }, { merge: true });

      return {
        allowed: true,
        newlyRegistered: true,
        currentToken: localToken,
        slotNumber: devices.length,
        devices,
        pendingDevices,
        emailJustVerified,
        verifiedDeviceName
      };
    }

    // 3. CANDADO SILENCIOSO ACTIVO: Ya existen los 3 dispositivos y este es un 4.º dispositivo desconocido.
    // La web NO dice nada. Registramos en segundo plano y enviamos email a jesgilcan@gmail.com (una sola vez por dispositivo).
    let pendingEntry = pendingDevices.find(p => p && p.token === localToken);
    if (!pendingEntry) {
      const randCode = crypto.randomUUID
        ? crypto.randomUUID()
        : ('code_' + Date.now() + '_' + Math.random().toString(36).substring(2, 12));

      pendingEntry = {
        token: localToken,
        type: meta.type,
        icon: meta.icon,
        name: meta.name,
        screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
        detectedAt: new Date().toISOString(),
        lastAttemptAt: new Date().toISOString(),
        emailVerificationCode: `ev_${randCode}`,
        emailVerified: false,
        emailVerifiedAt: null,
        emailSent: false
      };
      pendingDevices.unshift(pendingEntry);
      // Limitar historial de pendientes a máximo 10 para mantener limpio Firestore
      pendingDevices = pendingDevices.slice(0, 10);
      await setDoc(userRef, { pendingDevices, threeDevicesSealed: true }, { merge: true });
    } else {
      pendingEntry.lastAttemptAt = new Date().toISOString();
      pendingEntry.screen = `${window.screen?.width || 0}x${window.screen?.height || 0}`;
      await setDoc(userRef, { pendingDevices }, { merge: true });
    }

    if (!pendingEntry.emailSent) {
      const sentOk = await sendSilentDeviceVerificationEmail(user, pendingEntry);
      if (sentOk) {
        pendingEntry.emailSent = true;
        pendingEntry.emailSentAt = new Date().toISOString();
        await setDoc(userRef, { pendingDevices }, { merge: true });
      }
    }

    // Devolver allowed: false en total silencio
    return {
      allowed: false,
      silentLock: true,
      currentToken: localToken,
      devices: [],
      pendingDevices: []
    };
  } catch (err) {
    // En caso de fallo de red, por seguridad cerramos acceso si no podemos verificar
    return {
      allowed: false,
      silentLock: true,
      currentToken: localToken,
      devices: [],
      pendingDevices: []
    };
  }
}

/**
 * PASO 2/2: Ejecutado ÚNICAMENTE desde uno de los 3 dispositivos ya autorizados.
 * Verifica que el nuevo dispositivo ya haya sido validado desde el email en Gmail (emailVerified === true)
 * y sustituye el hueco elegido (0 = PC, 1 = Móvil, 2 = Tablet) por el nuevo dispositivo.
 */
export async function approveAndReplaceAuthorizedDevice(user, pendingToken, slotIndexToReplace) {
  if (!user || !isDeveloper(user)) {
    throw new Error('No autorizado');
  }

  const localToken = getOrCreateLocalDeviceToken();
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  const data = snap.exists() ? (snap.data() || {}) : {};
  const devices = Array.isArray(data.authorizedDevices) ? [...data.authorizedDevices] : [];
  const pendingDevices = Array.isArray(data.pendingDevices) ? [...data.pendingDevices] : [];

  // Verificar que quien aprueba es uno de los 3 dispositivos ya autorizados
  const callerIsAuthorized = devices.some(d => d && d.token === localToken);
  if (!callerIsAuthorized) {
    throw new Error('Solo puedes aprobar un cambio desde uno de tus 3 dispositivos ya autorizados.');
  }

  const pendingIdx = pendingDevices.findIndex(p => p && p.token === pendingToken);
  if (pendingIdx === -1) {
    throw new Error('No se encontró la solicitud del dispositivo pendiente.');
  }

  const candidate = pendingDevices[pendingIdx];
  if (!candidate.emailVerified) {
    throw new Error('Falta el Paso 1/2: Primero debes pulsar el enlace de autorización enviado a tu correo jesgilcan@gmail.com.');
  }

  const targetSlot = Number(slotIndexToReplace);
  if (isNaN(targetSlot) || targetSlot < 0 || targetSlot >= MAX_AUTHORIZED_DEVICES) {
    throw new Error('Selecciona cuál de los 3 dispositivos actuales quieres sustituir.');
  }

  const replacedDevice = devices[targetSlot] || null;
  const newAuthorizedDevice = {
    token: candidate.token,
    type: candidate.type || 'pc',
    icon: candidate.icon || '💻',
    name: candidate.name || 'Dispositivo Autorizado',
    screen: candidate.screen || 'N/A',
    registeredAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    replacedPreviousName: replacedDevice ? replacedDevice.name : null
  };

  devices[targetSlot] = newAuthorizedDevice;
  const updatedPending = pendingDevices.filter(p => p && p.token !== pendingToken);

  await setDoc(userRef, {
    authorizedDevices: devices,
    pendingDevices: updatedPending,
    threeDevicesSealed: true
  }, { merge: true });

  return {
    devices,
    pendingDevices: updatedPending,
    newAuthorizedDevice,
    replacedDevice
  };
}

/**
 * Rechaza y elimina una solicitud de dispositivo pendiente desde un dispositivo autorizado
 */
export async function rejectPendingDeviceRequest(user, pendingToken) {
  if (!user || !isDeveloper(user)) return { devices: [], pendingDevices: [] };
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  const data = snap.exists() ? (snap.data() || {}) : {};
  const devices = Array.isArray(data.authorizedDevices) ? data.authorizedDevices : [];
  const pendingDevices = Array.isArray(data.pendingDevices) ? data.pendingDevices : [];
  const updatedPending = pendingDevices.filter(p => p && p.token !== pendingToken);
  await setDoc(userRef, { pendingDevices: updatedPending }, { merge: true });
  return { devices, pendingDevices: updatedPending };
}

/**
 * Reenvía el correo de validación (Paso 1/2) a jesgilcan@gmail.com para un dispositivo pendiente
 */
export async function resendPendingDeviceVerificationEmail(user, pendingToken) {
  if (!user || !isDeveloper(user)) return false;
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  const data = snap.exists() ? (snap.data() || {}) : {};
  const pendingDevices = Array.isArray(data.pendingDevices) ? [...data.pendingDevices] : [];
  const item = pendingDevices.find(p => p && p.token === pendingToken);
  if (!item) return false;

  const ok = await sendSilentDeviceVerificationEmail(user, item);
  if (ok) {
    item.emailSent = true;
    item.emailSentAt = new Date().toISOString();
    await setDoc(userRef, { pendingDevices }, { merge: true });
  }
  return ok;
}

/**
 * Se mantiene por compatibilidad pero ya no permite dejar huecos abiertos sin doble validación
 */
export async function revokeAuthorizedDevice(user) {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  const data = snap.exists() ? (snap.data() || {}) : {};
  return Array.isArray(data.authorizedDevices) ? data.authorizedDevices : [];
}
