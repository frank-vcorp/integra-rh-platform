# DICTAMEN TÉCNICO: Riesgos Forenses y Operativos de Armados PDF Cliente
- **ID:** FIX-20260319-01
- **Fecha:** 2026-03-19
- **Solicitante:** INTEGRA
- **Estado:** ✅ VALIDADO

### A. Análisis de Causa Raíz
La SPEC de Armados define correctamente la intención editorial: borrador interno, publicación explícita, historial y visibilidad controlada. El problema forense no está en la intención sino en los huecos operativos que todavía permitirían romper esa separación si se implementa sobre el flujo actual.

**Hallazgos principales:**
1. **Existe un bypass legado hacia cliente**: hoy el portal cliente sigue descargando el PDF desde `process.archivoDictamenUrl` cuando el proceso está finalizado. Eso significa que, si la nueva entidad `processReportVersions` convive con el campo legado sin un corte estricto, el cliente podría seguir viendo un PDF fuera del nuevo ciclo editorial.
2. **La UX interna ya expone recuperación/generación directa de PDF en ProcesoDetalle**: el expediente actual conserva acciones de recuperación de PDF final en el flujo operativo. Si Armados no centraliza la única fuente de verdad, habrá dos caminos válidos para producir/compartir artefactos distintos.
3. **La SPEC pide snapshot al generar, pero no fija inmutabilidad verificable**: no se define `snapshotData`, `snapshotHash`, versión de plantilla ni referencia a assets embebidos. Sin eso, una versión puede decir “v1” pero depender de datos vivos, URLs reescritas o plantillas cambiadas después.
4. **No hay blindaje transaccional suficiente para publicar**: la regla “una sola versión published” está descrita, pero no queda cerrada con transacción, bloqueo o índice que impida doble publicación concurrente.
5. **La auditoría propuesta es insuficiente para cadena de custodia completa**: eventos de generated/published/archived ayudan, pero faltan destinatario de envío, canal, hash del archivo, requestId, actor efectivo, versión reemplazada y evidencia de acceso del cliente.

**Segunda opinión Qodo:** se intentó ejecutar análisis forense no interactivo, pero la herramienta quedó bloqueada por límite de uso del entorno y no produjo reporte utilizable.

### B. Justificación de la Solución
No corresponde corregir código todavía; corresponde endurecer la SPEC antes de construir. La solución mínima es convertir `processReportVersions` en la única autoridad de publicación y exigir inmutabilidad comprobable, controles transaccionales y auditoría de cadena de custodia. Sin eso, el riesgo no es “un bug menor”: es entregar al cliente un documento incorrecto o no trazable.

### C. Instrucciones de Handoff para INTEGRA
1. Declarar explícitamente que el portal cliente **deja de leer** `process.archivoDictamenUrl` y solo puede resolver la versión vigente publicada desde `processReportVersions`.
2. Extender la SPEC con un modelo de snapshot inmutable: `snapshotData` o referencia persistente al payload renderizado, `snapshotHash`, `templateVersion`, `fileHash`, `generatedFromProcessUpdatedAt`.
3. Exigir publicación transaccional e idempotente: `SELECT ... FOR UPDATE` o equivalente, índice/constraint para una sola versión vigente y operación atómica archive+publish.
4. Definir permisos separados: generar borrador, publicar, enviar al cliente, reenviar, descargar historial.
5. Completar auditoría: generación, publicación, despublicación lógica, envío, acceso cliente, intento fallido, actor, requestId, canal, destinatario, hash y versión afectada.
6. Cerrar comportamiento de envío: “Enviar al cliente” debe apuntar siempre a una versión publicada específica y registrar qué versión se envió; nunca al “último PDF disponible”.
7. Añadir validaciones de producción antes de construir: pruebas de concurrencia al publicar, prueba de no exposición de draft, prueba de reemplazo de versión visible, prueba de historiales, prueba de token/ownership cliente.