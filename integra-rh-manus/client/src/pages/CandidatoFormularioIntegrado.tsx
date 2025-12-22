import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Users, Briefcase, FileText, ChevronRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { TipoProcesoType } from "@/lib/constants";
import {
  AmbitoType,
  IlaModoType,
  PROCESO_BASE_OPTIONS,
  ProcesoBaseType,
  ProcesoConfig,
  mapProcesoConfigToTipoProducto,
} from "@/lib/procesoTipo";
import { useLocation } from "wouter";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function CandidatoFormularioIntegrado() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  
  // Obtener clienteId desde URL si existe
  const urlParams = new URLSearchParams(window.location.search);
  const clienteIdFromUrl = urlParams.get('clienteId');
  
  const [selectedClient, setSelectedClient] = useState<string>(clienteIdFromUrl || "");
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [createClientDialogOpen, setCreateClientDialogOpen] = useState(false);
  const [newClientNombreEmpresa, setNewClientNombreEmpresa] = useState("");
  const [newClientReclutador, setNewClientReclutador] = useState("");
  const [newClientContacto, setNewClientContacto] = useState("");
  const [newClientTelefono, setNewClientTelefono] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPlazasText, setNewClientPlazasText] = useState("");

  const [createSiteDialogOpen, setCreateSiteDialogOpen] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteCity, setNewSiteCity] = useState("");
  const [newSiteState, setNewSiteState] = useState("");
  const [candidatoId, setCandidatoId] = useState<number | null>(null);
  const [puestoId, setPuestoId] = useState<number | null>(null);
  const [baseTipo, setBaseTipo] = useState<ProcesoBaseType>("ILA");
  const [ilaModo, setIlaModo] = useState<IlaModoType>("NORMAL");
  const [eseAmbito, setEseAmbito] = useState<AmbitoType>("LOCAL");
  const [eseExtra, setEseExtra] = useState<"NINGUNO" | "BURO" | "LEGAL">(
    "NINGUNO"
  );
  const [visitaAmbito, setVisitaAmbito] = useState<AmbitoType>("LOCAL");

  const { data: clients = [] } = trpc.clients.list.useQuery();
  const { data: clientSitesByClient = [] } = trpc.clientSites.listByClient.useQuery(
    selectedClient ? { clientId: parseInt(selectedClient) } : { clientId: 0 },
    { enabled: !!selectedClient } as any
  );
  const utils = trpc.useUtils();

  const createClientMutation = trpc.clients.create.useMutation({
    onSuccess: async (data) => {
      utils.clients.list.invalidate();
      setSelectedClient(String(data.id));
      setSelectedSite("");

      const plazas = newClientPlazasText
        .split(/\r?\n|,/g)
        .map((s) => s.trim())
        .filter(Boolean);
      const uniquePlazas = Array.from(new Set(plazas));

      if (uniquePlazas.length > 0) {
        try {
          await Promise.all(
            uniquePlazas.map((nombrePlaza) =>
              createClientSiteMutation.mutateAsync({
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
        }
      }

      setCreateClientDialogOpen(false);
      setNewClientNombreEmpresa("");
      setNewClientReclutador("");
      setNewClientContacto("");
      setNewClientTelefono("");
      setNewClientEmail("");
      setNewClientPlazasText("");
      toast.success("Cliente creado correctamente");
    },
    onError: (error) => {
      toast.error("Error al crear cliente: " + error.message);
    },
  });

  const createClientSiteMutation = trpc.clientSites.create.useMutation({
    onSuccess: async (data) => {
      if (selectedClient) {
        await utils.clientSites.listByClient.invalidate({
          clientId: parseInt(selectedClient),
        });
      }
      setSelectedSite(String(data.id));
      setCreateSiteDialogOpen(false);
      setNewSiteName("");
      setNewSiteCity("");
      setNewSiteState("");
      toast.success("Plaza creada correctamente");
    },
    onError: (error) => {
      toast.error("No se pudo crear la plaza: " + error.message);
    },
  });

  // Mutations
  const createCandidateMutation = trpc.candidates.create.useMutation({
    onSuccess: (data) => {
      setCandidatoId(data.id);
      toast.success("Candidato creado exitosamente");
      setStep(2);
    },
    onError: (error) => {
      toast.error("Error al crear candidato: " + error.message);
    },
  });

  const createPostMutation = trpc.posts.create.useMutation({
    onSuccess: (data) => {
      setPuestoId(data.id);
      toast.success("Puesto creado exitosamente");
      setStep(3);
    },
    onError: (error) => {
      toast.error("Error al crear puesto: " + error.message);
    },
  });

  const createProcessMutation = trpc.processes.create.useMutation({
    onSuccess: () => {
      utils.processes.list.invalidate();
      utils.candidates.list.invalidate();
      utils.posts.list.invalidate();
      toast.success("¡Proceso creado exitosamente! Flujo completo finalizado.");
      setTimeout(() => setLocation("/procesos"), 1500);
    },
    onError: (error) => {
      toast.error("Error al crear proceso: " + error.message);
    },
  });

  // Handlers
  const handleCandidateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createCandidateMutation.mutate({
      nombreCompleto: formData.get("nombreCompleto") as string,
      email: formData.get("email") as string || undefined,
      telefono: formData.get("telefono") as string || undefined,
      medioDeRecepcion: formData.get("medioDeRecepcion") as string || undefined,
      clienteId: selectedClient ? parseInt(selectedClient) : undefined,
      clientSiteId: selectedSite ? parseInt(selectedSite) : undefined,
    });
  };

  const handlePostSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (!selectedClient) return;
    createPostMutation.mutate({
      nombreDelPuesto: formData.get("nombreDelPuesto") as string,
      clienteId: parseInt(selectedClient),
    });
  };

  const handleProcessSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
    createProcessMutation.mutate({
      tipoProducto,
      clienteId: parseInt(selectedClient),
      candidatoId: candidatoId!,
      puestoId: puestoId!,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Flujo Rápido: Candidato → Proceso</h1>
        <p className="text-muted-foreground mt-1">
          Crea un candidato, puesto y proceso en un solo flujo
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            1
          </div>
          <span className="font-medium">Candidato</span>
        </div>
        <ChevronRight className="text-muted-foreground" />
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            2
          </div>
          <span className="font-medium">Puesto</span>
        </div>
        <ChevronRight className="text-muted-foreground" />
        <div className={`flex items-center gap-2 ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            3
          </div>
          <span className="font-medium">Proceso</span>
        </div>
      </div>

      <Separator />

      {/* Step 1: Candidato */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Paso 1: Crear Candidato
            </CardTitle>
          </CardHeader>
      <CardContent>
            <form onSubmit={handleCandidateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="clienteId">Cliente *</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setCreateClientDialogOpen(true)}
                    >
                      Agregar cliente
                    </Button>
                  </div>
                  <Select
                    value={selectedClient}
                    onValueChange={(value) => {
                      setSelectedClient(value);
                      setSelectedSite("");
                    }}
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
                <div className="col-span-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="clientSiteId">Plaza / CEDI</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!selectedClient}
                      onClick={() => {
                        setCreateSiteDialogOpen(true);
                      }}
                    >
                      Agregar plaza
                    </Button>
                  </div>
                  <Select
                    value={selectedSite}
                    onValueChange={setSelectedSite}
                    disabled={!selectedClient}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          selectedClient
                            ? clientSitesByClient.length
                              ? "Selecciona una plaza"
                              : "No hay plazas registradas (agrega una)"
                            : "Selecciona primero un cliente"
                        }
                      />
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
                <div className="col-span-2">
                  <Label htmlFor="nombreCompleto">Nombre Completo *</Label>
                  <Input
                    id="nombreCompleto"
                    name="nombreCompleto"
                    required
                    placeholder="Ej: María González López"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="candidato@email.com"
                  />
                </div>
                <div>
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    name="telefono"
                    placeholder="(55) 1234-5678"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="medioDeRecepcion">Medio de Recepción</Label>
                  <Input
                    id="medioDeRecepcion"
                    name="medioDeRecepcion"
                    placeholder="Ej: Correo, WhatsApp, Presencial"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={createCandidateMutation.isPending || !selectedClient}>
                  Continuar a Puesto
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Dialog: crear cliente (con plazas opcionales) */}
      <Dialog
        open={createClientDialogOpen}
        onOpenChange={(open) => {
          setCreateClientDialogOpen(open);
          if (!open) {
            setNewClientNombreEmpresa("");
            setNewClientReclutador("");
            setNewClientContacto("");
            setNewClientTelefono("");
            setNewClientEmail("");
            setNewClientPlazasText("");
          }
        }}
      >
        <DialogContent className="max-w-lg w-[95vw]">
          <DialogHeader>
            <DialogTitle>Nuevo cliente</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newClientNombreEmpresa.trim()) return;
              createClientMutation.mutate({
                nombreEmpresa: newClientNombreEmpresa.trim(),
                reclutador: newClientReclutador.trim() || undefined,
                contacto: newClientContacto.trim() || undefined,
                telefono: newClientTelefono.trim() || undefined,
                email: newClientEmail.trim() || undefined,
              });
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="new-client-nombre">Nombre de la Empresa *</Label>
              <Input
                id="new-client-nombre"
                value={newClientNombreEmpresa}
                onChange={(e) => setNewClientNombreEmpresa(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="new-client-reclutador">Reclutador</Label>
                <Input
                  id="new-client-reclutador"
                  value={newClientReclutador}
                  onChange={(e) => setNewClientReclutador(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-client-contacto">Contacto</Label>
                <Input
                  id="new-client-contacto"
                  value={newClientContacto}
                  onChange={(e) => setNewClientContacto(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-client-telefono">Teléfono</Label>
                <Input
                  id="new-client-telefono"
                  value={newClientTelefono}
                  onChange={(e) => setNewClientTelefono(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-client-email">Email</Label>
                <Input
                  id="new-client-email"
                  type="email"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="new-client-plazas">Plazas / CEDIs (opcional)</Label>
              <Textarea
                id="new-client-plazas"
                value={newClientPlazasText}
                onChange={(e) => setNewClientPlazasText(e.target.value)}
                placeholder="Una por línea, o separadas por coma"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateClientDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createClientMutation.isPending || !newClientNombreEmpresa.trim()}
              >
                Crear
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: crear plaza para cliente seleccionado */}
      <Dialog
        open={createSiteDialogOpen}
        onOpenChange={(open) => {
          setCreateSiteDialogOpen(open);
          if (!open) {
            setNewSiteName("");
            setNewSiteCity("");
            setNewSiteState("");
          }
        }}
      >
        <DialogContent className="max-w-lg w-[95vw]">
          <DialogHeader>
            <DialogTitle>Agregar plaza</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedClient) return;
              if (!newSiteName.trim()) return;
              createClientSiteMutation.mutate({
                clientId: parseInt(selectedClient),
                nombrePlaza: newSiteName.trim(),
                ciudad: newSiteCity.trim() || undefined,
                estado: newSiteState.trim() || undefined,
              });
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="new-site-name">Nombre de la plaza *</Label>
              <Input
                id="new-site-name"
                value={newSiteName}
                onChange={(e) => setNewSiteName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="new-site-city">Ciudad</Label>
                <Input
                  id="new-site-city"
                  value={newSiteCity}
                  onChange={(e) => setNewSiteCity(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-site-state">Estado</Label>
                <Input
                  id="new-site-state"
                  value={newSiteState}
                  onChange={(e) => setNewSiteState(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateSiteDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createClientSiteMutation.isPending || !selectedClient || !newSiteName.trim()}
              >
                Agregar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Step 2: Puesto */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Paso 2: Crear Puesto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePostSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="nombreDelPuesto">Nombre del Puesto *</Label>
                  <Input
                    id="nombreDelPuesto"
                    name="nombreDelPuesto"
                    required
                    placeholder="Ej: Gerente de Ventas"
                  />
                </div>
              </div>
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Regresar
                </Button>
                <Button type="submit" disabled={createPostMutation.isPending}>
                  Continuar a Proceso
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Proceso */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Paso 3: Crear Proceso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProcessSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Proceso a Realizar *</Label>
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
                        onValueChange={(v) =>
                          setVisitaAmbito(v as AmbitoType)
                        }
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
                </div>
              </div>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">Resumen del flujo:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Cliente seleccionado (ID: {selectedClient})</li>
                  <li>✓ Candidato creado (ID: {candidatoId})</li>
                  <li>✓ Puesto creado (ID: {puestoId})</li>
                  <li>→ Proceso por crear</li>
                </ul>
              </div>
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                  Regresar
                </Button>
                <Button type="submit" disabled={createProcessMutation.isPending}>
                  Finalizar y Crear Proceso
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
