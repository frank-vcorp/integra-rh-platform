import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, uniqueIndex } from "drizzle-orm/mysql-core";

/**
 * ARCH-20260321-01 | Respaldo: PROYECTO.md
 */
const WORK_HISTORY_CAUSALES_SALIDA = [
  "RENUNCIA VOLUNTARIA",
  "VIGENTE",
  "RECORTE DE PERSONAL",
  "TÉRMINO DE CONTRATO",
  "TERMINACIÓN DE PROYECTO",
  "TÉRMINO DE PERIODO DE PRUEBA",
  "REESTRUCTURACIÓN",
  "CAMBIO DE ADMINISTRACIÓN",
  "CIERRE DE EMPRESA",
  "CIERRE DE LA EMPRESA",
  "POR ANTIGÜEDAD NO HAY INFORMACIÓN EN SISTEMA",
  "POR POLÍTICAS DE PRIVACIDAD NO DAN REFERENCIAS LABORALES",
  "BAJO DESEMPEÑO",
  "AUSENTISMO",
  "ABANDONO DE EMPLEO",
  "ABANDONO DE TRABAJO",
  "ACUMULACIÓN DE FALTAS INJUSTIFICADAS",
  "ACUMULACIÓN DE FALTAS",
  "INCUMPLIMIENTO DE POLÍTICAS INTERNAS",
  "INCUMPLIMIENTO A POLÍTICAS Y PROCESOS",
  "NO APEGO A POLÍTICAS Y PROCESOS",
  "CONDUCTA INADECUADA",
  "CONFLICTIVO",
  "VIOLACIÓN AL CODIGO DE CONDUCTA Y ÉTICA (DESHONESTIDAD)",
  "VIOLACIÓN AL CÓDIGO DE CONDUCTA",
  "FALTA DE PROBIDAD",
  "PERDIDA DE CONFIANZA",
  "NO RENOVACIÓN DE CONTRATO",
  "BAJA CON CAUSAL",
  "BAJA ADMINISTRATIVA",
  "ABUSO DE CONFIANZA",
  "FALSIFICACIÓN DE DOCUMENTOS",
  "SUSTRACCIÓN DE COMBUSTIBLE",
  "ALCOHOLISMO",
  "PERDIDA DE RECURSOS / MATERIAL DE LA EMPRESA",
  "DAÑO A UNIDAD VEHICULAR",
  "JUVILACIÓN",
] as const;

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
// ROLES Y PERMISOS (RBAC básico por módulo/acción)
// ============================================================================

export const roles = mysqlTable("roles", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Role = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;

export const rolePermissions = mysqlTable("role_permissions", {
  id: int("id").autoincrement().primaryKey(),
  roleId: int("roleId")
    .notNull()
    .references(() => roles.id, { onDelete: "cascade" }),
  module: varchar("module", { length: 100 }).notNull(),
  action: mysqlEnum("action", ["view", "create", "edit", "delete"]).notNull(),
  allowed: boolean("allowed").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = typeof rolePermissions.$inferInsert;

export const userRoles = mysqlTable("user_roles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  roleId: int("roleId")
    .notNull()
    .references(() => roles.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = typeof userRoles.$inferInsert;

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
  iaSuggestionsEnabled: boolean("iaSuggestionsEnabled").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// ============================================================================
// PLAZAS / SUCURSALES DE CLIENTE
// ============================================================================

export const clientSites = mysqlTable("clientSites", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  nombrePlaza: varchar("nombrePlaza", { length: 255 }).notNull(),
  ciudad: varchar("ciudad", { length: 255 }),
  estado: varchar("estado", { length: 255 }),
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ClientSite = typeof clientSites.$inferSelect;
export type InsertClientSite = typeof clientSites.$inferInsert;

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
  clientSiteId: int("clientSiteId"),
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
  // Perfil detallado del candidato (datos personales, domicilio, contacto de emergencia, etc.)
  perfilDetalle: json("perfilDetalle").$type<{
    generales?: {
      // Datos de identificación y de la vacante
      puestoSolicitado?: string;
      plaza?: string;
      ciudadResidencia?: string;
      fechaNacimiento?: string;
      lugarNacimiento?: string;
      edad?: number;
      nss?: string;
      curp?: string;
      rfc?: string;
      telefonoCasa?: string;
      telefonoRecados?: string;
    };
    domicilio?: {
      calle?: string;
      numero?: string;
      interior?: string;
      colonia?: string;
      municipio?: string;
      estado?: string;
      cp?: string;
      mapLink?: string;
    };
    redesSociales?: {
      facebook?: string;
      instagram?: string;
      twitterX?: string;
      tiktok?: string;
    };
    situacionFamiliar?: {
      estadoCivil?: string;
      fechaMatrimonioUnion?: string;
      parejaDeAcuerdoConTrabajo?: string;
      esposaEmbarazada?: string;
      tieneHijos?: string;
      cantidadHijos?: number;
      edadesHijos?: string;
      hijosDescripcion?: string;
      quienCuidaHijos?: string;
      dondeVivenCuidadores?: string;
      pensionAlimenticia?: string;
      vivienda?: string;
    };
    parejaNoviazgo?: {
      tieneNovio?: string;
      nombreNovio?: string;
      ocupacionNovio?: string;
      domicilioNovio?: string;
      apoyoEconomicoMutuo?: string;
      negocioEnConjunto?: string;
    };
    financieroAntecedentes?: {
      tieneDeudas?: string;
      institucionDeuda?: string;
      buroCreditoDeclarado?: string;
      historialburoCredito?: string;
      haSidoSindicalizado?: string;
      sindicatoEmpresa?: string;
      puestoSindicato?: string;
      haEstadoAfianzado?: string;
      accidentesVialesPrevios?: string;
      accidentesTrabajoPrevios?: string;
    };
    contactoEmergencia?: {
      nombre?: string;
      parentesco?: string;
      telefono?: string;
    };
    consentimiento?: {
      aceptoAvisoPrivacidad?: boolean;
      aceptoAvisoPrivacidadAt?: string;
    };
  }>(),
  // Dictamen global de investigación laboral (heredable a procesos)
  // IMPL-20260320-01: se agregan disposicionSemanasCotizadas y motivoDisposicion para captura única global
  dictamenLaboral: json("dictamenLaboral").$type<{
    resultado?: string;
    comentariosGenerales?: string;
    observacionResultado?: string;
    completado?: boolean;
    completadoAt?: string;
    // Semanas cotizadas: captura global a nivel candidato, no por empleo
    disposicionSemanasCotizadas?: string;
    motivoDisposicion?: string;
  }>(),
  // Captura inicial self-service
  selfFilledStatus: mysqlEnum("selfFilledStatus", [
    "pendiente",
    "recibido",
    "revisado",
  ]).default("pendiente"),
  selfFilledAt: timestamp("selfFilledAt"),
  selfFilledReviewedBy: int("selfFilledReviewedBy"),
  selfFilledReviewedAt: timestamp("selfFilledReviewedAt"),
  // Analista asignado responsable del candidato (hereda a nuevos procesos)
  analistaAsignadoId: int("analistaAsignadoId").notNull(),
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
  // Tiempo reportado por la empresa cuando no se tienen fechas exactas
  tiempoTrabajadoEmpresa: varchar("tiempoTrabajadoEmpresa", { length: 100 }),
  // Causales de salida
  causalSalidaRH: mysqlEnum("causalSalidaRH", WORK_HISTORY_CAUSALES_SALIDA),
  causalSalidaJefeInmediato: mysqlEnum("causalSalidaJefeInmediato", WORK_HISTORY_CAUSALES_SALIDA),
  contactoReferencia: varchar("contactoReferencia", { length: 255 }),
  telefonoReferencia: varchar("telefonoReferencia", { length: 50 }),
  correoReferencia: varchar("correoReferencia", { length: 320 }),
  resultadoVerificacion: mysqlEnum("resultadoVerificacion", [
    "pendiente",
    "recomendable",
    "con_reservas",
    "no_recomendable"
  ]).default("pendiente"),
  estatusInvestigacion: mysqlEnum("estatusInvestigacion", [
    "en_revision",
    "revisado",
    "terminado",
  ]).default("en_revision").notNull(),
  comentarioInvestigacion: text("comentarioInvestigacion"),
  observaciones: text("observaciones"),
  // Detalle estructurado de la investigación telefónica (según SPEC-DATOS-RH)
  investigacionDetalle: json("investigacionDetalle").$type<{
    empresa?: {
      nombreComercial?: string;
      giro?: string;
      direccion?: string;
      telefono?: string;
    };
    puesto?: {
      puestoInicial?: string;
      puestoFinal?: string;
      jefeInmediato?: string;
      principalesActividades?: string;
      recursosAsignados?: string;
      horarioTrabajo?: string;
    };
    periodo?: {
      fechaIngreso?: string;
      fechaSalida?: string;
      antiguedadTexto?: string;
      sueldoInicial?: string;
      sueldoFinal?: string;
      periodos?: {
        periodoEmpresa?: string;
        periodoCandidato?: string;
      }[];
    };
    incidencias?: {
      motivoSeparacionCandidato?: string;
      motivoSeparacionEmpresa?: string;
      incapacidadesCandidato?: string;
      incapacidadesJefe?: string;
      inasistencias?: string;
      antecedentesLegales?: string;
    };
    desempeno?: {
      evaluacionGeneral?: "EXCELENTE" | "BUENO" | "REGULAR" | "MALO";
      puntualidad?: "EXCELENTE" | "BUENO" | "REGULAR" | "MALO";
      colaboracion?: "EXCELENTE" | "BUENO" | "REGULAR" | "MALO";
      responsabilidad?: "EXCELENTE" | "BUENO" | "REGULAR" | "MALO";
      actitudAutoridad?: "EXCELENTE" | "BUENO" | "REGULAR" | "MALO";
      actitudSubordinados?: "EXCELENTE" | "BUENO" | "REGULAR" | "MALO";
      honradezIntegridad?: "EXCELENTE" | "BUENO" | "REGULAR" | "MALO";
      calidadTrabajo?: "EXCELENTE" | "BUENO" | "REGULAR" | "MALO";
      liderazgo?: "EXCELENTE" | "BUENO" | "REGULAR" | "MALO";
      conflictividad?: "SI" | "NO";
      conflictividadComentario?: string;
    };
    conclusion?: {
      esRecomendable?: "SI" | "NO" | "CONDICIONADO";
      loRecontrataria?: "SI" | "NO";
      razonRecontratacion?: string;
      informanteNombre?: string;
      informanteCargo?: string;
      informanteTelefono?: string;
      informanteEmail?: string;
      comentariosAdicionales?: string;
    };
    iaDictamen?: {
      resumenCorto?: string;
      fortalezas?: string[];
      riesgos?: string[];
      sugerenciasSeguimiento?: string[];
      recomendacionTexto?: string;
      soloUsoInterno?: boolean;
      generatedAt?: string;
    };
    auditTrail?: {
      timestamp: string; // ISO 8601
      changedBy: string; // usuario que hizo el cambio
      action: "create" | "update" | "submit"; // tipo de cambio
      changedFields?: Record<string, { old?: any; new?: any }>;
    }[];
  }>(),
  // Puntaje numérico de desempeño 0–100 calculado a partir de la matriz
  desempenoScore: int("desempenoScore"),
  // Origen del registro (capturado por el candidato o por el analista)
  capturadoPor: mysqlEnum("capturadoPor", ["candidato", "analista"]).default("analista").notNull(),
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
  clientSiteId: int("clientSiteId"),
  // Especialista de atracción que gestiona el proceso (FK opcional o nombre libre)
  especialistaAtraccionId: int("especialistaAtraccionId"),
  especialistaAtraccionNombre: varchar("especialistaAtraccionNombre", { length: 255 }),
  // Analista asignado responsable del proceso (hereda del candidato)
  analistaAsignadoId: int("analistaAsignadoId"),
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
  /**
   * @intervention: ARCH-20260210-01
   * @desc: Se agregan estatus 'entrevistado' y 'no_entrevistado' al flujo principal.
   */
  estatusProceso: mysqlEnum("estatusProceso", [
    "en_recepcion",
    "asignado",
    "entrevistado",
    "no_entrevistado",
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
    "no_recomendable",
    "recomendable_con_observacion",
    "con_reservas_con_observacion"
  ]).default("pendiente"),
  comentarioCalificacion: text("comentarioCalificacion"),
  // Estatus visual y detalle granular para panel de clientes
  estatusVisual: mysqlEnum("estatusVisual", [
    "nuevo",
    "sin_entrevistar",
    "entrevistado",
    "en_proceso",
    "pausado",
    "cerrado",
    "descartado",
  ]).default("en_proceso").notNull(),
  investigacionLaboral: json("investigacionLaboral").$type<{
    resultado?: string;
    detalles?: string;
    completado?: boolean;
    iaDictamenCliente?: {
      resumenEjecutivoCliente?: string;
      recomendacionesCliente?: string[];
      notaInternaAnalista?: string;
      dictamenFinal?: string;
      generatedAt?: string;
    };
  }>(),
  investigacionLegal: json("investigacionLegal").$type<{
    antecedentes?: string;
    flagRiesgo?: boolean;
    archivoAdjuntoUrl?: string; // Para documento PDF principal
    evidenciaImgUrl?: string;   // Para imagen pegada (portapapeles) - CAMPO VIEJO, mantener para compat
    evidenciasGraficas?: string[]; // NEW: Array de URLs de imágenes
    // Investigación documental complementaria
    notasPeriodisticas?: string;
  }>(),
  semanasDetalle: json("semanasDetalle").$type<{
    comentario?: string;
    evidenciasGraficas?: string[]; // Array de URLs de imágenes de semanas
  }>(),
  antecedentesPenales: json("antecedentesPenales").$type<{
    comentarios?: string;
    evidenciasGraficas?: string[]; // Array de URLs de evidencias gráficas
  }>(),
  buroCredito: json("buroCredito").$type<{
    pdfUrl?: string; // Archivo PDF del reporte de Buró
    archivosAdicionales?: string[]; // Array de URLs de archivos adicionales
  }>(),
  /** @intervention ARCH-20260313-FINAL */
  visitaDetalle: json("visitaDetalle").$type<{
    // ── Metadatos de sesión (auto-generados, no editables por encuestador) ──
    _privacyAcceptedAt?: string;       // ISO timestamp
    _sessionStartedAt?: string;        // ISO timestamp
    _sessionStartGps?: { lat: number; lon: number; accuracy: number };
    _sessionEndedAt?: string;          // ISO timestamp
    _sessionEndGps?: { lat: number; lon: number; accuracy: number };
    _deviceInfo?: { userAgent: string; platform: string };

    // ── §1 Ubicación y Domicilio ──
    ubicacion?: {
      gps?: { lat: number; lon: number; accuracy: number; locked: boolean };
      domicilio?: string;
      cp?: string;
      coloniaMunicipio?: string;
      estado?: string;
    };

    // ── §2 Información Académica ──
    academica?: {
      ultimoGrado?: string;
      institucion?: string;
      ciudad?: string;
      periodo?: string;
      documentoObtenido?: string;
      folioDocumento?: string;
      estudiaActualmente?: boolean;
      cursos?: Array<{ institucion: string; periodo: string; titulo: string }>;
      equiposMaquinas?: string;
      programas?: string;
      funcionesAdministrativas?: string;
      otrosConocimientos?: string;
    };

    // ── §3 Cotejo de Documentos ──
    documentos?: {
      actaNacimiento?: { tiene: boolean; fotoUrl?: string };
      credencialElector?: { tiene: boolean; fotoFrenteUrl?: string; fotoReversoUrl?: string };
      comprobanteDomicilio?: { tiene: boolean; fotoUrl?: string; nombreTitular?: string; parentesco?: string };
      cartillaMilitar?: { tiene: boolean; fotoUrl?: string };
      pasaporte?: { tiene: boolean; fotoUrl?: string };
      visaAmericana?: { tiene: boolean; fotoUrl?: string };
      cartasRecomendacion?: { tiene: boolean; fotosUrls?: string[] };
      creditoInfonavit?: { numero?: string; monto?: string; fotoUrl?: string };
      tipoSangre?: string;
      afore?: { nombre?: string; fotoUrl?: string };
      licenciaConducir?: { tiene: boolean; fotoFrenteUrl?: string; fotoReversoUrl?: string };
      certificadoTitulo?: { tiene: boolean; fotoUrl?: string };
    };

    // ── §4 Datos Familiares ──
    familiares?: Array<{
      parentesco?: string;
      nombre?: string;
      habitaEnDomicilio?: boolean;
      edad?: number;
      escolaridad?: string;
      ocupacion?: string;
      lugarResidencia?: string;
    }>;
    otrasPersonasDomicilio?: Array<{
      parentesco?: string;
      nombre?: string;
      habitaEnDomicilio?: boolean;
      edad?: number;
      escolaridad?: string;
      ocupacion?: string;
      lugarResidencia?: string;
    }>;

    // ── §5 Dinámica Familiar ──
    dinamicaFamiliar?: {
      vivenSolos?: string;
      esposaEmbarazada?: string;
      quienCuidaHijos?: string;
      dondeViveQuienCuida?: string;
      edadHijos?: string;
      parejaDacuerdo?: string;
      tieneDeudas?: boolean;
      institucionDeuda?: string;
      pensionAlimenticia?: boolean;
      trabajoEstadosUnidos?: boolean;
    };

    // ── §6 Referencias Económicas ──
    ingresosArray?: Array<{
      nombre?: string;
      parentesco?: string;
      ingreso?: number;
      otrosIngresos?: string;
      aportacionTotal?: number;
    }>;
    egresos?: {
      servicios?: { agua?: number; luz?: number; telefono?: number; gas?: number; tvPaga?: number; internet?: number };
      alimentacionDespensa?: number;
      vestidoCalzado?: number;
      colegiaturas?: number;
      tarjetasCredito?: number;
      transportacion?: number;
      rentaHipotecaInfonavit?: number;
      gastosMedicos?: number;
      recreaciones?: number;
      otrosGastos?: number;
    };

    // ── §7 Estado de Salud ──
    salud?: {
      servicioMedico?: string;
      ultimaCitaFecha?: string;
      ultimaCitaCausa?: string;
      enfermedadesCronicas?: boolean;
      enfermedadesCuales?: string;
      intervencionQuirurgica?: boolean;
      intervencionCual?: string;
      alergias?: boolean;
      alergiasCuales?: string;
      enfermedadesHereditarias?: boolean;
      enfermedadesHereditariasCuales?: string;
      enfermedadesHereditariasQuien?: string;
      medicamentos?: boolean;
      medicamentosCuales?: string;
      drogas?: boolean;
      drogasCuales?: string;
      estadoSalud?: string;
      accidentes?: boolean;
      cuidadosMedicos?: string;
      fuma?: boolean;
      cigarrosDiarios?: number;
      toma?: boolean;
      tomaCadaCuando?: string;
      tomaTipoBebida?: string;
    };

    // ── §8 Información Social ──
    social?: {
      pasatiempos?: string;
      deporte?: boolean; deporteCual?: string; deporteFrecuencia?: string;
      actividadFamiliar?: boolean; actividadFamiliarCual?: string; actividadFamiliarFrecuencia?: string;
      discotecas?: boolean; discotecasCual?: string; discotecasFrecuencia?: string;
      eventosReligiosos?: boolean; eventosReligiososCual?: string; eventosReligiososFrecuencia?: string;
      partidoPolitico?: boolean; partidoPoliticoCual?: string;
      grupoDeportivo?: boolean; grupoDeportivoCual?: string;
      tatuajesPiercings?: boolean;
    };

    // ── §9 Área Jurídica ──
    juridica?: {
      procesoLegal?: boolean; procesoLegalPorQue?: string; procesoLegalQuien?: string;
      privadoLibertad?: boolean; privadoLibertadPorQue?: string; privadoLibertadQuien?: string;
      problemasLaborales?: boolean; problemasLaboralesPorQue?: string; problemasLaboralesQuien?: string;
      partidoPolitico?: boolean; partidoPoliticoCual?: string; partidoPoliticoQuien?: string;
      sindicato?: boolean; sindicatoCual?: string; sindicatoQuien?: string;
      puestosPoliticos?: boolean; puestosPoliticosCual?: string; puestosPoliticosQuien?: string;
    };

    // ── §10 Dinámica de Vivienda ──
    dinamicaVivienda?: {
      personasDiscapacidad?: boolean; discapacidadQuien?: string; discapacidadTipo?: string;
      numeroDependientes?: number; dependientesDetalle?: string;
      matrimoniosAnteriores?: boolean;
      hijosMatrimoniosAnteriores?: boolean; hijosMatrimoniosCuantos?: number;
      pensionAlimenticia?: boolean; pensionMonto?: number;
      quienCuidaHijos?: string; quienCuidaDonde?: string; parejaDeAcuerdo?: boolean;
      esposaEmbarazada?: boolean;
      comprendActividades?: string;
      rutasForaneas?: boolean; inconvenienteAusencia?: boolean;
    };

    // ── §11 Fotografías ──
    fotos?: {
      comedor?: string;     // URL Firebase Storage
      cocina?: string;
      sala?: string;
      fachadaPatio?: string;
      fachadaCalle?: string;
    };

    // ── §12 Resumen y Firma ──
    cierre?: {
      observaciones?: string;
      firmaUrl?: string;    // URL Firebase Storage (imagen canvas o foto)
    };

    // ── §13 Créditos, Propiedades y Patrimonio ──
    creditos?: Array<{ institucion?: string; montoCredito?: number; mensualidad?: number; adeudo?: number }>;
    bienesRaices?: Array<{ tipoPropiedad?: string; ubicacion?: string; valorAprox?: number; aNombreDe?: string }>;
    vehiculos?: Array<{ marcaModelo?: string; valorComercial?: number; saldo?: number; aNombreDe?: string }>;
    negocios?: Array<{ tipoNegocio?: string; ubicacion?: string; propietario?: string }>;
    actividadDesempleo?: { ingreso?: string; comoSeAnuncia?: string };

    // ── §14 Datos del Inmueble ──
    inmueble?: {
      tipoInmueble?: string; valorAprox?: number; superficie?: string;
      fachada?: string; numeroBanos?: number; pisos?: string; paredes?: string;
      niveles?: number;
      muebles?: string[];
      estadoMuebles?: string;
      serviciosPublicos?: string[];
      estadoVivienda?: string; ordenLimpieza?: string; zona?: string;
      predial?: string; numeroRecamaras?: number;
      tieneSala?: boolean; tieneJardin?: boolean; tieneComedor?: boolean;
      tieneCochera?: boolean; tieneCocina?: boolean; tienePatio?: boolean;
      medioTransporte?: string; tiempoTraslado?: string; precioPasaje?: number;
      tiempoResidenciaActual?: string; tiempoResidenciaAnterior?: string;
    };

    // ── §15 Referencias Vecinales ──
    referenciasVecinales?: Array<{
      nombre?: string; ocupacion?: string; telefono?: string; domicilio?: string;
      tiempoDeConocerlo?: string; candidatoViveAhi?: boolean;
      cuantosHijos?: string; quienCuidaHijos?: string; empleosAnteriores?: string;
      comentarios?: string;
    }>;

    // ── §15b Referencias Personales ──
    referenciasPersonales?: Array<{
      nombre?: string; telefono?: string; ocupacion?: string;
      domicilio?: string; tiempoDeConocerlo?: string; referencia?: string;
    }>;

    // ── §16 Otros Datos ──
    otrosDatos?: {
      trabajoEnGrupo?: boolean; trabajoEnGrupoCual?: string;
      trabajoEnGrupoPeriodo?: string; trabajoEnGrupoMotivoSalida?: string;
      familiaresEnGrupo?: boolean; familiarNombre?: string; familiarPuestoDepto?: string;
    };
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
// VERSIONES DE ARMADOS PARA CLIENTE
// ============================================================================

/**
 * @intervention ARCH-20260320-01
 * @respaldo context/SPECs/SPEC-pdf-dinamico-estudio-cliente.md
 */
export const processReportVersions = mysqlTable("processReportVersions", {
  id: int("id").autoincrement().primaryKey(),
  procesoId: int("procesoId").notNull(),
  versionNumber: int("versionNumber").notNull(),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft").notNull(),
  reportScope: mysqlEnum("reportScope", ["armado_manual", "legacy_visit_pdf"]).default("armado_manual").notNull(),
  sections: json("sections").$type<string[]>().notNull(),
  snapshot: json("snapshot").$type<Record<string, unknown>>().notNull(),
  pdfFileName: varchar("pdfFileName", { length: 255 }),
  pdfStoragePath: varchar("pdfStoragePath", { length: 500 }),
  createdByUserId: int("createdByUserId"),
  createdByName: varchar("createdByName", { length: 255 }),
  publishedByUserId: int("publishedByUserId"),
  publishedByName: varchar("publishedByName", { length: 255 }),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  procesoVersionUnique: uniqueIndex("process_report_versions_proceso_version_unique").on(table.procesoId, table.versionNumber),
}));

export type ProcessReportVersion = typeof processReportVersions.$inferSelect;
export type InsertProcessReportVersion = typeof processReportVersions.$inferInsert;

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

// ============================================================================
// AUDITORÍA (Historial de cambios y acciones)
// ============================================================================

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  userId: int("userId"),
  actorType: mysqlEnum("actorType", ["admin", "client", "system", "candidate"]).default("system").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 100 }).notNull(),
  entityId: varchar("entityId", { length: 100 }),
  requestId: varchar("requestId", { length: 64 }),
  details: json("details"),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ============================================================================
// CONSENTIMIENTO DE CANDIDATOS
// ============================================================================

/**
 * Almacena la evidencia del consentimiento de los candidatos para el uso de sus datos.
 */
export const candidateConsents = mysqlTable("candidate_consents", {
  id: int("id").autoincrement().primaryKey(),
  candidatoId: int("candidatoId").notNull().references(() => candidates.id, { onDelete: 'cascade' }),
  
  // Token para el enlace único
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),

  // Evidencia del consentimiento
  isGiven: boolean("is_given").default(false).notNull(),
  givenAt: timestamp("givenAt"),
  ipAddress: varchar("ip_address", { length: 45 }), // Supports IPv6
  userAgent: varchar("user_agent", { length: 255 }),
  signatureStoragePath: varchar("signature_storage_path", { length: 512 }),
  privacyPolicyVersion: varchar("privacy_policy_version", { length: 50 }),

  // Timestamps de registro
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CandidateConsent = typeof candidateConsents.$inferSelect;
export type InsertCandidateConsent = typeof candidateConsents.$inferInsert;

// ============================================================================
// TOKENS SELF-SERVICE DE CANDIDATO
// ============================================================================

export const candidateSelfTokens = mysqlTable("candidateSelfTokens", {
  id: int("id").autoincrement().primaryKey(),
  candidateId: int("candidateId").notNull().references(() => candidates.id, {
    onDelete: "cascade",
  }),
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  revoked: boolean("revoked").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CandidateSelfToken = typeof candidateSelfTokens.$inferSelect;
export type InsertCandidateSelfToken = typeof candidateSelfTokens.$inferInsert;

// ============================================================================
// TOKENS DE ACCESO PARA ENCUESTADORES (Portal del Encuestador)
// ============================================================================

/**
 * @intervention ARCH-20260313-FINAL
 * Tokens de sesión únicos para el Portal del Encuestador.
 * Se generan al presionar "Programar" y son el entry-point
 * del flujo de captura en campo (PWA móvil).
 */
export const surveyorTokens = mysqlTable("surveyorTokens", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  processId: int("processId").notNull(),
  surveyorId: int("surveyorId"),           // FK a surveyors.id (nullable, puede no estar asignado)
  status: mysqlEnum("status", ["PENDIENTE", "EN_CURSO", "COMPLETADO"]).default("PENDIENTE").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SurveyorToken = typeof surveyorTokens.$inferSelect;
export type InsertSurveyorToken = typeof surveyorTokens.$inferInsert;
