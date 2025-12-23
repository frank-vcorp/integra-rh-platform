import { getDb } from "../server/db";

/**
 * Script para listar candidatos disponibles para testing de self-service.
 * Uso: npx tsx scripts/list-candidates.ts
 */

async function main() {
  try {
    const db = getDb();
    
    // Obtener primeros 10 candidatos
    const candidates = await db.database.query.candidates.findMany({
      limit: 10,
      columns: {
        id: true,
        nombreCompleto: true,
        email: true,
        estado: true,
      },
    });

    if (candidates.length === 0) {
      console.log("❌ No hay candidatos en la base de datos");
      process.exit(1);
    }

    console.log("\n📋 CANDIDATOS DISPONIBLES:\n");
    console.log("ID\tNombre\t\t\t\tEmail\t\t\t\tEstado");
    console.log("---\t-----\t\t\t\t-----\t\t\t\t------");
    
    candidates.forEach((c: any) => {
      const name = (c.nombreCompleto || "").padEnd(30);
      const email = (c.email || "").padEnd(30);
      const estado = c.estado || "---";
      console.log(`${c.id}\t${name}\t${email}\t${estado}`);
    });

    console.log("\n💡 Para generar enlace: npx tsx scripts/test-selfservice.ts <candidateId>");

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
