/** Constantes compartidas del backend (nombres de hojas, estados, claves de Config). */
var Constantes = {
  HOJAS: {
    OPERACIONES: 'Operaciones',
    SECUENCIAS: 'Secuencias',
    EXCEPCIONES: 'Excepciones',
    AUDITORIA: 'Auditoria',
    CONFIG: 'Config',
  },
  ESTADOS: { RESERVADO: 'RESERVADO', COMPLETADA: 'COMPLETADA', ANULADA: 'ANULADA' },
  TIPOS: { RECEPCION: 'RECEPCION', ENTREGA: 'ENTREGA' },
  CARPETAS: {
    RECEPCION: 'TYC-CORRESPONDENCIA RECIBIDA',
    ENTREGA: 'TYC-CORRESPONDENCIA ENVIADA',
  },
  ENCABEZADOS: {
    Operaciones: [
      'fecha', 'anio', 'consecutivo', 'codigo', 'tipo', 'estado', 'archivo_id', 'archivo_url',
      'usuario', 'hash_original', 'hash_estampado', 'motivo_anulacion',
    ],
    Secuencias: ['anio', 'tipo', 'ultimo_consecutivo', 'base_inicial'],
    Excepciones: [
      'fecha', 'codigo', 'tipo', 'descripcion', 'accion_correctiva', 'responsable', 'autorizado_por',
    ],
    Auditoria: ['fecha', 'usuario', 'accion', 'codigo', 'detalle'],
    Config: ['clave', 'valor', 'descripcion'],
  },
  /** Valores iniciales de la hoja Config. DRIVE_RAIZ_ID = carpeta de PRUEBAS; cambiar en producción. */
  CONFIG_INICIAL: [
    ['AMBIENTE', 'PRUEBAS', 'PRUEBAS | PRODUCCION. En PRODUCCION nunca se crean carpetas.'],
    ['DRIVE_RAIZ_ID', '1moTBf2EqGkDePp3DoqRyebY8TUU4rtbq', 'Carpeta raíz con las subcarpetas TYC-CORRESPONDENCIA'],
    ['SELLO_TAMANO', '14', 'Tamaño de fuente del código estampado (pt)'],
    ['SELLO_MARGEN_DER', '36', 'Margen derecho del sello (pt)'],
    ['SELLO_MARGEN_SUP', '30', 'Margen superior del sello (pt)'],
    ['TAMANO_MAX_MB', '10', 'Tamaño máximo del PDF (MB)'],
    ['EXCEPCIONES_AUTORIZADOS', '', 'Correos (separados por coma) que pueden registrar excepciones, anular y resolver reservas'],
    ['CONSECUTIVO_INICIAL_RECEPCION', '0', 'Último consecutivo manual de correspondencia RECIBIDA este año (el próximo será +1). Aplicar con inicializarConsecutivos()'],
    ['CONSECUTIVO_INICIAL_ENTREGA', '0', 'Último consecutivo manual de correspondencia ENVIADA este año (el próximo será +1). Aplicar con inicializarConsecutivos()'],
    ['CORREO_HABILITADO', 'NO', 'SI para mostrar y permitir el envío del ejemplar de entrega por correo'],
    ['CORREO_DOMINIOS_PERMITIDOS', '', 'Opcional: dominios permitidos como destino, separados por coma (vacío = cualquiera)'],
  ],
};

if (typeof module !== 'undefined') module.exports = { Constantes };
