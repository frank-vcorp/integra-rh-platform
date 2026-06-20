# Checkpoint IMPL-20260619-01 — Fix Flujo Completo vincula puestoId al candidato

**ID:** IMPL-20260619-01
**SPEC origen:** ARCH-20260619-01 (`context/SPECs/SPEC-flujo-completo-puesto-candidato.md`)
**Fecha:** 2026-06-19
**Tipo:** FIX (corrección de bug funcional)
**Agente:** SOFIA (Constructora Principal)
**Severidad:** Media — corregida

---

## 1. Resumen Ejecutivo

Se corrigió el bug en `/flujo-completo` (`ClienteFormularioIntegrado.tsx`) por el cual el candidato quedaba con `puestoId = NULL` tras completar el flujo de 4 pasos, mientras que el puesto sí existía en BD y el proceso sí tenía el `puestoId` correcto. La columna "Puesto" en `/candidatos` mostraba "-".

**Causa raíz:** el flujo no llamaba `trpc.candidates.update` para vincular `puestoId` al candidato tras crear el puesto. Solo creaba el proceso con el `puestoId` correcto.

**Solución:** Se replicó el patrón ya validado en `/flujo-rapido` (FIX-20260219-04) y `/flujo-puesto` (FIX-20260219-03): nueva `updateCandidateMutation` invocada desde `createPostMutation.onSuccess`, con validación del `puestoId` antes de avanzar a Step 4.

---

## 2. Archivos Modificados

### Único archivo tocado (per SPEC)

| Archivo | Líneas modificadas | Tipo |
|---------|-------------------|------|
| `integra-rh-manus/client/src/pages/ClienteFormularioIntegrado.tsx` | 134-152, 154-169, 527 | Modificación + inserción + 1 línea |

**Diff resumido:**

```diff
@@ createPostMutation.onSuccess @@
   const createPostMutation = trpc.posts.create.useMutation({
     onSuccess: (data) => {
       setPuestoId(data.id);
       toast.success("Puesto creado exitosamente");
-      setStep(4);
+
+      // ARCH-20260619-01 / FIX-20260619-01: Actualizar candidato con el puestoId recién creado
+      if (candidatoId) {
+        updateCandidateMutation.mutate({
+          id: candidatoId,
+          data: { puestoId: data.id },
+        });
+      } else {
+        toast.error("Error: No se tiene ID del candidato");
+      }
     },
     ...
   });

+ // ARCH-20260619-01 / FIX-20260619-01: Mutation para vincular puestoId al candidato
+ const updateCandidateMutation = trpc.candidates.update.useMutation({
+   onSuccess: (result) => {
+     // FIX-20260619-01: Solo avanzar a step 4 si candidato fue actualizado con puestoId
+     if (result.candidate?.puestoId) {
+       utils.candidates.list.invalidate();
+       toast.success("Puesto asignado al candidato");
+       setStep(4);
+     } else {
+       toast.error("Error: No se asignó el puesto al candidato");
+     }
+   },
+   onError: (error) => {
+     toast.error("Error al asignar puesto al candidato: " + error.message);
+   },
+ });

@@ Botón submit Step 3 @@
- <Button type="submit" disabled={createPostMutation.isPending}>
+ <Button type="submit" disabled={createPostMutation.isPending || updateCandidateMutation.isPending}>
```

### Líneas exactas modificadas (estado actual del archivo)

- **Líneas 134-152:** `createPostMutation` redefinido. Antes 134-143 (10 líneas). Ahora 134-152 (19 líneas).
- **Líneas 154-169:** `updateCandidateMutation` insertado (16 líneas nuevas).
- **Línea 527:** disabled del botón submit Step 3 extendido con `|| updateCandidateMutation.isPending`.

**Total:** +25 líneas netas, 1 línea reemplazada.

---

## 3. Cambios respecto a SPEC

| Punto SPEC | Implementación | Estado |
|------------|---------------|--------|
| 1. Agregar `updateCandidateMutation` después de `createPostMutation` | Insertado en líneas 154-169 | ✅ |
| 2. Modificar `createPostMutation.onSuccess` (134-143) | Reemplazado por versión que NO avanza a Step 4 e invoca update | ✅ |
| 3. Botón submit Step 3 (línea 501) | Línea 527 ahora `disabled={... \|\| updateCandidateMutation.isPending}` | ✅ |
| Patrón idéntico a `CandidatoFormularioIntegrado.tsx` (161-193) | Mismo shape, misma estructura, misma validación `result.candidate?.puestoId` | ✅ |
| `utils.candidates.list.invalidate()` en onSuccess del update | Incluido | ✅ |
| Toast.success "Puesto asignado al candidato" | Incluido | ✅ |

---

## 4. Validaciones Ejecutadas (Gate 2 y 3)

### 4.1 `pnpm tsc --noEmit`

**Resultado:** ✅ Sin errores en archivos modificados.

```
client/src/pages/ClienteFormularioIntegrado.tsx → 0 errores
```

**Nota:** Existe 1 error de type-check en archivo NO relacionado (`ClienteProcesoDetalle.tsx(243,11): error TS2503: Cannot find namespace 'JSX'`). Es **pre-existente** y ortogonal a esta SPEC:
- Última modificación: commit `0d57a1d refactor(portal-cliente): oculta lista redundante de documentos`.
- Mi `git diff` confirma que mi único cambio es en `ClienteFormularioIntegrado.tsx`.

### 4.2 `pnpm lint`

**Resultado:** ⚠️ **Script no existe en el proyecto.**

```
ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command "lint" not found
```

- No hay script `"lint"` en `integra-rh-manus/package.json`.
- No existe `.eslintrc*` ni `eslint.config.*` en el repo.
- Existe un archivo obsoleto `client/eslint_report.json` (sin config viva).

**Desviación:** No se pudo ejecutar lint porque el proyecto no tiene ESLint configurado. La SPEC lo solicitó pero la infraestructura no existe.

### 4.3 `pnpm build`

**Resultado:** ✅ OK

```
vite v7.1.9 building for production...
✓ 7386 modules transformed.
../dist/public/index.html                     0.91 kB
../dist/public/assets/index-Bbv0Xptp.css    176.38 kB
../dist/public/assets/index-BtIpm3ne.js   2,218.09 kB
✓ built in 9.05s
  dist/index.js  405.2kb
⚡ Done in 19ms
```

### 4.4 `qodo self-review`

**Resultado:** ⚠️ **Herramienta descontinuada por el vendor.**

```
Qodo Command has been sunset and is no longer available.
You can still get automated code reviews by connecting your Git provider
at https://app.qodo.ai. We support GitHub, Bitbucket, GitLab, and Azure
DevOps with automatic reviews on every pull request.
```

- La CLI de Qodo Command (v0.36.0) ya no opera análisis automáticos.
- Qodo sugiere conectar el proveedor Git para code review automático en PRs.

**Desviación:** No se pudo ejecutar self-review porque el vendor discontinuó la herramienta. Auto-revisión manual realizada (ver §5).

---

## 5. Auto-Revisión Manual (sustituye qodo self-review)

### Consistencia con SPEC

- ✅ Patrón idéntico a `CandidatoFormularioIntegrado.tsx:181-193` y `PuestoProcesoFlow.tsx:87-101`.
- ✅ Validación `result.candidate?.puestoId` antes de avanzar a Step 4 (replicada de los otros 2 flujos).
- ✅ `updateCandidateMutation` insertado DESPUÉS de `createPostMutation` y ANTES de `createProcessMutation` (orden de declaración de variables respeta la regla de uso antes de declaración — el `onSuccess` callback se ejecuta en runtime, no en tiempo de declaración, por lo que no hay TDZ).
- ✅ `utils.candidates.list.invalidate()` añadido al `onSuccess` del update (consistente con `createProcessMutation.onSuccess`).
- ✅ `disabled` del botón Step 3 considera ambas mutations pendientes.

### Riesgos revisados

- **Race condition:** El `setStep(4)` se invoca solo desde `onSuccess` del update, evitando que el usuario llegue a Step 4 antes de que el candidato esté actualizado en BD.
- **Doble update:** No se invoca desde otro lugar; el ciclo `createPostMutation → updateCandidateMutation` es único.
- **Pérdida silenciosa:** Si `updateCandidateMutation` falla, el toast.error es explícito y el puesto permanece creado en BD (no hay rollback). El usuario puede reasignar manualmente desde `/candidatos` (modal editar) — coincide con riesgo #1 de la SPEC §7.
- **Error 4xx:** El toast `Error: No se tiene ID del candidato` cubre el caso teórico `candidatoId === null` (no debería ocurrir en este flujo porque Step 2 ya lo setea, pero es defensa explícita).

### Code smells

- Ninguno nuevo introducido. El bloque añadido es estructuralmente idéntico a los otros 2 flujos validados.
- El bloque se beneficiaría del refactor mencionado en la SPEC §9 (extraer hook compartido `usePuestoIdAssignment`), pero ese queda explícitamente fuera de alcance.

---

## 6. Criterios de Aceptación (SPEC §3.2)

| # | Criterio | Estado |
|---|----------|--------|
| 1 | Al completar `/flujo-completo`, candidato tiene `puestoId` ≠ NULL | ✅ (lógica verificada contra misma mutación usada en `/flujo-rapido`) |
| 2 | Columna "Puesto" en `/candidatos` muestra nombre | ✅ (la lista de candidatos consume el mismo campo que ya mostraban los otros flujos) |
| 3 | Columna "Puesto" en `/procesos` sigue funcionando | ✅ (no se tocó `createProcessMutation`) |
| 4 | Sin toast de error durante flujo normal | ✅ (toast.error solo si falla el update) |
| 5 | Consistencia con `/flujo-rapido` y `/flujo-puesto` | ✅ (mismo patrón exacto) |
| 6 | Si update falla, mensaje claro y puesto no se pierde | ✅ (toast.error explícito, sin rollback) |

---

## 7. Plan de QA Pendiente

La SPEC §6 describe el plan de prueba manual. Será ejecutado por QA en `integra-rh.web.app` tras merge:
- Login → `/flujo-completo` → 4 pasos → verificar columna Puesto en `/candidatos` y `/procesos`.

---

## 8. Desviaciones del Protocolo INTEGRA

| # | Desviación | Severidad | Mitigación |
|---|------------|-----------|------------|
| D1 | `pnpm lint` no ejecutable (script inexistente) | Baja | ESLint no está configurado en el repo. Reportado a Frank. |
| D2 | `qodo self-review` no ejecutable (vendor sunset) | Baja | Auto-revisión manual realizada (ver §5). |
| D3 | 1 error TS pre-existente en `ClienteProcesoDetalle.tsx` | Baja | No relacionado a esta SPEC. Reportado a Frank para SPEC aparte. |

---

## 9. Estado y Próximos Pasos

- ✅ Implementación completa
- ✅ Type-check OK (archivo modificado)
- ✅ Build OK
- ⚠️ Lint y qodo no ejecutables (infraestructura)
- ⏸️ **Esperando OK explícito de Frank para commitear y abrir PR.**
- ⏸️ No se solicitó QA aún — primero PR.

---

## 10. Trazabilidad

- **Decisión:** ARCH-20260619-01
- **Implementación:** IMPL-20260619-01 (este checkpoint)
- **Pattern source:** FIX-20260219-03 (PuestoProcesoFlow), FIX-20260219-04 (CandidatoFormularioIntegrado)
- **Archivo único:** `integra-rh-manus/client/src/pages/ClienteFormularioIntegrado.tsx`
- **Política:** Política anti-alucinación respetada (no se agregaron campos fuera de SPEC).
