/**
 * Envío del ejemplar de entrega por correo. El usuario escribe el destinatario; se envía desde su
 * cuenta (USER_ACCESSING) con MailApp (permiso script.send_mail: solo enviar, no leer el buzón).
 * El PDF se lee de Drive y viaja solo como adjunto; no se guarda copia. En Auditoria queda quién,
 * cuándo, qué código y a qué dirección (nunca el contenido).
 */
var CorreoService = {
  deps() {
    return {
      operaciones: OperacionesRepo,
      drive: DriveService,
      auditoria: Auditoria,
      cfg: (clave, porDefecto) => ConfigRepo.obtener(clave, porDefecto),
      cuota: () => MailApp.getRemainingDailyQuota(),
      adjunto: (bytesConSigno, nombre) => Utilities.newBlob(bytesConSigno, 'application/pdf', nombre),
      enviar: (opciones) => MailApp.sendEmail(opciones),
    };
  },

  /** @returns {{destinatario:string}} */
  enviar(codigo, tipo, destinatario, usuario, deps) {
    const d = deps || CorreoService.deps();
    if (d.cfg('CORREO_HABILITADO', 'NO') !== 'SI') {
      throw new ErrorNegocio('El envío por correo no está habilitado.', 'CORREO_DESHABILITADO');
    }
    const para = Reglas.validarCorreo(destinatario, d.cfg('CORREO_DOMINIOS_PERMITIDOS', ''));
    const p = Codigo.parsear(codigo);
    if (!p) throw new ErrorNegocio('Código inválido.', 'CODIGO_INVALIDO');
    const op = d.operaciones.listarPorAnio(p.anio).find((o) => o.codigo === codigo && o.tipo === tipo);
    if (!op || op.estado !== Constantes.ESTADOS.COMPLETADA) {
      throw new ErrorNegocio('Solo se puede enviar un radicado completado.', 'NO_COMPLETADA');
    }
    if (d.cuota() < 1) {
      throw new ErrorNegocio('Se alcanzó el límite diario de correos. Imprime o descarga el documento.', 'SIN_CUOTA');
    }

    const nombre = Codigo.nombreArchivo(op.tipo, codigo) + '.pdf';
    d.enviar({
      to: para,
      subject: 'Correspondencia ' + codigo + ' - Parque Explora',
      body:
        'Adjunto el documento radicado con el código ' + codigo + '.\n\n' +
        'Enviado por ' + usuario + ' (Gestión Documental) desde la herramienta de radicación.\n' +
        'Si lo recibiste por error, avisa al remitente y elimina el mensaje.',
      name: 'Gestión Documental - Parque Explora',
      replyTo: usuario,
      attachments: [d.adjunto(d.drive.leer(op.archivo_id), nombre)],
    });
    d.auditoria.registrar(usuario, 'ENVIO_CORREO', codigo, tipo + ' | ' + para);
    return { destinatario: para };
  },
};

if (typeof module !== 'undefined') module.exports = { CorreoService };
