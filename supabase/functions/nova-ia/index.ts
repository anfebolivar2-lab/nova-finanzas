// nova-ia: entiende un gasto o ingreso escrito, dictado o en la foto de un recibo, usando Gemini,
// y responde las preguntas de "Pregúntale a NOVA".
// Solo la llaman usuarios con sesión (verify_jwt). La clave GEMINI_API_KEY vive en los secretos
// de Supabase; la app nunca la ve.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MODELO = Deno.env.get("GEMINI_MODEL") || "gemini-flash-latest";
const CATEGORIAS_BASE = ["Comida", "Transporte", "Hogar", "Suscripciones", "Entretenimiento", "Salud",
  "Compras", "Educación", "Otros gastos", "Salario", "Otros ingresos"];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function responder(estado: number, cuerpo: unknown) {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { ...CORS, "Content-Type": "application/json" } });
}

// Modelos de respaldo: si el principal está saturado o falla, se prueba el siguiente.
// Se empieza por el más rápido (lite); el principal queda de respaldo para cuando haga falta más calidad.
const MODELOS = ["gemini-flash-lite-latest", "gemini-2.5-flash", MODELO].filter((m, i, a) => a.indexOf(m) === i);
type ResultadoGemini = { r: Response | null; detalle: string; limite: boolean };

async function llamarModelo(modelo: string, clave: string, cuerpo: Record<string, unknown>, flujo = false) {
  const metodo = flujo ? "streamGenerateContent?alt=sse" : "generateContent";
  return await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:${metodo}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": clave },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(flujo ? 45_000 : 15_000), // sin esto una respuesta colgada dejaba a la app "pensando" para siempre
  });
}

// Llama a Gemini sin "pensar" (más rápido) y, si falla, prueba con los otros modelos.
async function llamarGemini(clave: string, cuerpo: Record<string, unknown>, sinPensar = true, flujo = false): Promise<ResultadoGemini> {
  let detalle = "";
  let todosLimite = true;
  for (const modelo of MODELOS) {
    try {
      const config = { ...(cuerpo.generationConfig as Record<string, unknown> || {}) };
      let r = await llamarModelo(modelo, clave, sinPensar ? { ...cuerpo, generationConfig: { ...config, thinkingConfig: { thinkingBudget: 0 } } } : cuerpo, flujo);
      if (r.status === 400 && sinPensar) r = await llamarModelo(modelo, clave, cuerpo, flujo); // ese modelo no admite apagar el pensamiento
      if (r.ok) return { r, detalle: "", limite: false };
      const texto = (await r.text()).slice(0, 300);
      console.error("Gemini", modelo, r.status, texto);
      detalle = `${modelo}: ${r.status}`;
      if (r.status !== 429) todosLimite = false;
    } catch (e) {
      console.error("Gemini", modelo, String(e));
      detalle = `${modelo}: ${(e as Error).name === "TimeoutError" ? "tardó demasiado" : "sin conexión"}`;
      todosLimite = false;
    }
  }
  return { r: null, detalle, limite: todosLimite };
}

// "Pregúntale a NOVA": responde preguntas sobre las finanzas de la persona con el resumen que manda la app.
async function conversar(clave: string, entrada: { pregunta?: string; historial?: { rol?: string; texto?: string }[]; contexto?: unknown; stream?: boolean }) {
  const pregunta = (entrada.pregunta || "").slice(0, 2000).trim();
  if (!pregunta) return responder(400, { error: "Falta la pregunta" });
  const contexto = JSON.stringify(entrada.contexto ?? {}).slice(0, 20_000);
  const historial = (Array.isArray(entrada.historial) ? entrada.historial : []).slice(-6)
    .filter((t) => typeof t?.texto === "string" && t.texto.trim())
    .map((t) => ({ role: t.rol === "nova" ? "model" : "user", parts: [{ text: t.texto!.slice(0, 2000) }] }));

  const instrucciones = `Eres NOVA, un asistente de inteligencia artificial amigable que vive dentro de una app colombiana de finanzas personales.
Puedes responder CUALQUIER pregunta sobre cualquier tema: dinero y finanzas, cocina, estudios, trabajo, tecnología, salud en general, trámites, redacción, traducciones, cuentas, ideas, consejos del día a día o simple conversación. Nunca digas que "solo hablas de finanzas".
Responde en español de Colombia (o en el idioma en que te escriban), con calidez y claridad, sin tecnicismos innecesarios. Sé breve por defecto (unas 150 palabras) y extiéndete solo si la pregunta lo pide.
No uses Markdown (nada de asteriscos ni #); para listas usa guiones simples.
Si la pregunta es sobre el dinero de la persona, usa sus datos (vienen abajo en JSON) y haz las cuentas con cuidado, con valores en pesos colombianos con punto de miles y signo $ (ej: $1.250.000). Si la pregunta es de otro tema, no hace falta usar sus datos.
Si no sabes algo, o necesitas información de hoy que no tienes (noticias, precios, clima, resultados), dilo con honestidad en vez de inventar. En salud, leyes o inversiones da orientación general y, cuando sea importante, sugiere consultar a un profesional.
Los datos traen: saldo y cuentas, el periodo actual (ingresos, gastos y gastos por categoría), gastos por mes de los últimos 6 meses, gastos por categoría de los últimos 90 días, cuánto puede gastar por día sin pasarse (seguro_para_gastar_por_dia), límites, metas, pagos programados y los últimos movimientos. Si un movimiento vino en otra moneda trae moneda y monto_original (el monto ya está en pesos). Si hay "trabajo", la persona es conductora de apps de transporte (Didi, Uber, inDrive…): trae lo ganado, los gastos del vehículo, la ganancia neta, los viajes y la ganancia por viaje de hoy, esta semana y este mes (por app y por categoría), su meta diaria y los vencimientos de sus documentos (SOAT, tecnomecánica…, con los días que faltan; si dias es negativo ya venció).
Datos de la persona: ${contexto}`;

  const flujo = entrada.stream === true;
  const g = await llamarGemini(clave, {
    systemInstruction: { parts: [{ text: instrucciones }] },
    contents: [...historial, { role: "user", parts: [{ text: pregunta }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
  }, true, flujo);
  if (!g.r) return g.limite ? responder(429, { error: "limite" }) : responder(502, { error: "La IA no respondió bien", detalle: g.detalle });
  const r = g.r;
  if (flujo && r.body) {
    // Respuesta en vivo: se reenvía el texto a medida que Gemini lo escribe, para que la app lo muestre de inmediato.
    const lector = r.body.getReader(), dec = new TextDecoder(), enc = new TextEncoder();
    let buf = "";
    const salida = new ReadableStream({
      async pull(ctrl) {
        try {
          const { done, value } = await lector.read();
          if (done) { ctrl.close(); return; }
          buf += dec.decode(value, { stream: true });
          let texto = "", i: number;
          while ((i = buf.indexOf("\n")) >= 0) {
            const linea = buf.slice(0, i).trim();
            buf = buf.slice(i + 1);
            if (!linea.startsWith("data:")) continue;
            try {
              const d = JSON.parse(linea.slice(5));
              texto += (d.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || "").join("");
            } catch (_e) { /* línea incompleta */ }
          }
          if (texto) ctrl.enqueue(enc.encode(texto));
        } catch (_e) { ctrl.close(); }
      },
      cancel() { lector.cancel(); },
    });
    return new Response(salida, { headers: { ...CORS, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" } });
  }
  try {
    const datos = await r.json();
    const texto = (datos.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || "").join("").trim();
    if (!texto) return responder(502, { error: "La IA no respondió" });
    return responder(200, { respuesta: texto.slice(0, 4000) });
  } catch (_e) {
    return responder(502, { error: "La IA respondió algo que no se entendió" });
  }
}

// Tasas de cambio con base en USD (open.er-api.com: gratis, sin clave, se actualiza una vez al día).
// Se guardan unas horas en memoria para no pedirlas en cada consulta.
let tasasCache: { rates: Record<string, number>; fecha: string; guardado: number } | null = null;
async function tasas() {
  if (tasasCache && Date.now() - tasasCache.guardado < 6 * 3600_000) return tasasCache;
  const r = await fetch("https://open.er-api.com/v6/latest/USD");
  if (!r.ok) throw new Error("tasas " + r.status);
  const d = await r.json();
  if (d.result !== "success" || !d.rates) throw new Error("tasas sin datos");
  const rates: Record<string, number> = {};
  for (const [k, v] of Object.entries(d.rates)) if (/^[A-Z]{3}$/.test(k) && Number(v) > 0) rates[k] = Number(v);
  tasasCache = { rates, fecha: String(d.time_last_update_utc || ""), guardado: Date.now() };
  return tasasCache;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return responder(405, { error: "Usa POST" });

  let entrada: {
    texto?: string; imagen?: string; mime?: string; categorias?: string[]; hoy?: string; tasas?: boolean;
    pregunta?: string; historial?: { rol?: string; texto?: string }[]; contexto?: unknown; varios?: boolean; stream?: boolean; productos?: boolean;
  };
  try { entrada = await req.json(); } catch { return responder(400, { error: "JSON inválido" }); }

  if (entrada.tasas === true) {
    try {
      const t = await tasas();
      return responder(200, { base: "USD", rates: t.rates, fecha: t.fecha });
    } catch (_e) {
      return responder(502, { error: "No se pudieron consultar las tasas" });
    }
  }

  const clave = Deno.env.get("GEMINI_API_KEY");
  if (!clave) return responder(503, { error: "sin_clave" });

  if (typeof entrada.pregunta === "string") return conversar(clave, entrada);

  const texto = (entrada.texto || "").slice(0, entrada.varios === true ? 2000 : 500).trim();
  const imagen = entrada.imagen || "";
  if (!texto && !imagen) return responder(400, { error: "Falta texto o imagen" });
  if (imagen.length > 6_000_000) return responder(413, { error: "La foto es muy grande" });
  const mime = /^image\/(jpeg|png|webp)$/.test(entrada.mime || "") ? entrada.mime! : "image/jpeg";
  const categorias = Array.isArray(entrada.categorias) && entrada.categorias.length
    ? entrada.categorias.filter((c) => typeof c === "string").slice(0, 40).map((c) => c.slice(0, 40))
    : CATEGORIAS_BASE;

  // Foto de un recibo: lista de productos con su valor (para ver en qué se fue la compra).
  if (entrada.productos === true && imagen) {
    const instruccionesP = `Eres el asistente de NOVA, una app colombiana de finanzas personales.
Lee la foto de un recibo o factura y lista los productos o servicios comprados.
Reglas:
- Moneda: pesos colombianos (COP), sin decimales. En recibos "30.000" es treinta mil.
- nombre: corto (máx. 40 caracteres), en español, con mayúscula inicial.
- cantidad: número (1 si no se ve).
- valor: el valor total de esa línea (cantidad por precio), no el precio unitario.
- comercio: el nombre del negocio. total: el total pagado.
- Ignora subtotales, IVA, propina, efectivo recibido y cambio. Máximo 40 productos.`;
    const cuerpoP = {
      systemInstruction: { parts: [{ text: instruccionesP }] },
      contents: [{ role: "user", parts: [{ text: "Lista los productos de este recibo." }, { inline_data: { mime_type: mime, data: imagen } }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            comercio: { type: "STRING" }, total: { type: "NUMBER" },
            productos: { type: "ARRAY", items: { type: "OBJECT", properties: { nombre: { type: "STRING" }, cantidad: { type: "NUMBER" }, valor: { type: "NUMBER" } }, required: ["nombre", "cantidad", "valor"] } },
          },
          required: ["comercio", "total", "productos"],
        },
      },
    };
    const gp = await llamarGemini(clave, cuerpoP);
    if (!gp.r) return gp.limite ? responder(429, { error: "limite" }) : responder(502, { error: "La IA no respondió bien", detalle: gp.detalle });
    try {
      const datosP = await gp.r.json();
      const salidaP = JSON.parse(datosP.candidates[0].content.parts[0].text);
      const productos = (Array.isArray(salidaP.productos) ? salidaP.productos : []).slice(0, 40).map((p: Record<string, unknown>) => ({
        nombre: String(p.nombre || "").slice(0, 60),
        cantidad: Math.max(1, Math.min(999, Math.round(Number(p.cantidad) || 1))),
        valor: Math.max(0, Math.min(10_000_000_000, Math.round(Number(p.valor) || 0))),
      })).filter((p: { nombre: string }) => p.nombre);
      return responder(200, { comercio: String(salidaP.comercio || "").slice(0, 60), total: Math.max(0, Math.round(Number(salidaP.total) || 0)), productos });
    } catch (_e) {
      return responder(502, { error: "La IA respondió algo que no se entendió" });
    }
  }

  const varios = entrada.varios === true && !imagen;
  const instrucciones = `Eres el asistente de NOVA, una app colombiana de finanzas personales.
Convierte lo que te dan (una frase escrita o dictada, o la foto de un recibo) en ${varios ? "UNO O VARIOS movimientos de dinero (uno por cada gasto o ingreso que se mencione; ignora lo que no sea un movimiento)" : "UN movimiento de dinero"}.
Reglas:
- Moneda: pesos colombianos (COP), sin decimales. "mil", "k", "lucas" = ×1.000; "millón", "palo" = ×1.000.000. En recibos "30.000" es treinta mil.
- En un recibo usa el TOTAL pagado (no subtotal, IVA, efectivo recibido ni cambio). La descripción es el nombre del negocio.
- tipo: "ingreso" si recibió dinero (salario, le pagaron, vendió, le consignaron); si no, "gasto".
- categoria: exactamente una de: ${categorias.join(", ")}.
- descripcion: corta (máx. 40 caracteres), en español, con mayúscula inicial, sin el valor.
- etiquetas: palabras que vengan con # en la frase (sin el #, en minúscula); si no hay, lista vacía.
- dia: "hoy", "ayer" o "anteayer" según la frase; para recibos usa "hoy".
- Si no hay un valor claro, monto = 0.
Hoy es ${entrada.hoy || new Date().toISOString().slice(0, 10)}.`;

  const partes: unknown[] = [];
  if (texto) partes.push({ text: texto });
  if (imagen) partes.push({ inline_data: { mime_type: mime, data: imagen } });

  const unMovimiento = {
    type: "OBJECT",
    properties: {
      tipo: { type: "STRING", enum: ["gasto", "ingreso"] },
      monto: { type: "NUMBER" },
      descripcion: { type: "STRING" },
      categoria: { type: "STRING", enum: categorias },
      etiquetas: { type: "ARRAY", items: { type: "STRING" } },
      dia: { type: "STRING", enum: ["hoy", "ayer", "anteayer"] },
    },
    required: ["tipo", "monto", "descripcion", "categoria", "etiquetas", "dia"],
  };
  const cuerpo = {
    systemInstruction: { parts: [{ text: instrucciones }] },
    contents: [{ role: "user", parts: partes }],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: varios
        ? { type: "OBJECT", properties: { movimientos: { type: "ARRAY", items: unMovimiento } }, required: ["movimientos"] }
        : unMovimiento,
    },
  };

  // Valida lo que devolvió la IA: nada de lo que viene de ella se guarda sin revisar.
  const limpiar = (salida: Record<string, unknown>) => {
    const monto = Math.round(Number(salida.monto) || 0);
    return {
      tipo: salida.tipo === "ingreso" ? "ingreso" : "gasto",
      monto: monto > 0 && monto < 10_000_000_000 ? monto : 0,
      descripcion: String(salida.descripcion || "").slice(0, 60),
      categoria: categorias.includes(salida.categoria as string) ? salida.categoria : (salida.tipo === "ingreso" ? "Otros ingresos" : "Otros gastos"),
      etiquetas: Array.isArray(salida.etiquetas) ? salida.etiquetas.map((e: unknown) => String(e).toLowerCase().replace(/^#/, "").slice(0, 30)).slice(0, 10) : [],
      dia: ["hoy", "ayer", "anteayer"].includes(salida.dia as string) ? salida.dia : "hoy",
    };
  };

  const g = await llamarGemini(clave, cuerpo);
  if (!g.r) return g.limite ? responder(429, { error: "limite" }) : responder(502, { error: "La IA no respondió bien", detalle: g.detalle });
  const r = g.r;

  try {
    const datos = await r.json();
    const salida = JSON.parse(datos.candidates[0].content.parts[0].text);
    if (varios) {
      const lista = Array.isArray(salida.movimientos) ? salida.movimientos.slice(0, 30).map(limpiar) : [];
      return responder(200, { movimientos: lista });
    }
    return responder(200, limpiar(salida));
  } catch (_e) {
    return responder(502, { error: "La IA respondió algo que no se entendió" });
  }
});
