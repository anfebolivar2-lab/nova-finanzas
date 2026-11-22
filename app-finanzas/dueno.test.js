const test = require("node:test");
const assert = require("node:assert/strict");
const { filtrarPersonas, contarFiltros } = require("./dueno.js");

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
