/** Búsqueda de radicados (RF-008). Las fechas viajan como texto: google.script.run no admite Date. */

/**
 * @param {{codigo?:string,tipo?:string,estado?:string,desde?:string,hasta?:string,pagina?:number}} filtros
 */
function buscarOperaciones(filtros) {
  try {
    AuthService.usuario();
    const f = filtros || {};
    const limpio = {
      codigo: String(f.codigo || '').slice(0, 20),
      tipo: Reglas.TIPOS.includes(f.tipo) ? f.tipo : '',
      estado: Object.keys(Constantes.ESTADOS).includes(f.estado) ? f.estado : '',
      desde: /^\d{4}-\d{2}-\d{2}$/.test(f.desde || '') ? f.desde : '',
      hasta: /^\d{4}-\d{2}-\d{2}$/.test(f.hasta || '') ? f.hasta : '',
    };
    const filtradas = Busqueda.ordenar(Busqueda.filtrar(OperacionesRepo.listarTodas(), limpio));
    const pag = Busqueda.paginar(filtradas, f.pagina);
    pag.filas = pag.filas.map((o) => ({
      codigo: o.codigo, fecha: o.fecha, tipo: o.tipo, estado: o.estado,
      usuario: o.usuario, url: o.archivo_url || '', motivo: o.motivo_anulacion || '',
    }));
    return Object.assign({ ok: true }, pag);
  } catch (e) {
    return errorParaCliente_(e);
  }
}
