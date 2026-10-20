/** Resumen para el Panel y validación programada de la secuencia. */
var PanelService = {
  resumen(anio, deps) {
    const d = deps || SecuenciaService.deps();
    const ops = d.operaciones.listarPorAnio(anio);
    const cuenta = (est) => ops.filter((o) => o.estado === est).length;
    return {
      anio,
      contador: d.secuencias.obtener(anio),
      total: ops.length,
      completadas: cuenta(Constantes.ESTADOS.COMPLETADA),
      anuladas: cuenta(Constantes.ESTADOS.ANULADA),
      reservadas: cuenta(Constantes.ESTADOS.RESERVADO),
      recepcion: ops.filter((o) => o.tipo === Constantes.TIPOS.RECEPCION).length,
      entrega: ops.filter((o) => o.tipo === Constantes.TIPOS.ENTREGA).length,
    };
  },

  /** Texto corto para auditoría/panel a partir del resultado de SecuenciaService.verificar. */
  resumenValidacion(v) {
    if (v.ok) return 'Secuencia correcta: ' + v.total + ' radicados, sin huecos ni duplicados.';
    const partes = [];
    if (v.faltantes.length) partes.push('faltan ' + v.faltantes.length + ' consecutivo(s)');
    if (v.duplicados.length) partes.push(v.duplicados.length + ' duplicado(s)');
    if (v.contador !== v.maximo) partes.push('contador (' + v.contador + ') distinto del máximo (' + v.maximo + ')');
    return 'Hallazgos: ' + partes.join('; ') + '.';
  },
};

if (typeof module !== 'undefined') module.exports = { PanelService };
