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
    return monedaDeGastoValida(m, moneda);
  }

  function monedaDeGastoValida(m, moneda) {
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

  function moverDiaLocal(dia, dias) {
    var fecha = new Date(dia + "T12:00:00");
    fecha.setDate(fecha.getDate() + dias);
    return Analisis.claveDia(fecha);
  }

  function gastosDeCategoria(movimientos, categoriaId, desde, hasta, moneda) {
    var gastos = [];
    (movimientos || []).forEach(function (m) {
      if (!m || m.tipo !== "gasto" || m.categoria_id !== categoriaId || m.borrado ||
          m.estado === "borrado" || m.transferencia || !m.fecha ||
          !monedaDeGastoValida(m, moneda)) return;
      var dia = Analisis.fechaAnotada(m.fecha), monto = Number(m.monto);
      if (dia >= desde && dia < hasta && Number.isFinite(monto) && monto > 0) {
        gastos.push({ dia: dia, monto: monto });
      }
    });
    return gastos;
  }

  function estadoRetoNoGastar(reto, movimientos, hoy, moneda) {
    var dia = Analisis.fechaAnotada(hoy);
    var fin = moverDiaLocal(reto.desde, reto.dias);
    var rotoEl = null;
    if (dia >= reto.desde) {
      gastosDeCategoria(movimientos, reto.categoria_id, reto.desde, fin, moneda || "COP").forEach(function (g) {
        if (!rotoEl || g.dia < rotoEl) rotoEl = g.dia;
      });
    }
    var estado = rotoEl ? "roto" : dia >= fin ? "cumplido" : "activo";
    var limite = rotoEl || (dia < fin ? dia : fin);
    var diasLimpios = 0;
    while (diasLimpios < reto.dias && moverDiaLocal(reto.desde, diasLimpios) < limite) diasLimpios++;
    var promedio = Number.isFinite(reto.promedioDia) && reto.promedioDia > 0 ? reto.promedioDia : 0;
    return { estado: estado, diasTotal: reto.dias, diasLimpios: diasLimpios,
      diasRestantes: estado === "activo" ? reto.dias - diasLimpios : 0,
      rotoEl: rotoEl, ahorrado: diasLimpios * promedio };
  }

  function promedioDiarioCategoria(movimientos, categoriaId, desdeIso, dias, moneda) {
    if (dias === undefined) dias = 30;
    if (!Number.isInteger(dias) || dias <= 0) return 0;
    var gastos = gastosDeCategoria(movimientos, categoriaId, moverDiaLocal(desdeIso, -dias), desdeIso, moneda || "COP");
    return Math.round(gastos.reduce(function (suma, g) { return suma + g.monto; }, 0) / dias);
  }

  function widgetsVisiblesSencillo(ids) {
    // Los cuatro bloques básicos están en el HTML de Inicio.
    var basicos = ["saldo-total", "tarjeta-seguro", "form-rapido", "lista-inicio"];
    return ids.filter(function (id) { return basicos.indexOf(id) >= 0; });
  }

  function cuotasVsIngresos(movimientos, categorias, ahora, opciones) {
    var mes = Analisis.claveDia(ahora).slice(0, 7);
    var umbral = opciones && opciones.umbral != null ? opciones.umbral : 0.30;
    var deudas = new Set((categorias || []).filter(function (c) {
      return Analisis.sinTildes(c.nombre).trim() === "deudas";
    }).map(function (c) { return c.id; }));
    var ingresos = 0, cuotas = 0;
    (movimientos || []).forEach(function (m) {
      if (!m || m.transferencia || m.borrado || m.estado === "borrado" || m.estado === "pendiente" ||
          !m.fecha || Analisis.fechaAnotada(m.fecha).slice(0, 7) !== mes) return;
      var monto = Number(m.monto);
      if (!Number.isFinite(monto) || monto <= 0) return;
      if (m.tipo === "ingreso") ingresos += monto;
      if (m.tipo === "gasto" && deudas.has(m.categoria_id)) cuotas += monto;
    });
    var proporcion = ingresos > 0 ? cuotas / ingresos : null;
    return { ingresos: ingresos, cuotas: cuotas, porcentaje: proporcion === null ? null : proporcion * 100,
      supera: proporcion !== null && proporcion > umbral };
  }

  function centavos(valor) {
    var unidades = Math.round(valor * 100);
    return Number.isSafeInteger(unidades) && unidades / 100 === valor ? unidades : NaN;
  }

  function repartirGasto(total, partes) {
    partes = Array.isArray(partes) ? partes.slice() : [];
    var valores = Array.from(partes, centavos);
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

  function limpiarNombreComparacion(nombre) {
    if (typeof nombre !== "string") return "";
    return nombre.replace(/["'«»‘’“”`]/g, "").replace(/[^\p{L}\p{M}\p{N}.+&/-]+/gu, " ")
      .trim().slice(0, 80).trim()
      // Evita que un nombre active la detección de consultas sobre datos personales.
      .replace(/\b(mi|mis)\s+(saldo|gastos?|ingresos?|cuentas?|metas?|presupuesto|movimientos?|deudas?|pagos?|ahorros?|finanzas)|cu[aá]nto (he |llevo )?gast[eé]|en qu[eé] (he )?gast[eé]|cu[aá]nto me (queda|sobra)/gi,
        function (frase) { return frase.replace(/ /g, "-"); });
  }

  function preguntaComparacion(producto, tope, tiendas) {
    producto = limpiarNombreComparacion(producto);
    if ((producto.match(/\p{L}/gu) || []).length < 3) return null;
    var nombres = Array.isArray(tiendas) ? tiendas.map(limpiarNombreComparacion).filter(Boolean) : [];
    if (!nombres.length) nombres = ["Alkosto", "Éxito", "Falabella", "MercadoLibre", "Homecenter"];
    var pregunta = "Busca precios actuales en Colombia, en pesos colombianos, para este producto: " + producto +
      ". Compara el mismo producto o el modelo equivalente más vendido en estas tiendas: " + nombres.join(", ") + ".";
    if (Number.isFinite(tope) && tope > 0 && tope < 10000000000) {
      pregunta += " Tengo pensado gastar hasta $" + tope.toLocaleString("es-CO", { maximumFractionDigits: 20 }) + " (pesos colombianos).";
    }
    return pregunta + " Haz una tabla con tienda, precio, si incluye envío, si ofrece cuotas sin interés y enlace. " +
      "Indica la opción más barata y la de mejor relación precio-calidad. " +
      "Avisa si los precios parecen desactualizados o si no los pudiste confirmar. No inventes datos y cita las fuentes.";
  }

  function puedeOfrecerHuella(opciones) {
    return !!(opciones && opciones.puente && opciones.disponible === true && opciones.pinActivo === true);
  }

  var api = { puedeOfrecerHuella: puedeOfrecerHuella, simular: simular, actualizarNotas: actualizarNotas, enNoMolestar: enNoMolestar, horaAviso: horaAviso,
    referenciaAvisos: referenciaAvisos, gastoAltoDelDia: gastoAltoDelDia, cuotasVsIngresos: cuotasVsIngresos, fechaDeMeta: fechaDeMeta,
    alcanzaDeseo: alcanzaDeseo, preguntaComparacion: preguntaComparacion, gastosHormigaTop: gastosHormigaTop, repartirGasto: repartirGasto,
    estadoRetoNoGastar: estadoRetoNoGastar, promedioDiarioCategoria: promedioDiarioCategoria,
    widgetsVisiblesSencillo: widgetsVisiblesSencillo,
    repartoSugerido: repartoSugerido, categoriaSugeridaPorComercio: categoriaSugeridaPorComercio };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaHerramientas = api;
})(typeof window !== "undefined" ? window : this);
