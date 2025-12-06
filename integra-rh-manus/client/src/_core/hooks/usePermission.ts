import { useAuth } from "./useAuth";
import type { PermissionAction, PermissionModule } from "@shared/const";

export function useHasPermission(module: PermissionModule, action: PermissionAction) {
  const { user } = useAuth();

  if (!user) return false;

  const anyUser = user as any;

  // Superadmin siempre tiene acceso
  if (anyUser._isSuperadmin) return true;

  // Clientes externos no usan permisos internos
  if (user.role === "client") return false;

  const perms = (anyUser._permissions || []) as { module: string; action: string }[];

  // Compatibilidad: si no hay permisos registrados todavía, damos acceso completo a admins
  if (!perms || perms.length === 0) {
    return user.role === "admin";
  }

  return perms.some((p) => p.module === module && p.action === action);
}

