// Set current year in footer
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

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
