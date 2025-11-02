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
import { Plus, UserCog, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { toast } from "sonner";

export default function Usuarios() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<"admin" | "client">("client");

  const { data: users = [], isLoading } = trpc.users.list.useQuery();
  const { data: clients = [] } = trpc.clients.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      setDialogOpen(false);
      setSelectedClient("");
      setSelectedRole("client");
      toast.success("Usuario creado exitosamente");
    },
    onError: (error) => {
      toast.error("Error al crear usuario: " + error.message);
    },
  });

  const updateMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      setDialogOpen(false);
      setEditingUser(null);
      toast.success("Usuario actualizado exitosamente");
    },
    onError: (error) => {
      toast.error("Error al actualizar usuario: " + error.message);
    },
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
      role: selectedRole,
      clientId: selectedRole === "client" && selectedClient ? parseInt(selectedClient) : undefined,
    };

    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setSelectedRole(user.role);
    setSelectedClient(user.clientId?.toString() || "");
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Estás seguro de eliminar este usuario?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleOpenDialog = () => {
    setEditingUser(null);
    setSelectedClient("");
    setSelectedRole("client");
    setDialogOpen(true);
  };

  const getClientName = (clientId: number | null) => {
    if (!clientId) return "-";
    const client = clients.find((c) => c.id === clientId);
    return client?.nombreEmpresa || "-";
  };

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
        <Button onClick={handleOpenDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Lista de Usuarios
          </CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-12">
              <UserCog className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay usuarios registrados</p>
              <Button onClick={handleOpenDialog} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Crear primer usuario
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(user.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
