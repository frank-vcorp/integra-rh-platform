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
  // Número de contacto para WhatsApp (E.164 sugerido, pero almacenamos libre)
  whatsapp: varchar("whatsapp", { length: 50 }),
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
  // Causales de salida
  causalSalidaRH: mysqlEnum("causalSalidaRH", [
    "RENUNCIA VOLUNTARIA",
    "TÉRMINO DE CONTRATO",
    "CIERRE DE LA EMPRESA",
    "JUVILACIÓN",
    "ABANDONO DE TRABAJO",
    "ACUMULACIÓN DE FALTAS",
    "BAJO DESEMPEÑO",
    "FALTA DE PROBIDAD",
    "VIOLACIÓN AL CÓDIGO DE CONDUCTA",
    "ABUSO DE CONFIANZA",
    "INCUMPLIMIENTO A POLÍTICAS Y PROCESOS"
  ]),
  causalSalidaJefeInmediato: mysqlEnum("causalSalidaJefeInmediato", [
    "RENUNCIA VOLUNTARIA",
    "TÉRMINO DE CONTRATO",
    "CIERRE DE LA EMPRESA",
    "JUVILACIÓN",
    "ABANDONO DE TRABAJO",
    "ACUMULACIÓN DE FALTAS",
    "BAJO DESEMPEÑO",
    "FALTA DE PROBIDAD",
    "VIOLACIÓN AL CÓDIGO DE CONDUCTA",
    "ABUSO DE CONFIANZA",
    "INCUMPLIMIENTO A POLÍTICAS Y PROCESOS"
  ]),
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
  visibility: mysqlEnum("visibility", ["public", "internal"]).default("internal").notNull(),
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
  // Especialista de atracción que gestiona el proceso (FK opcional o nombre libre)
  especialistaAtraccionId: int("especialistaAtraccionId"),
  especialistaAtraccionNombre: varchar("especialistaAtraccionNombre", { length: 255 }),
  // Clave única del proceso (ej: ILA-2025-001, ESE-2025-015)
  clave: varchar("clave", { length: 50 }).notNull().unique(),
  // Proceso a realizar (anteriormente "Tipo de Producto")
  tipoProducto: mysqlEnum("tipoProducto", [
    "ILA",
    "ESE LOCAL",
    "ESE FORANEO",
    "VISITA LOCAL",
    "VISITA FORANEA",
    "ILA CON BURÓ DE CRÉDITO",
    "ESE LOCAL CON BURÓ DE CRÉDITO",
    "ESE FORANEO CON BURÓ DE CRÉDITO",
    "ILA CON INVESTIGACIÓN LEGAL",
    "ESE LOCAL CON INVESTIGACIÓN LEGAL",
    "ESE FORANEO CON INVESTIGACIÓN LEGAL",
    "BURÓ DE CRÉDITO",
    "INVESTIGACIÓN LEGAL",
    "SEMANAS COTIZADAS"
  ]).notNull(),
  consecutivo: int("consecutivo").notNull(),
  fechaRecepcion: timestamp("fechaRecepcion").notNull(),
  fechaCierre: timestamp("fechaCierre"),
  fechaEnvio: timestamp("fechaEnvio"),
  quienEnvio: varchar("quienEnvio", { length: 255 }),
  // Cómo llegó el proceso (canal de recepción)
  medioDeRecepcion: mysqlEnum("medioDeRecepcion", [
    "whatsapp",
    "correo",
    "telefono",
    "boca_a_boca",
    "portal",
    "presencial",
    "otro",
  ]),
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
  // Estatus visual y detalle granular para panel de clientes
  estatusVisual: mysqlEnum("estatusVisual", [
    "nuevo",
    "en_proceso",
    "pausado",
    "cerrado",
    "descartado",
  ]).default("en_proceso").notNull(),
  investigacionLaboral: json("investigacionLaboral").$type<{
    resultado?: string;
    detalles?: string;
    completado?: boolean;
  }>(),
  investigacionLegal: json("investigacionLegal").$type<{
    antecedentes?: string;
    flagRiesgo?: boolean;
    archivoAdjuntoUrl?: string;
  }>(),
  buroCredito: json("buroCredito").$type<{
    estatus?: string;
    score?: string;
    aprobado?: boolean;
  }>(),
  visitaDetalle: json("visitaDetalle").$type<{
    tipo?: "virtual" | "presencial";
    comentarios?: string;
    fechaRealizacion?: string;
    enlaceReporteUrl?: string;
  }>(),
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
  // Cobertura y atributos operativos
  cobertura: mysqlEnum("cobertura", ["local", "foraneo", "ambos"]).default("local").notNull(),
  ciudadBase: varchar("ciudadBase", { length: 255 }),
  estadosCobertura: json("estadosCobertura").$type<string[]>(),
  radioKm: int("radioKm"),
  vehiculo: boolean("vehiculo").default(false).notNull(),
  tarifaLocal: int("tarifaLocal"), // en centavos
  tarifaForanea: int("tarifaForanea"), // en centavos
  notas: text("notas"),
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

// ============================================================================
// MENSAJES A ENCUESTADORES (log de avisos)
// ============================================================================

export const surveyorMessages = mysqlTable("surveyorMessages", {
  id: int("id").autoincrement().primaryKey(),
  encuestadorId: int("encuestadorId").notNull(),
  procesoId: int("procesoId"),
  canal: mysqlEnum("canal", ["whatsapp", "email", "sms", "otro"]).default("whatsapp").notNull(),
  contenido: text("contenido"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SurveyorMessage = typeof surveyorMessages.$inferSelect;
export type InsertSurveyorMessage = typeof surveyorMessages.$inferInsert;

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
  url: text("url").notNull(),
  fileKey: text("fileKey").notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  tamanio: int("tamanio"), // Tamaño en bytes
  uploadedBy: varchar("uploadedBy", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// ============================================================================
// TOKENS DE ACCESO PARA CLIENTES
// ============================================================================

/**
 * Tokens de acceso únicos para clientes empresariales.
 * Permiten acceso temporal sin contraseña mediante enlace único.
 */
export const clientAccessTokens = mysqlTable("clientAccessTokens", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  clientId: int("clientId").notNull().references(() => clients.id, { onDelete: 'cascade' }),
  procesoId: int("procesoId"),
  candidatoId: int("candidatoId"),
  expiresAt: timestamp("expiresAt").notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ClientAccessToken = typeof clientAccessTokens.$inferSelect;
export type InsertClientAccessToken = typeof clientAccessTokens.$inferInsert;
