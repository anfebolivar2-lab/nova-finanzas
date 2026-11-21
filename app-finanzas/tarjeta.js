// Simulador de pagos de tarjeta de crédito en pesos. Funciona en el navegador
// (window.NovaTarjeta) y en Node (require) para las pruebas.
(function (raiz) {
  "use strict";

  // Convierte una tasa efectiva anual en porcentaje a una tasa mensual decimal.
  function tasaMensual(tasaEA) {
    if (!Number.isFinite(tasaEA) || tasaEA < 0) return null;
    return Math.pow(1 + tasaEA / 100, 1 / 12) - 1;
  }

  // Ambas modalidades redondean el interés y limitan el pago al saldo con interés.
  function simular(deuda, tasa, maxMeses, calcularPago) {
    var saldo = deuda;
    var meses = 0;
    var totalPagado = 0;
    var totalIntereses = 0;

    while (saldo > 0 && meses < maxMeses) {
      var interes = Math.round(saldo * tasa);
      var saldoConInteres = saldo + interes;
      var pago = Math.min(saldoConInteres, Math.round(calcularPago(saldo, interes)));

      saldo = saldoConInteres - pago;
      meses++;
      totalPagado += pago;
      totalIntereses += interes;
    }

    return { meses: meses, totalPagado: totalPagado, totalIntereses: totalIntereses, seAcaba: saldo <= 0 };
  }

  function simularPagoMinimo(opciones) {
    var { deuda, tasaEA, pagoMinimoPct = 5, minimoFijo = 0, maxMeses = 600 } = opciones || {};
    var tasa = tasaMensual(tasaEA);
    if (!Number.isFinite(deuda) || deuda <= 0 || tasa === null ||
        !Number.isFinite(pagoMinimoPct) || !Number.isFinite(minimoFijo) ||
        !Number.isInteger(maxMeses) || maxMeses < 0) return null;

    // El mínimo abona al menos un peso a capital mientras quede ese saldo.
    return simular(deuda, tasa, maxMeses, function (saldo, interes) {
      return Math.max(saldo * pagoMinimoPct / 100, minimoFijo, interes + 1);
    });
  }

  function simularCuotaFija(opciones) {
    var { deuda, tasaEA, cuota, maxMeses = 600 } = opciones || {};
    var tasa = tasaMensual(tasaEA);
    if (!Number.isFinite(deuda) || deuda <= 0 || tasa === null ||
        !Number.isFinite(cuota) || cuota < 0 || !Number.isInteger(maxMeses) || maxMeses < 0) return null;

    // Compara los importes redondeados que se aplican en el primer mes.
    if (Math.round(cuota) < Math.round(deuda * tasa)) {
      return { meses: null, totalPagado: null, totalIntereses: null, seAcaba: false };
    }

    return simular(deuda, tasa, maxMeses, function () { return cuota; });
  }

  function compararMinimoVsCuota(opciones) {
    var minimo = simularPagoMinimo(opciones);
    var cuota = simularCuotaFija(opciones);
    var seAcaban = minimo && minimo.seAcaba && cuota && cuota.seAcaba;

    return {
      minimo: minimo,
      cuota: cuota,
      ahorroIntereses: seAcaban ? minimo.totalIntereses - cuota.totalIntereses : null,
      mesesMenos: seAcaban ? minimo.meses - cuota.meses : null
    };
  }

  var api = { tasaMensual: tasaMensual, simularPagoMinimo: simularPagoMinimo, simularCuotaFija: simularCuotaFija, compararMinimoVsCuota: compararMinimoVsCuota };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaTarjeta = api;
})(typeof window !== "undefined" ? window : this);
