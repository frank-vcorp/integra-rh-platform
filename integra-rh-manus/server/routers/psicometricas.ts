import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import * as psicometricas from "../integrations/psicometricas";
import * as sendgrid from "../integrations/sendgrid";
import { descargarReportePDF } from "../integrations/psicometricas";
import { storage as firebaseStorage } from "../firebase";
import { logAuditEvent } from "../_core/audit";

const NORMALIZE_STATUS = (raw?: string) => {
  const value = (raw || "").toString().toLowerCase();
  if (value.includes("complet")) return "Completado";
  if (value.includes("progre")) return "En progreso";
  if (value.includes("asign")) return "Asignado";
  return value ? value : "Asignado";
};

function jsonBuffer(data: any) {
  return Buffer.from(JSON.stringify(data, null, 2), "utf-8");
}

const simplifyDoc = (doc?: any) =>
  doc ? { id: doc.id, url: doc.url } : undefined;

export const psicometricasRouter = router({
  getBaterias: protectedProcedure
    .use(requirePermission("candidatos", "view"))
    .query(async () => {
      return psicometricas.listarBaterias();
    }),
  asignarBateria: protectedProcedure
    .use(requirePermission("candidatos", "edit"))
    .input(z.object({ candidatoId: z.number(), bateria: z.string().optional(), tests: z.array(z.number()).min(1), vacante: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const candidate = await db.getCandidateById(input.candidatoId);
      if (!candidate) return { error: "Candidato no encontrado" } as any;

      const existingClave = (candidate.psicometricos as any)?.clavePsicometricas as
        | string
        | undefined;

      const previousTestsCsv = ((candidate.psicometricos as any)?.testsCsv as
        | string
        | undefined)
        ?.toString()
        .trim();

      const mergedTests = new Set<number>();
      if (previousTestsCsv) {
        for (const token of previousTestsCsv.split(",")) {
          const n = Number(token.trim());
          if (Number.isFinite(n) && n > 0) mergedTests.add(n);
        }
      }
      for (const t of input.tests) mergedTests.add(t);
      const testsCsv = Array.from(mergedTests).join(",");

      const client = candidate.clienteId ? await db.getClientById(candidate.clienteId) : null;
      const post = candidate.puestoId ? await db.getPostById(candidate.puestoId) : null;

      // Caso 1: ya existe clave -> agregar/actualizar pruebas en la misma clave
      if (existingClave) {
        await psicometricas.actualizaCandidatoPruebas({
          clave: existingClave,
          nombre: candidate.nombreCompleto,
          email: candidate.email || "",
          vacante: input.vacante,
          testsCsv,
        });

        const invitacionUrl =
          (candidate.psicometricos as any)?.invitacionUrl ||
          `https://evaluacion.psicometrica.mx/login/${existingClave}`;

        // Persistir actualización
        try {
          await db.updateCandidate(input.candidatoId, {
            psicometricos: {
              ...(candidate.psicometricos || {}),
              clavePsicometricas: existingClave,
              invitacionUrl,
              testsCsv,
              estatus: "Asignado",
              fechaAsignacion: new Date().toISOString(),
              fechaFinalizacion: null,
            },
          } as any);
        } catch {}

        // Reenviar correo (solo SendGrid)
        if (candidate.email) {
          await sendgrid.enviarInvitacionPsicometrica({
            candidatoNombre: candidate.nombreCompleto,
            candidatoEmail: candidate.email,
            invitacionUrl,
            nombrePuesto: post?.nombreDelPuesto || "Sin especificar",
            nombreEmpresa: client?.nombreEmpresa || "Sin especificar",
          });
        }

        await logAuditEvent(ctx, {
          action: "assign_psychometrics",
          entityType: "candidate",
          entityId: candidate.id,
          details: {
            mode: "update_existing_clave",
            asignacionId: existingClave,
            tests: Array.from(mergedTests),
            testsCsv,
          },
        });

        return { id: existingClave, invitacionUrl, updated: true };
      }

      const result = await psicometricas.asignarBateriaPsicometrica({
        nombre: candidate.nombreCompleto,
        email: candidate.email || "",
        telefono: candidate.telefono || undefined,
        bateria: input.bateria,
        testsCsv,
        vacante: input.vacante,
      });

      // Persistir asignación en el candidato
      try {
        await db.updateCandidate(input.candidatoId, {
          psicometricos: {
            ...(candidate.psicometricos || {}),
            clavePsicometricas: (result as any).id,
            invitacionUrl: (result as any).invitacionUrl,
            testsCsv,
            estatus: "Asignado",
            fechaAsignacion: new Date().toISOString(),
          },
        } as any);
      } catch {}

      if (candidate.email) {
        await sendgrid.enviarInvitacionPsicometrica({
          candidatoNombre: candidate.nombreCompleto,
          candidatoEmail: candidate.email,
          invitacionUrl: result.invitacionUrl,
          nombrePuesto: post?.nombreDelPuesto || "Sin especificar",
          nombreEmpresa: client?.nombreEmpresa || "Sin especificar",
        });
      }

      // Auditoría: asignación de batería psicométrica
      await logAuditEvent(ctx, {
        action: "assign_psychometrics",
        entityType: "candidate",
        entityId: candidate.id,
        details: {
          asignacionId: (result as any)?.id,
          mode: "create_new_clave",
          tests: Array.from(mergedTests),
          testsCsv,
          bateria: input.bateria,
        },
      });

      return result;
    }),

  reenviarInvitacion: protectedProcedure
    .use(requirePermission("candidatos", "edit"))
    .input(z.object({ asignacionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Reenviar por correo (SendGrid) solamente, sin pegar al proveedor.
      const candidate: any = await db.getCandidateByPsicoClave(input.asignacionId);
      if (!candidate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No se encontró candidato para esa clave de asignación",
        });
      }
      if (!candidate.email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "El candidato no tiene email registrado",
        });
      }

      const client = candidate.clienteId
        ? await db.getClientById(candidate.clienteId)
        : null;
      const post = candidate.puestoId ? await db.getPostById(candidate.puestoId) : null;
      const invitacionUrl =
        (candidate.psicometricos as any)?.invitacionUrl ||
        `https://evaluacion.psicometrica.mx/login/${input.asignacionId}`;
      const emailSuccess = await sendgrid.enviarInvitacionPsicometrica({
        candidatoNombre: candidate.nombreCompleto,
        candidatoEmail: candidate.email,
        invitacionUrl,
        nombrePuesto: post?.nombreDelPuesto || "Sin especificar",
        nombreEmpresa: client?.nombreEmpresa || "Sin especificar",
      });

      if (!emailSuccess) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No se pudo reenviar el correo de invitación",
        });
      }

      await logAuditEvent(ctx, {
        action: "send_invitation",
        entityType: "candidate",
        entityId: candidate.id,
        details: {
          asignacionId: input.asignacionId,
          emailSuccess,
        },
      });

      return { success: true, emailSuccess };
    }),

  consultarResultados: protectedProcedure
    .use(requirePermission("candidatos", "view"))
    .input(z.object({ asignacionId: z.string() }))
    .query(async ({ input }) => {
      // Minimizar llamadas a la API: usar caché en candidato.psicometricos + cooldown
      const dbmod = await import("../db");
      const candidate: any = await dbmod.getCandidateByPsicoClave(input.asignacionId);
      const cooldownSec = Number(process.env.PSICOMETRICAS_CHECK_COOLDOWN_SECONDS || '900'); // 15 min por defecto
      const now = Date.now();

      if (candidate?.psicometricos) {
        const psico: any = candidate.psicometricos;
        const cached = psico.resultadosJson;
        const estatus = (psico.estatus || "").toString().toLowerCase();
        // Si ya está completado y tenemos resultados en caché, no llamar más a la API
        if (estatus === "completado" && cached !== undefined) {
          return cached;
        }
        const lastStr = psico.lastConsultAt as string | undefined;
        const last = lastStr ? new Date(lastStr).getTime() : 0;
        const nextAllowed = last + cooldownSec * 1000;
        if (last && now < nextAllowed && cached !== undefined) {
          return cached; // devolver caché sin llamar a la API externa mientras dura el cooldown
        }
      }

      const result = await psicometricas.consultarResultados(input.asignacionId);
      // Actualizar cache en candidato
      try {
        const current = (candidate?.psicometricos || {}) as any;
        const status = (result as any)?.estatus || current.estatus || 'En progreso';
        await dbmod.updateCandidate(candidate.id, {
          psicometricos: {
            ...current,
            clavePsicometricas: input.asignacionId,
            estatus: status,
            resultadosJson: result,
            lastConsultAt: new Date().toISOString(),
          } as any,
        } as any);
      } catch {}
      return result;
    }),

  guardarReporte: protectedProcedure
    .use(requirePermission("candidatos", "edit"))
    .input(z.object({
      candidatoId: z.number(),
      asignacionId: z.string(),
      fileName: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const candidate = await db.getCandidateById(input.candidatoId);
      if (!candidate) {
        throw new Error("Candidato no encontrado");
      }

      const docs = await db.getDocumentsByCandidate(input.candidatoId);
      const existingPdf = docs.find((d: any) => d.tipoDocumento === "PSICOMETRICO");
      const existingJson = docs.find((d: any) => d.tipoDocumento === "PSICOMETRICO_JSON");

      // Anti-spam: evitar disparar múltiples consultas/descargas si se hace click repetidamente.
      // Si ya hay documentos, nunca volvemos a consultar/descargar.
      const cooldownSec = Number(process.env.PSICOMETRICAS_REPORT_COOLDOWN_SECONDS || "60");
      const lastReportSyncAt = (candidate.psicometricos as any)?.lastReportSyncAt as string | undefined;
      const lastTs = lastReportSyncAt ? new Date(lastReportSyncAt).getTime() : 0;
      const now = Date.now();
      const withinCooldown = Boolean(lastTs && now - lastTs < cooldownSec * 1000);
      if (withinCooldown && (!existingPdf || !existingJson)) {
        const normalizedStatus = NORMALIZE_STATUS(candidate.psicometricos?.estatus);
        return {
          status: normalizedStatus,
          pdf: simplifyDoc(existingPdf),
          json: simplifyDoc(existingJson),
          throttled: true,
        } as any;
      }

      // Marcar intento de sincronización al inicio para bloquear dobles clics concurrentes.
      try {
        const current = (candidate.psicometricos || {}) as any;
        await db.updateCandidate(input.candidatoId, {
          psicometricos: {
            ...current,
            lastReportSyncAt: new Date().toISOString(),
          } as any,
        } as any);
      } catch {}

      // Importante: para minimizar llamadas al proveedor, aquí NO consultamos resultados (Pdf=false).
      // El JSON se obtiene vía webhook (payload) o queda cacheado en candidate.psicometricos.resultadosJson.
      const resultados: any = (candidate.psicometricos as any)?.resultadosJson;
      const normalizedStatus = NORMALIZE_STATUS(
        (candidate.psicometricos as any)?.estatus || (resultados as any)?.estatus
      );

      const bucket = firebaseStorage.bucket();
      let jsonDoc = simplifyDoc(existingJson);
      if (!jsonDoc && resultados) {
        const jsonKey = `candidates/${input.candidatoId}/psicometria-${Date.now()}.json`;
        const jsonFile = bucket.file(jsonKey);
        await jsonFile.save(jsonBuffer(resultados), { contentType: "application/json", resumable: false });
        const [jsonUrl] = await jsonFile.getSignedUrl({ action: "read", expires: new Date(Date.now() + 365*24*60*60*1000) });
        const jsonId = await db.createDocument({
          candidatoId: input.candidatoId,
          tipoDocumento: "PSICOMETRICO_JSON",
          nombreArchivo: `psicometria-${input.candidatoId}.json`,
          url: jsonUrl,
          fileKey: jsonKey,
          mimeType: "application/json",
          uploadedBy: ctx.user.name || ctx.user.email || "Admin",
        } as any);
        jsonDoc = { id: jsonId, url: jsonUrl };
      }

      let pdfDoc = simplifyDoc(existingPdf);
      if (!pdfDoc) {
        // Evitar llamar al proveedor por PDF si aún no está completado.
        if (normalizedStatus !== "Completado") {
          throw new Error(
            "El reporte aún no está listo. Espera a que el estatus sea 'Completado' y vuelve a intentar."
          );
        }
        const buffer = await descargarReportePDF(input.asignacionId);
        const key = `candidates/${input.candidatoId}/psicometria-${Date.now()}.pdf`;
        const file = bucket.file(key);
        await file.save(buffer, { contentType: "application/pdf", resumable: false });
        const [signedUrl] = await file.getSignedUrl({ action: "read", expires: new Date(Date.now() + 365*24*60*60*1000) });
        const id = await db.createDocument({
          candidatoId: input.candidatoId,
          tipoDocumento: "PSICOMETRICO",
          nombreArchivo: input.fileName || `reporte-psicometrico.pdf`,
          url: signedUrl,
          fileKey: key,
          mimeType: "application/pdf",
          uploadedBy: ctx.user.name || ctx.user.email || "Admin",
        } as any);
        pdfDoc = { id, url: signedUrl };
      }

      try {
        const current = (candidate.psicometricos || {}) as any;
        await db.updateCandidate(input.candidatoId, {
          psicometricos: {
            ...current,
            clavePsicometricas: input.asignacionId,
            estatus: normalizedStatus,
            resultadosJson: resultados !== undefined ? resultados : current.resultadosJson,
            lastConsultAt: new Date().toISOString(),
            lastReportSyncAt: new Date().toISOString(),
            fechaFinalizacion: normalizedStatus === "Completado"
              ? new Date().toISOString()
              : current.fechaFinalizacion ?? null,
          } as any,
        } as any);
      } catch {}

      const payload = {
        status: normalizedStatus,
        pdf: pdfDoc,
        json: jsonDoc,
      } as const;

      await logAuditEvent(ctx, {
        action: "update",
        entityType: "candidate_psicometricos",
        entityId: input.candidatoId,
        details: {
          asignacionId: input.asignacionId,
          status: normalizedStatus,
          pdfDocumentId: (pdfDoc as any)?.id,
          jsonDocumentId: (jsonDoc as any)?.id,
        },
      });

      return payload;
    }),
});
