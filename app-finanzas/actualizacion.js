(function (raiz) {
  "use strict";

  var OTA_MIN_ENTRE_REVISIONES = 5 * 60 * 1000;
  var INTERVALO_REVISION = 10 * 60 * 1000;
  var WEB_MIN_OCULTA = 30 * 60 * 1000;

  function tocaRevisarOta(ahora, anterior, forzar) {
    return forzar || !anterior || ahora - anterior >= OTA_MIN_ENTRE_REVISIONES;
  }

  function versionWeb(cabeceras) {
    var etag = cabeceras.get("ETag");
    if (etag) return "etag:" + etag;
    var modificada = cabeceras.get("Last-Modified");
    return modificada ? "modificada:" + modificada : null;
  }

  function cambioVersionWeb(inicial, actual) {
    return !!(inicial && actual && inicial !== actual);
  }

  function puedeRecargar(estado) {
    return estado.capas === 0 && !estado.bloqueada && !estado.escribiendo && !estado.borrador;
  }

  function permiteRecargaWeb(ahora, ocultaDesde) {
    return ocultaDesde !== null && ahora - ocultaDesde >= WEB_MIN_OCULTA;
  }

  function planApk(estado) {
    if (!estado || !estado.hayNueva) return { accion: "nada", texto: "" };
    if (!estado.puente || estado.falloAntes) {
      return { accion: "enlace", texto: "Toca para descargarla. Al abrir el archivo, toca Actualizar." };
    }
    if (Number.isSafeInteger(estado.versionNueva) && estado.versionNueva > 0 && estado.descargada === estado.versionNueva) {
      return estado.puedeInstalar
        ? { accion: "instalar", texto: "Toca «Actualizar ahora»." }
        : { accion: "permiso", texto: "Para actualizar con un toque, permite que NOVA instale su propia actualización." };
    }
    if (estado.descargando) return { accion: "esperar-wifi", texto: "Bajando la actualización…" };
    if (estado.red === "wifi" && !estado.ahorroDatos) return { accion: "descargar", texto: "Bajando la actualización…" };
    if (estado.red === "ninguna") return { accion: "esperar-wifi", texto: "Conéctate a internet para bajar la actualización." };
    return { accion: "esperar-wifi", texto: "Hay una versión nueva. Se bajará sola con wifi o toca para bajarla ahora." };
  }

  var api = {
    INTERVALO_REVISION: INTERVALO_REVISION,
    tocaRevisarOta: tocaRevisarOta,
    versionWeb: versionWeb,
    cambioVersionWeb: cambioVersionWeb,
    puedeRecargar: puedeRecargar,
    permiteRecargaWeb: permiteRecargaWeb,
    planApk: planApk
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaActualizacion = api;
})(typeof window !== "undefined" ? window : this);
