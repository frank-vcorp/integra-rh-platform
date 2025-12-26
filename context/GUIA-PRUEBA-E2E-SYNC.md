# 🧪 GUÍA: Prueba Manual End-to-End

**Fecha:** 23 de diciembre de 2025  
**Objetivo:** Validar sincronización bidireccional en entorno staging  
**Tiempo Estimado:** 15 minutos

---

## 📋 PRECONDICIONES

- ✅ Build generado: `npm run build`
- ✅ Servidor ejecutándose en staging
- ✅ Acceso a panel de analista (login)
- ✅ Acceso a BD MySQL (opcional, para verificación)
- ✅ Navegador moderno con DevTools

---

## 🎯 FLUJO DE PRUEBA

### PASO 1: Crear candidato y obtener link

```bash
# Opción A: Crear manualmente desde UI
1. Login a panel de analista
2. Ir a Candidatos → Agregar nuevo
3. Llenar datos mínimos (nombre, email)
4. Generar link de autoinvitación (copy link)
5. Copiar URL del self-service

# Opción B: Usar candidato existente
1. Buscar candidato con estado "En captura"
2. Click "Editar autocaptura" → abre self-service con link
```

---

### PASO 2: Candidato llena formulario

```
1. Abrir link en navegador INCÓGNITO (nueva sesión, sin localStorage anterior)
2. Llenar estos campos ESPECÍFICAMENTE:
   
   GENERALES:
   - NSS: 12345678901
   - Puesto Solicitado: "Vendedor"
   
   DOMICILIO:
   - Calle: "Avenida Prueba 456"
   - Municipio: "Benito Juárez"
   - Estado: "CDMX"
   
   SITUACIÓN FAMILIAR:
   - Estado Civil: "Soltero"
   
   CONSENTIMIENTO:
   - ☑ "Acepto el aviso de privacidad"

3. Click "Guardar borrador" (botón azul)
   → Esperar mensaje de éxito: "Borrador guardado correctamente"
   → Verificar en DevTools → Network → candidate-save-full-draft (200 OK)
```

**ESPERADO:**
- ✅ Toast verde: "Borrador guardado correctamente en la base de datos"
- ✅ Network tab: Response 200 con `{ "ok": true }`

---

### PASO 3: Verificar datos en BD (OPCIONAL)

```sql
-- En MySQL:
SELECT 
  id, 
  email, 
  JSON_EXTRACT(perfilDetalle, '$.generales.puestoSolicitado') as puesto,
  JSON_EXTRACT(perfilDetalle, '$.domicilio.calle') as calle,
  JSON_EXTRACT(perfilDetalle, '$.consentimiento.aceptoAvisoPrivacidad') as consentimiento,
  perfilDetalle
FROM candidates
WHERE email = 'candidato@email.com'
LIMIT 1;
```

**ESPERADO:**
- ✅ `puesto` = "Vendedor"
- ✅ `calle` = "Avenida Prueba 456"
- ✅ `consentimiento` = 1 (true)
- ✅ Estructura completa en `perfilDetalle`

---

### PASO 4: Reabre link (verificar persistencia)

```
1. Cerrar pestaña actual (simula que candidato cerró sesión)
2. Copiar MISMO link nuevamente
3. Abrir en NUEVA pestaña (sin localStorage del paso anterior)
4. Esperar carga de datos
```

**ESPERADO:**
- ✅ Campo "Puesto Solicitado" muestra: "Vendedor"
- ✅ Campo "Calle" muestra: "Avenida Prueba 456"
- ✅ Checkbox "Acepto términos" está ☑ (marcado)
- ✅ Formulario aparece ~50-70% lleno (no vacío)

**SI FALLA:**
```
❌ Campos vacíos → Bug en merge/sincronización
   → Check: ¿Se guardó en BD en PASO 3?
   → Check: Network request en PASO 2 fue 200 OK?
   → Check: perfilDetalle en BD tiene estructura completa?
```

---

### PASO 5: Analista edita en panel

```
1. Login a panel de analista (otra ventana/navegador)
2. Ir a Candidatos → Buscar el candidato de prueba
3. Abrir detalle del candidato
4. Ir a sección "Historial Laboral"
5. Agregar trabajo de prueba:
   - Empresa: "Acme Corp"
   - Puesto: "Vendedor Senior"  ← CAMBIO IMPORTANTE
   - Fecha inicio: "2023-01-15"
   - Fecha fin: "2024-12-31"
6. Click "Guardar"
7. Verificar que aparece badge "(editado)" al lado del trabajo

```

**ESPERADO:**
- ✅ Toast: "Registro guardado"
- ✅ Badge "(editado)" visible en el registro
- ✅ Campo `capturadoPor` = "analista" en BD

---

### PASO 6: Candidato reabre link (verifica cambios del analista)

```
1. Volver a la pestaña del self-service del PASO 4
2. Click "Actualizar" (F5 o botón refresh)
3. Esperar carga
```

**ESPERADO:**
- ✅ Sección "Historial Laboral" muestra trabajo nuevo:
  - Empresa: "Acme Corp"
  - Puesto: "Vendedor Senior"
- ✅ Si hay badge de "(editado)", debe ser visible

**SI FALLA:**
```
❌ Trabajo no aparece → Bug en sincronización inversa (analista → candidato)
   → Check: ¿Network request en PASO 5 fue 200 OK?
   → Check: BD tiene el registro en table workHistory?
   → Check: candidateSelf.getByToken carga workHistory correctamente?
```

---

### PASO 7: Candidato edita nuevamente (bidireccional completo)

```
1. En mismo self-service del PASO 6
2. Modificar puesto de "Vendedor" a "Gerente de Ventas"
3. Click "Guardar borrador"
   → Toast de éxito
4. Reabre link (PASO 4 repetido)
   → Debe mostrar "Gerente de Ventas"
```

**ESPERADO:**
- ✅ Campo se actualiza en BD
- ✅ Persiste al reabrir
- ✅ Sin datos perdidos

---

## 📊 MATRIZ DE VALIDACIÓN

| Paso | Escenario | Resultado Esperado | Status |
|------|-----------|-------------------|--------|
| 2 | Candidato guarda datos | 200 OK, toast éxito | ✅ Si BD actualiza |
| 3 | Verifica BD | perfilDetalle completo | ✅ Si tiene estructura |
| 4 | Reabre: datos presentes | Campos restaurados | ✅ Si paso 2-3 OK |
| 5 | Analista edita | capturadoPor="analista" | ✅ Si endpoint funciona |
| 6 | Reabre: cambios reflejados | Trabajo visible | ✅ Si query carga |
| 7 | Candidato re-edita | Cambios persisten | ✅ Si merge bidireccional |

---

## 🔧 DEBUGGING

### Si Paso 2 falla (no guarda)

```
1. DevTools → Network → candidate-save-full-draft
   - ¿Status 200? Si no → error en servidor
   - ¿Request payload completo? Si no → bug en getDraftPayload()
   
2. DevTools → Console
   - ¿Error visible? Si → revisar mensaje
   
3. Backend logs (Cloud Run)
   - Buscar requestId del network request
   - Ver qué errores reporta
```

### Si Paso 4 falla (datos no restaurados)

```
1. DevTools → Network → candidateSelf.getByToken
   - ¿Status 200? Si no → token expirado o inválido
   - ¿Response contiene perfilDetalle? Si no → BD vacía
   
2. MySQL query (ver PASO 3)
   - ¿Datos existen en BD? Si no → Paso 2 no guardó
   - ¿perfilDetalle tiene estructura? Si no → merge no funcionó
   
3. localStorage
   - DevTools → Application → localStorage
   - Buscar clave `self-service-{token}`
   - ¿Tiene datos? Debería ser fallback si BD falla
```

### Si Paso 6 falla (cambios analista no se ven)

```
1. MySQL query
   - ¿Registro en workHistory? Si no → Paso 5 no guardó
   - ¿capturadoPor="analista"? Si no → código no incluyó
   
2. Network request en candidateSelf.getByToken
   - ¿Incluye workHistory nuevo? Si no → query no lo carga
   
3. Frontend logic
   - ¿useEffect dispara al reabre? Si no → bug en hook
```

---

## ✅ CHECKLIST PRE-VALIDACIÓN

- [ ] Build genera sin errores: `npm run build`
- [ ] Server inicia sin errores
- [ ] Network requests son 200 OK
- [ ] BD accesible y con datos
- [ ] localStorage funciona (abrir DevTools)
- [ ] Endpoints `/api/candidate-save-full-draft` y `/api/trpc/candidateSelf.getByToken` responden

---

## 📞 PROBLEMAS CONOCIDOS

### "El consentimiento persiste pero otros campos no"
- **Causa:** Faltan campos en `getDraftPayload()` o merge no preserva
- **Fix:** Revisar línea 445-530 de CandidatoSelfService.tsx
- **Validar:** `test-sync.mjs` debe pasar (7/7)

### "Analista edita pero candidato no ve cambios"
- **Causa:** Frontend no recarga desde BD
- **Fix:** Verificar `useEffect` que llama `candidateSelf.getByToken`
- **Validar:** Network request trae datos nuevos

### "Datos se pierden al actualizar (F5)"
- **Causa:** localStorage y BD estén desincronizados
- **Fix:** Limpiar localStorage, reabre
- **Validar:** BD tiene datos correctos

---

## 📤 REPORTE

Al terminar la prueba, documentar:

```markdown
## Resultado Prueba E2E (23/12/2025)

**Candidato:** [nombre/email]
**Navegador:** [Chrome/Firefox/Safari]
**Entorno:** [local/staging/prod]

### Pasos Completados
- [x] Paso 1: Crear candidato
- [x] Paso 2: Llenar formulario → 200 OK
- [x] Paso 3: Verificar BD → Datos presentes
- [x] Paso 4: Reabre → Datos restaurados
- [x] Paso 5: Analista edita → OK
- [x] Paso 6: Candidato ve cambios → OK
- [x] Paso 7: Candidato re-edita → OK

### Problemas Encontrados
(Ninguno / Listar)

### Conclusión
✅ SINCRONIZACIÓN BIDIRECCIONAL FUNCIONAL
```

---

**Fecha Creación:** 23 de diciembre de 2025  
**Creado por:** SOFIA - Constructora Principal  
**Checkpoint Base:** CHK_2025-12-23_FASE-4-PROBADA-E2E.md
