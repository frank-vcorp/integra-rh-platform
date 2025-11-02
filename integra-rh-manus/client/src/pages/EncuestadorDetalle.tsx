import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { useParams, Link } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function EncuestadorDetalle() {
  const params = useParams();
  const surveyorId = parseInt(params.id || "0");

  const { data: surveyor } = trpc.surveyors.getById.useQuery({ id: surveyorId }, { enabled: surveyorId > 0 });
  const { data: payments = [] } = trpc.payments.listBySurveyor.useQuery({ encuestadorId: surveyorId }, { enabled: surveyorId > 0 });
  const { data: processes = [] } = trpc.processes.list.useQuery();
  const { data: messages = [] } = trpc.surveyorMessages.listBySurveyor.useQuery({ encuestadorId: surveyorId }, { enabled: surveyorId > 0 });
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<string>("");
  // Filtros de pagos
  const [payStatus, setPayStatus] = useState<'all'|'pendiente'|'pagado'>('all');
  const [payFrom, setPayFrom] = useState<string>('');
  const [payTo, setPayTo] = useState<string>('');
  // Filtros de visitas (leer de query param vstatus)
  const qs = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : undefined;
  const vstatusParam = (qs?.get('vstatus') || 'all') as 'all'|'no_asignada'|'asignada'|'programada'|'realizada';
  const [visitStatus, setVisitStatus] = useState<'all'|'no_asignada'|'asignada'|'programada'|'realizada'>(vstatusParam);
  const [visitFrom, setVisitFrom] = useState<string>('');
  const [visitTo, setVisitTo] = useState<string>('');

  const createPayment = trpc.payments.create.useMutation({
    onSuccess: () => {
      utils.payments.listBySurveyor.invalidate({ encuestadorId: surveyorId });
      setDialogOpen(false);
      setSelectedProcess("");
      toast.success("Pago registrado");
    },
    onError: (e:any)=> toast.error("Error: "+e.message)
  });

  const markPaid = trpc.payments.update.useMutation({
    onSuccess: () => utils.payments.listBySurveyor.invalidate({ encuestadorId: surveyorId })
  });

  const getProcessClave = (procesoId: number) => processes.find((p:any)=> p.id === procesoId)?.clave || "-";
  const formatMoney = (cents: number) => new Intl.NumberFormat('es-MX', { style:'currency', currency:'MXN' }).format(cents/100);

  const filteredPayments = useMemo(()=>{
    const fromTs = payFrom ? new Date(payFrom).getTime() : undefined;
    const toTs = payTo ? new Date(payTo).getTime() : undefined;
    return (payments as any[]).filter(p => {
      if (payStatus !== 'all' && p.estatusPago !== payStatus) return false;
      const ts = p.createdAt ? new Date(p.createdAt).getTime() : 0;
      if (fromTs && ts < fromTs) return false;
      if (toTs && ts > toTs) return false;
      return true;
    });
  }, [payments, payStatus, payFrom, payTo]);

  const totals = useMemo(()=>{
    const sum = (arr:any[]) => arr.reduce((acc, x)=> acc + (x.monto||0), 0);
    const pend = (payments as any[]).filter(p=> p.estatusPago==='pendiente');
    const paid = (payments as any[]).filter(p=> p.estatusPago==='pagado');
    return {
      all: formatMoney(sum(payments as any[])),
      pendiente: formatMoney(sum(pend)),
      pagado: formatMoney(sum(paid)),
    };
  }, [payments]);

  useEffect(() => {
    const section = qs?.get('section');
    if (section === 'visitas') {
      setTimeout(() => {
        document.getElementById('visitas-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, []);

  if (!surveyor) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Encuestador no encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/encuestadores"><Button variant="ghost">Regresar</Button></Link>
        <div>
          <h1 className="text-3xl font-bold">{surveyor.nombre}</h1>
          <p className="text-muted-foreground">{surveyor.email || '-'} {surveyor.telefono ? `• ${surveyor.telefono}` : ''}</p>
          <p className="text-xs text-muted-foreground">Cobertura: {surveyor.cobertura || 'local'} {surveyor.ciudadBase ? `• Base: ${surveyor.ciudadBase}` : ''}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalles del encuestador</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Cobertura</span>
              <div className="font-medium capitalize">{surveyor.cobertura || 'local'}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Ciudad base</span>
              <div className="font-medium">{surveyor.ciudadBase || '-'}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Estados de cobertura</span>
              <div className="font-medium">{Array.isArray(surveyor.estadosCobertura) && surveyor.estadosCobertura.length>0 ? surveyor.estadosCobertura.join(', ') : '-'}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Radio (km)</span>
              <div className="font-medium">{surveyor.radioKm ?? '-'}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Vehículo propio</span>
              <div className="font-medium">{surveyor.vehiculo ? 'Sí' : 'No'}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Tarifa local</span>
              <div className="font-medium">{surveyor.tarifaLocal != null ? new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(surveyor.tarifaLocal/100) : '-'}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Tarifa foránea</span>
              <div className="font-medium">{surveyor.tarifaForanea != null ? new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(surveyor.tarifaForanea/100) : '-'}</div>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Comentarios</span>
              <div className="font-medium whitespace-pre-wrap">{surveyor.notas || '-'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between flex-row">
          <CardTitle>Pagos del encuestador</CardTitle>
          <Button size="sm" onClick={()=> setDialogOpen(true)}>Registrar pago</Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3 mb-4 text-sm">
            <div>
              <Label>Estatus</Label>
              <Select value={payStatus} onValueChange={(v)=> setPayStatus(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="pagado">Pagado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Desde</Label>
              <Input type="date" value={payFrom} onChange={e=> setPayFrom(e.target.value)} />
            </div>
            <div>
              <Label>Hasta</Label>
              <Input type="date" value={payTo} onChange={e=> setPayTo(e.target.value)} />
            </div>
            <div className="flex items-end">
              <div className="text-xs text-muted-foreground">
                Totales • Todos: {totals.all} • Pendiente: {totals.pendiente} • Pagado: {totals.pagado}
              </div>
            </div>
          </div>
          {filteredPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin pagos registrados</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proceso</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estatus</TableHead>
                  <TableHead>Fecha Pago</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((p:any)=> (
                  <TableRow key={p.id}>
                    <TableCell>{getProcessClave(p.procesoId)}</TableCell>
                    <TableCell>{formatMoney(p.monto)}</TableCell>
                    <TableCell>
                      <span className={`badge ${p.estatusPago==='pagado' ? 'badge-success' : 'badge-warning'}`}>{p.estatusPago}</span>
                    </TableCell>
                    <TableCell>{p.fechaPago ? new Date(p.fechaPago).toLocaleString() : '-'}</TableCell>
                    <TableCell className="text-right">
                      {p.estatusPago !== 'pagado' && (
                        <Button size="sm" variant="ghost" onClick={()=> markPaid.mutate({ id: p.id, data: { estatusPago:'pagado', fechaPago: new Date() } })}>Marcar pagado</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card id="visitas-section">
        <CardHeader>
          <CardTitle>Visitas asignadas</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            let visits = (processes as any[]).filter(p => p.visitStatus && (p.visitStatus.encuestadorId === surveyorId));
            // filtros
            if (visitStatus !== 'all') visits = visits.filter(v=> (v.visitStatus?.status || 'no_asignada') === visitStatus);
            const vf = visitFrom ? new Date(visitFrom).getTime() : undefined;
            const vt = visitTo ? new Date(visitTo).getTime() : undefined;
            if (vf) visits = visits.filter(v=> v.visitStatus?.scheduledDateTime && new Date(v.visitStatus.scheduledDateTime).getTime() >= vf);
            if (vt) visits = visits.filter(v=> v.visitStatus?.scheduledDateTime && new Date(v.visitStatus.scheduledDateTime).getTime() <= vt);
            if (visits.length === 0) return <p className="text-sm text-muted-foreground">Sin visitas asignadas</p>;
            return (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-3 text-sm">
                  <div>
                    <Label>Estatus</Label>
                    <Select value={visitStatus} onValueChange={(v)=> setVisitStatus(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="no_asignada">No asignada</SelectItem>
                        <SelectItem value="asignada">Asignada</SelectItem>
                        <SelectItem value="programada">Programada</SelectItem>
                        <SelectItem value="realizada">Realizada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Desde</Label>
                    <Input type="date" value={visitFrom} onChange={e=> setVisitFrom(e.target.value)} />
                  </div>
                  <div>
                    <Label>Hasta</Label>
                    <Input type="date" value={visitTo} onChange={e=> setVisitTo(e.target.value)} />
                  </div>
                </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Clave</TableHead>
                    <TableHead>Fecha/Hora</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead>Estatus</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visits.map((v:any)=> (
                    <TableRow key={v.id}>
                      <TableCell>{v.clave}</TableCell>
                      <TableCell>{v.visitStatus?.scheduledDateTime ? new Date(v.visitStatus.scheduledDateTime).toLocaleString() : '-'}</TableCell>
                      <TableCell className="max-w-md truncate">{v.visitStatus?.direccion || '-'}</TableCell>
                      <TableCell>{v.visitStatus?.status || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mensajes enviados</CardTitle>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin mensajes registrados</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Proceso</TableHead>
                  <TableHead>Contenido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.map((m:any)=> (
                  <TableRow key={m.id}>
                    <TableCell>{new Date(m.createdAt).toLocaleString()}</TableCell>
                    <TableCell className="uppercase text-xs">{m.canal}</TableCell>
                    <TableCell>{m.procesoId || '-'}</TableCell>
                    <TableCell className="max-w-xl truncate" title={m.contenido || ''}>{m.contenido || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" aria-describedby="pago-encuestador-desc">
          <DialogHeader>
            <DialogTitle>Registrar pago a {surveyor.nombre}</DialogTitle>
          </DialogHeader>
          <p id="pago-encuestador-desc" className="sr-only">Formulario para registrar un pago a encuestador específico.</p>
          <div className="space-y-4">
            <div>
              <Label>Proceso</Label>
              <Select value={selectedProcess} onValueChange={setSelectedProcess}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona proceso" />
                </SelectTrigger>
                <SelectContent>
                  {processes.map((proc:any)=> (
                    <SelectItem key={proc.id} value={proc.id.toString()}>{proc.clave}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Monto (MXN)</Label>
              <Input id="monto" type="number" min="0" step="0.01" placeholder="500.00" />
            </div>
            <div>
              <Label>Método de pago</Label>
              <Input id="metodo" placeholder="Transferencia, Efectivo, etc." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={()=> setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={()=>{
                const montoEl = (document.getElementById('monto') as HTMLInputElement|null);
                const metodoEl = (document.getElementById('metodo') as HTMLInputElement|null);
                const monto = montoEl?.value ? Math.round(parseFloat(montoEl.value) * 100) : 0;
                if (!selectedProcess || !monto) { toast.error('Completa proceso y monto'); return; }
                createPayment.mutate({ procesoId: parseInt(selectedProcess), encuestadorId: surveyorId, monto, metodoPago: metodoEl?.value || undefined });
              }}>Registrar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
