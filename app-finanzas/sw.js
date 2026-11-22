// Service worker de NOVA: guarda en el celular lo que se ve para que siga funcionando sin internet.
// - Mapas (teselas satelitales y de calles) y fuentes: se piden una vez y quedan guardados.
// - La propia app: primero se intenta la red y, si no hay, se usa la copia guardada.
const TESELAS = "nova-teselas-v1", APP = "nova-app-v1", MAX_TESELAS = 1500;
// En la app instalada se usan los archivos de la APK y los cambios verificados.
const EN_APP = self.location.hostname === "localhost";
const EXTERNOS = /(^|\.)arcgisonline\.com$|^tile\.openstreetmap\.org$|^fonts\.(googleapis|gstatic)\.com$/;
const META_CACHE = "nova-ota-meta", META_URL = "/__ota-meta__", MALOS_URL = "/__ota-malos__", MAX_ARRANQUES = 3;

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

async function leerMeta() {
  try {
    const respuesta = await (await caches.open(META_CACHE)).match(META_URL);
    return respuesta ? await respuesta.json() : null;
  } catch (e) { return null; }
}

async function guardarJson(url, datos) {
  const cache = await caches.open(META_CACHE);
  await cache.put(url, new Response(JSON.stringify(datos), { headers: { "Content-Type": "application/json" } }));
}

async function descartar(meta) {
  const cache = await caches.open(META_CACHE);
  const respuesta = await cache.match(MALOS_URL);
  const lista = respuesta ? await respuesta.json().catch(() => []) : [];
  const malos = Array.isArray(lista) ? lista.filter(sha => typeof sha === "string" && sha !== meta.sha) : [];
  await cache.delete(META_URL);
  await guardarJson(MALOS_URL, [meta.sha, ...malos].slice(0, 5));
  const nombres = await caches.keys();
  await Promise.all(nombres.filter(nombre => nombre.startsWith("nova-ota-") && nombre !== META_CACHE)
    .map(nombre => caches.delete(nombre)));
}

function conBloqueoOta(tarea) {
  return self.navigator.locks ? self.navigator.locks.request(META_CACHE, tarea) : tarea();
}

async function servirApp(req, guardar) {
  try {
    let ruta = new URL(req.url).pathname.slice(1);
    if (!ruta || ruta.endsWith("/")) ruta += "index.html";
    const meta = await leerMeta();
    if (!meta) return fetch(req);
    const incluida = Object.prototype.hasOwnProperty.call(meta.archivos, ruta);
    const respuesta = incluida && await (await caches.open(meta.cache)).match(self.location.origin + "/" + ruta);
    // El HTML de la APK también puede abrir scripts de la OTA.
    if (req.mode === "navigate" && (respuesta || ruta === "index.html")) {
      if (!meta.ok && meta.arranques >= MAX_ARRANQUES) {
        await descartar(meta);
        return fetch(req);
      }
      meta.arranques++;
      guardar(guardarJson(META_URL, meta));
    }
    return respuesta || fetch(req);
  } catch (e) { return fetch(req); }
}

if (EN_APP) self.addEventListener("message", (e) => {
  const { tipo, sha } = e.data || {};
  if (tipo !== "ota-ok" && tipo !== "ota-descartar") return;
  e.waitUntil(Promise.resolve().then(() => conBloqueoOta(async () => {
    const meta = await leerMeta();
    if (!meta || meta.sha !== sha) return;
    if (tipo === "ota-descartar") await descartar(meta);
    else {
      meta.ok = true;
      meta.arranques = 0;
      await guardarJson(META_URL, meta);
    }
  })).catch(() => {}));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url);
  if (EXTERNOS.test(u.hostname)) { e.respondWith(primeroCopia(req)); return; }
  if (EN_APP && u.origin === self.location.origin && !/\/sw\.js$/.test(u.pathname)) {
    if (req.mode !== "navigate") {
      e.respondWith(servirApp(req));
      return;
    }
    // La respuesta sale mientras se guarda el contador. El bloqueo ordena los cambios de meta.
    let responder;
    let rechazar;
    e.respondWith(new Promise((resolve, reject) => { responder = resolve; rechazar = reject; }));
    e.waitUntil(Promise.resolve().then(() => conBloqueoOta(async () => {
      let escritura;
      responder(await servirApp(req, promesa => { escritura = promesa.catch(() => {}); }));
      await escritura;
    })).catch(() => responder(fetch(req))).catch(rechazar));
  }
  if (!EN_APP && u.origin === self.location.origin && !/\/(descargas|vendor\/tesseract)\//.test(u.pathname) && !/sw\.js$/.test(u.pathname)) e.respondWith(primeroRed(req));
});
