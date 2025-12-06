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
import { Plus, DollarSign, Check, Upload, FileDown } from "lucide-react";
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
import { useHasPermission } from "@/_core/hooks/usePermission";

export default function Pagos() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [reportFrom, setReportFrom] = useState<string>("");
  const [reportTo, setReportTo] = useState<string>("");
  const [periodo, setPeriodo] = useState<'dia'|'semana'|'mes'>("mes");
  const [selectedProcess, setSelectedProcess] = useState<string>("");
  const [selectedSurveyor, setSelectedSurveyor] = useState<string>("");

  const { data: payments = [], isLoading } = trpc.payments.list.useQuery();
  const { data: processes = [] } = trpc.processes.list.useQuery();
  const { data: surveyors = [] } = trpc.surveyors.list.useQuery(undefined, { initialData: [] } as any);
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

  // Helpers import CSV + report
  const findProcessId = (row: Record<string,string>) => {
    const pid = row.procesoId || row.proceso_id || row.proceso;
    const clave = row.procesoClave || row.clave || row.proceso_clave;
    if (pid && /^\d+$/.test(pid)) return parseInt(pid,10);
    if (clave) {
      const p = (processes as any[]).find((p:any)=> String(p.clave).toLowerCase() === clave.toLowerCase());
      if (p) return p.id;
    }
    return undefined;
  };
  const findSurveyorId = (row: Record<string,string>) => {
    const sid = row.encuestadorId || row.encuestador_id || row.encuestador;
    const nombre = row.encuestadorNombre || row.encuestador_nombre || row.encuestador;
    if (sid && /^\d+$/.test(sid)) return parseInt(sid,10);
    if (nombre) {
      const s = (surveyors as any[]).find((s:any)=> String(s.nombre).toLowerCase() === nombre.toLowerCase());
      if (s) return s.id;
    }
    return undefined;
  };
  const parseCsv = (text: string) => {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return [] as any[];
    const headers = lines[0].split(',').map(h=> h.trim());
    return lines.slice(1).map(l=> {
      const cols = l.split(',');
      const obj: Record<string,string> = {};
      headers.forEach((h, i)=> obj[h] = (cols[i] ?? '').trim());
      return obj;
    });
  };
  const importFromFile = async (file: File) => {
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length === 0) { toast.error('CSV vacío'); return; }
    let ok = 0, fail = 0;
    for (const row of rows) {
      try {
        const procesoId = findProcessId(row);
        const encuestadorId = findSurveyorId(row);
        const montoStr = row.monto || row.amount || '0';
        const metodoPago = row.metodoPago || row.metodo || undefined;
        const observaciones = row.observaciones || row.nota || undefined;
        const estatusPago = (row.estatusPago || row.estatus || 'pendiente').toLowerCase();
        const fechaPagoStr = row.fechaPago || row.fecha || '';
        if (!procesoId || !encuestadorId) { throw new Error('No se resolvió procesoId/encuestadorId'); }
        const monto = Math.round(parseFloat(montoStr) * 100);
        const res = await createMutation.mutateAsync({ procesoId, encuestadorId, monto, metodoPago, observaciones } as any);
        if (estatusPago === 'pagado' || fechaPagoStr) {
          await updateMutation.mutateAsync({ id: (res as any).id, data: { estatusPago: 'pagado', fechaPago: fechaPagoStr ? new Date(fechaPagoStr) : new Date(), metodoPago, observaciones } as any });
        }
        ok++;
      } catch (e:any) {
        console.error('[import pago] row failed', row, e);
        fail++;
      }
    }
    await utils.payments.list.invalidate();
    toast.success(`Importación finalizada: ${ok} ok, ${fail} fallidos`);
    setImportOpen(false);
  };
  const startOfWeek = (d: Date) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = date.getUTCDay() || 7; if (day !== 1) date.setUTCDate(date.getUTCDate() - (day - 1));
    return date;
  };
  const periodKey = (d: Date) => {
    const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const day = String(d.getDate()).padStart(2,'0');
    if (periodo === 'dia') return `${y}-${m}-${day}`;
    if (periodo === 'mes') return `${y}-${m}`;
    const wk = startOfWeek(d); const wm = String(wk.getMonth()+1).padStart(2,'0'); const wd = String(wk.getDate()).padStart(2,'0');
    return `${wk.getFullYear()}-W(${wm}-${wd})`;
  };
  const filteredForReport = (payments as any[]).filter(p=> {
    const ts = p.createdAt ? new Date(p.createdAt).getTime() : 0;
    const from = reportFrom ? new Date(reportFrom).getTime() : undefined;
    const to = reportTo ? new Date(reportTo).getTime() : undefined;
    if (from && ts < from) return false; if (to && ts > to) return false; return true;
  });
  const grouped = (()=>{
    const map = new Map<string,{ total:number, count:number }>();
    for (const p of filteredForReport) { const k = periodKey(new Date(p.createdAt)); const e = map.get(k) || { total:0, count:0 }; e.total += p.monto||0; e.count += 1; map.set(k,e); }
    return Array.from(map.entries()).sort((a,b)=> a[0] < b[0] ? -1 : 1);
  })();

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

  const canCreatePayment = useHasPermission("pagos", "create");
  const canEditPayment = useHasPermission("pagos", "edit");

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
          <h1 className="text-3xl font-bold">Pago a encuestadores</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los pagos a encuestadores
          </p>
        </div>
        <div className="flex gap-2">
          {canCreatePayment && (
            <Button variant="outline" onClick={()=> setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" /> Importar pagos
            </Button>
          )}
          <Button variant="outline" onClick={()=>{
            // Hoja 1: Detalle
            const detalle = (payments as any[]).map(p=> ({
              Proceso: getProcessClave(p.procesoId),
              Encuestador: getSurveyorName(p.encuestadorId),
              Monto_MXN: (p.monto/100).toFixed(2),
              Metodo: p.metodoPago || '',
              FechaPago: p.fechaPago ? new Date(p.fechaPago).toISOString().slice(0,10) : '',
              Estatus: p.estatusPago,
              Creado: p.createdAt ? new Date(p.createdAt).toISOString().slice(0,19).replace('T',' ') : '',
            }));
            const ws1 = XLSX.utils.json_to_sheet(detalle);

            // Hoja 2: Agregado por periodo y rango (usa filtros actuales)
            const agg = grouped.map(([k,v])=> ({ Periodo: k, Total_MXN: (v.total/100).toFixed(2), Cantidad: v.count }));
            const ws2 = XLSX.utils.json_to_sheet(agg);

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws1, 'Detalle');
            XLSX.utils.book_append_sheet(wb, ws2, `Reporte_${periodo}`);
            XLSX.writeFile(wb, 'pagos.xlsx');
          }}>
            <FileDown className="h-4 w-4 mr-2" /> Exportar XLSX
          </Button>
          {canCreatePayment && (
            <Button onClick={handleOpenDialog}>
              <Plus className="h-4 w-4 mr-2" /> Registrar Pago
            </Button>
          )}
        </div>
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
              {canCreatePayment && (
                <Button onClick={handleOpenDialog} variant="outline" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar primer pago
                </Button>
              )}
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
                      {payment.estatusPago === "pendiente" && canEditPayment && (
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
        <DialogContent className="max-w-2xl" aria-describedby="pago-desc">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
          </DialogHeader>
          <p id="pago-desc" className="sr-only">Formulario para registrar un pago a encuestadores por proceso.</p>
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
                    {surveyors.map((surveyor: any) => (
                      <SelectItem key={surveyor.id} value={surveyor.id.toString()} disabled={!surveyor.activo}>
                        {surveyor.nombre}{!surveyor.activo ? " (inactivo)" : ""}
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
      {/* Importar pagos */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-xl" aria-describedby="import-desc">
          <DialogHeader>
            <DialogTitle>Importar pagos (CSV)</DialogTitle>
          </DialogHeader>
          <p id="import-desc" className="text-sm text-muted-foreground">Sube un archivo CSV con columnas: procesoClave | procesoId, encuestadorId | encuestadorNombre, monto, estatusPago[pagado|pendiente], fechaPago[YYYY-MM-DD], metodoPago, observaciones.</p>
          <div className="space-y-3">
            <input type="file" accept=".csv,text/csv" onChange={(e)=>{ const f=e.target.files?.[0]; if (f) importFromFile(f); }} />
            <div className="text-xs text-muted-foreground">Se resolverán proceso y encuestador por clave/nombre si no se proporcionan IDs.</div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import * as XLSX from 'xlsx';

