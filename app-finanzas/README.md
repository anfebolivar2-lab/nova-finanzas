# NOVA: finanzas personales

App web para anotar gastos e ingresos escribiendo o dictando frases como
"gasté 20 mil en almuerzo" o "me pagaron 2 millones". Inspirada en Lukas
(control de gastos) y con el diseño NOVA, en modo oscuro y claro.

No necesita compilación: son archivos estáticos que se pueden publicar tal cual en Vercel.

## Qué hace

Está pensada como Lukas, pero todo es gratis y sin anuncios.

- **Inicio:** periodo con flechas (mes, quincena, semana…), balance del periodo con
  ingresos y gastos, aviso de déficit, **"Seguro para gastar"** (cuánto puedes gastar
  por día hasta el final del periodo), entrada rápida, registros comunes de un toque,
  presupuesto, meta, gastos de la semana y movimientos agrupados por día. El ojo de
  arriba oculta los valores.
- **NOVA IA (pestaña del centro):** lista de tus conversaciones con la IA (con buscador),
  lápiz para empezar una nueva, y un chat con preguntas sugeridas hechas con tus propios
  datos ("¿Cuánto he gastado en Comida los últimos 3 meses?", "¿Puedo gastar $ X hoy sin
  afectar mi presupuesto?"). Las conversaciones se guardan en tu cuenta (`fin_conversaciones`).
  Ajustes se abre con tu foto de la esquina.
- **Otras monedas:** al registrar un gasto o ingreso, toca la moneda (COP ▾) y elige entre
  35 monedas (dólar, euro, dólar canadiense, peso mexicano…). NOVA calcula los pesos con la
  tasa del día, que puedes corregir a mano. Guarda el valor original, la moneda y la tasa
  (`moneda`, `monto_original` y `tasa` en `fin_movimientos`); todo el análisis usa pesos.
  El teclado tiene coma para los centavos. Tasas: ExchangeRate-API (`open.er-api.com`,
  gratis y sin clave, una actualización al día), pedidas por la función `nova-ia` y
  guardadas 12 horas en el celular.
- **Espacios:** la plata por propósitos. Principal es el día a día y, aparte, se crean espacios para el ahorro,
  un viaje, el negocio… (arriba, al lado de NOVA). Cada uno funciona completo solo con lo suyo: saldo, presupuesto,
  límites, programadas, análisis, calendario, informes y NOVA IA, y cada uno con su moneda. "Pasar plata" saca de un
  espacio como gasto y lo mete al otro como ingreso, unidos por `transferencia`; con monedas distintas calcula cuánto
  llega con la tasa del día. `espacios.js` es la capa entre la app y la base de datos que filtra por el espacio activo
  y marca lo nuevo con `espacio_id` (vacío = Principal). Migración aditiva: `supabase/migrations/nova_espacios.sql`.
- **NOVA IA con gráficos:** debajo de la respuesta sale una tarjeta calculada en el celular con los datos de la
  persona (`respuestas.js`): el total, un gráfico por día, semana, mes o categoría, los movimientos detrás del número
  y botones para crear un límite, ver los movimientos o abrirlos en el calendario.
- **Pagos en otra moneda detectados solos:** "gasté 20 dólares en Amazon", "museo 10 euros" o el mensaje del banco de
  una compra en USD o EUR llegan convertidos con la tasa del día, guardando el valor original y la tasa
  (`NovaMonedas.detectar`).
- **Novedades:** al actualizar sale una vez una pantalla con lo nuevo (`NOVEDADES_VERSION` en `app.js`).
- **Modo conductor (Didi, Uber, inDrive, Cabify…):** se activa en Configuración. Crea las
  categorías de ganancias por app y de gastos del vehículo (gasolina, tinto y comida en ruta,
  peajes, parqueadero, lavado, mantenimiento y arreglos, repuestos, llantas, SOAT, tecnomecánica,
  impuesto, seguro, multas). Muestra "Mi jornada de hoy" en el inicio y la pantalla **Mi trabajo**:
  - ganancia neta (ganado con las apps menos gasolina, tinto, peajes, arreglos…) de hoy, la semana
    o el mes. Los **papeles y cuotas** (SOAT, tecnomecánica, impuesto, seguro y cuota de la moto) se
    muestran aparte para que un pago grande no deje en rojo un día bueno;
  - viajes anotados y ganancia por viaje, meta diaria con barra, ganancias por app y gastos del trabajo;
  - atajos de un toque para anotar una ganancia (eligiendo la app y los viajes) o un gasto;
  - **vencimientos del vehículo** (SOAT, tecnomecánica, seguro de la moto —cuota mensual o anual—,
    cuota de la moto, impuesto, licencia, aceite…). Al activar el modo conductor NOVA pide de una vez
    la fecha del SOAT y la de la tecnomecánica. Avisa en el inicio y, en la APK, con notificaciones
    del celular (al empezar el plazo, a los 15, 7, 3 y 1 días y el día del vencimiento) y, si ya se
    pasó, una notificación diaria durante una semana hasta que se renueve. Las cuotas mensuales
    avisan 5 días antes y, al pagarlas, la fecha corre un mes. "Renovar" abre el gasto ya con su categoría y costo, y al
    guardarlo corre la fecha al siguiente vencimiento.
  Los movimientos "pendientes" no cuentan. El chat con la IA también conoce estos datos.
- **Botón +:** Asistente inteligente (varios gastos a la vez, dictados, escritos o con
  foto), gasto o ingreso a mano y el chat con la IA.
- **Nuevo gasto o ingreso:** teclado de números con calculadora (`+ − × ÷`), fecha,
  descripción, categoría (con buscador, frecuentes y grupos), cuenta, etiquetas con
  sugerencias, **estado** (pagado o pendiente), **nota**, **hacer recurrente** y
  "guardar y agregar otro". Tocar un movimiento lo edita o lo borra.
- **Planes:** límites de gasto por categoría o generales (semanal a anual, que se
  renuevan solos) con su barra de avance, y metas de ahorro con abonos.
- **Análisis:** por ciclo y periodo, con vista rápida (promedio diario, categoría top,
  día que más gastas, cambio contra el periodo anterior), dona de gastos por categoría,
  gasto por etiqueta, ingresos contra gastos, tendencia y proyección del balance a 90
  días. Se pueden mostrar, ocultar y reordenar (⚙ Personalizar). Tocar una categoría
  abre sus movimientos.
- **Buscar:** por nombre, nota, categoría o etiqueta, con filtros (tipo, fechas,
  categoría, etiqueta, estado) y orden; se puede exportar el resultado a CSV.
- **Configuración:** período de presupuesto, **categorías** (crear, editar, borrar, con
  ícono, color y grupo), registros comunes, etiquetas (crear, renombrar, quitar),
  **programadas** (pagos que se registran solos al abrir la app), cuentas, "Seguro para
  gastar", ubicación de cada pago, **exportar** (CSV de movimientos, categorías y
  límites, respaldo JSON y reporte PDF) y tema.
- **Entrada rápida:** entiende montos como `20 mil`, `15k`, `850.000`, `2 millones`,
  `30 lucas` o `2 palos`, decide gasto o ingreso, elige la categoría y reconoce "ayer".
  Antes de guardar muestra lo que entendió. También por voz y con foto del recibo.
- **Modo demostración** con datos de ejemplo que no se guardan.

La exportación y el PDF se descargan desde el navegador; dentro de la APK avisan que
hay que abrir la página web.

## Todo gratis

Todas las funciones están disponibles para todas las cuentas, sin pagos, códigos ni
anuncios: IA ilimitada (texto, voz, imagen y chat), ciclos de presupuesto, registros
comunes, programados y etiquetas sin límite, ubicación con mapa y exportación.

**Foto del recibo:** el botón de cámara lee la foto con la IA y, si no hay, en el
mismo celular con Tesseract (`vendor/tesseract/`, sin servicios externos ni costo).
`recibo.js` busca el TOTAL (ignora subtotal, IVA, efectivo y cambio) y el nombre del
negocio, y lo pasa a la entrada rápida para revisarlo antes de guardar.

## Registros con IA (Gemini)

Cuando hay sesión iniciada, la entrada rápida (texto o voz) y la foto del recibo
se mandan primero a la función `nova-ia` de Supabase
(`supabase/functions/nova-ia/index.ts`), que le pregunta a Gemini de Google y
devuelve tipo, valor, descripción, categoría, etiquetas y día. La vista previa
muestra la marca "✦ IA" cuando la respuesta viene de ahí.

- **Asistente inteligente:** mismo modo de la función con `varios: true`; devuelve
  hasta 30 movimientos de un texto, un dictado o varias líneas, y se revisan antes de guardar.
- **Tasas de cambio:** con `{ tasas: true }` devuelve las tasas con base en USD, sin gastar
  cupo de Gemini y sin necesitar la clave.
- **Pregúntale a NOVA:** el chat (pestaña NOVA IA, botón + o tarjeta del inicio) para hacerle preguntas a la IA
  ("¿en qué gasto más este mes?", "¿cuánto me queda del presupuesto?"). La app
  le manda un resumen de las cuentas, el mes, el presupuesto, las metas y los
  últimos 150 movimientos, más las últimas preguntas de la conversación. La
  conversación no se guarda: se borra al cerrar la app.
- **Clave:** la función lee el secreto `GEMINI_API_KEY` (Supabase → Edge
  Functions → Secrets). La clave gratuita se saca en https://aistudio.google.com
  → "Get API key". La app nunca ve la clave.
- **Modelo:** `gemini-flash-latest`; se puede cambiar con el secreto `GEMINI_MODEL`.
- **Sin clave, sin internet o sin cupo:** la app sigue funcionando con
  `parser.js` (texto) y Tesseract (fotos), como antes. En modo demostración
  nunca se usa la IA.
- **Privacidad:** con el plan gratuito, Google puede usar lo que se le envía
  para mejorar sus productos. No mandes fotos con datos sensibles.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Pantallas de la app |
| `estilos.css` | Diseño (oscuro y claro) |
| `app.js` | Lógica, sesión y conexión con Supabase |
| `parser.js` | Convierte la frase escrita o dictada en un movimiento |
| `periodos.js` | Calcula el periodo actual de cada ciclo de presupuesto |
| `recibo.js` | Saca el total y el negocio del texto leído en la foto de un recibo |
| `analisis.js` | Cálculos sin pantalla: periodos, análisis, búsqueda, calculadora, programados y CSV |
| `monedas.js` | Lista de monedas, búsqueda y cambio a pesos |
| `*.test.js` | Pruebas: `node --test app-finanzas/*.test.js` |
| `config.js` | Nombre de la app y conexión a Supabase |
| `vendor/` | `@supabase/supabase-js` 2.45.4 (MIT) y Tesseract.js 5.1.1 con el modelo en español (Apache-2.0), incluidos para no depender de un CDN |

## Base de datos (Supabase)

Las tablas `fin_cuentas`, `fin_categorias` (con color y grupo), `fin_movimientos`
(con nota, estado y programación de origen), `fin_metas`, `fin_perfiles`,
`fin_frecuentes`, `fin_programados`, `fin_limites`, `fin_conversaciones` y `fin_documentos` tienen
RLS: cada usuario solo ve y edita sus propias filas, y un movimiento solo puede
apuntar a una cuenta y una categoría del mismo usuario. Los visitantes sin sesión
no pueden leer nada. En el primer inicio de sesión la app crea la cuenta
"Principal" y las categorías por defecto.

En `config.js` va solo la clave **publicable**. La clave `service_role` nunca
debe ir en el navegador.

## Inicio de sesión

- **Candado** en el campo de contraseña para verla u ocultarla.
- **Crear cuenta** y **¿Olvidaste tu contraseña?** mandan un **código** al correo de la persona,
  que se escribe en la app (verificar la cuenta, o elegir la contraseña nueva). Hay "Reenviar el
  código" con una espera de un minuto, y los enlaces de correos viejos siguen funcionando. Las
  plantillas de los correos están en `supabase/plantillas-correo.md` y se pegan en el panel de
  Supabase.
- **Continuar con Google:** entra sin contraseña (y sirve para recuperar la cuenta). El botón aparece
  solo cuando Google está activado en Supabase; los pasos están en `supabase/google-login.md`.
  En la APK se abre el navegador del celular y se vuelve a NOVA por `co.novafinanzas.app://login-callback`.
- Supabase manda pocos correos por hora con su servidor de correo gratuito.

## App para Android (APK)

Cada vez que cambia `app-finanzas/` o `app-android-nova/`, el flujo de GitHub Actions
`.github/workflows/apk-nova.yml` arma la APK con Capacitor y la guarda en
`app-finanzas/descargas/NOVA.apk`. La pantalla de inicio y el Perfil muestran
"Descargar la app para Android" cuando el archivo existe. Dentro de la app
instalada no se muestra.

- **Enlace fijo a la última APK:** el flujo también la sube, con `version.json`,
  a la versión de GitHub `nova-android` (`apkUrl` y `apkVersionUrl` en
  `config.js`). Los botones de descarga de la página llevan ahí, así que dan la
  APK más nueva aunque la página no se haya vuelto a publicar.
- **Aviso de actualización:** la APK lleva su número en `version-app.json`. Al
  abrirla (y al volver a ella) compara ese número con `version.json`; si hay una
  más nueva, muestra arriba "Hay una versión nueva de NOVA" con el botón para
  descargarla e instalarla encima.
- **Ícono y pantalla de inicio:** el logo de NOVA en `app-android-nova/recursos/res/`.
  Se generan desde un dibujo, así que cambiarlos es cambiar esas imágenes.
- **Firma:** `app-android-nova/firma/debug.keystore` es una firma de depuración
  (contraseña `android`, la estándar). Se guarda en el repositorio y se le pasa
  a Gradle para que cada versión nueva se instale encima de la anterior; el
  flujo comprueba la huella antes de publicar. Las APK 1.1 a 1.6 salieron con
  otra firma: quien tenga una de esas debe desinstalarla una vez. Para publicar en Google Play
  hace falta una firma propia y secreta.
- **Avisos de vencimientos:** `@capacitor/local-notifications` programa las notificaciones de
  `fin_documentos` cada vez que se abre la app o cambia algo. En Android 13 o más pide permiso.
- **Voz y cámara en la APK:** el dictado usa el reconocimiento de voz del
  celular (`@capacitor-community/speech-recognition`), y la foto del recibo usa
  la cámara. La APK pide permiso de micrófono, cámara y ubicación la primera vez.

## Probar en tu ordenador

```
npx serve app-finanzas
```

## Publicar en Vercel

```
cd app-finanzas
vercel          # vista previa
vercel --prod   # producción
```

Después de publicar, abre Supabase → Authentication → URL Configuration y pon
la dirección de Vercel en **Site URL**. Así el enlace del correo de
confirmación lleva a tu app.


## Informes (PDF y Excel)

En Ajustes → Exportar datos hay dos informes completos del periodo que se ve en Inicio:

- **Informe PDF**: encabezado con el nombre y el correo de la persona, cifras clave, gráficos (dona por categoría,
  ingresos contra gastos, gasto por día de la semana), tablas de categorías, presupuestos, cuentas, trabajo como
  conductor (si está activo) y todos los movimientos, con número de página.
- **Excel con dashboard** (.xlsx): hoja Dashboard con cifras y gráficos, y hojas de Transacciones (todo el historial,
  con filtros y total), Por categoría, Evolución, Cuentas y límites y Mi trabajo. Los gráficos van como imágenes.

Se arman en el celular con jsPDF y ExcelJS (`vendor/informes/`, se cargan solo al exportar) y `informes.js`.
En la app de Android el archivo se guarda en la caché y se abre el menú de compartir.

Los iconos **PDF** y **XLS** aparecen en Inicio, Planes (límites y metas), Análisis, Mi trabajo, Buscar y Exportar datos.
Al tocarlos se abre una hoja para elegir el formato y el periodo: diario, semanal, quincenal, mensual, trimestral,
semestral o anual, y cuál (actual, anterior, hace 2 o hace 3). Cada icono propone el periodo de la pantalla donde está.

## Deudas

En **Planes → Deudas** se anotan los préstamos: **Yo debo** (por ejemplo, un préstamo del banco) y **Me deben** (plata que le
prestaste a alguien). Cada deuda guarda quién, cuánto, la fecha y, si quieres, para cuándo hay que pagar. Al tocarla se ve lo
abonado, lo que falta y cada abono; se puede registrar un abono o marcar «Es todo lo que falta».
Al crear la deuda y al abonar se puede anotar el movimiento (categoría «Deudas») para que el saldo cuadre.
Las deudas salen en los informes PDF y Excel y la IA las conoce. Tablas nuevas `fin_deudas` y `fin_abonos`
(`supabase/migrations/nova_deudas.sql`, solo agrega, con seguridad por usuario).

## Detalle de cada movimiento

Al tocar un movimiento se abre su **detalle**: nombre, tipo y valor; categoría, fecha y origen (cuenta); etiquetas que se
quitan con la ✕ o se agregan escribiéndolas o tocando una sugerencia; cómo va el presupuesto del periodo; y, si el pago tiene
ubicación, el **mapa satelital** (Esri, con nombres de calles; también hay mapa de calles de OpenStreetMap) con un pin en el lugar exacto, la dirección (Nominatim), «Abrir en Mapas» y los otros pagos hechos en el mismo lugar.
El lápiz de arriba abre la edición y el ojo oculta los valores. Si el pago no tiene ubicación, un botón activa «Guardar ubicación».

## Sin internet

NOVA guarda una copia de tus datos en el celular (IndexedDB) cada vez que cargan o cambian. Sin conexión puedes ver todo, anotar
gastos e ingresos, abonar deudas, cambiar ajustes y sacar informes PDF y Excel: los cambios quedan en una cola
(`sincronizacion.js`) y se envían solos, en orden, cuando vuelve el internet (arriba sale un aviso con cuántos faltan).
Los ids temporales se cambian por los reales al enviar, y un error real de la base no frena los demás cambios.
Los mapas ya vistos y los del lugar de cada pago nuevo (se bajan al guardarlo) se guardan con el service worker (`sw.js`).
Necesitan internet: entrar por primera vez, crear cuenta, entrar con Google, la IA y los mapas de lugares que nunca se abrieron.
En el detalle de un pago, el mapa tiene tres vistas: Google (satélite con calles, necesita internet), Satélite (Esri) y Calles.

## Números con puntos automáticos

Los campos de plata (deudas, abonos, metas, límites, presupuesto, saldo, costos) ponen los puntos de miles mientras se
escribe (10000 → 10.000); la coma es solo para decimales y `10,000` se toma como miles. En los textos libres (entrada rápida,
registros comunes, asistente de varios registros) los números de 4 cifras o más también se separan: «gasté 20000» → «gasté 20.000».
La tasa de cambio usa puntos de miles y coma decimal. Los valores se muestran con puntos puestos a mano (no con Intl), para que
salgan igual en cualquier celular.

## Otras monedas (162) y conversión en los dos sentidos

Al anotar un pago en otra moneda se puede elegir entre las 162 monedas del mundo con tasa de cambio (las más usadas primero; buscador por
nombre o código). Salen tres campos enlazados: el valor en esa moneda, los pesos (COP) y la tasa. Se puede escribir en cualquiera y los otros
se calculan solos; si la persona escribe los pesos, esos pesos exactos son los que se guardan. «Volver a la tasa del día» deshace una tasa
cambiada. Las tasas vienen de open.er-api.com (una vez al día, guardadas en el celular); si falta una, se escribe a mano.

## Tasas de cambio (Ajustes → Tasas de cambio)

Convertidor entre cualquier par de las 162 monedas, con los dos valores editables (lo que se escribe en uno calcula el otro), botón
para cambiar de lugar las monedas y la lista de todas las monedas con su tasa (1 moneda = X pesos, 1 USD = X moneda) y un buscador por
nombre o código. Al tocar una moneda de la lista pasa al convertidor. Sin internet se usan las últimas tasas guardadas.

Las tasas se revisan solas cada 30 minutos mientras la app está abierta, y también al abrirla, al volver a ella y al volver el internet;
el botón «Actualizar ahora» las pide ya (máximo una vez por minuto). La fuente gratuita (open.er-api.com) publica tasas nuevas una vez al día.
La tasa del pago que se está anotando también se renueva sola si la persona no la cambió a mano.

## Editar y borrar en todos lados

Todo se puede corregir y borrar: movimientos (lápiz y papelera en el detalle), deudas (lápiz y papelera arriba del detalle y botones abajo),
cada abono, metas, cuentas (se borran solo si hay más de una y no tienen movimientos), registros comunes, programaciones, límites,
categorías, etiquetas y vencimientos. Un editor general (`abrirEditor` en `app.js`) arma el formulario de metas, abonos, cuentas,
registros comunes y programaciones, con los campos de plata con puntos automáticos y un botón de borrar con confirmación.

## Novedades: tarjeta con mascota, PIN, restaurar respaldo y alertas

- Aviso de arriba con la mascota **Novi** (búho verde dibujado en el código) al guardar movimientos, deudas, etc.
- **Bloqueo con PIN** (Configuración → Seguridad y respaldo). El PIN queda solo en el dispositivo.
- **Restaurar respaldo**: agrega los movimientos que faltan de un archivo `nova-respaldo-*.json`, nunca borra.
- **Alerta de límites** al 80 % y al 100 % tras guardar un gasto, y recordatorio semanal los domingos (app Android).

## Novedades: racha, proyección, metas con fecha, foto del recibo y gastos compartidos

- Inicio: tarjetas de **proyección del periodo** y **racha** de días anotando.
- **Metas con fecha** (`fin_metas.fecha_limite`): cuota sugerida por semana y por mes.
- **Foto del recibo** en el detalle (bucket privado `recibos`, `fin_movimientos.foto_ruta`).
- **Gastos compartidos** (Planes): grupos con nombres de personas, quién pagó y entre quiénes, saldos y "quién le paga a quién" (`fin_grupos`, `fin_gastos_grupo`).
- Todas las migraciones son aditivas: `supabase/migrations/nova_metas_fecha.sql`, `nova_fotos_recibos.sql`, `nova_gastos_compartidos.sql`.

## Novedades: consejos, calendario, logros, calculadoras y recordatorios

- **Consejos de NOVA** (Análisis): promedio por día, día y hora de más gasto, mayor gasto, gastos hormiga, comparación con el periodo anterior, tasa de ahorro, cuánto te alcanza el saldo, lo que más repites, lo que más subió, días sin gastar, gastos fijos detectados y dónde se va tu plata (`consejos.js`).
- **Calendario de gastos**, **Logros** y **Calculadoras** (crédito, ahorro y regla 50/30/20) como gráficos de Análisis; se pueden ocultar o reordenar con «Personalizar».
- Inicio: saludo y tarjeta «Tu semana» con botón para compartir; aviso de gasto fuera de lo normal al guardar.
- Detalle: «Repetir este gasto». Grupos: compartir las cuentas por WhatsApp u otras apps.
- Apariencia: color (verde, azul, morado, naranja) y letra grande. Recordatorios opcionales (noche y víspera de pagos programados, app Android).

## Novedades: salud financiera y más calculadoras (50 funciones)

- **Salud financiera** (Análisis): puntaje 0–100, fondo de emergencia, deudas frente a ingresos, mejor y peor mes.
- **Más calculadoras**: IVA, dividir la cuenta con propina, costo anual de un hábito, ¿contado o a cuotas?, CDT, prima y cesantías (estimado) y cuándo sales de una deuda.
- **Reto de ahorro de 52 semanas** (se guarda en el dispositivo). El recordatorio del domingo ahora trae las cifras de la semana.

## Novedades: papelera, deshacer, importar CSV y más

- **Papelera** (Configuración): lo que borras (movimientos y metas) queda 30 días en el dispositivo y se puede recuperar; el aviso de borrado trae el botón «Deshacer».
- **Importar desde CSV**, **sacudir para ocultar valores**, **tutorial de bienvenida** y **autocompletar** la descripción.
- Análisis: **suscripciones y pagos fijos**, **inflación personal**, **comparar dos meses** y **costo de un evento**; botón de **fondo de emergencia** en Salud financiera.
- Deudas: «Recordarle por WhatsApp» cuando te deben.

## Novedades: pagos fijos, pronóstico, tu año, plan de deudas, día de pago y alcancía

- Análisis: **pagos fijos del mes**, **pronóstico del próximo mes**, **tu año en NOVA** (con botón de compartir), **plan para pagar tus deudas** (bola de nieve) y **alcancía de redondeo**.
- Inicio: **tu próximo pago** (Configuración → «Tu plata» → día de pago).
- Al escribir la descripción se **sugiere la categoría** que ya usaste con ella. Aviso opcional de **prima y aguinaldo**.

## Arreglo: chat con la IA

- Cada pregunta se **guarda en el historial de inmediato** (antes solo se guardaba si la IA respondía), y la respuesta se agrega cuando llega. Si la IA falla, la pregunta queda guardada y el texto vuelve al campo para reintentar.
- El botón de enviar ya no se bloquea: si haces otra pregunta mientras la anterior espera, se cancela la anterior. La tecla «enviar» del teclado funciona siempre.

## Novedades: sobres, plan de quincena, lugares, metas de reducción y más

- Análisis: **mis sobres** (límites como sobres), **plan de quincena**, **días sin gastar**, **dónde más gastas** (lugares), **en qué parte del mes gastas** y **metas de reducción**; el consejo de **gastos fuera de lo normal**.
- **Apartar al cobrar** (Configuración → «Tu plata»): al anotar un ingreso propone mover un porcentaje a una meta.
- **PIN discreto**: un segundo PIN que abre NOVA con los valores ocultos.

## Novedades: fotos en deudas y metas, historial de cambios, meta del grupo y mapa de calor

- **Foto o documento en cada deuda** y **foto en cada meta** (mismo espacio privado `recibos`; columnas `foto_ruta`).
- **Historial de cambios** (Configuración): lo que creas, editas o borras en movimientos, metas, deudas, abonos, límites y cuentas. Lo escriben disparadores de la base (`fin_historial`, solo lectura para la app).
- **Meta compartida del grupo** con aportes por persona (`fin_aportes_grupo`, `fin_grupos.meta_*`).
- **Mapa de calor** de los lugares donde más gastas (desde «Dónde más gastas»).
- Migración aditiva: `supabase/migrations/nova_fotos_deudas_metas_historial_aportes.sql`.

## Novedad: separar los productos de un recibo

- En el detalle de un movimiento con foto, **🧾 Separar los productos** le pide a la IA (función `nova-ia`, modo `productos`) la lista de lo comprado con su valor; se puede guardar en la nota del movimiento.

## Novedades: mensajes de bancos, teclas rápidas, respaldo semanal, Drive y Hojas

- **Mensajes de bancos**: al pegar en «Anotar rápido» un mensaje de Bancolombia, Nequi, Davivienda y similares, NOVA lo convierte en un gasto o ingreso (no lee tus SMS solos: eso exigiría el permiso de leer mensajes, que Google Play Protect mira con desconfianza).
- **Teclas rápidas en la notificación** (Configuración → Recordatorios, app Android): botones con tus 3 primeros registros comunes.
- **Respaldo semanal**: aviso los domingos; **Guardar copia en Google Drive** y **Abrir en Hojas de cálculo de Google** en Exportar datos (usan el menú de compartir; no piden permisos de Google).

## Novedad: widget de la pantalla de inicio (Android)

- Widget «NOVA saldo» (clic largo en la pantalla de inicio → Widgets → NOVA): muestra el saldo y cuánto puedes gastar hoy; al tocarlo abre NOVA. Se actualiza al abrir la app y cada 30 minutos. Si tienes PIN o los valores ocultos, muestra «$ ••••».
- La app guarda los datos con `@capacitor/preferences`; el widget (`app-android-nova/recursos/java/SaldoWidget.java`) los lee y se agrega al proyecto de Android en el flujo `apk-nova.yml`.

## Probar las funciones nuevas en el celular

- **Configuración → «Probar las funciones nuevas»**: ejecuta con un toque pruebas reales de foto (sube, descarga y borra una imagen de prueba), historial, IA que lee los productos de un recibo de prueba, datos del widget y notificación con botones (teclas rápidas), y muestra ✅ o ❌ con el motivo. Se puede copiar el resultado.

## Avisos de actualización dentro de la app

- La app instalada revisa la versión publicada en **GitHub** (sale apenas termina de armarse la APK) y en la página; si hay una más nueva, muestra el aviso verde de arriba con el botón de descarga. Revisa al abrir, al volver a la app y cada 30 minutos.
- En el **inicio de sesión** de la app aparece «Tienes la versión X» y el botón **Buscar actualización de NOVA** (también en Configuración). Si hay una nueva, sale el botón para descargarla.
- Antes solo se miraba la versión de la página, que seguía vieja si no se volvía a publicar, y por eso no avisaba.

- El botón **Descargar la app para Android** se ve siempre abajo del inicio de sesión (navegador y app) y en Configuración, y baja de una vez la última APK. Si hay una más nueva, cambia a **Descargar la versión nueva (X)** y sale el aviso verde de arriba.
