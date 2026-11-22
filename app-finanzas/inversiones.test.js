const test = require("node:test");
const assert = require("node:assert/strict");
const I = require("./inversiones.js");

const cdt = Object.freeze({ tipo: "cdt", nombre: "Banco", valorInvertido: 100, valorActual: 120 });
function inversion(campos) { return { ...cdt, ...campos }; }

test("valida los tipos, valores y una fecha de vencimiento opcional", () => {
  for (const tipo of ["cdt", "acciones", "cripto", "fondo", "otro"]) {
    assert.equal(I.validarInversion(inversion({ tipo, valorActual: 0 })), true);
  }
  for (const fechaVencimiento of ["", null, "2028-02-29"]) {
    assert.equal(I.validarInversion(inversion({ fechaVencimiento })), true);
  }
  for (const campos of [
    { tipo: "__proto__" }, { tipo: "desconocido" }, { nombre: " " }, { nombre: 1 },
    { valorInvertido: 0 }, { valorInvertido: -1 }, { valorInvertido: "100" },
    { valorActual: -1 }, { valorActual: NaN }, { valorActual: Infinity },
    { fechaVencimiento: "2026-02-29" }, { fechaVencimiento: "2026-04-31" }, { fechaVencimiento: "02/01/2026" }
  ]) assert.equal(I.validarInversion(inversion(campos)), false);
  assert.equal(I.validarInversion(null), false);
});

test("resume totales, ganancias, pérdidas y valor igual sin modificar la lista", () => {
  const lista = Object.freeze([cdt, Object.freeze(inversion({ valorInvertido: 80, valorActual: 20 })),
    inversion({ valorActual: 100 }), inversion({ valorActual: 0 }), {}]);
  const r = I.resumenInversiones(lista);
  assert.equal(r.totalInvertido, 380);
  assert.equal(r.totalActual, 240);
  assert.deepEqual(r.inversiones.map(x => [x.ganancia, x.gananciaPct]), [[20, 20], [-60, -75], [0, 0], [-100, -100]]);
  assert.equal(cdt.ganancia, undefined);
  assert.deepEqual(I.resumenInversiones([]), { inversiones: [], totalInvertido: 0, totalActual: 0 });
});

test("detecta vencidos, hoy y hasta quince días incluyendo otros tipos con fecha", () => {
  const lista = Object.freeze([
    inversion({ fechaVencimiento: "2026-04-06" }),
    inversion({ tipo: "fondo", fechaVencimiento: "2026-04-05" }),
    cdt,
    inversion({ fechaVencimiento: "2026-03-21" }),
    inversion({ fechaVencimiento: "2025-12-30" }),
    inversion({ fechaVencimiento: "2026-03-22" }),
    inversion({ fechaVencimiento: "2026-02-30" })
  ]);
  const hoy = new Date(2026, 2, 21, 23);
  assert.deepEqual(I.vencimientosProximos(lista, hoy).map(x => x.dias), [-81, 0, 1, 15]);
  assert.deepEqual(I.vencimientosProximos(lista, hoy, 0).map(x => x.dias), [-81, 0]);
  assert.deepEqual(I.vencimientosProximos(lista, hoy, -1), []);
  assert.deepEqual(I.vencimientosProximos(lista, new Date(NaN)), []);
  assert.equal(lista[0].dias, undefined);
});

test("deprecia por años compuestos y prorratea el tiempo desde el último aniversario", () => {
  assert.equal(I.valorDepreciado(1000, "2024-01-01", 10, "2026-01-01"), 810);
  assert.equal(I.valorDepreciado(1000, "2024-02-29", 10, "2025-02-28"), 900);
  const parcial = I.valorDepreciado(1000, "2025-01-01", 10, "2025-07-01");
  assert.ok(Math.abs(parcial - 1000 * 0.9 ** (181 / 365)) < 1e-10);
  assert.equal(I.valorDepreciado(1000, "2026-01-01", 100, "2026-01-01"), 1000);
  assert.equal(I.valorDepreciado(1000, "2026-01-01", 100, "2025-12-31"), 1000);
  assert.equal(I.valorDepreciado(1000, "2026-01-01", 100, "2026-01-02"), 0);
  assert.equal(I.valorDepreciado(1000, "2020-01-01", 0, "2026-01-01"), 1000);
});

test("rechaza valores, tasas y fechas inválidos para depreciación", () => {
  for (const [valor, fecha, tasa, hoy] of [
    [-1, "2025-01-01", 10, "2026-01-01"], [Infinity, "2025-01-01", 10, "2026-01-01"],
    [1000, "2025-02-29", 10, "2026-01-01"], [1000, "2025-01-01", 10, "ayer"],
    [1000, "2025-01-01", -1, "2026-01-01"], [1000, "2025-01-01", 101, "2026-01-01"],
    [1000, "2025-01-01", NaN, "2026-01-01"]
  ]) assert.equal(I.valorDepreciado(valor, fecha, tasa, hoy), null);
});

test("distribuye los activos y resta las deudas aparte, incluso sin activos", () => {
  assert.deepEqual(I.distribucionPatrimonio(50, 30, 20, 125), {
    activos: 100, deudas: 125, neto: -25, porcentajes: { cuentas: 50, inversiones: 30, bienes: 20 }
  });
  assert.deepEqual(I.distribucionPatrimonio(0, 0, 0, 20), {
    activos: 0, deudas: 20, neto: -20, porcentajes: { cuentas: 0, inversiones: 0, bienes: 0 }
  });
});

test("expone las mismas funciones como NovaInversiones en el navegador", () => {
  const fs = require("node:fs");
  const vm = require("node:vm");
  const navegador = { window: {} };
  vm.runInNewContext(fs.readFileSync(require.resolve("./inversiones.js"), "utf8"), navegador);
  assert.deepEqual(Object.keys(navegador.window.NovaInversiones), Object.keys(I));
});
