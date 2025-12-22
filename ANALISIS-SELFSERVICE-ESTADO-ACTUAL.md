# 🔍 ANÁLISIS POST-SELFSERVICE: Qué TIENE, Qué NO TIENE, Qué ESTÁ QUEBRADO

## 🎯 FLUJO QUE USTEDES QUIEREN (Lo que describiste)

```
CANDIDATO INICIA SELFSERVICE
    ↓
LLENA FORMULARIO (básicos + historial laboral básico)
    ↓
TILDA "ACEPTO USO DE DATOS" (consentimiento)
    ↓
PRESIONA "ENVIAR"
    ↓
ANALISTA VE:
  ✅ "Candidato completó selfservice" (badge/indicador)
  ✅ "Aceptó términos en fecha X" (timestamp)
  ✅ Porcentaje de completitud (%%) rápidamente
    ↓
ANALISTA REVISA:
  - Ortografía
  - Datos incompletos o erróneos
  - Corrige lo que falta
  - Marca cada corrección
    ↓
ANALISTA COMPLETA:
  - Llama empresa para verificar
  - Completa historial laboral (fechas exactas, salarios, motivos)
  - Va marcando "Revisión completada" en cada empleo
    ↓
DOCUMENTO FINAL VA AL CLIENTE
```

---

## ✅ QUÉ TIENEN IMPLEMENTADO (Funciona)

### **1. Campo de "Captura Self-Service" - EXISTE**
**Ubicación:** `candidates` tabla
```typescript
selfFilledStatus: ENUM ["pendiente", "recibido", "revisado"]
selfFilledAt: timestamp
selfFilledReviewedBy: int (FK users)
selfFilledReviewedAt: timestamp
```

**En UI (CandidatoDetalle.tsx):**
- ✅ Muestra badge verde si `selfFilledStatus = "revisado"`
- ✅ Botón "Marcar como revisada" (CheckCircle2)
- ✅ Muestra timestamps de cuándo se llenó y cuándo se revisó
- ✅ Deshabilitado si no hay captura (`selfFilledStatus != "recibido"`)

**Status:** ✅ FUNCIONA

---

### **2. Porcentaje de Completitud - EXISTE**
**Ubicación:** CandidatoDetalle.tsx
```typescript
const perfilPct = useMemo(() => {
  // Calcula cuántos campos están llenos
  // Muestra Progress bar + porcentaje
}, [generales, perfil])
```

**En UI:**
- ✅ Progress bar visual
- ✅ Porcentaje exacto (ej: "72%")
- ✅ Se actualiza en tiempo real
- ✅ Muestra qué campos están llenos (con puntos verdes)

**Status:** ✅ FUNCIONA

---

### **3. Distintivo "Capturado por Candidato" - EXISTE PARCIAL**
**Ubicación:** `workHistory` tabla + CandidatoDetalle.tsx
```typescript
capturadoPor: ENUM ["candidato", "analista"]
```

**En UI:**
- ✅ Badge en historial laboral que dice "Capturado por: CANDIDATO/ANALISTA"
- ✅ Se usa para diferenciar quién llenó

**Status:** ⚠️ FUNCIONA pero IMPERFECTO
- Problema: Si candidato llena y luego analista edita, el badge no actualiza

---

### **4. Verificación de Historial Laboral - EXISTE PARCIAL**
**Ubicación:** `workHistory.estatusInvestigacion`
```typescript
estatusInvestigacion: ENUM ["en_revision", "revisado", "terminado"]
```

**En UI:**
- ✅ Se ve el estado en cada historial
- ✅ Analista puede cambiar en formulario

**Status:** ⚠️ FUNCIONA pero CONFUSO
- Problema: ¿Es "revisado" cuando candidato llena? ¿O solo analista?
- Problema: ¿"terminado" qué significa exactamente?

---

## ❌ QUÉ NO TIENEN (Falta implementar)

### **1. Campo de "Aceptación de Datos" - NO EXISTE EN BD**

**Lo que debería haber:**
```typescript
// En candidates tabla:
aceptoAvisoPrivacidad: boolean
aceptoAvisoPrivacidadAt: timestamp
aceptoAvisoPrivacidadVersion: varchar (versión del aviso que aceptó)
```

**Status:** ❌ NO EXISTE
- En pre-registro: ✅ Se captura (`aceptoAviso` state)
- En BD: ❌ NO SE GUARDA
- En panel analista: ❌ NO SE VE

**Consecuencia:** 
- Analista no puede confirmar que candidato aceptó términos
- No hay auditoría de consentimiento

---

### **2. Indicador Visual "Candidato vs Analista Llenó" - NO ESTÁ CLARO**

**Lo que existe ahora:**
- Badge genérico "Capturado por: CANDIDATO"
- Pero después analista edita y no cambia

**Lo que debería haber:**
```
Para CADA CAMPO mostrar:
  - Quién lo llenó INICIALMENTE (candidato vs analista)
  - Si fue MODIFICADO después (y por quién)
  - CUÁNDO fue modificado
```

**Ejemplo UI ideal:**
```
Empresa: HEINEKEN
  └─ ✏️ Llenado por: Candidato (12 dic 2025)
  └─ ✏️ Verificado por: Analista Laura (22 dic 2025)
  └─ Última versión: CERVECERÍA HEINEKEN S.A.
  
Puesto: ASESOR
  └─ ✏️ Llenado por: Candidato (12 dic)
  └─ ⚠️ Correctado por: Analista Laura (22 dic)
  └─ Última versión: ASESOR DE CONQUISTA
```

**Status:** ❌ NO EXISTE

---

### **3. Marcador "Revisión Completada" por Empleo - PARCIAL**

**Lo que existe:**
- Campo `estatusInvestigacion` pero confuso

**Lo que debería haber:**
```typescript
// En workHistory:
revisionCompletada: boolean
revisionCompletadaBy: int (FK users)
revisionCompletadaAt: timestamp
revisionNotas: text
```

**Status:** ⚠️ PARCIALMENTE EXISTE
- El flujo existe pero los analistas no saben que pueden usarlo

---

### **4. Formulario "Básico" Separado - ESTÁ REDUNDANTE**

**Lo que existe:**
- Dialog "Editar Historial Laboral" con campos básicos (empresa, puesto, fechas)
- Dialog "Investigación Laboral" con campos complejos

**Lo que debería ser:**
```
✅ UN SOLO FORMULARIO que combine:
  SECCIÓN 1: Datos candidato (lo que originalmente llenó)
  SECCIÓN 2: Datos verificados (lo que analista encontró)
  SECCIÓN 3: Investigación profunda (si aplica)
```

**Status:** ❌ ESTÁ FRAGMENTADO

---

## 🔥 QUÉ ESTÁ QUEBRADO

### **1. Flujo de Edición es Caótico**

**Problema:**
```
Candidato llena: empresa = "HEINEKEN", puesto = "ASESOR"
                           ↓
Se guarda en workHistory.empresa = "HEINEKEN"
                           ↓
Analista abre "Editar historial" → ve mismo campo
Edita: empresa = "CERVECERÍA HEINEKEN MÉXICO"
                           ↓
Se ACTUALIZA workHistory.empresa (sobrescribe original)
                           ↓
RESULTADO: Perdió lo que candidato dijo originalmente
           No hay auditoría de qué cambió
           "Capturado por" sigue diciendo "candidato" aunque analista editó
```

**Impacto:** Las analistas no saben qué era original vs qué modificaron

---

### **2. Aceptación de Datos No Se Persiste**

**Problema:**
```
Pre-registro:
  ✅ Candidato marca "Acepto aviso de privacidad"
  ✅ Se ve en estado React
  
Cuando presiona "Enviar":
  ❌ NO se guarda en BD
  
Resultado:
  - Analista no ve que aceptó
  - No hay prueba legal del consentimiento
  - Si cliente reclama "¿aceptó?", no hay registro
```

**Impacto:** Riesgo legal

---

### **3. Dos Flujos Separados para Historial = Confusión**

**Problema:**
```
"Editar Historial Laboral" (Dialog A)
  ├─ Empresa, puesto, fechas
  ├─ Tiempo trabajado
  ├─ Causales de salida
  └─ Observaciones

"Investigación Laboral" (Dialog B)
  ├─ Empresa (nombre comercial, giro, dirección)
  ├─ Puesto (inicial/final, jefe, actividades)
  ├─ Período (fechas verificadas, sueldos)
  ├─ Incidencias (motivo, desempeño)
  └─ Dictamen (conclusión)
```

**¿Dónde va la "empresa correcta"?**
- En Dialog A: `workHistory.empresa`
- En Dialog B: `investigacionDetalle.empresa.nombreComercial`

**Analista se pregunta:** "¿Cuál campo actualizo?"

**Impacto:** Doble entrada de datos, inconsistencia

---

### **4. Porcentaje de Completitud No Refleja "Verificado"**

**Problema:**
```
Muestra: "72% completado"

Pero analista no sabe:
  ✅ ¿De ese 72%, cuánto fue verificado?
  ✅ ¿Cuánto le falta revisar?
  ✅ ¿Cuánto falta COMPLETAR?
```

**Ideal sería:**
```
Completitud:
  ✅ Candidato completó: 85%
  ✅ Analista revisó: 45%
  ❌ Aún pendiente revisar: 40%
  
  Historial laboral:
    ✅ 3 empleos de candidato
    ✅ 2 verificados completamente
    ❌ 1 pendiente investigación
```

**Impacto:** Analista no ve a simple vista dónde está el trabajo

---

## 🎯 PROPUESTA DE LIMPIEZA (Sin romper lo existente)

### **FASE 1: SALVAR EL CAOS INMEDIATO (Hoy - 2 horas)**

**1.1 Agregar campo de aceptación a BD**
```typescript
// En candidates tabla, agregar:
aceptoAvisoPrivacidad: boolean
aceptoAvisoPrivacidadAt: timestamp
```

**1.2 Guardar consentimiento en pre-registro**
```typescript
// En CandidatoSelfService.tsx, cuando presiona enviar:
await submitMutation.mutateAsync({
  ...datos,
  aceptoAvisoPrivacidad: aceptoAviso,
  aceptoAvisoPrivacidadAt: new Date(),
})
```

**1.3 Mostrar en panel analista**
```typescript
// En CandidatoDetalle.tsx header:
{candidate.aceptoAvisoPrivacidad && (
  <Badge variant="success">
    ✅ Aceptó términos {formatDate(candidate.aceptoAvisoPrivacidadAt)}
  </Badge>
)}
```

**Resultado:** ✅ Auditoría legal de consentimiento

---

### **FASE 2: UNIFICAR EDICIÓN DE HISTORIAL (Hoy/Mañana - 3 horas)**

**2.1 Renombrar Dialog a "Revisar Historial Laboral"**
```
ANTES: "Editar" (confuso, suena como agregar nuevo)
DESPUÉS: "Revisar y Completar" (claro: es verificación + investigación)
```

**2.2 Organizar formulario en 2 SECCIONES visuales:**
```
SECCIÓN A: "Lo que el candidato dijo"
  - Empresa (deshabilitado, solo lectura)
  - Puesto (deshabilitado)
  - Fechas (deshabilitado)
  - Motivo salida que escribió
  └─ Botón: "Estos datos son incorrectos, quiero corregir"
            (activa campos para edición)

SECCIÓN B: "Información que verificamos"
  - Empresa verificada (editable)
  - Puesto verificado (editable)
  - Fechas verificadas (editable)
  - Teléfono empresa verificada
  - Salarios verificados
  └─ Botón: "Guardar información verificada"
            (marca como revisada)
```

**Resultado:** ✅ Claro qué es original vs verificado

---

### **FASE 3: MEJORAR INDICADOR VISUAL (Próxima semana - 1 hora)**

**3.1 Cambiar porcentaje a "estado de completitud" en 3 niveles:**
```
Capturado: 85% ✅
Revisado: 45% ⚠️  
Pendiente: 40% ❌
```

**3.2 En historial laboral, mostrar badge por empleo:**
```
HEINEKEN - ASESOR
  Status: ✅ Revisión completada
  
JEANS CO - VENDEDOR
  Status: ⚠️ Capturado, pendiente revisión
  
TELECOM - OPERADOR
  Status: ❌ Solo candidato, no verificado
```

**Resultado:** ✅ Analista ve de un vistazo qué falta

---

## 📊 RESUMEN: ESTADO ACTUAL

| Aspecto | Existe | Funciona | Está Claro | Necesita |
|---------|--------|----------|-----------|----------|
| **Self-filled marker** | ✅ | ✅ | ⚠️ | Mejorar UI |
| **Porcentaje completitud** | ✅ | ✅ | ⚠️ | Desglose 3 niveles |
| **"Capturado por"** | ✅ | ⚠️ | ❌ | Auditoría de cambios |
| **Aceptación datos** | ❌ | ❌ | ❌ | **IMPLEMENTAR AHORA** |
| **Marcador "verificado"** | ⚠️ | ⚠️ | ❌ | Clarificar flujo |
| **Historial unificado** | ❌ | ❌ | ❌ | Consolidar 2 dialogs |

---

## 🤔 ¿NECESITAMOS A GEMINI?

**Mi opinión:**
- **NO es necesario** si quieres soluciones rápidas
- **SÍ sería útil** si quieres análisis de arquitectura global

**Lo que podemos hacer AÚN:**
1. Implementar FASE 1 (aceptación de datos) = 2 horas
2. Mejorar UI de FASE 2 (unificar edición) = 3 horas
3. Hacer FASE 3 (indicadores) = 1 hora

**Total: 6 horas para limpiar todo**

**Si llamas a Gemini:**
- ✅ Te dirá si arquitectura es correcta
- ✅ Te sugerirá refactorización
- ❌ Pero no cambia que necesitas IMPLEMENTAR
- ❌ Más tiempo analizando que haciendo

---

## 🎬 ¿QUÉ HACEMOS?

**Opción A:** "Vamos directo a implementar FASE 1 + 2" → Te doy código exacto (6 horas total)
**Opción B:** "Primero análisis profundo con Gemini" → Más context pero + tiempo
**Opción C:** "Solo FASE 1 urgente (aceptación datos)" → 2 horas, lo demás después

¿Cuál prefieres?

