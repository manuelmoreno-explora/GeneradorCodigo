# ADR 0005 — Capas, scope global de Apps Script y estrategia de pruebas

**Estado:** aceptada · **Fecha:** 2026-10-20

## Decisión
- Capas: `domain` (puro) → `services` (casos de uso) → `repositories` (SpreadsheetApp) → `api` (google.script.run). Solo `repositories` y los `*.deps()` de los servicios conocen servicios de Google.
- Apps Script comparte un único scope global por proyecto: cada módulo es un objeto (`Codigo`, `Reglas`, `SecuenciaService`…) con `var`, y termina con `if (typeof module !== 'undefined') module.exports = …` para poder probarlo con Jest.
- Los servicios reciben sus dependencias por parámetro (`deps`), con valores por defecto reales: en Jest se inyectan repositorios en memoria y un lock falso (`tests/helpers.js`).
- clasp v3 no transpila TypeScript: se usa JavaScript con ESLint 9 y Prettier.

## Consecuencias
- Cobertura de `domain/` ≥ 90 % de líneas (umbral en `package.json`). Los envoltorios de Google se verifican con las funciones manuales de `setup/setup.js` y la prueba en navegador.
- Los nombres de objetos y funciones públicas no deben repetirse entre archivos.
