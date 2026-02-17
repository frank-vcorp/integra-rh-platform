#!/bin/bash
# ============================================================================
# Cloud Functions Deploy Script
# FIX-20260217: Despliega funciones de migración de plazas
# ============================================================================
# 
# PREREQUISITOS:
# - Firebase CLI instalado: npm install -g firebase-tools
# - gcloud CLI autenticado: gcloud auth login
# - Credenciales válidas para el proyecto "integra-rh"
#
# USO:
# bash deploy-functions.sh
# ============================================================================

set -e

PROJECT_ID="integra-rh"
FUNCTIONS_DIR="./functions"
REGION="us-central1"

echo "🚀 Iniciando deploy de Cloud Functions..."
echo "📋 Proyecto: $PROJECT_ID"
echo "📁 Directorio: $FUNCTIONS_DIR"
echo "🌍 Región: $REGION"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "firebase.json" ]; then
    echo "❌ Error: firebase.json no encontrado"
    echo "   Ejecuta este script desde la raíz del proyecto"
    exit 1
fi

# Verificar autenticación
echo "🔐 Verificando autenticación..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Error: No hay cuenta activa en gcloud"
    echo "   Ejecuta: gcloud auth login"
    exit 1
fi

ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
echo "✅ Autenticado como: $ACTIVE_ACCOUNT"
echo ""

# Verificar proyecto
echo "🔧 Verificando proyecto..."
if gcloud config get-value project 2>/dev/null | grep -q "$PROJECT_ID"; then
    echo "✅ Proyecto configurado: $PROJECT_ID"
else
    echo "⚠️  Configurando proyecto: $PROJECT_ID"
    gcloud config set project $PROJECT_ID
fi
echo ""

# Build functions (compile TypeScript si existe)
if [ -f "$FUNCTIONS_DIR/tsconfig.json" ]; then
    echo "📦 Compilando funciones TypeScript..."
    cd $FUNCTIONS_DIR
    npm run build 2>/dev/null || npm install && npm run build
    cd ..
    echo "✅ Compilación completada"
    echo ""
fi

# Deploy functions
echo "🚀 Desplegando funciones..."
echo ""

# Opción 1: Usando Firebase CLI (recomendado)
if command -v firebase &> /dev/null; then
    echo "📤 Usando Firebase CLI..."
    firebase deploy --only functions --project=$PROJECT_ID
else
    echo "⚠️  Firebase CLI no encontrado, usando gcloud..."
    
    # Opción 2: Usando gcloud CLI
    echo "Desplegando migrateProcessSites..."
    gcloud functions deploy migrateProcessSites \
        --runtime nodejs20 \
        --trigger-http \
        --allow-unauthenticated \
        --source $FUNCTIONS_DIR \
        --entry-point migrateProcessSites \
        --region $REGION \
        --project $PROJECT_ID
    
    echo ""
    echo "Desplegando validateProcessSites..."
    gcloud functions deploy validateProcessSites \
        --runtime nodejs20 \
        --trigger-http \
        --allow-unauthenticated \
        --source $FUNCTIONS_DIR \
        --entry-point validateProcessSites \
        --region $REGION \
        --project $PROJECT_ID
fi

echo ""
echo "✅ Deploy completado!"
echo ""

# Obtener URLs
echo "📍 URLs de las funciones:"
echo ""
echo "Validar estado:"
echo "  GET https://$REGION-$PROJECT_ID.cloudfunctions.net/validateProcessSites"
echo ""
echo "Ejecutar migración:"
echo "  POST https://$REGION-$PROJECT_ID.cloudfunctions.net/migrateProcessSites"
echo "  Headers: Authorization: Bearer \$(gcloud auth print-identity-token)"
echo ""

# Próximos pasos
echo "📋 Próximos pasos:"
echo ""
echo "1. Validar estado ANTES de migrar:"
curl -s https://$REGION-$PROJECT_ID.cloudfunctions.net/validateProcessSites | jq . || echo "   (función aún no disponible)"
echo ""
echo "2. Ejecutar migración:"
echo "   ADMIN_TOKEN=\$(gcloud auth print-identity-token)"
echo "   curl -X POST https://$REGION-$PROJECT_ID.cloudfunctions.net/migrateProcessSites \\"
echo "     -H \"Authorization: Bearer \$ADMIN_TOKEN\" \\"
echo "     -H \"Content-Type: application/json\""
echo ""
echo "3. Validar estado DESPUÉS de migrar:"
echo "   curl https://$REGION-$PROJECT_ID.cloudfunctions.net/validateProcessSites | jq ."
echo ""
