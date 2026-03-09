# DICTAMEN TÉCNICO: Errores 500 Críticos en Queries tRPC — ProcesoDetalle

- **ID:** FIX-20260309-01
- **Fecha:** 2026-03-09
- **Solicitante:** Frank Saavedra (Escalamiento desde Sistema de Monitoreo)
- **Estado:** 🔍 PENDIENTE DE INVESTIGACIÓN FORENSE
- **Urgencia:** 🚨 CRÍTICA — Sistema bloqueado en producción

---

## A. REPORTE DE ERRORES EN PRODUCCIÓN

### Síntomas Principales
1. **HTTP 500 en acceso a ProcesoDetalle**
2. **5 queries tRPC fállando simultáneamente** con parámetros malformados:
   - `surveyors.list` (input: `{ clientId: null }`, meta.values: `["undefined"]`)
   - `clients.list` (input: `{ clientId: null }`, meta.values: `["undefined"]`)
   - `candidates.list` (input: `{ clientId: null }`, meta.values: `["undefined"]`)
   - `processes.list` (input: `{ clientId: null }`, meta.values: `["undefined"]`)
   - `posts.list` (input: `{ clientId: null }`, meta.values: `["undefined"]`)

### Error Primario (Server Logs)
```sql
select `id`, `nombre`, `telefono`, `email`, `cobertura`, `ciudadBase`, 
       `estadosCobertura`, `radioKm`, `vehiculo`, `tarifaLocal`, `tarifaForanea`, 
       `notas`, `activo`, `createdAt`, `updatedAt` 
from `surveyors` order by `surveyors`.`nombre` asc
```
**Estado:** Query sintácticamente válida pero falla en ejecución (HTTP 500).

### Error Secundario (Client Console/Network)
```
ReferenceError: baseTipo is not defined
at CandidatoFormularioIntegrado.tsx:248-256
```
**Nota:** `baseTipo` SÍ está definido (línea 60 como `useState<ProcesoBaseType>("ILA")`).
Esta inconsistencia sugiere que es síntoma, no causa raíz.

---

## B. ANÁLISIS TÉCNICO PRELIMINAR

### 1. Estado del Código (Inspección Estática)
✅ **Código aparentemente correcto:**
- `surveyorsRouter.list` → `adminProcedure` + `requirePermission("encuestadores", "view")` ✓
- `clientsRouter.list` → `protectedProcedure` + `requirePermission("clientes", "view")` ✓
- `candidatesRouter.list` → `publicProcedure` con lógica de fallback ✓
- `processesRouter` → Métodos con permisos definidos ✓
- `postsRouter` → Métodos con permisos definidos ✓
- **index.ts** → Todos los routers correctamente exportados ✓

### 2. Patrón de Fallo Observado - **PUNTO CRÍTICO HALLADO**
```
ORIGEN CONFIRMADO: ProcesoDetalle.tsx líneas 193-199

const { data: clients = [] } = trpc.clients.list.useQuery();           // ← Sin parámetros
const { data: candidates = [] } = trpc.candidates.list.useQuery();     // ← Sin parámetros
const { data: posts = [] } = trpc.posts.list.useQuery();               // ← Sin parámetros
const { data: users = [] } = trpc.users.list.useQuery(undefined, ...); // ← Con undefined explícito
const { data: allProcesses = [] } = trpc.processes.list.useQuery(...); // ← Con undefined explícito

BATCH REQUEST GENERADO:
- 5 queries simultáneas sin parámetros → input=null
- meta.values=["undefined"] ← Por los parámetros vacíos
- Se lanzan al renderizar ProcesoDetalle
- Todas fallan con HTTP 500 (no es problema de permiso, que sería 401/403)
```

**Observación de Patrón:**
├─ 4 de 5 requieren permisos específicos (via requirePermission middleware)
├─ 3 de 5 están protegidos (adminProcedure, protectedProcedure)
├─ Todos se lanzan en batch request simultáneamente
├─ El hecho de ser HTTP 500 (no 401/403) sugiere error EN LA QUERY DE BD
└─ No es error de autenticación, sino de ejecución SQL

### 3. Hipótesis Finales (Re-evaluadas post-análisis)

#### 🔴 CRÍTICA - PRIMARY SUSPECT: DATABASE_URL Missing o Mal Configurada
**Evidencia:**
- `getDb()` retorna `null` si `DATABASE_URL` no está definido
- Los 5 routers usan funciones que llamna `getDb()` implícitamente
- Si BD no está disponible, funciones retornan `[]` sin error
- Pero el middleware tRPC podría interpretar esto como error serialización

**ROOT CAUSE LIKELY:**
```bash
# En producción (Railway), DATABASE_URL podría no estar disponible:
1. Variable de entorno no pasada correctamente al container
2. Pool de conexión MySQL agotado (max connections)
3. Railway BD caída o en mantenimiento
4. Credenciales expiradas o revocadas
```

**PASOS PARA VERIFICAR (DEBY):**
```bash
# En el pod en producción:
kubectl exec -it deployment/integra-api -- bash
env | grep DATABASE_URL
echo $DATABASE_URL  # Debe mostrar jdbc:mysql://... válido

# Probar conexión directo a BD:
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD -e "SELECT 1;"

# Ver logs de inicialización:
kubectl logs deployment/integra-api --tail=50 | grep -i "database\|connection"
```

#### 🟠 ALTA - SECONDARY SUSPECT: Middleware tRPC Cascade Failure
**Evidencia:**
- `requirePermission` middleware en `clients.list`, `posts.list` es estricto
- Si `ctx.user` es `null` o `ctx.permissions` está vacío, throws 403
- Pero error se devuelve como 500 en batch request si `context` está corrupto

**Pasos para verificar:**
- Revisar logs: `[tRPC] Middleware requirePermission: ...`
- Buscar: `context_creation_failed`, `auth_middleware_error`

#### 🟡 MEDIA - TERTIARY: Batch Request Deserialization
**Evidencia:**
- `input=null` + `meta.values=["undefined"]` en 5 queries
- Podría ser malformación en serializer tRPC de cliente

**Pasos para verificar:**
- Capturar request exacto POST /trpc/batch
- Ver si cliente envía `[...queries...]` o un objeto malformado

---

## D. INFORMACIÓN DE CONTEXTO PARA DEBY

---

## C. ANÁLISIS PROFUNDO DEL CÓDIGO

### 1. Estructura Confirmada de Las 5 Queries
```typescript
// ProcesoDetalle.tsx línea 52-199

// QUERY 1: surveyors.listActive ← surveyorsRouter (adminProcedure)
const { data: surveyors = [] } = trpc.surveyors.listActive.useQuery(undefined, {
    initialData: [],
} as any);

// QUERY 2-5: batch de 4 queries sin parámetros (todos en ProcesoDetalle.tsx:193-199)
const { data: clients = [] } = trpc.clients.list.useQuery();              // protectedProcedure + requirePermission
const { data: candidates = [] } = trpc.candidates.list.useQuery();        // publicProcedure con lógica autenticación
const { data: posts = [] } = trpc.posts.list.useQuery();                  // protectedProcedure con fallback por rol
const { data: allProcesses = [] } = trpc.processes.list.useQuery(...);    // Protegido, enabled: !isClientAuth
```

### 2. Implementación de Base de Datos (db.ts)
```typescript
// Todas las funciones de BD están correctamente implementadas:
export async function getAllClients() {
  const db = await getDb();
  if (!db) return [];  // ← Retorna array vacío si BD no disponible
  return db.select().from(clients).orderBy(desc(clients.createdAt));
}

export async function getAllPosts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(posts).orderBy(desc(posts.createdAt));
}

export async function getCandidatesWithInvestigationProgress(clienteId?: number) {
  const db = await getDb();
  if (!db) return [];  // ← Retorna array vacío si BD no disponible
  // ... JOIN complejo con workHistory
}

export async function getAllSurveyors() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(surveyors).orderBy(asc(surveyors.nombre));
}
```

### 3. Critical Gateway: getDb()
```typescript
export async function getDb() {
  if (_db) return _db;
  
  try {
    if (!process.env.DATABASE_URL) {
      console.warn("[Database] DATABASE_URL not set.");
      return null;  // ← CRÍTICO: Retorna null
    }

    console.log("[Database] Initializing MySQL pool from DATABASE_URL.");
    const pool = mysql.createPool(process.env.DATABASE_URL);
    _db = drizzle(pool);
  } catch (error) {
    console.error("[Database] Failed to initialize database connection:", error);
    _db = null;  // ← CRÍTICO: Falla de conexión
  }

  return _db;
}

// PROBLEMA: Si getDb() retorna null, las 5 queries retornan [] sin error
// PERO luego el middleware de tRPC intenta serializar/ejecutar
// lo que genera HTTP 500 en la transición
```

### Archivos Clave Confirmados
```
/integra-rh-manus/server/routers/
├─ surveyors.ts       ← surveyors.list = adminProcedure
├─ clients.ts         ← clients.list = protectedProcedure
├─ candidates.ts      ← candidates.list = publicProcedure
├─ processes.ts       ← procesos
├─ posts.ts           ← puestos
└─ index.ts           ← Punto de exportación central ✓

/integra-rh-manus/client/src/pages/
├─ CandidatoFormularioIntegrado.tsx
│  ├─ Línea 60: const [baseTipo, setBaseTipo] = useState<ProcesoBaseType>("ILA");
│  ├─ Línea 248-256: handleProcessSubmit() invoca baseTipo
│  ├─ Línea 65: const { data: clients = [] } = trpc.clients.list.useQuery();
│  └─ Línea 66-68: const { data: clientSitesByClient = [] } = trpc.clientSites...useQuery()
```

### Configuración de Ambiente (Requerido para DEBY)
- **BD:** MySQL en Railway
- **Entorno:** Producción
- **Framework:** tRPC + React + TypeScript
- **User Role Executing:** Usuario autenticado (role = ?)

---

## D. PASOS INVESTIGACIÓN FORENSE CRITERIO DEBY

### Paso 0: Verificar DATABASE_URL (PRIMERA ACCIÓN - CRÍTICO)
```bash
# En Railway Deploy/environment:
echo "$$DATABASE_URL"  # Debe retornar conexión MySQL válida tipo: mysql://user:pass@host:3306/db

# O via Railway CLI:
railway env  # Mostrar todas las variables

# Si está vacío o mal formado → ROOT CAUSE ENCONTRADA
```

### Paso 1: Probar Conexión Directa a BD
```bash
# Extraer el hostname del DATABASE_URL:
# Patrón: mysql://user:password@hostname.railway.app:PORT/dbname

# Probar conexión:
mysql -h $DB_HOSTNAME -u $DB_USER -p"$DB_PASSWORD" \
  -e "SELECT COUNT(*) as surveyors_count FROM surveyors LIMIT 1; \
      SELECT COUNT(*) as clients_count FROM clients LIMIT 1; \
      SELECT COUNT(*) as candidates_count FROM candidates LIMIT 1; \
      SELECT COUNT(*) as posts_count FROM posts LIMIT 1;"

# Si alguno falla con "Access denied" o "Connection refused" → ROOT CAUSE IDENTIFICADA
```

### Paso 2: Revisar Logs de Inicialización del Servidor
```bash
# En Railway logs:
railway logs --tail=500 2>&1 | grep -i "database\|connection\|mysql\|error" | tail -50

# Debe mostrar:
# ✓ "[Database] Initializing MySQL pool from DATABASE_URL."
# ✓ "[Database] Connection initialized successfully"

# RED FLAGS a buscar:
# ✗ "[Database] DATABASE_URL not set."
# ✗ "[Database] Failed to initialize database connection:"
# ✗ "ECONNREFUSED" o "ETIMEDOUT"
# ✗ "Authentication failed" o "Access denied"
```

### Paso 3: Capturar Batch Request Exacto (Network Traffic)
Hacer que usuario reproduzca error mientras está en Network tab del navegador:
```bash
# En browser dev tools:
1. Network tab → filtrar por "batch" o "api/trpc"
2. Encontrar POST /api/trpc/batch
3. Hacer click derecho → Copy as cURL
4. Pegar en archivo /tmp/batch_request.log

# Analizar request:
cat /tmp/batch_request.log | jq '.  | length'  # Contar queries
cat /tmp/batch_request.log | jq '.[0]'         # Inspeccionar primera query
cat /tmp/batch_request.log | jq '.[].params.path'  # Listar paths
```

### Paso 4: Validar Permisos de Usuario BD y Tablas
```sql
-- Conectarse directamente a MySQL (con credenciales admin):
USE mysql;
SELECT User, Host FROM user WHERE User='integra_user';
SHOW GRANTS FOR 'integra_user'@'%';

-- Debe tener:
-- GRANT SELECT, INSERT, UPDATE, DELETE ON `integra_rh`.* TO 'integra_user'@'%'

-- Validar que las tablas existen:
USE integra_rh;
SHOW TABLES LIKE '%surveyors%';
SHOW TABLES LIKE '%clients%';
SHOW TABLES LIKE '%candidates%';
SHOW TABLES LIKE '%posts%';

-- Ejecutar las queries que fallan:
SELECT COUNT(*) FROM surveyors;  -- Si falla aquí, problema de BD
SELECT COUNT(*) FROM clients;
SELECT COUNT(*) FROM candidates;
SELECT COUNT(*) FROM posts;
```

### Paso 5: Revisar Logs de Contexto/Autenticación tRPC
```bash
# En Railway logs, buscar patrones de context creation:
railway logs --tail=1000 2>&1 | grep -E "\[Auth\]|\[tRPC\]|createContext|requirePermission" | tail -100

# Patrones esperados:
# ✓ "[Auth] Firebase verifyIdToken OK"
# ✓ "[Auth] DB getUserByOpenId: found user"

# RED FLAGS:
# ✗ "[Auth] Firebase verifyIdToken failed"
# ✗ "ctx.user is null"
# ✗ "requirePermission: user has no permissions"
```

### Paso 6: Test Manual en Staging (Reproducción Controlada)
Si los pasos anteriores no revelan root cause:
```bash
# Deploy rama actual a staging
git push origin HEAD:staging

# Ejecutar en staging:
curl -X POST https://staging-api.integra.local/api/trpc/batch \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[
    {"jsonrpc":"2.0","id":0,"method":"query","params":{"path":"surveyors.listActive","input":null}},
    {"jsonrpc":"2.0","id":1,"method":"query","params":{"path":"clients.list","input":null}},
    {"jsonrpc":"2.0","id":2,"method":"query","params":{"path":"candidates.list","input":null}},
    {"jsonrpc":"2.0","id":3,"method":"query","params":{"path":"posts.list","input":null}},
    {"jsonrpc":"2.0","id":4,"method":"query","params":{"path":"processes.list","input":null}}
  ]' -v

# Capturar response completo
```

---

## E. ENTREGA ESPERADA DE DEBY

Para resolver FIX-20260309-01, DEBY debe entregar:

### ✅ Checklist de Investigación
- [ ] **Paso 0 ejecutado:** DATABASE_URL verificada y válida en production
- [ ] **Paso 1 completado:** Conexión directa a MySQL probada exitosamente
- [ ] **Paso 2 completado:** Logs de inicialización revisados, sin errores de conexión
- [ ] **Paso 3 completado:** Batch request capturado y analizado
- [ ] **Paso 4 completado:** Permisos MySQL validados, tablas confirmadas presentes
- [ ] **Paso 5 completado:** Logs de autenticación/contexto analizados
- [ ] **Paso 6 completado (si necesario):** Test manual en staging ejecutado
- [ ] **Root cause documentada:** Explicación clara del por qué fallan las 5 queries
- [ ] **Reproducer steps validados:** Pasos claros para reproducir el error
- [ ] **Hipótesis principal confirmada o descartada**

### 📋 Formato Esperado del Dictamen Enriquecido (DEBY → Copilot)
```markdown
# DICTAMEN ENRIQUECIDO: FIX-20260309-01 ✅ FINALIZADO

## Root Cause Identificada
**Desc:** ¿DATABASE_URL missing? ¿Conexión BD caída? ¿Permiso denegado? ¿Batch malformado?

**Evidencia Crítica:** Incluir exactamente:
- Comando ejecutado y salida exacta
- Error message específico
- Timestamp de cuando ocurrió
- Archivo de log o referencia a log line numbers

## Escenario de Reproducción
1. Paso exacto para reproducir el error
2. Output esperado vs. actual obtenido
3. Ambiente (production, staging, local)

## Solución Propuesta
- Acción específica (código, config, escalamiento)
- Archivo(s) a modificar
- Líneas exactas
- Explicación del por qué soluciona
- Riesgo de la solución (si existe)

## Plan de Validación Post-Fix
- [ ] Reejecutar Paso X que falló → debe pasar
- [ ] Cargar ProcesoDetalle en navegador → sin errores 500
- [ ] Ejecutar manual test de 5 queries → todas retornan datos
- [ ] Verificar logs en producción → sin errores nuevos
- [ ] Confirmación del usuario → bug resuelto
```

---

## F. NOTAS OPERACIONALES FINALES

### Información de Contexto
- **Solicitante:** Frank Saavedra
- **Ambiente Afectado:** ✋ Producción (Sistema bloqueado)
- **Disponibilidad de Usario:** Alta urgencia
- **SLA de Resolución:** < 4 horas
- **Escalability:** Si DEBY no resuelve en 2 intentos, escalar a INTEGRA-Arquitecto

### Timeline Esperado
```
[Ahora]  FIX-20260309-01 creado, Dictamen escalado a DEBY
[+0:30]  DEBY inicia Paso 0-3 (diagnosticuqarlos)
[+1:00]  DEBY identifica root cause
[+1:30]  DEBY entrega Dictamen Enriquecido
[+2:00]  Copilot implementa fix basado en Dictamen
[+2:30]  Deploy a producción
[+3:00]  Validación y confirmación de resolución
```

### Recuros Disponibles para DEBY
- Acceso a Railway dashboard
- MySQL credentials para integra_rh
- Server logs (railway logs CLI)
- User cuenta aconsola Firebase (para validar tokens)
- Acceso a código fuente en GitHub

### Precedentes
- **FIX-20260217-01:** Similar error en plazas → raíz fue datos malformados en BD
- **FIX-20260220-01:** Race condition en updates → requirió sincronización en middleware
- **FIX-20260219-03:** Middleware failure → falló autenticación en ciertos casos

---

## G. INSTRUCCIONES FINALES PARA DEBY

### Protocolo de Escalamiento (Si No Puede Resolver)
Si después de ejecutar Pasos 0-6 no identifica root cause claramente:
1. Documentar exactamente qué probó y qué resultados obtuvo
2. Listar las hipótesis que descartó
3. Crear un "Dictamen Parcial" con findings
4. **Escalar a INTEGRA-Arquitecto** para segunda opinión

### Comunicación al Completar
Una vez complete la investigación, actualizar:
1. Este archivo (DICTAMEN_FIX-20260309-01.md) con Findings
2. Crear Checkpt reciente: `CHK_YYYY-MM-DD_HHMM-fix-500-diagnosis.md`
3. Notificar al usuario (Frank) del resultado

---

**ESTADO:** 🔍 PENDIENTE INVESTIGACIÓN FORENSE
**PROPIEDAD:** DEBY - Agente Forense/Debugging
**FECHA CREACIÓN:** 2026-03-09
**ÚLTIMO ACTUALIZADO:** 2026-03-09

---

✋ **IMPORTANTE:** Este Dictamen es el punto de entrada obligatorio para cualquier cambio.
No modificar código hasta que DEBY complete la investigación.

