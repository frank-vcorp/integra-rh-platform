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
import { Briefcase, FileText, ChevronRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { TIPOS_PROCESO, TipoProcesoType } from "@/lib/constants";
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

  const utils = trpc.useUtils();

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
    createProcessMutation.mutate({
      tipoProducto: formData.get("tipoProducto") as TipoProcesoType,
      clienteId: parseInt(clienteId),
      candidatoId: parseInt(candidatoId),
      puestoId: puestoId!,
    });
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
                <div className="col-span-2">
                  <Label>Proceso a Realizar *</Label>
                  <Select name="tipoProducto" defaultValue="ILA" required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_PROCESO.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">Resumen del flujo:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Cliente (ID: {clienteId})</li>
                  <li>✓ Candidato (ID: {candidatoId})</li>
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
