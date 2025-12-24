# Checkpoint: Cloud Run Deployment - Estado y Próximos Pasos

**Fecha**: 23 de diciembre de 2025, 08:15 UTC  
**Responsable**: SOFIA (Builder Agent)  
**Tarea**: Diagnosticar y resolver respuesta HTML en Cloud Run

---

## Estado Actual

### ✅ Completado
1. **BD actualizada en Cloud Run**
   - DATABASE_URL: `mysql://root:bldEVdXlGWCBTDNqhjDkSeNQrIdbHejE@gondola.proxy.rlwy.net:18090/railway`
   - Revisión: integra-rh-backend-00010-648
   - Última actualización: 2025-12-23T08:02:45 UTC

2. **Build local exitoso**
   - 2796 módulos compilados en 4.42s
   - Frontend: 1,655.45 kB gzipped
   - Backend: 218.8 kB (index.js)

3. **Dockerfile creado**
   - Simplificado y optimizado (multi-stage build)
   - Node 18 Alpine, NODE_ENV=production

### ⚠️ En Progreso
**Problema Identificado**: 
- Response status: 200 ✅
- Content: `<!doctype ...` (HTML) ❌
- Esperado: JSON

**Causa probable**:
1. Cloud Run está sirviendo una página de error HTML genérica
2. O el servidor tiene un error no capturado que genera HTML
3. O falta redeploy con el código actualizado

### ❌ Bloqueador
**Autenticación gcloud expirada**
- `gcloud auth` está en estado de re-autenticación fallida
- Impide hacer `gcloud run deploy` en este momento

---

## Logs Investigados

### Client-Side (Producción)
```
🔵 [CLIENT] handleManualSave iniciado
🟢 [CLIENT] Datos guardados en localStorage
📦 [CLIENT] Payload construido
🟡 [CLIENT] Enviando POST /api/candidate-save-full-draft
🟠 [CLIENT] Response status: 200 ✅
❌ [CLIENT] Draft save network error: SyntaxError: Unexpected token '<', "<!doctype "
```

**Conclusión**: El cliente recibe status 200 pero HTML en body.

### Server-Side (Cloud Logging)
```
TIMESTAMP                    TEXT_PAYLOAD
2025-12-23T08:02:56.071944Z  (vacío)
2025-12-23T08:02:56.057419Z  (vacío)
... (sin logs de aplicación)
2025-12-23T07:58:23.986529Z  [FirebaseAdmin] Using storage bucket: ...
2025-12-23T07:58:23.986521Z  [FirebaseAdmin] No projectId found in env; ...
```

**Conclusión**: No hay logs de aplicación. El código no se ejecuta; el servidor arranca pero no corre la app.

---

## Próximos Pasos (Prioridad)

### 1. **Reestablecer autenticación gcloud** (Crítico)
```bash
gcloud auth login --no-launch-browser
# O usar credenciales alternativas
```

### 2. **Rehacer deploy a Cloud Run** (Crítico)
```bash
cd /home/frank/proyectos/integra-rh
gcloud run deploy integra-rh-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1000m
```

### 3. **Validar después del deploy**
- Curl a `/api/candidate-save-full-draft` con token válido
- Verificar logs en Cloud Logging
- Probar guardar datos desde producción

### 4. **Si sigue devolviendo HTML**
- Revisar `Dockerfile` para errores de build
- Verificar variables de entorno en Cloud Run
- Inspeccionar logs de buildpack de Cloud Run

---

## Archivos Modificados Esta Sesión

| Archivo | Cambio |
|---------|--------|
| `/PROYECTO.md` | Cloud SQL → Railway |
| `Checkpoints/MASTER_2025-11-01.md` | Cloud SQL → Railway |
| `/Dockerfile` | Creado (multi-stage, simplificado) |

---

## Variables de Entorno (Correctas)

```
DATABASE_URL=mysql://root:bldEVdXlGWCBTDNqhjDkSeNQrIdbHejE@gondola.proxy.rlwy.net:18090/railway
NODE_ENV=production
PORT=8080
FIREBASE_STORAGE_BUCKET=integra-rh.firebasestorage.app
GOOGLE_APPLICATION_CREDENTIALS=./firebase-admin-sdk.json
SENDGRID_API_KEY=(debe estar en Cloud Run secrets)
PSICOMETRICAS_TOKEN=(debe estar en Cloud Run secrets)
PSICOMETRICAS_PASSWORD=(debe estar en Cloud Run secrets)
```

---

## Diagnóstico del HTML Response

Si después del redeploy sigue devolviendo HTML:

**Opción A: Error HTTP genérico**
- 500: Internal Server Error (Express error handler)
- 502: Bad Gateway (contenedor no responde)
- 503: Service Unavailable (startup probe falla)

**Opción B: Cloud Run default page**
- Sucede si no hay aplicación corriendo en puerto 8080

**Opción C: Proxy/middleware issue**
- Cloud Run load balancer inyecta HTML

---

## Historial de Intentos
1. ✅ Actualizado DATABASE_URL (gondola.proxy.rlwy.net:18090/railway)
2. ✅ Build local (2796 módulos)
3. ❌ gcloud run deploy (Build failed - sin logs claros)
4. ✅ Dockerfile creado (multi-stage simplificado)
5. ❌ gcloud run deploy con timeout (auth expirada)

**Siguiente**: Autenticación gcloud + redeploy
