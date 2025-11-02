import { router, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import * as psicometricas from "../integrations/psicometricas";
import * as sendgrid from "../integrations/sendgrid";
import { descargarReportePDF } from "../integrations/psicometricas";
import { storage as firebaseStorage } from "../firebase";

export const psicometricasRouter = router({
  getBaterias: adminProcedure
    .query(async () => {
      return psicometricas.listarBaterias();
    }),
  asignarBateria: adminProcedure
    .input(z.object({ candidatoId: z.number(), bateria: z.string().optional(), tests: z.array(z.number()).min(1), vacante: z.string().optional() }))
    .mutation(async ({ input }) => {
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
        const lastStr = (candidate.psicometricos as any).lastConsultAt as string | undefined;
        const last = lastStr ? new Date(lastStr).getTime() : 0;
        const nextAllowed = last + cooldownSec * 1000;
        const cached = (candidate.psicometricos as any).resultadosJson;
        if (last && now < nextAllowed && cached !== undefined) {
          return cached; // devolver caché sin llamar a la API externa
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
      const buffer = await descargarReportePDF(input.asignacionId);
      const key = `candidates/${input.candidatoId}/psicometria-${Date.now()}.pdf`;
      const bucket = firebaseStorage.bucket();
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
      return { id, url: signedUrl, key } as const;
    }),
});
