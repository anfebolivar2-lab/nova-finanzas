(function (raiz) {
  "use strict";

  function esEnlaceNuevoGasto(url) {
    if (typeof url !== "string") return false;
    var separador = url.indexOf(":");
    return separador > 0 &&
      url.slice(0, separador).toLowerCase() === "co.novafinanzas.app" &&
      /^:\/\/nuevo-gasto(?:[/?#]|$)/.test(url.slice(separador)) && !/\s/.test(url);
  }

  function frecuenteDeEnlace(url) {
    if (!esEnlaceNuevoGasto(url)) return null;
    var consulta = url.split("#")[0].match(/\?([^#]*)$/);
    if (!consulta) return null;
    var ids = new URLSearchParams(consulta[1]).getAll("f");
    return ids.length === 1 && /^[A-Za-z0-9_-]{1,20}$/.test(ids[0]) ? ids[0] : null;
  }

  var api = { esEnlaceNuevoGasto: esEnlaceNuevoGasto, frecuenteDeEnlace: frecuenteDeEnlace };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaEnlaces = api;
})(typeof window !== "undefined" ? window : this);
