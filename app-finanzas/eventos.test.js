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

test("la duración de sesión respeta los límites enteros", () => {
  for (const n of [0, 5, 86400, null]) {
    assert.deepEqual(E.eventoSeguro("sesion", "duracion", n), { tipo: "sesion", nombre: "duracion", valor: n });
  }
  for (const n of [-1, 86401, 5.1, "5", NaN, Infinity]) {
    assert.equal(E.eventoSeguro("sesion", "duracion", n), null);
  }
  assert.equal(E.eventoSeguro("anotar", "texto", 2000), null);
});

test("acepta tiempos de carga de sesión en décimas de segundo", () => {
  assert.equal(E.decimasRespuesta(2300), 23);
  for (const valor of [0, 23, 86400]) {
    assert.deepEqual(E.eventoSeguro("sesion", "carga", valor), { tipo: "sesion", nombre: "carga", valor });
  }
  for (const valor of [-1, 86401, 2.3, "23", NaN, Infinity]) {
    assert.equal(E.eventoSeguro("sesion", "carga", valor), null);
  }
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

test("clasifica preguntas localmente y registra solo el tema fijo", () => {
  const casos = [
    ["¿En qué GASTÉ ayer?", "gastos"], ["¿Cómo puedo AHORRÁR?", "ahorro"],
    ["Quiero pagar un PRÉSTAMO", "deudas"], ["Arma un PRESUPUESTO para mis gastos", "presupuesto"],
    ["¿Cómo hago mi declaración de rénta?", "impuestos"], ["¿Me conviene una INVERSIÓN en CDT?", "inversion"],
    ["¿Cuánto gané con mi nómina?", "ingresos"], ["Hola, ¿cómo estás?", "otro"]
  ];
  for (const [pregunta, tema] of casos) {
    assert.equal(E.temaPregunta(pregunta), tema);
    assert.deepEqual(E.eventoSeguro("ia", "tema_" + tema), { tipo: "ia", nombre: "tema_" + tema, valor: null });
  }
  assert.equal(E.temaPregunta(null), "otro");
  assert.equal(E.eventoSeguro("ia", "tema_cuenta_privada"), null);
  assert.equal(E.eventoSeguro("ia", "tema_ahorro", 9), null);
});

test("clasifica preguntas generadas con el tema principal, sin usar las filas como tema", () => {
  const R = require("./respuestas");
  assert.equal(E.temaPregunta(R.preguntaGrafico("Gastos por categoría", "Hoy", "COP", [["Impuestos", 120]])), "gastos");
  assert.equal(E.temaPregunta(R.preguntaPlanPresupuesto(200, [], [], "COP")), "presupuesto");
  assert.equal(E.temaPregunta(R.preguntaSuscripciones([], "COP")), "gastos");
  assert.equal(E.temaPregunta(R.prepararLoteCategorias([], [], []).pregunta), "otro");
});

test("redondea y acota la duración de respuestas a décimas de segundo", () => {
  assert.deepEqual([0, 149, 150, 1700, 9000000].map(E.decimasRespuesta), [1, 1, 2, 17, 86400]);
  assert.deepEqual(E.eventoSeguro("ia", "respuesta_ms", 17), { tipo: "ia", nombre: "respuesta_ms", valor: 17 });
  for (const valor of [null, 0, -1, 86401, 1.5, "17", NaN]) {
    assert.equal(E.eventoSeguro("ia", "respuesta_ms", valor), null);
  }
});
