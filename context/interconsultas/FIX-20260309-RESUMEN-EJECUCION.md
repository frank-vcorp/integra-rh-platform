# 🔧 FIX EJECUTABLE - Antecedentes Penales (FIX-20260309)

## 📊 Estado del Fix

| Aspecto | Estado |
|---------|--------|
| **Análisis** | ✅ Completado (DICTAMEN generado) |
| **Causa Raíz** | ✅ Identificada (Columna JSON faltante en BD) |
| **Migración SQL** | ✅ Creada - `drizzle/0023_add_antecedentes_penales.sql` |
| **Schema TypeScript** | ✅ Actualizado - `drizzle/schema.ts` |
| **Schema JS Compilado** | ✅ Actualizado - `drizzle/schema.js` |
| **Documentación** | ✅ Completa - `DICTAMEN_FIX-20260309-ANTECEDENTES-PENALES-ONLY.md` |
| **Ready for Deploy** | ⏳ Pendiente ejecución manual de migración |

---

## 🎯 Cambios Realizados

### 1. Archivo: `drizzle/0023_add_antecedentes_penales.sql` [NUEVO]

```sql
ALTER TABLE `processes` 
ADD COLUMN `antecedentesPenales` json DEFAULT NULL COMMENT 'Antecedentes penales - evidencias gráficas';
```

**Líneas:** 1  
**Acción:** Crear archivo nuevo  
**Numeración:** 0023 (secuencia after 0022_add_semanasdetalle_column.sql)

### 2. Archivo: `drizzle/schema.ts` [MODIFICADO]

**Líneas 509-524:** Agregadas/Actualizadas 3 campos JSON:

```typescript
// NUEVO: antecedentesPenales
antecedentesPenales: json("antecedentesPenales").$type<{
  evidenciasGraficas?: string[]; // Array de URLs de evidencias gráficas
}>(),

// ACTUALIZADO: buroCredito (agregar archivosAdicionales)
buroCredito: json("buroCredito").$type<{
  pdfUrl?: string; // Archivo PDF del reporte de Buró
  archivosAdicionales?: string[]; // Array de URLs de archivos adicionales
}>(),

// ACTUALIZADO: visitaDetalle (agregar evidenciasGraficas)
visitaDetalle: json("visitaDetalle").$type<{
  tipo?: "virtual" | "presencial";
  comentarios?: string;
  fechaRealizacion?: string;
  enlaceReporteUrl?: string;
  evidenciasGraficas?: string[]; // Array de URLs de evidencias de visita
}>(),
```

**Cambios Resumidos:**
- ✅ Agregó `antecedentesPenales` JSON (completamente nuevo)
- ✅ Agregó `buroCredito.archivosAdicionales` (faltaba)
- ✅ Agregó `visitaDetalle.evidenciasGraficas` (faltaba)

### 3. Archivo: `drizzle/schema.js` [MODIFICADO]

**Línea 205:** Agregada la columna compilada:

```javascript
semanasDetalle: (0, mysql_core_1.json)("semanasDetalle").$type(),
antecedentesPenales: (0, mysql_core_1.json)("antecedentesPenales").$type(),
```

**Acción:** Mantener sincronía con schema.ts

---

## 📋 Pasos de Ejecución Pendientes

### OPCIÓN 1: Deploy CI/CD (Recomendado - Automático)

```bash
# 1. Commit los cambios
git add drizzle/schema.ts drizzle/schema.js drizzle/0023_add_antecedentes_penales.sql
git commit -m "fix(schema): agregar antecedentesPenales y completar visitaDetalle/buroCredito

- Crea columna JSON antecedentesPenales para evidencias gráficas
- Actualiza visitaDetalle con field evidenciasGraficas
- Actualiza buroCredito con field archivosAdicionales
- Migración: drizzle/0023_add_antecedentes_penales.sql

FIX-20260309-ANTECEDENTES-PENALES-ONLY"

# 2. Push a rama (trigger Cloud Build automáticamente)
git push origin main

# 3. Cloud Build ejecutará:
#    - docker build
#    - docker push
#    - gcloud run deploy
#    - (PERO NO ejecuta migraciones = PROBLEMA)
```

**ADVERTENCIA:** Cloud Build no ejecuta migraciones. Requiere paso adicional.

### OPCIÓN 2: Ejecución Manual de Migración (Better Safety)

```bash
# 1. Primero, commit y deploy normalmente (mismo que arriba)
git add ... && git commit ... && git push origin main
# Cloud Build deploy (requiere ~2-3 min)

# 2. Luego, ejecutar migración en Cloud SQL:
gcloud sql connect integra-rh-db --user=root << 'EOF'
ALTER TABLE `processes` 
ADD COLUMN `antecedentesPenales` json DEFAULT NULL COMMENT 'Antecedentes penales - evidencias gráficas';
EOF

# 3. Verificar que se agregó:
gcloud sql connect integra-rh-db --user=root << 'EOF'
SHOW COLUMNS FROM processes LIKE 'antecedentesPenales';
EOF

# Expected output:
# Field: antecedentesPenales
# Type: json
# Null: YES
# Default: NULL
```

### OPCIÓN 3: Automatizar en Dockerfile.prod (Futuro)

Editar `Dockerfile.prod` para ejecutar migraciones post-build:

```dockerfile
# ... después de `npm install --production` ...
RUN npm run db:push || true  # Continuar incluso si fallan (idempotente)
```

**Nota:** Esta opción requiere que `npm run db:push` esté configurado para conectar a Cloud SQL (requiere credenciales).

---

## 🧪 Test Funcional Post-Deploy

### ClienteSide Test (F12 Console)

```javascript
// 1. Verifica que el campo se cargó correctamente
const process = await fetch('/api/trpc/processes.getById?input={"id":123}');
const data = await process.json();
console.log('antecedentesPenales:', data.result.data.antecedentesPenales);
// Debe mostrar: { evidenciasGraficas: [] } o { evidenciasGraficas: ['url1', 'url2'] }
```

### Flujo End-to-End

1. **Navegar** a un Proceso (ProcesoDetalle)
2. **Pegar imagen** en sección "Antecedentes Penales" (CTRL+V)
3. **Esperar** a que se suba (toast "Evidencia guardada")
4. **Hacer click** "Guardar bloques"
5. **Abrir DevTools → Network**
   - Filtrar por `updatePanelDetail`
   - Verificar que el POST contiene: `"antecedentesPenales":{"evidenciasGraficas":["gs://..."]}`
6. **Recargar página** (F5)
7. ✅ **Verificar** que la imagen aún está en la galería (NO debe desaparecer)
8. **Bonus:** Ejecutar en Console:
   ```javascript
   await new Promise(r => {
     const checkDb = setInterval(async () => {
       const res = await fetch('/api/trpc/processes.getById?input={"id":'+window.processId+'}');
       const d = await res.json();
       if (d.result.data.antecedentesPenales?.evidenciasGraficas?.length > 0) {
         console.log('✅ BD SAVED:', d.result.data.antecedentesPenales);
         clearInterval(checkDb);
         r();
       }
     }, 1000);
     setTimeout(() => clearInterval(checkDb), 10000);
   });
   ```

---

## ⚠️ Rollback Plan (Si Algo Falla)

```bash
# Revert to previous schema
git revert <commit-hash>
git push origin main

# Cloud Build redeploys automatically

# If data was corrupted, restore from backup:
gcloud sql backups restore <backup-id> --backup-instance=integra-rh-db
```

---

## 📞 Handoff Details

**Para:** SOFIA (Builder)  
**Prioridad:** 🔴 ALTA (Bloquea captura de Antecedentes Penales)  
**Tiempo Estimado:** 30 min (ejecución manual) o 5 min (si CI/CD se automatiza)  
**Validación:** Qodo CLI ✅  
**Documentación:** Completa en DICTAMEN_FIX-20260309-ANTECEDENTES-PENALES-ONLY.md

**Pasos a Ejecutar:**
1. ✅ Revisar cambios en schema.ts y schema.js
2. ✅ Revisar migración SQL en drizzle/0023_add_antecedentes_penales.sql  
3. ⏳ Aplicar migración en Cloud SQL (MANUALMENTE o via CI/CD)
4. ⏳ Ejecutar test funcional
5. ⏳ Validar que imágenes persisten tras reload

---

**FIX REFERENCE:** `FIX-20260309-ANTECEDENTES-PENALES-ONLY`  
**Estado:** Ready for Production Deploy
