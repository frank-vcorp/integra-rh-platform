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
import { Plus, Building2, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Clientes() {
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [showContinueFlow, setShowContinueFlow] = useState(false);
  const [createdClientId, setCreatedClientId] = useState<number | null>(null);

  const { data: clients = [], isLoading } = trpc.clients.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.clients.create.useMutation({
    onSuccess: (data) => {
      utils.clients.list.invalidate();
      setCreatedClientId(data.id);
      setShowContinueFlow(true);
      toast.success("Cliente creado exitosamente");
    },
    onError: (error) => {
      toast.error("Error al crear cliente: " + error.message);
    },
  });

  const updateMutation = trpc.clients.update.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      setDialogOpen(false);
      setEditingClient(null);
      toast.success("Cliente actualizado exitosamente");
    },
    onError: (error) => {
      toast.error("Error al actualizar cliente: " + error.message);
    },
  });

  const deleteMutation = trpc.clients.delete.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      toast.success("Cliente eliminado exitosamente");
    },
    onError: (error) => {
      toast.error("Error al eliminar cliente: " + error.message);
    },
  });

  const handleContinueFlow = () => {
    setDialogOpen(false);
    setShowContinueFlow(false);
    // Redirigir al flujo integrado con el cliente pre-seleccionado
    window.location.href = `/flujo-candidato?clienteId=${createdClientId}`;
  };

  const handleFinish = () => {
    setDialogOpen(false);
    setShowContinueFlow(false);
    setCreatedClientId(null);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      nombreEmpresa: formData.get("nombreEmpresa") as string,
      ubicacionPlaza: formData.get("ubicacionPlaza") as string || undefined,
      reclutador: formData.get("reclutador") as string || undefined,
      contacto: formData.get("contacto") as string || undefined,
      telefono: formData.get("telefono") as string || undefined,
      email: formData.get("email") as string || undefined,
    };

    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (client: any) => {
    setEditingClient(client);
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Estás seguro de eliminar este cliente?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleOpenDialog = () => {
    setEditingClient(null);
    setDialogOpen(true);
  };

  const filteredClients = clients.filter(
    (client) =>
      client.nombreEmpresa.toLowerCase().includes(filter.toLowerCase()) ||
      client.email?.toLowerCase().includes(filter.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los clientes empresariales
          </p>
        </div>
        <Button onClick={handleOpenDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Lista de Clientes
            </CardTitle>
            <div className="w-full max-w-sm">
              <Input
                placeholder="Buscar por nombre o email..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay clientes registrados</p>
              <Button onClick={handleOpenDialog} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Crear primer cliente
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Reclutador</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.nombreEmpresa}</TableCell>
                    <TableCell>{client.ubicacionPlaza || "-"}</TableCell>
                    <TableCell>{client.reclutador || "-"}</TableCell>
                    <TableCell>{client.contacto || "-"}</TableCell>
                    <TableCell>{client.telefono || "-"}</TableCell>
                    <TableCell>{client.email || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(client)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(client.id)}
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
              {editingClient ? "Editar Cliente" : "Nuevo Cliente"}
            </DialogTitle>
          </DialogHeader>
          {/* Descripción accesible para cumplir con Radix (oculta visualmente) */}
          <p className="sr-only" id="cliente-dialog-description">Formulario para capturar o editar datos del cliente.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="nombreEmpresa">Nombre de la Empresa *</Label>
                <Input
                  id="nombreEmpresa"
                  name="nombreEmpresa"
                  defaultValue={editingClient?.nombreEmpresa}
                  required
                />
              </div>
              <div>
                <Label htmlFor="ubicacionPlaza">Ubicación/Plaza</Label>
                <Input
                  id="ubicacionPlaza"
                  name="ubicacionPlaza"
                  defaultValue={editingClient?.ubicacionPlaza}
                />
              </div>
              <div>
                <Label htmlFor="reclutador">Reclutador</Label>
                <Input
                  id="reclutador"
                  name="reclutador"
                  defaultValue={editingClient?.reclutador}
                />
              </div>
              <div>
                <Label htmlFor="contacto">Contacto</Label>
                <Input
                  id="contacto"
                  name="contacto"
                  defaultValue={editingClient?.contacto}
                />
              </div>
              <div>
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  name="telefono"
                  defaultValue={editingClient?.telefono}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={editingClient?.email}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setEditingClient(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingClient ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Continuación */}
      <Dialog open={showContinueFlow} onOpenChange={setShowContinueFlow}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¡Cliente creado exitosamente!</DialogTitle>
          </DialogHeader>
          <p className="sr-only" id="cliente-continuar-description">Elige si continuar con el flujo o finalizar.</p>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              ¿Qué deseas hacer ahora?
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={handleContinueFlow} className="w-full">
                Continuar: Agregar Candidato y Proceso
              </Button>
              <Button onClick={handleFinish} variant="outline" className="w-full">
                Terminar aquí
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
