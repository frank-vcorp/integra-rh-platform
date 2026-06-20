# DICTAMEN TÉCNICO: Cambio de calificación final no persiste tras confirmar motivo
- **ID:** FIX-20260409-01
- **Fecha:** 2026-04-09
- **Solicitante:** SOFIA
- **Estado:** ✅ VALIDADO

### A. Análisis de Causa Raíz
Síntoma reportado: en ProcesoDetalle el usuario cambia la calificación final, captura el motivo de edición y al pulsar "Confirmar cambio" la calificación visible no cambia.

Hallazgos forenses en código relevante:

1. **El flujo actual del modal sí envía el motivo y la nueva calificación al backend.**
   - En `integra-rh-manus/client/src/pages/ProcesoDetalle.tsx` el botón del modal invoca `updateCalif.mutate(...)` con `id`, `calificacionFinal`, `comentarioCalificacion` y `motivoEdicion`.
   - Referencia: bloque del modal alrededor de líneas 2459-2467.

2. **El backend actual sí valida y persiste la calificación.**
   - En `integra-rh-manus/server/routers/processes.ts`, `updateCalificacion` exige `motivoEdicion` solo si la calificación previa ya estaba asignada y realmente cambia; después ejecuta `db.updateProcess(input.id, updateData)` con `calificacionFinal`.
   - Referencia: líneas 372-424.

3. **No se encontró una segunda escritura backend que revierta `calificacionFinal` después del update.**
   - `db.updateProcess` hace un `UPDATE` directo sobre `processes` sin lógica adicional.
   - Referencia: `integra-rh-manus/server/db.ts`, líneas 842-846.

4. **Sí hay evidencia de que el bug histórico estaba en la UI y fue corregido localmente el 2026-04-08, pero con validación productiva pendiente.**
   - El header de calificación ahora compara contra el valor persistido real (`process.calificacionFinal || "pendiente"`) y no contra la cadena fija `"pendiente"`, para detectar correctamente cambios reales.
   - El diálogo también revierte el draft al cancelar.
   - Referencias: `integra-rh-manus/client/src/pages/ProcesoDetalle.tsx`, líneas 1095-1122 y 2424-2479.
   - Evidencia documental: `context/checkpoints/CHK_2026-04-08_2145_ARCH-20260408-05.md` indica "implementación local completada y validación productiva pendiente".

**Hipótesis principal:** la causa más probable ya no está en el backend ni en el código fuente actual, sino en una **desalineación de despliegue**: el entorno donde hoy se reproduce el problema probablemente sigue sirviendo un bundle/frontend anterior al ajuste del 2026-04-08. Esto cuadra con dos señales: el código fuente actual sí manda y guarda el payload correcto, y el checkpoint explícitamente deja pendiente la validación en producción.

**Hipótesis secundaria:** si el entorno ejecutado sí corresponde al código actual, el defecto restante es de observabilidad del cliente: `updateCalif` no tiene `onError` local en `ProcesoDetalle.tsx`, así que una falla del mutation puede percibirse como "no cambió" sin feedback suficiente al usuario.

Nota forense: se intentó segunda opinión con Qodo CLI, pero la herramienta ya no está disponible en el entorno (sunset), por lo que no fue posible anexar reporte externo.

### B. Justificación de la Solución
La ruta mínima y menos invasiva no es tocar persistencia backend. El backend actual ya:

- recibe `motivoEdicion`,
- valida el caso de edición posterior,
- persiste `calificacionFinal`,
- y registra auditoría `process_score`.

Por eso, la corrección mínima recomendada es:

1. **Verificar/reconstruir/desplegar** el frontend/backend que realmente está sirviendo ProcesoDetalle para asegurar que contenga el ajuste presente en `ProcesoDetalle.tsx`.
2. Como endurecimiento mínimo de código, **agregar `onError` explícito** en el mutation `updateCalif` dentro del cliente para exponer cualquier rechazo real del backend mediante toast y no dejar el fallo como silencioso.
3. Si se quiere blindar regresión, unificar ambos caminos de guardado de calificación en un solo handler reutilizable para evitar divergencia entre el botón directo y el flujo del modal.

### C. Instrucciones de Handoff para SOFIA
1. Confirmar que el entorno donde falla está ejecutando la versión actual de `integra-rh-manus/client/src/pages/ProcesoDetalle.tsx` y `integra-rh-manus/server/routers/processes.ts`.
2. Si producción no tiene ese código, desplegar primero antes de modificar lógica.
3. Si producción sí tiene ese código y el problema persiste, el siguiente parche mínimo debe ser solo de observabilidad en cliente: `onError` en `updateCalif` y, opcionalmente, centralizar el submit en un único handler.
4. Validar después del despliegue con un caso real: cambiar de una calificación ya asignada a otra distinta, capturar motivo, confirmar, recargar la vista y revisar el historial `scoreAudit`.