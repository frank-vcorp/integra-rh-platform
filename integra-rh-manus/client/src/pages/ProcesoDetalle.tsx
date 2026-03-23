/**
 * Panel operativo de procesos con edición auditada de la captura de visita.
 * @intervention ARCH-20260320-01
 * @respaldo PROYECTO.md
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { VisitCapturePanel } from "@/components/VisitCapturePanel";
import { ArrowLeft, FileText, Save, FilePlus2, CalendarClock, Shield, Landmark, Home, UserCheck, AlertTriangle, ChevronRight, ChevronLeft, Briefcase, CheckCircle2, MessageCircle, Share2 } from "lucide-react";
import { Link, useParams } from "wouter";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { useEffect, useMemo, useState } from "react";
import { useHasPermission } from "@/_core/hooks/usePermission";
import { getCalificacionLabel } from "@/lib/dictamen";
import {
  AmbitoType,
  IlaModoType,
  PROCESO_BASE_OPTIONS,
  ProcesoBaseType,
  ProcesoConfig,
  mapProcesoConfigToTipoProducto,
  parseTipoProductoToConfig,
} from "@/lib/procesoTipo";

const ARMADOS_SECTION_OPTIONS = [
  { value: "generales_candidato", label: "Generales del candidato", description: "Datos base del candidato, proceso y puesto." },
  { value: "documentos", label: "Documentos", description: "Soportes cargados en expediente y cotejo documental." },
  { value: "investigacion_laboral", label: "Investigación laboral", description: "Historial laboral y dictamen laboral existente." },
  { value: "investigacion_legal", label: "Investigación legal", description: "Hallazgos legales, notas periodísticas y antecedentes." },
  { value: "semanas_cotizadas", label: "Semanas cotizadas", description: "Cotejo IMSS y evidencias relacionadas." },
  { value: "buro_credito", label: "Buró de crédito", description: "Reporte y archivos adicionales del buró." },
  { value: "visita_domiciliaria", label: "Visita domiciliaria", description: "Captura del encuestador y resumen interno de visita." },
  { value: "observaciones_conclusion", label: "Observaciones y conclusión", description: "Calificación final y cierre ejecutivo del proceso." },
] as const;

type ArmadosSectionValue = (typeof ARMADOS_SECTION_OPTIONS)[number]["value"];

// ── Botón para generar y descargar el PDF del estudio socioeconómico ─────────
function PdfEstudioButton({ processId }: { processId: number }) {
  const genPdf = trpc.surveyorPortal.generateStudyPDF.useMutation({
    onSuccess: (data) => {
      window.open(data.url, "_blank");
    },
  });
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={genPdf.isPending}
      onClick={() => genPdf.mutate({ processId })}
      className="flex items-center gap-1 text-blue-700 border-blue-300 hover:bg-blue-50"
    >
      {genPdf.isPending ? (
        <>
          <span className="animate-spin w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full" />
          Generando PDF...
        </>
      ) : (
        <>
          <FileText className="h-4 w-4" />
          PDF Estudio
        </>
      )}
      {genPdf.isError && <span className="text-red-500 text-xs ml-1">Error</span>}
    </Button>
  );
}

function buildStudyPdfWhatsappUrl(phone: string | null | undefined, text: string) {
  const digits = (phone || "").replace(/[^0-9]/g, "");
  if (!digits) {
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }
  return `https://wa.me/${encodeURIComponent(digits)}?text=${encodeURIComponent(text)}`;
}

function ShareStudyPdfWhatsappButton({
  processId,
  phone,
  clientLabel,
  candidateLabel,
}: {
  processId: number;
  phone?: string | null;
  clientLabel?: string | null;
  candidateLabel?: string | null;
}) {
  const sharePdf = trpc.surveyorPortal.generateStudyPDF.useMutation({
    onSuccess: (data) => {
      const message = [
        `Hola ${clientLabel || ""},`,
        `te compartimos el PDF del estudio socioeconómico${candidateLabel ? ` de ${candidateLabel}` : ""}.`,
        "",
        `Consulta el documento aquí: ${data.url}`,
      ].join("\n");
      window.open(buildStudyPdfWhatsappUrl(phone, message), "_blank", "noopener,noreferrer");
    },
    onError: (error: any) => {
      toast.error(error.message || "No se pudo preparar el PDF para WhatsApp");
    },
  });

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={sharePdf.isPending}
      onClick={() => sharePdf.mutate({ processId, auditChannel: "whatsapp" })}
      className="flex items-center gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
    >
      {sharePdf.isPending ? (
        <>
          <span className="animate-spin w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full" />
          Preparando...
        </>
      ) : (
        <>
          <MessageCircle className="h-4 w-4" />
          Compartir PDF
        </>
      )}
    </Button>
  );
}

export default function ProcesoDetalle() {
  const params = useParams();
  const processId = parseInt(params.id || "0");
  const { data: process, isLoading } = trpc.processes.getById.useQuery({ id: processId });
  const { data: workHistory = [] } = trpc.workHistory.getByCandidate.useQuery(
    { candidatoId: process?.candidatoId || 0 },
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
    onSuccess: () => {
      utils.processes.getById.invalidate({ id: processId });
      utils.processes.getScoreAudit.invalidate({ id: processId });
    },
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
  const { data: clients = [] } = trpc.clients.list.useQuery();
  const { data: candidates = [] } = trpc.candidates.list.useQuery();
  const { data: posts = [] } = trpc.posts.list.useQuery();
  const [lastSurveyorToken, setLastSurveyorToken] = useState<string | null>(null);
  const visitSchedule = trpc.processes.visitSchedule.useMutation({
    onSuccess: (data: any) => {
      utils.processes.getById.invalidate({ id: processId });
      if (data?.surveyorToken) setLastSurveyorToken(data.surveyorToken);
    },
  });
  const visitUpdate = trpc.processes.visitUpdate.useMutation({ onSuccess: () => utils.processes.getById.invalidate({ id: processId }) });
  const visitDone = trpc.processes.visitMarkDone.useMutation({ onSuccess: () => utils.processes.getById.invalidate({ id: processId }) });
  const visitCancel = trpc.processes.visitCancel.useMutation({ onSuccess: () => utils.processes.getById.invalidate({ id: processId }) });
  const updateVisitCapture = trpc.processes.updateVisitCapture.useMutation({
    onSuccess: (data) => {
      utils.processes.getById.invalidate({ id: processId });
      utils.processes.getVisitCaptureAudit.invalidate({ id: processId });
      toast.success(data.changedFields > 0 ? `Captura actualizada (${data.changedFields} cambios)` : "Sin cambios para guardar");
    },
    onError: (error: any) => {
      toast.error(error.message || "No se pudo guardar la captura");
    },
  });
  const [visitForm, setVisitForm] = useState<{ encuestadorId: string; fechaHora: string; direccion: string; observaciones: string }>({ encuestadorId: "", fechaHora: "", direccion: "", observaciones: "" });
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifySelected, setNotifySelected] = useState<number[]>([]);
  const [suggested, setSuggested] = useState<any[]>([]);
  const [visitCaptureOpen, setVisitCaptureOpen] = useState(false);
  const canEditProcess = useHasPermission("procesos", "edit");
  const getSurveyor = (id?: number) => surveyors.find((s: any) => s.id === id);
  const surveyorPortalAccess = (process as any)?.surveyorPortalAccess;
  const surveyorPortalUrl = lastSurveyorToken
    ? `https://integra-rh.web.app/e/${lastSurveyorToken}`
    : surveyorPortalAccess?.url || null;
  const surveyorPortalStatus = lastSurveyorToken ? "PENDIENTE" : surveyorPortalAccess?.status || null;
  const hasCapturedVisitData = !!(process as any)?.visitaDetalle && Object.keys((process as any).visitaDetalle || {}).length > 0;
  const processIsVisitCompleted = process?.estatusProceso === "visita_realizada" || process?.visitStatus?.status === "realizada" || surveyorPortalStatus === "COMPLETADO";
  const candidateRecord = useMemo(
    () => (candidates.find((candidate: any) => candidate.id === process?.candidatoId) as any) || null,
    [candidates, process?.candidatoId]
  );
  const clientRecord = useMemo(
    () => (clients.find((client: any) => client.id === process?.clienteId) as any) || null,
    [clients, process?.clienteId]
  );
  const postRecord = useMemo(
    () => (posts.find((item: any) => item.id === process?.puestoId) as any) || null,
    [posts, process?.puestoId]
  );
  const visitPrivacyAcceptedAt = (process as any)?.visitaDetalle?._privacyAcceptedAt || null;
  const buildArmadoSnapshot = () => ({
    generatedAt: new Date().toISOString(),
    selectedSections: selectedArmadosSections,
    candidate: candidateRecord || null,
    client: clientRecord || null,
    post: postRecord || null,
    process: {
      id: process?.id,
      clave: process?.clave,
      tipoProducto: process?.tipoProducto,
      estatusProceso: process?.estatusProceso,
      calificacionFinal: process?.calificacionFinal,
      comentarioCalificacion: (process as any)?.comentarioCalificacion || null,
      investigacionLaboral: (process as any)?.investigacionLaboral || null,
      investigacionLegal: (process as any)?.investigacionLegal || null,
      semanasDetalle: (process as any)?.semanasDetalle || null,
      antecedentesPenales: (process as any)?.antecedentesPenales || null,
      buroCredito: (process as any)?.buroCredito || null,
      visitaDetalle: (process as any)?.visitaDetalle || null,
      visitStatus: (process as any)?.visitStatus || null,
    },
    workHistory,
    documents,
  });
  const handleGenerateLegacyDraft = async () => {
    if (!process) return;
    if (selectedArmadosSections.length === 0) {
      toast.error("Selecciona al menos una sección para registrar el borrador");
      return;
    }

    await createLegacyReportDraft.mutateAsync({
      id: processId,
      sections: selectedArmadosSections,
      snapshot: buildArmadoSnapshot(),
    } as any);
  };
  const handleOpenReportVersion = async (versionId: number) => {
    try {
      const data = await openReportVersion.mutateAsync({ versionId });
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      toast.error(error.message || "No se pudo abrir la versión");
    }
  };

  const handlePreviewHtml = async (versionId: number) => {
    try {
      const data = await getVersionHtml.mutateAsync({ versionId });
      if ((data as any)?.html) {
        const blob = new Blob([(data as any).html], { type: "text/html;charset=utf-8" });
        const blobUrl = URL.createObjectURL(blob);
        const win = window.open(blobUrl, "_blank");
        // Revocar la URL después de 60 s para liberar memoria
        if (win) {
          setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
        }
      }
    } catch (error: any) {
      toast.error(error.message || "No se pudo generar la vista previa HTML");
    }
  };

  const handleConfirmPublish = (versionId: number) => {
    setVersionToPublish(versionId);
    setConfirmPublishOpen(true);
  };
  const handleSharePublishedVersion = async () => {
    if (!publishedReportSummary) return;

    try {
      const data = await openReportVersion.mutateAsync({ versionId: publishedReportSummary.id });
      if (!data?.url) {
        toast.error("La versión publicada no tiene un PDF accesible");
        return;
      }

      const message = [
        `Hola ${clientRecord?.contacto || clientRecord?.nombreEmpresa || ""},`,
        `te compartimos el PDF publicado del estudio socioeconómico${candidateRecord?.nombreCompleto ? ` de ${candidateRecord.nombreCompleto}` : ""}.`,
        "",
        `Consulta el documento aquí: ${data.url}`,
      ].join("\n");
      window.open(buildStudyPdfWhatsappUrl(clientRecord?.telefono, message), "_blank", "noopener,noreferrer");
    } catch (error: any) {
      toast.error(error.message || "No se pudo preparar el PDF publicado para compartir");
    }
  };
  const handleDeleteReportVersion = async (version: any) => {
    if (version.status === "published") {
      toast.error("La versión publicada no puede eliminarse desde este flujo");
      return;
    }

    const confirmed = confirm(`¿Eliminar la versión v${version.versionNumber}? Esta acción borra también su PDF asociado.`);
    if (!confirmed) return;

    deleteReportVersion.mutate({ versionId: version.id });
  };
  const { data: visitCaptureAudit = [] } = trpc.processes.getVisitCaptureAudit.useQuery(
    { id: processId },
    { enabled: !isClientAuth && canEditProcess && visitCaptureOpen }
  );
  /** @intervention IMPL-20260320-02 — historial de calificación final */
  const { data: scoreAudit = [] } = trpc.processes.getScoreAudit.useQuery(
    { id: processId },
    { enabled: !isClientAuth && canEditProcess }
  );
  const buildMapsUrl = (address?: string) => address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : '';
  const buildVisitMessage = (opts: { encNombre?: string; candidato?: any; fechaISO?: string; direccion?: string; observaciones?: string; surveyorToken?: string | null; }) => {
    const fecha = opts.fechaISO ? new Date(opts.fechaISO).toLocaleString() : 'Por confirmar';
    const line = (k:string,v?:string)=> v? `\n- ${k}: ${v}`: '';
    const maps = buildMapsUrl(opts.direccion);
    const formUrl = opts.surveyorToken ? `https://integra-rh.web.app/e/${opts.surveyorToken}` : null;
    return (
      `Hola ${opts.encNombre || ''}, te comparto los datos para la visita:` +
      line('Candidato', opts.candidato?.nombreCompleto) +
      line('Tel. candidato', opts.candidato?.telefono) +
      line('Fecha/Hora', fecha) +
      line('Dirección', opts.direccion) +
      (maps ? `\n- Maps: ${maps}` : '') +
      line('Observaciones', opts.observaciones) +
      (formUrl ? `\n- Formulario de visita: ${formUrl}` : '') +
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
  const { data: users = [] } = trpc.users.list.useQuery(undefined as any, {
    enabled: !isClientAuth,
  } as any);
  const { data: allProcesses = [] } = trpc.processes.list.useQuery(undefined as any, {
    enabled: !isClientAuth,
  } as any);
  const { data: documents = [] } = trpc.documents.getByProcess.useQuery({ procesoId: processId });
  const { data: reportVersions = [] } = trpc.processes.listReportVersions.useQuery(
    { id: processId },
    { enabled: !isClientAuth && processId > 0 }
  );
  const { data: publishedReportSummary } = trpc.processes.getPublishedReportSummary.useQuery(
    { id: processId },
    { enabled: !isClientAuth && processId > 0 }
  );
  const createClientLink = trpc.clientAccess.create.useMutation({
    onSuccess: async () => {
      if (process?.clienteId) {
        await utils.clientAccess.listActiveTokens.invalidate({ clientId: process.clienteId });
      }
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

  /**
   * @intervention ARCH-20260321-06
   * @respaldo PROYECTO.md
   */
  const handleShareClientDashboardAccess = async () => {
    if (!process?.clienteId) return;

    const existingToken = (activeTokens as any[])[0]?.token;
    const dashboardUrl = existingToken
      ? `${window.location.origin}/cliente/${existingToken}`
      : (
          await createClientLink.mutateAsync({
            clientId: process.clienteId,
            procesoId: processId,
            candidatoId: process.candidatoId ?? undefined,
            ttlDays: 14,
            baseUrl: window.location.origin,
            emailContext: {
              nombreEmpresa: clientRecord?.nombreEmpresa,
              nombreCandidato: candidateRecord?.nombreCompleto,
              claveProceso: process?.clave,
            },
          } as any)
        ).url;

    const shareTitle = clientRecord?.nombreEmpresa
      ? `Dashboard cliente ${clientRecord.nombreEmpresa}`
      : "Dashboard del cliente";
    const shareText = candidateRecord?.nombreCompleto
      ? `Acceso al dashboard del cliente para seguimiento del proceso de ${candidateRecord.nombreCompleto}.`
      : "Acceso al dashboard del cliente para seguimiento de procesos.";

    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: dashboardUrl });
        toast.success(existingToken ? "URL del cliente compartida" : "Acceso del cliente generado y compartido");
        return;
      } catch (error: any) {
        if (error?.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard?.writeText(dashboardUrl);
      toast.success(existingToken ? "URL del cliente copiada" : "Acceso del cliente generado y copiado");
    } catch {
      window.open(dashboardUrl, "_blank", "noopener,noreferrer");
      toast.success(existingToken ? "URL del cliente abierta" : "Acceso del cliente generado y abierto");
    }
  };

  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const uploadProcessDoc = trpc.documents.upload.useMutation({
    onSuccess: () => {
      utils.documents.getByProcess.invalidate({ procesoId: processId });
    }
  });

  /**
   * Helper seguro para subir archivos del proceso.
   * Evita Uncaught Promise y muestra toast de error descriptivo en caso de fallo.
   * @intervention IMPL-20260320-12
   * @respaldo context/interconsultas/ARCH-20260320-12
   */
  const handleUpload = async (
    params: Parameters<typeof uploadProcessDoc.mutateAsync>[0],
    onSuccess: (url: string) => void,
  ) => {
    toast.info('Subiendo...');
    try {
      const res = await uploadProcessDoc.mutateAsync(params);
      onSuccess(res.url);
      toast.success('Documento cargado');
    } catch (err: any) {
      const msg: string = err?.message ?? '';
      const isCredError = msg.includes('invalid_grant') || msg.includes('invalid_rapt') || msg.includes('autenticación');
      toast.error(
        isCredError
          ? 'Error de credenciales Firebase. Contacta al administrador del servidor.'
          : `Error al subir archivo: ${msg || 'intenta de nuevo'}`,
      );
    }
  };
  const deleteDoc = trpc.documents.delete.useMutation({
    onSuccess: () => utils.documents.getByProcess.invalidate({ procesoId: processId })
  });
  const createLegacyReportDraft = trpc.processes.createLegacyReportDraft.useMutation({
    onSuccess: async () => {
      await utils.processes.listReportVersions.invalidate({ id: processId });
      toast.success("Borrador de Armados registrado");
    },
    onError: (error: any) => {
      toast.error(error.message || "No se pudo registrar el borrador");
    },
  });
  const publishReportVersion = trpc.processes.publishReportVersion.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.processes.listReportVersions.invalidate({ id: processId }),
        utils.processes.getPublishedReportSummary.invalidate({ id: processId }),
      ]);
      toast.success("Versión publicada para cliente");
    },
    onError: (error: any) => {
      toast.error(error.message || "No se pudo publicar la versión");
    },
  });
  const deleteReportVersion = trpc.processes.deleteReportVersion.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.processes.listReportVersions.invalidate({ id: processId }),
        utils.processes.getPublishedReportSummary.invalidate({ id: processId }),
      ]);
      toast.success("Versión eliminada");
    },
    onError: (error: any) => {
      toast.error(error.message || "No se pudo eliminar la versión");
    },
  });
  const openReportVersion = trpc.processes.getReportVersionAccess.useMutation();
  const getVersionHtml = trpc.processes.getReportVersionHtml.useMutation();
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);
  const [versionToPublish, setVersionToPublish] = useState<number | null>(null);
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
  const [activeTab, setActiveTab] = useState("expediente");
  const [selectedArmadosSections, setSelectedArmadosSections] = useState<ArmadosSectionValue[]>([
    "generales_candidato",
    "documentos",
    "investigacion_laboral",
    "investigacion_legal",
    "semanas_cotizadas",
    "buro_credito",
    "visita_domiciliaria",
    "observaciones_conclusion",
  ]);
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
      comentarios: "",
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
  // IMPL-20260320-07: control de edición posterior a asignación inicial
  const [editandoCalif, setEditandoCalif] = useState(false);
  const [motivoEdicion, setMotivoEdicion] = useState("");
  const [showMotivoDialog, setShowMotivoDialog] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxSection, setLightboxSection] = useState<"legal" | "semanas" | "penales" | "buro" | "visita">("legal");

  useEffect(() => {
    if (process) {
      setCalificacion(process.calificacionFinal || "pendiente");
      setComentarioCalificacion((process as any).comentarioCalificacion || "");
      setEditandoCalif(false);
      setMotivoEdicion("");
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
        comentarios: (process as any).antecedentesPenales?.comentarios || "",
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
        comentarios: (form.antecedentesPenales as any).comentarios || undefined,
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
                        {process.candidatoId ? (
                          <Link href={`/candidatos/${process.candidatoId}`}>
                            <span className="flex cursor-pointer items-center gap-1 transition-colors hover:text-foreground hover:underline">
                              <UserCheck className="h-3 w-3"/> {findName(process.candidatoId, candidates, 'nombreCompleto')}
                            </span>
                          </Link>
                        ) : (
                          <span className="flex items-center gap-1"><UserCheck className="h-3 w-3"/> {findName(process.candidatoId, candidates, 'nombreCompleto')}</span>
                        )}
                        {process.clienteId ? (
                          <button
                            type="button"
                            onClick={handleShareClientDashboardAccess}
                            disabled={createClientLink.isPending}
                            className="flex items-center gap-1 transition-colors hover:text-foreground hover:underline disabled:cursor-wait disabled:opacity-70"
                            title="Generar o reutilizar la URL del dashboard del cliente y compartirla"
                          >
                            <Landmark className="h-3 w-3"/>
                            <span>{findName(process.clienteId, clients, 'nombreEmpresa')}</span>
                            <Share2 className="h-3 w-3" />
                          </button>
                        ) : (
                          <span className="flex items-center gap-1"><Landmark className="h-3 w-3"/> {findName(process.clienteId, clients, 'nombreEmpresa')}</span>
                        )}
                        <span className="flex items-center gap-1"><Briefcase className="h-3 w-3"/> {findName(process.puestoId, posts, 'nombreDelPuesto')}</span>
                    </div>
                </div>
            </div>

            <div className="flex max-w-full flex-wrap items-end justify-start gap-3 rounded-lg border bg-gray-50 p-2 xl:justify-end">
              <div className="flex min-w-[10rem] flex-col">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Estatus</span>
                    <select 
                        value={process.estatusProceso} 
                      onChange={(e) => updateStatus.mutate({ id: processId, estatusProceso: e.target.value as any })}
                        disabled={!canEditProcess}
                  className="h-auto min-w-0 bg-transparent p-0 text-sm font-medium border-none focus:ring-0 cursor-pointer w-full"
                    >
                        {ESTATUS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                    </select>
                </div>
              <div className="mx-1 hidden h-8 w-px bg-gray-300 lg:block"></div>
              <div className="flex min-w-[14rem] flex-1 flex-col lg:max-w-[18rem]">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Calif. Final</span>
                <div className="flex flex-wrap items-center gap-1">
                        {/* IMPL-20260320-07: bloquear edición si ya hay calificación asignada */}
                        {(() => {
                          const esCalifAsignada = !!process.calificacionFinal && process.calificacionFinal !== "pendiente";
                          return (
                            <>
                              <select
                                value={calificacion}
                                onChange={(e) => setCalificacion(e.target.value)}
                                disabled={!canEditProcess || (esCalifAsignada && !editandoCalif)}
                                className="h-auto min-w-[11rem] flex-1 bg-transparent p-0 text-sm font-medium border-none focus:ring-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                {CALIF.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                              </select>
                              {canEditProcess && esCalifAsignada && !editandoCalif && (
                                <button
                                  type="button"
                                  onClick={() => setEditandoCalif(true)}
                                  className="text-[10px] text-blue-600 underline hover:text-blue-800 whitespace-nowrap ml-1"
                                  title="Habilitar edición de calificación ya asignada"
                                >
                                  Editar
                                </button>
                              )}
                            </>
                          );
                        })()}
                    </div>
                </div>
                {(() => {
                  const esCalifAsignada = !!process.calificacionFinal && process.calificacionFinal !== "pendiente";
                  const califCambio = calificacion !== "pendiente" && calificacion !== process.calificacionFinal;
                  if (!canEditProcess || !califCambio) return null;
                  if (esCalifAsignada) {
                    return (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-amber-400 text-amber-700 hover:bg-amber-50"
                        onClick={() => setShowMotivoDialog(true)}
                      >
                        Guardar Calif.
                      </Button>
                    );
                  }
                  return (
                    <Button
                      size="sm"
                      onClick={() => updateCalif.mutate({
                        id: processId,
                        calificacionFinal: calificacion as any,
                        comentarioCalificacion: calificacion !== "pendiente" ? comentarioCalificacion : undefined,
                      })}
                    >
                      Guardar Calif.
                    </Button>
                  );
                })()}
                <div className="mx-1 hidden h-8 w-px bg-gray-300 lg:block"></div>
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="expediente">Expediente</TabsTrigger>
              <TabsTrigger value="visitas">Visitas</TabsTrigger>
              <TabsTrigger value="armados">Armados</TabsTrigger>
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
                                checked={Boolean(candidateRecord?.dictamenLaboral?.completado)}
                                disabled={true}
                            />
                         </div>
                    </div>
                    
                    <div>
                        <Label className="text-xs">Resultado Global</Label>
                        <div className="h-9 px-3 py-2 border rounded-md bg-gray-50 text-sm font-semibold uppercase text-blue-700 mt-1">
                          {getCalificacionLabel(candidateRecord?.dictamenLaboral?.resultado || "pendiente")}
                        </div>
                    </div>
                    {(candidateRecord?.dictamenLaboral as any)?.observacionResultado && (
                      <div>
                        <Label className="text-xs">Observación del estatus</Label>
                        <div className="min-h-16 px-3 py-2 border rounded-md bg-amber-50 text-xs text-amber-900 mt-1 break-words whitespace-pre-wrap">
                          {(candidateRecord?.dictamenLaboral as any).observacionResultado}
                        </div>
                      </div>
                    )}
                    
                    <div>
                        <Label className="text-xs">Comentario o Conclusión General</Label>
                        <div className="min-h-16 px-3 py-2 border rounded-md bg-gray-50 text-xs text-gray-700 mt-1 break-words whitespace-pre-wrap">
                          {candidateRecord?.dictamenLaboral?.comentariosGenerales || "Sin comentarios."}
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
                               const file = files[0];
                               const arrayBuf = await file.arrayBuffer();
                               let binary = ''; const bytes = new Uint8Array(arrayBuf); const len = bytes.byteLength; for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
                               const base64 = btoa(binary);
                               await handleUpload(
                                 { procesoId: processId, tipoDocumento: 'EVIDENCIA_LEGAL', fileName: `paste.png`, contentType: file.type, base64 } as any,
                                 (url) => setPanelForm(f => ({...f, investigacionLegal: { ...f.investigacionLegal, evidenciasGraficas: [...(f.investigacionLegal as any).evidenciasGraficas, url] }})),
                               );
                            }
                        }}
                        >
                        <p className="text-[10px] text-gray-400 text-center px-2">Click y Ctrl+V para pegar imagen</p>
                        </div>
                        {/* Thumbnails */}
                        <div className="flex gap-1 overflow-x-auto mt-2 h-12">
                             {(panelForm.investigacionLegal as any).evidenciasGraficas.map((url:string, i:number) => (
                                 <div key={i} className="h-10 w-10 border rounded flex items-center justify-center bg-gray-100 cursor-pointer" onClick={() => { 
                                     if(url.includes('.pdf')){
                                         window.open(url, '_blank');
                                     } else {
                                         setLightboxSection("legal"); setLightboxIndex(i); setLightboxOpen(true); 
                                     }
                                 }}>
                                     {url.includes('.pdf') ? <FileText className="h-5 w-5"/> : <img src={url} className="h-full w-full object-cover"/>}
                                 </div>
                             ))}
                        </div>
                    </div>
                </div>

                 {/* 4. Semanas Cotizadas */}
                <div className="border rounded-lg bg-white shadow-sm p-4 space-y-3">
                   <div className="flex items-center gap-2 font-semibold text-sm border-b pb-2 text-gray-700">
                        <FileText className="h-4 w-4 text-teal-600" /> Semanas Cotizadas
                    </div>
                    {/* IMPL-20260320-01: valores globales del candidato (solo lectura, editables en CandidatoDetalle) */}
                    {(candidateRecord?.dictamenLaboral as any)?.disposicionSemanasCotizadas && (
                      <div className="rounded bg-teal-50 border border-teal-200 px-3 py-2 text-xs text-teal-800 space-y-1">
                        <div><span className="font-semibold">Disposición (global): </span>{(candidateRecord.dictamenLaboral as any).disposicionSemanasCotizadas}</div>
                        {(candidateRecord.dictamenLaboral as any).motivoDisposicion && (
                          <div><span className="font-semibold">Motivo: </span>{(candidateRecord.dictamenLaboral as any).motivoDisposicion}</div>
                        )}
                      </div>
                    )}
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
                                           const arrayBuf = await file.arrayBuffer();
                                           let binary = ''; const bytes = new Uint8Array(arrayBuf); const len = bytes.byteLength; for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
                                           const base64 = btoa(binary);
                                           await handleUpload(
                                             { procesoId: processId, tipoDocumento: 'SEMANAS_COTIZADAS', fileName: `paste.png`, contentType: file.type, base64 } as any,
                                             (url) => setPanelForm(f => ({...f, semanasDetalle: { ...f.semanasDetalle, evidenciasGraficas: [...(f.semanasDetalle as any).evidenciasGraficas, url] }})),
                                           );
                                      }
                                  }}
                                  tabIndex={0}
                             >Pegar IMG</div>
                             <div className="relative border border-dashed rounded h-16 flex items-center justify-center bg-gray-50 text-[10px] text-gray-400">
                                 Subir PDF
                                 <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={async(e) => {
                                     const file = e.currentTarget.files?.[0];
                                     if(file) {
                                        const arrayBuf = await file.arrayBuffer();
                                           let binary = ''; const bytes = new Uint8Array(arrayBuf); const len = bytes.byteLength; for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
                                           const base64 = btoa(binary);
                                           await handleUpload(
                                             { procesoId: processId, tipoDocumento: 'SEMANAS_IMSS', fileName: file.name, contentType: file.type, base64 } as any,
                                             (url) => setPanelForm(f => ({...f, semanasDetalle: { ...f.semanasDetalle, evidenciasGraficas: [...(f.semanasDetalle as any).evidenciasGraficas, url] }})),
                                           );
                                     }
                                 }}/>
                             </div>
                         </div>
                         <div className="flex gap-1 overflow-x-auto mt-2 h-12">
                             {(panelForm.semanasDetalle as any).evidenciasGraficas.map((url:string, i:number) => (
                                 <div key={i} className="h-10 w-10 border rounded flex items-center justify-center bg-gray-100 cursor-pointer" onClick={() => { 
                                     if(url.includes('.pdf')){
                                         window.open(url, '_blank');
                                     } else {
                                         setLightboxSection("semanas"); setLightboxIndex(i); setLightboxOpen(true); 
                                     }
                                 }}>
                                     {url.includes('.pdf') ? <FileText className="h-5 w-5"/> : <img src={url} className="h-full w-full object-cover"/>}
                                 </div>
                             ))}
                        </div>
                    </div>
                </div>

                 {/* 5. Notas Periodísticas */}
                <div className="border rounded-lg bg-white shadow-sm p-4 space-y-3">
                   <div className="flex items-center gap-2 font-semibold text-sm border-b pb-2 text-gray-700">
                        <AlertTriangle className="h-4 w-4 text-red-600" /> Notas Periodísticas
                    </div>
                    <div>
                        <Label className="text-xs">Comentarios / Hallazgos</Label>
                        <Textarea
                            value={(panelForm.antecedentesPenales as any).comentarios}
                            onChange={e => setPanelForm(f => ({ ...f, antecedentesPenales: { ...f.antecedentesPenales, comentarios: e.target.value } }))}
                            rows={3}
                            disabled={isClientAuth || !canEditProcess}
                        />
                    </div>
                     <div className="mt-2 text-center py-4 bg-gray-50 border border-dashed rounded cursor-pointer"
                        onPaste={async (e) => {
                              if (isClientAuth) return;
                              const file = e.clipboardData.files[0];
                              if(file) {
                                    const arrayBuf = await file.arrayBuffer();
                                    let binary = ''; const bytes = new Uint8Array(arrayBuf); const len = bytes.byteLength; for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
                                    const base64 = btoa(binary);
                                    await handleUpload(
                                      { procesoId: processId, tipoDocumento: 'ANTECEDENTES_PENALES', fileName: `paste.png`, contentType: file.type, base64 } as any,
                                      (url) => setPanelForm(f => ({...f, antecedentesPenales: { ...f.antecedentesPenales, evidenciasGraficas: [...(f.antecedentesPenales as any).evidenciasGraficas, url] }})),
                                    );
                              }
                        }}
                        tabIndex={0}
                     >
                         <p className="text-xs text-muted-foreground">Pegar Imagen aquí</p>
                     </div>
                     <div className="flex gap-1 overflow-x-auto mt-2 h-12">
                             {(panelForm.antecedentesPenales as any).evidenciasGraficas.map((url:string, i:number) => (
                                 <div key={i} className="h-10 w-10 border rounded flex items-center justify-center bg-gray-100 cursor-pointer" onClick={() => { 
                                     if(url.includes('.pdf')){
                                         window.open(url, '_blank');
                                     } else {
                                         setLightboxSection("penales"); setLightboxIndex(i); setLightboxOpen(true); 
                                     }
                                 }}>
                                     {url.includes('.pdf') ? <FileText className="h-5 w-5"/> : <img src={url} className="h-full w-full object-cover"/>}
                                 </div>
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
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setPanelForm(f=>({...f, buroCredito: {...f.buroCredito, pdfUrl: null} as any}))}>×</Button>
                        </div>
                    ) : (
                        <div className="relative border border-dashed rounded p-3 text-center bg-gray-50">
                            <input type="file" accept="application/pdf" className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={async(e) => {
                                     const file = e.currentTarget.files?.[0];
                                     if(file) {
                                        const arrayBuf = await file.arrayBuffer();
                                        let binary = ''; const bytes = new Uint8Array(arrayBuf); const len = bytes.byteLength; for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
                                        const base64 = btoa(binary);
                                        await handleUpload(
                                          { procesoId: processId, tipoDocumento: 'BURO_CREDITO', fileName: file.name, contentType: file.type, base64 } as any,
                                          (url) => setPanelForm(f => ({...f, buroCredito: { ...f.buroCredito, pdfUrl: url } as any})),
                                        );
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
                                    const arrayBuf = await file.arrayBuffer();
                                    let binary = ''; const bytes = new Uint8Array(arrayBuf); const len = bytes.byteLength; for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
                                    const base64 = btoa(binary);
                                    await handleUpload(
                                      { procesoId: processId, tipoDocumento: 'BURO_CREDITO_ADICIONAL', fileName: `paste.png`, contentType: file.type, base64 } as any,
                                      (url) => setPanelForm(f => ({...f, buroCredito: { ...f.buroCredito, archivosAdicionales: [...(f.buroCredito as any).archivosAdicionales, url] }})),
                                    );
                                }
                            }}
                        >Paste files</div>
                         <div className="flex gap-1 overflow-x-auto mt-1 h-10">
                             {(panelForm.buroCredito as any).archivosAdicionales.map((url:string, i:number) => (
                                 <div key={i} className="h-8 w-8 border rounded flex items-center justify-center bg-gray-100 cursor-pointer" onClick={() => { 
                                     if(url.includes('.pdf')){
                                         window.open(url, '_blank');
                                     } else {
                                         setLightboxSection("buro"); setLightboxIndex(i); setLightboxOpen(true); 
                                     }
                                 }}>
                                     {url.includes('.pdf') ? <FileText className="h-4 w-4"/> : <img src={url} className="h-full w-full object-cover"/>}
                                 </div>
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
                                    const arrayBuf = await file.arrayBuffer();
                                    let binary = ''; const bytes = new Uint8Array(arrayBuf); const len = bytes.byteLength; for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
                                    const base64 = btoa(binary);
                                    await handleUpload(
                                      { procesoId: processId, tipoDocumento: 'VISITA_FOTOGRAFIA', fileName: `paste.png`, contentType: file.type, base64 } as any,
                                      (url) => setPanelForm(f => ({...f, visitaDetalle: { ...f.visitaDetalle, evidenciasGraficas: [...(f.visitaDetalle as any).evidenciasGraficas || [], url] }})),
                                    );
                              }
                         }}
                    >Paste Photos</div>
                     <div className="flex gap-1 overflow-x-auto mt-1 h-10">
                             {(panelForm.visitaDetalle as any).evidenciasGraficas?.map((url:string, i:number) => (
                                 <div key={i} className="h-8 w-8 border rounded flex items-center justify-center bg-gray-100 cursor-pointer" onClick={() => { 
                                     if(url.includes('.pdf')){
                                         window.open(url, '_blank');
                                     } else {
                                         setLightboxSection("visita"); setLightboxIndex(i); setLightboxOpen(true); 
                                     }
                                 }}>
                                     {url.includes('.pdf') ? <FileText className="h-4 w-4"/> : <img src={url} className="h-full w-full object-cover"/>}
                                 </div>
                             ))}
                    </div>
                    {!isClientAuth && (
                      <div className="rounded-md border border-emerald-200 bg-emerald-50/60 p-3 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Portal del encuestador</div>
                            <div className="text-xs text-emerald-900">
                              {surveyorPortalStatus ? `Estado del acceso: ${surveyorPortalStatus}` : "Sin acceso generado todavía"}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {hasCapturedVisitData && (
                              <Button size="sm" variant="outline" onClick={() => setVisitCaptureOpen(true)}>Ver / editar captura</Button>
                            )}
                            {processIsVisitCompleted && (
                              <Button size="sm" variant="outline" onClick={() => setActiveTab("armados")}>
                                <FilePlus2 className="h-4 w-4 mr-2" /> Gestionar en Armados
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-emerald-900 break-all">
                          {surveyorPortalUrl ? surveyorPortalUrl : "Programa la visita para generar la URL del cuestionario."}
                        </div>
                        <div className="text-[11px] text-emerald-800">
                          {processIsVisitCompleted
                            ? "La visita ya fue concluida. La URL se conserva como referencia del acceso original y la publicación del PDF se controla desde Armados."
                            : "Mientras la visita esté programada o en curso, esta URL corresponde al acceso activo que se compartió con el encuestador."}
                        </div>
                      </div>
                    )}
                    {!isClientAuth && (
                      <div className="rounded-md border border-amber-200 bg-amber-50/70 p-3 space-y-1">
                        <div className="text-xs font-semibold uppercase tracking-wide text-amber-900">Términos, condiciones y confidencialidad</div>
                        <div className="text-xs text-amber-900">
                          {visitPrivacyAcceptedAt
                            ? `Aceptado en el portal de visita el ${new Date(visitPrivacyAcceptedAt).toLocaleString("es-MX")}`
                            : "Pendiente de aceptación en el portal del encuestador."}
                        </div>
                        <div className="text-[11px] text-amber-800">
                          Este registro es interno del expediente y queda excluido del PDF final del estudio.
                        </div>
                      </div>
                    )}
                </div>

                {/* 8. Historial de Calificación Final — IMPL-20260320-02 */}
                {!isClientAuth && canEditProcess && (
                  <div className="border rounded-lg bg-white shadow-sm p-4 space-y-3 md:col-span-2 xl:col-span-3">
                    <div className="flex flex-wrap items-center gap-2 font-semibold text-sm border-b pb-2 text-gray-700">
                      <CheckCircle2 className="h-4 w-4 text-violet-600" /> Historial de Calificación Final
                      <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                        Control interno
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Este historial es solo para trazabilidad interna del expediente. No se muestra al cliente ni forma parte del PDF final.
                    </p>
                    {scoreAudit.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">Sin cambios registrados aún.</p>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {scoreAudit.map((entry: any) => {
                          const califLabel = (v: string | null) =>
                            CALIF.find((c) => c.value === v)?.label ?? v ?? "—";
                          const actor = entry.userName || entry.userEmail || `Usuario #${entry.userId ?? "?"}`;
                          const fecha = entry.timestamp
                            ? new Date(entry.timestamp).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })
                            : "—";
                          const det: any = entry.details || {};
                          return (
                            <div key={entry.id} className="py-2 text-xs text-gray-700 space-y-0.5">
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                <span className="font-semibold text-gray-900">{actor}</span>
                                <span className="text-gray-400">{fecha}</span>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px]">
                                {det.calificacionAnterior != null && (
                                  <span>Anterior: <span className="font-medium">{califLabel(det.calificacionAnterior)}</span></span>
                                )}
                                {det.calificacionFinal != null && (
                                  <span>→ Nuevo: <span className="font-semibold text-violet-700">{califLabel(det.calificacionFinal)}</span></span>
                                )}
                              </div>
                              {det.motivoEdicion && (
                                <div className="text-[11px] text-amber-700">Motivo: {det.motivoEdicion}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </TabsContent>

            <TabsContent value="armados" className="mt-4">
      <div className="space-y-4">

        {/* Bloque 1: Estado del armado actual */}
        <Card>
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FilePlus2 className="h-5 w-5 text-blue-700" /> Armados de cliente
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Control interno de borradores y publicación del PDF visible para cliente.
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {!publishedReportSummary && reportVersions.length === 0 && (
                  <Badge variant="outline" className="text-gray-500">Sin armado</Badge>
                )}
                {reportVersions.length > 0 && !publishedReportSummary && (
                  <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                    Borrador disponible (v{reportVersions[0]?.versionNumber})
                  </Badge>
                )}
                {publishedReportSummary && (
                  <Badge className="bg-green-700 text-white">
                    Publicado v{publishedReportSummary.versionNumber}
                  </Badge>
                )}
                {publishedReportSummary?.publishedAt && (
                  <span className="text-xs text-muted-foreground">
                    Publicado: {new Date(publishedReportSummary.publishedAt).toLocaleDateString("es-MX")}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {publishedReportSummary && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={openReportVersion.isPending}
                  onClick={() => void handleOpenReportVersion(publishedReportSummary.id)}
                >
                  <FileText className="h-4 w-4 mr-2" /> Abrir publicado
                </Button>
              )}
              {publishedReportSummary && (
                <Button size="sm" variant="outline" disabled={openReportVersion.isPending} onClick={() => void handleSharePublishedVersion()}>
                  <MessageCircle className="h-4 w-4 mr-2" /> Compartir publicado
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-sm text-blue-800">
              Elige las secciones que deseas incluir. El borrador se congela como snapshot editorial inmutable — el preview HTML y el PDF derivan del mismo contenido.
            </div>

            {/* Bloque 2: Checkboxes de secciones */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {ARMADOS_SECTION_OPTIONS.map((section) => {
                const checked = selectedArmadosSections.includes(section.value);
                return (
                  <label key={section.value} className={`flex items-start gap-3 rounded-lg border bg-white p-3 cursor-pointer transition-colors ${checked ? "border-blue-300 bg-blue-50/30" : "hover:bg-gray-50"}`}>
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => {
                        setSelectedArmadosSections((current) => {
                          if (value) {
                            return current.includes(section.value) ? current : [...current, section.value];
                          }
                          return current.filter((item) => item !== section.value);
                        });
                      }}
                    />
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium text-gray-900">{section.label}</div>
                      <div className="text-xs text-muted-foreground">{section.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Bloque 3: Resumen de selección */}
            <div className="flex flex-wrap items-center gap-2">
              {selectedArmadosSections.length === 0 ? (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" /> Selecciona al menos una sección
                </Badge>
              ) : (
                <Badge variant="secondary">{selectedArmadosSections.length} sección{selectedArmadosSections.length !== 1 ? "es" : ""} seleccionada{selectedArmadosSections.length !== 1 ? "s" : ""}</Badge>
              )}
              {selectedArmadosSections.map((value) => {
                const section = ARMADOS_SECTION_OPTIONS.find((item) => item.value === value);
                return section ? <Badge key={value} variant="outline" className="text-blue-800 border-blue-200 bg-blue-50">{section.label}</Badge> : null;
              })}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => void handleGenerateLegacyDraft()}
                disabled={!canEditProcess || createLegacyReportDraft.isPending || selectedArmadosSections.length === 0}
              >
                <FilePlus2 className="h-4 w-4 mr-2" />
                {createLegacyReportDraft.isPending ? "Generando borrador..." : "Generar borrador"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bloque 4: Revisión del borrador (draft más reciente) */}
        {(() => {
          const latestDraft = reportVersions.find((v: any) => v.status === "draft");
          if (!latestDraft) return null;
          return (
            <Card className="border-amber-200 bg-amber-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-800">
                  <CheckCircle2 className="h-4 w-4" /> Versión en revisión — v{latestDraft.versionNumber}
                </CardTitle>
                <p className="text-xs text-amber-700">Revise el armado antes de publicarlo. El preview HTML refleja exactamente el contenido del PDF.</p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={getVersionHtml.isPending}
                    onClick={() => void handlePreviewHtml(latestDraft.id)}
                    className="border-amber-300 text-amber-800 hover:bg-amber-100"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {getVersionHtml.isPending ? "Cargando..." : "Vista previa HTML"}
                  </Button>
                  {latestDraft.pdfStoragePath && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={openReportVersion.isPending}
                      onClick={() => void handleOpenReportVersion(latestDraft.id)}
                    >
                      <FileText className="h-4 w-4 mr-2" /> Abrir PDF borrador
                    </Button>
                  )}
                  <Button
                    size="sm"
                    disabled={publishReportVersion.isPending}
                    onClick={() => handleConfirmPublish(latestDraft.id)}
                  >
                    Publicar para cliente
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Bloque 5: Historial de versiones */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Historial de versiones</CardTitle>
          </CardHeader>
          <CardContent>
            {reportVersions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todavía no hay versiones registradas.</p>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Versión</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Generado por</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Secciones</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportVersions.map((version: any) => (
                        <TableRow key={version.id} className={version.status === "published" ? "bg-green-50/50" : ""}>
                          <TableCell className="font-medium">v{version.versionNumber}</TableCell>
                          <TableCell>
                            <Badge variant={version.status === "published" ? "default" : version.status === "archived" ? "secondary" : "outline"}
                              className={version.status === "published" ? "bg-green-700" : ""}
                            >{version.status}</Badge>
                          </TableCell>
                          <TableCell className="text-xs">{version.createdByName || "Sin dato"}</TableCell>
                          <TableCell className="text-xs">
                            {new Date(version.createdAt).toLocaleDateString("es-MX")}
                            {version.publishedAt && <div className="text-green-700">Pub: {new Date(version.publishedAt).toLocaleDateString("es-MX")}</div>}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(version.sections || []).map((value: string) => {
                                const section = ARMADOS_SECTION_OPTIONS.find((item) => item.value === value);
                                return (
                                  <Badge key={`${version.id}-${value}`} variant="secondary" className="text-[10px]">
                                    {section?.label || value}
                                  </Badge>
                                );
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={getVersionHtml.isPending}
                                onClick={() => void handlePreviewHtml(version.id)}
                                title="Vista previa HTML"
                              >
                                HTML
                              </Button>
                              {version.pdfStoragePath && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={openReportVersion.isPending}
                                  onClick={() => void handleOpenReportVersion(version.id)}
                                >
                                  PDF
                                </Button>
                              )}
                              {version.status === "draft" && (
                                <Button
                                  size="sm"
                                  disabled={publishReportVersion.isPending}
                                  onClick={() => handleConfirmPublish(version.id)}
                                >
                                  Publicar
                                </Button>
                              )}
                              {version.status !== "published" && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={deleteReportVersion.isPending}
                                  onClick={() => void handleDeleteReportVersion(version)}
                                >
                                  Eliminar
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-3 md:hidden">
                  {reportVersions.map((version: any) => (
                    <div key={version.id} className={`rounded-lg border p-4 shadow-sm space-y-3 ${version.status === "published" ? "bg-green-50/50 border-green-200" : "bg-white"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">Versión v{version.versionNumber}</div>
                          <div className="text-xs text-muted-foreground mt-1">{version.createdByName || "Sin dato"}</div>
                        </div>
                        <Badge variant={version.status === "published" ? "default" : "outline"}
                          className={version.status === "published" ? "bg-green-700" : ""}
                        >{version.status}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(version.sections || []).map((value: string) => {
                          const section = ARMADOS_SECTION_OPTIONS.find((item) => item.value === value);
                          return <Badge key={`${version.id}-${value}`} variant="secondary" className="text-[10px]">{section?.label || value}</Badge>;
                        })}
                      </div>
                      <div className="flex flex-col gap-2 pt-1">
                        <Button size="sm" variant="outline" className="w-full" disabled={getVersionHtml.isPending} onClick={() => void handlePreviewHtml(version.id)}>
                          Vista previa HTML
                        </Button>
                        {version.pdfStoragePath && (
                          <Button size="sm" variant="outline" className="w-full" disabled={openReportVersion.isPending} onClick={() => void handleOpenReportVersion(version.id)}>
                            Abrir PDF
                          </Button>
                        )}
                        {version.status === "draft" && (
                          <Button size="sm" className="w-full" disabled={publishReportVersion.isPending} onClick={() => handleConfirmPublish(version.id)}>
                            Publicar
                          </Button>
                        )}
                        {version.status !== "published" && (
                          <Button size="sm" variant="destructive" className="w-full" disabled={deleteReportVersion.isPending} onClick={() => void handleDeleteReportVersion(version)}>
                            Eliminar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bloque 6: Confirmación de publicación */}
      <Dialog open={confirmPublishOpen} onOpenChange={(open) => { if (!open) { setConfirmPublishOpen(false); setVersionToPublish(null); } }}>
        <DialogContent className="max-w-md" aria-describedby="confirm-publish-desc">
          <DialogHeader>
            <DialogTitle>Confirmar publicación</DialogTitle>
          </DialogHeader>
          <p id="confirm-publish-desc" className="text-sm text-muted-foreground">
            Al publicar esta versión, quedará visible para el cliente en su portal. Las versiones publicadas anteriores quedarán archivadas. Esta acción no puede deshacerse desde aquí.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { setConfirmPublishOpen(false); setVersionToPublish(null); }}>Cancelar</Button>
            <Button
              disabled={publishReportVersion.isPending || versionToPublish === null}
              onClick={() => {
                if (versionToPublish === null) return;
                publishReportVersion.mutate(
                  { versionId: versionToPublish },
                  {
                    onSuccess: () => {
                      setConfirmPublishOpen(false);
                      setVersionToPublish(null);
                    },
                  }
                );
              }}
            >
              {publishReportVersion.isPending ? "Publicando..." : "Sí, publicar para cliente"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
            </TabsContent>

            <TabsContent value="visitas" className="mt-4">
      <Card>
        <CardHeader className="flex items-center justify-between flex-row">
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5"/> Visitas domiciliarias
          </CardTitle>
          <div className="flex gap-2">
            {!isClientAuth && process.estatusProceso === "visita_realizada" && (
              <Button size="sm" variant="outline" onClick={() => setActiveTab("armados")}>
                <FilePlus2 className="h-4 w-4 mr-2" /> Abrir Armados
              </Button>
            )}
            {!isClientAuth && (
            <Button size="sm" variant="outline" onClick={()=>{
              setNotifySelected(surveyors.map((s:any)=> s.id));
              setNotifyOpen(true);
            }}>Avisar encuestadores</Button>
            )}
          </div>
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
                  <Button size="sm" variant="link" onClick={()=> refreshSuggestions()}>(Actualizar)</Button>
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
                            const msg = buildVisitMessage({
                              encNombre: enc.nombre,
                              candidato: candidateRecord,
                              fechaISO: process.visitStatus?.scheduledDateTime,
                              direccion: process.visitStatus?.direccion,
                              observaciones: process.visitStatus?.observaciones,
                              surveyorToken: lastSurveyorToken,
                            });
                            try { (trpc.surveyorMessages.create as any).mutate({ encuestadorId: enc.id, procesoId: process.id, canal: 'whatsapp', contenido: msg } as any); } catch {}
                            window.open(buildWhatsappUrl(String(enc.telefono), msg), '_blank');
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
                const fechaISO = process.visitStatus?.scheduledDateTime;
                const msgBase = (encNombre?: string) => buildVisitMessage({
                  encNombre,
                  candidato: candidateRecord,
                  fechaISO,
                  direccion: process.visitStatus?.direccion,
                  observaciones: process.visitStatus?.observaciones,
                  surveyorToken: lastSurveyorToken,
                }) + "\n¿Puedes atenderla?";
                const targets = surveyors.filter((s:any)=> notifySelected.includes(s.id) && s.telefono);
                if (targets.length === 0) { return; }
                targets.forEach((s:any, idx:number)=> {
                  setTimeout(()=> {
                    const url = buildWhatsappUrl(String(s.telefono), msgBase(s.nombre));
                    window.open(url, '_blank');
                  }, idx * 200);
                });
              }}>Enviar WhatsApp</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      )}
      {!isClientAuth && (
        <Dialog open={visitCaptureOpen} onOpenChange={setVisitCaptureOpen}>
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden" aria-describedby="visit-capture-desc">
            <DialogHeader>
              <DialogTitle>Captura del cuestionario del encuestador</DialogTitle>
            </DialogHeader>
            <p id="visit-capture-desc" className="sr-only">Vista interna de solo lectura con la información capturada por el encuestador.</p>
            <div className="space-y-3 overflow-auto pr-1">
              <div className="text-sm text-muted-foreground">
                {process?.clave} • {process?.visitStatus?.scheduledDateTime ? new Date(process.visitStatus.scheduledDateTime).toLocaleString() : "Sin fecha programada"}
              </div>
              <VisitCapturePanel
                data={((process as any)?.visitaDetalle || {}) as Record<string, unknown>}
                portalUrl={surveyorPortalUrl}
                portalStatus={surveyorPortalStatus}
                canEdit={!isClientAuth && canEditProcess}
                isSaving={updateVisitCapture.isPending}
                onSave={(nextValue) => updateVisitCapture.mutate({ id: processId, visitaDetalle: nextValue as any })}
                auditEntries={visitCaptureAudit as any}
              />
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
                <DialogContent aria-describedby="email-link-desc">
                  <DialogHeader>
                    <DialogTitle>Enviar enlace de acceso al cliente</DialogTitle>
                  </DialogHeader>
                  <p id="email-link-desc" className="sr-only">Formulario interno para generar y enviar un enlace de acceso al cliente.</p>
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
                  <option value="ANTECEDENTES_PENALES">Notas Periodísticas</option>
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
        <DialogContent className="max-w-2xl" aria-describedby="lightbox-desc">
          <DialogHeader>
            <DialogTitle>
              {lightboxSection === "legal" && "Evidencia - Investigación Legal"}
              {lightboxSection === "semanas" && "Evidencia - Semanas Cotizadas"}
              {lightboxSection === "penales" && "Evidencia - Notas Periodísticas"}
              {lightboxSection === "buro" && "Evidencia - Buró de Crédito"}
              {lightboxSection === "visita" && "Evidencia - Visita"}
            </DialogTitle>
          </DialogHeader>
          <p id="lightbox-desc" className="sr-only">Visor interno de evidencias del proceso con navegación entre archivos.</p>
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

      {/* Dialog de motivo de edición de calificación — IMPL-20260320-07 */}
      <Dialog open={showMotivoDialog} onOpenChange={(open) => { if (!open) setShowMotivoDialog(false); }}>
        <DialogContent className="max-w-md" aria-describedby="motivo-calif-desc">
          <DialogHeader>
            <DialogTitle>Motivo de edición de calificación</DialogTitle>
          </DialogHeader>
          <p id="motivo-calif-desc" className="text-sm text-muted-foreground">
            La calificación ya estaba asignada como <strong>{CALIF.find(c => c.value === process.calificacionFinal)?.label ?? process.calificacionFinal}</strong>. Ingresa el motivo del cambio para continuar.
          </p>
          <div className="space-y-2 mt-2">
            <Label htmlFor="motivo-edicion-calif">Motivo de edición <span className="text-red-500">*</span></Label>
            <Textarea
              id="motivo-edicion-calif"
              value={motivoEdicion}
              onChange={(e) => setMotivoEdicion(e.target.value)}
              placeholder="Ej: Corrección por dato adicional recibido del cliente"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowMotivoDialog(false)}>Cancelar</Button>
            <Button
              disabled={!motivoEdicion.trim() || updateCalif.isPending}
              onClick={() => {
                if (!motivoEdicion.trim()) return;
                updateCalif.mutate(
                  {
                    id: processId,
                    calificacionFinal: calificacion as any,
                    comentarioCalificacion: comentarioCalificacion || undefined,
                    motivoEdicion: motivoEdicion.trim(),
                  },
                  {
                    onSuccess: () => {
                      setShowMotivoDialog(false);
                      setEditandoCalif(false);
                      setMotivoEdicion("");
                    },
                  }
                );
              }}
            >
              {updateCalif.isPending ? "Guardando..." : "Confirmar cambio"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}