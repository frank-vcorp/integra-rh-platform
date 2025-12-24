# Checkpoint: Correcciones Múltiples - Sesión 23/12/2025

**Fecha:** 2025-12-23 05:00  
**Agente:** SOFIA  
**Estado:** ✅ Completado - Sin reportes pendientes

---

## Resumen Ejecutivo

Sesión de corrección de bugs y mejoras de UX reportados por las analistas. Todos los issues fueron resueltos y desplegados a producción.

---

## Issues Resueltos

### 1. ✅ Duplicación de Historial Laboral (Candidato 58)

**Problema:** Al guardar el formulario de self-service, si el candidato hacía clic dos veces en "Guardar", se duplicaban los registros de historial laboral.

**Causa raíz:** El servidor insertaba registros nuevos sin verificar si ya existían. Los registros llegaban sin ID en ambos guardados.

**Solución:** 
- Agregada verificación de duplicados en `server/_core/index.ts`
- Antes de insertar, se verifica si existe registro con mismo `candidatoId`, `empresa`, `fechaInicio` y `fechaFin`
- Si existe → actualiza en lugar de insertar
- Eliminados los 4 registros duplicados del candidato 58 (IDs 127-130)

**Archivos modificados:**
- `server/_core/index.ts` (líneas ~380-430)

---

### 2. ✅ Ordenamiento Predeterminado de Candidatos

**Problema:** El listado de candidatos se ordenaba por nombre (A-Z), las analistas preferían ver los más recientes primero.

**Solución:** 
- Cambiado valor inicial de `candidateSortKey` de `"nombre"` a `"fechaRegistro"`
- Cambiado valor inicial de `candidateSortDir` de `"asc"` a `"desc"`
- El ordenamiento manual sigue disponible

**Archivos modificados:**
- `client/src/pages/Candidatos.tsx` (líneas ~199-202)

---

### 3. ✅ Error al Guardar Causales de Salida en Historial Laboral

**Problema:** Al intentar cambiar la causal de renuncia en el diálogo de historial laboral, aparecía error 400.

**Causas:**
1. El cliente enviaba `data` directamente en lugar del formato `{ id, data }`
2. Lista de causales desincronizada (cliente: 11 opciones vs servidor: 31 opciones)
3. Campos `contactoReferencia`, `telefonoReferencia`, `correoReferencia` enviaban `null` en lugar de `string`

**Solución:**
- Corregido formato de llamada a `updateWorkHistoryMutation.mutateAsync({ id, data })`
- Sincronizadas las 31 causales de salida entre cliente y servidor
- Agregada limpieza de valores `null` → `undefined` antes de enviar
- Agregado `useEffect` para actualizar `formData` cuando cambia `workHistoryItem`

**Archivos modificados:**
- `client/src/pages/CandidatoDetalle.tsx` (líneas ~2325-2350)
- `client/src/components/ReviewAndCompleteDialog.tsx` (imports, useState, CAUSALES_SALIDA)

---

### 4. ✅ Corrector Ortográfico Activado

**Problema:** Las analistas querían ayuda con la ortografía al capturar datos.

**Solución:**
- Agregado `spellCheck={props.spellCheck ?? true}` al componente `Input`
- El componente `Textarea` ya lo tenía activado

**Archivos modificados:**
- `client/src/components/ui/input.tsx` (línea ~54)

---

### 5. ✅ Campos Faltantes en CandidatoDetalle (sesión anterior)

**Contexto:** Completado antes de esta sesión, campos del self-service que no se mostraban en el panel del analista.

**Campos agregados:**
- Domicilio: `numero`, `interior`
- Situación Familiar: `fechaMatrimonioUnion`, `parejaDeAcuerdoConTrabajo`, `esposaEmbarazada`, `quienCuidaHijos`, `dondeVivenCuidadores`, `pensionAlimenticia`
- Pareja/Noviazgo: sección completa (6 campos)
- Financiero: `accidentesVialesPrevios`, `accidentesTrabajoPrevios`
- Identificación: `fechaNacimiento`, `lugarNacimiento`

---

## Lista de Causales de Salida (31 opciones sincronizadas)

```
RENUNCIA VOLUNTARIA
VIGENTE
RECORTE DE PERSONAL
TÉRMINO DE CONTRATO
TERMINACIÓN DE PROYECTO
TÉRMINO DE PERIODO DE PRUEBA
REESTRUCTURACIÓN
CAMBIO DE ADMINISTRACIÓN
CIERRE DE EMPRESA
POR ANTIGÜEDAD NO HAY INFORMACIÓN EN SISTEMA
POR POLÍTICAS DE PRIVACIDAD NO DAN REFERENCIAS LABORALES
BAJO DESEMPEÑO
AUSENTISMO
ABANDONO DE EMPLEO
ACUMULACIÓN DE FALTAS INJUSTIFICADAS
INCUMPLIMIENTO DE POLÍTICAS INTERNAS
NO APEGO A POLÍTICAS Y PROCESOS
CONDUCTA INADECUADA
CONFLICTIVO
VIOLACIÓN AL CODIGO DE CONDUCTA Y ÉTICA (DESHONESTIDAD)
FALTA DE PROBIDAD
PERDIDA DE CONFIANZA
NO RENOVACIÓN DE CONTRATO
BAJA CON CAUSAL
BAJA ADMINISTRATIVA
ABUSO DE CONFIANZA
FALSIFICACIÓN DE DOCUMENTOS
SUSTRACCIÓN DE COMBUSTIBLE
ALCOHOLISMO
PERDIDA DE RECURSOS / MATERIAL DE LA EMPRESA
DAÑO A UNIDAD VEHICULAR
```

---

## Despliegues Realizados

| Servicio | Comando | Estado |
|----------|---------|--------|
| Frontend | `firebase deploy --only hosting` | ✅ |
| Backend | `gcloud run deploy api --source ./integra-rh-manus` | ✅ |

**URLs de producción:**
- Frontend: https://integra-rh.web.app
- Backend: https://api-559788019343.us-central1.run.app

---

## Estado del Sistema

- ✅ Build compila sin errores
- ✅ Self-service guarda datos correctamente
- ✅ Historial laboral sin duplicaciones
- ✅ Causales de salida funcionan
- ✅ Corrector ortográfico activo
- ✅ Ordenamiento por fecha funciona
- ✅ Sin reportes de errores pendientes

---

## Próximos Pasos Sugeridos

1. Monitorear logs de Cloud Run por cualquier error nuevo
2. Verificar que las analistas pueden usar el corrector ortográfico (requiere idioma español en navegador)
3. Considerar agregar campos de estudios y vehículo al self-service (actualmente en el cálculo de progreso pero no en el formulario)

---

## Notas Técnicas

- La verificación de duplicados usa: `candidatoId + empresa + fechaInicio + fechaFin`
- El corrector ortográfico depende del diccionario del navegador del usuario
- Los valores `null` de BD se convierten a `undefined` para compatibilidad con zod schemas opcionales
