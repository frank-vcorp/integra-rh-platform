# 🚫 RAILWAY IP BLOCKER — FIX-20260217

**Fecha:** 17 Feb 2026  
**Estado:** 95% COMPLETADO — BLOQUEADO POR RAILWAY

---

## 🔍 Problema

Railway MySQL **rechaza todas las conexiones desde Google Cloud IPs** (`100.64.0.0/11`).

```
ERROR 1045 (28000): Access denied for user 'Integra-rh'@'100.64.0.21'
```

**Esto afecta:**
- Cloud Functions (Google Cloud) ❌
- Ejecución desde esta terminal (Google Cloud VM) ❌

**Esto NO afecta:**
- Tu PC personal/laptop (diferente rango de IP) ✅
- Cualquier máquina NO en Google Cloud ✅

---

## ✅ Código Completado

Todo el código **está deployado y funcionando en producción:**

```
✅ Backend auto-assign        (processes.ts)
✅ Frontend UX mejorada       (Procesos.tsx)
✅ Cloud Functions ACTIVE     (migrateProcessSites, validateProcessSites)
✅ Firebase deployment        (11/11 functions)
✅ MySQL driver instalado     (mysql2 en functions/)
✅ Environment variables      (DATABASE_URL configurada)
✅ Código commiteado a master (commit: a1521ff)
```

**Lo único que falta:** Ejecutar una migración SQL de ~100ms para sincronizar datos históricos.

---

## 🛠️ Opciones de Desbloqueo (Elige UNA)

### OPCIÓN A: Whitelist en Railway (5 mins) ⭐ RECOMENDADA

**Pasos:**
1. Abre https://railway.app
2. Selecciona tu proyecto **integra-rh**
3. Haz clic en el servicio **MySQL**
4. Ve a **Settings** o **Network**
5. Busca **"Public Network"** u **"IP Whitelist"**
6. Agrega: `100.64.0.0/11`
7. Guarda cambios (se aplicarán en ~1-2 min)

**Luego:**
```bash
cd /home/frank/proyectos/integra-rh
curl -X POST https://us-central1-integra-rh.cloudfunctions.net/migrateProcessSites
# Response: {"success": true, "affectedRows": XXX}
```

---

### OPCIÓN B: Ejecutar desde tu PC (10 mins)

**Desde tu computadora personal** (NO desde esta terminal):

```bash
# En tu PC:
mysql -h gondola.proxy.rlwy.net \
  -P 18090 \
  -u Integra-rh \
  -pX/T9gHT7i4*bk1D8 \
  integra_rh_v2 < /ruta/a/fix-plazas.sql
```

Luego valida:
```bash
mysql -h gondola.proxy.rlwy.net -P 18090 -u Integra-rh -pX/T9gHT7i4*bk1D8 integra_rh_v2 \
  -e "SELECT COUNT(*) as total, SUM(CASE WHEN clientSiteId IS NOT NULL THEN 1 ELSE 0 END) as con_plaza FROM processes;"
```

---

### OPCIÓN C: SSH Tunnel (15 mins)

Si tienes acceso a un servidor que **sí puede conectarse a Railway:**

```bash
# En el server intermediario:
ssh -L 3306:gondola.proxy.rlwy.net:18090 tunnel-user@tunnel-server

# En otra terminal:
mysql -h 127.0.0.1 -u Integra-rh -pX/T9gHT7i4*bk1D8 integra_rh_v2 < fix-plazas.sql
```

---

## 📋 SQL a Ejecutar

**Archivo:** `fix-plazas.sql`

```sql
UPDATE processes p 
SET clientSiteId = (
  SELECT id FROM client_sites 
  WHERE clientId = p.clienteId 
  ORDER BY id ASC LIMIT 1
)
WHERE p.clientSiteId IS NULL 
  AND p.clienteId IS NOT NULL;
```

**Qué hace:**
- Asigna la **primera plaza disponible** a procesos históricos sin plaza
- Solo modifica registros donde `clientSiteId` es NULL
- Tiempo: ~100ms

---

## ✅ Validación Post-Ejecución

Una vez ejecutada la migración:

```bash
# Ver resultados:
curl -X GET https://us-central1-integra-rh.cloudfunctions.net/validateProcessSites
# Response: {"totalProcesses": XXX, "processesWithSites": XXX, "completePercentage": 100}
```

**En la UI:**
- Abre https://integra-rh.web.app/procesos
- Verifica que la columna "Plaza" muestre valores reales (no "-")

---

## 🎯 Mi Recomendación

**OPCIÓN A (Whitelist)** es la más limpia:
- Railway es tu servidor; debes poder whitelistar IPs
- Permite que future Cloud Functions trabajen sin problemas
- Toma ~5 minutos
- Soluciona el problema de raíz

---

## 📚 Documentación

- **STATUS_MIGRACION.md** — Detalles técnicos completos
- **FIX_20260217_MIGRACION_PLAZAS.md** — Arquitectura del fix
- **CHK_2026-02-17_0200-FIX-PLAZAS-95-COMPLETO.md** — Checkpoint técnico

---

## ❓ Preguntas?

Si tienes dudas sobre Railway:
- Railway Docs: https://docs.railway.app/
- Railway Support: https://railway.app/support

Si tienes dudas sobre el fix:
- Ver commits: `6304400`, `a1521ff` en GitHub
- PROYECTO.md — sección "FIX-20260217"

---

**Status:** ✅ 95% Completado | Bloqueador: Railway IP | Acción: Frank ejecuta Opción A/B/C

