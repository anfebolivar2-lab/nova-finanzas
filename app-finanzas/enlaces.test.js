const test = require("node:test");
const assert = require("node:assert/strict");
const { esEnlaceNuevoGasto } = require("./enlaces.js");

const enlace = "co.novafinanzas.app://nuevo-gasto";

test("reconoce el atajo de gasto y sus separadores", () => {
  for (const url of [enlace, enlace + "/", enlace + "?origen=android", enlace + "#registro",
    "CO.NovaFinanzas.APP://nuevo-gasto/?origen=android#registro"]) {
    assert.equal(esEnlaceNuevoGasto(url), true, url);
  }
});

test("rechaza otros enlaces, destinos parecidos y entradas inválidas", () => {
  for (const url of ["co.novafinanzas.app://login-callback#access_token=x", "co.novafinanzas.app://banco",
    "https://nova.example/nuevo-gasto", "otro.co.novafinanzas.app://nuevo-gasto",
    enlace + "s", enlace + "-extra", enlace + ".example", enlace + "@otro",
    enlace + ":80", enlace + "\n", "co.novafinanzas.app://NUEVO-GASTO", "", null, undefined, 0]) {
    assert.equal(esEnlaceNuevoGasto(url), false, String(url));
  }
});

test("lee un único id seguro del atajo de gasto", () => {
  const { frecuenteDeEnlace } = require("./enlaces.js");
  for (const [url, id] of [
    [enlace + "?f=12", "12"],
    ["CO.NovaFinanzas.APP://nuevo-gasto/?origen=widget&f=a_B-1&otro=2#registro", "a_B-1"],
    [enlace + "?f=abcdefghijklmnopqrst", "abcdefghijklmnopqrst"],
    [enlace, null],
    [enlace + "?otro=12", null],
    [enlace + "?f=", null],
    [enlace + "?f=12&f=13", null],
    [enlace + "?f=abcdefghijklmnopqrstu", null],
    [enlace + "?f=%25", null],
    [enlace + "?f=a+b", null],
    [enlace + "#?f=12", null],
    ["https://ejemplo.test/?f=12", null],
    ["", null],
    [null, null]
  ]) assert.equal(frecuenteDeEnlace(url), id, String(url));
  assert.equal(esEnlaceNuevoGasto(enlace + "?f=12"), true);
});
