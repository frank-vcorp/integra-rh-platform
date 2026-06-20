import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure, requirePermission } from "../_core/trpc";
import { getAllUsers, createUser, updateUser, deleteUser, findUserByEmail } from "../db";
import { auth as adminAuth } from "../firebase";
import * as sendgrid from "../integrations/sendgrid";

/**
 * @intervention FIX-20260619-01
 * Refactor: extrae el flujo completo de invitación (upsert local + Firebase Auth
 * + magic link + SendGrid) para reusarlo desde `create` y `invite`.
 *
 * Devuelve `{ id, firebaseUid, resetLink, emailed, createdInFirebase }`.
 *  - `id` puede ser `null` si el upsert local falla (Firebase y email ya se procesaron).
 *  - `emailed` refleja si SendGrid respondió 2xx (true) o si se omitió/falló (false).
 */
async function performInvite(args: {
  name: string;
  email: string;
  role: "admin" | "client";
  clientId?: number | null;
  whatsapp?: string | null;
  sendEmail?: boolean;
  logTag?: string;
}): Promise<{
  id: number | null;
  firebaseUid: string;
  resetLink: string;
  emailed: boolean;
  createdInFirebase: boolean;
}> {
  const {
    name,
    email,
    role,
    clientId,
    whatsapp,
    sendEmail = true,
    logTag = "[users.invite]",
  } = args;

  // 1. Firebase Auth: idempotente (buscar por email → crear si no existe)
  let userRecord: import("firebase-admin/auth").UserRecord | null = null;
  let createdInFirebase = false;
  try {
    userRecord = await adminAuth.getUserByEmail(email);
  } catch {
    // getUserByEmail lanza auth/user-not-found; lo tratamos como "no existe"
    userRecord = null;
  }
  if (!userRecord) {
    userRecord = await adminAuth.createUser({
      email,
      displayName: name,
      emailVerified: false,
      disabled: false,
    });
    createdInFirebase = true;
  }

  // 2. Custom claims (rol + clientId si aplica)
  const claims: Record<string, unknown> = { role };
  if (role === "client" && typeof clientId === "number") {
    claims.clientId = clientId;
  }
  await adminAuth.setCustomUserClaims(userRecord.uid, claims);

  // 3. Magic link (password reset)
  const resetLink = await adminAuth.generatePasswordResetLink(email);

  // 4. Upsert local por email (no depender de creationTime de Firebase,
  //    que siempre es string ISO y haría que el branch original nunca corra).
  let localId: number | null = null;
  try {
    const existing = await findUserByEmail(email);
    if (existing) {
      const updateData: Record<string, unknown> = {
        role,
        updatedAt: new Date(),
      };
      if (name) updateData.name = name;
      if (whatsapp) updateData.whatsapp = whatsapp;
      if (clientId !== undefined) updateData.clientId = clientId;
      await updateUser(existing.id, updateData as any);
      localId = existing.id;
    } else {
      localId = await createUser({
        name,
        email,
        whatsapp: whatsapp ?? undefined,
        role,
        clientId: clientId ?? undefined,
      } as any);
    }
  } catch (err) {
    console.error(`${logTag} local upsert failed:`, err);
  }

  // 5. Enviar correo si corresponde
  let emailed = false;
  if (sendEmail) {
    const html = `<!doctype html><html><body>
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
        <h2>Bienvenido(a) a INTEGRA-RH</h2>
        <p>Hola ${name}, se ha creado una cuenta para ti.</p>
        <p>Para establecer tu contraseña y acceder, usa el siguiente botón:</p>
        <p style="text-align:center;margin:24px 0">
          <a href="${resetLink}" style="background:#2563eb;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Definir contraseña</a>
        </p>
        <p>Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>${resetLink}</p>
        <p>Saludos,<br/>Equipo INTEGRA-RH</p>
      </div>
    </body></html>`;
    emailed = await sendgrid.enviarCorreo({
      to: email,
      toName: name,
      subject: "Tu acceso a INTEGRA-RH",
      html,
    });
  }

  // Trazabilidad (formato solicitado en handoff FIX-20260619-01)
  console.log(
    `${logTag} invite result { emailed: ${emailed}, hasResetLink: ${!!resetLink}, firebaseUid: ${userRecord.uid} }`
  );

  return {
    id: localId,
    firebaseUid: userRecord.uid,
    resetLink,
    emailed,
    createdInFirebase,
  };
}

export const usersRouter = router({
  list: protectedProcedure
    .use(requirePermission("usuarios", "view"))
    .query(async () => {
    return await getAllUsers();
  }),

  /**
   * Crea/actualiza un usuario.
   * - Si trae `email`, dispara el flujo completo: upsert local + Firebase Auth
   *   (createUser idempotente) + custom claims + magic link + SendGrid.
   * - Si NO trae `email`, solo persiste localmente (caso usuario sin correo,
   *   ej. alta de cliente con solo WhatsApp).
   *
   * Devuelve `{ id, resetLink?, emailed?, firebaseUid? }`. La UI usa `emailed`
   * y `resetLink` para decidir el toast y el fallback de portapapeles/WhatsApp.
   * @intervention FIX-20260619-01
   */
  create: protectedProcedure
    .use(requirePermission("usuarios", "create"))
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
      const name = input.name ?? "(sin nombre)";
      const role = input.role ?? "client";

      if (input.email) {
        const result = await performInvite({
          name,
          email: input.email,
          role,
          clientId: input.clientId,
          whatsapp: input.whatsapp,
          logTag: "[users.create]",
        });
        return {
          id: result.id,
          firebaseUid: result.firebaseUid,
          resetLink: result.resetLink,
          emailed: result.emailed,
        } as const;
      }

      // Sin email: persistencia local únicamente (no aplica magic link).
      const id = await createUser({
        name: input.name ?? null,
        email: null,
        whatsapp: input.whatsapp ?? null,
        role,
        clientId: input.clientId,
      } as any);
      return { id, firebaseUid: null, resetLink: null, emailed: false } as const;
    }),

  update: protectedProcedure
    .use(requirePermission("usuarios", "edit"))
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
      // @intervention FIX-20260619-01
      // Update NO reenvía invitación: solo actualiza fila local.
      await updateUser(id, { ...(data as any), updatedAt: new Date() } as any);
      return { ok: true } as const;
    }),

  delete: protectedProcedure
    .use(requirePermission("usuarios", "delete"))
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      // @intervention ARCH-20260520-08-R2
      try {
        await deleteUser(input.id);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.startsWith("DEPENDENCY:")) {
          throw new TRPCError({
            code: "CONFLICT",
            message: msg.slice("DEPENDENCY:".length),
          });
        }
        throw err;
      }
      return { ok: true } as const;
    }),

  /**
   * Endpoint admin para reenviar invitación manualmente.
   * Delega en `performInvite` (mismo flujo que `create` con email).
   * @intervention FIX-20260619-01
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
      const result = await performInvite({
        name: input.name,
        email: input.email,
        role: input.role,
        clientId: input.clientId,
        sendEmail: input.sendEmail,
        logTag: "[users.invite]",
      });
      return {
        ok: true as const,
        id: result.id,
        firebaseUid: result.firebaseUid,
        resetLink: result.resetLink,
        emailed: result.emailed,
      };
    }),
});
