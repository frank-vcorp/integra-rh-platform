import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Plus, Pencil, Trash2, Briefcase, MessageSquare } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function CandidatoDetalle() {
  const params = useParams();
  const candidateId = parseInt(params.id || "0");

  const [workHistoryDialogOpen, setWorkHistoryDialogOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [editingWorkHistory, setEditingWorkHistory] = useState<any>(null);

  const { data: candidate, isLoading } = trpc.candidates.getById.useQuery({ id: candidateId });
  const { data: workHistory = [] } = trpc.workHistory.getByCandidate.useQuery({ candidatoId: candidateId });
  const { data: comments = [] } = trpc.candidateComments.getByCandidate.useQuery({ candidatoId: candidateId });
  const utils = trpc.useUtils();

  // Work History mutations
  const createWorkHistoryMutation = trpc.workHistory.create.useMutation({
    onSuccess: () => {
      utils.workHistory.getByCandidate.invalidate();
      setWorkHistoryDialogOpen(false);
      toast.success("Historial laboral agregado");
    },
    onError: (error: any) => {
      toast.error("Error: " + error.message);
    },
  });

  const updateWorkHistoryMutation = trpc.workHistory.update.useMutation({
    onSuccess: () => {
      utils.workHistory.getByCandidate.invalidate();
      setWorkHistoryDialogOpen(false);
      setEditingWorkHistory(null);
      toast.success("Historial laboral actualizado");
    },
    onError: (error: any) => {
      toast.error("Error: " + error.message);
    },
  });

  const deleteWorkHistoryMutation = trpc.workHistory.delete.useMutation({
    onSuccess: () => {
      utils.workHistory.getByCandidate.invalidate();
      toast.success("Historial laboral eliminado");
    },
    onError: (error: any) => {
      toast.error("Error: " + error.message);
    },
  });

  // Comment mutations
  const createCommentMutation = trpc.candidateComments.create.useMutation({
    onSuccess: () => {
      utils.candidateComments.getByCandidate.invalidate();
      setCommentDialogOpen(false);
      toast.success("Comentario agregado");
    },
    onError: (error: any) => {
      toast.error("Error: " + error.message);
    },
  });

  const handleWorkHistorySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      candidatoId: candidateId,
      empresa: formData.get("empresa") as string,
      puesto: formData.get("puesto") as string || undefined,
      fechaInicio: formData.get("fechaInicio") as string || undefined,
      fechaFin: formData.get("fechaFin") as string || undefined,
      observaciones: formData.get("observaciones") as string || undefined,
    };

    if (editingWorkHistory) {
      updateWorkHistoryMutation.mutate({ id: editingWorkHistory.id, data });
    } else {
      createWorkHistoryMutation.mutate(data);
    }
  };

  const handleCommentSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createCommentMutation.mutate({
      candidatoId: candidateId,
      text: formData.get("comentario") as string,
    });
    e.currentTarget.reset();
  };

  const handleEditWorkHistory = (item: any) => {
    setEditingWorkHistory(item);
    setWorkHistoryDialogOpen(true);
  };

  const handleDeleteWorkHistory = (id: number) => {
    if (confirm("¿Eliminar este registro?")) {
      deleteWorkHistoryMutation.mutate({ id });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Candidato no encontrado</p>
        <Link href="/candidatos">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Candidatos
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/candidatos">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{candidate.nombreCompleto}</h1>
          <p className="text-muted-foreground mt-1">Detalle del candidato</p>
        </div>
      </div>

      {/* Candidate Info */}
      <Card>
        <CardHeader>
          <CardTitle>Información General</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{candidate.email || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Teléfono</p>
              <p className="font-medium">{candidate.telefono || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Medio de Recepción</p>
              <p className="font-medium">{candidate.medioDeRecepcion || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fecha de Registro</p>
              <p className="font-medium">
                {new Date(candidate.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Historial Laboral
          </CardTitle>
          <Button
            size="sm"
            onClick={() => {
              setEditingWorkHistory(null);
              setWorkHistoryDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar
          </Button>
        </CardHeader>
        <CardContent>
          {workHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay historial laboral registrado
            </p>
          ) : (
            <div className="space-y-4">
              {workHistory.map((item) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold">{item.empresa}</h4>
                      <p className="text-sm text-muted-foreground">{item.puesto || "-"}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.fechaInicio ? new Date(item.fechaInicio).toLocaleDateString() : "-"} -{" "}
                        {item.fechaFin ? new Date(item.fechaFin).toLocaleDateString() : "Actual"}
                      </p>
                      {item.observaciones && (
                        <p className="text-sm mt-2">
                          <span className="text-muted-foreground">Observaciones:</span> {item.observaciones}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditWorkHistory(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteWorkHistory(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comentarios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCommentSubmit} className="mb-4">
            <div className="flex gap-2">
              <Textarea
                name="comentario"
                placeholder="Agregar un comentario..."
                required
                rows={2}
              />
              <Button type="submit" disabled={createCommentMutation.isPending}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </form>

          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay comentarios
            </p>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="border-l-2 border-primary pl-4 py-2">
                  <p className="text-sm">{comment.text}</p>
                  <p className="text-xs text-muted-foreground">Por: {comment.author}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(comment.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Work History Dialog */}
      <Dialog open={workHistoryDialogOpen} onOpenChange={setWorkHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingWorkHistory ? "Editar Historial Laboral" : "Agregar Historial Laboral"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleWorkHistorySubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="empresa">Empresa *</Label>
                <Input
                  id="empresa"
                  name="empresa"
                  defaultValue={editingWorkHistory?.empresa}
                  required
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="puesto">Puesto</Label>
                <Input
                  id="puesto"
                  name="puesto"
                  defaultValue={editingWorkHistory?.puesto}
                />
              </div>
              <div>
                <Label htmlFor="fechaInicio">Fecha de Inicio</Label>
                <Input
                  id="fechaInicio"
                  name="fechaInicio"
                  type="date"
                  defaultValue={
                    editingWorkHistory?.fechaInicio
                      ? new Date(editingWorkHistory.fechaInicio).toISOString().split("T")[0]
                      : ""
                  }
                />
              </div>
              <div>
                <Label htmlFor="fechaFin">Fecha de Fin</Label>
                <Input
                  id="fechaFin"
                  name="fechaFin"
                  type="date"
                  defaultValue={
                    editingWorkHistory?.fechaFin
                      ? new Date(editingWorkHistory.fechaFin).toISOString().split("T")[0]
                      : ""
                  }
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea
                  id="observaciones"
                  name="observaciones"
                  defaultValue={editingWorkHistory?.observaciones}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setWorkHistoryDialogOpen(false);
                  setEditingWorkHistory(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  createWorkHistoryMutation.isPending || updateWorkHistoryMutation.isPending
                }
              >
                {editingWorkHistory ? "Actualizar" : "Agregar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
