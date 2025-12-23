# 🧪 QUICK TESTING GUIDE

**Tiempo estimado:** 30-45 minutos  
**Objetivo:** Validar que la sincronización funciona correctamente

---

## 🚀 TEST 1: Ciclo Completo (20 minutos)

### Setup
```bash
# Terminal 1: Build y run servidor
cd /home/frank/proyectos/integra-rh/integra-rh-manus
npm run build
npm run dev

# Terminal 2: Abrir navegador a self-service URL
# http://localhost:5173/candidate-self-service?token=<TOKEN>
# (obtener token desde CandidatoDetalle)
```

### Pasos
1. **Abre self-service** (formulario vacío o con datos viejos)
2. **Llena campos de GENERALES:**
   - NSS: `12345678`
   - CURP: `ABCD123456HDFABC`
   - RFC: `ABCD123456ABC`
3. **Llena DOMICILIO:**
   - Calle: `Calle Principal 123`
   - Municipio: `Ciudad de México`
   - Estado: `CDMX`
4. **Llena EMAIL:**
   - Email: `candidato@test.com`
5. **Marca CONSENTIMIENTO:**
   - [ ] "Acepto términos" → ✅ marcar
6. **Presiona "Guardar borrador"**
   - Espera toast: "Borrador guardado correctamente en la base de datos"
   - Espera 2 segundos

### Validación Paso 1: localStorage
```javascript
// Abre DevTools (F12) → Console
localStorage.getItem('self-service-<TOKEN>')
// Debe mostrar JSON con:
// { formCandidate: { email: "candidato@test.com", ... }, 
//   perfil: { nss: "12345678", curp: "...", ... },
//   jobs: [...] }
```

### Validación Paso 2: BD
```sql
-- En BD:
SELECT 
  id, email,
  perfilDetalle->>'generales' as generales,
  perfilDetalle->>'consentimiento' as consentimiento
FROM candidates
WHERE email = 'candidato@test.com';

-- Debe mostrar:
-- generales: { "nss": "12345678", "curp": "ABCD123456HDFABC", ... }
-- consentimiento: { "aceptoAvisoPrivacidad": true, ... }
```

### Test Final: REABRIR ENLACE
1. **CIERRA NAVEGADOR COMPLETAMENTE** (o nueva pestaña incognito)
2. **Abre NUEVO navegador/sesión**
3. **Copia URL del self-service**
4. **Pega en navegador nuevo**
5. **ESPERA a que cargue**

### Validación Final
```
✅ DEBE APARECER:
- Email: candidato@test.com
- NSS: 12345678
- CURP: ABCD123456HDFABC
- RFC: ABCD123456ABC
- Calle: Calle Principal 123
- Municipio: Ciudad de México
- Estado: CDMX
- Checkbox "Acepto términos": MARCADO ✅
- Badge en CandidatoDetalle: "✅ ACEPTO TÉRMINOS (fecha)"

❌ NO DEBE PASAR:
- "El formulario está vacío" 
- "Error al cargar datos"
- Checkbox sin marcar
```

---

## 🧪 TEST 2: Campos Vaciados (10 minutos)

### Setup
Continúa desde Test 1 (mismo candidato)

### Pasos
1. **EDITA el formulario**
2. **Limpia campo NSS:** (déjalo vacío)
3. **Cambia CURP:** `NEW12345678HDFX`
4. **Presiona "Guardar borrador"**
5. **CIERRA NAVEGADOR**
6. **REABRE EN NUEVA SESIÓN**

### Validación
```
✅ DEBE APARECER:
- NSS: (VACÍO) ← esto es lo importante
- CURP: NEW12345678HDFX
- Email: candidato@test.com

❌ NO DEBE PASAR:
- NSS: 12345678 ← significa que no guardó los cambios
```

---

## 🧪 TEST 3: Cambios Locales (10 minutos)

### Pasos
1. **ABRE self-service**
2. **Lleña NSS:** `test123`
3. **NOTA:** NO presiones "Guardar borrador"
4. **Abre otra pestaña**
5. **VUELVE a la pestaña original**
6. **VERIFICA NSS:**

### Validación
```
✅ DEBE APARECER:
- NSS: test123 ← preservado de localStorage

✅ localStorage debe contener:
localStorage.getItem('self-service-<TOKEN>')
// { formCandidate: { email: ... }, perfil: { nss: "test123", ... } }
```

---

## 🧪 TEST 4: Consentimiento en BD (5 minutos)

### Pasos
1. **ABRE CandidatoDetalle** (admin)
2. **Ubica el candidato del TEST 1**
3. **Verifica que aparece badge:**
   ```
   ✅ ACEPTO TÉRMINOS (23/12/2025 08:30)
   ```

### Validación
```sql
-- Verifica en BD:
SELECT 
  perfilDetalle->>'consentimiento' as consentimiento
FROM candidates
WHERE email = 'candidato@test.com';

-- Debe mostrar:
{
  "aceptoAvisoPrivacidad": true,
  "aceptoAvisoPrivacidadAt": "2025-12-23T08:30:00.000Z"
}
```

---

## 📊 MATRIZ DE VALIDACIÓN

| Test | Caso | Antes | Después | Status |
|------|------|-------|---------|--------|
| 1 | Guardar + Reabrir | ❌ Solo checkbox | ✅ TODOS los datos | [ ] |
| 2 | Limpiar campo | ❌ Se pierde | ✅ Se guarda como "" | [ ] |
| 3 | Cambios sin guardar | ❌ Se pierden | ✅ localStorage preserva | [ ] |
| 4 | Consentimiento | ✅ Funciona | ✅ Sigue funcionando | [ ] |

---

## 🔍 DEBUGGING

### Si el test falla:

**Problema:** "NSS no aparece al reabrir"

```
1. Check localStorage:
   localStorage.getItem('self-service-TOKEN')
   → Debe tener nss dentro

2. Check BD:
   SELECT perfilDetalle FROM candidates WHERE id = X
   → Debe tener generales.nss

3. Check Network (DevTools):
   1. Search "getByToken"
   2. Response → debe incluir perfilDetalle

4. Check Logs (Terminal):
   [CAMBIO 3] hasLocalStorage=false, data available=true
   → Significa que está cargando desde BD (correcto)
```

**Problema:** "Consentimiento no persiste"

```
1. Check BD directamente:
   SELECT perfilDetalle->>'consentimiento' 
   FROM candidates WHERE id = X;

2. Check autosave response:
   En DevTools → Network → candidateSelf.autosave
   → Ver si hay errores

3. Check handleManualSave:
   En Console, buscar logs de "Draft saved to BD"
```

**Problema:** "localStorage no se actualiza"

```
1. Verifica que handleManualSave se ejecuta:
   - Consola debe mostrar logs

2. Verifica localStorage directamente:
   localStorage.getItem('self-service-TOKEN')
   → Debe cambiar después de editar campo

3. Verifica que localStorage está habilitado:
   localStorage.setItem('test', '1')
   localStorage.getItem('test')
   → Debe retornar '1'
```

---

## 📋 REPORT TEMPLATE

```markdown
# Test Report - CandidatoSelfService Sync Fix

**Fecha:** [DATE]
**Navegador:** [Browser + Version]
**Candidato Test:** [Email usado]

## TEST 1: Ciclo Completo
- [ ] Datos se guardan
- [ ] localStorage muestra JSON correcto
- [ ] BD muestra perfilDetalle correcto
- [ ] Al reabrir, TODOS los datos aparecen
- [ ] Consentimiento aparece en CandidatoDetalle

**Status:** ✅ PASS / ❌ FAIL

## TEST 2: Campos Vaciados
- [ ] Limpia campo NSS
- [ ] Guarda correctamente
- [ ] Al reabrir, NSS está vacío
- [ ] CURP actualizado correctamente

**Status:** ✅ PASS / ❌ FAIL

## TEST 3: Cambios Locales
- [ ] Sin guardar explícito, localStorage preserva
- [ ] Al volver a pestaña, datos están ahí

**Status:** ✅ PASS / ❌ FAIL

## TEST 4: Consentimiento
- [ ] Badge aparece en CandidatoDetalle
- [ ] Datos correctos en BD

**Status:** ✅ PASS / ❌ FAIL

## Overall
**Total Tests:** 4
**Passed:** [ ]/4
**Failed:** [ ]/4

**Notes:**
[Cualquier observación]
```

---

## 🎯 ÉXITO

Si todos los tests pasan:
```
✅ TEST 1: PASS (Datos se guardan y restauran)
✅ TEST 2: PASS (Campos vaciados se guardan)
✅ TEST 3: PASS (Cambios locales se preservan)
✅ TEST 4: PASS (Consentimiento funciona)

🎉 FIX VALIDADO - LISTO PARA DEPLOY
```

---

**Estimated Time:** 30-45 minutes  
**Difficulty:** Easy (UI testing, no code changes)

