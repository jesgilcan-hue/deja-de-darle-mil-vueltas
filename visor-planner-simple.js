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

        const bufferSize = audioCtx.sampleRate * 0.18;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.8);
        }

        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;

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

document.addEventListener('DOMContentLoaded', () => {
    const bookEl = document.getElementById('book-container');
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
    const pageLabel = document.getElementById('page-indicator');
    const soundToggle = document.getElementById('btn-sound-toggle');
    const fullscreenToggle = document.getElementById('btn-fullscreen');

    if (!bookEl) return;

    // Proporción apaisada 550x400 px
    const isMobile = window.innerWidth < 768;
    const availH = Math.max(340, window.innerHeight - 130);
    const maxPageH = Math.min(520, Math.round(availH * 0.95));
    const maxPageW = Math.round(maxPageH * (550 / 400));

    const pageFlip = new PageFlip(bookEl, {
        width: 550,
        height: 400,
        size: 'stretch',
        minWidth: 260,
        maxWidth: maxPageW,
        minHeight: 200,
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

    if (soundToggle) {
        soundToggle.addEventListener('click', () => {
            soundEnabled = !soundEnabled;
            soundToggle.classList.toggle('muted', !soundEnabled);
            const icon = soundToggle.querySelector('.sound-icon');
            if (soundEnabled) {
                if (icon) icon.textContent = '🔊';
                soundToggle.title = 'Silenciar sonido de papel';
                initAudio();
                playPaperSound();
            } else {
                if (icon) icon.textContent = '🔇';
                soundToggle.title = 'Activar sonido de pasar página';
            }
        });
    }

    if (fullscreenToggle) {
        fullscreenToggle.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.log('Error attempting fullscreen:', err);
                });
                fullscreenToggle.classList.add('active');
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
                fullscreenToggle.classList.remove('active');
            }
        });

        document.addEventListener('fullscreenchange', () => {
            fullscreenToggle.classList.toggle('active', !!document.fullscreenElement);
        });
    }

    // --- Controles de Zoom ---
    const zoomInBtn = document.getElementById('btn-zoom-in');
    const zoomOutBtn = document.getElementById('btn-zoom-out');
    const zoomLabel = document.getElementById('zoom-level');
    const bookWrapper = document.querySelector('.book-wrapper');

    const zoomSteps = [0.5, 0.65, 0.8, 0.9, 1.0, 1.15, 1.3, 1.5];
    const defaultZoomIdx = 4; // 1.0 (100%)
    let currentZoomIdx = defaultZoomIdx;

    function applyZoom(idx) {
        currentZoomIdx = Math.max(0, Math.min(zoomSteps.length - 1, idx));
        const scale = zoomSteps[currentZoomIdx];
        if (bookWrapper) {
            bookWrapper.style.transform = scale === 1.0 ? '' : `scale(${scale})`;
        }
        if (zoomLabel) {
            zoomLabel.textContent = `${Math.round(scale * 100)}%`;
        }
        if (zoomOutBtn) zoomOutBtn.disabled = currentZoomIdx === 0;
        if (zoomInBtn) zoomInBtn.disabled = currentZoomIdx === zoomSteps.length - 1;
    }

    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => applyZoom(currentZoomIdx + 1));
    }
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => applyZoom(currentZoomIdx - 1));
    }
    if (zoomLabel) {
        zoomLabel.addEventListener('click', () => applyZoom(defaultZoomIdx)); // Reset to 100%
    }

    window.addEventListener('keydown', (e) => {
        if ((e.key === '+' || e.key === '=') && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            applyZoom(currentZoomIdx + 1);
        } else if (e.key === '-' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            applyZoom(currentZoomIdx - 1);
        } else if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            applyZoom(defaultZoomIdx);
        }
    });

    window.addEventListener('click', () => initAudio(), { once: true });
    window.addEventListener('touchstart', () => initAudio(), { once: true });
});
