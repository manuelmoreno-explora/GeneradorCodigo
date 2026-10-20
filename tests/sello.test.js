require('./helpers');
const caja = { x: 0, y: 0, width: 595, height: 842 };

describe('Sello.posicion', () => {
  test('rotación 0: esquina superior derecha', () => {
    expect(Sello.posicion(caja, 0, 40, 14, 36, 30)).toEqual({ x: 595 - 36 - 40, y: 842 - 30 - 14, rotar: 0 });
  });
  test('respeta el origen del CropBox', () => {
    const p = Sello.posicion({ x: 10, y: 20, width: 595, height: 842 }, 0, 40, 14, 36, 30);
    expect(p.x).toBe(10 + 595 - 36 - 40);
    expect(p.y).toBe(20 + 842 - 30 - 14);
  });
  test('rotaciones 90, 180, 270 y equivalentes', () => {
    expect(Sello.posicion(caja, 90, 40, 14, 36, 30)).toEqual({ x: 44, y: 842 - 36 - 40, rotar: 90 });
    expect(Sello.posicion(caja, 180, 40, 14, 36, 30)).toEqual({ x: 76, y: 44, rotar: 180 });
    expect(Sello.posicion(caja, 270, 40, 14, 36, 30)).toEqual({ x: 595 - 44, y: 76, rotar: 270 });
    expect(Sello.posicion(caja, -90, 40, 14, 36, 30).rotar).toBe(270);
    expect(Sello.posicion(caja, 360, 40, 14, 36, 30).rotar).toBe(0);
  });
  test('código largo (4 dígitos) sigue alineado a la derecha', () => {
    const corto = Sello.posicion(caja, 0, 40, 14, 36, 30);
    const largo = Sello.posicion(caja, 0, 50, 14, 36, 30);
    expect(largo.x + 50).toBe(corto.x + 40);
  });
});
