const test = require("node:test");
const assert = require("node:assert/strict");
const { estadoFinancieroMensual } = require("./informes.js");

const ahora = new Date(2027, 0, 18, 15);
const mov = (fecha, tipo, monto, categoria_id, extra) => Object.assign({ fecha, tipo, monto, categoria_id }, extra);

test("calcula el mes calendario y lo compara con el mes anterior incluso al cambiar de año", () => {
  const movimientos = [
    mov(new Date(2026, 10, 30, 23, 59), "ingreso", 9000),
    mov(new Date(2026, 11, 1), "ingreso", "800"),
    mov(new Date(2026, 11, 31, 23, 59), "gasto", 500, 1),
    mov(new Date(2027, 0, 1), "ingreso", 1000),
    mov(new Date(2027, 0, 2), "gasto", 130, 1),
    mov(ahora, "gasto", 100, 1),
    mov(new Date(2027, 0, 18, 16), "gasto", 999, 1),
    mov(new Date(2027, 0, 2), "gasto", 999, 1, { estado: "pendiente" }),
    mov(new Date(2027, 0, 2), "ingreso", 999, 1, { transferencia: "entre-espacios" })
  ];
  const saldo = [{ nombre: "Efectivo", saldo: -36 }, { nombre: "Banco", saldo: 300 }];
  const informe = estadoFinancieroMensual(movimientos, [{ id: 1, nombre: "Comida" }], saldo, ahora);
  assert.match(informe.mes, /enero/i);
  assert.match(informe.mesAnterior, /diciembre/i);
  assert.deepEqual(informe.resumen, [
    { nombre: "Ingresos", actual: 1000, anterior: 800, diferencia: 200 },
    { nombre: "Gastos", actual: 230, anterior: 500, diferencia: -270 },
    { nombre: "Ahorro", actual: 770, anterior: 300, diferencia: 470 }
  ]);
  assert.deepEqual(informe.categorias, [{ nombre: "Comida", total: 230 }]);
  assert.deepEqual(informe.cuentas, saldo);
  assert.notEqual(informe.cuentas[0], saldo[0]);
});

test("limita a cinco categorías ordenadas por gasto y admite meses vacíos", () => {
  const gastos = Array.from({ length: 7 }, (_, i) => mov(ahora, "gasto", i + 1, i));
  const informe = estadoFinancieroMensual(gastos, [{ id: 6, nombre: "Transporte" }], [], ahora);
  assert.deepEqual(informe.categorias.map(c => c.total), [7, 6, 5, 4, 3]);
  assert.deepEqual(informe.categorias.slice(0, 2).map(c => c.nombre), ["Transporte", "Sin categoría"]);
  assert.equal(informe.resumen[2].actual, -28);
  const vacio = estadoFinancieroMensual([], [], [], ahora);
  assert.deepEqual(vacio.resumen.map(f => [f.actual, f.anterior, f.diferencia]), [[0, 0, 0], [0, 0, 0], [0, 0, 0]]);
  assert.deepEqual(vacio.categorias, []);
  assert.deepEqual(vacio.cuentas, []);
});
