# 🚀 IMPLEMENTACIÓN COMPLETADA: Fix Sincronización de Datos

**Fecha:** 23 de diciembre de 2025, 08:15  
**Status:** ✅ IMPLEMENTADO Y COMPILANDO  
**Arquitec:** INTEGRA  
**Builder:** SOFIA

---

## 📝 RESUMEN DE CAMBIOS IMPLEMENTADOS

Se han realizados 3 cambios específicos en 2 archivos para resolver la pérdida de datos al reabrir self-service:

### 1️⃣ CAMBIO 1: Cliente envía TODOS los campos (no solo no-vacíos)

**Archivo:** [CandidatoSelfService.tsx](../integra-rh-manus/client/src/pages/CandidatoSelfService.tsx#L451-L522)  
**Líneas:** ~451-522  
**Función:** `getDraftPayload()`

**Antes:**
```typescript
// Enviaba solo campos non-empty:
const generales: any = {};
if (perfil.nss) generales.nss = perfil.nss;  // ❌ Si nss=""? No se envía
if (perfil.curp) generales.curp = perfil.curp;
// ...
if (Object.keys(generales).length > 0) payload.perfil.generales = generales;
```

**Después:**
```typescript
// Envía estructura COMPLETA con todos los campos:
perfil: {
  generales: {
    nss: perfil.nss || "",          // ✅ Se envía como ""
    curp: perfil.curp || "",         // ✅ Se envía siempre
    rfc: perfil.rfc || "",
    // ... todos los campos
  },
  domicilio: { /* ... */ },
  // ... todos los sub-objetos
},
aceptoAvisoPrivacidad: aceptoAviso,  // ✅ Agregado
```

**Beneficio:**
- Servidor recibe estructura completa
- Puede mergear campos vaciados como `""`
- Preserva cambios incluyendo campos que se borraron

---

### 2️⃣ CAMBIO 2: Servidor mergea explícitamente por sección

**Archivo:** [candidateSelf.ts](../integra-rh-manus/server/routers/candidateSelf.ts#L175-L225)  
**Líneas:** ~175-225  
**Función:** `autosave` mutation (endpoint)

**Antes:**
```typescript
// Merge problemático: merge vacío si input.perfil?.generales es undefined
const draftPerfil: any = {
  ...existingPerfil,
  generales: { ...existingPerfil.generales, ...(input.perfil?.generales || {}) },
  // ❌ Si input.perfil?.generales = undefined, mergea con {} vacío
};
```

**Después:**
```typescript
// Merge explícito: solo si la sección se envía
const draftPerfil: any = { ...existingPerfil };

if (input.perfil?.generales) {
  draftPerfil.generales = {
    ...existingPerfil?.generales,
    ...input.perfil.generales,      // ✅ Merge solo si se envía
  };
}
// ... similar para todas las secciones
```

**Beneficio:**
- Merge solo ocurre si cliente envió la sección
- Campos vacíos se guardan como `""`
- Estructura se preserva incluso con valores vacíos

---

### 3️⃣ CAMBIO 3: Cliente prioriza localStorage en sesión actual

**Archivo:** [CandidatoSelfService.tsx](../integra-rh-manus/client/src/pages/CandidatoSelfService.tsx#L300-L414)  
**Líneas:** ~300-414  
**Función:** `useEffect` de carga desde BD

**Antes:**
```typescript
useEffect(() => {
  const hasLocalData = formCandidate.email || perfil.nss || jobs.some(...);
  if (hasLocalData) return;  // ❌ Basado en estado React, no localStorage real
  // ... cargar desde BD
}, [data, hasAttemptedLocalStorage, formCandidate.email, perfil.nss, jobs]);
// ❌ Re-dispara cuando cambian estos valores
```

**Después:**
```typescript
useEffect(() => {
  const hasLocalStorage = !!localStorage.getItem(`self-service-${token}`);
  if (hasLocalStorage) return;  // ✅ Check localStorage real
  
  // Si NO hay localStorage (nueva sesión), cargar desde BD
  setFormCandidate({ email: data.candidate.email || "", ... });
  setPerfil({ ... todos los campos desde BD ... });
  
  // ✅ Cargar consentimiento desde BD
  aceptoAviso: detalle.consentimiento?.aceptoAvisoPrivacidad || false,
}, [data, hasAttemptedLocalStorage, token]);
// ✅ Menos re-disparos, lógica más simple
```

**Beneficio:**
- Detecta localStorage real, no estado React
- Durante sesión: preserva cambios locales
- Nueva sesión: carga BD completa
- Consentimiento se carga correctamente

---

## 🎯 FLUJO RESULTANTE

```
ESCENARIO 1: Primera vez abriendo el enlace
┌─────────────────────────────────────────────────┐
│ 1. Candidato abre self-service URL              │
│ 2. localStorage: vacío (primera vez)            │
│ 3. Fetch BD: getByToken                         │
│ 4. useEffect detecta: hasLocalStorage = false   │
│ 5. Carga desde BD: setFormCandidate, setPerfil  │
│ 6. ✅ Candidato ve formulario con datos previos │
└─────────────────────────────────────────────────┘

ESCENARIO 2: Candidato llena y guarda durante sesión
┌─────────────────────────────────────────────────┐
│ 1. Cambios en input → setFormCandidate, setPerfil │
│ 2. Efecto: localStorage actualiza cada 500ms   │
│ 3. useEffect de BD: detecta hasLocalStorage=true │
│ 4. ✅ NO sobrescribe (preserva cambios)         │
│ 5. Candidato presiona "Guardar borrador"       │
│ 6. getDraftPayload() envía ESTRUCTURA COMPLETA  │
│ 7. Servidor recibe y mergea por sección        │
│ 8. BD actualiza con datos nuevos (completos)   │
│ 9. ✅ Toast: "Borrador guardado"               │
└─────────────────────────────────────────────────┘

ESCENARIO 3: Candidato REABRE el enlace (nueva sesión)
┌─────────────────────────────────────────────────┐
│ 1. Nuevas pestaña/sesión: localStorage limpio  │
│ 2. Fetch BD: getByToken                         │
│ 3. useEffect detecta: hasLocalStorage = false   │
│ 4. Carga desde BD: TODOS los campos + consentimiento │
│ 5. ✅ Candidato ve TODOS sus cambios anteriores │
│ 6. Incluyendo: "Acepto términos" checkbox      │
│ 7. ✅ Nada se pierde                           │
└─────────────────────────────────────────────────┘

ESCENARIO 4: Candidato limpia un campo y guarda
┌─────────────────────────────────────────────────┐
│ 1. Campo "NSS" tenía: "12345678"               │
│ 2. Usuario limpia: NSS = ""                    │
│ 3. "Guardar borrador"                          │
│ 4. getDraftPayload: { generales: { nss: "" } } │
│ 5. Servidor merge: nss: "" (sobrescribe)      │
│ 6. BD guarda con nss: ""                       │
│ 7. Reabre: NSS está vacío ✅ (no hay "12345678") │
└─────────────────────────────────────────────────┘
```

---

## ✅ VERIFICACIÓN

### Compilación
- ✅ [CandidatoSelfService.tsx](../integra-rh-manus/client/src/pages/CandidatoSelfService.tsx) - Sin errores
- ✅ [candidateSelf.ts](../integra-rh-manus/server/routers/candidateSelf.ts) - Sin errores

### Cambios Realizados
- ✅ CAMBIO 1: getDraftPayload() - Estructura completa enviada
- ✅ CAMBIO 2: autosave endpoint - Merge explícito por sección
- ✅ CAMBIO 3: useEffect de carga - localStorage check + consentimiento

---

## 🧪 PLAN DE TESTING

### Test 1: Ciclo Completo de Datos
**Objetivo:** Verificar que datos se guardan y restauran

```
1. [ ] Abrir self-service enlace (primera vez)
2. [ ] Llenar campo NSS: "12345678"
3. [ ] Llenar campo CURP: "ABCD123456HDFABC"
4. [ ] Llenar campo Email: "test@example.com"
5. [ ] Presionar "Guardar borrador"
6. [ ] Verificar: Toast "Borrador guardado"
7. [ ] Esperar 2 segundos
8. [ ] CIERRE NAVEGADOR / sesión completamente
9. [ ] Reabrir mismo enlace (en navegador nuevo o incognito)
10. [ ] VERIFICAR:
    - [ ] NSS: "12345678" ✅ APARECE
    - [ ] CURP: "ABCD123456HDFABC" ✅ APARECE
    - [ ] Email: "test@example.com" ✅ APARECE
```

**Resultado esperado:** Todos los campos restaurados (no solo consentimiento)

---

### Test 2: Consentimiento Persistencia
**Objetivo:** Verificar que checkbox "Acepto términos" se restaura

```
1. [ ] Abrir self-service
2. [ ] Marcar checkbox "Acepto términos" ✅
3. [ ] Presionar "Guardar borrador"
4. [ ] Cerrar sesión/navegador completamente
5. [ ] Reabrir mismo enlace
6. [ ] VERIFICAR:
    - [ ] Checkbox está marcado ✅
    - [ ] Badge "✅ ACEPTO TÉRMINOS" aparece en CandidatoDetalle ✅
```

**Resultado esperado:** Consentimiento se restaura (lo que ya funcionaba)

---

### Test 3: Campos Vaciados se Guardan
**Objetivo:** Verificar que borrar un campo se persist

```
1. [ ] Abrir self-service
2. [ ] Llenar NSS: "12345678"
3. [ ] Guardar
4. [ ] EDITAR: limpiar NSS completamente (dejarlo "")
5. [ ] Guardar nuevamente
6. [ ] Cerrar sesión
7. [ ] Reabrir
8. [ ] VERIFICAR:
    - [ ] NSS está VACÍO ✅ (no muestra "12345678")
```

**Resultado esperado:** Campo vaciado persiste como vacío

---

### Test 4: Cambios Locales durante Sesión
**Objetivo:** Verificar que cambios no se pierden si NO se guarda explícitamente

```
1. [ ] Abrir self-service
2. [ ] Llenar NSS: "abc"
3. [ ] NOTA: NO presionar guardar (solo cambios locales)
4. [ ] Cambiar a otra pestaña
5. [ ] Volver a pestaña del self-service
6. [ ] VERIFICAR:
    - [ ] NSS: "abc" está ahí ✅ (preservado de localStorage)
```

**Resultado esperado:** Cambios locales se preservan sin presionar guardar

---

### Test 5: Múltiples Campos Complejos
**Objetivo:** Test real con múltiples secciones

```
1. [ ] Abrir self-service
2. [ ] Llenar:
    - Generales: NSS, CURP, RFC, etc
    - Domicilio: Calle, Número, Colonia, etc
    - Redes Sociales: Facebook, Instagram, etc
    - Situación Familiar: Estado Civil, Hijos, etc
    - Deudas: tieneDeudas=true, institucionDeuda="NAFIN"
    - Consentimiento: ✅ Aceptar términos
3. [ ] Agregar 2-3 trabajos con empresa y puesto
4. [ ] Guardar
5. [ ] Cerrar completamente
6. [ ] Reabrir
7. [ ] VERIFICAR: Todo aparece correctamente
```

**Resultado esperado:** Estructura completa se restaura

---

## 🔍 DEBUGGING (si hay problemas)

### Si no se restauran los datos:

**1. Check localStorage:**
```javascript
// En console del navegador:
localStorage.getItem('self-service-<TOKEN>')
// Debe mostrar JSON con { formCandidate, perfil, jobs }
```

**2. Check BD:**
```sql
-- En base de datos:
SELECT perfilDetalle FROM candidates 
WHERE id = <candidateId>;
-- Debe mostrar JSON con { generales, domicilio, ... }
```

**3. Check Network:**
```
- Ver tab "Network" en DevTools
- Búscar "getByToken" request
- Verificar response incluya perfilDetalle con datos
```

**4. Check useEffect:**
```typescript
// Agregar logs en CandidatoSelfService.tsx:
useEffect(() => {
  const hasLocalStorage = !!localStorage.getItem(`self-service-${token}`);
  console.log(`[CAMBIO 3] hasLocalStorage=${hasLocalStorage}, data available=${!!data}`);
  // ...
}, [data, hasAttemptedLocalStorage, token]);
```

---

## 📋 CHECKLIST FINAL

- [x] Código implementado
- [x] Sin errores de compilación
- [x] Lógica verificada
- [x] Plan de testing documentado
- [ ] Tests ejecutados (pendiente)
- [ ] Validación en producción (pendiente)

---

## 🚨 NOTAS IMPORTANTES

1. **localStorage viability:** Este fix asume que localStorage tiene suficiente espacio. El formulario es moderado en tamaño (~10KB), debería funcionar bien.

2. **Race conditions:** El timing entre getByToken y setFormCandidate es seguro porque:
   - getByToken es una query (GET)
   - autosave es una mutation (POST)
   - useEffect ordena: si no hay localStorage → cargar BD completa

3. **Backwards compatibility:** Candidatos con datos viejos en BD se cargarán correctamente porque:
   - getDraftPayload ahora envía estructura COMPLETA
   - Merge en servidor es aditivo (no destructivo)
   - Si BD tiene `nss="abc"` y cliente no lo toca, se preserva

---

**Fix completado. Procede con testing.**

