# SPEC: Vincular puestoId al candidato en Flujo Completo (ClienteFormularioIntegrado)

**ID:** ARCH-20260619-01  
**Ruta:** context/SPECs/SPEC-flujo-completo-puesto-candidato.md  
**Fecha:** 2026-06-19  
**Tipo:** FIX (corrección de bug funcional)  
**Severidad:** Media — afecta visibilidad de datos en `/candidatos` y rutas derivadas  
**Reportado por:** Frank (humano)

---

## 1. Contexto y Síntoma

### 1.1 Reporte del usuario

> "En el flujo `https://integra-rh.web.app/flujo-completo`, cuando se genera el proceso al crear el candidato y crear el Puesto, el puesto no se ve reflejado en la tabla de candidatos `https://integra-rh.web.app/candidatos`. Al parecer es solo en ese flujo."

### 1.2 Observación

La tabla `/candidatos` muestra la columna **Puesto** (renderizada por `getPostName(candidate.puestoId)`). Cuando un candidato se crea desde el flujo `ClienteFormularioIntegrado` (`/flujo-completo`), la columna queda vacía (`"-"`), aunque:

- El puesto sí se crea en BD (la columna "Puesto" en `/puestos` lo muestra).
- El proceso sí se crea con el `puestoId` correcto (la columna "Puesto" en `/procesos` lo muestra).
- El flujo sí termina con toast "¡Proceso creado exitosamente!".

El problema **no se replica** en `/flujo-rapido` (`CandidatoFormularioIntegrado.tsx`) ni en `/flujo-puesto` (`PuestoProcesoFlow.tsx`), donde la columna Puesto sí aparece correctamente.

---

## 2. Diagnóstico Técnico (Causa Raíz)

### 2.1 Arquitectura de datos

- Tabla `candidates` (Drizzle): columna `puestoId` opcional (`int("puestoId")`).
- Tabla `processes`: columna `puestoId` obligatoria (`int("puestoId").notNull()`).
- Relación: `candidates.puestoId` se setea como snapshot del puesto asignado al candidato. Se actualiza al asignar/crear el puesto.
- Router `candidates.create` (server/routers/candidates.ts:95): **acepta** `puestoId` opcional.
- Router `candidates.update` (server/routers/candidates.ts:130): **acepta** `puestoId` opcional.

### 2.2 Comparación entre los 3 flujos

| Flujo | Archivo | ¿Setea `puestoId` en candidato? | Mecanismo |
|---|---|---|---|
| `/flujo-rapido` | `CandidatoFormularioIntegrado.tsx` | ✅ Sí | `createPostMutation.onSuccess` → `updateCandidateMutation({ puestoId: data.id })` (FIX-20260219-04) |
| `/flujo-puesto` | `PuestoProcesoFlow.tsx` | ✅ Sí | `createPostMutation.onSuccess` → `updateCandidateMutation({ puestoId: data.id })` (FIX-20260219-03) |
| `/flujo-completo` | `ClienteFormularioIntegrado.tsx` | ❌ **NO** | Solo crea proceso con `puestoId`. Nunca llama `updateCandidateMutation`. |

### 2.3 Evidencia en código

**ClienteFormularioIntegrado.tsx (BUG)** — líneas 134-143, 173-191, 202-228:

```tsx
// Step 2 — Crear candidato: NO se pasa puestoId (correcto, aún no existe)
const createCandidateMutation = trpc.candidates.create.useMutation({
  onSuccess: (data) => {
    setCandidatoId(data.id);
    setStep(3);   // ⬅️ avanza sin guardar referencia para update posterior
  },
  ...
});

// Step 3 — Crear puesto: solo guarda en estado local
const createPostMutation = trpc.posts.create.useMutation({
  onSuccess: (data) => {
    setPuestoId(data.id);
    setStep(4);   // ⬅️ nunca llama candidates.update
  },
  ...
});

// Step 4 — Crear proceso: vincula puestoId al PROCESO, no al CANDIDATO
createProcessMutation.mutate({
  tipoProducto, clienteId: clienteId!,
  candidatoId: candidatoId!,
  puestoId: puestoId!,          // ⬅️ OK para proceso
  clientSiteId: selectedSite ? parseInt(selectedSite) : undefined,
});
```

**Conclusión:** En `/flujo-completo`, después de crear el puesto, **jamás se actualiza el candidato con `puestoId`**. Por eso la tabla `/candidatos` muestra "-" en Puesto, aunque el proceso sí lo tenga correctamente asignado.

### 2.4 Por qué los otros flujos sí funcionan

`CandidatoFormularioIntegrado.tsx` (líneas 161-193) — patrón correcto:
```tsx
const createPostMutation = trpc.posts.create.useMutation({
  onSuccess: (data) => {
    setPuestoId(data.id);
    if (candidatoId) {
      updateCandidateMutation.mutate({
        id: candidatoId,
        data: { puestoId: data.id },  // ⬅️ FIX-20260219-04
      });
    }
  },
});
```

`PuestoProcesoFlow.tsx` (líneas 103-121) — mismo patrón:
```tsx
const createPostMutation = trpc.posts.create.useMutation({
  onSuccess: (data) => {
    setPuestoId(data.id);
    if (candidatoId) {
      updateCandidateMutation.mutate({
        id: parseInt(candidatoId),
        data: { puestoId: data.id },  // ⬅️ FIX-20260219-03
      });
    }
  },
});
```

---

## 3. Alcance de la Corrección

### 3.1 Objetivo

Hacer que `/flujo-completo` vincule el `puestoId` al candidato inmediatamente después de crear el puesto, replicando el patrón ya validado en los otros 2 flujos y eliminando la divergencia entre las 3 rutas.

### 3.2 Criterios de aceptación

1. Al completar `/flujo-completo`, el candidato resultante debe tener `puestoId` distinto de NULL en BD.
2. La columna "Puesto" en `/candidatos` debe mostrar el nombre del puesto creado.
3. La columna "Puesto" en `/procesos` debe seguir funcionando (sin regresión).
4. No debe haber toast de error durante el flujo.
5. El comportamiento debe ser consistente con `/flujo-rapido` y `/flujo-puesto`.
6. Si la actualización del candidato falla, el usuario debe recibir un mensaje claro, pero el puesto y el proceso ya creados **no se deben perder** (no rollback silencioso).

### 3.3 Fuera de alcance

- Refactor mayor de los 3 flujos a un componente compartido.
- Cambios al schema de BD.
- Cambios al backend `candidates.update` (ya soporta `puestoId`).
- Cambios a la lógica de creación de proceso.

---

## 4. Diseño de la Solución

### 4.1 Patrón a aplicar (idéntico a los otros 2 flujos)

En `ClienteFormularioIntegrado.tsx`:

1. **Agregar mutation** `updateCandidateMutation` usando `trpc.candidates.update.useMutation`.
2. **Modificar `createPostMutation.onSuccess`** para que después de `setPuestoId(data.id)` invoque `updateCandidateMutation` con `{ puestoId: data.id }`.
3. **Manejar éxito/error** del update de forma explícita (toast y avance de step solo si el update fue exitoso).

### 4.2 Cambios concretos en `integra-rh-manus/client/src/pages/ClienteFormularioIntegrado.tsx`

#### A. Nueva mutation (insertar después de `createPostMutation`, antes de `createProcessMutation`)

```tsx
const updateCandidateMutation = trpc.candidates.update.useMutation({
  onSuccess: (result) => {
    // FIX-20260619-01: Validar que el candidato tiene puestoId asignado
    if (result.candidate?.puestoId) {
      utils.candidates.list.invalidate();
      toast.success("Puesto asignado al candidato");
      setStep(4);
    } else {
      toast.error("Error: No se asignó el puesto al candidato");
    }
  },
  onError: (error) => {
    toast.error("Error al asignar puesto al candidato: " + error.message);
  },
});
```

#### B. Modificar `createPostMutation.onSuccess` (líneas 134-143)

**Antes:**
```tsx
const createPostMutation = trpc.posts.create.useMutation({
  onSuccess: (data) => {
    setPuestoId(data.id);
    toast.success("Puesto creado exitosamente");
    setStep(4);   // ⬅️ avanzar sin verificar candidato
  },
  ...
});
```

**Después:**
```tsx
const createPostMutation = trpc.posts.create.useMutation({
  onSuccess: (data) => {
    setPuestoId(data.id);
    toast.success("Puesto creado exitosamente");

    // FIX-20260619-01: Actualizar candidato con el puestoId recién creado
    if (candidatoId) {
      updateCandidateMutation.mutate({
        id: candidatoId,
        data: { puestoId: data.id },
      });
    } else {
      toast.error("Error: No se tiene ID del candidato");
    }
  },
  ...
});
```

#### C. Ajustar el botón submit de Step 3 para esperar ambas mutations

Línea 501: `disabled={createPostMutation.isPending}`

**Después:**
```tsx
disabled={createPostMutation.isPending || updateCandidateMutation.isPending}
```

#### D. Resumen de Step 4 — línea 637 (cosmético, opcional)

Mantener tal cual. El puesto sigue mostrándose por ID en el resumen. Opcional: mostrar el nombre del puesto, pero requiere query extra y no es parte del bug.

---

## 5. Validaciones Requeridas para SOFIA

Después de implementar, SOFIA debe ejecutar:

```bash
# 1. Type-check
cd integra-rh-manus && pnpm tsc --noEmit

# 2. Lint
cd integra-rh-manus && pnpm lint

# 3. Build
cd integra-rh-manus && pnpm build
```

Y antes de commitear:

```bash
qodo self-review
```

---

## 6. Plan de Prueba Manual (QA)

Una vez desplegado el fix en `integra-rh.web.app`:

1. **Login** como usuario con permiso `candidatos:create`, `puestos:create`, `procesos:create`.
2. Ir a `/flujo-completo`.
3. **Step 1 — Cliente:** Llenar Nombre Empresa, Reclutador, Email, Teléfono → "Continuar a Candidato".
4. **Step 2 — Candidato:** Llenar Nombre Completo, Teléfono, Medio de Recepción; seleccionar Analista Responsable; opcionalmente seleccionar Plaza → "Continuar a Puesto".
5. **Step 3 — Puesto:** Llenar Nombre del Puesto → "Continuar a Proceso".
   - **Verificar:** aparece toast "Puesto creado exitosamente" seguido de "Puesto asignado al candidato" (NO toast de error).
6. **Step 4 — Proceso:** Seleccionar tipo de proceso → "Finalizar y Crear Proceso".
   - **Verificar:** toast "¡Proceso creado exitosamente!" y redirección a `/procesos`.
7. **Ir a `/candidatos`** y buscar el candidato recién creado.
   - **Verificar:** la columna "Puesto" muestra el nombre del puesto (no "-").
8. **Ir a `/procesos`** y abrir el proceso recién creado.
   - **Verificar:** la columna "Puesto" sigue mostrando el nombre (sin regresión).
9. **Ir a `/puestos`** y verificar que el puesto aparece con el cliente correcto.

### Casos de borde

- **C-1:** Crear un candidato en `/flujo-completo`, luego asignarlo manualmente a otro puesto desde `/candidatos` (modal editar) → debe persistir.
- **C-2:** Verificar que un candidato creado por `/flujo-rapido` o `/flujo-puesto` sigue mostrando correctamente su Puesto en `/candidatos` (no regresión).

---

## 7. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| `updateCandidateMutation` falle tras crear puesto | Baja | El candidato quedaría sin puesto en `/candidatos`, pero con puesto en `/procesos` (estado actual = bug) | Toast de error explícito + usuario puede reasignar manualmente desde `/candidatos` |
| Doble update del candidato | Baja | Doble invalidación de cache | Solo se invoca una vez desde `createPostMutation.onSuccess` |
| Race condition con `invalidate` | Muy baja | UI desactualizada un instante | `utils.candidates.list.invalidate()` se llama en `onSuccess` del update |

---

## 8. Trazabilidad

- **ID decisión:** ARCH-20260619-01
- **Origen reporte:** conversación con usuario humano el 2026-06-19
- **Archivos afectados:** `integra-rh-manus/client/src/pages/ClienteFormularioIntegrado.tsx` (único)
- **Líneas estimadas modificadas:** ~25 líneas (insert mutation + modificar `createPostMutation.onSuccess` + ajustar botón)
- **FIX histórico relacionado:** FIX-20260219-03 (PuestoProcesoFlow), FIX-20260219-04 (CandidatoFormularioIntegrado). Esta SPEC sigue el mismo patrón ya validado.

---

## 9. No-Objetivos (explícitos)

- No se refactorizará `ClienteFormularioIntegrado.tsx` para extraer componentes compartidos con los otros 2 flujos. Eso será una SPEC aparte si el equipo lo decide.
- No se cambiará el orden de los steps (Cliente → Candidato → Puesto → Proceso).
- No se modificará el backend.
- No se cambiará la tabla de `/candidatos` ni su query.