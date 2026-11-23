const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync(require.resolve("./index.html"), "utf8");

test("los botones y campos de la auditoría tienen nombre accesible", () => {
  const ids = [
    "conv-de", "conv-a", "cuadrar-anotar", "foto-recibo", "chat-buscar",
    "buscar-texto", "archivo-cifrado", "archivo-respaldo", "archivo-csv",
    "cat-buscar", "tasas-buscar", "hoja-categoria-buscar", "cat-icono-buscar",
    "asis-texto", "asis-foto-archivo", "chat-foto-archivo", "hoja-moneda-buscar"
  ];
  ids.forEach((id) => {
    const control = html.match(new RegExp('<(?:button|input|textarea)\\b[^>]*\\bid="' + id + '"[^>]*>'));
    assert.ok(control, id);
    assert.ok(/\baria-label="[^"]+"/.test(control[0]) ||
      new RegExp('<label\\b[^>]*\\bfor="' + id + '"[^>]*>[^<]+').test(html), id);
  });
});

test("cada capa es un diálogo con un encabezado enfocable como nombre", () => {
  const capas = Array.from(html.matchAll(/(<section\b[^>]*\bclass="capa\b[^"]*"[^>]*>)([\s\S]*?)<\/section>/g));
  assert.ok(capas.length >= 26);
  capas.forEach(([, apertura, interior]) => {
    assert.match(apertura, /\brole="dialog"/);
    const nombre = apertura.match(/\baria-labelledby="([^"]+)"/);
    assert.ok(nombre, apertura);
    const titulo = interior.match(/<h1\b[^>]*>/);
    assert.ok(titulo, apertura);
    assert.ok(titulo[0].includes('id="' + nombre[1] + '"'), apertura);
    assert.match(titulo[0], /\btabindex="-1"/);
  });
});
