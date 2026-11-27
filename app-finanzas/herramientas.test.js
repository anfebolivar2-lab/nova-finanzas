const test = require("node:test");
const assert = require("node:assert/strict");
const { simular, actualizarNotas, enNoMolestar, horaAviso, referenciaAvisos, gastoAltoDelDia,
  fechaDeMeta, alcanzaDeseo, gastosHormigaTop, repartirGasto, repartoSugerido,
  categoriaSugeridaPorComercio, cuotasVsIngresos } = require("./herramientas");

var ahoraCuotas = new Date(2026, 10, 26, 12);
var categoriasCuotas = [{ id: 1, nombre: "Deudas" }, { id: 2, nombre: "Mercado" }];
var ingresoCuotas = { tipo: "ingreso", monto: 100000, fecha: "2026-11-01" };
var abonoCuotas = { tipo: "gasto", monto: 30000, categoria_id: 1, fecha: "2026-11-15", etiquetas: ["deuda"] };

test("las cuotas sin ingresos no tienen porcentaje ni aviso", function () {
  assert.deepEqual(cuotasVsIngresos([abonoCuotas], categoriasCuotas, ahoraCuotas),
    { ingresos: 0, cuotas: 30000, porcentaje: null, supera: false });
});

test("las cuotas justo en el 30 % no superan el umbral", function () {
  assert.deepEqual(cuotasVsIngresos([ingresoCuotas, abonoCuotas], categoriasCuotas, ahoraCuotas),
    { ingresos: 100000, cuotas: 30000, porcentaje: 30, supera: false });
});

test("las cuotas por encima del 30 % generan aviso y el umbral se puede cambiar", function () {
  var movimientos = [ingresoCuotas, Object.assign({}, abonoCuotas, { monto: 40000 })];
  assert.deepEqual(cuotasVsIngresos(movimientos, categoriasCuotas, ahoraCuotas),
    { ingresos: 100000, cuotas: 40000, porcentaje: 40, supera: true });
  assert.equal(cuotasVsIngresos(movimientos, categoriasCuotas, ahoraCuotas, { umbral: 0.40 }).supera, false);
});

test("las cuotas ignoran otras categorías, otros meses y transferencias", function () {
  var movimientos = [ingresoCuotas, abonoCuotas,
    Object.assign({}, abonoCuotas, { categoria_id: 2 }),
    Object.assign({}, abonoCuotas, { fecha: "2026-10-31" }),
    Object.assign({}, ingresoCuotas, { fecha: "2026-12-01" }),
    Object.assign({}, abonoCuotas, { transferencia: true }),
    Object.assign({}, ingresoCuotas, { transferencia: true })];
  assert.deepEqual(cuotasVsIngresos(movimientos, categoriasCuotas, ahoraCuotas),
    { ingresos: 100000, cuotas: 30000, porcentaje: 30, supera: false });
});

test("valida la suma del reparto y devuelve lo que falta o sobra", () => {
  assert.deepEqual(repartirGasto(100, [40, 60]), { ok: true, resto: 0, partes: [40, 60] });
  assert.deepEqual(repartirGasto(100, [40, 59]), { ok: false, resto: 1, partes: [40, 59] });
  assert.equal(repartirGasto(100, [40, 61]).resto, -1);
  assert.equal(repartirGasto(0.3, [0.1, 0.2]).ok, true);
});

test("rechaza repartos que tienen valores inválidos o un número inválido de partes", () => {
  for (const partes of [[100], [0, 100], [-1, 101], ["40", 60], [NaN, 100], [50.001, 49.999],
    [100, , 0], [94, 1, 1, 1, 1, 1, 1]]) {
    assert.equal(repartirGasto(100, partes).ok, false);
  }
});

test("la primera parte sugerida se queda con el resto", () => {
  assert.deepEqual(repartoSugerido(100, 3), [34, 33, 33]);
  assert.deepEqual(repartoSugerido(100.01, 2), [50.01, 50]);
});

const gastoComercio = (descripcion, categoria_id, extra) => ({ descripcion, categoria_id, tipo: "gasto", ...extra });

test("encuentra por primera palabra y exige al menos dos gastos del comercio", () => {
  const uno = gastoComercio("Rappi domicilio", 1);
  const dos = gastoComercio("rappi", 1);
  assert.deepEqual(categoriaSugeridaPorComercio("RAPPI", [uno, dos]), { categoria_id: 1, veces: 2, total: 2 });
  assert.equal(categoriaSugeridaPorComercio("RAPPI", [uno]), null);
  assert.equal(categoriaSugeridaPorComercio("RAPPI DOMICILIO", [uno, dos]), null);
});

test("ignora ingresos, borrados y gastos sin categoría, y acepta exactamente el 60 %", () => {
  const historial = [1, 1, 1, 2, 2].map((id) => gastoComercio("Café  del Sol!", id));
  historial.push(gastoComercio("Café del Sol", 2, { tipo: "ingreso" }),
    gastoComercio("Café del Sol", 2, { borrado: true }), gastoComercio("Café del Sol", null));
  assert.deepEqual(categoriaSugeridaPorComercio("  cafe del sol ", historial), { categoria_id: 1, veces: 3, total: 5 });
  assert.equal(categoriaSugeridaPorComercio("cafe del sol", historial.slice(1)), null);
  assert.equal(categoriaSugeridaPorComercio("  ", historial), null);
});

test("calcula la fecha de la meta con el aporte exacto, el ahorro previo y el redondeo", () => {
  const hoy = new Date(2026, 0, 15);
  assert.deepEqual(fechaDeMeta(1000000, 0, 250000, hoy), { meses: 4, fecha: "2026-05-15" });
  assert.deepEqual(fechaDeMeta(1000000, 500000, 250000, hoy), { meses: 2, fecha: "2026-03-15" });
  assert.deepEqual(fechaDeMeta(1000000, 499999, 250000, hoy), { meses: 3, fecha: "2026-04-15" });
});

test("la fecha de la meta respeta el último día del mes y el cambio de año", () => {
  assert.deepEqual(fechaDeMeta(10, 0, 11, new Date(2026, 0, 31)), { meses: 1, fecha: "2026-02-28" });
  assert.deepEqual(fechaDeMeta(10, 0, 11, "2026-01-31"), { meses: 1, fecha: "2026-02-28" });
  assert.deepEqual(fechaDeMeta(10, 0, 10, new Date(2028, 0, 31)), { meses: 1, fecha: "2028-02-29" });
  assert.deepEqual(fechaDeMeta(10, 0, 10, new Date(2026, 11, 31)), { meses: 1, fecha: "2027-01-31" });
});

test("la fecha de la meta queda vacía con aporte inválido, meta cumplida o más de 600 meses", () => {
  const hoy = new Date(2026, 0, 15);
  for (const aporte of [0, -1, NaN, Infinity]) assert.equal(fechaDeMeta(100, 0, aporte, hoy), null);
  assert.equal(fechaDeMeta(100, 100, 10, hoy), null);
  assert.equal(fechaDeMeta(601, 0, 1, hoy), null);
  assert.equal(fechaDeMeta(600, 0, 1, hoy).meses, 600);
});

test("calcula cuánto falta para un deseo y estima meses solo con un ritmo válido", () => {
  assert.deepEqual(alcanzaDeseo(100, 100, 10), { alcanza: true, falta: 0, meses: null });
  assert.deepEqual(alcanzaDeseo(100, 25, 30), { alcanza: false, falta: 75, meses: 3 });
  for (const ritmo of [null, 0, -5, NaN, Infinity]) {
    assert.deepEqual(alcanzaDeseo(100, 50, ritmo), { alcanza: false, falta: 50, meses: null });
  }
  assert.deepEqual(alcanzaDeseo(100, NaN, 50), { alcanza: false, falta: 100, meses: 2 });
  assert.deepEqual(alcanzaDeseo(100, -10, 50), { alcanza: false, falta: 110, meses: 3 });
  assert.deepEqual(alcanzaDeseo(-1, 0, 50), { alcanza: true, falta: 0, meses: null });
});

test("agrupa gastos hormiga del mes por nombre y filtra movimientos que no cuentan", () => {
  const gasto = { tipo: "gasto", fecha: "2026-05-01", monto: 20000, descripcion: "Café con leche" };
  const variaciones = [
    { descripcion: " CAFE   CON LECHE " },
    { descripcion: "cafe con LECHE", moneda: "USD", tasa: 4000, monto_original: 5 },
    { monto: 20001 }, { fecha: "2026-04-30" }, { transferencia: true }, { etiquetas: ["deuda"] },
    { borrado: true }, { estado: "borrado" }, { tipo: "ingreso" }, { moneda: "USD" }
  ];
  const movimientos = [gasto, ...variaciones.map(m => ({ ...gasto, ...m })),
    { ...gasto, descripcion: "Otro" }, { ...gasto, descripcion: "Otro" }];
  const hoy = new Date(2026, 4, 31);
  assert.deepEqual(gastosHormigaTop(movimientos, hoy), [{ nombre: "Café con leche", veces: 3, total: 60000 }]);
  assert.deepEqual(gastosHormigaTop(movimientos, hoy, { tope: 19999 }), []);
  assert.deepEqual(gastosHormigaTop([], hoy), []);
});

test("ordena los gastos hormiga por total y frecuencia, usa la categoría y devuelve hasta tres", () => {
  const compras = (descripcion, veces, monto) => Array.from({ length: veces }, () => ({
    descripcion, monto, tipo: "gasto", fecha: "2026-05-01", categoria_id: 3
  }));
  const movimientos = [...compras("Pan", 3, 4), ...compras("Bus", 4, 3), ...compras("", 3, 5), ...compras("Agua", 3, 1)];
  assert.deepEqual(gastosHormigaTop(movimientos, new Date(2026, 4, 31), { nombreCategoria: () => "Domicilios" }), [
    { nombre: "Domicilios", veces: 3, total: 15 },
    { nombre: "Bus", veces: 4, total: 12 },
    { nombre: "Pan", veces: 3, total: 12 }
  ]);
});

test("simula los tres escenarios y calcula el colchón solo si hay déficit", () => {
  const base = { ingresos: 1000, ingresoPrincipal: 600, gastos: 800, arriendo: 500, colchon: 1600 };
  assert.deepEqual(simular("arriendo", 20, base), { cambio: -100, ahorro: 100, mesesColchon: null, duracion: null });
  assert.deepEqual(simular("ingreso", 3, base), { cambio: -600, ahorro: -400, mesesColchon: 4, duracion: 3 });
  assert.deepEqual(simular("gasto", 400, base), { cambio: -400, ahorro: -200, mesesColchon: 8, duracion: null });
  assert.equal(simular("gasto", 200, base).mesesColchon, null);
  assert.equal(simular("gasto", 400, { ...base, colchon: 0 }).mesesColchon, 0);
  assert.equal(simular("ingreso", 1.5, base), null);
  assert.equal(simular("gasto", -1, base), null);
  assert.equal(simular("arriendo", 20, { ...base, arriendo: 0 }), null);
});

test("las notas se guardan de forma inmutable con un máximo de 50 y se borran por id", () => {
  const nota = { id: "nueva", texto: "Resumen de NOVA", fecha: "2026-09-02T15:00:00Z" };
  const anteriores = Array.from({ length: 50 }, (_, i) => ({ ...nota, id: String(i) }));
  const nuevas = actualizarNotas(anteriores, { nota });
  assert.equal(anteriores[0].id, "0");
  assert.equal(nuevas[0], nota);
  assert.equal(nuevas.length, 50);
  assert.equal(nuevas[49].id, "48");
  assert.deepEqual(actualizarNotas(nuevas, { borrar: "nueva" }), anteriores.slice(0, 49));
  assert.deepEqual(actualizarNotas({ corrompido: true }), []);
});

function fecha(dia, hora, minuto = 0) { return new Date(2026, 8, dia, hora, minuto); }

test("No molestar incluye el inicio y excluye el fin, incluso al cruzar medianoche", () => {
  const noche = { activo: true };
  assert.equal(enNoMolestar(fecha(1, 21, 59), noche), false);
  assert.equal(enNoMolestar(fecha(1, 22), noche), true);
  assert.equal(enNoMolestar(fecha(2, 0), noche), true);
  assert.equal(enNoMolestar(fecha(2, 6, 59), noche), true);
  assert.equal(enNoMolestar(fecha(2, 7), noche), false);
  assert.equal(enNoMolestar(fecha(1, 22), { activo: false }), false);
  assert.deepEqual(horaAviso(fecha(1, 22), noche), fecha(2, 7));
  assert.deepEqual(horaAviso(fecha(2, 1), noche), fecha(2, 7));
  assert.deepEqual(horaAviso(fecha(1, 19), noche), fecha(1, 19));
  assert.deepEqual(referenciaAvisos(fecha(2, 1), noche), new Date(fecha(1, 22).getTime() - 1));
});

test("No molestar también permite tramos diurnos y horas iguales", () => {
  const tarde = { activo: true, inicio: "14:15", fin: "16:30" };
  assert.equal(enNoMolestar(fecha(1, 14, 14), tarde), false);
  assert.equal(enNoMolestar(fecha(1, 14, 15), tarde), true);
  assert.deepEqual(horaAviso(fecha(1, 15), tarde), fecha(1, 16, 30));
  assert.equal(enNoMolestar(fecha(1, 16, 30), tarde), false);
  assert.equal(enNoMolestar(fecha(1, 14, 15), { ...tarde, fin: tarde.inicio }), false);
});

function gasto(dia, monto, cambios = {}) {
  return { tipo: "gasto", fecha: fecha(dia, 12).toISOString(), monto, ...cambios };
}

const historial = [1, 3, 5, 7, 9].map(dia => gasto(dia, 25000));

test("el gasto alto necesita cinco días anteriores con gastos, aunque haya varios el mismo día", () => {
  const cuatroDias = historial.slice(0, 4);
  assert.equal(gastoAltoDelDia([...cuatroDias, gasto(1, 25000), gasto(20, 90000)], fecha(20, 13)), null);
});

test("el gasto alto respeta el mínimo y el factor, incluido el límite exacto", () => {
  const evaluar = (monto, opciones) => gastoAltoDelDia([...historial, gasto(20, monto)], fecha(20, 13), opciones);
  assert.equal(evaluar(49999), null);
  assert.equal(evaluar(48000, { minimo: 45000 }), null);
  assert.deepEqual(evaluar(50000), { total: 50000, promedio: 25000, veces: 2 });
  assert.deepEqual(evaluar(51500), { total: 51500, promedio: 25000, veces: 2.1 });
  assert.equal(evaluar(51500, { factor: 2.2 }), null);
  assert.equal(evaluar(52000, { ultimoAviso: "2026-09-20" }), null);
});

test("promedia solo los días con gastos válidos de los últimos 30 días y suma los gastos de hoy", () => {
  const movimientos = [
    ...historial, gasto(-10, 25000), gasto(-11, 900000), gasto(21, 900000),
    gasto(2, 900000, { tipo: "ingreso" }), gasto(2, 900000, { transferencia: "entre-cuentas" }),
    gasto(20, 900000, { etiquetas: ["deuda"] }), gasto(2, 900000, { borrado: true }),
    gasto(20, 900000, { moneda: "USD" }), gasto(20, 40000),
    gasto(20, 12000, { moneda: "USD", tasa: 4000, monto_original: 3 })
  ];
  assert.deepEqual(gastoAltoDelDia(movimientos, fecha(20, 13)), { total: 52000, promedio: 25000, veces: 2.1 });
});

test("a medianoche cambia el total local y vuelve a permitir un aviso", () => {
  const ayer = gasto(20, 55000, { fecha: fecha(20, 23, 59).toISOString() });
  const hoy = gasto(21, 60000, { fecha: fecha(21, 0).toISOString() });
  const opciones = { ultimoAviso: "2026-09-20" };
  assert.deepEqual(gastoAltoDelDia([...historial, ayer], fecha(20, 23, 59)), { total: 55000, promedio: 25000, veces: 2.2 });
  assert.equal(gastoAltoDelDia([...historial, ayer], fecha(20, 23, 59), opciones), null);
  assert.equal(gastoAltoDelDia([...historial, ayer], fecha(21, 0), opciones), null);
  assert.deepEqual(gastoAltoDelDia([...historial, ayer, hoy], fecha(21, 0), opciones), { total: 60000, promedio: 30000, veces: 2 });
});
