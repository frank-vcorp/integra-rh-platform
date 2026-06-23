/**
 * Router de documentos con manejo mejorado de errores de Storage.
 * @intervention IMPL-20260320-12
 * @respaldo context/interconsultas/ARCH-20260320-12
 */
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, adminProcedure, requirePermission } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { storage as firebaseStorage, refreshStorageUrl } from "../firebase";
import { sanitizeStorageKeySegment } from "../utils/storageKeys";

export const documentsRouter = router({
  getByCandidate: protectedProcedure
    .use(requirePermission("procesos", "view"))
    .input(z.object({ candidatoId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user!.role === "client") {
        const candidate = await db.getCandidateById(input.candidatoId);
        if (candidate?.clienteId !== ctx.user!.clientId) return [];
      }
      return db.getDocumentsByCandidate(input.candidatoId);
    }),

  getByProcess: protectedProcedure
    .use(requirePermission("procesos", "view"))
    .input(z.object({ procesoId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user!.role === "client") {
        const process = await db.getProcessById(input.procesoId);
        if (process?.clienteId !== ctx.user!.clientId) return [];
      }
      const docs = await db.getDocumentsByProcess(input.procesoId);
      return Promise.all(
        docs.map(async (doc: any) => ({
          ...doc,
          url: doc.url
            ? await refreshStorageUrl(doc.url, doc.fileKey, {
                procesoId: input.procesoId,
                docId: doc.id,
              })
            : doc.url,
        }))
      );
    }),

  create: adminProcedure
    .use(requirePermission("procesos", "edit"))
    .input(
      z.object({
        candidatoId: z.number().optional(),
        procesoId: z.number().optional(),
        tipoDocumento: z.string(),
        nombreArchivo: z.string(),
        url: z.string(),
        fileKey: z.string(),
        mimeType: z.string().optional(),
        tamanio: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const id = await db.createDocument({
        ...input,
        uploadedBy: ctx.user!.name || ctx.user!.email || "Admin",
      } as any);
      return { id } as const;
    }),

  upload: adminProcedure
    .use(requirePermission("procesos", "edit"))
    .input(
      z
        .object({
          candidatoId: z.number().optional(),
          procesoId: z.number().optional(),
          tipoDocumento: z.string(),
          fileName: z.string(),
          contentType: z
            .string()
            .optional()
            .default("application/octet-stream"),
          base64: z.string(), // base64 sin el prefix data:
        })
        .refine((v) => !!(v.candidatoId || v.procesoId), {
          message: "Se requiere candidatoId o procesoId",
        })
    )
    .mutation(async ({ input, ctx }) => {
      const buffer = Buffer.from(input.base64, "base64");
      const folder = input.procesoId
        ? `processes/${input.procesoId}`
        : `candidates/${input.candidatoId}`;
      // IMPL-ARCH-20260622-01: sanitizar el filename antes de construir el object path
      // para evitar caracteres prohibidos en GCS (? # [ ] * / \ : ;) y doble encoding.
      // input.fileName se conserva tal cual en nombreArchivo (DB).
      const safeFileName = sanitizeStorageKeySegment(input.fileName);
      const key = `${folder}/${Date.now()}-${safeFileName}`;
      // Usar el bucket por defecto configurado en Firebase Admin para evitar errores de nombre
      const bucket = firebaseStorage.bucket();
      const file = bucket.file(key);
      // Wrap Storage I/O para traducir errores de auth a mensajes legibles
      let signedUrl: string;
      try {
        await file.save(buffer, {
          contentType: input.contentType,
          resumable: false,
          metadata: { contentType: input.contentType },
        });
        const [url] = await file.getSignedUrl({
          action: "read",
          // IMPL-ARCH-20260622-01: expiración alineada con refreshStorageUrl (15 min)
          expires: new Date(Date.now() + 15 * 60 * 1000),
        });
        signedUrl = url;
      } catch (storageErr) {
        const msg = (storageErr as Error).message ?? '';
        const isAuthError = msg.includes('invalid_grant') || msg.includes('invalid_rapt') || msg.includes('UNAUTHENTICATED');
        console.error('[DocumentsRouter] Storage error:', msg);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: isAuthError
            ? 'Error de autenticación con Firebase Storage (invalid_grant). Verifica GOOGLE_APPLICATION_CREDENTIALS en el servidor.'
            : `Error al guardar archivo en Storage: ${msg}`,
        });
      }

      const id = await db.createDocument({
        candidatoId: input.candidatoId,
        procesoId: input.procesoId,
        tipoDocumento: input.tipoDocumento,
        nombreArchivo: input.fileName,
        url: signedUrl,
        fileKey: key,
        mimeType: input.contentType,
        uploadedBy: ctx.user!.name || ctx.user!.email || "Admin",
      } as any);
      return { id, url: signedUrl, key } as const;
    }),

  delete: adminProcedure
    .use(requirePermission("procesos", "delete"))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteDocument(input.id);
      return { success: true } as const;
    }),
});
