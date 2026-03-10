# Checkpoint: FIX-20260309-THUMBNAIL-GALLERY

**Fecha:** 2026-03-09  
**Estado:** ✅ ANÁLISIS COMPLETADO - DICTAMEN REDACTADO  
**Asignado a:** SOFIA (Implementación)  

## Resumen Forense

### Problema
Imágenes no persisten en galería tras reload en:
- Antecedentes Penales ❌
- Buró Crédito Adicional ❌
- Visita Fotografía ❌

Pero sí persisten en:
- Investigación Legal ✅
- Semanas Cotizadas ✅

### Causa Raíz Identificada
**Schema Zod en `updatePanelDetail` (server/routers/processes.ts:286) está INCOMPLETO.**

Faltan 3 definiciones que causan que Zod **silenciosamente ignore** los arrays:
```
1. antecedentesPenales → COMPLETAMENTE AUSENTE
2. buroCredito.archivosAdicionales → NO DEFINIDO
3. visitaDetalle.evidenciasGraficas → NO DEFINIDO
```

### Impacto
El cliente envía correctamente:
```json
{
  "antecedentesPenales": { "evidenciasGraficas": ["url1", "url2"] },
  "buroCredito": { "archivosAdicionales": ["url1"] },
  "visitaDetalle": { "evidenciasGraficas": ["url1", "url2"] }
}
```

Pero Zod los descarta → nunca llegan a BD → usuario ve "desaparición" tras reload.

## Solución Exacta (SOFIA)

### Archivo a Modificar
```
integra-rh-manus/server/routers/processes.ts (línea 286-326)
```

### Cambios Precisos

#### CAMBIO 1: Agregar `antecedentesPenales` después de `semanasDetalle`
**Buscar línea ~310 (antes de `buroCredito`):**
```typescript
semanasDetalle: z.object({
  comentario: z.string().trim().optional(),
  evidenciasGraficas: z.array(z.string()).optional(),
}).partial().optional(),
```

**Agregar después:**
```typescript
antecedentesPenales: z.object({
  evidenciasGraficas: z.array(z.string()).optional(),
}).partial().optional(),
```

#### CAMBIO 2: Agregar `archivosAdicionales` a `buroCredito`
**Buscar en `buroCredito` schema (línea ~313):**
```typescript
buroCredito: z.object({
  estatus: z.string().trim().optional(),
  score: z.string().trim().optional(),
  aprobado: z.boolean().optional(),
  pdfUrl: z.string().trim().optional().nullable(),
}).partial().optional(),
```

**Actualizar a:**
```typescript
buroCredito: z.object({
  estatus: z.string().trim().optional(),
  score: z.string().trim().optional(),
  aprobado: z.boolean().optional(),
  pdfUrl: z.string().trim().optional().nullable(),
  archivosAdicionales: z.array(z.string()).optional(),
}).partial().optional(),
```

#### CAMBIO 3: Agregar `evidenciasGraficas` a `visitaDetalle`
**Buscar en `visitaDetalle` schema (línea ~319):**
```typescript
visitaDetalle: z.object({
  tipo: z.enum(["virtual","presencial"]).optional(),
  comentarios: z.string().trim().optional(),
  fechaRealizacion: z.string().optional(),
  enlaceReporteUrl: z.string().trim().optional(),
}).partial().optional(),
```

**Actualizar a:**
```typescript
visitaDetalle: z.object({
  tipo: z.enum(["virtual","presencial"]).optional(),
  comentarios: z.string().trim().optional(),
  fechaRealizacion: z.string().optional(),
  enlaceReporteUrl: z.string().trim().optional(),
  evidenciasGraficas: z.array(z.string()).optional(),
}).partial().optional(),
```

## QA Checklist para SOFIA

### Pre-Commit
- [ ] Archivo compila sin TypeScript errors: `npm run type-check`
- [ ] Build OK: `npm run build:server`
- [ ] No hay imports faltantes

### Post-Deploy Testing
- [ ] **Test Antecedentes Penales:**
  1. Abrir proceso con rol "analista"
  2. Subir imagen via paste en Antecedentes Penales
  3. Ver que aparece en galería ✅
  4. Hacer click en botón Save o salir de la página
  5. Reload page (F5)
  6. Verificar imagen aun está ahí ✅

- [ ] **Test Buró Crédito Adicional:**
  1. Subir archivo/imagen en "Buró Crédito Adicional"
  2. Verificar aparece en galería
  3. Save y reload
  4. Verificar imagen persiste ✅

- [ ] **Test Visita Fotografía:**
  1. Subir imagen en "Visita Fotografía"
  2. Verificar aparece en galería
  3. Save y reload
  4. Verificar imagen persiste ✅

- [ ] **Regresión - Legal & Semanas:**
  1. Verificar que Legal aún funciona (debe seguir igual)
  2. Verificar que Semanas aún funciona (debe seguir igual)

### Commit Message
```
fix(backend): completar schema zod para arrays de evidencias y archivos

Agregué campos faltantes en updatePanelDetail para soportar:
- antecedentesPenales.evidenciasGraficas (array de URLs)
- buroCredito.archivosAdicionales (array de URLs)  
- visitaDetalle.evidenciasGraficas (array de URLs)

Zod validator silenciosamente descartaba estos campos al no estar
definidos en schema. Ahora se guardan correctamente en BD.

FIXES: FIX-20260309-THUMBNAIL-GALLERY
```

## Referencias
- **Dictamen técnico:** `/home/frank/proyectos/integra-rh/context/interconsultas/DICTAMEN_FIX-20260309-THUMBNAIL-GALLERY.md`
- **Archivo fuente:** `integra-rh-manus/server/routers/processes.ts`
- **Líneas:** 286-326 (updatePanelDetail mutation)
