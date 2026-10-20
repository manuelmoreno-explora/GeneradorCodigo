# ADR 0004 — Ejecución de la Web App y modelo de permisos

**Estado:** aceptada para pruebas; **revisar con TI antes de producción** · **Fecha:** 2026-10-20

## Decisión actual
`executeAs: USER_ACCESSING`, `access: DOMAIN`. Cada usuario ejecuta con su propia cuenta: auditoría por usuario real y permisos nativos de Drive (`obtenerEjemplar` solo abre archivos que el usuario ya puede ver).

## Implicaciones que TI debe conocer
- Cada usuario necesita permiso de **editor** en el Sheet "BD Consecutivos" y en la carpeta TYC (la app escribe con su cuenta).
- Un editor del Sheet podría modificar a mano `Operaciones` o `Secuencias` fuera de la app. Las protecciones de rango no impiden escribir al script que corre como ese usuario. Mitigaciones: validación diaria (`Secuencia.verificar`), verificación contador = máximo antes de cada asignación, auditoría, hash SHA-256 del PDF, y limitar quién edita el Sheet.
- Los mensajeros/terceros externos al dominio no pueden usar la app (solo reciben el ejemplar impreso o, si TI lo aprueba, por correo).

## Alternativa a evaluar: `executeAs: USER_DEPLOYING`
Solo la cuenta de servicio/administradora tiene acceso al Sheet y a Drive; los usuarios solo usan la app. Mayor integridad del registro (nadie edita el Sheet), pero la app pasa a ser la única barrera: habría que agregar lista de usuarios autorizados y control de quién puede descargar cada PDF (hoy lo resuelve Drive). Requiere decisión de TI y Gestión Documental.

## Roles
Usuarios del dominio pueden crear, buscar y ver el Panel. Excepciones, anulaciones y resolución de reservas: solo correos en `Config > EXCEPCIONES_AUTORIZADOS`. Definir con Gestión Documental quién es "jefe de área".
