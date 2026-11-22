const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const C = require("./calculadoras.js");

function cerca(actual, esperado) {
  assert.ok(Math.abs(actual - esperado) < 0.000001, actual + " debe aproximarse a " + esperado);
}

test("exporta las calculadoras y los datos iniciales en el navegador", () => {
  const browser = { window: {} };
  vm.runInNewContext(fs.readFileSync(require.resolve("./calculadoras.js"), "utf8"), browser);
  assert.deepEqual(Object.keys(browser.window.NovaCalculadoras), Object.keys(C));
  assert.equal(C.CONSTANTES.salarioMinimo.valor, 1750905);
  assert.equal(C.CONSTANTES.auxilioTransporte.valor, 249095);
  assert.equal(C.CONSTANTES.salarioMinimo.anio, 2026);
  assert.equal(C.CONSTANTES.auxilioTransporte.anio, 2026);
});

test("calendario comercial inclusivo con meses de 30 días", () => {
  assert.equal(C.diasComerciales("2026-01-01", "2026-12-31"), 360);
  assert.equal(C.diasComerciales("2026-02-01", "2026-02-28"), 30);
  assert.equal(C.diasComerciales("2024-02-01", "2024-02-29"), 30);
  assert.equal(C.diasComerciales("2026-01-31", "2026-02-01"), 2);
  assert.equal(C.diasComerciales("2026-02-28", "2026-03-01"), 2);
  assert.equal(C.diasComerciales("2026-02-28", "2026-02-28"), 1);
  assert.equal(C.diasComerciales("2026-07-01", "2026-06-30"), null);
  assert.equal(C.diasComerciales("2026-02-29", "2026-03-01"), null);
  assert.equal(C.diasComerciales("", "2026-03-01"), null);
});

test("liquidación proporcional con auxilio para prima y cesantías", () => {
  const r = C.liquidacion(1800000, 200000, "2026-01-01", "2026-06-30", 3);
  assert.deepEqual(r, { dias: 180, cesantias: 1000000, intereses: 60000,
    prima: 1000000, vacaciones: 180000, total: 2240000 });
});

test("liquidación cruza años y calcula intereses por cada fracción anual", () => {
  const r = C.liquidacion(2000000, 0, "2025-07-01", "2026-06-30", 0);
  assert.equal(r.dias, 360);
  assert.equal(r.cesantias, 2000000);
  assert.equal(r.prima, 2000000);
  assert.equal(r.intereses, 120000);
  assert.equal(r.total, 4120000);
});

test("liquidación acepta ceros y valida fechas, montos y límites numéricos", () => {
  const fecha = "2026-11-22";
  assert.deepEqual(C.liquidacion(0, 0, fecha, fecha, 0),
    { dias: 1, cesantias: 0, intereses: 0, prima: 0, vacaciones: 0, total: 0 });
  assert.equal(C.liquidacion(0, 0, fecha, fecha, -1), null);
  assert.equal(C.liquidacion(3000000, 0, "2026-11-23", fecha, 0), null);
  assert.equal(C.liquidacion(3000000, Infinity, fecha, fecha, 0), null);
  assert.equal(C.liquidacion(Number.MAX_VALUE, Number.MAX_VALUE, fecha, fecha, 0), null);
});

test("horas extra incluyen la base y los recargos ordinarios suman solo el adicional", () => {
  assert.deepEqual(C.horasExtra(2400000, 240, 2, 1, 3, 4, 80),
    { hora: 10000, extraDiurna: 25000, extraNocturna: 17500, recargoNocturno: 10500,
      dominicalFestivo: 32000, total: 85000 });
  assert.equal(C.horasExtra(2100000, 210, 0, 0, 0, 1.5, 100).total, 15000);
});

test("el porcentaje sugerido cambia en cada etapa de la Ley 2466", () => {
  assert.equal(C.recargoFestivo("2025-07-01"), 80);
  assert.equal(C.recargoFestivo("2026-06-30"), 80);
  assert.equal(C.recargoFestivo("2026-07-01"), 90);
  assert.equal(C.recargoFestivo("2027-06-30"), 90);
  assert.equal(C.recargoFestivo("2027-07-01"), 100);
});

test("horas y porcentajes cero son válidos, divisor cero y valores fuera de rango se rechazan", () => {
  assert.equal(C.horasExtra(0, 240, 1, 0, 0, 0, 80).total, 0);
  assert.equal(C.horasExtra(1000000, 240, 0, 0, 0, 1, 0).total, 0);
  assert.equal(C.horasExtra(1000000, 0, 1, 0, 0, 0, 80), null);
  assert.equal(C.horasExtra(1000000, 240, -1, 0, 0, 0, 80), null);
  assert.equal(C.horasExtra(1000000, 240, 0, 0, 0, 1, 101), null);
  assert.equal(C.horasExtra(1000000, Number.MIN_VALUE, 1, 0, 0, 0, 80), null);
});

test("salario neto calcula salud y pensión sobre el salario y distingue el umbral de solidaridad", () => {
  assert.deepEqual(C.salarioNeto(1800000, 200000, 1750905),
    { salud: 72000, pension: 72000, solidaridad: 0, neto: 1856000 });
  assert.equal(C.salarioNeto(7003619, 0, 1750905).solidaridad, 0);
  const r = C.salarioNeto(7003620, 0, 1750905);
  cerca(r.solidaridad, 70036.20);
  cerca(r.neto, 6373294.20);
  assert.equal(C.salarioNeto(8000000, 100000, 2100000).solidaridad, 0);
});

test("salario neto permite cero ingreso y rechaza mínimo nulo, negativos y desbordamiento", () => {
  assert.deepEqual(C.salarioNeto(0, 0, 1750905), { salud: 0, pension: 0, solidaridad: 0, neto: 0 });
  assert.equal(C.salarioNeto(0, 0, 0), null);
  assert.equal(C.salarioNeto(1, -1, 1750905), null);
  assert.equal(C.salarioNeto(NaN, 0, 1750905), null);
  assert.equal(C.salarioNeto(Number.MAX_VALUE, Number.MAX_VALUE, 1750905), null);
});

test("GMF manual aplica 0,4 % con fracciones y ceros", () => {
  assert.equal(C.gmf(100000), 400);
  assert.equal(C.gmf(100), 0.4);
  assert.equal(C.gmf(0), 0);
  assert.equal(C.gmf(-1), null);
  assert.equal(C.gmf(Infinity), null);
});

test("GMF suma egresos pagados y mantiene movimientos antiguos sin estado", () => {
  const movimientos = [
    { tipo: "gasto", estado: "pagado", monto: 50000 },
    { tipo: "gasto", monto: "25000" },
    { tipo: "gasto", estado: "pendiente", monto: 100000 },
    { tipo: "ingreso", monto: 100000 },
    { tipo: "gasto", monto: "sin valor" },
    { tipo: "gasto", monto: -10000 }
  ];
  assert.deepEqual(C.gmfMovimientos(movimientos), { egresos: 75000, impuesto: 300 });
  assert.deepEqual(C.gmfMovimientos([]), { egresos: 0, impuesto: 0 });
  const extremo = { tipo: "gasto", monto: Number.MAX_VALUE };
  assert.equal(C.gmfMovimientos([extremo, extremo]), null);
});

test("interés compuesto convierte la tasa efectiva y aporta al cierre de cada mes", () => {
  const tasa = (Math.pow(1.01, 12) - 1) * 100;
  const r = C.interesCompuesto(1000, tasa, 2);
  assert.equal(r.aportado, 24000);
  cerca(r.saldo, 1000 * (Math.pow(1.01, 24) - 1) / 0.01);
  cerca(r.ganancia, r.saldo - 24000);
  assert.deepEqual(r.tabla.map(fila => [fila.anio, fila.aportado]), [[1, 12000], [2, 24000]]);
  cerca(r.tabla[0].saldo, 1000 * (Math.pow(1.01, 12) - 1) / 0.01);
  assert.equal(r.tabla[1].saldo, r.saldo);
});

test("interés compuesto maneja ceros, pérdida y límites", () => {
  assert.deepEqual(C.interesCompuesto(1000, 10, 0), { saldo: 0, aportado: 0, ganancia: 0, tabla: [] });
  assert.equal(C.interesCompuesto(0, 10, 1).saldo, 0);
  assert.equal(C.interesCompuesto(100, 0, 1).ganancia, 0);
  assert.ok(C.interesCompuesto(100, -10, 1).ganancia < 0);
  assert.equal(C.interesCompuesto(100, -100, 1).saldo, 100);
  assert.equal(C.interesCompuesto(100, 0, C.MAX_ANIOS).tabla.length, C.MAX_ANIOS);
  assert.equal(C.interesCompuesto(100, 0, C.MAX_ANIOS + 1), null);
  assert.equal(C.interesCompuesto(100, 10, 1.5), null);
  assert.equal(C.interesCompuesto(100, -101, 1), null);
  assert.equal(C.interesCompuesto(100, Infinity, 1), null);
  assert.equal(C.interesCompuesto(-100, 0, 1), null);
  assert.equal(C.interesCompuesto(Number.MAX_VALUE, 10, 1), null);
});

test("regla del 4 % calcula 25 veces los gastos y valida los límites", () => {
  assert.equal(C.reglaCuatro(36000000), 900000000);
  assert.equal(C.reglaCuatro(0), 0);
  assert.equal(C.reglaCuatro(-1), null);
  assert.equal(C.reglaCuatro(NaN), null);
  assert.equal(C.reglaCuatro(Number.MAX_VALUE), null);
});

test("horas de trabajo: precio, jornada de ocho horas y datos inválidos", () => {
  assert.deepEqual(C.horasDeTrabajo(2400000, 192, 300000), { horas: 24, dias: 3 });
  assert.deepEqual(C.horasDeTrabajo(2400000, 160, 0), { horas: 0, dias: 0 });
  assert.deepEqual(C.horasDeTrabajo(2400000, 160, 15000), { horas: 1, dias: 0.125 });
  for (const datos of [[0, 192, 1], [1, 0, 1], [1, 192, -1], [NaN, 192, 1], [1, Infinity, 1]]) {
    assert.equal(C.horasDeTrabajo(...datos), null);
  }
});

test("cuota fija con tasa EA equivalente, tasa cero y plazos válidos", () => {
  const ea = (1.01 ** 12 - 1) * 100;
  cerca(C.cuotaCredito(1200000, ea, 12), 106618.54641401);
  cerca(C.cuotaCredito(100000, ea, 1), 101000);
  cerca(C.cuotaCredito(1200000, 1e-14, 12), 100000);
  assert.equal(C.cuotaCredito(1200000, 0, 12), 100000);
  assert.equal(C.cuotaCredito(0, ea, 12), 0);
  for (const datos of [[-1, 0, 12], [1, -1, 12], [1, Infinity, 12], [1, 0, 0], [1, 0, 1.5], [1, 0, Infinity]]) {
    assert.equal(C.cuotaCredito(...datos), null);
  }
});

test("comparación de dos o tres créditos, seguro, empate y ofertas incompletas", () => {
  const base = { monto: 1200000, tasaEaPct: 0, meses: 12 };
  const conSeguro = { ...base, seguroMensual: 10000 };
  const conInteres = { ...base, tasaEaPct: (1.01 ** 12 - 1) * 100 };
  const dos = C.compararCreditos([conSeguro, conInteres]);
  assert.deepEqual(dos.ofertas[0], { cuotaBase: 100000, cuota: 110000, total: 1320000, intereses: 0 });
  cerca(dos.ofertas[1].intereses, 79422.5569681);
  assert.deepEqual(dos.masBaratas, [1]);
  assert.deepEqual(C.compararCreditos([conSeguro, base, base]).masBaratas, [1, 2]);
  assert.deepEqual(C.compararCreditos([base, { ...base, monto: 2400000 }]).masBaratas, [0]);
  for (const ofertas of [null, [base], [base, base, base, base], [base, null],
    [base, { ...base, seguroMensual: -1 }], [base, { ...base, monto: 0 }], [base, { monto: 1 }]]) {
    assert.equal(C.compararCreditos(ofertas), null);
  }
});

test("vivienda: inicial, seguros mensuales y total con la inicial incluida", () => {
  assert.deepEqual(C.creditoVivienda(120000000, 20, 0, 10, 20000, 30000), {
    monto: 96000000, cuotaBase: 800000, cuotaConSeguros: 850000, total: 126000000
  });
  const r = C.creditoVivienda(120000000, 0, 12, 1.5, 0, 0);
  cerca(r.cuotaBase, C.cuotaCredito(120000000, 12, 18));
  cerca(r.total, r.cuotaBase * 18);
  for (const datos of [[0, 20, 12, 10, 0, 0], [1, 100, 12, 10, 0, 0], [1, -5, 12, 10, 0, 0],
    [1, 20, 12, 0, 0, 0], [1, 20, 12, 1.1, 0, 0], [1, 20, 12, 1, -1, 0]]) {
    assert.equal(C.creditoVivienda(...datos), null);
  }
});

test("compra de cartera: ahorro, costos que eliminan el ahorro y empate", () => {
  const ea = (1.01 ** 12 - 1) * 100;
  const r = C.compraCartera(1000000, ea, 1, 0, 3000);
  cerca(r.totalActual, 1010000);
  assert.equal(r.totalNuevo, 1003000);
  cerca(r.ahorro, 7000);
  assert.equal(r.conviene, true);
  assert.equal(C.compraCartera(1000000, ea, 1, 0, 10000).ahorro, 0);
  const perdida = C.compraCartera(1000000, ea, 1, 0, 20000);
  cerca(perdida.ahorro, -10000);
  assert.equal(perdida.conviene, false);
  assert.equal(C.compraCartera(1000000, ea, 12, ea, 0).conviene, false);
  for (const datos of [[0, 5, 12, 1, 0], [1, 5, 12, 1, -1], [1, -1, 12, 1, 0],
    [1, 5, 12, -1, 0], [1, 5, 0, 1, 0]]) {
    assert.equal(C.compraCartera(...datos), null);
  }
});

test("calcula el rendimiento de CDT efectivo anual y la retención solo sobre los intereses", () => {
  const anual = C.rendimientoCdt(1000000, 10, 365);
  cerca(anual.bruto, 100000);
  cerca(anual.retencion, 4000);
  cerca(anual.neto, 96000);
  const parcial = C.rendimientoCdt(1000000, 12, 90, 5);
  cerca(parcial.bruto, 1000000 * (1.12 ** (90 / 365) - 1));
  cerca(parcial.retencion, parcial.bruto * 0.05);
  cerca(parcial.neto, parcial.bruto * 0.95);
  assert.deepEqual(C.rendimientoCdt(100, 0, 30, 0), { bruto: 0, retencion: 0, neto: 0 });
  assert.equal(C.rendimientoCdt(100, 7, 30, 100).neto, 0);
  for (const args of [[0, 10, 30, 4], [100, -1, 30, 4], [100, 10, 0, 4], [100, 10, 1.5, 4],
    [100, 10, 30, -1], [100, 10, 30, 101], [Infinity, 10, 30, 4], [100, 10, 1e9, 4]]) {
    assert.equal(C.rendimientoCdt(...args), null);
  }
});

test("compara dos o tres CDT por ganancia neta y conserva los empates", () => {
  const a = Object.freeze({ monto: 1000, tasaEaPct: 12, dias: 365, retencionPct: 50 });
  const b = Object.freeze({ monto: 1000, tasaEaPct: 10, dias: 365, retencionPct: 0 });
  const c = Object.freeze({ monto: 1000, tasaEaPct: 11, dias: 365, retencionPct: 0 });
  const dos = C.compararCdt(Object.freeze([a, b]));
  assert.deepEqual(dos.mejores, [1]);
  assert.ok(dos.resultados[0].bruto > dos.resultados[1].bruto);
  assert.deepEqual(C.compararCdt([a, b, c]).mejores, [2]);
  assert.deepEqual(C.compararCdt([a, b, b]).mejores, [1, 2]);
  for (const ofertas of [null, [a], [a, b, c, a], [a, null], [a, {}]]) {
    assert.equal(C.compararCdt(ofertas), null);
  }
});

test("estima el ahorro de aportes con el menor tope y nunca excede el aporte", () => {
  assert.deepEqual(C.ahorroTributarioAporte(100000000, 40000000, 52374, 20),
    { limite: 30000000, montoExento: 30000000, ahorro: 6000000 });
  assert.deepEqual(C.ahorroTributarioAporte(1000000000, 500000000, 52374, 25),
    { limite: 199021200, montoExento: 199021200, ahorro: 49755300 });
  assert.deepEqual(C.ahorroTributarioAporte(100000000, 5000000, 50000, 10),
    { limite: 30000000, montoExento: 5000000, ahorro: 500000 });
  assert.deepEqual(C.ahorroTributarioAporte(1000, 800, 1, 50, 15, 100),
    { limite: 100, montoExento: 100, ahorro: 50 });
  assert.deepEqual(C.ahorroTributarioAporte(0, 0, 52374, 0), { limite: 0, montoExento: 0, ahorro: 0 });
  for (const args of [[-1, 10, 1, 10], [100, -1, 1, 10], [100, 10, 0, 10], [100, 10, 1, 101],
    [100, 10, 1, NaN], [100, 10, 1, 10, 101], [100, 10, 1, 10, 20, -1]]) {
    assert.equal(C.ahorroTributarioAporte(...args), null);
  }
});
