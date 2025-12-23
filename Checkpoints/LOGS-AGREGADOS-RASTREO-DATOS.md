# 🔍 LOGS AGREGADOS - Rastreo de Datos Self-Service

**Status:** ✅ Logs implementados y compilados  
**Build:** ✅ 2796 modules, 4.55s  
**Commit:** 955837d

---

## 🎯 QUÉ SE AGREGÓ

Se añadieron **24 puntos de rastreo** para seguir exactamente dónde van los datos:

### Cliente (CandidatoSelfService.tsx)
✅ **9 logs** en función `handleManualSave()`
```
🔵 handleManualSave iniciado
🟢 Datos guardados en localStorage
📦 Payload construido
🟡 Enviando POST /api/candidate-save-full-draft
🟠 Response status recibido
✅ Draft saved successfully
❌ Draft save FAILED (si hay error)
```

### Servidor (server/_core/index.ts)
✅ **15 logs** en endpoint `/api/candidate-save-full-draft`
```
🔵 Endpoint iniciado (token, datos)
🟢 Token validado (candidateId)
📦 perfilDetalle construido
🟡 Actualizando candidato
✅ Candidato actualizado
✅ perfilDetalle actualizado
📝 Procesando historial laboral
🔄 Actualizando trabajo existente
✅ Trabajo actualizado
➕ Insertando nuevo trabajo
✅ Trabajo insertado
✅ Respuesta exitosa (status 200)
❌ Error (si algo falla)
```

---

## 🎬 CÓMO USAR

### 1. Abrir DevTools (F12)
```
URL: https://integra-rh.web.app/candidatos/57
F12 → Console tab
```

### 2. Llenar formulario
```
Puesto Solicitado: "Test Dev"
NSS: "123456789"
Domicilio: "Calle Test 123"
☑ Acepto términos
```

### 3. Click "Guardar borrador"
```
Observar logs en tiempo real:
🔵 → 🟢 → 📦 → 🟡 → 🟠 → ✅
```

### 4. Verificar dónde termina la cadena
```
Si logs llegan hasta ✅ [SERVER] Respuesta exitosa
→ Datos SÍ se guardaron en BD

Si se detiene en mitad:
→ Hay problema en ese punto
```

---

## 📊 SECUENCIA ESPERADA (ÉXITO)

```
🔵 [CLIENT] handleManualSave iniciado { token: "abc..." }
🟢 [CLIENT] Datos guardados en localStorage { email: "...", telefono: "..." }
📦 [CLIENT] Payload construido { payloadSize: 2847 bytes }
🟡 [CLIENT] Enviando POST /api/candidate-save-full-draft { ... }
🟠 [CLIENT] Response status: 200
✅ [CLIENT] Draft saved to BD successfully { ok: true }

[En servidor, simultáneamente]

🔵 [SERVER] /api/candidate-save-full-draft iniciado { token: "abc...", candidateId: 57 }
🟢 [SERVER] Token validado { candidateId: 57, email: "..." }
📦 [SERVER] updatedPerfil construido { generalesKeys: [...], consentimiento: {...} }
🟡 [SERVER] Actualizando candidato { candidateId: 57, email: "..." }
✅ [SERVER] Candidato actualizado { candidateId: 57 }
📝 [SERVER] Procesando 1 registros de historial laboral { candidateId: 57 }
✅ [SERVER] Respuesta exitosa { candidateId: 57, status: 200 }
```

**Resultado:** Todos los logs → Datos guardados correctamente

---

## ❌ ESCENARIOS DE ERROR

### Si SOLO ves logs del cliente
```
✅ [CLIENT] Draft saved to BD successfully

❌ Pero NO ves logs [SERVER]:
   🔵 [SERVER] /api/candidate-save-full-draft iniciado

Problema:
→ Request no llegó al servidor
→ CORS error, timeout, o URL incorrecta

Verificar:
1. DevTools Network tab
2. POST request a /api/candidate-save-full-draft
3. Status 200 o error (4xx, 5xx)?
```

### Si ves logs [SERVER] pero se detiene en mitad
```
🔵 [SERVER] /api/candidate-save-full-draft iniciado
🟢 [SERVER] Token validado
❌ [SERVER] Error en /api/candidate-save-full-draft
     message: "Database connection failed"

Problema:
→ BD no disponible o error SQL

Verificar:
1. Ver error message completo
2. BD está corriendo?
3. permisos en tabla candidates?
```

### Si datos NO aparecen al reabre
```
✅ [SERVER] Respuesta exitosa { status: 200 }

Pero datos vacíos al refrescar:
❌ Problema está en lectura, no en guardado

Verificar:
1. candidateSelf.getByToken() trae datos?
2. useState restaura desde BD?
3. localStorage sobrescribe?
```

---

## 📝 INFORMACIÓN CLAVE EN CADA LOG

| Log | Información Útil |
|-----|------------------|
| `🔵 handleManualSave` | Token, validación inicial |
| `🟢 localStorage` | Qué datos se guardaron localmente |
| `📦 Payload` | Tamaño, estructura, campos presentes |
| `🟡 Enviando POST` | Datos exactos enviados al servidor |
| `🟠 Response status` | ¿200 OK o error? |
| `🔵 [SERVER] iniciado` | Token recibido, candidateId identificado |
| `🟢 Token validado` | Email, id confirmados |
| `📦 updatedPerfil` | Estructura a guardar en BD |
| `🟡 Actualizando` | Qué candidato se actualiza |
| `✅ Respuesta exitosa` | Confirmación final: datos en BD |

---

## 🎯 PUNTOS DE SOSPECHA

Si ves estos logs pero sin los esperados, revisa:

1. **Falta 🔵 [CLIENT] handleManualSave**
   → ¿Se hizo click en "Guardar borrador"?

2. **Falta 📦 [CLIENT] Payload**
   → ¿getPayload() retorna datos?

3. **Falta 🟡 [CLIENT] Enviando POST**
   → ¿Hay error en fetch()?

4. **Falta 🔵 [SERVER] iniciado**
   → ¿Request no llegó al servidor?

5. **Falta 🟢 [SERVER] Token validado**
   → ¿Token inválido o expirado?

6. **Falta ✅ [SERVER] Candidato actualizado**
   → ¿Error en DATABASE UPDATE?

7. **Ves ✅ pero datos NO aparecen al reabre**
   → ¿Problema en candidateSelf.getByToken()?

---

## 🔧 COMANDO RÁPIDO (DEV LOCAL)

Si estás corriendo servidor localmente:

```bash
# Terminal 1: Ver logs en tiempo real
cd /home/frank/proyectos/integra-rh/integra-rh-manus
npm run dev

# Terminal 2: Triggear prueba
node scripts/test-e2e-candidato-57.mjs

# Terminal 1 mostrará:
🔵 [SERVER] /api/candidate-save-full-draft iniciado
🟢 [SERVER] Token validado
✅ [SERVER] Respuesta exitosa
(todos los logs)
```

---

## ✅ CHECKLIST ANTES DE REPORTAR ERROR

- ✅ Abriste DevTools (F12)
- ✅ Llenaste formulario completo
- ✅ Hiciste click en "Guardar borrador"
- ✅ Esperaste a que aparezca toast
- ✅ Copiate los logs de console
- ✅ Verificaste Network tab (status?)
- ✅ Buscaste si hay ❌ o ERROR en rojo

---

## 📞 CUANDO REPORTAR BUG

Si después de revisar los logs **falta alguno de estos**, reporta:

```
Falta log: [Cuál exactamente?]
Último log visto: [Cuál es?]
Error visible: [Si hay, cuál?]
Status HTTP: [200, 400, 500, timeout, etc?]
Reproducibilidad: [Primera vez, siempre, a veces?]
```

---

**Commit:** 955837d  
**Build:** ✅ 2796 modules, 4.55s  
**Documentación:** `GUIA-DEBUG-DATOS-SELF-SERVICE.md`

🔍 **Ahora puedes ver exactamente dónde van los datos!**
