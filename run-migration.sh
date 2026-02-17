#!/bin/bash
# ============================================================================
# Migration Execution Script
# FIX-20260217: Ejecuta la migración de plazas en Railway MySQL
# ============================================================================
#
# PREREQUISITOS:
# - Cloud Functions desplegadas (ejecutar deploy-functions.sh primero)
# - gcloud CLI autenticado
#
# USO:
# bash run-migration.sh
# ============================================================================

set -e

PROJECT_ID="integra-rh"
REGION="us-central1"
FUNCTION_URL="https://$REGION-$PROJECT_ID.cloudfunctions.net/migrateProcessSites"
VALIDATE_URL="https://$REGION-$PROJECT_ID.cloudfunctions.net/validateProcessSites"

echo "🔄 Sistema de Migración de Plazas"
echo "=================================="
echo ""

# Función auxiliar para imprimir headers
print_section() {
    echo ""
    echo "📍 $1"
    echo "---"
}

# 1. Validar autenticación
print_section "Paso 1: Validar Autenticación"
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Error: No hay cuenta activa en gcloud"
    echo "Ejecuta: gcloud auth login"
    exit 1
fi

ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
echo "✅ Autenticado como: $ACTIVE_ACCOUNT"

# 2. Obtener token
print_section "Paso 2: Obtener Token de Identidad"
echo "Obteniendo token..."
ADMIN_TOKEN=$(gcloud auth print-identity-token)
if [ -z "$ADMIN_TOKEN" ]; then
    echo "❌ Error: No se pudo obtener el token"
    exit 1
fi
echo "✅ Token obtenido (${#ADMIN_TOKEN} caracteres)"

# 3. Validar estado ANTES
print_section "Paso 3: Validar Estado ANTES de Migración"
echo "Consultando: $VALIDATE_URL"
echo ""

BEFORE_RESPONSE=$(curl -s $VALIDATE_URL)
echo "$BEFORE_RESPONSE" | jq . || echo "$BEFORE_RESPONSE"

# Extraer datos
BEFORE_TOTAL=$(echo "$BEFORE_RESPONSE" | jq -r '.totalProcesses // 0')
BEFORE_WITHOUT=$(echo "$BEFORE_RESPONSE" | jq -r '.processesWithoutSites // 0')
BEFORE_WITH=$(echo "$BEFORE_RESPONSE" | jq -r '.processesWithSites // 0')
BEFORE_PERCENT=$(echo "$BEFORE_RESPONSE" | jq -r '.completePercentage // "0%"')

echo ""
echo "📊 Resumen ANTES:"
echo "  Total de procesos: $BEFORE_TOTAL"
echo "  Con plaza: $BEFORE_WITH"
echo "  Sin plaza: $BEFORE_WITHOUT"
echo "  Completitud: $BEFORE_PERCENT"
echo ""

# 4. Ejecutar migración
print_section "Paso 4: Ejecutar Migración"
echo "Ejecutando..."
echo "POST $FUNCTION_URL"
echo ""

MIGRATION_RESPONSE=$(curl -s -X POST $FUNCTION_URL \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json")

echo "$MIGRATION_RESPONSE" | jq . || echo "$MIGRATION_RESPONSE"

# Extraer resultados
AFFECTED=$(echo "$MIGRATION_RESPONSE" | jq -r '.affectedRows // 0')
SUCCESS=$(echo "$MIGRATION_RESPONSE" | jq -r '.success // false')

echo ""
if [ "$SUCCESS" = "true" ]; then
    echo "✅ Migración completada exitosamente"
    echo "   Procesos actualizados: $AFFECTED"
else
    echo "⚠️  La migración reportó un problema"
fi

# 5. Esperar un poco antes de validar
print_section "Paso 5: Esperar Propagación"
echo "Esperando 5 segundos para que se propaguen los cambios..."
sleep 5
echo "✅ Continuando..."

# 6. Validar estado DESPUÉS
print_section "Paso 6: Validar Estado DESPUÉS de Migración"
echo "Consultando: $VALIDATE_URL"
echo ""

AFTER_RESPONSE=$(curl -s $VALIDATE_URL)
echo "$AFTER_RESPONSE" | jq . || echo "$AFTER_RESPONSE"

# Extraer datos
AFTER_TOTAL=$(echo "$AFTER_RESPONSE" | jq -r '.totalProcesses // 0')
AFTER_WITHOUT=$(echo "$AFTER_RESPONSE" | jq -r '.processesWithoutSites // 0')
AFTER_WITH=$(echo "$AFTER_RESPONSE" | jq -r '.processesWithSites // 0')
AFTER_PERCENT=$(echo "$AFTER_RESPONSE" | jq -r '.completePercentage // "0%"')

echo ""
echo "📊 Resumen DESPUÉS:"
echo "  Total de procesos: $AFTER_TOTAL"
echo "  Con plaza: $AFTER_WITH"
echo "  Sin plaza: $AFTER_WITHOUT"
echo "  Completitud: $AFTER_PERCENT"

# 7. Comparativa
print_section "Paso 7: Comparativa de Cambios"
if [ "$BEFORE_WITHOUT" != "$AFTER_WITHOUT" ]; then
    CHANGED=$((BEFORE_WITHOUT - AFTER_WITHOUT))
    echo "✅ Se sincronizaron procesos:"
    echo "   Antes: $BEFORE_WITHOUT sin plaza"
    echo "   Después: $AFTER_WITHOUT sin plaza"
    echo "   Cambios: -$CHANGED procesos"
    echo ""
    echo "📈 Progreso: $BEFORE_PERCENT → $AFTER_PERCENT"
else
    echo "⚠️  No se detectaron cambios"
    echo "   Posible causa: Ya estaban sincronizados todos"
fi

# 8. Resumen final
print_section "Paso 8: Resumen Final"
echo ""
if [ "$SUCCESS" = "true" ] && [ $AFTER_WITHOUT -eq 0 ]; then
    echo "🎉 ¡Migración completada exitosamente!"
    echo ""
    echo "✅ Todos los procesos están sincronizados"
    echo "✅ Plazas asignadas correctamente"
    echo "✅ Sistema listo para producción"
elif [ "$SUCCESS" = "true" ]; then
    echo "✅ Migración completada"
    echo ""
    echo "⚠️  $AFTER_WITHOUT procesos aún sin plaza"
    echo "   (Probablemente no tienen plazas disponibles en su cliente)"
else
    echo "❌ Error en la migración"
    echo "   Revisa los logs en Cloud Functions"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "🔗 URLs útiles:"
echo ""
echo "📺 Ver plazas en aplicación:"
echo "   https://integra-rh.web.app/procesos"
echo ""
echo "🔍 Ver logs de funciones:"
echo "   https://console.cloud.google.com/functions/details/$REGION/migrateProcessSites?project=$PROJECT_ID"
echo ""
echo "📚 Documentación:"
echo "   Ver context/interconsultas/FIX_20260217_MIGRACION_PLAZAS.md"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
