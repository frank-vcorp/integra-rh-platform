import { getDb } from "../server/db";

/**
 * Script para generar un enlace de self-service de prueba.
 * Uso: npx tsx scripts/test-selfservice.ts <candidateId>
 */

async function main() {
  const candidateIdArg = process.argv[2];
  
  if (!candidateIdArg) {
    console.log("❌ Uso: npx tsx scripts/test-selfservice.ts <candidateId>");
    console.log("\nPrimero, obtén el ID de un candidato:");
    console.log("  SELECT id, nombreCompleto FROM candidates LIMIT 5;");
    process.exit(1);
  }

  const candidateId = parseInt(candidateIdArg, 10);
  if (isNaN(candidateId)) {
    console.error("❌ candidateId debe ser un número");
    process.exit(1);
  }

  try {
    const db = getDb();
    
    // Verificar que el candidato existe
    const candidate = await db.getCandidateById(candidateId);
    if (!candidate) {
      console.error(`❌ Candidato con ID ${candidateId} no encontrado`);
      process.exit(1);
    }

    console.log(`✅ Candidato: ${candidate.nombreCompleto} (ID: ${candidateId})`);

    // Crear token
    const { token, expiresAt } = await db.createCandidateSelfToken(candidateId, 6);
    
    const baseUrl = process.env.PUBLIC_BASE_URL || "https://integra-rh.web.app";
    const url = `${baseUrl.replace(/\/$/, "")}/pre-registro/${token}`;

    console.log("\n📝 ENLACE DE SELF-SERVICE GENERADO:\n");
    console.log(`URL: ${url}`);
    console.log(`\nToken: ${token}`);
    console.log(`Válido hasta: ${expiresAt}`);
    console.log("\n✨ Copia la URL y comparte con el candidato");

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
