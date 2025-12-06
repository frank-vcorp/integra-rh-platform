import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import * as sendgrid from "../integrations/sendgrid";

export const emailRouter = router({
  enviarInvitacionPsicometrica: protectedProcedure
    .use(requirePermission("candidatos", "edit"))
    .input(
      z.object({
        candidatoId: z.number(),
        invitacionUrl: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const candidate = await db.getCandidateById(input.candidatoId);
      if (!candidate || !candidate.email) {
        throw new Error("Candidato sin email");
      }
      const client = candidate.clienteId ? await db.getClientById(candidate.clienteId) : null;
      const post = candidate.puestoId ? await db.getPostById(candidate.puestoId) : null;
      const success = await sendgrid.enviarInvitacionPsicometrica({
        candidatoNombre: candidate.nombreCompleto,
        candidatoEmail: candidate.email,
        invitacionUrl: input.invitacionUrl,
        nombrePuesto: post?.nombreDelPuesto || "Sin especificar",
        nombreEmpresa: client?.nombreEmpresa || "Sin especificar",
      });
      return { success } as const;
    }),
});
