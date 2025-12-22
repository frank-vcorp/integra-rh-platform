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
import { Building2, Users, Briefcase, FileText, ChevronRight } from "lucide-react";
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

export default function ClienteFormularioIntegrado() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [candidatoId, setCandidatoId] = useState<number | null>(null);
  const [puestoId, setPuestoId] = useState<number | null>(null);
  const [baseTipo, setBaseTipo] = useState<ProcesoBaseType>("ILA");
  const [ilaModo, setIlaModo] = useState<IlaModoType>("NORMAL");
  const [eseAmbito, setEseAmbito] = useState<AmbitoType>("LOCAL");
  const [eseExtra, setEseExtra] = useState<"NINGUNO" | "BURO" | "LEGAL">(
    "NINGUNO"
  );
  const [visitaAmbito, setVisitaAmbito] = useState<AmbitoType>("LOCAL");

  const utils = trpc.useUtils();

  // Mutations
  const createClientMutation = trpc.clients.create.useMutation({
    onSuccess: (data) => {
      setClienteId(data.id);
      toast.success("Cliente creado exitosamente");
      setStep(2);
    },
    onError: (error) => {
      toast.error("Error al crear cliente: " + error.message);
    },
  });

  const createCandidateMutation = trpc.candidates.create.useMutation({
    onSuccess: (data) => {
      setCandidatoId(data.id);
      toast.success("Candidato creado exitosamente");
      setStep(3);
    },
    onError: (error) => {
      toast.error("Error al crear candidato: " + error.message);
    },
  });

  const createPostMutation = trpc.posts.create.useMutation({
    onSuccess: (data) => {
      setPuestoId(data.id);
      toast.success("Puesto creado exitosamente");
      setStep(4);
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
      utils.clients.list.invalidate();
      toast.success("¡Proceso creado exitosamente! Flujo completo finalizado.");
      setTimeout(() => setLocation("/procesos"), 1500);
    },
    onError: (error) => {
      toast.error("Error al crear proceso: " + error.message);
    },
  });

  // Handlers
  const handleClientSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createClientMutation.mutate({
      nombreEmpresa: formData.get("nombreEmpresa") as string,
      contacto: formData.get("contacto") as string || undefined,
      email: formData.get("email") as string || undefined,
      telefono: formData.get("telefono") as string || undefined,
    });
  };

  const handleCandidateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createCandidateMutation.mutate({
      nombreCompleto: formData.get("nombreCompleto") as string,
      email: formData.get("email") as string || undefined,
      telefono: formData.get("telefono") as string || undefined,
      medioDeRecepcion: formData.get("medioDeRecepcion") as string || undefined,
      clienteId: clienteId!,
    });
  };

  const handlePostSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createPostMutation.mutate({
      nombreDelPuesto: formData.get("nombreDelPuesto") as string,
      clienteId: clienteId!,
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
      clienteId: clienteId!,
      candidatoId: candidatoId!,
      puestoId: puestoId!,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Flujo Completo: Cliente → Proceso</h1>
        <p className="text-muted-foreground mt-1">
          Crea un cliente, candidato, puesto y proceso en un solo flujo
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            1
          </div>
          <span className="font-medium">Cliente</span>
        </div>
        <ChevronRight className="text-muted-foreground" />
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            2
          </div>
          <span className="font-medium">Candidato</span>
        </div>
        <ChevronRight className="text-muted-foreground" />
        <div className={`flex items-center gap-2 ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            3
          </div>
          <span className="font-medium">Puesto</span>
        </div>
        <ChevronRight className="text-muted-foreground" />
        <div className={`flex items-center gap-2 ${step >= 4 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 4 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            4
          </div>
          <span className="font-medium">Proceso</span>
        </div>
      </div>

      <Separator />

      {/* Step 1: Cliente */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Paso 1: Crear Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleClientSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="nombreEmpresa">Nombre de la Empresa *</Label>
                  <Input
                    id="nombreEmpresa"
                    name="nombreEmpresa"
                    required
                    placeholder="Ej: Acme Corporation"
                  />
                </div>
                <div>
                  <Label htmlFor="contacto">Nombre del Contacto</Label>
                  <Input
                    id="contacto"
                    name="contacto"
                    placeholder="Ej: Juan Pérez"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="contacto@empresa.com"
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
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={createClientMutation.isPending}>
                  Continuar a Candidato
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Candidato */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Paso 2: Crear Candidato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCandidateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Regresar
                </Button>
                <Button type="submit" disabled={createCandidateMutation.isPending}>
                  Continuar a Puesto
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Puesto */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Paso 3: Crear Puesto
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
                <Button type="button" variant="outline" onClick={() => setStep(2)}>
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

      {/* Step 4: Proceso */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Paso 4: Crear Proceso
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
                  <li>✓ Cliente creado (ID: {clienteId})</li>
                  <li>✓ Candidato creado (ID: {candidatoId})</li>
                  <li>✓ Puesto creado (ID: {puestoId})</li>
                  <li>→ Proceso por crear</li>
                </ul>
              </div>
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(3)}>
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
