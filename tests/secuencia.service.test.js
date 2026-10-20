const { crearDepsFalsas } = require('./helpers');
const { SecuenciaService } = require('../src/backend/services/secuencia.service');

describe('SecuenciaService.reservar', () => {
  test('asigna consecutivos 001, 002, 003 sin saltos', () => {
    const d = crearDepsFalsas();
    const codigos = [1, 2, 3].map(() => SecuenciaService.reservar('RECEPCION', 'a@x.org', d).codigo);
    expect(codigos).toEqual(['26-001', '26-002', '26-003']);
    expect(d.estado.contadores[2026]).toBe(3);
    expect(d.estado.ops.every((o) => o.estado === 'RESERVADO')).toBe(true);
  });

  test('toma y libera el lock siempre', () => {
    const d = crearDepsFalsas();
    SecuenciaService.reservar('ENTREGA', 'a@x.org', d);
    expect(d.estado.bloqueos).toBe(1);
    expect(d.estado.liberaciones).toBe(1);
  });

  test('libera el lock aunque falle', () => {
    const d = crearDepsFalsas();
    d.estado.contadores[2026] = 5; // contador sin operaciones registradas
    expect(() => SecuenciaService.reservar('ENTREGA', 'a@x.org', d)).toThrow(/Inconsistencia/);
    expect(d.estado.liberaciones).toBe(1);
    expect(d.estado.ops).toHaveLength(0); // no consumió código
  });

  test('bloquea si el contador no coincide con el máximo registrado', () => {
    const d = crearDepsFalsas();
    SecuenciaService.reservar('ENTREGA', 'a@x.org', d);
    d.estado.contadores[2026] = 7;
    expect(() => SecuenciaService.reservar('ENTREGA', 'a@x.org', d)).toThrow(ErrorSistema);
  });

  test('reinicia en 001 al cambiar de año', () => {
    const d = crearDepsFalsas(2026);
    SecuenciaService.reservar('ENTREGA', 'a@x.org', d);
    d.estado.anio = 2027;
    expect(SecuenciaService.reservar('ENTREGA', 'a@x.org', d).codigo).toBe('27-001');
  });

  test('pasa de 999 a 1000', () => {
    const d = crearDepsFalsas();
    for (let i = 0; i < 999; i++) SecuenciaService.reservar('RECEPCION', 'a@x.org', d);
    expect(SecuenciaService.reservar('RECEPCION', 'a@x.org', d).codigo).toBe('26-1000');
    expect(SecuenciaService.reservar('RECEPCION', 'a@x.org', d).codigo).toBe('26-1001');
  });
});

describe('completar / anular', () => {
  test('completar marca COMPLETADA con datos', () => {
    const d = crearDepsFalsas();
    const { codigo } = SecuenciaService.reservar('RECEPCION', 'a@x.org', d);
    SecuenciaService.completar(codigo, { archivo_url: 'u' }, 'a@x.org', d);
    expect(d.estado.ops[0]).toMatchObject({ estado: 'COMPLETADA', archivo_url: 'u' });
  });
  test('anular conserva el número consumido y no lo reutiliza', () => {
    const d = crearDepsFalsas();
    const { codigo } = SecuenciaService.reservar('RECEPCION', 'a@x.org', d);
    SecuenciaService.anular(codigo, 'falló Drive', 'a@x.org', d);
    expect(d.estado.ops[0].estado).toBe('ANULADA');
    expect(SecuenciaService.reservar('RECEPCION', 'a@x.org', d).codigo).toBe('26-002');
  });
  test('código inexistente lanza error', () => {
    expect(() => SecuenciaService.completar('26-099', {}, 'a', crearDepsFalsas())).toThrow(ErrorSistema);
  });
});

describe('SecuenciaService.verificar', () => {
  test('secuencia sana', () => {
    const d = crearDepsFalsas();
    for (let i = 0; i < 3; i++) SecuenciaService.reservar('RECEPCION', 'a', d);
    expect(SecuenciaService.verificar(2026, d)).toMatchObject({ ok: true, total: 3, maximo: 3, faltantes: [] });
  });
  test('detecta hueco, duplicado, reservadas y anuladas', () => {
    const d = crearDepsFalsas();
    for (let i = 0; i < 4; i++) SecuenciaService.reservar('RECEPCION', 'a', d);
    d.estado.ops.splice(1, 1); // se pierde el 002 (hueco)
    d.estado.ops.push({ ...d.estado.ops[0] }); // duplicado del 001
    SecuenciaService.anular('26-003', 'x', 'a', d);
    const r = SecuenciaService.verificar(2026, d);
    expect(r.ok).toBe(false);
    expect(r.faltantes).toEqual([2]);
    expect(r.duplicados).toEqual([1]);
    expect(r.anuladas).toEqual(['26-003']);
    expect(r.reservadasSinCompletar).toContain('26-004');
  });
});

describe('SecuenciaService.liberarEnLock', () => {
  test('devuelve el número de una reserva sin completar y deja el contador atrás', () => {
    const d = crearDepsFalsas();
    const r = SecuenciaService.reservar('RECEPCION', 'a', d);
    expect(SecuenciaService.liberarEnLock(r, 'falló', 'a', d)).toBe(true);
    expect(d.estado.ops).toHaveLength(0);
    expect(d.estado.contadores[2026]).toBe(0);
    expect(SecuenciaService.reservar('RECEPCION', 'a', d).codigo).toBe('26-001');
  });
  test('no libera si ya está COMPLETADA', () => {
    const d = crearDepsFalsas();
    const r = SecuenciaService.reservar('RECEPCION', 'a', d);
    SecuenciaService.completar(r.codigo, {}, 'a', d);
    expect(SecuenciaService.liberarEnLock(r, 'x', 'a', d)).toBe(false);
    expect(d.estado.ops).toHaveLength(1);
  });
  test('no libera si no es la última del año', () => {
    const d = crearDepsFalsas();
    const r1 = SecuenciaService.reservar('RECEPCION', 'a', d);
    SecuenciaService.reservar('RECEPCION', 'a', d);
    expect(SecuenciaService.liberarEnLock(r1, 'x', 'a', d)).toBe(false);
    expect(d.estado.ops).toHaveLength(2);
  });
});
