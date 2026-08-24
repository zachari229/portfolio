// ============================================================
//  main.js — Script principal du portfolio Zachari GANDEKON
// ============================================================

// ─── Mobile menu toggle ───────────────────────────────────
function toggleMobileMenu() {
  const mobileMenu = document.getElementById("mobileMenu");
  const menuIcon = document.querySelector(".menu-icon");
  const closeIcon = document.querySelector(".close-icon");

  if (!mobileMenu) return;

  mobileMenu.classList.toggle("active");

  if (menuIcon) menuIcon.classList.toggle("hidden");
  if (closeIcon) closeIcon.classList.toggle("hidden");
}

// Fermer le menu quand on clique un lien
document.addEventListener("click", function (e) {
  const mobileMenu = document.getElementById("mobileMenu");
  if (!mobileMenu) return;
  if (e.target.classList.contains("nav-link")) {
    mobileMenu.classList.remove("active");
    const menuIcon = document.querySelector(".menu-icon");
    const closeIcon = document.querySelector(".close-icon");
    if (menuIcon) menuIcon.classList.remove("hidden");
    if (closeIcon) closeIcon.classList.add("hidden");
  }
});

// ─── Smooth scroll ────────────────────────────────────────
function scrollToSection(id) {
  const element = document.getElementById(id);
  const mobileMenu = document.getElementById("mobileMenu");

  if (element) {
    element.scrollIntoView({ behavior: "smooth" });
    if (mobileMenu && mobileMenu.classList.contains("active")) {
      toggleMobileMenu();
    }
  }
}

// ─── Typed.js ─────────────────────────────────────────────
function initTyped() {
  const el = document.getElementById("textDefil");
  if (!el) return;

  if (window.typedInstance) {
    window.typedInstance.destroy();
  }

  window.typedInstance = new Typed("#textDefil", {
    strings: [
      " développeur Full Stack",
      " développeur WordPress",
      " spécialiste SEO",
      " community manager",
      " passionné par la cybersécurité.",
    ],
    typeSpeed: 100,
    backSpeed: 100,
    backDelay: 1500,
    loop: true,
  });
}

// ─── Progress bars animation ──────────────────────────────
function initProgressBars() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const fills = entry.target.querySelectorAll(".progress-fill");
          fills.forEach((fill, i) => {
            setTimeout(() => {
              const levelEl =
                fill.parentElement.previousElementSibling?.querySelector(
                  ".skill-level",
                );
              if (levelEl) fill.style.width = levelEl.textContent;
            }, i * 100);
          });
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 },
  );

  document.querySelectorAll(".skill-item").forEach((item) => {
    observer.observe(item);
  });
}

// ─── Animate on scroll ────────────────────────────────────
function initScrollAnimations() {
  const animateObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    },
    { threshold: 0.1 },
  );

  document.querySelectorAll(".animate-on-scroll").forEach((el) => {
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

// ─── Détection automatique du chemin racine ───────────────
function getRootPath() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const isInSubfolder = parts[parts.length - 2] === "pages";
  return isInSubfolder ? "../" : "";
}

// ─── Synchronisation des selects de langue ────────────────
function initLangSync() {
  const langMain = document.getElementById("lang");
  const langMobile = document.getElementById("lang-mobile");

  if (!langMain || !langMobile) return;

  // Aligner le select mobile sur la valeur actuelle du principal
  langMobile.value = langMain.value;

  // Changement depuis le select mobile → met à jour le principal
  langMobile.addEventListener("change", function () {
    langMain.value = langMobile.value;
    langMain.dispatchEvent(new Event("change"));
  });

  // Changement depuis le select principal → met à jour le mobile
  langMain.addEventListener("change", function () {
    langMobile.value = langMain.value;
  });
}

// ─── Masquer le loader plein écran ────────────────────────
function hidePageLoader() {
  const loader = document.getElementById("page-loader");
  if (!loader) return;
  loader.classList.add("loader-hidden");
  setTimeout(() => loader.remove(), 500);
}

// ─── Point d'entrée principal ─────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  const root = getRootPath();

  // 1. Charger header et footer
  await Promise.all([
    loadComponent("header-placeholder", root + "header.html"),
    loadComponent("footer-placeholder", root + "footer.html"),
  ]);

  // 2. Synchroniser les deux selects de langue
  initLangSync();

  // 3. Initialiser les traductions
  if (typeof initTranslations === "function") {
    initTranslations();
  }

  // 4. Initialiser les autres fonctionnalités
  initTyped();
  initProgressBars();
  initScrollAnimations();

  // 5. Masquer le loader une fois tout prêt
  hidePageLoader();
});

// ============================================================
//  PWA — Enregistrement du Service Worker
// ============================================================
function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Vérifie régulièrement s'il existe une nouvelle version du SW
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // Une nouvelle version est prête : on l'active immédiatement
              // et on recharge une seule fois pour l'appliquer.
              newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      })
      .catch((err) => console.error("[SW] Échec de l’enregistrement :", err));

    // Recharge la page une seule fois quand le nouveau SW prend le contrôle
    let refreshed = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshed) return;
      refreshed = true;
      window.location.reload();
    });
  });
}

// ============================================================
//  PWA — Bandeau d'installation personnalisé
// ============================================================
let deferredInstallPrompt = null;

function initInstallBanner() {
  // Ne rien faire si déjà installé (mode standalone)
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  if (isStandalone) return;

  // Ne pas re-proposer si l'utilisateur a déjà fermé le bandeau récemment
  const dismissedAt = localStorage.getItem("pwaInstallDismissedAt");
  if (
    dismissedAt &&
    Date.now() - Number(dismissedAt) < 7 * 24 * 60 * 60 * 1000
  ) {
    return;
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    showInstallBanner();
  });

  window.addEventListener("appinstalled", () => {
    hideInstallBanner();
    deferredInstallPrompt = null;
  });
}

function showInstallBanner() {
  if (document.getElementById("pwaInstallBanner")) return;

  const banner = document.createElement("div");
  banner.id = "pwaInstallBanner";
  banner.className = "pwa-install-banner";
  banner.innerHTML = `
    <div class="pwa-install-banner-content">
      <i class="fa-solid fa-mobile-screen-button pwa-install-icon"></i>
      <div class="pwa-install-text">
        <strong>Installer le portfolio</strong>
        <span>Accès rapide, hors ligne, comme une vraie application.</span>
      </div>
    </div>
    <div class="pwa-install-actions">
      <button class="btn btn-primary pwa-install-btn" id="pwaInstallConfirm">Installer</button>
      <button class="pwa-install-close" id="pwaInstallDismiss" aria-label="Fermer">&times;</button>
    </div>
  `;
  document.body.appendChild(banner);

  requestAnimationFrame(() => banner.classList.add("visible"));

  document
    .getElementById("pwaInstallConfirm")
    .addEventListener("click", async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      hideInstallBanner();
    });

  document.getElementById("pwaInstallDismiss").addEventListener("click", () => {
    localStorage.setItem("pwaInstallDismissedAt", String(Date.now()));
    hideInstallBanner();
  });
}

function hideInstallBanner() {
  const banner = document.getElementById("pwaInstallBanner");
  if (!banner) return;
  banner.classList.remove("visible");
  setTimeout(() => banner.remove(), 300);
}

registerServiceWorker();
initInstallBanner();


