import { router, protectedProcedure, adminProcedure, requirePermission } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { storage as firebaseStorage } from "../firebase";

export const documentsRouter = router({
  getByCandidate: protectedProcedure
    .use(requirePermission("procesos", "view"))
    .input(z.object({ candidatoId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role === "client") {
        const candidate = await db.getCandidateById(input.candidatoId);
        if (candidate?.clienteId !== ctx.user.clientId) return [];
      }
      return db.getDocumentsByCandidate(input.candidatoId);
    }),

  getByProcess: protectedProcedure
    .use(requirePermission("procesos", "view"))
    .input(z.object({ procesoId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role === "client") {
        const process = await db.getProcessById(input.procesoId);
        if (process?.clienteId !== ctx.user.clientId) return [];
      }
      return db.getDocumentsByProcess(input.procesoId);
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
        uploadedBy: ctx.user.name || ctx.user.email || "Admin",
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
      const key = `${folder}/${Date.now()}-${input.fileName}`;
      // Usar el bucket por defecto configurado en Firebase Admin para evitar errores de nombre
      const bucket = firebaseStorage.bucket();
      const file = bucket.file(key);
      await file.save(buffer, {
        contentType: input.contentType,
        resumable: false,
        metadata: { contentType: input.contentType },
      });
      // Signed URL (1 year)
      const [signedUrl] = await file.getSignedUrl({
        action: "read",
        expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      const id = await db.createDocument({
        candidatoId: input.candidatoId,
        procesoId: input.procesoId,
        tipoDocumento: input.tipoDocumento,
        nombreArchivo: input.fileName,
        url: signedUrl,
        fileKey: key,
        mimeType: input.contentType,
        uploadedBy: ctx.user.name || ctx.user.email || "Admin",
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
