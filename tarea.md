# Encargo para Codex: tanda 33, parte A (NOVA, web estática en app-finanzas/)

NO hagas commits. NO toques `supabase/`, ni `.github/`, ni `app-android-nova/`. NO cambies colores, logo ni textos de marca. NO borres archivos ni ids de `index.html`.
Reglas de código: sin `??`, sin `?.`, sin `Object.hasOwn` en `app-finanzas/*.js` (usa `var`/`function` como el resto). Textos en español sencillo (Colombia), pesos COP.
`dueno-costos` debe seguir 4 veces en `index.html` y 5 veces en `app.js`. No debe desaparecer ningún `id="..."` de `index.html` (solo puedes agregar).

## 1. Aviso cuando las cuotas pasan del 30 % de los ingresos

No existe un campo de cuota en las deudas y NO se puede agregar columnas. Calcula con lo que ya hay: los gastos del mes actual en la categoría «Deudas» (los abonos a deudas que ya se anotan como movimientos, tipo "gasto") frente a los ingresos del mes actual.

- En `app-finanzas/herramientas.js` (módulo `NovaHerramientas`, ya se usa en `app.js`) agrega la función pura `cuotasVsIngresos(movimientos, categorias, ahora, opciones)`. Devuelve `{ ingresos, cuotas, porcentaje, supera }`. `supera` es verdadero cuando `ingresos > 0` y `cuotas / ingresos > 0.30` (umbral en `opciones.umbral`, por defecto 0.30). Ignora transferencias. Si no hay ingresos, `porcentaje` es `null` y `supera` falso. Mira cómo `gastoAltoDelDia` recibe y usa `movimientos` y `categorias` para identificar la categoría por nombre «Deudas» y el mes.
- Exporta la función en el objeto de la API del módulo y agrega pruebas en `app-finanzas/herramientas.test.js` (sin ingresos; justo en 30 %; arriba del 30 %; ignora gastos de otra categoría y de otros meses).
- En `app.js`, en la tarjeta de deudas del inicio (`pintarDeudasInicio`, usa `$("deudas-inicio-nota")`), cuando `supera` sea verdadero y NO haya deudas vencidas, muestra la nota: «⚠️ Tus cuotas van en X % de tus ingresos de este mes (lo sano es menos de 30 %)». Si hay deudas vencidas se queda el aviso de vencidas como está. Redondea el porcentaje a entero. Respeta el modo ocultar montos si la función ya lo hace (solo muestras porcentaje, no montos).

## 2. Meta por hora en el modo conductor

Ya existe `perfil.meta_diaria` (meta de ganancia por día) y la barra de la jornada. Agrega la meta por hora conectada SIN columnas nuevas en la base: guarda las horas en `localStorage` con la clave `nova_horas_conectado` (envuelve en try/catch; el valor es un número entre 1 y 24).

- Función pura `metaPorHora(metaDiaria, horas)` en `app-finanzas/analisis.js` (módulo `NovaAnalisis`, junto a `resumenTrabajo`; exporta en el objeto de la API). Devuelve `null` si falta alguno o no es mayor que 0; si no, `Math.round(metaDiaria / horas)`. Pruebas en `analisis.test.js`.
- En `index.html`, en el bloque donde se edita la meta diaria (busca `id="meta-diaria"` y su formulario/guardado `vehiculo-nombre`), agrega debajo un campo opcional «Horas que te conectas al día» con `id="horas-conectado"` (`inputmode="numeric"`), con su etiqueta. En `app.js`, léelo y guárdalo junto con el botón de guardar existente de ese formulario (mira cómo se guarda `meta_diaria` en la línea cercana a `guardarPerfil({ vehiculo: ...`). Si queda vacío, se borra la clave.
- En la jornada de hoy (`jornada-nota` y `trabajo-meta-nota`), cuando haya meta diaria y horas, añade al texto «Eso es X por hora conectada.» usando `metaPorHora` y `dinero(...)`.

## Pruebas que debes correr al final
- `node --test app-finanzas/*.test.js` (todas deben pasar).
- `node -e "new Function(require('fs').readFileSync('app-finanzas/app.js','utf8'))"`
- `grep -c "dueno-costos" app-finanzas/index.html app-finanzas/app.js` (4 y 5).
- `grep -nE '\?\?|\?\.|Object\.hasOwn' app-finanzas/*.js` no debe encontrar nada nuevo tuyo.

Al terminar, dime en pocas líneas qué archivos y funciones cambiaste. No hagas commits.
