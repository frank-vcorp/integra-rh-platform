# DICTAMEN TÉCNICO: Segunda opinión sobre rediseño de Armados cliente a HTML consultable + impresión
- **ID:** FIX-20260320-02
- **Fecha:** 2026-03-20
- **Solicitante:** INTEGRA
- **Estado:** ✅ VALIDADO

### A. Análisis de Causa Raíz
El modelo actual de Armados ya resolvió una parte crítica del problema: el entregable al cliente no es solo un archivo, sino un artefacto editorial con publicación controlada, versionado e historial. La fricción principal no está en “generar PDF”, sino en que el canal de consumo final sigue acoplado a un PDF estático firmado desde storage, mientras que la experiencia deseada por el cliente necesita lectura navegable, jerarquía visual y exploración por secciones.

**Hallazgos forenses:**

1. **Hoy existe un contrato editorial correcto, pero la experiencia de consumo es pobre para consulta.** La SPEC vigente define borrador, publicación, historial y visibilidad controlada. Eso está alineado con un producto serio para cliente, pero un PDF dibujado manualmente limita navegación, búsqueda, índice profundo, actualización visual y lectura por bloques.

2. **El portal cliente ya está preparado para consumir un artefacto publicado, no necesariamente un PDF.** El detalle de proceso consulta una versión publicada y el router expone resumen y acceso de la versión visible. Eso facilita migrar el “payload publicado” desde un PDF-only a un documento HTML publicado sin romper la regla de que el cliente solo vea la última versión aprobada.

3. **El mayor riesgo del cambio es perder el control editorial, no el render.** Si se reemplaza PDF por HTML sin mantener snapshot, versionado, publicación explícita y trazabilidad, el cliente podría terminar viendo datos vivos del expediente en lugar de una versión editorial cerrada.

4. **Hay dos necesidades distintas y conviene separarlas explícitamente.**
   - Necesidad A: lectura consultable, navegable y clara dentro del portal.
   - Necesidad B: salida fija, compartible e imprimible para archivo o envío formal.
   Un solo PDF intenta cubrir ambas, pero lo hace mal para la primera.

**Segunda opinión Qodo:** se intentó ejecutar una revisión de solo lectura, pero la herramienta no devolvió análisis por límite de uso agotado del entorno.

### B. Justificación de la Solución
La recomendación técnica y de producto es **no eliminar el concepto de versión publicada** y **sí cambiar el formato canónico de lectura hacia HTML publicado a partir de snapshot editorial**. El PDF debe pasar a ser una salida derivada de esa misma versión, no la fuente principal.

Esto permite conservar lo ya correcto del sistema actual:
- publicación controlada
- historial de versiones
- acceso por permisos/ownership
- trazabilidad de secciones incluidas

Y a la vez habilita lo que hoy falta:
- índice navegable
- lectura por bloques
- enlaces internos
- mejor experiencia móvil/escritorio
- impresión/exportación desde una misma fuente visual

### C. Instrucciones de Handoff para INTEGRA
1. Definir el entregable oficial como **"Armado publicado"** y no como **"PDF publicado"**.
2. Mantener snapshot editorial inmutable por versión, aunque la vista final sea HTML.
3. Modelar dos superficies por cada versión publicada:
   - vista HTML consultable
   - salida de impresión/PDF derivada
4. Evitar que la vista HTML lea datos vivos del proceso una vez publicada la versión; debe leer snapshot congelado.
5. Diseñar el índice navegable por secciones con anchors profundos y estado visual de completitud.
6. Conservar publicación explícita, historial visible y auditoría de apertura/descarga.
7. Tratar el PDF como exportación secundaria para archivo, correo o compliance, no como experiencia primaria de lectura.
8. Planear migración gradual: primero coexistencia HTML + PDF, luego evaluar si el PDF manual deja de ser necesario.
