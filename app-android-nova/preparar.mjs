// Copia la app web a www/ para meterla dentro de la APK.
// Deja por fuera lo que no es de la app (la misma APK, pruebas y documentos).
import { cpSync, rmSync, mkdirSync, existsSync, readdirSync } from "node:fs";
const ORIGEN = "../app-finanzas", DESTINO = "www";
const FUERA = new Set(["descargas", "README.md", "vercel.json"]);
rmSync(DESTINO, { recursive: true, force: true });
mkdirSync(DESTINO);
for (const f of readdirSync(ORIGEN)) {
  if (FUERA.has(f) || f.startsWith(".") || f.endsWith(".test.js")) continue;
  cpSync(`${ORIGEN}/${f}`, `${DESTINO}/${f}`, { recursive: true });
}
if (!existsSync(`${DESTINO}/index.html`)) throw new Error("No se encontró index.html");
console.log("App copiada en www/");
