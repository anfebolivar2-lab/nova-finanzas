(function (raiz) {
  "use strict";

  function monto(texto) {
    return /^[+-]?\d+(?:[.,]\d+)?$/.test(texto || "") ? Number(texto.replace(",", ".")) : NaN;
  }

  function leerFacturaQr(texto) {
    if (typeof texto !== "string") return null;
    var campos = Object.create(null);
    texto.split(/\r\n?|\n/).forEach(function (linea) {
      var campo = /^\s*([a-z]+)\s*:\s*(.*?)\s*$/i.exec(linea);
      if (campo) campos[campo[1].toLowerCase()] = campo[2];
    });
    var iva = "valiva" in campos ? monto(campos.valiva) : 0;
    var otros = "valotroim" in campos ? monto(campos.valotroim) : 0;
    var total = "valtolfac" in campos ? monto(campos.valtolfac) : Math.round((monto(campos.valfac) + iva + otros) * 100) / 100;
    if (!Number.isFinite(total) || total <= 0) return null;
    var fecha = campos.fecfac || "";
    var dia = /^\d{4}-\d{2}-\d{2}$/.test(fecha) && new Date(fecha + "T00:00:00Z");
    if (!dia || !Number.isFinite(dia.getTime()) || dia.toISOString().slice(0, 10) !== fecha) fecha = "";
    return { total: total, fecha: fecha, comercioNit: campos.nitfac || "", numero: campos.numfac || "",
      iva: Number.isFinite(iva) ? iva : 0 };
  }

  var api = { leerFacturaQr: leerFacturaQr };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaFacturaQr = api;
})(typeof window !== "undefined" ? window : this);
