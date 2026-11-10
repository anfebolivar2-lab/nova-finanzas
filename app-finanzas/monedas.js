// Monedas y cambio a pesos colombianos (COP). Funciona en el navegador (window.NovaMonedas)
// y en Node (require) para las pruebas.
(function (raiz) {
  "use strict";

  // [código, nombre, bandera]. La primera es la moneda de la app. Son las monedas de todo el mundo para las que hay tasa de cambio
  // (las más usadas van primero, el resto en orden alfabético).
  var MONEDAS = [
    ["COP", "Peso Colombiano", "🇨🇴"], ["USD", "Dólar Estadounidense", "🇺🇸"], ["EUR", "Euro", "🇪🇺"],
    ["CAD", "Dólar Canadiense", "🇨🇦"], ["MXN", "Peso Mexicano", "🇲🇽"], ["BRL", "Real Brasileño", "🇧🇷"],
    ["ARS", "Peso Argentino", "🇦🇷"], ["CLP", "Peso Chileno", "🇨🇱"], ["PEN", "Sol Peruano", "🇵🇪"],
    ["GBP", "Libra Esterlina", "🇬🇧"], ["CHF", "Franco Suizo", "🇨🇭"], ["JPY", "Yen Japonés", "🇯🇵"],
    ["CNY", "Yuan Chino", "🇨🇳"], ["AUD", "Dólar Australiano", "🇦🇺"], ["NZD", "Dólar Neozelandés", "🇳🇿"],
    ["VES", "Bolívar Venezolano", "🇻🇪"], ["UYU", "Peso Uruguayo", "🇺🇾"], ["BOB", "Boliviano", "🇧🇴"],
    ["PYG", "Guaraní Paraguayo", "🇵🇾"], ["DOP", "Peso Dominicano", "🇩🇴"], ["CRC", "Colón Costarricense", "🇨🇷"],
    ["PAB", "Balboa Panameño", "🇵🇦"], ["GTQ", "Quetzal Guatemalteco", "🇬🇹"], ["HNL", "Lempira Hondureño", "🇭🇳"],
    ["NIO", "Córdoba Nicaragüense", "🇳🇮"], ["CUP", "Peso Cubano", "🇨🇺"], ["SEK", "Corona Sueca", "🇸🇪"],
    ["NOK", "Corona Noruega", "🇳🇴"], ["DKK", "Corona Danesa", "🇩🇰"], ["PLN", "Esloti Polaco", "🇵🇱"],
    ["TRY", "Lira Turca", "🇹🇷"], ["INR", "Rupia India", "🇮🇳"], ["KRW", "Won Surcoreano", "🇰🇷"],
    ["AED", "Dírham de EAU", "🇦🇪"], ["ILS", "Nuevo Séquel", "🇮🇱"], ["ZAR", "Rand Sudafricano", "🇿🇦"],
    ["AFN", "Afgani Afgano", "🇦🇫"], ["MGA", "Ariari Malgache", "🇲🇬"], ["THB", "Bat Tailandés", "🇹🇭"],
    ["ETB", "Bir Etíope", "🇪🇹"], ["GHS", "Cedi Ghanés", "🇬🇭"], ["KES", "Chelín Keniano", "🇰🇪"],
    ["SOS", "Chelín Somalí", "🇸🇴"], ["TZS", "Chelín Tanzano", "🇹🇿"], ["UGX", "Chelín Ugandés", "🇺🇬"],
    ["CZK", "Corona Checa", "🇨🇿"], ["FOK", "Corona Feroesa", "🇫🇴"], ["ISK", "Corona Islandesa", "🇮🇸"],
    ["GMD", "Dalasi Gambiano", "🇬🇲"], ["DZD", "Dinar Argelino", "🇩🇿"], ["BHD", "Dinar Bareiní", "🇧🇭"],
    ["IQD", "Dinar Iraquí", "🇮🇶"], ["JOD", "Dinar Jordano", "🇯🇴"], ["KWD", "Dinar Kuwaití", "🇰🇼"],
    ["LYD", "Dinar Libio", "🇱🇾"], ["MKD", "Dinar Macedonio", "🇲🇰"], ["RSD", "Dinar Serbio", "🇷🇸"],
    ["TND", "Dinar Tunecino", "🇹🇳"], ["MAD", "Dírham Marroquí", "🇲🇦"], ["STN", "Dobra de Santo Tomé", "🇸🇹"],
    ["BSD", "Dólar Bahameño", "🇧🇸"], ["BBD", "Dólar Barbadense", "🇧🇧"], ["BZD", "Dólar Beliceño", "🇧🇿"],
    ["BMD", "Dólar Bermudeño", "🇧🇲"], ["BND", "Dólar Bruneano", "🇧🇳"], ["KID", "Dólar de Kiribati", "🇰🇮"],
    ["KYD", "Dólar de las Islas Caimán", "🇰🇾"], ["TTD", "Dólar de Trinidad y Tobago", "🇹🇹"], ["TVD", "Dólar de Tuvalu", "🇹🇻"],
    ["XCD", "Dólar del Caribe Oriental", "🌎"], ["FJD", "Dólar Fiyiano", "🇫🇯"], ["GYD", "Dólar Guyanés", "🇬🇾"],
    ["HKD", "Dólar Hongkonés", "🇭🇰"], ["JMD", "Dólar Jamaicano", "🇯🇲"], ["LRD", "Dólar Liberiano", "🇱🇷"],
    ["NAD", "Dólar Namibio", "🇳🇦"], ["SBD", "Dólar Salomonense", "🇸🇧"], ["SGD", "Dólar Singapurense", "🇸🇬"],
    ["SRD", "Dólar Surinamés", "🇸🇷"], ["ZWL", "Dólar Zimbabuense", "🇿🇼"], ["VND", "Dong Vietnamita", "🇻🇳"],
    ["AMD", "Dram Armenio", "🇦🇲"], ["CVE", "Escudo de Cabo Verde", "🇨🇻"], ["ANG", "Florín Antillano Neerlandés", "🇨🇼"],
    ["AWG", "Florín Arubeño", "🇦🇼"], ["XCG", "Florín Caribeño", "🇨🇼"], ["HUF", "Forinto Húngaro", "🇭🇺"],
    ["BIF", "Franco Burundés", "🇧🇮"], ["XAF", "Franco CFA de África Central", "🌍"], ["XOF", "Franco CFA de África Occidental", "🌍"],
    ["XPF", "Franco CFP", "🇵🇫"], ["KMF", "Franco Comorense", "🇰🇲"], ["CDF", "Franco Congoleño", "🇨🇩"],
    ["GNF", "Franco Guineano", "🇬🇳"], ["RWF", "Franco Ruandés", "🇷🇼"], ["DJF", "Franco Yibutiano", "🇩🇯"],
    ["UAH", "Grivna Ucraniana", "🇺🇦"], ["BTN", "Gultrum Butanés", "🇧🇹"], ["HTG", "Gurde Haitiano", "🇭🇹"],
    ["MMK", "Kiat de Myanmar", "🇲🇲"], ["PGK", "Kina Papú", "🇵🇬"], ["LAK", "Kip Laosiano", "🇱🇦"],
    ["MWK", "Kuacha Malauí", "🇲🇼"], ["ZMW", "Kuacha Zambiano", "🇿🇲"], ["AOA", "Kuanza Angoleño", "🇦🇴"],
    ["HRK", "Kuna Croata", "🇭🇷"], ["GEL", "Lari Georgiano", "🇬🇪"], ["ALL", "Lek Albanés", "🇦🇱"],
    ["SLL", "Leone Antiguo de Sierra Leona", "🇸🇱"], ["SLE", "Leone de Sierra Leona", "🇸🇱"], ["MDL", "Leu Moldavo", "🇲🇩"],
    ["RON", "Leu Rumano", "🇷🇴"], ["BGN", "Leva Búlgara", "🇧🇬"], ["GGP", "Libra de Guernsey", "🇬🇬"],
    ["JEP", "Libra de Jersey", "🇯🇪"], ["IMP", "Libra de Man", "🇮🇲"], ["SHP", "Libra de Santa Elena", "🇸🇭"],
    ["EGP", "Libra Egipcia", "🇪🇬"], ["GIP", "Libra Gibraltareña", "🇬🇮"], ["LBP", "Libra Libanesa", "🇱🇧"],
    ["FKP", "Libra Malvinense", "🇫🇰"], ["SYP", "Libra Siria", "🇸🇾"], ["SDG", "Libra Sudanesa", "🇸🇩"],
    ["SSP", "Libra Sursudanesa", "🇸🇸"], ["SZL", "Lilangeni Esuatiní", "🇸🇿"], ["LSL", "Loti Lesotense", "🇱🇸"],
    ["AZN", "Manat Azerbaiyano", "🇦🇿"], ["TMT", "Manat Turcomano", "🇹🇲"], ["BAM", "Marco Convertible de Bosnia y Herzegovina", "🇧🇦"],
    ["MZN", "Metical Mozambiqueño", "🇲🇿"], ["NGN", "Naira Nigeriano", "🇳🇬"], ["ERN", "Nakfa Eritreo", "🇪🇷"],
    ["TWD", "Nuevo Dólar Taiwanés", "🇹🇼"], ["TOP", "Paanga Tongano", "🇹🇴"], ["MOP", "Pataca Macaense", "🇲🇴"],
    ["PHP", "Peso Filipino", "🇵🇭"], ["BWP", "Pula Botsuano", "🇧🇼"], ["QAR", "Rial Catarí", "🇶🇦"],
    ["IRR", "Rial Iraní", "🇮🇷"], ["OMR", "Rial Omaní", "🇴🇲"], ["SAR", "Rial Saudí", "🇸🇦"],
    ["YER", "Rial Yemení", "🇾🇪"], ["KHR", "Riel Camboyano", "🇰🇭"], ["MYR", "Ringit Malasio", "🇲🇾"],
    ["BYN", "Rublo Bielorruso", "🇧🇾"], ["RUB", "Rublo Ruso", "🇷🇺"], ["MVR", "Rufiya Maldiva", "🇲🇻"],
    ["LKR", "Rupia Esrilanquesa", "🇱🇰"], ["IDR", "Rupia Indonesia", "🇮🇩"], ["MUR", "Rupia Mauriciana", "🇲🇺"],
    ["NPR", "Rupia Nepalí", "🇳🇵"], ["PKR", "Rupia Pakistaní", "🇵🇰"], ["SCR", "Rupia Seychellense", "🇸🇨"],
    ["KGS", "Som Kirguís", "🇰🇬"], ["TJS", "Somoni Tayiko", "🇹🇯"], ["UZS", "Sum Uzbeko", "🇺🇿"],
    ["BDT", "Taka Bangladesí", "🇧🇩"], ["WST", "Tala Samoano", "🇼🇸"], ["KZT", "Tengue Kazajo", "🇰🇿"],
    ["MNT", "Tugrik Mongol", "🇲🇳"], ["MRU", "Uguiya Mauritano", "🇲🇷"], ["VUV", "Vatu Vanuatense", "🇻🇺"]
  ];
  var BASE = "COP";

  function sinTildes(t) { return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function info(codigo) {
    for (var i = 0; i < MONEDAS.length; i++) if (MONEDAS[i][0] === codigo) return { codigo: codigo, nombre: MONEDAS[i][1], bandera: MONEDAS[i][2] };
    return { codigo: codigo, nombre: codigo, bandera: "🏳️" };
  }
  function buscar(texto) {
    var q = sinTildes(texto);
    return MONEDAS.filter(function (m) { return !q || sinTildes(m[0] + " " + m[1]).indexOf(q) >= 0; })
      .map(function (m) { return { codigo: m[0], nombre: m[1], bandera: m[2] }; });
  }

  // Cuántos pesos vale 1 unidad de la moneda, según una tabla de tasas con base en USD
  // (como la que entrega open.er-api.com: { USD: 1, COP: 3900, EUR: 0.9, … }). null si falta.
  function tasaACOP(codigo, tasas) {
    if (codigo === BASE) return 1;
    if (!tasas) return null;
    var de = Number(tasas[codigo]), a = Number(tasas[BASE]);
    return de > 0 && a > 0 ? a / de : null;
  }

  // Pesos (redondeados) que valen "monto" unidades de la moneda con esa tasa.
  function aCOP(monto, tasa) { return Math.round(Number(monto) * Number(tasa)); }

  // La tasa se muestra con pocos decimales si es grande y más si es pequeña (1 COP en USD).
  function formatoTasa(t) {
    var n = Number(t);
    if (!(n > 0)) return "";
    var p = n.toFixed(n >= 100 ? 0 : n >= 1 ? 2 : 6).split(".");
    var dec = (p[1] || "").replace(/0+$/, "");
    return p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (dec ? "," + dec : "");   // puntos de miles y coma decimal, sin depender del idioma del celular
  }
  // Lee una tasa escrita por la persona: "3.900", "3900,50", "3 900".
  function leerTasa(texto) {
    var s = String(texto || "").replace(/\s/g, "");
    if (!s) return NaN;
    // El punto es siempre de miles (3.900 · 1.234.567) y la coma de decimales (0,00025): así se escribe en Colombia
    // y así los campos los ponen solos, incluso mientras la persona va escribiendo (3.9000 → 39.000).
    s = s.replace(/\./g, "").replace(",", ".");
    var n = Number(s);
    return n > 0 && isFinite(n) ? n : NaN;
  }
  // Convierte entre dos monedas cualesquiera con una tabla de tasas con base en USD. null si falta alguna tasa.
  function convertir(monto, de, a, tasas) {
    if (!tasas) return null;
    var x = Number(tasas[de]), y = Number(tasas[a]);
    return x > 0 && y > 0 && isFinite(Number(monto)) ? (Number(monto) / x) * y : null;
  }
  // Número con puntos de miles y coma decimal: pocos decimales si es grande y más si es pequeño.
  function formatoNumero(n) {
    n = Number(n);
    if (!isFinite(n)) return "";
    var a = Math.abs(n), p = a.toFixed(a >= 100 ? 0 : a >= 1 ? 2 : a >= 0.01 ? 4 : 6).split("."), dec = (p[1] || "").replace(/0+$/, "");
    return (n < 0 ? "-" : "") + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (dec ? "," + dec : "");
  }
  function formatoMonto(monto, codigo) {
    var n = Number(monto);
    try { return new Intl.NumberFormat("es-CO", { style: "currency", currency: codigo, maximumFractionDigits: Math.abs(n) >= 1000 ? 0 : 2 }).format(n); }
    catch (e) { return codigo + " " + n; }
  }

  // ¿En qué moneda está el valor de una frase o de un mensaje del banco? "20 dólares", "USD 15", "US$ 9,99", "€30",
  // "15 euros", "100 reales"… Devuelve el código (USD, EUR…) o null si no nombra otra moneda (los pesos no cuentan:
  // "$ 20.000" o "20 mil pesos" es la moneda de la app).
  var PALABRAS = [
    [/\bd[oó]lar(?:es)?\s+canadienses?\b/, "CAD"], [/\bd[oó]lar(?:es)?\s+australianos?\b/, "AUD"],
    [/\bpesos?\s+mexicanos?\b/, "MXN"], [/\bpesos?\s+chilenos?\b/, "CLP"], [/\bpesos?\s+argentinos?\b/, "ARS"],
    [/\bpesos?\s+uruguayos?\b/, "UYU"], [/\bpesos?\s+dominicanos?\b/, "DOP"],
    [/\bd[oó]lar(?:es)?\b|\bdolarucos?\b/, "USD"], [/\beuros?\b/, "EUR"],
    [/\breales?\b/, "BRL"], [/\bsoles\b/, "PEN"], [/\byenes\b/, "JPY"], [/\bbol[ií]vares\b/, "VES"]
  ];
  function detectar(texto) {
    var t = String(texto || "");
    if (/(?:^|[^A-Za-z])(?:US\$|U\$S|U\$D)/i.test(t)) return "USD";
    if (/€/.test(t)) return "EUR";
    if (/£/.test(t)) return "GBP";
    if (/R\$/.test(t)) return "BRL";
    // Un código de tres letras pegado a un número: "USD 25", "25 eur", "MXN350".
    var codigos = t.match(/(?:\b([A-Za-z]{3})\s?\d|\d\s?([A-Za-z]{3})\b)/g) || [];
    for (var i = 0; i < codigos.length; i++) {
      var c = codigos[i].replace(/[\d\s]/g, "").toUpperCase();
      if (c !== BASE && MONEDAS.some(function (m) { return m[0] === c; })) return c;
    }
    var low = t.toLowerCase();
    for (var j = 0; j < PALABRAS.length; j++) if (PALABRAS[j][0].test(low)) return PALABRAS[j][1];
    return null;
  }

  var api = { detectar: detectar, MONEDAS: MONEDAS, BASE: BASE, info: info, buscar: buscar, tasaACOP: tasaACOP, aCOP: aCOP, formatoTasa: formatoTasa, leerTasa: leerTasa, formatoMonto: formatoMonto, convertir: convertir, formatoNumero: formatoNumero };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaMonedas = api;
})(typeof window !== "undefined" ? window : this);
