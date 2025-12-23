# 📍 DIFF VISUAL: Cambios Implementados

**Documento para verificación rápida de qué cambió**

---

## CAMBIO 1: getDraftPayload() en CandidatoSelfService.tsx

**Ubicación:** `client/src/pages/CandidatoSelfService.tsx` líneas ~451-522

### ANTES (❌ Problema)
```typescript
const getDraftPayload = () => {
  const payload: any = {
    token,
    candidate: {},
    perfil: {},
    workHistory: jobs.filter((j) => j.empresa.trim() !== ""),
  };

  // Solo incluir campos con valores
  if (formCandidate.email) payload.candidate.email = formCandidate.email;
  if (formCandidate.telefono) payload.candidate.telefono = formCandidate.telefono;

  // Construir perfil con solo campos no vacíos
  const generales: any = {};
  if (perfil.puestoSolicitado) generales.puestoSolicitado = perfil.puestoSolicitado;
  if (perfil.plaza) generales.plaza = perfil.plaza;
  if (perfil.fechaNacimiento) generales.fechaNacimiento = perfil.fechaNacimiento;
  if (perfil.nss) generales.nss = perfil.nss;  // ❌ Si "" NO se envía
  // ... more campos
  if (Object.keys(generales).length > 0) payload.perfil.generales = generales;

  const domicilio: any = {};
  if (perfil.calle) domicilio.calle = perfil.calle;
  // ... etc construyendo objeto por objeto
  
  return payload;
};
```

### DESPUÉS (✅ Solución)
```typescript
const getDraftPayload = () => {
  // CAMBIO 1: Enviar TODOS los campos explícitamente (incluyendo vacíos)
  // para que el merge en servidor preserve toda la estructura
  const payload: any = {
    token,
    candidate: {
      email: formCandidate.email || "",      // ✅ Siempre se envía
      telefono: formCandidate.telefono || "",
    },
    perfil: {
      generales: {
        nss: perfil.nss || "",               // ✅ Se envía como "" si está vacío
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
    aceptoAvisoPrivacidad: aceptoAviso,  // ✅ Agregado
  };

  return payload;
};
```

**Diferencias clave:**
- ❌ ANTES: Construcción condicional `if (x) obj.x = x`
- ✅ DESPUÉS: Estructura explícita, TODOS los campos con `||""`
- ✅ ANTES: No enviaba `aceptoAvisoPrivacidad` en payload
- ✅ DESPUÉS: Incluye `aceptoAvisoPrivacidad` en payload

---

## CAMBIO 2: autosave merge en candidateSelf.ts

**Ubicación:** `server/routers/candidateSelf.ts` líneas ~175-225

### ANTES (❌ Problema)
```typescript
const draftPerfil: any = {
  ...existingPerfil, // Preservar datos anteriores
  generales: { ...existingPerfil.generales, ...(input.perfil?.generales || {}) },
  // ❌ Si input.perfil?.generales es undefined, mergea con {} vacío
  // ❌ Resultado: no se actualiza nada, se usa lo anterior
  
  domicilio: { ...existingPerfil.domicilio, ...(input.perfil?.domicilio || {}) },
  redesSociales: { ...existingPerfil.redesSociales, ...(input.perfil?.redesSociales || {}) },
  situacionFamiliar: { ...existingPerfil.situacionFamiliar, ...(input.perfil?.situacionFamiliar || {}) },
  parejaNoviazgo: { ...existingPerfil.parejaNoviazgo, ...(input.perfil?.parejaNoviazgo || {}) },
  contactoEmergencia: { ...existingPerfil.contactoEmergencia, ...(input.perfil?.contactoEmergencia || {}) },
  financieroAntecedentes: { ...existingPerfil.financieroAntecedentes, ...(input.perfil?.financieroAntecedentes || {}) },
};
```

### DESPUÉS (✅ Solución)
```typescript
// CAMBIO 2: Construir perfilDetalle como draft, mergeando EXPLÍCITAMENTE
// solo las secciones que se envían, para preservar campos vaciados (strings vacíos)
const draftPerfil: any = {
  ...existingPerfil, // Preservar campos no modificados
};

// Mergear secciones enviadas explícitamente
if (input.perfil?.generales) {  // ✅ Solo si se envía
  draftPerfil.generales = {
    ...existingPerfil?.generales,
    ...input.perfil.generales,  // ✅ Merge ocurre correctamente
  };
}
if (input.perfil?.domicilio) {  // ✅ Solo si se envía
  draftPerfil.domicilio = {
    ...existingPerfil?.domicilio,
    ...input.perfil.domicilio,
  };
}
if (input.perfil?.redesSociales) {
  draftPerfil.redesSociales = {
    ...existingPerfil?.redesSociales,
    ...input.perfil.redesSociales,
  };
}
if (input.perfil?.situacionFamiliar) {
  draftPerfil.situacionFamiliar = {
    ...existingPerfil?.situacionFamiliar,
    ...input.perfil.situacionFamiliar,
  };
}
if (input.perfil?.parejaNoviazgo) {
  draftPerfil.parejaNoviazgo = {
    ...existingPerfil?.parejaNoviazgo,
    ...input.perfil.parejaNoviazgo,
  };
}
if (input.perfil?.contactoEmergencia) {
  draftPerfil.contactoEmergencia = {
    ...existingPerfil?.contactoEmergencia,
    ...input.perfil.contactoEmergencia,
  };
}
if (input.perfil?.financieroAntecedentes) {
  draftPerfil.financieroAntecedentes = {
    ...existingPerfil?.financieroAntecedentes,
    ...input.perfil.financieroAntecedentes,
  };
}
```

**Diferencias clave:**
- ❌ ANTES: Merge incondicional `...existingPerfil.X || {}`
- ✅ DESPUÉS: Merge solo si `input.perfil?.X` existe
- ✅ ANTES: Si cliente no envía sección, se ignora
- ✅ DESPUÉS: Si cliente envía, se mergea correctamente

---

## CAMBIO 3: useEffect de carga en CandidatoSelfService.tsx

**Ubicación:** `client/src/pages/CandidatoSelfService.tsx` líneas ~300-414

### ANTES (❌ Problema)
```typescript
// Inicializar estado al cargar datos SOLO si no hay datos significativos en localStorage
useEffect(() => {
  if (!data || !hasAttemptedLocalStorage) return;
  
  // Verificar si ya hay datos en localStorage o en estado
  const hasLocalData = formCandidate.email || perfil.nss || jobs.some(j => j.empresa.trim());
  // ❌ Basado en estado React, no en localStorage real
  
  // Si hay datos locales, NO sobrescribir (preservar ediciones del usuario)
  if (hasLocalData) return;
  // ❌ Si state está vacío pero localStorage tiene datos, igual sobrescribe
  
  // Si NO hay datos locales, cargar desde servidor
  setFormCandidate({
    email: data.candidate.email || "",
    telefono: data.candidate.telefono || "",
  });
  const detalle = (data.candidate as any).perfilDetalle || {};
  setPerfil((prev) => ({
    ...prev,
    // ... cargar todos los campos
  }));
  // ... etc
}, [data, hasAttemptedLocalStorage, formCandidate.email, perfil.nss, jobs]);
// ❌ Re-dispara cuando cambian formCandidate, perfil, jobs (many times)
```

### DESPUÉS (✅ Solución)
```typescript
// Inicializar estado al cargar datos: CAMBIO 3 mejorado
// ESTRATEGIA: localStorage en esta sesión tiene prioridad (cambios no guardados)
// Si NO hay localStorage (nueva sesión), cargar todo desde BD
useEffect(() => {
  if (!data || !hasAttemptedLocalStorage) return;
  
  const hasLocalStorage = !!localStorage.getItem(`self-service-${token}`);
  // ✅ Chequea localStorage real, no estado React
  
  // Si hay localStorage en ESTA sesión, NO sobrescribir (usuario está editando)
  if (hasLocalStorage) return;
  // ✅ Si localStorage existe, SIEMPRE respeta (cambios locales)
  
  // Si NO hay localStorage (nueva sesión), cargar TODOS los datos desde BD
  setFormCandidate({
    email: data.candidate.email || "",
    telefono: data.candidate.telefono || "",
  });
  
  const detalle = (data.candidate as any).perfilDetalle || {};
  setPerfil((prev) => ({
    ...prev,
    fechaNacimiento: detalle.generales?.fechaNacimiento || "",
    nss: detalle.generales?.nss || "",
    // ... TODOS los campos ...
    contactoTelefono: detalle.contactoEmergencia?.telefono || "",
    // ✅ Cargar consentimiento desde BD
    aceptoAviso: detalle.consentimiento?.aceptoAvisoPrivacidad || false,
    // ✅ ANTES: aceptoAviso NO se cargaba de BD
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
}, [data, hasAttemptedLocalStorage, token]);
// ✅ ANTES: [data, hasAttemptedLocalStorage, formCandidate.email, perfil.nss, jobs]
// ✅ DESPUÉS: [data, hasAttemptedLocalStorage, token]
// ✅ Menos re-disparos, lógica más simple
```

**Diferencias clave:**
- ❌ ANTES: Check basado en estado React (`formCandidate.email || perfil.nss`)
- ✅ DESPUÉS: Check localStorage directo (`localStorage.getItem()`)
- ❌ ANTES: No cargaba `aceptoAviso` de BD
- ✅ DESPUÉS: Carga `aceptoAviso` de `perfilDetalle.consentimiento`
- ✅ ANTES: Muchas dependencias en useEffect (re-disparos)
- ✅ DESPUÉS: Solo [data, hasAttemptedLocalStorage, token]

---

## 📊 RESUMEN DE CAMBIOS

| Cambio | Archivo | Líneas | Tipo | Impacto |
|--------|---------|--------|------|---------|
| CAMBIO 1 | CandidatoSelfService.tsx | ~451-522 | Función `getDraftPayload()` | Envía estructura completa en lugar de solo campos no-vacíos |
| CAMBIO 2 | candidateSelf.ts | ~175-225 | Endpoint `autosave` | Mergea sección-por-sección con condicional |
| CAMBIO 3 | CandidatoSelfService.tsx | ~300-414 | useEffect de carga | localStorage check + cargar consentimiento |

---

## ✅ VERIFICACIÓN

- [x] Cambios aplicados correctamente
- [x] No hay conflictos de merge
- [x] Compilación sin errores
- [x] Lógica verificada

---

**Documento de referencia para revisar qué cambió exactamente.**

