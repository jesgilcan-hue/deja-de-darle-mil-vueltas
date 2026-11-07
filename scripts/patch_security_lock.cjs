const fs = require('fs');
const path = require('path');

// =========================================================================
// 1. api/create-checkout-session.js
// =========================================================================
const apiCheckoutPath = path.join(__dirname, '..', 'api', 'create-checkout-session.js');
let apiCode = fs.readFileSync(apiCheckoutPath, 'utf8');

const securityBlock = `function isAuthorizedTestAccount(email) {
  if (!email || typeof email !== 'string') return false;
  const em = email.toLowerCase().trim();
  const username = em.split('@')[0];
  
  const exactWhitelist = [
    'jesgilcan@gmail.com',
    'jesgilcan@hotmail.com',
    'jesusgil_87@hotmail.com',
    'jesusgil_87@gmail.com',
    'jesusgil87@hotmail.com',
    'jesusgil87@gmail.com'
  ];
  if (exactWhitelist.includes(em)) return true;

  if (username === 'jesgilcan' || username.startsWith('jesgilcan')) return true;
  if (username === 'jesusgil_87' || username === 'jesusgil87' || username.startsWith('jesusgil_87') || username.startsWith('jesusgil87')) return true;

  return false;
}

async function verifyDeveloperIdToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Acceso restringido: debes iniciar sesión con una cuenta autorizada.' };
  }
  const idToken = authHeader.replace('Bearer ', '').trim();
  if (!idToken) {
    return { valid: false, error: 'Token de sesión vacío.' };
  }

  try {
    const verifyRes = await fetch(
      \`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=\${FIREBASE_WEB_API_KEY}\`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      }
    );
    const verifyData = await verifyRes.json();
    if (!verifyRes.ok || !verifyData.users || !verifyData.users.length) {
      return { valid: false, error: 'Sesión de Firebase inválida o expirada.' };
    }
    
    let userEmail = (verifyData.users[0].email || '').toLowerCase().trim();
    if (!userEmail && Array.isArray(verifyData.users[0].providerUserInfo)) {
      for (const p of verifyData.users[0].providerUserInfo) {
        if (p.email) {
          userEmail = p.email.toLowerCase().trim();
          break;
        }
      }
    }

    if (!isAuthorizedTestAccount(userEmail)) {
      return { 
        valid: false, 
        error: 'La tienda se encuentra en fase privada de pruebas. Las compras con tarjeta solo están autorizadas para las cuentas de prueba oficiales (jesgilcan y jesusgil_87).' 
      };
    }

    const uid = verifyData.users[0].localId || '';
    return { valid: true, email: userEmail, uid };
  } catch (err) {
    return { valid: false, error: 'Error verificando identidad en Google Identity Toolkit.' };
  }
}`;

// Reemplazar verifyDeveloperIdToken en api/create-checkout-session.js
const regexVerify = /async function verifyDeveloperIdToken\(req\)[\s\S]*?^}/m;
if (regexVerify.test(apiCode)) {
  apiCode = apiCode.replace(regexVerify, securityBlock);
  fs.writeFileSync(apiCheckoutPath, apiCode, 'utf8');
  console.log('1. api/create-checkout-session.js blindado con lista blanca exclusiva para jesgilcan y jesusgil_87.');
} else {
  console.warn('1. No se pudo reemplazar verifyDeveloperIdToken en api/create-checkout-session.js');
}

// =========================================================================
// 2. firebase-config.js (Robustecer isDeveloper y isTestCustomer)
// =========================================================================
const fbConfigPath = path.join(__dirname, '..', 'firebase-config.js');
let fbCode = fs.readFileSync(fbConfigPath, 'utf8');

const oldIsDev = `export function isDeveloper(user) {
  if (!user) return false;
  const email = getUserEmail(user).toLowerCase().trim();
  if (!email) return false;
  return DEVELOPER_EMAILS.some(e => e.toLowerCase() === email);
}`;

const newIsDev = `export function isDeveloper(user) {
  if (!user) return false;
  const email = getUserEmail(user).toLowerCase().trim();
  if (!email) return false;
  const username = email.split('@')[0];
  return DEVELOPER_EMAILS.some(e => e.toLowerCase() === email) || username === 'jesgilcan' || username.startsWith('jesgilcan');
}`;

const oldIsTest = `export function isTestCustomer(user) {
  if (!user) return false;
  const email = getUserEmail(user).toLowerCase().trim();
  if (!email) return false;
  return TEST_CUSTOMER_EMAILS.some(e => e.toLowerCase() === email);
}`;

const newIsTest = `export function isTestCustomer(user) {
  if (!user) return false;
  const email = getUserEmail(user).toLowerCase().trim();
  if (!email) return false;
  const username = email.split('@')[0];
  return TEST_CUSTOMER_EMAILS.some(e => e.toLowerCase() === email) || username === 'jesusgil_87' || username === 'jesusgil87' || username.startsWith('jesusgil_87');
}`;

fbCode = fbCode.replace(oldIsDev, newIsDev).replace(oldIsDev.replace(/\n/g, '\r\n'), newIsDev.replace(/\n/g, '\r\n'));
fbCode = fbCode.replace(oldIsTest, newIsTest).replace(oldIsTest.replace(/\n/g, '\r\n'), newIsTest.replace(/\n/g, '\r\n'));
fs.writeFileSync(fbConfigPath, fbCode, 'utf8');
console.log('2. firebase-config.js actualizado con soporte para todas las cuentas de jesgilcan y jesusgil_87.');

// =========================================================================
// 3. generador-portadas.html (Bloquear botón de cesta solo para cuentas autorizadas)
// =========================================================================
const portadasPath = path.join(__dirname, '..', 'generador-portadas.html');
let portadasCode = fs.readFileSync(portadasPath, 'utf8');

const targetCart = `            const cartWrapper = document.getElementById('devCartWrapper');
            if (cartWrapper) {
                cartWrapper.style.setProperty('display', 'flex', 'important');
            }`;

const lockedCart = `            const cartWrapper = document.getElementById('devCartWrapper');
            if (cartWrapper) {
                const canBuy = !!user && (isDeveloper(user) || isTestCustomer(user));
                cartWrapper.style.setProperty('display', canBuy ? 'flex' : 'none', 'important');
            }`;

portadasCode = portadasCode.replace(targetCart, lockedCart).replace(targetCart.replace(/\n/g, '\r\n'), lockedCart.replace(/\n/g, '\r\n'));
fs.writeFileSync(portadasPath, portadasCode, 'utf8');
console.log('3. generador-portadas.html: botón de compra restringido a cuentas autorizadas.');

// =========================================================================
// 4. mi-espacio.js (Validar en frontend antes de llamar a la pasarela)
// =========================================================================
const miEspacioPath = path.join(__dirname, '..', 'mi-espacio.js');
let miEspacioCode = fs.readFileSync(miEspacioPath, 'utf8');

const lockCheckLogic = `  // Comprobación de seguridad: la tienda está en modo privado exclusivo para jesgilcan y jesusgil_87
  const currentEmail = (user ? getUserEmail(user) : '').toLowerCase().trim();
  const currentUsername = currentEmail.split('@')[0];
  const isAuthorizedClient = currentUsername === 'jesgilcan' || 
                             currentUsername.startsWith('jesgilcan') || 
                             currentUsername === 'jesusgil_87' || 
                             currentUsername === 'jesusgil87' || 
                             currentUsername.startsWith('jesusgil_87');

  if (!isAuthorizedClient) {
    alert('🔒 Tienda en Fase Privada de Pruebas\\n\\nEl trámite de compra con tarjeta está restringido temporalmente a las cuentas de prueba autorizadas (jesgilcan y jesusgil_87).');
    if (confirmBtn) confirmBtn.disabled = false;
    if (confirmTxt) confirmTxt.textContent = \`Pagar con Tarjeta · \${totalAmount.toFixed(2).replace('.', ',')} € (Envío incluido)\`;
    return;
  }`;

// Insertamos la comprobación justo antes de la llamada a fetch('/api/create-checkout-session'
const targetFetch = '  // Iniciar sesión segura en Stripe Checkout';
if (miEspacioCode.includes(targetFetch) && !miEspacioCode.includes('isAuthorizedClient')) {
  miEspacioCode = miEspacioCode.replace(targetFetch, lockCheckLogic + '\n\n' + targetFetch);
  fs.writeFileSync(miEspacioPath, miEspacioCode, 'utf8');
  console.log('4. mi-espacio.js: blindaje añadido para bloquear usuarios no autorizados antes de Stripe.');
} else {
  console.log('4. mi-espacio.js ya tenía el blindaje o no se encontró el delimitador.');
}

console.log('=== BLINDAJE COMPLETADO CON ÉXITO ===');
