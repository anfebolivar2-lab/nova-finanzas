const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { closeSync, mkdtempSync, mkdirSync, openSync, readFileSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const O = require("./ota.js");

const HASH = "a".repeat(64);
const NUEVO = "b".repeat(64);
const ABC = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
const GENERADO = "2026-11-22T10:00:00.000Z";
const SHA = "abc1234";

function manifiesto(cambios = {}) {
  return {
    formato: 1, sha: SHA, generado: GENERADO, requiereApk: 0,
    archivos: { "index.html": { hash: HASH, tam: 3 } },
    ...cambios
  };
}

function plan(remoto, actual = null, base = manifiesto()) {
  return O.planActualizacion({ manifiesto: remoto, base, actual, apkVersion: 1 });
}

function sinDescargas(accion) {
  return { accion, descargar: [], bytes: 0, mantener: [] };
}

test("acepta solo rutas seguras de la app", () => {
  for (const ruta of ["vendor/591.supabase.js", "iconos/icono-192.png", "index.html", "vendor/@nova/a+b.js"]) {
    assert.equal(O.esRutaOta(ruta), true, ruta);
  }
  for (const ruta of ["", "../x", "/x", "a//b", ".env", "a/.env", "a\\b", "a..b", "a%20b",
    "a b", "a\n", "á.js", "descargas/NOVA.apk", "app.test.js", "a/app.test.js", "sw.js",
    "README.md", "vercel.json", "ota-base.json", "version-app.json", null]) {
    assert.equal(O.esRutaOta(ruta), false, String(ruta));
  }
});

test("elige el tipo MIME por extensión", () => {
  const tipos = {
    html: "text/html; charset=utf-8", js: "text/javascript; charset=utf-8", css: "text/css; charset=utf-8",
    json: "application/json; charset=utf-8", webmanifest: "application/json; charset=utf-8",
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", svg: "image/svg+xml",
    gz: "application/gzip", wasm: "application/wasm", txt: "text/plain; charset=utf-8", md: "text/plain; charset=utf-8",
    bin: "application/octet-stream"
  };
  for (const [extension, tipo] of Object.entries(tipos)) {
    assert.equal(O.tipoMime("vendor/archivo." + extension), tipo);
  }
  assert.equal(O.tipoMime("iconos/NOVA.PNG"), "image/png");
  assert.equal(O.tipoMime("vendor.js/js"), "application/octet-stream");
});

test("calcula el SHA-256 de abc", async () => {
  assert.equal(await O.hashHex(Buffer.from("abc")), ABC);
});

test("construye un manifiesto con rutas ordenadas y filtra las excluidas", () => {
  const archivos = ["z.js", "descargas/NOVA.apk", "index.html", "a.js", "sw.js", "../x"]
    .map(ruta => ({ ruta, hash: HASH, tam: 3 }));
  const m = O.construirManifiesto({ archivos, sha: SHA, generado: GENERADO, requiereApk: 0 });
  assert.deepEqual(Object.keys(m.archivos), ["a.js", "index.html", "z.js"]);
  assert.deepEqual(m, manifiesto({
    archivos: Object.fromEntries(["a.js", "index.html", "z.js"].map(ruta => [ruta, { hash: HASH, tam: 3 }]))
  }));
});

test("valida los campos y exige index.html", () => {
  assert.equal(O.validarManifiesto(manifiesto()), true);
  for (const m of [null, [], {}, manifiesto({ formato: 2 }), manifiesto({ sha: "zzzzzzz" }),
    manifiesto({ sha: "123456" }), manifiesto({ generado: "ayer" }), manifiesto({ generado: "2026-02-30T00:00:00Z" }),
    manifiesto({ requiereApk: -1 }), manifiesto({ requiereApk: 1.5 }), manifiesto({ archivos: [] }),
    manifiesto({ archivos: {} }), manifiesto({ archivos: { "a.js": { hash: HASH, tam: 0 } } })]) {
    assert.equal(O.validarManifiesto(m), false);
  }
  for (const archivo of [null, { hash: "z".repeat(64), tam: 3 }, { hash: HASH, tam: -1 }, { hash: HASH, tam: 0.5 }]) {
    assert.equal(O.validarManifiesto(manifiesto({ archivos: { "index.html": archivo } })), false);
  }
});

test("no actúa si coincide el SHA instalado o todos los hashes de la base", () => {
  assert.deepEqual(plan(manifiesto(), { sha: SHA, generado: GENERADO, archivos: {} }), sinDescargas("nada"));
  assert.deepEqual(plan(manifiesto({ sha: "2222222" })), sinDescargas("nada"));
});

test("pide una APK nueva cuando la versión instalada queda corta", () => {
  assert.deepEqual(plan(manifiesto({ requiereApk: 2 })), sinDescargas("apk"));
});

test("descarga los cambios y conserva archivos ya descargados que siguen vigentes", () => {
  const remoto = manifiesto({ requiereApk: 1, archivos: {
    "index.html": { hash: HASH, tam: 3 },
    "a.js": { hash: NUEVO, tam: 5 },
    "b.js": { hash: NUEVO, tam: 7 }
  } });
  const actual = { sha: "2222222", generado: GENERADO, archivos: { "a.js": NUEVO, "index.html": NUEVO, "viejo.js": HASH } };
  assert.deepEqual(plan(remoto, actual), {
    accion: "descargar", descargar: [{ ruta: "b.js", hash: NUEVO, tam: 7 }], bytes: 7, mantener: ["a.js"]
  });
  assert.deepEqual(plan(manifiesto(), actual), sinDescargas("descargar"));
});

test("rechaza fechas anteriores a la base, manifiestos inválidos y rutas maliciosas", () => {
  assert.deepEqual(plan(manifiesto({ generado: "2026-11-21T10:00:00Z" })), sinDescargas("invalido"));
  assert.deepEqual(plan(manifiesto(), null, {}), sinDescargas("invalido"));
  const remoto = manifiesto();
  remoto.archivos["../x"] = { hash: HASH, tam: 1 };
  assert.deepEqual(plan(remoto), sinDescargas("invalido"));
});

test("limita la suma de los bytes por descargar", () => {
  const remoto = manifiesto({ archivos: { "index.html": { hash: NUEVO, tam: O.MAX_BYTES } } });
  assert.equal(plan(remoto).bytes, 8000000);
  remoto.archivos["extra.js"] = { hash: HASH, tam: 1 };
  assert.deepEqual(plan(remoto), sinDescargas("invalido"));
});

test("arma la URL y rechaza rutas con espacios, acentos o segmentos maliciosos", () => {
  const plantilla = "https://ejemplo.com/{sha}/{ruta}?ref={sha}";
  assert.equal(O.urlArchivo(plantilla, SHA, "vendor/@nova/a+b.js"),
    "https://ejemplo.com/abc1234/vendor/@nova/a+b.js?ref=abc1234");
  for (const ruta of ["con espacio.js", "canción.js", "../x"]) {
    assert.throws(() => O.urlArchivo(plantilla, SHA, ruta), /Ruta OTA inválida/);
  }
});

test("genera por consola un manifiesto válido y excluye descargas y pruebas", () => {
  const temporal = mkdtempSync(join(tmpdir(), "nova-ota-"));
  const carpeta = join(temporal, "web");
  mkdirSync(carpeta);
  mkdirSync(join(carpeta, "descargas"));
  mkdirSync(join(carpeta, "vendor"));
  writeFileSync(join(carpeta, "descargas", "NOVA.apk"), "apk");
  writeFileSync(join(carpeta, "index.html"), "abc");
  writeFileSync(join(carpeta, "vendor", "app.test.js"), "");
  writeFileSync(join(carpeta, "vendor", "app.js"), "");
  const salida = join(temporal, "salida.json");
  const descriptor = openSync(salida, "w");
  try {
    execFileSync(process.execPath, [
      join(__dirname, "../scripts/ota-manifest.mjs"), carpeta,
      "--sha", SHA, "--requiere-apk", "0", "--generado", GENERADO
    ], { stdio: ["ignore", descriptor, "inherit"] });
  } finally {
    closeSync(descriptor);
  }
  const m = JSON.parse(readFileSync(salida, "utf8"));
  assert.equal(O.validarManifiesto(m), true);
  assert.equal(m.generado, GENERADO);
  assert.deepEqual(Object.keys(m.archivos), ["index.html", "vendor/app.js"]);
  assert.deepEqual(m.archivos["index.html"], { hash: ABC, tam: 3 });
});
