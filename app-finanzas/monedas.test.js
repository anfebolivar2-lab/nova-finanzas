const test = require("node:test");
const assert = require("node:assert");
const M = require("./monedas.js");

const TASAS = { USD: 1, COP: 3900, EUR: 0.92, CAD: 1.36, JPY: 150 };

test("tasa a pesos según tasas con base en USD", () => {
  assert.strictEqual(M.tasaACOP("COP", TASAS), 1);
  assert.strictEqual(M.tasaACOP("USD", TASAS), 3900);
  assert.strictEqual(Math.round(M.tasaACOP("EUR", TASAS)), 4239);
  assert.strictEqual(M.tasaACOP("JPY", TASAS), 26);
  assert.strictEqual(M.tasaACOP("XXX", TASAS), null);
  assert.strictEqual(M.tasaACOP("USD", null), null);
  assert.strictEqual(M.tasaACOP("USD", { USD: 1 }), null);
});

test("convertir a pesos redondeando", () => {
  assert.strictEqual(M.aCOP(50, 3900), 195000);
  assert.strictEqual(M.aCOP(19.99, 3900.5), 77971);
});

test("leer tasas escritas", () => {
  assert.strictEqual(M.leerTasa("3.900"), 3900);
  assert.strictEqual(M.leerTasa("3900,50"), 3900.5);
  assert.strictEqual(M.leerTasa("1.234.567,5"), 1234567.5);
  assert.strictEqual(M.leerTasa("0,00025"), 0.00025);
  assert.strictEqual(M.leerTasa("4 100"), 4100);
  assert.ok(isNaN(M.leerTasa("")));
  assert.ok(isNaN(M.leerTasa("abc")));
  assert.ok(isNaN(M.leerTasa("-5")));
});

test("buscar monedas sin tildes ni mayúsculas", () => {
  assert.strictEqual(M.buscar("")[0].codigo, "COP");
  assert.deepStrictEqual(M.buscar("dolar").map((m) => m.codigo).slice(0, 3), ["USD", "CAD", "AUD"]);
  assert.deepStrictEqual(M.buscar("eur").map((m) => m.codigo), ["EUR"]);
  assert.deepStrictEqual(M.buscar("mexic").map((m) => m.codigo), ["MXN"]);
  assert.strictEqual(M.info("USD").bandera, "🇺🇸");
  assert.strictEqual(M.info("ZZZ").nombre, "ZZZ");
});

test("formatos", () => {
  assert.strictEqual(M.formatoTasa(3900), "3.900");
  assert.strictEqual(M.formatoTasa(1.3612), "1,36");
  assert.strictEqual(M.formatoTasa(0.000256), "0,000256");
  assert.ok(/50/.test(M.formatoMonto(50, "USD")));
  assert.ok(/EUR|€/.test(M.formatoMonto(50, "EUR")));
  assert.strictEqual(M.formatoMonto(5, "AB"), "AB 5");
});

test("lista completa de monedas del mundo", () => {
  assert.ok(M.MONEDAS.length >= 150);
  const codigos = M.MONEDAS.map((m) => m[0]);
  assert.strictEqual(new Set(codigos).size, codigos.length);              // sin repetidas
  ["COP", "USD", "EUR", "JPY", "XOF", "VND", "AED", "ZAR", "KRW", "NGN"].forEach((c) => assert.ok(codigos.includes(c), c));
  assert.ok(M.buscar("yen").some((m) => m.codigo === "JPY"));
  assert.ok(M.buscar("franco").length >= 4);
  assert.strictEqual(M.info("JPY").bandera, "🇯🇵");
  M.MONEDAS.forEach((m) => assert.ok(m[1] && m[2], m[0]));                 // todas con nombre y bandera
});

test("leer tasas mientras se escriben (el punto es de miles)", () => {
  assert.strictEqual(M.leerTasa("3.9000"), 39000);
  assert.strictEqual(M.leerTasa("3900"), 3900);
});

test("convertir entre cualquier par de monedas", () => {
  const tasas = { USD: 1, COP: 4000, EUR: 0.8, JPY: 160 };
  assert.strictEqual(M.convertir(12, "USD", "COP", tasas), 48000);
  assert.strictEqual(M.convertir(48000, "COP", "USD", tasas), 12);
  assert.strictEqual(M.convertir(10, "EUR", "JPY", tasas), 2000);    // 10 EUR = 12,5 USD = 2.000 JPY
  assert.strictEqual(M.convertir(5, "USD", "XXX", tasas), null);
  assert.strictEqual(M.convertir(5, "USD", "COP", null), null);
});

test("formato de números con puntos y coma", () => {
  assert.strictEqual(M.formatoNumero(48000), "48.000");
  assert.strictEqual(M.formatoNumero(25.64), "25,64");
  assert.strictEqual(M.formatoNumero(0.00025), "0,00025");
  assert.strictEqual(M.formatoNumero(1234567.4), "1.234.567");
  assert.strictEqual(M.formatoNumero(12.5), "12,5");
});

test("detecta la moneda de una frase o de un mensaje del banco", () => {
  const casos = [
    ["gasté 20 dólares en Amazon", "USD"], ["pagué USD 15 de Spotify", "USD"], ["US$ 9,99 Netflix", "USD"], ["compraste U$S 30", "USD"],
    ["almuerzo 12 euros", "EUR"], ["€30 hotel", "EUR"], ["taxi 25 eur", "EUR"], ["me pagaron 100 reales", "BRL"], ["R$ 50", "BRL"],
    ["350 pesos mexicanos en tacos", "MXN"], ["MXN350 tacos", "MXN"], ["£ 20 tren", "GBP"], ["una libra de carne 8 mil", null], ["uvas verdes 5 mil", null], ["10 dólares canadienses", "CAD"],
    ["gasté 20 mil en almuerzo", null], ["$ 20.000 mercado", null], ["30 mil pesos", null], ["COP 50.000", null],
    ["uber 15 mil", null], ["tienda 3 mil", null], ["compraste por $45.000 en EXITO", null]
  ];
  casos.forEach(([t, esperado]) => assert.strictEqual(M.detectar(t), esperado, t));
});
