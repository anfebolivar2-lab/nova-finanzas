(function (raiz) {
  "use strict";

  function periodoValido(cada) {
    return cada === "semana" || cada === "quincena" || cada === "mes";
  }

  function texto(valor) {
    return typeof valor === "string" ? valor.trim() : "";
  }

  function montoValido(monto) {
    return Number.isFinite(monto) && monto > 0;
  }

  function idValido(id) {
    return Number.isSafeInteger(id) && id > 0;
  }

  function claveDia(dia) {
    return String(dia.getFullYear()).padStart(4, "0") + "-" +
      String(dia.getMonth() + 1).padStart(2, "0") + "-" + String(dia.getDate()).padStart(2, "0");
  }

  function fechaValida(fecha) {
    if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
    var dia = new Date(fecha + "T00:00:00");
    return claveDia(dia) === fecha;
  }

  function normalizar(estado) {
    var hijos = [];
    if (!estado || !Array.isArray(estado.hijos)) return { hijos: hijos };
    var ids = new Set();
    estado.hijos.some(function (hijo) {
      if (!hijo || !idValido(hijo.id) || ids.has(hijo.id)) return false;
      var nombre = texto(hijo.nombre);
      if (!nombre || nombre.length > 30 || !montoValido(hijo.monto) || !periodoValido(hijo.cada)) return false;
      var gastos = [], idsGastos = new Set();
      if (Array.isArray(hijo.gastos)) hijo.gastos.forEach(function (gasto) {
        if (!gasto || !idValido(gasto.id) || idsGastos.has(gasto.id)) return;
        var nota = texto(gasto.nota);
        if (!nota || nota.length > 40 || !montoValido(gasto.monto) || !fechaValida(gasto.fecha)) return;
        idsGastos.add(gasto.id);
        gastos.push({ id: gasto.id, fecha: gasto.fecha, monto: gasto.monto, nota: nota });
      });
      ids.add(hijo.id);
      hijos.push({ id: hijo.id, nombre: nombre, monto: hijo.monto, cada: hijo.cada, gastos: gastos });
      return hijos.length === 10;
    });
    return { hijos: hijos };
  }

  function inicioPeriodo(cada, ahora) {
    var dia = ahora ? new Date(ahora) : new Date();
    dia.setHours(0, 0, 0, 0);
    if (cada === "semana") dia.setDate(dia.getDate() - (dia.getDay() + 6) % 7);
    else dia.setDate(cada === "quincena" && dia.getDate() >= 16 ? 16 : 1);
    return dia;
  }

  function gastosPeriodo(hijo, ahora) {
    var desde = claveDia(inicioPeriodo(hijo.cada, ahora));
    var hasta = claveDia(ahora);
    return hijo.gastos.filter(function (gasto) { return gasto.fecha >= desde && gasto.fecha <= hasta; });
  }

  function resumen(hijo, ahora) {
    var gastado = 0, grupos = new Map();
    gastosPeriodo(hijo, ahora || new Date()).forEach(function (gasto) {
      var clave = gasto.nota.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ");
      if (!grupos.has(clave)) grupos.set(clave, { nota: gasto.nota, total: 0 });
      grupos.get(clave).total += gasto.monto;
      gastado += gasto.monto;
    });
    var enQue = Array.from(grupos.values()).sort(function (a, b) { return b.total - a.total; });
    if (enQue.length > 3) {
      var otros = enQue.splice(2).reduce(function (total, grupo) { return total + grupo.total; }, 0);
      enQue.push({ nota: "Otros", total: otros });
      enQue.sort(function (a, b) { return b.total - a.total; });
    }
    return {
      mesada: hijo.monto, gastado: gastado, queda: hijo.monto - gastado,
      porcentaje: Math.min(100, Math.round(gastado / hijo.monto * 100)),
      pasado: gastado > hijo.monto, enQue: enQue
    };
  }

  function siguienteId(lista) {
    return lista.reduce(function (mayor, item) { return Math.max(mayor, item.id); }, 0) + 1;
  }

  function agregarHijo(estado, nombre, monto, cada) {
    nombre = texto(nombre);
    if (!nombre || nombre.length > 30 || !montoValido(monto) || !periodoValido(cada)) return null;
    var limpio = normalizar(estado), id = siguienteId(limpio.hijos);
    if (limpio.hijos.length === 10 || !idValido(id)) return null;
    limpio.hijos.push({ id: id, nombre: nombre, monto: monto, cada: cada, gastos: [] });
    return limpio;
  }

  function agregarGasto(estado, hijoId, monto, nota, fecha) {
    nota = texto(nota);
    if (!nota || nota.length > 40 || !montoValido(monto) || !fechaValida(fecha)) return null;
    var limpio = normalizar(estado);
    var hijo = limpio.hijos.find(function (item) { return item.id === hijoId; });
    if (!hijo) return null;
    var id = siguienteId(hijo.gastos);
    if (!idValido(id)) return null;
    hijo.gastos.push({ id: id, fecha: fecha, monto: monto, nota: nota });
    return limpio;
  }

  function quitarGasto(estado, hijoId, gastoId) {
    var limpio = normalizar(estado);
    var hijo = limpio.hijos.find(function (item) { return item.id === hijoId; });
    if (!hijo) return null;
    var indice = hijo.gastos.findIndex(function (gasto) { return gasto.id === gastoId; });
    if (indice < 0) return null;
    hijo.gastos.splice(indice, 1);
    return limpio;
  }

  function quitarHijo(estado, hijoId) {
    var limpio = normalizar(estado);
    var indice = limpio.hijos.findIndex(function (hijo) { return hijo.id === hijoId; });
    if (indice < 0) return null;
    limpio.hijos.splice(indice, 1);
    return limpio;
  }

  var api = {
    normalizar: normalizar, inicioPeriodo: inicioPeriodo, resumen: resumen,
    claveDia: claveDia, gastosPeriodo: gastosPeriodo,
    agregarHijo: agregarHijo, agregarGasto: agregarGasto, quitarGasto: quitarGasto, quitarHijo: quitarHijo
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaMesada = api;
})(typeof window !== "undefined" ? window : this);
