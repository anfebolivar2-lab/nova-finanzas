// Saca el total y el nombre del negocio del texto que se leyó de la foto de un recibo.
// Funciona en el navegador (window.NovaRecibo) y en Node (require) para las pruebas.
(function (raiz) {
  "use strict";

  // Palabras de líneas que no son el nombre del negocio.
  var NO_COMERCIO = /\b(nit|rut|factura|fecha|hora|tel|telefono|teléfono|cel|direcci[oó]n|cra|calle|cl|kr|carrera|régimen|regimen|resoluci[oó]n|caja|cajero|ticket|pos|iva|documento|cliente|c\.?c)\b/i;
  // Líneas con números que no son lo que se pagó.
  var NO_TOTAL = /\b(nit|subtotal|sub total|iva|impuesto|cambio|vueltas|efectivo|recibido|tarjeta|propina sugerida|tel|cel|c\.?c|resoluci[oó]n|desde|hasta|items|art[ií]culos|unidades|cant)\b/i;
  var ES_TOTAL = /\b(total a pagar|valor total|total pagado|gran total|neto a pagar|total)\b/i;

  // Corrige letras que el lector confunde con números dentro de cifras ("3O.OOO" → "30.000").
  function arreglarCifras(linea) {
    return linea.replace(/[\dOoSsIl$][\dOoSsIl.,$ ]*\d[\dOoSsIl.,]*/g, function (t) {
      return t.replace(/[Oo]/g, "0").replace(/[Ss]/g, "5").replace(/[Il]/g, "1");
    });
  }

  // Lee cifras de pesos: 30.000 · 30,000 · 30.000,00 · $30000 · 1.250.000
  function montos(linea) {
    var res = [], re = /\$?\s?(\d{1,3}(?:[.,\s]\d{3})+(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?)(?![\d])/g, m;
    while ((m = re.exec(linea)) !== null) {
      var t = m[1].replace(/\s/g, "");
      var dec = /[.,]\d{2}$/.test(t) && !/^\d{1,3}([.,]\d{3})+$/.test(t);
      if (dec) t = t.slice(0, -3);
      var n = Number(t.replace(/[.,]/g, ""));
      if (n >= 100 && n <= 50000000) res.push(n);
    }
    return res;
  }

  function nombreBonito(s) {
    return s.toLowerCase().replace(/(^|\s)(\p{L})/gu, function (_, a, b) { return a + b.toUpperCase(); });
  }

  function leerRecibo(texto) {
    var lineas = String(texto || "").split(/\r?\n/).map(function (l) { return l.replace(/\s+/g, " ").trim(); }).filter(Boolean);
    if (!lineas.length) return { ok: false, error: "No se pudo leer texto en la foto. Tómala de cerca, con buena luz y el recibo derecho." };

    // Nombre del negocio: la primera línea con letras que no sea NIT, dirección, fecha…
    var comercio = "";
    for (var i = 0; i < Math.min(lineas.length, 6); i++) {
      var l = lineas[i];
      var letras = (l.match(/\p{L}/gu) || []).length;
      if (letras >= 3 && letras / l.length > 0.5 && !NO_COMERCIO.test(l)) { comercio = nombreBonito(l.replace(/[^\p{L}\d &.'-]/gu, "").trim()); break; }
    }

    // Total: la última línea "TOTAL" (no subtotal ni IVA) con un valor; si el valor está en la línea siguiente, se toma de ahí.
    var total = null;
    for (var j = lineas.length - 1; j >= 0 && total === null; j--) {
      var linea = arreglarCifras(lineas[j]);
      if (!ES_TOTAL.test(linea) || /sub\s?total|total\s+(iva|items|art)/i.test(linea)) continue;
      var v = montos(linea);
      if (!v.length && lineas[j + 1]) v = montos(arreglarCifras(lineas[j + 1]));
      if (v.length) total = Math.max.apply(null, v);
    }
    // Si no dice TOTAL: el valor más alto que no sea NIT, cambio, efectivo, etc.
    if (total === null) {
      var candidatos = [];
      lineas.forEach(function (l) { if (!NO_TOTAL.test(l)) candidatos = candidatos.concat(montos(arreglarCifras(l))); });
      if (candidatos.length) total = Math.max.apply(null, candidatos);
    }
    if (total === null) return { ok: false, comercio: comercio, error: "No encontré el total en la foto. Escríbelo tú, por ejemplo: " + (comercio || "almuerzo") + " 20 mil." };
    return { ok: true, monto: total, comercio: comercio };
  }

  var api = { leerRecibo: leerRecibo, montos: montos };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaRecibo = api;
})(typeof window !== "undefined" ? window : this);
