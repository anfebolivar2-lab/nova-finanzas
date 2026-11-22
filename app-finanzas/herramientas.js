(function (raiz) {
  "use strict";

  function simular(tipo, valor, base) {
    if (!Number.isFinite(valor) || valor <= 0) return null;
    var cambio, duracion = null;
    if (tipo === "arriendo" && base.arriendo > 0) cambio = base.arriendo * (valor / 100);
    if (tipo === "gasto") cambio = valor;
    if (tipo === "ingreso" && Number.isInteger(valor) && base.ingresoPrincipal > 0) {
      cambio = base.ingresoPrincipal;
      duracion = valor;
    }
    var ahorro = base.ingresos - base.gastos - cambio;
    if (!Number.isFinite(ahorro)) return null;
    return {
      cambio: -cambio,
      ahorro: ahorro,
      mesesColchon: ahorro < 0 ? Math.max(0, base.colchon) / -ahorro : null,
      duracion: duracion
    };
  }

  function actualizarNotas(notas, accion) {
    var lista = Array.isArray(notas) ? notas.filter(function (n) {
      return n && typeof n.id === "string" && typeof n.texto === "string" &&
        typeof n.fecha === "string" && Number.isFinite(Date.parse(n.fecha));
    }) : [];
    if (accion && accion.borrar) lista = lista.filter(function (n) { return n.id !== accion.borrar; });
    if (accion && accion.nota && accion.nota.texto.trim()) lista.unshift(accion.nota);
    return lista.slice(0, 50);
  }

  function minutos(hora, porDefecto) {
    var partes = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hora);
    return partes ? Number(partes[1]) * 60 + Number(partes[2]) : porDefecto;
  }

  function enNoMolestar(fecha, config) {
    if (!config || !config.activo) return false;
    var inicio = minutos(config.inicio, 22 * 60), fin = minutos(config.fin, 7 * 60);
    var actual = fecha.getHours() * 60 + fecha.getMinutes();
    return inicio <= fin ? actual >= inicio && actual < fin : actual >= inicio || actual < fin;
  }

  function horaAviso(fecha, config) {
    if (!enNoMolestar(fecha, config)) return fecha;
    var fin = minutos(config.fin, 7 * 60);
    var salida = new Date(fecha.getTime());
    salida.setHours(Math.floor(fin / 60), fin % 60, 0, 0);
    if (salida <= fecha) salida.setDate(salida.getDate() + 1);
    return salida;
  }

  // Para reconstruir avisos que ya vencieron pero siguen diferidos en el tramo actual.
  function referenciaAvisos(fecha, config) {
    if (!enNoMolestar(fecha, config)) return fecha;
    var inicio = minutos(config.inicio, 22 * 60);
    var referencia = new Date(fecha.getTime());
    referencia.setHours(Math.floor(inicio / 60), inicio % 60, 0, 0);
    if (referencia > fecha) referencia.setDate(referencia.getDate() - 1);
    return new Date(referencia.getTime() - 1);
  }

  var api = { simular: simular, actualizarNotas: actualizarNotas, enNoMolestar: enNoMolestar, horaAviso: horaAviso, referenciaAvisos: referenciaAvisos };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaHerramientas = api;
})(typeof window !== "undefined" ? window : this);
