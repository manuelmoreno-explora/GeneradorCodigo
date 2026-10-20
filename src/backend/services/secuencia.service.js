/**
 * Asignación del consecutivo YY-NNN. Todas las dependencias pueden inyectarse (pruebas con Jest);
 * por defecto usan los repositorios y servicios reales de Apps Script.
 */
var SecuenciaService = {
  deps() {
    return {
      secuencias: SecuenciasRepo,
      operaciones: OperacionesRepo,
      auditoria: Auditoria,
      lock: () => LockService.getScriptLock(),
      anioActual: () => Number(Utilities.formatDate(new Date(), 'America/Bogota', 'yyyy')),
      ahora: () => new Date(),
    };
  },

  /**
   * Reserva el siguiente código del año (estado RESERVADO) de forma exclusiva.
   * Toma y suelta el lock por sí sola. Para una transacción larga (reservar + guardar + completar
   * sin que nadie más asigne), tomar el lock afuera y usar reservarEnLock.
   * @returns {{codigo:string, anio:number, consecutivo:number, tipo:string}}
   */
  reservar(tipo, usuario, deps) {
    const d = deps || SecuenciaService.deps();
    const lock = d.lock();
    lock.waitLock(30000);
    try {
      return SecuenciaService.reservarEnLock(tipo, usuario, d);
    } finally {
      lock.releaseLock();
    }
  },

  /** Igual que reservar, pero el llamador ya tiene el lock. */
  reservarEnLock(tipo, usuario, deps) {
    const d = deps || SecuenciaService.deps();
    const anio = d.anioActual();
    const ultimo = d.secuencias.obtener(anio);
    Reglas.validarContador(ultimo, d.operaciones.maximo(anio));

    const consecutivo = ultimo + 1;
    const codigo = Codigo.formatear(anio, consecutivo);
    d.operaciones.agregar({
      fecha: d.ahora(), anio, consecutivo, codigo, tipo,
      estado: Constantes.ESTADOS.RESERVADO, usuario,
    });
    d.secuencias.guardar(anio, consecutivo);
    d.auditoria.registrar(usuario, 'RESERVAR', codigo, tipo);
    return { codigo, anio, consecutivo, tipo };
  },

  /**
   * Devuelve el número de una reserva que NUNCA llegó a Drive, para que no quede un salto en la
   * secuencia. Solo es válido si sigue RESERVADO y es el último consecutivo del año; el llamador
   * debe tener el lock desde antes de reservar (nadie pudo tomar el número siguiente).
   * @returns {boolean} true si se liberó; false si no era posible (queda para revisión manual)
   */
  liberarEnLock(reserva, motivo, usuario, deps) {
    const d = deps || SecuenciaService.deps();
    const ops = d.operaciones.listarPorAnio(reserva.anio);
    const op = ops.find((o) => o.codigo === reserva.codigo);
    const esUltima = d.operaciones.maximo(reserva.anio) === reserva.consecutivo;
    if (!op || op.estado !== Constantes.ESTADOS.RESERVADO || !esUltima) return false;
    d.operaciones.eliminar(reserva.codigo);
    d.secuencias.guardar(reserva.anio, reserva.consecutivo - 1);
    d.auditoria.registrar(usuario, 'LIBERAR', reserva.codigo, motivo);
    return true;
  },

  /** Marca la operación como COMPLETADA con los datos del archivo. */
  completar(codigo, datos, usuario, deps) {
    const d = deps || SecuenciaService.deps();
    const campos = Object.assign({ estado: Constantes.ESTADOS.COMPLETADA }, datos);
    if (!d.operaciones.actualizar(codigo, campos)) {
      throw new ErrorSistema('No existe la operación ' + codigo, 'SIN_OPERACION');
    }
    d.auditoria.registrar(usuario, 'COMPLETAR', codigo, '');
  },

  /** El número queda consumido y registrado; nunca se reutiliza (RN-007). */
  anular(codigo, motivo, usuario, deps) {
    const d = deps || SecuenciaService.deps();
    const ok = d.operaciones.actualizar(codigo, {
      estado: Constantes.ESTADOS.ANULADA,
      motivo_anulacion: motivo,
    });
    if (!ok) throw new ErrorSistema('No existe la operación ' + codigo, 'SIN_OPERACION');
    d.auditoria.registrar(usuario, 'ANULAR', codigo, motivo);
  },

  /**
   * Revisa un año completo: huecos, duplicados, estados pendientes y coherencia con el contador.
   * @returns {{anio:number, ok:boolean, total:number, maximo:number, faltantes:number[],
   *   duplicados:number[], reservadasSinCompletar:string[], anuladas:string[], contador:number}}
   */
  verificar(anio, deps) {
    const d = deps || SecuenciaService.deps();
    const ops = d.operaciones.listarPorAnio(anio);
    const analisis = Codigo.verificar(ops.map((o) => Number(o.consecutivo)));
    const contador = d.secuencias.obtener(anio);
    const reservadasSinCompletar = ops
      .filter((o) => o.estado === Constantes.ESTADOS.RESERVADO)
      .map((o) => o.codigo);
    const anuladas = ops.filter((o) => o.estado === Constantes.ESTADOS.ANULADA).map((o) => o.codigo);
    const ok =
      analisis.faltantes.length === 0 &&
      analisis.duplicados.length === 0 &&
      contador === analisis.maximo;
    return {
      anio, ok, total: ops.length, maximo: analisis.maximo,
      faltantes: analisis.faltantes, duplicados: analisis.duplicados,
      reservadasSinCompletar, anuladas, contador,
    };
  },
};

if (typeof module !== 'undefined') module.exports = { SecuenciaService };
