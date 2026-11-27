var test = require("node:test");
var assert = require("node:assert/strict");
var M = require("./mesada");

function hijo(id) {
  return { id: id, nombre: "Luna", monto: 20000, cada: "quincena", gastos: [] };
}

function gasto(id, fecha, monto, nota) {
  return { id: id, fecha: fecha, monto: monto, nota: nota };
}

test("normaliza basura, fechas imposibles, ids repetidos y más de diez hijos", function () {
  [null, 42, "texto", [], {}, { hijos: true }].forEach(function (valor) {
    assert.deepEqual(M.normalizar(valor), { hijos: [] });
  });
  var valido = hijo(1);
  valido.nombre = "  Luna ";
  valido.gastos = [null, gasto(0, "2026-02-16", 2000, "Bus"),
    gasto(1, "2026-02-30", 2000, "Bus"), gasto(2, "2026-02-16", 0, "Bus"),
    gasto(3, "2026-02-16", 2000, "  Bus "), gasto(3, "2026-02-17", 1000, "Dulces"),
    gasto(4, "2026-02-16", 1000, " "), gasto(5, "2026-02-16", 1000, "x".repeat(41))];
  var hijos = [null, { id: 50, nombre: " ", monto: 20, cada: "mes" }, valido, hijo(1)];
  for (var id = 2; id <= 12; id++) hijos.push(hijo(id));
  var esperado = hijos.slice(4, 13);
  var limpio = hijo(1);
  limpio.gastos.push(gasto(3, "2026-02-16", 2000, "Bus"));
  assert.deepEqual(M.normalizar({ hijos: hijos }), { hijos: [limpio].concat(esperado) });
  assert.equal(valido.nombre, "  Luna ");
  assert.equal(valido.gastos.length, 8);
  assert.deepEqual(M.normalizar({ hijos: [{ id: 1, nombre: "Luna", monto: 20000, cada: "mes", gastos: 2 }] }).hijos[0].gastos, []);
});

test("semana desde el lunes, quincena desde el 1 o el 16 y mes desde el 1 a medianoche", function () {
  var casos = [
    ["semana", new Date(2026, 1, 4, 13), new Date(2026, 1, 2)],
    ["semana", new Date(2026, 1, 1, 13), new Date(2026, 0, 26)],
    ["quincena", new Date(2026, 1, 15, 13), new Date(2026, 1, 1)],
    ["quincena", new Date(2026, 1, 16, 13), new Date(2026, 1, 16)],
    ["quincena", new Date(2026, 1, 1, 13), new Date(2026, 1, 1)],
    ["mes", new Date(2026, 1, 16, 13), new Date(2026, 1, 1)],
    ["mes", new Date(2026, 1, 1, 13), new Date(2026, 1, 1)]
  ];
  casos.forEach(function (caso) {
    assert.deepEqual(M.inicioPeriodo(caso[0], caso[1]), caso[2]);
    assert.equal(caso[1].getHours(), 13);
  });
});

test("resume solo el periodo hasta hoy y conserva la primera nota al agrupar", function () {
  var luna = hijo(1), ahora = new Date(2026, 1, 18, 12);
  luna.gastos = [
    gasto(1, "2026-02-15", 50000, "Antes"), gasto(2, "2026-02-16", 11000, "Útiles  del colegio"),
    gasto(3, "2026-02-18", 9000, "UTILES del   Colegio"), gasto(4, "2026-02-18", 6000, "Bus"),
    gasto(5, "2026-02-17", 4000, "Dulces"), gasto(6, "2026-02-18", 3000, "Jugos"),
    gasto(7, "2026-02-19", 50000, "Después")
  ];
  assert.deepEqual(M.resumen(luna, ahora), {
    mesada: 20000, gastado: 33000, queda: -13000, porcentaje: 100, pasado: true,
    enQue: [{ nota: "Útiles  del colegio", total: 20000 }, { nota: "Otros", total: 7000 }, { nota: "Bus", total: 6000 }]
  });
  luna.gastos.splice(5, 1);
  assert.deepEqual(M.resumen(luna, ahora).enQue.map(function (grupo) { return grupo.nota; }),
    ["Útiles  del colegio", "Bus", "Dulces"]);
  luna.gastos = [gasto(1, "2026-02-16", 5010, "Dulces")];
  assert.deepEqual(M.resumen(luna, ahora), {
    mesada: 20000, gastado: 5010, queda: 14990, porcentaje: 25, pasado: false,
    enQue: [{ nota: "Dulces", total: 5010 }]
  });
  luna.gastos[0].monto = 20000;
  assert.equal(M.resumen(luna, ahora).pasado, false);
});

test("agrega hijos sin mutar el estado y rechaza datos inválidos o un hijo número once", function () {
  var estado = { hijos: [hijo(4), hijo(2)] };
  var nuevo = M.agregarHijo(estado, "  Sol  ", 10000, "semana");
  assert.deepEqual(nuevo.hijos[2], { id: 5, nombre: "Sol", monto: 10000, cada: "semana", gastos: [] });
  [[" ", 1, "mes"], ["x".repeat(31), 1, "mes"], ["Sol", 0, "mes"],
    ["Sol", -1, "mes"], ["Sol", Infinity, "mes"], ["Sol", 1, "día"]].forEach(function (caso) {
    assert.equal(M.agregarHijo(estado, caso[0], caso[1], caso[2]), null);
  });
  assert.deepEqual(estado, { hijos: [hijo(4), hijo(2)] });
  var lleno = { hijos: Array.from({ length: 10 }, function (_, i) { return hijo(i + 1); }) };
  assert.equal(M.agregarHijo(lleno, "Sol", 10000, "mes"), null);
});

test("agrega y quita gastos sin mutar el estado y rechaza ids o datos inválidos", function () {
  var estado = { hijos: [hijo(1), hijo(2)] };
  estado.hijos[0].gastos.push(gasto(5, "2026-02-16", 5000, "Dulces"));
  var original = JSON.stringify(estado);
  var nuevo = M.agregarGasto(estado, 1, 3000, "  Bus  ", "2026-02-17");
  assert.deepEqual(nuevo.hijos[0].gastos[1], gasto(6, "2026-02-17", 3000, "Bus"));
  [[99, 1, "Bus", "2026-02-17"], [1, 0, "Bus", "2026-02-17"], [1, 1, " ", "2026-02-17"],
    [1, 1, "x".repeat(41), "2026-02-17"], [1, 1, "Bus", "2026-02-29"]].forEach(function (caso) {
    assert.equal(M.agregarGasto(estado, caso[0], caso[1], caso[2], caso[3]), null);
  });
  assert.deepEqual(M.quitarGasto(nuevo, 1, 6), estado);
  assert.equal(nuevo.hijos[0].gastos.length, 2);
  assert.equal(M.quitarGasto(estado, 99, 5), null);
  assert.equal(M.quitarGasto(estado, 2, 5), null);
  assert.equal(JSON.stringify(estado), original);
});

test("quita un hijo con sus gastos sin mutar el estado y rechaza un hijo inexistente", function () {
  var estado = { hijos: [hijo(1), hijo(2)] };
  estado.hijos[0].gastos.push(gasto(1, "2026-02-16", 5000, "Dulces"));
  var original = JSON.stringify(estado);
  assert.deepEqual(M.quitarHijo(estado, 1), { hijos: [hijo(2)] });
  assert.equal(M.quitarHijo(estado, 3), null);
  assert.equal(JSON.stringify(estado), original);
});
