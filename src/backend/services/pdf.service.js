/** Estampado del código en el PDF con pdf-lib (cargado como src/libs/pdf-lib.min.js -> global PDFLib). */
var PdfService = {
  /** Comprueba que el PDF se pueda leer y tenga páginas, sin modificarlo. */
  async validar(bytes) {
    try {
      const doc = await PDFLib.PDFDocument.load(bytes);
      if (doc.getPageCount() === 0) throw new Error('vacío');
    } catch (e) {
      throw new ErrorNegocio('El PDF está dañado, protegido con contraseña, vacío o no se puede leer.', 'PDF_ILEGIBLE');
    }
  },

  /**
   * @param {Uint8Array} bytes PDF original (sin signo)
   * @param {string} texto código, p. ej. "26-001"
   * @param {{tamano:number, margenDer:number, margenSup:number}} cfg
   * @returns {Promise<Uint8Array>} PDF estampado
   */
  async estampar(bytes, texto, cfg) {
    const { PDFDocument, StandardFonts, rgb, degrees } = PDFLib;
    let doc;
    let paginas;
    try {
      doc = await PDFDocument.load(bytes);
      paginas = doc.getPageCount(); // un PDF roto puede cargar y fallar recién aquí
    } catch (e) {
      throw new ErrorNegocio('El PDF está dañado, protegido con contraseña o no se puede leer.', 'PDF_ILEGIBLE');
    }
    if (paginas === 0) {
      throw new ErrorNegocio('El PDF no tiene páginas.', 'PDF_VACIO');
    }
    const fuente = await doc.embedFont(StandardFonts.HelveticaBold);
    const pagina = doc.getPage(0);
    const ancho = fuente.widthOfTextAtSize(texto, cfg.tamano);
    const pos = Sello.posicion(
      pagina.getCropBox(), pagina.getRotation().angle, ancho, cfg.tamano, cfg.margenDer, cfg.margenSup
    );
    pagina.drawText(texto, {
      x: pos.x, y: pos.y, size: cfg.tamano, font: fuente, color: rgb(0, 0, 0), rotate: degrees(pos.rotar),
    });
    // objectsPerTick infinito: evita setTimeout, que no existe en Apps Script.
    return doc.save({ objectsPerTick: Infinity });
  },
};

if (typeof module !== 'undefined') module.exports = { PdfService };
