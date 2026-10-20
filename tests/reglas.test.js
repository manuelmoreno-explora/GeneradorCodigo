require('./helpers');
const pdf = (extra = 10) => new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, ...new Array(extra).fill(0)]);
const base = { tipo: 'RECEPCION', nombre: 'a.pdf', bytes: pdf(), maxMB: 10 };

describe('Reglas.validarEntrada', () => {
  test('acepta un PDF válido', () => expect(() => Reglas.validarEntrada(base)).not.toThrow());
  test.each([
    [{ ...base, tipo: 'OTRO' }, 'TIPO_INVALIDO'],
    [{ ...base, bytes: new Uint8Array() }, 'SIN_ARCHIVO'],
    [{ ...base, bytes: new Uint8Array([1, 2, 3, 4, 5, 6]) }, 'NO_PDF'],
    [{ ...base, maxMB: 0.00001 }, 'ARCHIVO_GRANDE'],
  ])('rechaza %#', (entrada, codigo) => {
    try { Reglas.validarEntrada(entrada); throw new Error('no lanzó'); }
    catch (e) { expect(e).toBeInstanceOf(ErrorNegocio); expect(e.codigo).toBe(codigo); }
  });
});

describe('Reglas.validarContador', () => {
  test('coincide', () => expect(() => Reglas.validarContador(5, 5)).not.toThrow());
  test('no coincide', () => expect(() => Reglas.validarContador(6, 5)).toThrow(ErrorSistema));
});
