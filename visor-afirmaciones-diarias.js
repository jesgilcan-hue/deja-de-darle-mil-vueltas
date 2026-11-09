import { PageFlip } from 'page-flip';

// --- Web Audio API Paper Sound Synthesizer ---
let audioCtx = null;
let soundEnabled = false;

function initAudio() {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            audioCtx = new AudioContext();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playPaperSound() {
    if (!soundEnabled) return;
    try {
        initAudio();
        if (!audioCtx) return;

        // Generate synthetic paper rustle/swish noise
        const bufferSize = audioCtx.sampleRate * 0.18; // 180ms
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.8);
        }

        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;

        // Filter to mimic physical book paper friction (bandpass 1400 Hz)
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, audioCtx.currentTime);
        filter.Q.setValueAtTime(1.2, audioCtx.currentTime);

        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.001, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.28, audioCtx.currentTime + 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);

        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        noise.start();
    } catch (e) {
        console.warn('Audio playback not supported:', e);
    }
}

// --- DOM Loaded Setup ---
document.addEventListener('DOMContentLoaded', () => {
    const bookEl = document.getElementById('book-container');
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
    const pageLabel = document.getElementById('page-indicator');
    const soundToggle = document.getElementById('btn-sound-toggle');
    const fullscreenToggle = document.getElementById('btn-fullscreen');

    if (!bookEl) return;

    // Calculate dynamic base dimensions for PageFlip to guarantee it scales generously without overflowing
    const isMobile = window.innerWidth < 768;
    const availH = Math.max(380, window.innerHeight - 120);
    const maxPageH = isMobile ? Math.min(620, Math.round(availH * 0.94)) : Math.min(800, Math.round(availH * 0.96));
    const maxPageW = Math.round(maxPageH * (440 / 660));

    const pageFlip = new PageFlip(bookEl, {
        width: 440,
        height: 660,
        size: 'stretch',
        minWidth: 200,
        maxWidth: maxPageW,
        minHeight: 300,
        maxHeight: maxPageH,
        showCover: true,
        maxShadowOpacity: 0.45,
        showPageCorners: true,
        usePortrait: true,
        startPage: 0,
        flippingTime: 700,
        useMouseEvents: true,
        swipeDistance: 30,
        mobileScrollSupport: false
    });

    const pageElements = document.querySelectorAll('.page-sheet');
    pageFlip.loadFromHTML(pageElements);

    function updatePageIndicator() {
        const total = pageFlip.getPageCount();
        const current = pageFlip.getCurrentPageIndex();
        const orientation = pageFlip.getOrientation();

        if (current === 0) {
            pageLabel.textContent = 'Portada';
            prevBtn.disabled = true;
            nextBtn.disabled = false;
        } else if (current >= total - 1) {
            pageLabel.textContent = 'Contraportada';
            prevBtn.disabled = false;
            nextBtn.disabled = true;
        } else {
            prevBtn.disabled = false;
            nextBtn.disabled = false;
            if (orientation === 'landscape') {
                const left = current;
                const right = current + 1 <= total - 1 ? current + 1 : current;
                pageLabel.textContent = `${left} - ${right} de ${total}`;
            } else {
                pageLabel.textContent = `${current + 1} de ${total}`;
            }
        }
    }

    pageFlip.on('flip', (e) => {
        playPaperSound();
        updatePageIndicator();
    });

    pageFlip.on('changeState', (state) => {
        if (state === 'read') {
            updatePageIndicator();
        }
    });

    pageFlip.on('init', () => {
        updatePageIndicator();
        const loader = document.getElementById('book-loader');
        if (loader) loader.classList.add('hidden');
    });

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            initAudio();
            pageFlip.flipPrev();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            initAudio();
            pageFlip.flipNext();
        });
    }

    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'PageDown') {
            initAudio();
            pageFlip.flipNext();
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
            initAudio();
            pageFlip.flipPrev();
        }
    });

    // Sound toggle
    if (soundToggle) {
        soundToggle.addEventListener('click', () => {
            initAudio();
            soundEnabled = !soundEnabled;
            if (soundEnabled) {
                soundToggle.classList.remove('muted');
                soundToggle.querySelector('.sound-icon').textContent = '🔊';
                soundToggle.setAttribute('title', 'Silenciar sonido');
                playPaperSound();
            } else {
                soundToggle.classList.add('muted');
                soundToggle.querySelector('.sound-icon').textContent = '🔇';
                soundToggle.setAttribute('title', 'Activar sonido de papel');
            }
        });
    }

    // Fullscreen toggle
    if (fullscreenToggle) {
        fullscreenToggle.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.warn(`Error al activar pantalla completa: ${err.message}`);
                });
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        });
    }

    // --- Controles de Zoom ---
    let currentZoom = 1.0;
    const zoomStep = 0.15;
    const minZoom = 0.70;
    const maxZoom = 1.45;

    const zoomOutBtn = document.getElementById('btn-zoom-out');
    const zoomInBtn = document.getElementById('btn-zoom-in');
    const zoomLevelLabel = document.getElementById('zoom-level');
    const viewportEl = document.querySelector('.viewer-viewport');

    function applyZoom(newZoom) {
        currentZoom = Math.min(maxZoom, Math.max(minZoom, Math.round(newZoom * 100) / 100));
        if (bookEl) {
            bookEl.style.transform = `scale(${currentZoom})`;
            bookEl.style.transformOrigin = 'center center';
            bookEl.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.3, 1)';
        }
        if (zoomLevelLabel) {
            zoomLevelLabel.textContent = `${Math.round(currentZoom * 100)}%`;
        }
        if (zoomOutBtn) zoomOutBtn.disabled = currentZoom <= minZoom;
        if (zoomInBtn) zoomInBtn.disabled = currentZoom >= maxZoom;
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => applyZoom(currentZoom - zoomStep));
    }
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => applyZoom(currentZoom + zoomStep));
    }
    if (zoomLevelLabel) {
        zoomLevelLabel.addEventListener('click', () => applyZoom(1.0));
    }

    // Zoom táctil (Pinch to zoom) en móviles/tablets
    if (viewportEl) {
        let initialDistance = 0;
        let initialZoom = 1.0;

        viewportEl.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                initialDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                initialZoom = currentZoom;
            }
        }, { passive: true });

        viewportEl.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && initialDistance > 0) {
                const currentDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                const scaleFactor = currentDistance / initialDistance;
                applyZoom(initialZoom * scaleFactor);
            }
        }, { passive: true });

        viewportEl.addEventListener('touchend', (e) => {
            if (e.touches.length < 2) {
                initialDistance = 0;
            }
        }, { passive: true });
    }
});
