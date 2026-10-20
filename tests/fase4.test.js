const { crearDepsFalsas } = require('./helpers');
const { Busqueda } = require('../src/backend/domain/busqueda');
const { Csv } = require('../src/backend/domain/csv');
const { SecuenciaService } = require('../src/backend/services/secuencia.service');
const { ExcepcionService } = require('../src/backend/services/excepcion.service');
const { MantenimientoService } = require('../src/backend/services/mantenimiento.service');
const { PanelService } = require('../src/backend/services/panel.service');

const op = (anio, consecutivo, extra = {}) => ({
  anio, consecutivo, codigo: String(anio % 100) + '-' + String(consecutivo).padStart(3, '0'),
  tipo: 'RECEPCION', estado: 'COMPLETADA', fecha: anio + '-10-20 10:00', ...extra,
});

describe('Busqueda', () => {
  const ops = [op(2026, 1), op(2026, 2, { tipo: 'ENTREGA' }), op(2026, 1000, { estado: 'ANULADA', fecha: '2026-11-02 09:00' }), op(2025, 999)];

  test('filtra por código parcial, tipo, estado y rango de fechas', () => {
    expect(Busqueda.filtrar(ops, { codigo: '26-001' })).toHaveLength(1);
    expect(Busqueda.filtrar(ops, { codigo: '26' })).toHaveLength(3);
    expect(Busqueda.filtrar(ops, { tipo: 'ENTREGA' })).toHaveLength(1);
    expect(Busqueda.filtrar(ops, { estado: 'ANULADA' })).toHaveLength(1);
    expect(Busqueda.filtrar(ops, { desde: '2026-11-01' })).toHaveLength(1);
    expect(Busqueda.filtrar(ops, { hasta: '2025-12-31' })).toHaveLength(1);
  });
  test('ordena por año y consecutivo numérico (1000 antes que 2)', () => {
    expect(Busqueda.ordenar(ops).map((o) => o.codigo)).toEqual(['26-1000', '26-002', '26-001', '25-999']);
  });
  test('pagina y acota la página', () => {
    const muchas = Array.from({ length: 45 }, (_, i) => op(2026, i + 1));
    expect(Busqueda.paginar(muchas, 1)).toMatchObject({ total: 45, totalPaginas: 3, pagina: 1 });
    expect(Busqueda.paginar(muchas, 3).filas).toHaveLength(5);
    expect(Busqueda.paginar(muchas, 99).pagina).toBe(3);
    expect(Busqueda.paginar([], 1)).toMatchObject({ total: 0, totalPaginas: 1, filas: [] });
  });
});

describe('Csv', () => {
  test('escapa comas, comillas y saltos', () => {
    expect(Csv.celda('a,b')).toBe('"a,b"');
    expect(Csv.celda('di "hola"')).toBe('"di ""hola"""');
  });
  test('neutraliza inyección de fórmulas', () => {
    expect(Csv.celda('=HYPERLINK("x")')).toMatch(/^"'=/);
    expect(Csv.celda('+cmd')).toBe("'+cmd");
    expect(Csv.celda('@x')).toBe("'@x");
    expect(Csv.celda('-5')).toBe('-5');
  });
  test('genera encabezado y filas', () => {
    expect(Csv.generar(['a', 'b'], [{ a: 1, b: 'x' }, { a: 2 }])).toBe('a,b\r\n1,x\r\n2,');
  });
});

describe('Reglas de excepciones', () => {
  test('autorizado: sin distinguir mayúsculas y con varios separadores', () => {
    expect(Reglas.autorizado('Jefe@x.org', 'a@x.org, jefe@x.org')).toBe(true);
    expect(Reglas.autorizado('otro@x.org', 'a@x.org;jefe@x.org')).toBe(false);
    expect(Reglas.autorizado('', 'a@x.org')).toBe(false);
    expect(Reglas.autorizado('a@x.org', '')).toBe(false);
  });
  const ok = { codigo: '26-001', tipo: 'ANULACION', descripcion: 'Documento equivocado', accion: 'Se vuelve a radicar', autorizadoPor: 'Jefe', confirmado: true };
  test('acepta datos completos', () => expect(() => Reglas.validarExcepcion(ok)).not.toThrow());
  test.each([
    [{ codigo: 'x' }, 'CODIGO_INVALIDO'],
    [{ tipo: 'OTRA' }, 'TIPO_EXCEPCION'],
    [{ descripcion: 'corto' }, 'SIN_DESCRIPCION'],
    [{ accion: '' }, 'SIN_ACCION'],
    [{ autorizadoPor: '' }, 'SIN_AUTORIZACION'],
    [{ confirmado: false }, 'SIN_CONFIRMACION'],
  ])('rechaza %j', (cambio, codigo) => {
    expect(() => Reglas.validarExcepcion({ ...ok, ...cambio })).toThrow(expect.objectContaining({ codigo }));
  });
});

function depsExcepcion(f, autorizados = 'jefe@x.org') {
  const excepciones = [];
  return {
    excepciones: { agregar: (e) => excepciones.push(e), listar: () => excepciones },
    lista: excepciones,
    operaciones: f.operaciones,
    auditoria: f.auditoria,
    lock: f.lock,
    autorizados: () => autorizados,
    ahora: f.ahora,
  };
}
const datos = (extra = {}) => ({ codigo: '26-001', tipo: 'ANULACION', descripcion: 'Documento equivocado', accion: 'Se vuelve a radicar', autorizadoPor: 'Dirección', confirmado: true, ...extra });

describe('ExcepcionService', () => {
  function radicado() {
    const f = crearDepsFalsas();
    const r = SecuenciaService.reservar('RECEPCION', 'a@x.org', f);
    SecuenciaService.completar(r.codigo, {}, 'a@x.org', f);
    return f;
  }

  test('usuario no autorizado es rechazado', () => {
    const f = radicado();
    expect(() => ExcepcionService.registrar(datos(), 'otro@x.org', depsExcepcion(f))).toThrow(expect.objectContaining({ codigo: 'NO_AUTORIZADO' }));
    expect(f.estado.ops[0].estado).toBe('COMPLETADA');
  });
  test('anulación: marca ANULADA, registra la excepción y no se reutiliza el número', () => {
    const f = radicado();
    const d = depsExcepcion(f);
    ExcepcionService.registrar(datos(), 'jefe@x.org', d);
    expect(f.estado.ops[0]).toMatchObject({ estado: 'ANULADA' });
    expect(d.lista[0]).toMatchObject({ codigo: '26-001', responsable: 'jefe@x.org', autorizado_por: 'Dirección' });
    expect(d.lista[0].descripcion).toMatch(/^\[ANULACIÓN\]/);
    expect(SecuenciaService.reservar('RECEPCION', 'a', f).codigo).toBe('26-002');
    expect(SecuenciaService.verificar(2026, f).ok).toBe(true);
  });
  test('no se puede anular algo que no está COMPLETADA ni dos veces', () => {
    const f = radicado();
    const d = depsExcepcion(f);
    ExcepcionService.registrar(datos(), 'jefe@x.org', d);
    expect(() => ExcepcionService.registrar(datos(), 'jefe@x.org', d)).toThrow(expect.objectContaining({ codigo: 'ESTADO_INVALIDO' }));
  });
  test('REGISTRO no cambia el estado', () => {
    const f = radicado();
    const d = depsExcepcion(f);
    ExcepcionService.registrar(datos({ tipo: 'REGISTRO', confirmado: false }), 'jefe@x.org', d);
    expect(f.estado.ops[0].estado).toBe('COMPLETADA');
    expect(d.lista).toHaveLength(1);
  });
  test('código inexistente', () => {
    const f = radicado();
    expect(() => ExcepcionService.registrar(datos({ codigo: '26-099' }), 'jefe@x.org', depsExcepcion(f))).toThrow(expect.objectContaining({ codigo: 'SIN_OPERACION' }));
  });
  test('libera el lock aunque falle', () => {
    const f = radicado();
    try { ExcepcionService.registrar(datos({ codigo: '26-099' }), 'jefe@x.org', depsExcepcion(f)); } catch (e) { /* esperado */ }
    expect(f.estado.bloqueos).toBe(f.estado.liberaciones);
  });
});

describe('MantenimientoService', () => {
  const hace = (min) => new Date(Date.now() - min * 60000);

  function conReservaAtascada(minutos = 30) {
    const f = crearDepsFalsas();
    SecuenciaService.reservar('RECEPCION', 'a@x.org', f);
    f.estado.ops[0].fecha = hace(minutos);
    const d = {
      operaciones: f.operaciones, secuencias: f.secuencias, secuencia: SecuenciaService, secuenciaDeps: f,
      drive: { buscar: () => null }, auditoria: f.auditoria, lock: f.lock,
      anioActual: () => 2026, ahora: () => new Date(), autorizados: () => 'jefe@x.org',
    };
    return { f, d };
  }

  test('detecta solo reservas viejas', () => {
    expect(MantenimientoService.atascadas(conReservaAtascada(30).d)).toHaveLength(1);
    expect(MantenimientoService.atascadas(conReservaAtascada(2).d)).toHaveLength(0);
  });
  test('sin archivo y siendo la última: devuelve el número', () => {
    const { f, d } = conReservaAtascada();
    expect(MantenimientoService.resolver('26-001', 'jefe@x.org', d).resultado).toBe('LIBERADA');
    expect(f.estado.ops).toHaveLength(0);
    expect(f.estado.contadores[2026]).toBe(0);
  });
  test('con archivo en Drive: completa el registro', () => {
    const { f, d } = conReservaAtascada();
    d.drive.buscar = () => ({ id: 'f1', url: 'u' });
    expect(MantenimientoService.resolver('26-001', 'jefe@x.org', d).resultado).toBe('COMPLETADA');
    expect(f.estado.ops[0]).toMatchObject({ estado: 'COMPLETADA', archivo_id: 'f1' });
  });
  test('sin archivo pero con códigos posteriores: queda ANULADA', () => {
    const { f, d } = conReservaAtascada();
    SecuenciaService.reservar('RECEPCION', 'a', f);
    expect(MantenimientoService.resolver('26-001', 'jefe@x.org', d).resultado).toBe('ANULADA');
    expect(f.estado.ops[0].estado).toBe('ANULADA');
  });
  test('exige autorización y que sea realmente una reserva atascada', () => {
    const { d } = conReservaAtascada();
    expect(() => MantenimientoService.resolver('26-001', 'otro@x.org', d)).toThrow(expect.objectContaining({ codigo: 'NO_AUTORIZADO' }));
    expect(() => MantenimientoService.resolver('26-050', 'jefe@x.org', d)).toThrow(expect.objectContaining({ codigo: 'NO_ATASCADA' }));
  });
});

describe('PanelService', () => {
  test('resumen cuenta por estado y tipo', () => {
    const f = crearDepsFalsas();
    SecuenciaService.completar(SecuenciaService.reservar('RECEPCION', 'a', f).codigo, {}, 'a', f);
    SecuenciaService.completar(SecuenciaService.reservar('ENTREGA', 'a', f).codigo, {}, 'a', f);
    SecuenciaService.anular(SecuenciaService.reservar('ENTREGA', 'a', f).codigo, 'x', 'a', f);
    expect(PanelService.resumen(2026, f)).toMatchObject({ contador: 3, total: 3, completadas: 2, anuladas: 1, recepcion: 1, entrega: 2 });
  });
  test('texto de validación', () => {
    expect(PanelService.resumenValidacion({ ok: true, total: 5 })).toMatch(/correcta/);
    expect(PanelService.resumenValidacion({ ok: false, faltantes: [2], duplicados: [], contador: 3, maximo: 3 })).toMatch(/faltan 1/);
  });
});
