export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';

// Definición compartida de módulos y acciones para el sistema de roles
export const PERMISSION_MODULES = [
  "dashboard",
  "clientes",
  "puestos",
  "candidatos",
  "procesos",
  "visitas",
  "encuestadores",
  "pagos",
  "usuarios",
  "registros",
] as const;

export const PERMISSION_ACTIONS = ["view", "create", "edit", "delete"] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number];
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];
