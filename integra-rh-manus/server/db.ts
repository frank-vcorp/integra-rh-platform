import { eq, and, desc, asc, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  clients,
  InsertClient,
  posts,
  InsertPost,
  candidates,
  InsertCandidate,
  workHistory,
  InsertWorkHistory,
  candidateComments,
  InsertCandidateComment,
  processes,
  InsertProcess,
  processComments,
  InsertProcessComment,
  surveyors,
  InsertSurveyor,
  payments,
  InsertPayment,
  documents,
  InsertDocument,
  surveyorMessages,
  InsertSurveyorMessage,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { sql } from 'drizzle-orm';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================================================
// USUARIOS
// ============================================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (user.clientId !== undefined) {
      values.clientId = user.clientId;
      updateSet.clientId = user.clientId;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUser(data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Generar un openId temporal para usuarios creados manualmente
  const openId = data.email || `user-${Date.now()}`;
  const result = await db.insert(users).values({ ...data, openId });
  return result[0].insertId;
}

export async function updateUser(id: number, data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set(data).where(eq(users.id, id));
}

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(users).where(eq(users.id, id));
}

// ============================================================================
// CLIENTES
// ============================================================================

export async function getAllClients() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clients).orderBy(desc(clients.createdAt));
}

export async function getClientById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createClient(data: InsertClient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(clients).values(data);
  return result[0].insertId;
}

export async function updateClient(id: number, data: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clients).set(data).where(eq(clients.id, id));
}

export async function deleteClient(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(clients).where(eq(clients.id, id));
}

// ============================================================================
// PUESTOS
// ============================================================================

export async function getAllPosts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(posts).orderBy(desc(posts.createdAt));
}

export async function getPostsByClient(clienteId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(posts).where(eq(posts.clienteId, clienteId)).orderBy(desc(posts.createdAt));
}

export async function getPostById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createPost(data: InsertPost) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(posts).values(data);
  return result[0].insertId;
}

export async function updatePost(id: number, data: Partial<InsertPost>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(posts).set(data).where(eq(posts.id, id));
}

export async function deletePost(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(posts).where(eq(posts.id, id));
}

// ============================================================================
// CANDIDATOS
// ============================================================================

export async function getAllCandidates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(candidates).orderBy(desc(candidates.createdAt));
}

export async function getCandidatesByClient(clienteId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(candidates).where(eq(candidates.clienteId, clienteId)).orderBy(desc(candidates.createdAt));
}

export async function getCandidateById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(candidates).where(eq(candidates.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Buscar candidato por la clave de psicométricas almacenada en el JSON psicometricos.clavePsicometricas
export async function getCandidateByPsicoClave(clave: string) {
  const db = await getDb();
  if (!db) return undefined;
  // Uso de SQL nativo para JSON_EXTRACT
  const rows: any = await (db as any).execute(
    sql`SELECT * FROM candidates WHERE JSON_EXTRACT(psicometricos, '$.clavePsicometricas') = ${clave} LIMIT 1`
  );
  // drizzle-mysql2 devuelve diferente forma según driver; normalizamos
  const arr = Array.isArray(rows) ? rows : rows[0];
  return arr && arr.length > 0 ? (arr[0] as any) : undefined;
}

export async function createCandidate(data: InsertCandidate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(candidates).values(data);
  return result[0].insertId;
}

export async function updateCandidate(id: number, data: Partial<InsertCandidate>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(candidates).set(data).where(eq(candidates.id, id));
}

export async function deleteCandidate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(candidates).where(eq(candidates.id, id));
}

// ============================================================================
// HISTORIAL LABORAL
// ============================================================================

export async function getWorkHistoryByCandidate(candidatoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workHistory).where(eq(workHistory.candidatoId, candidatoId)).orderBy(desc(workHistory.createdAt));
}

export async function createWorkHistory(data: InsertWorkHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(workHistory).values(data);
  return result[0].insertId;
}

export async function updateWorkHistory(id: number, data: Partial<InsertWorkHistory>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(workHistory).set(data).where(eq(workHistory.id, id));
}

export async function deleteWorkHistory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(workHistory).where(eq(workHistory.id, id));
}

// ============================================================================
// COMENTARIOS DE CANDIDATOS
// ============================================================================

export async function getCandidateComments(candidatoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(candidateComments).where(eq(candidateComments.candidatoId, candidatoId)).orderBy(desc(candidateComments.createdAt));
}

export async function createCandidateComment(data: InsertCandidateComment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(candidateComments).values(data);
  return result[0].insertId;
}

// ============================================================================
// PROCESOS
// ============================================================================

export async function getAllProcesses() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(processes).orderBy(desc(processes.createdAt));
}

export async function getProcessesByClient(clienteId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(processes).where(eq(processes.clienteId, clienteId)).orderBy(desc(processes.createdAt));
}

export async function getProcessesByCandidate(candidatoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(processes).where(eq(processes.candidatoId, candidatoId)).orderBy(desc(processes.createdAt));
}

export async function getProcessById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(processes).where(eq(processes.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getProcessByClave(clave: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(processes).where(eq(processes.clave, clave)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getNextConsecutive(
  tipoProducto: "ILA" | "ESE LOCAL" | "ESE FORANEO" | "VISITA LOCAL" | "VISITA FORANEA" | 
    "ILA CON BURÓ DE CRÉDITO" | "ESE LOCAL CON BURÓ DE CRÉDITO" | "ESE FORANEO CON BURÓ DE CRÉDITO" | 
    "ILA CON INVESTIGACIÓN LEGAL" | "ESE LOCAL CON INVESTIGACIÓN LEGAL" | "ESE FORANEO CON INVESTIGACIÓN LEGAL" | 
    "BURÓ DE CRÉDITO" | "INVESTIGACIÓN LEGAL" | "SEMANAS COTIZADAS",
  year: number
) {
  const db = await getDb();
  if (!db) return 1;
  
  const result = await db
    .select({ maxConsecutivo: sql<number>`MAX(${processes.consecutivo})` })
    .from(processes)
    .where(
      and(
        eq(processes.tipoProducto, tipoProducto),
        sql`YEAR(${processes.fechaRecepcion}) = ${year}`
      )
    );
  
  const max = result[0]?.maxConsecutivo;
  return max ? max + 1 : 1;
}

export async function createProcess(data: InsertProcess) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(processes).values(data);
  return result[0].insertId;
}

export async function updateProcess(id: number, data: Partial<InsertProcess>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(processes).set(data).where(eq(processes.id, id));
}

export async function deleteProcess(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(processes).where(eq(processes.id, id));
}

// ============================================================================
// COMENTARIOS DE PROCESOS
// ============================================================================

export async function getProcessComments(procesoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(processComments).where(eq(processComments.procesoId, procesoId)).orderBy(desc(processComments.createdAt));
}

export async function createProcessComment(data: InsertProcessComment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(processComments).values(data);
  return result[0].insertId;
}

// ============================================================================
// ENCUESTADORES
// ============================================================================

export async function getAllSurveyors() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(surveyors).orderBy(asc(surveyors.nombre));
}

export async function getActiveSurveyors() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(surveyors).where(eq(surveyors.activo, true)).orderBy(asc(surveyors.nombre));
}

export async function getSurveyorById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(surveyors).where(eq(surveyors.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createSurveyor(data: InsertSurveyor) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(surveyors).values(data);
  return result[0].insertId;
}

export async function updateSurveyor(id: number, data: Partial<InsertSurveyor>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(surveyors).set(data).where(eq(surveyors.id, id));
}

export async function deleteSurveyor(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(surveyors).where(eq(surveyors.id, id));
}

// ============================================================================
// PAGOS
// ============================================================================

export async function getAllPayments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payments).orderBy(desc(payments.createdAt));
}

export async function getPaymentsByProcess(procesoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payments).where(eq(payments.procesoId, procesoId)).orderBy(desc(payments.createdAt));
}

export async function getPaymentsBySurveyor(encuestadorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payments).where(eq(payments.encuestadorId, encuestadorId)).orderBy(desc(payments.createdAt));
}

export async function createPayment(data: InsertPayment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(payments).values(data);
  return result[0].insertId;
}

export async function updatePayment(id: number, data: Partial<InsertPayment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(payments).set(data).where(eq(payments.id, id));
}

// ============================================================================
// MENSAJES A ENCUESTADORES
// ============================================================================

export async function createSurveyorMessage(data: InsertSurveyorMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(surveyorMessages).values(data);
  return result[0].insertId;
}

export async function getSurveyorMessagesBySurveyor(encuestadorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(surveyorMessages).where(eq(surveyorMessages.encuestadorId, encuestadorId)).orderBy(desc(surveyorMessages.createdAt));
}

// ============================================================================
// DOCUMENTOS
// ============================================================================

export async function getDocumentsByCandidate(candidatoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documents).where(eq(documents.candidatoId, candidatoId)).orderBy(desc(documents.createdAt));
}

export async function getDocumentsByProcess(procesoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documents).where(eq(documents.procesoId, procesoId)).orderBy(desc(documents.createdAt));
}

export async function createDocument(data: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(documents).values(data);
  return result[0].insertId;
}

export async function deleteDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(documents).where(eq(documents.id, id));
}
