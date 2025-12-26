# 🧪 PRUEBA E2E CANDIDATO ID 57

**Fecha:** 23 de diciembre de 2025  
**Objetivo:** Validar sincronización bidireccional en candidato real  
**URL Panel:** https://integra-rh.web.app/candidatos/57  
**Tiempo Estimado:** 10-15 minutos

---

## 📋 PASOS A SEGUIR

### 1️⃣ ABRIR CANDIDATO EN PANEL

```
1. Acceder a: https://integra-rh.web.app/candidatos/57
2. Verificar que carga sin errores
3. Anotar el estado actual:
   ┌─────────────────────────────────┐
   │ Estado Actual del Candidato:    │
   │ ─────────────────────────────── │
   │ Nombre: _________________       │
   │ Email: __________________       │
   │ % Completitud: _________%       │
   │ Campos Llenos: __________       │
   │ Historial Laboral: ______       │
   │ Consentimiento: ☐ Sí ☐ No      │
   └─────────────────────────────────┘
```

---

### 2️⃣ ABRIR SELF-SERVICE

```
1. En panel candidato (candidatos/57):
   → Buscar botón azul "Editar autocaptura"
   
2. Click en botón
   → Se abre nueva ventana con self-service
   → URL tipo: .../candidato-self-service?token=xyz...
   
3. Anotar o copiar el TOKEN
   → Lo necesitarás si tienes que reabre
```

---

### 3️⃣ CANDIDATO LLENA DATOS

En la ventana de **self-service**, llenar estos campos ESPECÍFICAMENTE:

```
SECCIÓN GENERALES:
┌──────────────────────────────────────────┐
│ ✓ NSS: 12345678901                      │
│ ✓ Puesto Solicitado: Desarrollador      │
│ ✓ CURP: (dejar en blanco si no tienes) │
│ ✓ RFC: (dejar en blanco)                │
└──────────────────────────────────────────┘

SECCIÓN DOMICILIO:
┌──────────────────────────────────────────┐
│ ✓ Calle: "Avenida Sincronización 789"   │
│ ✓ Municipio: "Benito Juárez"            │
│ ✓ Estado: "CDMX"                        │
│ ✓ CP: "06500"                           │
└──────────────────────────────────────────┘

CONSENTIMIENTO:
┌──────────────────────────────────────────┐
│ ☑ Acepto el aviso de privacidad         │ ← CRÍTICO
└──────────────────────────────────────────┘

HISTORIAL LABORAL (OPCIONAL):
┌──────────────────────────────────────────┐
│ Agregar un trabajo:                      │
│ - Empresa: "Acme Corp"                   │
│ - Puesto: "Ingeniero Senior"             │
│ - Fecha Inicio: 2023-01-15               │
│ - Fecha Fin: (actual)                    │
└──────────────────────────────────────────┘
```

---

### 4️⃣ GUARDAR BORRADOR

```
1. Buscar botón azul "Guardar borrador"
   (está en header sticky al scroll)

2. Click en botón
   → Toast VERDE debe aparecer:
     "✓ Borrador guardado correctamente en la base de datos"

3. VERIFICAR EN DEVTOOLS (F12):
   → Network tab
   → Buscar request: POST candidate-save-full-draft
   → Status debe ser 200 OK
   → Response: { ok: true }
```

**ESPERADO:**
- ✅ Toast verde de éxito
- ✅ Network: 200 OK
- ✅ Sin errores en console roja

---

### 5️⃣ VERIFICAR EN PANEL (RECARGAR)

```
1. Volver a panel: https://integra-rh.web.app/candidatos/57
2. Presionar F5 (refrescar página)
3. Esperar carga completa

VERIFICAR QUE APARECE:
┌────────────────────────────────────────────┐
│ ✅ ACEPTÓ TÉRMINOS (23/12/2025)           │ ← BADGE
│                                            │
│ Perfil General:                           │
│ • NSS: 12345678901        ✓ SINCRONIZADO │
│ • Puesto: Desarrollador   ✓ SINCRONIZADO │
│ • Domicilio: Avenida...   ✓ SINCRONIZADO │
│ • Estado: CDMX            ✓ SINCRONIZADO │
│                                            │
│ % Completitud: 65% (antes 52%)  ✓ MEJORÓ │
└────────────────────────────────────────────┘
```

**ESPERADO:**
- ✅ Badge "✅ ACEPTÓ TÉRMINOS (fecha)" visible
- ✅ Todos los campos del self-service aparecen
- ✅ % completitud mejoró
- ✅ Sin campos vacíos que estaban llenos

---

### 6️⃣ ANALISTA EDITA EN PANEL

```
1. En mismo panel de candidato (candidatos/57)
2. Ir a sección "Historial Laboral"
3. Si hay trabajos, editar uno existente
   O agregar trabajo nuevo:
   
   • Empresa: "Test Corporation"
   • Puesto: "Líder de Desarrollo"
   • Fecha Inicio: 2024-01-01
   • Estado: Actual

4. Click "Guardar"
   → Toast: "Registro guardado"
   
5. VERIFICAR BADGE:
   Debe aparecer "(editado)" al lado del trabajo
   Ejemplo: "Test Corporation - Líder de Desarrollo (editado)"
```

**ESPERADO:**
- ✅ Trabajo se guarda
- ✅ Badge "(editado)" aparece
- ✅ Sin errores

---

### 7️⃣ CANDIDATO REABRE SELF-SERVICE

```
1. Volver a ventana/pestaña del self-service
2. Presionar F5 (refrescar)
3. Esperar carga

VERIFICAR SINCRONIZACIÓN INVERSA:
┌──────────────────────────────────────────┐
│ En sección "HISTORIAL LABORAL":          │
│                                          │
│ Empresa: "Test Corporation"    ✓ VISIBLE│
│ Puesto: "Líder de Desarrollo"  ✓ VISIBLE│
│ Fecha: 2024-01-01 - Actual     ✓ VISIBLE│
│                                          │
│ (El trabajo editado por analista         │
│  aparece en self-service)                │
└──────────────────────────────────────────┘
```

**ESPERADO:**
- ✅ Trabajo nuevo/editado visible
- ✅ Datos del analista reflejados
- ✅ Candidato ve cambios inmediatamente

---

### 8️⃣ CANDIDATO RE-EDITA (BIDIRECCIONAL)

```
1. Aún en self-service
2. Cambiar campo: Puesto Solicitado
   Cambiar de: "Desarrollador"
   A: "Arquitecto de Software"

3. Click "Guardar borrador"
   → Toast verde de éxito

4. Volver a panel: https://integra-rh.web.app/candidatos/57
5. Presionar F5

VERIFICAR CAMBIO:
┌────────────────────────────────┐
│ Puesto Solicitado:             │
│ "Arquitecto de Software" ✓      │
│ (cambio del candidato reflejado)│
└────────────────────────────────┘
```

**ESPERADO:**
- ✅ Cambio guardado
- ✅ Panel refleja cambio nuevo
- ✅ Ciclo completo funcionando

---

## ✅ CHECKLIST FINAL

```
SINCRONIZACIÓN SELF-SERVICE → PANEL:
☐ Datos candidato llena → aparecen en panel
☐ Checkbox "Acepto" → badge "ACEPTÓ TÉRMINOS"
☐ % Completitud mejoró
☐ Campos vacíos no se pierden

SINCRONIZACIÓN PANEL → SELF-SERVICE:
☐ Analista edita historial → candidato lo ve
☐ Badge "(editado)" visible
☐ Cambios de analista persisten

CICLO BIDIRECCIONAL:
☐ Candidato re-edita → panel ve cambios
☐ Sin data loss en ningún punto
☐ Sincronización es inmediata (al refrescar)

CALIDAD:
☐ Sin errores en DevTools console
☐ Network requests son 200 OK
☐ Toast de confirmación aparece
☐ localStorage actualizado
```

---

## 🔧 TROUBLESHOOTING

### Si datos NO aparecen en panel (Paso 5)

```
Revisar DevTools (F12):

1. Network tab:
   ✓ POST /api/candidate-save-full-draft → 200 OK?
   ✓ Payload contiene perfil.generales.*?
   
2. Console tab:
   ✓ ¿Hay errores rojos?
   ✓ ¿Qué dice en logs?

3. Application tab → localStorage:
   → Clave: self-service-{token}
   → ¿Contiene datos?

Posibles soluciones:
• Limpiar cache navegador (Ctrl+Shift+Delete)
• Cerrar todas las pestañas del app
• Reabre y intenta nuevamente
• Reportar error con: timestamp + requestId (en headers respuesta)
```

### Si badge NO aparece (Paso 5)

```
El badge aparece si:
✓ aceptoAvisoPrivacidad = true
✓ perfilDetalle.consentimiento existe
✓ Timestamp guardado

Revisar:
1. ¿Marcó checkbox en paso 3?
2. ¿Se guardó (toast verde)?
3. ¿Aparece en Network request?
4. MySQL query:
   SELECT JSON_EXTRACT(perfilDetalle, 
     '$.consentimiento.aceptoAvisoPrivacidad')
   FROM candidates WHERE id = 57;
```

### Si cambios analista NO se ven (Paso 7)

```
Revisar:

1. ¿Se guardó el cambio en panel? (toast)
2. DevTools Network:
   → POST /api/trpc/workHistory.update → 200 OK?
3. ¿El trabajo tiene capturadoPor = "analista"?
   SQL: SELECT capturadoPor FROM workHistory 
        WHERE candidatoId = 57;
4. ¿Candidato hizo F5 en self-service?
```

---

## 📞 REPORTAR RESULTADOS

Después de completar la prueba, documentar:

```markdown
## Prueba E2E Candidato 57 - Resultados

**Fecha:** 23/12/2025
**Hora:** HH:MM
**Navegador:** Chrome/Firefox/Safari

### Estado Inicial
- Nombre: _______________
- Email: _______________
- % Completitud: _______

### Pasos Completados
- [x] Paso 1: Candidato abierto
- [x] Paso 2: Self-service abierto
- [x] Paso 3: Datos ingresados
- [x] Paso 4: Guardado OK (toast verde)
- [x] Paso 5: Panel reflejó cambios ✓
- [x] Paso 6: Analista editó
- [x] Paso 7: Candidato vio cambios ✓
- [x] Paso 8: Re-edición bidireccional ✓

### Errores Encontrados
(Ninguno / Listar)

### Conclusion
✅ SINCRONIZACIÓN BIDIRECCIONAL FUNCIONAL

[Adjuntar screenshots si hay problemas]
```

---

## 🚀 SIGUIENTES PASOS

Si la prueba es exitosa (todos los pasos PASS):
1. ✅ Sync está LISTO para producción
2. ✅ Documentar resultados en checkpoint
3. ✅ Comunicar a stakeholders

Si hay errores:
1. Documentar exactamente qué falla
2. Adjuntar DevTools screenshots
3. Revisar logs de servidor (Cloud Run)
4. Abrir issue técnico con detalles

---

**Checkpoint Base:** CHK_2025-12-23_FASE-4-PROBADA-E2E.md  
**Documentación:** GUIA-PRUEBA-E2E-SYNC.md  
**URL Panel:** https://integra-rh.web.app/candidatos/57

🎯 **¡Iniciando prueba manual!**
