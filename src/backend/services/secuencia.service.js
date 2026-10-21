/**
 * Asignación del consecutivo YY-NNN. Recepción y entrega llevan secuencias INDEPENDIENTES
 * (año + tipo). Todas las dependencias pueden inyectarse (pruebas con Jest); por defecto usan
 * los repositorios y servicios reales de Apps Script.
 *
 * Una "ref" identifica una operación: { codigo, tipo }.
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
   * Reserva el siguiente código del año para ese tipo (estado RESERVADO) de forma exclusiva.
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
    const { ultimo, base } = d.secuencias.obtener(anio, tipo);
    // el contador debe coincidir con el mayor consecutivo conocido (registro o base histórica)
    Reglas.validarContador(ultimo, Math.max(base, d.operaciones.maximo(anio, tipo)));

    const consecutivo = ultimo + 1;
    const codigo = Codigo.formatear(anio, consecutivo);
    d.operaciones.agregar({
      fecha: d.ahora(), anio, consecutivo, codigo, tipo,
      estado: Constantes.ESTADOS.RESERVADO, usuario,
    });
    d.secuencias.guardar(anio, tipo, consecutivo);
    d.auditoria.registrar(usuario, 'RESERVAR', codigo, tipo);
    return { codigo, anio, consecutivo, tipo };
  },

  /**
   * Devuelve el número de una reserva que NUNCA llegó a Drive, para que no quede un salto en la
   * secuencia. Solo es válido si sigue RESERVADO y es el último consecutivo del año para ese tipo;
   * el llamador debe tener el lock desde antes de reservar (nadie pudo tomar el siguiente).
   * @returns {boolean} true si se liberó; false si no era posible (queda para revisión manual)
   */
  liberarEnLock(reserva, motivo, usuario, deps) {
    const d = deps || SecuenciaService.deps();
    const op = d.operaciones
      .listarPorAnio(reserva.anio)
      .find((o) => o.codigo === reserva.codigo && o.tipo === reserva.tipo);
    const esUltima = d.operaciones.maximo(reserva.anio, reserva.tipo) === reserva.consecutivo;
    if (!op || op.estado !== Constantes.ESTADOS.RESERVADO || !esUltima) return false;
    d.operaciones.eliminar({ codigo: reserva.codigo, tipo: reserva.tipo });
    d.secuencias.guardar(reserva.anio, reserva.tipo, reserva.consecutivo - 1);
    d.auditoria.registrar(usuario, 'LIBERAR', reserva.codigo, reserva.tipo + ' | ' + motivo);
    return true;
  },

  /** Marca la operación como COMPLETADA con los datos del archivo. */
  completar(ref, datos, usuario, deps) {
    const d = deps || SecuenciaService.deps();
    const campos = Object.assign({ estado: Constantes.ESTADOS.COMPLETADA }, datos);
    if (!d.operaciones.actualizar({ codigo: ref.codigo, tipo: ref.tipo }, campos)) {
      throw new ErrorSistema('No existe la operación ' + ref.tipo + ' ' + ref.codigo, 'SIN_OPERACION');
    }
    d.auditoria.registrar(usuario, 'COMPLETAR', ref.codigo, ref.tipo);
  },

  /** El número queda consumido y registrado; nunca se reutiliza (RN-007). */
  anular(ref, motivo, usuario, deps) {
    const d = deps || SecuenciaService.deps();
    const ok = d.operaciones.actualizar(
      { codigo: ref.codigo, tipo: ref.tipo },
      { estado: Constantes.ESTADOS.ANULADA, motivo_anulacion: motivo }
    );
    if (!ok) throw new ErrorSistema('No existe la operación ' + ref.tipo + ' ' + ref.codigo, 'SIN_OPERACION');
    d.auditoria.registrar(usuario, 'ANULAR', ref.codigo, ref.tipo + ' | ' + motivo);
  },

  /**
   * Fija el consecutivo histórico (manual) de un tipo para el año actual: el próximo código será
   * base + 1. Solo se permite si el tipo aún no tiene operaciones en el registro este año.
   */
  establecerBase(tipo, base, usuario, deps) {
    const d = deps || SecuenciaService.deps();
    if (!Reglas.TIPOS.includes(tipo)) throw new ErrorNegocio('Tipo inválido: ' + tipo, 'TIPO_INVALIDO');
    if (!Number.isInteger(base) || base < 0) throw new ErrorNegocio('El consecutivo inicial debe ser un entero ≥ 0.', 'BASE_INVALIDA');
    const lock = d.lock();
    lock.waitLock(30000);
    try {
      const anio = d.anioActual();
      if (d.operaciones.maximo(anio, tipo) > 0) {
        throw new ErrorNegocio('Ya hay radicados de ' + tipo + ' en ' + anio + ' en el registro; no se puede cambiar la base.', 'BASE_BLOQUEADA');
      }
      d.secuencias.establecerBase(anio, tipo, base);
      d.auditoria.registrar(usuario, 'ESTABLECER_BASE', '', tipo + ' ' + anio + ' = ' + base);
    } finally {
      lock.releaseLock();
    }
  },

  /** Revisa UNA secuencia (año + tipo). */
  verificarTipo(anio, tipo, deps) {
    const d = deps || SecuenciaService.deps();
    const ops = d.operaciones.listarPorAnio(anio).filter((o) => o.tipo === tipo);
    const { ultimo: contador, base } = d.secuencias.obtener(anio, tipo);
    const analisis = Codigo.verificar(ops.map((o) => Number(o.consecutivo)), base);
    const reservadasSinCompletar = ops
      .filter((o) => o.estado === Constantes.ESTADOS.RESERVADO)
      .map((o) => o.codigo);
    const anuladas = ops.filter((o) => o.estado === Constantes.ESTADOS.ANULADA).map((o) => o.codigo);
    const ok =
      analisis.faltantes.length === 0 &&
      analisis.duplicados.length === 0 &&
      analisis.bajoBase.length === 0 &&
      contador === analisis.maximo;
    return {
      tipo, ok, base, total: ops.length, maximo: analisis.maximo, contador,
      faltantes: analisis.faltantes, duplicados: analisis.duplicados, bajoBase: analisis.bajoBase,
      reservadasSinCompletar, anuladas,
    };
  },

  /**
   * Revisa un año completo, las dos secuencias por separado.
   * @returns {{anio:number, ok:boolean, porTipo:Object<string,Object>}}
   */
  verificar(anio, deps) {
    const d = deps || SecuenciaService.deps();
    const porTipo = {};
    Reglas.TIPOS.forEach((t) => { porTipo[t] = SecuenciaService.verificarTipo(anio, t, d); });
    return { anio, ok: Reglas.TIPOS.every((t) => porTipo[t].ok), porTipo };
  },
};

if (typeof module !== 'undefined') module.exports = { SecuenciaService };
