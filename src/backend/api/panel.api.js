/** Panel: resumen, validación de secuencia, exportación CSV y reservas atascadas. */

function anioActual_() {
  return Number(Utilities.formatDate(new Date(), 'America/Bogota', 'yyyy'));
}

function obtenerPanel() {
  try {
    const usuario = AuthService.usuario();
    const resumen = PanelService.resumen(anioActual_());
    const ultima = PropertiesService.getScriptProperties().getProperty('ULTIMA_VALIDACION');
    return {
      ok: true,
      resumen,
      ultimaValidacion: ultima ? JSON.parse(ultima) : null,
      puedeMantener: ExcepcionService.puede(usuario),
      atascadas: ExcepcionService.puede(usuario) ? MantenimientoService.atascadas() : [],
    };
  } catch (e) {
    return errorParaCliente_(e);
  }
}

/** Ejecuta la validación del año indicado (por defecto el actual) y la deja en auditoría. */
function validarSecuencia(anio) {
  try {
    const usuario = AuthService.usuario();
    const a = Number(anio) || anioActual_();
    const v = SecuenciaService.verificar(a);
    Auditoria.registrar(usuario, 'VALIDAR_SECUENCIA', '', PanelService.resumenValidacion(v));
    return { ok: true, validacion: v, texto: PanelService.resumenValidacion(v) };
  } catch (e) {
    return errorParaCliente_(e);
  }
}

function exportarRegistroCsv() {
  try {
    const usuario = AuthService.usuario();
    const cols = ['fecha', 'anio', 'consecutivo', 'codigo', 'tipo', 'estado', 'archivo_url', 'usuario', 'motivo_anulacion'];
    const ops = Busqueda.ordenar(OperacionesRepo.listarTodas()).reverse();
    Auditoria.registrar(usuario, 'EXPORTAR_CSV', '', ops.length + ' filas');
    return { ok: true, nombre: 'registro-radicados.csv', csv: Csv.generar(cols, ops) };
  } catch (e) {
    return errorParaCliente_(e);
  }
}

function resolverReservaAtascada(codigo, tipo) {
  try {
    const usuario = AuthService.usuario();
    return Object.assign({ ok: true }, MantenimientoService.resolver({ codigo: String(codigo || ''), tipo: String(tipo || '') }, usuario));
  } catch (e) {
    return errorParaCliente_(e);
  }
}
