(function (raiz) {
  "use strict";

  // Solo identificadores de la app. Mantener en sincronía con el catálogo de nova-dueno.
  var nombres = Object.assign(Object.create(null), {
    pantalla: `
      abonos asistente banco calendario calor categoria categorizar-lote chat
      cuadrar deducibles detalle deuda documento dueno editar espacio
      espacios estado-financiero grupo grupo-nuevo historial informe informe-dueno limite
      mas moneda notas-nova papelera pasar pruebas registro respaldo
      simulacion sugerencia tarjeta tab_inicio tab_planes tab_analisis tab_buscar`,
    anotar: "texto voz foto banco manual rapido",
    ia: "pregunta_texto pregunta_foto pregunta_voz error_cupo error_tiempo error_otro busqueda_web",
    sesion: "duracion",
    ajuste: "tema_oscuro tema_claro pin_on pin_off huella_on huella_off modo_conductor_on modo_conductor_off",
    recuadro: `
      oculto_sugerencias-hora oculto_trm-dia oculto_racha oculto_pagos-proximos oculto_rapida oculto_categorias oculto_etiquetas oculto_ingresos-gastos
      oculto_tendencia oculto_proyeccion oculto_consejos oculto_calendario oculto_logros oculto_herramientas oculto_salud oculto_calculadoras2
      oculto_reto oculto_suscripciones oculto_inflacion oculto_comparar oculto_evento oculto_fijos oculto_pronostico oculto_anio
      oculto_bola oculto_alcancia oculto_sobres oculto_plan oculto_singasto oculto_lugares oculto_semanasmes oculto_reduccion
      oculto_mesvsprom oculto_libertad oculto_calorhora oculto_resumensemana oculto_mayoresgastos oculto_cortes-tarjeta oculto_saldo-bajo oculto_avisos-limite
      oculto_resumen-mes oculto_meta-sugerida oculto_ingresos-gastos-12 oculto_tendencia-categorias oculto_ranking-comercios oculto_compara-anios oculto_flujo-semanal oculto_dia-mas-caro
      oculto_patrimonio-neto oculto_distribucion-patrimonio oculto_vencimientos-cdt oculto_calculadoras-inversion oculto_promedio-dia oculto_regla503020 oculto_gasto-inusual oculto_fondo-emergencia
      oculto_servicios-por-mes oculto_consejo-dia oculto_pruebas-gratis oculto_aviso-pago oculto_calificar-compra oculto_resumen-compras oculto_sugerencias-ahorro`
  });
  Object.keys(nombres).forEach(function (tipo) { nombres[tipo] = nombres[tipo].trim().split(/\s+/); });

  function normalizar(texto) { return typeof texto === "string" ? texto.trim().toLowerCase().replace(/\s+/g, "_") : ""; }

  function eventoSeguro(tipo, nombre, valor) {
    tipo = normalizar(tipo);
    nombre = normalizar(nombre);
    if (!nombres[tipo] || !/^[a-z0-9_.:-]{1,40}$/.test(nombre) || nombres[tipo].indexOf(nombre) < 0) return null;
    if (valor != null && (tipo !== "sesion" || !Number.isInteger(valor) || valor < 0 || valor > 86400)) return null;
    return { tipo: tipo, nombre: nombre, valor: valor == null ? null : valor };
  }

  function encolar(cola, evento) {
    return evento ? cola.slice(-49).concat([evento]) : cola;
  }

  function lotesParaEnviar(cola) {
    var lotes = [];
    for (var i = 0; i < cola.length; i += 25) lotes.push(cola.slice(i, i + 25));
    return lotes;
  }

  var api = { eventoSeguro: eventoSeguro, encolar: encolar, lotesParaEnviar: lotesParaEnviar };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaEventos = api;
})(typeof window !== "undefined" ? window : this);
