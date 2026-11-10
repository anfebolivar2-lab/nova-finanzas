// Calcula el periodo actual de un ciclo de presupuesto, en hora local.
// Funciona en el navegador (window.NovaPeriodos) y en Node (require) para las pruebas.
(function (raiz) {
  "use strict";

  var CICLOS = {
    semanal: "Semanal", quincenal: "Quincenal", mensual: "Mensual",
    trimestral: "Trimestral", semestral: "Semestral", anual: "Anual"
  };

  // Devuelve { desde, hasta } con hasta exclusivo.
  function periodo(ciclo, ahora) {
    var d = ahora ? new Date(ahora) : new Date();
    var a = d.getFullYear(), m = d.getMonth();
    switch (ciclo) {
      case "semanal": {
        var desde = new Date(a, m, d.getDate() - ((d.getDay() + 6) % 7));
        return { desde: desde, hasta: new Date(desde.getFullYear(), desde.getMonth(), desde.getDate() + 7) };
      }
      case "quincenal":
        return d.getDate() <= 15
          ? { desde: new Date(a, m, 1), hasta: new Date(a, m, 16) }
          : { desde: new Date(a, m, 16), hasta: new Date(a, m + 1, 1) };
      case "trimestral": { var t = m - (m % 3); return { desde: new Date(a, t, 1), hasta: new Date(a, t + 3, 1) }; }
      case "semestral": { var s = m - (m % 6); return { desde: new Date(a, s, 1), hasta: new Date(a, s + 6, 1) }; }
      case "anual": return { desde: new Date(a, 0, 1), hasta: new Date(a + 1, 0, 1) };
      default: return { desde: new Date(a, m, 1), hasta: new Date(a, m + 1, 1) };
    }
  }

  var api = { periodo: periodo, CICLOS: CICLOS };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaPeriodos = api;
})(typeof window !== "undefined" ? window : this);
