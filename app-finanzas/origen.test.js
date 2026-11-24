const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const O = require("./origen");

test("valida origen y código sin corregir mayúsculas, espacios ni longitud", () => {
  ["qr", "a", "a".repeat(30), "red_social-2"].forEach((valor) => assert.equal(O.origenValido(valor), true));
  ["", "QR", " qr", "qr\n", "a".repeat(31), "á", null, 123].forEach((valor) => assert.equal(O.origenValido(valor), false));
  assert.equal(O.referidoValido("0123abcd"), true);
  ["0123ABCD", "123abcd", "00123abcd", "0123abcz", "0123abcd\n", "", null, 12345678]
    .forEach((valor) => assert.equal(O.referidoValido(valor), false));
});

test("conserva el primer valor válido de cada parámetro por separado", () => {
  const primera = O.primeraAtribucion({}, { o: "qr", r: "INVALIDO" });
  assert.deepEqual(primera, { o: "qr", r: "" });
  const segunda = O.primeraAtribucion(primera, { o: "amigos", r: "0123abcd" });
  assert.deepEqual(segunda, { o: "qr", r: "0123abcd" });
  assert.deepEqual(O.primeraAtribucion(segunda, { o: "tiktok", r: "abcdef12" }), segunda);
});

test("atribuye campos ausentes y excluye la invitación propia", () => {
  const guardada = { o: "qr", r: "0123abcd" };
  assert.deepEqual(O.metadataAtribucion({}, guardada, "0123abcd"), { nova_origen: "qr" });
  assert.deepEqual(O.metadataAtribucion({}, guardada, null), { nova_origen: "qr" });
  assert.deepEqual(O.metadataAtribucion({ nova_origen: "amigos" }, guardada, "abcdef12"), {
    nova_referido_por: "0123abcd"
  });
  assert.deepEqual(O.metadataAtribucion({ nova_origen: "amigos", nova_referido_por: "abcdef12" }, guardada, "deadbeef"), {});
});

test("genera el prefijo SHA-256 y devuelve null sin Web Crypto", async () => {
  assert.equal(await O.codigoRef("usuario-ejemplo"), "5337750a");
  const sinCrypto = { module: { exports: {} } };
  vm.runInNewContext(fs.readFileSync(require.resolve("./origen"), "utf8"), sinCrypto);
  assert.equal(await sinCrypto.module.exports.codigoRef("usuario-ejemplo"), null);
});

test("conserva atribución entre inicio, descarga y app con descarga como origen por defecto", () => {
  const web = "https://nova.test";
  const inicio = web + "/inicio.html?o=instagram&r=0123abcd&otra=1";
  const descarga = O.enlaceConAtribucion("descargar.html?v=avanzada", inicio);
  assert.equal(descarga, web + "/descargar.html?v=avanzada&o=instagram&r=0123abcd");
  assert.equal(O.enlaceConAtribucion("/", descarga, "descarga"), web + "/?o=instagram&r=0123abcd");
  assert.equal(O.enlaceConAtribucion("/", web + "/descargar.html?r=0123abcd", "descarga"), web + "/?o=descarga&r=0123abcd");
  assert.equal(O.enlaceConAtribucion("/", web + "/inicio.html?r=0123abcd"), web + "/?r=0123abcd");
  assert.equal(O.enlaceConAtribucion("/?panel=1#app", inicio), web + "/?panel=1&o=instagram&r=0123abcd#app");
});
