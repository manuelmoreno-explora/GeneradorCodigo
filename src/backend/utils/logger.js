/** Trazabilidad (RNF-002): quién, cuándo y qué. Nunca registra contenido de los PDF. */
var Auditoria = {
  registrar(usuario, accion, codigo, detalle) {
    ConfigRepo.hoja(Constantes.HOJAS.AUDITORIA).appendRow([
      new Date(), usuario || '', accion, codigo || '', detalle || '',
    ]);
  },
};
