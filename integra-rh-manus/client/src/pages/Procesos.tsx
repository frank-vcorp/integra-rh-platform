import { Button } from "@/components/ui/button";
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
import { Plus, FileText, Eye, Trash2, ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";
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
import { useHasPermission } from "@/_core/hooks/usePermission";
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
  const processesBase = isClient
    ? allProcesses.filter(p => p.clienteId === user?.clientId)
    : allProcesses;
  const { data: candidates = [] } = trpc.candidates.list.useQuery();
  const { data: clients = [] } = trpc.clients.list.useQuery();
  const { data: allPosts = [] } = trpc.posts.list.useQuery();
  const { data: users = [] } = trpc.users.list.useQuery();
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

  const deleteMutation = trpc.processes.delete.useMutation({
    onSuccess: () => {
      utils.processes.list.invalidate();
      toast.success("Proceso eliminado exitosamente");
    },
    onError: (error) => {
      toast.error("Error al eliminar proceso: " + error.message);
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

  const getResponsableName = (userId?: number | null) => {
    if (!userId) return "-";
    const u = (users as any[]).find((user) => user.id === userId);
    return u?.name || u?.email || "-";
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

  const getStatusRowClass = (status: string): string => {
    const classes: Record<string, string> = {
      en_recepcion: "bg-sky-50",
      asignado: "bg-sky-50",
      en_verificacion: "bg-amber-50",
      visita_programada: "bg-amber-50",
      visita_realizada: "bg-amber-50",
      en_dictamen: "bg-amber-50",
      finalizado: "bg-emerald-50",
      entregado: "bg-emerald-50",
    };
    return classes[status] || "";
  };

  // Filtrar puestos por cliente seleccionado
  const availablePosts = selectedClient
    ? allPosts.filter((p) => p.clienteId === parseInt(selectedClient))
    : allPosts;

  const [processSortKey, setProcessSortKey] = useState<"clave" | "tipo" | "estatus">("clave");
  const [processSortDir, setProcessSortDir] = useState<"asc" | "desc">("asc");

  const processes = useMemo(() => {
    const list = [...processesBase];
    list.sort((a, b) => {
      let av: string = "";
      let bv: string = "";
      if (processSortKey === "tipo") {
        av = (a.tipoProducto || "").toLowerCase();
        bv = (b.tipoProducto || "").toLowerCase();
      } else if (processSortKey === "estatus") {
        av = getStatusLabel(a.estatusProceso).toLowerCase();
        bv = getStatusLabel(b.estatusProceso).toLowerCase();
      } else {
        av = (a.clave || "").toLowerCase();
        bv = (b.clave || "").toLowerCase();
      }
      if (av < bv) return processSortDir === "asc" ? -1 : 1;
      if (av > bv) return processSortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [processesBase, processSortKey, processSortDir]);

  const toggleProcessSort = (key: "clave" | "tipo" | "estatus") => {
    setProcessSortKey((prev) => {
      if (prev === key) {
        setProcessSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
        return prev;
      }
      setProcessSortDir("asc");
      return key;
    });
  };

  const {
    procesosHoy,
    procesosUltimos7,
    pendientesInicio,
    enVerificacion,
    enDictamen,
    finalizados,
    entregados,
  } = useMemo(() => {
    const now = new Date();
    const MS_DAY = 24 * 60 * 60 * 1000;

    let hoy = 0;
    let ultimos7 = 0;
    let pend = 0;
    let veri = 0;
    let dicta = 0;
    let fini = 0;
    let entre = 0;

    processes.forEach((p) => {
      const d = new Date(p.fechaRecepcion);
      const diff = now.getTime() - d.getTime();
      if (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      ) {
        hoy += 1;
      }
      if (diff >= 0 && diff <= 7 * MS_DAY) {
        ultimos7 += 1;
      }

      switch (p.estatusProceso) {
        case "en_recepcion":
        case "asignado":
          pend += 1;
          break;
        case "en_verificacion":
        case "visita_programada":
        case "visita_realizada":
          veri += 1;
          break;
        case "en_dictamen":
          dicta += 1;
          break;
        case "finalizado":
          fini += 1;
          break;
        case "entregado":
          entre += 1;
          break;
        default:
          break;
      }
    });

    return {
      procesosHoy: hoy,
      procesosUltimos7: ultimos7,
      pendientesInicio: pend,
      enVerificacion: veri,
      enDictamen: dicta,
      finalizados: fini,
      entregados: entre,
    };
  }, [processes]);

  const canCreateProcess = useHasPermission("procesos", "create");
  const canDeleteProcess = useHasPermission("procesos", "delete");

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
        {!isClient && canCreateProcess && (
          <Button onClick={handleOpenDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Proceso
          </Button>
        )}
      </div>

      {/* Resumen rápido compacto */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span>
          Recibidos hoy:{" "}
          <span className="font-semibold text-foreground">{procesosHoy}</span>
        </span>
        <span>
          Últimos 7 días:{" "}
          <span className="font-semibold text-foreground">
            {procesosUltimos7}
          </span>
        </span>
        <span>
          Pendientes de iniciar:{" "}
          <span className="font-semibold text-sky-700">
            {pendientesInicio}
          </span>
        </span>
        <span>
          En verificación:{" "}
          <span className="font-semibold text-amber-700">
            {enVerificacion}
          </span>
        </span>
        <span>
          En dictamen:{" "}
          <span className="font-semibold text-orange-700">
            {enDictamen}
          </span>
        </span>
        <span>
          Finalizados:{" "}
          <span className="font-semibold text-emerald-700">
            {finalizados}
          </span>
        </span>
        <span>
          Entregados:{" "}
          <span className="font-semibold text-emerald-900">
            {entregados}
          </span>
        </span>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Lista de Procesos
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Revisa el estatus de cada proceso y entra al detalle cuando lo necesites.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {processes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay procesos registrados</p>
              {!isClient && canCreateProcess && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={handleOpenDialog} variant="outline" className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Crear primer proceso
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Crea un proceso de investigación para un candidato y cliente.
                  </TooltipContent>
                </Tooltip>
              )}
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
                          onClick={() => toggleProcessSort("clave")}
                        >
                          Clave
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs font-semibold"
                          onClick={() => toggleProcessSort("tipo")}
                        >
                          Tipo
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </TableHead>
                      <TableHead>Candidato</TableHead>
	                      <TableHead>Cliente</TableHead>
	                      <TableHead>Puesto</TableHead>
	                      <TableHead>Responsable</TableHead>
	                      <TableHead>Fecha Recepción</TableHead>
                      <TableHead>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs font-semibold"
                          onClick={() => toggleProcessSort("estatus")}
                        >
                          Estatus
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processes.map((process) => (
                      <TableRow
                        key={process.id}
                        className={getStatusRowClass(process.estatusProceso)}
                      >
                        <TableCell className="font-medium font-mono">
                          {process.clave}
                        </TableCell>
                        <TableCell>
                          <span className="badge badge-info">
                            {process.tipoProducto}
                          </span>
                        </TableCell>
                        <TableCell>
                          {getCandidateName(process.candidatoId)}
                        </TableCell>
	                        <TableCell>
	                          {getClientName(process.clienteId)}
	                        </TableCell>
	                        <TableCell>{getPostName(process.puestoId)}</TableCell>
	                        <TableCell>
	                          {getResponsableName(
	                            (process as any).especialistaAtraccionId,
	                          )}
	                        </TableCell>
                        <TableCell>
                          {new Date(
                            process.fechaRecepcion,
                          ).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`badge ${getStatusBadgeClass(
                              process.estatusProceso,
                            )}`}
                          >
                            {getStatusLabel(process.estatusProceso)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link href={`/procesos/${process.id}`}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    aria-label="Ver detalle"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent>
                                Ver detalle completo del proceso.
                              </TooltipContent>
                            </Tooltip>
                            {!isClient && canDeleteProcess && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    aria-label="Eliminar proceso"
                                    onClick={() => {
                                      const ok = confirm(
                                        `¿Seguro que deseas eliminar el proceso ${process.clave}? Esta acción no se puede deshacer.`,
                                      );
                                      if (ok)
                                        deleteMutation.mutate({ id: process.id });
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Eliminar este proceso de investigación.
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Vista en tarjetas para móvil */}
              <div className="space-y-3 md:hidden">
                {processes.map((process) => (
                  <div
                    key={process.id}
                    className={`rounded-lg border p-3 text-xs shadow-sm ${getStatusRowClass(
                      process.estatusProceso,
                    )}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-semibold">
                        {process.clave}
                      </span>
                      <span
                        className={`badge ${getStatusBadgeClass(
                          process.estatusProceso,
                        )}`}
                      >
                        {getStatusLabel(process.estatusProceso)}
                      </span>
                    </div>
                    <div className="space-y-0.5 text-[11px]">
                      <div>
                        <span className="font-semibold">Tipo: </span>
                        {process.tipoProducto}
                      </div>
                      <div>
                        <span className="font-semibold">Candidato: </span>
                        {getCandidateName(process.candidatoId)}
                      </div>
	                      <div>
	                        <span className="font-semibold">Cliente: </span>
	                        {getClientName(process.clienteId)}
	                      </div>
	                      <div>
	                        <span className="font-semibold">Puesto: </span>
	                        {getPostName(process.puestoId)}
	                      </div>
	                      <div>
	                        <span className="font-semibold">Responsable: </span>
	                        {getResponsableName(
	                          (process as any).especialistaAtraccionId,
	                        )}
	                      </div>
                      <div>
                        <span className="font-semibold">Recepción: </span>
                        {new Date(
                          process.fechaRecepcion,
                        ).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link href={`/procesos/${process.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>Ver detalle.</TooltipContent>
                      </Tooltip>
                      {!isClient && canDeleteProcess && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                const ok = confirm(
                                  `¿Seguro que deseas eliminar el proceso ${process.clave}? Esta acción no se puede deshacer.`,
                                );
                                if (ok)
                                  deleteMutation.mutate({ id: process.id });
                              }}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Eliminar.</TooltipContent>
                        </Tooltip>
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
