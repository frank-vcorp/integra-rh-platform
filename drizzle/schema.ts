import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";

/**
 * INTEGRA-RH Database Schema
 * Sistema de gestión de recursos humanos para consultora Paula León
 */

// ============================================================================
// TABLA DE USUARIOS (Core - Ya existe pero extendida)
// ============================================================================

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "client"]).default("admin").notNull(),
  // Para clientes empresariales: referencia al cliente
  clientId: int("clientId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================================
// CLIENTES EMPRESARIALES
// ============================================================================

export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  nombreEmpresa: varchar("nombreEmpresa", { length: 255 }).notNull(),
  ubicacionPlaza: varchar("ubicacionPlaza", { length: 255 }),
  reclutador: varchar("reclutador", { length: 255 }),
  contacto: varchar("contacto", { length: 255 }),
  telefono: varchar("telefono", { length: 50 }),
  email: varchar("email", { length: 320 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// ============================================================================
// PUESTOS DE TRABAJO
// ============================================================================

export const posts = mysqlTable("posts", {
  id: int("id").autoincrement().primaryKey(),
  nombreDelPuesto: varchar("nombreDelPuesto", { length: 255 }).notNull(),
  clienteId: int("clienteId").notNull(),
  descripcion: text("descripcion"),
  estatus: mysqlEnum("estatus", ["activo", "cerrado", "pausado"]).default("activo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;

// ============================================================================
// CANDIDATOS
// ============================================================================

export const candidates = mysqlTable("candidates", {
  id: int("id").autoincrement().primaryKey(),
  nombreCompleto: varchar("nombreCompleto", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  telefono: varchar("telefono", { length: 50 }),
  medioDeRecepcion: varchar("medioDeRecepcion", { length: 100 }),
  clienteId: int("clienteId"),
  puestoId: int("puestoId"),
  // Datos de psicométricos (almacenados como JSON)
  psicometricos: json("psicometricos").$type<{
    clavePsicometricas?: string;
    estatus?: string;
    fechaAsignacion?: string;
    fechaEnvio?: string;
    fechaFinalizacion?: string;
    resultadosJson?: any;
    resultadoPdfUrl?: string;
    resultadoPdfPath?: string;
  }>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Candidate = typeof candidates.$inferSelect;
export type InsertCandidate = typeof candidates.$inferInsert;

// ============================================================================
// HISTORIAL LABORAL (Subentidad de Candidatos)
// ============================================================================

export const workHistory = mysqlTable("workHistory", {
  id: int("id").autoincrement().primaryKey(),
  candidatoId: int("candidatoId").notNull(),
  empresa: varchar("empresa", { length: 255 }).notNull(),
  puesto: varchar("puesto", { length: 255 }),
  fechaInicio: varchar("fechaInicio", { length: 50 }),
  fechaFin: varchar("fechaFin", { length: 50 }),
  tiempoTrabajado: varchar("tiempoTrabajado", { length: 100 }),
  contactoReferencia: varchar("contactoReferencia", { length: 255 }),
  telefonoReferencia: varchar("telefonoReferencia", { length: 50 }),
  correoReferencia: varchar("correoReferencia", { length: 320 }),
  resultadoVerificacion: mysqlEnum("resultadoVerificacion", [
    "pendiente",
    "recomendable",
    "con_reservas",
    "no_recomendable"
  ]).default("pendiente"),
  observaciones: text("observaciones"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkHistory = typeof workHistory.$inferSelect;
export type InsertWorkHistory = typeof workHistory.$inferInsert;

// ============================================================================
// COMENTARIOS (Subentidad de Candidatos)
// ============================================================================

export const candidateComments = mysqlTable("candidateComments", {
  id: int("id").autoincrement().primaryKey(),
  candidatoId: int("candidatoId").notNull(),
  text: text("text").notNull(),
  author: varchar("author", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CandidateComment = typeof candidateComments.$inferSelect;
export type InsertCandidateComment = typeof candidateComments.$inferInsert;

// ============================================================================
// PROCESOS DE EVALUACIÓN
// ============================================================================

export const processes = mysqlTable("processes", {
  id: int("id").autoincrement().primaryKey(),
  candidatoId: int("candidatoId").notNull(),
  clienteId: int("clienteId").notNull(),
  puestoId: int("puestoId").notNull(),
  // Clave única del proceso (ej: ILA-2025-001, ESE-2025-015)
  clave: varchar("clave", { length: 50 }).notNull().unique(),
  // Tipo de producto: ILA (Investigación Laboral) o ESE (Estudio Socioeconómico)
  tipoProducto: mysqlEnum("tipoProducto", ["ILA", "ESE"]).notNull(),
  consecutivo: int("consecutivo").notNull(),
  fechaRecepcion: timestamp("fechaRecepcion").notNull(),
  fechaEnvio: timestamp("fechaEnvio"),
  quienEnvio: varchar("quienEnvio", { length: 255 }),
  estatusProceso: mysqlEnum("estatusProceso", [
    "en_recepcion",
    "asignado",
    "en_verificacion",
    "visita_programada",
    "visita_realizada",
    "en_dictamen",
    "finalizado",
    "entregado"
  ]).default("en_recepcion").notNull(),
  calificacionFinal: mysqlEnum("calificacionFinal", [
    "pendiente",
    "recomendable",
    "con_reservas",
    "no_recomendable"
  ]).default("pendiente"),
  archivoDictamenUrl: varchar("archivoDictamenUrl", { length: 500 }),
  archivoDictamenPath: varchar("archivoDictamenPath", { length: 500 }),
  shareableId: varchar("shareableId", { length: 100 }),
  arrivalDateTime: timestamp("arrivalDateTime"),
  // Estatus de visita domiciliaria (almacenado como JSON)
  visitStatus: json("visitStatus").$type<{
    status?: "no_asignada" | "asignada" | "programada" | "realizada";
    scheduledDateTime?: string;
    encuestadorId?: number;
    direccion?: string;
    observaciones?: string;
  }>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Process = typeof processes.$inferSelect;
export type InsertProcess = typeof processes.$inferInsert;

// ============================================================================
// COMENTARIOS DE PROCESOS
// ============================================================================

export const processComments = mysqlTable("processComments", {
  id: int("id").autoincrement().primaryKey(),
  procesoId: int("procesoId").notNull(),
  text: text("text").notNull(),
  author: varchar("author", { length: 255 }).notNull(),
  processStatusAtTime: varchar("processStatusAtTime", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProcessComment = typeof processComments.$inferSelect;
export type InsertProcessComment = typeof processComments.$inferInsert;

// ============================================================================
// ENCUESTADORES
// ============================================================================

export const surveyors = mysqlTable("surveyors", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  telefono: varchar("telefono", { length: 50 }),
  email: varchar("email", { length: 320 }),
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Surveyor = typeof surveyors.$inferSelect;
export type InsertSurveyor = typeof surveyors.$inferInsert;

// ============================================================================
// PAGOS A ENCUESTADORES
// ============================================================================

export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  procesoId: int("procesoId").notNull(),
  encuestadorId: int("encuestadorId").notNull(),
  monto: int("monto").notNull(), // Monto en centavos (ej: 50000 = $500.00 MXN)
  fechaPago: timestamp("fechaPago"),
  estatusPago: mysqlEnum("estatusPago", ["pendiente", "pagado"]).default("pendiente").notNull(),
  metodoPago: varchar("metodoPago", { length: 100 }),
  observaciones: text("observaciones"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

// ============================================================================
// DOCUMENTOS
// ============================================================================

export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  candidatoId: int("candidatoId"),
  procesoId: int("procesoId"),
  tipoDocumento: varchar("tipoDocumento", { length: 100 }).notNull(),
  nombreArchivo: varchar("nombreArchivo", { length: 255 }).notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  tamanio: int("tamanio"), // Tamaño en bytes
  uploadedBy: varchar("uploadedBy", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;
