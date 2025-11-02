/**
 * Script para crear datos de demostración completos
 * Crea: Cliente, Candidato, Puesto, Proceso y Token de acceso
 */

import { createClientAccessToken } from '../server/auth/clientTokens';
import * as db from '../server/db';

async function main() {
  console.log('🎬 Creando datos de demostración completos...\n');
  
  // 1. Verificar cliente existente
  console.log('1️⃣ Verificando cliente...');
  const clientId = 30001;
  console.log(`   ✅ Cliente ID: ${clientId}\n`);
  
  // 2. Crear candidato de prueba
  console.log('2️⃣ Creando candidato de prueba...');
  const candidateId = await db.createCandidate({
    nombreCompleto: 'Juan Pérez García',
    clienteId: clientId,
    email: 'juan.perez@example.com',
    telefono: '5551234567',
    medioDeRecepcion: 'Correo electrónico',
  });
  console.log(`   ✅ Candidato creado ID: ${candidateId}\n`);
  
  // 3. Crear puesto de prueba
  console.log('3️⃣ Creando puesto de prueba...');
  const postId = await db.createPost({
    nombreDelPuesto: 'Gerente de Ventas',
    clienteId: clientId,
    descripcion: 'Responsable de liderar el equipo de ventas',
  });
  console.log(`   ✅ Puesto creado ID: ${postId}\n`);
  
  // 4. Crear proceso de prueba
  console.log('4️⃣ Creando proceso de prueba...');
  const fechaRecepcion = new Date();
  const year = fechaRecepcion.getFullYear();
  const consecutivo = await db.getNextConsecutive('ILA', year);
  const clave = `ILA-${year}-${String(consecutivo).padStart(3, '0')}`;
  
  const processId = await db.createProcess({
    tipoProducto: 'ILA',
    clienteId: clientId,
    candidatoId: candidateId,
    puestoId: postId,
    fechaRecepcion,
    clave,
    consecutivo,
    estatusProceso: 'en_recepcion',
    calificacionFinal: 'pendiente',
  });
  console.log(`   ✅ Proceso creado: ${clave} (ID: ${processId})\n`);
  
  // 5. Generar token de acceso
  console.log('5️⃣ Generando token de acceso...');
  const token = await createClientAccessToken(clientId, 30);
  console.log(`   ✅ Token generado\n`);
  
  const baseUrl = 'https://3000-i0pf9h5ekofypiaphazkp-8317efc8.manusvm.computer';
  const accessUrl = `${baseUrl}/cliente/${token}`;
  
  console.log('================================================================================');
  console.log('🎉 ¡DEMOSTRACIÓN LISTA!');
  console.log('================================================================================');
  console.log('📋 DATOS CREADOS:');
  console.log(`   • Cliente: Empresa Demo S.A. de C.V. (ID: ${clientId})`);
  console.log(`   • Candidato: Juan Pérez García (ID: ${candidateId})`);
  console.log(`   • Puesto: Gerente de Ventas (ID: ${postId})`);
  console.log(`   • Proceso: ILA (ID: ${processId})`);
  console.log('');
  console.log('🔗 ENLACE DE ACCESO PARA CLIENTE:');
  console.log(accessUrl);
  console.log('================================================================================');
  console.log('💡 Abre este enlace para ver el portal del cliente con datos reales');
  console.log('⏰ El token es válido por 30 días');
}

main().catch(console.error).finally(() => process.exit(0));
