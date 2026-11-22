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

  function ultimos30Dias(porDia, ahora) {
    var fin = new Date(ahora);
    fin.setUTCHours(0, 0, 0, 0);
    return Array.from({ length: 30 }, function (_, i) {
      var dia = new Date(fin.getTime() - (29 - i) * DIA).toISOString().slice(0, 10);
      return { dia: dia, total: cantidad(porDia && porDia[dia]) };
    });
  }

  function barrasVersiones(versiones) {
    return Object.keys(versiones || {}).map(function (version) {
      return { version: version || "Sin versión", total: cantidad(versiones[version]) };
    }).sort(function (a, b) { return b.total - a.total || compararCorreos(a.version, b.version); });
  }

  function porcentaje(actual, meta) {
    return cantidad(meta) ? Math.min(100, Math.round(100 * cantidad(actual) / cantidad(meta))) : 0;
  }

  function validarAviso(titulo, mensaje, audiencia, fechaFinal, ahora) {
    titulo = titulo.trim();
    mensaje = mensaje.trim();
    if (!titulo || Array.from(titulo).length > 80 || !mensaje || Array.from(mensaje).length > 500 ||
        !["todos", "android", "web"].includes(audiencia)) return null;
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
    return { accion: "aviso_crear", titulo: titulo, mensaje: mensaje, audiencia: audiencia, hasta: hasta };
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

  var api = {
    filtrarPersonas: filtrarPersonas, contarFiltros: contarFiltros, ultimos30Dias: ultimos30Dias,
    barrasVersiones: barrasVersiones, cantidad: cantidad, porcentaje: porcentaje, validarAviso: validarAviso,
    sugerenciasPendientes: sugerenciasPendientes, recientes: recientes, recortarTexto: recortarTexto
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaDueno = api;
})(typeof window !== "undefined" ? window : this);
