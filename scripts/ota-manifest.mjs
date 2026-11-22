import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { createRequire } from "node:module";
import { parseArgs } from "node:util";

const require = createRequire(import.meta.url);
const { esRutaOta, hashHex, construirManifiesto, validarManifiesto } = require("../app-finanzas/ota.js");

async function recorrer(carpeta, archivos, prefijo = "") {
  const entradas = await readdir(carpeta, { withFileTypes: true });
  for (const entrada of entradas.sort((a, b) => a.name < b.name ? -1 : Number(a.name > b.name))) {
    const ruta = prefijo + entrada.name;
    const ubicacion = join(carpeta, entrada.name);
    if (entrada.isDirectory() && esRutaOta(ruta + "/index.html")) {
      await recorrer(ubicacion, archivos, ruta + "/");
    } else if (entrada.isFile() && esRutaOta(ruta)) {
      const bytes = await readFile(ubicacion);
      archivos.push({ ruta, hash: await hashHex(bytes), tam: bytes.length });
    }
  }
}

try {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      sha: { type: "string" },
      "requiere-apk": { type: "string" },
      generado: { type: "string", default: new Date().toISOString() }
    }
  });
  if (positionals.length !== 1) throw new Error("Indica una carpeta para generar el manifiesto");
  if (!values.sha) throw new Error("Falta --sha");
  if (!/^\d+$/.test(values["requiere-apk"] || "")) throw new Error("--requiere-apk debe ser un entero mayor o igual a 0");

  const archivos = [];
  await recorrer(positionals[0], archivos);
  const manifiesto = construirManifiesto({
    archivos,
    sha: values.sha,
    generado: values.generado,
    requiereApk: Number(values["requiere-apk"])
  });
  if (!validarManifiesto(manifiesto)) throw new Error("Manifiesto inválido. Revisa el SHA, la fecha y que exista index.html");
  console.log(JSON.stringify(manifiesto, null, 2));
} catch (error) {
  console.error("Error al generar el manifiesto OTA: " + error.message);
  process.exitCode = 1;
}
