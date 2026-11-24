(function (raiz) {
  "use strict";

  var DIA = 24 * 60 * 60 * 1000;
  var compararCorreos = new Intl.Collator("es", { sensitivity: "base" }).compare;

  function normalizar(texto) {
    return (texto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function fecha(valor) {
    if (valor == null || valor === "") return -Infinity;
    var tiempo = new Date(valor).getTime();
    return Number.isFinite(tiempo) ? tiempo : -Infinity;
  }

  var filtros = {
    todos: function () { return true; },
    activos: function (p, ahora) {
      var edad = ahora - fecha(p.ultimoUso);
      return edad >= 0 && edad <= 7 * DIA;
    },
    inactivos: function (p, ahora) { return ahora - fecha(p.ultimoUso) > 14 * DIA; },
    prueba: function (p) { return Boolean(p.prueba); },
    "sin-confirmar": function (p) { return !p.confirmado; },
    android: function (p) { return p.plataforma === "android"; },
    web: function (p) { return p.plataforma === "web"; },
    "sin-movimientos": function (p) { return Number(p.movimientos || 0) === 0; }
  };

  var ordenes = {
    uso: function (a, b) { return fecha(b.ultimoUso) - fecha(a.ultimoUso) || 0; },
    registro: function (a, b) { return fecha(b.registro) - fecha(a.registro) || 0; },
    movimientos: function (a, b) { return (b.movimientos || 0) - (a.movimientos || 0); },
    correo: function (a, b) { return compararCorreos(a.correo || "", b.correo || ""); }
  };

  function filtrarPersonas(personas, vista, ahora) {
    vista = vista || {};
    var tiempo = ahora == null ? Date.now() : fecha(ahora);
    var texto = normalizar(vista.texto).trim();
    var cumple = Object.prototype.hasOwnProperty.call(filtros, vista.filtro) ? filtros[vista.filtro] : filtros.todos;
    var comparar = Object.prototype.hasOwnProperty.call(ordenes, vista.orden) ? ordenes[vista.orden] : ordenes.uso;
    return personas.filter(function (p) {
      return cumple(p, tiempo) && (!texto || normalizar(p.correo).includes(texto));
    }).sort(comparar);
  }

  function contarFiltros(personas, ahora) {
    var tiempo = ahora == null ? Date.now() : fecha(ahora);
    var conteos = { todos: personas.length };
    Object.keys(filtros).filter(function (filtro) { return filtro !== "todos"; }).forEach(function (filtro) {
      conteos[filtro] = personas.reduce(function (total, p) {
        return total + Number(filtros[filtro](p, tiempo));
      }, 0);
    });
    return conteos;
  }

  function cantidad(valor) {
    var n = Number(valor);
    return Number.isSafeInteger(n) && n > 0 ? n : 0;
  }

  function rangoDias(rango) {
    return [7, 14, 30].includes(rango) ? rango : 30;
  }

  function serieDiaria(serie, ahora, rango, campos) {
    var fin = new Date(ahora);
    fin.setUTCHours(0, 0, 0, 0);
    if (!Number.isFinite(fin.getTime())) return [];
    var filas = Array.isArray(serie) ? new Map(serie.filter(Boolean).map(function (fila) {
      return [fila.dia, fila];
    })) : null;
    var dias = rangoDias(rango);
    return Array.from({ length: dias }, function (_, i) {
      var dia = new Date(fin.getTime() - (dias - 1 - i) * DIA).toISOString().slice(0, 10);
      var fila = filas ? filas.get(dia) : { total: serie && serie[dia] };
      var resultado = { dia: dia };
      campos.forEach(function (campo) { resultado[campo] = cantidad(fila && fila[campo]); });
      return resultado;
    });
  }

  function ultimos30Dias(porDia, ahora) {
    return serieDiaria(porDia, ahora, 30, ["total"]);
  }

  function nuevosDesdeVisita(personas, visita, ahora) {
    var anterior = fecha(visita), hasta = fecha(ahora);
    if (!Number.isFinite(anterior) || hasta <= anterior) return 0;
    return personasVisibles(personas, true).filter(function (persona) {
      var registro = fecha(persona.registro);
      return registro > anterior && registro <= hasta;
    }).length;
  }

  var ayudaNumeros = Object.freeze({
    registrados: "Personas que han creado una cuenta en NOVA.",
    activos7: "Personas que abrieron NOVA en los últimos 7 días.",
    activos30: "Personas que abrieron NOVA en los últimos 30 días.",
    apk: "Descargas del instalador Android registradas en GitHub.",
    android: "Personas que abrieron NOVA desde la app de Android.",
    movimientos: "Cantidad de movimientos que se han anotado.",
    chats: "Conversaciones iniciadas con NOVA IA.",
    metas: "Cantidad de metas de ahorro creadas en NOVA.",
    espacios: "Cantidad de espacios creados para separar anotaciones.",
    conductores: "Personas que usan el modo conductor.",
    nuevosHoy: "Personas que se registraron hoy.",
    nuevosSemana: "Personas que se registraron en lo que va de esta semana.",
    nuevosMes: "Personas que se registraron en lo que va de este mes.",
    dau: "Personas que abrieron NOVA hoy.",
    wau: "Personas que abrieron NOVA en los últimos 7 días.",
    mau: "Personas que abrieron NOVA en los últimos 30 días.",
    dauMau: "De quienes usaron NOVA en 30 días, qué porcentaje la abrió hoy.",
    retencion: "De quienes ya alcanzaron este tiempo desde su registro, qué porcentaje volvió a usar NOVA a partir de ese día.",
    eventos: "Acciones de uso que NOVA registró en los últimos 30 días.",
    sesiones: "Sesiones en las que se pudo medir cuánto duraron.",
    promedio: "Duración media de las sesiones medidas.",
    mediana: "La mitad de las sesiones medidas duró este tiempo o menos.",
    modoConductor: "Personas con actividad registrada en el modo conductor.",
    seguridad: "Personas con actividad registrada en las opciones de seguridad."
  });

  var ejemplosPlantillas = [
    { titulo: "Nueva versión", mensaje: "Ya está disponible una nueva versión de NOVA. Actualiza la app para ver las novedades." },
    { titulo: "Mantenimiento programado", mensaje: "Haremos un mantenimiento programado. Durante ese tiempo, algunas funciones podrían estar disponibles con interrupciones." },
    { titulo: "Gracias por usar NOVA", mensaje: "Gracias por usar NOVA y compartir tus sugerencias. Tus comentarios nos ayudan a mejorar la app." }
  ];
  var maximoPlantillas = 10;

  function validarPlantilla(titulo, mensaje) {
    if (typeof titulo !== "string" || typeof mensaje !== "string") return null;
    titulo = titulo.trim();
    mensaje = mensaje.trim();
    if (!titulo || Array.from(titulo).length > 80 || !mensaje || Array.from(mensaje).length > 500) return null;
    return { titulo: titulo, mensaje: mensaje };
  }

  function plantillasGuardadas(datos) {
    return (Array.isArray(datos) ? datos : []).map(function (fila) {
      return fila && validarPlantilla(fila.titulo, fila.mensaje);
    }).filter(Boolean).slice(0, maximoPlantillas - ejemplosPlantillas.length);
  }

  function listarPlantillas(datos) {
    return ejemplosPlantillas.map(function (fila) {
      return Object.assign({ fabrica: true }, fila);
    }).concat(plantillasGuardadas(datos));
  }

  function agregarPlantilla(datos, titulo, mensaje) {
    var guardadas = plantillasGuardadas(datos), plantilla = validarPlantilla(titulo, mensaje);
    return plantilla && guardadas.length < maximoPlantillas - ejemplosPlantillas.length ?
      guardadas.concat(plantilla) : null;
  }

  function borrarPlantilla(datos, indice) {
    var guardadas = plantillasGuardadas(datos);
    var posicion = indice - ejemplosPlantillas.length;
    return guardadas.filter(function (_, i) { return i !== posicion; });
  }

  function barrasVersiones(versiones) {
    return Object.keys(versiones || {}).map(function (version) {
      return { version: version || "Sin versión", total: cantidad(versiones[version]) };
    }).sort(function (a, b) { return b.total - a.total || compararCorreos(a.version, b.version); });
  }

  function registrosParaMeta(nuevos30, dias) {
    if (nuevos30 != null) return cantidad(nuevos30);
    return dias.slice(-30).reduce(function (total, dia) { return total + cantidad(dia.registros); }, 0);
  }

  function porcentaje(actual, meta) {
    return cantidad(meta) ? Math.min(100, Math.round(100 * cantidad(actual) / cantidad(meta))) : 0;
  }

  function porcentajesEncuesta(conteos, total) {
    return conteos.map(function (conteo) { return porcentaje(conteo, total); });
  }

  function validarEncuesta(pregunta, opciones) {
    pregunta = pregunta.trim();
    opciones = opciones.map(function (opcion) { return opcion.trim(); }).filter(Boolean);
    if (!pregunta || Array.from(pregunta).length > 200 || opciones.length < 2 || opciones.length > 6 ||
        opciones.some(function (opcion) { return Array.from(opcion).length > 60; })) return null;
    return { accion: "encuesta_crear", pregunta: pregunta, opciones: opciones };
  }

  function validarAviso(titulo, mensaje, audiencia, fechaFinal, ahora, fechaInicial) {
    var contenido = validarPlantilla(titulo, mensaje);
    if (!contenido || !["todos", "android", "web"].includes(audiencia)) return null;
    var hasta = null;
    if (fechaFinal) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaFinal)) return null;
      var fechaUtc = new Date(fechaFinal + "T00:00:00Z");
      if (!Number.isFinite(fechaUtc.getTime()) || fechaUtc.toISOString().slice(0, 10) !== fechaFinal) return null;
      var fin = new Date(fechaFinal + "T00:00:00");
      fin.setDate(fin.getDate() + 1);
      if (fin.getTime() <= ahora) return null;
      hasta = fin.toISOString();
    }
    var aviso = { accion: "aviso_crear", titulo: contenido.titulo, mensaje: contenido.mensaje, audiencia: audiencia, hasta: hasta };
    if (fechaInicial) {
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(fechaInicial)) return null;
      var inicioUtc = new Date(fechaInicial + "Z");
      if (!Number.isFinite(inicioUtc.getTime()) || inicioUtc.toISOString().slice(0, 16) !== fechaInicial) return null;
      var inicio = new Date(fechaInicial);
      if (!Number.isFinite(inicio.getTime()) || (hasta && inicio >= fin)) return null;
      aviso.desde = inicio.toISOString();
    }
    return aviso;
  }

  function sugerenciasPendientes(sugerencias) {
    return sugerencias.filter(function (s) { return !s.atendida; }).length;
  }

  function recientes(lista, limite) {
    return (Array.isArray(lista) ? lista : []).filter(Boolean).sort(function (a, b) {
      return fecha(b.creado_en) - fecha(a.creado_en) || 0;
    }).slice(0, limite);
  }

  function recortarTexto(texto, limite) {
    var letras = Array.from(String(texto || ""));
    return letras.length <= limite ? letras.join("") : letras.slice(0, limite - 1).join("") + "…";
  }

  function personasVisibles(personas, ocultarPrueba) {
    return (Array.isArray(personas) ? personas : []).filter(function (p) {
      return p && (!ocultarPrueba || p.prueba !== true);
    });
  }

  var bytesPorMB = 1000000;
  var formatoMB = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  function bytesAMegabytes(bytes) {
    return cantidad(bytes) / bytesPorMB;
  }

  function formatearTamano(bytes) {
    return formatoMB.format(bytesAMegabytes(bytes)) + " MB";
  }

  function tablasMasGrandes(tablas) {
    return (Array.isArray(tablas) ? tablas : []).filter(function (tabla) {
      return tabla && typeof tabla.tabla === "string";
    }).sort(function (a, b) {
      return cantidad(b.bytes) - cantidad(a.bytes) || a.tabla.localeCompare(b.tabla);
    }).slice(0, 8);
  }

  function accionesDeCuenta(persona) {
    if (!persona || !persona.id || persona.dueno || persona.prueba || !persona.correo || persona.correo === "(sin correo)") return [];
    var acciones = [persona.bloqueado ? "cuenta_desbloquear" : "cuenta_bloquear"];
    if (!persona.confirmado) acciones.push("cuenta_reenviar_confirmacion");
    return acciones;
  }

  function confirmaCorreo(correo, escrito) {
    return Boolean(correo) && correo === escrito;
  }

  var api = {
    rangoDias: rangoDias, serieDiaria: serieDiaria, nuevosDesdeVisita: nuevosDesdeVisita, ayudaNumeros: ayudaNumeros,
    validarPlantilla: validarPlantilla, listarPlantillas: listarPlantillas, agregarPlantilla: agregarPlantilla,
    borrarPlantilla: borrarPlantilla, maximoPlantillas: maximoPlantillas,
    porcentajesEncuesta: porcentajesEncuesta, validarEncuesta: validarEncuesta,
    bytesAMegabytes: bytesAMegabytes, formatearTamano: formatearTamano, tablasMasGrandes: tablasMasGrandes,
    accionesDeCuenta: accionesDeCuenta, confirmaCorreo: confirmaCorreo,
    personasVisibles: personasVisibles,
    filtrarPersonas: filtrarPersonas, contarFiltros: contarFiltros, ultimos30Dias: ultimos30Dias,
    barrasVersiones: barrasVersiones, cantidad: cantidad, registrosParaMeta: registrosParaMeta, porcentaje: porcentaje, validarAviso: validarAviso,
    sugerenciasPendientes: sugerenciasPendientes, recientes: recientes, recortarTexto: recortarTexto
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaDueno = api;
})(typeof window !== "undefined" ? window : this);
