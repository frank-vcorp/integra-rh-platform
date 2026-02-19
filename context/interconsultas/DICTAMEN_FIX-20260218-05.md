# DICTAMEN TÉCNICO: Campo "Analista Asignado" no se muestra en ProcesoDetalle.tsx

**ID:** FIX-20260218-05  
**Fecha:** 2026-02-19  
**Solicitante:** SOFIA (Investigación de campo)  
**Estado:** ✅ VALIDADO - Causa Raíz Identificada  

---

## A. ANÁLISIS DE CAUSA RAÍZ

### Síntoma
El campo "Analista asignado" en **ProcesoDetalle.tsx** muestra "SIN ASIGNAR" a pesar de que:
- El backend heredó correctamente `analistaAsignadoId` del candidato (processes.ts:196)
- El backend retorna `responsableName` mediante LEFT JOIN con tabla `users` (db.ts:725)
- El deploy fue exitoso (build d6412480: SUCCESS)
- En la lista de procesos (Procesos.tsx) SÍ aparece el nombre del responsable

### Hallazgo Forense

**CONFUSIÓN SEMÁNTICA EN LA TABLA PROCESSES:**

La tabla `processes` tiene DOS campos completamente diferentes (drizzle/schema.ts:416-419):

```typescript
// Especialista de atracción que gestiona el RECLUTAMIENTO
especialistaAtraccionId: int("especialistaAtraccionId"),
especialistaAtraccionNombre: varchar("especialistaAtraccionNombre", { length: 255 }),

// Analista asignado RESPONSABLE del PROCESO (hereda del candidato)
analistaAsignadoId: int("analistaAsignadoId"),
```

**El Bug:**

En **ProcesoDetalle.tsx** línea 286-287:
```typescript
especialistaAtraccionId: (process as any).especialistaAtraccionId
  ? String((process as any).especialistaAtraccionId)
  : "",
```

Y línea 451 muestra estado basado en `panelForm.especialistaAtraccionId`.

**El Problema:**
- ProcesoDetalle está mostrando el CAMPO EQUIVOCADO
- `especialistaAtraccionId` = Especialista de ATRACCIÓN (reclutamiento)
- Debería mostrar `analistaAsignadoId` / `responsableName` = Analista RESPONSABLE del evaluación

### Verificación de Flujo

| Componente | Campo | Valor | Estado |
|-----------|-------|-------|--------|
| **db.ts: getProcessById()** | Retorna `...row.processes` | `analistaAsignadoId` ✓ | ✅ Incluido |
| **db.ts: getProcessById()** | Agrega `responsableName` | `row.users?.name` | ✅ Correcto |
| **Procesos.tsx (Lista)** | Muestra `responsableName` | Funciona ✓ | ✅ OK |
| **ProcesoDetalle.tsx** | Lee `especialistaAtraccionId` | Campo equivocado ✗ | ❌ BUG |
| **ProcesoDetalle.tsx** | No lee `responsableName` | Ignorado ✗ | ❌ BUG |

### Causa Raíz

**ProcesoDetalle.tsx está usando el campo SEMANTICAMENTE INCORRECTO:**
- Línea 286: Mapea `especialistaAtraccionId` al panel form
- Línea 451: Muestra estado de `especialistaAtraccionId`
- **Nunca** usa `analistaAsignadoId` ni `responsableName`

Mientras que Procesos.tsx **SÍ** lo hace correctamente (línea 544-545).

---

## B. JUSTIFICACIÓN DE LA SOLUCIÓN

### Causa Confirmada
ProcesoDetalle.tsx debe ser modificado para:
1. **Usar `responsableName`** (el nombre del analista asignado, que viene del backend)
2. **O usar `analistaAsignadoId`** + una búsqueda en usuarios para obtener el nombre
3. **Mantener separado** el `especialistaAtraccionId` (que es otro campo de reclutamiento)

### Opción Recomendada
**Opción 1 (PREFERIDA):** Usar `responsableName` directamente
- El backend ya lo proporciona
- Procesos.tsx ya lo usa exitosamente
- Requiere cambio MÍNIMO en ProcesoDetalle.tsx
- Semanticamente correcto: "Analista Asignado" = `responsableName`

### Pasos del Fix

1. **En el state `panelForm` (línea 240-260):**
   - Agregar campo: `analistaAsignadoId: ""` (guard value)

2. **En el useEffect que carga datos (línea 286-287):**
   - Cambiar de `especialistaAtraccionId` a `analistaAsignadoId`
   - Agregar field `responsableName` para mostrar el nombre

3. **En el render (línea 450-500):**
   - Cambiar condición de `especialistaAtraccionId` a `responsableName`
   - Si no hay `responsableName`, mostrar "Sin asignar"
   - Usar un select de usuarios admin (como en la línea 465) si se quiere editar

4. **En el `getPanelPayload()` (línea 350):**
   - Incluir `analistaAsignadoId` en el payload

---

## C. INSTRUCCIONES DE HANDOFF PARA SOFIA

### Contexto
Este es un **BUG LÓGICO**, no de infraestructura. El backend funciona correctamente. ProcesoDetalle.tsx está usando el valor EQUIVOCADO.

### Archivos a Modificar
- **Archivo:** `/home/frank/proyectos/integra-rh/integra-rh-manus/client/src/pages/ProcesoDetalle.tsx`
- **Líneas:** 240-260 (state), 286-287 (useEffect), 450-500 (render), 350 (payload)

### Criterios de Éxito
1. ✅ ProcesoDetalle.tsx muestra el nombre del "Analista Asignado" (heredado del candidato)
2. ✅ Coincide con lo mostrado en Procesos.tsx (lista)
3. ✅ El campo se actualiza cuando se asigna analista al candidato
4. ✅ Se distingue claramente del "Especialista de Atracción" (reclutamiento)

### Validaciones Previas (Para SOPHIA)
Antes de implementar, verificar:
```bash
# 1. Que getProcessById retorna responsableName
curl -X POST http://localhost:3000/trpc/processes.getById \
  -H "Content-Type: application/json" \
  -d '{"id": <PROCESS_ID>}' \
  | jq '.result.data | {responsableName, analistaAsignadoId}'

# Debe retornar algo como:
# { "responsableName": "Juan Pérez", "analistaAsignadoId": 5 }
```

### Post-Implementación
- Deploy a Cloud Run
- Verificar en UI que "Analista asignado" muestra el nombre correcto
- Comparar con Procesos.tsx para asegurar consistencia

---

## D. RESUMEN TÉCNICO

| Aspecto | Hallazgo |
|--------|----------|
| **Herencia correcta** | ✅ Backend hereda `analistaAsignadoId` del candidato |
| **Serialización correcta** | ✅ backend retorna `responsableName` |
| **Transporte correcto** | ✅ TRPC devuelve objeto completo a cliente |
| **Consumo en Procesos.tsx** | ✅ Usa `responsableName` exitosamente |
| **Consumo en ProcesoDetalle.tsx** | ❌ Usa campo EQUIVOCADO (`especialistaAtraccionId`) |
| **Raíz del problema** | 📌 Confusión semántica entre dos campos: especialista de ATRACCIÓN vs Analista del PROCESO |

---

**Nota:** Este dictamen está listo para que SOPHIA implemente la corrección. La implementación es straightforward; no requiere cambios al backend.
