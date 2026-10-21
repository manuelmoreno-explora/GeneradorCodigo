/**
 * Funciones expuestas al cliente (google.script.run). Delgadas: validan, delegan y traducen errores.
 * google.script.run no espera promesas: iniciarOperacion reserva el código de forma síncrona,
 * lanza el proceso asíncrono y responde; el cliente consulta estadoOperacion hasta que termine.
 */

/** Convierte cualquier error en un objeto serializable y seguro para el cliente. */
function errorParaCliente_(e) {
  if (e instanceof ErrorNegocio) return { ok: false, mensaje: e.message, codigo: e.codigo };
  Logger.log('ERROR: ' + (e && e.stack ? e.stack : e));
  return { ok: false, mensaje: 'Ocurrió un error inesperado. Intenta de nuevo o avisa a TI.', codigo: 'SISTEMA' };
}

/**
 * Valida la entrada, lanza el proceso y responde con un opId de seguimiento. El código NO se asigna
 * aquí: solo existe si el archivo llega a Drive (ver OperacionService).
 * @param {{tipo:string, nombre:string, base64:string}} payload
 * @returns {{ok:boolean, opId?:string, mensaje?:string}}
 */
function iniciarOperacion(payload) {
  try {
    const usuario = AuthService.usuario();
    const bytes = new Uint8Array(Utilities.base64Decode(String((payload && payload.base64) || '')));
    Reglas.validarEntrada({
      tipo: payload && payload.tipo,
      nombre: payload && payload.nombre,
      bytes,
      maxMB: Number(ConfigRepo.obtener('TAMANO_MAX_MB', '10')),
    });
    const opId = Utilities.getUuid();
    EstadosOperacion.set(opId, { estado: 'PROCESANDO' });
    OperacionService.procesar(opId, payload.tipo, bytes, usuario).catch((e) =>
      Logger.log('Fallo no controlado en ' + opId + ': ' + e)
    );
    return { ok: true, opId };
  } catch (e) {
    return errorParaCliente_(e);
  }
}

/** @returns {{ok:boolean, estado?:string, codigo?:string, url?:string, mensaje?:string}} */
function estadoOperacion(opId) {
  try {
    const e = EstadosOperacion.get(String(opId || ''));
    if (!e) throw new ErrorNegocio('No se encontró el seguimiento de la operación (venció). Revisa el registro antes de reintentar.', 'SIN_SEGUIMIENTO');
    return Object.assign({ ok: true }, e);
  } catch (e) {
    return errorParaCliente_(e);
  }
}

/** Envía el ejemplar de entrega al correo que escribió el usuario (si CORREO_HABILITADO = SI). */
function enviarEjemplarPorCorreo(datos) {
  try {
    const usuario = AuthService.usuario();
    const d = datos || {};
    const r = CorreoService.enviar(String(d.codigo || ''), String(d.tipo || ''), String(d.destinatario || ''), usuario);
    return Object.assign({ ok: true }, r);
  } catch (e) {
    return errorParaCliente_(e);
  }
}

/** Devuelve el PDF archivado (mismo contenido del ejemplar de entrega) para imprimir o descargar. */
function obtenerEjemplar(codigo, tipo) {
  try {
    const p = Codigo.parsear(codigo);
    if (!p) throw new ErrorNegocio('Código inválido.', 'CODIGO_INVALIDO');
    const op = OperacionesRepo.listarPorAnio(p.anio).find((o) => o.codigo === codigo && o.tipo === tipo);
    if (!op || op.estado !== Constantes.ESTADOS.COMPLETADA) {
      throw new ErrorNegocio('La operación aún no está completada.', 'NO_COMPLETADA');
    }
    return {
      ok: true,
      nombre: Codigo.nombreArchivo(op.tipo, codigo) + '.pdf',
      base64: Utilities.base64Encode(DriveService.leer(op.archivo_id)),
    };
  } catch (e) {
    return errorParaCliente_(e);
  }
}
