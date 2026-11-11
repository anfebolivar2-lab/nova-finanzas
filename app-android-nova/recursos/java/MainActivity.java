package co.novafinanzas.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

/** La pantalla de NOVA. Registra el puente propio NovaBanco (permiso para leer las notificaciones del banco). */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NovaBancoPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
