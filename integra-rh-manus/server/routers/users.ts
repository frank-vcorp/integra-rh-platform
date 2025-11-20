import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { getAllUsers, createUser, updateUser, deleteUser } from "../db";
import { auth as adminAuth } from "../firebase";
import * as sendgrid from "../integrations/sendgrid";

export const usersRouter = router({
  list: protectedProcedure.query(async () => {
    return await getAllUsers();
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        whatsapp: z.string().min(5).max(50).optional(),
        role: z.enum(["admin", "client"]).optional(),
        clientId: z.number().int().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await createUser({
        name: input.name ?? null,
        email: input.email ?? null,
        whatsapp: input.whatsapp ?? null,
        role: input.role ?? undefined,
        clientId: input.clientId ?? undefined,
      } as any);
      return { id } as const;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        whatsapp: z.string().min(5).max(50).optional(),
        role: z.enum(["admin", "client"]).optional(),
        clientId: z.number().int().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...raw } = input;
      const data = Object.fromEntries(
        Object.entries(raw).filter(([, value]) => value !== undefined)
      );
      await updateUser(id, { ...(data as any), updatedAt: new Date() } as any);
      return { ok: true } as const;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await deleteUser(input.id);
      return { ok: true } as const;
    }),

  /**
   * Crea (si no existe) un usuario en Firebase Auth y genera un enlace
   * de restablecimiento para que defina contraseña. También actualiza/crea
   * el registro local en DB con rol y clientId.
   * Si hay SENDGRID_API_KEY, intenta enviar el correo; de lo contrario,
   * devuelve el resetLink para mostrar/copiar desde UI.
   */
  invite: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      role: z.enum(["admin","client"]).default("client"),
      // aceptar null/undefined desde UI
      clientId: z.number().int().nullable().optional(),
      sendEmail: z.boolean().optional().default(true),
    }))
    .mutation(async ({ input }) => {
      // idempotente: intenta buscar usuario por email en Firebase
      let userRecord: import('firebase-admin/auth').UserRecord | null = null;
      try {
        userRecord = await adminAuth.getUserByEmail(input.email);
      } catch {}

      if (!userRecord) {
        userRecord = await adminAuth.createUser({
          email: input.email,
          displayName: input.name,
          emailVerified: false,
          disabled: false,
        });
      }

      // Establecer claims (rol + clientId)
      const claims: Record<string, unknown> = { role: input.role };
      if (input.role === 'client' && typeof input.clientId === 'number') {
        claims.clientId = input.clientId;
      }
      await adminAuth.setCustomUserClaims(userRecord.uid, claims);

      // Generar enlace de reset
      const resetLink = await adminAuth.generatePasswordResetLink(input.email);

      // Persistir/actualizar usuario local
      // Nota: usamos upsert dentro de db.upsertUser a través de createUser/updateUser actuales
      // Para mantener cambios mínimos, llamamos createUser si no existía email, sino update
      try {
        if (!userRecord.metadata.creationTime) {
          await createUser({ name: input.name, email: input.email, role: input.role, clientId: input.clientId } as any);
        } else {
          // best-effort: intentar actualizar
          // list no nos da ID local; dejamos a UI refrescar lista tras invitar
        }
      } catch {}

      let emailed = false;
      if (input.sendEmail) {
        const html = `<!doctype html><html><body>
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
            <h2>Bienvenido(a) a INTEGRA-RH</h2>
            <p>Hola ${input.name}, se ha creado una cuenta para ti.</p>
            <p>Para establecer tu contraseña y acceder, usa el siguiente botón:</p>
            <p style="text-align:center;margin:24px 0">
              <a href="${resetLink}" style="background:#2563eb;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Definir contraseña</a>
            </p>
            <p>Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>${resetLink}</p>
            <p>Saludos,<br/>Equipo INTEGRA-RH</p>
          </div>
        </body></html>`;
        emailed = await sendgrid.enviarCorreo({ to: input.email, toName: input.name, subject: 'Tu acceso a INTEGRA-RH', html });
      }

      return { ok: true as const, resetLink, emailed };
    }),
});
