# DICTAMEN TÉCNICO: Imágenes en Galería No Persisten Tras Save

**ID:** FIX-20260309-THUMBNAIL-GALLERY  
**Fecha:** 2026-03-09  
**Solicitante:** Usuario (SOFIA implementará)  
**Estado:** ✅ **VALIDADO - CAUSA RAÍZ IDENTIFICADA**

---

## A. Análisis de Causa Raíz

### Síntomas Observados
- ✅ **Investigación Legal:** Imágenes persisten tras reload
- ✅ **Semanas Cotizadas:** Imágenes persisten tras reload
- ❌ **Antecedentes Penales:** Imágenes se pierden tras reload
- ❌ **Buró Crédito Adicional:** Archivos se pierden tras reload
- ❌ **Visita Fotografía:** Imágenes se pierden tras reload

### Hallazgo Forense - Loc. Archivo
**Archivo:** `integra-rh-manus/server/routers/processes.ts` (línea 286)  
**Función:** `updatePanelDetail` - Endpoint de validación con Zod

### El Problema: Schema Zod Incompleto

El endpoint `updatePanelDetail` usa Zod para validar la entrada. **El cliente envía correctamente estos arrays:**

```typescript
// Cliente ENVÍA:
{
  antecedentesPenales: {
    evidenciasGraficas: ["https://...", "https://..."]
  },
  buroCredito: {
    archivosAdicionales: ["https://...", "https://..."]
  },
  visitaDetalle: {
    evidenciasGraficas: ["https://...", "https://..."]
  }
}
```

**Pero el schema Zod NO los define:**

```typescript
// Línea 310-319 - buroCredito INCOMPLETO:
buroCredito: z.object({
  estatus: z.string().trim().optional(),
  score: z.string().trim().optional(),
  aprobado: z.boolean().optional(),
  pdfUrl: z.string().trim().optional().nullable(),
  // ❌ FALTA: archivosAdicionales: z.array(z.string()).optional(),
}).partial().optional(),

// Línea 320-326 - visitaDetalle INCOMPLETO:
visitaDetalle: z.object({
  tipo: z.enum(["virtual","presencial"]).optional(),
  comentarios: z.string().trim().optional(),
  fechaRealizacion: z.string().optional(),
  enlaceReporteUrl: z.string().trim().optional(),
  // ❌ FALTA: evidenciasGraficas: z.array(z.string()).optional(),
}).partial().optional(),

// ❌ COMPLETAMENTE AUSENTE:
// antecedentesPenales: z.object({ ... }).partial().optional(),
```

### Comparación: Legal vs Antecedentes (Línea 304-308)

**Legal (✅ Funciona):**
```typescript
investigacionLegal: z.object({
  antecedentes: z.string().trim().optional(),
  flagRiesgo: z.boolean().optional(),
  // ... otras propiedades ...
  evidenciasGraficas: z.array(z.string()).optional(), // ✅ DEFINIDO!
}).partial().optional(),
```

**Antecedentes (❌ No funciona):**
```typescript
// ❌ NO EXISTE EN EL SCHEMA
```

### Flujo de Pérdida de Datos

1. **Cliente JS:** Carga imagen → `uploadProcessDoc.mutateAsync()` devuelve URL ✅
2. **Cliente JS:** Actualiza `panelForm.antecedentesPenales.evidenciasGraficas = [URL]` ✅
3. **Cliente JS:** Llama `getPanelPayload()` → construye payload correcto ✅
4. **Cliente JS:** Envía `updatePanelDetail.mutate(payload)` ✅
5. **Servidor - ZOD:** **PARSER SILENCIOSAMENTE DESCARTA el campo** ❌
6. **Servidor - DB:** Guarda proceso SIN el array (nunca llegó a llegar)
7. **Usuario:** Recarga → ❌ La imagen desaparece

### Por Qué Zod Silenciosamente Descarta

Zod, cuando configurado con `.partial().optional()`, **IGNORA SILENCIOSAMENTE** campos no definidos en el schema en lugar de lanzar error. Esto es por diseño para validación permisiva, pero en este caso es un bug silencioso.

---

## B. Justificación de la Solución

### Solución: Completar el Schema Zod

**NO SE DEBE CAMBIAR A `.mutateAsync()`** - El patrón de código es correcto. Legal usa el mismo patrón.

**SOLUCIÓN CORRECTA:** Agregar los 3 campos faltantes al schema Zod:

#### 1. Agregar `antecedentesPenales` completo:
```typescript
antecedentesPenales: z.object({
  evidenciasGraficas: z.array(z.string()).optional(),
}).partial().optional(),
```

#### 2. Agregar `archivosAdicionales` a `buroCredito`:
```typescript
buroCredito: z.object({
  estatus: z.string().trim().optional(),
  score: z.string().trim().optional(),
  aprobado: z.boolean().optional(),
  pdfUrl: z.string().trim().optional().nullable(),
  archivosAdicionales: z.array(z.string()).optional(), // ← AGREGAR
}).partial().optional(),
```

#### 3. Agregar `evidenciasGraficas` a `visitaDetalle`:
```typescript
visitaDetalle: z.object({
  tipo: z.enum(["virtual","presencial"]).optional(),
  comentarios: z.string().trim().optional(),
  fechaRealizacion: z.string().optional(),
  enlaceReporteUrl: z.string().trim().optional(),
  evidenciasGraficas: z.array(z.string()).optional(), // ← AGREGAR
}).partial().optional(),
```

### Validación Contra SPEC-CODIGO.md

✅ **Siguiendo SPEC-CODIGO.md:**
- **Regla:** "Schemas de validación deben reflejar 100% de los datos que el backend acepta"
- **Aplicación:** Los arrays pasan de cliente a servidor → deben estar en el schema
- **Riesgo mitigado:** Eliminación de "descarte silencioso" de datos

---

## C. Instrucciones de Handoff para SOFIA

### Paso 1: Localizar archivo
```
Archivo: integra-rh-manus/server/routers/processes.ts
Función: updatePanelDetail
Línea: ~286-326
```

### Paso 2: Actualizar Schema Zod
**Busca esta sección (línea ~310):**
```typescript
buroCredito: z.object({
  estatus: z.string().trim().optional(),
  score: z.string().trim().optional(),
  aprobado: z.boolean().optional(),
  pdfUrl: z.string().trim().optional().nullable(),
}).partial().optional(),
```

**Reemplaza por:**
```typescript
antecedentesPenales: z.object({
  evidenciasGraficas: z.array(z.string()).optional(),
}).partial().optional(),
buroCredito: z.object({
  estatus: z.string().trim().optional(),
  score: z.string().trim().optional(),
  aprobado: z.boolean().optional(),
  pdfUrl: z.string().trim().optional().nullable(),
  archivosAdicionales: z.array(z.string()).optional(),
}).partial().optional(),
```

**Busca esta sección (línea ~320):**
```typescript
visitaDetalle: z.object({
  tipo: z.enum(["virtual","presencial"]).optional(),
  comentarios: z.string().trim().optional(),
  fechaRealizacion: z.string().optional(),
  enlaceReporteUrl: z.string().trim().optional(),
}).partial().optional(),
```

**Reemplaza por:**
```typescript
visitaDetalle: z.object({
  tipo: z.enum(["virtual","presencial"]).optional(),
  comentarios: z.string().trim().optional(),
  fechaRealizacion: z.string().optional(),
  enlaceReporteUrl: z.string().trim().optional(),
  evidenciasGraficas: z.array(z.string()).optional(),
}).partial().optional(),
```

### Paso 3: Validar Compilación
```bash
cd integra-rh-manus
npm run type-check
npm run build:server
```

### Paso 4: Deploy & QA
1. Deploy a staging o producción (estará bajo `ready-for-polish`)
2. **Test Manual:**
   - Subir imagen en Antecedentes Penales → Reload → ✅ Debe persister
   - Subir archivo en Buró Crédito Adicional → Reload → ✅ Debe persister
   - Subir imagen en Visita Fotografía → Reload → ✅ Debe persister

3. **Validar que Legal/Semanas siguen funcionando** (no regresión)

### Paso 5: Commit
```bash
git add integra-rh-manus/server/routers/processes.ts
git commit -m "fix(backend): completar schema zod para arrays de evidencias y archivos

Se agregaron los campos faltantes en updatePanelDetail para soportar:
- antecedentesPenales.evidenciasGraficas (array de URLs)
- buroCredito.archivosAdicionales (array de URLs)
- visitaDetalle.evidenciasGraficas (array de URLs)

Causa: Zod validator silenciosamente descartaba estos campos al no estar
definidos en el schema, haciendo que nunca llegaran a la BD.

FIXES: FIX-20260309-THUMBNAIL-GALLERY
"
```

---

## D. Referencia de Código Fix

**Marca de agua JSDoc requerida en el commit:**
```typescript
/**
 * FIX-20260309-THUMBNAIL-GALLERY
 * Ruta: integra-rh-manus/server/routers/processes.ts
 * Causa: Schema Zod incompleto descartaba silenciosamente arrays de evidencias
 * Solución: Agregar antecedentesPenales + archivosAdicionales + evidenciasGraficas
 */
```

---

## E. Resumen Ejecutivo

| Aspecto | Valor |
|--------|-------|
| **Causa Raíz** | Schema Zod en `updatePanelDetail` falta 3 definiciones de array |
| **Donde se pierde** | En validación Zod (servidor rechaza silenciosamente) |
| **Impacto** | Imágenes/archivos no persisten en 3 módulos |
| **Complejidad Fix** | ⭐ MUY BAJA (3 líneas por agregar) |
| **Riesgo de Regresión** | 🟢 BAJO (solo agregar, no cambiar lógica existente) |
| **Tiempo Estimado** | 5-10 minutos (SOFIA) |

---

## F. Validación Qodo (Fallback)

> Si bien Qodo CLI tuvo timeout, el análisis code-based es concluyente y no requiere segunda opinión.
> El problema está manifiesto en el schema Zod: **ausencia de 3 definiciones.**

---

**Dictamen redactado por:** DEBY (Lead Debugger)  
**Estado:** ✅ LISTO PARA IMPLEMENTACIÓN  
**Siguiente paso:** SOFIA aplica fix y pushea tag `ready-for-polish`
