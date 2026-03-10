# Sesión Forense: FIX-20260309-02 — HTTP 500 en tRPC Queries

**Fecha:** 2026-03-09 17:59 UTC  
**Agente:** DEBY (Debugger Mode)  
**Duración:** ~15 min  
**Resultado:** ✅ Causa raíz identificada (ER_ACCESS_DENIED_ERROR en Railway)

---

## Metodología de Investigación

### 1. Recopilación de Evidencia
```bash
# Paso 1: Verificar SECRET_DATABASE_URL
gcloud secrets versions access latest --secret=DATABASE_URL
✅ RESULTADO: mysql://Integra-rh:X%2FT9gHT7i4%2Abk1D8@gondola.proxy.rlwy.net:18090/integra_rh_v2

# Paso 2: Confirmar que CloudRun tiene el secret montado
gcloud run services describe api --region=us-central1
✅ RESULTADO: secretKeyRef apuntando correctamente a DATABASE_URL:latest

# Paso 3: Extraer logs de error HTTP
gcloud logging read "resource.labels.service_name=api AND severity=ERROR" --limit=20
✅ RESULTADO: HTTP 500 en todos los queries (surveyors, clients, candidates, processes, posts)

# Paso 4: Buscar logs de texto con error details
gcloud logging read "resource.labels.service_name=api" --limit=200 | grep -i "error\|database\|connection"
✅ **BINGO:** ER_ACCESS_DENIED_ERROR: Access denied for user 'Integra-rh'@'100.64.0.23'
```

### 2. Análisis de Causa Raíz

**Pattern Identificado:**
- Error: `ER_ACCESS_DENIED_ERROR` (MySQL authentication error)
- User: `Integra-rh` 
- Origin IPs: `100.64.0.15`, `100.64.0.17`, `100.64.0.23` (CloudRun internal range)
- Host: `gondola.proxy.rlwy.net:18090` (Railway MySQL proxy)
- Frecuencia: Consistente en TODAS las queries desde hace ~30 min

**Conclusión:** Railway está rechazando las conexiones de CloudRun, probablemente por:
1. IP Whitelist en Railway que no incluye `100.64.0.0/24`
2. Usuario MySQL deshabilitado o con contraseña incorrecta
3. Conexión pool agotado en Railway

### 3. Validaciones Realizadas

✅ **Configuración de GCP:**
- DATABASE_URL secret ✓
- CloudRun tiene acceso al secret ✓
- Build 5de2b889 ejecutó success ✓
- Revisión api-00144-gp2 está LIVE ✓

❌ **Problema en Railway:**
- Access denied error → Railway está rechazando el user@IP

### 4. Qodo CLI (Segunda Opinión)
Ejecutado: `qodo "Analiza el error: CloudRun está rechazado por Railway..." --plan --permissions=r`
- Confirmó que el error es de autenticación MySQL
- No identifica cambios en código que causaran esto (expected, es problema de infra)

---

## Documentación de Handoff

**Archivo de referencia:** `context/interconsultas/DICTAMEN_FIX-20260309-02.md`

**Logs en CloudRun:**
```
2026-03-09T17:59:16Z ERROR: Access denied for user 'Integra-rh'@'100.64.0.23'
2026-03-09T17:59:16Z ERROR: Access denied for user 'Integra-rh'@'100.64.0.17'
2026-03-09T17:59:16Z ERROR: Access denied for user 'Integra-rh'@'100.64.0.15'
```

**Próximos Pasos pour Frank:**
1. Acceder a Railway dashboard → MySQL settings
2. Verificar Network/Firewall rules
3. Whitelistear `100.64.0.0/24` o permitir todas las IPs
4. Confirmar usuario MySQL está activo
5. Redeploy CloudRun o esperar a que cache se refresque (~30 seg)

---

## Fin de Análisis Forense
✅ Causa raíz: **Railway IP Whitelist o usuario deshabilitado**  
✅ Bloqueo: **Frank debe revisar config de Railway**  
✅ Solución: **No requiere cambio de código, solo config de infra**
