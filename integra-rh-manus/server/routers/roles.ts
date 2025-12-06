import { router, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  createRoleWithPermissions,
  deleteRole,
  getAllRolesWithPermissions,
  getUserRoles,
  setUserRoles,
  updateRoleWithPermissions,
} from "../db";
import {
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  type PermissionAction,
  type PermissionModule,
} from "@shared/const";

const permissionInputSchema = z.object({
  module: z.enum(
    PERMISSION_MODULES as unknown as [
      PermissionModule,
      ...PermissionModule[]
    ]
  ),
  action: z.enum(
    PERMISSION_ACTIONS as unknown as [
      PermissionAction,
      ...PermissionAction[]
    ]
  ),
  allowed: z.boolean().optional(),
});

export const rolesRouter = router({
  definition: adminProcedure.query(() => {
    return {
      modules: PERMISSION_MODULES,
      actions: PERMISSION_ACTIONS,
    } as const;
  }),

  list: adminProcedure.query(async () => {
    const roles = await getAllRolesWithPermissions();
    return roles;
  }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().trim().optional(),
        permissions: z.array(permissionInputSchema).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await createRoleWithPermissions({
        name: input.name,
        description: input.description ?? null,
        permissions: input.permissions,
      });
      return { id } as const;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number().int(),
        name: z.string().min(1).optional(),
        description: z.string().trim().optional().nullable(),
        permissions: z.array(permissionInputSchema).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      await updateRoleWithPermissions(id, rest);
      return { ok: true } as const;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await deleteRole(input.id);
      return { ok: true } as const;
    }),

  getUserRoles: adminProcedure
    .input(z.object({ userId: z.number().int() }))
    .query(async ({ input }) => {
      const rows = await getUserRoles(input.userId);
      return rows;
    }),

  setUserRoles: adminProcedure
    .input(
      z.object({
        userId: z.number().int(),
        roleIds: z.array(z.number().int()),
      })
    )
    .mutation(async ({ input }) => {
      await setUserRoles(input.userId, input.roleIds);
      return { ok: true } as const;
    }),
});
