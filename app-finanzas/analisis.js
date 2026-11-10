// Cálculos de NOVA que no tocan la pantalla: periodos, análisis, búsqueda, calculadora,
// programados y exportación. Funciona en el navegador (window.NovaAnalisis) y en Node
// (require) para las pruebas.
(function (raiz) {
  "use strict";

  var Periodos = typeof module === "object" && module.exports ? require("./periodos.js") : raiz.NovaPeriodos;
  var DIA = 86400000;
  var MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  var MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
  var DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

  function num(v) { return Number(v) || 0; }
  function inicioDia(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function claveDia(d) {
    var x = new Date(d);
    return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0");
  }

  // ---------- Periodos ----------
  // El periodo del ciclo que está n periodos antes (n < 0) o después (n > 0) del que contiene ref.
  function desplazar(ciclo, ref, n) {
    var r = Periodos.periodo(ciclo, ref);
    for (var i = 0; i < Math.abs(n); i++) {
      r = Periodos.periodo(ciclo, n < 0 ? new Date(r.desde.getTime() - 1) : r.hasta);
    }
    return r;
  }

  function nombrePeriodo(ciclo, r) {
    var d = r.desde, ultimo = new Date(r.hasta.getTime() - 1), a = d.getFullYear();
    switch (ciclo) {
      case "semanal":
        return d.getDate() + " " + MESES_CORTOS[d.getMonth()] + " – " + ultimo.getDate() + " " + MESES_CORTOS[ultimo.getMonth()] + " " + ultimo.getFullYear();
      case "quincenal": return d.getDate() + "–" + ultimo.getDate() + " " + MESES_CORTOS[d.getMonth()] + " " + a;
      case "trimestral": return "Trimestre " + (Math.floor(d.getMonth() / 3) + 1) + " · " + a;
      case "semestral": return "Semestre " + (d.getMonth() < 6 ? 1 : 2) + " · " + a;
      case "anual": return String(a);
      default: return MESES[d.getMonth()] + " " + a;
    }
  }

  // Nombre corto para los ejes de los gráficos.
  function nombreCorto(ciclo, r) {
    var d = r.desde;
    switch (ciclo) {
      case "semanal": case "quincenal": return d.getDate() + " " + MESES_CORTOS[d.getMonth()];
      case "trimestral": return "T" + (Math.floor(d.getMonth() / 3) + 1);
      case "semestral": return "S" + (d.getMonth() < 6 ? 1 : 2);
      case "anual": return String(d.getFullYear());
      default: return MESES_CORTOS[d.getMonth()];
    }
  }

  function enRango(movs, r) {
    return movs.filter(function (m) { var f = new Date(m.fecha); return f >= r.desde && f < r.hasta; });
  }

  function totales(movs) {
    var t = { ingresos: 0, gastos: 0, neto: 0, cantidad: movs.length };
    movs.forEach(function (m) { if (m.tipo === "ingreso") t.ingresos += num(m.monto); else t.gastos += num(m.monto); });
    t.neto = t.ingresos - t.gastos;
    return t;
  }

  // Días seguidos registrando movimientos. Si hoy aún no hay, la racha cuenta desde ayer (todavía no se pierde).
  function racha(movs, ahora) {
    var dias = {};
    movs.forEach(function (m) { dias[claveDia(m.fecha)] = true; });
    var d = new Date(ahora || new Date());
    d.setHours(12, 0, 0, 0);
    if (!dias[claveDia(d)]) d.setDate(d.getDate() - 1);
    var n = 0;
    while (dias[claveDia(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  // Cómo terminará el periodo si sigues gastando a este ritmo. Solo tiene sentido en el periodo actual.
  function proyeccionPeriodo(movs, rango, ahora) {
    ahora = new Date(ahora || new Date());
    if (!(ahora >= rango.desde && ahora < rango.hasta)) return null;
    var DIA = 86400000;
    var total = Math.round((rango.hasta - rango.desde) / DIA);
    var pasados = Math.max(1, Math.ceil((ahora - rango.desde) / DIA));
    var t = totales(movs);
    if (pasados < 3 || t.gastos <= 0) return null;
    var ritmo = t.gastos / pasados;
    return { gastosHoy: t.gastos, ritmoDiario: ritmo, gastosFinal: Math.round(ritmo * total), diasRestantes: Math.max(0, total - pasados), ingresos: t.ingresos, saldoFinal: Math.round(t.ingresos - ritmo * total) };
  }

  // Cuánto ahorrar para llegar a una meta con fecha: por mes y por semana.
  function cuotaMeta(meta, ahora) {
    var falta = Math.max(0, num(meta.objetivo) - num(meta.ahorrado));
    if (!meta.fecha_limite) return null;
    var hoy = new Date(ahora || new Date()); hoy.setHours(0, 0, 0, 0);
    var f = new Date(String(meta.fecha_limite).slice(0, 10) + "T00:00:00");
    var dias = Math.round((f - hoy) / 86400000);
    if (falta <= 0) return { hecha: true, falta: 0, dias: dias };
    if (dias <= 0) return { vencida: true, falta: falta, dias: dias };
    return { falta: falta, dias: dias, porSemana: Math.ceil(falta / (dias / 7)), porMes: Math.ceil(falta / (dias / 30.44)) };
  }

  // Gastos compartidos: cuánto puso y cuánto le tocaba a cada persona, y quién le paga a quién para quedar a mano.
  // Un "pago" es un gasto cuyo pagador le da la plata a la única persona de "repartido".
  function saldosGrupo(miembros, gastos) {
    var s = {};
    miembros.forEach(function (m) { s[m] = 0; });
    gastos.forEach(function (g) {
      var monto = num(g.monto), rep = g.repartido && g.repartido.length ? g.repartido : miembros;
      s[g.pagador] = (s[g.pagador] || 0) + monto;
      rep.forEach(function (n) { s[n] = (s[n] || 0) - monto / rep.length; });
    });
    var nombres = Object.keys(s);
    nombres.forEach(function (n) { s[n] = Math.round(s[n]); if (Math.abs(s[n]) < 1) s[n] = 0; });
    var deben = nombres.filter(function (n) { return s[n] < 0; }).map(function (n) { return { n: n, v: -s[n] }; }).sort(function (a, b) { return b.v - a.v; });
    var cobran = nombres.filter(function (n) { return s[n] > 0; }).map(function (n) { return { n: n, v: s[n] }; }).sort(function (a, b) { return b.v - a.v; });
    var transferencias = [], i = 0, j = 0;
    while (i < deben.length && j < cobran.length) {
      var m = Math.min(deben[i].v, cobran[j].v);
      if (m > 0) transferencias.push({ de: deben[i].n, a: cobran[j].n, monto: m });
      deben[i].v -= m; cobran[j].v -= m;
      if (deben[i].v <= 0) i++;
      if (cobran[j].v <= 0) j++;
    }
    return { saldos: s, transferencias: transferencias };
  }

  // ---------- Análisis ----------
  // { id de categoría (o "sin") : total gastado }, de mayor a menor.
  function porCategoria(movs, tipo) {
    var m = {};
    movs.forEach(function (x) {
      if (x.tipo !== (tipo || "gasto")) return;
      var k = x.categoria_id == null ? "sin" : String(x.categoria_id);
      m[k] = (m[k] || 0) + num(x.monto);
    });
    return Object.keys(m).map(function (k) { return { id: k === "sin" ? null : Number(k), total: m[k] }; })
      .sort(function (a, b) { return b.total - a.total; });
  }

  function porEtiqueta(movs) {
    var m = {};
    movs.forEach(function (x) {
      if (x.tipo !== "gasto") return;
      (x.etiquetas || []).forEach(function (e) { m[e] = (m[e] || 0) + num(x.monto); });
    });
    return Object.keys(m).map(function (e) { return { etiqueta: e, total: m[e] }; }).sort(function (a, b) { return b.total - a.total; });
  }

  // Promedio de gasto diario, categoría top, día de la semana que más se gasta y cambio contra el periodo anterior.
  function vistaRapida(todos, ciclo, ref, hoy) {
    hoy = hoy ? new Date(hoy) : new Date();
    var r = Periodos.periodo(ciclo, ref), ant = desplazar(ciclo, ref, -1);
    var movs = enRango(todos, r), t = totales(movs), tAnt = totales(enRango(todos, ant));
    var fin = Math.min(r.hasta.getTime(), inicioDia(hoy).getTime() + DIA);
    var dias = Math.max(1, Math.round((fin - r.desde.getTime()) / DIA));
    var semana = [0, 0, 0, 0, 0, 0, 0];
    movs.forEach(function (m) { if (m.tipo === "gasto") semana[(new Date(m.fecha).getDay() + 6) % 7] += num(m.monto); });
    var maxDia = Math.max.apply(null, semana);
    var cats = porCategoria(movs);
    return {
      promedioDiario: t.gastos / dias,
      categoriaTop: cats.length ? cats[0].id : undefined,
      diaTop: maxDia > 0 ? DIAS_SEMANA[semana.indexOf(maxDia)] : null,
      vsAnterior: tAnt.gastos > 0 ? ((t.gastos - tAnt.gastos) / tAnt.gastos) * 100 : null,
      gastos: t.gastos, ingresos: t.ingresos
    };
  }

  // Ingresos y gastos de los últimos n periodos, del más viejo al actual.
  function serie(todos, ciclo, ref, n) {
    var out = [];
    for (var i = n - 1; i >= 0; i--) {
      var r = desplazar(ciclo, ref, -i), t = totales(enRango(todos, r));
      out.push({ etiqueta: nombreCorto(ciclo, r), ingresos: t.ingresos, gastos: t.gastos, desde: r.desde });
    }
    return out;
  }

  // Balance proyectado a 90 días según el promedio diario de los últimos 90 días (sin contar el futuro).
  function proyeccion(todos, saldo, hoy) {
    hoy = hoy ? new Date(hoy) : new Date();
    var desde = new Date(hoy.getTime() - 90 * DIA);
    var t = totales(todos.filter(function (m) { var f = new Date(m.fecha); return f >= desde && f <= hoy; }));
    var diario = t.neto / 90;
    return [0, 30, 60, 90].map(function (d) { return { dias: d, saldo: Math.round(saldo + diario * d) }; });
  }

  // Cuánto se puede gastar por día hasta el final del periodo sin pasarse del presupuesto.
  function seguroParaGastar(limite, gastado, r, hoy) {
    hoy = inicioDia(hoy || new Date());
    var dias = Math.max(1, Math.round((r.hasta.getTime() - hoy.getTime()) / DIA));
    return { porDia: Math.max(0, (limite - gastado) / dias), dias: dias, resto: limite - gastado };
  }

  // ---------- Listas ----------
  function nombreDia(d, hoy) {
    hoy = inicioDia(hoy || new Date());
    var x = inicioDia(d), dif = Math.round((hoy - x) / DIA);
    if (dif === 0) return "Hoy";
    if (dif === 1) return "Ayer";
    return DIAS_SEMANA[(x.getDay() + 6) % 7] + ", " + x.getDate() + " " + MESES_CORTOS[x.getMonth()] + (x.getFullYear() !== hoy.getFullYear() ? " " + x.getFullYear() : "");
  }

  // Agrupa movimientos (ya ordenados) por día: [{ clave, nombre, neto, movimientos }].
  function porDia(movs, hoy) {
    var grupos = [], actual = null;
    movs.forEach(function (m) {
      var k = claveDia(m.fecha);
      if (!actual || actual.clave !== k) { actual = { clave: k, nombre: nombreDia(m.fecha, hoy), neto: 0, movimientos: [] }; grupos.push(actual); }
      actual.movimientos.push(m);
      actual.neto += m.tipo === "ingreso" ? num(m.monto) : -num(m.monto);
    });
    return grupos;
  }

  function sinTildes(t) { return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }

  // Busca por descripción, nota, categoría o etiqueta, con filtros opcionales.
  // f: { texto, tipo, categoriaId, etiqueta, estado, desde, hasta, orden }, nombreCategoria(id) -> texto
  function buscar(movs, f, nombreCategoria) {
    var palabras = sinTildes(f.texto).replace(/#/g, "").split(/\s+/).filter(Boolean);
    var desde = f.desde ? new Date(f.desde + "T00:00:00") : null, hasta = f.hasta ? new Date(f.hasta + "T00:00:00") : null;
    if (hasta) hasta = new Date(hasta.getTime() + DIA);
    var r = movs.filter(function (m) {
      if (f.tipo && m.tipo !== f.tipo) return false;
      if (f.categoriaId != null && m.categoria_id !== f.categoriaId) return false;
      if (f.etiqueta && (m.etiquetas || []).indexOf(f.etiqueta) < 0) return false;
      if (f.estado && (m.estado || "pagado") !== f.estado) return false;
      var fecha = new Date(m.fecha);
      if (desde && fecha < desde) return false;
      if (hasta && fecha >= hasta) return false;
      if (!palabras.length) return true;
      var donde = sinTildes([m.descripcion, m.nota, nombreCategoria ? nombreCategoria(m.categoria_id) : "", (m.etiquetas || []).join(" ")].join(" "));
      return palabras.every(function (p) { return donde.indexOf(p) >= 0; });
    });
    var orden = {
      antiguos: function (a, b) { return new Date(a.fecha) - new Date(b.fecha); },
      mayor: function (a, b) { return num(b.monto) - num(a.monto); },
      menor: function (a, b) { return num(a.monto) - num(b.monto); }
    }[f.orden] || function (a, b) { return new Date(b.fecha) - new Date(a.fecha); };
    return r.sort(orden);
  }

  // ---------- Calculadora ----------
  // Evalúa "20.000+5.000*2" (punto = miles, coma = decimales). Devuelve NaN si no se entiende.
  function evaluar(expr) {
    var s = String(expr || "").replace(/\s/g, "").replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/\./g, "").replace(/,/g, ".");
    if (!s) return NaN;
    if (!/^[0-9.+\-*/]+$/.test(s)) return NaN;
    var tokens = s.match(/\d+(?:\.\d+)?|[+\-*/]/g);
    if (!tokens || tokens.join("") !== s) return NaN;
    // Primero * y /, luego + y -.
    var pila = [], op = "+", i = 0;
    if (tokens[0] === "-") { op = "-"; i = 1; }
    for (; i < tokens.length; i += 2) {
      var n = Number(tokens[i]);
      if (!isFinite(n)) return NaN;
      if (op === "+") pila.push(n);
      else if (op === "-") pila.push(-n);
      else if (op === "*") pila.push(pila.pop() * n);
      else if (op === "/") { if (n === 0) return NaN; pila.push(pila.pop() / n); }
      op = tokens[i + 1];
      if (op !== undefined && "+-*/".indexOf(op) < 0) return NaN;
    }
    if (op !== undefined) return NaN; // terminó en un operador
    return Math.round(pila.reduce(function (a, b) { return a + b; }, 0) * 100) / 100;
  }

  // ---------- Programados ----------
  var FRECUENCIAS = { diaria: "Cada día", semanal: "Cada semana", quincenal: "Cada quincena", mensual: "Cada mes", anual: "Cada año" };

  // Siguiente fecha (YYYY-MM-DD) después de la dada. Mensual respeta el día (31 → último día del mes).
  function siguienteFecha(fecha, frecuencia) {
    var p = String(fecha).slice(0, 10).split("-").map(Number), a = p[0], m = p[1] - 1, d = p[2];
    function ultimo(an, me) { return new Date(an, me + 1, 0).getDate(); }
    var n;
    switch (frecuencia) {
      case "diaria": n = new Date(a, m, d + 1); break;
      case "semanal": n = new Date(a, m, d + 7); break;
      case "quincenal": n = new Date(a, m, d + 15); break;
      case "anual": n = new Date(a + 1, m, Math.min(d, ultimo(a + 1, m))); break;
      default: n = new Date(a, m + 1, Math.min(d, ultimo(a, m + 1)));
    }
    return claveDia(n);
  }

  // Fechas que ya tocaba registrar (hasta hoy incluido), como mucho 60 para no inundar.
  function fechasPendientes(p, hoy) {
    var limite = claveDia(hoy || new Date()), f = String(p.proxima).slice(0, 10), out = [];
    while (p.activo !== false && f <= limite && out.length < 60) { out.push(f); f = siguienteFecha(f, p.frecuencia); }
    return { fechas: out, proxima: f };
  }

  // ---------- Grupos de categorías ----------
  var GRUPO_APPS = "Apps de transporte", GRUPO_TRABAJO = "Trabajo con vehículo";
  var GRUPOS = {
    gasto: ["Comida y Bebida", "Estilo de Vida", "Familia", "Hogar y Servicios", "Transporte", GRUPO_TRABAJO, "Otros"],
    ingreso: ["Ingresos Principales", GRUPO_APPS, "Otros Ingresos"]
  };
  var GRUPO_POR_NOMBRE = {
    comida: "Comida y Bebida", mercado: "Comida y Bebida", restaurantes: "Comida y Bebida",
    entretenimiento: "Estilo de Vida", compras: "Estilo de Vida", salud: "Estilo de Vida", educacion: "Estilo de Vida", ropa: "Estilo de Vida",
    hogar: "Hogar y Servicios", suscripciones: "Hogar y Servicios", servicios: "Hogar y Servicios", arriendo: "Hogar y Servicios",
    transporte: "Transporte", gasolina: "Transporte",
    hijos: "Familia", mascotas: "Familia", regalos: "Familia",
    salario: "Ingresos Principales", freelance: "Ingresos Principales", bonos: "Ingresos Principales"
  };
  function grupoDe(c) {
    if (c.grupo) return c.grupo;
    var g = GRUPO_POR_NOMBRE[sinTildes(c.nombre)];
    if (g) return g;
    return c.tipo === "ingreso" ? "Otros Ingresos" : "Otros";
  }

  // ---------- Modo conductor (Didi, Uber, inDrive…) ----------
  // Categorías que se crean al activar el modo conductor. Las ganancias de las apps van en el grupo
  // "Apps de transporte" y los gastos del vehículo en "Trabajo con vehículo".
  var CATEGORIAS_CONDUCTOR = [
    { nombre: "Didi", tipo: "ingreso", icono: "🚖", color: "#f97316", grupo: GRUPO_APPS },
    { nombre: "Uber", tipo: "ingreso", icono: "🚗", color: "#94a3b8", grupo: GRUPO_APPS },
    { nombre: "inDrive", tipo: "ingreso", icono: "🛺", color: "#22c55e", grupo: GRUPO_APPS },
    { nombre: "Cabify", tipo: "ingreso", icono: "🚕", color: "#8b5cf6", grupo: GRUPO_APPS },
    { nombre: "Otras apps", tipo: "ingreso", icono: "📱", color: "#64748b", grupo: GRUPO_APPS },
    { nombre: "Gasolina", tipo: "gasto", icono: "⛽", color: "#ef4444", grupo: GRUPO_TRABAJO },
    { nombre: "Tinto y comida en ruta", tipo: "gasto", icono: "☕", color: "#b45309", grupo: GRUPO_TRABAJO },
    { nombre: "Peajes", tipo: "gasto", icono: "🛣️", color: "#6366f1", grupo: GRUPO_TRABAJO },
    { nombre: "Parqueadero", tipo: "gasto", icono: "🅿️", color: "#0ea5e9", grupo: GRUPO_TRABAJO },
    { nombre: "Lavado", tipo: "gasto", icono: "🧽", color: "#06b6d4", grupo: GRUPO_TRABAJO },
    { nombre: "Mantenimiento y arreglos", tipo: "gasto", icono: "🔧", color: "#f59e0b", grupo: GRUPO_TRABAJO },
    { nombre: "Repuestos", tipo: "gasto", icono: "⚙️", color: "#78716c", grupo: GRUPO_TRABAJO },
    { nombre: "Llantas", tipo: "gasto", icono: "🛞", color: "#475569", grupo: GRUPO_TRABAJO },
    { nombre: "SOAT", tipo: "gasto", icono: "🛡️", color: "#3b82f6", grupo: GRUPO_TRABAJO },
    { nombre: "Tecnomecánica", tipo: "gasto", icono: "📋", color: "#14b8a6", grupo: GRUPO_TRABAJO },
    { nombre: "Impuesto del vehículo", tipo: "gasto", icono: "🧾", color: "#a855f7", grupo: GRUPO_TRABAJO },
    { nombre: "Seguro del vehículo", tipo: "gasto", icono: "🔒", color: "#1d4ed8", grupo: GRUPO_TRABAJO },
    { nombre: "Cuota del vehículo", tipo: "gasto", icono: "💳", color: "#0ea5e9", grupo: GRUPO_TRABAJO },
    { nombre: "Multas", tipo: "gasto", icono: "⚠️", color: "#be123c", grupo: GRUPO_TRABAJO }
  ];
  // Documentos y mantenimientos con fecha de vencimiento: cada cuántos meses se renuevan y en qué categoría se anota el gasto.
  var DOCUMENTOS = [
    { clave: "soat", tipo: "soat", nombre: "SOAT", meses: 12, categoria: "SOAT" },
    { clave: "tecnomecanica", tipo: "tecnomecanica", nombre: "Tecnomecánica", meses: 12, categoria: "Tecnomecánica" },
    { clave: "seguro-mensual", tipo: "seguro", nombre: "Seguro de la moto (cuota mensual)", meses: 1, categoria: "Seguro del vehículo" },
    { clave: "seguro-anual", tipo: "seguro", nombre: "Seguro todo riesgo (anual)", meses: 12, categoria: "Seguro del vehículo" },
    { clave: "cuota", tipo: "otro", nombre: "Cuota de la moto (crédito)", meses: 1, categoria: "Cuota del vehículo" },
    { clave: "impuesto", tipo: "impuesto", nombre: "Impuesto del vehículo", meses: 12, categoria: "Impuesto del vehículo" },
    { clave: "licencia", tipo: "licencia", nombre: "Licencia de conducción", meses: 36, categoria: "Multas" },
    { clave: "aceite", tipo: "aceite", nombre: "Cambio de aceite", meses: 3, categoria: "Mantenimiento y arreglos" },
    { clave: "revision", tipo: "revision", nombre: "Revisión y alineación", meses: 6, categoria: "Mantenimiento y arreglos" },
    { clave: "otro", tipo: "otro", nombre: "Otro", meses: 12, categoria: "Mantenimiento y arreglos" }
  ];
  // Con cuánta anticipación avisar según cada cuánto se renueva (una cuota mensual no se avisa 30 días antes).
  function avisoPorDefecto(meses) { return meses <= 1 ? 5 : meses <= 3 ? 15 : 30; }
  // El preset que le corresponde a un documento ya guardado (por tipo y nombre, o solo por tipo).
  function presetDe(doc) {
    return DOCUMENTOS.find(function (x) { return x.tipo === doc.tipo && x.nombre === doc.nombre; })
      || DOCUMENTOS.find(function (x) { return x.tipo === doc.tipo; }) || DOCUMENTOS[DOCUMENTOS.length - 1];
  }

  // Pagos grandes y poco frecuentes: no se descuentan de la ganancia del día, se muestran aparte.
  var FIJOS = ["SOAT", "Tecnomecánica", "Impuesto del vehículo", "Seguro del vehículo", "Cuota del vehículo"];
  function esFijo(c) { return !!c && FIJOS.indexOf(c.nombre) >= 0; }
  function esGanancia(c) { return !!c && c.tipo === "ingreso" && grupoDe(c) === GRUPO_APPS; }
  function esGastoTrabajo(c) { return !!c && c.tipo === "gasto" && grupoDe(c) === GRUPO_TRABAJO; }

  // Rango de la jornada: hoy, esta semana (lunes a domingo) o este mes.
  function rangoJornada(cual, ahora) {
    var d = inicioDia(ahora || new Date());
    if (cual === "semana") { var l = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)); return { desde: l, hasta: new Date(l.getFullYear(), l.getMonth(), l.getDate() + 7) }; }
    if (cual === "mes") return { desde: new Date(d.getFullYear(), d.getMonth(), 1), hasta: new Date(d.getFullYear(), d.getMonth() + 1, 1) };
    return { desde: d, hasta: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1) };
  }

  // Lo ganado con las apps, lo gastado en el vehículo y la ganancia neta en un rango.
  // pendientes: los movimientos "pendiente" no cuentan como plata que ya entró o salió.
  function resumenTrabajo(movs, categorias, rango) {
    var porId = {};
    categorias.forEach(function (c) { porId[c.id] = c; });
    var r = { ingresos: 0, gastos: 0, neto: 0, operacion: 0, fijos: 0, netoOperativo: 0, viajes: 0, porPlataforma: [], gastosPorCategoria: [], movimientos: 0 };
    var plat = {}, gas = {};
    movs.forEach(function (m) {
      var f = new Date(m.fecha);
      if (f < rango.desde || f >= rango.hasta || m.estado === "pendiente") return;
      var c = porId[m.categoria_id], v = num(m.monto);
      if (esGanancia(c) && m.tipo === "ingreso") {
        r.ingresos += v; r.viajes += num(m.viajes); r.movimientos++;
        var p = plat[c.id] = plat[c.id] || { id: c.id, total: 0, viajes: 0 };
        p.total += v; p.viajes += num(m.viajes);
      } else if (esGastoTrabajo(c) && m.tipo === "gasto") {
        r.gastos += v; r.movimientos++;
        if (esFijo(c)) r.fijos += v; else r.operacion += v;
        gas[c.id] = (gas[c.id] || 0) + v;
      }
    });
    r.neto = r.ingresos - r.gastos;                 // después de todo, incluidos papeles y cuotas
    r.netoOperativo = r.ingresos - r.operacion;     // lo que dejó trabajar: ganado menos gasolina, tinto, peajes, arreglos…
    r.porPlataforma = Object.keys(plat).map(function (k) { return plat[k]; }).sort(function (a, b) { return b.total - a.total; });
    r.gastosPorCategoria = Object.keys(gas).map(function (k) { return { id: Number(k), total: gas[k] }; }).sort(function (a, b) { return b.total - a.total; });
    r.porViaje = r.viajes > 0 ? r.ingresos / r.viajes : null;
    return r;
  }

  function parteFecha(fecha) { var p = String(fecha).slice(0, 10).split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  // Cuánto falta para que venza algo: { dias, estado: "vencido" | "pronto" | "ok", texto }.
  function estadoDocumento(doc, hoy) {
    var dias = Math.round((parteFecha(doc.vence) - inicioDia(hoy || new Date())) / DIA);
    var aviso = doc.aviso_dias == null ? 30 : doc.aviso_dias;
    var estado = dias < 0 ? "vencido" : dias <= aviso ? "pronto" : "ok";
    var texto = dias < 0 ? "Venció hace " + (-dias) + (dias === -1 ? " día" : " días") : dias === 0 ? "Vence hoy" : dias === 1 ? "Vence mañana" : "Vence en " + dias + " días";
    return { dias: dias, estado: estado, texto: texto };
  }
  // Suma meses a una fecha YYYY-MM-DD (el 31 de enero + 1 mes = 28 o 29 de febrero).
  function sumarMeses(fecha, n) {
    var p = String(fecha).slice(0, 10).split("-").map(Number), a = p[0], m = p[1] - 1 + n, d = p[2];
    var anio = a + Math.floor(m / 12), mes = ((m % 12) + 12) % 12;
    return claveDia(new Date(anio, mes, Math.min(d, new Date(anio, mes + 1, 0).getDate())));
  }
  // Al renovar: la nueva fecha cuenta desde el vencimiento (o desde hoy si ya había vencido).
  function proximoVencimiento(doc, hoy) {
    var h = claveDia(hoy || new Date()), v = String(doc.vence).slice(0, 10);
    return sumarMeses(v > h ? v : h, doc.repetir_meses || 12);
  }
  // Avisos del celular: cuando empieza el plazo de aviso, a los 15, 7, 3 y 1 días y el día del vencimiento.
  // Si ya venció, un aviso por día durante una semana hasta que se renueve. Solo futuros.
  // Cada aviso trae un id único: documento * 1000 + días que faltan (o 500 + n si ya venció).
  function avisosDocumentos(docs, ahora) {
    ahora = ahora || new Date();
    var out = [];
    docs.forEach(function (d) {
      var v = parteFecha(d.vence), aviso = d.aviso_dias == null ? 30 : d.aviso_dias;
      if (v < inicioDia(ahora)) {
        for (var k = 0; k < 7; k++) {
          var dia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + k, 9, 0, 0);
          if (dia <= ahora) continue;
          var atraso = Math.round((inicioDia(dia) - v) / DIA);
          out.push({ id: d.id * 1000 + 500 + k, docId: d.id, dias: -atraso, cuando: dia,
            titulo: d.nombre + " está vencido", texto: "Venció hace " + atraso + (atraso === 1 ? " día" : " días") + ". Renuévalo cuanto antes: circular sin los papeles al día puede traer multas." });
        }
        return;
      }
      [aviso, 15, 7, 3, 1, 0].forEach(function (x, i, todos) {
        if (x > aviso || todos.indexOf(x) !== i) return;
        var cuando = new Date(v.getFullYear(), v.getMonth(), v.getDate() - x, x === 0 ? 8 : 9, 0, 0);
        if (cuando <= ahora) return;
        out.push({ id: d.id * 1000 + x, docId: d.id, dias: x, cuando: cuando,
          titulo: x === 0 ? d.nombre + " vence hoy" : d.nombre + " vence en " + x + (x === 1 ? " día" : " días"),
          texto: x === 0 ? "No lo olvides: renuévalo hoy para no tener multas." : "Entra a NOVA para ver el detalle y anotar el pago cuando lo renueves." });
      });
    });
    return out.sort(function (a, b) { return a.cuando - b.cuando; });
  }

  // Avisos en el celular para las deudas con fecha de pago: 3 días antes, ese día y, si ya pasó, uno diario durante 3 días.
  // lista: lo que devuelve resumenDeudas().lista. Los ids van aparte de los de los documentos.
  function pesosTxt(n) { return "$ " + String(Math.round(Math.abs(Number(n) || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
  function avisosDeudas(lista, ahora) {
    ahora = ahora || new Date();
    var out = [];
    (lista || []).forEach(function (x) {
      if (!(x.falta > 0) || !x.deuda.vence) return;
      var d = x.deuda, v = parteFecha(d.vence), debo = d.tipo === "debo", base = 900000000 + (Number(d.id) || 0) * 100, quien = d.persona;
      if (v < inicioDia(ahora)) {
        var puestos = 0;
        for (var k = 0; k < 4 && puestos < 3; k++) {
          var dia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + k, 9, 0, 0);
          if (dia <= ahora) continue;
          puestos++;
          out.push({ id: base + 50 + k, deudaId: d.id, cuando: dia,
            titulo: debo ? "Se pasó la fecha de pago con " + quien : quien + " no te ha pagado",
            texto: (debo ? "Todavía debes " : "Todavía te debe ") + pesosTxt(x.falta) + "." });
        }
        return;
      }
      [3, 0].forEach(function (n) {
        var cuando = new Date(v.getFullYear(), v.getMonth(), v.getDate() - n, n === 0 ? 8 : 9, 0, 0);
        if (cuando <= ahora) return;
        out.push({ id: base + n, deudaId: d.id, cuando: cuando,
          titulo: n === 0 ? (debo ? "Hoy vence tu deuda con " + quien : "Hoy " + quien + " te debe pagar") : (debo ? "En 3 días vence tu deuda con " + quien : "En 3 días " + quien + " te debe pagar"),
          texto: (debo ? "Faltan " : "Te debe todavía ") + pesosTxt(x.falta) + ". Entra a NOVA para registrar el abono." });
      });
    });
    return out.sort(function (p, q) { return p.cuando - q.cuando; });
  }

  // ---------- Exportar ----------
  function csv(filas, columnas) {
    function celda(v) {
      var t = v == null ? "" : Array.isArray(v) ? v.join(" ") : String(v);
      // Evita que Excel tome como fórmula un texto que empieza por =, +, - o @.
      if (/^[=+\-@]/.test(t) && !/^-?\d/.test(t)) t = "'" + t;
      return /[";\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
    }
    var lineas = [columnas.map(function (c) { return celda(c.titulo); }).join(";")];
    filas.forEach(function (f) { lineas.push(columnas.map(function (c) { return celda(c.valor(f)); }).join(";")); });
    return "﻿" + lineas.join("\r\n");
  }

  // ---------- Deudas ----------
  // deudas: [{ id, tipo: "debo" | "me_deben", persona, monto, vence }], abonos: [{ deuda_id, monto, fecha }].
  // Devuelve cada deuda con lo abonado, lo que falta, el avance (0 a 1) y su estado, y los totales pendientes.
  function resumenDeudas(deudas, abonos, hoy) {
    var porDeuda = {};
    (abonos || []).forEach(function (a) { porDeuda[a.deuda_id] = (porDeuda[a.deuda_id] || 0) + num(a.monto); });
    var lista = (deudas || []).map(function (d) {
      var total = num(d.monto), abonado = Math.min(total, porDeuda[d.id] || 0), falta = Math.max(0, total - abonado);
      var estado = falta <= 0 ? "pagada" : "pendiente", dias = null;
      if (falta > 0 && d.vence) {
        dias = Math.round((parteFecha(d.vence) - inicioDia(hoy || new Date())) / DIA);
        if (dias < 0) estado = "vencida";
      }
      return { deuda: d, total: total, abonado: abonado, falta: falta, avance: total > 0 ? abonado / total : 0, estado: estado, dias: dias };
    });
    var t = { debo: 0, me_deben: 0, pendientes: 0 };
    lista.forEach(function (x) { if (x.falta > 0) { t[x.deuda.tipo] += x.falta; t.pendientes++; } });
    return { lista: lista, debo: t.debo, meDeben: t.me_deben, pendientes: t.pendientes, balance: t.me_deben - t.debo };
  }

  // ---------- Calendario ----------
  // Un mes día por día: cuánto se gastó y se ganó cada día, el día de más gasto y los días sin gastar.
  // nivel (0 a 4) dice qué tan fuerte pintar cada día comparado con el día de más gasto del mes.
  // Los movimientos pendientes no cuentan. Los días sin gastar se cuentan solo hasta hoy.
  function calendarioMes(movs, anio, mes, hoy) {
    var ultimo = new Date(anio, mes + 1, 0).getDate(), porClave = {};
    var dias = [];
    for (var d = 1; d <= ultimo; d++) {
      var dia = { clave: claveDia(new Date(anio, mes, d)), dia: d, gastos: 0, ingresos: 0, cantidad: 0, movimientos: [], nivel: 0, nivelIngreso: 0 };
      porClave[dia.clave] = dia; dias.push(dia);
    }
    movs.forEach(function (m) {
      if (m.estado === "pendiente") return;
      var dia = porClave[claveDia(m.fecha)];
      if (!dia) return;
      if (m.tipo === "ingreso") dia.ingresos += num(m.monto); else dia.gastos += num(m.monto);
      dia.cantidad++; dia.movimientos.push(m);
    });
    var hoyClave = claveDia(hoy || new Date()), max = 0, maxIng = 0, top = null, totalG = 0, totalI = 0, conGasto = 0, sinGasto = 0, transcurridos = 0;
    dias.forEach(function (x) {
      x.movimientos.sort(function (a, b) { return new Date(b.fecha) - new Date(a.fecha); });
      x.futuro = x.clave > hoyClave; x.hoy = x.clave === hoyClave;
      totalG += x.gastos; totalI += x.ingresos;
      if (x.gastos > max) { max = x.gastos; top = x; }
      if (x.ingresos > maxIng) maxIng = x.ingresos;
      if (x.gastos > 0) conGasto++;
      if (!x.futuro) { transcurridos++; if (x.gastos === 0) sinGasto++; }
    });
    dias.forEach(function (x) {
      x.nivel = x.gastos > 0 ? Math.max(1, Math.ceil((x.gastos / max) * 4)) : 0;
      x.nivelIngreso = x.ingresos > 0 ? Math.max(1, Math.ceil((x.ingresos / maxIng) * 4)) : 0;
    });
    return {
      anio: anio, mes: mes, nombre: MESES[mes] + " " + anio, dias: dias,
      hueco: (new Date(anio, mes, 1).getDay() + 6) % 7,   // días vacíos antes del 1 (la semana empieza el lunes)
      gastos: totalG, ingresos: totalI, diaTop: top, diasConGasto: conGasto, diasSinGasto: sinGasto,
      diasTranscurridos: transcurridos, promedioDiario: transcurridos ? totalG / transcurridos : 0
    };
  }

  var api = {
    calendarioMes: calendarioMes,
    desplazar: desplazar, nombrePeriodo: nombrePeriodo, nombreCorto: nombreCorto, enRango: enRango, totales: totales,
    porCategoria: porCategoria, porEtiqueta: porEtiqueta, vistaRapida: vistaRapida, serie: serie, proyeccion: proyeccion,
    seguroParaGastar: seguroParaGastar, nombreDia: nombreDia, porDia: porDia, claveDia: claveDia, buscar: buscar,
    sinTildes: sinTildes, evaluar: evaluar, FRECUENCIAS: FRECUENCIAS, siguienteFecha: siguienteFecha,
    fechasPendientes: fechasPendientes, GRUPOS: GRUPOS, grupoDe: grupoDe, csv: csv, MESES: MESES,
    GRUPO_APPS: GRUPO_APPS, GRUPO_TRABAJO: GRUPO_TRABAJO, CATEGORIAS_CONDUCTOR: CATEGORIAS_CONDUCTOR, DOCUMENTOS: DOCUMENTOS,
    avisoPorDefecto: avisoPorDefecto, presetDe: presetDe,
    esGanancia: esGanancia, esGastoTrabajo: esGastoTrabajo, esFijo: esFijo, rangoJornada: rangoJornada, resumenTrabajo: resumenTrabajo,
    estadoDocumento: estadoDocumento, sumarMeses: sumarMeses, proximoVencimiento: proximoVencimiento, avisosDocumentos: avisosDocumentos,
    resumenDeudas: resumenDeudas, avisosDeudas: avisosDeudas, racha: racha, saldosGrupo: saldosGrupo, cuotaMeta: cuotaMeta, proyeccionPeriodo: proyeccionPeriodo
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaAnalisis = api;
})(typeof window !== "undefined" ? window : this);
