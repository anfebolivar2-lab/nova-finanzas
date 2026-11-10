// Service worker de NOVA: guarda en el celular lo que se ve para que siga funcionando sin internet.
// - Mapas (teselas satelitales y de calles) y fuentes: se piden una vez y quedan guardados.
// - La propia app: primero se intenta la red y, si no hay, se usa la copia guardada.
const TESELAS = "nova-teselas-v1", APP = "nova-app-v1", MAX_TESELAS = 1500;
// En la app instalada los archivos ya están dentro del celular: solo se guardan mapas y fuentes.
const EN_APP = self.location.hostname === "localhost";
const EXTERNOS = /(^|\.)arcgisonline\.com$|^tile\.openstreetmap\.org$|^fonts\.(googleapis|gstatic)\.com$/;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

async function recortar(cache) {
  const claves = await cache.keys();
  if (claves.length > MAX_TESELAS) await Promise.all(claves.slice(0, claves.length - MAX_TESELAS).map((k) => cache.delete(k)));
}
async function primeroCopia(req) {
  const cache = await caches.open(TESELAS);
  const hit = await cache.match(req);
  if (hit) return hit;
  const resp = await fetch(req);
  if (resp && (resp.ok || resp.type === "opaque")) { cache.put(req, resp.clone()).then(() => recortar(cache)).catch(() => {}); }
  return resp;
}
async function primeroRed(req) {
  const cache = await caches.open(APP);
  try {
    const resp = await fetch(req);
    if (resp && resp.ok) cache.put(req, resp.clone()).catch(() => {});
    return resp;
  } catch (e) {
    const hit = (await cache.match(req)) || (req.mode === "navigate" ? (await cache.match("index.html")) || (await cache.match("./")) : null);
    if (hit) return hit;
    throw e;
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url);
  if (EXTERNOS.test(u.hostname)) { e.respondWith(primeroCopia(req)); return; }
  if (!EN_APP && u.origin === self.location.origin && !/\/(descargas|vendor\/tesseract)\//.test(u.pathname) && !/sw\.js$/.test(u.pathname)) e.respondWith(primeroRed(req));
});
