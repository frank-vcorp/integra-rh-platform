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
import { Plus, Briefcase, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function Puestos() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("activo");

  const { data: posts = [], isLoading } = trpc.posts.list.useQuery();
  const { data: clients = [] } = trpc.clients.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.posts.create.useMutation({
    onSuccess: () => {
      utils.posts.list.invalidate();
      setDialogOpen(false);
      setSelectedClient("");
      toast.success("Puesto creado exitosamente");
    },
    onError: (error) => {
      toast.error("Error al crear puesto: " + error.message);
    },
  });

  const updateMutation = trpc.posts.update.useMutation({
    onSuccess: () => {
      utils.posts.list.invalidate();
      setDialogOpen(false);
      setEditingPost(null);
      toast.success("Puesto actualizado exitosamente");
    },
    onError: (error) => {
      toast.error("Error al actualizar puesto: " + error.message);
    },
  });

  const deleteMutation = trpc.posts.delete.useMutation({
    onSuccess: () => {
      utils.posts.list.invalidate();
      toast.success("Puesto eliminado exitosamente");
    },
    onError: (error) => {
      toast.error("Error al eliminar puesto: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      nombreDelPuesto: formData.get("nombreDelPuesto") as string,
      clienteId: parseInt(selectedClient),
      estatus: selectedStatus as "activo" | "cerrado" | "pausado",
    };

    if (editingPost) {
      updateMutation.mutate({ id: editingPost.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (post: any) => {
    setEditingPost(post);
    setSelectedClient(post.clienteId.toString());
    setSelectedStatus(post.estatus);
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Estás seguro de eliminar este puesto?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleOpenDialog = () => {
    setEditingPost(null);
    setSelectedClient("");
    setSelectedStatus("activo");
    setDialogOpen(true);
  };

  const getClientName = (clienteId: number) => {
    const client = clients.find((c) => c.id === clienteId);
    return client?.nombreEmpresa || "Cliente no encontrado";
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
          <h1 className="text-3xl font-bold">Puestos</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los puestos de trabajo
          </p>
        </div>
        <Button onClick={handleOpenDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Puesto
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Lista de Puestos
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Administra los puestos activos por cliente para asignar procesos.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay puestos registrados</p>
              <Button onClick={handleOpenDialog} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Crear primer puesto
              </Button>
            </div>
          ) : (
            <>
              {/* Escritorio: tabla */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Puesto</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Estatus</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts.map((post) => (
                      <TableRow key={post.id}>
                        <TableCell className="font-medium">
                          {post.nombreDelPuesto}
                        </TableCell>
                        <TableCell>{getClientName(post.clienteId)}</TableCell>
                        <TableCell>
                          <span
                            className={`badge ${
                              post.estatus === "activo"
                                ? "badge-success"
                                : post.estatus === "pausado"
                                ? "badge-warning"
                                : "badge-neutral"
                            }`}
                          >
                            {post.estatus}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(post)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(post.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Móvil: tarjetas */}
              <div className="space-y-3 md:hidden">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="rounded-lg border p-3 bg-white shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-sm">
                          {post.nombreDelPuesto}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {getClientName(post.clienteId)}
                        </p>
                      </div>
                      <span
                        className={`badge text-[10px] ${
                          post.estatus === "activo"
                            ? "badge-success"
                            : post.estatus === "pausado"
                            ? "badge-warning"
                            : "badge-neutral"
                        }`}
                      >
                        {post.estatus}
                      </span>
                    </div>
                    <div className="mt-2 flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEdit(post)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDelete(post.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
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
              {editingPost ? "Editar Puesto" : "Nuevo Puesto"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="nombreDelPuesto">Nombre del Puesto *</Label>
                <Input
                  id="nombreDelPuesto"
                  name="nombreDelPuesto"
                  defaultValue={editingPost?.nombreDelPuesto}
                  required
                />
              </div>
              <div>
                <Label htmlFor="clienteId">Cliente *</Label>
                <Select
                  value={selectedClient}
                  onValueChange={setSelectedClient}
                  required
                >
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
              <div>
                <Label htmlFor="estatus">Estatus</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="pausado">Pausado</SelectItem>
                    <SelectItem value="cerrado">Cerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setEditingPost(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending || !selectedClient}
              >
                {editingPost ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
