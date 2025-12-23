# 🎯 PUNTO CRÍTICO IDENTIFICADO - RAÍZ DEL PROBLEMA

**Fecha:** 23 de diciembre de 2025, ~08:00  
**Estado:** BUILD ✅ | PROBLEMA IDENTIFICADO ✅ | SOLUCIÓN PENDIENTE

---

## 🔴 EL BUG EXACTO

**El consentimiento funciona porque:**
- Se envía explícitamente: `aceptoAvisoPrivacidad: true/false`
- Se guarda en `perfilDetalle.consentimiento`
- Se carga explícitamente: `if (detalle.consentimiento?.aceptoAvisoPrivacidad)`

**El perfil NO funciona porque:**
- `getDraftPayload()` construye:
```javascript
const generales = {};
if (perfil.puestoSolicitado) generales.puestoSolicitado = ...;
// Si NO hay valor → NO lo incluye
if (Object.keys(generales).length > 0) 
  payload.perfil.generales = generales; // ← Si está vacío, NO se envía
```

**Resultado:**
- Si candidato llena `puestoSolicitado = "Vendedor"` → se envía ✅
- Si candidato llena y LUEGO vacía `puestoSolicitado = ""` → NO se envía ❌
- Backend recibe `{ perfil: {} }` (secciones vacías)
- BD nunca actualiza esos campos
- Al reabrir, cargan valores viejos (o null)

---

## ✅ LA SOLUCIÓN

Cambiar `getDraftPayload()` para **SIEMPRE enviar las secciones**, incluso si están vacías:

**Archivo:** `integra-rh-manus/client/src/pages/CandidatoSelfService.tsx` línea ~510

**CAMBIO:**
```javascript
// ANTES (❌ INCORRECTO):
const generales: any = {};
if (perfil.puestoSolicitado) generales.puestoSolicitado = perfil.puestoSolicitado;
if (Object.keys(generales).length > 0) payload.perfil.generales = generales;

// DESPUÉS (✅ CORRECTO):
payload.perfil.generales = {
  puestoSolicitado: perfil.puestoSolicitado || "",
  plaza: perfil.plaza || "",
  fechaNacimiento: perfil.fechaNacimiento || "",
  // ... TODOS los campos
};
```

**Por qué funciona:**
- Enviamos `{ puestoSolicitado: "" }` en lugar de nada
- Backend mergea: `{ ...old, puestoSolicitado: "" }`
- BD actualiza el campo a `""`
- Al reabrir, se carga `""`  y se muestra vacío ✅

---

## 📋 CAMBIOS NECESARIOS

**Archivo: candidateSelf.ts**
- Ya está correcto (hace merge por sección)

**Archivo: CandidatoSelfService.tsx**
- Cambiar getDraftPayload() para enviar SIEMPRE todas las secciones
- No hacer `if (Object.keys(generales).length > 0)`
- Enviar objeto completo aunque tenga valores vacíos

**Archivo: CandidatoDetalle.tsx**
- Cambio de `capturadoPor`: Ya hecho ✅
- Badge de consentimiento: Ya hecho ✅

---

## 🧪 VERIFICACIÓN

Después del fix, probar:
1. Candidato llena `puestoSolicitado = "Vendedor"`
2. Presiona "Guardar borrador"
3. Reabre enlace
4. `puestoSolicitado` debe mostrar "Vendedor" ✅

---

**Estado:** LISTO PARA IMPLEMENTACIÓN  
**Riesgo:** BAJO (solo cambio en formato de payload)  
**Tiempo:** 10 minutos

