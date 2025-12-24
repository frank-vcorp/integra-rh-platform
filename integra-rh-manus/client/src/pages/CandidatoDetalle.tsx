import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Plus, Pencil, Trash2, Briefcase, MessageSquare, Paperclip, ExternalLink, File as FileIcon, FileText, FileSpreadsheet, FileImage, FileArchive, FileCode, RefreshCcw, FolderOpen, ShieldCheck, CheckCircle2, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "wouter";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export default function CandidatoDetalle() {
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
  
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [consentAction, setConsentAction] = useState<'email' | 'whatsapp' | 'copy' | null>(null);
  const [selfServiceUrl, setSelfServiceUrl] = useState<string>("");
  const [selfServiceExpiresAt, setSelfServiceExpiresAt] = useState<Date | null>(null);

  const { data: candidate, isLoading } = trpc.candidates.getById.useQuery({ id: candidateId });
  const { data: workHistory = [] } = trpc.workHistory.getByCandidate.useQuery({ candidatoId: candidateId });
  const { data: comments = [] } = trpc.candidateComments.getByCandidate.useQuery({ candidatoId: candidateId });
  const { data: documents = [] } = trpc.documents.getByCandidate.useQuery({ candidatoId: candidateId });
  const { data: procesos = [] } = trpc.processes.getByCandidate.useQuery({ candidatoId: candidateId });
  const { data: consent, refetch: refetchConsent } = trpc.candidateConsent.getConsentByCandidateId.useQuery({ candidateId: candidateId });
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
  const [createProcessOpen, setCreateProcessOpen] = useState(false);
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

  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");

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
    const periodos: { periodoEmpresa?: string; periodoCandidato?: string }[] = [];
    for (let idx = 0; idx < periodRowCount; idx++) {
      const periodoEmpresa = getString(`periodoEmpresa_${idx}`);
      const periodoCandidato = getString(`periodoCandidato_${idx}`);
      if (periodoEmpresa || periodoCandidato) {
        periodos.push({ periodoEmpresa, periodoCandidato });
      }
    }
    const periodo = {
      // antiguedadTexto se mantiene por compatibilidad aunque ya no se captura
      antiguedadTexto: getString("antiguedadTexto"),
      sueldoInicial: getString("sueldoInicial"),
      sueldoFinal: getString("sueldoFinal"),
      periodos: periodos.length > 0 ? periodos : undefined,
    };
    const incidencias = {
      motivoSeparacionCandidato: getString("motivoSeparacionCandidato"),
      motivoSeparacionEmpresa: getString("motivoSeparacionEmpresa"),
      incapacidadesCandidato: getString("incapacidadesCandidato"),
      incapacidadesJefe: getString("incapacidadesJefe"),
      inasistencias: getString("inasistencias"),
      antecedentesLegales: getString("antecedentesLegales"),
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
    perfil.financieroAntecedentes?.buroCreditoDeclarado,
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
    hasValue(perfil.financieroAntecedentes?.buroCreditoDeclarado) ||
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

      {/* Candidate Info */}
      <Card>
        <CardHeader>
          <CardTitle>Información General</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
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
          </div>
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
          <div className="flex items-center gap-3">
            <Progress value={perfilPct} />
            <span className="text-xs text-muted-foreground tabular-nums w-14 text-right">
              {perfilPct}%
            </span>
          </div>

          {perfilFilledCount > 0 && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {hasIdentificacion && (
                <div className="space-y-1">
                  <p className="font-semibold text-slate-700">Identificación</p>
                  {hasValue(generales.puestoSolicitado) && (
                    <p>
                      <span className="text-muted-foreground">Puesto solicitado: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {generales.puestoSolicitado}
                      </span>
                    </p>
                  )}
                  {hasValue(generales.plaza) && (
                    <p>
                      <span className="text-muted-foreground">Plaza / CEDI: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {generales.plaza}
                      </span>
                    </p>
                  )}
                  {hasValue(generales.ciudadResidencia) && (
                    <p>
                      <span className="text-muted-foreground">Ciudad de residencia: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {generales.ciudadResidencia}
                      </span>
                    </p>
                  )}
                  {hasValue(generales.rfc) && (
                    <p>
                      <span className="text-muted-foreground">RFC: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {generales.rfc}
                      </span>
                    </p>
                  )}
                  {(hasValue(generales.telefonoCasa) || hasValue(generales.telefonoRecados)) && (
                    <p>
                      <span className="text-muted-foreground">Tel. casa / recados: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {[generales.telefonoCasa, generales.telefonoRecados]
                          .filter(Boolean)
                          .join(" / ")}
                      </span>
                    </p>
                  )}
                  {hasValue(generales.fechaNacimiento) && (
                    <p>
                      <span className="text-muted-foreground">Fecha de nacimiento: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {generales.fechaNacimiento}
                      </span>
                    </p>
                  )}
                  {hasValue(generales.lugarNacimiento) && (
                    <p>
                      <span className="text-muted-foreground">Lugar de nacimiento: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {generales.lugarNacimiento}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {hasDomicilio && (
                <div className="space-y-1">
                  <p className="font-semibold text-slate-700">Domicilio</p>
                  {(hasValue(domicilio.calle) ||
                    hasValue(domicilio.numero) ||
                    hasValue(domicilio.interior) ||
                    hasValue(domicilio.colonia) ||
                    hasValue(domicilio.municipio) ||
                    hasValue(domicilio.estado) ||
                    hasValue(domicilio.cp)) && (
                    <p>
                      <span className="text-muted-foreground">Dirección: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {[domicilio.calle, domicilio.numero, domicilio.interior, domicilio.colonia, domicilio.municipio, domicilio.estado, domicilio.cp]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </p>
                  )}
                  {hasValue(domicilio.mapLink) && (
                    <p>
                      <a
                        href={domicilio.mapLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 underline"
                      >
                        Ver ubicación en mapa
                      </a>
                    </p>
                  )}
                </div>
              )}

              {hasContactoEmergencia && (
                <div className="space-y-1">
                  <p className="font-semibold text-slate-700">Contacto de emergencia</p>
                  {hasValue(contactoEmergencia.nombre) && (
                    <p>
                      <span className="text-muted-foreground">Nombre: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {contactoEmergencia.nombre}
                      </span>
                    </p>
                  )}
                  {hasValue(contactoEmergencia.parentesco) && (
                    <p>
                      <span className="text-muted-foreground">Parentesco: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {contactoEmergencia.parentesco}
                      </span>
                    </p>
                  )}
                  {hasValue(contactoEmergencia.telefono) && (
                    <p>
                      <span className="text-muted-foreground">Teléfono: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {contactoEmergencia.telefono}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {hasEntornoFamiliar && (
                <div className="space-y-1">
                  <p className="font-semibold text-slate-700">Entorno familiar</p>
                  {hasValue(perfil.situacionFamiliar?.estadoCivil) && (
                    <p>
                      <span className="text-muted-foreground">Estado civil: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {perfil.situacionFamiliar?.estadoCivil}
                      </span>
                    </p>
                  )}
                  {hasValue(perfil.situacionFamiliar?.hijosDescripcion) && (
                    <p>
                      <span className="text-muted-foreground">Hijos / comentarios: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {perfil.situacionFamiliar?.hijosDescripcion}
                      </span>
                    </p>
                  )}
                  {hasValue(perfil.situacionFamiliar?.vivienda) && (
                    <p>
                      <span className="text-muted-foreground">Vivienda: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {perfil.situacionFamiliar?.vivienda}
                      </span>
                    </p>
                  )}
                  {hasValue(perfil.situacionFamiliar?.fechaMatrimonioUnion) && (
                    <p>
                      <span className="text-muted-foreground">Fecha matrimonio/unión: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {perfil.situacionFamiliar?.fechaMatrimonioUnion}
                      </span>
                    </p>
                  )}
                  {hasValue(perfil.situacionFamiliar?.parejaDeAcuerdoConTrabajo) && (
                    <p>
                      <span className="text-muted-foreground">Pareja de acuerdo con trabajo: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {perfil.situacionFamiliar?.parejaDeAcuerdoConTrabajo}
                      </span>
                    </p>
                  )}
                  {hasValue(perfil.situacionFamiliar?.esposaEmbarazada) && (
                    <p>
                      <span className="text-muted-foreground">Esposa embarazada: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {perfil.situacionFamiliar?.esposaEmbarazada}
                      </span>
                    </p>
                  )}
                  {hasValue(perfil.situacionFamiliar?.quienCuidaHijos) && (
                    <p>
                      <span className="text-muted-foreground">Quién cuida a los hijos: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {perfil.situacionFamiliar?.quienCuidaHijos}
                      </span>
                    </p>
                  )}
                  {hasValue(perfil.situacionFamiliar?.dondeVivenCuidadores) && (
                    <p>
                      <span className="text-muted-foreground">Dónde viven los cuidadores: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {perfil.situacionFamiliar?.dondeVivenCuidadores}
                      </span>
                    </p>
                  )}
                  {hasValue(perfil.situacionFamiliar?.pensionAlimenticia) && (
                    <p>
                      <span className="text-muted-foreground">Pensión alimenticia: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {perfil.situacionFamiliar?.pensionAlimenticia}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {hasRedes && (
                <div className="space-y-1">
                  <p className="font-semibold text-slate-700">Redes sociales</p>
                  {hasValue(perfil.redesSociales?.facebook) && (
                    <p>
                      <span className="text-muted-foreground">Facebook: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {perfil.redesSociales?.facebook}
                      </span>
                    </p>
                  )}
                  {hasValue(perfil.redesSociales?.instagram) && (
                    <p>
                      <span className="text-muted-foreground">Instagram: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {perfil.redesSociales?.instagram}
                      </span>
                    </p>
                  )}
                  {hasValue(perfil.redesSociales?.twitterX) && (
                    <p>
                      <span className="text-muted-foreground">Twitter / X: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {perfil.redesSociales?.twitterX}
                      </span>
                    </p>
                  )}
                  {hasValue(perfil.redesSociales?.tiktok) && (
                    <p>
                      <span className="text-muted-foreground">TikTok: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {perfil.redesSociales?.tiktok}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {hasParejaNoviazgo && (
                <div className="space-y-1">
                  <p className="font-semibold text-slate-700">Pareja / Noviazgo</p>
                  {hasValue(perfil.parejaNoviazgo?.tieneNovio) && (
                    <p>
                      <span className="text-muted-foreground">¿Tiene novio/a?: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {perfil.parejaNoviazgo?.tieneNovio}
                      </span>
                    </p>
                  )}
                  {hasValue(perfil.parejaNoviazgo?.nombreNovio) && (
                    <p>
                      <span className="text-muted-foreground">Nombre: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {perfil.parejaNoviazgo?.nombreNovio}
                      </span>
                    </p>
                  )}
                  {hasValue(perfil.parejaNoviazgo?.ocupacionNovio) && (
                    <p>
                      <span className="text-muted-foreground">Ocupación: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {perfil.parejaNoviazgo?.ocupacionNovio}
                      </span>
                    </p>
                  )}
                  {hasValue(perfil.parejaNoviazgo?.domicilioNovio) && (
                    <p>
                      <span className="text-muted-foreground">Domicilio: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {perfil.parejaNoviazgo?.domicilioNovio}
                      </span>
                    </p>
                  )}
                  {hasValue(perfil.parejaNoviazgo?.apoyoEconomicoMutuo) && (
                    <p>
                      <span className="text-muted-foreground">Apoyo económico mutuo: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {perfil.parejaNoviazgo?.apoyoEconomicoMutuo}
                      </span>
                    </p>
                  )}
                  {hasValue(perfil.parejaNoviazgo?.negocioEnConjunto) && (
                    <p>
                      <span className="text-muted-foreground">Negocio en conjunto: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {perfil.parejaNoviazgo?.negocioEnConjunto}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {hasEstudios && (
                <div className="space-y-1">
                  <p className="font-semibold text-slate-700">Estudios</p>
                  {hasValue(perfil.estudios?.nivelEstudios) && (
                    <p>
                      <span className="text-muted-foreground">Nivel de estudios: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {perfil.estudios?.nivelEstudios}
                      </span>
                    </p>
                  )}
                  {hasValue(perfil.estudios?.carrera) && (
                    <p>
                      <span className="text-muted-foreground">Carrera: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {perfil.estudios?.carrera}
                      </span>
                    </p>
                  )}
                  {hasValue(perfil.estudios?.estadoCarrera) && (
                    <p>
                      <span className="text-muted-foreground">Estado de carrera: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {perfil.estudios?.estadoCarrera}
                      </span>
                    </p>
                  )}
                  {hasValue(perfil.estudios?.esEstudiante) && (
                    <p>
                      <span className="text-muted-foreground">¿Es estudiante?: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {perfil.estudios?.esEstudiante}
                      </span>
                    </p>
                  )}
                  {hasValue(perfil.estudios?.modalidadEstudios) && (
                    <p>
                      <span className="text-muted-foreground">Modalidad: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {perfil.estudios?.modalidadEstudios}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {hasVehiculo && (
                <div className="space-y-1">
                  <p className="font-semibold text-slate-700">Vehículo / Licencia</p>
                  {hasValue(perfil.vehiculo?.licenciaConducir) && (
                    <p>
                      <span className="text-muted-foreground">Licencia de conducir: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {perfil.vehiculo?.licenciaConducir}
                      </span>
                    </p>
                  )}
                  {hasValue(perfil.vehiculo?.claseLicencia) && (
                    <p>
                      <span className="text-muted-foreground">Clase de licencia: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {perfil.vehiculo?.claseLicencia}
                      </span>
                    </p>
                  )}
                  {hasValue(perfil.vehiculo?.tieneVehiculo) && (
                    <p>
                      <span className="text-muted-foreground">¿Tiene vehículo?: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {perfil.vehiculo?.tieneVehiculo}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {hasEconomia && (
                <div className="space-y-1">
                  <p className="font-semibold text-slate-700">Situación económica</p>
                  {hasValue(perfil.financieroAntecedentes?.tieneDeudas) && (
                    <p>
                      <span className="text-muted-foreground">¿Tiene deudas?: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {perfil.financieroAntecedentes?.tieneDeudas}
                      </span>
                    </p>
                  )}
                  {hasValue(perfil.financieroAntecedentes?.institucionDeuda) && (
                    <p>
                      <span className="text-muted-foreground">Institución de deuda: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {perfil.financieroAntecedentes?.institucionDeuda}
                      </span>
                    </p>
                  )}
                  {hasValue(perfil.financieroAntecedentes?.buroCreditoDeclarado) && (
                    <p>
                      <span className="text-muted-foreground">Buró de crédito (declarado): </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {perfil.financieroAntecedentes?.buroCreditoDeclarado}
                      </span>
                    </p>
                  )}
                  {(hasValue(perfil.financieroAntecedentes?.haSidoSindicalizado) ||
                    hasValue(perfil.financieroAntecedentes?.haEstadoAfianzado)) && (
                    <p>
                      <span className="text-muted-foreground">Sindicalizado / Afianzado: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {[
                          perfil.financieroAntecedentes?.haSidoSindicalizado,
                          perfil.financieroAntecedentes?.haEstadoAfianzado,
                        ]
                          .filter(Boolean)
                          .join(" / ")}
                      </span>
                    </p>
                  )}
                  {hasValue(perfil.financieroAntecedentes?.accidentesVialesPrevios) && (
                    <p>
                      <span className="text-muted-foreground">Accidentes viales previos: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {perfil.financieroAntecedentes?.accidentesVialesPrevios}
                      </span>
                    </p>
                  )}
                  {hasValue(perfil.financieroAntecedentes?.accidentesTrabajoPrevios) && (
                    <p>
                      <span className="text-muted-foreground">Accidentes de trabajo previos: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {perfil.financieroAntecedentes?.accidentesTrabajoPrevios}
                      </span>
                    </p>
                  )}
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
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className={`text-xs font-semibold px-2 py-1 rounded ${getInvestigacionClass(item.estatusInvestigacion as string)}`}
                            >
                              {getInvestigacionLabel(item.estatusInvestigacion as string)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            Estatus de la verificación laboral de este empleo.
                          </TooltipContent>
                        </Tooltip>
                        {item.resultadoVerificacion && (
                          <span className="text-xs text-muted-foreground">
                            Dictamen: {item.resultadoVerificacion.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
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
                            const validadoFechas =
                              (periodo.fechaIngreso || "-") +
                              " - " +
                              (periodo.fechaSalida || "Actual");
                            return (
                              <>
                                <p className="font-semibold text-slate-700 flex items-center gap-1">
                                  Declarado vs validado
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border text-[9px] cursor-help">
                                        ?
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs text-xs">
                                      Comparación entre lo que el candidato declaró
                                      (fechas, puesto y motivo de salida) y lo que
                                      confirmó la empresa durante la llamada de
                                      referencia.
                                    </TooltipContent>
                                  </Tooltip>
                                </p>
                                <p>
                                  <span className="text-muted-foreground">
                                    Fechas:
                                  </span>{" "}
                                  {declaradoFechas}{" "}
                                  <span className="text-muted-foreground">
                                    ⇒
                                  </span>{" "}
                                  {validadoFechas}
                                </p>
                                <p>
                                  <span className="text-muted-foreground">
                                    Puesto:
                                  </span>{" "}
                                  {item.puesto || "-"}{" "}
                                  <span className="text-muted-foreground">
                                    ⇒
                                  </span>{" "}
                                  {puestoInv.puestoFinal ||
                                    puestoInv.puestoInicial ||
                                    "-"}
                                </p>
                                {incidencias.motivoSeparacionCandidato ||
                                  incidencias.motivoSeparacionEmpresa ? (
                                  <p>
                                    <span className="text-muted-foreground">
                                      Motivo de salida:
                                    </span>{" "}
                                    {incidencias.motivoSeparacionCandidato ||
                                      "-"}{" "}
                                    <span className="text-muted-foreground">
                                      ⇒
                                    </span>{" "}
                                      {incidencias.motivoSeparacionEmpresa ||
                                      "-"}
                                  </p>
                                ) : null}
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
                                      <div className="mt-3 border-t pt-2 space-y-1">
                                        <p className="font-semibold text-slate-700 flex items-center gap-1">
                                          Historial de cambios
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border text-[9px] cursor-help">
                                                ?
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs text-xs">
                                              Registro de quién hizo qué cambios y cuándo en esta investigación laboral.
                                            </TooltipContent>
                                          </Tooltip>
                                        </p>
                                        <AuditTrailViewer entries={auditTrail} />
                                      </div>
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
                    <div className="flex gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditWorkHistory(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar datos del empleo.</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setInvestigationTarget(item);
                              const existingPeriodos =
                                item.investigacionDetalle?.periodo?.periodos || [];
                              setPeriodRowCount(
                                existingPeriodos && existingPeriodos.length > 0
                                  ? existingPeriodos.length
                                  : 1,
                              );
                              setInvestigationStep(1);
                              setInvestigationDialogOpen(true);
                            }}
                          >
                            <ShieldCheck className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Capturar evaluación de desempeño e investigación laboral.
                        </TooltipContent>
                      </Tooltip>
                      {/* Mini Dictamen IA - OCULTO POR AHORA */}
                      {false && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              generateIaMini.mutate({ id: item.id })
                            }
                            disabled={generateIaMini.isPending || item.estatusInvestigacion !== "terminado"}
                            title={item.estatusInvestigacion !== "terminado" ? "Marca la investigación como 'Finalizado' para generar el mini dictamen IA" : ""}
                          >
                            <Sparkles className="h-4 w-4 text-blue-500" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {item.estatusInvestigacion !== "terminado" 
                            ? "Marca como 'Finalizado' para generar el mini dictamen IA"
                            : "Generar o actualizar el mini dictamen IA de este empleo."}
                        </TooltipContent>
                      </Tooltip>
                      )}
                      {/* Fin Mini Dictamen IA Oculto */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteWorkHistory(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Eliminar este registro laboral.</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comentarios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCommentSubmit} className="mb-4 space-y-2">
            <Textarea
              name="comentario"
              placeholder="Agregar un comentario..."
              required
              rows={2}
            />
            <div className="flex items-center justify-between">
              <label className="text-sm flex items-center gap-2">
                <input type="checkbox" name="publico" />
                Hacer público para el cliente
              </label>
              <Button type="submit" disabled={createCommentMutation.isPending}>
                <Plus className="h-4 w-4 mr-2" /> Agregar
              </Button>
            </div>
          </form>

          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay comentarios
            </p>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="border-l-2 border-primary pl-4 py-2">
                  <p className="text-sm">{comment.text}</p>
                  <p className="text-xs text-muted-foreground">Por: {comment.author}</p>
                  {comment.visibility === 'public' ? (
                    <span className="text-[10px] uppercase tracking-wide bg-green-100 text-green-700 px-2 py-0.5 rounded">Público</span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-wide bg-slate-100 text-slate-700 px-2 py-0.5 rounded">Interno</span>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(comment.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Psicométricas */}
      <Card>
        <CardHeader className="flex items-center justify-between flex-row">
          <CardTitle className="flex items-center gap-2">
            Psicométricas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const vacante = (fd.get("vacante") as string) || undefined;
              const tests = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="testId"]:checked')).map(i=>parseInt(i.value));
              if (tests.length === 0) { toast.error('Selecciona al menos una prueba'); return; }
              asignarPsico.mutate({ candidatoId: candidateId, tests, vacante } as any);
            }}
            className="space-y-3 mb-4"
          >
            <div className="grid grid-cols-3 gap-3">
              {/* UI sin batería: solo selección de pruebas individuales */}
              <div>
                <Label htmlFor="vacante">Vacante (opcional)</Label>
                <input id="vacante" name="vacante" className="mt-1 block w-full border rounded-md h-10 px-3" placeholder="Puesto" />
              </div>
              <div className="col-span-3">
                <Label>Pruebas a aplicar</Label>
                <div className="grid grid-cols-4 gap-2 mt-2 text-sm">
                  {[{id:1,n:'Cleaver'},{id:2,n:'Kostick'},{id:3,n:'IPV'},{id:4,n:'LIFO'},{id:5,n:'Zavic'},{id:6,n:'Gordon'},{id:7,n:'Terman'},{id:8,n:'Raven'},{id:9,n:'Inglés'},{id:10,n:'16PF'},{id:11,n:'Barsit'},{id:15,n:'Moss'},{id:16,n:'Wonderlic'}].map(t=> (
                    <label key={t.id} className="flex items-center gap-2"><input type="checkbox" name="testId" value={t.id} /> {t.id}. {t.n}</label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="submit" disabled={asignarPsico.isPending}>
                    Asignar
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Envía al candidato las pruebas seleccionadas en Psicométricas.
                </TooltipContent>
              </Tooltip>
            </div>
          </form>

          <div className="text-sm text-muted-foreground mb-4">
            {candidate.psicometricos ? (
              <div className="space-y-1">
                <div><span className="font-medium">Estatus:</span> {candidate.psicometricos.estatus || 'pendiente'}</div>
                {candidate.psicometricos.clavePsicometricas && (
                  <div><span className="font-medium">Clave:</span> {candidate.psicometricos.clavePsicometricas}</div>
                )}
              </div>
            ) : (
              <div>Sin información registrada.</div>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => {
                    const asignacionId = candidate.psicometricos?.clavePsicometricas || "";
                    if (!asignacionId) {
                      toast.error("No hay clave de asignación registrada");
                      return;
                    }
                    const existingPdf = documents.find(
                      (doc: any) => doc.tipoDocumento === "PSICOMETRICO",
                    );
                    const existingJson = documents.find(
                      (doc: any) => doc.tipoDocumento === "PSICOMETRICO_JSON",
                    );
                    if (existingPdf && existingJson) {
                      toast.info("El reporte ya está disponible en Documentos.");
                      try {
                        window.open(existingPdf.url, "_blank");
                      } catch {}
                      return;
                    }
                    guardarReportePsico.mutate({
                      candidatoId: candidateId,
                      asignacionId,
                      fileName: `psicometrico-${candidateId}.pdf`,
                    });
                  }}
                  disabled={
                    !candidate.psicometricos?.clavePsicometricas ||
                    guardarReportePsico.isPending ||
                    (documents.some((d: any) => d.tipoDocumento === "PSICOMETRICO") &&
                      documents.some((d: any) => d.tipoDocumento === "PSICOMETRICO_JSON"))
                  }
                >
                  Guardar reporte PDF
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Descarga y guarda el reporte psicométrico como documento del candidato.
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => {
                    const clave = candidate.psicometricos?.clavePsicometricas || "";
                    if (!clave) {
                      toast.error("No hay clave de asignación registrada");
                      return;
                    }
                    if (!candidate.email) {
                      toast.error("El candidato no tiene email registrado");
                      return;
                    }
                    reenviarInvitacion.mutate({ asignacionId: clave });
                  }}
                  disabled={
                    !candidate.psicometricos?.clavePsicometricas ||
                    !candidate.email ||
                    reenviarInvitacion.isPending
                  }
                >
                  <RefreshCcw className="h-4 w-4 mr-2" /> Reenviar invitación
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Reenvía el acceso a las pruebas psicométricas al candidato.
              </TooltipContent>
            </Tooltip>

            {/* Botón "Ver resultados" eliminado: el flujo se maneja al guardar el reporte */}
          </div>
        </CardContent>
      </Card>

      {/* Procesos del candidato */}
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
            {candidate?.clienteId && !isClientAuth && (
              <>
                <Button size="sm" variant="outline" onClick={() => {
                  setEmailTo(candidate?.email || "");
                  setEmailDialogOpen(true);
                }}>
                  Generar enlace de acceso
                </Button>
                <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                  <DialogContent aria-describedby="email-desc">
                    <DialogHeader>
                      <DialogTitle>Enviar enlace de acceso al cliente</DialogTitle>
                    </DialogHeader>
                    <p id="email-desc" className="sr-only">Formulario para enviar por correo un enlace de acceso temporal para el cliente.</p>
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
                            clientId: candidate!.clienteId!,
                            candidatoId: candidateId,
                            ttlDays: 14,
                            baseUrl,
                            sendEmailTo: emailTo || undefined,
                            emailContext: { nombreCandidato: candidate?.nombreCompleto }
                          } as any);
                          setEmailDialogOpen(false);
                        }}>Generar y enviar</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
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

      {candidate?.clienteId && (
        <Card>
          <CardHeader>
            <CardTitle>Enlaces activos</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const tokens = (activeTokens.data || []).filter((t:any)=> t.candidatoId === candidateId);
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

      {/* Visitas del candidato */}
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
                  <div key={p.id} className="border rounded p-2 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{p.clave} — {p.tipoProducto}</div>
                      <div className="text-xs text-muted-foreground">
                        Estatus: {p.visitStatus?.status || 'no_asignada'}
                        {p.visitStatus?.scheduledDateTime && ` • ${new Date(p.visitStatus.scheduledDateTime).toLocaleString()}`}
                        {p.visitStatus?.encuestadorId && ` • Encuestador: ${nombreEncuestador(p.visitStatus.encuestadorId)}`}
                        {p.visitStatus?.direccion && ` • ${p.visitStatus.direccion}`}
                      </div>
                    </div>
                    <Link href={`/procesos/${p.id}`}>
                      <Button size="sm" variant="outline">Administrar</Button>
                    </Link>
                  </div>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Crear Proceso */}
      <Dialog open={createProcessOpen} onOpenChange={setCreateProcessOpen}>
        <DialogContent className="max-w-xl" aria-describedby="crear-proceso-desc">
          <DialogHeader>
            <DialogTitle>Crear Proceso</DialogTitle>
          </DialogHeader>
          <p id="crear-proceso-desc" className="sr-only">Formulario para crear un nuevo proceso asociado al candidato.</p>
          {!candidate?.clienteId ? (
            <div className="text-sm text-red-600">
              Este candidato no tiene un cliente asignado. Asigna un cliente para poder crear un proceso.
            </div>
          ) : (
            <form id="form-crear-proceso" className="space-y-4" onSubmit={(e)=>{
              e.preventDefault();
              const fd = new FormData(e.currentTarget as HTMLFormElement);
              const puestoId = parseInt(String(fd.get('puestoId')||'0'));
              const tipoProducto = String(fd.get('tipoProducto')||'');
              const medioDeRecepcion = (fd.get('medioDeRecepcion') as string) || undefined;
              const fechaRecepcion = (fd.get('fechaRecepcion') as string) || undefined;
              if (!puestoId || !tipoProducto) { toast.error('Completa los campos obligatorios'); return; }
              createProcessMutation.mutate({
                candidatoId: candidateId,
                clienteId: candidate!.clienteId!,
                puestoId,
                tipoProducto: tipoProducto as any,
                medioDeRecepcion: medioDeRecepcion as any,
                // fechaRecepcion opcional; el backend pone now si falta
              } as any);
            }}>
              <div>
                <Label>Cliente</Label>
                <div className="mt-1 text-sm">{candidate.clienteId} — (asignado)</div>
              </div>
              <div>
                <Label htmlFor="medioDeRecepcion">¿Cómo llegó el proceso?</Label>
                <select id="medioDeRecepcion" name="medioDeRecepcion" className="mt-1 block w-full border rounded-md h-10 px-3">
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
                <select id="puestoId" name="puestoId" className="mt-1 block w-full border rounded-md h-10 px-3" required>
                  <option value="">Selecciona un puesto</option>
                  {(postsByClient.data || []).map((p:any)=> (
                    <option key={p.id} value={p.id}>{p.nombreDelPuesto}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="tipoProducto">Proceso a realizar</Label>
                <select id="tipoProducto" name="tipoProducto" className="mt-1 block w-full border rounded-md h-10 px-3" required>
                  {["ILA","ESE LOCAL","ESE FORANEO","VISITA LOCAL","VISITA FORANEA","ILA CON BURÓ DE CRÉDITO","ESE LOCAL CON BURÓ DE CRÉDITO","ESE FORANEO CON BURÓ DE CRÉDITO","ILA CON INVESTIGACIÓN LEGAL","ESE LOCAL CON INVESTIGACIÓN LEGAL","ESE FORANEO CON INVESTIGACIÓN LEGAL","BURÓ DE CRÉDITO","INVESTIGACIÓN LEGAL","SEMANAS COTIZADAS"].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="fechaRecepcion">Fecha de recepción (opcional)</Label>
                <Input id="fechaRecepcion" name="fechaRecepcion" type="date" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={()=>setCreateProcessOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createProcessMutation.isPending}>Crear</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      {/* Documents */}
      <Card>
        <CardHeader className="flex items-center justify-between flex-row">
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" /> Documentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleDocumentSubmit} className="space-y-2 mb-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <Label htmlFor="tipoDocumento">Tipo</Label>
                <select name="tipoDocumento" id="tipoDocumento" className="mt-1 block w-full border rounded-md h-10 px-3">
                  <option value="CV">CV</option>
                  <option value="ACTA_NACIMIENTO">Acta de Nacimiento</option>
                  <option value="INE">Copia INE</option>
                  <option value="COMPROBANTE_DOMICILIO">Comprobante de Domicilio</option>
                  <option value="RFC">RFC</option>
                  <option value="CURP">CURP</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="file">Archivo</Label>
                <input type="file" name="file" id="file" className="mt-1 block w-full" required />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={uploadDocumentMutation.isPending}>Subir</Button>
            </div>
          </form>

          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sin documentos</p>
          ) : (
            <ul className="space-y-2">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between border rounded p-2">
                  <div className="flex items-center gap-3">
                    {(() => { const { Icon, color } = getFileIcon(doc.nombreArchivo); return <Icon className={`h-5 w-5 ${color}`} />; })()}
                    <div>
                      <div className="font-medium">{doc.tipoDocumento} — {doc.nombreArchivo}</div>
                      <a href={doc.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 inline-flex items-center gap-1">
                        Ver <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">{doc.mimeType || ''} {(doc.tamanio || 0) > 0 ? `• ${(doc.tamanio/1024/1024).toFixed(2)} MB` : ''}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Review and Complete Dialog - NEW UNIFIED DIALOG */}
      <ReviewAndCompleteDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        workHistoryItem={editingWorkHistory}
        onSave={async (data) => {
          if (editingWorkHistory?.id) {
            // Formato esperado por el router: { id, data }
            const { id, candidatoId, createdAt, updatedAt, ...restData } = data;
            // Limpiar valores null → undefined para que zod los acepte como opcional
            const cleanedData = Object.fromEntries(
              Object.entries(restData).map(([k, v]) => [k, v === null ? undefined : v])
            );
            // Eliminar causalSalidaRH y causalSalidaJefeInmediato si están vacíos
            if (!cleanedData.causalSalidaRH) delete cleanedData.causalSalidaRH;
            if (!cleanedData.causalSalidaJefeInmediato) delete cleanedData.causalSalidaJefeInmediato;
            await updateWorkHistoryMutation.mutateAsync({
              id: editingWorkHistory.id,
              data: cleanedData,
            });
          } else {
            await createWorkHistoryMutation.mutateAsync(data);
          }
        }}
        isPending={createWorkHistoryMutation.isPending || updateWorkHistoryMutation.isPending}
      />

      {/* Investigación Laboral Dialog */}
      <Dialog
        open={investigationDialogOpen}
        onOpenChange={(open) => {
          setInvestigationDialogOpen(open);
          if (!open) {
            setInvestigationTarget(null);
            setInvestigationStep(1);
            setPeriodRowCount(1);
          }
        }}
      >
        <DialogContent
          className="max-w-2xl max-h-[80vh] overflow-y-auto"
          aria-describedby="investigacion-desc"
        >
          <DialogHeader>
            <DialogTitle>
              Investigación laboral —{" "}
              {investigationTarget?.empresa || "Empleo"}
            </DialogTitle>
          </DialogHeader>
          <p id="investigacion-desc" className="sr-only">
            Formulario para capturar la evaluación de desempeño de este empleo.
          </p>
          <form onSubmit={handleInvestigationSubmit} className="space-y-4">
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
                    rows={2}
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
                                <Label htmlFor={`periodoEmpresa_${index}`}>
                                  Periodo laborado (empresa) {index + 1}
                                </Label>
                                <Input
                                  id={`periodoEmpresa_${index}`}
                                  name={`periodoEmpresa_${index}`}
                                  defaultValue={periodo.periodoEmpresa || ""}
                                />
                              </div>
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

            {/* Incidencias */}
            <div className="border rounded-md p-3 space-y-3">
              <div className="text-sm font-semibold">Separación e incidencias</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="motivoSeparacionCandidato">
                    Motivo de separación (candidato)
                  </Label>
                  <Textarea
                    id="motivoSeparacionCandidato"
                    name="motivoSeparacionCandidato"
                    rows={2}
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.incidencias
                        ?.motivoSeparacionCandidato || ""
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="motivoSeparacionEmpresa">
                    Motivo de separación (empresa)
                  </Label>
                  <Textarea
                    id="motivoSeparacionEmpresa"
                    name="motivoSeparacionEmpresa"
                    rows={2}
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.incidencias
                        ?.motivoSeparacionEmpresa || ""
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="incapacidadesCandidato">
                    Incapacidades reportadas por el candidato (cantidad y causa)
                  </Label>
                  <Textarea
                    id="incapacidadesCandidato"
                    name="incapacidadesCandidato"
                    rows={2}
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.incidencias
                        ?.incapacidadesCandidato ||
                      investigationTarget?.investigacionDetalle?.incidencias
                        ?.incapacidades ||
                      ""
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="incapacidadesJefe">
                    Incapacidades reportadas por el jefe (cantidad y causa)
                  </Label>
                  <Textarea
                    id="incapacidadesJefe"
                    name="incapacidadesJefe"
                    rows={2}
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.incidencias
                        ?.incapacidadesJefe || ""
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="inasistencias">Inasistencias/Faltas</Label>
                  <Textarea
                    id="inasistencias"
                    name="inasistencias"
                    rows={2}
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.incidencias?.inasistencias ||
                      ""
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="antecedentesLegales">
                    Antecedentes legales (demandas, conflictos)
                  </Label>
                  <Textarea
                    id="antecedentesLegales"
                    name="antecedentesLegales"
                    rows={2}
                    defaultValue={
                      investigationTarget?.investigacionDetalle?.incidencias
                        ?.antecedentesLegales || ""
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
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                <Label htmlFor="evaluacionGeneral">Evaluación general</Label>
                <select
                  id="evaluacionGeneral"
                  name="evaluacionGeneral"
                  className="mt-1 block w-full border rounded-md h-10 px-3"
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
                  className="mt-1 block w-full border rounded-md h-10 px-3"
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
                  className="mt-1 block w-full border rounded-md h-10 px-3"
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
                  className="mt-1 block w-full border rounded-md h-10 px-3"
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
                  className="mt-1 block w-full border rounded-md h-10 px-3"
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
                  className="mt-1 block w-full border rounded-md h-10 px-3"
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
                  className="mt-1 block w-full border rounded-md h-10 px-3"
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
                  className="mt-1 block w-full border rounded-md h-10 px-3"
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
                  className="mt-1 block w-full border rounded-md h-10 px-3"
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
                  className="mt-1 block w-full border rounded-md h-10 px-3"
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
              <div className="col-span-2">
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="esRecomendable">¿Es recomendable?</Label>
                  <select
                    id="esRecomendable"
                    name="esRecomendable"
                    className="mt-1 block w-full border rounded-md h-10 px-3"
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
                    className="mt-1 block w-full border rounded-md h-10 px-3"
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
                <div className="col-span-2">
                  <Label htmlFor="razonRecontratacion">
                    Razón de la recomendación/recontratación
                  </Label>
                  <Textarea
                    id="razonRecontratacion"
                    name="razonRecontratacion"
                    rows={2}
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
                <div className="col-span-2">
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
                <div className="col-span-2">
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
                <div className="col-span-2">
                  <Label htmlFor="comentariosAdicionales">Comentarios adicionales</Label>
                  <Textarea
                    id="comentariosAdicionales"
                    name="comentariosAdicionales"
                    rows={2}
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
        </DialogContent>
      </Dialog>
    </div>
  );
}



