document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Navbar Scroll Effect
    const navbar = document.getElementById('navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            navbar.classList.toggle('scrolled', window.scrollY > 60);
        });
    }

    // 2. Image Error Fallback (Replaces the inline onerror)
    const sealImg = document.querySelector('.navbar-logo img');
    if (sealImg) {
        sealImg.addEventListener('error', function() {
            this.parentElement.innerHTML = '⚙️';
        });
    }
});