import { createClientAccessToken } from '../server/auth/clientTokens';

async function main() {
  console.log('🎬 Creando demostración del portal de cliente...\n');
  
  // Cliente de prueba existente
  const clientId = 30001;
  
  console.log('1️⃣ Generando token de acceso...');
  const token = await createClientAccessToken(clientId, 30);
  console.log(`   ✅ Token: ${token}\n`);
  
  const baseUrl = 'https://3000-i0pf9h5ekofypiaphazkp-8317efc8.manusvm.computer';
  const accessUrl = `${baseUrl}/cliente/${token}`;
  
  console.log('================================================================================');
  console.log('🔗 ENLACE DE ACCESO PARA CLIENTE:');
  console.log('================================================================================');
  console.log(accessUrl);
  console.log('================================================================================\n');
  console.log('📋 Cliente: Empresa Demo S.A. de C.V.');
  console.log('⏰ Válido por: 30 días');
  console.log('\n💡 Abre este enlace en tu navegador para ver el portal del cliente');
}

main().catch(console.error);
