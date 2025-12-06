import "dotenv/config";
import { PERMISSION_MODULES, PERMISSION_ACTIONS } from "@shared/const";
import {
  createRoleWithPermissions,
  getAllRolesWithPermissions,
  updateRoleWithPermissions,
} from "../server/db";

type Module = (typeof PERMISSION_MODULES)[number];
type Action = (typeof PERMISSION_ACTIONS)[number];

type RoleSeed = {
  name: string;
  description: string;
  permissions: { module: Module; action: Action }[];
};

function perm(module: Module, actions: Action[]): { module: Module; action: Action }[] {
  return actions.map((action) => ({ module, action }));
}

const ALL_MODULES: Module[] = [...PERMISSION_MODULES];
const ALL_ACTIONS: Action[] = [...PERMISSION_ACTIONS];

const fullAccessPerms: { module: Module; action: Action }[] = ALL_MODULES.flatMap((m) =>
  perm(m, ALL_ACTIONS)
);

const ROLE_SEEDS: RoleSeed[] = [
  {
    name: "Superadmin",
    description:
      "Control total del sistema: todos los módulos y acciones, además de configuración avanzada.",
    permissions: fullAccessPerms,
  },
  {
    name: "Administrador",
    description:
      "Administra la operación diaria: acceso completo a módulos operativos, incluyendo eliminar registros.",
    permissions: fullAccessPerms,
  },
  {
    name: "Recepcionista",
    description:
      "Captura datos iniciales de clientes, puestos, candidatos y crea procesos, asignando analistas.",
    permissions: [
      // Dashboard
      ...perm("dashboard", ["view"]),
      // Clientes / Puestos / Candidatos: alta y edición, sin eliminar
      ...perm("clientes", ["view", "create", "edit"]),
      ...perm("puestos", ["view", "create", "edit"]),
      ...perm("candidatos", ["view", "create", "edit"]),
      // Procesos: crear, ver y editar (datos iniciales / asignaciones)
      ...perm("procesos", ["view", "create", "edit"]),
      // Visitas / Encuestadores / Pagos: lectura básica
      ...perm("visitas", ["view"]),
      ...perm("encuestadores", ["view"]),
      ...perm("pagos", ["view"]),
      // Usuarios / Registros: sin acceso por defecto
    ],
  },
  {
    name: "Analista",
    description:
      "Lleva el seguimiento de los procesos asignados, actualiza investigación y documentos.",
    permissions: [
      // Dashboard
      ...perm("dashboard", ["view"]),
      // Lectura general
      ...perm("clientes", ["view"]),
      ...perm("puestos", ["view"]),
      // Candidatos: ver y editar (principalmente historial e investigación)
      ...perm("candidatos", ["view", "edit"]),
      // Procesos: ver y editar (solo los asignados; se controlará en lógica de negocio)
      ...perm("procesos", ["view", "edit"]),
      // Visitas: ver/editar (estatus, comentarios)
      ...perm("visitas", ["view", "edit"]),
      // Encuestadores y pagos: solo lectura
      ...perm("encuestadores", ["view"]),
      ...perm("pagos", ["view"]),
      // Usuarios / Registros: sin acceso
    ],
  },
];

async function main() {
  console.log("[roles-seed] Iniciando seeding de roles y permisos...");

  const existing = await getAllRolesWithPermissions();

  for (const seed of ROLE_SEEDS) {
    const found = existing.find((r: any) => r.name === seed.name);
    if (!found) {
      const id = await createRoleWithPermissions({
        name: seed.name,
        description: seed.description,
        permissions: seed.permissions,
      });
      console.log(`[roles-seed] Rol creado: ${seed.name} (id=${id})`);
    } else {
      await updateRoleWithPermissions(found.id, {
        name: seed.name,
        description: seed.description,
        permissions: seed.permissions,
      });
      console.log(`[roles-seed] Rol actualizado: ${seed.name} (id=${found.id})`);
    }
  }

  console.log("[roles-seed] Listo. Los roles base están configurados en la base de datos.");
}

main().catch((err) => {
  console.error("[roles-seed] Error:", err);
  process.exit(1);
});

