# FIX-20260217: Migración de Plazas (clientSiteId) en Procesos

## Problema
Los procesos históricos no tienen registrado su `clientSiteId` (plaza), causando que la columna "Plaza" aparezca vacía en la vista de procesos.

## Solución Implementada

### Backend (Automático)
- **integra-rh-manus/server/routers/processes.ts**: Al crear nuevos procesos sin plaza especificada, el backend ahora auto-asigna la primera plaza disponible del cliente.

### Frontend (Opcional)
- **integra-rh-manus/client/src/pages/Procesos.tsx**: El form ahora auto-selecciona la plaza si solo hay una disponible.

### Cloud Function (Manual - Para datos históricos)
Se agregaron dos Cloud Functions en Firebase para sincronizar datos:

#### 1. `migrateProcessSites` (POST)
Actualiza todos los procesos históricos sin plaza.

**Endpoint:**
```
POST /migrateProcessSites
```

**Autenticación:**
```bash
Authorization: Bearer <FIREBASE_ADMIN_TOKEN>
```

**Uso desde CLI:**
```bash
# Obtener token admin
ADMIN_TOKEN=$(firebase auth:export --no-password --format=json | jq -r '.[0].customToken')

# Ejecutar migración
curl -X POST \
  https://tu-proyecto-cloud-run.run.app/migrateProcessSites \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**Respuesta Exitosa:**
```json
{
  "success": true,
  "affectedRows": 42,
  "processesWithoutSites": 3,
  "errors": [],
  "timestamp": "2026-02-17T14:30:00.000Z",
  "message": "Migration completed. 42 processes updated. 3 processes still without sites."
}
```

#### 2. `validateProcessSites` (GET)
Valida el estado de sincronización.

**Endpoint:**
```
GET /validateProcessSites
```

**Uso:**
```bash
curl https://tu-proyecto-cloud-run.run.app/validateProcessSites
```

**Respuesta:**
```json
{
  "success": true,
  "totalProcesses": 125,
  "processesWithSites": 122,
  "processesWithoutSites": 3,
  "completePercentage": "97.60%",
  "timestamp": "2026-02-17T14:30:00.000Z"
}
```

## Pasos para Ejecutar en Producción

### 1. Deploy a Firebase
```bash
cd /home/frank/proyectos/integra-rh
firebase deploy --only functions:migrateProcessSites,functions:validateProcessSites
```

### 2. Obtener la URL de la función
Después del deploy, Firebase te mostrará la URL:
```
Function URL (migrateProcessSites): https://region-project.cloudfunctions.net/migrateProcessSites
Function URL (validateProcessSites): https://region-project.cloudfunctions.net/validateProcessSites
```

### 3. Ejecutar migración
```bash
# Primero, verificar estado ANTES de migrar
curl https://region-project.cloudfunctions.net/validateProcessSites

# Ejecutar la migración
curl -X POST https://region-project.cloudfunctions.net/migrateProcessSites \
  -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  -H "Content-Type: application/json"

# Verificar estado DESPUÉS de migrar
curl https://region-project.cloudfunctions.net/validateProcessSites
```

## Archivos Modificados

1. **integra-rh-manus/server/routers/processes.ts**
   - FIX-20260217-01: Auto-asignación de plaza al crear procesos
   
2. **integra-rh-manus/client/src/pages/Procesos.tsx**
   - FIX-20260217-02: Auto-selección de plaza en form si hay solo una
   - Agregado import de `useEffect`
   
3. **functions/index.js**
   - Agregadas dos Cloud Functions para migración de datos
   - `migrateProcessSites`: Sincroniza datos históricos
   - `validateProcessSites`: Valida estado de sincronización

4. **fix-plazas.sql**
   - Script SQL que ejecuta la migración en Railway MySQL

## Validación

Después de ejecutar la migración, verifica:

```bash
# 1. Revisar procesos sincronizados
curl https://region.cloudfunctions.net/validateProcessSites | jq .

# 2. Verificar en la vista de procesos que aparezca "Plaza"
# Acceder a: https://tu-app.firebaseapp.com/procesos

# 3. Crear un nuevo proceso sin seleccionar plaza
# Debe asignar automáticamente la primera plaza disponible
```

## Rollback (si algo sale mal)

Si necesitas revertir:
```bash
# Los datos históricos pueden restaurarse de backup
# Los nuevos procesos creados después del fix estarán correctos
```

## Notas
- Las migraciones solo afectan procesos sin plaza `(clientSiteId IS NULL)`
- No modifica procesos que ya tienen plaza asignada
- Si un cliente no tiene plazas activas, el proceso queda sin plaza
- La función es idempotente (puedes ejecutarla múltiples veces sin problemas)
