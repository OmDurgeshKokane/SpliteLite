export function initAnimations() {
    gsap.registerPlugin(ScrollTrigger);

    // Hero Animations
    const tl = gsap.timeline();

    tl.from('.hero-title', {
        y: 100,
        opacity: 0,
        duration: 1,
        ease: 'power4.out',
        stagger: 0.2
    })
        .from('.hero-desc', {
            y: 50,
            opacity: 0,
            duration: 1,
            ease: 'power3.out'
        }, "-=0.5")
        .from('.cta-btn', {
            scale: 0.8,
            opacity: 0,
            duration: 0.5,
            ease: 'back.out(1.7)'
        }, "-=0.5")
        .from('.hero-visual', {
            x: 100,
            opacity: 0,
            duration: 1.5,
            ease: 'power2.out'
        }, "-=1");

    // Scroll Triggers
    gsap.from('.dashboard-section', {
        scrollTrigger: {
            trigger: '.dashboard-section',
            start: 'top 80%',
            toggleActions: 'play none none reverse'
        },
        y: 50,
        opacity: 0,
        duration: 0.8
    });

    gsap.utils.toArray('.col').forEach((col, i) => {
        gsap.from(col, {
            scrollTrigger: {
                trigger: col,
                start: 'top 85%',
                toggleActions: 'play none none none'
            },
            y: 50,
            opacity: 0,
            duration: 0.8,
            delay: i * 0.2
        });
    });

    // Logo Hover
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
