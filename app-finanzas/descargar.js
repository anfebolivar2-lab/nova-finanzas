// Página de descarga: elige qué APK ofrecer y avisa cuando empieza la descarga. Sin datos de nadie.
(function () {
  "use strict";
  var base = "https://github.com/anfebolivar2-lab/nova-finanzas/releases/download/nova-android/";
  var boton = document.getElementById("descargar-boton");
  var estado = document.getElementById("descarga-estado");
  if (!boton) return;
  var avanzada = /(?:^|[?&])v=avanzada(?:&|$)/.test(window.location.search);
  var archivo = avanzada ? "NOVA-avanzada.apk" : "NOVA.apk";
  boton.href = base + archivo;
  boton.setAttribute("download", archivo);
  if (avanzada && estado) estado.textContent = "Al tocar el botón, tu celular empieza a bajar el archivo " + archivo + ". Puede tardar unos segundos.";
  boton.addEventListener("click", function () {
    boton.textContent = "Descargando… revisa las notificaciones";
    boton.setAttribute("aria-busy", "true");
    if (estado) estado.textContent = "Cuando termine, abre el archivo " + archivo + " y toca Instalar.";
  });
})();
