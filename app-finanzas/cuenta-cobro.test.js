const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const cuenta = require("./cuenta-cobro.js");

const casos = [
  [0, "cero pesos"],
  [1, "un peso"],
  [21, "veintiún pesos"],
  [100, "cien pesos"],
  [101, "ciento un pesos"],
  [1000, "mil pesos"],
  [1001, "mil un pesos"],
  [21000, "veintiún mil pesos"],
  [400000, "cuatrocientos mil pesos"],
  [1000000, "un millón de pesos"],
  [1500000, "un millón quinientos mil pesos"],
  [2345678, "dos millones trescientos cuarenta y cinco mil seiscientos setenta y ocho pesos"],
  [999999999, "novecientos noventa y nueve millones novecientos noventa y nueve mil novecientos noventa y nueve pesos"],
  [-1, ""],
  ["1000", ""],
  [1.5, ""],
  [1000000000, ""]
];

test("convierte valores enteros de COP a letras", () => {
  casos.forEach(([valor, esperado]) => assert.equal(cuenta.valorEnLetras(valor), esperado, String(valor)));
});

const datos = { quienCobra: "Ana", cliente: "Diseño Bogotá", concepto: "Diseño de logo", valor: 400000 };

test("valida cada campo obligatorio de la cuenta de cobro", () => {
  assert.equal(cuenta.validar(datos), "");
  assert.match(cuenta.validar({ ...datos, quienCobra: " " }), /tu nombre/);
  assert.match(cuenta.validar({ ...datos, cliente: "" }), /cliente/);
  assert.match(cuenta.validar({ ...datos, concepto: "" }), /concepto/);
  [0, -1, NaN, Infinity, "400000"].forEach(valor => {
    assert.match(cuenta.validar({ ...datos, valor }), /mayor que cero/);
  });
});

test("carga jsPDF una sola vez para solicitudes simultáneas y genera un PDF", async () => {
  const jspdf = require("./vendor/informes/jspdf.umd.min.js");
  const window = {};
  let cargas = 0;
  window.document = {
    createElement: () => ({}),
    head: { append(script) {
      cargas++;
      assert.equal(script.src, "vendor/informes/jspdf.umd.min.js");
      queueMicrotask(() => { window.jspdf = jspdf; script.onload(); });
    } }
  };
  vm.runInNewContext(fs.readFileSync(require.resolve("./cuenta-cobro.js"), "utf8"), { window, Uint8Array });
  const resultados = await Promise.all([window.NovaCuentaCobro.crear(datos), window.NovaCuentaCobro.crear(datos)]);
  assert.equal(cargas, 1);
  resultados.forEach(pdf => {
    assert.ok(pdf.bytes instanceof Uint8Array);
    assert.equal(pdf.tipo, "application/pdf");
    assert.match(pdf.nombre, /^cuenta-de-cobro-diseno-bogota-\d{4}-\d{2}-\d{2}\.pdf$/);
    const contenido = Buffer.from(pdf.bytes).toString("latin1");
    assert.ok(contenido.startsWith("%PDF"));
    assert.ok(contenido.includes("Diseño Bogotá"));
    assert.ok(contenido.includes("cuatrocientos mil pesos"));
    assert.ok(contenido.includes("Hecho con NOVA"));
  });
});
