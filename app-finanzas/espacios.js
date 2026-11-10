// Espacios: la plata separada por propósito (Principal para el día a día y, aparte, ahorro, viaje, negocio…).
// Esta capa va entre la app y la base de datos: la app solo ve lo del espacio activo y lo nuevo queda en él.
// Principal es espacio_id vacío (null): así todo lo que ya existía sigue en Principal.
// Funciona en el navegador (window.NovaEspacios) y en Node (require) para las pruebas.
(function (raiz) {
  "use strict";

  // Tablas que se separan por espacio. Lo demás (categorías, metas, deudas, perfil…) es igual en todos.
  var POR_ESPACIO = ["movimientos", "cuentas", "limites", "programados", "frecuentes"];
  var CAMPOS_PRESUPUESTO = ["presupuesto_monto", "presupuesto_ciclo"];
  var ICONOS = {
    principal: { emoji: "👛", color: "#14b8a6", nombre: "Principal" },
    ahorro: { emoji: "🐷", color: "#6d5bd0", nombre: "Ahorro" },
    viaje: { emoji: "✈️", color: "#f59e0b", nombre: "Viaje" },
    negocio: { emoji: "💼", color: "#1d7bf0", nombre: "Negocio" },
    casa: { emoji: "🏠", color: "#e5483d", nombre: "Casa" },
    estudio: { emoji: "🎓", color: "#0e9f6e", nombre: "Estudio" },
    salud: { emoji: "❤️", color: "#db2777", nombre: "Salud" },
    regalo: { emoji: "🎁", color: "#c2410c", nombre: "Regalos" },
    carro: { emoji: "🚗", color: "#475569", nombre: "Vehículo" }
  };

  function idDe(fila) { return fila && fila.espacio_id != null ? fila.espacio_id : null; }

  // Copia de los datos con solo lo del espacio activo. En otro espacio, el presupuesto general es el de ese espacio.
  function filtrar(d, activo) {
    var r = Object.assign({}, d);
    POR_ESPACIO.forEach(function (t) { if (Array.isArray(d[t])) r[t] = d[t].filter(function (f) { return idDe(f) === activo; }); });
    var esp = activo == null ? null : (d.espacios || []).find(function (e) { return e.id === activo; });
    if (esp && d.perfil) {
      r.perfil = Object.assign({}, d.perfil, { presupuesto_monto: esp.presupuesto_monto, presupuesto_ciclo: esp.presupuesto_ciclo || d.perfil.presupuesto_ciclo });
    }
    return r;
  }

  // Saldo de cada espacio: lo mismo que «Saldo en cuentas» dentro de él (saldo inicial de sus cuentas más lo que
  // entró menos lo que salió de ellas).
  function saldos(d) {
    var s = { principal: 0 }, deCuenta = {};
    (d.espacios || []).forEach(function (e) { s[e.id] = 0; });
    (d.cuentas || []).forEach(function (c) {
      var k = idDe(c) == null ? "principal" : idDe(c);
      if (!(k in s)) return;
      deCuenta[c.id] = k; s[k] += Number(c.saldo_inicial) || 0;
    });
    (d.movimientos || []).forEach(function (m) {
      var k = deCuenta[m.cuenta_id];
      if (k !== undefined) s[k] += (m.tipo === "ingreso" ? 1 : -1) * (Number(m.monto) || 0);
    });
    return s;
  }

  // Las dos mitades de pasar plata de un espacio a otro: sale de uno como gasto y entra al otro como ingreso, unidas
  // por el mismo código. Si las monedas son distintas, "llega" es lo que entra en la moneda del destino.
  function transferencia(o) {
    var codigo = o.codigo, fecha = o.fecha || new Date().toISOString();
    var nota = o.nota || null, sale = Number(o.monto), llega = Number(o.llega != null ? o.llega : o.monto);
    if (!(sale > 0) || !(llega > 0)) throw new Error("El valor debe ser mayor que cero.");
    if (idDe({ espacio_id: o.desde }) === idDe({ espacio_id: o.hacia })) throw new Error("Elige dos espacios distintos.");
    var base = { estado: "pagado", fecha: fecha, nota: nota, transferencia: codigo, categoria_id: o.categoriaId != null ? o.categoriaId : null, etiquetas: [] };
    return [
      Object.assign({}, base, { tipo: "gasto", monto: sale, espacio_id: o.desde == null ? null : o.desde, cuenta_id: o.cuentaDesde, descripcion: "Pasé a " + o.nombreHacia, moneda: o.monedaDesde || "COP" }),
      Object.assign({}, base, { tipo: "ingreso", monto: llega, espacio_id: o.hacia == null ? null : o.hacia, cuenta_id: o.cuentaHacia, descripcion: "Llegó de " + o.nombreDesde, moneda: o.monedaHacia || "COP" })
    ];
  }

  // Envuelve una fuente de datos (Supabase o demostración) para que todo pase por el espacio activo.
  // opciones.activo() da el id del espacio activo (null es Principal).
  function envolver(base, opciones) {
    var ultimo = null;
    function activo() { return opciones.activo(); }
    function conEspacio(tabla, fila) {
      if (POR_ESPACIO.indexOf(tabla) < 0 || activo() == null || Object.prototype.hasOwnProperty.call(fila, "espacio_id")) return fila;
      return Object.assign({}, fila, { espacio_id: activo() });
    }
    var f = Object.assign({}, base, {
      cargar: function () {
        return base.cargar().then(function (d) {
          ultimo = d;
          if (activo() != null && !(d.espacios || []).some(function (e) { return e.id === activo(); })) opciones.alPerder && opciones.alPerder();
          return filtrar(d, activo());
        });
      },
      crear: function (tabla, fila) { return base.crear(tabla, conEspacio(tabla, fila)); },
      crearVarios: function (tabla, filas) { return base.crearVarios(tabla, filas.map(function (x) { return conEspacio(tabla, x); })); },
      // En otro espacio, el presupuesto general se guarda en ese espacio y no en el perfil de la persona.
      guardarPerfil: function (cambios) {
        var id = activo();
        if (id == null) return base.guardarPerfil(cambios);
        var delEspacio = {}, delPerfil = {};
        Object.keys(cambios).forEach(function (k) { (CAMPOS_PRESUPUESTO.indexOf(k) >= 0 ? delEspacio : delPerfil)[k] = cambios[k]; });
        var p1 = Object.keys(delPerfil).length ? base.guardarPerfil(delPerfil) : Promise.resolve(ultimo && ultimo.perfil);
        var p2 = Object.keys(delEspacio).length ? base.actualizar("espacios", id, delEspacio) : Promise.resolve(null);
        return Promise.all([p1, p2]).then(function (r) {
          var perfil = r[0] || {};
          if (ultimo) {
            ultimo.perfil = perfil;
            if (r[1]) ultimo.espacios = (ultimo.espacios || []).map(function (e) { return e.id === id ? r[1] : e; });
          }
          var esp = ultimo && (ultimo.espacios || []).find(function (e) { return e.id === id; });
          return Object.assign({}, perfil, esp ? { presupuesto_monto: esp.presupuesto_monto, presupuesto_ciclo: esp.presupuesto_ciclo || perfil.presupuesto_ciclo } : {});
        });
      },
      todo: function () { return ultimo; }
    });
    return f;
  }

  var api = { POR_ESPACIO: POR_ESPACIO, ICONOS: ICONOS, filtrar: filtrar, saldos: saldos, transferencia: transferencia, envolver: envolver };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaEspacios = api;
})(typeof window !== "undefined" ? window : this);
