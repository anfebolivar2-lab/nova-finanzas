# Cómo trabajamos: Claude Code + Codex

Responde siempre al dueño en español.

## Roles

Claude Code planea el trabajo y revisa los cambios. Codex, la herramienta de OpenAI que el script del entorno ya instaló, escribe el código.
Claude Code solo escribe cambios largos de código si el dueño se lo pide o si Codex no está disponible.

## Al empezar cada chat

En el primer mensaje del chat, haz estos pasos por tu cuenta, sin esperar a que el dueño te los pida.

1. Comprueba la sesión de Codex.

   ```bash
   codex login status
   ```

   Si dice «Logged in using ChatGPT», Codex está listo y no hace falta hacer nada más.
2. Si no hay sesión o dice que usa una API key, inicia sesión con un código en segundo plano. Espera unos segundos y lee el registro.

   ```bash
   script -qfc "codex login --device-auth" /tmp/codex-login.log >/dev/null 2>&1 &
   sleep 3
   cat /tmp/codex-login.log
   ```

3. En el mismo mensaje, dale al dueño el enlace https://auth.openai.com/codex/device y el código que aparece en el registro. Dile «Toca el enlace, entra con tu cuenta de ChatGPT y pega este código». El código vence en 15 minutos.
4. Cuando el dueño diga que ya pegó el código, confirma que la sesión diga «Logged in using ChatGPT».

   ```bash
   codex login status
   ```

5. No uses una API key ni pidas saldo. El dueño decidió usar su cuenta gratuita de ChatGPT. Mientras no haya sesión, puedes seguir planeando y revisando, pero avisa que Codex aún no está conectado.

## Cómo delegar a Codex

Escribe el encargo en `tarea.md`. Indica qué archivos y funciones debe cambiar, qué pruebas debe correr e incluye «no hagas commits».

```bash
codex exec -s workspace-write "$(cat tarea.md)" < /dev/null
```

Incluye siempre `< /dev/null`. Sin eso, Codex se queda esperando.

## Antes de subir cambios

Claude Code lee el diff completo (la lista de cambios) y corre las pruebas del repositorio. Si hay cambios visuales, prueba la pantalla en el navegador con Playwright y manda una captura al dueño.

## Reglas obligatorias del dueño

- Nunca trabajes ni hagas push en `main`. Usa una rama nueva y un PR en borrador para cada cambio. El dueño decide si lo incorpora.
- No borres archivos, datos ni historial. Si una tarea requiere borrar algo, pregunta antes.
- Solo toca la base de datos o los datos de usuarios en Supabase, o despliega funciones, si el dueño lo pide.
- Todo cambio debe poder deshacerse cerrando el PR o revirtiendo el commit.
- Explica al dueño en español sencillo qué se hizo, cuánto tardó y qué falta.

## Notas de este repositorio

- App NOVA (web estática en `app-finanzas/`, sin compilación) y su APK de Android (`app-android-nova/`).
- Pruebas: `node --test app-finanzas/*.test.js`. Sintaxis de la app: `node -e "new Function(require('fs').readFileSync('app-finanzas/app.js','utf8'))"`.
- Para ver la app sin cuenta: servir `app-finanzas/` (por ejemplo `python3 -m http.server`) y tocar «Ver la demostración sin cuenta». Los datos de la demostración no son reales y no se guardan.
- `.github/workflows/apk-nova.yml` publica la APK que descargan los usuarios. Debe publicar solo desde `main`. Mientras el PR anfebolivar2-lab/nova-finanzas#1 no esté unido, crea las ramas nuevas desde `claude/simulador-tarjeta`, no desde `main`, para no publicar una APK por accidente.
- `supabase/` es la base de datos y las funciones en producción: no tocar sin permiso.
