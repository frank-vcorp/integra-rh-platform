import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Plus, UserCog, Pencil, Trash2, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Link } from "wouter";
import { useHasPermission } from "@/_core/hooks/usePermission";

export default function Usuarios() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<"admin" | "client">("client");
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);

  const { data: users = [], isLoading } = trpc.users.list.useQuery();
  const { data: roles = [] } = trpc.roles.list.useQuery(undefined as any, {
    initialData: [] as any,
  } as any);
  const { data: userRolesForEditing = [] } = trpc.roles.getUserRoles.useQuery(
    { userId: editingUser?.id ?? 0 } as any,
    { enabled: !!editingUser?.id }
  );
  const { data: clients = [] } = trpc.clients.list.useQuery();
  const utils = trpc.useUtils();

  const setUserRolesMutation = trpc.roles.setUserRoles.useMutation({
    onSuccess: () => {
      utils.roles.list.invalidate();
    },
    onError: (error) => {
      toast.error("Error al asignar roles: " + error.message);
    },
  });

  const createMutation = trpc.users.create.useMutation({
    onSuccess: async (res: any) => {
      if (res?.id && selectedRoleIds.length > 0) {
        await setUserRolesMutation.mutateAsync({
          userId: res.id,
          roleIds: selectedRoleIds,
        });
      }
      utils.users.list.invalidate();
      setDialogOpen(false);
      setSelectedClient("");
      setSelectedRole("client");
      setSelectedRoleIds([]);
      toast.success("Usuario creado exitosamente");
    },
    onError: (error) => {
      toast.error("Error al crear usuario: " + error.message);
    },
  });

  const updateMutation = trpc.users.update.useMutation({
    onSuccess: async () => {
      if (editingUser) {
        await setUserRolesMutation.mutateAsync({
          userId: editingUser.id,
          roleIds: selectedRoleIds,
        });
      }
      utils.users.list.invalidate();
      setDialogOpen(false);
      setEditingUser(null);
      setSelectedRoleIds([]);
      toast.success("Usuario actualizado exitosamente");
    },
    onError: (error) => {
      toast.error("Error al actualizar usuario: " + error.message);
    },
  });

  useEffect(() => {
    if (editingUser && Array.isArray(userRolesForEditing)) {
      setSelectedRoleIds(
        (userRolesForEditing as any[]).map((ur) => ur.roleId as number)
      );
    }
  }, [editingUser, userRolesForEditing]);

  

  const inviteMutation = trpc.users.invite.useMutation({
    onSuccess: (res:any) => {
      utils.users.list.invalidate();
      if (res?.emailed) {
        toast.success('Invitación enviada por correo');
      } else if (res?.resetLink) {
        try { navigator.clipboard?.writeText(res.resetLink); } catch {}
        toast.success('Enlace de invitación generado (copiado al portapapeles)');
        // Ofrecer compartir por WhatsApp con un número proporcionado al vuelo
        const share = confirm('¿Quieres compartir el acceso por WhatsApp ahora?');
        if (share) {
          const phone = prompt('Número (incluye LADA, ej. +52XXXXXXXXXX):', '');
          if (phone) {
            const digits = phone.replace(/[^0-9+]/g, '');
            const msg = `Hola, te comparto tu acceso a INTEGRA RH. Usa este enlace para definir tu contraseña y entrar: ${res.resetLink}`;
            const url = `https://api.whatsapp.com/send?phone=${encodeURIComponent(digits)}&text=${encodeURIComponent(msg)}`;
            try { window.open(url, '_blank'); } catch {}
          }
        }
      } else {
        toast.success('Invitación generada');
      }
    },
    onError: (e:any) => toast.error('Error al invitar: '+e.message)
  });

  const deleteMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      toast.success("Usuario eliminado exitosamente");
    },
    onError: (error) => {
      toast.error("Error al eliminar usuario: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string || undefined,
      whatsapp: (formData.get("whatsapp") as string || '').trim() || undefined,
      role: selectedRole,
      clientId: selectedRole === "client" && selectedClient ? parseInt(selectedClient) : undefined,
    };

    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setSelectedRole(user.role);
    setSelectedClient(user.clientId?.toString() || "");
    setSelectedRoleIds([]);
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Estás seguro de eliminar este usuario?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleOpenDialog = () => {
    setEditingUser(null);
    setSelectedClient("");
    setSelectedRole("client");
    setSelectedRoleIds([]);
    setDialogOpen(true);
  };

  const getClientName = (clientId: number | null) => {
    if (!clientId) return "-";
    const client = clients.find((c) => c.id === clientId);
    return client?.nombreEmpresa || "-";
  };

  const canCreateUser = useHasPermission("usuarios", "create");
  const canEditUser = useHasPermission("usuarios", "edit");
  const canDeleteUser = useHasPermission("usuarios", "delete");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Usuarios</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los usuarios del sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/roles">
            <Button variant="outline" type="button">
              Roles y permisos
            </Button>
          </Link>
          {canCreateUser && (
            <Button onClick={handleOpenDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Usuario
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Lista de Usuarios
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Gestiona los usuarios internos y accesos de clientes a la plataforma.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-12">
              <UserCog className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay usuarios registrados</p>
              {canCreateUser && (
                <Button onClick={handleOpenDialog} variant="outline" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primer usuario
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Escritorio: tabla */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Cliente Asociado</TableHead>
                      <TableHead>Último Acceso</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email || "-"}</TableCell>
                        <TableCell>{user.whatsapp || '-'}</TableCell>
                        <TableCell>
                          <span
                            className={`badge ${
                              user.role === "admin" ? "badge-primary" : "badge-info"
                            }`}
                          >
                            {user.role === "admin" ? "Administrador" : "Cliente"}
                          </span>
                        </TableCell>
                        <TableCell>{getClientName(user.clientId)}</TableCell>
                        <TableCell>
                          {new Date(user.lastSignedIn).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            {user.email && canEditUser && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const email = user.email!;
                                  inviteMutation.mutate(
                                    {
                                      name: user.name || email,
                                      email,
                                      role: user.role,
                                      clientId: user.clientId ?? undefined,
                                    },
                                    {
                                      onSuccess: (res: any) => {
                                        if (res?.resetLink && user.whatsapp) {
                                          const digits = String(user.whatsapp).replace(/[^0-9+]/g, "");
                                          if (digits) {
                                            const msg = `Hola, te comparto tu acceso a INTEGRA RH. Usa este enlace para definir tu contraseña y entrar: ${res.resetLink}`;
                                            const url = `https://api.whatsapp.com/send?phone=${encodeURIComponent(
                                              digits
                                            )}&text=${encodeURIComponent(msg)}`;
                                            try {
                                              window.open(url, "_blank");
                                            } catch {}
                                          }
                                        }
                                      },
                                    }
                                  );
                                }}
                              >
                                Invitar
                              </Button>
                            )}
                            {canEditUser && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(user)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {canDeleteUser && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(user.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Móvil: tarjetas */}
              <div className="space-y-3 md:hidden">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-lg border p-3 bg-white shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-sm">{user.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {user.email || "Sin email"}
                        </p>
                      </div>
                      <span
                        className={`badge text-[10px] ${
                          user.role === "admin" ? "badge-primary" : "badge-info"
                        }`}
                      >
                        {user.role === "admin" ? "Administrador" : "Cliente"}
                      </span>
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground space-y-0.5">
                      <div>
                        <span className="font-semibold">WhatsApp: </span>
                        {user.whatsapp || "-"}
                      </div>
                      <div>
                        <span className="font-semibold">Cliente: </span>
                        {getClientName(user.clientId)}
                      </div>
                      <div>
                        <span className="font-semibold">Último acceso: </span>
                        {new Date(user.lastSignedIn).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end gap-1">
                      {user.email && canEditUser && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            const email = user.email!;
                            inviteMutation.mutate({
                              name: user.name || email,
                              email,
                              role: user.role,
                              clientId: user.clientId ?? undefined,
                            });
                          }}
                        >
                          <Mail className="h-3 w-3" />
                        </Button>
                      )}
                      {canEditUser && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEdit(user)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                      {canDeleteUser && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleDelete(user.id)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Editar Usuario" : "Nuevo Usuario"}
            </DialogTitle>
            <DialogDescription>
              Completa la información básica del usuario y, si es cliente, asigna el cliente correspondiente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Nombre Completo *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingUser?.name}
                  required
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={editingUser?.email}
                  placeholder="usuario@ejemplo.com"
                />
              </div>
              <div>
                <Label htmlFor="whatsapp">WhatsApp (formato +52...)</Label>
                <Input id="whatsapp" name="whatsapp" placeholder="+52XXXXXXXXXX" defaultValue={editingUser?.whatsapp || ''} />
              </div>
              <div>
                <Label htmlFor="role">Rol *</Label>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as "admin" | "client")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="client">Cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selectedRole === "client" && (
                <div>
                  <Label htmlFor="clientId">Cliente Asociado *</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.nombreEmpresa}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {roles.length > 0 && (
                <div className="col-span-2">
                  <Label>Roles de permisos</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {roles.map((role: any) => (
                      <label
                        key={role.id}
                        className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedRoleIds.includes(role.id)}
                          onCheckedChange={() =>
                            setSelectedRoleIds((prev) =>
                              prev.includes(role.id)
                                ? prev.filter((id) => id !== role.id)
                                : [...prev, role.id]
                            )
                          }
                        />
                        <span>{role.name}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Estos roles controlan los módulos y acciones disponibles para el usuario.
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setEditingUser(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingUser ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

