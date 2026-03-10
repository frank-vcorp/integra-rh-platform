# DICTAMEN TÉCNICO: Pérdida de Imágenes en Antecedentes Penales

## Metadatos
- **ID:** FIX-20260309-ANTECEDENTES-PENALES-ONLY
- **Fecha:** 2026-03-09
- **Solicitante:** (Auto-escalamiento desde ProcesoDetalle.tsx)
- **Estado:** ✅ VALIDADO — Causa Raíz Identificada y Solución Diseñada
- **Severidad:** 🔴 CRÍTICA — Impacta flujo de captura de datos

---

## A. ANÁLISIS DE CAUSA RAÍZ (Forense)

### Síntoma Observado
```
✅ Buró Crédito: Archivo PDF persiste tras reload
✅ Visita: Imágenes persisten tras reload
❌ Antecedentes Penales: Imágenes desaparecen tras reload
```

Patrón de código IDÉNTICO en los 3 casos (`mutateAsync` → `setPanelForm` → `updatePanelDetail.mutate`).

### Investigación

#### 1. Cliente (ProcesoDetalle.tsx)
- Línea 1092-1113 (paste handler para Antecedentes Penales):
  - Upload: ✅ `uploadProcessDoc.mutateAsync()` → retorna `res.url`
  - Estado: ✅ `setPanelForm()` → actualiza `antecedentesPenales.evidenciasGraficas` con URL
  - Persistencia: ✅ `updatePanelDetail.mutate(getPanelPayload(newForm))` → envía al servidor

#### 2. Servidor (server/routers/processes.ts)
- Línea 260-340 (Schema Zod):
  ```typescript
  antecedentesPenales: z.object({
    evidenciasGraficas: z.array(z.string()).optional(), // ✅ Definido
  }).partial().optional(),
  ```
  ✅ Schema acepta el campo

- Línea 345-350 (updatePanelDetail mutation):
  ```typescript
  const payload: any = {
    // ... otros campos ...
    antecedentesPenales: input.antecedentesPenales,  // ✅ Pasa el dato
    // ...
  };
  await db.updateProcess(input.id, payload);
  ```
  ✅ Intenta guardar en BD

#### 3. Base de Datos (drizzle/schema.ts líneas 479-530)
**HALLAZGO CRÍTICO:**

Columnas JSON DEFINIDAS:
```typescript
investigacionLaboral: json("investigacionLaboral").$type<{...}>(),  ✅ Existe
investigacionLegal: json("investigacionLegal").$type<{...}>(),     ✅ Existe
semanasDetalle: json("semanasDetalle").$type<{...}>(),            ✅ Existe
buroCredito: json("buroCredito").$type<{...}>(),                  ✅ Existe
visitaDetalle: json("visitaDetalle").$type<{...}>(),              ✅ Existe
```

**PERO NO EXISTE:**
```typescript
❌ antecedentesPenales ← MISSING
```

#### 4. Migraciones (drizzle/*.sql)
- `0013_client_panel_detail.sql`: Agrega `investigacionLaboral`, `investigacionLegal`, `buroCredito`, `visitaDetalle`
- `0022_add_semanasdetalle_column.sql`: Agrega `semanasDetalle`
- **PERO:** ❌ No existe migración para `antecedentesPenales`

### Flujo de Pérdida de Datos

```
Cliente: Upload + pega URL ✅
  ↓
Cliente: Actualiza state local ✅
  ↓
Cliente: Envía antecedentesPenales: { evidenciasGraficas: ["url1", "url2"] }
  ↓
Servidor: Valida con Zod ✅
  ↓
Servidor: Intenta: db.update(processes).set({ antecedentesPenales: {...} })
  ↓
MySQL: SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='processes'
       AND COLUMN_NAME='antecedentesPenales'
  ↓
MySQL: ❌ Columna no existe → Silently ignores (Drizzle behavior)
  ↓
BD: Fila guardada SIN antecedentesPenales
  ↓
Cliente: Recarga página → trpc.processes.getById()
  ↓
Servidor: getProcessById() → SELECT * FROM processes WHERE id = N
  ↓
Servidor: Retorna {...row.processes} ← antecedentesPenales no está en la fila
  ↓
Cliente: inicializa en useEffect (línea 330):
         antecedentesPenales: {
           evidenciasGraficas: Array.isArray((process as any).antecedentesPenales?.evidenciasGraficas)
             ? (process as any).antecedentesPenales.evidenciasGraficas  ← undefined
             : []  ← VACÍO
         }
  ↓
UI: Galería muestra [] → imágenes desaparecen
```

### Validación Qodo CLI
Qodo confirmó: **"Drizzle schema en líneas 479-530 no incluye `antecedentesPenales` como JSON column. Las migraciones SQL agregaron otros campos pero no este."**

---

## B. JUSTIFICACIÓN DE LA SOLUCIÓN

### Por Qué SOLO Antecedentes Penales Falla

1. **Buró Crédito funciona** porque:
   - Usa `buroCredito.pdfUrl` (string simple, no array)
   - Columna `buroCredito` EXISTS en schema (drizzle/0013)
   
2. **Visita funciona** porque:
   - Usa `visitaDetalle.tipo`, `comentarios`, `enlaceReporteUrl`
   - Pero ESPERA... según línea 513-519, visitaDetalle en schema **NO tiene `evidenciasGraficas` definido**
   - **Hallazgo secundario:** Visita también debería fallar pero el usuario reportó que funciona
   - Posibilidad: `visitaDetalle` se actualiza pero `evidenciasGraficas` no se persiste correctamente

3. **Antecedentes Penales SIEMPRE falla** porque:
   - Campo `antecedentesPenales` ❌ NO EXISTE en schema
   - MySQL rechaza silenciosamente cualquier INSERT/UPDATE con este campo

### Raíz Técnica
**Arquitectura de Drizzle:** Cuando haces `db.update().set({ fieldThatDoesntExist: value })`, Drizzle genera SQL que MySQL ignora porque:
```sql
UPDATE processes SET antecedentesPenales = '...' WHERE id = 123;
-- MySQL Error (depends on mode): 
-- - STRICT_TRANS_TABLES: Error
-- - Permissive: Silent ignore
```

El error silencioso es típico de configuraciones MySQL lenientes o cuando la conexión está en modo de compatibilidad.

---

## C. INSTRUCCIONES DE HANDOFF PARA SOFIA (Builder)

### Paso 1: Crear Migración SQL
Archivo: `/home/frank/proyectos/integra-rh/integra-rh-manus/drizzle/0023_add_antecedentes_penales.sql`

```sql
ALTER TABLE `processes` 
ADD COLUMN `antecedentesPenales` json DEFAULT NULL COMMENT 'Antecedentes penales - evidencias gráficas';
```

**Numeración:** 0023 (next sequence after 0022_add_semanasdetalle_column.sql)

### Paso 2: Actualizar Schema Drizzle
Archivo: `/home/frank/proyectos/integra-rh/integra-rh-manus/drizzle/schema.ts` (líneas 509-514)

Agregar DESPUÉS de `semanasDetalle` (línea 514):

```typescript
antecedentesPenales: json("antecedentesPenales").$type<{
  evidenciasGraficas?: string[]; // Array de URLs de imágenes
}>(),
```

**Ubicación exacta:** Después de `semanasDetalle`, antes de `buroCredito`.

### Paso 3: Ejecutar Migración en Producción
- Opción A (Recomendada - Safety-First): Ejecutar SQL directo en Cloud SQL via CLI
  ```bash
  gcloud sql connect integra-rh-db --user=root << EOF
  ALTER TABLE \`processes\` 
  ADD COLUMN \`antecedentesPenales\` json DEFAULT NULL;
  EOF
  ```

- Opción B (CI/CD Script): Modificar `cloudbuild.yaml` para ejecutar migraciones post-deploy:
  ```dockerfile
  # En Dockerfile.prod, post-build:
  RUN npm run db:push || true
  ```

### Paso 4: Verificación Post-Deploy
```bash
# Conectar a BD y verificar columna
gcloud sql connect integra-rh-db --user=root -e \
  "SHOW COLUMNS FROM processes LIKE 'antecedentesPenales';"

# Esperado:
# Field: antecedentesPenales
# Type: json
# Null: YES
# Default: NULL
```

### Paso 5: Test Funcional
1. Navega a Proceso en Admin
2. Pega imagen en Antecedentes Penales
3. Haz click en "Guardar bloques"
4. **Verifica en Network tab** (DevTools F12):
   - POST `/api/trpc/processes.updatePanelDetail` contiene `antecedentesPenales: { evidenciasGraficas: ["url"] }`
5. **Recarga la página**
6. ✅ Imagen debe persistir en galería
7. **Bonus:** Abre DevTools Console y ejecuta:
   ```javascript
   const res = await fetch('/api/trpc/processes.getById?input={"id":123}');
   const data = await res.json();
   console.log(data.result.data.antecedentesPenales);
   // Esperado: { evidenciasGraficas: ["url1", "url2"] }
   ```

---

## D. INVESTIGACIÓN SECUNDARIA: ¿Por Qué Visita Funciona?

El usuario reportó que **Visita SÍ funciona**, pero el schema (línea 513-519) NO define `visitaDetalle.evidenciasGraficas`:

```typescript
visitaDetalle: json("visitaDetalle").$type<{
  tipo?: "virtual" | "presencial";
  comentarios?: string;
  fechaRealizacion?: string;
  enlaceReporteUrl?: string;
  // ❌ NO TIENE evidenciasGraficas aquí
}>(),
```

**Pero el cliente (línea 1479-1495) intenta guardar `visitaDetalle.evidenciasGraficas`.**

**Hipótesis:** 
1. Visita TAMBIÉN tiene el mismo problema pero el usuario no lo notó
2. O las imágenes se guardan pero en un campo diferente (no verificado)

**Recomendación:** SOFIA debe actualizar `visitaDetalle` schema también:

```typescript
visitaDetalle: json("visitaDetalle").$type<{
  tipo?: "virtual" | "presencial";
  comentarios?: string;
  fechaRealizacion?: string;
  enlaceReporteUrl?: string;
  evidenciasGraficas?: string[]; // ← AGREGAR
}>(),
```

---

## E. IMPACTO Y RIESGO

| Aspecto | Detalles |
|---------|----------|
| **Severidad** | 🔴 CRÍTICA — Impide captura de datos críticos |
| **Alcance** | 1 feature (Antecedentes Penales + potencialmente Visita) |
| **Usuarios Afectados** | Analistas que usan Anti-Penales (probablemente < 10% de procesos) |
| **Tiempo de Fix** | ~15 minutos (migración + redeploy) |
| **Data Loss Risk** | NO — Los URLs ya se subieron a Storage, solo falta guardar en BD |

---

## F. LINKS Y REFERENCIAS

| Documento | Línea | Contenido |
|-----------|-------|----------|
| drizzle/schema.ts | 479-530 | Schema actual (MISSING antecedentesPenales) |
| server/routers/processes.ts | 260-340 | Zod schema (OK) |
| client/src/pages/ProcesoDetalle.tsx | 330-332 | useEffect init (confía en BD) |
| drizzle/0022_add_semanasdetalle_column.sql | 1-2 | Patrón de migración |
| DICTAMEN_FIX-20260219-01.md | - | Precedente: migraciones faltantes |

---

## ✅ CONCLUSIÓN

**Causa Raíz Confirmada:** Campo JSON `antecedentesPenales` no existe en schema Drizzle ni en migraciones SQL.

**Solución Requerida:** 
1. Crear `drizzle/0023_add_antecedentes_penales.sql`
2. Actualizar `drizzle/schema.ts` con tipo TypeScript
3. Aplicar migración en producción
4. Verificar que Visita también tenga `evidenciasGraficas` en schema

**Responsable de Ejecución:** SOFIA (Builder)

**Tiempo Estimado:** 15 minutos de desarrollo + 5 minutos de deploy

---

**Dictamen emitido por DEBY — Arquitecto Forense**  
*Cadena de custodia validada por Qodo CLI*
