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
  function sumarDias(serie, desde, hasta) {
    var total = 0;
    for (var dia = desde; dia <= hasta; dia++) {
      var valor = cantidad(serie[fecha(dia)]);
      if (valor == null) return null;
      total += valor;
    }
    return total;
  }
  function serieDiaria(dias, campo) {
    var serie = Object.create(null);
    lista(dias).forEach(function (fila) { serie[fila.dia] = fila[campo]; });
    return serie;
  }
  function comparativoMensual(datos, ahora) {
    var tiempo = instante(ahora), hoy = Math.floor(tiempo / DIA);
    var movimientos = serieDiaria(datos.dias, "movimientos");
    var chats = datos.chatsPorDia, errores = datos.errores || {};
    var resumen = datos.resumen || {};
    var cuentas = Array.isArray(datos.personas) ? lista(datos.personas).filter(function (p) { return p.prueba !== true; }) : null;
    var registros = cuentas && cuentas.map(function (p) {
      return instante(p.registro) <= tiempo ? Math.floor(instante(p.registro) / DIA) : NaN;
    });
    // El historial por persona ya viene agrupado por fecha de Colombia.
    var usos = cuentas && cuentas.every(function (p) { return Array.isArray(p.dias); }) &&
      cuentas.map(function (p) { return Array.from(actividad(p, ahora)); });

    function sumarMapa(mapa, desde, hasta) {
      var total = 0;
      for (var dia = desde; dia <= hasta; dia++) {
        var clave = fecha(dia);
        if (!Object.prototype.hasOwnProperty.call(mapa, clave)) continue;
        var valor = cantidad(mapa[clave]);
        if (valor == null) return null;
        total += valor;
      }
      return total;
    }
    function periodo(desde, hasta) {
      return [
        registros && registros.every(Number.isFinite) ? registros.filter(function (dia) { return dia >= desde && dia <= hasta; }).length : null,
        usos ? usos.filter(function (dias) {
          return dias.some(function (dia) { return dia >= desde && dia <= hasta; });
        }).length : null,
        sumarDias(movimientos, desde, hasta),
        chats && (Object.keys(chats).length || resumen.chats === 0) ? sumarMapa(chats, desde, hasta) : null,
        // La consulta de errores abarca 30 × 24 horas y devuelve hasta 500 filas.
        // Un mapa vacío también es la respuesta ante un fallo de esa consulta.
        errores.porDia && Object.keys(errores.porDia).length && errores.total30 < 500 &&
          desde >= Math.ceil(tiempo / DIA - 30) ? sumarMapa(errores.porDia, desde, hasta) : null
      ];
    }

    var inicio = Math.floor(Date.parse(fecha(hoy).slice(0, 7) + "-01") / DIA);
    var anterior = Math.floor(Date.parse(fecha(inicio - 1).slice(0, 7) + "-01") / DIA);
    var esteMes = periodo(inicio, hoy), mesPasado = periodo(anterior, inicio - 1);
    var nombres = ["Registros nuevos", "Personas activas", "Movimientos anotados", "Chats con la IA", "Errores"];
    return {
      mes: fecha(inicio).slice(0, 7), mesAnterior: fecha(anterior).slice(0, 7),
      filas: nombres.map(function (nombre, i) {
        var actual = esteMes[i], previo = mesPasado[i];
        return { nombre: nombre, actual: actual, anterior: previo,
          cambio: actual != null && previo > 0 ? porcentaje(actual - previo, previo) : null };
      })
    };
  }
  function proyeccionUsuarios(total, nuevos30) {
    if (cantidad(total) == null || cantidad(nuevos30) == null || nuevos30 > total) return null;
    return [3, 6].map(function (meses) { return { meses: meses, usuarios: total + meses * nuevos30 }; });
  }
  function hitosUsuarios(total) {
    if (cantidad(total) == null) return null;
    var hitos = [10, 25, 50, 100, 250, 500, 1000].map(function (meta) {
      return { meta: meta, logrado: total >= meta };
    });
    var siguiente = hitos.find(function (hito) { return !hito.logrado; });
    return { hitos: hitos, siguiente: siguiente ? siguiente.meta : null,
      faltan: siguiente ? siguiente.meta - total : 0, avance: siguiente ? porcentaje(total, siguiente.meta) : 100 };
  }
  function costosNegocio(valores, activos30) {
    var costos = valores.map(function (valor) {
      if (valor == null || valor === "") return null;
      if (typeof valor !== "number" && (typeof valor !== "string" || !valor.trim())) return NaN;
      var numero = Number(valor);
      return Number.isFinite(numero) && numero >= 0 ? numero : NaN;
    });
    var total = costos.reduce(function (suma, valor) { return suma + valor; }, 0);
    var valido = Number.isFinite(total);
    if (!valido || costos.every(function (valor) { return valor == null; })) total = null;
    return { valido: valido, valores: costos, total: total,
      porActivo: total != null && cantidad(activos30) > 0 ? total / activos30 : null };
  }
  var camposCsv = ["correo", "registro", "ultimoUso", "plataforma", "version", "movimientos", "chats", "metas", "espacios"];
  function usuariosACsv(personas, negocio) {
    function celda(valor) {
      var texto = valor == null ? "" : String(valor);
      if (typeof valor !== "number" && /^[\t\r\n]|^\s*[=+@-]/.test(texto)) texto = "'" + texto;
      return '"' + texto.replace(/"/g, '""') + '"';
    }
    var filas = [["Correo", "Registro", "Último uso", "Plataforma", "Versión", "Movimientos", "Chats", "Metas", "Espacios"]];
    lista(personas).forEach(function (p) {
      filas.push(camposCsv.map(function (campo) { return p[campo]; }));
    });
    if (negocio) {
      var comparativo = negocio.comparativo;
      filas.push([], ["Comparativo mensual", comparativo.mes, comparativo.mesAnterior, "Cambio (%)"]);
      comparativo.filas.forEach(function (fila) {
        filas.push([fila.nombre, fila.actual == null ? "sin dato" : fila.actual,
          fila.anterior == null ? "sin dato" : fila.anterior, fila.cambio]);
      });
      filas.push([], ["Proyección estimada", "Usuarios"]);
      (negocio.proyeccion || []).forEach(function (fila) {
        filas.push([fila.meses + " meses", fila.usuarios]);
      });
      if (!negocio.proyeccion) filas.push(["sin dato"]);
      filas.push([], ["Hitos (usuarios)", "Estado", "Usuarios que faltan para el siguiente"]);
      if (negocio.hitos) negocio.hitos.hitos.forEach(function (hito) {
        filas.push([hito.meta, hito.logrado ? "Logrado" : "Pendiente",
          hito.meta === negocio.hitos.siguiente ? negocio.hitos.faltan : null]);
      });
      else filas.push(["sin dato"]);
    }
    return "\uFEFF" + filas.map(function (fila) { return fila.map(celda).join(","); }).join("\r\n") + "\r\n";
  }
  function fichaUsuario(persona, ahora) {
    var p = persona || {}, ficha = {};
    camposCsv.forEach(function (campo) { ficha[campo] = p[campo]; });
    var dias = diasAnotados(p, ahora), hoy = diaLocal(ahora);
    ficha.diasActivos30 = Array.isArray(p.dias) ? ultimos(dias, hoy, 30) : null;
    ficha.origen = p.origen ? nombreOrigen(p.origen) : "";
    ficha.referidoPor = p.referidoPor || "";
    ficha.racha = Array.isArray(p.dias) ? 0 : null;
    var dia = dias.has(hoy) ? hoy : hoy - 1;
    while (dias.has(dia)) { ficha.racha++; dia--; }
    return ficha;
  }
  function correosSegmento(personas) {
    var correos = personas.map(function (p) { return p.correo || "Sin correo"; });
    return { correos: correos.slice(0, 20), restantes: Math.max(0, correos.length - 20) };
  }

  function barras(filas) {
    var maximo = filas.reduce(function (max, fila) { return Math.max(max, fila.total); }, 0);
    return filas.map(function (fila) { return Object.assign({}, fila, { porcentaje: porcentaje(fila.total, maximo) }); });
  }

  var nombresOrigen = Object.assign(Object.create(null), {
    qr: "Código QR", whatsapp: "WhatsApp", instagram: "Instagram", facebook: "Facebook",
    tiktok: "TikTok", amigos: "Amigos", descarga: "Página de descarga", directo: "Directo"
  });

  function nombreOrigen(clave) { return nombresOrigen[clave] || clave; }

  function prepararAtribucion(datos) {
    datos = datos || {};
    var referidos = datos.referidos || {};
    var origenes = lista(datos.origenes).filter(function (fila) {
      return typeof fila.nombre === "string" && fila.nombre && cantidad(fila.total) > 0;
    }).map(function (fila) {
      return { nombre: nombreOrigen(fila.nombre), total: fila.total };
    }).sort(function (a, b) { return b.total - a.total; });
    var top = lista(referidos.top).filter(function (fila) {
      return typeof fila.correo === "string" && fila.correo && cantidad(fila.invitados) > 0;
    }).sort(function (a, b) { return b.invitados - a.invitados; }).slice(0, 5);
    return { origenes: barras(origenes), total: cantidad(referidos.total) || 0, top: top };
  }

  function enlacesOrigen(base) {
    return ["qr", "whatsapp", "instagram", "facebook", "tiktok", "amigos"].map(function (clave) {
      return { clave: clave, nombre: nombreOrigen(clave), url: base + "?o=" + clave };
    });
  }

  var temasIA = Object.assign(Object.create(null), {
    tema_gastos: "Gastos", tema_ahorro: "Ahorro", tema_deudas: "Deudas", tema_presupuesto: "Presupuesto",
    tema_impuestos: "Impuestos", tema_inversion: "Inversiones", tema_ingresos: "Ingresos", tema_otro: "Otros"
  });

  function prepararIA(uso) {
    uso = uso || {};
    var rapidez = uso.iaRapidez || {};
    var tiempos = [rapidez.promedioMs, rapidez.medianaMs, rapidez.p90Ms];
    var tieneRapidez = cantidad(rapidez.n) > 0 && tiempos.every(function (ms) { return Number.isFinite(ms) && ms > 0; });
    return {
      rapidez: tieneRapidez ? { n: rapidez.n, promedioSeg: tiempos[0] / 1000, medianaSeg: tiempos[1] / 1000,
        p90Seg: tiempos[2] / 1000 } : null,
      temas: barras(lista(uso.iaTemas).filter(function (fila) {
        return typeof fila.nombre === "string" && temasIA[fila.nombre] && cantidad(fila.total) > 0;
      }).map(function (fila) {
        return { nombre: temasIA[fila.nombre], total: fila.total };
      }).sort(function (a, b) { return b.total - a.total; })),
      top: lista(uso.iaTop).filter(function (fila) {
        return typeof fila.correo === "string" && fila.correo && !/@example\.com$/i.test(fila.correo) && cantidad(fila.preguntas) > 0;
      }).map(function (fila) {
        return { nombre: fila.correo, total: fila.preguntas };
      }).sort(function (a, b) { return b.total - a.total || a.nombre.localeCompare(b.nombre); }).slice(0, 5)
    };
  }

  function cupoIAPorDia(porDia, ahora, rango) {
    var hoy = Math.floor(instante(ahora) / DIA);
    if (!porDia || !Number.isFinite(hoy)) return [];
    rango = [7, 14, 30].includes(rango) ? rango : 30;
    return Array.from({ length: rango }, function (_, i) {
      var dia = fecha(hoy - rango + 1 + i);
      return { dia: dia, total: cantidad(porDia[dia]) || 0 };
    });
  }

  function prepararUso(uso, ahora) {
    if (!uso) return null;
    var total = cantidad(uso.totalEventos) || 0;
    if (!total) return { total: 0 };
    function conteos(datos, etiquetas) {
      return barras(etiquetas.map(function (par) {
        return { nombre: par[1], total: cantidad((datos || {})[par[0]]) || 0 };
      }));
    }
    function ranking(filas) {
      return barras(lista(filas).map(function (fila) {
        return { id: fila.nombre, nombre: fila.nombre, total: cantidad(fila.total) || 0, personas: cantidad(fila.personas) };
      }));
    }
    var porDia = uso.iaPorDia || {}, dias = [];
    var hoy = Math.floor(instante(ahora) / DIA);
    if (Number.isFinite(hoy) && Object.keys(porDia).length) {
      for (var dia = hoy - 30; dia <= hoy; dia++) {
        var clave = fecha(dia);
        dias.push({ dia: clave, total: cantidad(porDia[clave]) || 0 });
      }
    }
    var sesion = uso.sesion || {}, seguridad = uso.seguridad || {};
    function segundos(valor) { return Number.isFinite(valor) && valor >= 0 ? valor : 0; }
    return {
      total: total,
      pantallas: ranking(uso.pantallas),
      anotar: conteos(uso.anotar, [["texto", "Texto"], ["voz", "Voz"], ["foto", "Foto"], ["banco", "Mensaje del banco"], ["manual", "Formulario manual"], ["rapido", "Registro rápido"]]),
      ia: conteos(uso.ia, [["pregunta_texto", "Consultas por texto"], ["pregunta_foto", "Consultas por foto"], ["pregunta_voz", "Consultas por voz"],
        ["error_cupo", "Errores de cupo"], ["error_tiempo", "Errores de tiempo"], ["error_otro", "Otros errores"], ["busqueda_web", "Respuestas con búsqueda web"]]),
      dias: dias,
      sesion: { n: cantidad(sesion.n) || 0, promedioSeg: segundos(sesion.promedioSeg), medianaSeg: segundos(sesion.medianaSeg) },
      tema: conteos(uso.tema, [["oscuro", "Oscuro"], ["claro", "Claro"]]),
      seguridad: conteos(seguridad, [["pin", "PIN activado"], ["huella", "Huella activada"]]),
      personasSeguridad: cantidad(seguridad.personas) || 0,
      conductor: cantidad(uso.conductor) || 0,
      recuadros: ranking(uso.recuadrosOcultos)
    };
  }

  var api = {
    prepararAtribucion: prepararAtribucion, enlacesOrigen: enlacesOrigen,
    prepararUso: prepararUso, prepararIA: prepararIA, cupoIAPorDia: cupoIAPorDia,
    nuevosPor: nuevosPor, crecimientoAcumulado: crecimientoAcumulado, usoActivo: usoActivo,
    retencion: retencion, cohortes: cohortes, segmentos: segmentos, etiquetasSemana: etiquetasSemana,
    picoDe: picoDe, embudo: embudo, adopcion: adopcion, porcentajeUltimaVersion: porcentajeUltimaVersion,
    repartoApk: repartoApk, usuariosACsv: usuariosACsv, fichaUsuario: fichaUsuario,
    versionesDe: versionesDe, correosSegmento: correosSegmento,
    comparativoMensual: comparativoMensual, proyeccionUsuarios: proyeccionUsuarios,
    hitosUsuarios: hitosUsuarios, costosNegocio: costosNegocio
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaAnalitica = api;
})(typeof window !== "undefined" ? window : this);
