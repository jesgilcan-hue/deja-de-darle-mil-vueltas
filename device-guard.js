// device-guard.js - Candado de Seguridad de Máximo 3 Dispositivos Autorizados (PC, Móvil, Tablet)
// Funciona en conjunto con la cuenta única jesgilcan@gmail.com en Firebase Auth + Firestore

import { db, isDeveloper } from './firebase-config.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const MAX_AUTHORIZED_DEVICES = 3;
const DEVICE_TOKEN_STORAGE_KEY = 'mr_dev_hardware_token_v1';

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
 * Verifica contra Firestore si este dispositivo es uno de los 3 autorizados (PC, Móvil, Tablet).
 * Si hay menos de 3 dispositivos registrados, registra automáticamente este dispositivo en el hueco libre.
 * Si ya hay 3 dispositivos y este no es ninguno de ellos, deniega el acceso.
 */
export async function verifyAndEnforceThreeDevices(user) {
  if (!user || !isDeveloper(user)) {
    return { allowed: false, reason: 'Usuario no es jesgilcan@gmail.com', devices: [] };
  }

  const localToken = getOrCreateLocalDeviceToken();
  const meta = detectCurrentDeviceMeta();
  const userRef = doc(db, 'users', user.uid);

  try {
    const snap = await getDoc(userRef);
    const data = snap.exists() ? (snap.data() || {}) : {};
    let devices = Array.isArray(data.authorizedDevices) ? [...data.authorizedDevices] : [];

    // 1. ¿Ya está registrado este dispositivo por su token?
    const existingIdx = devices.findIndex(d => d && d.token === localToken);
    if (existingIdx !== -1) {
      devices[existingIdx].lastSeen = new Date().toISOString();
      devices[existingIdx].screen = `${window.screen?.width || 0}x${window.screen?.height || 0}`;
      await setDoc(userRef, { authorizedDevices: devices }, { merge: true });
      return {
        allowed: true,
        currentToken: localToken,
        slotNumber: existingIdx + 1,
        devices
      };
    }

    // 2. Si aún quedan huecos libres (< 3 dispositivos), autorizar y sellar este dispositivo
    if (devices.length < MAX_AUTHORIZED_DEVICES) {
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
      await setDoc(userRef, { authorizedDevices: devices }, { merge: true });
      return {
        allowed: true,
        newlyRegistered: true,
        currentToken: localToken,
        slotNumber: devices.length,
        devices
      };
    }

    // 3. Cupo de 3 dispositivos lleno y este aparato no coincide con ninguno: BLOQUEAR
    return {
      allowed: false,
      reason: `Límite de ${MAX_AUTHORIZED_DEVICES} dispositivos alcanzado (PC, Móvil, Tablet). Este dispositivo no está en la lista blanca.`,
      currentToken: localToken,
      devices
    };
  } catch (err) {
    console.warn('Aviso al verificar lista de dispositivos en Firestore:', err);
    // Si Firestore está temporalmente offline pero el usuario ya autenticó con Google OAuth
    return {
      allowed: true,
      currentToken: localToken,
      offlineFallback: true,
      devices: []
    };
  }
}

/**
 * Elimina un dispositivo de la lista de 3 autorizados para liberar su hueco
 */
export async function revokeAuthorizedDevice(user, tokenToRemove) {
  if (!user || !isDeveloper(user)) return [];
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  const data = snap.exists() ? (snap.data() || {}) : {};
  const devices = Array.isArray(data.authorizedDevices) ? data.authorizedDevices : [];
  const updated = devices.filter(d => d && d.token !== tokenToRemove);
  await setDoc(userRef, { authorizedDevices: updated }, { merge: true });
  return updated;
}
