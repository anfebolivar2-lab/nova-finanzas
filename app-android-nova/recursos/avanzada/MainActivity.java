package co.novafinanzas.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Pantalla de NOVA. También recibe texto que la persona comparte desde otra app (por ejemplo un mensaje del banco:
 * mantener presionado el mensaje → Compartir → NOVA). El texto queda en la lista «nova-banco» (el almacenamiento
 * privado de NOVA, el mismo de Capacitor Preferences) y la app lo muestra para revisarlo: nada se guarda sin confirmar.
 * Versión AVANZADA: además registra el puente NovaBanco (permiso para leer las notificaciones del banco).
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NovaBancoPlugin.class);
        super.onCreate(savedInstanceState);
    }

    private static final String PREFERENCIAS = "CapacitorStorage";
    private static final String COLA = "nova-banco";
    private static final String ABRIR = "nova-banco-abrir";
    private static final int MAXIMO = 30;

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
}
