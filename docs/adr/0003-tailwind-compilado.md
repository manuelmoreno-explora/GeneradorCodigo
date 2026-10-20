# ADR 0003 — Tailwind CSS v4 compilado, no Play CDN

**Estado:** aceptada · **Fecha:** 2026-10-20

## Contexto
La documentación de Tailwind indica que el Play CDN es solo para desarrollo. Apps Script sirve HTML por `HtmlService` dentro de un iframe.

## Decisión
`npm run css:build` compila `tailwind/input.css` con `@tailwindcss/cli` y `tailwind/build.mjs` lo envuelve en `<style>` (`src/frontend/styles/tailwind.generated.html`), incluido con `include()`. Componentes propios con `@utility` (v4) y tokens en `@theme`.

## Consecuencias
- (+) Sin CDN externo (DLP/CSP de TI), CSS mínimo (~20 KB), sin tiempo de compilación en el navegador.
- (−) Hay que ejecutar `npm run css:build` (o `npm run push`) tras cambiar clases; el archivo generado no se edita a mano.
- Los fragmentos incluidos con `include()` **no** evalúan scriptlets; los datos dinámicos se pasan por `window.APP_CONFIG` y se pintan con `textContent` (sin `innerHTML`).
