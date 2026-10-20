/** Registro-evidencia de todos los códigos. Las filas nunca se borran; solo cambia el estado. */
var OperacionesRepo = {
  _col(nombre) {
    return Constantes.ENCABEZADOS.Operaciones.indexOf(nombre);
  },

  agregar(op) {
    const hoja = ConfigRepo.hoja(Constantes.HOJAS.OPERACIONES);
    const fila = Constantes.ENCABEZADOS.Operaciones.map((c) => (op[c] === undefined ? '' : op[c]));
    hoja.appendRow(fila);
  },

  /** @returns {Object[]} todas las operaciones de un año como objetos */
  listarPorAnio(anio) {
    const datos = ConfigRepo.hoja(Constantes.HOJAS.OPERACIONES).getDataRange().getValues();
    const enc = datos[0];
    return datos
      .slice(1)
      .map((f) => {
        const o = {};
        enc.forEach((c, i) => (o[c] = f[i]));
        return o;
      })
      .filter((o) => Number(o.anio) === anio);
  },

  /** Todas las operaciones de todos los años, con la fecha como texto (apto para el cliente). */
  listarTodas() {
    const datos = ConfigRepo.hoja(Constantes.HOJAS.OPERACIONES).getDataRange().getValues();
    const enc = datos[0];
    return datos.slice(1).map((f) => {
      const o = {};
      enc.forEach((c, i) => {
        o[c] = f[i] instanceof Date ? Utilities.formatDate(f[i], 'America/Bogota', 'yyyy-MM-dd HH:mm') : f[i];
      });
      return o;
    });
  },

  /** Mayor consecutivo registrado del año (0 si no hay). */
  maximo(anio) {
    return OperacionesRepo.listarPorAnio(anio).reduce((m, o) => Math.max(m, Number(o.consecutivo)), 0);
  },

  /**
   * Elimina la fila de un código. Uso exclusivo de SecuenciaService.liberarEnLock para reservas que
   * nunca llegaron a Drive (deja constancia en Auditoria). Nunca para operaciones COMPLETADA.
   */
  eliminar(codigo) {
    const hoja = ConfigRepo.hoja(Constantes.HOJAS.OPERACIONES);
    const datos = hoja.getDataRange().getValues();
    const colCodigo = OperacionesRepo._col('codigo');
    const colEstado = OperacionesRepo._col('estado');
    for (let i = datos.length - 1; i >= 1; i--) {
      if (datos[i][colCodigo] === codigo) {
        if (datos[i][colEstado] !== Constantes.ESTADOS.RESERVADO) {
          throw new ErrorSistema('Solo se puede eliminar una reserva sin completar.', 'ELIMINAR_PROHIBIDO');
        }
        hoja.deleteRow(i + 1);
        return true;
      }
    }
    return false;
  },

  /** Actualiza columnas de la fila con ese código. @returns {boolean} si la encontró */
  actualizar(codigo, campos) {
    const hoja = ConfigRepo.hoja(Constantes.HOJAS.OPERACIONES);
    const datos = hoja.getDataRange().getValues();
    const colCodigo = OperacionesRepo._col('codigo');
    for (let i = 1; i < datos.length; i++) {
      if (datos[i][colCodigo] === codigo) {
        Object.keys(campos).forEach((c) => {
          const col = OperacionesRepo._col(c);
          if (col >= 0) hoja.getRange(i + 1, col + 1).setValue(campos[c]);
        });
        return true;
      }
    }
    return false;
  },
};
