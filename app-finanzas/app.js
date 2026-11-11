(function () {
  "use strict";

  var cfg = window.NOVA_CONFIG || {};
  var Parser = window.NovaParser;
  var A = window.NovaAnalisis;
  var Mon = window.NovaMonedas;
  var Periodos = window.NovaPeriodos;
  // ¿Corre dentro de la app de Android (Capacitor)?
  var enApp = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  var $ = function (id) { return document.getElementById(id); };
  // Los puntos de miles se ponen a mano y no con Intl: así salen igual en cualquier celular (algunos no traen el
  // idioma es-CO y no ponen punto en los números de 4 cifras: 1000 en vez de 1.000).
  function miles(n) { return String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
  // monedaVista: la moneda del espacio que se está viendo (COP en Principal). Los valores se muestran en ella.
  var monedaVista = "COP";
  var pesos = { format: function (v) {
    if (monedaVista !== "COP") return window.NovaMonedas.formatoMonto(Number(v) || 0, monedaVista);
    v = Math.round(Number(v) || 0); return (v < 0 ? "-" : "") + "$ " + miles(v);
  } };
  var numeroCO = { format: function (v) { v = Math.round(Number(v) || 0); return (v < 0 ? "-" : "") + miles(v); } };
  var hora = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit" });
  var fechaCorta = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" });
  var fechaLarga = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  var DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  var ICONOS = {
    comida: '<path d="M4 8h13v4a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6zM17 9h1.5a2.5 2.5 0 0 1 0 5H17M8 3v2M12 3v2"/>',
    transporte: '<path d="M5 17h14v-5l-2-5H7l-2 5zM5 12h14M7 20v-3M17 20v-3"/><circle cx="8" cy="14.5" r=".6"/><circle cx="16" cy="14.5" r=".6"/>',
    hogar: '<path d="M3 11l9-7 9 7M5 10v10h14V10"/>',
    suscripciones: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    entretenimiento: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5 3.5-5 3.5z"/>',
    salud: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
    compras: '<path d="M6 8h12l-1 12H7zM9 8a3 3 0 0 1 6 0"/>',
    educacion: '<path d="M3 8l9-4 9 4-9 4zM7 10v5c3 2 7 2 10 0v-5"/>',
    ingreso: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 14.5h2"/>',
    banco: '<path d="M3 9l9-5 9 5H3zM6 11v6M10 11v6M14 11v6M18 11v6M4 20h16"/>',
    otro: '<circle cx="6" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18" cy="12" r="1"/>'
  };
  var OJO_ABIERTO = '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var OJO_CERRADO = '<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';

  // Íconos para las categorías (con palabras para el buscador) y colores.
  var EMOJIS = [
    ["🍔", "comida hamburguesa"], ["🍕", "pizza comida"], ["🍽️", "restaurante comida plato"], ["☕", "cafe tinto"], ["🥐", "pan panaderia"],
    ["🛒", "mercado supermercado compras"], ["🍎", "fruta mercado"], ["🥩", "carne carniceria"], ["🍺", "cerveza trago bar"], ["🍷", "vino trago"],
    ["🍰", "postre torta"], ["🍦", "helado"], ["🥤", "gaseosa bebida"], ["💧", "agua botella"], ["🚗", "carro auto"],
    ["🏍️", "moto"], ["🚕", "taxi uber"], ["🚌", "bus transporte"], ["⛽", "gasolina combustible"], ["🅿️", "parqueadero parqueo"],
    ["🔧", "mecanico taller arreglo"], ["🛞", "llanta"], ["✈️", "avion viaje vuelo"], ["🧳", "viaje maleta"], ["🚲", "bicicleta"],
    ["🏠", "casa hogar arriendo"], ["💡", "luz energia servicios"], ["🚿", "agua servicios"], ["🔥", "gas"], ["📶", "internet wifi"],
    ["📱", "celular plan"], ["💻", "computador"], ["📺", "television suscripcion"], ["🎬", "cine pelicula"], ["🎮", "videojuego juego"],
    ["🎵", "musica spotify"], ["🎉", "fiesta rumba"], ["⚽", "futbol deporte"], ["🏋️", "gimnasio gym"], ["💊", "medicina drogueria"],
    ["🩺", "medico salud cita"], ["🦷", "odontologo dientes"], ["💅", "unas belleza"], ["💇", "peluqueria corte"], ["🧴", "aseo cuidado personal"],
    ["👕", "ropa camisa"], ["👟", "zapatos tenis"], ["👜", "bolso"], ["💍", "joya"], ["🎁", "regalo"],
    ["👶", "bebe hijos"], ["🧒", "hijos ninos"], ["🐶", "perro mascota"], ["🐱", "gato mascota"], ["🎓", "universidad educacion"],
    ["📚", "libros estudio"], ["✏️", "colegio utiles"], ["💼", "trabajo salario"], ["💰", "dinero ingreso"], ["💵", "efectivo plata"],
    ["🏦", "banco"], ["💳", "tarjeta credito"], ["📈", "inversion"], ["🪙", "ahorro moneda"], ["🧾", "factura recibo"],
    ["🤝", "prestamo deuda"], ["🏆", "bono premio"], ["🛠️", "herramientas freelance"], ["🧹", "limpieza aseo"], ["🌱", "plantas jardin"],
    ["⛪", "iglesia diezmo"], ["❤️", "donacion pareja"], ["🛡️", "seguro"], ["📦", "envio paquete"], ["🧺", "lavanderia"],
    ["🚬", "cigarrillo"], ["🎰", "apuestas loteria"], ["📍", "gps ubicacion"], ["🔔", "otros"], ["⭐", "favorito otros"]
  ];
  var COLORES = ["#2ee06f", "#22c55e", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
    "#ec4899", "#f43f5e", "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#65a30d", "#0f766e", "#1d4ed8",
    "#7c3aed", "#be123c", "#b45309", "#78716c", "#64748b", "#475569", "#a16207", "#9f1239", "#155e75", "#374151"];
  var COLOR_POR_ICONO = { comida: "#22c55e", transporte: "#3b82f6", hogar: "#6366f1", suscripciones: "#8b5cf6", entretenimiento: "#d946ef",
    salud: "#ef4444", compras: "#f97316", educacion: "#0ea5e9", ingreso: "#2ee06f", otro: "#64748b" };

  function el(tag, clase, texto) {
    var e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto != null) e.textContent = texto;
    return e;
  }

  // Pinta el ícono de una categoría: uno de los SVG fijos o el emoji elegido (como texto, nunca como HTML).
  function pintarIcono(span, c) {
    c = c || { icono: "otro" };
    span.replaceChildren();
    var nombreIcono = c.icono || "otro";
    // Si el ícono es una palabra sin dibujo (por ejemplo "banco") no se escribe la palabra dentro del círculo: se usa el ícono genérico.
    if (!Object.prototype.hasOwnProperty.call(ICONOS, nombreIcono) && /^[a-záéíóúñ_ -]{3,}$/i.test(nombreIcono)) nombreIcono = "otro";
    if (Object.prototype.hasOwnProperty.call(ICONOS, nombreIcono)) {
      span.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONOS[nombreIcono] + "</svg>";
    } else {
      span.append(el("span", "emoji", c.icono));
    }
    span.style.setProperty("--c", colorDe(c));
    return span;
  }
  function colorDe(c) { return (c && c.color) || COLOR_POR_ICONO[c && c.icono] || "var(--accent)"; }

  function mensaje(id, texto, error) {
    var m = $(id);
    m.textContent = texto || "";
    m.classList.toggle("error", !!error);
  }

  var toastTimer = null;
  // Mascota de NOVA (Novi, un búho verde con la chispa del logo), dibujada aquí mismo.
  var NOVI = '<svg class="toast-novi" viewBox="0 0 64 76" aria-hidden="true"><ellipse cx="32" cy="72" rx="20" ry="3" fill="rgba(0,0,0,.18)"/>' +
    '<path d="M10 30 L8 8 L24 20 Z M54 30 L56 8 L40 20 Z" fill="#12805c"/><ellipse cx="32" cy="44" rx="25" ry="27" fill="#1f9d6f"/>' +
    '<ellipse cx="32" cy="52" rx="16" ry="18" fill="#cdeee0"/><path d="M32 40l2.2 7.8L42 50l-7.8 2.2L32 60l-2.2-7.8L22 50l7.8-2.2z" fill="#1f9d6f"/>' +
    '<circle cx="22" cy="31" r="9" fill="#fff"/><circle cx="42" cy="31" r="9" fill="#fff"/><circle cx="23" cy="32" r="4.6" fill="#17302a"/><circle cx="41" cy="32" r="4.6" fill="#17302a"/>' +
    '<circle cx="24.6" cy="30.2" r="1.5" fill="#fff"/><circle cx="42.6" cy="30.2" r="1.5" fill="#fff"/><path d="M28 38 L32 44 L36 38 Z" fill="#f3b23c"/>' +
    '<path d="M50 52c6-2 10 2 8 8-1 3-6 4-9 1z" fill="#1f9d6f"/><rect x="53" y="44" width="5" height="11" rx="2.5" fill="#1f9d6f" transform="rotate(-18 55 50)"/>' +
    '<path d="M24 70l-3 4h8zM40 70l3 4h-8z" fill="#f3b23c"/></svg>';
  // Tarjeta de arriba: titulo, detalle y valor opcionales.
  function toast(titulo, detalle, valor, accion) {
    var t = $("toast");
    var falla = /^(No se pudo|No pude|Un cambio guardado sin internet)/.test(titulo);
    t.className = "toast" + (falla ? " toast-error" : "") + (accion ? " toast-con-accion" : "");
    t.textContent = "";
    t.insertAdjacentHTML("afterbegin", NOVI);
    var col = el("div", "toast-texto");
    if (detalle == null && valor == null) col.append(el("strong", "toast-titulo solo", titulo));
    else { col.append(el("span", "toast-titulo", titulo)); col.append(el("strong", "toast-detalle", detalle || "")); }
    t.append(col);
    if (valor != null) t.append(el("span", "toast-valor", valor));
    if (accion) {
      var bt = el("button", "toast-accion", accion.texto); bt.type = "button";
      bt.addEventListener("click", function () { clearTimeout(toastTimer); t.hidden = true; accion.fn(); });
      t.append(bt);
    }
    var barra = el("span", "toast-barra"); t.append(barra);
    barra.style.animationDuration = accion ? "7s" : "";
    t.hidden = false;
    try { if (!falla && navigator.vibrate) navigator.vibrate(25); } catch (e) { /* sin vibración */ }
    var dur = barra.style.animationDuration; barra.style.animation = "none"; void barra.offsetWidth; barra.style.animation = ""; barra.style.animationDuration = dur;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, accion ? 7000 : 3200);
  }

  // Convierte "2 millones", "850.000" o "20k" en número usando el mismo intérprete.
  function leerValor(texto) {
    // Números ya escritos con puntos de miles y coma decimal (10.000 · 1.500.000 · 2.500,50): se leen tal cual.
    var t = String(texto).replace(/[$\s\u00a0]/g, "");
    if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(t) || /^\d+(,\d{1,2})?$/.test(t)) return Number(t.replace(/\./g, "").replace(",", "."));
    if (/^\d{1,3}(,\d{3})+$/.test(t)) return Number(t.replace(/,/g, ""));     // 10,000 · 1,000,000 escritos con comas
    var r = Parser.interpretar(texto);
    return r.ok ? r.monto : NaN;
  }
  // En los campos de plata se van poniendo los puntos de miles mientras se escribe: 10000 → 10.000.
  // Si la persona escribe letras ("500 mil", "1 millón") se deja tal cual.
  var CAMPOS_PLATA = "#cuadrar-real, #pasar-monto, #pasar-llega, #espacio-saldo, input.monto-entrada, #meta-objetivo, #meta-diaria, #presupuesto-monto, #cuenta-saldo, #doc-costo, .campo-plata, #reg-orig, #reg-cop, #conv-monto, #conv-resultado, .asis-monto, .meta-abono input";
  function formatearMontoEscrito(campo) {
    var v = campo.value;
    if (/[^\d.,$\s\u00a0]/.test(v) || /\s$/.test(v)) return;   // letras o un espacio al final (va a escribir "mil"): no se toca
    var pos = campo.selectionStart == null ? v.length : campo.selectionStart;
    var antes = v.slice(0, pos).replace(/[^\d,]/g, "").length;      // cifras (y coma) que hay antes del cursor
    var partes = v.replace(/[^\d,]/g, "").split(",");
    // En Colombia la coma son los decimales (2.500,50). Si queda con 3 o más cifras después de la coma, o con varias comas
    // (10,000 · 1,000,000), la persona la usó como separador de miles: se toma como miles.
    var comoMiles = partes.length > 2 || (partes.length === 2 && partes[1].length >= 3);
    var entero = (comoMiles ? partes.join("") : partes[0]).replace(/^0+(?=\d)/, ""), dec = !comoMiles && partes.length > 1 ? partes[1].slice(0, 2) : null;
    var f = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (dec !== null ? "," + dec : "");
    if (f === v) return;
    campo.value = f;
    var n = 0, i = 0;
    while (i < f.length && n < antes) { if (/[\d,]/.test(f.charAt(i))) n++; i++; }
    try { campo.setSelectionRange(i, i); } catch (e) { /* algunos teclados no dejan mover el cursor */ }
  }
  // En los textos libres ("gasté 20000 en almuerzo") los números de 4 cifras o más también se van separando: 20000 → 20.000.
  // No toca palabras, #etiquetas ni decimales con coma; los números cortos (1.5, 12) se quedan como están.
  var CAMPOS_TEXTO = "#entrada-rapida, #comun-texto, #asis-texto";
  function agruparNumerosEnTexto(texto) {
    return texto.replace(/(^|[^\p{L}\d#.,])(\d[\d.]*)(?![\p{L}\d])/gu, function (todo, antes, num) {
      if (/\.$/.test(num)) return todo;                       // acaba de escribir un punto: todavía no se toca
      var cifras = num.replace(/\./g, "");
      if (cifras.length < 4 || /^0/.test(cifras)) return todo;
      return antes + cifras.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    });
  }
  function formatearTextoEscrito(campo) {
    var v = campo.value, pos = campo.selectionStart == null ? v.length : campo.selectionStart, nuevo = agruparNumerosEnTexto(v);
    if (nuevo === v) return;
    var nuevaPos = agruparNumerosEnTexto(v.slice(0, pos)).length;
    campo.value = nuevo;
    try { campo.setSelectionRange(nuevaPos, nuevaPos); } catch (e) { /* algunos teclados no dejan mover el cursor */ }
  }
  // Tasa de cambio ("¿cuántos pesos vale 1?"): puntos de miles y coma decimal (hasta 6 decimales).
  function formatearTasaEscrita(campo) {
    var v = campo.value;
    if (/[^\d.,\s]/.test(v) || /\s$/.test(v)) return;
    var pos = campo.selectionStart == null ? v.length : campo.selectionStart;
    var antes = v.slice(0, pos).replace(/[^\d,]/g, "").length, partes = v.replace(/[^\d,]/g, "").split(",");
    var entero = partes[0].replace(/^0+(?=\d)/, ""), dec = partes.length > 1 ? partes.slice(1).join("").slice(0, 6) : null;
    if (entero === "" && dec !== null) entero = "0";
    var f = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (dec !== null ? "," + dec : "");
    if (f === v) return;
    campo.value = f;
    var n = 0, i = 0;
    while (i < f.length && n < antes) { if (/[\d,]/.test(f.charAt(i))) n++; i++; }
    try { campo.setSelectionRange(i, i); } catch (e) { /* ver arriba */ }
  }
  document.addEventListener("input", function (e) {
    var c = e.target;
    if (!c || !c.matches) return;
    if (c.matches(CAMPOS_PLATA)) formatearMontoEscrito(c);
    else if (c.matches(CAMPOS_TEXTO)) formatearTextoEscrito(c);
    else if (c.id === "reg-tasa") formatearTasaEscrita(c);
  });

  function guardarLocal(clave, valor) { try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* sin almacenamiento */ } }
  function leerLocal(clave, defecto) { try { var v = localStorage.getItem(clave); return v ? JSON.parse(v) : defecto; } catch (e) { return defecto; } }

  // ---------- Color y tamaño de letra ----------
  function aplicarAcento(a) {
    if (["verde", "azul", "morado", "naranja"].indexOf(a) < 0) a = "verde";
    document.documentElement.setAttribute("data-acento", a);
    try { localStorage.setItem("nova-acento", a); } catch (e) { /* sin almacenamiento */ }
    document.querySelectorAll("[data-acento]").forEach(function (b) { if (b.tagName === "BUTTON") b.setAttribute("aria-checked", String(b.dataset.acento === a)); });
  }
  function aplicarLetra(l) {
    if (l !== "grande") l = "normal";
    document.documentElement.setAttribute("data-letra", l);
    try { localStorage.setItem("nova-letra", l); } catch (e) { /* sin almacenamiento */ }
    document.querySelectorAll("[data-letra]").forEach(function (b) { if (b.tagName === "BUTTON") b.setAttribute("aria-checked", String(b.dataset.letra === l)); });
  }
  aplicarAcento((function () { try { return localStorage.getItem("nova-acento") || "verde"; } catch (e) { return "verde"; } })());
  aplicarLetra((function () { try { return localStorage.getItem("nova-letra") || "normal"; } catch (e) { return "normal"; } })());

  // ---------- Tema y valores ocultos ----------
  function aplicarTema(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("nova-tema", t); } catch (e) { /* sin almacenamiento */ }
    document.querySelectorAll("[data-tema]").forEach(function (b) { b.setAttribute("aria-checked", String(b.dataset.tema === t)); });
  }
  aplicarTema((function () { try { return localStorage.getItem("nova-tema") || "sistema"; } catch (e) { return "sistema"; } })());

  var ocultos = leerLocal("nova-ocultos", false);
  function dinero(v) { return ocultos ? "$ ••••" : pesos.format(v); }
  function dineroSigno(v, tipo) { return ocultos ? "$ ••••" : (tipo === "ingreso" ? "+" : "−") + pesos.format(Math.abs(v)); }
  function pintarOjo() {
    var b = $("btn-ojo");
    b.innerHTML = ocultos ? OJO_CERRADO : OJO_ABIERTO;
    b.setAttribute("aria-pressed", String(ocultos));
    b.setAttribute("aria-label", ocultos ? "Mostrar los valores" : "Ocultar los valores");
    var d = $("det-ojo");
    d.innerHTML = b.innerHTML; d.setAttribute("aria-pressed", String(ocultos)); d.setAttribute("aria-label", b.getAttribute("aria-label"));
  }
  $("det-ojo").addEventListener("click", function () { $("btn-ojo").click(); });
  $("btn-ojo").addEventListener("click", function () { ocultos = !ocultos; guardarLocal("nova-ocultos", ocultos); pintarOjo(); if (fuente) pintar(); });
  pintarOjo();

  // ---------- Fuentes de datos ----------
  // Las dos fuentes (Supabase y demostración) ofrecen las mismas operaciones sobre las mismas tablas.
  var TABLAS = ["cuentas", "categorias", "movimientos", "metas", "frecuentes", "programados", "limites", "conversaciones", "documentos", "deudas", "abonos", "grupos", "gastos_grupo", "aportes_grupo", "espacios"];

  function fuenteSupabaseBase(cliente, usuario) {
    function q(promesa) {
      return promesa.then(function (r) { if (r.error) throw new Error(r.error.message); return r.data; });
    }
    function t(nombre) { return cliente.from("fin_" + nombre); }
    // Supabase entrega como máximo 1.000 filas por consulta: se pide por páginas hasta traer todo (tope 20.000).
    function cargarTodos(nombre) {
      var todos = [], pagina = 0, tam = 1000;
      function siguiente() {
        return q(t(nombre).select("*").order("fecha", { ascending: false }).order("id", { ascending: false }).range(pagina * tam, pagina * tam + tam - 1)).then(function (filas) {
          todos = todos.concat(filas);
          if (filas.length === tam && todos.length < 20000) { pagina++; return siguiente(); }
          return todos;
        });
      }
      return siguiente();
    }
    return {
      demo: false,
      email: usuario.email,
      nombre: (usuario.user_metadata && (usuario.user_metadata.full_name || usuario.user_metadata.name)) || "",
      creado: usuario.created_at || null,
      cargar: function () {
        return Promise.all([
          q(t("cuentas").select("*").order("id")),
          q(t("categorias").select("*").order("nombre")),
          cargarTodos("movimientos"),
          q(t("metas").select("*").order("id")),
          q(t("perfiles").select("*").maybeSingle()),
          q(t("frecuentes").select("*").order("id")),
          q(t("programados").select("*").order("proxima")),
          q(t("limites").select("*").order("id")),
          q(t("conversaciones").select("*").order("actualizado_en", { ascending: false }).limit(60)),
          q(t("documentos").select("*").order("vence")),
          q(t("deudas").select("*").order("fecha", { ascending: false })),
          q(t("abonos").select("*").order("fecha", { ascending: false })),
          q(t("grupos").select("*").order("id")),
          q(t("gastos_grupo").select("*").order("fecha", { ascending: false })),
          q(t("aportes_grupo").select("*").order("fecha", { ascending: false })),
          // Si la tabla de espacios aún no está en la base de datos, la app sigue funcionando sin espacios.
          q(t("espacios").select("*").order("orden").order("id")).catch(function () { return null; })
        ]).then(function (r) {
          var datos = { cuentas: r[0], categorias: r[1], movimientos: r[2], metas: r[3], perfil: r[4], frecuentes: r[5], programados: r[6], limites: r[7], conversaciones: r[8], documentos: r[9], deudas: r[10], abonos: r[11], grupos: r[12], gastos_grupo: r[13], aportes_grupo: r[14], espacios: r[15] || [], sinEspacios: r[15] == null };
          // Primera vez: crear el perfil, la cuenta principal y las categorías por defecto.
          var pendientes = [];
          if (!datos.perfil) {
            pendientes.push(q(t("perfiles").insert({ presupuesto_ciclo: "mensual" }).select().single()).then(function (p) { datos.perfil = p; }));
          }
          if (!datos.cuentas.some(function (c) { return c.espacio_id == null; })) {
            pendientes.push(q(t("cuentas").insert({ nombre: "Principal", tipo: "debito" }).select()).then(function (c) { datos.cuentas = c; }));
          }
          if (!datos.categorias.length) {
            var filas = Parser.CATEGORIAS.map(function (c) { return { nombre: c.nombre, tipo: c.tipo, icono: c.icono, grupo: A.grupoDe(c) }; });
            pendientes.push(q(t("categorias").insert(filas).select()).then(function (c) { datos.categorias = c; }));
          }
          return Promise.all(pendientes).then(function () { return datos; });
        });
      },
      crear: function (tabla, fila) { return q(t(tabla).insert(fila).select().single()); },
      crearVarios: function (tabla, filas) { return q(t(tabla).insert(filas).select()); },
      actualizar: function (tabla, id, cambios) { return q(t(tabla).update(cambios).eq("id", id).select().single()); },
      borrar: function (tabla, id) { return q(t(tabla).delete().eq("id", id)); },
      guardarPerfil: function (cambios) { return q(t("perfiles").update(cambios).eq("user_id", usuario.id).select().single()); },
      salir: function () { return cliente.auth.signOut(); }
    };
  }


  // ---------- Sin internet ----------
  // Copia de los datos en el celular (IndexedDB) y cola de cambios que se envían solos al volver la conexión.
  var almacenLocal = (function () {
    var abierta = null;
    function db() {
      if (!abierta) abierta = new Promise(function (ok, mal) {
        if (!window.indexedDB) return mal(new Error("sin IndexedDB"));
        var r = indexedDB.open("nova", 1);
        r.onupgradeneeded = function () { r.result.createObjectStore("kv"); };
        r.onsuccess = function () { ok(r.result); };
        r.onerror = function () { mal(r.error); };
      });
      return abierta;
    }
    function tx(modo, fn) {
      return db().then(function (d) {
        return new Promise(function (ok, mal) {
          var t = d.transaction("kv", modo), req = fn(t.objectStore("kv"));
          t.oncomplete = function () { ok(req && req.result); };
          t.onerror = t.onabort = function () { mal(t.error); };
        });
      });
    }
    function respaldo() { // si el navegador no deja usar IndexedDB: localStorage
      return {
        get: function (k) { return Promise.resolve(leerLocal("kv:" + k, null)); },
        set: function (k, v) { guardarLocal("kv:" + k, v); return Promise.resolve(); },
        del: function (k) { try { localStorage.removeItem("kv:" + k); } catch (e) { /* nada */ } return Promise.resolve(); }
      };
    }
    var r = respaldo();
    return {
      get: function (k) { return tx("readonly", function (s) { return s.get(k); }).then(function (v) { return v === undefined ? null : v; }, function () { return r.get(k); }); },
      set: function (k, v) { return tx("readwrite", function (s) { return s.put(v, k); }).catch(function () { return r.set(k, v); }); },
      del: function (k) { return tx("readwrite", function (s) { return s.delete(k); }).catch(function () { return r.del(k); }); }
    };
  })();
  function enLinea() { return navigator.onLine !== false; }
  // Cuando un cambio hecho sin internet llega al servidor, su id temporal pasa a ser el real: se corrige en pantalla.
  function remapearDatos(mapa, filas, tabla) {
    Object.keys(mapa).forEach(function (temp) {
      var desde = Number(temp), hacia = mapa[temp];
      var fila = (datos[tabla] || []).find(function (x) { return x.id === desde; });
      if (fila && filas && filas[temp]) Object.assign(fila, filas[temp]);
      Object.keys(datos).forEach(function (t) {
        if (!Array.isArray(datos[t])) return;
        datos[t].forEach(function (f) { Object.keys(f).forEach(function (k) { if (k !== "id" && /_id$/.test(k) && f[k] === desde) f[k] = hacia; }); });
      });
      if (detalleId === desde) detalleId = hacia;
    });
    if (fuente) pintar();
  }
  function pintarAvisoRed(c) {
    var b = $("banner-red"), n = c ? c.pendientes : (fuente && fuente.pendientes ? fuente.pendientes() : 0);
    if (!fuente || fuente.demo) { b.hidden = true; return; }
    var sin = !enLinea();
    b.hidden = !(sin || n > 0);
    if (b.hidden) return;
    b.className = "banner-red" + (sin ? " sin" : "");
    b.textContent = sin
      ? "📴 Sin internet: todo sigue funcionando y tus cambios se guardan en el celular" + (n ? " (" + n + " por enviar)" : "") + "."
      : "🔄 Enviando " + n + (n === 1 ? " cambio" : " cambios") + " guardados sin internet…";
  }
  function fuenteSupabase(cliente, usuario) {
    // Se recuerda quién es para poder abrir la app sin internet (los datos se guardan por usuario).
    guardarLocal("nova-identidad", { id: usuario.id, email: usuario.email, user_metadata: usuario.user_metadata || {}, created_at: usuario.created_at || null });
    var f = NovaSync.envolver(fuenteSupabaseBase(cliente, usuario), {
      almacen: almacenLocal, usuarioId: usuario.id, enLinea: enLinea,
      antes: function () { return cliente.auth.getSession(); },     // renueva la sesión antes de enviar lo pendiente
      alMapear: remapearDatos, alCambiar: pintarAvisoRed,
      alFallar: function () { toast("Un cambio guardado sin internet no se pudo enviar y se descartó."); }
    });
    // Historial de cambios: lo escriben disparadores de la base de datos; aquí solo se lee.
    f.historial = function () {
      return cliente.from("fin_historial").select("*").order("creado_en", { ascending: false }).limit(100).then(function (r) { if (r.error) throw new Error(r.error.message); return r.data; });
    };
    // Fotos de recibos: espacio privado "recibos", una carpeta por usuario. Solo con internet.
    var bucket = cliente.storage.from("recibos");
    f.fotos = {
      subir: function (blob, clave) {
        var ruta = usuario.id + "/" + clave + "-" + Date.now() + ".jpg";
        return bucket.upload(ruta, blob, { contentType: "image/jpeg" }).then(function (r) { if (r.error) throw new Error(r.error.message); return ruta; });
      },
      url: function (ruta) { return bucket.createSignedUrl(ruta, 3600).then(function (r) { if (r.error) throw new Error(r.error.message); return r.data.signedUrl; }); },
      borrar: function (ruta) { return bucket.remove([ruta]).then(function () { return null; }, function () { return null; }); }
    };
    return f;
  }
  window.addEventListener("online", function () { pintarAvisoRed(); if (fuente && fuente.sincronizar) fuente.sincronizar().then(function () { pintarAvisoRed(); }); });
  window.addEventListener("offline", function () { pintarAvisoRed(); });
  setInterval(function () { if (fuente && fuente.pendientes && fuente.pendientes() > 0 && enLinea()) fuente.sincronizar().catch(function () { /* se reintenta */ }); }, 20000);

  function fuenteDemo() {
    var sig = 1000;
    var hoy = new Date();
    function hace(dias, h, min) {
      var d = new Date(hoy); d.setDate(d.getDate() - dias); d.setHours(h, min || 0, 0, 0);
      if (d > hoy) d = new Date(hoy.getTime() - 20 * 60000); // los ejemplos de hoy nunca quedan en el futuro
      return d.toISOString();
    }
    var categorias = Parser.CATEGORIAS.map(function (c, i) { return { id: i + 1, nombre: c.nombre, tipo: c.tipo, icono: c.icono, grupo: A.grupoDe(c), color: null }; });
    categorias.push({ id: 50, nombre: "Mascotas", tipo: "gasto", icono: "🐶", grupo: "Familia", color: "#f59e0b" });
    function cat(n) { return categorias.find(function (c) { return c.nombre === n; }).id; }
    // Coordenadas de ejemplo en Neiva para mostrar el mapa.
    var CAFE = [2.9273, -75.2819], U = [2.9349, -75.2808];
    var tabla = {
      cuentas: [{ id: 1, nombre: "Nequi", tipo: "debito", saldo_inicial: 1850000 }],
      categorias: categorias,
      metas: [{ id: 1, nombre: "Audífonos nuevos", objetivo: 2000000, ahorrado: 1200000 }],
      frecuentes: [{ id: 1, texto: "tinto 3 mil" }, { id: 2, texto: "almuerzo 20 mil #trabajo" }],
      programados: [{ id: 1, cuenta_id: 1, categoria_id: cat("Suscripciones"), tipo: "gasto", monto: 26900, descripcion: "Netflix", etiquetas: [],
                      frecuencia: "mensual", proxima: A.siguienteFecha(A.claveDia(hace(1, 12)), "mensual"), activo: true }],
      limites: [{ id: 1, categoria_id: cat("Comida"), monto: 400000, ciclo: "mensual", recurrente: true, creado_en: hace(20, 9) }],
      conversaciones: [],
      documentos: [],
      deudas: [
        { id: 1, tipo: "debo", persona: "Banco", concepto: "Préstamo para la moto", monto: 2000000, fecha: A.claveDia(hace(40, 10)), vence: A.claveDia(hace(-20, 10)), nota: null },
        { id: 2, tipo: "me_deben", persona: "Carlos", concepto: "Me pidió prestado", monto: 300000, fecha: A.claveDia(hace(12, 10)), vence: null, nota: null }
      ],
      grupos: [{ id: 1, nombre: "Paseo a Neiva", miembros: ["Yo", "Ana", "Pedro"], meta_nombre: "Hotel de diciembre", meta_objetivo: 1200000 }],
      aportes_grupo: [
        { id: 1, grupo_id: 1, persona: "Yo", monto: 200000, fecha: A.claveDia(hace(6, 10)) },
        { id: 2, grupo_id: 1, persona: "Ana", monto: 150000, fecha: A.claveDia(hace(3, 10)) }
      ],
      gastos_grupo: [
        { id: 1, grupo_id: 1, tipo: "gasto", descripcion: "Hotel", monto: 240000, pagador: "Yo", repartido: ["Yo", "Ana", "Pedro"], fecha: A.claveDia(hace(5, 10)) },
        { id: 2, grupo_id: 1, tipo: "gasto", descripcion: "Gasolina", monto: 90000, pagador: "Ana", repartido: ["Yo", "Ana", "Pedro"], fecha: A.claveDia(hace(4, 10)) }
      ],
      abonos: [{ id: 1, deuda_id: 1, monto: 500000, fecha: A.claveDia(hace(10, 10)), nota: "Primera cuota" }],
      movimientos: [
        [0, 10, 42, "gasto", "Café y pandebono", 8500, "Comida", [], CAFE],
        [1, 18, 30, "gasto", "Netflix", 26900, "Suscripciones", [], null],
        [1, 13, 5, "gasto", "Almuerzo", 22000, "Comida", ["trabajo"], CAFE],
        [2, 8, 10, "gasto", "Uber a la universidad", 14500, "Transporte", ["universidad"], U],
        [3, 20, 0, "gasto", "Cine con amigos", 36000, "Entretenimiento", ["amigos"], null],
        [4, 9, 0, "ingreso", "Pago de quincena", 2400000, "Salario", ["trabajo"], null],
        [5, 12, 30, "gasto", "Mercado", 145000, "Comida", [], null],
        [6, 17, 0, "gasto", "Concentrado para Lucas", 62000, "Mascotas", [], null],
        [8, 19, 0, "gasto", "Domicilio", 38000, "Comida", [], null],
        [9, 7, 45, "gasto", "Gasolina", 60000, "Transporte", [], null],
        [11, 15, 0, "gasto", "Droguería", 27000, "Salud", [], null],
        [12, 11, 0, "gasto", "Arriendo", 850000, "Hogar", [], null],
        [34, 11, 0, "gasto", "Arriendo", 850000, "Hogar", [], null],
        [36, 9, 0, "ingreso", "Pago de quincena", 2400000, "Salario", ["trabajo"], null],
        [40, 12, 30, "gasto", "Mercado", 182000, "Comida", [], null],
        [65, 11, 0, "gasto", "Arriendo", 850000, "Hogar", [], null],
        [66, 9, 0, "ingreso", "Pago de quincena", 2400000, "Salario", ["trabajo"], null]
      ].map(function (m, i) {
        return { id: i + 1, cuenta_id: 1, fecha: hace(m[0], m[1], m[2]), tipo: m[3], descripcion: m[4], monto: m[5], estado: "pagado", nota: null,
                 categoria_id: cat(m[6]), etiquetas: m[7], lat: m[8] ? m[8][0] : null, lng: m[8] ? m[8][1] : null };
      })
    };
    // Un espacio de ejemplo: el ahorro, con su propia cuenta y una transferencia desde Principal.
    tabla.espacios = [{ id: 1, nombre: "Ahorro", icono: "ahorro", moneda: "COP", presupuesto_monto: null, presupuesto_ciclo: null, orden: 0 }];
    tabla.cuentas.push({ id: 2, nombre: "Alcancía", tipo: "ahorro", saldo_inicial: 300000, espacio_id: 1 });
    tabla.movimientos.push(
      { id: 900, cuenta_id: 1, fecha: hace(3, 9, 0), tipo: "gasto", descripcion: "Pasé a Ahorro", monto: 200000, estado: "pagado", nota: null, categoria_id: null, etiquetas: [], transferencia: "demo-1", espacio_id: null },
      { id: 901, cuenta_id: 2, fecha: hace(3, 9, 0), tipo: "ingreso", descripcion: "Llegó de Principal", monto: 200000, estado: "pagado", nota: null, categoria_id: null, etiquetas: [], transferencia: "demo-1", espacio_id: 1 });
    // Suscripciones de ejemplo: Netflix (que subió de precio) y Spotify, cobradas cada mes.
    [[32, 24900, "Netflix"], [62, 24900, "Netflix"], [10, 16900, "Spotify"], [40, 16900, "Spotify"], [71, 16900, "Spotify"]].forEach(function (x, i) {
      tabla.movimientos.push({ id: 920 + i, cuenta_id: 1, fecha: hace(x[0], 18, 30), tipo: "gasto", descripcion: x[2], monto: x[1], estado: "pagado", nota: null,
        categoria_id: cat("Suscripciones"), etiquetas: [] });
    });
    Object.keys(tabla).forEach(function (n) { if (!Array.isArray(tabla[n])) tabla[n] = []; });
    TABLAS.forEach(function (n) { if (!tabla[n]) tabla[n] = []; });
    var perfil = { presupuesto_monto: 1500000, presupuesto_ciclo: "mensual", guardar_ubicacion: false, mostrar_seguro: true, modo_conductor: false, vehiculo: null, meta_diaria: null };
    function copia(o) { return JSON.parse(JSON.stringify(o)); }
    function nueva(nombre, fila) {
      var n = Object.assign({ id: sig++ }, fila);
      if (nombre === "metas" && n.ahorrado == null) n.ahorrado = 0;
      if (nombre === "movimientos" && !n.estado) n.estado = "pagado";
      if (nombre === "limites" && !n.creado_en) n.creado_en = new Date().toISOString();
      tabla[nombre].push(n);
      return copia(n);
    }
    return {
      demo: true,
      email: "Demostración",
      nombre: "Persona de demostración",
      cargar: function () { var d = copia(tabla); d.perfil = copia(perfil); return Promise.resolve(d); },
      crear: function (nombre, fila) { return Promise.resolve(nueva(nombre, fila)); },
      crearVarios: function (nombre, filas) { return Promise.resolve(filas.map(function (f) { return nueva(nombre, f); })); },
      actualizar: function (nombre, id, cambios) {
        var f = tabla[nombre].find(function (x) { return x.id === id; });
        Object.assign(f, cambios);
        return Promise.resolve(copia(f));
      },
      borrar: function (nombre, id) { tabla[nombre] = tabla[nombre].filter(function (x) { return x.id !== id; }); return Promise.resolve(); },
      guardarPerfil: function (cambios) { Object.assign(perfil, cambios); return Promise.resolve(copia(perfil)); },
      salir: function () { return Promise.resolve(); },
      historial: function () { return Promise.resolve([]); },
      fotos: (function () {
        var guardadas = {};
        return {
          subir: function (blob, clave) { var r = "demo:" + clave + ":" + Date.now(); guardadas[r] = URL.createObjectURL(blob); return Promise.resolve(r); },
          url: function (ruta) { return guardadas[ruta] ? Promise.resolve(guardadas[ruta]) : Promise.reject(new Error("sin foto")); },
          borrar: function (ruta) { delete guardadas[ruta]; return Promise.resolve(null); }
        };
      })()
    };
  }

  // ---------- Estado y cálculos ----------
  function datosVacios() {
    var d = { perfil: { presupuesto_ciclo: "mensual", guardar_ubicacion: false, mostrar_seguro: true, modo_conductor: false } };
    TABLAS.forEach(function (t) { d[t] = []; });
    return d;
  }
  var fuente = null;
  var datos = datosVacios();
  var pendiente = null;
  var desfaseInicio = 0, desfaseAnalisis = 0;
  var cicloAnalisis = leerLocal("nova-ciclo-analisis", null);

  function categoria(id) { return datos.categorias.find(function (c) { return c.id === id; }); }
  function nombreCategoria(id) { var c = categoria(id); return c ? c.nombre : "Sin categoría"; }
  function etiquetasUsadas() {
    var todas = leerLocal("nova-etiquetas", []).slice();
    datos.movimientos.forEach(function (m) { (m.etiquetas || []).forEach(function (e) { if (todas.indexOf(e) < 0) todas.push(e); }); });
    return todas.sort();
  }
  function tieneUbicacion(m) { return m.lat != null && m.lng != null; }
  // Distancia en metros entre dos pagos (fórmula del haversine).
  function distancia(a, b) {
    var R = 6371000, rad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function pagosCerca(m) {
    if (!tieneUbicacion(m)) return [];
    return datos.movimientos.filter(function (o) { return o.id !== m.id && tieneUbicacion(o) && distancia(m, o) <= 150; });
  }
  function cicloEfectivo() { return datos.perfil.presupuesto_ciclo || "mensual"; }
  function num(v) { return Number(v) || 0; }
  function inicioSemana(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }

  function saldoCuenta(c) {
    return datos.movimientos.reduce(function (s, m) {
      return m.cuenta_id !== c.id ? s : s + (m.tipo === "ingreso" ? num(m.monto) : -num(m.monto));
    }, num(c.saldo_inicial));
  }
  function saldoTotal() { return datos.cuentas.reduce(function (s, c) { return s + saldoCuenta(c); }, 0); }
  function gastadoEn(rango, categoriaId) {
    return datos.movimientos.reduce(function (s, m) {
      var f = new Date(m.fecha);
      if (m.tipo !== "gasto" || f < rango.desde || f >= rango.hasta) return s;
      if (categoriaId != null && m.categoria_id !== categoriaId) return s;
      return s + num(m.monto);
    }, 0);
  }
  function ordenarMovimientos() { datos.movimientos.sort(function (a, b) { return new Date(b.fecha) - new Date(a.fecha); }); }

  // ---------- Listas de movimientos ----------
  function filaMovimiento(m, conFecha) {
    var c = categoria(m.categoria_id) || (m.transferencia ? { nombre: "Entre espacios", icono: "⇄", color: "#14b8a6" } : { nombre: "Sin categoría", icono: "otro" });
    var li = el("li", "mov");
    li.tabIndex = 0;
    li.setAttribute("role", "button");
    li.setAttribute("aria-label", "Ver el detalle de " + m.descripcion);
    var ic = pintarIcono(el("span", "mov-icono"), c);
    var txt = el("div", "mov-texto");
    var otraMoneda = m.moneda && m.moneda !== monedaBase() && num(m.monto_original) > 0;
    txt.append(el("strong", null, m.descripcion), el("small", null, c.nombre + (m.nota ? " · " + m.nota : "") + (otraMoneda ? " · " + Mon.formatoMonto(m.monto_original, m.moneda) : "")));
    var extra = el("div", "mov-extra");
    if (m.estado === "pendiente") extra.append(el("span", "chip pendiente", "Pendiente"));
    if (m.programado_id) extra.append(el("span", "chip", "🔁"));
    (m.etiquetas || []).forEach(function (e) { extra.append(el("span", "etiqueta-chip", "#" + e)); });
    if (tieneUbicacion(m)) {
      var mapa = el("a", null, "Ver en Google Maps");
      mapa.href = "https://www.google.com/maps/search/?api=1&query=" + Number(m.lat) + "," + Number(m.lng); // abre Google Maps
      mapa.target = "_blank"; mapa.rel = "noopener";
      mapa.addEventListener("click", function (e) { e.stopPropagation(); });
      extra.append(mapa);
      var cerca = pagosCerca(m);
      if (cerca.length) {
        var total = cerca.reduce(function (s, o) { return s + (o.tipo === "gasto" ? num(o.monto) : 0); }, 0);
        extra.append(el("small", null, cerca.length + (cerca.length === 1 ? " pago más" : " pagos más") + " aquí · " + dinero(total)));
      }
    }
    if (extra.childNodes.length) txt.append(extra);
    var val = el("div", "mov-valor");
    val.append(el("strong", m.tipo === "ingreso" ? "positivo" : null, dineroSigno(num(m.monto), m.tipo)), el("small", null, (conFecha ? fechaCorta.format(new Date(m.fecha)) + " · " : "") + hora.format(new Date(m.fecha))));
    li.append(ic, txt, val);
    li.addEventListener("click", function () { abrirDetalle(m); });
    li.addEventListener("keydown", function (e) { if (e.key === "Enter") abrirDetalle(m); });
    return li;
  }

  // Lista agrupada por día, como en el inicio de Lukas.
  function listaPorDia(cont, movs, vacio, max) {
    cont.replaceChildren();
    if (!movs.length) { cont.append(el("p", "vacio", vacio)); return; }
    A.porDia(max ? movs.slice(0, max) : movs).forEach(function (g) {
      var grupo = el("div", "dia-grupo");
      var cab = el("div", "dia-cabeza");
      cab.append(el("span", null, g.nombre), el("span", null, ocultos ? "" : (g.neto >= 0 ? "+" : "−") + pesos.format(Math.abs(g.neto))));
      var ul = el("ul", "lista-mov");
      g.movimientos.forEach(function (m) { ul.append(filaMovimiento(m)); });
      grupo.append(cab, ul);
      cont.append(grupo);
    });
  }

  // ---------- Inicio ----------
  function rangoInicio() { return A.desplazar(cicloEfectivo(), new Date(), desfaseInicio); }

  // Widget de la pantalla de inicio (Android): se guardan el saldo y lo que se puede gastar hoy en un lugar que el widget lee.
  var ultimoWidget = "";
  function actualizarWidget() {
    var P = enApp && window.Capacitor.Plugins && window.Capacitor.Plugins.Preferences;
    if (!P || !fuente || fuente.demo) return;
    var protegido = ocultos || !!leerPin(), saldo = saldoTotal(), b = presupuestoActual(), seguro = b.limite > 0 ? A.seguroParaGastar(b.limite, b.gastado, b.rango) : null;
    var linea = protegido ? "Valores protegidos" : (seguro && seguro.porDia > 0 ? "Hoy puedes gastar " + pesos.format(Math.round(seguro.porDia)) : "Toca para anotar un gasto");
    var valor = JSON.stringify({ saldo: protegido ? "$ ••••" : (saldo < 0 ? "-" : "") + pesos.format(Math.abs(saldo)), linea: linea });
    if (valor === ultimoWidget) return;
    ultimoWidget = valor;
    P.set({ key: "nova-widget", value: valor }).catch(function () { /* sin widget no pasa nada */ });
  }
  function pintarInicio() {
    var ciclo = cicloEfectivo(), rango = rangoInicio();
    $("inicio-periodo").textContent = A.nombrePeriodo(ciclo, rango);
    var movs = A.enRango(datos.movimientos, rango), t = A.totales(movs);
    $("saldo-total").textContent = ocultos ? "$ ••••" : (t.neto < 0 ? "−" : "") + pesos.format(Math.abs(t.neto));
    var disponible = t.ingresos > 0 ? Math.max(0, Math.min(100, (t.neto / t.ingresos) * 100)) : 0;
    $("saldo-pct").textContent = Math.round(disponible) + "%";
    $("saldo-barra").style.width = disponible + "%";
    $("saldo-ingresos").textContent = ocultos ? "$ ••••" : "+" + pesos.format(t.ingresos);
    $("saldo-gastos").textContent = ocultos ? "$ ••••" : "−" + pesos.format(t.gastos);
    $("saldo-cuentas").textContent = "Saldo en cuentas: " + dinero(saldoTotal());
    $("tarjeta-deficit").hidden = t.neto >= 0;
    $("deficit-valor").textContent = ocultos ? "$ ••••" : "−" + pesos.format(Math.abs(t.neto));

    pintarSeguro(); pintarPresupuesto(); pintarFrecuentes(); pintarMiniTarjetas(); pintarProyeccionYRacha(movs, rango); pintarSemanaYSaludo(); pintarSugerencias(); pintarProximoPago(); pintarApartar(); actualizarWidget();
    listaPorDia($("lista-inicio"), movs, desfaseInicio === 0 ? "Aún no hay movimientos en este periodo. Toca + para agregar el primero." : "No hubo movimientos en este periodo.", 60);
  }
  document.querySelectorAll("[data-periodo-inicio]").forEach(function (b) {
    b.addEventListener("click", function () { desfaseInicio += Number(b.dataset.periodoInicio); pintarInicio(); });
  });

  function presupuestoActual() {
    var p = datos.perfil, ciclo = cicloEfectivo(), rango = Periodos.periodo(ciclo);
    var gastado = gastadoEn(rango);
    var limite = num(p.presupuesto_monto);
    if (!limite) { // sin presupuesto: lo que entró menos lo que salió en el periodo
      var t = A.totales(A.enRango(datos.movimientos, rango));
      return { limite: t.ingresos, gastado: t.gastos, rango: rango, conPresupuesto: false };
    }
    return { limite: limite, gastado: gastado, rango: rango, conPresupuesto: true };
  }

  function pintarSeguro() {
    var b = presupuestoActual(), tarjeta = $("tarjeta-seguro");
    tarjeta.hidden = datos.perfil.mostrar_seguro === false || desfaseInicio !== 0 || !(b.limite > 0);
    if (tarjeta.hidden) return;
    var s = A.seguroParaGastar(b.limite, b.gastado, b.rango);
    $("seguro-valor").textContent = dinero(s.porDia) + " por día";
    var ultimo = new Date(b.rango.hasta.getTime() - 1);
    $("seguro-nota").textContent = s.resto > 0
      ? "Te quedan " + dinero(s.resto) + (b.conPresupuesto ? " del presupuesto" : " de lo que entró") + " hasta el " + fechaCorta.format(ultimo) + " (" + s.dias + (s.dias === 1 ? " día)" : " días)")
      : "Ya gastaste todo lo " + (b.conPresupuesto ? "del presupuesto" : "que entró") + " en este periodo.";
    $("seguro-nota").className = "nota" + (s.resto > 0 ? "" : " mal");
  }

  function pintarPresupuesto() {
    var p = datos.perfil, ciclo = cicloEfectivo();
    $("presupuesto-titulo").textContent = "Presupuesto " + Periodos.CICLOS[ciclo].toLowerCase();
    var barra = $("presupuesto-barra"), nota = $("presupuesto-nota");
    nota.className = "nota";
    barra.classList.remove("excedido");
    if (!p.presupuesto_monto) {
      $("presupuesto-valor").textContent = "Sin presupuesto";
      barra.style.width = "0";
      nota.textContent = "Toca Editar para definir cuánto quieres gastar.";
      return;
    }
    var rango = Periodos.periodo(ciclo), gastado = gastadoEn(rango);
    var limite = num(p.presupuesto_monto), resto = limite - gastado;
    $("presupuesto-valor").textContent = dinero(gastado) + " de " + dinero(limite);
    barra.style.width = Math.min(100, (gastado / limite) * 100) + "%";
    if (resto >= 0) {
      nota.textContent = "Te quedan " + dinero(resto) + " hasta el " + fechaCorta.format(new Date(rango.hasta.getTime() - 1));
      if (resto / limite < 0.15) nota.classList.add("mal");
    } else {
      nota.textContent = "Te pasaste por " + dinero(-resto) + " en este periodo";
      nota.classList.add("mal");
      barra.classList.add("excedido");
    }
  }

  function pintarProyeccionYRacha(movs, rango) {
    var pr = desfaseInicio === 0 ? A.proyeccionPeriodo(movs, rango) : null;
    $("tarjeta-proyeccion").hidden = !pr;
    if (pr) {
      $("proyeccion-valor").textContent = ocultos ? "$ ••••" : "Gastarías " + pesos.format(pr.gastosFinal);
      $("proyeccion-nota").textContent = ocultos ? "" : "Vas gastando " + pesos.format(Math.round(pr.ritmoDiario)) + " al día. " +
        (pr.ingresos > 0 ? (pr.saldoFinal >= 0 ? "Te sobrarían " + pesos.format(pr.saldoFinal) + " al terminar." : "Te faltarían " + pesos.format(-pr.saldoFinal) + " para llegar a fin de periodo.") : "Quedan " + pr.diasRestantes + " días.");
    }
    var r = A.racha(datos.movimientos);
    $("tarjeta-racha").hidden = r < 2;
    if (r >= 2) {
      $("racha-valor").textContent = r + " días seguidos";
      $("racha-nota").textContent = r >= 30 ? "¡Un mes entero anotando! Eres imparable." : r >= 7 ? "¡Una semana completa! Sigue así." : "Anota algo cada día para no perderla.";
    }
  }

  function pintarMiniTarjetas() {
    var meta = datos.metas[0];
    if (meta) {
      var p = Math.min(100, (num(meta.ahorrado) / num(meta.objetivo)) * 100);
      $("meta-valor").textContent = dinero(num(meta.ahorrado)) + " / " + dinero(num(meta.objetivo));
      $("meta-barra").style.width = p + "%";
      $("meta-nota").textContent = meta.nombre + " • " + Math.round(p) + "%";
    } else {
      $("meta-valor").textContent = "Sin metas";
      $("meta-barra").style.width = "0";
      $("meta-nota").textContent = "Crea una en Planes";
    }
    var ahora = new Date(), semana = inicioSemana(ahora), semanaPasada = new Date(semana);
    semanaPasada.setDate(semanaPasada.getDate() - 7);
    var gSemana = 0, gPasada = 0, dias = [0, 0, 0, 0, 0, 0, 0];
    datos.movimientos.forEach(function (m) {
      if (m.tipo !== "gasto") return;
      var f = new Date(m.fecha), v = num(m.monto);
      if (f >= semana && f <= ahora) { gSemana += v; dias[(f.getDay() + 6) % 7] += v; }
      else if (f >= semanaPasada && f < semana) gPasada += v;
    });
    $("semana-valor").textContent = dinero(gSemana);
    var nota = $("semana-nota");
    nota.className = "nota";
    if (gPasada > 0) {
      var cambio = ((gSemana - gPasada) / gPasada) * 100;
      nota.textContent = (cambio <= 0 ? "Bajó " : "Subió ") + Math.abs(Math.round(cambio)) + "% vs la semana pasada";
      nota.classList.add(cambio <= 0 ? "bien" : "mal");
      $("semana-barra").style.width = Math.min(100, (gSemana / gPasada) * 100) + "%";
    } else {
      nota.textContent = "Sin datos de la semana pasada";
      $("semana-barra").style.width = gSemana ? "100%" : "0";
    }
    var g = $("grafico-semana"), max = Math.max.apply(null, dias.concat([1])), hoyIdx = (ahora.getDay() + 6) % 7;
    g.replaceChildren();
    g.setAttribute("aria-label", "Gastos por día: " + DIAS.map(function (d, i) { return d + " " + dinero(dias[i]); }).join(", "));
    dias.forEach(function (v, i) {
      var d = el("div", "dia" + (i === hoyIdx ? " hoy" : i > hoyIdx ? " futuro" : ""));
      var col = el("div", "col"), barra = el("span");
      barra.style.height = Math.max(6, (v / max) * 100) + "%";
      barra.title = DIAS[i] + ": " + dinero(v);
      col.append(barra);
      d.append(col, el("small", null, DIAS[i]));
      g.append(d);
    });
  }

  function pintarFrecuentes() {
    var cont = $("frecuentes");
    cont.replaceChildren();
    datos.frecuentes.forEach(function (f) {
      var chip = el("span", "frecuente");
      var usar = el("button", null, "⚡ " + f.texto); usar.type = "button";
      usar.title = "Guardar ahora: " + f.texto;
      usar.addEventListener("click", function () {
        var r = Parser.interpretar(f.texto);
        if (!r.ok) { mensaje("rapido-mensaje", r.error, true); return; }
        usar.disabled = true;
        guardarRegistro(r, r.categoria, false).finally(function () { usar.disabled = false; });
      });
      chip.append(usar);
      cont.append(chip);
    });
  }

  // ---------- Planes: límites y metas ----------
  function estadoLimite(l) {
    var rango = Periodos.periodo(l.ciclo);
    var creado = l.creado_en ? new Date(l.creado_en) : new Date();
    var vigente = l.recurrente || (creado >= rango.desde && creado < rango.hasta);
    return { rango: rango, vigente: vigente, gastado: vigente ? gastadoEn(rango, l.categoria_id) : 0 };
  }

  // Suscripciones: lo que se cobra cada mes con el mismo nombre (Netflix, Spotify, plan del celular, gimnasio…).
  // La misma lista sale en Planes y en el gráfico «Suscripciones y pagos fijos» de Análisis.
  function pintarSuscripciones(destino) {
    var cont = destino || $("suscripciones");
    if (!cont) return;
    var s = A.suscripciones(datos.movimientos, new Date());
    if (!destino) cont.replaceChildren();
    if (!s.lista.length) {
      cont.append(el("p", "nota", "Cuando NOVA vea un cobro que se repite cada mes con el mismo nombre (Netflix, Spotify, el plan del celular, el arriendo…), aparece aquí con lo que suma al año."));
      return;
    }
    var res = el("div", "sus-resumen");
    res.append(el("strong", null, dinero(s.mensual) + " al mes"), el("small", null, s.activas + (s.activas === 1 ? " pago que se repite" : " pagos que se repiten") + " · " + dinero(s.anual) + " al año"));
    cont.append(res);
    var ul = el("ul", "sus-lista");
    s.lista.forEach(function (x) {
      var li = el("li", "sus-fila" + (x.cancelada ? " cancelada" : ""));
      li.tabIndex = 0; li.setAttribute("role", "button");
      var c = categoria(x.categoriaId) || { icono: "otro" };
      var txt = el("div", "sus-texto");
      txt.append(el("strong", null, x.nombre), el("small", null, x.cancelada
        ? "Hace rato no se cobra: ¿la cancelaste?"
        : "Cada mes · próximo cobro " + fechaCorta.format(new Date(x.proximo))));
      if (x.subio > 0) txt.append(el("span", "chip sus-subio", "▲ subió " + dinero(x.subio)));
      var val = el("div", "sus-valor");
      val.append(el("strong", null, dinero(x.monto)), el("small", null, x.cancelada ? x.veces + " cobros" : dinero(x.anual) + " al año"));
      li.append(pintarIcono(el("span", "mov-icono"), c), txt, val);
      function ver() { abrirBusqueda({ texto: x.nombre, tipo: "gasto" }); }
      li.addEventListener("click", ver);
      li.addEventListener("keydown", function (e) { if (e.key === "Enter") ver(); });
      ul.append(li);
    });
    cont.append(ul);
  }
  function pintarPlanes() {
    pintarSuscripciones();
    var ul = $("lista-limites");
    ul.replaceChildren();
    $("planes-vacio").hidden = !!(datos.limites.length || datos.metas.length);
    if (!datos.limites.length) ul.append(el("li", "vacio", "Sin límites. Crea uno para controlar cuánto gastas en una categoría."));
    datos.limites.forEach(function (l) {
      var c = l.categoria_id != null ? categoria(l.categoria_id) : null;
      var e = estadoLimite(l), limite = num(l.monto), p = Math.min(100, (e.gastado / limite) * 100);
      var li = el("li", "limite");
      li.tabIndex = 0; li.setAttribute("role", "button");
      var cab = el("div", "limite-cabeza");
      var ic = pintarIcono(el("span", "mov-icono chico"), c || { icono: "otro", color: "#2ee06f" });
      var txt = el("div", "mov-texto");
      txt.append(el("strong", null, c ? c.nombre : "Todas las categorías"),
        el("small", null, Periodos.CICLOS[l.ciclo] + (l.recurrente ? " · se renueva" : "") + " · " + A.nombrePeriodo(l.ciclo, e.rango)));
      cab.append(ic, txt, el("strong", null, Math.round(p) + "%"));
      var barra = el("div", "barra"), s = el("span"); s.style.width = p + "%"; barra.append(s);
      if (e.gastado > limite) s.classList.add("excedido");
      var resto = limite - e.gastado;
      var nota = el("span", "nota" + (resto < 0 ? " mal" : resto / limite < 0.15 ? " mal" : ""),
        !e.vigente ? "Este límite ya terminó." : dinero(e.gastado) + " de " + dinero(limite) + " · " + (resto >= 0 ? "te quedan " + dinero(resto) : "te pasaste por " + dinero(-resto)));
      li.append(cab, barra, nota);
      li.addEventListener("click", function () { abrirLimite(l); });
      li.addEventListener("keydown", function (ev) { if (ev.key === "Enter") abrirLimite(l); });
      ul.append(li);
    });
    pintarMetas();
  }

  function pintarMetas() {
    var ul = $("lista-metas");
    ul.replaceChildren();
    if (!datos.metas.length) ul.append(el("li", "vacio", "Todavía no tienes metas."));
    datos.metas.forEach(function (m) {
      var p = Math.min(100, (num(m.ahorrado) / num(m.objetivo)) * 100);
      var li = el("li", "meta");
      var cab = el("div", "meta-cabeza");
      cab.append(el("strong", null, m.nombre), el("span", "nota", Math.round(p) + "%"));
      var barra = el("div", "barra"), s = el("span"); s.style.width = p + "%"; barra.append(s);
      var abono = el("form", "meta-abono");
      var inp = el("input"); inp.inputMode = "numeric"; inp.placeholder = "Abonar, ej. 50 mil"; inp.setAttribute("aria-label", "Valor a abonar a " + m.nombre);
      var ok = el("button", "primario", "Abonar"); ok.type = "submit";
      var del = el("button", "peligro", "Borrar"); del.type = "button";
      var edit = el("button", "mini", "✏️ Editar"); edit.type = "button";
      edit.addEventListener("click", function () {
        abrirEditor({
          titulo: "Editar meta",
          campos: [{ clave: "nombre", etiqueta: "¿Para qué ahorras?", tipo: "texto", valor: m.nombre, requerido: true, max: 60 }, { clave: "objetivo", etiqueta: "¿Cuánto necesitas?", tipo: "plata", valor: num(m.objetivo) }, { clave: "ahorrado", etiqueta: "Lo que llevas ahorrado", tipo: "plata", valor: num(m.ahorrado), permiteCero: true }, { clave: "fecha_limite", etiqueta: "¿Para cuándo? (opcional)", tipo: "fecha", valor: m.fecha_limite }],
          guardar: function (v) { return fuente.actualizar("metas", m.id, { nombre: v.nombre, objetivo: v.objetivo, ahorrado: v.ahorrado, fecha_limite: v.fecha_limite || null }).then(function (n) { Object.assign(m, n); }); },
          borrar: function () { aPapelera("metas", m); return fuente.borrar("metas", m.id).then(function () { datos.metas = datos.metas.filter(function (x) { return x.id !== m.id; }); }); },
          textoBorrar: "🗑 Borrar esta meta", confirmar: "¿Borrar la meta «" + m.nombre + "»?", avisoBorrado: "Meta borrada"
        });
      });
      abono.append(inp, ok, edit, del);
      abono.addEventListener("submit", function (e) {
        e.preventDefault();
        var v = leerValor(inp.value);
        if (!(v > 0)) { inp.focus(); return; }
        ok.disabled = true;
        fuente.actualizar("metas", m.id, { ahorrado: num(m.ahorrado) + v }).then(function (n) {
          Object.assign(m, n); toast("Abonaste " + pesos.format(v) + " a " + m.nombre); pintar();
        }).catch(function (err) { mensaje("meta-mensaje", err.message, true); }).finally(function () { ok.disabled = false; });
      });
      del.addEventListener("click", function () {
        if (!confirm("¿Borrar la meta «" + m.nombre + "»?")) return;
        del.disabled = true;
        var guardada = aPapelera("metas", m);
        fuente.borrar("metas", m.id).then(function () {
          datos.metas = datos.metas.filter(function (x) { return x.id !== m.id; }); pintar();
          toast("Meta borrada", m.nombre, null, { texto: "↩ Deshacer", fn: deshacerBorrado(guardada) });
        }).catch(function (err) { del.disabled = false; mensaje("meta-mensaje", err.message, true); });
      });
      li.append(cab, el("span", null, dinero(num(m.ahorrado)) + " de " + dinero(num(m.objetivo))), barra);
      li.append(pintarFotoDe(m, { tabla: "metas", titulo: "📷 Foto de tu meta", clave: "meta", nombre: function (z) { return z.nombre; }, repintar: function () { pintar(); } }));
      var cuota = A.cuotaMeta(m);
      if (cuota) {
        var txt = cuota.hecha ? "🎉 ¡Meta cumplida!" : cuota.vencida ? "⏰ La fecha ya pasó y te faltan " + dinero(cuota.falta) :
          "📅 Quedan " + cuota.dias + " días. Para llegar ahorra " + dinero(cuota.porSemana) + " por semana o " + dinero(cuota.porMes) + " por mes.";
        li.append(el("span", "nota", txt));
      }
      li.append(abono);
      ul.append(li);
    });
  }

  $("form-meta").addEventListener("submit", function (e) {
    e.preventDefault();
    var nombre = $("meta-nombre").value.trim(), objetivo = leerValor($("meta-objetivo").value);
    if (!nombre) return mensaje("meta-mensaje", "Escribe para qué ahorras.", true);
    if (!(objetivo > 0)) return mensaje("meta-mensaje", "No entendí el valor. Escribe por ejemplo 2 millones.", true);
    fuente.crear("metas", Object.assign({ nombre: nombre, objetivo: objetivo }, $("meta-fecha").value ? { fecha_limite: $("meta-fecha").value } : {})).then(function (m) {
      datos.metas.push(m); e.target.reset(); mensaje("meta-mensaje", "Meta creada."); pintar();
    }).catch(function (err) { mensaje("meta-mensaje", err.message, true); });
  });

  // Pantalla de límite.
  var limiteActual = null, limiteCategoria = null;
  function abrirLimite(l) {
    limiteActual = l || null;
    limiteCategoria = l ? l.categoria_id : null;
    $("lim-titulo").textContent = l ? "Editar límite" : "Nuevo límite";
    $("lim-monto").value = l ? pesos.format(num(l.monto)) : "";
    var sel = $("lim-ciclo");
    sel.replaceChildren();
    Object.keys(Periodos.CICLOS).forEach(function (c) {
      var o = el("option", null, Periodos.CICLOS[c]); o.value = c; o.selected = c === (l ? l.ciclo : cicloEfectivo()); sel.append(o);
    });
    $("lim-recurrente").checked = l ? !!l.recurrente : true;
    $("lim-borrar").hidden = !l;
    mensaje("lim-mensaje", "");
    pintarLimiteCategoria(); pintarLimiteRango();
    abrirCapa("pantalla-limite");
  }
  function pintarLimiteCategoria() {
    var c = limiteCategoria != null ? categoria(limiteCategoria) : null;
    pintarIcono($("lim-cat-icono"), c || { icono: "otro", color: "#2ee06f" });
    $("lim-cat-nombre").textContent = c ? c.nombre : "Todas las categorías";
  }
  function pintarLimiteRango() {
    var c = $("lim-ciclo").value, r = Periodos.periodo(c);
    $("lim-rango").textContent = fechaCorta.format(r.desde) + " – " + fechaCorta.format(new Date(r.hasta.getTime() - 1));
  }
  $("lim-ciclo").addEventListener("change", pintarLimiteRango);
  $("lim-categoria").addEventListener("click", function () {
    elegirCategoria("gasto", function (c) { limiteCategoria = c ? c.id : null; pintarLimiteCategoria(); }, true);
  });
  document.querySelectorAll("[data-nuevo-limite]").forEach(function (b) { b.addEventListener("click", function () { abrirLimite(null); }); });
  $("form-limite").addEventListener("submit", function (e) {
    e.preventDefault();
    var monto = leerValor($("lim-monto").value);
    if (!(monto > 0)) return mensaje("lim-mensaje", "Escribe el límite, por ejemplo 400 mil.", true);
    var fila = { monto: monto, categoria_id: limiteCategoria, ciclo: $("lim-ciclo").value, recurrente: $("lim-recurrente").checked };
    var op = limiteActual ? fuente.actualizar("limites", limiteActual.id, fila) : fuente.crear("limites", fila);
    op.then(function (l) {
      if (limiteActual) Object.assign(limiteActual, l); else datos.limites.push(l);
      toast("Límite guardado"); cerrarCapa(); pintar();
    }).catch(function (err) { mensaje("lim-mensaje", err.message, true); });
  });
  $("lim-borrar").addEventListener("click", function () {
    if (!limiteActual || !confirm("¿Borrar este límite?")) return;
    var id = limiteActual.id;
    fuente.borrar("limites", id).then(function () {
      datos.limites = datos.limites.filter(function (x) { return x.id !== id; });
      toast("Límite borrado"); cerrarCapa(); pintar();
    }).catch(function (err) { mensaje("lim-mensaje", err.message, true); });
  });

  // ---------- Análisis ----------
  var WIDGETS = [
    { id: "rapida", nombre: "Vista rápida" },
    { id: "categorias", nombre: "Gastos por categoría" },
    { id: "etiquetas", nombre: "Gasto por etiqueta" },
    { id: "ingresos-gastos", nombre: "Ingresos vs gastos" },
    { id: "tendencia", nombre: "Tendencia de gastos" },
    { id: "proyeccion", nombre: "Proyección de balance" },
    { id: "consejos", nombre: "Consejos de NOVA" },
    { id: "calendario", nombre: "Calendario de gastos" },
    { id: "logros", nombre: "Logros" },
    { id: "herramientas", nombre: "Calculadoras" },
    { id: "salud", nombre: "Salud financiera" },
    { id: "calculadoras2", nombre: "Más calculadoras" },
    { id: "reto", nombre: "Reto de ahorro 52 semanas" },
    { id: "suscripciones", nombre: "Suscripciones y pagos fijos" },
    { id: "inflacion", nombre: "Tu inflación personal" },
    { id: "comparar", nombre: "Comparar dos meses" },
    { id: "evento", nombre: "Costo de un evento" },
    { id: "fijos", nombre: "Pagos fijos del mes" },
    { id: "pronostico", nombre: "Pronóstico del próximo mes" },
    { id: "anio", nombre: "Tu año en NOVA" },
    { id: "bola", nombre: "Plan para pagar tus deudas" },
    { id: "alcancia", nombre: "Alcancía de redondeo" },
    { id: "sobres", nombre: "Mis sobres de presupuesto" },
    { id: "plan", nombre: "Plan de quincena" },
    { id: "singasto", nombre: "Días sin gastar" },
    { id: "lugares", nombre: "Dónde más gastas" },
    { id: "semanasmes", nombre: "En qué parte del mes gastas" },
    { id: "reduccion", nombre: "Metas de reducción" }
  ];
  function configWidgets() {
    var guardado = leerLocal("nova-widgets", null) || [];
    var lista = guardado.filter(function (w) { return WIDGETS.some(function (x) { return x.id === w.id; }); });
    WIDGETS.forEach(function (w) { if (!lista.some(function (x) { return x.id === w.id; })) lista.push({ id: w.id, visible: true }); });
    return lista;
  }
  function cicloDeAnalisis() { return cicloAnalisis || cicloEfectivo(); }

  function pintarAnalisis() {
    var ciclo = cicloDeAnalisis(), ref = A.desplazar(ciclo, new Date(), desfaseAnalisis).desde;
    var pest = $("analisis-ciclos");
    pest.replaceChildren();
    Object.keys(Periodos.CICLOS).forEach(function (c) {
      var b = el("button", null, Periodos.CICLOS[c]); b.type = "button";
      b.setAttribute("aria-pressed", String(c === ciclo));
      b.addEventListener("click", function () { cicloAnalisis = c; guardarLocal("nova-ciclo-analisis", c); desfaseAnalisis = 0; pintarAnalisis(); });
      pest.append(b);
    });
    var rango = Periodos.periodo(ciclo, ref);
    $("analisis-periodo").textContent = A.nombrePeriodo(ciclo, rango);
    var movs = A.enRango(datos.movimientos, rango);
    var cont = $("widgets");
    cont.replaceChildren();
    configWidgets().forEach(function (w) {
      if (!w.visible) return;
      var art = el("article", "tarjeta widget");
      art.dataset.widget = w.id;
      ({ rapida: wRapida, categorias: wCategorias, etiquetas: wEtiquetas, "ingresos-gastos": wIngresosGastos, tendencia: wTendencia, proyeccion: wProyeccion, consejos: wConsejos, calendario: wCalendario, logros: wLogros, herramientas: wHerramientas, salud: wSalud, calculadoras2: wMasCalculadoras, reto: wReto, suscripciones: wSuscripciones, inflacion: wInflacion, comparar: wComparar, evento: wEvento, fijos: wFijos, pronostico: wPronostico, anio: wAnio, bola: wBola, alcancia: wAlcancia, sobres: wSobres, plan: wPlan, singasto: wSinGasto, lugares: wLugares, semanasmes: wSemanasMes, reduccion: wReduccion })[w.id](art, movs, ciclo, ref, rango);
      cont.append(art);
    });
  }
  document.querySelectorAll("[data-periodo-analisis]").forEach(function (b) {
    b.addEventListener("click", function () { desfaseAnalisis += Number(b.dataset.periodoAnalisis); pintarAnalisis(); });
  });

  // ---------- Consejos, calendario, logros y calculadoras ----------
  function wConsejos(art, movs, ciclo, ref, rango) {
    titulo(art, "Consejos de NOVA");
    var ant = A.enRango(datos.movimientos, A.desplazar(ciclo, ref, -1));
    var lista = NovaConsejos.consejos(movs, ant, datos.movimientos, { rango: rango, saldo: saldoTotal(), categorias: datos.categorias });
    if (!lista.length) return art.append(el("p", "nota", "Cuando tengas gastos en este periodo, aquí te cuento qué noto en ellos."));
    var ul = el("ul", "lista-simple");
    lista.forEach(function (c) { var li = el("li", "consejo"); li.append(el("span", "consejo-icono", c.icono)); var t = el("div"); t.append(el("strong", null, c.titulo), el("small", null, ocultos ? "••••" : c.texto)); li.append(t); ul.append(li); });
    art.append(ul);
  }
  function wCalendario(art, movs, ciclo, ref, rango) {
    titulo(art, "Calendario de gastos");
    var cal = NovaConsejos.calendario(movs, rango);
    if (!cal.max) return art.append(el("p", "nota", "Sin gastos en este periodo."));
    var cuad = el("div", "calendario");
    var vacios = (cal.dias[0].fecha.getDay() + 6) % 7;
    for (var i = 0; i < vacios; i++) cuad.append(el("span", "cal-dia vacio"));
    cal.dias.forEach(function (d) {
      var c = el("span", "cal-dia", String(d.fecha.getDate()));
      var nivel = d.valor === 0 ? 0 : Math.min(4, 1 + Math.floor((d.valor / cal.max) * 3.99));
      c.dataset.n = nivel; c.title = d.fecha.getDate() + ": " + (ocultos ? "••••" : dinero(d.valor));
      cuad.append(c);
    });
    art.append(cuad, el("p", "nota", "Más oscuro = más gasto ese día."));
  }
  function wLogros(art) {
    titulo(art, "Logros");
    var deudasPagadas = resumenDeDeudas().lista.filter(function (x) { return x.estado === "pagada"; }).length;
    var lista = NovaConsejos.logros({ movimientos: datos.movimientos, racha: A.racha(datos.movimientos), metas: datos.metas, deudasPagadas: deudasPagadas, grupos: datos.grupos.length });
    var hechos = lista.filter(function (x) { return x.hecho; }).length;
    art.append(el("p", "nota", hechos + " de " + lista.length + " logros conseguidos"));
    var caja = el("div", "logros");
    lista.forEach(function (l) { var b = el("div", "logro" + (l.hecho ? " hecho" : "")); b.append(el("span", "logro-icono", l.icono), el("strong", null, l.titulo), el("small", null, l.hecho ? "¡Conseguido!" : l.texto)); caja.append(b); });
    art.append(caja);
  }
  function campoCalc(etq, id, ph, plata) {
    var l = el("label", null, etq); l.setAttribute("for", id);
    var i = el("input"); i.id = id; i.inputMode = "decimal"; i.placeholder = ph; if (plata) i.className = "campo-plata";
    return [l, i];
  }
  function wHerramientas(art, movs) {
    titulo(art, "Calculadoras");
    var ingresos = A.totales(movs).ingresos;
    // Crédito
    var c = el("div", "calc"); c.append(el("strong", null, "🏦 Simulador de crédito"));
    var cm = campoCalc("¿Cuánto pides?", "cr-monto", "10 millones", true), ct = campoCalc("Interés mensual (%)", "cr-tasa", "1,8"), cn = campoCalc("¿En cuántos meses?", "cr-meses", "24");
    var cr = el("p", "calc-res", "Escribe los tres datos.");
    [cm, ct, cn].forEach(function (f) { c.append(f[0], f[1]); }); c.append(cr);
    function calcCredito() {
      var v = NovaConsejos.cuotaCredito(leerValor(cm[1].value), leerTasa(ct[1].value), leerTasa(cn[1].value));
      cr.textContent = v ? "Pagarías " + dinero(v.cuota) + " al mes. En total " + dinero(v.total) + " (intereses: " + dinero(v.intereses) + ")." : "Escribe los tres datos.";
    }
    [cm[1], ct[1], cn[1]].forEach(function (i) { i.addEventListener("input", calcCredito); });
    // Ahorro
    var a = el("div", "calc"); a.append(el("strong", null, "🐖 ¿Cuánto tendré ahorrando?"));
    var am = campoCalc("¿Cuánto ahorras al mes?", "ah-mensual", "200 mil", true), an = campoCalc("¿Durante cuántos meses?", "ah-meses", "12"), at = campoCalc("Interés mensual (%) (opcional)", "ah-tasa", "0");
    var ar = el("p", "calc-res", "Escribe los datos.");
    [am, an, at].forEach(function (f) { a.append(f[0], f[1]); }); a.append(ar);
    function calcAhorro() {
      var m = leerValor(am[1].value), n = leerTasa(an[1].value);
      if (!(m > 0) || !(n > 0)) { ar.textContent = "Escribe los datos."; return; }
      var v = NovaConsejos.ahorroFuturo(m, n, leerTasa(at[1].value) || 0, 0);
      ar.textContent = "Tendrías " + dinero(v.total) + " (aportas " + dinero(v.aportado) + (v.ganado > 0 ? " y ganas " + dinero(v.ganado) : "") + ").";
    }
    [am[1], an[1], at[1]].forEach(function (i) { i.addEventListener("input", calcAhorro); });
    // 50/30/20
    var r = el("div", "calc"); r.append(el("strong", null, "⚖️ Regla 50/30/20"));
    if (ingresos > 0) { var s = NovaConsejos.regla503020(ingresos); r.append(el("p", "calc-res", "Con tus ingresos de " + dinero(ingresos) + ": " + dinero(s.necesidades) + " para necesidades, " + dinero(s.gustos) + " para gustos y " + dinero(s.ahorro) + " para ahorrar.")); }
    else r.append(el("p", "calc-res", "Cuando tengas ingresos en este periodo te digo cómo repartirlos: 50 % necesidades, 30 % gustos, 20 % ahorro."));
    art.append(c, a, r);
  }
  function leerTasa(t) { var v = parseFloat(String(t).replace(",", ".")); return isNaN(v) ? 0 : v; }

  // Salud financiera: puntaje, fondo de emergencia, deudas y mejor/peor mes.
  function wSuscripciones(art) {
    titulo(art, "Suscripciones y pagos fijos");
    pintarSuscripciones(art);
    art.append(el("p", "nota", "¿Ya no lo usas? Cancelarlo es plata que vuelve a tu bolsillo."));
  }
  function wInflacion(art) {
    titulo(art, "Tu inflación personal");
    var r = NovaConsejos.inflacionPersonal(datos.movimientos);
    if (!r.lista.length) return art.append(el("p", "nota", "Cuando compres lo mismo varias veces durante más de dos meses, te muestro cuánto subió el precio."));
    art.append(el("p", "calc-res", "Lo que compras seguido cambió en promedio " + (r.general > 0 ? "+" : "") + r.general + " %."));
    var ul = el("ul", "lista-simple");
    r.lista.slice(0, 6).forEach(function (x) { var li = el("li", "consejo"); li.append(el("span", "consejo-icono", x.cambioPct > 0 ? "🔺" : "🔻")); var d = el("div"); d.append(el("strong", null, x.nombre), el("small", null, ocultos ? "••••" : "Antes " + dinero(x.antes) + " · ahora " + dinero(x.ahora) + " (" + (x.cambioPct > 0 ? "+" : "") + x.cambioPct + " %)")); li.append(d); ul.append(li); });
    art.append(ul);
  }
  function wComparar(art) {
    titulo(art, "Comparar dos meses");
    var meses = NovaConsejos.mesesConDatos(datos.movimientos);
    if (meses.length < 2) return art.append(el("p", "nota", "Necesito movimientos de al menos dos meses para compararlos."));
    var selA = el("select"), selB = el("select");
    meses.forEach(function (m) { [selA, selB].forEach(function (s) { var o = el("option", null, m.nombre); o.value = m.clave; s.append(o); }); });
    selA.value = meses[1].clave; selB.value = meses[0].clave;
    var res = el("div");
    art.append(selA, selB, res);
    function pintarComp() {
      var r = NovaConsejos.compararMeses(datos.movimientos, Number(selA.value), Number(selB.value));
      res.replaceChildren();
      res.append(el("p", "calc-res", ocultos ? "••••" : "Gastaste " + dinero(Math.abs(r.dif)) + (r.dif > 0 ? " más" : " menos") + " en el segundo mes (" + dinero(r.totalA) + " → " + dinero(r.totalB) + ")."));
      var ul = el("ul", "lista-simple");
      r.filas.slice(0, 8).forEach(function (f) { var li = el("li", "consejo"); var d = el("div"); d.append(el("strong", null, nombreCategoria(f.categoria_id)), el("small", null, ocultos ? "••••" : dinero(f.a) + " → " + dinero(f.b) + " (" + (f.dif > 0 ? "+" : "−") + dinero(Math.abs(f.dif)) + ")")); li.append(d); ul.append(li); });
      res.append(ul);
    }
    selA.addEventListener("change", pintarComp); selB.addEventListener("change", pintarComp); pintarComp();
  }
  function wEvento(art) {
    titulo(art, "Costo de un evento");
    var etiquetas = NovaConsejos.etiquetasUsadas(datos.movimientos);
    if (!etiquetas.length) return art.append(el("p", "nota", "Marca tus gastos con una etiqueta (por ejemplo #viaje) y aquí ves cuánto costó todo junto."));
    var sel = el("select"); etiquetas.forEach(function (t) { var o = el("option", null, "#" + t); o.value = t; sel.append(o); });
    var res = el("div"); art.append(sel, res);
    function pintarEv() {
      var r = NovaConsejos.costoEvento(datos.movimientos, sel.value); res.replaceChildren();
      if (!r) return;
      res.append(el("p", "calc-res", ocultos ? "••••" : "#" + sel.value + " costó " + dinero(r.total) + " en " + r.cantidad + (r.cantidad === 1 ? " gasto" : " gastos") + "."),
        el("p", "nota", ocultos ? "" : "Del " + fechaCorta.format(r.desde) + " al " + fechaCorta.format(r.hasta) + ". El más grande: «" + r.mayor.descripcion + "» por " + dinero(num(r.mayor.monto)) + "."));
    }
    sel.addEventListener("change", pintarEv); pintarEv();
  }

  function wFijos(art) {
    titulo(art, "Pagos fijos del mes");
    var r = NovaConsejos.pagosFijosMes(datos.movimientos);
    if (!r.lista.length) return art.append(el("p", "nota", "Cuando tengas pagos que se repiten cada mes (arriendo, internet, plataformas), aquí ves cuáles ya pagaste este mes."));
    art.append(el("p", "calc-res", r.pagados + " de " + r.lista.length + " pagados" + (r.faltan > 0 && !ocultos ? " · faltan " + dinero(r.faltan) : "")));
    var ul = el("ul", "lista-simple");
    r.lista.forEach(function (x) { var li = el("li", "consejo"); li.append(el("span", "consejo-icono", x.pagado ? "✅" : "⏳")); var d = el("div"); d.append(el("strong", null, x.nombre), el("small", null, ocultos ? "••••" : dinero(x.monto) + (x.pagado ? " · ya lo pagaste" : " · pendiente"))); li.append(d); ul.append(li); });
    art.append(ul);
  }
  function wPronostico(art) {
    titulo(art, "Pronóstico del próximo mes");
    var r = NovaConsejos.pronosticoMes(datos.movimientos);
    if (!r) return art.append(el("p", "nota", "Necesito movimientos de algún mes anterior para calcular el pronóstico."));
    art.append(el("p", "calc-res", ocultos ? "••••" : "En " + r.mes + " gastarías cerca de " + dinero(r.gastos) + "."));
    art.append(el("p", "nota", ocultos ? "" : (r.ingresos > 0 ? "Con ingresos de " + dinero(r.ingresos) + " te " + (r.resultado >= 0 ? "sobrarían " : "faltarían ") + dinero(Math.abs(r.resultado)) + ". " : "") + "Se calcula con el promedio de tus últimos " + r.basadoEn + (r.basadoEn === 1 ? " mes." : " meses.")));
  }
  function wAnio(art) {
    var anio = new Date().getFullYear();
    titulo(art, "Tu año en NOVA " + anio);
    var r = NovaConsejos.tuAnio(datos.movimientos, anio);
    if (!r) return art.append(el("p", "nota", "Cuando tengas movimientos este año, aquí ves tu resumen."));
    var ul = el("ul", "lista-simple");
    function fila(i, t, x) { var li = el("li", "consejo"); li.append(el("span", "consejo-icono", i)); var d = el("div"); d.append(el("strong", null, t), el("small", null, ocultos ? "••••" : x)); li.append(d); ul.append(li); }
    fila("🧾", "Movimientos anotados", r.movimientos + " en " + r.diasRegistrados + " días distintos");
    fila("💸", "Gastaste", dinero(r.gastos)); fila("💰", "Ingresaste", dinero(r.ingresos));
    if (r.top.length) fila("🥇", "Lo que más pesó", r.top.map(function (t) { return nombreCategoria(t.categoria_id) + " (" + dinero(t.total) + ")"; }).join(" · "));
    if (r.mejorMes) fila("🌟", "Tu mejor mes", r.mejorMes);
    if (r.mayor) fila("🏆", "Tu mayor gasto", "«" + r.mayor.descripcion + "» por " + dinero(num(r.mayor.monto)));
    art.append(ul);
    var b = el("button", "mini", "📤 Compartir mi año"); b.type = "button";
    b.addEventListener("click", function () { compartirTexto("Mi año en NOVA", "Mi año en NOVA " + anio + ": anoté " + r.movimientos + " movimientos, gasté " + pesos.format(r.gastos) + " e ingresé " + pesos.format(r.ingresos) + (r.mejorMes ? ". Mi mejor mes: " + r.mejorMes : "") + ". — NOVA · OPITA-DIGITAL"); });
    art.append(b);
  }
  function wBola(art) {
    titulo(art, "Plan para pagar tus deudas");
    var pend = resumenDeDeudas().lista.filter(function (x) { return x.deuda.tipo === "debo" && x.falta > 0; }).map(function (x) { return { persona: x.deuda.persona, falta: x.falta }; });
    if (!pend.length) return art.append(el("p", "nota", "No tienes deudas pendientes. ¡Bien!"));
    art.append(el("p", "nota", "Método bola de nieve: paga el mínimo en todas y todo lo que te sobre a la más pequeña. Al cerrarla, sigues con la siguiente y ganas ánimo."));
    var ul = el("ul", "lista-simple");
    NovaConsejos.bolaDeNieve(pend).forEach(function (x) { var li = el("li", "consejo"); li.append(el("span", "consejo-icono", String(x.orden) + "️⃣")); var d = el("div"); d.append(el("strong", null, x.persona), el("small", null, ocultos ? "••••" : "Faltan " + dinero(x.falta))); li.append(d); ul.append(li); });
    art.append(ul);
  }

  // Alcancía de redondeo: lo que sobra al redondear cada gasto a mil (apartado virtual; se pasa a una meta cuando quieras).
  function claveAlcancia() { return "nova-alcancia:" + ((fuente && fuente.email) || "demo"); }
  function sumarAlcancia(monto) { if (!leerLocal("nova-redondeo", false)) return 0; var r = NovaConsejos.redondeo(monto); if (r > 0) guardarLocal(claveAlcancia(), leerLocal(claveAlcancia(), 0) + r); return r; }
  function wAlcancia(art) {
    titulo(art, "Alcancía de redondeo");
    var total = leerLocal(claveAlcancia(), 0);
    if (!leerLocal("nova-redondeo", false) && !total) return art.append(el("p", "nota", "Actívala en Configuración → «Tu plata»: cada gasto se redondea a mil y lo que sobra se aparta aquí."));
    art.append(el("p", "calc-res", ocultos ? "••••" : "Llevas " + dinero(total) + " apartados."));
    if (!(total > 0) || !datos.metas.length) return art.append(el("p", "nota", datos.metas.length ? "Registra gastos y esto se irá llenando." : "Crea una meta de ahorro para poder pasarle lo que apartes."));
    var sel = el("select"); datos.metas.forEach(function (m) { var o = el("option", null, m.nombre); o.value = m.id; sel.append(o); });
    var b = el("button", "mini", "Pasar a la meta"); b.type = "button";
    b.addEventListener("click", function () {
      var m = datos.metas.find(function (x) { return String(x.id) === sel.value; }); if (!m) return;
      b.disabled = true;
      fuente.actualizar("metas", m.id, { ahorrado: num(m.ahorrado) + total }).then(function (n) { Object.assign(m, n); guardarLocal(claveAlcancia(), 0); toast("¡Pasado a la meta!", m.nombre, pesos.format(total)); pintar(); })
        .catch(function (err) { b.disabled = false; toast("No se pudo pasar: " + err.message); });
    });
    art.append(sel, b);
  }
  $("redondeo-activo").checked = !!leerLocal("nova-redondeo", false);
  $("redondeo-activo").addEventListener("change", function (e) { guardarLocal("nova-redondeo", e.target.checked); toast(e.target.checked ? "Redondeo ahorrador activado" : "Redondeo ahorrador apagado"); });

  // Día de pago: cuántos días faltan y cuánto puedes gastar por día.
  $("dia-pago").value = leerLocal("nova-dia-pago", "") || "";
  $("dia-pago").addEventListener("change", function (e) { var v = parseInt(e.target.value, 10); guardarLocal("nova-dia-pago", v >= 1 && v <= 31 ? v : ""); if (fuente) pintar(); });
  function pintarProximoPago() {
    var r = NovaConsejos.diasParaPago(leerLocal("nova-dia-pago", ""), new Date(), saldoTotal());
    $("tarjeta-pago").hidden = !r;
    if (!r) return;
    $("pago-valor").textContent = r.dias === 1 ? "Mañana" : "Faltan " + r.dias + " días";
    $("pago-nota").textContent = ocultos ? "" : (r.porDia > 0 ? "Con tu saldo de " + dinero(saldoTotal()) + " puedes gastar hasta " + dinero(r.porDia) + " por día hasta entonces." : "Ojo: tu saldo no alcanza para llegar sin gastar de más.");
  }

  function barraSimple(pct, pasado) { var b = el("div", "barra" + (pasado ? " pasado" : "")), i = el("span"); i.style.width = Math.max(0, Math.min(100, pct)) + "%"; b.append(i); return b; }
  function wSobres(art) {
    titulo(art, "Mis sobres de presupuesto");
    if (!datos.limites.length) return art.append(el("p", "nota", "Cada límite que pones en Planes es un sobre: ahí ves cuánta plata te queda en cada uno."));
    var ul = el("ul", "lista-simple");
    datos.limites.forEach(function (l) {
      var e = estadoLimite(l), lim = num(l.monto), queda = lim - e.gastado, li = el("li", "sobre");
      li.append(el("strong", null, "✉️ " + (l.categoria_id != null ? nombreCategoria(l.categoria_id) : "Todo")), el("small", null, ocultos ? "••••" : (queda >= 0 ? "Te quedan " + dinero(queda) + " de " + dinero(lim) : "Te pasaste por " + dinero(-queda))), barraSimple(lim > 0 ? (e.gastado / lim) * 100 : 0, queda < 0));
      ul.append(li);
    });
    art.append(ul);
  }
  function wPlan(art, movs) {
    titulo(art, "Plan de quincena");
    art.append(el("p", "nota", "Escribe cuánto te pagaron y te digo cómo repartirlo entre pagos fijos, deudas, ahorro y lo que te queda libre."));
    var campos = [campoCalc("¿Cuánto te pagaron?", "pq-ingreso", "1 millón", true), campoCalc("Cuota de deudas este pago", "pq-deuda", "0", true), campoCalc("% para ahorrar", "pq-pct", "10")];
    var caja = el("div", "calc"), res = el("div");
    campos.forEach(function (f) { caja.append(f[0], f[1]); }); caja.append(res); art.append(caja);
    var fijos = NovaConsejos.pagosFijosMes(datos.movimientos).faltan;
    function pintarPlan() {
      var ing = leerValor(campos[0][1].value), pctTxt = campos[2][1].value;
      var r = NovaConsejos.planQuincena(ing, { fijos: fijos, cuotaDeuda: leerValor(campos[1][1].value) || 0, pctAhorro: pctTxt === "" ? 10 : leerTasa(pctTxt) });
      res.replaceChildren();
      if (!r) return res.append(el("p", "calc-res", "Escribe cuánto te pagaron."));
      var ul = el("ul", "lista-simple");
      [["🏠", "Pagos fijos que faltan este mes", r.fijos], ["🕊️", "Deudas", r.deuda], ["🐖", "Ahorro", r.ahorro], ["🎉", "Libre para gastar", r.libre]].forEach(function (x) {
        var li = el("li", "consejo"); li.append(el("span", "consejo-icono", x[0])); var d = el("div"); d.append(el("strong", null, x[1]), el("small", null, dinero(x[2]))); li.append(d); ul.append(li);
      });
      res.append(ul);
      if (!r.alcanza) res.append(el("p", "calc-res", "Ojo: lo que debes pagar es más de lo que te pagaron."));
    }
    campos.forEach(function (f) { f[1].addEventListener("input", pintarPlan); }); pintarPlan();
  }
  function claveSinGasto() { return "nova-singasto:" + ((fuente && fuente.email) || "demo"); }
  function wSinGasto(art) {
    titulo(art, "Días sin gastar");
    var dias = NovaConsejos.diasSinGasto(datos.movimientos), mes = new Date().getFullYear() * 12 + new Date().getMonth();
    var est = leerLocal(claveSinGasto(), { mes: mes, pasados: 0, valor: 5000 });
    if (est.mes !== mes) est = { mes: mes, pasados: 0, valor: est.valor || 5000 };
    var pendientes = Math.max(0, dias - est.pasados);
    art.append(el("p", "calc-res", dias + (dias === 1 ? " día" : " días") + " sin gastar en lo que va del mes."));
    var l = el("label", null, "Cada día sin gastar vale"); l.setAttribute("for", "sg-valor");
    var inp = el("input"); inp.id = "sg-valor"; inp.className = "campo-plata"; inp.inputMode = "numeric"; inp.value = numeroCO.format(est.valor);
    art.append(l, inp);
    var txt = el("p", "nota"); art.append(txt);
    function pintarSG() { txt.textContent = ocultos ? "••••" : "Tienes " + dinero(pendientes * est.valor) + " por apartar (" + pendientes + (pendientes === 1 ? " día" : " días") + ")."; }
    inp.addEventListener("change", function () { var v = leerValor(inp.value); if (v > 0) { est.valor = v; guardarLocal(claveSinGasto(), est); pintarSG(); } });
    pintarSG();
    if (pendientes > 0 && datos.metas.length) {
      var sel = el("select"); datos.metas.forEach(function (m) { var o = el("option", null, m.nombre); o.value = m.id; sel.append(o); });
      var b = el("button", "mini", "Pasar a la meta"); b.type = "button";
      b.addEventListener("click", function () {
        var m = datos.metas.find(function (x) { return String(x.id) === sel.value; }); if (!m) return;
        var monto = pendientes * est.valor; b.disabled = true;
        fuente.actualizar("metas", m.id, { ahorrado: num(m.ahorrado) + monto }).then(function (n) { Object.assign(m, n); est.pasados = dias; guardarLocal(claveSinGasto(), est); toast("¡Pasado a la meta!", m.nombre, pesos.format(monto)); pintar(); })
          .catch(function (err) { b.disabled = false; toast("No se pudo pasar: " + err.message); });
      });
      art.append(sel, b);
    }
  }
  function wLugares(art) {
    titulo(art, "Dónde más gastas");
    var l = NovaConsejos.lugares(datos.movimientos, 5);
    if (!l.length) return art.append(el("p", "nota", "Activa guardar la ubicación en Configuración y, cuando pagues, aquí ves los lugares donde más gastas."));
    var ul = el("ul", "lista-simple");
    l.forEach(function (x) {
      var li = el("li", "consejo"); li.append(el("span", "consejo-icono", "📍")); var d = el("div");
      var a = el("a", null, "Ver en Mapas"); a.href = "https://www.google.com/maps/search/?api=1&query=" + x.lat + "," + x.lng; a.target = "_blank"; a.rel = "noopener";
      d.append(el("strong", null, x.nombre), el("small", null, ocultos ? "••••" : dinero(x.total) + " en " + x.veces + (x.veces === 1 ? " compra" : " compras")), a); li.append(d); ul.append(li);
    });
    art.append(ul);
    var bc = el("button", "mini", "🔥 Ver mapa de calor"); bc.type = "button"; bc.addEventListener("click", abrirMapaCalor); art.append(bc);
  }
  function wSemanasMes(art) {
    titulo(art, "En qué parte del mes gastas");
    var r = NovaConsejos.semanasDelMes(datos.movimientos);
    if (!r) return art.append(el("p", "nota", "Cuando tengas gastos, aquí ves en qué parte del mes se te va más la plata."));
    art.append(el("p", "calc-res", "Gastas más " + r.mayor.nombre.toLowerCase().replace("del 22 en adelante", "del 22 en adelante") + " (" + r.mayor.pct + " %)."));
    r.filas.forEach(function (f) { var fila = el("div", "sobre"); fila.append(el("small", null, f.nombre + " · " + (ocultos ? "••••" : dinero(f.total)) + " · " + f.pct + " %"), barraSimple(f.pct)); art.append(fila); });
  }
  function wReduccion(art, movs, ciclo, ref) {
    titulo(art, "Metas de reducción");
    var metas = leerLocal("nova-reducciones", []), ant = A.enRango(datos.movimientos, A.desplazar(ciclo, ref, -1));
    art.append(el("p", "nota", "Elige una categoría y cuánto quieres bajarla frente al periodo anterior. Se guarda en este dispositivo."));
    var ul = el("ul", "lista-simple");
    metas.forEach(function (m, i) {
      var r = NovaConsejos.progresoReduccion(movs, ant, m.categoria_id, m.pct), li = el("li", "sobre");
      li.append(el("strong", null, "📉 " + nombreCategoria(m.categoria_id) + " −" + m.pct + " %"));
      li.append(el("small", null, !r ? "Aún no hay gastos de esta categoría en el periodo anterior para comparar." : ocultos ? "••••" : (r.cumple ? "✅ Vas bien: llevas " + dinero(r.actual) + " y tu tope es " + dinero(r.meta) + "." : "Llevas " + dinero(r.actual) + ": te pasaste " + dinero(r.faltaParaMeta) + " de tu tope de " + dinero(r.meta) + ".")));
      if (r) li.append(barraSimple(r.uso, !r.cumple));
      var x = el("button", "mini", "Quitar"); x.type = "button";
      x.addEventListener("click", function () { metas.splice(i, 1); guardarLocal("nova-reducciones", metas); pintarAnalisis(); });
      li.append(x); ul.append(li);
    });
    art.append(ul);
    var sel = el("select"); datos.categorias.filter(function (c) { return c.tipo === "gasto"; }).forEach(function (c) { var o = el("option", null, c.nombre); o.value = c.id; sel.append(o); });
    var pct = el("select"); [5, 10, 15, 20, 30].forEach(function (v) { var o = el("option", null, "Bajar " + v + " %"); o.value = v; pct.append(o); }); pct.value = "10";
    var add = el("button", "mini", "+ Agregar meta"); add.type = "button";
    add.addEventListener("click", function () { metas.push({ categoria_id: Number(sel.value), pct: Number(pct.value) }); guardarLocal("nova-reducciones", metas); pintarAnalisis(); });
    art.append(sel, pct, add);
  }

  // Apartar al cobrar: al anotar un ingreso se propone mover una parte a una meta.
  function pintarApartar() {
    var cfg = leerLocal("nova-apartar", { on: false, pct: 10, metaId: null }), sel = $("apartar-meta");
    sel.replaceChildren();
    datos.metas.forEach(function (m) { var o = el("option", null, m.nombre); o.value = m.id; sel.append(o); });
    if (cfg.metaId != null) sel.value = String(cfg.metaId);
    $("apartar-activo").checked = !!cfg.on; $("apartar-pct").value = cfg.pct || 10;
  }
  function guardarApartar() { guardarLocal("nova-apartar", { on: $("apartar-activo").checked, pct: Math.min(50, Math.max(1, parseInt($("apartar-pct").value, 10) || 10)), metaId: $("apartar-meta").value || null }); }
  ["apartar-activo", "apartar-pct", "apartar-meta"].forEach(function (id) { $(id).addEventListener("change", guardarApartar); });
  function proponerApartar(ingreso) {
    var cfg = leerLocal("nova-apartar", null);
    if (!cfg || !cfg.on || !cfg.metaId) return false;
    var m = datos.metas.find(function (x) { return String(x.id) === String(cfg.metaId); }); if (!m) return false;
    var monto = Math.round(num(ingreso.monto) * cfg.pct / 100); if (!(monto > 0)) return false;
    setTimeout(function () {
      toast("¿Apartar el " + cfg.pct + " %?", m.nombre, pesos.format(monto), { texto: "Apartar", fn: function () {
        fuente.actualizar("metas", m.id, { ahorrado: num(m.ahorrado) + monto }).then(function (n) { Object.assign(m, n); toast("¡Apartado!", m.nombre, pesos.format(monto)); pintar(); }).catch(function (err) { toast("No se pudo apartar: " + err.message); });
      } });
    }, 3400);
    return true;
  }

  function wSalud(art, movs) {
    titulo(art, "Salud financiera");
    var t = A.totales(movs), deuda = resumenDeDeudas().debo;
    var s = NovaConsejos.salud({ ingresos: t.ingresos, gastos: t.gastos, saldo: saldoTotal(), gastoMensual: NovaConsejos.gastoMensualPromedio(datos.movimientos), deudaPendiente: deuda });
    var grande = el("div", "salud-puntaje"); grande.append(el("strong", null, ocultos ? "••" : String(s.puntaje)), el("span", null, "de 100 · " + s.nivel));
    var barra = el("div", "barra"), i = el("span"); i.style.width = s.puntaje + "%"; barra.append(i);
    art.append(grande, barra);
    var ul = el("ul", "lista-simple");
    function fila(icono, tit, txt) { var li = el("li", "consejo"); li.append(el("span", "consejo-icono", icono)); var d = el("div"); d.append(el("strong", null, tit), el("small", null, ocultos ? "••••" : txt)); li.append(d); ul.append(li); }
    fila("🛟", "Fondo de emergencia", s.fondoMeses == null ? "Cuando tengas gastos de meses anteriores te digo cuántos meses cubre tu saldo." : "Tu saldo cubre " + (Math.round(s.fondoMeses * 10) / 10) + " meses de gastos. La meta es 3 o más.");
    fila("⚖️", "Deudas frente a ingresos", deuda === 0 ? "No tienes deudas pendientes. ¡Bien!" : s.ratioDeuda == null ? "Debes " + dinero(deuda) + "." : "Debes " + dinero(deuda) + ", que equivale a " + (Math.round(s.ratioDeuda * 10) / 10) + " veces tus ingresos de este periodo.");
    var mp = NovaConsejos.mejorPeorMes(datos.movimientos);
    if (mp) fila("🗓️", "Mejor y peor mes", "Tu mejor mes fue " + mp.mejor.mes + " (" + dinero(mp.mejor.neto) + ") y el más apretado " + mp.peor.mes + " (" + dinero(mp.peor.neto) + ").");
    fila("💡", "Lo que más te ayuda", s.consejo);
    art.append(ul);
    var gm = NovaConsejos.gastoMensualPromedio(datos.movimientos);
    if (gm > 0 && !datos.metas.some(function (x) { return x.nombre === "Fondo de emergencia"; })) {
      var bf = el("button", "mini", "🛟 Crear mi meta de fondo de emergencia (" + dinero(gm * 3) + ")"); bf.type = "button";
      bf.addEventListener("click", function () {
        bf.disabled = true;
        fuente.crear("metas", { nombre: "Fondo de emergencia", objetivo: Math.round(gm * 3) }).then(function (m) { datos.metas.push(m); toast("¡Meta creada!", "Fondo de emergencia", pesos.format(num(m.objetivo))); pintar(); })
          .catch(function (err) { bf.disabled = false; toast("No se pudo crear: " + err.message); });
      });
      art.append(bf);
    }
  }
  // Calculadora genérica: campos [{ id, etq, ph, plata }], calcular(valores) -> texto o null.
  function calculadora(art, tit, campos, calcular) {
    var c = el("div", "calc"); c.append(el("strong", null, tit));
    var res = el("p", "calc-res", "Escribe los datos."), entradas = {};
    campos.forEach(function (f) { var par = campoCalc(f.etq, f.id, f.ph, f.plata); c.append(par[0], par[1]); entradas[f.id] = { el: par[1], plata: f.plata }; });
    c.append(res);
    function actualizar() {
      var v = {}; Object.keys(entradas).forEach(function (k) { v[k] = entradas[k].plata ? leerValor(entradas[k].el.value) : leerTasa(entradas[k].el.value); });
      var txt; try { txt = calcular(v); } catch (e) { txt = null; }
      res.textContent = txt || "Escribe los datos.";
    }
    Object.keys(entradas).forEach(function (k) { entradas[k].el.addEventListener("input", actualizar); });
    art.append(c);
  }
  function wMasCalculadoras(art) {
    titulo(art, "Más calculadoras");
    var N = NovaConsejos;
    calculadora(art, "🧾 IVA (19 %)", [{ id: "iva-valor", etq: "Valor", ph: "100 mil", plata: true }, { id: "iva-pct", etq: "IVA (%)", ph: "19" }, { id: "iva-modo", etq: "¿El valor ya incluye IVA? (1 = sí, 0 = no)", ph: "0" }], function (v) {
      var r = N.iva(v["iva-valor"], v["iva-pct"] || 19, v["iva-modo"] === 1 ? "menos" : "mas");
      return r ? "Sin IVA " + dinero(r.base) + " · IVA " + dinero(r.iva) + " · Con IVA " + dinero(r.total) : null;
    });
    calculadora(art, "🍽️ Dividir la cuenta con propina", [{ id: "pr-total", etq: "Total de la cuenta", ph: "200 mil", plata: true }, { id: "pr-personas", etq: "¿Cuántas personas?", ph: "4" }, { id: "pr-pct", etq: "Propina (%)", ph: "10" }], function (v) {
      var r = N.dividirCuenta(v["pr-total"], v["pr-personas"], v["pr-pct"]);
      return r ? "Propina " + dinero(r.propina) + " · Total " + dinero(r.total) + " · Cada uno " + dinero(r.porPersona) : null;
    });
    calculadora(art, "☕ ¿Cuánto cuesta un hábito?", [{ id: "ha-monto", etq: "¿Cuánto gastas cada vez?", ph: "5 mil", plata: true }, { id: "ha-veces", etq: "¿Cuántas veces por semana?", ph: "5" }], function (v) {
      var r = N.costoHabito(v["ha-monto"], v["ha-veces"]);
      return r ? "Por semana " + dinero(r.semana) + " · por mes " + dinero(r.mes) + " · por año " + dinero(r.anio) : null;
    });
    calculadora(art, "🛍️ ¿Contado o a cuotas?", [{ id: "cu-precio", etq: "Precio de contado", ph: "1 millón", plata: true }, { id: "cu-n", etq: "Número de cuotas", ph: "12" }, { id: "cu-valor", etq: "Valor de cada cuota", ph: "100 mil", plata: true }], function (v) {
      var r = N.contadoVsCuotas(v["cu-precio"], v["cu-n"], v["cu-valor"]);
      return r ? (r.conInteres ? "En cuotas pagas " + dinero(r.total) + ": " + dinero(r.extra) + " de más (≈ " + String(r.tasaMensualPct).replace(".", ",") + " % mensual)." : "Las cuotas no cuestan más que el contado. ¡Te conviene a cuotas!") : null;
    });
    calculadora(art, "🏦 CDT o ahorro a plazo", [{ id: "cd-monto", etq: "¿Cuánto inviertes?", ph: "5 millones", plata: true }, { id: "cd-tasa", etq: "Tasa efectiva anual (%)", ph: "10" }, { id: "cd-meses", etq: "¿Cuántos meses?", ph: "12" }], function (v) {
      var r = N.cdt(v["cd-monto"], v["cd-tasa"], v["cd-meses"]);
      return r ? "Ganarías " + dinero(r.ganancia) + " y tendrías " + dinero(r.total) + " (antes de impuestos)." : null;
    });
    calculadora(art, "💼 Prima y cesantías (estimado)", [{ id: "pc-sal", etq: "Salario mensual", ph: "2 millones", plata: true }, { id: "pc-aux", etq: "Auxilio de transporte (opcional)", ph: "0", plata: true }, { id: "pc-dias", etq: "Días trabajados en el año", ph: "360" }], function (v) {
      var r = N.primaCesantias(v["pc-sal"], v["pc-aux"] > 0 ? v["pc-aux"] : 0, v["pc-dias"]);
      return r ? "Prima " + dinero(r.prima) + " · Cesantías " + dinero(r.cesantias) + " · Intereses " + dinero(r.intereses) + ". Es un cálculo aproximado." : null;
    });
    calculadora(art, "🕊️ ¿Cuándo salgo de una deuda?", [{ id: "sd-saldo", etq: "¿Cuánto debes?", ph: "5 millones", plata: true }, { id: "sd-tasa", etq: "Interés mensual (%)", ph: "2" }, { id: "sd-cuota", etq: "¿Cuánto pagas al mes?", ph: "300 mil", plata: true }], function (v) {
      var r = N.salirDeDeuda(v["sd-saldo"], v["sd-tasa"], v["sd-cuota"]);
      if (!r) return null;
      if (r.imposible) return "Con esa cuota no alcanzas ni a pagar los intereses. Sube la cuota por encima de " + dinero(r.minima) + ".";
      var a = Math.floor(r.meses / 12), m = r.meses % 12;
      return "Terminas en " + (a ? a + (a === 1 ? " año" : " años") + (m ? " y " : "") : "") + (m ? m + (m === 1 ? " mes" : " meses") : "") + " y pagas " + dinero(r.total) + " en total.";
    });
  }
  // Reto de ahorro de 52 semanas: se marcan las semanas cumplidas (se guarda en este dispositivo).
  function wReto(art) {
    titulo(art, "Reto de ahorro 52 semanas");
    art.append(el("p", "nota", "La semana 1 ahorras el valor base, la 2 el doble, la 3 el triple… Marca cada semana que cumplas. Se guarda en este dispositivo."));
    var base = leerLocal("nova-reto-base", 1000), hechas = leerLocal("nova-reto-hechas", []);
    var l = el("label", null, "Valor base de la semana 1"); l.setAttribute("for", "reto-base");
    var inp = el("input"); inp.id = "reto-base"; inp.className = "campo-plata"; inp.inputMode = "numeric"; inp.value = numeroCO.format(base);
    var resumen = el("p", "calc-res"), grid = el("div", "reto-semanas");
    function pintarReto() {
      var r = NovaConsejos.reto52(base, hechas);
      resumen.textContent = "Llevas " + dinero(r.ahorrado) + " de " + dinero(r.total) + " (" + hechas.length + " de 52 semanas).";
      grid.replaceChildren();
      r.semanas.forEach(function (s) {
        var b = el("button", "reto-sem" + (s.hecho ? " hecha" : ""), String(s.semana)); b.type = "button"; b.title = "Semana " + s.semana + ": " + dinero(s.valor);
        b.setAttribute("aria-pressed", String(s.hecho));
        b.addEventListener("click", function () {
          var i = hechas.indexOf(s.semana); if (i >= 0) hechas.splice(i, 1); else hechas.push(s.semana);
          guardarLocal("nova-reto-hechas", hechas); pintarReto();
        });
        grid.append(b);
      });
    }
    inp.addEventListener("change", function () { var v = leerValor(inp.value); if (v > 0) { base = v; guardarLocal("nova-reto-base", v); pintarReto(); } });
    art.append(l, inp, resumen, grid); pintarReto();
  }

  // Sugerencias al escribir la descripción: lo que más has anotado.
  function pintarSugerencias() {
    var cuenta = {};
    datos.movimientos.slice(0, 600).forEach(function (m) { var d = String(m.descripcion || "").trim(); if (d) cuenta[d] = (cuenta[d] || 0) + 1; });
    var lista = Object.keys(cuenta).sort(function (a, b) { return cuenta[b] - cuenta[a]; }).slice(0, 80), dl = $("lista-desc");
    dl.replaceChildren();
    lista.forEach(function (d) { var o = el("option"); o.value = d; dl.append(o); });
  }
  function pintarSemanaYSaludo() {
    var h = new Date().getHours(), nombre = (fuente && fuente.nombre ? String(fuente.nombre).split(" ")[0] : "");
    $("saludo").textContent = (h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches") + (nombre ? ", " + nombre : "") + " 👋";
    var s = NovaConsejos.semana(datos.movimientos);
    $("tarjeta-semana").hidden = !s.movimientos;
    if (!s.movimientos) return;
    $("semana-valor").textContent = ocultos ? "$ ••••" : "Gastaste " + pesos.format(s.gastos);
    $("semana-nota").textContent = ocultos ? "" : (s.cambio == null ? "Esta semana llevas " + s.movimientos + " movimientos." : "Eso es " + Math.abs(s.cambio) + " % " + (s.cambio > 0 ? "más" : "menos") + " que la semana pasada.") + (s.ingresos ? " Ingresaste " + pesos.format(s.ingresos) + "." : "");
  }
  function compartirTexto(titulo, texto) {
    var P = (window.Capacitor && window.Capacitor.Plugins) || {};
    if (enApp && P.Share) return P.Share.share({ title: titulo, text: texto, dialogTitle: titulo }).catch(function () { /* cancelado */ });
    if (navigator.share) return navigator.share({ title: titulo, text: texto }).catch(function () { /* cancelado */ });
    window.open("https://wa.me/?text=" + encodeURIComponent(texto), "_blank", "noopener");
    return Promise.resolve();
  }
  $("semana-compartir").addEventListener("click", function () {
    var s = NovaConsejos.semana(datos.movimientos);
    compartirTexto("Mi semana en NOVA", "Mi semana en NOVA: gasté " + pesos.format(s.gastos) + (s.ingresos ? " e ingresé " + pesos.format(s.ingresos) : "") + (s.cambio != null ? " (" + Math.abs(s.cambio) + " % " + (s.cambio > 0 ? "más" : "menos") + " que la semana pasada)" : "") + ". — NOVA · OPITA-DIGITAL");
  });

  function titulo(art, texto) { art.append(el("h2", "titulo-widget", texto)); }

  function wRapida(art, movs, ciclo, ref) {
    titulo(art, "Vista rápida");
    var v = A.vistaRapida(datos.movimientos, ciclo, ref);
    var rej = el("div", "rejilla-rapida");
    var top = v.categoriaTop === undefined ? "—" : nombreCategoria(v.categoriaTop);
    [["💲", "Promedio de gasto diario", dinero(v.promedioDiario)],
     ["🏷", "Categoría top", top],
     ["📅", "Día que más gastas", v.diaTop || "—"],
     ["📈", "vs periodo anterior", v.vsAnterior === null ? "—" : (v.vsAnterior > 0 ? "+" : "") + Math.round(v.vsAnterior) + "%"]
    ].forEach(function (x, i) {
      var d = el("div", "dato-rapido");
      d.append(el("span", "dato-icono", x[0]), el("small", null, x[1]), el("strong", i === 3 && v.vsAnterior > 0 ? "negativo" : i === 3 && v.vsAnterior < 0 ? "positivo" : null, x[2]));
      rej.append(d);
    });
    art.append(rej);
  }

  function wCategorias(art, movs, ciclo, ref, rango) {
    titulo(art, "Gastos por categoría");
    var filas = A.porCategoria(movs), total = filas.reduce(function (s, f) { return s + f.total; }, 0);
    if (!filas.length) { art.append(el("p", "vacio", "Sin gastos en este periodo.")); return; }
    var NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 120 120"); svg.setAttribute("class", "dona"); svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Gastos por categoría: " + filas.map(function (f) { return nombreCategoria(f.id) + " " + dinero(f.total); }).join(", "));
    var acumulado = 0, R = 46, L = 2 * Math.PI * R;
    filas.forEach(function (f) {
      var c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", 60); c.setAttribute("cy", 60); c.setAttribute("r", R);
      c.setAttribute("fill", "none"); c.setAttribute("stroke-width", 16);
      c.setAttribute("stroke", colorDe(categoria(f.id) || { icono: "otro" }));
      var parte = (f.total / total) * L;
      c.setAttribute("stroke-dasharray", Math.max(0, parte - 1.5) + " " + (L - Math.max(0, parte - 1.5)));
      c.setAttribute("stroke-dashoffset", -acumulado);
      c.setAttribute("transform", "rotate(-90 60 60)");
      acumulado += parte;
      svg.append(c);
    });
    var centro = el("div", "dona-centro");
    centro.append(el("strong", null, dinero(total)), el("small", null, "gastado"));
    var caja = el("div", "dona-caja"); caja.append(svg, centro);
    art.append(caja);
    var ul = el("ul", "por-categoria");
    filas.forEach(function (f, i) {
      var c = categoria(f.id) || { nombre: "Sin categoría", icono: "otro" };
      var li = el("li", "cat-fila" + (i >= 6 ? " extra" : ""));
      var punto = el("span", "punto"); punto.style.background = colorDe(c);
      var nombre = el("span", "cat-nombre"); nombre.append(punto, document.createTextNode(c.nombre));
      li.append(nombre, el("strong", null, dinero(f.total)), el("small", "nota", Math.round((f.total / total) * 100) + "%"));
      li.tabIndex = 0; li.setAttribute("role", "button");
      li.title = "Ver los movimientos de " + c.nombre;
      li.addEventListener("click", function () {
        abrirBusqueda({ categoriaId: f.id, desde: A.claveDia(rango.desde), hasta: A.claveDia(new Date(rango.hasta.getTime() - 1)), tipo: "gasto" });
      });
      ul.append(li);
    });
    art.append(ul);
    if (filas.length > 6) {
      var ver = el("button", "enlace", "Ver todas"); ver.type = "button";
      ver.addEventListener("click", function () { ul.classList.toggle("todas"); ver.textContent = ul.classList.contains("todas") ? "Ver menos" : "Ver todas"; });
      art.append(ver);
    }
  }

  function wEtiquetas(art, movs) {
    titulo(art, "Gasto por etiqueta");
    var filas = A.porEtiqueta(movs);
    if (!filas.length) { art.append(el("p", "vacio", "Sin gastos con etiquetas en este periodo. Usa #etiqueta al registrar.")); return; }
    var max = filas[0].total, ul = el("ul", "por-categoria");
    filas.forEach(function (f) {
      var li = el("li", "cat-fila");
      var barra = el("div", "barra"), s = el("span"); s.style.width = (f.total / max) * 100 + "%"; barra.append(s);
      li.append(el("span", "etiqueta-chip", "#" + f.etiqueta), el("strong", null, dinero(f.total)), barra);
      ul.append(li);
    });
    art.append(ul);
  }

  // Barras dobles (ingresos y gastos) de los últimos 6 periodos.
  function wIngresosGastos(art, movs, ciclo, ref) {
    titulo(art, "Ingresos vs gastos");
    var s = A.serie(datos.movimientos, ciclo, ref, 6);
    var max = Math.max.apply(null, s.map(function (x) { return Math.max(x.ingresos, x.gastos); }).concat([1]));
    var g = el("div", "barras-dobles");
    g.setAttribute("role", "img");
    g.setAttribute("aria-label", s.map(function (x) { return x.etiqueta + ": ingresos " + dinero(x.ingresos) + ", gastos " + dinero(x.gastos); }).join("; "));
    s.forEach(function (x, i) {
      var col = el("div", "par" + (i === s.length - 1 ? " actual" : ""));
      var barras = el("div", "par-barras");
      var bi = el("span", "b-ingreso"), bg = el("span", "b-gasto");
      bi.style.height = Math.max(2, (x.ingresos / max) * 100) + "%"; bg.style.height = Math.max(2, (x.gastos / max) * 100) + "%";
      bi.title = "Ingresos " + x.etiqueta + ": " + dinero(x.ingresos); bg.title = "Gastos " + x.etiqueta + ": " + dinero(x.gastos);
      barras.append(bi, bg);
      col.append(barras, el("small", null, x.etiqueta));
      g.append(col);
    });
    var ult = s[s.length - 1];
    var ley = el("div", "leyenda");
    ley.append(el("span", "l-ingreso", "Ingresos " + dinero(ult.ingresos)), el("span", "l-gasto", "Gastos " + dinero(ult.gastos)));
    art.append(g, ley);
  }

  function lineaSVG(puntos, etiquetas, clase) {
    var NS = "http://www.w3.org/2000/svg", W = 300, H = 120, P = 10;
    var min = Math.min.apply(null, puntos), max = Math.max.apply(null, puntos);
    if (max === min) { max += 1; min -= 1; }
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + (H + 18)); svg.setAttribute("class", "linea " + (clase || ""));
    var xy = puntos.map(function (v, i) {
      return [P + (i * (W - 2 * P)) / Math.max(1, puntos.length - 1), P + (H - 2 * P) * (1 - (v - min) / (max - min))];
    });
    var area = document.createElementNS(NS, "path");
    area.setAttribute("d", "M" + xy[0][0] + "," + H + " L" + xy.map(function (p) { return p.join(","); }).join(" L") + " L" + xy[xy.length - 1][0] + "," + H + " Z");
    area.setAttribute("class", "area");
    var linea = document.createElementNS(NS, "polyline");
    linea.setAttribute("points", xy.map(function (p) { return p.join(","); }).join(" "));
    linea.setAttribute("fill", "none");
    svg.append(area, linea);
    xy.forEach(function (p, i) {
      var c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", p[0]); c.setAttribute("cy", p[1]); c.setAttribute("r", 3.5);
      var t = document.createElementNS(NS, "title"); t.textContent = etiquetas[i] + ": " + dinero(puntos[i]);
      c.append(t);
      var tx = document.createElementNS(NS, "text");
      tx.setAttribute("x", p[0]); tx.setAttribute("y", H + 14); tx.setAttribute("text-anchor", "middle");
      tx.textContent = etiquetas[i];
      svg.append(c, tx);
    });
    return svg;
  }

  function wTendencia(art, movs, ciclo, ref) {
    titulo(art, "Tendencia de gastos");
    var s = A.serie(datos.movimientos, ciclo, ref, 8);
    var svg = lineaSVG(s.map(function (x) { return x.gastos; }), s.map(function (x) { return x.etiqueta; }), "gastos");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Gastos por periodo: " + s.map(function (x) { return x.etiqueta + " " + dinero(x.gastos); }).join(", "));
    art.append(svg);
    var actual = s[s.length - 1], anterior = s[s.length - 2];
    if (anterior && anterior.gastos > 0) {
      var cambio = Math.round(((actual.gastos - anterior.gastos) / anterior.gastos) * 100);
      art.append(el("p", "nota " + (cambio > 0 ? "mal" : "bien"), (cambio > 0 ? "Subió " : "Bajó ") + Math.abs(cambio) + "% frente al periodo anterior."));
    }
  }

  function wProyeccion(art) {
    titulo(art, "Balance futuro");
    art.append(el("p", "nota", "Proyección a 90 días según tu promedio de los últimos 90 días (sin contar los límites)."));
    var p = A.proyeccion(datos.movimientos, saldoTotal());
    var svg = lineaSVG(p.map(function (x) { return x.saldo; }), ["Hoy", "30d", "60d", "90d"], p[3].saldo < p[0].saldo ? "baja" : "sube");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Balance proyectado: " + p.map(function (x) { return x.dias + " días " + dinero(x.saldo); }).join(", "));
    art.append(svg);
    var fila = el("div", "fila-proyeccion");
    fila.append(el("span", "nota", "Proyectado en 90 días"), el("strong", p[3].saldo < 0 ? "negativo" : "positivo", (p[3].saldo < 0 ? "−" : "") + dinero(Math.abs(p[3].saldo))));
    art.append(fila);
  }

  // Personalizar: mostrar u ocultar y reordenar los gráficos.
  function pintarPersonalizar() {
    var ul = $("lista-widgets"), lista = configWidgets();
    ul.replaceChildren();
    lista.forEach(function (w, i) {
      var info = WIDGETS.find(function (x) { return x.id === w.id; });
      var li = el("li", "fila-widget");
      var lab = el("label", "casilla");
      var chk = el("input"); chk.type = "checkbox"; chk.checked = w.visible;
      chk.addEventListener("change", function () { w.visible = chk.checked; guardarLocal("nova-widgets", lista); pintarAnalisis(); });
      lab.append(chk, document.createTextNode(info.nombre));
      var sube = el("button", "icono-btn", "↑"); sube.type = "button"; sube.disabled = i === 0; sube.setAttribute("aria-label", "Subir " + info.nombre);
      var baja = el("button", "icono-btn", "↓"); baja.type = "button"; baja.disabled = i === lista.length - 1; baja.setAttribute("aria-label", "Bajar " + info.nombre);
      function mover(d) { var x = lista.splice(i, 1)[0]; lista.splice(i + d, 0, x); guardarLocal("nova-widgets", lista); pintarPersonalizar(); pintarAnalisis(); }
      sube.addEventListener("click", function () { mover(-1); });
      baja.addEventListener("click", function () { mover(1); });
      li.append(lab, sube, baja);
      ul.append(li);
    });
  }
  $("btn-personalizar").addEventListener("click", function () { var p = $("personalizar"); p.hidden = !p.hidden; if (!p.hidden) pintarPersonalizar(); });
  $("btn-listo-widgets").addEventListener("click", function () { $("personalizar").hidden = true; });

  // ---------- Buscar ----------
  var filtros = { texto: "", tipo: "", categoriaId: null, etiqueta: "", estado: "", desde: "", hasta: "", orden: "recientes" };
  function resultadosBusqueda() { return A.buscar(datos.movimientos, filtros, nombreCategoria); }
  function pintarBuscar() {
    document.querySelectorAll("#buscar-tipo button").forEach(function (b) { b.setAttribute("aria-checked", String(b.dataset.tipo === filtros.tipo)); });
    var selCat = $("filtro-categoria");
    selCat.replaceChildren(el("option", null, "Todas"));
    selCat.firstChild.value = "";
    datos.categorias.slice().sort(function (a, b) { return a.nombre.localeCompare(b.nombre); }).forEach(function (c) {
      var o = el("option", null, c.nombre + (c.tipo === "ingreso" ? " (ingreso)" : "")); o.value = c.id; o.selected = c.id === filtros.categoriaId; selCat.append(o);
    });
    var selEt = $("filtro-etiqueta");
    selEt.replaceChildren(el("option", null, "Todas"));
    selEt.firstChild.value = "";
    etiquetasUsadas().forEach(function (e) { var o = el("option", null, "#" + e); o.value = e; o.selected = e === filtros.etiqueta; selEt.append(o); });
    $("filtro-estado").value = filtros.estado;
    $("filtro-desde").value = filtros.desde; $("filtro-hasta").value = filtros.hasta;
    $("buscar-orden").value = filtros.orden;
    var activos = ["categoriaId", "etiqueta", "estado", "desde", "hasta"].filter(function (k) { return filtros[k] !== "" && filtros[k] != null; }).length;
    $("btn-filtros").textContent = activos ? "Filtros (" + activos + ")" : "Filtros";
    var r = resultadosBusqueda(), t = A.totales(r);
    $("buscar-resumen").textContent = r.length + (r.length === 1 ? " movimiento" : " movimientos") + " · " + (ocultos ? "$ ••••" : (t.neto < 0 ? "−" : "+") + pesos.format(Math.abs(t.neto)));
    if (filtros.orden === "recientes" || filtros.orden === "antiguos") listaPorDia($("lista-buscar"), r, "No hay movimientos con esa búsqueda.");
    else {
      var cont = $("lista-buscar"), ul = el("ul", "lista-mov");
      cont.replaceChildren(ul);
      if (!r.length) cont.replaceChildren(el("p", "vacio", "No hay movimientos con esa búsqueda."));
      r.forEach(function (m) { ul.append(filaMovimiento(m, true)); });
    }
  }
  function abrirBusqueda(f) {
    filtros = Object.assign({ texto: "", tipo: "", categoriaId: null, etiqueta: "", estado: "", desde: "", hasta: "", orden: "recientes" }, f || {});
    $("buscar-texto").value = filtros.texto;
    $("filtros").hidden = !(f && (f.desde || f.categoriaId != null));
    ir("buscar");
  }
  $("buscar-texto").addEventListener("input", function (e) { filtros.texto = e.target.value; pintarBuscar(); });
  document.querySelectorAll("#buscar-tipo button").forEach(function (b) { b.addEventListener("click", function () { filtros.tipo = b.dataset.tipo; pintarBuscar(); }); });
  $("btn-filtros").addEventListener("click", function () { var f = $("filtros"); f.hidden = !f.hidden; $("btn-filtros").setAttribute("aria-expanded", String(!f.hidden)); });
  $("filtro-categoria").addEventListener("change", function (e) { filtros.categoriaId = e.target.value ? Number(e.target.value) : null; pintarBuscar(); });
  $("filtro-etiqueta").addEventListener("change", function (e) { filtros.etiqueta = e.target.value; pintarBuscar(); });
  $("filtro-estado").addEventListener("change", function (e) { filtros.estado = e.target.value; pintarBuscar(); });
  $("filtro-desde").addEventListener("change", function (e) { filtros.desde = e.target.value; pintarBuscar(); });
  $("filtro-hasta").addEventListener("change", function (e) { filtros.hasta = e.target.value; pintarBuscar(); });
  $("buscar-orden").addEventListener("change", function (e) { filtros.orden = e.target.value; pintarBuscar(); });
  $("btn-limpiar-filtros").addEventListener("click", function () { abrirBusqueda({ texto: filtros.texto, tipo: filtros.tipo }); $("filtros").hidden = false; });
  $("btn-exportar-busqueda").addEventListener("click", function () { exportarMovimientos(resultadosBusqueda(), "nova-busqueda"); });

  // ---------- Configuración ----------
  function pintarAjustes() {
    $("perfil-email").textContent = fuente.email;
    var inicial = (fuente.email || "?").trim().charAt(0).toUpperCase();
    $("avatar").textContent = inicial; $("perfil-avatar").textContent = inicial;
    $("aj-ciclo").textContent = Periodos.CICLOS[cicloEfectivo()] + (datos.perfil.presupuesto_monto ? " · " + dinero(num(datos.perfil.presupuesto_monto)) : "");
    $("aj-categorias").textContent = "Categorías (" + datos.categorias.length + ")";
    $("perfil-ubicacion").checked = !!datos.perfil.guardar_ubicacion;
    $("perfil-seguro").checked = datos.perfil.mostrar_seguro !== false;
    // Periodo de presupuesto
    var cont = $("lista-ciclos");
    cont.replaceChildren();
    Object.keys(Periodos.CICLOS).forEach(function (c) {
      var r = Periodos.periodo(c);
      var lab = el("label", "opcion");
      var radio = el("input"); radio.type = "radio"; radio.name = "ciclo"; radio.value = c; radio.checked = c === cicloEfectivo();
      var txt = el("span"); txt.append(el("strong", null, Periodos.CICLOS[c]), el("small", null, fechaCorta.format(r.desde) + " – " + fechaCorta.format(new Date(r.hasta.getTime() - 1))));
      lab.append(radio, txt);
      cont.append(lab);
    });
    if (document.activeElement !== $("presupuesto-monto")) {
      $("presupuesto-monto").value = datos.perfil.presupuesto_monto ? pesos.format(num(datos.perfil.presupuesto_monto)) : "";
    }
    pintarCategoriasAjustes(); pintarComunes(); pintarEtiquetas(); pintarProgramadas(); pintarCuentas();
    $("exp-movimientos").textContent = "Todos los movimientos · " + datos.movimientos.length;
    $("exp-categorias").textContent = "Categorías · " + datos.categorias.length;
    $("exp-limites").textContent = "Presupuesto y límites · " + (datos.limites.length + (datos.perfil.presupuesto_monto ? 1 : 0));
  }

  function guardarPerfil(cambios, idMensaje, textoOk) {
    return fuente.guardarPerfil(cambios).then(function (p) {
      datos.perfil = p; mensaje(idMensaje, textoOk); pintar();
    }).catch(function (err) { mensaje(idMensaje, err.message, true); pintar(); });
  }
  $("form-presupuesto").addEventListener("submit", function (e) {
    e.preventDefault();
    var txt = $("presupuesto-monto").value.trim();
    var monto = txt ? leerValor(txt) : null;
    if (txt && !(monto > 0)) return mensaje("presupuesto-mensaje", "No entendí el valor. Escribe por ejemplo 1 millón.", true);
    var elegido = document.querySelector("#lista-ciclos input:checked");
    guardarPerfil({ presupuesto_monto: monto, presupuesto_ciclo: elegido ? elegido.value : "mensual" }, "presupuesto-mensaje", "Guardado.");
    desfaseInicio = 0;
  });
  $("perfil-ubicacion").addEventListener("change", function (e) {
    guardarPerfil({ guardar_ubicacion: e.target.checked }, "ajustes-mensaje",
      e.target.checked ? "Desde ahora se guarda la ubicación de cada pago." : "Ya no se guarda la ubicación.");
  });
  $("perfil-seguro").addEventListener("change", function (e) {
    guardarPerfil({ mostrar_seguro: e.target.checked }, "ajustes-mensaje",
      e.target.checked ? "«Seguro para gastar» se muestra en el inicio." : "«Seguro para gastar» ya no se muestra.");
  });

  // Categorías
  var tipoCategorias = "gasto";
  function categoriasAgrupadas(tipo, texto) {
    var q = A.sinTildes(texto || "");
    var grupos = {};
    datos.categorias.filter(function (c) { return c.tipo === tipo && (!q || A.sinTildes(c.nombre).indexOf(q) >= 0); })
      .sort(function (a, b) { return a.nombre.localeCompare(b.nombre); })
      .forEach(function (c) { var g = A.grupoDe(c); (grupos[g] = grupos[g] || []).push(c); });
    var orden = A.GRUPOS[tipo].concat(Object.keys(grupos).filter(function (g) { return A.GRUPOS[tipo].indexOf(g) < 0; }));
    return orden.filter(function (g) { return grupos[g]; }).map(function (g) { return { grupo: g, categorias: grupos[g] }; });
  }
  function usosCategoria(id) { return datos.movimientos.filter(function (m) { return m.categoria_id === id; }).length; }

  function pintarCategoriasAjustes() {
    document.querySelectorAll("#cat-tipo button").forEach(function (b) { b.setAttribute("aria-checked", String(b.dataset.tipo === tipoCategorias)); });
    var cont = $("lista-categorias");
    cont.replaceChildren();
    var grupos = categoriasAgrupadas(tipoCategorias, $("cat-buscar").value);
    if (!grupos.length) cont.append(el("p", "vacio", "No hay categorías con ese nombre."));
    grupos.forEach(function (g) {
      cont.append(el("h3", "grupo-titulo", g.grupo));
      var ul = el("ul", "lista-simple");
      g.categorias.forEach(function (c) {
        var li = el("li", "fila-categoria");
        li.tabIndex = 0; li.setAttribute("role", "button");
        var txt = el("span", "mov-texto"); txt.append(el("strong", null, c.nombre), el("small", null, usosCategoria(c.id) + " movimientos"));
        li.append(pintarIcono(el("span", "mov-icono chico"), c), txt, el("span", "flecha", "›"));
        li.addEventListener("click", function () { abrirCategoria(c); });
        li.addEventListener("keydown", function (e) { if (e.key === "Enter") abrirCategoria(c); });
        ul.append(li);
      });
      cont.append(ul);
    });
  }
  document.querySelectorAll("#cat-tipo button").forEach(function (b) { b.addEventListener("click", function () { tipoCategorias = b.dataset.tipo; pintarCategoriasAjustes(); }); });
  $("cat-buscar").addEventListener("input", pintarCategoriasAjustes);
  document.querySelectorAll("[data-nueva-categoria]").forEach(function (b) { b.addEventListener("click", function () { abrirCategoria(null, tipoCategorias); }); });

  // Pantalla de categoría (nueva o editar).
  var catActual = null, catForm = null, alGuardarCategoria = null;
  function abrirCategoria(c, tipo, alGuardar) {
    catActual = c || null;
    alGuardarCategoria = alGuardar || null;
    catForm = c ? { tipo: c.tipo, icono: c.icono || "otro", color: colorDe(c).charAt(0) === "#" ? colorDe(c) : "#2ee06f", grupo: A.grupoDe(c) }
      : { tipo: tipo || "gasto", icono: "⭐", color: "#2ee06f", grupo: tipo === "ingreso" ? "Otros Ingresos" : "Otros" };
    $("cat-titulo").textContent = c ? "Editar categoría" : "Nueva categoría";
    $("cat-nombre").value = c ? c.nombre : "";
    $("cat-borrar").hidden = !c;
    $("cat-icono-buscar").value = "";
    mensaje("cat-mensaje", "");
    mostrarPestana("iconos");
    pintarFormCategoria();
    abrirCapa("pantalla-categoria");
  }
  function pintarFormCategoria() {
    document.querySelectorAll("#cat-form-tipo button").forEach(function (b) { b.setAttribute("aria-checked", String(b.dataset.tipo === catForm.tipo)); });
    pintarIcono($("cat-vista"), { icono: catForm.icono, color: catForm.color });
    var sel = $("cat-grupo");
    sel.replaceChildren();
    var grupos = A.GRUPOS[catForm.tipo].slice();
    if (grupos.indexOf(catForm.grupo) < 0) grupos.push(catForm.grupo);
    grupos.forEach(function (g) { var o = el("option", null, g); o.value = g; o.selected = g === catForm.grupo; sel.append(o); });
    var q = A.sinTildes($("cat-icono-buscar").value);
    var rej = $("cat-iconos");
    rej.replaceChildren();
    var opciones = Object.keys(ICONOS).map(function (k) { return [k, k]; }).concat(EMOJIS);
    opciones.filter(function (x) { return !q || A.sinTildes(x[1]).indexOf(q) >= 0; }).forEach(function (x) {
      var b = el("button", "opcion-icono"); b.type = "button";
      b.setAttribute("aria-label", x[1]); b.setAttribute("aria-pressed", String(x[0] === catForm.icono));
      pintarIcono(b, { icono: x[0], color: catForm.color });
      b.addEventListener("click", function () { catForm.icono = x[0]; pintarFormCategoria(); });
      rej.append(b);
    });
    var col = $("cat-panel-colores");
    col.replaceChildren();
    COLORES.forEach(function (c) {
      var b = el("button", "opcion-color"); b.type = "button";
      b.style.background = c; b.setAttribute("aria-label", "Color " + c); b.setAttribute("aria-pressed", String(c === catForm.color));
      b.addEventListener("click", function () { catForm.color = c; pintarFormCategoria(); });
      col.append(b);
    });
  }
  function mostrarPestana(p) {
    document.querySelectorAll("#cat-pestanas button").forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.pestana === p)); });
    $("cat-panel-iconos").hidden = p !== "iconos";
    $("cat-panel-colores").hidden = p !== "colores";
  }
  document.querySelectorAll("#cat-pestanas button").forEach(function (b) { b.addEventListener("click", function () { mostrarPestana(b.dataset.pestana); }); });
  document.querySelectorAll("#cat-form-tipo button").forEach(function (b) {
    b.addEventListener("click", function () { catForm.tipo = b.dataset.tipo; catForm.grupo = A.GRUPOS[catForm.tipo][A.GRUPOS[catForm.tipo].length - 1]; pintarFormCategoria(); });
  });
  $("cat-grupo").addEventListener("change", function (e) { catForm.grupo = e.target.value; });
  $("cat-icono-buscar").addEventListener("input", pintarFormCategoria);
  $("form-categoria").addEventListener("submit", function (e) {
    e.preventDefault();
    var nombre = $("cat-nombre").value.trim();
    if (!nombre) return mensaje("cat-mensaje", "Escribe el nombre de la categoría.", true);
    var repetida = datos.categorias.some(function (c) { return c.tipo === catForm.tipo && c.nombre.toLowerCase() === nombre.toLowerCase() && (!catActual || c.id !== catActual.id); });
    if (repetida) return mensaje("cat-mensaje", "Ya tienes una categoría con ese nombre.", true);
    var fila = { nombre: nombre, tipo: catForm.tipo, icono: catForm.icono, color: catForm.color, grupo: catForm.grupo };
    var op = catActual ? fuente.actualizar("categorias", catActual.id, fila) : fuente.crear("categorias", fila);
    var cb = alGuardarCategoria;
    op.then(function (c) {
      if (catActual) Object.assign(catActual, c); else datos.categorias.push(c);
      toast("Categoría guardada");
      cerrarCapa();
      pintar();
      if (cb) cb(c);
    }).catch(function (err) { mensaje("cat-mensaje", err.message, true); });
  });
  $("cat-borrar").addEventListener("click", function () {
    if (!catActual) return;
    var n = usosCategoria(catActual.id);
    if (!confirm("¿Borrar la categoría «" + catActual.nombre + "»?" + (n ? " Sus " + n + " movimientos quedarán sin categoría (no se borran)." : ""))) return;
    var id = catActual.id;
    fuente.borrar("categorias", id).then(function () {
      datos.categorias = datos.categorias.filter(function (c) { return c.id !== id; });
      datos.movimientos.forEach(function (m) { if (m.categoria_id === id) m.categoria_id = null; });
      datos.limites = datos.limites.filter(function (l) { return l.categoria_id !== id; });
      toast("Categoría borrada"); cerrarCapa(); pintar();
    }).catch(function (err) { mensaje("cat-mensaje", err.message, true); });
  });

  // Hoja para elegir categoría (con buscador, frecuentes y grupos).
  var alElegirCategoria = null, tipoHoja = "gasto", conTodas = false;
  function elegirCategoria(tipo, cb, todas) {
    alElegirCategoria = cb; tipoHoja = tipo; conTodas = !!todas;
    $("hoja-categoria-buscar").value = "";
    pintarHojaCategoria();
    abrirCapa("hoja-categoria");
  }
  function filaElegir(c, nombre) {
    var b = el("button", "fila-elegir"); b.type = "button";
    b.append(pintarIcono(el("span", "mov-icono chico"), c || { icono: "otro", color: "#2ee06f" }), el("span", null, nombre || c.nombre));
    b.addEventListener("click", function () { var cb = alElegirCategoria; cerrarCapa(); if (cb) cb(c); });
    return b;
  }
  function pintarHojaCategoria() {
    var cont = $("hoja-categoria-lista"), q = $("hoja-categoria-buscar").value;
    cont.replaceChildren();
    if (conTodas && !q) cont.append(filaElegir(null, "Todas las categorías"));
    if (!q) {
      var cuenta = {};
      datos.movimientos.forEach(function (m) { if (m.tipo === tipoHoja && m.categoria_id != null) cuenta[m.categoria_id] = (cuenta[m.categoria_id] || 0) + 1; });
      var frec = Object.keys(cuenta).sort(function (a, b) { return cuenta[b] - cuenta[a]; }).slice(0, 4).map(Number).map(categoria).filter(Boolean);
      if (frec.length) {
        cont.append(el("h3", "grupo-titulo", "Frecuentes"));
        var rej = el("div", "rejilla-frecuentes");
        frec.forEach(function (c) { rej.append(filaElegir(c)); });
        cont.append(rej);
      }
    }
    var grupos = categoriasAgrupadas(tipoHoja, q);
    if (!grupos.length) cont.append(el("p", "vacio", "No hay categorías con ese nombre."));
    grupos.forEach(function (g) {
      cont.append(el("h3", "grupo-titulo", g.grupo));
      g.categorias.forEach(function (c) { cont.append(filaElegir(c)); });
    });
  }
  $("hoja-categoria-buscar").addEventListener("input", pintarHojaCategoria);
  $("hoja-categoria-nueva").addEventListener("click", function () {
    var cb = alElegirCategoria, tipo = tipoHoja;
    cerrarYLuego(function () { abrirCategoria(null, tipo, cb); });
  });

  // Registros comunes
  function pintarComunes() {
    var ul = $("lista-comunes");
    ul.replaceChildren();
    if (!datos.frecuentes.length) ul.append(el("li", "vacio", "Todavía no tienes registros comunes."));
    datos.frecuentes.forEach(function (f) {
      var r = Parser.interpretar(f.texto);
      var li = el("li", "fila-categoria");
      var txt = el("span", "mov-texto");
      txt.append(el("strong", null, f.texto), el("small", null, r.ok ? (r.tipo === "ingreso" ? "Ingreso · " : "Gasto · ") + pesos.format(r.monto) + " · " + r.categoria : "No tiene un valor claro"));
      var quitar = el("button", "icono-btn", "✕"); quitar.type = "button"; quitar.setAttribute("aria-label", "Quitar " + f.texto);
      quitar.addEventListener("click", function () {
        quitar.disabled = true;
        fuente.borrar("frecuentes", f.id).then(function () {
          datos.frecuentes = datos.frecuentes.filter(function (x) { return x.id !== f.id; }); pintar();
        }).catch(function (err) { quitar.disabled = false; mensaje("comun-mensaje", err.message, true); });
      });
      var editarC = el("button", "chip-opcion mini", "✏️ Editar"); editarC.type = "button";
      editarC.addEventListener("click", function () {
        abrirEditor({
          titulo: "Editar registro común", ayuda: "Escríbelo como siempre, por ejemplo «tinto 3 mil #trabajo».",
          campos: [{ clave: "texto", etiqueta: "Qué gastas y cuánto", tipo: "texto", valor: f.texto, requerido: true, max: 120 }],
          guardar: function (v) {
            if (!Parser.interpretar(v.texto).ok) return Promise.reject(new Error("No entendí el valor. Escribe por ejemplo «tinto 3 mil»."));
            return fuente.actualizar("frecuentes", f.id, { texto: v.texto }).then(function (n) { Object.assign(f, n); });
          }
        });
      });
      li.append(el("span", "mov-icono chico", "⚡"), txt, editarC, quitar);
      ul.append(li);
    });
  }
  $("form-comun").addEventListener("submit", function (e) {
    e.preventDefault();
    var texto = $("comun-texto").value.trim(), r = Parser.interpretar(texto);
    if (!r.ok) return mensaje("comun-mensaje", "Escribe lo que gastas y el valor, por ejemplo «tinto 3 mil».", true);
    fuente.crear("frecuentes", { texto: texto }).then(function (f) {
      datos.frecuentes.push(f); $("comun-texto").value = ""; mensaje("comun-mensaje", "Listo: aparece en el inicio para registrarlo de un toque."); pintar();
    }).catch(function (err) { mensaje("comun-mensaje", err.message, true); });
  });

  // Etiquetas
  function limpiarEtiqueta(t) { return A.sinTildes(t).replace(/^#/, "").replace(/[^a-z0-9ñ_-]/g, "").slice(0, 30); }
  function pintarEtiquetas() {
    var ul = $("lista-etiquetas");
    ul.replaceChildren();
    var todas = etiquetasUsadas();
    if (!todas.length) ul.append(el("li", "vacio", "Todavía no tienes etiquetas. Escribe arriba y toca Agregar para crear la primera."));
    todas.forEach(function (e) {
      var movs = datos.movimientos.filter(function (m) { return (m.etiquetas || []).indexOf(e) >= 0; });
      var t = A.totales(movs);
      var li = el("li", "fila-categoria");
      var txt = el("span", "mov-texto");
      txt.append(el("strong", null, "#" + e), el("small", null, movs.length + " movimientos · gastos " + dinero(t.gastos)));
      var ver = el("button", "icono-btn", "🔍"); ver.type = "button"; ver.setAttribute("aria-label", "Ver movimientos con #" + e);
      ver.addEventListener("click", function () { abrirBusqueda({ etiqueta: e }); });
      var renombrar = el("button", "icono-btn", "✎"); renombrar.type = "button"; renombrar.setAttribute("aria-label", "Cambiar nombre de #" + e);
      renombrar.addEventListener("click", function () {
        var nuevo = limpiarEtiqueta(prompt("Nuevo nombre para #" + e, e) || "");
        if (!nuevo || nuevo === e) return;
        cambiarEtiqueta(e, nuevo);
      });
      var quitar = el("button", "icono-btn", "✕"); quitar.type = "button"; quitar.setAttribute("aria-label", "Borrar #" + e);
      quitar.addEventListener("click", function () {
        if (!confirm("¿Quitar #" + e + "?" + (movs.length ? " Se quitará de " + movs.length + " movimientos (los movimientos no se borran)." : ""))) return;
        cambiarEtiqueta(e, null);
      });
      li.append(el("span", "mov-icono chico", "#"), txt, ver, renombrar, quitar);
      ul.append(li);
    });
  }
  function cambiarEtiqueta(vieja, nueva) {
    var guardadas = leerLocal("nova-etiquetas", []).filter(function (x) { return x !== vieja; });
    if (nueva && guardadas.indexOf(nueva) < 0) guardadas.push(nueva);
    guardarLocal("nova-etiquetas", guardadas);
    var afectados = datos.movimientos.filter(function (m) { return (m.etiquetas || []).indexOf(vieja) >= 0; });
    Promise.all(afectados.map(function (m) {
      var et = m.etiquetas.filter(function (x) { return x !== vieja; });
      if (nueva && et.indexOf(nueva) < 0) et.push(nueva);
      return fuente.actualizar("movimientos", m.id, { etiquetas: et }).then(function (n) { Object.assign(m, n); });
    })).then(function () { toast(nueva ? "Etiqueta cambiada a #" + nueva : "Etiqueta quitada"); pintar(); })
      .catch(function (err) { toast("No se pudo: " + err.message); pintar(); });
  }
  $("form-etiqueta").addEventListener("submit", function (e) {
    e.preventDefault();
    var t = limpiarEtiqueta($("etiqueta-nueva").value);
    if (!t) return;
    var guardadas = leerLocal("nova-etiquetas", []);
    if (guardadas.indexOf(t) < 0) guardadas.push(t);
    guardarLocal("nova-etiquetas", guardadas);
    $("etiqueta-nueva").value = "";
    toast("Etiqueta #" + t + " creada");
    pintarEtiquetas();
  });

  // Programadas
  function pintarProgramadas() {
    var ul = $("lista-programadas");
    ul.replaceChildren();
    if (!datos.programados.length) ul.append(el("li", "vacio", "Sin movimientos programados. Crea uno o marca «Hacer recurrente» al registrar un gasto."));
    datos.programados.forEach(function (p) {
      var c = categoria(p.categoria_id);
      var li = el("li", "fila-categoria" + (p.activo ? "" : " pausado"));
      var txt = el("span", "mov-texto");
      txt.append(el("strong", null, p.descripcion),
        el("small", null, (A.FRECUENCIAS[p.frecuencia] || p.frecuencia) + " · " + (p.activo ? "próxima: " + fechaCorta.format(new Date(p.proxima + "T12:00:00")) : "en pausa")));
      var valor = el("strong", p.tipo === "ingreso" ? "positivo" : null, dineroSigno(num(p.monto), p.tipo));
      var interruptor = el("input", "interruptor"); interruptor.type = "checkbox"; interruptor.checked = !!p.activo;
      interruptor.setAttribute("aria-label", (p.activo ? "Pausar " : "Activar ") + p.descripcion);
      interruptor.addEventListener("change", function () {
        fuente.actualizar("programados", p.id, { activo: interruptor.checked }).then(function (n) { Object.assign(p, n); pintar(); })
          .catch(function (err) { toast(err.message); pintar(); });
      });
      var quitar = el("button", "icono-btn", "✕"); quitar.type = "button"; quitar.setAttribute("aria-label", "Borrar " + p.descripcion);
      quitar.addEventListener("click", function () {
        if (!confirm("¿Borrar la programación «" + p.descripcion + "»? Los movimientos que ya se registraron no se borran.")) return;
        fuente.borrar("programados", p.id).then(function () {
          datos.programados = datos.programados.filter(function (x) { return x.id !== p.id; }); toast("Programación borrada"); pintar();
        }).catch(function (err) { toast(err.message); });
      });
      var editarP = el("button", "chip-opcion mini", "✏️"); editarP.type = "button"; editarP.setAttribute("aria-label", "Editar " + p.descripcion);
      editarP.addEventListener("click", function () {
        abrirEditor({
          titulo: "Editar programación",
          campos: [{ clave: "descripcion", etiqueta: "Descripción", tipo: "texto", valor: p.descripcion, requerido: true, max: 120 }, { clave: "monto", etiqueta: "Valor", tipo: "plata", valor: num(p.monto) },
            { clave: "frecuencia", etiqueta: "Se repite", tipo: "select", valor: p.frecuencia, opciones: Object.keys(A.FRECUENCIAS).map(function (k) { return [k, A.FRECUENCIAS[k]]; }) }, { clave: "proxima", etiqueta: "Próxima fecha", tipo: "fecha", valor: p.proxima }],
          guardar: function (v) { return fuente.actualizar("programados", p.id, { descripcion: v.descripcion, monto: v.monto, frecuencia: v.frecuencia, proxima: v.proxima || p.proxima }).then(function (n) { Object.assign(p, n); }); },
          borrar: function () { return fuente.borrar("programados", p.id).then(function () { datos.programados = datos.programados.filter(function (x) { return x.id !== p.id; }); }); },
          textoBorrar: "🗑 Borrar esta programación", confirmar: "¿Borrar la programación «" + p.descripcion + "»? Los movimientos que ya se registraron no se borran.", avisoBorrado: "Programación borrada"
        });
      });
      li.append(pintarIcono(el("span", "mov-icono chico"), c), txt, valor, editarP, interruptor, quitar);
      ul.append(li);
    });
  }
  $("btn-nueva-programada").addEventListener("click", function () { abrirRegistro({ tipo: "gasto", recurrente: true }); });

  // Registra los movimientos programados que ya tocaba (al entrar a la app).
  function procesarProgramados() {
    var trabajos = datos.programados.map(function (p) {
      var pend = A.fechasPendientes(p, new Date());
      if (!pend.fechas.length) return Promise.resolve(0);
      var filas = pend.fechas.map(function (f) {
        return { cuenta_id: p.cuenta_id, categoria_id: p.categoria_id, tipo: p.tipo, descripcion: p.descripcion, monto: p.monto,
                 etiquetas: p.etiquetas || [], fecha: new Date(f + "T12:00:00").toISOString(), programado_id: p.id, estado: "pagado" };
      });
      // Primero se mueve la próxima fecha, así nunca se registra dos veces.
      return fuente.actualizar("programados", p.id, { proxima: pend.proxima }).then(function (n) {
        Object.assign(p, n);
        return fuente.crearVarios("movimientos", filas);
      }).then(function (creados) {
        Array.prototype.push.apply(datos.movimientos, creados);
        return creados.length;
      });
    });
    return Promise.all(trabajos).then(function (n) {
      var total = n.reduce(function (a, b) { return a + b; }, 0);
      if (total) { ordenarMovimientos(); pintar(); toast("🔁 Se registraron " + total + (total === 1 ? " movimiento programado" : " movimientos programados")); }
    }).catch(function (err) { toast("No se pudieron registrar los programados: " + err.message); });
  }

  // Cuentas
  function pintarCuentas() {
    var ul = $("lista-cuentas");
    ul.replaceChildren();
    datos.cuentas.forEach(function (c) {
      var li = el("li", "cuenta");
      var izq = el("div", "mov-texto");
      izq.append(el("strong", null, c.nombre), el("small", null, { debito: "Débito", ahorro: "Ahorros", efectivo: "Efectivo", credito: "Crédito" }[c.tipo] || c.tipo));
      li.append(izq, el("strong", null, dinero(saldoCuenta(c))), el("span", "flecha", "›"));
      li.tabIndex = 0; li.setAttribute("role", "button"); li.setAttribute("aria-label", "Editar la cuenta " + c.nombre);
      function editarCuenta() {
        var usos = datos.movimientos.filter(function (m) { return m.cuenta_id === c.id; }).length, puedeBorrar = datos.cuentas.length > 1 && usos === 0;
        abrirEditor({
          titulo: "Editar cuenta",
          ayuda: puedeBorrar ? null : (datos.cuentas.length <= 1 ? "Es tu única cuenta: no se puede borrar." : "No se puede borrar porque tiene " + usos + (usos === 1 ? " movimiento." : " movimientos.") + " Si quieres, bórralos antes."),
          campos: [{ clave: "nombre", etiqueta: "Nombre de la cuenta", tipo: "texto", valor: c.nombre, requerido: true, max: 40 }, { clave: "tipo", etiqueta: "Tipo", tipo: "select", valor: c.tipo, opciones: TIPOS_CUENTA }, { clave: "saldo_inicial", etiqueta: "Saldo con el que empezó", tipo: "plata", valor: num(c.saldo_inicial), permiteCero: true }],
          guardar: function (v) { return fuente.actualizar("cuentas", c.id, { nombre: v.nombre, tipo: v.tipo, saldo_inicial: v.saldo_inicial }).then(function (n) { Object.assign(c, n); }); },
          borrar: puedeBorrar ? function () { return fuente.borrar("cuentas", c.id).then(function () { datos.cuentas = datos.cuentas.filter(function (x) { return x.id !== c.id; }); }); } : null,
          textoBorrar: "🗑 Borrar esta cuenta", confirmar: "¿Borrar la cuenta «" + c.nombre + "»?", avisoBorrado: "Cuenta borrada"
        });
      }
      li.addEventListener("click", editarCuenta);
      li.addEventListener("keydown", function (ev) { if (ev.key === "Enter") editarCuenta(); });
      ul.append(li);
    });
  }
  $("form-cuenta").addEventListener("submit", function (e) {
    e.preventDefault();
    var nombre = $("cuenta-nombre").value.trim();
    var saldoTxt = $("cuenta-saldo").value.trim();
    var saldo = saldoTxt ? leerValor(saldoTxt) : 0;
    if (!nombre) return mensaje("cuenta-mensaje", "Escribe el nombre de la cuenta.", true);
    if (!isFinite(saldo)) return mensaje("cuenta-mensaje", "No entendí el saldo. Escribe por ejemplo 500 mil.", true);
    fuente.crear("cuentas", { nombre: nombre, tipo: $("cuenta-tipo").value, saldo_inicial: saldo }).then(function (c) {
      datos.cuentas.push(c); e.target.reset(); mensaje("cuenta-mensaje", "Cuenta agregada."); pintar();
    }).catch(function (err) { mensaje("cuenta-mensaje", err.message, true); });
  });

  // ---------- Modo conductor (Didi, Uber, inDrive…) ----------
  function conductor() { return !!datos.perfil.modo_conductor; }
  var cualTrabajo = leerLocal("nova-trabajo", "hoy");
  var ICONO_DOC = { soat: "🛡️", tecnomecanica: "📋", impuesto: "🧾", licencia: "🪪", seguro: "🔒", aceite: "🛢️", revision: "🔧", otro: "📌" };

  function categoriasDelGrupo(esDelGrupo) { return datos.categorias.filter(esDelGrupo).sort(function (a, b) { return a.nombre.localeCompare(b.nombre); }); }
  function asegurarCategoriasConductor() {
    var faltan = A.CATEGORIAS_CONDUCTOR.filter(function (c) { return !datos.categorias.some(function (x) { return x.nombre === c.nombre && x.tipo === c.tipo; }); });
    if (!faltan.length) return Promise.resolve();
    return fuente.crearVarios("categorias", faltan).then(function (creadas) { Array.prototype.push.apply(datos.categorias, creadas); });
  }
  // La categoría de trabajo que más se usa (o la primera) para abrir el registro ya con ella elegida.
  function categoriaDeTrabajo(tipo) {
    var es = tipo === "ingreso" ? A.esGanancia : A.esGastoTrabajo, uso = {};
    datos.movimientos.slice(0, 300).forEach(function (m) { var c = categoria(m.categoria_id); if (m.tipo === tipo && es(c)) uso[c.id] = (uso[c.id] || 0) + 1; });
    var mas = Object.keys(uso).sort(function (a, b) { return uso[b] - uso[a]; })[0];
    return mas ? categoria(Number(mas)) : categoriasDelGrupo(es)[0] || null;
  }
  function nuevoTrabajo(cual, catId) {
    var tipo = cual === "ganancia" ? "ingreso" : "gasto", c = catId != null ? categoria(catId) : categoriaDeTrabajo(tipo);
    abrirRegistro({ tipo: tipo, categoriaId: c ? c.id : null });
  }

  function documentosPorVencer() {
    return datos.documentos.map(function (d) { return { d: d, e: A.estadoDocumento(d) }; })
      .filter(function (x) { return x.e.estado !== "ok"; }).sort(function (a, b) { return a.e.dias - b.e.dias; });
  }

  function pintarConductor() {
    var on = conductor();
    $("tarjeta-jornada").hidden = !on;
    $("mas-conductor").hidden = !on;
    $("aj-trabajo").hidden = !on;
    $("perfil-conductor").checked = on;
    var al = $("alertas-docs");
    al.replaceChildren();
    function alerta(clase, icono, texto, alClick) {
      var b = el("button", "alerta-doc " + clase); b.type = "button";
      b.append(el("span", null, icono), el("span", null, texto), el("span", "flecha", "›"));
      b.addEventListener("click", alClick);
      al.append(b);
    }
    if (on) {
      var porVencer = documentosPorVencer();
      porVencer.slice(0, 3).forEach(function (x) {
        alerta(x.e.estado, x.e.estado === "vencido" ? "⛔" : "⚠️", x.d.nombre + " · " + x.e.texto.toLowerCase(), function () { ir("trabajo"); });
      });
      if (!datos.documentos.length) alerta("pronto", "🛡️", "Pon la fecha de tu SOAT y tu tecnomecánica para que no se te olviden", function () { ir("trabajo"); abrirDocumento(null, "soat"); });
      else if (!porVencer.length) {
        var sig = datos.documentos.slice().sort(function (a, b) { return String(a.vence).localeCompare(String(b.vence)); })[0];
        alerta("ok", "🗓️", "Próximo vencimiento: " + sig.nombre + " · " + A.estadoDocumento(sig).texto.toLowerCase(), function () { ir("trabajo"); });
      }
    }
    if (!on) return;
    var r = A.resumenTrabajo(datos.movimientos, datos.categorias, A.rangoJornada("hoy"));
    $("jornada-neto").textContent = (r.netoOperativo < 0 && !ocultos ? "−" : "") + dinero(Math.abs(r.netoOperativo));
    $("jornada-ganado").textContent = ocultos ? "$ ••••" : "+" + pesos.format(r.ingresos);
    $("jornada-gastos").textContent = ocultos ? "$ ••••" : "−" + pesos.format(r.operacion);
    var meta = num(datos.perfil.meta_diaria), caja = $("jornada-meta-barra-caja");
    caja.hidden = !meta;
    var nota = $("jornada-nota");
    if (meta) {
      $("jornada-meta-barra").style.width = Math.min(100, (r.ingresos / meta) * 100) + "%";
      nota.textContent = r.ingresos >= meta ? "🎉 ¡Meta del día cumplida!" : "Llevas " + dinero(r.ingresos) + " de tu meta de " + dinero(meta) + " (" + Math.round((r.ingresos / meta) * 100) + "%)";
    } else nota.textContent = r.viajes ? r.viajes + (r.viajes === 1 ? " viaje" : " viajes") + " hoy · " + dinero(r.porViaje) + " por viaje" : "Anota tus ganancias después de cada carrera.";
    pintarTrabajo();
  }

  function filaPlataforma(ul, nombre, color, total, detalle, max) {
    var li = el("li", "cat-fila");
    var punto = el("span", "punto"); punto.style.background = color;
    var n = el("span", "cat-nombre"); n.append(punto, document.createTextNode(nombre));
    var barra = el("div", "barra"), sp = el("span"); sp.style.width = (total / (max || 1)) * 100 + "%"; sp.style.background = color; barra.append(sp);
    li.append(n, el("strong", null, dinero(total)), barra);
    if (detalle) li.append(el("small", "nota detalle", detalle));
    ul.append(li);
  }

  function pintarTrabajo() {
    if (!conductor()) return;
    document.querySelectorAll("#trabajo-periodos button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.cual === cualTrabajo)); });
    var r = A.resumenTrabajo(datos.movimientos, datos.categorias, A.rangoJornada(cualTrabajo));
    $("trabajo-neto").textContent = (r.netoOperativo < 0 && !ocultos ? "−" : "") + dinero(Math.abs(r.netoOperativo));
    $("trabajo-ganado").textContent = ocultos ? "$ ••••" : "+" + pesos.format(r.ingresos);
    $("trabajo-gastos").textContent = ocultos ? "$ ••••" : "−" + pesos.format(r.operacion);
    $("trabajo-fijos").textContent = r.fijos ? "Papeles y cuotas (SOAT, seguro, cuota…): " + dinero(r.fijos) + " · Después de todo: " + (r.neto < 0 && !ocultos ? "−" : "") + dinero(Math.abs(r.neto)) : "";
    $("trabajo-viajes").textContent = r.viajes ? r.viajes + (r.viajes === 1 ? " viaje" : " viajes") + " · " + dinero(r.porViaje) + " por viaje"
      : r.movimientos ? "Sin viajes anotados" : "Aún no hay movimientos en este periodo";
    var meta = num(datos.perfil.meta_diaria);
    $("trabajo-meta-caja").hidden = !(meta && cualTrabajo === "hoy");
    $("trabajo-meta-nota").textContent = meta && cualTrabajo === "hoy" ? (r.ingresos >= meta ? "🎉 ¡Meta del día cumplida!" : "Meta del día: " + dinero(meta) + " (" + Math.round((r.ingresos / meta) * 100) + "%)") : "";
    $("trabajo-meta-barra").style.width = meta ? Math.min(100, (r.ingresos / meta) * 100) + "%" : "0";

    function chips(cont, lista, cual) {
      cont.replaceChildren();
      lista.forEach(function (c) {
        var b = el("button", "chip-rapido"); b.type = "button";
        b.append(pintarIcono(el("span", "mov-icono chico"), c), document.createTextNode(c.nombre));
        b.addEventListener("click", function () { nuevoTrabajo(cual, c.id); });
        cont.append(b);
      });
    }
    chips($("trabajo-apps"), categoriasDelGrupo(A.esGanancia), "ganancia");
    chips($("trabajo-gastos-rapidos"), categoriasDelGrupo(A.esGastoTrabajo), "gasto");

    var ulp = $("trabajo-plataformas"), maxP = r.porPlataforma.length ? r.porPlataforma[0].total : 1;
    ulp.replaceChildren();
    if (!r.porPlataforma.length) ulp.append(el("li", "vacio", "Todavía no hay ganancias en este periodo."));
    r.porPlataforma.forEach(function (p) {
      var c = categoria(p.id);
      filaPlataforma(ulp, c ? c.nombre : "Otra", colorDe(c), p.total, p.viajes ? p.viajes + (p.viajes === 1 ? " viaje" : " viajes") + " · " + dinero(p.total / p.viajes) + " por viaje" : "", maxP);
    });
    var ulg = $("trabajo-categorias"), maxG = r.gastosPorCategoria.length ? r.gastosPorCategoria[0].total : 1;
    ulg.replaceChildren();
    if (!r.gastosPorCategoria.length) ulg.append(el("li", "vacio", "Todavía no hay gastos del trabajo en este periodo."));
    r.gastosPorCategoria.forEach(function (g) {
      var c = categoria(g.id);
      filaPlataforma(ulg, c ? c.nombre : "Otro", colorDe(c), g.total, r.ingresos ? Math.round((g.total / r.ingresos) * 100) + "% de lo que ganaste" : "", maxG);
    });

    pintarDocumentos();
    var rap = $("doc-rapidos");
    rap.replaceChildren();
    ["soat", "tecnomecanica", "seguro-mensual", "seguro-anual", "cuota", "impuesto"].forEach(function (clave) {
      var x = A.DOCUMENTOS.find(function (y) { return y.clave === clave; });
      if (datos.documentos.some(function (d) { return d.tipo === x.tipo && d.nombre === x.nombre; })) return;
      var b = el("button", "chip-rapido", "＋ " + x.nombre); b.type = "button";
      b.addEventListener("click", function () { cadenaSetup = []; abrirDocumento(null, clave); });
      rap.append(b);
    });
    if (document.activeElement !== $("vehiculo-nombre")) $("vehiculo-nombre").value = datos.perfil.vehiculo || "";
    if (document.activeElement !== $("meta-diaria")) $("meta-diaria").value = datos.perfil.meta_diaria ? pesos.format(num(datos.perfil.meta_diaria)) : "";
  }
  document.querySelectorAll("#trabajo-periodos button").forEach(function (b) {
    b.addEventListener("click", function () { cualTrabajo = b.dataset.cual; guardarLocal("nova-trabajo", cualTrabajo); pintarTrabajo(); });
  });

  $("perfil-conductor").addEventListener("change", function (e) {
    var on = e.target.checked;
    (on ? asegurarCategoriasConductor() : Promise.resolve()).then(function () {
      return guardarPerfil({ modo_conductor: on }, "ajustes-mensaje",
        on ? "Modo conductor activado." : "Modo conductor apagado. Tus datos quedan guardados.");
    }).then(function () {
      programarAvisos();
      if (!on) return;
      toast("🚖 Modo conductor activado");
      ir("trabajo");
      // Para que no se le olvide: se piden de una vez las fechas del SOAT y de la tecnomecánica.
      if (!datos.documentos.length) { cadenaSetup = ["tecnomecanica"]; abrirDocumento(null, "soat"); }
    })
      .catch(function (err) { mensaje("ajustes-mensaje", err.message, true); pintar(); });
  });

  $("form-vehiculo").addEventListener("submit", function (e) {
    e.preventDefault();
    var txt = $("meta-diaria").value.trim(), meta = txt ? leerValor(txt) : null;
    if (txt && !(meta > 0)) return mensaje("vehiculo-mensaje", "No entendí la meta. Escribe por ejemplo 150 mil.", true);
    guardarPerfil({ vehiculo: $("vehiculo-nombre").value.trim() || null, meta_diaria: meta }, "vehiculo-mensaje", "Guardado.");
  });

  // Vencimientos (SOAT, tecnomecánica…)
  function pintarDocumentos() {
    var ul = $("lista-documentos");
    ul.replaceChildren();
    if (!datos.documentos.length) ul.append(el("li", "vacio", "Aún no has agregado vencimientos. Toca «+ Agregar» y pon la fecha de tu SOAT y de la tecnomecánica."));
    datos.documentos.slice().sort(function (a, b) { return String(a.vence).localeCompare(String(b.vence)); }).forEach(function (d) {
      var e = A.estadoDocumento(d);
      var li = el("li", "fila-categoria documento " + e.estado);
      li.tabIndex = 0; li.setAttribute("role", "button");
      var txt = el("span", "mov-texto");
      txt.append(el("strong", null, d.nombre), el("small", e.estado === "ok" ? null : "estado-" + e.estado, fechaCorta.format(parteFechaLocal(d.vence)) + " · " + e.texto));
      var ren = el("button", "chip-opcion", "Renovar"); ren.type = "button";
      ren.addEventListener("click", function (ev) { ev.stopPropagation(); renovarDocumento(d); });
      li.append(el("span", "mov-icono chico", ICONO_DOC[d.tipo] || "📌"), txt, ren);
      li.addEventListener("click", function () { abrirDocumento(d); });
      li.addEventListener("keydown", function (ev) { if (ev.key === "Enter") abrirDocumento(d); });
      ul.append(li);
    });
  }
  function parteFechaLocal(f) { var p = String(f).slice(0, 10).split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); }

  var docActual = null, cadenaSetup = []; // cadenaSetup: documentos que se piden uno tras otro al activar el modo conductor
  function abrirDocumento(d, clave) {
    docActual = d || null;
    if (d) cadenaSetup = [];
    var sel = $("doc-tipo");
    sel.replaceChildren();
    A.DOCUMENTOS.forEach(function (x) { var o = el("option", null, x.nombre); o.value = x.clave; sel.append(o); });
    var preset = d ? A.presetDe(d) : A.DOCUMENTOS.find(function (x) { return x.clave === (clave || "soat"); });
    sel.value = preset.clave;
    $("doc-titulo").textContent = d ? "Editar vencimiento" : "Nuevo vencimiento: " + preset.nombre;
    $("doc-nombre").value = d ? d.nombre : preset.nombre;
    $("doc-vence").value = d ? String(d.vence).slice(0, 10) : "";
    $("doc-costo").value = d && d.costo ? pesos.format(num(d.costo)) : "";
    $("doc-aviso").value = String(d ? d.aviso_dias : A.avisoPorDefecto(preset.meses));
    $("doc-repetir").value = String(d ? d.repetir_meses : preset.meses);
    $("doc-renovar").hidden = !d; $("doc-borrar").hidden = !d;
    mensaje("doc-mensaje", "");
    abrirCapa("pantalla-documento");
  }
  $("doc-tipo").addEventListener("change", function (e) {
    var x = A.DOCUMENTOS.find(function (y) { return y.clave === e.target.value; });
    if (!x) return;
    if ($("doc-nombre").value === "" || A.DOCUMENTOS.some(function (y) { return y.nombre === $("doc-nombre").value; })) $("doc-nombre").value = x.nombre;
    $("doc-repetir").value = String(x.meses);
    $("doc-aviso").value = String(A.avisoPorDefecto(x.meses));
  });
  $("btn-nuevo-documento").addEventListener("click", function () { cadenaSetup = []; abrirDocumento(null); });
  $("form-documento").addEventListener("submit", function (e) {
    e.preventDefault();
    var nombre = $("doc-nombre").value.trim(), vence = $("doc-vence").value, txt = $("doc-costo").value.trim(), costo = txt ? leerValor(txt) : null;
    if (!nombre) return mensaje("doc-mensaje", "Escribe el nombre.", true);
    if (!vence) return mensaje("doc-mensaje", "Elige la fecha de vencimiento.", true);
    if (txt && !(costo > 0)) return mensaje("doc-mensaje", "No entendí el costo. Escribe por ejemplo 400 mil.", true);
    var preset = A.DOCUMENTOS.find(function (y) { return y.clave === $("doc-tipo").value; }) || A.DOCUMENTOS[A.DOCUMENTOS.length - 1];
    var fila = { tipo: preset.tipo, nombre: nombre, vence: vence, costo: costo, aviso_dias: Number($("doc-aviso").value), repetir_meses: Number($("doc-repetir").value) };
    var op = docActual ? fuente.actualizar("documentos", docActual.id, fila) : fuente.crear("documentos", fila);
    var editando = !!docActual;
    op.then(function (d) {
      if (docActual) Object.assign(docActual, d); else datos.documentos.push(d);
      toast("✓ Vencimiento guardado: " + d.nombre); programarAvisos(); pintar();
      var siguiente = editando ? null : cadenaSetup.shift();
      if (siguiente) cerrarYLuego(function () { abrirDocumento(null, siguiente); }); else cerrarCapa();
    }).catch(function (err) { mensaje("doc-mensaje", err.message, true); });
  });
  $("doc-borrar").addEventListener("click", function () {
    if (!docActual || !confirm("¿Borrar el vencimiento «" + docActual.nombre + "»? Los gastos que ya anotaste no se borran.")) return;
    var id = docActual.id;
    fuente.borrar("documentos", id).then(function () {
      datos.documentos = datos.documentos.filter(function (x) { return x.id !== id; });
      toast("Vencimiento borrado"); programarAvisos(); cerrarCapa(); pintar();
    }).catch(function (err) { mensaje("doc-mensaje", err.message, true); });
  });
  $("doc-renovar").addEventListener("click", function () { var d = docActual; cerrarYLuego(function () { renovarDocumento(d); }); });

  // "Ya lo renové": abre el registro del gasto con la categoría y el costo, y al guardarlo corre la fecha.
  function renovarDocumento(d) {
    var x = A.presetDe(d);
    var c = datos.categorias.find(function (k) { return k.nombre === x.categoria && k.tipo === "gasto"; });
    abrirRegistro({ tipo: "gasto", categoriaId: c ? c.id : null, expr: d.costo ? String(Math.round(num(d.costo))) : "", desc: d.nombre, documentoId: d.id });
  }
  function renovarDocumentoListo(docId) {
    var d = datos.documentos.find(function (x) { return x.id === docId; });
    if (!d) return;
    fuente.actualizar("documentos", d.id, { vence: A.proximoVencimiento(d) }).then(function (n) {
      Object.assign(d, n); toast("✓ " + d.nombre + " renovado: ahora vence el " + fechaCorta.format(parteFechaLocal(d.vence)) + " " + parteFechaLocal(d.vence).getFullYear());
      programarAvisos(); pintar();
    }).catch(function (err) { toast("No se pudo mover la fecha: " + err.message); });
  }



  // ---------- Editor general: corregir números y textos, o borrar ----------
  // cfg: { titulo, ayuda, campos: [{ clave, etiqueta, tipo: "texto" | "plata" | "fecha" | "select", valor, opciones, requerido, permiteCero, max }],
  //        guardar(valores) → promesa, borrar() → promesa (opcional), confirmar, avisoBorrado }
  var editorActual = null;
  function abrirEditor(cfg) {
    editorActual = cfg;
    $("editar-titulo").textContent = cfg.titulo;
    var caja = $("editar-campos");
    caja.replaceChildren();
    if (cfg.ayuda) caja.append(el("p", "nota", cfg.ayuda));
    cfg.campos.forEach(function (f, i) {
      var id = "editar-c" + i, etq = el("label", null, f.etiqueta), ent;
      etq.setAttribute("for", id);
      if (f.tipo === "select") {
        ent = el("select");
        f.opciones.forEach(function (o) { var op = el("option", null, o[1]); op.value = o[0]; op.selected = String(o[0]) === String(f.valor); ent.append(op); });
      } else {
        ent = el("input");
        if (f.tipo === "plata") { ent.className = "campo-plata"; ent.inputMode = "numeric"; ent.value = f.valor != null && f.valor !== "" ? numeroCO.format(f.valor) : ""; }
        else if (f.tipo === "fecha") { ent.type = "date"; ent.value = f.valor ? String(f.valor).slice(0, 10) : ""; }
        else { ent.value = f.valor || ""; ent.maxLength = f.max || 100; }
      }
      ent.id = id; f.entrada = ent;
      caja.append(etq, ent);
    });
    $("editar-borrar").hidden = !cfg.borrar;
    $("editar-borrar").textContent = cfg.textoBorrar || "🗑 Borrar";
    mensaje("editar-mensaje", "");
    abrirCapa("hoja-editar");
  }
  $("form-editar").addEventListener("submit", function (e) {
    e.preventDefault();
    var cfg = editorActual;
    if (!cfg) return;
    var valores = {};
    for (var i = 0; i < cfg.campos.length; i++) {
      var f = cfg.campos[i], t = f.entrada.value.trim(), v;
      if (f.tipo === "plata") {
        v = t === "" && f.permiteCero ? 0 : leerValor(t);
        if (isNaN(v) || (v <= 0 && !(f.permiteCero && v === 0))) return mensaje("editar-mensaje", "No entendí «" + f.etiqueta + "». Escribe un valor, por ejemplo 500 mil.", true);
      } else {
        v = t;
        if (f.requerido && !v) return mensaje("editar-mensaje", "Falta «" + f.etiqueta + "».", true);
      }
      valores[f.clave] = v;
    }
    var boton = e.target.querySelector("button[type=submit]");
    boton.disabled = true;
    cfg.guardar(valores).then(function () { cerrarCapa(); pintar(); toast("✓ Cambios guardados"); })
      .catch(function (err) { mensaje("editar-mensaje", "No se pudo guardar: " + err.message, true); })
      .finally(function () { boton.disabled = false; });
  });
  $("editar-borrar").addEventListener("click", function () {
    var cfg = editorActual;
    if (!cfg || !cfg.borrar || !confirm(cfg.confirmar || "¿Borrar esto?")) return;
    cfg.borrar().then(function () { cerrarCapa(); pintar(); toast(cfg.avisoBorrado || "Borrado"); })
      .catch(function (err) { mensaje("editar-mensaje", "No se pudo borrar: " + err.message, true); });
  });
  var TIPOS_CUENTA = [["debito", "Débito"], ["ahorro", "Ahorros"], ["efectivo", "Efectivo"], ["credito", "Crédito"]];

  // ---------- Deudas: lo que debo y lo que me deben, con abonos ----------
  var deudaActual = null, tipoDeuda = "debo", deudaAbierta = null;
  var ROTULO_DEUDA = { debo: "Yo debo", me_deben: "Me deben" };
  function resumenDeDeudas() { return A.resumenDeudas(datos.deudas, datos.abonos); }
  function textoVence(x) {
    if (x.estado === "pagada") return "Pagada";
    if (!x.deuda.vence) return "";
    var f = fechaCorta.format(parteFechaLocal(x.deuda.vence));
    return x.estado === "vencida" ? "Venció el " + f : "Vence el " + f;
  }
  // Recuadro de Inicio: para no olvidarse de lo que se debe, lo que le deben y lo que está por vencer.
  function pintarDeudasInicio(r) {
    var t = $("tarjeta-deudas"), pend = r.lista.filter(function (x) { return x.falta > 0; });
    t.hidden = !pend.length;
    if (!pend.length) return;
    var partes = [];
    if (r.debo > 0) partes.push("Debes " + dinero(r.debo));
    if (r.meDeben > 0) partes.push("Te deben " + dinero(r.meDeben));
    $("deudas-inicio-valor").textContent = partes.join(" · ");
    var vencidas = pend.filter(function (x) { return x.estado === "vencida"; });
    var proximas = pend.filter(function (x) { return x.estado !== "vencida" && x.dias != null; }).sort(function (a, b) { return a.dias - b.dias; });
    var nota = $("deudas-inicio-nota");
    nota.className = "nota";
    if (vencidas.length) {
      nota.classList.add("estado-vencida");
      nota.textContent = vencidas.length === 1 ? "⛔ " + vencidas[0].deuda.persona + ": se pasó la fecha de pago" : "⛔ " + vencidas.length + " deudas con la fecha de pago pasada";
    } else if (proximas.length) {
      var x = proximas[0];
      nota.textContent = x.deuda.persona + ": " + (x.dias === 0 ? "vence hoy" : x.dias === 1 ? "vence mañana" : "vence en " + x.dias + " días");
    } else nota.textContent = pend.length === 1 ? "1 deuda pendiente" : pend.length + " deudas pendientes";
    t.classList.toggle("alerta", vencidas.length > 0);
  }
  $("tarjeta-deudas").addEventListener("click", function () { ir("planes"); });
  function pintarDeudas() {
    var r = resumenDeDeudas(), ul = $("lista-deudas"), caja = $("deudas-resumen");
    pintarDeudasInicio(r);
    ul.replaceChildren();
    caja.hidden = !datos.deudas.length;
    caja.replaceChildren();
    [["debo", "Yo debo", r.debo], ["me-deben", "Me deben", r.meDeben]].forEach(function (f) {
      var t = el("div", "deuda-total " + f[0]); t.append(el("small", null, f[1]), el("strong", null, dinero(f[2]))); caja.append(t);
    });
    if (!datos.deudas.length) ul.append(el("li", "vacio", "Sin deudas. Si pediste un préstamo o le prestaste plata a alguien, toca «+ Nueva deuda»."));
    r.lista.slice().sort(function (a, b) { return (a.falta <= 0) - (b.falta <= 0) || String(b.deuda.fecha).localeCompare(String(a.deuda.fecha)); }).forEach(function (x) {
      var d = x.deuda, li = el("li", "fila-categoria fila-deuda " + (d.tipo === "debo" ? "debo " : "") + x.estado);
      li.tabIndex = 0; li.setAttribute("role", "button");
      var txt = el("span", "mov-texto"), sub = textoVence(x);
      txt.append(el("strong", null, d.persona), el("small", x.estado === "vencida" ? "estado-vencida" : null,
        (d.tipo === "debo" ? "Yo debo" : "Me deben") + " · " + dinero(x.abonado) + " de " + dinero(x.total) + (sub ? " · " + sub : "")));
      var barra = el("div", "barra-deuda"), i = el("span"); i.style.width = Math.round(x.avance * 100) + "%"; barra.append(i); txt.append(barra);
      li.append(el("span", "mov-icono chico", d.tipo === "debo" ? "💸" : "🤝"), txt, el("span", "deuda-falta", x.falta > 0 ? dinero(x.falta) : "✓"));
      li.addEventListener("click", function () { abrirAbonos(d); });
      li.addEventListener("keydown", function (ev) { if (ev.key === "Enter") abrirAbonos(d); });
      ul.append(li);
    });
  }

  function fijarTipoDeuda(t) {
    tipoDeuda = t;
    document.querySelectorAll("#deuda-tipo button").forEach(function (b) { b.setAttribute("aria-checked", String(b.dataset.t === t)); });
    $("deuda-persona-et").textContent = t === "debo" ? "¿A quién le debes?" : "¿Quién te debe?";
    $("deuda-anotar-nota").textContent = t === "debo" ? "Suma lo que te prestaron a tu saldo" : "Resta lo que prestaste de tu saldo";
  }
  document.querySelectorAll("#deuda-tipo button").forEach(function (b) { b.addEventListener("click", function () { fijarTipoDeuda(b.dataset.t); }); });
  function abrirDeuda(d, tipo) {
    deudaActual = d || null;
    fijarTipoDeuda(d ? d.tipo : tipo || "debo");
    $("deuda-titulo").textContent = d ? "Editar deuda" : "Nueva deuda";
    $("deuda-monto").value = d ? pesos.format(num(d.monto)) : "";
    $("deuda-persona").value = d ? d.persona : "";
    $("deuda-concepto").value = d && d.concepto ? d.concepto : "";
    $("deuda-fecha").value = d ? String(d.fecha).slice(0, 10) : A.claveDia(new Date());
    $("deuda-vence").value = d && d.vence ? String(d.vence).slice(0, 10) : "";
    $("deuda-anotar-fila").hidden = !!d; $("deuda-anotar").checked = true;
    $("deuda-borrar").hidden = !d;
    llenarCuentas("deuda-cuenta", "deuda-cuenta-bloque", d && d.cuenta_id);
    mensaje("deuda-mensaje", "");
    abrirCapa("pantalla-deuda");
  }
  $("btn-nueva-deuda").addEventListener("click", function () { abrirDeuda(null); });

  // Anota la plata en los movimientos (categoría «Deudas») para que el saldo cuadre.
  function llenarCuentas(selectId, bloqueId, elegida) {
    var sel = $(selectId);
    sel.replaceChildren();
    datos.cuentas.forEach(function (c) { var o = el("option", null, c.nombre); o.value = c.id; sel.append(o); });
    sel.value = elegida && datos.cuentas.some(function (c) { return c.id === elegida; }) ? elegida : datos.cuentas[0].id;
    $(bloqueId).hidden = datos.cuentas.length < 2;     // con una sola cuenta no hay nada que elegir
  }
  function cuentaElegida(selectId, deuda) {
    var v = Number($(selectId).value);
    return datos.cuentas.some(function (c) { return c.id === v; }) ? v : (deuda && deuda.cuenta_id) || datos.cuentas[0].id;
  }
  function anotarMovimientoDeuda(tipo, monto, descripcion, fecha, cuentaId) {
    return categoriaPorNombre("Deudas", tipo, "banco").then(function (c) {
      return fuente.crear("movimientos", { cuenta_id: cuentaId || datos.cuentas[0].id, categoria_id: c.id, tipo: tipo, descripcion: descripcion, monto: monto, fecha: fecha, etiquetas: ["deuda"], estado: "pagado" });
    }).then(function (m) { datos.movimientos.push(m); ordenarMovimientos(); return m; });
  }
  function mediodia(clave) { var p = String(clave).slice(0, 10).split("-").map(Number); return new Date(p[0], p[1] - 1, p[2], 12).toISOString(); }

  $("form-deuda").addEventListener("submit", function (e) {
    e.preventDefault();
    var monto = leerValor($("deuda-monto").value), persona = $("deuda-persona").value.trim(), fecha = $("deuda-fecha").value, vence = $("deuda-vence").value;
    if (!(monto > 0)) return mensaje("deuda-mensaje", "Escribe cuánto es. Por ejemplo 500 mil.", true);
    if (!persona) return mensaje("deuda-mensaje", tipoDeuda === "debo" ? "Escribe a quién le debes." : "Escribe quién te debe.", true);
    if (!fecha) return mensaje("deuda-mensaje", "Elige la fecha.", true);
    if (vence && vence < fecha) return mensaje("deuda-mensaje", "La fecha de pago no puede ser antes del préstamo.", true);
    var cuentaId = cuentaElegida("deuda-cuenta", deudaActual);
    var fila = { tipo: tipoDeuda, persona: persona, concepto: $("deuda-concepto").value.trim() || null, monto: monto, fecha: fecha, vence: vence || null, cuenta_id: cuentaId };
    var editando = !!deudaActual, anotar = !editando && $("deuda-anotar").checked;
    var op = editando ? fuente.actualizar("deudas", deudaActual.id, fila) : fuente.crear("deudas", fila);
    op.then(function (d) {
      if (editando) Object.assign(deudaActual, d); else datos.deudas.push(d);
      var recibi = d.tipo === "debo", tipoMov = recibi ? "ingreso" : "gasto", desc = (recibi ? "Préstamo de " : "Préstamo a ") + d.persona;  // si me prestaron, entra plata; si presté, sale
      if (editando) {
        // Si la deuda anotó un movimiento, se corrige también (valor, fecha, quién, cuenta).
        var mov = d.movimiento_id && datos.movimientos.find(function (x) { return x.id === d.movimiento_id; });
        if (!mov) return d;
        return categoriaPorNombre("Deudas", tipoMov, "banco").then(function (c) {
          return fuente.actualizar("movimientos", mov.id, { tipo: tipoMov, monto: num(d.monto), descripcion: desc, fecha: mediodia(d.fecha), cuenta_id: cuentaId, categoria_id: c.id });
        }).then(function (n) { Object.assign(mov, n); ordenarMovimientos(); return d; });
      }
      if (!anotar) return d;
      return anotarMovimientoDeuda(tipoMov, num(d.monto), desc, mediodia(d.fecha), cuentaId).then(function (m) {
        return fuente.actualizar("deudas", d.id, { movimiento_id: m.id }).then(function (n) { Object.assign(d, n); return d; });
      });
    }).then(function (d) {
      toast("¡Deuda guardada!", d.persona, pesos.format(num(d.monto)));
      cerrarCapa(); pintar(); programarAvisos();
    }).catch(function (err) { mensaje("deuda-mensaje", "No se pudo guardar: " + err.message, true); });
  });
  function borrarMovimientos(ids) {
    return ids.reduce(function (p, id) {
      return p.then(function () { var m = datos.movimientos.find(function (x) { return x.id === id; }); if (m) aPapelera("movimientos", m); return fuente.borrar("movimientos", id); }).then(function () { datos.movimientos = datos.movimientos.filter(function (m) { return m.id !== id; }); });
    }, Promise.resolve());
  }
  function borrarDeuda(d, desdeFormulario) {
    if (!d || !confirm("¿Borrar la deuda con «" + d.persona + "» y todos sus abonos?")) return;
    var id = d.id;
    // Los movimientos que se anotaron con la deuda y sus abonos: se pregunta si también se borran, para que el saldo cuadre.
    var ligados = [d.movimiento_id].concat(datos.abonos.filter(function (x) { return x.deuda_id === id; }).map(function (x) { return x.movimiento_id; }))
      .filter(function (mid, i, a) { return mid && a.indexOf(mid) === i && datos.movimientos.some(function (m) { return m.id === mid; }); });
    var tambien = ligados.length > 0 && confirm("Con esta deuda se anotaron " + ligados.length + (ligados.length === 1 ? " movimiento" : " movimientos") + " en tu saldo.\n\n¿Borrarlos también?\nAceptar: se borran y tu saldo vuelve a como estaba.\nCancelar: se quedan en tus movimientos.");
    (tambien ? borrarMovimientos(ligados) : Promise.resolve()).then(function () { return fuente.borrar("deudas", id); }).then(function () {
      datos.deudas = datos.deudas.filter(function (x) { return x.id !== id; });
      datos.abonos = datos.abonos.filter(function (x) { return x.deuda_id !== id; });
      if (d.foto_ruta && fuente.fotos) fuente.fotos.borrar(d.foto_ruta);
      toast("Deuda borrada"); programarAvisos();
      if (!desdeFormulario) { cerrarCapa(); pintar(); return; }
      // cierra el formulario y también el detalle si estaba abierto
      cerrarYLuego(function () { if (pilaCapas.length && pilaCapas[pilaCapas.length - 1] === "pantalla-abonos") cerrarCapa(); pintar(); });
    }).catch(function (err) { pintar(); mensaje(desdeFormulario ? "deuda-mensaje" : "abono-mensaje", err.message, true); });
  }
  $("deuda-borrar").addEventListener("click", function () { borrarDeuda(deudaActual, true); });
  $("abono-borrar").addEventListener("click", function () { borrarDeuda(deudaAbierta, false); });
  $("abono-borrar-icono").addEventListener("click", function () { borrarDeuda(deudaAbierta, false); });
  $("abono-editar-icono").addEventListener("click", function () { if (deudaAbierta) abrirDeuda(deudaAbierta); });

  // Detalle de una deuda: lo abonado, lo que falta y cada abono.
  function datosDeDeuda(d) { return resumenDeDeudas().lista.find(function (x) { return x.deuda.id === d.id; }); }
  function pintarAbonos() {
    var d = deudaAbierta;
    if (!d) return;
    var x = datosDeDeuda(d);
    if (!x) return;
    var debo = d.tipo === "debo";
    $("abono-titulo").textContent = d.persona;
    $("abono-whatsapp").hidden = debo || x.falta <= 0;
    var cajaFoto = $("abono-foto"); cajaFoto.replaceChildren();
    cajaFoto.append(pintarFotoDe(d, { tabla: "deudas", titulo: "📎 Foto o documento de la deuda", clave: "deuda", nombre: function (z) { return z.persona; }, repintar: function () { pintarAbonos(); } }));
    var r = $("abono-resumen");
    r.replaceChildren();
    var datosFila = el("div", "abono-datos");
    [["Total", dinero(x.total)], [debo ? "Ya pagué" : "Ya me pagó", dinero(x.abonado)], ["Falta", dinero(x.falta)]].forEach(function (f) {
      var c = el("div"); c.append(el("small", null, f[0]), el("strong", null, f[1])); datosFila.append(c);
    });
    var barra = el("div", "barra-deuda"), i = el("span"); i.style.width = Math.round(x.avance * 100) + "%"; barra.append(i);
    var sub = [ROTULO_DEUDA[d.tipo], d.concepto, textoVence(x)].filter(Boolean).join(" · ");
    r.append(el("small", x.estado === "vencida" ? "estado-vencida" : "nota", sub), datosFila, barra);
    $("abono-et").textContent = debo ? "Registrar un pago que hice" : "Registrar un pago que recibí";
    $("abono-guardar").textContent = debo ? "Registrar mi abono" : "Registrar el abono que recibí";
    $("abono-anotar-nota").textContent = debo ? "Resta el pago de tu saldo" : "Suma el pago a tu saldo";
    $("form-abono").hidden = x.falta <= 0;
    var ul = $("lista-abonos");
    ul.replaceChildren();
    var abonos = datos.abonos.filter(function (a) { return a.deuda_id === d.id; }).sort(function (a, b) { return String(b.fecha).localeCompare(String(a.fecha)) || b.id - a.id; });
    if (!abonos.length) ul.append(el("li", "vacio", "Todavía no hay abonos."));
    abonos.forEach(function (a) {
      var li = el("li", "fila-categoria"), txt = el("span", "mov-texto");
      txt.append(el("strong", null, dinero(num(a.monto))), el("small", null, fechaCorta.format(parteFechaLocal(a.fecha)) + (a.nota ? " · " + a.nota : "")));
      var editar = el("button", "chip-opcion mini", "✏️ Editar"); editar.type = "button";
      editar.addEventListener("click", function () {
        abrirEditor({
          titulo: "Editar abono",
          ayuda: a.movimiento_id && datos.movimientos.some(function (m) { return m.id === a.movimiento_id; }) ? "El movimiento que se anotó con este abono también se corrige." : "Este abono no tiene un movimiento ligado: si lo habías anotado en tus movimientos, corrígelo desde su detalle.",
          campos: [{ clave: "monto", etiqueta: "Valor del abono", tipo: "plata", valor: num(a.monto) }, { clave: "fecha", etiqueta: "Fecha", tipo: "fecha", valor: a.fecha }, { clave: "nota", etiqueta: "Nota (opcional)", tipo: "texto", valor: a.nota, max: 200 }],
          guardar: function (v) {
            return fuente.actualizar("abonos", a.id, { monto: v.monto, fecha: v.fecha || a.fecha, nota: v.nota || null }).then(function (n) {
              Object.assign(a, n);
              var mov = a.movimiento_id && datos.movimientos.find(function (x) { return x.id === a.movimiento_id; });
              if (!mov) return null;
              return fuente.actualizar("movimientos", mov.id, { monto: num(a.monto), fecha: mediodia(a.fecha) }).then(function (m) { Object.assign(mov, m); ordenarMovimientos(); });
            }).then(function () { programarAvisos(); });
          },
          borrar: function () {
            var mov = a.movimiento_id && datos.movimientos.find(function (x) { return x.id === a.movimiento_id; });
            var tambien = mov && confirm("¿Borrar también el movimiento de " + pesos.format(num(mov.monto)) + " que se anotó con este abono?\nAceptar: se borra y tu saldo vuelve a como estaba.\nCancelar: se queda en tus movimientos.");
            return fuente.borrar("abonos", a.id).then(function () {
              datos.abonos = datos.abonos.filter(function (y) { return y.id !== a.id; });
              return tambien ? borrarMovimientos([mov.id]) : null;
            }).then(function () { programarAvisos(); });
          },
          textoBorrar: "🗑 Borrar este abono", confirmar: "¿Borrar este abono de " + pesos.format(num(a.monto)) + "?", avisoBorrado: "Abono borrado"
        });
      });
      li.append(el("span", "mov-icono chico", "💵"), txt, editar);
      ul.append(li);
    });
  }
  function abrirAbonos(d) {
    deudaAbierta = d;
    $("abono-monto").value = ""; $("abono-nota").value = ""; $("abono-anotar").checked = true;
    llenarCuentas("abono-cuenta", "abono-cuenta-bloque", d.cuenta_id);
    mensaje("abono-mensaje", "");
    pintarAbonos();
    abrirCapa("pantalla-abonos");
  }
  $("abono-todo").addEventListener("click", function () {
    var x = deudaAbierta && datosDeDeuda(deudaAbierta);
    if (x) $("abono-monto").value = pesos.format(x.falta);
  });
  $("abono-editar").addEventListener("click", function () { var d = deudaAbierta; abrirDeuda(d); });
  $("form-abono").addEventListener("submit", function (e) {
    e.preventDefault();
    var d = deudaAbierta, x = d && datosDeDeuda(d), monto = leerValor($("abono-monto").value);
    if (!x) return;
    if (!(monto > 0)) return mensaje("abono-mensaje", "Escribe cuánto abonas. Por ejemplo 100 mil.", true);
    if (monto > x.falta + 0.5) return mensaje("abono-mensaje", "Es más de lo que falta (" + pesos.format(x.falta) + ").", true);
    var boton = $("abono-guardar"), anotar = $("abono-anotar").checked, debo = d.tipo === "debo", cuentaId = cuentaElegida("abono-cuenta", d);
    boton.disabled = true;
    fuente.crear("abonos", { deuda_id: d.id, monto: monto, fecha: A.claveDia(new Date()), nota: $("abono-nota").value.trim() || null }).then(function (a) {
      datos.abonos.push(a);
      if (!anotar) return;
      return anotarMovimientoDeuda(debo ? "gasto" : "ingreso", monto, (debo ? "Abono a la deuda con " : "Abono de ") + d.persona, new Date().toISOString(), cuentaId).then(function (m) {
        return fuente.actualizar("abonos", a.id, { movimiento_id: m.id }).then(function (n) { Object.assign(a, n); });
      });
    }).then(function () {
      var quedan = Math.max(0, x.falta - monto);
      toast(quedan <= 0 ? "🎉 ¡Deuda pagada completa!" : "✓ Abono guardado. Falta " + pesos.format(quedan));
      $("abono-monto").value = ""; $("abono-nota").value = "";
      pintar(); programarAvisos();
    }).catch(function (err) { mensaje("abono-mensaje", "No se pudo guardar: " + err.message, true); })
      .finally(function () { boton.disabled = false; });
  });

  // Avisos en el celular (solo en la app instalada): se vuelven a programar cada vez que cambia algo.
  // Cada domingo a las 7 p. m. un recordatorio para revisar la semana (4 domingos hacia adelante).
  function avisosSemanales() {
    var lista = [], d = new Date();
    d.setHours(19, 0, 0, 0);
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
    if (d < new Date()) d.setDate(d.getDate() + 7);
    for (var k = 0; k < 4; k++) {
      var sem = k === 0 ? NovaConsejos.semana(datos.movimientos, d) : null;
      var texto = sem && sem.movimientos ? "Esta semana gastaste " + pesos.format(sem.gastos) + (sem.ingresos ? " e ingresaste " + pesos.format(sem.ingresos) : "") + (sem.cambio != null ? " (" + Math.abs(sem.cambio) + " % " + (sem.cambio > 0 ? "más" : "menos") + " que la anterior)" : "") + ". ¡Mira cómo planear la próxima!" : "Es domingo: mira cómo te fue esta semana y planea la siguiente.";
      lista.push({ id: 800000001 + k, titulo: "Tu semana en NOVA", texto: texto, cuando: new Date(d.getTime()) });
      d.setDate(d.getDate() + 7);
    }
    return lista;
  }
  // Recordatorios opcionales: anotar los gastos cada noche y el día antes de un pago programado.
  function avisosRecordatorios() {
    var lista = [], ahora = new Date();
    if (leerLocal("nova-rec-noche", false)) {
      // A la hora que la persona eligió (9 p. m. si no eligió). Hoy no suena si ya anotó algo: cada vez que anota,
      // NOVA vuelve a programar los avisos (ver pintar()). Trae los botones de los registros comunes.
      var horaRec = Number(leerLocal("nova-rec-noche-hora", 21)) || 21, hoyK = A.claveDia(ahora);
      var yaAnoto = datos.movimientos.some(function (m) { return A.claveDia(m.fecha) === hoyK; });
      for (var k = 0; k < 7; k++) {
        var d = new Date(); d.setDate(d.getDate() + k); d.setHours(horaRec, 0, 0, 0);
        if (k === 0 && yaAnoto) continue;
        if (d > ahora) lista.push({ id: 700000001 + k, titulo: "¿Gastaste algo hoy?", texto: datos.frecuentes.length ? "Anótalo en un segundo con los botones, o abre NOVA." : "Tómate un minuto para anotar lo de hoy en NOVA.", cuando: d, botones: true });
      }
    }
    if (leerLocal("nova-rec-respaldo", false)) {
      var dom = new Date(); dom.setHours(18, 0, 0, 0); dom.setDate(dom.getDate() + ((7 - dom.getDay()) % 7));
      if (dom < ahora) dom.setDate(dom.getDate() + 7);
      for (var s = 0; s < 4; s++) { lista.push({ id: 700000300 + s, titulo: "💾 Hora de tu respaldo semanal", texto: "Entra a Configuración → Exportar datos → «Guardar copia en Google Drive».", cuando: new Date(dom.getTime()) }); dom.setDate(dom.getDate() + 7); }
    }
    if (leerLocal("nova-rec-rapido", false) && datos.frecuentes.length) {
      lista.push({ id: RAPIDO_ID, titulo: "⚡ Anotar rápido", texto: "Toca un botón para anotar al instante.", cuando: new Date(Date.now() + 4000), rapido: true });
    }
    if (leerLocal("nova-rec-prima", false)) {
      [[5, 15, "prima de mitad de año"], [11, 10, "prima y aguinaldo de diciembre"]].forEach(function (x, i) {
        var d = new Date(ahora.getFullYear(), x[0], x[1], 9, 0, 0, 0);
        if (d <= ahora) d = new Date(ahora.getFullYear() + 1, x[0], x[1], 9, 0, 0, 0);
        lista.push({ id: 700000100 + i, titulo: "🎁 Se acerca la " + x[2], texto: "Aparta una parte para tus metas y tus deudas antes de gastarla.", cuando: d });
      });
    }
    if (leerLocal("nova-rec-programados", false)) {
      datos.programados.filter(function (p) { return p.activo !== false && p.proxima; }).forEach(function (p) {
        var f = parteFechaLocal(p.proxima); f.setDate(f.getDate() - 1); f.setHours(9, 0, 0, 0);
        if (f > ahora) lista.push({ id: 750000000 + (Number(p.id) % 100000), titulo: "Mañana: " + p.descripcion, texto: "Mañana se registra " + (p.tipo === "ingreso" ? "+" : "−") + pesos.format(num(p.monto)) + ". ¿Ya tienes la plata?", cuando: f });
      });
    }
    return lista;
  }
  $("rec-noche").checked = !!leerLocal("nova-rec-noche", false);
  $("rec-noche-hora").value = String(Number(leerLocal("nova-rec-noche-hora", 21)) || 21);
  $("rec-noche-hora").addEventListener("change", function (e) { guardarLocal("nova-rec-noche-hora", Number(e.target.value)); programarAvisos(); toast("Recordatorio a las " + e.target.selectedOptions[0].textContent); });
  $("rec-programados").checked = !!leerLocal("nova-rec-programados", false);
  $("rec-respaldo").checked = !!leerLocal("nova-rec-respaldo", false);
  $("rec-rapido").checked = !!leerLocal("nova-rec-rapido", false);
  $("rec-respaldo").addEventListener("change", function (e) { guardarLocal("nova-rec-respaldo", e.target.checked); programarAvisos(); toast(e.target.checked ? "Respaldo semanal activado" : "Respaldo semanal apagado"); });
  $("rec-rapido").addEventListener("change", function (e) {
    guardarLocal("nova-rec-rapido", e.target.checked);
    if (e.target.checked && !datos.frecuentes.length) toast("Primero crea registros comunes", "Se usan para los botones");
    else toast(e.target.checked ? "Teclas rápidas activadas" : "Teclas rápidas apagadas");
    programarAvisos();
  });
  $("rec-prima").checked = !!leerLocal("nova-rec-prima", false);
  $("rec-prima").addEventListener("change", function (e) { guardarLocal("nova-rec-prima", e.target.checked); programarAvisos(); toast(e.target.checked ? "Aviso de prima y aguinaldo activado" : "Aviso de prima y aguinaldo apagado"); });
  $("rec-noche").addEventListener("change", function (e) { guardarLocal("nova-rec-noche", e.target.checked); programarAvisos(); toast(e.target.checked ? "Recordatorio nocturno activado" : "Recordatorio nocturno apagado"); });
  $("rec-programados").addEventListener("change", function (e) { guardarLocal("nova-rec-programados", e.target.checked); programarAvisos(); toast(e.target.checked ? "Avisos de pagos programados activados" : "Avisos de pagos programados apagados"); });

  // Teclas rápidas: al tocar un botón de la notificación se anota ese registro común.
  var RAPIDO_ID = 700000200, accionesPendientes = [];
  function anotarTeclaRapida(actionId) {
    var f = datos.frecuentes.find(function (x) { return "f" + x.id === actionId; });
    if (!f) return;
    var r = Parser.interpretar(f.texto);
    if (!r.ok) return toast("No se pudo anotar", f.texto);
    guardarRegistro(r, r.categoria, false).then(function () { programarAvisos(); }).catch(function () { /* el aviso de error ya salió */ });
  }
  (function escucharTeclasRapidas() {
    var N = enApp && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
    if (!N || !N.addListener) return;
    N.addListener("localNotificationActionPerformed", function (ev) {
      if (ev && ev.notification && ev.notification.id === 700000900) { toast("Botón tocado", "Tecla rápida: " + (ev.actionId === "uno" ? "Botón 1" : ev.actionId === "dos" ? "Botón 2" : String(ev.actionId))); return; }
      var idAviso = ev && ev.notification && ev.notification.id;
      if (!ev || !ev.notification || !(idAviso === RAPIDO_ID || (idAviso >= 700000001 && idAviso <= 700000007)) || !/^f\d+$/.test(String(ev.actionId))) return;
      if (fuente && datos && datos.frecuentes.length) anotarTeclaRapida(ev.actionId); else accionesPendientes.push(ev.actionId);   // si la app aún está abriendo, queda en espera
    });
  })();
  function programarAvisos() {
    var N = enApp && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
    if (!N || !fuente || fuente.demo) return Promise.resolve();
    var avisos = (conductor() ? A.avisosDocumentos(datos.documentos) : []).concat(A.avisosDeudas(resumenDeDeudas().lista)).concat(avisosSemanales()).concat(avisosRecordatorios()).slice(0, 60);
    return N.getPending().then(function (p) {
      var viejos = (p && p.notifications || []).map(function (n) { return { id: n.id }; });
      return viejos.length ? N.cancel({ notifications: viejos }) : null;
    }).then(function () {
      if (!avisos.length) return null;
      return N.requestPermissions().then(function (perm) {
        if (!perm || perm.display !== "granted") return null;
        var teclas = datos.frecuentes.slice(0, 3).map(function (f) { return { id: "f" + f.id, title: String(f.texto).slice(0, 24) }; });
        var tipos = avisos.some(function (a) { return a.rapido || a.botones; }) && teclas.length ? N.registerActionTypes({ types: [{ id: "RAPIDO", actions: teclas }] }) : Promise.resolve();
        return tipos.then(function () {
          return N.schedule({ notifications: avisos.map(function (a) {
            var n = { id: a.id, title: a.titulo, body: a.texto, schedule: { at: a.cuando, allowWhileIdle: true } };
            if (a.rapido) { n.ongoing = true; n.autoCancel = false; n.actionTypeId = "RAPIDO"; }
            if (a.botones && teclas.length) n.actionTypeId = "RAPIDO";
            return n;
          }) });
        });
      });
    }).catch(function () { /* sin permiso o sin el complemento: los avisos dentro de la app siguen funcionando */ });
  }

  // ---------- Exportar ----------
  // El aviso sale en la pantalla de exportar y también como mensaje flotante (los iconos PDF y Excel están en todas las pantallas).
  function avisoExp(texto, error) { mensaje("exportar-mensaje", texto, error); if (texto) toast(texto); }
  // Ojo: se llama distinto a aBase64 (la de las fotos, más abajo). Con el mismo nombre, la de las fotos
  // reemplazaba a esta y los PDF y Excel salían vacíos («The 'writeFile' input parameters aren't valid»).
  function bytesABase64(bytes) {
    var s = "";
    for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function descargar(nombre, contenido, tipo) {
    var binario = typeof contenido !== "string";
    if (!binario && /^text\/csv/.test(tipo) && contenido.charAt(0) !== "\ufeff") contenido = "\ufeff" + contenido; // para que Excel lea bien las tildes
    if (enApp) {
      // En la app: se guarda en una carpeta temporal y se abre el menú de compartir de Android
      // (Guardar en Drive, WhatsApp, correo, Archivos...).
      var P = window.Capacitor.Plugins || {};
      if (!P.Filesystem || !P.Share) {
        avisoExp("Actualiza NOVA a la última versión para poder descargar desde la app.", true);
        return;
      }
      avisoExp("Preparando " + nombre + "…");
      var archivo = { path: nombre, data: binario ? bytesABase64(contenido) : contenido, directory: "CACHE" };
      if (!binario) archivo.encoding = "utf8";
      P.Filesystem.writeFile(archivo)
        .then(function (r) { return P.Share.share({ title: nombre, text: "Informe de NOVA · OPITA-DIGITAL", url: r.uri, dialogTitle: "Guardar o enviar " + nombre }); })
        .then(function () { avisoExp("Listo: elige dónde guardar " + nombre + "."); })
        .catch(function (e) {
          if (e && /cancel/i.test(String(e.message || e))) return avisoExp("");
          avisoExp("No se pudo exportar: " + (e && e.message ? e.message : e), true);
        });
      return;
    }
    var url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
    var a = el("a"); a.href = url; a.download = nombre;
    document.body.append(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    avisoExp("Se descargó " + nombre + ".");
  }
  function hoyArchivo() { return A.claveDia(new Date()); }
  function exportarMovimientos(movs, nombre) {
    var cuenta = function (id) { var c = datos.cuentas.find(function (x) { return x.id === id; }); return c ? c.nombre : ""; };
    descargar((nombre || "nova-transacciones") + "-" + hoyArchivo() + ".csv", A.csv(movs, [
      { titulo: "Fecha", valor: function (m) { return A.claveDia(m.fecha); } },
      { titulo: "Hora", valor: function (m) { return hora.format(new Date(m.fecha)); } },
      { titulo: "Tipo", valor: function (m) { return m.tipo === "ingreso" ? "Ingreso" : "Gasto"; } },
      { titulo: "Descripción", valor: function (m) { return m.descripcion; } },
      { titulo: "Categoría", valor: function (m) { return nombreCategoria(m.categoria_id); } },
      { titulo: "Valor", valor: function (m) { return (m.tipo === "ingreso" ? 1 : -1) * num(m.monto); } },
      { titulo: "Cuenta", valor: function (m) { return cuenta(m.cuenta_id); } },
      { titulo: "Estado", valor: function (m) { return m.estado || "pagado"; } },
      { titulo: "Etiquetas", valor: function (m) { return (m.etiquetas || []).map(function (e) { return "#" + e; }); } },
      { titulo: "Nota", valor: function (m) { return m.nota || ""; } }
    ]), "text/csv;charset=utf-8");
  }
  document.querySelectorAll("[data-exportar]").forEach(function (b) {
    b.addEventListener("click", function () {
      var que = b.dataset.exportar;
      if (que === "respaldo-drive") { avisoExp("Elige «Drive» en el menú para guardar tu copia."); que = "respaldo"; }
      if (que === "hojas") {
        avisoExp(enApp ? "Elige «Hojas de cálculo» en el menú para abrir tu Excel." : "Se descargará el Excel; en Google Sheets usa Archivo → Importar para abrirlo.");
        if (!enApp) setTimeout(function () { window.open("https://sheets.new", "_blank", "noopener"); }, 1500);
        que = "excel";
      }
      if (que === "movimientos") return exportarMovimientos(datos.movimientos);
      if (que === "categorias") {
        return descargar("nova-categorias-" + hoyArchivo() + ".csv", A.csv(datos.categorias, [
          { titulo: "Nombre", valor: function (c) { return c.nombre; } },
          { titulo: "Tipo", valor: function (c) { return c.tipo; } },
          { titulo: "Grupo", valor: function (c) { return A.grupoDe(c); } },
          { titulo: "Movimientos", valor: function (c) { return usosCategoria(c.id); } }
        ]), "text/csv;charset=utf-8");
      }
      if (que === "limites") {
        var filas = datos.limites.map(function (l) { var e = estadoLimite(l); return { n: l.categoria_id != null ? nombreCategoria(l.categoria_id) : "Todas las categorías", c: l.ciclo, m: l.monto, g: e.gastado, r: l.recurrente }; });
        if (datos.perfil.presupuesto_monto) filas.unshift({ n: "Presupuesto general", c: cicloEfectivo(), m: datos.perfil.presupuesto_monto, g: gastadoEn(Periodos.periodo(cicloEfectivo())), r: true });
        return descargar("nova-presupuestos-" + hoyArchivo() + ".csv", A.csv(filas, [
          { titulo: "Nombre", valor: function (f) { return f.n; } }, { titulo: "Periodo", valor: function (f) { return f.c; } },
          { titulo: "Límite", valor: function (f) { return num(f.m); } }, { titulo: "Gastado este periodo", valor: function (f) { return f.g; } },
          { titulo: "Recurrente", valor: function (f) { return f.r ? "Sí" : "No"; } }
        ]), "text/csv;charset=utf-8");
      }
      if (que === "respaldo") {
        var copia = { app: "NOVA", creada_por: "OPITA-DIGITAL", exportado: new Date().toISOString(), perfil: datos.perfil };
        TABLAS.forEach(function (t) { copia[t] = datos[t]; });
        return descargar("nova-respaldo-" + hoyArchivo() + ".json", JSON.stringify(copia, null, 2), "application/json");
      }
      if (que === "pdf" || que === "excel") return abrirInforme(que, "exportar");
    });
  });

  // Informe completo (PDF o Excel con gráficos): aquí se calculan las cifras y informes.js arma el archivo.
  var DIAS_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  function nombreDePersona() {
    if (fuente.nombre) return fuente.nombre;
    var local = String(fuente.email || "").split("@")[0].replace(/[._-]+/g, " ").replace(/\d+/g, "").trim();
    return local ? local.replace(/\b\w/g, function (l) { return l.toUpperCase(); }) : "Usuario de NOVA";
  }
  // Periodos de los informes: diario, semanal, quincenal, mensual, trimestral, semestral y anual.
  // desfase 0 = el actual, -1 = el anterior, etc.
  function rangoDeInforme(ciclo, desfase) {
    if (ciclo === "diario") {
      var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + desfase);
      var h = new Date(d); h.setDate(h.getDate() + 1);
      return { desde: d, hasta: h };
    }
    return A.desplazar(ciclo, new Date(), desfase);
  }
  function nombreDeInforme(ciclo, rango) { return ciclo === "diario" ? fechaLarga.format(rango.desde) : A.nombrePeriodo(ciclo, rango); }
  function serieDiaria(rango) {
    var out = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date(rango.desde); d.setDate(d.getDate() - i);
      var h = new Date(d); h.setDate(h.getDate() + 1);
      var t = A.totales(A.enRango(datos.movimientos, { desde: d, hasta: h }));
      out.push({ etiqueta: fechaCorta.format(d), ingresos: t.ingresos, gastos: t.gastos });
    }
    return out;
  }
  function construirInforme(ciclo, desfase) {
    ciclo = ciclo || cicloEfectivo(); desfase = Math.min(0, desfase || 0);
    var cicloP = cicloEfectivo(), rango = rangoDeInforme(ciclo, desfase), movs = A.enRango(datos.movimientos, rango), t = A.totales(movs);
    var cuentaNombre = function (id) { var c = datos.cuentas.find(function (x) { return x.id === id; }); return c ? c.nombre : ""; };
    var finEfectivo = Math.min(rango.hasta.getTime(), new Date().setHours(24, 0, 0, 0));
    var dias = Math.max(1, Math.round((finEfectivo - rango.desde.getTime()) / 86400000));
    var gastos = movs.filter(function (m) { return m.tipo === "gasto"; });
    var mayor = gastos.reduce(function (mx, m) { return !mx || num(m.monto) > num(mx.monto) ? m : mx; }, null);
    var semana = DIAS_CORTOS.map(function (d) { return { dia: d, total: 0 }; });
    gastos.forEach(function (m) { semana[(new Date(m.fecha).getDay() + 6) % 7].total += num(m.monto); });
    var forma = function (m) {
      return { fecha: new Date(m.fecha), tipo: m.tipo, descripcion: m.descripcion || "", categoria: nombreCategoria(m.categoria_id), monto: Math.abs(num(m.monto)),
        cuenta: cuentaNombre(m.cuenta_id), estado: m.estado || "pagado", etiquetas: m.etiquetas || [], nota: m.nota || "" };
    };
    var presupuestos = datos.limites.map(function (l) {
      var e = estadoLimite(l);
      return { nombre: l.categoria_id != null ? nombreCategoria(l.categoria_id) : "Todas las categorías", ciclo: Periodos.CICLOS[l.ciclo] || l.ciclo, limite: num(l.monto), gastado: e.gastado };
    });
    if (datos.perfil.presupuesto_monto) {
      presupuestos.unshift({ nombre: "Presupuesto general", ciclo: Periodos.CICLOS[cicloP], limite: num(datos.perfil.presupuesto_monto), gastado: gastadoEn(Periodos.periodo(cicloP)) });
    }
    var inf = {
      persona: { nombre: nombreDePersona(), email: fuente.email }, generado: new Date(), periodoNombre: nombreDeInforme(ciclo, rango),
      ciclo: ciclo, cicloNombre: ciclo === "diario" ? "Diario" : Periodos.CICLOS[ciclo], cicloPresupuesto: Periodos.CICLOS[cicloP], desde: rango.desde, hasta: new Date(rango.hasta.getTime() - 1),
      serieTitulo: ciclo === "diario" ? "últimos 7 días" : "últimos 6 periodos",
      kpis: {
        ingresos: t.ingresos, gastos: t.gastos, balance: t.neto, saldoTotal: saldoTotal(), promedioDiario: t.gastos / dias, movimientos: movs.length,
        ahorroPct: t.ingresos > 0 ? (t.neto / t.ingresos) * 100 : null, mayorGasto: mayor ? { descripcion: mayor.descripcion || nombreCategoria(mayor.categoria_id), monto: num(mayor.monto) } : null
      },
      categorias: A.porCategoria(movs).map(function (f) {
        return { nombre: nombreCategoria(f.id), total: f.total, pct: t.gastos > 0 ? (f.total / t.gastos) * 100 : 0,
          cantidad: gastos.filter(function (m) { return (m.categoria_id == null ? null : m.categoria_id) === f.id; }).length };
      }),
      serie: ciclo === "diario" ? serieDiaria(rango) : A.serie(datos.movimientos, ciclo, rango.desde, 6), semana: semana,
      cuentas: datos.cuentas.map(function (c) { return { nombre: c.nombre, tipo: c.tipo ? String(c.tipo).charAt(0).toUpperCase() + String(c.tipo).slice(1) : "Cuenta", saldo: saldoCuenta(c) }; }),
      presupuestos: presupuestos, movimientos: movs.map(forma), todos: datos.movimientos.map(forma), conductor: null
    };
    var antR = ciclo === "diario" ? rangoDeInforme("diario", desfase - 1) : A.desplazar(ciclo, rango.desde, -1), tAnt = A.totales(A.enRango(datos.movimientos, antR));
    var cambio = function (a, b) { return b > 0 ? ((a - b) / b) * 100 : null; };
    inf.anterior = { nombre: nombreDeInforme(ciclo, antR), ingresos: tAnt.ingresos, gastos: tAnt.gastos, balance: tAnt.neto, cambioIngresos: cambio(t.ingresos, tAnt.ingresos), cambioGastos: cambio(t.gastos, tAnt.gastos) };
    inf.ingresosCat = A.porCategoria(movs, "ingreso").map(function (f) { return { nombre: nombreCategoria(f.id), total: f.total, pct: t.ingresos > 0 ? (f.total / t.ingresos) * 100 : 0 }; });
    inf.topGastos = gastos.slice().sort(function (a, b) { return num(b.monto) - num(a.monto); }).slice(0, 5).map(forma);
    inf.metas = datos.metas.map(function (m) { return { nombre: m.nombre, objetivo: num(m.objetivo), ahorrado: num(m.ahorrado) }; });
    inf.documentos = datos.documentos.map(function (d) { var e = A.estadoDocumento(d); return { nombre: d.nombre, vence: d.vence, estado: e.estado, texto: e.texto, costo: d.costo ? num(d.costo) : null }; });
    var primero = datos.movimientos.reduce(function (mn, m) { var f = new Date(m.fecha); return !mn || f < mn ? f : mn; }, null);
    inf.perfil = { presupuesto: num(datos.perfil.presupuesto_monto), cuentas: datos.cuentas.length, categorias: datos.categorias.length, movimientosTotal: datos.movimientos.length, primerRegistro: primero,
      clienteDesde: fuente.creado ? new Date(fuente.creado) : null, modoConductor: conductor(), vehiculo: datos.perfil.vehiculo || "", metaDiaria: num(datos.perfil.meta_diaria) };
    var rdeu = resumenDeDeudas();
    inf.deudas = { debo: rdeu.debo, meDeben: rdeu.meDeben, lista: rdeu.lista.map(function (x) {
      return { tipo: x.deuda.tipo, persona: x.deuda.persona, concepto: x.deuda.concepto || "", fecha: x.deuda.fecha, vence: x.deuda.vence || null, total: x.total, abonado: x.abonado, falta: x.falta, estado: x.estado };
    }) };
    inf.proyeccion30 = A.proyeccion(datos.movimientos, saldoTotal())[1].saldo;
    if (conductor()) {
      var r = A.resumenTrabajo(datos.movimientos, datos.categorias, rango);
      inf.conductor = { vehiculo: datos.perfil.vehiculo || "", ingresos: r.ingresos, gastos: r.gastos, neto: r.neto, operacion: r.operacion, fijos: r.fijos, netoOperativo: r.netoOperativo, viajes: r.viajes, porViaje: r.porViaje,
        plataformas: r.porPlataforma.map(function (p) { return { nombre: nombreCategoria(p.id), total: p.total, viajes: p.viajes }; }) };
    }
    return inf;
  }
  var generandoInforme = false;
  function exportarInforme(tipo, ciclo, desfase) {
    if (generandoInforme) return;
    if (!window.NovaInformes) return avisoExp("No se pudo preparar el informe. Actualiza NOVA.", true);
    generandoInforme = true;
    avisoExp("Preparando tu informe " + (tipo === "pdf" ? "en PDF" : "en Excel") + "… puede tardar unos segundos.");
    setTimeout(function () {
      var listo;
      try { listo = window.NovaInformes[tipo](construirInforme(ciclo, desfase)); } catch (e) { listo = Promise.reject(e); }
      listo.then(function (r) { descargar(r.nombre, r.bytes, r.tipo); })
        .catch(function (e) { avisoExp("No se pudo crear el informe: " + (e && e.message ? e.message : e), true); })
        .then(function () { generandoInforme = false; });
    }, 30);
  }

  // Hoja para elegir formato y periodo; los iconos PDF y Excel de cada pantalla la abren con su periodo.
  var informeSel = { tipo: "pdf", ciclo: "mensual", desfase: 0 };
  function contextoInforme(ctx) {
    switch (ctx) {
      case "inicio": return { ciclo: cicloEfectivo(), desfase: desfaseInicio };
      case "analisis": return { ciclo: cicloDeAnalisis(), desfase: desfaseAnalisis };
      case "trabajo": return { ciclo: cualTrabajo === "hoy" ? "diario" : cualTrabajo === "semana" ? "semanal" : "mensual", desfase: 0 };
      case "buscar": return { ciclo: "mensual", desfase: 0 };
      default: return { ciclo: cicloEfectivo(), desfase: 0 };
    }
  }
  function pintarHojaInforme() {
    document.querySelectorAll("#informe-formato button").forEach(function (b) { b.setAttribute("aria-checked", String(b.dataset.f === informeSel.tipo)); });
    document.querySelectorAll("#informe-ciclos button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.c === informeSel.ciclo)); });
    document.querySelectorAll("#informe-cual button").forEach(function (b) { b.setAttribute("aria-pressed", String(Number(b.dataset.d) === informeSel.desfase)); });
    $("informe-nombre").textContent = nombreDeInforme(informeSel.ciclo, rangoDeInforme(informeSel.ciclo, informeSel.desfase));
    $("informe-descargar").textContent = "Descargar " + (informeSel.tipo === "pdf" ? "PDF" : "Excel");
  }
  function abrirInforme(tipo, ctx) {
    var c = contextoInforme(ctx);
    informeSel = { tipo: tipo, ciclo: c.ciclo, desfase: Math.max(-3, Math.min(0, c.desfase)) };
    pintarHojaInforme();
    abrirCapa("hoja-informe");
  }
  document.querySelectorAll("[data-informe]").forEach(function (b) { b.addEventListener("click", function () { abrirInforme(b.dataset.informe, b.dataset.ctx); }); });
  document.querySelectorAll("#informe-formato button").forEach(function (b) { b.addEventListener("click", function () { informeSel.tipo = b.dataset.f; pintarHojaInforme(); }); });
  document.querySelectorAll("#informe-ciclos button").forEach(function (b) { b.addEventListener("click", function () { informeSel.ciclo = b.dataset.c; pintarHojaInforme(); }); });
  document.querySelectorAll("#informe-cual button").forEach(function (b) { b.addEventListener("click", function () { informeSel.desfase = Number(b.dataset.d); pintarHojaInforme(); }); });
  $("informe-descargar").addEventListener("click", function () {
    var sel = informeSel;
    cerrarYLuego(function () { exportarInforme(sel.tipo, sel.ciclo, sel.desfase); });
  });

  // ---------- Pintar todo ----------
  var hoyAnotadoAvisos = null;
  function pintar() {
    var hoyAnotado = !!datos.movimientos.length && datos.movimientos.some(function (m) { return A.claveDia(m.fecha) === A.claveDia(new Date()); });
    if (fuente && hoyAnotado !== hoyAnotadoAvisos) { var antes = hoyAnotadoAvisos; hoyAnotadoAvisos = hoyAnotado; if (antes !== null && leerLocal("nova-rec-noche", false)) programarAvisos(); }
    if (!fuente) return;
    pintarInicio(); pintarPlanes(); pintarAnalisis(); pintarBuscar(); pintarAjustes(); pintarIA(); pintarConductor(); pintarDeudas(); pintarGrupos(); pintarCalendario(); pintarEspacioCabecera(); if (pilaCapas.indexOf("pantalla-detalle") >= 0) pintarDetalle(); if (deudaAbierta && pilaCapas.indexOf("pantalla-abonos") >= 0) pintarAbonos();
  }

  function alerta(e) { mensaje("rapido-mensaje", "No se pudo guardar: " + (e && e.message ? e.message : e), true); }

  // ---------- Navegación ----------
  var PRINCIPALES = ["inicio", "planes", "ia", "analisis", "buscar", "ajustes"];
  function ir(vista) {
    document.querySelectorAll(".vista").forEach(function (v) { v.hidden = v.dataset.vista !== vista; });
    var principal = PRINCIPALES.indexOf(vista) >= 0 ? vista : vista === "trabajo" ? "inicio" : "ajustes";
    document.querySelectorAll(".nav-inferior button").forEach(function (b) {
      b.classList.toggle("activo", b.dataset.ir === principal);
      if (b.dataset.ir === principal) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    enVista = vista;
    actualizarFab();
    if (vista === "buscar") pintarBuscar();
    if (vista === "ia") pintarIA();
    if (vista === "ajustes-tasas") abrirTasas();
    window.scrollTo(0, 0);
  }
  // El botón + se esconde donde estorba: en pantallas de configuración y mientras se ve la entrada rápida del inicio.
  var enVista = "inicio", rapidoVisible = false;
  function actualizarFab() {
    $("btn-mas").classList.toggle("oculto", ["inicio", "analisis", "buscar", "planes"].indexOf(enVista) < 0 || (enVista === "inicio" && rapidoVisible));
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e) { rapidoVisible = e[0].isIntersecting; actualizarFab(); }).observe($("form-rapido"));
  }
  document.querySelectorAll("[data-ir]").forEach(function (b) { b.addEventListener("click", function () { ir(b.dataset.ir); }); });
  document.querySelectorAll("[data-tema]").forEach(function (b) { b.addEventListener("click", function () { aplicarTema(b.dataset.tema); }); });
  document.querySelectorAll("button[data-acento]").forEach(function (b) { b.addEventListener("click", function () { aplicarAcento(b.dataset.acento); }); });
  document.querySelectorAll("button[data-letra]").forEach(function (b) { b.addEventListener("click", function () { aplicarLetra(b.dataset.letra); }); });

  // Capas (pantallas encima de la app) y hojas. El botón Atrás de Android las cierra.
  var pilaCapas = [];
  function abrirCapa(id) {
    var c = $(id);
    if (pilaCapas.indexOf(id) >= 0) return;
    pilaCapas.push(id);
    c.hidden = false;
    document.body.classList.add("con-capa");
    history.pushState({ capa: id }, "");
    var foco = c.querySelector("input:not([type=checkbox]):not([type=date]), textarea"); // no se enfoca ningún botón: así la flecha de volver no sale con un aro
    if (c.classList.contains("capa") && foco && id !== "pantalla-registro" && id !== "pantalla-detalle" && id !== "pantalla-abonos") setTimeout(function () { foco.focus({ preventScroll: true }); }, 30);
  }
  function ocultarCapa() {
    var id = pilaCapas.pop();
    if (id) $(id).hidden = true;
    if (!pilaCapas.length) document.body.classList.remove("con-capa");
  }
  function cerrarCapa() { if (pilaCapas.length) history.back(); }
  window.addEventListener("popstate", function () { if (pilaCapas.length) ocultarCapa(); });
  document.querySelectorAll("[data-cerrar]").forEach(function (b) { b.addEventListener("click", cerrarCapa); });
  document.querySelectorAll(".hoja-fondo").forEach(function (f) { f.addEventListener("click", function (e) { if (e.target === f) cerrarCapa(); }); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && pilaCapas.length) cerrarCapa(); });
  // Cierra la capa de arriba y, cuando el navegador terminó de volver atrás, ejecuta fn.
  function cerrarYLuego(fn) {
    var listo = function () { window.removeEventListener("popstate", listo); setTimeout(fn, 0); };
    window.addEventListener("popstate", listo);
    cerrarCapa();
  }
  function abrirDesdeHoja(fn) {
    if (pilaCapas[pilaCapas.length - 1] === "hoja-mas") cerrarYLuego(fn); else fn();
  }
  $("btn-mas").addEventListener("click", function () { abrirCapa("hoja-mas"); });
  document.querySelectorAll("[data-abrir]").forEach(function (b) {
    b.addEventListener("click", function () {
      var id = b.dataset.abrir;
      abrirDesdeHoja(function () { if (id === "pantalla-chat") abrirChat(null); else abrirCapa(id); });
    });
  });
  document.querySelectorAll("[data-trabajo]").forEach(function (b) {
    b.addEventListener("click", function () { var cual = b.dataset.trabajo; abrirDesdeHoja(function () { nuevoTrabajo(cual); }); });
  });
  document.querySelectorAll("[data-nuevo]").forEach(function (b) {
    b.addEventListener("click", function () { var t = b.dataset.nuevo; abrirDesdeHoja(function () { abrirRegistro({ tipo: t }); }); });
  });

  // ---------- Nuevo / editar movimiento ----------
  var reg = null;
  function abrirRegistro(o) {
    o = o || {};
    var m = o.movimiento;
    reg = {
      editar: m || null,
      tipo: m ? m.tipo : o.tipo || "gasto",
      expr: m ? textoMonto(m.moneda && m.moneda !== monedaBase() && num(m.monto_original) > 0 ? num(m.monto_original) : num(m.monto)) : (o.expr || ""),
      categoriaId: m ? m.categoria_id : (o.categoriaId != null ? o.categoriaId : null),
      documentoId: o.documentoId || null,
      etiquetas: m ? (m.etiquetas || []).slice() : [],
      moneda: m && m.moneda ? m.moneda : monedaBase(),
      tasa: m && m.tasa ? Number(m.tasa) : null,
      tasaAuto: null, tasaFecha: "", tasaEditada: !!(m && m.tasa)
    };
    $("reg-fecha").value = A.claveDia(m ? m.fecha : new Date());
    $("reg-desc").value = m ? m.descripcion : (o.desc || "");
    $("reg-viajes").value = m && m.viajes ? m.viajes : "";
    $("reg-nota").value = m && m.nota ? m.nota : "";
    $("reg-estado").value = m && m.estado ? m.estado : "pagado";
    $("reg-etiqueta").value = "";
    var freq = $("reg-frecuencia");
    freq.replaceChildren();
    Object.keys(A.FRECUENCIAS).forEach(function (f) { var op = el("option", null, A.FRECUENCIAS[f]); op.value = f; op.selected = f === "mensual"; freq.append(op); });
    $("reg-bloque-estado").hidden = !(m && m.estado === "pendiente");
    $("reg-bloque-nota").hidden = !(m && m.nota);
    $("reg-bloque-recurrente").hidden = !o.recurrente;
    $("reg-btn-recurrente").hidden = !!m;
    $("reg-otro-fila").hidden = !!m;
    $("reg-borrar").hidden = !m;
    var sel = $("reg-cuenta");
    sel.replaceChildren();
    datos.cuentas.forEach(function (c) { var op = el("option", null, c.nombre); op.value = c.id; op.selected = m ? c.id === m.cuenta_id : false; sel.append(op); });
    sel.hidden = $("reg-cuenta-etiqueta").hidden = datos.cuentas.length < 2;
    mensaje("reg-mensaje", "");
    $("teclado").hidden = false;
    pintarRegistro();
    abrirCapa("pantalla-registro");
  }
  // 19.99 -> "19,99" (la coma es el decimal que se escribe con el teclado de la app)
  function textoMonto(n) { return String(Math.round(n * 100) / 100).replace(".", ","); }
  function formatearExpr(expr) {
    if (!expr) return "0";
    return expr.replace(/\d+(,\d*)?/g, function (d) {
      var p = d.split(",");
      return numeroCO.format(Number(p[0])) + (p.length > 1 ? "," + p[1] : "");
    });
  }

  // Tasas de cambio (base USD): se piden una vez al día y se guardan en el celular.
  // La fuente gratis publica tasas nuevas una vez al día; la app las vuelve a pedir cada 30 minutos (y al abrir, al volver
  // a la app o al volver el internet) para tenerlas al día apenas salgan. "forzar" pide ya mismo (máximo una vez por minuto).
  var TTL_TASAS = 30 * 60000;
  function cargarTasas(forzar) {
    var g = leerLocal("nova-tasas", null), tiene = g && g.rates;
    if (tiene && Date.now() - g.guardado < (forzar ? 60000 : TTL_TASAS)) return Promise.resolve(g);
    var directo = function () {
      return fetch("https://open.er-api.com/v6/latest/USD").then(function (r) { return r.json(); })
        .then(function (d) { if (d.result !== "success" || !d.rates) throw new Error("tasas"); return { rates: d.rates, fecha: d.time_last_update_utc }; });
    };
    var porFuncion = function () {
      return cliente.functions.invoke("nova-ia", { body: { tasas: true } }).then(function (res) { if (res.error || !res.data || !res.data.rates) throw new Error("tasas"); return res.data; });
    };
    var origen = enLinea() ? directo().catch(function () { return cliente && fuente && !fuente.demo ? porFuncion() : Promise.reject(new Error("tasas")); }) : Promise.reject(new Error("sin internet"));
    return origen.then(function (d) {
      var t = { rates: d.rates, fecha: d.fecha || "", guardado: Date.now() };
      guardarLocal("nova-tasas", t);
      return t;
    }).catch(function () { return tiene ? g : null; });
  }
  // Vuelve a pedir las tasas y actualiza lo que se esté viendo: el convertidor, la lista y la tasa del pago que se está anotando.
  function refrescarTasas(forzar) {
    return cargarTasas(forzar).then(function (t) {
      if (!t) return null;
      if (enVista === "ajustes-tasas") { conv.tasas = t.rates; conv.fecha = t.fecha; pintarFechaTasas(t); pintarConversor("monto"); pintarListaTasas(); }
      if (typeof reg !== "undefined" && reg && reg.moneda !== monedaBase() && pilaCapas.indexOf("pantalla-registro") >= 0) {
        var nueva = tasaABase(reg.moneda, t.rates);
        if (nueva) { reg.tasaAuto = nueva; reg.tasaFecha = t.fecha; if (!reg.tasaEditada) { reg.tasa = nueva; pintarRegistro(); } }
      }
      return t;
    });
  }
  function pintarFechaTasas(t) {
    var cuando = t && t.guardado ? new Date(t.guardado) : null;
    $("tasas-fecha").textContent = t
      ? "Tasas de ExchangeRate-API" + (t.fecha ? " del " + t.fecha.slice(5, 16) : "") + (cuando ? " · revisadas hoy a las " + hora.format(cuando) : "") + " — la app las vuelve a revisar sola cada 30 minutos y, sin internet, usa las últimas guardadas."
      : "No pude descargar las tasas. Sin internet no hay tasas guardadas todavía.";
  }
  setInterval(function () { if (!document.hidden && enLinea() && fuente && !fuente.demo) refrescarTasas(); }, 5 * 60000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden && fuente && !fuente.demo) refrescarTasas(); });
  window.addEventListener("online", function () { if (fuente && !fuente.demo) refrescarTasas(true); });
  // La hoja de monedas (con buscador) la usan el registro y el convertidor: guarda cuál está elegida y qué hacer al elegir otra.
  var eleccionMoneda = { actual: "COP", fn: null };
  function abrirHojaMoneda(actual, fn) {
    eleccionMoneda = { actual: actual, fn: fn };
    abrirCapa("hoja-moneda");
    $("hoja-moneda-buscar").value = "";
    pintarHojaMoneda();
  }
  function elegirMoneda() { $("hoja-moneda-titulo").textContent = "¿En qué moneda fue?"; abrirHojaMoneda(reg.moneda, cambiarMoneda); }
  // Cuánto vale 1 unidad de la moneda en la moneda del espacio (en Principal, pesos colombianos).
  function tasaABase(codigo, rates) { var b = monedaBase(); return codigo === b ? 1 : b === "COP" ? Mon.tasaACOP(codigo, rates) : Mon.convertir(1, codigo, b, rates); }
  function aBase(valor, tasa) { var x = Number(valor) * Number(tasa); return monedaBase() === "COP" ? Math.round(x) : Math.round(x * 100) / 100; }
  function pintarHojaMoneda() {
    var cont = $("hoja-moneda-lista");
    cont.replaceChildren();
    var lista = Mon.buscar($("hoja-moneda-buscar").value);
    if (!lista.length) cont.append(el("p", "vacio", "No hay monedas con ese nombre."));
    lista.forEach(function (m) {
      var b = el("button", "fila-moneda"); b.type = "button";
      var txt = el("span", "mov-texto"); txt.append(el("strong", null, m.codigo), el("small", null, m.nombre));
      b.append(el("span", "bandera", m.bandera), txt, el("span", "marca", m.codigo === eleccionMoneda.actual ? "✓" : ""));
      b.addEventListener("click", function () { cerrarYLuego(function () { eleccionMoneda.fn(m.codigo); }); });
      cont.append(b);
    });
  }
  $("hoja-moneda-buscar").addEventListener("input", pintarHojaMoneda);

  // ---------- Tasas de cambio: convertidor y lista de todas las monedas ----------
  var conv = { de: "USD", a: "COP", tasas: null, fecha: "" };
  function botonMoneda(btn, cod) { var mi = Mon.info(cod); btn.textContent = mi.bandera + " " + mi.codigo + " ▾"; }
  // Los dos valores se pueden editar: lo que se escribe en uno calcula el otro.
  function pintarConversor(origen) {
    botonMoneda($("conv-de"), conv.de); botonMoneda($("conv-a"), conv.a);
    var r = conv.tasas, nota = $("conv-nota");
    if (!r) { nota.textContent = "Todavía no hay tasas guardadas. Conéctate a internet una vez para descargarlas."; return; }
    var uno = Mon.convertir(1, conv.de, conv.a, r);
    nota.textContent = uno != null ? "1 " + conv.de + " = " + Mon.formatoNumero(uno) + " " + conv.a : "No hay tasa para una de estas dos monedas.";
    if (origen === "resultado") {
      var v = leerDecimalCO($("conv-resultado").value), x = Mon.convertir(v, conv.a, conv.de, r);
      if (document.activeElement !== $("conv-monto")) $("conv-monto").value = v > 0 && x != null ? Mon.formatoNumero(x) : "";
    } else {
      var m = leerDecimalCO($("conv-monto").value), y = Mon.convertir(m, conv.de, conv.a, r);
      if (document.activeElement !== $("conv-resultado")) $("conv-resultado").value = m > 0 && y != null ? Mon.formatoNumero(y) : "";
    }
  }
  function pintarListaTasas() {
    var ul = $("lista-tasas"), r = conv.tasas;
    ul.replaceChildren();
    var lista = Mon.buscar($("tasas-buscar").value);
    if (!lista.length) ul.append(el("li", "vacio", "No hay monedas con ese nombre."));
    lista.forEach(function (m) {
      var li = el("li", "fila-categoria fila-tasa"), txt = el("span", "mov-texto"), val = el("span", "tasa-valor");
      li.tabIndex = 0; li.setAttribute("role", "button");
      txt.append(el("strong", null, m.codigo), el("small", null, m.nombre));
      var aCop = r ? Mon.convertir(1, m.codigo, "COP", r) : null, deUsd = r ? Mon.convertir(1, "USD", m.codigo, r) : null;
      if (aCop != null) { val.append(document.createTextNode("1 " + m.codigo + " = $ " + Mon.formatoNumero(aCop)), el("small", null, "1 USD = " + Mon.formatoNumero(deUsd) + " " + m.codigo)); }
      else val.append(document.createTextNode(r ? "Sin tasa" : "—"));
      li.append(el("span", "bandera", m.bandera), txt, val);
      function elegir() {
        conv.de = m.codigo; if (conv.a === conv.de) conv.a = conv.de === "COP" ? "USD" : "COP";
        if (!$("conv-monto").value) $("conv-monto").value = "1";
        pintarConversor("monto"); window.scrollTo(0, 0);
      }
      li.addEventListener("click", elegir);
      li.addEventListener("keydown", function (ev) { if (ev.key === "Enter") elegir(); });
      ul.append(li);
    });
  }
  function abrirTasas() {
    pintarConversor("monto"); pintarListaTasas();
    cargarTasas().then(function (t) {
      conv.tasas = t ? t.rates : null; conv.fecha = t ? t.fecha : "";
      pintarFechaTasas(t); pintarConversor("monto"); pintarListaTasas();
    });
  }
  $("tasas-actualizar").addEventListener("click", function () {
    var b = $("tasas-actualizar"); b.disabled = true; b.textContent = "Actualizando…";
    refrescarTasas(true).then(function (t) { toast(t ? "✓ Tasas revisadas" : "No pude actualizar las tasas"); }).finally(function () { b.disabled = false; b.textContent = "🔄 Actualizar ahora"; });
  });
  $("conv-monto").addEventListener("input", function () { pintarConversor("monto"); });
  $("conv-resultado").addEventListener("input", function () { pintarConversor("resultado"); });
  $("conv-de").addEventListener("click", function () { abrirHojaMoneda(conv.de, function (c) { conv.de = c; pintarConversor("monto"); }); });
  $("conv-a").addEventListener("click", function () { abrirHojaMoneda(conv.a, function (c) { conv.a = c; pintarConversor("monto"); }); });
  $("conv-cambiar").addEventListener("click", function () {
    var t = conv.de; conv.de = conv.a; conv.a = t;
    $("conv-monto").value = $("conv-resultado").value; pintarConversor("monto");
  });
  $("tasas-buscar").addEventListener("input", pintarListaTasas);
  $("reg-moneda").addEventListener("click", elegirMoneda);
  function cambiarMoneda(codigo) {
    reg.moneda = codigo;
    reg.tasaAuto = null;
    if (codigo === monedaBase()) { reg.tasa = null; reg.tasaEditada = false; return pintarRegistro(); }
    if (!reg.tasaEditada) reg.tasa = null;
    pintarRegistro();
    cargarTasas().then(function (t) {
      if (!reg || reg.moneda !== codigo) return;
      reg.tasaAuto = t ? tasaABase(codigo, t.rates) : null;
      reg.tasaFecha = t ? t.fecha : "";
      if (!reg.tasaEditada && reg.tasaAuto) reg.tasa = reg.tasaAuto;
      pintarRegistro();
    });
  }
  // Convertir en los dos sentidos: se puede escribir el valor en la moneda de afuera, los pesos o la tasa, y lo demás se calcula solo.
  function leerDecimalCO(t) {
    var s = String(t || "").replace(/[^\d.,]/g, "");
    if (!s) return NaN;
    s = s.replace(/\./g, "").replace(",", ".");   // el punto es de miles y la coma de decimales (los campos los ponen solos)
    var n = Number(s);
    return isFinite(n) ? n : NaN;
  }
  $("reg-orig").addEventListener("input", function (e) {
    var v = leerDecimalCO(e.target.value);
    reg.expr = v > 0 ? textoMonto(v) : "";
    pintarRegistro();
  });
  $("reg-cop").addEventListener("input", function (e) {
    var cop = leerDecimalCO(e.target.value);
    reg.copManual = null;
    if (cop > 0) {
      var usd = A.evaluar(reg.expr);
      if (reg.tasa > 0) reg.expr = textoMonto(Math.round((cop / reg.tasa) * 100) / 100);
      else if (usd > 0) { reg.tasa = cop / usd; reg.tasaEditada = true; }
      if (reg.tasa > 0) { reg.copManual = cop; reg.copExpr = reg.expr; reg.copTasa = reg.tasa; }
    }
    pintarRegistro();
  });
  $("reg-tasa-auto").addEventListener("click", function () {
    if (!reg.tasaAuto) return;
    reg.tasa = reg.tasaAuto; reg.tasaEditada = false; pintarRegistro();
  });
  // Pesos que valen los dólares (o la moneda que sea): si la persona escribió los pesos, se respetan tal cual.
  function pesosDelRegistro(valor) {
    return reg.copManual > 0 && reg.copExpr === reg.expr && reg.copTasa === reg.tasa ? reg.copManual : aBase(valor, reg.tasa);
  }
  $("reg-tasa").addEventListener("input", function (e) {
    var v = Mon.leerTasa(e.target.value);
    reg.tasa = isNaN(v) ? null : v;
    reg.tasaEditada = true;
    pintarRegistro();
  });
  function pintarRegistro() {
    $("reg-titulo").textContent = (reg.editar ? "Editar " : "Nuevo ") + (reg.tipo === "ingreso" ? "ingreso" : "gasto") + ($("reg-bloque-recurrente").hidden ? "" : " recurrente");
    document.querySelectorAll("#reg-tipo button").forEach(function (b) { b.setAttribute("aria-checked", String(b.dataset.tipo === reg.tipo)); });
    $("pantalla-registro").classList.toggle("es-ingreso", reg.tipo === "ingreso");
    $("reg-monto-texto").textContent = formatearExpr(reg.expr);
    var v = A.evaluar(reg.expr), ext = reg.moneda !== monedaBase(), mi = Mon.info(reg.moneda), mb = Mon.info(monedaBase());
    $("reg-resultado").textContent = /[+\-×÷−]/.test(reg.expr.replace(/^-/, "")) ? (isNaN(v) ? "…" : "= " + (ext ? Mon.formatoMonto(v, reg.moneda) : pesos.format(v))) : "";
    $("reg-moneda-bandera").textContent = mi.bandera; $("reg-moneda-codigo").textContent = mi.codigo;
    $("reg-monto").querySelector("span").textContent = ext ? mi.codigo : monedaBase() === "COP" ? "$" : monedaBase();
    $("reg-moneda").classList.toggle("activo", ext);
    $("reg-bloque-moneda").hidden = !ext;
    if (ext) {
      var copCalc = v > 0 && reg.tasa > 0 ? pesosDelRegistro(v) : null;
      $("reg-conversion").textContent = copCalc != null ? Mon.formatoMonto(v, reg.moneda) + " = " + pesos.format(copCalc) + " " + mb.codigo : "Escribe cuánto es en " + mi.nombre.toLowerCase() + " o en " + mb.nombre.toLowerCase() + ": el otro valor se calcula solo.";
      $("reg-orig-etiqueta").textContent = "Valor en " + mi.nombre.toLowerCase() + " (" + mi.codigo + ")";
      if (document.activeElement !== $("reg-orig")) $("reg-orig").value = v > 0 ? formatearExpr(/[+\-×÷−]/.test(reg.expr.replace(/^-/, "")) ? textoMonto(v) : reg.expr) : "";
      if (document.activeElement !== $("reg-cop")) $("reg-cop").value = copCalc != null ? numeroCO.format(copCalc) : "";
      $("reg-tasa-auto").hidden = !(reg.tasaAuto && reg.tasa && Math.abs(reg.tasa - reg.tasaAuto) > 1e-9);
      $("reg-tasa-etiqueta").textContent = "Tasa: 1 " + reg.moneda + " = ? " + mb.codigo;
      $("reg-cop-etiqueta").textContent = "Equivale en " + mb.nombre.toLowerCase() + " (" + mb.codigo + ")";
      if (document.activeElement !== $("reg-tasa")) $("reg-tasa").value = reg.tasa ? Mon.formatoTasa(reg.tasa) : "";
      $("reg-tasa-nota").textContent = reg.tasa && reg.tasaAuto && Math.abs(reg.tasa - reg.tasaAuto) < 1e-9 ? "Tasa del día" + (reg.tasaFecha ? " · " + reg.tasaFecha.slice(5, 16) : "")
        : reg.tasaAuto ? "Tasa del día: " + Mon.formatoTasa(reg.tasaAuto) + " (la cambiaste)"
        : reg.tasa ? "Tasa escrita por ti" : "No pude consultar la tasa del día: escríbela a mano.";
    }
    $("reg-desc").placeholder = reg.tipo === "ingreso" ? "¿De dónde proviene?" : "¿En qué gastaste?";
    var c = reg.categoriaId != null ? categoria(reg.categoriaId) : null;
    if (c && c.tipo !== reg.tipo) { reg.categoriaId = null; c = null; }
    pintarIcono($("reg-cat-icono"), c || { icono: "otro", color: "#64748b" });
    $("reg-bloque-viajes").hidden = !A.esGanancia(c);
    $("reg-cat-nombre").textContent = c ? c.nombre : "Seleccionar categoría";
    var tags = $("reg-etiquetas");
    tags.replaceChildren();
    reg.etiquetas.forEach(function (t) {
      var b = el("button", "etiqueta-chip", "#" + t + " ✕"); b.type = "button"; b.setAttribute("aria-label", "Quitar #" + t);
      b.addEventListener("click", function () { reg.etiquetas = reg.etiquetas.filter(function (x) { return x !== t; }); pintarRegistro(); });
      tags.append(b);
    });
    var sug = $("reg-sugerencias");
    sug.replaceChildren();
    var escrito = limpiarEtiqueta($("reg-etiqueta").value);
    etiquetasUsadas().filter(function (t) { return reg.etiquetas.indexOf(t) < 0 && (!escrito || t.indexOf(escrito) === 0); }).slice(0, 8).forEach(function (t) {
      var b = el("button", "etiqueta-chip sugerida", "#" + t); b.type = "button";
      b.addEventListener("click", function () { reg.etiquetas.push(t); $("reg-etiqueta").value = ""; pintarRegistro(); });
      sug.append(b);
    });
    $("reg-btn-estado").classList.toggle("activo", !$("reg-bloque-estado").hidden);
    $("reg-btn-nota").classList.toggle("activo", !$("reg-bloque-nota").hidden);
    $("reg-btn-recurrente").classList.toggle("activo", !$("reg-bloque-recurrente").hidden);
  }
  document.querySelectorAll("#reg-tipo button").forEach(function (b) { b.addEventListener("click", function () { reg.tipo = b.dataset.tipo; pintarRegistro(); }); });
  $("reg-monto").addEventListener("click", function () { $("teclado").hidden = false; });
  document.querySelectorAll("#teclado button, #reg-borrar-digito").forEach(function (b) {
    b.addEventListener("click", function () {
      var t = b.dataset.tecla, e = reg.expr;
      if (t === "borrar") e = e.slice(0, -1);
      else if ("+−×÷".indexOf(t) >= 0) { if (!e) return; e = /[+−×÷]$/.test(e) ? e.slice(0, -1) + t : e + t; }
      else if (t === ",") {
        var seg = e.match(/[\d,]*$/)[0];
        if (seg.indexOf(",") >= 0) return;
        e += seg ? "," : "0,";
      }
      else if (t === "000") { if (!e || /[+−×÷]$/.test(e) || /,$/.test(e)) return; e += "000"; }
      else {
        var ult = e.match(/[\d,]*$/)[0];
        if (ult.indexOf(",") >= 0 && ult.split(",")[1].length >= 2) return; // máximo 2 decimales
        e = (/(^|[+−×÷])0$/.test(e) ? e.slice(0, -1) : e) + t;
      }
      if (e.replace(/\D/g, "").length > 15) return;
      reg.expr = e;
      pintarRegistro();
    });
  });
  // Teclado físico (computador) para el valor.
  $("pantalla-registro").addEventListener("keydown", function (e) {
    if (e.target.matches("input, textarea, select")) return;
    var mapa = { "*": "×", "/": "÷", "-": "−", "+": "+", Backspace: "borrar", ",": ",", ".": "," };
    var t = /^\d$/.test(e.key) ? e.key : mapa[e.key];
    var b = t && document.querySelector('[data-tecla="' + t + '"]');
    if (b) { e.preventDefault(); b.click(); }
  });
  $("reg-desc").addEventListener("input", function () {
    if (!reg || reg.editar || (reg.categoriaId != null && !reg.catAuto)) return;
    var id = NovaConsejos.sugerirCategoria($("reg-desc").value, reg.tipo, datos.movimientos);
    if (id != null && categoria(id)) { reg.categoriaId = id; reg.catAuto = true; pintarRegistro(); }
    else if (reg.catAuto) { reg.categoriaId = null; reg.catAuto = false; pintarRegistro(); }
  });
  ["reg-desc", "reg-etiqueta", "reg-nota"].forEach(function (id) { $(id).addEventListener("focus", function () { $("teclado").hidden = true; }); });
  $("reg-categoria").addEventListener("click", function () {
    elegirCategoria(reg.tipo, function (c) { if (c) { reg.catAuto = false; reg.categoriaId = c.id; if (c.tipo !== reg.tipo) reg.tipo = c.tipo; } pintarRegistro(); });
  });
  function agregarEtiquetaEscrita() {
    var t = limpiarEtiqueta($("reg-etiqueta").value);
    if (t && reg.etiquetas.indexOf(t) < 0) reg.etiquetas.push(t);
    $("reg-etiqueta").value = "";
    pintarRegistro();
  }
  $("reg-etiqueta").addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " " || e.key === ",") { e.preventDefault(); agregarEtiquetaEscrita(); } });
  $("reg-etiqueta").addEventListener("input", function () { if (/[\s,]$/.test($("reg-etiqueta").value)) agregarEtiquetaEscrita(); else pintarRegistro(); });
  $("reg-etiqueta").addEventListener("blur", function () { if ($("reg-etiqueta").value.trim()) agregarEtiquetaEscrita(); });
  [["reg-btn-estado", "reg-bloque-estado"], ["reg-btn-nota", "reg-bloque-nota"], ["reg-btn-recurrente", "reg-bloque-recurrente"]].forEach(function (p) {
    $(p[0]).addEventListener("click", function () { var b = $(p[1]); b.hidden = !b.hidden; pintarRegistro(); if (!b.hidden) { var f = b.querySelector("select, textarea"); if (f) f.focus(); } });
  });

  // Busca (o crea) la categoría "Otros gastos"/"Otros ingresos" cuando no se eligió ninguna.
  function categoriaPorNombre(nombre, tipo, icono) {
    var c = datos.categorias.find(function (x) { return x.nombre === nombre && x.tipo === tipo; });
    if (c) return Promise.resolve(c);
    return fuente.crear("categorias", { nombre: nombre, tipo: tipo, icono: icono || "otro", grupo: A.grupoDe({ nombre: nombre, tipo: tipo }) })
      .then(function (n) { datos.categorias.push(n); return n; });
  }

  $("form-registro").addEventListener("submit", function (e) {
    e.preventDefault();
    if ($("reg-etiqueta").value.trim()) agregarEtiquetaEscrita();
    var montoOriginal = A.evaluar(reg.expr), ext = reg.moneda !== monedaBase();
    if (!(montoOriginal > 0)) { $("teclado").hidden = false; return mensaje("reg-mensaje", "Escribe el valor con el teclado de números.", true); }
    if (ext && !(reg.tasa > 0)) return mensaje("reg-mensaje", "Escribe la tasa de cambio: cuánto vale 1 " + reg.moneda + " en " + monedaBase() + ".", true);
    var monto = ext ? pesosDelRegistro(montoOriginal) : montoOriginal;
    if (!(monto > 0)) return mensaje("reg-mensaje", "El valor en " + monedaBase() + " quedó en cero. Revisa la tasa.", true);
    var fechaTxt = $("reg-fecha").value;
    if (!fechaTxt) return mensaje("reg-mensaje", "Elige la fecha.", true);
    var recurrente = !reg.editar && !$("reg-bloque-recurrente").hidden;
    var hoy = A.claveDia(new Date());
    var fecha = fechaTxt === hoy ? new Date() : new Date(fechaTxt + "T12:00:00");
    if (reg.editar && fechaTxt === A.claveDia(reg.editar.fecha)) fecha = new Date(reg.editar.fecha); // conserva la hora original
    var btn = $("reg-guardar");
    btn.disabled = true;
    var conCategoria = reg.categoriaId != null ? Promise.resolve(categoria(reg.categoriaId))
      : categoriaPorNombre(reg.tipo === "ingreso" ? "Otros ingresos" : "Otros gastos", reg.tipo);
    var editar = reg.editar, otro = $("reg-otro").checked, docId = reg.documentoId;
    conCategoria.then(function (c) {
      var fila = {
        cuenta_id: Number($("reg-cuenta").value) || datos.cuentas[0].id, categoria_id: c.id, tipo: reg.tipo,
        descripcion: $("reg-desc").value.trim() || c.nombre, monto: monto, fecha: fecha.toISOString(),
        etiquetas: reg.etiquetas, estado: $("reg-estado").value, nota: $("reg-nota").value.trim() || null,
        moneda: reg.moneda, monto_original: ext ? montoOriginal : null, tasa: ext ? reg.tasa : null,
        viajes: A.esGanancia(c) && parseInt($("reg-viajes").value, 10) > 0 ? Math.min(1000, parseInt($("reg-viajes").value, 10)) : null
      };
      if (editar) return fuente.actualizar("movimientos", editar.id, fila).then(function (n) { Object.assign(editar, n); return { m: editar, c: c }; });
      var prog = Promise.resolve(null);
      if (recurrente) {
        var futuro = fechaTxt > hoy;
        prog = fuente.crear("programados", {
          cuenta_id: fila.cuenta_id, categoria_id: c.id, tipo: fila.tipo, monto: monto, descripcion: fila.descripcion, etiquetas: fila.etiquetas,
          frecuencia: $("reg-frecuencia").value, proxima: futuro ? fechaTxt : A.siguienteFecha(fechaTxt, $("reg-frecuencia").value), activo: true
        }).then(function (p) { datos.programados.push(p); return { p: p, futuro: futuro }; });
      }
      return prog.then(function (pr) {
        if (pr && pr.futuro) return { m: null, c: c, programado: pr.p };
        if (pr) fila.programado_id = pr.p.id;
        return ubicacionActual().then(function (lugar) {
          if (lugar) { fila.lat = lugar.lat; fila.lng = lugar.lng; precargarMapa(lugar.lat, lugar.lng); }
          return fuente.crear("movimientos", fila);
        }).then(function (m) { datos.movimientos.push(m); return { m: m, c: c, programado: pr && pr.p }; });
      });
    }).then(function (r) {
      ordenarMovimientos();
      if (!editar && r.m && r.m.tipo === "gasto") sumarAlcancia(num(r.m.monto));
      if (docId) renovarDocumentoListo(docId);
      var etiquetaDesc = r.m ? r.m.descripcion : r.programado.descripcion;
      toast(editar ? "¡Cambios guardados!" : "¡Guardado!", etiquetaDesc + (ext ? " · " + Mon.formatoMonto(montoOriginal, reg.moneda) : "") + (r.m && r.m.viajes ? " · " + r.m.viajes + (r.m.viajes === 1 ? " viaje" : " viajes") : "") + (r.programado ? " · 🔁 " + A.FRECUENCIAS[r.programado.frecuencia].toLowerCase() : ""), pesos.format(monto));
      pintar();
      if (!editar && r.m && r.m.tipo === "ingreso") proponerApartar(r.m);
      if (!editar && r.m && r.m.tipo === "gasto") {
        var hubo = alertaLimites(r.m.categoria_id), raro = NovaConsejos.gastoInusual(r.m, datos.movimientos);
        if (raro) setTimeout(function () { toast("Gasto fuera de lo normal", r.m.descripcion, Math.round(raro.veces * 10) / 10 + "× lo habitual"); }, hubo ? 7000 : 3400);
      }
      if (otro && !editar) {
        reg.expr = ""; reg.etiquetas = []; $("reg-desc").value = ""; $("reg-nota").value = ""; $("teclado").hidden = false;
        mensaje("reg-mensaje", ""); pintarRegistro();
      } else cerrarCapa();
    }).catch(function (err) { mensaje("reg-mensaje", "No se pudo guardar: " + err.message, true); })
      .finally(function () { btn.disabled = false; });
  });
  $("reg-borrar").addEventListener("click", function () {
    var m = reg && reg.editar;
    if (!m || !confirm("¿Borrar «" + m.descripcion + "» de " + pesos.format(num(m.monto)) + "?")) return;
    var guardado = aPapelera("movimientos", m);
    fuente.borrar("movimientos", m.id).then(function () {
      datos.movimientos = datos.movimientos.filter(function (x) { return x.id !== m.id; });
      toast("Movimiento borrado", m.descripcion, pesos.format(num(m.monto)), { texto: "↩ Deshacer", fn: deshacerBorrado(guardado) }); cerrarCapa(); pintar();
    }).catch(function (err) { mensaje("reg-mensaje", err.message, true); });
  });



  // Al guardar un pago con ubicación (con internet) se baja el mapa de ese lugar, para verlo después sin conexión.
  function precargarMapa(lat, lng) {
    if (!enLinea() || (navigator.connection && navigator.connection.saveData) || lat == null || lng == null) return;
    var z = 18, n = Math.pow(2, z), rad = Math.PI / 180;
    var x = Math.floor(((lng + 180) / 360) * n), y = Math.floor(((1 - Math.log(Math.tan(lat * rad) + 1 / Math.cos(lat * rad)) / Math.PI) / 2) * n);
    var esri = "https://server.arcgisonline.com/ArcGIS/rest/services/", urls = [];
    for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) urls.push(esri + "World_Imagery/MapServer/tile/" + z + "/" + (y + dy) + "/" + (x + dx));
    for (var ex = 0; ex <= 1; ex++) for (var ey = 0; ey <= 1; ey++) {
      urls.push(esri + "Reference/World_Transportation/MapServer/tile/" + z + "/" + (y + ey) + "/" + (x + ex));
      urls.push(esri + "Reference/World_Boundaries_and_Places/MapServer/tile/" + z + "/" + (y + ey) + "/" + (x + ex));
    }
    urls.forEach(function (u, i) { setTimeout(function () { var im = new Image(); im.src = u; }, i * 120); });
  }

  // ---------- Detalle de un movimiento ----------
  var detalleId = null;
  function abrirDetalle(m) {
    detalleId = m.id;
    pintarDetalle();
    abrirCapa("pantalla-detalle");
  }
  $("det-borrar").addEventListener("click", function () {
    var m = datos.movimientos.find(function (x) { return x.id === detalleId; });
    if (!m || !confirm("¿Borrar «" + m.descripcion + "» de " + pesos.format(num(m.monto)) + "?")) return;
    var guardado = aPapelera("movimientos", m);
    fuente.borrar("movimientos", m.id).then(function () {
      datos.movimientos = datos.movimientos.filter(function (x) { return x.id !== m.id; });
      toast("Movimiento borrado", m.descripcion, pesos.format(num(m.monto)), { texto: "↩ Deshacer", fn: deshacerBorrado(guardado) }); cerrarCapa(); pintar();
    }).catch(function (err) { toast("No se pudo borrar: " + err.message); });
  });
  $("det-editar").addEventListener("click", function () {
    var m = datos.movimientos.find(function (x) { return x.id === detalleId; });
    if (m) cerrarYLuego(function () { abrirRegistro({ movimiento: m }); });
  });
  function direccionDe(lat, lng) {
    var clave = Number(lat).toFixed(4) + "," + Number(lng).toFixed(4), cache = leerLocal("nova-direcciones", {});
    if (cache[clave]) return Promise.resolve(cache[clave]);
    return fetch("https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&accept-language=es&lat=" + Number(lat) + "&lon=" + Number(lng))
      .then(function (r) { if (!r.ok) throw new Error("direccion"); return r.json(); })
      .then(function (d) {
        var a = d.address || {};
        var calle = (a.road || a.pedestrian || a.footway || "") + (a.house_number ? " #" + a.house_number : "");
        var texto = [calle, a.suburb || a.neighbourhood || a.quarter, a.city || a.town || a.village].filter(Boolean).join(", ") || String(d.display_name || "").split(",").slice(0, 3).join(",");
        if (!texto) throw new Error("direccion");
        var claves = Object.keys(cache);
        if (claves.length > 150) delete cache[claves[0]];
        cache[clave] = texto; guardarLocal("nova-direcciones", cache);
        return texto;
      });
  }
  // Mapa del detalle: satélite (Esri) por defecto, con nombres de calles, o mapa de calles (OpenStreetMap).
  var leafletListo = null, mapaDetalle = null;
  function cargarLeaflet() {
    if (window.L) return Promise.resolve();
    if (!leafletListo) {
      leafletListo = new Promise(function (ok, mal) {
        var css = document.createElement("link"); css.rel = "stylesheet"; css.href = "vendor/leaflet/leaflet.css"; document.head.append(css);
        var js = document.createElement("script"); js.src = "vendor/leaflet/leaflet.js"; js.onload = ok; js.onerror = function () { leafletListo = null; mal(new Error("mapa")); };
        document.head.append(js);
      });
    }
    return leafletListo;
  }
  function pintarMapaDetalle(c, m, cerca, botones) {
    var lat = Number(m.lat), lng = Number(m.lng);
    var modo = leerLocal("nova-mapa", "google");
    if (modo === "google" && navigator.onLine === false) modo = "sat"; // Google necesita internet; el satélite guardado en el celular sigue funcionando
    var mapa = null;
    function marcar() {
      Object.keys(botones).forEach(function (k) { botones[k].setAttribute("aria-pressed", String(k === modo)); });
    }
    function mostrarGoogle() {
      if (!c.google.src) c.google.src = "https://maps.google.com/maps?q=" + lat + "," + lng + "&t=h&z=18&hl=es&output=embed"; // t=h: satélite con calles y nombres
      c.google.hidden = false; c.leaflet.hidden = true;
    }
    function elegir(nuevo) {
      modo = nuevo; guardarLocal("nova-mapa", nuevo); marcar();
      if (nuevo === "google") { mostrarGoogle(); return; }
      c.google.hidden = true; c.leaflet.hidden = false;
      armarLeaflet();
    }
    botones.google.onclick = function () { elegir("google"); };
    botones.sat.onclick = function () { elegir("sat"); };
    botones.mapa.onclick = function () { elegir("mapa"); };
    marcar();
    if (modo === "google") mostrarGoogle(); else armarLeaflet();

    function armarLeaflet() {
      cargarLeaflet().then(function () {
        if (!c.caja.isConnected) return;
        var L = window.L;
        if (!mapa) {
          if (mapaDetalle) { mapaDetalle.remove(); mapaDetalle = null; }
          mapa = L.map(c.leaflet, { center: [lat, lng], zoom: 18, maxZoom: 20, zoomControl: true, scrollWheelZoom: false });
          mapa.attributionControl.setPrefix(false);
          var esri = "https://server.arcgisonline.com/ArcGIS/rest/services/";
          mapa._satelite = L.layerGroup([
            L.tileLayer(esri + "World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 20, maxNativeZoom: 19, attribution: "Imágenes © Esri, Maxar, Earthstar Geographics" }),
            L.tileLayer(esri + "Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}", { maxZoom: 20, maxNativeZoom: 19 }),
            L.tileLayer(esri + "Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", { maxZoom: 20, maxNativeZoom: 19 })
          ]);
          mapa._calles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 20, maxNativeZoom: 19, className: "mapa-oscuro", attribution: "© OpenStreetMap" });
          // Otros pagos del mismo lugar: puntos verdes; este pago: el pin rojo, justo donde se gastó.
          cerca.forEach(function (o) { L.circleMarker([Number(o.lat), Number(o.lng)], { radius: 6, color: "#fff", weight: 2, fillColor: "#2ee06f", fillOpacity: 1 }).addTo(mapa); });
          L.marker([lat, lng], { icon: L.divIcon({ className: "", html: '<span class="pin-gasto"></span>', iconSize: [30, 30], iconAnchor: [15, 36] }), keyboard: false }).addTo(mapa);
          mapaDetalle = mapa;
        }
        if (modo === "mapa") { mapa.removeLayer(mapa._satelite); mapa._calles.addTo(mapa); } else { mapa.removeLayer(mapa._calles); mapa._satelite.addTo(mapa); }
        // la pantalla se abre después de armar el mapa: se recalcula el tamaño para que quede centrado
        [120, 450].forEach(function (t) { setTimeout(function () { if (mapaDetalle === mapa) { mapa.invalidateSize(); mapa.setView([lat, lng], 18); } }, t); });
      }).catch(function () {
        c.leaflet.classList.add("sin-mapa"); c.leaflet.textContent = "No se pudo cargar el mapa. Revisa tu conexión.";
      });
    }
  }
  function filaDetalle(titulo, valor) {
    var f = el("div", "det-fila"), v = el("span");
    if (valor && valor.nodeType) v.append(valor); else v.textContent = valor;
    f.append(el("span", null, titulo), v);
    return f;
  }
  // ---------- Gastos compartidos ----------
  var grupoId = null;
  function grupoAbierto() { return datos.grupos.find(function (g) { return g.id === grupoId; }); }
  function gastosDelGrupo(g) { return datos.gastos_grupo.filter(function (x) { return x.grupo_id === g.id; }); }
  function pintarGrupos() {
    var ul = $("lista-grupos");
    ul.replaceChildren();
    if (!datos.grupos.length) ul.append(el("li", "vacio", "Sin grupos. Para un viaje o una cuenta entre amigos, toca «+ Nuevo grupo»."));
    datos.grupos.forEach(function (g) {
      var r = A.saldosGrupo(g.miembros, gastosDelGrupo(g)), yo = r.saldos.Yo || 0;
      var li = el("li", "mov"), txt = el("div", "mov-texto");
      txt.append(el("strong", null, g.nombre), el("small", null, g.miembros.join(", ")));
      var est = el("span", "mov-monto" + (yo >= 0 ? " positivo" : ""), yo === 0 ? "A mano" : (yo > 0 ? "Te deben " : "Debes ") + pesos.format(Math.abs(yo)));
      li.append(el("span", "mov-icono", "👥"), txt, est);
      li.tabIndex = 0;
      li.addEventListener("click", function () { abrirGrupo(g); });
      ul.append(li);
    });
    if (grupoId && pilaCapas.indexOf("pantalla-grupo") >= 0) pintarGrupo();
  }
  function abrirGrupo(g) { grupoId = g.id; $("gg-fecha").value = A.claveDia(new Date()); $("gg-desc").value = ""; $("gg-monto").value = ""; mensaje("gg-mensaje", ""); pintarGrupo(); abrirCapa("pantalla-grupo"); }
  function pintarGrupo() {
    var g = grupoAbierto(); if (!g) return;
    $("grupo-titulo").textContent = g.nombre;
    var gastos = gastosDelGrupo(g).sort(function (a, b) { return String(b.fecha).localeCompare(String(a.fecha)) || b.id - a.id; });
    var r = A.saldosGrupo(g.miembros, gastos);
    var total = gastos.filter(function (x) { return x.tipo !== "pago"; }).reduce(function (s, x) { return s + num(x.monto); }, 0);
    var caja = $("grupo-balance"); caja.replaceChildren();
    caja.append(el("span", "etiqueta", "Total gastado en el grupo"), el("strong", "saldo-valor", pesos.format(total)));
    var cuentas = el("ul", "lista-simple");
    g.miembros.forEach(function (n) {
      var v = r.saldos[n] || 0;
      cuentas.append(el("li", null, n + ": " + (v === 0 ? "a mano" : v > 0 ? "le deben " + pesos.format(v) : "debe " + pesos.format(-v))));
    });
    caja.append(cuentas);
    if (r.transferencias.length) {
      caja.append(el("strong", null, "Para quedar a mano"));
      r.transferencias.forEach(function (t) {
        var fila = el("div", "meta-abono");
        fila.append(el("span", null, t.de + " le paga " + pesos.format(t.monto) + " a " + t.a));
        var b = el("button", "mini", "✓ Ya pagó"); b.type = "button";
        b.addEventListener("click", function () {
          b.disabled = true;
          fuente.crear("gastos_grupo", { grupo_id: g.id, tipo: "pago", descripcion: "Pago de " + t.de + " a " + t.a, monto: t.monto, pagador: t.de, repartido: [t.a], fecha: A.claveDia(new Date()) })
            .then(function (n) { datos.gastos_grupo.push(n); toast("¡Pago anotado!", t.de + " → " + t.a, pesos.format(t.monto)); pintar(); })
            .catch(function (err) { b.disabled = false; mensaje("gg-mensaje", "No se pudo anotar: " + err.message, true); });
        });
        fila.append(b); caja.append(fila);
      });
    } else if (gastos.length) caja.append(el("span", "nota", "✅ Todos están a mano."));
    pintarMetaGrupo(g);
    // formulario: quién pagó y entre quiénes
    var sel = $("gg-pagador"), previo = sel.value;
    sel.replaceChildren();
    g.miembros.forEach(function (n) { var o = el("option", null, n); o.value = n; sel.append(o); });
    sel.value = g.miembros.indexOf(previo) >= 0 ? previo : "Yo";
    var rep = $("gg-reparto"), marcados = {};
    Array.prototype.forEach.call(rep.querySelectorAll("input"), function (i) { marcados[i.value] = i.checked; });
    rep.replaceChildren();
    g.miembros.forEach(function (n) {
      var l = el("label", "chip-opcion"), i = el("input"); i.type = "checkbox"; i.value = n; i.checked = marcados[n] !== false;
      l.append(i, document.createTextNode(" " + n)); rep.append(l);
    });
    var ul = $("lista-gastos-grupo"); ul.replaceChildren();
    if (!gastos.length) ul.append(el("li", "vacio", "Aún no hay gastos en este grupo."));
    gastos.forEach(function (x) {
      var li = el("li", "mov"), txt = el("div", "mov-texto");
      var quien = x.tipo === "pago" ? x.pagador + " le pagó a " + (x.repartido[0] || "") : "Pagó " + x.pagador + " · entre " + ((x.repartido && x.repartido.length) || g.miembros.length);
      txt.append(el("strong", null, (x.tipo === "pago" ? "💸 " : "") + x.descripcion), el("small", null, fechaCorta.format(parteFechaLocal(x.fecha)) + " · " + quien));
      li.append(txt, el("span", "mov-monto", pesos.format(num(x.monto))));
      li.tabIndex = 0;
      li.addEventListener("click", function () {
        abrirEditor({
          titulo: "Editar " + (x.tipo === "pago" ? "pago" : "gasto"),
          campos: [{ clave: "descripcion", etiqueta: "¿Qué fue?", tipo: "texto", valor: x.descripcion, requerido: true, max: 100 }, { clave: "monto", etiqueta: "Valor", tipo: "plata", valor: num(x.monto) },
            { clave: "pagador", etiqueta: "¿Quién pagó?", tipo: "select", valor: x.pagador, opciones: g.miembros.map(function (n) { return [n, n]; }) }, { clave: "fecha", etiqueta: "Fecha", tipo: "fecha", valor: x.fecha }],
          guardar: function (v) { return fuente.actualizar("gastos_grupo", x.id, { descripcion: v.descripcion, monto: v.monto, pagador: v.pagador, fecha: v.fecha || x.fecha }).then(function (n) { Object.assign(x, n); }); },
          borrar: function () { return fuente.borrar("gastos_grupo", x.id).then(function () { datos.gastos_grupo = datos.gastos_grupo.filter(function (y) { return y.id !== x.id; }); }); },
          textoBorrar: "🗑 Borrar este movimiento", confirmar: "¿Borrar «" + x.descripcion + "» del grupo?", avisoBorrado: "Borrado del grupo"
        });
      });
      ul.append(li);
    });
  }
  function miembrosDeTexto(txt) {
    var vistos = {}, lista = ["Yo"];
    String(txt).split(",").forEach(function (n) { n = n.trim().replace(/\s+/g, " ").slice(0, 40); var k = n.toLowerCase(); if (n && !vistos[k] && k !== "yo" && k !== "tú" && k !== "tu") { vistos[k] = true; lista.push(n); } });
    return lista;
  }
  $("btn-nuevo-grupo").addEventListener("click", function () { $("form-grupo").reset(); mensaje("grupo-mensaje", ""); abrirCapa("pantalla-grupo-nuevo"); });
  $("form-grupo").addEventListener("submit", function (e) {
    e.preventDefault();
    var nombre = $("grupo-nombre").value.trim(), miembros = miembrosDeTexto($("grupo-miembros").value);
    if (!nombre) return mensaje("grupo-mensaje", "Ponle un nombre al grupo.", true);
    if (miembros.length < 2) return mensaje("grupo-mensaje", "Escribe al menos una persona además de ti.", true);
    var b = e.target.querySelector("button[type=submit]"); b.disabled = true;
    fuente.crear("grupos", { nombre: nombre, miembros: miembros }).then(function (g) {
      datos.grupos.push(g); cerrarCapa(); pintar(); toast("¡Grupo creado!", g.nombre);
      setTimeout(function () { abrirGrupo(g); }, 120);
    }).catch(function (err) { mensaje("grupo-mensaje", "No se pudo crear: " + err.message, true); }).finally(function () { b.disabled = false; });
  });
  $("form-gasto-grupo").addEventListener("submit", function (e) {
    e.preventDefault();
    var g = grupoAbierto(); if (!g) return;
    var monto = leerValor($("gg-monto").value), desc = $("gg-desc").value.trim();
    var entre = Array.prototype.filter.call($("gg-reparto").querySelectorAll("input"), function (i) { return i.checked; }).map(function (i) { return i.value; });
    if (!(monto > 0)) return mensaje("gg-mensaje", "No entendí el valor. Escribe por ejemplo 90 mil.", true);
    if (!entre.length) return mensaje("gg-mensaje", "Marca al menos una persona.", true);
    var b = e.target.querySelector("button[type=submit]"); b.disabled = true;
    fuente.crear("gastos_grupo", { grupo_id: g.id, tipo: "gasto", descripcion: desc, monto: monto, pagador: $("gg-pagador").value, repartido: entre, fecha: $("gg-fecha").value || A.claveDia(new Date()) }).then(function (n) {
      datos.gastos_grupo.push(n); $("gg-desc").value = ""; $("gg-monto").value = ""; mensaje("gg-mensaje", "");
      toast("¡Gasto agregado!", desc, pesos.format(monto)); pintar();
    }).catch(function (err) { mensaje("gg-mensaje", "No se pudo guardar: " + err.message, true); }).finally(function () { b.disabled = false; });
  });
  $("grupo-compartir").addEventListener("click", function () {
    var g = grupoAbierto(); if (!g) return;
    var r = A.saldosGrupo(g.miembros, gastosDelGrupo(g)), total = gastosDelGrupo(g).filter(function (x) { return x.tipo !== "pago"; }).reduce(function (s, x) { return s + num(x.monto); }, 0);
    var lineas = ["Cuentas de «" + g.nombre + "» · total " + pesos.format(total)];
    if (r.transferencias.length) r.transferencias.forEach(function (t) { lineas.push("• " + t.de + " le paga " + pesos.format(t.monto) + " a " + (t.a === "Yo" ? "mí" : t.a)); });
    else lineas.push("✅ Todos estamos a mano.");
    lineas.push("— NOVA · OPITA-DIGITAL");
    compartirTexto("Cuentas de " + g.nombre, lineas.join("\n"));
  });
  $("grupo-editar").addEventListener("click", function () {
    var g = grupoAbierto(); if (!g) return;
    abrirEditor({
      titulo: "Editar grupo", ayuda: "Puedes agregar personas. A quien ya tiene gastos no se le puede quitar. «Yo» siempre está.",
      campos: [{ clave: "nombre", etiqueta: "Nombre del grupo", tipo: "texto", valor: g.nombre, requerido: true, max: 60 }, { clave: "miembros", etiqueta: "Personas (separadas por coma)", tipo: "texto", valor: g.miembros.filter(function (n) { return n !== "Yo"; }).join(", "), requerido: true, max: 200 }],
      guardar: function (v) {
        var miembros = miembrosDeTexto(v.miembros), usados = {};
        gastosDelGrupo(g).forEach(function (x) { usados[x.pagador] = true; (x.repartido || []).forEach(function (n) { usados[n] = true; }); });
        var faltan = Object.keys(usados).filter(function (n) { return miembros.indexOf(n) < 0; });
        if (faltan.length) return Promise.reject(new Error("No se puede quitar a " + faltan.join(", ") + " porque tiene gastos."));
        return fuente.actualizar("grupos", g.id, { nombre: v.nombre, miembros: miembros }).then(function (n) { Object.assign(g, n); });
      }
    });
  });
  $("grupo-borrar").addEventListener("click", function () {
    var g = grupoAbierto(); if (!g) return;
    if (!confirm("¿Borrar el grupo «" + g.nombre + "» y todos sus gastos? Esto no se puede deshacer.")) return;
    fuente.borrar("grupos", g.id).then(function () {
      datos.grupos = datos.grupos.filter(function (x) { return x.id !== g.id; });
      datos.gastos_grupo = datos.gastos_grupo.filter(function (x) { return x.grupo_id !== g.id; });
      grupoId = null; cerrarCapa(); pintar(); toast("Grupo borrado");
    }).catch(function (err) { mensaje("gg-mensaje", "No se pudo borrar: " + err.message, true); });
  });

  // ---------- Historial de cambios ----------
  $("btn-historial").addEventListener("click", function () {
    var ul = $("lista-historial"); ul.replaceChildren(); ul.append(el("li", "vacio", "Cargando…"));
    abrirCapa("pantalla-historial");
    if (!fuente || fuente.demo || !fuente.historial) { ul.replaceChildren(el("li", "vacio", "En el modo demostración no se guarda historial. Entra con tu cuenta para verlo.")); return; }
    fuente.historial().then(function (lista) {
      ul.replaceChildren();
      if (!lista.length) return ul.append(el("li", "vacio", "Todavía no hay cambios guardados. Desde ahora, todo lo que crees, edites o borres aparecerá aquí."));
      lista.forEach(function (h) {
        var d = NovaConsejos.describirCambio(h), li = el("li", "consejo"), cuando = new Date(h.creado_en);
        li.append(el("span", "consejo-icono", d.icono));
        var t = el("div"); t.append(el("strong", null, d.texto), el("small", null, (d.detalle ? d.detalle + " · " : "") + fechaCorta.format(cuando) + " " + hora.format(cuando))); li.append(t); ul.append(li);
      });
    }).catch(function (err) { ul.replaceChildren(el("li", "vacio", "No se pudo cargar el historial (" + err.message + "). Revisa tu conexión.")); });
  });


  // ---------- Espacios ----------
  // La plata por propósitos: Principal para el día a día y, aparte, ahorro, viaje, negocio… Cada espacio funciona
  // completo (saldo, presupuesto, límites, programadas, análisis, informes y la IA) solo con lo suyo, y con su moneda.
  // La capa espacios.js filtra los datos; aquí están el selector, crear o editar un espacio y pasar plata entre ellos.
  var Esp = window.NovaEspacios;
  var espacioId = null;   // null es Principal
  function claveEspacio() { return "nova-espacio:" + ((fuente && fuente.email) || ""); }
  function espacioPorId(id) { return id == null ? null : (todosLosDatos().espacios || []).find(function (e) { return e.id === id; }) || null; }
  function espacioActual() { return espacioPorId(espacioId); }
  function monedaBase() { var e = espacioActual(); return (e && e.moneda) || "COP"; }
  function monedaDe(id) { var e = espacioPorId(id); return (e && e.moneda) || "COP"; }
  function nombreDe(id) { var e = espacioPorId(id); return e ? e.nombre : "Principal"; }
  function iconoDe(id) { var e = espacioPorId(id); return Esp.ICONOS[e ? e.icono : "principal"] || Esp.ICONOS.ahorro; }
  function todosLosDatos() { return (fuente && fuente.todo && fuente.todo()) || datos; }
  function dineroEn(v, moneda) {
    if (ocultos) return "$ ••••";
    if (moneda === "COP") return (v < 0 ? "-" : "") + "$ " + miles(Math.round(Math.abs(v)));
    return Mon.formatoMonto(v, moneda);
  }
  function pintarEspacioCabecera() {
    var b = $("btn-espacio");
    if (!b) return;
    var hay = (todosLosDatos().espacios || []).length > 0, ic = iconoDe(espacioId);
    $("esp-ico").textContent = ic.emoji; $("esp-ico").style.background = ic.color;
    $("esp-nombre").textContent = nombreDe(espacioId);
    b.classList.toggle("solo", !hay && espacioId == null);
  }
  // Cambiar de espacio: se vuelven a leer los datos ya filtrados y se pinta todo con la moneda del espacio.
  function cambiarEspacio(id, aviso) {
    espacioId = id == null ? null : id;
    guardarLocal(claveEspacio(), espacioId);
    $("cargando").hidden = false;
    return fuente.cargar().then(function (d) {
      datos = Object.assign(datosVacios(), d);
      ordenarMovimientos();
      monedaVista = monedaBase();
      desfaseInicio = 0; desfaseAnalisis = 0; reiniciarChat();
      pintar();
      if (aviso !== false) toast(iconoDe(espacioId).emoji + " " + nombreDe(espacioId), "Ahora ves lo de este espacio");
    }).catch(function (e) { toast("No se pudo cambiar de espacio", e.message); })
      .then(function () { $("cargando").hidden = true; });
  }
  function abrirEspacios() {
    abrirCapa("hoja-espacios");
    pintarHojaEspacios();
  }
  function pintarHojaEspacios() {
    var cont = $("hoja-espacios-lista"), todo = todosLosDatos(), s = Esp.saldos(todo);
    cont.replaceChildren();
    var lista = [{ id: null, nombre: "Principal", icono: "principal", moneda: "COP" }].concat(todo.espacios || []);
    lista.forEach(function (e) {
      var fila = el("div", "esp-fila" + ((e.id == null ? null : e.id) === espacioId ? " activo" : ""));
      var b = el("button", "esp-elegir"); b.type = "button";
      var ic = Esp.ICONOS[e.icono] || Esp.ICONOS.ahorro, cuad = el("span", "esp-cuadro", ic.emoji);
      cuad.style.background = ic.color;
      var txt = el("span", "esp-texto");
      txt.append(el("strong", null, e.nombre), el("small", null, (e.id == null ? "Día a día" : Mon.info(e.moneda).nombre) + (e.moneda !== "COP" ? " · " + e.moneda : "")));
      b.append(cuad, txt, el("span", "esp-saldo", dineroEn(s[e.id == null ? "principal" : e.id] || 0, e.moneda || "COP")));
      if ((e.id == null ? null : e.id) === espacioId) b.append(el("span", "esp-check", "✓"));
      b.setAttribute("aria-label", "Ir a " + e.nombre);
      b.addEventListener("click", function () { cerrarCapa(); if ((e.id == null ? null : e.id) !== espacioId) setTimeout(function () { cambiarEspacio(e.id); }, 60); });
      fila.append(b);
      if (e.id != null) {
        var ed = el("button", "icono-btn esp-editar"); ed.type = "button"; ed.setAttribute("aria-label", "Editar " + e.nombre);
        ed.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>';
        ed.addEventListener("click", desdeHoja(function () { abrirFormEspacio(e); }));
        fila.append(ed);
      }
      cont.append(fila);
    });
    var sin = !!todo.sinEspacios;
    $("espacios-aviso").hidden = !sin;
    $("espacios-aviso").textContent = sin ? "Los espacios todavía no están activados en tu cuenta. Estarán listos con la próxima actualización de la base de datos." : "";
    $("btn-espacio-nuevo").disabled = sin;
    $("btn-espacio-pasar").disabled = sin || !(todo.espacios || []).length;
  }
  $("btn-espacio").addEventListener("click", abrirEspacios);
  // La hoja de espacios se cierra antes de abrir otra pantalla encima (si no, queda tapándola).
  function desdeHoja(fn) { return function () { var a = arguments; cerrarCapa(); setTimeout(function () { fn.apply(null, a); }, 80); }; }
  $("btn-espacio-nuevo").addEventListener("click", desdeHoja(function () { abrirFormEspacio(null); }));
  $("btn-espacio-pasar").addEventListener("click", desdeHoja(function () { abrirPasar(); }));

  // Crear o editar un espacio
  var formEsp = { editar: null, icono: "ahorro", moneda: "COP" };
  function abrirFormEspacio(e) {
    formEsp = { editar: e || null, icono: e ? e.icono : "ahorro", moneda: e ? e.moneda : monedaBase() };
    $("espacio-titulo").textContent = e ? "Editar espacio" : "Nuevo espacio";
    $("espacio-guardar").textContent = e ? "Guardar cambios" : "Crear espacio";
    $("espacio-nombre").value = e ? e.nombre : "";
    $("espacio-saldo").value = "";
    $("espacio-bloque-saldo").hidden = !!e;
    $("espacio-borrar").hidden = !e;
    mensaje("espacio-mensaje", "");
    pintarFormEspacio();
    abrirCapa("pantalla-espacio");
  }
  function pintarFormEspacio() {
    var cont = $("espacio-iconos");
    cont.replaceChildren();
    Object.keys(Esp.ICONOS).filter(function (k) { return k !== "principal"; }).forEach(function (k) {
      var ic = Esp.ICONOS[k], b = el("button", "esp-icono-op", ic.emoji); b.type = "button";
      b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(formEsp.icono === k)); b.setAttribute("aria-label", ic.nombre);
      b.style.setProperty("--c", ic.color);
      b.addEventListener("click", function () {
        var nombre = $("espacio-nombre"), anterior = Esp.ICONOS[formEsp.icono] && Esp.ICONOS[formEsp.icono].nombre;
        formEsp.icono = k;
        if (!nombre.value.trim() || nombre.value === anterior) nombre.value = ic.nombre;   // sugiere el nombre del ícono
        pintarFormEspacio();
      });
      cont.append(b);
    });
    var mi = Mon.info(formEsp.moneda);
    $("espacio-moneda-texto").textContent = mi.bandera + " " + mi.nombre + " (" + mi.codigo + ")";
  }
  $("espacio-moneda").addEventListener("click", function () {
    if (formEsp.editar && espacioTieneMovimientos(formEsp.editar.id)) return mensaje("espacio-mensaje", "Este espacio ya tiene movimientos: su moneda no se puede cambiar.", true);
    $("hoja-moneda-titulo").textContent = "¿En qué moneda va este espacio?";
    abrirHojaMoneda(formEsp.moneda, function (c) { formEsp.moneda = c; pintarFormEspacio(); });
  });
  function espacioTieneMovimientos(id) { return (todosLosDatos().movimientos || []).some(function (m) { return m.espacio_id === id; }); }
  $("form-espacio").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var nombre = $("espacio-nombre").value.trim(), btn = $("espacio-guardar");
    if (!nombre) return mensaje("espacio-mensaje", "Ponle un nombre al espacio.", true);
    btn.disabled = true;
    var p;
    if (formEsp.editar) {
      p = fuente.actualizar("espacios", formEsp.editar.id, { nombre: nombre, icono: formEsp.icono, moneda: formEsp.moneda }).then(function () {
        cerrarCapa(); return cambiarEspacio(espacioId, false);
      }).then(function () { toast("Espacio guardado", nombre); });
    } else {
      var saldo = leerDecimalCO($("espacio-saldo").value);
      p = fuente.crear("espacios", { nombre: nombre, icono: formEsp.icono, moneda: formEsp.moneda, orden: (todosLosDatos().espacios || []).length }).then(function (e) {
        // Cada espacio arranca con su propia cuenta, donde queda lo que ya tiene.
        return fuente.crear("cuentas", { nombre: nombre, tipo: formEsp.icono === "ahorro" ? "ahorro" : "debito", saldo_inicial: saldo > 0 ? saldo : 0, espacio_id: e.id }).then(function () { return e; });
      }).then(function (e) {
        cerrarCapa();
        return cambiarEspacio(e.id, false).then(function () { toast(iconoDe(e.id).emoji + " Espacio creado", "Ya estás en «" + nombre + "»"); });
      });
    }
    p.catch(function (e) { mensaje("espacio-mensaje", "No se pudo guardar: " + e.message, true); }).then(function () { btn.disabled = false; });
  });
  // Borrar un espacio: solo si está vacío. Así nunca se pierde un movimiento, un límite ni una programada.
  // Su cuenta vacía (sin saldo) se quita con él.
  $("espacio-borrar").addEventListener("click", function () {
    var e = formEsp.editar;
    if (!e) return;
    var todo = todosLosDatos(), de = function (t) { return (todo[t] || []).filter(function (x) { return x.espacio_id === e.id; }); };
    var movs = de("movimientos").length, otros = de("limites").length + de("programados").length + de("frecuentes").length;
    var cuentas = de("cuentas"), conSaldo = cuentas.some(function (c) { return num(c.saldo_inicial) !== 0; });
    if (movs || otros || conSaldo) {
      return mensaje("espacio-mensaje", "Este espacio tiene " + (movs ? movs + (movs === 1 ? " movimiento" : " movimientos") : "información guardada") +
        ". Para no perder nada, NOVA no borra espacios con información. Si ya no lo usas, puedes dejarlo así o cambiarle el nombre.", true);
    }
    if (!confirm("¿Borrar el espacio «" + e.nombre + "»? Está vacío, así que no se pierde nada.")) return;
    cuentas.reduce(function (p, c) { return p.then(function () { return fuente.borrar("cuentas", c.id); }); }, Promise.resolve())
      .then(function () { return fuente.borrar("espacios", e.id); })
      .then(function () { cerrarCapa(); return cambiarEspacio(espacioId === e.id ? null : espacioId, false); })
      .then(function () { toast("Espacio borrado", e.nombre); })
      .catch(function (err) { mensaje("espacio-mensaje", "No se pudo borrar: " + err.message, true); });
  });

  // Pasar plata entre espacios: sale de uno como gasto y entra al otro como ingreso, unidos por el mismo código.
  // Si las monedas son distintas, se calcula cuánto llega con la tasa del día (y se puede corregir).
  var pasar = { tasa: null, llegaEditado: false };
  function opcionesEspacios(sel, valor) {
    sel.replaceChildren();
    [{ id: null, nombre: "Principal", moneda: "COP" }].concat(todosLosDatos().espacios || []).forEach(function (e) {
      var o = el("option", null, iconoDe(e.id).emoji + " " + e.nombre + (e.moneda !== "COP" ? " (" + e.moneda + ")" : ""));
      o.value = e.id == null ? "" : String(e.id); o.selected = (e.id == null ? null : e.id) === valor; sel.append(o);
    });
  }
  function idDeSelect(sel) { return sel.value === "" ? null : Number(sel.value); }
  function abrirPasar() {
    var otros = [null].concat((todosLosDatos().espacios || []).map(function (e) { return e.id; })).filter(function (id) { return id !== espacioId; });
    opcionesEspacios($("pasar-desde"), espacioId);
    opcionesEspacios($("pasar-hacia"), otros[0] === undefined ? null : otros[0]);
    $("pasar-monto").value = ""; $("pasar-llega").value = ""; $("pasar-nota").value = "";
    pasar = { tasa: null, llegaEditado: false };
    mensaje("pasar-mensaje", "");
    abrirCapa("pantalla-pasar");
    pintarPasar();
  }
  function pintarPasar() {
    var de = idDeSelect($("pasar-desde")), a = idDeSelect($("pasar-hacia")), md = monedaDe(de), ma = monedaDe(a);
    $("pasar-monto-etiqueta").textContent = "¿Cuánto sale? (" + md + ")";
    var distinta = md !== ma;
    $("pasar-bloque-llega").hidden = !distinta;
    if (!distinta) return;
    $("pasar-llega-etiqueta").textContent = "¿Cuánto llega? (" + ma + ")";
    cargarTasas().then(function (t) {
      pasar.tasa = t ? Mon.convertir(1, md, ma, t.rates) : null;
      $("pasar-tasa").textContent = pasar.tasa ? "Con la tasa del día: 1 " + md + " = " + Mon.formatoNumero(pasar.tasa) + " " + ma + ". Si tu banco cobró distinto, corrige cuánto llega." : "No hay tasa guardada: escribe cuánto llega.";
      var v = leerDecimalCO($("pasar-monto").value);
      if (!pasar.llegaEditado && pasar.tasa && v > 0) $("pasar-llega").value = Mon.formatoNumero(Math.round(v * pasar.tasa * 100) / 100);
    });
  }
  ["pasar-desde", "pasar-hacia"].forEach(function (id) { $(id).addEventListener("change", function () { pasar.llegaEditado = false; pintarPasar(); }); });
  $("pasar-monto").addEventListener("input", pintarPasar);
  $("pasar-llega").addEventListener("input", function () { pasar.llegaEditado = true; });
  $("form-pasar").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var de = idDeSelect($("pasar-desde")), a = idDeSelect($("pasar-hacia")), monto = leerDecimalCO($("pasar-monto").value);
    var md = monedaDe(de), ma = monedaDe(a), llega = md === ma ? monto : leerDecimalCO($("pasar-llega").value);
    var todo = todosLosDatos();
    function cuentaDe(id) { var c = (todo.cuentas || []).find(function (x) { return (x.espacio_id == null ? null : x.espacio_id) === id; }); return c ? c.id : null; }
    var filas;
    try {
      filas = Esp.transferencia({
        codigo: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : "t" + Date.now() + Math.random().toString(16).slice(2),
        desde: de, hacia: a, monto: monto, llega: llega, cuentaDesde: cuentaDe(de), cuentaHacia: cuentaDe(a),
        nombreDesde: nombreDe(de), nombreHacia: nombreDe(a), monedaDesde: md, monedaHacia: ma, nota: $("pasar-nota").value.trim() || null
      });
    } catch (e) { return mensaje("pasar-mensaje", e.message, true); }
    var btn = ev.target.querySelector("button[type=submit]"); btn.disabled = true;
    fuente.crear("movimientos", filas[0]).then(function () { return fuente.crear("movimientos", filas[1]); }).then(function () {
      cerrarCapa();
      return cambiarEspacio(espacioId, false);
    }).then(function () { toast("⇄ Listo", dineroEn(monto, md) + " de " + nombreDe(de) + " a " + nombreDe(a)); })
      .catch(function (e) { mensaje("pasar-mensaje", "No se pudo pasar la plata: " + e.message, true); })
      .then(function () { btn.disabled = false; });
  });


  // ---------- Novedades ----------
  // Al actualizar NOVA sale una vez una pantalla con lo nuevo. Quien recién empieza ve el tutorial y no esto.
  // Para una próxima tanda de novedades: subir NOVEDADES_VERSION y cambiar las páginas.
  var NOVEDADES_VERSION = 2;
  var NOVEDADES = [
    { iconos: ["🌐", "🧮", "📋", "🎯"], titulo: "NOVA IA busca en internet", texto: "Ahora puedes preguntarle precios y cosas de hoy: busca en internet y te responde con cuadros.",
      puntos: [["🌐", "Precios de hoy", "«¿Cuánto cuesta el iPhone 18 Pro Max?»: busca en tiendas de Colombia y te muestra de dónde sacó el dato."],
        ["🧮", "¿Me alcanza?", "«¿Me alcanza para comprar…?»: compara el precio con tu saldo y con lo que te sobra cada mes, y te dice en cuántos meses lo juntas."],
        ["📋", "Cuadros fáciles de leer", "Pídele «hazme un cuadro» y te responde con una tabla. Y con un toque creas la meta de ahorro para esa compra."]] },
    { titulo: "Tus pagos fijos y tu saldo", texto: "Tres ayudas para que lo que dice NOVA sea igual a lo que tienes de verdad.",
      puntos: [["🔁", "Suscripciones y pagos fijos", "En Planes: Netflix, Spotify, arriendo… cuánto pagas al mes y al año, cuándo es el próximo cobro y si te subieron el precio."],
        ["⚖️", "Cuadrar el saldo", "Toca «Saldo en cuentas» en Inicio, escribe cuánto tienes de verdad y NOVA anota la diferencia por ti."],
        ["🌙", "¿Gastaste algo hoy?", "El aviso de la noche sale solo si ese día no anotaste nada, a la hora que elijas, con botones para anotar rápido."]] },
    { titulo: "Anotar mensajes del banco", texto: "Comparte un mensaje de tu banco con NOVA y queda listo para anotar. Funciona en la app de Android.",
      puntos: [["📤", "Compartir → NOVA", "Mantén presionado el mensaje de Nequi, Bancolombia, Nu, Davivienda… toca Compartir y elige NOVA."],
        ["✅", "Tú decides", "Ves el valor, el comercio, la fecha y la cuenta. Tocas Anotar y Guardar; o Descartar. Nada se guarda solo."],
        ["🔒", "Sin permisos raros", "NOVA no lee tus mensajes ni notificaciones: solo lo que tú compartes. También puedes pegar el mensaje en la caja de Inicio."]],
      pie: "📍 Más info en Configuración → Mensajes del banco." }
  ];
  var paginaNovedad = 0;
  function novedadesSiHaceFalta() {
    if (leerLocal("nova-novedades", 0) >= NOVEDADES_VERSION) return;
    if (!leerLocal("nova-tutorial", false)) { guardarLocal("nova-novedades", NOVEDADES_VERSION); return; }   // es nuevo: ya ve el tutorial
    if (!$("tutorial").hidden || !$("bloqueo").hidden) return;
    paginaNovedad = 0; pintarNovedad(); $("novedades").hidden = false;
  }
  function pintarNovedad() {
    var n = NOVEDADES[paginaNovedad], c = $("nov-cuerpo");
    c.replaceChildren();
    if (n.iconos) {
      var fila = el("div", "nov-iconos");
      n.iconos.forEach(function (x, i) { var s = el("span", null, x); s.style.background = ["#14b8a6", "#6d5bd0", "#f59e0b", "#1d7bf0"][i]; fila.append(s); });
      c.append(fila);
    }
    var h = el("h2", null, n.titulo); h.id = "nov-titulo";
    c.append(h, el("p", "nov-texto", n.texto));
    n.puntos.forEach(function (p) {
      var art = el("div", "nov-punto"), ic = el("span", "nov-ico", p[0]), txt = el("div");
      txt.append(el("strong", null, p[1]), el("p", null, p[2]));
      art.append(ic, txt); c.append(art);
    });
    if (n.pie) c.append(el("p", "nov-pie", n.pie));
    c.scrollTop = 0;
    var puntos = $("nov-puntos"); puntos.replaceChildren();
    NOVEDADES.forEach(function (x, i) { puntos.append(el("i", i === paginaNovedad ? "activo" : null)); });
    $("nov-siguiente").textContent = paginaNovedad === NOVEDADES.length - 1 ? "Continuar" : "Siguiente";
  }
  function cerrarNovedades() { $("novedades").hidden = true; guardarLocal("nova-novedades", NOVEDADES_VERSION); }
  $("nov-cerrar").addEventListener("click", cerrarNovedades);
  $("nov-siguiente").addEventListener("click", function () {
    if (paginaNovedad < NOVEDADES.length - 1) { paginaNovedad++; pintarNovedad(); } else cerrarNovedades();
  });

  // ---------- Cuadrar el saldo ----------
  // La persona escribe cuánto tiene de verdad en una cuenta y NOVA le dice la diferencia con lo anotado. Puede anotar
  // esa diferencia como un gasto o ingreso ("lo que se me olvidó anotar") o solo corregir el saldo de la cuenta.
  var cuadre = { diferencia: 0 };
  function abrirCuadrar(cuentaId) {
    var sel = $("cuadrar-cuenta");
    sel.replaceChildren();
    datos.cuentas.forEach(function (c) { var o = el("option", null, c.nombre); o.value = c.id; o.selected = c.id === cuentaId; sel.append(o); });
    $("cuadrar-real").value = "";
    mensaje("cuadrar-mensaje", "");
    abrirCapa("pantalla-cuadrar");
    pintarCuadrar();
  }
  function cuentaDelCuadre() { var id = Number($("cuadrar-cuenta").value); return datos.cuentas.find(function (c) { return c.id === id; }); }
  function pintarCuadrar() {
    var c = cuentaDelCuadre();
    if (!c) return;
    var app = saldoCuenta(c), txt = $("cuadrar-real").value.trim(), real = txt ? leerValor(txt) : NaN;
    $("cuadrar-nova").textContent = pesos.format(app);
    var hay = isFinite(real);
    $("cuadrar-resultado").hidden = !hay;
    if (!hay) return;
    var d = Math.round((real - app) * 100) / 100;
    cuadre.diferencia = d;
    var r = $("cuadrar-resultado");
    r.classList.toggle("bien", d === 0); r.classList.toggle("falta", d < 0); r.classList.toggle("sobra", d > 0);
    $("cuadrar-anotar").hidden = $("cuadrar-ajustar").hidden = d === 0;
    if (d === 0) {
      $("cuadrar-diferencia").textContent = "✅ ¡Cuadra perfecto!";
      $("cuadrar-explica").textContent = "Lo que tienes es justo lo que NOVA tiene anotado en " + c.nombre + ".";
      return;
    }
    $("cuadrar-diferencia").textContent = d < 0 ? "Te faltan " + pesos.format(-d) : "Tienes " + pesos.format(d) + " de más";
    $("cuadrar-explica").textContent = d < 0
      ? "Tienes menos de lo que dice NOVA: seguramente hay gastos sin anotar. Anótalos si los recuerdas, o anota la diferencia de una vez."
      : "Tienes más de lo que dice NOVA: seguramente hay un ingreso sin anotar. Anótalo si lo recuerdas, o anota la diferencia de una vez.";
    $("cuadrar-anotar").textContent = d < 0 ? "Anotar " + pesos.format(-d) + " como gasto" : "Anotar " + pesos.format(d) + " como ingreso";
  }
  $("cuadrar-cuenta").addEventListener("change", pintarCuadrar);
  $("cuadrar-real").addEventListener("input", pintarCuadrar);
  $("form-cuadrar").addEventListener("submit", function (e) { e.preventDefault(); });
  function terminarCuadre(aviso) {
    pintar();
    cerrarCapa();
    toast("⚖️ Saldo cuadrado", aviso);
  }
  $("cuadrar-anotar").addEventListener("click", function () {
    var c = cuentaDelCuadre(), d = cuadre.diferencia, b = $("cuadrar-anotar");
    if (!c || !d) return;
    var tipo = d < 0 ? "gasto" : "ingreso";
    b.disabled = true;
    categoriaPorNombre(tipo === "gasto" ? "Otros gastos" : "Otros ingresos", tipo).then(function (cat) {
      return fuente.crear("movimientos", { cuenta_id: c.id, categoria_id: cat.id, tipo: tipo, descripcion: tipo === "gasto" ? "Gastos sin anotar" : "Ingreso sin anotar",
        monto: Math.abs(d), fecha: new Date().toISOString(), etiquetas: [], estado: "pagado", nota: "Cuadre de saldo de " + c.nombre, moneda: monedaBase() });
    }).then(function (m) {
      datos.movimientos.push(m); ordenarMovimientos();
      terminarCuadre(c.nombre + " ahora tiene " + pesos.format(saldoCuenta(c)));
    }).catch(function (err) { mensaje("cuadrar-mensaje", "No se pudo guardar: " + err.message, true); })
      .then(function () { b.disabled = false; });
  });
  $("cuadrar-ajustar").addEventListener("click", function () {
    var c = cuentaDelCuadre(), d = cuadre.diferencia, b = $("cuadrar-ajustar");
    if (!c || !d) return;
    b.disabled = true;
    fuente.actualizar("cuentas", c.id, { saldo_inicial: Math.round((num(c.saldo_inicial) + d) * 100) / 100 }).then(function (n) {
      Object.assign(c, n);
      terminarCuadre(c.nombre + " ahora tiene " + pesos.format(saldoCuenta(c)) + " (sin tocar tus gastos ni ingresos)");
    }).catch(function (err) { mensaje("cuadrar-mensaje", "No se pudo guardar: " + err.message, true); })
      .then(function () { b.disabled = false; });
  });
  $("btn-cuadrar").addEventListener("click", function () { abrirCuadrar(datos.cuentas[0] && datos.cuentas[0].id); });
  $("saldo-cuentas").addEventListener("click", function () { abrirCuadrar(datos.cuentas[0] && datos.cuentas[0].id); });

  // ---------- Anotar mensajes del banco (app Android) ----------
  // La persona comparte un mensaje del banco con NOVA (mantener presionado el mensaje → Compartir → NOVA). Android deja
  // el texto en una lista (Preferences «nova-banco», la llena MainActivity) y aquí se revisa: nada se guarda hasta que
  // toca «Anotar» y luego «Guardar». NOVA no lee notificaciones ni mensajes por su cuenta (Google Play Protect bloquea
  // las apps instaladas a mano que piden ese permiso). Los ya revisados se recuerdan en este celular («nova-banco-listos»).
  var plugPref = enApp && window.Capacitor.Plugins && window.Capacitor.Plugins.Preferences;
  var bancoCola = [], abrirBancoAlEntrar = false, bancoEnCurso = null;
  var horaBanco = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit" });
  function bancoListos() { var l = leerLocal("nova-banco-listos", []); return Array.isArray(l) ? l : []; }
  function marcarBancoListo(id) {
    var l = bancoListos();
    if (l.indexOf(id) < 0) l.push(id);
    guardarLocal("nova-banco-listos", l.slice(-200));
    bancoCola = bancoCola.filter(function (x) { return x.id !== id; });
  }
  function itemBanco(o) {
    if (!o || !o.texto) return null;
    var texto = String(o.texto).slice(0, 400), app = String(o.app || "Tu banco").slice(0, 40);
    var frase = NovaConsejos.mensajeBancoATexto(texto, { deBanco: !!o.deBanco });
    // Un mensaje compartido a propósito siempre se muestra: si no se entiende solo, sale para anotarlo con ayuda de la IA.
    if (!frase && o.compartido) frase = texto.slice(0, 200);
    if (!frase) return null;
    var r = Parser.interpretar(frase);
    if (!r || !r.ok) { if (!o.compartido) return null; r = null; }
    var nombrado = bancoEnTexto(texto);
    return { id: String(o.id), app: app, banco: nombrado || app, via: o.compartido ? "compartido" : "", texto: texto, fecha: Number(o.fecha) || Date.now(), frase: frase, r: r, moneda: Mon.detectar(frase) };
  }
  var BANCOS = ["Bancolombia", "Nequi", "Davivienda", "DaviPlata", "BBVA", "Banco de Bogotá", "AV Villas", "Scotiabank Colpatria", "Colpatria", "Lulo Bank", "Lulo", "Movii", "Falabella", "Itaú", "Banco Popular", "Banco de Occidente", "Banco Caja Social", "Bancamía", "Pichincha", "Serfinanza", "Ualá", "RappiPay", "Nu"];
  function bancoEnTexto(texto) {
    var sin = function (x) { return x.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }, t = " " + sin(texto).replace(/[^a-z0-9]+/g, " ") + " ";
    return BANCOS.filter(function (b) { return t.indexOf(" " + sin(b) + " ") >= 0; })[0] || null;
  }
  function cuandoBanco(ms) {
    var d = new Date(ms), min = Math.round((Date.now() - ms) / 60000);
    if (min < 1) return "ahora";
    if (min < 60) return "hace " + min + " min";
    if (A.claveDia(d) === A.claveDia(new Date())) return "hoy " + horaBanco.format(d);
    var ayer = new Date(); ayer.setDate(ayer.getDate() - 1);
    if (A.claveDia(d) === A.claveDia(ayer)) return "ayer " + horaBanco.format(d);
    return fechaCorta.format(d) + " · " + horaBanco.format(d);
  }
  // La cuenta de NOVA que se llama como el banco del aviso (Nequi, Bancolombia…), si la hay.
  var PALABRAS_COMUNES = ["cuenta", "cuentas", "ahorro", "ahorros", "tarjeta", "credito", "debito", "corriente", "principal", "banco", "mi", "de", "la", "el", "y"];
  function cuentaParaBanco(texto) {
    var t = " " + String(texto).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ") + " ";
    var c = (datos.cuentas || []).filter(function (cta) {
      return String(cta.nombre || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9]+/)
        .some(function (p) { return p.length >= 2 && PALABRAS_COMUNES.indexOf(p) < 0 && t.indexOf(" " + p + " ") >= 0; });
    })[0];
    return c || null;
  }
  function revisarBanco(sinAbrir) {
    if (!plugPref) return Promise.resolve();
    return Promise.all([
      plugPref.get({ key: "nova-banco" }).catch(function () { return null; }),
      plugPref.get({ key: "nova-banco-abrir" }).catch(function () { return null; })
    ]).then(function (res) {
      var crudo = [];
      try { crudo = JSON.parse((res[0] && res[0].value) || "[]"); } catch (e) { crudo = []; }
      if (!Array.isArray(crudo)) crudo = [];
      var ids = crudo.map(function (o) { return String(o && o.id); });
      var listos = bancoListos(), quedan = listos.filter(function (id) { return ids.indexOf(id) >= 0; });   // Android guarda solo los últimos 30
      if (quedan.length !== listos.length) guardarLocal("nova-banco-listos", quedan);
      bancoCola = crudo.filter(function (o) { return o && quedan.indexOf(String(o.id)) < 0; }).map(itemBanco).filter(Boolean).reverse();   // lo más nuevo arriba
      var abrir = !!(res[1] && res[1].value === "si");
      if (abrir) plugPref.remove({ key: "nova-banco-abrir" }).catch(function () { /* nada */ });
      pintarBanco();
      // Se acaba de compartir un mensaje con NOVA: se abre la lista para revisarlo.
      if (abrir && !sinAbrir && bancoCola.length && fuente && !fuente.demo && pilaCapas.indexOf("pantalla-banco") < 0) abrirBanco();
    });
  }
  function pintarBanco() {
    var n = bancoCola.length;
    $("aviso-banco").hidden = !enApp || !n;
    $("aviso-banco-texto").textContent = n === 1 ? "1 mensaje del banco por anotar" : n + " mensajes del banco por anotar";
    $("banco-titulo").hidden = $("banco-menu").hidden = !enApp;
    $("banco-estado").textContent = n ? n + " por anotar" : "Cómo compartir un mensaje con NOVA";
    if (pilaCapas.indexOf("pantalla-banco") >= 0) pintarListaBanco();
  }
  function pintarListaBanco() {
    var ul = $("lista-banco");
    ul.replaceChildren();
    $("banco-vacio").hidden = !!bancoCola.length;
    bancoCola.forEach(function (it) {
      var li = el("li", "banco-item"), cab = el("div", "banco-cab");
      cab.append(el("span", "banco-app", "🏦 " + it.banco), el("small", null, (it.via ? it.via + " · " : "") + cuandoBanco(it.fecha)));
      var res = el("div", "banco-resumen"), cta = cuentaParaBanco(it.banco + " " + it.texto);
      if (it.r) {
        var valor = it.moneda && it.r.montoExacto > 0 ? Mon.formatoMonto(it.r.montoExacto, it.moneda) : pesos.format(it.r.monto);
        res.append(el("span", "chip " + it.r.tipo, it.r.tipo === "ingreso" ? "Ingreso" : "Gasto"), el("strong", null, valor), el("span", null, it.r.descripcion));
      } else res.append(el("span", null, "NOVA no lo entendió sola: toca Anotar y la IA lo lee por ti."));
      if (cta) res.append(el("small", "banco-cuenta", "→ " + cta.nombre));
      var botones = el("div", "banco-botones"), anotar = el("button", "primario mini", "Anotar"), descartar = el("button", "mini", "Descartar");
      anotar.type = descartar.type = "button";
      anotar.addEventListener("click", function () { anotarBanco(it); });
      descartar.addEventListener("click", function () { marcarBancoListo(it.id); pintarBanco(); toast("Descartado", it.banco + ": " + it.texto.slice(0, 60)); });
      botones.append(anotar, descartar);
      li.append(cab, el("p", "banco-texto", it.texto), res, botones);
      ul.append(li);
    });
  }
  function abrirBanco() {
    if (!fuente) { abrirBancoAlEntrar = true; return; }
    if (pilaCapas.indexOf("pantalla-banco") < 0) abrirCapa("pantalla-banco");
    pintarListaBanco();
    revisarBanco(true);
  }
  // «Anotar»: el aviso pasa a la caja de Inicio y sale la vista previa de siempre, con la fecha del aviso y la cuenta del banco.
  function anotarBanco(it) {
    var cta = cuentaParaBanco(it.banco + " " + it.texto);
    bancoEnCurso = { frase: it.frase, fecha: new Date(it.fecha).toISOString(), cuentaId: cta ? cta.id : null,
      origen: "🏦 Del mensaje de " + it.banco + " · " + cuandoBanco(it.fecha) + (cta ? " · cuenta " + cta.nombre : "") };
    marcarBancoListo(it.id);
    pintarBanco();
    cerrarYLuego(function () {
      ir("inicio");
      $("entrada-rapida").value = it.frase;
      $("form-rapido").requestSubmit();
      setTimeout(function () { try { $("form-rapido").scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) { /* sin scroll */ } }, 60);
    });
  }
  $("aviso-banco").addEventListener("click", abrirBanco);
  $("banco-revisar").addEventListener("click", abrirBanco);
  document.addEventListener("visibilitychange", function () { if (!document.hidden && fuente && !fuente.demo) revisarBanco(); });

  // ---------- Panel del dueño ----------
  // Solo la cuenta del dueño ve el botón; el servidor (función nova-dueno) también lo revisa antes de mostrar algo.
  // Además, una vez al día la app anota en la cuenta de cada persona cuándo la abrió, si fue en Android o en el
  // navegador y qué versión tiene (sin datos de su plata), para que el dueño sepa cuánta gente la usa.
  var DUENOS = ["e84fedff-8279-4a12-9ff7-4992dae4cbbf", "92bfcc78-ebac-47ab-8171-2683d624c721"];
  function idUsuario() { return (leerLocal("nova-identidad", {}) || {}).id || ""; }
  function soyDueno() { return !!fuente && !fuente.demo && DUENOS.indexOf(idUsuario()) >= 0; }
  function marcarUso() {
    if (!cliente || !fuente || fuente.demo || !idUsuario()) return;
    var claveUso = "nova-uso-" + idUsuario(), hoyK = A.claveDia(new Date());
    if (leerLocal(claveUso, "") === hoyK) return;
    var version = enApp ? fetch("version-app.json").then(function (r) { return r.json(); }).then(function (v) { return (v && v.versionName) || ""; }).catch(function () { return ""; }) : Promise.resolve("");
    version.then(function (v) {
      return cliente.auth.updateUser({ data: { nova_visto: new Date().toISOString(), nova_plataforma: enApp ? "android" : "web", nova_version: v } });
    }).then(function (r) { if (r && !r.error) guardarLocal(claveUso, hoyK); }).catch(function () { /* se intenta mañana */ });
  }
  var numDueno = new Intl.NumberFormat("es-CO");
  function pl(n, uno, varios) { return numDueno.format(n) + " " + (n === 1 ? uno : varios); }
  function barrasDueno(cont, dias, campo) {
    cont.replaceChildren();
    var max = Math.max.apply(null, dias.map(function (d) { return d[campo]; }).concat([1]));
    var fila = el("div", "dueno-barras");
    dias.forEach(function (d) {
      var b = el("i", d[campo] ? null : "cero");
      b.style.height = Math.max(2, Math.round((d[campo] / max) * 100)) + "%";
      b.title = fechaCorta.format(new Date(d.dia + "T12:00:00")) + ": " + d[campo];
      fila.append(b);
    });
    var total = dias.reduce(function (s, d) { return s + d[campo]; }, 0);
    var ejes = el("div", "dueno-ejes");
    ejes.append(el("span", null, fechaCorta.format(new Date(dias[0].dia + "T12:00:00"))), el("span", null, "Total: " + numDueno.format(total) + " · máximo " + max + " en un día"), el("span", null, "Hoy"));
    cont.append(fila, ejes);
  }
  function pintarDueno(d) {
    var r = d.resumen;
    $("dueno-hora").textContent = "Datos de " + cuandoBanco(Date.parse(d.generado)) + ".";
    var kpis = [
      ["👥", r.registrados, "Personas registradas", "+" + r.nuevos7 + " esta semana · " + r.confirmados + " confirmaron el correo"],
      ["🔥", r.activos7, "Usaron NOVA (7 días)", r.hoy + " en las últimas 24 horas"],
      ["📅", r.activos30, "Usaron NOVA (30 días)", r.conMovimientos + " han anotado algo"],
      ["📲", d.apk.total, "Descargas de la APK", "desde GitHub (no cuenta las de la página)"],
      ["🤖", r.android, "Abrieron la app Android", r.web + " en el navegador · desde la 1.66"],
      ["🧾", r.movimientos, "Movimientos anotados", "entre todas las personas"],
      ["✦", r.chats, "Chats con NOVA IA", ""],
      ["🎯", r.metas, "Metas de ahorro", ""],
      ["👛", r.espacios, "Espacios creados", ""],
      ["🚖", r.conductores, "En modo conductor", ""]
    ];
    var g = $("dueno-kpis"); g.replaceChildren();
    kpis.forEach(function (k) {
      var c = el("div", "dueno-kpi");
      c.append(el("span", "ico", k[0]), el("strong", null, numDueno.format(k[1] || 0)), el("span", null, k[2]));
      if (k[3]) c.append(el("small", null, k[3]));
      g.append(c);
    });
    barrasDueno($("dueno-activos"), d.dias, "activos");
    barrasDueno($("dueno-movs"), d.dias, "movimientos");
    barrasDueno($("dueno-registros"), d.dias, "registros");
    var vers = Object.keys(d.versiones || {}).sort().reverse();
    $("dueno-versiones-tarjeta").hidden = !vers.length;
    $("dueno-versiones").replaceChildren.apply($("dueno-versiones"), vers.map(function (v) { var n = d.versiones[v]; return el("span", null, (v === "" ? "?" : v) + ": " + n + (n === 1 ? " persona" : " personas")); }));
    var ul = $("dueno-personas"); ul.replaceChildren();
    d.personas.forEach(function (p) {
      var li = el("li", "banco-item dueno-persona"), cab = el("div", "banco-cab");
      cab.append(el("span", "banco-app", (p.dueno ? "👑 " : p.prueba ? "🧪 " : "👤 ") + p.correo), el("small", null, p.ultimoUso ? "usó " + cuandoBanco(Date.parse(p.ultimoUso)) : "nunca entró"));
      var det = "Se registró el " + fechaCorta.format(new Date(p.registro)) + (p.confirmado ? "" : " · no ha confirmado el correo") + (p.prueba ? " · cuenta de prueba" : "");
      var chips = el("div", "dueno-chips");
      [p.plataforma === "android" ? "📱 Android" + (p.version ? " " + p.version : "") : p.plataforma === "web" ? "🌐 Navegador" : "",
        pl(p.movimientos, "movimiento", "movimientos"), p.chats ? pl(p.chats, "chat IA", "chats IA") : "", p.metas ? pl(p.metas, "meta", "metas") : "", p.espacios ? pl(p.espacios, "espacio", "espacios") : "", p.conductor ? "🚖 conductor" : ""]
        .filter(Boolean).forEach(function (t) { chips.append(el("span", null, t)); });
      li.append(cab, el("p", "banco-texto", det), chips);
      ul.append(li);
    });
  }
  function cargarDueno() {
    mensaje("dueno-mensaje", "Cargando los datos…");
    $("dueno-recargar").disabled = true;
    cliente.functions.invoke("nova-dueno", { body: {} }).then(function (res) {
      if (res.error || !res.data || !res.data.resumen) throw new Error("sin datos");
      mensaje("dueno-mensaje", "");
      pintarDueno(res.data);
    }).catch(function () { mensaje("dueno-mensaje", "No se pudieron cargar los datos. Revisa tu conexión e intenta otra vez.", true); })
      .finally(function () { $("dueno-recargar").disabled = false; });
  }
  $("btn-dueno").addEventListener("click", function () { abrirCapa("pantalla-dueno"); cargarDueno(); });
  $("dueno-recargar").addEventListener("click", cargarDueno);

  // ---------- Calendario día por día ----------
  // Cada pantalla abre el calendario con sus propios movimientos: en Buscar, lo que encontraste; en Mi trabajo,
  // solo lo del trabajo. Cada día se pinta según cuánto se gastó (o ganó) y al tocarlo salen sus movimientos.
  var calVista = { ctx: "inicio", anio: 0, mes: 0, tipo: "gasto", dia: null };
  var CAL_CONTEXTOS = {
    inicio: "Todos tus movimientos.", analisis: "Todos tus movimientos.", planes: "Todos tus movimientos.",
    buscar: "Solo lo que encontraste con tu búsqueda y filtros.", trabajo: "Solo lo de tu trabajo: ganancias de las apps, gastos del vehículo, papeles y cuotas."
  };
  function movimientosDelCalendario() {
    if (calVista.ctx === "buscar") return resultadosBusqueda();
    if (calVista.ctx === "trabajo") return datos.movimientos.filter(function (m) { var c = categoria(m.categoria_id); return A.esGanancia(c) || A.esGastoTrabajo(c) || A.esFijo(c); });
    return datos.movimientos;
  }
  function abrirCalendario(ctx) {
    var ref = new Date();
    if (ctx === "inicio") ref = rangoInicio().desde;
    else if (ctx === "analisis") ref = A.desplazar(cicloDeAnalisis(), new Date(), desfaseAnalisis).desde;
    calVista.ctx = ctx; calVista.anio = ref.getFullYear(); calVista.mes = ref.getMonth(); calVista.dia = null;
    if (ctx === "buscar") {   // abre en el mes del resultado más reciente
      var r = resultadosBusqueda().filter(function (m) { return m.estado !== "pendiente"; });
      if (r.length) { var f = new Date(r.reduce(function (a, m) { return new Date(m.fecha) > new Date(a.fecha) ? m : a; }).fecha); calVista.anio = f.getFullYear(); calVista.mes = f.getMonth(); }
    }
    calVista.tipo = ctx === "trabajo" && !leerLocal("nova-cal-tipo") ? "ingreso" : leerLocal("nova-cal-tipo") || "gasto";
    abrirCapa("pantalla-calendario");
    pintarCalendario();
  }
  function montoCorto(v) {
    if (ocultos) return "••";
    v = Math.round(v);
    if (v >= 1000000) return (Math.round(v / 100000) / 10).toString().replace(".", ",") + "M";
    if (v >= 1000) return Math.round(v / 1000) + "k";
    return String(v);
  }
  function fechaDelDia(clave) {
    var p = clave.split("-").map(Number), d = new Date(p[0], p[1] - 1, p[2]);
    return new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" }).format(d);
  }
  function pintarCalendario() {
    if (!pilaCapas || pilaCapas.indexOf("pantalla-calendario") < 0) return;
    var c = A.calendarioMes(movimientosDelCalendario(), calVista.anio, calVista.mes, new Date()), esGasto = calVista.tipo === "gasto";
    $("cal-contexto").textContent = CAL_CONTEXTOS[calVista.ctx] || "";
    $("cal-mes").textContent = c.nombre;
    document.querySelectorAll("#cal-tipo button").forEach(function (b) { b.setAttribute("aria-checked", String(b.dataset.calTipo === calVista.tipo)); });

    var res = $("cal-resumen"); res.replaceChildren();
    function dato(titulo, valor, nota) { var d = el("div", "tarjeta cal-dato"); d.append(el("small", null, titulo), el("strong", null, valor)); if (nota) d.append(el("small", "nota", nota)); res.append(d); }
    if (esGasto) {
      dato("Gastaste en el mes", dinero(c.gastos), c.diasConGasto + (c.diasConGasto === 1 ? " día con gastos" : " días con gastos"));
      dato("Día que más gastaste", c.diaTop ? fechaDelDia(c.diaTop.clave) : "Ninguno", c.diaTop ? dinero(c.diaTop.gastos) : "Sin gastos este mes");
      dato("Días sin gastar", String(c.diasSinGasto), c.diasTranscurridos ? "de " + c.diasTranscurridos + (c.diasTranscurridos === 1 ? " día" : " días") + " que van" : "El mes aún no empieza");
      dato("Promedio por día", dinero(c.promedioDiario), "Contando los días que van");
    } else {
      var top = c.dias.reduce(function (a, x) { return x.ingresos > (a ? a.ingresos : 0) ? x : a; }, null);
      var conIng = c.dias.filter(function (x) { return x.ingresos > 0; }).length;
      dato("Ingresos del mes", dinero(c.ingresos), conIng + (conIng === 1 ? " día con ingresos" : " días con ingresos"));
      dato("Día que más ganaste", top ? fechaDelDia(top.clave) : "Ninguno", top ? dinero(top.ingresos) : "Sin ingresos este mes");
      dato("Balance del mes", (c.ingresos - c.gastos < 0 && !ocultos ? "−" : "") + dinero(Math.abs(c.ingresos - c.gastos)), "Ingresos menos gastos");
    }

    document.querySelector("#pantalla-calendario .cal-leyenda").classList.toggle("ing", !esGasto);
    var grilla = $("cal-dias"); grilla.replaceChildren();
    for (var i = 0; i < c.hueco; i++) grilla.append(el("span", "cal-vacio"));
    c.dias.forEach(function (x) {
      var valor = esGasto ? x.gastos : x.ingresos, nivel = esGasto ? x.nivel : x.nivelIngreso;
      var b = el("button", "cal-celda n" + nivel + (esGasto ? "" : " ing") + (x.hoy ? " hoy" : "") + (x.futuro ? " futuro" : "") + (calVista.dia === x.clave ? " elegido" : ""));
      b.type = "button";
      b.append(el("span", "cal-num", String(x.dia)), el("span", "cal-valor", valor > 0 ? montoCorto(valor) : x.futuro ? "" : esGasto ? "✓" : ""));
      b.setAttribute("aria-label", fechaDelDia(x.clave) + ": " + (valor > 0 ? (esGasto ? "gastaste " : "ganaste ") + dinero(valor) : x.futuro ? "todavía no llega" : esGasto ? "no gastaste" : "sin ingresos"));
      if (calVista.dia === x.clave) b.setAttribute("aria-pressed", "true");
      b.addEventListener("click", function () { calVista.dia = calVista.dia === x.clave ? null : x.clave; pintarCalendario(); if (calVista.dia) $("cal-detalle").scrollIntoView({ behavior: "smooth", block: "start" }); });
      grilla.append(b);
    });

    var cont = $("cal-detalle"); cont.replaceChildren();
    var elegido = calVista.dia && c.dias.find(function (x) { return x.clave === calVista.dia; });
    if (!elegido) { cont.append(el("p", "nota", "Toca un día para ver qué gastaste o ganaste ese día. ✓ es un día sin gastos.")); return; }
    var cab = el("div", "seccion-cabecera");
    cab.append(el("h2", "cal-dia-titulo", fechaDelDia(elegido.clave)));
    cont.append(cab);
    var t = el("p", "nota", elegido.cantidad ? "Gastos " + dinero(elegido.gastos) + " · Ingresos " + dinero(elegido.ingresos) : elegido.futuro ? "Este día todavía no llega." : "Este día no anotaste gastos ni ingresos.");
    cont.append(t);
    if (elegido.movimientos.length) { var lista = el("div", "dias"); cont.append(lista); listaPorDia(lista, elegido.movimientos, ""); }
  }
  document.querySelectorAll("[data-calendario]").forEach(function (b) { b.addEventListener("click", function () { abrirCalendario(b.dataset.calendario); }); });
  document.querySelectorAll("[data-cal-mes]").forEach(function (b) {
    b.addEventListener("click", function () {
      var d = new Date(calVista.anio, calVista.mes + Number(b.dataset.calMes), 1);
      calVista.anio = d.getFullYear(); calVista.mes = d.getMonth(); calVista.dia = null; pintarCalendario();
    });
  });
  document.querySelectorAll("#cal-tipo button").forEach(function (b) {
    b.addEventListener("click", function () { calVista.tipo = b.dataset.calTipo; guardarLocal("nova-cal-tipo", calVista.tipo); pintarCalendario(); });
  });

  // ---------- Mapa de calor de gastos ----------
  var mapaCalor = null;
  function abrirMapaCalor() {
    var lugs = NovaConsejos.lugares(datos.movimientos, 60);
    abrirCapa("pantalla-calor");
    if (!lugs.length) { $("mapa-calor").textContent = "Todavía no hay pagos con ubicación guardada."; return; }
    $("mapa-calor").textContent = "Cargando el mapa…";
    cargarLeaflet().then(function () {
      var L = window.L, caja = $("mapa-calor");
      if (mapaCalor) { mapaCalor.remove(); mapaCalor = null; }
      caja.textContent = "";
      mapaCalor = L.map(caja, { zoomControl: true, scrollWheelZoom: false });
      mapaCalor.attributionControl.setPrefix(false);
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Imágenes © Esri, Maxar, Earthstar Geographics" }).addTo(mapaCalor);
      var max = lugs[0].total, grupo = L.featureGroup();
      lugs.forEach(function (x) {
        var r = Math.sqrt(x.total / max), color = "hsl(" + Math.round(120 - r * 120) + ", 90%, 50%)";
        L.circleMarker([x.lat, x.lng], { radius: 8 + r * 26, color: "#fff", weight: 1, fillColor: color, fillOpacity: 0.65 }).bindPopup(x.nombre + "<br>" + (ocultos ? "••••" : pesos.format(x.total)) + " · " + x.veces + (x.veces === 1 ? " compra" : " compras")).addTo(grupo);
      });
      grupo.addTo(mapaCalor);
      setTimeout(function () { mapaCalor.invalidateSize(); mapaCalor.fitBounds(grupo.getBounds().pad(0.3), { maxZoom: 17 }); }, 200);
    }).catch(function () { $("mapa-calor").textContent = "No se pudo cargar el mapa. Revisa tu conexión."; });
  }

  // ---------- Meta compartida del grupo ----------
  function pintarMetaGrupo(g) {
    var caja = $("grupo-meta"); caja.replaceChildren();
    caja.append(el("span", "titulo-det", "🎯 Meta del grupo"));
    if (!g.meta_objetivo) {
      caja.append(el("p", "nota", "Ahorren juntos para algo (un viaje, un regalo): cada uno anota lo que aporta y se ve el avance de todos."));
      var crear = el("button", "mini", "🎯 Crear una meta para el grupo"); crear.type = "button";
      crear.addEventListener("click", function () {
        abrirEditor({ titulo: "Meta del grupo", campos: [{ clave: "nombre", etiqueta: "¿Para qué ahorran?", tipo: "texto", valor: "", requerido: true, max: 60 }, { clave: "objetivo", etiqueta: "¿Cuánto necesitan?", tipo: "plata", valor: "" }],
          guardar: function (v) { return fuente.actualizar("grupos", g.id, { meta_nombre: v.nombre, meta_objetivo: v.objetivo }).then(function (n) { Object.assign(g, n); }); } });
      });
      return caja.append(crear);
    }
    var aportes = datos.aportes_grupo.filter(function (x) { return x.grupo_id === g.id; }).sort(function (a, b) { return String(b.fecha).localeCompare(String(a.fecha)) || b.id - a.id; });
    var r = NovaConsejos.progresoMetaGrupo(g.meta_objetivo, aportes, g.miembros);
    caja.append(el("strong", null, g.meta_nombre || "Meta"), barraSimple(r.pct), el("p", "calc-res", ocultos ? "••••" : (r.cumplida ? "🎉 ¡Meta cumplida! " : "") + dinero(r.total) + " de " + dinero(r.objetivo) + " (" + r.pct + " %)" + (r.falta > 0 ? " · faltan " + dinero(r.falta) : "")));
    var ul = el("ul", "lista-simple");
    g.miembros.forEach(function (n) { ul.append(el("li", null, n + ": " + (ocultos ? "••••" : dinero(r.porPersona[n] || 0)))); });
    caja.append(ul);
    var fila = el("div", "meta-abono"), sel = el("select"), inp = el("input"), ok = el("button", "primario", "Aportar");
    g.miembros.forEach(function (n) { var o = el("option", null, n); o.value = n; sel.append(o); });
    inp.className = "campo-plata"; inp.inputMode = "numeric"; inp.placeholder = "Aporte, ej. 50 mil"; inp.setAttribute("aria-label", "Valor del aporte"); ok.type = "button";
    ok.addEventListener("click", function () {
      var v = leerValor(inp.value); if (!(v > 0)) { inp.focus(); return; }
      ok.disabled = true;
      fuente.crear("aportes_grupo", { grupo_id: g.id, persona: sel.value, monto: v, fecha: A.claveDia(new Date()) }).then(function (n) { datos.aportes_grupo.push(n); toast("¡Aporte anotado!", sel.value, pesos.format(v)); pintar(); })
        .catch(function (err) { ok.disabled = false; toast("No se pudo anotar: " + err.message); });
    });
    fila.append(sel, inp, ok); caja.append(fila);
    aportes.slice(0, 6).forEach(function (a) {
      var li = el("li", "mov"), t = el("div", "mov-texto"); t.append(el("strong", null, a.persona), el("small", null, fechaCorta.format(parteFechaLocal(a.fecha)))); li.append(t, el("span", "mov-monto positivo", pesos.format(num(a.monto)))); li.tabIndex = 0;
      li.addEventListener("click", function () {
        abrirEditor({ titulo: "Editar aporte", campos: [{ clave: "persona", etiqueta: "¿Quién aportó?", tipo: "select", valor: a.persona, opciones: g.miembros.map(function (n) { return [n, n]; }) }, { clave: "monto", etiqueta: "Valor", tipo: "plata", valor: num(a.monto) }, { clave: "fecha", etiqueta: "Fecha", tipo: "fecha", valor: a.fecha }],
          guardar: function (v) { return fuente.actualizar("aportes_grupo", a.id, { persona: v.persona, monto: v.monto, fecha: v.fecha || a.fecha }).then(function (n) { Object.assign(a, n); }); },
          borrar: function () { return fuente.borrar("aportes_grupo", a.id).then(function () { datos.aportes_grupo = datos.aportes_grupo.filter(function (y) { return y.id !== a.id; }); }); },
          textoBorrar: "🗑 Borrar este aporte", confirmar: "¿Borrar este aporte?", avisoBorrado: "Aporte borrado" });
      });
      caja.append(li);
    });
    var editar = el("button", "mini", "✏️ Editar la meta"); editar.type = "button";
    editar.addEventListener("click", function () {
      abrirEditor({ titulo: "Editar la meta del grupo", campos: [{ clave: "nombre", etiqueta: "¿Para qué ahorran?", tipo: "texto", valor: g.meta_nombre, requerido: true, max: 60 }, { clave: "objetivo", etiqueta: "¿Cuánto necesitan?", tipo: "plata", valor: num(g.meta_objetivo) }],
        guardar: function (v) { return fuente.actualizar("grupos", g.id, { meta_nombre: v.nombre, meta_objetivo: v.objetivo }).then(function (n) { Object.assign(g, n); }); },
        borrar: function () { return fuente.actualizar("grupos", g.id, { meta_nombre: null, meta_objetivo: null }).then(function (n) { Object.assign(g, n); }); },
        textoBorrar: "Quitar la meta (los aportes se conservan)", confirmar: "¿Quitar la meta del grupo? Los aportes anotados no se borran.", avisoBorrado: "Meta quitada" });
    });
    caja.append(editar);
  }

  // ---------- Foto del recibo ----------
  function achicarFoto(archivo) {
    return new Promise(function (ok, mal) {
      var url = URL.createObjectURL(archivo), img = new Image();
      img.onload = function () {
        var k = Math.min(1, 1400 / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? ok(b) : mal(new Error("No se pudo preparar la foto.")); }, "image/jpeg", 0.72);
      };
      img.onerror = function () { URL.revokeObjectURL(url); mal(new Error("No se pudo abrir la foto.")); };
      img.src = url;
    });
  }
  // Foto de una fila (recibo de un movimiento, documento de una deuda o foto de una meta).
  // opc: { tabla, titulo, clave, nombre(fila), repintar() }
  function pintarFotoDe(m, opc) {
    var caja = el("article", "tarjeta det-foto");
    caja.append(el("span", "titulo-det", opc.titulo));
    var puede = fuente && fuente.fotos && m.id > 0;
    var aviso = el("p", "mensaje", ""); aviso.setAttribute("role", "status");
    var vivo = true;
    if (m.foto_ruta && puede) {
      var img = el("img", "det-foto-img"); img.alt = opc.titulo; img.loading = "lazy";
      img.addEventListener("click", function () { img.classList.toggle("grande"); });
      caja.append(img);
      fuente.fotos.url(m.foto_ruta).then(function (u) { if (vivo) img.src = u; })
        .catch(function () { aviso.textContent = "No se pudo mostrar la foto (¿sin internet?)."; aviso.classList.add("error"); });
    }
    var archivo = el("input"); archivo.type = "file"; archivo.accept = "image/*"; archivo.hidden = true;
    var agregar = el("button", "mini", m.foto_ruta ? "🔄 Cambiar foto" : "📷 Agregar foto"); agregar.type = "button";
    var quitar = el("button", "mini", "🗑 Quitar foto"); quitar.type = "button"; quitar.hidden = !m.foto_ruta;
    agregar.addEventListener("click", function () {
      if (!puede) { aviso.textContent = "La foto se puede agregar cuando tengas internet y ya esté enviado."; aviso.classList.add("error"); return; }
      archivo.click();
    });
    archivo.addEventListener("change", function () {
      var f = archivo.files && archivo.files[0]; archivo.value = "";
      if (!f) return;
      agregar.disabled = true; aviso.classList.remove("error"); aviso.textContent = "Guardando la foto…";
      var vieja = m.foto_ruta;
      achicarFoto(f).then(function (blob) { return fuente.fotos.subir(blob, opc.clave + "-" + m.id); })
        .then(function (ruta) { return fuente.actualizar(opc.tabla, m.id, { foto_ruta: ruta }).then(function (n) { Object.assign(m, n); return vieja ? fuente.fotos.borrar(vieja) : null; }); })
        .then(function () { toast("¡Foto guardada!", opc.nombre(m)); vivo = false; opc.repintar(); })
        .catch(function (err) { aviso.textContent = "No se pudo guardar la foto: " + err.message; aviso.classList.add("error"); })
        .finally(function () { agregar.disabled = false; });
    });
    quitar.addEventListener("click", function () {
      if (!confirm("¿Quitar esta foto?")) return;
      var vieja = m.foto_ruta;
      fuente.actualizar(opc.tabla, m.id, { foto_ruta: null }).then(function (n) { Object.assign(m, n); return fuente.fotos.borrar(vieja); })
        .then(function () { toast("Foto quitada"); vivo = false; opc.repintar(); })
        .catch(function (err) { aviso.textContent = "No se pudo quitar: " + err.message; aviso.classList.add("error"); });
    });
    var fila = el("div", "det-foto-botones"); fila.append(agregar, quitar, archivo);
    if (opc.productos && m.foto_ruta && puede) {
      var sep = el("button", "mini", "🧾 Separar los productos"); sep.type = "button";
      var lista = el("div", "productos-recibo");
      sep.addEventListener("click", function () {
        if (!iaDisponible()) { aviso.textContent = "La IA no está disponible ahora mismo."; aviso.classList.add("error"); return; }
        sep.disabled = true; aviso.classList.remove("error"); aviso.textContent = "✦ La IA está leyendo el recibo…"; lista.replaceChildren();
        fuente.fotos.url(m.foto_ruta).then(function (u) { return fetch(u); }).then(function (r) { return r.blob(); })
          .then(function (blob) { return new Promise(function (ok, mal) { var fr = new FileReader(); fr.onload = function () { ok(String(fr.result).split(",")[1] || ""); }; fr.onerror = function () { mal(new Error("No se pudo leer la foto.")); }; fr.readAsDataURL(blob); }); })
          .then(function (b64) { return invocarIA({ productos: true, imagen: b64, mime: "image/jpeg" }); })
          .then(function (d) {
            aviso.textContent = "";
            var items = d.productos || [];
            if (!items.length) { aviso.textContent = "No pude leer productos en esta foto. Prueba con una foto más cercana y con buena luz."; aviso.classList.add("error"); return; }
            var ul = el("ul", "lista-simple");
            items.forEach(function (x) { var li = el("li", "consejo"); var t = el("div"); t.append(el("strong", null, (x.cantidad > 1 ? x.cantidad + "× " : "") + x.nombre), el("small", null, ocultos ? "••••" : pesos.format(x.valor))); li.append(t); ul.append(li); });
            lista.append(el("p", "calc-res", (d.comercio ? d.comercio + " · " : "") + items.length + (items.length === 1 ? " producto" : " productos")), ul);
            var guardar = el("button", "mini", "📝 Guardar en la nota"); guardar.type = "button";
            guardar.addEventListener("click", function () {
              var txt = "Productos: " + items.map(function (x) { return (x.cantidad > 1 ? x.cantidad + " " : "") + x.nombre + " " + pesos.format(x.valor); }).join(", ");
              var base = m.nota ? m.nota + "\n" : "", nota = (base + txt).slice(0, 500);
              guardar.disabled = true;
              fuente.actualizar("movimientos", m.id, { nota: nota }).then(function (n) { Object.assign(m, n); toast("¡Guardado en la nota!", opc.nombre(m)); opc.repintar(); })
                .catch(function (err) { guardar.disabled = false; aviso.textContent = "No se pudo guardar: " + err.message; aviso.classList.add("error"); });
            });
            lista.append(guardar);
          })
          .catch(function (err) { aviso.textContent = (err && err.message) || "No se pudo leer el recibo."; aviso.classList.add("error"); })
          .finally(function () { sep.disabled = false; });
      });
      fila.append(sep);
      caja.append(fila, aviso, lista);
      return caja;
    }
    caja.append(fila, aviso);
    return caja;
  }
  function pintarFotoRecibo(m) {
    var idAhora = detalleId;
    return pintarFotoDe(m, { tabla: "movimientos", titulo: "📷 Foto del recibo", clave: "mov", productos: true, nombre: function (x) { return x.descripcion; }, repintar: function () { if (detalleId === idAhora) pintarDetalle(); } });
  }

  function pintarDetalle() {
    var m = datos.movimientos.find(function (x) { return x.id === detalleId; });
    var cont = $("det-contenido");
    if (!m) return;
    cont.replaceChildren();
    var c = categoria(m.categoria_id) || { nombre: "Sin categoría", icono: "otro" };
    var cuenta = datos.cuentas.find(function (x) { return x.id === m.cuenta_id; });
    var esIngreso = m.tipo === "ingreso", otraMoneda = m.moneda && m.moneda !== monedaBase() && num(m.monto_original) > 0;

    // Cabecera: nombre, tipo y valor
    var cab = el("article", "tarjeta det-cabecera"), txt = el("div", "mov-texto");
    txt.append(el("strong", null, m.descripcion), el("small", null, (esIngreso ? "Ingreso" : "Gasto") + (m.estado === "pendiente" ? " · pendiente" : "") + (otraMoneda ? " · " + Mon.formatoMonto(m.monto_original, m.moneda) : "")));
    cab.append(pintarIcono(el("span", "mov-icono"), c), txt, el("span", "det-monto" + (esIngreso ? " positivo" : ""), dineroSigno(num(m.monto), m.tipo)));
    cont.append(cab);

    // Datos
    var datosCaja = el("article", "tarjeta det-filas");
    var cat = el("span"); var punto = el("span", "punto"); punto.style.setProperty("--c", colorDe(c)); cat.append(punto, document.createTextNode(" " + c.nombre));
    var cuando = new Date(m.fecha);
    datosCaja.append(filaDetalle("Categoría", cat), filaDetalle("Fecha", fechaLarga.format(cuando) + " · " + hora.format(cuando)));
    if (cuenta) datosCaja.append(filaDetalle("Origen", el("span", "chip-cuenta", cuenta.nombre)));
    if (m.nota) datosCaja.append(filaDetalle("Nota", m.nota));
    if (m.viajes) datosCaja.append(filaDetalle("Viajes", String(m.viajes)));
    cont.append(datosCaja);
    cont.append(pintarFotoRecibo(m));
    var repetir = el("button", "mini", "🔁 Repetir este " + (esIngreso ? "ingreso" : "gasto")); repetir.type = "button";
    repetir.addEventListener("click", function () {
      repetir.disabled = true;
      var fila = { cuenta_id: m.cuenta_id, categoria_id: m.categoria_id, tipo: m.tipo, monto: m.monto, descripcion: m.descripcion, etiquetas: m.etiquetas || [], fecha: new Date().toISOString() };
      ["moneda", "monto_original", "tasa"].forEach(function (k) { if (m[k] != null) fila[k] = m[k]; });
      fuente.crear("movimientos", fila).then(function (n) { datos.movimientos.push(n); ordenarMovimientos(); toast("¡Repetido!", n.descripcion, pesos.format(num(n.monto))); pintar(); })
        .catch(function (err) { toast("No se pudo repetir: " + err.message); }).finally(function () { repetir.disabled = false; });
    });
    cont.append(repetir);

    // Etiquetas: se quitan con la x y se agregan escribiéndolas o tocando una sugerencia
    var tagCaja = el("article", "tarjeta det-etiquetas"), actuales = m.etiquetas || [];
    function guardarEtiquetas(lista) {
      fuente.actualizar("movimientos", m.id, { etiquetas: lista }).then(function (n) { Object.assign(m, n); pintar(); }).catch(function (err) { toast("No se pudo guardar: " + err.message); });
    }
    actuales.forEach(function (t) {
      var chip = el("span", "etiqueta-chip activa", "#" + t), x = el("button", null, "✕"); x.type = "button"; x.setAttribute("aria-label", "Quitar #" + t);
      x.addEventListener("click", function () { guardarEtiquetas(actuales.filter(function (y) { return y !== t; })); });
      chip.append(x); tagCaja.append(chip);
    });
    var entrada = el("input"); entrada.placeholder = "+ #etiqueta"; entrada.maxLength = 30; entrada.setAttribute("aria-label", "Agregar etiqueta");
    function agregar() {
      var t = limpiarEtiqueta(entrada.value);
      if (t && actuales.indexOf(t) < 0) guardarEtiquetas(actuales.concat([t])); else entrada.value = "";
    }
    entrada.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " " || e.key === ",") { e.preventDefault(); agregar(); } });
    entrada.addEventListener("blur", agregar);
    tagCaja.append(entrada);
    var usos = {};
    datos.movimientos.forEach(function (x) { (x.etiquetas || []).forEach(function (t) { usos[t] = (usos[t] || 0) + 1; }); });
    Object.keys(usos).filter(function (t) { return actuales.indexOf(t) < 0; }).sort(function (a, b) { return usos[b] - usos[a]; }).slice(0, 5).forEach(function (t) {
      var b = el("button", "etiqueta-chip", "+ #" + t); b.type = "button";
      b.addEventListener("click", function () { guardarEtiquetas(actuales.concat([t])); });
      tagCaja.append(b);
    });
    cont.append(tagCaja);

    // Presupuesto del periodo (solo para gastos)
    if (!esIngreso) {
      var pr = presupuestoActual();
      if (pr.conPresupuesto && pr.limite > 0) {
        var pct = Math.min(100, Math.round((pr.gastado / pr.limite) * 100)), caja = el("article", "tarjeta det-presupuesto");
        var tit = el("div", "fila-titulo"); tit.style.cssText = "display:flex;justify-content:space-between";
        var lb = el("span", "titulo-det", "Presupuesto del periodo"), pc = el("strong", null, Math.round((pr.gastado / pr.limite) * 100) + " %");
        pc.style.color = pr.gastado > pr.limite ? "var(--danger)" : "var(--accent)";
        tit.append(lb, pc);
        var barra = el("div", "barra-presupuesto" + (pr.gastado > pr.limite ? " pasado" : "")), i = el("span"); i.style.width = pct + "%"; barra.append(i);
        caja.append(tit, barra, el("small", null, dinero(pr.gastado) + " / " + dinero(pr.limite)));
        cont.append(caja);
      }
    }

    // Ubicación: mapa, dirección y otros pagos en el mismo lugar
    if (tieneUbicacion(m)) {
      var lat = Number(m.lat), lng = Number(m.lng), d = 0.004, mapaCaja = el("article", "tarjeta");
      var marco = el("div", "det-mapa"); marco.setAttribute("aria-label", "Mapa satelital del lugar del pago");
      var contL = el("div", "mapa-capa"), marcoG = el("iframe", "mapa-capa mapa-google");
      marcoG.title = "Mapa de Google del lugar del pago"; marcoG.hidden = true; marcoG.referrerPolicy = "no-referrer-when-downgrade"; marcoG.setAttribute("allowfullscreen", "");
      marco.append(contL, marcoG);
      var modos = el("div", "det-mapa-modos"), bG = el("button", null, "Google"), bSat = el("button", null, "🛰 Satélite"), bMapa = el("button", null, "🗺 Calles");
      [bG, bSat, bMapa].forEach(function (b) { b.type = "button"; });
      modos.append(bG, bSat, bMapa);
      var dir = el("div", "det-direccion"), dirTxt = el("span", null, "Buscando la dirección…");
      var abrir = el("a", null, "Abrir en Mapas"); abrir.href = "https://www.google.com/maps/search/?api=1&query=" + lat + "," + lng; abrir.target = "_blank"; abrir.rel = "noopener";
      dir.append(dirTxt, abrir);
      mapaCaja.append(marco, modos, dir); cont.append(mapaCaja);
      var idAhora = detalleId;
      pintarMapaDetalle({ caja: marco, leaflet: contL, google: marcoG }, m, pagosCerca(m), { google: bG, sat: bSat, mapa: bMapa });
      direccionDe(lat, lng).then(function (t) { if (detalleId === idAhora) dirTxt.textContent = "📍 " + t; })
        .catch(function () { if (detalleId === idAhora) dirTxt.textContent = "📍 " + lat.toFixed(5) + ", " + lng.toFixed(5); });
      var cerca = pagosCerca(m);
      if (cerca.length) {
        var otros = el("article", "tarjeta det-otros"), ul = el("ul", "lista-simple");
        otros.append(el("span", "titulo-det", "Otros pagos en este lugar"));
        cerca.slice().sort(function (a, b) { return new Date(b.fecha) - new Date(a.fecha); }).slice(0, 8).forEach(function (o) {
          var oc = categoria(o.categoria_id) || { nombre: "Sin categoría", icono: "otro" }, li = el("li", "mov"), t2 = el("div", "mov-texto"), v = el("div", "mov-valor");
          t2.append(el("strong", null, o.descripcion), el("small", null, fechaCorta.format(new Date(o.fecha)) + " de " + new Date(o.fecha).getFullYear() + " · " + oc.nombre));
          v.append(el("strong", o.tipo === "ingreso" ? "positivo" : null, dineroSigno(num(o.monto), o.tipo)));
          li.tabIndex = 0; li.append(pintarIcono(el("span", "mov-icono chico"), oc), t2, v);
          li.addEventListener("click", function () { detalleId = o.id; pintarDetalle(); document.querySelector("#pantalla-detalle").scrollTop = 0; });
          ul.append(li);
        });
        otros.append(ul); cont.append(otros);
      }
    } else {
      var sin = el("article", "tarjeta"), ayuda = el("p", "nota");
      ayuda.textContent = datos.perfil.guardar_ubicacion ? "Este pago no tiene ubicación." : "Para ver el mapa de tus compras, activa «Guardar ubicación» en Ajustes. Solo se guarda la de los pagos nuevos que anotes.";
      sin.append(el("strong", null, "📍 Sin ubicación"), ayuda);
      if (!datos.perfil.guardar_ubicacion) {
        var act = el("button", "primario", "Activar la ubicación"); act.type = "button";
        act.addEventListener("click", function () { guardarPerfil({ guardar_ubicacion: true }, "exportar-mensaje", "").then(function () { toast("Ubicación activada: los próximos pagos la guardan"); pintarDetalle(); }); });
        sin.append(act);
      }
      cont.append(sin);
    }
  }

  // ---------- Entrada rápida ----------
  function opcionesCategoria(tipo, elegida) {
    var sel = $("previa-categoria");
    sel.replaceChildren();
    var nombres = datos.categorias.filter(function (c) { return c.tipo === tipo; }).map(function (c) { return c.nombre; });
    if (elegida && nombres.indexOf(elegida) < 0) nombres.push(elegida);
    nombres.sort().forEach(function (n) { var o = el("option", null, n); o.value = n; o.selected = n === elegida; sel.append(o); });
  }

  // ---------- IA (Gemini, a través de la función nova-ia de Supabase) ----------
  // Se usa con sesión iniciada. Si todavía no hay clave, se acabó la cuota gratis del día
  // o algo falla, la app sigue con su propio intérprete y su propio lector de recibos.
  var iaActiva = true;
  function iaDisponible() { return iaActiva && enLinea() && !!cliente && !!fuente && !fuente.demo; }
  function hoyLocal() { return A.claveDia(new Date()); }
  function invocarIA(cuerpo) {
    if (!enLinea()) return Promise.reject(new Error("Sin internet: la IA necesita conexión. Todo lo demás de NOVA sigue funcionando sin internet."));
    // Si la IA no contesta en 50 segundos, se avisa en vez de dejar "Pensando…" para siempre.
    var tiempo = new Promise(function (_, mal) { setTimeout(function () { mal(new Error("La IA tardó demasiado. Revisa tu conexión e intenta otra vez.")); }, 50000); });
    var llamada = cliente.functions.invoke("nova-ia", { body: cuerpo }).then(function (res) {
      if (res.error) {
        var estado = res.error.context && res.error.context.status;
        if (estado === 503) iaActiva = false; // la clave de Gemini todavía no está puesta
        var lanzar = function (detalle) {
          var err = new Error(estado === 503 ? "La IA todavía no tiene su clave de Google en Supabase."
            : estado === 429 ? "Se acabó el cupo gratis de la IA por hoy. Intenta mañana."
            : "La IA no pudo responder. Intenta otra vez en un momento." + (detalle ? " (" + detalle + ")" : ""));
          err.estado = estado;
          throw err;
        };
        // La función manda en "detalle" qué modelo falló, para saber la causa.
        if (res.error.context && typeof res.error.context.json === "function") {
          return res.error.context.json().then(function (c) { lanzar(c && c.detalle); }, function () { lanzar(""); });
        }
        return lanzar("");
      }
      iaActiva = true;
      return res.data || {};
    });
    return Promise.race([llamada, tiempo]);
  }
  // Respuesta en vivo del chat: el texto aparece a medida que la IA lo escribe (no hay que esperar a que termine).
  function mensajeDeFalloIA(estado, detalle) {
    return estado === 503 ? "La IA todavía no tiene su clave de Google en Supabase."
      : estado === 429 ? "Se acabó el cupo gratis de la IA por hoy. Intenta mañana."
      : "La IA no pudo responder. Intenta otra vez en un momento." + (detalle ? " (" + detalle + ")" : "");
  }
  function preguntarEnFlujo(cuerpo, alTexto, externo) {
    if (!enLinea()) return Promise.reject(new Error("Sin internet: la IA necesita conexión. Todo lo demás de NOVA sigue funcionando sin internet."));
    return cliente.auth.getSession().then(function (s) {
      var token = s.data && s.data.session && s.data.session.access_token;
      if (!token) throw new Error("Vuelve a iniciar sesión para usar la IA.");
      var control = new AbortController(), aviso = setTimeout(function () { control.abort(); }, 50000);
      if (externo) externo.signal.addEventListener("abort", function () { control.abort(); });
      return fetch(cfg.supabaseUrl + "/functions/v1/nova-ia", {
        method: "POST", signal: control.signal,
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, apikey: cfg.supabaseKey },
        body: JSON.stringify(Object.assign({ stream: true }, cuerpo))
      }).then(function (r) {
        if (!r.ok) {
          return r.json().catch(function () { return {}; }).then(function (c) {
            if (r.status === 503) iaActiva = false;
            throw new Error(mensajeDeFalloIA(r.status, c && c.detalle));
          });
        }
        if (!r.body || !r.body.getReader) return r.text().then(function (t) { alTexto(t); return t; });
        var lector = r.body.getReader(), dec = new TextDecoder(), acum = "";
        function leer() {
          return lector.read().then(function (x) {
            if (x.done) return acum + dec.decode();
            acum += dec.decode(x.value, { stream: true });
            alTexto(acum);
            return leer();
          });
        }
        return leer();
      }).catch(function (e) {
        if (e && e.name === "AbortError") throw new Error("La IA tardó demasiado. Revisa tu conexión e intenta otra vez.");
        throw e;
      }).finally(function () { clearTimeout(aviso); });
    });
  }
  function registroDeIA(d) {
    var fecha = new Date();
    fecha.setDate(fecha.getDate() - ({ ayer: 1, anteayer: 2 }[d.dia] || 0));
    var base = Parser.CATEGORIAS.find(function (c) { return c.nombre === d.categoria; });
    return { ok: true, ia: true, tipo: d.tipo === "ingreso" ? "ingreso" : "gasto", monto: d.monto, categoria: d.categoria,
             icono: base ? base.icono : "otro", descripcion: d.descripcion || d.categoria, fecha: fecha.toISOString(),
             etiquetas: Array.isArray(d.etiquetas) ? d.etiquetas : [] };
  }
  function cuerpoIA(extra) { return Object.assign({ categorias: datos.categorias.map(function (c) { return c.nombre; }), hoy: hoyLocal() }, extra); }
  function preguntarIA(entrada) {
    if (!iaDisponible()) return Promise.reject(new Error("IA no disponible"));
    return invocarIA(cuerpoIA(entrada)).then(function (d) {
      if (!(d.monto > 0)) throw new Error("La IA no encontró el valor");
      return registroDeIA(d);
    });
  }

  // ---------- NOVA IA: conversaciones guardadas ----------
  // Cada pregunta lleva un resumen de los datos de la persona; la conversación se guarda en su cuenta.
  var chatActual = { id: null, titulo: "", mensajes: [] };
  function contextoFinanzas() {
    var ciclo = cicloEfectivo(), rango = Periodos.periodo(ciclo), t = A.totales(A.enRango(datos.movimientos, rango)), p = datos.perfil;
    var hace90 = new Date(Date.now() - 90 * 86400000);
    var b = presupuestoActual(), seguro = b.limite > 0 ? A.seguroParaGastar(b.limite, b.gastado, b.rango) : null;
    var contexto = {
      hoy: hoyLocal(),
      saldo_en_cuentas: saldoTotal(),
      cuentas: datos.cuentas.map(function (c) { return { nombre: c.nombre, saldo: saldoCuenta(c) }; }),
      periodo_actual: {
        nombre: A.nombrePeriodo(ciclo, rango), ingresos: t.ingresos, gastos: t.gastos,
        gastos_por_categoria: A.porCategoria(A.enRango(datos.movimientos, rango)).map(function (f) { return { categoria: nombreCategoria(f.id), total: f.total }; })
      },
      gastos_por_mes: A.serie(datos.movimientos, "mensual", new Date(), 6).map(function (x) { return { mes: x.etiqueta, ingresos: x.ingresos, gastos: x.gastos }; }),
      gastos_por_categoria_90_dias: A.porCategoria(datos.movimientos.filter(function (m) { return new Date(m.fecha) >= hace90; }))
        .map(function (f) { return { categoria: nombreCategoria(f.id), total: f.total }; }),
      seguro_para_gastar_por_dia: seguro ? Math.round(seguro.porDia) : null,
      metas: datos.metas.map(function (m) { return { nombre: m.nombre, objetivo: num(m.objetivo), ahorrado: num(m.ahorrado) }; }),
      limites: datos.limites.map(function (l) { var e = estadoLimite(l); return { categoria: l.categoria_id != null ? nombreCategoria(l.categoria_id) : "todas", ciclo: l.ciclo, limite: num(l.monto), gastado: e.gastado }; }),
      programados: datos.programados.filter(function (x) { return x.activo; }).map(function (x) { return { descripcion: x.descripcion, tipo: x.tipo, monto: num(x.monto), frecuencia: x.frecuencia, proxima: x.proxima }; }),
      movimientos_recientes: datos.movimientos.slice(0, 150).map(function (m) {
        var o = { fecha: A.claveDia(m.fecha), tipo: m.tipo, monto: num(m.monto), descripcion: m.descripcion,
                  categoria: nombreCategoria(m.categoria_id), etiquetas: m.etiquetas || [], estado: m.estado || "pagado" };
        if (m.moneda && m.moneda !== monedaBase() && num(m.monto_original) > 0) { o.moneda = m.moneda; o.monto_original = num(m.monto_original); }
        return o;
      })
    };
    if (p.presupuesto_monto) {
      contexto.presupuesto = { ciclo: ciclo, limite: num(p.presupuesto_monto), gastado: gastadoEn(rango),
                               desde: A.claveDia(rango.desde), hasta: A.claveDia(new Date(rango.hasta.getTime() - 1)) };
    }
    if (conductor()) {
      var nombreDe = function (f) { return { nombre: nombreCategoria(f.id), total: f.total }; };
      contexto.trabajo = { vehiculo: p.vehiculo || null, meta_diaria: p.meta_diaria ? num(p.meta_diaria) : null };
      ["hoy", "semana", "mes"].forEach(function (cual) {
        var r = A.resumenTrabajo(datos.movimientos, datos.categorias, A.rangoJornada(cual));
        contexto.trabajo[cual] = { ganado: r.ingresos, gastos_de_operacion: r.operacion, papeles_y_cuotas: r.fijos, ganancia_neta_de_trabajar: r.netoOperativo, ganancia_despues_de_papeles_y_cuotas: r.neto, viajes: r.viajes, ganancia_por_viaje: r.porViaje ? Math.round(r.porViaje) : null,
          por_app: r.porPlataforma.map(function (x) { return { app: nombreCategoria(x.id), total: x.total, viajes: x.viajes }; }), gastos_por_categoria: r.gastosPorCategoria.map(nombreDe) };
      });
      contexto.trabajo.vencimientos = datos.documentos.map(function (d) { var e = A.estadoDocumento(d); return { nombre: d.nombre, vence: String(d.vence).slice(0, 10), dias: e.dias, costo: d.costo ? num(d.costo) : null }; });
    }
    var rd = resumenDeDeudas();
    if (rd.lista.length) {
      contexto.deudas = { yo_debo_total: rd.debo, me_deben_total: rd.meDeben, pendientes: rd.lista.filter(function (x) { return x.falta > 0; }).slice(0, 15).map(function (x) {
        return { tipo: x.deuda.tipo === "debo" ? "yo debo" : "me deben", persona: x.deuda.persona, total: x.total, abonado: x.abonado, falta: x.falta, vence: x.deuda.vence ? String(x.deuda.vence).slice(0, 10) : null };
      }) };
    }
    return contexto;
  }

  function haceTiempo(f) {
    var min = Math.max(0, Math.round((Date.now() - new Date(f).getTime()) / 60000));
    if (min < 1) return "ahora";
    if (min < 60) return "hace " + min + (min === 1 ? " minuto" : " minutos");
    var h = Math.round(min / 60);
    if (h < 24) return "hace " + h + (h === 1 ? " hora" : " horas");
    var d = Math.round(h / 24);
    return d < 30 ? "hace " + d + (d === 1 ? " día" : " días") : fechaCorta.format(new Date(f));
  }
  function pintarIA() {
    var ul = $("lista-chats"), q = A.sinTildes($("chat-buscar").value);
    ul.replaceChildren();
    var lista = datos.conversaciones.filter(function (c) { return !q || A.sinTildes(c.titulo).indexOf(q) >= 0; });
    if (!lista.length) {
      ul.append(el("li", "vacio", datos.conversaciones.length ? "No hay conversaciones con ese nombre."
        : "Todavía no tienes conversaciones. Toca el lápiz de arriba para preguntarle algo a NOVA IA."));
    }
    lista.forEach(function (c) {
      var li = el("li", "chat-fila");
      li.tabIndex = 0; li.setAttribute("role", "button");
      var txt = el("span", "mov-texto"); txt.append(el("strong", null, c.titulo), el("small", null, haceTiempo(c.actualizado_en || c.creado_en)));
      li.append(txt, el("span", "flecha", "›"));
      li.addEventListener("click", function () { abrirChat(c); });
      li.addEventListener("keydown", function (e) { if (e.key === "Enter") abrirChat(c); });
      ul.append(li);
    });
  }
  $("chat-buscar").addEventListener("input", pintarIA);
  $("btn-chat-nuevo").addEventListener("click", function () { abrirChat(null); });

  // Preguntas sugeridas con los datos de la persona (como las de la app de referencia).
  function sugerenciasChat() {
    var lista = conductor() ? ["¿Cuánto he ganado hoy con las apps?", "¿Cuál app me deja más por viaje?", "¿Cuánto me queda libre esta semana después de gasolina y gastos?"] : ["¿Cuál fue mi gasto más grande este período?"];
    if (conductor() && documentosPorVencer().length) lista.push("¿Qué documentos de mi vehículo se me vencen pronto?");
    var hace90 = new Date(Date.now() - 90 * 86400000);
    var top = A.porCategoria(datos.movimientos.filter(function (m) { return new Date(m.fecha) >= hace90; }))[0];
    lista.push(top && top.id != null ? "¿Cuánto he gastado en " + nombreCategoria(top.id) + " los últimos 3 meses?" : "¿En qué gasto más este mes?");
    var b = presupuestoActual(), seguro = b.limite > 0 ? A.seguroParaGastar(b.limite, b.gastado, b.rango) : null;
    lista.push(seguro && seguro.porDia >= 1000 ? "¿Puedo gastar " + pesos.format(Math.round(seguro.porDia / 1000) * 1000) + " hoy sin afectar mi presupuesto?" : "¿Cuánto me queda del presupuesto?");
    if (!conductor()) lista.push("¿Qué puedo hacer para ahorrar más?");
    if (datos.metas.length) lista.push("¿Cómo voy con mis metas?");
    if (datos.programados.some(function (x) { return x.activo; })) lista.push("¿Qué pagos tengo programados?");
    return lista;
  }


  // ---------- Texto de NOVA IA: cuadros (tablas), fuentes y precio ----------
  // La IA puede responder con un cuadro (filas con | entre columnas), con las páginas de internet que usó
  // ([[FUENTE:título|enlace]]) y, si la pregunta es de una compra, con el precio que encontró ([[PRECIO:valor|producto]]).
  // Esas marcas no se muestran: se quitan del texto y se usan para las fuentes y el cuadro «¿Me alcanza?».
  function marcasIA(texto) {
    var t = String(texto || ""), precio = null, producto = "", fuentes = [];
    t = t.replace(/\[\[PRECIO:\s*([\d.,]+)\s*(?:\|([^\]]*))?\]\]/g, function (_m, v, n) { precio = Number(String(v).replace(/[.,]/g, "")); producto = (n || "").trim(); return ""; });
    t = t.replace(/\[\[FUENTE:([^|\]]*)\|([^\]\s]+)\]\]/g, function (_m, titulo, url) { if (/^https:\/\//.test(url) && fuentes.length < 5 && !fuentes.some(function (f) { return f.url === url; })) fuentes.push({ titulo: titulo.trim() || url, url: url }); return ""; });
    t = t.replace(/\[\[[^\]]*$/, "");                 // una marca a medio llegar (mientras la respuesta va en vivo)
    t = t.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#{1,6}\s*/gm, "").replace(/\n{3,}/g, "\n\n").trim();
    return { texto: t, precio: precio > 0 ? precio : null, producto: producto, fuentes: fuentes };
  }
  function esFilaTabla(linea) { var l = linea.trim(); return l.indexOf("|") >= 0 && l.replace(/^\||\|$/g, "").split("|").length >= 2; }
  function pintarTextoIA(li, crudo) {
    var m = marcasIA(crudo), lineas = m.texto.split("\n"), i = 0, parrafo = [];
    li.replaceChildren();
    function soltarParrafo() { if (parrafo.length) { li.append(el("span", "ia-parrafo", parrafo.join("\n"))); parrafo = []; } }
    while (i < lineas.length) {
      if (esFilaTabla(lineas[i])) {
        soltarParrafo();
        var filas = [];
        while (i < lineas.length && esFilaTabla(lineas[i])) {
          var celdas = lineas[i].trim().replace(/^\||\|$/g, "").split("|").map(function (c) { return c.trim(); });
          if (!celdas.every(function (c) { return /^:?-{2,}:?$/.test(c) || c === ""; })) filas.push(celdas);   // la línea |---|---| no se muestra
          i++;
        }
        var cont = el("div", "ia-tabla-caja"), tabla = el("table", "ia-tabla");
        filas.forEach(function (f, n) {
          var tr = el("tr");
          f.forEach(function (c) { tr.append(el(n === 0 ? "th" : "td", /^[-−+]?\$?\s?[\d.,]+\s?%?$/.test(c) ? "num" : null, c)); });
          tabla.append(tr);
        });
        cont.append(tabla); li.append(cont);
        continue;
      }
      parrafo.push(lineas[i]); i++;
    }
    soltarParrafo();
    if (m.fuentes.length) {
      var f = el("div", "ia-fuentes");
      f.append(el("small", null, "🌐 Busqué en internet:"));
      m.fuentes.forEach(function (x) {
        var a = el("a", null, x.titulo.replace(/^www\./, "")); a.href = x.url; a.target = "_blank"; a.rel = "noopener";
        f.append(a);
      });
      li.append(f);
    }
    return m;
  }

  // ---------- ¿Me alcanza? ----------
  // Cuadro debajo de la respuesta cuando la pregunta es de una compra: el precio (el que la IA encontró en internet, o
  // el que la persona escribió), el saldo, lo que le sobra en un mes normal y si le alcanza o en cuántos meses lo junta.
  var PREGUNTA_COMPRA = /alcanza|puedo comprar|me puedo comprar|me compro|comprarme|darme el gusto|ahorrar para|cu[aá]nto me demoro/i;
  function nombreDeCompra(pregunta) {
    var p = String(pregunta || "").replace(/[¿?¡!]/g, "").trim();
    var m = p.match(/(?:para (?:comprar(?:me)? )?|comprar(?:me)? |me compro |ahorrar para )(?:un |una |el |la |los |las |unos |unas )?(.+)$/i);
    var n = (m ? m[1] : p).replace(/\s+(de|por|que cuesta|que vale|en)\s+\$?\s?[\d.,]+.*$/i, "").replace(/\s+(este|esta|el próximo|el proximo)\s+(mes|año|semana).*$/i, "").trim();
    n = n.charAt(0).toUpperCase() + n.slice(1);
    return n.slice(0, 40) || "esa compra";
  }
  function tarjetaAlcanza(pregunta, respuesta) {
    var m = marcasIA(respuesta), precio = m.precio, deInternet = !!precio;
    if (!PREGUNTA_COMPRA.test(pregunta) && !precio) return null;
    if (!precio) { var r = Parser.interpretar(pregunta); if (r.ok && r.monto >= 1000) precio = r.monto; }
    if (!precio) return null;
    var nombre = m.producto || nombreDeCompra(pregunta), a = A.alcanza(precio, datos.movimientos, saldoTotal(), new Date());
    var li = el("li", "nova tarjeta-ia alcanza-tarjeta " + a.veredicto);
    li.append(el("small", "tia-titulo", "¿Te alcanza para " + nombre + "?"));
    li.append(el("strong", "alc-veredicto", { si: "✅ Sí te alcanza", justo: "⚠️ Te alcanza, pero quedas justo", no: "❌ Todavía no te alcanza" }[a.veredicto]));
    var tabla = el("table", "ia-tabla alc-tabla");
    function fila(n, v, clase) { var tr = el("tr", clase || null); tr.append(el("td", null, n), el("td", "num", v)); tabla.append(tr); }
    fila("Precio" + (deInternet ? " (internet)" : ""), dinero(precio));
    fila("Tu saldo en cuentas", dinero(a.saldo));
    if (a.veredicto === "no") fila("Te faltan", dinero(a.faltan), "malo");
    else fila("Te quedaría", dinero(a.quedaria), a.veredicto === "justo" ? "malo" : "bueno");
    if (a.mesesConDatos) {
      fila("Te sobra en un mes normal", (a.ahorroMes < 0 && !ocultos ? "−" : "") + dinero(Math.abs(a.ahorroMes)));
      fila("Gastas en un mes normal", dinero(a.gastoMes));
    }
    if (a.meses) fila("Lo juntas en", a.meses + (a.meses === 1 ? " mes" : " meses") + " (" + new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" }).format(new Date(a.cuando)) + ")", "bueno");
    li.append(tabla);
    var barra = el("div", "barra alc-barra"), lleno = el("span");
    lleno.style.width = Math.max(2, Math.min(100, a.saldo > 0 ? (a.saldo / precio) * 100 : 0)) + "%";
    barra.append(lleno);
    li.append(barra, el("small", "nota", Math.min(100, Math.round(a.saldo > 0 ? (a.saldo / precio) * 100 : 0)) + "% del precio ya lo tienes en tus cuentas."));
    var consejo = a.veredicto === "si" ? "Puedes comprarlo y seguir con un mes de gastos de respaldo. Igual compara precios antes de pagar."
      : a.veredicto === "justo" ? "Si lo compras ya, te quedas con menos de lo que gastas en un mes. Mejor junta un poco más o busca una cuota sin intereses."
      : a.meses ? "Ahorrando lo que te sobra cada mes, lo tienes en " + a.meses + (a.meses === 1 ? " mes" : " meses") + ". Crea una meta y NOVA te va mostrando cuánto llevas."
      : !a.mesesConDatos ? "Cuando NOVA tenga tus ingresos y gastos de los meses pasados te dirá en cuánto tiempo lo juntas."
      : "Hoy gastas más de lo que te entra, así que no alcanzas a ahorrar para esto. Mira en Análisis dónde puedes recortar.";
    li.append(el("p", "nota alc-consejo", consejo));
    if (deInternet) li.append(el("small", "nota", "El precio lo buscó NOVA IA en internet: puede cambiar según la tienda y el día."));
    var acc = el("div", "tia-acciones");
    if (a.veredicto !== "si") {
      var b = el("button", "tia-accion", "🎯 Crear meta: " + nombre); b.type = "button";
      b.addEventListener("click", function () {
        b.disabled = true;
        var meta = { nombre: nombre, objetivo: precio };
        if (a.cuando) meta.fecha_limite = A.claveDia(new Date(a.cuando));
        fuente.crear("metas", meta).then(function (n) {
          datos.metas.push(n); pintar();
          b.textContent = "✓ Meta creada"; toast("🎯 Meta creada", nombre + " · " + dinero(precio));
        }).catch(function (e) { b.disabled = false; toast("No se pudo crear la meta", e.message); });
      });
      acc.append(b);
    }
    var v = el("button", "tia-accion", "📊 Ver mis metas"); v.type = "button";
    v.addEventListener("click", function () { cerrarCapa(); setTimeout(function () { ir("planes"); }, 80); });
    acc.append(v);
    li.append(acc);
    return li;
  }

  // Tarjeta debajo de una respuesta de NOVA IA: el número, un gráfico, los movimientos detrás y botones para actuar.
  function tarjetaIA(pregunta, respuesta) {
    var compra = tarjetaAlcanza(pregunta, respuesta);
    if (compra) return compra;
    var t = NovaRespuestas.tarjeta(pregunta, datos, new Date());
    if (!t) return null;
    var li = el("li", "nova tarjeta-ia");
    li.append(el("small", "tia-titulo", t.titulo), el("strong", "tia-total", (t.tipo === "ingreso" && t.total > 0 && !ocultos ? "+" : "") + dinero(t.total)),
      el("small", "nota", t.cantidad ? t.cantidad + (t.cantidad === 1 ? " movimiento" : " movimientos") : "No hay movimientos en ese periodo."));
    var max = Math.max.apply(null, t.serie.map(function (x) { return x.valor; }).concat([1]));
    if (t.total > 0 && t.porCategoria) {
      var ul = el("ul", "tia-barras");
      t.serie.forEach(function (x) {
        var fila = el("li"), barra = el("span", "tia-barra-h"), r = el("i");
        r.style.width = Math.max(3, (x.valor / max) * 100) + "%"; barra.append(r);
        fila.append(el("span", "tia-cat", x.etiqueta), barra, el("small", null, dinero(x.valor)));
        ul.append(fila);
      });
      li.append(ul);
    } else if (t.total > 0 && t.serie.length > 1) {
      var g = el("div", "tia-grafico" + (t.tipo === "ingreso" ? " ingreso" : ""));
      g.style.gridTemplateColumns = "repeat(" + t.serie.length + ", minmax(0, 1fr))";
      g.setAttribute("role", "img");
      g.setAttribute("aria-label", t.serie.map(function (x) { return x.etiqueta + ": " + dinero(x.valor); }).join(", "));
      t.serie.forEach(function (x) {
        var c = el("div", "tia-col"), b = el("span");
        b.style.height = (x.valor > 0 ? Math.max(6, (x.valor / max) * 100) : 0) + "%";
        b.title = x.etiqueta + ": " + dinero(x.valor);
        var caja = el("div", "tia-caja"); caja.append(b);
        c.append(caja, el("small", null, t.serie.length > 12 && t.serie.indexOf(x) % 2 ? "" : x.etiqueta));
        g.append(c);
      });
      li.append(g);
    }
    if (t.movimientos.length) {
      var lista = el("ul", "lista-mov tia-movs");
      t.movimientos.forEach(function (m) { lista.append(filaMovimiento(m, true)); });
      li.append(el("small", "tia-sub", t.cantidad > t.movimientos.length ? "Los " + t.movimientos.length + " más grandes" : "Los movimientos detrás del número"), lista);
    }
    var acc = el("div", "tia-acciones"), filtroBusqueda = {
      tipo: t.tipo, categoriaId: t.categoriaId, desde: A.claveDia(t.periodo.desde), hasta: A.claveDia(new Date(t.periodo.hasta.getTime() - 1))
    };
    function boton(texto, fn) { var b = el("button", "tia-accion", texto); b.type = "button"; b.addEventListener("click", fn); acc.append(b); }
    t.acciones.forEach(function (a) {
      if (a === "limite") boton("➕ Crear un límite para " + t.categoriaNombre, function () {
        abrirLimite(null); limiteCategoria = t.categoriaId; pintarLimiteCategoria();
      });
      if (a === "buscar") boton("🔎 Ver los movimientos", function () { cerrarCapa(); setTimeout(function () { abrirBusqueda(filtroBusqueda); }, 80); });
      if (a === "calendario") boton("📅 Ver en el calendario", function () {
        cerrarCapa(); setTimeout(function () { abrirBusqueda(filtroBusqueda); abrirCalendario("buscar"); }, 80);
      });
    });
    if (acc.childNodes.length) li.append(acc);
    return li;
  }
  function burbuja(clase, texto) {
    var li = el("li", clase, texto);
    $("chat").append(li);
    li.scrollIntoView({ block: "nearest" });
    return li;
  }
  function pintarChat() {
    $("chat").replaceChildren();
    chatActual.mensajes.forEach(function (m, i) {
      var li = el("li", m.rol === "usuario" ? "yo" : "nova");
      if (m.rol === "usuario") li.textContent = m.texto; else pintarTextoIA(li, m.texto);
      $("chat").append(li);
      // Debajo de cada respuesta, la tarjeta con los números de la pregunta (se calcula de nuevo con los datos de hoy).
      var antes = chatActual.mensajes[i - 1];
      if (m.rol !== "usuario" && antes && antes.rol === "usuario") { var t = tarjetaIA(antes.texto, m.texto); if (t) $("chat").append(t); }
    });
    $("chat-bienvenida").hidden = chatActual.mensajes.length > 0;
    $("chat-titulo").textContent = chatActual.titulo || "Nueva conversación";
    $("chat-borrar").hidden = !chatActual.id;
    var sug = $("chat-sugerencias");
    sug.replaceChildren();
    sugerenciasChat().forEach(function (t) {
      var b = el("button", "sugerencia", t); b.type = "button";
      b.addEventListener("click", function () { preguntarNova(t); });
      sug.append(b);
    });
  }
  function abrirChat(conv) {
    chatActual = conv ? { id: conv.id, titulo: conv.titulo, mensajes: (conv.mensajes || []).slice() } : { id: null, titulo: "", mensajes: [] };
    mensaje("chat-mensaje", "");
    $("chat-pregunta").value = "";
    pintarChat();
    abrirCapa("pantalla-chat");
    var ol = $("chat"); setTimeout(function () { ol.scrollTop = ol.scrollHeight; }, 30);
  }
  function reiniciarChat() {
    chatActual = { id: null, titulo: "", mensajes: [] };
    $("chat-buscar").value = "";
  }
  // Guarda en orden: así una pregunta rápida tras otra no crea dos conversaciones.
  function guardarConversacion() {
    var chat = chatActual;
    chat.guardando = (chat.guardando || Promise.resolve()).catch(function () { /* el intento anterior ya avisó */ }).then(function () { return guardarConversacionYa(chat); });
    return chat.guardando;
  }
  function guardarConversacionYa(chat) {
    var mensajes = chat.mensajes.slice(-40).map(function (m) { return { rol: m.rol, texto: String(m.texto).slice(0, 4000) }; });
    var ahora = new Date().toISOString();
    if (chat.id) {
      var c = datos.conversaciones.find(function (x) { return x.id === chat.id; });
      return fuente.actualizar("conversaciones", chat.id, { mensajes: mensajes, actualizado_en: ahora }).then(function (n) {
        if (c) Object.assign(c, n);
        datos.conversaciones.sort(function (a, b) { return new Date(b.actualizado_en) - new Date(a.actualizado_en); });
      });
    }
    var titulo = chat.mensajes[0].texto.replace(/\s+/g, " ").trim().slice(0, 60) || "Conversación";
    return fuente.crear("conversaciones", { titulo: titulo, mensajes: mensajes, actualizado_en: ahora }).then(function (c) {
      datos.conversaciones.unshift(c);
      chat.id = c.id; chat.titulo = c.titulo;
      if (chat === chatActual) { $("chat-titulo").textContent = c.titulo; $("chat-borrar").hidden = false; }
      pintarIA();
    });
  }
  $("chat-borrar").addEventListener("click", function () {
    var id = chatActual.id;
    if (!id || !confirm("¿Borrar esta conversación?")) return;
    fuente.borrar("conversaciones", id).then(function () {
      datos.conversaciones = datos.conversaciones.filter(function (c) { return c.id !== id; });
      reiniciarChat(); cerrarCapa(); pintarIA(); toast("Conversación borrada");
    }).catch(function (e) { mensaje("chat-mensaje", e.message, true); });
  });

  var chatToken = 0, chatControl = null;
  function preguntarNova(pregunta) {
    pregunta = String(pregunta || "").trim();
    if (!pregunta) return;
    if (!cliente || !fuente || fuente.demo) {
      // En la demostración la IA no responde, pero la tarjeta con los números sí sale.
      var tDemo = tarjetaIA(pregunta);
      $("chat-bienvenida").hidden = true;
      burbuja("yo", pregunta); $("chat-pregunta").value = "";
      if (tDemo) { burbuja("nova", "En la demostración la IA no escribe respuestas, pero mira tus números:"); $("chat").append(tDemo); tDemo.scrollIntoView({ block: "nearest" }); }
      mensaje("chat-mensaje", "Inicia sesión con tu cuenta para que la IA te responda.", !tDemo);
      return;
    }
    // Si todavía hay una pregunta esperando, se cancela: así nunca se queda trabado.
    if (chatControl) { try { chatControl.abort(); } catch (e) { /* ya terminó */ } }
    var mio = ++chatToken, control = chatControl = new AbortController();
    var chat = chatActual;
    $("chat-bienvenida").hidden = true;
    mensaje("chat-mensaje", "");
    $("chat").querySelectorAll("li.pensando").forEach(function (x) { x.remove(); });
    burbuja("yo", pregunta);
    $("chat-pregunta").value = "";
    var espera = burbuja("nova pensando", "✦ Pensando…");
    var historial = chat.mensajes.slice(-6);
    // La pregunta se guarda de una vez: aunque la IA falle o tarde, queda en tu historial.
    chat.mensajes.push({ rol: "usuario", texto: pregunta });
    var guardada = guardarConversacion().catch(function () { mensaje("chat-mensaje", "La pregunta no se pudo guardar en tu historial, pero puedes seguir chateando.", true); });
    Promise.resolve().then(function () {
      return preguntarEnFlujo({ pregunta: pregunta, historial: historial, contexto: contextoFinanzas() }, function (texto) {
        if (mio !== chatToken) return;
        pintarTextoIA(espera, texto);
        espera.classList.remove("pensando");
        espera.scrollIntoView({ block: "nearest" });
      }, control);
    }).then(function (respuesta) {
      if (mio !== chatToken) return;
      respuesta = (respuesta || "").trim();
      if (!respuesta) throw new Error("La IA no pudo responder. Intenta otra vez en un momento.");
      pintarTextoIA(espera, respuesta);
      espera.classList.remove("pensando");
      var tar = tarjetaIA(pregunta, respuesta);
      if (tar) { espera.after(tar); tar.scrollIntoView({ block: "nearest" }); }
      chat.mensajes.push({ rol: "nova", texto: respuesta });
      return guardada.then(function () { return guardarConversacion(); }).catch(function () { mensaje("chat-mensaje", "La respuesta no se pudo guardar en tu historial, pero puedes seguir chateando.", true); }).then(pintarIA);
    }).catch(function (e) {
      if (mio !== chatToken) return;
      espera.remove();
      mensaje("chat-mensaje", (e && e.message) || "No se pudo responder. Intenta otra vez.", true);
      $("chat-pregunta").value = pregunta;      // para reintentar con un toque
    }).finally(function () { if (mio === chatToken) chatControl = null; });
  }
  $("chat-pregunta").addEventListener("focus", function () { setTimeout(function () { try { $("chat-pregunta").scrollIntoView({ block: "center" }); } catch (e) { /* sin scroll */ } }, 350); });
  $("form-chat").addEventListener("submit", function (e) { e.preventDefault(); preguntarNova($("chat-pregunta").value); });

  var consulta = 0;
  $("form-rapido").addEventListener("submit", function (e) {
    e.preventDefault();
    var texto = $("entrada-rapida").value, id = ++consulta;
    var deBanco = NovaConsejos.mensajeBancoATexto(texto);          // mensaje de un banco pegado: se convierte en una frase simple
    if (deBanco) { texto = deBanco; $("entrada-rapida").value = deBanco; }
    var local = Parser.interpretar(texto);
    if (!texto.trim() || !iaDisponible()) return terminar(local);
    var enviar = e.target.querySelector("button[type=submit]");
    enviar.disabled = true;
    mensaje("rapido-mensaje", "✦ La IA está leyendo…");
    preguntarIA({ texto: texto }).then(function (r) {
      // Las etiquetas escritas con # siempre se respetan.
      (local.etiquetas || []).forEach(function (t) { if (r.etiquetas.indexOf(t) < 0) r.etiquetas.push(t); });
      // En otra moneda ("20 dólares") el valor sale de la frase tal cual: la IA lee todo como pesos.
      if (Mon.detectar(texto) && local.ok && local.monto > 0) r.monto = local.monto;
      return r;
    }).catch(function () { return local; }).then(function (r) {
      enviar.disabled = false;
      if (id === consulta) terminar(r);
    });
    function terminar(r) {
      if (!r.ok) { mensaje("rapido-mensaje", r.error, true); $("vista-previa").hidden = true; bancoEnCurso = null; return; }
      mensaje("rapido-mensaje", "");
      // Viene de un aviso del banco: se guarda con la fecha del aviso y en la cuenta de ese banco.
      if (bancoEnCurso && bancoEnCurso.frase === texto) { r.fecha = bancoEnCurso.fecha; r.cuentaId = bancoEnCurso.cuentaId; r.origenBanco = bancoEnCurso.origen; }
      bancoEnCurso = null;
      var mon = Mon.detectar(texto);
      // En un espacio en dólares, euros… los centavos cuentan: "taxi 12.5" es 12,50 y no 13.
      if (!mon && monedaBase() !== "COP" && local.ok && local.montoExacto > 0) r.monto = local.montoExacto;
      if (mon && mon !== monedaBase()) {
        r.moneda = mon; r.montoOriginal = local.ok && local.montoExacto > 0 ? local.montoExacto : r.monto;
        if (local.ok && !r.ia) r.descripcion = local.descripcion;
        else r.descripcion = String(r.descripcion || "").replace(/(?<![\p{L}\d])(d[oó]lares?|euros?|usd|eur|us\$)(?![\p{L}\d])/giu, " ").replace(/\s+/g, " ").trim() || r.categoria;
      }
      mostrarPrevia(r);
    }
  });

  function mostrarPrevia(r) {
    pendiente = r;
    $("previa-ia").hidden = !r.ia;
    var chip = $("previa-tipo");
    chip.textContent = r.tipo === "ingreso" ? "Ingreso" : "Gasto";
    chip.className = "chip " + r.tipo;
    $("previa-monto").textContent = pesos.format(r.monto);
    // Un pago en otra moneda llega convertido con la tasa del día, listo para guardar.
    if (r.moneda) {
      r.listo = false;
      $("previa-monto").textContent = Mon.formatoMonto(r.montoOriginal, r.moneda) + " = …";
      cargarTasas().then(function (t) {
        if (pendiente !== r) return;
        var tasa = t ? tasaABase(r.moneda, t.rates) : null;
        if (tasa > 0) { r.tasa = tasa; r.monto = aBase(r.montoOriginal, tasa); r.listo = true; }
        $("previa-monto").textContent = Mon.formatoMonto(r.montoOriginal, r.moneda) + (tasa > 0 ? " = " + pesos.format(r.monto) : " · sin tasa de cambio");
        if (!(tasa > 0)) mensaje("rapido-mensaje", "No hay tasa de cambio guardada. Conéctate a internet o anótalo con el botón + y escribe la tasa.", true);
      });
    }
    $("previa-desc").textContent = r.descripcion;
    $("previa-origen").hidden = !r.origenBanco;
    $("previa-origen").textContent = r.origenBanco || "";
    var tags = $("previa-etiquetas");
    tags.replaceChildren();
    r.etiquetas.forEach(function (t) { tags.append(el("span", "etiqueta-chip", "#" + t)); });
    $("previa-frecuente").checked = false;
    opcionesCategoria(r.tipo, r.categoria);
    $("vista-previa").hidden = false;
    $("btn-guardar").focus();
  }

  $("btn-cancelar").addEventListener("click", function () { pendiente = null; $("vista-previa").hidden = true; });

  // Pide la ubicación actual; si no se puede, sigue sin ella.
  function ubicacionActual() {
    if (!datos.perfil.guardar_ubicacion || !navigator.geolocation) return Promise.resolve(null);
    return new Promise(function (resolver) {
      navigator.geolocation.getCurrentPosition(
        function (p) { resolver({ lat: p.coords.latitude, lng: p.coords.longitude }); },
        function () { resolver(null); },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    });
  }

  // Guarda un registro interpretado. Devuelve una promesa que no falla (los errores se muestran).
  function guardarRegistro(r, nombreCat, comoFrecuente, textoOriginal) {
    return Promise.all([categoriaPorNombre(nombreCat || r.categoria, r.tipo, r.icono), ubicacionActual()]).then(function (res) {
      var c = res[0], lugar = res[1];
      if (r.moneda && !r.listo) throw new Error("Falta la tasa de cambio para convertir " + r.moneda + ". Anótalo con el botón + y escribe la tasa.");
      var cuenta = r.cuentaId != null && datos.cuentas.filter(function (x) { return x.id === r.cuentaId; })[0];
      var fila = { cuenta_id: cuenta ? cuenta.id : datos.cuentas[0].id, categoria_id: c.id, tipo: r.tipo, descripcion: r.descripcion,
                   monto: r.monto, fecha: r.fecha, etiquetas: r.etiquetas, estado: "pagado", moneda: monedaBase() };
      if (r.moneda) { fila.moneda = r.moneda; fila.monto_original = r.montoOriginal; fila.tasa = r.tasa; }
      if (lugar) { fila.lat = lugar.lat; fila.lng = lugar.lng; precargarMapa(lugar.lat, lugar.lng); }
      return fuente.crear("movimientos", fila);
    }).then(function (m) {
      datos.movimientos.push(m);
      ordenarMovimientos();
      var aviso = "✓ ¡Guardado! " + m.descripcion + " " + pesos.format(num(m.monto));
      if (!comoFrecuente) return aviso;
      return fuente.crear("frecuentes", { texto: textoOriginal.slice(0, 120) }).then(function (f) {
        datos.frecuentes.push(f);
        return aviso + " · también quedó en registros comunes";
      });
    }).then(function (aviso) {
      mensaje("rapido-mensaje", "");
      toast(aviso);
      pintar();
      return true;
    }).catch(function (e) { alerta(e); return false; });
  }

  $("btn-guardar").addEventListener("click", function () {
    if (!pendiente) return;
    var btn = $("btn-guardar");
    btn.disabled = true;
    guardarRegistro(pendiente, $("previa-categoria").value, $("previa-frecuente").checked, $("entrada-rapida").value.trim())
      .then(function (ok) {
        if (!ok) return;
        pendiente = null;
        $("vista-previa").hidden = true;
        $("entrada-rapida").value = "";
      }).finally(function () { btn.disabled = false; });
  });

  // ---------- Voz ----------
  // En la app de Android se usa el reconocimiento de voz del celular (complemento de Capacitor);
  // en el navegador, el de Chrome, Edge o Safari.
  var vozNativa = enApp && window.Capacitor.Plugins && window.Capacitor.Plugins.SpeechRecognition;
  var Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
  var hayVoz = !!(vozNativa || Reconocimiento);
  function dictar(pista) {
    if (vozNativa) {
      return vozNativa.requestPermissions().then(function (p) {
        if (p.speechRecognition !== "granted") throw new Error("Permite el micrófono para dictar.");
        return vozNativa.start({ language: "es-CO", maxResults: 1, prompt: pista, partialResults: false, popup: true });
      }).then(function (r) {
        var dicho = r && r.matches && r.matches[0];
        if (!dicho) throw new Error("No te entendí. Intenta de nuevo o escríbelo.");
        return dicho;
      });
    }
    return new Promise(function (ok, mal) {
      var rec = new Reconocimiento();
      rec.lang = "es-CO"; rec.interimResults = false; rec.maxAlternatives = 1;
      var listo = false;
      rec.onresult = function (ev) { listo = true; ok(ev.results[0][0].transcript); };
      rec.onerror = function (ev) { listo = true; mal(new Error(ev.error === "not-allowed" ? "Permite el micrófono para dictar." : "No te entendí. Intenta de nuevo o escríbelo.")); };
      rec.onend = function () { if (!listo) mal(new Error("No te escuché. Intenta de nuevo.")); };
      rec.start();
    });
  }
  if (vozNativa) vozNativa.available().then(function (r) { $("btn-voz").hidden = !(r && r.available); $("asis-dictar").hidden = !(r && r.available); }).catch(function () {});
  else { $("btn-voz").hidden = !hayVoz; $("asis-dictar").hidden = !hayVoz; }
  $("btn-voz").addEventListener("click", function () {
    var voz = $("btn-voz");
    voz.classList.add("escuchando");
    mensaje("rapido-mensaje", "Te escucho…");
    dictar("Dime tu gasto o ingreso").then(function (dicho) {
      mensaje("rapido-mensaje", "");
      $("entrada-rapida").value = dicho;
      $("form-rapido").requestSubmit();
    }).catch(function (err) { mensaje("rapido-mensaje", err.message, true); })
      .finally(function () { voz.classList.remove("escuchando"); });
  });

  // ---------- Foto del recibo ----------
  // Primero con la IA; sin ella, lee el texto en el mismo celular con Tesseract (sin servicios externos ni costo).
  var lector = null;
  function cargarLector(avisar) {
    if (lector) return lector;
    lector = new Promise(function (ok, mal) {
      var s = document.createElement("script");
      s.src = "vendor/tesseract/tesseract.min.js";
      s.onload = function () {
        var base = new URL("vendor/tesseract/", location.href).href;
        window.Tesseract.createWorker("spa", 1, {
          workerPath: base + "worker.min.js",
          corePath: base + "core",
          langPath: base + "lang",
          gzip: true,
          logger: function (m) { if (m.status === "recognizing text" && lectorAviso) lectorAviso("Leyendo el recibo… " + Math.round(m.progress * 100) + "%"); }
        }).then(ok, mal);
      };
      s.onerror = function () { mal(new Error("No se pudo cargar el lector de fotos. Revisa tu conexión.")); };
      document.head.appendChild(s);
    });
    lector.catch(function () { lector = null; });
    return lector;
  }
  var lectorAviso = null;

  // Achica la foto y la pasa a gris con más contraste: se lee mejor y más rápido.
  function prepararFoto(archivo) {
    return new Promise(function (ok, mal) {
      var url = URL.createObjectURL(archivo), img = new Image();
      img.onload = function () {
        var k = Math.min(1, 1800 / Math.max(img.width, img.height));
        var c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        var g = c.getContext("2d");
        g.filter = "grayscale(1) contrast(1.4)";
        g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        ok(c);
      };
      img.onerror = function () { URL.revokeObjectURL(url); mal(new Error("No se pudo abrir la foto.")); };
      img.src = url;
    });
  }

  // Devuelve { r (registro interpretado) | null, texto para la entrada, comercio, aviso }.
  function interpretarFoto(archivo, avisar) {
    return prepararFoto(archivo).then(function (foto) {
      if (!iaDisponible()) return conTesseract(foto);
      avisar("✦ La IA está leyendo el recibo…");
      var jpeg = foto.toDataURL("image/jpeg", 0.85).split(",")[1];
      return preguntarIA({ imagen: jpeg, mime: "image/jpeg" }).then(function (r) {
        return { r: r, texto: numeroCO.format(r.monto) + " " + r.descripcion, aviso: "✦ Leído con IA." };
      }, function () { return conTesseract(foto); });
    });
    function conTesseract(foto) {
      avisar("Preparando el lector de recibos… la primera vez tarda unos segundos.");
      lectorAviso = avisar;
      return cargarLector().then(function (l) { return l.recognize(foto); }).then(function (salida) {
        var rec = window.NovaRecibo.leerRecibo(salida.data.text);
        if (!rec.ok) return { r: null, texto: rec.comercio ? rec.comercio + " " : "", error: rec.error };
        var texto = numeroCO.format(rec.monto) + " " + (rec.comercio || "Compra");
        var r = Parser.interpretar(texto);
        // La descripción es el nombre del negocio completo, sin quitarle palabras como "La" o "El".
        if (rec.comercio) r.descripcion = rec.comercio;
        return { r: r, texto: texto, aviso: "Leído del recibo." };
      });
    }
  }

  $("btn-foto").addEventListener("click", function () { $("foto-recibo").click(); });
  $("foto-recibo").addEventListener("change", function (e) {
    var archivo = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!archivo) return;
    var btn = $("btn-foto");
    btn.disabled = true;
    var avisar = function (t) { mensaje("rapido-mensaje", t); };
    interpretarFoto(archivo, avisar).then(function (x) {
      $("entrada-rapida").value = x.texto;
      if (!x.r) { $("entrada-rapida").focus(); return mensaje("rapido-mensaje", x.error, true); }
      mostrarPrevia(x.r);
      mensaje("rapido-mensaje", x.aviso + " Revisa el valor: si no es correcto, corrige el texto y vuelve a tocar la flecha.");
    }).catch(function (err) { mensaje("rapido-mensaje", (err && err.message) || "No se pudo leer la foto.", true); })
      .finally(function () { btn.disabled = false; });
  });

  // ---------- Asistente inteligente (varios registros a la vez) ----------
  var asisItems = [];
  function lineasDe(texto) {
    // Una por línea, o separadas por comas que no sean decimales ("1,5 millones").
    return texto.split(/\n|;|,(?=\s*[^\d\s])/).map(function (l) { return l.trim(); }).filter(Boolean).slice(0, 30);
  }
  function interpretarLocal(texto) {
    return lineasDe(texto).map(function (l) { var r = Parser.interpretar(l); r.linea = l; return r; });
  }
  $("asis-leer").addEventListener("click", function () {
    var texto = $("asis-texto").value.trim();
    if (!texto) { $("asis-texto").focus(); return mensaje("asis-mensaje", "Escribe o dicta tus gastos, uno por línea.", true); }
    var b = $("asis-leer");
    b.disabled = true;
    var local = interpretarLocal(texto);
    var op = !iaDisponible() ? Promise.resolve(local) : (mensaje("asis-mensaje", "✦ La IA está leyendo…"), invocarIA(cuerpoIA({ texto: texto.slice(0, 2000), varios: true })).then(function (d) {
      var lista = (d.movimientos || []).filter(function (x) { return x.monto > 0; }).map(registroDeIA);
      if (!lista.length) throw new Error("vacío");
      // Si la IA encontró lo mismo que las líneas, cada uno conserva las etiquetas # de su línea.
      if (lista.length === local.length) lista.forEach(function (r, i) { (local[i].etiquetas || []).forEach(function (t) { if (r.etiquetas.indexOf(t) < 0) r.etiquetas.push(t); }); });
      return lista;
    }).catch(function () { return local; }));
    op.then(function (lista) {
      asisItems = lista.map(function (r) { return Object.assign({ elegido: !!r.ok }, r); });
      var buenos = asisItems.filter(function (r) { return r.ok; }).length;
      mensaje("asis-mensaje", buenos ? (asisItems[0] && asisItems[0].ia ? "✦ " : "") + "Encontré " + buenos + (buenos === 1 ? " registro" : " registros") + ". Revisa y toca Guardar." : "No encontré valores. Escribe por ejemplo «almuerzo 20 mil».", !buenos);
      pintarAsistente();
    }).finally(function () { b.disabled = false; });
  });
  function pintarAsistente() {
    var ul = $("asis-lista");
    ul.replaceChildren();
    asisItems.forEach(function (r, i) {
      var li = el("li", "asis-item" + (r.ok ? "" : " malo"));
      if (!r.ok) { li.append(el("span", "nota mal", "«" + (r.linea || "") + "»: " + r.error)); ul.append(li); return; }
      var chk = el("input"); chk.type = "checkbox"; chk.checked = r.elegido; chk.setAttribute("aria-label", "Guardar " + r.descripcion);
      chk.addEventListener("change", function () { r.elegido = chk.checked; pintarBotonAsistente(); });
      var desc = el("input", "asis-desc"); desc.value = r.descripcion; desc.maxLength = 120; desc.setAttribute("aria-label", "Descripción");
      desc.addEventListener("input", function () { r.descripcion = desc.value; });
      var monto = el("input", "asis-monto"); monto.value = pesos.format(r.monto); monto.inputMode = "numeric"; monto.setAttribute("aria-label", "Valor");
      monto.addEventListener("change", function () { var v = leerValor(monto.value); if (v > 0) r.monto = v; monto.value = pesos.format(r.monto); });
      var tipo = el("button", "chip " + r.tipo, r.tipo === "ingreso" ? "Ingreso" : "Gasto"); tipo.type = "button";
      tipo.addEventListener("click", function () { r.tipo = r.tipo === "ingreso" ? "gasto" : "ingreso"; r.categoria = r.tipo === "ingreso" ? "Otros ingresos" : "Otros gastos"; pintarAsistente(); });
      var sel = el("select", "asis-cat"); sel.setAttribute("aria-label", "Categoría");
      var nombres = datos.categorias.filter(function (c) { return c.tipo === r.tipo; }).map(function (c) { return c.nombre; });
      if (nombres.indexOf(r.categoria) < 0) nombres.push(r.categoria);
      nombres.sort().forEach(function (n) { var o = el("option", null, n); o.value = n; o.selected = n === r.categoria; sel.append(o); });
      sel.addEventListener("change", function () { r.categoria = sel.value; });
      var quitar = el("button", "icono-btn", "✕"); quitar.type = "button"; quitar.setAttribute("aria-label", "Quitar");
      quitar.addEventListener("click", function () { asisItems.splice(i, 1); pintarAsistente(); });
      var fila1 = el("div", "asis-fila"); fila1.append(chk, desc, quitar);
      var fila2 = el("div", "asis-fila"); fila2.append(tipo, monto, sel);
      li.append(fila1, fila2);
      if (r.etiquetas && r.etiquetas.length) li.append(el("span", "etiqueta-chip", r.etiquetas.map(function (t) { return "#" + t; }).join(" ")));
      ul.append(li);
    });
    pintarBotonAsistente();
  }
  function pintarBotonAsistente() {
    var n = asisItems.filter(function (r) { return r.ok && r.elegido; }).length;
    var b = $("asis-guardar");
    b.hidden = !asisItems.length;
    b.disabled = !n;
    b.textContent = "Guardar " + n + (n === 1 ? " registro" : " registros");
  }
  $("asis-guardar").addEventListener("click", function () {
    var elegidos = asisItems.filter(function (r) { return r.ok && r.elegido; });
    if (!elegidos.length) return;
    var b = $("asis-guardar");
    b.disabled = true;
    // Uno por uno, para crear las categorías que falten sin repetirlas.
    elegidos.reduce(function (p, r) {
      return p.then(function (filas) {
        return categoriaPorNombre(r.categoria, r.tipo, r.icono).then(function (c) {
          filas.push({ cuenta_id: datos.cuentas[0].id, categoria_id: c.id, tipo: r.tipo, descripcion: (r.descripcion || c.nombre).slice(0, 120),
                       monto: r.monto, fecha: r.fecha || new Date().toISOString(), etiquetas: r.etiquetas || [], estado: "pagado" });
          return filas;
        });
      });
    }, Promise.resolve([])).then(function (filas) {
      return fuente.crearVarios("movimientos", filas);
    }).then(function (creados) {
      Array.prototype.push.apply(datos.movimientos, creados);
      ordenarMovimientos();
      toast("✓ Se guardaron " + creados.length + (creados.length === 1 ? " registro" : " registros"));
      asisItems = []; $("asis-texto").value = ""; mensaje("asis-mensaje", ""); pintarAsistente();
      pintar(); cerrarCapa();
    }).catch(function (err) { mensaje("asis-mensaje", "No se pudo guardar: " + err.message, true); })
      .finally(function () { b.disabled = false; });
  });
  $("asis-dictar").addEventListener("click", function () {
    var b = $("asis-dictar");
    b.classList.add("escuchando");
    mensaje("asis-mensaje", "Te escucho… di uno o varios gastos.");
    dictar("Dime tus gastos o ingresos").then(function (dicho) {
      var t = $("asis-texto");
      t.value = (t.value.trim() ? t.value.trim() + "\n" : "") + dicho;
      mensaje("asis-mensaje", "Listo. Puedes dictar más o tocar Interpretar.");
    }).catch(function (err) { mensaje("asis-mensaje", err.message, true); })
      .finally(function () { b.classList.remove("escuchando"); });
  });
  $("asis-foto").addEventListener("click", function () { $("asis-foto-archivo").click(); });
  $("asis-foto-archivo").addEventListener("change", function (e) {
    var archivo = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!archivo) return;
    var b = $("asis-foto");
    b.disabled = true;
    interpretarFoto(archivo, function (t) { mensaje("asis-mensaje", t); }).then(function (x) {
      if (!x.r) return mensaje("asis-mensaje", x.error, true);
      asisItems.push(Object.assign({ elegido: true }, x.r));
      mensaje("asis-mensaje", x.aviso + " Revisa el valor y toca Guardar.");
      pintarAsistente();
    }).catch(function (err) { mensaje("asis-mensaje", (err && err.message) || "No se pudo leer la foto.", true); })
      .finally(function () { b.disabled = false; });
  });

  // ---------- Sesión ----------
  // El enlace del correo para cambiar la contraseña llega con "type=recovery" (o con un
  // error si venció). Se lee antes de crear el cliente, porque este limpia la dirección.
  var hashInicial = new URLSearchParams(location.hash.replace(/^#/, ""));
  var esRecuperacion = hashInicial.get("type") === "recovery";
  var errorEnlace = hashInicial.get("error_description");

  var cliente = window.supabase && cfg.supabaseUrl ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey) : null;

  // Candado para ver u ocultar la contraseña.
  var CANDADO_CERRADO = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="12" cy="16" r="1.2"/></svg>';
  var CANDADO_ABIERTO = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.6-1.7"/><circle cx="12" cy="16" r="1.2"/></svg>';
  document.querySelectorAll("[data-ver-clave]").forEach(function (b) {
    var input = $(b.dataset.verClave);
    function pintarCandado() {
      var visible = input.type === "text";
      b.innerHTML = visible ? CANDADO_ABIERTO : CANDADO_CERRADO;
      b.setAttribute("aria-pressed", String(visible));
      b.setAttribute("aria-label", visible ? "Ocultar la contraseña" : "Mostrar la contraseña");
    }
    b.addEventListener("click", function () {
      input.type = input.type === "password" ? "text" : "password";
      pintarCandado();
      input.focus();
    });
    pintarCandado();
  });

  // ¿Olvidaste tu contraseña?
  $("btn-olvide").addEventListener("click", function () {
    var email = $("auth-email").value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      $("auth-email").focus();
      return mensaje("auth-mensaje", "Escribe arriba el correo de tu cuenta y vuelve a tocar «¿Olvidaste tu contraseña?».", true);
    }
    if (!cliente) return mensaje("auth-mensaje", "No hay conexión con el servidor. Intenta más tarde.", true);
    var b = $("btn-olvide");
    b.disabled = true;
    mensaje("auth-mensaje", "Enviando el correo…");
    cliente.auth.resetPasswordForEmail(email, { redirectTo: cfg.sitioUrl || location.origin }).then(function (r) {
      if (r.error) throw r.error;
      enfriar(60);
      abrirRecuperar(email);
    }).catch(function (err) {
      mensaje("auth-mensaje", errorDeCorreo(err) || "No se pudo enviar el correo: " + err.message, true);
    }).finally(function () { b.disabled = false; });
  });

  // ---------- Códigos del correo: crear cuenta y cambiar la contraseña ----------
  // El correo trae un código (plantilla de Supabase con {{ .Token }}) que se escribe aquí. Sirve más que
  // un enlace: Gmail y otros programas abren los enlaces antes que la persona y los dejan sin efecto.
  var FORMULARIOS_AUTH = ["form-auth", "form-nueva-clave", "form-codigo", "form-recuperar", "btn-demo"];
  var codigoDe = { email: "", tipo: "" };
  function verAuth(cual) {
    FORMULARIOS_AUTH.forEach(function (id) { $(id).hidden = id !== cual; });
    $("pantalla-auth").classList.add("en-codigo");
  }
  function volverAuth() {
    FORMULARIOS_AUTH.forEach(function (id) { $(id).hidden = !(id === "form-auth" || id === "btn-demo"); });
    $("pantalla-auth").classList.remove("en-codigo");
    pintarEnfriamiento();
  }
  function mostrarReenviar(si) { $("btn-reenviar").hidden = $("btn-tengo-codigo").hidden = !si; }
  function soloCodigo(valor) { return String(valor || "").replace(/\D/g, ""); }
  function textoErrorCodigo(err) {
    var m = String(err && err.message || "");
    if (/expired|invalid|not found|otp/i.test(m)) return "Ese código no sirve: está mal escrito o ya venció. Usa el del último correo que te llegó, o pide uno nuevo con «Reenviar el código».";
    return errorDeCorreo(err) || m;
  }
  function abrirCodigo(email) {
    codigoDe = { email: email, tipo: "signup" };
    $("codigo-texto").textContent = "Te enviamos un correo a " + email + ". Si trae un código de números, escríbelo aquí. Si trae un botón o enlace, tócalo desde este mismo celular. Revisa también Spam.";
    $("codigo-valor").value = ""; mensaje("codigo-mensaje", "");
    verAuth("form-codigo"); $("codigo-valor").focus(); pintarEnfriamiento();
  }
  function abrirRecuperar(email) {
    codigoDe = { email: email, tipo: "recovery" };
    $("recuperar-texto").textContent = "Si " + email + " tiene cuenta, te enviamos un correo. Si trae un código de números, escríbelo aquí y elige tu contraseña nueva; si trae un enlace, tócalo desde este mismo celular. Revisa también Spam.";
    ["recuperar-codigo", "recuperar-clave", "recuperar-clave-2"].forEach(function (id) { $(id).value = ""; });
    mensaje("recuperar-mensaje", "");
    verAuth("form-recuperar"); $("recuperar-codigo").focus(); pintarEnfriamiento();
  }
  $("codigo-volver").addEventListener("click", volverAuth);
  $("recuperar-volver").addEventListener("click", volverAuth);

  $("form-codigo").addEventListener("submit", function (e) {
    e.preventDefault();
    var token = soloCodigo($("codigo-valor").value);
    if (token.length < 6) return mensaje("codigo-mensaje", "Escribe el código completo que te llegó al correo.", true);
    var btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true; mensaje("codigo-mensaje", "Verificando…");
    cliente.auth.verifyOtp({ email: codigoDe.email, token: token, type: "signup" }).then(function (r) {
      if (r.error) throw r.error;
      mensaje("codigo-mensaje", "");
      volverAuth(); $("form-auth").reset();
      return entrar(fuenteSupabase(cliente, r.data.user));
    }).catch(function (err) { mensaje("codigo-mensaje", textoErrorCodigo(err), true); })
      .finally(function () { btn.disabled = false; });
  });
  $("codigo-reenviar").addEventListener("click", function () {
    cliente.auth.resend({ type: "signup", email: codigoDe.email, options: { emailRedirectTo: cfg.sitioUrl || location.origin } }).then(function (r) {
      if (r.error) throw r.error;
      enfriar(60); mensaje("codigo-mensaje", "Listo, te enviamos un código nuevo. Usa solo el último.");
    }).catch(function (err) { mensaje("codigo-mensaje", errorDeCorreo(err) || err.message, true); });
  });

  $("form-recuperar").addEventListener("submit", function (e) {
    e.preventDefault();
    var token = soloCodigo($("recuperar-codigo").value), c1 = $("recuperar-clave").value, c2 = $("recuperar-clave-2").value;
    if (token.length < 6) return mensaje("recuperar-mensaje", "Escribe el código completo que te llegó al correo.", true);
    if (c1.length < 6) return mensaje("recuperar-mensaje", "La contraseña debe tener al menos 6 caracteres.", true);
    if (c1 !== c2) return mensaje("recuperar-mensaje", "Las dos contraseñas no coinciden.", true);
    var btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true; mensaje("recuperar-mensaje", "Cambiando tu contraseña…");
    cliente.auth.verifyOtp({ email: codigoDe.email, token: token, type: "recovery" }).then(function (r) {
      if (r.error) throw r.error;
      return cliente.auth.updateUser({ password: c1 });
    }).then(function (r) {
      if (r.error) throw r.error;
      mensaje("recuperar-mensaje", "");
      volverAuth(); $("form-auth").reset();
      toast("✓ Contraseña cambiada");
      return entrar(fuenteSupabase(cliente, r.data.user));
    }).catch(function (err) {
      mensaje("recuperar-mensaje", /different from the old/i.test(err.message) ? "La nueva contraseña debe ser distinta de la anterior." : textoErrorCodigo(err), true);
    }).finally(function () { btn.disabled = false; });
  });
  $("recuperar-reenviar").addEventListener("click", function () {
    cliente.auth.resetPasswordForEmail(codigoDe.email, { redirectTo: cfg.sitioUrl || location.origin }).then(function (r) {
      if (r.error) throw r.error;
      enfriar(60); mensaje("recuperar-mensaje", "Listo, te enviamos un código nuevo. Usa solo el último.");
    }).catch(function (err) { mensaje("recuperar-mensaje", errorDeCorreo(err) || err.message, true); });
  });

  function pedirNuevaClave() {
    mostrar("auth");
    $("form-auth").hidden = true;
    $("btn-demo").hidden = true;
    $("form-nueva-clave").hidden = false;
    $("nueva-clave").focus();
  }

  $("form-nueva-clave").addEventListener("submit", function (e) {
    e.preventDefault();
    var c1 = $("nueva-clave").value, c2 = $("nueva-clave-2").value;
    if (c1.length < 6) return mensaje("nueva-clave-mensaje", "La contraseña debe tener al menos 6 caracteres.", true);
    if (c1 !== c2) return mensaje("nueva-clave-mensaje", "Las dos contraseñas no coinciden.", true);
    var btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true;
    cliente.auth.updateUser({ password: c1 }).then(function (r) {
      if (r.error) throw r.error;
      history.replaceState(null, "", location.pathname);
      $("form-nueva-clave").hidden = true;
      $("form-auth").hidden = false;
      $("btn-demo").hidden = false;
      return entrar(fuenteSupabase(cliente, r.data.user));
    }).catch(function (err) {
      mensaje("nueva-clave-mensaje", /different from the old/i.test(err.message)
        ? "La nueva contraseña debe ser distinta de la anterior." : err.message, true);
    }).finally(function () { btn.disabled = false; });
  });

  // Botón para descargar la APK: solo en el navegador. Se baja desde esta misma página (la última
  // que se publicó), con una copia en GitHub como respaldo y ayuda por si no deja instalar.
  document.querySelectorAll(".apk-respaldo").forEach(function (a) { if (cfg.apkRespaldoUrl) a.href = cfg.apkRespaldoUrl; else a.parentNode.hidden = true; });
  function mostrarApk(si) {
    $("btn-apk").hidden = $("perfil-apk").hidden = !si;
    document.querySelectorAll(".respaldo, .ayuda-instalar").forEach(function (e) { e.hidden = !si; });
  }
  // El botón se ve siempre en el inicio de sesión (y en Configuración): tocarlo baja de una vez la última APK.
  // En el navegador baja desde esta página; dentro de la app instalada, desde GitHub (allí queda lista apenas se arma).
  mostrarApk(true);
  (function ponerEnlaceApk() {
    var enlace = enApp && cfg.apkRespaldoUrl ? cfg.apkRespaldoUrl : "descargas/NOVA.apk";
    $("btn-apk").href = $("perfil-apk").href = enlace;
    $("btn-apk").setAttribute("download", "NOVA.apk"); $("perfil-apk").setAttribute("download", "NOVA.apk");
    if (enApp) { $("btn-apk").target = $("perfil-apk").target = "_blank"; }
  })();

  // Dentro de la app instalada: si ya hay una APK más nueva, avisar con un botón para bajarla.
  // version-app.json lo escribe el flujo al armar la APK; la versión publicada se pide con el
  // HTTP del celular (CapacitorHttp), que no depende de los permisos entre sitios del navegador.
  var versionLocal = null;
  function leerVersionPublicada(http, url) {
    return http.get({ url: url + (url.indexOf("?") < 0 ? "?" : "&") + "t=" + Date.now(), responseType: "json" }).then(function (res) {
      var d = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
      return d && Number(d.versionCode) > 0 ? d : null;
    }).catch(function () { return null; });
  }
  // Devuelve { local, remota, hayNueva, enlace } o null si no se pudo saber. Mira GitHub (sale apenas termina el armado) y la página.
  function buscarActualizacion(manual) {
    var http = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorHttp;
    if (!http || !cfg.apkUrl) return Promise.resolve(null);
    return fetch("version-app.json").then(function (r) { return r.json(); }).then(function (local) {
      versionLocal = local; window.__novaVersion = local && local.versionName;
      pintarVersionLocal();
      var fuentes = [{ url: cfg.apkVersionUrlGithub, apk: cfg.apkRespaldoUrl }, { url: cfg.apkVersionUrl, apk: cfg.apkUrl }].filter(function (f) { return f.url && f.apk; });
      return Promise.all(fuentes.map(function (f) { return leerVersionPublicada(http, f.url).then(function (d) { return d ? { d: d, apk: f.apk } : null; }); })).then(function (lista) {
        var mejor = lista.filter(Boolean).sort(function (a, b) { return Number(b.d.versionCode) - Number(a.d.versionCode); })[0];
        if (!mejor) return { local: local, remota: null, hayNueva: false, error: true };
        var hayNueva = Number(mejor.d.versionCode) > Number(local.versionCode);
        var aviso = $("aviso-version");
        if (hayNueva) {
          aviso.href = mejor.apk; aviso.target = "_blank";
          $("aviso-version-texto").textContent = "Versión " + mejor.d.versionName + " (tienes la " + local.versionName + "). Toca para descargarla y, al abrir el archivo, toca Actualizar.";
          [$("btn-apk"), $("perfil-apk")].forEach(function (a) { a.href = mejor.apk; });
        }
        [$("btn-apk"), $("perfil-apk")].forEach(function (a) {
          a.querySelector("strong").textContent = a.id === "btn-apk" ? "APK Android" + (hayNueva ? " · versión " + mejor.d.versionName : "") : hayNueva ? "Descargar la versión nueva (" + mejor.d.versionName + ")" : "Descargar la app para Android";
          if (a.id === "btn-apk") a.querySelector("small").textContent = hayNueva ? "Hay versión nueva: toca para descargarla" : "Descarga la versión más nueva de NOVA";
          a.classList.toggle("hay-nueva", hayNueva);
        });
        aviso.hidden = !hayNueva;
        return { local: local, remota: mejor.d, hayNueva: hayNueva, enlace: mejor.apk };
      });
    }).catch(function () { return null; /* sin conexión o APK armada sin número de versión */ });
  }
  function pintarVersionLocal() {
    var v = versionLocal && versionLocal.versionName;
    $("apk-app-version").textContent = v ? "Tienes la versión " + v + " de NOVA." : "";
    $("actualizar-estado").textContent = v ? "Tienes la versión " + v + ". Toca para ver si hay una nueva." : "Mira si hay una versión nueva de NOVA";
  }
  function accionBuscarActualizacion(boton) {
    boton.disabled = true; var texto = boton.textContent;
    buscarActualizacion(true).then(function (r) {
      if (!r) toast("No se pudo revisar", "Revisa tu conexión e intenta otra vez");
      else if (r.error) toast("No se pudo revisar", "No pude leer la versión publicada");
      else if (r.hayNueva) toast("¡Hay una versión nueva!", "Versión " + r.remota.versionName, null, { texto: "Descargar", fn: function () { window.open(r.enlace, "_blank"); } });
      else toast("Ya tienes la última versión", "Versión " + r.local.versionName);
    }).finally(function () { boton.disabled = false; });
  }
  if (enApp) {
    $("apk-app").hidden = false; $("btn-actualizar").hidden = false;
    $("apk-app-buscar").addEventListener("click", function () { accionBuscarActualizacion($("apk-app-buscar")); });
    $("btn-actualizar").addEventListener("click", function () { accionBuscarActualizacion($("btn-actualizar")); });
  }
  if (enApp) {
    buscarActualizacion();
    document.addEventListener("visibilitychange", function () { if (!document.hidden) buscarActualizacion(); });
    setInterval(function () { if (!document.hidden) buscarActualizacion(); }, 30 * 60 * 1000);   // y cada media hora si la app queda abierta
  }

  function mostrar(pantalla) {
    $("cargando").hidden = true;
    $("pantalla-auth").hidden = pantalla !== "auth";
    $("pantalla-app").hidden = pantalla !== "app";
  }

  function entrar(nuevaFuente) {
    fuente = nuevaFuente;
    espacioId = leerLocal(claveEspacio(), null);
    fuente = Esp.envolver(nuevaFuente, { activo: function () { return espacioId; }, alPerder: function () { espacioId = null; guardarLocal(claveEspacio(), null); } });
    reiniciarChat();
    desfaseInicio = 0; desfaseAnalisis = 0;
    $("aviso-demo").hidden = !fuente.demo;
    $("cargando").hidden = false;
    return fuente.cargar().then(function (d) {
      datos = Object.assign(datosVacios(), d);
      ordenarMovimientos();
      monedaVista = monedaBase();
      mostrar("app"); ir("inicio"); pintar();
      if (!fuente.demo) bloquearSiHayPin();
      pintarEstadoPapelera(); tutorialSiHaceFalta(); novedadesSiHaceFalta();
      $("btn-dueno").hidden = !soyDueno(); marcarUso();
      while (accionesPendientes.length) anotarTeclaRapida(accionesPendientes.shift());
      programarAvisos();
      if (!fuente.demo) revisarBanco().then(function () { if (abrirBancoAlEntrar) { abrirBancoAlEntrar = false; abrirBanco(); } }).catch(function () { /* sin lista del banco */ });
      // Si salieron categorías nuevas del modo conductor (como "Cuota del vehículo"), se agregan solas.
      if (conductor()) asegurarCategoriasConductor().then(pintar).catch(function () { /* se intentará la próxima vez */ });
      return procesarProgramados();
    }).catch(function (e) {
      mostrar("auth");
      mensaje("auth-mensaje", "No se pudieron cargar tus datos: " + e.message, true);
    });
  }

  // Pedir correos seguidos gasta el cupo de la hora y deja sin efecto el enlace del correo anterior.
  // Por eso, después de pedir uno, "Crear cuenta" y "Reenviar" esperan un minuto.
  var enfriarHasta = Number(leerLocal("nova-correo-hasta", 0)) || 0, enfriarReloj = null;
  function segundosEspera() { return Math.max(0, Math.ceil((enfriarHasta - Date.now()) / 1000)); }
  function pintarEnfriamiento() {
    var seg = segundosEspera(), crear = document.querySelector("#form-auth [data-accion=registrar]"), re = $("btn-reenviar");
    crear.disabled = re.disabled = seg > 0;
    crear.textContent = seg > 0 ? "Crear cuenta (" + seg + " s)" : "Crear cuenta";
    re.textContent = seg > 0 ? "Reenviar el correo de verificación (" + seg + " s)" : "Reenviar el correo de verificación";
    ["codigo-reenviar", "recuperar-reenviar"].forEach(function (id) {
      $(id).disabled = seg > 0;
      $(id).textContent = seg > 0 ? "Reenviar el código (" + seg + " s)" : "Reenviar el código";
    });
    if (seg <= 0 && enfriarReloj) { clearInterval(enfriarReloj); enfriarReloj = null; }
  }
  function enfriar(segundos) {
    enfriarHasta = Date.now() + segundos * 1000;
    guardarLocal("nova-correo-hasta", enfriarHasta);
    pintarEnfriamiento();
    if (!enfriarReloj) enfriarReloj = setInterval(pintarEnfriamiento, 1000);
  }
  if (segundosEspera() > 0) { pintarEnfriamiento(); enfriarReloj = setInterval(pintarEnfriamiento, 1000); }
  // Traduce los errores del envío de correos a algo que se pueda entender y hacer.
  function errorDeCorreo(err) {
    var m = String(err && err.message || "");
    var seg = (m.match(/after (\d+) second/i) || [])[1];
    if (seg) { enfriar(Number(seg) + 1); return "Espera " + (Number(seg) + 1) + " segundos antes de pedir otro correo."; }
    if (/email rate limit|over_email_send_rate_limit/i.test(m + " " + (err && err.code || ""))) {
      enfriar(300);
      return "Se acabó el cupo de correos de esta hora: el servicio gratis de correos manda muy pocos por hora. Espera un rato (hasta una hora) y vuelve a intentarlo. Si ya habías pedido uno, abre solo el más reciente.";
    }
    return null;
  }

  $("form-auth").addEventListener("submit", function (e) {
    e.preventDefault();
    var accion = e.submitter && e.submitter.dataset.accion;
    var email = $("auth-email").value.trim(), clave = $("auth-clave").value;
    if (!email || clave.length < 6) return mensaje("auth-mensaje", "Escribe tu correo y una contraseña de al menos 6 caracteres.", true);
    if (!cliente) return mensaje("auth-mensaje", "No hay conexión con el servidor. Prueba la demostración.", true);
    var botones = e.target.querySelectorAll("button");
    botones.forEach(function (b) { b.disabled = true; });
    mensaje("auth-mensaje", accion === "registrar" ? "Creando tu cuenta…" : "Entrando…");
    mostrarReenviar(false);
    // El correo de verificación le llega a la persona que crea la cuenta; su enlace abre la app.
    var op = accion === "registrar"
      ? cliente.auth.signUp({ email: email, password: clave, options: { emailRedirectTo: cfg.sitioUrl || location.origin } })
      : cliente.auth.signInWithPassword({ email: email, password: clave });
    op.then(function (r) {
      if (r.error) throw r.error;
      if (!r.data.session) {
        // Supabase no avisa con un error cuando el correo ya tiene cuenta: devuelve un usuario sin identidades.
        if (r.data.user && Array.isArray(r.data.user.identities) && !r.data.user.identities.length) {
          mensaje("auth-mensaje", "Ese correo ya tiene cuenta. Toca Entrar. Si no recuerdas la contraseña, toca «¿Olvidaste tu contraseña?».", true);
          return;
        }
        enfriar(60);
        mensaje("auth-mensaje", "");
        abrirCodigo(email);
        return;
      }
      mensaje("auth-mensaje", "");
      return entrar(fuenteSupabase(cliente, r.data.user));
    }).catch(function (err) {
      var noConfirmado = /not confirmed/i.test(err.message);
      var t = errorDeCorreo(err) || (/invalid login/i.test(err.message) ? "Correo o contraseña incorrectos."
        : noConfirmado ? "Tu cuenta todavía no está verificada. Toca «Ya tengo el código del correo», o pide un código nuevo con «Reenviar»."
        : /already registered/i.test(err.message) ? "Ese correo ya tiene cuenta. Usa Entrar."
        : err.message);
      mensaje("auth-mensaje", t, true);
      mostrarReenviar(noConfirmado);
    }).finally(function () { botones.forEach(function (b) { b.disabled = false; }); pintarEnfriamiento(); });
  });

  $("btn-reenviar").addEventListener("click", function () {
    var email = $("auth-email").value.trim(), b = $("btn-reenviar");
    if (!email) { $("auth-email").focus(); return mensaje("auth-mensaje", "Escribe arriba el correo con el que creaste la cuenta.", true); }
    b.disabled = true;
    cliente.auth.resend({ type: "signup", email: email, options: { emailRedirectTo: cfg.sitioUrl || location.origin } }).then(function (r) {
      if (r.error) throw r.error;
      enfriar(60);
      mensaje("auth-mensaje", "");
      abrirCodigo(email);
    }).catch(function (err) {
      mensaje("auth-mensaje", errorDeCorreo(err) || "No se pudo reenviar: " + err.message, true);
    }).finally(function () { pintarEnfriamiento(); if (segundosEspera() <= 0) b.disabled = false; });
  });

  $("btn-tengo-codigo").addEventListener("click", function () {
    var email = $("auth-email").value.trim();
    if (!email) { $("auth-email").focus(); return mensaje("auth-mensaje", "Escribe arriba el correo con el que creaste la cuenta.", true); }
    abrirCodigo(email);
  });

  // ---------- Entrar con Google ----------
  // El botón aparece solo si Google está activado en Supabase (se pregunta a /auth/v1/settings).
  // En el navegador se va a Google y vuelve a la página. En la app instalada, Google no deja entrar desde
  // la ventana interna, así que se abre en el navegador del celular y vuelve a NOVA con un enlace propio.
  var plugApp = enApp && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  var plugNavegador = enApp && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser;
  if (cliente && cfg.supabaseUrl) {
    fetch(cfg.supabaseUrl + "/auth/v1/settings", { headers: { apikey: cfg.supabaseKey } }).then(function (r) { return r.json(); }).then(function (a) {
      // Solo se esconde si el servidor dice claramente que Google está apagado; si la consulta falla, el botón se queda.
      if (a && a.external && a.external.google === false) $("bloque-google").hidden = true;
    }).catch(function () { /* sin conexión: el botón se queda y, al tocarlo, dice qué pasó */ });
  }
  $("btn-google").addEventListener("click", function () {
    var b = $("btn-google");
    b.disabled = true;
    mensaje("auth-mensaje", "Abriendo Google…");
    var app = enApp && plugNavegador;
    cliente.auth.signInWithOAuth({ provider: "google", options: app
      ? { redirectTo: cfg.appEsquema, skipBrowserRedirect: true, queryParams: { prompt: "select_account" } }
      : { redirectTo: cfg.sitioUrl || location.origin, queryParams: { prompt: "select_account" } } }).then(function (r) {
      if (r.error) throw r.error;
      if (app) return plugNavegador.open({ url: r.data.url });
    }).catch(function (err) {
      mensaje("auth-mensaje", /not enabled|Unsupported provider/i.test(err.message) ? "Entrar con Google todavía no está activado." : "No se pudo abrir Google: " + err.message, true);
    }).finally(function () { setTimeout(function () { b.disabled = false; }, 1500); });
  });
  // Al volver de Google a la app instalada llega un enlace co.novafinanzas.app://login-callback#access_token=…
  if (plugApp && cliente) {
    plugApp.addListener("appUrlOpen", function (ev) {
      var url = String(ev && ev.url || "");
      if (!cfg.appEsquema || url.indexOf(cfg.appEsquema) !== 0) return;
      var params = new URLSearchParams(url.split("#")[1] || (url.split("?")[1] || ""));
      try { if (plugNavegador) plugNavegador.close(); } catch (e) { /* en Android la ventana del navegador se cierra sola */ }
      if (params.get("error")) { mostrar("auth"); return mensaje("auth-mensaje", "No se pudo entrar con Google: " + (params.get("error_description") || params.get("error")).replace(/\+/g, " "), true); }
      if (!params.get("access_token") || !params.get("refresh_token")) return;
      mostrar("auth"); mensaje("auth-mensaje", "Entrando…");
      cliente.auth.setSession({ access_token: params.get("access_token"), refresh_token: params.get("refresh_token") }).then(function (r) {
        if (r.error) throw r.error;
        mensaje("auth-mensaje", "");
        return entrar(fuenteSupabase(cliente, r.data.user));
      }).catch(function (err) { mensaje("auth-mensaje", "No se pudo entrar con Google: " + err.message, true); });
    });
  }

  // ---------- Bloqueo con PIN (el PIN se guarda solo en este dispositivo, cifrado) ----------
  var PIN_CLAVE = "nova-pin", PIN2_CLAVE = "nova-pin2", pinModo = null, pinPrimero = "", ocultoDesde = 0;
  function leerPin2() { try { return localStorage.getItem(PIN2_CLAVE); } catch (e) { return null; } }
  function leerPin() { try { return localStorage.getItem(PIN_CLAVE); } catch (e) { return null; } }
  function hashPin(pin) {
    var txt = "nova-sal:" + pin;
    if (!(window.crypto && crypto.subtle && window.TextEncoder)) return Promise.resolve("p:" + btoa(txt));
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt)).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
    });
  }
  function pintarEstadoPin() { $("pin2-estado").textContent = leerPin2() ? "Activado: ese PIN abre NOVA con los valores ocultos" : "Un segundo PIN que abre NOVA con los valores ocultos"; $("pin-estado").textContent = leerPin() ? "Activado: se pide al abrir NOVA" : "Pide un PIN cada vez que abres NOVA"; }
  function abrirBloqueo(modo) {
    pinModo = modo; pinPrimero = "";
    var t = { crear: "Crea un PIN de 4 a 6 números", repetir: "Repite el PIN", abrir: "Escribe tu PIN", quitar: "Escribe tu PIN para quitarlo", crear2: "Crea tu PIN discreto (distinto al principal)", repetir2: "Repite el PIN discreto" };
    $("bloqueo-titulo").textContent = t[modo]; $("bloqueo-pin").value = ""; mensaje("bloqueo-mensaje", "");
    $("bloqueo-cancelar").hidden = modo === "abrir"; $("bloqueo-olvide").hidden = modo === "crear";
    $("bloqueo").hidden = false; setTimeout(function () { $("bloqueo-pin").focus(); }, 50);
  }
  function cerrarBloqueo() { $("bloqueo").hidden = true; $("bloqueo-pin").value = ""; pinModo = null; }
  function confirmarPin() {
    var pin = $("bloqueo-pin").value.replace(/\D/g, "");
    if (pin.length < 4) return mensaje("bloqueo-mensaje", "Escribe de 4 a 6 números.", true);
    if (pinModo === "crear") { pinPrimero = pin; pinModo = "repetir"; $("bloqueo-titulo").textContent = "Repite el PIN"; $("bloqueo-pin").value = ""; return; }
    if (pinModo === "crear2") { pinPrimero = pin; pinModo = "repetir2"; $("bloqueo-titulo").textContent = "Repite el PIN discreto"; $("bloqueo-pin").value = ""; return; }
    if (pinModo === "repetir2") {
      if (pin !== pinPrimero) { abrirBloqueo("crear2"); return mensaje("bloqueo-mensaje", "No coinciden. Empieza de nuevo.", true); }
      return hashPin(pin).then(function (hp) {
        if (hp === leerPin()) { abrirBloqueo("crear2"); return mensaje("bloqueo-mensaje", "Tiene que ser distinto al PIN principal.", true); }
        try { localStorage.setItem(PIN2_CLAVE, hp); } catch (e) { /* nada */ }
        cerrarBloqueo(); pintarEstadoPin(); toast("¡PIN discreto activado!", "Abre NOVA con los valores ocultos");
      });
    }
    if (pinModo === "repetir") {
      if (pin !== pinPrimero) { abrirBloqueo("crear"); return mensaje("bloqueo-mensaje", "No coinciden. Empieza de nuevo.", true); }
      return hashPin(pin).then(function (hp) { try { localStorage.setItem(PIN_CLAVE, hp); } catch (e) { /* nada */ } cerrarBloqueo(); pintarEstadoPin(); toast("¡PIN activado!", "Se pedirá al abrir NOVA"); });
    }
    hashPin(pin).then(function (hp) {
      if (pinModo === "abrir" && hp !== leerPin() && leerPin2() && hp === leerPin2()) {
        ocultos = true; guardarLocal("nova-ocultos", true); pintarOjo(); cerrarBloqueo(); if (fuente) pintar(); return;
      }
      if (hp !== leerPin()) { $("bloqueo-pin").value = ""; return mensaje("bloqueo-mensaje", "PIN incorrecto.", true); }
      if (pinModo === "quitar") { try { localStorage.removeItem(PIN_CLAVE); localStorage.removeItem(PIN2_CLAVE); } catch (e) { /* nada */ } pintarEstadoPin(); toast("PIN quitado"); }
      cerrarBloqueo();
    });
  }
  function bloquearSiHayPin() { if (leerPin() && fuente) abrirBloqueo("abrir"); }
  $("bloqueo-ok").addEventListener("click", confirmarPin);
  $("bloqueo-pin").addEventListener("keydown", function (e) { if (e.key === "Enter") confirmarPin(); });
  $("bloqueo-cancelar").addEventListener("click", cerrarBloqueo);
  $("bloqueo-olvide").addEventListener("click", function () {
    if (!confirm("Para quitar el PIN tienes que cerrar sesión y volver a entrar con tu correo. Tus datos no se borran. ¿Seguimos?")) return;
    try { localStorage.removeItem(PIN_CLAVE); } catch (e) { /* nada */ }
    cerrarBloqueo(); pintarEstadoPin(); $("btn-salir").click();
  });
  $("btn-pin").addEventListener("click", function () { abrirBloqueo(leerPin() ? "quitar" : "crear"); });
  $("btn-pin2").addEventListener("click", function () {
    if (leerPin2()) { if (confirm("¿Quitar el PIN discreto?")) { try { localStorage.removeItem(PIN2_CLAVE); } catch (e) { /* nada */ } pintarEstadoPin(); toast("PIN discreto quitado"); } return; }
    if (!leerPin()) return toast("Primero activa el PIN principal");
    abrirBloqueo("crear2");
  });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) ocultoDesde = Date.now();
    else if (ocultoDesde && Date.now() - ocultoDesde > 30000 && $("bloqueo").hidden) bloquearSiHayPin();
  });
  pintarEstadoPin();

  // ---------- Restaurar respaldo: solo agrega lo que falta, nunca borra ----------
  function claveMov(m) { return [String(m.fecha).slice(0, 16), num(m.monto), m.tipo, m.descripcion || ""].join("|"); }
  $("btn-restaurar").addEventListener("click", function () { $("archivo-respaldo").click(); });
  $("archivo-respaldo").addEventListener("change", function (e) {
    var f = e.target.files && e.target.files[0]; e.target.value = "";
    if (!f) return;
    f.text().then(function (txt) {
      var c; try { c = JSON.parse(txt); } catch (err) { return mensaje("respaldo-mensaje", "Ese archivo no es un respaldo de NOVA.", true); }
      if (!c || c.app !== "NOVA" || !Array.isArray(c.movimientos)) return mensaje("respaldo-mensaje", "Ese archivo no es un respaldo de NOVA.", true);
      var existentes = {}; datos.movimientos.forEach(function (m) { existentes[claveMov(m)] = true; });
      var nuevos = c.movimientos.filter(function (m) { return m && m.monto != null && m.fecha && !existentes[claveMov(m)]; });
      if (!nuevos.length) return mensaje("respaldo-mensaje", "No había nada nuevo: todos esos movimientos ya están en NOVA.");
      if (!confirm("Se van a agregar " + nuevos.length + " movimientos que no tienes. No se borra nada. ¿Seguimos?")) return;
      var cuentaDe = function (id) { var o = (c.cuentas || []).filter(function (x) { return x.id === id; })[0]; var d = o && datos.cuentas.filter(function (x) { return x.nombre === o.nombre; })[0]; return (d || datos.cuentas[0]).id; };
      var catDe = function (id, tipo) { var o = (c.categorias || []).filter(function (x) { return x.id === id; })[0]; var d = o && datos.categorias.filter(function (x) { return x.nombre === o.nombre && x.tipo === tipo; })[0]; return (d || datos.categorias.filter(function (x) { return x.tipo === tipo; })[0] || datos.categorias[0]).id; };
      mensaje("respaldo-mensaje", "Restaurando " + nuevos.length + " movimientos…");
      var hechos = 0;
      return nuevos.reduce(function (p, m) {
        return p.then(function () {
          var fila = { cuenta_id: cuentaDe(m.cuenta_id), categoria_id: catDe(m.categoria_id, m.tipo), tipo: m.tipo, monto: m.monto, descripcion: m.descripcion || null, fecha: m.fecha, etiquetas: m.etiquetas || [] };
          if (m.nota) fila.nota = m.nota;
          return fuente.crear("movimientos", fila).then(function (n) { datos.movimientos.push(n); hechos++; });
        });
      }, Promise.resolve()).then(function () {
        ordenarMovimientos(); pintar(); mensaje("respaldo-mensaje", "Listo: se agregaron " + hechos + " movimientos."); toast("¡Respaldo restaurado!", hechos + " movimientos agregados");
      });
    }).catch(function (err) { mensaje("respaldo-mensaje", "No se pudo restaurar: " + err.message, true); });
  });

  // ---------- Papelera: lo borrado se guarda 30 días en este dispositivo ----------
  function clavePapelera() { return "nova-papelera:" + ((fuente && fuente.email) || "demo"); }
  function leerPapelera() {
    var l = leerLocal(clavePapelera(), []), limite = Date.now() - 30 * 86400000;
    var vigentes = l.filter(function (e) { return new Date(e.borrado).getTime() >= limite; });
    if (vigentes.length !== l.length) {
      l.filter(function (e) { return new Date(e.borrado).getTime() < limite && e.fila && e.fila.foto_ruta && fuente && fuente.fotos; }).forEach(function (e) { fuente.fotos.borrar(e.fila.foto_ruta); });
      guardarLocal(clavePapelera(), vigentes);
    }
    return vigentes;
  }
  function aPapelera(tabla, fila) {
    var l = leerPapelera(), e = { id: Date.now() + "-" + Math.round(Math.random() * 1e6), tabla: tabla, fila: JSON.parse(JSON.stringify(fila)), borrado: new Date().toISOString() };
    l.unshift(e); guardarLocal(clavePapelera(), l.slice(0, 200));
    pintarEstadoPapelera();
    return e;
  }
  function quitarDePapelera(id) { guardarLocal(clavePapelera(), leerPapelera().filter(function (e) { return e.id !== id; })); pintarEstadoPapelera(); }
  function pintarEstadoPapelera() { var n = leerPapelera().length; $("papelera-estado").textContent = n ? n + (n === 1 ? " elemento" : " elementos") + " · se guardan 30 días" : "Recupera lo que borraste en los últimos 30 días"; }
  function recuperarDePapelera(e) {
    var f = Object.assign({}, e.fila); delete f.id; delete f.user_id; delete f.creado_en;
    if (e.tabla === "movimientos") {
      if (!datos.cuentas.some(function (c) { return c.id === f.cuenta_id; })) f.cuenta_id = datos.cuentas[0].id;
      if (!datos.categorias.some(function (c) { return c.id === f.categoria_id; })) { var c = datos.categorias.filter(function (x) { return x.tipo === f.tipo; })[0] || datos.categorias[0]; f.categoria_id = c.id; }
    }
    return fuente.crear(e.tabla, f).then(function (n) {
      datos[e.tabla].push(n); if (e.tabla === "movimientos") ordenarMovimientos();
      quitarDePapelera(e.id); pintar();
      toast("¡Recuperado!", e.tabla === "movimientos" ? n.descripcion : n.nombre);
    });
  }
  function deshacerBorrado(e) { return function () { recuperarDePapelera(e).catch(function (err) { toast("No se pudo recuperar: " + err.message); }); }; }
  function pintarPapelera() {
    var ul = $("lista-papelera"); ul.replaceChildren();
    var l = leerPapelera();
    if (!l.length) ul.append(el("li", "vacio", "La papelera está vacía."));
    l.forEach(function (e) {
      var li = el("li", "mov"), txt = el("div", "mov-texto");
      var f = e.fila, titulo = e.tabla === "movimientos" ? f.descripcion : f.nombre, valor = e.tabla === "movimientos" ? pesos.format(num(f.monto)) : pesos.format(num(f.objetivo));
      txt.append(el("strong", null, (e.tabla === "metas" ? "🎯 " : "") + titulo), el("small", null, (e.tabla === "movimientos" ? (f.tipo === "ingreso" ? "Ingreso" : "Gasto") : "Meta") + " · borrado el " + fechaCorta.format(new Date(e.borrado)) + " · " + valor));
      var rec = el("button", "mini", "↩ Recuperar"); rec.type = "button";
      rec.addEventListener("click", function () { rec.disabled = true; recuperarDePapelera(e).then(pintarPapelera).catch(function (err) { rec.disabled = false; toast("No se pudo recuperar: " + err.message); }); });
      var del = el("button", "mini", "Borrar para siempre"); del.type = "button";
      del.addEventListener("click", function () {
        if (!confirm("¿Borrar «" + titulo + "» para siempre? Esto no se puede deshacer.")) return;
        if (f.foto_ruta && fuente.fotos) fuente.fotos.borrar(f.foto_ruta);
        quitarDePapelera(e.id); pintarPapelera();
      });
      li.append(txt, rec, del); ul.append(li);
    });
  }
  $("btn-papelera").addEventListener("click", function () { pintarPapelera(); abrirCapa("pantalla-papelera"); });

  // ---------- Importar movimientos desde un CSV ----------
  $("btn-importar").addEventListener("click", function () { $("archivo-csv").click(); });
  $("archivo-csv").addEventListener("change", function (e) {
    var f = e.target.files && e.target.files[0]; e.target.value = "";
    if (!f) return;
    f.text().then(function (txt) {
      var r = NovaConsejos.importarCSV(txt);
      if (!r.filas.length) return mensaje("respaldo-mensaje", r.errores[0] || "No encontré movimientos en ese archivo.", true);
      var existentes = {}; datos.movimientos.forEach(function (m) { existentes[claveMov(m)] = true; });
      var nuevas = r.filas.filter(function (x) { return !existentes[claveMov(x)]; });
      if (!nuevas.length) return mensaje("respaldo-mensaje", "No había nada nuevo: esos movimientos ya están en NOVA.");
      if (!confirm("Se van a agregar " + nuevas.length + " movimientos" + (r.errores.length ? " (" + r.errores.length + " filas no se entendieron y se saltan)" : "") + ". No se borra nada. ¿Seguimos?")) return;
      var cuenta = datos.cuentas[0].id;
      var catDe = function (nombre, tipo) {
        var n = A.sinTildes(nombre || ""), l = datos.categorias.filter(function (c) { return c.tipo === tipo; });
        return (l.filter(function (c) { return n && A.sinTildes(c.nombre) === n; })[0] || l.filter(function (c) { return c.nombre === "Otros"; })[0] || l[0] || datos.categorias[0]).id;
      };
      var filas = nuevas.map(function (x) { return { cuenta_id: cuenta, categoria_id: catDe(x.categoria, x.tipo), tipo: x.tipo, monto: x.monto, descripcion: x.descripcion, fecha: x.fecha, etiquetas: [] }; });
      mensaje("respaldo-mensaje", "Importando " + filas.length + " movimientos…");
      var hechos = 0;
      return filas.reduce(function (pr, _, i) {
        if (i % 100) return pr;
        return pr.then(function () { var lote = filas.slice(i, i + 100); return fuente.crearVarios("movimientos", lote).then(function (cr) { cr.forEach(function (n) { datos.movimientos.push(n); }); hechos += cr.length; }); });
      }, Promise.resolve()).then(function () {
        ordenarMovimientos(); pintar(); mensaje("respaldo-mensaje", "Listo: se importaron " + hechos + " movimientos."); toast("¡Importado!", hechos + " movimientos agregados");
      });
    }).catch(function (err) { mensaje("respaldo-mensaje", "No se pudo importar: " + err.message, true); });
  });

  // ---------- Sacudir el celular para ocultar o mostrar los valores ----------
  $("sacudir-ocultar").checked = !!leerLocal("nova-sacudir", false);
  $("sacudir-ocultar").addEventListener("change", function (e) { guardarLocal("nova-sacudir", e.target.checked); toast(e.target.checked ? "Sacudir para ocultar: activado" : "Sacudir para ocultar: apagado"); });
  var sacudidaT = 0, sacudidas = 0;
  window.addEventListener("devicemotion", function (ev) {
    if (!leerLocal("nova-sacudir", false)) return;
    var a = ev.accelerationIncludingGravity; if (!a) return;
    var fuerza = Math.abs(a.x || 0) + Math.abs(a.y || 0) + Math.abs(a.z || 0), ahora = Date.now();
    if (fuerza > 45 && ahora - sacudidaT > 250) {
      sacudidas = ahora - sacudidaT < 1000 ? sacudidas + 1 : 1; sacudidaT = ahora;
      if (sacudidas >= 3) { sacudidas = 0; ocultos = !ocultos; guardarLocal("nova-ocultos", ocultos); pintarOjo(); if (fuente) pintar(); toast(ocultos ? "Valores ocultos" : "Valores visibles"); }
    }
  });

  // ---------- Tutorial de bienvenida (una sola vez) ----------
  var PASOS_TUTORIAL = [
    ["¡Bienvenido a NOVA!", "Aquí llevas tus gastos, tus metas y tus deudas, gratis y sin anuncios."],
    ["Anota rápido", "Toca el botón + para registrar un gasto. También puedes escribirle a la IA: «almuerzo 20 mil»."],
    ["Mira cómo vas", "En Inicio ves tu balance y cuánto puedes gastar hoy. En Análisis encuentras consejos, calendario y calculadoras."],
    ["Metas y deudas", "En Planes pones límites, metas de ahorro, deudas y gastos compartidos con amigos."],
    ["Tus datos, seguros", "En Configuración activas el PIN, haces respaldos y recuperas lo que borraste en la Papelera."]
  ];
  var pasoTutorial = 0;
  function mostrarPasoTutorial() {
    var p = PASOS_TUTORIAL[pasoTutorial];
    $("tutorial-titulo").textContent = p[0]; $("tutorial-texto").textContent = p[1];
    $("tutorial-siguiente").textContent = pasoTutorial === PASOS_TUTORIAL.length - 1 ? "¡Empezar!" : "Siguiente";
    $("tutorial-saltar").hidden = pasoTutorial === PASOS_TUTORIAL.length - 1;
  }
  function cerrarTutorial() { $("tutorial").hidden = true; guardarLocal("nova-tutorial", true); }
  $("tutorial-siguiente").addEventListener("click", function () { if (pasoTutorial >= PASOS_TUTORIAL.length - 1) return cerrarTutorial(); pasoTutorial++; mostrarPasoTutorial(); });
  $("tutorial-saltar").addEventListener("click", cerrarTutorial);
  function tutorialSiHaceFalta() { if (leerLocal("nova-tutorial", false) || !$("bloqueo").hidden) return; pasoTutorial = 0; mostrarPasoTutorial(); $("tutorial").hidden = false; }

  // ---------- Recordar una deuda por WhatsApp ----------
  $("abono-whatsapp").addEventListener("click", function () {
    var d = deudaAbierta; if (!d) return;
    var x = datosDeDeuda(d); if (!x) return;
    compartirTexto("Recordatorio de pago", "Hola " + d.persona + ", te escribo para recordarte lo que me debes" + (d.concepto ? " (" + d.concepto + ")" : "") + ": faltan " + pesos.format(x.falta) + ". ¡Gracias! 🙏");
  });

  // ---------- Pruebas con un toque (en el celular real) ----------
  function imagenDePrueba(lineas, ancho, alto, calidad) {
    var c = document.createElement("canvas"); c.width = ancho; c.height = alto;
    var g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, ancho, alto); g.fillStyle = "#111";
    g.font = "bold 30px monospace"; var y = 50;
    lineas.forEach(function (l) { g.fillText(l, 30, y); y += 48; });
    return new Promise(function (ok) { c.toBlob(ok, "image/jpeg", calidad || 0.85); });
  }
  function aBase64(blob) { return new Promise(function (ok, mal) { var fr = new FileReader(); fr.onload = function () { ok(String(fr.result).split(",")[1] || ""); }; fr.onerror = mal; fr.readAsDataURL(blob); }); }
  var resultadoPruebas = "";
  function ejecutarPruebas() {
    var ul = $("lista-pruebas"); ul.replaceChildren(); resultadoPruebas = "";
    var P = (window.Capacitor && window.Capacitor.Plugins) || {};
    function fila(nombre) {
      var li = el("li", "consejo"), ic = el("span", "consejo-icono", "⏳"), d = el("div"), t = el("strong", null, nombre), s = el("small", null, "Probando…");
      d.append(t, s); li.append(ic, d); ul.append(li);
      return function (ok, detalle) { ic.textContent = ok === null ? "➖" : ok ? "✅" : "❌"; s.textContent = detalle; resultadoPruebas += (ok === null ? "-" : ok ? "OK" : "FALLA") + " · " + nombre + ": " + detalle + "\n"; };
    }
    if (!fuente || fuente.demo) { ul.append(el("li", "vacio", "Entra con tu cuenta (no el modo demostración) para ejecutar las pruebas.")); return Promise.resolve(); }
    var versionTxt = (window.__novaVersion || ""), ent = enApp ? "app Android" : "navegador";
    var info = fila("Dónde estás probando"); info(null, ent + (versionTxt ? " · versión " + versionTxt : ""));
    var f1 = fila("Foto: subir, ver y quitar una foto de prueba");
    var f2 = fila("Historial de cambios");
    var f3 = fila("IA: leer los productos de un recibo de prueba");
    var f4 = fila("Widget: guardar los datos para el widget");
    var f5 = fila("Teclas rápidas: notificación con botones");
    var f6 = fila("Actualizaciones: leer la versión publicada");
    // 1) Foto
    return imagenDePrueba(["PRUEBA NOVA", "foto de prueba"], 400, 200, 0.7).then(function (blob) {
      if (!fuente.fotos) throw new Error("no hay espacio de fotos");
      return fuente.fotos.subir(blob, "prueba").then(function (ruta) {
        return fuente.fotos.url(ruta).then(function (u) { return fetch(u); }).then(function (r) { if (!r.ok) throw new Error("no se pudo bajar (" + r.status + ")"); return r.blob(); })
          .then(function (b) { return fuente.fotos.borrar(ruta).then(function () { f1(true, "subió, se pudo ver (" + Math.round(b.size / 1024) + " KB) y se borró la de prueba"); }); });
      });
    }).catch(function (e) { f1(false, String((e && e.message) || e)); })
    // 2) Historial
    .then(function () { return fuente.historial ? fuente.historial().then(function (l) { f2(true, l.length + (l.length === 1 ? " cambio guardado" : " cambios guardados") + " en el historial"); }) : f2(false, "no disponible"); })
    .catch(function (e) { f2(false, String((e && e.message) || e)); })
    // 3) IA productos
    .then(function () {
      if (!iaDisponible()) return f3(false, "la IA no está disponible ahora mismo");
      return imagenDePrueba(["TIENDA LA ESQUINA", "2 Pan       $ 4.000", "1 Leche     $ 3.500", "TOTAL       $ 7.500"], 640, 280, 0.9)
        .then(aBase64).then(function (b64) { return invocarIA({ productos: true, imagen: b64, mime: "image/jpeg" }); })
        .then(function (d) {
          var n = (d.productos || []).length;
          f3(n > 0, n ? n + " productos leídos: " + d.productos.map(function (x) { return x.nombre + " " + pesos.format(x.valor); }).join(", ") + (d.total ? " · total " + pesos.format(d.total) : "") : "la IA respondió pero no encontró productos");
        });
    }).catch(function (e) { f3(false, String((e && e.message) || e)); })
    // 4) Widget
    .then(function () {
      var Pf = P.Preferences;
      if (!enApp) return f4(null, "solo se prueba en la app de Android");
      if (!Pf) return f4(false, "esta APK no trae el complemento del widget (instala la última versión)");
      var marca = JSON.stringify({ saldo: "✓ Widget OK", linea: "Si ves esto, funciona" });
      return Pf.set({ key: "nova-widget", value: marca }).then(function () { return Pf.get({ key: "nova-widget" }); }).then(function (r) {
        var ok = r && r.value === marca; ultimoWidget = "";
        f4(ok, ok ? "datos guardados. Agrega el widget NOVA a tu pantalla de inicio y debe decir «✓ Widget OK»" : "no se pudo leer lo guardado");
        $("pruebas-widget").hidden = !ok;
      });
    }).catch(function (e) { f4(false, String((e && e.message) || e)); })
    // 5) Teclas rápidas
    .then(function () {
      var N = P.LocalNotifications;
      if (!enApp) return f5(null, "solo se prueba en la app de Android");
      if (!N) return f5(false, "esta APK no trae las notificaciones");
      return N.requestPermissions().then(function (perm) {
        if (!perm || perm.display !== "granted") throw new Error("falta el permiso de notificaciones (actívalo en los ajustes de Android)");
        return N.registerActionTypes({ types: [{ id: "PRUEBA", actions: [{ id: "uno", title: "Botón 1" }, { id: "dos", title: "Botón 2" }] }] });
      }).then(function () {
        return N.schedule({ notifications: [{ id: 700000900, title: "🧪 Prueba de teclas rápidas", body: "Baja esta notificación y toca «Botón 1» o «Botón 2».", actionTypeId: "PRUEBA", schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true } }] });
      }).then(function () { f5(true, "en 5 segundos llega una notificación: bájala y toca un botón. Si NOVA se abre y dice «Botón tocado», funciona"); });
    }).catch(function (e) { f5(false, String((e && e.message) || e)); })
    // 6) Actualizaciones
    .then(function () {
      if (!enApp) return f6(null, "solo se prueba en la app de Android");
      return buscarActualizacion(true).then(function (r) {
        if (!r) return f6(false, "no se pudo leer la versión instalada o no hay conexión");
        if (r.error) return f6(false, "no pude leer la versión publicada (ni en GitHub ni en la página)");
        f6(true, "instalada " + r.local.versionName + " · publicada " + r.remota.versionName + (r.hayNueva ? " → HAY una versión nueva (debe verse el aviso verde arriba)" : " → estás al día"));
      });
    }).catch(function (e) { f6(false, String((e && e.message) || e)); })
    .then(function () { $("pruebas-copiar").hidden = false; });
  }
  $("btn-pruebas").addEventListener("click", function () { $("lista-pruebas").replaceChildren(); $("pruebas-copiar").hidden = true; $("pruebas-widget").hidden = true; abrirCapa("pantalla-pruebas"); });
  $("pruebas-ejecutar").addEventListener("click", function (e) { var b = e.target; b.disabled = true; ejecutarPruebas().finally(function () { b.disabled = false; }); });
  $("pruebas-copiar").addEventListener("click", function () {
    var txt = "Pruebas de NOVA\n" + resultadoPruebas;
    (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { toast("¡Copiado!", "Pégalo en el chat"); }, function () { compartirTexto("Pruebas de NOVA", txt); });
  });
  $("pruebas-widget-real").addEventListener("click", function () { ultimoWidget = ""; actualizarWidget(); toast("Listo", "El widget vuelve a mostrar tus datos"); });

  // ---------- Alerta de límites: avisa al 80 % y al 100 % ----------
  function alertaLimites(categoriaId) {
    var peor = null;
    datos.limites.forEach(function (l) {
      if (l.categoria_id != null && l.categoria_id !== categoriaId) return;
      var e = estadoLimite(l); if (!e.vigente || !(num(l.monto) > 0)) return;
      var p = e.gastado / num(l.monto);
      if (p >= 0.8 && (!peor || p > peor.p)) peor = { p: p, l: l, falta: num(l.monto) - e.gastado };
    });
    if (!peor) return false;
    var nombre = peor.l.categoria_id != null ? nombreCategoria(peor.l.categoria_id) : "tus gastos";
    setTimeout(function () {
      if (peor.p >= 1) toast("¡Te pasaste del límite!", nombre, "+" + pesos.format(-peor.falta));
      else toast("Ojo con el límite de " + nombre, "Llevas el " + Math.round(peor.p * 100) + " %", "Faltan " + pesos.format(peor.falta));
    }, 3400);
    return true;
  }

  $("btn-demo").addEventListener("click", function () { entrar(fuenteDemo()); });

  $("btn-salir").addEventListener("click", function () {
    var n = fuente.pendientes ? fuente.pendientes() : 0;
    if (n > 0 && !confirm("Tienes " + n + (n === 1 ? " cambio" : " cambios") + " guardados sin internet que todavía no se envían. Si cierras sesión ahora se pierden. ¿Cerrar sesión de todos modos?")) return;
    var vieja = fuente;
    fuente.salir().finally(function () {
      try { localStorage.removeItem("kv:nova-identidad"); localStorage.removeItem("nova-identidad"); } catch (e) { /* nada */ }
      if (vieja.limpiar) vieja.limpiar();
      try { var PW = enApp && window.Capacitor.Plugins && window.Capacitor.Plugins.Preferences; if (PW) { ultimoWidget = ""; PW.remove({ key: "nova-widget" }); } } catch (e) { /* nada */ }
      fuente = null; datos = datosVacios();
      $("form-auth").reset(); mensaje("auth-mensaje", ""); mostrar("auth");
    });
  });

  // ¿De verdad no hay conexión con el servidor? (el celular puede decir "con internet" y estar sin señal)
  function sinConexionReal() {
    if (!enLinea()) return Promise.resolve(true);
    var control = new AbortController(), t = setTimeout(function () { control.abort(); }, 4000);
    return fetch(cfg.supabaseUrl + "/auth/v1/health", { headers: { apikey: cfg.supabaseKey }, signal: control.signal })
      .then(function () { return false; }, function () { return true; }).then(function (v) { clearTimeout(t); return v; });
  }
  // Al abrir: si ya había sesión guardada, entrar directo.
  if (cliente) {
    cliente.auth.getSession().then(function (r) {
      var s = r.data && r.data.session;
      if (s && esRecuperacion) return pedirNuevaClave();
      if (s && hashInicial.get("type") === "signup") {
        // Llegó desde el enlace del correo de verificación.
        return entrar(fuenteSupabase(cliente, s.user)).then(function () { toast("¡Tu correo quedó verificado! Bienvenido a NOVA."); });
      }
      if (s) return entrar(fuenteSupabase(cliente, s.user));
      // Sin sesión disponible pero con una cuenta guardada en este celular: si no hay conexión, se entra con la copia local.
      var guardada = leerLocal("nova-identidad", null);
      if (guardada && guardada.id) {
        return sinConexionReal().then(function (sin) {
          if (sin) return entrar(fuenteSupabase(cliente, guardada));
          mostrar("auth");
        });
      }
      mostrar("auth");
      if (errorEnlace) {
        history.replaceState(null, "", location.pathname);
        mensaje("auth-mensaje", /expired|invalid/i.test(errorEnlace)
          ? "El enlace del correo ya se usó o venció (a veces Gmail lo abre antes que tú). Si es de verificar tu cuenta, puede que ya esté verificada: escribe tu correo y contraseña y toca Entrar. Si no entra, pide un correo nuevo y abre solo el último."
          : "No se pudo completar el inicio de sesión: " + errorEnlace.replace(/\+/g, " "), true);
      }
    }).catch(function () {
      var guardada = leerLocal("nova-identidad", null);
      if (guardada && guardada.id) return entrar(fuenteSupabase(cliente, guardada));
      mostrar("auth");
    });
  } else {
    mostrar("auth");
  }

  // Service worker: guarda en el celular los mapas ya vistos, las fuentes y (en la web) la propia app, para que sigan sin internet.
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () { /* sin service worker la app funciona igual */ }); });
  }
})();
