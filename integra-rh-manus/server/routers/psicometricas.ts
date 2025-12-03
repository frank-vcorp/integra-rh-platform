import { router, adminProcedure } from "../_core/trpc";
import { z } from "zod";
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
  getBaterias: adminProcedure
    .query(async () => {
      return psicometricas.listarBaterias();
    }),
  asignarBateria: adminProcedure
    .input(z.object({ candidatoId: z.number(), bateria: z.string().optional(), tests: z.array(z.number()).min(1), vacante: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const candidate = await db.getCandidateById(input.candidatoId);
      if (!candidate) return { error: "Candidato no encontrado" } as any;

      const result = await psicometricas.asignarBateriaPsicometrica({
        nombre: candidate.nombreCompleto,
        email: candidate.email || "",
        telefono: candidate.telefono || undefined,
        bateria: input.bateria,
        testsCsv: input.tests.join(','),
        vacante: input.vacante,
      });

      // Persistir asignación en el candidato
      try {
        await db.updateCandidate(input.candidatoId, {
          psicometricos: {
            ...(candidate.psicometricos || {}),
            clavePsicometricas: (result as any).id,
            estatus: "Asignado",
            fechaAsignacion: new Date().toISOString(),
          },
        } as any);
      } catch {}

      if (candidate.email) {
        const client = candidate.clienteId ? await db.getClientById(candidate.clienteId) : null;
        const post = candidate.puestoId ? await db.getPostById(candidate.puestoId) : null;
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
          tests: input.tests,
          bateria: input.bateria,
        },
      });

      return result;
    }),

  reenviarInvitacion: adminProcedure
    .input(z.object({ asignacionId: z.string() }))
    .mutation(async ({ input }) => {
      return psicometricas.reenviarInvitacion(input.asignacionId);
    }),

  consultarResultados: adminProcedure
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

  guardarReporte: adminProcedure
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

      let resultados: any = candidate.psicometricos?.resultadosJson;
      let normalizedStatus = NORMALIZE_STATUS(candidate.psicometricos?.estatus);

      if (!resultados) {
        resultados = await psicometricas.consultarResultados(input.asignacionId);
        normalizedStatus = NORMALIZE_STATUS(resultados?.estatus);
      }

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
            resultadosJson: resultados ?? current.resultadosJson,
            lastConsultAt: new Date().toISOString(),
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
