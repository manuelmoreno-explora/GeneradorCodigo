/**
 * Preparación inicial (idempotente). Ejecutar manualmente desde el editor: setup().
 * Crea el Spreadsheet "BD Consecutivos" dentro de la raíz de Drive, las hojas, la semilla del
 * contador y la hoja Config. Guarda el ID del Spreadsheet en las propiedades del script.
 */
function setup() {
  const props = PropertiesService.getScriptProperties();
  // Carpeta raíz: Config (si el Sheet ya existe) > propiedad DRIVE_RAIZ_ID_INICIAL > carpeta de pruebas.
  let raizId = props.getProperty('DRIVE_RAIZ_ID_INICIAL') || Constantes.CONFIG_INICIAL[1][1];

  let ssId = props.getProperty('SPREADSHEET_ID');
  let ss;
  if (ssId) {
    ss = SpreadsheetApp.openById(ssId);
    const hojaCfg = ss.getSheetByName(Constantes.HOJAS.CONFIG);
    if (hojaCfg) {
      const fila = hojaCfg.getDataRange().getValues().find((f) => f[0] === 'DRIVE_RAIZ_ID');
      if (fila && fila[1]) raizId = String(fila[1]);
    }
  } else {
    ss = SpreadsheetApp.create('BD Consecutivos');
    DriveApp.getFileById(ss.getId()).moveTo(DriveApp.getFolderById(raizId));
    props.setProperty('SPREADSHEET_ID', ss.getId());
  }
  const raiz = DriveApp.getFolderById(raizId);

  Object.keys(Constantes.ENCABEZADOS).forEach((nombre) => {
    let hoja = ss.getSheetByName(nombre);
    if (!hoja) hoja = ss.insertSheet(nombre);
    const enc = Constantes.ENCABEZADOS[nombre];
    if (hoja.getLastRow() === 0) {
      hoja.getRange(1, 1, 1, enc.length).setValues([enc]).setFontWeight('bold');
      hoja.setFrozenRows(1);
    }
  });
  const sobrante = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (sobrante && ss.getSheets().length > 1) ss.deleteSheet(sobrante);

  // Config: agrega las claves que falten sin tocar las existentes (re-ejecutar setup es seguro).
  const config = ss.getSheetByName(Constantes.HOJAS.CONFIG);
  const existentes = config.getDataRange().getValues().slice(1).map((f) => String(f[0]));
  Constantes.CONFIG_INICIAL.filter((f) => !existentes.includes(f[0])).forEach((f) => {
    const fila = f.slice();
    if (fila[0] === 'EXCEPCIONES_AUTORIZADOS' && !fila[1]) fila[1] = Session.getActiveUser().getEmail();
    if (fila[0] === 'DRIVE_RAIZ_ID') fila[1] = raizId;
    config.appendRow(fila);
  });

  const secuencias = ss.getSheetByName(Constantes.HOJAS.SECUENCIAS);
  if (secuencias.getLastRow() === 1) {
    secuencias.appendRow([new Date().getFullYear(), 0]); // semilla 000: nunca se asigna
  }

  const carpetas = resolverCarpetas_(raiz, config);
  Logger.log('Spreadsheet: ' + ss.getUrl());
  Logger.log('Carpetas: ' + JSON.stringify(carpetas));
  return { spreadsheetUrl: ss.getUrl(), carpetas };
}

/** Busca las subcarpetas TYC por nombre. Solo en ambiente PRUEBAS las crea si faltan. */
function resolverCarpetas_(raiz, hojaConfig) {
  const ambiente = String(hojaConfig.getRange('B2').getValue());
  const resultado = {};
  Object.keys(Constantes.CARPETAS).forEach((tipo) => {
    const nombre = Constantes.CARPETAS[tipo];
    const it = raiz.getFoldersByName(nombre);
    if (it.hasNext()) {
      resultado[tipo] = it.next().getId();
    } else if (ambiente === 'PRUEBAS') {
      resultado[tipo] = raiz.createFolder(nombre).getId();
    } else {
      throw new Error('No existe la carpeta "' + nombre + '" en la raíz de Drive (ambiente ' + ambiente + ').');
    }
  });
  return resultado;
}

/**
 * Spike de Fase 0: comprueba que pdf-lib funciona en el runtime V8 de Apps Script.
 * Crea un PDF, estampa "26-001" arriba a la derecha y lo guarda en la raíz de pruebas.
 */
function pruebaPdfLib() {
  return (function () {
    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    // pdf-lib es asíncrono; Apps Script V8 resuelve promesas pendientes al terminar la ejecución,
    // por eso se usa una variable y se valida con Logger.
    let bytesFinales = null;
    PDFDocument.create()
      .then(async (doc) => {
        const pagina = doc.addPage([595, 842]);
        const fuente = await doc.embedFont(StandardFonts.HelveticaBold);
        const texto = '26-001';
        const { width, height } = pagina.getSize();
        const tam = 14;
        pagina.drawText(texto, {
          x: width - 36 - fuente.widthOfTextAtSize(texto, tam),
          y: height - 30 - tam,
          size: tam,
          font: fuente,
          color: rgb(0, 0, 0),
        });
        bytesFinales = await doc.save();
      })
      .then(() => {
        const blob = Utilities.newBlob(Array.from(bytesFinales), 'application/pdf', 'prueba-pdf-lib.pdf');
        const raiz = DriveApp.getFolderById(ConfigRepo.obtener('DRIVE_RAIZ_ID', Constantes.CONFIG_INICIAL[1][1]));
        const archivo = raiz.createFile(blob);
        Logger.log('PDF de prueba creado: ' + archivo.getUrl());
      })
      .catch((e) => Logger.log('ERROR pdf-lib: ' + e));
    return 'Revisa el registro de ejecución.';
  })();
}

/** Prueba de Fase 1 con el Sheet real: reserva un código, lo anula y verifica el año. */
function pruebaSecuencia() {
  const usuario = Session.getActiveUser().getEmail();
  const r = SecuenciaService.reservar(Constantes.TIPOS.RECEPCION, usuario);
  SecuenciaService.anular(r.codigo, 'PRUEBA', usuario);
  Logger.log('Reservado y anulado: ' + r.codigo);
  Logger.log(JSON.stringify(SecuenciaService.verificar(r.anio)));
}

/** Solo en ambiente PRUEBAS: borra operaciones, auditoría y reinicia el contador. */
function limpiarDatosDePrueba() {
  if (ConfigRepo.obtener('AMBIENTE', '') !== 'PRUEBAS') {
    throw new Error('Solo se permite en ambiente PRUEBAS.');
  }
  [Constantes.HOJAS.OPERACIONES, Constantes.HOJAS.AUDITORIA].forEach((n) => {
    const h = ConfigRepo.hoja(n);
    if (h.getLastRow() > 1) h.deleteRows(2, h.getLastRow() - 1);
  });
  const s = ConfigRepo.hoja(Constantes.HOJAS.SECUENCIAS);
  if (s.getLastRow() > 1) s.deleteRows(2, s.getLastRow() - 1);
  s.appendRow([Number(Utilities.formatDate(new Date(), 'America/Bogota', 'yyyy')), 0]);
  Logger.log('Datos de prueba reiniciados.');
}

/**
 * Prueba de Fase 2 (flujo completo): genera un PDF de 2 páginas y llama a iniciarOperacion igual que
 * lo hará el formulario. El proceso termina después de responder; luego ejecuta verificarSecuenciaManual.
 */
function pruebaOperacion() {
  PDFLib.PDFDocument.create()
    .then(async (doc) => {
      doc.addPage([595, 842]);
      doc.addPage([595, 842]);
      return doc.save({ objectsPerTick: Infinity });
    })
    .then((bytes) => {
      const conSigno = Array.from(bytes, (b) => (b > 127 ? b - 256 : b));
      const r = iniciarOperacion({
        tipo: Constantes.TIPOS.RECEPCION,
        nombre: 'prueba.pdf',
        base64: Utilities.base64Encode(conSigno),
      });
      Logger.log('iniciarOperacion -> ' + JSON.stringify(r));
    })
    .catch((e) => Logger.log('ERROR pruebaOperacion: ' + e));
}

/** Muestra el estado del año y las últimas operaciones registradas. */
function verificarSecuenciaManual() {
  const anio = Number(Utilities.formatDate(new Date(), 'America/Bogota', 'yyyy'));
  Logger.log(JSON.stringify(SecuenciaService.verificar(anio)));
  OperacionesRepo.listarPorAnio(anio)
    .slice(-5)
    .forEach((o) => Logger.log(o.codigo + ' | ' + o.estado + ' | ' + o.archivo_url + ' | ' + o.motivo_anulacion));
}
