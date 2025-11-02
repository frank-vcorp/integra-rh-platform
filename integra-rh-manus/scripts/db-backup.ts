import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import fs from "node:fs";
import path from "node:path";
import "dotenv/config";
import {
  users,
  clients,
  posts,
  candidates,
  workHistory,
  candidateComments,
  processes,
  processComments,
  documents,
  surveyors,
  payments,
} from "../drizzle/schema";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL no está configurada en .env");
  }

  const conn = await mysql.createConnection(url);
  const db = drizzle(conn);

  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const dir = path.resolve(process.cwd(), "backups", `db-${stamp}`);
  await fs.promises.mkdir(dir, { recursive: true });

  async function dump(name: string, rows: any[]) {
    const file = path.join(dir, `${name}.json`);
    await fs.promises.writeFile(file, JSON.stringify(rows, null, 2), "utf8");
    console.log(`[backup] ${name} → ${file} (${rows.length} registros)`);
  }

  await dump("users", await db.select().from(users));
  await dump("clients", await db.select().from(clients));
  await dump("posts", await db.select().from(posts));
  await dump("candidates", await db.select().from(candidates));
  await dump("workHistory", await db.select().from(workHistory));
  await dump("candidateComments", await db.select().from(candidateComments));
  await dump("processes", await db.select().from(processes));
  await dump("processComments", await db.select().from(processComments));
  await dump("documents", await db.select().from(documents));
  try {
    await dump("surveyors", await db.select().from(surveyors));
  } catch {
    const [rows] = await conn.query<any[]>("SELECT * FROM surveyors");
    await dump("surveyors", rows);
  }
  await dump("payments", await db.select().from(payments));

  await conn.end();
}

main().catch((err) => {
  console.error("[backup] Error:", err);
  process.exit(1);
});
