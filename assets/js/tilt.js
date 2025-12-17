export class TiltEffect {
    constructor(selector = '.card, .founder-card, .about-story, .btn, .cta-btn, .action-btn') {
        // Disable on touch devices
        if (window.matchMedia("(pointer: coarse)").matches) return;

        // Filter out elements inside Navbar as per user request
        const allElements = document.querySelectorAll(selector);
        this.elements = Array.from(allElements).filter(el => !el.closest('nav'));

        this.init();
    }

    init() {
        this.elements.forEach(el => {
            // Avoid double initialization
            if (el.dataset.tiltInitialized) return;
            el.dataset.tiltInitialized = 'true';

            // Add glare element if not present
            if (!el.querySelector('.tilt-glare')) {
                const glare = document.createElement('div');
                glare.className = 'tilt-glare';
                glare.style.cssText = `
                    position: absolute;
                    top: 0; left: 0; width: 100%; height: 100%;
                    background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%);
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.3s;
                    z-index: 10;
                    border-radius: inherit; /* Match button/card radius */
                `;
                el.style.position = 'relative'; // Ensure relative positioning
                el.style.transformStyle = 'preserve-3d'; // Enable 3D
                el.appendChild(glare);
            }

            el.addEventListener('mousemove', (e) => this.handleMove(e, el));
            el.addEventListener('mouseleave', () => this.handleLeave(el));
        });
    }

    handleMove(e, el) {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left; // Mouse X relative to element
        const y = e.clientY - rect.top;  // Mouse Y relative to element

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Intensity: Buttons get slightly punchier tilt because they are smaller
        const isButton = el.tagName === 'BUTTON' || el.classList.contains('btn');
        const intensity = isButton ? 15 : 10;

        const rotateX = ((y - centerY) / centerY) * -intensity;
        const rotateY = ((x - centerX) / centerX) * intensity;

        // Apply Tilt
        gsap.to(el, {
            transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`,
            duration: 0.1,
            ease: "power1.out"
        });

        // Move Glare
        const glare = el.querySelector('.tilt-glare');
        if (glare) {
            const glareX = (x / rect.width) * 100;
            const glareY = (y / rect.height) * 100;

            gsap.to(glare, {
                background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.2), transparent 60%)`,
                opacity: 1,
                duration: 0.1
            });
        }
    }

    handleLeave(el) {
        gsap.to(el, {
            transform: `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`,
            duration: 0.5,
            ease: "elastic.out(1, 0.5)"
        });

        const glare = el.querySelector('.tilt-glare');
        if (glare) {
            gsap.to(glare, { opacity: 0, duration: 0.5 });
        }
    }
}

export function initTilt() {
    new TiltEffect();
}
