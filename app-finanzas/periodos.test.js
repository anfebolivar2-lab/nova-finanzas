// Ejecutar con: node --test app-finanzas/*.test.js
const test = require("node:test");
const assert = require("node:assert");
const { periodo } = require("./periodos.js");

const f = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const rango = (ciclo, ahora) => { const p = periodo(ciclo, ahora); return [f(p.desde), f(p.hasta)]; };

// Jueves 29 de octubre de 2026, hora local.
const JUEVES = new Date(2026, 9, 29, 15, 0);

test("semanal empieza el lunes", () => assert.deepStrictEqual(rango("semanal", JUEVES), ["2026-10-26", "2026-11-02"]));
test("semanal un domingo pertenece a la semana que termina", () =>
  assert.deepStrictEqual(rango("semanal", new Date(2026, 10, 1, 9)), ["2026-10-26", "2026-11-02"]));
test("quincenal segunda quincena", () => assert.deepStrictEqual(rango("quincenal", JUEVES), ["2026-10-16", "2026-11-01"]));
test("quincenal primera quincena incluye el 15", () =>
  assert.deepStrictEqual(rango("quincenal", new Date(2026, 1, 15, 23)), ["2026-02-01", "2026-02-16"]));
test("mensual", () => assert.deepStrictEqual(rango("mensual", JUEVES), ["2026-10-01", "2026-11-01"]));
test("trimestral", () => assert.deepStrictEqual(rango("trimestral", JUEVES), ["2026-10-01", "2027-01-01"]));
test("semestral", () => assert.deepStrictEqual(rango("semestral", JUEVES), ["2026-07-01", "2027-01-01"]));
test("anual", () => assert.deepStrictEqual(rango("anual", JUEVES), ["2026-01-01", "2027-01-01"]));
test("ciclo desconocido usa el mes", () => assert.deepStrictEqual(rango("raro", JUEVES), ["2026-10-01", "2026-11-01"]));
test("diciembre pasa al año siguiente", () =>
  assert.deepStrictEqual(rango("mensual", new Date(2026, 11, 20)), ["2026-12-01", "2027-01-01"]));
