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

    // Proporción apaisada 594x432 px (ratio 1.375:1)
    const pageFlip = new PageFlip(bookEl, {
        width: 550,
        height: 400,
        size: 'stretch',
        minWidth: 320,
        maxWidth: 750,
        minHeight: 232,
        maxHeight: 545,
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
                pageLabel.textContent = `Páginas ${left} - ${right} de ${total}`;
            } else {
                pageLabel.textContent = `Página ${current + 1} de ${total}`;
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
            const text = soundToggle.querySelector('.sound-text');
            if (soundEnabled) {
                if (icon) icon.textContent = '🔊';
                if (text) text.textContent = 'Silenciar';
                initAudio();
                playPaperSound();
            } else {
                if (icon) icon.textContent = '🔇';
                if (text) text.textContent = 'Activar sonido';
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

    window.addEventListener('click', () => initAudio(), { once: true });
    window.addEventListener('touchstart', () => initAudio(), { once: true });
});
