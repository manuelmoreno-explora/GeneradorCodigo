/** Registro de excepciones (RF-007). Solo se agrega; no se modifica ni se borra. */
var ExcepcionesRepo = {
  agregar(e) {
    const hoja = ConfigRepo.hoja(Constantes.HOJAS.EXCEPCIONES);
    hoja.appendRow(Constantes.ENCABEZADOS.Excepciones.map((c) => (e[c] === undefined ? '' : e[c])));
  },

  /** @returns {Object[]} más recientes primero, con fecha en texto */
  listar() {
    const datos = ConfigRepo.hoja(Constantes.HOJAS.EXCEPCIONES).getDataRange().getValues();
    const enc = datos[0];
    return datos
      .slice(1)
      .map((f) => {
        const o = {};
        enc.forEach((c, i) => {
          o[c] = f[i] instanceof Date ? Utilities.formatDate(f[i], 'America/Bogota', 'yyyy-MM-dd HH:mm') : f[i];
        });
        return o;
      })
      .reverse();
  },
};
