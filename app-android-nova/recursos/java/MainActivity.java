package co.novafinanzas.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Pantalla de NOVA. También recibe texto que la persona comparte desde otra app (por ejemplo un mensaje del banco:
 * mantener presionado el mensaje → Compartir → NOVA). El texto queda en la lista «nova-banco» (el almacenamiento
 * privado de NOVA, el mismo de Capacitor Preferences) y la app lo muestra para revisarlo: nada se guarda sin confirmar.
 * NOVA no lee notificaciones ni mensajes por su cuenta: solo lo que la persona decide compartir.
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        try {
            registerPlugin(NovaHuellaPlugin.class);
        } catch (Exception | LinkageError e) {
            // El PIN sigue disponible si el puente falla.
        }
        super.onCreate(savedInstanceState);
    }

    private static final String PREFERENCIAS = "CapacitorStorage";
    private static final String COLA = "nova-banco";
    private static final String ABRIR = "nova-banco-abrir";
    private static final int MAXIMO = 30;
    private static final ExecutorService IMAGENES = Executors.newSingleThreadExecutor();

    // BridgeActivity llama a onNewIntent con el intent de arranque y también cuando la app ya estaba abierta.
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        recibir(intent);
    }

    private void recibir(Intent intent) {
        try {
            if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())) return;
            String tipo = intent.getType();
            if (tipo != null && tipo.startsWith("image/")) {
                Uri uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
                intent.setAction(Intent.ACTION_MAIN);
                intent.removeExtra(Intent.EXTRA_STREAM);
                IMAGENES.execute(() -> {
                    try {
                        recibirImagen(uri);
                    } catch (Exception | OutOfMemoryError e) {
                        // Un archivo dañado o demasiado grande no interrumpe NOVA.
                    }
                });
                return;
            }
            if (tipo == null || !tipo.startsWith("text/")) return;
            CharSequence crudo = intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
            // Se marca como ya atendido: si Android recrea la pantalla, no se vuelve a guardar.
            intent.setAction(Intent.ACTION_MAIN);
            intent.removeExtra(Intent.EXTRA_TEXT);
            if (crudo == null) return;
            String texto = crudo.toString().replaceAll("\\s+", " ").trim();
            if (texto.length() < 3) return;
            if (texto.length() > 600) texto = texto.substring(0, 600);
            SharedPreferences sp = getSharedPreferences(PREFERENCIAS, Context.MODE_PRIVATE);
            JSONArray cola;
            try {
                cola = new JSONArray(sp.getString(COLA, "[]"));
            } catch (Exception malo) {
                cola = new JSONArray();
            }
            long ahora = System.currentTimeMillis();
            JSONObject nuevo = new JSONObject();
            nuevo.put("id", ahora + "-" + Integer.toHexString(texto.hashCode()));
            nuevo.put("app", "Mensaje compartido");
            nuevo.put("compartido", true);
            nuevo.put("deBanco", true);
            nuevo.put("texto", texto);
            nuevo.put("fecha", ahora);
            cola.put(nuevo);
            JSONArray recortada = new JSONArray();
            for (int i = Math.max(0, cola.length() - MAXIMO); i < cola.length(); i++) recortada.put(cola.get(i));
            sp.edit().putString(COLA, recortada.toString()).putString(ABRIR, "si").apply();
        } catch (Exception e) {
            // si algo falla, la app sigue abriendo normal
        }
    }

    private void recibirImagen(Uri uri) throws Exception {
        if (uri == null || !"content".equals(uri.getScheme())) return;
        BitmapFactory.Options opciones = new BitmapFactory.Options();
        opciones.inJustDecodeBounds = true;
        try (InputStream entrada = getContentResolver().openInputStream(uri)) {
            if (entrada == null) return;
            BitmapFactory.decodeStream(entrada, null, opciones);
        }
        if (opciones.outWidth <= 0 || opciones.outHeight <= 0) return;
        int lado = Math.max(opciones.outWidth, opciones.outHeight);
        opciones.inSampleSize = 1;
        while (lado / opciones.inSampleSize > 1600) opciones.inSampleSize *= 2;
        opciones.inJustDecodeBounds = false;

        Bitmap imagen = null;
        Bitmap jpeg = null;
        File temporal = null;
        try {
            try (InputStream entrada = getContentResolver().openInputStream(uri)) {
                if (entrada == null) return;
                imagen = BitmapFactory.decodeStream(entrada, null, opciones);
            }
            if (imagen == null) return;
            int ancho = imagen.getWidth();
            int alto = imagen.getHeight();
            double escala = Math.min(1.0, 1600.0 / Math.max(ancho, alto));
            jpeg = escala == 1.0 ? imagen : Bitmap.createScaledBitmap(imagen,
                Math.max(1, (int) (ancho * escala)), Math.max(1, (int) (alto * escala)), true);
            temporal = File.createTempFile("pantallazo-", ".tmp", getCacheDir());
            try (FileOutputStream salida = new FileOutputStream(temporal)) {
                if (!jpeg.compress(Bitmap.CompressFormat.JPEG, 80, salida)) return;
            }
            String archivo = "compartido.jpg";
            JSONObject datos = new JSONObject();
            datos.put("archivo", archivo);
            datos.put("fecha", System.currentTimeMillis());
            if (!temporal.renameTo(new File(getCacheDir(), archivo))) return;
            getSharedPreferences(PREFERENCIAS, Context.MODE_PRIVATE).edit()
                .putString("nova-compartido", datos.toString())
                .putString("nova-compartido-abrir", "si").apply();
            if (getBridge() != null) getBridge().triggerWindowJSEvent("novaPantallazoCompartido");
        } finally {
            if (jpeg != null && jpeg != imagen) jpeg.recycle();
            if (imagen != null) imagen.recycle();
            if (temporal != null) temporal.delete();
        }
    }
}
