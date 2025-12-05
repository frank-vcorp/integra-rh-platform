"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.candidateConsents = exports.auditLogs = exports.clientAccessTokens = exports.documents = exports.surveyorMessages = exports.payments = exports.surveyors = exports.processComments = exports.processes = exports.candidateComments = exports.workHistory = exports.candidates = exports.posts = exports.clients = exports.users = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
/**
 * INTEGRA-RH Database Schema
 * Sistema de gestión de recursos humanos para consultora Paula León
 */
// ============================================================================
// TABLA DE USUARIOS (Core - Ya existe pero extendida)
// ============================================================================
exports.users = (0, mysql_core_1.mysqlTable)("users", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    openId: (0, mysql_core_1.varchar)("openId", { length: 64 }).notNull().unique(),
    name: (0, mysql_core_1.text)("name"),
    email: (0, mysql_core_1.varchar)("email", { length: 320 }),
    // Número de contacto para WhatsApp (E.164 sugerido, pero almacenamos libre)
    whatsapp: (0, mysql_core_1.varchar)("whatsapp", { length: 50 }),
    loginMethod: (0, mysql_core_1.varchar)("loginMethod", { length: 64 }),
    role: (0, mysql_core_1.mysqlEnum)("role", ["admin", "client"]).default("admin").notNull(),
    // Para clientes empresariales: referencia al cliente
    clientId: (0, mysql_core_1.int)("clientId"),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: (0, mysql_core_1.timestamp)("lastSignedIn").defaultNow().notNull(),
});
// ============================================================================
// CLIENTES EMPRESARIALES
// ============================================================================
exports.clients = (0, mysql_core_1.mysqlTable)("clients", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    nombreEmpresa: (0, mysql_core_1.varchar)("nombreEmpresa", { length: 255 }).notNull(),
    ubicacionPlaza: (0, mysql_core_1.varchar)("ubicacionPlaza", { length: 255 }),
    reclutador: (0, mysql_core_1.varchar)("reclutador", { length: 255 }),
    contacto: (0, mysql_core_1.varchar)("contacto", { length: 255 }),
    telefono: (0, mysql_core_1.varchar)("telefono", { length: 50 }),
    email: (0, mysql_core_1.varchar)("email", { length: 320 }),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
});
// ============================================================================
// PUESTOS DE TRABAJO
// ============================================================================
exports.posts = (0, mysql_core_1.mysqlTable)("posts", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    nombreDelPuesto: (0, mysql_core_1.varchar)("nombreDelPuesto", { length: 255 }).notNull(),
    clienteId: (0, mysql_core_1.int)("clienteId").notNull(),
    descripcion: (0, mysql_core_1.text)("descripcion"),
    estatus: (0, mysql_core_1.mysqlEnum)("estatus", ["activo", "cerrado", "pausado"]).default("activo").notNull(),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
});
// ============================================================================
// CANDIDATOS
// ============================================================================
exports.candidates = (0, mysql_core_1.mysqlTable)("candidates", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    nombreCompleto: (0, mysql_core_1.varchar)("nombreCompleto", { length: 255 }).notNull(),
    email: (0, mysql_core_1.varchar)("email", { length: 320 }),
    telefono: (0, mysql_core_1.varchar)("telefono", { length: 50 }),
    medioDeRecepcion: (0, mysql_core_1.varchar)("medioDeRecepcion", { length: 100 }),
    clienteId: (0, mysql_core_1.int)("clienteId"),
    puestoId: (0, mysql_core_1.int)("puestoId"),
    // Datos de psicométricos (almacenados como JSON)
    psicometricos: (0, mysql_core_1.json)("psicometricos").$type(),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
});
// ============================================================================
// HISTORIAL LABORAL (Subentidad de Candidatos)
// ============================================================================
exports.workHistory = (0, mysql_core_1.mysqlTable)("workHistory", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    candidatoId: (0, mysql_core_1.int)("candidatoId").notNull(),
    empresa: (0, mysql_core_1.varchar)("empresa", { length: 255 }).notNull(),
    puesto: (0, mysql_core_1.varchar)("puesto", { length: 255 }),
    fechaInicio: (0, mysql_core_1.varchar)("fechaInicio", { length: 50 }),
    fechaFin: (0, mysql_core_1.varchar)("fechaFin", { length: 50 }),
    tiempoTrabajado: (0, mysql_core_1.varchar)("tiempoTrabajado", { length: 100 }),
    // Causales de salida
    causalSalidaRH: (0, mysql_core_1.mysqlEnum)("causalSalidaRH", [
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
    causalSalidaJefeInmediato: (0, mysql_core_1.mysqlEnum)("causalSalidaJefeInmediato", [
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
    contactoReferencia: (0, mysql_core_1.varchar)("contactoReferencia", { length: 255 }),
    telefonoReferencia: (0, mysql_core_1.varchar)("telefonoReferencia", { length: 50 }),
    correoReferencia: (0, mysql_core_1.varchar)("correoReferencia", { length: 320 }),
    resultadoVerificacion: (0, mysql_core_1.mysqlEnum)("resultadoVerificacion", [
        "pendiente",
        "recomendable",
        "con_reservas",
        "no_recomendable"
    ]).default("pendiente"),
    estatusInvestigacion: (0, mysql_core_1.mysqlEnum)("estatusInvestigacion", [
        "en_revision",
        "revisado",
        "terminado",
    ]).default("en_revision").notNull(),
    comentarioInvestigacion: (0, mysql_core_1.text)("comentarioInvestigacion"),
    observaciones: (0, mysql_core_1.text)("observaciones"),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
});
// ============================================================================
// COMENTARIOS (Subentidad de Candidatos)
// ============================================================================
exports.candidateComments = (0, mysql_core_1.mysqlTable)("candidateComments", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    candidatoId: (0, mysql_core_1.int)("candidatoId").notNull(),
    text: (0, mysql_core_1.text)("text").notNull(),
    author: (0, mysql_core_1.varchar)("author", { length: 255 }).notNull(),
    visibility: (0, mysql_core_1.mysqlEnum)("visibility", ["public", "internal"]).default("internal").notNull(),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
});
// ============================================================================
// PROCESOS DE EVALUACIÓN
// ============================================================================
exports.processes = (0, mysql_core_1.mysqlTable)("processes", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    candidatoId: (0, mysql_core_1.int)("candidatoId").notNull(),
    clienteId: (0, mysql_core_1.int)("clienteId").notNull(),
    puestoId: (0, mysql_core_1.int)("puestoId").notNull(),
    // Especialista de atracción que gestiona el proceso (FK opcional o nombre libre)
    especialistaAtraccionId: (0, mysql_core_1.int)("especialistaAtraccionId"),
    especialistaAtraccionNombre: (0, mysql_core_1.varchar)("especialistaAtraccionNombre", { length: 255 }),
    // Clave única del proceso (ej: ILA-2025-001, ESE-2025-015)
    clave: (0, mysql_core_1.varchar)("clave", { length: 50 }).notNull().unique(),
    // Proceso a realizar (anteriormente "Tipo de Producto")
    tipoProducto: (0, mysql_core_1.mysqlEnum)("tipoProducto", [
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
    consecutivo: (0, mysql_core_1.int)("consecutivo").notNull(),
    fechaRecepcion: (0, mysql_core_1.timestamp)("fechaRecepcion").notNull(),
    fechaCierre: (0, mysql_core_1.timestamp)("fechaCierre"),
    fechaEnvio: (0, mysql_core_1.timestamp)("fechaEnvio"),
    quienEnvio: (0, mysql_core_1.varchar)("quienEnvio", { length: 255 }),
    // Cómo llegó el proceso (canal de recepción)
    medioDeRecepcion: (0, mysql_core_1.mysqlEnum)("medioDeRecepcion", [
        "whatsapp",
        "correo",
        "telefono",
        "boca_a_boca",
        "portal",
        "presencial",
        "otro",
    ]),
    estatusProceso: (0, mysql_core_1.mysqlEnum)("estatusProceso", [
        "en_recepcion",
        "asignado",
        "en_verificacion",
        "visita_programada",
        "visita_realizada",
        "en_dictamen",
        "finalizado",
        "entregado"
    ]).default("en_recepcion").notNull(),
    calificacionFinal: (0, mysql_core_1.mysqlEnum)("calificacionFinal", [
        "pendiente",
        "recomendable",
        "con_reservas",
        "no_recomendable"
    ]).default("pendiente"),
    // Estatus visual y detalle granular para panel de clientes
    estatusVisual: (0, mysql_core_1.mysqlEnum)("estatusVisual", [
        "nuevo",
        "en_proceso",
        "pausado",
        "cerrado",
        "descartado",
    ]).default("en_proceso").notNull(),
    investigacionLaboral: (0, mysql_core_1.json)("investigacionLaboral").$type(),
    investigacionLegal: (0, mysql_core_1.json)("investigacionLegal").$type(),
    buroCredito: (0, mysql_core_1.json)("buroCredito").$type(),
    visitaDetalle: (0, mysql_core_1.json)("visitaDetalle").$type(),
    archivoDictamenUrl: (0, mysql_core_1.varchar)("archivoDictamenUrl", { length: 500 }),
    archivoDictamenPath: (0, mysql_core_1.varchar)("archivoDictamenPath", { length: 500 }),
    shareableId: (0, mysql_core_1.varchar)("shareableId", { length: 100 }),
    arrivalDateTime: (0, mysql_core_1.timestamp)("arrivalDateTime"),
    // Estatus de visita domiciliaria (almacenado como JSON)
    visitStatus: (0, mysql_core_1.json)("visitStatus").$type(),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
});
// ============================================================================
// COMENTARIOS DE PROCESOS
// ============================================================================
exports.processComments = (0, mysql_core_1.mysqlTable)("processComments", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    procesoId: (0, mysql_core_1.int)("procesoId").notNull(),
    text: (0, mysql_core_1.text)("text").notNull(),
    author: (0, mysql_core_1.varchar)("author", { length: 255 }).notNull(),
    processStatusAtTime: (0, mysql_core_1.varchar)("processStatusAtTime", { length: 50 }),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
});
// ============================================================================
// ENCUESTADORES
// ============================================================================
exports.surveyors = (0, mysql_core_1.mysqlTable)("surveyors", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    nombre: (0, mysql_core_1.varchar)("nombre", { length: 255 }).notNull(),
    telefono: (0, mysql_core_1.varchar)("telefono", { length: 50 }),
    email: (0, mysql_core_1.varchar)("email", { length: 320 }),
    // Cobertura y atributos operativos
    cobertura: (0, mysql_core_1.mysqlEnum)("cobertura", ["local", "foraneo", "ambos"]).default("local").notNull(),
    ciudadBase: (0, mysql_core_1.varchar)("ciudadBase", { length: 255 }),
    estadosCobertura: (0, mysql_core_1.json)("estadosCobertura").$type(),
    radioKm: (0, mysql_core_1.int)("radioKm"),
    vehiculo: (0, mysql_core_1.boolean)("vehiculo").default(false).notNull(),
    tarifaLocal: (0, mysql_core_1.int)("tarifaLocal"), // en centavos
    tarifaForanea: (0, mysql_core_1.int)("tarifaForanea"), // en centavos
    notas: (0, mysql_core_1.text)("notas"),
    activo: (0, mysql_core_1.boolean)("activo").default(true).notNull(),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
});
// ============================================================================
// PAGOS A ENCUESTADORES
// ============================================================================
exports.payments = (0, mysql_core_1.mysqlTable)("payments", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    procesoId: (0, mysql_core_1.int)("procesoId").notNull(),
    encuestadorId: (0, mysql_core_1.int)("encuestadorId").notNull(),
    monto: (0, mysql_core_1.int)("monto").notNull(), // Monto en centavos (ej: 50000 = $500.00 MXN)
    fechaPago: (0, mysql_core_1.timestamp)("fechaPago"),
    estatusPago: (0, mysql_core_1.mysqlEnum)("estatusPago", ["pendiente", "pagado"]).default("pendiente").notNull(),
    metodoPago: (0, mysql_core_1.varchar)("metodoPago", { length: 100 }),
    observaciones: (0, mysql_core_1.text)("observaciones"),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
});
// ============================================================================
// MENSAJES A ENCUESTADORES (log de avisos)
// ============================================================================
exports.surveyorMessages = (0, mysql_core_1.mysqlTable)("surveyorMessages", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    encuestadorId: (0, mysql_core_1.int)("encuestadorId").notNull(),
    procesoId: (0, mysql_core_1.int)("procesoId"),
    canal: (0, mysql_core_1.mysqlEnum)("canal", ["whatsapp", "email", "sms", "otro"]).default("whatsapp").notNull(),
    contenido: (0, mysql_core_1.text)("contenido"),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
});
// ============================================================================
// DOCUMENTOS
// ============================================================================
exports.documents = (0, mysql_core_1.mysqlTable)("documents", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    candidatoId: (0, mysql_core_1.int)("candidatoId"),
    procesoId: (0, mysql_core_1.int)("procesoId"),
    tipoDocumento: (0, mysql_core_1.varchar)("tipoDocumento", { length: 100 }).notNull(),
    nombreArchivo: (0, mysql_core_1.varchar)("nombreArchivo", { length: 255 }).notNull(),
    url: (0, mysql_core_1.text)("url").notNull(),
    fileKey: (0, mysql_core_1.text)("fileKey").notNull(),
    mimeType: (0, mysql_core_1.varchar)("mimeType", { length: 100 }),
    tamanio: (0, mysql_core_1.int)("tamanio"), // Tamaño en bytes
    uploadedBy: (0, mysql_core_1.varchar)("uploadedBy", { length: 255 }),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
});
// ============================================================================
// TOKENS DE ACCESO PARA CLIENTES
// ============================================================================
/**
 * Tokens de acceso únicos para clientes empresariales.
 * Permiten acceso temporal sin contraseña mediante enlace único.
 */
exports.clientAccessTokens = (0, mysql_core_1.mysqlTable)("clientAccessTokens", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    token: (0, mysql_core_1.varchar)("token", { length: 64 }).notNull().unique(),
    clientId: (0, mysql_core_1.int)("clientId").notNull().references(() => exports.clients.id, { onDelete: 'cascade' }),
    procesoId: (0, mysql_core_1.int)("procesoId"),
    candidatoId: (0, mysql_core_1.int)("candidatoId"),
    expiresAt: (0, mysql_core_1.timestamp)("expiresAt").notNull(),
    lastUsedAt: (0, mysql_core_1.timestamp)("lastUsedAt"),
    revokedAt: (0, mysql_core_1.timestamp)("revokedAt"),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
});
// ============================================================================
// AUDITORÍA (Historial de cambios y acciones)
// ============================================================================
exports.auditLogs = (0, mysql_core_1.mysqlTable)("audit_logs", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    timestamp: (0, mysql_core_1.timestamp)("timestamp").defaultNow().notNull(),
    userId: (0, mysql_core_1.int)("userId"),
    actorType: (0, mysql_core_1.mysqlEnum)("actorType", ["admin", "client", "system"]).default("system").notNull(),
    action: (0, mysql_core_1.varchar)("action", { length: 100 }).notNull(),
    entityType: (0, mysql_core_1.varchar)("entityType", { length: 100 }).notNull(),
    entityId: (0, mysql_core_1.varchar)("entityId", { length: 100 }),
    requestId: (0, mysql_core_1.varchar)("requestId", { length: 64 }),
    details: (0, mysql_core_1.json)("details"),
});
// ============================================================================
// CONSENTIMIENTO DE CANDIDATOS
// ============================================================================
/**
 * Almacena la evidencia del consentimiento de los candidatos para el uso de sus datos.
 */
exports.candidateConsents = (0, mysql_core_1.mysqlTable)("candidate_consents", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    candidatoId: (0, mysql_core_1.int)("candidatoId").notNull().references(() => exports.candidates.id, { onDelete: 'cascade' }),
    // Token para el enlace único
    token: (0, mysql_core_1.varchar)("token", { length: 64 }).notNull().unique(),
    expiresAt: (0, mysql_core_1.timestamp)("expiresAt").notNull(),
    // Evidencia del consentimiento
    isGiven: (0, mysql_core_1.boolean)("is_given").default(false).notNull(),
    givenAt: (0, mysql_core_1.timestamp)("givenAt"),
    ipAddress: (0, mysql_core_1.varchar)("ip_address", { length: 45 }), // Supports IPv6
    userAgent: (0, mysql_core_1.varchar)("user_agent", { length: 255 }),
    signatureStoragePath: (0, mysql_core_1.varchar)("signature_storage_path", { length: 512 }),
    privacyPolicyVersion: (0, mysql_core_1.varchar)("privacy_policy_version", { length: 50 }),
    // Timestamps de registro
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
});
