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


// --- Generic Lightbox ---
const lightbox = document.createElement('div');
lightbox.id = 'generic-lightbox';
lightbox.className = 'lightbox';
lightbox.innerHTML = '<img src="" alt="Ampliada" />';
document.body.appendChild(lightbox);

lightbox.addEventListener('click', () => {
    lightbox.classList.remove('show');
});

// Make all non-linked images zoomable
const allImages = document.querySelectorAll('img:not(a img)');
allImages.forEach(img => {
    // Skip favicon/logos and tiny images
    if(img.src.includes('favicon')) return;
    
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', (e) => {
        // Try to avoid conflicts with existing manual lightboxes
        if (img.getAttribute('onclick') && img.getAttribute('onclick').includes('lightbox')) {
            return;
        }
        e.stopPropagation();
        const lightboxImg = lightbox.querySelector('img');
        lightboxImg.src = img.src;
        lightbox.classList.add('show');
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

// Integración de Submenú Contextual en el Drawer Móvil (Opción 3)
(function initMobileContextualSubnav() {
  const bookSubnav = document.querySelector('.book-subnav');
  const drawerNav = document.querySelector('.navbar nav');
  if (!bookSubnav || !drawerNav) return;

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
        if (modal) modal.classList.add('active');
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

  const drawerHeader = drawerNav.querySelector('.nav-drawer-header');
  if (drawerHeader) {
    drawerHeader.insertAdjacentElement('afterend', contextBox);
  } else {
    drawerNav.prepend(contextBox);
  }
})();

// Renderizar estantería visual en el menú móvil para Cuadernos
(function initMobileBookshelf() {
  const dropdownContent = document.querySelector('.dropdown .dropdown-content');
  if (!dropdownContent) return;

  // Marcar los links antiguos como legacy para que en móvil los oculte el CSS
  dropdownContent.querySelectorAll('a').forEach(a => {
    if (!a.classList.contains('mobile-book-card')) {
      a.classList.add('legacy-link');
    }
  });

  // Evitar duplicados si ya se inicializó
  if (dropdownContent.querySelector('.mobile-bookshelf')) return;

  const bookshelf = document.createElement('div');
  bookshelf.className = 'mobile-bookshelf';
  bookshelf.innerHTML = `
    <!-- Habla Claro -->
    <a href="/habla-claro.html" class="mobile-book-card">
      <img src="/cover_habla.jpg" alt="Habla Claro" class="mobile-book-thumb" loading="lazy" />
      <div class="mobile-book-info">
        <span class="mobile-book-title">Habla Claro</span>
        <span class="mobile-book-subtitle">Comunicación y límites</span>
      </div>
    </a>

    <!-- Deja de darle mil vueltas -->
    <a href="/deja-de-darle-mil-vueltas.html" class="mobile-book-card">
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
        <a href="/planificador-90-dias.html" class="mobile-book-card sub-card">
          <img src="/cover_90.jpg" alt="Planificador 90 Días" class="mobile-book-thumb" loading="lazy" />
          <div class="mobile-book-info">
            <span class="mobile-book-title">Planificador 90 Días</span>
            <span class="mobile-book-subtitle">Enfoque trimestral</span>
          </div>
        </a>
        <a href="/planificador-180-dias.html" class="mobile-book-card sub-card">
          <img src="/cover_180.jpg" alt="Planificador 180 Días" class="mobile-book-thumb" loading="lazy" />
          <div class="mobile-book-info">
            <span class="mobile-book-title">Planificador 180 Días</span>
            <span class="mobile-book-subtitle">Hábito semestral</span>
          </div>
        </a>
        <a href="/planificador-semanal-simple.html" class="mobile-book-card sub-card">
          <img src="/cover_semanal_simple.jpg" alt="Planificador Semanal Simple" class="mobile-book-thumb" loading="lazy" />
          <div class="mobile-book-info">
            <span class="mobile-book-title">Semanal Atemporal</span>
            <span class="mobile-book-subtitle">Edición simple</span>
          </div>
        </a>
        <a href="/planificador-semanal-reversible.html" class="mobile-book-card sub-card">
          <img src="/cover_semanal_reversible.jpg" alt="Planificador Semanal Reversible" class="mobile-book-thumb" loading="lazy" />
          <div class="mobile-book-info">
            <span class="mobile-book-title">Semanal Reversible</span>
            <span class="mobile-book-subtitle">Edición doble entrada</span>
          </div>
        </a>
      </div>
    </div>
  `;

  // Cerrar menú al hacer clic en cualquier enlace
  bookshelf.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      document.body.classList.remove('nav-open');
    });
  });

  // Toggle de Planificadores (sin cerrar el menú padre)
  const plannersToggle = bookshelf.querySelector('.mobile-planners-toggle');
  const plannersAccordion = bookshelf.querySelector('.mobile-planners-accordion');
  if (plannersToggle && plannersAccordion) {
    plannersToggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      plannersAccordion.classList.toggle('open');
    });
  }

  dropdownContent.appendChild(bookshelf);
})();


