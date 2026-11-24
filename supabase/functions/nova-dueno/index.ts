// nova-dueno v8: panel del dueño de NOVA. Cuenta cuántas personas se registraron, cuántas la usan, cuántas veces se
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

type Usuario = { id: string; email?: string; created_at?: string; last_sign_in_at?: string | null; email_confirmed_at?: string | null; banned_until?: string | null; user_metadata?: Record<string, unknown> };

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

const ACCIONES_CUENTA = ["cuenta_bloquear", "cuenta_desbloquear", "cuenta_reenviar_confirmacion"];

async function actuarSobreCuenta(accion: string, objetivo: unknown, dueno: string) {
  if (typeof objetivo !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(objetivo)) {
    return responder(400, { error: "El identificador de la cuenta no es válido." });
  }
  const id = objetivo.toLowerCase();
  if (DUENOS.includes(id)) return responder(400, { error: "No puedes cambiar la cuenta de un dueño." });
  const url = `${URL_SB}/auth/v1/admin/users/${id}`;
  const consulta = await fetch(url, { headers: adm });
  if (consulta.status === 404) return responder(404, { error: "La cuenta ya no existe." });
  if (!consulta.ok) return responder(502, { error: "No se pudo consultar la cuenta." });
  const usuario: Usuario = await consulta.json();

  let cambio: Response;
  if (accion === "cuenta_reenviar_confirmacion") {
    if (usuario.email_confirmed_at) return responder(400, { error: "Esta cuenta ya confirmó su correo." });
    if (!usuario.email) return responder(400, { error: "La cuenta no tiene correo." });
    cambio = await fetch(`${URL_SB}/auth/v1/resend`, {
      method: "POST",
      headers: { apikey: ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "signup", email: usuario.email }),
    });
    if (!cambio.ok) return responder(502, { error: "No se pudo reenviar el correo de confirmación." });
  } else {
    const bloquear = accion === "cuenta_bloquear";
    cambio = await fetch(url, {
      method: "PUT",
      headers: { ...adm, "Content-Type": "application/json" },
      body: JSON.stringify({ ban_duration: bloquear ? "876000h" : "none" }),
    });
    if (!cambio.ok) return responder(502, { error: bloquear ? "No se pudo bloquear la cuenta." : "No se pudo desbloquear la cuenta." });
  }

  const auditoria = await rest("fin_dueno_acciones", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    signal: AbortSignal.timeout(6000),
    body: JSON.stringify({ dueno_id: dueno, accion, objetivo_id: id }),
  }).then((r) => r.ok).catch(() => false);
  return responder(200, { ok: true, auditoria });
}

async function accionDueno(accion: string, cuerpo: Record<string, unknown>, dueno: string): Promise<Response | null> {
  if (ACCIONES_CUENTA.includes(accion)) return actuarSobreCuenta(accion, cuerpo.id, dueno);
  if (accion === "encuesta_crear") {
    const pregunta = typeof cuerpo.pregunta === "string" ? cuerpo.pregunta.trim() : "";
    const opciones: unknown[] = Array.isArray(cuerpo.opciones) ? cuerpo.opciones : [];
    if (!opciones.every((opcion): opcion is string => typeof opcion === "string")) {
      return responder(400, { error: "Las opciones deben ser textos." });
    }
    const limpias = opciones.map((opcion) => opcion.trim()).filter(Boolean);
    if (!pregunta || Array.from(pregunta).length > 200 || limpias.length < 2 || limpias.length > 6 ||
        limpias.some((opcion) => Array.from(opcion).length > 60)) {
      return responder(400, { error: "Escribe una pregunta de hasta 200 caracteres y de 2 a 6 opciones de hasta 60 caracteres." });
    }
    const r = await rest("fin_encuestas", {
      method: "POST", body: JSON.stringify({ pregunta, opciones: limpias, activa: true }),
    });
    return r.ok ? responder(200, { ok: true }) : responder(502, { error: "No se pudo crear la encuesta." });
  }
  if (accion === "encuesta_cerrar") {
    const id = typeof cuerpo.id === "number" && Number.isSafeInteger(cuerpo.id) || typeof cuerpo.id === "string"
      ? String(cuerpo.id) : "";
    if (!/^[1-9]\d{0,18}$/.test(id)) return responder(400, { error: "Encuesta no válida." });
    const r = await rest(`fin_encuestas?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ activa: false }) });
    return r.ok ? responder(200, { ok: true }) : responder(502, { error: "No se pudo cerrar la encuesta." });
  }
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

// v6: solo identificadores fijos y resultados agregados de fin_eventos.
const nombresUso = new Map(Object.entries({
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
}).map(([tipo, nombres]) => [tipo, new Set(nombres.trim().split(/\s+/))]));

type EventoUso = { user_id: string; tipo: string; nombre: string; valor: number | null; creado_en: string };

async function usoPanel(ahora: number) {
  const desde = encodeURIComponent(new Date(ahora - 30 * DIA).toISOString());
  const hasta = encodeURIComponent(new Date(ahora).toISOString());
  const ruta = `fin_eventos?select=user_id,tipo,nombre,valor,creado_en&creado_en=gte.${desde}&creado_en=lte.${hasta}&order=creado_en.desc,user_id.asc,tipo.asc,nombre.asc,valor.asc`;
  const signal = AbortSignal.timeout(15_000);
  const pantallas = new Map<string, { total: number; personas: Set<string> }>();
  const recuadros = new Map<string, number>();
  const anotar = { texto: 0, voz: 0, foto: 0, banco: 0, manual: 0, rapido: 0 };
  const ia = { pregunta_texto: 0, pregunta_foto: 0, pregunta_voz: 0, error_cupo: 0, error_tiempo: 0, error_otro: 0, busqueda_web: 0 };
  const iaPorDia: Record<string, number> = {};
  const duraciones: number[] = [];
  const temas = new Map<string, string>();
  const pines = new Map<string, string>();
  const huellas = new Map<string, string>();
  const conductores = new Map<string, string>();
  let totalEventos = 0;

  // Se recorre de más reciente a más antiguo para conservar el último estado por persona.
  for (let inicio = 0; inicio < 50_000; inicio += 1000) {
    const respuesta = await rest(ruta, { signal, headers: { Range: `${inicio}-${inicio + 999}`, "Range-Unit": "items" } });
    if (!respuesta.ok) throw new Error("fin_eventos " + respuesta.status);
    const lote: EventoUso[] = await respuesta.json();
    for (const { user_id, tipo, nombre, valor, creado_en } of lote) {
      if (!user_id || !nombresUso.get(tipo)?.has(nombre)) continue;
      totalEventos++;
      if (tipo === "pantalla") {
        const datos = pantallas.get(nombre) || { total: 0, personas: new Set<string>() };
        datos.total++;
        datos.personas.add(user_id);
        pantallas.set(nombre, datos);
      } else if (tipo === "anotar") {
        anotar[nombre as keyof typeof anotar]++;
      } else if (tipo === "ia") {
        ia[nombre as keyof typeof ia]++;
        if (nombre.startsWith("pregunta_")) {
          const dia = clave(creado_en);
          iaPorDia[dia] = (iaPorDia[dia] || 0) + 1;
        }
      } else if (tipo === "sesion" && valor !== null && Number.isInteger(valor) && valor >= 5 && valor < 86400) {
        duraciones.push(valor);
      } else if (tipo === "ajuste") {
        const grupo = nombre.startsWith("tema_") ? temas : nombre.startsWith("pin_") ? pines : nombre.startsWith("huella_") ? huellas : conductores;
        if (!grupo.has(user_id)) grupo.set(user_id, nombre);
      } else if (tipo === "recuadro") {
        recuadros.set(nombre, (recuadros.get(nombre) || 0) + 1);
      }
    }
    if (lote.length < 1000) break;
  }

  const contarEstado = (estados: Map<string, string>, nombre: string) =>
    Array.from(estados.values()).filter((estado) => estado === nombre).length;
  const mayorPrimero = (a: { nombre: string; total: number }, b: { nombre: string; total: number }) =>
    b.total - a.total || a.nombre.localeCompare(b.nombre);
  duraciones.sort((a, b) => a - b);
  const n = duraciones.length, medio = Math.floor(n / 2);
  return {
    pantallas: Array.from(pantallas, ([nombre, datos]) => ({ nombre, total: datos.total, personas: datos.personas.size })).sort(mayorPrimero).slice(0, 15),
    anotar,
    iaPorDia,
    ia,
    sesion: {
      n,
      promedioSeg: n ? duraciones.reduce((suma, seg) => suma + seg, 0) / n : 0,
      medianaSeg: n ? (duraciones[medio] + duraciones[Math.floor((n - 1) / 2)]) / 2 : 0,
    },
    tema: { oscuro: contarEstado(temas, "tema_oscuro"), claro: contarEstado(temas, "tema_claro") },
    seguridad: {
      pin: contarEstado(pines, "pin_on"),
      huella: contarEstado(huellas, "huella_on"),
      personas: new Set([...pines.keys(), ...huellas.keys()]).size,
    },
    conductor: contarEstado(conductores, "modo_conductor_on"),
    recuadrosOcultos: Array.from(recuadros, ([nombre, total]) => ({ nombre, total })).sort(mayorPrimero).slice(0, 10),
    totalEventos,
  };
}

async function conteoExacto(ruta: string): Promise<number> {
  const r = await rest(ruta, {
    method: "HEAD", headers: { Prefer: "count=exact" }, signal: AbortSignal.timeout(10_000),
  });
  const total = r.headers.get("Content-Range")?.match(/\/(\d+)$/);
  if (!r.ok || !total) throw new Error("Conteo no disponible");
  return Number(total[1]);
}

type Encuesta = { id: number; pregunta: string; opciones: string[]; activa: boolean; creado_en: string };
type ComentarioEncuesta = { comentario: string; creado_en: string };

async function encuestasPanel() {
  const r = await rest("fin_encuestas?select=id,pregunta,opciones,activa,creado_en&order=creado_en.desc,id.desc&limit=10",
    { signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error("Encuestas no disponibles");
  const encuestas: Encuesta[] = await r.json();
  return Promise.all(encuestas.map(async (encuesta) => {
    const filtro = `encuesta_id=eq.${encuesta.id}`;
    const conteo = `fin_respuestas?select=opcion&${filtro}&limit=1`;
    const [conteos, total, comentarios] = await Promise.all([
      Promise.all(encuesta.opciones.map((_opcion, i) => conteoExacto(`${conteo}&opcion=eq.${i}`))),
      conteoExacto(conteo),
      rest(`fin_respuestas?select=comentario,creado_en&${filtro}&comentario=not.is.null&comentario=neq.&order=creado_en.desc,id.desc&limit=20`,
        { signal: AbortSignal.timeout(10_000) }).then(async (respuesta) => {
        if (!respuesta.ok) throw new Error("Comentarios no disponibles");
        const filas: ComentarioEncuesta[] = await respuesta.json();
        return filas.map(({ comentario, creado_en }) => ({ comentario, creado_en }));
      }),
    ]);
    return { ...encuesta, conteos, total, comentarios };
  }));
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
    const avisos: Record<string, unknown>[] = r.ok ? await r.json() : [];
    extra.avisos = await Promise.all(avisos.map(async (aviso) => ({
      ...aviso,
      vistos: await conteoExacto(`fin_avisos_vistos?select=aviso_id&aviso_id=eq.${aviso.id}&limit=1`).catch(() => null),
    })));
  } catch (_e) { extra.avisos = []; }
  extra.encuestas = await encuestasPanel().catch(() => []);
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

// Storage lista un nivel por llamada. Los recibos se guardan bajo carpetas de usuario.
async function tamanoRecibos() {
  const signal = AbortSignal.timeout(10_000);
  const pendientes = [""];
  const tope = 5000, limite = 100;
  let archivos = 0, bytes = 0;
  while (pendientes.length && archivos < tope) {
    const prefix = pendientes.pop()!;
    for (let offset = 0; archivos < tope; offset += limite) {
      const r = await fetch(`${URL_SB}/storage/v1/object/list/recibos`, {
        method: "POST", signal,
        headers: { ...adm, "Content-Type": "application/json" },
        body: JSON.stringify({ prefix, limit: limite, offset, sortBy: { column: "name", order: "asc" } }),
      });
      if (!r.ok) throw new Error("No se pudieron listar los recibos.");
      const lote: { id: string | null; name: string; metadata?: { size?: number } | null }[] = await r.json();
      for (const objeto of lote) {
        if (!objeto.id) {
          pendientes.push(prefix + objeto.name + "/");
          continue;
        }
        archivos++;
        bytes += Number(objeto.metadata?.size) || 0;
        if (archivos === tope) break;
      }
      if (lote.length < limite) break;
    }
  }
  return { archivos, bytes };
}

async function saludPanel(correoDe: Record<string, string>) {
  const leer = async (ruta: string, init: RequestInit = {}) => {
    const r = await rest(ruta, { ...init, signal: AbortSignal.timeout(10_000) });
    if (!r.ok) throw new Error("No se pudo consultar la salud técnica.");
    return r.json();
  };
  const [bd, fotos, acciones] = await Promise.all([
    leer("rpc/fin_tamano_db", { method: "POST", body: "{}" }).catch(() => null),
    tamanoRecibos().catch(() => null),
    leer("fin_dueno_acciones?select=accion,objetivo_id,creado_en&order=creado_en.desc,id.desc&limit=10")
      .then((lista: { accion: string; objetivo_id: string; creado_en: string }[]) => lista.map((a) => ({
        accion: a.accion, correo: correoDe[a.objetivo_id] || "(sin correo)", creado_en: a.creado_en,
      }))).catch(() => null),
  ]);
  return { bd, fotos, acciones };
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
        id: u.id, bloqueado: Date.parse(u.banned_until || "") > ahora,
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

    const correoDe = Object.fromEntries(lista.map((u) => [u.id, u.email || ""]));
    const salud = saludPanel(correoDe);
    const uso = usoPanel(ahora).catch(() => null);
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
      ...(await extrasPanel(correoDe, ahora)),
      uso: await uso, salud: await salud,
    });
  } catch (e) {
    console.error("nova-dueno", String(e));
    return responder(502, { error: "No se pudieron leer los datos" });
  }
});
