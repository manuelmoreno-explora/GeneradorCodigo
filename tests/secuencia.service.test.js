const { crearDepsFalsas } = require('./helpers');
const { SecuenciaService } = require('../src/backend/services/secuencia.service');

const R = 'RECEPCION';
const E = 'ENTREGA';

describe('SecuenciaService.reservar', () => {
  test('asigna consecutivos 001, 002, 003 sin saltos', () => {
    const d = crearDepsFalsas();
    const codigos = [1, 2, 3].map(() => SecuenciaService.reservar(R, 'a@x.org', d).codigo);
    expect(codigos).toEqual(['26-001', '26-002', '26-003']);
    expect(d.estado.contador(2026, R)).toBe(3);
    expect(d.estado.ops.every((o) => o.estado === 'RESERVADO')).toBe(true);
  });

  test('recepción y entrega llevan secuencias INDEPENDIENTES', () => {
    const d = crearDepsFalsas();
    expect(SecuenciaService.reservar(R, 'a', d).codigo).toBe('26-001');
    expect(SecuenciaService.reservar(E, 'a', d).codigo).toBe('26-001');
    expect(SecuenciaService.reservar(R, 'a', d).codigo).toBe('26-002');
    expect(SecuenciaService.reservar(E, 'a', d).codigo).toBe('26-002');
    expect(d.estado.contador(2026, R)).toBe(2);
    expect(d.estado.contador(2026, E)).toBe(2);
  });

  test('toma y libera el lock siempre', () => {
    const d = crearDepsFalsas();
    SecuenciaService.reservar(E, 'a@x.org', d);
    expect(d.estado.bloqueos).toBe(1);
    expect(d.estado.liberaciones).toBe(1);
  });

  test('libera el lock aunque falle', () => {
    const d = crearDepsFalsas();
    d.estado.contadores['2026|ENTREGA'] = 5; // contador sin operaciones ni base
    expect(() => SecuenciaService.reservar(E, 'a@x.org', d)).toThrow(/Inconsistencia/);
    expect(d.estado.liberaciones).toBe(1);
    expect(d.estado.ops).toHaveLength(0);
  });

  test('bloquea si el contador no coincide con el máximo registrado', () => {
    const d = crearDepsFalsas();
    SecuenciaService.reservar(E, 'a@x.org', d);
    d.estado.contadores['2026|ENTREGA'] = 7;
    expect(() => SecuenciaService.reservar(E, 'a@x.org', d)).toThrow(ErrorSistema);
  });

  test('reinicia en 001 al cambiar de año', () => {
    const d = crearDepsFalsas(2026);
    SecuenciaService.reservar(E, 'a@x.org', d);
    d.estado.anio = 2027;
    expect(SecuenciaService.reservar(E, 'a@x.org', d).codigo).toBe('27-001');
  });

  test('pasa de 999 a 1000', () => {
    const d = crearDepsFalsas();
    for (let i = 0; i < 999; i++) SecuenciaService.reservar(R, 'a@x.org', d);
    expect(SecuenciaService.reservar(R, 'a@x.org', d).codigo).toBe('26-1000');
    expect(SecuenciaService.reservar(R, 'a@x.org', d).codigo).toBe('26-1001');
  });
});

describe('establecerBase (consecutivo histórico manual)', () => {
  test('el próximo código continúa desde la base: enviada 567 -> 568, recibida 134 -> 135', () => {
    const d = crearDepsFalsas();
    SecuenciaService.establecerBase(E, 567, 'a', d);
    SecuenciaService.establecerBase(R, 134, 'a', d);
    expect(SecuenciaService.reservar(E, 'a', d).codigo).toBe('26-568');
    expect(SecuenciaService.reservar(R, 'a', d).codigo).toBe('26-135');
    expect(SecuenciaService.reservar(E, 'a', d).codigo).toBe('26-569');
  });
  test('los números históricos no se consideran faltantes, pero sí los huecos nuevos', () => {
    const d = crearDepsFalsas();
    SecuenciaService.establecerBase(E, 567, 'a', d);
    SecuenciaService.reservar(E, 'a', d);
    SecuenciaService.reservar(E, 'a', d);
    expect(SecuenciaService.verificar(2026, d).porTipo.ENTREGA).toMatchObject({ ok: true, base: 567, maximo: 569, faltantes: [] });
    d.estado.ops.splice(0, 1); // se pierde el 568
    expect(SecuenciaService.verificar(2026, d).porTipo.ENTREGA.faltantes).toEqual([568]);
  });
  test('detecta un radicado de la app dentro del rango histórico', () => {
    const d = crearDepsFalsas();
    SecuenciaService.establecerBase(R, 134, 'a', d);
    d.estado.ops.push({ anio: 2026, consecutivo: 100, codigo: '26-100', tipo: R, estado: 'COMPLETADA' });
    const v = SecuenciaService.verificar(2026, d).porTipo.RECEPCION;
    expect(v.bajoBase).toEqual([100]);
    expect(v.ok).toBe(false);
  });
  test('no permite cambiar la base si ya hay radicados de ese tipo', () => {
    const d = crearDepsFalsas();
    SecuenciaService.reservar(R, 'a', d);
    expect(() => SecuenciaService.establecerBase(R, 50, 'a', d)).toThrow(expect.objectContaining({ codigo: 'BASE_BLOQUEADA' }));
    SecuenciaService.establecerBase(E, 50, 'a', d); // el otro tipo sigue libre
  });
  test('valida tipo y valor', () => {
    const d = crearDepsFalsas();
    expect(() => SecuenciaService.establecerBase('X', 1, 'a', d)).toThrow(expect.objectContaining({ codigo: 'TIPO_INVALIDO' }));
    expect(() => SecuenciaService.establecerBase(R, -1, 'a', d)).toThrow(expect.objectContaining({ codigo: 'BASE_INVALIDA' }));
    expect(() => SecuenciaService.establecerBase(R, NaN, 'a', d)).toThrow(expect.objectContaining({ codigo: 'BASE_INVALIDA' }));
  });
});

describe('completar / anular', () => {
  test('completar marca COMPLETADA con datos', () => {
    const d = crearDepsFalsas();
    const r = SecuenciaService.reservar(R, 'a@x.org', d);
    SecuenciaService.completar(r, { archivo_url: 'u' }, 'a@x.org', d);
    expect(d.estado.ops[0]).toMatchObject({ estado: 'COMPLETADA', archivo_url: 'u' });
  });
  test('completar solo toca el tipo indicado aunque el código se repita en el otro tipo', () => {
    const d = crearDepsFalsas();
    const r = SecuenciaService.reservar(R, 'a', d);
    const e = SecuenciaService.reservar(E, 'a', d);
    expect(r.codigo).toBe(e.codigo);
    SecuenciaService.completar(e, {}, 'a', d);
    expect(d.estado.ops.find((o) => o.tipo === R).estado).toBe('RESERVADO');
    expect(d.estado.ops.find((o) => o.tipo === E).estado).toBe('COMPLETADA');
  });
  test('anular conserva el número consumido y no lo reutiliza', () => {
    const d = crearDepsFalsas();
    const r = SecuenciaService.reservar(R, 'a@x.org', d);
    SecuenciaService.anular(r, 'falló Drive', 'a@x.org', d);
    expect(d.estado.ops[0].estado).toBe('ANULADA');
    expect(SecuenciaService.reservar(R, 'a@x.org', d).codigo).toBe('26-002');
  });
  test('código inexistente lanza error', () => {
    expect(() => SecuenciaService.completar({ codigo: '26-099', tipo: R }, {}, 'a', crearDepsFalsas())).toThrow(ErrorSistema);
  });
});

describe('SecuenciaService.verificar', () => {
  test('secuencias sanas', () => {
    const d = crearDepsFalsas();
    for (let i = 0; i < 3; i++) SecuenciaService.reservar(R, 'a', d);
    SecuenciaService.reservar(E, 'a', d);
    const v = SecuenciaService.verificar(2026, d);
    expect(v.ok).toBe(true);
    expect(v.porTipo.RECEPCION).toMatchObject({ ok: true, total: 3, maximo: 3, faltantes: [] });
    expect(v.porTipo.ENTREGA).toMatchObject({ ok: true, total: 1, maximo: 1 });
  });
  test('detecta hueco, duplicado, reservadas y anuladas por tipo', () => {
    const d = crearDepsFalsas();
    for (let i = 0; i < 4; i++) SecuenciaService.reservar(R, 'a', d);
    d.estado.ops.splice(1, 1); // se pierde el 002 (hueco)
    d.estado.ops.push({ ...d.estado.ops[0] }); // duplicado del 001
    SecuenciaService.anular({ codigo: '26-003', tipo: R }, 'x', 'a', d);
    const v = SecuenciaService.verificar(2026, d);
    expect(v.ok).toBe(false);
    expect(v.porTipo.RECEPCION.faltantes).toEqual([2]);
    expect(v.porTipo.RECEPCION.duplicados).toEqual([1]);
    expect(v.porTipo.RECEPCION.anuladas).toEqual(['26-003']);
    expect(v.porTipo.RECEPCION.reservadasSinCompletar).toContain('26-004');
    expect(v.porTipo.ENTREGA.ok).toBe(true); // el otro tipo no se contamina
  });
  test('un código repetido en recepción y entrega NO es duplicado', () => {
    const d = crearDepsFalsas();
    SecuenciaService.reservar(R, 'a', d);
    SecuenciaService.reservar(E, 'a', d);
    expect(SecuenciaService.verificar(2026, d).ok).toBe(true);
  });
});

describe('SecuenciaService.liberarEnLock', () => {
  test('devuelve el número de una reserva sin completar y deja el contador atrás', () => {
    const d = crearDepsFalsas();
    const r = SecuenciaService.reservar(R, 'a', d);
    expect(SecuenciaService.liberarEnLock(r, 'falló', 'a', d)).toBe(true);
    expect(d.estado.ops).toHaveLength(0);
    expect(d.estado.contador(2026, R)).toBe(0);
    expect(SecuenciaService.reservar(R, 'a', d).codigo).toBe('26-001');
  });
  test('liberar un tipo no afecta al otro', () => {
    const d = crearDepsFalsas();
    SecuenciaService.reservar(E, 'a', d);
    const r = SecuenciaService.reservar(R, 'a', d);
    expect(SecuenciaService.liberarEnLock(r, 'x', 'a', d)).toBe(true);
    expect(d.estado.contador(2026, E)).toBe(1);
    expect(d.estado.ops).toHaveLength(1);
  });
  test('con base histórica vuelve a la base, no a 0', () => {
    const d = crearDepsFalsas();
    SecuenciaService.establecerBase(E, 567, 'a', d);
    const r = SecuenciaService.reservar(E, 'a', d);
    SecuenciaService.liberarEnLock(r, 'x', 'a', d);
    expect(d.estado.contador(2026, E)).toBe(567);
    expect(SecuenciaService.reservar(E, 'a', d).codigo).toBe('26-568');
  });
  test('no libera si ya está COMPLETADA', () => {
    const d = crearDepsFalsas();
    const r = SecuenciaService.reservar(R, 'a', d);
    SecuenciaService.completar(r, {}, 'a', d);
    expect(SecuenciaService.liberarEnLock(r, 'x', 'a', d)).toBe(false);
    expect(d.estado.ops).toHaveLength(1);
  });
  test('no libera si no es la última del año de ese tipo', () => {
    const d = crearDepsFalsas();
    const r1 = SecuenciaService.reservar(R, 'a', d);
    SecuenciaService.reservar(R, 'a', d);
    expect(SecuenciaService.liberarEnLock(r1, 'x', 'a', d)).toBe(false);
    expect(d.estado.ops).toHaveLength(2);
  });
});
