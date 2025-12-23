# 🚨 RESUMEN EJECUTIVO PARA INTEGRA-ARQUITECTO

**Fecha:** 23 de diciembre de 2025, 07:50  
**De:** SOFIA Builder  
**Para:** INTEGRA-Arquitecto  
**Asunto:** Falla en Sincronización de Datos - Necesita Solución Arquitectónica

---

## 📌 EL PROBLEMA EN UNA FRASE

Cuando candidato **reabre el enlace de self-service, solo persiste el checkbox "Acepto términos"** pero se pierden TODOS los datos del formulario (perfil, historial laboral, etc).

---

## ✅ LO QUE FUNCIONA

- ✅ Badge "✅ ACEPTO TÉRMINOS (fecha)" aparece en CandidatoDetalle
- ✅ El consentimiento (`aceptoAvisoPrivacidad`) se guarda y restaura CORRECTAMENTE
- ✅ localStorage tiene los datos (verificado visualmente: 52% completado)
- ✅ BD probablemente también tiene los datos (consentimiento se guardó)
- ✅ Build compila sin errores

---

## ❌ LO QUE NO FUNCIONA

- ❌ Otros campos del perfil NO se restauran al reabrir
- ❌ Solo persiste el consentimiento
- ❌ Los datos están en algún lugar (localStorage o BD) pero no se cargan

---

## 🔍 DIAGNÓSTICO

**Lo que intenté:**
1. Agregar `aceptoAvisoPrivacidad` al payload ✅
2. Guardar en `perfilDetalle.consentimiento` ✅
3. Cargar desde BD al reabrir ✅ (parcialmente)

**El problema real es:**
- Hay lógica de merge entre localStorage y BD que NO está sincronizando correctamente
- O bien el payload del autosave NO está guardando todos los campos
- O bien el useEffect de carga NO está aplicando los datos correctamente

**Código actual en CandidatoSelfService.tsx (línea ~310-350):**
```typescript
const isBDEmpty = !detalle.generales && !detalle.domicilio && ...;

if (isBDEmpty && localData?.perfil) {
  // Si BD vacío pero localStorage tiene datos → usa localStorage
  setFormCandidate(localData.formCandidate || {...});
  setPerfil(localData.perfil);
  setJobs(localData.jobs);
  return;
}

// Si BD tiene datos → usa BD como principal
setFormCandidate({ email: data.candidate.email || localData?...., ... });
setPerfil({ ...datos de BD... });
```

**El problema:** Parece lógica correcta, pero algo en el flujo no está funcionando.

---

## 📋 QUÉ NECESITO DE TI (INTEGRA)

1. **Revisa el código de sincronización:**
   - `CandidatoSelfService.tsx` líneas 310-430 (carga de datos)
   - `CandidatoSelfService.tsx` línea ~510 (getDraftPayload)
   - `candidateSelf.ts` línea ~175 (autosave endpoint)

2. **Responde estas preguntas:**
   - ¿El getDraftPayload() está enviando TODOS los campos o solo los no vacíos?
   - ¿El autosave endpoint está mergeando correctamente con perfilDetalle existente?
   - ¿Hay race condition entre guardar y recargar?
   - ¿Debería localStorage ser PRIMARY en lugar de BD?

3. **Propón una solución específica:**
   - Cambios de código exactos
   - En qué archivos
   - Explicación de por qué fix

4. **Considera estas opciones:**
   - **Opción A:** localStorage es PRINCIPAL, BD es fallback
   - **Opción B:** BD es principal, pero sync más cuidadoso
   - **Opción C:** Merge inteligente: si BD > localStorage en mismo campo, BD gana; si localStorage tiene datos que BD no, localStorage gana

---

## 📂 ARCHIVOS CLAVE

```
integra-rh-manus/
├── client/src/pages/CandidatoSelfService.tsx
│   ├── Línea ~250-270: useEffect de localStorage
│   ├── Línea ~310-430: useEffect de carga desde BD
│   └── Línea ~510-600: getDraftPayload()
├── client/src/pages/CandidatoDetalle.tsx (works fine)
└── server/routers/candidateSelf.ts
    └── Línea ~175-195: autosave endpoint
```

---

## 🎯 URGENCIA

- 3+ horas invertidas en esto
- Riesgo de regresión si continúo experimentando
- Necesito tu decisión arquitectónica antes de continuar

**Esperando tu análisis y solución.**

---

**Build Status:** ✅ Compila sin errores  
**Tests:** No disponibles en este momento  
**Documentación:** Ver Checkpoints/HANDOFF-INTEGRA-DIAGNOSTICO-20251223.md (completo)

