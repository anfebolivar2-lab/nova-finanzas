(function (raiz) {
  "use strict";

  function avisosParaMostrar(avisos, plataforma, vistos, ahora) {
    vistos = Array.isArray(vistos) ? vistos : [];
    return (Array.isArray(avisos) ? avisos : []).filter(function (a) {
      return a && a.id != null && a.activo === true &&
        (a.audiencia === "todos" || a.audiencia === plataforma) && !vistos.includes(a.id) &&
        (!a.desde || Date.parse(a.desde) <= ahora) && (!a.hasta || Date.parse(a.hasta) > ahora);
    }).sort(function (a, b) {
      return (Date.parse(b.creado_en) || 0) - (Date.parse(a.creado_en) || 0);
    });
  }

  function validarSugerencia(texto) {
    texto = String(texto || "");
    var limpio = texto.trim();
    return Array.from(limpio).length >= 3 && Array.from(texto).length <= 2000 ? limpio : null;
  }

  function enviosDeLaHora(envios, ahora) {
    return (Array.isArray(envios) ? envios : []).filter(function (t) {
      return Number.isFinite(t) && t <= ahora && ahora - t < 3600000;
    });
  }

  // Los mensajes libres pueden traer movimientos, correos, claves o respuestas de la nube.
  // Solo se envían textos fijos que identifican el tipo de fallo.
  function errorSeguro(texto, archivo, linea, rechazo, archivosApp) {
    texto = typeof texto === "string" ? texto.slice(0, 500) : "";
    var tipo = texto.match(/^(?:Uncaught(?: \(in promise\))? )?(TypeError|ReferenceError|SyntaxError|RangeError|URIError|EvalError):/);
    var mensaje = tipo ? tipo[1] : rechazo ? "Promesa rechazada" : "Error de JavaScript";
    var nombre = typeof archivo === "string" ? archivo.split(/[?#]/)[0].split("/").pop() : "";
    var origen = archivosApp.includes(nombre) ? nombre : rechazo ? "unhandledrejection" : "window.onerror";
    if (origen === nombre && Number.isSafeInteger(linea) && linea > 0) origen += ":" + linea;
    return { mensaje: mensaje, origen: origen.slice(0, 200) };
  }

  function puedeRegistrarError(mensajes, mensaje) {
    return mensajes.length < 5 && !mensajes.includes(mensaje);
  }

  function validarVersion(version) {
    return typeof version === "string" && /^\d+(\.\d+){0,3}$/.test(version);
  }

  function versionMenor(a, b) {
    if (!validarVersion(a) || !validarVersion(b)) return false;
    var izquierda = a.split("."), derecha = b.split(".");
    for (var i = 0; i < Math.max(izquierda.length, derecha.length); i++) {
      var x = (izquierda[i] || "0").replace(/^0+/, "");
      var y = (derecha[i] || "0").replace(/^0+/, "");
      if (x.length !== y.length) return x.length < y.length;
      if (x !== y) return x < y;
    }
    return false;
  }

  function configDesdeFilas(filas) {
    var config = { ia_pausada: false, ia_mensaje: "", version_minima: "", notas_version: "" };
    if (!Array.isArray(filas)) return config;
    filas.forEach(function (fila) {
      if (!fila || !Object.prototype.hasOwnProperty.call(config, fila.clave)) return;
      if (fila.clave === "ia_pausada") config.ia_pausada = fila.valor === true;
      else if (typeof fila.valor === "string") config[fila.clave] = fila.valor.trim();
    });
    return config;
  }

  function mensajePausaIA(config) {
    if (!config || config.ia_pausada !== true) return "";
    return config.ia_mensaje || "La IA está en mantenimiento. Vuelve en un rato.";
  }

  function sugerenciasRespondidas(filas) {
    return (Array.isArray(filas) ? filas : []).filter(function (fila) {
      return fila && typeof fila.respuesta === "string" && fila.respuesta.trim();
    });
  }

  var api = {
    validarVersion: validarVersion, versionMenor: versionMenor, configDesdeFilas: configDesdeFilas,
    mensajePausaIA: mensajePausaIA, sugerenciasRespondidas: sugerenciasRespondidas,
    avisosParaMostrar: avisosParaMostrar, validarSugerencia: validarSugerencia, enviosDeLaHora: enviosDeLaHora,
    errorSeguro: errorSeguro, puedeRegistrarError: puedeRegistrarError
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaNube = api;
})(typeof window !== "undefined" ? window : this);
