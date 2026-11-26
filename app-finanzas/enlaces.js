(function (raiz) {
  "use strict";

  function esEnlaceNuevoGasto(url) {
    if (typeof url !== "string") return false;
    var separador = url.indexOf(":");
    return separador > 0 &&
      url.slice(0, separador).toLowerCase() === "co.novafinanzas.app" &&
      /^:\/\/nuevo-gasto(?:[/?#]|$)/.test(url.slice(separador)) && !/\s/.test(url);
  }

  var api = { esEnlaceNuevoGasto: esEnlaceNuevoGasto };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaEnlaces = api;
})(typeof window !== "undefined" ? window : this);
