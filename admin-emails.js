// admin-emails.js - Gestor y Editor en Vivo de Plantillas de Email para Editorial Menos Ruido
import { auth, db, isDeveloper, DEVELOPER_PIN, getUserEmail } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// ESTADO GLOBAL
let currentTemplateKey = 'compra';
let emailTemplates = {};
let isAuthorized = false;

// ELEMENTOS DEL DOM
const authGate = document.getElementById('authGate');
const adminMain = document.getElementById('adminMain');
const gatePinInput = document.getElementById('gatePinInput');
const btnGateUnlock = document.getElementById('btnGateUnlock');
const gateErrorMsg = document.getElementById('gateErrorMsg');
const gateUserEmail = document.getElementById('gateUserEmail');
const btnAdminLogout = document.getElementById('btnAdminLogout');

// Editor
const templatesList = document.getElementById('templatesList');
const editTemplateTitle = document.getElementById('editTemplateTitle');
const editTemplateTrigger = document.getElementById('editTemplateTrigger');
const editTemplateSender = document.getElementById('editTemplateSender');
const tplSubject = document.getElementById('tplSubject');
const tplPreheader = document.getElementById('tplPreheader');
const tplBody = document.getElementById('tplBody');
const tplButtonText = document.getElementById('tplButtonText');
const btnSaveTemplate = document.getElementById('btnSaveTemplate');
const btnResetTemplate = document.getElementById('btnResetTemplate');
const btnTestSendMail = document.getElementById('btnTestSendMail');

// Canvas Preview
const emailCanvas = document.getElementById('emailCanvas');
const prevSubject = document.getElementById('prevSubject');
const prevBody = document.getElementById('prevBody');
const prevHighlightBox = document.getElementById('prevHighlightBox');
const prevActionBtn = document.getElementById('prevActionBtn');
const prevSecondaryLinks = document.getElementById('prevSecondaryLinks');
const prevUnsubscribeNote = document.getElementById('prevUnsubscribeNote');

// =========================================================================
// 1. BLINDAJE DE SEGURIDAD ABSOLUTO (EXPULSIÓN A 404 SI NO ES ADMINISTRADOR)
// =========================================================================

function kickOut(reason = 'Acceso no autorizado') {
  console.warn('⛔ Blindaje activado:', reason);
  try {
    sessionStorage.removeItem('mr_admin_pin_verified');
    sessionStorage.removeItem('mr_dev_pin_verified');
  } catch (e) {}
  window.location.replace('/404.html');
}

function revealPage() {
  const guardStyle = document.getElementById('mr-admin-guard-style');
  if (guardStyle) guardStyle.remove();
  document.documentElement.style.display = '';
  if (document.body) document.body.style.display = '';
}

function isLocalDev() {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

function assertAuthorized() {
  if (isLocalDev()) return true;
  if (!auth.currentUser || !isDeveloper(auth.currentUser)) {
    kickOut('Intento de acción sin autenticación de administrador');
    return false;
  }
  return true;
}

let authResolved = false;

document.addEventListener('DOMContentLoaded', () => {
  setupSecurityGate();
  setupEditorEvents();

  // Escucha de sesión Firebase Auth
  onAuthStateChanged(auth, (user) => {
    authResolved = true;
    handleAuthVerification(user);
  });

  // Temporizador de expulsión inmediata (1200 ms)
  setTimeout(() => {
    if (!authResolved) {
      if (isLocalDev()) {
        revealPage();
        unlockManager();
      } else if (auth.currentUser && isDeveloper(auth.currentUser)) {
        handleAuthVerification(auth.currentUser);
      } else {
        kickOut('Tiempo de espera agotado sin sesión de administrador');
      }
    }
  }, 1200);
});

function handleAuthVerification(user) {
  if (!isLocalDev()) {
    if (!user || !isDeveloper(user)) {
      kickOut(user ? `Usuario ajeno bloqueado: ${getUserEmail(user)}` : 'Visitante no autenticado');
      return;
    }
  }

  revealPage();

  const pinAlreadyVerified = (
    sessionStorage.getItem('mr_admin_pin_verified') === 'true' ||
    sessionStorage.getItem('mr_dev_pin_verified') === 'true'
  );

  if (pinAlreadyVerified || isLocalDev()) {
    unlockManager();
  } else {
    showPinGate(user);
  }
}

function showPinGate(user) {
  if (authGate) authGate.style.display = 'flex';
  if (adminMain) adminMain.style.display = 'none';
  if (gateUserEmail) {
    gateUserEmail.textContent = getUserEmail(user) || 'jesgilcan@gmail.com';
  }
  if (gatePinInput) {
    gatePinInput.value = '';
    gatePinInput.focus();
  }
}

function setupSecurityGate() {
  btnGateUnlock?.addEventListener('click', handlePinUnlock);
  gatePinInput?.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') handlePinUnlock();
  });

  btnAdminLogout?.addEventListener('click', async () => {
    sessionStorage.removeItem('mr_admin_pin_verified');
    sessionStorage.removeItem('mr_dev_pin_verified');
    try { await signOut(auth); } catch (e) {}
    window.location.replace('/');
  });
}

function handlePinUnlock() {
  if (!assertAuthorized()) return;

  const pin = gatePinInput ? gatePinInput.value.trim() : '';
  if (pin === DEVELOPER_PIN) {
    sessionStorage.setItem('mr_admin_pin_verified', 'true');
    if (gateErrorMsg) gateErrorMsg.style.display = 'none';
    unlockManager();
    showToast('✓ Identidad confirmada · Plantillas');
  } else {
    if (gateErrorMsg) gateErrorMsg.style.display = 'block';
    if (gatePinInput) {
      gatePinInput.value = '';
      gatePinInput.focus();
    }
  }
}

function unlockManager() {
  if (!assertAuthorized()) return;

  isAuthorized = true;
  if (authGate) authGate.style.display = 'none';
  if (adminMain) adminMain.style.display = 'block';
  initTemplatesCatalog();
}

// =========================================================================
// 2. CATÁLOGO OFICIAL DE PLANTILLAS (MENOS RUIDO)
// =========================================================================

const DEFAULT_TEMPLATES = {
  compra: {
    name: "Compra Confirmada & Recibo",
    icon: "💳",
    trigger: "Inmediato tras pago Stripe",
    sender: "pedidos@editorialmenosruido.com",
    replyTo: "contacto@editorialmenosruido.com",
    subject: "Tu pedido #{numero_pedido} está confirmado · Editorial Menos Ruido",
    preheader: "Gracias por confiar en el papel. Tu cuaderno personalizado ya está en proceso.",
    body: `Hola {nombre_cliente},

Te confirmamos que hemos recibido tu pedido #{numero_pedido} y el pago se ha procesado correctamente.

Cada uno de nuestros ejemplares se imprime y encuaderna bajo demanda. Antes de mandar tu cuaderno a imprenta, revisamos los márgenes, el lomo milimétrico y la resolución de 300 DPI de tu diseño.

Puedes consultar la vista previa exacta de lo que has diseñado o descargar tu recibo de compra en los siguientes enlaces:`,
    buttonText: "Ver el diseño de mi cuaderno ↗",
    showHighlightBox: true,
    showSecondaryLinks: true,
    showUnsubscribe: false
  },

  imprenta: {
    name: "Diseño Aprobado · En Imprenta",
    icon: "🏭",
    trigger: "Al pulsar «Aprobar y Enviar a Lulu»",
    sender: "pedidos@editorialmenosruido.com",
    replyTo: "contacto@editorialmenosruido.com",
    subject: "Tu cuaderno #{numero_pedido} ha entrado en imprenta 🖨️",
    preheader: "Revisión técnica de lomo y sangrado superada con éxito.",
    body: `Hola {nombre_cliente},

Te escribimos para avisarte de que hemos revisado los archivos de tu {titulo_cuaderno} ({formato}) y la verificación técnica de preflight es 100% correcta.

Tu ejemplar acaba de entrar en cola de fabricación en la imprenta. La impresión de tripa, el guillotinado y la encuadernación tardan habitualmente entre 2 y 4 días laborables.

En cuanto el paquete esté listo y empaquetado para el transporte, te enviaremos el número de seguimiento de Correos Express para que puedas ver por dónde va.`,
    buttonText: "Consultar estado del pedido ↗",
    showHighlightBox: true,
    showSecondaryLinks: false,
    showUnsubscribe: false
  },

  tracking: {
    name: "Enviado con Tracking",
    icon: "📦",
    trigger: "Al despachar Lulu con Correos Express",
    sender: "pedidos@editorialmenosruido.com",
    replyTo: "contacto@editorialmenosruido.com",
    subject: "Tu cuaderno #{numero_pedido} está en camino (Tracking Correos) 🚚",
    preheader: "Tu paquete ha salido de imprenta con Correos Express.",
    body: `Hola {nombre_cliente},

¡Buenas noticias! Tu cuaderno ha salido de la imprenta y ya viaja hacia la dirección que nos facilitaste:
{direccion_entrega}

El envío se realiza mediante mensajería urgente con Correos Express. La entrega estimada se realiza habitualmente en 24/48 horas laborables.

Puedes seguir en tiempo real la localización del paquete con este botón o introduciendo tu código de seguimiento {tracking_code} en la web de Correos:`,
    buttonText: "Rastrear mi paquete en Correos Express ↗",
    showHighlightBox: true,
    showSecondaryLinks: false,
    showUnsubscribe: false
  },

  ausente: {
    name: "Incidencia / Ausente en Reparto",
    icon: "⚠️",
    trigger: "Si Correos no localiza al destinatario",
    sender: "pedidos@editorialmenosruido.com",
    replyTo: "contacto@editorialmenosruido.com",
    subject: "Aviso de entrega: No hemos podido localizarte (Pedido #{numero_pedido})",
    preheader: "Tu paquete está a salvo y pendiente de entrega o recogida.",
    body: `Hola {nombre_cliente},

El transportista de Correos nos ha informado de que ha intentado entregar tu paquete hoy en {direccion_entrega}, pero no ha sido posible localizar a nadie en el domicilio.

Tu cuaderno está seguro. Puedes solicitar un segundo intento de entrega o retirarlo en la oficina de Correos más cercana a tu domicilio.

Si necesitas que modifiquemos algún detalle de la dirección o indicaciones para el repartidor, puedes responder directamente a este correo o entrar en el enlace:`,
    buttonText: "Ver estado y reprogramar entrega ↗",
    showHighlightBox: true,
    showSecondaryLinks: true,
    showUnsubscribe: false
  },

  entregado: {
    name: "¡Paquete Entregado!",
    icon: "📬",
    trigger: "Cuando Correos marca entrega efectiva",
    sender: "pedidos@editorialmenosruido.com",
    replyTo: "contacto@editorialmenosruido.com",
    subject: "Tu cuaderno #{numero_pedido} ha sido entregado ✨",
    preheader: "Tu pedido ya está en tu dirección.",
    body: `Hola {nombre_cliente},

El sistema de mensajería nos confirma que tu paquete #{numero_pedido} ha sido entregado con éxito en tu dirección o conserjería.

Esperamos que te resulte muy útil y práctico para organizar tu trabajo y tus semanas en papel, sin pantallas ni distracciones.

(Si por cualquier motivo no tuvieras el paquete o hubiera alguna incidencia con el paquete, respóndenos a este mismo correo y te ayudamos de inmediato).`,
    buttonText: "Ver detalles de la entrega ↗",
    showHighlightBox: true,
    showSecondaryLinks: true,
    showUnsubscribe: false
  },

  checkin: {
    name: "Check-in a los 7 Días",
    icon: "📋",
    trigger: "Automático 7 días tras la entrega",
    sender: "contacto@editorialmenosruido.com",
    replyTo: "contacto@editorialmenosruido.com",
    subject: "¿Qué tal te está funcionando tu cuaderno? · Editorial Menos Ruido",
    preheader: "Queríamos saber cómo te va con tu planificador.",
    body: `Hola {nombre_cliente},

Hace una semana que recibiste tu {titulo_cuaderno} y te escribimos para preguntarte directamente:

¿Qué tal te está funcionando? ¿Te está ayudando a organizar tus días de forma clara y sin complicaciones?

Si hay algo que creas que podemos mejorar en las páginas, la maquetación o el papel, o simplemente quieres compartir tus impresiones, responde directamente a este correo. Leemos y contestamos siempre.`,
    buttonText: "Escribir al equipo de la editorial ↗",
    showHighlightBox: false,
    showSecondaryLinks: false,
    showUnsubscribe: true
  },

  cancelado: {
    name: "Cancelación & Reembolso Stripe",
    icon: "🛑",
    trigger: "Al cancelar el pedido antes de imprenta",
    sender: "pedidos@editorialmenosruido.com",
    replyTo: "contacto@editorialmenosruido.com",
    subject: "Pedido #{numero_pedido} cancelado · Reembolso confirmado",
    preheader: "Confirmación de la devolución del importe a tu tarjeta.",
    body: `Hola {nombre_cliente},

Te confirmamos que, tal y como acordamos, hemos cancelado tu pedido #{numero_pedido} a tiempo, antes de que entrara en las máquinas de imprenta.

Hemos ordenado el reembolso completo a través de nuestra pasarela Stripe directamente a la misma tarjeta con la que realizaste el pago. El dinero suele reflejarse en tu cuenta bancaria en un plazo de 2 a 4 días laborables según tu entidad.

Lamentamos que esta vez no haya podido ser. Si más adelante decides retomar tu cuaderno, tus borradores seguirán disponibles en tu cuenta.`,
    buttonText: "Consultar recibo de cancelación ↗",
    showHighlightBox: true,
    showSecondaryLinks: true,
    showUnsubscribe: false
  },

  soporte: {
    name: "Mensaje Directo Editorial",
    icon: "✉️",
    trigger: "Envío manual desde el panel de pedidos",
    sender: "contacto@editorialmenosruido.com",
    replyTo: "contacto@editorialmenosruido.com",
    subject: "Mensaje sobre tu pedido #{numero_pedido} · Editorial Menos Ruido",
    preheader: "Te escribimos personalmente en relación a tu cuaderno.",
    body: `Hola {nombre_cliente},

Me pongo en contacto contigo en relación a tu pedido #{numero_pedido} de tu {titulo_cuaderno}.

[Escribe aquí tu mensaje personalizado para el cliente, aclaraciones sobre la portada, ajustes en la dirección o cualquier duda técnica...]

Quedo a tu total disposición. Puedes responder directamente a este mensaje.`,
    buttonText: "Responder a este mensaje ↗",
    showHighlightBox: false,
    showSecondaryLinks: false,
    showUnsubscribe: false
  }
};

// =========================================================================
// 3. INICIALIZACIÓN Y RENDERIZADO DEL ESPACIO DE TRABAJO
// =========================================================================

function initTemplatesCatalog() {
  loadSavedTemplates();
  renderTemplatesNav();
  selectTemplate('compra');
}

function loadSavedTemplates() {
  let stored = {};
  try {
    const raw = localStorage.getItem('mr_email_templates');
    if (raw) stored = JSON.parse(raw);
  } catch (e) {}

  emailTemplates = {};
  Object.keys(DEFAULT_TEMPLATES).forEach(key => {
    emailTemplates[key] = {
      ...DEFAULT_TEMPLATES[key],
      ...(stored[key] || {})
    };
  });
}

function renderTemplatesNav() {
  if (!templatesList) return;
  templatesList.innerHTML = '';

  Object.keys(emailTemplates).forEach(key => {
    const tpl = emailTemplates[key];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `template-nav-item ${key === currentTemplateKey ? 'active' : ''}`;
    btn.onclick = () => selectTemplate(key);
    btn.innerHTML = `
      <div class="nav-item-left">
        <span class="nav-icon">${tpl.icon}</span>
        <div class="nav-text-block">
          <span class="nav-name">${escapeHtml(tpl.name)}</span>
          <span class="nav-sub">${escapeHtml(tpl.trigger)}</span>
        </div>
      </div>
      <span style="font-size:0.8rem; color:#aaa;">›</span>
    `;
    templatesList.appendChild(btn);
  });
}

function selectTemplate(key) {
  currentTemplateKey = key;
  renderTemplatesNav();

  const tpl = emailTemplates[key];
  if (!tpl) return;

  editTemplateTitle.textContent = `${tpl.icon} ${tpl.name}`;
  editTemplateTrigger.textContent = `Disparador: ${tpl.trigger}`;
  editTemplateSender.textContent = `Desde: ${tpl.sender} (Reply-To: ${tpl.replyTo})`;

  tplSubject.value = tpl.subject || '';
  tplPreheader.value = tpl.preheader || '';
  tplBody.value = tpl.body || '';
  tplButtonText.value = tpl.buttonText || '';

  updateLivePreview();
}

// =========================================================================
// 4. MOTOR DE VISTA PREVIA EN VIVO 1:1 CON VARIABLES DINÁMICAS
// =========================================================================

const DEMO_VARS = {
  nombre_cliente: "Clara Beltrán",
  numero_pedido: "MR-2026-4821",
  titulo_cuaderno: "Planificador Anual 2026",
  formato: "Anillas Metálicas (Wire-O) · 144 págs",
  enlace_diseno: "https://www.editorialmenosruido.com/visor-planificador-anual?order=MR-2026-4821",
  enlace_recibo: "https://www.editorialmenosruido.com/recibo?order=MR-2026-4821",
  tracking_code: "ES84920491028",
  tracking_url: "https://www.correos.es/es/es/herramientas/localizador/envios?numero=ES84920491028",
  direccion_entrega: "Calle Serrano 42, 4º Derecha, 28001 Madrid",
  telefono_contacto: "+34 654 321 987"
};

function replaceVariables(text) {
  if (!text) return '';
  let res = String(text);
  Object.keys(DEMO_VARS).forEach(k => {
    const reg = new RegExp(`\\{${k}\\}`, 'g');
    res = res.replace(reg, DEMO_VARS[k]);
  });
  return res;
}

function updateLivePreview() {
  const tpl = emailTemplates[currentTemplateKey];
  if (!tpl) return;

  // Asunto
  const rawSubject = tplSubject.value || tpl.subject;
  prevSubject.textContent = replaceVariables(rawSubject);

  // Cuerpo
  const rawBody = tplBody.value || tpl.body;
  prevBody.textContent = replaceVariables(rawBody);

  // Botón
  const rawBtn = tplButtonText.value || tpl.buttonText;
  if (rawBtn && rawBtn.trim()) {
    prevActionBtn.textContent = replaceVariables(rawBtn);
    prevActionBtn.parentElement.style.display = 'block';
  } else {
    prevActionBtn.parentElement.style.display = 'none';
  }

  // Caja destacada
  if (tpl.showHighlightBox) {
    prevHighlightBox.style.display = 'block';
  } else {
    prevHighlightBox.style.display = 'none';
  }

  // Enlaces secundarios (recibo/factura)
  if (tpl.showSecondaryLinks) {
    prevSecondaryLinks.style.display = 'block';
  } else {
    prevSecondaryLinks.style.display = 'none';
  }

  // Pie de baja RGPD (solo en checkin post-venta)
  if (tpl.showUnsubscribe) {
    prevUnsubscribeNote.style.display = 'block';
  } else {
    prevUnsubscribeNote.style.display = 'none';
  }
}

// =========================================================================
// 5. EVENTOS DEL EDITOR Y GUARDADO
// =========================================================================

function setupEditorEvents() {
  tplSubject?.addEventListener('input', updateLivePreview);
  tplPreheader?.addEventListener('input', updateLivePreview);
  tplBody?.addEventListener('input', updateLivePreview);
  tplButtonText?.addEventListener('input', updateLivePreview);

  btnSaveTemplate?.addEventListener('click', saveCurrentTemplate);
  btnResetTemplate?.addEventListener('click', resetCurrentTemplate);
  btnTestSendMail?.addEventListener('click', testSendSimulation);
}

function saveCurrentTemplate() {
  if (!assertAuthorized()) return;

  const tpl = emailTemplates[currentTemplateKey];
  if (!tpl) return;

  tpl.subject = tplSubject.value.trim();
  tpl.preheader = tplPreheader.value.trim();
  tpl.body = tplBody.value;
  tpl.buttonText = tplButtonText.value.trim();

  // Guardar en localStorage
  try {
    localStorage.setItem('mr_email_templates', JSON.stringify(emailTemplates));
  } catch (e) {}

  // Guardar en Firestore si hay sesión activa
  if (auth.currentUser && isDeveloper(auth.currentUser)) {
    try {
      const ref = doc(db, 'settings', 'email_templates');
      setDoc(ref, {
        [currentTemplateKey]: tpl,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {}
  }

  showToast(`✓ Plantilla «${tpl.name}» guardada con éxito`);
}

function resetCurrentTemplate() {
  if (!assertAuthorized()) return;

  const def = DEFAULT_TEMPLATES[currentTemplateKey];
  if (!def) return;

  const ok = confirm(`¿Restaurar los textos originales de la plantilla «${def.name}»?`);
  if (!ok) return;

  emailTemplates[currentTemplateKey] = { ...def };
  selectTemplate(currentTemplateKey);
  saveCurrentTemplate();
  showToast(`↺ Plantilla «${def.name}» restaurada a su original`);
}

async function testSendSimulation() {
  if (!assertAuthorized()) return;

  const tpl = emailTemplates[currentTemplateKey];
  if (!tpl) return;

  const destination = auth.currentUser ? getUserEmail(auth.currentUser) : 'jesgilcan@gmail.com';
  const sub = replaceVariables(tplSubject.value || tpl.subject);
  const bodyText = replaceVariables(tplBody.value || tpl.body);
  const btnTxt = replaceVariables(tplButtonText.value || tpl.buttonText);

  showToast(`⏳ Enviando correo de prueba a ${destination}...`);
  if (btnTestSendMail) {
    btnTestSendMail.disabled = true;
    btnTestSendMail.style.opacity = '0.6';
  }

  try {
    const res = await fetch('/api/send-admin-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: destination,
        subject: sub,
        bodyText: bodyText,
        preheader: tpl.preheader || '',
        buttonText: btnTxt || '',
        buttonUrl: 'https://www.editorialmenosruido.com',
        senderType: tpl.sender && tpl.sender.includes('contacto@') ? 'contacto' : 'pedidos',
        replyTo: tpl.replyTo || 'contacto@editorialmenosruido.com',
        highlightDetails: tpl.showHighlightBox ? {
          orderNumber: 'MR-2026-TEST',
          bookTitle: 'Planificador Anual 2026',
          address: 'Calle Serrano 42, 4º D · Madrid'
        } : null,
        showSecondaryLinks: tpl.showSecondaryLinks !== false,
        showUnsubscribe: tpl.showUnsubscribe === true
      })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      showToast(`🚀 ¡Correo real recibido en Resend! Enviado a ${destination}`);
      console.log('✓ Correo enviado con éxito. ID Resend:', data.id);
    } else {
      console.error('Error al enviar correo:', data);
      showToast(`⚠️ Error Resend: ${data.error || 'No se pudo enviar'}`);
      alert(`Resend no pudo enviar el correo:\n${data.error || 'Error desconocido'}`);
    }
  } catch (err) {
    console.error('Error de red al conectar con /api/send-admin-email:', err);
    showToast('⚠️ Error de conexión con el servidor de envío');
  } finally {
    if (btnTestSendMail) {
      btnTestSendMail.disabled = false;
      btnTestSendMail.style.opacity = '';
    }
  }
}

// Inserción de variables al pulsar en los chips
window.insertVariable = function(varName) {
  if (!tplBody) return;
  const start = (typeof tplBody.selectionStart === 'number') ? tplBody.selectionStart : (tplBody.value || '').length;
  const end = (typeof tplBody.selectionEnd === 'number') ? tplBody.selectionEnd : start;
  const text = tplBody.value || '';
  
  tplBody.value = text.substring(0, start) + varName + text.substring(end);
  tplBody.focus();
  tplBody.selectionStart = tplBody.selectionEnd = start + varName.length;
  
  updateLivePreview();
  showToast(`Variable ${varName} insertada`);
};

// Toggle de vista previa: Escritorio / Móvil
window.setPreviewDevice = function(device) {
  const btnD = document.getElementById('btnDevDesktop');
  const btnM = document.getElementById('btnDevMobile');

  if (device === 'mobile') {
    emailCanvas.classList.add('mobile-view');
    btnD?.classList.remove('active');
    btnM?.classList.add('active');
  } else {
    emailCanvas.classList.remove('mobile-view');
    btnD?.classList.add('active');
    btnM?.classList.remove('active');
  }
};

// Helper visual
function showToast(msg) {
  const toast = document.getElementById('adminToast');
  const msgEl = document.getElementById('toastMsg');
  if (!toast || !msgEl) return;
  msgEl.textContent = msg;
  toast.style.display = 'flex';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
