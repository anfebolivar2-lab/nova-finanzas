package co.novafinanzas.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import org.json.JSONObject;

/** Widget de NOVA: muestra el saldo y cuánto se puede gastar hoy. Los datos los guarda la app (Capacitor Preferences). */
public class SaldoWidget extends AppWidgetProvider {
    @Override
    public void onUpdate(Context contexto, AppWidgetManager gestor, int[] ids) {
        String saldo = "Abre NOVA";
        String linea = "para ver tu saldo aquí";
        try {
            SharedPreferences sp = contexto.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            String crudo = sp.getString("nova-widget", null);
            if (crudo != null) {
                JSONObject o = new JSONObject(crudo);
                saldo = o.optString("saldo", saldo);
                linea = o.optString("linea", linea);
            }
        } catch (Exception e) {
            // si algo falla se muestra el texto por defecto
        }
        Intent abrir = contexto.getPackageManager().getLaunchIntentForPackage(contexto.getPackageName());
        PendingIntent pendiente = abrir == null ? null
            : PendingIntent.getActivity(contexto, 0, abrir, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        for (int id : ids) {
            RemoteViews vista = new RemoteViews(contexto.getPackageName(), R.layout.widget_saldo);
            vista.setTextViewText(R.id.widget_saldo, saldo);
            vista.setTextViewText(R.id.widget_linea, linea);
            if (pendiente != null) vista.setOnClickPendingIntent(R.id.widget_raiz, pendiente);
            gestor.updateAppWidget(id, vista);
        }
    }
}
