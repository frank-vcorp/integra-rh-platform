import type { TrpcContext } from "./context";
import { createAuditLog } from "../db";

type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "send_invitation"
  | "assign_psychometrics"
  | "client_link_created";

type AuditActorType = "admin" | "client" | "system";

export async function logAuditEvent(
  ctx: TrpcContext,
  input: {
    action: AuditAction;
    entityType: string;
    entityId?: string | number | null;
    details?: Record<string, unknown>;
  }
) {
  const actorType: AuditActorType =
    (ctx.user?.role as AuditActorType | undefined) ?? "system";

  try {
    await createAuditLog({
      userId: ctx.user?.id ?? null,
      actorType,
      action: input.action,
      entityType: input.entityType,
      entityId:
        input.entityId !== undefined && input.entityId !== null
          ? String(input.entityId)
          : null,
      requestId: ctx.requestId,
      details: input.details ?? null,
    });
  } catch (error) {
    // La auditoría nunca debe romper el flujo principal.
    // eslint-disable-next-line no-console
    console.warn("[Audit] Failed to create audit log:", (error as any)?.message || error);
  }
}

