/**
 * Excepciones (RF-007, RN-008): quedan registradas con fecha, código, descripción, acción correctiva,
 * responsable y autorización. Una ANULACION marca como ANULADA un radicado ya archivado; el número
 * queda consumido y nunca se reutiliza.
 */
var ExcepcionService = {
  deps() {
    return {
      operaciones: OperacionesRepo,
      excepciones: ExcepcionesRepo,
      auditoria: Auditoria,
      lock: () => LockService.getScriptLock(),
      autorizados: () => ConfigRepo.obtener('EXCEPCIONES_AUTORIZADOS', ''),
      ahora: () => new Date(),
    };
  },

  puede(usuario, deps) {
    const d = deps || ExcepcionService.deps();
    return Reglas.autorizado(usuario, d.autorizados());
  },

  exigirAutorizado_(usuario, d) {
    if (!Reglas.autorizado(usuario, d.autorizados())) {
      throw new ErrorNegocio('No tienes autorización para registrar excepciones. Solicítala a Gestión Documental.', 'NO_AUTORIZADO');
    }
  },

  /** @param {{codigo:string,tipo:string,descripcion:string,accion:string,autorizadoPor:string,confirmado?:boolean}} datos */
  registrar(datos, usuario, deps) {
    const d = deps || ExcepcionService.deps();
    ExcepcionService.exigirAutorizado_(usuario, d);
    Reglas.validarExcepcion(datos);

    const lock = d.lock();
    lock.waitLock(30000);
    try {
      const p = Codigo.parsear(datos.codigo);
      const op = d.operaciones.listarPorAnio(p.anio).find((o) => o.codigo === datos.codigo);
      if (!op) throw new ErrorNegocio('No existe el código ' + datos.codigo + ' en el registro.', 'SIN_OPERACION');

      if (datos.tipo === 'ANULACION') {
        if (op.estado !== Constantes.ESTADOS.COMPLETADA) {
          throw new ErrorNegocio('Solo se puede anular un radicado completado. Estado actual: ' + op.estado + '.', 'ESTADO_INVALIDO');
        }
        d.operaciones.actualizar(datos.codigo, {
          estado: Constantes.ESTADOS.ANULADA,
          motivo_anulacion: String(datos.descripcion).trim().slice(0, 300),
        });
      }
      d.excepciones.agregar({
        fecha: d.ahora(), codigo: datos.codigo,
        descripcion: (datos.tipo === 'ANULACION' ? '[ANULACIÓN] ' : '') + String(datos.descripcion).trim(),
        accion_correctiva: String(datos.accion).trim(),
        responsable: usuario, autorizado_por: String(datos.autorizadoPor).trim(),
      });
      d.auditoria.registrar(usuario, 'EXCEPCION_' + datos.tipo, datos.codigo, String(datos.autorizadoPor).trim());
      return { codigo: datos.codigo, tipo: datos.tipo };
    } finally {
      lock.releaseLock();
    }
  },

  listar(usuario, deps) {
    const d = deps || ExcepcionService.deps();
    ExcepcionService.exigirAutorizado_(usuario, d);
    return d.excepciones.listar();
  },
};

if (typeof module !== 'undefined') module.exports = { ExcepcionService };
