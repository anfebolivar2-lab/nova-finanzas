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

test("compara un mes en curso con el anterior completo y cuenta personas únicas", () => {
  const fechaDatos = "2026-03-01T12:00:00Z";
  const serie = Array.from({ length: 30 }, (_, i) => ({
    dia: new Date(Date.parse("2026-01-31") + i * 86400000).toISOString().slice(0, 10),
    movimientos: 1
  }));
  const datos = {
    personas: [
      { registro: "2026-02-01T02:00:00Z", dias: ["2026-02-01", "2026-02-28", "2026-03-01"], ultimoUso: fechaDatos },
      { registro: "2026-03-01", dias: ["2026-03-01"] },
      { registro: "2026-02-10", dias: [], ultimoUso: "2026-02-11T08:00:00Z" },
      { registro: "2026-03-01", dias: ["2026-03-01"], prueba: true }
    ],
    dias: serie,
    chatsPorDia: { "2026-03-01": 3, "2026-01-01": 100 },
    errores: { total30: 2, porDia: { "2026-02-02": 2 } }
  };
  const comparativo = A.comparativoMensual(datos, fechaDatos);
  assert.equal(comparativo.mes, "2026-03");
  assert.equal(comparativo.mesAnterior, "2026-02");
  assert.deepEqual(comparativo.filas.map(f => [f.actual, f.anterior, f.cambio]), [
    [1, 2, -50], [2, 2, 0], [1, 28, -100 * 27 / 28], [3, 0, null], [0, 2, -100]
  ]);
});

test("marca períodos sin cobertura, conserva ceros válidos y cruza el cambio de año", () => {
  const fechaDatos = "2027-01-01T18:00:00Z";
  const vacio = A.comparativoMensual({}, fechaDatos);
  assert.equal(vacio.mesAnterior, "2026-12");
  assert.ok(vacio.filas.every(f => f.actual === null && f.anterior === null && f.cambio === null));

  const datos = {
    personas: [{ registro: "2027-01-01" }],
    dias: [{ dia: "2027-01-01", movimientos: 0 }],
    resumen: { chats: 0 },
    chatsPorDia: {},
    errores: { total30: 1, porDia: { "2027-01-01": 1 } }
  };
  assert.deepEqual(A.comparativoMensual(datos, fechaDatos).filas.map(f => [f.actual, f.anterior, f.cambio]), [
    [1, 0, null], [null, null, null], [0, null, null], [0, 0, null], [1, null, null]
  ]);
  assert.equal(A.comparativoMensual(datos, "2027-01-02T18:00:00Z").filas[2].actual, null);
  datos.errores.total30 = 500;
  assert.equal(A.comparativoMensual(datos, fechaDatos).filas[4].actual, null);
});

test("proyecta linealmente con un ritmo conocido y evita estimar con datos insuficientes", () => {
  assert.equal(A.proyeccionUsuarios(), null);
  assert.equal(A.proyeccionUsuarios(15), null);
  assert.equal(A.proyeccionUsuarios(15, 16), null);
  assert.deepEqual(A.proyeccionUsuarios(15, 0), [{ meses: 3, usuarios: 15 }, { meses: 6, usuarios: 15 }]);
  assert.deepEqual(A.proyeccionUsuarios(15, 4), [{ meses: 3, usuarios: 27 }, { meses: 6, usuarios: 39 }]);
});

test("calcula hitos en cero, en el umbral y después del último", () => {
  assert.equal(A.hitosUsuarios(), null);
  assert.deepEqual(A.hitosUsuarios(0).hitos.map(h => h.meta), [10, 25, 50, 100, 250, 500, 1000]);
  assert.equal(A.hitosUsuarios(0).avance, 0);
  const hitos = A.hitosUsuarios(10);
  assert.deepEqual(hitos.hitos.filter(h => h.logrado).map(h => h.meta), [10]);
  assert.deepEqual([hitos.siguiente, hitos.faltan, hitos.avance], [25, 15, 40]);
  const completos = A.hitosUsuarios(1001);
  assert.ok(completos.hitos.every(h => h.logrado));
  assert.deepEqual([completos.siguiente, completos.faltan, completos.avance], [null, 0, 100]);
});

test("valida costos locales y solo divide por una cantidad positiva de activos", () => {
  assert.deepEqual(A.costosNegocio(["", null, ""], 2), {
    valido: true, valores: [null, null, null], total: null, porActivo: null
  });
  assert.deepEqual(A.costosNegocio(["100.50", "0", ""], 2), {
    valido: true, valores: [100.5, 0, null], total: 100.5, porActivo: 50.25
  });
  assert.equal(A.costosNegocio(["0", "", ""], 2).porActivo, 0);
  assert.equal(A.costosNegocio([100, 20, 0], 0).porActivo, null);
  assert.equal(A.costosNegocio([100, 20, 0]).porActivo, null);
  for (const invalido of [-1, NaN, Infinity, "abc", " ", true]) {
    const costos = A.costosNegocio([invalido, 20, 0], 3);
    assert.deepEqual([costos.valido, costos.total, costos.porActivo], [false, null, null]);
  }
});

test("agrega estadísticas al CSV existente sin volcar costos, correos extra ni montos", () => {
  const personas = [{ correo: "dueno@correo.co", registro: "2026-10-01", monto: "monto privado" }];
  const comparativo = A.comparativoMensual({ personas }, ahora);
  const csv = A.usuariosACsv(personas, {
    comparativo, proyeccion: A.proyeccionUsuarios(10, 2), hitos: A.hitosUsuarios(10),
    costos: { total: "costo privado" }
  });
  assert.ok(csv.startsWith(A.usuariosACsv(personas)));
  assert.match(csv, /"Registros nuevos","0","1","-100"/);
  assert.match(csv, /"Movimientos anotados","sin dato","sin dato",""/);
  assert.match(csv, /"6 meses","22"/);
  assert.match(csv, /"10","Logrado",""/);
  assert.match(csv, /"25","Pendiente","15"/);
  assert.equal(csv.match(/dueno@correo\.co/g).length, 1);
  assert.doesNotMatch(csv, /privado/);
  const sinDatos = A.usuariosACsv([], { comparativo });
  assert.match(sinDatos, /"Proyección estimada","Usuarios"\r\n"sin dato"/);
  assert.match(sinDatos, /"Hitos \(usuarios\)"[^\r]+\r\n"sin dato"/);
});

test("uso distingue estadísticas no disponibles de una ventana vacía", () => {
  assert.equal(A.prepararUso(null, ahora), null);
  assert.deepEqual(A.prepararUso({ totalEventos: 0 }, ahora), { total: 0 });
});

test("uso prepara una sola pantalla, un día de IA y sesiones con segundos fraccionarios", () => {
  const fuente = {
    totalEventos: 3,
    pantallas: [{ nombre: "tab_inicio", total: 1, personas: 1 }],
    iaPorDia: { "2026-11-02": 1 },
    ia: { pregunta_voz: 1 },
    sesion: { n: 1, promedioSeg: 7, medianaSeg: 7.5 }
  };
  const uso = A.prepararUso(fuente, ahora);
  assert.deepEqual(uso.pantallas, [{ id: "tab_inicio", nombre: "tab_inicio", total: 1, personas: 1, porcentaje: 100 }]);
  assert.deepEqual(uso.sesion, fuente.sesion);
  assert.equal(uso.ia.find(fila => fila.nombre === "Consultas por voz").total, 1);
  assert.deepEqual(uso.dias.at(-1), { dia: "2026-11-02", total: 1 });
  assert.equal(uso.dias.reduce((total, fila) => total + fila.total, 0), 1);
});

test("uso prepara barras con cero eventos por grupo sin dividir por cero", () => {
  const uso = A.prepararUso({ totalEventos: 1, seguridad: { personas: 1 } }, ahora);
  assert.deepEqual(uso.pantallas, []);
  assert.deepEqual(uso.dias, []);
  assert.equal(uso.personasSeguridad, 1);
  assert.deepEqual(uso.sesion, { n: 0, promedioSeg: 0, medianaSeg: 0 });
  for (const grupo of [uso.anotar, uso.ia, uso.tema, uso.seguridad]) {
    assert.ok(grupo.every(fila => fila.total === 0 && fila.porcentaje === 0));
  }
});

test("prepara la analítica de IA vacía y evita barras sin una base positiva", () => {
  const vacio = { rapidez: null, temas: [], top: [] };
  assert.deepEqual(A.prepararIA(null), vacio);
  assert.deepEqual(A.prepararIA({
    iaRapidez: { n: 0, promedioMs: 0, medianaMs: 0, p90Ms: 0 },
    iaTemas: [{ nombre: "tema_ahorro", total: 0 }],
    iaTop: [{ correo: "ana@correo.test", preguntas: 0 }]
  }), vacio);
  assert.deepEqual(A.cupoIAPorDia(null, ahora, 7), []);
  assert.deepEqual(A.cupoIAPorDia({}, ahora, 7).map(fila => fila.total), Array(7).fill(0));
});

test("muestra una respuesta, escala temas y limita el ranking a cinco correos reales", () => {
  const uso = A.prepararIA({
    iaRapidez: { n: 1, promedioMs: 1700, medianaMs: 1700, p90Ms: 1700 },
    iaTemas: [{ nombre: "tema_deudas", total: 1 }, { nombre: "tema_ahorro", total: 4 },
      { nombre: "texto confidencial", total: 99 }],
    iaTop: [{ correo: "demo@EXAMPLE.COM", preguntas: 99 }].concat(
      Array.from({ length: 6 }, (_, i) => ({ correo: i + "@correo.test", preguntas: i + 1, texto: "privado" }))
    )
  });
  assert.deepEqual(uso.rapidez, { n: 1, promedioSeg: 1.7, medianaSeg: 1.7, p90Seg: 1.7 });
  assert.deepEqual(uso.temas, [{ nombre: "Ahorro", total: 4, porcentaje: 100 }, { nombre: "Deudas", total: 1, porcentaje: 25 }]);
  assert.deepEqual(uso.top, [6, 5, 4, 3, 2].map(n => ({ nombre: (n - 1) + "@correo.test", total: n })));
});

test("agrupa el cupo en el rango elegido según UTC y completa días sin errores", () => {
  const cupo = { "2026-10-26": 8, "2026-11-02": 1, "2026-11-03": 10 };
  const semana = A.cupoIAPorDia(cupo, ahora, 7);
  assert.deepEqual(semana[0], { dia: "2026-10-27", total: 0 });
  assert.deepEqual(semana.at(-1), { dia: "2026-11-02", total: 1 });
  assert.equal(semana.reduce((suma, fila) => suma + fila.total, 0), 1);
  for (const rango of [14, 30]) {
    const serie = A.cupoIAPorDia(cupo, ahora, rango);
    assert.equal(serie.length, rango);
    assert.equal(serie.reduce((suma, fila) => suma + fila.total, 0), 9);
  }
});

test("prepara atribución vacía para respuestas sin datos", () => {
  assert.deepEqual(A.prepararAtribucion(), { origenes: [], total: 0, top: [] });
  assert.deepEqual(A.prepararAtribucion({ origenes: [], referidos: {} }), A.prepararAtribucion());
});

test("muestra un solo origen con barra completa y el referido en la ficha", () => {
  const top = [{ correo: "ana@nova.test", invitados: 1 }];
  assert.deepEqual(A.prepararAtribucion({ origenes: [{ nombre: "qr", total: 2 }], referidos: { total: 1, top } }), {
    origenes: [{ nombre: "Código QR", total: 2, porcentaje: 100 }],
    total: 1,
    top
  });
  const ficha = A.fichaUsuario({ origen: "whatsapp", referidoPor: top[0].correo }, ahora);
  assert.equal(ficha.origen, "WhatsApp");
  assert.equal(ficha.referidoPor, top[0].correo);
  assert.equal(A.fichaUsuario({ origen: "constructor" }, ahora).origen, "constructor");
  assert.deepEqual(A.enlacesOrigen("https://nova.test/").map((fila) => fila.url), [
    "https://nova.test/?o=qr", "https://nova.test/?o=whatsapp", "https://nova.test/?o=instagram",
    "https://nova.test/?o=facebook", "https://nova.test/?o=tiktok", "https://nova.test/?o=amigos"
  ]);
});
