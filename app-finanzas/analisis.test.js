const test = require("node:test");
const assert = require("node:assert");
const A = require("./analisis.js");

const HOY = new Date(2026, 9, 29, 15, 0); // jueves 29 de octubre de 2026
const m = (dia, mes, tipo, monto, extra) => Object.assign({ fecha: new Date(2026, mes, dia, 12).toISOString(), tipo, monto }, extra);

test("desplazar y nombrar periodos", () => {
  assert.strictEqual(A.nombrePeriodo("mensual", A.desplazar("mensual", HOY, 0)), "Octubre 2026");
  assert.strictEqual(A.nombrePeriodo("mensual", A.desplazar("mensual", HOY, -10)), "Diciembre 2025");
  assert.strictEqual(A.nombrePeriodo("quincenal", A.desplazar("quincenal", HOY, -1)), "1–15 oct 2026");
  assert.strictEqual(A.nombrePeriodo("trimestral", A.desplazar("trimestral", HOY, 1)), "Trimestre 1 · 2027");
  assert.strictEqual(A.nombrePeriodo("semanal", A.desplazar("semanal", HOY, 0)), "26 oct – 1 nov 2026");
});

test("vista rápida", () => {
  const movs = [m(1, 9, "gasto", 30000, { categoria_id: 1 }), m(6, 9, "gasto", 60000, { categoria_id: 2 }), m(13, 9, "gasto", 9000, { categoria_id: 2 }),
    m(2, 8, "gasto", 50000, { categoria_id: 1 }), m(5, 9, "ingreso", 1000000)];
  const v = A.vistaRapida(movs, "mensual", HOY, HOY);
  assert.strictEqual(v.gastos, 99000);
  assert.strictEqual(Math.round(v.promedioDiario), Math.round(99000 / 29));
  assert.strictEqual(v.categoriaTop, 2);
  assert.strictEqual(v.diaTop, "Martes"); // 6 y 13 de octubre de 2026 son martes
  assert.strictEqual(Math.round(v.vsAnterior), 98);
});

test("serie, proyección y seguro para gastar", () => {
  const movs = [m(5, 9, "ingreso", 900000), m(6, 9, "gasto", 300000), m(6, 8, "gasto", 100000)];
  const s = A.serie(movs, "mensual", HOY, 3);
  assert.deepStrictEqual(s.map((x) => [x.etiqueta, x.ingresos, x.gastos]), [["ago", 0, 0], ["sept", 0, 100000], ["oct", 900000, 300000]]);
  const p = A.proyeccion(movs, 500000, HOY);
  assert.deepStrictEqual(p.map((x) => x.saldo), [500000, 666667, 833333, 1000000]);
  const seguro = A.seguroParaGastar(1000000, 400000, { desde: new Date(2026, 9, 1), hasta: new Date(2026, 10, 1) }, HOY);
  assert.strictEqual(seguro.dias, 3);
  assert.strictEqual(seguro.porDia, 200000);
});

test("agrupar por día con nombres", () => {
  const movs = [m(29, 9, "gasto", 5000), m(29, 9, "ingreso", 20000), m(28, 9, "gasto", 1000), m(5, 9, "gasto", 7000)];
  const g = A.porDia(movs, HOY);
  assert.deepStrictEqual(g.map((x) => [x.nombre, x.neto, x.movimientos.length]), [["Hoy", 15000, 2], ["Ayer", -1000, 1], ["Lunes, 5 oct", -7000, 1]]);
});

test("buscar por texto, categoría, etiqueta y fechas", () => {
  const movs = [
    m(3, 9, "gasto", 8000, { descripcion: "Café", categoria_id: 1, etiquetas: ["trabajo"] }),
    m(4, 9, "gasto", 50000, { descripcion: "Mercado", categoria_id: 2, nota: "frutas y verduras" }),
    m(20, 9, "ingreso", 900000, { descripcion: "Sueldo", categoria_id: 3, estado: "pendiente" })
  ];
  const nombre = (id) => ({ 1: "Comida", 2: "Mercado", 3: "Salario" })[id];
  assert.deepStrictEqual(A.buscar(movs, { texto: "cafe" }, nombre).map((x) => x.descripcion), ["Café"]);
  assert.deepStrictEqual(A.buscar(movs, { texto: "comida" }, nombre).map((x) => x.descripcion), ["Café"]);
  assert.deepStrictEqual(A.buscar(movs, { texto: "verduras" }, nombre).map((x) => x.descripcion), ["Mercado"]);
  assert.deepStrictEqual(A.buscar(movs, { texto: "#trabajo" }, nombre).map((x) => x.descripcion), ["Café"]);
  assert.deepStrictEqual(A.buscar(movs, { tipo: "gasto", orden: "mayor" }, nombre).map((x) => x.descripcion), ["Mercado", "Café"]);
  assert.deepStrictEqual(A.buscar(movs, { desde: "2026-10-04", hasta: "2026-10-20" }, nombre).map((x) => x.descripcion), ["Sueldo", "Mercado"]);
  assert.deepStrictEqual(A.buscar(movs, { estado: "pendiente" }, nombre).map((x) => x.descripcion), ["Sueldo"]);
});

test("calculadora", () => {
  assert.strictEqual(A.evaluar("55.000"), 55000);
  assert.strictEqual(A.evaluar("20.000+5.000×2"), 30000);
  assert.strictEqual(A.evaluar("100.000÷4−5.000"), 20000);
  assert.strictEqual(A.evaluar("1,5"), 1.5);
  assert.ok(isNaN(A.evaluar("20+")));
  assert.ok(isNaN(A.evaluar("5/0")));
  assert.ok(isNaN(A.evaluar("alert(1)")));
});

test("programados: siguiente fecha y pendientes", () => {
  assert.strictEqual(A.siguienteFecha("2026-01-31", "mensual"), "2026-02-28");
  assert.strictEqual(A.siguienteFecha("2026-10-25", "semanal"), "2026-11-01");
  assert.strictEqual(A.siguienteFecha("2024-02-29", "anual"), "2025-02-28");
  const p = A.fechasPendientes({ proxima: "2026-10-15", frecuencia: "semanal", activo: true }, HOY);
  assert.deepStrictEqual(p.fechas, ["2026-10-15", "2026-10-22", "2026-10-29"]);
  assert.strictEqual(p.proxima, "2026-11-05");
  assert.deepStrictEqual(A.fechasPendientes({ proxima: "2026-10-15", frecuencia: "diaria", activo: false }, HOY).fechas, []);
});

test("grupos y CSV", () => {
  assert.strictEqual(A.grupoDe({ nombre: "Educación", tipo: "gasto" }), "Estilo de Vida");
  assert.strictEqual(A.grupoDe({ nombre: "Moto", tipo: "gasto" }), "Otros");
  assert.strictEqual(A.grupoDe({ nombre: "Moto", tipo: "gasto", grupo: "Transporte" }), "Transporte");
  const texto = A.csv([{ a: "x;y", b: "=SUMA(1)" }, { a: 5, b: ["t1", "t2"] }], [{ titulo: "A", valor: (f) => f.a }, { titulo: "B", valor: (f) => f.b }]);
  assert.strictEqual(texto, '﻿A;B\r\n"x;y";\'=SUMA(1)\r\n5;t1 t2');
});

// ---------- Modo conductor ----------
const CATS = A.CATEGORIAS_CONDUCTOR.map((c, i) => Object.assign({ id: i + 1 }, c));
const id = (n) => CATS.find((c) => c.nombre === n).id;
const mv = (dia, mes, tipo, monto, cat, extra) => Object.assign({ fecha: new Date(2026, mes, dia, 12).toISOString(), tipo, monto, categoria_id: id(cat) }, extra);

test("categorías del conductor traen su grupo", () => {
  assert.ok(A.esGanancia(CATS.find((c) => c.nombre === "Didi")));
  assert.ok(!A.esGanancia(CATS.find((c) => c.nombre === "Gasolina")));
  assert.ok(A.esGastoTrabajo(CATS.find((c) => c.nombre === "Tecnomecánica")));
  assert.ok(!A.esGastoTrabajo(null));
  assert.ok(A.GRUPOS.ingreso.includes("Apps de transporte") && A.GRUPOS.gasto.includes("Trabajo con vehículo"));
  assert.strictEqual(new Set(CATS.map((c) => c.nombre)).size, CATS.length);
});

test("resumen del trabajo: ganado, gastado, neto, viajes y por plataforma", () => {
  const movs = [
    mv(29, 9, "ingreso", 80000, "Didi", { viajes: 6 }), mv(29, 9, "ingreso", 50000, "Uber", { viajes: 3 }), mv(29, 9, "ingreso", 20000, "Didi", { viajes: 2 }),
    mv(29, 9, "gasto", 30000, "Gasolina"), mv(29, 9, "gasto", 3000, "Tinto y comida en ruta"),
    mv(29, 9, "gasto", 9999, "Gasolina", { estado: "pendiente" }), // pendiente: no cuenta
    mv(28, 9, "ingreso", 70000, "Didi", { viajes: 5 }), // ayer
    { fecha: HOY.toISOString(), tipo: "gasto", monto: 15000, categoria_id: 999 } // categoría personal: no es del trabajo
  ];
  const hoy = A.resumenTrabajo(movs, CATS, A.rangoJornada("hoy", HOY));
  assert.deepStrictEqual([hoy.ingresos, hoy.gastos, hoy.neto, hoy.viajes], [150000, 33000, 117000, 11]);
  assert.deepStrictEqual(hoy.porPlataforma.map((p) => [p.id, p.total, p.viajes]), [[id("Didi"), 100000, 8], [id("Uber"), 50000, 3]]);
  assert.deepStrictEqual(hoy.gastosPorCategoria.map((g) => g.total), [30000, 3000]);
  assert.strictEqual(Math.round(hoy.porViaje), 13636);
  assert.deepStrictEqual([hoy.operacion, hoy.fijos, hoy.netoOperativo], [33000, 0, 117000]);
  const conSoat = A.resumenTrabajo(movs.concat([mv(29, 9, "gasto", 480000, "SOAT")]), CATS, A.rangoJornada("hoy", HOY));
  assert.deepStrictEqual([conSoat.operacion, conSoat.fijos, conSoat.netoOperativo, conSoat.neto, conSoat.gastos], [33000, 480000, 117000, -363000, 513000], "el SOAT no baja la ganancia del día");
  assert.ok(A.esFijo(CATS.find((c) => c.nombre === "Cuota del vehículo")) && !A.esFijo(CATS.find((c) => c.nombre === "Gasolina")));
  const semana = A.resumenTrabajo(movs, CATS, A.rangoJornada("semana", HOY));
  assert.strictEqual(semana.ingresos, 220000);
  assert.strictEqual(A.resumenTrabajo([], CATS, A.rangoJornada("mes", HOY)).porViaje, null);
});

test("rangos de la jornada", () => {
  const r = A.rangoJornada("semana", HOY); // jueves 29 oct 2026
  assert.strictEqual(A.claveDia(r.desde), "2026-10-26");
  assert.strictEqual(A.claveDia(r.hasta), "2026-11-02");
  assert.strictEqual(A.claveDia(A.rangoJornada("mes", HOY).hasta), "2026-11-01");
  assert.strictEqual(A.claveDia(A.rangoJornada("hoy", HOY).hasta), "2026-10-30");
});

test("vencimientos: estado, texto y renovación", () => {
  const d = (vence, extra) => Object.assign({ vence, aviso_dias: 30, repetir_meses: 12 }, extra);
  assert.deepStrictEqual(A.estadoDocumento(d("2026-11-10"), HOY), { dias: 12, estado: "pronto", texto: "Vence en 12 días" });
  assert.strictEqual(A.estadoDocumento(d("2026-10-29"), HOY).texto, "Vence hoy");
  assert.strictEqual(A.estadoDocumento(d("2026-10-30"), HOY).texto, "Vence mañana");
  assert.deepStrictEqual(A.estadoDocumento(d("2026-10-20"), HOY), { dias: -9, estado: "vencido", texto: "Venció hace 9 días" });
  assert.strictEqual(A.estadoDocumento(d("2027-03-01"), HOY).estado, "ok");
  assert.strictEqual(A.estadoDocumento(d("2026-11-20", { aviso_dias: 7 }), HOY).estado, "ok");
  assert.strictEqual(A.sumarMeses("2026-01-31", 1), "2026-02-28");
  assert.strictEqual(A.sumarMeses("2026-11-15", 3), "2027-02-15");
  assert.strictEqual(A.sumarMeses("2024-02-29", 12), "2025-02-28");
  assert.strictEqual(A.proximoVencimiento(d("2026-11-10"), HOY), "2027-11-10"); // renueva antes: cuenta desde el vencimiento
  assert.strictEqual(A.proximoVencimiento(d("2026-09-01"), HOY), "2027-10-29"); // ya vencido: cuenta desde hoy
  assert.strictEqual(A.proximoVencimiento(d("2026-11-10", { repetir_meses: 3 }), HOY), "2027-02-10");
});

test("avisos del celular", () => {
  const docs = [{ id: 1, nombre: "SOAT", vence: "2026-11-10", aviso_dias: 30 }, { id: 2, nombre: "Tecnomecánica", vence: "2026-12-31", aviso_dias: 15 }, { id: 3, nombre: "Licencia", vence: "2026-10-27", aviso_dias: 30 },
    { id: 4, nombre: "Cuota del seguro", vence: "2026-11-02", aviso_dias: 5 }];
  const a = A.avisosDocumentos(docs, HOY); // jueves 29 oct 2026, 3 p. m.
  assert.deepStrictEqual(a.filter((x) => x.docId === 1).map((x) => [x.dias, A.claveDia(x.cuando)]), [[7, "2026-11-03"], [3, "2026-11-07"], [1, "2026-11-09"], [0, "2026-11-10"]]);
  assert.deepStrictEqual(a.filter((x) => x.docId === 2).map((x) => x.dias), [15, 7, 3, 1, 0]);
  assert.deepStrictEqual(a.filter((x) => x.docId === 4).map((x) => x.dias), [3, 1, 0], "una cuota mensual avisa pocos días antes");
  assert.strictEqual(a.find((x) => x.docId === 1 && x.dias === 0).titulo, "SOAT vence hoy");
  assert.strictEqual(a.find((x) => x.docId === 2 && x.dias === 7).titulo, "Tecnomecánica vence en 7 días");
  assert.strictEqual(a.find((x) => x.docId === 1 && x.dias === 0).id, 1000);
  assert.ok(a.every((x, i) => i === 0 || a[i - 1].cuando <= x.cuando), "ordenados");
  assert.strictEqual(new Set(a.map((x) => x.id)).size, a.length, "ids únicos");
  // Vencido: un aviso por día durante una semana, empezando mañana.
  const vencido = a.filter((x) => x.docId === 3);
  assert.strictEqual(vencido.length, 6);
  assert.deepStrictEqual(vencido.slice(0, 2).map((x) => [A.claveDia(x.cuando), x.dias]), [["2026-10-30", -3], ["2026-10-31", -4]]);
  assert.strictEqual(vencido[0].titulo, "Licencia está vencido");
  assert.ok(/Venció hace 3 días/.test(vencido[0].texto));
});

test("avisos por defecto y presets de documentos", () => {
  assert.deepStrictEqual([1, 3, 6, 12, 36].map(A.avisoPorDefecto), [5, 15, 30, 30, 30]);
  assert.strictEqual(A.presetDe({ tipo: "seguro", nombre: "Seguro de la moto (cuota mensual)" }).meses, 1);
  assert.strictEqual(A.presetDe({ tipo: "seguro", nombre: "Otro nombre" }).clave, "seguro-mensual");
  assert.strictEqual(A.presetDe({ tipo: "soat", nombre: "Mi SOAT" }).categoria, "SOAT");
  assert.ok(A.DOCUMENTOS.every((d) => A.CATEGORIAS_CONDUCTOR.some((c) => c.nombre === d.categoria) || d.categoria === "Multas" || d.categoria === "Mantenimiento y arreglos"));
  assert.strictEqual(new Set(A.DOCUMENTOS.map((d) => d.clave)).size, A.DOCUMENTOS.length);
});

test("resumenDeudas: lo abonado, lo que falta y los totales de cada lado", () => {
  const deudas = [
    { id: 1, tipo: "debo", persona: "Banco", monto: 1000000, vence: "2026-11-05" },
    { id: 2, tipo: "me_deben", persona: "Carlos", monto: 300000, vence: "2026-10-20" },
    { id: 3, tipo: "debo", persona: "Mamá", monto: 200000 }
  ];
  const abonos = [{ deuda_id: 1, monto: 250000 }, { deuda_id: 1, monto: 150000 }, { deuda_id: 3, monto: 200000 }, { deuda_id: 3, monto: 50000 }];
  const r = A.resumenDeudas(deudas, abonos, HOY);
  assert.equal(r.lista[0].abonado, 400000);
  assert.equal(r.lista[0].falta, 600000);
  assert.equal(r.lista[0].avance, 0.4);
  assert.equal(r.lista[0].estado, "pendiente");
  assert.equal(r.lista[0].dias, 7);
  assert.equal(r.lista[1].estado, "vencida");        // Carlos debía pagar el 20 de octubre
  assert.equal(r.lista[2].estado, "pagada");          // se pasó del abono: no queda negativo
  assert.equal(r.lista[2].falta, 0);
  assert.equal(r.lista[2].abonado, 200000);
  assert.equal(r.debo, 600000);
  assert.equal(r.meDeben, 300000);
  assert.equal(r.balance, -300000);
  assert.equal(r.pendientes, 2);
});

test("resumenDeudas: sin deudas", () => {
  const r = A.resumenDeudas([], [], HOY);
  assert.equal(r.debo, 0); assert.equal(r.meDeben, 0); assert.equal(r.lista.length, 0);
});

test("avisosDeudas: 3 días antes y el mismo día; las vencidas avisan unos días; las pagadas no", () => {
  const deudas = [
    { id: 1, tipo: "debo", persona: "Banco", monto: 1000000, vence: "2026-11-05" },
    { id: 2, tipo: "me_deben", persona: "Carlos", monto: 300000, vence: "2026-10-20" },
    { id: 3, tipo: "debo", persona: "Mamá", monto: 200000, vence: "2026-11-02" },
    { id: 4, tipo: "debo", persona: "Sin fecha", monto: 50000 }
  ];
  const abonos = [{ deuda_id: 3, monto: 200000 }];
  const r = A.resumenDeudas(deudas, abonos, HOY);
  const av = A.avisosDeudas(r.lista, HOY);
  const de = (id) => av.filter((a) => a.deudaId === id);
  assert.equal(de(1).length, 2);                         // 3 días antes (2 nov) y el día (5 nov)
  assert.ok(/Banco/.test(de(1)[0].titulo) && /1\.000\.000/.test(de(1)[0].texto));
  assert.equal(de(2).length, 3);                         // vencida: tres días seguidos desde mañana
  assert.ok(/no te ha pagado/.test(de(2)[0].titulo));
  assert.equal(de(3).length, 0);                         // ya pagada
  assert.equal(de(4).length, 0);                         // sin fecha de pago
  assert.equal(new Set(av.map((a) => a.id)).size, av.length);   // ids distintos
  assert.ok(av.every((a) => a.id >= 900000000 && a.cuando > HOY));
});

test("racha de días registrando", () => {
  const ahora = new Date(2026, 9, 30, 15);
  const m = (d) => ({ fecha: new Date(2026, 9, d, 10).toISOString(), monto: 1000, tipo: "gasto" });
  assert.strictEqual(A.racha([], ahora), 0);
  assert.strictEqual(A.racha([m(30), m(29), m(28), m(25)], ahora), 3);
  assert.strictEqual(A.racha([m(29), m(28)], ahora), 2);      // hoy aún no: no se pierde
  assert.strictEqual(A.racha([m(27)], ahora), 0);
});

test("proyección del periodo", () => {
  const rango = { desde: new Date(2026, 9, 1), hasta: new Date(2026, 10, 1) };
  const m = (d, v) => ({ fecha: new Date(2026, 9, d, 10).toISOString(), monto: v, tipo: "gasto" });
  const ahora = new Date(2026, 9, 10, 12);
  const p = A.proyeccionPeriodo([m(2, 100000), m(5, 100000)], rango, ahora);
  assert.strictEqual(p.diasRestantes, 21);
  assert.strictEqual(p.gastosFinal, Math.round(200000 / 10 * 31));
  assert.strictEqual(A.proyeccionPeriodo([m(2, 100)], rango, new Date(2026, 9, 2, 12)), null);     // muy pronto
  assert.strictEqual(A.proyeccionPeriodo([m(2, 100)], rango, new Date(2026, 10, 5)), null);        // periodo ya pasó
});

test("cuota sugerida de una meta con fecha", () => {
  const ahora = new Date(2026, 9, 30);
  assert.strictEqual(A.cuotaMeta({ objetivo: 1000, ahorrado: 0 }, ahora), null);
  const c = A.cuotaMeta({ objetivo: 2000000, ahorrado: 200000, fecha_limite: "2027-01-28" }, ahora);   // 90 días
  assert.strictEqual(c.dias, 90);
  assert.strictEqual(c.porSemana, Math.ceil(1800000 / (90 / 7)));
  assert.ok(c.porMes > 580000 && c.porMes < 620000);
  assert.ok(A.cuotaMeta({ objetivo: 100, ahorrado: 0, fecha_limite: "2026-10-01" }, ahora).vencida);
  assert.ok(A.cuotaMeta({ objetivo: 100, ahorrado: 100, fecha_limite: "2026-10-01" }, ahora).hecha);
});

test("gastos compartidos: saldos y quién le paga a quién", () => {
  const miembros = ["Yo", "Ana", "Pedro"];
  const g = [
    { monto: 90000, pagador: "Yo", repartido: [] },                    // entre los 3: 30.000 c/u
    { monto: 30000, pagador: "Ana", repartido: ["Ana", "Pedro"] }      // 15.000 c/u
  ];
  const r = A.saldosGrupo(miembros, g);
  assert.deepStrictEqual(r.saldos, { Yo: 60000, Ana: -15000 + 0, Pedro: -45000 }.Yo === 60000 ? { Yo: 60000, Ana: -15000, Pedro: -45000 } : null);
  const total = r.transferencias.reduce((s, x) => s + x.monto, 0);
  assert.strictEqual(total, 60000);
  assert.ok(r.transferencias.every((x) => x.a === "Yo"));
  // un pago deja las cuentas a mano
  const pagado = A.saldosGrupo(miembros, g.concat([{ monto: 45000, pagador: "Pedro", repartido: ["Yo"] }, { monto: 15000, pagador: "Ana", repartido: ["Yo"] }]));
  assert.deepStrictEqual(pagado.transferencias, []);
});

test("calendario del mes: gasto por día, día de más gasto y días sin gastar", () => {
  // Hoy es 29 de octubre de 2026; el 1 de octubre de 2026 es jueves.
  const movs = [m(3, 9, "gasto", 20000), m(3, 9, "gasto", 5000), m(10, 9, "gasto", 100000), m(10, 9, "ingreso", 500000),
    m(12, 9, "gasto", 70000, { estado: "pendiente" }), m(30, 9, "gasto", 9000), m(2, 10, "gasto", 1000)];
  const c = A.calendarioMes(movs, 2026, 9, HOY);
  assert.strictEqual(c.nombre, "Octubre 2026");
  assert.strictEqual(c.dias.length, 31);
  assert.strictEqual(c.hueco, 3); // lunes, martes y miércoles vacíos
  assert.strictEqual(c.dias[2].gastos, 25000);
  assert.strictEqual(c.dias[2].cantidad, 2);
  assert.strictEqual(c.dias[11].gastos, 0); // el pendiente no cuenta
  assert.strictEqual(c.diaTop.dia, 10);
  assert.strictEqual(c.dias[9].nivel, 4);
  assert.strictEqual(c.dias[2].nivel, 1);
  assert.strictEqual(c.dias[9].nivelIngreso, 4);
  assert.strictEqual(c.gastos, 134000);
  assert.strictEqual(c.ingresos, 500000);
  assert.strictEqual(c.diasConGasto, 3);
  assert.strictEqual(c.diasTranscurridos, 29);
  assert.strictEqual(c.diasSinGasto, 27); // el 30 es futuro: no cuenta como día sin gastar
  assert.ok(c.dias[28].hoy && c.dias[29].futuro);
});
