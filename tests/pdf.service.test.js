require('./helpers');
const { PDFDocument, decodePDFRawStream, degrees } = require('pdf-lib');
const cfg = { tamano: 14, margenDer: 36, margenSup: 30 };

async function pdfDePrueba(paginas = 1, rotacion = 0) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < paginas; i++) doc.addPage([595, 842]).setRotation(degrees(rotacion));
  return doc.save();
}

/** Texto de los content streams de la página 1 (descomprimidos). */
async function contenidoPagina1(bytes) {
  const doc = await PDFDocument.load(bytes);
  const cont = doc.getPage(0).node.Contents();
  const streams =
    cont.constructor.name === 'PDFArray' ? cont.asArray().map((r) => doc.context.lookup(r)) : [cont];
  return streams.map((s) => Buffer.from(decodePDFRawStream(s).decode()).toString('latin1')).join('\n');
}

/** pdf-lib escribe el texto como cadena hexadecimal: <XXXX> Tj */
const hex = (t) => '<' + Buffer.from(t, 'latin1').toString('hex').toUpperCase() + '> Tj';

describe('PdfService.estampar', () => {
  test('estampa el código solo en la página 1 y conserva las páginas', async () => {
    const out = await PdfService.estampar(await pdfDePrueba(3), '26-001', cfg);
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(3);
    expect(await contenidoPagina1(out)).toContain(hex('26-001'));
  });
  test('código de 4 dígitos', async () => {
    const out = await PdfService.estampar(await pdfDePrueba(), '26-1000', cfg);
    expect(await contenidoPagina1(out)).toContain(hex('26-1000'));
  });
  test('página rotada 90 grados', async () => {
    const out = await PdfService.estampar(await pdfDePrueba(1, 90), '26-001', cfg);
    expect(await contenidoPagina1(out)).toContain(hex('26-001'));
  });
  test('PDF dañado -> ErrorNegocio PDF_ILEGIBLE', async () => {
    const malo = new Uint8Array(Buffer.from('%PDF-1.4 basura sin estructura'));
    await expect(PdfService.estampar(malo, '26-001', cfg)).rejects.toMatchObject({ codigo: 'PDF_ILEGIBLE' });
  });
});
