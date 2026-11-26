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
