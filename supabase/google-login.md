# Entrar con Google en NOVA

NOVA ya tiene el botón **Continuar con Google**. Solo aparece cuando Google está activado en
Supabase (la app lo pregunta a `/auth/v1/settings`), así que no hay que volver a publicar nada.

## 1. Credencial de Google (gratis)

1. Entrar a https://console.cloud.google.com con la cuenta de Google.
2. Crear un proyecto (por ejemplo "NOVA") o usar uno que ya exista.
3. **APIs y servicios → Pantalla de consentimiento de OAuth**: tipo *Externo*, nombre **NOVA**,
   correo de asistencia y correo del desarrollador. Guardar. Al final, **Publicar la aplicación**
   (los datos que pide NOVA son solo correo y nombre, y no necesitan verificación).
4. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth**:
   - Tipo de aplicación: **Aplicación web**.
   - **URI de redireccionamiento autorizado**:
     `https://bldimtnnvumcjakbgqta.supabase.co/auth/v1/callback`
5. Copiar el **ID de cliente** y el **Secreto del cliente**. El secreto no se comparte con nadie.

## 2. Supabase

1. **Authentication → Sign In / Providers → Google**: activarlo y pegar el ID de cliente y el secreto.
2. **Authentication → URL Configuration**:
   - **Site URL**: `https://nova-finanzas.vercel.app`
   - **Redirect URLs** (agregar las dos):
     - `https://nova-finanzas.vercel.app`
     - `co.novafinanzas.app://login-callback`  ← para la app instalada

## Cómo funciona

- **Navegador:** el botón lleva a Google y vuelve a la página con la sesión.
- **App instalada:** Google no deja entrar desde la ventana interna de la app. NOVA lo abre en el
  navegador del celular (`@capacitor/browser`) y Google vuelve a la app con el enlace
  `co.novafinanzas.app://login-callback` (el manifiesto de Android lo declara el flujo
  `apk-nova.yml`; `@capacitor/app` lo recibe).
- Si el correo de Google ya tenía una cuenta de NOVA con contraseña, Supabase las une.
