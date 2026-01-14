/**
 * =============================================================================
 * PuestoProcesoFlow.tsx - Flujo: Puesto → Proceso (desde Candidatos)
 * =============================================================================
 * 
 * HOMOGENEIZACIÓN DE FLUJOS (13 ene 2026)
 * ----------------------------------------
 * Este archivo fue modificado para garantizar consistencia de datos con los
 * demás flujos de creación de procesos:
 * - ClienteFormularioIntegrado.tsx (Flujo Completo)
 * - CandidatoFormularioIntegrado.tsx (Flujo Rápido)
 * - Procesos.tsx (Módulo Normal)
 * 
 * Cambios aplicados:
 * 1. Se agregó selector de Plaza/CEDI (opcional)
 * 2. Se cambió select simple de TIPOS_PROCESO por el config builder (ProcesoConfig)
 * 3. Se pasa `clientSiteId` al crear proceso (antes era NULL)
 * 
 * Referencia: CHK_2025-01-13_HOMOGENEIZACION-FLUJOS.md
 * =============================================================================
 */

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
import { Briefcase, FileText, ChevronRight, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { TipoProcesoType } from "@/lib/constants";
// [HOMOGENEIZACIÓN] Importar el config builder igual que otros flujos
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

export default function PuestoProcesoFlow() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  
  // Obtener parámetros desde URL
  const urlParams = new URLSearchParams(window.location.search);
  const candidatoId = urlParams.get('candidatoId');
  const clienteId = urlParams.get('clienteId');
  
  const [puestoId, setPuestoId] = useState<number | null>(null);
  
  // [HOMOGENEIZACIÓN] Estado para Plaza/CEDI - consistente con otros flujos
  const [selectedSite, setSelectedSite] = useState<string>("");
  
  // [HOMOGENEIZACIÓN] Estado para config builder - igual que Flujo Completo y Flujo Rápido
  const [baseTipo, setBaseTipo] = useState<ProcesoBaseType>("ILA");
  const [ilaModo, setIlaModo] = useState<IlaModoType>("NORMAL");
  const [eseAmbito, setEseAmbito] = useState<AmbitoType>("LOCAL");
  const [eseExtra, setEseExtra] = useState<"NINGUNO" | "BURO" | "LEGAL">("NINGUNO");
  const [visitaAmbito, setVisitaAmbito] = useState<AmbitoType>("LOCAL");

  const utils = trpc.useUtils();
  
  // [HOMOGENEIZACIÓN] Query para obtener plazas del cliente
  const { data: clientSites = [] } = trpc.clientSites.listByClient.useQuery(
    { clientId: clienteId ? parseInt(clienteId) : 0 },
    { enabled: !!clienteId }
  );

  // Mutations
  const createPostMutation = trpc.posts.create.useMutation({
    onSuccess: (data) => {
      setPuestoId(data.id);
      toast.success("Puesto creado exitosamente");
      setStep(2);
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
  const handlePostSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (!clienteId) {
      toast.error("Error: No se encontró el cliente");
      return;
    }
    createPostMutation.mutate({
      nombreDelPuesto: formData.get("nombreDelPuesto") as string,
      clienteId: parseInt(clienteId),
    });
  };

  const handleProcessSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (!clienteId || !candidatoId) {
      toast.error("Error: Faltan datos del cliente o candidato");
      return;
    }
    
    // [HOMOGENEIZACIÓN] Usar config builder igual que otros flujos
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

    const tipoProducto: TipoProcesoType = mapProcesoConfigToTipoProducto(config);
    
    createProcessMutation.mutate({
      tipoProducto,
      clienteId: parseInt(clienteId),
      candidatoId: parseInt(candidatoId),
      puestoId: puestoId!,
      // [HOMOGENEIZACIÓN] Ahora pasamos clientSiteId - antes era NULL
      clientSiteId: selectedSite ? parseInt(selectedSite) : undefined,
    });
  };
  
  // Helper para mostrar nombre de plaza en resumen
  const getSiteName = () => {
    if (!selectedSite) return "No seleccionada";
    const site = clientSites.find((s: any) => s.id === parseInt(selectedSite));
    return site?.nombrePlaza || `ID: ${selectedSite}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Completar Proceso</h1>
        <p className="text-muted-foreground mt-1">
          Crea el puesto y proceso para el candidato
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            1
          </div>
          <span className="font-medium">Puesto</span>
        </div>
        <ChevronRight className="text-muted-foreground" />
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            2
          </div>
          <span className="font-medium">Proceso</span>
        </div>
      </div>

      <Separator />

      {/* Step 1: Puesto */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Paso 1: Crear Puesto
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
              <div className="flex justify-end">
                <Button type="submit" disabled={createPostMutation.isPending}>
                  Continuar a Proceso
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Proceso */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Paso 2: Crear Proceso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProcessSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* [HOMOGENEIZACIÓN] Selector de Plaza/CEDI agregado */}
                {clientSites.length > 0 && (
                  <div className="col-span-2">
                    <Label className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      Plaza / CEDI
                    </Label>
                    <Select
                      value={selectedSite}
                      onValueChange={setSelectedSite}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una plaza (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientSites.map((site: any) => (
                          <SelectItem key={site.id} value={site.id.toString()}>
                            {site.nombrePlaza}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {/* [HOMOGENEIZACIÓN] Config builder igual que otros flujos - antes era select simple */}
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
                </div>
              </div>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">Resumen del flujo:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Cliente (ID: {clienteId})</li>
                  <li>✓ Candidato (ID: {candidatoId})</li>
                  {/* [HOMOGENEIZACIÓN] Mostrar plaza en resumen */}
                  <li>✓ Plaza: {getSiteName()}</li>
                  <li>✓ Puesto creado (ID: {puestoId})</li>
                  <li>→ Proceso por crear</li>
                </ul>
              </div>
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
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
