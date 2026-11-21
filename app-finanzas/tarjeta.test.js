const test = require("node:test");
const assert = require("node:assert");
const T = require("./tarjeta.js");

const OPCIONES = { deuda: 1000000, tasaEA: 28.5, cuota: 100000 };

test("convierte la tasa efectiva anual a mensual", () => {
  assert.strictEqual(T.tasaMensual(0), 0);
  assert.ok(Math.abs(T.tasaMensual(28.5) - 0.02113) < 0.00002);
});

test("devuelve null para tasas y deudas inválidas", () => {
  [-1, "28.5", NaN, Infinity, null].forEach((tasaEA) => {
    assert.strictEqual(T.tasaMensual(tasaEA), null);
    assert.strictEqual(T.simularPagoMinimo({ ...OPCIONES, tasaEA }), null);
    assert.strictEqual(T.simularCuotaFija({ ...OPCIONES, tasaEA }), null);
  });

  [0, -1, "1000000", NaN].forEach((deuda) => {
    assert.strictEqual(T.simularPagoMinimo({ ...OPCIONES, deuda }), null);
    assert.strictEqual(T.simularCuotaFija({ ...OPCIONES, deuda }), null);
  });
});

test("la cuota fija liquida la deuda en 11 o 12 meses", () => {
  const cuota = T.simularCuotaFija(OPCIONES);
  assert.strictEqual(cuota.seAcaba, true);
  assert.ok([11, 12].includes(cuota.meses));
  assert.strictEqual(cuota.totalPagado, OPCIONES.deuda + cuota.totalIntereses);
});

test("pagar el mínimo cuesta más intereses que la cuota fija", () => {
  const { minimo, cuota, ahorroIntereses, mesesMenos } = T.compararMinimoVsCuota(OPCIONES);
  assert.strictEqual(minimo.seAcaba, true);
  assert.strictEqual(minimo.totalPagado, OPCIONES.deuda + minimo.totalIntereses);
  assert.ok(ahorroIntereses > 0);
  assert.strictEqual(ahorroIntereses, minimo.totalIntereses - cuota.totalIntereses);
  assert.ok(mesesMenos > 0);
  assert.strictEqual(mesesMenos, minimo.meses - cuota.meses);
});

test("la cuota que no cubre el interés del primer mes no liquida la deuda", () => {
  const comparacion = T.compararMinimoVsCuota({ ...OPCIONES, cuota: 20000 });
  assert.deepStrictEqual(comparacion.cuota, {
    meses: null, totalPagado: null, totalIntereses: null, seAcaba: false
  });
  assert.strictEqual(comparacion.ahorroIntereses, null);
  assert.strictEqual(comparacion.mesesMenos, null);
});

test("detiene la simulación en el límite de meses con saldo pendiente", () => {
  const { minimo, cuota, ahorroIntereses, mesesMenos } = T.compararMinimoVsCuota({ ...OPCIONES, maxMeses: 1 });
  assert.deepStrictEqual(minimo, { meses: 1, totalPagado: 50000, totalIntereses: 21116, seAcaba: false });
  assert.deepStrictEqual(cuota, { meses: 1, totalPagado: 100000, totalIntereses: 21116, seAcaba: false });
  assert.strictEqual(ahorroIntereses, null);
  assert.strictEqual(mesesMenos, null);
});
