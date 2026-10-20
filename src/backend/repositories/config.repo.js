/** Acceso a la hoja Config y al Spreadsheet. Única capa (junto a los demás repos) que usa SpreadsheetApp. */
var ConfigRepo = {
  spreadsheet() {
    const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!id) throw new ErrorSistema('Falta ejecutar setup().', 'SIN_SETUP');
    return SpreadsheetApp.openById(id);
  },

  hoja(nombre) {
    const hoja = ConfigRepo.spreadsheet().getSheetByName(nombre);
    if (!hoja) throw new ErrorSistema('Falta la hoja ' + nombre + '. Ejecuta setup().', 'SIN_HOJA');
    return hoja;
  },

  /** @returns {Object<string,string>} clave -> valor (con caché de 60 s) */
  todo() {
    const cache = CacheService.getScriptCache();
    const guardado = cache.get('config');
    if (guardado) return JSON.parse(guardado);
    const filas = ConfigRepo.hoja(Constantes.HOJAS.CONFIG).getDataRange().getValues().slice(1);
    const mapa = {};
    filas.forEach((f) => { if (f[0]) mapa[String(f[0])] = String(f[1]); });
    cache.put('config', JSON.stringify(mapa), 60);
    return mapa;
  },

  obtener(clave, porDefecto) {
    const v = ConfigRepo.todo()[clave];
    return v === undefined || v === '' ? porDefecto : v;
  },
};
