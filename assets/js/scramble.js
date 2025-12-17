export class ScrambleText {
    constructor(selector = '.scramble-text') {
        this.elements = document.querySelectorAll(selector);
        this.chars = '!<>-_\\/[]{}—=+*^?#________';
        this.init();
    }

    init() {
        this.elements.forEach(el => {
            const originalText = el.getAttribute('data-text') || el.innerText;
            el.setAttribute('data-text', originalText); // Store original

            // Only scramble if visible via ScrollTrigger or immediately
            // For now, let's run it on load.
            this.scramble(el, originalText);
        });
    }

    scramble(el, finalText) {
        let iterations = 0;
        const maxIterations = 3; // How many times a letter scrambles before settling

        // Split text to preserve specific characters (like spaces) if needed, 
        // but simple array mapping is usually fine.

        const interval = setInterval(() => {
            el.innerText = finalText
                .split('')
                .map((letter, index) => {
                    if (index < iterations) {
                        return finalText[index];
                    }
                    return this.chars[Math.floor(Math.random() * this.chars.length)];
                })
                .join('');

            if (iterations >= finalText.length) {
                clearInterval(interval);
            }

            iterations += 1 / 2; // Speed control
        }, 30);
    }
}

export function initScramble() {
    // Only target elements that explicitly want this effect
    // We can also auto-target hero titles
    const titles = document.querySelectorAll('.hero-title, .hero-subtitle');
    titles.forEach(t => t.classList.add('scramble-text'));

    new ScrambleText('.scramble-text');
}
