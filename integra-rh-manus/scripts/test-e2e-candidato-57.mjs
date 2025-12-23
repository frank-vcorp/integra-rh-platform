#!/usr/bin/env node

/**
 * Prueba E2E Manual - Candidato ID 57
 * Script para validar sincronización en candidato real
 */

const candidatoId = 57;
const apiBase = "https://integra-rh.web.app/api";

console.log(`\n🧪 PRUEBA E2E - Candidato ID: ${candidatoId}`);
console.log('═'.repeat(70));

(async () => {
  try {
    // PASO 1: Obtener información del candidato
    console.log('\n📋 PASO 1: Obtener información del candidato');
    console.log('─'.repeat(70));
    
    // Nota: Necesitamos auth token, pero podemos verificar la estructura
    console.log(`URL Candidato Panel: https://integra-rh.web.app/candidatos/${candidatoId}`);
    console.log('Pasos manuales a seguir:');
    console.log('');
    console.log('1️⃣  ABRIR CANDIDATO:');
    console.log(`   → URL: https://integra-rh.web.app/candidatos/${candidatoId}`);
    console.log('   → Verificar estado actual del candidato');
    console.log('   → Anotar campos que ya tiene llenos');
    console.log('');
    
    console.log('2️⃣  OBTENER LINK DE SELF-SERVICE:');
    console.log('   → Click en botón "Editar autocaptura"');
    console.log('   → Se abre página de self-service con token');
    console.log('   → Copiar URL o token');
    console.log('');
    
    console.log('3️⃣  CANDIDATO LLENA DATOS:');
    console.log('   → En self-service, llenar estos campos ESPECÍFICOS:');
    console.log('      • Puesto Solicitado: "Desarrollador Full Stack" (o cambiar si ya existe)');
    console.log('      • NSS: 12345678901 (si no lo tiene)');
    console.log('      • Domicilio: "Calle Prueba 789"');
    console.log('   → ☑ Marcar "Acepto el aviso de privacidad"');
    console.log('   → Click "Guardar borrador"');
    console.log('   → Verificar: Toast verde "Borrador guardado"');
    console.log('');
    
    console.log('4️⃣  VERIFICAR EN PANEL:');
    console.log(`   → Volver a: https://integra-rh.web.app/candidatos/${candidatoId}`);
    console.log('   → Refrescar página (F5)');
    console.log('   → Verificar que datos del self-service aparecen en perfil');
    console.log('   → Anotar campos que se sincronizaron');
    console.log('');
    
    console.log('5️⃣  ANALISTA EDITA:');
    console.log('   → En panel, ir a "Historial Laboral"');
    console.log('   → Agregar o editar un trabajo:');
    console.log('      • Empresa: "Test Corp"');
    console.log('      • Puesto: "Líder Técnico"');
    console.log('   → Click "Guardar"');
    console.log('   → Verificar badge "(editado)" aparece');
    console.log('');
    
    console.log('6️⃣  CANDIDATO REABRE SELF-SERVICE:');
    console.log('   → Volver a self-service');
    console.log('   → Refrescar página (F5)');
    console.log('   → Verificar que ve el trabajo agregado por analista');
    console.log('');
    
    console.log('7️⃣  CANDIDATO RE-EDITA:');
    console.log('   → Cambiar nuevamente un campo (ej. Puesto)');
    console.log('   → Click "Guardar borrador"');
    console.log('   → Reabre panel analista');
    console.log('   → Verificar que cambios candidato aparecen');
    console.log('');
    
    console.log('\n✅ CHECKLIST ESPERADO (TODOS DEBEN PASAR):');
    console.log('─'.repeat(70));
    console.log('☐ Self-service se abre sin errores');
    console.log('☐ Datos se guardan (toast verde)');
    console.log('☐ Al reabre panel, datos del candidato están presentes');
    console.log('☐ Checkbox "Acepto" está marcado en panel');
    console.log('☐ Badge "✅ ACEPTÓ TÉRMINOS (fecha)" visible');
    console.log('☐ Analista puede editar historial laboral');
    console.log('☐ Badge "(editado)" aparece después editar');
    console.log('☐ Candidato ve cambios de analista al reabre');
    console.log('☐ Ciclo bidireccional funciona completo');
    console.log('');
    
    console.log('\n⚠️  PUNTOS DE CONTROL TÉCNICO:');
    console.log('─'.repeat(70));
    console.log('DevTools Network:');
    console.log('  → POST /api/candidate-save-full-draft → Status 200');
    console.log('  → Request payload contiene perfil.generales.* (TODOS los campos)');
    console.log('  → Response: { ok: true }');
    console.log('');
    console.log('DevTools Console:');
    console.log('  → Sin errores (rojo)');
    console.log('  → Logs de "Draft saved" pueden aparecer');
    console.log('');
    console.log('Almacenamiento:');
    console.log('  → DevTools → Application → localStorage');
    console.log('  → Clave: self-service-{token}');
    console.log('  → Debe contener datos del formulario');
    console.log('');
    
    console.log('\n🔗 ENLACES ÚTILES:');
    console.log('─'.repeat(70));
    console.log(`Panel Candidato:   https://integra-rh.web.app/candidatos/${candidatoId}`);
    console.log('Documentación:     Checkpoints/GUIA-PRUEBA-E2E-SYNC.md');
    console.log('Script validación: scripts/test-sync.mjs');
    console.log('');
    
    console.log('\n📊 RESUMEN:');
    console.log('─'.repeat(70));
    console.log('Esta prueba valida el flujo END-TO-END completo:');
    console.log('  1. Candidato → Self-Service → BD');
    console.log('  2. Analista panel → Edita → BD');
    console.log('  3. Candidato → Reabre → Ve cambios');
    console.log('');
    console.log('Si TODOS los pasos funcionan → Sincronización bidireccional ✅');
    console.log('Si alguno FALLA → Revisar logs/DevTools para diagóstico');
    console.log('');
    console.log('═'.repeat(70));
    console.log('\n¡Iniciando prueba manual en: https://integra-rh.web.app/candidatos/57\n');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
