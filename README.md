# NOVA · finanzas personales

App de finanzas personales de OPITA-DIGITAL: web (`app-finanzas/`) y Android (`app-android-nova/`, Capacitor).

- `app-finanzas/`: la app (archivos estáticos, sin compilación). Detalles en `app-finanzas/README.md`.
- `app-android-nova/`: proyecto de Android. `.github/workflows/apk-nova.yml` arma la APK en cada cambio y la publica en
  la versión `nova-android` de este repositorio (`releases/download/nova-android/NOVA.apk`); la app avisa sola cuando
  hay una nueva.
- `supabase/`: migraciones de la base de datos y la función `nova-ia`.

Pruebas: `node --test app-finanzas/*.test.js`.

NOVA vino del repositorio `principios-inteligencia-artificial-2026-b-` (cuenta afbolivar-2026b-lang), donde llegó hasta la versión 1.63.
