const test = require("node:test");
const assert = require("node:assert/strict");
const { avisosParaMostrar, validarSugerencia, enviosDeLaHora, errorSeguro, puedeRegistrarError,
  validarVersion, versionMenor, configDesdeFilas, mensajePausaIA, sugerenciasRespondidas } = require("./nube.js");

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

test("valida de uno a cuatro componentes numéricos de versión", () => {
  for (const version of ["1", "1.72", "1.2.3.4", "01.002"]) assert.equal(validarVersion(version), true);
  for (const version of ["", "1.", ".1", "1.2.3.4.5", "v1.72", "1.72 beta", " 1.72", 1.72, null]) {
    assert.equal(validarVersion(version), false);
  }
});

test("compara versiones por partes numéricas, completando con ceros", () => {
  assert.equal(versionMenor("1.9", "1.72"), true);
  assert.equal(versionMenor("1.72", "1.9"), false);
  assert.equal(versionMenor("1.10", "2"), true);
  assert.equal(versionMenor("1.2", "01.02.0.0"), false);
  assert.equal(versionMenor("1.2", "1.2.0.1"), true);
  assert.equal(versionMenor("1.9007199254740992", "1.9007199254740993"), true);
  assert.equal(versionMenor("", "1.72"), false);
  assert.equal(versionMenor("1.71", "inválida"), false);
});

test("lee solo las claves de configuración esperadas y respeta sus tipos", () => {
  const filas = Object.freeze([
    Object.freeze({ clave: "ia_pausada", valor: true }),
    { clave: "ia_mensaje", valor: " Mantenimiento " },
    { clave: "version_minima", valor: "1.72" },
    { clave: "notas_version", valor: " Mejoras " },
    { clave: "constructor", valor: "ignorar" },
    null
  ]);
  assert.deepEqual(configDesdeFilas(filas), {
    ia_pausada: true, ia_mensaje: "Mantenimiento", version_minima: "1.72", notas_version: "Mejoras"
  });
  const valoresIniciales = { ia_pausada: false, ia_mensaje: "", version_minima: "", notas_version: "" };
  assert.deepEqual(configDesdeFilas(null), valoresIniciales);
  assert.deepEqual(configDesdeFilas([
    { clave: "ia_pausada", valor: "true" }, { clave: "version_minima", valor: 1.72 }
  ]), valoresIniciales);
});

test("muestra el mensaje de mantenimiento solo si la IA está pausada", () => {
  assert.equal(mensajePausaIA(), "");
  assert.equal(mensajePausaIA({ ia_pausada: false, ia_mensaje: "Pausa" }), "");
  assert.equal(mensajePausaIA({ ia_pausada: true, ia_mensaje: "Pausa" }), "Pausa");
  assert.equal(mensajePausaIA({ ia_pausada: true }), "La IA está en mantenimiento. Vuelve en un rato.");
});

test("conserva el mensaje, la respuesta y la fecha de las sugerencias respondidas", () => {
  const respondida = { mensaje: "Mi sugerencia", respuesta: "Gracias", respondida_en: "2026-11-22" };
  assert.deepEqual(sugerenciasRespondidas(Object.freeze([
    { mensaje: "Pendiente", respuesta: null }, { respuesta: " " }, respondida, null
  ])), [respondida]);
  assert.deepEqual(sugerenciasRespondidas(null), []);
});
