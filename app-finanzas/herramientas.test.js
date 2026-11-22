const test = require("node:test");
const assert = require("node:assert/strict");
const { simular, actualizarNotas, enNoMolestar, horaAviso, referenciaAvisos } = require("./herramientas");

test("simula los tres escenarios y calcula el colchón solo si hay déficit", () => {
  const base = { ingresos: 1000, ingresoPrincipal: 600, gastos: 800, arriendo: 500, colchon: 1600 };
  assert.deepEqual(simular("arriendo", 20, base), { cambio: -100, ahorro: 100, mesesColchon: null, duracion: null });
  assert.deepEqual(simular("ingreso", 3, base), { cambio: -600, ahorro: -400, mesesColchon: 4, duracion: 3 });
  assert.deepEqual(simular("gasto", 400, base), { cambio: -400, ahorro: -200, mesesColchon: 8, duracion: null });
  assert.equal(simular("gasto", 200, base).mesesColchon, null);
  assert.equal(simular("gasto", 400, { ...base, colchon: 0 }).mesesColchon, 0);
  assert.equal(simular("ingreso", 1.5, base), null);
  assert.equal(simular("gasto", -1, base), null);
  assert.equal(simular("arriendo", 20, { ...base, arriendo: 0 }), null);
});

test("las notas se guardan de forma inmutable con un máximo de 50 y se borran por id", () => {
  const nota = { id: "nueva", texto: "Resumen de NOVA", fecha: "2026-09-02T15:00:00Z" };
  const anteriores = Array.from({ length: 50 }, (_, i) => ({ ...nota, id: String(i) }));
  const nuevas = actualizarNotas(anteriores, { nota });
  assert.equal(anteriores[0].id, "0");
  assert.equal(nuevas[0], nota);
  assert.equal(nuevas.length, 50);
  assert.equal(nuevas[49].id, "48");
  assert.deepEqual(actualizarNotas(nuevas, { borrar: "nueva" }), anteriores.slice(0, 49));
  assert.deepEqual(actualizarNotas({ corrompido: true }), []);
});

function fecha(dia, hora, minuto = 0) { return new Date(2026, 8, dia, hora, minuto); }

test("No molestar incluye el inicio y excluye el fin, incluso al cruzar medianoche", () => {
  const noche = { activo: true };
  assert.equal(enNoMolestar(fecha(1, 21, 59), noche), false);
  assert.equal(enNoMolestar(fecha(1, 22), noche), true);
  assert.equal(enNoMolestar(fecha(2, 0), noche), true);
  assert.equal(enNoMolestar(fecha(2, 6, 59), noche), true);
  assert.equal(enNoMolestar(fecha(2, 7), noche), false);
  assert.equal(enNoMolestar(fecha(1, 22), { activo: false }), false);
  assert.deepEqual(horaAviso(fecha(1, 22), noche), fecha(2, 7));
  assert.deepEqual(horaAviso(fecha(2, 1), noche), fecha(2, 7));
  assert.deepEqual(horaAviso(fecha(1, 19), noche), fecha(1, 19));
  assert.deepEqual(referenciaAvisos(fecha(2, 1), noche), new Date(fecha(1, 22).getTime() - 1));
});

test("No molestar también permite tramos diurnos y horas iguales", () => {
  const tarde = { activo: true, inicio: "14:15", fin: "16:30" };
  assert.equal(enNoMolestar(fecha(1, 14, 14), tarde), false);
  assert.equal(enNoMolestar(fecha(1, 14, 15), tarde), true);
  assert.deepEqual(horaAviso(fecha(1, 15), tarde), fecha(1, 16, 30));
  assert.equal(enNoMolestar(fecha(1, 16, 30), tarde), false);
  assert.equal(enNoMolestar(fecha(1, 14, 15), { ...tarde, fin: tarde.inicio }), false);
});
