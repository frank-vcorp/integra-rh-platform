import { z } from "zod";
import { router, protectedProcedure } from "../trpc.ts";
import { getAllUsers, createUser, updateUser, deleteUser } from "../db";

export const usersRouter = router({
  list: protectedProcedure.query(async () => {
    return await getAllUsers();
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        role: z.enum(["user", "admin"]).optional(),
        clientId: z.number().int().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await createUser({
        name: input.name ?? null,
        email: input.email ?? null,
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
        role: z.enum(["user", "admin"]).optional(),
        clientId: z.number().int().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateUser(id, data as any);
      return { ok: true } as const;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await deleteUser(input.id);
      return { ok: true } as const;
    }),
});

