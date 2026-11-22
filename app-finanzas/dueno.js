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

  var api = { filtrarPersonas: filtrarPersonas, contarFiltros: contarFiltros };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaDueno = api;
})(typeof window !== "undefined" ? window : this);
