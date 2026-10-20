// Expone como globales los módulos de dominio, igual que en Apps Script (scope global compartido).
const { Codigo } = require('../src/backend/domain/codigo');
const { Constantes } = require('../src/backend/domain/constantes');
const { ErrorNegocio, ErrorSistema } = require('../src/backend/domain/errores');
const { Reglas } = require('../src/backend/domain/reglas');
Object.assign(global, { Codigo, Constantes, ErrorNegocio, ErrorSistema, Reglas });

/** Repositorios en memoria + lock falso para probar SecuenciaService sin Google. */
function crearDepsFalsas(anio = 2026) {
  const estado = { contadores: {}, ops: [], auditoria: [], anio, bloqueos: 0, liberaciones: 0 };
  return {
    estado,
    secuencias: {
      obtener: (a) => (estado.contadores[a] = estado.contadores[a] || 0),
      guardar: (a, n) => { estado.contadores[a] = n; },
    },
    operaciones: {
      agregar: (o) => estado.ops.push({ ...o }),
      listarPorAnio: (a) => estado.ops.filter((o) => o.anio === a),
      maximo: (a) => estado.ops.filter((o) => o.anio === a).reduce((m, o) => Math.max(m, o.consecutivo), 0),
      eliminar: (codigo) => {
        const i = estado.ops.findIndex((x) => x.codigo === codigo);
        if (i < 0) return false;
        estado.ops.splice(i, 1);
        return true;
      },
      actualizar: (codigo, campos) => {
        const o = estado.ops.find((x) => x.codigo === codigo);
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
