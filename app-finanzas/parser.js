// Convierte frases como "gasté 20 mil en almuerzo" en un movimiento.
// Funciona en el navegador (window.NovaParser) y en Node (require) para las pruebas.
(function (raiz) {
  "use strict";

  var CATEGORIAS = [
    { nombre: "Comida", tipo: "gasto", icono: "comida",
      palabras: ["almuerzo", "desayuno", "cena", "comida", "restaurante", "café", "cafe", "tinto", "mercado", "domicilio", "rappi", "pan", "empanada", "pizza", "hamburguesa", "onces", "frutas"] },
    { nombre: "Transporte", tipo: "gasto", icono: "transporte",
      palabras: ["uber", "didi", "taxi", "bus", "buseta", "transmilenio", "metro", "pasaje", "gasolina", "parqueadero", "peaje", "moto", "indriver"] },
    { nombre: "Hogar", tipo: "gasto", icono: "hogar",
      palabras: ["arriendo", "luz", "agua", "gas", "servicios", "internet", "aseo", "administración", "administracion"] },
    { nombre: "Suscripciones", tipo: "gasto", icono: "suscripciones",
      palabras: ["netflix", "spotify", "disney", "youtube", "prime", "suscripción", "suscripcion", "plan", "celular", "datos", "icloud"] },
    { nombre: "Entretenimiento", tipo: "gasto", icono: "entretenimiento",
      palabras: ["cine", "fiesta", "cerveza", "trago", "rumba", "concierto", "juego", "partido", "bar"] },
    { nombre: "Salud", tipo: "gasto", icono: "salud",
      palabras: ["droguería", "drogueria", "medicina", "médico", "medico", "cita", "eps", "farmacia", "gimnasio", "gym"] },
    { nombre: "Compras", tipo: "gasto", icono: "compras",
      palabras: ["ropa", "zapatos", "tenis", "camisa", "regalo", "audífonos", "audifonos", "celular nuevo", "tienda", "compra"] },
    { nombre: "Educación", tipo: "gasto", icono: "educacion",
      palabras: ["matrícula", "matricula", "universidad", "curso", "libro", "fotocopias", "semestre", "colegio"] },
    { nombre: "Otros gastos", tipo: "gasto", icono: "otro", palabras: [] },
    { nombre: "Salario", tipo: "ingreso", icono: "ingreso",
      palabras: ["salario", "sueldo", "nómina", "nomina", "quincena", "prima"] },
    { nombre: "Otros ingresos", tipo: "ingreso", icono: "ingreso", palabras: [] }
  ];

  var PALABRAS_INGRESO = ["me pagaron", "me pagan", "me consignaron", "me transfirieron", "me dieron", "me regalaron",
    "recibí", "recibi", "ingreso", "gané", "gane", "vendí", "vendi", "cobré", "cobre", "salario", "sueldo",
    "nómina", "nomina", "quincena", "prima", "me llegó", "me llego"];

  var MULTIPLICADORES = {
    "mil": 1e3, "lucas": 1e3, "lukas": 1e3, "luca": 1e3, "luka": 1e3, "k": 1e3,
    "millón": 1e6, "millon": 1e6, "millones": 1e6, "palo": 1e6, "palos": 1e6, "m": 1e6
  };

  function sinTildes(s) { return s.normalize("NFD").replace(/[̀-ͯ]/g, ""); }

  // Lee un número escrito como 20.000, 20,000, 1,5 o 1.5 (decimal solo con 1-2 cifras finales).
  function leerNumero(txt) {
    var t = txt.replace(/\s/g, "");
    if (/^\d{1,3}([.,]\d{3})+$/.test(t)) return Number(t.replace(/[.,]/g, ""));
    if (/^\d+[.,]\d{1,2}$/.test(t)) return Number(t.replace(",", "."));
    return Number(t.replace(/[.,]/g, ""));
  }

  function buscarMonto(texto) {
    var re = /\$?\s*(\d[\d.,]*)\s*(millones|millón|millon|palos|palo|mil|lucas|lukas|luca|luka|k|m)?\b/gi;
    var m, mejor = null;
    while ((m = re.exec(texto)) !== null) {
      var n = leerNumero(m[1]);
      if (!isFinite(n) || n <= 0) continue;
      var mult = m[2] ? MULTIPLICADORES[sinTildes(m[2].toLowerCase())] || MULTIPLICADORES[m[2].toLowerCase()] : 1;
      // "2 millones 500 mil" → suma las partes consecutivas
      var valor = Math.round(n * mult), exacto = n * mult;   // exacto conserva los centavos (para dólares, euros…)
      if (mejor && mejor.fin >= m.index - 2 && mejor.mult > mult) {
        mejor = { valor: mejor.valor + valor, exacto: mejor.exacto + exacto, ini: mejor.ini, fin: re.lastIndex, mult: mult };
      } else if (!mejor) {
        mejor = { valor: valor, exacto: exacto, ini: m.index, fin: re.lastIndex, mult: mult };
      }
    }
    return mejor;
  }

  function contiene(texto, palabra) {
    var t = " " + sinTildes(texto.toLowerCase()) + " ";
    var p = sinTildes(palabra.toLowerCase());
    return new RegExp("[^a-z0-9]" + p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[^a-z0-9]").test(t);
  }

  function interpretar(texto, ahora) {
    var completo = String(texto || "").trim();
    if (!completo) return { ok: false, error: "Escribe qué gastaste o recibiste." };
    // Etiquetas: "#trabajo #viaje" se guardan aparte y no cuentan para el resto.
    var etiquetas = [];
    var original = completo.replace(/#([\p{L}\d_-]{1,30})/gu, function (_, e) {
      e = e.toLowerCase();
      if (etiquetas.indexOf(e) < 0) etiquetas.push(e);
      return " ";
    }).replace(/\s+/g, " ").trim();
    if (!original) return { ok: false, error: "No encontré el valor. Prueba con \"gasté 20 mil en almuerzo\"." };
    ahora = ahora ? new Date(ahora) : new Date();

    var monto = buscarMonto(original);
    if (!monto) return { ok: false, error: "No encontré el valor. Prueba con \"gasté 20 mil en almuerzo\"." };

    var tipo = PALABRAS_INGRESO.some(function (p) { return contiene(original, p); }) ? "ingreso" : "gasto";

    var categoria = null;
    CATEGORIAS.forEach(function (c) {
      if (!categoria && c.tipo === tipo && c.palabras.some(function (p) { return contiene(original, p); })) categoria = c;
    });
    if (!categoria) categoria = CATEGORIAS.find(function (c) { return c.tipo === tipo && !c.palabras.length; });

    var fecha = new Date(ahora);
    if (contiene(original, "anteayer")) fecha.setDate(fecha.getDate() - 2);
    else if (contiene(original, "ayer")) fecha.setDate(fecha.getDate() - 1);

    // Descripción: el texto sin el monto, sin la moneda ni las palabras de relleno.
    var desc = (original.slice(0, monto.ini) + " " + original.slice(monto.fin))
      .replace(/(?<![\p{L}\d])(d[oó]lares|d[oó]lar|euros?|reales?|soles|usd|eur|us\$|u\$s|r\$|mxn|cad|brl|gbp)(?![\p{L}\d])/giu, " ")
      .replace(/[€£]/g, " ")
      .replace(/(?<![\p{L}\d])(gast[eé]|pagu[eé]|compr[eé]|me pagaron|me consignaron|me transfirieron|me dieron|recib[ií]|anteayer|ayer|hoy|pesos|por|de|del|en|un|una|el|la|los|las|y)(?![\p{L}\d])/giu, " ")
      .replace(/[$]/g, " ").replace(/\s+/g, " ").trim();
    if (!desc) desc = categoria.nombre;
    desc = desc.charAt(0).toUpperCase() + desc.slice(1);

    return { ok: true, tipo: tipo, monto: monto.valor, montoExacto: Math.round(monto.exacto * 100) / 100, categoria: categoria.nombre, icono: categoria.icono,
             descripcion: desc, fecha: fecha.toISOString(), etiquetas: etiquetas };
  }

  var api = { interpretar: interpretar, CATEGORIAS: CATEGORIAS };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaParser = api;
})(typeof window !== "undefined" ? window : this);
