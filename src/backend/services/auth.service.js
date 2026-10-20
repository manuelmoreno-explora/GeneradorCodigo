/**
 * Identidad del usuario. Con executeAs USER_ACCESSING el correo siempre está disponible.
 * Roles (jefe de área para excepciones) quedan pendientes de definir con Gestión Documental/TI.
 */
var AuthService = {
  usuario() {
    const email = Session.getActiveUser().getEmail();
    if (!email) throw new ErrorNegocio('No se pudo identificar tu usuario. Inicia sesión con tu cuenta corporativa.', 'SIN_USUARIO');
    return email;
  },
};
