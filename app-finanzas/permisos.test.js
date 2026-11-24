const test = require("node:test");
const assert = require("node:assert/strict");
const { permisosPanel } = require("./permisos");

test("solo el dueño puede gestionar administradores", () => {
  assert.deepEqual(permisosPanel("dueno"), { actuar: true, gestionarAdmins: true });
  assert.deepEqual(permisosPanel("actuar"), { actuar: true, gestionarAdmins: false });
});

test("el panel queda sin acciones para el rol de lectura o sin rol válido", () => {
  ["ver", undefined, null, "otro"].forEach((rol) => {
    assert.deepEqual(permisosPanel(rol), { actuar: false, gestionarAdmins: false });
  });
});
