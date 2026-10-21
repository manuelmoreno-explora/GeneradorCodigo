// Expone como globales los módulos de dominio, igual que en Apps Script (scope global compartido).
const { Codigo } = require('../src/backend/domain/codigo');
const { Constantes } = require('../src/backend/domain/constantes');
const { ErrorNegocio, ErrorSistema } = require('../src/backend/domain/errores');
const { Reglas } = require('../src/backend/domain/reglas');
Object.assign(global, { Codigo, Constantes, ErrorNegocio, ErrorSistema, Reglas });

/** Repositorios en memoria + lock falso para probar SecuenciaService sin Google (secuencia por año y tipo). */
function crearDepsFalsas(anio = 2026) {
  const estado = {
    contadores: {}, bases: {}, ops: [], auditoria: [], anio, bloqueos: 0, liberaciones: 0,
    /** último consecutivo del año y tipo (por defecto RECEPCION) */
    contador: (a, tipo = 'RECEPCION') => estado.contadores[a + '|' + tipo] || 0,
  };
  const llave = (a, t) => a + '|' + t;
  const igual = (o, ref) => o.codigo === ref.codigo && o.tipo === ref.tipo;
  return {
    estado,
    secuencias: {
      obtener: (a, t) => {
        if (!(llave(a, t) in estado.contadores)) estado.contadores[llave(a, t)] = 0;
        return { ultimo: estado.contadores[llave(a, t)], base: estado.bases[llave(a, t)] || 0 };
      },
      guardar: (a, t, n) => { estado.contadores[llave(a, t)] = n; },
      establecerBase: (a, t, b) => { estado.contadores[llave(a, t)] = b; estado.bases[llave(a, t)] = b; },
    },
    operaciones: {
      agregar: (o) => estado.ops.push({ ...o }),
      listarPorAnio: (a) => estado.ops.filter((o) => o.anio === a),
      maximo: (a, t) =>
        estado.ops.filter((o) => o.anio === a && o.tipo === t).reduce((m, o) => Math.max(m, o.consecutivo), 0),
      eliminar: (ref) => {
        const i = estado.ops.findIndex((x) => igual(x, ref));
        if (i < 0) return false;
        estado.ops.splice(i, 1);
        return true;
      },
      actualizar: (ref, campos) => {
        const o = estado.ops.find((x) => igual(x, ref));
        if (!o) return false;
        Object.assign(o, campos);
        return true;
      },
    },
    auditoria: { registrar: (...a) => estado.auditoria.push(a) },
    lock: () => ({
      waitLock: () => { estado.bloqueos++; },
      releaseLock: () => { estado.liberaciones++; },
    }),
    anioActual: () => estado.anio,
    ahora: () => new Date('2026-10-20T12:00:00Z'),
  };
}
module.exports = { crearDepsFalsas };

// Globales adicionales de Fase 2
const { Sello } = require('../src/backend/domain/sello');
const { PdfService } = require('../src/backend/services/pdf.service');
Object.assign(global, { Sello, PdfService, PDFLib: require('pdf-lib') });

// Globales de Fase 4
const { Busqueda } = require('../src/backend/domain/busqueda');
const { Csv } = require('../src/backend/domain/csv');
Object.assign(global, { Busqueda, Csv });
