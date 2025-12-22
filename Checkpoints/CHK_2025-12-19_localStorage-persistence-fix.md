# Checkpoint: Fix localStorage Persistence en Pre-Registro (CandidatoSelfService)

**Fecha**: 19 de diciembre de 2025  
**Agente**: SOFIA (Builder)  
**Estado**: ✅ COMPLETADO  
**Deployments**: 
- Cloud Run: `api-00005-pvc`
- Firebase Hosting: https://integra-rh.web.app

---

## Problema Reportado

Los datos del formulario pre-registro se borraban al cambiar de pestaña, a pesar de que se guardaban en localStorage y se implementaron event listeners para `beforeunload`, `visibilitychange`, `pagehide`.

```
Usuario: "Temo decirte que aun se borran cuando cambio de pestaña"
```

---

## Raíz del Problema

El `useEffect` que inicializaba el estado desde `data` (datos del servidor) se ejecutaba **cada vez que la query TRPC se revalidaba** (automáticamente al cambiar de pestaña).

**Flujo de error:**
1. Usuaria llena campos en la pestaña A
2. localStorage se actualiza cada 500ms ✓
3. Usuaria cambia a pestaña B
4. React deja de monitorear la pestaña A
5. Usuaria vuelve a pestaña A
6. React revalida `getByToken` (refresh automático)
7. `useEffect([data])` dispara y reinicia el estado **desde los datos del servidor**
8. ❌ Los campos se vacían (localStorage nunca se leyó nuevamente porque ya tenían estado)

**Causa raíz**: No había lógica para diferenciar entre "primer load" y "revalidación posterior".

---

## Solución Implementada

### 1. Nuevo flag: `hasLoadedFromStorage`

```tsx
const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);
```

### 2. Actualización de primer `useEffect` (líneas ~232-243)

Ahora marca `hasLoadedFromStorage = true` después de intentar cargar desde localStorage:

```tsx
useEffect(() => {
  if (!token) return;
  const saved = localStorage.getItem(`self-service-${token}`);
  if (saved) {
    try {
      const { formCandidate: fc, perfil: p, jobs: j } = JSON.parse(saved);
      setFormCandidate(fc);
      setPerfil(p);
      setJobs(j);
      setHasLoadedFromStorage(true);
    } catch (e) {
      console.error("Error recuperando localStorage:", e);
      setHasLoadedFromStorage(true);
    }
  } else {
    setHasLoadedFromStorage(true);
  }
}, [token]);
```

### 3. Guardia en segundo `useEffect` (líneas ~245+)

```tsx
useEffect(() => {
  if (!data || hasLoadedFromStorage) return;  // ← KEY: No ejecutar si ya cargó desde localStorage
  // ... resto del código de inicialización desde servidor
}, [data, hasLoadedFromStorage]);
```

**Consecuencia**: 
- Primera carga: Si hay datos en localStorage, los usa y `hasLoadedFromStorage = true`
- Revalidaciones posteriores: El flag previene que el `useEffect` reinicie el estado
- localStorage es la **fuente de verdad durante la sesión**

---

## Cambios de Código

**Archivo**: `integra-rh-manus/client/src/pages/CandidatoSelfService.tsx`

1. Línea ~206: Agregado `const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);`
2. Líneas ~232-243: Actualizado primer `useEffect` para marcar flag
3. Línea ~245: Actualizado segundo `useEffect` con guardia `hasLoadedFromStorage`

---

## Testing Manual

✅ **Confirmado funcionando:**
1. Llenar múltiples campos en formulario
2. Cambiar a otra pestaña (tab switch)
3. Volver a pestaña original
4. **Resultado**: Datos persisten correctamente

---

## Comportamiento Post-Fix

| Escenario | Antes | Después |
|-----------|-------|---------|
| Llenar + cambiar pestaña + volver | ❌ Datos se borran | ✅ Datos persisten |
| Llenar + refrescar página | ❌ Datos perdidos | ✅ Recupera desde localStorage |
| Llenar + cerrar tab + reabrir link | ❌ Datos perdidos | ✅ localStorage se perdió (esperado) |
| Múltiples cambios de pestaña | ❌ Borrado progresivo | ✅ Mantiene estado |

---

## Notas de Arquitectura

- **localStorage key**: `self-service-${token}`
- **Debounce autosave**: 500ms
- **Evento listeners**: `beforeunload`, `visibilitychange`, `pagehide` (siguen activos para garantizar persistencia)
- **Estrategia final**: localStorage (primaria) + servidor autosave (secundaria, manual)

---

## Deploy Summary

```bash
# Build
npm run build ✅
# Output: 2792 modules, 1,639.38 kB JS, 135.07 kB CSS

# Cloud Run
gcloud run deploy api --source . --region us-central1
# Resultado: api-00005-pvc deployed, 100% traffic

# Firebase Hosting  
firebase deploy --only hosting
# Resultado: 5 files uploaded, version finalized
# URL: https://integra-rh.web.app
```

---

## Impacto

- ✅ Pre-registro ahora usa localStorage como fuente de verdad
- ✅ Cambios de pestaña no resetean el formulario
- ✅ UX mejorado: Las chicas pueden trabajar sin temor a perder datos
- ✅ Reducción de frustración en data entry

---

## Próximos Pasos (Si aplica)

- Monitorear comportamiento en producción con usuarios reales
- Considerar migrar a IndexedDB si localStorage quota se vuelve insuficiente
- Implementar sincronización bidireccional con servidor cuando sea crítico

