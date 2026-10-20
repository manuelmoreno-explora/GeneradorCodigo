# Generador de códigos — Radicación de correspondencia TYC

Web App en Google Apps Script que asigna el código secuencial `YY-NNN` a un PDF, lo estampa en la
esquina superior derecha de la página 1, lo archiva en Drive y deja el registro en Google Sheets.
Proceso dueño: Gestión Documental (Parque Explora). Requisitos: levantamiento interno de Gestión Documental (`agente_claudcompleto.docx`, no incluido en este repositorio)
con los cambios de `docs/requisitos-actualizados.md`.

## Reglas clave
- Código `YY-NNN` (ej. `26-001`); reinicia cada 1 de enero; sin tope (`26-999` → `26-1000`).
- **El código solo existe si el archivo quedó en Drive.** Si algo falla, el número se devuelve; no hay saltos.
- En Drive hay un solo PDF por radicado: `TYC-Correspondencia recibida|enviada YY-NNN.pdf`.
- El ejemplar de entrega (mismo PDF, mismo código) no se guarda: se imprime o descarga.
- `Operaciones` (Sheet) es el registro-evidencia de todos los códigos; "Validar secuencia" detecta huecos y duplicados.

## Estructura
```
src/                 raíz de clasp (lo único que se sube a Apps Script)
  backend/
    domain/          lógica pura y testeable (código, reglas, sello, búsqueda, CSV)
    services/        casos de uso (secuencia, PDF, Drive, operación, excepciones, mantenimiento, panel)
    repositories/    única capa que toca SpreadsheetApp
    api/             funciones expuestas al navegador (google.script.run)
    setup/           setup(), pruebas manuales, triggers
  frontend/          index.html + pages/ components/ scripts/ styles/ (Tailwind compilado)
  libs/pdf-lib.min.js
tailwind/            input.css y build.mjs (genera frontend/styles/tailwind.generated.html)
tests/               Jest (lógica pura y servicios con dependencias simuladas)
docs/                requisitos, ADR, ISO 25010, manual, despliegue
```

## Comandos
```
npm install
npm run check         # lint + tests
npm run coverage      # cobertura del dominio (umbral 90 %)
npm run css:build     # recompila Tailwind (obligatorio tras cambiar clases en frontend/)
npm run push          # compila CSS y sube a Apps Script (clasp push -f)
```
Probar en el editor de Apps Script: **Implementar → Probar implementaciones** (siempre corre el último código).

## Primera puesta en marcha
1. `npx clasp login` con la cuenta dueña del proyecto y `npm run push`.
2. En el editor ejecutar `setup()` y luego `instalarTriggerValidacion()`.
3. Revisar la hoja `Config` (ambiente, carpeta raíz, excepciones autorizadas).

Ver `docs/despliegue-produccion.md` para el paso a producción.
