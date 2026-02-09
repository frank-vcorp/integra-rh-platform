# DICTAMEN TÉCNICO: Campo "Plaza / CEDI" deshabilitado en modal de editar candidato

- **ID:** FIX-20260209-02
- **Fecha:** 2026-02-09
- **Solicitante:** Frank (vía análisis directo)
- **Estado:** ✅ VALIDADO

---

## A. Análisis de Causa Raíz

### Síntoma
El campo Select "Plaza / CEDI" aparece deshabilitado (`disabled`) cuando se abre el modal para **editar** un candidato existente, impidiendo modificar o ver la plaza asignada.

### Hallazgo Forense

**Inconsistencia de fuente de datos entre `clientSitesByClient` y `clientSiteMap`.**

En la consolidación IMPL-20260209-01and se actualizó `clientSiteMap` (línea ~83) para usar el patrón correcto por rol:
```tsx
// clientSiteMap (CORRECTO - ya estaba bien)
const sites = isClient ? clientSitesForClient : allClientSites;
```

Pero `clientSitesByClient` (línea ~74) quedó usando **solo** `allClientSites`:
```tsx
// clientSitesByClient (BUG - solo usa allClientSites)
return allClientSites.filter((s: any) => s.clientId === clientId);
```

### Causa Raíz

La query `allClientSites` tiene `enabled: !isClient`, por lo que:
- **Para usuarios admin:** `allClientSites` se carga → funciona.
- **Para usuarios client:** `allClientSites = []` siempre (query deshabilitada).

Cadena de fallo para usuarios `client`:
1. `handleEdit(candidate)` → `setSelectedClient("5")` ✅ correcto
2. `clientSitesByClient` → filtra de `allClientSites = []` → retorna `[]`
3. Disabled condition: `!selectedClient || !clientSitesByClient.length` → `false || true` → `true`
4. Campo queda deshabilitado ❌

**Nota adicional:** Para admins, el bug no se manifiesta porque `allClientSites` carga correctamente. Sin embargo, existe un edge case de timing donde si el admin abre el modal antes de que la query `listAll` resuelva, el campo aparecería deshabilitado brevemente.

### Archivos afectados

| Archivo | Línea | Función |
|---------|-------|---------|
| `integra-rh-manus/client/src/pages/Candidatos.tsx` | ~74 | `clientSitesByClient` (useMemo) |

---

## B. Justificación de la Solución

### Qué se hizo
Se alineó `clientSitesByClient` con el mismo patrón que ya usa `clientSiteMap`:

```tsx
// ANTES (bug):
return allClientSites.filter((s: any) => s.clientId === clientId);

// DESPUÉS (fix):
const sites = isClient ? clientSitesForClient : allClientSites;
return sites.filter((s: any) => s.clientId === clientId);
```

### Por qué esta solución
1. **Consistencia:** Misma lógica de selección de fuente que `clientSiteMap`
2. **Mínimo impacto:** Solo cambia la fuente de datos del filtro, sin alterar lógica de negocio
3. **Sin regresiones:** Para admins, el comportamiento es idéntico (usa `allClientSites`)
4. **React-safe:** Las nuevas dependencias del memo (`clientSitesForClient`, `isClient`) son estables o derivadas del contexto de auth

### Opciones evaluadas

| # | Opción | Pros | Contras | Decisión |
|---|--------|------|---------|----------|
| 1 | **Alinear fuente con `clientSiteMap`** | Mínimo cambio, consistente, probado | Ninguno | ✅ Elegida |
| 2 | Crear variable unificada `effectiveClientSites` antes de ambos memos | Más DRY, fuente única | Requiere refactorizar 2 memos, más cambios | Descartada (overkill) |
| 3 | Cambiar `disabled` condition para no evaluar `length` en edit mode | Permitiría abrir select vacío | UX confusa si dropdown está vacío | Descartada |

---

## C. Instrucciones de Handoff

### Para Frank / SOFIA
1. **Verificar el fix** abriendo el modal de editar candidato como usuario de rol `client`
2. Confirmar que el campo "Plaza / CEDI" aparece **habilitado** y muestra la plaza actual
3. Verificar que al cambiar el cliente, el campo se actualiza correctamente
4. Verificar que en modo **Crear** (nuevo candidato) el flujo sigue funcionando igual

### Testing manual recomendado
```
✅ Admin: Editar candidato con plaza → campo habilitado, plaza visible
✅ Admin: Editar candidato sin plaza → campo habilitado, placeholder "Selecciona una plaza"
✅ Admin: Editar candidato sin cliente → campo deshabilitado (correcto)
✅ Client: Editar candidato con plaza → campo habilitado, plaza visible
✅ Client: Crear candidato → seleccionar cliente → campo plaza se habilita
```
