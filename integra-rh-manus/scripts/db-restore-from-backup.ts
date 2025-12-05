import fs from "fs/promises";
import path from "path";
import "dotenv/config";
import { db, connection } from "./db";
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

type AnyRow = Record<string, any>;

async function readJson<T = unknown>(p: string): Promise<T> {
  const raw = await fs.readFile(p, "utf8");
  return JSON.parse(raw) as T;
}

async function getLatestBackupDir(): Promise<string> {
  const base = path.join(process.cwd(), "backups");
  const entries = await fs.readdir(base, { withFileTypes: true });
  const dirs = entries
    .filter((e) => e.isDirectory() && e.name.startsWith("db-"))
    .map((e) => e.name)
    .sort();

  if (dirs.length === 0) {
    throw new Error("No se encontraron carpetas en ./backups/db-*/");
  }

  return path.join(base, dirs[dirs.length - 1]);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no está definida; apunta primero a la base destino (Railway).");
  }

  const backupDir = await getLatestBackupDir();
  console.log("[restore] Restaurando datos desde:", backupDir);

  const load = async (name: string) =>
    readJson<AnyRow[]>(path.join(backupDir, `${name}.json`));

  const [
    usersRows,
    clientsRows,
    postsRows,
    candidatesRows,
    workHistoryRows,
    candidateCommentsRows,
    processesRows,
    processCommentsRows,
    documentsRows,
    surveyorsRows,
    paymentsRows,
  ] = await Promise.all([
    load("users"),
    load("clients"),
    load("posts"),
    load("candidates"),
    load("workHistory"),
    load("candidateComments"),
    load("processes"),
    load("processComments"),
    load("documents"),
    load("surveyors"),
    load("payments"),
  ]);

  console.log("[restore] Limpiando tablas destino...");
  await db.execute("SET FOREIGN_KEY_CHECKS = 0;");
  await db.execute("TRUNCATE TABLE payments;");
  await db.execute("TRUNCATE TABLE surveyorMessages;");
  await db.execute("TRUNCATE TABLE surveyors;");
  await db.execute("TRUNCATE TABLE documents;");
  await db.execute("TRUNCATE TABLE processComments;");
  await db.execute("TRUNCATE TABLE processes;");
  await db.execute("TRUNCATE TABLE candidateComments;");
  await db.execute("TRUNCATE TABLE workHistory;");
  await db.execute("TRUNCATE TABLE candidates;");
  await db.execute("TRUNCATE TABLE posts;");
  await db.execute("TRUNCATE TABLE clients;");
  await db.execute("TRUNCATE TABLE users;");
  await db.execute("SET FOREIGN_KEY_CHECKS = 1;");
  console.log("[restore] Tablas limpiadas.");

  console.log("[restore] Insertando usuarios...", usersRows.length);
  for (const row of usersRows) {
    const r = { ...row } as AnyRow;
    if (r.createdAt) r.createdAt = new Date(r.createdAt);
    if (r.updatedAt) r.updatedAt = new Date(r.updatedAt);
    if (r.lastSignedIn) r.lastSignedIn = new Date(r.lastSignedIn);
    await db.insert(users).values(r as any);
  }

  console.log("[restore] Insertando clientes...", clientsRows.length);
  for (const row of clientsRows) {
    const r = { ...row } as AnyRow;
    if (r.createdAt) r.createdAt = new Date(r.createdAt);
    if (r.updatedAt) r.updatedAt = new Date(r.updatedAt);
    await db.insert(clients).values(r as any);
  }

  console.log("[restore] Insertando puestos...", postsRows.length);
  for (const row of postsRows) {
    const r = { ...row } as AnyRow;
    if (r.createdAt) r.createdAt = new Date(r.createdAt);
    if (r.updatedAt) r.updatedAt = new Date(r.updatedAt);
    await db.insert(posts).values(r as any);
  }

  console.log("[restore] Insertando encuestadores...", surveyorsRows.length);
  for (const row of surveyorsRows) {
    const r = { ...row } as AnyRow;
    if (r.createdAt) r.createdAt = new Date(r.createdAt);
    if (r.updatedAt) r.updatedAt = new Date(r.updatedAt);
    await db.insert(surveyors).values(r as any);
  }

  console.log("[restore] Insertando candidatos...", candidatesRows.length);
  for (const row of candidatesRows) {
    const r = { ...row } as AnyRow;
    if (r.createdAt) r.createdAt = new Date(r.createdAt);
    if (r.updatedAt) r.updatedAt = new Date(r.updatedAt);
    await db.insert(candidates).values(r as any);
  }

  console.log("[restore] Insertando historial laboral...", workHistoryRows.length);
  for (const row of workHistoryRows) {
    const r = { ...row } as AnyRow;
    if (r.createdAt) r.createdAt = new Date(r.createdAt);
    if (r.updatedAt) r.updatedAt = new Date(r.updatedAt);
    await db.insert(workHistory).values(r as any);
  }

  console.log("[restore] Insertando comentarios de candidato...", candidateCommentsRows.length);
  for (const row of candidateCommentsRows) {
    const r = { ...row } as AnyRow;
    if (r.createdAt) r.createdAt = new Date(r.createdAt);
    await db.insert(candidateComments).values(r as any);
  }

  console.log("[restore] Insertando procesos...", processesRows.length);
  for (const row of processesRows) {
    const r = { ...row } as AnyRow;
    if (r.fechaRecepcion) r.fechaRecepcion = new Date(r.fechaRecepcion);
    if (r.fechaCierre) r.fechaCierre = new Date(r.fechaCierre);
    if (r.fechaEnvio) r.fechaEnvio = new Date(r.fechaEnvio);
    if (r.arrivalDateTime) r.arrivalDateTime = new Date(r.arrivalDateTime);
    if (r.createdAt) r.createdAt = new Date(r.createdAt);
    if (r.updatedAt) r.updatedAt = new Date(r.updatedAt);
    await db.insert(processes).values(r as any);
  }

  console.log("[restore] Insertando comentarios de proceso...", processCommentsRows.length);
  for (const row of processCommentsRows) {
    const r = { ...row } as AnyRow;
    if (r.createdAt) r.createdAt = new Date(r.createdAt);
    await db.insert(processComments).values(r as any);
  }

  console.log("[restore] Insertando documentos...", documentsRows.length);
  for (const row of documentsRows) {
    const r = { ...row } as AnyRow;
    if (r.createdAt) r.createdAt = new Date(r.createdAt);
    await db.insert(documents).values(r as any);
  }

  console.log("[restore] Insertando pagos...", paymentsRows.length);
  for (const row of paymentsRows) {
    const r = { ...row } as AnyRow;
    if (r.fechaPago) r.fechaPago = new Date(r.fechaPago);
    if (r.createdAt) r.createdAt = new Date(r.createdAt);
    if (r.updatedAt) r.updatedAt = new Date(r.updatedAt);
    await db.insert(payments).values(r as any);
  }

  console.log("[restore] Restauración completada.");
}

main()
  .catch((err) => {
    console.error("[restore] Error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await connection.end();
  });
