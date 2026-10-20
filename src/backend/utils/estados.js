/**
 * Estado de una operación en curso (consultado por el cliente mientras espera).
 * Vive en caché 30 min: el registro permanente es la hoja Operaciones (códigos) y Auditoria (intentos).
 */
var EstadosOperacion = {
  PREFIJO: 'op:',
  set(opId, valor) {
    CacheService.getScriptCache().put(EstadosOperacion.PREFIJO + opId, JSON.stringify(valor), 1800);
  },
  get(opId) {
    const v = CacheService.getScriptCache().get(EstadosOperacion.PREFIJO + opId);
    return v ? JSON.parse(v) : null;
  },
};
