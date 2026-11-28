package co.novafinanzas.app;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageInfo;
import android.content.pm.PackageInstaller;
import android.content.pm.PackageManager;
import android.net.ConnectivityManager;
import android.net.Uri;
import android.os.Build;
import android.os.SystemClock;
import android.provider.Settings;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "NovaActualizador")
public class NovaActualizadorPlugin extends Plugin {
    private static final long MIN_BYTES = 1024 * 1024;
    private static final long MAX_BYTES = 80 * MIN_BYTES;
    private static final AtomicBoolean DESCARGANDO = new AtomicBoolean();
    private static final AtomicBoolean INSTALANDO = new AtomicBoolean();

    private File carpeta() {
        return new File(getContext().getFilesDir(), "actualizacion");
    }

    private File archivo(int version) {
        return new File(carpeta(), "NOVA-" + version + ".apk");
    }

    private boolean puedeInstalar() {
        return Build.VERSION.SDK_INT < 26 || getContext().getPackageManager().canRequestPackageInstalls();
    }

    private long version(PackageInfo info) {
        return Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode;
    }

    private long versionInstalada() throws PackageManager.NameNotFoundException {
        return version(getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0));
    }

    private boolean tamanoValido(long bytes) {
        return bytes >= MIN_BYTES && bytes <= MAX_BYTES;
    }

    private boolean apkValida(File apk, int esperada, long instalada) throws IOException {
        if (esperada <= instalada || !tamanoValido(apk.length())) return false;
        try (InputStream entrada = new FileInputStream(apk)) {
            if (entrada.read() != 'P' || entrada.read() != 'K') return false;
        }
        PackageInfo info = getContext().getPackageManager().getPackageArchiveInfo(apk.getAbsolutePath(), 0);
        return info != null && getContext().getPackageName().equals(info.packageName) && version(info) == esperada;
    }

    private int versionDescargada() throws PackageManager.NameNotFoundException {
        File[] archivos = carpeta().listFiles();
        if (archivos == null) return 0;
        long instalada = versionInstalada();
        int descargada = 0;
        for (File apk : archivos) {
            String nombre = apk.getName();
            if (!nombre.startsWith("NOVA-") || !nombre.endsWith(".apk")) continue;
            try {
                int candidata = Integer.parseInt(nombre.substring(5, nombre.length() - 4));
                if (candidata > descargada && apkValida(apk, candidata, instalada)) descargada = candidata;
            } catch (Exception | LinkageError e) {
                // Un archivo incompleto o eliminado durante la revisión se puede ignorar.
            }
        }
        return descargada;
    }

    @PluginMethod
    public void estado(PluginCall call) {
        try {
            ConnectivityManager red = (ConnectivityManager) getContext().getSystemService(Context.CONNECTIVITY_SERVICE);
            JSObject respuesta = new JSObject();
            respuesta.put("puedeInstalar", puedeInstalar());
            respuesta.put("sdk", Build.VERSION.SDK_INT);
            respuesta.put("red", red == null || red.getActiveNetwork() == null ? "ninguna"
                : red.isActiveNetworkMetered() ? "datos" : "wifi");
            respuesta.put("ahorroDatos", red != null
                && red.getRestrictBackgroundStatus() != ConnectivityManager.RESTRICT_BACKGROUND_STATUS_DISABLED);
            respuesta.put("descargada", versionDescargada());
            call.resolve(respuesta);
        } catch (Exception | LinkageError e) {
            call.reject("No se pudo revisar la actualización.", "error");
        }
    }

    @PluginMethod
    public void pedirPermiso(PluginCall call) {
        try {
            if (!puedeInstalar()) {
                Intent ajustes = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + getContext().getPackageName()));
                getContext().startActivity(ajustes.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            }
            call.resolve();
        } catch (Exception | LinkageError e) {
            call.reject("No se pudo abrir el permiso.", "error");
        }
    }

    @PluginMethod
    public void descargar(PluginCall call) {
        try {
            if (!DESCARGANDO.compareAndSet(false, true)) {
                call.reject("Ya se está bajando una actualización.", "ocupado");
                return;
            }
            try {
                new Thread(() -> bajarApk(call), "NOVA-descarga").start();
            } catch (Exception | LinkageError e) {
                DESCARGANDO.set(false);
                call.reject("No se pudo bajar la actualización.", "invalido");
            }
        } catch (Exception | LinkageError e) {
            call.reject("No se pudo bajar la actualización.", "invalido");
        }
    }

    private void bajarApk(PluginCall call) {
        File temporal = null;
        JSObject resultado = null;
        try {
            Integer pedida = call.getInt("versionCode");
            long instalada = versionInstalada();
            if (pedida == null || pedida <= instalada) throw new IOException();
            URL url = new URL(call.getString("url"));
            validarUrl(url);
            File apk = archivo(pedida);
            File dir = carpeta();
            if (!dir.isDirectory() && !dir.mkdirs()) throw new IOException();
            temporal = new File(dir, apk.getName() + ".part");
            long bytes = recibirApk(url, temporal);
            if (!apkValida(temporal, pedida, instalada) || !temporal.renameTo(apk)) throw new IOException();
            resultado = new JSObject();
            resultado.put("listo", true);
            resultado.put("versionCode", pedida);
            resultado.put("bytes", bytes);
            File[] anteriores = dir.listFiles();
            if (anteriores != null) {
                for (File anterior : anteriores) {
                    String nombre = anterior.getName();
                    if (!anterior.equals(apk) && nombre.startsWith("NOVA-")
                            && (nombre.endsWith(".apk") || nombre.endsWith(".apk.part"))) borrar(anterior);
                }
            }
        } catch (Exception | LinkageError e) {
            // Se conserva cualquier descarga anterior hasta validar la nueva.
        } finally {
            borrar(temporal);
            DESCARGANDO.set(false);
        }
        if (resultado == null) call.reject("No se pudo validar la descarga.", "invalido");
        else call.resolve(resultado);
    }

    private void borrar(File archivo) {
        try {
            if (archivo != null) archivo.delete();
        } catch (Exception | LinkageError e) {
            // Android puede impedir el borrado. Los .part nunca se ofrecen para instalar.
        }
    }

    private void validarUrl(URL url) throws IOException {
        String host = url.getHost().toLowerCase(Locale.ROOT);
        if (!"https".equals(url.getProtocol()) || url.getUserInfo() != null
                || !(host.equals("nova-finanzas.vercel.app") || host.equals("github.com")
                || host.equals("objects.githubusercontent.com") || host.equals("release-assets.githubusercontent.com"))) {
            throw new IOException();
        }
    }

    private long recibirApk(URL url, File temporal) throws IOException {
        for (int saltos = 0; saltos <= 5; saltos++) {
            validarUrl(url);
            HttpURLConnection conexion = (HttpURLConnection) url.openConnection();
            try {
                conexion.setInstanceFollowRedirects(false);
                conexion.setConnectTimeout(15000);
                conexion.setReadTimeout(30000);
                conexion.setRequestProperty("Accept-Encoding", "identity");
                int estado = conexion.getResponseCode();
                if (estado == 301 || estado == 302 || estado == 303 || estado == 307 || estado == 308) {
                    String destino = conexion.getHeaderField("Location");
                    if (destino == null || destino.isEmpty() || saltos == 5) throw new IOException();
                    url = new URL(url, destino);
                    continue;
                }
                if (estado != HttpURLConnection.HTTP_OK) throw new IOException();
                String longitud = conexion.getHeaderField("Content-Length");
                long total = longitud == null ? -1 : Long.parseLong(longitud);
                if (longitud != null && !tamanoValido(total)) throw new IOException();
                long bytes = 0;
                long ultimoAviso = SystemClock.elapsedRealtime() - 500;
                try (InputStream entrada = conexion.getInputStream(); OutputStream salida = new FileOutputStream(temporal)) {
                    byte[] buffer = new byte[64 * 1024];
                    int leidos;
                    while ((leidos = entrada.read(buffer)) != -1) {
                        bytes += leidos;
                        if (bytes > MAX_BYTES || (total >= 0 && bytes > total)) throw new IOException();
                        salida.write(buffer, 0, leidos);
                        long ahora = SystemClock.elapsedRealtime();
                        if (ahora - ultimoAviso >= 500) {
                            JSObject progreso = new JSObject();
                            progreso.put("descargado", bytes);
                            progreso.put("total", total);
                            notifyListeners("progreso", progreso);
                            ultimoAviso = ahora;
                        }
                    }
                }
                if (!tamanoValido(bytes) || (total >= 0 && bytes != total)) throw new IOException();
                return bytes;
            } finally {
                conexion.disconnect();
            }
        }
        throw new IOException();
    }

    @PluginMethod
    public void instalar(PluginCall call) {
        if (!INSTALANDO.compareAndSet(false, true)) {
            call.reject("Ya se está instalando una actualización.", "ocupado");
            return;
        }
        PackageInstaller instalador = null;
        RecepcionInstalacion receptor = null;
        int id = -1;
        boolean commit = false;
        try {
            if (!puedeInstalar()) {
                call.reject("Permite instalar la actualización.", "permiso");
                return;
            }
            Integer pedida = call.getInt("versionCode");
            File apk = pedida == null ? null : archivo(pedida);
            if (apk == null || !apkValida(apk, pedida, versionInstalada())) {
                call.reject("La actualización no es válida.", "invalido");
                return;
            }
            Context contexto = getContext().getApplicationContext();
            instalador = contexto.getPackageManager().getPackageInstaller();
            PackageInstaller.SessionParams parametros = new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
            parametros.setAppPackageName(contexto.getPackageName());
            parametros.setSize(apk.length());
            if (Build.VERSION.SDK_INT >= 31) parametros.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED);
            id = instalador.createSession(parametros);
            try (PackageInstaller.Session sesion = instalador.openSession(id)) {
                try (InputStream entrada = new FileInputStream(apk); OutputStream salida = sesion.openWrite("base.apk", 0, apk.length())) {
                    byte[] buffer = new byte[64 * 1024];
                    int leidos;
                    while ((leidos = entrada.read(buffer)) != -1) salida.write(buffer, 0, leidos);
                    sesion.fsync(salida);
                }
                String accion = contexto.getPackageName() + ".INSTALACION." + UUID.randomUUID();
                receptor = new RecepcionInstalacion(contexto, id, accion);
                ContextCompat.registerReceiver(contexto, receptor, new IntentFilter(accion), ContextCompat.RECEIVER_NOT_EXPORTED);
                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= 31) flags |= PendingIntent.FLAG_MUTABLE;
                receptor.destino = PendingIntent.getBroadcast(contexto, id, new Intent(accion).setPackage(contexto.getPackageName()), flags);
                sesion.commit(receptor.destino.getIntentSender());
                commit = true;
            }
            call.resolve(new JSObject().put("iniciado", true));
        } catch (Exception | LinkageError e) {
            call.reject("No se pudo iniciar la instalación.", "error");
        } finally {
            if (!commit) {
                if (receptor != null) receptor.cerrar();
                INSTALANDO.set(false);
                if (instalador != null && id >= 0) abandonar(instalador, id);
            }
        }
    }

    private void abandonar(PackageInstaller instalador, int id) {
        try {
            instalador.abandonSession(id);
        } catch (Exception | LinkageError e) {
            // Android pudo haber cerrado la sesión.
        }
    }

    private class RecepcionInstalacion extends BroadcastReceiver {
        private final Context contexto;
        private final int id;
        private final String accion;
        private PendingIntent destino;

        RecepcionInstalacion(Context contexto, int id, String accion) {
            this.contexto = contexto;
            this.id = id;
            this.accion = accion;
        }

        @Override
        public void onReceive(Context context, Intent intent) {
            try {
                if (!accion.equals(intent.getAction()) || intent.getIntExtra(PackageInstaller.EXTRA_SESSION_ID, -1) != id) return;
                int estado = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
                if (estado == PackageInstaller.STATUS_PENDING_USER_ACTION) {
                    Intent confirmar = intent.getParcelableExtra(Intent.EXTRA_INTENT);
                    if (confirmar == null) throw new IOException();
                    contexto.startActivity(confirmar.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                    return;
                }
                cerrar();
                if (estado != PackageInstaller.STATUS_SUCCESS) avisarFallo();
            } catch (Exception | LinkageError e) {
                cerrar();
                avisarFallo();
                try {
                    abandonar(contexto.getPackageManager().getPackageInstaller(), id);
                } catch (Exception | LinkageError ignorado) {
                    // La app sigue disponible aunque falle el instalador.
                }
            }
        }

        private void avisarFallo() {
            try {
                JSObject fallo = new JSObject();
                fallo.put("estado", "fallo");
                fallo.put("mensaje", "No se completó la instalación.");
                notifyListeners("instalacion", fallo);
            } catch (Exception | LinkageError e) {
                // La actualización sigue disponible para intentar por el navegador.
            }
        }

        private void cerrar() {
            try {
                contexto.unregisterReceiver(this);
            } catch (Exception | LinkageError e) {
                // Puede que el registro no haya terminado.
            }
            try {
                if (destino != null) destino.cancel();
            } catch (Exception | LinkageError e) {
                // Android pudo haber cancelado el aviso.
            }
            INSTALANDO.set(false);
        }
    }
}
