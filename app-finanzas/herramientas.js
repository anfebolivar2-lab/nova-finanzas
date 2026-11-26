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

  function fechaDeMeta(objetivo, ahorrado, aporteMensual, hoy) {
    var falta = objetivo - ahorrado;
    if (!Number.isFinite(falta) || falta <= 0 || !Number.isFinite(aporteMensual) || aporteMensual <= 0) return null;
    var meses = Math.max(1, Math.ceil(falta / aporteMensual));
    var fecha = new Date(typeof hoy === "string" && /^\d{4}-\d{2}-\d{2}$/.test(hoy) ? hoy + "T00:00:00" : hoy);
    if (meses > 600 || !Number.isFinite(fecha.getTime())) return null;
    var dia = fecha.getDate();
    fecha.setMonth(fecha.getMonth() + meses + 1, 0);
    fecha.setDate(Math.min(dia, fecha.getDate()));
    return { meses: meses, fecha: Analisis.claveDia(fecha) };
  }

  function alcanzaDeseo(precio, disponible, ahorroMensual) {
    precio = Number.isFinite(precio) && precio > 0 ? precio : 0;
    disponible = Number.isFinite(disponible) ? disponible : 0;
    var falta = Math.max(0, precio - disponible);
    var meses = falta > 0 && Number.isFinite(ahorroMensual) && ahorroMensual > 0 ? Math.ceil(falta / ahorroMensual) : null;
    return { alcanza: falta === 0, falta: falta, meses: Number.isFinite(meses) ? meses : null };
  }

  function gastoEnMonedaBase(m, moneda) {
    if (!m || m.tipo !== "gasto" || m.borrado || m.estado === "borrado" || m.transferencia ||
        (Array.isArray(m.etiquetas) && m.etiquetas.indexOf("deuda") !== -1)) return false;
    // Los gastos convertidos ya guardan en monto el valor en la moneda del espacio.
    return !m.moneda || m.moneda === moneda || (Number(m.tasa) > 0 && Number(m.monto_original) > 0);
  }

  function gastosHormigaTop(movimientos, ahora, opciones) {
    opciones = opciones || {};
    var mes = Analisis.claveDia(ahora).slice(0, 7), moneda = opciones.moneda || "COP";
    var tope = opciones.tope == null ? 20000 : opciones.tope;
    var grupos = new Map();
    (movimientos || []).forEach(function (m) {
      if (!gastoEnMonedaBase(m, moneda) || !m.fecha || Analisis.fechaAnotada(m.fecha).slice(0, 7) !== mes) return;
      var valor = Number(m.monto);
      if (!Number.isFinite(valor) || valor <= 0 || valor > tope) return;
      var descripcion = typeof m.descripcion === "string" ? m.descripcion.trim() : "";
      var categoria = opciones.nombreCategoria ? opciones.nombreCategoria(m.categoria_id) : m.categoria;
      var nombre = (descripcion || (typeof categoria === "string" && categoria.trim()) ||
        "Sin categoría").replace(/\s+/g, " ");
      var clave = Analisis.sinTildes(nombre);
      var grupo = grupos.get(clave);
      if (!grupo) {
        grupo = { nombre: nombre[0].toUpperCase() + nombre.slice(1), veces: 0, total: 0 };
        grupos.set(clave, grupo);
      }
      grupo.veces++;
      grupo.total += valor;
    });
    return Array.from(grupos.values()).filter(function (g) { return g.veces >= 3; })
      .sort(function (a, b) { return b.total - a.total || b.veces - a.veces; }).slice(0, 3);
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
      if (!gastoEnMonedaBase(m, moneda)) return;
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

  function centavos(valor) {
    var unidades = Math.round(valor * 100);
    return Number.isSafeInteger(unidades) && unidades / 100 === valor ? unidades : NaN;
  }

  function repartirGasto(total, partes) {
    partes = Array.isArray(partes) ? partes.slice() : [];
    var valores = partes.map(centavos);
    var diferencia = centavos(total) - valores.reduce(function (suma, valor) { return suma + valor; }, 0);
    return { ok: diferencia === 0 && partes.length >= 2 && partes.length <= 6 &&
      valores.every(function (valor) { return valor > 0; }), resto: diferencia / 100, partes: partes };
  }

  function repartoSugerido(total, n) {
    var unidades = centavos(total);
    if (!(unidades > 0) || !Number.isInteger(n) || n < 2 || n > 6) return [];
    var escala = Number.isInteger(total) ? 1 : 100;
    var valor = escala === 1 ? total : unidades;
    var base = Math.floor(valor / n);
    return Array.from({ length: n }, function (_, i) { return (base + (i === 0 ? valor % n : 0)) / escala; });
  }

  function normalizarComercio(texto) {
    return Analisis.sinTildes(texto).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  }

  function categoriaSugeridaPorComercio(descripcion, movimientos, opciones) {
    var texto = normalizarComercio(descripcion);
    if (!texto) return null;
    var unaPalabra = texto.indexOf(" ") < 0;
    var conteo = new Map(), total = 0;
    (movimientos || []).forEach(function (m) {
      if (!m || m.tipo !== "gasto" || m.borrado || m.estado === "borrado" || m.categoria_id == null ||
          (opciones && opciones.omitirId != null && m.id === opciones.omitirId)) return;
      var anterior = normalizarComercio(m.descripcion);
      if (anterior !== texto && !(unaPalabra && anterior.indexOf(texto + " ") === 0)) return;
      total++;
      conteo.set(m.categoria_id, (conteo.get(m.categoria_id) || 0) + 1);
    });
    var sugerida = null;
    if (total >= 2) conteo.forEach(function (veces, id) {
      if (veces * 5 >= total * 3) sugerida = { categoria_id: id, veces: veces, total: total };
    });
    return sugerida;
  }

  var api = { simular: simular, actualizarNotas: actualizarNotas, enNoMolestar: enNoMolestar, horaAviso: horaAviso,
    referenciaAvisos: referenciaAvisos, gastoAltoDelDia: gastoAltoDelDia, fechaDeMeta: fechaDeMeta,
    alcanzaDeseo: alcanzaDeseo, gastosHormigaTop: gastosHormigaTop, repartirGasto: repartirGasto,
    repartoSugerido: repartoSugerido, categoriaSugeridaPorComercio: categoriaSugeridaPorComercio };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaHerramientas = api;
})(typeof window !== "undefined" ? window : this);
