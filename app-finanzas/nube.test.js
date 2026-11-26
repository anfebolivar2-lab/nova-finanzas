const test = require("node:test");
const assert = require("node:assert/strict");
const { avisosParaMostrar, validarSugerencia, enviosDeLaHora, errorSeguro, puedeRegistrarError,
  validarVersion, versionMenor, configDesdeFilas, mensajePausaIA, sugerenciasRespondidas, encuestaParaMostrar,
  fetchConLimite, conPlazo } = require("./nube.js");
const { setTimeout: esperar } = require("node:timers/promises");

const limiteFetch = { ms: 30, rutas: [/^\/rest\/v1\//, /^\/auth\/v1\//] };
const urlRest = "https://ejemplo.test/rest/v1/fin_movimientos";

test("fetch con límite devuelve la respuesta y no aborta después de terminar", async () => {
  const respuesta = { ok: true };
  let señal;
  const resultado = await fetchConLimite(async (url, opciones) => {
    assert.equal(url, urlRest);
    assert.equal(opciones.keepalive, true);
    señal = opciones.signal;
    return respuesta;
  }, urlRest, { keepalive: true }, limiteFetch);
  assert.equal(resultado, respuesta);
  await esperar(50);
  assert.equal(señal.aborted, false);
});

test("fetch con límite aborta y rechaza aunque la conexión no responda", async () => {
  let señal;
  await assert.rejects(fetchConLimite((url, opciones) => {
    señal = opciones.signal;
    return new Promise(() => {});
  }, urlRest, undefined, limiteFetch), { name: "TypeError", message: /Failed to fetch/ });
  assert.equal(señal.aborted, true);
});

test("fetch fuera de las rutas configuradas recibe las opciones tal cual y puede tardar más", async () => {
  const opciones = {};
  const url = "https://ejemplo.test/functions/v1/nova?ruta=/rest/v1/";
  const resultado = await fetchConLimite(async (ruta, recibidas) => {
    assert.equal(ruta, url);
    assert.equal(recibidas, opciones);
    await esperar(50);
    return "listo";
  }, url, opciones, limiteFetch);
  assert.equal(resultado, "listo");
});

test("fetch con límite respeta una señal externa antes y durante la llamada", async () => {
  const control = new AbortController();
  let señal;
  const peticion = fetchConLimite((url, opciones) => {
    señal = opciones.signal;
    return new Promise(() => {});
  }, urlRest, { signal: control.signal }, limiteFetch);
  control.abort();
  await assert.rejects(peticion, { name: "AbortError" });
  assert.equal(señal.aborted, true);
  await assert.rejects(fetchConLimite(() => assert.fail("La señal ya estaba abortada"),
    urlRest, { signal: control.signal }, limiteFetch), { name: "AbortError" });
});

test("conPlazo conserva los valores y errores de la promesa", async () => {
  const error = new Error("falló");
  assert.equal(await conPlazo(Promise.resolve("listo"), 30), "listo");
  await assert.rejects(conPlazo(Promise.reject(error), 30), (e) => e === error);
});

test("conPlazo rechaza si la promesa tarda demasiado", async () => {
  await assert.rejects(conPlazo(esperar(50, "tarde"), 30), { message: "plazo" });
});

test("elige la encuesta activa más reciente entre las pendientes sin reordenar el original", () => {
  const encuestas = Object.freeze([
    { id: 1, activa: true, creado_en: "2026-11-19" },
    { id: 4, activa: false, creado_en: "2026-11-24" },
    { id: 3, activa: true, creado_en: "2026-11-23" },
    { id: 2, activa: true, creado_en: "2026-11-22" }
  ]);
  assert.equal(encuestaParaMostrar(encuestas, [], []).id, 3);
  assert.equal(encuestaParaMostrar(encuestas, ["3"], []).id, 2);
  assert.equal(encuestaParaMostrar(encuestas, ["3"], [2]).id, 1);
  assert.equal(encuestaParaMostrar(encuestas, ["3", 1], [2]), null);
  assert.equal(encuestaParaMostrar([], [], []), null);
});

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
