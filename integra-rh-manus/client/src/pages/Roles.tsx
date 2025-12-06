import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

type PermissionMatrix = Record<string, Record<string, boolean>>;

export default function Roles() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [matrix, setMatrix] = useState<PermissionMatrix>({});

  const { data: definition } = trpc.roles.definition.useQuery();
  const { data: roles = [], refetch } = trpc.roles.list.useQuery();
  const createRole = trpc.roles.create.useMutation({
    onSuccess: () => {
      toast.success("Rol creado");
      setDialogOpen(false);
      refetch();
    },
    onError: (e: any) => toast.error(e.message || "Error al crear rol"),
  });
  const updateRole = trpc.roles.update.useMutation({
    onSuccess: () => {
      toast.success("Rol actualizado");
      setDialogOpen(false);
      refetch();
    },
    onError: (e: any) => toast.error(e.message || "Error al actualizar rol"),
  });
  const deleteRole = trpc.roles.delete.useMutation({
    onSuccess: () => {
      toast.success("Rol eliminado");
      refetch();
    },
    onError: (e: any) => toast.error(e.message || "Error al eliminar rol"),
  });

  const modules = definition?.modules ?? [];
  const actions = definition?.actions ?? [];

  const openNewDialog = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    const base: PermissionMatrix = {};
    modules.forEach((m) => {
      base[m] = {};
      actions.forEach((a) => {
        base[m][a] = false;
      });
    });
    setMatrix(base);
    setDialogOpen(true);
  };

  const openEditDialog = (role: any) => {
    setEditingId(role.id);
    setName(role.name || "");
    setDescription(role.description || "");
    const base: PermissionMatrix = {};
    modules.forEach((m) => {
      base[m] = {};
      actions.forEach((a) => {
        base[m][a] = false;
      });
    });
    (role.permissions as any[] | undefined)?.forEach((p) => {
      if (!base[p.module]) base[p.module] = {};
      base[p.module][p.action] = p.allowed ?? true;
    });
    setMatrix(base);
    setDialogOpen(true);
  };

  const handleToggle = (module: string, action: string) => {
    setMatrix((prev) => ({
      ...prev,
      [module]: {
        ...(prev[module] || {}),
        [action]: !prev[module]?.[action],
      },
    }));
  };

  const permissionsPayload = useMemo(
    () =>
      Object.entries(matrix)
        .flatMap(([module, actionsMap]) =>
          Object.entries(actionsMap)
            .filter(([, allowed]) => allowed)
            .map(([action]) => ({ module, action }))
        ),
    [matrix]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("El nombre del rol es obligatorio");
      return;
    }
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      permissions: permissionsPayload,
    };
    if (editingId) {
      updateRole.mutate({ id: editingId, ...payload } as any);
    } else {
      createRole.mutate(payload as any);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Roles y permisos</h1>
          <p className="text-muted-foreground mt-1">
            Define perfiles de permisos basados en módulos y acciones.
          </p>
        </div>
        <Button onClick={openNewDialog}>Nuevo rol</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de roles</CardTitle>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay roles definidos. Crea el primero para empezar a
              configurar permisos.
            </p>
          ) : (
            <div className="space-y-3">
              {roles.map((role: any) => {
                const perms = (role.permissions as any[]) || [];
                const totalPerms = perms.length;
                return (
                  <div
                    key={role.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <p className="font-medium">{role.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {role.description || "Sin descripción"}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {totalPerms === 0
                          ? "Sin permisos configurados."
                          : `${totalPerms} permiso${
                              totalPerms === 1 ? "" : "s"
                            } definidos.`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(role)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => {
                          if (
                            confirm(
                              `¿Eliminar el rol "${role.name}"? Esta acción no se puede deshacer.`
                            )
                          ) {
                            deleteRole.mutate({ id: role.id });
                          }
                        }}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar rol" : "Nuevo rol"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role-name">Nombre del rol *</Label>
                <Input
                  id="role-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="role-desc">Descripción</Label>
                <Input
                  id="role-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej. Operaciones, Solo lectura, etc."
                />
              </div>
            </div>

            <div className="border rounded-md p-3 max-h-[420px] overflow-y-auto">
              <p className="text-xs text-muted-foreground mb-2">
                Marca qué puede hacer un usuario con este rol en cada módulo.
              </p>
              <div className="min-w-full">
                <div className="grid grid-cols-[minmax(140px,1fr)_repeat(4,minmax(80px,1fr))] gap-2 text-[11px] font-semibold text-muted-foreground mb-2">
                  <div>Módulo</div>
                  {actions.map((a) => (
                    <div key={a} className="text-center capitalize">
                      {a}
                    </div>
                  ))}
                </div>
                {modules.map((m) => (
                  <div
                    key={m}
                    className="grid grid-cols-[minmax(140px,1fr)_repeat(4,minmax(80px,1fr))] gap-2 py-1 border-t text-[11px] items-center"
                  >
                    <div className="font-medium">{m}</div>
                    {actions.map((a) => (
                      <div key={a} className="flex justify-center">
                        <Checkbox
                          checked={matrix[m]?.[a] || false}
                          onCheckedChange={() => handleToggle(m, a)}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {editingId ? "Guardar cambios" : "Crear rol"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

