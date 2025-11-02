import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, FileText, Save, FilePlus2, CalendarClock } from "lucide-react";
import { Link, useParams } from "wouter";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { useState } from "react";

export default function ProcesoDetalle() {
  const params = useParams();
  const processId = parseInt(params.id || "0");
  const { data: process, isLoading } = trpc.processes.getById.useQuery({ id: processId });
  const { isClientAuth } = useClientAuth();
  const utils = trpc.useUtils();
  const updateStatus = trpc.processes.updateStatus.useMutation({
    onSuccess: () => {
      utils.processes.getById.invalidate({ id: processId });
    }
  });
  const updateCalif = trpc.processes.updateCalificacion.useMutation({
    onSuccess: () => utils.processes.getById.invalidate({ id: processId }),
  });
  const genDictamen = trpc.processes.generarDictamen.useMutation({
    onSuccess: () => utils.processes.getById.invalidate({ id: processId }),
  });
  // Llamar hooks siempre en el mismo orden. Evitar condicionales.
  const { data: surveyors = [] } = trpc.surveyors.listActive.useQuery(undefined as any, {
    // initialData asegura data consistente mientras carga
    initialData: [],
  } as any);
  const visitAssign = trpc.processes.visitAssign.useMutation({ onSuccess: () => utils.processes.getById.invalidate({ id: processId }) });
  const visitSchedule = trpc.processes.visitSchedule.useMutation({ onSuccess: () => utils.processes.getById.invalidate({ id: processId }) });
  const visitUpdate = trpc.processes.visitUpdate.useMutation({ onSuccess: () => utils.processes.getById.invalidate({ id: processId }) });
  const visitDone = trpc.processes.visitMarkDone.useMutation({ onSuccess: () => utils.processes.getById.invalidate({ id: processId }) });
  const visitCancel = trpc.processes.visitCancel.useMutation({ onSuccess: () => utils.processes.getById.invalidate({ id: processId }) });
  const [visitForm, setVisitForm] = useState<{ encuestadorId: string; fechaHora: string; direccion: string; observaciones: string }>({ encuestadorId: "", fechaHora: "", direccion: "", observaciones: "" });
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifySelected, setNotifySelected] = useState<number[]>([]);
  const [suggested, setSuggested] = useState<any[]>([]);
  const getSurveyor = (id?: number) => surveyors.find((s: any) => s.id === id);
  const getCandidate = () => candidates.find((c:any)=> c.id === process?.candidatoId);
  const getClient = () => clients.find((c:any)=> c.id === process?.clienteId);
  const buildMapsUrl = (address?: string) => address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : '';
  const buildVisitMessage = (opts: { encNombre?: string; procesoClave: string; tipo: string; cliente?: any; candidato?: any; fechaISO?: string; direccion?: string; observaciones?: string; puestoNombre?: string; }) => {
    const fecha = opts.fechaISO ? new Date(opts.fechaISO).toLocaleString() : 'Por confirmar';
    const line = (k:string,v?:string)=> v? `\n- ${k}: ${v}`: '';
    const maps = buildMapsUrl(opts.direccion);
    return (
      `Hola ${opts.encNombre || ''}, te comparto los datos para la visita:` +
      line('Proceso', `${opts.procesoClave} (${opts.tipo})`) +
      line('Cliente', opts.cliente?.nombreEmpresa) +
      line('Contacto cliente', opts.cliente?.contacto) +
      line('Tel. cliente', opts.cliente?.telefono) +
      line('Candidato', opts.candidato?.nombreCompleto) +
      line('Tel. candidato', opts.candidato?.telefono) +
      line('Email candidato', opts.candidato?.email) +
      line('Puesto', opts.puestoNombre) +
      line('Fecha/Hora', fecha) +
      line('Dirección', opts.direccion) +
      (maps ? `\n- Maps: ${maps}` : '') +
      line('Observaciones', opts.observaciones) +
      `\n\nGracias.`
    );
  };
  const formatDateForCal = (dt: string) => {
    const d = new Date(dt);
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = d.getUTCFullYear();
    const mm = pad(d.getUTCMonth() + 1);
    const dd = pad(d.getUTCDate());
    const hh = pad(d.getUTCHours());
    const mi = pad(d.getUTCMinutes());
    const ss = pad(d.getUTCSeconds());
    return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
  };
  const buildGoogleCalendarUrl = (title: string, startISO: string, durationMinutes: number, details: string, location?: string) => {
    const start = formatDateForCal(startISO);
    const end = formatDateForCal(new Date(new Date(startISO).getTime() + durationMinutes*60000).toISOString());
    const params = new URLSearchParams({ text: title, dates: `${start}/${end}`, details, location: location || '' });
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&${params.toString()}`;
  };
  const buildICS = (title: string, startISO: string, durationMinutes: number, details: string, location?: string) => {
    const dtStart = formatDateForCal(startISO);
    const dtEnd = formatDateForCal(new Date(new Date(startISO).getTime() + durationMinutes*60000).toISOString());
    const uid = `visita-${Date.now()}@integra-rh`;
    return [
      'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Integra RH//Visitas//ES','BEGIN:VEVENT',
      `UID:${uid}`,`DTSTAMP:${dtStart}`,`DTSTART:${dtStart}`,`DTEND:${dtEnd}`,
      `SUMMARY:${title}`,`DESCRIPTION:${details.replace(/\n/g, '\\n')}`,
      location ? `LOCATION:${location}` : '',
      'END:VEVENT','END:VCALENDAR']
      .filter(Boolean).join('\r\n');
  };
  const buildWhatsappUrl = (phone: string, text: string) => {
    const digits = phone.replace(/[^0-9+]/g, '');
    return `https://api.whatsapp.com/send?phone=${encodeURIComponent(digits)}&text=${encodeURIComponent(text)}`;
  };
  const extractStateTokens = (addr?: string) => {
    if (!addr) return [] as string[];
    const txt = addr.toLowerCase();
    const tokens = [
      'ags','aguascalientes','bc','baja california','bcs','baja california sur','camp','campeche','coah','coahuila','col','colima','chis','chiapas','chih','chihuahua','cdmx','ciudad de mexico','dgo','durango','gto','guanajuato','gro','guerrero','hgo','hidalgo','jal','jalisco','mex','edomex','estado de mexico','mich','michoacan','mor','morelos','nay','nayarit','nl','nuevo leon','oax','oaxaca','pue','puebla','qro','queretaro','q roo','quintana roo','slp','san luis potosi','sin','sinaloa','son','sonora','tab','tabasco','tamps','tamaulipas','tlax','tlaxcala','ver','veracruz','yuc','yucatan','zac','zacatecas'
    ];
    return tokens.filter(t => txt.includes(t));
  };
  const scoreSurveyor = (addr: string, s: any) => {
    const a = (addr || '').toLowerCase();
    let score = 0;
    if (s.ciudadBase && a.includes(String(s.ciudadBase).toLowerCase())) score += 50;
    const addrStates = new Set(extractStateTokens(addr));
    const states: string[] = Array.isArray(s.estadosCobertura) ? s.estadosCobertura : [];
    if (states.some((st: string)=> addrStates.has(st.toLowerCase()))) score += 30;
    if (s.cobertura === 'local' && s.ciudadBase && a.includes(String(s.ciudadBase).toLowerCase())) score += 20;
    if (s.cobertura === 'foraneo' && (!s.ciudadBase || !a.includes(String(s.ciudadBase).toLowerCase()))) score += 10;
    if (s.vehiculo) score += 5;
    return score;
  };
  const refreshSuggestions = (addr?: string) => {
    const address = addr ?? visitForm.direccion;
    if (!address) { setSuggested([]); return; }
    const arr = [...surveyors].map(s => ({ s, score: scoreSurveyor(address, s) }))
      .sort((x,y)=> y.score - x.score)
      .filter(x=> x.score > 0)
      .slice(0,5)
      .map(x=> x.s);
    setSuggested(arr);
  };
  const ESTATUS = [
    { value: 'en_recepcion', label: 'En recepción' },
    { value: 'asignado', label: 'Asignado' },
    { value: 'en_verificacion', label: 'En verificación' },
    { value: 'visita_programada', label: 'Visita programada' },
    { value: 'visita_realizada', label: 'Visita realizada' },
    { value: 'en_dictamen', label: 'En dictamen' },
    { value: 'finalizado', label: 'Finalizado' },
    { value: 'entregado', label: 'Entregado' },
  ];
  const CALIF = [
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'recomendable', label: 'Recomendable' },
    { value: 'con_reservas', label: 'Con reservas' },
    { value: 'no_recomendable', label: 'No recomendable' },
  ];
  const { data: clients = [] } = trpc.clients.list.useQuery();
  const { data: candidates = [] } = trpc.candidates.list.useQuery();
  const { data: posts = [] } = trpc.posts.list.useQuery();
  const { data: documents = [] } = trpc.documents.getByProcess.useQuery({ procesoId: processId });
  const createClientLink = trpc.clientAccess.create.useMutation({
    onSuccess: (res:any) => {
      const url = res.url;
      try { navigator.clipboard?.writeText(url); } catch {}
      toast.success('Enlace de acceso generado y copiado');
    },
    onError: (e:any)=> toast.error('Error: '+e.message)
  });
  const revokeClientLink = trpc.clientAccess.revoke.useMutation({
    onSuccess: () => {
      if (process?.clienteId) {
        utils.clientAccess.listActiveTokens.invalidate({ clientId: process.clienteId });
      }
      toast.success('Enlace revocado');
    },
  });
  const { data: activeTokens = [] } = trpc.clientAccess.listActiveTokens.useQuery(
    { clientId: process?.clienteId ?? 0 } as any,
    {
      enabled: Boolean(process?.clienteId),
      initialData: [],
    } as any
  );

  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const uploadProcessDoc = trpc.documents.upload.useMutation({
    onSuccess: () => {
      utils.documents.getByProcess.invalidate({ procesoId: processId });
      toast.success('Documento del proceso cargado');
    }
  });
  const deleteDoc = trpc.documents.delete.useMutation({
    onSuccess: () => utils.documents.getByProcess.invalidate({ procesoId: processId })
  });
  const { data: comments = [] } = trpc.processComments.getByProcess.useQuery({ procesoId: processId });
  const createComment = trpc.processComments.create.useMutation({
    onSuccess: () => {
      utils.processComments.getByProcess.invalidate({ procesoId: processId });
      setCommentOpen(false);
      (document.getElementById('form-proceso-comentario') as HTMLFormElement | null)?.reset();
      toast.success('Comentario agregado');
    },
    onError: (e:any) => toast.error('Error: '+e.message),
  });
  const [commentOpen, setCommentOpen] = useState(false);

  const findName = (id: number | null | undefined, arr: any[], field: string) => {
    if (!id) return "-";
    const item = arr.find(x => x.id === id);
    return item?.[field] || "-";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  if (!process) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Proceso no encontrado</p>
        <Link href="/procesos">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Volver a Procesos
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/procesos">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Proceso {process.clave}</h1>
          <p className="text-muted-foreground mt-1">Detalle del proceso</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Proceso a realizar</p>
              <p className="font-medium">{process.tipoProducto}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Medio de recepción</p>
              <p className="font-medium">{process.medioDeRecepcion || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Calificación final</p>
              <div className="flex items-center gap-2">
                <select id="calificacionFinal" defaultValue={process.calificacionFinal || 'pendiente'} className="border rounded-md h-9 px-2">
                  {CALIF.map(c => (<option key={c.value} value={c.value}>{c.label}</option>))}
                </select>
                <Button size="sm" disabled={updateCalif.isPending} onClick={()=>{
                  const el = document.getElementById('calificacionFinal') as HTMLSelectElement | null;
                  const v = (el?.value || 'pendiente') as any;
                  updateCalif.mutate({ id: processId, calificacionFinal: v });
                }}>
                  <Save className="h-4 w-4 mr-1"/> Guardar
                </Button>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estatus</p>
              <div className="flex items-center gap-2">
                <select
                  defaultValue={process.estatusProceso}
                  id="estatusProceso"
                  className="border rounded-md h-9 px-2"
                >
                  {ESTATUS.map(e => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  disabled={updateStatus.isPending}
                  onClick={() => {
                    const el = document.getElementById('estatusProceso') as HTMLSelectElement | null;
                    const value = el?.value || process.estatusProceso;
                    updateStatus.mutate({ id: processId, estatusProceso: value });
                  }}
                >
                  <Save className="h-4 w-4 mr-1"/> Guardar
                </Button>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cliente</p>
              <p className="font-medium">{findName(process.clienteId, clients, 'nombreEmpresa')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Candidato</p>
              <p className="font-medium">{findName(process.candidatoId, candidates, 'nombreCompleto')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Puesto</p>
              <p className="font-medium">{findName(process.puestoId, posts, 'nombreDelPuesto')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fecha Recepción</p>
              <p className="font-medium">{new Date(process.fechaRecepcion).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visitas */}
      <Card>
        <CardHeader className="flex items-center justify-between flex-row">
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5"/> Visitas domiciliarias
          </CardTitle>
          {!isClientAuth && (
            <Button size="sm" variant="outline" onClick={()=>{
              // Preseleccionar todos los encuestadores activos
              setNotifySelected(surveyors.map((s:any)=> s.id));
              setNotifyOpen(true);
            }}>Avisar encuestadores</Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Estatus: {process.visitStatus?.status || 'no_asignada'}
              {process.visitStatus?.scheduledDateTime && ` • ${new Date(process.visitStatus.scheduledDateTime).toLocaleString()}`}
              {process.visitStatus?.encuestadorId && (()=>{ const s = getSurveyor(process.visitStatus?.encuestadorId); return s ? ` • Encuestador: ${s.nombre}` : '' })()}
              {process.visitStatus?.direccion && ` • ${process.visitStatus.direccion}`}
            </div>
            {!isClientAuth && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Encuestador</Label>
                <select className="mt-1 block w-full border rounded-md h-9 px-2" value={visitForm.encuestadorId} onChange={e=>setVisitForm(f=>({ ...f, encuestadorId: e.target.value }))}>
                  <option value="">Selecciona encuestador</option>
                  {surveyors.map((s:any)=> (<option key={s.id} value={s.id}>{s.nombre}{s.telefono ? ` — ${s.telefono}` : ''}</option>))}
                </select>
                <div className="mt-2 text-xs text-muted-foreground">
                  Sugeridos por cercanía: {suggested.length === 0 ? '—' : suggested.map((s:any, idx:number)=> (
                    <button key={s.id} className="underline mr-2" onClick={(e)=>{ e.preventDefault(); setVisitForm(f=>({ ...f, encuestadorId: String(s.id) })); }}>{s.nombre}{idx < suggested.length-1 ? ',' : ''}</button>
                  ))}
                  <Button size="xs" variant="link" onClick={()=> refreshSuggestions()}>(Actualizar)</Button>
                </div>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" disabled={!visitForm.encuestadorId || visitAssign.isPending} onClick={()=>{
                    visitAssign.mutate({ id: processId, encuestadorId: parseInt(visitForm.encuestadorId) });
                  }}>Asignar</Button>
                </div>
              </div>
              <div>
                <Label>Fecha y hora</Label>
                <Input type="datetime-local" value={visitForm.fechaHora} onChange={e=>setVisitForm(f=>({ ...f, fechaHora: e.target.value }))} />
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button size="sm" disabled={!visitForm.encuestadorId || !visitForm.fechaHora || visitSchedule.isPending} onClick={()=>{
                    visitSchedule.mutate({ id: processId, fechaHora: new Date(visitForm.fechaHora).toISOString(), direccion: visitForm.direccion || undefined, observaciones: visitForm.observaciones || undefined, encuestadorId: parseInt(visitForm.encuestadorId) });
                  }}>Programar</Button>
                  <Button size="sm" variant="outline" disabled={visitUpdate.isPending || !visitForm.fechaHora} onClick={()=>{
                    visitUpdate.mutate({ id: processId, fechaHora: new Date(visitForm.fechaHora).toISOString(), direccion: visitForm.direccion || undefined, observaciones: visitForm.observaciones || undefined });
                  }}>Reagendar</Button>
                </div>
              </div>
              <div className="col-span-2">
                <Label>Dirección</Label>
                <Input value={visitForm.direccion} onChange={e=>{ const v=e.target.value; setVisitForm(f=>({ ...f, direccion: v })); }} onBlur={()=> refreshSuggestions()} placeholder="Calle, número, colonia, ciudad, estado" />
              </div>
              <div className="col-span-2">
                <Label>Observaciones</Label>
                <Textarea value={visitForm.observaciones} onChange={e=>setVisitForm(f=>({ ...f, observaciones: e.target.value }))} placeholder="Notas opcionales" />
              </div>
              <div className="col-span-2 flex gap-2">
                <Button size="sm" variant="secondary" disabled={visitDone.isPending} onClick={()=> visitDone.mutate({ id: processId, observaciones: visitForm.observaciones || undefined })}>Marcar realizada</Button>
                <Button size="sm" variant="destructive" disabled={visitCancel.isPending} onClick={()=>{
                  if (confirm('¿Cancelar visita?')) visitCancel.mutate({ id: processId, motivo: 'Cancelada desde Proceso' });
                }}>Cancelar</Button>
              </div>
            </div>
            )}
            {process.visitStatus?.scheduledDateTime && (
              <div className="pt-2 border-t">
                <div className="text-sm font-medium mb-2">Compartir</div>
                <div className="flex gap-2">
                  {(() => {
                    const enc = getSurveyor(process.visitStatus?.encuestadorId);
                    const title = `Visita: ${process.clave}`;
                    const details = `Proceso: ${process.tipoProducto}\nEncuestador: ${enc?.nombre || ''}`;
                    const gUrl = buildGoogleCalendarUrl(title, process.visitStatus?.scheduledDateTime, 60, details, process.visitStatus?.direccion);
                    return (
                      <>
                        {enc?.telefono && (
                          <Button size="sm" variant="outline" onClick={()=>{
                            const cand = getCandidate();
                            const cli = getClient();
                            const puesto = posts.find((p:any)=> p.id === process.puestoId)?.nombreDelPuesto;
                            const msg = buildVisitMessage({
                              encNombre: enc.nombre,
                              procesoClave: process.clave,
                              tipo: process.tipoProducto,
                              cliente: cli,
                              candidato: cand,
                              fechaISO: process.visitStatus?.scheduledDateTime,
                              direccion: process.visitStatus?.direccion,
                              observaciones: process.visitStatus?.observaciones,
                              puestoNombre: puesto,
                            });
                            try { trpc.surveyorMessages.create.mutate({ encuestadorId: enc.id, procesoId: process.id, canal: 'whatsapp', contenido: msg } as any); } catch {}
                            window.open(buildWhatsappUrl(enc.telefono, msg), '_blank');
                          }}>WhatsApp</Button>
                        )}
                        <Button size="sm" variant="outline" onClick={()=> window.open(gUrl, '_blank')}>Google Calendar</Button>
                        <Button size="sm" variant="outline" onClick={()=>{
                          const ics = buildICS(title, process.visitStatus?.scheduledDateTime, 60, details, process.visitStatus?.direccion);
                          const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `visita-${process.clave}.ics`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}>Descargar .ics</Button>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Aviso a encuestadores */}
      {!isClientAuth && (
      <Dialog open={notifyOpen} onOpenChange={setNotifyOpen}>
        <DialogContent className="max-w-2xl" aria-describedby="notify-desc">
          <DialogHeader>
            <DialogTitle>Avisar encuestadores de cita disponible</DialogTitle>
          </DialogHeader>
          <p id="notify-desc" className="sr-only">Selecciona encuestadores y envía un mensaje por WhatsApp con los datos de la visita.</p>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground mb-2">Seleccionar encuestadores</div>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-auto border rounded p-2">
                {surveyors.map((s:any)=> (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={notifySelected.includes(s.id)}
                      onChange={(e)=>{
                        setNotifySelected(prev=> e.target.checked ? [...new Set([...prev, s.id])] : prev.filter(id=> id!==s.id));
                      }}
                    />
                    <span>{s.nombre}{s.telefono ? ` — ${s.telefono}` : ''}</span>
                  </label>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={()=> setNotifySelected(surveyors.map((s:any)=> s.id))}>Seleccionar todos</Button>
                <Button size="sm" variant="outline" onClick={()=> setNotifySelected([])}>Limpiar</Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="outline" onClick={()=> setNotifyOpen(false)}>Cerrar</Button>
              <Button onClick={()=>{
                if (!process) return;
                const cand = getCandidate();
                const cli = getClient();
                const puesto = posts.find((p:any)=> p.id === process.puestoId)?.nombreDelPuesto;
                const fechaISO = process.visitStatus?.scheduledDateTime; // puede ser undefined
                const msgBase = (encNombre?: string) => buildVisitMessage({
                  encNombre,
                  procesoClave: process.clave,
                  tipo: process.tipoProducto,
                  cliente: cli,
                  candidato: cand,
                  fechaISO,
                  direccion: process.visitStatus?.direccion,
                  observaciones: process.visitStatus?.observaciones,
                  puestoNombre: puesto,
                }) + "\n¿Puedes atenderla?";

                const targets = surveyors.filter((s:any)=> notifySelected.includes(s.id) && s.telefono);
                if (targets.length === 0) { return; }
                // Abrir pestañas de WhatsApp (el navegador puede bloquear múltiples; el usuario puede permitirlas)
                targets.forEach((s:any, idx:number)=> {
                  setTimeout(()=> {
                    const url = buildWhatsappUrl(s.telefono, msgBase(s.nombre));
                    window.open(url, '_blank');
                  }, idx * 200);
                });
              }}>Enviar WhatsApp</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      )}

      <Card>
        <CardHeader className="flex items-center justify-between flex-row">
          <CardTitle>Documentos</CardTitle>
          {process?.clienteId && !isClientAuth && (
            <>
              <Button size="sm" variant="outline" onClick={()=>{
                setEmailTo("");
                setEmailDialogOpen(true);
              }}>Generar enlace de acceso</Button>
              <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Enviar enlace de acceso al cliente</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="emailTo">Correo del cliente</Label>
                      <Input id="emailTo" type="email" value={emailTo} onChange={e=>setEmailTo(e.target.value)} placeholder="cliente@empresa.com" />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={()=>setEmailDialogOpen(false)}>Cancelar</Button>
                      <Button onClick={()=>{
                        const baseUrl = window.location.origin;
                        createClientLink.mutate({
                          clientId: process!.clienteId!,
                          procesoId: processId,
                          ttlDays: 14,
                          baseUrl,
                          sendEmailTo: emailTo || undefined,
                          emailContext: { claveProceso: process?.clave }
                        } as any);
                        setEmailDialogOpen(false);
                      }}>Generar y enviar</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </CardHeader>
        <CardContent>
          {!isClientAuth && (
          <form onSubmit={async (e)=>{
            e.preventDefault();
            const fd = new FormData(e.currentTarget as HTMLFormElement);
            const file = fd.get('file') as File | null;
            const tipo = (fd.get('tipoDocumento') as string) || 'OTRO';
            if (!file) return;
            const arrayBuf = await file.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuf)));
            uploadProcessDoc.mutate({ procesoId: processId, tipoDocumento: tipo, fileName: file.name, contentType: file.type || 'application/octet-stream', base64 } as any);
            (e.currentTarget as HTMLFormElement).reset();
          }} className="space-y-2 mb-4">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-sm text-muted-foreground" htmlFor="tipoDocumento">Tipo</label>
                <select name="tipoDocumento" id="tipoDocumento" className="mt-1 block w-full border rounded-md h-9 px-2">
                  <option value="DICTAMEN">Dictamen</option>
                  <option value="VISITA_EVIDENCIA">Evidencia de visita</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm text-muted-foreground" htmlFor="file">Archivo</label>
                <input type="file" name="file" id="file" className="mt-1 block w-full" required />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={uploadProcessDoc.isPending}>Subir</Button>
            </div>
          </form>
          )}

          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin documentos</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Archivo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((d:any) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.tipoDocumento}</TableCell>
                    <TableCell>
                      <a href={d.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600">
                        <FileText className="h-4 w-4"/> {d.nombreArchivo}
                      </a>
                    </TableCell>
                    <TableCell>{new Date(d.createdAt).toLocaleString()}</TableCell>
                    {!isClientAuth && (
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={()=> deleteDoc.mutate({ id: d.id })}>Eliminar</Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

    </div>
  );
}




