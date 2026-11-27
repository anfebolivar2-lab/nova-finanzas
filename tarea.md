# Encargo para Codex: tanda 33, parte B2 (NOVA, web estática en app-finanzas/)

NO hagas commits. NO toques `supabase/`, `.github/`, `app-android-nova/`, `sw.js` ni `scripts/`. NO cambies colores, logo ni textos de marca. NO borres archivos ni ids de `index.html` (solo puedes agregar). NO cambies `cuenta-cobro.js`, `calculadoras.js` ni lo que hace `calculadoraIndependiente`/`cuentaDeCobro`.
Reglas de código: sin `??`, sin `?.`, sin `Object.hasOwn` en `app-finanzas/*.js` (usa `var` y `function`). Textos en español sencillo (Colombia), pesos COP.
`dueno-costos` debe seguir 4 veces en `index.html` y 5 veces en `app.js`. NO agregues columnas ni tablas en la base: los datos de la mesada viven SOLO en `localStorage` del teléfono (clave `nova_mesada`, con `guardarLocal`/`leerLocal` de `app.js`, que ya tienen try/catch). La pantalla debe avisar: «Estos datos se guardan solo en este teléfono.»

## Mesada para hijos: cuánto les das y en qué se les va

### Lógica pura: archivo nuevo `app-finanzas/mesada.js` (módulo `window.NovaMesada`, con `module.exports` para Node, igual que `tarjeta.js`)
Estado: `{ hijos: [ { id, nombre, monto, cada, gastos: [ { id, fecha, monto, nota } ] } ] }`. `cada` es `"semana"`, `"quincena"` o `"mes"`. `fecha` es `"AAAA-MM-DD"` (usa `NovaAnalisis.claveDia` si hace falta; mira cómo lo usa `herramientas.js`; si prefieres no depender de otro módulo, escribe una función propia con fecha local).
- `normalizar(estado)`: devuelve un estado limpio a partir de cualquier cosa leída del disco (si no es objeto, `{ hijos: [] }`; descarta hijos o gastos con datos inválidos; máximo 10 hijos).
- `inicioPeriodo(cada, ahora)`: `Date` local a medianoche. Semana empieza el lunes; quincena el día 1 o el 16; mes el día 1.
- `resumen(hijo, ahora)`: `{ mesada, gastado, queda, porcentaje, pasado, enQue }`. `gastado` suma los gastos desde `inicioPeriodo` hasta hoy; `queda = mesada − gastado` (puede ser negativo); `porcentaje` entero entre 0 y 100 para la barra; `pasado` es verdadero si gastó más de la mesada; `enQue` es una lista `{ nota, total }` con lo gastado en el periodo agrupado por nota (sin tildes, sin mayúsculas y sin espacios de más; la nota que se muestra es la primera que se escribió), ordenada de mayor a menor, máximo 3 (las demás se suman en «Otros» solo si hay más de 3).
- `agregarHijo(estado, nombre, monto, cada)`, `agregarGasto(estado, hijoId, monto, nota, fecha)`, `quitarGasto(estado, hijoId, gastoId)`, `quitarHijo(estado, hijoId)`: no modifican el estado que reciben; devuelven un estado nuevo, o `null` si algo es inválido (nombre vacío o de más de 30 letras, monto no mayor que 0, `cada` desconocido, hijo inexistente, hijo número 11). Los ids son números crecientes (el mayor existente + 1).
- Pruebas en `app-finanzas/mesada.test.js`: normalizar con basura; los tres inicios de periodo (con fechas fijas: un miércoles, el día 15, el día 16 y el día 1); resumen con gastos dentro y fuera del periodo, gasto mayor que la mesada, agrupación por nota sin tildes ni mayúsculas, más de 3 notas; cada función de agregar/quitar con casos válidos e inválidos y que no cambian el estado original.
- Agrega `<script src="mesada.js"></script>` en `index.html` justo después de `cuenta-cobro.js`.

### Pantalla en `app.js`
Función `mesadaHijos(art)`; llámala en `wMasCalculadoras` justo después de `cuentaDeCobro(art)`. Tarjeta `div.calc` con título «👧 Mesada para hijos» y la nota «Estos datos se guardan solo en este teléfono.».
- Si no hay hijos: texto «Aún no hay hijos. Agrega a quien le das mesada.».
- Por cada hijo: nombre y «Mesada: $X por semana/quincena/mes»; una barra de avance (usa las clases de barra que ya existen en `estilos.css`, por ejemplo `barra` con un `span`, como en `filaPlataforma`; cuando `pasado`, usa el estilo de alerta que ya exista, sin colores nuevos); el texto «Ha gastado $X de $Y. Le quedan $Z.» (o «Se pasó $Z.» si `pasado`); debajo «En qué se le va:» con las notas de `enQue` («Dulces: $5.000»); un mini formulario «¿En qué lo gastó?» (texto, máx. 40) + «Valor» (plata, `leerValor`) + botón «Anotar gasto»; y la lista de sus últimos 5 gastos del periodo con un botón «Quitar» en cada uno (con la misma confirmación que usa `app.js` para otros borrados; búscala, por ejemplo con `confirm(`/`pedirConfirmacion`/similar, y no inventes un mecanismo nuevo).
- Al final de la tarjeta, formulario «Agregar hijo»: «Nombre», «Mesada» (plata), «Cada» (select: semana, quincena, mes) y botón «Agregar». Para quitar a un hijo, botón «Quitar a <nombre>» con confirmación.
- Cada cambio llama a `guardarLocal("nova_mesada", estado)` y repinta la tarjeta (no toda la pantalla). Valida con las funciones de `NovaMesada` y muestra el error en un `p.mensaje` con `role="status"` («Escribe el nombre.», «Escribe una mesada mayor que cero.», «Escribe cuánto gastó.»).
- Respeta el modo de montos ocultos (`ocultos`) como las demás pantallas de montos: mira cómo lo hace `dinero(...)`. Los `id` nuevos empiezan con `me-` y no repiten ninguno existente. Si `NovaMesada` no está cargado, la función no hace nada.

## Pruebas que debes correr al final
- `node --test app-finanzas/*.test.js` (todas deben pasar).
- `node -e "new Function(require('fs').readFileSync('app-finanzas/app.js','utf8'))"`
- `grep -c "dueno-costos" app-finanzas/index.html app-finanzas/app.js` (4 y 5).
- `grep -nE '\?\?|\?\.[A-Za-z(\[]|Object\.hasOwn' app-finanzas/*.js` no debe encontrar nada tuyo.

Al terminar, dime en pocas líneas qué archivos y funciones cambiaste. No hagas commits.
