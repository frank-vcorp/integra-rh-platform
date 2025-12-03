import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import "dotenv/config";

if (!process.env.DATABASE_URL) {
  throw new Error("La variable de entorno DATABASE_URL no está definida.");
}

// Crea el pool de conexiones
export const connection = mysql.createPool(process.env.DATABASE_URL);

// Crea la instancia de Drizzle
export const db = drizzle(connection);