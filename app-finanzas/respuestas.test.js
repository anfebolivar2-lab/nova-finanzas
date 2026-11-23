const test = require("node:test");
const assert = require("node:assert");
const R = require("./respuestas.js");

const HOY = new Date(2026, 10, 7, 15, 0); // sábado 7 de noviembre de 2026
const m = (dia, mes, tipo, monto, cat, extra) => Object.assign({ id: dia * 100 + mes, fecha: new Date(2026, mes, dia, 12).toISOString(), tipo, monto, categoria_id: cat }, extra);
const categorias = [{ id: 1, nombre: "Comida", tipo: "gasto" }, { id: 2, nombre: "Comida rápida", tipo: "gasto" }, { id: 3, nombre: "Transporte", tipo: "gasto" }, { id: 9, nombre: "Salario", tipo: "ingreso" }];

test("periodo de la pregunta", () => {
  const p = R.periodo("¿Cuánto gasté en comida los últimos 3 meses?", HOY);
  assert.deepStrictEqual([p.desde.getMonth(), p.desde.getDate(), p.nombre], [8, 1, "los últimos 3 meses"]);
  assert.strictEqual(R.periodo("los últimos tres meses", HOY).desde.getMonth(), 8);
  assert.strictEqual(R.periodo("cuánto gasté hoy", HOY).nombre, "hoy");
  const s = R.periodo("y la semana pasada?", HOY);
  assert.deepStrictEqual([s.desde.getDate(), s.hasta.getDate()], [26, 2]); // lunes 26 de octubre a lunes 2 de noviembre
  assert.strictEqual(R.periodo("el mes pasado", HOY).desde.getMonth(), 9);
  assert.strictEqual(R.periodo("¿cuánto gasté?", HOY).nombre, "este mes");
  assert.strictEqual(R.periodo("los últimos 10 días", HOY).desde.getDate(), 29);
});

test("categoría nombrada: gana el nombre más largo", () => {
  assert.strictEqual(R.categoriaNombrada("¿cuánto en comida rápida?", categorias).id, 2);
  assert.strictEqual(R.categoriaNombrada("¿cuánto en COMIDA este mes?", categorias).id, 1);
  assert.strictEqual(R.categoriaNombrada("¿y en transportes?", categorias).id, 3);
  assert.strictEqual(R.categoriaNombrada("¿cómo ahorro más?", categorias), null);
});

test("tarjeta de una categoría en varios meses, con gráfico por mes y botón de límite", () => {
  const movs = [m(5, 10, "gasto", 20000, 1), m(1, 10, "gasto", 9000, 1), m(20, 9, "gasto", 50000, 1), m(3, 8, "gasto", 7000, 1),
    m(2, 7, "gasto", 99999, 1), m(4, 10, "gasto", 5000, 3), m(6, 10, "gasto", 70000, 1, { estado: "pendiente" }),
    m(6, 10, "gasto", 1000, 1, { transferencia: "x" }), m(5, 10, "ingreso", 2000000, 9)];
  const t = R.tarjeta("¿Cuánto gasté en comida los últimos 3 meses?", { movimientos: movs, categorias, limites: [] }, HOY);
  assert.strictEqual(t.titulo, "Comida · los últimos 3 meses");
  assert.strictEqual(t.total, 86000); // sin julio, sin el pendiente y sin la transferencia
  assert.strictEqual(t.cantidad, 4);
  assert.deepStrictEqual(t.serie.map((x) => [x.etiqueta, x.valor]), [["sept", 7000], ["oct", 50000], ["nov", 29000]]);
  assert.deepStrictEqual(t.movimientos.map((x) => x.monto), [50000, 20000, 9000, 7000]);
  assert.deepStrictEqual(t.acciones, ["limite", "buscar", "calendario"]);
  const conLimite = R.tarjeta("¿Cuánto gasté en comida?", { movimientos: movs, categorias, limites: [{ categoria_id: 1 }] }, HOY);
  assert.ok(!conLimite.acciones.includes("limite"));
});

test("tarjeta por categorías cuando pregunta en qué gasta más", () => {
  const movs = [m(2, 10, "gasto", 30000, 1), m(3, 10, "gasto", 50000, 3), m(4, 10, "gasto", 10000, 1)];
  const t = R.tarjeta("¿En qué gasto más este mes?", { movimientos: movs, categorias }, HOY);
  assert.ok(t.porCategoria);
  assert.deepStrictEqual(t.serie.map((x) => [x.etiqueta, x.valor]), [["Transporte", 50000], ["Comida", 40000]]);
  assert.ok(!t.acciones.includes("limite"));
});

test("ingresos y preguntas que no son de números", () => {
  const movs = [m(5, 10, "ingreso", 2000000, 9), m(2, 10, "gasto", 1, 1)];
  const t = R.tarjeta("¿Cuánto he ganado este mes?", { movimientos: movs, categorias }, HOY);
  assert.deepStrictEqual([t.tipo, t.total, t.titulo], ["ingreso", 2000000, "Tus ingresos · este mes"]);
  assert.strictEqual(t.serie.length, 7); // del 1 al 7 de noviembre: un grupo por día
  assert.strictEqual(R.tarjeta("¿Qué puedo hacer para ahorrar más?", { movimientos: movs, categorias }, HOY), null);
  const vacia = R.tarjeta("¿cuánto gasté en transporte hoy?", { movimientos: movs, categorias }, HOY);
  assert.deepStrictEqual([vacia.total, vacia.acciones], [0, ["limite"]]);
});

test("arma la pregunta de un gráfico con el periodo, moneda y agregados válidos", () => {
  const pregunta = R.preguntaGrafico("Gastos por categoría", "Octubre 2026", "COP", [
    ["Total", 155], ["Comida", 155], ["Sin gasto", 0], ["Fila inválida", "Texto de una nota", NaN]
  ]);
  assert.strictEqual(pregunta, "Explícame en palabras sencillas el gráfico «Gastos por categoría» (Octubre 2026). Cifras en COP.\nTotal: 155\nComida: 155\nSin gasto: 0");
});

test("abrevia preguntas de gráficos largos sin cortar ninguna cifra", () => {
  const filas = Array.from({ length: 100 }, (_, i) => ["Categoría " + i + " " + "x".repeat(150), i, i + 1]);
  const pregunta = R.preguntaGrafico("Ingresos y gastos", "12 meses", "COP", filas);
  assert.ok(pregunta.length <= 1200);
  const lineas = pregunta.split("\n");
  assert.match(lineas.shift(), /Ingresos y gastos.*12 meses/);
  assert.strictEqual(lineas.pop(), "Se omitieron algunas filas para abreviar.");
  assert.ok(lineas.length > 0 && lineas.length < filas.length);
  lineas.forEach((linea, i) => assert.ok(linea.endsWith(": " + i + " / " + (i + 1))));
});

test("el plan usa los ocho gastos más altos y los límites vigentes con su ciclo", () => {
  const gastos = Array.from({ length: 10 }, (_, i) => ({ categoria: "Categoría " + i, promedio: i * 25 }));
  const limites = [{ categoria: "General", ciclo: "Mensual", monto: 1500, nota: "Texto privado" }];
  const pregunta = R.preguntaPlanPresupuesto(2000, gastos, limites, "COP");
  assert.match(pregunta, /3 meses completos: 2000/);
  assert.match(pregunta, /Límite General \(Mensual\): 1500/);
  assert.match(pregunta, /Gasto mensual Categoría 9: 225/);
  assert.doesNotMatch(pregunta, /Categoría [01]:|Texto privado/);
  assert.equal(pregunta.split("\n").filter(l => l.startsWith("Gasto mensual")).length, 8);
  assert.equal(gastos[0].promedio, 0);
  assert.ok(R.preguntaPlanPresupuesto(2000, gastos, Array(100).fill(limites[0]), "COP").length <= 1200);
});

test("los duplicados requieren tres meses de coincidencia, montos iguales y comercios parecidos", () => {
  const cobros = [];
  for (let mes = 1; mes <= 3; mes++) {
    const fecha = "2026-0" + mes + "-04";
    ["Streaming Alfa", "Alfa Premium", "Otro comercio"].forEach(comercio => {
      cobros.push({ comercio, categoria: "Suscripciones", monto: 100, fecha, nota: "Nota privada" });
    });
  }
  cobros.push({ comercio: "Streaming Alfa", categoria: "Suscripciones", monto: 200, fecha: "2026-04-04" });
  const candidatos = R.candidatosSuscripciones(cobros);
  assert.equal(candidatos.length, 3);
  assert.deepStrictEqual(candidatos.map(c => [c.meses, c.duplicado]), [[3, true], [3, true], [3, false]]);
  const pregunta = R.preguntaSuscripciones(candidatos, "COP");
  assert.match(pregunta, /Suscripciones: 100\/mes, último 2026-03-04, 3 meses seguidos/);
  assert.doesNotMatch(pregunta, /Alfa|Otro comercio|Nota privada/);
  assert.ok(R.preguntaSuscripciones(Array(50).fill(candidatos[0]), "COP").length <= 1200);
});

test("se reconoce una racha mensual aunque cambie la variante del comercio", () => {
  const candidatos = R.candidatosSuscripciones(["Alfa básico", "Alfa pago", "Alfa"].map((comercio, i) => ({
    comercio, categoria: "Suscripciones", monto: 100, fecha: "2026-0" + (i + 1) + "-04"
  })));
  assert.equal(candidatos.length, 1);
  assert.equal(candidatos[0].meses, 3);
  assert.equal(candidatos[0].duplicado, false);
});

test("la pregunta del simulador incluye las cifras calculadas y la duración", () => {
  const pregunta = R.preguntaSimulacion("ingreso", 3, { ingresos: 800, gastos: 500, arriendo: 100, colchon: 1000 },
    { cambio: -800, ahorro: -500, mesesColchon: 2 }, "COP");
  assert.match(pregunta, /durante 3 meses/);
  assert.match(pregunta, /Ahorro simulado: -500/);
  assert.match(pregunta, /ante el déficit: 2/);
  assert.ok(pregunta.length <= 1200);
});

test("lee categorías de NOVA con flechas, viñetas, códigos o nombres completos", () => {
  const movimientos = [{ id: 20, tipo: "gasto" }, { id: 21, tipo: "ingreso" }, { id: 22, tipo: "gasto" }, { id: 23, tipo: "gasto" }];
  const opciones = categorias.map((c, i) => ({ ...c, codigo: c.tipo === "gasto" ? "G" + (i + 1) : "I1" }));
  const texto = [
    "Aquí van las sugerencias:", "- **1.** → \"comida rapida\"", "2) -> i1", "3º: Salario",
    "4 → Comida", "4 → Transporte", "5 → Comida", "0 → G1", "3.5 → G3"
  ].join("\n");
  assert.deepStrictEqual(R.leerSugerenciasCategoria(texto, movimientos, opciones), [
    { numero: 1, movimiento_id: 20, categoria_id: 2 }, { numero: 2, movimiento_id: 21, categoria_id: 9 }
  ]);
  assert.deepStrictEqual(R.leerSugerenciasCategoria("1 → Comida porque es un gasto", movimientos, opciones), []);
});

test("el lote limita la pregunta a rangos y recuentos y conserva la descripción local", () => {
  const movimientos = Array.from({ length: 24 }, (_, i) => ({
    id: i + 30, tipo: "gasto", descripcion: "Descripción privada", nota: "Nota privada", monto: 13837
  }));
  const historial = [{ ...movimientos[0], categoria_id: 1 }, { ...movimientos[1], categoria_id: 1 }];
  const lote = R.prepararLoteCategorias(movimientos, historial, categorias);
  assert.strictEqual(lote.movimientos.length, 20);
  assert.strictEqual(lote.movimientos[0].descripcion, "Descripción privada");
  assert.deepStrictEqual(lote.movimientos[0].rango, [10000, 100000]);
  assert.ok(lote.pregunta.length <= 1200);
  assert.doesNotMatch(lote.pregunta, /privada|13837|Comida|Salario/);
  assert.match(lote.pregunta, /19,20 G 1e\+4–1e\+5 G1=2/);
});
