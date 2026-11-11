package co.novafinanzas.app;

import android.content.ComponentName;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Puente entre la app y el permiso de leer notificaciones (para anotar los movimientos que avisa el banco).
 * estado(): dice si NOVA ya tiene el permiso. abrirAjustes(): abre la pantalla de Android donde se da.
 * abrirInfoApp(): abre la información de NOVA (ahí está "Permitir ajustes restringidos" en Android 13 o más).
 */
@CapacitorPlugin(name = "NovaBanco")
public class NovaBancoPlugin extends Plugin {
    @PluginMethod
    public void estado(PluginCall call) {
        boolean permiso = false;
        try {
            String activos = Settings.Secure.getString(getContext().getContentResolver(), "enabled_notification_listeners");
            ComponentName yo = new ComponentName(getContext(), BancoListener.class);
            if (activos != null) {
                for (String nombre : activos.split(":")) {
                    ComponentName c = ComponentName.unflattenFromString(nombre);
                    if (c != null && c.equals(yo)) permiso = true;
                }
            }
        } catch (Exception e) {
            // sin permiso
        }
        JSObject r = new JSObject();
        r.put("permiso", permiso);
        call.resolve(r);
    }

    @PluginMethod
    public void abrirAjustes(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("No se pudo abrir los ajustes de notificaciones");
        }
    }

    @PluginMethod
    public void abrirInfoApp(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("No se pudo abrir la información de la app");
        }
    }
}
