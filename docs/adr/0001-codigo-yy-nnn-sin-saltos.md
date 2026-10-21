# ADR 0001 — Código `YY-NNN` y "sin saltos": el código solo existe si hay archivo en Drive

**Estado:** aceptada · **Fecha:** 2026-10-20

## Contexto
El riesgo central del proceso son códigos repetidos o saltados (Ficha, RN-003). Una primera versión
reservaba el código y luego procesaba; un fallo dejaba un número anulado y un salto en Drive.

## Decisión
- **Una secuencia por tipo.** Recepción (carpeta `TYC-CORRESPONDENCIA RECIBIDA`) y entrega (`TYC-CORRESPONDENCIA ENVIADA`) llevan contadores independientes por año; la llave de una operación es `{codigo, tipo}`. La hoja `Secuencias` tiene (año, tipo, último, base_inicial). `base_inicial` es el último consecutivo manual previo a la app: el primer código de la app es base+1 y la validación cuenta faltantes solo desde base+1. Se fija con `inicializarConsecutivos()` a partir de `Config` y solo mientras el tipo no tenga radicados en el registro.
- Formato `YY-NNN`: año de 2 dígitos + consecutivo entero con mínimo 3 dígitos, sin tope (`26-999` → `26-1000`). Reinicia el 1 de enero; `000` es semilla y nunca se asigna.
- Transacción con `LockService` tomado de principio a fin: reservar → estampar → guardar en Drive → completar. Antes se valida el PDF **sin** tocar el contador.
- Si algo falla: archivo parcial a papelera y **el número se devuelve** (`SecuenciaService.liberarEnLock`). El intento queda en `Auditoria` sin código.
- `ANULADA` se reserva para anulaciones formales autorizadas (excepciones).
- Antes de cada asignación se comprueba que el contador coincida con el mayor consecutivo registrado; si no, se bloquea (`SECUENCIA_INCONSISTENTE`).

## Consecuencias
- (+) Cada código de la secuencia corresponde a un archivo en Drive; la validación (huecos/duplicados) es auditable.
- (+) Un fallo no deja huellas en la secuencia.
- (−) El lock se mantiene ~3 s por operación: ~20 operaciones/min como máximo, muy por encima de los picos esperados (300/mes).
- (−) Una ejecución cortada por Apps Script puede dejar una fila `RESERVADO`; se detecta y resuelve desde el Panel (`MantenimientoService`).
