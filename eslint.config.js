const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/**', 'src/libs/**', 'src/frontend/styles/**', 'coverage/**'] },
  {
    files: ['src/backend/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.es2021, Logger: 'readonly', SpreadsheetApp: 'readonly', DriveApp: 'readonly',
        HtmlService: 'readonly', LockService: 'readonly', Session: 'readonly', Utilities: 'readonly',
        PropertiesService: 'readonly', CacheService: 'readonly', GmailApp: 'readonly',
        ScriptApp: 'readonly', PDFLib: 'readonly', module: 'writable',
        Constantes: 'readonly', Codigo: 'writable', ErrorNegocio: 'readonly', ErrorSistema: 'readonly',
        Reglas: 'readonly', ConfigRepo: 'readonly', SecuenciasRepo: 'readonly', OperacionesRepo: 'readonly',
        Auditoria: 'readonly', SecuenciaService: 'readonly', Sello: 'readonly', PdfService: 'readonly',
        DriveService: 'readonly', OperacionService: 'readonly', AuthService: 'readonly', iniciarOperacion: 'readonly', EstadosOperacion: 'readonly',
        Busqueda: 'readonly', Csv: 'readonly', ExcepcionesRepo: 'readonly', ExcepcionService: 'readonly',
        MantenimientoService: 'readonly', CorreoService: 'readonly', MailApp: 'readonly', PanelService: 'readonly', errorParaCliente_: 'readonly' },
    },
    rules: { 'no-unused-vars': 'off', 'no-undef': 'error', eqeqeq: 'error' },
  },
  {
    files: ['tests/**/*.js', 'tailwind/**/*.mjs', 'eslint.config.js'],
    languageOptions: { ecmaVersion: 2022, globals: { ...globals.node, ...globals.jest } },
  },
];
