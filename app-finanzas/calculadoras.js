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

  var api = { CONSTANTES: CONSTANTES, MAX_ANIOS: MAX_ANIOS, diasComerciales: diasComerciales, liquidacion: liquidacion,
    recargoFestivo: recargoFestivo, horasExtra: horasExtra, salarioNeto: salarioNeto, gmf: gmf,
    gmfMovimientos: gmfMovimientos, interesCompuesto: interesCompuesto, reglaCuatro: reglaCuatro };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaCalculadoras = api;
})(typeof window !== "undefined" ? window : this);
