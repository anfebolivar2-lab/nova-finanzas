const test = require("node:test");
const assert = require("node:assert/strict");
const { leerFacturaQr } = require("./factura-qr");

test("lee un QR DIAN completo y da prioridad al total de la factura", () => {
  const qr = ["NumFac: FE123", "FecFac: 2026-11-20", "NitFac: 900123456", "DocAdq: 123",
    "ValFac: 45000.00", "ValIva: 7184.87", "ValOtroIm: 5.00", "ValTolFac: 52184.87",
    "CUFE: abc", "QRCode: https://catalogo-vpfe.dian.gov.co/consulta"].join("\r\n");
  assert.deepEqual(leerFacturaQr(qr), {
    total: 52184.87, fecha: "2026-11-20", comercioNit: "900123456", numero: "FE123", iva: 7184.87
  });
});

test("lee una factura con solo el valor base", () => {
  assert.deepEqual(leerFacturaQr("ValFac: 45000.00"), { total: 45000, fecha: "", comercioNit: "", numero: "", iva: 0 });
});

test("suma los impuestos sin total y admite comas, espacios y mayúsculas", () => {
  const qr = "  VALFAC : 45000,10 \r\n valIva: 7184,87 \n valOtroIm : 5,20\n fecFac: 2026-02-30";
  assert.deepEqual(leerFacturaQr(qr), { total: 52190.17, fecha: "", comercioNit: "", numero: "", iva: 7184.87 });
});

test("rechaza texto basura, URL, texto vacío y total en cero", () => {
  for (const qr of ["ValFac: 4mil", "https://catalogo-vpfe.dian.gov.co/consulta", "", "ValTolFac: 0\nValFac: 10"]) {
    assert.equal(leerFacturaQr(qr), null);
  }
});
