const test = require("node:test");
const assert = require("node:assert");
const R = require("./respuestas.js");

const HOY = new Date(2026, 10, 7, 15, 0); // sábado 7 de noviembre de 2026
const m = (dia, mes, tipo, monto, cat, extra) => Object.assign({ id: dia * 100 + mes, fecha: new Date(2026, mes, dia, 12).toISOString(), tipo, monto, categoria_id: cat }, extra);
const categorias = [{ id: 1, nombre: "Comida", tipo: "gasto" }, { id: 2, nombre: "Comida rápida", tipo: "gasto" }, { id: 3, nombre: "Transporte", tipo: "gasto" }, { id: 9, nombre: "Salario", tipo: "ingreso" }];

test("periodo de la pregunta", () => {
  const p = R.periodo("¿Cuánto gasté en comida los últimos 3 meses?", HOY);
  assert.deepStrictEqual([p.desde.getMonth(), p.desde.getDate(), p.nombre], [8, 1, "los últimos 3 meses"]);
  assert.strictEqual(R.periodo("los últimos tres meses", HOY).desde.getMonth(), 8);
  assert.strictEqual(R.periodo("cuánto gasté hoy", HOY).nombre, "hoy");
  const s = R.periodo("y la semana pasada?", HOY);
  assert.deepStrictEqual([s.desde.getDate(), s.hasta.getDate()], [26, 2]); // lunes 26 de octubre a lunes 2 de noviembre
  assert.strictEqual(R.periodo("el mes pasado", HOY).desde.getMonth(), 9);
  assert.strictEqual(R.periodo("¿cuánto gasté?", HOY).nombre, "este mes");
  assert.strictEqual(R.periodo("los últimos 10 días", HOY).desde.getDate(), 29);
});

test("categoría nombrada: gana el nombre más largo", () => {
  assert.strictEqual(R.categoriaNombrada("¿cuánto en comida rápida?", categorias).id, 2);
  assert.strictEqual(R.categoriaNombrada("¿cuánto en COMIDA este mes?", categorias).id, 1);
  assert.strictEqual(R.categoriaNombrada("¿y en transportes?", categorias).id, 3);
  assert.strictEqual(R.categoriaNombrada("¿cómo ahorro más?", categorias), null);
});

test("tarjeta de una categoría en varios meses, con gráfico por mes y botón de límite", () => {
  const movs = [m(5, 10, "gasto", 20000, 1), m(1, 10, "gasto", 9000, 1), m(20, 9, "gasto", 50000, 1), m(3, 8, "gasto", 7000, 1),
    m(2, 7, "gasto", 99999, 1), m(4, 10, "gasto", 5000, 3), m(6, 10, "gasto", 70000, 1, { estado: "pendiente" }),
    m(6, 10, "gasto", 1000, 1, { transferencia: "x" }), m(5, 10, "ingreso", 2000000, 9)];
  const t = R.tarjeta("¿Cuánto gasté en comida los últimos 3 meses?", { movimientos: movs, categorias, limites: [] }, HOY);
  assert.strictEqual(t.titulo, "Comida · los últimos 3 meses");
  assert.strictEqual(t.total, 86000); // sin julio, sin el pendiente y sin la transferencia
  assert.strictEqual(t.cantidad, 4);
  assert.deepStrictEqual(t.serie.map((x) => [x.etiqueta, x.valor]), [["sept", 7000], ["oct", 50000], ["nov", 29000]]);
  assert.deepStrictEqual(t.movimientos.map((x) => x.monto), [50000, 20000, 9000, 7000]);
  assert.deepStrictEqual(t.acciones, ["limite", "buscar", "calendario"]);
  const conLimite = R.tarjeta("¿Cuánto gasté en comida?", { movimientos: movs, categorias, limites: [{ categoria_id: 1 }] }, HOY);
  assert.ok(!conLimite.acciones.includes("limite"));
});

test("tarjeta por categorías cuando pregunta en qué gasta más", () => {
  const movs = [m(2, 10, "gasto", 30000, 1), m(3, 10, "gasto", 50000, 3), m(4, 10, "gasto", 10000, 1)];
  const t = R.tarjeta("¿En qué gasto más este mes?", { movimientos: movs, categorias }, HOY);
  assert.ok(t.porCategoria);
  assert.deepStrictEqual(t.serie.map((x) => [x.etiqueta, x.valor]), [["Transporte", 50000], ["Comida", 40000]]);
  assert.ok(!t.acciones.includes("limite"));
});

test("ingresos y preguntas que no son de números", () => {
  const movs = [m(5, 10, "ingreso", 2000000, 9), m(2, 10, "gasto", 1, 1)];
  const t = R.tarjeta("¿Cuánto he ganado este mes?", { movimientos: movs, categorias }, HOY);
  assert.deepStrictEqual([t.tipo, t.total, t.titulo], ["ingreso", 2000000, "Tus ingresos · este mes"]);
  assert.strictEqual(t.serie.length, 7); // del 1 al 7 de noviembre: un grupo por día
  assert.strictEqual(R.tarjeta("¿Qué puedo hacer para ahorrar más?", { movimientos: movs, categorias }, HOY), null);
  const vacia = R.tarjeta("¿cuánto gasté en transporte hoy?", { movimientos: movs, categorias }, HOY);
  assert.deepStrictEqual([vacia.total, vacia.acciones], [0, ["limite"]]);
});
