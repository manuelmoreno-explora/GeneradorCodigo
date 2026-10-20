/** Guardado en Drive: un único PDF por radicado, en la subcarpeta TYC según el tipo. */
var DriveService = {
  carpeta(tipo) {
    const raiz = DriveApp.getFolderById(ConfigRepo.obtener('DRIVE_RAIZ_ID', ''));
    const nombre = Constantes.CARPETAS[tipo];
    const it = raiz.getFoldersByName(nombre);
    if (!it.hasNext()) throw new ErrorSistema('No existe la carpeta "' + nombre + '".', 'SIN_CARPETA');
    return it.next();
  },

  /**
   * Crea el archivo; si ya existe uno con ese nombre lanza error (nunca sobrescribe).
   * @param {number[]} bytesConSigno bytes en formato de Apps Script (−128..127)
   * @returns {{id:string, url:string}}
   */
  guardar(tipo, nombre, bytesConSigno) {
    const carpeta = DriveService.carpeta(tipo);
    if (carpeta.getFilesByName(nombre + '.pdf').hasNext()) {
      throw new ErrorSistema('Ya existe un archivo llamado ' + nombre + '.pdf', 'ARCHIVO_EXISTE');
    }
    const blob = Utilities.newBlob(bytesConSigno, 'application/pdf', nombre + '.pdf');
    const archivo = carpeta.createFile(blob);
    return { id: archivo.getId(), url: archivo.getUrl() };
  },

  /** @returns {{id:string, url:string}|null} archivo con ese nombre en la carpeta del tipo */
  buscar(tipo, nombre) {
    const it = DriveService.carpeta(tipo).getFilesByName(nombre + '.pdf');
    if (!it.hasNext()) return null;
    const a = it.next();
    return { id: a.getId(), url: a.getUrl() };
  },

  papelera(id) {
    DriveApp.getFileById(id).setTrashed(true);
  },

  /** @returns {number[]} bytes con signo del archivo */
  leer(id) {
    return DriveApp.getFileById(id).getBlob().getBytes();
  },
};
