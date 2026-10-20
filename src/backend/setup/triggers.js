/**
 * Validación programada de la secuencia. Ejecutar una vez desde el editor: instalarTriggerValidacion().
 * Corre cada día a las 7 a. m. (hora de Bogotá), deja el resultado en Auditoria y en la propiedad
 * ULTIMA_VALIDACION (se muestra en el Panel). No envía correos (requiere aprobación de TI).
 */
function instalarTriggerValidacion() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'validacionProgramada')
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('validacionProgramada').timeBased().everyDays(1).atHour(7).inTimezone('America/Bogota').create();
  Logger.log('Trigger diario instalado (7 a. m. America/Bogota).');
}

function validacionProgramada() {
  const anio = Number(Utilities.formatDate(new Date(), 'America/Bogota', 'yyyy'));
  const v = SecuenciaService.verificar(anio);
  const texto = PanelService.resumenValidacion(v);
  Auditoria.registrar('trigger', 'VALIDACION_PROGRAMADA', '', texto);
  PropertiesService.getScriptProperties().setProperty(
    'ULTIMA_VALIDACION',
    JSON.stringify({
      fecha: Utilities.formatDate(new Date(), 'America/Bogota', 'yyyy-MM-dd HH:mm'),
      ok: v.ok, texto,
    })
  );
}
