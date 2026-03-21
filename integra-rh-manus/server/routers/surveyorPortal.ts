/**
 * @intervention ARCH-20260319-03 | IMPL-20260320-15
 * Portal del Encuestador — Router público (sin autenticación).
 * IMPL-20260320-15: blindado operaciones de Storage (uploadPhoto, generateStudyPDF)
 * con traducción de invalid_grant → mensaje legible, consistente con documents.ts.
 * @respaldo PROYECTO.md
 * El encuestador accede mediante un token UUID de vida corta generado
 * al momento de programar la visita desde el panel de oficina.
 * @respaldo PROYECTO.md
 */

import { router, publicProcedure, protectedProcedure, adminProcedure, requirePermission } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";
import { surveyorTokens, processes, candidates } from "../../drizzle/schema";
import { getDb } from "../db";
import { storage } from "../firebase";
import { logAuditEvent } from "../_core/audit";
import { generarEstudioSocioeconomicoPDF } from "../utils/estudiosocioPdf";

export const surveyorPortalRouter = router({

  // ── Obtener contexto pre-cargado del formulario ──────────────────────────
  // Valida el token y devuelve los datos del candidato pre-llenos.
  getContext: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
      }

      // 1. Buscar token en surveyorTokens
      const tokenRows = await db
        .select()
        .from(surveyorTokens)
        .where(eq(surveyorTokens.token, input.token))
        .limit(1);

      if (tokenRows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Link inválido" });
      }

      const tokenRecord = tokenRows[0];

      // 2. Si ya fue completado → error
      if (tokenRecord.status === "COMPLETADO") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Este formulario ya fue completado" });
      }

      // 3. Si expiró → error
      if (tokenRecord.expiresAt < new Date()) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Este link ha expirado" });
      }

      // 4. Buscar proceso con JOIN a candidato
      const processRows = await db
        .select({
          // Proceso
          id: processes.id,
          visitStatus: processes.visitStatus,
          // Candidato
          candidatoId: candidates.id,
          nombreCompleto: candidates.nombreCompleto,
          telefono: candidates.telefono,
          perfilDetalle: candidates.perfilDetalle,
        })
        .from(processes)
        .innerJoin(candidates, eq(processes.candidatoId, candidates.id))
        .where(eq(processes.id, tokenRecord.processId))
        .limit(1);

      if (processRows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceso no encontrado" });
      }

      const row = processRows[0];
      const visitStatus = (row.visitStatus as any) ?? {};
      const perfilDetalle = (row.perfilDetalle as any) ?? {};

      // 5. Devolver solo datos que el encuestador necesita (NO datos internos)
      return {
        candidato: {
          nombre: row.nombreCompleto,
          celular: row.telefono ?? null,
          curp: perfilDetalle?.generales?.curp ?? null,
        },
        proceso: {
          direccion: visitStatus?.direccion ?? null,
          scheduledDateTime: visitStatus?.scheduledDateTime ?? null,
          observaciones: visitStatus?.observaciones ?? null,
        },
        tokenStatus: tokenRecord.status,
      };
    }),

  // ── Guardar progreso (auto-guardado frecuente) ───────────────────────────
  saveProgress: publicProcedure
    .input(z.object({
      token: z.string(),
      data: z.any(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
      }

      // 1. Validar token
      const tokenRows = await db
        .select()
        .from(surveyorTokens)
        .where(eq(surveyorTokens.token, input.token))
        .limit(1);

      if (tokenRows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Link inválido" });
      }

      const tokenRecord = tokenRows[0];

      if (tokenRecord.expiresAt < new Date()) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Este link ha expirado" });
      }

      if (tokenRecord.status === "COMPLETADO") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Este formulario ya fue completado" });
      }

      // 2. Si está PENDIENTE, transicionarlo a EN_CURSO
      if (tokenRecord.status === "PENDIENTE") {
        await db
          .update(surveyorTokens)
          .set({ status: "EN_CURSO" })
          .where(eq(surveyorTokens.id, tokenRecord.id));
      }

      // 3. Obtener visitaDetalle existente y hacer merge (no reemplazar)
      const processRows = await db
        .select({ visitaDetalle: processes.visitaDetalle })
        .from(processes)
        .where(eq(processes.id, tokenRecord.processId))
        .limit(1);

      const existingDetalle = (processRows[0]?.visitaDetalle as any) ?? {};
      const mergedDetalle = { ...existingDetalle, ...input.data };

      await db
        .update(processes)
        .set({ visitaDetalle: mergedDetalle } as any)
        .where(eq(processes.id, tokenRecord.processId));

      // ARCH-20260321-18: audit mínimo para reconstruir incidentes de captura.
      await logAuditEvent(ctx, {
        action: "update",
        entityType: "surveyorPortal_saveProgress",
        entityId: tokenRecord.processId,
        details: {
          tokenId: tokenRecord.id,
          fieldCount: Object.keys(input.data ?? {}).length,
        },
      });

      return { ok: true, savedAt: new Date().toISOString() } as const;
    }),

  // ── Subir una foto a Firebase Storage ────────────────────────────────────
  // El cliente envía base64; el servidor sube al bucket y devuelve la URL pública.
  // SECURITY: se sanitiza fieldPath para prevenir path traversal.
  uploadPhoto: publicProcedure
    .input(z.object({
      token: z.string(),
      fieldPath: z.string().max(200),
      base64: z.string().max(12_000_000),          // ~9 MB imagen JPEG full
      mimeType: z.string().regex(/^image\/(jpeg|jpg|png|webp)$/),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });

      // 1. Validar token
      const tokenRows = await db
        .select()
        .from(surveyorTokens)
        .where(eq(surveyorTokens.token, input.token))
        .limit(1);

      if (tokenRows.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Link inválido" });
      const tokenRecord = tokenRows[0];
      if (tokenRecord.expiresAt < new Date()) throw new TRPCError({ code: "FORBIDDEN", message: "Link expirado" });
      if (tokenRecord.status === "COMPLETADO") throw new TRPCError({ code: "FORBIDDEN", message: "Formulario ya completado" });

      // 2. Construir ruta segura en Storage
      const sanitizedField = input.fieldPath.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
      const tokenPrefix   = input.token.slice(0, 8);
      const ext           = input.mimeType === "image/png" ? "png" : "jpg";
      const storagePath   = `encuestas/${tokenRecord.processId}/${tokenPrefix}/${sanitizedField}.${ext}`;

      // 3. Decodificar base64 → Buffer y subir
      const raw    = input.base64.replace(/^data:image\/[a-z]+;base64,/, "");
      const buffer = Buffer.from(raw, "base64");

      const bucket = storage.bucket();
      const file   = bucket.file(storagePath);
      // Wrap Storage I/O para traducir errores de auth a mensajes legibles
      try {
        await file.save(buffer, { metadata: { contentType: input.mimeType }, resumable: false });
        await file.makePublic();
      } catch (storageErr) {
        const msg = (storageErr as Error).message ?? '';
        const isAuthError = msg.includes('invalid_grant') || msg.includes('invalid_rapt') || msg.includes('UNAUTHENTICATED');
        console.error('[SurveyorPortalRouter] Storage error (uploadPhoto):', msg);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: isAuthError
            ? 'Error de autenticación con Firebase Storage (invalid_grant). Verifica GOOGLE_APPLICATION_CREDENTIALS en el servidor.'
            : `Error al guardar imagen en Storage: ${msg}`,
        });
      }

      const url = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
      return { url } as const;
    }),

  // ── Finalizar y cerrar el formulario ────────────────────────────────────
  complete: publicProcedure
    .input(z.object({
      token: z.string(),
      data: z.any(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
      }

      // 1. Validar token
      const tokenRows = await db
        .select()
        .from(surveyorTokens)
        .where(eq(surveyorTokens.token, input.token))
        .limit(1);

      if (tokenRows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Link inválido" });
      }

      const tokenRecord = tokenRows[0];

      if (tokenRecord.expiresAt < new Date()) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Este link ha expirado" });
      }

      if (tokenRecord.status === "COMPLETADO") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Este formulario ya fue completado" });
      }

      // 2. Guardar datos finales en processes.visitaDetalle
      await db
        .update(processes)
        .set({ visitaDetalle: input.data } as any)
        .where(eq(processes.id, tokenRecord.processId));

      // 3. Marcar token como COMPLETADO
      await db
        .update(surveyorTokens)
        .set({ status: "COMPLETADO" })
        .where(eq(surveyorTokens.id, tokenRecord.id));

      // 4. Actualizar estatus del proceso a visita_realizada
      await db
        .update(processes)
        .set({ estatusProceso: "visita_realizada" })
        .where(eq(processes.id, tokenRecord.processId));

      // ARCH-20260321-18: audit de cierre para reconstrucción forense.
      await logAuditEvent(ctx, {
        action: "update",
        entityType: "surveyorPortal_complete",
        entityId: tokenRecord.processId,
        details: {
          tokenId: tokenRecord.id,
          fieldCount: Object.keys(input.data ?? {}).length,
        },
      });

      return { ok: true, completedAt: new Date().toISOString() } as const;
    }),

  // ── Generar PDF del estudio socioeconómico (uso interno de oficina) ──────
  generateStudyPDF: adminProcedure
    .use(requirePermission("procesos", "view"))
    .input(
      z.object({
        processId: z.number(),
        auditChannel: z.enum(["whatsapp"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });

      // 1. Obtener proceso + candidato
      const rows = await db
        .select({
          processId: processes.id,
          clave: processes.clave,
          clienteId: processes.clienteId,
          visitaDetalle: processes.visitaDetalle,
          visitStatus: processes.visitStatus,
          candidatoId: candidates.id,
          nombreCompleto: candidates.nombreCompleto,
          telefono: candidates.telefono,
          perfilDetalle: candidates.perfilDetalle,
        })
        .from(processes)
        .innerJoin(candidates, eq(processes.candidatoId, candidates.id))
        .where(eq(processes.id, input.processId))
        .limit(1);

      if (rows.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Proceso no encontrado" });
      const row = rows[0];

      // 2. Generar PDF sin exponer datos internos del encuestador.
      const visitStatus = (row.visitStatus as any) ?? {};
      const perfilDetalle = (row.perfilDetalle as any) ?? {};
      const detalle = (row.visitaDetalle as Record<string, any>) ?? {};

      const pdfBytes = await generarEstudioSocioeconomicoPDF(
        {
          nombreCompleto: row.nombreCompleto,
          telefono: row.telefono,
          curp: perfilDetalle?.generales?.curp ?? null,
        },
        {
          id: row.processId,
          clave: row.clave,
          direccion: visitStatus?.direccion ?? null,
          scheduledDateTime: visitStatus?.scheduledDateTime ?? null,
          observaciones: visitStatus?.observaciones ?? null,
        },
        detalle,
      );

      // 3. Subir a Firebase Storage
      const timestamp = Date.now();
      const storagePath = `estudios/${row.processId}/estudio-${timestamp}.pdf`;
      const bucket = storage.bucket();
      const pdfFile = bucket.file(storagePath);
      // Wrap Storage I/O para traducir errores de auth a mensajes legibles
      let signedUrl: string;
      try {
        await pdfFile.save(Buffer.from(pdfBytes), { contentType: "application/pdf", resumable: false });
        const [url] = await pdfFile.getSignedUrl({
          action: "read",
          expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
        });
        signedUrl = url;
      } catch (storageErr) {
        const msg = (storageErr as Error).message ?? '';
        const isAuthError = msg.includes('invalid_grant') || msg.includes('invalid_rapt') || msg.includes('UNAUTHENTICATED');
        console.error('[SurveyorPortalRouter] Storage error (generateStudyPDF):', msg);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: isAuthError
            ? 'Error de autenticación con Firebase Storage (invalid_grant). Verifica GOOGLE_APPLICATION_CREDENTIALS en el servidor.'
            : `Error al guardar PDF de estudio en Storage: ${msg}`,
        });
      }

      if (input.auditChannel) {
        await logAuditEvent(ctx, {
          action: "update",
          entityType: "process_study_pdf_share",
          entityId: input.processId,
          details: {
            channel: input.auditChannel,
            storagePath,
          },
        });
      }

      return { url: signedUrl, storagePath } as const;
    }),
});
