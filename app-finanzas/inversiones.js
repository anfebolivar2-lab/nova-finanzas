// Cálculos de inversiones y bienes sin acceso a los datos guardados.
(function (raiz) {
  "use strict";

  var TIPOS = { cdt: "CDT", acciones: "Acciones", cripto: "Cripto", fondo: "Fondo", otro: "Otro" };
  var MS_DIA = 86400000;

  function dia(fecha) {
    if (fecha instanceof Date && Number.isFinite(fecha.getTime())) {
      fecha = fecha.getFullYear() + "-" + String(fecha.getMonth() + 1).padStart(2, "0") + "-" + String(fecha.getDate()).padStart(2, "0");
    }
    if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return NaN;
    var d = new Date(fecha + "T00:00:00Z");
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === fecha ? d.getTime() : NaN;
  }

  function montoValido(valor) { return Number.isFinite(valor) && valor >= 0; }

  function validarInversion(obj) {
    return !!obj && typeof obj.tipo === "string" && Object.prototype.hasOwnProperty.call(TIPOS, obj.tipo) &&
      typeof obj.nombre === "string" && obj.nombre.trim().length > 0 &&
      montoValido(obj.valorInvertido) && obj.valorInvertido > 0 && montoValido(obj.valorActual) &&
      (obj.fechaVencimiento == null || obj.fechaVencimiento === "" ||
        (typeof obj.fechaVencimiento === "string" && Number.isFinite(dia(obj.fechaVencimiento))));
  }

  function resumenInversiones(lista) {
    var totalInvertido = 0, totalActual = 0;
    var inversiones = lista.filter(validarInversion).map(function (obj) {
      totalInvertido += obj.valorInvertido;
      totalActual += obj.valorActual;
      var ganancia = obj.valorActual - obj.valorInvertido;
      return Object.assign({}, obj, { ganancia: ganancia, gananciaPct: ganancia / obj.valorInvertido * 100 });
    });
    return { inversiones: inversiones, totalInvertido: totalInvertido, totalActual: totalActual };
  }

  // Los días negativos identifican vencimientos pasados que aún están en el registro.
  function vencimientosProximos(lista, ahora, dias) {
    var hoy = dia(ahora);
    if (dias === undefined) dias = 15;
    if (!Number.isFinite(hoy) || !montoValido(dias)) return [];
    return lista.filter(validarInversion).map(function (obj) {
      return Object.assign({}, obj, { dias: (dia(obj.fechaVencimiento) - hoy) / MS_DIA });
    }).filter(function (obj) { return Number.isFinite(obj.dias) && obj.dias <= dias; })
      .sort(function (a, b) { return a.dias - b.dias; });
  }

  function aniversario(compra, anio) {
    var fecha = new Date(compra);
    fecha.setUTCFullYear(anio);
    // Una compra del 29 de febrero cumple años el 28 en un año común.
    if (fecha.getUTCMonth() !== new Date(compra).getUTCMonth()) fecha.setUTCDate(0);
    return fecha.getTime();
  }

  function valorDepreciado(valorCompra, fechaCompra, pctAnual, ahora) {
    var compra = dia(fechaCompra), hoy = dia(ahora);
    if (!montoValido(valorCompra) || !montoValido(pctAnual) || pctAnual > 100 ||
        !Number.isFinite(compra) || !Number.isFinite(hoy)) return null;
    if (hoy <= compra) return valorCompra;
    var anio = new Date(hoy).getUTCFullYear(), ultimo = aniversario(compra, anio);
    if (ultimo > hoy) ultimo = aniversario(compra, --anio);
    var anios = anio - new Date(compra).getUTCFullYear() + (hoy - ultimo) / (aniversario(compra, anio + 1) - ultimo);
    return valorCompra * Math.pow(1 - pctAnual / 100, anios);
  }

  // Recibe los totales en la misma moneda. Las deudas quedan fuera del reparto de activos.
  function distribucionPatrimonio(cuentas, inversiones, bienes, deudas) {
    var activos = cuentas + inversiones + bienes;
    function porcentaje(valor) { return activos > 0 ? valor / activos * 100 : 0; }
    return {
      activos: activos, deudas: deudas, neto: activos - deudas,
      porcentajes: { cuentas: porcentaje(cuentas), inversiones: porcentaje(inversiones), bienes: porcentaje(bienes) }
    };
  }

  var api = { TIPOS: TIPOS, validarInversion: validarInversion, resumenInversiones: resumenInversiones,
    vencimientosProximos: vencimientosProximos, valorDepreciado: valorDepreciado, distribucionPatrimonio: distribucionPatrimonio };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaInversiones = api;
})(typeof window !== "undefined" ? window : this);
