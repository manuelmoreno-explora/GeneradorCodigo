/**
 * Reservas atascadas: filas RESERVADO que no avanzaron (p. ej. Apps Script cortó la ejecución).
 * Se resuelven bajo lock: si el archivo ya está en Drive se completa el registro; si no, se
 * devuelve el número (si es el último) o se anula con motivo.
 */
var MantenimientoService = {
  MINUTOS_ATASCO: 10,

  deps() {
    return {
      operaciones: OperacionesRepo,
      secuencias: SecuenciasRepo,
      secuencia: SecuenciaService,
      secuenciaDeps: SecuenciaService.deps(),
      drive: DriveService,
      auditoria: Auditoria,
      lock: () => LockService.getScriptLock(),
      anioActual: () => Number(Utilities.formatDate(new Date(), 'America/Bogota', 'yyyy')),
      ahora: () => new Date(),
      autorizados: () => ConfigRepo.obtener('EXCEPCIONES_AUTORIZADOS', ''),
    };
  },

  /** @returns {Object[]} reservas con más de MINUTOS_ATASCO minutos sin completarse */
  atascadas(deps) {
    const d = deps || MantenimientoService.deps();
    const limite = d.ahora().getTime() - MantenimientoService.MINUTOS_ATASCO * 60000;
    return d.operaciones
      .listarPorAnio(d.anioActual())
      .filter((o) => o.estado === Constantes.ESTADOS.RESERVADO && new Date(o.fecha).getTime() < limite)
      .map((o) => ({ codigo: o.codigo, tipo: o.tipo, usuario: o.usuario }));
  },

  /** @returns {{resultado:string, mensaje:string}} */
  resolver(codigo, usuario, deps) {
    const d = deps || MantenimientoService.deps();
    if (!Reglas.autorizado(usuario, d.autorizados())) {
      throw new ErrorNegocio('No tienes autorización para resolver reservas.', 'NO_AUTORIZADO');
    }
    const lock = d.lock();
    lock.waitLock(30000);
    try {
      const atasco = d.atascadas ? d.atascadas() : MantenimientoService.atascadas(d);
      const reserva = atasco.find((r) => r.codigo === codigo);
      if (!reserva) throw new ErrorNegocio('Ese código no figura como reserva atascada.', 'NO_ATASCADA');
      const p = Codigo.parsear(codigo);
      const archivo = d.drive.buscar(reserva.tipo, Codigo.nombreArchivo(reserva.tipo, codigo));

      if (archivo) {
        d.secuencia.completar(codigo, { archivo_id: archivo.id, archivo_url: archivo.url }, usuario, d.secuenciaDeps);
        d.auditoria.registrar(usuario, 'RECUPERAR', codigo, 'Archivo encontrado en Drive; registro completado');
        return { resultado: 'COMPLETADA', mensaje: 'El archivo ya estaba en Drive; el registro quedó completado.' };
      }
      const liberada = d.secuencia.liberarEnLock(
        { codigo, anio: p.anio, consecutivo: p.consecutivo }, 'Reserva atascada sin archivo', usuario, d.secuenciaDeps
      );
      if (liberada) return { resultado: 'LIBERADA', mensaje: 'No había archivo; el número se devolvió a la secuencia.' };
      d.secuencia.anular(codigo, 'Reserva atascada sin archivo', usuario, d.secuenciaDeps);
      return { resultado: 'ANULADA', mensaje: 'No había archivo y ya existen códigos posteriores; el código quedó anulado y registrado.' };
    } finally {
      lock.releaseLock();
    }
  },
};

if (typeof module !== 'undefined') module.exports = { MantenimientoService };
