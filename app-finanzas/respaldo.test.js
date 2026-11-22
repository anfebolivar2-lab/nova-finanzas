const test = require("node:test");
const assert = require("node:assert/strict");
const { cifrar, descifrar } = require("./respaldo.js");

const clave = "  llave de la bóveda 🔑  ";
const texto = JSON.stringify({ app: "NOVA", movimientos: [{ descripcion: "Café ☕", monto: 4500 }] });

test("respaldo cifrado: ida y vuelta con sal e IV nuevos por archivo", async () => {
  const uno = await cifrar(texto, clave);
  const otro = await cifrar(texto, clave);
  assert.deepEqual(Object.keys(uno), ["formato", "sal", "iv", "datos"]);
  assert.equal(Buffer.from(uno.sal, "base64").length, 16);
  assert.equal(Buffer.from(uno.iv, "base64").length, 12);
  assert.notEqual(uno.sal, otro.sal);
  assert.notEqual(uno.iv, otro.iv);
  assert.equal(await descifrar(JSON.parse(JSON.stringify(uno)), clave), texto);
});

test("respaldo cifrado: falla con contraseña incorrecta", async () => {
  const sobre = await cifrar(texto, clave);
  await assert.rejects(descifrar(sobre, clave.trim()), /contraseña es incorrecta/);
});

test("respaldo cifrado: falla si se altera un byte del archivo", async () => {
  const sobre = await cifrar(texto, clave);
  const bytes = Buffer.from(sobre.datos, "base64");
  bytes[0] ^= 1;
  sobre.datos = bytes.toString("base64");
  await assert.rejects(descifrar(sobre, clave), /archivo está dañado/);
});

test("respaldo cifrado: falla con formato, base64 o tamaños inválidos", async () => {
  const sobre = await cifrar(texto, clave);
  for (const malo of [null, {}, { ...sobre, formato: "otro" }, { ...sobre, iv: "!!!!" }, { ...sobre, sal: "AAAA" }, { ...sobre, datos: "AB==" }]) {
    await assert.rejects(descifrar(malo, clave), /respaldo cifrado válido/);
  }
});
