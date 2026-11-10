// Configuración de la app. Cambia estos valores sin tocar el resto del código.
//
// La clave publicable de Supabase está pensada para ir en el navegador: las
// reglas RLS hacen que cada usuario solo vea y edite sus propios datos, y los
// visitantes sin sesión no pueden leer nada. NUNCA pongas aquí la clave
// service_role ni la contraseña de la base de datos.
window.NOVA_CONFIG = {
  nombre: "NOVA",
  supabaseUrl: "https://bldimtnnvumcjakbgqta.supabase.co",
  supabaseKey: "sb_publishable_4sx5ZQwhC1WDEXAqy_NYYQ_wKJ7MgHl",
  // Dirección pública de la app: a ella lleva el enlace del correo para
  // cambiar la contraseña (también cuando se pide desde la app de Android).
  sitioUrl: "https://nova-finanzas.vercel.app",
  // APK para Android. Se baja desde esta misma página (descargas/NOVA.apk) y la app instalada
  // compara su número con descargas/version.json para avisar cuando hay una nueva.
  // apkRespaldoUrl: copia en GitHub, por si el celular no baja el archivo desde la página.
  apkUrl: "https://nova-finanzas.vercel.app/descargas/NOVA.apk",
  apkVersionUrl: "https://nova-finanzas.vercel.app/descargas/version.json",
  // La versión que sale en GitHub en cuanto termina de armarse la APK (no hace falta volver a publicar la página).
  apkVersionUrlGithub: "https://github.com/anfebolivar2-lab/nova-finanzas/releases/download/nova-android/version.json",
  // Entrar con Google en la app instalada: Google se abre en el navegador del celular y vuelve a NOVA
  // por esta dirección (debe estar también en Supabase → Authentication → URL Configuration).
  appEsquema: "co.novafinanzas.app://login-callback",
  apkRespaldoUrl: "https://github.com/anfebolivar2-lab/nova-finanzas/releases/download/nova-android/NOVA.apk",
};
