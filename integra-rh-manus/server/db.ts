import { eq, and, desc, asc, like, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
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
  auditLogs,
  InsertAuditLog,
  candidateConsents,
  InsertCandidateConsent,
  roles,
  InsertRole,
  rolePermissions,
  InsertRolePermission,
  userRoles,
  InsertUserRole,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (_db) return _db;

  try {
    if (!process.env.DATABASE_URL) {
      console.warn("[Database] DATABASE_URL not set.");
      return null;
    }

    console.log("[Database] Initializing MySQL pool from DATABASE_URL.");
    const pool = mysql.createPool(process.env.DATABASE_URL);
    _db = drizzle(pool);
  } catch (error) {
    console.error("[Database] Failed to initialize database connection:", error);
    _db = null;
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

    const textFields = ["name", "email", "loginMethod", "whatsapp"] as const;
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
// ROLES Y PERMISOS
// ============================================================================

export async function getAllRolesWithPermissions() {
  const db = await getDb();
  if (!db) return [];
  const rolesList = await db.select().from(roles).orderBy(asc(roles.name));
  const perms = await db.select().from(rolePermissions);
  const byRole: Record<number, InsertRolePermission[]> = {};
  for (const p of perms) {
    const rid = p.roleId as number;
    if (!byRole[rid]) byRole[rid] = [];
    byRole[rid].push(p as any);
  }
  return rolesList.map((r) => ({
    ...r,
    permissions: byRole[r.id] ?? [],
  }));
}

type SimplePermissionInput = {
  module: string;
  action: "view" | "create" | "edit" | "delete";
  allowed?: boolean;
};

export async function createRoleWithPermissions(input: {
  name: string;
  description?: string | null;
  permissions?: SimplePermissionInput[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db
    .insert(roles)
    .values({
      name: input.name,
      description: input.description ?? null,
    } as InsertRole)
    .execute();
  const roleId = (result as any).insertId as number;

  if (input.permissions && input.permissions.length > 0) {
    await db
      .insert(rolePermissions)
      .values(
        input.permissions.map((p) => ({
          roleId,
          module: p.module,
          action: p.action,
          allowed: p.allowed ?? true,
        })) as InsertRolePermission[]
      )
      .execute();
  }

  return roleId;
}

export async function updateRoleWithPermissions(
  id: number,
  input: {
    name?: string;
    description?: string | null;
    permissions?: SimplePermissionInput[];
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const patch: Partial<InsertRole> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (Object.keys(patch).length > 0) {
    await db.update(roles).set(patch).where(eq(roles.id, id));
  }

  if (input.permissions) {
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));
    if (input.permissions.length > 0) {
      await db
        .insert(rolePermissions)
        .values(
          input.permissions.map((p) => ({
            roleId: id,
            module: p.module,
            action: p.action,
            allowed: p.allowed ?? true,
          })) as InsertRolePermission[]
        )
        .execute();
    }
  }
}

export async function deleteRole(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(roles).where(eq(roles.id, id));
}

export async function getUserRoles(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(userRoles)
    .where(eq(userRoles.userId, userId));
  return rows;
}

export async function setUserRoles(userId: number, roleIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(userRoles).where(eq(userRoles.userId, userId));
  if (roleIds.length === 0) return;
  await db
    .insert(userRoles)
    .values(
      roleIds.map((rid) => ({
        userId,
        roleId: rid,
      })) as InsertUserRole[]
    )
    .execute();
}

export async function getUserEffectivePermissions(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      module: rolePermissions.module,
      action: rolePermissions.action,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .where(and(eq(userRoles.userId, userId), eq(rolePermissions.allowed, true)));

  return rows;
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
// PLAZAS / SUCURSALES DE CLIENTE
// ============================================================================

import { clientSites, InsertClientSite } from "../drizzle/schema";

export async function getClientSitesByClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(clientSites)
    .where(and(eq(clientSites.clientId, clientId), eq(clientSites.activo, true)))
    .orderBy(asc(clientSites.nombrePlaza));
}

export async function createClientSite(data: InsertClientSite) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(clientSites).values(data).execute();
  return (result as any).insertId as number;
}

export async function getClientSiteById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(clientSites)
    .where(eq(clientSites.id, id))
    .limit(1);
  return rows[0] ?? undefined;
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

export async function getCandidatesWithInvestigationProgress(clienteId?: number) {
  const db = await getDb();
  if (!db) return [];

  const baseCandidates = clienteId
    ? await db
        .select()
        .from(candidates)
        .where(eq(candidates.clienteId, clienteId))
        .orderBy(desc(candidates.createdAt))
    : await db.select().from(candidates).orderBy(desc(candidates.createdAt));

  if (baseCandidates.length === 0) return [];

  const candidateIds = baseCandidates.map((c) => c.id);
  const allWorkHistory = await db
    .select()
    .from(workHistory)
    .where(inArray(workHistory.candidatoId, candidateIds));

  return baseCandidates.map((c) => {
    const items = allWorkHistory.filter((w) => w.candidatoId === c.id);
    if (items.length === 0) {
      return { ...c, investigacionProgreso: 0 };
    }
    const total = items.length;
    const terminados = items.filter(
      (w) => w.estatusInvestigacion === "terminado"
    ).length;
    const revisados = items.filter(
      (w) => w.estatusInvestigacion === "revisado"
    ).length;
    const pesoTerminado = 1;
    const pesoRevisado = 0.5;
    const avance =
      (terminados * pesoTerminado + revisados * pesoRevisado) / total;
    const porcentaje = Math.round(avance * 100);
    return { ...c, investigacionProgreso: porcentaje };
  });
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

// ============================================================================
// AUDITORÍA
// ============================================================================

export async function createAuditLog(entry: InsertAuditLog) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create audit log: database not available");
    return;
  }
  await db.insert(auditLogs).values(entry);
}

// ============================================================================
// CANDIDATE CONSENTS
// ============================================================================

export async function createCandidateConsent(data: InsertCandidateConsent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(candidateConsents).values(data);
  return result[0].insertId;
}

export async function getLatestPendingConsentByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(candidateConsents)
    .where(and(eq(candidateConsents.token, token), eq(candidateConsents.isGiven, false)))
    .orderBy(desc(candidateConsents.createdAt))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateCandidateConsent(id: number, data: Partial<InsertCandidateConsent>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(candidateConsents).set(data).where(eq(candidateConsents.id, id));
}

export async function getLatestConsentByCandidateId(candidateId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(candidateConsents)
    .where(eq(candidateConsents.candidatoId, candidateId))
    .orderBy(desc(candidateConsents.createdAt))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}
