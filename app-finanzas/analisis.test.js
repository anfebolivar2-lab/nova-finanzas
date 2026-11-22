const test = require("node:test");
const assert = require("node:assert");
const A = require("./analisis.js");

const HOY = new Date(2026, 9, 29, 15, 0); // jueves 29 de octubre de 2026
const m = (dia, mes, tipo, monto, extra) => Object.assign({ fecha: new Date(2026, mes, dia, 12).toISOString(), tipo, monto }, extra);

test("calor por hora y día: sin gastos, ignora ingresos y transferencias", () => {
  const desde = new Date(2026, 9, 26);
  const hasta = new Date(2026, 10, 2);
  assert.strictEqual(A.calorHoraDia([], desde, hasta), null);
  assert.strictEqual(A.calorHoraDia([
    m(26, 9, "ingreso", 90000),
    m(26, 9, "gasto", 70000, { transferencia: true })
  ], desde, hasta), null);
});

test("calor por hora y día: agrupa en hora local, calcula el pico y respeta el rango", () => {
  const desde = new Date(2026, 9, 26, 9); // lunes
  const hasta = new Date(2026, 10, 2);
  const movs = [
    m(26, 9, "gasto", 2000, { fecha: desde.toISOString() }),
    m(26, 9, "gasto", "3000", { fecha: new Date(2026, 9, 26, 11, 59).toISOString() }),
    m(1, 10, "gasto", 4000, { fecha: new Date(2026, 10, 1, 23).toISOString() }),
    m(26, 9, "gasto", 50000, { fecha: new Date(desde.getTime() - 1).toISOString() }),
    m(2, 10, "gasto", 60000, { fecha: hasta.toISOString() }),
    m(26, 9, "ingreso", 90000),
    m(26, 9, "gasto", 70000, { transferencia: true })
  ];
  const r = A.calorHoraDia(movs, desde, hasta);
  assert.deepStrictEqual(r.celdas.map((fila) => fila.length), [6, 6, 6, 6, 6, 6, 6]);
  assert.deepStrictEqual(r.celdas[0][1], { total: 0, cantidad: 0 });
  assert.deepStrictEqual(r.celdas[0][2], { total: 5000, cantidad: 2 });
  assert.deepStrictEqual(r.celdas[6][5], { total: 4000, cantidad: 1 });
  assert.strictEqual(r.total, 9000);
  assert.strictEqual(r.max, 5000);
  assert.deepStrictEqual(r.pico, { dia: 0, franja: 2, total: 5000 });
});

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

test("suscripciones: cobros mensuales repetidos, cuánto suman y cuáles subieron o se cancelaron", () => {
  // Hoy es 29 de octubre de 2026.
  const movs = [
    m(6, 7, "gasto", 26900, { descripcion: "Netflix" }), m(6, 8, "gasto", 26900, { descripcion: "Netflix" }), m(6, 9, "gasto", 29900, { descripcion: "NETFLIX" }),
    m(15, 8, "gasto", 16900, { descripcion: "Spotify" }), m(15, 9, "gasto", 16900, { descripcion: "Spotify." }),
    m(2, 5, "gasto", 90000, { descripcion: "Gimnasio" }), m(2, 6, "gasto", 90000, { descripcion: "Gimnasio" }),   // dejó de cobrarse: cancelada
    m(3, 9, "gasto", 20000, { descripcion: "Almuerzo" }), m(5, 9, "gasto", 18000, { descripcion: "Almuerzo" }), m(20, 9, "gasto", 22000, { descripcion: "Almuerzo" }), // no es mensual
    m(10, 8, "gasto", 50000, { descripcion: "Mercado" }), m(10, 9, "gasto", 180000, { descripcion: "Mercado" }), // valores muy distintos
    m(1, 9, "gasto", 9000, { descripcion: "Uber", estado: "pendiente" }), m(1, 10, "gasto", 9000, { descripcion: "Uber" })
  ];
  const s = A.suscripciones(movs, HOY);
  assert.deepStrictEqual(s.lista.map((x) => [x.nombre, x.monto, x.cancelada]), [["NETFLIX", 29900, false], ["Spotify.", 16900, false], ["Gimnasio", 90000, true]]);
  assert.strictEqual(s.activas, 2);
  assert.strictEqual(s.mensual, 46800);
  assert.strictEqual(s.anual, 561600);
  assert.strictEqual(s.lista[0].subio, 3000);
  assert.strictEqual(s.lista[1].subio, 0);
  assert.strictEqual(s.lista[0].veces, 3);
  assert.strictEqual(new Date(s.lista[1].proximo).getDate(), 15); // el próximo cobro de Spotify: el 15 de noviembre
});

test("suscripciones: un gasto que cambia un poco cada mes (mercado) no es una suscripción", () => {
  const HOY = new Date(2026, 10, 11, 12);
  const mov = (dias, descripcion, monto) => ({ tipo: "gasto", estado: "pagado", descripcion, monto, fecha: new Date(HOY.getTime() - dias * 86400000).toISOString() });
  const movs = [mov(95, "Mercado", 420000), mov(65, "Mercado", 435000), mov(35, "Mercado", 450000), mov(5, "Mercado", 465000),
    mov(90, "Internet", 120000), mov(60, "Internet", 120500), mov(30, "Internet", 120000), mov(1, "Internet", 120000)];
  const s = A.suscripciones(movs, HOY);
  assert.deepStrictEqual(s.lista.map((x) => x.nombre), ["Internet"]);
});

test("¿me alcanza? para una compra, con lo que sobra cada mes", () => {
  // Hoy es 29 de octubre de 2026: cuentan julio, agosto y septiembre (octubre va por la mitad).
  const movs = [
    m(5, 8, "ingreso", 3000000), m(10, 8, "gasto", 2000000),   // septiembre: sobran 1.000.000
    m(5, 7, "ingreso", 3000000), m(10, 7, "gasto", 2500000),   // agosto: sobran 500.000
    m(5, 6, "ingreso", 3000000), m(10, 6, "gasto", 1500000),   // julio: sobran 1.500.000
    m(5, 9, "gasto", 9999999)                                   // octubre: no cuenta
  ];
  const no = A.alcanza(7000000, movs, 2500000, HOY);
  assert.deepStrictEqual([no.veredicto, no.faltan, no.ahorroMes, no.gastoMes, no.meses], ["no", 4500000, 1000000, 2000000, 5]);
  assert.strictEqual(new Date(no.cuando).getMonth(), 2); // en 5 meses: marzo de 2027
  assert.strictEqual(A.alcanza(7000000, movs, 9500000, HOY).veredicto, "si");    // le quedan 2.500.000, más que un mes de gastos
  assert.strictEqual(A.alcanza(7000000, movs, 8000000, HOY).veredicto, "justo"); // le quedaría 1.000.000, menos que un mes
  assert.strictEqual(A.alcanza(0, movs, 1, HOY).veredicto, "sin_precio");
  const sinAhorro = A.alcanza(5000000, [m(5, 8, "ingreso", 100), m(6, 8, "gasto", 900)], 0, HOY);
  assert.deepStrictEqual([sinAhorro.veredicto, sinAhorro.meses], ["no", undefined]);
});

test("mes vs. promedio: sin historial de gastos devuelve null", () => {
  assert.strictEqual(A.mesVsPromedio([], HOY), null);
  assert.strictEqual(A.mesVsPromedio([m(1, 9, "gasto", 100)], HOY), null);
});

test("mes vs. promedio: ignora ingresos y transferencias en ambos periodos", () => {
  const movs = [
    m(1, 6, "ingreso", 900),
    m(1, 7, "gasto", 800, { transferencia: true }),
    m(1, 8, "gasto", 300),
    m(1, 9, "ingreso", 700),
    m(1, 9, "gasto", 600, { transferencia: true }),
    m(1, 9, "gasto", 100)
  ];
  const r = A.mesVsPromedio(movs, HOY);
  assert.strictEqual(r.mesesBase, 1);
  assert.strictEqual(r.totalPromedio, 300);
  assert.strictEqual(r.totalActual, 100);
  assert.strictEqual(r.filas[0].categoria_id, null);
});

test("mes vs. promedio: usa solo los seis meses completos y corta el mes actual en ahora", () => {
  const movs = [
    m(31, 2, "gasto", 900),
    m(1, 3, "gasto", 240),
    m(1, 9, "gasto", 100),
    m(29, 9, "gasto", 25),
    m(29, 9, "gasto", 200, { fecha: new Date(2026, 9, 29, 16).toISOString() }),
    m(30, 9, "gasto", 300)
  ];
  const r = A.mesVsPromedio(movs, HOY);
  assert.deepStrictEqual([r.mesesBase, r.totalPromedio, r.totalActual], [1, 240, 125]);
});

test("mes vs. promedio: divide por los tres meses con gastos y redondea por categoría", () => {
  const movs = [
    m(1, 4, "gasto", 201, { categoria_id: 1 }),
    m(2, 4, "gasto", 100, { categoria_id: 1 }),
    m(1, 6, "gasto", 100, { categoria_id: 2 }),
    m(1, 8, "gasto", 500, { categoria_id: 2 })
  ];
  const r = A.mesVsPromedio(movs, HOY);
  assert.strictEqual(r.mesesBase, 3);
  assert.strictEqual(r.totalPromedio, 300);
  assert.deepStrictEqual(r.filas.map((f) => [f.categoria_id, f.promedio]), [[2, 200], [1, 100]]);
});

test("mes vs. promedio: el día 15 de 30 espera la mitad del promedio mensual, redondeada", () => {
  const r = A.mesVsPromedio([m(1, 9, "gasto", 201)], new Date(2026, 10, 15, 15));
  assert.deepStrictEqual([r.dia, r.diasMes, r.totalEsperado], [15, 30, 101]);
  assert.deepStrictEqual(r.filas, [{ categoria_id: null, actual: 0, promedio: 201, esperado: 101, dif: -101, fijo: false }]);
});

test("mes vs. promedio: espera el promedio completo para los gastos fijos", () => {
  const movs = [9, 10].flatMap((mes) => [
    m(1, mes, "gasto", 850000, { categoria_id: 1 }),
    m(1, mes, "gasto", 200000, { categoria_id: 2 })
  ]);
  const r = A.mesVsPromedio(movs, new Date(2026, 10, 15, 15), (id) => id === 1);
  assert.deepStrictEqual(r.filas, [
    { categoria_id: 2, actual: 200000, promedio: 200000, esperado: 100000, dif: 100000, fijo: false },
    { categoria_id: 1, actual: 850000, promedio: 850000, esperado: 850000, dif: 0, fijo: true }
  ]);
  assert.strictEqual(r.totalEsperado, 950000);
});

test("mes vs. promedio: detecta el arriendo pagado una vez por mes", () => {
  const movs = [7, 8, 9, 10].map((mes) => m(1, mes, "gasto", 850000, { categoria_id: 1 }));
  const r = A.mesVsPromedio(movs, new Date(2026, 10, 15, 15), () => false);
  assert.strictEqual(r.mesesBase, 3);
  assert.deepStrictEqual(r.filas, [
    { categoria_id: 1, actual: 850000, promedio: 850000, esperado: 850000, dif: 0, fijo: true }
  ]);
});

test("mes vs. promedio: dos gastos en un mes de la base impiden detectar un gasto fijo", () => {
  const movs = [
    m(1, 8, "gasto", 100000, { categoria_id: 1 }),
    m(2, 8, "gasto", 100000, { categoria_id: 1 }),
    m(1, 9, "gasto", 100000, { categoria_id: 1 })
  ];
  const r = A.mesVsPromedio(movs, new Date(2026, 10, 15, 15));
  assert.strictEqual(r.filas[0].fijo, false);
  assert.strictEqual(r.filas[0].esperado, 75000);
});

test("mes vs. promedio: montos de 100.000 y 200.000 superan la variación permitida", () => {
  const movs = [
    m(1, 8, "gasto", 100000, { categoria_id: 1 }),
    m(1, 9, "gasto", 200000, { categoria_id: 1 })
  ];
  const r = A.mesVsPromedio(movs, new Date(2026, 10, 15, 15));
  assert.strictEqual(r.filas[0].fijo, false);
  assert.strictEqual(r.filas[0].esperado, 75000);
});

test("mes vs. promedio: acepta el 20 % exacto y excluye de la detección los gastos sin categoría", () => {
  const movs = [100000, 120000].flatMap((monto, i) => [
    m(1, 8 + i, "gasto", monto, { categoria_id: 1 }),
    m(1, 8 + i, "gasto", monto)
  ]);
  const r = A.mesVsPromedio(movs, new Date(2026, 10, 15, 15));
  assert.strictEqual(r.filas.find((f) => f.categoria_id === 1).fijo, true);
  assert.strictEqual(r.filas.find((f) => f.categoria_id === null).fijo, false);
});

test("mes vs. promedio: ordena categorías por la magnitud de la diferencia", () => {
  const movs = [
    m(1, 9, "gasto", 60, { categoria_id: 1 }),
    m(1, 10, "gasto", 80, { categoria_id: 2 }),
    m(1, 9, "gasto", 300, { categoria_id: 3 })
  ];
  const r = A.mesVsPromedio(movs, new Date(2026, 10, 15, 15));
  assert.deepStrictEqual(r.filas.map((f) => [f.categoria_id, f.dif]), [[3, -150], [2, 80], [1, -30]]);
});

test("número de libertad: sin gastos o con promedio redondeado a cero devuelve null", () => {
  assert.strictEqual(A.numeroLibertad([], 9000000, HOY), null);
  assert.strictEqual(A.numeroLibertad([m(1, 8, "gasto", 0.4)], 9000000, HOY), null);
});

test("número de libertad: ignora ingresos y transferencias", () => {
  const movs = [
    m(1, 8, "gasto", "2000000"), m(1, 7, "ingreso", 3000000),
    m(1, 6, "transferencia", 500000), m(1, 5, "gasto", 500000, { transferencia: "traslado" })
  ];
  assert.deepStrictEqual(A.numeroLibertad(movs, 9000000, HOY), { gastoMensual: 2000000, meses: 4.5, mesesConDatos: 1, ahorro: 9000000 });
});

test("número de libertad: solo cuenta los seis meses completos anteriores", () => {
  const movs = [m(31, 2, "gasto", 9000000), m(1, 3, "gasto", 2000000), m(1, 9, "gasto", 9000000)];
  assert.deepStrictEqual(A.numeroLibertad(movs, 9000000, HOY), { gastoMensual: 2000000, meses: 4.5, mesesConDatos: 1, ahorro: 9000000 });
});

test("número de libertad: promedia solo los tres meses con gastos", () => {
  const movs = [m(4, 3, "gasto", 1000), m(2, 5, "gasto", 1000), m(3, 5, "gasto", 500), m(6, 8, "gasto", 1501)];
  assert.deepStrictEqual(A.numeroLibertad(movs, 1800, HOY), { gastoMensual: 1334, meses: 1.3, mesesConDatos: 3, ahorro: 1800 });
});

test("número de libertad: con ahorro cero devuelve cero meses", () => {
  assert.strictEqual(A.numeroLibertad([m(1, 8, "gasto", 2000000)], 0, HOY).meses, 0);
});

test("número de libertad: 9 millones de ahorro cubren 4.5 meses a 2 millones por mes", () => {
  const movs = [3, 4, 5, 6, 7, 8].map((mes) => m(1, mes, "gasto", 2000000));
  assert.deepStrictEqual(A.numeroLibertad(movs, 9000000, HOY), { gastoMensual: 2000000, meses: 4.5, mesesConDatos: 6, ahorro: 9000000 });
});

test("saldo bajo: compara por cuenta, permite cero y avisa solo por debajo del mínimo", () => {
  const cuentas = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }];
  assert.deepStrictEqual(A.cuentasBajas(cuentas, { 1: 9, 2: 10, 3: -50, 4: -1, 5: -1 }, {
    1: 10, 2: 10, 4: 0, 5: null, 6: 100
  }), [{ cuenta: cuentas[0], saldo: 9, minimo: 10 }, { cuenta: cuentas[3], saldo: -1, minimo: 0 }]);
  assert.deepStrictEqual(A.cuentasBajas(cuentas, { 4: -100 }, { 4: -50 }), [
    { cuenta: cuentas[3], saldo: -100, minimo: -50 }
  ]);
});

test("avisos de límites: 80 % y 100 % se activan en el umbral exacto", () => {
  const limites = [1, 2, 3, 4, 5, 6].map(id => ({ id, categoria_id: 1, monto: id === 5 ? 0 : 10000 }));
  assert.deepStrictEqual(A.avisosLimite(limites, { 1: 7999, 2: 8000, 3: 10000, 4: 12000, 5: 5000 }), [
    { limite: limites[1], gastado: 8000, nivel: 80 },
    { limite: limites[2], gastado: 10000, nivel: 100 },
    { limite: limites[3], gastado: 12000, nivel: 100 }
  ]);
});

test("resumen del mes: cambia de diciembre a enero el día 25 sin incluir movimientos futuros", () => {
  const movs = [
    m(1, 11, "ingreso", 25000), m(30, 11, "gasto", 6000, { categoria_id: 7 }),
    m(31, 11, "gasto", 3000, { categoria_id: 7 }), m(31, 11, "gasto", 8000),
    m(31, 11, "gasto", 99999, { transferencia: "salida" }),
    m(20, 11, "ingreso", 99999, { transferencia: "entrada" }),
    m(31, 11, "gasto", 99999, { estado: "pendiente" }),
    { fecha: new Date(2027, 0, 1), tipo: "ingreso", monto: 5000 },
    { fecha: new Date(2027, 0, 25, 10), tipo: "gasto", monto: 6000 },
    { fecha: new Date(2027, 0, 26), tipo: "ingreso", monto: 10000 }
  ];
  const anterior = A.resumenMes(movs, new Date(2027, 0, 24));
  assert.deepStrictEqual(anterior, {
    mes: "Diciembre 2026", enCurso: false, ingresos: 25000, gastos: 17000, ahorro: 8000,
    categoriaTop: { id: 7, total: 9000 }, frase: "Te quedó plata para ahorrar."
  });
  const actual = A.resumenMes(movs, new Date(2027, 0, 25, 12));
  assert.deepStrictEqual(actual, {
    mes: "Enero 2027", enCurso: true, ingresos: 5000, gastos: 6000, ahorro: -1000,
    categoriaTop: { id: null, total: 6000 }, frase: "Gastaste más de lo que ganaste."
  });
  assert.strictEqual(A.resumenMes([], HOY).frase, "Aún no hay movimientos en este mes.");
});

test("meta sugerida: promedia tres meses completos, incluso los vacíos o con déficit", () => {
  const ahora = new Date(2027, 0, 28);
  const movs = [
    m(30, 8, "ingreso", 99999), m(1, 9, "ingreso", 24000),
    m(30, 10, "gasto", 9900), m(20, 11, "gasto", 99999, { transferencia: "salida" }),
    m(20, 11, "ingreso", 99999, { estado: "pendiente" }),
    { fecha: new Date(2027, 0, 1), tipo: "ingreso", monto: 99999 }
  ];
  assert.deepStrictEqual(A.metaSugerida(movs, ahora), { monto: 2000, sobro: true });
  assert.deepStrictEqual(A.metaSugerida([m(30, 10, "gasto", 9900)], ahora), { monto: null, sobro: false });
  assert.deepStrictEqual(A.metaSugerida([], ahora), { monto: null, sobro: false });
  assert.deepStrictEqual(A.metaSugerida([m(30, 10, "ingreso", 2000)], ahora), { monto: null, sobro: true });
});

test("mayores gastos: ordena las compras del mes y calcula su parte del total", () => {
  const chico = m(3, 9, "gasto", 20);
  const mediano = m(10, 9, "gasto", 30, { descripcion: "Bus", categoria_id: 2 });
  const mayor = m(1, 9, "gasto", "50", { descripcion: "Mercado", categoria_id: 1 });
  const movs = [chico, mediano, mayor, m(30, 8, "gasto", 100), m(1, 10, "gasto", 100),
    m(5, 9, "ingreso", 900), m(6, 9, "gasto", 800, { transferencia: "traslado" })];
  assert.deepStrictEqual(A.mayoresGastos(movs, HOY, 2), [
    { descripcion: "Mercado", categoria_id: 1, fecha: mayor.fecha, monto: 50, porcentaje: 50 },
    { descripcion: "Bus", categoria_id: 2, fecha: mediano.fecha, monto: 30, porcentaje: 30 }
  ]);
  assert.strictEqual(movs[0], chico);
  assert.deepStrictEqual(A.mayoresGastos(movs, HOY, 0), []);
  assert.deepStrictEqual(A.mayoresGastos([], HOY), []);
  assert.strictEqual(A.mayoresGastos(Array(6).fill(mayor), HOY).length, 5);
});

test("resumen semanal: lunes a hoy contra toda la semana anterior", () => {
  const movs = [
    m(18, 9, "gasto", 1000), m(19, 9, "gasto", 150), m(25, 9, "gasto", 50),
    m(26, 9, "gasto", 50, { categoria_id: 5 }), m(29, 9, "gasto", 40, { categoria_id: 5, fecha: new Date(2026, 9, 29, 23).toISOString() }),
    m(29, 9, "gasto", 60, { categoria_id: 2 }), m(30, 9, "gasto", 400),
    m(28, 9, "ingreso", 500), m(28, 9, "gasto", 600, { transferencia: true })
  ];
  assert.deepStrictEqual(A.resumenSemana(movs, HOY), {
    totalActual: 150, totalAnterior: 200, diferencia: -50, porcentaje: -25,
    categoriaTop: { id: 5, total: 90 }, frase: "Llevas menos gasto que la semana pasada."
  });
});

test("resumen semanal: semana sin gastos, base cero y empate", () => {
  const anterior = m(25, 9, "gasto", 40);
  const actual = m(26, 9, "gasto", 40);
  const vacio = A.resumenSemana([], HOY);
  assert.strictEqual(vacio.porcentaje, null);
  assert.strictEqual(vacio.categoriaTop, null);
  assert.strictEqual(A.resumenSemana([actual], HOY).porcentaje, null);
  assert.strictEqual(A.resumenSemana([anterior], HOY).porcentaje, -100);
  assert.strictEqual(A.resumenSemana([anterior, actual], HOY).porcentaje, 0);
});

test("último gasto: elige la fecha más reciente sin reordenar los movimientos", () => {
  const antiguo = m(20, 9, "gasto", 100);
  const ultimo = m(27, 9, "gasto", 15, { descripcion: "Café", categoria_id: 3, cuenta_id: 2 });
  const ingreso = m(28, 9, "ingreso", 30);
  const transferencia = m(29, 9, "gasto", 40, { transferencia: true });
  const movs = [antiguo, ingreso, ultimo, transferencia, { tipo: "gasto", fecha: "inválida" }];
  assert.strictEqual(A.ultimoGasto(movs), ultimo);
  assert.strictEqual(movs[0], antiguo);
  assert.strictEqual(A.ultimoGasto([ingreso, transferencia]), null);
  assert.strictEqual(A.ultimoGasto([]), null);
});

test("cortes y pagos: el día 31 se ajusta al último día de cada mes", () => {
  const tarjeta = { id: 1, nombre: "Visa", diaCorte: 31, diaPago: 3 };
  for (const [mes, ultimo] of [[1, 28], [3, 30], [6, 31]]) {
    assert.deepStrictEqual(A.proximosCortes([tarjeta], new Date(2026, mes, ultimo, 18)), [
      { id: 1, nombre: "Visa", corte: 0, pago: 3 }
    ]);
  }
  assert.strictEqual(A.proximosCortes([tarjeta], new Date(2028, 1, 28))[0].corte, 1);
});

test("cortes y pagos: cruza el año y acepta fechas opcionales", () => {
  assert.deepStrictEqual(A.proximosCortes([
    { id: 1, nombre: "Visa", diaCorte: 31, diaPago: 2 },
    { id: 2, nombre: "Otra", diaCorte: 30.5, diaPago: 1 },
    { id: 3, nombre: "Sin fechas", diaCorte: 32 }
  ], new Date(2026, 11, 30)), [
    { id: 1, nombre: "Visa", corte: 1, pago: 3 },
    { id: 2, nombre: "Otra", corte: null, pago: 2 }
  ]);
  assert.strictEqual(A.proximosCortes([{ diaCorte: 31 }], new Date(2026, 0, 31))[0].corte, 0);
  assert.strictEqual(A.proximosCortes([{ diaCorte: 30 }], new Date(2026, 0, 31))[0].corte, 28);
});

test("preguntas sugeridas: ofrece tres preguntas generales sin datos", () => {
  assert.deepStrictEqual(A.preguntasSugeridas([], [], HOY), [
    "¿Cómo empiezo a organizar mi plata?",
    "¿Cómo hago un presupuesto sencillo?",
    "¿Qué puedo hacer para ahorrar más?"
  ]);
});

test("preguntas sugeridas: compara el gasto de hoy con el promedio al mismo punto del mes", () => {
  const previo = m(15, 8, "gasto", 3100);
  assert.deepStrictEqual(A.preguntasSugeridas([previo, m(15, 9, "gasto", 3000), m(16, 9, "ingreso", 6000)], [{}], HOY), [
    "¿Por qué gasté más este mes?",
    "¿En qué categoría gasto más?",
    "¿Cómo voy con mis metas?"
  ]);
  assert.deepStrictEqual(A.preguntasSugeridas([previo, m(15, 9, "gasto", 2000), m(16, 9, "ingreso", 6000)], [], HOY), [
    "¿En qué categoría gasto más?",
    "¿Cuánto puedo ahorrar al mes?",
    "¿Cómo empiezo a organizar mi plata?"
  ]);
  assert(!A.preguntasSugeridas([m(15, 9, "gasto", 3000)], [], HOY).includes("¿Por qué gasté más este mes?"));
});

test("preguntas sugeridas: ignora lo pendiente, futuro o transferido", () => {
  assert.deepStrictEqual(A.preguntasSugeridas([
    m(30, 9, "gasto", 1500), m(15, 9, "gasto", 1500, { estado: "pendiente" }),
    m(1, 9, "ingreso", 6000, { transferencia: true })
  ], [], HOY), A.preguntasSugeridas([], [], HOY));
});

const eneroTanda6 = new Date(2027, 0, 5, 18);
const movTanda6 = (anio, mes, dia, tipo, monto, extra) =>
  Object.assign({ fecha: new Date(anio, mes, dia, 12).toISOString(), tipo, monto }, extra);

test("ingresos y gastos: 12 meses con ceros, incluso al cruzar de año", () => {
  const filas = A.ingresosGastos12([
    movTanda6(2026, 0, 31, "gasto", 500),
    movTanda6(2026, 1, 1, "ingreso", 90),
    movTanda6(2026, 11, 31, "gasto", 35),
    movTanda6(2027, 0, 1, "ingreso", 200, { transferencia: "t" }),
    movTanda6(2027, 0, 3, "gasto", 0),
    movTanda6(2027, 0, 6, "gasto", 100)
  ], eneroTanda6);
  assert.strictEqual(filas.length, 12);
  assert.deepStrictEqual(filas[0].desde, new Date(2026, 1, 1));
  assert.deepStrictEqual(filas.map(f => [f.ingresos, f.gastos]),
    [[90, 0], ...Array.from({ length: 9 }, () => [0, 0]), [0, 35], [0, 0]]);
  assert.strictEqual(filas[11].cantidad, 1);
});

test("tendencia por categoría: orden, límite, meses vacíos y cambio desde cero", () => {
  const filas = [
    movTanda6(2026, 11, 31, "gasto", 20, { categoria_id: 1 }),
    movTanda6(2027, 0, 3, "gasto", 10, { categoria_id: 1 }),
    movTanda6(2027, 0, 4, "gasto", 12, { categoria_id: 2 }),
    movTanda6(2027, 0, 5, "gasto", 0),
    movTanda6(2026, 6, 1, "gasto", 90, { categoria_id: 3 }),
    movTanda6(2027, 0, 3, "gasto", 80, { categoria_id: 4, transferencia: "t" })
  ];
  const resultado = A.tendenciaCategorias(filas, eneroTanda6);
  assert.deepStrictEqual(resultado.map(f => f.id), [1, 2, null]);
  assert.deepStrictEqual(resultado[0].meses.map(f => f.total), [0, 0, 0, 0, 20, 10]);
  assert.deepStrictEqual(resultado[0].meses[0].desde, new Date(2026, 7, 1));
  assert.strictEqual(A.nombrePeriodo("mensual", resultado[0].meses[0]), "Agosto 2026");
  assert.strictEqual(resultado[0].diferencia, -10);
  assert.strictEqual(resultado[0].porcentaje, -50);
  assert.strictEqual(resultado[1].porcentaje, null);
  assert.strictEqual(resultado[2].diferencia, 0);
  assert.strictEqual(A.tendenciaCategorias(filas, eneroTanda6, 1).length, 1);
  assert.deepStrictEqual(A.tendenciaCategorias([], eneroTanda6), []);
});

test("ranking de comercios: normaliza nombres, cuenta compras y respeta los 90 días", () => {
  const filas = [
    movTanda6(2026, 9, 8, "gasto", 20, { descripcion: "Café 2 Norte #31" }),
    movTanda6(2026, 9, 7, "gasto", 80, { descripcion: "Café 2 Norte #32" }),
    movTanda6(2027, 0, 1, "gasto", 30, { descripcion: "  CAFÉ  2 Norte-14  " }),
    movTanda6(2027, 0, 2, "gasto", 0, { descripcion: "Mercado" }),
    movTanda6(2027, 0, 2, "ingreso", 99, { descripcion: "Mercado" }),
    movTanda6(2027, 0, 2, "gasto", 99, { descripcion: "Mercado", transferencia: "t" })
  ];
  const esperado = [{ nombre: "cafe 2 norte", total: 50, compras: 2 }, { nombre: "mercado", total: 0, compras: 1 }];
  assert.deepStrictEqual(A.rankingComercios(filas, eneroTanda6), esperado);
  assert.deepStrictEqual(A.rankingComercios(filas, eneroTanda6, 1), esperado.slice(0, 1));
  assert.deepStrictEqual(A.rankingComercios([], eneroTanda6), []);
});

test("comparar años: suma gastos del año anterior completo y del actual hasta hoy", () => {
  const r = A.comparaAnios([
    movTanda6(2025, 11, 31, "gasto", 300),
    movTanda6(2026, 0, 1, "gasto", 10),
    movTanda6(2026, 11, 31, "gasto", 30),
    movTanda6(2027, 0, 2, "gasto", 50),
    movTanda6(2027, 0, 3, "gasto", 90, { transferencia: "t" }),
    movTanda6(2027, 0, 4, "gasto", 0),
    movTanda6(2027, 1, 1, "gasto", 100)
  ], eneroTanda6);
  assert.deepStrictEqual([r.anio, r.anioAnterior, r.totalActual, r.totalAnterior, r.diferencia], [2027, 2026, 50, 40, 10]);
  assert.strictEqual(r.meses.length, 12);
  assert.deepStrictEqual(r.meses[0], { etiqueta: "ene", actual: 50, anterior: 10 });
  assert.deepStrictEqual(r.meses[11], { etiqueta: "dic", actual: 0, anterior: 30 });
  assert.strictEqual(A.comparaAnios([], eneroTanda6).diferencia, 0);
});

test("flujo semanal: 8 semanas, límites de lunes a domingo y neto", () => {
  const filas = A.flujoSemanal([
    movTanda6(2026, 11, 31, "ingreso", 40),
    movTanda6(2027, 0, 3, "gasto", 50),
    movTanda6(2027, 0, 4, "ingreso", 30),
    movTanda6(2027, 0, 4, "gasto", 0),
    movTanda6(2027, 0, 4, "gasto", 80, { transferencia: "t" }),
    movTanda6(2027, 0, 5, "ingreso", 80, { estado: "pendiente" }),
    movTanda6(2027, 0, 10, "gasto", 90)
  ], eneroTanda6);
  assert.strictEqual(filas.length, 8);
  assert.deepStrictEqual(filas[6].desde, new Date(2026, 11, 28));
  assert.deepStrictEqual(filas[6].hasta, new Date(2027, 0, 4));
  assert.deepStrictEqual(filas.map(f => f.neto), [0, 0, 0, 0, 0, 0, -10, 30]);
  assert.deepStrictEqual([filas[7].ingresos, filas[7].gastos, filas[7].cantidad], [30, 0, 2]);
  assert.strictEqual(A.flujoSemanal([], eneroTanda6, 1).length, 1);
});

test("día más caro: suma el día, devuelve sus tres mayores gastos y admite un mes vacío", () => {
  const filas = [
    movTanda6(2027, 0, 1, "gasto", 50),
    ...[30, 10, 20, 1].map(monto => movTanda6(2027, 0, 2, "gasto", monto)),
    movTanda6(2027, 0, 3, "gasto", 100, { transferencia: "t" }),
    movTanda6(2026, 11, 31, "gasto", 200),
    movTanda6(2027, 0, 6, "gasto", 300)
  ];
  const r = A.diaMasCaro(filas, eneroTanda6);
  assert.deepStrictEqual(r.fecha, new Date(2027, 0, 2));
  assert.strictEqual(r.total, 61);
  assert.deepStrictEqual(r.gastos.map(g => g.monto), [30, 20, 10]);
  assert.strictEqual(A.diaMasCaro([], eneroTanda6), null);
  assert.strictEqual(A.diaMasCaro([movTanda6(2027, 0, 2, "gasto", 0)], eneroTanda6), null);
});

test("patrimonio: saldos en cuentas, sobregiros y deudas pendientes después de abonos", () => {
  const deudas = A.resumenDeudas([
    { id: 1, tipo: "debo", monto: 100 },
    { id: 2, tipo: "debo", monto: 50 },
    { id: 3, tipo: "me_deben", monto: 25 }
  ], [{ deuda_id: 1, monto: 40 }, { deuda_id: 2, monto: 50 }], eneroTanda6);
  assert.deepStrictEqual(A.patrimonioNeto([{ id: 1 }, { id: 2 }, { id: 3 }],
    { 1: 200, 2: -30, 3: 0, 4: 500 }, deudas), { activos: 200, pasivos: 90, neto: 110 });
  assert.deepStrictEqual(A.patrimonioNeto([], {}, deudas), { activos: 0, pasivos: 60, neto: -60 });
  assert.deepStrictEqual(A.patrimonioNeto([], {}, { debo: 0 }), { activos: 0, pasivos: 0, neto: 0 });
});

test("montos rápidos suman al resultado y respetan las operaciones", () => {
  assert.strictEqual(A.sumarMontoRapido("", 1000), "1000");
  assert.strictEqual(A.sumarMontoRapido("2000×3", 5000), "2000×3+5000");
  assert.strictEqual(A.evaluar(A.sumarMontoRapido("2000×3+", 5000)), 11000);
  assert.strictEqual(A.evaluar(A.sumarMontoRapido("10,5", 1000)), 1010.5);
  let expr = "";
  for (let i = 0; i < 8; i++) expr = A.sumarMontoRapido(expr, 50000);
  assert.strictEqual(A.evaluar(expr), 400000);
});

test("las sugerencias cuentan variantes, filtran por prefijo y limitan resultados", () => {
  const movs = ["Café", "Café con leche", " CAFÉ ", "cafe", "Cafetera", "Tinto con café", "constructor", ""]
    .map(descripcion => ({ descripcion }));
  assert.deepStrictEqual(A.sugerirDescripciones(movs, "CAFE", 2), ["Café", "Café con leche"]);
  assert.deepStrictEqual(A.sugerirDescripciones(movs, "cons", 8), ["constructor"]);
  assert.deepStrictEqual(A.sugerirDescripciones(movs, "té", 8), []);
});

test("promedio diario usa los días transcurridos y los tres meses completos", () => {
  const ahora = new Date(2026, 3, 10, 15);
  const movs = [
    m(5, 0, "gasto", 9000), m(10, 3, "gasto", 1150),
    m(11, 3, "gasto", 9000), m(4, 3, "gasto", 9000, { transferencia: true }),
    m(2, 3, "ingreso", 9000)
  ];
  assert.deepStrictEqual(A.promedioDia(movs, ahora), { actual: 115, anterior: 100, semaforo: "amarillo" });
  assert.strictEqual(A.promedioDia(movs.concat(m(10, 3, "gasto", 1)), ahora).semaforo, "rojo");
  assert.deepStrictEqual(A.promedioDia(movs.slice(0, 1), ahora), { actual: 0, anterior: 100, semaforo: "verde" });
  assert.deepStrictEqual(A.promedioDia([], ahora), { actual: 0, anterior: 0, semaforo: "verde" });
});

test("regla 50/30/20 clasifica por nombre y calcula los porcentajes del periodo", () => {
  const rango = { desde: new Date(2026, 9, 1), hasta: new Date(2026, 10, 1) };
  const categorias = [
    { id: 1, nombre: "Educación" }, { id: 2, nombre: "Ropa" }, { id: 3, nombre: "Mercado" }
  ];
  const movs = [
    m(2, 9, "ingreso", 1000), m(2, 9, "gasto", 300, { categoria_id: 1 }),
    m(3, 9, "gasto", 200, { categoria_id: 3 }), m(4, 9, "gasto", 300, { categoria_id: 2 }),
    m(5, 9, "gasto", 400, { transferencia: true }), m(1, 10, "gasto", 500)
  ];
  assert.deepStrictEqual(A.regla503020(movs, categorias, rango), { necesidades: 50, deseos: 30, ahorro: 20 });
  assert.strictEqual(A.regla503020(movs.concat(m(6, 9, "gasto", 1000)), categorias, rango).ahorro, 0);
  assert.deepStrictEqual(A.regla503020(movs.slice(1), categorias, rango), { necesidades: null, deseos: null, ahorro: null });
});

test("gastos inusuales requieren historial y superar los dos umbrales", () => {
  const ahora = new Date(2026, 9, 10, 15);
  const gasto = (dia, mes, monto, categoria_id, extra) => m(dia, mes, "gasto", monto, { categoria_id, ...extra });
  const movs = [
    gasto(3, 6, 150000, 1), gasto(3, 9, 150000, 1),
    gasto(4, 7, 180000, 2), gasto(4, 9, 120000, 2),
    gasto(4, 8, 30000, 3), gasto(4, 9, 60000, 3),
    gasto(4, 9, 100000, 4), gasto(4, 9, 90000, 2, { transferencia: true }),
    gasto(15, 9, 100000, 2), gasto(4, 5, 600000, 1)
  ];
  assert.deepStrictEqual(A.gastosInusuales(movs, ahora), [{ categoriaId: 1, veces: 3 }]);
  assert.deepStrictEqual(A.gastosInusuales([], ahora), []);
});

test("fondo de emergencia: tres meses completos, metas, faltantes y barras", () => {
  const ahora = new Date(2026, 0, 15, 15);
  const gasto = (anio, mes, dia, monto, extra) => Object.assign({
    tipo: "gasto", fecha: new Date(anio, mes, dia, 0).toISOString(), monto
  }, extra);
  const movs = [
    gasto(2025, 8, 30, 2000), gasto(2025, 9, 1, 300), gasto(2025, 11, 31, "600"),
    gasto(2026, 0, 1, 500), gasto(2025, 10, 1, 500, { estado: "pendiente" }),
    gasto(2025, 10, 1, 500, { transferencia: true }), gasto(2025, 10, 1, 500, { tipo: "ingreso" })
  ];
  assert.deepStrictEqual(A.fondoEmergencia(movs, 450, ahora), {
    gastoMensual: 300, saldoDisponible: 450, metas: [
      { meses: 3, monto: 900, falta: 450, progreso: 0.5 },
      { meses: 6, monto: 1800, falta: 1350, progreso: 0.25 }
    ]
  });
  assert.deepStrictEqual(A.fondoEmergencia(movs, 2100, ahora).metas.map(x => [x.falta, x.progreso]), [[0, 1], [0, 1]]);
  assert.deepStrictEqual(A.fondoEmergencia(movs, -5, ahora).metas.map(x => [x.falta, x.progreso]), [[900, 0], [1800, 0]]);
  assert.strictEqual(A.fondoEmergencia([], 100, ahora), null);
});

test("servicios: cuatro meses, fechas límite, categorías, palabras completas y variación", () => {
  const ahora = new Date(2026, 0, 15, 15);
  const gasto = (anio, mes, dia, monto, descripcion, extra) => Object.assign({
    tipo: "gasto", fecha: new Date(anio, mes, dia, 12).toISOString(), monto, descripcion
  }, extra);
  const movs = [
    gasto(2025, 8, 30, 900, "luz"), gasto(2025, 9, 1, 20, "recibo", { categoria: "Energía" }),
    gasto(2025, 10, 1, 10, "LUZ"), gasto(2025, 11, 1, 30, "luz"), gasto(2026, 0, 1, "40", "energía"),
    gasto(2025, 11, 1, 15, "acueducto", { categoria: "Servicios" }), gasto(2026, 0, 15, 5, "agua"),
    gasto(2025, 11, 1, 22, "Gas natural"), gasto(2026, 0, 1, 22, "factura", { categoria: "Gas" }),
    gasto(2026, 0, 1, 900, "gasolina"), gasto(2026, 0, 1, 900, "paraguas"),
    gasto(2025, 9, 1, 12, "Internet"), gasto(2025, 10, 1, 14, "celular"),
    gasto(2025, 11, 1, 16, "plan de datos"), gasto(2026, 0, 1, 18, "teléfono"),
    gasto(2026, 0, 16, 900, "luz"), gasto(2026, 0, 1, 900, "luz", { estado: "pendiente" }),
    gasto(2026, 0, 1, 900, "agua", { transferencia: true }), gasto(2026, 0, 1, 900, "gas", { tipo: "ingreso" })
  ];
  const filas = A.serviciosPorMes(movs, ahora);
  assert.deepStrictEqual(filas.map(f => [f.nombre, f.meses.map(x => x.total), f.diferencia]), [
    ["Luz", [20, 10, 30, 40], 10], ["Agua", [0, 0, 15, 5], -10],
    ["Gas", [0, 0, 22, 22], 0], ["Internet y celular", [12, 14, 16, 18], 2]
  ]);
  assert.deepStrictEqual(filas[0].meses.map(x => [x.desde.getFullYear(), x.desde.getMonth()]), [
    [2025, 9], [2025, 10], [2025, 11], [2026, 0]
  ]);
  assert.ok(A.serviciosPorMes([], ahora).every(f => f.meses.every(mes => mes.total === 0)));
});

test("tema por hora: cambia a las seis de la mañana y de la tarde", () => {
  [[5, 59, "oscuro"], [6, 0, "claro"], [17, 59, "claro"], [18, 0, "oscuro"]].forEach(([hora, min, tema]) => {
    assert.strictEqual(A.temaPorHora(new Date(2026, 10, 22, hora, min)), tema);
  });
});

test("bloqueo: tiempo restante, vencimiento y nunca", () => {
  assert.strictEqual(A.esperaBloqueo(0, 1000, 999999), null);
  assert.strictEqual(A.esperaBloqueo(1, 1000, 60999), 1);
  assert.strictEqual(A.esperaBloqueo(1, 1000, 61000), 0);
  assert.strictEqual(A.esperaBloqueo(5, 1000, 500), 300000);
  assert.strictEqual(A.esperaBloqueo(15, 1000, 601000), 300000);
});

test("lista de compras: separa comprado, calcula el saldo y limita la barra", () => {
  const items = [{ precio: 0.1, comprado: true }, { precio: 0.2 }, { precio: -4 }, { precio: Infinity }];
  assert.deepStrictEqual(A.totalLista(items, 0.6), { total: 0.3, comprado: 0.1, saldo: 0.3, porcentaje: 50 });
  assert.deepStrictEqual(A.totalLista(items, 0.25), { total: 0.3, comprado: 0.1, saldo: -0.05, porcentaje: 100 });
  assert.deepStrictEqual(A.totalLista([], 0), { total: 0, comprado: 0, saldo: 0, porcentaje: 0 });
});

test("pruebas gratis: de hoy a tres días por fecha local, en orden y sin modificar la lista", () => {
  const pruebas = [
    { fecha: "2027-01-02", nombre: "En tres días" },
    { fecha: "2027-01-03", nombre: "En cuatro días" },
    { fecha: "2026-12-29", nombre: "Ayer" },
    { fecha: "2026-12-30", nombre: "Hoy" },
    { fecha: "2027-02-30", nombre: "Fecha inválida" }
  ];
  assert.deepStrictEqual(A.pruebasPorVencer(pruebas, new Date(2026, 11, 30, 23, 59)),
    [{ ...pruebas[3], dias: 0 }, { ...pruebas[0], dias: 3 }]);
  assert.strictEqual(pruebas[0].dias, undefined);
  assert.ok(Number.isNaN(A.diaDePrueba("2027-02-29")));
  assert.ok(Number.isFinite(A.diaDePrueba("2028-02-29")));
  assert.strictEqual(A.pruebasPorVencer([{ fecha: "2026-03-09" }], new Date(2026, 2, 7, 23, 50))[0].dias, 2);
});

test("avisoDiaPago cubre el día de pago y el siguiente, incluso al cambiar de mes", () => {
  const hoy = (mes, dia) => new Date(2026, mes - 1, dia, 12);
  assert.equal(A.avisoDiaPago(15, [], hoy(6, 14)), false);
  assert.equal(A.avisoDiaPago("15", [], hoy(6, 15)), true);
  assert.equal(A.avisoDiaPago(15, [], hoy(6, 16)), true);
  assert.equal(A.avisoDiaPago(15, [], hoy(6, 17)), false);
  assert.equal(A.avisoDiaPago(31, [], hoy(2, 28)), true);
  assert.equal(A.avisoDiaPago(31, [], hoy(3, 1)), true);
  assert.equal(A.avisoDiaPago(31, [], hoy(3, 2)), false);
  for (const dia of ["", null, 0, 15.5, 32]) assert.equal(A.avisoDiaPago(dia, [], hoy(6, 15)), false);
});

test("avisoDiaPago se oculta al anotar un ingreso durante la ventana de pago", () => {
  const ahora = new Date(2026, 5, 16, 12);
  const ingreso = { tipo: "ingreso", fecha: "2026-06-15T08:00:00" };
  assert.equal(A.avisoDiaPago(15, [ingreso], ahora), false);
  assert.equal(A.avisoDiaPago(15, [{ ...ingreso, fecha: "2026-06-16T08:00:00" }], ahora), false);
  assert.equal(A.avisoDiaPago(15, [{ ...ingreso, fecha: "2026-06-14T08:00:00" }], ahora), true);
  assert.equal(A.avisoDiaPago(15, [{ ...ingreso, fecha: "2026-06-17T08:00:00" }], ahora), true);
  assert.equal(A.avisoDiaPago(15, [{ ...ingreso, transferencia: "1" }, { ...ingreso, tipo: "gasto" }], ahora), true);
});

test("comprasParaCalificar aplica el mínimo, la mediana y los 30 días de calendario", () => {
  const ahora = new Date(2026, 10, 22, 8);
  const compra = (id, monto, fecha = "2026-10-23T20:00:00") => ({ id, monto, fecha, tipo: "gasto" });
  const movs = [
    compra(1, 100000), compra(2, 99999), compra(3, 120000, "2026-10-24T08:00:00"),
    compra(4, 110000, "2026-10-01T20:00:00"), compra(5, 110000),
    ...Array.from({ length: 6 }, (_, i) => compra(i + 6, 25000)),
    { ...compra(12, 9000000), transferencia: "1" }, { ...compra(13, 9000000), tipo: "ingreso" },
    compra(14, 9000000, "2026-11-23T08:00:00")
  ];
  assert.deepEqual(A.comprasParaCalificar(movs, { 5: "regular" }, ahora).map(m => m.id), [4, 1]);
  assert.deepEqual(A.comprasParaCalificar([], {}, ahora), []);
  const umbralMediana = [compra(1, 80000), compra(2, 140000), compra(3, 220000), compra(4, 80000)];
  assert.deepEqual(A.comprasParaCalificar(umbralMediana, {}, ahora).map(m => m.id), [3]);
});

test("resumenCalificaciones cuenta las tres respuestas y lista las compras calificadas con No", () => {
  const movs = [1, 2, 3, 4, 5].map(id => ({ id, tipo: "gasto", fecha: "2026-10-0" + id + "T12:00:00" }));
  const r = A.resumenCalificaciones(movs, { 1: "no", 2: "regular", 3: "si", 4: "no", 6: "no" });
  assert.equal(r.total, 4);
  assert.deepEqual(r.noValieron.map(m => m.id), [4, 1]);
  assert.deepEqual(A.resumenCalificaciones(movs, {}), { total: 0, noValieron: [] });
});

test("sugerenciasAhorro ordena las tres categorías principales del mes y estima un 10 %", () => {
  const gasto = (categoria_id, monto, fecha = "2026-11-02T12:00:00") => ({ tipo: "gasto", categoria_id, monto, fecha });
  const ahora = new Date(2026, 10, 22);
  const movs = [
    gasto(1, 90000), gasto(1, 80000), gasto(2, 120000), gasto(3, 60000), gasto(4, 40000),
    gasto(4, 900000, "2026-10-31T23:59:59"), gasto(4, 900000, "2026-12-01T00:00:00"),
    { ...gasto(4, 900000), transferencia: "1" }, { ...gasto(4, 900000), tipo: "ingreso" }
  ];
  const catalogo = [{ id: 1, nombre: "Comida" }, { id: 2, nombre: "Bus", grupo: "Transporte" }, { id: 3, nombre: "Otra" }];
  const r = A.sugerenciasAhorro(movs, ahora, catalogo);
  assert.deepEqual(r.map(c => [c.categoriaId, c.ahorro]), [[1, 17000], [2, 12000], [3, 6000]]);
  assert.match(r[0].consejo, /domicilio/);
  assert.match(r[1].consejo, /viaje/);
  assert.match(r[2].consejo, /evitar repetir/);
  assert.deepEqual(A.sugerenciasAhorro([], ahora), []);
});

test("filtrarMovimientos combina fechas inclusivas, monto, categoría, cuenta y filtros anteriores", () => {
  const base = { fecha: "2026-11-08T23:59:59", monto: "20000", categoria_id: 2, cuenta_id: 5,
    tipo: "gasto", descripcion: "Café", estado: "pagado", etiquetas: ["trabajo"] };
  const movs = [base, { ...base, fecha: "2026-11-07T00:00:00", monto: 10000 },
    { ...base, fecha: "2026-11-06T23:59:59" }, { ...base, fecha: "2026-11-09T00:00:00" },
    { ...base, monto: 9999 }, { ...base, monto: 20001 }, { ...base, cuenta_id: 6 },
    { ...base, categoria_id: 3 }, { ...base, tipo: "ingreso" }, { ...base, descripcion: "Almuerzo" },
    { ...base, etiquetas: [] }, { ...base, estado: "pendiente" }];
  const filtros = { texto: "cafe", desde: "2026-11-07", hasta: "2026-11-08", categoriaId: 2,
    cuentaId: "5", montoMin: "10000", montoMax: "20000", tipo: "gasto", etiqueta: "trabajo", estado: "pagado", orden: "menor" };
  assert.deepEqual(A.filtrarMovimientos(movs, filtros), [movs[1], base]);
  assert.deepEqual(A.filtrarMovimientos([{ ...base, monto: 0 }, base], { montoMax: "0" }).map(m => m.monto), [0]);
  assert.deepEqual(A.filtrarMovimientos(movs, { montoMin: 20, montoMax: 10 }), []);
  assert.equal(A.filtrarMovimientos(movs, {}).length, movs.length);
  assert.equal(movs[0], base);
});

test("resumenAnio excluye otros años y traspasos y calcula el mes y la categoría con más gasto", () => {
  const mov = (fecha, tipo, monto, categoria_id) => ({ fecha: fecha + "T12:00:00", tipo, monto, categoria_id });
  const movs = [
    mov("2026-01-01", "ingreso", 500, 6), mov("2026-01-02", "gasto", 100, 3),
    mov("2026-03-01", "gasto", 90, 2), mov("2026-03-02", "gasto", 80, 2),
    mov("2026-12-31", "gasto", 20, 3), mov("2027-01-01", "gasto", 1000, 3),
    mov("2025-12-31", "ingreso", 1000, 6),
    { ...mov("2026-04-01", "gasto", 1000, 3), transferencia: true },
    { ...mov("2026-04-01", "ingreso", 1000, 6), transferencia: true }
  ];
  assert.deepEqual(A.resumenAnio(movs, 2026), {
    ingresos: 500, gastos: 290, ahorro: 210, categoriaTop: { id: 2, total: 170 }, mesMasCaro: "Marzo"
  });
  assert.deepEqual(A.resumenAnio(movs, 2025), {
    ingresos: 1000, gastos: 0, ahorro: 1000, categoriaTop: null, mesMasCaro: null
  });
  assert.deepEqual(A.resumenAnio([mov("2026-01-01", "gasto", 100, null)], 2026), {
    ingresos: 0, gastos: 100, ahorro: -100, categoriaTop: { id: null, total: 100 }, mesMasCaro: "Enero"
  });
  assert.equal(A.resumenAnio(movs, 2024), null);
});

test("sugerencias por hora: usa las cuatro franjas y deja fuera la madrugada", () => {
  const horas = [5, 10, 15, 19];
  const gastos = horas.flatMap((hora) => [27, 28].map((dia) => ({
    tipo: "gasto", monto: 3000, descripcion: "Gasto " + hora, fecha: new Date(2026, 9, dia, hora)
  })));
  [5, 9, 10, 14, 15, 18, 19, 23].forEach((hora) => {
    const esperado = horas.filter((inicio) => inicio <= hora).pop();
    assert.deepStrictEqual(A.sugerenciasPorHora(gastos, new Date(2026, 9, 29, hora)), [
      gastos.find((g) => g.descripcion === "Gasto " + esperado && g.fecha.getDate() === 28)
    ]);
  });
  assert.deepStrictEqual(A.sugerenciasPorHora(gastos, new Date(2026, 9, 29, 4)), []);
});

test("sugerencias por hora: agrupa nombres, usa el último gasto y limita a tres", () => {
  const gasto = (dia, descripcion, extra) => Object.freeze(Object.assign({
    tipo: "gasto", monto: 3000, descripcion, fecha: new Date(2026, 9, dia, 7)
  }, extra));
  const cafe = gasto(26, "Café", { monto: 4500, cuenta_id: 2, categoria_id: 5 });
  const bus = gasto(28, "Bus"), pan = gasto(27, "Pan");
  const movs = Object.freeze([
    cafe, gasto(25, " CAFE "), gasto(23, "cafe"), bus, gasto(24, "Bus"), pan, gasto(24, "Pan"),
    gasto(26, "Taxi"), gasto(24, "Taxi"), gasto(25, "Cena"),
    gasto(26, "Cena", { transferencia: "x" }), gasto(28, "Cena", { tipo: "ingreso" }),
    gasto(27, "Cena", { programado_id: 5 }), gasto(30, "Cena"),
    gasto(27, "Cena", { fecha: "inválida" }), gasto(27, "Cena", { monto: 0 })
  ]);
  const hoy = new Date(2026, 9, 29, 8);
  assert.deepStrictEqual(A.sugerenciasPorHora(movs, hoy), [cafe, bus, pan]);
  assert.deepStrictEqual(A.sugerenciasPorHora([bus], hoy), []);
});

test("racha actual y récord: cuenta días únicos, conserva la racha desde ayer y excluye fechas futuras", () => {
  const fechas = [new Date(2026, 9, 30), new Date(2026, 9, 31), new Date(2026, 10, 1),
    new Date(2026, 10, 4), new Date(2026, 10, 4, 20), new Date(2026, 10, 5), new Date(2026, 10, 10), "inválida"];
  const movs = fechas.reverse().map((fecha) => ({ fecha }));
  assert.deepStrictEqual(A.rachaDias(movs, new Date(2026, 10, 5)), { actual: 2, record: 3 });
  assert.deepStrictEqual(A.rachaDias(movs, new Date(2026, 10, 6)), { actual: 2, record: 3 });
  assert.deepStrictEqual(A.rachaDias(movs, new Date(2026, 10, 7)), { actual: 0, record: 3 });
  assert.deepStrictEqual(A.rachaDias([], HOY), { actual: 0, record: 0 });
});

test("hitos de racha: devuelve la insignia más alta alcanzada", () => {
  assert.strictEqual(A.hitoDeRacha(2), null);
  const dias = [3, 7, 14, 30, 60, 100];
  dias.forEach((hito, i) => {
    const premio = A.hitoDeRacha(hito);
    assert.strictEqual(premio.dias, hito);
    assert.ok(premio.emoji && premio.mensaje);
    assert.deepStrictEqual(A.hitoDeRacha(dias[i + 1] ? dias[i + 1] - 1 : 101), premio);
  });
});

test("usura: solo avisa al superar una tasa configurada y válida", () => {
  assert.strictEqual(A.superaUsura("30,51", "30.5"), true);
  assert.strictEqual(A.superaUsura(31, 30), true);
  assert.strictEqual(A.superaUsura("30,5", 30.5), false);
  assert.strictEqual(A.superaUsura(29, 30), false);
  ["", "  ", null, undefined, "25xyz", "0x20", -1, 0, NaN, Infinity, true].forEach((invalida) => {
    assert.strictEqual(A.superaUsura(40, invalida), false);
    assert.strictEqual(A.superaUsura(invalida, 30), false);
  });
  assert.ok(Math.abs(A.tasaAnualDesdeMensual(2) - 26.824179456) < 0.000001);
  assert.strictEqual(A.superaUsura(A.tasaAnualDesdeMensual(2), 25), true);
  assert.strictEqual(A.tasaAnualDesdeMensual(0), 0);
});

test("evolución de deuda: ordena abonos propios y limita el saldo a cero", () => {
  const deuda = Object.freeze({ id: 1, monto: "1000", fecha: "2026-10-01" });
  const abonos = Object.freeze([
    { id: 4, deuda_id: 1, monto: 800, fecha: "2026-10-05" },
    { id: 3, deuda_id: 1, monto: 200, fecha: "2026-10-03" },
    { id: 2, deuda_id: 1, monto: "100", fecha: "2026-10-03" },
    { id: 5, deuda_id: 2, monto: 500, fecha: "2026-10-02" },
    { id: 6, deuda_id: 1, monto: -5, fecha: "2026-10-02" }
  ]);
  assert.deepStrictEqual(A.evolucionDeuda(deuda, abonos), [
    { fecha: "2026-10-01", saldo: 1000 }, { fecha: "2026-10-03", saldo: 900 },
    { fecha: "2026-10-03", saldo: 700 }, { fecha: "2026-10-05", saldo: 0 }
  ]);
  assert.deepStrictEqual(A.evolucionDeuda(deuda, []), [{ fecha: "2026-10-01", saldo: 1000 }]);
});

test("pagos programados: incluye hoy y mañana en hora local, ordena y omite ingresos e inactivos", () => {
  const ahora = new Date(2026, 11, 31, 23, 50);
  const hoy = { tipo: "gasto", proxima: "2026-12-31" };
  const manana = { activo: true, tipo: "gasto", proxima: "2027-01-01" };
  const despues = { tipo: "gasto", proxima: "2027-01-02" };
  const pagos = Object.freeze([manana, despues, hoy,
    { activo: false, proxima: hoy.proxima }, { tipo: "ingreso", proxima: manana.proxima },
    { proxima: "2026-12-30" }, { proxima: "inválida" }, {}]);
  assert.deepStrictEqual(A.programadosProximos(pagos, ahora), [
    { programado: hoy, fecha: new Date(2026, 11, 31), dias: 0 },
    { programado: manana, fecha: new Date(2027, 0, 1), dias: 1 }
  ]);
  assert.deepStrictEqual(A.programadosProximos(pagos, ahora, 0).map((p) => p.programado), [hoy]);
  assert.deepStrictEqual(A.programadosProximos(pagos, ahora, 2).map((p) => p.programado), [hoy, manana, despues]);
  assert.deepStrictEqual(A.programadosProximos([], ahora), []);
});

test("totales por día: usa la fecha local, suma gastos pagados y respeta el mes", () => {
  const pendientes = m(12, 9, "gasto", 70000, { estado: "pendiente" });
  const movimientos = [
    m(3, 9, "gasto", "20000"), m(3, 9, "gasto", 25000),
    m(3, 9, "ingreso", 500000), pendientes, m(1, 10, "gasto", 1000),
    { tipo: "gasto", fecha: "2026-10-31", monto: 1234 }
  ];
  assert.deepStrictEqual(A.totalesPorDia(movimientos, "2026-10"), { "2026-10-03": 45000, "2026-10-31": 1234 });
  assert.deepStrictEqual(A.totalesPorDia(movimientos, "2026-09"), {});
  assert.deepStrictEqual(A.totalesPorDia([], "2026-10"), {});
  const diaPendiente = A.calendarioMes(movimientos, 2026, 9, HOY).dias[11];
  assert.strictEqual(diaPendiente.gastos, 0);
  assert.deepStrictEqual(diaPendiente.movimientos, [pendientes]);
});

test("deslizar: la izquierda supera el umbral y predomina sobre el desplazamiento vertical", () => {
  assert.ok(A.gestoDeslizar(-48, -20, 48));
  assert.ok(A.gestoDeslizar(-80, 40, 60));
  assert.ok(A.gestoDeslizar(-50, 0));
  assert.strictEqual(A.gestoDeslizar(-10, 0, 48), false);
  assert.strictEqual(A.gestoDeslizar(90, 0, 48), false);
  assert.strictEqual(A.gestoDeslizar(-60, -70, 48), false);
  assert.strictEqual(A.gestoDeslizar(-60, 60, 48), false);
  assert.strictEqual(A.gestoDeslizar(0, 0, 48), false);
});

test("emoji pegado: admite un símbolo, una bandera, un tono o una secuencia unida", () => {
  ["🧋", "🇨🇴", "👩🏽‍💻", "1️⃣", "❤️"].forEach((emoji) => assert.strictEqual(A.emojiPegado(" " + emoji + " "), emoji));
  ["", "manzana 🍎", "🍎 🍐", "🍎🍐", "12", "🇨", "🏽", "<b>"].forEach((entrada) => assert.strictEqual(A.emojiPegado(entrada), ""));
});

test("CSV de movimientos: BOM, campos con comas, comillas, saltos de línea y tildes", () => {
  const encabezado = "\ufeffFecha,Tipo,Descripción,Categoría,Cuenta,Monto,Nota";
  const filas = [
    { fecha: "2025-01-01", tipo: "gasto", descripcion: 'Café, "tamaño grande"', categoria_id: 1, cuenta_id: 4, monto: 12.5, nota: "Primera línea\nSegunda línea" },
    { fecha: "2026-10-29", tipo: "ingreso", descripcion: "  =2+2", cuenta_id: 70, monto: 75000 }
  ];
  const categorias = [{ id: 1, nombre: "Alimentación" }];
  const cuentas = [{ id: 4, nombre: "Tarjeta, crédito" }];
  assert.strictEqual(A.movimientosACsv(filas, categorias, cuentas), encabezado +
    '\r\n2025-01-01,Gasto,"Café, ""tamaño grande""",Alimentación,"Tarjeta, crédito",-12.5,"Primera línea\nSegunda línea"' +
    "\r\n2026-10-29,Ingreso,'  =2+2,Sin categoría,,75000,");
  assert.strictEqual(A.movimientosACsv([], [], []), encabezado);
});

test("papelera: conserva 30 días, copia todos los datos y reemplaza la copia anterior del mismo movimiento", () => {
  const ahora = Date.UTC(2026, 10, 1);
  const fila = { id: 11, descripcion: "Pan", espacio_id: 3, categoria_id: null, etiquetas: ["casa"], foto_ruta: "recibo.jpg" };
  const limite = { id: "límite", tabla: "movimientos", fila: { id: 10 }, borrado: "2026-10-02T00:00:00Z" };
  const anterior = { id: "anterior", tabla: "movimientos", fila, borrado: "2026-10-31T00:00:00Z" };
  const vieja = { id: "vieja", tabla: "movimientos", fila: { id: 9 }, borrado: "2026-10-01T23:59:59.999Z" };
  const meta = { id: "meta", tabla: "metas", fila: { id: 11 }, borrado: "2026-10-31T00:00:00Z" };
  const papelera = Object.freeze([meta, vieja, anterior, limite]);
  assert.deepStrictEqual(A.limpiarPapelera(papelera, ahora), [meta, anterior, limite]);
  const nueva = A.agregarAPapelera(papelera, "movimientos", fila, ahora, "nueva");
  assert.deepStrictEqual(nueva.map((e) => e.id), ["nueva", "meta", "límite"]);
  assert.deepStrictEqual(nueva[0], { id: "nueva", tabla: "movimientos", fila, borrado: "2026-11-01T00:00:00.000Z" });
  fila.etiquetas.push("otra");
  assert.deepStrictEqual(nueva[0].fila.etiquetas, ["casa"]);
  assert.deepStrictEqual(A.limpiarPapelera([null, { borrado: "inválida" }], ahora), []);
});

test("reto semanal: lunes a domingo con rotación estable entre años y categorías disponibles", () => {
  const semana = A.semanaDe("2026-01-01");
  assert.deepStrictEqual(semana, A.semanaDe("2026-01-04"));
  assert.deepStrictEqual([semana.desde, semana.hasta], ["2025-12-29", "2026-01-05"]);
  assert.strictEqual(A.semanaDe("2026-01-05").indice, semana.indice + 1);
  const categorias = [
    { id: 1, nombre: "Domicilios", tipo: "gasto" },
    { id: 2, nombre: "Taxi y Uber", tipo: "gasto" },
    { id: 3, nombre: "Didi", tipo: "gasto" },
    { id: 4, nombre: "Taxi", tipo: "ingreso" },
    { id: 5, nombre: "Salud", tipo: "gasto" }
  ];
  assert.strictEqual(A.retoDeLaSemana(0).titulo, "Sin domicilios");
  assert.deepStrictEqual(A.retoDeLaSemana(1, categorias), { titulo: "Sin taxi ni Uber", categorias: [2, 3], nombre: "Taxi y Uber, Didi" });
  assert.deepStrictEqual(A.retoDeLaSemana(2, categorias).categorias, [1]);
  assert.strictEqual(A.retoDeLaSemana(0, categorias.slice(3)), null);
});

test("logros semanales: cuenta gastos desde el lunes, cierra semanas pasadas y concede insignias a 1, 3 y 5", () => {
  const reto = { categorias: [4, 5] };
  const gasto = (fecha, id = 4) => ({ fecha, categoria_id: id, tipo: "gasto" });
  const fuera = [gasto("2025-12-28"), gasto("2026-01-05"), gasto("2025-12-29", 9),
    { fecha: "2026-01-03", tipo: "ingreso", categoria_id: 4 }];
  assert.ok(A.cumplioReto(reto, fuera, "2025-12-29"));
  assert.strictEqual(A.cumplioReto(reto, fuera.concat(gasto("2025-12-29")), "2025-12-29"), false);
  assert.strictEqual(A.cumplioReto(reto, fuera.concat(gasto("2026-01-04", 5)), "2025-12-29"), false);
  assert.strictEqual(A.cumplioReto(null, [], "2025-12-29"), false);
  const historial = Object.freeze([{ desde: "2025-12-22", reto }, { desde: "2025-12-29", reto }, { desde: "2026-01-05", reto }]);
  const actualizado = A.actualizarRetos(historial, fuera, A.semanaDe("2026-01-05"));
  assert.deepStrictEqual(actualizado.map((r) => r.cumplido), [false, true, undefined]);
  assert.strictEqual(historial[1].cumplido, undefined);
  assert.strictEqual(A.actualizarRetos(actualizado, [], A.semanaDe("2026-01-05"))[0], actualizado[0]);
  [0, 1, 2, 3, 4, 5, 6].forEach((total) => {
    const lista = Array(total).fill({ cumplido: true }).concat({ cumplido: false }, {});
    assert.deepStrictEqual(A.insigniasReto(lista), { total, insignias: [1, 3, 5].filter((n) => n <= total) });
  });
});

test("papelera y retos: mantienen las referencias al sincronizar categorías y cuentas creadas sin internet", () => {
  const movimiento = { tabla: "movimientos", fila: { id: -2, cuenta_id: -3, categoria_id: -5, nota: "almuerzo" } };
  const meta = { tabla: "metas", fila: { id: 2 } };
  const historial = [{ desde: "2026-01-05", reto: { categorias: [-5, 6] } }, { desde: "2025-12-29", reto: { categorias: [2] }, cumplido: true }];
  const papelera = A.remapearPapelera([movimiento, meta], { "-3": 15, "-5": 20 }, "categorias");
  assert.deepStrictEqual(papelera[0].fila, { id: -2, cuenta_id: 15, categoria_id: 20, nota: "almuerzo" });
  assert.strictEqual(papelera[1], meta);
  assert.strictEqual(movimiento.fila.cuenta_id, -3);
  assert.strictEqual(A.remapearPapelera(papelera, { "-2": 8 }, "movimientos")[0].fila.id, 8);
  const retos = A.remapearRetos(historial, { "-5": 20 });
  assert.deepStrictEqual(retos[0].reto.categorias, [20, 6]);
  assert.deepStrictEqual(historial[0].reto.categorias, [-5, 6]);
  assert.strictEqual(retos[1], historial[1]);
});
