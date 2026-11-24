"use strict";

document.querySelectorAll("[data-atribucion]").forEach(function (enlace) {
  enlace.href = window.NovaOrigen.enlaceConAtribucion(enlace.href, window.location.href);
});

document.querySelectorAll(".captura img").forEach(function (imagen) {
  function mostrarReemplazo() {
    imagen.hidden = true;
    imagen.previousElementSibling.removeAttribute("aria-hidden");
  }
  imagen.addEventListener("error", mostrarReemplazo);
  if (imagen.complete && !imagen.naturalWidth) mostrarReemplazo();
});
