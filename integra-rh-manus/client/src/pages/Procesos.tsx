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
import { Plus, FileText, Eye } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { TIPOS_PROCESO, TipoProcesoType } from "@/lib/constants";

export default function Procesos() {
  const { user } = useAuth();
  const isClient = user?.role === "client";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedPost, setSelectedPost] = useState<string>("");
  const [tipoProducto, setTipoProducto] = useState<TipoProcesoType>("ILA");

  const { data: allProcesses = [], isLoading } = trpc.processes.list.useQuery();
  // Filtrar procesos según rol
  const processes = isClient
    ? allProcesses.filter(p => p.clienteId === user?.clientId)
    : allProcesses;
  const { data: candidates = [] } = trpc.candidates.list.useQuery();
  const { data: clients = [] } = trpc.clients.list.useQuery();
  const { data: allPosts = [] } = trpc.posts.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.processes.create.useMutation({
    onSuccess: (data) => {
      utils.processes.list.invalidate();
      utils.candidates.list.invalidate();
      setDialogOpen(false);
      setSelectedCandidate("");
      setSelectedClient("");
      setSelectedPost("");
      toast.success(`Proceso creado: ${data.clave}`);
    },
    onError: (error) => {
      toast.error("Error al crear proceso: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!selectedCandidate || !selectedClient || !selectedPost) {
      toast.error("Todos los campos son requeridos");
      return;
    }

    createMutation.mutate({
      candidatoId: parseInt(selectedCandidate),
      clienteId: parseInt(selectedClient),
      puestoId: parseInt(selectedPost),
      tipoProducto,
    });
  };

  const handleOpenDialog = () => {
    setSelectedCandidate("");
    setSelectedClient("");
    setSelectedPost("");
    setTipoProducto("ILA");
    setDialogOpen(true);
  };

  const getCandidateName = (candidatoId: number) => {
    const candidate = candidates.find((c) => c.id === candidatoId);
    return candidate?.nombreCompleto || "-";
  };

  const getClientName = (clienteId: number) => {
    const client = clients.find((c) => c.id === clienteId);
    return client?.nombreEmpresa || "-";
  };

  const getPostName = (puestoId: number) => {
    const post = allPosts.find((p) => p.id === puestoId);
    return post?.nombreDelPuesto || "-";
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      en_recepcion: "En Recepción",
      asignado: "Asignado",
      en_verificacion: "En Verificación",
      visita_programada: "Visita Programada",
      visita_realizada: "Visita Realizada",
      en_dictamen: "En Dictamen",
      finalizado: "Finalizado",
      entregado: "Entregado",
    };
    return labels[status] || status;
  };

  const getStatusBadgeClass = (status: string): string => {
    const classes: Record<string, string> = {
      en_recepcion: "badge-info",
      asignado: "badge-info",
      en_verificacion: "badge-warning",
      visita_programada: "badge-warning",
      visita_realizada: "badge-warning",
      en_dictamen: "badge-warning",
      finalizado: "badge-success",
      entregado: "badge-success",
    };
    return classes[status] || "badge-neutral";
  };

  // Filtrar puestos por cliente seleccionado
  const availablePosts = selectedClient
    ? allPosts.filter((p) => p.clienteId === parseInt(selectedClient))
    : allPosts;

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
          <h1 className="text-3xl font-bold">Procesos</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los procesos de evaluación
          </p>
        </div>
        <Button onClick={handleOpenDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Proceso
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Lista de Procesos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {processes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay procesos registrados</p>
              <Button onClick={handleOpenDialog} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Crear primer proceso
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clave</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Candidato</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Puesto</TableHead>
                  <TableHead>Fecha Recepción</TableHead>
                  <TableHead>Estatus</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processes.map((process) => (
                  <TableRow key={process.id}>
                    <TableCell className="font-medium font-mono">
                      {process.clave}
                    </TableCell>
                    <TableCell>
                      <span className="badge badge-info">{process.tipoProducto}</span>
                    </TableCell>
                    <TableCell>{getCandidateName(process.candidatoId)}</TableCell>
                    <TableCell>{getClientName(process.clienteId)}</TableCell>
                    <TableCell>{getPostName(process.puestoId)}</TableCell>
                    <TableCell>
                      {new Date(process.fechaRecepcion).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <span className={`badge ${getStatusBadgeClass(process.estatusProceso)}`}>
                        {getStatusLabel(process.estatusProceso)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/procesos/${process.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
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
            <DialogTitle>Nuevo Proceso</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="tipoProducto">Proceso a Realizar *</Label>
                <Select value={tipoProducto} onValueChange={(v) => setTipoProducto(v as TipoProcesoType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_PROCESO.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  La clave se generará automáticamente (ej: ILA-2025-001)
                </p>
              </div>

              <div>
                <Label htmlFor="candidatoId">Candidato *</Label>
                <Select value={selectedCandidate} onValueChange={setSelectedCandidate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un candidato" />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.map((candidate) => (
                      <SelectItem key={candidate.id} value={candidate.id.toString()}>
                        {candidate.nombreCompleto}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="clienteId">Cliente *</Label>
                <Select
                  value={selectedClient}
                  onValueChange={(value) => {
                    setSelectedClient(value);
                    setSelectedPost(""); // Reset puesto cuando cambia cliente
                  }}
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
                <Label htmlFor="puestoId">Puesto *</Label>
                <Select
                  value={selectedPost}
                  onValueChange={setSelectedPost}
                  disabled={!selectedClient}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un puesto" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePosts.map((post) => (
                      <SelectItem key={post.id} value={post.id.toString()}>
                        {post.nombreDelPuesto}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <Button
                type="submit"
                disabled={
                  createMutation.isPending ||
                  !selectedCandidate ||
                  !selectedClient ||
                  !selectedPost
                }
              >
                Crear Proceso
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
