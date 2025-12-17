export class CustomCursor {
    constructor() {
        // Check for touch device - disable custom cursor if touch
        if (window.matchMedia("(pointer: coarse)").matches) return;

        this.cursor = document.createElement('div');
        this.cursor.className = 'custom-cursor';
        document.body.appendChild(this.cursor);

        // GSAP Setters for performance
        this.xSet = gsap.quickTo(this.cursor, "x", { duration: 0.2, ease: "power3" });
        this.ySet = gsap.quickTo(this.cursor, "y", { duration: 0.2, ease: "power3" });

        this.init();
    }

    init() {
        // Move Cursor
        window.addEventListener("mousemove", (e) => {
            this.xSet(e.clientX);
            this.ySet(e.clientY);
        });

        // Hover Effects
        const interactives = document.querySelectorAll('a, button, .card, input, .founder-card, .logo, .sidebar-item');

        interactives.forEach(el => {
            el.addEventListener('mouseenter', () => {
                gsap.to(this.cursor, {
                    scale: 3,
                    opacity: 0.5,
                    mixBlendMode: 'difference', // Cool inversion effect
                    duration: 0.3
                });
            });

            el.addEventListener('mouseleave', () => {
                gsap.to(this.cursor, {
                    scale: 1,
                    opacity: 1,
                    mixBlendMode: 'normal',
                    duration: 0.3
                });
            });
        });

        // Hide when leaving window
        document.addEventListener('mouseenter', () => gsap.to(this.cursor, { opacity: 1 }));
        document.addEventListener('mouseleave', () => gsap.to(this.cursor, { opacity: 0 }));
    }
}

export function initCursor() {
    new CustomCursor();
}
