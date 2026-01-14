# Checkpoint: Portal de Cliente - Visualización Dinámica por Servicios Contratados

**Fecha:** 2026-01-14  
**Agente:** SOFIA  
**Tipo:** Mejora UX / Lógica de negocio  
**Estado:** ✅ Completado y desplegado

---

## Resumen Ejecutivo

Se implementó lógica dinámica en el Portal de Cliente para mostrar **únicamente los servicios contratados**, evitando confusión cuando aparecían opciones de Investigación Legal, Buró de Crédito o Visita que el cliente no había solicitado.

---

## Problema Reportado

> *"De acuerdo al panel del cliente, no todos piden visita, investigación legal o buró de crédito, creo que al aparecerles la opción podría generar duda en ellos igual pensando que se está trabajando eso aunque no lo solicitaron."*  
> — Equipo operativo

### Antes del cambio

El portal mostraba **todos los bloques** independientemente del tipo de proceso:

```
┌─────────────────────────────────────────────────────────────┐
│  PROCESO ILA (solo investigación laboral)                  │
├─────────────────────────────────────────────────────────────┤
│  ✅ Investigación Laboral: En proceso                      │
│  ⚠️ Investigación Legal: Pendiente    ← CONFUSO           │
│  ⚠️ Buró de Crédito: Pendiente        ← CONFUSO           │
│  ⚠️ Visita: No asignada               ← CONFUSO           │
└─────────────────────────────────────────────────────────────┘
```

---

## Solución Implementada

### Nueva función: `getServiciosIncluidos()`

**Archivo:** `client/src/lib/procesoTipo.ts`

```typescript
export function getServiciosIncluidos(
  tipoProducto?: string | null,
  datosVisita?: DatosVisita
): ServiciosIncluidos {
  // Laboral: ILA y ESE incluyen investigación laboral
  laboral: tipo.includes("ILA") || tipo.includes("ESE"),
  
  // Legal: solo si el tipo dice "CON INVESTIGACIÓN LEGAL"
  legal: tipo.includes("LEGAL"),
  
  // Buró: solo si el tipo dice "CON BURÓ DE CRÉDITO"
  buro: tipo.includes("BUR"),
  
  // Visita: OPCIONAL - solo si hay datos registrados
  visita: esProcesoSoloVisita || tieneVisitStatus || tieneVisitaDetalle,
}
```

### Lógica de Visita (Opción D)

La visita es **opcional para todos los tipos de proceso** (ILA, ESE, etc.). Se muestra al cliente **solo cuando:**

1. El tipo de proceso es **VISITA LOCAL** o **VISITA FORANEA**, **O**
2. Hay datos en `visitStatus`:
   - `status` (asignada, programada, realizada)
   - `scheduledDateTime` (fecha programada)
   - `encuestadorId` (encuestador asignado)
3. Hay datos en `visitaDetalle`:
   - `tipo` (virtual/presencial)
   - `fechaRealizacion`

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `client/src/lib/procesoTipo.ts` | Nueva función `getServiciosIncluidos()` con interface `DatosVisita` |
| `client/src/pages/ClienteProcesoDetalle.tsx` | Importa y usa `getServiciosIncluidos()` con datos de visita |
| `client/src/pages/ClienteDashboard.tsx` | Importa y usa `getServiciosIncluidos()` para filtrar acordeón |

---

## Matriz de Visibilidad por Tipo de Proceso

| Tipo de Proceso | Laboral | Legal | Buró | Visita |
|-----------------|:-------:|:-----:|:----:|:------:|
| ILA | ✅ | ❌ | ❌ | Solo si registrada |
| ILA CON BURÓ | ✅ | ❌ | ✅ | Solo si registrada |
| ILA CON LEGAL | ✅ | ✅ | ❌ | Solo si registrada |
| ESE LOCAL/FORÁNEO | ✅ | ❌ | ❌ | Solo si registrada |
| ESE CON BURÓ | ✅ | ❌ | ✅ | Solo si registrada |
| ESE CON LEGAL | ✅ | ✅ | ❌ | Solo si registrada |
| VISITA LOCAL/FORÁNEA | ❌ | ❌ | ❌ | ✅ Siempre |
| BURÓ DE CRÉDITO | ❌ | ❌ | ✅ | Solo si registrada |
| INVESTIGACIÓN LEGAL | ❌ | ✅ | ❌ | Solo si registrada |

---

## Resultado Final

### Después del cambio

```
┌─────────────────────────────────────────────────────────────┐
│  PROCESO ILA (solo investigación laboral)                  │
├─────────────────────────────────────────────────────────────┤
│  ✅ Investigación Laboral: En proceso                      │
│  ✅ Historial Laboral: 3 empleos verificados               │
└─────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────┐
│  PROCESO ESE LOCAL CON BURÓ + Visita contratada            │
├─────────────────────────────────────────────────────────────┤
│  ✅ Investigación Laboral: En proceso                      │
│  ✅ Buró de Crédito: Score 680                             │
│  ✅ Visita: Programada 15/01/2026 10:00                    │
│  ✅ Historial Laboral: 5 empleos verificados               │
└─────────────────────────────────────────────────────────────┘
```

---

## Impacto

### ✅ Beneficios

- **Claridad para el cliente**: Solo ve lo que contrató
- **Menos confusión**: No aparecen opciones "Pendiente" de servicios no solicitados
- **Flexibilidad**: La visita es opcional para cualquier tipo de proceso
- **Sin cambios en DB**: La lógica se basa en datos existentes

### ⚠️ Consideraciones

- Si el cliente contrató visita pero **aún no se ha asignado encuestador**, no verá el bloque de visita hasta que el equipo operativo lo registre
- Esto es intencional: evita mostrar "Visita: No asignada" que podría confundir

---

## Despliegue

- **Frontend:** Firebase Hosting → https://integra-rh.web.app ✅
- **Backend:** Sin cambios necesarios

---

## Testing Recomendado

1. Abrir portal de cliente con proceso **ILA** → Debe mostrar solo Laboral + Historial
2. Abrir portal de cliente con proceso **ESE CON BURÓ** → Debe mostrar Laboral + Buró + Historial
3. Abrir portal de cliente con proceso que tenga **visita programada** → Debe mostrar bloque de Visita
4. Abrir portal de cliente con proceso que **NO tenga visita** → NO debe mostrar bloque de Visita

---

## Próximos Pasos Sugeridos

- [ ] Confirmar con equipo operativo que la lógica de visibilidad es correcta
- [ ] Evaluar si se necesita un campo explícito `incluyeVisita` en la creación del proceso para mayor control
