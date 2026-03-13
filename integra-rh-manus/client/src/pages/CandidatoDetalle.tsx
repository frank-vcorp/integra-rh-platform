import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Plus, Pencil, Trash2, Briefcase, MessageSquare, Paperclip, ExternalLink, File as FileIcon, FileText, FileSpreadsheet, FileImage, FileArchive, FileCode, RefreshCcw, FolderOpen, ShieldCheck, CheckCircle2, Sparkles, MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearch, useLocation } from "wouter";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CAUSALES_SALIDA, CausalSalidaType, ESTATUS_INVESTIGACION, EstatusInvestigacionType, ESTATUS_INVESTIGACION_LABELS } from "@/lib/constants";
import { calcularTiempoTrabajado, formatearFecha } from "@/lib/dateUtils";
import { ReviewAndCompleteDialog } from "@/components/ReviewAndCompleteDialog";
import { AuditTrailViewer } from "@/components/AuditTrailViewer";
import {
  IdentificationCard,
  House,
  Phone,
  UsersThree,
  ShareNetwork,
  Heart,
  GraduationCap,
  Car,
  CurrencyDollar,
} from "@phosphor-icons/react";

// IMPL-20260313-02 — InfoItem helper para perfil extendido
const InfoItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-medium text-sm text-slate-800">{String(value ?? "")}</p>
  </div>
);

const INVESTIGACION_BADGE: Record<EstatusInvestigacionType, string> = {
  en_revision: "bg-yellow-100 text-yellow-800",
  revisado: "bg-blue-100 text-blue-800",
  terminado: "bg-green-100 text-green-800",
};

const getInvestigacionLabel = (estatus?: string) =>
  estatus && estatus in ESTATUS_INVESTIGACION_LABELS
    ? ESTATUS_INVESTIGACION_LABELS[estatus as EstatusInvestigacionType]
    : ESTATUS_INVESTIGACION_LABELS["en_revision"];

const getInvestigacionClass = (estatus?: string) =>
  estatus && estatus in INVESTIGACION_BADGE
    ? INVESTIGACION_BADGE[estatus as EstatusInvestigacionType]
    : INVESTIGACION_BADGE["en_revision"];

const buildConsentUrl = (token?: string | null) => {
  if (!token) return "";
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "";
  return `${origin}/consentir/${encodeURIComponent(token)}`;
};

const INVESTIGATION_BLOCKS = [
  {
    id: 1,
    title: "1. Datos de la empresa",
    description: "Nombre comercial, giro, contacto y perfil del puesto.",
  },
  {
    id: 2,
    title: "2. Tiempo e incidencias",
    description: "Antigüedad, sueldos, motivos de salida e incidencias.",
  },
  {
    id: 3,
    title: "3. Desempeño y recomendación",
    description: "Valoración del desempeño y si lo volverían a contratar.",
  },
] as const;

/** ARCH-20260128-09 | Doc: context/SPEC-INVESTIGACION-LOCALSTORAGE.md */
const getInvestigationDraftKey = (candidateId: number, workHistoryId?: number | null) => {
  if (!candidateId || !workHistoryId) return null;
  return `investigationDraft:v1:${candidateId}:${workHistoryId}`;
};

/** ARCH-20260128-09 | Doc: context/SPEC-INVESTIGACION-LOCALSTORAGE.md */
const loadInvestigationDraft = (key: string): Record<string, string> | null => {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

/** ARCH-20260128-09 | Doc: context/SPEC-INVESTIGACION-LOCALSTORAGE.md */
const hasInvestigationDraft = (key?: string | null) => {
  if (!key || typeof window === "undefined" || !window.localStorage) return false;
  try {
    return window.localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
};

/** ARCH-20260128-09 | Doc: context/SPEC-INVESTIGACION-LOCALSTORAGE.md */
const saveInvestigationDraftField = (key: string, name: string, value: string) => {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const current = loadInvestigationDraft(key) || {};
    current[name] = value;
    window.localStorage.setItem(key, JSON.stringify(current));
  } catch {
    // silent
  }
};

/** ARCH-20260128-09 | Doc: context/SPEC-INVESTIGACION-LOCALSTORAGE.md */
const clearInvestigationDraft = (key?: string | null) => {
  if (!key || typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // silent
  }
};

/** ARCH-20260128-09 | Doc: context/SPEC-INVESTIGACION-LOCALSTORAGE.md */
const applyInvestigationDraftToForm = (
  form: HTMLFormElement | null,
  draft: Record<string, string>,
) => {
  if (!form) return;
  Object.entries(draft).forEach(([name, value]) => {
    const field = form.elements.namedItem(name) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement
      | null;
    if (!field) return;
    if (field instanceof HTMLInputElement && field.type === "checkbox") {
      field.checked = value === "on" || value === "true";
      return;
    }
    if (field instanceof HTMLInputElement && field.type === "radio") {
      field.checked = field.value === value;
      return;
    }
    field.value = value ?? "";
  });
};

export default function CandidatoDetalle() {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const query = new URLSearchParams(search);
  const currentTab = query.get("tab") || "perfil";

  const handleTabChange = (val: string) => {
    const newQuery = new URLSearchParams(search); 
    newQuery.set("tab", val);
    setLocation(location + "?" + newQuery.toString());
  };

  const [createProcessOpen, setCreateProcessOpen] = useState(false);
  const params = useParams();
  const candidateId = parseInt(params.id || "0");

  // Estado para el nuevo dialog unificado "Revisar y Completar"
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [editingWorkHistory, setEditingWorkHistory] = useState<any>(null);
  
  // Estados para investigación profunda (3 bloques) - mantienen su lógica
  const [investigationDialogOpen, setInvestigationDialogOpen] = useState(false);
  const [investigationStep, setInvestigationStep] = useState(1);
  const [investigationTarget, setInvestigationTarget] = useState<any | null>(null);
  const [periodRowCount, setPeriodRowCount] = useState(1);
  const [investigationDraftSnapshot, setInvestigationDraftSnapshot] = useState<Record<string, string> | null>(null);
  const investigationFormRef = useRef<HTMLFormElement | null>(null);
  const investigationDraftKeyRef = useRef<string | null>(null);
  
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [consentAction, setConsentAction] = useState<'email' | 'whatsapp' | 'copy' | null>(null);
  const [selfServiceUrl, setSelfServiceUrl] = useState<string>("");
  const [selfServiceExpiresAt, setSelfServiceExpiresAt] = useState<Date | null>(null);

  const { data: candidate, isLoading } = trpc.candidates.getById.useQuery({ id: candidateId });
  const { data: workHistoryRaw = [] } = trpc.workHistory.getByCandidate.useQuery({ candidatoId: candidateId });
  
  // Ordenar historial laboral: más reciente primero (por fechaInicio descendente)
  const workHistory = [...workHistoryRaw].sort((a, b) => {
    // Empleos actuales (sin fechaFin) van primero
    if (!a.fechaFin && b.fechaFin) return -1;
    if (a.fechaFin && !b.fechaFin) return 1;
    // Luego ordenar por fechaInicio descendente
    const dateA = a.fechaInicio || "";
    const dateB = b.fechaInicio || "";
    return dateB.localeCompare(dateA);
  });
  
  const { data: comments = [] } = trpc.candidateComments.getByCandidate.useQuery({ candidatoId: candidateId });
  const { data: documents = [] } = trpc.documents.getByCandidate.useQuery({ candidatoId: candidateId });
  const { data: procesos = [] } = trpc.processes.getByCandidate.useQuery({ candidatoId: candidateId });
  const { data: consent, refetch: refetchConsent } = trpc.candidateConsent.getConsentByCandidateId.useQuery({ candidateId: candidateId });
  const { data: analysts = [] } = trpc.users.list.useQuery();
  const createSelfServiceLink = trpc.candidateSelf.createToken.useMutation({
    onSuccess: (res) => {
      setSelfServiceUrl(res.url);
      setSelfServiceExpiresAt(res.expiresAt ? new Date(res.expiresAt as any) : null);
      toast.success("Enlace de pre-registro generado");
      try {
        navigator.clipboard?.writeText(res.url);
        toast.info("Enlace copiado al portapapeles");
      } catch {
        // ignorar fallo al copiar
      }

      if (openSelfServiceAfterCreate) {
        setOpenSelfServiceAfterCreate(false);
        try {
          window.open(res.url, "_blank", "noopener,noreferrer");
        } catch {
          // no-op
        }
      }
    },
    onError: (err) => {
      toast.error("No se pudo generar el enlace: " + err.message);
    },
  });

  const [openSelfServiceAfterCreate, setOpenSelfServiceAfterCreate] = useState(false);

  const sendConsentLink = trpc.candidateConsent.sendConsentLink.useMutation({
    onSuccess: (data) => {
      refetchConsent();
      if (consentAction === 'email') {
        toast.success("Enlace de consentimiento enviado por email.");
      } else if (consentAction === 'whatsapp') {
        if (candidate?.telefono) {
          const whatsappUrl = `https://api.whatsapp.com/send?phone=${candidate.telefono.replace(/\D/g, '')}&text=Hola ${candidate.nombreCompleto}, por favor firma el consentimiento en el siguiente enlace: ${data.consentUrl}`;
          window.open(whatsappUrl, '_blank');
        } else {
          toast.error("El candidato no tiene un teléfono registrado.");
        }
      } else if (consentAction === 'copy') {
        navigator.clipboard.writeText(data.consentUrl);
        toast.success("Enlace copiado al portapapeles.");
      }
    },
    onError: (err) => {
      toast.error(`Error al generar enlace: ${err.message}`);
    },
  });

  // Llamar incondicionalmente a los hooks; usar initialData/enabled para orden estable
  const generateIaMini = trpc.workHistory.generateIaDictamen.useMutation({
    onSuccess: (res) => {
      utils.workHistory.getByCandidate.invalidate({ candidatoId: candidateId });
      if (res.generated) {
        toast.success("Mini dictamen IA generado para este empleo.");
      } else {
        toast.info("Se procesó la solicitud, pero no se generó un mini dictamen IA.");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al generar el mini dictamen IA.");
    },
  });
  const { data: surveyors = [] } = trpc.surveyors.listActive.useQuery(undefined, {
    initialData: [],
  });
  const postsByClient = trpc.posts.listByClient.useQuery(
    { clientId: candidate?.clienteId || 0 },
    { enabled: !!candidate?.clienteId }
  );
  const createProcessMutation = trpc.processes.create.useMutation({
    onSuccess: () => {
      utils.processes.getByCandidate.invalidate({ candidatoId: candidateId });
      setCreateProcessOpen(false);
      (document.getElementById('form-crear-proceso') as HTMLFormElement | null)?.reset();
      toast.success('Proceso creado');
    },
    onError: (e: any) => toast.error('Error: ' + e.message)
  });
  const asignarPsico = trpc.psicometricas.asignarBateria.useMutation({
    onSuccess: (res) => {
      const clave = (res as any)?.id;
      if (clave) {
        toast.success(`Psicométrica asignada. Clave: ${clave}`);
      } else {
        toast.success("Psicométrica asignada.");
      }
      utils.candidates.getById.invalidate({ id: candidateId });
    },
    onError: (e:any) => toast.error("Error: "+(e?.message || String(e)))
  });
  const guardarReportePsico = trpc.psicometricas.guardarReporte.useMutation({
    onSuccess: (res) => {
      utils.documents.getByCandidate.invalidate({ candidatoId: candidateId });
      utils.candidates.getById.invalidate({ id: candidateId });
      const message = res?.status === "Completado" ? "Resultados guardados en el expediente" : "Reporte descargado";
      toast.success(message);
      const url = res?.pdf?.url || res?.json?.url;
      if (url) {
        try { window.open(url, "_blank"); } catch {}
      }
    },
    onError: (e:any) => toast.error("Error: "+e.message)
  });
  const utils = trpc.useUtils();
  const { isClientAuth } = useClientAuth();
  // Flujo simplificado: sin batería; pruebas individuales únicamente.

  // Psico extra actions
  const reenviarInvitacion = trpc.psicometricas.reenviarInvitacion.useMutation({
    onSuccess: () => toast.success("Invitación reenviada"),
    onError: (e:any) => toast.error("Error: "+e.message),
  });
  const createClientLink = trpc.clientAccess.create.useMutation({
    onSuccess: (res:any) => {
      const url = res.url;
      try { navigator.clipboard?.writeText(url); } catch {}
      toast.success('Enlace de acceso generado y copiado');
    },
    onError: (e:any) => toast.error('Error: '+e.message)
  });
  const revokeClientLink = trpc.clientAccess.revoke.useMutation({
    onSuccess: () => {
      if (candidate?.clienteId) {
        utils.clientAccess.listActiveTokens.invalidate({ clientId: candidate.clienteId });
      }
      toast.success('Enlace revocado');
    },
    onError: (e:any) => toast.error('Error: '+e.message)
  });
  const { data: activeTokens = [] } = trpc.clientAccess.listActiveTokens.useQuery(
    { clientId: candidate?.clienteId || 0 },
    { enabled: Boolean(candidate?.clienteId), initialData: [] }
  );
  const markSelfReviewed = trpc.candidates.markSelfFilledReviewed.useMutation({
    onSuccess: () => {
      utils.candidates.getById.invalidate({ id: candidateId });
      toast.success("Captura inicial marcada como revisada");
    },
    onError: (e: any) => toast.error("Error: " + e.message),
  });

  const [emailTo, setEmailTo] = useState("");

  // Edición inline de datos básicos del candidato
  // IMPL-20260312-02 | Doc: Micro-Sprint 02 — War Room Refactoring
  const [editingBasicInfo, setEditingBasicInfo] = useState(false);
  const [basicInfoForm, setBasicInfoForm] = useState({
    nombreCompleto: "",
    email: "",
    telefono: "",
  });
  const updateCandidateMutation = trpc.candidates.update.useMutation({
    onSuccess: () => {
      utils.candidates.getById.invalidate({ id: candidateId });
      setEditingBasicInfo(false);
      toast.success("Datos de contacto actualizados");
    },
    onError: (error: any) => {
      toast.error("Error al actualizar: " + error.message);
    },
  });

  // Work History mutations
  const createWorkHistoryMutation = trpc.workHistory.create.useMutation({
    onSuccess: () => {
      utils.workHistory.getByCandidate.invalidate();
      setReviewDialogOpen(false);
      setEditingWorkHistory(null);
      toast.success("Historial laboral agregado");
    },
    onError: (error: any) => {
      toast.error("Error: " + error.message);
    },
  });

  const updateWorkHistoryMutation = trpc.workHistory.update.useMutation({
    onSuccess: () => {
      utils.workHistory.getByCandidate.invalidate();
      setReviewDialogOpen(false);
      setEditingWorkHistory(null);
      toast.success("Historial laboral actualizado");
    },
    onError: (error: any) => {
      toast.error("Error: " + error.message);
    },
  });

  const deleteWorkHistoryMutation = trpc.workHistory.delete.useMutation({
    onSuccess: () => {
      utils.workHistory.getByCandidate.invalidate();
      toast.success("Historial laboral eliminado");
    },
    onError: (error: any) => {
      toast.error("Error: " + error.message);
    },
  });

  const saveInvestigationMutation = trpc.workHistory.saveInvestigation.useMutation({
    onSuccess: (res) => {
      utils.workHistory.getByCandidate.invalidate({ candidatoId: candidateId });
      clearInvestigationDraft(investigationDraftKeyRef.current);
      setInvestigationDraftSnapshot(null);
      setInvestigationDialogOpen(false);
      setInvestigationTarget(null);
      setInvestigationStep(1);
      if (typeof res.score === "number") {
        toast.success(`Investigación guardada. Puntaje de desempeño: ${res.score}/100`);
      } else {
        toast.success("Investigación guardada");
      }
    },
    onError: (error: any) => {
      toast.error("Error al guardar la investigación: " + error.message);
    },
  });

  // Comment mutations
  const createCommentMutation = trpc.candidateComments.create.useMutation({
    onSuccess: () => {
      utils.candidateComments.getByCandidate.invalidate();
      setCommentDialogOpen(false);
      toast.success("Comentario agregado");
    },
    onError: (error: any) => {
      toast.error("Error: " + error.message);
    },
  });

  const hasValue = (v: unknown) =>
    v !== undefined && v !== null && String(v).trim().length > 0;

  // Documents
  const uploadDocumentMutation = trpc.documents.upload.useMutation({
    onSuccess: () => {
      utils.documents.getByCandidate.invalidate();
      toast.success("Documento cargado");
    },
    onError: (error: any) => toast.error("Error: " + error.message),
  });

  const handleDocumentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const file = formData.get("file") as File | null;
    const tipo = formData.get("tipoDocumento") as string;
    if (!file) return;
    const arrayBuf = await file.arrayBuffer();
    
    let binary = '';
    const bytes = new Uint8Array(arrayBuf);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    uploadDocumentMutation.mutate({
      candidatoId: candidateId,
      tipoDocumento: tipo,
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      base64,
    });
    form.reset();
  };


  // Helper: pick icon by file extension
  const getFileIcon = (fileName?: string) => {
    const ext = (fileName?.split(".").pop() || "").toLowerCase();
    switch (ext) {
      case "pdf":
        return { Icon: FileText, color: "text-red-600" };
      case "doc":
      case "docx":
      case "rtf":
        return { Icon: FileText, color: "text-blue-600" };
      case "xls":
      case "xlsx":
      case "csv":
        return { Icon: FileSpreadsheet, color: "text-green-600" };
      case "png":
      case "jpg":
      case "jpeg":
      case "gif":
      case "webp":
      case "svg":
        return { Icon: FileImage, color: "text-purple-600" };
      case "zip":
      case "rar":
      case "7z":
        return { Icon: FileArchive, color: "text-yellow-600" };
      case "txt":
      case "json":
      case "xml":
        return { Icon: FileCode, color: "text-slate-600" };
      default:
        return { Icon: FileIcon, color: "text-slate-600" };
    }
  };

  const handleCommentSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const isPublic = formData.get("publico") === "on";
    createCommentMutation.mutate({
      candidatoId: candidateId,
      text: formData.get("comentario") as string,
      visibility: isPublic ? "public" : "internal",
    });
    e.currentTarget.reset();
  };

  const handleEditWorkHistory = (item: any) => {
    setEditingWorkHistory(item);
    setReviewDialogOpen(true);
  };

  const handleDeleteWorkHistory = (id: number) => {
    if (confirm("¿Eliminar este registro?")) {
      deleteWorkHistoryMutation.mutate({ id });
    }
  };

  const handleInvestigationSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!investigationTarget) return;

    const formData = new FormData(e.currentTarget);
    const getString = (name: string) => {
      const v = formData.get(name) as string | null;
      return v && v.trim() !== "" ? v.trim() : undefined;
    };

    const empresa = {
      giro: getString("empresaGiro"),
      direccion: getString("empresaDireccion"),
      telefono: getString("empresaTelefono"),
    };
    const puesto = {
      puestoInicial: getString("puestoInicial"),
      puestoFinal: getString("puestoFinal"),
      jefeInmediato: getString("jefeInmediato"),
      principalesActividades: getString("principalesActividades"),
      recursosAsignados: getString("recursosAsignados"),
      horarioTrabajo: getString("horarioTrabajo"),
    };
    const periodos: { periodoEmpresa?: string; periodoCandidato?: string; puesto?: string }[] = [];
    for (let idx = 0; idx < periodRowCount; idx++) {
      const periodoEmpresa = getString(`periodoEmpresa_${idx}`);
      const periodoCandidato = getString(`periodoCandidato_${idx}`);
      const puesto = getString(`puesto_${idx}`);
      if (periodoEmpresa || periodoCandidato || puesto) {
        periodos.push({ periodoEmpresa, periodoCandidato, puesto });
      }
    }
    /** ARCH-20260128-23 | Doc: context/SPEC-INVESTIGACION-SEMANAS-COTIZADAS.md */
    const periodo = {
      // antiguedadTexto se mantiene por compatibilidad aunque ya no se captura
      antiguedadTexto: getString("antiguedadTexto"),
      sueldoInicial: getString("sueldoInicial"),
      sueldoFinal: getString("sueldoFinal"),
      disposicionSemanasCotizadas: getString("disposicionSemanasCotizadas"),
      motivoDisposicion: getString("motivoDisposicion"),
      periodos: periodos.length > 0 ? periodos : undefined,
    };
    /** ARCH-20260128-20 | Doc: context/SPEC-INVESTIGACION-INCIDENCIAS-DUAL.md */
    const incidencias = {
      motivoSeparacionCandidato: getString("motivoSeparacionCandidato"),
      motivoSeparacionEmpresa: getString("motivoSeparacionEmpresa"),
      incapacidadesCandidato: getString("incapacidadesCandidato"),
      incapacidadesEmpresa: getString("incapacidadesEmpresa"),
      inasistenciasCandidato: getString("inasistenciasCandidato"),
      inasistenciasEmpresa: getString("inasistenciasEmpresa"),
      antecedentesLegalesCandidato: getString("antecedentesLegalesCandidato"),
      antecedentesLegalesEmpresa: getString("antecedentesLegalesEmpresa"),
    };

    const getRating = (name: string) => {
      const v = formData.get(name) as string | null;
      return v && v !== "" ? (v as any) : undefined;
    };

    const desempeno = {
      evaluacionGeneral: getRating("evaluacionGeneral"),
      puntualidad: getRating("puntualidad"),
      colaboracion: getRating("colaboracion"),
      responsabilidad: getRating("responsabilidad"),
      actitudAutoridad: getRating("actitudAutoridad"),
      actitudSubordinados: getRating("actitudSubordinados"),
      honradezIntegridad: getRating("honradezIntegridad"),
      calidadTrabajo: getRating("calidadTrabajo"),
      liderazgo: getRating("liderazgo"),
      conflictividad: (getString("conflictividad") as any) || undefined,
      conflictividadComentario: getString("conflictividadComentario"),
    };

    const conclusion = {
      esRecomendable: (getString("esRecomendable") as any) || undefined,
      loRecontrataria: (getString("loRecontrataria") as any) || undefined,
      razonRecontratacion: getString("razonRecontratacion"),
      informanteNombre: getString("informanteNombre"),
      informanteCargo: getString("informanteCargo"),
      informanteTelefono: getString("informanteTelefono"),
      informanteEmail: getString("informanteEmail"),
      comentariosAdicionales: getString("comentariosAdicionales"),
    };

    const hasAny = (obj: Record<string, unknown>) =>
      Object.values(obj).some(v => v !== undefined && v !== null && v !== "");
    const hasDesempeno =
      hasAny({
        evaluacionGeneral: desempeno.evaluacionGeneral,
        puntualidad: desempeno.puntualidad,
        colaboracion: desempeno.colaboracion,
        responsabilidad: desempeno.responsabilidad,
        actitudAutoridad: desempeno.actitudAutoridad,
        actitudSubordinados: desempeno.actitudSubordinados,
        honradezIntegridad: desempeno.honradezIntegridad,
        calidadTrabajo: desempeno.calidadTrabajo,
        liderazgo: desempeno.liderazgo,
        conflictividad: desempeno.conflictividad,
      }) || !!desempeno.conflictividadComentario;
    const hasEmpresa = hasAny(empresa);
    const hasPuesto = hasAny(puesto);
    const hasPeriodo = hasAny(periodo);
    const hasIncidencias = hasAny(incidencias);
    const hasConclusion = hasAny(conclusion);

    saveInvestigationMutation.mutate({
      id: investigationTarget.id,
      empresa: hasEmpresa ? empresa : undefined,
      puesto: hasPuesto ? puesto : undefined,
      periodo: hasPeriodo ? periodo : undefined,
      incidencias: hasIncidencias ? incidencias : undefined,
      desempeno: hasDesempeno ? desempeno : undefined,
      conclusion: hasConclusion ? conclusion : undefined,
    });
  };

  const handleInvestigationDraftChange = (event: React.FormEvent<HTMLFormElement>) => {
    const key = investigationDraftKeyRef.current;
    if (!key) return;
    const target = event.target as
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement
      | null;
    if (!target || !target.name) return;
    if (target instanceof HTMLInputElement && (target.type === "button" || target.type === "submit")) return;
    if (target instanceof HTMLInputElement && target.type === "checkbox") {
      saveInvestigationDraftField(key, target.name, target.checked ? "on" : "");
      return;
    }
    saveInvestigationDraftField(key, target.name, target.value ?? "");
  };

  useEffect(() => {
    if (!investigationDialogOpen) {
      setInvestigationDraftSnapshot(null);
      return;
    }
    if (!investigationTarget?.id) return;
    const key = getInvestigationDraftKey(candidateId, investigationTarget.id);
    investigationDraftKeyRef.current = key;
    if (!key) return;
    const draft = loadInvestigationDraft(key);
    if (!draft) return;
    const periodIndexes = Object.keys(draft)
      .map((name) => {
        const match = name.match(/^(?:periodo(?:Empresa|Candidato)|puesto)_(\d+)$/);
        return match ? parseInt(match[1], 10) : -1;
      })
      .filter((idx) => idx >= 0);
    const draftRowCount = periodIndexes.length > 0 ? Math.max(...periodIndexes) + 1 : 0;
    const existingPeriodCount =
      investigationTarget?.investigacionDetalle?.periodo?.periodos?.length || 0;
    const neededRows = Math.max(1, draftRowCount, existingPeriodCount);
    setPeriodRowCount((prev) => Math.max(prev, neededRows));
    setInvestigationDraftSnapshot(draft);
  }, [investigationDialogOpen, investigationTarget?.id, candidateId, investigationTarget?.investigacionDetalle?.periodo?.periodos?.length]);

  useEffect(() => {
    if (!investigationDialogOpen || !investigationDraftSnapshot) return;
    if (typeof window === "undefined") return;
    const timer = window.setTimeout(() => {
      applyInvestigationDraftToForm(investigationFormRef.current, investigationDraftSnapshot);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [investigationDialogOpen, investigationDraftSnapshot, periodRowCount]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Candidato no encontrado</p>
        <Link href="/candidatos">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Candidatos
          </Button>
        </Link>
      </div>
    );
  }

  const perfil: any = (candidate as any).perfilDetalle || {};
  const generales = perfil.generales || {};
  const domicilio = perfil.domicilio || {};
  const contactoEmergencia = perfil.contactoEmergencia || {};

  const perfilFields = [
    // Generales
    generales.puestoSolicitado,
    generales.plaza,
    generales.ciudadResidencia,
    generales.rfc,
    generales.telefonoCasa,
    generales.telefonoRecados,
    generales.fechaNacimiento,
    generales.lugarNacimiento,
    generales.nss,
    generales.curp,
    // Domicilio
    domicilio.calle,
    domicilio.numero,
    domicilio.interior,
    domicilio.colonia,
    domicilio.municipio,
    domicilio.estado,
    domicilio.cp,
    domicilio.mapLink,
    // Contacto emergencia
    contactoEmergencia.nombre,
    contactoEmergencia.parentesco,
    contactoEmergencia.telefono,
    // Situación familiar
    perfil.situacionFamiliar?.estadoCivil,
    perfil.situacionFamiliar?.fechaMatrimonioUnion,
    perfil.situacionFamiliar?.parejaDeAcuerdoConTrabajo,
    perfil.situacionFamiliar?.esposaEmbarazada,
    perfil.situacionFamiliar?.hijosDescripcion,
    perfil.situacionFamiliar?.quienCuidaHijos,
    perfil.situacionFamiliar?.dondeVivenCuidadores,
    perfil.situacionFamiliar?.pensionAlimenticia,
    perfil.situacionFamiliar?.vivienda,
    // Redes sociales
    perfil.redesSociales?.facebook,
    perfil.redesSociales?.instagram,
    perfil.redesSociales?.twitterX,
    perfil.redesSociales?.tiktok,
    // Pareja / Noviazgo
    perfil.parejaNoviazgo?.tieneNovio,
    perfil.parejaNoviazgo?.nombreNovio,
    perfil.parejaNoviazgo?.ocupacionNovio,
    perfil.parejaNoviazgo?.domicilioNovio,
    perfil.parejaNoviazgo?.apoyoEconomicoMutuo,
    perfil.parejaNoviazgo?.negocioEnConjunto,
    // Financiero / Antecedentes
    perfil.financieroAntecedentes?.tieneDeudas,
    perfil.financieroAntecedentes?.institucionDeuda,
    perfil.financieroAntecedentes?.haSidoSindicalizado,
    perfil.financieroAntecedentes?.haEstadoAfianzado,
    perfil.financieroAntecedentes?.accidentesVialesPrevios,
    perfil.financieroAntecedentes?.accidentesTrabajoPrevios,
  ];

  const perfilFilledCount = perfilFields.filter(hasValue).length;
  const perfilTotalCount = perfilFields.length;
  const perfilPct = perfilTotalCount > 0 ? Math.round((perfilFilledCount / perfilTotalCount) * 100) : 0;

  const hasIdentificacion =
    hasValue(generales.puestoSolicitado) ||
    hasValue(generales.plaza) ||
    hasValue(generales.ciudadResidencia) ||
    hasValue(generales.rfc) ||
    hasValue(generales.telefonoCasa) ||
    hasValue(generales.telefonoRecados) ||
    hasValue(generales.fechaNacimiento) ||
    hasValue(generales.lugarNacimiento);
  const hasDomicilio =
    hasValue(domicilio.calle) ||
    hasValue(domicilio.numero) ||
    hasValue(domicilio.interior) ||
    hasValue(domicilio.colonia) ||
    hasValue(domicilio.municipio) ||
    hasValue(domicilio.estado) ||
    hasValue(domicilio.cp) ||
    hasValue(domicilio.mapLink);
  const hasContactoEmergencia =
    hasValue(contactoEmergencia.nombre) ||
    hasValue(contactoEmergencia.parentesco) ||
    hasValue(contactoEmergencia.telefono);
  const hasEntornoFamiliar =
    hasValue(perfil.situacionFamiliar?.estadoCivil) ||
    hasValue(perfil.situacionFamiliar?.hijosDescripcion) ||
    hasValue(perfil.situacionFamiliar?.vivienda) ||
    hasValue(perfil.situacionFamiliar?.fechaMatrimonioUnion) ||
    hasValue(perfil.situacionFamiliar?.parejaDeAcuerdoConTrabajo) ||
    hasValue(perfil.situacionFamiliar?.esposaEmbarazada) ||
    hasValue(perfil.situacionFamiliar?.quienCuidaHijos) ||
    hasValue(perfil.situacionFamiliar?.dondeVivenCuidadores) ||
    hasValue(perfil.situacionFamiliar?.pensionAlimenticia);
  const hasRedes =
    hasValue(perfil.redesSociales?.facebook) ||
    hasValue(perfil.redesSociales?.instagram) ||
    hasValue(perfil.redesSociales?.twitterX) ||
    hasValue(perfil.redesSociales?.tiktok);
  const hasParejaNoviazgo =
    hasValue(perfil.parejaNoviazgo?.tieneNovio) ||
    hasValue(perfil.parejaNoviazgo?.nombreNovio) ||
    hasValue(perfil.parejaNoviazgo?.ocupacionNovio) ||
    hasValue(perfil.parejaNoviazgo?.domicilioNovio) ||
    hasValue(perfil.parejaNoviazgo?.apoyoEconomicoMutuo) ||
    hasValue(perfil.parejaNoviazgo?.negocioEnConjunto);
  const hasEstudios =
    hasValue(perfil.estudios?.nivelEstudios) ||
    hasValue(perfil.estudios?.carrera) ||
    hasValue(perfil.estudios?.estadoCarrera) ||
    hasValue(perfil.estudios?.esEstudiante) ||
    hasValue(perfil.estudios?.modalidadEstudios);
  const hasVehiculo =
    hasValue(perfil.vehiculo?.licenciaConducir) ||
    hasValue(perfil.vehiculo?.claseLicencia) ||
    hasValue(perfil.vehiculo?.tieneVehiculo);
  const hasEconomia =
    hasValue(perfil.financieroAntecedentes?.tieneDeudas) ||
    hasValue(perfil.financieroAntecedentes?.institucionDeuda) ||

    hasValue(perfil.financieroAntecedentes?.haSidoSindicalizado) ||
    hasValue(perfil.financieroAntecedentes?.haEstadoAfianzado) ||
    hasValue(perfil.financieroAntecedentes?.accidentesVialesPrevios) ||
    hasValue(perfil.financieroAntecedentes?.accidentesTrabajoPrevios);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/candidatos">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent>Volver al listado de candidatos</TooltipContent>
        </Tooltip>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{candidate.nombreCompleto}</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-muted-foreground">Detalle del candidato</p>
            {/* Badge de consentimiento - lee desde perfilDetalle.consentimiento JSON */}
            {(() => {
              const perfilDetalle = (candidate as any)?.perfilDetalle;
              const consentimiento = perfilDetalle?.consentimiento;
              if (consentimiento?.aceptoAvisoPrivacidad && consentimiento?.aceptoAvisoPrivacidadAt) {
                return (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md cursor-help">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                        ✅ Aceptó términos ({new Date(consentimiento.aceptoAvisoPrivacidadAt).toLocaleDateString()})
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Consentimiento de privacidad registrado</TooltipContent>
                  </Tooltip>
                );
              }
              return null;
            })()}
          </div>
        </div>
      </div>

      {/* ═══ IMPL-20260312-02 | Doc: Micro-Sprint 02 — War Room Refactoring ═══ */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          <TabsTrigger value="empleos">Empleos</TabsTrigger>
          <TabsTrigger value="procesos">Procesos</TabsTrigger>
          <TabsTrigger value="acceso">Acceso</TabsTrigger>
        </TabsList>

        {/* ════════════ TAB: PERFIL ════════════ */}
        <TabsContent value="perfil" className="space-y-6 mt-4">

          {/* Información General — edición inline */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Información General</CardTitle>
              {!isClientAuth && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (!editingBasicInfo) {
                      setBasicInfoForm({
                        nombreCompleto: candidate.nombreCompleto || "",
                        email: candidate.email || "",
                        telefono: candidate.telefono || "",
                      });
                    }
                    setEditingBasicInfo(!editingBasicInfo);
                  }}
                >
                  {editingBasicInfo ? "Cancelar" : <Pencil className="h-4 w-4" />}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editingBasicInfo ? (
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateCandidateMutation.mutate({
                      id: candidateId,
                      data: {
                        nombreCompleto: basicInfoForm.nombreCompleto,
                        email: basicInfoForm.email,
                        telefono: basicInfoForm.telefono,
                      },
                    });
                  }}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="edit-nombre">Nombre completo</Label>
                      <Input
                        id="edit-nombre"
                        value={basicInfoForm.nombreCompleto}
                        onChange={(e) =>
                          setBasicInfoForm({ ...basicInfoForm, nombreCompleto: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-email">Email</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        value={basicInfoForm.email}
                        onChange={(e) =>
                          setBasicInfoForm({ ...basicInfoForm, email: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-tel">Teléfono</Label>
                      <Input
                        id="edit-tel"
                        value={basicInfoForm.telefono}
                        onChange={(e) =>
                          setBasicInfoForm({ ...basicInfoForm, telefono: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={updateCandidateMutation.isPending}>
                      {updateCandidateMutation.isPending ? "Guardando..." : "Guardar"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingBasicInfo(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{candidate.email || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Teléfono</p>
                    <p className="font-medium">{candidate.telefono || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Medio de Recepción</p>
                    <p className="font-medium">{candidate.medioDeRecepcion || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha de Registro</p>
                    <p className="font-medium">
                      {new Date(candidate.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">NSS (IMSS)</p>
                    <p className="font-medium flex items-center gap-1">
                      {hasValue(generales.nss) && (
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      )}
                      {generales.nss || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">CURP</p>
                    <p className="font-medium flex items-center gap-1">
                      {hasValue(generales.curp) && (
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      )}
                      {generales.curp || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Analista Responsable</p>
                    <p className="font-medium">
                      {candidate?.analistaAsignadoId 
                        ? analysts.find(a => a.id === candidate.analistaAsignadoId)?.name || 
                          analysts.find(a => a.id === candidate.analistaAsignadoId)?.email || 
                          "-"
                        : "-"}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

      {/* Perfil extendido del candidato */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Perfil extendido del candidato
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] cursor-help">
                  ?
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                Datos declarados por el candidato en su formulario de auto‑registro:
                identificación, domicilio, contacto de emergencia y entorno familiar.
                Usa “Editar perfil extendido” para corregirlos (abre el formulario del
                candidato) y “Marcar como revisada” cuando ya validaste.
              </TooltipContent>
            </Tooltip>
          </CardTitle>

          {!isClientAuth && (
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={createSelfServiceLink.isPending}
                      onClick={() => {
                        setOpenSelfServiceAfterCreate(true);
                        createSelfServiceLink.mutate({
                          candidateId,
                          ttlHours: 6,
                          baseUrl: window.location.origin,
                        });
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {createSelfServiceLink.isPending
                    ? "Abriendo..."
                    : "Editar perfil extendido"}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={
                        markSelfReviewed.isPending ||
                        candidate.selfFilledStatus !== "recibido"
                      }
                      onClick={() => markSelfReviewed.mutate({ id: candidateId })}
                    >
                      <CheckCircle2
                        className={
                          candidate.selfFilledStatus === "revisado"
                            ? "h-4 w-4 text-emerald-500"
                            : "h-4 w-4"
                        }
                      />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {candidate.selfFilledStatus === "revisado"
                    ? "Revisado"
                    : candidate.selfFilledStatus === "recibido"
                    ? markSelfReviewed.isPending
                      ? "Marcando..."
                      : "Marcar como revisada"
                    : "Aún no hay captura para revisar"}
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {perfilFilledCount > 0 && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

              {/* ── Identificación ── */}
              {hasIdentificacion && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50 space-y-3">
                  <div className="flex items-center gap-2">
                    <IdentificationCard weight="fill" className="h-4 w-4 text-blue-500" />
                    <p className="font-semibold text-slate-700 text-sm">Identificación</p>
                  </div>
                  {hasValue(generales.puestoSolicitado) && <InfoItem label="Puesto solicitado" value={generales.puestoSolicitado} />}
                  {hasValue(generales.plaza) && <InfoItem label="Plaza / CEDI" value={generales.plaza} />}
                  {hasValue(generales.ciudadResidencia) && <InfoItem label="Ciudad de residencia" value={generales.ciudadResidencia} />}
                  {hasValue(generales.rfc) && <InfoItem label="RFC" value={generales.rfc} />}
                  {(hasValue(generales.telefonoCasa) || hasValue(generales.telefonoRecados)) && (
                    <InfoItem label="Tel. casa / recados" value={[generales.telefonoCasa, generales.telefonoRecados].filter(Boolean).join(" / ")} />
                  )}
                  {hasValue(generales.fechaNacimiento) && <InfoItem label="Fecha de nacimiento" value={generales.fechaNacimiento} />}
                  {hasValue(generales.lugarNacimiento) && <InfoItem label="Lugar de nacimiento" value={generales.lugarNacimiento} />}
                </div>
              )}

              {/* ── Domicilio ── */}
              {hasDomicilio && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50 space-y-3">
                  <div className="flex items-center gap-2">
                    <House weight="fill" className="h-4 w-4 text-emerald-500" />
                    <p className="font-semibold text-slate-700 text-sm">Domicilio</p>
                  </div>
                  {(hasValue(domicilio.calle) || hasValue(domicilio.numero) || hasValue(domicilio.interior) || hasValue(domicilio.colonia) || hasValue(domicilio.municipio) || hasValue(domicilio.estado) || hasValue(domicilio.cp)) && (
                    <InfoItem label="Dirección" value={[domicilio.calle, domicilio.numero, domicilio.interior, domicilio.colonia, domicilio.municipio, domicilio.estado, domicilio.cp].filter(Boolean).join(", ")} />
                  )}
                  {domicilio.mapLink && typeof domicilio.mapLink === 'object' && 'lat' in domicilio.mapLink && 'lng' in domicilio.mapLink && (
                    <div className="mt-2 rounded-lg overflow-hidden border border-slate-200" style={{ height: "240px" }}>
                      <MapContainer center={[domicilio.mapLink.lat, domicilio.mapLink.lng]} zoom={16} className="h-full w-full">
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
                        <Marker position={[domicilio.mapLink.lat, domicilio.mapLink.lng]} />
                      </MapContainer>
                    </div>
                  )}
                </div>
              )}

              {/* ── Contacto de emergencia ── */}
              {hasContactoEmergencia && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50 space-y-3">
                  <div className="flex items-center gap-2">
                    <Phone weight="fill" className="h-4 w-4 text-red-500" />
                    <p className="font-semibold text-slate-700 text-sm">Contacto de emergencia</p>
                  </div>
                  {hasValue(contactoEmergencia.nombre) && <InfoItem label="Nombre" value={contactoEmergencia.nombre} />}
                  {hasValue(contactoEmergencia.parentesco) && <InfoItem label="Parentesco" value={contactoEmergencia.parentesco} />}
                  {hasValue(contactoEmergencia.telefono) && <InfoItem label="Teléfono" value={contactoEmergencia.telefono} />}
                </div>
              )}

              {/* ── Entorno familiar ── */}
              {hasEntornoFamiliar && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50 space-y-3">
                  <div className="flex items-center gap-2">
                    <UsersThree weight="fill" className="h-4 w-4 text-violet-500" />
                    <p className="font-semibold text-slate-700 text-sm">Entorno familiar</p>
                  </div>
                  {hasValue(perfil.situacionFamiliar?.estadoCivil) && <InfoItem label="Estado civil" value={perfil.situacionFamiliar?.estadoCivil} />}
                  {hasValue(perfil.situacionFamiliar?.tieneHijos) && <InfoItem label="¿Tiene hijos?" value={perfil.situacionFamiliar?.tieneHijos} />}
                  {hasValue(perfil.situacionFamiliar?.cantidadHijos) && <InfoItem label="Cantidad de hijos" value={perfil.situacionFamiliar?.cantidadHijos} />}
                  {hasValue(perfil.situacionFamiliar?.edadesHijos) && <InfoItem label="Edades de los hijos" value={perfil.situacionFamiliar?.edadesHijos} />}
                  {hasValue(perfil.situacionFamiliar?.hijosDescripcion) && <InfoItem label="Hijos / comentarios" value={perfil.situacionFamiliar?.hijosDescripcion} />}
                  {hasValue(perfil.situacionFamiliar?.vivienda) && <InfoItem label="Vivienda" value={perfil.situacionFamiliar?.vivienda} />}
                  {hasValue(perfil.situacionFamiliar?.fechaMatrimonioUnion) && <InfoItem label="Fecha matrimonio / unión" value={perfil.situacionFamiliar?.fechaMatrimonioUnion} />}
                  {hasValue(perfil.situacionFamiliar?.parejaDeAcuerdoConTrabajo) && <InfoItem label="Pareja de acuerdo con trabajo" value={perfil.situacionFamiliar?.parejaDeAcuerdoConTrabajo} />}
                  {hasValue(perfil.situacionFamiliar?.esposaEmbarazada) && <InfoItem label="Esposa embarazada" value={perfil.situacionFamiliar?.esposaEmbarazada} />}
                  {hasValue(perfil.situacionFamiliar?.quienCuidaHijos) && <InfoItem label="Quién cuida a los hijos" value={perfil.situacionFamiliar?.quienCuidaHijos} />}
                  {hasValue(perfil.situacionFamiliar?.dondeVivenCuidadores) && <InfoItem label="Dónde viven los cuidadores" value={perfil.situacionFamiliar?.dondeVivenCuidadores} />}
                  {hasValue(perfil.situacionFamiliar?.pensionAlimenticia) && <InfoItem label="Pensión alimenticia" value={perfil.situacionFamiliar?.pensionAlimenticia} />}
                </div>
              )}

              {/* ── Redes sociales ── */}
              {hasRedes && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50 space-y-3">
                  <div className="flex items-center gap-2">
                    <ShareNetwork weight="fill" className="h-4 w-4 text-sky-500" />
                    <p className="font-semibold text-slate-700 text-sm">Redes sociales</p>
                  </div>
                  {hasValue(perfil.redesSociales?.facebook) && <InfoItem label="Facebook" value={perfil.redesSociales?.facebook} />}
                  {hasValue(perfil.redesSociales?.instagram) && <InfoItem label="Instagram" value={perfil.redesSociales?.instagram} />}
                  {hasValue(perfil.redesSociales?.twitterX) && <InfoItem label="Twitter / X" value={perfil.redesSociales?.twitterX} />}
                  {hasValue(perfil.redesSociales?.tiktok) && <InfoItem label="TikTok" value={perfil.redesSociales?.tiktok} />}
                </div>
              )}

              {/* ── Pareja / Noviazgo ── */}
              {hasParejaNoviazgo && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50 space-y-3">
                  <div className="flex items-center gap-2">
                    <Heart weight="fill" className="h-4 w-4 text-pink-500" />
                    <p className="font-semibold text-slate-700 text-sm">Pareja / Noviazgo</p>
                  </div>
                  {hasValue(perfil.parejaNoviazgo?.tieneNovio) && <InfoItem label="¿Tiene novio/a?" value={perfil.parejaNoviazgo?.tieneNovio} />}
                  {hasValue(perfil.parejaNoviazgo?.nombreNovio) && <InfoItem label="Nombre" value={perfil.parejaNoviazgo?.nombreNovio} />}
                  {hasValue(perfil.parejaNoviazgo?.ocupacionNovio) && (
                    <InfoItem label="Ocupación" value={perfil.parejaNoviazgo?.ocupacionNovio} />
                  )}
                  {hasValue(perfil.parejaNoviazgo?.domicilioNovio) && (
                    <InfoItem label="Domicilio" value={perfil.parejaNoviazgo?.domicilioNovio} />
                  )}
                  {hasValue(perfil.parejaNoviazgo?.apoyoEconomicoMutuo) && (
                    <InfoItem label="Apoyo económico mutuo" value={perfil.parejaNoviazgo?.apoyoEconomicoMutuo} />
                  )}
                  {hasValue(perfil.parejaNoviazgo?.negocioEnConjunto) && (
                    <InfoItem label="Negocio en conjunto" value={perfil.parejaNoviazgo?.negocioEnConjunto} />
                  )}
                </div>
              )}

              {/* ── Estudios ── */}
              {hasEstudios && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50 space-y-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap weight="fill" className="h-4 w-4 text-amber-500" />
                    <p className="font-semibold text-slate-700 text-sm">Estudios</p>
                  </div>
                  {hasValue(perfil.estudios?.nivelEstudios) && <InfoItem label="Nivel de estudios" value={perfil.estudios?.nivelEstudios} />}
                  {hasValue(perfil.estudios?.carrera) && <InfoItem label="Carrera" value={perfil.estudios?.carrera} />}
                  {hasValue(perfil.estudios?.estadoCarrera) && <InfoItem label="Estado de carrera" value={perfil.estudios?.estadoCarrera} />}
                  {hasValue(perfil.estudios?.esEstudiante) && <InfoItem label="¿Es estudiante?" value={perfil.estudios?.esEstudiante} />}
                  {hasValue(perfil.estudios?.modalidadEstudios) && <InfoItem label="Modalidad" value={perfil.estudios?.modalidadEstudios} />}
                </div>
              )}

              {/* ── Vehículo / Licencia ── */}
              {hasVehiculo && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50 space-y-3">
                  <div className="flex items-center gap-2">
                    <Car weight="fill" className="h-4 w-4 text-teal-500" />
                    <p className="font-semibold text-slate-700 text-sm">Vehículo / Licencia</p>
                  </div>
                  {hasValue(perfil.vehiculo?.licenciaConducir) && <InfoItem label="Licencia de conducir" value={perfil.vehiculo?.licenciaConducir} />}
                  {hasValue(perfil.vehiculo?.claseLicencia) && <InfoItem label="Clase de licencia" value={perfil.vehiculo?.claseLicencia} />}
                  {hasValue(perfil.vehiculo?.tieneVehiculo) && <InfoItem label="¿Tiene vehículo?" value={perfil.vehiculo?.tieneVehiculo} />}
                </div>
              )}

              {/* ── Situación económica ── */}
              {hasEconomia && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50 space-y-3">
                  <div className="flex items-center gap-2">
                    <CurrencyDollar weight="fill" className="h-4 w-4 text-green-600" />
                    <p className="font-semibold text-slate-700 text-sm">Situación económica</p>
                  </div>
                  {hasValue(perfil.financieroAntecedentes?.tieneDeudas) && <InfoItem label="¿Tiene deudas?" value={perfil.financieroAntecedentes?.tieneDeudas} />}
                  {hasValue(perfil.financieroAntecedentes?.historialburoCredito) && <InfoItem label="Historial crediticio" value={perfil.financieroAntecedentes?.historialburoCredito} />}
                  {hasValue(perfil.sindicato?.sindicatoEmpresa) && <InfoItem label="¿Pertenece a sindicato?" value={perfil.sindicato?.sindicatoEmpresa} />}
                  {hasValue(perfil.sindicato?.puestoSindicato) && <InfoItem label="Puesto sindical" value={perfil.sindicato?.puestoSindicato} />}
                  {hasValue(perfil.financieroAntecedentes?.institucionDeuda) && <InfoItem label="Institución de deuda" value={perfil.financieroAntecedentes?.institucionDeuda} />}
                  {(hasValue(perfil.financieroAntecedentes?.haSidoSindicalizado) || hasValue(perfil.financieroAntecedentes?.haEstadoAfianzado)) && (
                    <InfoItem label="Sindicalizado / Afianzado" value={[perfil.financieroAntecedentes?.haSidoSindicalizado, perfil.financieroAntecedentes?.haEstadoAfianzado].filter(Boolean).join(" / ")} />
                  )}
                  {hasValue(perfil.financieroAntecedentes?.sindicatoEmpresa) && (
                    <InfoItem label="Sindicato / Empresa" value={`${perfil.financieroAntecedentes?.sindicatoEmpresa}${perfil.financieroAntecedentes?.puestoSindicato ? ` (${perfil.financieroAntecedentes?.puestoSindicato})` : ''}`} />
                  )}
                  {hasValue(perfil.financieroAntecedentes?.accidentesVialesPrevios) && <InfoItem label="Accidentes viales previos" value={perfil.financieroAntecedentes?.accidentesVialesPrevios} />}
                  {hasValue(perfil.financieroAntecedentes?.accidentesTrabajoPrevios) && <InfoItem label="Accidentes de trabajo previos" value={perfil.financieroAntecedentes?.accidentesTrabajoPrevios} />}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Captura inicial self-service */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Captura inicial del candidato
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] cursor-help">
                  ?
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                Aquí ves el estado del formulario que llena el candidato. Primero
                genera el enlace de pre‑registro, después espera a que aparezca
                como “Captura completada” y finalmente márcalo como revisado cuando
                hayas validado los datos.
              </TooltipContent>
            </Tooltip>
          </CardTitle>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={createSelfServiceLink.isPending}
              onClick={() => {
                setOpenSelfServiceAfterCreate(false);
                createSelfServiceLink.mutate({
                  candidateId,
                  ttlHours: 6,
                  baseUrl: window.location.origin,
                });
              }}
            >
              {createSelfServiceLink.isPending
                ? "Generando..."
                : "Generar enlace"}
            </Button>

            {!isClientAuth && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={createSelfServiceLink.isPending}
                      onClick={() => {
                        setOpenSelfServiceAfterCreate(true);
                        createSelfServiceLink.mutate({
                          candidateId,
                          ttlHours: 6,
                          baseUrl: window.location.origin,
                        });
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {createSelfServiceLink.isPending
                    ? "Abriendo..."
                    : "Editar autocaptura"}
                </TooltipContent>
              </Tooltip>
            )}

            {!isClientAuth && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={
                        markSelfReviewed.isPending ||
                        candidate.selfFilledStatus !== "recibido"
                      }
                      onClick={() => markSelfReviewed.mutate({ id: candidateId })}
                    >
                      <CheckCircle2
                        className={
                          candidate.selfFilledStatus === "revisado"
                            ? "h-4 w-4 text-emerald-500"
                            : "h-4 w-4"
                        }
                      />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {candidate.selfFilledStatus === "revisado"
                    ? "Revisado"
                    : candidate.selfFilledStatus === "recibido"
                    ? markSelfReviewed.isPending
                      ? "Marcando..."
                      : "Marcar como revisada"
                    : "Aún no hay captura para revisar"}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium">Estado de la captura</p>
            <p className="text-sm text-muted-foreground">
              {candidate.selfFilledStatus === "revisado"
                ? "Captura completada por el candidato y revisada por el analista."
                : candidate.selfFilledStatus === "recibido"
                ? "Captura completada por el candidato. Pendiente de revisión."
                : "Pendiente de captura por el candidato."}
            </p>
            {candidate.selfFilledAt && (
              <p className="text-xs text-muted-foreground">
                Enviada por el candidato el{" "}
                {new Date(candidate.selfFilledAt).toLocaleString()}
              </p>
            )}
            {candidate.selfFilledReviewedAt && (
              <p className="text-xs text-muted-foreground">
                Revisada el{" "}
                {new Date(candidate.selfFilledReviewedAt).toLocaleString()}
              </p>
            )}
          </div>

          {selfServiceUrl && (
            <div className="space-y-1 text-xs">
              <Label className="text-xs">Último enlace generado</Label>
              <div className="flex gap-2 items-center">
                <Input
                  readOnly
                  value={selfServiceUrl}
                  className="text-xs font-mono"
                  title={selfServiceUrl}
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    try {
                      navigator.clipboard?.writeText(selfServiceUrl);
                      toast.success("Enlace copiado");
                    } catch {
                      toast.error("No se pudo copiar el enlace");
                    }
                  }}
                >
                  Copiar
                </Button>
              </div>
              {selfServiceExpiresAt && (
                <p className="text-[11px] text-muted-foreground">
                  Vigente hasta: {selfServiceExpiresAt.toLocaleString()}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

        </TabsContent>

        {/* ════════════ TAB: EMPLEOS ════════════ */}
        <TabsContent value="empleos" className="space-y-6 mt-4">

      {/* Work History */}
      <Card className="border-primary/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Historial Laboral
          </CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                onClick={() => {
                  setEditingWorkHistory(null);
                  setReviewDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Registra un nuevo empleo para este candidato.
            </TooltipContent>
          </Tooltip>
        </CardHeader>
        <CardContent>
          {workHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay historial laboral registrado
            </p>
          ) : (
            <div className="space-y-4">
              {workHistory.map((item) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold">{item.empresa}</h4>
                      <p className="text-sm text-muted-foreground">{item.puesto || "-"}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.fechaInicio ? formatearFecha(item.fechaInicio) : "-"} -{" "}
                        {item.fechaFin ? formatearFecha(item.fechaFin) : "Actual"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tiempo trabajado:{" "}
                        {item.tiempoTrabajadoEmpresa ||
                          item.tiempoTrabajado ||
                          calcularTiempoTrabajado(item.fechaInicio, item.fechaFin) ||
                          "-"}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Capturado por{" "}
                        <span className="font-semibold">
                          {(item.capturadoPor === "candidato" || !item.capturadoPor)
                            ? "CANDIDATO"
                            : "ANALISTA"}
                        </span>
                        {item.capturadoPor === "analista" && (
                          <span className="text-[10px] text-amber-600 ml-1">
                            (editado)
                          </span>
                        )}
                      </p>
                      {item.causalSalidaRH && (
                        <p className="text-xs mt-2">
                          <span className="text-muted-foreground">Motivo de salida (RH):</span>{" "}
                          {item.causalSalidaRH}
                        </p>
                      )}
                      {item.causalSalidaJefeInmediato && (
                        <p className="text-xs">
                          <span className="text-muted-foreground">
                            Motivo de salida (Jefe inmediato):
                          </span>{" "}
                          {item.causalSalidaJefeInmediato}
                        </p>
                      )}
                      {item.comentarioInvestigacion && (
                        <p className="text-sm mt-2">
                          <span className="text-muted-foreground">Comentario de verificación:</span>{" "}
                          {item.comentarioInvestigacion}
                        </p>
                      )}
                      {item.observaciones && (
                        <p className="text-sm mt-2">
                          <span className="text-muted-foreground">Observaciones:</span> {item.observaciones}
                        </p>
                      )}
                      {item.investigacionDetalle && item.investigacionDetalle.conclusion && item.investigacionDetalle.conclusion.comentariosAdicionales && (
                        <p className="text-sm mt-2 bg-amber-50 p-2 rounded-md border-l-2 border-amber-400">
                          <span className="text-muted-foreground font-semibold block mb-1">Comentarios adicionales:</span>
                          <span className="text-slate-700">{item.investigacionDetalle.conclusion.comentariosAdicionales}</span>
                        </p>
                      )}
                      {item.investigacionDetalle && (
                        <div className="mt-3 border-t pt-2 text-[11px] text-slate-600 space-y-1">
                          {(() => {
                            const inv: any = item.investigacionDetalle || {};
                            const periodo = inv.periodo || {};
                            const puestoInv = inv.puesto || {};
                            const incidencias = inv.incidencias || {};
                            const ia = inv.iaDictamen || null;
                            const declaradoFechas =
                              (item.fechaInicio ? formatearFecha(item.fechaInicio) : "-") +
                              " - " +
                              (item.fechaFin ? formatearFecha(item.fechaFin) : "Actual");
                            const validadoFechas = Array.isArray(periodo.periodos) && periodo.periodos.length > 0
                              ? periodo.periodos.map((p: any) => 
                                  (p.periodoEmpresa || "") + (p.puesto ? ` [${p.puesto}]` : "")
                                ).join(" + ")
                              : (periodo.antiguedadTexto || (periodo.fechaIngreso ? `${periodo.fechaIngreso} - ${periodo.fechaSalida || "Actual"}` : "-"));
                            return (
                              <>
                                <div className="mt-4 border rounded-md overflow-hidden text-xs">
                                  <div className="bg-slate-50 flex items-center gap-1 p-2 font-semibold text-slate-700 border-b">
                                    Comparativa de Referencias
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[9px] cursor-help">?</span>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-xs text-xs">
                                        Compara lo que el candidato declaró en entrevista frente a lo que confirmó RH de la empresa.
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                  <div className="grid grid-cols-2 divide-x">
                                    {/* Declarado (Candidato) */}
                                    <div className="p-3 space-y-2 bg-white">
                                      <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wide mb-1">Declarado por el Candidato</div>
                                      <div><span className="text-slate-400 font-medium block text-[10px] uppercase">Fechas:</span> {declaradoFechas}</div>
                                      <div><span className="text-slate-400 font-medium block text-[10px] uppercase">Puesto:</span> {item.puesto || "-"}</div>
                                      {(incidencias.motivoSeparacionCandidato || incidencias.motivoSeparacionEmpresa) && (
                                        <div><span className="text-slate-400 font-medium block text-[10px] uppercase">Motivo de salida:</span> {incidencias.motivoSeparacionCandidato || "-"}</div>
                                      )}
                                    </div>
                                    {/* Validado (Empresa) */}
                                    <div className="p-3 space-y-2 bg-blue-50/40">
                                      <div className="text-[10px] uppercase font-bold text-blue-600 tracking-wide mb-1">Confirmado por RH / Jefe</div>
                                      <div><span className="text-blue-500/70 font-medium block text-[10px] uppercase">Fechas:</span> {validadoFechas}</div>
                                      <div><span className="text-blue-500/70 font-medium block text-[10px] uppercase">Puesto:</span> {puestoInv.puestoFinal || puestoInv.puestoInicial || "-"}</div>
                                      {(incidencias.motivoSeparacionCandidato || incidencias.motivoSeparacionEmpresa) && (
                                        <div><span className="text-blue-500/70 font-medium block text-[10px] uppercase">Motivo de salida:</span> {incidencias.motivoSeparacionEmpresa || "-"}</div>
                                      )}
                                    </div>
                                  </div>
                                  {inv.conclusion && (inv.conclusion.esRecomendable || inv.conclusion.loRecontrataria) && (
                                    <div className="bg-slate-50 p-3 flex flex-col gap-2 border-t">
                                      <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wide mb-1">Desempeño y Recomendación</div>
                                      <div className="grid grid-cols-2 gap-3">
                                        <div><span className="text-slate-400 font-medium block text-[10px] uppercase">¿Es Recomendable?</span> {inv.conclusion.esRecomendable || "-"}</div>
                                        <div><span className="text-slate-400 font-medium block text-[10px] uppercase">¿Lo Recontratarían?</span> {inv.conclusion.loRecontrataria || "-"}</div>
                                        {inv.conclusion.razonRecontratacion && (
                                          <div className="col-span-2"><span className="text-slate-400 font-medium block text-[10px] uppercase">Motivos / Razones:</span> {inv.conclusion.razonRecontratacion}</div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                {ia && (
                                  <div className="mt-3 border-t pt-2 space-y-1">
                                    <p className="font-semibold text-slate-700 flex items-center gap-1">
                                      Sugerencia IA (apoyo al analista)
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border text-[9px] cursor-help">
                                            ?
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs text-xs">
                                          Resumen generado automáticamente a partir de la información
                                          capturada para este empleo. No sustituye el dictamen humano,
                                          solo sirve como apoyo interno para el analista.
                                        </TooltipContent>
                                      </Tooltip>
                                    </p>
                                    {ia.resumenCorto && (
                                      <p>{ia.resumenCorto}</p>
                                    )}
                                    {Array.isArray(ia.fortalezas) && ia.fortalezas.length > 0 && (
                                      <p>
                                        <span className="text-muted-foreground">
                                          Fortalezas:&nbsp;
                                        </span>
                                        {ia.fortalezas.join("; ")}
                                      </p>
                                    )}
                                    {Array.isArray(ia.riesgos) && ia.riesgos.length > 0 && (
                                      <p>
                                        <span className="text-muted-foreground">
                                          Riesgos:&nbsp;
                                        </span>
                                        {ia.riesgos.join("; ")}
                                      </p>
                                    )}
                                    {ia.recomendacionTexto && (
                                      <p>
                                        <span className="text-muted-foreground">
                                          Recomendación:&nbsp;
                                        </span>
                                        {ia.recomendacionTexto}
                                      </p>
                                    )}
                                  </div>
                                )}
                                {(() => {
                                  const auditTrail = inv.auditTrail;
                                  if (auditTrail && Array.isArray(auditTrail) && auditTrail.length > 0) {
                                    return (
                                      <details className="mt-3 border-t group pt-2">
                                        <summary className="font-semibold text-slate-500 flex items-center gap-1 text-[11px] cursor-pointer outline-none list-none select-none">
                                          <span className="group-open:rotate-90 transition-transform text-[8px]">▶</span>
                                          Historial de ediciones (Auditoría)
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span className="inline-flex h-3 w-3 items-center justify-center rounded-full border text-[8px] cursor-help">
                                                ?
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs text-xs">
                                              Registro de quién hizo qué cambios y cuándo.
                                            </TooltipContent>
                                          </Tooltip>
                                        </summary>
                                        <div className="mt-2 pl-3 pb-2 cursor-default border-l ml-1 border-slate-200">
                                          <AuditTrailViewer entries={auditTrail} />
                                        </div>
                                      </details>
                                    );
                                  }
                                  return null;
                                })()}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                    {/* IMPL-20260312-04: Acciones colapsadas en DropdownMenu */}
                    <div className="flex items-center justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditWorkHistory(item)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            <span>Corregir datos del candidato</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setInvestigationTarget(item);
                            const existingPeriodos = item.investigacionDetalle?.periodo?.periodos || [];
                            setPeriodRowCount(existingPeriodos.length > 0 ? existingPeriodos.length : 1);
                            setInvestigationStep(1);
                            setInvestigationDialogOpen(true);
                          }}>
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            <span>Capturar Referencia Funcional</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteWorkHistory(item.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Eliminar empleo</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dictamen Global de Investigación Laboral */}
      <Card className="border-primary/10 mt-6 bg-slate-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5" />
            Dictamen Global de Historial Laboral
          </CardTitle>
          <div className="text-sm text-slate-500">
            Una vez verificados los empleos individuales, cierra la investigación asignando un estatus global. Este resultado es el que el cliente verá como "Investigación Laboral".
          </div>
        </CardHeader>
        <CardContent>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              updateCandidateMutation.mutate({
                id: candidateId,
                data: {
                  dictamenLaboral: {
                    resultado: formData.get("resultado") as string,
                    comentariosGenerales: formData.get("comentarios") as string,
                    completado: true,
                    completadoAt: new Date().toISOString()
                  }
                }
              }, {
                onSuccess: () => {
                  toast.success("Dictamen global guardado exitosamente");
                }
              });
            }}
            className="space-y-4"
          >
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Resultado Global</Label>
                <select 
                  name="resultado" 
                  className="w-full mt-1 border rounded-md h-9 px-2 text-sm bg-white"
                  defaultValue={(candidate as any)?.dictamenLaboral?.resultado || ""}
                >
                  <option value="">Seleccione un resultado...</option>
                  <option value="Recomendable">Recomendable</option>
                  <option value="Con reservas">Con reservas</option>
                  <option value="No recomendable">No recomendable</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Comentario o Conclusión General</Label>
              <textarea 
                name="comentarios"
                className="w-full mt-1 border rounded-md p-2 text-sm min-h-[100px] bg-white"
                placeholder="Escribe el resumen general de la investigación laboral..."
                defaultValue={(candidate as any)?.dictamenLaboral?.comentariosGenerales || ""}
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={updateCandidateMutation.isPending}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {(candidate as any)?.dictamenLaboral?.completado ? "Actualizar Dictamen" : "Cerrar Investigación y Dictaminar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

        </TabsContent>

        {/* ════════════ TAB: PROCESOS ════════════ */}
        <TabsContent value="procesos" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Columna Principal: Procesos */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex items-center justify-between flex-row">
                  <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5"/> Procesos
                  </CardTitle>
                  <div className="flex gap-2">
                    {!isClientAuth && (
                      <Button size="sm" onClick={() => setCreateProcessOpen(true)}>
                        <Plus className="h-4 w-4 mr-2"/> Crear Proceso
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {procesos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin procesos</p>
                  ) : (
                    <div className="space-y-2">
                      {procesos.map((p:any) => (
                        <div key={p.id} className="border rounded p-3 bg-white shadow-sm space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{p.clave} — {p.tipoProducto}</div>
                              <div className="text-xs text-muted-foreground flex gap-2 flex-wrap">
                                <span>Estatus: {p.estatusProceso}</span>
                                {p.estatusVisual && <span>• Estatus visual: {p.estatusVisual}</span>}
                                {p.fechaCierre && <span>• Cierre: {new Date(p.fechaCierre).toLocaleDateString()}</span>}
                              </div>
                            </div>
                            <Link href={`/procesos/${p.id}`}>
                              <Button size="sm" variant="outline">Ver</Button>
                            </Link>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-muted-foreground">
                            <div className="border rounded p-2">
                              <div className="font-semibold text-gray-900 text-sm">Especialista</div>
                              <div>{p.especialistaAtraccionNombre || "Sin asignar"}</div>
                            </div>
                            <div className="border rounded p-2">
                              <div className="font-semibold text-gray-900 text-sm">Investigación Legal</div>
                              <div>{p.investigacionLegal?.antecedentes || "Sin datos"}</div>
                              {p.investigacionLegal?.flagRiesgo && <div className="text-red-600 font-semibold">Con riesgo</div>}
                            </div>
                            <div className="border rounded p-2">
                              <div className="font-semibold text-gray-900 text-sm">Buró de Crédito</div>
                              <div>{p.buroCredito?.estatus || "Sin datos"}</div>
                              {p.buroCredito?.score && <div>Score: {p.buroCredito.score}</div>}
                            </div>
                            <div className="border rounded p-2 md:col-span-3">
                              <div className="font-semibold text-gray-900 text-sm">Visita</div>
                              <div className="flex gap-2 flex-wrap">
                                <span>Tipo: {p.visitaDetalle?.tipo || "Sin datos"}</span>
                                {p.visitaDetalle?.fechaRealizacion && <span>• {new Date(p.visitaDetalle.fechaRealizacion).toLocaleDateString()}</span>}
                                {p.visitaDetalle?.comentarios && <span className="text-gray-700">• {p.visitaDetalle.comentarios}</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Columna Lateral: Visitas */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5"/> Visitas domiciliarias
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const visitas = (procesos || []).filter((p:any)=> p.visitStatus && (p.visitStatus.status || p.visitStatus.scheduledDateTime));
                    if (visitas.length === 0) {
                      return <p className="text-sm text-muted-foreground">Sin visitas asignadas</p>;
                    }
                    const surv = (surveyors as any).data || [];
                    const nombreEncuestador = (id?: number) => (surv.find((s:any)=> s.id===id)?.nombre) || '-';
                    return (
                      <div className="space-y-2">
                        {visitas.map((p:any)=> (
                          <div key={p.id} className="border rounded p-2 flex items-center justify-between bg-white text-sm">
                            <div>
                            <div className="font-medium flex items-center gap-2 text-xs">
                              {p.clave}
                              <span className="text-[10px] bg-slate-100 px-1 rounded border">{p.tipoProducto}</span>
                            </div>
                              <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                <div><span className="font-semibold">Estatus:</span> {p.visitStatus?.status || 'no_asignada'}</div>
                                {p.visitStatus?.scheduledDateTime && <div>📅 {new Date(p.visitStatus.scheduledDateTime).toLocaleString()}</div>}
                                {p.visitStatus?.encuestadorId && <div>👤 {nombreEncuestador(p.visitStatus.encuestadorId)}</div>}
                                {p.visitStatus?.direccion && <div className="truncate w-40" title={p.visitStatus.direccion}>📍 {p.visitStatus.direccion}</div>}
                              </div>
                            </div>
                            <Link href={`/procesos/${p.id}`}>
                              <Button size="icon" variant="ghost" className="h-6 w-6"><ExternalLink className="h-3 w-3"/></Button>
                            </Link>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Sheet para Crear Proceso */}
          <Sheet open={createProcessOpen} onOpenChange={setCreateProcessOpen}>
            <SheetContent className="sm:max-w-md overflow-y-auto">
              <SheetHeader className="shrink-0 mb-4">
                <SheetTitle className="pr-6 leading-tight">Crear nuevo proceso</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                {!candidate?.clienteId ? (
                  <div className="text-sm text-red-600 bg-red-50 p-4 rounded border border-red-200">
                    Este candidato no tiene un cliente asignado. Asigna un cliente para poder crear un proceso.
                  </div>
                ) : (
                  <form id="form-crear-proceso" className="space-y-4" onSubmit={(e)=>{
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget as HTMLFormElement);
                    const puestoId = parseInt(String(fd.get('puestoId')||'0'));
                    const tipoProducto = String(fd.get('tipoProducto')||'');
                    const medioDeRecepcion = (fd.get('medioDeRecepcion') as string) || undefined;
                    if (!puestoId || !tipoProducto) { toast.error('Completa los campos obligatorios'); return; }
                    createProcessMutation.mutate({
                      candidatoId: candidateId,
                      clienteId: candidate!.clienteId!,
                      puestoId,
                      tipoProducto: tipoProducto as any,
                      medioDeRecepcion: medioDeRecepcion as any,
                    } as any);
                  }}>
                    <div>
                      <Label>Cliente</Label>
                      <div className="mt-1 text-sm font-medium bg-slate-100 p-2 rounded">{candidate.clienteId} — (asignado)</div>
                    </div>
                    <div>
                      <Label htmlFor="medioDeRecepcion">¿Cómo llegó el proceso?</Label>
                      <select id="medioDeRecepcion" name="medioDeRecepcion" className="mt-1 block w-full border rounded-md h-8 px-2 text-xs bg-white">
                        <option value="">Selecciona una opción</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="correo">Correo</option>
                        <option value="telefono">Teléfono</option>
                        <option value="boca_a_boca">Boca a boca</option>
                        <option value="portal">Portal</option>
                        <option value="presencial">Presencial</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="puestoId">Puesto</Label>
                      <select id="puestoId" name="puestoId" className="mt-1 block w-full border rounded-md h-8 px-2 text-xs bg-white" required>
                        <option value="">Selecciona un puesto</option>
                        {(postsByClient.data || []).map((p:any)=> (
                          <option key={p.id} value={p.id}>{p.nombreDelPuesto}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="tipoProducto">Proceso a realizar</Label>
                      <select id="tipoProducto" name="tipoProducto" className="mt-1 block w-full border rounded-md h-8 px-2 text-xs bg-white" required>
                        <option value="">Selecciona tipo</option>
                        <option value="ese_completo">ESE Completo</option>
                        <option value="ese_parcial">ESE Parcial</option>
                        <option value="visita_domiciliaria">Visita Domiciliaria</option>
                        <option value="referencias">Solo Referencias</option>
                        <option value="legal">Solo Legal</option>
                        <option value="buro">Solo Buró</option>
                        <option value="medico">Médico</option>
                        <option value="toxicologico">Antidoping</option>
                        <option value="psicometria">Psicometría</option>
                      </select>
                    </div>
                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                      <Button type="button" variant="outline" onClick={()=>setCreateProcessOpen(false)}>Cancelar</Button>
                      <Button type="submit" disabled={createProcessMutation.isPending}>
                        {createProcessMutation.isPending ? <span className="animate-spin mr-2">⏳</span> : <Plus className="h-4 w-4 mr-2"/>}
                        Crear proceso
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </TabsContent>

        {/* ════════════ TAB: ACCESO ════════════ */}
        <TabsContent value="acceso" className="space-y-6 mt-4">

          {/* Consentimiento de privacidad — inline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" /> Consentimiento de privacidad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const consentimiento = (candidate as any)?.perfilDetalle?.consentimiento;
                if (consentimiento?.aceptoAvisoPrivacidad && consentimiento?.aceptoAvisoPrivacidadAt) {
                  return (
                    <div className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md">
                      ✅ Aceptó términos ({new Date(consentimiento.aceptoAvisoPrivacidadAt).toLocaleDateString()})
                    </div>
                  );
                }
                return <p className="text-sm text-muted-foreground">Pendiente de aceptar consentimiento de privacidad.</p>;
              })()}
              {consent?.token && (
                <div className="space-y-1 text-xs">
                  <Label className="text-xs">URL de consentimiento</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      readOnly
                      value={buildConsentUrl(consent.token)}
                      className="text-xs font-mono"
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        try {
                          navigator.clipboard?.writeText(buildConsentUrl(consent.token));
                          toast.success("Enlace copiado");
                        } catch {
                          toast.error("No se pudo copiar");
                        }
                      }}
                    >
                      Copiar
                    </Button>
                  </div>
                </div>
              )}
              {!isClientAuth && (
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setConsentAction("email"); sendConsentLink.mutate({ candidateId, candidateEmail: candidate?.email || "", candidateName: candidate?.nombreCompleto || "" } as any); }}
                    disabled={sendConsentLink.isPending}
                  >
                    Enviar por correo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setConsentAction("whatsapp"); sendConsentLink.mutate({ candidateId, candidateEmail: candidate?.email || "", candidateName: candidate?.nombreCompleto || "" } as any); }}
                    disabled={sendConsentLink.isPending}
                  >
                    Enviar por WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setConsentAction("copy"); sendConsentLink.mutate({ candidateId, candidateEmail: candidate?.email || "", candidateName: candidate?.nombreCompleto || "" } as any); }}
                    disabled={sendConsentLink.isPending}
                  >
                    Copiar enlace
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Acceso del cliente — inline flat-card (IMPL-20260312-02) */}
          {candidate?.clienteId && !isClientAuth && (
            <Card>
              <CardHeader>
                <CardTitle>Acceso del cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="emailToAcceso">Correo del cliente</Label>
                  <Input
                    id="emailToAcceso"
                    type="email"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="cliente@empresa.com"
                  />
                </div>
                <Button
                  onClick={() => {
                    const baseUrl = window.location.origin;
                    createClientLink.mutate({
                      clientId: candidate!.clienteId!,
                      candidatoId: candidateId,
                      ttlDays: 14,
                      baseUrl,
                      sendEmailTo: emailTo || undefined,
                      emailContext: { nombreCandidato: candidate?.nombreCompleto },
                    } as any);
                  }}
                  disabled={createClientLink.isPending}
                >
                  {createClientLink.isPending ? "Generando..." : "Generar y enviar enlace"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Token de pre-registro */}
          {selfServiceUrl && (
            <Card>
              <CardHeader>
                <CardTitle>Último enlace de pre-registro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex gap-2 items-center">
                  <Input
                    readOnly
                    value={selfServiceUrl}
                    className="text-xs font-mono"
                    title={selfServiceUrl}
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      try {
                        navigator.clipboard?.writeText(selfServiceUrl);
                        toast.success("Enlace copiado");
                      } catch {
                        toast.error("No se pudo copiar el enlace");
                      }
                    }}
                  >
                    Copiar
                  </Button>
                </div>
                {selfServiceExpiresAt && (
                  <p className="text-[11px] text-muted-foreground">
                    Vigente hasta: {selfServiceExpiresAt.toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Enlaces activos */}
          {candidate?.clienteId && (
            <Card>
              <CardHeader>
                <CardTitle>Enlaces activos</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const tokens = (activeTokens || []).filter((t:any)=> t.candidatoId === candidateId);
                  if (tokens.length === 0) return <p className="text-sm text-muted-foreground">No hay enlaces activos para este candidato</p>;
                  return (
                    <div className="space-y-2">
                      {tokens.map((t:any)=> (
                        <div key={t.token} className="flex items-center justify-between border rounded p-2">
                          <div className="text-sm">
                            <div className="font-mono">{t.token.slice(0,8)}…{t.token.slice(-6)}</div>
                            <div className="text-xs text-muted-foreground">Expira: {new Date(t.expiresAt).toLocaleString()} {t.lastUsedAt && `• Último uso: ${new Date(t.lastUsedAt).toLocaleString()}`}</div>
                          </div>
                          <Button size="sm" variant="destructive" onClick={()=> revokeClientLink.mutate({ token: t.token } as any)}>Revocar</Button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

        </TabsContent>
      </Tabs>

      {/* Review and Complete Dialog - NEW UNIFIED DIALOG */}
      <ReviewAndCompleteDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        workHistoryItem={editingWorkHistory}
        candidatoId={candidateId}
        onSave={async (data) => {
          if (editingWorkHistory?.id) {
            // MODO EDITAR: Formato esperado por el router: { id, data }
            const { id, candidatoId: cId, createdAt, updatedAt, ...restData } = data;
            // Limpiar valores null → undefined para que zod los acepte como opcional
            const cleanedData = Object.fromEntries(
              Object.entries(restData).map(([k, v]) => [k, v === null ? undefined : v])
            );
            // Eliminar causalSalidaRH y causalSalidaJefeInmediato si están vacíos
            if (!cleanedData.causalSalidaRH) delete cleanedData.causalSalidaRH;
            if (!cleanedData.causalSalidaJefeInmediato) delete cleanedData.causalSalidaJefeInmediato;
            // [FIX] Eliminar fechaInicio y fechaFin si están vacíos (regex no acepta "")
            if (!cleanedData.fechaInicio) delete cleanedData.fechaInicio;
            if (!cleanedData.fechaFin) delete cleanedData.fechaFin;
            await updateWorkHistoryMutation.mutateAsync({
              id: editingWorkHistory.id,
              data: cleanedData,
            });
          } else {
            // MODO CREAR: data ya viene con candidatoId del dialog
            await createWorkHistoryMutation.mutateAsync(data);
          }
        }}
        isPending={createWorkHistoryMutation.isPending || updateWorkHistoryMutation.isPending}
      />

      {/* Investigación Laboral Dialog */}
      <Sheet
        open={investigationDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            const key = investigationDraftKeyRef.current;
            if (hasInvestigationDraft(key)) {
              const confirmClose = window.confirm(
                "Tienes cambios sin guardar en la investigación laboral. ¿Deseas cerrar de todos modos?",
              );
              if (!confirmClose) {
                setInvestigationDialogOpen(true);
                return;
              }
            }
            setInvestigationDialogOpen(false);
            setInvestigationTarget(null);
            setInvestigationStep(1);
            setPeriodRowCount(1);
            return;
          }
          setInvestigationDialogOpen(true);
        }}
      >
        <SheetContent
          className="overflow-y-auto sm:max-w-xl md:max-w-3xl"
          aria-describedby="investigacion-desc"
        >
          <SheetHeader className="shrink-0 mb-4">
            <SheetTitle className="pr-6 leading-tight">
              Investigación laboral —{" "}
              {investigationTarget?.empresa || "Empleo"}
            </SheetTitle>
          </SheetHeader>
          <p id="investigacion-desc" className="sr-only">
            Formulario para capturar la evaluación de desempeño de este empleo.
          </p>
          <form
            ref={investigationFormRef}
            onSubmit={handleInvestigationSubmit}
            onInput={handleInvestigationDraftChange}
            onChange={handleInvestigationDraftChange}
            className="space-y-4"
          >
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Elige el bloque que quieras capturar. Puedes ir y venir entre tarjetas; todo se guardará junto al final.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {INVESTIGATION_BLOCKS.map((block) => {
                  const hasData =
                    (block.id === 1 &&
                      (!!investigationTarget?.investigacionDetalle?.empresa ||
                        !!investigationTarget?.investigacionDetalle?.puesto)) ||
                    (block.id === 2 &&
                      (!!investigationTarget?.investigacionDetalle?.periodo ||
                        !!investigationTarget?.investigacionDetalle?.incidencias)) ||
                    (block.id === 3 &&
                      (!!investigationTarget?.investigacionDetalle?.desempeno ||
                        !!investigationTarget?.investigacionDetalle?.conclusion));

                  const isActive = investigationStep === block.id;

                  return (
                    <button
                      key={block.id}
                      type="button"
                      onClick={() => setInvestigationStep(block.id)}
                      className={`flex flex-col items-start gap-1 text-left border rounded-md px-3 py-2 text-xs transition-colors ${
                        isActive
                          ? "border-primary bg-primary/5"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{block.title}</span>
                        {hasData && (
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {block.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={investigationStep === 1 ? "space-y-4" : "hidden"}>
            {/* Datos de la empresa */}
            <div className="border rounded-md p-3 space-y-3">
              <div className="text-sm font-semibold">Datos de la empresa</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="empresaGiro">Giro</Label>
                  <Input
                    id="empresaGiro"
                    name="empresaGiro"
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.empresa?.giro || ""
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="empresaTelefono">Teléfono</Label>
                  <Input
                    id="empresaTelefono"
                    name="empresaTelefono"
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.empresa?.telefono || ""
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="empresaDireccion">Dirección</Label>
                  <Input
                    id="empresaDireccion"
                    name="empresaDireccion"
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.empresa?.direccion || ""
                    }
                  />
                </div>
              </div>
            </div>

            {/* Perfil del puesto */}
            <div className="border rounded-md p-3 space-y-3">
              <div className="text-sm font-semibold">Perfil del puesto</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="puestoInicial">Puesto inicial</Label>
                  <Input
                    id="puestoInicial"
                    name="puestoInicial"
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.puesto?.puestoInicial ||
                      ""
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="puestoFinal">Puesto final</Label>
                  <Input
                    id="puestoFinal"
                    name="puestoFinal"
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.puesto?.puestoFinal ||
                      ""
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="principalesActividades">Principales actividades</Label>
                  <Textarea
                    id="principalesActividades"
                    name="principalesActividades"
                    rows={3}
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.puesto
                        ?.principalesActividades || ""
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="jefeInmediato">Jefe inmediato</Label>
                  <Input
                    id="jefeInmediato"
                    name="jefeInmediato"
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.puesto?.jefeInmediato ||
                      ""
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="recursosAsignados">Vehículo que manejaba</Label>
                  <Textarea
                    id="recursosAsignados"
                    name="recursosAsignados"
                    rows={1} className="min-h-[40px] resize-none text-xs border-slate-200 shadow-sm"
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.puesto
                        ?.recursosAsignados || ""
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="horarioTrabajo">Horario de trabajo</Label>
                  <Input
                    id="horarioTrabajo"
                    name="horarioTrabajo"
                    placeholder="Ej. L-V 9:00 a 18:00"
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.puesto?.horarioTrabajo ||
                      ""
                    }
                  />
                </div>
              </div>
            </div>
            </div>

            <div className={investigationStep === 2 ? "space-y-4" : "hidden"}>
            {/* Periodo y sueldos */}
            <div className="border rounded-md p-3 space-y-3">
              <div className="text-sm font-semibold">Periodos laborados y sueldos</div>
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Puedes capturar tantos periodos como necesites. Usa texto libre, por ejemplo:
                  &nbsp;<span className="italic">"De 01/2020 a 06/2022 — 2 años 5 meses"</span>.
                </p>
                {(() => {
                  const existingPeriodos =
                    investigationTarget?.investigacionDetalle?.periodo?.periodos || [];
                  const totalRows = Math.max(
                    periodRowCount,
                    existingPeriodos.length > 0 ? existingPeriodos.length : 1,
                  );
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        {Array.from({ length: totalRows }).map((_, index) => {
                          const periodo = existingPeriodos[index] || {};
                          return (
                            <div
                              key={index}
                              className="col-span-2 grid grid-cols-2 gap-4 border rounded-md p-2 bg-slate-50/60"
                            >
                              <div>
                                <Label htmlFor={`periodoCandidato_${index}`}>
                                  Periodo laborado (candidato) {index + 1}
                                </Label>
                                <Input
                                  id={`periodoCandidato_${index}`}
                                  name={`periodoCandidato_${index}`}
                                  defaultValue={periodo.periodoCandidato || ""}
                                />
                              </div>
                              <div>
                                <Label htmlFor={`periodoEmpresa_${index}`}>
                                  Periodo laborado (empresa) {index + 1}
                                </Label>
                                <Input
                                  id={`periodoEmpresa_${index}`}
                                  name={`periodoEmpresa_${index}`}
                                  defaultValue={periodo.periodoEmpresa || ""}
                                />
                              </div>
                              <div className="">
                                <Label htmlFor={`puesto_${index}`}>
                                  Puesto en el periodo {index + 1}
                                </Label>
                                <Input
                                  id={`puesto_${index}`}
                                  name={`puesto_${index}`}
                                  defaultValue={periodo.puesto || ""}
                                  placeholder="Ej. Cajero (si fue reingreso en otro puesto)"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPeriodRowCount((rows) => rows + 1)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Agregar periodo
                        </Button>
                      </div>
                    </>
                  );
                })()}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sueldoInicial">Sueldo inicial</Label>
                <Input
                  id="sueldoInicial"
                    name="sueldoInicial"
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.periodo?.sueldoInicial ||
                      ""
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="sueldoFinal">Sueldo final</Label>
                  <Input
                    id="sueldoFinal"
                    name="sueldoFinal"
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.periodo?.sueldoFinal ||
                      ""
                    }
                  />
                </div>
              </div>
            </div>

            </div>
            {/* Semanas cotizadas */}
            <div className="border rounded-md p-3 space-y-3">
              <div className="text-sm font-semibold">Semanas cotizadas</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="">
                  <Label htmlFor="disposicionSemanasCotizadas">
                    Disposición de semanas cotizadas
                  </Label>
                  <Input
                    id="disposicionSemanasCotizadas"
                    name="disposicionSemanasCotizadas"
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.periodo
                        ?.disposicionSemanasCotizadas ||
                      ""
                    }
                  />
                </div>
                <div className="">
                  <Label htmlFor="motivoDisposicion">Motivo de disposición</Label>
                  <Textarea
                    id="motivoDisposicion"
                    name="motivoDisposicion"
                    rows={1} className="min-h-[40px] resize-none text-xs border-slate-200 shadow-sm"
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.periodo?.motivoDisposicion ||
                      ""
                    }
                  />
                </div>
              </div>
            </div>

            {/* Incidencias */}
            <div className="border rounded-md p-3 space-y-3">
              <div className="text-sm font-semibold">Separación e incidencias</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="">
                  <Label htmlFor="motivoSeparacionCandidato">
                    Motivo de separación (candidato)
                  </Label>
                  <Textarea
                    id="motivoSeparacionCandidato"
                    name="motivoSeparacionCandidato"
                    rows={1} className="min-h-[40px] resize-none text-xs border-slate-200 shadow-sm"
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.incidencias
                        ?.motivoSeparacionCandidato || ""
                    }
                  />
                </div>
                <div className="">
                  <Label htmlFor="motivoSeparacionEmpresa">
                    Motivo de separación (empresa)
                  </Label>
                  <Textarea
                    id="motivoSeparacionEmpresa"
                    name="motivoSeparacionEmpresa"
                    rows={1} className="min-h-[40px] resize-none text-xs border-slate-200 shadow-sm"
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.incidencias
                        ?.motivoSeparacionEmpresa || ""
                    }
                  />
                </div>
                <div className="">
                  <Label htmlFor="incapacidadesCandidato">
                    Incapacidades reportadas por el candidato (cantidad y causa)
                  </Label>
                  <Textarea
                    id="incapacidadesCandidato"
                    name="incapacidadesCandidato"
                    rows={1} className="min-h-[40px] resize-none text-xs border-slate-200 shadow-sm"
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.incidencias
                        ?.incapacidadesCandidato || ""
                    }
                  />
                </div>
                <div className="">
                  <Label htmlFor="incapacidadesEmpresa">
                    Incapacidades reportadas por la empresa (cantidad y causa)
                  </Label>
                  <Textarea
                    id="incapacidadesEmpresa"
                    name="incapacidadesEmpresa"
                    rows={1} className="min-h-[40px] resize-none text-xs border-slate-200 shadow-sm"
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.incidencias
                        ?.incapacidadesEmpresa ||
                      investigationTarget?.investigacionDetalle?.incidencias
                        ?.incapacidadesJefe ||
                      ""
                    }
                  />
                </div>
                <div className="">
                  <Label htmlFor="inasistenciasCandidato">
                    Inasistencias/Faltas (candidato)
                  </Label>
                  <Textarea
                    id="inasistenciasCandidato"
                    name="inasistenciasCandidato"
                    rows={1} className="min-h-[40px] resize-none text-xs border-slate-200 shadow-sm"
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.incidencias
                        ?.inasistenciasCandidato ||
                      investigationTarget?.investigacionDetalle?.incidencias
                        ?.inasistencias ||
                      ""
                    }
                  />
                </div>
                <div className="">
                  <Label htmlFor="inasistenciasEmpresa">
                    Inasistencias/Faltas (empresa)
                  </Label>
                  <Textarea
                    id="inasistenciasEmpresa"
                    name="inasistenciasEmpresa"
                    rows={1} className="min-h-[40px] resize-none text-xs border-slate-200 shadow-sm"
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.incidencias
                        ?.inasistenciasEmpresa ||
                      ""
                    }
                  />
                </div>
                <div className="">
                  <Label htmlFor="antecedentesLegalesCandidato">
                    Antecedentes legales (demandas, conflictos) — candidato
                  </Label>
                  <Textarea
                    id="antecedentesLegalesCandidato"
                    name="antecedentesLegalesCandidato"
                    rows={1} className="min-h-[40px] resize-none text-xs border-slate-200 shadow-sm"
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.incidencias
                        ?.antecedentesLegalesCandidato ||
                      investigationTarget?.investigacionDetalle?.incidencias
                        ?.antecedentesLegales ||
                      ""
                    }
                  />
                </div>
                <div className="">
                  <Label htmlFor="antecedentesLegalesEmpresa">
                    Antecedentes legales (demandas, conflictos) — empresa
                  </Label>
                  <Textarea
                    id="antecedentesLegalesEmpresa"
                    name="antecedentesLegalesEmpresa"
                    rows={1} className="min-h-[40px] resize-none text-xs border-slate-200 shadow-sm"
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.incidencias
                        ?.antecedentesLegalesEmpresa ||
                      ""
                    }
                  />
                </div>
              </div>
            </div>
            </div>

            <div className={investigationStep === 3 ? "space-y-4" : "hidden"}>
            {/* Matriz de desempeño */}
            <div className="border rounded-md p-3 space-y-3">
              <div className="text-sm font-semibold">Matriz de desempeño</div>
              <div className="grid grid-cols-3 gap-4">
                <div className="">
                <Label htmlFor="evaluacionGeneral">Evaluación general</Label>
                <select
                  id="evaluacionGeneral"
                  name="evaluacionGeneral"
                  className="mt-1 block w-full border rounded-md h-8 px-2 text-xs bg-slate-50/50"
                  defaultValue={
                    investigationTarget?.investigacionDetalle?.desempeno
                      ?.evaluacionGeneral || ""
                  }
                >
                  <option value="">Sin especificar</option>
                  <option value="EXCELENTE">Excelente</option>
                  <option value="BUENO">Bueno</option>
                  <option value="REGULAR">Regular</option>
                  <option value="MALO">Malo</option>
                </select>
              </div>
              <div>
                <Label htmlFor="puntualidad">Puntualidad</Label>
                <select
                  id="puntualidad"
                  name="puntualidad"
                  className="mt-1 block w-full border rounded-md h-8 px-2 text-xs bg-slate-50/50"
                  defaultValue={
                    investigationTarget?.investigacionDetalle?.desempeno
                      ?.puntualidad || ""
                  }
                >
                  <option value="">Sin especificar</option>
                  <option value="EXCELENTE">Excelente</option>
                  <option value="BUENO">Bueno</option>
                  <option value="REGULAR">Regular</option>
                  <option value="MALO">Malo</option>
                </select>
              </div>
              <div>
                <Label htmlFor="colaboracion">Colaboración</Label>
                <select
                  id="colaboracion"
                  name="colaboracion"
                  className="mt-1 block w-full border rounded-md h-8 px-2 text-xs bg-slate-50/50"
                  defaultValue={
                    investigationTarget?.investigacionDetalle?.desempeno
                      ?.colaboracion || ""
                  }
                >
                  <option value="">Sin especificar</option>
                  <option value="EXCELENTE">Excelente</option>
                  <option value="BUENO">Bueno</option>
                  <option value="REGULAR">Regular</option>
                  <option value="MALO">Malo</option>
                </select>
              </div>
              <div>
                <Label htmlFor="responsabilidad">Responsabilidad</Label>
                <select
                  id="responsabilidad"
                  name="responsabilidad"
                  className="mt-1 block w-full border rounded-md h-8 px-2 text-xs bg-slate-50/50"
                  defaultValue={
                    investigationTarget?.investigacionDetalle?.desempeno
                      ?.responsabilidad || ""
                  }
                >
                  <option value="">Sin especificar</option>
                  <option value="EXCELENTE">Excelente</option>
                  <option value="BUENO">Bueno</option>
                  <option value="REGULAR">Regular</option>
                  <option value="MALO">Malo</option>
                </select>
              </div>
              <div>
                <Label htmlFor="actitudAutoridad">Actitud ante la autoridad</Label>
                <select
                  id="actitudAutoridad"
                  name="actitudAutoridad"
                  className="mt-1 block w-full border rounded-md h-8 px-2 text-xs bg-slate-50/50"
                  defaultValue={
                    investigationTarget?.investigacionDetalle?.desempeno
                      ?.actitudAutoridad || ""
                  }
                >
                  <option value="">Sin especificar</option>
                  <option value="EXCELENTE">Excelente</option>
                  <option value="BUENO">Bueno</option>
                  <option value="REGULAR">Regular</option>
                  <option value="MALO">Malo</option>
                </select>
              </div>
              <div>
                <Label htmlFor="actitudSubordinados">Actitud ante subordinados</Label>
                <select
                  id="actitudSubordinados"
                  name="actitudSubordinados"
                  className="mt-1 block w-full border rounded-md h-8 px-2 text-xs bg-slate-50/50"
                  defaultValue={
                    investigationTarget?.investigacionDetalle?.desempeno
                      ?.actitudSubordinados || ""
                  }
                >
                  <option value="">Sin especificar</option>
                  <option value="EXCELENTE">Excelente</option>
                  <option value="BUENO">Bueno</option>
                  <option value="REGULAR">Regular</option>
                  <option value="MALO">Malo</option>
                </select>
              </div>
              <div>
                <Label htmlFor="honradezIntegridad">Honradez e integridad</Label>
                <select
                  id="honradezIntegridad"
                  name="honradezIntegridad"
                  className="mt-1 block w-full border rounded-md h-8 px-2 text-xs bg-slate-50/50"
                  defaultValue={
                    investigationTarget?.investigacionDetalle?.desempeno
                      ?.honradezIntegridad || ""
                  }
                >
                  <option value="">Sin especificar</option>
                  <option value="EXCELENTE">Excelente</option>
                  <option value="BUENO">Bueno</option>
                  <option value="REGULAR">Regular</option>
                  <option value="MALO">Malo</option>
                </select>
              </div>
              <div>
                <Label htmlFor="calidadTrabajo">Calidad de trabajo</Label>
                <select
                  id="calidadTrabajo"
                  name="calidadTrabajo"
                  className="mt-1 block w-full border rounded-md h-8 px-2 text-xs bg-slate-50/50"
                  defaultValue={
                    investigationTarget?.investigacionDetalle?.desempeno
                      ?.calidadTrabajo || ""
                  }
                >
                  <option value="">Sin especificar</option>
                  <option value="EXCELENTE">Excelente</option>
                  <option value="BUENO">Bueno</option>
                  <option value="REGULAR">Regular</option>
                  <option value="MALO">Malo</option>
                </select>
              </div>
              <div>
                <Label htmlFor="liderazgo">Liderazgo</Label>
                <select
                  id="liderazgo"
                  name="liderazgo"
                  className="mt-1 block w-full border rounded-md h-8 px-2 text-xs bg-slate-50/50"
                  defaultValue={
                    investigationTarget?.investigacionDetalle?.desempeno
                      ?.liderazgo || ""
                  }
                  >
                  <option value="">Sin especificar</option>
                  <option value="EXCELENTE">Excelente</option>
                  <option value="BUENO">Bueno</option>
                  <option value="REGULAR">Regular</option>
                  <option value="MALO">Malo</option>
                </select>
              </div>
              <div>
                <Label htmlFor="conflictividad">Conflictividad</Label>
                <select
                  id="conflictividad"
                  name="conflictividad"
                  className="mt-1 block w-full border rounded-md h-8 px-2 text-xs bg-slate-50/50"
                  defaultValue={
                    investigationTarget?.investigacionDetalle?.desempeno
                      ?.conflictividad || ""
                  }
                >
                  <option value="">Sin especificar</option>
                  <option value="SI">Conflictivo</option>
                  <option value="NO">No conflictivo</option>
                </select>
              </div>
              <div className="">
                <Label htmlFor="conflictividadComentario">
                  Comentario sobre conflictividad (si aplica)
                </Label>
                <Textarea
                  id="conflictividadComentario"
                  name="conflictividadComentario"
                  defaultValue={
                    investigationTarget?.investigacionDetalle?.desempeno
                      ?.conflictividadComentario || ""
                  }
                  rows={3}
                />
              </div>
              </div>
            </div>

            {/* Conclusión */}
            <div className="border rounded-md p-3 space-y-3">
              <div className="text-sm font-semibold">Conclusión</div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="esRecomendable">¿Es recomendable?</Label>
                  <select
                    id="esRecomendable"
                    name="esRecomendable"
                    className="mt-1 block w-full border rounded-md h-8 px-2 text-xs bg-slate-50/50"
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.conclusion?.esRecomendable ||
                      ""
                    }
                  >
                    <option value="">Sin especificar</option>
                    <option value="SI">Sí</option>
                    <option value="NO">No</option>
                    <option value="CONDICIONADO">Condicionado</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="loRecontrataria">¿Lo recontrataría?</Label>
                  <select
                    id="loRecontrataria"
                    name="loRecontrataria"
                    className="mt-1 block w-full border rounded-md h-8 px-2 text-xs bg-slate-50/50"
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.conclusion
                        ?.loRecontrataria || ""
                    }
                  >
                    <option value="">Sin especificar</option>
                    <option value="SI">Sí</option>
                    <option value="NO">No</option>
                  </select>
                </div>
                <div className="">
                  <Label htmlFor="razonRecontratacion">
                    Razón de la recomendación/recontratación
                  </Label>
                  <Textarea
                    id="razonRecontratacion"
                    name="razonRecontratacion"
                    rows={1} className="min-h-[40px] resize-none text-xs border-slate-200 shadow-sm"
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.conclusion
                        ?.razonRecontratacion || ""
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="informanteNombre">Nombre del informante</Label>
                  <Input
                    id="informanteNombre"
                    name="informanteNombre"
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.conclusion
                        ?.informanteNombre || ""
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="informanteCargo">Cargo del informante</Label>
                  <Input
                    id="informanteCargo"
                    name="informanteCargo"
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.conclusion
                        ?.informanteCargo || ""
                    }
                  />
                </div>
                <div className="">
                  <Label htmlFor="informanteTelefono">Teléfono/Contacto</Label>
                  <Input
                    id="informanteTelefono"
                    name="informanteTelefono"
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.conclusion
                        ?.informanteTelefono || ""
                    }
                  />
                </div>
                <div className="">
                  <Label htmlFor="informanteEmail">Correo electrónico del informante</Label>
                  <Input
                    id="informanteEmail"
                    name="informanteEmail"
                    type="email"
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.conclusion
                        ?.informanteEmail || ""
                    }
                  />
                </div>
                <div className="">
                  <Label htmlFor="comentariosAdicionales">Comentarios adicionales</Label>
                  <Textarea
                    id="comentariosAdicionales"
                    name="comentariosAdicionales"
                    rows={1} className="min-h-[40px] resize-none text-xs border-slate-200 shadow-sm"
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.conclusion
                        ?.comentariosAdicionales || ""
                    }
                  />
                </div>
              </div>
            </div>
            </div>

            <div className="flex justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setInvestigationDialogOpen(false);
                  setInvestigationTarget(null);
                  setInvestigationStep(1);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saveInvestigationMutation.isPending}
              >
                Guardar investigación
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}



