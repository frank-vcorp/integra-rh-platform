import { router, publicProcedure, protectedProcedure, adminProcedure, hasPermission, requirePermission } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { storage as firebaseStorage, refreshStorageUrl, refreshStorageUrls } from "../firebase";
import { TRPCError } from "@trpc/server";
import { logAuditEvent } from "../_core/audit";
import { invokeLLM } from "../_core/llm";
import { ENV } from "../_core/env";
import { randomUUID } from "node:crypto";
import { generarArmadoClientePDF } from "../utils/estudiosocioPdf";
/** @intervention IMPL-20260313-02 | IMPL-20260320-15 | IMPL-20260408-01 */
// HTML-first habilitado en RC via IMPL-20260408-01 (hotfix Armados v2).
/** IMPL-20260320-15: blindado operaciones de Storage (getPublishedReportAccess, getReportVersionAccess, createLegacyReportDraft, generarDictamen) */
import { surveyorTokens, auditLogs, users, processReportVersions } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Refresca las URLs embebidas de Storage en el payload del proceso antes de entregarlo al frontend.
 * @intervention IMPL-20260408-07
 * @respaldo PROYECTO.md
 */
async function refreshProcessEmbeddedUrls(p: any): Promise<void> {
  if (!p) return;
  // IMPL-ARCH-20260622-01: pasar contexto de proceso a refreshStorageUrl para que
  // el warn estructurado incluya el procesoId en caso de NoSuchKey.
  // Tambien pasamos candidatoId si esta disponible para correlacionar logs.
  const ctx = { procesoId: p?.id, candidatoId: p?.candidatoId };
  const inv = p.investigacionLegal;
  if (inv) {
    if (inv.archivoAdjuntoUrl) inv.archivoAdjuntoUrl = await refreshStorageUrl(inv.archivoAdjuntoUrl, undefined, ctx);
    if (inv.evidenciaImgUrl) inv.evidenciaImgUrl = await refreshStorageUrl(inv.evidenciaImgUrl, undefined, ctx);
    if (Array.isArray(inv.evidenciasGraficas) && inv.evidenciasGraficas.length > 0)
      inv.evidenciasGraficas = await refreshStorageUrls(inv.evidenciasGraficas);
  }
  const sem = p.semanasDetalle;
  if (sem && Array.isArray(sem.evidenciasGraficas) && sem.evidenciasGraficas.length > 0)
    sem.evidenciasGraficas = await refreshStorageUrls(sem.evidenciasGraficas);
  const ant = p.antecedentesPenales;
  if (ant && Array.isArray(ant.evidenciasGraficas) && ant.evidenciasGraficas.length > 0)
    ant.evidenciasGraficas = await refreshStorageUrls(ant.evidenciasGraficas);
  const buro = p.buroCredito;
  if (buro) {
    if (buro.pdfUrl) buro.pdfUrl = await refreshStorageUrl(buro.pdfUrl, undefined, ctx);
    if (Array.isArray(buro.archivosAdicionales) && buro.archivosAdicionales.length > 0)
      buro.archivosAdicionales = await refreshStorageUrls(buro.archivosAdicionales);
  }
  const vis = p.visitaDetalle;
  if (vis) {
    if (vis.enlaceReporteUrl) vis.enlaceReporteUrl = await refreshStorageUrl(vis.enlaceReporteUrl, undefined, ctx);
    if (Array.isArray(vis.evidenciasGraficas) && vis.evidenciasGraficas.length > 0)
      vis.evidenciasGraficas = await refreshStorageUrls(vis.evidenciasGraficas);
  }
}

function assertCanEditProcess(ctx: any, proc: any) {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  // Clientes externos nunca deben modificar procesos
  if (ctx.user.role === "client") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Solo usuarios internos pueden modificar procesos.",
    });
  }

  // Superadmin siempre puede editar
  if (ctx.isSuperadmin) {
    return;
  }

  // Usuarios con permiso "procesos" "edit" pueden editar cualquier proceso
  if (hasPermission(ctx, "procesos", "edit")) {
    return;
  }

  // Usuarios con capacidad de crear o eliminar procesos se consideran
  // administradores operativos y pueden editar cualquier proceso
  const canManageAll =
    hasPermission(ctx, "procesos", "create") ||
    hasPermission(ctx, "procesos", "delete");
  if (canManageAll) {
    return;
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message: "No tienes permisos para modificar procesos.",
  });
}

/**
 * @intervention ARCH-20260319-01
 * @respaldo context/SPECs/SPEC-pdf-dinamico-estudio-cliente.md
 */
function assertCanViewProcessReports(ctx: any, proc: any) {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  if (ctx.user.role === "client") {
    if (proc.clienteId !== ctx.user.clientId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "No puedes acceder a este proceso",
      });
    }
    return;
  }

  if (hasPermission(ctx, "procesos", "view")) {
    return;
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message: "No tienes permisos para ver reportes de este proceso.",
  });
}

const CALIFICACION_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  recomendable: "Recomendable",
  con_reservas: "Recomendable con reservas",
  no_recomendable: "No recomendable",
  recomendable_con_observacion: "Recomendable con observación",
  con_reservas_con_observacion: "Con reservas con observación",
};

/**
 * @intervention ARCH-20260320-01
 * @respaldo context/SPECs/SPEC-pdf-dinamico-estudio-cliente.md
 */
const reportSectionValues = [
  "generales_candidato",
  "documentos",
  "investigacion_laboral",
  "investigacion_legal",
  "semanas_cotizadas",
  "buro_credito",
  "visita_domiciliaria",
  "captura_visita",
  "observaciones_conclusion",
] as const;

/**
 * @intervention ARCH-20260320-02
 * @respaldo context/SPECs/SPEC-pdf-dinamico-estudio-cliente.md
 */
const jsonRecordSchema = z.record(z.string(), z.unknown());

const safeText = (value: unknown) => {
  if (value === null || value === undefined) return "-";
  const text = String(value).trim();
  return text.length > 0 ? text : "-";
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function getVisitCaptureChanges(beforeValue: unknown, afterValue: unknown, currentPath = "captura"): Array<{
  path: string;
  before: unknown;
  after: unknown;
}> {
  if (Array.isArray(beforeValue) || Array.isArray(afterValue)) {
    return JSON.stringify(beforeValue ?? null) === JSON.stringify(afterValue ?? null)
      ? []
      : [{ path: currentPath, before: beforeValue ?? null, after: afterValue ?? null }];
  }

  if (isPlainObject(beforeValue) && isPlainObject(afterValue)) {
    const keys = Array.from(new Set([...Object.keys(beforeValue), ...Object.keys(afterValue)])).sort();
    return keys.flatMap((key) => getVisitCaptureChanges(beforeValue[key], afterValue[key], `${currentPath}.${key}`));
  }

  return JSON.stringify(beforeValue ?? null) === JSON.stringify(afterValue ?? null)
    ? []
    : [{ path: currentPath, before: beforeValue ?? null, after: afterValue ?? null }];
}

export const processesRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    console.log("[processes.list] headers:", ctx.req.headers);

    // 1) Si hay usuario en contexto (admin o client) usarlo
    if (ctx.user?.role === "admin") {
      if (!hasPermission(ctx, "procesos", "view")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No puedes ver procesos" });
      }
      return db.getAllProcesses();
    }
    if (ctx.user?.role === "client" && ctx.user.clientId) {
      return db.getProcessesByClient(ctx.user.clientId);
    }

    // 2) Si no hay usuario, intentar autenticar con ClientToken directo
    const authHeader =
      ctx.req.headers["authorization"] ||
      (ctx.req.headers["Authorization" as any] as string | string[] | undefined);
    const header = Array.isArray(authHeader) ? authHeader[0] : authHeader;

    if (typeof header === "string" && header.startsWith("ClientToken ")) {
      const token = header.slice("ClientToken ".length).trim();
      const { validateClientToken } = await import("../auth/clientTokens");
      const client = await validateClientToken(token);
      if (client) {
        return db.getProcessesByClient(client.id);
      }
    }

    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please login (10001)" });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user?.role === "admin") {
        if (!hasPermission(ctx, "procesos", "view")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No puedes ver procesos" });
        }
      }

      const process = await db.getProcessById(input.id);
      if (ctx.user.role === "client" && process?.clienteId !== ctx.user.clientId) {
        return null;
      }
      await refreshProcessEmbeddedUrls(process);
      return process;
    }),

  getByCandidate: protectedProcedure
    .input(z.object({ candidatoId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user?.role === "admin") {
        if (!hasPermission(ctx, "procesos", "view")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No puedes ver procesos" });
        }
      }

      if (ctx.user.role === "client") {
        const candidate = await db.getCandidateById(input.candidatoId);
        if (candidate?.clienteId !== ctx.user.clientId) {
          return [];
        }
      }
      return db.getProcessesByCandidate(input.candidatoId);
    }),

  create: adminProcedure
    .use(requirePermission("procesos", "create"))
    .input(
      z.object({
        candidatoId: z.number(),
        clienteId: z.number(),
        puestoId: z.number(),
        clientSiteId: z.number().optional(),
        tipoProducto: z.string(),
        medioDeRecepcion: z.enum([
          'whatsapp','correo','telefono','boca_a_boca','portal','presencial','otro'
        ]).optional(),
        fechaRecepcion: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Obtener candidato para heredar analistaAsignadoId
      const candidate = await db.getCandidateById(input.candidatoId);
      if (!candidate) {
        throw new TRPCError({ 
          code: "NOT_FOUND", 
          message: "Candidato no encontrado" 
        });
      }

      // Determinar fecha y año
      const fechaRecepcion = input.fechaRecepcion ?? new Date();
      const year = fechaRecepcion.getFullYear();

      // Derivar prefijo para la clave (ej. ILA, ESE, VISITA, etc.)
      const derivePrefix = (tipo: string) => {
        const t = tipo.trim().toUpperCase();
        if (t.startsWith('ILA')) return 'ILA';
        if (t.startsWith('ESE')) return 'ESE';
        if (t.startsWith('VISITA')) return 'VISITA';
        if (t.startsWith('BURÓ')) return 'BURO';
        if (t.startsWith('INVESTIGACIÓN')) return 'INVEST';
        if (t.startsWith('SEMANAS')) return 'SEMANAS';
        return t.split(' ')[0].replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'PROC';
      };
      const prefix = derivePrefix(input.tipoProducto);

      // Obtener consecutivo siguiente por prefijo/año (evita colisiones ESE LOCAL vs ESE FORANEO)
      const consecutivo = await db.getNextConsecutiveByClavePrefix(prefix, year);
      const clave = `${prefix}-${year}-${String(consecutivo).padStart(3, '0')}`;

      // FIX-20260217-01: Auto-asignar clientSiteId si no se proporciona
      // Buscar plazas disponibles del cliente
      let clientSiteIdToUse = input.clientSiteId;
      if (!clientSiteIdToUse) {
        const availableSites = await db.getClientSitesByClient(input.clienteId);
        if (availableSites.length > 0) {
          // Asignar la primera plaza disponible
          clientSiteIdToUse = availableSites[0].id;
        }
      }

      const id = await db.createProcess({
        candidatoId: input.candidatoId,
        clienteId: input.clienteId,
        puestoId: input.puestoId,
        clientSiteId: clientSiteIdToUse,
        tipoProducto: input.tipoProducto as any,
        medioDeRecepcion: input.medioDeRecepcion as any,
        fechaRecepcion,
        consecutivo,
        clave,
        // Heredar analistaAsignadoId del candidato
        analistaAsignadoId: candidate.analistaAsignadoId,
      } as any);

      await logAuditEvent(ctx, {
        action: "create",
        entityType: "process",
        entityId: id,
        details: {
          candidatoId: input.candidatoId,
          clienteId: input.clienteId,
          puestoId: input.puestoId,
          tipoProducto: input.tipoProducto,
          clave,
          analistaAsignadoId: candidate.analistaAsignadoId,
        },
      });

      return { id, clave } as const;
  }),

  updateStatus: protectedProcedure
    .use(requirePermission("procesos", "edit"))
    .input(z.object({ 
      id: z.number(), 
      estatusProceso: z.enum([
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
      ]) 
    }))
    .mutation(async ({ input, ctx }) => {
      const proc = await db.getProcessById(input.id);
      if (!proc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceso no encontrado" });
      }
      assertCanEditProcess(ctx, proc);

      await db.updateProcess(input.id, { estatusProceso: input.estatusProceso } as any);

      await logAuditEvent(ctx, {
        action: "update",
        entityType: "process_status",
        entityId: input.id,
        details: { estatusProceso: input.estatusProceso },
      });

      return { ok: true } as const;
    }),

  updateCalificacion: protectedProcedure
    // IMPL-20260320-07: trazabilidad de edición posterior a asignación inicial
    .use(requirePermission("procesos", "edit"))
    .input(z.object({ 
      id: z.number(), 
      calificacionFinal: z.enum(["pendiente","recomendable","con_reservas","no_recomendable","recomendable_con_observacion","con_reservas_con_observacion"]),
      comentarioCalificacion: z.string().optional(),
      motivoEdicion: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const proc = await db.getProcessById(input.id);
      if (!proc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceso no encontrado" });
      }
      assertCanEditProcess(ctx, proc);

      const calificacionAnterior = proc.calificacionFinal;
      const comentarioAnterior = (proc as any).comentarioCalificacion ?? null;
      const esCalifAsignada = !!calificacionAnterior && calificacionAnterior !== "pendiente";
      const esEdicionPosterior = esCalifAsignada && input.calificacionFinal !== calificacionAnterior;

      if (esEdicionPosterior && !input.motivoEdicion?.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Se requiere un motivo de edición para cambiar una calificación ya asignada.",
        });
      }

      const updateData: any = { calificacionFinal: input.calificacionFinal };
      if (input.comentarioCalificacion !== undefined) {
        updateData.comentarioCalificacion = input.comentarioCalificacion;
      }

      await db.updateProcess(input.id, updateData);

      await logAuditEvent(ctx, {
        action: "update",
        entityType: "process_score",
        entityId: input.id,
        details: {
          calificacionAnterior: calificacionAnterior ?? null,
          calificacionFinal: input.calificacionFinal,
          comentarioAnterior,
          comentarioNuevo: input.comentarioCalificacion ?? null,
          ...(esEdicionPosterior && {
            esEdicionPosterior: true,
            motivoEdicion: input.motivoEdicion,
          }),
        },
      });

      // Intentar generar/actualizar el resumen IA para cliente en segundo plano
      void maybeGenerateProcessIaDictamen(input.id);

      return { ok: true } as const;
    }),

  updatePanelDetail: protectedProcedure
    .use(requirePermission("procesos", "edit"))
    .input(z.object({
      id: z.number(),
      tipoProducto: z.string().optional(),
      especialistaAtraccionId: z.number().nullable().optional(),
      especialistaAtraccionNombre: z.string().trim().nullable().optional(),
      estatusVisual: z.enum(["nuevo","sin_entrevistar","entrevistado","en_proceso","pausado","cerrado","descartado"]),
      fechaCierre: z.string().nullable().optional(),
      investigacionLaboral: z.object({
        resultado: z.string().trim().optional(),
        detalles: z.string().trim().optional(),
        completado: z.boolean().optional(),
      }).partial().optional(),
      investigacionLegal: z.object({
        antecedentes: z.string().trim().optional(),
        flagRiesgo: z.boolean().optional(),
        archivoAdjuntoUrl: z.string().trim().optional(),
        notasPeriodisticas: z.string().trim().optional(),
        observacionesImss: z.string().trim().optional(),
        evidenciaImgUrl: z.string().trim().optional().nullable(),
        evidenciasGraficas: z.array(z.string()).optional(), // Array de URLs
      }).partial().optional(),
      semanasDetalle: z.object({
        comentario: z.string().trim().optional(),
        evidenciasGraficas: z.array(z.string()).optional(), // Array de URLs
      }).partial().optional(),
      antecedentesPenales: z.object({
        comentarios: z.string().trim().optional(),
        evidenciasGraficas: z.array(z.string()).optional(), // Array de URLs para galerías
      }).partial().optional(),
      buroCredito: z.object({
        estatus: z.string().trim().optional(),
        score: z.string().trim().optional(),
        aprobado: z.boolean().optional(),
        pdfUrl: z.string().trim().optional().nullable(),
        archivosAdicionales: z.array(z.string()).optional(), // Array de URLs para galerías
      }).partial().optional(),
      visitaDetalle: z.object({
        tipo: z.enum(["virtual","presencial"]).optional(),
        comentarios: z.string().trim().optional(),
        fechaRealizacion: z.string().optional(),
        enlaceReporteUrl: z.string().trim().optional(),
        evidenciasGraficas: z.array(z.string()).optional(), // Array de URLs para galerías
      }).partial().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const proc = await db.getProcessById(input.id);
      if (!proc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceso no encontrado" });
      }
      assertCanEditProcess(ctx, proc);

      // ARCH-20260321-10: el panel interno solo edita un subconjunto de visitaDetalle;
      // se debe preservar la captura completa del encuestador ya persistida.
      const previousVisitCapture = ((proc as any).visitaDetalle || {}) as Record<string, unknown>;
      const nextVisitCapture = {
        ...previousVisitCapture,
        ...(input.visitaDetalle || {}),
      };

      const payload: any = {
        tipoProducto: input.tipoProducto as any ?? proc.tipoProducto,
        especialistaAtraccionId: input.especialistaAtraccionId ?? null,
        especialistaAtraccionNombre: input.especialistaAtraccionNombre ?? null,
        estatusVisual: input.estatusVisual,
        fechaCierre: input.fechaCierre ? new Date(input.fechaCierre) : null,
        investigacionLaboral: input.investigacionLaboral,
        investigacionLegal: input.investigacionLegal,
        semanasDetalle: input.semanasDetalle,
        antecedentesPenales: input.antecedentesPenales,
        buroCredito: input.buroCredito,
        visitaDetalle: nextVisitCapture,
      };
      await db.updateProcess(input.id, payload);
      return { ok: true } as const;
    }),

  updateVisitCapture: protectedProcedure
    .use(requirePermission("procesos", "edit"))
    .input(
      z.object({
        id: z.number(),
        visitaDetalle: jsonRecordSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const proc = await db.getProcessById(input.id);
      if (!proc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceso no encontrado" });
      }

      assertCanEditProcess(ctx, proc);

      const previousVisitCapture = ((proc as any).visitaDetalle || {}) as Record<string, unknown>;
      const nextVisitCapture = input.visitaDetalle || {};
      const changedFields = getVisitCaptureChanges(previousVisitCapture, nextVisitCapture);

      if (changedFields.length === 0) {
        return { ok: true, changedFields: 0 } as const;
      }

      await db.updateProcess(input.id, { visitaDetalle: nextVisitCapture } as any);
      await logAuditEvent(ctx, {
        action: "update",
        entityType: "process_visita_detalle",
        entityId: input.id,
        details: {
          changedFields,
        },
      });

      return { ok: true, changedFields: changedFields.length } as const;
    }),

  getVisitCaptureAudit: protectedProcedure
    .use(requirePermission("procesos", "view"))
    .input(z.object({ id: z.number(), limit: z.number().int().min(1).max(100).optional() }))
    .query(async ({ input, ctx }) => {
      const proc = await db.getProcessById(input.id);
      if (!proc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceso no encontrado" });
      }

      assertCanEditProcess(ctx, proc);

      const drizzleDb = await db.getDb();
      if (!drizzleDb) return [];

      return drizzleDb
        .select({
          id: auditLogs.id,
          timestamp: auditLogs.timestamp,
          userId: auditLogs.userId,
          actorType: auditLogs.actorType,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          requestId: auditLogs.requestId,
          details: auditLogs.details,
          userName: users.name,
          userEmail: users.email,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(and(eq(auditLogs.entityType, "process_visita_detalle"), eq(auditLogs.entityId, String(input.id))))
        .orderBy(desc(auditLogs.timestamp))
        .limit(input.limit ?? 30);
    }),

  /**
   * Historial de auditoría de Calificación Final por proceso.
   * @intervention IMPL-20260320-02
   * @respaldo PROYECTO.md
   */
  getScoreAudit: protectedProcedure
    .use(requirePermission("procesos", "view"))
    .input(z.object({ id: z.number(), limit: z.number().int().min(1).max(100).optional() }))
    .query(async ({ input, ctx }) => {
      const proc = await db.getProcessById(input.id);
      if (!proc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceso no encontrado" });
      }

      assertCanEditProcess(ctx, proc);

      const drizzleDb = await db.getDb();
      if (!drizzleDb) return [];

      return drizzleDb
        .select({
          id: auditLogs.id,
          timestamp: auditLogs.timestamp,
          userId: auditLogs.userId,
          actorType: auditLogs.actorType,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          requestId: auditLogs.requestId,
          details: auditLogs.details,
          userName: users.name,
          userEmail: users.email,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(and(eq(auditLogs.entityType, "process_score"), eq(auditLogs.entityId, String(input.id))))
        .orderBy(desc(auditLogs.timestamp))
        .limit(input.limit ?? 30);
    }),

  /**
   * @intervention ARCH-20260320-01
   * @respaldo context/SPECs/SPEC-pdf-dinamico-estudio-cliente.md
   */
  getPublishedReportSummary: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const proc = await db.getProcessById(input.id);
      if (!proc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceso no encontrado" });
      }

      assertCanViewProcessReports(ctx, proc);

      const report = await db.getLatestPublishedProcessReportVersion(input.id);
      if (!report) return null;

      return {
        id: report.id,
        versionNumber: report.versionNumber,
        status: report.status,
        publishedAt: report.publishedAt,
        pdfFileName: report.pdfFileName,
        sections: report.sections ?? [],
      } as const;
    }),

  getPublishedReportAccess: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const proc = await db.getProcessById(input.id);
      if (!proc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceso no encontrado" });
      }

      assertCanViewProcessReports(ctx, proc);

      const report = await db.getLatestPublishedProcessReportVersion(input.id);
      if (!report || !report.pdfStoragePath) {
        return null;
      }

      const bucket = firebaseStorage.bucket();
      const file = bucket.file(report.pdfStoragePath);
      // Wrap Storage I/O para traducir errores de auth a mensajes legibles
      let signedUrl: string;
      try {
        const [url] = await file.getSignedUrl({
          action: "read",
          expires: new Date(Date.now() + 60 * 60 * 1000),
        });
        signedUrl = url;
      } catch (storageErr) {
        const msg = (storageErr as Error).message ?? '';
        const isAuthError = msg.includes('invalid_grant') || msg.includes('invalid_rapt') || msg.includes('UNAUTHENTICATED');
        console.error('[ProcessesRouter] Storage error (getPublishedReportAccess):', msg);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: isAuthError
            ? 'Error de autenticación con Firebase Storage (invalid_grant). Verifica GOOGLE_APPLICATION_CREDENTIALS en el servidor.'
            : `Error al generar URL de acceso al reporte: ${msg}`,
        });
      }

      await logAuditEvent(ctx, {
        action: "client_link_access",
        entityType: "process_report_version",
        entityId: report.id,
        details: {
          procesoId: input.id,
          versionNumber: report.versionNumber,
          status: report.status,
        },
      });

      return {
        id: report.id,
        versionNumber: report.versionNumber,
        url: signedUrl,
        pdfFileName: report.pdfFileName,
        publishedAt: report.publishedAt,
      } as const;
    }),

  getReportVersionAccess: protectedProcedure
    .input(z.object({ versionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const version = await db.getProcessReportVersionById(input.versionId);
      if (!version) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Versión no encontrada" });
      }

      const proc = await db.getProcessById(version.procesoId);
      if (!proc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceso no encontrado" });
      }

      assertCanViewProcessReports(ctx, proc);

      if (ctx.user.role === "client") {
        if (version.status !== "published") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No puedes acceder a esta versión" });
        }
      }

      if (!version.pdfStoragePath) {
        return null;
      }

      const bucket = firebaseStorage.bucket();
      const file = bucket.file(version.pdfStoragePath);
      // Wrap Storage I/O para traducir errores de auth a mensajes legibles
      let signedUrl: string;
      try {
        const [url] = await file.getSignedUrl({
          action: "read",
          expires: new Date(Date.now() + 60 * 60 * 1000),
        });
        signedUrl = url;
      } catch (storageErr) {
        const msg = (storageErr as Error).message ?? '';
        const isAuthError = msg.includes('invalid_grant') || msg.includes('invalid_rapt') || msg.includes('UNAUTHENTICATED');
        console.error('[ProcessesRouter] Storage error (getReportVersionAccess):', msg);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: isAuthError
            ? 'Error de autenticación con Firebase Storage (invalid_grant). Verifica GOOGLE_APPLICATION_CREDENTIALS en el servidor.'
            : `Error al generar URL de acceso a la versión del reporte: ${msg}`,
        });
      }

      await logAuditEvent(ctx, {
        action: "client_link_access",
        entityType: "process_report_version",
        entityId: version.id,
        details: {
          procesoId: version.procesoId,
          versionNumber: version.versionNumber,
          status: version.status,
          reportScope: version.reportScope,
        },
      });

      return {
        id: version.id,
        versionNumber: version.versionNumber,
        status: version.status,
        url: signedUrl,
        pdfFileName: version.pdfFileName,
        publishedAt: version.publishedAt,
      } as const;
    }),

  listReportVersions: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const proc = await db.getProcessById(input.id);
      if (!proc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceso no encontrado" });
      }

      assertCanViewProcessReports(ctx, proc);

      const versions = await db.getProcessReportVersions(input.id);
      return ctx.user.role === "client"
        ? versions.filter((version: any) => version.status === "published")
        : versions;
    }),

  createReportVersion: adminProcedure
    .use(requirePermission("procesos", "edit"))
    .input(
      z.object({
        id: z.number(),
        sections: z.array(z.enum(reportSectionValues)).min(1),
        snapshot: jsonRecordSchema,
        pdfFileName: z.string().trim().min(1).optional(),
        pdfStoragePath: z.string().trim().min(1).optional(),
        reportScope: z.enum(["armado_manual", "legacy_visit_pdf"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const proc = await db.getProcessById(input.id);
      if (!proc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceso no encontrado" });
      }

      assertCanEditProcess(ctx, proc);

      const created = await db.createProcessReportVersion({
        procesoId: input.id,
        sections: input.sections as unknown as string[],
        snapshot: input.snapshot,
        pdfFileName: input.pdfFileName,
        pdfStoragePath: input.pdfStoragePath,
        reportScope: input.reportScope ?? "armado_manual",
        status: "draft",
        createdByUserId: Number(ctx.user!.id) || null,
        createdByName: ctx.user!.name || ctx.user!.email || "Sistema interno",
      } as any);

      await logAuditEvent(ctx, {
        action: "create",
        entityType: "process_report_version",
        entityId: created.id,
        details: {
          procesoId: input.id,
          versionNumber: created.versionNumber,
          sections: input.sections,
          reportScope: input.reportScope ?? "armado_manual",
        },
      });

      return created;
    }),

  createLegacyReportDraft: adminProcedure
    .use(requirePermission("procesos", "edit"))
    .input(
      z.object({
        id: z.number(),
        sections: z.array(z.enum(reportSectionValues)).min(1),
        snapshot: jsonRecordSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const proc = await db.getProcessById(input.id);
      if (!proc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceso no encontrado" });
      }

      assertCanEditProcess(ctx, proc);

      const drizzleDb = await db.getDb();
      if (!drizzleDb) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
      }

      // ── Fase 1: PDF (generarArmadoClientePDF intenta HTML-first/Playwright y cae a pdf-lib) ──
      // @intervention IMPL-20260408-01
      const pdfBytes = await generarArmadoClientePDF(input.snapshot, input.sections as string[]);
      const rendererUsed = "html_first_with_pdf_lib_fallback" as const;

      const timestamp = Date.now();
      const storagePath = `estudios/${input.id}/armado-draft-${timestamp}.pdf`;
      const bucket = firebaseStorage.bucket();
      const pdfFile = bucket.file(storagePath);
      // Wrap Storage I/O para traducir errores de auth a mensajes legibles
      try {
        await pdfFile.save(Buffer.from(pdfBytes), { contentType: "application/pdf", resumable: false });
      } catch (storageErr) {
        const msg = (storageErr as Error).message ?? '';
        const isAuthError = msg.includes('invalid_grant') || msg.includes('invalid_rapt') || msg.includes('UNAUTHENTICATED');
        console.error('[ProcessesRouter] Storage error (createLegacyReportDraft) PDF:', msg);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: isAuthError
            ? 'Error de autenticación con Firebase Storage (invalid_grant). Verifica GOOGLE_APPLICATION_CREDENTIALS en el servidor.'
            : `Error al guardar PDF de armado en Storage: ${msg}`,
        });
      }

      // ── Fase 2: HTML editorial (renderArmadoHtml — IMPL-20260408-01) ─────────
      // Genera el HTML standalone desde el mismo snapshot y lo persiste en Storage.
      // Permite preview interno sin re-renderizar en cada consulta.
      let htmlStoragePath: string | null = null;
      try {
        const { renderArmadoHtml } = await import("../utils/armadoHtmlRenderer.js");
        const htmlContent = await renderArmadoHtml(
          input.snapshot,
          input.sections as string[],
          { versionNumber: undefined },
        );
        const htmlPath = `estudios/${input.id}/armado-draft-${timestamp}.html`;
        const htmlFile = bucket.file(htmlPath);
        await htmlFile.save(Buffer.from(htmlContent, 'utf-8'), {
          contentType: 'text/html; charset=utf-8',
          resumable: false,
        });
        htmlStoragePath = htmlPath;
        console.info('[ProcessesRouter] HTML de armado guardado en Storage:', htmlPath);
      } catch (htmlErr) {
        // El HTML es best-effort: si falla, getReportVersionHtml regenerará on-demand
        console.warn('[ProcessesRouter] No se pudo guardar HTML en Storage (regeneración on-demand disponible):', (htmlErr as Error).message ?? String(htmlErr));
      }

      const created = await db.createProcessReportVersion({
        procesoId: input.id,
        sections: input.sections as unknown as string[],
        snapshot: input.snapshot,
        pdfFileName: `armado-${proc.clave}.pdf`,
        pdfStoragePath: storagePath,
        htmlStoragePath: htmlStoragePath ?? undefined,
        reportScope: "armado_manual",
        status: "draft",
        createdByUserId: Number(ctx.user!.id) || null,
        createdByName: ctx.user!.name || ctx.user!.email || "Sistema interno",
      } as any);

      await logAuditEvent(ctx, {
        action: "create",
        entityType: "process_report_version",
        entityId: created.id,
        details: {
          procesoId: input.id,
          versionNumber: created.versionNumber,
          sections: input.sections,
          reportScope: "armado_manual",
          storagePath,
          htmlStoragePath,
          rendererUsed,
        },
      });

      return {
        id: created.id,
        versionNumber: created.versionNumber,
        storagePath,
        htmlStoragePath,
        rendererUsed,
      } as const;
    }),

  publishReportVersion: adminProcedure
    .use(requirePermission("procesos", "edit"))
    .input(z.object({ versionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const version = await db.getProcessReportVersionById(input.versionId);
      if (!version) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Versión no encontrada" });
      }

      const proc = await db.getProcessById(version.procesoId);
      if (!proc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceso no encontrado" });
      }

      assertCanEditProcess(ctx, proc);

      if (!version.pdfStoragePath) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "La versión no tiene PDF asociado para publicarse",
        });
      }

      // ── Regenerar PDF + HTML con el renderer *actual* antes de publicar ──
      // Garantiza que el PDF publicado sea visualmente consistente con el HTML editorial.
      // @intervention IMPL-20260408-03
      const bucket = firebaseStorage.bucket();
      const timestamp = Date.now();
      const snapshot = version.snapshot as Record<string, any>;
      const sections = version.sections as string[];

      let freshPdfStoragePath = version.pdfStoragePath;
      let freshHtmlStoragePath = version.htmlStoragePath ?? null;

      try {
        const { renderArmadoHtml } = await import("../utils/armadoHtmlRenderer.js");
        const { renderHtmlToPdf } = await import("../utils/armadoPdfFromHtml.js");

        // Regenerar HTML
        const htmlContent = await renderArmadoHtml(snapshot, sections, { versionNumber: version.versionNumber });
        const newHtmlPath = `estudios/${version.procesoId}/armado-v${version.versionNumber}-published-${timestamp}.html`;
        await bucket.file(newHtmlPath).save(Buffer.from(htmlContent, "utf-8"), {
          contentType: "text/html; charset=utf-8",
          resumable: false,
        });
        freshHtmlStoragePath = newHtmlPath;
        console.info("[publishReportVersion] HTML regenerado:", newHtmlPath);

        // Regenerar PDF desde el HTML (HTML-first)
        const pdfBytes = await renderHtmlToPdf(htmlContent);
        if (pdfBytes) {
          const newPdfPath = `estudios/${version.procesoId}/armado-v${version.versionNumber}-published-${timestamp}.pdf`;
          await bucket.file(newPdfPath).save(Buffer.from(pdfBytes), {
            contentType: "application/pdf",
            resumable: false,
          });
          freshPdfStoragePath = newPdfPath;
          console.info("[publishReportVersion] PDF regenerado via HTML-first:", newPdfPath);
        } else {
          // Fallback pdf-lib: regenerar con renderer legacy
          const pdfFallbackBytes = await generarArmadoClientePDF(snapshot, sections);
          const newPdfPath = `estudios/${version.procesoId}/armado-v${version.versionNumber}-published-${timestamp}.pdf`;
          await bucket.file(newPdfPath).save(Buffer.from(pdfFallbackBytes), {
            contentType: "application/pdf",
            resumable: false,
          });
          freshPdfStoragePath = newPdfPath;
          console.info("[publishReportVersion] PDF regenerado via fallback pdf-lib:", newPdfPath);
        }
      } catch (regenErr) {
        // Si la regeneración falla totalmente, continuar con el PDF existente (no bloquear publicación)
        console.warn("[publishReportVersion] Regeneración de PDF/HTML falló — publicando con assets existentes:", (regenErr as Error).message ?? String(regenErr));
      }

      // Actualizar pdfStoragePath y htmlStoragePath con los artefactos frescos
      if (freshPdfStoragePath !== version.pdfStoragePath || freshHtmlStoragePath !== version.htmlStoragePath) {
        const drizzleDb = await db.getDb();
        if (drizzleDb) {
          await drizzleDb
            .update(processReportVersions)
            .set({
              pdfStoragePath: freshPdfStoragePath,
              ...(freshHtmlStoragePath ? { htmlStoragePath: freshHtmlStoragePath } : {}),
            })
            .where(eq(processReportVersions.id, input.versionId));
        }
      }

      const published = await db.publishProcessReportVersion(input.versionId, {
        userId: Number(ctx.user!.id) || null,
        name: ctx.user!.name || ctx.user!.email || "Sistema interno",
      });

      await logAuditEvent(ctx, {
        action: "update",
        entityType: "process_report_version",
        entityId: input.versionId,
        details: {
          procesoId: version.procesoId,
          versionNumber: version.versionNumber,
          publishedAt: published.publishedAt,
          pdfRegenerated: freshPdfStoragePath !== version.pdfStoragePath,
          htmlRegenerated: freshHtmlStoragePath !== version.htmlStoragePath,
        },
      });

      return {
        id: published.id,
        versionNumber: published.versionNumber,
        status: published.status,
        publishedAt: published.publishedAt,
      } as const;
    }),

  deleteReportVersion: adminProcedure
    .use(requirePermission("procesos", "edit"))
    .input(z.object({ versionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const version = await db.getProcessReportVersionById(input.versionId);
      if (!version) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Versión no encontrada" });
      }

      const proc = await db.getProcessById(version.procesoId);
      if (!proc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceso no encontrado" });
      }

      assertCanEditProcess(ctx, proc);

      if (version.status === "published") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No se puede eliminar una versión publicada desde este flujo",
        });
      }

      if (version.pdfStoragePath) {
        const bucket = firebaseStorage.bucket();
        const file = bucket.file(version.pdfStoragePath);
        try {
          await file.delete({ ignoreNotFound: true } as any);
        } catch {
          // Si el archivo ya no existe o falla el borrado físico, no abortamos la limpieza lógica.
        }
      }

      await db.deleteProcessReportVersion(input.versionId);

      await logAuditEvent(ctx, {
        action: "delete",
        entityType: "process_report_version",
        entityId: input.versionId,
        details: {
          procesoId: version.procesoId,
          versionNumber: version.versionNumber,
          status: version.status,
          reportScope: version.reportScope,
          storagePath: version.pdfStoragePath,
        },
      });

      return { ok: true } as const;
    }),

  /**
   * Preview HTML interno para revisión editorial de una versión draft.
   * Solo accesible para usuarios internos (admin). Retorna HTML desde el
   * editorialSnapshot inmutable — no lee datos vivos del proceso.
   *
   * @intervention IMPL-20260320-01
   * @respaldo context/SPECs/SPEC-pdf-dinamico-estudio-cliente.md
   */
  getReportVersionHtml: adminProcedure
    .use(requirePermission("procesos", "view"))
    .input(z.object({ versionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const version = await db.getProcessReportVersionById(input.versionId);
      if (!version) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Versión no encontrada" });
      }

      const proc = await db.getProcessById(version.procesoId);
      if (!proc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceso no encontrado" });
      }

      assertCanViewProcessReports(ctx, proc);

      // Preview HTML es exclusivo de uso interno — clientes no pueden acceder
      if (ctx.user!.role === "client") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "El preview HTML es exclusivo para revisión interna.",
        });
      }

      // ── HTML-first: leer HTML persistido o regenerar on-demand ─────────────
      // @intervention IMPL-20260408-01
      // @respaldo context/SPECs/SPEC-pdf-dinamico-estudio-cliente.md
      if (version.htmlStoragePath) {
        // HTML previamente guardado en Storage — descargar y retornar
        const bucket = firebaseStorage.bucket();
        const htmlFile = bucket.file(version.htmlStoragePath);
        let htmlContent: string;
        try {
          const [buffer] = await htmlFile.download();
          htmlContent = buffer.toString('utf-8');
        } catch (dlErr) {
          const msg = (dlErr as Error).message ?? '';
          const isAuthError = msg.includes('invalid_grant') || msg.includes('invalid_rapt') || msg.includes('UNAUTHENTICATED');
          console.error('[ProcessesRouter] Storage error (getReportVersionHtml download):', msg);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: isAuthError
              ? 'Error de autenticación con Firebase Storage al descargar HTML de armado.'
              : `Error al descargar HTML de armado: ${msg}`,
          });
        }
        return { html: htmlContent, versionId: input.versionId, source: 'storage' } as const;
      }

      // Fallback: regenerar desde snapshot + sections inmutables de la versión
      // (usado para versiones draft anteriores al hotfix IMPL-20260408-01)
      try {
        const { renderArmadoHtml } = await import("../utils/armadoHtmlRenderer.js");
        const html = await renderArmadoHtml(
          version.snapshot as Record<string, any>,
          version.sections as string[],
          { versionNumber: version.versionNumber },
        );
        return { html, versionId: input.versionId, source: 'regenerated' } as const;
      } catch (renderErr) {
        console.error('[ProcessesRouter] Error regenerando HTML de armado:', (renderErr as Error).message);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error al generar el preview HTML del armado.',
        });
      }
    }),

  generarDictamen: protectedProcedure
    .use(requirePermission("procesos", "edit"))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const proc = await db.getProcessById(input.id);
      if (!proc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceso no encontrado" });
      }
      assertCanEditProcess(ctx, proc);
      if (!proc.calificacionFinal || proc.calificacionFinal === 'pendiente') {
        throw new Error("Define la calificación final antes de generar el dictamen");
      }

      // Usar bucket por defecto configurado en admin.initializeApp para evitar errores de nombre
      const bucket = firebaseStorage.bucket();
      const key = `processes/${proc.id}/dictamen-${proc.calificacionFinal}-${Date.now()}.txt`;

      const contenido = `Dictamen del Proceso\n\nClave: ${proc.clave}\nProceso: ${proc.tipoProducto}\nCalificación final: ${proc.calificacionFinal}\nFecha: ${new Date().toISOString()}\nGenerado por: ${ctx.user!.email || ctx.user!.name || 'Admin'}\n`;
      const file = bucket.file(key);
      // Wrap Storage I/O para traducir errores de auth a mensajes legibles
      let signedUrl: string;
      try {
        await file.save(Buffer.from(contenido, 'utf8'), { contentType: 'text/plain', resumable: false });
        const [url] = await file.getSignedUrl({ action: 'read', expires: new Date(Date.now() + 365*24*60*60*1000) });
        signedUrl = url;
      } catch (storageErr) {
        const msg = (storageErr as Error).message ?? '';
        const isAuthError = msg.includes('invalid_grant') || msg.includes('invalid_rapt') || msg.includes('UNAUTHENTICATED');
        console.error('[ProcessesRouter] Storage error (generarDictamen):', msg);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: isAuthError
            ? 'Error de autenticación con Firebase Storage (invalid_grant). Verifica GOOGLE_APPLICATION_CREDENTIALS en el servidor.'
            : `Error al guardar dictamen en Storage: ${msg}`,
        });
      }

      // guardar documento
      await db.createDocument({
        procesoId: proc.id,
        tipoDocumento: 'DICTAMEN',
        nombreArchivo: `dictamen-${proc.clave}.txt`,
        url: signedUrl,
        fileKey: key as any,
        mimeType: 'text/plain',
        uploadedBy: ctx.user!.email || ctx.user!.name || 'Admin',
      } as any);

      // actualizar proceso con enlaces
      await db.updateProcess(proc.id, { archivoDictamenUrl: signedUrl as any, archivoDictamenPath: key as any } as any);
      // Generar/actualizar resumen IA para el cliente en segundo plano
      void maybeGenerateProcessIaDictamen(proc.id);

      return { url: signedUrl, path: key } as const;
    }),

  // ==========================
  // VISITAS DOMICILIARIAS
  // ==========================
  listVisits: protectedProcedure
    .use(requirePermission("visitas", "view"))
    .query(async ({ ctx }) => {
      const all = await db.getAllProcesses();
      const filtered = ctx.user!.role === 'client'
        ? all.filter((p: any) => p.clienteId === (ctx.user as any).clientId)
        : all;
      return filtered
        .filter((p: any) => p.visitStatus && (p.visitStatus.status || p.visitStatus.scheduledDateTime))
        .map((p: any) => ({
          id: p.id,
          clave: p.clave,
          tipoProducto: p.tipoProducto,
          clienteId: p.clienteId,
          candidatoId: p.candidatoId,
          visitStatus: p.visitStatus || {},
        }));
    }),

  visitAssign: protectedProcedure
    .use(requirePermission("visitas", "edit"))
    .input(z.object({ id: z.number(), encuestadorId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const proc = await db.getProcessById(input.id);
      if (!proc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceso no encontrado" });
      }
      assertCanEditProcess(ctx, proc);
      const prev = (proc as any).visitStatus || {};
      await db.updateProcess(input.id, { visitStatus: { ...prev, status: prev.scheduledDateTime ? 'programada' : 'asignada', encuestadorId: input.encuestadorId } } as any);
      return { ok: true } as const;
    }),

  /** @intervention IMPL-20260313-02 — genera token para Portal del Encuestador */
  visitSchedule: protectedProcedure
    .use(requirePermission("visitas", "edit"))
    .input(z.object({ id: z.number(), fechaHora: z.string(), direccion: z.string().optional(), observaciones: z.string().optional(), encuestadorId: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      const proc = await db.getProcessById(input.id);
      if (!proc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceso no encontrado" });
      }
      assertCanEditProcess(ctx, proc);
      const prev = (proc as any).visitStatus || {};
      await db.updateProcess(input.id, { visitStatus: { ...prev, status: 'programada', scheduledDateTime: input.fechaHora, direccion: input.direccion, observaciones: input.observaciones, encuestadorId: input.encuestadorId ?? prev.encuestadorId } } as any);

      // Generar o reutilizar token para Portal del Encuestador
      const drizzleDb = await db.getDb();
      if (!drizzleDb) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
      }

      // Verificar si ya existe un token activo (PENDIENTE o EN_CURSO) para este proceso
      const existingTokens = await drizzleDb
        .select()
        .from(surveyorTokens)
        .where(
          and(
            eq(surveyorTokens.processId, input.id),
            eq(surveyorTokens.status, "PENDIENTE")
          )
        )
        .limit(1);

      let surveyorToken: string;

      if (existingTokens.length > 0) {
        // Reutilizar token activo existente
        surveyorToken = existingTokens[0].token;
      } else {
        // Crear nuevo token
        surveyorToken = randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días
        await drizzleDb
          .insert(surveyorTokens)
          .values({
            token: surveyorToken,
            processId: input.id,
            surveyorId: input.encuestadorId ?? null,
            status: "PENDIENTE",
            expiresAt,
          });
      }

      return { ok: true, surveyorToken } as const;
    }),

  visitUpdate: protectedProcedure
    .use(requirePermission("visitas", "edit"))
    .input(z.object({ id: z.number(), fechaHora: z.string().optional(), direccion: z.string().optional(), observaciones: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const proc = await db.getProcessById(input.id);
      if (!proc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceso no encontrado" });
      }
      assertCanEditProcess(ctx, proc);
      const prev = (proc as any).visitStatus || {};
      await db.updateProcess(input.id, { visitStatus: { ...prev, scheduledDateTime: input.fechaHora ?? prev.scheduledDateTime, direccion: input.direccion ?? prev.direccion, observaciones: input.observaciones ?? prev.observaciones } } as any);
      return { ok: true } as const;
    }),

  visitMarkDone: protectedProcedure
    .use(requirePermission("visitas", "edit"))
    .input(z.object({ id: z.number(), observaciones: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const proc = await db.getProcessById(input.id);
      if (!proc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceso no encontrado" });
      }
      assertCanEditProcess(ctx, proc);
      const prev = (proc as any).visitStatus || {};
      await db.updateProcess(input.id, { visitStatus: { ...prev, status: 'realizada', observaciones: input.observaciones ?? prev.observaciones } } as any);
      return { ok: true } as const;
    }),

  visitCancel: protectedProcedure
    .use(requirePermission("visitas", "edit"))
    .input(z.object({ id: z.number(), motivo: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const proc = await db.getProcessById(input.id);
      if (!proc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceso no encontrado" });
      }
      assertCanEditProcess(ctx, proc);
      const prev = (proc as any).visitStatus || {};
      await db.updateProcess(input.id, { visitStatus: { ...prev, status: 'no_asignada', scheduledDateTime: undefined, observaciones: input.motivo ?? prev.observaciones } } as any);
      return { ok: true } as const;
    }),

  // ==========================
  // ELIMINAR PROCESO
  // ==========================
  delete: adminProcedure
    .use(requirePermission("procesos", "delete"))
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await db.deleteProcess(input.id);
      return { ok: true } as const;
    }),
});

async function maybeGenerateProcessIaDictamen(procesoId: number) {
  try {
    if (!ENV.forgeApiKey) {
      // IA no configurada; salir silenciosamente
      return;
    }

    const proc = await db.getProcessById(procesoId);
    if (!proc) return;

    // Solo generar cuando exista calificación final distinta de pendiente
    if (!proc.calificacionFinal || proc.calificacionFinal === "pendiente") {
      return;
    }

    // Respetar la preferencia de IA a nivel cliente
    const client = proc.clienteId ? await db.getClientById(proc.clienteId) : undefined;
    if (!client?.iaSuggestionsEnabled) {
      return;
    }

    const candidate = proc.candidatoId
      ? await db.getCandidateById(proc.candidatoId)
      : undefined;

    const trabajos = proc.candidatoId
      ? await db.getWorkHistoryByCandidate(proc.candidatoId)
      : [];

    const trabajosTexto =
      trabajos.length === 0
        ? "Sin historial laboral registrado en el sistema."
        : trabajos
            .map((w: any, idx: number) => {
              const ia = (w.investigacionDetalle as any)?.iaDictamen || {};
              const lineaBase =
                `Empleo ${idx + 1}: ${safeText(w.puesto)} en ${safeText(
                  w.empresa
                )} (${safeText(w.fechaInicio)} – ${safeText(w.fechaFin || "Actual")}). ` +
                `Dictamen humano: ${safeText(
                  CALIFICACION_LABELS[w.resultadoVerificacion as string] ||
                    w.resultadoVerificacion
                )}.`;
              const lineaIa = ia.resumenCorto
                ? ` Resumen IA: ${String(ia.resumenCorto)}`
                : "";
              return lineaBase + lineaIa;
            })
            .join("\n");

    const invLab: any = (proc as any).investigacionLaboral || {};
    const invLegal: any = (proc as any).investigacionLegal || {};
    const buro: any = (proc as any).buroCredito || {};
    const visita: any = (proc as any).visitaDetalle || (proc as any).visitStatus || {};

    const systemPrompt =
      "Eres un redactor experto en informes ejecutivos para clientes corporativos en México. " +
      "Recibes la información de un proceso de investigación de un candidato (laboral, legal, buró, visita, etc.) " +
      "y debes generar un resumen claro, profesional y fácil de entender para un gerente de recursos humanos.\n\n" +
      "Muy importante:\n" +
      "- El dictamen HUMANO (calificación final) ya está definido y NO debes cambiarlo ni contradecirlo.\n" +
      "- Tus textos deben reforzar y explicar la decisión humana, nunca suavizar un 'no recomendable' ni elevar un 'con reservas' a 'recomendable'.\n" +
      "- El texto que generes será visible para el cliente, así que evita términos técnicos excesivos.\n" +
      "- Devuelve SIEMPRE un JSON válido con las claves: resumenEjecutivoCliente, recomendacionesCliente, notaInternaAnalista, dictamenFinal.";

    const userPrompt =
      `Información del proceso:\n` +
      `- Clave del proceso: ${safeText(proc.clave)}\n` +
      `- Tipo de proceso: ${safeText(proc.tipoProducto)}\n` +
      `- Cliente: ${safeText(client?.nombreEmpresa)}\n` +
      `- Candidato: ${safeText(candidate?.nombreCompleto)}\n` +
      `- Puesto: ${safeText((candidate as any)?.puestoNombre || "")}\n` +
      `- Fecha de recepción: ${safeText(proc.fechaRecepcion)}\n` +
      `- Fecha de cierre: ${safeText(proc.fechaCierre)}\n` +
      `- Calificación final (humana): ${safeText(
        CALIFICACION_LABELS[proc.calificacionFinal as string] ||
          proc.calificacionFinal
      )}\n\n` +
      `Bloques del proceso:\n` +
      `1) Investigación laboral:\n` +
      `   - Resultado: ${safeText(invLab.resultado)}\n` +
      `   - Detalles: ${safeText(invLab.detalles)}\n` +
      `   - Completado: ${invLab.completado ? "Sí" : "No"}\n\n` +
      `2) Investigación legal:\n` +
      `   - Antecedentes: ${safeText(invLegal.antecedentes)}\n` +
      `   - Indicador de riesgo: ${
        invLegal.flagRiesgo === true
          ? "Con riesgo"
          : invLegal.flagRiesgo === false
          ? "Sin riesgo relevante"
          : "No especificado"
      }\n\n` +
      `3) Buró de crédito:\n` +
      `   - Estatus: ${safeText(buro.estatus)}\n` +
      `   - Score: ${safeText(buro.score)}\n` +
      `   - Aprobado: ${
        buro.aprobado === true
          ? "Aprobado"
          : buro.aprobado === false
          ? "Rechazado"
          : "No especificado"
      }\n\n` +
      `4) Visita domiciliaria/virtual:\n` +
      `   - Tipo: ${safeText(visita.tipo || visita.status)}\n` +
      `   - Comentarios: ${safeText(visita.comentarios || visita.observaciones)}\n` +
      `   - Fecha realización / programada: ${safeText(
        visita.fechaRealizacion || visita.scheduledDateTime
      )}\n\n` +
      `Historial laboral considerado (incluye resúmenes IA por empleo cuando existen):\n` +
      `${trabajosTexto}\n\n` +
      `Instrucciones de salida:\n` +
      `- resumenEjecutivoCliente: 1–3 párrafos cortos que expliquen de forma equilibrada el perfil del candidato, apoyando el dictamen humano.\n` +
      `- recomendacionesCliente: arreglo de frases cortas con sugerencias prácticas (por ejemplo: tipo de seguimiento, periodo de prueba, áreas a supervisar).\n` +
      `- notaInternaAnalista: comentario breve SOLO para el analista (no para el cliente), aclarando cómo usar este resumen IA.\n` +
      `- dictamenFinal: copia EXACTA del valor de calificación final: "${proc.calificacionFinal}".\n\n` +
      `Responde ÚNICAMENTE con un objeto JSON con esta estructura:\n` +
      `{\n` +
      `  "resumenEjecutivoCliente": "string",\n` +
      `  "recomendacionesCliente": ["string"],\n` +
      `  "notaInternaAnalista": "string",\n` +
      `  "dictamenFinal": "${proc.calificacionFinal}"\n` +
      `}`;

    const result = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1024,
    });

    const firstChoice = result.choices?.[0];
    if (!firstChoice) return;

    const rawContent = firstChoice.message.content as any;
    let jsonText: string | undefined;

    if (typeof rawContent === "string") {
      jsonText = rawContent;
    } else if (Array.isArray(rawContent)) {
      const textPart = rawContent.find((p: any) => p.type === "text");
      jsonText = textPart?.text;
    }

    if (!jsonText) return;

    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return;
    }

    const iaDictamenCliente = {
      resumenEjecutivoCliente:
        typeof parsed.resumenEjecutivoCliente === "string"
          ? parsed.resumenEjecutivoCliente
          : "",
      recomendacionesCliente: Array.isArray(parsed.recomendacionesCliente)
        ? parsed.recomendacionesCliente.map((x: any) => String(x)).filter(Boolean)
        : [],
      notaInternaAnalista:
        typeof parsed.notaInternaAnalista === "string"
          ? parsed.notaInternaAnalista
          : "",
      dictamenFinal: proc.calificacionFinal,
      generatedAt: new Date().toISOString(),
    };

    const mergedInvestigacionLaboral = {
      ...(invLab || {}),
      iaDictamenCliente,
    };

    await db.updateProcess(proc.id, {
      investigacionLaboral: mergedInvestigacionLaboral as any,
    } as any);
  } catch (error) {
    console.error(
      "[IA] Error generando dictamen IA para proceso",
      procesoId,
      error
    );
  }
}
