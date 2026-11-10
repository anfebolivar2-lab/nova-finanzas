// Tarjetas de NOVA IA: además del texto de la IA, la respuesta trae un gráfico, los movimientos detrás del número y
// botones para actuar (crear un límite, ver los movimientos, verlos en el calendario).
// La tarjeta se calcula aquí, en el celular, con los datos de la persona: no depende de lo que diga la IA.
// Funciona en el navegador (window.NovaRespuestas) y en Node (require) para las pruebas.
(function (raiz) {
  "use strict";

  var DIA = 86400000;
  var MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
  var NUMEROS = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, quince: 15, treinta: 30 };

  function sinTildes(t) { return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function num(v) { return Number(v) || 0; }
  function inicioDia(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function sumarDias(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function lunes(d) { var x = inicioDia(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }

  // ¿De qué periodo habla la pregunta? Devuelve { desde, hasta, nombre }. Sin periodo: este mes.
  function periodo(texto, hoy) {
    var t = sinTildes(texto), h = inicioDia(hoy), manana = sumarDias(h, 1);
    var m = t.match(/ultim[oa]s?\s+(\d+|[a-z]+)\s+(dias?|semanas?|mes(?:es)?|anos?)/);
    if (m) {
      var n = /^\d+$/.test(m[1]) ? Number(m[1]) : NUMEROS[m[1]];
      if (n > 0) {
        var u = m[2];
        if (/^dia/.test(u)) return { desde: sumarDias(manana, -n), hasta: manana, nombre: "los últimos " + n + " días" };
        if (/^semana/.test(u)) return { desde: sumarDias(manana, -7 * n), hasta: manana, nombre: n === 1 ? "la última semana" : "las últimas " + n + " semanas" };
        if (/^mes/.test(u)) return { desde: new Date(h.getFullYear(), h.getMonth() - n + 1, 1), hasta: manana, nombre: n === 1 ? "este mes" : "los últimos " + n + " meses" };
        return { desde: new Date(h.getFullYear() - n + 1, 0, 1), hasta: manana, nombre: n === 1 ? "este año" : "los últimos " + n + " años" };
      }
    }
    if (/\bhoy\b/.test(t)) return { desde: h, hasta: manana, nombre: "hoy" };
    if (/\bayer\b/.test(t)) return { desde: sumarDias(h, -1), hasta: h, nombre: "ayer" };
    if (/semana pasada/.test(t)) return { desde: sumarDias(lunes(h), -7), hasta: lunes(h), nombre: "la semana pasada" };
    if (/(esta|la) semana/.test(t)) return { desde: lunes(h), hasta: manana, nombre: "esta semana" };
    if (/mes pasado/.test(t)) return { desde: new Date(h.getFullYear(), h.getMonth() - 1, 1), hasta: new Date(h.getFullYear(), h.getMonth(), 1), nombre: "el mes pasado" };
    if (/(este|el) ano|en el ano|\banual/.test(t)) return { desde: new Date(h.getFullYear(), 0, 1), hasta: manana, nombre: "este año" };
    return { desde: new Date(h.getFullYear(), h.getMonth(), 1), hasta: manana, nombre: "este mes" };
  }

  // La categoría que nombra la pregunta (la de nombre más largo, para que "Comida rápida" gane a "Comida").
  function categoriaNombrada(texto, categorias) {
    var t = " " + sinTildes(texto).replace(/[^a-z0-9ñ ]/g, " ") + " ";
    var hallada = null;
    (categorias || []).forEach(function (c) {
      var n = sinTildes(c.nombre).replace(/[^a-z0-9ñ ]/g, " ").trim();
      if (n.length < 3) return;
      if (t.indexOf(" " + n + " ") >= 0 || t.indexOf(" " + n + "s ") >= 0) { if (!hallada || n.length > sinTildes(hallada.nombre).length) hallada = c; }
    });
    return hallada;
  }

  // Grupos del gráfico: por día (hasta 2 semanas), por semana (hasta ~2 meses) o por mes.
  function serie(movs, p) {
    var dias = Math.round((p.hasta - p.desde) / DIA), grupos = [];
    if (dias <= 14) {
      for (var d = new Date(p.desde); d < p.hasta; d = sumarDias(d, 1)) grupos.push({ desde: d, hasta: sumarDias(d, 1), etiqueta: String(d.getDate()) });
    } else if (dias <= 62) {
      for (var w = lunes(p.desde); w < p.hasta; w = sumarDias(w, 7)) grupos.push({ desde: w, hasta: sumarDias(w, 7), etiqueta: w.getDate() + " " + MESES_CORTOS[w.getMonth()] });
    } else {
      for (var m = new Date(p.desde.getFullYear(), p.desde.getMonth(), 1); m < p.hasta; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
        grupos.push({ desde: m, hasta: new Date(m.getFullYear(), m.getMonth() + 1, 1), etiqueta: MESES_CORTOS[m.getMonth()] });
      }
    }
    return grupos.map(function (g) {
      return { etiqueta: g.etiqueta, valor: movs.reduce(function (s, x) { var f = new Date(x.fecha); return f >= g.desde && f < g.hasta ? s + num(x.monto) : s; }, 0) };
    });
  }

  // Arma la tarjeta para una pregunta, o null si la pregunta no es sobre cuánto se gastó o se ganó.
  // datos: { movimientos, categorias, limites }. Los pendientes y las transferencias entre espacios no cuentan.
  function tarjeta(pregunta, datos, hoy) {
    var t = sinTildes(pregunta);
    if (!/cuant|gast|gane|ganad|ingres|recib|me pagaron|en que|categoria|mas grande|mayor/.test(t)) return null;
    hoy = hoy || new Date();
    var p = periodo(pregunta, hoy);
    var tipo = /gane|ganad|ingres|recib|me pagaron|ganancia/.test(t) && !/gast/.test(t) ? "ingreso" : "gasto";
    var cat = categoriaNombrada(pregunta, (datos.categorias || []).filter(function (c) { return !c.tipo || c.tipo === tipo; }));
    var base = (datos.movimientos || []).filter(function (m) {
      var f = new Date(m.fecha);
      return m.tipo === tipo && m.estado !== "pendiente" && !m.transferencia && f >= p.desde && f < p.hasta;
    });
    var movs = cat ? base.filter(function (m) { return m.categoria_id === cat.id; }) : base;
    var total = movs.reduce(function (s, m) { return s + num(m.monto); }, 0);
    var r = {
      tipo: tipo, categoriaId: cat ? cat.id : null, categoriaNombre: cat ? cat.nombre : null, periodo: p, total: total, cantidad: movs.length,
      titulo: (cat ? cat.nombre : tipo === "ingreso" ? "Tus ingresos" : "Tus gastos") + " · " + p.nombre,
      movimientos: movs.slice().sort(function (a, b) { return num(b.monto) - num(a.monto); }).slice(0, 5),
      acciones: []
    };
    // Sin categoría y preguntando "en qué": el gráfico va por categorías; si no, por tiempo.
    if (!cat && /en que|categoria|donde/.test(t)) {
      var porCat = {};
      movs.forEach(function (m) { var k = m.categoria_id == null ? "sin" : m.categoria_id; porCat[k] = (porCat[k] || 0) + num(m.monto); });
      r.porCategoria = true;
      r.serie = Object.keys(porCat).map(function (k) {
        var c = (datos.categorias || []).find(function (x) { return String(x.id) === k; });
        return { etiqueta: c ? c.nombre : "Sin categoría", valor: porCat[k], categoriaId: c ? c.id : null };
      }).sort(function (a, b) { return b.valor - a.valor; }).slice(0, 6);
    } else {
      r.serie = serie(movs, p);
    }
    if (movs.length) { r.acciones.push("buscar"); r.acciones.push("calendario"); }
    if (tipo === "gasto" && cat && !(datos.limites || []).some(function (l) { return l.categoria_id === cat.id; })) r.acciones.unshift("limite");
    return r;
  }

  var api = { periodo: periodo, categoriaNombrada: categoriaNombrada, serie: serie, tarjeta: tarjeta };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaRespuestas = api;
})(typeof window !== "undefined" ? window : this);
