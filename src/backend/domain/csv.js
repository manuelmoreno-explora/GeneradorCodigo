/** Exportación CSV segura (RFC 4180) con protección contra inyección de fórmulas en Excel/Sheets. */
var Csv = {
  celda(valor) {
    let t = valor === null || valor === undefined ? '' : String(valor);
    if (/^[=+\-@\t\r]/.test(t) && !/^-?\d+([.,]\d+)?$/.test(t)) t = "'" + t;
    return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  },

  /** @param {string[]} columnas @param {Object[]} filas */
  generar(columnas, filas) {
    const lineas = [columnas.join(',')];
    filas.forEach((f) => lineas.push(columnas.map((c) => Csv.celda(f[c])).join(',')));
    return lineas.join('\r\n');
  },
};

if (typeof module !== 'undefined') module.exports = { Csv };
