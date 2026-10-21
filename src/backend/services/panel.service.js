/** Resumen para el Panel y validación programada de la secuencia (una secuencia por tipo). */
var PanelService = {
  ETIQUETA: { RECEPCION: 'Recibida', ENTREGA: 'Enviada' },

  resumen(anio, deps) {
    const d = deps || SecuenciaService.deps();
    const ops = d.operaciones.listarPorAnio(anio);
    const porTipo = {};
    Reglas.TIPOS.forEach((t) => {
      const o = ops.filter((x) => x.tipo === t);
      const cuenta = (est) => o.filter((x) => x.estado === est).length;
      const { ultimo, base } = d.secuencias.obtener(anio, t);
      porTipo[t] = {
        contador: ultimo, base, total: o.length,
        completadas: cuenta(Constantes.ESTADOS.COMPLETADA),
        anuladas: cuenta(Constantes.ESTADOS.ANULADA),
        reservadas: cuenta(Constantes.ESTADOS.RESERVADO),
      };
    });
    return { anio, porTipo };
  },

  /** Texto corto para auditoría/panel a partir del resultado de SecuenciaService.verificar. */
  resumenValidacion(v) {
    const partes = Reglas.TIPOS.map((t) => {
      const x = v.porTipo[t];
      const nombre = PanelService.ETIQUETA[t];
      if (x.ok) return nombre + ': correcta (' + x.total + ' radicados por la app, último ' + x.contador + ')';
      const h = [];
      if (x.faltantes.length) h.push('faltan ' + x.faltantes.length + ' consecutivo(s)');
      if (x.duplicados.length) h.push(x.duplicados.length + ' duplicado(s)');
      if (x.bajoBase.length) h.push(x.bajoBase.length + ' dentro del rango histórico');
      if (x.contador !== x.maximo) h.push('contador (' + x.contador + ') distinto del máximo (' + x.maximo + ')');
      return nombre + ': HALLAZGOS — ' + h.join('; ');
    });
    return (v.ok ? 'Secuencias correctas. ' : 'Revisar. ') + partes.join(' | ') + '.';
  },
};

if (typeof module !== 'undefined') module.exports = { PanelService };
