const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("./eventos");

test("normaliza y acepta únicamente identificadores de su tipo", () => {
  assert.deepEqual(E.eventoSeguro(" Pantalla ", "TAB  INICIO"), { tipo: "pantalla", nombre: "tab_inicio", valor: null });
  assert.deepEqual(E.eventoSeguro("recuadro", "OCULTO_TRM-DIA"), { tipo: "recuadro", nombre: "oculto_trm-dia", valor: null });
  for (const par of [["otro", "tab_inicio"], ["ia", "tab_inicio"], ["pantalla", "mi_cuenta"],
    ["anotar", "compré pan"], ["pantalla", "a".repeat(41)], ["__proto__", "pin_on"], ["ajuste", 123]]) {
    assert.equal(E.eventoSeguro(...par), null);
  }
});

test("solo duración admite segundos y respeta los límites enteros", () => {
  for (const n of [0, 5, 86400, null]) {
    assert.deepEqual(E.eventoSeguro("sesion", "duracion", n), { tipo: "sesion", nombre: "duracion", valor: n });
  }
  for (const n of [-1, 86401, 5.1, "5", NaN, Infinity]) {
    assert.equal(E.eventoSeguro("sesion", "duracion", n), null);
  }
  assert.equal(E.eventoSeguro("anotar", "texto", 2000), null);
});

test("la cola conserva los 50 eventos recientes y devuelve lotes sin mutarla", () => {
  const vacia = [];
  assert.deepEqual(E.lotesParaEnviar(vacia), []);
  const cola = Array.from({ length: 53 }, (_, i) => i).reduce((previa, segundos) =>
    E.encolar(previa, E.eventoSeguro("sesion", "duracion", segundos)), vacia);
  assert.equal(vacia.length, 0);
  assert.equal(E.encolar(cola, null), cola);
  const lotes = E.lotesParaEnviar(cola);
  assert.deepEqual(lotes.map(lote => lote.length), [25, 25]);
  assert.deepEqual(lotes.flat().map(evento => evento.valor), Array.from({ length: 50 }, (_, i) => i + 3));
  lotes[0].pop();
  assert.equal(cola.length, 50);
});
