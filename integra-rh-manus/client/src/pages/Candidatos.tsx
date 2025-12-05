import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Plus, Users, Pencil, Trash2, Eye, ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
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

export default function Candidatos() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedPost, setSelectedPost] = useState<string>("");
  const [showContinueFlow, setShowContinueFlow] = useState(false);
  const [createdCandidateData, setCreatedCandidateData] = useState<any>(null);

  const { user } = useAuth();
  const isClient = user?.role === "client";

  const { data: allCandidates = [], isLoading } = trpc.candidates.list.useQuery();
  const { data: clients = [] } = trpc.clients.list.useQuery();
  const { data: allPosts = [] } = trpc.posts.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.candidates.create.useMutation({
    onSuccess: (data) => {
      utils.candidates.list.invalidate();
      setCreatedCandidateData({ ...data, clienteId: selectedClient });
      setShowContinueFlow(true);
      toast.success("Candidato creado exitosamente");
    },
    onError: (error) => {
      toast.error("Error al crear candidato: " + error.message);
    },
  });

  const updateMutation = trpc.candidates.update.useMutation({
    onSuccess: () => {
      utils.candidates.list.invalidate();
      setDialogOpen(false);
      setEditingCandidate(null);
      toast.success("Candidato actualizado exitosamente");
    },
    onError: (error) => {
      toast.error("Error al actualizar candidato: " + error.message);
    },
  });

  const deleteMutation = trpc.candidates.delete.useMutation({
    onSuccess: () => {
      utils.candidates.list.invalidate();
      toast.success("Candidato eliminado exitosamente");
    },
    onError: (error) => {
      toast.error("Error al eliminar candidato: " + error.message);
    },
  });

  const handleContinueFlow = () => {
    setDialogOpen(false);
    setShowContinueFlow(false);
    setSelectedClient("");
    setSelectedPost("");
    // Redirigir a flujo de puesto y proceso con candidato y cliente pre-seleccionados
    window.location.href = `/flujo-puesto?candidatoId=${createdCandidateData.id}&clienteId=${createdCandidateData.clienteId}`;
  };

  const handleFinish = () => {
    setDialogOpen(false);
    setShowContinueFlow(false);
    setSelectedClient("");
    setSelectedPost("");
    setCreatedCandidateData(null);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      nombreCompleto: formData.get("nombreCompleto") as string,
      email: formData.get("email") as string || undefined,
      telefono: formData.get("telefono") as string || undefined,
      medioDeRecepcion: formData.get("medioDeRecepcion") as string || undefined,
      clienteId: selectedClient ? parseInt(selectedClient) : undefined,
      puestoId: selectedPost ? parseInt(selectedPost) : undefined,
    };

    if (editingCandidate) {
      updateMutation.mutate({ id: editingCandidate.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (candidate: any) => {
    setEditingCandidate(candidate);
    setSelectedClient(candidate.clienteId?.toString() || "");
    setSelectedPost(candidate.puestoId?.toString() || "");
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Estás seguro de eliminar este candidato?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleOpenDialog = () => {
    setEditingCandidate(null);
    setSelectedClient("");
    setSelectedPost("");
    setDialogOpen(true);
  };

  const getClientName = (clienteId: number | null) => {
    if (!clienteId) return "-";
    const client = clients.find((c) => c.id === clienteId);
    return client?.nombreEmpresa || "-";
  };

  const getPostName = (puestoId: number | null) => {
    if (!puestoId) return "-";
    const post = allPosts.find((p) => p.id === puestoId);
    return post?.nombreDelPuesto || "-";
  };

  // Filtrar puestos por cliente seleccionado
  const availablePosts = selectedClient
    ? allPosts.filter((p) => p.clienteId === parseInt(selectedClient))
    : allPosts;

  // Filtrar candidatos según rol + buscador global
  const searchParam =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
          .get("search")
          ?.toLowerCase() || ""
      : "";

  const candidatesBase = (
    isClient
      ? allCandidates.filter((c) => c.clienteId === user?.clientId)
      : allCandidates
  ).filter((c) => {
    if (!searchParam) return true;
    const haystack = [
      c.nombreCompleto,
      c.email,
      c.telefono,
      c.medioDeRecepcion,
      getClientName(c.clienteId),
      getPostName(c.puestoId),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(searchParam);
  });

  const [candidateSortKey, setCandidateSortKey] = useState<"nombre" | "cliente" | "progreso">("nombre");
  const [candidateSortDir, setCandidateSortDir] = useState<"asc" | "desc">("asc");

  const candidates = useMemo(() => {
    const list = [...candidatesBase];
    list.sort((a, b) => {
      let av: string = "";
      let bv: string = "";
      if (candidateSortKey === "cliente") {
        av = (getClientName(a.clienteId) || "").toLowerCase();
        bv = (getClientName(b.clienteId) || "").toLowerCase();
      } else if (candidateSortKey === "progreso") {
        av = a.investigacionProgreso ?? 0;
        bv = b.investigacionProgreso ?? 0;
      } else {
        av = (a.nombreCompleto || "").toLowerCase();
        bv = (b.nombreCompleto || "").toLowerCase();
      }
      if (av < bv) return candidateSortDir === "asc" ? -1 : 1;
      if (av > bv) return candidateSortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [candidatesBase, candidateSortKey, candidateSortDir, clients]);

  const toggleCandidateSort = (key: "nombre" | "cliente" | "progreso") => {
    setCandidateSortKey((prev) => {
      if (prev === key) {
        setCandidateSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
        return prev;
      }
      setCandidateSortDir("asc");
      return key;
    });
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
          <h1 className="text-3xl font-bold">Candidatos</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los candidatos del sistema
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={handleOpenDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Candidato
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Crea un candidato nuevo para iniciar su expediente.
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Lista de Candidatos
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Consulta a todos los candidatos y accede rápido a su expediente.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {candidates.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay candidatos registrados</p>
              <Button onClick={handleOpenDialog} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Crear primer candidato
              </Button>
            </div>
          ) : (
            <>
              {/* Vista de tabla para escritorio */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs font-semibold"
                          onClick={() => toggleCandidateSort("nombre")}
                        >
                          Nombre Completo
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs font-semibold"
                          onClick={() => toggleCandidateSort("cliente")}
                        >
                          Cliente
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </TableHead>
                      <TableHead>Puesto</TableHead>
                      <TableHead>Medio de Recepción</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidates.map((candidate) => (
                      <TableRow key={candidate.id}>
                        <TableCell className="font-medium">
                          {candidate.nombreCompleto}
                        </TableCell>
                        <TableCell>{candidate.email || "-"}</TableCell>
                        <TableCell>{candidate.telefono || "-"}</TableCell>
                        <TableCell>{getClientName(candidate.clienteId)}</TableCell>
                        <TableCell>{getPostName(candidate.puestoId)}</TableCell>
                        <TableCell>{candidate.medioDeRecepcion || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link href={`/candidatos/${candidate.id}`}>
                                  <Button variant="ghost" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent>
                                Ver detalle y expediente del candidato.
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(candidate)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Editar datos básicos del candidato.
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(candidate.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Eliminar candidato del sistema.
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Vista en tarjetas para móvil */}
              <div className="space-y-3 md:hidden">
                {candidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="rounded-lg border p-3 bg-white shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-sm">
                          {candidate.nombreCompleto}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {getClientName(candidate.clienteId)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href={`/candidatos/${candidate.id}`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>
                            Ver detalle y expediente.
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEdit(candidate)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar datos básicos.</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleDelete(candidate.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Eliminar candidato.</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground space-y-0.5">
                      <div>
                        <span className="font-semibold">Email: </span>
                        {candidate.email || "-"}
                      </div>
                      <div>
                        <span className="font-semibold">Tel: </span>
                        {candidate.telefono || "-"}
                      </div>
                      <div>
                        <span className="font-semibold">Puesto: </span>
                        {getPostName(candidate.puestoId) || "-"}
                      </div>
                      <div>
                        <span className="font-semibold">Medio: </span>
                        {candidate.medioDeRecepcion || "-"}
                      </div>
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
              {editingCandidate ? "Editar Candidato" : "Nuevo Candidato"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="nombreCompleto">Nombre Completo *</Label>
                <Input
                  id="nombreCompleto"
                  name="nombreCompleto"
                  defaultValue={editingCandidate?.nombreCompleto}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={editingCandidate?.email}
                />
              </div>
              <div>
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  name="telefono"
                  defaultValue={editingCandidate?.telefono}
                />
              </div>
              <div>
                <Label htmlFor="clienteId">Cliente</Label>
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
                <Label htmlFor="puestoId">Puesto</Label>
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
              <div className="col-span-2">
                <Label htmlFor="medioDeRecepcion">Medio de Recepción</Label>
                <Input
                  id="medioDeRecepcion"
                  name="medioDeRecepcion"
                  defaultValue={editingCandidate?.medioDeRecepcion}
                  placeholder="Ej: Correo, WhatsApp, Presencial"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setEditingCandidate(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingCandidate ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Continuación */}
      <Dialog open={showContinueFlow} onOpenChange={setShowContinueFlow}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¡Candidato creado exitosamente!</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              ¿Qué deseas hacer ahora?
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={handleContinueFlow} className="w-full">
                Continuar: Agregar Puesto y Proceso
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
