# 🔗 RELACIÓN: Self-Service + Investigación Laboral (3 Bloques)

## 📌 LA CLAVE: NO son dos sistemas, es UNO SOLO en FASES

```
┌─────────────────────────────────────────────────────────────────┐
│                     HISTORIAL LABORAL                           │
│                      (UN SOLO DATO)                             │
└─────────────────────────────────────────────────────────────────┘

                            ↓

        FASE 1: CANDIDATO LLENA           FASE 2: ANALISTA COMPLETA
        ─────────────────────            ──────────────────────────
        
        (Pre-Registro Self-Service)      (Investigación 3 Bloques)
        
        ✅ Empresa: HEINEKEN             ✅ Bloque 1: Datos empresa
        ✅ Puesto: ASESOR                   └─ Nombre real
        ✅ Fechas: 01/2020-01/2021          └─ Giro
        ✅ Tiempo: 1 año                    └─ Dirección
                                           └─ Teléfono
                                        
                                        ✅ Bloque 2: Período + Incidencias
                                           └─ Fechas exactas
                                           └─ Sueldos
                                           └─ Motivosjust de salida
                                        
                                        ✅ Bloque 3: Desempeño + Recomendación
                                           └─ Evaluación
                                           └─ Dictamen final

        ↓                                ↓
        RESULTADO: TODO EN MISMO REGISTRO workHistory
```

---

## 🎯 FLUJO REAL (Paso a paso)

### **PASO 1: CANDIDATO EN SELFSERVICE**

```
Candidato llena formulario pre-registro:
│
├─ Empresa: "HEINEKEN"
├─ Puesto: "ASESOR DE CONQUISTA"
├─ Fecha inicio: "01-2020"
├─ Fecha fin: "01-2021"
├─ Tiempo trabajado: "1 año"
│
└─ PRESIONA "GUARDAR BORRADOR" o "ENVIAR"
   
   Se guarda EN TABLA workHistory (MISMO REGISTRO):
   ┌───────────────────────────────────────┐
   │ workHistory ID #1                     │
   ├───────────────────────────────────────┤
   │ candidatoId: 56                       │
   │ empresa: "HEINEKEN"                   │ ← Del candidato
   │ puesto: "ASESOR DE CONQUISTA"         │ ← Del candidato
   │ fechaInicio: "2020-01-01"             │ ← Del candidato
   │ fechaFin: "2021-01-01"                │ ← Del candidato
   │ tiempoTrabajado: "1 año"              │ ← Del candidato
   │ capturadoPor: "candidato"             │ ← Marcador
   │ estatusInvestigacion: "en_revision"   │ ← Estado
   │ investigacionDetalle: null            │ ← VACÍO (sin investigación)
   │ resultadoVerificacion: "pendiente"    │ ← Sin resultado
   └───────────────────────────────────────┘
```

---

### **PASO 2: ANALISTA REVISA Y ABRE "INVESTIGACIÓN"**

```
Analista abre panel "Candidato Detalle" y VE:

┌─────────────────────────────────────────────────┐
│ HISTORIAL LABORAL                               │
├─────────────────────────────────────────────────┤
│ Empresa: HEINEKEN                               │
│ Puesto: ASESOR DE CONQUISTA                     │
│ Fechas: 01/2020 - 01/2021                       │
│ Status: En revisión                             │
│ Capturado por: CANDIDATO                        │
│                                                 │
│ [Editar]  [Investigar] ← PRESIONA ESTO         │
└─────────────────────────────────────────────────┘

Analista presiona [Investigar]
│
└─ Se abre Dialog: "Investigación Laboral"
   
   Este dialog COMPLEMENTA el registro existente (NO crea nuevo)
   
   ┌─ BLOQUE 1: DATOS DE LA EMPRESA ────────────┐
   │ (Lo que verificó Laura llamando a HEINEKEN) │
   │                                             │
   │ Nombre comercial: CERVECERÍA HEINEKEN S.A.  │
   │ Giro: Bebidas                               │
   │ Dirección: Calle X, Ciudad Y                │
   │ Teléfono: +52 555 1234567                   │
   │                                             │
   │ ⬇️ GUARDAR BLOQUE 1 ⬇️                       │
   └─────────────────────────────────────────────┘
   
   ┌─ BLOQUE 2: PERÍODO + INCIDENCIAS ──────────┐
   │ (Lo que dijo la empresa)                     │
   │                                             │
   │ Fecha ingreso verificada: 15-FEB-2020       │
   │ Fecha salida verificada: 30-JAN-2021        │
   │ Antigüedad: 1 año y 2 semanas               │
   │ Salario inicial: $12,000                    │
   │ Salario final: $14,500                      │
   │ Motivo separación: Término de contrato      │
   │                                             │
   │ ⬇️ GUARDAR BLOQUE 2 ⬇️                       │
   └─────────────────────────────────────────────┘
   
   ┌─ BLOQUE 3: DESEMPEÑO + RECOMENDACIÓN ─────┐
   │ (Conclusión de Laura)                       │
   │                                             │
   │ ✅ Datos verificados correctamente          │
   │ ✅ Referencia positiva de empresa           │
   │ 🎯 Dictamen: RECOMENDABLE                   │
   │                                             │
   │ ⬇️ GUARDAR BLOQUE 3 + FINALIZAR ⬇️           │
   └─────────────────────────────────────────────┘
   
   Resultado final:
   └─ Cierra dialog
   └─ Vuelve a ver el MISMO registro (ahora COMPLETADO)
```

---

## 🔄 CÓMO SE ACTUALIZA EL REGISTRO

**EN LA BD (Tabla workHistory), el MISMO registro se va ACTUALIZANDO:**

```
ESTADO 1: Después que candidato llena (Pre-registro)
┌────────────────────────────────────────────────────┐
│ ID: 1                                              │
│ empresa: "HEINEKEN" ← CANDIDATO                   │
│ puesto: "ASESOR"                                  │
│ fechaInicio: "2020-01-01"                         │
│ fechaFin: "2021-01-01"                            │
│ investigacionDetalle: null ← VACÍO               │
│ resultadoVerificacion: "pendiente"                │
│ estatusInvestigacion: "en_revision"               │
└────────────────────────────────────────────────────┘

                    ↓

ESTADO 2: Después que analista llena Bloque 1
┌────────────────────────────────────────────────────┐
│ ID: 1                                              │
│ empresa: "HEINEKEN"                               │
│ investigacionDetalle: {                           │
│   empresa: {                                      │
│     nombreComercial: "CERVECERÍA HEINEKEN S.A."   │
│     giro: "Bebidas"                               │
│     dirección: "Calle X, Ciudad Y"                │
│   }                                               │
│   puesto: null ← BLOQUE 2 Y 3 AÚN VACÍAS         │
│   periodo: null                                   │
│   conclusion: null                                │
│ }                                                 │
│ estatusInvestigacion: "en_revision"               │
└────────────────────────────────────────────────────┘

                    ↓

ESTADO 3: Después que analista llena Bloque 2
┌────────────────────────────────────────────────────┐
│ ID: 1                                              │
│ investigacionDetalle: {                           │
│   empresa: { ... },                               │
│   periodo: {                                      │
│     fechaIngreso: "2020-02-15"                    │
│     fechaSalida: "2021-01-30"                     │
│     antiguedad: "1 año 2 semanas"                 │
│     sueldoInicial: 12000                          │
│     sueldoFinal: 14500                            │
│   },                                              │
│   incidencias: {                                  │
│     motivoSeparacion: "Término de contrato"       │
│   }                                               │
│ }                                                 │
│ estatusInvestigacion: "en_revision"               │
└────────────────────────────────────────────────────┘

                    ↓

ESTADO 4: Después que analista llena Bloque 3
┌────────────────────────────────────────────────────┐
│ ID: 1                                              │
│ investigacionDetalle: {                           │
│   empresa: { ... },                               │
│   periodo: { ... },                               │
│   incidencias: { ... },                           │
│   conclusion: {                                   │
│     evaluacion: "✅ Datos verificados"            │
│     dictamen: "RECOMENDABLE"                      │
│   }                                               │
│ }                                                 │
│ estatusInvestigacion: "terminado" ← COMPLETADO   │
│ resultadoVerificacion: "recomendable"             │
└────────────────────────────────────────────────────┘
```

---

## 🎯 LA CLAVE: UN REGISTRO, MÚLTIPLES FASES

```
VISUALIZACIÓN EN UI:

┌─ VISTA: CandidatoDetalle.tsx ────────────────────────┐
│                                                      │
│ Historial Laboral: HEINEKEN - ASESOR               │
│ ├─ Datos candidato: Empresa, Puesto, Fechas        │
│ ├─ Status: En revisión                             │
│ │                                                   │
│ └─ Bloque 1 (Datos empresa):                        │
│    ├─ Nombre real: CERVECERÍA HEINEKEN S.A.        │
│    └─ Giro: Bebidas                                │
│                                                      │
│ └─ Bloque 2 (Período):                              │
│    ├─ Fechas verificadas                           │
│    └─ Sueldos                                      │
│                                                      │
│ └─ Bloque 3 (Conclusión):                           │
│    ├─ Evaluación                                   │
│    └─ Dictamen: ✅ RECOMENDABLE                     │
│                                                      │
└──────────────────────────────────────────────────────┘

TODO ESTO ↑ ES UN SOLO REGISTRO EN LA BD
```

---

## ✅ RESPUESTA A TU PREGUNTA: "¿Se complementan, no son dos?"

### **CORRECTO. Son FASES del MISMO dato:**

```
┌─ FASE 1: Pre-Registro (Candidato) ─────────┐
│ Llena 5 campos básicos                     │
│ Se guarda en workHistory                   │
└────────────────────────────────────────────┘
               ↓
┌─ FASE 2: Revisión Básica (Analista) ──────┐
│ (CAMBIOS PROPUESTOS: 2 secciones)          │
│ Revisa y corrige si candidato se equivocó │
│ Se actualiza MISMO registro workHistory    │
└────────────────────────────────────────────┘
               ↓
┌─ FASE 3: Investigación Profunda (Analista) ┐
│ (3 BLOQUES - SIN CAMBIOS)                  │
│ ├─ Bloque 1: Datos empresa                │
│ ├─ Bloque 2: Período + Incidencias        │
│ └─ Bloque 3: Desempeño + Recomendación    │
│ Se actualiza MISMO registro workHistory    │
└─────────────────────────────────────────────┘
               ↓
     RESULTADO FINAL: 1 Registro completo
```

---

## 🔍 COMPARACIÓN: ANTES vs DESPUÉS (de cambios propuestos)

### **ANTES (Confuso):**
```
┌─ Dialog A: "Editar Historial" ────────┐
│ Empresa: _________                    │  ← ¿Qué es esto?
│ Puesto: _________                     │  ← ¿Datos candidato?
│ Fechas: __/__/____ → __/__/____        │  ← ¿O datos verificados?
│ Causal: [dropdown]                    │
└───────────────────────────────────────┘

SEPARADO DE:

┌─ Dialog B: "Investigación Laboral" ──┐
│ Bloque 1, 2, 3 tabs                   │  ← Investigación profunda
└───────────────────────────────────────┘

RESULTADO: ❌ Confusión
           "¿Debo editar en A o en B?"
           "¿Son DATOS DIFERENTES?"
```

### **DESPUÉS (Claro):**
```
┌─ Dialog: "Revisar y Completar" ──────────────┐
│                                              │
│ SECCIÓN A: Lo que candidato dijo (readonly)  │
│ ├─ Empresa: HEINEKEN [deshabilitado]        │
│ ├─ Puesto: ASESOR [deshabilitado]           │
│ └─ Fechas: ... [deshabilitado]              │
│                                              │
│ SECCIÓN B: Lo que yo verifiqué (editable)   │
│ ├─ Empresa verificada: [editable]           │
│ ├─ Puesto verificado: [editable]            │
│ └─ Fechas verificadas: [editable]           │
│                                              │
│ [Guardar verificación]                      │
└──────────────────────────────────────────────┘

↓ Luego ↓

┌─ Dialog: "Investigación Laboral" ────────────┐
│ (Exactamente igual a ahora, SIN CAMBIOS)    │
│ Bloque 1: Datos empresa                     │
│ Bloque 2: Período + Incidencias             │
│ Bloque 3: Desempeño + Recomendación         │
└──────────────────────────────────────────────┘

RESULTADO: ✅ CLARO
           "SECCIÓN A = Candidato"
           "SECCIÓN B = Mi trabajo"
           "3 Bloques = Investigación profunda"
```

---

## 📊 TABLA DE RESPONSABILIDADES

| Fase | Quién | Dialog | Campos | En BD |
|------|-------|--------|--------|-------|
| **1** | Candidato | Pre-Registro | empresa, puesto, fechas | workHistory (campos directos) |
| **2** | Analista | "Revisar" (NUEVO) | Corregir si hay errores | workHistory (campos directos) |
| **3** | Analista | "Investigación" (SIN CAMBIOS) | 3 Bloques completos | workHistory.investigacionDetalle (JSON) |

---

## 🎬 FLUJO REAL EN PANTALLA

```
1️⃣ CANDIDATO EN SELFSERVICE:
   "Trabajé en HEINEKEN como ASESOR, 2020-2021"
   └─ GUARDAR
      └─ Se guarda en workHistory

2️⃣ ANALISTA ABRE PANEL:
   Ve: "HEINEKEN - ASESOR (Capturado por: CANDIDATO)"
   └─ Presiona [REVISAR] ← NUEVO DIALOG (FASE 2)
      └─ Dialog "Revisar y Completar"
         SECCIÓN A: "HEINEKEN" [readonly]
         SECCIÓN B: [Llena lo que verificó]
         └─ GUARDAR VERIFICACIÓN

3️⃣ ANALISTA ABRE "INVESTIGACIÓN":
   Presiona [INVESTIGAR] ← DIALOG EXISTENTE (FASE 3)
   └─ Dialog "Investigación Laboral"
      BLOQUE 1: Datos empresa (teléfono, dirección, etc)
      BLOQUE 2: Período verificado
      BLOQUE 3: Desempeño + Dictamen
      └─ GUARDAR INVESTIGACIÓN

4️⃣ RESULTADO:
   ✅ UN SOLO REGISTRO workHistory completado en 3 fases
```

---

## ✅ CONCLUSIÓN

**Tu pregunta:** "¿Se complementan, no son dos?"

**Respuesta:** ✅ **EXACTO. Complementan, no duplican.**

```
┌──────────────────────────────────┐
│    HISTORIAL LABORAL COMPLETO    │
├──────────────────────────────────┤
│ Fase 1: Candidato captura básico │ ← Pre-Registro
│ Fase 2: Analista revisa/corrige  │ ← Dialog NUEVO
│ Fase 3: Analista investiga profundo │ ← 3 Bloques (SIN CAMBIOS)
├──────────────────────────────────┤
│ RESULTADO: 1 Registro en workHistory │
│            Con 3 niveles de completitud │
└──────────────────────────────────┘
```

**Lo que NO cambia:**
- ✅ Los 3 bloques de investigación (IDÉNTICOS)
- ✅ La tabla workHistory (MISMA estructura)
- ✅ El resultado final (MISMO documento)

**Lo que SÍ cambia:**
- ⚠️ Dialog intermedio "Revisar y Completar" (NUEVO)
- ⚠️ Separación visual clara: Candidato vs Analista

---

## 🎯 IMPLICACIÓN PARA LAS ANALISTAS

```
ANTES: Abría 2 dialogs confusos sin saber dónde editar

DESPUÉS: 
  1. Dialog "Revisar" → Revisa datos candidato (CLARO)
  2. Dialog "Investigación" → Completa profundo (CLARO)
  
  Total: Más claro, menos confusión, MISMO resultado final
```

