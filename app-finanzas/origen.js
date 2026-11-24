(function (raiz) {
  "use strict";

  function origenValido(valor) { return typeof valor === "string" && /^[a-z0-9_-]{1,30}$/.test(valor); }
  function referidoValido(valor) { return typeof valor === "string" && /^[0-9a-f]{8}$/.test(valor); }

  function primeraAtribucion(guardada, nueva) {
    return {
      o: origenValido(guardada.o) ? guardada.o : origenValido(nueva.o) ? nueva.o : "",
      r: referidoValido(guardada.r) ? guardada.r : referidoValido(nueva.r) ? nueva.r : ""
    };
  }

  function metadataAtribucion(metadata, guardada, propio) {
    var cambios = {};
    if (!Object.prototype.hasOwnProperty.call(metadata, "nova_origen") && origenValido(guardada.o)) {
      cambios.nova_origen = guardada.o;
    }
    if (!Object.prototype.hasOwnProperty.call(metadata, "nova_referido_por") &&
        referidoValido(propio) && referidoValido(guardada.r) && guardada.r !== propio) {
      cambios.nova_referido_por = guardada.r;
    }
    return cambios;
  }

  async function codigoRef(idUsuario) {
    var sutil = typeof crypto !== "undefined" && crypto.subtle;
    if (!idUsuario || !sutil || typeof sutil.digest !== "function") return null;
    var hash = await sutil.digest("SHA-256", new TextEncoder().encode(idUsuario));
    return Array.from(new Uint8Array(hash).slice(0, 4), function (byte) {
      return byte.toString(16).padStart(2, "0");
    }).join("");
  }

  function enlaceConAtribucion(destino, pagina, origenPredeterminado) {
    var url = new URL(destino, pagina);
    var entrada = new URL(pagina).searchParams;
    ["o", "r"].forEach(function (clave) {
      if (entrada.has(clave)) url.searchParams.set(clave, entrada.get(clave));
      else if (clave === "o" && origenPredeterminado) url.searchParams.set(clave, origenPredeterminado);
    });
    return url.href;
  }

  var api = {
    origenValido: origenValido, referidoValido: referidoValido, primeraAtribucion: primeraAtribucion,
    metadataAtribucion: metadataAtribucion, codigoRef: codigoRef, enlaceConAtribucion: enlaceConAtribucion
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaOrigen = api;
})(typeof window !== "undefined" ? window : this);
