/**
 * Orquesta una operación. Regla: el código solo existe si el archivo quedó en Drive.
 *
 *  1. Sin código: se valida el PDF (lo que puede fallar por el documento).
 *  2. Con el lock tomado de principio a fin: reservar -> estampar -> guardar en Drive -> completar.
 *  3. Si algo falla en el paso 2: papelera del archivo creado y se DEVUELVE el número (sin salto).
 *     El intento queda en Auditoria sin código.
 *
 * Dependencias inyectables para pruebas. procesar nunca rechaza: deja el resultado en `estados`.
 */
var OperacionService = {
  deps() {
    const aSigno = (u8) => Array.from(u8, (b) => (b > 127 ? b - 256 : b));
    const hex = (bytes) =>
      Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes)
        .map((b) => ((b < 0 ? b + 256 : b) + 0x100).toString(16).slice(1))
        .join('');
    return {
      secuencia: SecuenciaService,
      secuenciaDeps: SecuenciaService.deps(),
      pdf: PdfService,
      drive: DriveService,
      auditoria: Auditoria,
      estados: EstadosOperacion,
      lock: () => LockService.getScriptLock(),
      aSigno,
      hash: (u8) => hex(aSigno(u8)),
      cfg: () => ({
        tamano: Number(ConfigRepo.obtener('SELLO_TAMANO', '14')),
        margenDer: Number(ConfigRepo.obtener('SELLO_MARGEN_DER', '36')),
        margenSup: Number(ConfigRepo.obtener('SELLO_MARGEN_SUP', '30')),
      }),
    };
  },

  /**
   * @param {string} opId identificador de seguimiento (no es el código)
   * @param {string} tipo RECEPCION | ENTREGA
   * @param {Uint8Array} bytes PDF original (sin signo)
   * @returns {Promise<{ok:boolean, codigo?:string, url?:string, mensaje?:string}>}
   */
  async procesar(opId, tipo, bytes, usuario, deps) {
    const d = deps || OperacionService.deps();
    d.estados.set(opId, { estado: 'PROCESANDO' });
    let resultado;
    try {
      await d.pdf.validar(bytes); // paso 1: sin código
      resultado = await OperacionService.transaccion_(tipo, bytes, usuario, d);
      d.estados.set(opId, { estado: 'OK', codigo: resultado.codigo, url: resultado.url });
      return { ok: true, codigo: resultado.codigo, url: resultado.url };
    } catch (e) {
      const mensaje =
        e && e.name === 'ErrorNegocio'
          ? e.message
          : 'No se pudo completar la operación. No se asignó ningún código. Intenta de nuevo o avisa a TI.';
      try {
        d.auditoria.registrar(usuario, 'INTENTO_FALLIDO', '', String(e && e.message).slice(0, 300));
      } catch (e2) {
        // la auditoría no debe ocultar el error original
      }
      d.estados.set(opId, { estado: 'ERROR', mensaje });
      return { ok: false, mensaje };
    }
  },

  /** Paso 2: todo dentro del lock para poder devolver el número si algo falla. */
  async transaccion_(tipo, bytes, usuario, d) {
    const lock = d.lock();
    lock.waitLock(30000);
    let reserva = null;
    let archivo = null;
    try {
      reserva = d.secuencia.reservarEnLock(tipo, usuario, d.secuenciaDeps);
      const estampado = await d.pdf.estampar(bytes, reserva.codigo, d.cfg());
      const nombre = Codigo.nombreArchivo(tipo, reserva.codigo);
      archivo = d.drive.guardar(tipo, nombre, d.aSigno(estampado));
      d.secuencia.completar(
        reserva.codigo,
        {
          archivo_id: archivo.id, archivo_url: archivo.url,
          hash_original: d.hash(bytes), hash_estampado: d.hash(estampado),
        },
        usuario,
        d.secuenciaDeps
      );
      return { codigo: reserva.codigo, url: archivo.url };
    } catch (e) {
      OperacionService.deshacer_(reserva, archivo, e, usuario, d);
      throw e;
    } finally {
      lock.releaseLock();
    }
  },

  /** Archivo a papelera y número devuelto; si no se puede devolver, queda ANULADA con motivo. */
  deshacer_(reserva, archivo, error, usuario, d) {
    let motivo = String(error && error.message).slice(0, 250);
    if (archivo) {
      try {
        d.drive.papelera(archivo.id);
      } catch (e2) {
        motivo += ' | No se pudo enviar a papelera ' + archivo.id;
      }
    }
    if (!reserva) return;
    try {
      const liberada = d.secuencia.liberarEnLock(reserva, motivo, usuario, d.secuenciaDeps);
      if (!liberada) d.secuencia.anular(reserva.codigo, motivo, usuario, d.secuenciaDeps);
    } catch (e3) {
      // queda RESERVADO y SecuenciaService.verificar lo reporta para revisión manual
    }
  },
};

if (typeof module !== 'undefined') module.exports = { OperacionService };
