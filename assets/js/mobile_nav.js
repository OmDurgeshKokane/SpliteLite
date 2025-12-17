
export function initMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const mobileMenu = document.querySelector('.mobile-menu');
    const navLinks = document.querySelector('.nav-links'); // Original links container

    if (!hamburger || !mobileMenu) return;

    // Toggle Menu
    hamburger.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent bubbling issues
        hamburger.classList.toggle('active');
        mobileMenu.classList.toggle('active');

        if (mobileMenu.classList.contains('active')) {
            populateMobileMenu();
        }
    });

    // Close on click outside (optional but good UX)
    document.addEventListener('click', (e) => {
        if (mobileMenu.classList.contains('active') && !mobileMenu.contains(e.target) && !hamburger.contains(e.target)) {
            hamburger.classList.remove('active');
            mobileMenu.classList.remove('active');
        }
    });

    function populateMobileMenu() {
        mobileMenu.innerHTML = ''; // Clear previous

        // 1. Clone the main action button
        if (navLinks) {
            const mainAction = navLinks.querySelector('a.btn');
            if (mainAction) {
                const mobileBtn = mainAction.cloneNode(true);
                mobileBtn.style.fontSize = '1.5rem';
                mobileBtn.style.marginBottom = '2rem';
                mobileBtn.style.padding = '1rem 2rem';
                mobileMenu.appendChild(mobileBtn);
            }
        }

        // 2. Sound Toggle
        // Target the ORIGINAL button via ID to get its state and simulate click
        const desktopSound = document.getElementById('sound-toggle');
        // Fallback if ID not found (sometimes strict environments)
        const targetBtn = desktopSound || (navLinks ? navLinks.querySelector('button .fa-volume-high, button .fa-volume-xmark')?.parentElement : null);

        const isPlaying = targetBtn && targetBtn.querySelector('.fa-volume-high');

        const soundBtn = document.createElement('button');
        soundBtn.className = 'mobile-nav-btn';
        soundBtn.innerHTML = isPlaying ? '<i class="fa-solid fa-volume-high"></i> Sound On' : '<i class="fa-solid fa-volume-xmark"></i> Sound Off';

        soundBtn.onclick = () => {
            if (targetBtn) targetBtn.click();

            // Update this button's state after a short delay
            setTimeout(() => {
                const updatedPlaying = targetBtn && targetBtn.querySelector('.fa-volume-high');
                soundBtn.innerHTML = updatedPlaying ? '<i class="fa-solid fa-volume-high"></i> Sound On' : '<i class="fa-solid fa-volume-xmark"></i> Sound Off';

                // Close menu to show feedback on main page
                hamburger.classList.remove('active');
                mobileMenu.classList.remove('active');
            }, 300); // Slight delay to see the button state change first
        };
        mobileMenu.appendChild(soundBtn);

        // 3. Theme Toggle
        const desktopTheme = document.getElementById('theme-toggle');
        const isDark = document.body.classList.contains('dark-mode');

        const themeBtn = document.createElement('button');
        themeBtn.className = 'mobile-nav-btn';
        themeBtn.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i> Light Mode' : '<i class="fa-solid fa-moon"></i> Dark Mode';

        themeBtn.onclick = () => {
            if (desktopTheme) desktopTheme.click();
            setTimeout(() => {
                const nowDark = document.body.classList.contains('dark-mode');
                themeBtn.innerHTML = nowDark ? '<i class="fa-solid fa-sun"></i> Light Mode' : '<i class="fa-solid fa-moon"></i> Dark Mode';

                // Close menu
                hamburger.classList.remove('active');
                mobileMenu.classList.remove('active');
            }, 300);
        };
        mobileMenu.appendChild(themeBtn);
    }
}
