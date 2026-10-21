/** Excepciones (RF-007, RN-008). Solo para correos en Config > EXCEPCIONES_AUTORIZADOS. */

function registrarExcepcion(datos) {
  try {
    const usuario = AuthService.usuario();
    const d = datos || {};
    const r = ExcepcionService.registrar(
      {
        codigo: String(d.codigo || '').trim(),
        correspondencia: String(d.correspondencia || ''),
        tipo: String(d.tipo || ''),
        descripcion: String(d.descripcion || ''),
        accion: String(d.accion || ''),
        autorizadoPor: String(d.autorizadoPor || ''),
        confirmado: d.confirmado === true,
      },
      usuario
    );
    return Object.assign({ ok: true }, r);
  } catch (e) {
    return errorParaCliente_(e);
  }
}

function listarExcepciones() {
  try {
    const filas = ExcepcionService.listar(AuthService.usuario());
    return { ok: true, filas: filas.slice(0, 200) };
  } catch (e) {
    return errorParaCliente_(e);
  }
}
