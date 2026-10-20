/** Filtrado y paginación puros de operaciones (RF-008). Las fechas son texto 'yyyy-MM-dd HH:mm'. */
var Busqueda = {
  TAMANO_PAGINA: 20,

  /**
   * @param {Object[]} ops operaciones
   * @param {{codigo?:string, tipo?:string, estado?:string, desde?:string, hasta?:string}} f
   *   codigo: coincidencia parcial ("26-001", "001" o "26"); desde/hasta: 'yyyy-MM-dd' inclusivos
   */
  filtrar(ops, f) {
    const filtros = f || {};
    const codigo = String(filtros.codigo || '').trim().toLowerCase();
    return ops.filter((o) => {
      if (codigo && !String(o.codigo).toLowerCase().includes(codigo)) return false;
      if (filtros.tipo && o.tipo !== filtros.tipo) return false;
      if (filtros.estado && o.estado !== filtros.estado) return false;
      const dia = String(o.fecha).slice(0, 10);
      if (filtros.desde && dia < filtros.desde) return false;
      if (filtros.hasta && dia > filtros.hasta) return false;
      return true;
    });
  },

  /** Más recientes primero: por año y consecutivo numérico, no por texto. */
  ordenar(ops) {
    return ops.slice().sort((a, b) => Number(b.anio) - Number(a.anio) || Number(b.consecutivo) - Number(a.consecutivo));
  },

  paginar(ops, pagina, tamano) {
    const t = tamano || Busqueda.TAMANO_PAGINA;
    const totalPaginas = Math.max(1, Math.ceil(ops.length / t));
    const p = Math.min(Math.max(1, Math.floor(Number(pagina) || 1)), totalPaginas);
    return { total: ops.length, pagina: p, totalPaginas, filas: ops.slice((p - 1) * t, p * t) };
  },
};

if (typeof module !== 'undefined') module.exports = { Busqueda };
