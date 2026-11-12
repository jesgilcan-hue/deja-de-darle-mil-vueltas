import './mr-popup.js';
import './auth-modal.js';
import './pwa-install.js';

// Set current year in footer
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Dropdown click/tap toggle (especially for touch/mobile devices)
document.querySelectorAll('.dropdown > a').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const parent = toggle.closest('.dropdown');
        document.querySelectorAll('.dropdown').forEach(d => {
            if (d !== parent) d.classList.remove('open');
        });
        parent.classList.toggle('open');
    });
});
document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('open'));
    }
});

// Close mobile drawer on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
        document.body.classList.remove('nav-open');
    }
});


// Add smooth scrolling for anchor links with dynamic sticky bar offset
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (!targetId || targetId === '#' || targetId.length <= 1) return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            e.preventDefault();
            
            // Calculamos altura real de las barras sticky fijas (navbar + subnav si existe)
            const navbar = document.querySelector('.navbar');
            const subnav = document.querySelector('.subnav-sticky-bar, .home-subnav, .lecturas-subnav');
            const navH = navbar ? navbar.offsetHeight : 0;
            const subnavH = subnav ? subnav.offsetHeight : 0;
            const stickyOffset = navH + subnavH;

            // Buscamos el elemento visual clave del bloque (título o encabezado)
            const heading = targetElement.querySelector('h2, .section-header, .split-content, .reading-tag') || targetElement;
            const headingRect = heading.getBoundingClientRect();
            const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
            
            // Colocamos el encabezado justo debajo de las barras fijas con 10px de margen limpio
            const targetY = headingRect.top + currentScroll - stickyOffset - 10;
            
            window.scrollTo({
                top: Math.max(0, targetY),
                behavior: 'smooth'
            });
            
            if (history.pushState) {
                history.pushState(null, null, targetId);
            }
        }
    });
});

// Interactive Flowchart Tabs
const flowTabs = document.querySelectorAll('.flow-tab');
const flowPanels = document.querySelectorAll('.flow-panel');

flowTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active class from all tabs and panels
        flowTabs.forEach(t => t.classList.remove('active'));
        flowPanels.forEach(p => p.classList.remove('active'));
        
        // Add active class to clicked tab
        tab.classList.add('active');
        
        // Show corresponding panel
        const targetId = tab.getAttribute('data-target');
        const targetPanel = document.getElementById(targetId);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }
    });
});


// --- Generic Enhanced Lightbox with Multi-level Zoom ---
const lightbox = document.createElement('div');
lightbox.id = 'generic-lightbox';
lightbox.className = 'lightbox';
lightbox.setAttribute('role', 'dialog');
lightbox.setAttribute('aria-modal', 'true');
lightbox.innerHTML = `
  <div class="lightbox-topbar">
    <div class="lightbox-hint" id="lightbox-hint">🔍 Clic en la foto para ampliar</div>
    <div class="lightbox-actions">
      <button type="button" class="lightbox-btn" id="lightbox-zoom-out" title="Reducir zoom" aria-label="Reducir zoom">−</button>
      <button type="button" class="lightbox-btn lightbox-btn-text" id="lightbox-zoom-reset" title="Ajustar a pantalla">1x</button>
      <button type="button" class="lightbox-btn" id="lightbox-zoom-in" title="Aumentar zoom" aria-label="Aumentar zoom">+</button>
      <button type="button" class="lightbox-btn lightbox-btn-close" id="lightbox-close" title="Cerrar (Esc)" aria-label="Cerrar">✕</button>
    </div>
  </div>
  <div class="lightbox-wrap" id="lightbox-wrap">
    <img id="lightbox-img" src="" alt="Vista ampliada" />
  </div>
`;
document.body.appendChild(lightbox);

const ZOOM_LEVELS = [1.0, 1.2, 1.4, 1.6, 1.8, 2.0];
let currentZoomIndex = 0;

function updateZoomControls() {
  const zoomInBtn = document.getElementById('lightbox-zoom-in');
  const zoomOutBtn = document.getElementById('lightbox-zoom-out');
  if (zoomInBtn) {
    const isMax = currentZoomIndex >= ZOOM_LEVELS.length - 1;
    zoomInBtn.style.opacity = isMax ? '0.35' : '1';
    zoomInBtn.style.cursor = isMax ? 'default' : 'pointer';
  }
  if (zoomOutBtn) {
    const isMin = currentZoomIndex <= 0;
    zoomOutBtn.style.opacity = isMin ? '0.35' : '1';
    zoomOutBtn.style.cursor = isMin ? 'default' : 'pointer';
  }
}

function applyZoom(index) {
  currentZoomIndex = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, index));
  const zoom = ZOOM_LEVELS[currentZoomIndex];
  const img = document.getElementById('lightbox-img');
  const hint = document.getElementById('lightbox-hint');
  const resetBtn = document.getElementById('lightbox-zoom-reset');

  if (currentZoomIndex === 0) {
    lightbox.classList.remove('is-zoomed');
    img.removeAttribute('data-base-w');
    img.removeAttribute('data-base-h');
    img.style.maxWidth = '90vw';
    img.style.maxHeight = '85vh';
    img.style.width = 'auto';
    img.style.height = 'auto';
    img.style.cursor = 'zoom-in';
    if (hint) hint.textContent = '🔍 Clic en la foto para ampliar (Zoom 1.2x)';
    if (resetBtn) resetBtn.textContent = '1x';
  } else {
    lightbox.classList.add('is-zoomed');
    let baseW = img.getAttribute('data-base-w') ? parseFloat(img.getAttribute('data-base-w')) : img.clientWidth;
    let baseH = img.getAttribute('data-base-h') ? parseFloat(img.getAttribute('data-base-h')) : img.clientHeight;
    if (!img.getAttribute('data-base-w') && baseW > 0) {
      img.setAttribute('data-base-w', baseW);
      img.setAttribute('data-base-h', baseH);
    }
    const targetW = Math.round(baseW * zoom);
    const targetH = Math.round(baseH * zoom);
    img.style.maxWidth = 'none';
    img.style.maxHeight = 'none';
    img.style.width = targetW + 'px';
    img.style.height = targetH + 'px';
    img.style.cursor = currentZoomIndex === ZOOM_LEVELS.length - 1 ? 'zoom-out' : 'zoom-in';
    const isMax = currentZoomIndex === ZOOM_LEVELS.length - 1;
    if (hint) hint.textContent = isMax ? `🔍 Zoom: ${zoom.toFixed(1)}x (Máximo) - Clic para alejar` : `🔍 Zoom: ${zoom.toFixed(1)}x (${Math.round(zoom * 100)}%)`;
    if (resetBtn) resetBtn.textContent = `${zoom.toFixed(1)}x`;
  }
  updateZoomControls();
}

function closeLightbox() {
  lightbox.classList.remove('show');
  lightbox.classList.remove('is-zoomed');
  applyZoom(0);
  document.body.style.overflow = '';
}

function openLightbox(src, alt) {
  const img = document.getElementById('lightbox-img');
  img.removeAttribute('data-base-w');
  img.removeAttribute('data-base-h');
  img.src = src;
  img.alt = alt || 'Vista ampliada';
  applyZoom(0);
  lightbox.classList.add('show');
  document.body.style.overflow = 'hidden';
}

const lightboxImg = lightbox.querySelector('#lightbox-img');
lightboxImg.addEventListener('click', (e) => {
  e.stopPropagation();
  let nextIndex = currentZoomIndex < ZOOM_LEVELS.length - 1 ? currentZoomIndex + 1 : 0;
  applyZoom(nextIndex);
});

document.getElementById('lightbox-zoom-in').addEventListener('click', (e) => {
  e.stopPropagation();
  if (currentZoomIndex < ZOOM_LEVELS.length - 1) {
    applyZoom(currentZoomIndex + 1);
  }
});

document.getElementById('lightbox-zoom-out').addEventListener('click', (e) => {
  e.stopPropagation();
  if (currentZoomIndex > 0) {
    applyZoom(currentZoomIndex - 1);
  }
});

document.getElementById('lightbox-zoom-reset').addEventListener('click', (e) => {
  e.stopPropagation();
  applyZoom(0);
});

document.getElementById('lightbox-close').addEventListener('click', (e) => {
  e.stopPropagation();
  closeLightbox();
});

lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox || e.target.id === 'lightbox-wrap') {
    closeLightbox();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && lightbox.classList.contains('show')) {
    closeLightbox();
  }
});

// Make all non-linked images zoomable
const allImages = document.querySelectorAll('img:not(a img)');
allImages.forEach(img => {
  if (img.src.includes('favicon') || img.classList.contains('no-lightbox')) return;
  
  img.style.cursor = 'zoom-in';
  img.addEventListener('click', (e) => {
    if (img.getAttribute('onclick') && img.getAttribute('onclick').includes('lightbox')) {
      return;
    }
    e.stopPropagation();
    openLightbox(img.src, img.alt);
  });
});


// --- In-Browser YouTube Video Modal ---
window.openVideoModal = function(videoId, title) {
  let overlay = document.getElementById('video-modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'video-modal-overlay';
    overlay.className = 'video-modal-overlay';
    overlay.innerHTML = `
      <div class="video-modal-dialog">
        <div class="video-modal-header">
          <span class="video-modal-title" id="video-modal-title-text">${title || 'Vídeo explicativo'}</span>
          <button type="button" class="video-modal-close" aria-label="Cerrar vídeo" onclick="closeVideoModal()">×</button>
        </div>
        <div class="video-modal-iframe-wrap">
          <iframe id="video-modal-iframe" src="" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) window.closeVideoModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('active')) {
        window.closeVideoModal();
      }
    });
  }
  const titleEl = document.getElementById('video-modal-title-text');
  if (titleEl && title) titleEl.textContent = title;
  const iframe = document.getElementById('video-modal-iframe');
  if (iframe) {
    let id = videoId || 'dQw4w9WgXcQ';
    if (id.includes('youtube.com') || id.includes('youtu.be')) {
      const match = id.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      if (match) id = match[1];
    }
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
  }
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
};

window.closeVideoModal = function() {
  const overlay = document.getElementById('video-modal-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    const iframe = document.getElementById('video-modal-iframe');
    if (iframe) iframe.src = '';
    document.body.style.overflow = '';
  }
};

window.toggleArticleVideo = function(videoId) {
  const box = document.getElementById('article-video-box');
  const iframe = document.getElementById('article-video-iframe');
  if (!box) return;

  const isHidden = box.style.display === 'none' || !box.style.display;
  if (isHidden) {
    if (iframe) {
      let id = videoId || iframe.dataset.videoid || 'dQw4w9WgXcQ';
      if (id.includes('youtube.com') || id.includes('youtu.be')) {
        const match = id.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
        if (match) id = match[1];
      }
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
    }
    box.style.display = 'block';
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    box.style.display = 'none';
    if (iframe) {
      iframe.src = '';
    }
  }
};

// Registrar Service Worker para soporte PWA offline
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.debug('ServiceWorker no disponible:', err);
    });
  });
}

// Menú lateral universal (Drawer para móvil y escritorio activable por las 3 rayitas)
(function initUniversalDrawer() {
  if (document.getElementById('site-drawer')) return;

  const drawer = document.createElement('aside');
  drawer.id = 'site-drawer';
  drawer.className = 'site-drawer';
  drawer.setAttribute('aria-label', 'Menú de navegación lateral');

  // Cabecera del drawer con título y botón de cierre
  const drawerHeader = document.createElement('div');
  drawerHeader.className = 'site-drawer-header';
  drawerHeader.innerHTML = `
    <span class="site-drawer-title">Menos Ruido</span>
    <div class="site-drawer-header-actions">
      <button type="button" class="drawer-user-circle-btn" id="drawer-user-btn" aria-label="Mi Cuenta" title="Mi Cuenta">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </button>
      <button type="button" class="site-drawer-close" aria-label="Cerrar menú" onclick="document.body.classList.remove('nav-open')">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111111" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  `;
  drawer.appendChild(drawerHeader);

  // Contenedor scrollable
  const drawerBody = document.createElement('div');
  drawerBody.className = 'site-drawer-body';

  // Si la página actual tiene submenú contextual (.book-subnav), insertamos su bloque al principio del drawer
  const bookSubnav = document.querySelector('.book-subnav');
  if (bookSubnav) {
    const titleEl = bookSubnav.querySelector('.book-subnav-title');
    const links = bookSubnav.querySelectorAll('.book-subnav-links a');
    const btn3D = bookSubnav.querySelector('.subnav-3d-btn');
    const btnBuy = bookSubnav.querySelector('.subnav-buy');

    const contextBox = document.createElement('div');
    contextBox.className = 'nav-drawer-context';

    const titleText = titleEl ? titleEl.textContent.trim() : 'Estás viendo';
    contextBox.innerHTML = `
      <div class="nav-drawer-context-header">
        <span class="nav-drawer-context-badge">En esta página</span>
        <h3 class="nav-drawer-context-title">${titleText}</h3>
      </div>
      <div class="nav-drawer-context-links"></div>
      <div class="nav-drawer-context-actions"></div>
    `;

    const linksContainer = contextBox.querySelector('.nav-drawer-context-links');
    links.forEach(a => {
      const clone = document.createElement('a');
      clone.href = a.getAttribute('href');
      clone.innerHTML = a.innerHTML;
      clone.className = 'nav-drawer-context-link' + (a.classList.contains('active') ? ' active' : '');
      clone.addEventListener('click', () => {
        document.body.classList.remove('nav-open');
      });
      linksContainer.appendChild(clone);
    });

    const actionsContainer = contextBox.querySelector('.nav-drawer-context-actions');
    if (btn3D) {
      const clone3D = document.createElement('button');
      clone3D.type = 'button';
      clone3D.className = 'nav-drawer-context-btn-3d';
      clone3D.innerHTML = '<span>📖</span> Hojear en 3D';
      clone3D.addEventListener('click', () => {
        document.body.classList.remove('nav-open');
        if (typeof openBookModal === 'function') {
          openBookModal();
        } else {
          const modal = document.getElementById('book-modal-backdrop');
          if (modal) modal.classList.add('is-open');
        }
      });
      actionsContainer.appendChild(clone3D);
    }

    if (btnBuy) {
      const cloneBuy = document.createElement('a');
      cloneBuy.href = btnBuy.getAttribute('href');
      if (btnBuy.getAttribute('target')) cloneBuy.target = btnBuy.getAttribute('target');
      cloneBuy.rel = 'noopener noreferrer';
      cloneBuy.className = 'btn-primary nav-drawer-context-btn-buy';
      cloneBuy.textContent = btnBuy.textContent ? btnBuy.textContent.trim() : 'Ver más';
      cloneBuy.addEventListener('click', () => {
        document.body.classList.remove('nav-open');
      });
      actionsContainer.appendChild(cloneBuy);
    }

    drawerBody.appendChild(contextBox);
  }

  // Navegación principal del sitio dentro del drawer (Simplificada y sin saturación)
  const siteNav = document.createElement('div');
  siteNav.className = 'site-drawer-nav';
  siteNav.innerHTML = `
    <div id="drawer-user-card-wrap" class="drawer-user-card-wrap"></div>
    <a href="/" class="site-drawer-link" onclick="document.body.classList.remove('nav-open')">Home</a>
    <a href="/hoy.html" class="site-drawer-link" style="display:flex; align-items:center; justify-content:space-between; background:#f5efe6; border:1px solid #dfd3c3; border-radius:8px; padding:10px 12px; margin:6px 0 10px; font-weight:700; color:#111;" onclick="document.body.classList.remove('nav-open')">
      <span>🎯 Reto de hoy</span>
      <span style="font-size:0.7rem; background:#111; color:#fff; padding:2px 7px; border-radius:10px;">5 juegos</span>
    </a>

    <!-- 1. CUADERNOS & PLANIFICADORES -->
    <div class="site-drawer-section-title">Cuadernos &amp; Planificadores</div>
    <div class="mobile-bookshelf">
      <!-- Bloque 1A: Crea tu propio cuaderno -->
      <div style="background:#faf8f5; border:1px solid #e6dfd3; border-radius:10px; padding:10px 12px; margin-bottom:8px;">
        <a href="/generador.html" style="display:flex; justify-content:space-between; align-items:center; font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:0.6px; color:var(--color-accent, #87553b); text-decoration:none; margin-bottom:6px;" onclick="document.body.classList.remove('nav-open')">
          <span>Crea tu propio cuaderno</span>
          <span>&rarr;</span>
        </a>
        <a href="/crear-planificador-completo.html" style="display:block; font-size:0.9rem; font-weight:700; color:#111; text-decoration:none; padding:6px 8px; background:#fff; border:1px solid #e2dacd; border-radius:7px; margin-bottom:6px;" onclick="document.body.classList.remove('nav-open')">
          📚 Crea tu planificador completo
        </a>
        <div class="mobile-planners-accordion" style="margin:0;">
          <button type="button" class="mobile-planners-toggle" style="padding:6px 8px; font-size:0.82rem;">
            <span>▸ Desplegar generadores (6)</span>
            <span class="toggle-icon">▾</span>
          </button>
          <div class="mobile-planners-list">
            <a href="/generador-planificador-diario.html" class="mobile-book-card sub-card" onclick="document.body.classList.remove('nav-open')"><div class="mobile-book-info"><span class="mobile-book-title">Planificador Diario</span></div></a>
            <a href="/generador-planificador-semanal.html" class="mobile-book-card sub-card" onclick="document.body.classList.remove('nav-open')"><div class="mobile-book-info"><span class="mobile-book-title">Planificador Semanal</span></div></a>
            <a href="/generador-planificador-mensual.html" class="mobile-book-card sub-card" onclick="document.body.classList.remove('nav-open')"><div class="mobile-book-info"><span class="mobile-book-title">Planificador Mensual</span></div></a>
            <a href="/generador-planificador-anual.html" class="mobile-book-card sub-card" onclick="document.body.classList.remove('nav-open')"><div class="mobile-book-info"><span class="mobile-book-title">Planificador Anual</span></div></a>
            <a href="/generador-planificador-habitos.html" class="mobile-book-card sub-card" onclick="document.body.classList.remove('nav-open')"><div class="mobile-book-info"><span class="mobile-book-title">Seguimiento de Hábitos</span></div></a>
            <a href="/generador-planificador-horario.html" class="mobile-book-card sub-card" onclick="document.body.classList.remove('nav-open')"><div class="mobile-book-info"><span class="mobile-book-title">Bloques Horarios</span></div></a>
          </div>
        </div>
      </div>

      <!-- Bloque 1B: Cuadernos y planificadores -->
      <div style="background:#faf8f5; border:1px solid #e6dfd3; border-radius:10px; padding:10px 12px;">
        <a href="/cuadernos.html" style="display:flex; justify-content:space-between; align-items:center; font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:0.6px; color:var(--color-accent, #87553b); text-decoration:none; margin-bottom:6px;" onclick="document.body.classList.remove('nav-open')">
          <span>Cuadernos y planificadores</span>
          <span>&rarr;</span>
        </a>
        <a href="/cuadernos.html" style="display:block; font-size:0.9rem; font-weight:700; color:#111; text-decoration:none; padding:6px 8px; background:#fff; border:1px solid #e2dacd; border-radius:7px; margin-bottom:6px;" onclick="document.body.classList.remove('nav-open')">
          📖 Compra el tuyo
        </a>
        <div class="mobile-planners-accordion" style="margin:0;">
          <button type="button" class="mobile-planners-toggle" style="padding:6px 8px; font-size:0.82rem;">
            <span>▸ Desplegar cuadernos (7)</span>
            <span class="toggle-icon">▾</span>
          </button>
          <div class="mobile-planners-list">
            <a href="/afirmaciones-diarias.html" class="mobile-book-card sub-card" onclick="document.body.classList.remove('nav-open')"><div class="mobile-book-info"><span class="mobile-book-title">Afirmaciones Diarias</span></div></a>
            <a href="/habla-claro.html" class="mobile-book-card sub-card" onclick="document.body.classList.remove('nav-open')"><div class="mobile-book-info"><span class="mobile-book-title">Habla Claro (Límites)</span></div></a>
            <a href="/deja-de-darle-mil-vueltas.html" class="mobile-book-card sub-card" onclick="document.body.classList.remove('nav-open')"><div class="mobile-book-info"><span class="mobile-book-title">Deja de darle mil vueltas</span></div></a>
            <a href="/planificador-90-dias.html" class="mobile-book-card sub-card" onclick="document.body.classList.remove('nav-open')"><div class="mobile-book-info"><span class="mobile-book-title">Planificador de 90 Días</span></div></a>
            <a href="/planificador-180-dias.html" class="mobile-book-card sub-card" onclick="document.body.classList.remove('nav-open')"><div class="mobile-book-info"><span class="mobile-book-title">Planificador de 180 Días</span></div></a>
            <a href="/planificador-semanal-simple.html" class="mobile-book-card sub-card" onclick="document.body.classList.remove('nav-open')"><div class="mobile-book-info"><span class="mobile-book-title">Planificador Semanal Simple</span></div></a>
            <a href="/planificador-semanal-reversible.html" class="mobile-book-card sub-card" onclick="document.body.classList.remove('nav-open')"><div class="mobile-book-info"><span class="mobile-book-title">Planificador Semanal Reversible</span></div></a>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. PASATIEMPOS -->
    <div class="site-drawer-section-title" style="margin-top: 0.8rem; display:flex; align-items:center; gap:6px;">
      <span>Pasatiempos</span>
      <span style="background:#111; color:#fff; font-size:0.62rem; padding:1px 6px; border-radius:4px; text-transform:uppercase;">Nuevo</span>
    </div>
    <div class="mobile-bookshelf">
      <!-- Bloque 2A: Crea tu propio pasatiempo -->
      <div style="background:#faf8f5; border:1px solid #e6dfd3; border-radius:10px; padding:10px 12px; margin-bottom:8px;">
        <a href="/pasatiempos.html#imprimibles" style="display:flex; justify-content:space-between; align-items:center; font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:0.6px; color:var(--color-accent, #87553b); text-decoration:none; margin-bottom:6px;" onclick="document.body.classList.remove('nav-open')">
          <span>Crea tu propio pasatiempo</span>
          <span>&rarr;</span>
        </a>
        <a href="/crear-libro-pasatiempos.html" style="display:block; font-size:0.9rem; font-weight:700; color:#111; text-decoration:none; padding:6px 8px; background:#fff; border:1px solid #e2dacd; border-radius:7px; margin-bottom:6px;" onclick="document.body.classList.remove('nav-open')">
          📚 Crea tu libro de pasatiempos completo
        </a>
        <div class="mobile-planners-accordion" style="margin:0;">
          <button type="button" class="mobile-planners-toggle" style="padding:6px 8px; font-size:0.82rem;">
            <span>▸ Desplegar generadores (5)</span>
            <span class="toggle-icon">▾</span>
          </button>
          <div class="mobile-planners-list">
            <a href="/generador-sudokus.html" class="mobile-book-card sub-card" onclick="document.body.classList.remove('nav-open')"><div class="mobile-book-info"><span class="mobile-book-title">Generador de Sudokus</span></div></a>
            <a href="/generador-sopas.html" class="mobile-book-card sub-card" onclick="document.body.classList.remove('nav-open')"><div class="mobile-book-info"><span class="mobile-book-title">Generador de Sopas de Letras</span></div></a>
            <a href="/generador-cruzadas.html" class="mobile-book-card sub-card" onclick="document.body.classList.remove('nav-open')"><div class="mobile-book-info"><span class="mobile-book-title">Generador de Palabras Cruzadas</span></div></a>
            <a href="/generador-kakuro.html" class="mobile-book-card sub-card" onclick="document.body.classList.remove('nav-open')"><div class="mobile-book-info"><span class="mobile-book-title">Generador de Kakuro</span></div></a>
            <a href="/generador-calcudoku.html" class="mobile-book-card sub-card" onclick="document.body.classList.remove('nav-open')"><div class="mobile-book-info"><span class="mobile-book-title">Generador de Calcudoku</span></div></a>
          </div>
        </div>
      </div>

      <!-- Bloque 2B: Libros de pasatiempos -->
      <div style="background:#faf8f5; border:1px solid #e6dfd3; border-radius:10px; padding:10px 12px;">
        <a href="/pasatiempos.html#catalogo" style="display:flex; justify-content:space-between; align-items:center; font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:0.6px; color:var(--color-accent, #87553b); text-decoration:none; margin-bottom:6px;" onclick="document.body.classList.remove('nav-open')">
          <span>Libros de pasatiempos</span>
          <span>&rarr;</span>
        </a>
        <a href="/pasatiempos.html#catalogo" style="display:block; font-size:0.9rem; font-weight:700; color:#111; text-decoration:none; padding:6px 8px; background:#fff; border:1px solid #e2dacd; border-radius:7px; margin-bottom:6px;" onclick="document.body.classList.remove('nav-open')">
          📖 Compra el tuyo
        </a>
        <div class="mobile-planners-accordion" style="margin:0;">
          <button type="button" class="mobile-planners-toggle" style="padding:6px 8px; font-size:0.82rem;">
            <span>▸ Desplegar libros (4)</span>
            <span class="toggle-icon">▾</span>
          </button>
          <div class="mobile-planners-list">
            <a href="/libro-pasatiempos-abuelos.html" class="mobile-book-card sub-card" onclick="document.body.classList.remove('nav-open')"><div class="mobile-book-info"><span class="mobile-book-title">El Gran Cuaderno de los Abuel@s</span></div></a>
            <a href="/libro-pasatiempos-enfermeria.html" class="mobile-book-card sub-card" onclick="document.body.classList.remove('nav-open')"><div class="mobile-book-info"><span class="mobile-book-title">Turno de Noche: Enfermería</span></div></a>
            <a href="/libro-pasatiempos-docentes.html" class="mobile-book-card sub-card" onclick="document.body.classList.remove('nav-open')"><div class="mobile-book-info"><span class="mobile-book-title">El Gran Libro de los Docentes</span></div></a>
            <a href="/libro-pasatiempos-navidad.html" class="mobile-book-card sub-card" onclick="document.body.classList.remove('nav-open')"><div class="mobile-book-info"><span class="mobile-book-title">Pasatiempos de Navidad</span></div></a>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. LECTURAS -->
    <a href="/lecturas.html" class="site-drawer-link" style="margin-top: 0.6rem; font-weight: 700;" onclick="document.body.classList.remove('nav-open')">Lecturas</a>
  `;

  // Toggles de acordeones (sin cerrar el drawer)
  siteNav.querySelectorAll('.mobile-planners-toggle').forEach(plannersToggle => {
    plannersToggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const accordion = plannersToggle.closest('.mobile-planners-accordion');
      if (accordion) accordion.classList.toggle('open');
    });
  });

  drawerBody.appendChild(siteNav);
  drawer.appendChild(drawerBody);
  document.body.appendChild(drawer);

  // Cerrar con tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
      document.body.classList.remove('nav-open');
    }
  });

  // Sincronizar y estandarizar el menú superior en escritorio y el selector rápido de generadores
  setupUnifiedNavDropdowns();
  initGeneratorQuickSwitcher();
})();

// Estandariza la barra de navegación superior (.navbar nav) en toda la web (5 elementos limpios + Mi Espacio)
function setupUnifiedNavDropdowns() {
  const desktopNav = document.querySelector('.navbar nav');
  if (!desktopNav) return;

  const path = window.location.pathname.toLowerCase();
  const isHoy = path.includes('hoy');
  const isPasatiempos = path.includes('pasatiempo') || path.includes('sudoku') || path.includes('sopa') || path.includes('cruzada') || path.includes('kakuro') || path.includes('calcudoku');
  const isLecturas = path.includes('lectura') || path.includes('tutorial') || path.includes('guia-uso');

  desktopNav.innerHTML = `
    <div class="nav-drawer-header">
      <span class="nav-drawer-title">Menos Ruido</span>
      <button class="nav-close" aria-label="Cerrar menú" onclick="document.body.classList.remove('nav-open')">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111111" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

    <!-- 1. HOME -->
    <a href="/" onclick="document.body.classList.remove('nav-open')">Home</a>

    <!-- 2. RETO DE HOY -->
    <a href="/hoy.html" onclick="document.body.classList.remove('nav-open')" style="display: inline-flex; align-items: center; gap: 5px; font-weight: 700; color: ${isHoy ? 'var(--color-accent, #87553b)' : '#111111'};">
      <span>🎯</span> Reto de hoy
    </a>

    <!-- 3. CUADERNOS & PLANIFICADORES -->
    <div class="dropdown">
      <a href="/cuadernos.html" style="cursor: pointer;">Cuadernos &amp; Planificadores ▾</a>
      <div class="dropdown-content tree-dropdown">
        <div class="tree-group">
          <a href="/generador.html" class="tree-branch-title" onclick="document.body.classList.remove('nav-open')">Crea tu propio cuaderno</a>
          <div class="tree-branch-items">
            <a href="/crear-planificador-completo.html" class="tree-item" style="font-weight: 700; color: #111;" onclick="document.body.classList.remove('nav-open')">📚 Crea tu planificador completo</a>
            <button type="button" class="tree-sub-toggle">▸ Desplegar generadores (6)</button>
            <div class="tree-sub-collapsible" style="display: none;">
              <a href="/generador-planificador-diario.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Planificador Diario</a>
              <a href="/generador-planificador-semanal.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Planificador Semanal</a>
              <a href="/generador-planificador-mensual.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Planificador Mensual</a>
              <a href="/generador-planificador-anual.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Planificador Anual</a>
              <a href="/generador-planificador-habitos.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Seguimiento de Hábitos</a>
              <a href="/generador-planificador-horario.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Bloques Horarios</a>
            </div>
          </div>
        </div>
        <div class="tree-group">
          <a href="/cuadernos.html" class="tree-branch-title" onclick="document.body.classList.remove('nav-open')">Cuadernos y planificadores</a>
          <div class="tree-branch-items">
            <a href="/cuadernos.html" class="tree-item" style="font-weight: 700; color: #111;" onclick="document.body.classList.remove('nav-open')">📖 Compra el tuyo</a>
            <button type="button" class="tree-sub-toggle">▸ Desplegar cuadernos (7)</button>
            <div class="tree-sub-collapsible" style="display: none;">
              <a href="/afirmaciones-diarias.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Afirmaciones Diarias</a>
              <a href="/habla-claro.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Habla Claro (Límites)</a>
              <a href="/deja-de-darle-mil-vueltas.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Deja de darle mil vueltas</a>
              <a href="/planificador-90-dias.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Planificador de 90 Días</a>
              <a href="/planificador-180-dias.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Planificador de 180 Días</a>
              <a href="/planificador-semanal-simple.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Planificador Semanal Simple</a>
              <a href="/planificador-semanal-reversible.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Planificador Semanal Reversible</a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. PASATIEMPOS -->
    <div class="dropdown">
      <a href="/pasatiempos.html" style="cursor: pointer; display: inline-flex; align-items: center; gap: 6px; ${isPasatiempos ? 'font-weight:700;' : ''}">
        Pasatiempos <span style="background: #111111; color: #ffffff; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px;">Nuevo</span> ▾
      </a>
      <div class="dropdown-content tree-dropdown">
        <div class="tree-group">
          <a href="/pasatiempos.html#imprimibles" class="tree-branch-title" onclick="document.body.classList.remove('nav-open')">Crea tu propio pasatiempo</a>
          <div class="tree-branch-items">
            <a href="/crear-libro-pasatiempos.html" class="tree-item" style="font-weight: 700; color: #111;" onclick="document.body.classList.remove('nav-open')">📚 Crea tu libro de pasatiempos completo</a>
            <button type="button" class="tree-sub-toggle">▸ Desplegar generadores (5)</button>
            <div class="tree-sub-collapsible" style="display: none;">
              <a href="/generador-sudokus.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Generador de Sudokus</a>
              <a href="/generador-sopas.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Generador de Sopas de Letras</a>
              <a href="/generador-cruzadas.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Generador de Palabras Cruzadas</a>
              <a href="/generador-kakuro.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Generador de Kakuro</a>
              <a href="/generador-calcudoku.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Generador de Calcudoku</a>
            </div>
          </div>
        </div>
        <div class="tree-group">
          <a href="/pasatiempos.html#catalogo" class="tree-branch-title" onclick="document.body.classList.remove('nav-open')">Libros de pasatiempos</a>
          <div class="tree-branch-items">
            <a href="/pasatiempos.html#catalogo" class="tree-item" style="font-weight: 700; color: #111;" onclick="document.body.classList.remove('nav-open')">📖 Compra el tuyo</a>
            <button type="button" class="tree-sub-toggle">▸ Desplegar libros (4)</button>
            <div class="tree-sub-collapsible" style="display: none;">
              <a href="/libro-pasatiempos-abuelos.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">El Gran Cuaderno de los Abuel@s</a>
              <a href="/libro-pasatiempos-enfermeria.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Turno de Noche: Enfermería</a>
              <a href="/libro-pasatiempos-docentes.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">El Gran Libro de los Docentes</a>
              <a href="/libro-pasatiempos-navidad.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Pasatiempos de Navidad</a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 5. LECTURAS -->
    <a href="/lecturas.html" onclick="document.body.classList.remove('nav-open')" style="${isLecturas ? 'font-weight:700;' : ''}">Lecturas</a>
  `;

  // Re-bind dropdown click toggles for touch/desktop
  desktopNav.querySelectorAll('.dropdown > a').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const parent = toggle.closest('.dropdown');
      document.querySelectorAll('.dropdown').forEach(d => {
        if (d !== parent) d.classList.remove('open');
      });
      parent.classList.toggle('open');
    });
  });

  // Bind internal collapsible sub-menus (.tree-sub-toggle) inside the dropdown
  desktopNav.querySelectorAll('.tree-sub-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const box = btn.nextElementSibling;
      if (!box) return;
      const isHidden = box.style.display === 'none' || !box.style.display;
      box.style.display = isHidden ? 'block' : 'none';
      btn.textContent = isHidden
        ? btn.textContent.replace('▸', '▾')
        : btn.textContent.replace('▾', '▸');
      btn.classList.toggle('is-open', isHidden);
    });
  });
}

// Selector rápido de salto entre los 15 generadores PDF en el subheader (.top-nav / .top-nav-bar)
function initGeneratorQuickSwitcher() {
  const path = window.location.pathname.toLowerCase();
  if (!path.includes('generador-')) return;

  const topNav = document.querySelector('.top-nav, .top-nav-bar');
  if (!topNav || document.getElementById('mr-gen-quick-select')) return;

  const generators = [
    { group: 'Planificadores y Cuadernos (8)', label: '📚 Interior del Planificador (Libro)', url: '/generador-libro-completo.html', match: 'generador-libro-completo' },
    { group: 'Planificadores y Cuadernos (8)', label: '🎨 Diseñador de Portadas (Planificador)', url: '/generador-portadas.html', match: 'generador-portadas.html' },
    { group: 'Planificadores y Cuadernos (8)', label: '☀️ Planificador Diario (6"×9")', url: '/generador-planificador-diario.html', match: 'generador-planificador-diario' },
    { group: 'Planificadores y Cuadernos (8)', label: '🗓️ Planificador Semanal (8.25"×6")', url: '/generador-planificador-semanal.html', match: 'generador-planificador-semanal' },
    { group: 'Planificadores y Cuadernos (8)', label: '📅 Planificador Mensual', url: '/generador-planificador-mensual.html', match: 'generador-planificador-mensual' },
    { group: 'Planificadores y Cuadernos (8)', label: '🧭 Planificador Anual', url: '/generador-planificador-anual.html', match: 'generador-planificador-anual' },
    { group: 'Planificadores y Cuadernos (8)', label: '✨ Seguimiento de Hábitos', url: '/generador-planificador-habitos.html', match: 'generador-planificador-habitos' },
    { group: 'Planificadores y Cuadernos (8)', label: '⏱️ Bloques Horarios', url: '/generador-planificador-horario.html', match: 'generador-planificador-horario' },
    { group: 'Pasatiempos en PDF (7)', label: '📚 Libro Completo de Pasatiempos', url: '/generador-libro-pasatiempos.html', match: 'generador-libro-pasatiempos' },
    { group: 'Pasatiempos en PDF (7)', label: '🎨 Diseñador de Portadas (Pasatiempos)', url: '/generador-portadas-pasatiempos.html', match: 'generador-portadas-pasatiempos' },
    { group: 'Pasatiempos en PDF (7)', label: '🧩 Generador de Sudokus en PDF', url: '/generador-sudokus.html', match: 'generador-sudokus' },
    { group: 'Pasatiempos en PDF (7)', label: '🔍 Generador de Sopas de Letras en PDF', url: '/generador-sopas.html', match: 'generador-sopas' },
    { group: 'Pasatiempos en PDF (7)', label: '🔤 Generador de Cruzadas en PDF', url: '/generador-cruzadas.html', match: 'generador-cruzadas' },
    { group: 'Pasatiempos en PDF (7)', label: '🔢 Generador de Kakuro en PDF', url: '/generador-kakuro.html', match: 'generador-kakuro' },
    { group: 'Pasatiempos en PDF (7)', label: '🧮 Generador de Calcudoku en PDF', url: '/generador-calcudoku.html', match: 'generador-calcudoku' }
  ];

  const wrap = document.createElement('div');
  wrap.className = 'mr-gen-switcher-wrap';
  wrap.style.cssText = 'display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-left: auto;';

  const label = document.createElement('label');
  label.setAttribute('for', 'mr-gen-quick-select');
  label.style.cssText = 'font-size: 0.76rem; font-weight: 700; color: #665e54; text-transform: uppercase; letter-spacing: 0.5px;';
  label.textContent = 'Herramienta:';

  const select = document.createElement('select');
  select.id = 'mr-gen-quick-select';
  select.style.cssText = 'background: #ffffff; border: 1px solid #d4ccbf; border-radius: 7px; padding: 6px 10px; font-size: 0.82rem; font-weight: 600; color: #1f1c19; cursor: pointer; max-width: 90vw;';

  const groups = {};
  generators.forEach(g => {
    if (!groups[g.group]) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = g.group;
      groups[g.group] = optgroup;
      select.appendChild(optgroup);
    }
    const opt = document.createElement('option');
    opt.value = g.url;
    opt.textContent = g.label;
    if (path.includes('generador-portadas-pasatiempos')) {
      if (g.match === 'generador-portadas-pasatiempos') opt.selected = true;
    } else if (path.includes('generador-portadas')) {
      if (g.match === 'generador-portadas.html') opt.selected = true;
    } else if (path.includes(g.match)) {
      opt.selected = true;
    }
    groups[g.group].appendChild(opt);
  });

  select.addEventListener('change', () => {
    if (select.value) window.location.href = select.value;
  });

  wrap.appendChild(label);
  wrap.appendChild(select);
  topNav.appendChild(wrap);
}

// Bloqueo universal de descarga/impresión de PDF sin registro (Simuladores y Generadores)
(function setupGlobalPdfAuthGate() {
  const getCurrentUser = () => {
    if (window.auth && window.auth.currentUser) return window.auth.currentUser;
    try {
      if (window.parent && window.parent !== window && window.parent.auth && window.parent.auth.currentUser) {
        return window.parent.auth.currentUser;
      }
    } catch (e) {}
    return null;
  };

  const triggerLoginForPdf = (onSuccessFn) => {
    const modalOpts = {
      title: 'Descarga o imprime tu PDF gratis',
      subtitle: 'Inicia sesión o crea tu cuenta gratuita en un clic para descargar e imprimir tus fichas y plantillas en PDF.',
      badge: 'Descarga en PDF',
      actionContext: 'download',
      onSuccess: (user) => {
        if (typeof onSuccessFn === 'function') onSuccessFn(user);
      }
    };
    try {
      if (window.parent && window.parent !== window && typeof window.parent.openAuthModal === 'function') {
        window.parent.openAuthModal(modalOpts);
        return;
      }
    } catch (e) {}
    if (typeof window.openAuthModal === 'function') {
      window.openAuthModal(modalOpts);
    }
  };

  const wrapPrintPage = () => {
    if (typeof window.printPage === 'function' && !window.printPage.__mrAuthWrapped) {
      const origPrint = window.printPage;
      const wrapped = function(...args) {
        if (!getCurrentUser()) {
          triggerLoginForPdf(() => origPrint.apply(this, args));
          return;
        }
        return origPrint.apply(this, args);
      };
      wrapped.__mrAuthWrapped = true;
      window.printPage = wrapped;
    }
  };

  wrapPrintPage();
  setTimeout(wrapPrintPage, 300);

  document.addEventListener('click', (e) => {
    const btn = e.target && e.target.closest && e.target.closest('[onclick*="printPage"], [onclick*="window.print"], #btnOpenDownloadModal, #btnExecuteDownload, #btnExecutePrint');
    if (!btn) return;
    if (!getCurrentUser()) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      triggerLoginForPdf(() => {
        if (typeof window.openDownloadModal === 'function' && btn.id === 'btnOpenDownloadModal') {
          window.openDownloadModal();
        }
      });
    }
  }, true);
})();
