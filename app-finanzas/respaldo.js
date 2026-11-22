// Respaldo cifrado de NOVA. El formato v1 fija los algoritmos y sus parámetros.
(function (raiz) {
  "use strict";

  var FORMATO = "nova-respaldo-v1";

  function base64(bytes) {
    var texto = "";
    for (var i = 0; i < bytes.length; i += 0x8000) {
      texto += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(texto);
  }

  function leerBase64(texto) {
    if (typeof texto !== "string" || !texto.length || texto.length % 4 || /[^A-Za-z0-9+/=]/.test(texto)) {
      throw new Error("Formato inválido");
    }
    var binario = atob(texto);
    if (btoa(binario) !== texto) throw new Error("Formato inválido");
    return Uint8Array.from(binario, function (c) { return c.charCodeAt(0); });
  }

  function cryptoDisponible() {
    if (typeof globalThis === "undefined" || !globalThis.crypto || !globalThis.crypto.subtle) {
      throw new Error("Para usar respaldos cifrados, abre NOVA en un navegador compatible con HTTPS.");
    }
    return globalThis.crypto;
  }

  async function derivar(subtle, clave, sal, uso) {
    var base = await subtle.importKey("raw", new TextEncoder().encode(clave), "PBKDF2", false, ["deriveKey"]);
    return subtle.deriveKey(
      { name: "PBKDF2", hash: "SHA-256", iterations: 200000, salt: sal },
      base, { name: "AES-GCM", length: 256 }, false, [uso]
    );
  }

  async function cifrar(texto, clave) {
    var crypto = cryptoDisponible();
    var sal = crypto.getRandomValues(new Uint8Array(16));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var llave = await derivar(crypto.subtle, clave, sal, "encrypt");
    var datos = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, llave, new TextEncoder().encode(texto));
    return { formato: FORMATO, sal: base64(sal), iv: base64(iv), datos: base64(new Uint8Array(datos)) };
  }

  async function descifrar(sobre, clave) {
    var sal, iv, datos;
    try {
      if (!sobre || sobre.formato !== FORMATO) throw new Error("Formato inválido");
      sal = leerBase64(sobre.sal);
      iv = leerBase64(sobre.iv);
      datos = leerBase64(sobre.datos);
      if (sal.length !== 16 || iv.length !== 12 || datos.length < 16) throw new Error("Formato inválido");
    } catch (e) {
      throw new Error("Ese archivo no es un respaldo cifrado válido de NOVA.");
    }
    var subtle = cryptoDisponible().subtle;
    var llave = await derivar(subtle, clave, sal, "decrypt");
    try {
      var texto = await subtle.decrypt({ name: "AES-GCM", iv: iv }, llave, datos);
      return new TextDecoder().decode(texto);
    } catch (e) {
      throw new Error("La contraseña es incorrecta o el archivo está dañado.");
    }
  }

  var api = { cifrar: cifrar, descifrar: descifrar };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaRespaldo = api;
})(typeof window !== "undefined" ? window : this);
