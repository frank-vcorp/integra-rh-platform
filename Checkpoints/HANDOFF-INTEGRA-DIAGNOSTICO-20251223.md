# 🚨 HANDOFF A INTEGRA-ARQUITECTO: Diagnóstico de Falla en Sincronización

**Fecha:** 23 de diciembre de 2025, ~07:45  
**De:** SOFIA Builder  
**Para:** INTEGRA-Arquitecto  
**Prioridad:** ALTA - Pérdida de datos en reaberturas

---

## 📋 RESUMEN DEL PROBLEMA

**Lo que pasó:**
1. Candidato abre self-service
2. Llena formulario (datos personales, historial, etc.)
3. Marca "Acepto términos"
4. Presiona "Guardar borrador" o "ENVIAR"
5. **Reabre el enlace**
6. ❌ **Solo se mantiene el checkbox "Acepto términos"**
7. ❌ **Todos los otros datos desaparecen**

**Dato positivo:**
- El consentimiento (aceptoAvisoPrivacidad) SÍ se guarda y se restaura correctamente

---

## 🔧 CAMBIOS IMPLEMENTADOS

### FASE 1: Guardar Aceptación en Autosave ✅
**Archivos modificados:**
- [CandidatoSelfService.tsx](integra-rh-manus/client/src/pages/CandidatoSelfService.tsx)
  - `getDraftPayload()` incluye `aceptoAvisoPrivacidad: aceptoAviso`
  - `handleManualSave()` envía al servidor
  - `useEffect` inicial carga desde BD

- [candidateSelf.ts](integra-rh-manus/server/routers/candidateSelf.ts)
  - Schema `autosave` acepta `aceptoAvisoPrivacidad: z.boolean().optional()`
  - Lógica guarda en `perfilDetalle.consentimiento`

**Líneas clave:**
```typescript
// CandidatoSelfService.tsx línea ~478
const getDraftPayload = () => {
  const payload: any = {
    token,
    candidate: {},
    perfil: {},
    workHistory: jobs.filter((j) => j.empresa.trim() !== ""),
    aceptoAvisoPrivacidad: aceptoAviso, // ← NUEVO
  };

// candidateSelf.ts línea ~180-190
if (input.aceptoAvisoPrivacidad !== undefined) {
  draftPerfil.consentimiento = {
    aceptoAvisoPrivacidad: input.aceptoAvisoPrivacidad,
    aceptoAvisoPrivacidadAt: input.aceptoAvisoPrivacidad ? new Date().toISOString() : undefined,
  };
}
```

### FASE 4: Recargar Datos de BD (AQUÍ ESTÁ EL PROBLEMA) ⚠️
**Archivos modificados:**
- [CandidatoSelfService.tsx](integra-rh-manus/client/src/pages/CandidatoSelfService.tsx)
  - `useEffect` de localStorage ahora SOLO se ejecuta si hay error
  - `useEffect` de data (BD) ahora SIEMPRE carga desde BD

**Código problemático:**
```typescript
// CandidatoSelfService.tsx línea ~253-265
useEffect(() => {
  if (!token) return;
  const saved = localStorage.getItem(`self-service-${token}`);
  if (saved && isError) {  // ← CAMBIO: Solo si hay ERROR
    // ... usar localStorage como fallback
  }
  setHasAttemptedLocalStorage(true);
}, [token, isError]);  // ← CAMBIO: Agregué isError

// CandidatoSelfService.tsx línea ~313-330
useEffect(() => {
  if (!data || !hasAttemptedLocalStorage) return;
  
  // ← NUEVO: Comentario dice "BD es fuente de verdad"
  // Pero esto SIEMPRE carga de BD, sobrescribiendo cambios locales
  
  setFormCandidate({ email: data.candidate.email || "", ... });
  setPerfil({ ...datos de BD... });
  setJobs(...datos de BD...);
}, [data, hasAttemptedLocalStorage]);
```

---

## 🔴 RAÍZ DEL PROBLEMA

**El código actual es:**
1. localStorage se ignora (excepto si hay error de red)
2. BD SIEMPRE gana
3. Pero... **¿qué pasa cuando BD está vacía para el candidato?**

**Escenario real:**
```
Candidato abre formulario por PRIMERA VEZ:
- BD no tiene nada (o datos viejos)
- localStorage tiene sus ediciones actuales
- Pero... localStorage se ignora
- Se carga BD vacía
- ❌ PIERDE TODO

Candidato presiona "Guardar borrador":
- Envía a servidor ✅
- Pero el useEffect que carga BD se ejecuta ANTES
- O hay race condition entre guardar y recargar
```

---

## 🧪 EVIDENCIA

**Screenshot 1 (CandidatoDetalle):**
```
✅ ACEPTO TÉRMINOS (23/12/2025)  ← SÍ aparece
Formulario completado: 52%
```
Esto prueba que aceptoAvisoPrivacidad SÍ se guardó.

**Screenshot 2 (Self-Service reabierto):**
```
FORMULARIO COMPLETADO: 52%
Pero... ¿de dónde viene el 52% si se perdieron todos los datos?
```
Esto sugiere que:
- O hay datos en localStorage
- O hay datos en BD que no estoy viendo

---

## 🎯 HIPÓTESIS DEL ERROR

### Opción A: Race Condition (Muy probable)
```
Timeline:
T1: Candidato guarda → envía autosave al servidor
T2: handleManualSave() se ejecuta
T3: setTimeout 500ms → localStorage.setItem()
T4: Pero ANTES de T3, el useEffect de BD se dispara
T5: useEffect carga desde BD vacía
T6: localStorage nunca se actualiza porque fue sobrescrito
T7: Candidato reabre
T8: BD está actualizada pero localStorage fue borrado
T9: Pero hay un problema en cómo se carga...
```

### Opción B: El autosave NO está guardando perfilDetalle correctamente
```
candidateSelf.autosave envía:
{
  token,
  candidate: { email, telefono },
  perfil: { generales, domicilio, ... },
  workHistory: [],
  aceptoAvisoPrivacidad: true
}

Pero en servidor:
draftPerfil = {
  ...existingPerfil,  ← Esto podría estar vacío
  generales: { ...existingPerfil.generales, ...(input.perfil?.generales || {}) },
  ...
}

¿Se está realmente mergeando correctamente?
```

### Opción C: El localStorage fallback está siendo completamente ignorado
```
Mi cambio: if (saved && isError)
- Si NO hay error de red, localStorage se ignora
- Pero ¿qué pasa si la BD tiene datos parciales?
```

---

## 📊 Cambios Exactos Realizados

### Archivo: CandidatoSelfService.tsx

**Cambio 1 (línea ~253):**
```diff
- useEffect(() => {
+ useEffect(() => {
    if (!token) return;
    const saved = localStorage.getItem(`self-service-${token}`);
-   if (saved) {
+   if (saved && isError) {  // ← NUEVO: Solo si hay error
      try {
        const { formCandidate: fc, perfil: p, jobs: j } = JSON.parse(saved);
-       if (fc?.email || p?.nss || (j && j.length > 0)) {
+       if (fc?.email || p?.nss || (j && j.length > 0)) {
          setFormCandidate(fc);
          setPerfil(p);
          setJobs(j);
```

**Cambio 2 (línea ~313):**
```diff
- useEffect(() => {
-   if (!data || !hasAttemptedLocalStorage || hasLoadedFromStorage) return;
+ useEffect(() => {
+   if (!data || !hasAttemptedLocalStorage) return;
    
-   const hasLocalData = formCandidate.email || perfil.nss || jobs.some(j => j.empresa.trim());
-   if (hasLocalData) return;
    
+   // BD es la fuente de verdad. Siempre cargar de BD primero.
    setFormCandidate({
      email: data.candidate.email || "",
      telefono: data.candidate.telefono || "",
    });
- }, [data, hasAttemptedLocalStorage, hasLoadedFromStorage]);
+ }, [data, hasAttemptedLocalStorage]);
```

### Archivo: candidateSelf.ts

**Cambio en autosave endpoint:**
```diff
  autosave: publicProcedure
    .input(
      z.object({
        token: z.string().min(10),
        candidate: z.object({...}).optional(),
        perfil: z.any().optional(),
        workHistory: z.array(...).optional(),
+       aceptoAvisoPrivacidad: z.boolean().optional(),  // ← NUEVO
      })
    )

+   // Nuevo: guardar consentimiento
+   if (input.aceptoAvisoPrivacidad !== undefined) {
+     draftPerfil.consentimiento = {
+       aceptoAvisoPrivacidad: input.aceptoAvisoPrivacidad,
+       aceptoAvisoPrivacidadAt: input.aceptoAvisoPrivacidad ? new Date().toISOString() : undefined,
+     };
+   }
```

---

## 🔍 LO QUE NECESITAS REVISAR

1. **¿Se está guardando correctamente el perfil en autosave?**
   - Verifica que `draftPerfil` se guarde completo en BD
   - ¿El merge con existingPerfil está funcionando?

2. **¿Hay race condition entre guardar y recargar?**
   - ¿El useEffect de BD se dispara DURANTE el autosave?
   - ¿Debería haber un debounce?

3. **¿Cuál debería ser la lógica correcta?**
   - Opción A: "Si hay cambios en formulario que no fueron guardados, NO sobrescribir con BD"
   - Opción B: "localStorage siempre es fallback, BD siempre es principal"
   - Opción C: "Comparar BD vs localStorage y mergear inteligentemente"

4. **¿El aceptoAvisoPrivacidad está siendo incluido en el autosave correctamente?**
   - Verifica que se envíe en getDraftPayload()
   - Verifica que handleManualSave() lo incluya

---

## 📂 Archivos Afectados

```
integra-rh-manus/
├── client/src/pages/
│   ├── CandidatoSelfService.tsx  ← MODIFICADO (Fase 1 + Fase 4)
│   └── CandidatoDetalle.tsx       ← MODIFICADO (Fase 2, 5)
├── client/src/components/
│   └── ReviewAndCompleteDialog.tsx ← MODIFICADO (Fase 5)
└── server/routers/
    ├── candidateSelf.ts           ← MODIFICADO (Fase 1)
    └── workHistory.ts             ← MODIFICADO (Fase 5)
```

---

## ✅ LO QUE SÍ FUNCIONA

- ✅ Badge "✅ ACEPTO TÉRMINOS" aparece en CandidatoDetalle
- ✅ Consentimiento se guarda en BD (perfilDetalle.consentimiento)
- ✅ Timestamp se registra
- ✅ Fase 5 (capturadoPor) funciona correctamente

---

## ❌ LO QUE NO FUNCIONA

- ❌ Datos del formulario se pierden al reabrir
- ❌ Solo persiste el consentimiento, nada más

---

## 🎯 RECOMENDACIÓN

**Propuesta de fix:**

Revertir la lógica de localStorage/BD a algo como:

```typescript
// Opción 1: Detectar si candidato está editando ACTIVAMENTE
// Si tiene cambios sin guardar → NO cargar BD
// Si no tiene cambios → cargar BD

// Opción 2: Siempre usar localStorage como PRINCIPAL
// Pero sincronizar con BD en background
// BD es fuente de verdad, pero localStorage es caché local

// Opción 3: Especial handling para primera apertura
// Primera vez: cargar BD
// Reaperturas: cargar localStorage si existe, si no BD
```

---

**Esperando tu análisis, INTEGRA.**

Adjunto checkpoints con documentación:
- CHK_2025-12-23_FASE-1-CONSENTIMIENTO-AUTOSAVE.md
- CHK_2025-12-23_FASES-1-5-SINCRONIZACION.md

