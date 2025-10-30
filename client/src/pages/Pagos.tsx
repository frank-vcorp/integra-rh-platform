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
import { Plus, DollarSign, Check } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function Pagos() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<string>("");
  const [selectedSurveyor, setSelectedSurveyor] = useState<string>("");

  const { data: payments = [], isLoading } = trpc.payments.list.useQuery();
  const { data: processes = [] } = trpc.processes.list.useQuery();
  const { data: surveyors = [] } = trpc.surveyors.listActive.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.payments.create.useMutation({
    onSuccess: () => {
      utils.payments.list.invalidate();
      setDialogOpen(false);
      setSelectedProcess("");
      setSelectedSurveyor("");
      toast.success("Pago registrado exitosamente");
    },
    onError: (error: any) => {
      toast.error("Error al registrar pago: " + error.message);
    },
  });

  const updateMutation = trpc.payments.update.useMutation({
    onSuccess: () => {
      utils.payments.list.invalidate();
      toast.success("Pago actualizado exitosamente");
    },
    onError: (error: any) => {
      toast.error("Error al actualizar pago: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const montoStr = formData.get("monto") as string;
    const monto = parseFloat(montoStr) * 100; // Convertir a centavos

    const data = {
      procesoId: parseInt(selectedProcess),
      encuestadorId: parseInt(selectedSurveyor),
      monto: Math.round(monto),
      metodoPago: formData.get("metodoPago") as string || undefined,
      observaciones: formData.get("observaciones") as string || undefined,
    };

    createMutation.mutate(data);
  };

  const handleMarkAsPaid = (id: number) => {
    if (confirm("¿Marcar este pago como pagado?")) {
      updateMutation.mutate({ 
        id, 
        data: { 
          estatusPago: "pagado",
          fechaPago: new Date(),
        } 
      });
    }
  };

  const handleOpenDialog = () => {
    setSelectedProcess("");
    setSelectedSurveyor("");
    setDialogOpen(true);
  };

  const getProcessClave = (procesoId: number) => {
    const process = processes.find((p) => p.id === procesoId);
    return process?.clave || "-";
  };

  const getSurveyorName = (encuestadorId: number) => {
    const surveyor = surveyors.find((s) => s.id === encuestadorId);
    return surveyor?.nombre || "-";
  };

  const formatMoney = (centavos: number) => {
    const pesos = centavos / 100;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(pesos);
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
          <h1 className="text-3xl font-bold">Pagos</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los pagos a encuestadores
          </p>
        </div>
        <Button onClick={handleOpenDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Registrar Pago
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Pagos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payments.filter((p) => p.estatusPago === "pendiente").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pagados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payments.filter((p) => p.estatusPago === "pagado").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Lista de Pagos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay pagos registrados</p>
              <Button onClick={handleOpenDialog} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Registrar primer pago
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proceso</TableHead>
                  <TableHead>Encuestador</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Fecha Pago</TableHead>
                  <TableHead>Estatus</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium font-mono">
                      {getProcessClave(payment.procesoId)}
                    </TableCell>
                    <TableCell>{getSurveyorName(payment.encuestadorId)}</TableCell>
                    <TableCell className="font-semibold">
                      {formatMoney(payment.monto)}
                    </TableCell>
                    <TableCell>{payment.metodoPago || "-"}</TableCell>
                    <TableCell>
                      {payment.fechaPago
                        ? new Date(payment.fechaPago).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`badge ${
                          payment.estatusPago === "pagado"
                            ? "badge-success"
                            : "badge-warning"
                        }`}
                      >
                        {payment.estatusPago === "pagado" ? "Pagado" : "Pendiente"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {payment.estatusPago === "pendiente" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsPaid(payment.id)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Marcar como Pagado
                        </Button>
                      )}
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
            <DialogTitle>Registrar Pago</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="procesoId">Proceso *</Label>
                <Select value={selectedProcess} onValueChange={setSelectedProcess}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un proceso" />
                  </SelectTrigger>
                  <SelectContent>
                    {processes.map((process) => (
                      <SelectItem key={process.id} value={process.id.toString()}>
                        {process.clave}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="encuestadorId">Encuestador *</Label>
                <Select value={selectedSurveyor} onValueChange={setSelectedSurveyor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un encuestador" />
                  </SelectTrigger>
                  <SelectContent>
                    {surveyors.map((surveyor) => (
                      <SelectItem key={surveyor.id} value={surveyor.id.toString()}>
                        {surveyor.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="monto">Monto (MXN) *</Label>
                  <Input
                    id="monto"
                    name="monto"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="500.00"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Ingresa el monto en pesos mexicanos
                  </p>
                </div>
                <div>
                  <Label htmlFor="metodoPago">Método de Pago</Label>
                  <Input
                    id="metodoPago"
                    name="metodoPago"
                    placeholder="Transferencia, Efectivo, etc."
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea
                  id="observaciones"
                  name="observaciones"
                  rows={3}
                  placeholder="Notas adicionales sobre el pago..."
                />
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
                  !selectedProcess ||
                  !selectedSurveyor
                }
              >
                Registrar Pago
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
