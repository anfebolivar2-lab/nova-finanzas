const test = require("node:test");
const assert = require("node:assert/strict");
const { filtrarPersonas, contarFiltros, ultimos30Dias, barrasVersiones, registrosParaMeta, porcentaje, validarAviso, sugerenciasPendientes, recientes, recortarTexto,
  bytesAMegabytes, formatearTamano, tablasMasGrandes, accionesDeCuenta, confirmaCorreo, porcentajesEncuesta, validarEncuesta } = require("./dueno.js");

test("calcula porcentajes por opción, incluso sin respuestas o con una sola opción", () => {
  assert.deepEqual(porcentajesEncuesta([0, 0], 0), [0, 0]);
  assert.deepEqual(porcentajesEncuesta([8], 8), [100]);
  assert.deepEqual(porcentajesEncuesta([0, 8, 0], 8), [0, 100, 0]);
  assert.deepEqual(porcentajesEncuesta([1, 2], 3), [33, 67]);
});

test("recorta las opciones de encuesta, descarta vacías y comprueba límites", () => {
  assert.deepEqual(validarEncuesta(" ¿Te sirve? ", [" Sí ", "  ", " No "]),
    { accion: "encuesta_crear", pregunta: "¿Te sirve?", opciones: ["Sí", "No"] });
  assert.equal(validarEncuesta("Pregunta", ["Sí", " "]), null);
  assert.equal(validarEncuesta("Pregunta", Array(7).fill("Opción")), null);
  assert.equal(validarEncuesta("x".repeat(201), ["Sí", "No"]), null);
  assert.equal(validarEncuesta("Pregunta", ["Sí", "x".repeat(61)]), null);
});

const ahora = new Date("2026-11-22T12:00:00Z");
const DIA = 24 * 60 * 60 * 1000;
const fecha = (dias, milisegundos = 0) => new Date(ahora.getTime() - dias * DIA - milisegundos).toISOString();
const ana = Object.freeze({ correo: "Ána@example.com", ultimoUso: fecha(7), registro: fecha(40), confirmado: true, plataforma: "android", movimientos: 0 });
const bea = Object.freeze({ correo: "bea@example.com", ultimoUso: fecha(14), registro: fecha(30), prueba: true, plataforma: "web", movimientos: 3 });
const cesar = Object.freeze({ correo: "César@example.com", ultimoUso: fecha(14, 1), registro: fecha(20), confirmado: true, plataforma: "web", movimientos: 8 });
const dani = Object.freeze({ correo: "dani@example.com", registro: fecha(10), confirmado: true });
const eva = Object.freeze({ correo: "eva@example.com", ultimoUso: fecha(0), registro: fecha(50), confirmado: true, plataforma: "android", movimientos: 1 });
const personas = Object.freeze([dani, cesar, ana, eva, bea]);

test("busca por correo sin distinguir tildes ni mayúsculas y combina criterios", () => {
  assert.deepEqual(filtrarPersonas(personas, { texto: " ANA@EXAMPLE " }, ahora), [ana]);
  assert.deepEqual(filtrarPersonas(personas, { texto: "cÉSAr", filtro: "web" }, ahora), [cesar]);
  assert.deepEqual(filtrarPersonas(personas, { texto: "cÉSAr", filtro: "android" }, ahora), []);
});

const esperados = {
  todos: [eva, ana, bea, cesar, dani],
  activos: [eva, ana],
  inactivos: [cesar, dani],
  prueba: [bea],
  "sin-confirmar": [bea],
  android: [eva, ana],
  web: [bea, cesar],
  "sin-movimientos": [ana, dani]
};

for (const [filtro, esperado] of Object.entries(esperados)) {
  test("filtra personas por " + filtro, () => {
    assert.deepEqual(filtrarPersonas(personas, { filtro }, ahora), esperado);
  });
}

const ordenes = {
  uso: [eva, ana, bea, cesar, dani],
  registro: [dani, cesar, bea, ana, eva],
  movimientos: [cesar, bea, eva, dani, ana],
  correo: [ana, bea, cesar, dani, eva]
};

for (const [orden, esperado] of Object.entries(ordenes)) {
  test("ordena personas por " + orden, () => {
    assert.deepEqual(filtrarPersonas(personas, { orden }, ahora), esperado);
  });
}

test("devuelve una lista nueva y conserva el orden original", () => {
  const resultado = filtrarPersonas(personas, {}, ahora);
  assert.notStrictEqual(resultado, personas);
  assert.deepEqual(personas, [dani, cesar, ana, eva, bea]);
});

test("cuenta cada filtro sobre todas las personas, incluso con una lista vacía", () => {
  assert.deepEqual(contarFiltros(personas, ahora), {
    todos: 5, activos: 2, inactivos: 2, prueba: 1, "sin-confirmar": 1, android: 2, web: 2, "sin-movimientos": 2
  });
  assert.deepEqual(contarFiltros([], ahora), {
    todos: 0, activos: 0, inactivos: 0, prueba: 0, "sin-confirmar": 0, android: 0, web: 0, "sin-movimientos": 0
  });
});

test("arma 30 días UTC, rellena huecos y descarta registros fuera del intervalo", () => {
  const datos = ultimos30Dias({ "2026-10-23": 10, "2026-10-24": 4, "2026-11-22": 2, "2026-11-23": 8 }, ahora);
  assert.equal(datos.length, 30);
  assert.deepEqual(datos[0], { dia: "2026-10-24", total: 4 });
  assert.deepEqual(datos[1], { dia: "2026-10-25", total: 0 });
  assert.deepEqual(datos[29], { dia: "2026-11-22", total: 2 });
  assert.ok(ultimos30Dias(null, ahora).every(d => d.total === 0));
});

test("ordena las versiones por cantidad y limita el progreso a 100 por ciento", () => {
  assert.deepEqual(barrasVersiones({ "1.90": 2, "": 5, "1.91": 1 }), [
    { version: "Sin versión", total: 5 }, { version: "1.90", total: 2 }, { version: "1.91", total: 1 }
  ]);
  assert.deepEqual(barrasVersiones(), []);
  assert.equal(registrosParaMeta(0, [{ registros: 9 }]), 0);
  assert.equal(registrosParaMeta(undefined, Array.from({ length: 31 }, () => ({ registros: 2 }))), 60);
  assert.equal(porcentaje(2, 3), 67);
  assert.equal(porcentaje(12, 10), 100);
  assert.equal(porcentaje(12, ""), 0);
  assert.equal(porcentaje(-2, 10), 0);
});

test("valida avisos y conserva la vigencia hasta terminar el día local", () => {
  assert.deepEqual(validarAviso(" Hola ", " Mensaje ", "todos", "", ahora), {
    accion: "aviso_crear", titulo: "Hola", mensaje: "Mensaje", audiencia: "todos", hasta: null
  });
  const fecha = new Date(2026, 10, 22, 12);
  assert.equal(validarAviso("t", "m", "web", "2026-11-22", fecha).hasta, new Date(2026, 10, 23).toISOString());
  assert.equal(validarAviso("t", "m", "web", "2026-11-21", fecha), null);
  assert.equal(validarAviso("t", "m", "web", "2027-02-30", ahora), null);
  assert.equal(validarAviso("x".repeat(81), "m", "web", "", ahora), null);
  assert.equal(validarAviso("t", "x".repeat(501), "web", "", ahora), null);
  assert.equal(validarAviso("t", "m", "otro", "", ahora), null);
});

test("ordena y limita los accesos y cuenta sugerencias pendientes", () => {
  const vieja = { creado_en: "2026-10-22", atendida: true };
  const nueva = { creado_en: "2026-11-22", atendida: false };
  const lista = Object.freeze([vieja, nueva]);
  assert.deepEqual(recientes(lista, 1), [nueva]);
  assert.deepEqual(recientes(lista), [nueva, vieja]);
  assert.deepEqual(recientes(null, 1), []);
  assert.equal(sugerenciasPendientes(lista), 1);
  assert.equal(recortarTexto("a😀bc", 3), "a😀…");
});

test("programa el inicio del aviso en hora local y lo envía como ISO", () => {
  const ahora = new Date(2026, 10, 22, 9).getTime();
  const programar = (desde, hasta = "2026-11-23") => validarAviso("Aviso", "Mensaje", "todos", hasta, ahora, desde);
  const inicio = new Date(2026, 10, 23, 10, 30).toISOString();

  assert.equal(programar("2026-11-23T10:30").desde, inicio);
  assert.equal(programar("2026-11-23T10:30", "").desde, inicio);
  assert.equal(programar("").desde, undefined);
  assert.equal(programar("2026-11-24T00:00"), null);
  assert.equal(programar("2026-02-30T10:30", ""), null);
  assert.equal(programar("2026-11-23T24:00", ""), null);
  assert.equal(programar("2026-11-23", ""), null);
});

test("convierte bytes a MB decimales y muestra un decimal con coma", () => {
  assert.equal(bytesAMegabytes(500000000), 500);
  assert.equal(formatearTamano(12345678), "12,3 MB");
  assert.equal(formatearTamano("1200000"), "1,2 MB");
  assert.equal(formatearTamano(0), "0,0 MB");
  assert.equal(formatearTamano(-1000000), "0,0 MB");
  assert.equal(formatearTamano(undefined), "0,0 MB");
});

test("devuelve las ocho tablas más grandes sin cambiar la lista original", () => {
  const tablas = Object.freeze(Array.from({ length: 10 }, (_, i) => ({ tabla: "tabla" + i, bytes: i * 10 })));
  assert.deepEqual(tablasMasGrandes(tablas).map(fila => fila.bytes), [90, 80, 70, 60, 50, 40, 30, 20]);
  assert.equal(tablas[0].bytes, 0);
  assert.deepEqual(tablasMasGrandes(null), []);
});

test("ofrece acciones según el estado y excluye dueños, cuentas de prueba y datos antiguos", () => {
  const persona = { id: "287feed1-23bc-4771-9851-b858d248559c", correo: "Ana@correo.test" };
  assert.deepEqual(accionesDeCuenta(persona), ["cuenta_bloquear", "cuenta_reenviar_confirmacion"]);
  assert.deepEqual(accionesDeCuenta({ ...persona, confirmado: true, bloqueado: true }), ["cuenta_desbloquear"]);
  assert.deepEqual(accionesDeCuenta({ ...persona, dueno: true }), []);
  assert.deepEqual(accionesDeCuenta({ ...persona, prueba: true }), []);
  assert.deepEqual(accionesDeCuenta({ correo: persona.correo }), []);
  assert.deepEqual(accionesDeCuenta({ ...persona, correo: "(sin correo)" }), []);
});

test("la confirmación exige el correo exacto", () => {
  assert.equal(confirmaCorreo("Ana@correo.test", "Ana@correo.test"), true);
  assert.equal(confirmaCorreo("Ana@correo.test", "ana@correo.test"), false);
  assert.equal(confirmaCorreo("Ana@correo.test", "Ana@correo.test "), false);
  assert.equal(confirmaCorreo("", ""), false);
});

const { serieDiaria, rangoDias, nuevosDesdeVisita, ayudaNumeros, validarPlantilla,
  listarPlantillas, agregarPlantilla, borrarPlantilla, maximoPlantillas } = require("./dueno.js");

test("recorta y rellena series diarias sin modificar los datos originales", () => {
  const ahora = "2026-11-24T00:30:00Z";
  const filas = [
    { dia: "2026-11-23", registros: 5, activos: 3 },
    { dia: "2026-11-17", registros: 8, activos: 1 },
    { dia: "2026-11-25", registros: 99, activos: 99 }
  ].map(Object.freeze);
  const siete = serieDiaria(Object.freeze(filas), ahora, 7, ["registros", "activos"]);
  assert.equal(siete.length, 7);
  assert.deepEqual(siete[0], { dia: "2026-11-18", registros: 0, activos: 0 });
  assert.deepEqual(siete[5], filas[0]);
  assert.notEqual(siete[5], filas[0]);
  assert.deepEqual(siete[6], { dia: "2026-11-24", registros: 0, activos: 0 });
  const catorce = serieDiaria({ "2026-11-23": 5, "2026-11-24": -2 }, ahora, 14, ["total"]);
  assert.equal(catorce.length, 14);
  assert.deepEqual(catorce.slice(-2), [{ dia: "2026-11-23", total: 5 }, { dia: "2026-11-24", total: 0 }]);
  assert.equal(serieDiaria(null, ahora, 90, ["total"]).length, 30);
  assert.deepEqual(serieDiaria(null, "fecha inválida", 7, ["total"]), []);
  assert.equal(rangoDias("7"), 30);
});

test("cuenta registros reales posteriores a la visita y hasta la apertura", () => {
  const visita = Date.parse("2026-11-20T12:00:00Z");
  const apertura = "2026-11-24T00:00:00Z";
  const personas = [
    { registro: "2026-11-20T12:00:00Z" },
    { registro: "2026-11-21T12:00:00Z" },
    { registro: apertura },
    { registro: "2026-11-22T12:00:00Z", prueba: true },
    { registro: "2026-11-24T00:00:01Z" },
    { registro: "sin fecha" },
    null
  ];
  assert.equal(nuevosDesdeVisita(personas, visita, apertura), 2);
  assert.equal(nuevosDesdeVisita(personas, null, apertura), 0);
  assert.equal(nuevosDesdeVisita(personas, apertura, apertura), 0);
  assert.equal(nuevosDesdeVisita([personas[0], personas[3]], visita, apertura), 0);
});

test("cada indicador tiene una explicación breve y con contenido", () => {
  assert.equal(Object.keys(ayudaNumeros).length, 24);
  Object.values(ayudaNumeros).forEach((texto) => {
    assert.equal(typeof texto, "string");
    assert.ok(texto.trim().length > 0 && texto.length <= 160);
  });
});

test("valida plantillas con los mismos límites que los avisos", () => {
  const titulo = "á".repeat(80), mensaje = "🚀".repeat(500);
  assert.deepEqual(validarPlantilla(" " + titulo, mensaje + " "), { titulo, mensaje });
  assert.equal(validarPlantilla(titulo + "x", mensaje), null);
  assert.equal(validarPlantilla(titulo, mensaje + "x"), null);
  assert.equal(validarPlantilla(" ", mensaje), null);
  assert.equal(validarPlantilla(titulo, " "), null);
  assert.equal(validarPlantilla(null, mensaje), null);
});

test("protege los ejemplos y limita el total de plantillas a diez", () => {
  const ejemplos = listarPlantillas(null);
  assert.equal(ejemplos.length, 3);
  assert.ok(ejemplos.every((fila) => fila.fabrica && validarPlantilla(fila.titulo, fila.mensaje)));
  let guardadas = [];
  for (let i = ejemplos.length; i < maximoPlantillas; i++) {
    guardadas = agregarPlantilla(Object.freeze(guardadas), "Aviso " + i, "Mensaje");
  }
  assert.equal(listarPlantillas(guardadas).length, 10);
  assert.equal(agregarPlantilla(guardadas, "Una más", "Mensaje"), null);
  assert.deepEqual(borrarPlantilla(guardadas, 0), guardadas);
  const restantes = borrarPlantilla(guardadas, 3);
  assert.equal(restantes.length, 6);
  assert.equal(restantes[0].titulo, "Aviso 4");
  assert.deepEqual(listarPlantillas([null, {}, { titulo: "", mensaje: "Inválido" }]), ejemplos);
  ejemplos[0].titulo = "Cambiado";
  assert.equal(listarPlantillas(null)[0].titulo, "Nueva versión");
});
