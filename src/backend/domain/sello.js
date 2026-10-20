/**
 * Posición del sello (código) en la esquina superior derecha VISIBLE de una página,
 * considerando la rotación (escaneos girados) y el origen del CropBox. Función pura.
 */
var Sello = {
  /**
   * @param {{x:number,y:number,width:number,height:number}} caja CropBox/MediaBox de la página
   * @param {number} rotacion grados de la página (0, 90, 180, 270; admite negativos o múltiplos)
   * @param {number} anchoTexto ancho del texto en puntos
   * @param {number} tamano tamaño de fuente
   * @param {number} margenDer margen derecho visual
   * @param {number} margenSup margen superior visual
   * @returns {{x:number, y:number, rotar:number}} rotar en grados (antihorario, como pdf-lib)
   */
  posicion(caja, rotacion, anchoTexto, tamano, margenDer, margenSup) {
    const ang = ((Math.round(rotacion / 90) * 90) % 360 + 360) % 360;
    const { x: x0, y: y0, width: w, height: h } = caja;
    switch (ang) {
      case 90:
        return { x: x0 + margenSup + tamano, y: y0 + h - margenDer - anchoTexto, rotar: 90 };
      case 180:
        return { x: x0 + margenDer + anchoTexto, y: y0 + margenSup + tamano, rotar: 180 };
      case 270:
        return { x: x0 + w - margenSup - tamano, y: y0 + margenDer + anchoTexto, rotar: 270 };
      default:
        return { x: x0 + w - margenDer - anchoTexto, y: y0 + h - margenSup - tamano, rotar: 0 };
    }
  },
};

if (typeof module !== 'undefined') module.exports = { Sello };
