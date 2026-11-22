(function (raiz) {
  "use strict";

  var api = {
    VERSION: 3,
    PAGINAS: [
      {
        iconos: ["🎤", "📷", "💬", "✨"],
        titulo: "NOVA IA ahora te ve y te escucha",
        texto: "En el chat de NOVA IA hay dos botones nuevos junto al campo de texto.",
        puntos: [
          ["🎤", "Háblale", "Toca el micrófono, di tu pregunta y se envía sola cuando terminas de hablar."],
          ["📷", "Mándale una foto", "Un recibo, un producto o una factura. Si es un recibo, te dice el total y el comercio y te ofrece anotarlo como gasto."],
          ["🔒", "Tu historial se mantiene liviano", "Al guardar la conversación solo queda el texto, no la foto."]
        ]
      },
      {
        titulo: "Entiende mejor tu plata",
        texto: "Tres recuadros nuevos en Análisis, calculados con tus propios movimientos.",
        puntos: [
          ["🕊️", "Tu número de libertad", "Cuántos meses podrías vivir con lo que tienes si dejaras de recibir ingresos."],
          ["📊", "Tu mes vs. tu promedio", "Cómo vas este mes comparado con lo que normalmente llevas gastado a esta altura, categoría por categoría."],
          ["🕒", "A qué hora y qué día gastas", "Un mapa de colores para ver en qué momentos se te va más la plata."]
        ],
        pie: "📍 En Análisis → Personalizar puedes mostrar u ocultar cada recuadro."
      },
      {
        titulo: "Tarjeta, divisas y compartir",
        texto: "Más herramientas para decidir mejor y para invitar a otros.",
        puntos: [
          ["💳", "Simulador de tarjeta de crédito", "En Planes → Deudas: mira cuánto pagarías de intereses si solo pagas el mínimo y cuánto ahorras con una cuota fija."],
          ["💱", "Tasas del día", "Las tasas de cambio se actualizan con la fecha de hoy y el dólar usa la TRM oficial de Colombia."],
          ["📤", "Compartir NOVA", "En Ajustes → Datos: invita a alguien y el enlace sale con el logo y el nombre."]
        ]
      }
    ]
  };

  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaNovedades = api;
})(typeof window !== "undefined" ? window : this);
