package co.novafinanzas.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Lee las notificaciones que llegan al celular y guarda las que parecen un pago o un ingreso avisado por un banco
 * o una billetera (Bancolombia, Nequi, Davivienda, Nu…), para que NOVA ofrezca anotarlas.
 * Solo funciona si la persona le da a NOVA el permiso de "Acceso a notificaciones" en los Ajustes de Android.
 * Nada se anota solo: la app siempre muestra el movimiento y pregunta antes de guardarlo.
 * Al tocar el aviso "¿Lo anoto en NOVA?" se abre la app con el enlace co.novafinanzas.app://banco.
 * La lista queda en el almacenamiento privado de NOVA (el mismo de Capacitor Preferences) y no sale del celular.
 */
public class BancoListener extends NotificationListenerService {
    static final String PREFERENCIAS = "CapacitorStorage";   // donde guarda Capacitor Preferences (la app lo lee de ahí)
    static final String COLA = "nova-banco";                  // lista de movimientos por revisar
    static final String ACTIVO = "nova-banco-activo";         // "no": la persona lo apagó desde NOVA
    static final String AVISO = "nova-banco-aviso";           // "no": no mostrar el aviso "¿Lo anoto en NOVA?"
    private static final String CANAL = "nova-banco";
    private static final int ID_AVISO = 7100;
    private static final int MAXIMO = 30;
    private static final Object CANDADO = new Object();

    // Chats, correo y redes: ahí la gente escribe valores que no son movimientos suyos.
    private static final String[] IGNORAR = {
        "com.whatsapp", "com.whatsapp.w4b", "org.telegram.messenger", "org.thunderdog.challegram",
        "com.facebook.orca", "com.facebook.katana", "com.facebook.lite", "com.facebook.mlite", "com.instagram.android",
        "com.snapchat.android", "com.twitter.android", "com.zhiliaoapp.musically", "com.ss.android.ugc.trill",
        "com.discord", "com.microsoft.teams", "com.skype.raider", "com.google.android.gm", "com.microsoft.office.outlook",
        "com.linkedin.android", "com.google.android.youtube", "com.mercadolibre", "com.viber.voip", "jp.naver.line.android"
    };

    // El texto se revisa en minúsculas y sin tildes.
    private static final Pattern MONTO = Pattern.compile("(\\$|usd|cop|eur|€)\\s?\\d|\\d\\s?(usd|cop|eur)\\b");
    private static final Pattern MOVIMIENTO = Pattern.compile(
        "compra|pagaste|pago |pago:|retiro|retiraste|transferiste|transferencia|enviaste|recibiste|te llego|te llegaron|"
        + "te enviaron|te consignaron|te transfirieron|te pagaron|consignacion|abono|deposito|debito|cargo|avance|transaccion");
    private static final Pattern BANCO_TEXTO = Pattern.compile(
        "bancolombia|nequi|davivienda|daviplata|bbva|banco|av villas|scotiabank|colpatria|\\bnu\\b|lulo|movii|bre-b|pse|"
        + "tarjeta|t\\.deb|t\\.cre|cta|cuenta|rappipay|falabella|itau|bancamia|caja social|serfinanza|uala");
    private static final Pattern BANCO_APP = Pattern.compile(
        "bank|banco|bancolombia|todo1|nequi|davivienda|daviplata|bbva|bogota|nu\\.production|lulo|movii|falabella|colpatria|"
        + "scotiabank|avvillas|itau|bancamia|cajasocial|popular|occidente|pichincha|serfinanza|uala|rappipay|wallet|pay");
    // Lo que no es un movimiento hecho: compras rechazadas, reversos, claves, publicidad.
    private static final Pattern DESCARTAR = Pattern.compile(
        "rechaz|declin|fallid|no fue exitos|no exitos|no se pudo|no se realizo|revers|anulad|codigo de seguridad|"
        + "codigo de verificacion|clave dinamica|clave temporal|\\botp\\b|no compartas|descuento|aprovecha|promocion|oferta|"
        + "sorteo|participa|cashback|te invitamos|pre-?aprobad|gana hasta|black friday");

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        try {
            revisar(sbn);
        } catch (Exception e) {
            // nunca dejar caer el servicio por una notificación rara
        }
    }

    private void revisar(StatusBarNotification sbn) throws Exception {
        if (sbn == null) return;
        String paquete = sbn.getPackageName();
        if (paquete == null || paquete.equals(getPackageName())) return;   // los avisos de NOVA no cuentan
        for (String p : IGNORAR) if (paquete.equals(p)) return;
        Notification n = sbn.getNotification();
        if (n == null || n.extras == null) return;
        if ((n.flags & Notification.FLAG_GROUP_SUMMARY) != 0 || (n.flags & Notification.FLAG_ONGOING_EVENT) != 0) return;

        SharedPreferences sp = getSharedPreferences(PREFERENCIAS, Context.MODE_PRIVATE);
        if ("no".equals(sp.getString(ACTIVO, null))) return;

        Bundle e = n.extras;
        CharSequence titulo = e.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence cuerpo = e.getCharSequence(Notification.EXTRA_BIG_TEXT);
        if (cuerpo == null || cuerpo.length() == 0) cuerpo = e.getCharSequence(Notification.EXTRA_TEXT);
        if (cuerpo == null) return;
        String texto = cuerpo.toString().replaceAll("\\s+", " ").trim();
        String tit = titulo == null ? "" : titulo.toString().replaceAll("\\s+", " ").trim();
        if (!tit.isEmpty() && !texto.toLowerCase(Locale.ROOT).contains(tit.toLowerCase(Locale.ROOT))) texto = tit + ": " + texto;
        if (texto.length() < 12 || texto.length() > 600) return;

        if (!pareceMovimiento(paquete, texto)) return;
        boolean deBanco = esAppDeBanco(paquete);

        String app = nombreApp(paquete);
        long ahora = System.currentTimeMillis();
        int pendientes;
        synchronized (CANDADO) {
            JSONArray cola;
            try {
                cola = new JSONArray(sp.getString(COLA, "[]"));
            } catch (Exception malo) {
                cola = new JSONArray();
            }
            // La misma notificación puede llegar varias veces (cuando la app la actualiza): se guarda una sola.
            for (int i = 0; i < cola.length(); i++) {
                JSONObject o = cola.optJSONObject(i);
                if (o == null || !texto.equals(o.optString("texto"))) continue;
                long cuando = o.optLong("cuando", 0);
                if ((n.when != 0 && cuando == n.when) || Math.abs(ahora - o.optLong("fecha", 0)) < 90000) return;
            }
            JSONObject nuevo = new JSONObject();
            nuevo.put("id", ahora + "-" + Integer.toHexString((paquete + texto).hashCode()));
            nuevo.put("app", app);
            nuevo.put("paquete", paquete);
            nuevo.put("deBanco", deBanco);
            nuevo.put("texto", texto);
            nuevo.put("fecha", ahora);
            nuevo.put("cuando", n.when);
            cola.put(nuevo);
            JSONArray recortada = new JSONArray();
            for (int i = Math.max(0, cola.length() - MAXIMO); i < cola.length(); i++) recortada.put(cola.get(i));
            sp.edit().putString(COLA, recortada.toString()).apply();
            pendientes = recortada.length();
        }
        if (!"no".equals(sp.getString(AVISO, null))) avisar(app, texto, pendientes);
    }

    static boolean esAppDeBanco(String paquete) {
        return BANCO_APP.matcher(paquete.toLowerCase(Locale.ROOT)).find();
    }

    /** ¿El texto parece un pago o un ingreso ya hecho? Necesita un valor, una palabra de movimiento y un banco. */
    static boolean pareceMovimiento(String paquete, String texto) {
        String sin = sinTildes(texto);
        if (!MONTO.matcher(sin).find() || !MOVIMIENTO.matcher(sin).find() || DESCARTAR.matcher(sin).find()) return false;
        return esAppDeBanco(paquete) || BANCO_TEXTO.matcher(sin).find();
    }

    private String nombreApp(String paquete) {
        try {
            PackageManager pm = getPackageManager();
            return String.valueOf(pm.getApplicationLabel(pm.getApplicationInfo(paquete, 0)));
        } catch (Exception e) {
            return paquete;
        }
    }

    private static String sinTildes(String s) {
        return Normalizer.normalize(s.toLowerCase(Locale.ROOT), Normalizer.Form.NFD).replaceAll("\\p{M}", "");
    }

    /** Aviso de NOVA: "¿Lo anoto en NOVA?". Al tocarlo se abre la app con la lista para revisar. */
    private void avisar(String app, String texto, int pendientes) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel canal = new NotificationChannel(CANAL, "Movimientos del banco", NotificationManager.IMPORTANCE_DEFAULT);
            canal.setDescription("Te pregunta si quieres anotar en NOVA un pago o un ingreso que avisó tu banco");
            nm.createNotificationChannel(canal);
        }
        // Enlace propio de NOVA: la app lo recibe (appUrlOpen o getLaunchUrl) y abre la lista para revisar.
        Intent abrir = new Intent(Intent.ACTION_VIEW, Uri.parse("co.novafinanzas.app://banco"));
        abrir.setPackage(getPackageName());
        abrir.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent pendiente = PendingIntent.getActivity(this, ID_AVISO, abrir, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        int icono = getResources().getIdentifier("ic_stat_nova", "drawable", getPackageName());
        if (icono == 0) icono = android.R.drawable.ic_dialog_info;
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CANAL) : new Notification.Builder(this);
        String titulo = pendientes > 1 ? "Tienes " + pendientes + " movimientos del banco por anotar" : "¿Lo anoto en NOVA?";
        b.setSmallIcon(icono)
            .setColor(0xFF2EE06F)
            .setContentTitle(titulo)
            .setContentText(app + ": " + texto)
            .setStyle(new Notification.BigTextStyle().bigText(texto + "\nToca para revisarlo y guardarlo en NOVA."))
            .setContentIntent(pendiente)
            .setAutoCancel(true);
        nm.notify(ID_AVISO, b.build());
    }
}
