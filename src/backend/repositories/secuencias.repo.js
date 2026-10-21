/**
 * Contador del último consecutivo por AÑO y TIPO (recepción y entrega llevan secuencias
 * independientes). `base` = último consecutivo histórico (manual) previo a la app.
 * Llamar siempre dentro del lock de SecuenciaService.
 */
var SecuenciasRepo = {
  _buscar(hoja, anio, tipo) {
    const filas = hoja.getDataRange().getValues();
    for (let i = 1; i < filas.length; i++) {
      if (Number(filas[i][0]) === anio && filas[i][1] === tipo) return { fila: i + 1, datos: filas[i] };
    }
    return null;
  },

  /** @returns {{ultimo:number, base:number}}; si el año/tipo no existe lo crea en 0 (reinicio anual) */
  obtener(anio, tipo) {
    const hoja = ConfigRepo.hoja(Constantes.HOJAS.SECUENCIAS);
    const r = SecuenciasRepo._buscar(hoja, anio, tipo);
    if (r) return { ultimo: Number(r.datos[2]), base: Number(r.datos[3]) || 0 };
    hoja.appendRow([anio, tipo, 0, 0]);
    return { ultimo: 0, base: 0 };
  },

  guardar(anio, tipo, ultimo) {
    const hoja = ConfigRepo.hoja(Constantes.HOJAS.SECUENCIAS);
    const r = SecuenciasRepo._buscar(hoja, anio, tipo);
    if (!r) throw new ErrorSistema('No existe la secuencia ' + tipo + ' ' + anio + '.', 'SIN_SECUENCIA');
    hoja.getRange(r.fila, 3).setValue(ultimo);
  },

  /** Fija el consecutivo histórico: el próximo código será base + 1. */
  establecerBase(anio, tipo, base) {
    const hoja = ConfigRepo.hoja(Constantes.HOJAS.SECUENCIAS);
    const r = SecuenciasRepo._buscar(hoja, anio, tipo);
    if (r) hoja.getRange(r.fila, 3, 1, 2).setValues([[base, base]]);
    else hoja.appendRow([anio, tipo, base, base]);
  },
};
