import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Visitas() {
  const { user } = useAuth();
  const isClient = user?.role === "client";
  const utils = trpc.useUtils();
  const { data: visits = [] } = trpc.processes.listVisits.useQuery();
  const { data: surveyors = [] } = trpc.surveyors.listActive.useQuery(undefined, { initialData: [] });
  const { data: clients = [] } = trpc.clients.list.useQuery();
  const { data: candidates = [] } = trpc.candidates.list.useQuery();
  const { data: processes = [] } = trpc.processes.list.useQuery();
  const [selected, setSelected] = useState<Date | undefined>(new Date());
  const [surveyorFilter, setSurveyorFilter] = useState<string>("");
  const [clientFilter, setClientFilter] = useState<string>("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [mode, setMode] = useState<"schedule"|"update">("schedule");
  const [form, setForm] = useState<{ procesoId: string; encuestadorId: string; fechaHora: string; direccion: string; observaciones: string }>({ procesoId: "", encuestadorId: "", fechaHora: "", direccion: "", observaciones: "" });
  const [suggested, setSuggested] = useState<any[]>([]);
  const [lastScheduled, setLastScheduled] = useState<any | null>(null);

  const scheduleMutation = trpc.processes.visitSchedule.useMutation({
    onSuccess: async (_res, vars) => {
      await utils.processes.listVisits.invalidate();
      toast.success("Visita programada");
      const proc = processes.find((p: any) => p.id === parseInt(vars.id as unknown as string));
      const enc = surveyors.find((s: any) => s.id === parseInt(vars.encuestadorId as unknown as string));
      setLastScheduled({ proc, enc, fechaHora: vars.fechaHora, direccion: vars.direccion, observaciones: vars.observaciones });
    },
    onError: (e) => toast.error("Error al programar: " + e.message),
  });
  const updateMutation = trpc.processes.visitUpdate.useMutation({
    onSuccess: async () => {
      await utils.processes.listVisits.invalidate();
      toast.success("Visita reagendada");
    },
    onError: (e) => toast.error("Error al reagendar: " + e.message),
  });
  const cancelMutation = trpc.processes.visitCancel.useMutation({
    onSuccess: async () => {
      await utils.processes.listVisits.invalidate();
      toast.success("Visita cancelada");
    },
    onError: (e) => toast.error("Error al cancelar: " + e.message),
  });

  const byDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    (visits || [])
      .filter((v:any)=> !surveyorFilter || v.visitStatus?.encuestadorId === parseInt(surveyorFilter))
      .filter((v:any)=> !clientFilter || v.clienteId === parseInt(clientFilter))
      .forEach((v:any)=>{
      const d = v.visitStatus?.scheduledDateTime ? new Date(v.visitStatus.scheduledDateTime) : undefined;
      if (!d) return;
      const key = d.toISOString().slice(0,10);
      map[key] = map[key] || [];
      map[key].push(v);
    });
    return map;
  }, [visits, surveyorFilter, clientFilter]);

  const modifiers = {
    hasVisit: Object.keys(byDate).map(k => new Date(k+'T00:00:00')),
  } as any;

  const selectedKey = selected ? selected.toISOString().slice(0,10) : undefined;
  const dayVisits = (selectedKey && byDate[selectedKey]) || [];

  const getSurveyorById = (id?: number) => surveyors.find((s: any) => s.id === id);
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
    const params = new URLSearchParams({
      text: title,
      dates: `${start}/${end}`,
      details,
      location: location || '',
    });
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&${params.toString()}`;
  };
  const buildICS = (title: string, startISO: string, durationMinutes: number, details: string, location?: string) => {
    const dtStart = formatDateForCal(startISO);
    const dtEnd = formatDateForCal(new Date(new Date(startISO).getTime() + durationMinutes*60000).toISOString());
    const uid = `visita-${Date.now()}@integra-rh`;
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Integra RH//Visitas//ES',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtStart}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${details.replace(/\n/g, '\\n')}`,
      location ? `LOCATION:${location}` : '',
      'END:VEVENT',
      'END:VCALENDAR'
    ].filter(Boolean).join('\r\n');
  };
  const buildWhatsappUrl = (phone: string, text: string) => {
    const digits = phone.replace(/[^0-9+]/g, '');
    return `https://api.whatsapp.com/send?phone=${encodeURIComponent(digits)}&text=${encodeURIComponent(text)}`;
  };
  const buildMapsUrl = (address?: string) => address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : '';
  const buildVisitMessage = (opts: { encNombre?: string; procesoClave: string; tipo: string; cliente?: any; candidato?: any; fechaISO?: string; direccion?: string; observaciones?: string; }) => {
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
      line('Fecha/Hora', fecha) +
      line('Dirección', opts.direccion) +
      (maps ? `\n- Maps: ${maps}` : '') +
      line('Observaciones', opts.observaciones) +
      `\n\nGracias.`
    );
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
    const address = addr ?? form.direccion;
    if (!address) { setSuggested([]); return; }
    const arr = [...surveyors].map(s => ({ s, score: scoreSurveyor(address, s) }))
      .sort((x,y)=> y.score - x.score)
      .filter(x=> x.score > 0)
      .slice(0,5)
      .map(x=> x.s);
    setSuggested(arr);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Calendario de visitas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <Label>Encuestador</Label>
              <select className="mt-1 block w-full border rounded-md h-9 px-2" value={surveyorFilter} onChange={(e)=> setSurveyorFilter(e.target.value)}>
                <option value="">Todos</option>
                {((surveyors as any).data || []).map((s:any)=> (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Cliente</Label>
              <select className="mt-1 block w-full border rounded-md h-9 px-2" value={clientFilter} onChange={(e)=> setClientFilter(e.target.value)}>
                <option value="">Todos</option>
                {(clients || []).map((c:any)=> (
                  <option key={c.id} value={c.id}>{c.nombreEmpresa}</option>
                ))}
              </select>
            </div>
          </div>
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={setSelected}
            modifiersClassNames={{ hasVisit: "rdp-day_selected rdp-day_today" }}
            modifiers={modifiers}
          />
          {!isClient && (
            <div className="mt-4 flex justify-end">
              <Button onClick={() => {
                // precargar fecha si hay día seleccionado
                const iso = selected ? new Date(selected.getTime() + 12*60*60*1000).toISOString().slice(0,16) : '';
                setForm(f => ({ ...f, fechaHora: iso }));
                setMode("schedule");
                setScheduleOpen(true);
              }}>Programar visita</Button>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Visitas {selectedKey}</CardTitle>
        </CardHeader>
        <CardContent>
          {dayVisits.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin visitas programadas</p>
          ) : (
            <div className="space-y-3">
              {dayVisits.map((v:any)=> (
                <div key={v.id} className="border rounded p-3">
                  <div className="text-sm font-medium">{v.clave} — {v.tipoProducto}</div>
                  <div className="text-xs text-muted-foreground">Estatus: {v.visitStatus?.status || '-'} | Hora: {new Date(v.visitStatus?.scheduledDateTime).toLocaleString()}</div>
                  <div className="mt-2 flex gap-2">
                    {(() => {
                      const enc = getSurveyorById(v.visitStatus?.encuestadorId);
                      const title = `Visita: ${v.clave}`;
                      const details = `Proceso: ${v.tipoProducto}\nEncuestador: ${enc?.nombre || ''}`;
                      const gUrl = buildGoogleCalendarUrl(title, v.visitStatus?.scheduledDateTime, 60, details, v.visitStatus?.direccion);
                      return (
                        <>
                          {enc?.telefono && (
                            <Button size="sm" variant="outline" onClick={() => {
                              const cand = candidates.find((c:any)=> c.id === v.candidatoId);
                              const cli = clients.find((c:any)=> c.id === v.clienteId);
                              const msg = buildVisitMessage({
                                encNombre: enc.nombre,
                                procesoClave: v.clave,
                                tipo: v.tipoProducto,
                                cliente: cli,
                                candidato: cand,
                                fechaISO: v.visitStatus?.scheduledDateTime,
                                direccion: v.visitStatus?.direccion,
                                observaciones: v.visitStatus?.observaciones,
                              });
                              try { trpc.surveyorMessages.create.mutate({ encuestadorId: enc.id, procesoId: v.id, canal: 'whatsapp', contenido: msg } as any); } catch {}
                              window.open(buildWhatsappUrl(enc.telefono, msg), '_blank');
                            }}>WhatsApp</Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => window.open(gUrl, '_blank')}>Google Calendar</Button>
                          <Button size="sm" variant="outline" onClick={() => {
                            const ics = buildICS(title, v.visitStatus?.scheduledDateTime, 60, details, v.visitStatus?.direccion);
                            const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `visita-${v.clave}.ics`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}>Descargar .ics</Button>
                          {!isClient && (
                            <>
                              <Button size="sm" onClick={() => {
                                setMode("update");
                                setForm({
                                  procesoId: String(v.id),
                                  encuestadorId: String(v.visitStatus?.encuestadorId || ''),
                                  fechaHora: v.visitStatus?.scheduledDateTime ? new Date(v.visitStatus.scheduledDateTime).toISOString().slice(0,16) : '',
                                  direccion: v.visitStatus?.direccion || '',
                                  observaciones: v.visitStatus?.observaciones || '',
                                });
                                setScheduleOpen(true);
                              }}>Reagendar</Button>
                              <Button size="sm" variant="destructive" onClick={() => {
                                if (confirm(`¿Cancelar visita del proceso ${v.clave}?`)) {
                                  cancelMutation.mutate({ id: v.id, motivo: 'Cancelada desde Visitas' });
                                }
                              }}>Cancelar</Button>
                            </>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogo programar visita */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-xl" aria-describedby="schedule-desc">
          <DialogHeader>
            <DialogTitle>Programar visita</DialogTitle>
          </DialogHeader>
          <p id="schedule-desc" className="sr-only">Formulario para programar una visita y compartirla por WhatsApp o agregarla al calendario.</p>
          <div className="space-y-3">
            <div>
              <Label>Proceso</Label>
              <select className="mt-1 block w-full border rounded-md h-10 px-3" value={form.procesoId} onChange={e=>setForm(f=>({ ...f, procesoId: e.target.value }))}>
                <option value="">Selecciona un proceso</option>
                {processes.map((p: any)=> (
                  <option key={p.id} value={p.id}>{p.clave} — {p.tipoProducto}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Encuestador</Label>
              <select className="mt-1 block w-full border rounded-md h-10 px-3" value={form.encuestadorId} onChange={e=>setForm(f=>({ ...f, encuestadorId: e.target.value }))}>
                <option value="">Selecciona un encuestador</option>
                {surveyors.map((s: any)=> (
                  <option key={s.id} value={s.id}>{s.nombre}{s.telefono ? ` — ${s.telefono}` : ''}</option>
                ))}
              </select>
              <div className="mt-1 text-xs text-muted-foreground">
                Sugeridos: {suggested.length === 0 ? '—' : suggested.map((s:any, idx:number)=> (
                  <button key={s.id} className="underline mr-2" onClick={(e)=>{ e.preventDefault(); setForm(f=> ({ ...f, encuestadorId: String(s.id) })); }}>{s.nombre}{idx < suggested.length-1 ? ',' : ''}</button>
                ))}
                <Button size="xs" variant="link" onClick={()=> refreshSuggestions()}>(Actualizar)</Button>
              </div>
            </div>
            <div>
              <Label>Fecha y hora</Label>
              <Input type="datetime-local" value={form.fechaHora} onChange={e=>setForm(f=>({ ...f, fechaHora: e.target.value }))} />
            </div>
            <div>
              <Label>Dirección</Label>
              <Input value={form.direccion} onChange={e=>setForm(f=>({ ...f, direccion: e.target.value }))} onBlur={()=> refreshSuggestions()} placeholder="Calle, número, colonia, ciudad, estado" />
            </div>
            <div>
              <Label>Observaciones</Label>
              <Input value={form.observaciones} onChange={e=>setForm(f=>({ ...f, observaciones: e.target.value }))} placeholder="Notas opcionales" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={()=>setScheduleOpen(false)}>Cerrar</Button>
              <Button onClick={()=>{
                if (!form.procesoId || !form.fechaHora) {
                  toast.error('Completa proceso y fecha/hora');
                  return;
                }
                if (mode === 'schedule') {
                  if (!form.encuestadorId) { toast.error('Selecciona encuestador'); return; }
                  scheduleMutation.mutate({ id: parseInt(form.procesoId), fechaHora: new Date(form.fechaHora).toISOString(), direccion: form.direccion || undefined, observaciones: form.observaciones || undefined, encuestadorId: parseInt(form.encuestadorId) });
                } else {
                  updateMutation.mutate({ id: parseInt(form.procesoId), fechaHora: form.fechaHora ? new Date(form.fechaHora).toISOString() : undefined, direccion: form.direccion || undefined, observaciones: form.observaciones || undefined });
                }
              }} disabled={scheduleMutation.isPending || updateMutation.isPending}>{mode === 'schedule' ? 'Programar' : 'Reagendar'}</Button>
            </div>

            {lastScheduled && (
              <div className="mt-3 border rounded p-3">
                <div className="text-sm font-medium">Compartir</div>
                <div className="mt-2 flex gap-2">
                  {lastScheduled.enc?.telefono && (
                    <Button size="sm" variant="outline" onClick={()=>{
                      const msg = `Hola ${lastScheduled.enc.nombre}, visita programada: ${lastScheduled.proc?.clave} el ${new Date(lastScheduled.fechaHora).toLocaleString()} en ${lastScheduled.direccion || 'dirección por confirmar'}.`;
                      window.open(buildWhatsappUrl(lastScheduled.enc.telefono, msg), '_blank');
                    }}>WhatsApp</Button>
                  )}
                  <Button size="sm" variant="outline" onClick={()=>{
                    const title = `Visita: ${lastScheduled.proc?.clave}`;
                    const details = `Proceso: ${lastScheduled.proc?.tipoProducto}\nEncuestador: ${lastScheduled.enc?.nombre || ''}`;
                    const gUrl = buildGoogleCalendarUrl(title, lastScheduled.fechaHora, 60, details, lastScheduled.direccion);
                    window.open(gUrl, '_blank');
                  }}>Google Calendar</Button>
                  <Button size="sm" variant="outline" onClick={()=>{
                    const title = `Visita: ${lastScheduled.proc?.clave}`;
                    const details = `Proceso: ${lastScheduled.proc?.tipoProducto}\nEncuestador: ${lastScheduled.enc?.nombre || ''}`;
                    const ics = buildICS(title, lastScheduled.fechaHora, 60, details, lastScheduled.direccion);
                    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `visita-${lastScheduled.proc?.clave}.ics`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}>Descargar .ics</Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
