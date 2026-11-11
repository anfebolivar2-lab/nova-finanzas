// Consejos, logros y calculadoras de NOVA. Todo se calcula en el dispositivo con tus propios movimientos.
(function (raiz) {
  "use strict";

  function num(v) { return Number(v) || 0; }
  function plata(n) { return "$ " + String(Math.round(Math.abs(num(n)))).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
  function dia(f) { var x = new Date(f); x.setHours(0, 0, 0, 0); return x; }
  function clave(f) { var x = new Date(f); return x.getFullYear() + "-" + (x.getMonth() + 1) + "-" + x.getDate(); }
  var DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  function gastos(movs) { return movs.filter(function (m) { return m.tipo === "gasto"; }); }
  function suma(l) { return l.reduce(function (s, m) { return s + num(m.monto); }, 0); }
  function enRango(movs, r) { return movs.filter(function (m) { var f = new Date(m.fecha); return f >= r.desde && f < r.hasta; }); }

  // Consejos del periodo. movs: movimientos del periodo; ant: del periodo anterior; todos: todos los movimientos.
  // ctx: { rango, ahora, saldo, categorias (para nombres) }
  function consejos(movs, ant, todos, ctx) {
    var out = [], ahora = new Date(ctx.ahora || new Date()), g = gastos(movs), ing = movs.filter(function (m) { return m.tipo === "ingreso"; });
    var totalG = suma(g), totalI = suma(ing), r = ctx.rango;
    var nombreCat = function (id) { var c = (ctx.categorias || []).filter(function (x) { return x.id === id; })[0]; return c ? c.nombre : "Sin categoría"; };
    if (!g.length) return out;

    // 1. Promedio por día
    var DIA = 86400000, fin = ahora < r.hasta ? ahora : r.hasta, transcurridos = Math.max(1, Math.ceil((fin - r.desde) / DIA));
    out.push({ id: "promedio", icono: "📊", titulo: "Gasto promedio por día", texto: "Gastas en promedio " + plata(totalG / transcurridos) + " al día." });

    // 2. Día de la semana más fuerte
    var porDia = [0, 0, 0, 0, 0, 0, 0];
    g.forEach(function (m) { porDia[new Date(m.fecha).getDay()] += num(m.monto); });
    var d = porDia.indexOf(Math.max.apply(null, porDia));
    out.push({ id: "dia", icono: "📅", titulo: "Tu día de más gasto", texto: "Gastas más los " + DIAS[d] + " (" + plata(porDia[d]) + " en total)." });

    // 3. Mayor gasto
    var may = g.slice().sort(function (a, b) { return num(b.monto) - num(a.monto); })[0];
    out.push({ id: "mayor", icono: "🏆", titulo: "Tu mayor gasto", texto: "«" + may.descripcion + "» por " + plata(may.monto) + "." });

    // 4. Gastos hormiga (compras chicas que se repiten)
    var chicos = g.filter(function (m) { return num(m.monto) <= 20000; });
    if (chicos.length >= 5) out.push({ id: "hormiga", icono: "🐜", titulo: "Gastos hormiga", texto: chicos.length + " compras pequeñas (hasta $ 20.000) suman " + plata(suma(chicos)) + ". Ojo: lo pequeño también pesa." });

    // 5. Comparación con el periodo anterior
    var gAnt = suma(gastos(ant));
    if (gAnt > 0) {
      var cambio = Math.round(((totalG - gAnt) / gAnt) * 100);
      out.push({ id: "vs", icono: cambio > 0 ? "📈" : "📉", titulo: "Frente al periodo anterior", texto: cambio === 0 ? "Gastaste lo mismo que el periodo anterior." : "Gastaste " + Math.abs(cambio) + " % " + (cambio > 0 ? "más" : "menos") + " que el periodo anterior (" + plata(gAnt) + ")." });
    }

    // 6. Tasa de ahorro
    if (totalI > 0) {
      var tasa = Math.round(((totalI - totalG) / totalI) * 100);
      out.push({ id: "ahorro", icono: "🐷", titulo: "Tu tasa de ahorro", texto: tasa >= 20 ? "Ahorraste el " + tasa + " % de tus ingresos. ¡Excelente!" : tasa >= 0 ? "Ahorraste el " + tasa + " % de tus ingresos. Una buena meta es el 20 %." : "Gastaste " + Math.abs(tasa) + " % más de lo que ingresó. Revisa tus gastos grandes." });
      // 12. Meta de ahorro sugerida
      out.push({ id: "meta10", icono: "🎯", titulo: "Una meta fácil", texto: "Si apartas el 10 % de tus ingresos, ahorrarías " + plata(totalI * 0.1) + " en este periodo." });
    }

    // 7. Cuántos días alcanza el saldo
    var ritmo = totalG / transcurridos;
    if (ctx.saldo > 0 && ritmo > 0) out.push({ id: "alcanza", icono: "⏳", titulo: "¿Cuánto te alcanza?", texto: "Con tu saldo de " + plata(ctx.saldo) + " y este ritmo de gasto te alcanza para unos " + Math.floor(ctx.saldo / ritmo) + " días." });

    // 8. Lo que más repites
    var cuenta = {};
    g.forEach(function (m) { var k = String(m.descripcion || "").trim().toLowerCase(); if (k) cuenta[k] = (cuenta[k] || 0) + 1; });
    var top = Object.keys(cuenta).sort(function (a, b) { return cuenta[b] - cuenta[a]; })[0];
    if (top && cuenta[top] >= 3) out.push({ id: "repite", icono: "🔁", titulo: "Lo que más repites", texto: "«" + top + "» aparece " + cuenta[top] + " veces en este periodo." });

    // 9. Hora fuerte
    var franjas = { "la madrugada": 0, "la mañana": 0, "la tarde": 0, "la noche": 0 };
    g.forEach(function (m) { var h = new Date(m.fecha).getHours(); franjas[h < 6 ? "la madrugada" : h < 12 ? "la mañana" : h < 19 ? "la tarde" : "la noche"] += num(m.monto); });
    var fz = Object.keys(franjas).sort(function (a, b) { return franjas[b] - franjas[a]; })[0];
    if (g.length >= 5) out.push({ id: "hora", icono: "🕒", titulo: "Cuándo gastas más", texto: "Sueles gastar más en " + fz + "." });

    // 10. Categoría que más creció
    var gAntLista = gastos(ant), mejor = null;
    var porCat = function (l) { var o = {}; l.forEach(function (m) { o[m.categoria_id] = (o[m.categoria_id] || 0) + num(m.monto); }); return o; };
    var actual = porCat(g), previa = porCat(gAntLista);
    Object.keys(actual).forEach(function (k) {
      if (previa[k] > 0 && actual[k] - previa[k] >= 20000) { var c = (actual[k] - previa[k]) / previa[k]; if (!mejor || c > mejor.c) mejor = { k: k, c: c }; }
    });
    if (mejor && mejor.c >= 0.2) out.push({ id: "crece", icono: "🔺", titulo: "Lo que más subió", texto: nombreCat(Number(mejor.k)) + " subió " + Math.round(mejor.c * 100) + " % frente al periodo anterior." });

    // 11. Días sin gastar
    var conGasto = {}; g.forEach(function (m) { conGasto[clave(m.fecha)] = true; });
    var sin = 0;
    for (var t = new Date(r.desde); t <= fin && t < r.hasta; t.setDate(t.getDate() + 1)) if (!conGasto[clave(t)]) sin++;
    if (sin >= 2) out.push({ id: "sin", icono: "🧘", titulo: "Días sin gastar", texto: "Llevas " + sin + " días sin gastos en este periodo." });

    // 13. Gastos fijos detectados (se repiten en 2 o más meses con valor parecido)
    var meses = {};
    gastos(todos).forEach(function (m) { var k = String(m.descripcion || "").trim().toLowerCase(), f = new Date(m.fecha); if (!k) return; (meses[k] = meses[k] || {})[f.getFullYear() * 12 + f.getMonth()] = num(m.monto); });
    var fijos = Object.keys(meses).filter(function (k) {
      var v = Object.keys(meses[k]).map(function (x) { return meses[k][x]; });
      return v.length >= 2 && v.every(function (x) { return Math.abs(x - v[0]) <= v[0] * 0.1 && x >= 20000; });
    });
    if (fijos.length) out.push({ id: "fijos", icono: "📌", titulo: "Gastos fijos que detecté", texto: fijos.slice(0, 4).map(function (k) { return k; }).join(", ") + (fijos.length > 4 ? " y más" : "") + ": se repiten cada mes con valor parecido." });

    // 14. Concentración
    var mayorCat = Object.keys(actual).sort(function (a, b) { return actual[b] - actual[a]; })[0];
    if (mayorCat && totalG > 0 && actual[mayorCat] / totalG >= 0.35) out.push({ id: "concentra", icono: "🥧", titulo: "Dónde se va tu plata", texto: Math.round((actual[mayorCat] / totalG) * 100) + " % de tus gastos va a «" + nombreCat(Number(mayorCat)) + "»." });

    // 15. Gastos fuera de lo normal en el periodo
    var raros = g.filter(function (m) { return gastoInusual(m, todos); });
    if (raros.length) out.push({ id: "raros", icono: "⚠️", titulo: "Gastos fuera de lo normal", texto: raros.length === 1 ? "«" + raros[0].descripcion + "» (" + plata(raros[0].monto) + ") se sale de lo que sueles gastar en esa categoría." : raros.length + " gastos se salen de lo que sueles gastar en su categoría, por ejemplo «" + raros[0].descripcion + "»." });

    return out;
  }

  // ¿Este gasto se sale de lo normal en su categoría? (más de 3 veces el promedio y al menos 50.000)
  function gastoInusual(nuevo, todos) {
    if (nuevo.tipo !== "gasto" || num(nuevo.monto) < 50000) return null;
    var mismos = gastos(todos).filter(function (m) { return m.categoria_id === nuevo.categoria_id && m.id !== nuevo.id; });
    if (mismos.length < 4) return null;
    var prom = suma(mismos) / mismos.length;
    return num(nuevo.monto) >= prom * 3 ? { promedio: prom, veces: num(nuevo.monto) / prom } : null;
  }

  // Tu semana (lunes a hoy) frente a la semana pasada.
  function semana(todos, ahora) {
    ahora = new Date(ahora || new Date());
    var lunes = dia(ahora); lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
    var pasada = new Date(lunes); pasada.setDate(pasada.getDate() - 7);
    var fin = new Date(lunes); fin.setDate(fin.getDate() + 7);
    var a = enRango(todos, { desde: lunes, hasta: fin }), b = enRango(todos, { desde: pasada, hasta: lunes });
    var gA = suma(gastos(a)), gB = suma(gastos(b));
    return { gastos: gA, ingresos: suma(a.filter(function (m) { return m.tipo === "ingreso"; })), anterior: gB, cambio: gB > 0 ? Math.round(((gA - gB) / gB) * 100) : null, movimientos: a.length };
  }

  // Logros (insignias) según tu uso.
  function logros(ctx) {
    var movs = ctx.movimientos || [], l = [];
    function add(id, icono, titulo, texto, hecho) { l.push({ id: id, icono: icono, titulo: titulo, texto: texto, hecho: !!hecho }); }
    add("primero", "🌱", "Primer paso", "Anota tu primer movimiento", movs.length >= 1);
    add("cien", "💯", "100 movimientos", "Anota 100 movimientos", movs.length >= 100);
    add("racha7", "🔥", "Una semana seguida", "Anota 7 días seguidos", ctx.racha >= 7);
    add("racha30", "🏅", "Un mes seguido", "Anota 30 días seguidos", ctx.racha >= 30);
    add("meta", "🎉", "Meta cumplida", "Completa una meta de ahorro", (ctx.metas || []).some(function (m) { return num(m.objetivo) > 0 && num(m.ahorrado) >= num(m.objetivo); }));
    add("deuda", "🕊️", "Libre de una deuda", "Paga una deuda completa", (ctx.deudasPagadas || 0) > 0);
    add("grupo", "👥", "Cuentas claras", "Crea un grupo de gastos compartidos", (ctx.grupos || 0) > 0);
    add("foto", "📷", "Con soporte", "Guarda la foto de un recibo", movs.some(function (m) { return m.foto_ruta; }));
    return l;
  }

  // Cuota fija de un crédito (sistema francés). tasa mensual en % (ej. 1.8).
  function cuotaCredito(monto, tasaMensualPct, meses) {
    var i = num(tasaMensualPct) / 100, n = Math.round(num(meses));
    if (!(monto > 0) || n < 1) return null;
    var cuota = i === 0 ? monto / n : (monto * i) / (1 - Math.pow(1 + i, -n));
    return { cuota: Math.round(cuota), total: Math.round(cuota * n), intereses: Math.round(cuota * n - monto) };
  }

  // Cuánto tendrás ahorrando una cuota mensual (con interés mensual opcional).
  function ahorroFuturo(mensual, meses, tasaMensualPct, inicial) {
    var i = num(tasaMensualPct) / 100, saldo = num(inicial);
    for (var k = 0; k < Math.round(num(meses)); k++) saldo = saldo * (1 + i) + num(mensual);
    var aportado = num(inicial) + num(mensual) * Math.round(num(meses));
    return { total: Math.round(saldo), aportado: Math.round(aportado), ganado: Math.round(saldo - aportado) };
  }

  // Regla 50/30/20: necesidades / gustos / ahorro.
  function regla503020(ingresos) { return { necesidades: Math.round(ingresos * 0.5), gustos: Math.round(ingresos * 0.3), ahorro: Math.round(ingresos * 0.2) }; }

  // Gasto por día del mes para el calendario de calor.
  function calendario(movs, rango) {
    var porDia = {};
    gastos(movs).forEach(function (m) { var k = clave(m.fecha); porDia[k] = (porDia[k] || 0) + num(m.monto); });
    var max = 0, dias = [];
    for (var t = new Date(rango.desde); t < rango.hasta; t.setDate(t.getDate() + 1)) { var v = porDia[clave(t)] || 0; if (v > max) max = v; dias.push({ fecha: new Date(t), valor: v }); }
    return { dias: dias, max: max };
  }

  // ---------- Salud financiera y calculadoras extra ----------
  function mesDe(f) { var x = new Date(f); return x.getFullYear() * 12 + x.getMonth(); }
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  function nombreMes(k) { return MESES[k % 12] + " " + Math.floor(k / 12); }

  // Promedio mensual de gasto en los últimos meses completos con datos (hasta 3).
  function gastoMensualPromedio(todos, ahora) {
    var actual = mesDe(ahora || new Date()), por = {};
    gastos(todos).forEach(function (m) { var k = mesDe(m.fecha); if (k < actual && k >= actual - 3) por[k] = (por[k] || 0) + num(m.monto); });
    var v = Object.keys(por).map(function (k) { return por[k]; });
    return v.length ? v.reduce(function (s, x) { return s + x; }, 0) / v.length : 0;
  }

  // Mejor y peor mes (por lo que sobra: ingresos menos gastos). Necesita al menos 2 meses con movimientos.
  function mejorPeorMes(todos) {
    var por = {};
    todos.forEach(function (m) { var k = mesDe(m.fecha); por[k] = (por[k] || 0) + (m.tipo === "ingreso" ? num(m.monto) : -num(m.monto)); });
    var ks = Object.keys(por).map(Number);
    if (ks.length < 2) return null;
    ks.sort(function (a, b) { return por[b] - por[a]; });
    return { mejor: { mes: nombreMes(ks[0]), neto: por[ks[0]] }, peor: { mes: nombreMes(ks[ks.length - 1]), neto: por[ks[ks.length - 1]] } };
  }

  // Salud financiera de 0 a 100: ahorro (40), fondo de emergencia (30) y deudas (30).
  // ctx: { ingresos, gastos (del periodo), saldo, gastoMensual, deudaPendiente }
  function salud(ctx) {
    var ing = num(ctx.ingresos), gas = num(ctx.gastos);
    var tasa = ing > 0 ? (ing - gas) / ing : null;
    var puntosAhorro = tasa == null ? 0 : Math.max(0, Math.min(1, tasa / 0.2)) * 40;
    var fondo = num(ctx.gastoMensual) > 0 ? Math.max(0, num(ctx.saldo)) / num(ctx.gastoMensual) : null;
    var puntosFondo = fondo == null ? 0 : Math.min(1, fondo / 3) * 30;
    var ratio = ing > 0 ? num(ctx.deudaPendiente) / ing : null;
    var puntosDeuda = num(ctx.deudaPendiente) === 0 ? 30 : ratio == null ? 0 : Math.max(0, 1 - ratio / 3) * 30;
    var puntaje = Math.round(puntosAhorro + puntosFondo + puntosDeuda);
    var nivel = puntaje >= 80 ? "Excelente" : puntaje >= 60 ? "Buena" : puntaje >= 40 ? "Regular" : "Para mejorar";
    var consejo = tasa != null && tasa < 0.1 ? "Lo que más te ayudaría: gastar un poco menos de lo que ingresa." : fondo != null && fondo < 3 ? "Lo que más te ayudaría: armar un fondo de emergencia de 3 meses de gastos." : num(ctx.deudaPendiente) > 0 ? "Lo que más te ayudaría: bajar tus deudas." : "¡Vas muy bien! Sigue así.";
    return { puntaje: puntaje, nivel: nivel, tasaAhorro: tasa, fondoMeses: fondo, ratioDeuda: ratio, consejo: consejo };
  }

  // IVA: de un valor sin IVA a con IVA (modo "mas") o al revés (modo "menos").
  function iva(valor, pct, modo) {
    var p = num(pct) / 100, v = num(valor);
    if (!(v > 0)) return null;
    if (modo === "menos") { var base = v / (1 + p); return { base: Math.round(base), iva: Math.round(v - base), total: Math.round(v) }; }
    return { base: Math.round(v), iva: Math.round(v * p), total: Math.round(v * (1 + p)) };
  }

  // Dividir la cuenta del restaurante con propina.
  function dividirCuenta(total, personas, propinaPct) {
    var t = num(total), n = Math.round(num(personas));
    if (!(t > 0) || n < 1) return null;
    var propina = t * num(propinaPct) / 100;
    return { propina: Math.round(propina), total: Math.round(t + propina), porPersona: Math.round((t + propina) / n) };
  }

  // ¿Cuánto cuesta un hábito? (veces por semana)
  function costoHabito(monto, vecesPorSemana) {
    var m = num(monto), v = num(vecesPorSemana);
    if (!(m > 0) || !(v > 0)) return null;
    var semana = m * v;
    return { semana: Math.round(semana), mes: Math.round(semana * 52 / 12), anio: Math.round(semana * 52) };
  }

  // ¿Contado o a cuotas? Compara el precio de contado con lo que pagarías en cuotas.
  function contadoVsCuotas(precio, cuotas, valorCuota) {
    var p = num(precio), n = Math.round(num(cuotas)), c = num(valorCuota);
    if (!(p > 0) || n < 1 || !(c > 0)) return null;
    var total = c * n, extra = total - p;
    var tasa = 0;
    if (extra > 0) {          // tasa mensual implícita: p = c · (1 - (1+i)^-n) / i
      var lo = 0, hi = 1;
      for (var k = 0; k < 80; k++) { var i = (lo + hi) / 2, vp = c * (1 - Math.pow(1 + i, -n)) / i; if (vp > p) lo = i; else hi = i; }
      tasa = (lo + hi) / 2;
    }
    return { total: Math.round(total), extra: Math.round(extra), tasaMensualPct: Math.round(tasa * 10000) / 100, conInteres: extra > 1 };
  }

  // CDT o ahorro a plazo con tasa efectiva anual (antes de impuestos).
  function cdt(monto, tasaEA, meses) {
    var m = num(monto), n = num(meses);
    if (!(m > 0) || !(n > 0)) return null;
    var ganancia = m * (Math.pow(1 + num(tasaEA) / 100, n / 12) - 1);
    return { ganancia: Math.round(ganancia), total: Math.round(m + ganancia) };
  }

  // Prima de servicios y cesantías estimadas (Colombia). Base mensual = salario + auxilio de transporte.
  function primaCesantias(salario, auxilio, dias) {
    var base = num(salario) + num(auxilio), d = Math.min(360, Math.max(0, Math.round(num(dias))));
    if (!(base > 0) || !(d > 0)) return null;
    var cesantias = base * d / 360;
    return { prima: Math.round(base * Math.min(d, 180) / 360), cesantias: Math.round(cesantias), intereses: Math.round(cesantias * d * 0.12 / 360) };
  }

  // ¿En cuánto tiempo salgo de una deuda pagando una cuota fija?
  function salirDeDeuda(saldo, tasaMensualPct, cuota) {
    var s = num(saldo), i = num(tasaMensualPct) / 100, c = num(cuota);
    if (!(s > 0) || !(c > 0)) return null;
    if (c <= s * i) return { imposible: true, minima: Math.ceil(s * i) + 1 };
    var meses = 0, total = 0;
    while (s > 0.5 && meses < 1200) { var interes = s * i, pago = Math.min(c, s + interes); s = s + interes - pago; total += pago; meses++; }
    return { meses: meses, total: Math.round(total) };
  }

  // Reto de ahorro de 52 semanas: la semana k ahorras k veces el valor base.
  function reto52(base, hechas) {
    var b = num(base), semanas = [], ahorrado = 0, total = 0;
    for (var k = 1; k <= 52; k++) { var hecho = (hechas || []).indexOf(k) >= 0; semanas.push({ semana: k, valor: b * k, hecho: hecho }); total += b * k; if (hecho) ahorrado += b * k; }
    return { semanas: semanas, ahorrado: ahorrado, total: total };
  }

  // ---------- Suscripciones, inflación personal, comparar meses, eventos e importar CSV ----------
  function mediana(v) { var s = v.slice().sort(function (a, b) { return a - b; }); return s.length ? s[Math.floor(s.length / 2)] : 0; }

  // Gastos que se repiten cada mes con valor parecido (3 o más de los últimos 6 meses).
  function suscripciones(todos, ahora) {
    var actual = mesDe(ahora || new Date()), por = {};
    gastos(todos).forEach(function (m) {
      var k = String(m.descripcion || "").trim().toLowerCase(), mes = mesDe(m.fecha);
      if (!k || mes > actual || mes < actual - 5) return;
      (por[k] = por[k] || { nombre: String(m.descripcion).trim(), meses: {} }).meses[mes] = num(m.monto);
    });
    var lista = [];
    Object.keys(por).forEach(function (k) {
      var ms = Object.keys(por[k].meses).map(Number).sort(function (a, b) { return a - b; });
      var vals = ms.map(function (x) { return por[k].meses[x]; }), med = mediana(vals);
      if (ms.length >= 3 && med >= 5000 && vals.every(function (v) { return Math.abs(v - med) <= med * 0.15; })) {
        lista.push({ nombre: por[k].nombre, monto: vals[vals.length - 1], meses: ms.length, anual: vals[vals.length - 1] * 12, ultimoMes: ms[ms.length - 1] });
      }
    });
    lista.sort(function (a, b) { return b.monto - a.monto; });
    return { lista: lista, mensual: lista.reduce(function (s, x) { return s + x.monto; }, 0) };
  }

  // Cuánto cambió el precio de lo que compras seguido (primera mitad frente a la segunda), con 4 compras o más en 60 días o más.
  function inflacionPersonal(todos) {
    var por = {};
    gastos(todos).forEach(function (m) { var k = String(m.descripcion || "").trim().toLowerCase(); if (k) (por[k] = por[k] || { nombre: String(m.descripcion).trim(), compras: [] }).compras.push({ f: new Date(m.fecha), v: num(m.monto) }); });
    var lista = [];
    Object.keys(por).forEach(function (k) {
      var c = por[k].compras.sort(function (a, b) { return a.f - b.f; });
      if (c.length < 4 || (c[c.length - 1].f - c[0].f) < 60 * 86400000) return;
      var mitad = Math.floor(c.length / 2), prom = function (l) { return l.reduce(function (s, x) { return s + x.v; }, 0) / l.length; };
      var antes = prom(c.slice(0, mitad)), ahora = prom(c.slice(mitad));
      if (antes > 0) lista.push({ nombre: por[k].nombre, antes: antes, ahora: ahora, cambioPct: Math.round(((ahora - antes) / antes) * 100), compras: c.length });
    });
    lista.sort(function (a, b) { return b.cambioPct - a.cambioPct; });
    var general = lista.length ? Math.round(lista.reduce(function (s, x) { return s + x.cambioPct; }, 0) / lista.length) : null;
    return { lista: lista, general: general };
  }

  // Meses (año*12+mes) que tienen movimientos, del más nuevo al más viejo.
  function mesesConDatos(todos) {
    var s = {}; todos.forEach(function (m) { s[mesDe(m.fecha)] = true; });
    return Object.keys(s).map(Number).sort(function (a, b) { return b - a; }).map(function (k) { return { clave: k, nombre: nombreMes(k) }; });
  }
  // Gastos por categoría de dos meses lado a lado.
  function compararMeses(todos, claveA, claveB) {
    function por(clave) { var o = {}; gastos(todos).forEach(function (m) { if (mesDe(m.fecha) === clave) o[m.categoria_id] = (o[m.categoria_id] || 0) + num(m.monto); }); return o; }
    var a = por(claveA), b = por(claveB), ids = {};
    Object.keys(a).concat(Object.keys(b)).forEach(function (k) { ids[k] = true; });
    var filas = Object.keys(ids).map(function (k) { return { categoria_id: Number(k), a: a[k] || 0, b: b[k] || 0, dif: (b[k] || 0) - (a[k] || 0) }; }).sort(function (x, y) { return Math.abs(y.dif) - Math.abs(x.dif); });
    var ta = filas.reduce(function (s, f) { return s + f.a; }, 0), tb = filas.reduce(function (s, f) { return s + f.b; }, 0);
    return { filas: filas, totalA: ta, totalB: tb, dif: tb - ta };
  }

  // Lo que costó todo lo marcado con una etiqueta (por ejemplo #viaje).
  function costoEvento(todos, etiqueta) {
    var l = gastos(todos).filter(function (m) { return (m.etiquetas || []).indexOf(etiqueta) >= 0; });
    if (!l.length) return null;
    var fechas = l.map(function (m) { return new Date(m.fecha); }).sort(function (a, b) { return a - b; });
    return { total: suma(l), cantidad: l.length, desde: fechas[0], hasta: fechas[fechas.length - 1], mayor: l.slice().sort(function (a, b) { return num(b.monto) - num(a.monto); })[0] };
  }
  function etiquetasUsadas(todos) {
    var o = {}; gastos(todos).forEach(function (m) { (m.etiquetas || []).forEach(function (t) { o[t] = (o[t] || 0) + 1; }); });
    return Object.keys(o).sort(function (a, b) { return o[b] - o[a]; });
  }

  // Lee un CSV de movimientos. Columnas (por nombre en la primera fila): fecha, descripcion/detalle/concepto, monto/valor, tipo (opcional), categoria (opcional).
  // Sin columna de tipo, un monto negativo es gasto y uno positivo es ingreso.
  function partirLinea(l, sep) {
    var out = [], cur = "", q = false;
    for (var i = 0; i < l.length; i++) {
      var ch = l[i];
      if (ch === '"') { if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
      else if (ch === sep && !q) { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out.map(function (x) { return x.trim(); });
  }
  function leerFecha(t) {
    t = String(t || "").trim();
    var m = t.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], 12);
    m = t.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/);
    if (m) { var y = +m[3]; if (y < 100) y += 2000; return new Date(y, +m[2] - 1, +m[1], 12); }
    return null;
  }
  function leerMonto(t) {
    t = String(t || "").replace(/[$\s]/g, "");
    if (!t) return NaN;
    var neg = /^-|^\(.*\)$/.test(t); t = t.replace(/[()-]/g, "");
    if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, "").replace(",", ".");
    else if (/\.\d{1,2}$/.test(t) && !/\.\d{3}/.test(t)) t = t.replace(/,/g, "");
    else t = t.replace(/[.,]/g, "");
    var v = Number(t);
    return isNaN(v) ? NaN : (neg ? -v : v);
  }
  function importarCSV(texto) {
    var lineas = String(texto || "").replace(/^\ufeff/, "").split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (lineas.length < 2) return { filas: [], errores: ["El archivo está vacío o solo trae la primera fila."] };
    var sep = (lineas[0].match(/;/g) || []).length > (lineas[0].match(/,/g) || []).length ? ";" : ",";
    var sinTild = function (s) { return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); };
    var cab = partirLinea(lineas[0], sep).map(sinTild);
    var col = function (nombres) { for (var i = 0; i < cab.length; i++) if (nombres.indexOf(cab[i]) >= 0) return i; return -1; };
    var cF = col(["fecha", "date"]), cD = col(["descripcion", "detalle", "concepto", "description"]), cM = col(["monto", "valor", "importe", "amount"]), cT = col(["tipo", "type"]), cC = col(["categoria", "category"]);
    if (cF < 0 || cD < 0 || cM < 0) return { filas: [], errores: ["La primera fila debe tener las columnas: fecha, descripcion y monto."] };
    var filas = [], errores = [];
    for (var i = 1; i < lineas.length; i++) {
      var p = partirLinea(lineas[i], sep), f = leerFecha(p[cF]), v = leerMonto(p[cM]), d = p[cD];
      if (!f || isNaN(v) || v === 0 || !d) { errores.push("Fila " + (i + 1) + ": no se entendió."); continue; }
      var tipo = cT >= 0 && /ingreso|income|entrada/.test(sinTild(p[cT])) ? "ingreso" : cT >= 0 && /gasto|expense|salida/.test(sinTild(p[cT])) ? "gasto" : (v < 0 ? "gasto" : "ingreso");
      if (cT < 0 && v > 0) tipo = "ingreso";
      filas.push({ fecha: f.toISOString(), descripcion: d.slice(0, 120), monto: Math.abs(v), tipo: tipo, categoria: cC >= 0 ? p[cC] : "" });
    }
    return { filas: filas, errores: errores };
  }

  // ---------- Pagos fijos, pronóstico, tu año, deudas, día de pago y redondeo ----------
  // Pagos fijos detectados y si ya se pagaron este mes.
  function pagosFijosMes(todos, ahora) {
    ahora = new Date(ahora || new Date());
    var mes = mesDe(ahora), s = suscripciones(todos, ahora).lista.filter(function (x) { return x.ultimoMes >= mes - 1; });
    var hechos = {};
    gastos(todos).forEach(function (m) { if (mesDe(m.fecha) === mes) hechos[String(m.descripcion || "").trim().toLowerCase()] = true; });
    var lista = s.map(function (x) { return { nombre: x.nombre, monto: x.monto, pagado: !!hechos[x.nombre.toLowerCase()] }; });
    return { lista: lista, pagados: lista.filter(function (x) { return x.pagado; }).length, faltan: lista.filter(function (x) { return !x.pagado; }).reduce(function (s2, x) { return s2 + x.monto; }, 0) };
  }

  // Pronóstico del próximo mes con el promedio de los últimos meses.
  function pronosticoMes(todos, ahora) {
    ahora = new Date(ahora || new Date());
    var actual = mesDe(ahora), ing = {}, gas = {};
    todos.forEach(function (m) { var k = mesDe(m.fecha); if (k >= actual || k < actual - 3) return; if (m.tipo === "ingreso") ing[k] = (ing[k] || 0) + num(m.monto); else gas[k] = (gas[k] || 0) + num(m.monto); });
    var prom = function (o) { var v = Object.keys(o).map(function (k) { return o[k]; }); return v.length ? v.reduce(function (s, x) { return s + x; }, 0) / v.length : 0; };
    var meses = Object.keys(gas).length;
    if (!meses) return null;
    var g = Math.round(prom(gas)), i = Math.round(prom(ing)), sig = actual + 1;
    return { mes: nombreMes(sig), gastos: g, ingresos: i, resultado: i - g, basadoEn: meses };
  }

  // Tu año en NOVA.
  function tuAnio(todos, anio) {
    var l = todos.filter(function (m) { return new Date(m.fecha).getFullYear() === anio; });
    if (!l.length) return null;
    var g = gastos(l), porCat = {}, dias = {};
    g.forEach(function (m) { porCat[m.categoria_id] = (porCat[m.categoria_id] || 0) + num(m.monto); });
    l.forEach(function (m) { dias[clave(m.fecha)] = true; });
    var top = Object.keys(porCat).sort(function (a, b) { return porCat[b] - porCat[a]; }).slice(0, 3).map(function (k) { return { categoria_id: Number(k), total: porCat[k] }; });
    var mp = mejorPeorMes(l);
    return { movimientos: l.length, gastos: suma(g), ingresos: suma(l.filter(function (m) { return m.tipo === "ingreso"; })), top: top, diasRegistrados: Object.keys(dias).length, mejorMes: mp ? mp.mejor.mes : null, mayor: g.slice().sort(function (a, b) { return num(b.monto) - num(a.monto); })[0] || null };
  }

  // Orden para pagar varias deudas: primero la más pequeña (bola de nieve).
  function bolaDeNieve(deudas) {
    var l = deudas.filter(function (d) { return d.falta > 0; }).sort(function (a, b) { return a.falta - b.falta; });
    return l.map(function (d, i) { return { orden: i + 1, persona: d.persona, falta: d.falta }; });
  }

  // Días que faltan para el próximo pago (día del mes) y cuánto puedes gastar por día hasta entonces.
  function diasParaPago(diaPago, ahora, saldo) {
    var hoy = dia(ahora || new Date()), d = Math.min(31, Math.max(1, Math.round(num(diaPago))));
    if (!diaPago) return null;
    var ultimo = function (y, m) { return new Date(y, m + 1, 0).getDate(); };
    var f = new Date(hoy.getFullYear(), hoy.getMonth(), Math.min(d, ultimo(hoy.getFullYear(), hoy.getMonth())));
    if (f <= hoy) f = new Date(hoy.getFullYear(), hoy.getMonth() + 1, Math.min(d, ultimo(hoy.getFullYear(), hoy.getMonth() + 1)));
    var dias = Math.round((f - hoy) / 86400000);
    return { dias: dias, fecha: f, porDia: saldo > 0 && dias > 0 ? Math.floor(saldo / dias) : 0 };
  }

  // Lo que sobra al redondear un gasto hacia arriba (a miles).
  function redondeo(monto, paso) {
    var m = num(monto), p = paso || 1000;
    if (!(m > 0)) return 0;
    return (Math.ceil(m / p) * p) - m;
  }

  // Categoría más usada con la misma descripción (al menos 2 veces).
  function sugerirCategoria(descripcion, tipo, todos) {
    var k = String(descripcion || "").trim().toLowerCase();
    if (k.length < 3) return null;
    var cuenta = {};
    todos.forEach(function (m) { if (m.tipo === tipo && String(m.descripcion || "").trim().toLowerCase() === k && m.categoria_id != null) cuenta[m.categoria_id] = (cuenta[m.categoria_id] || 0) + 1; });
    var ids = Object.keys(cuenta).sort(function (a, b) { return cuenta[b] - cuenta[a]; });
    return ids.length && cuenta[ids[0]] >= 2 ? Number(ids[0]) : null;
  }

  // ---------- Plan de quincena, lugares, semanas del mes, días sin gasto y metas de reducción ----------
  // Reparte un pago: pagos fijos pendientes, cuota de deuda, ahorro y lo que queda libre.
  function planQuincena(ingreso, op) {
    op = op || {};
    var ing = num(ingreso);
    if (!(ing > 0)) return null;
    var fijos = Math.min(ing, num(op.fijos)), deuda = Math.min(ing - fijos, num(op.cuotaDeuda));
    var ahorro = Math.min(ing - fijos - deuda, Math.round(ing * (op.pctAhorro == null ? 10 : num(op.pctAhorro)) / 100));
    var libre = ing - fijos - deuda - ahorro;
    return { fijos: fijos, deuda: deuda, ahorro: ahorro, libre: libre, alcanza: num(op.fijos) + num(op.cuotaDeuda) <= ing };
  }

  // Lugares donde más gastas (movimientos con ubicación guardada, agrupados cada ~100 m).
  function lugares(todos, limite) {
    var por = {};
    gastos(todos).forEach(function (m) {
      if (m.lat == null || m.lng == null || m.lat === "" || m.lng === "") return;
      var la = Number(m.lat), ln = Number(m.lng); if (isNaN(la) || isNaN(ln)) return;
      var k = la.toFixed(3) + "," + ln.toFixed(3), o = por[k] = por[k] || { lat: la, lng: ln, total: 0, veces: 0, nombres: {} };
      o.total += num(m.monto); o.veces++; var d = String(m.descripcion || "").trim(); if (d) o.nombres[d] = (o.nombres[d] || 0) + 1;
    });
    return Object.keys(por).map(function (k) {
      var o = por[k], n = Object.keys(o.nombres).sort(function (a, b) { return o.nombres[b] - o.nombres[a]; })[0];
      return { lat: o.lat, lng: o.lng, total: o.total, veces: o.veces, nombre: n || "Lugar sin nombre" };
    }).sort(function (a, b) { return b.total - a.total; }).slice(0, limite || 5);
  }

  // En qué parte del mes gastas más (días 1-7, 8-14, 15-21 y 22 en adelante).
  function semanasDelMes(todos) {
    var t = [0, 0, 0, 0];
    gastos(todos).forEach(function (m) { var d = new Date(m.fecha).getDate(); t[d <= 7 ? 0 : d <= 14 ? 1 : d <= 21 ? 2 : 3] += num(m.monto); });
    var total = t.reduce(function (s, x) { return s + x; }, 0);
    if (!total) return null;
    var nombres = ["Días 1 al 7", "Días 8 al 14", "Días 15 al 21", "Del 22 en adelante"];
    var filas = t.map(function (v, i) { return { nombre: nombres[i], total: v, pct: Math.round((v / total) * 100) }; });
    var i = t.indexOf(Math.max.apply(null, t));
    return { filas: filas, mayor: filas[i] };
  }

  // Días de este mes que ya terminaron sin ningún gasto (hoy no cuenta).
  function diasSinGasto(todos, ahora) {
    ahora = new Date(ahora || new Date());
    var hoy = dia(ahora), mes = mesDe(ahora), con = {};
    gastos(todos).forEach(function (m) { if (mesDe(m.fecha) === mes) con[new Date(m.fecha).getDate()] = true; });
    var n = 0;
    for (var d = 1; d < hoy.getDate(); d++) if (!con[d]) n++;
    return n;
  }

  // Meta de reducción de una categoría frente al periodo anterior.
  function progresoReduccion(movs, ant, categoriaId, pct) {
    var suma2 = function (l) { return gastos(l).filter(function (m) { return m.categoria_id === categoriaId; }).reduce(function (s, m) { return s + num(m.monto); }, 0); };
    var antes = suma2(ant), actual = suma2(movs);
    if (!(antes > 0)) return null;
    var meta = Math.round(antes * (1 - num(pct) / 100));
    return { antes: antes, actual: actual, meta: meta, ahorrado: Math.max(0, antes - actual), cumple: actual <= meta, faltaParaMeta: Math.max(0, actual - meta), uso: Math.round((actual / meta) * 100) };
  }

  // ---------- Historial de cambios y meta del grupo ----------
  var TABLAS_HIST = { movimientos: "movimiento", metas: "meta", deudas: "deuda", abonos: "abono", limites: "límite", cuentas: "cuenta" };
  var CAMPOS_HIST = [["descripcion", "nombre", false], ["nombre", "nombre", false], ["persona", "persona", false], ["monto", "valor", true], ["objetivo", "objetivo", true], ["ahorrado", "ahorrado", true], ["tipo", "tipo", false], ["fecha", "fecha", false], ["vence", "vence", false], ["estado", "estado", false], ["saldo_inicial", "saldo inicial", true]];
  // Convierte una fila del historial en una frase corta: «Editaste el movimiento "Tinto": valor $ 2.000 → $ 3.000».
  function describirCambio(h) {
    var obj = h.despues || h.antes || {}, tabla = TABLAS_HIST[h.tabla] || h.tabla;
    var nombre = obj.descripcion || obj.nombre || obj.persona || (obj.monto != null ? plata(obj.monto) : "");
    var verbo = h.accion === "crear" ? "Creaste" : h.accion === "borrar" ? "Borraste" : "Editaste";
    var artic = h.tabla === "cuentas" || h.tabla === "deudas" || h.tabla === "metas" ? "la" : "el";
    var texto = verbo + " " + artic + " " + tabla + (nombre ? " «" + nombre + "»" : "");
    var detalle = "";
    if (h.accion === "editar" && h.antes && h.despues) {
      var cambios = [];
      CAMPOS_HIST.forEach(function (c) {
        var a = h.antes[c[0]], d = h.despues[c[0]];
        if (a === undefined || String(a) === String(d)) return;
        cambios.push(c[1] + " " + (c[2] ? plata(a) + " → " + plata(d) : String(a == null ? "—" : a).slice(0, 30) + " → " + String(d == null ? "—" : d).slice(0, 30)));
      });
      if (!cambios.length) cambios.push("otros datos");
      detalle = cambios.slice(0, 3).join(" · ");
    } else if (h.accion === "borrar" && obj.monto != null) detalle = plata(obj.monto);
    else if (h.accion === "crear" && obj.monto != null) detalle = plata(obj.monto);
    return { texto: texto, detalle: detalle, icono: h.accion === "crear" ? "➕" : h.accion === "borrar" ? "🗑️" : "✏️" };
  }

  // Avance de la meta compartida de un grupo: total aportado, porcentaje y aporte de cada persona.
  function progresoMetaGrupo(objetivo, aportes, miembros) {
    var por = {}, total = 0;
    (miembros || []).forEach(function (m) { por[m] = 0; });
    (aportes || []).forEach(function (a) { por[a.persona] = (por[a.persona] || 0) + num(a.monto); total += num(a.monto); });
    var obj = num(objetivo);
    return { total: total, objetivo: obj, falta: Math.max(0, obj - total), pct: obj > 0 ? Math.min(100, Math.round((total / obj) * 100)) : 0, porPersona: por, cumplida: obj > 0 && total >= obj };
  }

  // ---------- Mensajes de bancos ----------
  // Convierte un mensaje de texto de un banco o billetera (Bancolombia, Nequi, Davivienda…) en una frase simple
  // ("gasté 45000 en Rappi") que el intérprete de NOVA ya sabe leer. Devuelve null si no parece un mensaje de banco.
  // opciones.deBanco: ya se sabe que viene de la app de un banco (aviso leído por NOVA), así que no hace falta que lo nombre.
  // Las compras rechazadas, los reversos, las claves y la publicidad no son movimientos: también dan null.
  function mensajeBancoATexto(texto, opciones) {
    var t = String(texto || "").replace(/\s+/g, " ").trim();
    if (t.length < 15) return null;
    var sin = t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    // Compras en otra moneda (tarjeta en el exterior, Amazon, Netflix…): "USD 25,99", "US$ 9,99", "€ 30", "15,50 EUR".
    var NUM = "(\\d{1,3}(?:[.,]\\d{3})*(?:[.,]\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?)";
    var ext = t.match(new RegExp("(US\\$|U\\$S|USD|EUR|€|£|GBP|R\\$|BRL|MXN|CAD)\\s?" + NUM, "i")) || t.match(new RegExp(NUM + "\\s?(USD|EUR|BRL|MXN|CAD|GBP)\\b", "i"));
    var monto = ext ? null : t.match(/\$\s?([\d]{1,3}(?:[.,]\d{3})+|\d+)(?:[.,]\d{1,2})?/);
    if (!monto && !ext) return null;
    var banco = (opciones && opciones.deBanco) || /bancolombia|nequi|davivienda|daviplata|bbva|banco de bogota|av villas|scotiabank|colpatria|nu |lulo|movii|bre-b|pse|tarjeta|t\.deb|t\.cre|cta|cuenta/.test(sin);
    var ingreso = /(recibiste|te llego|te llegaron|te enviaron|te consignaron|te transfirieron|abono|deposito|consignacion recibida|transferencia recibida|recargaste con exito|te pagaron)/.test(sin);
    var gasto = /(compra|pagaste|pago |retiro|transferiste|enviaste|debito|cargo|avance|transaccion|compraste)/.test(sin) || (!ingreso && /transferencia/.test(sin));
    if (!banco || !(ingreso || gasto)) return null;
    if (/rechaz|declin|fallid|no fue exitos|no exitos|no se pudo|no se realizo|revers|anulad|codigo de seguridad|codigo de verificacion|clave dinamica|clave temporal|\botp\b|no compartas|descuento|aprovecha|promocion|oferta|sorteo|participa|cashback|te invitamos|pre-?aprobad|gana hasta|black friday/.test(sin)) return null;
    var valor, moneda = "";
    if (ext) {
      var cod = (/\d/.test(ext[1]) ? ext[2] : ext[1]).toUpperCase(), cifra = /\d/.test(ext[1]) ? ext[1] : ext[2];
      moneda = " " + ({ "US$": "USD", "U$S": "USD", "€": "EUR", "£": "GBP", "R$": "BRL" }[cod] || cod);
      var dec = cifra.match(/[.,](\d{1,2})$/);   // los centavos van después del último punto o coma
      valor = Number((dec ? cifra.slice(0, -dec[0].length) : cifra).replace(/[.,]/g, "")) + (dec ? Number("0." + dec[1]) : 0);
    } else valor = Number(monto[1].replace(/[.,]/g, ""));
    if (!(valor > 0)) return null;
    var comercio = "";
    var L = "[\\p{L}\\d]", FIN = "(?=\\s+(?:el|a las|con|desde|tarjeta|t\\.|cta|saldo)(?![\\p{L}\\d])|[.,;:]|$)";
    var NOM = "(" + L + "[\\p{L}\\d .&'\\-]{1,30}?)";
    var m = t.match(new RegExp("(?<![\\p{L}\\d])en\\s+" + NOM + FIN, "iu"))
      || t.match(new RegExp("(?<![\\p{L}\\d])a\\s+(?:la cuenta de |nombre de )?(\\p{Lu}[\\p{L}\\d .&'\\-]{1,30}?)" + FIN, "u"))
      || t.match(new RegExp("(?<![\\p{L}\\d])de\\s+(\\p{Lu}[\\p{L}\\d .&'\\-]{1,30}?)" + FIN, "u"));
    if (m) comercio = m[1].trim();
    if (ingreso && !gasto) return "me pagaron " + valor + moneda + (comercio ? " de " + comercio : "");
    return "gasté " + valor + moneda + (comercio ? " en " + comercio : "");
  }

  var api = { consejos: consejos, gastoInusual: gastoInusual, semana: semana, logros: logros, cuotaCredito: cuotaCredito, ahorroFuturo: ahorroFuturo, regla503020: regla503020, calendario: calendario, plata: plata,
    gastoMensualPromedio: gastoMensualPromedio, mejorPeorMes: mejorPeorMes, salud: salud, iva: iva, dividirCuenta: dividirCuenta, costoHabito: costoHabito,
    contadoVsCuotas: contadoVsCuotas, cdt: cdt, primaCesantias: primaCesantias, salirDeDeuda: salirDeDeuda, reto52: reto52,
    suscripciones: suscripciones, inflacionPersonal: inflacionPersonal, mesesConDatos: mesesConDatos, compararMeses: compararMeses, costoEvento: costoEvento, etiquetasUsadas: etiquetasUsadas, importarCSV: importarCSV,
    pagosFijosMes: pagosFijosMes, pronosticoMes: pronosticoMes, tuAnio: tuAnio, bolaDeNieve: bolaDeNieve, diasParaPago: diasParaPago, redondeo: redondeo, sugerirCategoria: sugerirCategoria,
    planQuincena: planQuincena, lugares: lugares, semanasDelMes: semanasDelMes, diasSinGasto: diasSinGasto, progresoReduccion: progresoReduccion,
    describirCambio: describirCambio, progresoMetaGrupo: progresoMetaGrupo, mensajeBancoATexto: mensajeBancoATexto };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaConsejos = api;
})(typeof window !== "undefined" ? window : this);
