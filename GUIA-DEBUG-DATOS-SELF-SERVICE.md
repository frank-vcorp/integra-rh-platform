# 🔍 GUÍA DE DEBUG - Rastreo de Datos de Self-Service

**Fecha:** 23 de diciembre de 2025  
**Objetivo:** Diagnosticar dónde se pierden los datos del formulario  
**Logs Añadidos:** Cliente + Servidor con nivel de detalle completo

---

## 📊 ARQUITECTURA DEL FLUJO

```
┌─────────────────────┐
│ CandidatoSelfService.tsx
│ (Cliente React)     │
└──────────┬──────────┘
           │
           │ getDraftPayload() → console.log 📦
           │
           ↓
┌─────────────────────┐
│ POST /api/candidate- │
│ save-full-draft    │
│ (REST endpoint)    │
└──────────┬──────────┘
           │
           │ Recibe → console.log 🔵
           │
           ↓
┌─────────────────────┐
│ Database Update    │
│ (MySQL)            │
└─────────────────────┘
```

---

## 🎯 PUNTOS DE RASTREO

### 1️⃣ **CLIENTE: handleManualSave()**

**Ubicación:** `client/src/pages/CandidatoSelfService.tsx` línea ~535

**Logs a Buscar:**
```
🔵 [CLIENT] handleManualSave iniciado
→ Cuando comienza guardado

🟢 [CLIENT] Datos guardados en localStorage
→ Qué datos se guardaron en navegador

📦 [CLIENT] Payload construido
→ Estructura del payload antes de enviar

🟡 [CLIENT] Enviando POST /api/candidate-save-full-draft
→ Datos exactos enviados al servidor

🟠 [CLIENT] Response status: 200
→ Confirmación de respuesta

✅ [CLIENT] Draft saved to BD successfully
→ Éxito (buscar esto en logs)

❌ [CLIENT] Draft save FAILED
→ Error (buscar esto si algo falla)
```

### 2️⃣ **SERVIDOR: /api/candidate-save-full-draft**

**Ubicación:** `server/_core/index.ts` línea ~158

**Logs a Buscar:**
```
🔵 [SERVER] /api/candidate-save-full-draft iniciado
→ Request llegó al servidor

🟢 [SERVER] Token validado
→ Token es válido, candidato identificado

📦 [SERVER] updatedPerfil construido
→ Estructura de datos a guardar

🟡 [SERVER] Actualizando candidato
→ Se va a hacer UPDATE en BD

✅ [SERVER] Candidato actualizado
→ UPDATE completado

📝 [SERVER] Procesando N registros de historial laboral
→ Se va a procesar work history

✅ [SERVER] Respuesta exitosa
→ Todo completado, respuesta enviada

❌ [SERVER] Error
→ Algo falló (ver message y stack)
```

---

## 🛠️ CÓMO VER LOS LOGS

### Opción 1: DevTools (Cliente)
```
1. Abrir navegador → https://integra-rh.web.app/candidatos/57
2. Presionar F12 → Console tab
3. Filtrar por "[CLIENT]" para ver solo logs del cliente
4. Llenar datos y click "Guardar borrador"
5. Observar secuencia:
   🔵 → 🟢 → 📦 → 🟡 → 🟠 → ✅
```

### Opción 2: Cloud Run Logs (Servidor)
```
# Si estás en Google Cloud:
gcloud beta run logs read integra-rh --limit 50 --follow

# Filtrar por [SERVER]:
gcloud beta run logs read integra-rh --limit 100 | grep "\[SERVER\]"
```

### Opción 3: Servidor Local (Dev)
```
# Terminal donde corre el servidor debe mostrar:
$ npm run dev
→ Verás logs en tiempo real
→ Busca: [CLIENT], [SERVER], error, ERROR
```

---

## 📋 CHECKLIST DE DEBUGGING

### ✅ ¿Los datos se envían desde cliente?
```
DevTools → Network tab
1. Click "Guardar borrador"
2. Buscar request: POST /api/candidate-save-full-draft
3. Hacer click
4. Ver "Request" tab → Preview
5. ¿Contiene los datos que llenaste?
   {
     "token": "...",
     "candidate": { "email": "...", "telefono": "..." },
     "perfil": {
       "generales": { "puestoSolicitado": "...", ... },
       "domicilio": { "calle": "...", ... }
     }
   }
```

### ✅ ¿El servidor recibe los datos?
```
Console log:
🔵 [SERVER] /api/candidate-save-full-draft iniciado
→ Si NO ves esto: problema de red
→ Si ves: servidor recibió la request
```

### ✅ ¿Se valida el token?
```
Console log:
🟢 [SERVER] Token validado
→ Si NO ves esto: token inválido/expirado
→ Si ves: procede al siguiente paso
```

### ✅ ¿Se actualiza la BD?
```
Console log:
✅ [SERVER] Candidato actualizado
✅ [SERVER] perfilDetalle actualizado
✅ [SERVER] Respuesta exitosa

→ Si ves TODO: datos en BD
→ Si NO: error en UPDATE (buscar ❌ [SERVER] Error)
```

---

## 🔴 ESCENARIOS DE ERROR

### Escenario 1: Client logs muestran éxito pero server logs no aparecen

```
❌ Síntoma:
   ✅ [CLIENT] Draft saved to BD successfully
   Pero NO hay logs 🔵 [SERVER]

🔍 Causa Probable:
   - Request no llegó al servidor
   - Network error (CORS, timeout)
   - Wrong endpoint URL

✅ Solución:
   1. DevTools → Network → buscar POST request
   2. ¿Status es 200? ¿O error (4xx, 5xx)?
   3. ¿URL es /api/candidate-save-full-draft?
   4. ¿Content-Type es application/json?
```

### Escenario 2: Server recibe pero no actualiza BD

```
❌ Síntoma:
   🔵 [SERVER] iniciado
   🟢 [SERVER] Token validado
   ❌ [SERVER] Error en /api/candidate-save-full-draft

🔍 Causa Probable:
   - BD no disponible
   - Estructura de datos incorrecta
   - SQL error

✅ Solución:
   1. Ver log completo: ❌ [SERVER] Error details
   2. Buscar message: ¿qué dice error?
   3. Verificar BD está accesible
   4. Revisar schema de candidates.perfilDetalle
```

### Escenario 3: Datos se guardan pero no aparecen al reabre

```
❌ Síntoma:
   ✅ [CLIENT] Draft saved
   ✅ [SERVER] Respuesta exitosa
   Pero al reabre: campos vacíos

🔍 Causa Probable:
   - getDraftPayload() envía datos vacíos
   - Merge en servidor no preserva estructura
   - localStorage sobrescribe BD

✅ Solución:
   1. Ver log: 📦 [CLIENT] Payload construido
   2. ¿payloadSize es grande (>100 bytes)?
   3. ¿perfilStructure tiene generales, domicilio, etc?
   4. ¿Todos los campos tienen || "" en getDraftPayload()?
```

---

## 📝 FORMATO DE LOGS

### Cliente (Colores)
```
🔵 AZUL     = Inicio/Inicio de operación
🟢 VERDE    = Éxito, datos guardados
🟡 AMARILLO = Acción en progreso
🟠 NARANJA  = Respuesta del servidor
✅ CHECK    = Operación exitosa
❌ ERROR    = Algo falló
```

### Servidor (Colores)
```
🔵 [SERVER] = Log de servidor
🟢 [SERVER] = Validación OK
📦 [SERVER] = Estructura de datos
🟡 [SERVER] = UPDATE en progreso
✅ [SERVER] = UPDATE exitoso
❌ [SERVER] = ERROR
```

---

## 🎯 PASOS PARA DIAGNOSTICAR

### 1. Abrir DevTools
```
URL: https://integra-rh.web.app/candidatos/57
F12 → Console tab
```

### 2. Buscar logs del cliente
```
Escribir en console: copy(document.body.innerText)
O filtrar por: [CLIENT]
```

### 3. Llenar formulario
```
- Puesto: "Test Desarrollador"
- NSS: "123456789"
- Domicilio: "Calle Test 123"
- ☑ Acepto términos
```

### 4. Click "Guardar borrador"
```
Observar sequence:
🔵 → 🟢 → 📦 → 🟡 → 🟠 → ✅
```

### 5. Verificar Network
```
Network tab → POST candidate-save-full-draft
→ Status 200?
→ Response { "ok": true }?
```

### 6. Buscar errores
```
Console → Filter: ERROR, error, ❌
¿Hay errores rojos?
```

### 7. Reabre y verifica
```
F5 (refresh)
¿Aparecen los datos?
¿O están vacíos?
```

---

## 💾 GUARDAR LOGS PARA REPORTE

```bash
# En DevTools Console:
console.log("=== INICIO DEBUG ===");
console.log("Timestamp:", new Date());
console.log("URL:", window.location.href);
console.log("Token:", localStorage.getItem('auth-token'));

# Luego copiar TODO el console y guardar en archivo:
# debug-logs-23-dic.txt
```

---

## 🚀 COMANDO PARA VER LOGS SERVIDORM(Dev Local)

```bash
cd /home/frank/proyectos/integra-rh/integra-rh-manus

# Terminal 1: Start dev server (see logs)
npm run dev

# Terminal 2: Trigger test
node scripts/test-e2e-candidato-57.mjs

# Terminal 1 mostrará todos los [SERVER] logs
```

---

## 📞 INFORMACIÓN A REPORTAR SI HAY ERROR

```markdown
## Reporte de Error - Datos No Se Guardan

**Fecha:** 23/12/2025
**Candidato:** 57
**Navegador:** Chrome 120

### Logs Cliente
```
[Copiar aquí los logs que ves en DevTools Console]
[Filtrado por [CLIENT]]
```

### Logs Servidor
```
[Copiar aquí los logs del servidor]
[Del terminal o Cloud Run]
```

### Network Request
```
POST /api/candidate-save-full-draft
Status: 200 / [Otro?]
Request Body: [Copiar estructura]
Response: [Copiar respuesta]
```

### Datos Esperados vs Reales
```
Datos que llenaste:
- Puesto: "..."
- NSS: "..."
- Domicilio: "..."

Datos que aparecen en BD:
- [Ver MySQL query]
```

### Conclusión
```
[Describar qué pasó exactamente]
[Dónde se pierden los datos]
[En qué punto de la arquitectura]
```
```

---

## ✅ VALIDACIÓN FINAL

Si después de agregar logs **TODOS** estos aparecen:
```
✅ 🔵 [CLIENT] handleManualSave iniciado
✅ 🟢 [CLIENT] Datos guardados en localStorage
✅ 📦 [CLIENT] Payload construido
✅ 🟡 [CLIENT] Enviando POST
✅ 🟠 [CLIENT] Response status: 200
✅ 🔵 [SERVER] /api/candidate-save-full-draft iniciado
✅ 🟢 [SERVER] Token validado
✅ ✅ [SERVER] Candidato actualizado
✅ ✅ [SERVER] Respuesta exitosa
```

→ **Data está llegando a BD correctamente**  
→ Si no aparece en panel, problema es en LECTURA (getByToken), no en guardado

---

**Checkpoint:** Logs agregados a código  
**Build:** Necesario ejecutar `npm run build`  
**Uso:** Ver devTools console mientras guardas

🔍 **¡Ahora podemos rastrear exactamente dónde se pierden los datos!**
