const test = require("node:test");
const assert = require("node:assert/strict");
const A = require("./analitica");
const { personasVisibles } = require("./dueno");

const ahora = "2026-11-02T04:30:00Z"; // Domingo 1 de noviembre en Colombia.
const dias = (n, inicio = 1) => Array.from({ length: n }, (_, i) =>
  "2026-10-" + String(inicio + i).padStart(2, "0"));

test("registros por calendario colombiano y acumulado que incluye registros anteriores al gráfico", () => {
  const personas = [
    { registro: "2026-09-05T10:00:00Z" }, { registro: "2026-10-26T05:00:00Z" },
    { registro: "2026-11-01T04:59:59Z" }, { registro: "2026-11-01T05:00:00Z" },
    { registro: "2026-11-02T04:35:00Z" }, { registro: "inválida" }, {}
  ];
  assert.deepEqual(A.nuevosPor(personas, ahora), { dia: 1, semana: 3, mes: 1 });
  assert.deepEqual(A.crecimientoAcumulado(personas, ahora, 3), [
    { dia: "2026-10-30", total: 2 }, { dia: "2026-10-31", total: 3 }, { dia: "2026-11-01", total: 4 }
  ]);
  assert.equal(A.crecimientoAcumulado([], ahora).length, 30);
});

test("actividad cuenta cada persona una vez y combina días con el último uso", () => {
  const personas = [
    { dias: ["2026-11-01", "2026-11-01"], ultimoUso: "2026-11-02T04:00:00Z" },
    { ultimoUso: "2026-10-26T05:00:00Z" }, { dias: ["2026-10-25"] },
    { dias: ["2026-10-03"] }, { dias: ["2026-10-02", "2026-11-02", "2026-10-99"] },
    { ultimoUso: "2026-11-02T04:31:00Z" }, {}
  ];
  assert.deepEqual(A.usoActivo(personas, ahora), { dau: 1, wau: 2, mau: 4, porcentaje: 25 });
});

test("retención incluye retornos tardíos y solo usa registros con tiempo suficiente", () => {
  const personas = [
    { registro: "2026-09-30", dias: ["2026-10-31"] },
    { registro: "2026-10-25", ultimoUso: "2026-10-31T06:00:00Z" },
    { registro: "2026-10-31", dias: ["2026-10-31"] },
    { registro: "2026-11-01", dias: ["2026-11-01"] }, { ultimoUso: ahora }
  ];
  assert.deepEqual(A.retencion(personas, ahora).map(r => [r.dias, r.elegibles, r.volvieron]), [
    [1, 3, 2], [7, 2, 1], [30, 1, 1]
  ]);
  assert.equal(A.retencion(personas, ahora)[1].porcentaje, 50);
});

test("cohortes de ocho lunes, con semanas 0–4 y celdas futuras vacías", () => {
  const filas = A.cohortes([
    { registro: "2026-10-19", dias: ["2026-10-18", "2026-10-19", "2026-10-26", "2026-10-26"] },
    { registro: "2026-10-24", dias: ["2026-10-23"], ultimoUso: "2026-10-29T08:00:00Z" },
    { registro: "2026-11-01" }, { registro: "2026-07-27", dias: ["2026-11-01"] }
  ], ahora);
  assert.equal(filas.length, 8);
  assert.deepEqual(filas[1], { semana: "2026-10-19", total: 2, porcentajes: [50, 100, null, null, null] });
  assert.deepEqual(filas[0].porcentajes, [0, null, null, null, null]);
  assert.deepEqual(filas[7].porcentajes, [null, null, null, null, null]);
});

test("segmentos respetan ceros explícitos, límite de 14 días y días distintos", () => {
  const cero = { movimientos: 0 };
  const riesgo = { ultimoUso: "2026-10-19T04:29:00Z" };
  const limite = { ultimoUso: "2026-10-19T04:30:00Z" };
  const fiel = { dias: dias(20, 3).concat("2026-10-03"), ultimoUso: "2026-09-01" };
  const noFiel = { dias: dias(20).concat("2026-10-03", "2026-11-03") };
  assert.deepEqual(A.segmentos([cero, riesgo, limite, fiel, noFiel, {}], ahora),
    { sinAnotar: [cero], riesgo: [riesgo], fieles: [fiel] });
  const correos = Array.from({ length: 23 }, (_, i) => ({ correo: i + "@ejemplo.test" }));
  assert.equal(A.correosSegmento(correos).correos.length, 20);
  assert.equal(A.correosSegmento(correos).restantes, 3);
});

test("etiquetas empiezan el domingo y el primer pico gana empates", () => {
  assert.deepEqual(A.etiquetasSemana(), ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"]);
  assert.equal(A.picoDe([0, 12, 12]), 1);
  assert.equal(A.picoDe([0, 0]), -1);
  assert.equal(A.picoDe(), -1);
});

test("embudo acumulativo compara con el paso anterior y exige siete días distintos", () => {
  const filas = A.embudo([
    { confirmado: true, movimientos: 1, metas: 1, dias: dias(7) },
    { confirmado: true, movimientos: 1, metas: 1, dias: dias(6).concat("2026-10-01") },
    { confirmado: true, movimientos: 1 }, { confirmado: true, metas: 1 },
    { confirmado: false, movimientos: 4, metas: 1, dias: dias(8) }
  ]);
  assert.deepEqual(filas.map(f => f.total), [5, 4, 3, 2, 1]);
  assert.deepEqual(filas.map(f => f.porcentaje), [100, 80, 75, 200 / 3, 50]);
});

test("adopción usa personas reales, separa conteos de anotaciones y aplica umbral estricto", () => {
  const personas = Array.from({ length: 20 }, (_, i) => ({ metas: i < 2 ? 3 : 0, espacios: 0, conductor: i === 0 }));
  const datos = A.adopcion(personas, { metas: 6 }, { deudas: 1, grupos: 2, documentos: 0 }, { COP: 50, USD: 8 }, { total: 5, personas: 1 });
  assert.deepEqual(datos.funciones.map(f => f.total), [2, 0, 1, 2, 0, null, 1, 1]);
  assert.deepEqual(datos.pocoUsadas.map(f => f.nombre), ["Espacios", "Deudas", "Documentos", "Modo conductor", "Fotos de recibos"]);
  assert.deepEqual(datos.monedas, [{ moneda: "USD", total: 8 }]);
  personas.push({ prueba: true, metas: 9, espacios: 5, conductor: true });
  const filtrados = A.adopcion(personas, {}, { deudas: 5 }, null, { personas: 5 });
  assert.deepEqual(filtrados.funciones.map(f => f.porcentaje), [10, 0, null, null, null, null, 5, null]);
});

test("versiones se ordenan por componentes numéricos y APK solo cuenta los dos archivos", () => {
  assert.deepEqual(A.porcentajeUltimaVersion({ "1.9": 3, "1.10": 1, "1.10.0": 2, "1.2.8": 4 }),
    { version: "1.10.0", total: 10, actualizados: 3, porcentaje: 30 });
  assert.deepEqual(A.repartoApk({ "NOVA.apk": 3, "NOVA-avanzada.apk": 1, "otro.apk": 99 }),
    { normal: 3, avanzada: 1, porcentajeNormal: 75, porcentajeAvanzada: 25 });
});

test("CSV exporta con BOM, escapa comillas, protege fórmulas y excluye datos privados y pruebas filtradas", () => {
  const cuentas = [{ correo: 'a"b@test', movimientos: 0, monto: "DATO PRIVADO" },
    { correo: "=1+1" }, { correo: "prueba@test", prueba: true }];
  const csv = A.usuariosACsv(personasVisibles(cuentas, true));
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.equal(csv.split("\r\n")[0], '\uFEFF"Correo","Registro","Último uso","Plataforma","Versión","Movimientos","Chats","Metas","Espacios"');
  assert.match(csv, /"a""b@test"/);
  assert.match(csv, /"'=1\+1"/);
  assert.doesNotMatch(csv, /prueba@test|DATO PRIVADO/);
  assert.equal(personasVisibles(cuentas, false).length, 3);
  assert.equal(A.versionesDe(personasVisibles([{ prueba: true, version: "2" }, { version: "1" }], true))["2"], undefined);
});

test("ficha cuenta días distintos y racha vigente desde hoy o ayer", () => {
  const ficha = A.fichaUsuario({
    correo: "u@test", movimientos: 4, monto: 900, ultimoUso: ahora,
    dias: ["2026-10-02", "2026-10-29", "2026-10-30", "2026-10-31", "2026-10-31", "2026-11-02"]
  }, ahora);
  assert.equal(ficha.diasActivos30, 3);
  assert.equal(ficha.racha, 3);
  assert.equal(ficha.monto, undefined);
  assert.equal(A.fichaUsuario({ dias: ["2026-10-30"] }, ahora).racha, 0);
});

test("respuestas antiguas o vacías y campos ausentes son compatibles", () => {
  assert.deepEqual(A.nuevosPor(undefined, ahora), { dia: 0, semana: 0, mes: 0 });
  assert.deepEqual(A.usoActivo([{}], ahora), { dau: 0, wau: 0, mau: 0, porcentaje: 0 });
  assert.equal(A.retencion(undefined, ahora)[0].porcentaje, null);
  assert.equal(A.embudo(undefined)[0].total, 0);
  assert.equal(A.adopcion(undefined).monedas, null);
  assert.equal(A.adopcion([{}]).funciones[0].total, null);
  assert.equal(A.porcentajeUltimaVersion(), null);
  assert.equal(A.repartoApk(), null);
  assert.equal(A.fichaUsuario({}, ahora).racha, null);
  assert.equal(A.fichaUsuario().diasActivos30, null);
});
