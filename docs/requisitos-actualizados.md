# Cambios al levantamiento de requisitos

Documento base: `requisitos/agente_claudcompleto.docx` (7 oct 2026). Lo siguiente se definió con la
solicitante durante el desarrollo y **sustituye** lo indicado. Actualizar el levantamiento con esto.

## Secciones que cambian

| Sección | Decía | Ahora |
|---|---|---|
| 3.1 / RF-001 | El funcionario adjunta **dos** documentos PDF | Adjunta **un** PDF. Cada documento tiene su propio código único |
| RF-003 / RN-002 / HU-001 | Estampar el mismo código en los **dos** PDF de la operación | Se estampa **un** PDF. El mismo PDF estampado sirve de ejemplar de archivo y de ejemplar de entrega (dos ejemplares, mismo código, para correlacionar lo entregado con lo archivado) |
| RF-004 / RN-004 | Nombre "año (2 dígitos) + consecutivo (3 dígitos)" | `TYC-Correspondencia recibida YY-NNN` (recepción) o `TYC-Correspondencia enviada YY-NNN` (entrega) |
| RF-002 | Secuencia de cinco dígitos | Código `YY-NNN`: año de 2 dígitos + consecutivo de mínimo 3 dígitos, **una secuencia por tipo** (recibida / enviada) |
| RF-009 | Envío automático a un listado de destinatarios | Redefinido: el ejemplar de entrega se **imprime, descarga o se envía por correo** a **una dirección que escribe el usuario** al momento de radicar (opcional, interruptor `CORREO_HABILITADO`). Se envía desde la cuenta del usuario con el PDF adjunto; no se guarda copia y queda en `Auditoria` quién, cuándo y a qué dirección |
| RF-006 / RN-007 | Detener la asignación definitiva si falla algo | Se implementa como: **no se consume ningún código si falla**; el número se devuelve y el intento queda en `Auditoria` sin código |
| 12 (RF-007) | Control digital de excepciones | Se implementa; `ANULADA` queda **solo** para anulaciones formales autorizadas, no para fallos técnicos |

## Contradicciones y preguntas de la sección 13 que se cierran
0. **Dos secuencias independientes (dato de producción, 21-oct-2026)** → correspondencia **recibida** y **enviada** llevan cada una su propio consecutivo por año (ese día: enviada iba en 26-567 y recibida en 26-134). Un mismo código (p. ej. 26-134) puede existir una vez por tipo; se distingue por la carpeta y por el nombre del archivo. La app continúa desde el último número manual de cada tipo (base histórica) y la validación no marca como faltantes los números anteriores a la app.
1. **Estructura del código** → `YY-NNN`, primer código `001`, reinicia cada 1 de enero, `000` reservado como semilla, **sin tope** (tras 999 sigue con 4 dígitos).
2. **Cuáles son los dos documentos** → no son dos: es un documento con dos ejemplares del mismo código.
3. **Sello en papel vs PDF** → el código se estampa en el PDF, parte superior derecha, en el espacio en blanco habitual.
4. **Plataforma oficial** → Google Apps Script + Drive + Sheets (el Excel en SharePoint de la Ficha no se usa).

## Preguntas que siguen abiertas
- Datos personales que contienen los PDF y quién puede verlos; norma aplicable (Ley 1581 de 2012, política interna). **TI / Gestión Documental**
- Aprobación de TI: librería pdf-lib, scopes OAuth, DLP, y envío por correo del ejemplar de entrega.
- Quién es "jefe de área" para autorizar excepciones (lista `EXCEPCIONES_AUTORIZADOS` en `Config`).
- Volumen real: ¿los "7 a 10" son por mes?; ¿los 300 son radicados o documentos?; meses pico.
- Cronometrar un caso real para la línea base (15–45 min estimados) y fijar la meta de tiempo.

## Requisitos nuevos que surgieron
- **RF-010** Validar la secuencia (huecos, duplicados, contador vs registro) bajo demanda y cada día a las 7 a. m.
- **RF-011** Exportar el registro de radicados a CSV.
- **RF-012** Resolver reservas atascadas (proceso cortado a la mitad).
- **RNF-005** El código solo existe si hay un archivo en Drive (sin saltos en la secuencia de Drive).
