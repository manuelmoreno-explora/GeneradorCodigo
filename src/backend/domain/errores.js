/** Errores tipados: ErrorNegocio se muestra al usuario; ErrorSistema se registra y se muestra genérico. */
class ErrorNegocio extends Error {
  constructor(mensaje, codigo) {
    super(mensaje);
    this.name = 'ErrorNegocio';
    this.codigo = codigo || 'NEGOCIO';
  }
}

class ErrorSistema extends Error {
  constructor(mensaje, codigo) {
    super(mensaje);
    this.name = 'ErrorSistema';
    this.codigo = codigo || 'SISTEMA';
  }
}

if (typeof module !== 'undefined') module.exports = { ErrorNegocio, ErrorSistema };
