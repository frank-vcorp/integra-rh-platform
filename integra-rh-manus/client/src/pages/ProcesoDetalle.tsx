import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, FileText, Save, FilePlus2, CalendarClock, Shield, Landmark, Home, UserCheck, AlertTriangle, ChevronRight, ChevronLeft } from "lucide-react";
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
      // FIX-20260220-01: Log de éxito en actualización
      console.log('[FIX-20260220-01] updatePanelDetail.onSuccess ejecutado - Changes guardados en BD');
      utils.processes.getById.invalidate({ id: processId });
      // También refrescamos la lista para que la columna "Responsable"
      // y los conteos de analista asignado se actualicen al instante.
      utils.processes.list.invalidate();
      toast.success("Bloques actualizados");
    },
    onError: (e:any) => {
      // FIX-20260220-01: Log de error en actualización
      console.error('[FIX-20260220-01] updatePanelDetail.onError:', {
        errorMessage: e.message,
        errorData: e
      });
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
    buroCredito: { estatus: "", score: "", aprobado: null as null | boolean },
    visitaDetalle: { tipo: "", comentarios: "", fechaRealizacion: "", enlaceReporteUrl: "" },
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
  const [lightboxSection, setLightboxSection] = useState<"legal" | "semanas">("legal");

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
      buroCredito: {
        estatus: (process as any).buroCredito?.estatus || "",
        score: (process as any).buroCredito?.score || "",
        aprobado: (process as any).buroCredito?.aprobado ?? null,
      },
      visitaDetalle: {
        tipo: (process as any).visitaDetalle?.tipo || "",
        comentarios: (process as any).visitaDetalle?.comentarios || "",
        fechaRealizacion: (process as any).visitaDetalle?.fechaRealizacion
          ? new Date((process as any).visitaDetalle?.fechaRealizacion).toISOString().split("T")[0]
          : "",
        enlaceReporteUrl: (process as any).visitaDetalle?.enlaceReporteUrl || "",
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

    return {
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
        semanasComentario: form.investigacionLegal.semanasComentario || undefined,
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
      buroCredito: {
        estatus: form.buroCredito.estatus || undefined,
        score: form.buroCredito.score || undefined,
        aprobado: form.buroCredito.aprobado === null ? undefined : form.buroCredito.aprobado,
        pdfUrl: (form.buroCredito as any).pdfUrl || undefined,
      },
      visitaDetalle: {
        tipo: (form.visitaDetalle.tipo as any) || undefined,
        comentarios: form.visitaDetalle.comentarios || undefined,
        fechaRealizacion: form.visitaDetalle.fechaRealizacion || undefined,
        enlaceReporteUrl: form.visitaDetalle.enlaceReporteUrl || undefined,
      },
      tipoProducto,
    };
    
    // FIX REFERENCE: FIX-20260220-01
    // Agregado console.log para debugging del payload (puede removerse después de validación)
    console.log('[FIX-20260220-01] getPanelPayload resultado:', JSON.stringify({payload: result, investigacionLegal: result.investigacionLegal, semanasDetalle: result.semanasDetalle}, null, 2));
    
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
              <p className="text-sm text-muted-foreground">Analista asignado</p>
              <p className="text-base font-semibold">
                {(process as any).responsableName || "Sin asignar"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Proceso a realizar</p>
              <div className="space-y-2">
                <select
                  className="border rounded-md h-9 px-2 w-full text-sm"
                  value={baseTipo}
                  disabled={!canEditProcess || isClientAuth}
                  onChange={(e) =>
                    setBaseTipo(e.target.value as ProcesoBaseType)
                  }
                >
                  {PROCESO_BASE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {baseTipo === "ILA" && (
                  <select
                    className="border rounded-md h-8 px-2 w-full text-xs"
                    value={ilaModo}
                    disabled={!canEditProcess || isClientAuth}
                    onChange={(e) =>
                      setIlaModo(e.target.value as IlaModoType)
                    }
                  >
                    <option value="NORMAL">
                      Normal (sin buró ni legal)
                    </option>
                    <option value="BURO">Con buró de crédito</option>
                    <option value="LEGAL">Con investigación legal</option>
                  </select>
                )}

                {baseTipo === "ESE" && (
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="border rounded-md h-8 px-2 w-full text-xs"
                      value={eseAmbito}
                      disabled={!canEditProcess || isClientAuth}
                      onChange={(e) =>
                        setEseAmbito(e.target.value as AmbitoType)
                      }
                    >
                      <option value="LOCAL">Local</option>
                      <option value="FORANEO">Foráneo</option>
                    </select>
                    <select
                      className="border rounded-md h-8 px-2 w-full text-xs"
                      value={eseExtra}
                      disabled={!canEditProcess || isClientAuth}
                      onChange={(e) =>
                        setEseExtra(
                          e.target.value as "NINGUNO" | "BURO" | "LEGAL"
                        )
                      }
                    >
                      <option value="NINGUNO">Sin complemento</option>
                      <option value="BURO">Con buró de crédito</option>
                      <option value="LEGAL">
                        Con investigación legal
                      </option>
                    </select>
                  </div>
                )}

                {baseTipo === "VISITA" && (
                  <select
                    className="border rounded-md h-8 px-2 w-full text-xs"
                    value={visitaAmbito}
                    disabled={!canEditProcess || isClientAuth}
                    onChange={(e) =>
                      setVisitaAmbito(e.target.value as AmbitoType)
                    }
                  >
                    <option value="LOCAL">Local</option>
                    <option value="FORANEO">Foránea</option>
                  </select>
                )}

                <p className="text-xs text-muted-foreground">
                  Valor actual en BD:{" "}
                  <span className="font-mono">{process.tipoProducto}</span>
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Medio de recepción</p>
              <p className="font-medium">{process.medioDeRecepcion || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Calificación final</p>
              <div className="flex flex-col gap-2 mt-1">
                <div className="flex items-center gap-2">
                  <select
                    id="calificacionFinal"
                    value={calificacion}
                    onChange={(e) => setCalificacion(e.target.value)}
                    className="border rounded-md h-9 px-2 flex-1"
                    disabled={!canEditProcess}
                  >
                    {CALIF.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <Button 
                    size="sm" 
                    disabled={updateCalif.isPending || !canEditProcess} 
                    onClick={() => {
                       updateCalif.mutate({ 
                         id: processId, 
                         calificacionFinal: calificacion as any,
                         comentarioCalificacion: (calificacion === 'recomendable' || calificacion === 'con_reservas') ? comentarioCalificacion : undefined
                       });
                    }}
                  >
                    <Save className="h-4 w-4 mr-1"/> Guardar
                  </Button>
                </div>
                
                {(calificacion === 'recomendable' || calificacion === 'con_reservas') && (
                  <Textarea
                    placeholder="Escribe un comentario o justificación del dictamen..."
                    value={comentarioCalificacion}
                    onChange={(e) => setComentarioCalificacion(e.target.value)}
                    className="mt-2 text-sm"
                    rows={3}
                    disabled={!canEditProcess}
                  />
                )}
              </div>

              {!isClientAuth &&
                iaDictamenCliente?.notaInternaAnalista &&
                process.calificacionFinal &&
                process.calificacionFinal !== "pendiente" && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Nota IA para el analista:{" "}
                    <span className="italic">
                      {iaDictamenCliente.notaInternaAnalista}
                    </span>
                  </p>
                )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estatus</p>
              <div className="flex items-center gap-2">
                <select
                  defaultValue={process.estatusProceso}
                  id="estatusProceso"
                  className="border rounded-md h-9 px-2"
                  disabled={!canEditProcess}
                >
                  {ESTATUS.map(e => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  disabled={updateStatus.isPending || !canEditProcess}
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

      {/* Guía de pasos para la analista */}
      {!isClientAuth && canEditProcess && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-blue-600" />
              📋 Guía rápida: Qué hacer después de agregar datos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">
              <li className="flex gap-2">
                <span className="font-semibold text-blue-600">1.</span>
                <span>Completa los <strong>campos de datos</strong> en los apartados de abajo (Investigación Laboral, Investigación Legal, Buró de Crédito, etc.)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-blue-600">2.</span>
                <span>Sube <strong>documentos</strong> (PDF, imágenes) en la sección de "Documentos" con su tipo correspondiente</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-blue-600">3.</span>
                <span>Une vez hayas terminado, haz clic en <strong>"Guardar bloques"</strong> (botón arriba a la derecha)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-blue-600">4.</span>
                <span>Verás una notificación <strong>"Bloques actualizados"</strong> cuando se guarde correctamente</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-blue-600">5.</span>
                <span>Los datos se guardan automáticamente en la base de datos y el cliente podrá verlos en su panel</span>
              </li>
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Bloques panel cliente (captura interna) */}
      <Card>
        <CardHeader className="flex items-center justify-between flex-row">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" /> Bloques de detalle (panel cliente)
          </CardTitle>
          {!isClientAuth && canEditProcess && (
            <Button size="sm" onClick={handleSavePanel} disabled={updatePanelDetail.isPending} className="bg-green-600 hover:bg-green-700">
              <Save className="h-4 w-4 mr-2" /> Guardar bloques
            </Button>
          )}
        </CardHeader>
	        <CardContent className="space-y-4">
	          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
	            <div>
	              <p className="text-sm text-muted-foreground">Estatus visual</p>
	              <select
	                className="border rounded-md h-10 px-3 w-full"
                value={panelForm.estatusVisual}
                onChange={e => setPanelForm(f => ({ ...f, estatusVisual: e.target.value }))}
                disabled={isClientAuth || !canEditProcess}
              >
                {ESTATUS_VISUAL.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fecha de cierre</p>
              <Input
                type="date"
                value={panelForm.fechaCierre}
                onChange={e => setPanelForm(f => ({ ...f, fechaCierre: e.target.value }))}
                disabled={isClientAuth || !canEditProcess}
              />
	            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded p-3 bg-white shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <p className="font-semibold">Investigación Laboral</p>
              </div>
              <Label className="text-xs">Resultado</Label>
              <Input
                value={panelForm.investigacionLaboral.resultado}
                onChange={e => setPanelForm(f => ({ ...f, investigacionLaboral: { ...f.investigacionLaboral, resultado: e.target.value } }))}
                disabled={isClientAuth || !canEditProcess}
              />
              <Label className="text-xs mt-2">Detalles</Label>
              <Textarea
                value={panelForm.investigacionLaboral.detalles}
                onChange={e => setPanelForm(f => ({ ...f, investigacionLaboral: { ...f.investigacionLaboral, detalles: e.target.value } }))}
                rows={2}
                disabled={isClientAuth || !canEditProcess}
              />
              <div className="mt-2 flex items-center gap-2 text-sm">
                <input
                  id="invLabDone"
                  type="checkbox"
                  checked={panelForm.investigacionLaboral.completado}
                  onChange={e => setPanelForm(f => ({ ...f, investigacionLaboral: { ...f.investigacionLaboral, completado: e.target.checked } }))}
                  disabled={isClientAuth || !canEditProcess}
                />
                <Label htmlFor="invLabDone">Marcado como completo</Label>
              </div>
            </div>

            <div className="border rounded p-3 bg-white shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Landmark className="h-4 w-4 text-indigo-600" />
                <p className="font-semibold">Investigación legal y documental</p>
              </div>
              <Label className="text-xs">Antecedentes</Label>
              <Input
                value={panelForm.investigacionLegal.antecedentes}
                onChange={e => setPanelForm(f => ({ ...f, investigacionLegal: { ...f.investigacionLegal, antecedentes: e.target.value } }))}
                disabled={isClientAuth || !canEditProcess}
              />
              
              <Label className="text-xs mt-2">Notas periodísticas / búsqueda en medios</Label>
              <Textarea
                value={panelForm.investigacionLegal.notasPeriodisticas}
                onChange={e =>
                  setPanelForm(f => ({
                    ...f,
                    investigacionLegal: {
                      ...f.investigacionLegal,
                      notasPeriodisticas: e.target.value,
                    },
                  }))
                }
                rows={2}
                disabled={isClientAuth || !canEditProcess}
              />

              <div className="mt-3">
                <Label className="text-xs">Evidencia Gráfica (Pegar del portapapeles - múltiples imágenes permitidas)</Label>
                <div
                  className="border-2 border-dashed rounded min-h-[100px] flex flex-col items-center justify-center p-2 bg-gray-50 mt-1 cursor-pointer hover:bg-gray-100 transition-colors"
                  tabIndex={0}
                  onPaste={async (e) => {
                    if (isClientAuth || !canEditProcess) return;
                    e.preventDefault();
                    const items = e.clipboardData.items;
                    let blob: File | null = null;
                    for (let i = 0; i < items.length; i++) {
                      if (items[i].type.indexOf("image") !== -1) {
                        blob = items[i].getAsFile();
                        break;
                      }
                    }
                    if (!blob) {
                      toast.error("No se detectó imagen en el portapapeles");
                      return;
                    }
                    try {
                      toast.info("Subiendo imagen pegada...");
                      const arrayBuf = await blob.arrayBuffer();
                      let binary = '';
                      const bytes = new Uint8Array(arrayBuf);
                      const len = bytes.byteLength;
                      for (let i = 0; i < len; i++) {
                        binary += String.fromCharCode(bytes[i]);
                      }
                      const base64 = btoa(binary);

                      // FIX-20260220-01: Debug log antes del upload
                      console.log('[FIX-20260220-01] onPaste Investigación Legal - Antes de upload:', {
                        procesoId: processId, tipoDocumento: 'EVIDENCIA_LEGAL', fileName: `paste-${Date.now()}.png`,
                        blobSize: blob.size, base64Length: base64.length
                      });

                      const res = await uploadProcessDoc.mutateAsync({ procesoId: processId, tipoDocumento: 'EVIDENCIA_LEGAL', fileName: `paste-${Date.now()}.png`, contentType: blob.type, base64 } as any);
                      
                      // FIX-20260220-01: Debug log después del upload
                      console.log('[FIX-20260220-01] onPaste Investigación Legal - Upload completado:', {
                        respuestaUrl: res.url,
                        estadoActualEvidencias: (panelForm.investigacionLegal as any).evidenciasGraficas
                      });

                      setPanelForm(currentForm => {
                        const newForm = { 
                          ...currentForm, 
                          investigacionLegal: { 
                            ...currentForm.investigacionLegal, 
                            evidenciasGraficas: [...(currentForm.investigacionLegal as any).evidenciasGraficas, res.url]
                          } 
                        };
                        
                        // FIX-20260220-01: Debug log antes de guardar
                        console.log('[FIX-20260220-01] onPaste Investigación Legal - Antes de updatePanelDetail.mutate:', {
                          evidenciasGraficasEnNuevoForm: (newForm.investigacionLegal as any).evidenciasGraficas,
                          payloadAEnviar: getPanelPayload(newForm)
                        });

                        const payload = getPanelPayload(newForm);
                        updatePanelDetail.mutate(payload);
                        
                        // FIX-20260220-01: Debug log después de setState
                        console.log('[FIX-20260220-01] onPaste Investigación Legal - SetPanelForm completado, estado local actualizado');
                        
                        return newForm;
                      });
                      toast.success("Evidencia guardada");
                    } catch (err: any) {
                      console.error('[FIX-20260220-01] Error en onPaste Investigación Legal:', err);
                      toast.error("Error al subir: " + err.message);
                    }
                  }}
                >
                  {(panelForm.investigacionLegal as any).evidenciasGraficas?.length > 0 ? (
                    <div className="w-full">
                      <div className="grid grid-cols-3 gap-2">
                        {(panelForm.investigacionLegal as any).evidenciasGraficas.map((url: string, idx: number) => (
                          <div key={idx} className="relative group">
                            <img 
                              src={url} 
                              alt={`Evidencia ${idx + 1}`} 
                              className="h-20 w-20 object-cover rounded shadow-sm cursor-pointer hover:opacity-80 transition-opacity" 
                              onClick={() => { setLightboxSection("legal"); setLightboxIndex(idx); setLightboxOpen(true); }}
                            />
                            <Button size="sm" variant="destructive" className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 h-5 w-5 p-0" onClick={(e) => {
                              e.stopPropagation();
                              setPanelForm(f => ({ ...f, investigacionLegal: { ...f.investigacionLegal, evidenciasGraficas: (f.investigacionLegal as any).evidenciasGraficas.filter((_: string, i: number) => i !== idx) } }));
                            }}>×</Button>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Haz click en una imagen para agrandar • Pega otra imagen o haz clic en X para eliminar ({(panelForm.investigacionLegal as any).evidenciasGraficas?.length || 0})</p>
                    </div>
                  ) : (
                    <div className="text-center text-gray-400">
                      <p className="text-xs">Haz clic aquí y presiona CTRL+V para pegar imágenes</p>
                    </div>
                  )}
                </div>
              </div>
              {/* Observaciones IMSS removido - trasladado a semanasDetalle */}
              <div className="mt-2 flex items-center gap-2 text-sm">
                <input
                  id="invLegalRiesgo"
                  type="checkbox"
                  checked={panelForm.investigacionLegal.flagRiesgo}
                  onChange={e => setPanelForm(f => ({ ...f, investigacionLegal: { ...f.investigacionLegal, flagRiesgo: e.target.checked } }))}
                  disabled={isClientAuth || !canEditProcess}
                />
                <Label htmlFor="invLegalRiesgo">Con riesgo</Label>
              </div>
            </div>

            {/* SEMANAS COTIZADAS - Bloque separado */}
            <div className="border rounded p-3 bg-white shadow-sm">
              <h3 className="text-sm font-bold text-blue-900 mb-3">SEMANAS COTIZADAS</h3>
              
              <Label className="text-xs">Comentario sobre cotejo de semanas cotizadas</Label>
              <Textarea
                value={panelForm.semanasDetalle.comentario}
                onChange={e =>
                  setPanelForm(f => ({
                    ...f,
                    semanasDetalle: {
                      ...f.semanasDetalle,
                      comentario: e.target.value,
                    },
                  }))
                }
                rows={2}
                disabled={isClientAuth || !canEditProcess}
                placeholder="Registra aquí los detalles del cotejo de semanas cotizadas"
              />

              <div className="mt-3">
                <Label className="text-xs">Evidencia de Semanas (Pegar del portapapeles - múltiples imágenes permitidas)</Label>
                <div
                  className="border-2 border-dashed rounded min-h-[100px] flex flex-col items-center justify-center p-2 bg-blue-50 mt-1 cursor-pointer hover:bg-blue-100 transition-colors"
                  tabIndex={0}
                  onPaste={async (e) => {
                    if (isClientAuth || !canEditProcess) return;
                    e.preventDefault();
                    const items = e.clipboardData.items;
                    let blob: File | null = null;
                    for (let i = 0; i < items.length; i++) {
                      if (items[i].type.indexOf("image") !== -1) {
                        blob = items[i].getAsFile();
                        break;
                      }
                    }
                    if (!blob) {
                      toast.error("No se detectó imagen en el portapapeles");
                      return;
                    }
                    try {
                      toast.info("Subiendo imagen pegada...");
                      const arrayBuf = await blob.arrayBuffer();
                      let binary = '';
                      const bytes = new Uint8Array(arrayBuf);
                      const len = bytes.byteLength;
                      for (let i = 0; i < len; i++) {
                        binary += String.fromCharCode(bytes[i]);
                      }
                      const base64 = btoa(binary);

                      // FIX-20260220-01: Debug log antes del upload
                      console.log('[FIX-20260220-01] onPaste Semanas Cotizadas - Antes de upload:', {
                        procesoId: processId, tipoDocumento: 'SEMANAS_COTIZADAS', fileName: `paste-${Date.now()}.png`,
                        blobSize: blob.size, base64Length: base64.length
                      });

                      const res = await uploadProcessDoc.mutateAsync({ procesoId: processId, tipoDocumento: 'SEMANAS_COTIZADAS', fileName: `paste-${Date.now()}.png`, contentType: blob.type, base64 } as any);
                      
                      // FIX-20260220-01: Debug log después del upload
                      console.log('[FIX-20260220-01] onPaste Semanas Cotizadas - Upload completado:', {
                        respuestaUrl: res.url,
                        estadoActualEvidencias: (panelForm.semanasDetalle as any).evidenciasGraficas
                      });

                      setPanelForm(currentForm => {
                        const newForm = { 
                          ...currentForm, 
                          semanasDetalle: { 
                            ...currentForm.semanasDetalle, 
                            evidenciasGraficas: [...(currentForm.semanasDetalle as any).evidenciasGraficas, res.url]
                          } 
                        };
                        
                        // FIX-20260220-01: Debug log antes de guardar
                        console.log('[FIX-20260220-01] onPaste Semanas Cotizadas - Antes de updatePanelDetail.mutate:', {
                          evidenciasGraficasEnNuevoForm: (newForm.semanasDetalle as any).evidenciasGraficas,
                          payloadAEnviar: getPanelPayload(newForm)
                        });

                        const payload = getPanelPayload(newForm);
                        updatePanelDetail.mutate(payload);
                        
                        // FIX-20260220-01: Debug log después de setState
                        console.log('[FIX-20260220-01] onPaste Semanas Cotizadas - SetPanelForm completado, estado local actualizado');
                        
                        return newForm;
                      });
                      toast.success("Evidencia guardada");
                    } catch (err: any) {
                      console.error('[FIX-20260220-01] Error en onPaste Semanas Cotizadas:', err);
                      toast.error("Error al subir: " + err.message);
                    }
                  }}
                >
                  {(panelForm.semanasDetalle as any).evidenciasGraficas?.length > 0 ? (
                    <div className="w-full">
                      <div className="grid grid-cols-3 gap-2">
                        {(panelForm.semanasDetalle as any).evidenciasGraficas.map((url: string, idx: number) => (
                          <div key={idx} className="relative group">
                            <img 
                              src={url} 
                              alt={`Semanas ${idx + 1}`} 
                              className="h-20 w-20 object-cover rounded shadow-sm cursor-pointer hover:opacity-80 transition-opacity" 
                              onClick={() => { setLightboxSection("semanas"); setLightboxIndex(idx); setLightboxOpen(true); }}
                            />
                            <Button size="sm" variant="destructive" className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 h-5 w-5 p-0" onClick={(e) => {
                              e.stopPropagation();
                              setPanelForm(f => ({ ...f, semanasDetalle: { ...f.semanasDetalle, evidenciasGraficas: (f.semanasDetalle as any).evidenciasGraficas.filter((_: string, i: number) => i !== idx) } }));
                            }}>×</Button>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-600 mt-2">Haz click en una imagen para agrandar • Pega otra imagen o haz clic en X para eliminar ({(panelForm.semanasDetalle as any).evidenciasGraficas?.length || 0})</p>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500">
                      <p className="text-xs">Haz clic aquí y presiona CTRL+V para pegar imágenes</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Antecedentes Penales */}
            <div className="border rounded p-3 bg-white shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <p className="font-semibold">Antecedentes Penales</p>
              </div>
                <div className="mt-2 p-2 bg-gray-50 rounded border border-dashed">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={async (e) => {
                      const files = e.currentTarget.files;
                      if (files && !isClientAuth && canEditProcess) {
                        for (let i = 0; i < files.length; i++) {
                          const file = files[i];
                          const arrayBuf = await file.arrayBuffer();
                          let binary = '';
                          const bytes = new Uint8Array(arrayBuf);
                          const len = bytes.byteLength;
                          for (let j = 0; j < len; j++) {
                            binary += String.fromCharCode(bytes[j]);
                          }
                          const base64 = btoa(binary);
                          uploadProcessDoc.mutate({ 
                            procesoId: processId, 
                            tipoDocumento: 'ANTECEDENTES_PENALES', 
                            fileName: file.name, 
                            contentType: file.type || 'application/octet-stream', 
                            base64 
                          } as any);
                        }
                      }
                      (e.currentTarget as HTMLInputElement).value = '';
                    }}
                    disabled={isClientAuth || !canEditProcess}
                    className="block w-full text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Soporta: PDF, JPG, PNG (múltiples archivos)</p>
                </div>
              </div>

            <div className="border rounded p-3 bg-white shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-amber-600" />
                <p className="font-semibold">Buró de Crédito</p>
              </div>

              {(panelForm.buroCredito as any)?.pdfUrl ? (
                <div className="flex items-center gap-3 border p-2 rounded bg-green-50">
                   <FileText className="h-5 w-5 text-green-600"/>
                   <div className="flex-1 overflow-hidden">
                     <p className="text-xs font-medium truncate">Reporte cargado</p>
                     <a href={(panelForm.buroCredito as any).pdfUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline block truncate">Ver Documento</a>
                   </div>
                   <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                       setPanelForm(currentForm => {
                          const newForm = { 
                            ...currentForm, 
                            buroCredito: { ...currentForm.buroCredito, pdfUrl: null } as any 
                          };
                          updatePanelDetail.mutate(getPanelPayload(newForm));
                          return newForm;
                       });
                   }}>Eliminar</Button>
                </div>
              ) : (
                <div className="border-2 border-dashed p-4 text-center rounded hover:bg-gray-50 transition-colors">
                   <input type="file" id="buro-pdf-upload" className="hidden" accept="application/pdf" onChange={async (e) => {
                      const file = e.currentTarget.files?.[0];
                      if (!file) return;
                      try {
                        toast.info("Subiendo Reporte PDF...");
                        const arrayBuf = await file.arrayBuffer();
                        let binary = '';
                        const bytes = new Uint8Array(arrayBuf);
                        const len = bytes.byteLength;
                        for (let i = 0; i < len; i++) {
                            binary += String.fromCharCode(bytes[i]);
                        }
                        const base64 = btoa(binary);

                        // Upload doc
                        const res = await uploadProcessDoc.mutateAsync({ procesoId: processId, tipoDocumento: 'BURO_CREDITO', fileName: file.name, contentType: file.type, base64 } as any);
                        
                        // Update JSON
                        setPanelForm(currentForm => {
                          const newForm = { 
                            ...currentForm, 
                            buroCredito: { pdfUrl: res.url } as any 
                          };
                          updatePanelDetail.mutate(getPanelPayload(newForm));
                          return newForm;
                        });
                        toast.success("PDF vinculado");
                      } catch (err) {
                        toast.error("Error al subir");
                      }
                      e.target.value = '';
                   }}/>
                   <Label htmlFor="buro-pdf-upload" className="cursor-pointer block">
                      <div className="bg-amber-100 p-2 rounded-full w-fit mx-auto mb-2">
                        <FileText className="h-5 w-5 text-amber-600"/>
                      </div>
                      <span className="text-xs font-semibold text-gray-700">Subir Reporte PDF</span>
                      <p className="text-[10px] text-gray-400 mt-1">Clic aquí para seleccionar</p>
                   </Label>
                </div>
              )}

              {/* Buró de Crédito - Carga de archivos Extra (Legacy support or extras) */}
              <div className="mt-4 pt-3 border-t">
                <Label className="text-xs font-semibold">Archivos Adicionales (Opcional)</Label>
                <div className="mt-2 p-2 bg-gray-50 rounded border border-dashed">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={async (e) => {
                      const files = e.currentTarget.files;
                      if (files && !isClientAuth && canEditProcess) {
                        for (let i = 0; i < files.length; i++) {
                          const file = files[i];
                          const arrayBuf = await file.arrayBuffer();
                          let binary = '';
                          const bytes = new Uint8Array(arrayBuf);
                          const len = bytes.byteLength;
                          for (let j = 0; j < len; j++) {
                            binary += String.fromCharCode(bytes[j]);
                          }
                          const base64 = btoa(binary);
                          uploadProcessDoc.mutate({ 
                            procesoId: processId, 
                            tipoDocumento: 'BURO_CREDITO', 
                            fileName: file.name, 
                            contentType: file.type || 'application/octet-stream', 
                            base64 
                          } as any);
                        }
                      }
                      (e.currentTarget as HTMLInputElement).value = '';
                    }}
                    disabled={isClientAuth || !canEditProcess}
                    className="block w-full text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Soporta: PDF, JPG, PNG (múltiples archivos)</p>
                </div>
              </div>
            </div>

            <div className="border rounded p-3 bg-white shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Home className="h-4 w-4 text-emerald-600" />
                <p className="font-semibold">Visita (virtual/presencial)</p>
              </div>
              <Label className="text-xs">Tipo</Label>
              <select
                className="border rounded-md h-9 px-2 w-full"
                value={panelForm.visitaDetalle.tipo}
                onChange={e => setPanelForm(f => ({ ...f, visitaDetalle: { ...f.visitaDetalle, tipo: e.target.value } }))}
                disabled={isClientAuth}
              >
                <option value="">Sin definir</option>
                <option value="virtual">Virtual</option>
                <option value="presencial">Presencial</option>
              </select>
              <Label className="text-xs mt-2">Fecha realización</Label>
              <Input
                type="date"
                value={panelForm.visitaDetalle.fechaRealizacion}
                onChange={e => setPanelForm(f => ({ ...f, visitaDetalle: { ...f.visitaDetalle, fechaRealizacion: e.target.value } }))}
                disabled={isClientAuth}
              />
              <Label className="text-xs mt-2">Comentarios</Label>
              <Textarea
                value={panelForm.visitaDetalle.comentarios}
                onChange={e => setPanelForm(f => ({ ...f, visitaDetalle: { ...f.visitaDetalle, comentarios: e.target.value } }))}
                rows={2}
                disabled={isClientAuth}
              />
              <Label className="text-xs mt-2">Enlace a reporte</Label>
              <Input
                value={panelForm.visitaDetalle.enlaceReporteUrl}
                onChange={e => setPanelForm(f => ({ ...f, visitaDetalle: { ...f.visitaDetalle, enlaceReporteUrl: e.target.value } }))}
                disabled={isClientAuth}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">Captura interna; el cliente solo lo ve en modo lectura.</p>
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

      {/* Lightbox Modal para galerías */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {lightboxSection === "legal" ? "Evidencia - Investigación Legal" : "Evidencia - Semanas Cotizadas"}
            </DialogTitle>
          </DialogHeader>
          {
            lightboxSection === "legal" 
              ? ((panelForm.investigacionLegal as any).evidenciasGraficas?.length > 0 && (
                  <div className="space-y-3">
                    <img 
                      src={(panelForm.investigacionLegal as any).evidenciasGraficas[lightboxIndex]} 
                      alt="Lightbox" 
                      className="w-full max-h-96 object-contain rounded"
                    />
                    <div className="flex items-center justify-between text-sm">
                      <span>{lightboxIndex + 1} de {(panelForm.investigacionLegal as any).evidenciasGraficas.length}</span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setLightboxIndex(Math.max(0, lightboxIndex - 1))} disabled={lightboxIndex === 0}>
                          <ChevronLeft className="h-4 w-4" /> Anterior
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setLightboxIndex(Math.min((panelForm.investigacionLegal as any).evidenciasGraficas.length - 1, lightboxIndex + 1))} disabled={lightboxIndex === (panelForm.investigacionLegal as any).evidenciasGraficas.length - 1}>
                          Siguiente <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              : ((panelForm.semanasDetalle as any).evidenciasGraficas?.length > 0 && (
                  <div className="space-y-3">
                    <img 
                      src={(panelForm.semanasDetalle as any).evidenciasGraficas[lightboxIndex]} 
                      alt="Lightbox" 
                      className="w-full max-h-96 object-contain rounded"
                    />
                    <div className="flex items-center justify-between text-sm">
                      <span>{lightboxIndex + 1} de {(panelForm.semanasDetalle as any).evidenciasGraficas.length}</span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setLightboxIndex(Math.max(0, lightboxIndex - 1))} disabled={lightboxIndex === 0}>
                          <ChevronLeft className="h-4 w-4" /> Anterior
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setLightboxIndex(Math.min((panelForm.semanasDetalle as any).evidenciasGraficas.length - 1, lightboxIndex + 1))} disabled={lightboxIndex === (panelForm.semanasDetalle as any).evidenciasGraficas.length - 1}>
                          Siguiente <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
          }
        </DialogContent>
      </Dialog>

    </div>
  );
}




