const test = require("node:test");
const assert = require("node:assert/strict");
const { avisosParaMostrar, validarSugerencia, enviosDeLaHora, errorSeguro, puedeRegistrarError } = require("./nube.js");

test("muestra avisos vigentes, de la plataforma y sin leer, con el más reciente primero", () => {
  const ahora = Date.parse("2026-11-22T12:00:00Z");
  const base = { activo: true, audiencia: "todos", desde: "2026-11-22T12:00:00Z" };
  const avisos = Object.freeze([
    { ...base, id: 1, creado_en: "2026-11-19" },
    { ...base, id: 2, creado_en: "2026-11-20", audiencia: "android" },
    { ...base, id: 3, audiencia: "web" },
    { ...base, id: 4, activo: false },
    { ...base, id: 5, hasta: new Date(ahora).toISOString() },
    { ...base, id: 6, desde: "2026-11-23" },
    { ...base, id: 7 }
  ]);
  assert.deepEqual(avisosParaMostrar(avisos, "android", [7], ahora).map(a => a.id), [2, 1]);
  assert.deepEqual(avisosParaMostrar(undefined, "web", [], ahora), []);
});

test("valida sugerencias por caracteres y cuenta envíos dentro de una hora", () => {
  assert.equal(validarSugerencia("  hola "), "hola");
  assert.equal(validarSugerencia("  ñ😀 "), null);
  assert.equal(validarSugerencia("😀".repeat(2000)).length, 4000);
  assert.equal(validarSugerencia("a".repeat(2001)), null);
  assert.deepEqual(enviosDeLaHora([0, 1, 3599999, 3600000, 3600001, "1"], 3600000), [1, 3599999, 3600000]);
  assert.deepEqual(enviosDeLaHora(null, 3600000), []);
});

test("envía solo datos técnicos fijos y aplica el límite y la deduplicación", () => {
  assert.deepEqual(errorSeguro("Uncaught TypeError: gasté $900", "https://nova.test/privado/app.js?token=clave", 123, false, ["app.js"]),
    { mensaje: "TypeError", origen: "app.js:123" });
  assert.deepEqual(errorSeguro("correo@example.com", "/privado/recibo-900.js", 23, true, ["app.js"]),
    { mensaje: "Promesa rechazada", origen: "unhandledrejection" });
  assert.equal(puedeRegistrarError(["TypeError"], "TypeError"), false);
  assert.equal(puedeRegistrarError(["TypeError"], "SyntaxError"), true);
  assert.equal(puedeRegistrarError(["a", "b", "c", "d", "e"], "f"), false);
});
