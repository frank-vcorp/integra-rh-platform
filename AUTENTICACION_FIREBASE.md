# 🔐 Problema de Autenticación Firebase - Solución

## Situación Actual
Las credenciales de Firebase en el entorno actual han expirado y se requiere re-autenticación interactiva, que no es posible en un entorno sin UI.

## Soluciones

### ✅ Opción 1: Usar Google Cloud Console (RECOMENDADO)
Sin necesidad de CLI, directamente desde Google Cloud:

1. Ir a: https://console.cloud.google.com/functions?project=integra-rh
2. Crear función (crear dos veces, una por cada función):
   - **Nombre:** `migrateProcessSites`
   - **Trigger:** HTTP
   - **Autenticación:** Permitir invocación no autenticada
   - **Runtime:** Node.js 20
   - **Código:** Copiar de [functions/index.js](../functions/index.js)
   - **Punto de entrada:** `migrateProcessSites`

3. Repetir con `validateProcessSites`

### ✅ Opción 2: Ejecutar desde tu máquina local
En tu laptop/desktop donde SÍ tienes Firebase autenticado:

```bash
# 1. Clonar el repo
git clone <repo-url>
cd integra-rh

# 2. Autenticar (se abrirá browser)
firebase login

# 3. Deploy
firebase deploy --only functions

# 4. Ejecutar migración
bash run-migration.sh
```

### ✅ Opción 3: Usar GitHub Actions (CI/CD)
Automatizar el deploy en cada push:

Crear `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase

on:
  push:
    branches:
      - main
      - master

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Deploy Functions
        run: |
          npm install -g firebase-tools
          firebase deploy --only functions --project=integra-rh
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

Luego en GitHub:
1. Ir a Settings → Secrets and variables → Actions
2. Agregar `FIREBASE_TOKEN`:
   ```bash
   firebase login:ci
   ```

### ✅ Opción 4: Usar Railway Cloud Run (Ya instalada)
Si prefieres no usar Firebase, puedes usar Railway directamente:

```bash
# 1. Conectar Railway
railway login

# 2. Deploy
railway up

# 3. Ejecutar migración
curl -X POST https://tu-railway-app.up.railway.app/api/migrateProcessSites \
  -H "Authorization: Bearer $(railway token)" \
  -H "Content-Type: application/json"
```

## Scripts Preparados

He preparado dos scripts listos para usar. Requieren:
- **Unix/Linux/Mac:** Ejecutar directamente
- **Windows:** Usar WSL (Windows Subsystem for Linux)

### 1️⃣ Deploy Script
```bash
chmod +x deploy-functions.sh
./deploy-functions.sh
```

### 2️⃣ Migration Script  
```bash
chmod +x run-migration.sh
./run-migration.sh
```

## ¿Cuál usar?

| Opción | Facilidad | Control | Automatización | Recomendado para |
|--------|-----------|---------|----------------|------------------|
| Google Cloud Console | ⭐⭐⭐⭐⭐ | Medio | No | Una sola vez |
| Local CLI | ⭐⭐⭐ | Alto | No | Desarrollo |
| GitHub Actions | ⭐⭐ | Alto | ⭐⭐⭐⭐⭐ | CI/CD |
| Railway | ⭐⭐⭐ | Medio | Sí | Ya tienes Railway |

## Recomendación
**Para producción ahora:** Usa Google Cloud Console (Opción 1)
**Para futuro:** GitHub Actions (Opción 3) para automatizar deploys

---

¿Cuál opción prefieres? Te guío paso a paso.
