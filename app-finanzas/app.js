(function () {
  "use strict";

  var cfg = window.NOVA_CONFIG || {};
  var Origen = window.NovaOrigen;
  var clavesAtribucion = { o: "nova-origen", r: "nova-referido-por" };
  function leerAtribucion() {
    try {
      return { o: localStorage.getItem(clavesAtribucion.o), r: localStorage.getItem(clavesAtribucion.r) };
    } catch (e) { return {}; }
  }
  function capturarAtribucion() {
    var url = new URL(location.href);
    if (!url.searchParams.has("o") && !url.searchParams.has("r")) return;
    var guardada = leerAtribucion();
    var primera = Origen.primeraAtribucion(guardada, { o: url.searchParams.get("o"), r: url.searchParams.get("r") });
    ["o", "r"].forEach(function (clave) {
      if (primera[clave] && primera[clave] !== guardada[clave]) {
        try { localStorage.setItem(clavesAtribucion[clave], primera[clave]); } catch (e) { /* almacenamiento bloqueado */ }
      }
      url.searchParams.delete(clave);
    });
    try { history.replaceState(history.state, "", url.href); } catch (e) { /* historial bloqueado */ }
  }
  capturarAtribucion();
  var Parser = window.NovaParser;
  var A = window.NovaAnalisis;
  var Inv = window.NovaInversiones;
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
  var fechaMes = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" });
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
    var nombreIcono = iconoCategoria(c);
    // Si el ícono es una palabra sin dibujo (por ejemplo "banco") no se escribe la palabra dentro del círculo: se usa el ícono genérico.
    if (!Object.prototype.hasOwnProperty.call(ICONOS, nombreIcono) && /^[a-záéíóúñ_ -]{3,}$/i.test(nombreIcono)) nombreIcono = "otro";
    if (Object.prototype.hasOwnProperty.call(ICONOS, nombreIcono)) {
      span.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONOS[nombreIcono] + "</svg>";
    } else {
      span.append(el("span", "emoji", nombreIcono));
    }
    span.style.setProperty("--c", colorDe(c));
    return span;
  }
  function colorDe(c) { return (c && c.color) || COLOR_POR_ICONO[c && c.icono] || "var(--accent)"; }

  function mensaje(id, texto, error) {
    pintarMensaje($(id), texto, error);
  }

  function pintarMensaje(m, texto, error) {
    m.setAttribute("role", error || m.id === "bloqueo-mensaje" ? "alert" : "status");
    m.textContent = texto || "";
    m.classList.toggle("error", !!error);
  }

  var toastTimer = null, deshacerHasta = 0;
  // Mascota de NOVA (Novi, un búho verde con la chispa del logo), dibujada aquí mismo.
  var NOVI = '<svg class="toast-novi" viewBox="0 0 64 76" aria-hidden="true"><ellipse cx="32" cy="72" rx="20" ry="3" fill="rgba(0,0,0,.18)"/>' +
    '<path d="M10 30 L8 8 L24 20 Z M54 30 L56 8 L40 20 Z" fill="#1a7f47"/><ellipse cx="32" cy="44" rx="25" ry="27" fill="#1f9d55"/>' +
    '<ellipse cx="32" cy="52" rx="16" ry="18" fill="#d3eedc"/><path d="M32 40l2.2 7.8L42 50l-7.8 2.2L32 60l-2.2-7.8L22 50l7.8-2.2z" fill="#1f9d55"/>' +
    '<circle cx="22" cy="31" r="9" fill="#fff"/><circle cx="42" cy="31" r="9" fill="#fff"/><circle cx="23" cy="32" r="4.6" fill="#173023"/><circle cx="41" cy="32" r="4.6" fill="#173023"/>' +
    '<circle cx="24.6" cy="30.2" r="1.5" fill="#fff"/><circle cx="42.6" cy="30.2" r="1.5" fill="#fff"/><path d="M28 38 L32 44 L36 38 Z" fill="#f3b23c"/>' +
    '<path d="M50 52c6-2 10 2 8 8-1 3-6 4-9 1z" fill="#1f9d55"/><rect x="53" y="44" width="5" height="11" rx="2.5" fill="#1f9d55" transform="rotate(-18 55 50)"/>' +
    '<path d="M24 70l-3 4h8zM40 70l3 4h-8z" fill="#f3b23c"/></svg>';
  // Tarjeta de arriba: titulo, detalle y valor opcionales.
  function toast(titulo, detalle, valor, accion, movimientoGuardado) {
    var espera = deshacerHasta - Date.now();
    if (espera > 0 && !(accion && accion.duracion)) {
      setTimeout(function () { toast(titulo, detalle, valor, accion, movimientoGuardado); }, espera);
      return;
    }
    var t = $("toast"), estado = $("toast-estado"), error = $("toast-error");
    var falla = /^(No se pudo|No pude|Un cambio guardado sin internet)/.test(titulo);
    t.className = "toast" + (falla ? " toast-error" : "") + (accion ? " toast-con-accion" : "");
    t.classList.toggle("valores-ocultos", ocultos);
    t.classList.toggle("movimiento-guardado", !!movimientoGuardado);
    function ocultarToast() {
      t.hidden = true;
      estado.textContent = error.textContent = "";
    }
    t.textContent = "";
    t.insertAdjacentHTML("afterbegin", NOVI);
    var col = el("div", "toast-texto");
    if (detalle == null && valor == null) col.append(el("strong", "toast-titulo solo", titulo));
    else { col.append(el("span", "toast-titulo", titulo)); col.append(el("strong", "toast-detalle", detalle || "")); }
    t.append(col);
    if (valor != null) t.append(el("span", "toast-valor", valor));
    if (accion) {
      var bt = el("button", "toast-accion", accion.texto); bt.type = "button";
      bt.addEventListener("click", function () {
        if (accion.duracion && Date.now() >= deshacerHasta) return;
        if (accion.confirmar && !accion.confirmar()) return;
        deshacerHasta = 0;
        clearTimeout(toastTimer); ocultarToast(); accion.fn();
      });
      t.append(bt);
    }
    var duracion = accion ? accion.duracion || 7000 : 3200;
    deshacerHasta = accion && accion.duracion ? Date.now() + duracion : 0;
    var barra = el("span", "toast-barra"); t.append(barra);
    barra.style.animationDuration = accion ? duracion + "ms" : "";
    t.hidden = false;
    estado.textContent = error.textContent = "";
    if ($("bloqueo").hidden) {
      var anuncio = falla || /^No se pudieron/.test(titulo) ? error : estado;
      anuncio.textContent = [titulo, detalle, !ocultos && valor, accion && accion.texto].filter(Boolean).join(". ");
    }
    try { if (!falla && navigator.vibrate) navigator.vibrate(25); } catch (e) { /* sin vibración */ }
    var dur = barra.style.animationDuration; barra.style.animation = "none"; void barra.offsetWidth; barra.style.animation = ""; barra.style.animationDuration = dur;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(ocultarToast, duracion);
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

  function guardarLocal(clave, valor) { try { localStorage.setItem(clave, JSON.stringify(valor)); return true; } catch (e) { return false; } }
  function leerLocal(clave, defecto) { try { var v = localStorage.getItem(clave); return v ? JSON.parse(v) : defecto; } catch (e) { return defecto; } }

  // ---------- Color y tamaño de letra ----------
  function aplicarAcento(a) {
    if (["verde", "azul", "morado", "naranja"].indexOf(a) < 0) a = "verde";
    document.documentElement.setAttribute("data-acento", a);
    try { localStorage.setItem("nova-acento", a); } catch (e) { /* sin almacenamiento */ }
    document.querySelectorAll("[data-acento]").forEach(function (b) { if (b.tagName === "BUTTON") b.setAttribute("aria-checked", String(b.dataset.acento === a)); });
  }
  function aplicarLetra(l) {
    if (["grande", "muy-grande"].indexOf(l) < 0) l = "normal";
    document.documentElement.setAttribute("data-letra", l);
    try { localStorage.setItem("nova-letra", l); } catch (e) { /* sin almacenamiento */ }
    document.querySelectorAll("[data-letra]").forEach(function (b) { if (b.tagName === "BUTTON") b.setAttribute("aria-checked", String(b.dataset.letra === l)); });
  }
  aplicarAcento((function () { try { return localStorage.getItem("nova-acento") || "verde"; } catch (e) { return "verde"; } })());
  aplicarLetra((function () { try { return localStorage.getItem("nova-letra") || "normal"; } catch (e) { return "normal"; } })());

  // ---------- Tema y valores ocultos ----------
  var temaElegido;
  var sistemaOscuro = window.matchMedia("(prefers-color-scheme: dark)");
  function actualizarTema() {
    var tema = temaElegido === "hora" ? A.temaPorHora(new Date()) : temaElegido;
    document.documentElement.setAttribute("data-theme", tema);
    var metaTema = document.querySelector('meta[name="theme-color"]');
    metaTema.content = tema === "oscuro" || (tema === "sistema" && sistemaOscuro.matches)
      ? "#070908" : "#eeece3";
  }
  function aplicarTema(t) {
    temaElegido = t;
    actualizarTema();
    try { localStorage.setItem("nova-tema", t); } catch (e) { /* sin almacenamiento */ }
    document.querySelectorAll("[data-tema]").forEach(function (b) { b.setAttribute("aria-checked", String(b.dataset.tema === t)); });
  }
  aplicarTema((function () { try { return localStorage.getItem("nova-tema") || "sistema"; } catch (e) { return "sistema"; } })());
  if (sistemaOscuro.addEventListener) sistemaOscuro.addEventListener("change", actualizarTema);
  else if (sistemaOscuro.addListener) sistemaOscuro.addListener(actualizarTema);

  var ocultos = leerLocal("nova-ocultos", false);
  function dinero(v) { return ocultos ? "$ ••••" : pesos.format(v); }
  function dineroSigno(v, tipo) { return ocultos ? "$ ••••" : (tipo === "ingreso" ? "+" : "−") + pesos.format(Math.abs(v)); }
  function pintarOjo() {
    var b = $("btn-ojo");
    b.innerHTML = ocultos ? OJO_CERRADO : OJO_ABIERTO;
    b.setAttribute("aria-pressed", String(ocultos));
    b.setAttribute("aria-label", ocultos ? "Mostrar los valores" : "Ocultar los valores");
    $("toast").classList.toggle("valores-ocultos", ocultos);
    $("pantalla-registro").classList.toggle("valores-ocultos", ocultos);
    $("chat").hidden = ocultos;
    $("chat-oculto").hidden = !ocultos;
    actualizarBotonNota();
    $("notas-nova-lista").hidden = ocultos;
    $("notas-nova-ocultas").hidden = !ocultos;
    if (ocultos) $("simulacion-valor").value = "";
    document.querySelectorAll("[data-plan-nova]").forEach(function (b) { b.hidden = ocultos; });
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
    // Supabase entrega como máximo 1.000 filas por consulta. Se pide por páginas hasta traer todo.
    function cargarTodos(nombre) {
      var todos = [], pagina = 0, tam = 1000;
      function siguiente() {
        return q(t(nombre).select("*").order("fecha", { ascending: false }).order("id", { ascending: false }).range(pagina * tam, pagina * tam + tam - 1)).then(function (filas) {
          todos = todos.concat(filas);
          if (filas.length === tam) { pagina++; return siguiente(); }
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
    if (fuente && !fuente.demo) {
      var papelera = leerPapelera(), copia = A.remapearPapelera(papelera, mapa, tabla);
      if (copia.some(function (entrada, i) { return entrada !== papelera[i]; })) guardarPapelera(fuente, copia);
      if (tabla === "categorias") {
        Object.keys(mapa).forEach(function (id) {
          var anterior = claveComodidad("icono-categoria-" + id), icono = leerLocal(anterior, "");
          if (icono && guardarLocal(claveComodidad("icono-categoria-" + mapa[id]), icono)) {
            try { localStorage.removeItem(anterior); } catch (e) { /* Ya quedó guardado con el id nuevo. */ }
          }
        });
        var clave = claveComodidad("retos-semanales"), historial = leerLocal(clave, []);
        var retos = A.remapearRetos(historial, mapa);
        if (retos.some(function (r, i) { return r !== historial[i]; })) guardarLocal(clave, retos);
      }
    }
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
    f.usuarioEventos = usuario.id;
    f.novaAdmin = !!usuario.user_metadata && usuario.user_metadata.nova_admin === true;
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
  function iconoCategoria(c) {
    return (c.id != null && (fuente.demo ? fuente.iconosCategoria[c.id] : leerLocal(claveComodidad("icono-categoria-" + c.id), ""))) || c.icono || "otro";
  }
  function etiquetaCategoria(c) {
    var icono = iconoCategoria(c);
    return (A.emojiPegado(icono) ? icono + " " : "") + c.nombre;
  }
  function nombreCategoriaVisible(id) { var c = categoria(id); return c ? etiquetaCategoria(c) : "Sin categoría"; }
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
    var c = categoria(m.categoria_id) || (m.transferencia ? { nombre: "Entre espacios", icono: "⇄", color: "#2ee06f" } : { nombre: "Sin categoría", icono: "otro" });
    var li = el("li", "mov-deslizable");
    var fila = el("div", "mov");
    var cuerpo = el("div", "mov-cuerpo");
    cuerpo.tabIndex = 0;
    cuerpo.setAttribute("role", "button");
    cuerpo.setAttribute("aria-label", "Ver el detalle de " + m.descripcion);
    var ic = pintarIcono(el("span", "mov-icono"), c);
    var txt = el("div", "mov-texto");
    var otraMoneda = m.moneda && m.moneda !== monedaBase() && num(m.monto_original) > 0;
    txt.append(el("strong", null, m.descripcion), el("small", null, c.nombre + (m.nota ? " · " + m.nota : "") + (otraMoneda && !ocultos ? " · " + Mon.formatoMonto(m.monto_original, m.moneda) : "")));
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
    cuerpo.append(ic, txt, val);
    cuerpo.addEventListener("click", function () { abrirDetalle(m); });
    cuerpo.addEventListener("keydown", function (e) {
      if (e.target !== cuerpo || (e.key !== "Enter" && e.key !== " ")) return;
      e.preventDefault(); abrirDetalle(m);
    });

    var acciones = el("div", "mov-acciones"), menu = el("button", "icono-btn mov-menu", "⋯");
    menu.type = "button";
    menu.setAttribute("aria-label", "Acciones de " + m.descripcion);
    var editar = botonHabito("Editar", function () { abrirRegistro({ movimiento: m }); });
    editar.setAttribute("aria-label", "Editar " + m.descripcion);
    var borrar = botonHabito("Borrar", function () { confirmarBorradoMovimiento(m, null, borrar); });
    borrar.setAttribute("aria-label", "Borrar " + m.descripcion);
    acciones.append(editar, borrar);
    function mostrarAcciones(visible) {
      acciones.hidden = !visible;
      menu.setAttribute("aria-expanded", String(visible));
    }
    mostrarAcciones(false);
    menu.addEventListener("click", function () { mostrarAcciones(acciones.hidden); });

    var inicio = null, ignorarToqueHasta = 0;
    cuerpo.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "touch" && e.isPrimary) inicio = { id: e.pointerId, x: e.clientX, y: e.clientY };
    });
    cuerpo.addEventListener("pointercancel", function () { inicio = null; });
    cuerpo.addEventListener("pointerup", function (e) {
      if (!inicio || inicio.id !== e.pointerId) return;
      var gesto = A.gestoDeslizar(e.clientX - inicio.x, e.clientY - inicio.y, 48);
      inicio = null;
      if (!gesto) return;
      mostrarAcciones(true);
      ignorarToqueHasta = Date.now() + 400;
    });
    cuerpo.addEventListener("click", function (e) {
      if (e.detail && Date.now() < ignorarToqueHasta) { e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);
    fila.append(cuerpo, menu);
    li.append(fila, acciones);
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
    var textoPeriodo = ciclo === "mensual" ? fechaMes.format(rango.desde) : A.nombrePeriodo(ciclo, rango);
    $("inicio-periodo").textContent = textoPeriodo;
    $("cabecera-periodo").textContent = textoPeriodo;
    var movs = A.enRango(datos.movimientos, rango), t = A.totales(movs);
    $("saldo-total").textContent = ocultos ? "$ ••••" : (t.neto < 0 ? "−" : "") + pesos.format(Math.abs(t.neto));
    var disponible = t.ingresos > 0 ? Math.max(0, Math.min(100, (t.neto / t.ingresos) * 100)) : 0;
    $("saldo-pct").textContent = Math.round(disponible) + "%";
    $("saldo-barra").style.width = disponible + "%";
    $("saldo-ingresos").textContent = ocultos ? "$ ••••" : "+" + pesos.format(t.ingresos);
    $("saldo-gastos").textContent = ocultos ? "$ ••••" : "−" + pesos.format(t.gastos);
    $("saldo-cuentas-valor").textContent = dinero(saldoTotal());
    $("tarjeta-deficit").hidden = t.neto >= 0;
    $("deficit-valor").textContent = ocultos ? "$ ••••" : "−" + pesos.format(Math.abs(t.neto));

    pintarSeguro(); pintarPresupuesto(); pintarFrecuentes(); pintarMiniTarjetas(); pintarProyeccionPeriodo(movs, rango); pintarSugerencias(); pintarProximoPago(); pintarApartar(); actualizarWidget();
    $("btn-repetir-ultimo").hidden = !A.ultimoGasto(datos.movimientos);
    pintarAvisoInicio();
    pintarWidgets($("widgets-inicio"), true);
    listaPorDia($("lista-inicio"), movs, desfaseInicio === 0 ? "Aún no hay movimientos en este periodo. Toca + para agregar el primero." : "No hubo movimientos en este periodo.", 60);
    pintarSaludo(movs.length === 0);
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
    $("seguro-valor").textContent = dinero(Math.max(0, s.resto));
    var ultimo = new Date(b.rango.hasta.getTime() - 1);
    $("seguro-nota").textContent = s.resto > 0
      ? dinero(s.porDia) + " / día · " + s.dias + (s.dias === 1 ? " día restante" : " días restantes")
      : "Ya gastaste todo lo " + (b.conPresupuesto ? "del presupuesto" : "que entró") + " en este periodo.";
    $("seguro-nota").className = "nota" + (s.resto > 0 ? "" : " mal");
    $("seguro-nota").title = s.resto > 0 ? (b.conPresupuesto ? "Del presupuesto" : "De lo que entró") + " hasta el " + fechaCorta.format(ultimo) : "";
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

  function pintarProyeccionPeriodo(movs, rango) {
    var pr = desfaseInicio === 0 ? A.proyeccionPeriodo(movs, rango) : null;
    $("tarjeta-proyeccion").hidden = !pr;
    if (pr) {
      $("proyeccion-valor").textContent = ocultos ? "$ ••••" : "Gastarías " + pesos.format(pr.gastosFinal);
      $("proyeccion-nota").textContent = ocultos ? "" : "Vas gastando " + pesos.format(Math.round(pr.ritmoDiario)) + " al día. " +
        (pr.ingresos > 0 ? (pr.saldoFinal >= 0 ? "Te sobrarían " + pesos.format(pr.saldoFinal) + " al terminar." : "Te faltarían " + pesos.format(-pr.saldoFinal) + " para llegar a fin de periodo.") : "Quedan " + pr.diasRestantes + " días.");
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
    var acciones = $("grafico-semana-acciones");
    acciones.replaceChildren();
    explicarGrafico(acciones, "Gastos por día de la semana", A.claveDia(semana) + " a " + A.claveDia(ahora),
      [["Gasto total", gSemana]].concat(dias.slice(0, hoyIdx + 1).map(function (v, i) {
        return [DIAS[i], v];
      })));
  }

  function pintarFrecuentes() {
    var cont = $("frecuentes");
    cont.replaceChildren();
    datos.frecuentes.forEach(function (f) {
      var chip = el("span", "frecuente");
      var interpretado = ocultos ? Parser.interpretar(f.texto) : null;
      var texto = ocultos ? (interpretado.ok ? interpretado.descripcion : "Registro común") : f.texto;
      var usar = el("button", null, "⚡ " + texto); usar.type = "button";
      usar.title = "Guardar ahora: " + texto;
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
    if (!ocultos) cont.append(botonHabito("Revisar suscripciones con NOVA", revisarSuscripcionesNova));
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
  // ---------- Lista de compras y pruebas gratis ----------
  function claveComodidad(nombre) { return "nova-" + nombre + ":" + ((fuente && fuente.email) || "demo"); }

  function idLocal() { return Date.now() + "-" + Math.random().toString(36).slice(2); }

  function claveCompras() { return claveComodidad("compras:" + (espacioId || "principal")); }

  function leerCompras() { return leerLocal(claveCompras(), { presupuesto: 0, items: [] }); }

  function guardarCompras(lista) {
    guardarLocal(claveCompras(), lista);
    pintarCompras();
  }

  function pintarTotalCompras(lista) {
    var r = A.totalLista(lista.items, lista.presupuesto);
    $("compras-total").textContent = "Total estimado: " + dinero(r.total) + " · Comprado: " + dinero(r.comprado);
    $("compras-barra").hidden = ocultos || !lista.presupuesto;
    $("compras-barra").value = ocultos ? 0 : r.porcentaje;
    $("compras-saldo").hidden = !lista.presupuesto;
    $("compras-saldo").textContent = ocultos ? "Presupuesto: " + dinero(lista.presupuesto) :
      (r.saldo < 0 ? "Te pasas por " : "Te quedan ") + dinero(Math.abs(r.saldo)) + " de " + dinero(lista.presupuesto);
  }

  function pintarCompras() {
    var lista = leerCompras(), presupuesto = $("compras-presupuesto"), precio = $("compras-precio");
    presupuesto.value = !ocultos && lista.presupuesto ? String(lista.presupuesto).replace(".", ",") : "";
    formatearMontoEscrito(presupuesto);
    if (ocultos) precio.value = "";
    presupuesto.disabled = precio.disabled = ocultos;
    $("form-compras-presupuesto").hidden = $("form-compras-item").hidden = ocultos;
    pintarTotalCompras(lista);
    var ul = $("compras-items");
    ul.replaceChildren();
    if (!lista.items.length) ul.append(el("li", "nota", "Aún no has agregado productos."));
    lista.items.forEach(function (item) {
      var li = el("li"), etiqueta = el("label", "casilla"), casilla = el("input");
      casilla.type = "checkbox"; casilla.checked = item.comprado;
      etiqueta.append(casilla, el("span", null, item.nombre + " · " + dinero(item.precio)));
      casilla.addEventListener("change", function () {
        var actual = leerCompras();
        var producto = actual.items.find(function (x) { return x.id === item.id; });
        if (!producto) return pintarCompras();
        producto.comprado = casilla.checked;
        guardarLocal(claveCompras(), actual);
        pintarTotalCompras(actual);
      });
      var quitar = el("button", "enlace", "Quitar");
      quitar.type = "button";
      quitar.setAttribute("aria-label", "Quitar " + item.nombre);
      quitar.addEventListener("click", function () {
        if (!confirm("¿Quitar «" + item.nombre + "» de la lista?")) return;
        var actual = leerCompras();
        actual.items = actual.items.filter(function (x) { return x.id !== item.id; });
        guardarCompras(actual);
      });
      li.append(etiqueta, quitar); ul.append(li);
    });
  }

  $("form-compras-presupuesto").addEventListener("submit", function (e) {
    e.preventDefault();
    var monto = leerValor($("compras-presupuesto").value);
    if (!Number.isFinite(monto) || monto < 0) return mensaje("compras-mensaje", "Escribe un presupuesto válido.", true);
    var lista = leerCompras();
    lista.presupuesto = monto;
    guardarCompras(lista);
    mensaje("compras-mensaje", "");
    toast("Presupuesto guardado");
  });

  $("form-compras-item").addEventListener("submit", function (e) {
    e.preventDefault();
    var nombre = $("compras-nombre").value.trim(), precio = leerValor($("compras-precio").value);
    if (!nombre || !Number.isFinite(precio) || precio < 0) return mensaje("compras-mensaje", "Escribe el nombre y un precio válido.", true);
    var lista = leerCompras();
    lista.items.push({ id: idLocal(), nombre: nombre, precio: precio, comprado: false });
    guardarCompras(lista);
    e.target.reset();
    mensaje("compras-mensaje", "");
    $("compras-nombre").focus();
  });

  function leerPruebas() { return leerLocal(claveComodidad("pruebas-gratis"), []); }

  function filaPrueba(prueba, texto) {
    var li = el("li"), boton = el("button", "enlace", "Ya la cancelé");
    boton.type = "button";
    boton.setAttribute("aria-label", "Ya la cancelé: " + prueba.nombre);
    boton.addEventListener("click", function () {
      if (!confirm("¿Quitar el recordatorio de «" + prueba.nombre + "»?")) return;
      guardarLocal(claveComodidad("pruebas-gratis"), leerPruebas().filter(function (x) { return x.id !== prueba.id; }));
      pintarPruebasGratis();
      pintarInicio();
      pintarAnalisis();
      toast("Recordatorio quitado");
    });
    li.append(el("span", null, texto), boton);
    return li;
  }

  function pintarPruebasGratis() {
    var ul = $("pruebas-gratis");
    ul.replaceChildren();
    leerPruebas().forEach(function (prueba) {
      var fecha = prueba.fecha.split("-");
      ul.append(filaPrueba(prueba, prueba.nombre + " · Termina el " + fecha[2] + "/" + fecha[1] + "/" + fecha[0]));
    });
  }

  $("form-prueba-gratis").addEventListener("submit", function (e) {
    e.preventDefault();
    var nombre = $("prueba-nombre").value.trim(), fecha = $("prueba-fecha").value;
    if (!nombre || !Number.isFinite(A.diaDePrueba(fecha)) || fecha < A.claveDia(new Date())) {
      return mensaje("prueba-mensaje", "Escribe el nombre y una fecha de hoy en adelante.", true);
    }
    var pruebas = leerPruebas();
    pruebas.push({ id: idLocal(), nombre: nombre, fecha: fecha });
    guardarLocal(claveComodidad("pruebas-gratis"), pruebas);
    e.target.reset();
    mensaje("prueba-mensaje", "");
    pintarPruebasGratis();
    pintarInicio();
    pintarAnalisis();
    toast("Recordatorio guardado");
  });

  function wPruebasGratis(art) {
    var pruebas = A.pruebasPorVencer(leerPruebas(), new Date());
    if (!pruebas.length) return;
    titulo(art, "Pruebas gratis por terminar");
    var ul = el("ul", "lista-local");
    pruebas.forEach(function (prueba) {
      var plazo = prueba.dias === 0 ? "Termina hoy" : prueba.dias === 1 ? "Termina mañana" : "Termina en " + prueba.dias + " días";
      ul.append(filaPrueba(prueba, prueba.nombre + " · " + plazo));
    });
    art.append(ul);
  }

  var diaComodidad = A.claveDia(new Date());
  var horaComodidad = new Date().getHours();
  function revisarHoraLocal() {
    actualizarTema();
    var ahora = new Date(), dia = A.claveDia(ahora), hora = ahora.getHours();
    if (dia === diaComodidad) {
      if (hora !== horaComodidad && !$("pantalla-app").hidden) pintarSugerenciasHora();
      horaComodidad = hora;
      return;
    }
    horaComodidad = hora;
    diaComodidad = dia;
    if ($("pantalla-app").hidden) return;
    pintarInicio();
    pintarAnalisis();
    pintarEstadoPapelera();
    if (!$("pantalla-papelera").hidden) pintarPapelera();
    if (!$("pantalla-deducibles").hidden) pintarDeducibles();
    if (!$("pantalla-categorizar-lote").hidden) pintarLoteCategorias();
    if (!$("pantalla-simulacion").hidden) calcularSimulacion();
    if (!$("pantalla-notas-nova").hidden) pintarNotasNova();
  }
  function esperarMinutoLocal() {
    setTimeout(function () {
      revisarHoraLocal();
      esperarMinutoLocal();
    }, 60000 - Date.now() % 60000);
  }
  esperarMinutoLocal();
  document.addEventListener("visibilitychange", function () { if (!document.hidden) revisarHoraLocal(); });

  // Inversiones y bienes de este correo, guardados en el dispositivo.
  function clavePatrimonio(tipo) { return "nova-" + tipo + ":" + fuente.email; }

  function leerRegistroPatrimonio(tipo) {
    return (fuente.demo ? fuente[tipo] : leerLocal(clavePatrimonio(tipo), [])) || [];
  }

  function registroEnMoneda(tipo) {
    return leerRegistroPatrimonio(tipo).filter(function (item) { return item.moneda === monedaVista; });
  }

  function guardarRegistroPatrimonio(tipo, lista) {
    if (fuente.demo) fuente[tipo] = lista;
    else if (!guardarLocal(clavePatrimonio(tipo), lista)) throw new Error("Revisa el almacenamiento de este dispositivo.");
  }

  function estimarBien(bien, ahora) {
    return Inv.valorDepreciado(bien.valorCompra, bien.fechaCompra, bien.pctAnual, ahora);
  }

  function pintarRegistroPatrimonio() {
    var inversiones = Inv.resumenInversiones(registroEnMoneda("inversiones"));
    var bienes = registroEnMoneda("bienes"), hoy = new Date();
    $("inversiones-total").textContent = inversiones.inversiones.length ?
      "Invertido " + dinero(inversiones.totalInvertido) + " · Valor actual " + dinero(inversiones.totalActual) : "";
    pintarLista("inversiones", inversiones.inversiones, "Aún no tienes inversiones.", function (item) {
      var balance = item.ganancia > 0 ? "Ganancia " : item.ganancia < 0 ? "Pérdida " : "Sin cambios ";
      var fecha = item.fechaVencimiento ? " · Vence el " + fechaCorta.format(parteFechaLocal(item.fechaVencimiento)) : "";
      return Inv.TIPOS[item.tipo] + fecha + " · Invertido " + dinero(item.valorInvertido) + " · Actual " + dinero(item.valorActual) +
        " · " + (ocultos ? "••••" : balance + dinero(Math.abs(item.ganancia)) + " (" + item.gananciaPct.toLocaleString("es-CO", { maximumFractionDigits: 2 }) + " %)");
    });
    pintarLista("bienes", bienes, "Aún no tienes bienes.", function (item) {
      return "Compra " + dinero(item.valorCompra) + " · Valor estimado hoy " + dinero(estimarBien(item, hoy));
    });

    function pintarLista(tipo, lista, textoVacio, detalle) {
      var ul = $("lista-" + tipo);
      ul.replaceChildren();
      if (!lista.length) ul.append(el("li", "nota", textoVacio));
      lista.forEach(function (item) {
        var li = el("li"), texto = el("span", "mov-texto"), editar = el("button", "mini", "Editar");
        texto.append(el("strong", null, item.nombre), el("small", null, detalle(item)));
        editar.type = "button";
        editar.setAttribute("aria-label", "Editar " + item.nombre);
        editar.addEventListener("click", function () { abrirRegistroPatrimonio(tipo, item); });
        li.append(texto, editar);
        ul.append(li);
      });
    }
  }

  function abrirRegistroPatrimonio(tipo, item) {
    if (ocultos) return mensaje(tipo + "-mensaje", "Muestra los montos para agregar o editar un registro.", true);
    mensaje(tipo + "-mensaje", "");
    var anterior = item || {}, moneda = monedaVista, cuenta = fuente;
    var inversion = tipo === "inversiones", objeto = inversion ? "inversión" : "bien";
    var campos = [{ clave: "nombre", etiqueta: "Nombre", tipo: "texto", valor: anterior.nombre, requerido: true, max: 60 }];
    if (inversion) {
      campos.push(
        { clave: "tipo", etiqueta: "Tipo", tipo: "select", valor: anterior.tipo || "cdt", opciones: Object.entries(Inv.TIPOS) },
        { clave: "valorInvertido", etiqueta: "Valor invertido (" + moneda + ")", tipo: "plata", valor: anterior.valorInvertido },
        { clave: "valorActual", etiqueta: "Valor actual (" + moneda + ")", tipo: "plata", valor: anterior.valorActual, permiteCero: true, requerido: true },
        { clave: "fechaVencimiento", etiqueta: "Fecha de vencimiento (opcional)", tipo: "fecha", valor: anterior.fechaVencimiento }
      );
    } else {
      campos.push(
        { clave: "valorCompra", etiqueta: "Valor de compra (" + moneda + ")", tipo: "plata", valor: anterior.valorCompra },
        { clave: "fechaCompra", etiqueta: "Fecha de compra", tipo: "fecha", valor: anterior.fechaCompra, requerido: true },
        { clave: "pctAnual", etiqueta: "Depreciación anual (%)", tipo: "decimal", valor: item ? item.pctAnual : 10, requerido: true }
      );
    }
    abrirEditor({
      titulo: (item ? "Editar " : "Agregar ") + objeto,
      campos: campos,
      protegerMontos: true,
      guardar: async function (v) {
        if (ocultos || fuente !== cuenta || monedaVista !== moneda) throw new Error("Vuelve a abrir el registro con los montos visibles.");
        if (inversion && !Inv.validarInversion(v)) throw new Error("Revisa los valores y la fecha.");
        var hoy = new Date();
        if (!inversion && (estimarBien(v, hoy) === null || v.fechaCompra > A.claveDia(hoy))) {
          throw new Error("Usa una fecha de compra hasta hoy y una depreciación del 0 al 100 %.");
        }
        var nuevo = Object.assign(v, { id: anterior.id || idLocal(), moneda: moneda });
        var lista = leerRegistroPatrimonio(tipo);
        if (item) {
          if (!lista.some(function (x) { return x.id === item.id; })) throw new Error("El registro ya no está disponible.");
          lista = lista.map(function (x) { return x.id === item.id ? nuevo : x; });
        } else lista.push(nuevo);
        guardarRegistroPatrimonio(tipo, lista);
      },
      borrar: item && async function () {
        if (fuente !== cuenta || monedaVista !== moneda) throw new Error("Vuelve a abrir el registro.");
        guardarRegistroPatrimonio(tipo, leerRegistroPatrimonio(tipo).filter(function (x) { return x.id !== item.id; }));
      },
      textoBorrar: "Quitar " + objeto,
      confirmar: "¿Quitar «" + anterior.nombre + "»?",
      avisoBorrado: "Registro quitado"
    });
  }

  $("agregar-inversion").addEventListener("click", function () { abrirRegistroPatrimonio("inversiones"); });
  $("agregar-bien").addEventListener("click", function () { abrirRegistroPatrimonio("bienes"); });

  function movimientosPlan(ahora) {
    return datos.movimientos.filter(function (m) {
      return !m.transferencia && m.estado !== "pendiente" && (m.tipo === "ingreso" || m.tipo === "gasto") &&
        new Date(m.fecha) <= ahora;
    });
  }

  function ultimosTresMeses() {
    var ahora = new Date();
    var hasta = Periodos.periodo("mensual", ahora).desde;
    var desde = A.desplazar("mensual", ahora, -3).desde;
    return A.enRango(movimientosPlan(ahora), { desde: desde, hasta: hasta });
  }

  function categoriaParaNova(id) {
    var c = categoria(id);
    if (!c) return "Sin categoría";
    return Parser.CATEGORIAS.some(function (base) { return base.nombre === c.nombre && base.tipo === c.tipo; })
      ? c.nombre : "Categoría " + c.id;
  }

  function enviarAgregadosNova(pregunta) {
    if (ocultos || !fuente) return;
    abrirChat(null);
    preguntarNova(pregunta, { agregados: true });
  }

  document.querySelectorAll("[data-plan-nova]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (ocultos || !fuente) return;
      var movs = ultimosTresMeses();
      if (!movs.length) return toast("Aún no hay movimientos de los últimos 3 meses completos");
      var ingresos = A.totales(movs).ingresos / 3;
      var gastos = A.porCategoria(movs, "gasto").map(function (g) {
        return { categoria: categoriaParaNova(g.id), promedio: g.total / 3 };
      });
      var limites = datos.limites.filter(function (l) { return estadoLimite(l).vigente; }).map(function (l) {
        return { categoria: l.categoria_id == null ? "Todas" : categoriaParaNova(l.categoria_id), ciclo: Periodos.CICLOS[l.ciclo], monto: num(l.monto) };
      });
      if (datos.perfil.presupuesto_monto) {
        limites.unshift({ categoria: "General", ciclo: Periodos.CICLOS[cicloEfectivo()], monto: num(datos.perfil.presupuesto_monto) });
      }
      enviarAgregadosNova(NovaRespuestas.preguntaPlanPresupuesto(ingresos, gastos, limites, monedaBase()));
    });
  });

  function revisarSuscripcionesNova() {
    if (ocultos || !fuente) return;
    var ahora = new Date();
    var desde = A.desplazar("mensual", ahora, -12).desde;
    var gastos = A.enRango(movimientosPlan(ahora), { desde: desde, hasta: Periodos.periodo("mensual", ahora).hasta })
      .filter(function (m) { return m.tipo === "gasto"; });
    var filas = NovaRespuestas.candidatosSuscripciones(gastos.map(function (m) {
      return { comercio: m.descripcion, categoria: categoriaParaNova(m.categoria_id), fecha: A.fechaAnotada(m.fecha), monto: num(m.monto) };
    }));
    if (!filas.length) return toast("Todavía no hay cobros recurrentes para revisar");
    enviarAgregadosNova(NovaRespuestas.preguntaSuscripciones(filas, monedaBase()));
  }

  function calcularSimulacion() {
    var tipo = $("simulacion-tipo").value;
    var etiquetas = { arriendo: "Aumento del arriendo (%)", ingreso: "Meses sin el ingreso principal", gasto: "Nuevo gasto al mes (" + monedaBase() + ")" };
    $("simulacion-etiqueta").textContent = etiquetas[tipo];
    $("simulacion-nova").hidden = true;
    var salida = $("simulacion-resultado");
    salida.textContent = "";
    $("simulacion-campos").hidden = ocultos;
    if (ocultos) { salida.textContent = "Muestra los valores para simular."; return null; }
    var valor = $("simulacion-valor").valueAsNumber;
    if (!Number.isFinite(valor)) return null;
    var movs = ultimosTresMeses();
    if (!movs.length) { salida.textContent = "Aún no hay movimientos de los últimos 3 meses completos."; return null; }
    var t = A.totales(movs);
    var arriendo = movs.filter(function (m) {
      return m.tipo === "gasto" && /\b(arriendo|alquiler|renta)\b/.test(A.sinTildes(m.descripcion));
    });
    var ingresosPorOrigen = new Map();
    movs.forEach(function (m) {
      if (m.tipo !== "ingreso") return;
      var origen = A.sinTildes(m.descripcion).trim() || m.categoria_id;
      ingresosPorOrigen.set(origen, (ingresosPorOrigen.get(origen) || 0) + num(m.monto));
    });
    var principal = 0;
    ingresosPorOrigen.forEach(function (total) { principal = Math.max(principal, total); });
    var base = {
      ingresos: t.ingresos / 3, ingresoPrincipal: principal / 3, gastos: t.gastos / 3,
      arriendo: A.totales(arriendo).gastos / 3, colchon: Math.max(0, saldoTotal())
    };
    var r = NovaHerramientas.simular(tipo, valor, base);
    if (!r) {
      salida.textContent = tipo === "arriendo" && !base.arriendo ? "No encontré un gasto de arriendo en esos meses." :
        tipo === "ingreso" && !base.ingresoPrincipal ? "No hay ingresos en esos meses." :
        tipo === "ingreso" ? "Ingresa un número entero de meses mayor que cero." : "Ingresa un valor válido mayor que cero.";
      return null;
    }
    var ahorro = (r.ahorro < 0 ? "−" : "") + dinero(Math.abs(r.ahorro));
    salida.textContent = (tipo === "ingreso" ? "Ingreso principal estimado de " + dinero(base.ingresoPrincipal) + " al mes. " : "") +
      "El ahorro mensual baja " + dinero(-r.cambio) + " y queda en " + ahorro + ". " +
      (r.mesesColchon === null ? "El escenario no consume el colchón." :
        "El colchón cubre " + numeroCO.format(Math.round(r.mesesColchon * 100) / 100) + " meses de déficit.") +
      (r.duracion === null ? "" : r.mesesColchon === null || r.mesesColchon >= r.duracion ?
        " Alcanza para los " + r.duracion + " meses del escenario." : " Se agota antes de que vuelvan los ingresos.");
    $("simulacion-nova").hidden = false;
    return { tipo: tipo, valor: valor, base: base, resultado: r };
  }

  $("abrir-simulacion").addEventListener("click", function () {
    $("simulacion-valor").value = "";
    calcularSimulacion();
    abrirCapa("pantalla-simulacion");
  });
  $("simulacion-tipo").addEventListener("change", function () { $("simulacion-valor").value = ""; calcularSimulacion(); });
  $("simulacion-valor").addEventListener("input", calcularSimulacion);
  $("simulacion-campos").addEventListener("submit", function (e) { e.preventDefault(); });
  $("simulacion-nova").addEventListener("click", function () {
    if (ocultos || !fuente) return;
    var s = calcularSimulacion();
    if (s) enviarAgregadosNova(NovaRespuestas.preguntaSimulacion(s.tipo, s.valor, s.base, s.resultado, monedaBase()));
  });

  function pintarPlanes() {
    mensaje("inversiones-mensaje", "");
    mensaje("bienes-mensaje", "");
    pintarRegistroPatrimonio();
    pintarCompras();
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
          borrar: function () {
            return Promise.resolve().then(function () {
              aPapelera("metas", m);
              return fuente.borrar("metas", m.id);
            }).then(function () { datos.metas = datos.metas.filter(function (x) { return x.id !== m.id; }); });
          },
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
        var guardada;
        try { guardada = aPapelera("metas", m); } catch (err) { del.disabled = false; return mensaje("meta-mensaje", err.message, true); }
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
    { id: "sugerencias-hora", nombre: "Gastos comunes por hora", inicio: true },
    { id: "trm-dia", nombre: "Dólar hoy (TRM)", inicio: true },
    { id: "racha", nombre: "Tu racha", inicio: true },
    { id: "pagos-proximos", nombre: "Pagos programados próximos", inicio: true },
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
    { id: "reto", nombre: "Retos de ahorro", inicio: true },
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
    { id: "reduccion", nombre: "Metas de reducción" },
    { id: "mesvsprom", nombre: "Tu mes vs. tu promedio" },
    { id: "libertad", nombre: "Tu número de libertad" },
    { id: "calorhora", nombre: "A qué hora y qué día gastas" },
    { id: "resumensemana", nombre: "Resumen semanal", inicio: true },
    { id: "mayoresgastos", nombre: "¿En qué se me fue la plata?", inicio: true },
    { id: "cortes-tarjeta", nombre: "Cortes y pagos de tarjetas", inicio: true },
    { id: "saldo-bajo", nombre: "Avisos de saldo bajo", inicio: true },
    { id: "avisos-limite", nombre: "Avisos de límites", inicio: true },
    { id: "resumen-mes", nombre: "Resumen del mes", inicio: true },
    { id: "meta-sugerida", nombre: "Meta de ahorro sugerida" },
    { id: "ingresos-gastos-12", nombre: "Ingresos vs. gastos, 12 meses" },
    { id: "tendencia-categorias", nombre: "Tendencia por categoría, 6 meses" },
    { id: "ranking-comercios", nombre: "Ranking de comercios" },
    { id: "compara-anios", nombre: "Este año contra el anterior" },
    { id: "flujo-semanal", nombre: "Flujo de caja por semana" },
    { id: "dia-mas-caro", nombre: "Tu día más caro del mes" },
    { id: "patrimonio-neto", nombre: "Patrimonio neto" },
    { id: "distribucion-patrimonio", nombre: "Distribución del patrimonio" },
    { id: "vencimientos-cdt", nombre: "Vencimientos de inversiones", inicio: true },
    { id: "calculadoras-inversion", nombre: "Calculadoras de inversión" },
    { id: "promedio-dia", nombre: "Gasto promedio por día", inicio: true },
    { id: "regla503020", nombre: "Regla 50/30/20" },
    { id: "gasto-inusual", nombre: "Gastos inusuales", inicio: true },
    { id: "fondo-emergencia", nombre: "Fondo de emergencia" },
    { id: "servicios-por-mes", nombre: "Servicios públicos mes a mes" },
    { id: "consejo-dia", nombre: "Consejo financiero del día", inicio: true },
    { id: "pruebas-gratis", nombre: "Pruebas gratis por terminar", inicio: true },
    { id: "aviso-pago", nombre: "Aviso del día de pago", inicio: true },
    { id: "calificar-compra", nombre: "¿Valió la pena?", inicio: true },
    { id: "resumen-compras", nombre: "Compras calificadas" },
    { id: "sugerencias-ahorro", nombre: "Sugerencias para bajar gastos" }
  ];
  function configWidgets() {
    var anterior = leerLocal("nova-widgets", []) || [];
    var guardado = fuente.demo ? fuente.widgets || anterior : leerLocal(claveComodidad("widgets"), anterior) || [];
    var fijo = guardado.find(function (w) { return w.id === "sugerencias-hora"; });
    var lista = [fijo || { id: "sugerencias-hora", visible: true }].concat(guardado.filter(function (w) {
      return w.id !== "sugerencias-hora" && WIDGETS.some(function (x) { return x.id === w.id; });
    }));
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
    pintarWidgets($("widgets"), false, A.enRango(datos.movimientos, rango), ciclo, ref, rango);
  }

  function pintarWidgets(cont, inicio, movs, ciclo, ref, rango) {
    cont.replaceChildren();
    if (inicio) pintarSugerenciasHora();
    configWidgets().forEach(function (w) {
      if (w.id === "sugerencias-hora" || !w.visible || (inicio && !WIDGETS.find(function (x) { return x.id === w.id; }).inicio)) return;
      var art = crearWidget(w.id, movs, ciclo, ref, rango, inicio);
      if (art.childNodes.length) cont.append(art);
    });
  }

  function crearWidget(id, movs, ciclo, ref, rango, inicio) {
    var art = el("article", "tarjeta widget");
    art.dataset.widget = id;
    var render = {
      "aviso-dueno": inicio ? pintarAvisoDueno : null, "sugerencias-hora": wSugerenciasHora, racha: inicio ? wRacha : null,
      "pagos-proximos": inicio ? wPagosProximos : null, "trm-dia": inicio ? wTrmDia : null,
      rapida: wRapida, categorias: wCategorias, etiquetas: wEtiquetas, "ingresos-gastos": wIngresosGastos,
      tendencia: wTendencia, proyeccion: wProyeccion, consejos: wConsejos, calendario: wCalendario, logros: wLogros,
      herramientas: wHerramientas, salud: wSalud, calculadoras2: wMasCalculadoras, reto: function (art) { wReto(art, inicio); },
      suscripciones: wSuscripciones, inflacion: wInflacion, comparar: wComparar, evento: wEvento, fijos: wFijos,
      pronostico: wPronostico, anio: wAnio, bola: wBola, alcancia: wAlcancia, sobres: wSobres, plan: wPlan,
      singasto: wSinGasto, lugares: wLugares, semanasmes: wSemanasMes, reduccion: wReduccion,
      mesvsprom: wMesVsPromedio, libertad: wLibertad, calorhora: wCalorHora,
      resumensemana: wResumenSemana, mayoresgastos: wMayoresGastos,
      "promedio-dia": wPromedioDia, regla503020: wRegla503020, "gasto-inusual": wGastoInusual,
      "cortes-tarjeta": wCortesTarjeta, "saldo-bajo": wSaldoBajo, "avisos-limite": wAvisosLimite, "resumen-mes": wResumenMes, "meta-sugerida": wMetaSugerida,
      "ingresos-gastos-12": wIngresosGastos12, "tendencia-categorias": wTendenciaCategorias,
      "ranking-comercios": wRankingComercios, "compara-anios": wComparaAnios, "flujo-semanal": wFlujoSemanal,
      "dia-mas-caro": wDiaMasCaro, "patrimonio-neto": wPatrimonioNeto,
      "distribucion-patrimonio": wDistribucionPatrimonio, "vencimientos-cdt": wVencimientosCdt,
      "calculadoras-inversion": wCalculadorasInversion,
      "fondo-emergencia": wFondoEmergencia, "servicios-por-mes": wServiciosPorMes, "consejo-dia": wConsejoDia, "pruebas-gratis": wPruebasGratis,
      "aviso-pago": inicio ? wAvisoPago : null, "calificar-compra": inicio ? wCalificarCompra : null,
      "resumen-compras": wResumenCompras, "sugerencias-ahorro": wSugerenciasAhorro
    }[id];
    if (render) render(art, movs, ciclo, ref, rango);
    return art;
  }
  document.querySelectorAll("[data-periodo-analisis]").forEach(function (b) {
    b.addEventListener("click", function () { desfaseAnalisis += Number(b.dataset.periodoAnalisis); pintarAnalisis(); });
  });

  function botonHabito(texto, accion) {
    var b = el("button", "mini", texto);
    b.type = "button";
    b.addEventListener("click", accion);
    return b;
  }

  function wTrmDia(art) {
    var tasas = leerLocal("nova-tasas", null);
    var trm = Mon.formatoTRM(tasas && tasas.trm);
    if (!trm) return;
    var b = el("button", "trm-dia");
    b.type = "button";
    b.append(el("strong", null, trm.texto), el("small", "nota", trm.fecha));
    b.addEventListener("click", function () { ir("ajustes-tasas"); });
    art.append(b);
  }

  function pintarSugerenciasHora() {
    var cont = $("sugerencias-hora");
    cont.replaceChildren();
    if (!configWidgets().some(function (w) { return w.id === "sugerencias-hora" && w.visible; })) return;
    var widget = crearWidget("sugerencias-hora");
    if (widget.childNodes.length) cont.append(widget);
  }

  function wSugerenciasHora(art) {
    var sugerencias = A.sugerenciasPorHora(datos.movimientos, new Date());
    if (!sugerencias.length) return;
    titulo(art, "A esta hora sueles anotar");
    var botones = el("div", "frecuentes");
    sugerencias.forEach(function (m) {
      var texto = m.descripcion + (ocultos ? "" : " " + dinero(num(m.monto)));
      botones.append(botonHabito(texto, function () { abrirRegistro({ repetir: m }); }));
    });
    art.append(botones);
  }

  function wRacha(art) {
    var r = A.rachaDias(datos.movimientos, new Date()), hito = A.hitoDeRacha(r.record);
    titulo(art, "🔥 Tu racha");
    art.append(el("strong", null, r.actual + (r.actual === 1 ? " día seguido" : " días seguidos")),
      el("p", "nota", "Récord de " + r.record + (r.record === 1 ? " día" : " días")));
    if (hito) art.append(el("p", "insignia-racha", hito.emoji + " " + hito.dias + " días · " + hito.mensaje));
  }

  function wPagosProximos(art) {
    var pagos = A.programadosProximos(datos.programados, new Date(), 1);
    if (!pagos.length) return;
    titulo(art, "Pagos programados");
    var lista = el("ul", "lista-local");
    pagos.forEach(function (p) {
      var texto = (p.dias === 0 ? "Hoy vence: " : "Mañana vence: ") + (p.programado.descripcion || "Pago programado");
      lista.append(el("li", null, texto + (ocultos ? "" : " (" + dinero(num(p.programado.monto)) + ")")));
    });
    art.append(lista);
  }

  function wAvisoPago(art) {
    if (!A.avisoDiaPago(leerLocal("nova-dia-pago", ""), datos.movimientos, new Date())) return;
    var cfg = leerLocal("nova-apartar", null);
    var pct = cfg && cfg.pct || 10;
    titulo(art, "Hoy te pagan: ¿anotamos tu sueldo?");
    art.append(botonHabito("Anotar ingreso", function () { abrirRegistro({ tipo: "ingreso" }); }),
      el("p", "nota", "Págate primero. Puedes apartar el " + pct + " % para una meta cuando recibas tu sueldo."),
      botonHabito("Ir a Apartar al cobrar", function () {
        ir("ajustes");
        $("apartar-activo").focus({ preventScroll: true });
        $("apartar-activo").closest("article").scrollIntoView({ block: "center" });
      }));
  }

  function calificacionesCompras() {
    return fuente.demo ? fuente.calificacionesCompras || {} : leerLocal("nova-calificaciones-compras:" + fuente.email, {}) || {};
  }

  function nombreCompra(m) { return m.descripcion || nombreCategoriaVisible(m.categoria_id); }

  function wCalificarCompra(art) {
    var compra = A.comprasParaCalificar(datos.movimientos, calificacionesCompras(), new Date())[0];
    if (!compra) return;
    titulo(art, "¿Valió la pena?");
    art.append(el("p", "nota habito-texto", nombreCompra(compra) + " · " + dinero(num(compra.monto))));
    var acciones = el("div", "habito-acciones");
    [["Sí", "si"], ["Más o menos", "regular"], ["No", "no"]].forEach(function (opcion) {
      acciones.append(botonHabito(opcion[0], function () {
        var calificaciones = calificacionesCompras();
        calificaciones[compra.id] = opcion[1];
        if (fuente.demo) fuente.calificacionesCompras = calificaciones;
        else if (!guardarLocal("nova-calificaciones-compras:" + fuente.email, calificaciones)) {
          return toast("No pude guardar la calificación en este dispositivo");
        }
        pintarInicio();
        pintarAnalisis();
        toast("Calificación guardada");
      }));
    });
    art.append(acciones);
  }

  function wResumenCompras(art) {
    var r = A.resumenCalificaciones(datos.movimientos, calificacionesCompras());
    titulo(art, "Compras calificadas");
    art.append(el("p", "nota", r.total + (r.total === 1 ? " compra calificada" : " compras calificadas")));
    if (!r.noValieron.length) return;
    art.append(el("strong", null, "Compras que no valieron la pena"));
    var lista = el("ul", "lista-simple habito-texto");
    r.noValieron.forEach(function (m) {
      lista.append(el("li", "nota", nombreCompra(m) + " · " + A.nombreDia(m.fecha) + " · " + dinero(num(m.monto))));
    });
    art.append(lista);
  }

  function wSugerenciasAhorro(art) {
    titulo(art, "Sugerencias para bajar gastos");
    var propuestas = A.sugerenciasAhorro(datos.movimientos, new Date(), datos.categorias);
    if (!propuestas.length) return art.append(el("p", "nota", "Cuando anotes gastos este mes, verás ideas para ahorrar."));
    var lista = el("ul", "lista-simple");
    propuestas.forEach(function (r) {
      var li = el("li", "habito-texto");
      li.append(el("strong", null, nombreCategoriaVisible(r.categoriaId)), el("p", "nota", r.consejo),
        el("p", "nota", "Si bajas el gasto un 10 %, ahorrarías " + dinero(r.ahorro) + " al mes."));
      lista.append(li);
    });
    art.append(lista);
  }

  function wFondoEmergencia(art) {
    titulo(art, "Fondo de emergencia");
    var cuentas = datos.cuentas.filter(function (c) { return c.tipo === "ahorro" || c.tipo === "efectivo"; });
    var tieneAhorro = cuentas.length > 0;
    if (!tieneAhorro) cuentas = datos.cuentas.filter(function (c) { return c.tipo !== "credito"; });
    var saldo = cuentas.reduce(function (total, c) { return total + saldoCuenta(c); }, 0);
    var r = A.fondoEmergencia(datos.movimientos, saldo, new Date());
    if (!r) return art.append(el("p", "nota", "Faltan gastos registrados en los últimos 3 meses completos."));
    art.append(el("p", "nota", "Gasto promedio de los últimos 3 meses completos · " + dinero(r.gastoMensual)),
      el("p", "nota", (tieneAhorro ? "Disponible en ahorros y efectivo" : "Disponible en cuentas sin crédito") +
        " · " + dinero(r.saldoDisponible)));
    r.metas.forEach(function (meta) {
      var nombre = "Meta de " + meta.meses + " meses";
      art.append(el("strong", null, nombre + " · " + dinero(meta.monto)));
      if (!ocultos) {
        var barra = el("progress", "regla-barra");
        barra.max = 1;
        barra.value = meta.progreso;
        barra.setAttribute("aria-label", nombre);
        art.append(barra);
      }
      art.append(el("p", "nota", meta.falta > 0 ? "Te faltan " + dinero(meta.falta) : "Meta alcanzada"));
    });
  }

  function wServiciosPorMes(art) {
    titulo(art, "Servicios públicos mes a mes");
    var movs = datos.movimientos.map(function (m) {
      return Object.assign({}, m, { categoria: nombreCategoria(m.categoria_id) });
    });
    art.append(el("p", "nota", "Incluye lo que llevas registrado del mes en curso."));
    A.serviciosPorMes(movs, new Date()).forEach(function (servicio) {
      var meses = servicio.meses.map(function (mes) {
        return A.nombreCorto("mensual", mes) + " " + dinero(mes.total);
      });
      var cambio = servicio.diferencia > 0 ? "Subió" : servicio.diferencia < 0 ? "Bajó" : "Sin cambio";
      art.append(el("strong", null, servicio.nombre), el("p", "nota", meses.join(" · ")),
        el("p", "nota", cambio + " frente al mes anterior"));
    });
  }

  function wConsejoDia(art) {
    titulo(art, "Consejo financiero del día");
    art.append(el("p", null, NovaConsejos.consejoDelDia(new Date())));
  }

  function wPromedioDia(art) {
    titulo(art, "Gasto promedio por día");
    var r = A.promedioDia(datos.movimientos, new Date());
    var estado = {
      verde: "Igual o por debajo del promedio",
      amarillo: "Hasta un 15 % por encima del promedio",
      rojo: "Más de un 15 % por encima del promedio"
    };
    art.append(el("p", null, "Este mes: " + dinero(r.actual) + " al día"));
    art.append(el("p", "nota", "Tres meses anteriores: " + dinero(r.anterior) + " al día"));
    art.append(el("p", "promedio-" + r.semaforo, estado[r.semaforo]));
  }

  function wRegla503020(art, movs, ciclo, ref, rango) {
    titulo(art, "Regla 50/30/20");
    var r = A.regla503020(movs, datos.categorias, rango);
    if (r.ahorro === null) return art.append(el("p", "nota", "Aún no hay ingresos en este periodo."));
    [["Necesidades", r.necesidades, 50], ["Deseos", r.deseos, 30], ["Ahorro", r.ahorro, 20]].forEach(function (fila) {
      var texto = fila[0] + " · " + numeroCO.format(Math.round(fila[1] * 10) / 10) + " % · Meta " + fila[2] + " %";
      var barra = el("progress", "regla-barra");
      barra.max = 100;
      barra.value = Math.min(fila[1], 100);
      barra.setAttribute("aria-label", texto);
      art.append(el("div", null, texto), barra);
    });
  }

  function wGastoInusual(art) {
    var alertas = A.gastosInusuales(datos.movimientos, new Date());
    if (!alertas.length) return;
    titulo(art, "Gastos inusuales");
    alertas.forEach(function (a) {
      art.append(el("p", null, "Gastaste " + numeroCO.format(Math.round(a.veces * 10) / 10) +
        " veces más de lo normal en " + nombreCategoriaVisible(a.categoriaId) + "."));
    });
  }

  function wCortesTarjeta(art) {
    var dias = leerDiasTarjeta();
    var tarjetas = datos.cuentas.filter(function (c) { return c.tipo === "credito"; }).map(function (c) {
      return Object.assign({ id: c.id, nombre: c.nombre }, dias[c.id]);
    });
    var proximos = A.proximosCortes(tarjetas, new Date());
    if (!proximos.length) return;
    titulo(art, "Cortes y pagos de tarjetas");
    proximos.forEach(function (t) {
      var fila = el("div");
      fila.append(el("strong", null, t.nombre));
      [["Corte", t.corte], ["Pago", t.pago]].forEach(function (evento) {
        var faltan = evento[1];
        if (faltan === null) return;
        var plazo = faltan === 0 ? "hoy" : faltan === 1 ? "mañana (1 día)" : "en " + faltan + " días";
        fila.append(el("p", faltan <= 3 ? "nota mal" : "nota", evento[0] + " " + plazo));
      });
      art.append(fila);
    });
  }

  function wSaldoBajo(art) {
    var minimos = leerMinimosCuenta(), saldos = {};
    datos.cuentas.forEach(function (c) {
      if (Number.isFinite(minimos[c.id])) saldos[c.id] = saldoCuenta(c);
    });
    var avisos = A.cuentasBajas(datos.cuentas, saldos, minimos);
    if (!avisos.length) return;
    titulo(art, "Saldo bajo");
    avisos.forEach(function (aviso) {
      var texto = "Tu cuenta " + aviso.cuenta.nombre;
      art.append(el("p", "nota mal", ocultos ? texto + " está por debajo de tu mínimo."
        : texto + " está en " + dinero(aviso.saldo) + ", por debajo de tu mínimo de " + dinero(aviso.minimo) + "."));
    });
  }

  function wAvisosLimite(art) {
    var vigentes = [], gastos = {};
    datos.limites.forEach(function (l) {
      if (l.categoria_id == null) return;
      var estado = estadoLimite(l);
      if (!estado.vigente) return;
      vigentes.push(l);
      gastos[l.id] = estado.gastado;
    });
    var avisos = A.avisosLimite(vigentes, gastos);
    if (!avisos.length) return;
    titulo(art, "Avisos de límites");
    avisos.forEach(function (aviso) {
      var l = aviso.limite;
      var nombre = nombreCategoriaVisible(l.categoria_id) + " (" + (Periodos.CICLOS[l.ciclo] || Periodos.CICLOS.mensual).toLowerCase() + ")";
      var texto = aviso.nivel === 80 ? "Ya usaste al menos el 80 % del límite de " :
        aviso.gastado > num(l.monto) ? "Te pasaste del límite de " : "Llegaste al 100 % del límite de ";
      art.append(el("p", "nota mal", texto + nombre + "."));
    });
  }

  function wResumenMes(art) {
    var r = A.resumenMes(datos.movimientos, new Date());
    var nombre = r.mes + (r.enCurso ? " hasta hoy" : "");
    var valores = [["Ganaste", r.ingresos], ["Gastaste", r.gastos], [r.ahorro < 0 ? "Te faltó" : "Ahorraste", Math.abs(r.ahorro)]];
    var categoria = r.categoriaTop ? "En lo que más gastaste: " + nombreCategoriaVisible(r.categoriaTop.id) + "." : "Sin gastos registrados.";
    titulo(art, "Resumen del mes");
    art.append(el("p", "nota", nombre));
    var rejilla = el("div", "rejilla-rapida");
    valores.forEach(function (par) {
      var dato = el("div", "dato-rapido");
      dato.append(el("small", null, par[0]), el("strong", null, dinero(par[1])));
      rejilla.append(dato);
    });
    var compartir = el("button", "mini", "📤 Compartir resumen"); compartir.type = "button";
    compartir.addEventListener("click", function () {
      var lineas = valores.map(function (par) { return par[0] + " " + dinero(par[1]); });
      compartirTexto("Mi mes en NOVA", ["Mi mes en NOVA · " + nombre].concat(lineas, [categoria, r.frase]).join("\n"));
    });
    art.append(rejilla, el("p", "nota", categoria), el("p", "nota", r.frase), compartir);
  }

  function wMetaSugerida(art) {
    titulo(art, "Meta de ahorro sugerida");
    var r = A.metaSugerida(datos.movimientos, new Date());
    var texto = "Primero recorta algunos gastos para que te quede plata para ahorrar.";
    if (r.monto !== null) texto = "Podrías guardar " + dinero(r.monto) + " al mes.";
    else if (r.sobro) texto = "Te sobró un poco. Puedes empezar guardando lo que puedas.";
    art.append(el("p", "nota", texto), el("p", "nota", "Según lo que te sobró en los últimos tres meses completos."));
  }

  function wCalorHora(art, movs, ciclo, ref, rango) {
    titulo(art, "🕒 A qué hora y qué día gastas");
    var r = A.calorHoraDia(movs, rango.desde, rango.hasta);
    if (!r) return art.append(el("p", "nota", "Cuando anotes gastos en este periodo, aquí ves a qué hora y qué día gastas más."));

    var dias = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
    var diasCortos = ["L", "M", "X", "J", "V", "S", "D"];
    var franjas = ["12 a 4 a. m.", "4 a 8 a. m.", "8 a. m. a 12 p. m.", "12 a 4 p. m.", "4 a 8 p. m.", "8 p. m. a 12 a. m."];
    var pico = r.pico;
    art.append(el("p", "calc-res", "Gastas más los " + dias[pico.dia] + " de " + franjas[pico.franja] +
      (ocultos ? "" : " (" + dinero(pico.total) + ")") + "."));

    var cuad = el("div", "calor-hora");
    cuad.append(el("div"));
    franjas.forEach(function (_, franja) {
      cuad.append(el("div", "calor-hora-enc", (franja * 4) + "h"));
    });
    r.celdas.forEach(function (fila, dia) {
      cuad.append(el("div", "calor-hora-enc", diasCortos[dia]));
      fila.forEach(function (dato, franja) {
        var celda = el("div", "calor-hora-celda");
        var pct = dato.total && r.max ? Math.round(15 + 85 * Math.sqrt(dato.total / r.max)) : 0;
        var cantidad = dato.cantidad + (dato.cantidad === 1 ? " gasto" : " gastos");
        var etiqueta = dias[dia] + " " + franjas[franja] + ": " +
          (ocultos ? cantidad : dinero(dato.total) + " (" + cantidad + ")");
        celda.style.setProperty("--calor-hora-intensidad", pct + "%");
        celda.title = etiqueta;
        celda.setAttribute("role", "img");
        celda.setAttribute("aria-label", etiqueta);
        cuad.append(celda);
      });
    });
    art.append(cuad, el("p", "nota", "Más intenso el color = más plata en esa franja. Toma los gastos del periodo que estás viendo."));
    var franjasConGasto = [];
    r.celdas.forEach(function (fila, dia) {
      fila.forEach(function (dato, franja) {
        if (dato.total) franjasConGasto.push([dias[dia] + " · " + franjas[franja], dato.total]);
      });
    });
    franjasConGasto.sort(function (a, b) { return b[1] - a[1]; });
    var total = franjasConGasto.reduce(function (suma, fila) { return suma + fila[1]; }, 0);
    explicarGrafico(art, "Gasto por día y franja horaria", periodoGrafico(rango), [["Gasto total", total]].concat(franjasConGasto));
  }

  function barrasAnalisis(art, filas, primera, segunda, nombre, periodo) {
    var max = filas.reduce(function (tope, f) { return Math.max(tope, f.a, f.b); }, 0) || 1;
    var grafico = el("div", "barras-dobles barras-analisis");
    grafico.style.gridTemplateColumns = "repeat(" + filas.length + ", minmax(0, 1fr))";
    grafico.setAttribute("aria-hidden", "true");
    var leyenda = el("div", "leyenda");
    leyenda.append(el("span", "l-ingreso", primera), el("span", "l-gasto", segunda));

    var detalle = el("details"), lista = el("ul", "lista-simple");
    detalle.append(el("summary", null, "Ver detalle"), lista);
    filas.forEach(function (f) {
      var par = el("div", "par"), barras = el("div", "par-barras");
      var a = el("span", "b-ingreso"), b = el("span", "b-gasto");
      a.style.height = (f.a / max) * 100 + "%";
      b.style.height = (f.b / max) * 100 + "%";
      a.title = primera + " · " + f.nombre + " · " + dinero(f.a);
      b.title = segunda + " · " + f.nombre + " · " + dinero(f.b);
      barras.append(a, b);
      par.append(barras, el("small", null, f.etiqueta));
      grafico.append(par);
      var texto = primera + " " + dinero(f.a) + " · " + segunda + " " + dinero(f.b);
      if (f.neto !== undefined) texto += " · Neto " + dinero(f.neto);
      lista.append(filaAnalisis(f.nombre, texto));
    });
    art.append(grafico, leyenda, detalle);
    var total = filas.reduce(function (suma, f) { return [suma[0] + f.a, suma[1] + f.b]; }, [0, 0]);
    var orden = " · " + primera + " / " + segunda;
    explicarGrafico(art, nombre, periodo, [["Total" + orden, total[0], total[1]]].concat(filas.map(function (f) {
      return [f.nombre + orden, f.a, f.b];
    })));
  }

  function filaAnalisis(nombre, texto) {
    var fila = el("li", "consejo fila-analisis"), cuerpo = el("div");
    cuerpo.append(el("strong", null, nombre), el("small", null, texto));
    fila.append(cuerpo);
    return fila;
  }

  function wIngresosGastos12(art) {
    titulo(art, "Ingresos vs. gastos, 12 meses");
    var meses = A.ingresosGastos12(datos.movimientos, new Date());
    barrasAnalisis(art, meses.map(function (mes) {
      return { etiqueta: A.nombreCorto("mensual", mes), nombre: A.nombrePeriodo("mensual", mes),
        a: mes.ingresos, b: mes.gastos };
    }), "Ingresos", "Gastos", "Ingresos vs. gastos", "Últimos 12 meses");
  }

  function wTendenciaCategorias(art) {
    titulo(art, "Tendencia por categoría, 6 meses");
    var filas = A.tendenciaCategorias(datos.movimientos, new Date());
    if (!filas.length) return art.append(el("p", "nota", "No hay gastos en los últimos 6 meses."));
    filas.forEach(function (f) {
      var nombre = nombreCategoriaVisible(f.id);
      var cambio = f.diferencia === 0 ? "Sin cambio frente al mes anterior" :
        f.porcentaje === null ? "El mes anterior quedó en cero" :
        (f.diferencia > 0 ? "Subió " : "Bajó ") + Math.round(Math.abs(f.porcentaje)) + "% frente al mes anterior";
      if (f.diferencia && !ocultos) cambio += " (" + dinero(Math.abs(f.diferencia)) + ")";
      var etiquetas = f.meses.map(function (mes) { return A.nombreCorto("mensual", mes); });
      var svg = lineaSVG(f.meses.map(function (mes) { return mes.total; }), etiquetas, "gastos", 52);
      svg.classList.add("linea-mini");
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", f.meses.map(function (mes) {
        return A.nombrePeriodo("mensual", mes) + " " + dinero(mes.total);
      }).join(", "));
      var grupo = el("div");
      grupo.append(el("strong", null, nombre), el("p", "nota", cambio), svg);
      explicarGrafico(grupo, "Tendencia de gastos en " + nombreCategoria(f.id), "Últimos 6 meses", f.meses.map(function (mes) {
        return [A.nombrePeriodo("mensual", mes), mes.total];
      }));
      art.append(grupo);
    });
  }

  function wRankingComercios(art) {
    titulo(art, "Ranking de comercios");
    var filas = A.rankingComercios(datos.movimientos, new Date());
    if (!filas.length) return art.append(el("p", "nota", "No hay compras en los últimos 90 días."));
    art.append(el("p", "nota", "Últimos 90 días"));
    var lista = el("ol", "lista-simple");
    filas.forEach(function (f) {
      lista.append(filaAnalisis(f.nombre || "Sin descripción",
        dinero(f.total) + " · " + f.compras + (f.compras === 1 ? " compra" : " compras")));
    });
    art.append(lista);
  }

  function wComparaAnios(art) {
    titulo(art, "Este año contra el anterior");
    var r = A.comparaAnios(datos.movimientos, new Date());
    art.append(el("p", "nota", "Gasto de este año hasta hoy y del año anterior completo."));
    barrasAnalisis(art, r.meses.map(function (mes, i) {
      return { etiqueta: mes.etiqueta, nombre: A.MESES[i], a: mes.actual, b: mes.anterior };
    }), String(r.anio), String(r.anioAnterior), "Gasto de este año contra el anterior", r.anio + " y " + r.anioAnterior);
    art.append(el("p", "calc-res", r.anio + " " + dinero(r.totalActual) + " · " +
      r.anioAnterior + " " + dinero(r.totalAnterior) + " · Diferencia " + dinero(r.diferencia)));
  }

  function wFlujoSemanal(art) {
    titulo(art, "Flujo de caja por semana");
    var semanas = A.flujoSemanal(datos.movimientos, new Date());
    art.append(el("p", "nota", "Últimas 8 semanas, de lunes a domingo. El neto es lo que entró menos lo que salió."));
    barrasAnalisis(art, semanas.map(function (semana) {
      return { etiqueta: A.nombreCorto("semanal", semana), nombre: A.nombrePeriodo("semanal", semana),
        a: semana.ingresos, b: semana.gastos, neto: semana.neto };
    }), "Entró", "Salió", "Flujo de caja por semana", "Últimas 8 semanas");
    art.append(el("p", "calc-res", "Neto de esta semana " + dinero(semanas[semanas.length - 1].neto)));
  }

  function wDiaMasCaro(art) {
    titulo(art, "Tu día más caro del mes");
    var r = A.diaMasCaro(datos.movimientos, new Date());
    if (!r) return art.append(el("p", "nota", "No hay gastos este mes."));
    art.append(el("p", "calc-res", fechaCorta.format(r.fecha) + " · " + dinero(r.total)));
    var lista = el("ul", "lista-simple");
    r.gastos.forEach(function (g) {
      lista.append(filaAnalisis(g.descripcion || nombreCategoriaVisible(g.categoria_id), dinero(num(g.monto))));
    });
    art.append(lista);
  }

  function patrimonioActual() {
    var saldos = Object.create(null);
    datos.cuentas.forEach(function (c) { saldos[c.id] = saldoCuenta(c); });
    var base = A.patrimonioNeto(datos.cuentas, saldos, resumenDeDeudas());
    var inversiones = Inv.resumenInversiones(registroEnMoneda("inversiones")).totalActual;
    var hoy = new Date();
    var bienes = registroEnMoneda("bienes").reduce(function (total, bien) { return total + estimarBien(bien, hoy); }, 0);
    return { cuentas: base.activos, inversiones: inversiones, bienes: bienes, deudas: base.pasivos };
  }

  function wPatrimonioNeto(art) {
    titulo(art, "Patrimonio neto");
    var valores = patrimonioActual();
    var r = Inv.distribucionPatrimonio(valores.cuentas, valores.inversiones, valores.bienes, valores.deudas);
    var max = Math.max(r.activos, r.deudas) || 1;
    art.append(el("p", "calc-res", "Patrimonio neto " + dinero(r.neto)), el("div", "nota", "Activos " + dinero(r.activos)));
    if (!ocultos) art.append(barraSimple(r.activos / max * 100, false));
    art.append(el("div", "nota", "Pasivos " + dinero(r.deudas)));
    if (!ocultos) art.append(barraSimple(r.deudas / max * 100, true));
    explicarGrafico(art, "Patrimonio neto", "Saldo actual", [["Activos", r.activos], ["Pasivos", r.deudas], ["Patrimonio neto", r.neto]]);
  }

  function wDistribucionPatrimonio(art) {
    titulo(art, "Distribución del patrimonio");
    var valores = patrimonioActual();
    var r = Inv.distribucionPatrimonio(valores.cuentas, valores.inversiones, valores.bienes, valores.deudas);
    [["cuentas", "Efectivo y cuentas"], ["inversiones", "Inversiones"], ["bienes", "Bienes"]].forEach(function (par) {
      var pct = r.porcentajes[par[0]];
      var detalle = ocultos ? dinero(0) : dinero(valores[par[0]]) + " · " + pct.toLocaleString("es-CO", { maximumFractionDigits: 1 }) + " %";
      art.append(el("p", "nota", par[1] + " · " + detalle));
      if (!ocultos) art.append(barraSimple(pct, false));
    });
    art.append(el("p", "calc-res", "Deudas " + dinero(r.deudas)));
    explicarGrafico(art, "Distribución del patrimonio", "Saldo actual", [
      ["Efectivo y cuentas", valores.cuentas], ["Inversiones", valores.inversiones], ["Bienes", valores.bienes], ["Deudas", r.deudas]
    ]);
  }

  function wVencimientosCdt(art) {
    var proximos = Inv.vencimientosProximos(registroEnMoneda("inversiones"), new Date(), 15);
    if (!proximos.length) return;
    titulo(art, "Vencimientos de inversiones");
    var lista = el("ul", "lista-simple");
    proximos.forEach(function (item) {
      var estado = item.dias < 0 ? "Vencida" : item.dias === 0 ? "Vence hoy" :
        item.dias === 1 ? "Vence mañana" : "Vence en " + item.dias + " días";
      lista.append(filaAnalisis(item.nombre, Inv.TIPOS[item.tipo] + " · " + estado + " · " +
        fechaCorta.format(parteFechaLocal(item.fechaVencimiento))));
    });
    art.append(lista);
  }

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
  function wCalendario(art, movs, ciclo, ref) {
    var cal = A.calendarioMes(datos.movimientos, ref.getFullYear(), ref.getMonth(), new Date());
    titulo(art, "Calendario de gastos · " + cal.nombre);
    var cuad = el("div", "cal-dias");
    pintarDiasCalendario(cuad, cal, true, null, function (clave) { abrirCalendario("analisis", clave); });
    art.append(cuad);
    explicarCalendario(art, cal, "gasto");
  }
  function wLogros(art) {
    titulo(art, "Logros");
    var deudasPagadas = resumenDeDeudas().lista.filter(function (x) { return x.estado === "pagada"; }).length;
    var lista = NovaConsejos.logros({ movimientos: datos.movimientos, racha: A.racha(datos.movimientos), metas: datos.metas, deudasPagadas: deudasPagadas, grupos: datos.grupos.length });
    lista = lista.concat(NovaConsejos.logrosEmbajador(fuente.demo ? 0 : leerLocal(claveComodidad("veces-compartido"), 0)));
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
  function wHerramientas(art, movs, ciclo, ref, rango) {
    titulo(art, "Calculadoras");
    var ingresos = A.totales(movs).ingresos;
    // Crédito
    var c = el("div", "calc"); c.append(el("strong", null, "🏦 Simulador de crédito"));
    var cm = campoCalc("¿Cuánto pides?", "cr-monto", "10 millones", true), ct = campoCalc("Interés mensual (%)", "cr-tasa", "1,8"), cn = campoCalc("¿En cuántos meses?", "cr-meses", "24");
    var cr = el("p", "calc-res", "Escribe los tres datos.");
    var avisoCredito = el("p", "mensaje error", AVISO_USURA); avisoCredito.hidden = true;
    avisoCredito.setAttribute("role", "alert");
    [cm, ct, cn].forEach(function (f) { c.append(f[0], f[1]); }); c.append(avisoCredito, cr);
    function calcCredito() {
      var mensual = A.porcentajeValido(ct[1].value);
      avisoCredito.hidden = !A.superaUsura(A.tasaAnualDesdeMensual(mensual), tasaUsura());
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
    calculadoraGmf(art, movs, ciclo, rango);
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
    selA.setAttribute("aria-label", "Comparar dos meses: mes de referencia");
    selB.setAttribute("aria-label", "Comparar dos meses: mes a comparar");
    meses.forEach(function (m) { [selA, selB].forEach(function (s) { var o = el("option", null, m.nombre); o.value = m.clave; s.append(o); }); });
    selA.value = meses[1].clave; selB.value = meses[0].clave;
    var res = el("div");
    art.append(selA, selB, res);
    function pintarComp() {
      var r = NovaConsejos.compararMeses(datos.movimientos, Number(selA.value), Number(selB.value));
      res.replaceChildren();
      res.append(el("p", "calc-res", ocultos ? "••••" : "Gastaste " + dinero(Math.abs(r.dif)) + (r.dif > 0 ? " más" : " menos") + " en el segundo mes (" + dinero(r.totalA) + " → " + dinero(r.totalB) + ")."));
      var ul = el("ul", "lista-simple");
      r.filas.slice(0, 8).forEach(function (f) { var li = el("li", "consejo"); var d = el("div"); d.append(el("strong", null, nombreCategoriaVisible(f.categoria_id)), el("small", null, ocultos ? "••••" : dinero(f.a) + " → " + dinero(f.b) + " (" + (f.dif > 0 ? "+" : "−") + dinero(Math.abs(f.dif)) + ")")); li.append(d); ul.append(li); });
      res.append(ul);
    }
    selA.addEventListener("change", pintarComp); selB.addEventListener("change", pintarComp); pintarComp();
  }
  function wMayoresGastos(art) {
    titulo(art, "¿En qué se me fue la plata?");
    var gastos = A.mayoresGastos(datos.movimientos, new Date(), 5);
    if (!gastos.length) return art.append(el("p", "nota", "Todavía no has anotado gastos este mes."));

    art.append(el("p", "nota", "Las compras más grandes de este mes"));
    var lista = el("ul", "lista-simple");
    gastos.forEach(function (g) {
      var li = el("li", "consejo"), detalle = el("div");
      detalle.append(el("strong", null, g.descripcion || "Gasto"),
        el("small", null, nombreCategoriaVisible(g.categoria_id) + " · " + fechaCorta.format(new Date(g.fecha))));
      detalle.append(el("small", null, ocultos ? "••••" : dinero(g.monto) + " · " + numeroCO.format(g.porcentaje) + " % del gasto del mes"));
      li.append(detalle);
      lista.append(li);
    });
    art.append(lista);
  }

  function wResumenSemana(art) {
    titulo(art, "Resumen semanal");
    var r = A.resumenSemana(datos.movimientos, new Date());
    art.append(el("p", "calc-res", "Esta semana, hasta hoy: " + dinero(r.totalActual)),
      el("p", "nota", "Semana pasada completa: " + dinero(r.totalAnterior)));
    if (!ocultos) {
      art.append(el("p", "nota", r.frase));
      if (r.totalActual || r.totalAnterior) {
        var signo = r.diferencia > 0 ? "+" : r.diferencia < 0 ? "−" : "";
        art.append(el("p", "nota", "Diferencia: " + signo + dinero(Math.abs(r.diferencia)) +
          (r.porcentaje == null ? "" : " (" + signo + numeroCO.format(Math.abs(r.porcentaje)) + " %)")));
      }
    }
    if (r.categoriaTop) art.append(el("p", "nota", "Donde más gastaste: " + nombreCategoriaVisible(r.categoriaTop.id)));
    if (r.totalActual || r.totalAnterior) {
      var compartir = el("button", "mini", "📤 Compartir resumen");
      compartir.type = "button";
      compartir.addEventListener("click", function () {
        compartirTexto("Mi semana en NOVA", "Esta semana llevo " + pesos.format(r.totalActual) +
          " en gastos. La semana pasada gasté " + pesos.format(r.totalAnterior) + ". — NOVA · OPITA-DIGITAL");
      });
      art.append(compartir);
    }
  }

  function wMesVsPromedio(art) {
    titulo(art, "📊 Tu mes vs. tu promedio");
    var r = A.mesVsPromedio(datos.movimientos, new Date(), function (id) { return A.esFijo(categoria(id)); });
    if (!r) return art.append(el("p", "nota", "Cuando tengas gastos de al menos un mes completo, aquí comparo tu mes con tu promedio."));

    var dif = r.totalActual - r.totalEsperado;
    var resumen = "A día " + r.dia + " llevas " + dinero(r.totalActual) + "; normalmente a esta altura llevas " + dinero(r.totalEsperado) + ".";
    var comparacion = dif === 0 ? "Vas justo en lo normal." :
      "Vas " + dinero(Math.abs(dif)) + (dif > 0 ? " por encima" : " por debajo") + " de lo normal.";
    art.append(el("p", "calc-res", ocultos ? "••••" : resumen + " " + comparacion));

    var ul = el("ul", "lista-simple");
    r.filas.slice(0, 6).forEach(function (f) {
      var li = el("li", "consejo"), d = el("div");
      var flecha = f.dif > 0 ? "▲ " : f.dif < 0 ? "▼ " : "";
      var signo = f.dif > 0 ? "+" : f.dif < 0 ? "−" : "";
      var detalle = flecha + dinero(f.actual) + " este mes · " + (f.fijo ? "normal en el mes " : "normal a esta altura ") +
        dinero(f.esperado) + " (" + signo + dinero(Math.abs(f.dif)) + ")";
      d.append(el("strong", null, nombreCategoriaVisible(f.categoria_id)), el("small", null, ocultos ? "••••" : detalle));
      li.append(d);
      ul.append(li);
    });
    art.append(ul, el("p", "nota", (r.mesesBase === 1 ? "Comparado con tu último mes completo." : "Comparado con el promedio de tus últimos " + r.mesesBase + " meses.")));
  }
  function wEvento(art) {
    titulo(art, "Costo de un evento");
    var etiquetas = NovaConsejos.etiquetasUsadas(datos.movimientos);
    if (!etiquetas.length) return art.append(el("p", "nota", "Marca tus gastos con una etiqueta (por ejemplo #viaje) y aquí ves cuánto costó todo junto."));
    var sel = el("select"); etiquetas.forEach(function (t) { var o = el("option", null, "#" + t); o.value = t; sel.append(o); });
    sel.setAttribute("aria-label", "Costo de un evento: etiqueta");
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
  function wLibertad(art, movs, ciclo, ref, rango) {
    titulo(art, "🕊️ Tu número de libertad");
    var r = A.numeroLibertad(datos.movimientos, Math.max(0, saldoTotal()), new Date());
    if (!r) return art.append(el("p", "nota", "Cuando anotes gastos de al menos un mes completo, aquí verás cuántos meses podrías vivir con tus ahorros."));

    // Con coma decimal, como se escribe en Colombia: 4,5 meses.
    var mesesTexto = String(r.meses).replace(".", ",") + (r.meses === 1 ? " mes" : " meses");
    var grande = el("div", "salud-puntaje");
    grande.append(el("strong", null, ocultos ? "••••" : r.meses < 1 ? "menos de 1 mes" : mesesTexto));
    art.append(grande);
    if (!ocultos) {
      var nota = r.meses < 3 ? "Los expertos recomiendan tener al menos 3 a 6 meses de colchón."
        : r.meses <= 6 ? "Vas bien: estás dentro del colchón recomendado de 3 a 6 meses."
        : "¡Excelente! Tienes más de 6 meses de colchón.";
      art.append(
        el("p", "nota", "Con tu saldo de " + dinero(r.ahorro) + " y un gasto promedio de " + dinero(r.gastoMensual) + " al mes, podrías vivir " + mesesTexto + " sin ingresos."),
        el("p", "nota", nota)
      );
    }
    if (r.mesesConDatos < 6) art.append(el("p", "nota", "Calculado con " + r.mesesConDatos + (r.mesesConDatos === 1 ? " mes" : " meses") + " de gastos."));
  }
  function wAnio(art) {
    var anio = new Date().getFullYear();
    titulo(art, "Tu año en NOVA " + anio);
    var r = NovaConsejos.tuAnio(datos.movimientos, anio);
    if (!r) art.append(el("p", "nota", "Cuando tengas movimientos este año, aquí ves tu resumen."));
    else pintarAnioTexto(art, r, anio);
    var mes = new Date().getMonth();
    if (mes !== 0 && mes < 10) return;
    var anioImagen = mes === 0 ? anio - 1 : anio;
    var resumen = A.resumenAnio(datos.movimientos, anioImagen);
    if (resumen) {
      art.append(el("p", "nota", "Comparte tu resumen de " + anioImagen + " como imagen."),
        botonHabito("Compartir", function () { compartirImagenAnual(resumen, anioImagen); }));
    }
  }

  function pintarAnioTexto(art, r, anio) {
    var ul = el("ul", "lista-simple");
    function fila(i, t, x) { var li = el("li", "consejo"); li.append(el("span", "consejo-icono", i)); var d = el("div"); d.append(el("strong", null, t), el("small", null, ocultos ? "••••" : x)); li.append(d); ul.append(li); }
    fila("🧾", "Movimientos anotados", r.movimientos + " en " + r.diasRegistrados + " días distintos");
    fila("💸", "Gastaste", dinero(r.gastos)); fila("💰", "Ingresaste", dinero(r.ingresos));
    if (r.top.length) fila("🥇", "Lo que más pesó", r.top.map(function (t) { return nombreCategoriaVisible(t.categoria_id) + " (" + dinero(t.total) + ")"; }).join(" · "));
    if (r.mejorMes) fila("🌟", "Tu mejor mes", r.mejorMes);
    if (r.mayor) fila("🏆", "Tu mayor gasto", "«" + r.mayor.descripcion + "» por " + dinero(num(r.mayor.monto)));
    art.append(ul);
    var b = el("button", "mini", "📤 Compartir mi año"); b.type = "button";
    b.addEventListener("click", function () { compartirTexto("Mi año en NOVA", "Mi año en NOVA " + anio + ": anoté " + r.movimientos + " movimientos, gasté " + dinero(r.gastos) + " e ingresé " + dinero(r.ingresos) + (r.mejorMes ? ". Mi mejor mes: " + r.mejorMes : "") + ". — NOVA · OPITA-DIGITAL"); });
    art.append(b);
  }
  function dibujarResumenAnio(r, anio) {
    var canvas = el("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "#2ee06f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#04140a";
    ctx.font = "bold 92px sans-serif";
    ctx.fillText("Tu año en NOVA", 84, 145, 912);
    ctx.font = "bold 84px sans-serif";
    ctx.fillText(String(anio), 84, 250, 912);
    var filas = [
      ["Ingresos", dinero(r.ingresos)], ["Gastos", dinero(r.gastos)], ["Ahorro", dinero(r.ahorro)],
      ["Categoría con más gasto", r.categoriaTop ? nombreCategoriaVisible(r.categoriaTop.id) : "Sin gastos"],
      ["Mes más caro", r.mesMasCaro || "Sin gastos"]
    ];
    filas.forEach(function (fila, i) {
      var y = 335 + i * 190;
      ctx.fillStyle = "#e3faeb";
      ctx.fillRect(84, y, 912, 162);
      ctx.fillStyle = "#04140a";
      ctx.font = "34px sans-serif";
      ctx.fillText(fila[0], 118, y + 50, 844);
      ctx.font = "bold 52px sans-serif";
      ctx.fillText(fila[1], 118, y + 120, 844);
    });
    return canvas;
  }

  async function compartirImagenAnual(resumen, anio) {
    try {
      var imagen = dibujarResumenAnio(resumen, anio).toDataURL("image/png");
      var bytes = Uint8Array.from(atob(imagen.split(",")[1]), function (c) { return c.charCodeAt(0); });
      var nombre = "nova-" + anio + ".png";
      if (navigator.share && navigator.canShare && typeof File === "function") {
        var datosShare = { files: [new File([bytes], nombre, { type: "image/png" })], title: "Tu año en NOVA " + anio };
        if (navigator.canShare(datosShare)) {
          try { await navigator.share(datosShare); return; }
          catch (e) { if (e.name === "AbortError") return; }
        }
      }
      descargar(nombre, bytes, "image/png");
    } catch (e) {
      toast("No pude preparar la imagen");
    }
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
    sel.setAttribute("aria-label", "Alcancía de redondeo: meta de ahorro");
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
      li.append(el("strong", null, "✉️ " + (l.categoria_id != null ? nombreCategoriaVisible(l.categoria_id) : "Todo")), el("small", null, ocultos ? "••••" : (queda >= 0 ? "Te quedan " + dinero(queda) + " de " + dinero(lim) : "Te pasaste por " + dinero(-queda))), barraSimple(lim > 0 ? (e.gastado / lim) * 100 : 0, queda < 0));
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
      sel.setAttribute("aria-label", "Días sin gastar: meta de ahorro");
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
    explicarGrafico(art, "En qué parte del mes gastas", "Historial de gastos agrupado por día del mes", r.filas.map(function (f) {
      return [f.nombre, f.total];
    }));
  }
  function wReduccion(art, movs, ciclo, ref) {
    titulo(art, "Metas de reducción");
    var metas = leerLocal("nova-reducciones", []), ant = A.enRango(datos.movimientos, A.desplazar(ciclo, ref, -1));
    art.append(el("p", "nota", "Elige una categoría y cuánto quieres bajarla frente al periodo anterior. Se guarda en este dispositivo."));
    var ul = el("ul", "lista-simple");
    metas.forEach(function (m, i) {
      var r = NovaConsejos.progresoReduccion(movs, ant, m.categoria_id, m.pct), li = el("li", "sobre");
      li.append(el("strong", null, "📉 " + nombreCategoriaVisible(m.categoria_id) + " −" + m.pct + " %"));
      li.append(el("small", null, !r ? "Aún no hay gastos de esta categoría en el periodo anterior para comparar." : ocultos ? "••••" : (r.cumple ? "✅ Vas bien: llevas " + dinero(r.actual) + " y tu tope es " + dinero(r.meta) + "." : "Llevas " + dinero(r.actual) + ": te pasaste " + dinero(r.faltaParaMeta) + " de tu tope de " + dinero(r.meta) + ".")));
      if (r) li.append(barraSimple(r.uso, !r.cumple));
      var x = el("button", "mini", "Quitar"); x.type = "button";
      x.addEventListener("click", function () { metas.splice(i, 1); guardarLocal("nova-reducciones", metas); pintarAnalisis(); });
      li.append(x); ul.append(li);
    });
    art.append(ul);
    var sel = el("select"); datos.categorias.filter(function (c) { return c.tipo === "gasto"; }).forEach(function (c) { var o = el("option", null, etiquetaCategoria(c)); o.value = c.id; sel.append(o); });
    var pct = el("select"); [5, 10, 15, 20, 30].forEach(function (v) { var o = el("option", null, "Bajar " + v + " %"); o.value = v; pct.append(o); }); pct.value = "10";
    sel.setAttribute("aria-label", "Metas de reducción: categoría");
    pct.setAttribute("aria-label", "Metas de reducción: porcentaje");
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
  function calculadora(art, tit, campos, calcular, opciones) {
    var c = el("div", "calc"); c.append(el("strong", null, tit));
    var res = el("div"), entradas = {}, avisos = [];
    res.append(el("p", "calc-res", "Escribe los datos."));
    if (opciones && opciones.ayuda) c.append(el("p", "nota", opciones.ayuda));
    campos.forEach(function (f) {
      var par = campoCalc(f.etq, f.id, f.ph || "", f.plata), input = par[1];
      if (f.fecha) { input.type = "date"; input.removeAttribute("inputmode"); }
      if (f.plata && opciones && ocultos) input.type = "password";
      if (f.valor != null) input.value = f.plata ? numeroCO.format(f.valor) : String(f.valor);
      c.append(par[0], input);
      if (f.tasaEa) {
        var avisoTasa = el("p", "mensaje error", AVISO_USURA);
        avisoTasa.setAttribute("role", "alert");
        avisoTasa.hidden = true;
        c.append(avisoTasa);
        avisos.push({ campo: input, aviso: avisoTasa });
      }
      entradas[f.id] = input;
    });
    c.append(res);
    function actualizar() {
      var v = {};
      campos.forEach(function (f) {
        var texto = entradas[f.id].value.trim();
        if (!texto && f.omitirVacio) return;
        if (f.fecha) v[f.id] = texto;
        else if (f.plata) v[f.id] = !texto && f.opcional ? 0 : opciones && /^[$\s]*[-−]/.test(texto) ? NaN : leerValor(texto);
        else if (opciones) v[f.id] = texto ? Number(texto.replace(",", ".")) : f.opcional ? 0 : NaN;
        else v[f.id] = leerTasa(texto);
      });
      if (avisos.length) {
        var limite = tasaUsura();
        avisos.forEach(function (a) { a.aviso.hidden = !A.superaUsura(a.campo.value, limite); });
      }
      var resultado;
      try { resultado = calcular(v); } catch (e) { resultado = null; }
      var mensaje = opciones ? "Revisa los datos para calcular." : "Escribe los datos.";
      res.replaceChildren(typeof resultado === "string" || !resultado ? el("p", "calc-res", resultado || mensaje) : resultado);
      if (opciones && (resultado || opciones.avisoSiempre)) res.append(el("p", "nota", opciones.aviso || AVISO_CALCULADORA));
    }
    Object.keys(entradas).forEach(function (k) { entradas[k].addEventListener("input", actualizar); });
    if (opciones) actualizar();
    art.append(c);
  }

  var AVISO_CALCULADORA = "Cálculo estimado. Verifica con tu contador o con la norma vigente";

  function calculadoraGmf(art, movs, ciclo, rango) {
    var C = window.NovaCalculadoras;
    if (!C || !rango) return;
    var formato = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 2 });
    function dineroGmf(valor) { return ocultos ? dinero(valor) : formato.format(valor); }
    var caja = el("div", "calc");
    caja.append(el("strong", null, "4×1000 de tus movimientos"), el("p", "nota", A.nombrePeriodo(ciclo, rango)));
    var r = monedaBase() === "COP" ? C.gmfMovimientos(movs) : null;
    if (r) {
      caja.append(el("p", "calc-res", "Egresos pagados " + dinero(r.egresos) + " · 4×1000 estimado " + dineroGmf(r.impuesto)),
        el("p", "nota", AVISO_CALCULADORA), el("p", "nota", "Aplica el 4×1000 a todos los egresos registrados como pagados, sin descontar exenciones."));
    } else {
      caja.append(el("p", "nota", monedaBase() === "COP" ? "El total de egresos supera el valor que puede calcular NOVA." : "Elige un espacio en pesos colombianos para estimar el 4×1000 de tus movimientos."));
    }
    art.append(caja);
    calculadora(art, "4×1000 de un monto", [
      { id: "gmf-monto", etq: "Monto en pesos colombianos", plata: true, ph: "100 mil" }
    ], function (v) {
      var impuesto = C.gmf(v["gmf-monto"]);
      return impuesto === null ? null : "4×1000 estimado " + dineroGmf(impuesto);
    }, {});
  }

  function calculadorasTrabajoYAhorro(art) {
    var C = window.NovaCalculadoras;
    if (!C) return;
    var K = C.CONSTANTES;
    var auxilio = "Auxilio de transporte si te corresponde (" + K.auxilioTransporte.anio + ", COP)";
    function cop(valor) { return dineroEn(valor, "COP"); }

    calculadora(art, "Liquidación laboral", [
      { id: "liq-sal", etq: "Salario mensual (COP)", plata: true, ph: "2 millones" },
      { id: "liq-aux", etq: auxilio, plata: true, valor: K.auxilioTransporte.valor, opcional: true },
      { id: "liq-inicio", etq: "Fecha de inicio", fecha: true },
      { id: "liq-fin", etq: "Fecha de fin", fecha: true },
      { id: "liq-vac", etq: "Días de vacaciones pendientes", valor: 0, opcional: true }
    ], function (v) {
      var r = C.liquidacion(v["liq-sal"], v["liq-aux"], v["liq-inicio"], v["liq-fin"], v["liq-vac"]);
      return r ? r.dias + " días comerciales · Cesantías " + cop(r.cesantias) + " · Intereses " + cop(r.intereses) +
        " · Prima proporcional " + cop(r.prima) + " · Vacaciones " + cop(r.vacaciones) + " · Total " + cop(r.total) : null;
    }, { ayuda: "Base de 360 días con salario fijo. Escribe 0 si no recibes auxilio. Como fecha de inicio pon el día desde el que NO te han pagado: normalmente el 1 de enero del año en que termina el contrato (cesantías ya consignadas y prima del semestre anterior ya pagada). Si pones todo el contrato, el resultado sale más alto de lo que realmente te deben." });

    calculadora(art, "Horas extra y recargos", [
      { id: "ext-sal", etq: "Salario mensual (COP)", plata: true, ph: "2 millones" },
      { id: "ext-div", etq: "Horas mensuales según tu jornada (divisor)", valor: K.horasMes.valor },
      { id: "ext-dia", etq: "Horas extra diurnas", valor: 0, opcional: true },
      { id: "ext-noche", etq: "Horas extra nocturnas", valor: 0, opcional: true },
      { id: "ext-rec", etq: "Horas ordinarias con recargo nocturno", valor: 0, opcional: true },
      { id: "ext-fest", etq: "Horas ordinarias diurnas en domingo o festivo", valor: 0, opcional: true },
      { id: "ext-fest-pct", etq: "Recargo dominical o festivo (%)", valor: C.recargoFestivo(A.claveDia(new Date())) }
    ], function (v) {
      var r = C.horasExtra(v["ext-sal"], v["ext-div"], v["ext-dia"], v["ext-noche"], v["ext-rec"], v["ext-fest"], v["ext-fest-pct"]);
      return r ? "Valor por hora " + cop(r.hora) + " · Extras diurnas " + cop(r.extraDiurna) + " · Extras nocturnas " + cop(r.extraNocturna) +
        " · Recargo nocturno " + cop(r.recargoNocturno) + " · Recargo dominical o festivo " + cop(r.dominicalFestivo) + " · Total adicional " + cop(r.total) : null;
    }, { ayuda: "Ajusta el divisor a tu jornada y el porcentaje al periodo trabajado. Las horas extra incluyen el valor de la hora. Para las horas ordinarias se suma solo el recargo." });

    calculadora(art, "Salario neto", [
      { id: "net-sal", etq: "Salario mensual (COP)", plata: true, ph: "2 millones" },
      { id: "net-aux", etq: auxilio, plata: true, valor: K.auxilioTransporte.valor, opcional: true },
      { id: "net-min", etq: "Salario mínimo (" + K.salarioMinimo.anio + ", COP)", plata: true, valor: K.salarioMinimo.valor }
    ], function (v) {
      var r = C.salarioNeto(v["net-sal"], v["net-aux"], v["net-min"]);
      return r ? "Salud " + cop(r.salud) + " · Pensión " + cop(r.pension) + " · Fondo de solidaridad " + cop(r.solidaridad) + " · Neto " + cop(r.neto) : null;
    }, { ayuda: "Escribe 0 si no recibes auxilio. Estimación con el aporte básico al fondo de solidaridad, antes de retención u otros descuentos." });

    calculadora(art, "Interés compuesto", [
      { id: "ic-aporte", etq: "Aporte mensual", plata: true, ph: "200 mil" },
      { id: "ic-tasa", etq: "Tasa efectiva anual (%)", ph: "10" },
      { id: "ic-anios", etq: "Años completos (hasta " + C.MAX_ANIOS + ")", ph: "5" }
    ], function (v) {
      var r = C.interesCompuesto(v["ic-aporte"], v["ic-tasa"], v["ic-anios"]);
      if (!r) return null;
      var resultado = el("div");
      resultado.append(el("p", "calc-res", "Saldo final " + dinero(r.saldo) + " · Total aportado " + dinero(r.aportado) +
        " · " + (!ocultos && r.ganancia < 0 ? "Pérdida " : "Ganancia ") + dinero(Math.abs(r.ganancia))));
      if (r.tabla.length) resultado.append(tablaInteresCompuesto(r.tabla));
      return resultado;
    }, { ayuda: "El aporte se hace al final de cada mes." });

    calculadora(art, "Regla del 4 %", [
      { id: "r4-gastos", etq: "Gastos anuales que quieres cubrir", plata: true, ph: "36 millones" }
    ], function (v) {
      var capital = C.reglaCuatro(v["r4-gastos"]);
      return capital === null ? null : "Capital estimado para vivir de tus ahorros " + dinero(capital);
    }, {});
  }

  function tablaInteresCompuesto(filas) {
    var detalle = el("details"), caja = el("div", "ia-tabla-caja calc-tabla-corta");
    var tabla = el("table", "ia-tabla"), thead = el("thead"), cuerpo = el("tbody"), encabezado = el("tr");
    ["Año", "Aportado", "Saldo"].forEach(function (nombre) {
      var th = el("th", null, nombre); th.scope = "col"; encabezado.append(th);
    });
    thead.append(encabezado);
    filas.forEach(function (r) {
      var fila = el("tr");
      fila.append(el("td", null, String(r.anio)), el("td", "num", dinero(r.aportado)), el("td", "num", dinero(r.saldo)));
      cuerpo.append(fila);
    });
    tabla.append(thead, cuerpo); caja.append(tabla);
    caja.tabIndex = 0;
    caja.setAttribute("aria-label", "Proyección de ahorro por año");
    detalle.append(el("summary", null, "Ver año por año"), caja);
    return detalle;
  }

  function calculadorasDeCredito(art) {
    var C = window.NovaCalculadoras;
    if (!C) return;
    var aviso = "Cálculo estimado. Verifica con tu banco";
    var tasa = "Tasa efectiva anual (%)";

    calculadora(art, "Horas de trabajo que cuesta una compra", [
      { id: "ht-ingreso", etq: "Ingreso mensual neto", plata: true },
      { id: "ht-horas", etq: "Horas de trabajo al mes", valor: 192 },
      { id: "ht-precio", etq: "Precio de la compra", plata: true }
    ], function (v) {
      var r = C.horasDeTrabajo(v["ht-ingreso"], v["ht-horas"], v["ht-precio"]);
      if (!r) return null;
      var formato = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });
      return formato.format(r.horas) + " h de trabajo · " + formato.format(r.dias) + " días de 8 h";
    }, { aviso: aviso });

    var campos = [];
    [1, 2, 3].forEach(function (n) {
      var prefijo = "Oferta " + n + " · ";
      campos.push(
        { id: "cc-monto-" + n, etq: prefijo + "Monto", plata: true, omitirVacio: n === 3 },
        { id: "cc-tasa-" + n, etq: prefijo + tasa, tasaEa: true, omitirVacio: n === 3 },
        { id: "cc-meses-" + n, etq: prefijo + "Plazo en meses", omitirVacio: n === 3 },
        { id: "cc-seguro-" + n, etq: prefijo + "Seguro mensual (opcional)", plata: true, omitirVacio: true }
      );
    });
    calculadora(art, "Comparar créditos", campos, function (v) {
      var ofertas = [1, 2, 3].map(function (n) {
        return { monto: v["cc-monto-" + n], tasaEaPct: v["cc-tasa-" + n],
          meses: v["cc-meses-" + n], seguroMensual: v["cc-seguro-" + n] };
      });
      if (Object.values(ofertas[2]).every(function (valor) { return valor === undefined; })) ofertas.pop();
      var r = C.compararCreditos(ofertas);
      if (!r) return null;
      var resultado = el("div");
      r.ofertas.forEach(function (o, i) {
        resultado.append(el("p", "calc-res", "Oferta " + (i + 1) + " · Cuota mensual " + dinero(o.cuota) +
          " · Total pagado " + dinero(o.total) + " · Intereses " + dinero(o.intereses)));
      });
      var mejores = r.masBaratas.map(function (i) { return "oferta " + (i + 1); });
      resultado.append(el("p", "nota", mejores.length === 1 ?
        "Menor total pagado · " + mejores[0] : "Empate en el menor total pagado · " + mejores.join(" y ")));
      if (ofertas.some(function (o) { return o.monto !== ofertas[0].monto; })) {
        resultado.append(el("p", "nota", "Las ofertas prestan montos distintos. Compara el mismo monto para decidir cuál te cuesta menos."));
      }
      return resultado;
    }, { aviso: aviso, ayuda: "Completa dos ofertas y deja la tercera vacía si no la necesitas. La cuota y el total incluyen el seguro. Los intereses se muestran por separado." });

    calculadora(art, "Crédito de vivienda o leasing", [
      { id: "cv-valor", etq: "Valor del inmueble o bien", plata: true },
      { id: "cv-inicial", etq: "Cuota inicial (%)", valor: 30 },
      { id: "cv-tasa", etq: tasa, tasaEa: true },
      { id: "cv-anios", etq: "Plazo en años" },
      { id: "cv-vida", etq: "Seguro de vida mensual", plata: true, valor: 30000, opcional: true },
      { id: "cv-bien", etq: "Seguro de incendio o todo riesgo mensual", plata: true, valor: 30000, opcional: true }
    ], function (v) {
      var r = C.creditoVivienda(v["cv-valor"], v["cv-inicial"], v["cv-tasa"], v["cv-anios"], v["cv-vida"], v["cv-bien"]);
      return r ? "Monto del crédito " + dinero(r.monto) + " · Cuota base " + dinero(r.cuotaBase) +
        " · Cuota con seguros " + dinero(r.cuotaConSeguros) + " · Total pagado, incluida la inicial " + dinero(r.total) : null;
    }, { aviso: aviso, ayuda: "Ajusta con tu banco los valores de los seguros. El cálculo usa una cuota fija y supone que financias el valor restante completo. Si tu leasing tiene una opción de compra final, confirma ese valor con tu banco." });

    calculadora(art, "Compra de cartera", [
      { id: "cp-saldo", etq: "Saldo actual", plata: true },
      { id: "cp-actual", etq: "Tasa efectiva anual actual (%)", tasaEa: true },
      { id: "cp-meses", etq: "Cuotas restantes" },
      { id: "cp-nueva", etq: "Nueva tasa efectiva anual (%)", tasaEa: true },
      { id: "cp-costos", etq: "Costos de la compra de cartera", plata: true, opcional: true }
    ], function (v) {
      var r = C.compraCartera(v["cp-saldo"], v["cp-actual"], v["cp-meses"], v["cp-nueva"], v["cp-costos"]);
      return r ? "Con tu crédito actual " + dinero(r.totalActual) + " · Con el nuevo, incluidos los costos " + dinero(r.totalNuevo) +
        " · " + (r.ahorro < 0 ? "Costo adicional " : "Ahorro total ") + dinero(Math.abs(r.ahorro)) +
        " · " + (r.conviene ? "Conviene por costo total." : r.ahorro === 0 ? "Pagas lo mismo." : "No conviene por costo total.") : null;
    }, { aviso: aviso, ayuda: "Compara cuotas fijas con el mismo plazo restante. Los costos del cambio se pagan aparte, al inicio." });
  }

  function wCalculadorasInversion(art) {
    titulo(art, "Calculadoras de inversión");
    var C = window.NovaCalculadoras, K = C.CONSTANTES;
    var aviso = "Cálculo estimado. Verifica con tu banco o tu contador";
    var campos = [];
    [1, 2, 3].forEach(function (n) {
      var cdt = "CDT " + n;
      campos.push(
        { id: "cdt-monto-" + n, etq: cdt + " · Monto (" + monedaVista + ")", plata: true, omitirVacio: n === 3 },
        { id: "cdt-dias-" + n, etq: cdt + " · Plazo en días", omitirVacio: n === 3 },
        { id: "cdt-tasa-" + n, etq: cdt + " · Tasa efectiva anual (%)", valor: 0 },
        { id: "cdt-ret-" + n, etq: cdt + " · Retención (%)", valor: K.retencionCdt.valor }
      );
    });
    calculadora(art, "Comparar CDT", campos, function (v) {
      var ofertas = [1, 2, 3].map(function (n) {
        return { monto: v["cdt-monto-" + n], dias: v["cdt-dias-" + n],
          tasaEaPct: v["cdt-tasa-" + n], retencionPct: v["cdt-ret-" + n] };
      });
      var tercera = ofertas[2];
      if (tercera.monto === undefined && tercera.dias === undefined) ofertas.pop();
      var r = C.compararCdt(ofertas);
      if (!r) return null;
      var caja = el("div"), lista = el("ul", "lista-simple");
      r.resultados.forEach(function (oferta, i) {
        lista.append(filaAnalisis("CDT " + (i + 1), "Bruto " + dinero(oferta.bruto) +
          " · Retención " + dinero(oferta.retencion) + " · Neto " + dinero(oferta.neto)));
      });
      var mejores = r.mejores.map(function (i) { return "CDT " + (i + 1); }).join(", ");
      caja.append(lista, el("p", "calc-res", r.mejores.length === 1 ?
        "Mayor rendimiento neto: " + mejores : "Empate en rendimiento neto: " + mejores));
      return caja;
    }, { aviso: aviso, avisoSiempre: true, ayuda: "Escribe el monto, el plazo y la tasa de cada oferta. Puedes dejar vacíos el monto y el plazo del tercer CDT. Se usa un año de 365 días." });

    function cop(valor) { return dineroEn(valor, "COP"); }
    calculadora(art, "Pensión voluntaria y AFC", [
      { id: "afc-ingreso", etq: "Ingreso anual (COP)", plata: true },
      { id: "afc-aporte", etq: "Aporte anual total a pensión voluntaria y AFC (COP)", plata: true },
      { id: "afc-uvt", etq: "Valor de una UVT (COP, valor inicial de " + K.uvt.anio + ")", plata: true, valor: K.uvt.valor },
      { id: "afc-tope-pct", etq: "Tope del ingreso anual (%)", valor: K.topeAportePct.valor },
      { id: "afc-tope-uvt", etq: "Tope anual (UVT)", valor: K.topeAporteUvt.valor },
      { id: "afc-tarifa", etq: "Tarifa marginal de renta (%)", valor: 0 }
    ], function (v) {
      var r = C.ahorroTributarioAporte(v["afc-ingreso"], v["afc-aporte"], v["afc-uvt"], v["afc-tarifa"], v["afc-tope-pct"], v["afc-tope-uvt"]);
      return r ? "Tope de aportes " + cop(r.limite) + " · Puedes restar de la renta " + cop(r.montoExento) +
        " · Ahorro de impuesto estimado " + cop(r.ahorro) : null;
    }, { aviso: aviso, avisoSiempre: true, ayuda: "Los aportes comparten el menor de los dos topes. Escribe tu tarifa marginal para estimar el ahorro. " + K.topeAportePct.referencia + "." });
  }

  function calculadoraIva(art) {
    var C = window.NovaCalculadoras;
    if (!C) return;
    var caja = el("div", "calc");
    var modo = el("select"); modo.id = "iva-modo";
    var etiquetaModo = el("label", null, "Qué quieres calcular"); etiquetaModo.htmlFor = modo.id;
    [["sumar", "Sumar el IVA a un precio sin IVA"], ["sacar", "Sacar el IVA de un precio con IVA incluido"],
      ["periodo", "IVA a pagar del periodo"]].forEach(function (opcion) {
      var opt = el("option", null, opcion[1]); opt.value = opcion[0]; modo.append(opt);
    });

    var precio = el("div", "calc formulario"), periodo = el("div", "calc formulario");
    var valor = campoCalc("Precio sin IVA (COP)", "iva-valor", "100 mil", true);
    var tarifa = campoCalc("Tarifa de IVA (%)", "iva-pct", "", false);
    tarifa[1].value = "19";
    var atajos = el("div");
    [5, 0].forEach(function (porcentaje) {
      var boton = el("button", "mini", porcentaje + " %"); boton.type = "button";
      boton.addEventListener("click", function () { tarifa[1].value = String(porcentaje); actualizar(); });
      atajos.append(boton);
    });
    precio.append(valor[0], valor[1], tarifa[0], tarifa[1], atajos);
    var generado = campoCalc("IVA generado por ventas (COP)", "iva-generado", "0", true);
    var descontable = campoCalc("IVA descontable por compras (COP)", "iva-descontable", "0", true);
    periodo.append(generado[0], generado[1], descontable[0], descontable[1]);
    var resultado = el("p", "calc-res"); resultado.setAttribute("role", "status");
    caja.append(el("strong", null, "🧾 IVA para independientes"), etiquetaModo, modo, precio, periodo, resultado,
      el("p", "nota", "Verifica con la DIAN si tus ventas son gravadas, excluidas o exentas; esta calculadora no te dice si debes responder IVA"));

    function monto(campo) {
      var texto = campo.value.trim();
      return !texto || /[-−]/.test(texto) ? NaN : leerValor(texto);
    }
    function actualizar() {
      var porPeriodo = modo.value === "periodo", incluido = modo.value === "sacar";
      precio.hidden = porPeriodo; periodo.hidden = !porPeriodo;
      valor[0].textContent = incluido ? "Precio con IVA incluido (COP)" : "Precio sin IVA (COP)";
      var texto = "Escribe valores válidos para calcular.";
      if (porPeriodo) {
        var saldo = C.ivaPeriodo(monto(generado[1]), monto(descontable[1]));
        if (saldo !== null) texto = saldo < 0 ? "Saldo a favor " + dineroEn(Math.abs(saldo), "COP") : "IVA a pagar del periodo " + dineroEn(saldo, "COP");
      } else {
        var pct = tarifa[1].value.trim().replace(",", ".");
        var r = C.ivaPrecio(monto(valor[1]), /^\d+(\.\d+)?$/.test(pct) ? Number(pct) : NaN, incluido);
        if (r) texto = "Sin IVA " + dineroEn(r.base, "COP") + " · IVA " + dineroEn(r.iva, "COP") + " · Con IVA " + dineroEn(r.total, "COP");
      }
      resultado.textContent = texto;
    }
    [valor[1], generado[1], descontable[1]].forEach(function (campo) {
      if (ocultos) campo.type = "password";
    });
    caja.addEventListener("input", actualizar);
    modo.addEventListener("change", actualizar);
    actualizar();
    art.append(caja);
  }

  function wMasCalculadoras(art) {
    titulo(art, "Más calculadoras");
    calculadorasTrabajoYAhorro(art);
    calculadorasDeCredito(art);
    var N = NovaConsejos;
    calculadoraIva(art);
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
  // Retos semanales por categoría y plan de ahorro de 52 semanas.
  function wReto(art, inicio) {
    var semana = A.semanaDe(new Date()), clave = claveComodidad("retos-semanales");
    var historial = fuente.demo ? fuente.retosSemanales : leerLocal(clave, []);
    var movimientos = filasDeTodosLosEspacios("movimientos");
    var actualizado = A.actualizarRetos(historial, movimientos, semana);
    function guardarRetos(lista) {
      if (fuente.demo) { fuente.retosSemanales = lista; return true; }
      return guardarLocal(clave, lista);
    }
    if (actualizado.some(function (r, i) { return r !== historial[i]; })) guardarRetos(actualizado);
    var aceptado = actualizado.find(function (r) { return r.desde === semana.desde; });
    var reto = aceptado ? aceptado.reto : A.retoDeLaSemana(semana.indice, datos.categorias);
    titulo(art, "Reto de ahorro semanal");
    if (reto) {
      art.append(el("strong", null, reto.titulo), el("p", "nota", "Desde el lunes, pasa la semana sin gastos en " + reto.nombre + "."));
      if (aceptado) {
        var vaBien = A.cumplioReto(reto, movimientos, semana.desde);
        art.append(el("p", "nota", vaBien ? "Vas bien. La semana termina el domingo." : "Ya anotaste un gasto en esta categoría esta semana."));
      } else {
        art.append(botonHabito("Aceptar reto", function () {
          if (!guardarRetos(actualizado.concat({ desde: semana.desde, reto: reto }))) return toast("No se pudo guardar el reto en este teléfono");
          pintar();
        }));
      }
    } else {
      art.append(el("p", "nota", "Aún no tienes una categoría de gastos que coincida con los retos."));
    }
    var anteriorAceptado = actualizado.slice().reverse().find(function (r) { return typeof r.cumplido === "boolean"; });
    if (anteriorAceptado) art.append(el("p", "nota", anteriorAceptado.cumplido ? "Cumpliste el último reto cerrado." : "El último reto cerrado quedó sin cumplir."));
    var logros = A.insigniasReto(actualizado);
    art.append(el("p", "nota", logros.total + (logros.total === 1 ? " semana cumplida" : " semanas cumplidas")));
    var insignias = el("div", "reto-logros");
    logros.insignias.forEach(function (n) { insignias.append(el("span", "chip", "🏅 " + n + (n === 1 ? " semana" : " semanas"))); });
    art.append(insignias);
    if (inicio) return;
    var anterior = el("details", "reto-anterior");
    anterior.append(el("summary", null, "Reto de ahorro de 52 semanas"));
    art.append(anterior);
    wReto52(anterior);
  }

  function wReto52(art) {
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
    if (!ocultos) art.append(l, inp);
    art.append(resumen, grid); pintarReto();
  }

  // Sugerencias al escribir la descripción: lo que más has anotado.
  function pintarSugerencias() {
    var dl = $("lista-desc");
    dl.replaceChildren();
    A.sugerirDescripciones(datos.movimientos, $("reg-desc").value, 8).forEach(function (d) {
      var o = el("option"); o.value = d; dl.append(o);
    });
  }
  function pintarSaludo(vacio) {
    var h = new Date().getHours(), nombre = (fuente && fuente.nombre ? String(fuente.nombre).split(" ")[0] : "");
    $("saludo").textContent = (h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches") + (nombre ? ", " + nombre : "") + " 👋";
    if (vacio) $("lista-inicio").prepend(el("p", "saludo-vacio", "¡Hola" + (nombre ? ", " + nombre : "") + "!"));
  }
  function compartirTexto(titulo, texto) {
    var P = (window.Capacitor && window.Capacitor.Plugins) || {};
    if (enApp && P.Share) return P.Share.share({ title: titulo, text: texto, dialogTitle: titulo }).catch(function () { /* cancelado */ });
    if (navigator.share) return navigator.share({ title: titulo, text: texto }).catch(function () { /* cancelado */ });
    window.open("https://wa.me/?text=" + encodeURIComponent(texto), "_blank", "noopener");
    return Promise.resolve();
  }
  async function compartirEnlace(titulo, texto, url) {
    var P = (window.Capacitor && window.Capacitor.Plugins) || {};
    try {
      if (enApp && P.Share) await P.Share.share({ title: titulo, text: texto, url: url, dialogTitle: titulo });
      else if (navigator.share) await navigator.share({ title: titulo, text: texto, url: url });
      else {
        var ventana = window.open("about:blank", "_blank");
        if (!ventana) return false;
        ventana.opener = null;
        ventana.location.replace("https://wa.me/?text=" + encodeURIComponent(texto + "\n" + url));
      }
      return true;
    } catch (e) { return false; }
  }
  $("btn-compartir-nova").addEventListener("click", async function () {
    var origen = fuente;
    var clave = origen && !origen.demo ? claveComodidad("veces-compartido") : null;
    var compartido = await compartirEnlace(
      "NOVA · Tus finanzas personales",
      "Te recomiendo NOVA para llevar tus finanzas: anota gastos con texto, voz o foto, gratis y sin anuncios.",
      (cfg.sitioUrl || "https://nova-finanzas.vercel.app").replace(/\/$/, "") + "/inicio.html"
    );
    if (!compartido || !clave) return;
    var antes = Number(leerLocal(clave, 0)) || 0;
    if (!guardarLocal(clave, antes + 1) || fuente !== origen) return;
    var anteriores = NovaConsejos.logrosEmbajador(antes);
    NovaConsejos.logrosEmbajador(antes + 1).forEach(function (logro, i) {
      if (logro.hecho && !anteriores[i].hecho) toast("¡Nuevo logro!", logro.titulo);
    });
  });
  function explicarGrafico(art, nombre, periodo, filas) {
    if (ocultos || !filas.length) return;
    var pregunta = NovaRespuestas.preguntaGrafico(nombre, periodo, monedaBase(), filas);
    var boton = botonHabito("💬 Explícame esto", function () {
      if (ocultos) return;
      abrirChat(null);
      preguntarNova(pregunta, { grafico: true });
    });
    art.append(boton);
  }

  function periodoGrafico(rango) {
    return A.claveDia(rango.desde) + " a " + A.claveDia(new Date(rango.hasta.getTime() - 1));
  }

  function graficarSerieIA(art, nombre, ciclo, serie, conIngresos) {
    var desde = A.desplazar(ciclo, serie[0].desde, 0).desde;
    var hasta = A.desplazar(ciclo, serie[serie.length - 1].desde, 0).hasta;
    var ingresos = 0, gastos = 0;
    var filas = serie.map(function (p) {
      ingresos += p.ingresos;
      gastos += p.gastos;
      return conIngresos ? [p.etiqueta + " · ingresos / gastos", p.ingresos, p.gastos] : [p.etiqueta, p.gastos];
    });
    filas.unshift(conIngresos ? ["Total · ingresos / gastos", ingresos, gastos] : ["Gasto total", gastos]);
    explicarGrafico(art, nombre, periodoGrafico({ desde: desde, hasta: hasta }), filas);
  }

  function titulo(art, texto) { art.append(el("h2", "titulo-widget", texto)); }

  function wRapida(art, movs, ciclo, ref) {
    titulo(art, "Vista rápida");
    var v = A.vistaRapida(datos.movimientos, ciclo, ref);
    var rej = el("div", "rejilla-rapida");
    var top = v.categoriaTop === undefined ? "—" : nombreCategoriaVisible(v.categoriaTop);
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
    svg.setAttribute("aria-label", "Gastos por categoría: " + filas.map(function (f) { return nombreCategoriaVisible(f.id) + " " + dinero(f.total); }).join(", "));
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
      var nombre = el("span", "cat-nombre"); nombre.append(punto, document.createTextNode(etiquetaCategoria(c)));
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
    explicarGrafico(art, "Gastos por categoría", periodoGrafico(rango), [["Gasto total", total]].concat(filas.map(function (f) {
      return [nombreCategoria(f.id), f.total];
    })));
  }

  function wEtiquetas(art, movs, ciclo, ref, rango) {
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
    explicarGrafico(art, "Gasto por etiqueta", periodoGrafico(rango), filas.map(function (f) {
      return ["#" + f.etiqueta, f.total];
    }));
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
    graficarSerieIA(art, "Ingresos vs gastos", ciclo, s, true);
  }

  function lineaSVG(puntos, etiquetas, clase, alto) {
    var NS = "http://www.w3.org/2000/svg", W = 300, H = alto || 120, P = 10;
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
    graficarSerieIA(art, "Tendencia de gastos", ciclo, s, false);
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
    explicarGrafico(art, "Balance futuro", "Proyección de hoy a 90 días", p.map(function (x) {
      return [x.dias + " días", x.saldo];
    }));
  }

  // Personalizar: mostrar u ocultar y reordenar los gráficos.
  function guardarWidgets(lista) {
    if (fuente.demo) fuente.widgets = lista;
    else guardarLocal(claveComodidad("widgets"), lista);
  }

  function pintarPersonalizar() {
    var ul = $("lista-widgets"), lista = configWidgets();
    ul.replaceChildren();
    lista.forEach(function (w, i) {
      var info = WIDGETS.find(function (x) { return x.id === w.id; });
      var li = el("li", "fila-widget");
      var lab = el("label", "casilla");
      var chk = el("input"); chk.type = "checkbox"; chk.checked = w.visible;
      chk.addEventListener("change", function () { if (w.visible && !chk.checked) registrarEvento("recuadro", "oculto_" + info.id); w.visible = chk.checked; guardarWidgets(lista); pintarAnalisis(); pintarWidgets($("widgets-inicio"), true); });
      lab.append(chk, document.createTextNode(info.nombre));
      if (w.id === "sugerencias-hora") {
        li.append(lab);
        ul.append(li);
        return;
      }
      var sube = el("button", "icono-btn", "↑"); sube.type = "button"; sube.disabled = i === 1; sube.setAttribute("aria-label", "Subir " + info.nombre);
      var baja = el("button", "icono-btn", "↓"); baja.type = "button"; baja.disabled = i === lista.length - 1; baja.setAttribute("aria-label", "Bajar " + info.nombre);
      function mover(d) { var x = lista.splice(i, 1)[0]; lista.splice(i + d, 0, x); guardarWidgets(lista); pintarPersonalizar(); pintarAnalisis(); pintarWidgets($("widgets-inicio"), true); }
      sube.addEventListener("click", function () { mover(-1); });
      baja.addEventListener("click", function () { mover(1); });
      li.append(lab, sube, baja);
      ul.append(li);
    });
  }
  $("btn-personalizar").addEventListener("click", function () { var p = $("personalizar"); p.hidden = !p.hidden; if (!p.hidden) pintarPersonalizar(); });
  $("btn-listo-widgets").addEventListener("click", function () { $("personalizar").hidden = true; });

  // ---------- Buscar ----------
  var filtrosIniciales = { texto: "", tipo: "", categoriaId: null, cuentaId: "", etiqueta: "", estado: "",
    desde: "", hasta: "", montoMin: "", montoMax: "", orden: "recientes" };
  var filtros = Object.assign({}, filtrosIniciales);
  var camposFiltros = {
    etiqueta: "filtro-etiqueta", estado: "filtro-estado", desde: "filtro-desde", hasta: "filtro-hasta",
    cuentaId: "filtro-cuenta", montoMin: "filtro-monto-min", montoMax: "filtro-monto-max"
  };
  function llenarTiposDeducibles(selector) {
    var sinMarca = el("option", null, "Sin marcar");
    sinMarca.value = "";
    selector.replaceChildren(sinMarca);
    A.tiposDeducibles.forEach(function (t) {
      var opcion = el("option", null, t[1]);
      opcion.value = t[0]; selector.append(opcion);
    });
  }

  function pintarDeducibles() {
    var selector = $("deducibles-ano"), anterior = selector.value, actual = new Date().getFullYear();
    var anos = new Set([actual]);
    datos.movimientos.forEach(function (m) {
      var ano = A.anoDeducible(m.fecha);
      if (Number.isInteger(ano)) anos.add(ano);
    });
    selector.replaceChildren();
    Array.from(anos).sort(function (a, b) { return b - a; }).forEach(function (ano) {
      var opcion = el("option", null, String(ano));
      selector.append(opcion);
    });
    selector.value = anos.has(Number(anterior)) ? anterior : String(actual);
    var clave = claveComodidad("deducibles:" + (espacioId || "principal") + ":" + selector.value);
    var topes = leerLocal(clave, {}) || {}, cont = $("deducibles-tipos");
    cont.replaceChildren();
    A.deduciblesDelAno(datos.movimientos, selector.value).forEach(function (f) {
      var caja = el("article", "tarjeta formulario"), entrada = el("input"), etiqueta = el("label", null, "Tope (UVT)");
      entrada.id = f.tipo + "-tope";
      etiqueta.htmlFor = entrada.id;
      entrada.type = "number";
      entrada.min = "0";
      entrada.step = "any";
      entrada.disabled = ocultos;
      entrada.value = ocultos || topes[f.tipo] == null ? "" : topes[f.tipo];
      entrada.addEventListener("change", function () {
        if (ocultos || !entrada.checkValidity()) return;
        topes[f.tipo] = entrada.value;
        guardarLocal(clave, topes);
      });
      caja.append(el("strong", null, f.nombre), el("span", null, dinero(f.total)), etiqueta, entrada);
      cont.append(caja);
    });
  }

  $("btn-deducibles").addEventListener("click", function () { pintarDeducibles(); abrirCapa("pantalla-deducibles"); });
  $("deducibles-ano").addEventListener("change", pintarDeducibles);

  var loteCategorias = null;
  function loteVigente(lote) {
    return lote && fuente === lote.fuente && espacioId === lote.espacio;
  }

  function pintarLoteCategorias() {
    var lote = loteCategorias, lista = $("categorizar-lista");
    lista.replaceChildren();
    var vigente = loteVigente(lote);
    $("categorizar-preguntar").hidden = vigente && lote.revisado;
    $("categorizar-preguntar").disabled = !vigente || ocultos || lote.ocupado;
    $("categorizar-aplicar").hidden = !vigente || !lote.sugerencias.length;
    $("categorizar-aplicar").disabled = !vigente || ocultos || lote.ocupado || !lote.aceptadas.size;
    if (!vigente) return;
    lote.movimientos.forEach(function (m, i) {
      var fila = el("li", "tarjeta formulario");
      fila.append(el("strong", null, (i + 1) + ". " + (m.descripcion || "Sin descripción")),
        el("small", "nota", ocultos ? dinero(0) : "Rango aproximado · " + dinero(m.rango[0]) + " a menos de " + dinero(m.rango[1])));
      if (lote.revisado) {
        var s = lote.sugerencias.find(function (x) { return x.movimiento_id === m.id; });
        var c = s && categoria(s.categoria_id);
        var actual = datos.movimientos.find(function (x) { return x.id === m.id; });
        if (c && actual && actual.categoria_id === c.id) fila.append(el("small", "nota", "Guardado · " + c.nombre));
        else if (c && actual && sinCategoriaParaLote(actual)) {
          var label = el("label", "chip-opcion"), aceptar = el("input");
          aceptar.type = "checkbox";
          aceptar.checked = lote.aceptadas.has(m.id);
          aceptar.disabled = ocultos || lote.ocupado;
          aceptar.addEventListener("change", function () {
            if (aceptar.checked) lote.aceptadas.add(m.id); else lote.aceptadas.delete(m.id);
            $("categorizar-aplicar").disabled = !lote.aceptadas.size;
          });
          label.append(aceptar, document.createTextNode(" Aceptar " + c.nombre));
          fila.append(label);
        } else fila.append(el("small", "nota", "Sin sugerencia válida"));
      }
      lista.append(fila);
    });
  }

  $("btn-categorizar-lote").addEventListener("click", function () {
    if (ocultos || !fuente) return;
    var movimientos = datos.movimientos.filter(sinCategoriaParaLote);
    if (!movimientos.length) return;
    loteCategorias = NovaRespuestas.prepararLoteCategorias(movimientos, datos.movimientos, datos.categorias);
    Object.assign(loteCategorias, { fuente: fuente, espacio: espacioId, sugerencias: [], aceptadas: new Set() });
    mensaje("categorizar-mensaje", "");
    pintarLoteCategorias();
    abrirCapa("pantalla-categorizar-lote");
  });

  $("categorizar-preguntar").addEventListener("click", function () {
    var lote = loteCategorias;
    if (ocultos || !loteVigente(lote) || lote.ocupado || lote.revisado) return;
    if (!lote.categorias.length) return mensaje("categorizar-mensaje", "Crea una categoría para pedir sugerencias.", true);
    if (!cliente || fuente.demo) return mensaje("categorizar-mensaje", "Inicia sesión con tu cuenta para usar NOVA.", true);
    lote.ocupado = true;
    mensaje("categorizar-mensaje", "");
    pintarLoteCategorias();
    abrirChat(null);
    var chat = chatActual;
    function vigente() { return loteCategorias === lote && loteVigente(lote) && chat === chatActual && !ocultos; }
    Promise.resolve(preguntarNova(lote.pregunta, { agregados: true, vigente: vigente })).then(function (texto) {
      if (!vigente() || !texto) return;
      lote.sugerencias = NovaRespuestas.leerSugerenciasCategoria(texto, lote.movimientos, lote.categorias);
      lote.revisado = lote.sugerencias.length > 0;
      mensaje("categorizar-mensaje", lote.revisado ? "Marca las sugerencias que quieras aceptar. Las demás quedan sin cambios." : "NOVA no encontró sugerencias válidas.");
      if (pilaCapas[pilaCapas.length - 1] === "pantalla-chat") cerrarCapa();
    }).finally(function () {
      lote.ocupado = false;
      if (loteCategorias === lote) pintarLoteCategorias();
    });
  });

  function actualizarCategoriasLote(lote, cambios, deshacer) {
    var hechos = [], fallos = [], omitidos = 0;
    return cambios.reduce(function (cadena, cambio) {
      return cadena.then(function () {
        var m = loteVigente(lote) && datos.movimientos.find(function (x) { return x.id === cambio.movimiento_id; });
        var c = categoria(cambio.categoria_id);
        if (!m || (deshacer ? m.categoria_id !== cambio.categoria_id :
          (!sinCategoriaParaLote(m) || !c || c.tipo !== m.tipo))) { omitidos++; return; }
        var anterior = m.categoria_id;
        return lote.fuente.actualizar("movimientos", m.id, { categoria_id: deshacer ? cambio.anterior : cambio.categoria_id }).then(function (n) {
          Object.assign(m, n);
          hechos.push(Object.assign({}, cambio, { anterior: anterior == null ? null : anterior }));
        }).catch(function () { fallos.push(cambio.movimiento_id); });
      });
    }, Promise.resolve()).then(function () {
      if (loteVigente(lote)) pintar();
      var detalle = (fallos.length ? fallos.length + " sin guardar. " : "") + (omitidos ? omitidos + " omitidos porque cambiaron." : "");
      var accion = !deshacer && hechos.length ? { texto: "↩ Deshacer", duracion: 12000, fn: function () {
        actualizarCategoriasLote(lote, hechos, true);
      } } : null;
      toast(hechos.length ? hechos.length + (deshacer ? " cambios deshechos" : " movimientos categorizados") :
        (fallos.length ? "No se pudo guardar el cambio" : "No había cambios disponibles"), detalle || null, null, accion);
      return fallos;
    });
  }

  $("categorizar-aplicar").addEventListener("click", function () {
    var lote = loteCategorias;
    if (ocultos || !loteVigente(lote) || lote.ocupado || !lote.aceptadas.size) return;
    lote.ocupado = true;
    var cambios = lote.sugerencias.filter(function (s) { return lote.aceptadas.has(s.movimiento_id); });
    pintarLoteCategorias();
    actualizarCategoriasLote(lote, cambios, false).then(function (fallos) {
      lote.aceptadas = new Set(fallos);
      lote.ocupado = false;
      if (loteCategorias !== lote) return;
      pintarLoteCategorias();
      if (fallos.length) mensaje("categorizar-mensaje", "Puedes volver a aplicar los cambios que quedaron pendientes.", true);
      else if (pilaCapas[pilaCapas.length - 1] === "pantalla-categorizar-lote") cerrarCapa();
    });
  });

  function filtrosActivos() {
    return ["categoriaId"].concat(Object.keys(camposFiltros)).filter(function (k) {
      return filtros[k] !== "" && filtros[k] != null;
    }).length;
  }
  function resultadosBusqueda() { return A.filtrarMovimientos(datos.movimientos, filtros, nombreCategoria); }
  function sinCategoriaParaLote(m) {
    var c = categoria(m.categoria_id);
    return !m.transferencia && (m.tipo === "gasto" || m.tipo === "ingreso") && (!c || c.tipo !== m.tipo);
  }

  function pintarBuscar() {
    $("btn-categorizar-lote").hidden = !datos.movimientos.some(sinCategoriaParaLote);
    $("btn-categorizar-lote").disabled = ocultos;
    document.querySelectorAll("#buscar-tipo button").forEach(function (b) { b.setAttribute("aria-checked", String(b.dataset.tipo === filtros.tipo)); });
    var selCat = $("filtro-categoria");
    selCat.replaceChildren(el("option", null, "Todas"));
    selCat.firstChild.value = "";
    datos.categorias.slice().sort(function (a, b) { return a.nombre.localeCompare(b.nombre); }).forEach(function (c) {
      var o = el("option", null, etiquetaCategoria(c) + (c.tipo === "ingreso" ? " (ingreso)" : "")); o.value = c.id; o.selected = c.id === filtros.categoriaId; selCat.append(o);
    });
    var selEt = $("filtro-etiqueta");
    selEt.replaceChildren(el("option", null, "Todas"));
    selEt.firstChild.value = "";
    etiquetasUsadas().forEach(function (e) { var o = el("option", null, "#" + e); o.value = e; o.selected = e === filtros.etiqueta; selEt.append(o); });
    var selCuenta = $("filtro-cuenta");
    selCuenta.replaceChildren(el("option", null, "Todas"));
    selCuenta.firstChild.value = "";
    datos.cuentas.forEach(function (c) {
      var o = el("option", null, c.nombre);
      o.value = c.id;
      selCuenta.append(o);
    });
    $("filtros-montos").hidden = ocultos;
    Object.keys(camposFiltros).forEach(function (k) {
      $(camposFiltros[k]).value = ocultos && (k === "montoMin" || k === "montoMax") ? "" : filtros[k];
    });
    $("buscar-orden").value = filtros.orden;
    var activos = filtrosActivos();
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
    filtros = Object.assign({}, filtrosIniciales, f || {});
    $("buscar-texto").value = filtros.texto;
    mostrarFiltros(filtrosActivos() > 0);
    ir("buscar");
  }
  $("buscar-texto").addEventListener("input", function (e) { filtros.texto = e.target.value; pintarBuscar(); });
  document.querySelectorAll("#buscar-tipo button").forEach(function (b) { b.addEventListener("click", function () { filtros.tipo = b.dataset.tipo; pintarBuscar(); }); });
  function mostrarFiltros(mostrar) {
    $("filtros").hidden = !mostrar;
    $("btn-filtros").setAttribute("aria-expanded", String(mostrar));
  }
  $("btn-filtros").addEventListener("click", function () { mostrarFiltros($("filtros").hidden); });
  $("filtro-categoria").addEventListener("change", function (e) { filtros.categoriaId = e.target.value ? Number(e.target.value) : null; pintarBuscar(); });
  Object.keys(camposFiltros).forEach(function (k) {
    $(camposFiltros[k]).addEventListener("change", function (e) { filtros[k] = e.target.value; pintarBuscar(); });
  });
  $("buscar-orden").addEventListener("change", function (e) { filtros.orden = e.target.value; pintarBuscar(); });
  $("btn-limpiar-filtros").addEventListener("click", function () {
    filtros = Object.assign({}, filtrosIniciales, { texto: filtros.texto, orden: filtros.orden });
    pintarBuscar();
  });
  $("btn-exportar-busqueda").addEventListener("click", function () { exportarMovimientos(resultadosBusqueda(), "nova-busqueda"); });

  // ---------- Configuración ----------
  function tasaUsura() {
    return fuente.demo ? fuente.tasaUsura || "" : leerLocal(claveComodidad("usura"), "");
  }

  var AVISO_USURA = "Esta tasa supera la de usura";
  $("aj-usura").addEventListener("change", function (e) {
    var texto = e.target.value.trim(), tasa = texto ? A.porcentajeValido(texto) : "";
    if (texto && !(tasa > 0)) return mensaje("aj-usura-mensaje", "Escribe una tasa mayor que cero o deja el campo vacío.", true);
    if (fuente.demo) fuente.tasaUsura = tasa;
    else if (!guardarLocal(claveComodidad("usura"), tasa)) return mensaje("aj-usura-mensaje", "No se pudo guardar en este dispositivo.", true);
    mensaje("aj-usura-mensaje", "Guardado en este dispositivo.");
    pintarAnalisis();
    pintarUsuraTarjeta();
  });

  function pintarAjustes() {
    $("perfil-email").textContent = fuente.email;
    if (document.activeElement !== $("aj-usura")) {
      $("aj-usura").value = String(tasaUsura()).replace(".", ",");
      mensaje("aj-usura-mensaje", "");
    }
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
    $("exp-movimientos").textContent = "Todos tus espacios · " + filasDeTodosLosEspacios("movimientos").length + " movimientos";
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
  var catActual = null, catForm = null, catColorInicial = "", alGuardarCategoria = null;
  function abrirCategoria(c, tipo, alGuardar) {
    catActual = c || null;
    alGuardarCategoria = alGuardar || null;
    catForm = c ? { tipo: c.tipo, icono: iconoCategoria(c), color: colorDe(c).charAt(0) === "#" ? colorDe(c) : "#2ee06f", grupo: A.grupoDe(c) }
      : { tipo: tipo || "gasto", icono: "⭐", color: "#2ee06f", grupo: tipo === "ingreso" ? "Otros Ingresos" : "Otros" };
    catColorInicial = catForm.color;
    $("cat-titulo").textContent = c ? "Editar categoría" : "Nueva categoría";
    $("cat-nombre").value = c ? c.nombre : "";
    $("cat-borrar").hidden = !c;
    $("cat-icono-buscar").value = "";
    $("cat-emoji").value = "";
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
      b.addEventListener("click", function () { catForm.icono = x[0]; $("cat-emoji").value = ""; pintarFormCategoria(); });
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
  $("cat-emoji").addEventListener("input", function () {
    var emoji = A.emojiPegado(this.value);
    if (emoji) { catForm.icono = emoji; pintarFormCategoria(); }
  });
  $("form-categoria").addEventListener("submit", function (e) {
    e.preventDefault();
    var nombre = $("cat-nombre").value.trim();
    if (!nombre) return mensaje("cat-mensaje", "Escribe el nombre de la categoría.", true);
    var repetida = datos.categorias.some(function (c) { return c.tipo === catForm.tipo && c.nombre.toLowerCase() === nombre.toLowerCase() && (!catActual || c.id !== catActual.id); });
    if (repetida) return mensaje("cat-mensaje", "Ya tienes una categoría con ese nombre.", true);
    if ($("cat-emoji").value.trim() && !A.emojiPegado($("cat-emoji").value)) return mensaje("cat-mensaje", "Pega un solo emoji.", true);
    var actual = catActual, origen = fuente, icono = catForm.icono, cb = alGuardarCategoria;
    var cambioIcono = !actual || icono !== iconoCategoria(actual);
    var fila = { nombre: nombre, tipo: catForm.tipo, color: catForm.color, grupo: catForm.grupo };
    if (!actual) fila.icono = "otro";
    var boton = e.target.querySelector("button[type=submit]");
    boton.disabled = true;
    var metadatosCambiaron = actual && (actual.nombre !== nombre || actual.tipo !== fila.tipo ||
      catColorInicial !== fila.color || A.grupoDe(actual) !== fila.grupo);
    var op = !actual ? origen.crear("categorias", fila) : metadatosCambiaron
      ? origen.actualizar("categorias", actual.id, fila) : Promise.resolve(actual);
    op.then(function (c) {
      if (fuente !== origen) return;
      if (actual) Object.assign(actual, c); else datos.categorias.push(c);
      var guardado = true;
      if (cambioIcono) {
        if (origen.demo) origen.iconosCategoria[c.id] = icono;
        else guardado = guardarLocal(claveComodidad("icono-categoria-" + c.id), icono);
      }
      toast(guardado ? "Categoría guardada" : "No se pudo guardar el ícono en este teléfono");
      cerrarCapa();
      pintar();
      if (cb) cb(c);
    }).catch(function (err) { mensaje("cat-mensaje", err.message, true); })
      .finally(function () { boton.disabled = false; });
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
  function claveMinimosCuenta() { return "nova-minimos-cuenta:" + fuente.email; }
  function leerMinimosCuenta() { return fuente.demo ? fuente.minimosCuenta || {} : leerLocal(claveMinimosCuenta(), {}) || {}; }
  function guardarMinimoCuenta(id, minimo) {
    var minimos = leerMinimosCuenta();
    if (minimo === null) delete minimos[id];
    else minimos[id] = minimo;
    if (fuente.demo) fuente.minimosCuenta = minimos;
    else guardarLocal(claveMinimosCuenta(), minimos);
  }

  function claveDiasTarjeta() { return "nova-dias-tarjeta:" + fuente.email; }
  function leerDiasTarjeta() { return fuente.demo ? fuente.diasTarjeta || {} : leerLocal(claveDiasTarjeta(), {}) || {}; }
  function guardarDiasTarjeta(id, corte, pago) {
    var dias = leerDiasTarjeta();
    if (corte === null && pago === null) delete dias[id];
    else dias[id] = { diaCorte: corte, diaPago: pago };
    if (fuente.demo) fuente.diasTarjeta = dias;
    else guardarLocal(claveDiasTarjeta(), dias);
  }

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
        var campos = [
          { clave: "nombre", etiqueta: "Nombre de la cuenta", tipo: "texto", valor: c.nombre, requerido: true, max: 40 },
          { clave: "tipo", etiqueta: "Tipo", tipo: "select", valor: c.tipo, opciones: TIPOS_CUENTA }
        ];
        if (!ocultos) campos.push(
          { clave: "saldo_inicial", etiqueta: "Saldo con el que empezó", tipo: "plata", valor: num(c.saldo_inicial), permiteCero: true },
          { clave: "minimo", etiqueta: "Saldo mínimo para avisarte (opcional)", tipo: "plata", valor: leerMinimosCuenta()[c.id], opcional: true, permiteCero: true, permiteNegativo: true }
        );
        var dias = leerDiasTarjeta()[c.id] || {};
        campos.push(
          { clave: "diaCorte", etiqueta: "Día de corte (opcional, 1 a 31)", tipo: "diaMes", valor: dias.diaCorte },
          { clave: "diaPago", etiqueta: "Día de pago (opcional, 1 a 31)", tipo: "diaMes", valor: dias.diaPago }
        );
        abrirEditor({
          titulo: "Editar cuenta",
          ayuda: puedeBorrar ? null : (datos.cuentas.length <= 1 ? "Es tu única cuenta: no se puede borrar." : "No se puede borrar porque tiene " + usos + (usos === 1 ? " movimiento." : " movimientos.") + " Si quieres, bórralos antes."),
          campos: campos,
          guardar: function (v) {
            var cambios = {};
            if (v.nombre !== c.nombre) cambios.nombre = v.nombre;
            if (v.tipo !== c.tipo) cambios.tipo = v.tipo;
            if (v.saldo_inicial !== undefined && v.saldo_inicial !== num(c.saldo_inicial)) cambios.saldo_inicial = v.saldo_inicial;
            var guardado = Object.keys(cambios).length
              ? fuente.actualizar("cuentas", c.id, cambios).then(function (n) { Object.assign(c, n); })
              : Promise.resolve();
            return guardado.then(function () {
              if (v.minimo !== undefined) guardarMinimoCuenta(c.id, v.minimo);
              if (v.tipo === "credito") guardarDiasTarjeta(c.id, v.diaCorte, v.diaPago);
            });
          },
          borrar: puedeBorrar ? function () { return fuente.borrar("cuentas", c.id).then(function () {
            datos.cuentas = datos.cuentas.filter(function (x) { return x.id !== c.id; });
            guardarMinimoCuenta(c.id, null);
            guardarDiasTarjeta(c.id, null, null);
          }); } : null,
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
    var rango = A.rangoJornada(cualTrabajo);
    var r = A.resumenTrabajo(datos.movimientos, datos.categorias, rango);
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
      filaPlataforma(ulp, c ? etiquetaCategoria(c) : "Otra", colorDe(c), p.total, p.viajes ? p.viajes + (p.viajes === 1 ? " viaje" : " viajes") + " · " + dinero(p.total / p.viajes) + " por viaje" : "", maxP);
    });
    var ulg = $("trabajo-categorias"), maxG = r.gastosPorCategoria.length ? r.gastosPorCategoria[0].total : 1;
    ulg.replaceChildren();
    if (!r.gastosPorCategoria.length) ulg.append(el("li", "vacio", "Todavía no hay gastos del trabajo en este periodo."));
    r.gastosPorCategoria.forEach(function (g) {
      var c = categoria(g.id);
      filaPlataforma(ulg, c ? etiquetaCategoria(c) : "Otro", colorDe(c), g.total, r.ingresos ? Math.round((g.total / r.ingresos) * 100) + "% de lo que ganaste" : "", maxG);
    });

    var accionesIngresos = $("trabajo-plataformas-acciones"), accionesGastos = $("trabajo-categorias-acciones");
    accionesIngresos.replaceChildren();
    accionesGastos.replaceChildren();
    var periodo = periodoGrafico(rango);
    if (r.porPlataforma.length) explicarGrafico(accionesIngresos, "Ganancias del trabajo por plataforma", periodo,
      [["Ganancias totales", r.ingresos]].concat(r.porPlataforma.map(function (p) { return [nombreCategoria(p.id), p.total]; })));
    if (r.gastosPorCategoria.length) explicarGrafico(accionesGastos, "Gastos del trabajo por categoría", periodo,
      r.gastosPorCategoria.map(function (g) { return [nombreCategoria(g.id), g.total]; }));

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
  // cfg: { titulo, ayuda, campos: [{ clave, etiqueta, tipo: "texto" | "plata" | "fecha" | "select" | "decimal", valor, opciones, requerido, permiteCero, max }],
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
        if (f.tipo === "plata") {
          ent.className = "campo-plata";
          ent.inputMode = "numeric";
          if (f.valor != null && f.valor !== "") ent.value = cfg.protegerMontos ?
            f.valor.toLocaleString("es-CO", { useGrouping: false, maximumFractionDigits: 2 }) : numeroCO.format(f.valor);
          if (cfg.protegerMontos && ocultos) { ent.type = "password"; ent.disabled = true; }
        }
        else if (f.tipo === "decimal") { ent.inputMode = "decimal"; ent.value = f.valor == null ? "" : String(f.valor); }
        else if (f.tipo === "diaMes") {
          ent.type = "number"; ent.inputMode = "numeric"; ent.min = 1; ent.max = 31; ent.value = f.valor || "";
        }
        else if (f.tipo === "fecha") { ent.type = "date"; ent.value = f.valor ? String(f.valor).slice(0, 10) : ""; }
        else { ent.value = f.valor || ""; ent.maxLength = f.max || 100; }
      }
      ent.id = id; f.entrada = ent;
      caja.append(etq, ent);
    });
    var dias = cfg.campos.filter(function (f) { return f.tipo === "diaMes"; });
    if (dias.length) {
      var tipo = cfg.campos.find(function (f) { return f.clave === "tipo"; }).entrada;
      var mostrarDias = function () {
        dias.forEach(function (f) {
          f.entrada.previousElementSibling.hidden = f.entrada.hidden = f.entrada.disabled = tipo.value !== "credito";
        });
      };
      tipo.addEventListener("change", mostrarDias);
      mostrarDias();
    }
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
      if (f.entrada.disabled) continue;
      if (f.tipo === "diaMes") {
        v = t === "" ? null : Number(t);
        if (v !== null && (!Number.isInteger(v) || v < 1 || v > 31)) {
          return mensaje("editar-mensaje", "Escribe un día del 1 al 31.", true);
        }
      } else if (f.tipo === "plata") {
        var negativo = f.permiteNegativo && /^[-−]/.test(t);
        if (f.requerido && !t) return mensaje("editar-mensaje", "Falta «" + f.etiqueta + "».", true);
        if (cfg.protegerMontos && /^[$\s]*[-−]/.test(t)) return mensaje("editar-mensaje", "Escribe un valor de cero en adelante.", true);
        if (t === "" && f.opcional) v = null;
        else {
          v = t === "" && f.permiteCero ? 0 : negativo ? -leerValor(t.slice(1)) : leerValor(t);
          if (!isFinite(v) || (v < 0 && !f.permiteNegativo) || (v === 0 && !f.permiteCero)) return mensaje("editar-mensaje", "No entendí «" + f.etiqueta + "». Escribe un valor, por ejemplo 500 mil.", true);
        }
      } else if (f.tipo === "decimal") {
        v = t ? Number(t.replace(",", ".")) : NaN;
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

  var origenesTarjeta = new Map();

  function datosGuardadosTarjeta() {
    return fuente.demo ? fuente.datosSimulador || {} : leerLocal(claveComodidad("datos-simulador"), {});
  }

  function pintarUsuraTarjeta() {
    $("tarjeta-usura").hidden = !A.superaUsura($("tarjeta-tasa").value, tasaUsura());
  }

  function pintarPrivacidadTarjeta() {
    ["tarjeta-deuda", "tarjeta-minimo-fijo", "tarjeta-cuota"].forEach(function (id) {
      $(id).type = ocultos ? "password" : "text";
    });
    $("tarjeta-minimo-nota").textContent = ocultos ? "Si lo dejas vacío, se usa un mínimo fijo de ejemplo."
      : "Si lo dejas vacío, se usa un mínimo fijo de $ 20.000.";
  }

  function limpiarResultadoTarjeta() {
    mensaje("tarjeta-mensaje", "");
    $("tarjeta-resultado").replaceChildren();
    $("tarjeta-resultado").hidden = true;
  }

  $("btn-simulador-tarjeta").addEventListener("click", function () {
    $("form-tarjeta").reset();
    limpiarResultadoTarjeta();
    pintarPrivacidadTarjeta();
    pintarUsuraTarjeta();
    origenesTarjeta.clear();
    var sel = $("tarjeta-origen");
    var manual = el("option", null, "Escribir los datos");
    manual.value = "";
    sel.replaceChildren(manual);
    function agregarOrigen(clave, nombre, saldo) {
      var opcion = el("option", null, nombre);
      opcion.value = clave;
      sel.append(opcion);
      origenesTarjeta.set(clave, saldo);
    }
    resumenDeDeudas().lista.forEach(function (x) {
      if (x.deuda.tipo === "debo" && x.falta > 0) {
        agregarOrigen("deuda:" + x.deuda.id, [x.deuda.persona, x.deuda.concepto].filter(Boolean).join(" · "), x.falta);
      }
    });
    datos.cuentas.forEach(function (c) {
      if (c.tipo === "credito") agregarOrigen("tarjeta:" + c.id, c.nombre, Math.max(0, -saldoCuenta(c)));
    });
    $("tarjeta-origen-bloque").hidden = !origenesTarjeta.size;
    $("tarjeta-guardar-datos").hidden = true;
    abrirCapa("pantalla-tarjeta");
  });

  $("tarjeta-origen").addEventListener("change", function (e) {
    var clave = e.target.value;
    var saldo = origenesTarjeta.get(clave), guardado = datosGuardadosTarjeta()[clave];
    $("tarjeta-deuda").value = saldo === undefined ? "" : textoMonto(saldo);
    $("tarjeta-tasa").value = guardado ? String(guardado.tasa).replace(".", ",") : "";
    $("tarjeta-minimo-pct").value = guardado ? String(guardado.porcentaje).replace(".", ",") : "5";
    $("tarjeta-minimo-fijo").value = guardado ? textoMonto(guardado.minimo) : "";
    $("tarjeta-guardar-datos").hidden = !clave;
    limpiarResultadoTarjeta();
    pintarUsuraTarjeta();
  });

  $("tarjeta-tasa").addEventListener("input", pintarUsuraTarjeta);

  $("tarjeta-guardar-datos").addEventListener("click", function () {
    var clave = $("tarjeta-origen").value;
    if (!origenesTarjeta.has(clave)) return;
    var tasa = leerPorcentajeTarjeta("tarjeta-tasa"), porcentaje = leerPorcentajeTarjeta("tarjeta-minimo-pct");
    var textoMinimo = $("tarjeta-minimo-fijo").value.trim(), minimo = leerMontoTarjeta(textoMinimo);
    if (!(tasa >= 0 && tasa <= 200) || !(porcentaje >= 0 && porcentaje <= 100) ||
        !/\d/.test(textoMinimo) || !(Number.isFinite(minimo) && minimo >= 0)) {
      return mensaje("tarjeta-mensaje", "Revisa la tasa y escribe el pago mínimo fijo para guardar. Puede ser cero.", true);
    }
    var guardados = datosGuardadosTarjeta();
    guardados[clave] = { tasa: tasa, porcentaje: porcentaje, minimo: minimo };
    if (fuente.demo) fuente.datosSimulador = guardados;
    else if (!guardarLocal(claveComodidad("datos-simulador"), guardados)) {
      return mensaje("tarjeta-mensaje", "No se pudo guardar en este dispositivo.", true);
    }
    mensaje("tarjeta-mensaje", "");
    toast("Tasa y pago mínimo guardados");
  });

  function leerPorcentajeTarjeta(id) {
    return A.porcentajeValido($(id).value);
  }

  function leerMontoTarjeta(texto) {
    // El intérprete de montos toma las cifras sin el signo.
    return /[-−]\s*\$?\s*\d/.test(texto) ? NaN : leerValor(texto);
  }

  function resultadoPagoTarjeta(titulo, pago, aviso) {
    var bloque = el("section");
    bloque.append(el("h2", null, titulo));
    if (!pago.seAcaba) {
      bloque.append(el("p", null, aviso));
      return bloque;
    }
    var plazo = pago.meses + (pago.meses === 1 ? " mes" : " meses");
    if (pago.meses > 24) plazo += " (unos " + Math.round(pago.meses / 12) + " años)";
    bloque.append(el("p", null, plazo),
      el("p", null, "Total pagado: " + dinero(pago.totalPagado)),
      el("p", null, "Intereses: " + dinero(pago.totalIntereses)));
    return bloque;
  }

  $("form-tarjeta").addEventListener("submit", function (e) {
    e.preventDefault();
    var resultado = $("tarjeta-resultado");
    limpiarResultadoTarjeta();
    pintarUsuraTarjeta();
    var deuda = leerMontoTarjeta($("tarjeta-deuda").value);
    var tasaEA = leerPorcentajeTarjeta("tarjeta-tasa");
    var pagoMinimoPct = leerPorcentajeTarjeta("tarjeta-minimo-pct");
    var fijo = $("tarjeta-minimo-fijo").value.trim();
    var minimoFijo = fijo === "" ? 20000 : leerMontoTarjeta(fijo);
    var cuota = leerMontoTarjeta($("tarjeta-cuota").value);

    if (!Number.isFinite(deuda) || deuda <= 0) return mensaje("tarjeta-mensaje", "Escribe una deuda mayor que cero.", true);
    if (!(tasaEA >= 0 && tasaEA <= 200)) return mensaje("tarjeta-mensaje", "Escribe una tasa anual entre 0 y 200 %.", true);
    if (!(pagoMinimoPct >= 0 && pagoMinimoPct <= 100)) return mensaje("tarjeta-mensaje", "Escribe un porcentaje de pago mínimo entre 0 y 100 %.", true);
    if (!Number.isFinite(minimoFijo) || minimoFijo < 0) return mensaje("tarjeta-mensaje", "Escribe un mínimo fijo válido de cero o más, o deja el campo vacío.", true);
    if (!Number.isFinite(cuota) || cuota <= 0) return mensaje("tarjeta-mensaje", "Escribe una cuota mensual mayor que cero.", true);

    mensaje("tarjeta-mensaje", "");
    var comparacion = window.NovaTarjeta.compararMinimoVsCuota({ deuda, tasaEA, pagoMinimoPct, minimoFijo, cuota });
    resultado.append(
      resultadoPagoTarjeta("Si pagas solo el mínimo", comparacion.minimo, "Con ese mínimo no terminas de pagar en 50 años"),
      resultadoPagoTarjeta("Si pagas " + dinero(cuota) + " al mes", comparacion.cuota, comparacion.cuota.meses === null
        ? "Esa cuota no alcanza a cubrir los intereses del mes: la deuda nunca baja."
        : "Con esa cuota no terminas de pagar en 50 años.")
    );
    var ahorro = comparacion.ahorroIntereses, mesesMenos = comparacion.mesesMenos;
    if (ahorro !== null) {
      var intereses = ahorro >= 0 ? "Te ahorras " + dinero(ahorro) : "Pagas " + dinero(-ahorro) + " más";
      var plazo = mesesMenos === 0 ? "en el mismo plazo"
        : Math.abs(mesesMenos) + (Math.abs(mesesMenos) === 1 ? " mes " : " meses ") + (mesesMenos > 0 ? "antes" : "después");
      var favorable = ahorro >= 0 && mesesMenos >= 0;
      resultado.append(el("p", favorable ? "positivo" : null, intereses + " en intereses y terminas " + plazo + "."));
    }
    resultado.append(el("small", "nota", "Es un cálculo aproximado: el banco puede cobrar cuota de manejo, seguros y otros cargos."));
    resultado.hidden = false;
  });

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
  var borradosEnCurso = new Set();
  function borrarMovimientos(ids) {
    var origen = fuente, lista = datos, guardados = [];
    return ids.reduce(function (p, id) {
      return p.then(function () {
        var m = lista.movimientos.find(function (x) { return x.id === id; });
        if (!m || borradosEnCurso.has(m)) return;
        var entrada = aPapelera("movimientos", m);
        borradosEnCurso.add(m);
        return origen.borrar("movimientos", id).then(function () {
          lista.movimientos = lista.movimientos.filter(function (x) { return x.id !== id; });
          var todo = origen.todo();
          if (todo && todo !== lista) todo.movimientos = todo.movimientos.filter(function (x) { return x.id !== id; });
          guardados.push(entrada);
        }).catch(function (err) {
          quitarDePapelera(entrada.id, origen);
          throw err;
        }).finally(function () { borradosEnCurso.delete(m); });
      });
    }, Promise.resolve()).then(function () { return guardados; });
  }

  function confirmarBorradoMovimiento(m, capa, boton) {
    if (!m || borradosEnCurso.has(m) || !confirm("¿Borrar «" + m.descripcion + "»?")) return;
    var origen = fuente;
    boton.disabled = true;
    borrarMovimientos([m.id]).then(function (guardados) {
      if (!guardados.length || origen !== fuente) return;
      if (pilaCapas[pilaCapas.length - 1] === capa) cerrarCapa();
      toast("Movimiento borrado", m.descripcion, null, { texto: "↩ Deshacer", fn: deshacerBorrado(guardados[0]) });
      pintar();
    }).catch(function (err) {
      if (capa === "pantalla-registro") mensaje("reg-mensaje", err.message, true);
      else toast("No se pudo borrar: " + err.message);
    }).finally(function () { boton.disabled = false; });
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
    $("abono-whatsapp").hidden = ocultos || d.tipo !== "me_deben" || x.falta <= 0;
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
    var grafico = $("abono-evolucion");
    grafico.replaceChildren();
    var puntos = ocultos ? [] : A.evolucionDeuda(d, datos.abonos);
    grafico.hidden = puntos.length < 2;
    if (!grafico.hidden) {
      titulo(grafico, "Cómo ha bajado el saldo");
      var etiquetas = puntos.map(function (p, i) {
        return i === 0 ? "Inicio" : i === puntos.length - 1 ? "Ahora" : "";
      });
      var linea = lineaSVG(puntos.map(function (p) { return p.saldo; }), etiquetas, "", 90);
      linea.setAttribute("role", "img");
      linea.setAttribute("aria-label", "El saldo pasó de " + dinero(puntos[0].saldo) + " a " + dinero(puntos[puntos.length - 1].saldo));
      grafico.append(linea);
      explicarGrafico(grafico, "Cómo ha bajado el saldo de la deuda", "Desde el saldo inicial hasta el actual", puntos.map(function (p, i) {
        var nombre = i === 0 ? "Inicio" : i === puntos.length - 1 ? "Ahora" : "Después del abono " + i;
        return [nombre, p.saldo];
      }));
    }
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
  function avisosSemanales(ahora) {
    var lista = [], d = new Date(ahora);
    d.setHours(19, 0, 0, 0);
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
    if (d < ahora) d.setDate(d.getDate() + 7);
    for (var k = 0; k < 4; k++) {
      var sem = k === 0 ? NovaConsejos.semana(datos.movimientos, d) : null;
      var texto = sem && sem.movimientos ? "Esta semana gastaste " + pesos.format(sem.gastos) + (sem.ingresos ? " e ingresaste " + pesos.format(sem.ingresos) : "") + (sem.cambio != null ? " (" + Math.abs(sem.cambio) + " % " + (sem.cambio > 0 ? "más" : "menos") + " que la anterior)" : "") + ". ¡Mira cómo planear la próxima!" : "Es domingo: mira cómo te fue esta semana y planea la siguiente.";
      lista.push({ id: 800000001 + k, titulo: "Tu semana en NOVA", texto: texto, cuando: new Date(d.getTime()) });
      d.setDate(d.getDate() + 7);
    }
    return lista;
  }
  // Recordatorios opcionales: anotar los gastos cada noche y el día antes de un pago programado.
  function avisosRecordatorios(ahora) {
    var lista = [];
    if (leerLocal("nova-rec-noche", false)) {
      // A la hora que la persona eligió (9 p. m. si no eligió). Hoy no suena si ya anotó algo: cada vez que anota,
      // NOVA vuelve a programar los avisos (ver pintar()). Trae los botones de los registros comunes.
      var horaRec = Number(leerLocal("nova-rec-noche-hora", 21)) || 21, hoyK = A.claveDia(ahora);
      var yaAnoto = datos.movimientos.some(function (m) { return A.claveDia(m.fecha) === hoyK; });
      for (var k = 0; k < 7; k++) {
        var d = new Date(ahora); d.setDate(d.getDate() + k); d.setHours(horaRec, 0, 0, 0);
        if (k === 0 && yaAnoto) continue;
        if (d > ahora) lista.push({ id: 700000001 + k, titulo: "¿Gastaste algo hoy?", texto: datos.frecuentes.length ? "Anótalo en un segundo con los botones, o abre NOVA." : "Tómate un minuto para anotar lo de hoy en NOVA.", cuando: d, botones: true });
      }
    }
    if (leerLocal("nova-rec-respaldo", false)) {
      var dom = new Date(ahora); dom.setHours(18, 0, 0, 0); dom.setDate(dom.getDate() + ((7 - dom.getDay()) % 7));
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
  var noMolestar = leerLocal("nova-no-molestar", null) || {};
  $("no-molestar").checked = !!noMolestar.activo;
  $("no-molestar-inicio").value = noMolestar.inicio || "22:00";
  $("no-molestar-fin").value = noMolestar.fin || "07:00";
  ["no-molestar", "no-molestar-inicio", "no-molestar-fin"].forEach(function (id) {
    $(id).addEventListener("change", function () {
      var inicio = $("no-molestar-inicio"), fin = $("no-molestar-fin");
      if (!inicio.reportValidity() || !fin.reportValidity()) return;
      var config = { activo: $("no-molestar").checked, inicio: inicio.value, fin: fin.value };
      if (!guardarLocal("nova-no-molestar", config)) return toast("No se pudo guardar el horario");
      programarAvisos();
    });
  });
  $("rec-noche").checked = !!leerLocal("nova-rec-noche", false);
  $("rec-noche-hora").value = String(Number(leerLocal("nova-rec-noche-hora", 21)) || 21);
  $("rec-noche-hora").addEventListener("change", function (e) { guardarLocal("nova-rec-noche-hora", Number(e.target.value)); programarAvisos(); toast("Recordatorio a las " + e.target.selectedOptions[0].textContent); });
  $("rec-programados").checked = !!leerLocal("nova-rec-programados", false);
  $("rec-respaldo").checked = !!leerLocal("nova-rec-respaldo", false);
  $("aviso-gasto-alto").checked = !!leerLocal("nova-aviso-gasto-alto", false);
  $("aviso-gasto-alto").addEventListener("change", function (e) {
    guardarLocal("nova-aviso-gasto-alto", e.target.checked);
  });
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
  var canalGastoAltoPreparado = false, avisoGastoAltoEnCurso = false, diaToastGastoAlto = "";
  async function avisarGastoAlto(movimiento) {
    try {
      if (!fuente || fuente.demo || movimiento.tipo !== "gasto" || movimiento.transferencia ||
          (Array.isArray(movimiento.etiquetas) && movimiento.etiquetas.indexOf("deuda") !== -1) ||
          !leerLocal("nova-aviso-gasto-alto", false)) return;
      var ahora = new Date(), hoy = A.claveDia(ahora);
      if (A.claveDia(movimiento.fecha) !== hoy || NovaHerramientas.enNoMolestar(ahora, leerLocal("nova-no-molestar", null))) return;
      var moneda = monedaBase();
      var gasto = NovaHerramientas.gastoAltoDelDia(datos.movimientos, ahora, {
        moneda: moneda, ultimoAviso: leerLocal("nova-ultimo-gasto-alto", "")
      });
      if (!gasto) return;
      var veces = gasto.veces.toFixed(1).replace(".", ",");
      if (diaToastGastoAlto !== hoy) {
        diaToastGastoAlto = hoy;
        toast("Hoy vas con un gasto alto (≈ " + veces + " veces tu día normal)");
      }
      var N = enApp && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
      if (!N || avisoGastoAltoEnCurso) return;
      avisoGastoAltoEnCurso = true;
      try {
        if (!canalGastoAltoPreparado) {
          try {
            await N.createChannel({
              id: "gasto-alto", name: "Gasto alto del día", description: "Aviso discreto cuando gastas mucho en un día",
              importance: 2, vibration: false
            });
          } catch (e) {
            // Sin canal silencioso, Android puede usar el sonido del sistema.
            if (window.Capacitor.getPlatform && window.Capacitor.getPlatform() === "android") return;
          }
          canalGastoAltoPreparado = true;
        }
        var permiso = N.checkPermissions ? await N.checkPermissions() : null;
        if (!permiso || permiso.display !== "granted") permiso = await N.requestPermissions();
        if (!permiso || permiso.display !== "granted") return;
        var actual = new Date();
        if (A.claveDia(actual) !== hoy || !leerLocal("nova-aviso-gasto-alto", false) ||
            NovaHerramientas.enNoMolestar(actual, leerLocal("nova-no-molestar", null))) return;
        await N.schedule({ notifications: [{
          id: 760000000 + Number(hoy.replace(/-/g, "")), channelId: "gasto-alto",
          title: "Hoy vas con un gasto alto", interruptionLevel: "passive",
          body: "Llevas " + dineroEn(gasto.total, moneda) + " hoy, unas " + veces + " veces tu día normal (" + dineroEn(gasto.promedio, moneda) + ")."
        }] });
        guardarLocal("nova-ultimo-gasto-alto", hoy);
      } finally {
        avisoGastoAltoEnCurso = false;
      }
    } catch (e) { /* El gasto ya quedó guardado. */ }
  }

  function programarAvisos() {
    var N = enApp && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
    if (!N || !fuente || fuente.demo) return Promise.resolve();
    var ahora = new Date(), silencio = leerLocal("nova-no-molestar", null);
    var referencia = NovaHerramientas.referenciaAvisos(ahora, silencio);
    var avisos = (conductor() ? A.avisosDocumentos(datos.documentos, referencia) : [])
      .concat(A.avisosDeudas(resumenDeDeudas().lista, referencia), avisosSemanales(referencia), avisosRecordatorios(referencia))
      .map(function (a) { return Object.assign(a, { cuando: NovaHerramientas.horaAviso(a.cuando, silencio) }); })
      .filter(function (a) { return a.cuando > ahora; }).slice(0, 60);
    return N.getPending().then(function (p) {
      var viejos = (p && p.notifications || []).filter(function (n) {
        // Android también devuelve aquí el aviso de gasto alto ya entregado.
        return n.id < 780000000 || n.id >= 790000000;
      }).map(function (n) { return { id: n.id }; });
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
  function datosRespaldo() {
    var copia = { app: "NOVA", creada_por: "OPITA-DIGITAL", exportado: new Date().toISOString(), perfil: datos.perfil };
    TABLAS.forEach(function (t) { copia[t] = datos[t]; });
    return copia;
  }
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
      if (que === "movimientos") {
        if (ocultos) return toast("Muestra los montos para exportar el CSV");
        return descargar("nova-transacciones-" + hoyArchivo() + ".csv",
          A.movimientosACsv(filasDeTodosLosEspacios("movimientos"), datos.categorias, filasDeTodosLosEspacios("cuentas")), "text/csv;charset=utf-8");
      }
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
        return descargar("nova-respaldo-" + hoyArchivo() + ".json", JSON.stringify(datosRespaldo(), null, 2), "application/json");
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
  function tablaEstadoFinanciero(destino, encabezados, filas) {
    var tabla = el("table"), cabeza = el("thead"), cuerpo = el("tbody"), cabecera = el("tr");
    encabezados.forEach(function (texto) {
      var celda = el("th", null, texto);
      celda.scope = "col";
      cabecera.append(celda);
    });
    cabeza.append(cabecera);
    filas.forEach(function (fila) {
      var tr = el("tr"), nombre = el("th", null, fila[0]);
      nombre.scope = "row";
      tr.append(nombre);
      fila.slice(1).forEach(function (texto) { tr.append(el("td", null, texto)); });
      cuerpo.append(tr);
    });
    tabla.append(cabeza, cuerpo);
    destino.append(tabla);
  }

  function abrirEstadoFinanciero() {
    if (!window.NovaInformes || !window.NovaInformes.estadoFinancieroMensual) return toast("No se pudo preparar el estado financiero");
    var ahora = new Date();
    var cuentas = datos.cuentas.map(function (c) { return { nombre: c.nombre, saldo: saldoCuenta(c) }; });
    var r = window.NovaInformes.estadoFinancieroMensual(datos.movimientos, datos.categorias, cuentas, ahora);
    var cont = $("estado-financiero-datos");
    cont.replaceChildren(el("p", null, r.mes + " · hasta el " + fechaCorta.format(ahora)));
    cont.append(el("h2", null, "Comparación mensual"));
    tablaEstadoFinanciero(cont, ["Concepto", r.mes, r.mesAnterior, "Diferencia"], r.resumen.map(function (f) {
      return [f.nombre, dinero(f.actual), dinero(f.anterior), (f.diferencia > 0 && !ocultos ? "+" : "") + dinero(f.diferencia)];
    }));
    cont.append(el("h2", null, "Top 5 categorías de gasto"));
    if (r.categorias.length) tablaEstadoFinanciero(cont, ["Categoría", "Gasto"], r.categorias.map(function (c) {
      return [c.nombre, dinero(c.total)];
    }));
    else cont.append(el("p", "nota", "Sin gastos registrados."));
    cont.append(el("h2", null, "Saldos actuales por cuenta"));
    if (r.cuentas.length) tablaEstadoFinanciero(cont, ["Cuenta", "Saldo"], r.cuentas.map(function (c) {
      return [c.nombre, dinero(c.saldo)];
    }));
    else cont.append(el("p", "nota", "Sin cuentas registradas."));
    abrirCapa("pantalla-estado-financiero");
    $("pantalla-estado-financiero").scrollTop = 0;
  }

  document.querySelectorAll("[data-estado-financiero]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (pilaCapas[pilaCapas.length - 1] === "hoja-informe") cerrarYLuego(abrirEstadoFinanciero);
      else abrirEstadoFinanciero();
    });
  });
  $("estado-financiero-imprimir").addEventListener("click", function () { window.print(); });

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
    if (editorActual && (editorActual.protegerMontos || editorActual.campos.some(function (f) { return f.clave === "minimo"; }))) {
      editorActual.campos.forEach(function (f) {
        if (f.tipo !== "plata") return;
        f.entrada.type = ocultos ? "password" : "text";
        f.entrada.disabled = ocultos;
      });
    }
    pintarInicio(); pintarPlanes(); pintarAnalisis(); pintarBuscar(); pintarAjustes(); pintarPruebasGratis(); pintarIA(); pintarConductor(); pintarDeudas(); pintarGrupos(); pintarCalendario(); pintarEspacioCabecera();
    if (!$("pantalla-tarjeta").hidden) {
      var cambioPrivacidad = $("tarjeta-deuda").type !== (ocultos ? "password" : "text");
      if (cambioPrivacidad) { pintarPrivacidadTarjeta(); limpiarResultadoTarjeta(); }
    }
    if (!$("pantalla-registro").hidden) pintarRegistro();
    if (!$("pantalla-papelera").hidden) pintarPapelera();
    if (!$("pantalla-deducibles").hidden) pintarDeducibles();
    if (!$("pantalla-categorizar-lote").hidden) pintarLoteCategorias();
    if (pilaCapas.indexOf("pantalla-detalle") >= 0) pintarDetalle(); if (deudaAbierta && pilaCapas.indexOf("pantalla-abonos") >= 0) pintarAbonos();
  }

  function alerta(e) { mensaje("rapido-mensaje", "No se pudo guardar: " + (e && e.message ? e.message : e), true); }

  // ---------- Navegación ----------
  var PRINCIPALES = ["inicio", "planes", "ia", "analisis", "buscar", "ajustes"];
  var TITULOS_CABECERA = { planes: "Planes", ia: "NOVA IA", analisis: "Análisis", buscar: "Buscar", ajustes: "Más" };
  function ir(vista) {
    if (vista === "ajustes-invitar" && (!fuente || fuente.demo)) vista = "ajustes";
    document.querySelectorAll(".vista").forEach(function (v) { v.hidden = v.dataset.vista !== vista; });
    $("pantalla-app").classList.toggle("en-inicio", vista === "inicio");
    var tituloCabecera = $("cabecera-titulo");
    tituloCabecera.textContent = TITULOS_CABECERA[vista] || "";
    tituloCabecera.hidden = !tituloCabecera.textContent;
    $("cabecera-periodo").hidden = tituloCabecera.hidden;
    if (vista !== "inicio") document.querySelector(".periodo-inicio").open = false;
    var principal = PRINCIPALES.indexOf(vista) >= 0 ? vista : vista === "trabajo" ? "inicio" : "ajustes";
    document.querySelectorAll(".nav-inferior button").forEach(function (b) {
      b.classList.toggle("activo", b.dataset.ir === principal);
      if (b.dataset.ir === principal) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    if (vista !== enVista && ["inicio", "planes", "analisis", "buscar"].indexOf(vista) >= 0) registrarEvento("pantalla", "tab_" + vista);
    enVista = vista;
    if (vista === "inicio") pintarAvisoInicio();
    actualizarFab();
    if (vista === "buscar") pintarBuscar();
    if (vista === "ia") pintarIA();
    if (vista === "ajustes-tasas") abrirTasas();
    if (vista === "ajustes-invitar") pintarInvitacion();
    window.scrollTo(0, 0);
  }
  // La entrada rápida conserva todo el ancho mientras se escribe.
  var enVista = "inicio", rapidoVisible = false;
  function actualizarFab() {
    var escribiendo = enVista === "inicio" && rapidoVisible && document.activeElement === $("entrada-rapida");
    $("btn-mas").classList.toggle("oculto", ["inicio", "analisis", "buscar", "planes"].indexOf(enVista) < 0 || escribiendo);
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e) { rapidoVisible = e[0].isIntersecting; actualizarFab(); }).observe($("form-rapido"));
  }
  $("entrada-rapida").addEventListener("focus", actualizarFab);
  $("entrada-rapida").addEventListener("blur", function () { setTimeout(actualizarFab, 0); });
  document.querySelectorAll("[data-ir]").forEach(function (b) { b.addEventListener("click", function () { ir(b.dataset.ir); }); });
  document.querySelectorAll("[data-tema]").forEach(function (b) { b.addEventListener("click", function () { aplicarTema(b.dataset.tema); }); });
  document.querySelectorAll("button[data-acento]").forEach(function (b) { b.addEventListener("click", function () { aplicarAcento(b.dataset.acento); }); });
  document.querySelectorAll("button[data-letra]").forEach(function (b) { b.addEventListener("click", function () { aplicarLetra(b.dataset.letra); }); });

  // Capas (pantallas encima de la app) y hojas. El botón Atrás de Android las cierra.
  var pilaCapas = [];
  var pilaFocos = [];
  function abrirCapa(id) {
    var c = $(id);
    if (pilaCapas.indexOf(id) >= 0) return;
    pilaCapas.push(id);
    registrarEvento("pantalla", id.replace(/^(pantalla|hoja)-/, ""));
    pilaFocos.push(document.activeElement);
    c.hidden = false;
    document.body.classList.add("con-capa");
    history.pushState({ capa: id }, "");
    if (!c.classList.contains("capa")) return;
    var titulo = $(c.getAttribute("aria-labelledby"));
    titulo.focus({ preventScroll: true });
    var foco = c.querySelector("input:not([type=checkbox]):not([type=date]), textarea");
    if (foco && id !== "pantalla-dueno" && id !== "pantalla-registro" && id !== "pantalla-detalle" && id !== "pantalla-abonos") {
      setTimeout(function () {
        if (pilaCapas[pilaCapas.length - 1] === id && document.activeElement === titulo) foco.focus({ preventScroll: true });
      }, 30);
    }
  }
  function ocultarCapa() {
    var id = pilaCapas.pop();
    var foco = pilaFocos.pop();
    if (id) $(id).hidden = true;
    if (id === "hoja-respaldo") limpiarClaveRespaldo();
    if (id === "pantalla-dueno") {
      detenerRelojDueno();
      cerrarEtiquetaDueno();
      cerrarAyudaDueno();
      if ($("dueno-ficha").open) $("dueno-ficha").close();
    }
    if (!pilaCapas.length) document.body.classList.remove("con-capa");
    if (foco && foco.isConnected && !foco.closest("[hidden], [inert]")) foco.focus({ preventScroll: true });
  }
  function cerrarCapa() { if (pilaCapas.length) history.back(); }
  window.addEventListener("popstate", function () { if (pilaCapas.length) ocultarCapa(); });
  document.querySelectorAll("[data-cerrar]").forEach(function (b) { b.addEventListener("click", cerrarCapa); });
  document.querySelectorAll(".hoja-fondo").forEach(function (f) { f.addEventListener("click", function (e) { if (e.target === f) cerrarCapa(); }); });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || e.defaultPrevented || e.isComposing || e.repeat || !pilaCapas.length) return;
    if (document.querySelector("dialog[open]") || !$("bloqueo").hidden) return;
    e.preventDefault();
    cerrarCapa();
  });
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
  $("btn-repetir-ultimo").addEventListener("click", function () {
    var ultimo = A.ultimoGasto(datos.movimientos);
    if (ultimo) abrirRegistro({ repetir: ultimo });
  });
  var reg = null;
  function abrirRegistro(o) {
    o = o || {};
    var m = o.movimiento || o.repetir;
    var categoriaId = m ? m.categoria_id : o.categoriaId;
    var usaMontoOriginal = m && m.moneda && m.moneda !== monedaBase() && num(m.monto_original) > 0;
    var monedaRepetida = o.repetir && usaMontoOriginal && num(m.tasa) > 0;
    reg = {
      editar: o.movimiento || null,
      via: o.repetir ? "rapido" : "manual",
      tipo: m ? m.tipo : o.tipo || "gasto",
      expr: m ? textoMonto((o.repetir ? monedaRepetida : usaMontoOriginal) ? num(m.monto_original) : num(m.monto)) : (o.expr || ""),
      categoriaId: categoriaId != null && (!o.repetir || categoria(categoriaId)) ? categoriaId : null,
      documentoId: o.documentoId || null,
      etiquetas: o.movimiento || o.duplicar ? (m.etiquetas || []).slice() : [],
      moneda: m && m.moneda && (!o.repetir || monedaRepetida) ? m.moneda : monedaBase(),
      tasa: m && m.tasa ? Number(m.tasa) : null,
      tasaAuto: null, tasaFecha: "", tasaEditada: !!(m && m.tasa)
    };
    if (monedaRepetida) {
      reg.copManual = num(m.monto);
      reg.copExpr = reg.expr;
      reg.copTasa = reg.tasa;
    }
    var editado = reg.editar;
    $("reg-fecha").value = A.claveDia(editado ? editado.fecha : new Date());
    $("reg-desc").value = m ? m.descripcion : (o.desc || "");
    pintarSugerencias();
    $("reg-viajes").value = (editado || o.duplicar) && m.viajes ? m.viajes : "";
    $("reg-nota").value = (editado || o.duplicar) && m.nota ? m.nota : "";
    $("reg-estado").value = (editado || o.duplicar) && m.estado ? m.estado : "pagado";
    $("reg-etiqueta").value = "";
    var freq = $("reg-frecuencia");
    freq.replaceChildren();
    Object.keys(A.FRECUENCIAS).forEach(function (f) { var op = el("option", null, A.FRECUENCIAS[f]); op.value = f; op.selected = f === "mensual"; freq.append(op); });
    $("reg-bloque-estado").hidden = !((editado || o.duplicar) && m.estado === "pendiente");
    $("reg-bloque-nota").hidden = !((editado || o.duplicar) && m.nota);
    $("reg-bloque-recurrente").hidden = !o.recurrente;
    $("reg-btn-recurrente").hidden = !!editado;
    $("reg-otro-fila").hidden = !!editado;
    reg.tanda = o.tanda || 0;
    $("reg-otro").checked = !!o.tandaActiva;
    $("reg-tanda").hidden = !reg.tanda;
    $("reg-tanda").textContent = reg.tanda ? "Llevas " + reg.tanda + " en esta tanda" : "";
    $("reg-borrar").hidden = $("reg-duplicar").hidden = !editado;
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

  // Tasas de cambio (base USD): se guardan en el celular.
  // La fuente gratis publica tasas nuevas una vez al día; la app las vuelve a pedir cada 30 minutos (y al abrir, al volver
  // a la app o al volver el internet) para tenerlas al día apenas salgan. "forzar" pide ya mismo (máximo una vez por minuto).
  var TTL_TASAS = 30 * 60000;
  async function pedirJSONTasas(url) {
    var controlador = new AbortController();
    var tiempo = setTimeout(function () { controlador.abort(); }, 8000);
    try {
      var respuesta = await fetch(url, { signal: controlador.signal });
      if (!respuesta.ok) throw new Error("tasas");
      return await respuesta.json();
    } finally {
      clearTimeout(tiempo);
    }
  }
  function cargarTasas(forzar) {
    var g = leerLocal("nova-tasas", null), tiene = g && g.rates;
    if (!enLinea()) return Promise.resolve(tiene ? g : null);
    // Tasas de un día anterior: se vuelven a pedir aunque no hayan pasado 30 minutos, pero máximo cada 10 minutos
    // (si la fuente misma aún no publica las de hoy, no se le pide en cada pantalla).
    var anterior = tiene && /^\d{4}-\d{2}-\d{2}$/.test(g.fecha) && g.fecha < hoyLocal() && Date.now() - g.guardado >= 10 * 60000;
    if (tiene && !anterior && Date.now() - g.guardado < (forzar ? 60000 : TTL_TASAS)) return Promise.resolve(g);
    var porFawaz = async function (url) {
      var tasas = Mon.normalizarFawaz(await pedirJSONTasas(url));
      if (!tasas) throw new Error("tasas");
      return { rates: tasas.rates, fecha: tasas.fecha, fuente: "fawaz" };
    };
    var directo = function () {
      return porFawaz("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json")
        .catch(function () { return porFawaz("https://latest.currency-api.pages.dev/v1/currencies/usd.min.json"); })
        .catch(async function () {
          var d = await pedirJSONTasas("https://open.er-api.com/v6/latest/USD");
          if (d.result !== "success" || !d.rates) throw new Error("tasas");
          return { rates: d.rates, fecha: d.time_last_update_utc, fuente: "er-api" };
        });
    };
    var porFuncion = function () {
      return cliente.functions.invoke("nova-ia", { body: { tasas: true } }).then(function (res) { if (res.error || !res.data || !res.data.rates) throw new Error("tasas"); return res.data; });
    };
    var origen = directo().catch(async function (error) {
      if (!cliente || !fuente || fuente.demo) throw error;
      var d = await porFuncion();
      return { rates: d.rates, fecha: d.fecha, fuente: "funcion" };
    });
    var pedidoTRM = pedirJSONTasas("https://www.datos.gov.co/resource/32sa-8pi3.json?$order=vigenciadesde%20DESC&$limit=1")
      .catch(function () { return null; });
    return Promise.all([origen, pedidoTRM]).then(function (resultados) {
      var d = resultados[0], trm = Mon.leerTRM(resultados[1], new Date());
      var t = { rates: Mon.aplicarTRM(d.rates, trm), fecha: d.fecha || "", fuente: d.fuente, trm: trm, guardado: Date.now() };
      if (guardarLocal("nova-tasas", t) && fuente && !$("pantalla-app").hidden &&
          JSON.stringify(g && g.trm || null) !== JSON.stringify(trm)) pintarWidgets($("widgets-inicio"), true);
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
    if (!t) {
      $("tasas-fecha").textContent = "No pude descargar las tasas. Sin internet no hay tasas guardadas todavía.";
      return;
    }
    var cuando = t.guardado ? new Date(t.guardado) : null;
    var fecha = Mon.fechaTasaTexto(t.fecha);
    var nombreFuente = { fawaz: "Fawaz Currency API", "er-api": "ExchangeRate-API", funcion: "función de Supabase" }[t.fuente];
    var textoTRM = "";
    if (t.trm) {
      var valor = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(t.trm.valor);
      textoTRM = " · Dólar con la TRM oficial de " + valor + " (vigente del " + Mon.fechaTasaTexto(t.trm.desde) + " al " + Mon.fechaTasaTexto(t.trm.hasta) + ")";
    }
    $("tasas-fecha").textContent = "Tasas" + (fecha ? " del " + fecha : "") + (nombreFuente ? " · " + nombreFuente : "") + textoTRM
      + (cuando ? " · revisadas " + (A.claveDia(cuando) === hoyLocal() ? "hoy " : "el " + Mon.fechaTasaTexto(A.claveDia(cuando)) + " ") + "a las " + hora.format(cuando) : "")
      + " — la app las vuelve a revisar sola cada 30 minutos y, sin internet, usa las últimas guardadas.";
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
    $("conv-de").setAttribute("aria-label", "Moneda de origen: " + conv.de);
    $("conv-a").setAttribute("aria-label", "Moneda de destino: " + conv.a);
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
    $("reg-montos-rapidos").hidden = !!reg.editar;
    $("reg-monto-texto").textContent = ocultos && reg.expr ? "••••" : formatearExpr(reg.expr);
    var v = A.evaluar(reg.expr), ext = reg.moneda !== monedaBase(), mi = Mon.info(reg.moneda), mb = Mon.info(monedaBase());
    $("reg-resultado").textContent = !ocultos && /[+\-×÷−]/.test(reg.expr.replace(/^-/, "")) ? (isNaN(v) ? "…" : "= " + (ext ? Mon.formatoMonto(v, reg.moneda) : pesos.format(v))) : "";
    $("reg-moneda-bandera").textContent = mi.bandera; $("reg-moneda-codigo").textContent = mi.codigo;
    $("reg-monto").querySelector("span").textContent = ext ? mi.codigo : monedaBase() === "COP" ? "$" : monedaBase();
    $("reg-moneda").classList.toggle("activo", ext);
    $("reg-bloque-moneda").hidden = !ext;
    if (ext) {
      var copCalc = v > 0 && reg.tasa > 0 ? pesosDelRegistro(v) : null;
      $("reg-conversion").textContent = ocultos ? "" : copCalc != null ? Mon.formatoMonto(v, reg.moneda) + " = " + pesos.format(copCalc) + " " + mb.codigo : "Escribe cuánto es en " + mi.nombre.toLowerCase() + " o en " + mb.nombre.toLowerCase() + ": el otro valor se calcula solo.";
      $("reg-orig-etiqueta").textContent = "Valor en " + mi.nombre.toLowerCase() + " (" + mi.codigo + ")";
      $("reg-orig").type = $("reg-cop").type = ocultos ? "password" : "text";
      if (document.activeElement !== $("reg-orig")) $("reg-orig").value = v > 0 ? formatearExpr(/[+\-×÷−]/.test(reg.expr.replace(/^-/, "")) ? textoMonto(v) : reg.expr) : "";
      if (document.activeElement !== $("reg-cop")) $("reg-cop").value = copCalc != null ? numeroCO.format(copCalc) : "";
      $("reg-tasa-auto").hidden = !(reg.tasaAuto && reg.tasa && Math.abs(reg.tasa - reg.tasaAuto) > 1e-9);
      $("reg-tasa-etiqueta").textContent = "Tasa: 1 " + reg.moneda + " = ? " + mb.codigo;
      $("reg-cop-etiqueta").textContent = "Equivale en " + mb.nombre.toLowerCase() + " (" + mb.codigo + ")";
      if (document.activeElement !== $("reg-tasa")) $("reg-tasa").value = reg.tasa ? Mon.formatoTasa(reg.tasa) : "";
      $("reg-tasa-nota").textContent = reg.tasa && reg.tasaAuto && Math.abs(reg.tasa - reg.tasaAuto) < 1e-9 ? "Tasa del día" + (reg.tasaFecha ? " · " + Mon.fechaTasaTexto(reg.tasaFecha) : "")
        : reg.tasaAuto ? "Tasa del día: " + Mon.formatoTasa(reg.tasaAuto) + " (la cambiaste)"
        : reg.tasa ? "Tasa escrita por ti" : "No pude consultar la tasa del día: escríbela a mano.";
    }
    $("reg-desc").placeholder = reg.tipo === "ingreso" ? "¿De dónde proviene?" : "¿En qué gastaste?";
    var c = reg.categoriaId != null ? categoria(reg.categoriaId) : null;
    if (c && c.tipo !== reg.tipo) { reg.categoriaId = null; c = null; }
    pintarIcono($("reg-cat-icono"), c || { icono: "otro", color: "#64748b" });
    $("reg-bloque-viajes").hidden = !A.esGanancia(c);
    $("reg-cat-nombre").textContent = c ? c.nombre : "Seleccionar categoría";
    $("reg-bloque-deducible").hidden = reg.tipo !== "gasto";
    $("reg-deducible").value = A.tipoDeducible(reg.etiquetas);
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
  llenarTiposDeducibles($("reg-deducible"));
  $("reg-deducible").addEventListener("change", function () {
    reg.etiquetas = A.etiquetasDeducible(reg.etiquetas, this.value);
    pintarRegistro();
  });
  $("reg-monto").addEventListener("click", function () { $("teclado").hidden = false; });
  document.querySelectorAll("[data-monto-rapido]").forEach(function (b) {
    b.addEventListener("click", function () {
      reg.expr = A.sumarMontoRapido(reg.expr, Number(b.dataset.montoRapido));
      pintarRegistro();
    });
  });
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
    pintarSugerencias();
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
    if ($("reg-guardar").disabled) return;
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
    var registro = reg, editar = reg.editar, otro = $("reg-otro").checked, docId = reg.documentoId;
    var uso = usoActivoEventos();
    conCategoria.then(function (c) {
      var fila = {
        cuenta_id: Number($("reg-cuenta").value) || datos.cuentas[0].id, categoria_id: c.id, tipo: reg.tipo,
        descripcion: $("reg-desc").value.trim() || c.nombre, monto: monto, fecha: fecha.toISOString(),
        etiquetas: reg.tipo === "gasto" ? reg.etiquetas : A.etiquetasDeducible(reg.etiquetas, ""), estado: $("reg-estado").value, nota: $("reg-nota").value.trim() || null,
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
      if (!editar && r.m) registrarEventoDe(uso, "anotar", registro.via);
      ordenarMovimientos();
      var redondeo = !editar && r.m && r.m.tipo === "gasto" ? sumarAlcancia(num(r.m.monto)) : 0;
      if (docId) renovarDocumentoListo(docId);
      var accion = !editar && r.m ? deshacerRegistro(r.m, redondeo) : null;
      var etiquetaDesc = r.m ? r.m.descripcion : r.programado.descripcion;
      var detalle = etiquetaDesc + (r.m && r.m.viajes ? " · " + r.m.viajes + (r.m.viajes === 1 ? " viaje" : " viajes") : "") +
        (r.programado ? " · 🔁 " + A.FRECUENCIAS[r.programado.frecuencia].toLowerCase() : "");
      var valor = dinero(monto) + (ext && !ocultos ? " · " + Mon.formatoMonto(montoOriginal, reg.moneda) : "");
      toast(editar ? "¡Cambios guardados!" : "¡Guardado!", detalle, valor, accion, !!r.m);
      pintar();
      if (!editar && r.m && r.m.tipo === "gasto") avisarGastoAlto(r.m);
      if (accion) {
        var origen = fuente, espacio = espacioId;
        setTimeout(function () {
          if (fuente !== origen || espacioId !== espacio || accion.borrando || datos.movimientos.indexOf(r.m) < 0) return;
          if (r.m.tipo === "ingreso") proponerApartar(r.m);
          else {
            var hubo = alertaLimites(r.m.categoria_id), raro = NovaConsejos.gastoInusual(r.m, datos.movimientos);
            if (raro) setTimeout(function () { toast("Gasto fuera de lo normal", r.m.descripcion, Math.round(raro.veces * 10) / 10 + "× lo habitual"); }, hubo ? 7000 : 0);
          }
        }, accion.duracion);
      }
      if (reg !== registro || pilaCapas[pilaCapas.length - 1] !== "pantalla-registro") return;
      if (otro && !editar) {
        abrirRegistro({ tipo: registro.tipo, tandaActiva: true, tanda: registro.tanda + (r.m ? 1 : 0) });
        $("reg-monto").focus();
      } else cerrarCapa();
    }).catch(function (err) { mensaje("reg-mensaje", "No se pudo guardar: " + err.message, true); })
      .finally(function () { btn.disabled = false; });
  });
  function deshacerRegistro(m, redondeo) {
    var origen = fuente, espacio = espacioId, clave = claveAlcancia();
    var accion = { texto: "Deshacer", duracion: 5000, confirmar: function () {
      return confirm("¿Deshacer el movimiento «" + m.descripcion + "»?");
    }, fn: function () {
      if (fuente !== origen || espacioId !== espacio || datos.movimientos.indexOf(m) < 0) return;
      accion.borrando = true;
      borrarMovimientos([m.id]).then(function () {
        if (redondeo) guardarLocal(clave, Math.max(0, leerLocal(clave, 0) - redondeo));
        toast("Movimiento deshecho");
        pintar();
      }).catch(function (err) { toast("No se pudo deshacer: " + err.message); });
    } };
    return accion;
  }
  function duplicarMovimiento(m) {
    cerrarYLuego(function () { abrirRegistro({ repetir: m, duplicar: true }); });
  }
  $("reg-duplicar").addEventListener("click", function () {
    if (reg && reg.editar) duplicarMovimiento(reg.editar);
  });
  $("reg-borrar").addEventListener("click", function () {
    confirmarBorradoMovimiento(reg && reg.editar, "pantalla-registro", this);
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
    confirmarBorradoMovimiento(datos.movimientos.find(function (x) { return x.id === detalleId; }), "pantalla-detalle", this);
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
      var r = A.saldosGrupo(g.miembros, gastosDelGrupo(g), true), yo = r.saldos.Yo || 0;
      var li = el("li", "mov"), txt = el("div", "mov-texto");
      txt.append(el("strong", null, g.nombre), el("small", null, g.miembros.join(", ")));
      var est = el("span", "mov-monto" + (yo >= 0 ? " positivo" : ""), ocultos ? dinero(0) : yo === 0 ? "A mano" : (yo > 0 ? "Te deben " : "Debes ") + dinero(Math.abs(yo)));
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
    $("grupo-compartir").disabled = ocultos;
    var gastos = gastosDelGrupo(g).sort(function (a, b) { return String(b.fecha).localeCompare(String(a.fecha)) || b.id - a.id; });
    var r = A.saldosGrupo(g.miembros, gastos, ocultos);
    var caja = $("grupo-balance"); caja.replaceChildren();
    caja.append(el("span", "etiqueta", "Total gastado en el grupo"), el("strong", "saldo-valor", dinero(r.total)),
      el("h2", null, "Cuánto ha puesto cada persona y cuánto le toca"));
    var cuentas = el("ul", "lista-simple");
    r.filas.forEach(function (f) {
      var v = f.saldo, fila = el("li");
      var balance = ocultos ? dinero(0) : v === 0 ? "a mano" : (v > 0 ? "le deben " : "debe ") + dinero(Math.abs(v));
      fila.append(el("strong", null, f.nombre),
        el("div", "nota", "Pagó " + dinero(f.pagado) + " · Le toca " + dinero(f.parte) + " · Saldo: " + balance));
      cuentas.append(fila);
    });
    caja.append(cuentas);
    if (!ocultos && r.transferencias.length) {
      caja.append(el("strong", null, "Para quedar a mano"));
      r.transferencias.forEach(function (t) {
        var fila = el("div", "meta-abono");
        fila.append(el("span", null, t.de + " le paga " + dinero(t.monto) + " a " + t.a));
        var b = el("button", "mini", "✓ Ya pagó"); b.type = "button";
        b.addEventListener("click", function () {
          b.disabled = true;
          fuente.crear("gastos_grupo", { grupo_id: g.id, tipo: "pago", descripcion: "Pago de " + t.de + " a " + t.a, monto: t.monto, pagador: t.de, repartido: [t.a], fecha: A.claveDia(new Date()) })
            .then(function (n) { datos.gastos_grupo.push(n); toast("¡Pago anotado!", t.de + " → " + t.a, pesos.format(t.monto)); pintar(); })
            .catch(function (err) { b.disabled = false; mensaje("gg-mensaje", "No se pudo anotar: " + err.message, true); });
        });
        fila.append(b); caja.append(fila);
      });
    } else if (!ocultos && gastos.length) caja.append(el("span", "nota", "✅ Todos están a mano."));
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
      li.append(txt, el("span", "mov-monto", dinero(num(x.monto))));
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
    if (ocultos) return;
    var g = grupoAbierto(); if (!g) return;
    var r = A.saldosGrupo(g.miembros, gastosDelGrupo(g));
    var lineas = ["Cuentas de «" + g.nombre + "» · total " + dinero(r.total)];
    if (r.transferencias.length) r.transferencias.forEach(function (t) { lineas.push("• " + t.de + " le paga " + dinero(t.monto) + " a " + (t.a === "Yo" ? "mí" : t.a)); });
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
  function filasDeTodosLosEspacios(tabla) {
    return todosLosDatos()[tabla].filter(function (f) {
      return (f.espacio_id == null ? null : f.espacio_id) !== espacioId;
    }).concat(datos[tabla]);
  }
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
  var NOVEDADES_VERSION = window.NovaNovedades.VERSION;
  var NOVEDADES = window.NovaNovedades.PAGINAS;
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
      n.iconos.forEach(function (x, i) { var s = el("span", null, x); s.style.background = ["#2ee06f", "#6d5bd0", "#f59e0b", "#1d7bf0"][i]; fila.append(s); });
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
    $("cuadrar-anotar").setAttribute("aria-label", $("cuadrar-anotar").textContent);
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
  document.querySelector(".saldo-titulo").addEventListener("click", function () { $("saldo-cuentas").click(); });

  // ---------- Anotar mensajes del banco (app Android) ----------
  // La persona comparte un mensaje del banco con NOVA (mantener presionado el mensaje → Compartir → NOVA). Android deja
  // el texto en una lista (Preferences «nova-banco», la llena MainActivity) y aquí se revisa: nada se guarda hasta que
  // toca «Anotar» y luego «Guardar». NOVA no lee notificaciones ni mensajes por su cuenta (Google Play Protect bloquea
  // las apps instaladas a mano que piden ese permiso). Los ya revisados se recuerdan en este celular («nova-banco-listos»).
  var plugPref = enApp && window.Capacitor.Plugins && window.Capacitor.Plugins.Preferences;
  // Solo la APK «avanzada» (aparte, para quien la instala a propósito) trae el puente NovaBanco: además lee los avisos del banco.
  var plugBanco = enApp && window.Capacitor.Plugins && window.Capacitor.Plugins.NovaBanco;
  var bancoCola = [], bancoPermiso = null, abrirBancoAlEntrar = false, bancoEnCurso = null;
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
      plugPref.get({ key: "nova-banco-abrir" }).catch(function () { return null; }),
      plugBanco ? plugBanco.estado().catch(function () { return null; }) : Promise.resolve(null)
    ]).then(function (res) {
      bancoPermiso = !!(res[2] && res[2].permiso);
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
    var activo = leerLocal("nova-banco-activo", true) !== false;
    $("banco-avanzado").hidden = !plugBanco;
    $("banco-no-lee").hidden = !!plugBanco;
    $("banco-activo").checked = !!bancoPermiso && activo;
    $("banco-aviso").checked = leerLocal("nova-banco-aviso", true) !== false;
    $("banco-aviso").disabled = !bancoPermiso || !activo;
    $("banco-estado").textContent = plugBanco && !bancoPermiso ? "Falta dar el permiso de Android" : n ? n + " por anotar" : "Cómo compartir un mensaje con NOVA";
    if (pilaCapas.indexOf("pantalla-banco") >= 0) pintarListaBanco();
  }
  function pintarListaBanco() {
    $("banco-permiso-tarjeta").hidden = !plugBanco || !!bancoPermiso;
    $("banco-ayuda").hidden = !!(plugBanco && bancoPermiso);
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
  function guardarPreferencia(clave, valor) { if (plugPref) plugPref.set({ key: clave, value: valor }).catch(function () { /* se intenta la próxima vez */ }); }
  $("banco-dar-permiso").addEventListener("click", function () {
    toast("Busca NOVA y actívalo", "Luego vuelve con Atrás");
    if (plugBanco) plugBanco.abrirAjustes().catch(function () { toast("No se pudo abrir", "Ve a Ajustes → Notificaciones → Acceso a notificaciones"); });
  });
  $("banco-info-app").addEventListener("click", function () { if (plugBanco) plugBanco.abrirInfoApp().catch(function () { /* nada */ }); });
  $("banco-activo").addEventListener("change", function (e) {
    var si = e.target.checked;
    guardarLocal("nova-banco-activo", si);
    guardarPreferencia("nova-banco-activo", si ? "si" : "no");
    // Android no deja que una app se dé este permiso sola: se abre directo la pantalla donde la persona lo activa.
    if (si && !bancoPermiso) { abrirBanco(); toast("Busca NOVA y actívalo", "Luego vuelve con Atrás"); if (plugBanco) plugBanco.abrirAjustes().catch(function () { /* queda el botón Dar el permiso */ }); }
    pintarBanco();
  });
  $("banco-aviso").addEventListener("change", function (e) {
    guardarLocal("nova-banco-aviso", e.target.checked);
    guardarPreferencia("nova-banco-aviso", e.target.checked ? "si" : "no");
  });
  // Al tocar el aviso «¿Lo anoto en NOVA?» (versión avanzada) la app se abre con el enlace co.novafinanzas.app://banco.
  if (plugBanco && window.Capacitor.Plugins.App) {
    var esEnlaceBanco = function (u) { return /^co\.novafinanzas\.app:\/\/banco/.test(String(u || "")); };
    window.Capacitor.Plugins.App.addListener("appUrlOpen", function (ev) { if (esEnlaceBanco(ev && ev.url)) abrirBanco(); });
    if (window.Capacitor.Plugins.App.getLaunchUrl) window.Capacitor.Plugins.App.getLaunchUrl().then(function (r) { if (r && esEnlaceBanco(r.url)) abrirBanco(); }).catch(function () { /* se abrió normal */ });
  }
  var gastoPendiente = false, inicioListoParaGasto = false, cerrandoCapasParaGasto = false;
  var ultimoEnlaceGasto = "", horaUltimoEnlaceGasto = 0;
  function pedirNuevoGasto() {
    gastoPendiente = true;
    abrirGastoPendiente();
  }
  function abrirGastoPendiente() {
    try {
      if (!gastoPendiente || cerrandoCapasParaGasto) return;
      if (fuente && fuente.demo) { gastoPendiente = false; return; }
      if (!inicioListoParaGasto || !fuente || !$("pantalla-auth").hidden || $("pantalla-app").hidden) return;
      revisarInactividad();
      if (!$("bloqueo").hidden) return;
      if (pilaCapas.length) {
        cerrarYLuego(function () {
          cerrandoCapasParaGasto = false;
          abrirGastoPendiente();
        });
        cerrandoCapasParaGasto = true;
        return;
      }
      gastoPendiente = false;
      $("tutorial").hidden = true;
      $("novedades").hidden = true;
      abrirRegistro({ tipo: "gasto" });
    } catch (e) { /* el atajo es opcional */ }
  }
  function recibirEnlaceGasto(ev) {
    try {
      var url = ev && ev.url;
      if (!window.NovaEnlaces.esEnlaceNuevoGasto(url)) return;
      var ahora = Date.now();
      if (url === ultimoEnlaceGasto && ahora - horaUltimoEnlaceGasto < 2000) return;
      ultimoEnlaceGasto = url;
      horaUltimoEnlaceGasto = ahora;
      pedirNuevoGasto();
    } catch (e) { /* el atajo es opcional */ }
  }
  try {
    var appAtajos = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (appAtajos) {
      Promise.resolve(appAtajos.addListener("appUrlOpen", recibirEnlaceGasto)).catch(function () {});
      if (appAtajos.getLaunchUrl) Promise.resolve(appAtajos.getLaunchUrl()).then(recibirEnlaceGasto).catch(function () {});
    }
  } catch (e) { /* el puente nativo puede no estar disponible */ }
  document.addEventListener("visibilitychange", function () { if (!document.hidden && fuente && !fuente.demo) revisarBanco(); });

  // ---------- Panel del dueño ----------
  // Solo la cuenta del dueño ve el botón; el servidor (función nova-dueno) también lo revisa antes de mostrar algo.
  // Además, una vez al día la app anota en la cuenta de cada persona cuándo la abrió, si fue en Android o en el
  // navegador y qué versión tiene (sin datos de su plata), para que el dueño sepa cuánta gente la usa.
  var DUENOS = ["e84fedff-8279-4a12-9ff7-4992dae4cbbf", "92bfcc78-ebac-47ab-8171-2683d624c721"];
  function idUsuario() { return (leerLocal("nova-identidad", {}) || {}).id || ""; }
  function soyDueno() { return !!fuente && !fuente.demo && (DUENOS.indexOf(fuente.usuarioEventos) >= 0 || fuente.novaAdmin === true); }
  var Nube = window.NovaNube;
  var plataformaNova = enApp ? "android" : "web";
  var versionNova;
  var avisosNube = [];
  var avisosVistos = leerLocal("nova-avisos-vistos", []);
  var registrosAviso = new Map();
  var observadorAviso;
  var encuestaInicio = null;
  var erroresEnviados = [];
  var archivosNova = Array.from(document.scripts).filter(function (script) {
    return script.src && new URL(script.src).origin === location.origin;
  }).map(function (script) { return new URL(script.src).pathname.split("/").pop(); });

  // ---------- Estadísticas de uso ----------
  var Eventos = window.NovaEventos;
  var usoEventos = null;
  var permitirEventos = leerLocal("nova-eventos-activo", true) !== false;
  // Si se muestra el login primero, se conserva la medición en memoria hasta entrar con una cuenta.
  var cargaInicial;
  $("uso-activo").checked = permitirEventos;
  $("uso-activo").addEventListener("change", function () {
    guardarLocal("nova-eventos-activo", this.checked);
    cambiarPermisoEventos(this.checked);
  });
  window.addEventListener("storage", function (e) {
    if (e.key === "nova-eventos-activo" || e.key === null) cambiarPermisoEventos(leerLocal("nova-eventos-activo", true) !== false);
  });
  function cambiarPermisoEventos(permitido) {
    $("uso-activo").checked = permitido;
    if (permitirEventos === permitido) return;
    permitirEventos = permitido;
    if (!permitido) { cargaInicial = null; reiniciarEventos(); }
    else if (fuente && !$("pantalla-app").hidden) iniciarEventos();
  }

  function reiniciarEventos() {
    if (usoEventos) usoEventos.control.abort();
    usoEventos = null;
  }
  function iniciarEventos() {
    if (!Eventos || !permitirEventos || !cliente || !fuente || fuente.demo || !fuente.usuarioEventos) return;
    var uso = usoEventos = { origen: fuente, inicio: document.hidden ? null : performance.now(), cola: [], ajustes: false,
      control: new AbortController(), version: "" };
    versionParaNube().then(function (v) { uso.version = String(v).slice(0, 20); }).catch(function () {});
  }
  function usoActivoEventos() {
    return usoEventos && permitirEventos && usoEventos.origen === fuente ? usoEventos : null;
  }
  function registrarEventoDe(uso, tipo, nombre, valor) {
    if (!uso || uso !== usoActivoEventos()) return;
    uso.cola = Eventos.encolar(uso.cola, Eventos.eventoSeguro(tipo, nombre, valor));
  }
  function registrarEvento(tipo, nombre, valor) {
    registrarEventoDe(usoActivoEventos(), tipo, nombre, valor);
  }
  function medirCargaInicial() {
    if (cargaInicial !== undefined) return;
    cargaInicial = null;
    var reloj = window.performance;
    if (!Eventos || !permitirEventos || !reloj || typeof reloj.now !== "function") return;
    var navegacion = typeof reloj.getEntriesByType === "function" && reloj.getEntriesByType("navigation")[0];
    var inicio = navegacion && Number.isFinite(navegacion.startTime) ? navegacion.startTime : 0;
    var ms = reloj.now() - inicio;
    if (Number.isFinite(ms) && ms >= 0) cargaInicial = Eventos.decimasRespuesta(ms);
  }
  function registrarAjustesUso(uso) {
    if (uso.ajustes) return;
    uso.ajustes = true;
    var tema = document.documentElement.getAttribute("data-theme");
    var oscuro = tema !== "claro" && !(tema === "sistema" && window.matchMedia("(prefers-color-scheme: light)").matches);
    registrarEventoDe(uso, "ajuste", oscuro ? "tema_oscuro" : "tema_claro");
    registrarEventoDe(uso, "ajuste", leerPin() ? "pin_on" : "pin_off");
    registrarEventoDe(uso, "ajuste", conductor() ? "modo_conductor_on" : "modo_conductor_off");
  }
  function enviarEventos() {
    var uso = usoActivoEventos();
    if (!uso || !uso.cola.length || uso.enviando) return;
    registrarAjustesUso(uso);
    uso.enviando = true;
    cliente.auth.getSession().then(function (r) {
      if (uso !== usoActivoEventos()) return;
      var sesion = r.data && r.data.session;
      var lotes = Eventos.lotesParaEnviar(uso.cola);
      uso.cola = [];
      if (!sesion || !sesion.user || sesion.user.id !== uso.origen.usuarioEventos) {
        uso.ajustes = false;
        return;
      }
      var version = uso.version;
      return Promise.all(lotes.map(function (lote) {
        var filas = lote.map(function (evento) {
          return Object.assign({}, evento, { plataforma: plataformaNova, version: version });
        });
        return Promise.resolve(cliente.from("fin_eventos").insert(filas).abortSignal(uso.control.signal)).catch(function () {});
      }));
    }).catch(function () { uso.cola = []; }).finally(function () {
      uso.enviando = false;
      if (uso === usoActivoEventos() && (document.hidden || uso.inicio === null) && uso.cola.length) enviarEventos();
    });
  }
  function pausarEventos() {
    var uso = usoActivoEventos();
    if (!uso) return;
    if (uso.inicio !== null) {
      var segundos = Math.floor((performance.now() - uso.inicio) / 1000);
      uso.inicio = null;
      if (segundos >= 5 && segundos < 86400) registrarEventoDe(uso, "sesion", "duracion", segundos);
    }
    registrarAjustesUso(uso);
    enviarEventos();
  }
  function reanudarEventos() {
    var uso = usoActivoEventos();
    if (uso && !document.hidden && uso.inicio === null) uso.inicio = performance.now();
  }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) pausarEventos();
    else reanudarEventos();
  });
  window.addEventListener("pagehide", pausarEventos);
  window.addEventListener("pageshow", reanudarEventos);
  setInterval(enviarEventos, 5 * 60 * 1000);

  function versionParaNube() {
    if (!versionNova) {
      versionNova = enApp ? fetch("version-app.json").then(function (r) { return r.json(); })
        .then(function (v) { return (v && v.versionName) || ""; }).catch(function () { return ""; }) : Promise.resolve("");
    }
    return versionNova;
  }

  function conSesionNube(origen, tarea) {
    if (!cliente || !origen || origen !== fuente || origen.demo) return Promise.resolve(null);
    var id = idUsuario();
    return cliente.auth.getSession().then(function (r) {
      var s = r.data && r.data.session;
      if (origen !== fuente || !s || !s.user || s.user.id !== id) return null;
      return tarea(s);
    });
  }

  function registrarErrorNube(texto, archivo, linea, rechazo) {
    var origen = fuente;
    if (!cliente || !origen || origen.demo || erroresEnviados.length >= 5) return;
    Promise.resolve().then(function () {
      var error = Nube.errorSeguro(texto, archivo, linea, rechazo, archivosNova);
      return versionParaNube().then(function (version) {
        return conSesionNube(origen, function () {
          if (!Nube.puedeRegistrarError(erroresEnviados, error.mensaje)) return;
          erroresEnviados.push(error.mensaje);
          error.version = version;
          error.plataforma = plataformaNova;
          return cliente.from("fin_errores").insert(error);
        });
      });
    }).catch(function () { /* Un fallo de registro no afecta el uso de NOVA. */ });
  }

  window.addEventListener("error", function (e) {
    registrarErrorNube(e.message, e.filename, e.lineno, false);
  });
  window.addEventListener("unhandledrejection", function (e) {
    try {
      var razon = e.reason;
      var error = razon instanceof Error;
      var lugar = error && typeof razon.stack === "string" &&
        razon.stack.split("\n").slice(1).join("\n").match(/\/(\w[\w.-]*\.js):(\d+):\d+/);
      registrarErrorNube(error ? razon.name + ":" : razon, lugar && lugar[1], lugar && Number(lugar[2]), true);
    } catch (e) { /* Algunas promesas rechazan con objetos que no se pueden leer. */ }
  });

  function registrarAvisoVisto(avisoId) {
    var origen = fuente;
    if (!origen || origen.demo || enVista !== "inicio" || document.hidden || $("pantalla-app").hidden) return;
    var clave = "nova-aviso-registrado:" + idUsuario() + ":" + avisoId;
    if (registrosAviso.has(clave) || leerLocal(clave, false)) return;
    registrosAviso.set(clave, true);
    conSesionNube(origen, function () {
      return cliente.from("fin_avisos_vistos").insert({ aviso_id: avisoId });
    }).then(function (r) {
      if (r && (!r.error || r.error.code === "23505")) guardarLocal(clave, true);
      else registrosAviso.delete(clave);
    }).catch(function () { registrosAviso.delete(clave); });
  }

  function observarAviso(art) {
    if (observadorAviso) observadorAviso.disconnect();
    if (!art.dataset.avisoId) return;
    var origen = fuente;
    if (!("IntersectionObserver" in window)) {
      registrarAvisoVisto(art.dataset.avisoId);
      return;
    }
    observadorAviso = new IntersectionObserver(function (entradas) {
      if (origen === fuente && art.isConnected && entradas[0].isIntersecting) registrarAvisoVisto(art.dataset.avisoId);
    });
    observadorAviso.observe(art);
  }

  function pintarAvisoDueno(art) {
    delete art.dataset.avisoId;
    if (!fuente || fuente.demo) return;
    var aviso = Nube.avisosParaMostrar(avisosNube, plataformaNova, avisosVistos, Date.now())[0];
    if (!aviso) return;
    art.dataset.avisoId = aviso.id;
    art.append(el("h2", "titulo-tarjeta aviso-dueno-texto", aviso.titulo),
      el("p", "aviso-dueno-texto", aviso.mensaje),
      botonHabito("Entendido", function () {
        avisosVistos = (Array.isArray(avisosVistos) ? avisosVistos : []).concat(aviso.id);
        guardarLocal("nova-avisos-vistos", avisosVistos);
        art.replaceChildren();
        pintarAvisoDueno(art);
        if (!art.childNodes.length) art.remove();
        observarAviso(art);
      }));
  }

  function pintarAvisoInicio() {
    var cont = $("aviso-nube-inicio");
    var art = crearWidget("aviso-dueno", null, null, null, null, true);
    cont.replaceChildren();
    if (art.childNodes.length) cont.append(art);
    observarAviso(art);
  }

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && enVista === "inicio" && !$("pantalla-app").hidden) pintarAvisoInicio();
  });

  function cargarAvisosNube() {
    var origen = fuente;
    conSesionNube(origen, function () { return cliente.from("fin_avisos").select("*"); }).then(function (r) {
      if (origen !== fuente || !r || r.error) return;
      avisosNube = r.data;
      pintarAvisoInicio();
    }).catch(function () { /* Si no hay conexión, se intentará al volver a abrir NOVA. */ });
  }

  function pintarEncuestaInicio() {
    var cont = $("encuesta-nube-inicio"), encuesta = encuestaInicio, origen = fuente;
    cont.replaceChildren();
    if (!origen || origen.demo || !encuesta) return;
    var art = el("article", "tarjeta formulario");
    var comentario = el("textarea"), contador = el("small", "nota", "0 / 300");
    comentario.id = "encuesta-comentario";
    comentario.rows = 2;
    comentario.maxLength = 300;
    contador.id = "encuesta-contador";
    comentario.setAttribute("aria-describedby", contador.id);
    comentario.addEventListener("input", function () {
      contador.textContent = comentario.value.length + " / 300";
    });
    var etiqueta = el("label", null, "Comentario (opcional)");
    etiqueta.htmlFor = comentario.id;
    var opciones = el("div", "encuesta-opciones");
    opciones.setAttribute("role", "group");
    opciones.setAttribute("aria-labelledby", "encuesta-pregunta");
    var pregunta = el("h2", "titulo-tarjeta aviso-dueno-texto", encuesta.pregunta);
    pregunta.id = "encuesta-pregunta";
    var estado = el("p", "mensaje");
    estado.setAttribute("role", "status");
    var descartar = botonHabito("Ahora no", function () {
      guardarLocal("nova-encuesta-descartada:" + encuesta.id, true);
      encuestaInicio = null;
      pintarEncuestaInicio();
    });
    var botones = encuesta.opciones.map(function (opcion, indice) {
      return botonHabito(opcion, function () {
        botones.concat(descartar, comentario).forEach(function (campo) { campo.disabled = true; });
        estado.textContent = "Guardando…";
        conSesionNube(origen, function () {
          return cliente.from("fin_respuestas").insert({
            encuesta_id: encuesta.id, opcion: indice, comentario: comentario.value.trim() || null
          });
        }).then(function (r) {
          if (origen !== fuente) return;
          if (!r || (r.error && r.error.code !== "23505")) throw new Error("No se guardó");
          encuestaInicio = null;
          art.replaceChildren(el("p", null, "¡Gracias!"));
        }).catch(function () {
          if (origen !== fuente) return;
          estado.textContent = "No se pudo registrar tu respuesta. Intenta de nuevo.";
          botones.concat(descartar, comentario).forEach(function (campo) { campo.disabled = false; });
        });
      });
    });
    opciones.append.apply(opciones, botones);
    art.append(pregunta, etiqueta, comentario, contador, opciones, descartar, estado);
    cont.append(art);
  }

  function cargarEncuestaNube() {
    var origen = fuente, pagina = 50;
    function buscar(desde) {
      return conSesionNube(origen, function () {
        return cliente.from("fin_encuestas").select("id,pregunta,opciones,activa,creado_en").eq("activa", true)
          .order("creado_en", { ascending: false }).order("id", { ascending: false }).range(desde, desde + pagina - 1);
      }).then(function (r) {
        if (origen !== fuente || !r || r.error || !r.data.length) return;
        var encuestas = r.data;
        var ids = encuestas.map(function (encuesta) { return encuesta.id; });
        var descartadas = ids.filter(function (id) { return leerLocal("nova-encuesta-descartada:" + id, false); });
        return conSesionNube(origen, function () {
          return cliente.from("fin_respuestas").select("encuesta_id").in("encuesta_id", ids);
        }).then(function (respuestas) {
          if (origen !== fuente || !respuestas || respuestas.error) return;
          var respondidas = respuestas.data.map(function (fila) { return fila.encuesta_id; });
          encuestaInicio = Nube.encuestaParaMostrar(encuestas, respondidas, descartadas);
          if (encuestaInicio) pintarEncuestaInicio();
          else if (encuestas.length === pagina) return buscar(desde + pagina);
        });
      });
    }
    return buscar(0).catch(function () { /* La encuesta es opcional. */ });
  }

  var configNube = Nube.configDesdeFilas(), cargaConfigNube = null;

  function pintarPausaIA() {
    var aviso = $("chat-mantenimiento");
    aviso.textContent = Nube.mensajePausaIA(configNube);
    aviso.hidden = !aviso.textContent;
  }

  function reiniciarConfigNube() {
    configNube = Nube.configDesdeFilas();
    cargaConfigNube = null;
    $("aviso-version-minima").hidden = true;
    $("dueno-config").hidden = true;
    formulariosConfigDueno.forEach(function (form) { form.reset(); });
    pintarPausaIA();
    $("sugerencia-respuestas").replaceChildren();
  }

  function cargarConfigNube() {
    var origen = fuente;
    if (!cliente || !origen || origen.demo || cargaConfigNube) return;
    cargaConfigNube = conSesionNube(origen, function () {
      return cliente.from("fin_config").select("clave,valor");
    }).then(function (r) {
      if (origen !== fuente || !r || r.error) return;
      configNube = Nube.configDesdeFilas(r.data);
      pintarPausaIA();
      versionParaNube().then(function (version) {
        if (origen !== fuente) return;
        var notas = $("aviso-version-notas");
        notas.textContent = configNube.notas_version;
        notas.hidden = !notas.textContent;
        $("aviso-version-minima").hidden = !Nube.versionMenor(version, configNube.version_minima);
      });
    }).catch(function () { /* Se conserva el último ajuste leído. */ })
      .finally(function () { if (origen === fuente) cargaConfigNube = null; });
  }

  document.addEventListener("visibilitychange", function () { if (!document.hidden) cargarConfigNube(); });
  window.addEventListener("online", cargarConfigNube);

  function puedeAbrirNube() {
    if (fuente && fuente.demo) {
      toast("No disponible en la demostración");
      return false;
    }
    if (cliente && fuente) return true;
    toast("Inicia sesión para continuar");
    return false;
  }

  function pintarContadorSugerencia() {
    $("sugerencia-contador").textContent = Array.from($("sugerencia-texto").value).length + " de 2000 caracteres";
  }

  function cargarRespuestasSugerencias(origen) {
    var cont = $("sugerencia-respuestas");
    return conSesionNube(origen, function () {
      return cliente.from("fin_sugerencias").select("mensaje,respuesta,respondida_en")
        .eq("user_id", idUsuario()).order("respondida_en", { ascending: false });
    }).then(function (r) {
      if (origen !== fuente || !r || r.error) return;
      cont.replaceChildren();
      Nube.sugerenciasRespondidas(r.data).forEach(function (s) {
        var cuadro = el("article", "tarjeta dueno-detalle");
        cuadro.append(el("h3", "titulo-tarjeta", "Respuesta del equipo de NOVA"),
          el("p", "nota", s.mensaje), el("p", null, s.respuesta));
        if (s.respondida_en) cuadro.append(el("small", "nota", fechaDueno(s.respondida_en)));
        cont.append(cuadro);
      });
    }).catch(function () { /* El formulario sigue disponible. */ });
  }

  $("btn-sugerencia").addEventListener("click", function () {
    if (!puedeAbrirNube()) return;
    var origen = fuente;
    conSesionNube(origen, function () { return true; }).then(function (sesion) {
      if (origen !== fuente) return;
      if (!sesion) return toast("Inicia sesión para enviar una sugerencia");
      mensaje("sugerencia-mensaje", "");
      abrirCapa("hoja-sugerencia");
      cargarRespuestasSugerencias(origen);
    }).catch(function () { toast("No se pudo comprobar tu sesión. Intenta otra vez."); });
  });
  $("sugerencia-texto").addEventListener("input", pintarContadorSugerencia);
  $("form-sugerencia").addEventListener("submit", function (e) {
    e.preventDefault();
    var boton = $("sugerencia-enviar");
    if (boton.disabled || !puedeAbrirNube()) return;
    var campo = $("sugerencia-texto"), texto = Nube.validarSugerencia(campo.value);
    if (!texto) {
      mensaje("sugerencia-mensaje", "Escribe entre 3 y 2000 caracteres.", true);
      return;
    }
    var origen = fuente, clave = "nova-sugerencias-hora";
    boton.disabled = campo.readOnly = true;
    mensaje("sugerencia-mensaje", "Enviando…");
    function enviar(version) {
      return conSesionNube(origen, function () {
        var ahora = Date.now(), envios = Nube.enviosDeLaHora(leerLocal(clave, []), ahora);
        if (envios.length >= 3) return { limite: true };
        if (!guardarLocal(clave, envios.concat(ahora))) return { sinAlmacenamiento: true };
        return cliente.from("fin_sugerencias").insert({ mensaje: texto, version: version, plataforma: plataformaNova })
          .then(function (r) {
            if (r.error && r.status >= 400 && r.status < 500) {
              var actuales = Nube.enviosDeLaHora(leerLocal(clave, []), Date.now());
              var indice = actuales.indexOf(ahora);
              if (indice >= 0) actuales.splice(indice, 1);
              guardarLocal(clave, actuales);
            }
            return r;
          });
      });
    }
    versionParaNube().then(function (version) {
      return navigator.locks ? navigator.locks.request(clave, function () { return enviar(version); }) : enviar(version);
    }).then(function (r) {
      if (origen !== fuente) return;
      if (!r) return mensaje("sugerencia-mensaje", "Inicia sesión para enviar una sugerencia.", true);
      if (r.limite) return mensaje("sugerencia-mensaje", "Puedes enviar hasta 3 sugerencias por hora. Intenta más tarde.", true);
      if (r.sinAlmacenamiento) return mensaje("sugerencia-mensaje", "No se pudo guardar el límite de envíos en este dispositivo.", true);
      if (r.error) throw r.error;
      campo.value = "";
      pintarContadorSugerencia();
      mensaje("sugerencia-mensaje", "¡Gracias!");
      cargarRespuestasSugerencias(origen);
    }).catch(function () {
      if (origen === fuente) mensaje("sugerencia-mensaje", "No se pudo enviar la sugerencia. Revisa tu conexión e intenta otra vez.", true);
    }).finally(function () { boton.disabled = campo.readOnly = false; });
  });

  $("btn-salir-otros").addEventListener("click", function () {
    var boton = $("btn-salir-otros");
    if (boton.disabled || !puedeAbrirNube() || !confirm("¿Cerrar sesión en los demás dispositivos? Tu sesión seguirá abierta aquí.")) return;
    boton.disabled = true;
    conSesionNube(fuente, function () { return cliente.auth.signOut({ scope: "others" }); }).then(function (r) {
      if (!r) return toast("Inicia sesión para continuar");
      if (r.error) throw r.error;
      toast("Sesión cerrada en los demás dispositivos");
    }).catch(function () {
      toast("No se pudieron cerrar las otras sesiones", "Revisa tu conexión e intenta otra vez.");
    }).finally(function () { boton.disabled = false; });
  });

  function copiarEnlace(url) {
    Promise.resolve().then(function () { return navigator.clipboard.writeText(url); }).then(function () {
      toast("Enlace copiado");
    }).catch(function () { window.prompt("Copia el enlace", url); });
  }

  async function pintarInvitacion() {
    var cuenta = fuente;
    var enlace = $("invitar-enlace"), compartir = $("invitar-compartir"), copiar = $("invitar-copiar");
    enlace.value = "";
    compartir.disabled = copiar.disabled = true;
    mensaje("invitar-mensaje", "");
    var codigo = await Origen.codigoRef(idUsuario()).catch(function () { return null; });
    if (cuenta !== fuente || enVista !== "ajustes-invitar") return;
    if (!codigo) return mensaje("invitar-mensaje", "No se pudo generar el enlace en este dispositivo.", true);
    enlace.value = location.origin + location.pathname + "?r=" + codigo;
    compartir.disabled = copiar.disabled = false;
  }
  $("invitar-compartir").addEventListener("click", function () {
    var url = $("invitar-enlace").value;
    if (!fuente || fuente.demo || !url) return;
    var texto = "Te invito a probar NOVA.";
    if (navigator.share) navigator.share({ text: texto, url: url }).catch(function () { /* cancelado */ });
    else window.open("https://wa.me/?text=" + encodeURIComponent(texto + " " + url), "_blank", "noopener");
  });
  $("invitar-copiar").addEventListener("click", function () {
    var url = $("invitar-enlace").value;
    if (fuente && !fuente.demo && url) copiarEnlace(url);
  });

  function marcarUso() {
    if (!permitirEventos || !cliente || !fuente || fuente.demo || !idUsuario()) return;
    var origen = fuente, id = idUsuario(), claveUso = "nova-uso-" + id, hoyK = A.claveDia(new Date());
    var vistoHoy = leerLocal(claveUso, "") === hoyK;
    var guardada = leerAtribucion();
    if (vistoHoy && !guardada.o && !guardada.r) return;
    var codigo = guardada.r ? Origen.codigoRef(id).catch(function () { return null; }) : Promise.resolve(null);
    Promise.all([versionParaNube(), codigo]).then(function (resultados) {
      return conSesionNube(origen, async function (sesion) {
        var propio = resultados[1];
        var cambios = Origen.metadataAtribucion(sesion.user.user_metadata || {}, guardada, propio);
        if (Object.keys(cambios).length) {
          var actual = await cliente.auth.getUser();
          if (actual.error || !actual.data.user || actual.data.user.id !== id) return null;
          cambios = Origen.metadataAtribucion(actual.data.user.user_metadata || {}, guardada, propio);
        }
        if (!permitirEventos || origen !== fuente || id !== idUsuario() ||
            (vistoHoy && !Object.keys(cambios).length)) return null;
        cambios.nova_visto = new Date().toISOString();
        cambios.nova_plataforma = plataformaNova;
        cambios.nova_version = resultados[0];
        return cliente.auth.updateUser({ data: cambios });
      });
    }).then(function (r) { if (r && !r.error) guardarLocal(claveUso, hoyK); }).catch(function () { /* se intenta al volver a entrar */ });
  }
  var numDueno = new Intl.NumberFormat("es-CO");
  var personasDueno = null;
  var vistaDuenoGuardada = leerLocal("nova-dueno-vista", {}) || {};
  var vistaDueno = { texto: "", filtro: "todos", orden: "uso" };
  var filtrosDueno = [
    ["todos", "Todos"], ["activos", "Activos"], ["inactivos", "Inactivos"], ["prueba", "Prueba"],
    ["sin-confirmar", "Sin confirmar"], ["android", "Android"], ["web", "Web"], ["sin-movimientos", "Sin movimientos"]
  ];
  function guardarVistaDueno() {
    guardarLocal("nova-dueno-vista", { filtro: vistaDueno.filtro, orden: vistaDueno.orden });
    pintarPersonasDueno();
  }
  function pl(n, uno, varios) { return numDueno.format(n) + " " + (n === 1 ? uno : varios); }
  var etiquetaBarraDueno, barraElegidaDueno;
  function cerrarEtiquetaDueno() {
    if (!barraElegidaDueno) return;
    barraElegidaDueno.setAttribute("aria-pressed", "false");
    etiquetaBarraDueno.hidden = true;
    barraElegidaDueno = null;
  }
  document.addEventListener("pointerdown", function (e) {
    if (barraElegidaDueno && e.target !== barraElegidaDueno) cerrarEtiquetaDueno();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && barraElegidaDueno && !document.querySelector("dialog[open]")) {
      e.preventDefault();
      cerrarEtiquetaDueno();
    }
  }, true);

  function barrasDueno(cont, dias, campo, opciones) {
    if (cont.contains(barraElegidaDueno)) cerrarEtiquetaDueno();
    cont.replaceChildren();
    if (!dias.length) {
      cont.append(el("p", "nota", "Todavía no hay datos."));
      return;
    }
    var max = Math.max.apply(null, dias.map(function (d) { return Dueno.cantidad(d[campo]); }));
    var escala = max || 1;
    var fila = el("div", "dueno-barras");
    var unidad = opciones && opciones.unidad;
    var etiqueta;
    if (unidad) {
      cont.classList.add("dueno-grafico-diario");
      etiqueta = el("p", "dueno-etiqueta-barra");
      etiqueta.hidden = true;
    }
    dias.forEach(function (d) {
      var cantidad = Dueno.cantidad(d[campo]);
      var b = el(unidad ? "button" : "i", cantidad ? null : "cero");
      var altura = Math.max(2, Dueno.porcentaje(cantidad, escala)) + "%";
      if (unidad) b.style.setProperty("--altura-barra", altura);
      else b.style.height = altura;
      if (d.pico) b.classList.add("dueno-pico");
      var fecha = d.etiqueta || fechaCorta.format(new Date(d.dia + "T12:00:00"));
      if (unidad) {
        var texto = fecha + " · " + pl(cantidad, unidad[0], unidad[1]);
        b.type = "button";
        b.setAttribute("aria-label", texto);
        b.setAttribute("aria-pressed", "false");
        function mostrarEtiqueta() {
          cerrarEtiquetaDueno();
          etiquetaBarraDueno = etiqueta;
          barraElegidaDueno = b;
          etiqueta.textContent = texto;
          etiqueta.hidden = false;
          b.setAttribute("aria-pressed", "true");
        }
        b.addEventListener("focus", mostrarEtiqueta);
        b.addEventListener("click", mostrarEtiqueta);
        b.addEventListener("blur", function () { if (barraElegidaDueno === b) cerrarEtiquetaDueno(); });
      } else b.title = fecha + ": " + cantidad;
      fila.append(b);
    });
    var ejes = el("div", "dueno-ejes");
    if (opciones && opciones.marcas) {
      ejes.classList.add("dueno-marcas");
      opciones.marcas.forEach(function (marca) { ejes.append(el("span", null, marca)); });
    } else {
      var total = opciones && opciones.resumen ? null : dias.reduce(function (s, d) { return s + Dueno.cantidad(d[campo]); }, 0);
      ejes.append(el("span", null, fechaCorta.format(new Date(dias[0].dia + "T12:00:00"))));
      if (total !== null) ejes.append(el("span", null, "Total: " + numDueno.format(total) + " · máximo " + max + " en un día"));
      ejes.append(el("span", null, "Hoy"));
    }
    cont.append(fila, ejes);
    if (etiqueta) cont.append(etiqueta);
    if (opciones && opciones.resumen) cont.append(el("p", "nota", opciones.resumen));
  }
  var Dueno = window.NovaDueno;
  var rangoDueno = Dueno.rangoDias(leerLocal("nova-dueno-rango", 30));
  var panelDueno = $("pantalla-dueno");
  var permisosDueno = window.NovaPermisos.permisosPanel();

  function pintarPermisosDueno(rol) {
    permisosDueno = window.NovaPermisos.permisosPanel(rol);
    panelDueno.classList.toggle("dueno-sin-acciones", !permisosDueno.actuar);
    $("dueno-rol-mensaje").hidden = rol !== "ver";
    $("dueno-admins-seccion").hidden = !permisosDueno.gestionarAdmins;
    if (!permisosDueno.gestionarAdmins) $("dueno-admins-lista").replaceChildren();
    if (confirmacionCuenta.open && (!permisosDueno.actuar ||
        (cuentaPendiente && cuentaPendiente.accion === "admin_quitar" && !permisosDueno.gestionarAdmins))) {
      confirmacionCuenta.close();
    }
    Array.from(panelDueno.querySelectorAll("#dueno-config input, #dueno-config textarea")).concat(camposCostosDueno).forEach(function (campo) {
      campo.disabled = !permisosDueno.actuar;
    });
  }
  var botonAyudaDueno, textoAyudaDueno;
  function cerrarAyudaDueno() {
    if (!botonAyudaDueno) return;
    botonAyudaDueno.setAttribute("aria-pressed", "false");
    textoAyudaDueno.hidden = true;
    botonAyudaDueno = null;
  }
  function agregarAyudaDueno(tarjeta, clave, nombre, id) {
    var boton = el("button", "dueno-ayuda-btn", "ℹ️");
    var texto = el("small", "dueno-ayuda-texto", Dueno.ayudaNumeros[clave]);
    boton.type = "button";
    boton.setAttribute("aria-label", "Ayuda sobre " + nombre);
    boton.setAttribute("aria-pressed", "false");
    boton.setAttribute("aria-controls", id);
    texto.id = id;
    texto.hidden = true;
    boton.addEventListener("click", function () {
      var abrir = texto.hidden;
      cerrarAyudaDueno();
      if (!abrir) return;
      botonAyudaDueno = boton;
      textoAyudaDueno = texto;
      boton.setAttribute("aria-pressed", "true");
      texto.hidden = false;
    });
    tarjeta.append(boton, texto);
  }
  var registrosMetaDueno = 0;
  var metaDueno = Dueno.cantidad(leerLocal("nova-dueno-meta", 0));
  $("dueno-meta").value = metaDueno || "";
  function pintarMetaDueno() {
    var avance = Dueno.porcentaje(registrosMetaDueno, metaDueno);
    $("dueno-meta-barra").value = avance;
    $("dueno-meta-progreso").textContent = pl(registrosMetaDueno, "registro", "registros") + " en los últimos 30 días" +
      (metaDueno ? " · meta de " + numDueno.format(metaDueno) + " · " + avance + "%" : "");
  }
  $("form-dueno-meta").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!permisosDueno.actuar) return;
    var valor = Dueno.cantidad($("dueno-meta").value);
    if (!guardarLocal("nova-dueno-meta", valor)) return toast("No se pudo guardar la meta en este dispositivo");
    metaDueno = valor;
    pintarMetaDueno();
    toast(valor ? "Meta guardada" : "Meta quitada");
  });

  function pintarVersionesDueno(versiones) {
    var cont = $("dueno-versiones"), filas = Dueno.barrasVersiones(versiones);
    cont.replaceChildren();
    if (!filas.length) cont.append(el("p", "nota", "Todavía no hay datos de versiones."));
    filas.forEach(function (fila) {
      var etiqueta = fila.version + " · " + pl(fila.total, "persona", "personas");
      var barra = el("progress");
      barra.max = filas[0].total || 1;
      barra.value = fila.total;
      barra.setAttribute("aria-label", etiqueta);
      var grupo = el("div");
      grupo.append(el("span", "nota", etiqueta), barra);
      cont.append(grupo);
    });
  }

  var fechaPanel = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" });
  function fechaDueno(valor) {
    var tiempo = Date.parse(valor);
    return Number.isFinite(tiempo) ? fechaPanel.format(tiempo) : "Fecha desconocida";
  }

  function listaDueno(id, filas, vacio, dibujar) {
    var ul = $(id);
    ul.replaceChildren();
    if (!filas.length) ul.append(el("li", "vacio", vacio));
    filas.forEach(function (fila) {
      var li = el("li", "banco-item dueno-detalle");
      dibujar(li, fila);
      ul.append(li);
    });
  }

  function actuarDueno(boton, cuerpo, idMensaje, exito, alGuardar) {
    if (boton.disabled || !soyDueno() || !permisosDueno.actuar) return;
    var origen = fuente;
    boton.disabled = true;
    mensaje(idMensaje, "Guardando…");
    Promise.resolve().then(function () {
      return cliente.functions.invoke("nova-dueno", { body: cuerpo });
    }).then(function (r) {
      if (fuente !== origen) return;
      if (r.error || !r.data || !r.data.ok) throw new Error("No se guardó");
      if (alGuardar) alGuardar();
      mensaje(idMensaje, "");
      toast(exito);
      return recargarTrasCambioDueno();
    }).catch(function () {
      if (fuente === origen) mensaje(idMensaje, "No se pudo guardar el cambio. Intenta otra vez.", true);
    }).finally(function () { boton.disabled = false; });
  }

  var formulariosConfigDueno = Array.from($("dueno-config").querySelectorAll("form"));
  formulariosConfigDueno.forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var clave = form.dataset.clave, campo = $("dueno-config-" + clave);
      var valor = clave === "ia_pausada" ? campo.checked : campo.value.trim();
      if (clave === "version_minima" && valor && !Nube.validarVersion(valor)) {
        return mensaje("dueno-config-mensaje", "Escribe la versión así: 1.72.", true);
      }
      actuarDueno(form.querySelector("button"), { accion: "config_guardar", clave: clave, valor: valor },
        "dueno-config-mensaje", "Ajuste guardado", function () {
          if (campo.type === "checkbox") {
            if (campo.checked === valor) campo.defaultChecked = valor;
          } else if (campo.value.trim() === valor) {
            campo.value = campo.defaultValue = valor;
          }
          var origen = fuente;
          Promise.resolve(cargaConfigNube).then(function () {
            if (origen === fuente) cargarConfigNube();
          });
        });
    });
  });

  function agregarEnlaceDueno(cont, url, texto) {
    if (typeof url !== "string" || !/^https:\/\//i.test(url)) return;
    var enlace = el("a", null, texto);
    enlace.href = url;
    enlace.target = "_blank";
    enlace.rel = "noopener noreferrer";
    cont.append(enlace);
  }

  function pintarEstadoDueno(estado) {
    estado = estado || {};
    listaDueno("dueno-servicios", Array.isArray(estado.servicios) ? estado.servicios : [], "Estado de servicios no disponible.", function (li, servicio) {
      var linea = el("strong", "dueno-servicio");
      var punto = el("span", "dueno-punto" + (servicio.ok ? " ok" : ""));
      punto.setAttribute("aria-hidden", "true");
      linea.append(punto, servicio.nombre + " · " + (servicio.ok ? "Operativo" : "Con fallos"));
      li.append(linea, el("small", "nota", (servicio.estado ? "HTTP " + servicio.estado + " · " : "") + servicio.ms + " ms"));
    });

    var corrida = estado.corridaApk, apk = $("dueno-corrida");
    apk.replaceChildren(el("strong", null, "Última corrida de la APK"));
    if (corrida) {
      var fallo = corrida.resultado === "failure";
      apk.append(el("p", fallo ? "mensaje error" : "nota",
        [fallo ? "Falló la compilación de la APK" : "", corrida.resultado || corrida.estado, fechaDueno(corrida.creado)].filter(Boolean).join(" · ")));
      if (corrida.mensaje) apk.append(el("small", "nota", corrida.mensaje));
      agregarEnlaceDueno(apk, corrida.enlace, "Ver corrida");
    } else apk.append(el("p", "nota", "Corrida no disponible."));

    var lanzamiento = estado.lanzamiento, cont = $("dueno-lanzamiento");
    cont.replaceChildren(el("strong", null, "Último lanzamiento"),
      el("p", "nota", lanzamiento ? fechaDueno(lanzamiento.actualizado || lanzamiento.publicado) : "Lanzamiento no disponible."));
    if (lanzamiento) agregarEnlaceDueno(cont, lanzamiento.enlace, "Ver lanzamiento");

    $("dueno-config").hidden = !estado.config;
    if (!estado.config) return;
    formulariosConfigDueno.forEach(function (form) {
      var clave = form.dataset.clave, campo = $("dueno-config-" + clave), valor = estado.config[clave];
      if (campo.type === "checkbox") {
        if (campo.checked === campo.defaultChecked) campo.checked = campo.defaultChecked = valor === true;
      } else if (campo.value === campo.defaultValue) {
        campo.value = campo.defaultValue = typeof valor === "string" ? valor : "";
      }
    });
  }

  function pintarListasDueno(d, errores) {
    listaDueno("dueno-errores-recientes", Dueno.recientes(errores.recientes), "Todavía no hay errores registrados.", function (li, error) {
      li.append(el("p", null, Dueno.recortarTexto(error.mensaje, 180) || "Error sin detalle"),
        el("small", "nota", [error.version, error.plataforma, fechaDueno(error.creado_en)].filter(Boolean).join(" · ")));
    });
    listaDueno("dueno-avisos", Dueno.recientes(d.avisos), "Todavía no hay avisos.", function (li, aviso) {
      var inicio = aviso.desde ? " · Desde " + fechaDueno(aviso.desde) : "";
      var fin = aviso.hasta ? " · Hasta " + fechaDueno(aviso.hasta) : "";
      li.append(el("strong", null, aviso.titulo), el("p", null, aviso.mensaje),
        el("small", "nota", [aviso.audiencia, aviso.activo ? "Activo" : "Apagado"].filter(Boolean).join(" · ") + inicio + fin),
        el("small", "nota", aviso.vistos != null ? "Lo vieron " + aviso.vistos : "Conteo de vistas no disponible."));
      if (permisosDueno.actuar && aviso.activo && aviso.id != null) {
        var boton = botonHabito("Apagar", function () {
          if (confirm("¿Apagar este aviso?")) actuarDueno(boton, { accion: "aviso_apagar", id: aviso.id }, "dueno-aviso-mensaje", "Aviso apagado");
        });
        boton.setAttribute("data-dueno-accion", "");
        li.append(boton);
      }
    });
    listaDueno("dueno-encuestas", Dueno.recientes(d.encuestas, 10), "No hay encuestas disponibles.", function (li, encuesta) {
      li.append(el("strong", null, encuesta.pregunta),
        el("small", "nota", (encuesta.activa ? "Activa" : "Cerrada") + " · " + fechaDueno(encuesta.creado_en)),
        el("p", null, pl(encuesta.total, "respuesta", "respuestas")));
      var porcentajes = Dueno.porcentajesEncuesta(encuesta.conteos, encuesta.total);
      var resultados = el("div", "encuesta-resultados");
      encuesta.opciones.forEach(function (opcion, indice) {
        var texto = opcion + " · " + encuesta.conteos[indice] + " (" + porcentajes[indice] + "%)";
        var barra = el("meter");
        barra.max = 100;
        barra.value = porcentajes[indice];
        barra.setAttribute("aria-label", texto);
        resultados.append(el("p", null, texto), barra);
      });
      li.append(resultados);
      if (encuesta.comentarios.length) {
        li.append(el("strong", null, "Comentarios"));
        encuesta.comentarios.forEach(function (comentario) {
          li.append(el("p", null, comentario.comentario), el("small", "nota", fechaDueno(comentario.creado_en)));
        });
      }
      if (permisosDueno.actuar && encuesta.activa) {
        var cerrar = botonHabito("Cerrar encuesta", function () {
          if (confirm("¿Cerrar esta encuesta?")) actuarDueno(cerrar, { accion: "encuesta_cerrar", id: encuesta.id },
            "dueno-encuesta-mensaje", "Encuesta cerrada");
        });
        cerrar.setAttribute("data-dueno-accion", "");
        li.append(cerrar);
      }
    });
    var sugerencias = Dueno.recientes(d.sugerencias);
    $("dueno-pendientes").textContent = pl(Dueno.sugerenciasPendientes(sugerencias), "pendiente", "pendientes");
    listaDueno("dueno-sugerencias", sugerencias, "Todavía no hay sugerencias.", function (li, s) {
      li.append(el("strong", null, s.correo || "Sin correo"), el("p", null, s.mensaje),
        el("small", "nota", [s.version, fechaDueno(s.creado_en), s.atendida ? "Atendida" : "Pendiente"].filter(Boolean).join(" · ")));
      if (s.respuesta) {
        li.append(el("strong", null, "Respuesta"), el("p", null, s.respuesta));
        if (s.respondida_en) li.append(el("small", "nota", fechaDueno(s.respondida_en)));
      } else if (permisosDueno.actuar && s.id != null) {
        var form = el("form", "formulario dueno-responder");
        form.setAttribute("data-dueno-accion", "");
        var respuesta = el("textarea");
        respuesta.id = "dueno-respuesta-" + s.id;
        respuesta.rows = 3;
        respuesta.maxLength = 1000;
        respuesta.required = true;
        var etiqueta = el("label", null, "Escribe una respuesta");
        etiqueta.htmlFor = respuesta.id;
        var enviar = el("button", "mini", "Responder");
        enviar.type = "submit";
        form.append(etiqueta, respuesta, enviar);
        form.addEventListener("submit", function (e) {
          e.preventDefault();
          var texto = respuesta.value.trim();
          if (!texto) return mensaje("dueno-sugerencias-mensaje", "Escribe una respuesta.", true);
          actuarDueno(enviar, { accion: "sugerencia_responder", id: s.id, respuesta: texto },
            "dueno-sugerencias-mensaje", "Respuesta enviada");
        });
        li.append(form);
      }
      if (permisosDueno.actuar && s.id != null) {
        var boton = botonHabito(s.atendida ? "Marcar pendiente" : "Marcar atendida", function () {
          actuarDueno(boton, { accion: "sugerencia_atender", id: s.id, atendida: !s.atendida }, "dueno-sugerencias-mensaje", "Sugerencia actualizada");
        });
        boton.setAttribute("data-dueno-accion", "");
        li.append(boton);
      }
    });
    listaDueno("dueno-accesos", Dueno.recientes(d.accesos, 10), "Todavía no hay accesos registrados.", function (li, acceso) {
      li.append(el("strong", null, acceso.correo || "Sin correo"), el("small", "nota", fechaDueno(acceso.creado_en)));
    });
  }

  var clavePlantillasDueno = "nova-dueno-plantillas";
  var plantillasDueno = leerLocal(clavePlantillasDueno, []);
  function guardarPlantillasDueno(lista) {
    plantillasDueno = lista;
    var guardadas = guardarLocal(clavePlantillasDueno, lista);
    pintarPlantillasDueno();
    mensaje("dueno-plantilla-mensaje", guardadas ? "Plantillas actualizadas." :
      "El cambio se mantendrá hasta que cierres o recargues la app.");
  }
  function pintarPlantillasDueno() {
    var lista = $("dueno-plantillas");
    lista.replaceChildren();
    Dueno.listarPlantillas(plantillasDueno).forEach(function (plantilla, indice) {
      var fila = el("li", "banco-item");
      var usar = el("button", "mini", "Usar");
      usar.type = "button";
      usar.setAttribute("aria-label", "Usar plantilla " + plantilla.titulo);
      usar.addEventListener("click", function () {
        $("dueno-aviso-titulo").value = plantilla.titulo;
        $("dueno-aviso-texto").value = plantilla.mensaje;
        $("dueno-aviso-titulo").focus();
      });
      fila.append(el("strong", null, plantilla.titulo), el("p", "banco-texto", plantilla.mensaje), usar);
      if (!plantilla.fabrica) {
        var borrar = el("button", "mini", "Borrar");
        borrar.type = "button";
        borrar.setAttribute("aria-label", "Borrar plantilla " + plantilla.titulo);
        borrar.addEventListener("click", function () {
          if (!confirm("¿Borrar la plantilla «" + plantilla.titulo + "»?")) return;
          guardarPlantillasDueno(Dueno.borrarPlantilla(plantillasDueno, indice));
          $("dueno-plantilla-guardar").focus();
        });
        fila.append(borrar);
      }
      lista.append(fila);
    });
  }
  $("dueno-plantilla-guardar").addEventListener("click", function () {
    var titulo = $("dueno-aviso-titulo").value, texto = $("dueno-aviso-texto").value;
    if (!Dueno.validarPlantilla(titulo, texto)) {
      return mensaje("dueno-plantilla-mensaje", "Escribe un título de hasta 80 caracteres y un mensaje de hasta 500.", true);
    }
    var lista = Dueno.agregarPlantilla(plantillasDueno, titulo, texto);
    if (!lista) return mensaje("dueno-plantilla-mensaje", "Ya tienes 10 plantillas. Borra una guardada para agregar otra.", true);
    guardarPlantillasDueno(lista);
  });

  $("form-dueno-aviso").addEventListener("submit", function (e) {
    e.preventDefault();
    var form = e.currentTarget;
    var aviso = Dueno.validarAviso($("dueno-aviso-titulo").value, $("dueno-aviso-texto").value,
      $("dueno-aviso-audiencia").value, $("dueno-aviso-hasta").value, Date.now(), $("dueno-aviso-desde").value);
    if (!aviso) return mensaje("dueno-aviso-mensaje", "Revisa el título (hasta 80 caracteres), el mensaje (hasta 500) y las fechas. El último día debe ser hoy o después y el inicio debe quedar dentro del plazo.", true);
    actuarDueno($("dueno-aviso-crear"), aviso, "dueno-aviso-mensaje", "Aviso creado", function () { form.reset(); });
  });

  var opcionesEncuestaDueno = $("dueno-encuesta-opciones");
  function anadirOpcionEncuestaDueno() {
    var numero = opcionesEncuestaDueno.querySelectorAll("input").length + 1;
    var campo = el("input"), etiqueta = el("label", null, "Opción " + numero);
    campo.type = "text";
    campo.id = "dueno-encuesta-opcion-" + numero;
    campo.maxLength = 60;
    etiqueta.htmlFor = campo.id;
    opcionesEncuestaDueno.append(etiqueta, campo);
    $("dueno-encuesta-anadir").disabled = numero >= 6;
    return campo;
  }

  function reiniciarFormularioEncuestaDueno() {
    $("form-dueno-encuesta").reset();
    opcionesEncuestaDueno.replaceChildren();
    anadirOpcionEncuestaDueno();
    anadirOpcionEncuestaDueno();
  }

  reiniciarFormularioEncuestaDueno();
  $("dueno-encuesta-anadir").addEventListener("click", function () { anadirOpcionEncuestaDueno().focus(); });
  $("form-dueno-encuesta").addEventListener("submit", function (e) {
    e.preventDefault();
    var opciones = Array.from(opcionesEncuestaDueno.querySelectorAll("input"), function (campo) { return campo.value; });
    var encuesta = Dueno.validarEncuesta($("dueno-encuesta-pregunta").value, opciones);
    if (!encuesta) return mensaje("dueno-encuesta-mensaje", "Escribe una pregunta de hasta 200 caracteres y de 2 a 6 opciones de hasta 60 caracteres.", true);
    actuarDueno($("dueno-encuesta-crear"), encuesta, "dueno-encuesta-mensaje", "Encuesta creada", reiniciarFormularioEncuestaDueno);
  });

  var Analitica = window.NovaAnalitica;
  var datosAnaliticaDueno;
  var ocultarPruebaDueno = $("dueno-ocultar-prueba");
  ocultarPruebaDueno.checked = leerLocal("nova-dueno-ocultar-prueba", false) === true;
  var porcentajeDueno = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
  function textoPorcentajeDueno(valor) {
    return valor == null ? "—" : porcentajeDueno.format(valor) + " %";
  }
  function kpisAnaliticaDueno(id, filas) {
    var cont = $(id);
    if (cont.contains(botonAyudaDueno)) cerrarAyudaDueno();
    cont.replaceChildren();
    filas.forEach(function (fila, i) {
      var tarjeta = el("div", "dueno-kpi");
      tarjeta.append(el("strong", null, fila[1]), el("span", null, fila[0]));
      if (fila[2]) tarjeta.append(el("small", null, fila[2]));
      agregarAyudaDueno(tarjeta, fila[3], fila[0], id + "-ayuda-" + i);
      cont.append(tarjeta);
    });
  }
  function barrasHorizontalesDueno(id, filas, detalle, textoExtra) {
    var cont = $(id);
    cont.replaceChildren();
    filas.forEach(function (fila) {
      var grupo = el("div");
      var etiqueta = fila.nombre + " · " + (fila.total == null ? "Sin dato por persona" : numDueno.format(fila.total));
      if (textoExtra) etiqueta += " · " + textoExtra(fila);
      if (fila.porcentaje != null && detalle != null) etiqueta += " · " + textoPorcentajeDueno(fila.porcentaje) + detalle;
      grupo.append(el("span", "nota", etiqueta));
      if (fila.porcentaje != null) {
        var barra = el("progress");
        barra.max = 100;
        barra.value = fila.porcentaje;
        barra.setAttribute("aria-label", etiqueta);
        grupo.append(barra);
      }
      cont.append(grupo);
    });
  }
  function barrasHorarioDueno(id, valores, etiquetas, filtrado) {
    var cont = $(id);
    if (filtrado || !Array.isArray(valores) || valores.length !== etiquetas.length) {
      cont.replaceChildren(el("p", "nota", filtrado ? "No hay un desglose sin las cuentas de prueba." : "Todavía no hay datos."));
      return;
    }
    var pico = Analitica.picoDe(valores);
    var filas = etiquetas.map(function (etiqueta, i) {
      return { etiqueta: etiqueta, total: valores[i], pico: i === pico };
    });
    var marcas = id === "dueno-semana" ? etiquetas : ["00:00", "06:00", "12:00", "18:00", "23:00"];
    barrasDueno(cont, filas, "total", { marcas: marcas, resumen: pico < 0 ? "Sin anotaciones" :
      "Mayor uso en " + etiquetas[pico] + " · " + pl(valores[pico], "anotación", "anotaciones") });
  }
  var negocioDueno;
  var activosNegocioDueno;
  var claveCostosDueno = "nova-dueno-costos-negocio";
  var formCostosDueno = $("dueno-costos");
  var camposCostosDueno = Array.from(formCostosDueno.querySelectorAll("input"));
  var monedaNegocioDueno = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 2 });
  var costosCargadosDueno = false;

  function contenidoNegocioDueno(negocio, nivelTitulo) {
    var contenido = document.createDocumentFragment();
    var comparativo = negocio.comparativo;
    var tabla = el("table", "dueno-negocio-tabla"), cab = el("tr"), cuerpo = el("tbody");
    ["Indicador", comparativo.mes, comparativo.mesAnterior, "Cambio"].forEach(function (texto) {
      var th = el("th", null, texto);
      th.scope = "col";
      cab.append(th);
    });
    var encabezado = el("thead");
    encabezado.append(cab);
    tabla.append(encabezado, cuerpo);
    comparativo.filas.forEach(function (fila) {
      var tr = el("tr"), th = el("th", null, fila.nombre);
      th.scope = "row";
      tr.append(th);
      [fila.actual, fila.anterior].forEach(function (valor) {
        tr.append(el("td", null, valor == null ? "sin dato" : numDueno.format(valor)));
      });
      tr.append(el("td", null, fila.cambio == null ? "—" :
        (fila.cambio > 0 ? "+" : "") + textoPorcentajeDueno(fila.cambio)));
      cuerpo.append(tr);
    });
    contenido.append(el(nivelTitulo, null, "Este mes contra el mes pasado"), tabla,
      el("p", "nota", "Este mes lleva lo registrado hasta la fecha. El cambio se muestra cuando el mes anterior tiene un valor mayor que cero."),
      el("p", "nota", "La actividad usa los días con movimientos y el último uso (hora de Colombia). Los demás indicadores de la tabla usan fechas UTC. Los chats se cuentan por su última actualización."));

    contenido.append(el(nivelTitulo, null, "Proyección de usuarios a 3 y 6 meses"));
    if (negocio.proyeccion) {
      var proyeccion = el("ul", "dueno-hitos");
      negocio.proyeccion.forEach(function (fila) {
        proyeccion.append(el("li", null, "A " + fila.meses + " meses · " + pl(fila.usuarios, "usuario", "usuarios")));
      });
      contenido.append(proyeccion, el("p", "nota", "Estimación lineal al ritmo de registros de los últimos 30 días, sin cuentas de prueba."));
    } else contenido.append(el("p", "nota", "Faltan datos de usuarios o de registros de los últimos 30 días para estimar."));

    contenido.append(el(nivelTitulo, null, "Hitos"));
    var hitos = negocio.hitos;
    if (!hitos) contenido.append(el("p", "nota", "Sin dato de personas registradas."));
    else {
      var lista = el("ul", "dueno-hitos");
      hitos.hitos.forEach(function (hito) {
        lista.append(el("li", null, pl(hito.meta, "usuario", "usuarios") + " · " + (hito.logrado ? "Logrado" : "Pendiente")));
      });
      var texto = hitos.siguiente ? "Faltan " + pl(hitos.faltan, "usuario", "usuarios") +
        " para llegar a " + numDueno.format(hitos.siguiente) + "." : "Todos los hitos logrados.";
      var barra = el("progress", "dueno-hitos-barra");
      barra.max = 100;
      barra.value = hitos.avance;
      barra.setAttribute("aria-label", texto);
      contenido.append(lista, el("p", "nota", texto), barra);
    }
    return contenido;
  }

  function costosActualesDueno() {
    return Analitica.costosNegocio(camposCostosDueno.map(function (campo) {
      return campo.validity.valid ? campo.value : NaN;
    }), activosNegocioDueno);
  }
  function textoCostosDueno(costos) {
    return "Total mensual · " + (costos.total == null ? "sin dato" : monedaNegocioDueno.format(costos.total)) +
      " · Por usuario activo (30 días) · " + (costos.porActivo == null ? "sin dato" : monedaNegocioDueno.format(costos.porActivo));
  }
  function pintarCostosDueno(guardar) {
    if (!costosCargadosDueno) {
      var valores = leerLocal(claveCostosDueno, []);
      if (Array.isArray(valores)) camposCostosDueno.forEach(function (campo, i) {
        if (Number.isFinite(valores[i]) && valores[i] >= 0) campo.value = valores[i];
      });
      costosCargadosDueno = true;
    }
    var costos = costosActualesDueno();
    $("dueno-costos-total").textContent = textoCostosDueno(costos);
    if (!costos.valido) mensaje("dueno-costos-mensaje", "Ingresa valores no negativos con hasta dos decimales.", true);
    else if (guardar) {
      var guardado = guardarLocal(claveCostosDueno, costos.valores);
      mensaje("dueno-costos-mensaje", guardado ? "" : "El navegador impidió guardar los costos.", !guardado);
    }
  }
  formCostosDueno.addEventListener("submit", function (e) { e.preventDefault(); });
  formCostosDueno.addEventListener("input", function () {
    if (soyDueno() && permisosDueno.actuar && negocioDueno) pintarCostosDueno(true);
  });
  $("dueno-informe-abrir").addEventListener("click", function () {
    if (!soyDueno() || !negocioDueno) return;
    $("informe-dueno-datos").replaceChildren(contenidoNegocioDueno(negocioDueno, "h2"),
      el("h2", null, "Costos de operación"), el("p", null, textoCostosDueno(costosActualesDueno())));
    abrirCapa("pantalla-informe-dueno");
    $("pantalla-informe-dueno").scrollTop = 0;
  });
  $("informe-dueno-imprimir").addEventListener("click", function () {
    if (soyDueno()) window.print();
  });

  function pintarAtribucionDueno(d) {
    var datos = Analitica.prepararAtribucion(d);
    barrasHorizontalesDueno("dueno-origenes", datos.origenes);
    if (!datos.origenes.length) $("dueno-origenes").append(el("p", "nota", "Todavía no hay datos de origen."));
    $("dueno-referidos-total").textContent = pl(datos.total, "persona invitada por amigos", "personas invitadas por amigos");
    var top = $("dueno-referidos-top");
    top.replaceChildren();
    datos.top.forEach(function (fila) {
      top.append(el("li", null, fila.correo + " · " + pl(fila.invitados, "persona invitada", "personas invitadas")));
    });
    var enlaces = $("dueno-enlaces-origen");
    if (enlaces.childElementCount) return;
    Analitica.enlacesOrigen(location.origin + location.pathname).forEach(function (fila) {
      var grupo = el("div");
      var etiqueta = el("label", null, fila.nombre);
      var campo = el("input");
      campo.type = "text";
      campo.readOnly = true;
      campo.value = fila.url;
      campo.id = "dueno-enlace-" + fila.clave;
      etiqueta.htmlFor = campo.id;
      var boton = el("button", "mini", "Copiar");
      boton.type = "button";
      boton.setAttribute("aria-label", "Copiar enlace de " + fila.nombre);
      boton.addEventListener("click", function () { copiarEnlace(fila.url); });
      grupo.append(etiqueta, campo, boton);
      enlaces.append(grupo);
    });
  }

  function pintarAnaliticaDueno(d, ahora) {
    var todas = Dueno.personasVisibles(d.personas, false);
    var personas = Dueno.personasVisibles(todas, ocultarPruebaDueno.checked);
    // Sin una lista completa, los agregados tampoco se pueden filtrar por cuenta.
    var filtrado = ocultarPruebaDueno.checked && (!Array.isArray(d.personas) || personas.length !== todas.length);
    personasDueno = personas;
    if (ocultarPruebaDueno.checked && vistaDueno.filtro === "prueba") vistaDueno.filtro = "todos";
    $("dueno-exportar").disabled = !Array.isArray(d.personas);

    var resumen = d.resumen || {};
    var fechaDatos = Date.parse(d.generado);
    negocioDueno = {
      comparativo: Analitica.comparativoMensual(d, Number.isFinite(fechaDatos) ? fechaDatos : ahora),
      proyeccion: Analitica.proyeccionUsuarios(resumen.registrados, resumen.nuevos30),
      hitos: Analitica.hitosUsuarios(resumen.registrados)
    };
    activosNegocioDueno = resumen.activos30;
    $("dueno-negocio-datos").replaceChildren(contenidoNegocioDueno(negocioDueno, "h3"));
    $("dueno-informe-abrir").disabled = false;
    pintarCostosDueno(false);

    var nuevos = Analitica.nuevosPor(personas, ahora);
    kpisAnaliticaDueno("dueno-nuevos", [["Hoy", nuevos.dia, "", "nuevosHoy"],
      ["Esta semana", nuevos.semana, "", "nuevosSemana"], ["Este mes", nuevos.mes, "", "nuevosMes"]]);
    pintarCrecimientoDueno(d, ahora);

    var uso = Analitica.usoActivo(personas, ahora);
    kpisAnaliticaDueno("dueno-uso", [["Hoy (DAU)", uso.dau, "", "dau"], ["Últimos 7 días (WAU)", uso.wau, "", "wau"],
      ["Últimos 30 días (MAU)", uso.mau, "", "mau"], ["DAU/MAU", textoPorcentajeDueno(uso.porcentaje),
        "De quienes usaron NOVA en 30 días, cuántos volvieron hoy.", "dauMau"]]);
    barrasHorarioDueno("dueno-horas", d.horas, Array.from({ length: 24 }, function (_, i) {
      return String(i).padStart(2, "0") + ":00";
    }), filtrado);
    barrasHorarioDueno("dueno-semana", d.semana, Analitica.etiquetasSemana(), filtrado);

    var segmentos = Analitica.segmentos(personas, ahora);
    listaDueno("dueno-segmentos", [
      ["Nunca anotaron nada", segmentos.sinAnotar], ["En riesgo · más de 14 días sin usar NOVA", segmentos.riesgo],
      ["Fieles · anotaron en 20 de los últimos 30 días o más", segmentos.fieles]
    ], "", function (li, fila) {
      var detalle = el("details"), datos = Analitica.correosSegmento(fila[1]);
      var lista = el("ul", "lista-banco dueno-correos-segmento");
      detalle.append(el("summary", null, fila[0] + " · " + numDueno.format(fila[1].length)), lista);
      datos.correos.forEach(function (correo) { lista.append(el("li", null, correo)); });
      if (!datos.correos.length) lista.append(el("li", "nota", "Nadie en este segmento."));
      if (datos.restantes) lista.append(el("li", "nota", "y " + numDueno.format(datos.restantes) + " más"));
      li.append(detalle);
    });

    kpisAnaliticaDueno("dueno-retencion", Analitica.retencion(personas, ahora).map(function (fila) {
      return ["A " + pl(fila.dias, "día", "días"), textoPorcentajeDueno(fila.porcentaje),
        fila.volvieron + " de " + fila.elegibles + " volvieron", "retencion"];
    }));
    var tabla = $("dueno-cohortes");
    tabla.replaceChildren();
    Analitica.cohortes(personas, ahora).forEach(function (fila) {
      var tr = el("tr"), th = el("th", null, fechaCorta.format(new Date(fila.semana + "T12:00:00")));
      th.scope = "row";
      th.append(el("small", null, pl(fila.total, "persona", "personas")));
      tr.append(th);
      fila.porcentajes.forEach(function (valor) {
        var td = el("td", null, textoPorcentajeDueno(valor));
        if (valor != null) td.style.setProperty("--retencion", valor + "%");
        tr.append(td);
      });
      tabla.append(tr);
    });
    barrasHorizontalesDueno("dueno-embudo", Analitica.embudo(personas), " del paso anterior");
    var funciones = Analitica.adopcion(todas, d.resumen, d.adopcion, filtrado ? null : d.monedas, d.fotos);
    barrasHorizontalesDueno("dueno-adopcion", funciones.funciones, "");
    listaDueno("dueno-monedas", funciones.monedas || [], filtrado ? "No hay un desglose por moneda sin las cuentas de prueba." :
      funciones.monedas ? "No se registraron anotaciones en otras monedas." : "Todavía no hay datos por moneda.", function (li, moneda) {
      li.append(el("span", null, moneda.moneda + " · " + pl(moneda.total, "anotación", "anotaciones")));
    });
    listaDueno("dueno-poco-uso", funciones.pocoUsadas, "Ninguna función con datos está por debajo del 10 %.", function (li, fila) {
      li.append(el("span", null, fila.nombre + " · " + textoPorcentajeDueno(fila.porcentaje)));
    });

    var versiones = filtrado ? Analitica.versionesDe(personas) : d.versiones || Analitica.versionesDe(personas);
    var ultima = Analitica.porcentajeUltimaVersion(versiones);
    $("dueno-ultima-version").textContent = ultima ? "Versión " + ultima.version + " · " +
      textoPorcentajeDueno(ultima.porcentaje) + " de las personas con versión registrada" : "Todavía no hay datos de versiones.";
    pintarVersionesDueno(versiones);
    var apk = Analitica.repartoApk(d.apk && d.apk.porArchivo);
    barrasHorizontalesDueno("dueno-reparto-apk", apk ? [
      { nombre: "APK normal", total: apk.normal, porcentaje: apk.porcentajeNormal },
      { nombre: "APK avanzada", total: apk.avanzada, porcentaje: apk.porcentajeAvanzada }
    ] : [], "");
    if (!apk) $("dueno-reparto-apk").append(el("p", "nota", "Todavía no hay descargas por archivo."));
    listaDueno("dueno-descargas-por-dia", Dueno.descargasRecientes(d.descargasPorDia, d.generado || ahora),
      "Todavía no hay historial.", function (li, fila) {
        var fecha = el("time", null, fechaCorta.format(new Date(fila.dia + "T12:00:00")));
        fecha.dateTime = fila.dia;
        var texto = fila.nuevas === null ? "Medición inicial" : "+" + numDueno.format(fila.nuevas);
        if (fila.dias > 1) texto += " en " + numDueno.format(fila.dias) + " días";
        li.append(fecha, el("span", null, texto));
      });
    pintarPersonasDueno();
  }
  var textosCuentaDueno = {
    cuenta_bloquear: ["Bloquear cuenta", "Sí, bloquear", "Cuenta bloqueada.", "Bloqueo de cuenta"],
    cuenta_desbloquear: ["Desbloquear cuenta", "Sí, desbloquear", "Cuenta desbloqueada.", "Desbloqueo de cuenta"],
    cuenta_reenviar_confirmacion: ["Reenviar correo de confirmación", "Sí, reenviar", "Correo de confirmación reenviado.", "Reenvío de confirmación"],
    cuenta_cerrar_sesiones: ["Cerrar sesión en todos sus dispositivos", "Sí, cerrar sesión", "", "Cierre de sesiones"],
    admin_agregar: ["Agregar administrador", "", "Permiso guardado.", "Permiso de administrador guardado"],
    admin_quitar: ["Quitar administrador", "Sí, quitar", "Administrador quitado.", "Administrador quitado"]
  };
  var confirmacionCuenta = $("dueno-confirmar-cuenta"), correoCuenta = $("dueno-confirmar-correo");
  var enviarCuenta = $("dueno-confirmar-enviar"), cancelarCuenta = $("dueno-confirmar-cancelar");
  var cuentaPendiente = null, actuandoCuenta = false;

  function validarCorreoCuenta() {
    enviarCuenta.disabled = actuandoCuenta || !cuentaPendiente ||
      !Dueno.confirmaCorreo(cuentaPendiente.persona.correo, correoCuenta.value);
  }

  function confirmarCuentaDueno(persona, accion) {
    if (!soyDueno() || !permisosDueno.actuar || actuandoCuenta ||
        (accion === "admin_quitar" && !permisosDueno.gestionarAdmins)) return;
    var textos = textosCuentaDueno[accion];
    cuentaPendiente = { persona: persona, accion: accion };
    $("dueno-confirmar-titulo").textContent = textos[0];
    $("dueno-confirmar-objetivo").textContent = persona.correo;
    enviarCuenta.textContent = textos[1];
    enviarCuenta.classList.toggle("peligro", accion === "cuenta_bloquear");
    correoCuenta.value = "";
    mensaje("dueno-confirmar-mensaje", "");
    validarCorreoCuenta();
    confirmacionCuenta.showModal();
  }

  function datosDeFuncionDueno(res, fallo) {
    if (!res.error && res.data) return res.data;
    var contexto = res.error && res.error.context;
    if (contexto && typeof contexto.json === "function") {
      return contexto.json().catch(function () { return null; }).then(function (cuerpo) {
        throw new Error(cuerpo && typeof cuerpo.error === "string" ? cuerpo.error : fallo);
      });
    }
    throw new Error(fallo);
  }

  function pedirAccionDueno(cuerpo) {
    var fallo = "No se pudo completar la acción.";
    return cliente.functions.invoke("nova-dueno", { body: cuerpo }).then(function (res) {
      return datosDeFuncionDueno(res, fallo);
    }).then(function (res) {
      if (!res.ok) throw new Error(fallo);
      return res;
    });
  }

  function pintarAdminsDueno(admins) {
    if (!permisosDueno.gestionarAdmins) return;
    listaDueno("dueno-admins-lista", admins || [], "Todavía no hay administradores.", function (li, admin) {
      var boton = botonHabito("Quitar", function () { confirmarCuentaDueno(admin, "admin_quitar"); });
      boton.setAttribute("aria-label", "Quitar a " + admin.correo);
      li.append(el("strong", "dueno-correo", admin.correo),
        el("small", "nota", admin.rol === "actuar" ? "Ver y actuar" : "Solo ver"), boton);
    });
  }

  $("dueno-admins-form").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!soyDueno() || !permisosDueno.gestionarAdmins || actuandoCuenta) return;
    var origen = fuente, campo = $("dueno-admins-correo"), selector = $("dueno-admins-rol");
    var boton = $("dueno-admins-agregar");
    actuandoCuenta = campo.disabled = selector.disabled = boton.disabled = true;
    mensaje("dueno-admins-mensaje", "Guardando…");
    pedirAccionDueno({ accion: "admin_agregar", correo: campo.value.trim(), rol: selector.value }).then(function (res) {
      if (origen !== fuente) return;
      campo.value = "";
      mensaje("dueno-admins-mensaje", "Permiso guardado." +
        (res.auditoria === false ? " No se pudo guardar en el historial." : ""));
      return recargarTrasCambioDueno();
    }).catch(function (error) {
      if (origen === fuente) mensaje("dueno-admins-mensaje", error.message, true);
    }).finally(function () {
      actuandoCuenta = campo.disabled = selector.disabled = boton.disabled = false;
    });
  });

  correoCuenta.addEventListener("input", validarCorreoCuenta);
  cancelarCuenta.addEventListener("click", function () { confirmacionCuenta.close(); });
  confirmacionCuenta.addEventListener("cancel", function (e) { if (actuandoCuenta) e.preventDefault(); });
  $("dueno-confirmar-form").addEventListener("submit", function (e) {
    e.preventDefault();
    validarCorreoCuenta();
    if (enviarCuenta.disabled || !soyDueno() || !permisosDueno.actuar) return;
    var cambio = cuentaPendiente, origen = fuente;
    if (cambio.accion === "admin_quitar" && !permisosDueno.gestionarAdmins) return;
    var fallo = "No se pudo completar la acción.";
    actuandoCuenta = true;
    enviarCuenta.disabled = cancelarCuenta.disabled = correoCuenta.disabled = true;
    mensaje("dueno-confirmar-mensaje", "Aplicando el cambio…");
    pedirAccionDueno({ accion: cambio.accion, id: cambio.persona.id }).then(function (res) {
      if (origen !== fuente || !soyDueno()) return;
      confirmacionCuenta.close();
      if (cambio.accion === "cuenta_cerrar_sesiones") {
        mensaje("dueno-ficha-mensaje", res.sesiones ?
          "Se cerró la sesión en " + pl(res.sesiones, "dispositivo", "dispositivos") + "." : "No tenía sesiones abiertas.");
        return;
      }
      if (cambio.accion === "admin_quitar") {
        $("dueno-admins-correo").focus();
        mensaje("dueno-admins-mensaje", "Administrador quitado." +
          (res.auditoria === false ? " No se pudo guardar en el historial." : ""));
        return recargarTrasCambioDueno();
      }
      $("dueno-ficha").close();
      $("dueno-cuenta-mensaje").hidden = false;
      var exito = textosCuentaDueno[cambio.accion][2];
      if (res.auditoria === false) exito += " No se pudo guardar en el historial.";
      mensaje("dueno-cuenta-mensaje", exito);
      toast(exito);
      return recargarTrasCambioDueno();
    }).catch(function (error) {
      if (origen === fuente && soyDueno()) mensaje("dueno-confirmar-mensaje", error.message || fallo, true);
    }).finally(function () {
      actuandoCuenta = false;
      cancelarCuenta.disabled = correoCuenta.disabled = false;
      validarCorreoCuenta();
    });
  });

  function abrirFichaDueno(persona) {
    var ficha = Analitica.fichaUsuario(persona, Date.now());
    $("dueno-ficha-correo").textContent = ficha.correo || "Sin correo";
    var datos = $("dueno-ficha-datos");
    datos.replaceChildren();
    [
      ["Registro", fechaDueno(ficha.registro)], ["Último uso", ficha.ultimoUso ? fechaDueno(ficha.ultimoUso) : "Sin dato"],
      ["Plataforma", ficha.plataforma === "android" ? "Android" : ficha.plataforma === "web" ? "Navegador" : "Sin dato"],
      ["Versión", ficha.version], ["Movimientos anotados", ficha.movimientos], ["Chats con la IA", ficha.chats],
      ["Metas", ficha.metas], ["Espacios", ficha.espacios], ["Días que anotó en los últimos 30", ficha.diasActivos30],
      ["Racha actual de días anotando", ficha.racha]
    ].forEach(function (fila) {
      datos.append(el("dt", null, fila[0]), el("dd", null, fila[1] == null || fila[1] === "" ? "Sin dato" : String(fila[1])));
    });
    if (ficha.origen) datos.append(el("dt", null, "Llegó desde"), el("dd", null, ficha.origen));
    if (ficha.referidoPor) datos.append(el("dt", null, "Invitada por"), el("dd", null, ficha.referidoPor));
    var acciones = $("dueno-ficha-acciones");
    acciones.replaceChildren();
    mensaje("dueno-ficha-mensaje", "");
    var disponibles = permisosDueno.actuar ? Dueno.accionesDeCuenta(persona) : [];
    if (permisosDueno.actuar && persona.id && !persona.dueno) disponibles.push("cuenta_cerrar_sesiones");
    disponibles.forEach(function (accion) {
      var boton = el("button", accion === "cuenta_bloquear" ? "mini peligro" : "mini", textosCuentaDueno[accion][0]);
      boton.type = "button";
      boton.addEventListener("click", function () { confirmarCuentaDueno(persona, accion); });
      acciones.append(boton);
    });
    $("dueno-ficha").showModal();
  }
  ocultarPruebaDueno.addEventListener("change", function () {
    guardarLocal("nova-dueno-ocultar-prueba", ocultarPruebaDueno.checked);
    if (datosAnaliticaDueno && soyDueno()) pintarAnaliticaDueno(datosAnaliticaDueno, Date.now());
  });
  $("dueno-exportar").addEventListener("click", function () {
    if (!soyDueno() || !personasDueno) return;
    var url = URL.createObjectURL(new Blob([Analitica.usuariosACsv(personasDueno, negocioDueno)], { type: "text/csv;charset=utf-8" }));
    var enlace = el("a");
    enlace.href = url;
    enlace.download = "nova-usuarios.csv";
    enlace.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });

  function pintarUsoEventos(datosUso, ahora) {
    var uso = Analitica.prepararUso(datosUso, ahora);
    var mensajeUso = $("dueno-eventos-mensaje");
    mensajeUso.textContent = !uso ? "Las estadísticas de uso no están disponibles." :
      !uso.total ? "Todavía no hay eventos de uso en los últimos 30 días." : "";
    $("dueno-eventos-datos").hidden = !uso || !uso.total;
    var carga = datosUso && datosUso.carga;
    $("dueno-eventos-carga").textContent = carga && carga.n ?
      "Mediana " + Dueno.formatearSegundos(carga.medianaMs) + " · Promedio " + Dueno.formatearSegundos(carga.promedioMs) +
        " · p90 " + Dueno.formatearSegundos(carga.p90Ms) + " · " + pl(carga.n, "apertura medida", "aperturas medidas") :
      "Todavía no hay mediciones.";
    pintarUsoIADueno(datosUso, ahora);
    if (!uso || !uso.total) return;

    var s = uso.sesion;
    kpisAnaliticaDueno("dueno-eventos-kpis", [
      ["Eventos registrados", numDueno.format(uso.total), "", "eventos"],
      ["Sesiones con duración registrada", numDueno.format(s.n), "", "sesiones"],
      ["Duración promedio", s.n ? numDueno.format(s.promedioSeg) + " s" : "Sin dato", "", "promedio"],
      ["Duración mediana", s.n ? numDueno.format(s.medianaSeg) + " s" : "Sin dato", "", "mediana"],
      ["Personas en modo conductor", numDueno.format(uso.conductor), "", "modoConductor"],
      ["Personas con datos de seguridad", numDueno.format(uso.personasSeguridad), "", "seguridad"]
    ]);
    barrasHorizontalesDueno("dueno-eventos-pantallas", uso.pantallas, null, function (fila) {
      return pl(fila.personas, "persona", "personas");
    });
    barrasHorizontalesDueno("dueno-eventos-anotar", uso.anotar, null);
    barrasHorizontalesDueno("dueno-eventos-ia", uso.ia, null);
    pintarDiasIaDueno(uso.dias, ahora);
    barrasHorizontalesDueno("dueno-eventos-tema", uso.tema, null);
    barrasHorizontalesDueno("dueno-eventos-seguridad", uso.seguridad, null);
    var recuadros = uso.recuadros.map(function (fila) {
      var widget = WIDGETS.find(function (w) { return "oculto_" + w.id === fila.id; });
      return Object.assign({}, fila, { nombre: widget ? widget.nombre : fila.nombre });
    });
    barrasHorizontalesDueno("dueno-eventos-recuadros", recuadros, null);
    if (!uso.pantallas.length) $("dueno-eventos-pantallas").append(el("p", "nota", "Sin aperturas registradas."));
    if (!recuadros.length) $("dueno-eventos-recuadros").append(el("p", "nota", "Sin recuadros ocultados."));
  }

  function pintarUsoIADueno(datosUso, ahora) {
    var ia = Analitica.prepararIA(datosUso), rapidez = ia.rapidez;
    $("dueno-eventos-ia-rapidez").textContent = rapidez ?
      "Promedio " + numDueno.format(rapidez.promedioSeg) + " s · Mediana " + numDueno.format(rapidez.medianaSeg) +
        " s · 9 de cada 10 respuestas tardan menos de " + numDueno.format(rapidez.p90Seg + 0.1) + " s" :
      "Todavía no hay tiempos de respuesta registrados.";
    barrasHorizontalesDueno("dueno-eventos-ia-temas", ia.temas, null);
    var top = $("dueno-eventos-ia-top");
    top.replaceChildren();
    ia.top.forEach(function (fila) {
      top.append(el("p", "nota", fila.nombre + " · " + pl(fila.total, "pregunta", "preguntas")));
    });
    if (!ia.temas.length) $("dueno-eventos-ia-temas").append(el("p", "nota", "Todavía no hay temas registrados."));
    if (!ia.top.length) $("dueno-eventos-ia-top").append(el("p", "nota", "Todavía no hay personas en el listado."));
    pintarCupoIADueno(datosUso, ahora);
  }

  function pintarCupoIADueno(datosUso, ahora) {
    var dias = Analitica.cupoIAPorDia(datosUso && datosUso.iaCupoPorDia, ahora, rangoDueno);
    barrasDueno($("dueno-eventos-ia-cupo"), dias, "total", { unidad: ["vez", "veces"] });
  }

  function pintarSaludDueno(salud) {
    salud = salud || {};
    var bd = salud.bd, fotos = salud.fotos, acciones = salud.acciones;
    var barra = $("dueno-bd-barra"), tablas = $("dueno-bd-tablas");
    barra.hidden = !bd;
    $("dueno-bd-tamano").textContent = bd ? Dueno.formatearTamano(bd.bytes) + " de 500 MB del plan gratis" : "Tamaño de la base de datos no disponible.";
    tablas.replaceChildren();
    if (bd) {
      barra.value = Dueno.bytesAMegabytes(bd.bytes);
      Dueno.tablasMasGrandes(bd.tablas).forEach(function (tabla) {
        tablas.append(el("li", null, tabla.tabla + " · " + Dueno.formatearTamano(tabla.bytes)));
      });
    }
    $("dueno-salud-fotos").textContent = fotos ? pl(fotos.archivos, "archivo", "archivos") + " · " +
      Dueno.formatearTamano(fotos.bytes) + (fotos.archivos >= 5000 ? " (conteo limitado a 5.000 archivos)" : "") : "Datos de fotos no disponibles.";
    listaDueno("dueno-salud-acciones", acciones || [], acciones ? "Todavía no hay acciones registradas." : "Historial no disponible.", function (li, fila) {
      var textos = textosCuentaDueno[fila.accion];
      li.append(el("strong", null, textos ? textos[3] : "Acción sobre cuenta"),
        el("p", "banco-texto", fila.correo + " · " + fechaDueno(fila.creado_en)));
    });
  }

  function probarServicioDueno(boton, idMensaje, etiqueta, prueba) {
    if (boton.disabled || !soyDueno() || !permisosDueno.actuar) return;
    var origen = fuente, inicio = performance.now();
    boton.disabled = true;
    $(idMensaje).hidden = false;
    mensaje(idMensaje, etiqueta + " · Probando…");
    function mostrar(texto, error) {
      if (origen !== fuente || !soyDueno()) return;
      mensaje(idMensaje, etiqueta + " · " + texto + ", " + Math.round(performance.now() - inicio) + " ms", error);
    }
    Promise.resolve().then(prueba).then(function (detalle) {
      mostrar("OK" + (detalle ? ", " + detalle : ""));
    }).catch(function (error) {
      mostrar("Falló. " + (error.message || "Intenta de nuevo."), true);
    }).finally(function () { boton.disabled = false; });
  }

  $("dueno-probar-tasas").addEventListener("click", function () {
    probarServicioDueno(this, "dueno-tasas-resultado", "Tasas", function () {
      return cliente.functions.invoke("nova-ia", { body: { tasas: true } }).then(function (res) {
        return datosDeFuncionDueno(res, "No se pudieron consultar las tasas.");
      }).then(function (datos) {
        var monedas = datos.rates && Object.keys(datos.rates).length;
        if (!monedas) throw new Error("La función no devolvió tasas.");
        return pl(monedas, "moneda", "monedas");
      });
    });
  });
  $("dueno-probar-ia").addEventListener("click", function () {
    if (!soyDueno() || !permisosDueno.actuar || !confirm("Esta prueba de IA gasta 1 consulta. ¿Continuar?")) return;
    probarServicioDueno(this, "dueno-ia-resultado", "IA", function () {
      return preguntarEnFlujo({ pregunta: "Escribe únicamente la palabra OK." }, function () {}).then(function (respuesta) {
        if (!/^ok[.!]?$/i.test(respuesta.trim())) throw new Error("La IA no devolvió la respuesta esperada.");
      });
    });
  });

  function pintarCrecimientoDueno(d, ahora) {
    var crecimiento = Array.isArray(d.personas) ? Analitica.crecimientoAcumulado(personasDueno, ahora, rangoDueno) : [];
    barrasDueno($("dueno-crecimiento"), crecimiento, "total", {
      unidad: ["persona registrada", "personas registradas"],
      resumen: "Total acumulado: " + numDueno.format(crecimiento.length ? crecimiento[crecimiento.length - 1].total : 0)
    });
  }
  function pintarDiasIaDueno(dias, ahora) {
    var serie = dias.length ? Dueno.serieDiaria(dias, ahora, rangoDueno, ["total"]) : [];
    barrasDueno($("dueno-eventos-ia-dias"), serie, "total", { unidad: ["consulta", "consultas"] });
  }
  function pintarSeriesDueno(d, ahora) {
    var fechaDatos = Date.parse(d.generado);
    if (!Number.isFinite(fechaDatos)) fechaDatos = ahora;
    var dias = Dueno.serieDiaria(d.dias, fechaDatos, rangoDueno, ["activos", "movimientos", "registros"]);
    $("dueno-rango-activos").textContent = rangoDueno;
    barrasDueno($("dueno-activos"), dias, "activos", { unidad: ["persona", "personas"] });
    barrasDueno($("dueno-movs"), dias, "movimientos", { unidad: ["movimiento", "movimientos"] });
    barrasDueno($("dueno-registros"), dias, "registros", { unidad: ["registro", "registros"] });
    barrasDueno($("dueno-chats"), Dueno.serieDiaria(d.chatsPorDia, fechaDatos, rangoDueno, ["total"]),
      "total", { unidad: ["chat", "chats"] });
    barrasDueno($("dueno-errores"), Dueno.serieDiaria(d.errores && d.errores.porDia, fechaDatos, rangoDueno, ["total"]),
      "total", { unidad: ["error", "errores"] });
  }

  function pintarDueno(d) {
    pintarPermisosDueno(d.miRol);
    pintarAdminsDueno(d.admins);
    var r = d.resumen || {};
    $("dueno-hora").textContent = d.generado ? "Datos de " + fechaDueno(d.generado) + "." : "";
    var kpis = [
      ["👥", r.registrados, "Personas registradas", "+" + r.nuevos7 + " esta semana · " + r.confirmados + " confirmaron el correo", "registrados"],
      ["🔥", r.activos7, "Usaron NOVA (7 días)", r.hoy + " en las últimas 24 horas", "activos7"],
      ["📅", r.activos30, "Usaron NOVA (30 días)", r.conMovimientos + " han anotado algo", "activos30"],
      ["📲", (d.apk || {}).total, "Descargas de la APK", "desde GitHub (no cuenta las de la página)", "apk"],
      ["🤖", r.android, "Abrieron la app Android", r.web + " en el navegador · desde la 1.66", "android"],
      ["🧾", r.movimientos, "Movimientos anotados", "entre todas las personas", "movimientos"],
      ["✦", r.chats, "Chats con NOVA IA", "", "chats"],
      ["🎯", r.metas, "Metas de ahorro", "", "metas"],
      ["👛", r.espacios, "Espacios creados", "", "espacios"],
      ["🚖", r.conductores, "En modo conductor", "", "conductores"]
    ];
    var g = $("dueno-kpis");
    if (g.contains(botonAyudaDueno)) cerrarAyudaDueno();
    g.replaceChildren();
    kpis.forEach(function (k, i) {
      var c = el("div", "dueno-kpi");
      c.append(el("span", "ico", k[0]), el("strong", null, numDueno.format(k[1] || 0)), el("span", null, k[2]));
      if (k[3]) c.append(el("small", null, k[3]));
      agregarAyudaDueno(c, k[4], k[2], "dueno-kpis-ayuda-" + i);
      g.append(c);
    });
    var ahora = Date.now(), errores = d.errores || {};
    pintarSeriesDueno(d, ahora);
    registrosMetaDueno = Dueno.registrosParaMeta(r.nuevos30, Array.isArray(d.dias) ? d.dias : []);
    pintarMetaDueno();
    pintarEstadoDueno(d.estado);
    pintarAtribucionDueno(d);
    pintarSaludDueno(d.salud);
    pintarListasDueno(d, errores);
    pintarUsoEventos(d.uso, d.generado || ahora);
    datosAnaliticaDueno = d;
    pintarAnaliticaDueno(d, ahora);
  }
  function pintarPersonasDueno() {
    if (!personasDueno) return;
    var ahora = Date.now();
    var personas = window.NovaDueno.filtrarPersonas(personasDueno, vistaDueno, ahora);
    var conteos = window.NovaDueno.contarFiltros(personasDueno, ahora);
    botonesFiltrosDueno.forEach(function (boton, i) {
      var filtro = filtrosDueno[i];
      boton.textContent = filtro[1] + " (" + numDueno.format(conteos[filtro[0]]) + ")";
      boton.hidden = filtro[0] === "prueba" && ocultarPruebaDueno.checked;
      boton.setAttribute("aria-pressed", String(vistaDueno.filtro === filtro[0]));
    });
    $("dueno-conteo").textContent = "Mostrando " + numDueno.format(personas.length) + " de " + numDueno.format(conteos.todos) + " personas";
    var ul = $("dueno-personas"); ul.replaceChildren();
    if (!personas.length) ul.append(el("li", "vacio", "Nadie coincide con la búsqueda."));
    personas.forEach(function (p) {
      var li = el("li", "banco-item dueno-persona"), cab = el("div", "banco-cab");
      var app = el("button", "banco-app dueno-abrir-ficha");
      app.type = "button";
      var icono = el("span", "dueno-emoji", p.dueno ? "👑" : p.prueba ? "🧪" : "👤");
      icono.setAttribute("aria-hidden", "true");
      app.append(icono, el("span", "dueno-correo", p.correo || "Sin correo"));
      app.addEventListener("click", function () { abrirFichaDueno(p); });
      cab.append(app, el("small", null, p.ultimoUso ? "usó " + cuandoBanco(Date.parse(p.ultimoUso)) : "nunca entró"));
      var det = "Se registró el " + fechaDueno(p.registro) + (p.confirmado ? "" : " · no ha confirmado el correo") + (p.prueba ? " · cuenta de prueba" : "");
      var chips = el("div", "dueno-chips");
      [p.bloqueado ? "Bloqueada" : "", p.plataforma === "android" ? "📱 Android" + (p.version ? " " + p.version : "") : p.plataforma === "web" ? "🌐 Navegador" : "",
        pl(p.movimientos, "movimiento", "movimientos"), p.chats ? pl(p.chats, "chat IA", "chats IA") : "", p.metas ? pl(p.metas, "meta", "metas") : "", p.espacios ? pl(p.espacios, "espacio", "espacios") : "", p.conductor ? "🚖 conductor" : ""]
        .filter(Boolean).forEach(function (t) { chips.append(el("span", null, t)); });
      li.append(cab, el("p", "banco-texto", det), chips);
      ul.append(li);
    });
  }
  // Pide los datos del panel. Si el servidor dice que la sesión venció (401), la renueva y vuelve a intentar una vez.
  function pedirDueno(reintento, origen, automatica) {
    if (origen !== fuente || !panelDuenoAbierto() || (automatica && (document.hidden || !autoDueno.checked))) {
      return Promise.resolve(null);
    }
    return cliente.functions.invoke("nova-dueno", { body: {} }).then(function (res) {
      var estado = res.error && res.error.context && res.error.context.status;
      if (estado === 401 && !reintento && origen === fuente && panelDuenoAbierto() &&
          (!automatica || (!document.hidden && autoDueno.checked))) {
        return cliente.auth.refreshSession().then(function () { return pedirDueno(true, origen, automatica); });
      }
      if (estado === 401 || estado === 403) { var e = new Error("sesion"); e.estado = estado; throw e; }
      if (res.error || !res.data || typeof res.data !== "object") throw new Error("sin datos");
      return res.data;
    });
  }
  var cargaDueno, origenCargaDueno, visitaPendienteDueno, origenPanelDueno;
  var relojDueno, actualizadoDueno = 0, proximaCargaDueno = 0;
  var autoDueno = $("dueno-auto");
  var resumenDueno = leerLocal("nova-dueno-resumen", false) === true;
  var negocioAbiertoEnDetalle = $("dueno-negocio").open;

  function panelDuenoAbierto() { return soyDueno() && fuente === origenPanelDueno && !panelDueno.hidden; }
  function pintarModoDueno() {
    panelDueno.classList.toggle("dueno-resumen", resumenDueno);
    $("dueno-modo-resumen").setAttribute("aria-pressed", String(resumenDueno));
    $("dueno-modo-detalle").setAttribute("aria-pressed", String(!resumenDueno));
    $("dueno-negocio").open = resumenDueno || negocioAbiertoEnDetalle;
  }
  function cambiarModoDueno(resumen) {
    if (resumen === resumenDueno) return;
    if (!resumenDueno) negocioAbiertoEnDetalle = $("dueno-negocio").open;
    cerrarEtiquetaDueno();
    cerrarAyudaDueno();
    resumenDueno = resumen;
    guardarLocal("nova-dueno-resumen", resumen);
    pintarModoDueno();
  }
  function registrarVisitaDueno(personas) {
    if (!visitaPendienteDueno || !Array.isArray(personas)) return;
    var visita = visitaPendienteDueno;
    visitaPendienteDueno = null;
    var nuevos = Dueno.nuevosDesdeVisita(personas, visita.anterior, visita.ahora);
    var cuadro = $("dueno-nuevas-visita");
    cuadro.hidden = !nuevos;
    cuadro.textContent = nuevos ? pl(nuevos, "persona nueva", "personas nuevas") +
      " desde tu última visita (" + fechaPanel.format(new Date(visita.anterior)) + ")." : "";
    guardarLocal(visita.clave, visita.ahora);
  }

  function pintarActualizadoDueno() {
    $("dueno-actualizado").textContent = actualizadoDueno ?
      "Actualizado hace " + Math.max(0, Math.floor((Date.now() - actualizadoDueno) / 1000)) + " s" : "";
  }
  function pasoRelojDueno() {
    if (!panelDuenoAbierto() || document.hidden) {
      detenerRelojDueno();
      return;
    }
    pintarActualizadoDueno();
    if (autoDueno.checked && !cargaDueno && Date.now() >= proximaCargaDueno) cargarDueno(true);
  }
  function detenerRelojDueno() {
    clearInterval(relojDueno);
    relojDueno = null;
  }
  function sincronizarRelojDueno() {
    detenerRelojDueno();
    if (!panelDuenoAbierto() || document.hidden) return;
    pasoRelojDueno();
    relojDueno = setInterval(pasoRelojDueno, 1000);
  }
  function cargarDueno(automatica) {
    if (!panelDuenoAbierto()) return;
    var origen = fuente;
    if (cargaDueno) return origenCargaDueno === origen ? cargaDueno : cargaDueno.then(function () {
      if (origen === fuente) return cargarDueno(automatica);
    });
    origenCargaDueno = origen;
    proximaCargaDueno = Date.now() + 60000;
    if (automatica !== true || !actualizadoDueno) mensaje("dueno-mensaje", "Cargando los datos…");
    $("dueno-recargar").disabled = true;
    cargaDueno = Promise.resolve().then(function () {
      return pedirDueno(false, origen, automatica === true);
    }).then(function (datosDueno) {
      if (!datosDueno || origen !== fuente || !panelDuenoAbierto()) return;
      pintarDueno(datosDueno);
      registrarVisitaDueno(datosDueno.personas);
      actualizadoDueno = Date.now();
      pintarActualizadoDueno();
      mensaje("dueno-mensaje", "");
    }).catch(function (e) {
      if (origen !== fuente || !panelDuenoAbierto()) return;
      if (e && e.estado === 401) mensaje("dueno-mensaje", "Tu sesión venció. Cierra sesión en Ajustes y vuelve a entrar con tu correo.", true);
      else if (e && e.estado === 403) {
        pintarPermisosDueno();
        mensaje("dueno-mensaje", "Esta cuenta no tiene acceso al panel.", true);
      }
      else mensaje("dueno-mensaje", "No se pudieron cargar los datos. Revisa tu conexión e intenta otra vez.", true);
    }).finally(function () {
      cargaDueno = origenCargaDueno = null;
      $("dueno-recargar").disabled = false;
    });
    return cargaDueno;
  }
  function recargarTrasCambioDueno() {
    var origen = fuente;
    return Promise.resolve(cargaDueno).then(function () {
      if (origen === fuente) return cargarDueno();
    });
  }
  function abrirPanelDueno() {
    if (!soyDueno() || !panelDueno.hidden) return;
    var clave = "nova-dueno-ultima-visita:" + fuente.usuarioEventos;
    visitaPendienteDueno = { clave: clave, anterior: leerLocal(clave, null), ahora: Date.now() };
    $("dueno-nuevas-visita").hidden = true;
    pintarPlantillasDueno();
    origenPanelDueno = fuente;
    abrirCapa("pantalla-dueno");
    cargarDueno();
    sincronizarRelojDueno();
  }
  function limpiarSesionDueno() {
    detenerRelojDueno();
    pintarPermisosDueno();
    mensaje("dueno-admins-mensaje", "");
    origenPanelDueno = visitaPendienteDueno = datosAnaliticaDueno = personasDueno = null;
    actualizadoDueno = 0;
    pintarActualizadoDueno();
  }

  $("dueno-apk-avanzada").href = enlaceDescarga("NOVA-avanzada.apk");
  $("btn-dueno").addEventListener("click", abrirPanelDueno);
  $("dueno-recargar").addEventListener("click", function () { cargarDueno(); });
  $("dueno-rango").value = String(rangoDueno);
  $("dueno-rango").addEventListener("change", function () {
    rangoDueno = Dueno.rangoDias(Number(this.value));
    guardarLocal("nova-dueno-rango", rangoDueno);
    if (!datosAnaliticaDueno || !panelDuenoAbierto()) return;
    var d = datosAnaliticaDueno, ahora = Date.now(), fechaUso = d.generado || ahora;
    pintarSeriesDueno(d, ahora);
    pintarCrecimientoDueno(d, ahora);
    var uso = Analitica.prepararUso(d.uso, fechaUso);
    if (uso && uso.total) pintarDiasIaDueno(uso.dias, fechaUso);
    pintarCupoIADueno(d.uso, fechaUso);
  });
  $("dueno-modo-resumen").addEventListener("click", function () { cambiarModoDueno(true); });
  $("dueno-modo-detalle").addEventListener("click", function () { cambiarModoDueno(false); });
  pintarModoDueno();
  autoDueno.checked = leerLocal("nova-dueno-auto", false) === true;
  autoDueno.addEventListener("change", function () {
    guardarLocal("nova-dueno-auto", autoDueno.checked);
    proximaCargaDueno = Date.now() + 60000;
  });
  document.addEventListener("visibilitychange", sincronizarRelojDueno);
  $("dueno-copiar").addEventListener("click", function () {
    if (!panelDuenoAbierto()) return;
    var url = location.origin + location.pathname + "#panel";
    Promise.resolve().then(function () { return navigator.clipboard.writeText(url); }).then(function () {
      toast("Enlace copiado");
    }).catch(function () {
      if (panelDuenoAbierto()) window.prompt("Copia el enlace al panel", url);
    });
  });
  if (filtrosDueno.some(function (filtro) { return filtro[0] === vistaDuenoGuardada.filtro; })) {
    vistaDueno.filtro = vistaDuenoGuardada.filtro;
  }
  var botonesFiltrosDueno = filtrosDueno.map(function (filtro) {
    var boton = el("button", null, filtro[1]);
    boton.type = "button";
    boton.setAttribute("aria-pressed", String(vistaDueno.filtro === filtro[0]));
    boton.addEventListener("click", function () {
      vistaDueno.filtro = filtro[0];
      guardarVistaDueno();
    });
    $("dueno-filtros").append(boton);
    return boton;
  });
  $("dueno-buscar").addEventListener("input", function (e) {
    vistaDueno.texto = e.target.value;
    pintarPersonasDueno();
  });
  var ordenDueno = $("dueno-orden");
  ordenDueno.value = vistaDuenoGuardada.orden || vistaDueno.orden;
  vistaDueno.orden = ordenDueno.value || "uso";
  ordenDueno.value = vistaDueno.orden;
  ordenDueno.addEventListener("change", function () {
    vistaDueno.orden = ordenDueno.value;
    guardarVistaDueno();
  });

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
  function abrirCalendario(ctx, dia) {
    var ref = new Date();
    if (ctx === "inicio") ref = rangoInicio().desde;
    else if (ctx === "analisis") ref = A.desplazar(cicloDeAnalisis(), new Date(), desfaseAnalisis).desde;
    calVista.ctx = ctx; calVista.anio = ref.getFullYear(); calVista.mes = ref.getMonth(); calVista.dia = dia || null;
    if (ctx === "buscar") {   // abre en el mes del resultado más reciente
      var r = resultadosBusqueda().filter(function (m) { return m.estado !== "pendiente"; });
      if (r.length) { var f = new Date(r.reduce(function (a, m) { return new Date(m.fecha) > new Date(a.fecha) ? m : a; }).fecha); calVista.anio = f.getFullYear(); calVista.mes = f.getMonth(); }
    }
    calVista.tipo = dia ? "gasto" : ctx === "trabajo" && !leerLocal("nova-cal-tipo") ? "ingreso" : leerLocal("nova-cal-tipo") || "gasto";
    abrirCapa("pantalla-calendario");
    pintarCalendario();
  }
  function montoCorto(v) {
    if (ocultos) return "•";
    if (monedaVista !== "COP") return dinero(v);
    if (v >= 1000000) return "$" + numeroCO.format(Math.round(v / 100000) / 10) + " M";
    if (v >= 1000) return "$" + Math.round(v / 1000) + " mil";
    return dinero(v);
  }
  function fechaDelDia(clave) {
    var p = clave.split("-").map(Number), d = new Date(p[0], p[1] - 1, p[2]);
    return new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" }).format(d);
  }
  function pintarDiasCalendario(grilla, c, esGasto, elegido, elegir) {
    grilla.replaceChildren();
    for (var i = 0; i < c.hueco; i++) grilla.append(el("span", "cal-vacio"));
    c.dias.forEach(function (x) {
      var valor = esGasto ? x.gastos : x.ingresos;
      var nivel = ocultos ? 0 : esGasto ? x.nivel : x.nivelIngreso;
      var b = el("button", "cal-celda n" + nivel + (esGasto ? "" : " ing") + (x.hoy ? " hoy" : "") + (x.futuro ? " futuro" : "") + (elegido === x.clave ? " elegido" : ""));
      b.type = "button";
      b.dataset.dia = x.clave;
      b.append(el("span", "cal-num", String(x.dia)), el("span", "cal-valor", valor > 0 ? montoCorto(valor) : ocultos || x.futuro ? "" : esGasto ? "✓" : ""));
      b.setAttribute("aria-label", fechaDelDia(x.clave) + ": " + (valor > 0 ? (ocultos ? (esGasto ? "con gastos" : "con ingresos") : (esGasto ? "gastaste " : "ganaste ") + dinero(valor)) : x.futuro ? "todavía no llega" : esGasto ? "no gastaste" : "sin ingresos"));
      b.setAttribute("aria-pressed", String(elegido === x.clave));
      b.addEventListener("click", function () { elegir(x.clave); });
      grilla.append(b);
    });
  }
  function explicarCalendario(destino, cal, tipo) {
    var clave = tipo === "gasto" ? "gastos" : "ingresos";
    explicarGrafico(destino, "Calendario de " + clave, cal.nombre, [["Total del mes", cal[clave]]].concat(
      cal.dias.filter(function (dia) { return dia[clave]; }).map(function (dia) { return [dia.clave, dia[clave]]; })
    ));
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

    var leyenda = document.querySelector("#pantalla-calendario .cal-leyenda");
    leyenda.hidden = ocultos;
    leyenda.classList.toggle("ing", !esGasto);
    pintarDiasCalendario($("cal-dias"), c, esGasto, calVista.dia, function (clave) {
      calVista.dia = calVista.dia === clave ? null : clave;
      pintarCalendario();
      var boton = $("cal-dias").querySelector('[data-dia="' + clave + '"]');
      if (boton) boton.focus({ preventScroll: true });
      if (calVista.dia) $("cal-detalle").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    var acciones = $("cal-grafico-acciones");
    acciones.replaceChildren();
    explicarCalendario(acciones, c, calVista.tipo);

    var cont = $("cal-detalle"); cont.replaceChildren();
    var elegido = calVista.dia && c.dias.find(function (x) { return x.clave === calVista.dia; });
    if (!elegido) { cont.append(el("p", "nota", "Toca un día para ver sus movimientos.")); return; }
    var cab = el("div", "seccion-cabecera");
    cab.append(el("h2", "cal-dia-titulo", fechaDelDia(elegido.clave)));
    cont.append(cab);
    var t = el("p", "nota", elegido.cantidad && !ocultos ? "Gastos " + dinero(elegido.gastos) + " · Ingresos " + dinero(elegido.ingresos) : elegido.movimientos.length ? "" : "Este día no tiene movimientos.");
    if (t.textContent) cont.append(t);
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
        .catch(function () { pintarMensaje(aviso, "No se pudo mostrar la foto (¿sin internet?).", true); });
    }
    var archivo = el("input"); archivo.type = "file"; archivo.accept = "image/*"; archivo.hidden = true;
    archivo.setAttribute("aria-label", "Seleccionar imagen: " + opc.titulo);
    var agregar = el("button", "mini", m.foto_ruta ? "🔄 Cambiar foto" : "📷 Agregar foto"); agregar.type = "button";
    var quitar = el("button", "mini", "🗑 Quitar foto"); quitar.type = "button"; quitar.hidden = !m.foto_ruta;
    agregar.addEventListener("click", function () {
      if (!puede) { pintarMensaje(aviso, "La foto se puede agregar cuando tengas internet y ya esté enviado.", true); return; }
      archivo.click();
    });
    archivo.addEventListener("change", function () {
      var f = archivo.files && archivo.files[0]; archivo.value = "";
      if (!f) return;
      agregar.disabled = true; pintarMensaje(aviso, "Guardando la foto…");
      var vieja = m.foto_ruta;
      achicarFoto(f).then(function (blob) { return fuente.fotos.subir(blob, opc.clave + "-" + m.id); })
        .then(function (ruta) { return fuente.actualizar(opc.tabla, m.id, { foto_ruta: ruta }).then(function (n) { Object.assign(m, n); return vieja ? fuente.fotos.borrar(vieja) : null; }); })
        .then(function () { toast("¡Foto guardada!", opc.nombre(m)); vivo = false; opc.repintar(); })
        .catch(function (err) { pintarMensaje(aviso, "No se pudo guardar la foto: " + err.message, true); })
        .finally(function () { agregar.disabled = false; });
    });
    quitar.addEventListener("click", function () {
      if (!confirm("¿Quitar esta foto?")) return;
      var vieja = m.foto_ruta;
      fuente.actualizar(opc.tabla, m.id, { foto_ruta: null }).then(function (n) { Object.assign(m, n); return fuente.fotos.borrar(vieja); })
        .then(function () { toast("Foto quitada"); vivo = false; opc.repintar(); })
        .catch(function (err) { pintarMensaje(aviso, "No se pudo quitar: " + err.message, true); });
    });
    var fila = el("div", "det-foto-botones"); fila.append(agregar, quitar, archivo);
    if (opc.productos && m.foto_ruta && puede) {
      var sep = el("button", "mini", "🧾 Separar los productos"); sep.type = "button";
      var lista = el("div", "productos-recibo");
      sep.addEventListener("click", function () {
        if (!iaDisponible()) { pintarMensaje(aviso, "La IA no está disponible ahora mismo.", true); return; }
        sep.disabled = true; pintarMensaje(aviso, "✦ La IA está leyendo el recibo…"); lista.replaceChildren();
        fuente.fotos.url(m.foto_ruta).then(function (u) { return fetch(u); }).then(function (r) { return r.blob(); })
          .then(function (blob) { return new Promise(function (ok, mal) { var fr = new FileReader(); fr.onload = function () { ok(String(fr.result).split(",")[1] || ""); }; fr.onerror = function () { mal(new Error("No se pudo leer la foto.")); }; fr.readAsDataURL(blob); }); })
          .then(function (b64) { return invocarIA({ productos: true, imagen: b64, mime: "image/jpeg" }); })
          .then(function (d) {
            aviso.textContent = "";
            var items = d.productos || [];
            if (!items.length) { pintarMensaje(aviso, "No pude leer productos en esta foto. Prueba con una foto más cercana y con buena luz.", true); return; }
            var ul = el("ul", "lista-simple");
            items.forEach(function (x) { var li = el("li", "consejo"); var t = el("div"); t.append(el("strong", null, (x.cantidad > 1 ? x.cantidad + "× " : "") + x.nombre), el("small", null, ocultos ? "••••" : pesos.format(x.valor))); li.append(t); ul.append(li); });
            lista.append(el("p", "calc-res", (d.comercio ? d.comercio + " · " : "") + items.length + (items.length === 1 ? " producto" : " productos")), ul);
            var guardar = el("button", "mini", "📝 Guardar en la nota"); guardar.type = "button";
            guardar.addEventListener("click", function () {
              var txt = "Productos: " + items.map(function (x) { return (x.cantidad > 1 ? x.cantidad + " " : "") + x.nombre + " " + pesos.format(x.valor); }).join(", ");
              var base = m.nota ? m.nota + "\n" : "", nota = (base + txt).slice(0, 500);
              guardar.disabled = true;
              fuente.actualizar("movimientos", m.id, { nota: nota }).then(function (n) { Object.assign(m, n); toast("¡Guardado en la nota!", opc.nombre(m)); opc.repintar(); })
                .catch(function (err) { guardar.disabled = false; pintarMensaje(aviso, "No se pudo guardar: " + err.message, true); });
            });
            lista.append(guardar);
          })
          .catch(function (err) { pintarMensaje(aviso, (err && err.message) || "No se pudo leer el recibo.", true); })
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
      var uso = usoActivoEventos();
      fuente.crear("movimientos", fila).then(function (n) { registrarEventoDe(uso, "anotar", "rapido"); datos.movimientos.push(n); ordenarMovimientos(); toast("¡Repetido!", n.descripcion, dinero(num(n.monto)), deshacerRegistro(n, 0)); pintar();
        if (n.tipo === "gasto") avisarGastoAlto(n);
      })
        .catch(function (err) { toast("No se pudo repetir: " + err.message); }).finally(function () { repetir.disabled = false; });
    });
    var duplicar = el("button", "mini", "Duplicar"); duplicar.type = "button";
    duplicar.addEventListener("click", function () { duplicarMovimiento(m); });
    var acciones = el("div", "det-acciones");
    acciones.append(repetir, duplicar);
    cont.append(acciones);

    // Etiquetas: se quitan con la x y se agregan escribiéndolas o tocando una sugerencia
    var tagCaja = el("article", "tarjeta det-etiquetas"), actuales = m.etiquetas || [];
    function guardarEtiquetas(lista) {
      return fuente.actualizar("movimientos", m.id, { etiquetas: lista }).then(function (n) { Object.assign(m, n); pintar(); }).catch(function (err) { pintarDetalle(); toast("No se pudo guardar: " + err.message); });
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
    if (m.tipo === "gasto" && !m.transferencia) {
      var ded = el("div", "formulario"), selector = el("select"), label = el("label", null, "Deducible");
      selector.id = "det-deducible";
      label.htmlFor = selector.id;
      llenarTiposDeducibles(selector);
      selector.value = A.tipoDeducible(actuales);
      selector.addEventListener("change", function () {
        selector.disabled = true;
        guardarEtiquetas(A.etiquetasDeducible(m.etiquetas, selector.value)).finally(function () { selector.disabled = false; });
      });
      ded.append(label, selector);
      tagCaja.append(ded);
    }
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
  function invocarIA(cuerpo, via) {
    if (!enLinea()) return Promise.reject(new Error("Sin internet: la IA necesita conexión. Todo lo demás de NOVA sigue funcionando sin internet."));
    // Si la IA no contesta en 50 segundos, se avisa en vez de dejar "Pensando…" para siempre.
    var uso = usoActivoEventos(), aviso;
    registrarEventoDe(uso, "ia", cuerpo.imagen ? "pregunta_foto" : via === "voz" ? "pregunta_voz" : "pregunta_texto");
    var tiempo = new Promise(function (_, mal) { aviso = setTimeout(function () { mal(errorIA(408, "La IA tardó demasiado. Revisa tu conexión e intenta otra vez.")); }, 50000); });
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
    return Promise.race([llamada, tiempo]).catch(function (e) {
      registrarErrorIA(uso, e);
      throw e;
    }).finally(function () { clearTimeout(aviso); });
  }
  function errorIA(estado, detalle) {
    var error = new Error(detalle);
    error.estado = estado;
    return error;
  }
  function registrarErrorIA(uso, error) {
    var estado = error && error.estado;
    registrarEventoDe(uso, "ia", estado === 429 ? "error_cupo" : estado === 408 || estado === 504 ? "error_tiempo" : "error_otro");
  }
  // Respuesta en vivo del chat: el texto aparece a medida que la IA lo escribe (no hay que esperar a que termine).
  function mensajeDeFalloIA(estado, detalle) {
    return estado === 503 ? "La IA todavía no tiene su clave de Google en Supabase."
      : estado === 429 ? "Se acabó el cupo gratis de la IA por hoy. Intenta mañana."
      : "La IA no pudo responder. Intenta otra vez en un momento." + (detalle ? " (" + detalle + ")" : "");
  }
  function preguntarEnFlujo(cuerpo, alTexto, externo, vigente, alEnviar) {
    if (!enLinea()) return Promise.reject(new Error("Sin internet: la IA necesita conexión. Todo lo demás de NOVA sigue funcionando sin internet."));
    return cliente.auth.getSession().then(function (s) {
      var token = s.data && s.data.session && s.data.session.access_token;
      if (!token) throw new Error("Vuelve a iniciar sesión para usar la IA.");
      if ((externo && externo.signal.aborted) || (vigente && !vigente())) return "";
      var control = new AbortController(), aviso = setTimeout(function () { control.abort(); }, 50000);
      if (externo) externo.signal.addEventListener("abort", function () { control.abort(); });
      if (alEnviar) alEnviar();
      return fetch(cfg.supabaseUrl + "/functions/v1/nova-ia", {
        method: "POST", signal: control.signal,
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, apikey: cfg.supabaseKey },
        body: JSON.stringify(Object.assign({ stream: true }, cuerpo))
      }).then(function (r) {
        if (!r.ok) {
          return r.json().catch(function () { return {}; }).then(function (c) {
            if (r.status === 503) iaActiva = false;
            throw errorIA(r.status, mensajeDeFalloIA(r.status, c && c.detalle));
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
        if (e && e.name === "AbortError") throw errorIA(408, "La IA tardó demasiado. Revisa tu conexión e intenta otra vez.");
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
  function preguntarIA(entrada, via) {
    if (!iaDisponible()) return Promise.reject(new Error("IA no disponible"));
    return invocarIA(cuerpoIA(entrada), via).then(function (d) {
      if (!(d.monto > 0)) throw new Error("La IA no encontró el valor");
      return registroDeIA(d);
    });
  }

  // ---------- NOVA IA: conversaciones guardadas ----------
  // Cada pregunta lleva un resumen de los datos de la persona; la conversación se guarda en su cuenta.
  var chatActual = { id: null, titulo: "", mensajes: [] };
  var fotoChat = "", seleccionFotoChat = 0;
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

  // ---------- Texto de NOVA IA: cuadros (tablas), fuentes y precio ----------
  // La IA puede responder con un cuadro (filas con | entre columnas), con las páginas de internet que usó
  // ([[FUENTE:título|enlace]]) y, si la pregunta es de una compra, con el precio que encontró ([[PRECIO:valor|producto]]).
  // Esas marcas no se muestran: se quitan del texto y se usan para las fuentes y el cuadro «¿Me alcanza?».
  function marcasIA(texto) {
    var t = String(texto || ""), precio = null, producto = "", fuentes = [], sinWeb = /\[\[SINWEB\]\]/.test(t);
    t = t.replace(/\[\[SINWEB\]\]/g, "");
    t = t.replace(/\[\[PRECIO:\s*([\d.,]+)\s*(?:\|([^\]]*))?\]\]/g, function (_m, v, n) { precio = Number(String(v).replace(/[.,]/g, "")); producto = (n || "").trim(); return ""; });
    t = t.replace(/\[\[FUENTE:([^|\]]*)\|([^\]\s]+)\]\]/g, function (_m, titulo, url) { if (/^https:\/\//.test(url) && fuentes.length < 5 && !fuentes.some(function (f) { return f.url === url; })) fuentes.push({ titulo: titulo.trim() || url, url: url }); return ""; });
    t = t.replace(/\[\[[^\]]*$/, "");                 // una marca a medio llegar (mientras la respuesta va en vivo)
    t = t.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#{1,6}\s*/gm, "").replace(/\n{3,}/g, "\n\n").trim();
    return { texto: t, precio: precio > 0 ? precio : null, producto: producto, fuentes: fuentes, sinWeb: sinWeb };
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
    if (m.sinWeb) {
      var aviso = el("div", "ia-fuentes");
      aviso.append(el("small", null, "🌐 Ahora no pude buscar en internet, así que no tengo el precio de hoy. Escríbeme cuánto cuesta y hago la cuenta contigo."));
      li.append(aviso);
    }
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
  function burbuja(clase, texto, imagen) {
    var li = el("li", clase);
    if (imagen) {
      var miniatura = el("img");
      miniatura.src = "data:image/jpeg;base64," + imagen;
      miniatura.alt = "Foto enviada";
      li.append(miniatura);
    }
    li.append(texto);
    $("chat").append(li);
    li.scrollIntoView({ block: "nearest" });
    return li;
  }
  function ultimaRespuestaNova() {
    if (!chatActual) return null;
    for (var i = chatActual.mensajes.length - 1; i >= 0; i--) {
      if (chatActual.mensajes[i].rol === "nova") return chatActual.mensajes[i];
    }
    return null;
  }

  function actualizarBotonNota() {
    $("chat-guardar-nota").hidden = ocultos || !ultimaRespuestaNova();
  }

  function pintarNotasNova() {
    var lista = $("notas-nova-lista");
    lista.replaceChildren();
    if (ocultos || !fuente) return;
    var clave = claveComodidad("notas-nova");
    var notas = NovaHerramientas.actualizarNotas(leerLocal(clave, []));
    if (!notas.length) lista.append(el("li", "vacio", "Todavía no hay notas guardadas."));
    notas.forEach(function (n) {
      var fila = el("li", "tarjeta formulario");
      fila.append(el("small", "nota", fechaCorta.format(new Date(n.fecha))),
        el("p", "nota-nova-texto", marcasIA(n.texto).texto),
        botonHabito("Borrar nota", function () {
          if (ocultos || !fuente || clave !== claveComodidad("notas-nova")) return;
          var nuevas = NovaHerramientas.actualizarNotas(leerLocal(clave, []), { borrar: n.id });
          if (!guardarLocal(clave, nuevas)) return toast("No se pudo borrar la nota");
          pintarNotasNova();
          toast("Nota borrada");
        }));
      lista.append(fila);
    });
  }

  $("chat-guardar-nota").addEventListener("click", function () {
    if (ocultos || !fuente) return;
    var respuesta = ultimaRespuestaNova();
    if (!respuesta) return;
    var clave = claveComodidad("notas-nova");
    var nota = { id: idLocal(), texto: respuesta.texto, fecha: new Date().toISOString() };
    if (!nota.texto.trim()) return;
    var notas = NovaHerramientas.actualizarNotas(leerLocal(clave, []), { nota: nota });
    toast(guardarLocal(clave, notas) ? "Nota guardada" : "No se pudo guardar la nota");
  });
  $("chat-ver-notas").addEventListener("click", function () {
    pintarNotasNova();
    abrirCapa("pantalla-notas-nova");
  });

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
    actualizarBotonNota();
    $("chat-bienvenida").hidden = chatActual.mensajes.length > 0;
    $("chat-titulo").textContent = chatActual.titulo || "Nueva conversación";
    $("chat-borrar").hidden = !chatActual.id;
    var sug = $("chat-sugerencias");
    sug.replaceChildren();
    A.preguntasSugeridas(datos.movimientos, datos.metas, new Date()).forEach(function (t) {
      var b = el("button", "sugerencia", t); b.type = "button";
      b.addEventListener("click", function () { preguntarNova(t); });
      sug.append(b);
    });
  }
  function abrirChat(conv) {
    chatActual = conv ? { id: conv.id, titulo: conv.titulo, mensajes: (conv.mensajes || []).slice() } : { id: null, titulo: "", mensajes: [] };
    limpiarFotoChat();
    mensaje("chat-mensaje", "");
    $("chat-pregunta").value = "";
    pintarChat();
    abrirCapa("pantalla-chat");
    cargarConfigNube();
    var ol = $("chat"); setTimeout(function () { ol.scrollTop = ol.scrollHeight; }, 30);
  }
  function reiniciarChat() {
    chatActual = { id: null, titulo: "", mensajes: [] };
    limpiarFotoChat();
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
  function preguntarNova(pregunta, opciones) {
    pregunta = String(pregunta || "").trim();
    if (!pregunta) return;
    opciones = opciones || {};
    var soloCifras = opciones.grafico || opciones.agregados;
    if ((ocultos && soloCifras) || (opciones.vigente && !opciones.vigente())) return;
    var imagen = opciones.imagen;
    var textoVisible = (opciones.porVoz ? "🎤 " : "") + pregunta;
    if (!cliente || !fuente || fuente.demo) {
      // En la demostración la IA no responde, pero la tarjeta con los números sí sale.
      var tDemo = imagen || soloCifras ? null : tarjetaIA(pregunta); // con foto, la pregunta es sobre la imagen, no sobre tus números
      $("chat-bienvenida").hidden = true;
      burbuja("yo", textoVisible, imagen); $("chat-pregunta").value = "";
      if (opciones.grafico) burbuja("nova", "En la demostración puedes ver arriba las cifras del gráfico. Inicia sesión para recibir su explicación.");
      if (tDemo) { burbuja("nova", "En la demostración la IA no escribe respuestas, pero mira tus números:"); $("chat").append(tDemo); tDemo.scrollIntoView({ block: "nearest" }); }
      mensaje("chat-mensaje", opciones.grafico ? "" : "Inicia sesión con tu cuenta para que la IA te responda.", !tDemo && !opciones.grafico);
      return;
    }
    if (cargaConfigNube) {
      var origen = fuente, conversacion = chatActual;
      return cargaConfigNube.then(function () {
        if (fuente === origen && chatActual === conversacion && !$("pantalla-chat").hidden) return preguntarNova(pregunta, opciones);
      });
    }
    if (Nube.mensajePausaIA(configNube)) {
      pintarPausaIA();
      return;
    }
    // Si todavía hay una pregunta esperando, se cancela: así nunca se queda trabado.
    if (chatControl) { try { chatControl.abort(); } catch (e) { /* ya terminó */ } }
    var mio = ++chatToken, control = chatControl = new AbortController();
    var chat = chatActual, uso = usoActivoEventos(), inicioRespuesta;
    $("chat-bienvenida").hidden = true;
    mensaje("chat-mensaje", "");
    $("chat").querySelectorAll("li.pensando").forEach(function (x) { x.remove(); });
    burbuja("yo", textoVisible, imagen);
    $("chat-pregunta").value = "";
    var espera = burbuja("nova pensando", "✦ Pensando…");
    var historial = soloCifras ? [] : chat.mensajes.slice(-6);
    // La pregunta se guarda de una vez: aunque la IA falle o tarde, queda en tu historial.
    chat.mensajes.push({ rol: "usuario", texto: (imagen ? "📷 " : "") + textoVisible });
    var guardada = guardarConversacion().catch(function () { mensaje("chat-mensaje", "La pregunta no se pudo guardar en tu historial, pero puedes seguir chateando.", true); });
    return Promise.resolve().then(function () {
      if ((soloCifras && ocultos) || (opciones.vigente && !opciones.vigente())) return "";
      registrarEventoDe(uso, "ia", imagen ? "pregunta_foto" : opciones.porVoz ? "pregunta_voz" : "pregunta_texto");
      if (uso) registrarEventoDe(uso, "ia", "tema_" + Eventos.temaPregunta(pregunta));
      var cuerpo = { pregunta: pregunta, historial: historial, contexto: soloCifras ? { hoy: hoyLocal() } : contextoFinanzas(), imagen: imagen, mime: opciones.mime };
      return preguntarEnFlujo(cuerpo, function (texto) {
        if (mio !== chatToken) return;
        pintarTextoIA(espera, texto);
        espera.classList.remove("pensando");
        espera.scrollIntoView({ block: "nearest" });
      }, control, opciones.vigente, function () { inicioRespuesta = performance.now(); });
    }).then(function (respuesta) {
      if (mio !== chatToken) return;
      if (opciones.vigente && !opciones.vigente()) { espera.remove(); return; }
      respuesta = (respuesta || "").trim();
      if (!respuesta) throw new Error("La IA no pudo responder. Intenta otra vez en un momento.");
      if (uso && !control.signal.aborted) registrarEventoDe(uso, "ia", "respuesta_ms", Eventos.decimasRespuesta(performance.now() - inicioRespuesta));
      if (marcasIA(respuesta).fuentes.length) registrarEventoDe(uso, "ia", "busqueda_web");
      pintarTextoIA(espera, respuesta);
      espera.classList.remove("pensando");
      var tar = imagen || soloCifras ? null : tarjetaIA(pregunta, respuesta);
      if (tar) { espera.after(tar); tar.scrollIntoView({ block: "nearest" }); }
      chat.mensajes.push({ rol: "nova", texto: respuesta });
      if (chat === chatActual) actualizarBotonNota();
      return guardada.then(function () { if (chat === chatActual) return guardarConversacion(); }).catch(function () { mensaje("chat-mensaje", "La respuesta no se pudo guardar en tu historial, pero puedes seguir chateando.", true); }).then(function () { pintarIA(); return respuesta; });
    }).catch(function (e) {
      if (mio !== chatToken) return;
      if (!control.signal.aborted) registrarErrorIA(uso, e);
      espera.remove();
      mensaje("chat-mensaje", (e && e.message) || "No se pudo responder. Intenta otra vez.", true);
      if (!soloCifras) $("chat-pregunta").value = pregunta;      // para reintentar con un toque
    }).finally(function () { if (mio === chatToken) chatControl = null; });
  }
  $("chat-pregunta").addEventListener("focus", function () { setTimeout(function () { try { $("chat-pregunta").scrollIntoView({ block: "center" }); } catch (e) { /* sin scroll */ } }, 350); });
  function limpiarFotoChat() {
    seleccionFotoChat++;
    fotoChat = "";
    $("chat-foto-archivo").value = "";
    $("chat-adjunto").hidden = true;
    $("chat-adjunto").querySelector("img").removeAttribute("src");
    $("form-chat").querySelector("button[type=submit]").disabled = false;
  }
  $("chat-foto").addEventListener("click", function () { $("chat-foto-archivo").click(); });
  $("chat-foto-quitar").addEventListener("click", limpiarFotoChat);
  $("chat-foto-archivo").addEventListener("change", function () {
    var archivo = this.files[0];
    if (!archivo) return;
    limpiarFotoChat();
    var seleccion = seleccionFotoChat;
    var enviar = $("form-chat").querySelector("button[type=submit]");
    enviar.disabled = true;
    mensaje("chat-mensaje", "");
    prepararFoto(archivo, 1280).then(function (canvas) {
      if (seleccion !== seleccionFotoChat) return;
      var url = canvas.toDataURL("image/jpeg", 0.8);
      var base64 = url.split(",")[1];
      if (!base64) throw new Error("No se pudo preparar la foto.");
      if (base64.length > 6000000) throw new Error("La foto es muy grande");
      fotoChat = base64;
      $("chat-adjunto").querySelector("img").src = url;
      $("chat-adjunto").hidden = false;
    }).catch(function (e) {
      if (seleccion === seleccionFotoChat) mensaje("chat-mensaje", e.message, true);
    }).finally(function () {
      if (seleccion === seleccionFotoChat) enviar.disabled = false;
    });
  });
  $("form-chat").addEventListener("submit", function (e) {
    e.preventDefault();
    if (this.querySelector("button[type=submit]").disabled) return;
    var texto = $("chat-pregunta").value.trim();
    if (fotoChat) {
      preguntarNova(texto || "¿Qué ves en esta imagen?", { imagen: fotoChat, mime: "image/jpeg" });
      limpiarFotoChat();
    } else preguntarNova(texto);
  });

  var consulta = 0, viaEntradaRapida = "texto";
  $("form-rapido").addEventListener("submit", function (e) {
    e.preventDefault();
    var texto = $("entrada-rapida").value, id = ++consulta;
    var via = viaEntradaRapida;
    viaEntradaRapida = "texto";
    var deBanco = NovaConsejos.mensajeBancoATexto(texto);          // mensaje de un banco pegado: se convierte en una frase simple
    if (deBanco) { texto = deBanco; $("entrada-rapida").value = deBanco; }
    var local = Parser.interpretar(texto);
    if (!texto.trim() || !iaDisponible()) return terminar(local);
    var enviar = e.target.querySelector("button[type=submit]");
    enviar.disabled = true;
    mensaje("rapido-mensaje", "✦ La IA está leyendo…");
    preguntarIA({ texto: texto }, via === "voz" ? "voz" : "texto").then(function (r) {
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
      r.via = deBanco || r.origenBanco ? "banco" : via;
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
    var uso = usoActivoEventos();
    var guardado;
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
      guardado = m;
      registrarEventoDe(uso, "anotar", r.via || "rapido");
      datos.movimientos.push(m);
      ordenarMovimientos();
      var aviso = "¡Guardado! " + m.descripcion + " " + pesos.format(num(m.monto));
      if (!comoFrecuente) return aviso;
      return fuente.crear("frecuentes", { texto: textoOriginal.slice(0, 120) }).then(function (f) {
        datos.frecuentes.push(f);
        return aviso + " · también quedó en registros comunes";
      });
    }).then(function (aviso) {
      mensaje("rapido-mensaje", "");
      toast(aviso, null, null, null, true);
      pintar();
      if (guardado.tipo === "gasto") avisarGastoAlto(guardado);
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
  function mostrarBotonesDeVoz(disponible) {
    ["btn-voz", "asis-dictar", "chat-voz"].forEach(function (id) { $(id).hidden = !disponible; });
  }
  if (vozNativa) vozNativa.available().then(function (r) { mostrarBotonesDeVoz(r && r.available); }).catch(function () {});
  else mostrarBotonesDeVoz(hayVoz);
  $("chat-voz").addEventListener("click", function () {
    var voz = this, chat = chatActual;
    voz.disabled = true;
    voz.classList.add("escuchando");
    mensaje("chat-mensaje", "Te escucho…");
    dictar("Dime tu pregunta").then(function (dicho) {
      if (chat !== chatActual) return;
      mensaje("chat-mensaje", "");
      preguntarNova(dicho, { porVoz: true });
    }).catch(function (err) {
      if (chat === chatActual) mensaje("chat-mensaje", err.message, true);
    }).finally(function () {
      voz.disabled = false;
      voz.classList.remove("escuchando");
    });
  });
  $("btn-voz").addEventListener("click", function () {
    var voz = $("btn-voz");
    voz.classList.add("escuchando");
    mensaje("rapido-mensaje", "Te escucho…");
    dictar("Dime tu gasto o ingreso").then(function (dicho) {
      mensaje("rapido-mensaje", "");
      viaEntradaRapida = "voz";
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

  function prepararFoto(archivo, maximo, filtro) {
    return new Promise(function (ok, mal) {
      var url = URL.createObjectURL(archivo), img = new Image();
      img.onload = function () {
        try {
          var k = Math.min(1, maximo / Math.max(img.width, img.height));
          var c = document.createElement("canvas");
          c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
          var g = c.getContext("2d");
          if (filtro) g.filter = filtro;
          g.drawImage(img, 0, 0, c.width, c.height);
          ok(c);
        } catch (e) {
          mal(new Error("No se pudo preparar la foto."));
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      img.onerror = function () { URL.revokeObjectURL(url); mal(new Error("No se pudo abrir la foto.")); };
      img.src = url;
    });
  }

  // Devuelve { r (registro interpretado) | null, texto para la entrada, comercio, aviso }.
  function interpretarFoto(archivo, avisar) {
    return prepararFoto(archivo, 1800, "grayscale(1) contrast(1.4)").then(function (foto) {
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
      x.r.via = "foto";
      mostrarPrevia(x.r);
      mensaje("rapido-mensaje", x.aviso + " Revisa el valor: si no es correcto, corrige el texto y vuelve a tocar la flecha.");
    }).catch(function (err) { mensaje("rapido-mensaje", (err && err.message) || "No se pudo leer la foto.", true); })
      .finally(function () { btn.disabled = false; });
  });

  // ---------- Asistente inteligente (varios registros a la vez) ----------
  var asisItems = [], lineasDictadas = new Set();
  $("asis-texto").addEventListener("input", function () {
    var actuales = lineasDe(this.value);
    lineasDictadas = new Set(actuales.filter(function (linea) { return lineasDictadas.has(linea); }));
  });
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
    var vias = local.map(function (r) { return lineasDictadas.has(r.linea) ? "voz" : "texto"; });
    var via = vias.every(function (v) { return v === "voz"; }) ? "voz" : "texto";
    var op = !iaDisponible() ? Promise.resolve(local) : (mensaje("asis-mensaje", "✦ La IA está leyendo…"), invocarIA(cuerpoIA({ texto: texto.slice(0, 2000), varios: true }), via).then(function (d) {
      var lista = (d.movimientos || []).filter(function (x) { return x.monto > 0; }).map(registroDeIA);
      if (!lista.length) throw new Error("vacío");
      // Si la IA encontró lo mismo que las líneas, cada uno conserva las etiquetas # de su línea.
      if (lista.length === local.length) lista.forEach(function (r, i) { (local[i].etiquetas || []).forEach(function (t) { if (r.etiquetas.indexOf(t) < 0) r.etiquetas.push(t); }); });
      return lista;
    }).catch(function () { return local; }));
    op.then(function (lista) {
      asisItems = lista.map(function (r, i) { return Object.assign({ elegido: !!r.ok, via: lista.length === local.length ? vias[i] : via }, r); });
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
    var b = $("asis-guardar"), uso = usoActivoEventos();
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
      creados.forEach(function (_m, i) { registrarEventoDe(uso, "anotar", elegidos[i].via); });
      Array.prototype.push.apply(datos.movimientos, creados);
      ordenarMovimientos();
      toast("✓ Se guardaron " + creados.length + (creados.length === 1 ? " registro" : " registros"));
      asisItems = []; lineasDictadas.clear(); $("asis-texto").value = ""; mensaje("asis-mensaje", ""); pintarAsistente();
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
      var nuevas = new Set(lineasDe(dicho));
      t.value = (t.value.trim() ? t.value.trim() + "\n" : "") + dicho;
      lineasDictadas = new Set(lineasDe(t.value).filter(function (linea) { return lineasDictadas.has(linea) || nuevas.has(linea); }));
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
      asisItems.push(Object.assign({ elegido: true, via: "foto" }, x.r));
      mensaje("asis-mensaje", x.aviso + " Revisa el valor y toca Guardar.");
      pintarAsistente();
    }).catch(function (err) { mensaje("asis-mensaje", (err && err.message) || "No se pudo leer la foto.", true); })
      .finally(function () { b.disabled = false; });
  });

  // ---------- Sesión ----------
  // El enlace del correo para cambiar la contraseña llega con "type=recovery" (o con un
  // error si venció). Se lee antes de crear el cliente, porque este limpia la dirección.
  var panelAlEntrar = location.hash === "#panel" || new URLSearchParams(location.search).get("panel") === "1";
  var hashInicial = new URLSearchParams(location.hash.replace(/^#/, ""));
  var esRecuperacion = hashInicial.get("type") === "recovery";
  var errorEnlace = hashInicial.get("error_description");

  var cliente = window.supabase && cfg.supabaseUrl ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    global: { fetch: function (url, opciones) {
      var rutaEventos = cfg.supabaseUrl.replace(/\/$/, "") + "/rest/v1/fin_eventos";
      if (String(url).split("?")[0] === rutaEventos) opciones = Object.assign({}, opciones, { keepalive: true });
      return window.fetch(url, opciones);
    } }
  }) : null;

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
  function enlaceDescarga(apk) {
    var base = String(cfg.sitioUrl || "https://nova-finanzas.vercel.app").replace(/\/+$/, "");
    return base + "/descargar.html" + (/NOVA-avanzada\.apk$/.test(String(apk || "")) ? "?v=avanzada" : "");
  }
  // El botón se ve siempre en el inicio de sesión (y en Configuración): tocarlo baja de una vez la última APK.
  // En el navegador baja desde esta página; dentro de la app instalada, desde GitHub (allí queda lista apenas se arma).
  mostrarApk(true);
  (function ponerEnlaceApk() {
    // Antes de bajar el archivo se abre una página de NOVA que explica qué se descarga (en vez de la pantalla en blanco de GitHub).
    var enlace = enlaceDescarga("");
    $("btn-apk").href = $("perfil-apk").href = enlace;
    $("btn-apk").removeAttribute("download"); $("perfil-apk").removeAttribute("download");
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
      // La APK avanzada se actualiza con la avanzada (solo está en GitHub), para no perder la lectura de avisos del banco.
      if (local && local.variante === "avanzada") fuentes = fuentes.slice(0, 1).map(function (f) { return { url: f.url, apk: f.apk.replace(/NOVA\.apk$/, "NOVA-avanzada.apk") }; });
      return Promise.all(fuentes.map(function (f) { return leerVersionPublicada(http, f.url).then(function (d) { return d ? { d: d, apk: f.apk } : null; }); })).then(function (lista) {
        var mejor = lista.filter(Boolean).sort(function (a, b) { return Number(b.d.versionCode) - Number(a.d.versionCode); })[0];
        if (!mejor) return { local: local, remota: null, hayNueva: false, error: true };
        var hayNueva = Number(mejor.d.versionCode) > Number(local.versionCode);
        var aviso = $("aviso-version");
        if (hayNueva) {
          aviso.href = enlaceDescarga(mejor.apk); aviso.target = "_blank";
          $("aviso-version-texto").textContent = "Versión " + mejor.d.versionName + " (tienes la " + local.versionName + "). Toca para descargarla y, al abrir el archivo, toca Actualizar.";
          [$("btn-apk"), $("perfil-apk")].forEach(function (a) { a.href = enlaceDescarga(mejor.apk); });
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
  // Actualización automática.
  var Actualizacion = window.NovaActualizacion;
  var otaMetaCache = "nova-ota-meta", otaMetaUrl = "/__ota-meta__", otaMalosUrl = "/__ota-malos__";
  var otaRevision = "nova-ota-revision", revisandoWeb = false, recargarAlVolver = false;
  var vigilarVersionWeb = !enApp && location.hostname !== "localhost";
  var versionWebInicial = null, versionesWebAvisadas = new Set(), consultaVersionWeb = null;
  var webOcultaDesde = document.hidden ? Date.now() : null, cambiosVisibilidadWeb = 0;

  async function leerJsonOta(cache, url) {
    var respuesta = await cache.match(url);
    return respuesta ? await respuesta.json() : null;
  }

  async function leerMetaWeb() {
    try {
      return await leerJsonOta(await caches.open(otaMetaCache), otaMetaUrl);
    } catch (e) { return null; }
  }

  async function descargarWeb(plan, sha, ota) {
    var control = new AbortController();
    var limite = setTimeout(function () { control.abort(); }, 120000);
    var siguiente = 0, descargados = [];
    async function bajar() {
      while (siguiente < plan.descargar.length && !control.signal.aborted) {
        var archivo = plan.descargar[siguiente++];
        var respuesta = await fetch(ota.urlArchivo(cfg.otaArchivosUrl, sha, archivo.ruta), { cache: "no-store", signal: control.signal });
        if (!respuesta.ok) throw new Error("No se pudo bajar " + archivo.ruta);
        var bytes = new Uint8Array(await respuesta.arrayBuffer());
        if (bytes.length !== archivo.tam || await ota.hashHex(bytes) !== archivo.hash.toLowerCase()) {
          throw new Error("Archivo dañado: " + archivo.ruta);
        }
        descargados.push({ ruta: archivo.ruta, bytes: bytes });
      }
    }
    try {
      await Promise.all([bajar(), bajar(), bajar()]);
      if (control.signal.aborted) throw new Error("Se agotó el tiempo de descarga");
      return descargados;
    } finally {
      clearTimeout(limite);
      control.abort();
    }
  }

  async function aplicarWeb(cacheMeta, meta, manifiesto, plan, descargados, ota) {
    var actual = await leerJsonOta(cacheMeta, otaMetaUrl);
    if ((actual && actual.sha) !== (meta && meta.sha)) return false;
    var malos = await leerJsonOta(cacheMeta, otaMalosUrl);
    if (Array.isArray(malos) && malos.indexOf(manifiesto.sha) !== -1) return false;
    var nombre = "nova-ota-" + manifiesto.sha.slice(0, 12);
    if (meta && nombre === meta.cache) return false;
    var archivos = Object.create(null);
    try {
      var cache = await caches.open(nombre);
      for (var archivo of descargados) {
        await cache.put(location.origin + "/" + archivo.ruta, new Response(archivo.bytes, {
          headers: { "Content-Type": ota.tipoMime(archivo.ruta) }
        }));
        archivos[archivo.ruta] = manifiesto.archivos[archivo.ruta].hash;
      }
      if (plan.mantener.length) {
        var anterior = await caches.open(meta.cache);
        for (var ruta of plan.mantener) {
          var url = location.origin + "/" + ruta;
          var respuesta = await anterior.match(url);
          if (!respuesta) throw new Error("Falta el archivo guardado: " + ruta);
          await cache.put(url, respuesta);
          archivos[ruta] = manifiesto.archivos[ruta].hash;
        }
      }
      var nueva = { sha: manifiesto.sha, generado: manifiesto.generado, cache: nombre, archivos: archivos, arranques: 0, ok: false };
      await cacheMeta.put(otaMetaUrl, new Response(JSON.stringify(nueva), { headers: { "Content-Type": "application/json" } }));
    } catch (e) {
      await caches.delete(nombre);
      throw e;
    }
    await caches.keys().then(function (nombres) {
      return Promise.all(nombres.filter(function (otro) {
        return otro.indexOf("nova-ota-") === 0 && otro !== otaMetaCache && otro !== nombre;
      }).map(function (otro) { return caches.delete(otro); }));
    }).catch(function () { /* La actualización ya quedó guardada. */ });
    return true;
  }

  async function revisarWeb(forzar) {
    if (revisandoWeb) return;
    revisandoWeb = true;
    try {
      var chrome = /Chrome\/(\d+)/.exec(navigator.userAgent);
      if (!enApp || !navigator.serviceWorker || !navigator.serviceWorker.controller || !enLinea() || !chrome || Number(chrome[1]) < 90) return;
      var ota = window.NovaOta;
      var http = window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorHttp;
      if (!ota || !http || !cfg.otaManifestUrl || !cfg.otaArchivosUrl) return;
      var ahora = Date.now();
      if (!Actualizacion.tocaRevisarOta(ahora, Number(localStorage.getItem(otaRevision)), forzar)) return;
      localStorage.setItem(otaRevision, ahora);
      var respuesta = await fetch("ota-base.json", { cache: "no-store" });
      if (!respuesta.ok) return;
      var base = await respuesta.json();
      var cacheMeta = await caches.open(otaMetaCache);
      var meta = await leerJsonOta(cacheMeta, otaMetaUrl);
      var malos = await leerJsonOta(cacheMeta, otaMalosUrl);
      var res = await http.get({ url: cfg.otaManifestUrl + "?t=" + Date.now(), responseType: "json" });
      if (res.status < 200 || res.status >= 300) return;
      var manifiesto = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
      if (!manifiesto || (Array.isArray(malos) && malos.indexOf(manifiesto.sha) !== -1)) return;
      var plan = ota.planActualizacion({
        manifiesto: manifiesto, base: base,
        actual: meta ? { sha: meta.sha, generado: meta.generado, archivos: meta.archivos } : null,
        apkVersion: Number(versionLocal && versionLocal.versionCode) || 0
      });
      if (plan.accion !== "descargar") return;
      var descargados = await descargarWeb(plan, manifiesto.sha, ota);
      function aplicar() { return aplicarWeb(cacheMeta, meta, manifiesto, plan, descargados, ota); }
      var aplicada = await (navigator.locks ? navigator.locks.request(otaMetaCache, aplicar) : aplicar());
      if (aplicada) {
        recargarAlVolver = true;
        pintarVersionLocal();
        toast("NOVA se actualizó", "Toca «Ver ahora» para estrenar lo nuevo", null, {
          texto: "Ver ahora", fn: function () { location.reload(); }
        });
      }
      return aplicada;
    } catch (e) { /* Si falla la revisión, sigue la versión que ya estaba. */ }
    finally { revisandoWeb = false; }
  }

  function webPuedeRevisar() {
    return enLinea() && !(fuente && fuente.demo);
  }

  function recargaSegura() {
    var appVisible = !$("pantalla-app").hidden;
    var borrador = appVisible && (
      ["inicio", "analisis", "buscar"].indexOf(enVista) < 0 ||
      !!$("entrada-rapida").value || !$("vista-previa").hidden
    );
    if (!$("pantalla-auth").hidden) {
      borrador = borrador || Array.from($("pantalla-auth").querySelectorAll("input, textarea")).some(function (campo) {
        return campo.value !== campo.defaultValue;
      });
    }
    return Actualizacion.puedeRecargar({
      capas: pilaCapas.length,
      bloqueada: !$("bloqueo").hidden,
      escribiendo: !!document.activeElement && document.activeElement.matches("input, textarea"),
      borrador: borrador || (enApp && !appVisible)
    });
  }

  async function revisarVersionPagina(ocultaDesde) {
    if (!webPuedeRevisar()) return;
    var regresoLargo = Actualizacion.permiteRecargaWeb(Date.now(), ocultaDesde);
    var visibilidad = cambiosVisibilidadWeb;
    try {
      if (!consultaVersionWeb) {
        consultaVersionWeb = fetch("index.html", { method: "HEAD", cache: "no-store" }).then(function (respuesta) {
          return respuesta.ok ? Actualizacion.versionWeb(respuesta.headers) : null;
        }).finally(function () { consultaVersionWeb = null; });
      }
      var version = await consultaVersionWeb;
      if (!version || !webPuedeRevisar()) return;
      if (!versionWebInicial) versionWebInicial = version;
      if (document.hidden || visibilidad !== cambiosVisibilidadWeb ||
          !Actualizacion.cambioVersionWeb(versionWebInicial, version)) return;
      if (regresoLargo && recargaSegura()) {
        location.reload();
        return;
      }
      if (versionesWebAvisadas.has(version)) return;
      versionesWebAvisadas.add(version);
      toast("Hay una versión nueva de NOVA", null, null, {
        texto: "Actualizar", fn: function () { location.reload(); }
      });
    } catch (e) { /* Una revisión fallida se reintenta en la siguiente ocasión. */ }
  }

  window.addEventListener("load", function () {
    if (enApp) setTimeout(function () { revisarWeb(true); }, 4000);
    if (vigilarVersionWeb) setTimeout(function () { revisarVersionPagina(null); }, 5000);
    if (location.hostname !== "localhost" || !navigator.serviceWorker || !navigator.serviceWorker.controller) return;
    // Lee el SHA antes de que la revisión pueda instalar otra versión.
    var controlador = navigator.serviceWorker.controller;
    var metaArranque = leerMetaWeb();
    setTimeout(function () {
      metaArranque.then(function (meta) {
        if (meta) controlador.postMessage({ tipo: enApp ? "ota-ok" : "ota-descartar", sha: meta.sha });
      }).catch(function () { /* La app puede seguir sin avisar al servicio. */ });
    }, 5000);
  });

  function pintarVersionLocal() {
    var v = versionLocal && versionLocal.versionName;
    var etiqueta = $("apk-app-version");
    etiqueta.textContent = v ? "Tienes la versión " + v + " de NOVA." : "";
    if (enApp) leerMetaWeb().then(function (meta) {
      etiqueta.textContent = (v ? "Tienes la versión " + v + " de NOVA." : "") +
        (meta && typeof meta.sha === "string" ? " Contenido web: " + meta.sha.slice(0, 7) + "." : "");
    }).catch(function () { /* La versión de la APK ya aparece en Ajustes. */ });
    $("actualizar-estado").textContent = v ? "Tienes la versión " + v + ". Toca para ver si hay una nueva." : "Mira si hay una versión nueva de NOVA";
  }
  function accionBuscarActualizacion(boton) {
    boton.disabled = true; var texto = boton.textContent;
    revisarWeb(true).then(function (aplicada) {
      return buscarActualizacion(true).then(function (r) {
        if (aplicada) return;
      if (!r) toast("No se pudo revisar", "Revisa tu conexión e intenta otra vez");
      else if (r.error) toast("No se pudo revisar", "No pude leer la versión publicada");
      else if (r.hayNueva) toast("¡Hay una versión nueva!", "Versión " + r.remota.versionName, null, { texto: "Descargar", fn: function () { window.open(r.enlace, "_blank"); } });
      else toast("Ya tienes la última versión", "Versión " + r.local.versionName);
      });
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

  function ocultarSplash() {
    var splash = $("splash");
    if (splash.hidden || splash.classList.contains("splash-saliendo")) return;
    requestAnimationFrame(function () {
      var espera = Math.max(0, 600 - (performance.now() - Number(splash.dataset.inicio)));
      setTimeout(function () {
        if (splash.hidden || splash.classList.contains("splash-saliendo")) return;
        splash.classList.add("splash-saliendo");
        setTimeout(function () { splash.hidden = true; }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 250);
      }, espera);
    });
  }

  function mostrar(pantalla) {
    $("cargando").hidden = true;
    $("pantalla-auth").hidden = pantalla !== "auth";
    $("pantalla-app").hidden = pantalla !== "app";
    document.body.classList.toggle("app-visible", pantalla === "app");
    ocultarSplash();
    if (pantalla === "auth") medirCargaInicial();
  }

  function entrar(nuevaFuente) {
    inicioListoParaGasto = false;
    reiniciarEventos();
    fuente = nuevaFuente;
    avisosNube = []; erroresEnviados = [];
    encuestaInicio = null;
    pintarEncuestaInicio();
    reiniciarConfigNube();
    espacioId = leerLocal(claveEspacio(), null);
    fuente = Esp.envolver(nuevaFuente, { activo: function () { return espacioId; }, alPerder: function () { espacioId = null; guardarLocal(claveEspacio(), null); } });
    if (fuente.demo) { fuente.iconosCategoria = {}; fuente.retosSemanales = []; fuente.papelera = []; }
    reiniciarChat();
    desfaseInicio = 0; desfaseAnalisis = 0;
    $("aviso-demo").hidden = !fuente.demo;
    $("btn-invitar").hidden = fuente.demo || !idUsuario();
    $("cargando").hidden = false;
    return fuente.cargar().then(function (d) {
      datos = Object.assign(datosVacios(), d);
      ordenarMovimientos();
      monedaVista = monedaBase();
      iniciarEventos();
      if (enVista === "inicio") registrarEvento("pantalla", "tab_inicio");
      mostrar("app"); ir("inicio"); pintar();
      if (!fuente.demo) {
        medirCargaInicial();
        if (usoActivoEventos() && cargaInicial !== null) {
          registrarEvento("sesion", "carga", cargaInicial);
          cargaInicial = null;
        }
      }
      cargarTasas();
      ultimaActividad = Date.now();
      if (!fuente.demo) bloquearSiHayPin();
      revisarInactividad();
      var abrirPanelDirecto = panelAlEntrar && soyDueno();
      pintarEstadoPapelera();
      if (abrirPanelDirecto) abrirPanelDueno();
      else { tutorialSiHaceFalta(); novedadesSiHaceFalta(); }
      $("btn-dueno").hidden = !soyDueno(); marcarUso(); cargarAvisosNube(); cargarEncuestaNube(); cargarConfigNube();
      while (accionesPendientes.length) anotarTeclaRapida(accionesPendientes.shift());
      programarAvisos();
      if (!fuente.demo) revisarBanco(abrirPanelDirecto).then(function () { if (abrirBancoAlEntrar && !abrirPanelDirecto) { abrirBancoAlEntrar = false; abrirBanco(); } }).catch(function () { /* sin lista del banco */ });
      // Si salieron categorías nuevas del modo conductor (como "Cuota del vehículo"), se agregan solas.
      if (conductor()) asegurarCategoriasConductor().then(pintar).catch(function () { /* se intentará la próxima vez */ });
      inicioListoParaGasto = true;
      abrirGastoPendiente();
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
  var PIN_CLAVE = "nova-pin", PIN2_CLAVE = "nova-pin2", pinModo = null, pinPrimero = "";
  var minutosBloqueo = leerLocal("nova-bloqueo-minutos", 5), ultimaActividad = Date.now(), timerBloqueo;
  var contenidoBloqueado = document.querySelectorAll("#pantalla-app, .capa, .hoja-fondo, #tutorial, #novedades, #toast, .anuncio-accesible");
  $("bloqueo-minutos").value = String(minutosBloqueo);
  $("bloqueo-minutos").addEventListener("change", function () {
    minutosBloqueo = Number(this.value);
    guardarLocal("nova-bloqueo-minutos", minutosBloqueo);
    ultimaActividad = Date.now();
    revisarInactividad();
  });

  function revisarInactividad() {
    clearTimeout(timerBloqueo);
    timerBloqueo = null;
    if (!fuente || $("pantalla-app").hidden || pinModo === "abrir" || !leerPin()) return;
    var espera = A.esperaBloqueo(minutosBloqueo, ultimaActividad, Date.now());
    if (espera === null) return;
    if (espera === 0) bloquearSiHayPin();
    else timerBloqueo = setTimeout(revisarInactividad, espera);
  }

  function registrarActividad() {
    if (document.hidden || pinModo === "abrir" || $("pantalla-app").hidden) return;
    if (A.esperaBloqueo(minutosBloqueo, ultimaActividad, Date.now()) === 0 && leerPin()) {
      revisarInactividad();
      return;
    }
    ultimaActividad = Date.now();
    if (!timerBloqueo) revisarInactividad();
  }
  function leerPin2() { try { return localStorage.getItem(PIN2_CLAVE); } catch (e) { return null; } }
  function leerPin() { try { return localStorage.getItem(PIN_CLAVE); } catch (e) { return null; } }
  function hashPin(pin) {
    var txt = "nova-sal:" + pin;
    if (!(window.crypto && crypto.subtle && window.TextEncoder)) return Promise.resolve("p:" + btoa(txt));
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt)).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
    });
  }
  function pintarEstadoPin() { $("ajuste-bloqueo").hidden = !leerPin(); $("pin2-estado").textContent = leerPin2() ? "Activado: ese PIN abre NOVA con los valores ocultos" : "Un segundo PIN que abre NOVA con los valores ocultos"; $("pin-estado").textContent = leerPin() ? "Activado: se pide al abrir NOVA" : "Pide un PIN cada vez que abres NOVA"; }
  function abrirBloqueo(modo) {
    pinModo = modo; pinPrimero = "";
    if (modo === "abrir") {
      contenidoBloqueado.forEach(function (c) { c.inert = true; });
    }
    var t = { crear: "Crea un PIN de 4 a 6 números", repetir: "Repite el PIN", abrir: "Escribe tu PIN", quitar: "Escribe tu PIN para quitarlo", crear2: "Crea tu PIN discreto (distinto al principal)", repetir2: "Repite el PIN discreto" };
    $("bloqueo-titulo").textContent = t[modo]; $("bloqueo-pin").value = ""; mensaje("bloqueo-mensaje", "");
    $("bloqueo-cancelar").hidden = modo === "abrir"; $("bloqueo-olvide").hidden = modo === "crear";
    $("bloqueo").hidden = false; setTimeout(function () { $("bloqueo-pin").focus(); }, 50);
  }
  function cerrarBloqueo() {
    if (pinModo === "abrir") {
      contenidoBloqueado.forEach(function (c) { c.inert = false; });
    }
    $("bloqueo").hidden = true; $("bloqueo-pin").value = ""; pinModo = null; pinPrimero = "";
    ultimaActividad = Date.now();
    revisarInactividad();
  }
  function confirmarPin() {
    var pin = $("bloqueo-pin").value.replace(/\D/g, "");
    if (pin.length < 4) return mensaje("bloqueo-mensaje", "Escribe de 4 a 6 números.", true);
    if (pinModo === "crear") { pinPrimero = pin; pinModo = "repetir"; $("bloqueo-titulo").textContent = "Repite el PIN"; $("bloqueo-pin").value = ""; return; }
    if (pinModo === "crear2") { pinPrimero = pin; pinModo = "repetir2"; $("bloqueo-titulo").textContent = "Repite el PIN discreto"; $("bloqueo-pin").value = ""; return; }
    if (pinModo === "repetir2") {
      if (pin !== pinPrimero) { abrirBloqueo("crear2"); return mensaje("bloqueo-mensaje", "No coinciden. Empieza de nuevo.", true); }
      return hashPin(pin).then(function (hp) {
        if (pinModo !== "repetir2") return;
        if (hp === leerPin()) { abrirBloqueo("crear2"); return mensaje("bloqueo-mensaje", "Tiene que ser distinto al PIN principal.", true); }
        try { localStorage.setItem(PIN2_CLAVE, hp); } catch (e) { /* nada */ }
        cerrarBloqueo(); pintarEstadoPin(); toast("¡PIN discreto activado!", "Abre NOVA con los valores ocultos");
      });
    }
    if (pinModo === "repetir") {
      if (pin !== pinPrimero) { abrirBloqueo("crear"); return mensaje("bloqueo-mensaje", "No coinciden. Empieza de nuevo.", true); }
      return hashPin(pin).then(function (hp) { if (pinModo !== "repetir") return; try { localStorage.setItem(PIN_CLAVE, hp); } catch (e) { /* nada */ } cerrarBloqueo(); pintarEstadoPin(); toast("¡PIN activado!", "Se pedirá al abrir NOVA"); });
    }
    var modo = pinModo;
    hashPin(pin).then(function (hp) {
      if (pinModo !== modo) return;
      if (pinModo === "abrir" && hp !== leerPin() && leerPin2() && hp === leerPin2()) {
        ocultos = true; guardarLocal("nova-ocultos", true); pintarOjo(); cerrarBloqueo(); if (fuente) pintar();
        abrirGastoPendiente();
        return;
      }
      if (hp !== leerPin()) { $("bloqueo-pin").value = ""; return mensaje("bloqueo-mensaje", "PIN incorrecto.", true); }
      if (pinModo === "quitar") { try { localStorage.removeItem(PIN_CLAVE); localStorage.removeItem(PIN2_CLAVE); } catch (e) { /* nada */ } pintarEstadoPin(); toast("PIN quitado"); }
      cerrarBloqueo();
      abrirGastoPendiente();
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
  ["pointerdown", "pointermove", "keydown", "input", "scroll"].forEach(function (evento) {
    document.addEventListener(evento, registrarActividad, { capture: true, passive: true });
  });
  document.addEventListener("visibilitychange", revisarInactividad);
  if (enApp || vigilarVersionWeb) {
    document.addEventListener("visibilitychange", function () {
      if (enApp) {
        if (document.hidden) return;
        if (recargarAlVolver && recargaSegura()) location.reload();
        else revisarWeb(true);
        return;
      }
      cambiosVisibilidadWeb++;
      if (document.hidden) {
        webOcultaDesde = Date.now();
        return;
      }
      revisarVersionPagina(webOcultaDesde);
      webOcultaDesde = null;
    });
    setInterval(function () {
      if (document.hidden) return;
      if (enApp) revisarWeb(false);
      else revisarVersionPagina(null);
    }, Actualizacion.INTERVALO_REVISION);
  }
  window.addEventListener("pageshow", revisarInactividad);
  pintarEstadoPin();

  // ---------- Respaldos ----------
  var solicitudRespaldo = null, restaurandoRespaldo = false;
  function claveMov(m) { return [String(m.fecha).slice(0, 16), num(m.monto), m.tipo, m.descripcion || ""].join("|"); }
  function leerCopia(texto) {
    var copia;
    try { copia = JSON.parse(texto); } catch (e) { /* se valida abajo */ }
    if (!copia || copia.app !== "NOVA" || !Array.isArray(copia.movimientos)) {
      throw new Error("Ese archivo no es un respaldo de NOVA.");
    }
    return copia;
  }
  async function restaurarCopia(copia, idMensaje, cifrado) {
    if (restaurandoRespaldo) return mensaje(idMensaje, "Ya se está restaurando un respaldo.", true);
    var origen = fuente, activos = datos;
    var existentes = new Set(activos.movimientos.map(claveMov));
    var nuevos = copia.movimientos.filter(function (m) { return m && m.monto != null && m.fecha && !existentes.has(claveMov(m)); });
    var resumen = "";
    if (cifrado) {
      var contenido = TABLAS.filter(function (t) { return Array.isArray(copia[t]) && copia[t].length; }).map(function (t) {
        return copia[t].length + " " + t.replace(/_grupo$/, " de grupo");
      });
      if (copia.perfil) contenido.push("datos del perfil");
      resumen = (contenido.join(", ") || "El respaldo está vacío.") + "\n\n";
    }
    if (!nuevos.length && !cifrado) return mensaje(idMensaje, "No había nada nuevo: todos esos movimientos ya están en NOVA.");
    var accion = nuevos.length === 1 ? "Solo se agregará 1 movimiento faltante"
      : "Solo se agregarán " + nuevos.length + " movimientos faltantes";
    if (!confirm(resumen + accion + " a tu espacio actual. ¿Continuar?")) return;
    if (!nuevos.length) return mensaje(idMensaje, "El respaldo no trae movimientos nuevos.");
    var cuentas = Array.isArray(copia.cuentas) ? copia.cuentas : [];
    var categorias = Array.isArray(copia.categorias) ? copia.categorias : [];
    var cuentaDe = function (id) {
      var o = cuentas.find(function (x) { return x && x.id === id; });
      var d = o && activos.cuentas.find(function (x) { return x.nombre === o.nombre; });
      return (d || activos.cuentas[0]).id;
    };
    var catDe = function (id, tipo) {
      var o = categorias.find(function (x) { return x && x.id === id; });
      var d = o && activos.categorias.find(function (x) { return x.nombre === o.nombre && x.tipo === tipo; });
      return (d || activos.categorias.find(function (x) { return x.tipo === tipo; }) || activos.categorias[0]).id;
    };
    restaurandoRespaldo = true;
    mensaje(idMensaje, "Restaurando " + nuevos.length + " movimientos…");
    var hechos = 0;
    try {
      for (var m of nuevos) {
        if (fuente !== origen || datos !== activos) throw new Error("Cambió tu sesión o espacio.");
        var fila = { cuenta_id: cuentaDe(m.cuenta_id), categoria_id: catDe(m.categoria_id, m.tipo), tipo: m.tipo, monto: m.monto, descripcion: m.descripcion || null, fecha: m.fecha, etiquetas: m.etiquetas || [] };
        if (m.nota) fila.nota = m.nota;
        activos.movimientos.push(await origen.crear("movimientos", fila));
        hechos++;
      }
      mensaje(idMensaje, "Listo: se agregaron " + hechos + " movimientos.");
      toast("¡Respaldo restaurado!", hechos + " movimientos agregados");
    } catch (e) {
      mensaje(idMensaje, "La restauración se interrumpió. Se agregaron " + hechos + " de " + nuevos.length + " movimientos.", true);
    } finally {
      restaurandoRespaldo = false;
      if (hechos && fuente === origen && datos === activos) { ordenarMovimientos(); pintar(); }
    }
  }
  $("btn-restaurar").addEventListener("click", function () { $("archivo-respaldo").click(); });
  $("archivo-respaldo").addEventListener("change", async function () {
    var archivo = this.files[0], origen = fuente, activos = datos;
    this.value = "";
    if (!archivo) return;
    try {
      var copia = leerCopia(await archivo.text());
      if (fuente === origen && datos === activos) await restaurarCopia(copia, "respaldo-mensaje", false);
    } catch (e) { mensaje("respaldo-mensaje", "No se pudo restaurar. Revisa que el archivo sea un respaldo de NOVA.", true); }
  });

  function limpiarClaveRespaldo() {
    solicitudRespaldo = null;
    $("form-respaldo").reset();
    $("respaldo-continuar").disabled = false;
  }
  function abrirClaveRespaldo(archivo) {
    limpiarClaveRespaldo();
    solicitudRespaldo = { archivo: archivo, origen: fuente, activos: datos };
    $("respaldo-titulo").textContent = archivo ? "Restaurar respaldo cifrado" : "Crear respaldo cifrado";
    $("respaldo-clave").minLength = archivo ? 0 : 8;
    $("respaldo-confirmacion").hidden = !!archivo;
    $("respaldo-repetir").disabled = !!archivo;
    mensaje("respaldo-clave-mensaje", archivo ? "" : "Usa al menos 8 caracteres. Necesitarás esta contraseña para restaurar la copia.");
    mensaje("respaldo-cifrado-mensaje", "");
    abrirCapa("hoja-respaldo");
    $("respaldo-clave").focus();
  }
  $("btn-crear-cifrado").addEventListener("click", function () { abrirClaveRespaldo(null); });
  $("btn-restaurar-cifrado").addEventListener("click", function () { $("archivo-cifrado").click(); });
  $("archivo-cifrado").addEventListener("change", function () {
    var archivo = this.files[0];
    this.value = "";
    if (archivo) abrirClaveRespaldo(archivo);
  });
  $("form-respaldo").addEventListener("submit", async function (e) {
    e.preventDefault();
    var solicitud = solicitudRespaldo, boton = $("respaldo-continuar"), clave = $("respaldo-clave").value;
    if (!solicitud || boton.disabled) return;
    if (!solicitud.archivo && (clave.length < 8 || clave !== $("respaldo-repetir").value)) {
      return mensaje("respaldo-clave-mensaje", "Usa al menos 8 caracteres y repite la misma contraseña.", true);
    }
    this.reset();
    boton.disabled = true;
    mensaje("respaldo-clave-mensaje", solicitud.archivo ? "Abriendo el respaldo…" : "Cifrando el respaldo…");
    function mismaSesion() { return fuente === solicitud.origen && datos === solicitud.activos; }
    try {
      if (!mismaSesion()) throw new Error("Cambió tu sesión o espacio. Vuelve a abrir esta opción.");
      if (solicitud.archivo) {
        var sobre;
        try { sobre = JSON.parse(await solicitud.archivo.text()); }
        catch (error) { throw new Error("Ese archivo no es un respaldo cifrado válido de NOVA."); }
        if (solicitudRespaldo !== solicitud) return;
        var descifrado = NovaRespaldo.descifrar(sobre, clave);
        clave = "";
        var copia = leerCopia(await descifrado);
        if (solicitudRespaldo === solicitud) cerrarYLuego(function () {
          if (mismaSesion()) restaurarCopia(copia, "respaldo-cifrado-mensaje", true).catch(function () {
            mensaje("respaldo-cifrado-mensaje", "No se pudo restaurar el respaldo.", true);
          });
        });
      } else {
        var cifrado = NovaRespaldo.cifrar(JSON.stringify(datosRespaldo()), clave);
        clave = "";
        var archivo = await cifrado;
        if (solicitudRespaldo === solicitud && mismaSesion()) {
          descargar("nova-respaldo-" + hoyArchivo() + ".nova-respaldo", JSON.stringify(archivo), "application/json");
          cerrarCapa();
        }
      }
    } catch (error) {
      if (solicitudRespaldo === solicitud) mensaje("respaldo-clave-mensaje", error.message, true);
    } finally {
      if (solicitudRespaldo === solicitud) boton.disabled = false;
    }
  });

  // ---------- Papelera: lo borrado se guarda 30 días en este dispositivo ----------
  var restauracionesEnCurso = new Set();
  function clavePapelera(origen) { return "nova-papelera:" + origen.email; }
  function guardarPapelera(origen, lista) {
    if (origen.demo) { origen.papelera = lista; return true; }
    return guardarLocal(clavePapelera(origen), lista);
  }
  function leerPapelera(origen) {
    origen = origen || fuente;
    var lista = origen.demo ? origen.papelera : leerLocal(clavePapelera(origen), []);
    var vigentes = A.limpiarPapelera(lista, Date.now());
    if (vigentes.length !== lista.length) guardarPapelera(origen, vigentes);
    return vigentes;
  }
  function aPapelera(tabla, fila) {
    var ahora = Date.now(), id = ahora + "-" + Math.random().toString(36).slice(2);
    var lista = A.agregarAPapelera(leerPapelera(), tabla, fila, ahora, id);
    if (!guardarPapelera(fuente, lista)) throw new Error("No hay espacio para guardar una copia en la papelera.");
    pintarEstadoPapelera();
    return lista[0];
  }
  function quitarDePapelera(id, origen) {
    origen = origen || fuente;
    var guardado = guardarPapelera(origen, leerPapelera(origen).filter(function (e) { return e.id !== id; }));
    if (origen === fuente) pintarEstadoPapelera();
    return guardado;
  }
  function pintarEstadoPapelera() { var n = leerPapelera().length; $("papelera-estado").textContent = n ? n + (n === 1 ? " elemento" : " elementos") + " · se guardan 30 días" : "Recupera lo que borraste en los últimos 30 días"; }
  function recuperarDePapelera(e) {
    var origen = fuente;
    var restaurar = function () {
      if (origen === fuente) return restaurarEntrada(e);
    };
    if (!origen.demo && navigator.locks) return navigator.locks.request(clavePapelera(origen) + ":" + e.id, restaurar);
    return restaurar();
  }
  function restaurarEntrada(e) {
    var origen = fuente;
    var id = e.id;
    e = leerPapelera().find(function (x) { return x.id === id; });
    if (!e || restauracionesEnCurso.has(id)) return Promise.resolve();
    var f = Object.assign({}, e.fila); delete f.id; delete f.user_id; delete f.creado_en;
    if (e.tabla === "movimientos") {
      var vigente = filasDeTodosLosEspacios("movimientos").find(function (m) { return m.id === e.fila.id; });
      if (vigente) return Promise.reject(new Error("El movimiento original sigue registrado."));
      if (!filasDeTodosLosEspacios("cuentas").some(function (c) { return c.id === f.cuenta_id; })) return Promise.reject(new Error("La cuenta original ya no existe."));
      if (f.categoria_id != null && !categoria(f.categoria_id)) return Promise.reject(new Error("La categoría original ya no existe."));
      if (f.espacio_id === undefined) f.espacio_id = null;
    }
    restauracionesEnCurso.add(e.id);
    return origen.crear(e.tabla, f).then(function (n) {
      var todo = origen.todo();
      if (todo && (origen !== fuente || todo[e.tabla] !== datos[e.tabla])) todo[e.tabla].push(n);
      quitarDePapelera(e.id, origen);
      if (origen === fuente) {
        if (e.tabla !== "movimientos" || (n.espacio_id == null ? null : n.espacio_id) === espacioId) {
          datos[e.tabla].push(n);
          if (e.tabla === "movimientos") ordenarMovimientos();
        }
        pintar();
        toast("Restaurado", e.tabla === "movimientos" ? n.descripcion : n.nombre);
      }
    }).finally(function () { restauracionesEnCurso.delete(e.id); });
  }
  function deshacerBorrado(e) {
    var origen = fuente;
    return function () {
      if (origen === fuente) recuperarDePapelera(e).catch(function (err) { toast("No se pudo restaurar: " + err.message); });
    };
  }
  function pintarPapelera() {
    var ul = $("lista-papelera"); ul.replaceChildren();
    var l = leerPapelera();
    $("papelera-vaciar").disabled = !l.length;
    if (!l.length) ul.append(el("li", "vacio", "La papelera está vacía."));
    l.forEach(function (e) {
      var li = el("li", "mov papelera-fila"), txt = el("div", "mov-texto");
      var f = e.fila, titulo = e.tabla === "movimientos" ? f.descripcion : f.nombre;
      var tipo = e.tabla === "movimientos" ? (f.tipo === "ingreso" ? "Ingreso" : "Gasto") : "Meta";
      var valor = e.tabla === "movimientos" ? dineroEn(num(f.monto), monedaDe(f.espacio_id)) : dinero(num(f.objetivo));
      txt.append(el("strong", null, titulo), el("small", null, tipo + " · borrado el " + fechaCorta.format(new Date(e.borrado)) + (ocultos ? "" : " · " + valor)));
      var acciones = el("div", "mov-acciones");
      var rec = botonHabito("Restaurar", function () {
        rec.disabled = true;
        recuperarDePapelera(e).then(pintarPapelera).catch(function (err) { rec.disabled = false; toast("No se pudo restaurar: " + err.message); });
      });
      var del = botonHabito("Borrar para siempre", function () {
        if (restauracionesEnCurso.has(e.id) || !confirm("¿Borrar «" + titulo + "» para siempre?")) return;
        if (!quitarDePapelera(e.id)) return toast("No se pudo quitar de la papelera");
        if (f.foto_ruta && fuente.fotos) fuente.fotos.borrar(f.foto_ruta);
        pintarPapelera();
      });
      acciones.append(rec, del);
      li.append(txt, acciones); ul.append(li);
    });
  }
  $("btn-papelera").addEventListener("click", function () { pintarPapelera(); abrirCapa("pantalla-papelera"); });
  $("papelera-vaciar").addEventListener("click", function () {
    if (restauracionesEnCurso.size || borradosEnCurso.size || !confirm("¿Vaciar toda la papelera de este teléfono?")) return;
    if (!guardarPapelera(fuente, [])) return toast("No se pudo vaciar la papelera");
    pintarEstadoPapelera(); pintarPapelera();
  });

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
    if (ocultos) return;
    var texto = A.mensajeRecordatorioDeuda({ tipo: d.tipo, persona: d.persona, falta: x.falta, vence: d.vence, moneda: monedaBase() }, hoyLocal());
    if (texto) window.open("https://wa.me/?text=" + encodeURIComponent(texto), "_blank", "noopener,noreferrer");
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
      if (peor.p >= 1) toast("¡Te pasaste del límite!", nombre, "+" + dinero(-peor.falta));
      else toast("Ojo con el límite de " + nombre, "Llevas el " + Math.round(peor.p * 100) + " %", "Faltan " + dinero(peor.falta));
    }, 3400);
    return true;
  }

  $("btn-demo").addEventListener("click", function () { entrar(fuenteDemo()); });

  $("btn-salir").addEventListener("click", function () {
    var n = fuente.pendientes ? fuente.pendientes() : 0;
    if (n > 0 && !confirm("Tienes " + n + (n === 1 ? " cambio" : " cambios") + " guardados sin internet que todavía no se envían. Si cierras sesión ahora se pierden. ¿Cerrar sesión de todos modos?")) return;
    reiniciarEventos();
    var vieja = fuente;
    limpiarSesionDueno();
    fuente.salir().finally(function () {
      try { localStorage.removeItem("kv:nova-identidad"); localStorage.removeItem("nova-identidad"); } catch (e) { /* nada */ }
      if (vieja.limpiar) vieja.limpiar();
      try { var PW = enApp && window.Capacitor.Plugins && window.Capacitor.Plugins.Preferences; if (PW) { ultimoWidget = ""; PW.remove({ key: "nova-widget" }); } } catch (e) { /* nada */ }
      fuente = null; datos = datosVacios();
      avisosNube = []; erroresEnviados = [];
      encuestaInicio = null;
      pintarEncuestaInicio();
      reiniciarConfigNube();
      $("form-sugerencia").reset(); pintarContadorSugerencia();
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
