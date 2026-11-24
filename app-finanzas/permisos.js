(function (raiz) {
  "use strict";

  function permisosPanel(rol) {
    return { actuar: rol === "dueno" || rol === "actuar", gestionarAdmins: rol === "dueno" };
  }

  var api = { permisosPanel: permisosPanel };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaPermisos = api;
})(typeof window !== "undefined" ? window : this);
