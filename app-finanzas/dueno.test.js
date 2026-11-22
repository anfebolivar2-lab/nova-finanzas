const test = require("node:test");
const assert = require("node:assert/strict");
const { filtrarPersonas, contarFiltros, ultimos30Dias, barrasVersiones, registrosParaMeta, porcentaje, validarAviso, sugerenciasPendientes, recientes, recortarTexto } = require("./dueno.js");

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
