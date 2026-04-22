// ============================================================
//  main.js — Script principal du portfolio Zachari GANDEKON
// ============================================================

// ─── Mobile menu toggle ───────────────────────────────────
function toggleMobileMenu() {
  const mobileMenu = document.getElementById('mobileMenu');
  const menuIcon = document.querySelector('.menu-icon');
  const closeIcon = document.querySelector('.close-icon');

  if (!mobileMenu) return;

  mobileMenu.classList.toggle('active');
  menuIcon.classList.toggle('hidden');
  closeIcon.classList.toggle('hidden');
}

// ─── Smooth scroll ────────────────────────────────────────
function scrollToSection(id) {
  const element = document.getElementById(id);
  const mobileMenu = document.getElementById('mobileMenu');

  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
    if (mobileMenu && mobileMenu.classList.contains('active')) {
      toggleMobileMenu();
    }
  }
}

// ─── Typed.js ─────────────────────────────────────────────
function initTyped() {
  const el = document.getElementById('textDefil');
  if (!el) return;

  // Si une instance existe déjà, on la détruit avant d'en créer une nouvelle
  if (window.typedInstance) {
    window.typedInstance.destroy();
  }

  window.typedInstance = new Typed('#textDefil', {
    strings: [
      ' développeur Full Stack',
      ' développeur WordPress',
      ' spécialiste SEO',
      ' passionné par la cybersécurité.'
    ],
    typeSpeed: 100,
    backSpeed: 100,
    backDelay: 1500,
    loop: true
  });
}

// ─── Progress bars animation ──────────────────────────────
function initProgressBars() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const fills = entry.target.querySelectorAll('.progress-fill');
        fills.forEach((fill, i) => {
          setTimeout(() => {
            const levelEl = fill.parentElement.previousElementSibling?.querySelector('.skill-level');
            if (levelEl) fill.style.width = levelEl.textContent;
          }, i * 100);
        });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.skill-item').forEach(item => {
    observer.observe(item);
  });
}

// ─── Animate on scroll ────────────────────────────────────
function initScrollAnimations() {
  const animateObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.animate-on-scroll').forEach(el => {
    animateObserver.observe(el);
  });
}

// ─── Chargement dynamique header / footer ─────────────────
async function loadComponent(id, path) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Erreur chargement ${path} : ${res.status}`);
    const html = await res.text();
    document.getElementById(id).innerHTML = html;
  } catch (err) {
    console.error(err);
  }
}

// ─── Détection automatique du chemin racine ──────────────
// Fonctionne pour index.html (racine) ET pages/*.html (sous-dossier)
function getRootPath() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const isInSubfolder = parts[parts.length - 2] === 'pages';
  return isInSubfolder ? '../' : '';
}

// ─── Point d'entrée principal ─────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {

  const root = getRootPath();

  // 1. Charger header et footer avec le bon chemin (racine ou sous-dossier)
  await Promise.all([
    loadComponent('header-placeholder', root + 'header.html'),
    loadComponent('footer-placeholder', root + 'footer.html')
  ]);

  // 2. Header dans le DOM → initialiser les traductions
  if (typeof initTranslations === 'function') {
    initTranslations();
  }

  // 3. Initialiser les autres fonctionnalités
  initTyped();
  initProgressBars();
  initScrollAnimations();
});