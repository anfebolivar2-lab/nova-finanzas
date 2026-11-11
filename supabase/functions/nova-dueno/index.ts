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
  for (const repo of REPOS) {
    try {
      const r = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=50`, { headers: { "User-Agent": "nova-dueno", Accept: "application/vnd.github+json" } });
      if (!r.ok) continue;
      let n = 0;
      for (const rel of await r.json()) for (const a of rel.assets || []) if (/\.apk$/i.test(a.name)) n += Number(a.download_count) || 0;
      porRepo.push({ repo, descargas: n });
      total += n;
    } catch (_e) { /* sin GitHub: se cuenta lo que haya */ }
  }
  return { total, porRepo };
}

const clave = (f: unknown) => String(f || "").slice(0, 10);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return responder(405, { error: "Usa POST" });
  const yo = await fetch(`${URL_SB}/auth/v1/user`, { headers: { Authorization: req.headers.get("Authorization") || "", apikey: ANON } });
  if (!yo.ok) return responder(401, { error: "sin_sesion" });
  const quien = await yo.json();
  if (!DUENOS.includes(quien.id)) return responder(403, { error: "solo_dueno" });

  try {
    const [lista, movs, chats, metas, espacios, perfiles, apk] = await Promise.all([
      usuarios(), filas("fin_movimientos", "user_id,fecha"), filas("fin_conversaciones", "user_id"), filas("fin_metas", "user_id"),
      filas("fin_espacios", "user_id"), filas("fin_perfiles", "user_id,modo_conductor"), descargasApk(),
    ]);
    const ahora = Date.now(), hoy = new Date();
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
    });
  } catch (e) {
    console.error("nova-dueno", String(e));
    return responder(502, { error: "No se pudieron leer los datos" });
  }
});
