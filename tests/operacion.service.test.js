const { crearDepsFalsas } = require('./helpers');
const { SecuenciaService } = require('../src/backend/services/secuencia.service');
const { OperacionService } = require('../src/backend/services/operacion.service');
const { PDFDocument } = require('pdf-lib');

async function pdf() {
  const d = await PDFDocument.create();
  d.addPage([595, 842]);
  return d.save();
}
const roto = () => new Uint8Array(Buffer.from('%PDF-1.4 roto'));

function depsOperacion(f, extra = {}) {
  const archivos = [];
  const estados = {};
  return {
    archivos,
    estadosGuardados: estados,
    secuencia: SecuenciaService,
    secuenciaDeps: f,
    pdf: PdfService,
    drive: {
      guardar: (tipo, nombre, bytes) => {
        const a = { id: 'f' + (archivos.length + 1), url: 'https://drive/' + nombre, nombre, tipo, bytes, papelera: false };
        archivos.push(a);
        return a;
      },
      papelera: (id) => {
        archivos.find((a) => a.id === id).papelera = true;
      },
    },
    auditoria: f.auditoria,
    estados: {
      set: (id, v) => {
        estados[id] = v;
      },
      get: (id) => estados[id],
    },
    lock: f.lock,
    aSigno: (u8) => Array.from(u8),
    hash: (u8) => 'h' + u8.length,
    cfg: () => ({ tamano: 14, margenDer: 36, margenSup: 30 }),
    ...extra,
  };
}

const acciones = (f) => f.estado.auditoria.map((a) => a[1]);

describe('OperacionService.procesar', () => {
  test('camino feliz: un archivo en Drive, nombre correcto, COMPLETADA y estado OK', async () => {
    const f = crearDepsFalsas();
    const d = depsOperacion(f);
    const r = await OperacionService.procesar('op1', 'RECEPCION', await pdf(), 'a@x.org', d);
    expect(r).toMatchObject({ ok: true, codigo: '26-001' });
    expect(d.archivos).toHaveLength(1);
    expect(d.archivos[0].nombre).toBe('TYC-Correspondencia recibida 26-001');
    expect(f.estado.ops[0]).toMatchObject({ estado: 'COMPLETADA', archivo_id: 'f1' });
    expect(d.estadosGuardados.op1).toMatchObject({ estado: 'OK', codigo: '26-001' });
    expect(f.estado.bloqueos).toBe(1);
    expect(f.estado.liberaciones).toBe(1);
  });

  test('entrega usa "enviada"', async () => {
    const f = crearDepsFalsas();
    const d = depsOperacion(f);
    await OperacionService.procesar('op1', 'ENTREGA', await pdf(), 'a@x.org', d);
    expect(d.archivos[0].nombre).toBe('TYC-Correspondencia enviada 26-001');
  });

  test('PDF ilegible: NO consume código, no toca contador ni Drive, queda en auditoría sin código', async () => {
    const f = crearDepsFalsas();
    const d = depsOperacion(f);
    const r = await OperacionService.procesar('op1', 'RECEPCION', roto(), 'a@x.org', d);
    expect(r.ok).toBe(false);
    expect(f.estado.ops).toHaveLength(0);
    expect(f.estado.contador(2026)).toBe(0);
    expect(d.archivos).toHaveLength(0);
    expect(d.estadosGuardados.op1.estado).toBe('ERROR');
    expect(f.estado.auditoria.find((a) => a[1] === 'INTENTO_FALLIDO')[2]).toBe('');
  });

  test('tras un fallo, el siguiente código sigue siendo 001 (sin saltos en Drive)', async () => {
    const f = crearDepsFalsas();
    await OperacionService.procesar('a', 'RECEPCION', roto(), 'a@x.org', depsOperacion(f));
    const r = await OperacionService.procesar('b', 'RECEPCION', await pdf(), 'a@x.org', depsOperacion(f));
    expect(r.codigo).toBe('26-001');
    expect(SecuenciaService.verificar(2026, f).porTipo.RECEPCION).toMatchObject({ ok: true, total: 1, faltantes: [] });
  });

  test('falla Drive: se devuelve el número (liberado) y no queda fila ni salto', async () => {
    const f = crearDepsFalsas();
    const d = depsOperacion(f, {
      drive: {
        guardar: () => {
          throw new Error('Drive caido');
        },
        papelera: () => {},
      },
    });
    const r = await OperacionService.procesar('op1', 'RECEPCION', await pdf(), 'a@x.org', d);
    expect(r.ok).toBe(false);
    expect(r.mensaje).toMatch(/No se asignó ningún código/);
    expect(f.estado.ops).toHaveLength(0);
    expect(f.estado.contador(2026)).toBe(0);
    expect(acciones(f)).toEqual(expect.arrayContaining(['RESERVAR', 'LIBERAR', 'INTENTO_FALLIDO']));
    expect(f.estado.liberaciones).toBe(1);
    const ok = await OperacionService.procesar('op2', 'RECEPCION', await pdf(), 'a@x.org', depsOperacion(f));
    expect(ok.codigo).toBe('26-001');
  });

  test('falla al completar: archivo a papelera y número devuelto (sin huérfanos)', async () => {
    const f = crearDepsFalsas();
    const d = depsOperacion(f);
    d.secuencia = {
      ...SecuenciaService,
      completar: () => {
        throw new Error('Sheets caido');
      },
    };
    const r = await OperacionService.procesar('op1', 'RECEPCION', await pdf(), 'a@x.org', d);
    expect(r.ok).toBe(false);
    expect(d.archivos[0].papelera).toBe(true);
    expect(f.estado.ops).toHaveLength(0);
    expect(f.estado.contador(2026)).toBe(0);
  });

  test('si no se puede liberar, queda ANULADA con motivo', async () => {
    const f = crearDepsFalsas();
    const d = depsOperacion(f);
    d.secuencia = {
      ...SecuenciaService,
      liberarEnLock: () => false,
      completar: () => {
        throw new Error('x');
      },
    };
    await OperacionService.procesar('op1', 'RECEPCION', await pdf(), 'a@x.org', d);
    expect(f.estado.ops[0]).toMatchObject({ estado: 'ANULADA', motivo_anulacion: 'x' });
  });

  test('recepción y entrega no se mezclan: cada una continúa su propia secuencia', async () => {
    const f = crearDepsFalsas();
    const a = await OperacionService.procesar('a', 'ENTREGA', await pdf(), 'x@x.org', depsOperacion(f));
    const b = await OperacionService.procesar('b', 'RECEPCION', await pdf(), 'x@x.org', depsOperacion(f));
    const c = await OperacionService.procesar('c', 'ENTREGA', await pdf(), 'x@x.org', depsOperacion(f));
    expect([a.codigo, b.codigo, c.codigo]).toEqual(['26-001', '26-001', '26-002']);
    expect(f.estado.ops.map((x) => x.tipo + x.codigo)).toEqual(['ENTREGA26-001', 'RECEPCION26-001', 'ENTREGA26-002']);
  });

  test('operaciones seguidas generan 001, 002, 003 y la secuencia queda sana', async () => {
    const f = crearDepsFalsas();
    const codigos = [];
    for (let i = 0; i < 3; i++) {
      const r = await OperacionService.procesar('o' + i, 'RECEPCION', await pdf(), 'a@x.org', depsOperacion(f));
      codigos.push(r.codigo);
    }
    expect(codigos).toEqual(['26-001', '26-002', '26-003']);
    expect(SecuenciaService.verificar(2026, f).ok).toBe(true);
  });
});
