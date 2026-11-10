# Plantillas de correo de NOVA (códigos)

NOVA espera que los correos de Supabase traigan un **código** que la persona escribe en la app.
Las plantillas se pegan en el panel de Supabase: **Authentication → Emails (Email Templates)**.
No llevan enlace a propósito: Gmail y otros programas abren los enlaces antes que la persona y los
dejan sin efecto.

Para que se mande el código al crear la cuenta, **"Confirm email"** debe estar **prendido**
(Authentication → Sign In / Providers → Email).

## Confirm sign up (crear cuenta)

Asunto:

```
Tu código de NOVA
```

Mensaje:

```html
<h2>Tu código de NOVA</h2>
<p>Escribe este código en la app para crear tu cuenta:</p>
<h1>{{ .Token }}</h1>
<p>Si no fuiste tú, ignora este correo.</p>
```

## Reset password (olvidé mi contraseña)

Asunto:

```
Tu código para cambiar la contraseña de NOVA
```

Mensaje:

```html
<h2>Cambiar tu contraseña de NOVA</h2>
<p>Escribe este código en la app y elige tu contraseña nueva:</p>
<h1>{{ .Token }}</h1>
<p>Si no fuiste tú, ignora este correo.</p>
```

## Notas

- La app acepta códigos de 6 a 10 números (la longitud se cambia en Authentication → Sign In /
  Providers → Email → *Email OTP Length*).
- El servicio de correo gratis de Supabase manda muy pocos correos por hora. Para usarla con más
  gente hay que configurar un correo propio (SMTP) en Authentication → SMTP Settings.
