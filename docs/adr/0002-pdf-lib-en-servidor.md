# ADR 0002 — Estampado del PDF en el servidor con pdf-lib embebido

**Estado:** aceptada (pendiente aprobación de TI) · **Fecha:** 2026-10-20

## Contexto
Apps Script no tiene npm ni una API nativa para editar PDF. Opciones: (a) pdf-lib en el servidor como archivo del proyecto, (b) estampar en el navegador desde un CDN.

## Decisión
Opción (a): `src/libs/pdf-lib.min.js` (versión 1.17.1 fijada) cargado primero por `filePushOrder`. Verificado en Apps Script (`pruebaPdfLib`, `pruebaOperacion`).

- `save({ objectsPerTick: Infinity })`: Apps Script no tiene `setTimeout`.
- pdf-lib es asíncrono y `google.script.run` no espera promesas: `iniciarOperacion` valida y responde con un `opId`; el proceso continúa y el cliente consulta `estadoOperacion` (estado en `CacheService`, 30 min). Verificado con el formulario real.
- Posición: esquina superior derecha del CropBox, con rotación 0/90/180/270 (`domain/sello.js`, probada).

## Consecuencias
- (+) El navegador no manipula el documento oficial; todo queda auditado en el servidor; sin dependencia de CDN.
- (−) Librería de terceros dentro del proyecto: requiere aprobación de TI y revisión de actualizaciones de seguridad.
- (−) Un PDF muy pesado consume tiempo/memoria de Apps Script (límite configurable `TAMANO_MAX_MB`, 10 MB por defecto).
