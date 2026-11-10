const test = require("node:test");
const assert = require("node:assert");
const Sync = require("./sincronizacion.js");

// Servidor de mentira: guarda filas en memoria y se puede "caer" para simular que no hay internet.
function servidor() {
  const s = { caido: false, tablas: { movimientos: [], deudas: [], abonos: [], categorias: [] }, perfil: { presupuesto_ciclo: "mensual" }, sig: 100, llamadas: [], rechazar: null, sesion: false };
  const red = () => { if (s.caido) throw new Error("TypeError: Failed to fetch"); if (s.sesion) throw new Error("JWT expired"); };
  s.base = {
    email: "ana@x.co",
    cargar: async () => { red(); return JSON.parse(JSON.stringify(Object.assign({}, s.tablas, { perfil: s.perfil }))); },
    crear: async (t, f) => { red(); s.llamadas.push(["crear", t, JSON.parse(JSON.stringify(f))]); if (s.rechazar && s.rechazar(t, f)) throw new Error("new row violates check constraint"); const r = Object.assign({ id: s.sig++ }, f); s.tablas[t].push(r); return JSON.parse(JSON.stringify(r)); },
    crearVarios: async (t, fs) => { red(); return fs.map((f) => { const r = Object.assign({ id: s.sig++ }, f); s.tablas[t].push(r); return r; }); },
    actualizar: async (t, id, c) => { red(); s.llamadas.push(["actualizar", t, id, c]); const r = s.tablas[t].find((x) => x.id === id); Object.assign(r, c); return JSON.parse(JSON.stringify(r)); },
    borrar: async (t, id) => { red(); s.llamadas.push(["borrar", t, id]); s.tablas[t] = s.tablas[t].filter((x) => x.id !== id); },
    guardarPerfil: async (c) => { red(); s.llamadas.push(["perfil", c]); Object.assign(s.perfil, c); return JSON.parse(JSON.stringify(s.perfil)); },
    salir: async () => {}
  };
  return s;
}
function almacenEnMemoria() {
  const m = new Map();
  return { m, get: async (k) => (m.has(k) ? JSON.parse(m.get(k)) : null), set: async (k, v) => { m.set(k, JSON.stringify(v)); }, del: async (k) => { m.delete(k); } };
}
function armar(s, almacen, extra) {
  const estado = { enLinea: true, mapeos: [], cambios: [], fallos: [] };
  const f = Sync.envolver(s.base, Object.assign({
    almacen: almacen || almacenEnMemoria(), usuarioId: "u1", enLinea: () => estado.enLinea,
    alMapear: (m, filas, t) => estado.mapeos.push([m, t]), alCambiar: (c) => estado.cambios.push(c), alFallar: (o) => estado.fallos.push(o)
  }, extra));
  return { f, estado };
}

test("con internet todo pasa directo y se guarda una copia", async () => {
  const s = servidor(); const { f } = armar(s);
  await f.cargar();
  const r = await f.crear("movimientos", { descripcion: "Café", monto: 3000 });
  assert.equal(r.id, 100);
  assert.equal(f.pendientes(), 0);
  assert.deepEqual(s.llamadas.map((l) => l[0]), ["crear"]);
});

test("sin internet: crea con id temporal, queda en la cola y se ve al volver a cargar", async () => {
  const s = servidor(); const al = almacenEnMemoria(); const { f, estado } = armar(s, al);
  await f.cargar();
  s.caido = true; estado.enLinea = false;
  const r = await f.crear("movimientos", { descripcion: "Almuerzo", monto: 20000, categoria_id: 5 });
  assert.ok(r.id < 0);
  assert.equal(r.estado, "pagado");
  assert.equal(f.pendientes(), 1);
  assert.equal(s.llamadas.length, 0);
  const d = await f.cargar();                        // sin internet: sale de la copia del celular
  assert.equal(d.movimientos.length, 1);
  assert.equal(d.movimientos[0].descripcion, "Almuerzo");
});

test("al volver el internet se envía, el id temporal pasa a real y lo que dependía de él se corrige", async () => {
  const s = servidor(); const { f, estado } = armar(s);
  await f.cargar();
  s.caido = true; estado.enLinea = false;
  const deuda = await f.crear("deudas", { tipo: "debo", persona: "Mamá", monto: 1000000 });
  const abono = await f.crear("abonos", { deuda_id: deuda.id, monto: 250000 });
  const mov = await f.crear("movimientos", { descripcion: "Abono", monto: 250000 });
  assert.equal(f.pendientes(), 3);
  s.caido = false; estado.enLinea = true;
  await f.sincronizar();
  assert.equal(f.pendientes(), 0);
  assert.deepEqual(s.llamadas.map((l) => l[1]), ["deudas", "abonos", "movimientos"]);   // mismo orden
  const realDeuda = s.tablas.deudas[0].id;
  assert.equal(s.tablas.abonos[0].deuda_id, realDeuda);                                     // el abono apunta a la deuda real
  assert.ok(estado.mapeos.some((m) => m[0][deuda.id] === realDeuda));
  const d = await f.cargar();
  assert.equal(d.abonos[0].deuda_id, realDeuda);
});

test("un cambio sobre algo que aún no se envió se suma a su creación", async () => {
  const s = servidor(); const { f, estado } = armar(s);
  await f.cargar();
  estado.enLinea = false; s.caido = true;
  const m = await f.crear("movimientos", { descripcion: "Pan", monto: 2000 });
  await f.actualizar("movimientos", m.id, { monto: 2500, etiquetas: ["casa"] });
  assert.equal(f.pendientes(), 1);
  estado.enLinea = true; s.caido = false;
  await f.sincronizar();
  assert.equal(s.tablas.movimientos.length, 1);
  assert.equal(s.tablas.movimientos[0].monto, 2500);
  assert.deepEqual(s.tablas.movimientos[0].etiquetas, ["casa"]);
});

test("borrar algo que nunca se envió cancela su creación y la de lo que dependía de ello", async () => {
  const s = servidor(); const { f, estado } = armar(s);
  await f.cargar();
  estado.enLinea = false; s.caido = true;
  const d = await f.crear("deudas", { tipo: "debo", persona: "X", monto: 10 });
  await f.crear("abonos", { deuda_id: d.id, monto: 5 });
  await f.borrar("deudas", d.id);
  assert.equal(f.pendientes(), 0);
  const datos = await f.cargar();
  assert.equal(datos.deudas.length, 0);
  assert.equal(datos.abonos.length, 0);
});

test("actualizar y borrar filas que ya existen sin internet, y se aplican al volver", async () => {
  const s = servidor(); s.tablas.movimientos.push({ id: 7, descripcion: "A", monto: 1 }, { id: 8, descripcion: "B", monto: 2 });
  const { f, estado } = armar(s);
  await f.cargar();
  estado.enLinea = false; s.caido = true;
  await f.actualizar("movimientos", 7, { monto: 10 });
  await f.actualizar("movimientos", 7, { nota: "hola" });   // se junta con la anterior
  await f.borrar("movimientos", 8);
  assert.equal(f.pendientes(), 2);
  estado.enLinea = true; s.caido = false;
  await f.sincronizar();
  assert.deepEqual(s.tablas.movimientos, [{ id: 7, descripcion: "A", monto: 10, nota: "hola" }]);
});

test("mientras haya cambios pendientes los nuevos se ponen en la cola aunque ya haya internet (para no desordenar)", async () => {
  const s = servidor(); const { f, estado } = armar(s);
  await f.cargar();
  estado.enLinea = false; s.caido = true;
  await f.crear("movimientos", { descripcion: "uno", monto: 1 });
  estado.enLinea = true;   // vuelve la conexión pero todavía no se sincroniza
  s.caido = true;          // y el servidor sigue sin responder
  await f.crear("movimientos", { descripcion: "dos", monto: 2 });
  assert.equal(f.pendientes(), 2);
  s.caido = false;
  await f.sincronizar();
  assert.deepEqual(s.tablas.movimientos.map((x) => x.descripcion), ["uno", "dos"]);
});

test("un error real de la base no frena lo demás; un error de conexión deja todo en la cola", async () => {
  const s = servidor(); const { f, estado } = armar(s);
  await f.cargar();
  estado.enLinea = false; s.caido = true;
  await f.crear("movimientos", { descripcion: "malo", monto: -5 });
  await f.crear("movimientos", { descripcion: "bueno", monto: 5 });
  estado.enLinea = true; s.caido = false; s.rechazar = (t, fila) => fila.monto < 0;
  await f.sincronizar();
  assert.equal(f.pendientes(), 0);
  assert.equal(estado.fallos.length, 1);
  assert.deepEqual(s.tablas.movimientos.map((x) => x.descripcion), ["bueno"]);

  estado.enLinea = false; s.caido = true;
  await f.crear("movimientos", { descripcion: "otro", monto: 1 });
  estado.enLinea = true;    // dice que hay internet pero el servidor no contesta
  await f.sincronizar();
  assert.equal(f.pendientes(), 1);
  s.caido = false; await f.sincronizar();
  assert.equal(f.pendientes(), 0);
});

test("si la sesión venció, el cambio espera en la cola y no se pierde", async () => {
  const s = servidor(); const { f, estado } = armar(s);
  await f.cargar();
  estado.enLinea = false; s.caido = true;
  await f.crear("movimientos", { descripcion: "x", monto: 1 });
  estado.enLinea = true; s.caido = false; s.sesion = true;
  await f.sincronizar();
  assert.equal(f.pendientes(), 1);
  assert.equal(estado.fallos.length, 0);
  s.sesion = false; await f.sincronizar();
  assert.equal(f.pendientes(), 0);
});

test("al cerrar y abrir la app sin internet, la copia y la cola siguen ahí", async () => {
  const s = servidor(); const al = almacenEnMemoria();
  let { f, estado } = armar(s, al);
  s.tablas.movimientos.push({ id: 1, descripcion: "viejo", monto: 1 });
  await f.cargar();
  estado.enLinea = false; s.caido = true;
  await f.crear("movimientos", { descripcion: "nuevo", monto: 2 });
  await new Promise((r) => setTimeout(r, 20));
  // "reabrir"
  const otra = armar(s, al);
  const d = await otra.f.cargar();
  assert.deepEqual(d.movimientos.map((x) => x.descripcion), ["viejo", "nuevo"]);
  assert.equal(otra.f.pendientes(), 1);
  otra.estado.enLinea = true; s.caido = false;
  await otra.f.sincronizar();
  assert.equal(otra.f.pendientes(), 0);
  assert.deepEqual(s.tablas.movimientos.map((x) => x.descripcion), ["viejo", "nuevo"]);
});

test("cargar sin internet y sin copia avisa con claridad", async () => {
  const s = servidor(); s.caido = true; const { f, estado } = armar(s); estado.enLinea = false;
  await assert.rejects(f.cargar(), /Sin internet/);
});

test("el perfil también se guarda sin internet", async () => {
  const s = servidor(); const { f, estado } = armar(s);
  await f.cargar();
  estado.enLinea = false; s.caido = true;
  const p = await f.guardarPerfil({ guardar_ubicacion: true });
  assert.equal(p.guardar_ubicacion, true);
  await f.guardarPerfil({ meta_diaria: 100000 });
  assert.equal(f.pendientes(), 1);
  estado.enLinea = true; s.caido = false; await f.sincronizar();
  assert.equal(s.perfil.guardar_ubicacion, true); assert.equal(s.perfil.meta_diaria, 100000);
});

test("los errores de conexión se reconocen", () => {
  assert.ok(Sync.esErrorDeRed(new TypeError("Failed to fetch")));
  assert.ok(Sync.esErrorDeRed({ message: "NetworkError when attempting to fetch resource." }));
  assert.ok(!Sync.esErrorDeRed(new Error("new row violates check constraint")));
  assert.ok(Sync.esErrorDeSesion(new Error("JWT expired")));
});
