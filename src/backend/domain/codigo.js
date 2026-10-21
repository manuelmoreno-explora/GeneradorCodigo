/**
 * Dominio puro del código de radicado `YY-NNN` (sin servicios de Google, testeable con Jest).
 * El consecutivo es un entero; se muestra con mínimo 3 dígitos y crece sin tope (26-999 -> 26-1000).
 */
var Codigo = {
  REGEX: /^(\d{2})-(\d{3,})$/,

  /** @param {number} anio año completo (2026) @param {number} consecutivo entero >= 1 */
  formatear(anio, consecutivo) {
    if (!Number.isInteger(anio) || anio < 2000 || anio > 2099) {
      throw new Error('Año inválido: ' + anio);
    }
    if (!Number.isInteger(consecutivo) || consecutivo < 1) {
      throw new Error('Consecutivo inválido: ' + consecutivo);
    }
    const yy = String(anio % 100).padStart(2, '0');
    return yy + '-' + String(consecutivo).padStart(3, '0');
  },

  /** @returns {{anio:number, consecutivo:number}|null} */
  parsear(texto) {
    const m = Codigo.REGEX.exec(String(texto || '').trim());
    if (!m) return null;
    return { anio: 2000 + Number(m[1]), consecutivo: Number(m[2]) };
  },

  /** Nombre del archivo en Drive, según el tipo de operación. */
  nombreArchivo(tipo, codigo) {
    const etiqueta = { ENTREGA: 'enviada', RECEPCION: 'recibida' }[tipo];
    if (!etiqueta) throw new Error('Tipo de operación inválido: ' + tipo);
    if (!Codigo.REGEX.test(codigo)) throw new Error('Código inválido: ' + codigo);
    return 'TYC-Correspondencia ' + etiqueta + ' ' + codigo;
  },

  /**
   * Analiza los consecutivos de UNA secuencia (año + tipo).
   * @param {number[]} consecutivos todos los asignados por la app (incluye anulados)
   * @param {number} [base=0] último consecutivo histórico (manual) anterior a la app: los números
   *   1..base no están en el registro y no se consideran faltantes
   * @returns {{faltantes:number[], duplicados:number[], bajoBase:number[], maximo:number}}
   *   bajoBase: consecutivos del registro que caen dentro del rango histórico (conflicto)
   */
  verificar(consecutivos, base) {
    const desde = Number(base) || 0;
    const vistos = new Set();
    const duplicados = new Set();
    const bajoBase = new Set();
    let maximo = desde;
    for (const n of consecutivos) {
      if (vistos.has(n)) duplicados.add(n);
      vistos.add(n);
      if (n <= desde) bajoBase.add(n);
      if (n > maximo) maximo = n;
    }
    const faltantes = [];
    for (let i = desde + 1; i <= maximo; i++) if (!vistos.has(i)) faltantes.push(i);
    const orden = (s) => [...s].sort((a, b) => a - b);
    return { faltantes, duplicados: orden(duplicados), bajoBase: orden(bajoBase), maximo };
  },
};

if (typeof module !== 'undefined') module.exports = { Codigo };
