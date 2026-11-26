(function (raiz) {
  "use strict";

  var Analisis = typeof module === "object" && module.exports ? require("./analisis.js") : raiz.NovaAnalisis;

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

  function gastoAltoDelDia(movimientos, ahora, opciones) {
    opciones = opciones || {};
    var hoy = Analisis.claveDia(ahora);
    if (opciones.ultimoAviso === hoy) return null;
    var desde = new Date(ahora);
    desde.setDate(desde.getDate() - 30);
    var primerDia = Analisis.claveDia(desde), moneda = opciones.moneda || "COP";
    var porDia = new Map();
    movimientos.forEach(function (m) {
      if (!m || m.tipo !== "gasto" || m.borrado || m.estado === "borrado" || m.transferencia ||
          (Array.isArray(m.etiquetas) && m.etiquetas.indexOf("deuda") !== -1)) return;
      // Los gastos en otra moneda ya guardan en monto el valor convertido a la moneda del espacio.
      if (m.moneda && m.moneda !== moneda && !(Number(m.tasa) > 0 && Number(m.monto_original) > 0)) return;
      var valor = Number(m.monto);
      if (!Number.isFinite(valor) || valor <= 0 || !m.fecha) return;
      var dia = /^\d{4}-\d{2}-\d{2}$/.test(m.fecha) ? m.fecha : Analisis.claveDia(m.fecha);
      if (dia < primerDia || dia > hoy) return;
      porDia.set(dia, (porDia.get(dia) || 0) + valor);
    });
    var total = porDia.get(hoy) || 0;
    porDia.delete(hoy);
    var minimo = opciones.minimo == null ? 50000 : opciones.minimo;
    if (porDia.size < 5 || total < minimo) return null;
    var promedio = Array.from(porDia.values()).reduce(function (suma, valor) { return suma + valor; }, 0) / porDia.size;
    var veces = Math.round(total / promedio * 10) / 10;
    var factor = opciones.factor == null ? 2 : opciones.factor;
    return veces >= factor ? { total: total, promedio: promedio, veces: veces } : null;
  }

  var api = { simular: simular, actualizarNotas: actualizarNotas, enNoMolestar: enNoMolestar, horaAviso: horaAviso, referenciaAvisos: referenciaAvisos, gastoAltoDelDia: gastoAltoDelDia };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaHerramientas = api;
})(typeof window !== "undefined" ? window : this);
