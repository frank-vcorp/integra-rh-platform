/**
 * Script de prueba para generar un token de acceso de cliente
 * Uso: tsx scripts/test-client-token.ts
 */

import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { clients, clientAccessTokens } from "../drizzle/schema";
import { generateClientAccessToken } from "../server/lib/clientAccessTokens";

async function testClientToken() {
  console.log("🧪 Iniciando prueba de sistema de tokens de cliente...\n");

  // Conectar a la base de datos
  const db = drizzle(process.env.DATABASE_URL!);

  try {
    // 1. Buscar o crear un cliente de prueba
    console.log("1️⃣ Buscando cliente existente...");
    let clientsList = await db.select().from(clients).limit(1);
    
    let testClient;
    if (clientsList.length === 0) {
      console.log("   No hay clientes. Creando cliente de prueba...");
      const [newClient] = await db.insert(clients).values({
        nombreEmpresa: "Empresa Demo S.A. de C.V.",
        contacto: "Juan Pérez",
        email: "juan.perez@empresademo.com",
        telefono: "5512345678",
        ubicacionPlaza: "CDMX",
        reclutador: "Paula León",
      });
      testClient = (await db.select().from(clients).where(eq(clients.id, newClient.insertId)))[0];
      console.log(`   ✅ Cliente creado: ${testClient.nombreEmpresa} (ID: ${testClient.id})`);
    } else {
      testClient = clientsList[0];
      console.log(`   ✅ Cliente encontrado: ${testClient.nombreEmpresa} (ID: ${testClient.id})`);
    }

    // 2. Generar token de acceso
    console.log("\n2️⃣ Generando token de acceso...");
    const token = await generateClientAccessToken(testClient.id);
    console.log(`   ✅ Token generado: ${token}`);

    // 3. Verificar que el token se guardó en la base de datos
    console.log("\n3️⃣ Verificando token en base de datos...");
    const tokenRecord = await db
      .select()
      .from(clientAccessTokens)
      .where(eq(clientAccessTokens.token, token))
      .limit(1);
    
    if (tokenRecord.length > 0) {
      console.log(`   ✅ Token encontrado en BD`);
      console.log(`   📅 Expira: ${tokenRecord[0].expiresAt}`);
    }

    // 4. Generar URL de acceso
    const baseUrl = process.env.VITE_APP_URL || "https://3000-i0pf9h5ekofypiaphazkp-8317efc8.manusvm.computer";
    const accessUrl = `${baseUrl}/cliente/${token}`;

    console.log("\n" + "=".repeat(80));
    console.log("🎉 ¡PRUEBA EXITOSA!");
    console.log("=".repeat(80));
    console.log("\n📋 INFORMACIÓN DEL CLIENTE:");
    console.log(`   Nombre: ${testClient.nombreEmpresa}`);
    console.log(`   Email: ${testClient.email}`);
    console.log(`   ID: ${testClient.id}`);
    console.log("\n🔗 ENLACE DE ACCESO:");
    console.log(`\n   ${accessUrl}\n`);
    console.log("=".repeat(80));
    console.log("\n💡 INSTRUCCIONES:");
    console.log("   1. Copia el enlace de arriba");
    console.log("   2. Pégalo en tu navegador");
    console.log("   3. Deberías ver el dashboard del cliente");
    console.log("   4. El token expira en 30 días");
    console.log("\n");

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }

  process.exit(0);
}

testClientToken();
