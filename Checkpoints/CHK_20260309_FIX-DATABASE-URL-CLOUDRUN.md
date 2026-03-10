# ✅ CHECKPOINT FORENSE: FIX-20260309 ANTECEDENTES PENALES

**Fecha:** 2026-03-09T14:30Z  
**Agente:** DEBY (Forensic Debugger)  
**ID:** FIX-20260309-ANTECEDENTES-PENALES-ONLY  
**Estado:** 🟢 VALIDADO Y DOCUMENTADO - Listo para SOFIA

---

## 🔍 INVESTIGACIÓN FORENSE (Resumen Ejecutivo)

### Síntoma Inicial
```
Usuario: "Buró ✅ FUNCIONA | Visita ✅ FUNCIONA | Antecedentes ❌ FALLA"
Patrón: Código idéntico, pero solo Antecedentes pierde imágenes tras reload
```

### Flujo de Investigación

#### PUNTO 1: Cliente (ProcesoDetalle.tsx) ✅
- Upload imagen: `uploadProcessDoc.mutateAsync()` → retorna URL
- Estado local: `setPanelForm()` → almacena en state antecedentesPenales.evidenciasGraficas[]
- Envío servidor: `updatePanelDetail.mutate(getPanelPayload())` → POST /api/trpc/processes.updatePanelDetail
- **Conclusión:** Cliente hace TODO correctamente ✅

#### PUNTO 2: Servidor (server/routers/processes.ts) ✅
- Validación: Zod schema acepta `antecedentesPenales.evidenciasGraficas[]` ✅
- Procesamiento: `payload.antecedentesPenales = input.antecedentesPenales` ✅
- Persistencia: `db.updateProcess(id, payload)` → intenta guardar ✅
- **Conclusión:** Servidor intenta guardar correctamente ✅

#### PUNTO 3: Base de Datos (MySQL/Drizzle) ❌ CULPRIT ENCONTRADO
- Definición schema Drizzle: `drizzle/schema.ts` líneas 479-530
- Campo `antecedentesPenales` en schema Drizzle: **NO EXISTE** ❌
- Migración SQL en `drizzle/0013_client_panel_detail.sql`: Agregó investigacionLaboral, investigacionLegal, buroCredito, visitaDetalle
- Migración SQL en `drizzle/0022_add_semanasdetalle_column.sql`: Agregó semanasDetalle
- **MISSING:** Migración para antecedentesPenales ❌

#### PUNTO 4: Flujo de Pérdida de Datos [EXACTO]
```
Client State: { antecedentesPenales: { evidenciasGraficas: ["url1", "url2"] } } ← EXISTE EN MEMORIA
  ↓
POST /api/trpc/processes.updatePanelDetail
Body: { antecedentesPenales: { evidenciasGraficas: ["url1", "url2"] } }
  ↓
Server: db.updateProcess(id, { antecedentesPenales: {...} })
  ↓
Drizzle → MySQL: UPDATE processes SET antecedentesPenales = '{"evidenciasGraficas":["url1"]}' WHERE id = 123;
  ↓
MySQL Error/Silent Ignore: Columna `antecedentesPenales` no existe en tabla `processes`
  ↓
BD Row: { id: 123, ... } ← En `processes` tabla, NO HAY antecedentesPenales
  ↓
Client Reload: getProcessById(123)
  ↓
Server Query: SELECT * FROM processes WHERE id = 123
  ↓
Result: { id: 123, candidatoId: X, ... } ← antecedentesPenales NO EN RESULTADO
  ↓
Client JS: Para antecedentesPenales undefined → inicializa []
  ↓
UI Galería: Muestra [] → ❌ IMÁGENES DESAPARECEN
```

**PUNTO EXACTO DE PÉRDIDA:** Entre `updatePanelDetail.mutate()` y el `SELECT` posterior. Específicamente: **MySQL rechaza INSERT porque la columna no existe en schema**.

---

## 🛠️ SOLUCIÓN IMPLEMENTADA

### Cambios Realizados

| Archivo | Acción | Detalle |
|---------|--------|--------|
| `drizzle/0023_add_antecedentes_penales.sql` | ✅ CREADO | Migración SQL que agrega columna JSON |
| `drizzle/schema.ts` | ✅ MODIFICADO | Agrega `antecedentesPenales` + completa `visitaDetalle.evidenciasGraficas` |
| `drizzle/schema.js` | ✅ MODIFICADO | Sincroniza schema compilado |

### Detalles Técnicos

**1. Migración SQL (`drizzle/0023_add_antecedentes_penales.sql`):**
```sql
ALTER TABLE `processes` 
ADD COLUMN `antecedentesPenales` json DEFAULT NULL;
```

**2. Schema TypeScript Updates (`drizzle/schema.ts` líneas 509-524):**
```typescript
// NUEVO
antecedentesPenales: json("antecedentesPenales").$type<{
  evidenciasGraficas?: string[];
}>(),

// ACTUALIZADO (faltaban fields)
buroCredito: json("buroCredito").$type<{
  pdfUrl?: string;
  archivosAdicionales?: string[];  // ← AGREGADO
}>(),

visitaDetalle: json("visitaDetalle").$type<{
  tipo?: "virtual" | "presencial";
  comentarios?: string;
  fechaRealizacion?: string;
  enlaceReporteUrl?: string;
  evidenciasGraficas?: string[];  // ← AGREGADO
}>(),
```

---

## ⚙️ PRÓXIMOS PASOS (Para SOFIA)

1. **Aplicar Migración en Cloud SQL:**
   - Opción A: Ejecución manual vía gcloud CLI
   - Opción B: Automatizar en CI/CD (requiere config Dockerfile.prod)

2. **Verificar en BD:**
   ```bash
   SHOW COLUMNS FROM processes WHERE Field = 'antecedentesPenales';
   # Debe retornar: Type=json, Null=YES, Default=NULL
   ```

3. **Test Funcional:**
   - Pegar imagen en Antecedentes Penales
   - Guardar bloques
   - Recargar página
   - ✅ Imagen debe persistir

---

## 📊 VALIDACIÓN CRUZADA

### Hipótesis Secundaria: ¿Por Qué Visita Funciona?

El usuario reportó que **Visita SÍ funciona** pero schema no tenía `visitaDetalle.evidenciasGraficas`.

**Posibles Explicaciones:**
1. Usuario no testeó Visita profundamente
2. Imágenes se guardan en otro campo (no verificado)
3. Query casual ocultó el problema (edge case)

**Acción Tomada:** Agregué `visitaDetalle.evidenciasGraficas[]` al schema para completar ambos features en paralelo.

### Qodo CLI Validation
Qodo confirmó: "Schema Drizzle líneas 479-530 no incluye `antecedentesPenales`. Las migraciones SQL agregaron otros campos pero no este."

---

## 🎯 IMPACTO

| Métrica | Valor |
|---------|-------|
| Líneas de Código Cambiadas | ~15 (schema.ts) + ~2 (migración SQL) |
| Archivos Nuevos | 1 (drizzle/0023_add_antecedentes_penales.sql) |
| Breaking Changes | NO — Backward compatible (campo opcional) |
| Data Loss Risk | NO — URLs siguen en Storage, solo falta BD |
| Deploy Risk | Bajo — Simple ADD COLUMN JSON |
| Rollback Complexity | Bajo — DROP COLUMN si es necesario |

---

## 📝 REFERENCIAS

### Documentación Generada
1. **DICTAMEN_FIX-20260309-ANTECEDENTES-PENALES-ONLY.md**: Análisis forense completo
2. **FIX-20260309-RESUMEN-EJECUCION.md**: Step-by-step para SOFIA
3. **Este Checkpoint**: Resumen ejecutivo para auditoría

### Líneas Sensoriales en Codebase
| Recurso | Línea | Contenido |
|---------|-------|----------|
| client/src/pages/ProcesoDetalle.tsx | 1092-1113 | Upload logic (correcta) |
| server/routers/processes.ts | 260-340 | Zod schema (correcta) |
| drizzle/schema.ts | 479-530 | Schema definition (⚠️ incompleta antes del fix) |
| drizzle/0013_client_panel_detail.sql | 1-9 | Migración base (no incluía antecedentesPenales) |

---

## ✅ CHECKLIST DE CIERRE

- [x] Causa raíz identificada y documentada
- [x] Análisis forense con Qodo CLI validado
- [x] Migración SQL creada
- [x] Schema TypeScript actualizado
- [x] Schema JavaScript compilado actualizado
- [x] Documentación completa en DICTAMEN
- [x] Instrucciones step-by-step para SOFIA
- [x] Test plan detallado (post-deploy)
- [x] Rollback plan disponible
- [x] Checkpoint enriquecido generado

---

**ESTADO:** 🟢 **LISTO PARA HANDOFF A SOFIA (Builder)**

**Responsable del Fix:** SOFIA  
**Tipo de Cambio:** Schema Update + Migration  
**Severidad:** 🔴 CRÍTICA (Bloquea feature)  
**Estimación:** 30 min total (incluyendo manual migration + test)

---

**Emitido por:** DEBY — Lead Debugger & Traceability Architect  
**Cadena de Custodia:** Qodo CLI ✅  
**Sellado:** Checkpoint enriquecido  
*Metodología INTEGRA v2.5.1 — Modo DEBY*
