(function (raiz) {
  "use strict";

  var unidades = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
  var hasta29 = ["diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete",
    "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro",
    "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"];
  var decenas = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
  var centenas = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos",
    "seiscientos", "setecientos", "ochocientos", "novecientos"];

  function grupo(n) {
    if (n === 100) return "cien";
    var resto = n % 100;
    var decena = Math.floor(resto / 10);
    var unidad = unidades[resto % 10];
    var texto = unidad;
    if (decena >= 3) texto = decenas[decena] + (unidad ? " y " + unidad : "");
    else if (resto >= 10) texto = hasta29[resto - 10];
    return [centenas[Math.floor(n / 100)], texto].filter(Boolean).join(" ");
  }

  function apocopar(texto) {
    return texto.replace(/veintiuno$/, "veintiún").replace(/uno$/, "un");
  }

  function valorEnLetras(n) {
    if (!Number.isInteger(n) || n < 0 || n > 999999999) return "";
    if (n === 0) return "cero pesos";
    if (n === 1) return "un peso";
    var millones = Math.floor(n / 1000000);
    var miles = Math.floor(n / 1000) % 1000;
    var partes = [];
    if (millones) partes.push(millones === 1 ? "un millón" : apocopar(grupo(millones)) + " millones");
    if (miles) partes.push(miles === 1 ? "mil" : apocopar(grupo(miles)) + " mil");
    if (n % 1000) partes.push(apocopar(grupo(n % 1000)));
    return partes.join(" ") + (n % 1000000 === 0 ? " de pesos" : " pesos");
  }

  function texto(valor) { return typeof valor === "string" ? valor.trim() : ""; }

  function validar(datos) {
    datos = datos || {};
    if (!texto(datos.quienCobra)) return "Escribe tu nombre.";
    if (!texto(datos.cliente)) return "Escribe el nombre del cliente.";
    if (!texto(datos.concepto)) return "Escribe el concepto de la cuenta de cobro.";
    if (!Number.isFinite(datos.valor) || datos.valor <= 0) return "Escribe un valor mayor que cero.";
    return "";
  }

  var cargaPdf;
  function cargarPdf() {
    if (raiz.jspdf && raiz.jspdf.jsPDF) return Promise.resolve();
    if (!cargaPdf) {
      cargaPdf = new Promise(function (resolver, rechazar) {
        var script = raiz.document.createElement("script");
        script.src = "vendor/informes/jspdf.umd.min.js";
        script.onload = resolver;
        script.onerror = function () {
          script.remove();
          rechazar(new Error("No se pudo cargar el generador de PDF."));
        };
        raiz.document.head.append(script);
      }).catch(function (error) { cargaPdf = null; throw error; });
    }
    return cargaPdf;
  }

  function crear(datos) {
    var error = validar(datos);
    if (error) return Promise.reject(new Error(error));
    return cargarPdf().then(function () {
      var doc = new raiz.jspdf.jsPDF({ format: "a4", unit: "mm" });
      var ahora = new Date();
      var fecha = [ahora.getFullYear(), String(ahora.getMonth() + 1).padStart(2, "0"),
        String(ahora.getDate()).padStart(2, "0")].join("-");
      var fechaVisible = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric" }).format(ahora);
      var y = 23;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(18);
      doc.text("CUENTA DE COBRO", 20, y);
      y += 12;
      doc.setFontSize(11);

      function bloque(etiqueta, contenido) {
        if (!contenido) return;
        doc.splitTextToSize(etiqueta + contenido, 170).forEach(function (linea) {
          if (y > 270) { doc.addPage(); y = 23; }
          doc.text(linea, 20, y);
          y += 6;
        });
        y += 3;
      }

      function nombreConDocumento(nombre, documento) {
        return texto(nombre) + (texto(documento) ? " (" + texto(documento) + ")" : "");
      }

      var formato = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", currencyDisplay: "code" });
      var valorFormateado = formato.format(datos.valor);
      var centavos = Math.round(datos.valor * 100);
      var letras = valorEnLetras(Math.floor(centavos / 100));
      var fraccion = centavos % 100;
      if (letras && fraccion) letras += " con " + (fraccion === 1 ? "un centavo" : apocopar(grupo(fraccion)) + " centavos");

      bloque("N.° ", texto(datos.numero));
      bloque("", [texto(datos.ciudad), fechaVisible].filter(Boolean).join(", "));
      bloque("El cliente: ", nombreConDocumento(datos.cliente, datos.docCliente));
      bloque("Debe a: ", nombreConDocumento(datos.quienCobra, datos.docQuienCobra));
      bloque("Por concepto de: ", texto(datos.concepto));
      bloque("La suma de: ", valorFormateado + (letras ? " (" + letras + ")" : ""));
      bloque("Datos de pago: ", texto(datos.pago));
      bloque("Contacto: ", texto(datos.contacto));
      bloque("Nota: ", texto(datos.nota));

      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text("Hecho con NOVA", 20, 284);

      var cliente = texto(datos.cliente).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "cliente";
      return { bytes: new Uint8Array(doc.output("arraybuffer")),
        nombre: "cuenta-de-cobro-" + cliente + "-" + fecha + ".pdf", tipo: "application/pdf" };
    });
  }

  var api = { valorEnLetras: valorEnLetras, validar: validar, crear: crear };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaCuentaCobro = api;
})(typeof window !== "undefined" ? window : this);
