const test = require("node:test");
const assert = require("node:assert");
const { VERSION, PAGINAS } = require("./novedades.js");

function comprobarTexto(texto) {
  assert.strictEqual(typeof texto, "string");
  assert.ok(texto.trim().length > 0);
  assert.doesNotMatch(texto, /Lukas|GarAI/);
}

test("la versión de novedades es un entero mayor que 2", () => {
  assert.ok(Number.isInteger(VERSION));
  assert.ok(VERSION > 2);
});

test("las novedades tienen entre una y cinco páginas", () => {
  assert.ok(Array.isArray(PAGINAS));
  assert.ok(PAGINAS.length >= 1 && PAGINAS.length <= 5);
});

test("cada página tiene textos válidos, títulos cortos y tres puntos", () => {
  for (const pagina of PAGINAS) {
    comprobarTexto(pagina.titulo);
    comprobarTexto(pagina.texto);
    assert.ok([...pagina.titulo].length <= 40, pagina.titulo);

    if ("iconos" in pagina) {
      assert.ok(Array.isArray(pagina.iconos));
      assert.strictEqual(pagina.iconos.length, 4);
      for (const icono of pagina.iconos) comprobarTexto(icono);
    }
    if ("pie" in pagina) comprobarTexto(pagina.pie);

    assert.ok(Array.isArray(pagina.puntos));
    assert.strictEqual(pagina.puntos.length, 3);
    for (const punto of pagina.puntos) {
      assert.ok(Array.isArray(punto));
      assert.strictEqual(punto.length, 3);
      for (const texto of punto) comprobarTexto(texto);
      assert.ok([...punto[1]].length <= 40, punto[1]);
    }
  }
});
