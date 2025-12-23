# 📊 EVALUACIÓN COMPLETA: Self-Service + Historial Laboral (23 DIC 2025)

**Fecha:** 23 de diciembre de 2025  
**Revisor:** Evaluación Técnica Completa  
**Objetivo:** Identificar qué sincroniza, qué NO sincroniza, y plan de acción

---

## 🎯 REQUISITO QUE TÚ PLANTEAS

> "Lo único que quiero es que el self-service y el historial laboral estén totalmente sincronizados. Si el candidato llena un campo, se refleje en la vista de las analistas y que puedan modificarlo y que se refleje nuevamente en el self-service. Cuando acepte términos, debe estar la leyenda acordada. Cuando guarde o presione enviar, los datos deben guardarse siempre en BD."

### Desglose:
1. **Sincronización candidato → analista**: Campo llenado en self-service debe aparecer en CandidatoDetalle
2. **Sincronización analista → candidato**: Cambios en CandidatoDetalle deben reflejarse si candidato reabre el formulario
3. **Indicador de consentimiento**: Cuando candidato marca "Acepto términos", debe guardarse y verse un badge con fecha
4. **Persistencia en BD**: Cada cambio (guardar borrador, enviar, edición analista) → BD inmediatamente
5. **Sin pérdida de datos**: Ediciones múltiples no deben sobrescribir datos anteriores

---

## ✅ QUÉ ESTÁ FUNCIONANDO (ANÁLISIS LÍNEA POR LÍNEA)

### **1. DATOS DEL CANDIDATO BÁSICOS**

**Flujo:**
```
Candidato llena email/teléfono en CandidatoSelfService.tsx
  ↓
Estado local: formCandidate = { email: "...", telefono: "..." }
  ↓
Presiona "Guardar borrador" → getDraftPayload()
  ↓
Envía a candidateSelf.autosave mutation
  ↓
Servidor: actualiza candidates.email, candidates.telefono
  ↓
BD: ✅ GUARDADO
```

**Verificación en CandidatoDetalle:**
- Si abres CandidatoDetalle, ves `candidate.email` y `candidate.telefono` del objeto candidato
- ✅ SINCRONIZA CORRECTAMENTE

---

### **2. DATOS DEL PERFIL (perfilDetalle JSON)**

**Flujo:**
```
Candidato llena:
  - Puesto solicitado
  - Lugar nacimiento
  - Datos domicilio
  - Redes sociales
  - Situación familiar
  - etc.
  ↓
Estado local: perfil = { puestoSolicitado: "...", ... }
  ↓
getDraftPayload() estructura en bloques:
  {
    perfil: {
      generales: { puestoSolicitado: "...", ... },
      domicilio: { calle: "...", ... },
      redesSociales: { facebook: "...", ... },
      situacionFamiliar: { estadoCivil: "...", ... },
      parejaNoviazgo: { ... },
      contactoEmergencia: { ... },
      financieroAntecedentes: { ... }
    }
  }
  ↓
Envía a candidateSelf.autosave
  ↓
Servidor en candidateSelf.ts (líneas 160-182):
  - Lee perfilDetalle existente
  - MERGEA con nuevos datos (preserva anteriores)
  - Guarda perfilDetalle actualizado
  ↓
BD: candidato.perfilDetalle = { ... estructura completa ... } ✅ GUARDADO
```

**Verificación en CandidatoDetalle:**
- CandidatoDetalle obtiene `candidate.perfilDetalle` del query `getById`
- Muestra en secciones: "Generales", "Domicilio", "Redes", "Situación familiar", etc.
- ✅ LOS DATOS APARECEN CORRECTAMENTE

---

### **3. HISTORIAL LABORAL CANDIDATO → BD**

**Flujo:**
```
Candidato llena historial laboral en form:
  - Empresa (requerido)
  - Puesto (opcional)
  - Fecha inicio (YYYY-MM)
  - Fecha fin (YYYY-MM)
  - Tiempo trabajado (texto libre)
  - ¿Es actual? (checkbox)
  ↓
Estado local: jobs[] array
  ↓
Presiona "Guardar borrador"
  ↓
getDraftPayload() incluye:
  workHistory: [{ empresa: "HEINEKEN", puesto: "ASESOR", ... }]
  ↓
candidateSelf.autosave recibe
  ↓
Servidor (líneas 208-240 en candidateSelf.ts):
  Para CADA item en workHistory:
    Si item.id existe (es UPDATE):
      UPDATE workHistory
      SET empresa, puesto, fechaInicio, fechaFin, tiempoTrabajado
    Si NO existe (es INSERT):
      INSERT INTO workHistory
      VALUES { candidatoId, empresa, puesto, ..., capturadoPor: "candidato", estatusInvestigacion: "en_revision" }
  ↓
BD: ✅ GUARDADO EN TABLA workHistory
```

**Verificación en CandidatoDetalle:**
- Query `trpc.workHistory.getByCandidate` trae todos los registros
- Se muestran en tabla de historial laboral
- ✅ SINCRONIZA CORRECTAMENTE

---

### **4. BADGE "CAPTURADO POR CANDIDATO"**

**Ubicación en BD:** `workHistory.capturadoPor` = "candidato"

**Ubicación en UI:** CandidatoDetalle, línea ~1200 (aproximado)

```tsx
<span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
  Capturado por: {item.capturadoPor === "candidato" ? "CANDIDATO" : "ANALISTA"}
</span>
```

**Status:** ✅ FUNCIONA pero con PROBLEMA:
- Cuando analista edita vía ReviewAndCompleteDialog, el badge NO se actualiza
- Sigue diciendo "CANDIDATO" aunque analista lo modificó

---

### **5. PORCENTAJE DE COMPLETITUD**

**Ubicación:** CandidatoSelfService.tsx, líneas ~460-475

```typescript
const completionPercentage = useMemo(() => {
  const fields = [
    formCandidate.email,
    formCandidate.telefono,
    perfil.puestoSolicitado,
    // ... más campos
    jobs.length > 0,
  ];
  const filledCount = fields.filter(f => f !== "" && f !== false && f !== null).length;
  return Math.round((filledCount / fields.length) * 100);
}, [formCandidate, perfil, jobs]);
```

**Status:** ✅ FUNCIONA
- Calcula en tiempo real qué campos están completos
- Se actualiza a medida que candidato llena forma
- Muestra porcentaje visual (Progress bar)

---

## ❌ QUÉ NO ESTÁ SINCRONIZANDO (PROBLEMAS CRÍTICOS)

### **PROBLEMA 1: Cambios de analista NO se reflejan en self-service**

**Escenario:**
```
1. Candidato llena formulario y presiona "Guardar borrador"
   → Datos en BD: workHistory { empresa: "HEINEKEN", puesto: "ASESOR" }

2. Analista abre CandidatoDetalle
   → Ve: "HEINEKEN - ASESOR"

3. Analista presiona "Revisar y Completar"
   → Abre ReviewAndCompleteDialog
   → Cambia empresa a "CERVECERÍA HEINEKEN S.A."
   → Presiona "Guardar información"

4. BD se actualiza: workHistory { empresa: "CERVECERÍA HEINEKEN S.A." }

5. Candidato reabre el enlace de self-service
   ¿QUÉ VE?
```

**Investigación del código:**

En `CandidatoSelfService.tsx`, línea ~270 (getByToken mutation):
```typescript
const { data: candidate, isLoading } = trpc.candidateSelf.getByToken.useQuery(...)
```

Este query obtiene:
```typescript
// server/routers/candidateSelf.ts, líneas 85-116
const history = await db.getWorkHistoryByCandidate(candidate.id);
// ... retorna workHistory items
```

**Luego en línea ~1600 (sección "Historial laboral"):**
```tsx
{jobs.map((job, idx) => (
  <Card key={idx}>
    <p>{job.empresa}</p>
    <p>{job.puesto}</p>
  </Card>
))}
```

**⚠️ PROBLEMA IDENTIFICADO:**
- `jobs` viene de localStorage O del estado inicial cuando carga el componente
- NO SE ACTUALIZA cuando candidato reabre el formulario
- Si presiona F5 o cierra/reabre, carga datos de localStorage (que es desactualizado)
- Los cambios de analista quedan "invisibles" para el candidato

**Prueba:**
1. Candidato llena y guarda
2. Analista edita empresa
3. Candidato presiona F5 o cierra/reabre navegador
4. ¿Ve los cambios de analista? **NO**
5. ¿Ve los datos de su localStorage? **SÍ (desactualizado)**

---

### **PROBLEMA 2: Badge "Aceptó términos" no se guarda en autosave**

**Ubicación en código:**

En `CandidatoSelfService.tsx`, líneas ~1700 (aproximado):
```tsx
<Checkbox
  id="aceptoAviso"
  checked={aceptoAviso}
  onCheckedChange={(checked: boolean) => setAceptoAviso(checked as boolean)}
/>
<Label htmlFor="aceptoAviso">
  Acepto el aviso de privacidad
</Label>
```

**Flujo:**
```
Candidato marca checkbox
  ↓
Estado local: aceptoAviso = true
  ↓
Presiona "Guardar borrador" (handleManualSave)
  ↓
En getDraftPayload(), NO se incluye aceptoAviso
  ↓
Se envía: { candidate, perfil, workHistory } ← SIN aceptoAviso
  ↓
Server autosave NO lo guarda
  ↓
BD: aceptoAviso = NULL ❌
```

**Cuando presiona "Enviar":**
```
Se valida: if (!aceptoAviso) throw error
  ↓
Si pasa, envía aceptoAvisoPrivacidad en payload
  ↓
Se guarda en perfilDetalle.consentimiento (líneas 388-392 en candidateSelf.ts)
  ↓
BD: ✅ GUARDADO SOLO AL ENVIAR (no en autosave)
```

**⚠️ PROBLEMA:**
- Si candidato marca "Acepto", guarda borrador, y luego cierra navegador
- Reabre enlace → checkbox está **DESMARCADO** (porque NO se guardó en autosave)
- Puede ser confuso: "¿Perdí mi consentimiento?"

---

### **PROBLEMA 3: Cambios de analista en historial laboral NO actualiza capturadoPor**

**Escenario:**
```
1. Candidato: empresa = "HEINEKEN"
   → BD: workHistory { empresa: "HEINEKEN", capturadoPor: "candidato" }

2. Analista edita empresa a "CERVECERÍA HEINEKEN S.A." en ReviewAndCompleteDialog
   → UpdateWorkHistoryMutation se ejecuta (línea ~259 en CandidatoDetalle)

3. ¿Qué pasa en BD?
```

**Investigación:**

En `CandidatoDetalle.tsx`, línea ~259:
```typescript
const updateWorkHistoryMutation = trpc.workHistory.update.useMutation({
  onSuccess: () => {
    utils.workHistory.getByCandidate.invalidate();
    toast.success("Historial laboral actualizado");
  },
})
```

El servidor en `routers/workHistory.ts` (línea ~update endpoint):
```typescript
await database.update(workHistory).set({
  empresa: input.empresa,
  puesto: input.puesto,
  // ... otros campos
  // ❌ NO ACTUALIZA capturadoPor
  // ❌ NO REGISTRA QUE FUE MODIFICADO POR ANALISTA
})
```

**⚠️ PROBLEMA:**
- Badge sigue diciendo "CANDIDATO" aunque analista lo modificó
- No hay auditoría de "quién cambió qué y cuándo"
- Confunde a las analistas: ¿fue el candidato o yo?

---

### **PROBLEMA 4: Consentimiento NO se muestra en CandidatoDetalle**

**En CandidatoSelfService:**
```tsx
<Checkbox id="aceptoAviso" checked={aceptoAviso} ... />
"Acepto el aviso de privacidad"
```

**Cuando se envía:**
```typescript
// Guardado en BD:
// candidates.perfilDetalle.consentimiento = {
//   aceptoAvisoPrivacidad: true,
//   aceptoAvisoPrivacidadAt: "2025-12-23T10:30:00Z"
// }
```

**En CandidatoDetalle:**
```
¿Dónde se muestra que candidato aceptó términos?
```

**Búsqueda en código:**
- CandidatoDetalle.tsx, líneas 1-100: ❌ No hay búsqueda de perfilDetalle.consentimiento
- Badge visual de aceptación: ❌ No existe

**⚠️ PROBLEMA:**
- Analista NO VE si candidato aceptó términos
- No hay indicador visual (badge verde tipo "✅ Aceptó términos en 23/12/2025")
- Confusión: ¿Necesito pedir consentimiento de nuevo?

---

## 📊 TABLA RESUMEN: SINCRONIZACIÓN

| Dato | Self-Service | CandidatoDetalle | Sincro? | Problemas |
|------|---|---|---|---|
| **Email** | ✅ Se edita | ✅ Se ve | ✅ SÍ | Ninguno |
| **Teléfono** | ✅ Se edita | ✅ Se ve | ✅ SÍ | Ninguno |
| **Perfil JSON** | ✅ Se llena | ✅ Se ve | ✅ SÍ | Ninguno |
| **Historial laboral** | ✅ Se llena | ✅ Se ve | ⚠️ PARCIAL | Cambios analista NO se reflejan al candidato |
| **Badge Capturado por** | ❌ No existe | ⚠️ Se ve pero no actualiza | ⚠️ INCOMPLETO | Si analista edita, sigue diciendo "candidato" |
| **Aceptación términos** | ✅ Se marca | ❌ No se muestra | ❌ NO | No hay badge; cambios en autosave no se guardan |
| **% Completitud** | ✅ Se calcula | ❌ No existe | ❌ NO | Analista no sabe qué tan completo está |

---

## 🔧 PLAN DE ACCIÓN (QUÉ NECESITO HACER)

### **FASE 1: Guardar aceptación en autosave (2 horas)**

**Objetivo:** Si candidato marca "Acepto" y presiona "Guardar borrador", debe guardarse en BD

**Cambios:**
1. En `getDraftPayload()` (CandidatoSelfService.tsx, línea ~475):
   ```typescript
   const getDraftPayload = () => {
     const payload = {
       // ... existente
       aceptoAvisoPrivacidad: aceptoAviso, // ← NUEVO
     };
     return payload;
   };
   ```

2. En `candidateSelf.autosave` input schema (candidateSelf.ts, línea ~126):
   ```typescript
   input: z.object({
     aceptoAvisoPrivacidad: z.boolean().optional(), // ← NUEVO
     // ... resto
   })
   ```

3. En la lógica de autosave (línea ~175):
   ```typescript
   const draftPerfil = {
     ...existingPerfil,
     consentimiento: input.aceptoAvisoPrivacidad ? {
       aceptoAvisoPrivacidad: true,
       aceptoAvisoPrivacidadAt: new Date().toISOString(),
     } : existingPerfil.consentimiento,
     // ... resto
   };
   ```

**Resultado esperado:**
- Candidato marca checkbox → Presiona "Guardar borrador" → Se guarda en BD
- Candidato reabre formulario → Checkbox debe estar marcado (lee de BD)

---

### **FASE 2: Mostrar badge de aceptación en CandidatoDetalle (1 hora)**

**Objetivo:** Analista VEE un badge cuando candidato aceptó términos

**Cambios:**
1. En `CandidatoDetalle.tsx` (línea ~header):
   ```tsx
   {candidate?.perfilDetalle?.consentimiento?.aceptoAvisoPrivacidad && (
     <Badge variant="success">
       ✅ Aceptó términos ({formatDate(candidate.perfilDetalle.consentimiento.aceptoAvisoPrivacidadAt)})
     </Badge>
   )}
   ```

**Resultado esperado:**
- Analista abre CandidatoDetalle → VE badge verde: "✅ Aceptó términos (23/12/2025 10:30)"

---

### **FASE 3: Mostrar % completitud en CandidatoDetalle (1 hora)**

**Objetivo:** Analista VEA qué tan completo está el formulario

**Cambios:**
1. Reutilizar lógica de CandidatoSelfService → extraer a función helper
2. Pasar mismo cálculo a CandidatoDetalle

**Resultado esperado:**
- Analista VE: "72% completado" con progress bar

---

### **FASE 4: Recargar datos de BD en CandidatoSelfService (2 horas)**

**Objetivo:** Si candidato reabre, debe traer datos ACTUALES de BD (no localStorage desactualizado)

**Cambios:**
1. En `CandidatoSelfService.tsx`, useEffect inicial:
   ```typescript
   useEffect(() => {
     if (!isLoading && candidate?.perfilDetalle) {
       // Recargar perfilDetalle desde BD
       setPerfil(reconstructFromDb(candidate.perfilDetalle));
       setJobs(candidate.workHistory || []);
       // No usar localStorage si hay datos más recientes en BD
     }
   }, [candidate, isLoading]);
   ```

2. Preferencia de datos: **BD > localStorage**
   - Si candidato abre formulario: trae datos de BD
   - Si hay conexión fallida: usa localStorage como fallback

**Resultado esperado:**
- Candidato reabre → VE cambios que analista hizo

---

### **FASE 5: Actualizar capturadoPor cuando analista edita (1 hora)**

**Objetivo:** Si analista edita registro del candidato, debe marcar como "editado por analista"

**Cambios:**
1. En `workHistory.update` mutation (routers/workHistory.ts):
   ```typescript
   await database.update(workHistory).set({
     empresa: input.empresa,
     // ... campos editados
     capturadoPor: "analista", // ← CAMBIAR si es edición por analista
     editadoPor: userId, // ← NUEVO: quién editó
     editadoEn: new Date(), // ← NUEVO: cuándo
   })
   ```

2. En badge (CandidatoDetalle):
   ```tsx
   <span>
     Capturado por: {item.capturadoPor}
     {item.editadoPor && ` (Editado por analista el ${formatDate(item.editadoEn)}`}
   </span>
   ```

**Resultado esperado:**
- Si candidato: "Capturado por: CANDIDATO"
- Si analista edita: "Capturado por: CANDIDATO (Editado por analista el 23/12)"

---

## 📝 RESUMEN EJECUTIVO

### Situación actual:
- ✅ **Guardan datos en BD**: Sí, funcionan autosave y submit
- ✅ **Se reflejan candidato → analista**: Sí, aparecen en CandidatoDetalle
- ❌ **Se reflejan analista → candidato**: NO, cambios no se actualizan
- ❌ **Badge aceptación**: No existe
- ❌ **Consentimiento en autosave**: No se guarda
- ❌ **% completitud en analista**: No se muestra

### Plan:
- **Fase 1-2:** 3 horas → Consentimiento listo
- **Fase 3:** 1 hora → % completitud visible
- **Fase 4-5:** 3 horas → Sincronización bidireccional completa

**Total: 7 horas para SINCRONIZACIÓN COMPLETA**

---

## 🚀 ¿QUIERES QUE CONTINÚE?

Esperando tu confirmación para implementar las 5 fases. ¿Aprobado?
