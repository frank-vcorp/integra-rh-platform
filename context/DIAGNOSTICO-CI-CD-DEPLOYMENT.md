# 📊 DIAGNÓSTICO COMPLETO: CI/CD y DEPLOYMENT

**Fecha:** 9 de marzo de 2026  
**Responsable:** SOFIA - Builder  
**ID:** DIAG-20260309-CI-CD

---

## 🎯 RESUMEN EJECUTIVO

| Componente | Estado | Tipo | Trigger |
|-----------|--------|------|---------|
| **CloudRun (API)** | ✅ CONFIGURADO | Automático | Git push a master |
| **Firebase Hosting** | ✅ CONFIGURADO | Manual | Comando Firebase CLI |
| **Railway (MySQL)** | ❌ ACLARACIÓN REQUERIDA | N/A | N/A |
| **GitHub Actions** | ❌ NO EXISTE | N/A | N/A |
| **Dockerfile Optimization** | ⚠️ MEJORABLE | N/A | N/A |

---

## 🔍 ANÁLISIS DETALLADO

### 1. ☁️ **CLOUD RUN (API)**

#### Status: ✅ **FUNCIONANDO Y AUTOMÁTICO**

**Trigger Configurado:**
```
Nombre: sinergia-deploy-master
Repositorio: frank-vcorp/Sinergia
Rama: master (^master$)
Archivo: cloudbuild.yaml
```

**Flujo Automático:**
```
foo (push a master)
    ↓
[AUTOMÁTICO] Cloud Build trigger activado
    ↓
cloudbuild.yaml ejecuta:
  1. docker pull (caché)
  2. docker build (Dockerfile.prod)
  3. docker push (Artifact Registry)
  4. gcloud run deploy (CloudRun api)
    ↓
Nueva revisión en Cloud Run (ej: api-00139-xcq)
```

**Últimas Builds:**
- ✅ `9c05201b-a810` — SUCCESS — 2026-03-09 04:01:50
- ✅ `4c25f7b1-b295` — SUCCESS — 2026-03-09 03:32:09
- ❌ `cd319967-0ec1` — FAILURE — 2026-02-17 23:07:42
- ✅ `ea3450e8-0fc8` — SUCCESS — 2026-02-17 22:48:51

**Tiempo Típico de Build:** ~2-3 minutos (visible en logs)

---

### 2. 🔥 **FIREBASE HOSTING**

#### Status: ✅ **CONFIGURADO, PERO MANUAL**

**Configuración en firebase.json:**
```json
{
  "hosting": {
    "target": "integra-rh",
    "public": "integra-rh-manus/dist/public",
    "rewrites": [
      { "source": "/api/**", "run": { "serviceId": "api", "region": "us-central1" } },
      { "source": "/asignarPruebasPsicometricas", "function": "..." },
      // ... más funciones
    ]
  }
}
```

**Problema:** Firebase Hosting se debe deployar MANUALMENTE:
```bash
firebase deploy --only hosting,functions --project=integra-rh
```

**NO hay automatización** para Firebase cuando hace push a master.

**Solución Propuesta:** Agregar paso en cloudbuild.yaml para deployar Firebase después de Build.

---

### 3. 🚂 **RAILWAY (BASE DE DATOS MYSQL)**

#### Status: ❌ **NO REQUIERE DEPLOYMENT**

Railway está conectado para **servir la base de datos** solamente, NO para deployar código.

**Clave de Conexión:**
```
DATABASE_URL = mysql://[usuario]:[password]@[host:puerto]/[db]
```

⚠️ **IMPORTANTE:** Esta variable FALTA en CloudRun runtime (identificado en FIX-20260309-01).

**Acción Requerida:** Agregar `DATABASE_URL` a las variables de entorno en Cloud Run.

---

### 4. 📦 **DOCKERFILE.PROD - ANÁLISIS DE OPTIMIZACIÓN**

#### Status: ⚠️ **FUNCIONA PERO LENTO**

**Problemas Identificados:**

#### A. **Reconstrucción Forzada**
```dockerfile
# Forzar rebuild invalidando caché (comentario cambia cada build)
# BUILD_ID: 2026-02-18T05:59:09Z  ← Este comentario hace caché MISS
RUN set -a && source .env.production && set +a && npm run build
```

**Impacto:** Cada build recompila TODOS los módulos, aunque no cambió nada.

**Solución:** Remover BUILD_ID comentario o usar multi-stage cache mejor.

#### B. **Ineficiencia de Layers**
```dockerfile
# ❌ PROBLEMA: Copia deps, luego COPIA TODO EL CÓDIGO
COPY integra-rh-manus/package.json integra-rh-manus/pnpm-lock.yaml ./integra-rh-manus/
RUN pnpm install

COPY integra-rh-manus ./integra-rh-manus  ← Aquí invalida caché de npm
```

**Solución:** Usar `.dockerignore` mejor para excluir archivos innecesarios.

#### C. **Falta de Caché en pnpm-lock**
```dockerfile
RUN pnpm install --frozen-lockfile
```

**OK**, pero si `pnpm-lock.yaml` cambia → caché inválido (esperado, pero lento).

---

## 🚀 **FLUJO ACTUAL DE DEPLOYMENT**

```
┌─────────────────────────────────────────┐
│ git push origin master                  │
│ (Desde VS Code o terminal)              │
└────────────────┬────────────────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │ GitHub Webhook Trigger     │
    │ (Automático)               │
    └────────────┬───────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │ Google Cloud Build         │
    │ ejecuta cloudbuild.yaml    │
    │ (tiempo: ~2-3 min)         │
    └────────────┬───────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │ 1. docker pull (caché)     │
    │ 2. docker build            │
    │ 3. docker push             │
    │ 4. gcloud run deploy       │
    └────────────┬───────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │ CloudRun NEW REVISION      │
    │ api-00140-xyz (ejemplo)    │
    │ ✅ AUTOMÁTICO LIVE         │
    └────────────────────────────┘
                 │
                 ▼
    ⚠️  Firebase Hosting         
    ❌ MANUAL (no automático)
    $ firebase deploy --only hosting
```

---

## 🛠️ **ANÁLISIS DE TIEMPOS DE BUILD**

### Desglose Típico (2-3 minutos):

| Fase | Tiempo | Notas |
|------|--------|-------|
| **docker pull (caché)** | 30-45s | Depende de tamaño imagen anterior |
| **docker build** | 1m-1.5m | **Cuello de botella principal** |
| **docker push** | 30-45s | Upload a Artifact Registry |
| **gcloud run deploy** | 40-60s | Inicializar contenedor + healthy check |
| **TOTAL** | **2.5-3.5 min** | Variable según caché |

### Por Qué Es Lento:

1. **Build Step es lento** — recompilación completa de Vite + TypeScript
2. **Dockerfile.prod no está optimizado** (BUILD_ID invalidando caché)
3. **pnpm install** ocurre en cada build (aunque pnpm-lock.yaml no cambia)
4. **Vite compilation** con `npm run build` es operación pesada

---

## 📋 **PROBLEMAS A RESOLVER**

### 🔴 CRÍTICOS

#### 1. **DATABASE_URL Faltante en CloudRun**
- **Impacto:** Errores 500 en API (identificado en FIX-20260309-01)
- **Solución:** Agregar variable de entorno en Cloud Run service
- **Tiempo:** 5 minutos
- **Prioridad:** INMEDIATO

#### 2. **Firebase Hosting Sin Automatización**
- **Impacto:** Frontend NO se actualiza con `git push`
- **Requiere:** Manual `firebase deploy` cada vez
- **Solución:** Agregar Firebase deploy a cloudbuild.yaml
- **Tiempo:** 30 minutos
- **Prioridad:** ALTA (sin esto push != deploy frontend)

### 🟠 ALTOS (Optimización)

#### 3. **Dockerfile.prod Lento**
- **BUILD_ID hardcoded invalidando caché**
- **Solución:** Remover BUILD_ID o refactorizar Dockerfile
- **Ganancia:** ~30-40% más rápido (de 2.5m a 1.5m)
- **Tiempo:** 1-2 horas
- **Prioridad:** MEDIA (bonito tener, pero ya funciona)

#### 4. **Falta GitHub Actions**
- **Para:** Tests automáticos en PR, linting, validaciones
- **Tiempo:** 2-3 horas
- **Prioridad:** BAJA (no bloqueante)

---

## ✅ **RECOMENDACIONES INMEDIATAS**

### Orden de Ejecución:

```
AHORA (< 15 min):
  1. Agregar DATABASE_URL a CloudRun (FIX)
  2. Testear que API pase de errores 500

DESPUÉS (1 hora):
  3. Agregar Firebase deploy a cloudbuild.yaml (CRITICAL FIX)
  4. Testear que frontend se auto-actualice con git push

OPCIONAL (cuando tengas tiempo):
  5. Refactorizar Dockerfile.prod para optimizar build (30% más rápido)
  6. Agregar GitHub Actions para tests/lint en PR
```

---

## 📊 **ESTADO FINAL DEL DIAGNÓSTICO**

| Aspecto | Status | Acción Requerida |
|--------|--------|------------------|
| CloudRun Automático | ✅ OK | NINGUNA |
| Firebase Manual | ⚠️ PARCIAL | Automatizar |
| DATABASE_URL | ❌ FALTA | Agregar env var |
| Build Optimization | 📈 MEJORABLE | Refactorizar Dockerfile |
| CI/CD Completitud | 🟠 PARCIAL | Agregar GitHub Actions |

---

**Conclusión:** Sistema está **funcional pero incompleto**. 
- ✅ CloudRun: Automático ← **Bien**
- ❌ Firebase: Manual ← **Problema**
- ❌ DATABASE_URL: Falta ← **Crítico**

**ETA Resolución Completa:** ~2 horas si haces los 3 críticos.
