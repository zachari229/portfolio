/* ============================================================
   sw.js — Service Worker du portfolio Zachari GANDEKON
   Stratégie :
   - App shell (HTML/CSS/JS/Images/Icônes) précaché à l'installation
   - Navigations (pages HTML) : Network First -> Cache -> offline.html
   - Assets statiques same-origin : Stale-While-Revalidate
   - CDN de confiance (fonts, fontawesome, typed.js, i18next) :
     Stale-While-Revalidate dans un cache dédié
   - Domaines dynamiques (Supabase, Formspree, Analytics) :
     jamais interceptés, toujours réseau direct
   ============================================================ */

const SW_VERSION      = "v1.0.0";
const APP_SHELL_CACHE = `zg-app-shell-${SW_VERSION}`;
const RUNTIME_CACHE    = `zg-runtime-${SW_VERSION}`;
const CDN_CACHE         = `zg-cdn-${SW_VERSION}`;

const OFFLINE_URL = "/offline.html";

// Ressources essentielles précachées à l'installation du Service Worker
const APP_SHELL = [
  "/index.html",
  "/header.html",
  "/footer.html",
  "/style.css",
  "/manifest.json",
  "/offline.html",

  "/css/about.css",
  "/css/admin-temoignages.css",
  "/css/boutique.css",
  "/css/contact.css",
  "/css/cv.css",
  "/css/portfolio.css",
  "/css/services.css",
  "/css/temoignages.css",

  "/js/main.js",
  "/js/translations.js",

  "/pages/about.html",
  "/pages/boutique.html",
  "/pages/contact.html",
  "/pages/cv.html",
  "/pages/portfolio.html",
  "/pages/services.html",
  "/pages/temoignages.html",

  "/Image/photo.profil.webp",
  "/Image/ATLAS-BTP.webp",
  "/Image/Prime Care.webp",
  "/Image/picnic.webp",
  "/Image/projet1.webp",
  "/Image/projet3.webp",
  "/Image/restauto (1).webp",

  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-192-maskable.png",
  "/icons/icon-512-maskable.png",
  "/icons/apple-touch-icon.png",
  "/icons/favicon.ico",
];

// Domaines CDN de confiance à mettre en cache (stale-while-revalidate)
const TRUSTED_CDN_HOSTS = [
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "cdnjs.cloudflare.com",
  "unpkg.com",
];

// Domaines dynamiques à ne JAMAIS intercepter (toujours réseau)
const NEVER_CACHE_HOSTS = [
  "supabase.co",
  "formspree.io",
  "googletagmanager.com",
  "google-analytics.com",
  "analytics.google.com",
];

// ─────────────────────────────────────────────────────────
// INSTALL — précache l'app shell
// ─────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_SHELL_CACHE);
      // addAll échoue globalement si une seule ressource échoue :
      // on ajoute donc chaque ressource individuellement pour être résilient.
      await Promise.all(
        APP_SHELL.map(async (url) => {
          try {
            await cache.add(new Request(url, { cache: "reload" }));
          } catch (err) {
            console.warn("[SW] Précache échoué pour :", url, err);
          }
        })
      );
      self.skipWaiting();
    })()
  );
});

// ─────────────────────────────────────────────────────────
// ACTIVATE — nettoie les anciens caches
// ─────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => ![APP_SHELL_CACHE, RUNTIME_CACHE, CDN_CACHE].includes(key))
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
function isNeverCache(url) {
  return NEVER_CACHE_HOSTS.some((host) => url.hostname.includes(host));
}

function isTrustedCdn(url) {
  return TRUSTED_CDN_HOSTS.some((host) => url.hostname.includes(host));
}

// Network First : essaie le réseau, retombe sur le cache, puis sur offline.html
async function networkFirst(request) {
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(APP_SHELL_CACHE);
    cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    throw err;
  }
}

// Stale While Revalidate : sert le cache immédiatement, met à jour en arrière-plan
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || networkPromise;
}

// ─────────────────────────────────────────────────────────
// FETCH — routage selon le type de requête
// ─────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // On n'intercepte que les GET (POST vers Formspire/Supabase passent tels quels)
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // 1. Domaines dynamiques : jamais interceptés
  if (isNeverCache(url)) return;

  // 2. Navigations HTML (changement de page) : Network First + fallback offline
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  // 3. CDN de confiance (fonts, fontawesome, typed.js, i18next...) : SWR
  if (url.origin !== self.location.origin && isTrustedCdn(url)) {
    event.respondWith(staleWhileRevalidate(request, CDN_CACHE));
    return;
  }

  // 4. Autres ressources cross-origin non listées : on laisse passer normalement
  if (url.origin !== self.location.origin) return;

  // 5. Assets statiques same-origin (CSS, JS, images, icônes, manifest) : SWR
  if (
    ["style", "script", "image", "font"].includes(request.destination) ||
    url.pathname === "/manifest.json"
  ) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  // 6. Fallback générique : Network First
  event.respondWith(networkFirst(request));
});

// ─────────────────────────────────────────────────────────
// MESSAGE — permet à la page de forcer l'activation immédiate
// (utilisé par le bandeau "Nouvelle version disponible")
// ─────────────────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
