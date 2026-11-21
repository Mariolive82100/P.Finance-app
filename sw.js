const C = 'pf-v53';
const FILES = ['./', './index.html', './style.css', './firebase.js', './base.js', './pagine.js', './grafici.js', './albero.js', './report-pdf.js', './jspdf.min.js', './azioni.js', './manifest.json', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  // Componenti Firebase (indirizzo con versione fissa): copia salvata al primo uso, poi funzionano anche offline
  if (u.origin === 'https://www.gstatic.com' && u.pathname.startsWith('/firebasejs/')) {
    e.respondWith(caches.match(r).then(h => h || fetch(r).then(x => {
      if (x.ok) { const cp = x.clone(); caches.open(C).then(c => c.put(r, cp)); }
      return x;
    })));
    return;
  }
  if (u.origin !== location.origin) return;
  // File dell'app: prima la rete (così gli aggiornamenti arrivano subito), poi la copia salvata
  e.respondWith(fetch(r, { cache: 'no-cache' }).then(x => {
    const cp = x.clone(); caches.open(C).then(c => c.put(r, cp)); return x;
  }).catch(() => caches.match(r)));
});
