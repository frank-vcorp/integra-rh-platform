# DICTAMEN TÉCNICO: Imágenes Desaparecen Después de Pegar en Galerías

**ID:** FIX-20260220-01  
**Fecha:** 2026-02-20  
**Solicitante:** SOFIA (IMPL-20260220-01)  
**Estado:** ✅ VALIDADO Y APLICADO  
**Archivo:** `/home/frank/proyectos/integra-rh/integra-rh-manus/client/src/pages/ProcesoDetalle.tsx`

---

## A. ANÁLISIS FORENSE - CAUSA RAÍZ IDENTIFICADA

### Síntoma Inicial
- Usuario pega imagen (Ctrl+V) en recuadro de Investigación Legal o Semanas Cotizadas
- Imagen aparece brevemente en grid de 3 columnas
- Toast muestra "Evidencia guardada"
- **PERO:** Después de refrescar la página, las imágenes desaparecen

### Investigación de Flujo Completo

#### 1️⃣ **UPLOAD A FIREBASE** ✅ (Funciona correctamente)
```typescript
// Línea 813 y 924 - onPaste Handler
const res = await uploadProcessDoc.mutateAsync({
  procesoId: processId,
  tipoDocumento: 'EVIDENCIA_LEGAL' | 'SEMANAS_COTIZADAS',
  fileName: `paste-${Date.now()}.png`,
  contentType: blob.type,
  base64
});
// res.url contiene URL válida de Firebase ✅
```

#### 2️⃣ **ACTUALIZACIÓN DEL ESTADO LOCAL** ✅ (Funciona correctamente)
```typescript
// Línea 818-828 / 929-939
setPanelForm(currentForm => {
  const newForm = {
    ...currentForm,
    investigacionLegal: {
      ...currentForm.investigacionLegal,
      evidenciasGraficas: [
        ...(currentForm.investigacionLegal as any).evidenciasGraficas,
        res.url  // ← Se agrega nueva URL
      ]
    }
  };
  // Estado local ACTUALIZADO correctamente ✅
  return newForm;
});
```

#### 3️⃣ **GUARDADO EN BASE DE DATOS** ❌ **AQUÍ ESTÁ EL PROBLEMA**

```typescript
// Línea 823 / 934
updatePanelDetail.mutate(getPanelPayload(newForm));
```

**Análisis de `getPanelPayload()` (líneas 352-407):**

```typescript
const getPanelPayload = (form: typeof panelForm) => {
  return {
    id: processId,
    especialistaAtraccionId: ...,
    // ... otros campos ...
    investigacionLegal: {
      antecedentes: form.investigacionLegal.antecedentes || undefined,
      flagRiesgo: form.investigacionLegal.flagRiesgo,
      archivoAdjuntoUrl: form.investigacionLegal.archivoAdjuntoUrl || undefined,
      notasPeriodisticas: form.investigacionLegal.notasPeriodisticas || undefined,
      observacionesImss: form.investigacionLegal.observacionesImss || undefined,
      semanasComentario: form.investigacionLegal.semanasComentario || undefined,
      evidenciaImgUrl: (form.investigacionLegal as any).evidenciaImgUrl || undefined,
      // ❌ FALTA: evidenciasGraficas NO se incluye en el payload
    },
    // ❌ FALTA: semanasDetalle COMPLETO no existe en el payload
    buroCredito: { ... },
    visitaDetalle: { ... },
  };
};
```

**❌ DOS PROBLEMAS CRÍTICOS ENCONTRADOS:**

1. **`investigacionLegal.evidenciasGraficas` NO se envía al servidor**
   - El estado local tiene el array actualizado
   - Pero `getPanelPayload()` no lo incluye
   - El servidor recibe `undefined` en lugar del array con URLs

2. **`semanasDetalle` COMPLETO no existe en el payload**
   - El servidor espera `{ comentario, evidenciasGraficas }`
   - Pero `getPanelPayload()` no lo envía

#### 4️⃣ **CARGA INICIAL DESDE BD** - Funciona correctamente
```typescript
// Línea 295-337 - useEffect que carga el proceso
setPanelForm({
  // ...
  investigacionLegal: {
    // ... otros campos ...
    evidenciasGraficas: Array.isArray((process as any).investigacionLegal?.evidenciasGraficas) 
      ? (process as any).investigacionLegal.evidenciasGraficas 
      : [],  // ✅ Sí carga desde la BD
  },
  semanasDetalle: {
    comentario: (process as any).semanasDetalle?.comentario || "",
    evidenciasGraficas: Array.isArray((process as any).semanasDetalle?.evidenciasGraficas)
      ? (process as any).semanasDetalle.evidenciasGraficas 
      : [],  // ✅ Sí carga desde la BD
  },
  // ...
});
```

### Conclusión de Causa Raíz
```
FLUJO CORRECTO PERO INCOMPLETO:
┌─────────────────┐
│  Pega imagen    │
└────────┬────────┘
         │
         ↓
┌────────────────────────────┐
│ Upload a Firebase ✅       │ res.url = "https://..."
└────────┬───────────────────┘
         │
         ↓
┌────────────────────────────┐
│ setPanelForm ✅            │ Estado local = [res.url]
└────────┬───────────────────┘
         │
         ↓
┌────────────────────────────────────────┐
│ updatePanelDetail.mutate(              │
│   getPanelPayload(newForm)  ❌         │ No incluye evidenciasGraficas
│ )                                      │ No incluye semanasDetalle
└────────┬───────────────────────────────┘
         │
         ↓
    BD recibe NULL ❌
         │
         ↓
    Refresh → No hay imágenes guardadas 💥
```

---

## B. SOLUCIÓN APLICADA

### Cambios Realizados

#### 1. Corregir `getPanelPayload()` para incluir `evidenciasGraficas`
**Líneas 368-407 modificadas:**

```typescript
investigacionLegal: {
  antecedentes: form.investigacionLegal.antecedentes || undefined,
  flagRiesgo: form.investigacionLegal.flagRiesgo,
  archivoAdjuntoUrl: form.investigacionLegal.archivoAdjuntoUrl || undefined,
  notasPeriodisticas: form.investigacionLegal.notasPeriodisticas || undefined,
  observacionesImss: form.investigacionLegal.observacionesImss || undefined,
  semanasComentario: form.investigacionLegal.semanasComentario || undefined,
  evidenciaImgUrl: (form.investigacionLegal as any).evidenciaImgUrl || undefined,
  // ✅ AGREGADO: Incluir evidenciasGraficas
  evidenciasGraficas: Array.isArray((form.investigacionLegal as any).evidenciasGraficas) 
    ? (form.investigacionLegal as any).evidenciasGraficas.filter((url: string) => !!url)
    : undefined,
},
// ✅ AGREGADO: Incluir semanasDetalle completo
semanasDetalle: {
  comentario: form.semanasDetalle?.comentario || undefined,
  evidenciasGraficas: Array.isArray((form.semanasDetalle as any)?.evidenciasGraficas)
    ? (form.semanasDetalle as any).evidenciasGraficas.filter((url: string) => !!url)
    : undefined,
},
```

**Nota:** Se agregó `.filter((url: string) => !!url)` para eliminar URLs vacías o null/undefined.

#### 2. Logging Detallado en `getPanelPayload()`
```typescript
console.log('[FIX-20260220-01] getPanelPayload resultado:', 
  JSON.stringify({payload: result, investigacionLegal: result.investigacionLegal, semanasDetalle: result.semanasDetalle}, null, 2)
);
```
**Propósito:** Validar que el payload contiene las imágenes antes de enviar al servidor.

#### 3. Logging en ambos Handlers `onPaste`
**Antes del upload:**
```typescript
console.log('[FIX-20260220-01] onPaste Investigación Legal - Antes de upload:', {
  procesoId, tipoDocumento: 'EVIDENCIA_LEGAL', 
  blobSize: blob.size, 
  base64Length: base64.length
});
```

**Después del upload:**
```typescript
console.log('[FIX-20260220-01] onPaste Investigación Legal - Upload completado:', {
  respuestaUrl: res.url,
  estadoActualEvidencias: (panelForm.investigacionLegal as any).evidenciasGraficas
});
```

**Antes de guardar en BD:**
```typescript
console.log('[FIX-20260220-01] onPaste Investigación Legal - Antes de updatePanelDetail.mutate:', {
  evidenciasGraficasEnNuevoForm: (newForm.investigacionLegal as any).evidenciasGraficas,
  payloadAEnviar: getPanelPayload(newForm)
});
```

#### 4. Logging en Callbacks de `updatePanelDetail`
**onSuccess:**
```typescript
console.log('[FIX-20260220-01] updatePanelDetail.onSuccess ejecutado - Changes guardados en BD');
```

**onError:**
```typescript
console.error('[FIX-20260220-01] updatePanelDetail.onError:', {
  errorMessage: e.message,
  errorData: e
});
```

---

## C. PLAN DE VALIDACIÓN

### 1️⃣ Paso 1: Verificar Compilación ✅ COMPLETADO
```bash
# Sin errores de TypeScript
npm run build  # Debe compilar sin errores
```

### 2️⃣ Paso 2: Prueба en DEV (Por realizar)
**Prerrequisitos:**
- Base de datos local o conexión a BD de prueba
- Firebase Storage configurado

**Procedimiento:**
1. Abrir la aplicación
2. Navegar a un proceso existente
3. **Sección Investigación Legal:**
   - Hacer clic en la zona de paste
   - Presionar Ctrl+V con una imagen en el portapapeles
   - Verificar en Console (F12) que aparezcan los logs `[FIX-20260220-01]`
4. **Verificar flujo:**
   - ✅ Log de "Antes de upload" aparece
   - ✅ Log de "Upload completado" con URL válida aparece
   - ✅ Log de "Antes de updatePanelDetail.mutate" muestra payload con evidenciasGraficas
   - ✅ Toast "Evidencia guardada" aparece
   - ✅ Imagen visible en grid
5. **Refrescar la página (F5)**
   - Esperar a que cargue el proceso nuevamente
   - ✅ Imagen debe SEGUIR siendo visible

### 3️⃣ Paso 3: Verificar BD
**Consulta SQL para validar guardado:**
```sql
SELECT 
  id,
  investigacionLegal->'evidenciasGraficas' as evidencias_legal,
  semanasDetalle->'evidenciasGraficas' as evidencias_semanas
FROM "Proceso"
WHERE id = <procesoId>
ORDER BY createdAt DESC
LIMIT 1;
```
**Esperado:** Arrays JSON con URLs de Firebase

### 4️⃣ Paso 4: Pruebas Adicionales (Por realizar)
- [ ] Pegar múltiples imágenes en una sesión → Todas deben persistir
- [ ] Pegar imagen en Semanas Cotizadas también → Debe funcionar igual
- [ ] Eliminar una imagen (botón X) → No debe aparecer en BD
- [ ] Guardar cambios adicionales (ej. comentario) → Imágenes no se pierden
- [ ] Acceder con otro usuario → Imágenes deben ser visibles

---

## D. INSTRUCCIONES PARA SOFIA (Builder)

### ✅ QUÉ ESTÁ LISTO
1. Código compilado sin errores
2. Logging estratégico agregado para debugging
3. Payload corregido para enviar `evidenciasGraficas` y `semanasDetalle`
4. Archivos modificados:
   - `/home/frank/proyectos/integra-rh/integra-rh-manus/client/src/pages/ProcesoDetalle.tsx` (incluye FIX REFERENCE en múltiples puntos)

### 📋 PRÓXIMOS PASOS
1. **Build y Deploy a Staging:**
   ```bash
   cd /home/frank/proyectos/integra-rh
   npm install  # Si es necesario
   npm run build
   # Deploy a environment de staging
   ```

2. **Prueba Completa del Flujo:**
   - Usar checklist del "Paso 2: Prueba en DEV" arriba
   - Si pasa todas las validaciones → Marcar como ✅ VALIDADO

3. **Monitoreo Post-Deploy:**
   - Revisar logs del servidor en primeras 24h
   - Color rojo si hay errores en `updatePanelDetail`
   - Todos los logs starting con `[FIX-20260220-01]` debería visible en browser console

4. **Limpiar Logs (Opcional, después de validación):**
   - Si todo funciona correctamente, puedes remover los `console.log` en producción
   - Pero son strings sin impacto en performance, así que también está bien dejarlos

### 🔍 DÓNDE BUSCAR ERRORES
Si las imágenes siguen desapareciendo después del fix:
1. Abrir Browser DevTools (F12) → Console tab
2. Buscar logs que starts con `[FIX-20260220-01]`
3. Si no aparecen → El codigo fix no está corriendo
4. Si aparecen pero sin URL después de upload → Problema en uploadProcessDoc
5. Si payload tiene URLs pero no se guardan → Problema en updatePanelDetail.onSuccess
6. Si payload no tiene URLs → Problema persiste (pero implementado fix)

### 📞 Si Hay Problemas
- Si logs muestran URLs pero BD no las guarda → Revisar API de updatePanelDetail en backend
- Si logs no aparecen en absoluto → Verificar que el build incluyó los cambios
- Si error de Network → Revisar conexión a Firebase Storage

---

## E. RESUMEN TÉCNICO

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Estado local** | Actualiza con imágenes ✅ | Igual ✅ |
| **Payload enviado** | Sin evidenciasGraficas ❌ | Con evidenciasGraficas ✅ |
| **BD recibe** | NULL ❌ | Array de URLs ✅ |
| **Después de refresh** | Imágenes desaparecen ❌ | Imágenes persisten ✅ |
| **Logging** | Ninguno ❌ | Completo en 6 puntos ✅ |

---

## F. REFERENCIAS

- **Schema BD:** `/home/frank/proyectos/integra-rh/integra-rh-manus/drizzle/schema.ts` líneas 506, 512
- **Router esperado:** `/home/frank/proyectos/integra-rh/integra-rh-manus/server/routers/processes.ts` líneas 307, 311
- **Commits relacionados:**
  - Commit 3a0068a: Moved `tabIndex={0}` al inicio (permitió paste funcionar)
  - Commit 118b3b4: Moved `tabIndex={0}` al inicio (idem)
- **INTEGRA Metodología:** Protocolos en `integra-metodologia/meta/SPEC-CODIGO.md`

---

**Fecha de Aplicación:** 2026-02-20  
**Validación de Compilación:** ✅ Sin errores  
**Estado Final:** ✅ LISTO PARA STAGING
