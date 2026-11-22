// Prueba manual: node scripts/ota-e2e.mjs
// Requiere que Playwright y su Chromium estén instalados aparte del repo.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const { tipoMime } = require("../app-finanzas/ota.js");
const repo = fileURLToPath(new URL("..", import.meta.url));
const sha = "b".repeat(40);
const nombreCache = "nova-ota-" + sha.slice(0, 12);
const github = "https://github.com/anfebolivar2-lab/nova-finanzas/releases/download/nova-android/";
const raw = "https://raw.githubusercontent.com/anfebolivar2-lab/nova-finanzas/" + sha + "/app-finanzas/";
const version = { versionCode: 1, versionName: "1.0" };
const temp = await mkdtemp(join(tmpdir(), "nova-ota-"));
const apk = join(temp, "apk"), b = join(temp, "b");
const peticionesApk = [];
let navegador, servidor, sitio, manifiesto, roto, exigeApk;

async function generar(carpeta, revision, generado, requiereApk) {
  const { stdout } = await promisify(execFile)(process.execPath, [join(repo, "scripts/ota-manifest.mjs"), carpeta,
    "--sha", revision, "--generado", generado, "--requiere-apk", String(requiereApk)], { encoding: "utf8" });
  return stdout;
}

async function estado(page) {
  return page.evaluate(async () => {
    const cache = await caches.open("nova-ota-meta");
    const leer = async url => (await cache.match(url))?.json();
    return { meta: await leer("/__ota-meta__"), malos: await leer("/__ota-malos__"), caches: await caches.keys() };
  });
}

async function preparar({ publicado = manifiesto, corrupto = false, appRota = false, chrome = 120 } = {}) {
  const contexto = await navegador.newContext({ userAgent: "Mozilla/5.0 Chrome/" + chrome + ".0.0.0" });
  try {
    const page = await contexto.newPage();
    const archivos = [];
    let revisiones = 0;
    await page.route(url => url.href.startsWith(github + "ota-manifest.json?"), route => {
      revisiones++;
      return route.fulfill({ contentType: "application/json", body: publicado, headers: { "Access-Control-Allow-Origin": "*" } });
    });
    await page.route(raw + "**", async route => {
      const archivo = decodeURIComponent(route.request().url().slice(raw.length));
      archivos.push(archivo);
      let bytes = await readFile(join(b, archivo));
      if (appRota && archivo === "app.js") bytes = Buffer.from("function (\n");
      if (corrupto && archivo === "app.js") bytes[0] ^= 1;
      await route.fulfill({ body: bytes, contentType: "text/plain", headers: {
        "Access-Control-Allow-Origin": "*", "X-Content-Type-Options": "nosniff"
      } });
    });
    await page.route(url => url.origin !== sitio && !url.href.startsWith(github + "ota-manifest.json?") && !url.href.startsWith(raw),
      route => route.abort());
    await page.addInitScript(({ version }) => {
      window.Capacitor = {
        isNativePlatform: () => true,
        Plugins: {
          CapacitorHttp: {
            get: async ({ url }) => {
              if (!url.includes("/ota-manifest.json?")) return { status: 200, data: version };
              const res = await fetch(url);
              return { status: res.status, data: await res.text() };
            }
          }
        }
      };
    }, { version });
    await page.goto(sitio + "/");
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await page.evaluate(() => localStorage.removeItem("nova-ota-revision"));
    await page.reload();
    return { contexto, page, archivos, revisiones: () => revisiones };
  } catch (e) {
    await contexto.close();
    throw e;
  }
}

async function esperarMeta(page, ms = 40000) {
  // Se revisa a mano: la app espera unos segundos antes de buscar y después baja los archivos.
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    if ((await estado(page)).meta) return;
    await page.waitForTimeout(250);
  }
  throw new Error("La actualización no llegó a guardarse a tiempo");
}

async function buscarManual(page) {
  await page.evaluate(() => document.getElementById("apk-app-buscar").click());
  await page.waitForFunction(() => !document.getElementById("apk-app-buscar").disabled);
}

async function caso(nombre, prueba) {
  try {
    await prueba();
    console.log("OK " + nombre);
  } catch (e) {
    process.exitCode = 1;
    console.error("FALLO " + nombre, e);
  }
}

try {
  await cp(join(repo, "app-finanzas"), apk, { recursive: true });
  await writeFile(join(apk, "version-app.json"), JSON.stringify(version));
  await writeFile(join(apk, "ota-base.json"), await generar(apk, "a".repeat(40), "2026-01-01T00:00:00Z", 1));
  await cp(apk, b, { recursive: true });
  const html = await readFile(join(b, "index.html"), "utf8");
  const app = await readFile(join(b, "app.js"), "utf8");
  await writeFile(join(b, "index.html"), html.replace("<title>NOVA</title>", "<title>NOVA-OTA-B</title>"));
  await writeFile(join(b, "app.js"), app + "\n// Cambio de prueba.\n");
  manifiesto = await generar(b, sha, "2026-01-02T00:00:00Z", 1);
  exigeApk = await generar(b, sha, "2026-01-02T00:00:00Z", 2);
  await writeFile(join(b, "app.js"), "function (\n");
  roto = await generar(b, sha, "2026-01-02T00:00:00Z", 1);
  await writeFile(join(b, "app.js"), app + "\n// Cambio de prueba.\n");

  servidor = createServer(async (req, res) => {
    const ruta = new URL(req.url, "http://localhost").pathname.slice(1) || "index.html";
    peticionesApk.push(ruta);
    try {
      assert(!ruta.includes(".."));
      const bytes = await readFile(join(apk, ruta));
      res.writeHead(200, { "Content-Type": tipoMime(ruta), "Cache-Control": "no-store" }).end(bytes);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((resolve, reject) => servidor.once("error", reject).listen(0, "localhost", resolve));
  sitio = "http://localhost:" + servidor.address().port;
  navegador = await chromium.launch();
  let instalada;
  await caso("(a) instala y baja solo los cambios", async () => {
    instalada = await preparar();
    const { page, archivos } = instalada;
    await esperarMeta(page);
    const { meta, caches } = await estado(page);
    assert(caches.includes(nombreCache));
    assert.equal(meta.sha, sha);
    assert.equal(meta.ok, false);
    assert.deepEqual(archivos.sort(), ["app.js", "index.html"]);
    assert.deepEqual(Object.keys(meta.archivos).sort(), archivos);
  });
  await caso("(b) sirve la OTA y conserva los archivos de la APK", async () => {
    const { page, contexto } = instalada;
    try {
      peticionesApk.length = 0;
      await page.reload();
      assert.equal(await page.title(), "NOVA-OTA-B");
      assert(peticionesApk.includes("parser.js"));
      assert(!peticionesApk.includes("index.html"));
      assert(!peticionesApk.includes("app.js"));
      await page.waitForFunction(async () => {
        const res = await (await caches.open("nova-ota-meta")).match("/__ota-meta__");
        const meta = res && await res.json();
        return meta && meta.ok && meta.arranques === 0;
      });
    } finally { await contexto.close(); }
  });
  await caso("(c) rechaza un archivo corrupto", async () => {
    const { page, contexto, archivos } = await preparar({ corrupto: true });
    try {
      await buscarManual(page);
      assert(archivos.includes("app.js"));
      const { meta, caches } = await estado(page);
      assert.equal(meta, undefined);
      assert(!caches.includes(nombreCache));
      await page.reload();
      assert.equal(await page.title(), "NOVA");
    } finally { await contexto.close(); }
  });
  await caso("(d) vuelve a la APK y bloquea el SHA roto", async () => {
    const { page, contexto, archivos, revisiones } = await preparar({ publicado: roto, appRota: true });
    try {
      await esperarMeta(page);
      for (let intento = 1; intento <= 4; intento++) {
        const error = intento === 1 ? page.waitForEvent("pageerror", e => e.name === "SyntaxError") : null;
        await page.reload();
        if (error) assert.equal((await error).name, "SyntaxError");
        assert.equal(await page.title(), intento < 4 ? "NOVA-OTA-B" : "NOVA");
      }
      const { meta, malos, caches } = await estado(page);
      assert.equal(meta, undefined);
      assert(malos.includes(sha));
      assert(!caches.includes(nombreCache));
      const antes = revisiones();
      archivos.length = 0;
      await buscarManual(page);
      assert.equal(revisiones(), antes + 1);
      assert.deepEqual(archivos, []);
    } finally { await contexto.close(); }
  });
  for (const [nombre, opciones, revisionesEsperadas] of [
    ["(e) Chrome 80 conserva la APK", { chrome: 80 }, 0],
    ["(f) respeta requiereApk", { publicado: exigeApk }, 1]
  ]) {
    await caso(nombre, async () => {
      const { page, contexto, archivos, revisiones } = await preparar(opciones);
      try {
        await buscarManual(page);
        assert.equal(revisiones(), revisionesEsperadas);
        assert.deepEqual(archivos, []);
        const { meta, caches } = await estado(page);
        assert.equal(meta, undefined);
        assert(!caches.includes(nombreCache));
      } finally { await contexto.close(); }
    });
  }
} finally {
  if (navegador) await navegador.close();
  if (servidor) await new Promise(resolve => servidor.close(resolve));
  await rm(temp, { recursive: true, force: true });
}
