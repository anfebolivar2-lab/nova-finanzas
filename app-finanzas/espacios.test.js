const test = require("node:test");
const assert = require("node:assert");
const E = require("./espacios.js");

const datos = () => ({
  perfil: { presupuesto_monto: 1500000, presupuesto_ciclo: "mensual", modo_conductor: false },
  espacios: [{ id: 7, nombre: "Ahorro", icono: "ahorro", moneda: "COP", presupuesto_monto: 200000, presupuesto_ciclo: "semanal" },
    { id: 8, nombre: "Viaje", icono: "viaje", moneda: "USD", presupuesto_monto: null }],
  cuentas: [{ id: 1, saldo_inicial: 100000, espacio_id: null }, { id: 2, saldo_inicial: 0, espacio_id: 7 }, { id: 3, saldo_inicial: 50 }],
  movimientos: [
    { id: 1, tipo: "gasto", monto: 20000, espacio_id: null, cuenta_id: 1 },
    { id: 2, tipo: "ingreso", monto: 300000, cuenta_id: 3 },
    { id: 3, tipo: "ingreso", monto: 80000, espacio_id: 7, cuenta_id: 2 },
    { id: 4, tipo: "gasto", monto: 5000, espacio_id: 7, estado: "pendiente", cuenta_id: 2 },
    { id: 5, tipo: "gasto", monto: 12, espacio_id: 8, cuenta_id: 99 }
  ],
  limites: [{ id: 1, espacio_id: 7 }], programados: [], frecuentes: [{ id: 1 }], categorias: [{ id: 1 }]
});

test("filtrar deja solo lo del espacio activo y usa su presupuesto", () => {
  const p = E.filtrar(datos(), null);
  assert.deepStrictEqual(p.movimientos.map((m) => m.id), [1, 2]);
  assert.deepStrictEqual(p.cuentas.map((c) => c.id), [1, 3]);
  assert.strictEqual(p.perfil.presupuesto_monto, 1500000);
  assert.strictEqual(p.categorias.length, 1); // las categorías son las mismas en todos los espacios
  const a = E.filtrar(datos(), 7);
  assert.deepStrictEqual(a.movimientos.map((m) => m.id), [3, 4]);
  assert.deepStrictEqual(a.limites.map((l) => l.id), [1]);
  assert.strictEqual(a.frecuentes.length, 0);
  assert.strictEqual(a.perfil.presupuesto_monto, 200000);
  assert.strictEqual(a.perfil.presupuesto_ciclo, "semanal");
  assert.strictEqual(E.filtrar(datos(), 8).perfil.presupuesto_ciclo, "mensual"); // sin ciclo propio usa el de la persona
});

test("saldo de cada espacio: igual que «Saldo en cuentas» dentro de él", () => {
  const s = E.saldos(datos());
  assert.strictEqual(s.principal, 100000 + 50 - 20000 + 300000);
  assert.strictEqual(s[7], 80000 - 5000);
  assert.strictEqual(s[8], 0); // su movimiento es de una cuenta que no existe: no cuenta, como en la app
});

test("transferencia: sale de uno y entra al otro, unidas por el mismo código", () => {
  const [g, i] = E.transferencia({ codigo: "abc", desde: null, hacia: 8, monto: 400000, llega: 100, cuentaDesde: 1, cuentaHacia: 9,
    nombreDesde: "Principal", nombreHacia: "Viaje", monedaDesde: "COP", monedaHacia: "USD", fecha: "2026-11-07T12:00:00.000Z" });
  assert.deepStrictEqual([g.tipo, g.monto, g.espacio_id, g.cuenta_id, g.moneda, g.transferencia], ["gasto", 400000, null, 1, "COP", "abc"]);
  assert.deepStrictEqual([i.tipo, i.monto, i.espacio_id, i.cuenta_id, i.moneda, i.transferencia], ["ingreso", 100, 8, 9, "USD", "abc"]);
  assert.strictEqual(g.descripcion, "Pasé a Viaje");
  assert.strictEqual(i.descripcion, "Llegó de Principal");
  assert.throws(() => E.transferencia({ codigo: "x", desde: 7, hacia: 7, monto: 1 }), /distintos/);
  assert.throws(() => E.transferencia({ codigo: "x", desde: null, hacia: 7, monto: 0 }), /mayor/);
});

test("envolver: lo nuevo queda en el espacio activo y el presupuesto se guarda en el espacio", async () => {
  let activo = 7, creados = [], perfilGuardado = null, espacioGuardado = null;
  const base = {
    demo: true,
    cargar: async () => datos(),
    crear: async (t, f) => { creados.push([t, f]); return f; },
    crearVarios: async (t, fs) => { fs.forEach((f) => creados.push([t, f])); return fs; },
    actualizar: async (t, id, c) => { espacioGuardado = [t, id, c]; return Object.assign({}, datos().espacios[0], c); },
    guardarPerfil: async (c) => { perfilGuardado = c; return Object.assign({}, datos().perfil, c); }
  };
  const f = E.envolver(base, { activo: () => activo });
  assert.strictEqual(f.demo, true); // lo demás de la fuente sigue igual
  const d = await f.cargar();
  assert.deepStrictEqual(d.movimientos.map((m) => m.id), [3, 4]);
  await f.crear("movimientos", { monto: 1 });
  await f.crear("categorias", { nombre: "x" });
  await f.crear("movimientos", { monto: 2, espacio_id: null }); // la otra mitad de una transferencia va a Principal
  await f.crearVarios("limites", [{ monto: 3 }]);
  assert.deepStrictEqual(creados.map(([t, x]) => [t, x.espacio_id]), [["movimientos", 7], ["categorias", undefined], ["movimientos", null], ["limites", 7]]);
  const p = await f.guardarPerfil({ presupuesto_monto: 90000, mostrar_seguro: false });
  assert.deepStrictEqual(espacioGuardado, ["espacios", 7, { presupuesto_monto: 90000 }]);
  assert.deepStrictEqual(perfilGuardado, { mostrar_seguro: false });
  assert.strictEqual(p.presupuesto_monto, 90000);
  assert.strictEqual(f.todo().movimientos.length, 5);
  activo = null; creados = [];
  await f.crear("movimientos", { monto: 4 });
  assert.strictEqual(creados[0][1].espacio_id, undefined); // en Principal no se agrega nada
  await f.guardarPerfil({ presupuesto_monto: 5 });
  assert.deepStrictEqual(perfilGuardado, { presupuesto_monto: 5 });
});

test("envolver avisa si el espacio activo ya no existe", async () => {
  let perdido = false;
  const f = E.envolver({ cargar: async () => datos() }, { activo: () => 99, alPerder: () => { perdido = true; } });
  await f.cargar();
  assert.ok(perdido);
});
