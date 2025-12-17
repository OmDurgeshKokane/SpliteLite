import { AudioManager } from './audio.js';
import { initChatbot } from './chatbot.js';
import { initMobileMenu } from './mobile_nav.js';
import { initCursor } from './cursor.js';
import { initTilt } from './tilt.js';
import { initScramble } from './scramble.js';

// Audio
const audioManager = new AudioManager();

// Theme Toggle
const themeBtn = document.getElementById('theme-toggle');
if (themeBtn) {
    themeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        // Audio feedback
        audioManager.play('click');

        const icon = themeBtn.querySelector('i');
        if (document.body.classList.contains('dark-mode')) {
            icon.classList.replace('fa-moon', 'fa-sun');
            showToast('Dark Mode Enabled 🌙', 'success');
        } else {
            icon.classList.replace('fa-sun', 'fa-moon');
            showToast('Light Mode Enabled ☀️', 'success');
        }
    });
}

// Sound Toggle (Reuse logic or simplify)
// For consistency, let's add the sound toggle button to the navbar via JS if it's missing, 
// or assume the HTML structure will be updated to match index.html
function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.cssText = `
        background: ${type === 'success' ? 'var(--success)' : 'var(--danger)'};
        color: white;
        padding: 1rem 2rem;
        margin-bottom: 1rem;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        opacity: 0;
        transform: translateY(20px);
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 2000;
        font-weight: 600;
    `;
    container.appendChild(toast);

    gsap.to(toast, { opacity: 1, y: 0, duration: 0.3 });
    gsap.to(toast, { opacity: 0, y: 20, duration: 0.3, delay: 3, onComplete: () => toast.remove() });
}

// Sound Toggle
function setupSoundToggle() {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    const btn = document.createElement('button');
    btn.className = 'icon-btn';
    btn.id = 'sound-toggle'; // Fixed ID
    btn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
    btn.onclick = () => {
        const enabled = audioManager.toggle();
        btn.innerHTML = enabled ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
        if (enabled) {
            audioManager.play('click');
            audioManager.startAmbient();
            showToast('Music Playing 🎵', 'success');
        } else {
            showToast('Music Paused 🔇', 'info');
        }
    };
    navLinks.insertBefore(btn, themeBtn); // Insert before theme toggle

    // Auto-start ambient if allowed
    document.addEventListener('click', () => {
        if (audioManager.enabled && audioManager.ctx.state === 'suspended') {
            audioManager.ctx.resume().then(() => audioManager.startAmbient());
        }
    }, { once: true });
}

function initLogoAnimation() {
    const logo = document.querySelector('.logo i');
    if (logo) {
        logo.addEventListener('mouseenter', () => {
            gsap.to(logo, { rotation: 360, duration: 0.5, ease: 'power1.inOut' });
        });
        logo.addEventListener('mouseleave', () => {
            gsap.set(logo, { rotation: 0 }); // Reset or animate back
        });
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    initChatbot();
    setupSoundToggle();
    initLogoAnimation();
    initMobileMenu();

    // Premium UI Init
    initCursor();
    initTilt();
    initScramble();

    // Auto-play attempt
    if (audioManager.enabled) {
        const tryPlay = () => {
            if (audioManager.ctx.state === 'suspended') {
                audioManager.ctx.resume().then(() => {
                    audioManager.startAmbient();
                }).catch(console.error);
            } else {
                audioManager.startAmbient();
            }
        };

        // Try immediately
        tryPlay();

        // Fallback: If still suspended (likely blocked), wait for first interaction
        if (audioManager.ctx.state === 'suspended') {
            const unlockAudio = () => {
                audioManager.ctx.resume().then(() => {
                    audioManager.startAmbient();
                });
                document.removeEventListener('click', unlockAudio);
                document.removeEventListener('keydown', unlockAudio);
            };
            document.addEventListener('click', unlockAudio);
            document.addEventListener('keydown', unlockAudio);
        }
    }
});
