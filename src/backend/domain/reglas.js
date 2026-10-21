/** Reglas de negocio puras (RN-001..RN-007). Sin dependencias de servicios de Google. */
var Reglas = {
  TIPOS: ['RECEPCION', 'ENTREGA'],

  /**
   * Valida los datos básicos de una operación antes de consumir un consecutivo (RN-006).
   * @param {{tipo:string, nombre:string, bytes:number[]|Uint8Array, maxMB:number}} d
   * @throws {ErrorNegocio}
   */
  validarEntrada(d) {
    if (!d || !Reglas.TIPOS.includes(d.tipo)) {
      throw new ErrorNegocio('Selecciona el tipo de operación: recepción o entrega.', 'TIPO_INVALIDO');
    }
    if (!d.bytes || d.bytes.length === 0) {
      throw new ErrorNegocio('Adjunta el documento PDF.', 'SIN_ARCHIVO');
    }
    if (d.bytes.length > d.maxMB * 1024 * 1024) {
      throw new ErrorNegocio('El archivo supera el tamaño máximo de ' + d.maxMB + ' MB.', 'ARCHIVO_GRANDE');
    }
    const cabecera = String.fromCharCode.apply(null, Array.prototype.slice.call(d.bytes, 0, 5));
    if (cabecera !== '%PDF-') {
      throw new ErrorNegocio('El archivo no es un PDF válido.', 'NO_PDF');
    }
  },

  /** ¿El correo está en la lista de autorizados (separada por comas o punto y coma)? */
  autorizado(email, listaTexto) {
    const e = String(email || '').trim().toLowerCase();
    if (!e) return false;
    return String(listaTexto || '')
      .split(/[,;\s]+/)
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean)
      .includes(e);
  },

  /**
   * Valida y normaliza un único correo destinatario. Rechaza listas, espacios y saltos de línea
   * (evita inyección de cabeceras y envíos masivos). `dominios`: texto con dominios permitidos
   * separados por coma/espacio; vacío = cualquiera.
   * @returns {string} correo en minúsculas
   * @throws {ErrorNegocio}
   */
  validarCorreo(texto, dominios) {
    const correo = String(texto || '').trim().toLowerCase();
    if (!correo || correo.length > 254 || !/^[^\s@,;<>"'()\[\]\\]+@[^\s@,;<>"'()\[\]\\]+\.[^\s@,;<>"'()\[\]\\]+$/.test(correo)) {
      throw new ErrorNegocio('Escribe un único correo válido, por ejemplo nombre@empresa.com.', 'CORREO_INVALIDO');
    }
    const permitidos = String(dominios || '').split(/[,;\s]+/).map((d) => d.trim().toLowerCase().replace(/^@/, '')).filter(Boolean);
    if (permitidos.length && !permitidos.includes(correo.split('@')[1])) {
      throw new ErrorNegocio('Ese dominio no está permitido para el envío. Dominios permitidos: ' + permitidos.join(', ') + '.', 'DOMINIO_NO_PERMITIDO');
    }
    return correo;
  },

  /**
   * Valida los datos de una excepción (RF-007, RN-008).
   * @throws {ErrorNegocio}
   */
  validarExcepcion(d) {
    const falta = (txt, min) => !txt || String(txt).trim().length < min;
    if (!Codigo.parsear(d.codigo)) throw new ErrorNegocio('Escribe un código válido, por ejemplo 26-001.', 'CODIGO_INVALIDO');
    if (!Reglas.TIPOS.includes(d.correspondencia)) throw new ErrorNegocio('Indica si la correspondencia es recibida o enviada.', 'SIN_CORRESPONDENCIA');
    if (!['REGISTRO', 'ANULACION'].includes(d.tipo)) throw new ErrorNegocio('Elige el tipo de excepción.', 'TIPO_EXCEPCION');
    if (falta(d.descripcion, 10)) throw new ErrorNegocio('Describe la inconsistencia (mínimo 10 caracteres).', 'SIN_DESCRIPCION');
    if (falta(d.accion, 5)) throw new ErrorNegocio('Describe la acción correctiva.', 'SIN_ACCION');
    if (falta(d.autorizadoPor, 3)) throw new ErrorNegocio('Indica quién autoriza la excepción.', 'SIN_AUTORIZACION');
    if (d.tipo === 'ANULACION' && d.confirmado !== true) {
      throw new ErrorNegocio('Confirma que entiendes que el código anulado no se reutiliza.', 'SIN_CONFIRMACION');
    }
  },

  /**
   * El contador guardado debe coincidir con el mayor consecutivo registrado; si no, se bloquea
   * la asignación para no repetir ni saltar códigos (RN-003, RN-007).
   * @throws {ErrorSistema}
   */
  validarContador(ultimoGuardado, maximoRegistrado) {
    if (ultimoGuardado !== maximoRegistrado) {
      throw new ErrorSistema(
        'Inconsistencia en la secuencia: el contador (' + ultimoGuardado +
          ') no coincide con el mayor consecutivo registrado (' + maximoRegistrado +
          '). Asignación bloqueada hasta que Gestión Documental la revise.',
        'SECUENCIA_INCONSISTENTE'
      );
    }
  },
};

if (typeof module !== 'undefined') module.exports = { Reglas };
