import { migrate } from "drizzle-orm/mysql2/migrator";
import { db, connection } from "./db.ts";

async function main() {
  console.log("Ejecutando migraciones...");
  
  await migrate(db, { migrationsFolder: "drizzle" });
  
  console.log("¡Migraciones completadas con éxito!");
  
  // Cierra el pool de conexiones para que el script termine
  await connection.end();
}

main().catch((error) => {
  console.error("Error durante la migración:", error);
  process.exit(1);
});