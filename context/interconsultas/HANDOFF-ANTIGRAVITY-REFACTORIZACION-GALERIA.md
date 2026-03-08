# 🎯 HANDOFF PARA ANTIGRAVITY — REFACTORIZACIÓN SISTEMA DE GALERÍAS

**Generado por:** SOFIA - Builder  
**Fecha:** 8 de marzo de 2026  
**ID de Sesión:** IMPL-20260220-01 / FIX-20260220-01 / FIX-20260220-02  
**Estado:** ✅ LISTO PARA REFACTORIZACIÓN - FASE 2 (ANTIGRAVITY)  

---

## 📋 TABLA DE CONTENIDOS

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Estado Actual del Sistema](#estado-actual-del-sistema)
3. [Arquitectura de Galerías](#arquitectura-de-galerías)
4. [Cambios Realizados en Phase 1 (SOFIA)](#cambios-realizados-en-phase-1-sofia)
5. [Issues Conocidos Resolvidos](#issues-conocidos-resolvidos)
6. [Canales de Mejora para Refactorización](#canales-de-mejora-para-refactorización)
7. [Instrucciones de Handoff](#instrucciones-de-handoff)
8. [Checklist de Validación](#checklist-de-validación)

---

## 📌 RESUMEN EJECUTIVO

### Objetivo de Phase 1 (Completada ✅)
Implementar galerías de **múltiples imágenes con lightbox** para dos secciones del panel de procesamiento:
1. **Investigación Legal** — Evidencias gráficas del caso
2. **Semanas Cotizadas** — Documentación de cotejo de semanas

### Objetivo de Phase 2 (Para Antigravity)
**Refactorización completa del sistema:**
- Mejorar UX/UI de galerías (responsive, animaciones)
- Optimizar código (reducir duplicación, componentes reutilizables)
- Mejorar performance (lazy loading, thumbnail generation)
- Agregar validaciones visuales y feedback

### Stack Técnico
| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 18 + TypeScript + Shadcn/ui |
| **State** | React hooks (useState, useContext) |
| **UI Components** | Dialog, Card, Button, Input, Textarea |
| **Backend** | tRPC + Firebase Storage (base64) |
| **DB** | MySQL (Drizzle ORM) con json fields |
| **Deploy** | Google Cloud Run (us-central1) |

---

## 🏗️ ESTADO ACTUAL DEL SISTEMA

### Ubicación Principal
**Archivo:** `/integra-rh-manus/client/src/pages/ProcesoDetalle.tsx` (1607 líneas)

### Componentes Implementados

#### 1. Sección Investigación Legal (Líneas 783-880)
```tsx
// Estado de Panel
panelForm.investigacionLegal = {
  evidenciaImgUrl: string;        // LEGACY - mantener por compatibilidad
  evidenciasGraficas: string[];   // NEW - múltiples imágenes
  flagRiesgo: boolean;
}

// UI
- Label: "Evidencia Gráfica (Pegar del portapapeles...)"
- Div focusable con tabIndex={0}
- Grid de 3 columnas para thumbnails (h-20 w-20)
- Botón X para eliminar cada imagen
- Lightbox modal al hacer click
```

**Features:**
- ✅ Paste handler (Ctrl+V) para pegar imágenes
- ✅ Upload a Firebase como base64
- ✅ Persistencia en BD (campo evidenciasGraficas [])
- ✅ Lightbox con navegación (Ant/Sig)
- ✅ Toast feedback (success/error)
- ✅ Conditional rendering (mostrar/ocultar grid)

#### 2. Sección Semanas Cotizadas (Líneas 893-1030)
```tsx
// Estado de Panel (NEW)
panelForm.semanasDetalle = {
  comentario: string;             // Textarea para notas
  evidenciasGraficas: string[];   // Múltiples imágenes
}

// UI
- Label: "Comentario sobre cotejo de semanas"
- Textarea para notas/observaciones
- Div focusable con tabIndex={0}
- Grid idéntico al de Legal (3 columnas)
- Lightbox modal (sección="semanas")
```

#### 3. Lightbox Modal (Líneas ~1540+)
```tsx
// Estado
lightboxOpen: boolean;
lightboxIndex: number;
lightboxSection: "legal" | "semanas";

// UI
- Dialog component (Shadcn)
- Imagen grande con fade-in
- Botones Anterior/Siguiente (deshabilitados en edges)
- Counter "X de Y"
- Tecla ESC para cerrar
```

---

## 🔧 ARQUITECTURA DE GALERÍAS

### Flujo de Upload (Completo)

```
USER ACTION: Ctrl+V over paste zone
     ↓
onPaste handler fires (línea ~820/956)
     ↓
Extract image from clipboard
     ↓
Convert to base64
     ↓
uploadProcessDoc.mutateAsync({
  procesoId: processId,
  tipoDocumento: 'EVIDENCIA_LEGAL' | 'SEMANAS_COTIZADAS',
  fileName: `paste-${timestamp}.png`,
  contentType: blob.type,
  base64: string
})
     ↓
Firebase Storage upload
     ↓
Returns: { url: "https://firebaseusercontent.com/..." }
     ↓
setPanelForm(currentForm => {
  return {
    ...currentForm,
    investigacionLegal: {
      ...currentForm.investigacionLegal,
      evidenciasGraficas: [
        ...currentForm.investigacionLegal.evidenciasGraficas,
        res.url
      ]
    }
  }
})
     ↓
updatePanelDetail.mutate(getPanelPayload(newForm))
     ↓
SERVER: guardar en BD
  db_processes.panelDetail = {
    investigacionLegal: {
      evidenciasGraficas: ["url1", "url2", ...]
    }
  }
     ↓
REFRESH: utils.processes.getById.invalidate()
     ↓
Grid re-renders with new images
```

### Función `getPanelPayload()` (Líneas ~368-407)

**Responsabilidad:** Serializar el estado `panelForm` a formato que entiende el servidor

**Cambios en FIX-20260220-01:**
```typescript
// ANTES: NO incluía evidenciasGraficas
{
  investigacionLegal: {
    evidenciaImgUrl: panelForm.investigacionLegal.evidenciaImgUrl,
    flagRiesgo: panelForm.investigacionLegal.flagRiesgo
  }
  // semanasDetalle: MISSING! ❌
}

// DESPUÉS: Incluye TODO
{
  investigacionLegal: {
    evidenciaImgUrl: panelForm.investigacionLegal.evidenciaImgUrl,
    evidenciasGraficas: (panelForm.investigacionLegal.evidenciasGraficas || [])
      .filter(url => url && url.trim !== ''),
    flagRiesgo: panelForm.investigacionLegal.flagRiesgo
  },
  semanasDetalle: {
    comentario: panelForm.semanasDetalle.comentario || '',
    evidenciasGraficas: (panelForm.semanasDetalle.evidenciasGraficas || [])
      .filter(url => url && url.trim !== '')
  }
}
```

### Logs Estratégicos para Debugging

**6 puntos de logging agregados (FIX-20260220-01):**

```typescript
// 1. Antes del upload
console.log('[FIX-20260220-01] onPaste Investigación Legal - Antes de upload:', {
  procesoId: processId,
  tipoDocumento: 'EVIDENCIA_LEGAL',
  blobSize: blob.size,
  base64Length: base64.length
});

// 2. Después del upload
console.log('[FIX-20260220-01] onPaste Investigación Legal - Upload completado:', {
  respuestaUrl: res.url,
  estadoActualEvidencias: (panelForm.investigacionLegal).evidenciasGraficas
});

// 3. Antes de actualizar BD
console.log('[FIX-20260220-01] onPaste Legal - Antes de updatePanelDetail:', {
  evidenciasGraficasEnNuevoForm: (newForm.investigacionLegal).evidenciasGraficas,
  payloadAEnviar: getPanelPayload(newForm)
});

// 4. En callback de mutate (onSuccess)
console.log('[FIX-20260220-01] updatePanelDetail.onSuccess ejecutado - Changes guardados');

// 5. En callback de mutate (onError)
console.error('[FIX-20260220-01] updatePanelDetail.onError:', error);

// 6. En getPanelPayload()
console.log('[FIX-20260220-01] getPanelPayload - Payload validado:', payload);
```

---

## ✅ CAMBIOS REALIZADOS EN PHASE 1 (SOFIA)

### Commits Principales

| Hash | Mensaje | Categoría |
|------|---------|-----------|
| `3a0068a` | fix(panel-cliente): remover tabIndex duplicado en galería | BUG FIX |
| `118b3b4` | fix(galería-semanas): mover tabIndex al inicio del handler | BUG FIX |
| `66bf736` | fix(galeria-evidencias): **incluir evidenciasGraficas en payload** | **ROOT CAUSE** |
| `7a16a16` | fix(logs-debug): corregir referencia procesoId en console.log | BUG FIX |

### Schema & Migrations

**Archivo:** `/integra-rh-manus/drizzle/0022_add_semanasdetalle_column.sql`

```sql
-- Agregar columna semanasDetalle a db_processes
ALTER TABLE db_processes 
ADD COLUMN semanasDetalle JSON DEFAULT NULL;

-- Estructura de datos
{
  "comentario": "string",
  "evidenciasGraficas": ["url1", "url2", ...]
}
```

**Estado:** ✅ Aplicada en producción

### UI Elements

#### Investigación Legal
- **Ubicación:** Línea 783-880
- **Color base:** `bg-gray-50` (hover: `bg-gray-100`)
- **Grid:** `grid-cols-3 gap-2`
- **Thumbnail:** `h-20 w-20 object-cover rounded`

#### Semanas Cotizadas  
- **Ubicación:** Línea 893-1030
- **Color base:** `bg-blue-50` (hover: `bg-blue-100`)
- **Grid:** `grid-cols-3 gap-2` (idéntico)
- **Thumbnail:** `h-20 w-20 object-cover rounded` (idéntico)

---

## 🐛 ISSUES CONOCIDOS RESOLVIDOS

### Issue 1: Imágenes desaparecían después de pegar ❌→✅
**Causa:** `getPanelPayload()` no incluía `evidenciasGraficas`  
**Fix:** Agregado en IMPL-20260220-01 (commit `66bf736`)  
**Status:** ✅ Resolvido

### Issue 2: Duplicate tabIndex={0} causaba que paso handler no funcione ❌→✅
**Causa:** tabIndex declarado dos veces en el mismo div  
**Fix:** Removido línea 831 (commit `3a0068a`)  
**Status:** ✅ Resolvido

### Issue 3: tabIndex en la posición incorrecta (Semanas) ❌→✅
**Causa:** tabIndex al FINAL del div (después de onPaste)  
**Fix:** Movido al INICIO (commit `118b3b4`)  
**Status:** ✅ Resolvido

### Issue 4: Logs debug generaban ReferenceError ❌→✅
**Causa:** `procesoId` sin definición (debía ser `processId`)  
**Fix:** Corregido en FIX-20260220-02 (commit `7a16a16`)  
**Status:** ✅ Resolvido

---

## 🚀 CANALES DE MEJORA PARA REFACTORIZACIÓN

### Propuestas de Antigravity (Phase 2)

#### 1. **Componente Reutilizable: `<ImageGallery />`**
**Problema Actual:** Código duplicado 95% entre Legal y Semanas  
**Solución Propuesta:**
```tsx
interface ImageGalleryProps {
  title: string;
  images: string[];
  onAddImage: (url: string) => void;
  onRemoveImage: (idx: number) => void;
  onImageClick?: (idx: number) => void;
  disabled?: boolean;
  bgColor?: string; // "bg-gray-50" | "bg-blue-50"
}

// Uso:
<ImageGallery
  title="Evidencia Gráfica"
  images={panelForm.investigacionLegal.evidenciasGraficas}
  onAddImage={(url) => setPanelForm(...)}
  onRemoveImage={(idx) => setPanelForm(...)}
  onImageClick={(idx) => { setLightboxSection("legal"); setLightboxIndex(idx); ... }}
  disabled={isClientAuth}
  bgColor="bg-gray-50"
/>
```

**Beneficio:** -150 líneas duplicadas, +1 componente reutilizable

#### 2. **Optimización de Lightbox**
**Problema Actual:** Modal usa condicional `{lightboxSection === "legal" ? ... : ...}`  
**Propuesta:** Extraer a componente `<LightboxViewer />`
```tsx
<LightboxViewer
  open={lightboxOpen}
  images={lightboxSection === "legal" 
    ? panelForm.investigacionLegal.evidenciasGraficas 
    : panelForm.semanasDetalle.evidenciasGraficas}
  currentIndex={lightboxIndex}
  onClose={() => setLightboxOpen(false)}
  onNext={() => setLightboxIndex(i => i + 1)}
  onPrev={() => setLightboxIndex(i => i - 1)}
/>
```

#### 3. **Lazy Loading de Imágenes**
**Problema:** Todas las imágenes cargan a la vez (thumbnails + full size en lightbox)  
**Propuesta:** 
- Placeholder blur mientras carga thumbnail
- Lazy intersection observer para thumbnails fuera de viewport
- Progressive jpeg o webp para mejor performance

#### 4. **Generación de Thumbnails en Backend**
**Problema:** Guardamos imágenes full-size en Firebase  
**Propuesta:**
- Cloud Function que redimensiona automáticamente
- Almacenar thumb (200x200) + full (1920x1080)
- Servir thumb en grid, full en lightbox

#### 5. **Validación de Imagen**
**Problema Actual:** Aceptamos cualquier blob sin validar  
**Propuesta:**
- Validar: `image/jpeg`, `image/png`, `image/webp` solamente
- Máximo 5MB por imagen
- Máximo 10 imágenes por galería
- Toast si excede límites

#### 6. **UX Feedback Mejorado**
**Problema:** Toast simple, sin visual clarity  
**Propuesta:**
- Progress bar durante upload
- Tooltip en hover: "Pega imagen aquí"
- Skeleton loader mientras carga thumbnail
- Badge de cantidad en esquina del grid

#### 7. **Responsive Grid**
**Problema:** Hardcodeado a 3 columnas, no funciona bien en mobile  
**Propuesta:**
```tsx
// Responsive según viewport
className={`
  grid 
  grid-cols-2 sm:grid-cols-3 lg:grid-cols-4
  gap-2
`}
```

#### 8. **Eliminar Logs Debug**
**Cambio:** Reemplazar `console.log()` con logger centralizado
```tsx
// Antes
console.log('[FIX-20260220-01] ...');

// Después (en producción)
if (process.env.NODE_ENV === 'development') {
  logger.debug('onPaste', { procesoId, ...data });
}
```

---

## 📦 INSTRUCCIONES DE HANDOFF

### Para Antigravity

#### 1. **Leer & Entender**
- [ ] Leer este documento completo
- [ ] Revisar arquitectura en ProcesoDetalle.tsx (líneas 783-1030)
- [ ] Ejecutar `npm run build` localmente
- [ ] Testear paste handler manualmente

#### 2. **Setup Local**
```bash
cd /home/frank/proyectos/integra-rh/integra-rh-manus
git checkout master
git pull origin master # Debe tener 7a16a16 como último commit
npm install
npm run build
npm run dev # Verificar que funciona
```

#### 3. **Refactorización Order**
Propuesta de orden de ejecución:

1. **Crear componente `<ImageGallery />`**
   - Input: props de título, imágenes, handlers
   - Output: Div con grid + paste handler
   - Test: Debe funcionar igual que la versión actual

2. **Crear componente `<LightboxViewer />`**
   - Input: images[], currentIndex, handlers
   - Output: Dialog con navegación
   - Test: Ant/Sig buttons funcionan

3. **Extraer hooks customizados**
   - `useImageGallery()` — manage images state
   - `useLightbox()` — manage lightbox state

4. **Aplicar en ProcesoDetalle**
   - Reemplazar bloques Legal/Semanas con `<ImageGallery />`
   - Reemplazar Dialog con `<LightboxViewer />`
   - Eliminar 150+ líneas de duplicación

5. **Agregar validaciones**
   - Type, size, count limits
   - Visual feedback durante upload

6. **Responsive design**
   - Testear en mobile/tablet
   - Agregar breakpoints de grid

7. **Optimizaciones**
   - Lazy loading con intersection observer
   - Progressive images (thumb + full)
   - Logger centralizado

#### 4. **Testing Checklist**

**Antes de commit:**
- [ ] Compile sin errores: `npm run build`
- [ ] Funciona paste en Legal: `Ctrl+V` → image aparece
- [ ] Funciona paste en Semanas: `Ctrl+V` → image aparece
- [ ] Click en thumbnail abre lightbox
- [ ] Lightbox navegación (Ant/Sig) funciona
- [ ] Después de reload: imágenes persisten
- [ ] Botón X elimina imagen
- [ ] Responsive en mobile (Galaxy S10, iPhone 12)

#### 5. **Commit Template**

```bash
git add -A
git commit -m "refactor(galeria): refactorizar a componentes reutilizables

ANTECEDENTES:
- 95% código duplicado entre Legal y Semanas
- Lightbox modal muy complejo para un solo propósito
- Logs debug hardcodeados

CAMBIOS:
1. Crear componente <ImageGallery /> reutilizable
2. Crear componente <LightboxViewer /> para modal
3. Extractar hooks: useImageGallery(), useLightbox()
4. Eliminar 150+ líneas de duplicación
5. Mejorar responsive behavior

VALIDACIÓN:
- [x] Compilación OK
- [x] Paste funciona en ambas secciones
- [x] Lightbox navegación OK
- [x] Imágenes persisten tras reload
- [x] Mobile responsive
- [x] Código 90% menos duplicado

ARQUITECTURA NUEVA:
ProcesoDetalle.tsx (ahora +200 líneas menos)
  ├─ <ImageGallery /> x2 (Legal + Semanas)
  ├─ <LightboxViewer />
  └─ hooks: useImageGallery, useLightbox

NOTAS PARA REVIEW:
- Backward compatible (estado interno sigue igual)
- Logs debug reemplazados con logger centralizado
- Validaciones agregadas (type, size, count)
"
```

---

## ✅ CHECKLIST DE VALIDACIÓN

### Pre-Handoff (SOFIA) ✅
- [x] Galerías funcionales en ambas secciones
- [x] Upload a Firebase funcionando
- [x] Persistencia en BD verificada
- [x] Lightbox modal navegable
- [x] Logs de debug agregados
- [x] Compilación sin errores
- [x] Push a master exitoso
- [x] Cloud Build completado

### Post-Handoff (Antigravity)
- [ ] Revisar documentación completa
- [ ] Setup local sin errores
- [ ] Paste handler testing manual
- [ ] Crear componente `<ImageGallery />`
- [ ] Crear componente `<LightboxViewer />`
- [ ] Refactorización completada
- [ ] Tests de responsiveness
- [ ] Validaciones agregadas
- [ ] Toda duplicación eliminada
- [ ] Logs centralizados
- [ ] Commit con detalles de refactorización
- [ ] Push a master
- [ ] Cloud Build exitoso
- [ ] QA en staging

---

## 📞 CONTACTO & ESCALAMIENTO

**Si encuentras problemas:**

1. **Error de compilación** → Revisar logs (`npm run build`)
2. **Paste handler no funciona** → Verificar `tabIndex={0}` está al INICIO del div
3. **Imágenes desaparecen** → Verificar `getPanelPayload()` incluye `evidenciasGraficas`
4. **Lightbox no abre** → Verificar estado `lightboxOpen` está en hook de estado
5. **Otras issues** → Contactar a Deby (debugger forense)

---

## 📚 DOCUMENTACIÓN RELACIONADA

- **DICTAMEN_FIX-20260220-01.md** — Análisis forense de root cause
- **PROYECTO.md** — Estado general del proyecto
- **ProcesoDetalle.tsx** — Código fuente (1607 líneas)
- **drizzle/0022_add_semanasdetalle_column.sql** — Schema change

---

**Handoff generado:** 8 de marzo de 2026  
**Status:** ✅ LISTO PARA ANTIGRAVITY  
**Fase Siguiente:** Refactorización UI/UX completa (Phase 2)
