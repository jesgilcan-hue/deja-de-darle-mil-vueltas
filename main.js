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
