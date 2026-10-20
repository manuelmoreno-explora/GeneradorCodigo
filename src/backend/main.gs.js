/** Punto de entrada de la Web App. */
function doGet() {
  const plantilla = HtmlService.createTemplateFromFile('frontend/index');
  plantilla.usuario = Session.getActiveUser().getEmail();
  plantilla.maxMB = Number(ConfigRepo.obtener('TAMANO_MAX_MB', '10'));
  plantilla.puedeExcepciones = ExcepcionService.puede(plantilla.usuario);
  plantilla.correoHabilitado = ConfigRepo.obtener('CORREO_HABILITADO', 'NO') === 'SI';
  plantilla.ambiente = ConfigRepo.obtener('AMBIENTE', 'PRODUCCION');
  return plantilla
    .evaluate()
    .setTitle('Radicación de correspondencia TYC')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Incluye un fragmento HTML (usado desde las plantillas con <?!= include('ruta') ?>). */
function include(nombre) {
  return HtmlService.createHtmlOutputFromFile(nombre).getContent();
}
