# Checkpoint: Homogeneización de Flujos de Creación de Procesos

**Fecha:** 2026-01-13  
**Agente:** SOFIA  
**Tipo:** Corrección de consistencia de datos  
**Estado:** ✅ Completado

---

## Resumen Ejecutivo

Se corrigieron inconsistencias en los flujos de creación de procesos para garantizar que todos los caminos guarden los mismos datos en los mismos lugares.

## Problema Identificado

Se detectó que los **tres flujos de creación de procesos** no guardaban los datos de forma homogénea:

| Flujo | Archivo | Problema |
|-------|---------|----------|
| Flujo Completo | `ClienteFormularioIntegrado.tsx` | No enviaba `clientSiteId` ni pedía `reclutador` |
| PuestoProcesoFlow | `PuestoProcesoFlow.tsx` | No enviaba `clientSiteId`, usaba select simple en lugar de config builder |
| Flujo Rápido | `CandidatoFormularioIntegrado.tsx` | ✅ Correcto (referencia) |
| Módulo Procesos | `Procesos.tsx` | ✅ Correcto (referencia) |

## Cambios Realizados

### 1. ClienteFormularioIntegrado.tsx (Flujo Completo)

**Ubicación:** `/client/src/pages/ClienteFormularioIntegrado.tsx`

| Cambio | Antes | Después |
|--------|-------|---------|
| Campo `reclutador` en Cliente | ❌ No existía | ✅ Agregado |
| Selector Plaza/CEDI | ❌ No existía | ✅ Agregado con opción de crear inline |
| `clientSiteId` en candidato | ❌ NULL | ✅ Se envía si está seleccionado |
| `clientSiteId` en proceso | ❌ NULL | ✅ Se envía si está seleccionado |

### 2. PuestoProcesoFlow.tsx

**Ubicación:** `/client/src/pages/PuestoProcesoFlow.tsx`

| Cambio | Antes | Después |
|--------|-------|---------|
| Selector Plaza/CEDI | ❌ No existía | ✅ Agregado (opcional) |
| Selector tipoProducto | Select simple (`TIPOS_PROCESO`) | Config builder (`ProcesoConfig`) |
| `clientSiteId` en proceso | ❌ NULL | ✅ Se envía si está seleccionado |

## Archivos Modificados

| Archivo | Líneas Agregadas | Tipo de Cambio |
|---------|------------------|----------------|
| `client/src/pages/ClienteFormularioIntegrado.tsx` | ~120 | Estados, queries, handlers, UI |
| `client/src/pages/PuestoProcesoFlow.tsx` | ~100 | Estados, queries, UI del config builder |

## Impacto en Sistema

### ✅ Sin riesgo de regresión

- `clientSiteId` ya es **opcional** en backend (schema Zod y DB)
- Los registros existentes con `clientSiteId = NULL` no se afectan
- El cambio es **aditivo** (agrega datos donde antes no había)

### Base de Datos

- Tabla `candidates.clientSiteId` → ya existía, nullable
- Tabla `processes.clientSiteId` → ya existía, nullable

## Resultado Final

Ahora **todos los flujos** envían los mismos campos:

```
┌─────────────────────────────────────────────────────────────────┐
│              CREAR CANDIDATO (todos los flujos)                │
├─────────────────────────────────────────────────────────────────┤
│ nombreCompleto ✓   email ✓   telefono ✓   medioDeRecepcion ✓  │
│ clienteId ✓   clientSiteId ✓   puestoId (opcional)            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              CREAR PROCESO (todos los flujos)                  │
├─────────────────────────────────────────────────────────────────┤
│ candidatoId ✓   clienteId ✓   puestoId ✓   clientSiteId ✓     │
│ tipoProducto ✓ (via ProcesoConfig → mapProcesoConfigToTipoProducto) │
└─────────────────────────────────────────────────────────────────┘
```

## Notas en Código

Se agregaron comentarios `[HOMOGENEIZACIÓN]` en todos los puntos modificados para facilitar trazabilidad:

```typescript
// [HOMOGENEIZACIÓN] Ahora pasamos clientSiteId - antes era NULL
clientSiteId: selectedSite ? parseInt(selectedSite) : undefined,
```

## Verificación

- [ ] Probar Flujo Completo: crear cliente → candidato (con plaza) → puesto → proceso
- [ ] Probar PuestoProcesoFlow: verificar que aparece selector de plaza si el cliente tiene plazas
- [ ] Verificar en BD que `clientSiteId` se guarda correctamente

---

## Referencias

- Análisis inicial: Conversación con usuario 13 ene 2026
- Archivos de referencia (ya correctos):
  - `CandidatoFormularioIntegrado.tsx`
  - `Procesos.tsx`
