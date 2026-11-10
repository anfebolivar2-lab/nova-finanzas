// Ejecutar con: node --test app-finanzas/parser.test.js
const test = require("node:test");
const assert = require("node:assert");
const { interpretar } = require("./parser.js");

const AHORA = "2026-10-29T15:00:00.000Z";
const casos = [
  ["gasté 20 mil en almuerzo", { tipo: "gasto", monto: 20000, categoria: "Comida", descripcion: "Almuerzo" }],
  ["uber 15k", { tipo: "gasto", monto: 15000, categoria: "Transporte", descripcion: "Uber" }],
  ["pagué el arriendo 850.000", { tipo: "gasto", monto: 850000, categoria: "Hogar" }],
  ["me pagaron 2 millones de salario", { tipo: "ingreso", monto: 2000000, categoria: "Salario" }],
  ["netflix $26.900", { tipo: "gasto", monto: 26900, categoria: "Suscripciones" }],
  ["1,5 millones prima", { tipo: "ingreso", monto: 1500000, categoria: "Salario" }],
  ["cine con amigos 30 lucas", { tipo: "gasto", monto: 30000, categoria: "Entretenimiento" }],
  ["vendí la bici en 2 palos", { tipo: "ingreso", monto: 2000000, categoria: "Otros ingresos" }],
  ["2 millones 500 mil matrícula", { tipo: "gasto", monto: 2500000, categoria: "Educación" }],
  ["algo raro 7000", { tipo: "gasto", monto: 7000, categoria: "Otros gastos", descripcion: "Algo raro" }],
];

for (const [frase, esperado] of casos) {
  test(frase, () => {
    const r = interpretar(frase, AHORA);
    assert.ok(r.ok, r.error);
    for (const k of Object.keys(esperado)) assert.strictEqual(r[k], esperado[k], k);
  });
}

test("ayer resta un día", () => {
  const r = interpretar("ayer gasté 10 mil en tinto", AHORA);
  assert.strictEqual(r.fecha.slice(0, 10), "2026-10-28");
  assert.strictEqual(r.categoria, "Comida");
});

test("etiquetas con # se separan del texto", () => {
  const r = interpretar("almuerzo 20 mil #Trabajo #oficina #trabajo", AHORA);
  assert.deepStrictEqual(r.etiquetas, ["trabajo", "oficina"]);
  assert.strictEqual(r.descripcion, "Almuerzo");
  assert.strictEqual(r.monto, 20000);
});

test("sin etiquetas devuelve lista vacía", () => {
  assert.deepStrictEqual(interpretar("uber 15k", AHORA).etiquetas, []);
});

test("el número de una etiqueta no se toma como valor", () => {
  const r = interpretar("taxi 12 mil #viaje2026", AHORA);
  assert.strictEqual(r.monto, 12000);
  assert.deepStrictEqual(r.etiquetas, ["viaje2026"]);
});

test("solo etiquetas da error claro", () => {
  assert.strictEqual(interpretar("#trabajo", AHORA).ok, false);
});

test("sin valor da error claro", () => {
  const r = interpretar("almuerzo", AHORA);
  assert.strictEqual(r.ok, false);
  assert.match(r.error, /valor/);
});

test("vacío da error", () => {
  assert.strictEqual(interpretar("   ", AHORA).ok, false);
});

test("valor en otra moneda: con centavos y sin la moneda en la descripción", () => {
  const r = interpretar("gasté 20 dólares en Amazon");
  assert.deepStrictEqual([r.monto, r.montoExacto, r.descripcion], [20, 20, "Amazon"]);
  const e = interpretar("gasté 15.5 EUR en HOTEL PARIS");
  assert.deepStrictEqual([e.montoExacto, e.descripcion], [15.5, "HOTEL PARIS"]);
  assert.strictEqual(interpretar("US$ 9,99 Netflix").montoExacto, 9.99);
  assert.strictEqual(interpretar("gasté 20 mil en almuerzo").descripcion, "Almuerzo"); // en pesos, igual que antes
});
