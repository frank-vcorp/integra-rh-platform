# DICTAMEN TÉCNICO: Revisión forense de Armados cliente/publicación
- **ID:** FIX-20260319-02
- **Fecha:** 2026-03-19
- **Solicitante:** INTEGRA
- **Estado:** ✅ VALIDADO

### A. Análisis de Causa Raíz
El control de acceso nuevo en los endpoints de Armados dentro de `processes.ts` corrige correctamente el rechazo indebido a clientes dueños del proceso y las pruebas agregadas validan ese punto. Sin embargo, el flujo publicado todavía convive con rutas legadas y con un esquema de versionado sin blindaje de unicidad, lo que deja regresiones funcionales y de seguridad abiertas.

**Hallazgos forenses:**

1. **Se mantiene un bypass legado en portal cliente hacia `archivoDictamenUrl`.** La vista cliente ya consulta `getPublishedReportSummary`, pero sigue mostrando una descarga directa basada en `process.archivoDictamenUrl` cuando el proceso está finalizado. En paralelo, `generarDictamen` sigue escribiendo ese campo en el proceso. Resultado: el cliente puede abrir un artefacto legado fuera del ciclo `draft/published`, saltándose la fuente de verdad de Armados y pudiendo ver un documento desactualizado o distinto al publicado oficialmente.

2. **Sigue existiendo una ruta paralela para generar y compartir PDF sin permisos de proceso ni publicación previa.** `surveyorPortal.generateStudyPDF` usa `protectedProcedure`, pero no exige `requirePermission("procesos", "view")` ni `requirePermission("procesos", "edit")` para usuarios internos. Solo valida ownership cuando el actor es cliente. Resultado: cualquier usuario autenticado interno puede generar una URL firmada anual del PDF socioeconómico completo, y además compartirlo por WhatsApp, sin pasar por `processReportVersions` ni respetar la publicación controlada de Armados.

3. **El versionado de Armados no tiene protección contra colisiones concurrentes.** `createProcessReportVersion` calcula `nextVersionNumber` con `select` y luego inserta, pero la tabla nueva no define índice único por `procesoId + versionNumber`. Resultado: dos generaciones simultáneas pueden producir el mismo número de versión, rompiendo historial y trazabilidad editorial.

**Segunda opinión Qodo:** se ejecutó revisión de solo lectura, pero la herramienta no entregó resultado por límite de uso del entorno.

### B. Justificación de la Solución
No apliqué parches de código porque la solicitud fue de revisión forense. El fix de acceso en `processes.ts` está bien encaminado y los tests relevantes pasan, pero los hallazgos anteriores muestran que el sistema todavía no tiene una única autoridad efectiva para exponer PDFs al cliente. La prioridad técnica es eliminar o cerrar las rutas legadas y endurecer el versionado para que el flujo Armados sea realmente canónico.

### C. Instrucciones de Handoff para INTEGRA
1. Retirar del portal cliente cualquier uso de `archivoDictamenUrl` y resolver el botón de descarga solo desde la versión `published` de Armados.
2. Decidir si `generarDictamen` debe dejar de poblar `archivoDictamenUrl` o quedar aislado como artefacto interno no visible para cliente.
3. Endurecer `surveyorPortal.generateStudyPDF` con permisos explícitos de proceso o moverlo fuera de la superficie operativa accesible cuando Armados sea la fuente de verdad.
4. Añadir prueba negativa que garantice que un cliente no ve ningún enlace legado si no existe versión publicada.
5. Añadir restricción de unicidad por `procesoId + versionNumber` y/o crear la versión dentro de una transacción con bloqueo para evitar colisiones concurrentes.
6. Añadir prueba de concurrencia o, como mínimo, una prueba de repositorio que valide la imposibilidad de duplicar `versionNumber` por proceso.