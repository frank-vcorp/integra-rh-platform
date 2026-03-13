import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, FileText, Save, FilePlus2, CalendarClock, Shield, Landmark, Home, UserCheck, AlertTriangle, ChevronRight, ChevronLeft, Briefcase, CheckCircle2 } from "lucide-react";
import { Link, useParams } from "wouter";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { useEffect, useMemo, useState } from "react";
import { useHasPermission } from "@/_core/hooks/usePermission";
import {
  AmbitoType,
  IlaModoType,
  PROCESO_BASE_OPTIONS,
  ProcesoBaseType,
  ProcesoConfig,
  mapProcesoConfigToTipoProducto,
  parseTipoProductoToConfig,
} from "@/lib/procesoTipo";

export default function ProcesoDetalle() {
  const params = useParams();
  const processId = parseInt(params.id || "0");
  const { data: process, isLoading } = trpc.processes.getById.useQuery({ id: processId });
  const { data: workHistory = [] } = trpc.workHistory.getByCandidate.useQuery(
    { candidateId: process?.candidatoId || 0 },
    { enabled: !!process?.candidatoId }
  );
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
  const updatePanelDetail = trpc.processes.updatePanelDetail.useMutation({
    onSuccess: () => {
      utils.processes.getById.invalidate({ id: processId });
      // También refrescamos la lista para que la columna "Responsable"
      // y los conteos de analista asignado se actualicen al instante.
      utils.processes.list.invalidate();
      toast.success("Bloques actualizados");
    },
    onError: (e:any) => {
      toast.error(e.message || "Error al guardar");
    },
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
    { value: 'en_recepcion', label: 'EN RECEPCIÓN' },
    { value: 'asignado', label: 'ASIGNADO' },
    { value: 'entrevistado', label: 'ENTREVISTADO' },
    { value: 'no_entrevistado', label: 'NO ENTREVISTADO' },
    { value: 'en_verificacion', label: 'EN INVESTIGACIÓN' },
    { value: 'visita_programada', label: 'VISITA PROGRAMADA' },
    { value: 'visita_realizada', label: 'VISITA REALIZADA' },
    { value: 'en_dictamen', label: 'EN REVISIÓN FINAL' },
    { value: 'finalizado', label: 'FINALIZADO' },
    { value: 'entregado', label: 'ENTREGADO' },
  ];
  const CALIF = [
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'recomendable', label: 'Recomendable' },
    { value: 'con_reservas', label: 'Con reservas' },
    { value: 'no_recomendable', label: 'No recomendable' },
    { value: 'recomendable_con_observacion', label: 'Recomendable con Observación' },
    { value: 'con_reservas_con_observacion', label: 'Con Reservas con Observación' },
  ];
  const ESTATUS_VISUAL = [
    { value: "nuevo", label: "Nuevo" },
    { value: "sin_entrevistar", label: "Sin entrevistar" },
    { value: "entrevistado", label: "Entrevistado" },
    { value: "en_proceso", label: "En proceso" },
    { value: "pausado", label: "Pausado" },
    { value: "cerrado", label: "Cerrado" },
    { value: "descartado", label: "Descartado" },
  ];
  const { data: clients = [] } = trpc.clients.list.useQuery();
  const { data: candidates = [] } = trpc.candidates.list.useQuery();
  const { data: posts = [] } = trpc.posts.list.useQuery();
  const { data: users = [] } = trpc.users.list.useQuery(undefined as any, {
    enabled: !isClientAuth,
  } as any);
  const { data: allProcesses = [] } = trpc.processes.list.useQuery(undefined as any, {
    enabled: !isClientAuth,
  } as any);
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
  const [panelForm, setPanelForm] = useState({
    especialistaAtraccionId: "",
    especialistaAtraccionNombre: "",
    estatusVisual: "en_proceso",
    fechaCierre: "",
    investigacionLaboral: { resultado: "", detalles: "", completado: false },
    investigacionLegal: {
      antecedentes: "",
      flagRiesgo: false,
      archivoAdjuntoUrl: "",
      notasPeriodisticas: "",
      observacionesImss: "",
      evidenciaImgUrl: "",
      evidenciasGraficas: [] as string[],
    },
    semanasDetalle: {
      comentario: "",
      evidenciasGraficas: [] as string[],
    },
    antecedentesPenales: {
      evidenciasGraficas: [] as string[],
    },
    buroCredito: { estatus: "", score: "", aprobado: null as null | boolean, pdfUrl: "", archivosAdicionales: [] as string[] },
    visitaDetalle: { tipo: "", comentarios: "", fechaRealizacion: "", enlaceReporteUrl: "", evidenciasGraficas: [] as string[] },
  });
  const [baseTipo, setBaseTipo] = useState<ProcesoBaseType>("ILA");
  const [ilaModo, setIlaModo] = useState<IlaModoType>("NORMAL");
  const [eseAmbito, setEseAmbito] = useState<AmbitoType>("LOCAL");
  const [eseExtra, setEseExtra] = useState<"NINGUNO" | "BURO" | "LEGAL">(
    "NINGUNO"
  );
  const [visitaAmbito, setVisitaAmbito] = useState<AmbitoType>("LOCAL");
  const [calificacion, setCalificacion] = useState("");
  const [comentarioCalificacion, setComentarioCalificacion] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxSection, setLightboxSection] = useState<"legal" | "semanas" | "penales" | "buro" | "visita">("legal");

  useEffect(() => {
    if (process) {
      setCalificacion(process.calificacionFinal || "pendiente");
      setComentarioCalificacion((process as any).comentarioCalificacion || "");
    }
  }, [process]);

  useEffect(() => {
    if (!process) return;
    const cfg = parseTipoProductoToConfig(
      (process.tipoProducto || "ILA") as any
    );
    setBaseTipo(cfg.base);
    if (cfg.base === "ILA") {
      setIlaModo(cfg.modo);
    } else if (cfg.base === "ESE") {
      setEseAmbito(cfg.ambito);
      setEseExtra(cfg.extra);
    } else if (cfg.base === "VISITA") {
      setVisitaAmbito(cfg.ambito);
    }
    setPanelForm({
      especialistaAtraccionId: (process as any).especialistaAtraccionId
        ? String((process as any).especialistaAtraccionId)
        : "",
      especialistaAtraccionNombre: (process as any).especialistaAtraccionNombre || "",
      estatusVisual: (process as any).estatusVisual || "en_proceso",
      fechaCierre: process.fechaCierre ? new Date(process.fechaCierre).toISOString().split("T")[0] : "",
      investigacionLaboral: {
        resultado: (process as any).investigacionLaboral?.resultado || "",
        detalles: (process as any).investigacionLaboral?.detalles || "",
        completado: Boolean((process as any).investigacionLaboral?.completado),
      },
      investigacionLegal: {
        antecedentes: (process as any).investigacionLegal?.antecedentes || "",
        flagRiesgo: Boolean((process as any).investigacionLegal?.flagRiesgo),
        archivoAdjuntoUrl: (process as any).investigacionLegal?.archivoAdjuntoUrl || "",
        notasPeriodisticas: (process as any).investigacionLegal?.notasPeriodisticas || "",
        observacionesImss: (process as any).investigacionLegal?.observacionesImss || "",
        evidenciaImgUrl: (process as any).investigacionLegal?.evidenciaImgUrl || "",
        evidenciasGraficas: Array.isArray((process as any).investigacionLegal?.evidenciasGraficas) ? (process as any).investigacionLegal.evidenciasGraficas : [],
      },
      semanasDetalle: {
        comentario: (process as any).semanasDetalle?.comentario || "",
        evidenciasGraficas: Array.isArray((process as any).semanasDetalle?.evidenciasGraficas) ? (process as any).semanasDetalle.evidenciasGraficas : [],
      },
      antecedentesPenales: {
        evidenciasGraficas: Array.isArray((process as any).antecedentesPenales?.evidenciasGraficas) ? (process as any).antecedentesPenales.evidenciasGraficas : [],
      },
      buroCredito: {
        estatus: (process as any).buroCredito?.estatus || "",
        score: (process as any).buroCredito?.score || "",
        aprobado: (process as any).buroCredito?.aprobado ?? null,
        pdfUrl: (process as any).buroCredito?.pdfUrl || "",
        archivosAdicionales: Array.isArray((process as any).buroCredito?.archivosAdicionales) ? (process as any).buroCredito.archivosAdicionales : [],
      },
      visitaDetalle: {
        tipo: (process as any).visitaDetalle?.tipo || "",
        comentarios: (process as any).visitaDetalle?.comentarios || "",
        fechaRealizacion: (process as any).visitaDetalle?.fechaRealizacion
          ? new Date((process as any).visitaDetalle?.fechaRealizacion).toISOString().split("T")[0]
          : "",
        enlaceReporteUrl: (process as any).visitaDetalle?.enlaceReporteUrl || "",
        evidenciasGraficas: Array.isArray((process as any).visitaDetalle?.evidenciasGraficas) ? (process as any).visitaDetalle.evidenciasGraficas : [],
      },
    });
  }, [process]);

  const iaDictamenCliente: any =
    (process as any)?.investigacionLaboral?.iaDictamenCliente || null;

  const assignedCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    (allProcesses as any[]).forEach((p: any) => {
      const uid = p.especialistaAtraccionId as number | null | undefined;
      if (uid) {
        counts[uid] = (counts[uid] || 0) + 1;
      }
    });
    return counts;
  }, [allProcesses]);

  const canEditProcess = useHasPermission("procesos", "edit");

  const getPanelPayload = (form: typeof panelForm) => {
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
    const tipoProducto = mapProcesoConfigToTipoProducto(config);

    const result = {
      id: processId,
      especialistaAtraccionId: form.especialistaAtraccionId
        ? Number(form.especialistaAtraccionId)
        : null,
      especialistaAtraccionNombre: form.especialistaAtraccionNombre || null,
      estatusVisual: form.estatusVisual as any,
      fechaCierre: form.fechaCierre || null,
      investigacionLaboral: {
        resultado: form.investigacionLaboral.resultado || undefined,
        detalles: form.investigacionLaboral.detalles || undefined,
        completado: form.investigacionLaboral.completado,
      },
      investigacionLegal: {
        antecedentes: form.investigacionLegal.antecedentes || undefined,
        flagRiesgo: form.investigacionLegal.flagRiesgo,
        archivoAdjuntoUrl: form.investigacionLegal.archivoAdjuntoUrl || undefined,
        notasPeriodisticas: form.investigacionLegal.notasPeriodisticas || undefined,
        observacionesImss: form.investigacionLegal.observacionesImss || undefined,
        evidenciaImgUrl: (form.investigacionLegal as any).evidenciaImgUrl || undefined,
        evidenciasGraficas: Array.isArray((form.investigacionLegal as any).evidenciasGraficas) 
          ? (form.investigacionLegal as any).evidenciasGraficas.filter((url: string) => !!url)
          : undefined,
      },
      semanasDetalle: {
        comentario: form.semanasDetalle?.comentario || undefined,
        evidenciasGraficas: Array.isArray((form.semanasDetalle as any)?.evidenciasGraficas)
          ? (form.semanasDetalle as any).evidenciasGraficas.filter((url: string) => !!url)
          : undefined,
      },
      antecedentesPenales: {
        evidenciasGraficas: Array.isArray((form.antecedentesPenales as any)?.evidenciasGraficas)
          ? (form.antecedentesPenales as any).evidenciasGraficas.filter((url: string) => !!url)
          : undefined,
      },
      buroCredito: {
        estatus: form.buroCredito.estatus || undefined,
        score: form.buroCredito.score || undefined,
        aprobado: form.buroCredito.aprobado === null ? undefined : form.buroCredito.aprobado,
        pdfUrl: (form.buroCredito as any).pdfUrl || undefined,
        archivosAdicionales: Array.isArray((form.buroCredito as any)?.archivosAdicionales)
          ? (form.buroCredito as any).archivosAdicionales.filter((url: string) => !!url)
          : undefined,
      },
      visitaDetalle: {
        tipo: (form.visitaDetalle.tipo as any) || undefined,
        comentarios: form.visitaDetalle.comentarios || undefined,
        fechaRealizacion: form.visitaDetalle.fechaRealizacion || undefined,
        enlaceReporteUrl: form.visitaDetalle.enlaceReporteUrl || undefined,
        evidenciasGraficas: Array.isArray((form.visitaDetalle as any)?.evidenciasGraficas)
          ? (form.visitaDetalle as any).evidenciasGraficas.filter((url: string) => !!url)
          : undefined,
      },
      tipoProducto,
    };
    
    return result;
  };

  const handleSavePanel = () => {
    if (!process) return;
    updatePanelDetail.mutate(getPanelPayload(panelForm));
  };

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
    <div className="space-y-4">
      {/* Header Denso con info del Sidebar */}
      <div className="bg-white border-b sticky top-0 z-10 p-4 -mx-6 -mt-6 mb-6 shadow-sm">
        <div className="flex flex-col xl:flex-row gap-4 justify-between xl:items-center">
            <div className="flex items-start gap-4">
                <Link href="/procesos">
                   <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5"/></Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        {process.clave} <Badge variant="secondary">{process.tipoProducto}</Badge>
                    </h1>
                    <div className="text-sm text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 mt-1">
                        <span className="flex items-center gap-1"><UserCheck className="h-3 w-3"/> {findName(process.candidatoId, candidates, 'nombreCompleto')}</span>
                        <span className="flex items-center gap-1"><Landmark className="h-3 w-3"/> {findName(process.clienteId, clients, 'nombreEmpresa')}</span>
                        <span className="flex items-center gap-1"><Briefcase className="h-3 w-3"/> {findName(process.puestoId, posts, 'nombreDelPuesto')}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap bg-gray-50 p-2 rounded-lg border">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Estatus</span>
                    <select 
                        value={process.estatusProceso} 
                        onChange={(e) => updateStatus.mutate({ id: processId, estatusProceso: e.target.value })}
                        disabled={!canEditProcess}
                        className="bg-transparent text-sm font-medium border-none p-0 h-auto focus:ring-0 cursor-pointer w-32"
                    >
                        {ESTATUS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                    </select>
                </div>
                <div className="w-px h-8 bg-gray-300 mx-2"></div>
                <div className="flex flex-col w-48">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Calif. Final</span>
                    <div className="flex items-center gap-1">
                        <select 
                            value={calificacion} 
                            onChange={(e) => setCalificacion(e.target.value)}
                            disabled={!canEditProcess}
                            className="bg-transparent text-sm font-medium border-none p-0 h-auto focus:ring-0 cursor-pointer flex-1"
                        >
                            {CALIF.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                    </div>
                </div>
                {calificacion !== 'pendiente' && calificacion !== process.calificacionFinal && (
                    <Button size="sm" onClick={() => updateCalif.mutate({ id: processId, calificacionFinal: calificacion as any, comentarioCalificacion: calificacion !== 'pendiente' ? comentarioCalificacion : undefined })}>
                        Guardar Calif.
                    </Button>
                )}
                <div className="w-px h-8 bg-gray-300 mx-2"></div>
                 {!isClientAuth && canEditProcess && (
                    <Button onClick={handleSavePanel} disabled={updatePanelDetail.isPending} className="bg-green-600 hover:bg-green-700 text-white shadow-sm">
                      <Save className="h-4 w-4 mr-2" /> Guardar Todo
                    </Button>
                 )}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-12 space-y-6">
          <Tabs defaultValue="expediente" className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="expediente">Expediente</TabsTrigger>
              <TabsTrigger value="visitas">Visitas</TabsTrigger>
              <TabsTrigger value="documentos">Documentos</TabsTrigger>
            </TabsList>

            <TabsContent value="expediente" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              
                  {/* 1. Control Interno / Config */}
                  <div className="border rounded-lg bg-white shadow-sm p-4 space-y-4">
                    <div className="flex items-center gap-2 font-semibold text-sm border-b pb-2 text-gray-700">
                        <Shield className="h-4 w-4"/> Control Interno
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Estatus visual</p>
                        <select
                            className="border rounded-md h-9 px-2 w-full text-sm"
                            value={panelForm.estatusVisual}
                            onChange={e => setPanelForm(f => ({ ...f, estatusVisual: e.target.value }))}
                            disabled={isClientAuth || !canEditProcess}
                        >
                            {ESTATUS_VISUAL.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Fecha de cierre</p>
                        <Input
                            type="date"
                            className="h-9"
                            value={panelForm.fechaCierre}
                            onChange={e => setPanelForm(f => ({ ...f, fechaCierre: e.target.value }))}
                            disabled={isClientAuth || !canEditProcess}
                        />
                    </div>
                    
                    {!isClientAuth && canEditProcess && (
                        <details className="text-xs text-gray-500 pt-2 border-t mt-2">
                        <summary className="cursor-pointer">Guía rápida</summary>
                        <ul className="pl-4 list-disc mt-1 space-y-1">
                            <li>Completa los datos en los bloques.</li>
                            <li>Sube evidencias.</li>
                            <li>Clic en "Guardar Todo" arriba.</li>
                        </ul>
                        </details>
                    )}
                  </div>

                  {/* 2. Investigación Laboral */}
                  <div className="border rounded-lg bg-white shadow-sm p-4 space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                         <div className="flex items-center gap-2 font-semibold text-sm text-gray-700">
                            <Shield className="h-4 w-4 text-blue-600" /> Investigación Laboral
                         </div>
                         <div className="flex items-center gap-2">
                             <span className="text-[10px] uppercase text-gray-400">Completo</span>
                             <input
                                type="checkbox"
                                checked={Boolean((getCandidate() as any)?.dictamenLaboral?.completado)}
                                disabled={true}
                            />
                         </div>
                    </div>
                    
                    <div>
                        <Label className="text-xs">Resultado Global</Label>
                        <div className="h-9 px-3 py-2 border rounded-md bg-gray-50 text-sm font-semibold uppercase text-blue-700 mt-1">
                          {(getCandidate() as any)?.dictamenLaboral?.resultado || "Pendiente"}
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                        <Label className="text-xs font-semibold text-blue-800">Historial Laboral</Label>
                        <Link href={`/candidatos/${process.candidatoId}?tab=empleos`}>
                        <Button variant="link" size="sm" className="h-auto p-0 text-[10px]">
                            Ver / Editar en Candidato
                        </Button>
                        </Link>
                    </div>

                    {workHistory && workHistory.length > 0 ? (
                        <ScrollArea className="h-[150px] w-full rounded-md border p-2 bg-gray-50/50">
                        <div className="space-y-3">
                            {workHistory.map((wh: any) => (
                            <div key={wh.id} className="border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                                <div className="flex justify-between items-start mb-1">
                                <span className="font-medium text-xs text-gray-900 line-clamp-1" title={wh.empresa}>
                                    {wh.empresa}
                                </span>
                                <Badge variant="outline" className="text-[10px] px-1 h-4">
                                    {(wh.resultadoVerificacion || 'PENDIENTE').substring(0, 10)}
                                </Badge>
                                </div>
                                <div className="text-[10px] text-gray-600">
                                {wh.fechaInicio} - {wh.fechaFin}
                                </div>
                            </div>
                            ))}
                        </div>
                        </ScrollArea>
                    ) : (
                        <div className="text-xs text-muted-foreground p-3 border border-dashed rounded bg-gray-50 text-center">
                        Sin historial.
                        </div>
                    )}
                  </div>

                {/* 3. Investigación Legal */}
                <div className="border rounded-lg bg-white shadow-sm p-4 space-y-3">
                   <div className="flex items-center gap-2 font-semibold text-sm border-b pb-2 text-gray-700">
                        <Landmark className="h-4 w-4 text-indigo-600" /> Investigación Legal
                        <div className="ml-auto flex items-center gap-1">
                            <span className="text-[10px] text-gray-400">Riesgo</span>
                            <input
                                type="checkbox"
                                checked={panelForm.investigacionLegal.flagRiesgo}
                                onChange={e => setPanelForm(f => ({ ...f, investigacionLegal: { ...f.investigacionLegal, flagRiesgo: e.target.checked } }))}
                                disabled={isClientAuth || !canEditProcess}
                            />
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs">Antecedentes / Hallazgos</Label>
                        <Textarea
                            value={panelForm.investigacionLegal.antecedentes}
                            onChange={e => setPanelForm(f => ({ ...f, investigacionLegal: { ...f.investigacionLegal, antecedentes: e.target.value } }))}
                            disabled={isClientAuth || !canEditProcess}
                            rows={3}
                            className="bg-gray-50"
                        />
                    </div>
                    
                    <div className="mt-2">
                        <Label className="text-xs">Evidencia Gráfica (Paste)</Label>
                        <div
                        className="border-2 border-dashed rounded h-20 flex flex-col items-center justify-center bg-gray-50 mt-1 cursor-pointer hover:bg-gray-100"
                        tabIndex={0}
                        onPaste={async (e) => {
                            if (isClientAuth) return;
                            e.preventDefault();
                            const files = e.clipboardData.files;
                            if (files.length > 0) {
                               toast.info("Subiendo...");
                               const file = files[0];
                               const arrayBuf = await file.arrayBuffer();
                               let binary = ''; const bytes = new Uint8Array(arrayBuf); const len = bytes.byteLength; for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
                               const base64 = btoa(binary);
                               const res = await uploadProcessDoc.mutateAsync({ procesoId: processId, tipoDocumento: 'EVIDENCIA_LEGAL', fileName: `paste.png`, contentType: file.type, base64 } as any);
                               setPanelForm(f => ({...f, investigacionLegal: { ...f.investigacionLegal, evidenciasGraficas: [...(f.investigacionLegal as any).evidenciasGraficas, res.url] }}));
                               toast.success("Subido");
                            }
                        }}
                        >
                        <p className="text-[10px] text-gray-400 text-center px-2">Click y Ctrl+V para pegar imagen</p>
                        </div>
                        {/* Thumbnails */}
                        <div className="flex gap-1 overflow-x-auto mt-2 h-12">
                             {(panelForm.investigacionLegal as any).evidenciasGraficas.map((url:string, i:number) => (
                                 <img key={i} src={url} className="h-10 w-10 object-cover rounded border cursor-pointer" onClick={() => { setLightboxSection("legal"); setLightboxIndex(i); setLightboxOpen(true); }} />
                             ))}
                        </div>
                    </div>
                </div>

                 {/* 4. Semanas Cotizadas */}
                <div className="border rounded-lg bg-white shadow-sm p-4 space-y-3">
                   <div className="flex items-center gap-2 font-semibold text-sm border-b pb-2 text-gray-700">
                        <FileText className="h-4 w-4 text-teal-600" /> Semanas Cotizadas
                    </div>
                    <div>
                        <Label className="text-xs">Comentario Cotejo</Label>
                        <Textarea
                            value={panelForm.semanasDetalle.comentario}
                            onChange={e => setPanelForm(f => ({ ...f, semanasDetalle: { ...f.semanasDetalle, comentario: e.target.value } }))}
                            rows={3}
                            disabled={isClientAuth || !canEditProcess}
                        />
                    </div>
                     <div className="mt-2">
                        <Label className="text-xs">Evidencia (Paste / Upload)</Label>
                         <div className="grid grid-cols-2 gap-2 mt-1">
                             <div className="border border-dashed rounded h-16 flex items-center justify-center bg-gray-50 cursor-pointer text-[10px] text-gray-400"
                                  onPaste={async (e) => {
                                      if (isClientAuth) return;
                                      const file = e.clipboardData.files[0];
                                      if(file) {
                                          toast.info("Subiendo...");
                                           const arrayBuf = await file.arrayBuffer();
                                           let binary = ''; const bytes = new Uint8Array(arrayBuf); const len = bytes.byteLength; for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
                                           const base64 = btoa(binary);
                                           const res = await uploadProcessDoc.mutateAsync({ procesoId: processId, tipoDocumento: 'SEMANAS_COTIZADAS', fileName: `paste.png`, contentType: file.type, base64 } as any);
                                           setPanelForm(f => ({...f, semanasDetalle: { ...f.semanasDetalle, evidenciasGraficas: [...(f.semanasDetalle as any).evidenciasGraficas, res.url] }}));
                                           toast.success("Subido");
                                      }
                                  }}
                                  tabIndex={0}
                             >Pegar IMG</div>
                             <div className="relative border border-dashed rounded h-16 flex items-center justify-center bg-gray-50 text-[10px] text-gray-400">
                                 Subir PDF
                                 <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={async(e) => {
                                     const file = e.currentTarget.files?.[0];
                                     if(file) {
                                        toast.info("Subiendo...");
                                        const arrayBuf = await file.arrayBuffer();
                                           let binary = ''; const bytes = new Uint8Array(arrayBuf); const len = bytes.byteLength; for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
                                           const base64 = btoa(binary);
                                           const res = await uploadProcessDoc.mutateAsync({ procesoId: processId, tipoDocumento: 'SEMANAS_IMSS', fileName: file.name, contentType: file.type, base64 } as any);
                                           setPanelForm(f => ({...f, semanasDetalle: { ...f.semanasDetalle, evidenciasGraficas: [...(f.semanasDetalle as any).evidenciasGraficas, res.url] }}));
                                           toast.success("Subido");
                                     }
                                 }}/>
                             </div>
                         </div>
                         <div className="flex gap-1 overflow-x-auto mt-2 h-12">
                             {(panelForm.semanasDetalle as any).evidenciasGraficas.map((url:string, i:number) => (
                                 <div key={i} className="h-10 w-10 border rounded flex items-center justify-center bg-gray-100 cursor-pointer" onClick={() => { setLightboxSection("semanas"); setLightboxIndex(i); setLightboxOpen(true); }}>
                                     {url.includes('.pdf') ? <FileText className="h-5 w-5"/> : <img src={url} className="h-full w-full object-cover"/>}
                                 </div>
                             ))}
                        </div>
                    </div>
                </div>

                 {/* 5. Antecedentes Penales */}
                <div className="border rounded-lg bg-white shadow-sm p-4 space-y-3">
                   <div className="flex items-center gap-2 font-semibold text-sm border-b pb-2 text-gray-700">
                        <AlertTriangle className="h-4 w-4 text-red-600" /> Antecedentes Penales
                    </div>
                     <div className="mt-2 text-center py-4 bg-gray-50 border border-dashed rounded cursor-pointer"
                        onPaste={async (e) => {
                              if (isClientAuth) return;
                              const file = e.clipboardData.files[0];
                              if(file) {
                                    toast.info("Subiendo...");
                                    const arrayBuf = await file.arrayBuffer();
                                    let binary = ''; const bytes = new Uint8Array(arrayBuf); const len = bytes.byteLength; for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
                                    const base64 = btoa(binary);
                                    const res = await uploadProcessDoc.mutateAsync({ procesoId: processId, tipoDocumento: 'ANTECEDENTES_PENALES', fileName: `paste.png`, contentType: file.type, base64 } as any);
                                    setPanelForm(f => ({...f, antecedentesPenales: { ...f.antecedentesPenales, evidenciasGraficas: [...(f.antecedentesPenales as any).evidenciasGraficas, res.url] }}));
                                    toast.success("Subido");
                              }
                        }}
                        tabIndex={0}
                     >
                         <p className="text-xs text-muted-foreground">Pegar Imagen aquí</p>
                     </div>
                     <div className="flex gap-1 overflow-x-auto mt-2 h-12">
                             {(panelForm.antecedentesPenales as any).evidenciasGraficas.map((url:string, i:number) => (
                                 <img key={i} src={url} className="h-10 w-10 object-cover rounded border cursor-pointer" onClick={() => { setLightboxSection("penales"); setLightboxIndex(i); setLightboxOpen(true); }} />
                             ))}
                     </div>
                </div>

                {/* 6. Buró de Crédito */}
                <div className="border rounded-lg bg-white shadow-sm p-4 space-y-3">
                   <div className="flex items-center gap-2 font-semibold text-sm border-b pb-2 text-gray-700">
                        <FileText className="h-4 w-4 text-amber-600" /> Buró de Crédito
                    </div>
                    
                    {(panelForm.buroCredito as any)?.pdfUrl ? (
                        <div className="flex items-center gap-2 text-xs border p-2 rounded bg-green-50">
                            <FileText className="h-4 w-4 text-green-700"/>
                            <a href={(panelForm.buroCredito as any).pdfUrl} target="_blank" className="truncate flex-1 hover:underline">Ver Reporte</a>
                            <Button size="xs" variant="ghost" className="h-6 w-6 p-0" onClick={() => setPanelForm(f=>({...f, buroCredito: {...f.buroCredito, pdfUrl: null} as any}))}>×</Button>
                        </div>
                    ) : (
                        <div className="relative border border-dashed rounded p-3 text-center bg-gray-50">
                            <input type="file" accept="application/pdf" className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={async(e) => {
                                     const file = e.currentTarget.files?.[0];
                                     if(file) {
                                        toast.info("Subiendo...");
                                        const arrayBuf = await file.arrayBuffer();
                                        let binary = ''; const bytes = new Uint8Array(arrayBuf); const len = bytes.byteLength; for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
                                        const base64 = btoa(binary);
                                        const res = await uploadProcessDoc.mutateAsync({ procesoId: processId, tipoDocumento: 'BURO_CREDITO', fileName: file.name, contentType: file.type, base64 } as any);
                                        setPanelForm(f => ({...f, buroCredito: { ...f.buroCredito, pdfUrl: res.url } as any}));
                                        toast.success("Subido");
                                     }
                                }}
                            />
                            <p className="text-xs text-muted-foreground">Subir PDF</p>
                        </div>
                    )}
                    
                     <div className="mt-2 border-t pt-2">
                        <Label className="text-[10px] text-gray-500">Adicionales</Label>
                        <div className="text-[10px] text-gray-400 text-center border border-dashed rounded p-1 cursor-pointer" tabIndex={0}
                            onPaste={async (e) => {
                                if (isClientAuth) return;
                                const file = e.clipboardData.files[0];
                                if(file) {
                                    toast.info("Subiendo...");
                                    const arrayBuf = await file.arrayBuffer();
                                    let binary = ''; const bytes = new Uint8Array(arrayBuf); const len = bytes.byteLength; for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
                                    const base64 = btoa(binary);
                                    const res = await uploadProcessDoc.mutateAsync({ procesoId: processId, tipoDocumento: 'BURO_CREDITO_ADICIONAL', fileName: `paste.png`, contentType: file.type, base64 } as any);
                                    setPanelForm(f => ({...f, buroCredito: { ...f.buroCredito, archivosAdicionales: [...(f.buroCredito as any).archivosAdicionales, res.url] }}));
                                }
                            }}
                        >Paste files</div>
                         <div className="flex gap-1 overflow-x-auto mt-1 h-10">
                             {(panelForm.buroCredito as any).archivosAdicionales.map((url:string, i:number) => (
                                 <img key={i} src={url} className="h-8 w-8 object-cover rounded border cursor-pointer" onClick={() => { setLightboxSection("buro"); setLightboxIndex(i); setLightboxOpen(true); }} />
                             ))}
                        </div>
                    </div>
                </div>

                 {/* 7. Visita Detalle */}
                <div className="border rounded-lg bg-white shadow-sm p-4 space-y-3">
                   <div className="flex items-center gap-2 font-semibold text-sm border-b pb-2 text-gray-700">
                        <Home className="h-4 w-4 text-emerald-600" /> Visita (Resumen)
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label className="text-xs">Tipo</Label>
                            <select className="w-full text-xs border rounded h-8" value={panelForm.visitaDetalle.tipo} onChange={e => setPanelForm(f => ({...f, visitaDetalle: {...f.visitaDetalle, tipo: e.target.value}}))}>
                                <option value="">-</option>
                                <option value="virtual">Virtual</option>
                                <option value="presencial">Presencial</option>
                            </select>
                        </div>
                        <div>
                             <Label className="text-xs">Fecha</Label>
                            <Input type="date" className="h-8 text-xs" value={panelForm.visitaDetalle.fechaRealizacion} onChange={e => setPanelForm(f => ({...f, visitaDetalle: {...f.visitaDetalle, fechaRealizacion: e.target.value}}))} />
                        </div>
                    </div>
                    <Textarea className="text-xs" rows={2} placeholder="Comentarios..." value={panelForm.visitaDetalle.comentarios} onChange={e => setPanelForm(f => ({...f, visitaDetalle: {...f.visitaDetalle, comentarios: e.target.value}}))} />
                    
                    <div className="text-[10px] text-center border border-dashed rounded p-1 cursor-pointer" tabIndex={0}
                         onPaste={async(e) => {
                             if(isClientAuth) return;
                             const file = e.clipboardData.files[0];
                              if(file) {
                                    toast.info("Subiendo...");
                                    const arrayBuf = await file.arrayBuffer();
                                    let binary = ''; const bytes = new Uint8Array(arrayBuf); const len = bytes.byteLength; for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
                                    const base64 = btoa(binary);
                                    const res = await uploadProcessDoc.mutateAsync({ procesoId: processId, tipoDocumento: 'VISITA_FOTOGRAFIA', fileName: `paste.png`, contentType: file.type, base64 } as any);
                                    setPanelForm(f => ({...f, visitaDetalle: { ...f.visitaDetalle, evidenciasGraficas: [...(f.visitaDetalle as any).evidenciasGraficas || [], res.url] }}));
                              }
                         }}
                    >Paste Photos</div>
                     <div className="flex gap-1 overflow-x-auto mt-1 h-10">
                             {(panelForm.visitaDetalle as any).evidenciasGraficas?.map((url:string, i:number) => (
                                 <img key={i} src={url} className="h-8 w-8 object-cover rounded border cursor-pointer" onClick={() => { setLightboxSection("visita"); setLightboxIndex(i); setLightboxOpen(true); }} />
                             ))}
                    </div>
                </div>

              </div>
            </TabsContent>

            <TabsContent value="visitas" className="mt-4">
      <Card>
        <CardHeader className="flex items-center justify-between flex-row">
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5"/> Visitas domiciliarias
          </CardTitle>
          {!isClientAuth && (
            <Button size="sm" variant="outline" onClick={()=>{
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
      {!isClientAuth && canEditProcess && (
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
                        setNotifySelected(prev=> e.target.checked ? Array.from(new Set([...prev, s.id])) : prev.filter(id=> id!==s.id));
                      }}
                    />
                    <span>{s.nombre}{s.telefono ? ` — ${s.telefono}` : ''}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="outline" onClick={()=> setNotifyOpen(false)}>Cerrar</Button>
              <Button onClick={()=>{
                if (!process) return;
                const cand = getCandidate();
                const cli = getClient();
                const puesto = posts.find((p:any)=> p.id === process.puestoId)?.nombreDelPuesto;
                const fechaISO = process.visitStatus?.scheduledDateTime;
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
            </TabsContent>
            <TabsContent value="documentos" className="mt-4">
      <Card>
        <CardHeader className="flex items-center justify-between flex-row">
          <CardTitle>Documentos</CardTitle>
          {process?.clienteId && !isClientAuth && canEditProcess && (
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
          {!isClientAuth && canEditProcess && (
          <form onSubmit={async (e)=>{
            e.preventDefault();
            const fd = new FormData(e.currentTarget as HTMLFormElement);
            const file = fd.get('file') as File | null;
            const tipo = (fd.get('tipoDocumento') as string) || 'OTRO';
            if (!file) return;
            const arrayBuf = await file.arrayBuffer();
            let binary = '';
            const bytes = new Uint8Array(arrayBuf);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            const base64 = btoa(binary);
            uploadProcessDoc.mutate({ procesoId: processId, tipoDocumento: tipo, fileName: file.name, contentType: file.type || 'application/octet-stream', base64 } as any);
            (e.currentTarget as HTMLFormElement).reset();
          }} className="space-y-2 mb-4">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-sm text-muted-foreground" htmlFor="tipoDocumento">Tipo</label>
                <select name="tipoDocumento" id="tipoDocumento" className="mt-1 block w-full border rounded-md h-9 px-2">
                  <option value="DICTAMEN">Dictamen</option>
                  <option value="VISITA_EVIDENCIA">Evidencia de visita</option>
                  <option value="SEMANAS_COTIZADAS">Cotejo semanas IMSS</option>
                  <option value="BURO_CREDITO">Buró de Crédito</option>
                  <option value="ANTECEDENTES_PENALES">Antecedentes Penales</option>
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
                    {!isClientAuth && canEditProcess && (
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
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {lightboxSection === "legal" && "Evidencia - Investigación Legal"}
              {lightboxSection === "semanas" && "Evidencia - Semanas Cotizadas"}
              {lightboxSection === "penales" && "Evidencia - Antecedentes Penales"}
              {lightboxSection === "buro" && "Evidencia - Buró de Crédito"}
              {lightboxSection === "visita" && "Evidencia - Visita"}
            </DialogTitle>
          </DialogHeader>
          {
            (() => {
              const getImagesForSection = () => {
                switch(lightboxSection) {
                  case "legal": return (panelForm.investigacionLegal as any).evidenciasGraficas || [];
                  case "semanas": return (panelForm.semanasDetalle as any).evidenciasGraficas || [];
                  case "penales": return (panelForm.antecedentesPenales as any).evidenciasGraficas || [];
                  case "buro": return (panelForm.buroCredito as any).archivosAdicionales || [];
                  case "visita": return (panelForm.visitaDetalle as any).evidenciasGraficas || [];
                  default: return [];
                }
              };
              const images = getImagesForSection();
              const currentImage = images[lightboxIndex];
              return images.length > 0 && currentImage ? (
                <div className="space-y-3">
                  <img 
                    src={currentImage} 
                    alt="Lightbox" 
                    className="w-full max-h-96 object-contain rounded"
                  />
                  <div className="flex items-center justify-between text-sm">
                    <span>{lightboxIndex + 1} de {images.length}</span>
                    <div className="flex gap-2">
                       <Button variant="outline" size="sm" onClick={() => setLightboxIndex(Math.max(0, lightboxIndex - 1))} disabled={lightboxIndex === 0}>
                        <ChevronLeft className="h-4 w-4" /> Anterior
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setLightboxIndex(Math.min(images.length - 1, lightboxIndex + 1))} disabled={lightboxIndex === images.length - 1}>
                        Siguiente <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null;
            })()
          }
        </DialogContent>
      </Dialog>
    </div>
  );
}