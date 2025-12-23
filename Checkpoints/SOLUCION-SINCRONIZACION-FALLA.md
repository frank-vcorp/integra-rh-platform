# 🔧 SOLUCIÓN: Falla de Sincronización en CandidatoSelfService

**Fecha:** 23 de diciembre de 2025, 08:00  
**De:** INTEGRA-Arquitecto  
**Para:** SOFIA Builder  
**Prioridad:** CRÍTICA

---

## 📊 ANÁLISIS PROFUNDO DEL PROBLEMA

He revisado los 3 bloques de código específicos. He identificado **2 problemas raíz principales**:

### 🔴 PROBLEMA 1: getDraftPayload() NO envía consentimiento
**Ubicación:** [CandidatoSelfService.tsx](../integra-rh-manus/client/src/pages/CandidatoSelfService.tsx#L510-L600)

```typescript
// LÍNEA ~510-600: getDraftPayload()
const getDraftPayload = () => {
  const payload: any = {
    token,
    candidate: {},
    perfil: {},  // ← Aquí se construye perfil
    workHistory: jobs.filter((j) => j.empresa.trim() !== ""),
    // ❌ FALTA: aceptoAvisoPrivacidad aquí
  };
  
  // Se construyen sub-objetos con lógica "if (perfil.X)" que SOLO agrega si NO vacío
  const generales: any = {};
  if (perfil.nss) generales.nss = perfil.nss;
  if (perfil.curp) generales.curp = perfil.curp;
  // ... etc
  if (Object.keys(generales).length > 0) payload.perfil.generales = generales;
```

**Problema:** 
- Se construye con lógica `if (campo)` que IGNORA campos vacíos/falsy
- Cuando servidor recibe autosave, hace merge con `...existingPerfil.generales`
- Si cliente envía `{ nss: "" }`, servidor NO lo recibe como `""`, lo ignora
- Al reabrir, server devuelve `perfilDetalle.generales` de BD (que no fue actualizado)

### 🔴 PROBLEMA 2: Lógica de carga de BD sobrescribe cambios no guardados
**Ubicación:** [CandidatoSelfService.tsx](../integra-rh-manus/client/src/pages/CandidatoSelfService.tsx#L310-L330)

```typescript
// LÍNEA ~313-330: useEffect de carga desde BD
useEffect(() => {
  if (!data || !hasAttemptedLocalStorage) return;
  
  // Verificar si ya hay datos en localStorage o en estado
  const hasLocalData = formCandidate.email || perfil.nss || jobs.some(j => j.empresa.trim());
  
  // ✅ BIEN: Si hay datos locales, NO sobrescribir
  if (hasLocalData) return;
  
  // PERO: Este check es INSUFICIENTE porque:
  // 1. localStorage se cargó exitosamente al inicio
  // 2. Pero luego al reabrir (nueva sesión), no hay localStorage
  // 3. Y si BD tiene datos PARCIALES, esto sobrescribe con parciales
}, [data, hasAttemptedLocalStorage]);
```

**Problema:**
- El check `hasLocalData` funciona DURANTE una sesión
- Pero cuando REABRE, localStorage fue limpiado/expirado
- Si BD tiene `consentimiento: { aceptoAvisoPrivacidad: true }` pero NO tiene `generales.nss`
- El useEffect carga solo lo que BD tiene
- Los otros campos fueron perdidos por PROBLEMA 1 (nunca se guardaron completos)

### 🔴 PROBLEMA 3: Merge insuficiente en autosave endpoint
**Ubicación:** [candidateSelf.ts](../integra-rh-manus/server/routers/candidateSelf.ts#L175-L185)

```typescript
// LÍNEA ~175-185: autosave merge
const draftPerfil: any = {
  ...existingPerfil,  // Preservar datos anteriores ✅
  generales: { ...existingPerfil.generales, ...(input.perfil?.generales || {}) },
  domicilio: { ...existingPerfil.domicilio, ...(input.perfil?.domicilio || {}) },
  // etc...
};
```

**Problema:**
- Si `input.perfil?.generales = { nss: "" }` (enviado explícitamente como vacío)
- Merge hace: `{ ...existingPerfil.generales, nss: "" }`
- Resultado: `{ curp: "abc", nss: "" }` ← Se actualiza correctamente
- PERO cliente NO envía `{ nss: "" }`, envía `undefined` (por getDraftPayload)
- Merge hace: `{ ...existingPerfil.generales, ...(undefined || {}) }`
- Resultado: `{ curp: "abc" }` ← NO se actualiza

---

## ✅ SOLUCIÓN ESPECÍFICA: 3 CAMBIOS

### CAMBIO 1: Completar getDraftPayload() para enviar TODOS los campos

**Archivo:** [CandidatoSelfService.tsx](../integra-rh-manus/client/src/pages/CandidatoSelfService.tsx#L478-L542)

**Problema:** Construye `perfil` con lógica "solo si no vacío" que pierde campos

**Solución:** Enviar TODOS los campos, incluso vacíos. Pero estructuralmente:

```typescript
const getDraftPayload = () => {
  const payload: any = {
    token,
    candidate: {
      email: formCandidate.email || "",
      telefono: formCandidate.telefono || "",
    },
    perfil: {
      generales: {
        nss: perfil.nss || "",
        curp: perfil.curp || "",
        rfc: perfil.rfc || "",
        ciudadResidencia: perfil.ciudadResidencia || "",
        lugarNacimiento: perfil.lugarNacimiento || "",
        fechaNacimiento: perfil.fechaNacimiento || "",
        puestoSolicitado: perfil.puestoSolicitado || "",
        plaza: perfil.plaza || "",
        telefonoCasa: perfil.telefonoCasa || "",
        telefonoRecados: perfil.telefonoRecados || "",
      },
      domicilio: {
        calle: perfil.calle || "",
        numero: perfil.numero || "",
        interior: perfil.interior || "",
        colonia: perfil.colonia || "",
        municipio: perfil.municipio || "",
        estado: perfil.estado || "",
        cp: perfil.cp || "",
        mapLink: perfil.mapLink || "",
      },
      redesSociales: {
        facebook: perfil.facebook || "",
        instagram: perfil.instagram || "",
        twitterX: perfil.twitterX || "",
        tiktok: perfil.tiktok || "",
      },
      situacionFamiliar: {
        estadoCivil: perfil.estadoCivil || "",
        fechaMatrimonioUnion: perfil.fechaMatrimonioUnion || "",
        parejaDeAcuerdoConTrabajo: perfil.parejaDeAcuerdoConTrabajo || "",
        esposaEmbarazada: perfil.esposaEmbarazada || "",
        hijosDescripcion: perfil.hijosDescripcion || "",
        quienCuidaHijos: perfil.quienCuidaHijos || "",
        dondeVivenCuidadores: perfil.dondeVivenCuidadores || "",
        pensionAlimenticia: perfil.pensionAlimenticia || "",
        vivienda: perfil.vivienda || "",
      },
      parejaNoviazgo: {
        tieneNovio: perfil.tieneNovio || "",
        nombreNovio: perfil.nombreNovio || "",
        ocupacionNovio: perfil.ocupacionNovio || "",
        domicilioNovio: perfil.domicilioNovio || "",
        apoyoEconomicoMutuo: perfil.apoyoEconomicoMutuo || "",
        negocioEnConjunto: perfil.negocioEnConjunto || "",
      },
      financieroAntecedentes: {
        tieneDeudas: perfil.tieneDeudas || "",
        institucionDeuda: perfil.institucionDeuda || "",
        buroCreditoDeclarado: perfil.buroCreditoDeclarado || "",
        haSidoSindicalizado: perfil.haSidoSindicalizado || "",
        haEstadoAfianzado: perfil.haEstadoAfianzado || "",
        accidentesVialesPrevios: perfil.accidentesVialesPrevios || "",
        accidentesTrabajoPrevios: perfil.accidentesTrabajoPrevios || "",
      },
      contactoEmergencia: {
        nombre: perfil.contactoNombre || "",
        parentesco: perfil.contactoParentesco || "",
        telefono: perfil.contactoTelefono || "",
      },
    },
    workHistory: jobs.filter((j) => j.empresa.trim() !== ""),
    aceptoAvisoPrivacidad: aceptoAviso,
  };

  return payload;
};
```

**Por qué funciona:**
- Envía TODOS los campos explícitamente
- Servidor recibe `{ generales: { nss: "", curp: "" } }`
- Merge funciona: `{ ...existing, nss: "" }` sobrescribe el anterior
- Vacíos se guardan como vacíos (no como undefined)
- Al recargar, BD tiene el estado completo

---

### CAMBIO 2: Mejorar merge en servidor para preservar estructura

**Archivo:** [candidateSelf.ts](../integra-rh-manus/server/routers/candidateSelf.ts#L175-L195)

**Problema:** Merge no funciona con campos enviados como strings vacíos

**Solución:** Ser más explícito y destructivo para draft (borrador):

```typescript
// LÍNEA ~175-195: Cambiar merge a REEMPLAZO completo para draft
const draftPerfil: any = {
  ...existingPerfil, // Preservar campos no tocados
  
  // Para secciones que se envían en input, REEMPLAZARLAS completamente
  // (No usar merge parcial, porque queremos preservar todos los campos enviados)
  ...(input.perfil?.generales && {
    generales: { ...existingPerfil?.generales, ...input.perfil.generales }
  }),
  ...(input.perfil?.domicilio && {
    domicilio: { ...existingPerfil?.domicilio, ...input.perfil.domicilio }
  }),
  ...(input.perfil?.redesSociales && {
    redesSociales: { ...existingPerfil?.redesSociales, ...input.perfil.redesSociales }
  }),
  ...(input.perfil?.situacionFamiliar && {
    situacionFamiliar: { ...existingPerfil?.situacionFamiliar, ...input.perfil.situacionFamiliar }
  }),
  ...(input.perfil?.parejaNoviazgo && {
    parejaNoviazgo: { ...existingPerfil?.parejaNoviazgo, ...input.perfil.parejaNoviazgo }
  }),
  ...(input.perfil?.contactoEmergencia && {
    contactoEmergencia: { ...existingPerfil?.contactoEmergencia, ...input.perfil.contactoEmergencia }
  }),
  ...(input.perfil?.financieroAntecedentes && {
    financieroAntecedentes: { ...existingPerfil?.financieroAntecedentes, ...input.perfil.financieroAntecedentes }
  }),
};
```

**Por qué funciona:**
- Si cliente envía `{ generales: { nss: "", curp: "X" } }`
- Merge efectivamente reemplaza: `{ ...existing.generales, nss: "", curp: "X" }`
- Campos vacíos se guardan explícitamente como ""

---

### CAMBIO 3: Lógica de carga más robusta en cliente

**Archivo:** [CandidatoSelfService.tsx](../integra-rh-manus/client/src/pages/CandidatoSelfService.tsx#L310-L430)

**Problema:** Al reabrir, localStorage está vacío, solo carga lo que BD tiene (parcial)

**Solución:** Prioridad clara + fallback:

```typescript
// LÍNEA ~313-430: Cambiar lógica de carga
useEffect(() => {
  if (!data || !hasAttemptedLocalStorage) return;
  
  const detalle = (data.candidate as any).perfilDetalle || {};
  
  // ESTRATEGIA: localStorage primero (si existe en esta sesión),
  // Si no, BD es fallback
  const hasLocalStorage = !!localStorage.getItem(`self-service-${token}`);
  
  if (hasLocalStorage) {
    // ✅ Si hay localStorage en ESTA sesión, NO sobrescribir
    // (Usuario está en medio de llenar el formulario)
    return;
  }
  
  // Si NO hay localStorage (nueva sesión o limpiado), cargar desde BD
  // SIEMPRE cargar desde BD para nuevas sesiones
  
  setFormCandidate({
    email: data.candidate.email || "",
    telefono: data.candidate.telefono || "",
  });
  
  setPerfil((prev) => ({
    ...prev,
    // Cargar TODOS los campos desde BD
    nss: detalle.generales?.nss || "",
    curp: detalle.generales?.curp || "",
    rfc: detalle.generales?.rfc || "",
    ciudadResidencia: detalle.generales?.ciudadResidencia || "",
    lugarNacimiento: detalle.generales?.lugarNacimiento || "",
    fechaNacimiento: detalle.generales?.fechaNacimiento || "",
    puestoSolicitado: detalle.generales?.puestoSolicitado || "",
    plaza: detalle.generales?.plaza || "",
    telefonoCasa: detalle.generales?.telefonoCasa || "",
    telefonoRecados: detalle.generales?.telefonoRecados || "",
    calle: detalle.domicilio?.calle || "",
    numero: detalle.domicilio?.numero || "",
    interior: detalle.domicilio?.interior || "",
    colonia: detalle.domicilio?.colonia || "",
    municipio: detalle.domicilio?.municipio || "",
    estado: detalle.domicilio?.estado || "",
    cp: detalle.domicilio?.cp || "",
    mapLink: detalle.domicilio?.mapLink || "",
    facebook: detalle.redesSociales?.facebook || "",
    instagram: detalle.redesSociales?.instagram || "",
    twitterX: detalle.redesSociales?.twitterX || "",
    tiktok: detalle.redesSociales?.tiktok || "",
    estadoCivil: detalle.situacionFamiliar?.estadoCivil || "",
    fechaMatrimonioUnion: detalle.situacionFamiliar?.fechaMatrimonioUnion || "",
    parejaDeAcuerdoConTrabajo: detalle.situacionFamiliar?.parejaDeAcuerdoConTrabajo || "",
    esposaEmbarazada: detalle.situacionFamiliar?.esposaEmbarazada || "",
    hijosDescripcion: detalle.situacionFamiliar?.hijosDescripcion || "",
    quienCuidaHijos: detalle.situacionFamiliar?.quienCuidaHijos || "",
    dondeVivenCuidadores: detalle.situacionFamiliar?.dondeVivenCuidadores || "",
    pensionAlimenticia: detalle.situacionFamiliar?.pensionAlimenticia || "",
    vivienda: detalle.situacionFamiliar?.vivienda || "",
    tieneNovio: detalle.parejaNoviazgo?.tieneNovio || "",
    nombreNovio: detalle.parejaNoviazgo?.nombreNovio || "",
    ocupacionNovio: detalle.parejaNoviazgo?.ocupacionNovio || "",
    domicilioNovio: detalle.parejaNoviazgo?.domicilioNovio || "",
    apoyoEconomicoMutuo: detalle.parejaNoviazgo?.apoyoEconomicoMutuo || "",
    negocioEnConjunto: detalle.parejaNoviazgo?.negocioEnConjunto || "",
    tieneDeudas: detalle.financieroAntecedentes?.tieneDeudas || "",
    institucionDeuda: detalle.financieroAntecedentes?.institucionDeuda || "",
    buroCreditoDeclarado: detalle.financieroAntecedentes?.buroCreditoDeclarado || "",
    haSidoSindicalizado: detalle.financieroAntecedentes?.haSidoSindicalizado || "",
    haEstadoAfianzado: detalle.financieroAntecedentes?.haEstadoAfianzado || "",
    accidentesVialesPrevios: detalle.financieroAntecedentes?.accidentesVialesPrevios || "",
    accidentesTrabajoPrevios: detalle.financieroAntecedentes?.accidentesTrabajoPrevios || "",
    contactoNombre: detalle.contactoEmergencia?.nombre || "",
    contactoParentesco: detalle.contactoEmergencia?.parentesco || "",
    contactoTelefono: detalle.contactoEmergencia?.telefono || "",
    // ✅ Cargar consentimiento
    aceptoAviso: detalle.consentimiento?.aceptoAvisoPrivacidad || false,
  }));
  
  if (data.workHistory.length > 0) {
    setJobs(
      data.workHistory.map((h) => ({
        id: h.id,
        empresa: h.empresa,
        puesto: h.puesto || "",
        fechaInicio: h.fechaInicio || "",
        fechaFin: h.fechaFin || "",
        tiempoTrabajado: h.tiempoTrabajado || "",
        esActual: !h.fechaFin,
      })),
    );
  }
  
  setDocs(
    (data.documents || []).map((d: any) => ({
      id: d.id,
      tipoDocumento: d.tipoDocumento,
      nombreArchivo: d.nombreArchivo,
      url: d.url,
    })),
  );
}, [data, hasAttemptedLocalStorage]);
```

**Por qué funciona:**
- Detecta si hay localStorage en ESTA sesión
- Si SÍ → no sobrescribir (usuario está editando)
- Si NO → cargar desde BD (nueva sesión)
- Así se preservan cambios no guardados Y se recuperan datos guardados

---

## 📋 RESUMEN DE CAMBIOS

| Archivo | Líneas | Cambio | Efecto |
|---------|--------|--------|--------|
| [CandidatoSelfService.tsx](../integra-rh-manus/client/src/pages/CandidatoSelfService.tsx#L478) | ~478-542 | Completar `getDraftPayload()` para enviar TODOS los campos | Cliente envía estructura completa, no solo los no-vacíos |
| [candidateSelf.ts](../integra-rh-manus/server/routers/candidateSelf.ts#L175) | ~175-195 | Mejorar merge de `draftPerfil` con condicionales | Servidor actualiza campos explícitamente incluidos |
| [CandidatoSelfService.tsx](../integra-rh-manus/client/src/pages/CandidatoSelfService.tsx#L310) | ~310-430 | Cambiar lógica de carga: localStorage check primero | Se carga BD solo cuando no hay localStorage (nueva sesión) |

---

## 🎯 ARQUITECTURA RESULTANTE

```
FLUJO CORRECTO:
1. Candidato abre self-service por PRIMERA VEZ
   └─ localStorage: vacío
   └─ Carga desde BD: ✅ Se cargan TODOS los campos guardados (completos)

2. Candidato edita campos durante la SESIÓN
   └─ localStorage: se actualiza cada 500ms (cambios locales)
   └─ useEffect de BD: NO se dispara (hasLocalStorage = true)

3. Candidato presiona "Guardar borrador"
   └─ Envía getDraftPayload() a servidor
   └─ Servidor recibe estructura COMPLETA (no solo no-vacíos)
   └─ Merge funciona correctamente: sobrescribe campos con "" si fueron vaciados
   └─ BD se actualiza con datos completos

4. Candidato REABRE el enlace (nueva sesión)
   └─ localStorage: vacío (nueva sesión)
   └─ Carga desde BD: ✅ Se cargan TODOS los campos nuevamente (incluyendo los "" que se vaciaron)
   └─ Si había consentimiento: también se carga

VENTAJA: Candidato ve SUS cambios previos, no pierde nada
```

---

## ✅ VALIDACIÓN

Después de implementar, probar:

1. **Test de ciclo completo:**
   - [ ] Abrir self-service
   - [ ] Llenar algunos campos
   - [ ] Presionar "Guardar borrador"
   - [ ] Reabrir enlace
   - [ ] ✅ Verificar que TODOS los campos se restauran (no solo consentimiento)

2. **Test de campos vacíos:**
   - [ ] Llenar campo X con "abc"
   - [ ] Guardar
   - [ ] Editar: limpiar campo X (dejarlo vacío)
   - [ ] Guardar nuevamente
   - [ ] Reabrir
   - [ ] ✅ Verificar que campo X está vacío (no muestra "abc")

3. **Test de consentimiento:**
   - [ ] Marcar "Acepto términos"
   - [ ] Guardar
   - [ ] Reabrir
   - [ ] ✅ Checkbox debe estar marcado
   - [ ] ✅ Otros campos también deben persistir

---

## 🔒 CONSIDERACIONES

**Pros de esta solución:**
- ✅ Datos completos se guardan en BD
- ✅ localStorage funciona como caché local durante sesión
- ✅ No hay race conditions (localStorage check es simple)
- ✅ Backwards compatible: datos viejos en BD se cargan correctamente

**Contras:**
- ⚠️ Payload es más grande (pero es un formulario, no es crítico)
- ⚠️ Merge en servidor es más explícito (más código, pero más claro)

**Alternativas consideradas:**
- ❌ Opción A (localStorage siempre primario): Riesgo de consistencia con BD
- ❌ Opción B (siempre mergeando inteligentemente): Demasiado complejo
- ✅ **Opción C (esta solución): Simple, clara, funciona**

---

**Procede con la implementación. Este fix resolver el problema de pérdida de datos.**

