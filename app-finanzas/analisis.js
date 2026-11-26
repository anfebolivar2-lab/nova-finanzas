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

  function rachaDias(movs, ahora) {
    var hoy = claveDia(ahora || new Date());
    var dias = Array.from(new Set(movs.map(function (m) {
      return m.fecha ? claveDia(m.fecha) : "";
    }).filter(function (dia) { return /^\d{4}-\d{2}-\d{2}$/.test(dia) && dia <= hoy; }))).sort();
    var record = 0, tramo = 0, anterior = "";
    dias.forEach(function (dia) {
      tramo = anterior && siguienteFecha(anterior, "diaria") === dia ? tramo + 1 : 1;
      record = Math.max(record, tramo);
      anterior = dia;
    });
    return { actual: racha(movs, ahora), record: record };
  }

  function hitoDeRacha(dias) {
    var hitos = [
      [3, "🌱", "¡Empezaste un buen hábito!"],
      [7, "🔥", "¡Una semana anotando!"],
      [14, "⭐", "¡Dos semanas de constancia!"],
      [30, "🏅", "¡Un mes seguido anotando!"],
      [60, "🏆", "¡Sesenta días cuidando tus cuentas!"],
      [100, "💎", "¡Cien días sin saltarte uno!"]
    ];
    for (var i = hitos.length - 1; i >= 0; i--) {
      var hito = hitos[i];
      if (dias >= hito[0]) return { dias: hito[0], emoji: hito[1], mensaje: hito[2] };
    }
    return null;
  }

  function franjaGasto(hora) {
    return hora >= 19 ? 3 : hora >= 15 ? 2 : hora >= 10 ? 1 : hora >= 5 ? 0 : -1;
  }

  function sugerenciasPorHora(movs, ahora) {
    var fechaActual = new Date(ahora || new Date()), franja = franjaGasto(fechaActual.getHours());
    if (franja < 0) return [];
    var grupos = new Map();
    movs.forEach(function (m) {
      if (m.tipo !== "gasto" || m.transferencia || m.programado_id || !(num(m.monto) > 0)) return;
      var fecha = new Date(m.fecha || ""), nombre = sinTildes(m.descripcion).trim().replace(/\s+/g, " ");
      if (!nombre || !(fecha <= fechaActual) || franjaGasto(fecha.getHours()) !== franja) return;
      var grupo = grupos.get(nombre);
      if (!grupo) {
        grupo = { movimiento: m, fecha: fecha, cantidad: 0 };
        grupos.set(nombre, grupo);
      }
      grupo.cantidad++;
      if (fecha > grupo.fecha) {
        grupo.fecha = fecha;
        grupo.movimiento = m;
      }
    });
    return Array.from(grupos.values()).filter(function (g) { return g.cantidad >= 2; })
      .sort(function (a, b) { return b.cantidad - a.cantidad || b.fecha - a.fecha; })
      .slice(0, 3).map(function (g) { return g.movimiento; });
  }

  function porcentajeValido(valor) {
    if (typeof valor === "number") return Number.isFinite(valor) && valor >= 0 ? valor : NaN;
    if (typeof valor !== "string" || !/^\+?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(valor.trim())) return NaN;
    var numero = Number(valor.trim().replace(",", "."));
    return Number.isFinite(numero) ? numero : NaN;
  }

  function tasaAnualDesdeMensual(tasa) {
    return Math.expm1(12 * Math.log1p(tasa / 100)) * 100;
  }

  function superaUsura(tasaEa, usura) {
    var tasa = porcentajeValido(tasaEa), limite = porcentajeValido(usura);
    return limite > 0 && tasa > limite;
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
  function saldosGrupo(miembros, gastos, soloSaldos) {
    var personas = new Map(), total = 0;
    function persona(nombre) {
      if (!personas.has(nombre)) personas.set(nombre, { nombre: nombre, pagado: 0, parte: 0, ajuste: 0 });
      return personas.get(nombre);
    }
    miembros.forEach(persona);
    gastos.forEach(function (g) {
      var monto = num(g.monto), pagador = persona(g.pagador);
      var reparto = Array.from(new Set(g.repartido && g.repartido.length ? g.repartido : miembros));
      if (!reparto.length) reparto.push(g.pagador);
      if (g.tipo === "pago") {
        pagador.ajuste += Math.round(monto);
        persona(reparto[0]).ajuste -= Math.round(monto);
        return;
      }
      total += monto;
      pagador.pagado += monto;
      reparto.forEach(function (n) { persona(n).parte += monto / reparto.length; });
    });
    var filas = Array.from(personas.values());
    total = Math.round(total);
    function repartirRestos(campo) {
      var faltan = total - filas.reduce(function (s, f) { return s + Math.floor(f[campo]); }, 0);
      var porResto = filas.slice().sort(function (a, b) {
        function resto(f) { return f[campo] - Math.floor(f[campo]); }
        return Math.round((resto(b) - resto(a)) * 1e9) || a.nombre.localeCompare(b.nombre);
      });
      porResto.forEach(function (f, i) {
        f[campo] = Math.floor(f[campo]) + (i < faltan ? 1 : 0);
      });
    }
    repartirRestos("pagado");
    repartirRestos("parte");
    filas.forEach(function (f) { f.saldo = f.pagado - f.parte + f.ajuste; });
    var saldos = Object.fromEntries(filas.map(function (f) { return [f.nombre, f.saldo]; }));
    return { total: total, filas: filas, saldos: saldos, transferencias: soloSaldos ? [] : pagosMinimosGrupo(filas.filter(function (f) { return f.saldo; })) };
  }

  function pagosMinimosGrupo(filas) {
    function liquidar(grupo) {
      var deben = grupo.filter(function (f) { return f.saldo < 0; }).map(function (f) { return { nombre: f.nombre, monto: -f.saldo }; });
      var cobran = grupo.filter(function (f) { return f.saldo > 0; }).map(function (f) { return { nombre: f.nombre, monto: f.saldo }; });
      var pagos = [], i = 0, j = 0;
      while (i < deben.length && j < cobran.length) {
        var monto = Math.min(deben[i].monto, cobran[j].monto);
        pagos.push({ de: deben[i].nombre, a: cobran[j].nombre, monto: monto });
        deben[i].monto -= monto;
        cobran[j].monto -= monto;
        if (!deben[i].monto) i++;
        if (!cobran[j].monto) j++;
      }
      return pagos;
    }

    var memo = new Map();
    function resolver(grupo) {
      var clave = JSON.stringify(grupo.map(function (f) { return f.nombre; }));
      if (memo.has(clave)) return memo.get(clave);
      var mejor = liquidar(grupo);
      var minimo = Math.max(grupo.filter(function (f) { return f.saldo < 0; }).length,
        grupo.filter(function (f) { return f.saldo > 0; }).length);
      if (mejor.length === minimo) return mejor;
      var pareja = grupo.find(function (f, i) { return i > 0 && f.saldo === -grupo[0].saldo; });
      if (pareja) {
        var separados = [grupo[0], pareja];
        mejor = liquidar(separados).concat(resolver(grupo.filter(function (f) { return separados.indexOf(f) < 0; })));
        memo.set(clave, mejor);
        return mejor;
      }
      var negativos = [0], positivos = [0];
      for (var i = grupo.length - 1; i >= 0; i--) {
        negativos.unshift(negativos[0] + Math.min(0, grupo[i].saldo));
        positivos.unshift(positivos[0] + Math.max(0, grupo[i].saldo));
      }
      // Cada componente de una liquidación suma cero. Probar las particiones
      // que contienen a la primera persona evita evaluar dos veces el mismo corte.
      function buscar(i, suma, parte, resto) {
        if (mejor.length === minimo || suma + negativos[i] > 0 || suma + positivos[i] < 0) return;
        if (suma === 0) {
          var otros = resto.concat(grupo.slice(i));
          if (otros.length) {
            var opcion = resolver(parte).concat(resolver(otros));
            if (opcion.length < mejor.length) mejor = opcion;
          }
        }
        if (i === grupo.length) return;
        var f = grupo[i];
        buscar(i + 1, suma + f.saldo, parte.concat(f), resto);
        buscar(i + 1, suma, parte, resto.concat(f));
      }
      buscar(1, grupo[0].saldo, [grupo[0]], []);
      memo.set(clave, mejor);
      return mejor;
    }
    return resolver(filas);
  }

  var TIPOS_DEDUCIBLES = [
    ["deducible-dependientes", "Dependientes"],
    ["deducible-vivienda", "Intereses de vivienda"],
    ["deducible-salud", "Medicina prepagada y salud"],
    ["deducible-pension-afc", "Aportes voluntarios a pensión/AFC"],
    ["deducible-otros", "Otros"]
  ];

  function tipoDeducible(etiquetas) {
    var tipo = TIPOS_DEDUCIBLES.find(function (t) { return (etiquetas || []).indexOf(t[0]) >= 0; });
    return tipo ? tipo[0] : "";
  }

  function etiquetasDeducible(etiquetas, tipo) {
    var lista = (etiquetas || []).filter(function (e) { return !tipoDeducible([e]); });
    if (tipoDeducible([tipo])) lista.push(tipo);
    return lista;
  }

  function anoDeducible(fecha) {
    return (/^\d{4}-\d{2}-\d{2}$/.test(fecha) ? parteFecha(fecha) : new Date(fecha || NaN)).getFullYear();
  }

  function deduciblesDelAno(movimientos, ano) {
    var filas = TIPOS_DEDUCIBLES.map(function (t) { return { tipo: t[0], nombre: t[1], total: 0 }; });
    movimientos.forEach(function (m) {
      if (!esGasto(m) || String(anoDeducible(m.fecha)) !== String(ano)) return;
      var tipo = tipoDeducible(m.etiquetas);
      var fila = filas.find(function (f) { return f.tipo === tipo; });
      if (fila) fila.total += num(m.monto);
    });
    return filas;
  }

  function mensajeRecordatorioDeuda(deuda, hoy) {
    if (deuda.tipo !== "me_deben" || !(deuda.falta > 0)) return "";
    var monto = new Intl.NumberFormat("es-CO", { style: "currency", currency: deuda.moneda || "COP", maximumFractionDigits: 2 }).format(deuda.falta);
    var texto = "Hola " + deuda.persona + ", ¿cómo estás? Te envío un recordatorio del pago pendiente por " + monto + ".";
    var vence = deuda.vence && parteFecha(deuda.vence);
    if (vence && !isNaN(vence)) {
      var dias = Math.round((vence - parteFecha(hoy instanceof Date ? claveDia(hoy) : hoy)) / DIA);
      var fecha = new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(vence);
      var plazo = dias === 0 ? " (hoy)" : !isFinite(dias) ? "" :
        " (" + (dias < 0 ? "hace " : "en ") + Math.abs(dias) + (Math.abs(dias) === 1 ? " día)" : " días)");
      texto += " Fecha de vencimiento: " + fecha + plazo + ".";
    }
    return texto + " ¿Me avisas cuándo te queda bien hacer el pago? ¡Gracias!";
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

  function esGasto(m) { return m.tipo === "gasto" && !m.transferencia; }

  function mayoresGastos(movs, ahora, n) {
    var gastos = enRango(movs.filter(esGasto), Periodos.periodo("mensual", ahora));
    var total = totales(gastos).gastos;
    return gastos.sort(function (a, b) { return num(b.monto) - num(a.monto); })
      .slice(0, n === undefined ? 5 : Math.max(0, n))
      .map(function (m) {
        var monto = num(m.monto);
        return { descripcion: m.descripcion, categoria_id: m.categoria_id, fecha: m.fecha,
          monto: monto, porcentaje: total > 0 ? monto / total * 100 : 0 };
      });
  }

  function resumenSemana(movs, ahora) {
    var hoy = inicioDia(ahora || new Date()), manana = new Date(hoy);
    manana.setDate(hoy.getDate() + 1);
    var semana = Periodos.periodo("semanal", hoy), anterior = desplazar("semanal", hoy, -1);
    var gastos = movs.filter(esGasto);
    var actuales = enRango(gastos, { desde: semana.desde, hasta: manana });
    var totalActual = totales(actuales).gastos, totalAnterior = totales(enRango(gastos, anterior)).gastos;
    var diferencia = totalActual - totalAnterior;
    var frase;
    if (!totalActual && !totalAnterior) frase = "No hay gastos en estas dos semanas.";
    else if (!totalAnterior) frase = "La semana pasada no anotaste gastos.";
    else if (diferencia > 0) frase = "Llevas más gasto que la semana pasada.";
    else if (diferencia < 0) frase = "Llevas menos gasto que la semana pasada.";
    else frase = "Llevas el mismo gasto que la semana pasada.";
    return { totalActual: totalActual, totalAnterior: totalAnterior, diferencia: diferencia,
      porcentaje: totalAnterior > 0 ? diferencia / totalAnterior * 100 : null,
      categoriaTop: porCategoria(actuales)[0] || null, frase: frase };
  }

  function ultimoGasto(movs) {
    var ultimo = null, fechaUltimo = -Infinity;
    movs.forEach(function (m) {
      if (!esGasto(m) || !m.fecha) return;
      var fecha = new Date(m.fecha).getTime();
      if (fecha > fechaUltimo) { ultimo = m; fechaUltimo = fecha; }
    });
    return ultimo;
  }

  function mesVsPromedio(movs, ahora, esFijoCategoria) {
    ahora = new Date(ahora === undefined ? new Date() : ahora);
    var anio = ahora.getFullYear(), mes = ahora.getMonth(), dia = ahora.getDate();
    var inicioMes = new Date(anio, mes, 1), inicioBase = new Date(anio, mes - 6, 1);
    var diasMes = new Date(anio, mes + 1, 0).getDate();
    var meses = new Set(), categorias = new Map();
    movs.forEach(function (m) {
      if (m.tipo !== "gasto" || m.transferencia) return;
      var fecha = new Date(m.fecha);
      if (!(fecha >= inicioBase && fecha <= ahora)) return;
      var id = m.categoria_id == null ? null : m.categoria_id;
      if (!categorias.has(id)) categorias.set(id, { actual: 0, base: 0, gastosPorMes: new Map() });
      var categoria = categorias.get(id);
      var monto = num(m.monto);
      if (fecha < inicioMes) {
        var mesBase = fecha.getFullYear() * 12 + fecha.getMonth();
        meses.add(mesBase);
        categoria.base += monto;
        categoria.gastosPorMes.set(mesBase, (categoria.gastosPorMes.get(mesBase) || 0) + 1);
        categoria.montoMenor = Math.min(categoria.montoMenor == null ? Infinity : categoria.montoMenor, monto);
        categoria.montoMayor = Math.max(categoria.montoMayor == null ? -Infinity : categoria.montoMayor, monto);
      } else {
        categoria.actual += monto;
      }
    });
    var mesesBase = meses.size;
    if (!mesesBase) return null;

    var filas = [], totalActual = 0, totalPromedio = 0, totalEsperado = 0;
    categorias.forEach(function (categoria, id) {
      var actual = categoria.actual, promedio = Math.round(categoria.base / mesesBase);
      var fijo = (typeof esFijoCategoria === "function" && esFijoCategoria(id) === true) ||
        (id !== null && categoria.gastosPorMes.size >= 2 &&
          categoria.montoMayor <= categoria.montoMenor * 1.2 &&
          Array.from(categoria.gastosPorMes.values()).every(function (cantidad) { return cantidad === 1; }));
      var esperado = fijo ? promedio : Math.round(promedio * dia / diasMes);
      totalActual += actual;
      totalPromedio += promedio;
      totalEsperado += esperado;
      if (actual > 0 || promedio > 0) {
        filas.push({ categoria_id: id, actual: actual, promedio: promedio, esperado: esperado, dif: actual - esperado, fijo: fijo });
      }
    });
    filas.sort(function (a, b) { return Math.abs(b.dif) - Math.abs(a.dif); });
    return { filas: filas, totalActual: totalActual, totalPromedio: totalPromedio, totalEsperado: totalEsperado, mesesBase: mesesBase, dia: dia, diasMes: diasMes };
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
  // El nombre de la categoría se puede resolver con el catálogo de la app.
  function filtrarMovimientos(movs, f, nombreCategoria) {
    f = f || {};
    var palabras = sinTildes(f.texto).replace(/#/g, "").split(/\s+/).filter(Boolean);
    var desde = f.desde ? new Date(f.desde + "T00:00:00") : null, hasta = f.hasta ? new Date(f.hasta + "T00:00:00") : null;
    if (hasta) hasta.setDate(hasta.getDate() + 1);
    var minimo = f.montoMin != null && f.montoMin !== "" ? Number(f.montoMin) : -Infinity;
    var maximo = f.montoMax != null && f.montoMax !== "" ? Number(f.montoMax) : Infinity;
    var r = movs.filter(function (m) {
      if (f.tipo && m.tipo !== f.tipo) return false;
      if (f.categoriaId != null && m.categoria_id !== f.categoriaId) return false;
      if (f.cuentaId != null && f.cuentaId !== "" && String(m.cuenta_id) !== String(f.cuentaId)) return false;
      if (!(num(m.monto) >= minimo && num(m.monto) <= maximo)) return false;
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

  function programadosProximos(programados, ahora, dias) {
    var desde = inicioDia(ahora || new Date());
    var limite = Number.isInteger(dias) && dias >= 0 ? dias : 1;
    var hasta = new Date(desde);
    hasta.setDate(hasta.getDate() + limite);
    return programados.filter(function (p) {
      return p.activo !== false && p.tipo !== "ingreso" && p.proxima;
    }).map(function (p) {
      var fecha = parteFecha(p.proxima);
      if (claveDia(fecha) !== String(p.proxima).slice(0, 10)) return null;
      return { programado: p, fecha: fecha, dias: Math.round((fecha - desde) / DIA) };
    }).filter(function (p) { return p && p.fecha >= desde && p.fecha <= hasta; })
      .sort(function (a, b) { return a.dias - b.dias; });
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

  function metaPorHora(metaDiaria, horas) {
    metaDiaria = Number(metaDiaria);
    horas = Number(horas);
    if (!Number.isFinite(metaDiaria) || !Number.isFinite(horas) || metaDiaria <= 0 || horas <= 0) return null;
    return Math.round(metaDiaria / horas);
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
  function csv(filas, columnas, separador) {
    separador = separador || ";";
    function celda(v) {
      var t = v == null ? "" : Array.isArray(v) ? v.join(" ") : String(v);
      // Evita que Excel tome como fórmula un texto que empieza por =, +, - o @.
      if (/^\s*[=+\-@]/.test(t) && !/^-?\d+(?:\.\d+)?$/.test(t)) t = "'" + t;
      return (/["\n\r]/.test(t) || t.indexOf(separador) >= 0) ? '"' + t.replace(/"/g, '""') + '"' : t;
    }
    var lineas = [columnas.map(function (c) { return celda(c.titulo); }).join(separador)];
    filas.forEach(function (f) { lineas.push(columnas.map(function (c) { return celda(c.valor(f)); }).join(separador)); });
    return "﻿" + lineas.join("\r\n");
  }

  function movimientosACsv(movs, categorias, cuentas) {
    var nombresCat = new Map(categorias.map(function (c) { return [c.id, c.nombre]; }));
    var nombresCuenta = new Map(cuentas.map(function (c) { return [c.id, c.nombre]; }));
    return csv(movs, [
      { titulo: "Fecha", valor: function (m) { return fechaAnotada(m.fecha); } },
      { titulo: "Tipo", valor: function (m) { return m.tipo === "ingreso" ? "Ingreso" : "Gasto"; } },
      { titulo: "Descripción", valor: function (m) { return m.descripcion; } },
      { titulo: "Categoría", valor: function (m) { return nombresCat.get(m.categoria_id) || "Sin categoría"; } },
      { titulo: "Cuenta", valor: function (m) { return nombresCuenta.get(m.cuenta_id) || ""; } },
      { titulo: "Monto", valor: function (m) { return (m.tipo === "ingreso" ? 1 : -1) * num(m.monto); } },
      { titulo: "Nota", valor: function (m) { return m.nota; } }
    ], ",");
  }

  function gestoDeslizar(dx, dy, umbral) {
    return dx <= -(umbral || 48) && -dx > Math.abs(dy);
  }

  function emojiPegado(valor) {
    var texto = valor.trim();
    var simbolo = "(?:\\p{Regional_Indicator}{2}|[#*0-9]\\uFE0F?\\u20E3|\\p{Extended_Pictographic}\\uFE0F?\\p{Emoji_Modifier}?)";
    return new RegExp("^" + simbolo + "(?:\\u200D" + simbolo + ")*$", "u").test(texto) ? texto : "";
  }

  function limpiarPapelera(papelera, ahora) {
    var limite = new Date(ahora).getTime() - 30 * DIA;
    return papelera.filter(function (e) { return e && new Date(e.borrado).getTime() >= limite; });
  }

  function agregarAPapelera(papelera, tabla, fila, ahora, id) {
    var entrada = { id: id, tabla: tabla, fila: JSON.parse(JSON.stringify(fila)), borrado: new Date(ahora).toISOString() };
    return [entrada].concat(limpiarPapelera(papelera, ahora).filter(function (e) {
      return e.tabla !== tabla || e.fila.id !== fila.id;
    }));
  }

  function remapearPapelera(papelera, mapa, tabla) {
    return papelera.map(function (entrada) {
      var fila = Object.assign({}, entrada.fila), cambio = false;
      Object.keys(fila).forEach(function (clave) {
        if (!(clave === "id" && entrada.tabla === tabla) && !/_id$/.test(clave)) return;
        if (!Object.prototype.hasOwnProperty.call(mapa, fila[clave])) return;
        fila[clave] = mapa[fila[clave]];
        cambio = true;
      });
      return cambio ? Object.assign({}, entrada, { fila: fila }) : entrada;
    });
  }

  function fechaAnotada(fecha) {
    return typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : claveDia(fecha);
  }

  function semanaDe(fecha) {
    var partes = fechaAnotada(fecha).split("-").map(Number);
    var lunes = new Date(partes[0], partes[1] - 1, partes[2]);
    lunes.setDate(lunes.getDate() - (lunes.getDay() + 6) % 7);
    var indice = Math.floor((Date.UTC(lunes.getFullYear(), lunes.getMonth(), lunes.getDate()) + 3 * DIA) / (7 * DIA));
    var desde = claveDia(lunes);
    lunes.setDate(lunes.getDate() + 7);
    return { indice: indice, desde: desde, hasta: claveDia(lunes) };
  }

  var RETOS = [
    { titulo: "Sin domicilios", patron: /\b(domicilios?|rappi|delivery)\b/ },
    { titulo: "Sin taxi ni Uber", patron: /\b(taxis?|uber|didi|indriver|cabify)\b/ },
    { titulo: "Cero antojos", patron: /\b(antojos?|dulces?|postres?|snacks?|cafeterias?)\b/ },
    { titulo: "Lleva el almuerzo de casa", patron: /\b(almuerzos?|restaurantes?|comidas? (?:fuera|rapidas?))\b/ },
    { titulo: "Planea un plan gratis", patron: /\b(entretenimiento|cine|ocio)\b/ },
    { titulo: "Deja las compras para después", patron: /\b(compras|ropa|zapatos)\b/ }
  ];

  function retoDeLaSemana(semana, categorias) {
    var opciones = RETOS.map(function (reto) {
      if (!categorias) return { titulo: reto.titulo };
      var elegibles = categorias.filter(function (c) { return c.tipo === "gasto" && reto.patron.test(sinTildes(c.nombre)); });
      return elegibles.length ? { titulo: reto.titulo, categorias: elegibles.map(function (c) { return c.id; }), nombre: elegibles.map(function (c) { return c.nombre; }).join(", ") } : null;
    }).filter(Boolean);
    if (!opciones.length) return null;
    return opciones[((semana % opciones.length) + opciones.length) % opciones.length];
  }

  function cumplioReto(reto, movs, desde) {
    if (!reto || !reto.categorias || !reto.categorias.length) return false;
    var semana = semanaDe(desde), inicio = fechaAnotada(desde);
    return !movs.some(function (m) {
      if (m.tipo !== "gasto" || reto.categorias.indexOf(m.categoria_id) < 0) return false;
      var fecha = fechaAnotada(m.fecha);
      return fecha >= inicio && fecha < semana.hasta;
    });
  }

  function actualizarRetos(historial, movs, semana) {
    return historial.map(function (r) {
      if (r.desde >= semana.desde || typeof r.cumplido === "boolean") return r;
      return Object.assign({}, r, { cumplido: cumplioReto(r.reto, movs, r.desde) });
    });
  }

  function remapearRetos(historial, mapa) {
    return historial.map(function (semana) {
      var ids = semana.reto.categorias;
      var nuevos = ids.map(function (id) { return mapa[id] === undefined ? id : mapa[id]; });
      if (ids.every(function (id, i) { return id === nuevos[i]; })) return semana;
      return Object.assign({}, semana, { reto: Object.assign({}, semana.reto, { categorias: nuevos }) });
    });
  }

  function insigniasReto(historial) {
    var total = historial.filter(function (r) { return r.cumplido === true; }).length;
    return { total: total, insignias: [1, 3, 5].filter(function (hito) { return total >= hito; }) };
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

  function evolucionDeuda(deuda, abonos) {
    var saldo = Math.max(0, num(deuda.monto));
    var puntos = [{ fecha: deuda.fecha, saldo: saldo }];
    abonos.filter(function (a) { return a.deuda_id === deuda.id && num(a.monto) > 0 && a.fecha; })
      .sort(function (a, b) { return String(a.fecha).localeCompare(String(b.fecha)) || num(a.id) - num(b.id); })
      .forEach(function (a) {
        saldo = Math.max(0, saldo - num(a.monto));
        puntos.push({ fecha: a.fecha, saldo: saldo });
      });
    return puntos;
  }

  // ---------- ¿Me alcanza? ----------
  // Si una compra cabe en la plata de la persona. Compara el precio con el saldo en cuentas y con lo que le sobra en un
  // mes normal (ingresos menos gastos de los últimos 3 meses completos, sin contar el mes actual).
  //   si:    le alcanza y aún le queda al menos lo que gasta en un mes (un colchón).
  //   justo: le alcanza, pero se quedaría con menos de lo que gasta en un mes.
  //   no:    no le alcanza; si ahorra, dice en cuántos meses lo junta.
  function alcanza(precio, movs, saldo, hoy) {
    hoy = hoy || new Date();
    precio = num(precio); saldo = num(saldo);
    var meses = [];
    for (var k = 1; k <= 3; k++) {
      var desde = new Date(hoy.getFullYear(), hoy.getMonth() - k, 1), hasta = new Date(hoy.getFullYear(), hoy.getMonth() - k + 1, 1);
      var t = totales(movs.filter(function (m) { var f = new Date(m.fecha); return m.estado !== "pendiente" && !m.transferencia && f >= desde && f < hasta; }));
      if (t.cantidad) meses.push(t);
    }
    var gastoMes = meses.length ? meses.reduce(function (s, t) { return s + t.gastos; }, 0) / meses.length : 0;
    var ahorroMes = meses.length ? meses.reduce(function (s, t) { return s + t.neto; }, 0) / meses.length : 0;
    var r = { precio: precio, saldo: saldo, quedaria: saldo - precio, gastoMes: Math.round(gastoMes), ahorroMes: Math.round(ahorroMes), mesesConDatos: meses.length };
    if (!(precio > 0)) { r.veredicto = "sin_precio"; return r; }
    if (saldo >= precio) {
      r.veredicto = r.quedaria >= gastoMes ? "si" : "justo";
      return r;
    }
    r.veredicto = "no";
    r.faltan = precio - saldo;
    if (ahorroMes > 0) {
      r.meses = Math.ceil(r.faltan / ahorroMes);
      var f = new Date(hoy.getFullYear(), hoy.getMonth() + r.meses, 1);
      r.cuando = f.toISOString();
    }
    return r;
  }

  // ---------- Suscripciones ----------
  // Cobros que se repiten cada mes con el mismo nombre (Netflix, Spotify, plan del celular, gimnasio…): se agrupan por
  // la descripción y cuentan si hay 2 o más, separados entre 25 y 35 días y por valores parecidos.
  // Dice cuánto suman al mes y al año, si alguno subió de precio y cuáles parecen cancelados (hace rato no se cobran).
  function nombreClave(t) { return sinTildes(t).replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim(); }
  function mediana(xs) { var s = xs.slice().sort(function (a, b) { return a - b; }), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
  function suscripciones(movs, hoy) {
    hoy = hoy || new Date();
    var desde = new Date(hoy.getTime() - 400 * DIA), grupos = {};
    movs.forEach(function (m) {
      if (m.tipo !== "gasto" || m.estado === "pendiente" || m.transferencia) return;
      var f = new Date(m.fecha);
      if (f < desde || f > hoy) return;
      var k = nombreClave(m.descripcion);
      if (k.length < 3) return;
      (grupos[k] = grupos[k] || []).push(m);
    });
    var lista = [];
    Object.keys(grupos).forEach(function (k) {
      var g = grupos[k].slice().sort(function (a, b) { return new Date(a.fecha) - new Date(b.fecha); });
      if (g.length < 2) return;
      var gaps = [];
      for (var i = 1; i < g.length; i++) gaps.push((new Date(g[i].fecha) - new Date(g[i - 1].fecha)) / DIA);
      var gap = mediana(gaps), montos = g.map(function (m) { return num(m.monto); });
      if (gap < 25 || gap > 35) return;
      if (Math.max.apply(null, montos) > Math.min.apply(null, montos) * 1.2) return;   // valores que cambian mucho (el mercado): no es una suscripción
      // Una suscripción cobra casi lo mismo cada vez (a veces sube el precio): al menos la mitad de los cobros seguidos
      // deben ser iguales (2 % de diferencia). Un gasto que cambia un poco cada mes (mercado, gasolina) no lo es.
      var iguales = 0;
      for (var j = 1; j < montos.length; j++) if (Math.abs(montos[j] - montos[j - 1]) <= Math.max(montos[j], montos[j - 1]) * 0.02) iguales++;
      if (iguales < Math.ceil((montos.length - 1) / 2)) return;
      var ultimo = g[g.length - 1], monto = num(ultimo.monto);
      // El precio de antes: el último cobro distinto al de ahora (si el cambio fue en los últimos 3 cobros).
      var k = g.length - 2;
      while (k >= 0 && Math.abs(montos[k] - monto) <= monto * 0.02) k--;
      var previo = k >= 0 && g.length - 1 - k <= 3 ? montos[k] : monto;
      var dias = (hoy - new Date(ultimo.fecha)) / DIA;
      lista.push({
        nombre: ultimo.descripcion, categoriaId: ultimo.categoria_id, monto: monto, anual: monto * 12, veces: g.length,
        ultimo: ultimo.fecha, proximo: (function () { var p = new Date(ultimo.fecha); p.setMonth(p.getMonth() + 1); return p.toISOString(); })(),   // el mismo día del mes siguiente
        subio: monto > previo * 1.03 ? monto - previo : 0, cancelada: dias > gap * 1.6, movimientos: g
      });
    });
    lista.sort(function (a, b) { return (a.cancelada - b.cancelada) || (b.monto - a.monto); });
    var activas = lista.filter(function (s) { return !s.cancelada; });
    var mensual = activas.reduce(function (s, x) { return s + x.monto; }, 0);
    return { lista: lista, activas: activas.length, mensual: mensual, anual: mensual * 12 };
  }

  // ---------- Calendario ----------
  // Un mes día por día: cuánto se gastó y se ganó cada día, el día de más gasto y los días sin gastar.
  // nivel (0 a 4) dice qué tan fuerte pintar cada día comparado con el día de más gasto del mes.
  // Los pendientes se listan sin sumarlos. Los días sin gastar se cuentan solo hasta hoy.
  // Totales de gastos pagados por fecha local. El mes se indica como "AAAA-MM".
  function totalesPorDia(movs, mes) {
    var dias = {};
    movs.forEach(function (m) {
      if (m.tipo !== "gasto" || m.estado === "pendiente") return;
      var clave = fechaAnotada(m.fecha);
      if (clave.slice(0, 7) === mes) dias[clave] = (dias[clave] || 0) + num(m.monto);
    });
    return dias;
  }

  function calendarioMes(movs, anio, mes, hoy) {
    var ultimo = new Date(anio, mes + 1, 0).getDate(), porClave = {};
    var gastos = totalesPorDia(movs, claveDia(new Date(anio, mes, 1)).slice(0, 7));
    var dias = [];
    for (var d = 1; d <= ultimo; d++) {
      var dia = { clave: claveDia(new Date(anio, mes, d)), dia: d, gastos: 0, ingresos: 0, cantidad: 0, movimientos: [], nivel: 0, nivelIngreso: 0 };
      dia.gastos = gastos[dia.clave] || 0;
      porClave[dia.clave] = dia; dias.push(dia);
    }
    movs.forEach(function (m) {
      var dia = porClave[fechaAnotada(m.fecha)];
      if (!dia) return;
      dia.movimientos.push(m);
      if (m.estado === "pendiente") return;
      if (m.tipo === "ingreso") dia.ingresos += num(m.monto);
      dia.cantidad++;
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

  function numeroLibertad(movs, ahorro, ahora) {
    var mesActual = ahora.getFullYear() * 12 + ahora.getMonth();
    var mesesConGastos = new Set(), total = 0;
    movs.forEach(function (m) {
      if (m.tipo !== "gasto" || m.transferencia) return;
      var fecha = new Date(m.fecha);
      var mes = fecha.getFullYear() * 12 + fecha.getMonth();
      if (mes >= mesActual - 6 && mes < mesActual) {
        mesesConGastos.add(mes);
        total += num(m.monto);
      }
    });
    var mesesConDatos = mesesConGastos.size;
    if (!mesesConDatos) return null;
    var gastoMensual = Math.round(total / mesesConDatos);
    if (gastoMensual === 0) return null;
    var meses = ahorro > 0 ? Math.round(ahorro / gastoMensual * 10) / 10 : 0;
    return { gastoMensual: gastoMensual, meses: meses, mesesConDatos: mesesConDatos, ahorro: ahorro };
  }

  function calorHoraDia(movs, desde, hasta) {
    var celdas = DIAS_SEMANA.map(function () {
      var fila = [];
      for (var i = 0; i < 6; i++) fila.push({ total: 0, cantidad: 0 });
      return fila;
    });
    var total = 0, pico = null;
    movs.forEach(function (m) {
      if (m.tipo !== "gasto" || m.transferencia) return;
      var fecha = new Date(m.fecha);
      if (!(fecha >= desde && fecha < hasta)) return;
      var celda = celdas[(fecha.getDay() + 6) % 7][Math.floor(fecha.getHours() / 4)];
      var monto = num(m.monto);
      celda.total += monto;
      celda.cantidad++;
      total += monto;
    });
    celdas.forEach(function (fila, dia) {
      fila.forEach(function (celda, franja) {
        if (celda.cantidad && (!pico || celda.total > pico.total)) {
          pico = { dia: dia, franja: franja, total: celda.total };
        }
      });
    });
    return pico ? { celdas: celdas, max: pico.total, total: total, pico: pico } : null;
  }

  // Saldos y mínimos por id de cuenta. Un mínimo de cero también activa el aviso.
  function cuentasBajas(cuentas, saldos, minimos) {
    return cuentas.reduce(function (avisos, cuenta) {
      var saldo = saldos[cuenta.id], minimo = minimos[cuenta.id];
      if (Number.isFinite(saldo) && Number.isFinite(minimo) && saldo < minimo) {
        avisos.push({ cuenta: cuenta, saldo: saldo, minimo: minimo });
      }
      return avisos;
    }, []);
  }

  // Cada presupuesto usa el gasto de su propio ciclo, por id de límite.
  function avisosLimite(presupuestos, gastos) {
    return presupuestos.reduce(function (avisos, limite) {
      var monto = num(limite.monto), gastado = num(gastos[limite.id]);
      if (monto > 0 && gastado / monto >= 0.8) {
        avisos.push({ limite: limite, gastado: gastado, nivel: gastado >= monto ? 100 : 80 });
      }
      return avisos;
    }, []);
  }

  function movimientosReales(movs) {
    return movs.filter(function (m) {
      return !m.transferencia && m.estado !== "pendiente" && (m.tipo === "gasto" || m.tipo === "ingreso");
    });
  }

  function movimientosHasta(movs, ahora) {
    return movimientosReales(movs).filter(function (m) { return m.fecha && new Date(m.fecha) <= ahora; });
  }

  function periodosRecientes(ciclo, ahora, cantidad) {
    return Array.from({ length: cantidad }, function (_, i) {
      return desplazar(ciclo, ahora, i - cantidad + 1);
    });
  }

  function balancePorPeriodo(movs, ahora, ciclo, cantidad) {
    var reales = movimientosHasta(movs, ahora);
    return periodosRecientes(ciclo, ahora, cantidad).map(function (rango) {
      return Object.assign({ desde: rango.desde, hasta: rango.hasta }, totales(enRango(reales, rango)));
    });
  }

  function ingresosGastos12(movs, ahora) {
    return balancePorPeriodo(movs, ahora, "mensual", 12);
  }

  function tendenciaCategorias(movs, ahora, n) {
    var meses = periodosRecientes("mensual", ahora, 6);
    var gastos = enRango(movimientosHasta(movs, ahora).filter(esGasto), {
      desde: meses[0].desde, hasta: meses[5].hasta
    });
    var porMes = meses.map(function (mes) {
      return new Map(porCategoria(enRango(gastos, mes)).map(function (fila) { return [fila.id, fila.total]; }));
    });
    return porCategoria(gastos).slice(0, n === undefined ? 5 : Math.max(0, n)).map(function (fila) {
      var serie = meses.map(function (mes, i) { return { desde: mes.desde, hasta: mes.hasta, total: porMes[i].get(fila.id) || 0 }; });
      var anterior = serie[4].total, diferencia = serie[5].total - anterior;
      return { id: fila.id, total: fila.total, meses: serie, diferencia: diferencia,
        porcentaje: anterior > 0 ? diferencia / anterior * 100 : null };
    });
  }

  function rankingComercios(movs, ahora, n) {
    var desde = inicioDia(ahora), grupos = new Map();
    desde.setDate(desde.getDate() - 89);
    movimientosHasta(movs, ahora).forEach(function (m) {
      if (!esGasto(m) || new Date(m.fecha) < desde) return;
      var nombre = sinTildes(m.descripcion).trim().replace(/[\s#-]*\d+$/, "").replace(/\s+/g, " ").trim();
      if (!grupos.has(nombre)) grupos.set(nombre, { nombre: nombre, total: 0, compras: 0 });
      var comercio = grupos.get(nombre);
      comercio.total += num(m.monto);
      comercio.compras++;
    });
    return Array.from(grupos.values()).sort(function (a, b) { return b.total - a.total; })
      .slice(0, n === undefined ? 8 : Math.max(0, n));
  }

  function comparaAnios(movs, ahora) {
    var anio = new Date(ahora).getFullYear(), anterior = anio - 1;
    var gastos = movimientosHasta(movs, ahora).filter(esGasto);
    var meses = MESES_CORTOS.map(function (etiqueta, mes) {
      function gastoDelMes(a) {
        return totales(enRango(gastos, Periodos.periodo("mensual", new Date(a, mes, 1)))).gastos;
      }
      return { etiqueta: etiqueta, actual: gastoDelMes(anio), anterior: gastoDelMes(anterior) };
    });
    var totalActual = meses.reduce(function (suma, mes) { return suma + mes.actual; }, 0);
    var totalAnterior = meses.reduce(function (suma, mes) { return suma + mes.anterior; }, 0);
    return { anio: anio, anioAnterior: anterior, meses: meses, totalActual: totalActual,
      totalAnterior: totalAnterior, diferencia: totalActual - totalAnterior };
  }

  function flujoSemanal(movs, ahora, semanas) {
    return balancePorPeriodo(movs, ahora, "semanal", semanas === undefined ? 8 : semanas);
  }

  function diaMasCaro(movs, ahora) {
    var gastos = movimientosHasta(movs, ahora).filter(esGasto);
    var fecha = new Date(ahora);
    var dia = calendarioMes(gastos, fecha.getFullYear(), fecha.getMonth(), fecha).diaTop;
    if (!dia) return null;
    return { fecha: new Date(fecha.getFullYear(), fecha.getMonth(), dia.dia), total: dia.gastos,
      gastos: dia.movimientos.sort(function (a, b) { return num(b.monto) - num(a.monto); }).slice(0, 3) };
  }

  // Recibe los saldos por id y el resumen de deudas con los abonos ya descontados.
  function patrimonioNeto(cuentas, saldos, deudas) {
    var activos = 0, pasivos = num(deudas.debo);
    cuentas.forEach(function (cuenta) {
      var saldo = num(saldos[cuenta.id]);
      activos += Math.max(0, saldo);
      pasivos += Math.max(0, -saldo);
    });
    return { activos: activos, pasivos: pasivos, neto: activos - pasivos };
  }

  function resumenMes(movs, ahora) {
    var enCurso = ahora.getDate() >= 25;
    var rango = desplazar("mensual", ahora, enCurso ? 0 : -1);
    var registrados = enRango(movimientosReales(movs), rango);
    if (enCurso) registrados = registrados.filter(function (m) { return new Date(m.fecha) <= ahora; });
    var t = totales(registrados);
    var categoriaTop = porCategoria(registrados)[0];
    var frase = "Aún no hay movimientos en este mes.";
    if (t.cantidad) {
      if (t.neto > 0) frase = "Te quedó plata para ahorrar.";
      else if (t.neto < 0) frase = "Gastaste más de lo que ganaste.";
      else frase = "Ganaste lo mismo que gastaste.";
    }
    return {
      mes: nombrePeriodo("mensual", rango), enCurso: enCurso, ingresos: t.ingresos, gastos: t.gastos,
      ahorro: t.neto, categoriaTop: categoriaTop, frase: frase
    };
  }

  function metaSugerida(movs, ahora) {
    var rango = { desde: desplazar("mensual", ahora, -3).desde, hasta: Periodos.periodo("mensual", ahora).desde };
    var promedio = totales(enRango(movimientosReales(movs), rango)).neto / 3;
    var monto = Math.round(promedio / 2000) * 1000;
    return { monto: monto > 0 ? monto : null, sobro: promedio > 0 };
  }

  function proximosCortes(tarjetas, ahora) {
    var hoy = new Date(ahora), anio = hoy.getFullYear(), mes = hoy.getMonth(), dia = hoy.getDate();
    var fechaHoy = Date.UTC(anio, mes, dia);
    function faltan(diaDelMes) {
      if (!Number.isInteger(diaDelMes) || diaDelMes < 1 || diaDelMes > 31) return null;
      var diaEsteMes = Math.min(diaDelMes, new Date(anio, mes + 1, 0).getDate());
      var fecha = diaEsteMes >= dia
        ? Date.UTC(anio, mes, diaEsteMes)
        : Date.UTC(anio, mes + 1, Math.min(diaDelMes, new Date(anio, mes + 2, 0).getDate()));
      return (fecha - fechaHoy) / DIA;
    }
    return tarjetas.map(function (t) {
      return { id: t.id, nombre: t.nombre, corte: faltan(t.diaCorte), pago: faltan(t.diaPago) };
    }).filter(function (t) { return t.corte !== null || t.pago !== null; });
  }

  function preguntasSugeridas(movs, metas, ahora) {
    var reales = movimientosReales(movs).filter(function (m) { return m.fecha && new Date(m.fecha) <= ahora; });
    var mes = totales(enRango(reales, Periodos.periodo("mensual", ahora)));
    var comparacion = mesVsPromedio(reales, ahora);
    var preguntas = [];
    if (comparacion && comparacion.totalActual > comparacion.totalEsperado) preguntas.push("¿Por qué gasté más este mes?");
    if (reales.some(function (m) { return m.tipo === "gasto"; })) preguntas.push("¿En qué categoría gasto más?");
    if (metas.length) preguntas.push("¿Cómo voy con mis metas?");
    if (mes.neto > 0) preguntas.push("¿Cuánto puedo ahorrar al mes?");
    return preguntas.concat([
      "¿Cómo empiezo a organizar mi plata?",
      "¿Cómo hago un presupuesto sencillo?",
      "¿Qué puedo hacer para ahorrar más?"
    ]).slice(0, 3);
  }

  function sumarMontoRapido(expr, monto) {
    var base = String(expr || "").replace(/[+−×÷-]$/, "").replace(/,$/, "");
    var nueva = base ? base + "+" + monto : String(monto);
    var total = evaluar(nueva);
    if (!Number.isFinite(total)) return expr;
    if (nueva.replace(/\D/g, "").length <= 15) return nueva;
    var resumida = String(total).replace(".", ",");
    return resumida.replace(/\D/g, "").length <= 15 && Number.isFinite(evaluar(resumida)) ? resumida : expr;
  }

  function sugerirDescripciones(movs, texto, n) {
    var prefijo = sinTildes(String(texto || "").trim());
    var usadas = new Map();
    movs.forEach(function (m) {
      var desc = String(m.descripcion || "").trim();
      var clave = sinTildes(desc);
      if (!clave || !clave.startsWith(prefijo)) return;
      if (!usadas.has(clave)) usadas.set(clave, { desc: desc, veces: 0 });
      usadas.get(clave).veces++;
    });
    return Array.from(usadas.values()).sort(function (a, b) {
      return b.veces - a.veces || a.desc.localeCompare(b.desc, "es");
    }).slice(0, n).map(function (d) { return d.desc; });
  }

  function gastosDeCuatroMeses(movs, ahora) {
    var mes = Periodos.periodo("mensual", ahora);
    var anteriores = { desde: desplazar("mensual", ahora, -3).desde, hasta: mes.desde };
    var gastos = movimientosReales(movs).filter(function (m) { return m.tipo === "gasto"; });
    return {
      actual: enRango(gastos, mes).filter(function (m) { return new Date(m.fecha) <= ahora; }),
      anteriores: enRango(gastos, anteriores),
      diasAnteriores: Math.round((anteriores.hasta - anteriores.desde) / DIA)
    };
  }

  function fondoEmergencia(movs, saldoDisponible, ahora) {
    var gastoMensual = totales(gastosDeCuatroMeses(movs, ahora).anteriores).gastos / 3;
    if (!(gastoMensual > 0)) return null;
    var saldo = Math.max(0, num(saldoDisponible));
    return { gastoMensual: gastoMensual, saldoDisponible: saldo, metas: [3, 6].map(function (meses) {
      var monto = gastoMensual * meses;
      return { meses: meses, monto: monto, falta: Math.max(0, monto - saldo), progreso: Math.min(1, saldo / monto) };
    }) };
  }

  var SERVICIOS = [
    { nombre: "Luz", palabras: /\b(luz|energia)\b/ },
    { nombre: "Agua", palabras: /\b(agua|acueducto)\b/ },
    { nombre: "Gas", palabras: /\bgas\b/ },
    { nombre: "Internet y celular", palabras: /\b(internet|celular|plan\s+de\s+datos|telefono)\b/ }
  ];

  function serviciosPorMes(movs, ahora) {
    var rangos = periodosRecientes("mensual", ahora, 4);
    var filas = SERVICIOS.map(function (s) {
      return { nombre: s.nombre, meses: rangos.map(function (r) { return { desde: r.desde, hasta: r.hasta, total: 0 }; }) };
    });
    function buscarServicio(texto) {
      var normalizado = sinTildes(texto);
      return SERVICIOS.findIndex(function (s) { return s.palabras.test(normalizado); });
    }
    movimientosHasta(movs, ahora).filter(esGasto).forEach(function (m) {
      var fecha = new Date(m.fecha);
      var mes = rangos.findIndex(function (r) { return fecha >= r.desde && fecha < r.hasta; });
      if (mes < 0) return;
      var servicio = buscarServicio(m.categoria);
      if (servicio < 0) servicio = buscarServicio(m.descripcion);
      if (servicio >= 0) filas[servicio].meses[mes].total += num(m.monto);
    });
    return filas.map(function (fila) {
      fila.diferencia = fila.meses[3].total - fila.meses[2].total;
      return fila;
    });
  }

  function promedioDia(movs, ahora) {
    var gastos = gastosDeCuatroMeses(movs, ahora);
    var actual = totales(gastos.actual).gastos / ahora.getDate();
    var anterior = totales(gastos.anteriores).gastos / gastos.diasAnteriores;
    var semaforo = actual <= anterior ? "verde" : actual * 100 <= anterior * 115 ? "amarillo" : "rojo";
    return { actual: actual, anterior: anterior, semaforo: semaforo };
  }

  function regla503020(movs, categorias, rango) {
    var nombres = new Map(categorias.map(function (c) { return [c.id, sinTildes(c.nombre).trim()]; }));
    var esenciales = ["hogar", "comida", "mercado", "comida/mercado", "transporte", "salud", "servicios", "educacion", "deudas"];
    var ingresos = 0, necesidades = 0, deseos = 0;
    enRango(movimientosReales(movs), rango).forEach(function (m) {
      if (m.tipo === "ingreso") ingresos += num(m.monto);
      else if (esenciales.indexOf(nombres.get(m.categoria_id)) >= 0) necesidades += num(m.monto);
      else deseos += num(m.monto);
    });
    function porcentaje(monto) { return ingresos > 0 ? monto / ingresos * 100 : null; }
    return {
      necesidades: porcentaje(necesidades),
      deseos: porcentaje(deseos),
      ahorro: porcentaje(Math.max(0, ingresos - necesidades - deseos))
    };
  }

  function gastosInusuales(movs, ahora) {
    var gastos = gastosDeCuatroMeses(movs, ahora);
    var anteriores = new Map(porCategoria(gastos.anteriores).map(function (c) { return [c.id, c.total / 3]; }));
    return porCategoria(gastos.actual).reduce(function (alertas, c) {
      var promedio = anteriores.get(c.id);
      if (promedio > 0 && c.total > 2 * promedio && c.total - promedio > 50000) {
        alertas.push({ categoriaId: c.id, veces: c.total / promedio });
      }
      return alertas;
    }, []);
  }

  function temaPorHora(fecha) {
    var hora = fecha.getHours();
    return hora >= 6 && hora < 18 ? "claro" : "oscuro";
  }

  function esperaBloqueo(minutos, ultimaActividad, ahora) {
    if ([1, 5, 15].indexOf(minutos) < 0) return null;
    return Math.max(0, minutos * 60000 - Math.max(0, ahora - ultimaActividad));
  }

  function totalLista(items, presupuesto) {
    var total = 0, comprado = 0;
    items.forEach(function (item) {
      var precio = Number(item.precio);
      if (!Number.isFinite(precio) || precio < 0) return;
      var centavos = Math.round(precio * 100);
      total += centavos;
      if (item.comprado) comprado += centavos;
    });
    var limite = Number.isFinite(presupuesto) && presupuesto > 0 ? Math.round(presupuesto * 100) : 0;
    return {
      total: total / 100,
      comprado: comprado / 100,
      saldo: (limite - total) / 100,
      porcentaje: limite ? Math.min(100, total / limite * 100) : 0
    };
  }

  function diaDePrueba(fecha) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return NaN;
    var marca = Date.parse(fecha + "T00:00:00Z");
    return Number.isFinite(marca) && new Date(marca).toISOString().slice(0, 10) === fecha ? marca / DIA : NaN;
  }

  function pruebasPorVencer(pruebas, ahora) {
    var hoy = diaDePrueba(claveDia(ahora));
    return pruebas.map(function (prueba) {
      return Object.assign({}, prueba, { dias: diaDePrueba(prueba.fecha) - hoy });
    }).filter(function (prueba) {
      return prueba.dias >= 0 && prueba.dias <= 3;
    }).sort(function (a, b) { return a.dias - b.dias; });
  }

  function avisoDiaPago(diaPago, movs, ahora) {
    var dia = Number(diaPago);
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) return false;
    var hoy = inicioDia(ahora);
    var ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);
    var fechaPago = [hoy, ayer].find(function (fecha) {
      var ultimo = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).getDate();
      return fecha.getDate() === Math.min(dia, ultimo);
    });
    if (!fechaPago) return false;
    var desde = claveDia(fechaPago), hasta = claveDia(hoy);
    return !movs.some(function (m) {
      if (m.tipo !== "ingreso" || m.transferencia) return false;
      var fecha = claveDia(m.fecha);
      return fecha >= desde && fecha <= hasta;
    });
  }

  function comprasParaCalificar(movs, calificaciones, ahora) {
    var hoy = diaDePrueba(claveDia(ahora));
    var gastos = movs.filter(function (m) {
      return esGasto(m) && num(m.monto) > 0 && diaDePrueba(claveDia(m.fecha)) <= hoy;
    });
    var minimo = Math.max(100000, 2 * mediana(gastos.map(function (m) { return num(m.monto); })));
    return gastos.filter(function (m) {
      return m.id != null && !Object.prototype.hasOwnProperty.call(calificaciones, m.id) &&
        num(m.monto) >= minimo && hoy - diaDePrueba(claveDia(m.fecha)) >= 30;
    }).sort(function (a, b) { return new Date(a.fecha) - new Date(b.fecha); });
  }

  function resumenCalificaciones(movs, calificaciones) {
    var calificadas = movs.filter(function (m) {
      return esGasto(m) && ["si", "regular", "no"].indexOf(calificaciones[m.id]) >= 0;
    });
    return {
      total: calificadas.length,
      noValieron: calificadas.filter(function (m) { return calificaciones[m.id] === "no"; })
        .sort(function (a, b) { return new Date(b.fecha) - new Date(a.fecha); })
    };
  }

  var CONSEJOS_AHORRO = {
    comida: "Cambia un domicilio a la semana por una comida preparada en casa.",
    mercado: "Haz una lista antes de ir al mercado y revisa qué tienes en casa.",
    transporte: "Agrupa tus vueltas en un solo viaje para pagar menos trayectos.",
    entretenimiento: "Cambia una salida paga por una actividad gratis.",
    hogar: "Compara precios de los productos de aseo por litro o por kilo.",
    servicios: "Revisa si puedes bajar de plan de internet o celular sin pagar una penalidad.",
    suscripciones: "Revisa tus cobros y cancela las suscripciones que ya no usas.",
    otros: "Revisa tus últimos gastos de esta categoría y elige uno que puedas evitar repetir."
  };

  function sugerenciasAhorro(movs, ahora, categorias) {
    var catalogo = new Map((categorias || []).map(function (c) { return [Number(c.id), c]; }));
    var mes = enRango(movs.filter(esGasto), Periodos.periodo("mensual", ahora));
    return porCategoria(mes).filter(function (c) { return c.total > 0; }).slice(0, 3).map(function (c) {
      var categoria = catalogo.get(c.id) || {};
      var nombre = sinTildes(categoria.nombre);
      var porGrupo = {
        "Comida y Bebida": "comida", "Transporte": "transporte", "Trabajo con vehículo": "transporte"
      };
      var clave = Object.prototype.hasOwnProperty.call(CONSEJOS_AHORRO, nombre) ? nombre : porGrupo[grupoDe(categoria)];
      return { categoriaId: c.id, ahorro: c.total / 10, consejo: CONSEJOS_AHORRO[clave] || CONSEJOS_AHORRO.otros };
    });
  }

  function resumenAnio(movs, anio) {
    var delAnio = enRango(movs, { desde: new Date(anio, 0, 1), hasta: new Date(anio + 1, 0, 1) })
      .filter(function (m) { return !m.transferencia && (m.tipo === "ingreso" || m.tipo === "gasto"); });
    if (!delAnio.length) return null;
    var t = totales(delAnio);
    var top = porCategoria(delAnio)[0];
    var meses = Array(12).fill(0);
    delAnio.filter(esGasto).forEach(function (m) { meses[new Date(m.fecha).getMonth()] += num(m.monto); });
    var mayor = Math.max.apply(null, meses);
    return {
      ingresos: t.ingresos, gastos: t.gastos, ahorro: t.neto,
      categoriaTop: top && top.total > 0 ? top : null,
      mesMasCaro: mayor > 0 ? MESES[meses.indexOf(mayor)] : null
    };
  }

  var api = {
    avisoDiaPago: avisoDiaPago, comprasParaCalificar: comprasParaCalificar, resumenCalificaciones: resumenCalificaciones,
    sugerenciasAhorro: sugerenciasAhorro, resumenAnio: resumenAnio,
    temaPorHora: temaPorHora, esperaBloqueo: esperaBloqueo, totalLista: totalLista,
    diaDePrueba: diaDePrueba, pruebasPorVencer: pruebasPorVencer,
    ingresosGastos12: ingresosGastos12, tendenciaCategorias: tendenciaCategorias, rankingComercios: rankingComercios,
    comparaAnios: comparaAnios, flujoSemanal: flujoSemanal, diaMasCaro: diaMasCaro, patrimonioNeto: patrimonioNeto,
    sumarMontoRapido: sumarMontoRapido, sugerirDescripciones: sugerirDescripciones,
    fondoEmergencia: fondoEmergencia, serviciosPorMes: serviciosPorMes,
    promedioDia: promedioDia, regla503020: regla503020, gastosInusuales: gastosInusuales,
    proximosCortes: proximosCortes, preguntasSugeridas: preguntasSugeridas,
    cuentasBajas: cuentasBajas, avisosLimite: avisosLimite, resumenMes: resumenMes, metaSugerida: metaSugerida,
    calorHoraDia: calorHoraDia, mayoresGastos: mayoresGastos, resumenSemana: resumenSemana, ultimoGasto: ultimoGasto,
    calendarioMes: calendarioMes, suscripciones: suscripciones, alcanza: alcanza, mesVsPromedio: mesVsPromedio, numeroLibertad: numeroLibertad,
    desplazar: desplazar, nombrePeriodo: nombrePeriodo, nombreCorto: nombreCorto, enRango: enRango, totales: totales,
    porCategoria: porCategoria, porEtiqueta: porEtiqueta, vistaRapida: vistaRapida, serie: serie, proyeccion: proyeccion,
    seguroParaGastar: seguroParaGastar, nombreDia: nombreDia, porDia: porDia, claveDia: claveDia, buscar: filtrarMovimientos, filtrarMovimientos: filtrarMovimientos,
    sinTildes: sinTildes, evaluar: evaluar, FRECUENCIAS: FRECUENCIAS, siguienteFecha: siguienteFecha,
    fechasPendientes: fechasPendientes, GRUPOS: GRUPOS, grupoDe: grupoDe, csv: csv, movimientosACsv: movimientosACsv, gestoDeslizar: gestoDeslizar, emojiPegado: emojiPegado,
    limpiarPapelera: limpiarPapelera, agregarAPapelera: agregarAPapelera, remapearPapelera: remapearPapelera, fechaAnotada: fechaAnotada,
    semanaDe: semanaDe, retoDeLaSemana: retoDeLaSemana, cumplioReto: cumplioReto,
    actualizarRetos: actualizarRetos, remapearRetos: remapearRetos, insigniasReto: insigniasReto, totalesPorDia: totalesPorDia, MESES: MESES,
    GRUPO_APPS: GRUPO_APPS, GRUPO_TRABAJO: GRUPO_TRABAJO, CATEGORIAS_CONDUCTOR: CATEGORIAS_CONDUCTOR, DOCUMENTOS: DOCUMENTOS,
    avisoPorDefecto: avisoPorDefecto, presetDe: presetDe,
    esGanancia: esGanancia, esGastoTrabajo: esGastoTrabajo, esFijo: esFijo, rangoJornada: rangoJornada, resumenTrabajo: resumenTrabajo, metaPorHora: metaPorHora,
    estadoDocumento: estadoDocumento, sumarMeses: sumarMeses, proximoVencimiento: proximoVencimiento, avisosDocumentos: avisosDocumentos,
    rachaDias: rachaDias, hitoDeRacha: hitoDeRacha, sugerenciasPorHora: sugerenciasPorHora,
    porcentajeValido: porcentajeValido, tasaAnualDesdeMensual: tasaAnualDesdeMensual, superaUsura: superaUsura, programadosProximos: programadosProximos,
    evolucionDeuda: evolucionDeuda, resumenDeudas: resumenDeudas, avisosDeudas: avisosDeudas, racha: racha, saldosGrupo: saldosGrupo, tiposDeducibles: TIPOS_DEDUCIBLES, tipoDeducible: tipoDeducible,
    etiquetasDeducible: etiquetasDeducible, anoDeducible: anoDeducible, deduciblesDelAno: deduciblesDelAno, mensajeRecordatorioDeuda: mensajeRecordatorioDeuda, cuotaMeta: cuotaMeta, proyeccionPeriodo: proyeccionPeriodo
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaAnalisis = api;
})(typeof window !== "undefined" ? window : this);
