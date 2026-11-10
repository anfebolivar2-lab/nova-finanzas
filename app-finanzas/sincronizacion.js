// Modo sin internet de NOVA: guarda una copia de los datos en el celular y, si no hay conexión, deja los cambios
// en una cola que se envía sola cuando vuelve el internet. Funciona en el navegador (window.NovaSync) y en Node
// (require) para las pruebas.
//
// envolver(base, opciones) devuelve una fuente de datos con las mismas operaciones que la de Supabase
// (cargar, crear, crearVarios, actualizar, borrar, guardarPerfil, salir) más: pendientes(), sincronizar(), limpiar().
// opciones: { almacen: { get(clave), set(clave, valor), del(clave) } (asíncrono), usuarioId, enLinea(), antes() (asíncrono, p. ej. renovar la sesión),
//             alMapear(mapaIds, filas), alCambiar(estado), alFallar(operacion, error), ahora() }
(function (raiz) {
  "use strict";

  function copia(o) { return o === undefined || o === null ? o : JSON.parse(JSON.stringify(o)); }
  function texto(e) { return String((e && (e.message || e.details || e.error_description)) || e || ""); }
  // Fallas de conexión: la operación no llegó (o no se sabe que llegó) y se puede intentar de nuevo después.
  function esErrorDeRed(e) { return /failed to fetch|networkerror|network request failed|load failed|fetch failed|network error|err_internet|err_network|econnrefused|enotfound|etimedout|timed out|sin internet/i.test(texto(e)); }
  // Sesión vencida: se renueva al volver la conexión; no se debe perder el cambio.
  function esErrorDeSesion(e) { return /jwt|token is expired|token has expired|not authenticated|invalid token|invalid jwt|refresh token/i.test(texto(e)); }
  function esReintentable(e) { return esErrorDeRed(e) || esErrorDeSesion(e); }

  var POR_DEFECTO = {
    movimientos: function (f, ahora) { return { estado: "pagado" }; },
    metas: function () { return { ahorrado: 0 }; },
    limites: function (f, ahora) { return { creado_en: ahora }; }
  };

  function envolver(base, op) {
    var almacen = op.almacen, uid = op.usuarioId || "anon";
    var enLinea = op.enLinea || function () { return true; };
    var ahora = op.ahora || function () { return new Date().toISOString(); };
    var K = { estado: "nova:" + uid + ":estado", meta: "nova:" + uid + ":meta" };
    var estado = null, cola = [], mapa = {}, temp = 0, listo = null, vaciando = false, fallidas = [], guardando = null, sucio = false;

    function iniciar() {
      if (!listo) {
        listo = almacen.get(K.meta).then(function (m) {
          if (m) { cola = m.cola || []; mapa = m.mapa || {}; temp = m.temp || 0; }
        }).catch(function () { /* sin almacenamiento: se trabaja en memoria */ });
      }
      return listo;
    }
    function avisar() { if (op.alCambiar) { try { op.alCambiar({ pendientes: cola.length, fallidas: fallidas.length }); } catch (e) { /* la pantalla no debe frenar los datos */ } } }
    function guardarMeta() { return almacen.set(K.meta, { cola: cola, mapa: mapa, temp: temp }).catch(function () { /* sin espacio */ }); }
    function guardarEstado() {
      sucio = true;
      if (guardando) return guardando;
      guardando = Promise.resolve().then(function () {
        sucio = false;
        return almacen.set(K.estado, estado).catch(function () { /* sin espacio */ });
      }).then(function () { guardando = null; if (sucio) return guardarEstado(); });
      return guardando;
    }
    function tabla(nombre) { if (!estado) estado = {}; return estado[nombre] || (estado[nombre] = []); }

    // Cambia un id temporal por el real en todas las filas de la copia local y en las operaciones pendientes.
    function remapear(desde, hacia) {
      Object.keys(estado || {}).forEach(function (t) {
        if (!Array.isArray(estado[t])) return;
        estado[t].forEach(function (f) {
          Object.keys(f).forEach(function (k) { if (k !== "id" && /_id$/.test(k) && f[k] === desde) f[k] = hacia; });
        });
      });
      cola.forEach(function (o) {
        if (o.id === desde) o.id = hacia;
        ["fila", "cambios"].forEach(function (c) {
          if (!o[c]) return;
          Object.keys(o[c]).forEach(function (k) { if (/_id$/.test(k) && o[c][k] === desde) o[c][k] = hacia; });
        });
      });
    }
    function real(id) { return mapa[id] !== undefined ? mapa[id] : id; }
    function conReales(fila) {
      var o = copia(fila);
      Object.keys(o || {}).forEach(function (k) { if (/_id$/.test(k) && typeof o[k] === "number" && mapa[o[k]] !== undefined) o[k] = mapa[o[k]]; });
      return o;
    }

    function ejecutar(o) {
      if (o.t === "crear") return base.crear(o.tabla, conReales(o.fila));
      if (o.t === "actualizar") return base.actualizar(o.tabla, real(o.id), conReales(o.cambios));
      if (o.t === "borrar") return base.borrar(o.tabla, real(o.id));
      if (o.t === "perfil") return base.guardarPerfil(o.cambios);
      return Promise.resolve();
    }

    var enCurso = null;
    // Si ya hay un envío en marcha, se espera a que termine (y se repite si quedó algo) en vez de ignorar la petición.
    function vaciar() {
      if (enCurso) return enCurso.then(function () { return cola.length && enLinea() ? vaciar() : undefined; });
      enCurso = vaciarAhora().then(function () { enCurso = null; }, function (e) { enCurso = null; throw e; });
      return enCurso;
    }
    function vaciarAhora() {
      return iniciar().then(function () {
        if (!cola.length || !enLinea()) return;
        vaciando = true;
        return Promise.resolve(op.antes ? op.antes() : null).catch(function () { /* se intenta igual */ }).then(function paso() {
          if (!cola.length) return;
          var o = cola[0];
          return ejecutar(o).then(function (r) {
            if (o.t === "crear" && r && r.id !== undefined) {
              mapa[o.id] = r.id;
              var tmp = o.id;
              var fila = tabla(o.tabla).find(function (x) { return x.id === tmp; });
              if (fila) Object.assign(fila, r); else tabla(o.tabla).push(copia(r));
              cola.shift();
              remapear(tmp, r.id);
              if (op.alMapear) { try { var m = {}, f = {}; m[tmp] = r.id; f[tmp] = copia(r); op.alMapear(m, f, o.tabla); } catch (e) { /* ver arriba */ } }
            } else cola.shift();
            return guardarMeta().then(guardarEstado).then(avisar).then(paso);
          }, function (e) {
            if (esReintentable(e)) return; // se queda en la cola para la próxima vez
            // Error de verdad (por ejemplo, un dato que la base rechaza): no puede frenar todo lo demás.
            cola.shift();
            fallidas.push({ operacion: o, error: texto(e) });
            if (op.alFallar) { try { op.alFallar(o, e); } catch (x) { /* ver arriba */ } }
            return guardarMeta().then(avisar).then(paso);
          });
        }).then(function () { vaciando = false; }, function (e) { vaciando = false; throw e; });
      });
    }

    function intentarVaciar() { if (enLinea() && cola.length) vaciar().catch(function () { /* se reintenta */ }); }

    function puedeIrDirecto() { return !cola.length && enLinea(); }

    function filaLocal(nombre, fila) {
      var t = ahora(), def = POR_DEFECTO[nombre] ? POR_DEFECTO[nombre](fila, t) : {};
      return Object.assign({ id: --temp, user_id: uid, creado_en: t }, def, copia(fila));
    }
    function encolarCrear(nombre, fila) {
      var local = filaLocal(nombre, fila);
      tabla(nombre).push(local);
      cola.push({ t: "crear", tabla: nombre, id: local.id, fila: copia(fila) });
      return guardarMeta().then(guardarEstado).then(function () { avisar(); intentarVaciar(); return copia(local); });
    }

    var fuente = {
      demo: false,
      email: base.email, nombre: base.nombre, creado: base.creado,
      salir: function () { return base.salir ? base.salir() : Promise.resolve(); },

      cargar: function () {
        return iniciar().then(function () {
          var previo = cola.length && enLinea() ? vaciar().catch(function () { /* sigue con la copia */ }) : Promise.resolve();
          return previo.then(function () {
            if (!cola.length && enLinea()) {
              return base.cargar().then(function (d) {
                estado = copia(d);
                return guardarEstado().then(function () { avisar(); return copia(d); });
              }, function (e) { if (!esReintentable(e)) throw e; return desdeCopia(); });
            }
            return desdeCopia();
          });
        });
      },

      crear: function (nombre, fila) {
        return iniciar().then(function () {
          if (puedeIrDirecto()) {
            return base.crear(nombre, fila).then(function (r) { tabla(nombre).push(copia(r)); guardarEstado(); return r; }, function (e) {
              if (!esErrorDeRed(e)) throw e;
              return encolarCrear(nombre, fila);
            });
          }
          return encolarCrear(nombre, fila);
        });
      },

      crearVarios: function (nombre, filas) {
        return iniciar().then(function () {
          if (puedeIrDirecto()) {
            return base.crearVarios(nombre, filas).then(function (rs) { rs.forEach(function (r) { tabla(nombre).push(copia(r)); }); guardarEstado(); return rs; }, function (e) {
              if (!esErrorDeRed(e)) throw e;
              return filas.reduce(function (p, f) { return p.then(function (acc) { return encolarCrear(nombre, f).then(function (r) { acc.push(r); return acc; }); }); }, Promise.resolve([]));
            });
          }
          return filas.reduce(function (p, f) { return p.then(function (acc) { return encolarCrear(nombre, f).then(function (r) { acc.push(r); return acc; }); }); }, Promise.resolve([]));
        });
      },

      actualizar: function (nombre, id, cambios) {
        return iniciar().then(function () {
          id = real(id);
          function local() {
            var fila = tabla(nombre).find(function (x) { return x.id === id; });
            if (fila) Object.assign(fila, copia(cambios));
            if (id < 0) {
              // todavía no existe en el servidor: el cambio se suma a su creación
              var c = cola.find(function (o) { return o.t === "crear" && o.id === id; });
              if (c) Object.assign(c.fila, copia(cambios));
            } else {
              var previa = cola.find(function (o) { return o.t === "actualizar" && o.tabla === nombre && o.id === id; });
              if (previa) Object.assign(previa.cambios, copia(cambios)); else cola.push({ t: "actualizar", tabla: nombre, id: id, cambios: copia(cambios) });
            }
            return guardarMeta().then(guardarEstado).then(function () { avisar(); intentarVaciar(); return copia(fila); });
          }
          if (id > 0 && puedeIrDirecto()) {
            return base.actualizar(nombre, id, cambios).then(function (r) {
              var fila = tabla(nombre).find(function (x) { return x.id === id; });
              if (fila) Object.assign(fila, copia(r)); guardarEstado();
              return r;
            }, function (e) { if (!esErrorDeRed(e)) throw e; return local(); });
          }
          return local();
        });
      },

      borrar: function (nombre, id) {
        return iniciar().then(function () {
          id = real(id);
          function quitarLocal() {
            var resto = tabla(nombre).filter(function (x) { return x.id !== id; });
            estado[nombre] = resto;
            // lo que dependía de esa fila también se va (por ejemplo, los abonos de una deuda)
            Object.keys(estado).forEach(function (t) {
              if (!Array.isArray(estado[t]) || t === nombre) return;
              if (nombre === "deudas" && t === "abonos") estado[t] = estado[t].filter(function (x) { return x.deuda_id !== id; });
              if (nombre === "grupos" && (t === "gastos_grupo" || t === "aportes_grupo")) estado[t] = estado[t].filter(function (x) { return x.grupo_id !== id; });
            });
          }
          function local() {
            quitarLocal();
            if (id < 0) {
              // nunca llegó al servidor: se cancela su creación y todo lo que dependía de ella
              cola = cola.filter(function (o) {
                if (o.id === id) return false;
                var dep = o.fila || o.cambios;
                return !(dep && Object.keys(dep).some(function (k) { return /_id$/.test(k) && dep[k] === id; }));
              });
            } else {
              cola = cola.filter(function (o) { return !(o.t === "actualizar" && o.tabla === nombre && o.id === id); });
              cola.push({ t: "borrar", tabla: nombre, id: id });
            }
            return guardarMeta().then(guardarEstado).then(function () { avisar(); intentarVaciar(); });
          }
          if (id > 0 && puedeIrDirecto()) {
            return base.borrar(nombre, id).then(function () { quitarLocal(); guardarEstado(); }, function (e) { if (!esErrorDeRed(e)) throw e; return local(); });
          }
          return local();
        });
      },

      guardarPerfil: function (cambios) {
        return iniciar().then(function () {
          function local() {
            if (!estado) estado = {};
            estado.perfil = Object.assign(estado.perfil || {}, copia(cambios));
            var previa = cola.find(function (o) { return o.t === "perfil"; });
            if (previa) Object.assign(previa.cambios, copia(cambios)); else cola.push({ t: "perfil", cambios: copia(cambios) });
            return guardarMeta().then(guardarEstado).then(function () { avisar(); intentarVaciar(); return copia(estado.perfil); });
          }
          if (puedeIrDirecto()) {
            return base.guardarPerfil(cambios).then(function (p) { if (estado) estado.perfil = copia(p); guardarEstado(); return p; }, function (e) { if (!esErrorDeRed(e)) throw e; return local(); });
          }
          return local();
        });
      },

      pendientes: function () { return cola.length; },
      fallidas: function () { return fallidas.slice(); },
      sincronizar: function () { return vaciar(); },
      // Al cerrar sesión: se borra la copia de este celular.
      limpiar: function () { cola = []; mapa = {}; estado = null; return Promise.all([almacen.del(K.estado), almacen.del(K.meta)]).catch(function () { /* nada que borrar */ }); }
    };

    function desdeCopia() {
      return (estado ? Promise.resolve(estado) : almacen.get(K.estado)).then(function (snap) {
        if (!snap) throw new Error("Sin internet y todavía no hay datos guardados en este celular. Conéctate una vez para descargarlos.");
        estado = snap;
        avisar();
        return copia(estado);
      });
    }
    // Para que arranque el contador de pendientes al abrir la app sin conexión
    fuente.iniciar = iniciar;
    return fuente;
  }

  var api = { envolver: envolver, esErrorDeRed: esErrorDeRed, esErrorDeSesion: esErrorDeSesion, esReintentable: esReintentable };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaSync = api;
})(typeof window !== "undefined" ? window : this);
