/** Contador del último consecutivo por año. Llamar siempre dentro del lock de SecuenciaService. */
var SecuenciasRepo = {
  /** Último consecutivo asignado del año; si el año no existe lo crea en 0 (reinicio anual). */
  obtener(anio) {
    const hoja = ConfigRepo.hoja(Constantes.HOJAS.SECUENCIAS);
    const filas = hoja.getDataRange().getValues();
    for (let i = 1; i < filas.length; i++) {
      if (Number(filas[i][0]) === anio) return Number(filas[i][1]);
    }
    hoja.appendRow([anio, 0]);
    return 0;
  },

  guardar(anio, ultimo) {
    const hoja = ConfigRepo.hoja(Constantes.HOJAS.SECUENCIAS);
    const filas = hoja.getDataRange().getValues();
    for (let i = 1; i < filas.length; i++) {
      if (Number(filas[i][0]) === anio) {
        hoja.getRange(i + 1, 2).setValue(ultimo);
        return;
      }
    }
    throw new ErrorSistema('No existe la fila del año ' + anio + ' en Secuencias.', 'SIN_ANIO');
  },
};
