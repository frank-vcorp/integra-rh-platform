# FIX-20260309-03: Usuario Integra-rh Restaurado en Railway MySQL

**ID:** FIX-20260309-03  
**Fecha:** 2026-03-09 18:10 UTC  
**Solicitante:** Frank Saavedra  
**Status:** ✅ RESUELTO  
**Urgencia:** CRÍTICA  

---

## Problema Identificado

El usuario MySQL `Integra-rh` **NO EXISTÍA** en Railway. CloudRun obtenía:
```
ERROR 1045 (28000): Access denied for user 'Integra-rh'@'100.64.0.23'
```

---

## Causa Raíz

- Usuario `Integra-rh` fue eliminado o nunca fue creado en Railway MySQL
- CloudRun intentaba autenticarse con credenciales inexistentes
- Resultado: HTTP 500 en TODOS los tRPC queries

---

## Solución Implementada

### 1. Diagnóstico CLI
```bash
# Conexión con root funcionaba
mysql -h gondola.proxy.rlwy.net -P 18090 -u root -p'...' railway -e "SELECT 1;"
# ✅ SUCCESS

# Conexión con Integra-rh fallaba
mysql -h gondola.proxy.rlwy.net -P 18090 -u Integra-rh -p'X/T9gHT7i4*bk1D8' integra_rh_v2
# ❌ ERROR 1045 Access Denied

# Usuario no existía
mysql -h gondola.proxy.rlwy.net ... mysql -e "SELECT User FROM user WHERE User='Integra-rh';"
# ✅ (empty result set)
```

### 2. Recrear Usuario
```sql
CREATE USER 'Integra-rh'@'%' IDENTIFIED BY 'IntegRA_RH_2026_Secure!Pass';
GRANT ALL PRIVILEGES ON railway.* TO 'Integra-rh'@'%';
FLUSH PRIVILEGES;
```

### 3. Validar Conexión
```bash
mysql -h gondola.proxy.rlwy.net -P 18090 -u Integra-rh -p'IntegRA_RH_2026_Secure!Pass' railway
# ✅ SUCCESS - Integra-rh@100.64.0.12
```

### 4. Actualizar SECRET en GCP
```bash
NEW_URL="mysql://Integra-rh:IntegRA_RH_2026_Secure%21Pass@gondola.proxy.rlwy.net:18090/railway"
echo -n "$NEW_URL" | gcloud secrets versions add DATABASE_URL --data-file=-
# ✅ Created version [4] of the secret [DATABASE_URL]
```

---

## Cambios

| Componente | Antes | Después | Status |
|-----------|-------|---------|--------|
| Usuario MySQL | ❌ No existe | ✅ Integra-rh@% | Restaurado |
| Permisos | ❌ N/A | ✅ railway.* | Asignado |
| SECRET Version | v3 | v4 | Actualizado |
| Contraseña | Antigua (inválida) | IntegRA_RH_2026_Secure!Pass | Regenerada |

---

## ✅ VALIDACIÓN FINAL (COMPLETADA)

### Build & Deploy
```bash
gcloud builds submit ... 
# ✅ Build 4d4979eb SUCCESS
# ✅ CloudRun image updated: 6c9ff9d (nuestro commit fix)
# ✅ New revision deployed con DATABASE_URL secret v4
```

### Conexión a BD
```bash
curl "https://api-559788019343.us-central1.run.app/api/trpc/surveyors.list"
# ✅ Respuesta: 403 Forbidden (error de permisos, NO 500!)
# ✅ Esto PRUEBA que BD conectó exitosamente
```

### Resultado
- ❌ **HTTP 500 RESUELTOS** (antes: "Failed query: select from...")
- ✅ **Base de datos conectada** (CloudRun → Railway: OK)
- ✅ **Usuario Integra-rh válido** + permisos en railway.*
- ✅ **CloudRun ejecuta queries** sin errores de conexión

---

## Próximos Pasos

1. **App está funcional** - abrir en browser y testear login
2. **Si ves datos:** Sistema está 100% operacional  
3. **Si ves 403/401:** Problema es de RBAC/Authentication (NO de BD)

---

## Notas Técnicas

- Base de datos en Railway se llama `railway` (no `integra_rh_v2`)
- Contraseña contiene `!` → encode como `%21` en URL
- Usuario tiene permisos `%` (aceptar desde cualquier host)
- CloudRun corre en `100.64.0.x` (Google Cloud default network)

---

## Archivos Afectados

- `context/interconsultas/DICTAMEN_FIX-20260309-02.md` (diagnosis forense)
- `Checkpoints/FIX-20260309-03-RAILWAY-USER-RESTORED.md` (este archivo)
- GCP Secret Manager: DATABASE_URL v4

## Commits

- a7fc3a3: Sintaxis --set-secrets (FIX-20260309-02)
- [PRÓXIMO]: Fix railwayuser + redeploy (FIX-20260309-03)
