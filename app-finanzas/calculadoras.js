// Cálculos sin acceso a la pantalla ni a los datos guardados.
(function (raiz) {
  "use strict";

  // verificar cada año. Cada valor indica el año de su norma o referencia.
  var CONSTANTES = {
    salarioMinimo: { valor: 1750905, anio: 2026 }, // Decreto 159 de 2026
    auxilioTransporte: { valor: 249095, anio: 2026 }, // Decreto 1470 de 2025
    diasAnio: { valor: 360, anio: 2026 }, // Base comercial de la estimación
    diasMes: { valor: 30, anio: 2026 },
    interesesCesantias: { valor: 0.12, anio: 1975 }, // Ley 52
    horasMes: { valor: 240, anio: 2026 }, // Divisor de referencia editable, según jornada
    extraDiurna: { valor: 0.25, anio: 1950 }, // CST, art. 168
    extraNocturna: { valor: 0.75, anio: 1950 },
    nocturno: { valor: 0.35, anio: 1950 },
    festivo: [ // Ley 2466 de 2025, art. 14
      { valor: 80, anio: 2025, desde: "2025-07-01" },
      { valor: 90, anio: 2026, desde: "2026-07-01" },
      { valor: 100, anio: 2027, desde: "2027-07-01" }
    ],
    salud: { valor: 0.04, anio: 2007 }, // Ley 1122, art. 10
    pension: { valor: 0.04, anio: 2008 }, // Ley 797 de 2003 y Decreto 4982 de 2007
    umbralSolidaridad: { valor: 4, anio: 2003 }, // Ley 797, art. 7
    solidaridad: { valor: 0.01, anio: 2003 },
    gmf: { valor: 0.004, anio: 2014 }, // Estatuto Tributario, art. 872
    retencionCdt: { valor: 4 }, // Valor inicial de la simulación, editable según el banco
    uvt: { valor: 52374, anio: 2026 }, // Resolución DIAN 000238 de 2025
    topeAportePct: { valor: 30, referencia: "Estatuto Tributario, arts. 126-1 y 126-4" },
    topeAporteUvt: { valor: 3800, referencia: "Estatuto Tributario, arts. 126-1 y 126-4" },
    retiroAnual: { valor: 0.04, anio: 1994 } // Regla de ahorro, no es una norma legal
  };

  function noNegativos(valores) {
    return valores.every(function (v) { return Number.isFinite(v) && v >= 0; });
  }

  function fechaValida(fecha) {
    if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
    var d = new Date(fecha + "T00:00:00Z");
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === fecha;
  }

  // Cada mes ocupa 30 días. El 31 y el último día de febrero cierran su mes.
  function posicionComercial(fecha) {
    var anio = Number(fecha.slice(0, 4)), mes = Number(fecha.slice(5, 7)), dia = Number(fecha.slice(8));
    var ultimoFebrero = mes === 2 && new Date(fecha + "T00:00:00Z").getTime() + 86400000 === Date.parse(fecha.slice(0, 4) + "-03-01");
    return anio * CONSTANTES.diasAnio.valor + (mes - 1) * CONSTANTES.diasMes.valor +
      (ultimoFebrero ? CONSTANTES.diasMes.valor : Math.min(dia, CONSTANTES.diasMes.valor));
  }

  function diasComerciales(inicio, fin) {
    if (!fechaValida(inicio) || !fechaValida(fin) || fin < inicio) return null;
    return posicionComercial(fin) - posicionComercial(inicio) + 1;
  }

  function liquidacion(salario, auxilio, inicio, fin, vacacionesPendientes) {
    var dias = diasComerciales(inicio, fin);
    if (dias === null || !noNegativos([salario, auxilio, vacacionesPendientes])) return null;
    var base = salario + auxilio, diasAnio = CONSTANTES.diasAnio.valor;
    var cesantias = base * (dias / diasAnio), prima = cesantias;
    var intereses = 0;
    // El interés se liquida por cada año o fracción, sin acumular años anteriores.
    var primerAnio = Number(inicio.slice(0, 4)), ultimoAnio = Number(fin.slice(0, 4));
    for (var anio = primerAnio; anio <= ultimoAnio; anio++) {
      var prefijo = String(anio).padStart(4, "0");
      var fraccion = diasComerciales(anio === primerAnio ? inicio : prefijo + "-01-01",
        anio === ultimoAnio ? fin : prefijo + "-12-31") / diasAnio;
      intereses += base * fraccion * CONSTANTES.interesesCesantias.valor * fraccion;
    }
    var vacaciones = salario / CONSTANTES.diasMes.valor * vacacionesPendientes;
    var total = cesantias + intereses + prima + vacaciones;
    return Number.isFinite(total) ? { dias: dias, cesantias: cesantias, intereses: intereses, prima: prima, vacaciones: vacaciones, total: total } : null;
  }

  function recargoFestivo(fecha) {
    var etapas = CONSTANTES.festivo;
    for (var i = etapas.length - 1; i > 0; i--) {
      if (fecha >= etapas[i].desde) return etapas[i].valor;
    }
    return etapas[0].valor;
  }

  function horasExtra(salario, divisor, diurnas, nocturnas, recargo, festivas, festivoPct) {
    if (!noNegativos([salario, divisor, diurnas, nocturnas, recargo, festivas, festivoPct]) ||
        divisor === 0 || festivoPct > 100) return null;
    var hora = salario / divisor;
    var extraDiurna = hora * (1 + CONSTANTES.extraDiurna.valor) * diurnas;
    var extraNocturna = hora * (1 + CONSTANTES.extraNocturna.valor) * nocturnas;
    var recargoNocturno = hora * CONSTANTES.nocturno.valor * recargo;
    var dominicalFestivo = hora * (festivoPct / 100) * festivas;
    var total = extraDiurna + extraNocturna + recargoNocturno + dominicalFestivo;
    return Number.isFinite(total) ? { hora: hora, extraDiurna: extraDiurna, extraNocturna: extraNocturna,
      recargoNocturno: recargoNocturno, dominicalFestivo: dominicalFestivo, total: total } : null;
  }

  function salarioNeto(salario, auxilio, minimo) {
    if (!noNegativos([salario, auxilio, minimo]) || minimo === 0) return null;
    var salud = salario * CONSTANTES.salud.valor, pension = salario * CONSTANTES.pension.valor;
    var solidaridad = salario >= minimo * CONSTANTES.umbralSolidaridad.valor ? salario * CONSTANTES.solidaridad.valor : 0;
    var neto = salario + auxilio - salud - pension - solidaridad;
    return Number.isFinite(neto) ? { salud: salud, pension: pension, solidaridad: solidaridad, neto: neto } : null;
  }

  function gmf(monto) {
    return noNegativos([monto]) ? monto * CONSTANTES.gmf.valor : null;
  }

  // Recibe los movimientos ya filtrados por el periodo de Análisis.
  function gmfMovimientos(movimientos) {
    var egresos = 0;
    movimientos.forEach(function (m) {
      if (m.tipo !== "gasto" || m.estado === "pendiente") return;
      var monto = Number(m.monto);
      if (Number.isFinite(monto) && monto > 0) egresos += monto;
    });
    var impuesto = gmf(egresos);
    return impuesto === null ? null : { egresos: egresos, impuesto: impuesto };
  }

  var MESES_ANIO = 12, MAX_ANIOS = 100;

  function interesCompuesto(aporte, tasaAnualPct, anios) {
    if (!noNegativos([aporte, anios]) || !Number.isInteger(anios) || anios > MAX_ANIOS ||
        !Number.isFinite(tasaAnualPct) || tasaAnualPct < -100) return null;
    var tasaMensual = Math.expm1(Math.log1p(tasaAnualPct / 100) / MESES_ANIO);
    var saldo = 0, aportado = 0, tabla = [];
    for (var anio = 1; anio <= anios; anio++) {
      // El aporte entra al cierre de cada mes.
      for (var mes = 0; mes < MESES_ANIO; mes++) saldo += saldo * tasaMensual + aporte;
      aportado = aporte * MESES_ANIO * anio;
      if (!Number.isFinite(saldo) || !Number.isFinite(aportado)) return null;
      tabla.push({ anio: anio, saldo: saldo, aportado: aportado });
    }
    return { saldo: saldo, aportado: aportado, ganancia: saldo - aportado, tabla: tabla };
  }

  function reglaCuatro(gastosAnuales) {
    var capital = gastosAnuales / CONSTANTES.retiroAnual.valor;
    return noNegativos([gastosAnuales, capital]) ? capital : null;
  }

  function horasDeTrabajo(ingresoMensual, horasMensuales, precio) {
    if (!noNegativos([ingresoMensual, horasMensuales, precio]) || ingresoMensual === 0 || horasMensuales === 0) return null;
    var horas = precio / ingresoMensual * horasMensuales;
    return Number.isFinite(horas) ? { horas: horas, dias: horas / 8 } : null;
  }

  function cuotaCredito(monto, tasaEaPct, meses) {
    if (!noNegativos([monto, tasaEaPct]) || !Number.isSafeInteger(meses) || meses < 1) return null;
    var tasa = Math.log1p(tasaEaPct / 100) / MESES_ANIO;
    var cuota = tasa === 0 ? monto / meses : monto * (Math.expm1(tasa) / -Math.expm1(-meses * tasa));
    return Number.isFinite(cuota) ? cuota : null;
  }

  function costoCredito(monto, tasaEaPct, meses, seguroMensual) {
    var cuotaBase = cuotaCredito(monto, tasaEaPct, meses);
    if (cuotaBase === null || !noNegativos([seguroMensual])) return null;
    var cuota = cuotaBase + seguroMensual, total = cuota * meses;
    if (!Number.isFinite(total)) return null;
    return { cuotaBase: cuotaBase, cuota: cuota, total: total,
      intereses: Math.max(0, cuotaBase * meses - monto) };
  }

  function compararCreditos(ofertas) {
    if (!Array.isArray(ofertas) || ofertas.length < 2 || ofertas.length > 3) return null;
    var resultados = [];
    for (var i = 0; i < ofertas.length; i++) {
      var o = ofertas[i];
      if (!o || !(o.monto > 0)) return null;
      var r = costoCredito(o.monto, o.tasaEaPct, o.meses, o.seguroMensual === undefined ? 0 : o.seguroMensual);
      if (!r) return null;
      resultados.push(r);
    }
    var menor = Math.min.apply(null, resultados.map(function (r) { return r.total; }));
    var masBaratas = [];
    resultados.forEach(function (r, i) {
      if (r.total - menor <= Number.EPSILON * menor * 4) masBaratas.push(i);
    });
    return { ofertas: resultados, masBaratas: masBaratas };
  }

  function creditoVivienda(valor, inicialPct, tasaEaPct, anios, seguroVida, seguroBien) {
    if (!noNegativos([valor, inicialPct, seguroVida, seguroBien]) || valor === 0 || inicialPct >= 100 ||
        !Number.isFinite(anios)) return null;
    var inicial = valor * (inicialPct / 100), monto = valor - inicial;
    var r = costoCredito(monto, tasaEaPct, anios * MESES_ANIO, seguroVida + seguroBien);
    if (!r || !Number.isFinite(inicial + r.total)) return null;
    return { monto: monto, cuotaBase: r.cuotaBase, cuotaConSeguros: r.cuota, total: inicial + r.total };
  }

  function compraCartera(saldo, tasaActualEaPct, meses, tasaNuevaEaPct, costos) {
    if (!noNegativos([saldo, costos]) || saldo === 0) return null;
    var actual = costoCredito(saldo, tasaActualEaPct, meses, 0);
    var nuevo = costoCredito(saldo, tasaNuevaEaPct, meses, 0);
    if (!actual || !nuevo || !Number.isFinite(nuevo.total + costos)) return null;
    var totalNuevo = nuevo.total + costos, ahorro = actual.total - totalNuevo;
    if (Math.abs(ahorro) <= Number.EPSILON * Math.max(actual.total, totalNuevo) * 4) ahorro = 0;
    return { totalActual: actual.total, totalNuevo: totalNuevo, ahorro: ahorro, conviene: ahorro > 0 };
  }

  function rendimientoCdt(monto, tasaEaPct, dias, retencionPct) {
    if (retencionPct === undefined) retencionPct = CONSTANTES.retencionCdt.valor;
    if (!noNegativos([monto, tasaEaPct, retencionPct]) || monto === 0 ||
        !Number.isInteger(dias) || dias <= 0 || retencionPct > 100) return null;
    var bruto = monto * Math.expm1(Math.log1p(tasaEaPct / 100) * dias / 365);
    if (!Number.isFinite(bruto)) return null;
    var retencion = bruto * (retencionPct / 100);
    return { bruto: bruto, retencion: retencion, neto: bruto - retencion };
  }

  function compararCdt(ofertas) {
    if (!Array.isArray(ofertas) || ofertas.length < 2 || ofertas.length > 3) return null;
    var resultados = Array.from(ofertas, function (oferta) {
      return oferta && rendimientoCdt(oferta.monto, oferta.tasaEaPct, oferta.dias, oferta.retencionPct);
    });
    if (resultados.some(function (r) { return !r; })) return null;
    var maximo = Math.max.apply(null, resultados.map(function (r) { return r.neto; }));
    var mejores = [];
    resultados.forEach(function (r, i) {
      if (Math.abs(maximo - r.neto) <= Number.EPSILON * maximo * 4) mejores.push(i);
    });
    return { resultados: resultados, mejores: mejores };
  }

  function ahorroTributarioAporte(ingreso, aporte, uvt, tarifaPct, topePct, topeUvt) {
    if (topePct === undefined) topePct = CONSTANTES.topeAportePct.valor;
    if (topeUvt === undefined) topeUvt = CONSTANTES.topeAporteUvt.valor;
    if (!noNegativos([ingreso, aporte, uvt, tarifaPct, topePct, topeUvt]) ||
        uvt === 0 || tarifaPct > 100 || topePct > 100) return null;
    var limite = Math.min(ingreso * (topePct / 100), uvt * topeUvt);
    var montoExento = Math.min(aporte, limite);
    return { limite: limite, montoExento: montoExento, ahorro: montoExento * (tarifaPct / 100) };
  }

  function ivaPrecio(precio, tarifaPct, incluido) {
    if (!noNegativos([precio, tarifaPct])) return null;
    var tarifa = tarifaPct / 100;
    var iva = Math.round(precio * (incluido ? tarifa / (1 + tarifa) : tarifa));
    var base = Math.round(precio) - (incluido ? iva : 0);
    var total = base + iva;
    return Number.isSafeInteger(total) ? { base: base, iva: iva, total: total } : null;
  }

  function ivaPeriodo(generado, descontable) {
    if (!noNegativos([generado, descontable])) return null;
    var diferencia = generado - descontable;
    var saldo = Math.round(Math.abs(diferencia));
    if (!Number.isSafeInteger(saldo)) return null;
    return diferencia < 0 && saldo > 0 ? -saldo : saldo;
  }

  var api = { CONSTANTES: CONSTANTES, MAX_ANIOS: MAX_ANIOS, diasComerciales: diasComerciales, liquidacion: liquidacion,
    recargoFestivo: recargoFestivo, horasExtra: horasExtra, salarioNeto: salarioNeto, gmf: gmf,
    gmfMovimientos: gmfMovimientos, interesCompuesto: interesCompuesto, reglaCuatro: reglaCuatro,
    horasDeTrabajo: horasDeTrabajo, cuotaCredito: cuotaCredito, compararCreditos: compararCreditos,
    creditoVivienda: creditoVivienda, compraCartera: compraCartera,
    rendimientoCdt: rendimientoCdt, compararCdt: compararCdt, ahorroTributarioAporte: ahorroTributarioAporte,
    ivaPrecio: ivaPrecio, ivaPeriodo: ivaPeriodo };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaCalculadoras = api;
})(typeof window !== "undefined" ? window : this);
