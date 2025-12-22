# 🔄 ANÁLISIS DE OPCIONES: Homogenización sin Romper el Sistema

## 📍 DATOS DUPLICADOS IDENTIFICADOS

### **1. DATOS DEL CANDIDATO**

**Ubicación A:** `candidates` tabla
```sql
- nombreCompleto: varchar
- email: varchar
- telefono: varchar
```

**Ubicación B:** `perfilDetalle` JSON (dentro de candidates)
```json
{
  "primerNombre": "",
  "apellidos": "",
  "email": "",
  "telefono": "",
  "telefonoAlternativo": ""
}
```

**PROBLEMA:** 
- Candidato llena nombre en pre-registro → va a `perfilDetalle`
- Analista ve nombre en `candidates.nombreCompleto` (¿de dónde viene?)
- ¿Cuál es la fuente de verdad?

---

### **2. DATOS DE HISTORIAL LABORAL**

**Ubicación A:** `workHistory` tabla (campos directos)
```sql
- empresa: varchar
- puesto: varchar
- fechaInicio: varchar
- fechaFin: varchar
- tiempoTrabajado: varchar
- tiempoTrabajadoEmpresa: varchar
```

**Ubicación B:** `investigacionDetalle` JSON (dentro de workHistory)
```json
{
  "empresa": {
    "nombreComercial": "",    ← ¿Diferente de empresa?
    "giro": ""
  },
  "puesto": {
    "puestoInicial": "",      ← ¿Diferente de puesto?
    "puestoFinal": ""
  },
  "periodo": {
    "fechaIngreso": "",       ← ¿Diferente de fechaInicio?
    "fechaSalida": "",        ← ¿Diferente de fechaFin?
    "antiguedadTexto": ""     ← ¿Diferente de tiempoTrabajado?
  }
}
```

**PROBLEMA:** 
- Candidato llena "Empresa" en pre-registro → workHistory.empresa
- Analista verifica → va a investigacionDetalle.empresa.nombreComercial
- **Son campos DIFERENTES pero con misma información**
- Si hay discrepancia, ¿cuál es la correcta?

---

### **3. CAUSALES DE SALIDA**

**Ubicación A:** Campo directo en workHistory
```sql
causalSalidaRH: ENUM (11 opciones)
causalSalidaJefeInmediato: ENUM (11 opciones)
```

**Ubicación B:** Dentro de investigacionDetalle.incidencias
```json
{
  "motivoSeparacionCandidato": "",
  "motivoSeparacionEmpresa": ""
}
```

**PROBLEMA:**
- Son campos ENUM (controlados) vs strings libres (JSON)
- Si candidato dice "cambio de trabajo" en pre-registro, ¿dónde va?
- Analista luego llena causalSalida ENUM (puede ser diferente)
- ¿Cuál documento recibe el cliente final?

---

### **4. EVALUACIÓN / DICTAMEN**

**Ubicación A:** Campo directo en workHistory
```sql
resultadoVerificacion: ENUM (pendiente, recomendable, con_reservas, no_recomendable)
desempenoScore: int
```

**Ubicación B:** Dentro de investigacionDetalle.conclusion
```json
{
  "dictamen": "RECOMENDABLE",
  "puntuacion": 85,
  "conclusionTexto": "..."
}
```

**PROBLEMA:**
- Campo ENUM vs valores en JSON
- Si hay discrepancia, ¿cuál es la verdad?

---

## 🎯 OPCIONES DISPONIBLES

### **OPCIÓN 1: "Espejo" (Mirror Pattern)**
**Idea:** Mantener ambos lugares, sincronizarlos automáticamente

```
✅ VENTAJAS:
  - No cambiar tablas existentes
  - Las analistas siguen igual
  - Candidato sigue viendo lo mismo

❌ DESVENTAJAS:
  - Sincronización fallida = desastre
  - ¿Quién es la fuente de verdad?
  - Más confusión, no menos
```

**Complejidad: ALTA**
**Riesgo: CRÍTICO**
**Recomendación: ❌ NO HACER**

---

### **OPCIÓN 2: "Desnormalizar" (Denormalize)**
**Idea:** Llevar campos JSON clave a tabla principal

```
CAMBIO EN SCHEMA:
  workHistory {
    // EXISTENTE (candidato llena)
    empresa: varchar
    puesto: varchar
    fechaInicio, fechaFin: varchar
    tiempoTrabajado: varchar
    
    // NUEVO (cuando analista verifica)
    empresaNombreComercialVerificado?: varchar
    puestoVerificado?: varchar
    fechaIngresoVerificada?: varchar
    fechaSalidaVerificada?: varchar
    antiguedadVerificada?: varchar
    
    // MARCAR DIFERENCIAS
    existenDiscrepancias?: boolean
    discrepanciasDetalle?: text (JSON con qué cambió)
  }
```

✅ VENTAJAS:
  - Datos principales en tabla (búsqueda más rápida)
  - Fácil ver "declarado vs verificado"
  - No rompe interfaz actual

❌ DESVENTAJAS:
  - Requiere migración DB
  - Más campos = tabla gorda
  - Analista ve duplicados (podría confundir)

**Complejidad: MEDIA**
**Riesgo: BAJO**
**Tiempo: 1 día**
**Recomendación: ⚠️ POSIBLE si tiempo lo permite**

---

### **OPCIÓN 3: "Vista Unificada" (Unified View)**
**Idea:** Crear VISTA SQL que reúne datos de ambos lugares

```sql
CREATE VIEW workHistoryUnified AS
SELECT
  wh.id,
  wh.empresa as empresaDeclarada,
  COALESCE(
    JSON_EXTRACT(wh.investigacionDetalle, '$.empresa.nombreComercial'),
    wh.empresa
  ) as empresaVerificada,
  
  wh.puesto as puestoDeclarado,
  COALESCE(
    JSON_EXTRACT(wh.investigacionDetalle, '$.puesto.puestoFinal'),
    wh.puesto
  ) as puestoVerificado,
  
  -- ... más campos
  
  CASE 
    WHEN empresaDeclarada != empresaVerificada THEN 'discrepancia'
    ELSE 'coincide'
  END as statusEmpresa
FROM workHistory wh;
```

✅ VENTAJAS:
  - **NO cambia BD** (solo vista)
  - **NO cambia interfaz** (desde API retornas `empresaDeclarada` y `empresaVerificada`)
  - Centraliza lógica de comparación
  - Fácil crear reportes
  - **CERO riesgo**

❌ DESVENTAJAS:
  - Requiere cambio en API/controller
  - Analista necesita entender "declarado vs verificado"
  - JSON_EXTRACT puede ser lento en producción (pero cacheable)

**Complejidad: BAJA**
**Riesgo: NULO**
**Tiempo: 3-4 horas**
**Recomendación: ✅ MEJOR OPCIÓN**

---

### **OPCIÓN 4: "API Wrapper" (Wrapper Pattern)**
**Idea:** Crear endpoint que unifica datos sin tocar DB

```typescript
// Backend - Nuevo endpoint
GET /api/candidate/:id/workHistory (WITH UNIFIED VIEW)

Response:
{
  id: 1,
  empresa: {
    declarado: "HEINEKEN",
    verificado: "CERVECERÍA HEINEKEN S.A.",
    discrepancia: false
  },
  puesto: {
    declarado: "ASESOR DE CONQUISTA",
    verificado: "ASESOR COMERCIAL - CATEGORÍA A",
    discrepancia: false
  },
  periodo: {
    declarado: { inicio: "2020-01", fin: "2021-01" },
    verificado: { inicio: "2020-02-15", fin: "2021-01-30" },
    discrepancia: true
  },
  evaluacion: {
    resultadoDeclarado: null,
    resultadoFinal: "recomendable"
  }
}
```

✅ VENTAJAS:
  - **Cero cambios en DB**
  - **Interfaz actual sigue igual**
  - Frontend obtiene datos procesados
  - Fácil documentar diferencias

❌ DESVENTAJAS:
  - Requiere cambio en frontend (nuevas props)
  - Más transferencia de datos
  - Lógica en API (si crece, complejo)

**Complejidad: MEDIA**
**Riesgo: BAJO**
**Tiempo: 4-5 horas**
**Recomendación: ✅ COMPLEMENTA OPCIÓN 3**

---

## 🎓 PROPUESTA FINAL: OPCIÓN 3 + 4

### **PASO 1: Crear Vista SQL (OPCIÓN 3)**

```sql
-- Archivo: migrations/workHistoryUnified.sql
CREATE VIEW v_workHistory_unified AS
SELECT
  wh.id,
  wh.candidatoId,
  
  -- GRUPO 1: CANDIDATO DECLARA
  wh.empresa as empresaDeclarado,
  wh.puesto as puestoDeclarado,
  wh.fechaInicio as fechaInicioDeclarado,
  wh.fechaFin as fechaFinDeclarado,
  wh.tiempoTrabajado as tiempoTrabajadoDeclarado,
  
  -- GRUPO 2: ANALISTA VERIFICA (desde JSON)
  COALESCE(
    JSON_UNQUOTE(JSON_EXTRACT(wh.investigacionDetalle, '$.empresa.nombreComercial')),
    wh.empresa
  ) as empresaVerificado,
  
  COALESCE(
    JSON_UNQUOTE(JSON_EXTRACT(wh.investigacionDetalle, '$.puesto.puestoFinal')),
    wh.puesto
  ) as puestoVerificado,
  
  COALESCE(
    JSON_UNQUOTE(JSON_EXTRACT(wh.investigacionDetalle, '$.periodo.fechaIngreso')),
    wh.fechaInicio
  ) as fechaInicioVerificado,
  
  COALESCE(
    JSON_UNQUOTE(JSON_EXTRACT(wh.investigacionDetalle, '$.periodo.fechaSalida')),
    wh.fechaFin
  ) as fechaFinVerificado,
  
  COALESCE(
    JSON_UNQUOTE(JSON_EXTRACT(wh.investigacionDetalle, '$.periodo.antiguedadTexto')),
    wh.tiempoTrabajado
  ) as antiguedadVerificada,
  
  -- GRUPO 3: MARCADORES DE CAMBIO
  CASE 
    WHEN wh.empresa != COALESCE(JSON_UNQUOTE(JSON_EXTRACT(wh.investigacionDetalle, '$.empresa.nombreComercial')), wh.empresa)
    THEN true
    ELSE false
  END as empresaCambió,
  
  CASE 
    WHEN wh.puesto != COALESCE(JSON_UNQUOTE(JSON_EXTRACT(wh.investigacionDetalle, '$.puesto.puestoFinal')), wh.puesto)
    THEN true
    ELSE false
  END as puestoCambió,
  
  -- GRUPO 4: EVALUACIÓN FINAL
  wh.resultadoVerificacion,
  wh.estatusInvestigacion,
  wh.capturadoPor,
  
  wh.investigacionDetalle
FROM workHistory wh;
```

### **PASO 2: Crear Tipo TypeScript (Frontend)**

```typescript
// client/src/lib/types.ts
export type WorkHistoryUnified = {
  id: number;
  empresa: {
    declarado: string;
    verificado: string;
    cambió: boolean;
  };
  puesto: {
    declarado: string;
    verificado: string;
    cambió: boolean;
  };
  periodo: {
    declarado: { inicio: string; fin: string };
    verificado: { inicio: string; fin: string };
    cambió: boolean;
  };
  evaluacion: {
    estado: string;
    resultado: string;
    capturadoPor: string;
  };
  detalles?: any;
};
```

### **PASO 3: Transformar en Componente (Frontend)**

```tsx
// client/src/components/WorkHistoryCard.tsx
export function WorkHistoryCard({ item }: { item: WorkHistoryUnified }) {
  return (
    <div className="border rounded-lg p-4">
      {/* CANDIDATO DECLARÓ */}
      <div className="text-sm text-muted-foreground mb-2">
        Candidato declaró:
      </div>
      <p className="font-semibold">{item.empresa.declarado}</p>
      <p>{item.puesto.declarado}</p>
      
      {/* ANALISTA VERIFICÓ (si hay cambio) */}
      {(item.empresa.cambió || item.puesto.cambió) && (
        <div className="mt-4 border-t pt-4">
          <div className="text-sm text-yellow-700 font-semibold mb-2">
            ⚠️ Información verificada (diferente a lo declarado):
          </div>
          {item.empresa.cambió && (
            <p className="text-sm">
              Empresa: <span className="font-semibold">{item.empresa.verificado}</span>
            </p>
          )}
          {item.puesto.cambió && (
            <p className="text-sm">
              Puesto: <span className="font-semibold">{item.puesto.verificado}</span>
            </p>
          )}
        </div>
      )}
      
      {/* EVALUACIÓN FINAL */}
      <div className="mt-4 bg-blue-50 p-2 rounded">
        <p className="text-xs">
          <span className="font-semibold">Resultado final:</span> {item.evaluacion.resultado}
        </p>
      </div>
    </div>
  );
}
```

### **PASO 4: Backend Controller**

```typescript
// server/routers/workHistory.ts
export const getUnifiedWorkHistory = async (candidatoId: number) => {
  const db = await getDb();
  
  const result = await db
    .select({
      id: workHistory.id,
      empresa_declarado: workHistory.empresa,
      empresa_verificado: sql`...`,  // JSON_EXTRACT
      // ... más campos
      cambios: sql`...`,  // Indicador de qué cambió
      resultado: workHistory.resultadoVerificacion,
    })
    .from(workHistory)
    .where(eq(workHistory.candidatoId, candidatoId));
  
  // Transformar a WorkHistoryUnified
  return result.map(r => ({
    id: r.id,
    empresa: {
      declarado: r.empresa_declarado,
      verificado: r.empresa_verificado,
      cambió: r.empresa_declarado !== r.empresa_verificado
    },
    // ... más transformaciones
  }));
};
```

---

## 📋 COMPARATIVA FINAL

| Opción | Cambios BD | Cambios UI | Cambios API | Complejidad | Tiempo | Riesgo | Recomendación |
|--------|-----------|-----------|-----------|-----------|--------|--------|---------------|
| 1: Espejo | No | No | No | ALTA | 8h | CRÍTICO | ❌ NO |
| 2: Desnormalizar | SÍ | NO | Medio | MEDIA | 1 día | BAJO | ⚠️ Futuro |
| 3: Vista SQL | NO | NO | SÍ | BAJA | 4h | NULO | ✅ AHORA |
| 4: API Wrapper | NO | SÍ | SÍ | MEDIA | 5h | BAJO | ✅ COMPLEMENTAR |

---

## 🎯 MI RECOMENDACIÓN PERSONAL

**Haz OPCIÓN 3 (Vista SQL) + OPCIÓN 4 (API Wrapper):**

1. **Hoy (Ahora):** Vista SQL `v_workHistory_unified` (30 min)
   - Cero riesgo
   - Cero cambios en interfaz actual
   - Centraliza lógica de comparación

2. **Hoy (2-3 horas después):** Endpoint nuevo que retorna datos unificados
   - Frontend puede optar por usarla o no
   - Las analistas siguen viendo lo mismo si no cambias UI
   - Preparas el terreno para futuro

3. **Opcional: Próxima iteración:** Mostrar "Declarado vs Verificado"
   - Si quieren que analistas vean diferencias claramente
   - Ahora tienes infraestructura lista

---

## ⚠️ CUIDADO

**Lo que NO debes hacer:**
- ❌ Cambiar interfaz actual sin avisar
- ❌ Eliminar campos existentes (rompe todo)
- ❌ Confundir a las analistas con "nueva forma de ver datos"

**Lo que SÍ debes hacer:**
- ✅ Crear vista nueva (no modificar tabla)
- ✅ Endpoint nuevo (no modificar existente)
- ✅ Avisarles cuando haya cambios a UI

¿Vamos con Opción 3 + 4?

