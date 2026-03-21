# Dictamen de Interconsulta: Auditoría de Arquitectura (Fase 1 Armados)

- **ID de Intervención:** `INFRA-20260320-01`
- **ID de Origen:** `ARCH-20260320-01`
- **Fecha:** 20 de marzo de 2026
- **Agente Auditor:** GEMINI (QA/Infra)
- **Agente Solicitante:** INTEGRA (Arquitecto)
- **Artefactos Auditados:**
    - `integra-rh-manus/server/db.ts` (helpers de `processReportVersions`)
    - `integra-rh-manus/server/routers/processes.ts` (endpoints de `processReportVersions`)
    - `integra-rh-manus/client/src/pages/ClienteProcesoDetalle.tsx` (integración UI cliente)

---

### 1. Resumen Ejecutivo

Se ha auditado la implementación de la entidad `processReportVersions` y su lógica de negocio asociada. La implementación es funcional y cumple con los requisitos básicos de la `SPEC-pdf-dinamico-estudio-cliente.md`. Se establece un flujo claro para la creación de borradores (`draft`), la publicación (`published`) y el archivado de versiones anteriores. La lógica transaccional en `publishProcessReportVersion` es un punto fuerte que previene condiciones de carrera donde múltiples versiones podrían quedar como publicadas.

La exposición de datos al cliente final es segura, filtrando correctamente para mostrar solo las versiones publicadas y proveyendo acceso a través de URLs firmadas de corta duración.

### 2. Hallazgos Críticos

Durante la revisión, se identificaron los siguientes puntos que requieren atención:

| # | Hallazgo | Impacto | Detalle Técnico |
|---|----------|---------|-----------------|
| **H-01** | **Ausencia de borrado físico de PDF en Storage** | **Medio** | La lógica actual no contempla la eliminación del archivo PDF de Firebase Storage cuando una versión del reporte es eliminada o actualizada. Esto genera archivos huérfanos, incrementando costos de almacenamiento y el riesgo de acceso a información desactualizada si una URL antigua es comprometida. |
| **H-02** | **Snapshot de datos es opcional (`nullable`)** | **Bajo** | El campo `snapshot` en `createReportVersion` es opcional. Si no se provee, se pierde la capacidad de auditoría y regeneración del reporte, rompiendo uno de los objetivos clave de la trazabilidad. El reporte dependería de datos "vivos" que pueden cambiar. |
| **H-03** | **Falta de validación de propiedad en publicación** | **Bajo** | El endpoint `publishReportVersion` valida permisos de rol (`admin`), pero no verifica explícitamente que el proceso (`proc`) pertenezca al mismo cliente que el usuario que publica, en un escenario multi-tenant futuro más complejo. La validación actual es suficiente para el modelo de negocio presente, pero es un punto a reforzar. |
| **H-04** | **No se registra el `reportScope` en el log de auditoría** | **Bajo** | Al crear una versión (`createReportVersion`), el `reportScope` (ej. `legacy_visit_pdf`) no se guarda en el `auditLog`. Esto dificulta la depuración y el análisis de qué tipo de reportes se están generando. |

### 3. Riesgos Residuales

- **Acceso a Borradores:** Un error en la lógica del frontend o una modificación no autorizada de la API podría potencialmente exponer versiones en estado `draft` a un cliente, aunque la implementación actual lo previene correctamente.
- **Concurrencia en Creación:** No existe un bloqueo que impida a dos analistas crear un borrador para el mismo proceso casi simultáneamente. Esto no corrompe datos pero puede generar trabajo duplicado.

### 4. Verificación de Soft Gates

| Gate | Estado | Observaciones |
|---|---|---|
| **Compilación** | ✅ **Pasa** | El código compila sin errores en `server` y `client`. |
| **Testing** | ⚠️ **Parcial** | No se han implementado tests unitarios o de integración para los nuevos helpers (`publishProcessReportVersion`) y endpoints. La validación es manual. |
| **Revisión** | ✅ **Pasa** | El código sigue las convenciones del proyecto, es legible y está comentado con las marcas de intervención requeridas. |
| **Documentación** | ✅ **Pasa** | Los helpers y endpoints clave en `db.ts` y `processes.ts` están correctamente documentados con JSDoc y referencian la intervención y el SPEC. |

### 5. Recomendación

**APROBADO CON OBSERVACIONES.**

La implementación es robusta y puede pasar a la siguiente fase. Se recomienda priorizar las siguientes acciones de mitigación en un próximo ciclo de desarrollo:

1.  **Mitigación Inmediata (Recomendado):**
    *   **H-02:** Hacer obligatorio el campo `snapshot` en la validación de Zod para `createReportVersion`. No debe ser `nullable`.
    *   **H-04:** Añadir el campo `reportScope` al objeto `details` del `logAuditEvent` en `createReportVersion`.

2.  **Mitigación a Corto Plazo (Siguiente Sprint):**
    *   **H-01:** Implementar una función (ej. `deleteStorageFile`) que se invoque en un nuevo endpoint `deleteReportVersion` o al actualizar una versión con un nuevo PDF, para eliminar el archivo antiguo de Firebase Storage.
    *   **Testing:** Crear tests unitarios para la función `publishProcessReportVersion` para asegurar que la transacción de archivado y publicación funciona bajo diferentes escenarios.

El resto de los hallazgos son de bajo impacto y pueden ser direccionados a futuro. La arquitectura actual es sólida para continuar con las siguientes fases del proyecto de "Armados".

---

### 6. Seguimiento Posterior de Implementación

Actualización registrada por INTEGRA sobre el mismo hilo técnico:

| Ítem | Estado | Evidencia |
|---|---|---|
| **H-02 Snapshot obligatorio** | **Mitigado** | `snapshot` ya es obligatorio en `createReportVersion` y en `createLegacyReportDraft`. |
| **H-04 reportScope en auditoría** | **Mitigado** | `reportScope` ya se persiste en `logAuditEvent` para creación y acceso de versiones. |
| **Dependencia del PDF legacy** | **Mitigado parcialmente** | El borrador de Armados ya se genera desde renderer editorial por `snapshot` y `sections`, no desde el PDF legacy de visita. |
| **Testing** | **Mejorado parcialmente** | Se agregó prueba unitaria del renderer editorial en `server/utils/estudiosocioPdf.test.ts` con ejecución exitosa. |
| **H-01 Limpieza de storage** | **Mitigado parcialmente** | Ya existe borrado seguro de versiones no publicadas desde Armados, incluyendo intento de eliminación del PDF asociado en Firebase Storage. Sigue pendiente definir política de retención más amplia. |
| **Publicación multi-tenant futura** | **Pendiente** | La validación actual es suficiente para el modelo actual, pero no endurecida para escenarios multi-tenant más complejos. |

#### Validación adicional ejecutada

- Test unitario ejecutado con éxito: `pnpm test -- server/utils/estudiosocioPdf.test.ts`
- Resultado: `1` archivo de prueba aprobado, `2` pruebas aprobadas.