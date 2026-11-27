package co.novafinanzas.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/** Widget de NOVA. Los datos los guarda la app mediante Capacitor Preferences. */
public class SaldoWidget extends AppWidgetProvider {
    private static final int FLAGS = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
    private static final int[] FRECUENTES = { R.id.widget_frecuente_1, R.id.widget_frecuente_2, R.id.widget_frecuente_3 };

    @Override
    public void onUpdate(Context contexto, AppWidgetManager gestor, int[] ids) {
        String saldo = "Abre NOVA";
        String linea = "para ver tu saldo aquí";
        JSONArray botones = null;
        try {
            SharedPreferences sp = contexto.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            String crudo = sp.getString("nova-widget", null);
            if (crudo != null) {
                JSONObject o = new JSONObject(crudo);
                saldo = o.optString("saldo", saldo);
                linea = o.optString("linea", linea);
                botones = o.optJSONArray("botones");
            }
        } catch (Exception e) {
            // Se muestra el texto por defecto.
        }
        for (int id : ids) {
            try {
                RemoteViews vista = new RemoteViews(contexto.getPackageName(), R.layout.widget_saldo);
                vista.setTextViewText(R.id.widget_saldo, saldo);
                vista.setTextViewText(R.id.widget_linea, linea);
                Intent abrir = contexto.getPackageManager().getLaunchIntentForPackage(contexto.getPackageName());
                if (abrir != null) {
                    vista.setOnClickPendingIntent(R.id.widget_raiz, PendingIntent.getActivity(contexto, 0, abrir, FLAGS));
                }
                vista.setOnClickPendingIntent(R.id.widget_gasto, nuevoGasto(contexto, 1, ""));
                for (int i = 0; i < FRECUENTES.length; i++) {
                    vista.setViewVisibility(FRECUENTES[i], View.GONE);
                    JSONObject frecuente = botones == null ? null : botones.optJSONObject(i);
                    if (frecuente == null) continue;
                    String clave = frecuente.optString("id", "");
                    String nombre = frecuente.optString("nombre", "").trim();
                    if (!clave.matches("[A-Za-z0-9_-]{1,20}") || nombre.isEmpty()) continue;
                    vista.setTextViewText(FRECUENTES[i], nombre);
                    vista.setContentDescription(FRECUENTES[i], nombre);
                    vista.setOnClickPendingIntent(FRECUENTES[i], nuevoGasto(contexto, 2 + i, "?f=" + clave));
                    vista.setViewVisibility(FRECUENTES[i], View.VISIBLE);
                }
                gestor.updateAppWidget(id, vista);
            } catch (Exception e) {
                // Un problema del widget no debe cerrar NOVA.
            }
        }
    }

    private PendingIntent nuevoGasto(Context contexto, int peticion, String consulta) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("co.novafinanzas.app://nuevo-gasto" + consulta));
        intent.setPackage(contexto.getPackageName());
        return PendingIntent.getActivity(contexto, peticion, intent, FLAGS);
    }
}
