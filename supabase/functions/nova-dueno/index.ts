// nova-dueno: panel del dueño de NOVA. Cuenta cuántas personas se registraron, cuántas la usan, cuántas veces se
// descargó la APK y qué funciones usan. Solo responde a la cuenta del dueño (DUENOS).
// Por privacidad NO devuelve montos ni movimientos de nadie: solo cuántos hay y cuándo se usó la app.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const DUENOS = ["e84fedff-8279-4a12-9ff7-4992dae4cbbf", "92bfcc78-ebac-47ab-8171-2683d624c721"];
const REPOS = ["anfebolivar2-lab/nova-finanzas", "afbolivar-2026b-lang/principios-inteligencia-artificial-2026-b-"];
const URL_SB = Deno.env.get("SUPABASE_URL") || "";
const SERVICIO = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") || "";
const DIA = 86_400_000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const responder = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: { ...CORS, "Content-Type": "application/json" } });

const adm = { Authorization: `Bearer ${SERVICIO}`, apikey: SERVICIO };

type Usuario = { id: string; email?: string; created_at?: string; last_sign_in_at?: string | null; email_confirmed_at?: string | null; user_metadata?: Record<string, unknown> };

async function usuarios(): Promise<Usuario[]> {
  const todos: Usuario[] = [];
  for (let pagina = 1; pagina <= 20; pagina++) {
    const r = await fetch(`${URL_SB}/auth/v1/admin/users?page=${pagina}&per_page=200`, { headers: adm });
    if (!r.ok) throw new Error("usuarios " + r.status);
    const d = await r.json();
    const lista: Usuario[] = d.users || [];
    todos.push(...lista);
    if (lista.length < 200) break;
  }
  return todos;
}

// Lee solo las columnas pedidas, de a 1.000 filas (el máximo de Supabase por consulta).
async function filas(tabla: string, columnas: string): Promise<Record<string, unknown>[]> {
  const todas: Record<string, unknown>[] = [];
  for (let desde = 0; desde < 200_000; desde += 1000) {
    const r = await fetch(`${URL_SB}/rest/v1/${tabla}?select=${columnas}`, { headers: { ...adm, Range: `${desde}-${desde + 999}`, "Range-Unit": "items" } });
    if (!r.ok) throw new Error(tabla + " " + r.status);
    const lote = await r.json();
    todas.push(...lote);
    if (lote.length < 1000) break;
  }
  return todas;
}

async function descargasApk() {
  let total = 0;
  const porRepo: { repo: string; descargas: number }[] = [];
  const porArchivo: Record<string, number> = {};
  for (const repo of REPOS) {
    try {
      const r = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=50`, { headers: { "User-Agent": "nova-dueno", Accept: "application/vnd.github+json" } });
      if (!r.ok) continue;
      let n = 0;
      for (const rel of await r.json()) for (const a of rel.assets || []) if (/\.apk$/i.test(a.name)) {
        const c = Number(a.download_count) || 0;
        n += c;
        porArchivo[a.name] = (porArchivo[a.name] || 0) + c;
      }
      porRepo.push({ repo, descargas: n });
      total += n;
    } catch (_e) { /* sin GitHub: se cuenta lo que haya */ }
  }
  return { total, porRepo, porArchivo };
}

const clave = (f: unknown) => String(f || "").slice(0, 10);

// ---- v3: avisos, sugerencias, errores y accesos (todo con la llave de servicio, solo para el dueño) ----
const rest = (ruta: string, init: RequestInit = {}) =>
  fetch(`${URL_SB}/rest/v1/${ruta}`, { ...init, headers: { ...adm, "Content-Type": "application/json", ...(init.headers || {}) } });
const texto = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const AUDIENCIAS = ["todos", "android", "web"];
const CLAVES_CONFIG = ["ia_pausada", "ia_mensaje", "version_minima", "notas_version"];

async function accionDueno(accion: string, cuerpo: Record<string, unknown>, dueno: string): Promise<Response | null> {
  if (accion === "aviso_crear") {
    const titulo = texto(cuerpo.titulo, 80), mensaje = texto(cuerpo.mensaje, 500);
    const audiencia = AUDIENCIAS.includes(String(cuerpo.audiencia)) ? String(cuerpo.audiencia) : "todos";
    if (!titulo || !mensaje) return responder(400, { error: "Escribe un título y un mensaje." });
    let desde: string | null = null;
    if (cuerpo.desde) {
      const t0 = Date.parse(String(cuerpo.desde));
      if (!Number.isFinite(t0)) return responder(400, { error: "La fecha de inicio no es válida." });
      desde = new Date(t0).toISOString();
    }
    let hasta: string | null = null;
    if (cuerpo.hasta) {
      const t = Date.parse(String(cuerpo.hasta));
      if (!Number.isFinite(t)) return responder(400, { error: "La fecha final no es válida." });
      hasta = new Date(t).toISOString();
    }
    const r = await rest("fin_avisos", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ titulo, mensaje, audiencia, hasta, ...(desde ? { desde } : {}) }) });
    if (!r.ok) return responder(502, { error: "No se pudo crear el aviso." });
    return responder(200, { ok: true, aviso: (await r.json())[0] });
  }
  if (accion === "aviso_apagar") {
    const id = Number(cuerpo.id);
    if (!Number.isInteger(id) || id < 1) return responder(400, { error: "Aviso no válido." });
    const r = await rest(`fin_avisos?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ activo: false }) });
    return r.ok ? responder(200, { ok: true }) : responder(502, { error: "No se pudo apagar el aviso." });
  }
  if (accion === "sugerencia_atender") {
    const id = Number(cuerpo.id);
    if (!Number.isInteger(id) || id < 1) return responder(400, { error: "Sugerencia no válida." });
    const r = await rest(`fin_sugerencias?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ atendida: cuerpo.atendida !== false }) });
    return r.ok ? responder(200, { ok: true }) : responder(502, { error: "No se pudo actualizar." });
  }
  if (accion === "sugerencia_responder") {
    const id = Number(cuerpo.id), respuesta = texto(cuerpo.respuesta, 1000);
    if (!Number.isInteger(id) || id < 1 || !respuesta) return responder(400, { error: "Escribe una respuesta." });
    const r = await rest(`fin_sugerencias?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ respuesta, respondida_en: new Date().toISOString(), atendida: true }) });
    return r.ok ? responder(200, { ok: true }) : responder(502, { error: "No se pudo guardar la respuesta." });
  }
  if (accion === "config_guardar") {
    const clave = String(cuerpo.clave || "");
    if (!CLAVES_CONFIG.includes(clave)) return responder(400, { error: "Ajuste no válido." });
    let valor: unknown = cuerpo.valor;
    if (clave === "ia_pausada") valor = valor === true;
    else if (clave === "version_minima") {
      valor = texto(valor, 20);
      if (valor && !/^\d+(\.\d+){0,3}$/.test(String(valor))) return responder(400, { error: "Escribe la versión así: 1.72" });
    } else valor = texto(valor, clave === "notas_version" ? 1000 : 300);
    const r = await rest("fin_config?on_conflict=clave", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ clave, valor, actualizado: new Date().toISOString() }) });
    return r.ok ? responder(200, { ok: true }) : responder(502, { error: "No se pudo guardar el ajuste." });
  }
  return null;
}

// Datos extra del panel. Cada bloque falla por separado: si algo no responde, el panel sigue con lo demás.
async function extrasPanel(correoDe: Record<string, string>, ahora: number) {
  const desde30 = new Date(ahora - 30 * DIA).toISOString();
  const extra: Record<string, unknown> = {};
  try {
    const conv = await filas("fin_conversaciones", "actualizado_en");
    const porDia: Record<string, number> = {};
    for (const c of conv) { const k = clave(c.actualizado_en); if (k) porDia[k] = (porDia[k] || 0) + 1; }
    extra.chatsPorDia = porDia;
  } catch (_e) { extra.chatsPorDia = {}; }
  try {
    const r = await rest(`fin_errores?select=id,mensaje,origen,version,plataforma,creado_en&creado_en=gte.${encodeURIComponent(desde30)}&order=creado_en.desc&limit=500`);
    const lista: Record<string, unknown>[] = r.ok ? await r.json() : [];
    const porDia: Record<string, number> = {};
    for (const e of lista) { const k = clave(e.creado_en); if (k) porDia[k] = (porDia[k] || 0) + 1; }
    extra.errores = { total30: lista.length, porDia, recientes: lista.slice(0, 15) };
  } catch (_e) { extra.errores = { total30: 0, porDia: {}, recientes: [] }; }
  try {
    const r = await rest("fin_avisos?select=id,titulo,mensaje,audiencia,activo,desde,hasta,creado_en&order=creado_en.desc&limit=30");
    extra.avisos = r.ok ? await r.json() : [];
  } catch (_e) { extra.avisos = []; }
  try {
    const r = await rest("fin_sugerencias?select=id,user_id,mensaje,version,plataforma,atendida,respuesta,respondida_en,creado_en&order=creado_en.desc&limit=50");
    const lista: Record<string, unknown>[] = r.ok ? await r.json() : [];
    extra.sugerencias = lista.map((s) => ({ id: s.id, correo: correoDe[String(s.user_id)] || "(sin correo)", mensaje: s.mensaje, version: s.version, plataforma: s.plataforma, atendida: s.atendida, respuesta: s.respuesta || null, respondida_en: s.respondida_en || null, creado_en: s.creado_en }));
  } catch (_e) { extra.sugerencias = []; }
  try {
    const r = await rest("fin_dueno_accesos?select=user_id,creado_en&order=creado_en.desc&limit=15");
    const lista: Record<string, unknown>[] = r.ok ? await r.json() : [];
    extra.accesos = lista.map((a) => ({ correo: correoDe[String(a.user_id)] || "(sin correo)", creado_en: a.creado_en }));
  } catch (_e) { extra.accesos = []; }
  return extra;
}

// Cuántas personas distintas usan deudas, gastos compartidos y documentos (solo conteos).
async function adopcionPanel() {
  const contar = async (tabla: string) => {
    try { return new Set((await filas(tabla, "user_id")).map((x) => String(x.user_id))).size; } catch (_e) { return 0; }
  };
  const [deudas, grupos, documentos] = await Promise.all([contar("fin_deudas"), contar("fin_grupos"), contar("fin_documentos")]);
  return { deudas, grupos, documentos };
}

// Estado de servicios y de la última publicación (solo lectura; cada parte falla por separado).
async function pulso(nombre: string, url: string, init: RequestInit = {}) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { ...init, signal: AbortSignal.timeout(6000) });
    return { nombre, ok: r.ok, estado: r.status, ms: Date.now() - t0 };
  } catch (_e) { return { nombre, ok: false, estado: 0, ms: Date.now() - t0 }; }
}
async function estadoPanel() {
  const base = REPOS[0];
  const [servicios, corrida, lanzamiento, config] = await Promise.all([
    Promise.all([
      pulso("Página web (Vercel)", "https://nova-finanzas.vercel.app/", { method: "HEAD" }),
      pulso("Base de datos y acceso (Supabase)", `${URL_SB}/auth/v1/health`, { headers: { apikey: ANON } }),
      pulso("Tasas de cambio (principal)", "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/cop.json"),
      pulso("Tasas de cambio (respaldo)", "https://open.er-api.com/v6/latest/COP"),
    ]).catch(() => []),
    (async () => {
      try {
        const r = await fetch(`https://api.github.com/repos/${base}/actions/workflows/apk-nova.yml/runs?per_page=1`, { headers: { "User-Agent": "nova-dueno", Accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(6000) });
        const run = r.ok ? (await r.json()).workflow_runs?.[0] : null;
        return run ? { estado: run.status, resultado: run.conclusion, creado: run.created_at, enlace: run.html_url, mensaje: String(run.display_title || "").slice(0, 100) } : null;
      } catch (_e) { return null; }
    })(),
    (async () => {
      try {
        const r = await fetch(`https://api.github.com/repos/${base}/releases/tags/nova-android`, { headers: { "User-Agent": "nova-dueno", Accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(6000) });
        const rel = r.ok ? await r.json() : null;
        return rel ? { publicado: rel.published_at, actualizado: rel.updated_at, enlace: rel.html_url } : null;
      } catch (_e) { return null; }
    })(),
    (async () => {
      try {
        const r = await rest("fin_config?select=clave,valor");
        const lista: { clave: string; valor: unknown }[] = r.ok ? await r.json() : [];
        return Object.fromEntries(lista.map((c) => [c.clave, c.valor]));
      } catch (_e) { return {}; }
    })(),
  ]);
  return { servicios, corridaApk: corrida, lanzamiento, config };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return responder(405, { error: "Usa POST" });
  const yo = await fetch(`${URL_SB}/auth/v1/user`, { headers: { Authorization: req.headers.get("Authorization") || "", apikey: ANON } });
  if (!yo.ok) return responder(401, { error: "sin_sesion" });
  const quien = await yo.json();
  if (!DUENOS.includes(quien.id)) return responder(403, { error: "solo_dueno" });

  const cuerpo = await req.json().catch(() => ({})) as Record<string, unknown>;
  const accion = String(cuerpo.accion || "");
  if (accion) {
    try {
      const respuesta = await accionDueno(accion, cuerpo, quien.id);
      if (respuesta) return respuesta;
    } catch (e) { console.error("nova-dueno accion", String(e)); return responder(502, { error: "No se pudo completar la acción." }); }
    return responder(400, { error: "Acción desconocida." });
  }
  // Quién entró al panel (si falla, no se detiene nada).
  await rest("fin_dueno_accesos", { method: "POST", body: JSON.stringify({ user_id: quien.id }) }).catch(() => {});

  try {
    const [lista, movs, chats, metas, espacios, perfiles, apk] = await Promise.all([
      usuarios(), filas("fin_movimientos", "user_id,fecha,moneda,foto_ruta"), filas("fin_conversaciones", "user_id"), filas("fin_metas", "user_id"),
      filas("fin_espacios", "user_id"), filas("fin_perfiles", "user_id,modo_conductor"), descargasApk(),
    ]);
    const ahora = Date.now(), hoy = new Date();
    const ahoraMs = Date.now();
    const diasPorUsuario: Record<string, Set<string>> = {};
    const horas: number[] = Array(24).fill(0), semana: number[] = Array(7).fill(0);
    const monedas: Record<string, number> = {}, usuariosConFoto = new Set<string>();
    let fotos = 0;
    const porUsuario: Record<string, { movs: number; ultimo: string }> = {};
    const movsPorDia: Record<string, number> = {}, activosPorDia: Record<string, Set<string>> = {};
    for (const m of movs) {
      const u = String(m.user_id), f = String(m.fecha || "");
      const p = porUsuario[u] = porUsuario[u] || { movs: 0, ultimo: "" };
      p.movs++;
      if (f > p.ultimo) p.ultimo = f;
      const k = clave(f);
      movsPorDia[k] = (movsPorDia[k] || 0) + 1;
      (activosPorDia[k] = activosPorDia[k] || new Set()).add(u);
      // v4: solo CUÁNDO se usó la app (hora de Colombia), nunca cuánto dinero.
      const t = Date.parse(f);
      if (Number.isFinite(t)) {
        const co = new Date(t - 5 * 3_600_000);
        if (ahoraMs - t <= 90 * DIA) {
          (diasPorUsuario[u] = diasPorUsuario[u] || new Set()).add(co.toISOString().slice(0, 10));
          horas[co.getUTCHours()]++; semana[co.getUTCDay()]++;
        }
      }
      const mon = String(m.moneda || "COP").toUpperCase().slice(0, 3);
      monedas[mon] = (monedas[mon] || 0) + 1;
      if (m.foto_ruta) { fotos++; usuariosConFoto.add(u); }
    }
    const contar = (xs: Record<string, unknown>[]) => { const c: Record<string, number> = {}; xs.forEach((x) => { const u = String(x.user_id); c[u] = (c[u] || 0) + 1; }); return c; };
    const chatsU = contar(chats), metasU = contar(metas), espaciosU = contar(espacios);
    const conductores = new Set(perfiles.filter((p) => p.modo_conductor).map((p) => String(p.user_id)));

    // Último uso: lo más reciente entre entrar, abrir la app (lo anota la app) y anotar un movimiento.
    const personas = lista.map((u) => {
      const md = u.user_metadata || {};
      const visto = String(md.nova_visto || "");
      const ultimoUso = [u.last_sign_in_at || "", visto, porUsuario[u.id]?.ultimo || ""].sort().pop() || "";
      return {
        correo: u.email || "(sin correo)", prueba: /@example\.com$/i.test(u.email || ""), dueno: DUENOS.includes(u.id),
        registro: u.created_at || "", confirmado: !!u.email_confirmed_at, ultimoUso,
        plataforma: String(md.nova_plataforma || ""), version: String(md.nova_version || ""),
        movimientos: porUsuario[u.id]?.movs || 0, chats: chatsU[u.id] || 0, metas: metasU[u.id] || 0, espacios: espaciosU[u.id] || 0,
        conductor: conductores.has(u.id),
        dias: Array.from(diasPorUsuario[u.id] || []).sort(),
      };
    }).sort((a, b) => b.ultimoUso.localeCompare(a.ultimoUso));
    const reales = personas.filter((p) => !p.prueba);
    const usoDesde = (dias: number) => reales.filter((p) => p.ultimoUso && ahora - Date.parse(p.ultimoUso) <= dias * DIA).length;

    const dias: { dia: string; registros: number; movimientos: number; activos: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(hoy.getTime() - i * DIA), k = d.toISOString().slice(0, 10);
      dias.push({ dia: k, registros: reales.filter((p) => clave(p.registro) === k).length, movimientos: movsPorDia[k] || 0, activos: activosPorDia[k]?.size || 0 });
    }
    const versiones: Record<string, number> = {};
    reales.forEach((p) => { if (p.version) versiones[p.version] = (versiones[p.version] || 0) + 1; });

    return responder(200, {
      generado: new Date().toISOString(),
      apk,
      resumen: {
        registrados: reales.length, confirmados: reales.filter((p) => p.confirmado).length,
        nuevos7: reales.filter((p) => ahora - Date.parse(p.registro) <= 7 * DIA).length,
        nuevos30: reales.filter((p) => ahora - Date.parse(p.registro) <= 30 * DIA).length,
        hoy: usoDesde(1), activos7: usoDesde(7), activos30: usoDesde(30),
        conMovimientos: reales.filter((p) => p.movimientos > 0).length,
        android: reales.filter((p) => p.plataforma === "android").length, web: reales.filter((p) => p.plataforma === "web").length,
        movimientos: movs.length, chats: chats.length, metas: metas.length, espacios: espacios.length, conductores: conductores.size,
        pruebas: personas.length - reales.length,
      },
      versiones, dias, personas,
      horas, semana, monedas, fotos: { total: fotos, personas: usuariosConFoto.size },
      adopcion: await adopcionPanel(),
      ...(await estadoPanel().then((e) => ({ estado: e })).catch(() => ({ estado: null }))),
      ...(await extrasPanel(Object.fromEntries(lista.map((u) => [u.id, u.email || ""])), ahora)),
    });
  } catch (e) {
    console.error("nova-dueno", String(e));
    return responder(502, { error: "No se pudieron leer los datos" });
  }
});
