# Matriz ISO/IEC 25010 (modelo de calidad del producto, edición 2023)

Estado: ✅ cumplido y verificado · 🟡 implementado, falta verificar en el entorno real · ⏳ pendiente de terceros (TI / Gestión Documental).
Fecha de corte: 2026-10-20. Cobertura de pruebas automáticas: 75 pruebas; `domain/` ≈ 100 % de líneas.

## 1. Adecuación funcional
| Requisito | Evidencia | Estado |
|---|---|---|
| Código único `YY-NNN`, sin repetidos ni saltos (RF-002, RN-001/003) | `SecuenciaService` + lock; `tests/secuencia.service.test.js`, `operacion.service.test.js` ("sin saltos") | ✅ |
| Estampar el código arriba a la derecha (RF-003) | `domain/sello.js`, `PdfService`; `sello.test.js`, `pdf.service.test.js`; PDF verificado en Drive | ✅ |
| Guardar con nombre `TYC-Correspondencia …` en la carpeta correcta (RF-004) | `Codigo.nombreArchivo`, `DriveService`; prueba real 26-001/26-002 | ✅ |
| Registro de todos los códigos (RF-005) | Hoja `Operaciones`; `registro` verificado en Sheet | ✅ |
| No consumir código si falla (RF-006, RN-007) | `operacion.service.test.js` (PDF roto, Drive caído, Sheets caído) | ✅ |
| Excepciones con trazabilidad (RF-007, RN-008) | `ExcepcionService`; `fase4.test.js` | ✅ (probar en navegador) 🟡 |
| Búsqueda por código/fecha/tipo (RF-008) | `Busqueda`; `fase4.test.js` | ✅ (probar en navegador) 🟡 |
| Envío del ejemplar de entrega por correo a la dirección que escribe el usuario (RF-009) | `CorreoService`; `tests/correo.test.js`; interruptor `CORREO_HABILITADO` | ✅ código · 🟡 probar envío real · ⏳ aprobación TI/DLP |

## 2. Eficiencia de desempeño
| Medida | Evidencia | Estado |
|---|---|---|
| Proceso de un caso ≈ 3 s (línea base: 15–45 min) | Ejecución `pruebaOperacion` y formulario real | ✅ |
| Lock corto, PDFs de uno en uno; `Config` en caché 60 s | `SecuenciaService`, `ConfigRepo` | ✅ |
| Soportar 300 radicados/mes (RNF-003) | ≈ 3 s × 300 = 15 min de proceso en un mes; el lock admite ~20/min | 🟡 prueba de carga pendiente |
| Búsqueda paginada (20 por página) | `Busqueda.paginar` | ✅ |
| Límite de tamaño del PDF (10 MB configurable) | `Reglas.validarEntrada`; PDF pesado real | 🟡 probar con ~10 MB |

## 3. Compatibilidad
| Medida | Evidencia | Estado |
|---|---|---|
| Solo servicios de Google Workspace; sin CDN ni librerías remotas | ADR 0002/0003 | ✅ |
| Manifest explícito (V8, scopes mínimos) | `src/appsscript.json` | ✅ |
| Navegadores (Chrome/Edge/Safari) y móvil | — | 🟡 probar |

## 4. Capacidad de interacción (usabilidad)
| Medida | Evidencia | Estado |
|---|---|---|
| Flujo guiado en 3 pasos, validación en línea, mensajes en español | `pages/operacion.html`, `scripts/operacion.html` | ✅ |
| Accesibilidad (WCAG 2.2 AA): etiquetas, foco visible, `aria-live`, objetivos ≥ 44 px, saltar al contenido | revisión de código | 🟡 auditar con lector de pantalla y contraste |
| Prevención de errores: confirmación previa, botón bloqueado al enviar, anular exige casilla | UI | ✅ |
| Responsive (móvil primero) | clases `sm:`/`lg:` | 🟡 probar en celular |

## 5. Fiabilidad
| Medida | Evidencia | Estado |
|---|---|---|
| Transacción bajo lock con compensación (archivo a papelera, número devuelto) | `OperacionService`; pruebas de fallo inyectado | ✅ |
| Detección de inconsistencias (contador ≠ máximo) y bloqueo | `Reglas.validarContador` | ✅ |
| Validación diaria de la secuencia y Panel | `triggers.js`, `SecuenciaService.verificar` | ✅ (instalar trigger) |
| Reservas atascadas: detección y resolución | `MantenimientoService`; pruebas | ✅ |
| Concurrencia real (2 usuarios a la vez) | `LockService` | 🟡 prueba manual pendiente |

## 6. Seguridad
| Medida | Evidencia | Estado |
|---|---|---|
| Autenticación del dominio; auditoría por usuario | `access: DOMAIN`, `USER_ACCESSING`, hoja `Auditoria` | ✅ |
| Mínimo privilegio: scopes explícitos y mínimos (`script.send_mail` solo envía; un solo destinatario validado, sin listas ni cabeceras inyectadas; dominios permitidos opcionales) | `appsscript.json` | ✅ |
| Validación de entrada: tipo, tamaño, cabecera `%PDF-`, PDF legible; nombre de archivo del usuario nunca se usa para guardar | `Reglas`, `PdfService.validar` | ✅ |
| Sin XSS: datos pintados con `textContent`; sin `innerHTML`/`eval` | revisión de `src/` | ✅ |
| CSV sin inyección de fórmulas | `Csv`; `fase4.test.js` | ✅ |
| Roles para excepciones; no se borra nada de `Operaciones` (salvo reservas sin completar, auditado) | `ExcepcionService`, `OperacionesRepo.eliminar` | ✅ |
| Integridad: hash SHA-256 del PDF original y estampado | `OperacionService` | ✅ |
| Sin PII en registros: no se escribe contenido de PDF; errores genéricos al cliente | `errorParaCliente_` | ✅ |
| Editor del Sheet puede alterar registros a mano (modelo `USER_ACCESSING`) | ADR 0004 | ⏳ decisión TI |
| DLP, tratamiento de datos personales (Ley 1581 de 2012), aprobación de pdf-lib | — | ⏳ TI / Gestión Documental |

## 7. Mantenibilidad
| Medida | Evidencia | Estado |
|---|---|---|
| Capas separadas, módulos con una responsabilidad | ADR 0005; estructura `src/` | ✅ |
| Pruebas automáticas y umbral de cobertura (≥ 90 % en `domain/`) | `npm run coverage` | ✅ |
| Lint (ESLint 9) y formato (Prettier) | `npm run check` | ✅ |
| Decisiones y requisitos documentados | `docs/adr/`, `requisitos-actualizados.md`, README | ✅ |

## 8. Flexibilidad (antes portabilidad)
| Medida | Evidencia | Estado |
|---|---|---|
| Parámetros en `Config` (ambiente, carpeta raíz, sello, tamaño máximo, autorizados) sin tocar código | `Constantes.CONFIG_INICIAL`, `ConfigRepo` | ✅ |
| Cambio de carpeta de pruebas a producción sin redeploy | `DRIVE_RAIZ_ID` | ✅ |
| Repositorios aíslan Sheets (migrable a otra BD) | `repositories/` | ✅ |

## 9. Seguridad funcional (safety)
No aplica: el sistema no controla procesos físicos ni puede causar daño a personas.
