const { crearDepsFalsas } = require('./helpers');
const { SecuenciaService } = require('../src/backend/services/secuencia.service');
const { CorreoService } = require('../src/backend/services/correo.service');

describe('Reglas.validarCorreo', () => {
  test('acepta y normaliza un correo', () => {
    expect(Reglas.validarCorreo('  Persona@Empresa.COM ')).toBe('persona@empresa.com');
  });
  test.each(['', 'sin-arroba', 'a@b', 'a@b.com, c@d.com', 'a@b.com;c@d.com', 'a b@c.com', 'a@b.com\nBcc: x@y.com', '<a@b.com>', null])(
    'rechaza %j',
    (valor) => {
      expect(() => Reglas.validarCorreo(valor)).toThrow(expect.objectContaining({ codigo: 'CORREO_INVALIDO' }));
    }
  );
  test('respeta la lista de dominios permitidos', () => {
    expect(Reglas.validarCorreo('a@parqueexplora.org', 'parqueexplora.org, @otro.com')).toBe('a@parqueexplora.org');
    expect(Reglas.validarCorreo('a@otro.com', 'parqueexplora.org, @otro.com')).toBe('a@otro.com');
    expect(() => Reglas.validarCorreo('a@gmail.com', 'parqueexplora.org')).toThrow(expect.objectContaining({ codigo: 'DOMINIO_NO_PERMITIDO' }));
  });
});

function entorno(config = {}) {
  const f = crearDepsFalsas();
  const r = SecuenciaService.reservar('ENTREGA', 'a@x.org', f);
  SecuenciaService.completar(r, { archivo_id: 'f1' }, 'a@x.org', f);
  const enviados = [];
  const cfg = { CORREO_HABILITADO: 'SI', ...config };
  const d = {
    operaciones: f.operaciones,
    drive: { leer: (id) => [1, 2, 3, id.length] },
    auditoria: f.auditoria,
    cfg: (k, def) => (cfg[k] === undefined ? def : cfg[k]),
    cuota: () => 10,
    adjunto: (bytes, nombre) => ({ bytes, nombre }),
    enviar: (o) => enviados.push(o),
  };
  return { f, d, enviados };
}

describe('CorreoService.enviar', () => {
  test('envía el PDF adjunto desde el usuario y deja auditoría con destinatario', () => {
    const { f, d, enviados } = entorno();
    const r = CorreoService.enviar('26-001', 'ENTREGA', 'Dest@Empresa.com', 'a@x.org', d);
    expect(r.destinatario).toBe('dest@empresa.com');
    expect(enviados).toHaveLength(1);
    expect(enviados[0]).toMatchObject({ to: 'dest@empresa.com', replyTo: 'a@x.org' });
    expect(enviados[0].attachments[0].nombre).toBe('TYC-Correspondencia enviada 26-001.pdf');
    expect(enviados[0].subject).toContain('26-001');
    const aud = f.estado.auditoria.find((a) => a[1] === 'ENVIO_CORREO');
    expect(aud.slice(2)).toEqual(['26-001', 'ENTREGA | dest@empresa.com']);
  });
  test('deshabilitado por configuración', () => {
    const { d, enviados } = entorno({ CORREO_HABILITADO: 'NO' });
    expect(() => CorreoService.enviar('26-001', 'ENTREGA', 'a@b.com', 'a@x.org', d)).toThrow(expect.objectContaining({ codigo: 'CORREO_DESHABILITADO' }));
    expect(enviados).toHaveLength(0);
  });
  test('destinatario inválido o dominio no permitido no envía nada', () => {
    const { d, enviados } = entorno({ CORREO_DOMINIOS_PERMITIDOS: 'parqueexplora.org' });
    expect(() => CorreoService.enviar('26-001', 'ENTREGA', 'x', 'a@x.org', d)).toThrow(expect.objectContaining({ codigo: 'CORREO_INVALIDO' }));
    expect(() => CorreoService.enviar('26-001', 'ENTREGA', 'a@gmail.com', 'a@x.org', d)).toThrow(expect.objectContaining({ codigo: 'DOMINIO_NO_PERMITIDO' }));
    expect(enviados).toHaveLength(0);
  });
  test('solo radicados completados', () => {
    const { f, d } = entorno();
    SecuenciaService.anular({ codigo: '26-001', tipo: 'ENTREGA' }, 'x', 'a', f);
    expect(() => CorreoService.enviar('26-001', 'ENTREGA', 'a@b.com', 'a@x.org', d)).toThrow(expect.objectContaining({ codigo: 'NO_COMPLETADA' }));
    expect(() => CorreoService.enviar('26-099', 'ENTREGA', 'a@b.com', 'a@x.org', d)).toThrow(expect.objectContaining({ codigo: 'NO_COMPLETADA' }));
    expect(() => CorreoService.enviar('xx', 'ENTREGA', 'a@b.com', 'a@x.org', d)).toThrow(expect.objectContaining({ codigo: 'CODIGO_INVALIDO' }));
  });
  test('sin cuota diaria no envía', () => {
    const { d, enviados } = entorno();
    d.cuota = () => 0;
    expect(() => CorreoService.enviar('26-001', 'ENTREGA', 'a@b.com', 'a@x.org', d)).toThrow(expect.objectContaining({ codigo: 'SIN_CUOTA' }));
    expect(enviados).toHaveLength(0);
  });
});
