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
import { Plus, UserCheck, Pencil, Trash2 } from "lucide-react";
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

export default function Encuestadores() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSurveyor, setEditingSurveyor] = useState<any>(null);
  const [selectedActivo, setSelectedActivo] = useState<boolean>(true);

  const { data: surveyors = [], isLoading } = trpc.surveyors.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.surveyors.create.useMutation({
    onSuccess: () => {
      utils.surveyors.list.invalidate();
      setDialogOpen(false);
      toast.success("Encuestador creado exitosamente");
    },
    onError: (error) => {
      toast.error("Error al crear encuestador: " + error.message);
    },
  });

  const updateMutation = trpc.surveyors.update.useMutation({
    onSuccess: () => {
      utils.surveyors.list.invalidate();
      setDialogOpen(false);
      setEditingSurveyor(null);
      toast.success("Encuestador actualizado exitosamente");
    },
    onError: (error) => {
      toast.error("Error al actualizar encuestador: " + error.message);
    },
  });

  // Delete no está disponible en el router

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      nombre: formData.get("nombre") as string,
      telefono: formData.get("telefono") as string || undefined,
      email: formData.get("email") as string || undefined,
      activo: selectedActivo,
    };

    if (editingSurveyor) {
      updateMutation.mutate({ id: editingSurveyor.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (surveyor: any) => {
    setEditingSurveyor(surveyor);
    setSelectedActivo(surveyor.activo);
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    toast.error("Eliminar encuestadores no está disponible. Marca como inactivo en su lugar.");
  };

  const handleOpenDialog = () => {
    setEditingSurveyor(null);
    setSelectedActivo(true);
    setDialogOpen(true);
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
          <h1 className="text-3xl font-bold">Encuestadores</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los encuestadores del sistema
          </p>
        </div>
        <Button onClick={handleOpenDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Encuestador
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Lista de Encuestadores
          </CardTitle>
        </CardHeader>
        <CardContent>
          {surveyors.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay encuestadores registrados</p>
              <Button onClick={handleOpenDialog} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Crear primer encuestador
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Estatus</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {surveyors.map((surveyor) => (
                  <TableRow key={surveyor.id}>
                    <TableCell className="font-medium">{surveyor.nombre}</TableCell>
                    <TableCell>{surveyor.telefono || "-"}</TableCell>
                    <TableCell>{surveyor.email || "-"}</TableCell>
                    <TableCell>
                      <span
                        className={`badge ${
                          surveyor.activo
                            ? "badge-success"
                            : "badge-neutral"
                        }`}
                      >
                        {surveyor.activo ? "Activo" : "Inactivo"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(surveyor)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(surveyor.id)}
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
              {editingSurveyor ? "Editar Encuestador" : "Nuevo Encuestador"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  name="nombre"
                  defaultValue={editingSurveyor?.nombre}
                  required
                />
              </div>
              <div>
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  name="telefono"
                  defaultValue={editingSurveyor?.telefono}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={editingSurveyor?.email}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="activo">Estatus</Label>
                <Select 
                  value={selectedActivo ? "true" : "false"} 
                  onValueChange={(v) => setSelectedActivo(v === "true")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Activo</SelectItem>
                    <SelectItem value="false">Inactivo</SelectItem>
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
                  setEditingSurveyor(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingSurveyor ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
