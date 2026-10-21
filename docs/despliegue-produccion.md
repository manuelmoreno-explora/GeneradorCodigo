# Paso a producción

Hoy la app corre en **PRUEBAS** (carpeta `1moTBf2EqGkDePp3DoqRyebY8TUU4rtbq`, cuenta `manuel.moreno@parqueexplora.org`).

## 0. Aprobaciones previas (TI / Gestión Documental)
- [ ] pdf-lib 1.17.1 embebido (ADR 0002).
- [ ] Scopes OAuth: `drive`, `spreadsheets`, `userinfo.email`, `script.scriptapp`, `script.send_mail` (solo enviar correos con MailApp; no lee el buzón). Si TI no lo aprueba, quitar el scope del manifest y dejar `CORREO_HABILITADO=NO`.
- [ ] Modelo de ejecución `USER_ACCESSING` vs `USER_DEPLOYING` (ADR 0004) y quién tendrá acceso de editor al Sheet y a la carpeta.
- [ ] DLP y tratamiento de datos personales (Ley 1581 de 2012).
- [ ] Lista de personas autorizadas a excepciones (`EXCEPCIONES_AUTORIZADOS`).

## 1. Cuenta definitiva
1. Crear/mover el proyecto de Apps Script a la cuenta administradora definitiva (o transferir la propiedad) y obtener el nuevo `scriptId`; actualizar `.clasp.json`.
2. `npx clasp login` con esa cuenta y `npm run push`.
3. Ejecutar `setup()`: crea el Sheet "BD Consecutivos" dentro de la carpeta raíz configurada.

## 2. Configuración (hoja `Config`)
| Clave | Producción |
|---|---|
| `AMBIENTE` | `PRODUCCION` (en este modo `setup()` nunca crea carpetas y falla si no existen) |
| `DRIVE_RAIZ_ID` | `1R1P4TtD_1mekDo7taMbJgiZjs3wptNoH` (contiene `TYC-CORRESPONDENCIA RECIBIDA` y `ENVIADA`) |
| `EXCEPCIONES_AUTORIZADOS` | correos de los jefes de área |
| `TAMANO_MAX_MB`, `SELLO_*` | ajustar tras pruebas con documentos reales |
| `CORREO_HABILITADO` | `SI` para mostrar el botón "Enviar por correo" (por defecto `NO`); `CORREO_DOMINIOS_PERMITIDOS` opcional para limitar destinos |

> `setup()` decide la carpeta raíz así: (1) si el Sheet ya existe, el valor `DRIVE_RAIZ_ID` de `Config`; (2) si no, la propiedad del script `DRIVE_RAIZ_ID_INICIAL`; (3) si no, la carpeta de pruebas. En la cuenta definitiva, **antes de ejecutar `setup()`**, crear en el editor (Configuración del proyecto → Propiedades de la secuencia de comandos) la propiedad `DRIVE_RAIZ_ID_INICIAL` = `1R1P4TtD_1mekDo7taMbJgiZjs3wptNoH`, y también `AMBIENTE_INICIAL` = `PRODUCCION` (la hoja `Config` nace en producción y `setup()` nunca crea carpetas: si no encuentra `TYC-CORRESPONDENCIA RECIBIDA` / `ENVIADA` por nombre exacto, falla con un mensaje claro).

## 3. Datos
- [ ] Ejecutar `limpiarDatosDePrueba()` **solo en PRUEBAS**, antes de cambiar `AMBIENTE`. En producción esa función está bloqueada.
- [ ] Consecutivos iniciales (hay radicados manuales este año): en la hoja `Config` poner `CONSECUTIVO_INICIAL_RECEPCION` y `CONSECUTIVO_INICIAL_ENTREGA` = último número ya usado a mano en cada carpeta (21-oct-2026: recibida 134, enviada 567) y ejecutar `inicializarConsecutivos()`. El próximo código será ese número + 1. Verificar con `verificarSecuenciaManual()` o en el Panel.
- [ ] Ejecutar `instalarTriggerValidacion()`.

## 4. Permisos
- [ ] Compartir el Sheet y la carpeta TYC (editor) con quienes usarán la app (si `USER_ACCESSING`).
- [ ] Revisar quién tiene acceso a la carpeta de Drive (el PDF contiene datos personales).

## 5. Despliegue versionado
```
npm run check
npm run push
npx clasp version "v1.0"
npx clasp deploy --description "v1.0 producción"
```
La URL `/exec` queda fija a esa versión. Para actualizar sin cambiar la URL: `npx clasp deploy --deploymentId <ID> --description "v1.1"`.
Compartir la URL del despliegue solo con el dominio (`access: DOMAIN`).

## 6. Pruebas de aceptación en producción
- [ ] HU-001: radicar un PDF → código estampado, archivo en la carpeta correcta, fila en `Operaciones`.
- [ ] HU-002: un fallo (PDF dañado) no consume código.
- [ ] HU-003: búsqueda y Panel → "Validar ahora" en verde.
- [ ] Dos personas radicando a la vez → códigos distintos y consecutivos.
- [ ] PDF escaneado rotado y PDF de ~10 MB.
- [ ] Probar desde un celular.
- [ ] Excepción de prueba (anulación) y validación posterior en verde.

## 7. Operación
- Revisar el Panel a diario (aparece "Última validación automática").
- Reservas atascadas: Panel → "Reservas atascadas" → Resolver.
- Cualquier cambio de código: `npm run check` → `npm run push` → nueva versión y `clasp deploy --deploymentId`.
- Actualizaciones de seguridad de pdf-lib: revisar al menos cada 6 meses y repetir `pruebaOperacion`.
