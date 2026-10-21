const { Codigo } = require('../src/backend/domain/codigo');

describe('Codigo.formatear', () => {
  test('formato YY-NNN', () => {
    expect(Codigo.formatear(2026, 1)).toBe('26-001');
    expect(Codigo.formatear(2026, 42)).toBe('26-042');
    expect(Codigo.formatear(2026, 999)).toBe('26-999');
  });
  test('pasa de 999 a 4 dígitos sin tope', () => {
    expect(Codigo.formatear(2026, 1000)).toBe('26-1000');
    expect(Codigo.formatear(2026, 12345)).toBe('26-12345');
  });
  test('rechaza 000 y entradas inválidas', () => {
    expect(() => Codigo.formatear(2026, 0)).toThrow();
    expect(() => Codigo.formatear(2026, 1.5)).toThrow();
    expect(() => Codigo.formatear(1999, 1)).toThrow();
  });
});

describe('Codigo.parsear', () => {
  test('ida y vuelta', () => {
    expect(Codigo.parsear('26-001')).toEqual({ anio: 2026, consecutivo: 1 });
    expect(Codigo.parsear('26-1000')).toEqual({ anio: 2026, consecutivo: 1000 });
  });
  test('rechaza formatos inválidos', () => {
    for (const x of ['26001', '26-01', '2026-001', 'ab-001', '', null]) {
      expect(Codigo.parsear(x)).toBeNull();
    }
  });
});

describe('Codigo.nombreArchivo', () => {
  test('entrega = enviada, recepción = recibida', () => {
    expect(Codigo.nombreArchivo('ENTREGA', '26-001')).toBe('TYC-Correspondencia enviada 26-001');
    expect(Codigo.nombreArchivo('RECEPCION', '26-001')).toBe('TYC-Correspondencia recibida 26-001');
  });
  test('rechaza tipo o código inválido', () => {
    expect(() => Codigo.nombreArchivo('OTRO', '26-001')).toThrow();
    expect(() => Codigo.nombreArchivo('ENTREGA', '26001')).toThrow();
  });
});

describe('Codigo.verificar', () => {
  test('secuencia limpia', () => {
    expect(Codigo.verificar([1, 2, 3])).toEqual({ faltantes: [], duplicados: [], bajoBase: [], maximo: 3 });
  });
  test('detecta huecos y duplicados', () => {
    expect(Codigo.verificar([1, 2, 2, 5])).toEqual({ faltantes: [3, 4], duplicados: [2], bajoBase: [], maximo: 5 });
  });
  test('ordena numéricamente tras 999', () => {
    const r = Codigo.verificar([998, 999, 1000, 1002]);
    expect(r.maximo).toBe(1002);
    expect(r.faltantes).toContain(1001);
  });
  test('con base histórica: no marca 1..base como faltantes', () => {
    expect(Codigo.verificar([568, 569, 571], 567)).toEqual({ faltantes: [570], duplicados: [], bajoBase: [], maximo: 571 });
    expect(Codigo.verificar([], 134)).toEqual({ faltantes: [], duplicados: [], bajoBase: [], maximo: 134 });
  });
  test('detecta consecutivos dentro del rango histórico', () => {
    expect(Codigo.verificar([100, 135], 134).bajoBase).toEqual([100]);
  });
  test('vacío', () => {
    expect(Codigo.verificar([])).toEqual({ faltantes: [], duplicados: [], bajoBase: [], maximo: 0 });
  });
});
