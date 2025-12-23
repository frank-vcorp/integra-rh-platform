# 🔍 ANÁLISIS COMPLETO: HISTORIAL LABORAL EN INTEGRA RH

## 📊 ESTADO ACTUAL DEL SISTEMA

Tienes razón. El sistema es **demasiado complejo** y se ha convertido en un desastre con múltiples capas innecesarias. Voy a desglosar exactamente qué está pasando.

---

## 🏗️ ARQUITECTURA ACTUAL: 3 VISTAS SEPARADAS

### **VISTA 1: PRE-REGISTRO (Candidato - CandidatoSelfService.tsx)**

#### Lo que captura:
```
✅ Empresa (required)
✅ Puesto (opcional)
✅ Fecha inicio (YYYY-MM)
✅ Fecha fin (YYYY-MM)
✅ ¿Es actual? (checkbox)
✅ Tiempo trabajado (texto libre, ej. "2 años 3 meses")
```

#### Qué sucede:
- Datos en estado local (`jobs` array)
- Se guarda a localStorage en cada keystroke
- En "Guardar borrador": Se envía a `/api/candidate-save-full-draft`
- Se inserta en tabla `workHistory` con:
  - `capturadoPor: "candidato"`
  - `estatusInvestigacion: "en_revision"`
  - `resultadoVerificacion: "pendiente"`
  - **VACÍOS**: `causalSalidaRH`, `causalSalidaJefeInmediato`, `investigacionDetalle`, etc.

#### Problemas:
- ❌ Falta validación (fechas pueden ser inválidas)
- ❌ No captura motivoSalida (candidato podría decirlo)
- ❌ No hay referencia de contacto
- ❌ Campo `tiempoTrabajado` es texto libre (inconsistente)

---

### **VISTA 2: DETALLE DEL CANDIDATO - Panel de Analista (CandidatoDetalle.tsx)**

#### Modo VISTA (lectura):
Muestra:
```
📌 Empresa + Puesto
📌 Fechas (formateadas)
📌 Tiempo trabajado (del candidato O calculado O de la empresa)
📌 "Capturado por: CANDIDATO/ANALISTA" (badge)
📌 Estatus investigación (En revisión/Revisado/Terminado)
📌 Dictamen (pendiente/recomendable/con_reservas/no_recomendable)
📌 Motivo de salida (RH + Jefe inmediato)
📌 Comentario de verificación
📌 Observaciones
📌 INVESTIGACIÓN DETALLE (si existe):
   - Empresa: nombre comercial, giro, dirección, teléfono
   - Puesto: inicial/final, jefe, actividades, recursos, horario
   - Período: fechas, antigüedad, sueldo inicial/final
   - Incidencias: motivo separación, desempeño, referencias
   - Dictamen: conclusión IA
```

#### Modo EDICIÓN - Pestaña 1 "Básico":
```
📝 Empresa * (required)
📝 Puesto (opcional)
📝 Fecha inicio (mes/año)
📝 Fecha fin (mes/año)
📝 Tiempo informado por empresa (texto libre)
📝 Causal salida RH (ENUM dropdown - 11 opciones)
📝 Causal salida Jefe Inmediato (ENUM dropdown - 11 opciones)
📝 Observaciones (textarea)
📝 Estatus verificación (dropdown: En revisión/Revisado/Terminado)
📝 Comentario de verificación (textarea)
```

Cuando ACTUALIZA: Los campos se guardan en `workHistory` tabla.

---

### **VISTA 3: INVESTIGACIÓN LABORAL - Panel Analista (CandidatoDetalle.tsx)**

#### Cómo funciona:
- Acceso desde botón "Investigar" en cada historial laboral
- **3 BLOQUES TAB principales:**

**BLOQUE 1: Empresa + Puesto**
```
🏢 Nombre comercial
🏢 Giro de la empresa
🏢 Dirección
🏢 Teléfono

👔 Puesto inicial
👔 Puesto final  
👔 Jefe inmediato
👔 Principales actividades
👔 Recursos asignados
👔 Horario de trabajo
```

**BLOQUE 2: Período + Incidencias**
```
📅 Fecha ingreso (YYYY-MM-DD)
📅 Fecha salida (YYYY-MM-DD)
📅 Antigüedad (texto)
💰 Sueldo inicial
💰 Sueldo final
📊 Períodos (tabla de n rows: período empresa vs período candidato)

⚠️ Motivo separación (candidato vs empresa)
⚠️ Desempeño (en escala o texto)
📞 Referencias de contacto
```

**BLOQUE 3: Evaluación + Dictamen**
```
🎯 Preguntas de evaluación (custom por RH)
🤖 Análisis IA
📋 Conclusión
✅ Dictamen final: RECOMENDABLE / CON_RESERVAS / NO_RECOMENDABLE
```

Todo se guarda en `investigacionDetalle` (JSON) + campos de `causalSalida*` y `estatusInvestigacion`.

---

## 🔗 RELACIONES DE CAMPOS (Diagrama)

```
┌─────────────────────────────────────────────────────┐
│ TABLA: workHistory                                   │
├─────────────────────────────────────────────────────┤
│ id: int (PK)                                        │
│ candidatoId: int (FK)                               │
├─ CAPTURA CANDIDATO ─────────────────────────────────┤
│ ✅ empresa: varchar (required)                      │
│ ✅ puesto: varchar                                  │
│ ✅ fechaInicio: varchar (YYYY-MM-DD)                │
│ ✅ fechaFin: varchar (YYYY-MM-DD)                   │
│ ✅ tiempoTrabajado: varchar (texto libre)           │
│ ❌ tiempoTrabajadoEmpresa: varchar (solo analista)  │
├─ CAPTURA ANALISTA ──────────────────────────────────┤
│ ❌ causalSalidaRH: ENUM (11 opciones)               │
│ ❌ causalSalidaJefeInmediato: ENUM (11 opciones)    │
│ ❌ contactoReferencia: varchar                      │
│ ❌ telefonoReferencia: varchar                      │
│ ❌ correoReferencia: varchar                        │
│ ❌ comentarioInvestigacion: text                    │
│ ❌ observaciones: text                              │
├─ INVESTIGACIÓN (JSON) ─────────────────────────────┤
│ ❌ investigacionDetalle: JSON (ESTRUCTURA COMPLEJA) │
│ ❌ desempenoScore: int                              │
├─ ESTADOS ──────────────────────────────────────────┤
│ ❌ estatusInvestigacion: ENUM (en_revision, ...etc) │
│ ❌ resultadoVerificacion: ENUM (pendiente, ...)     │
├─ AUDIT ────────────────────────────────────────────┤
│ ❌ capturadoPor: enum (candidato/analista)          │
│ ❌ createdAt, updatedAt: timestamp                  │
└─────────────────────────────────────────────────────┘
```

---

## 🚨 PROBLEMAS IDENTIFICADOS

### **1. FALTA DE SEPARACIÓN CLARA (Candidato vs Analista)**

El formulario de edición en `CandidatoDetalle.tsx` permite al analista editar TODO:
- Básico: Empresa, puesto, fechas ✅ (correcto)
- **PERO TAMBIÉN**: Causales de salida, comentarios investigación ❌ (los candidatos NO pueden llenar esto en pre-registro)

**INCONSISTENCIA**: El candidato llena en pre-registro, pero si el analista edita en "Básico", sobrescribe los datos del candidato sin que se vea claramente.

---

### **2. CAMPOS HUÉRFANOS (No se llenan en pre-registro)**

El candidato **NUNCA** captura en pre-registro:
- ❌ `tiempoTrabajadoEmpresa` 
- ❌ `causalSalida*` (motivos de salida)
- ❌ `contactoReferencia`, `telefonoReferencia`, `correoReferencia`
- ❌ `comentarioInvestigacion`, `observaciones`
- ❌ `investigacionDetalle` (todo el JSON de investigación)

Entonces cuando el analista intenta llenar esto desde el formulario "Básico", ¿es clara la diferencia? **NO.**

---

### **3. EL NIGHTMARE: investigacionDetalle**

Es un JSON gigante que se maneja en un DIALOG completamente separado con 3 bloques y N subtabs. 

Problemas:
- ❌ Muy complejo para el analista (requiere muchos clics)
- ❌ No está integrado en el flujo principal
- ❌ Si el candidato quiere agregar referencia en pre-registro, NO PUEDE
- ❌ Se duplican campos (ej: "puesto" existe tanto en campos básicos como en `investigacionDetalle.puesto`)

---

### **4. ESTADO DE INVESTIGACIÓN CONFUSO**

```
estatusInvestigacion: [
  "en_revision",    ← Predeterminado cuando candidato guarda
  "revisado",       ← Cuando analista termina investigación
  "terminado"       ← ¿Cuándo ocurre esto?
]

resultadoVerificacion: [
  "pendiente",      ← Predeterminado
  "recomendable",   ← ¿Quién decide?
  "con_reservas",
  "no_recomendable"
]
```

**¿Quién llena estos campos? ¿Cuándo? ¿Bajo qué criterio?** No está claro.

---

### **5. CAPTURADO POR: "candidato" vs "analista"**

Esto solo se usa para BADGE visual ("Capturado por CANDIDATO"). 

Problemas:
- ❌ Si candidato captura empresa X, luego analista la edita, el badge sigue diciendo "candidato"
- ❌ No hay auditoría de quién cambió qué
- ❌ No se valida (ej: no impide que analista edite un registro "del candidato")

---

## ✅ PROPUESTA DE SOLUCIÓN (Simplificado)

### **Principios:**
1. **Candidato llena BÁSICO** → Empresa, puesto, fechas, tiempo trabajado, motivo salida básico
2. **Analista COMPLETA** → Agrega datos de verificación, referencias, investigación
3. **Separación clara** → Diferente formulario/UI para cada rol
4. **Sin duplicación** → Un campo, un lugar
5. **Auditoría** → Log de quién cambió qué

---

### **Paso 1: Separar Campos en la BD**

Crear SEPARACIÓN LÓGICA en workHistory:

```typescript
// GRUPO 1: Captura Candidato (PRE-REGISTRO)
empresa: varchar ✅
puesto: varchar ✅
fechaInicio: varchar ✅
fechaFin: varchar ✅
tiempoTrabajado: varchar ✅
motivoSalida: varchar (NUEVO - texto candidato, ej: "Cambio de administración")

// GRUPO 2: Captura Analista (VERIFICACIÓN BÁSICA)
tiempoTrabajadoEmpresa: varchar (lo que dice la empresa)
causalSalidaRH: ENUM (categoría RH)
causalSalidaJefeInmediato: ENUM (categoría Jefe)
telefonoReferencia: varchar
correoReferencia: varchar

// GRUPO 3: Investigación Profunda (JSON)
investigacionDetalle: JSON {
  empresa: { nombreComercial, giro, dirección, etc }
  puesto: { inicial, final, jefeInmediato, etc }
  periodo: { fechaIngreso, fechaSalida, sueldos, etc }
  incidencias: { motivoSeparación, desempeño, etc }
  resultado: { dictamen, conclusión }
}

// GRUPO 4: ESTADO + AUDITORÍA
estatusInvestigacion: ENUM (pendiente/iniciada/completada)
resultadoVerificacion: ENUM (pendiente/recomendable/con_reservas/no_recomendable)
capturaInicial: enum (candidato/analista)
actualizadoPor: enum (candidato/analista)
createdAt, updatedAt
```

---

### **Paso 2: Interfaz Candidato (Pre-registro - SIMPLE)**

```
📝 FORMULARIO PRE-REGISTRO (SelfService):
   1. Empresa * (text)
   2. Puesto (text)
   3. Fecha inicio (mes/año)
   4. Fecha fin (mes/año)
   5. ¿Es actual? (checkbox)
   6. ¿Cuánto tiempo trabajaste? (text)
   7. ¿Por qué saliste? (text libre, ej: "cambio de trabajo", "mejor oportunidad")
   
   Botón: "Guardar borrador" → Persiste en BD
```

---

### **Paso 3: Interfaz Analista (CandidatoDetalle.tsx - SEGMENTADA)**

**TAB A: DATOS DEL CANDIDATO (Read-only con opción de corregir)**
```
Muestra exactamente lo que el candidato llenó:
- Empresa, Puesto, Fechas, Tiempo, Motivo salida

Opción: "Estos datos son incorrectos, quiero corregirlos"
→ Abre diálogo de corrección (marca que fue editado por analista)
```

**TAB B: INFORMACIÓN ADICIONAL (Analista llena)**
```
📝 Tiempo según empresa (ej: "3 años 2 meses")
📝 Telefonos/emails de referencia
📝 Motivación del candidato revisada (si aplica)
📝 Observaciones

Button: "Guardar información"
```

**TAB C: INVESTIGACIÓN LABORAL (Wizard paso a paso)**
```
Paso 1: ¿HACER investigación?
→ Si NO, marca como "Sin investigación"
→ Si SÍ, continúa

Paso 2: Contactar empresa
  - Nombre comercial
  - Giro
  - Dirección
  - Teléfono
  - Persona contactada

Paso 3: Validar período
  - Fecha ingreso real
  - Fecha salida real
  - Antigüedad
  - Sueldos

Paso 4: Validar puesto
  - Puesto inicial/final
  - Jefe inmediato
  - Responsabilidades

Paso 5: Evaluación
  - ¿Buen desempeño?
  - ¿Motivo salida validado?
  - Dictamen: RECOMENDABLE / CON_RESERVAS / NO_RECOMENDABLE

Button: "Finalizar investigación" → estatusInvestigacion = "completada"
```

---

## 📋 RESUMEN DE CAMBIOS NECESARIOS

### **Backend (server/routers/workHistory.ts)**

```typescript
// NUEVO: Crear mutación para candidato (pre-registro)
export const candidateSubmitWorkHistory = async (
  candidatoId: int,
  empresa: string,
  puesto: string,
  fechaInicio: string,
  fechaFin: string,
  tiempoTrabajado: string,
  motivoSalida: string
) => {
  // Inserta en workHistory con capturaInicial: "candidato"
}

// EXISTENTE: update para analista
export const updateWorkHistory = async (
  id: int,
  data: { tiempoTrabajadoEmpresa, causalSalidaRH, etc }
) => {
  // Marca actualizadoPor: "analista"
}

// EXISTENTE: investigate (investigacionDetalle)
export const saveInvestigacion = async (id: int, detalle: JSON) => {
  // Guarda investigacionDetalle + marca estatusInvestigacion = "completada"
}
```

### **Frontend (client/src/pages/**)**

**CandidatoSelfService.tsx (Pre-registro):**
- ✅ Ya está casi correcto
- ❌ AGREGAR: Campo "¿Por qué saliste?" (motivoSalida)
- ✅ Guarda a BD en "Guardar borrador"

**CandidatoDetalle.tsx (Panel Analista):**
- ❌ DIVIDIR formulario en 3 tabs claros
- ❌ TAB 1: Datos candidato (read-only + opción corregir)
- ❌ TAB 2: Información adicional (analista)
- ✅ TAB 3: Investigación (ya existe, solo refinar)

---

## 🎯 BENEFICIOS FINALES

```
ANTES (Caos):
- ❌ Candidato no sabe qué está llenando
- ❌ Analista ve TODO mezclado
- ❌ Campos confusos (¿quién debería llenar "causal salida"?)
- ❌ Múltiples diálogos innecesarios
- ❌ Imposible auditar quién cambió qué
- ❌ Analista trabaja lentamente navegando 3+ paneles

DESPUÉS (Claro):
- ✅ Candidato llena 7 campos simples en pre-registro
- ✅ Analista ve exactamente qué viene del candidato vs qué agrega ella
- ✅ Analista puede corregir candidato en 1 paso
- ✅ Investigación es un wizard secuencial (no 3 tabs confusos)
- ✅ Auditoría clara: capturaInicial + actualizadoPor
- ✅ Analista trabaja 50% más rápido (menos clics)
```

---

## 📌 RECOMENDACIÓN FINAL

**El sistema está SOBRE-ENGINEERED.** Sugiero:

1. **AHORA:** Simplificar interfaz analista (3 tabs claros)
2. **AHORA:** Agregar campo "motivoSalida" a candidato (ya está captura en pre-registro)
3. **PRÓXIMA SEMANA:** Refactorizar investigación laboral a wizard paso-a-paso
4. **PRÓXIMA SEMANA:** Crear auditoría clara de cambios

¿Estás de acuerdo? ¿Empezamos por dónde?
