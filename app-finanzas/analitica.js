(function (raiz) {
  "use strict";

  var DIA = 86400000;
  var HORA_COLOMBIA = 5 * 3600000;

  function lista(valor) { return Array.isArray(valor) ? valor.filter(Boolean) : []; }
  function cantidad(valor) {
    return Number.isSafeInteger(valor) && valor >= 0 ? valor : null;
  }
  function porcentaje(total, base) { return base ? 100 * total / base : 0; }
  function instante(valor) { return valor == null ? NaN : new Date(valor).getTime(); }
  function diaLocal(valor) {
    if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      var dia = Date.parse(valor) / DIA;
      return Number.isFinite(dia) && fecha(dia) === valor ? dia : NaN;
    }
    return Math.floor((instante(valor) - HORA_COLOMBIA) / DIA);
  }
  function fecha(dia) { return new Date(dia * DIA).toISOString().slice(0, 10); }
  function lunes(dia) { return dia - (new Date(dia * DIA).getUTCDay() + 6) % 7; }
  function registro(p, ahora) {
    return instante(p.registro) <= instante(ahora) ? diaLocal(p.registro) : NaN;
  }
  function diasAnotados(p, ahora) {
    var hoy = diaLocal(ahora);
    return new Set(lista(p.dias).map(diaLocal).filter(function (dia) { return dia <= hoy; }));
  }
  function actividad(p, ahora) {
    var dias = diasAnotados(p, ahora);
    if (instante(p.ultimoUso) <= instante(ahora)) dias.add(diaLocal(p.ultimoUso));
    return dias;
  }
  function ultimos(dias, hoy, ventana) {
    return Array.from(dias).filter(function (dia) { return dia > hoy - ventana; }).length;
  }
  function nuevosPor(personas, ahora) {
    var hoy = diaLocal(ahora), inicioSemana = lunes(hoy);
    var inicioMes = Date.parse(fecha(hoy).slice(0, 7) + "-01") / DIA;
    var totales = { dia: 0, semana: 0, mes: 0 };
    lista(personas).forEach(function (p) {
      var dia = registro(p, ahora);
      if (dia === hoy) totales.dia++;
      if (dia >= inicioSemana) totales.semana++;
      if (dia >= inicioMes) totales.mes++;
    });
    return totales;
  }
  function crecimientoAcumulado(personas, ahora, dias) {
    var hoy = diaLocal(ahora), longitud = dias == null ? 30 : dias;
    var registros = lista(personas).map(function (p) { return registro(p, ahora); })
      .filter(Number.isFinite).sort(function (a, b) { return a - b; });
    var total = 0;
    return Array.from({ length: longitud }, function (_, i) {
      var dia = hoy - longitud + 1 + i;
      while (total < registros.length && registros[total] <= dia) total++;
      return { dia: fecha(dia), total: total };
    });
  }
  function usoActivo(personas, ahora) {
    var hoy = diaLocal(ahora), dau = 0, wau = 0, mau = 0;
    lista(personas).forEach(function (p) {
      var dias = actividad(p, ahora);
      if (dias.has(hoy)) dau++;
      if (ultimos(dias, hoy, 7)) wau++;
      if (ultimos(dias, hoy, 30)) mau++;
    });
    return { dau: dau, wau: wau, mau: mau, porcentaje: porcentaje(dau, mau) };
  }
  function retencion(personas, ahora) {
    var hoy = diaLocal(ahora), cuentas = lista(personas).map(function (p) {
      return { alta: registro(p, ahora), ultimo: Math.max.apply(null, Array.from(actividad(p, ahora))) };
    });
    return [1, 7, 30].map(function (dias) {
      var elegibles = cuentas.filter(function (p) { return p.alta + dias <= hoy; });
      var volvieron = elegibles.filter(function (p) { return p.ultimo >= p.alta + dias; }).length;
      return { dias: dias, elegibles: elegibles.length, volvieron: volvieron, porcentaje: elegibles.length ? porcentaje(volvieron, elegibles.length) : null };
    });
  }
  function cohortes(personas, ahora) {
    var hoy = diaLocal(ahora), inicio = lunes(hoy);
    var grupos = Array.from({ length: 8 }, function () { return []; });
    lista(personas).forEach(function (p) {
      var alta = registro(p, ahora), indice = (inicio - lunes(alta)) / 7;
      if (indice >= 0 && indice < grupos.length) grupos[indice].push({ alta: alta, dias: Array.from(actividad(p, ahora)) });
    });
    return grupos.map(function (grupo, i) {
      var comienzo = inicio - i * 7;
      return { semana: fecha(comienzo), total: grupo.length, porcentajes: Array.from({ length: 5 }, function (_, j) {
        var desde = comienzo + j * 7, hasta = desde + 7;
        if (!grupo.length || desde > hoy) return null;
        var activos = grupo.filter(function (p) {
          return p.dias.some(function (dia) { return dia >= p.alta && dia >= desde && dia < hasta; });
        }).length;
        return porcentaje(activos, grupo.length);
      }) };
    });
  }
  function segmentos(personas, ahora) {
    var hoy = diaLocal(ahora), tiempo = instante(ahora);
    var sinAnotar = [], riesgo = [], fieles = [];
    lista(personas).forEach(function (p) {
      if (p.movimientos === 0) sinAnotar.push(p);
      var uso = instante(p.ultimoUso);
      var dias = diasAnotados(p, ahora);
      var ultimaAnotacion = Math.max.apply(null, Array.from(dias));
      var tieneHora = uso <= tiempo && ultimaAnotacion <= diaLocal(uso);
      var inactivo = tieneHora ? tiempo - uso > 14 * DIA : ultimaAnotacion > -Infinity && ultimaAnotacion < hoy - 14;
      if (inactivo) riesgo.push(p);
      if (ultimos(dias, hoy, 30) >= 20) fieles.push(p);
    });
    return { sinAnotar: sinAnotar, riesgo: riesgo, fieles: fieles };
  }
  function etiquetasSemana() { return ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"]; }
  function picoDe(arr) {
    var indice = -1, maximo = 0;
    (Array.isArray(arr) ? arr : []).forEach(function (valor, i) {
      if (cantidad(valor) > maximo) { indice = i; maximo = valor; }
    });
    return indice;
  }
  function embudo(personas) {
    var pasos = [
      ["Registro", function () { return true; }],
      ["Confirmó el correo", function (p) { return p.confirmado; }],
      ["Primer movimiento", function (p) { return cantidad(p.movimientos) > 0; }],
      ["Primera meta", function (p) { return cantidad(p.metas) > 0; }],
      ["7 días de uso", function (p) {
        return new Set(lista(p.dias).map(diaLocal).filter(Number.isFinite)).size >= 7;
      }]
    ];
    var cuentas = lista(personas);
    return pasos.map(function (paso) {
      var base = cuentas.length;
      cuentas = cuentas.filter(paso[1]);
      return { nombre: paso[0], total: cuentas.length, porcentaje: porcentaje(cuentas.length, base) };
    });
  }
  function adopcion(personas, resumen, adopcion, monedas, fotos) {
    var cuentas = lista(personas), reales = cuentas.filter(function (p) { return p.prueba !== true; });
    var agregadosValidos = reales.length === cuentas.length;
    resumen = agregadosValidos && resumen || {};
    adopcion = agregadosValidos && adopcion || {};
    fotos = agregadosValidos && fotos || {};
    function desdePersonas(campo, agregado) {
      if (reales.every(function (p) { return p[campo] != null; })) {
        return reales.filter(function (p) { return p[campo] > 0; }).length;
      }
      return cantidad(agregado);
    }
    var otras = monedas ? Object.keys(monedas).filter(function (moneda) {
      return moneda !== "COP" && cantidad(monedas[moneda]) > 0;
    }).sort().map(function (moneda) { return { moneda: moneda, total: monedas[moneda] }; }) : null;
    var funciones = [
      ["Metas", desdePersonas("metas", resumen.metas)],
      ["Espacios", desdePersonas("espacios", resumen.espacios)],
      ["Deudas", cantidad(adopcion.deudas)],
      ["Gastos compartidos", cantidad(adopcion.grupos)],
      ["Documentos", cantidad(adopcion.documentos)],
      ["Otras monedas", agregadosValidos && otras && !otras.length ? 0 : null],
      ["Modo conductor", desdePersonas("conductor", resumen.conductores)],
      ["Fotos de recibos", cantidad(fotos.personas)]
    ].map(function (par) {
      return { nombre: par[0], total: par[1], porcentaje: par[1] == null || !reales.length ? null : porcentaje(par[1], reales.length) };
    });
    return { funciones: funciones, monedas: otras, pocoUsadas: funciones.filter(function (f) {
      return f.porcentaje != null && f.porcentaje < 10;
    }) };
  }
  function compararVersiones(a, b) {
    var partesA = a.split("."), partesB = b.split(".");
    for (var i = 0; i < Math.max(partesA.length, partesB.length); i++) {
      var diferencia = Number(partesA[i] || 0) - Number(partesB[i] || 0);
      if (diferencia) return diferencia;
    }
    return 0;
  }
  function versionesDe(personas) {
    var versiones = Object.create(null);
    lista(personas).forEach(function (p) {
      if (p.version) versiones[p.version] = (versiones[p.version] || 0) + 1;
    });
    return versiones;
  }
  function porcentajeUltimaVersion(versiones) {
    versiones = versiones || {};
    var claves = Object.keys(versiones).filter(function (v) { return /^\d+(\.\d+)*$/.test(v); });
    if (!claves.length) return null;
    claves.sort(compararVersiones);
    var version = claves[claves.length - 1];
    var total = claves.reduce(function (suma, v) { return suma + (cantidad(versiones[v]) || 0); }, 0);
    var actualizados = claves.filter(function (v) { return compararVersiones(v, version) === 0; })
      .reduce(function (suma, v) { return suma + (cantidad(versiones[v]) || 0); }, 0);
    return { version: version, total: total, actualizados: actualizados, porcentaje: porcentaje(actualizados, total) };
  }
  function repartoApk(porArchivo) {
    if (!porArchivo) return null;
    var normal = cantidad(porArchivo["NOVA.apk"]) || 0, avanzada = cantidad(porArchivo["NOVA-avanzada.apk"]) || 0;
    return { normal: normal, avanzada: avanzada, porcentajeNormal: porcentaje(normal, normal + avanzada),
      porcentajeAvanzada: porcentaje(avanzada, normal + avanzada) };
  }
  var camposCsv = ["correo", "registro", "ultimoUso", "plataforma", "version", "movimientos", "chats", "metas", "espacios"];
  function usuariosACsv(personas) {
    function celda(valor) {
      var texto = valor == null ? "" : String(valor);
      if (/^[\t\r\n]|^\s*[=+@-]/.test(texto)) texto = "'" + texto;
      return '"' + texto.replace(/"/g, '""') + '"';
    }
    var filas = [["Correo", "Registro", "Último uso", "Plataforma", "Versión", "Movimientos", "Chats", "Metas", "Espacios"]];
    lista(personas).forEach(function (p) {
      filas.push(camposCsv.map(function (campo) { return p[campo]; }));
    });
    return "\uFEFF" + filas.map(function (fila) { return fila.map(celda).join(","); }).join("\r\n") + "\r\n";
  }
  function fichaUsuario(persona, ahora) {
    var p = persona || {}, ficha = {};
    camposCsv.forEach(function (campo) { ficha[campo] = p[campo]; });
    var dias = diasAnotados(p, ahora), hoy = diaLocal(ahora);
    ficha.diasActivos30 = Array.isArray(p.dias) ? ultimos(dias, hoy, 30) : null;
    ficha.racha = Array.isArray(p.dias) ? 0 : null;
    var dia = dias.has(hoy) ? hoy : hoy - 1;
    while (dias.has(dia)) { ficha.racha++; dia--; }
    return ficha;
  }
  function correosSegmento(personas) {
    var correos = personas.map(function (p) { return p.correo || "Sin correo"; });
    return { correos: correos.slice(0, 20), restantes: Math.max(0, correos.length - 20) };
  }

  var api = {
    nuevosPor: nuevosPor, crecimientoAcumulado: crecimientoAcumulado, usoActivo: usoActivo,
    retencion: retencion, cohortes: cohortes, segmentos: segmentos, etiquetasSemana: etiquetasSemana,
    picoDe: picoDe, embudo: embudo, adopcion: adopcion, porcentajeUltimaVersion: porcentajeUltimaVersion,
    repartoApk: repartoApk, usuariosACsv: usuariosACsv, fichaUsuario: fichaUsuario,
    versionesDe: versionesDe, correosSegmento: correosSegmento
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaAnalitica = api;
})(typeof window !== "undefined" ? window : this);
