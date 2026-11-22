// Manifiesto y plan de actualización para el navegador y Node.
(function (raiz) {
  "use strict";

  const enNode = typeof module === "object" && module.exports;
  const MAX_BYTES = 8000000;
  const excluidas = new Set(["README.md", "vercel.json", "sw.js", "ota-base.json", "version-app.json"]);
  const mime = new Map(Object.entries({
    html: "text/html; charset=utf-8",
    js: "text/javascript; charset=utf-8",
    css: "text/css; charset=utf-8",
    json: "application/json; charset=utf-8",
    webmanifest: "application/json; charset=utf-8",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    svg: "image/svg+xml",
    gz: "application/gzip",
    wasm: "application/wasm",
    txt: "text/plain; charset=utf-8",
    md: "text/plain; charset=utf-8"
  }));

  // Compatible con navegadores internos de Android viejos (sin Object.hasOwn).
  function tiene(objeto, clave) { return Object.prototype.hasOwnProperty.call(objeto, clave); }

  function esRutaOta(ruta) {
    return typeof ruta === "string" && /^[A-Za-z0-9._/@+-]+$/.test(ruta) &&
      !ruta.startsWith("/") && !ruta.includes("..") && !ruta.includes("//") &&
      !ruta.startsWith("descargas/") && !ruta.split("/").some(segmento => segmento.startsWith(".")) &&
      !ruta.endsWith(".test.js") && !excluidas.has(ruta);
  }

  function tipoMime(ruta) {
    const nombre = ruta.slice(ruta.lastIndexOf("/") + 1);
    const punto = nombre.lastIndexOf(".");
    const extension = punto < 0 ? "" : nombre.slice(punto + 1).toLowerCase();
    return mime.get(extension) || "application/octet-stream";
  }

  async function hashHex(bytes) {
    const crypto = enNode ? require("node:crypto").webcrypto : raiz.crypto;
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  }

  function construirManifiesto({ archivos, sha, generado, requiereApk }) {
    const entradas = archivos.filter(({ ruta }) => esRutaOta(ruta))
      .sort((a, b) => a.ruta < b.ruta ? -1 : Number(a.ruta > b.ruta))
      .map(({ ruta, hash, tam }) => [ruta, { hash, tam }]);
    return { formato: 1, sha, generado, requiereApk, archivos: Object.fromEntries(entradas) };
  }

  function esObjeto(valor) {
    return valor !== null && typeof valor === "object" && !Array.isArray(valor);
  }

  function esFechaIso(valor) {
    if (typeof valor !== "string") return false;
    const partes = /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(valor);
    if (!partes || !Number.isFinite(Date.parse(valor))) return false;
    const fecha = new Date(partes[1] + "T00:00:00Z");
    return Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0, 10) === partes[1];
  }

  function validarManifiesto(m) {
    return esObjeto(m) && m.formato === 1 && typeof m.sha === "string" && /^[a-f0-9]{7,40}$/i.test(m.sha) &&
      esFechaIso(m.generado) && Number.isInteger(m.requiereApk) && m.requiereApk >= 0 &&
      esObjeto(m.archivos) && tiene(m.archivos, "index.html") &&
      Object.entries(m.archivos).every(([ruta, archivo]) => esRutaOta(ruta) && esObjeto(archivo) &&
        typeof archivo.hash === "string" && /^[a-f0-9]{64}$/i.test(archivo.hash) &&
        Number.isInteger(archivo.tam) && archivo.tam >= 0);
  }

  function planActualizacion({ manifiesto, base, actual, apkVersion }) {
    const resultado = accion => ({ accion, descargar: [], bytes: 0, mantener: [] });
    if (!validarManifiesto(manifiesto) || !validarManifiesto(base)) return resultado("invalido");
    if (manifiesto.requiereApk > apkVersion) return resultado("apk");
    if (Date.parse(manifiesto.generado) < Date.parse(base.generado)) return resultado("invalido");
    if (actual && manifiesto.sha === actual.sha) return resultado("nada");

    const plan = resultado("descargar");
    for (const [ruta, { hash, tam }] of Object.entries(manifiesto.archivos)) {
      if (tiene(base.archivos, ruta) && base.archivos[ruta].hash.toLowerCase() === hash.toLowerCase()) continue;
      const hashActual = actual && actual.archivos && tiene(actual.archivos, ruta) && actual.archivos[ruta];
      if (typeof hashActual === "string" && hashActual.toLowerCase() === hash.toLowerCase()) {
        plan.mantener.push(ruta);
      } else {
        plan.descargar.push({ ruta, hash, tam });
        plan.bytes += tam;
      }
    }
    if (plan.bytes > MAX_BYTES) return resultado("invalido");
    if (!actual && plan.descargar.length === 0) return resultado("nada");
    return plan;
  }

  function urlArchivo(plantilla, sha, ruta) {
    if (!esRutaOta(ruta)) throw new Error("Ruta OTA inválida");
    const rutaCodificada = ruta.split("/").map(segmento => encodeURI(segmento)).join("/");
    return plantilla.replace(/\{(sha|ruta)\}/g, (_, clave) => clave === "sha" ? sha : rutaCodificada);
  }

  const api = { MAX_BYTES, esRutaOta, tipoMime, hashHex, construirManifiesto, validarManifiesto, planActualizacion, urlArchivo };
  if (enNode) module.exports = api;
  else raiz.NovaOta = api;
})(typeof window !== "undefined" ? window : this);
