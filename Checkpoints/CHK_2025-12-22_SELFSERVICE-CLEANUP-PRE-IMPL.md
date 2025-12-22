# 📸 CHECKPOINT 22-DIC-2025: Estado Actual vs Estado Futuro

**Fecha:** 22 de diciembre de 2025  
**Hora:** 17:45  
**Revisor:** System Analysis  
**Estado de aprobación:** PENDIENTE IMPLEMENTACIÓN

---

## 🎯 PROPÓSITO DE ESTE CHECKPOINT

Registrar de manera completa:
1. **Qué estado actual tiene el sistema** (funcionando, pero caótico)
2. **Qué se va a cambiar exactamente** (3 fases de mejora)
3. **Por qué se hace esto** (problemas identificados)
4. **Qué NO cambia** (para evitar regresiones)
5. **Impacto en analistas** (expectativa de cambios)

---

## 🔴 ESTADO ACTUAL (22 DIC 2025 - ANTES)

### **Base de Datos - Schema**

```typescript
// candidates tabla
{
  id: int (PK)
  nombreCompleto: varchar
  email: varchar
  telefono: varchar
  perfilDetalle: JSON (contiene todos los datos del pre-registro)
  
  // SELF-SERVICE TRACKING (EXISTE)
  selfFilledStatus: ENUM ["pendiente", "recibido", "revisado"]
  selfFilledAt: timestamp
  selfFilledReviewedBy: int (FK users)
  selfFilledReviewedAt: timestamp
  
  // ❌ FALTA: Aceptación de datos
  // aceptoAvisoPrivacidad: boolean ← NO EXISTE
  // aceptoAvisoPrivacidadAt: timestamp ← NO EXISTE
  
  createdAt, updatedAt: timestamp
}

// workHistory tabla
{
  id: int (PK)
  candidatoId: int (FK)
  empresa: varchar
  puesto: varchar
  fechaInicio: varchar (YYYY-MM-DD)
  fechaFin: varchar (YYYY-MM-DD)
  tiempoTrabajado: varchar (texto libre)
  tiempoTrabajadoEmpresa: varchar
  
  // Causales de salida
  causalSalidaRH: ENUM (11 opciones)
  causalSalidaJefeInmediato: ENUM (11 opciones)
  
  // Investigación (TODO en JSON)
  investigacionDetalle: JSON {
    empresa: { nombreComercial, giro, dirección, teléfono }
    puesto: { inicial, final, jefe, actividades, etc }
    periodo: { fechaIngreso, fechaSalida, sueldos }
    incidencias: { motivoSeparación, desempeño }
    conclusion: { dictamen, conclusionTexto }
  }
  
  // Estados
  estatusInvestigacion: ENUM ["en_revision", "revisado", "terminado"]
  resultadoVerificacion: ENUM ["pendiente", "recomendable", "con_reservas", "no_recomendable"]
  capturadoPor: ENUM ["candidato", "analista"]
  
  // ❌ PROBLEMA: No hay auditoría de cambios
  // Si candidato llena y analista edita, no se registra quién cambió qué
  
  createdAt, updatedAt: timestamp
}
```

### **Frontend - Componentes**

#### **CandidatoSelfService.tsx (Pre-registro)**
```typescript
// Estado local
const [formCandidate, setFormCandidate] = useState({ email, telefono })
const [perfil, setPerfil] = useState({ ...todos los datos })
const [jobs, setJobs] = useState([]) // Historial laboral basic
const [aceptoAviso, setAceptoAviso] = useState(false)

// ✅ LO QUE FUNCIONA:
// - Captura 7 campos de historial laboral (empresa, puesto, fechas, tiempo)
// - localStorage autosave cada 500ms
// - "Guardar borrador" envía datos a /api/candidate-save-full-draft
// - "Enviar datos" envía todo vía TRPC submit
// - Barra de progreso (%) mostrando completitud

// ❌ PROBLEMAS:
// - aceptoAviso se captura en estado React pero NO se guarda en BD
// - No hay verificación de que los datos llegaron a BD
// - Si candidato cierra y vuelve, verifica que tenía localStorage pero no que fue guardado
// - Percentage cuenta campos, pero no diferencia "verificado"
```

#### **CandidatoDetalle.tsx (Panel Analista)**
```typescript
// ✅ LO QUE FUNCIONA:
// 1. Header muestra:
//    - Nombre candidato
//    - Badge: "✅ Revisado" si selfFilledStatus = "revisado"
//    - Timestamps de cuándo se llenó y se revisó

// 2. Porcentaje de completitud:
//    - Progress bar visual
//    - Porcentaje numérico
//    - Muestra qué campos están llenos

// 3. Historial Laboral - 2 INTERFACES SEPARADAS:
//    Dialog A: "Editar Historial Laboral"
//       - Campos: empresa, puesto, fechas
//       - Causales salida (RH + Jefe)
//       - Observaciones
//       - ❌ CONFUSO: ¿Son datos candidato o verificados?
//       - ❌ SIN AUDITORÍA: No sabe si candidato o analista llenó
//
//    Dialog B: "Investigación Laboral" (3 bloques tabs)
//       - Bloque 1: Datos empresa
//       - Bloque 2: Período + Incidencias  
//       - Bloque 3: Desempeño + Recomendación
//       - ✅ FUNCIONA pero COMPLEJO
//       - ❌ DUPLICA campos (empresa, puesto, etc en JSON)

// 4. Badge "Capturado por":
//    - Muestra si fue candidato o analista
//    - ❌ PROBLEMA: Si candidato llena y analista edita, 
//         badge sigue diciendo "candidato"

// ❌ PROBLEMAS GLOBALES:
// - ❌ NO EXISTE badge de "Aceptó términos"
// - ❌ Confusión: 2 diálogos separados hacen parecer que son datos diferentes
// - ❌ Sin auditoría clara de quién cambió qué
// - ❌ Difícil ver "dato original vs dato verificado"
```

### **Backend - Endpoints**

```typescript
// ✅ EXISTENTE: POST /api/candidate-save-full-draft
// - Guarda email, teléfono, perfil (JSON), historial laboral
// - Normaliza fechas
// - Inserta en workHistory
// - ❌ PROBLEMA: No guarda aceptación de datos

// ✅ EXISTENTE: TRPC candidateSelf.submit
// - Acepta todo (token, datos, perfil, workHistory, etc)
// - Guarda en candidates + workHistory
// - Marca selfFilledStatus = "recibido"
// - ❌ PROBLEMA: No guarda aceptación de datos

// ✅ EXISTENTE: TRPC candidates.markSelfFilledReviewed
// - Marca selfFilledStatus = "revisado"
// - Registra quién revisó y cuándo

// ✅ EXISTENTE: TRPC workHistory.create / update / investigate
// - Create/Update: Guarda datos básicos + causales
// - Investigate: Guarda investigacionDetalle (JSON)
```

### **Flujo Actual (Con Caos)**

```
CANDIDATO:
  Abre pre-registro
    ↓
  Completa formulario (7 campos historial laboral)
  Tilda "Acepto aviso de privacidad"  ← Se captura en estado React
    ↓
  Presiona "ENVIAR" o "GUARDAR BORRADOR"
    ↓
  ❌ La aceptación NO se guarda en BD
  ✅ Datos del formulario SÍ se guardan en BD
    ↓
  Se marca: selfFilledStatus = "recibido"

ANALISTA:
  Abre panel "Candidato Detalle"
    ↓
  Ve: Nombre + Badge "Revisado" (si aplica)
  ❌ NO VE: "Aceptó términos en [fecha]"
    ↓
  Ve: Historial laboral
  Badge: "Capturado por: CANDIDATO"
    ↓
  Presiona [EDITAR HISTORIAL]
    → Dialog A: Campos confusos
    → ¿Es data candidato? ¿O qué debo llenar?
    ↓
  Presiona [INVESTIGAR]
    → Dialog B: 3 bloques
    → Aquí sí está claro (datos investigación)
    ↓
  Presiona [MARCAR COMO REVISADO]
    → selfFilledStatus = "revisado"

RESULTADO: ✅ Funciona pero es confuso
          ❌ Sin auditoría
          ❌ Sin consentimiento registrado
```

---

## 🟢 ESTADO FUTURO (22 DIC 2025 - DESPUÉS)

### **Base de Datos - Schema (CAMBIOS)**

```typescript
// candidates tabla - NUEVOS CAMPOS
{
  // ... campos existentes ...
  
  // ✅ NUEVO: Aceptación de datos
  aceptoAvisoPrivacidad: boolean
  aceptoAvisoPrivacidadAt: timestamp
  
  // ✅ MEJORADO: Auditoría de cambios
  // (implementado a nivel de lógica, no BD directa)
}

// workHistory tabla - SIN CAMBIOS DIRECTOS
// Pero se agregará lógica para registrar:
// - Quién modificó qué campo
// - Cuándo lo modificó
// (puede ser en tabla separada o JSON audit log)
```

### **Frontend - Componentes (CAMBIOS)**

#### **CandidatoSelfService.tsx**
```typescript
// ✅ CAMBIO: Guardar aceptación
const handleSubmit = async () => {
  const result = await submitMutation.mutateAsync({
    ...datosFormulario,
    aceptoAvisoPrivacidad: aceptoAviso,  ← NUEVO
    aceptoAvisoPrivacidadAt: new Date(), ← NUEVO
  })
}

// SIN OTROS CAMBIOS
```

#### **CandidatoDetalle.tsx**
```typescript
// ✅ CAMBIO 1: Header muestra aceptación
{candidate.aceptoAvisoPrivacidad && (
  <Badge variant="success">
    ✅ Aceptó términos {formatDate(candidate.aceptoAvisoPrivacidadAt)}
  </Badge>
)}

// ✅ CAMBIO 2: Dialog "Revisar y Completar" (NUEVO)
// Reemplaza Dialog A anterior
<Dialog open={workHistoryDialogOpen} onOpenChange={setWorkHistoryDialogOpen}>
  <DialogContent>
    <DialogTitle>
      {editingWorkHistory ? "Revisar y Completar" : "Agregar Historial"}
    </DialogTitle>
    
    {/* SECCIÓN A: Lo que candidato dijo */}
    <Section title="Datos del candidato (original)">
      <Input label="Empresa" value={candidatoEmpresa} disabled />
      <Input label="Puesto" value={candidatoPuesto} disabled />
      <Input label="Fechas" value={candidatoFechas} disabled />
      
      <Button onClick={toggleEdit}>
        ⚠️ Estos datos son incorrectos, quiero corregir
      </Button>
    </Section>
    
    {/* Si presionó "Corregir", SECCIÓN A se vuelve editable */}
    {isEditingCandidate && (
      <Section title="Corregir datos del candidato">
        <Input label="Empresa" value={empresa} onChange={...} />
        <Input label="Puesto" value={puesto} onChange={...} />
        <Button>Guardar correcciones</Button>
      </Section>
    )}
    
    {/* SECCIÓN B: Lo que analista verifica */}
    <Section title="Información que verifiqué (mi trabajo)">
      <Input label="Empresa verificada" value={empresaVerificada} onChange={...} />
      <Input label="Puesto verificado" value={puestoVerificado} onChange={...} />
      <Input label="Fechas exactas" value={fechasVerificadas} onChange={...} />
      <Input label="Salario inicial" value={salarioInicial} onChange={...} />
      <Input label="Salario final" value={salarioFinal} onChange={...} />
      <TextArea label="Notas de verificación" value={notas} onChange={...} />
      
      <Button>Guardar verificación</Button>
      <Button>Guardar y marcar como revisado</Button>
    </Section>
  </DialogContent>
</Dialog>

// ✅ CAMBIO 3: Dialog "Investigación" (SIN CAMBIOS)
// Los 3 bloques siguen EXACTAMENTE igual
```

### **Backend - Endpoints (CAMBIOS)**

```typescript
// ✅ MEJORADO: POST /api/candidate-save-full-draft
// Ahora guarda:
// - aceptoAvisoPrivacidad
// - aceptoAvisoPrivacidadAt

// ✅ MEJORADO: TRPC candidateSelf.submit
// Ahora guarda:
// - aceptoAvisoPrivacidad
// - aceptoAvisoPrivacidadAt

// ✅ NUEVO: TRPC workHistory.update (mejorado)
// Registra en auditoría:
// - Qué campo cambió
// - De qué valor a qué valor
// - Quién lo cambió (userId)
// - Cuándo lo cambió (timestamp)

// ✅ NUEVO: TRPC workHistory.correctCandidateData
// Específicamente para cuando analista corrige datos del candidato
// (marca automáticamente que fue corregido por analista)
```

### **Flujo Futuro (Claro)**

```
CANDIDATO:
  Abre pre-registro
    ↓
  Completa formulario (7 campos)
  Tilda "Acepto aviso"
    ↓
  Presiona "ENVIAR"
    ↓
  ✅ Aceptación SE GUARDA en BD
  ✅ Datos SE GUARDAN en BD
    ↓
  selfFilledStatus = "recibido"

ANALISTA:
  Abre panel "Candidato Detalle"
    ↓
  VE en header:
    ✅ "Revisado (fecha)"
    ✅ "Aceptó términos (fecha)" ← NUEVO
    ↓
  VE Historial laboral
  Badge: "Capturado por: CANDIDATO"
    ↓
  Presiona [REVISAR Y COMPLETAR]
    → Dialog ÚNICO y CLARO
    
    SECCIÓN A (readonly):
      - Empresa: HEINEKEN (candidato escribió)
      - Puesto: ASESOR (candidato escribió)
      - Fechas: 2020-2021 (candidato escribió)
      - ⚠️ [Estos datos son incorrectos] ← botón si aplica
    
    SECCIÓN B (editable):
      - Empresa verificada: _________
      - Puesto verificado: _________
      - Salarios: _________
      - [GUARDAR VERIFICACIÓN]
    ↓
  Presiona [INVESTIGAR]
    → Dialog B: 3 bloques (SIN CAMBIOS)
    
    Bloque 1, 2, 3 igual que antes
    ↓
  Presiona [MARCAR COMO REVISADO]
    → selfFilledStatus = "revisado"

RESULTADO: ✅ Funciona Y es claro
          ✅ Con auditoría
          ✅ Con consentimiento registrado
```

---

## 📊 TABLA COMPARATIVA

| Aspecto | ANTES (22 dic) | DESPUÉS (22 dic+) | Cambio |
|---------|---|---|---|
| **Aceptación en BD** | ❌ No existe | ✅ Guardado + timestamp | NUEVO |
| **Badge aceptación** | ❌ No se ve | ✅ Se ve en header | NUEVO |
| **Dialog historial** | ❌ 2 diálogos confusos | ✅ 1 dialog claro (2 secciones) | MEJORADO |
| **Auditoría cambios** | ❌ Ninguna | ✅ Quién cambió qué, cuándo | NUEVO |
| **3 Bloques investigación** | ✅ Funcionan | ✅ Funcionan igual | SIN CAMBIOS |
| **Pre-registro** | ✅ Funciona | ✅ Funciona + aceptación | MEJORADO |
| **Porcentaje completitud** | ✅ Se muestra | ✅ Se muestra | SIN CAMBIOS |

---

## 🎯 PROBLEMAS IDENTIFICADOS (Por qué se hace esto)

### **Problema 1: Sin auditoría legal**
```
IMPACTO: Si cliente reclama "¿el candidato aceptó términos?", 
         no hay prueba en BD

SOLUCIÓN: Guardar aceptoAvisoPrivacidad + timestamp
BENEFICIO: Auditoría legal completa
```

### **Problema 2: Confusión en edición de historial**
```
IMPACTO: Analista no sabe dónde editar (Dialog A o B)
         Piensa que son datos diferentes
         Duplica trabajo sin querer

SOLUCIÓN: 1 Dialog claro con 2 secciones
BENEFICIO: -30% confusión, menos errores
```

### **Problema 3: Sin auditoría de cambios**
```
IMPACTO: "¿Quién cambió empresa de HEINEKEN a otra?"
         Nadie sabe
         
SOLUCIÓN: Registrar en auditoría automáticamente
BENEFICIO: Trazabilidad completa
```

### **Problema 4: "Capturado por" no actualiza**
```
IMPACTO: Candidato llena, analista edita, badge sigue diciendo "candidato"
         Engañoso
         
SOLUCIÓN: Marcar como "Corregido por [Analista]" cuando edita
BENEFICIO: Información correcta
```

---

## ✅ QUÉ NO CAMBIA (Garantías)

```
✅ Los 3 bloques de investigación laboral (IDÉNTICOS)
✅ El flujo de pre-registro (IGUAL)
✅ El panel "Candidato Detalle" (MAYOR PARTE IGUAL)
✅ Los datos en BD (MISMA ESTRUCTURA, nuevos campos)
✅ El documento final que recibe cliente (MISMO)
✅ Los permisos de analistas (IGUALES)
✅ Endpoints existentes (COMPATIBLES)
✅ Si hay candidatos "en proceso", siguen igual
```

---

## 🚀 FASES DE IMPLEMENTACIÓN

### **FASE 1: Guardar Aceptación (2 horas)**
```
1. Agregar campos a BD (migration)
2. Actualizar backend guardar aceptación
3. Actualizar frontend enviar aceptación
4. Mostrar badge en header
5. Test: Aceptación se guarda y se muestra
```

### **FASE 2: Reorganizar Dialog Historial (3 horas)**
```
1. Crear nuevo Dialog "Revisar y Completar"
   - SECCIÓN A: Datos candidato (readonly)
   - SECCIÓN B: Datos verificados (editable)
2. Agregar botón "Corregir" para SECCIÓN A
3. Guardar información verificada
4. Registrar en auditoría quién cambió
5. Test: Flujo completo
```

### **FASE 3: Auditoría Completa (1 hora)**
```
1. Crear tabla o campo audit log
2. Registrar cada cambio
3. Mostrar en UI (opcional) o solo backend
4. Test: Cambios quedan registrados
```

**TOTAL: 6 horas**

---

## 📋 CHECKLIST PRE-IMPLEMENTACIÓN

- [ ] Backup BD actual
- [ ] Branch git: `feature/selfservice-cleanup`
- [ ] Revisar este checkpoint
- [ ] Aprobar cambios con stakeholders
- [ ] Comunicar a analistas (demo de 10 min)
- [ ] Preparar rollback plan
- [ ] Test en staging
- [ ] Deploy a producción
- [ ] Monitorear 24h

---

## 🎬 SIGUIENTE PASO

**¿Autorización para comenzar FASE 1?**

Confirmar:
- [ ] Checkpoint entendido
- [ ] Cambios aprobados
- [ ] Analistas notificadas
- [ ] BD está respaldada

**Go/No-go:**

