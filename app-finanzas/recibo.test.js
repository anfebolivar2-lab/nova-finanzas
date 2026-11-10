// Ejecutar con: node --test app-finanzas/*.test.js
const test = require("node:test");
const assert = require("node:assert");
const { leerRecibo, montos } = require("./recibo.js");

test("droguería con subtotal, IVA, efectivo y cambio", () => {
  const r = leerRecibo(`DROGUERIA LA REBAJA
NIT 900.123.456-7
Cra 5 # 10-20 Neiva
FECHA 29/10/2026 10:42
ACETAMINOFEN 500MG   2   8.400
VITAMINA C           1  21.600
SUBTOTAL 25.210
IVA 19% 4.790
TOTAL 30.000
EFECTIVO 50.000
CAMBIO 20.000`);
  assert.deepStrictEqual(r, { ok: true, monto: 30000, comercio: "Drogueria La Rebaja" });
});

test("total a pagar con decimales y signo $", () => {
  const r = leerRecibo(`Restaurante El Fogón
Factura de venta No. 4521
2 Bandeja paisa $ 52.000,00
1 Limonada $ 6.500,00
TOTAL A PAGAR $ 58.500,00`);
  assert.strictEqual(r.monto, 58500);
  assert.strictEqual(r.comercio, "Restaurante El Fogón");
});

test("el valor del total viene en la línea siguiente", () => {
  const r = leerRecibo(`TIENDA DON PEPE
VALOR TOTAL
12.300`);
  assert.strictEqual(r.monto, 12300);
});

test("corrige letras leídas como números en el total", () => {
  const r = leerRecibo(`PANADERIA LA ESPIGA
TOTAL 1S.3OO`);
  assert.strictEqual(r.monto, 15300);
});

test("sin la palabra total usa el valor más alto, ignorando NIT y cambio", () => {
  const r = leerRecibo(`MINIMERCADO LUZ
NIT 800987654
Arroz 4.200
Leche 4.600
Pan 3.000
11.800
Cambio 8.200`);
  assert.strictEqual(r.monto, 11800);
});

test("no confunde subtotal ni total IVA con el total", () => {
  const r = leerRecibo(`CAFE JUAN
SUBTOTAL 84.034
TOTAL IVA 15.966
TOTAL 100.000`);
  assert.strictEqual(r.monto, 100000);
});

test("sin números da un error que invita a escribirlo", () => {
  const r = leerRecibo("GRACIAS POR SU COMPRA");
  assert.strictEqual(r.ok, false);
  assert.match(r.error, /Escríbelo tú/);
});

test("foto sin texto", () => {
  assert.strictEqual(leerRecibo("  \n ").ok, false);
});

test("lectura de cifras", () => {
  assert.deepStrictEqual(montos("30.000 30,000 1.250.000 $5000 45.000,00 cant 2"), [30000, 30000, 1250000, 5000, 45000]);
});
