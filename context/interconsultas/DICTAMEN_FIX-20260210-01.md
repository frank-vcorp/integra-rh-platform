# DICTAMEN TÉCNICO: Campo "Analista Responsable" faltante en flujos de creación de candidatos

- **ID:** FIX-20260210-01
- **Fecha:** 2026-02-10
- **Solicitante:** Frank (usuario directo)
- **Estado:** ✅ VALIDADO

---

## A. Análisis de Causa Raíz

### Síntoma
Al crear candidatos desde cualquier flujo, el backend retorna error 400:
```
Invalid input: expected number, received undefined
path: ['analistaAsignadoId']
```
El usuario confirma que el campo "Analista Asignado" **no aparece** en la interfaz en ninguno de los modos.

### Hallazgo Forense

| Archivo | ¿Tenía el campo? | Estado |
|---------|-----------------|--------|
| `Candidatos.tsx` (Modal) | ✅ Sí (línea 729) | Funcional para creación. El campo existe y se envía correctamente. |
| `CandidatoFormularioIntegrado.tsx` (Flujo Rápido) | ❌ **NO** | El `handleCandidateSubmit` NUNCA incluía `analistaAsignadoId` en el payload. |
| `ClienteFormularioIntegrado.tsx` (Flujo Completo) | ❌ **NO** | El `handleCandidateSubmit` NUNCA incluía `analistaAsignadoId` en el payload. |

### Causa
En la intervención `IMPL-20260209-07` se hizo obligatorio el campo `analistaAsignadoId` en el schema Zod del backend (`server/routers/candidates.ts`, línea 97):
```typescript
analistaAsignadoId: z.number().int().positive(), // OBLIGATORIO
```
Sin embargo, **solo** `Candidatos.tsx` fue actualizado con el selector de analista y la lógica de envío. Los otros dos flujos de creación (`CandidatoFormularioIntegrado.tsx` y `ClienteFormularioIntegrado.tsx`) nunca recibieron la actualización correspondiente.

---

## B. Justificación de la Solución

### Cambios aplicados

**1. `CandidatoFormularioIntegrado.tsx` (Flujo Rápido)**
- Importado `useAuth` para obtener usuario actual
- Agregada query `trpc.users.list.useQuery()` para cargar lista de analistas
- Agregado estado `selectedAnalyst` (pre-selecciona al usuario logueado)
- Validación obligatoria en `handleCandidateSubmit`: si no hay analista → toast de error
- Envío de `analistaAsignadoId: parseInt(selectedAnalyst)` en la mutación
- UI: selector `<Select>` con label "Analista Responsable *" después del campo "Medio de Recepción"
- Botón submit deshabilitado si no hay analista seleccionado

**2. `ClienteFormularioIntegrado.tsx` (Flujo Completo)**  
- Mismos cambios que arriba, adaptados al paso 2 (Candidato) de este flujo
- El selector aparece después del campo de Plaza/CEDI

### Principio aplicado
"Cañón y la Mosca" — solución quirúrgica: solo se agregó lo estrictamente necesario (estado, query, validación, UI) sin refactorizar nada más.

### Validación
- `tsc --noEmit`: 0 errores nuevos en los tres archivos modificados
- Los errores pre-existentes (leaflet types) no están relacionados

---

## C. Instrucciones de Handoff para SOFIA/GEMINI

1. **Build & Deploy:** Reconstruir el frontend (`pnpm build`) y desplegar
2. **Testing manual:** Verificar creación de candidato desde los tres flujos:
   - Modal en `/candidatos` → Ya funcionaba
   - Flujo Rápido (`CandidatoFormularioIntegrado`) → Ahora tiene el campo
   - Flujo Completo (`ClienteFormularioIntegrado`) → Ahora tiene el campo
3. **Regresión:** Verificar que editar candidatos sigue funcionando (el `update` tiene `analistaAsignadoId` como `.optional()`)
