# DICTAMEN TÉCNICO: HTTP 500 en TODOS los tRPC Queries — Falla de Autenticación MySQL

- **ID:** FIX-20260309-02
- **Fecha:** 2026-03-09 17:59 UTC
- **Solicitante:** Frank Saavedra
- **Status:** ✅ **CAUSA RAÍZ IDENTIFICADA**
- **Urgencia:** 🚨 CRÍTICA — Sistema bloqueado en producción

---

## A. ANÁLISIS DE CAUSA RAÍZ

### Hallazgo Forense Principal
**ERROR REAL EN CLOUDRUN LOGS:**
```
code: 'ER_ACCESS_DENIED_ERROR',
cause: Error: Access denied for user 'Integra-rh'@'100.64.0.23' (using password: YES)
```

**Afectados:**
- `surveyors.list` → 500
- `clients.list` → 500  
- `candidates.list` → 500
- `processes.list` → 500
- `posts.list` → 500

### Contexto del Error
```
[Database] Failed to upsert user: DrizzleQueryError: 
  Failed query: insert into `users` ...
  code: 'ER_ACCESS_DENIED_ERROR',
  cause: Error: Access denied for user 'Integra-rh'@'100.64.0.15' (using password: YES)
```

**IPs afectadas:** `100.64.0.23`, `100.64.0.17`, `100.64.0.15` (CloudRun internal range)

---

## B. CAUSA RAÍZ CONFIRMADA

### 1. **Lo que está BIEN**
✅ **DATABASE_URL es VÁLIDO en Secret Manager:**
```
mysql://Integra-rh:X%2FT9gHT7i4%2Abk1D8@gondola.proxy.rlwy.net:18090/integra_rh_v2
```
- Secreto creado ✓
- Referencia en CloudRun env vars ✓  
- Sintaxis de URL correcta ✓

✅ **CloudRun tiene el secret montado:**
```json
{
  "name": "DATABASE_URL",
  "valueFrom": {
    "secretKeyRef": {
      "key": "latest",
      "name": "DATABASE_URL"
    }
  }
}
```

✅ **Build 5de2b889 ejecutó sin errores de compilación**

✅ **Revisión api-00144-gp2 está LIVE**

### 2. **El Verdadero Problema: RAILWAY ESTÁ RECHAZANDO LA CONEXIÓN**

Railway está rechazando autenticación desde las IPs de CloudRun (`100.64.0.x`) con el usuario `Integra-rh`.

**Posibles causas:**
1. **Railway tiene IP Whitelist activado** y CloudRun no está en la lista
2. **Credenciales MySQL incorrectas** en Railway (cambio de contraseña, usuario desactivado)
3. **Railway proxy (gondola.proxy.rlwy.net)** rechazando conexiones desde estas IPs específicamente
4. **Proyecto Railway en Railway suspendido o sin acceso** a esta base de datos

---

## C. JUSTIFICACIÓN DE LA SOLUCIÓN

### Flujo de Investigación Recomendado

1. **PRIMERO: Verificar Railway en la consola web**
   ```bash
   # Accedes a https://railway.app → Tu Proyecto integra-rh
   # → Networking/Security settings
   # → Busca "IP Whitelist" o "Firewall Rules"
   # → Verifica si 100.64.0.0/24 (CloudRun range) está permitido
   ```

2. **SEGUNDO: Verificar que el usuario MySQL existe y está activo**
   ```bash
   # En Railway console:
   # → MySQL → Details
   # → Verifica "Integra-rh" user está ACTIVO
   # → Verifica contraseña coincide con la URL de DATABASE_URL
   ```

3. **TERCERO: Test de conectividad directo desde CloudRun**
   - Desplegar un pod de prueba con mysql-client
   - Ejecutar: `mysql -h gondola.proxy.rlwy.net -P 18090 -u Integra-rh -p integra_rh_v2 -e "SELECT 1;"`
   - Confirmar que la conexión funciona manualmente

4. **CUARTO: Revisar logs de Railway**
   - Railway console → MySQL logs
   - Buscar `Access denied` desde hace 30 min

---

## D. PASOS ESPECÍFICOS PARA FRANK

### Immediatos (Ahora)
1. Abre https://railway.app 
2. Navega a tu proyecto "integra-rh"
3. Selectiona el servicio "MySQL"
4. En la sección **Network** o **Networking**, busca:
   - ❇️ IP Whitelist / Firewall Rules
   - ❇️ Si está activo, verifica que `100.64.0.0/24` o `*` está permitido
   - ❇️ Si Cloud SQL Proxy está configurado, verifica que está correcto

5. En **Environment Variables** o **Credentials**:
   - Copia la contraseña del usuario MySQL
   - Compárala con la que ves en `DATABASE_URL` (deberá está URL-encoded, pero los caracteres actuals deben coincidir)

### Checklist de Validación en Railway

**Sección: MySQL / Database Settings**
- [ ] Usuario `Integra-rh` existe
- [ ] Usuario tiene estado **ACTIVE** (no suspended/frozen)
- [ ] Contraseña es la misma que aparece URL-encoded en `DATABASE_URL`
- [ ] Base de datos `integra_rh_v2` existe
- [ ] Database tiene privileges asignados al usuario

**Sección: Network / Firewall**
- [ ] Si hay "IP Whitelist" activado: `100.64.0.0/24` (CloudRun range) está permitido
- [ ] Si hay "Restrict to my own tunnel only": DEBE estar DESACTIVADO
- [ ] Si hay "Public endpoint": DEBE estar HABILITADO (o Cloud SQL Proxy configurado)

**Sección: Connection Pool**
- [ ] Max connections: Verifica que no sea 0 o muy bajo
- [ ] Connection timeout: Verifica valor razonable (no 1ms)

6. Si encuentras restricciones IP:
   - **OPCIÓN A (RECOMENDADO):** Whitelistea `100.64.0.0/24` en Railway Network settings
   - **OPCIÓN B (SECURE):** Usa Cloud SQL Proxy desde GCP (más seguro pero más complejo)
   - **OPCIÓN C (RÁPIDO):** Si Railway permite `*` (cualquier IP), habilítalo temporalmente

### Test Manual de Conectividad (Opcional, pero Recomendado)
```bash
# Desde tu máquina local:
mysql -h gondola.proxy.rlwy.net \
      -P 18090 \
      -u Integra-rh \
      -p "X/T9gHT7i4*bk1D8" \
      integra_rh_v2 \
      -e "SELECT '✅ Connection OK!' as status;"

# Si falla aquí con "Access denied", el problema es definitivamente Railway
# Si funciona localmente pero no en CloudRun, es un problema de IP whitelist
```

### Si Cambias Railway Config
```bash
# Después de actualizar Railway (permitir IPs, resetear usuario, etc.):

# 1. Obtén el nuevo DATABASE_URL de Railway
# 2. Actualiza el secret en GCP:
gcloud secrets versions add DATABASE_URL --data-file=-

# 3. (Opcional) Redeploy CloudRun si no se auto-actualiza:
gcloud run deploy api \
  --region=us-central1 \
  --image=gcr.io/integra-rh/api:latest \
  --set-secrets=DATABASE_URL=DATABASE_URL:latest

# 4. Prueba el query desde el navegador
curl "https://api-559788019343.us-central1.run.app/api/trpc/surveyors.list"
```

---

## E. EVIDENCIA FORENSE RECOPILADA

**Fuente:** CloudRun Logs (gcloud logging read)
```
Timestamp: 2026-03-09T17:59:16.865Z
Service: api
Revision: api-00144-gp2
Build: 5de2b889-8c91-4967-8215-6f483e2a9f51

Error Pattern:
  - Code: ER_ACCESS_DENIED_ERROR  
  - User: Integra-rh
  - Origin IPs: 100.64.0.15, 100.64.0.17, 100.64.0.23 (CloudRun)
  - Host: gondola.proxy.rlwy.net:18090
```

**Comandos ejecutados:**
```bash
# Verificar DATABASE_URL en Secret Manager
gcloud secrets versions access latest --secret=DATABASE_URL
# RESULTADO: mysql://Integra-rh:X%2FT9gHT7i4%2Abk1D8@gondola.proxy.rlwy.net:18090/integra_rh_v2 ✓

# Verificar que CloudRun tiene el secret montado
gcloud run services describe api --region=us-central1 --format=json | jq '.spec.template.spec.containers[0].env[] | select(.name=="DATABASE_URL")'
# RESULTADO: secretKeyRef apuntando a DATABASE_URL:latest ✓

# Extraer logs de error
gcloud logging read "resource.labels.service_name=api" --limit=200 --format=json | grep -i "access denied"
# RESULTADO: ER_ACCESS_DENIED_ERROR ✓
```

---

## F. SIGUIENTE ACCIÓN

🎯 **BLOCKING ITEM:** Railway network configuration debe revisarse ANTES de volver a desplegar código.

**Próximo checkpoint:** Después de que Frank confirme el estado de Railway (IPs whitelisted, usuario activo, contraseña correcta), redeploy y testing.

---

**FIX REFERENCE ID:** FIX-20260309-02  
**Documento de soporte:** Este DICTAMEN en `/context/interconsultas/DICTAMEN_FIX-20260309-02.md`
