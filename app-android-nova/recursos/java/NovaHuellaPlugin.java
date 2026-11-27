package co.novafinanzas.app;

import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NovaHuella")
public class NovaHuellaPlugin extends Plugin {
    private static final int AUTENTICADORES = BiometricManager.Authenticators.BIOMETRIC_WEAK;

    private boolean puedeAutenticar() {
        return BiometricManager.from(getContext()).canAuthenticate(AUTENTICADORES)
            == BiometricManager.BIOMETRIC_SUCCESS;
    }

    @PluginMethod
    public void disponible(PluginCall call) {
        boolean disponible = false;
        try {
            disponible = puedeAutenticar();
        } catch (Exception | LinkageError e) {
            // El PIN sigue disponible.
        }
        JSObject resultado = new JSObject();
        resultado.put("disponible", disponible);
        call.resolve(resultado);
    }

    @PluginMethod
    public void verificar(PluginCall call) {
        try {
            FragmentActivity actividad = getActivity();
            if (actividad == null) {
                call.reject("No se pudo abrir la verificación.", "error");
                return;
            }
            actividad.runOnUiThread(() -> verificarEnPantalla(actividad, call));
        } catch (Exception | LinkageError e) {
            call.reject("No se pudo abrir la verificación.", "error");
        }
    }

    private void verificarEnPantalla(FragmentActivity actividad, PluginCall call) {
        try {
            if (actividad.isFinishing() || actividad.isDestroyed()
                    || actividad.getSupportFragmentManager().isStateSaved()) {
                call.reject("No se pudo abrir la verificación.", "error");
                return;
            }
            if (!puedeAutenticar()) {
                call.reject("La huella o la cara no están disponibles.", "no_disponible");
                return;
            }
            String titulo = call.getString("titulo", "Abre NOVA");
            String subtitulo = call.getString("subtitulo", "");
            BiometricPrompt.PromptInfo.Builder info = new BiometricPrompt.PromptInfo.Builder()
                .setTitle(titulo == null || titulo.trim().isEmpty() ? "Abre NOVA" : titulo)
                .setNegativeButtonText("Usar PIN")
                .setAllowedAuthenticators(AUTENTICADORES);
            if (subtitulo != null && !subtitulo.trim().isEmpty()) info.setSubtitle(subtitulo);
            BiometricPrompt prompt = new BiometricPrompt(actividad, ContextCompat.getMainExecutor(actividad),
                new BiometricPrompt.AuthenticationCallback() {
                    @Override
                    public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult resultado) {
                        JSObject respuesta = new JSObject();
                        respuesta.put("ok", true);
                        call.resolve(respuesta);
                    }

                    @Override
                    public void onAuthenticationError(int codigo, CharSequence mensaje) {
                        switch (codigo) {
                            case BiometricPrompt.ERROR_NEGATIVE_BUTTON:
                            case BiometricPrompt.ERROR_USER_CANCELED:
                            case BiometricPrompt.ERROR_CANCELED:
                                call.reject("Verificación cancelada.", "cancelado");
                                break;
                            case BiometricPrompt.ERROR_LOCKOUT:
                            case BiometricPrompt.ERROR_LOCKOUT_PERMANENT:
                                call.reject("Demasiados intentos. Usa tu PIN.", "bloqueado");
                                break;
                            case BiometricPrompt.ERROR_HW_UNAVAILABLE:
                            case BiometricPrompt.ERROR_HW_NOT_PRESENT:
                            case BiometricPrompt.ERROR_NO_BIOMETRICS:
                            case BiometricPrompt.ERROR_SECURITY_UPDATE_REQUIRED:
                                call.reject("La huella o la cara no están disponibles.", "no_disponible");
                                break;
                            default:
                                call.reject("No se pudo verificar. Usa tu PIN.", "error");
                        }
                    }
                });
            prompt.authenticate(info.build());
        } catch (Exception | LinkageError e) {
            call.reject("No se pudo abrir la verificación.", "error");
        }
    }
}
