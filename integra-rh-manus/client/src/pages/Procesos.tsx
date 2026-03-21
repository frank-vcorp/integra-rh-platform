/**
 * @file Procesos.tsx
 * @description Gestión de procesos de investigación.
 * @fix FIX-20260217-01: Corrección de nombres de Plaza y Responsable mediante propiedades directas.
 * @fix FIX-20260217-03: Validación obligatoria de Plaza y fallback de Responsable a Analista.
 */
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
import { Plus, FileText, ArrowUpDown } from "lucide-react";
import {
  Eye,
  Trash,
} from "@phosphor-icons/react";
import { useMemo, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { TipoProcesoType } from "@/lib/constants";
import {
  AmbitoType,
  IlaModoType,
  PROCESO_BASE_OPTIONS,
  ProcesoBaseType,
  ProcesoConfig,
  formatTipoProductoDisplay,
  mapProcesoConfigToTipoProducto,
} from "@/lib/procesoTipo";
import { getCalificacionLabel, getCalificacionTextClass } from "@/lib/dictamen";

export default function Procesos() {
  const [_, setLocation] = useLocation();
  const { user } = useAuth();
  const isClient = user?.role === "client";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [selectedPost, setSelectedPost] = useState<string>("");
  const [baseTipo, setBaseTipo] = useState<ProcesoBaseType>("ILA");
  const [ilaModo, setIlaModo] = useState<IlaModoType>("NORMAL");
  const [eseAmbito, setEseAmbito] = useState<AmbitoType>("LOCAL");
  const [eseExtra, setEseExtra] = useState<"NINGUNO" | "BURO" | "LEGAL">(
    "NINGUNO"
  );
  const [visitaAmbito, setVisitaAmbito] = useState<AmbitoType>("LOCAL");

  const { data: allProcesses = [], isLoading } = trpc.processes.list.useQuery();
  // Filtrar procesos según rol
  const processesBase = isClient
    ? allProcesses.filter((p: any) => p.clienteId === user?.clientId)
    : allProcesses;
  const { data: candidates = [] } = trpc.candidates.list.useQuery();
  const { data: clients = [] } = trpc.clients.list.useQuery();
  const { data: clientSitesByClient = [] } = trpc.clientSites.listByClient.useQuery(
    selectedClient ? { clientId: parseInt(selectedClient) } : { clientId: 0 },
    { enabled: !!selectedClient } as any
  );
  const { data: allPosts = [] } = trpc.posts.list.useQuery();

  const utils = trpc.useUtils();

  // FIX-20260217-02: Auto-seleccionar plaza si solo hay una disponible
  useEffect(() => {
    if (selectedClient && clientSitesByClient && clientSitesByClient.length === 1) {
      setSelectedSite(clientSitesByClient[0].id.toString());
    } else if (!selectedClient) {
      setSelectedSite("");
    }
  }, [selectedClient, clientSitesByClient]);

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
      toast.error("Candidato, Cliente y Puesto son requeridos");
      return;
    }

    const config: ProcesoConfig =
      baseTipo === "ILA"
        ? { base: "ILA", modo: ilaModo }
        : baseTipo === "ESE"
        ? { base: "ESE", ambito: eseAmbito, extra: eseExtra }
        : baseTipo === "VISITA"
        ? { base: "VISITA", ambito: visitaAmbito }
        : baseTipo === "BURO"
        ? { base: "BURO" }
        : baseTipo === "LEGAL"
        ? { base: "LEGAL" }
        : { base: "SEMANAS" };

    const tipoProducto: TipoProcesoType = mapProcesoConfigToTipoProducto(
      config
    );

    createMutation.mutate({
      candidatoId: parseInt(selectedCandidate),
      clienteId: parseInt(selectedClient),
      puestoId: parseInt(selectedPost),
      clientSiteId: selectedSite ? parseInt(selectedSite) : undefined,
      tipoProducto,
    });
  };

  const handleOpenDialog = () => {
    setSelectedCandidate("");
    setSelectedClient("");
    setSelectedPost("");
    setBaseTipo("ILA");
    setIlaModo("NORMAL");
    setEseAmbito("LOCAL");
    setEseExtra("NINGUNO");
    setVisitaAmbito("LOCAL");
    setDialogOpen(true);
  };

  const getCandidateName = (candidatoId: number) => {
    const candidate = candidates.find((c: any) => c.id === candidatoId);
    return candidate?.nombreCompleto || "-";
  };


  const getPostName = (puestoId: number) => {
    const post = allPosts.find((p: any) => p.id === puestoId);
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

  // FIX-20260312-03: texto minimalista sin badge para evitar desbordamiento
  const getStatusTextClass = (status: string): string => {
    const classes: Record<string, string> = {
      en_recepcion: "text-sky-600",
      asignado: "text-sky-600",
      en_verificacion: "text-amber-600",
      visita_programada: "text-amber-600",
      visita_realizada: "text-amber-600",
      en_dictamen: "text-orange-600",
      finalizado: "text-emerald-600",
      entregado: "text-emerald-700",
    };
    return classes[status] || "text-slate-500";
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
    ? allPosts.filter((p: any) => p.clienteId === parseInt(selectedClient))
    : allPosts;

  const [processSortKey, setProcessSortKey] = useState<
    "clave" | "tipo" | "estatus" | "fechaRecepcion"
  >("fechaRecepcion");
  const [processSortDir, setProcessSortDir] = useState<"asc" | "desc">("desc");

  const processes = useMemo(() => {
    const list = [...processesBase];
    list.sort((a, b) => {
      if (processSortKey === "fechaRecepcion") {
        const at = Number.isFinite(new Date(a.fechaRecepcion).getTime())
          ? new Date(a.fechaRecepcion).getTime()
          : 0;
        const bt = Number.isFinite(new Date(b.fechaRecepcion).getTime())
          ? new Date(b.fechaRecepcion).getTime()
          : 0;
        if (at < bt) return processSortDir === "asc" ? -1 : 1;
        if (at > bt) return processSortDir === "asc" ? 1 : -1;
        return 0;
      }

      let av: string = "";
      let bv: string = "";
      if (processSortKey === "tipo") {
        av = formatTipoProductoDisplay(a.tipoProducto).toLowerCase();
        bv = formatTipoProductoDisplay(b.tipoProducto).toLowerCase();
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

  const toggleProcessSort = (
    key: "clave" | "tipo" | "estatus" | "fechaRecepcion"
  ) => {
    setProcessSortKey((prev) => {
      if (prev === key) {
        setProcessSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
        return prev;
      }
      setProcessSortDir(key === "fechaRecepcion" ? "desc" : "asc");
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
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[110px]">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs font-semibold"
                          onClick={() => toggleProcessSort("clave")}
                        >
                          Clave
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </TableHead>
                      <TableHead className="w-[90px]">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs font-semibold"
                          onClick={() => toggleProcessSort("tipo")}
                        >
                          Tipo
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </TableHead>
                      <TableHead className="max-w-[220px]">
                        Candidato
                      </TableHead>
                      <TableHead className="max-w-[220px]">
                        Cliente
                      </TableHead>
                      <TableHead className="max-w-[200px]">
                        Plaza
                      </TableHead>
                      <TableHead className="max-w-[220px]">
                        Puesto
                      </TableHead>
                      <TableHead className="max-w-[200px]">
                        Responsable
                      </TableHead>
                      <TableHead className="w-[120px]">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs font-semibold"
                          onClick={() => toggleProcessSort("fechaRecepcion")}
                        >
                          Fecha Recepción
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </TableHead>
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
                      <TableHead className="max-w-[160px]">
                        Calificación
                      </TableHead>
                      <TableHead className="w-[120px] text-right">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processes.map((process) => (
                      <TableRow
                        key={process.id}
                        className={`${getStatusRowClass(process.estatusProceso)} h-8 cursor-pointer hover:bg-muted/50`}
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.closest("button") || target.closest("a")) return;
                          setLocation(`/candidatos/${process.candidatoId}?tab=empleos`);
                        }}
                      >
                        <TableCell className="font-medium font-mono text-xs py-1.5">
                          {process.clave}
                        </TableCell>
                        <TableCell className="py-1.5">
                          <span
                            className="text-[10px] uppercase font-medium text-blue-600 block truncate max-w-[80px]"
                            title={formatTipoProductoDisplay(process.tipoProducto)}
                          >
                            {formatTipoProductoDisplay(process.tipoProducto)}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[220px] text-xs py-1.5">
                          <div className="truncate" title={getCandidateName(process.candidatoId)}>
                            {getCandidateName(process.candidatoId)}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[220px] text-xs py-1.5">
                          <div className="truncate" title={(process as any).clientName || "-"}>
                            {(process as any).clientName || "-"}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] text-xs py-1.5">
                          <div className="truncate" title={(process as any).siteName || "-"}>
                            {(process as any).siteName || "-"}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[220px] text-xs py-1.5">
                          <div className="truncate" title={getPostName(process.puestoId)}>
                            {getPostName(process.puestoId)}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] text-xs py-1.5">
                          <div
                            className="truncate"
                            title={
                              (process as any).responsableName ||
                              (process as any).especialistaAtraccionNombre ||
                              (process as any).analistaName ||
                              "-"
                            }
                          >
                            {(process as any).responsableName ||
                              (process as any).especialistaAtraccionNombre ||
                              (process as any).analistaName ||
                              "-"}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs py-1.5">
                          {new Date(
                            process.fechaRecepcion,
                          ).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="py-1.5">
                          <span
                            className={`text-[10px] font-medium uppercase block truncate max-w-[110px] ${getStatusTextClass(process.estatusProceso)}`}
                            title={getStatusLabel(process.estatusProceso)}
                          >
                            {getStatusLabel(process.estatusProceso)}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-medium py-1.5">
                          <span
                            className={getCalificacionTextClass(
                              process.calificacionFinal,
                            )}
                          >
                            {getCalificacionLabel(process.calificacionFinal)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right py-1">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" title="Ver detalle" asChild>
                              <Link href={`/candidatos/${process.candidatoId}?tab=empleos`}>
                                <Eye weight="fill" className="h-4 w-4 text-cyan-600" />
                              </Link>
                            </Button>
                            {!isClient && canDeleteProcess && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Eliminar"
                                onClick={() => {
                                  const ok = confirm(
                                    `¿Seguro que deseas eliminar el proceso ${process.clave}? Esta acción no se puede deshacer.`,
                                  );
                                  if (ok) deleteMutation.mutate({ id: process.id });
                                }}
                              >
                                <Trash weight="fill" className="h-4 w-4 text-red-500" />
                              </Button>
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
                    className={`rounded-lg border p-3 text-xs shadow-sm cursor-pointer hover:bg-muted/50 ${getStatusRowClass(
                      process.estatusProceso,
                    )}`}
                    onClick={() => setLocation(`/candidatos/${process.candidatoId}?tab=empleos`)}
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
                        {formatTipoProductoDisplay(process.tipoProducto)}
                      </div>
                      <div>
                        <span className="font-semibold">Candidato: </span>
                        {getCandidateName(process.candidatoId)}
                      </div>
	                      <div>
	                        <span className="font-semibold">Cliente: </span>
	                        {(process as any).clientName || "-"}
	                      </div>
	                      <div>
	                        <span className="font-semibold">Puesto: </span>
	                        {getPostName(process.puestoId)}
	                      </div>
	                      <div>
	                        <span className="font-semibold">Responsable: </span>
	                        {(process as any).responsableName ||
                            (process as any).especialistaAtraccionNombre ||
                            "-"}
	                      </div>
                      <div>
                        <span className="font-semibold">Recepción: </span>
                        {new Date(
                          process.fechaRecepcion,
                        ).toLocaleDateString()}
                      </div>
                      <div>
                        <span className="font-semibold">Calificación: </span>
                        <span
                          className={getCalificacionTextClass(
                            process.calificacionFinal,
                          )}
                        >
                          {getCalificacionLabel(process.calificacionFinal)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Ver detalle" asChild>
                        <Link href={`/candidatos/${process.candidatoId}?tab=empleos`}>
                          <Eye weight="fill" className="h-4 w-4 text-cyan-600" />
                        </Link>
                      </Button>
                      {!isClient && canDeleteProcess && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Eliminar"
                          onClick={() => {
                            const ok = confirm(
                              `¿Seguro que deseas eliminar el proceso ${process.clave}? Esta acción no se puede deshacer.`,
                            );
                            if (ok) deleteMutation.mutate({ id: process.id });
                          }}
                        >
                          <Trash weight="fill" className="h-4 w-4 text-red-500" />
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

      {/* Sheet: nuevo proceso */}
      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-xl lg:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Nuevo Proceso</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="tipo-base">Proceso a realizar *</Label>
                <Select
                  value={baseTipo}
                  onValueChange={(v) => setBaseTipo(v as ProcesoBaseType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROCESO_BASE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {baseTipo === "ILA" && (
                  <div className="mt-3 space-y-1">
                    <Label className="text-xs">Modalidad ILA</Label>
                    <Select
                      value={ilaModo}
                      onValueChange={(v) => setIlaModo(v as IlaModoType)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NORMAL">
                          Normal (sin buró ni legal)
                        </SelectItem>
                        <SelectItem value="BURO">
                          Con buró de crédito
                        </SelectItem>
                        <SelectItem value="LEGAL">
                          Con investigación legal
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {baseTipo === "ESE" && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Ámbito</Label>
                      <Select
                        value={eseAmbito}
                        onValueChange={(v) => setEseAmbito(v as AmbitoType)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOCAL">Local</SelectItem>
                          <SelectItem value="FORANEO">Foráneo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Complemento</Label>
                      <Select
                        value={eseExtra}
                        onValueChange={(v) =>
                          setEseExtra(v as "NINGUNO" | "BURO" | "LEGAL")
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NINGUNO">
                            Sin complemento
                          </SelectItem>
                          <SelectItem value="BURO">
                            Con buró de crédito
                          </SelectItem>
                          <SelectItem value="LEGAL">
                            Con investigación legal
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {baseTipo === "VISITA" && (
                  <div className="mt-3 space-y-1">
                    <Label className="text-xs">Ámbito de visita</Label>
                    <Select
                      value={visitaAmbito}
                      onValueChange={(v) => setVisitaAmbito(v as AmbitoType)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOCAL">Local</SelectItem>
                        <SelectItem value="FORANEO">Foránea</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  La clave se generará automáticamente (ej: ILA-2025-001) según
                  el tipo de proceso seleccionado.
                </p>
              </div>

              <div>
                <Label htmlFor="candidatoId">Candidato *</Label>
                <Select value={selectedCandidate} onValueChange={setSelectedCandidate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un candidato" />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.map((candidate: any) => (
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
                    setSelectedSite("");
                    setSelectedPost(""); // Reset puesto cuando cambia cliente
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client: any) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.nombreEmpresa}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="clientSiteId">Plaza / CEDI</Label>
                <Select
                  value={selectedSite}
                  onValueChange={setSelectedSite}
                  disabled={!selectedClient || !clientSitesByClient.length}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedClient ? "Selecciona una plaza" : "Selecciona primero un cliente"} />
                  </SelectTrigger>
                  <SelectContent>
                    {clientSitesByClient.map((site: any) => (
                      <SelectItem key={site.id} value={site.id.toString()}>
                        {site.nombrePlaza}
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
                    {availablePosts.map((post: any) => (
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
        </SheetContent>
      </Sheet>
    </div>
  );
}
