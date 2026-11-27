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

const { leerPantallazoBilletera, leerMontoGeneralPantallazo } = require("./recibo.js");

test("lee comprobantes plausibles de Nequi y Daviplata", () => {
  const casos = [
    ["Nequi\n¡Listo!\nEnviaste $20.000 a Ana Pérez\nFecha 29/10/2026", 20000, "gasto", "Nequi", "Ana Pérez", "2026-10-29"],
    ["NEQUI\nPAGASTE $ 1.250.000 PARA María José.", 1250000, "gasto", "Nequi", "María José", null],
    ["DaviPlata\nTransacción exitosa\nValor $1,250,000.00\nPara: Juan Díaz", 1250000, "gasto", "Daviplata", "Juan Díaz", null],
    ["NEQU1\nRECIBISTE S 20 000\nFecha: 2026-11-27", 20000, "ingreso", "Nequi", "", "2026-11-27"],
    ["DaviP1ata\nPago exitoso\nValor: S 3O . OOO,00", 30000, "gasto", "Daviplata", "", null],
    ["Nequi\nTe enviaron\n$45.000,00\nReferencia 12345678", 45000, "ingreso", "Nequi", "", null],
    ["DaviPlata\nTe llegó $ 25,000\nFecha: 31/02/2026", 25000, "ingreso", "Daviplata", "", null],
    ["NEQUI\nRetiraste $50.000\nSaldo disponible $120.000", 50000, "gasto", "Nequi", "", null],
    ["Daviplata\nTransferiste $30000 a 3201234567", 30000, "gasto", "Daviplata", "", null],
    ["Transacción exitosa\nValor $7.500", 7500, "gasto", null, "", null],
    ["¡LISTO!\nEnviaste 20 000 a Óscar Peña", 20000, "gasto", null, "Óscar Peña", null],
    ["Nequi\nEnviaste a Luisa García $10.000", 10000, "gasto", "Nequi", "Luisa García", null],
    ["Nequi\nEnviaste $10.000 a cuenta de ahorros", 10000, "gasto", "Nequi", "", null]
  ];
  for (const [texto, monto, tipo, billetera, destino, fecha] of casos) {
    assert.deepStrictEqual(leerPantallazoBilletera(texto), { monto, tipo, billetera, destino, fecha }, texto);
  }
});

test("usa el monto general cuando corresponde y descarta identificadores", () => {
  const general = "Café Azul\nTOTAL $ 24.000";
  assert.strictEqual(leerPantallazoBilletera(general), null);
  assert.strictEqual(leerMontoGeneralPantallazo(general).monto, 24000);
  for (const texto of [
    "Nequi\n¡Listo!\nReferencia 1234567\nCelular 3201234567\nFecha 29/10/2026",
    "Daviplata\nPago exitoso\nSaldo disponible $80.000",
    "Nequi\n¡Listo!\n3201234567",
    "Ruido sin valor",
    ""
  ]) {
    assert.strictEqual(leerPantallazoBilletera(texto), null, texto);
    assert.strictEqual(leerMontoGeneralPantallazo(texto).ok, false, texto);
  }
});
