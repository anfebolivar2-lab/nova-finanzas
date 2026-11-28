const test = require("node:test");
const assert = require("node:assert/strict");
const {
  tocaRevisarOta, versionWeb, cambioVersionWeb, puedeRecargar, permiteRecargaWeb, planApk
} = require("./actualizacion.js");

test("la revisión OTA periódica respeta cinco minutos y la forzada pasa de inmediato", function () {
  const anterior = 1000;
  assert.equal(tocaRevisarOta(anterior + 299999, anterior, false), false);
  assert.equal(tocaRevisarOta(anterior + 300000, anterior, false), true);
  assert.equal(tocaRevisarOta(anterior + 1, anterior, true), true);
  assert.equal(tocaRevisarOta(anterior, 0, false), true);
});

test("la versión web prefiere ETag y usa Last-Modified como respaldo", function () {
  const fecha = "Thu, 26 Nov 2026 12:00:00 GMT";
  const inicial = versionWeb(new Headers({ ETag: '"abc"', "Last-Modified": fecha }));
  const nueva = versionWeb(new Headers({ ETag: '"def"', "Last-Modified": fecha }));
  assert.equal(inicial, 'etag:"abc"');
  assert.equal(versionWeb(new Headers({ "Last-Modified": fecha })), "modificada:" + fecha);
  assert.equal(versionWeb(new Headers()), null);
  assert.equal(cambioVersionWeb(null, inicial), false);
  assert.equal(cambioVersionWeb(inicial, null), false);
  assert.equal(cambioVersionWeb(inicial, inicial), false);
  assert.equal(cambioVersionWeb(inicial, nueva), true);
});

test("una capa, el bloqueo, un campo enfocado o un borrador impiden la recarga", function () {
  const estado = { capas: 0, bloqueada: false, escribiendo: false, borrador: false };
  assert.equal(puedeRecargar(estado), true);
  assert.equal(puedeRecargar({ ...estado, capas: 1 }), false);
  assert.equal(puedeRecargar({ ...estado, bloqueada: true }), false);
  assert.equal(puedeRecargar({ ...estado, escribiendo: true }), false);
  assert.equal(puedeRecargar({ ...estado, borrador: true }), false);
});

test("la web solo puede recargarse automáticamente al volver tras treinta minutos", function () {
  assert.equal(permiteRecargaWeb(1800001, null), false);
  assert.equal(permiteRecargaWeb(1800000, 1), false);
  assert.equal(permiteRecargaWeb(1800001, 1), true);
});

test("el plan de APK conserva el enlace para APK antiguas y después de un fallo", function () {
  assert.deepEqual(planApk(undefined), { accion: "nada", texto: "" });
  assert.equal(planApk({ hayNueva: false, puente: true, descargada: 10, versionNueva: 10 }).accion, "nada");
  assert.equal(planApk({ hayNueva: true }).accion, "enlace");
  assert.equal(planApk({ hayNueva: true, puente: true, falloAntes: true }).accion, "enlace");
});

test("el plan de APK baja en wifi sin ahorro y espera en las demás condiciones", function () {
  const estado = { hayNueva: true, puente: true, versionNueva: 12, descargada: 11, red: "wifi" };
  assert.equal(planApk(estado).accion, "descargar");
  assert.equal(planApk({ ...estado, descargada: 13 }).accion, "descargar");
  assert.equal(planApk({ ...estado, ahorroDatos: true }).accion, "esperar-wifi");
  assert.equal(planApk({ ...estado, descargando: true }).accion, "esperar-wifi");
  assert.deepEqual(planApk({ ...estado, red: "datos" }), {
    accion: "esperar-wifi",
    texto: "Hay una versión nueva. Se bajará sola con wifi o toca para bajarla ahora."
  });
  assert.equal(planApk({ ...estado, red: "ninguna" }).accion, "esperar-wifi");
});

test("solo la versión exacta bajada se puede instalar y Android puede pedir permiso", function () {
  const estado = { hayNueva: true, puente: true, versionNueva: 12, descargada: 12, red: "ninguna" };
  assert.equal(planApk(estado).accion, "permiso");
  assert.equal(planApk({ ...estado, puedeInstalar: true }).accion, "instalar");
  assert.equal(planApk({ ...estado, descargada: "12", puedeInstalar: true }).accion, "esperar-wifi");
  assert.equal(planApk({ hayNueva: true, puente: true, puedeInstalar: true }).accion, "esperar-wifi");
});
