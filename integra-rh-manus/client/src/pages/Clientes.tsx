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
import {
  Plus,
  Building2,
  Pencil,
  Trash2,
  Share2,
  Copy,
  Mail,
  MessageCircle,
  Eye,
  MapPin,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useHasPermission } from "@/_core/hooks/usePermission";
import { formatTipoProductoDisplay } from "@/lib/procesoTipo";

export default function Clientes() {
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [showContinueFlow, setShowContinueFlow] = useState(false);
  const [createdClientId, setCreatedClientId] = useState<number | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkClient, setLinkClient] = useState<any>(null);
  const [linkEmail, setLinkEmail] = useState("");
  const [linkPhone, setLinkPhone] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [sitesDialogOpen, setSitesDialogOpen] = useState(false);
  const [sitesClient, setSitesClient] = useState<any | null>(null);
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteCity, setNewSiteCity] = useState("");
  const [newSiteState, setNewSiteState] = useState("");
  const [newClientPlazasText, setNewClientPlazasText] = useState("");

  const { data: clients = [], isLoading } = trpc.clients.list.useQuery();
  const { data: allProcesses = [] } = trpc.processes.list.useQuery();
  const { data: candidates = [] } = trpc.candidates.list.useQuery();
  const { data: posts = [] } = trpc.posts.list.useQuery();
  const [selectedClientForProcesses, setSelectedClientForProcesses] = useState<any | null>(null);
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const utils = trpc.useUtils();

  const {
    data: clientSitesByClient = [],
    isLoading: clientSitesLoading,
  } = trpc.clientSites.listByClient.useQuery(
    { clientId: sitesClient?.id ?? 0 },
    { enabled: !!sitesClient }
  );

  const createSiteForNewClientMutation = trpc.clientSites.create.useMutation();

  const createMutation = trpc.clients.create.useMutation({
    onSuccess: (data) => {
      utils.clients.list.invalidate();
      setCreatedClientId(data.id);
      setShowContinueFlow(true);
      toast.success("Cliente creado exitosamente");

      const plazas = newClientPlazasText
        .split(/\r?\n|,/g)
        .map((s) => s.trim())
        .filter(Boolean);
      const uniquePlazas = Array.from(new Set(plazas));
      if (uniquePlazas.length > 0) {
        void (async () => {
          try {
            await Promise.all(
              uniquePlazas.map((nombrePlaza) =>
                createSiteForNewClientMutation.mutateAsync({
                  clientId: data.id,
                  nombrePlaza,
                })
              )
            );
            await utils.clientSites.listByClient.invalidate({ clientId: data.id });
          } catch (e: any) {
            toast.error(
              "Cliente creado, pero no se pudieron crear todas las plazas: " +
                (e?.message || "Error")
            );
          } finally {
            setNewClientPlazasText("");
          }
        })();
      } else {
        setNewClientPlazasText("");
      }
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

  const shareLinkMutation = trpc.clientAccess.create.useMutation({
    onSuccess: (res: any) => {
      setGeneratedLink(res.url);
      toast.success("Enlace generado");
      try {
        navigator.clipboard?.writeText(res.url);
        toast.info("Enlace copiado al portapapeles");
      } catch {
        // ignore
      }
    },
    onError: (error) => {
      toast.error("No se pudo generar el enlace: " + error.message);
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
    setNewClientPlazasText("");
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Estás seguro de eliminar este cliente?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleOpenDialog = () => {
    setEditingClient(null);
    setNewClientPlazasText("");
    setDialogOpen(true);
  };

  const openLinkDialog = (client: any) => {
    setLinkClient(client);
    setLinkEmail(client?.email || "");
    setLinkPhone(client?.telefono || "");
    setGeneratedLink("");
    setLinkDialogOpen(true);
  };

  const buildFollowupMessage = (url: string) => {
    const name = linkClient?.nombreEmpresa || "tu empresa";
    return `Integra RH - Seguimiento de procesos\n\nHola ${name}, te compartimos el portal para dar seguimiento en tiempo real a tus procesos y candidatos:\n${url}\n\nPuedes consultarlo cuando gustes para revisar avances, visitas y dictámenes.`;
  };

  const handleGenerateLink = () => {
    if (!linkClient) return;
    shareLinkMutation.mutate({
      clientId: linkClient.id,
      ttlDays: 14,
      baseUrl: window.location.origin,
    });
  };

  const copyMessage = () => {
    if (!generatedLink) return;
    const msg = buildFollowupMessage(generatedLink);
    navigator.clipboard?.writeText(msg)
      .then(() => toast.success("Mensaje copiado"))
      .catch(() => toast.error("No se pudo copiar el mensaje"));
  };

  const sendWhatsapp = () => {
    if (!generatedLink || !linkPhone) {
      toast.error("Necesitas capturar un teléfono y generar el enlace");
      return;
    }
    const digits = linkPhone.replace(/[^0-9+]/g, "");
    if (!digits) {
      toast.error("Teléfono no válido");
      return;
    }
    const msg = buildFollowupMessage(generatedLink);
    const url = `https://api.whatsapp.com/send?phone=${encodeURIComponent(digits)}&text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const sendMail = () => {
    if (!generatedLink || !linkEmail) {
      toast.error("Necesitas capturar un correo y generar el enlace");
      return;
    }
    const subject = "Integra RH - Seguimiento de procesos y candidatos";
    const body = buildFollowupMessage(generatedLink);
    window.open(`mailto:${linkEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const createSiteMutation = trpc.clientSites.create.useMutation({
    onSuccess: () => {
      if (sitesClient?.id) {
        utils.clientSites.listByClient.invalidate({ clientId: sitesClient.id });
      }
      setNewSiteName("");
      setNewSiteCity("");
      setNewSiteState("");
      toast.success("Plaza creada correctamente");
    },
    onError: (error) => {
      toast.error("No se pudo crear la plaza: " + error.message);
    },
  });

  const filteredClients = clients.filter(
    (client) =>
      client.nombreEmpresa.toLowerCase().includes(filter.toLowerCase()) ||
      client.email?.toLowerCase().includes(filter.toLowerCase())
  );

  const processesBySelectedClient = useMemo(() => {
    if (!selectedClientForProcesses) return [];
    return allProcesses.filter(
      (p: any) => p.clienteId === selectedClientForProcesses.id
    );
  }, [allProcesses, selectedClientForProcesses]);

  const getCandidateName = (candidatoId: number) => {
    const candidate = candidates.find((c: any) => c.id === candidatoId);
    return candidate?.nombreCompleto || "-";
  };

  const getPostName = (puestoId: number) => {
    const post = posts.find((p: any) => p.id === puestoId);
    return post?.nombreDelPuesto || "-";
  };

  const toggleIaMutation = trpc.clients.update.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      toast.success("Preferencia de IA actualizada");
    },
    onError: (error) => {
      toast.error("No se pudo actualizar la preferencia de IA: " + error.message);
    },
  });

  const handleToggleIa = (client: any) => {
    if (!canEditClient) return;
    toggleIaMutation.mutate({
      id: client.id,
      data: {
        iaSuggestionsEnabled: !client.iaSuggestionsEnabled,
      },
    });
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      en_recepcion: "En recepción",
      asignado: "Asignado",
      en_verificacion: "En verificación",
      visita_programada: "Visita programada",
      visita_realizada: "Visita realizada",
      en_dictamen: "En dictamen",
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

  const canCreateClient = useHasPermission("clientes", "create");
  const canEditClient = useHasPermission("clientes", "edit");
  const canDeleteClient = useHasPermission("clientes", "delete");

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
        {canCreateClient && (
          <Button onClick={handleOpenDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Lista de Clientes
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Busca, filtra y gestiona las empresas con las que trabajas.
              </p>
            </div>
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
              {canCreateClient && (
                <Button onClick={handleOpenDialog} variant="outline" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primer cliente
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Vista de tabla para escritorio */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead className="hidden 2xl:table-cell">
                        Reclutador
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Contacto
                      </TableHead>
                      <TableHead className="w-[120px]">Teléfono</TableHead>
                      <TableHead className="w-[220px]">Email</TableHead>
                      <TableHead className="w-[120px] text-center">
                        IA Cliente
                      </TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => (
                    <TableRow
                      key={client.id}
                      className={
                        selectedClientForProcesses?.id === client.id
                          ? "bg-slate-50 cursor-pointer"
                          : "cursor-pointer"
                      }
                      onClick={() => {
                        setSelectedClientForProcesses(client);
                        setProcessDialogOpen(true);
                      }}
                    >
                      <TableCell className="font-medium">
                        <button
                          type="button"
                          className="text-left hover:underline"
                        >
                          {client.nombreEmpresa}
                        </button>
                      </TableCell>
                      <TableCell className="hidden 2xl:table-cell text-xs">
                        {client.reclutador || "-"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs">
                        {client.contacto || "-"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {client.telefono || "-"}
                      </TableCell>
                      <TableCell className="text-xs break-all">
                        {client.email || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleIa(client);
                          }}
                          className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] border ${
                            client.iaSuggestionsEnabled
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : "bg-slate-50 text-slate-500 border-slate-200"
                          }`}
                          title={
                            client.iaSuggestionsEnabled
                              ? "Desactivar sugerencias IA en el portal del cliente"
                              : "Activar sugerencias IA en el portal del cliente"
                          }
                        >
                          {client.iaSuggestionsEnabled
                            ? "IA activada"
                            : "IA desactivada"}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSitesClient(client);
                              setSitesDialogOpen(true);
                            }}
                            title="Plazas / sucursales"
                          >
                            <MapPin className="h-4 w-4" />
                          </Button>
                          {canEditClient && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(client);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDeleteClient && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(client.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openLinkDialog(client);
                            }}
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedClientForProcesses(client);
                              setProcessDialogOpen(true);
                            }}
                            title="Ver procesos de este cliente"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Vista en tarjetas para móvil */}
              <div className="space-y-3 md:hidden">
                {filteredClients.map((client) => (
                  <div
                    key={client.id}
                    className="rounded-lg border p-3 bg-white shadow-sm"
                    onClick={() => {
                      setSelectedClientForProcesses(client);
                      setProcessDialogOpen(true);
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-sm">
                          {client.nombreEmpresa}
                        </h3>
                        {/* Ubicación principal se gestiona ahora vía Plazas */}
                        <p className="text-[11px] mt-1">
                          <span className="font-semibold">IA cliente: </span>
                          <span
                            className={
                              client.iaSuggestionsEnabled
                                ? "text-emerald-700"
                                : "text-slate-500"
                            }
                          >
                            {client.iaSuggestionsEnabled
                              ? "Activada"
                              : "Desactivada"}
                          </span>
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {canEditClient && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(client);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                        {canDeleteClient && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(client.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            openLinkDialog(client);
                          }}
                          title="Compartir enlace"
                        >
                          <Share2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSitesClient(client);
                            setSitesDialogOpen(true);
                          }}
                          title="Plazas / sucursales"
                        >
                          <MapPin className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClientForProcesses(client);
                            setProcessDialogOpen(true);
                          }}
                          title="Ver procesos"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        {canEditClient && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleIa(client);
                            }}
                            title={
                              client.iaSuggestionsEnabled
                                ? "Desactivar sugerencias IA"
                                : "Activar sugerencias IA"
                            }
                          >
                            <span
                              className={
                                client.iaSuggestionsEnabled
                                  ? "h-3 w-3 rounded-full bg-emerald-500"
                                  : "h-3 w-3 rounded-full border border-slate-300"
                              }
                            />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground space-y-0.5">
                      <div>
                        <span className="font-semibold">Contacto: </span>
                        {client.contacto || "-"}
                      </div>
                      <div>
                        <span className="font-semibold">Tel: </span>
                        {client.telefono || "-"}
                      </div>
                      <div>
                        <span className="font-semibold">Email: </span>
                        {client.email || "-"}
                      </div>
                      <div>
                        <span className="font-semibold">Reclutador: </span>
                        {client.reclutador || "-"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
       </CardContent>
     </Card>

      {/* Dialog: procesos del cliente */}
      <Dialog
        open={processDialogOpen && !!selectedClientForProcesses}
        onOpenChange={setProcessDialogOpen}
      >
        <DialogContent className="max-w-5xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>
              Procesos de {selectedClientForProcesses?.nombreEmpresa || ""}
            </DialogTitle>
          </DialogHeader>
          {selectedClientForProcesses && (
            <div className="space-y-3">
              {processesBySelectedClient.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Este cliente aún no tiene procesos registrados.
                </p>
              ) : (
                <>
                  {/* Vista de tabla para escritorio */}
                  <div className="hidden sm:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Clave</TableHead>
                          <TableHead>Candidato</TableHead>
                          <TableHead>Puesto</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Estatus</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {processesBySelectedClient.map((p: any) => (
                          <TableRow
                            key={p.id}
                            className={getStatusRowClass(p.estatusProceso)}
                          >
                            <TableCell className="font-mono text-xs">
                              <Link href={`/procesos/${p.id}`}>{p.clave}</Link>
                            </TableCell>
                            <TableCell>{getCandidateName(p.candidatoId)}</TableCell>
                            <TableCell>{getPostName(p.puestoId)}</TableCell>
                            <TableCell className="text-xs">
                              {formatTipoProductoDisplay(p.tipoProducto)}
                            </TableCell>
                            <TableCell className="text-xs">
                              <span className={`badge ${getStatusBadgeClass(p.estatusProceso)}`}>
                                {getStatusLabel(p.estatusProceso)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Vista en tarjetas para celular */}
                  <div className="space-y-2 sm:hidden">
                    {processesBySelectedClient.map((p: any) => (
                      <div
                        key={p.id}
                        className={`rounded-md border px-3 py-2 text-xs ${getStatusRowClass(
                          p.estatusProceso
                        )}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono font-semibold">
                            {p.clave}
                          </span>
                          <span
                            className={`badge ${getStatusBadgeClass(p.estatusProceso)}`}
                          >
                            {getStatusLabel(p.estatusProceso)}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <div>
                            <span className="font-semibold">Candidato: </span>
                            {getCandidateName(p.candidatoId)}
                          </div>
                          <div>
                            <span className="font-semibold">Puesto: </span>
                            {getPostName(p.puestoId)}
                          </div>
                          <div>
                            <span className="font-semibold">Tipo: </span>
                            {formatTipoProductoDisplay(p.tipoProducto)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: plazas / sucursales del cliente */}
      <Dialog
        open={sitesDialogOpen && !!sitesClient}
        onOpenChange={(open) => {
          setSitesDialogOpen(open);
          if (!open) {
            setSitesClient(null);
            setNewSiteName("");
            setNewSiteCity("");
            setNewSiteState("");
          }
        }}
      >
        <DialogContent className="max-w-lg w-[95vw]">
          <DialogHeader>
            <DialogTitle>
              Plazas de {sitesClient?.nombreEmpresa || ""}
            </DialogTitle>
          </DialogHeader>
          {sitesClient && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Registra las plazas, sucursales o CEDIs asociados a este cliente.
                Podrás seleccionarlas al crear candidatos y procesos.
              </div>
              <div className="border rounded-md p-3 max-h-60 overflow-auto">
                {clientSitesLoading ? (
                  <p className="text-sm text-muted-foreground">
                    Cargando plazas...
                  </p>
                ) : clientSitesByClient.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aún no hay plazas registradas para este cliente.
                  </p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {clientSitesByClient.map((site: any) => (
                      <li
                        key={site.id}
                        className="flex items-center justify-between gap-2 rounded border bg-white px-2 py-1"
                      >
                        <div>
                          <p className="font-medium">{site.nombrePlaza}</p>
                          {(site.ciudad || site.estado) && (
                            <p className="text-xs text-muted-foreground">
                              {[site.ciudad, site.estado]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!sitesClient?.id || !newSiteName.trim()) return;
                  createSiteMutation.mutate({
                    clientId: sitesClient.id,
                    nombrePlaza: newSiteName.trim(),
                    ciudad: newSiteCity.trim() || undefined,
                    estado: newSiteState.trim() || undefined,
                  });
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="md:col-span-3">
                    <Label htmlFor="site-name">Nombre de la plaza *</Label>
                    <Input
                      id="site-name"
                      value={newSiteName}
                      onChange={(e) => setNewSiteName(e.target.value)}
                      placeholder="Ej. XALAPA, CEDIS OAXACA..."
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="site-city">Ciudad</Label>
                    <Input
                      id="site-city"
                      value={newSiteCity}
                      onChange={(e) => setNewSiteCity(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="site-state">Estado</Label>
                    <Input
                      id="site-state"
                      value={newSiteState}
                      onChange={(e) => setNewSiteState(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={createSiteMutation.isPending || !newSiteName.trim()}
                  >
                    Agregar plaza
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

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

              {!editingClient && (
                <div className="col-span-2">
                  <Label htmlFor="new-client-plazas">
                    Plazas / CEDIs (opcional)
                  </Label>
                  <Textarea
                    id="new-client-plazas"
                    value={newClientPlazasText}
                    onChange={(e) => setNewClientPlazasText(e.target.value)}
                    placeholder="Una por línea, o separadas por coma"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setEditingClient(null);
                  setNewClientPlazasText("");
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

      {/* Dialogo para compartir enlace */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Compartir acceso con el cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Este enlace permite a {linkClient?.nombreEmpresa ?? "el cliente"} dar seguimiento a todos sus procesos y candidatos en Integra RH.
            </p>
            <div>
              <Label htmlFor="linkEmail">Correo del cliente (para enviar mensaje)</Label>
              <Input
                id="linkEmail"
                type="email"
                value={linkEmail}
                onChange={(e) => setLinkEmail(e.target.value)}
                placeholder="cliente@empresa.com"
              />
            </div>
            <div>
              <Label htmlFor="linkPhone">WhatsApp</Label>
              <Input
                id="linkPhone"
                value={linkPhone}
                onChange={(e) => setLinkPhone(e.target.value)}
                placeholder="+52 55 0000 0000"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleGenerateLink} disabled={shareLinkMutation.isPending}>
                {generatedLink ? "Regenerar enlace" : "Generar enlace"}
              </Button>
              {generatedLink && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard?.writeText(generatedLink);
                    toast.success("Enlace copiado");
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar enlace
                </Button>
              )}
            </div>
            {generatedLink && (
              <div className="space-y-3">
                <div className="bg-muted rounded p-3 text-sm break-all">{generatedLink}</div>
                <div className="flex flex-col gap-2">
                  <Button variant="secondary" onClick={copyMessage}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar mensaje completo
                  </Button>
                  <Button variant="outline" onClick={sendMail} disabled={!linkEmail}>
                    <Mail className="h-4 w-4 mr-2" />
                    Enviar por correo
                  </Button>
                  <Button variant="outline" onClick={sendWhatsapp} disabled={!linkPhone}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Compartir por WhatsApp
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
