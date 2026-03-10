# LECCIÓN APRENDIDA: HTTP 500 en Database Queries — Incident FIX-20260309

**Fecha:** 2026-03-09  
**Duración:** ~3 horas (50 min + 40 min + 90 min)  
**Root Cause:** Usuario MySQL eliminado en Railway  
**Status:** ✅ RESUELTO  

---

## Cronología (para evitar próximas veces)

### Paso 1: Diagnóstico Local (10 min) ✅
```bash
# SIEMPRE: Probar credenciales localmente ANTES de asumir que GCP está mal
mysql -h gondola.proxy.rlwy.net -P 18090 -u Integra-rh -p'PASSWORD' DATABASE
# → ERROR 1045: Access denied
# Conclusión: No es problema de GCP, es de Railway/credenciales
```

### Paso 2: Verificar Usuario Existe (5 min) ⏭️
```bash
mysql -h ... -u root -p'ROOT_PASSWORD' mysql
SELECT User FROM user WHERE User='Integra-rh';
# → Si no devuelve nada, usuario NO EXISTE
```

### Paso 3: Recrear (2 min) 🔧
```sql
CREATE USER 'Integra-rh'@'%' IDENTIFIED BY 'NewPassword123!';
GRANT ALL PRIVILEGES ON railway.* TO 'Integra-rh'@'%';
FLUSH PRIVILEGES;
```

### Paso 4: Actualizar SECRET en GCP (2 min) 🔐
```bash
NEW_URL="mysql://Integra-rh:NewPassword%21@gondola.proxy.rlwy.net:18090/railway"
echo -n "$NEW_URL" | gcloud secrets versions add DATABASE_URL --data-file=-
```

### Paso 5: Redeploy CloudRun (5 min) 🚀
```bash
gcloud builds submit --no-source --config=cloudbuild.yaml
```

---

## ¿Qué salió mal?

**Hipótesis más probable:** Alguien limpió la BD de Railway o la recreó sin recrear los usuarios personalizados.

**Los únicos usuarios que quedaron:** `root` (y usuarios de sistema MySQL)

---

## 🚀 Checklist para Futuros Debuggeos

```
[ ] 1. Probar credenciales LOCALMENTE (no asumir que es GCP)
[ ] 2. Verificar que usuario existe en la BD (SELECT FROM mysql.user)
[ ] 3. Verificar que usuario tiene permisos en la DB correcta (SHOW GRANTS)
[ ] 4. Testear endpoint con Identity Token (no sin autenticación)
[ ] 5. Revisar CloudRun logs, no solo el error en el navegador
[ ] 6. URL-encode password si tiene caracteres especiales (%21 para !)
[ ] 7. Redeploy CloudRun después de cambiar secretos
```

---

## Lecciones para Arquitectura

1. **No hardcodear secretos en código** ✅ (ya lo hacemos)
2. **Documentar estado de usuarios en Railway** ❌ (falta)
3. **Tener usuario `deployer` separado de `app-user`** ❌ (falta)
4. **Backup de credenciales en lugar seguro** ❌ (falta)
5. **Monitoring de failed auth attempts en CloudRun** ❌ (falta)

---

## Estado Actual

- ✅ CloudRun conecta a Railway MySQL
- ✅ Usuario `Integra-rh` existe y tiene permisos
- ✅ APP está funcional (400+ no vuelven en logs)
- ✅ Base de datos responde a queries

**Next:** Testear en browser y validar que RBAC/Auth funciona normalmente.

---

## Archivos Generados

- `Checkpoints/FIX-20260309-03-RAILWAY-USER-RESTORED.md`
- `context/interconsultas/DICTAMEN_FIX-20260309-02.md` (análisis forense Deby)
- Commits: a7fc3a3, 6c9ff9d, 9447d23

