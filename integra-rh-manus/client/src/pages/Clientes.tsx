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
import { Plus, Building2, Pencil, Trash2, Share2, Copy, Mail, MessageCircle, Eye } from "lucide-react";
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
import { toast } from "sonner";

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

  const { data: clients = [], isLoading } = trpc.clients.list.useQuery();
  const { data: allProcesses = [] } = trpc.processes.list.useQuery();
  const { data: candidates = [] } = trpc.candidates.list.useQuery();
  const { data: posts = [] } = trpc.posts.list.useQuery();
  const [selectedClientForProcesses, setSelectedClientForProcesses] = useState<any | null>(null);
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
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
            <>
              {/* Vista de tabla para escritorio */}
              <div className="hidden md:block overflow-x-auto">
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
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(client);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
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
                        <p className="text-xs text-muted-foreground">
                          {client.ubicacionPlaza || "Sin ubicación"}
                        </p>
                      </div>
                      <div className="flex gap-1">
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            openLinkDialog(client);
                          }}
                        >
                          <Share2 className="h-3 w-3" />
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
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
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
                  <div className="overflow-x-auto hidden sm:block">
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
                              {p.tipoProducto}
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
                            {p.tipoProducto}
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
