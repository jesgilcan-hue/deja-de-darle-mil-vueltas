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


// Add smooth scrolling for anchor links (fallback for browsers that don't support smooth scrolling CSS)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth'
            });
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

const ZOOM_LEVELS = [1, 1.8, 2.6];
let currentZoomIndex = 0;

function applyZoom(index) {
  currentZoomIndex = (index + ZOOM_LEVELS.length) % ZOOM_LEVELS.length;
  const zoom = ZOOM_LEVELS[currentZoomIndex];
  const wrap = document.getElementById('lightbox-wrap');
  const img = document.getElementById('lightbox-img');
  const hint = document.getElementById('lightbox-hint');
  const resetBtn = document.getElementById('lightbox-zoom-reset');

  if (currentZoomIndex === 0) {
    lightbox.classList.remove('is-zoomed');
    img.style.maxWidth = '90vw';
    img.style.maxHeight = '85vh';
    img.style.width = 'auto';
    img.style.minWidth = '';
    img.style.cursor = 'zoom-in';
    if (hint) hint.textContent = '🔍 Clic en la foto para ampliar (Zoom)';
    if (resetBtn) resetBtn.textContent = '1x';
  } else {
    lightbox.classList.add('is-zoomed');
    const pct = Math.round(zoom * 100);
    img.style.maxWidth = 'none';
    img.style.maxHeight = 'none';
    img.style.width = (zoom * 75) + 'vw';
    img.style.minWidth = Math.min(1800, Math.round(zoom * 650)) + 'px';
    img.style.cursor = currentZoomIndex === ZOOM_LEVELS.length - 1 ? 'zoom-out' : 'zoom-in';
    if (hint) hint.textContent = `🔍 Zoom: ${pct}% (Clic para más zoom / alejar)`;
    if (resetBtn) resetBtn.textContent = `${zoom}x`;
  }
}

function closeLightbox() {
  lightbox.classList.remove('show');
  lightbox.classList.remove('is-zoomed');
  applyZoom(0);
  document.body.style.overflow = '';
}

function openLightbox(src, alt) {
  const img = document.getElementById('lightbox-img');
  img.src = src;
  img.alt = alt || 'Vista ampliada';
  applyZoom(0);
  lightbox.classList.add('show');
  document.body.style.overflow = 'hidden';
}

const lightboxImg = lightbox.querySelector('#lightbox-img');
lightboxImg.addEventListener('click', (e) => {
  e.stopPropagation();
  let nextIndex = (currentZoomIndex + 1) % ZOOM_LEVELS.length;
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
    <button type="button" class="site-drawer-close" aria-label="Cerrar menú" onclick="document.body.classList.remove('nav-open')">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111111" stroke-width="2.5" stroke-linecap="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
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

    const titleText = titleEl ? titleEl.textContent.trim() : 'Este Cuaderno';
    contextBox.innerHTML = `
      <div class="nav-drawer-context-header">
        <span class="nav-drawer-context-badge">Estás viendo</span>
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
      cloneBuy.target = '_blank';
      cloneBuy.rel = 'noopener noreferrer';
      cloneBuy.className = 'btn-primary nav-drawer-context-btn-buy';
      cloneBuy.textContent = btnBuy.textContent ? btnBuy.textContent.trim() : 'Comprar en Amazon';
      cloneBuy.addEventListener('click', () => {
        document.body.classList.remove('nav-open');
      });
      actionsContainer.appendChild(cloneBuy);
    }

    drawerBody.appendChild(contextBox);

    // Scrollspy para sincronizar la sección activa en el submenú del drawer
    const drawerLinks = linksContainer.querySelectorAll('.nav-drawer-context-link');
    const sections = document.querySelectorAll('section[id], header[id]');
    if (drawerLinks.length && sections.length) {
      window.addEventListener('scroll', () => {
        let current = '';
        const scrollPos = window.scrollY + 140;
        sections.forEach(s => {
          const top = s.offsetTop;
          const height = s.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            current = '#' + s.getAttribute('id');
          }
        });
        drawerLinks.forEach(l => {
          if (l.getAttribute('href') === current) {
            l.classList.add('active');
          } else {
            l.classList.remove('active');
          }
        });
      }, { passive: true });
    }
  }

  // Navegación principal del sitio dentro del drawer
  const siteNav = document.createElement('div');
  siteNav.className = 'site-drawer-nav';
  siteNav.innerHTML = `
    <a href="/" class="site-drawer-link" onclick="document.body.classList.remove('nav-open')">Home</a>
    <div class="site-drawer-section-title">Cuadernos</div>
    <div class="mobile-bookshelf">
      <!-- Habla Claro -->
      <a href="/habla-claro.html" class="mobile-book-card" onclick="document.body.classList.remove('nav-open')">
        <img src="/cover_habla.jpg" alt="Habla Claro" class="mobile-book-thumb" loading="lazy" />
        <div class="mobile-book-info">
          <span class="mobile-book-title">Habla Claro</span>
          <span class="mobile-book-subtitle">Comunicación y límites</span>
        </div>
      </a>
      <!-- Deja de darle mil vueltas -->
      <a href="/deja-de-darle-mil-vueltas.html" class="mobile-book-card" onclick="document.body.classList.remove('nav-open')">
        <img src="/cover_deja.jpg" alt="Deja de darle mil vueltas" class="mobile-book-thumb" loading="lazy" />
        <div class="mobile-book-info">
          <span class="mobile-book-title">Deja de darle mil vueltas</span>
          <span class="mobile-book-subtitle">Toma de decisiones</span>
        </div>
      </a>
      <!-- Planificadores Desplegables -->
      <div class="mobile-planners-accordion">
        <button type="button" class="mobile-planners-toggle">
          <span>Planificadores</span>
          <span class="toggle-icon">▾</span>
        </button>
        <div class="mobile-planners-list">
          <a href="/planificador-90-dias.html" class="mobile-book-card sub-card" onclick="document.body.classList.remove('nav-open')">
            <img src="/cover_90.jpg" alt="Planificador 90 Días" class="mobile-book-thumb" loading="lazy" />
            <div class="mobile-book-info">
              <span class="mobile-book-title">Planificador 90 Días</span>
              <span class="mobile-book-subtitle">Enfoque trimestral</span>
            </div>
          </a>
          <a href="/planificador-180-dias.html" class="mobile-book-card sub-card" onclick="document.body.classList.remove('nav-open')">
            <img src="/cover_180.jpg" alt="Planificador 180 Días" class="mobile-book-thumb" loading="lazy" />
            <div class="mobile-book-info">
              <span class="mobile-book-title">Planificador 180 Días</span>
              <span class="mobile-book-subtitle">Hábito semestral</span>
            </div>
          </a>
          <a href="/planificador-semanal-simple.html" class="mobile-book-card sub-card" onclick="document.body.classList.remove('nav-open')">
            <img src="/cover_semanal_simple.jpg" alt="Planificador Semanal Simple" class="mobile-book-thumb" loading="lazy" />
            <div class="mobile-book-info">
              <span class="mobile-book-title">Semanal Atemporal</span>
              <span class="mobile-book-subtitle">Edición simple</span>
            </div>
          </a>
          <a href="/planificador-semanal-reversible.html" class="mobile-book-card sub-card" onclick="document.body.classList.remove('nav-open')">
            <img src="/cover_semanal_reversible.jpg" alt="Planificador Semanal Reversible" class="mobile-book-thumb" loading="lazy" />
            <div class="mobile-book-info">
              <span class="mobile-book-title">Semanal Reversible</span>
              <span class="mobile-book-subtitle">Edición doble entrada</span>
            </div>
          </a>
        </div>
      </div>
    </div>
    <a href="/lecturas.html" class="site-drawer-link" onclick="document.body.classList.remove('nav-open')">Lecturas & Vídeos</a>
  `;

  // Toggle de Planificadores (sin cerrar el drawer)
  const plannersToggle = siteNav.querySelector('.mobile-planners-toggle');
  const plannersAccordion = siteNav.querySelector('.mobile-planners-accordion');
  if (plannersToggle && plannersAccordion) {
    plannersToggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      plannersAccordion.classList.toggle('open');
    });
  }

  drawerBody.appendChild(siteNav);
  drawer.appendChild(drawerBody);
  document.body.appendChild(drawer);

  // Cerrar con tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
      document.body.classList.remove('nav-open');
    }
  });
})();


