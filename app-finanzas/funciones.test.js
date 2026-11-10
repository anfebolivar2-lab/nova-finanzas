// En app.js todo vive en el mismo lugar: si una función se llama igual que otra función o que una variable,
// una reemplaza a la otra sin avisar. Así se dañaron los PDF y Excel en la versión 1.59 (dos funciones aBase64).
// Esta prueba no deja que pase otra vez.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const codigo = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
const funciones = [...codigo.matchAll(/^  function ([A-Za-z_$][\w$]*)\s*\(/gm)].map((m) => m[1]);
const variables = [...codigo.matchAll(/^  var ([A-Za-z_$][\w$]*)\s*[=,;]/gm)].map((m) => m[1]);

test("app.js no tiene dos funciones con el mismo nombre", () => {
  assert.deepStrictEqual(funciones.filter((n, i) => funciones.indexOf(n) !== i), []);
});

test("ninguna función de app.js se llama igual que una variable", () => {
  assert.deepStrictEqual(funciones.filter((n) => variables.includes(n)), []);
});
