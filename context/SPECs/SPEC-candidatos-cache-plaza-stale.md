# SPEC: Plaza recién creada no aparece en `/candidatos` sin recargar (cache stale)

**ID:** ARCH-20260619-02  
**Ruta:** context/SPECs/SPEC-candidatos-cache-plaza-stale.md  
**Fecha:** 2026-06-19  
**Tipo:** FIX (performance + consistencia de cache)  
**Severidad:** Media — UX rota en flujos que crean plaza inline; el usuario ve "-" hasta recargar  
**Reportado por:** Frank (humano)

---

## 1. Contexto y Síntoma

### 1.1 Reporte del usuario

> "Ahora la plaza en el listado de candidatos tarda en aparecer. Esto porque sucede, tengo que darle recargar a la página para que aparezca."

### 1.2 Reproducción

1. Login como admin.
2. Ir a `/flujo-completo`.
3. **Step 1:** Crear un cliente nuevo (o usar uno existente).
4. **Step 2:** En el selector de "Plaza / CEDI", crear una plaza nueva con el botón "+ Nueva".
5. Completar el flujo hasta el final.
6. Ser redirigido a `/procesos` (automático) **o** ir manualmente a `/candidatos`.
7. **Observar:** la columna "Plaza" del candidato recién creado muestra "-" en vez del nombre de la plaza.
8. **Recargar la página (F5):** la columna Plaza ahora muestra correctamente el nombre.

Mismo síntoma al crear plaza desde `/clientes` o `ClienteWizard.tsx` y luego crear un candidato con esa plaza.

---

## 2. Diagnóstico Técnico (Causa Raíz)

### 2.1 Arquitectura de cache (tRPC + TanStack Query)

En `integra-rh-manus/client/src/pages/Candidatos.tsx`:

```tsx
// Líneas 68-72
const { data: allClientSites = [] } = trpc.clientSites.listAll.useQuery(undefined, {
  enabled: !isClient,
  staleTime: 10 * 60 * 1000,  // 10 minutos: más tiempo sin refetch
  gcTime: 30 * 60 * 1000,     // Mantener en caché 30 minutos
});
```

- `allClientSites` es la **fuente de verdad** para admins que arma `clientSiteMap` (línea 98).
- `clientSiteMap.get(siteId)` lo consume `getSiteName(candidate.clientSiteId)` (línea 244-247).
- Con `staleTime: 10 min`, TanStack Query **NO refetchea** los datos aunque se haya creado una plaza nueva — considera los datos "frescos" durante 10 minutos.

### 2.2 El bug: invalidaciones incompletas

Cuando `/flujo-completo` crea una plaza inline (`ClienteFormularioIntegrado.tsx:108-117`):

```tsx
const createSiteMutation = trpc.clientSites.create.useMutation({
  onSuccess: async (data) => {
    if (clienteId) {
      await utils.clientSites.listByClient.invalidate({ clientId: clienteId });
      // ⬆️ Invalida listByClient, pero NO listAll
    }
    ...
  },
});
```

Mismo patrón incompleto en:
- `Clientes.tsx:195` — `utils.clientSites.listByClient.invalidate({ clientId: sitesClient.id })`
- `ClienteWizard.tsx:113` — `utils.clientSites.listByClient.invalidate({ clientId: data.id })`
- `CandidatoFormularioIntegrado.tsx:107,133` — solo invalida `listByClient`

### 2.3 Resultado

- `clientSites.listAll` (consumido por `Candidatos.tsx`) **no se invalida** → cache stale → `clientSiteMap` no incluye la plaza nueva → `getSiteName` devuelve "-".
- Solo al recargar la página, TanStack Query re-fetchea `listAll` y el map se actualiza.
- `clientSites.listByClient` SÍ se invalida, pero esa query está `enabled: isClient && !!user?.clientId` en `Candidatos.tsx` (línea 75) — para admins **no se ejecuta**, así que la invalidación es no-op.

### 2.4 FIX-20260217-05 (contexto histórico)

Hubo un fix previo que eliminó invalidaciones de `clientSites` y `posts` en `candidates.create` para mejorar performance (1.3s de delay eliminado). Ese fix es válido para el caso "crear candidato usando plaza existente" — esos datos NO cambian. **Pero** cuando se crea plaza+dentro del mismo flujo, sí necesitamos invalidar `listAll`.

---

## 3. Alcance de la Corrección

### 3.1 Objetivo

Cuando se crea una plaza nueva desde cualquier flujo, invalidar **todas las queries de `clientSites`** que `Candidatos.tsx` consume, para que la tabla refleje el nombre de la plaza sin requerir recarga manual.

### 3.2 Criterios de aceptación

1. Tras crear una plaza inline desde `/flujo-completo`, al volver a `/candidatos` la columna "Plaza" muestra el nombre correcto **sin recargar**.
2. Mismo comportamiento desde `/flujo-rapido` y `/flujo-puesto`.
3. Mismo comportamiento desde `/clientes` al crear plaza desde el modal "Plazas / Sucursales".
4. Mismo comportamiento desde `ClienteWizard.tsx` (plazas iniciales + plazas en Step 2).
5. La invalidación NO debe causar refetch innecesario de `listByClient` cuando el usuario es admin (esa query ya está `enabled: false`).
6. Performance: no debe regresarse el FIX-20260217-05 (no invalidar `clientSites` cuando solo se crea/edita candidato sin plaza nueva).

### 3.3 Fuera de alcance

- Cambiar `staleTime` o `gcTime` de `listAll` (sería un parche, no una solución real).
- Refactor del sistema de cache a un patrón más sofisticado.
- Modificar el backend.

---

## 4. Diseño de la Solución

### 4.1 Estrategia: invalidar TODAS las queries de `clientSites`

tRPC `useUtils()` soporta `invalidate()` sin argumentos para invalidar **todas las variantes** de un procedure (todas las queries con distintos inputs se marcan stale y refetchearán al próximo render si están `enabled`).

Reemplazar todas las apariciones de:
```tsx
await utils.clientSites.listByClient.invalidate({ clientId: X });
```

Por:
```tsx
await utils.clientSites.listByClient.invalidate({ clientId: X }); // para el flujo actual
await utils.clientSites.listAll.invalidate();                      // para admin en /candidatos
```

### 4.2 Cambios concretos

#### Archivo 1: `integra-rh-manus/client/src/pages/ClienteFormularioIntegrado.tsx` (línea 111)

**Antes:**
```tsx
const createSiteMutation = trpc.clientSites.create.useMutation({
  onSuccess: async (data) => {
    if (clienteId) {
      await utils.clientSites.listByClient.invalidate({ clientId: clienteId });
    }
    ...
  },
});
```

**Después:**
```tsx
const createSiteMutation = trpc.clientSites.create.useMutation({
  onSuccess: async (data) => {
    if (clienteId) {
      await utils.clientSites.listByClient.invalidate({ clientId: clienteId });
      // FIX-20260619-02: Invalidar también listAll para que /candidatos muestre la plaza nueva
      await utils.clientSites.listAll.invalidate();
    }
    ...
  },
});
```

#### Archivo 2: `integra-rh-manus/client/src/pages/Clientes.tsx` (línea 195)

**Antes:**
```tsx
await utils.clientSites.listByClient.invalidate({ clientId: sitesClient.id });
```

**Después:**
```tsx
await utils.clientSites.listByClient.invalidate({ clientId: sitesClient.id });
await utils.clientSites.listAll.invalidate(); // FIX-20260619-02
```

#### Archivo 3: `integra-rh-manus/client/src/pages/clientes-steps/ClienteWizard.tsx` (líneas 113 y 214)

**Línea 113:**
**Antes:**
```tsx
await utils.clientSites.listByClient.invalidate({ clientId: data.id });
```

**Después:**
```tsx
await utils.clientSites.listByClient.invalidate({ clientId: data.id });
await utils.clientSites.listAll.invalidate(); // FIX-20260619-02
```

**Línea 214:**
**Antes:**
```tsx
utils.clientSites.listByClient.invalidate({ clientId });
```

**Después:**
```tsx
utils.clientSites.listByClient.invalidate({ clientId });
utils.clientSites.listAll.invalidate(); // FIX-20260619-02
```

#### Archivo 4: `integra-rh-manus/client/src/pages/CandidatoFormularioIntegrado.tsx` (líneas 107 y 133)

**Línea 107 (post-creación de cliente con plazas iniciales):**
```tsx
await utils.clientSites.listByClient.invalidate({ clientId: data.id });
await utils.clientSites.listAll.invalidate(); // FIX-20260619-02
```

**Línea 133 (post-creación de plaza inline en Step 2):**
```tsx
await utils.clientSites.listByClient.invalidate({ clientId: parseInt(selectedClient) });
await utils.clientSites.listAll.invalidate(); // FIX-20260619-02
```

### 4.3 Verificación de impacto en performance

- `listAll` está `enabled: !isClient` y `staleTime: 10 min`. Cuando se invalida, solo refetchea si está mounted (`enabled && stale`).
- Para admin en `/candidatos`, la query está mounted → refetch inmediato (~200-400ms con Firestore, aceptable).
- Para usuario `client` en `/candidatos`, `listAll` está disabled → invalidación es no-op (sin impacto).
- Net: 1 query extra de ~300ms al crear plaza, solo para admins en `/candidatos`. Aceptable.

---

## 5. Validaciones Requeridas para SOFIA

```bash
cd integra-rh-manus
pnpm tsc --noEmit
pnpm build
qodo self-review
```

Si todo OK, SOFIA también debe verificar con grep que NO quedó ningún `clientSites.listByClient.invalidate` huérfano sin su contraparte `listAll.invalidate` en los flujos que crean plaza.

---

## 6. Plan de Prueba Manual (QA)

### Caso 1: Flujo completo con plaza nueva

1. Login admin.
2. `/flujo-completo`.
3. Step 1: crear cliente.
4. Step 2: crear plaza nueva con botón "+ Nueva".
5. Completar flujo → redirección a `/procesos`.
6. Ir manualmente a `/candidatos`.
7. **Verificar:** columna "Plaza" del candidato creado muestra el nombre (sin recargar).

### Caso 2: Flujo rápido con plaza nueva

1. `/flujo-candidato`.
2. Step 1: seleccionar cliente.
3. Step 2: crear plaza nueva inline (botón "+ Nueva Plaza").
4. Continuar.
5. Ir a `/candidatos`.
6. **Verificar:** la plaza aparece inmediatamente.

### Caso 3: Crear plaza desde `/clientes`

1. `/clientes`.
2. Click en ícono "Plazas / Sucursales" de un cliente.
3. Agregar plaza nueva.
4. Ir a `/candidatos`.
5. **Verificar:** la plaza existe (no debería afectar candidatos existentes, pero confirma que `listAll` se actualizó).

### Caso 4: No regresión en performance

1. Abrir DevTools → Network.
2. Crear candidato en `/candidatos` (modal normal, sin crear plaza nueva).
3. **Verificar:** NO se hace refetch de `clientSites.listAll` (debe seguir vigente el FIX-20260217-05).

### Caso 5: Cache funciona para admin que NO está en `/candidatos`

1. Login admin.
2. Estar en `/dashboard` (sin `/candidatos` mounted).
3. Otro admin crea plaza desde `/clientes`.
4. Ir a `/candidatos`.
5. **Verificar:** la plaza aparece (la invalidación funcionó).

---

## 7. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Regresión de performance por refetch innecesario | Baja | Latencia de ~300ms al crear plaza | Aceptable: solo afecta admins en `/candidatos`. `staleTime: 10 min` se mantiene. |
| Invalidación en bucle si el backend devuelve error | Muy baja | Refetch constante | Las invalidaciones van dentro de `onSuccess`, no `onError`. Si falla el create, no hay invalidación. |
| Olvidar un lugar con `listByClient.invalidate` | Media | Bug parcial | SOFIA debe ejecutar grep de verificación post-fix |

---

## 8. Trazabilidad

- **ID decisión:** ARCH-20260619-02
- **Origen reporte:** conversación con usuario humano el 2026-06-19
- **Archivos afectados (4):**
  - `integra-rh-manus/client/src/pages/ClienteFormularioIntegrado.tsx` (1 línea)
  - `integra-rh-manus/client/src/pages/Clientes.tsx` (1 línea)
  - `integra-rh-manus/client/src/pages/clientes-steps/ClienteWizard.tsx` (2 líneas)
  - `integra-rh-manus/client/src/pages/CandidatoFormularioIntegrado.tsx` (2 líneas)
- **Líneas estimadas modificadas:** ~6 líneas (1-2 por archivo, aditivas)
- **FIX histórico relacionado:** FIX-20260217-05 (NO invalidar clientSites al crear candidato SIN plaza nueva — sigue vigente). FIX-20260209-01/02 (consolidación de fuentes de datos clientSites).