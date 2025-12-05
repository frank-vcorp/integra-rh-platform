import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Plus, Pencil, Trash2, Briefcase, MessageSquare, Paperclip, ExternalLink, File as FileIcon, FileText, FileSpreadsheet, FileImage, FileArchive, FileCode, RefreshCcw, FolderOpen, ShieldCheck, CheckCircle2 } from "lucide-react";
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
import { calcularTiempoTrabajado } from "@/lib/dateUtils";

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

  const [workHistoryDialogOpen, setWorkHistoryDialogOpen] = useState(false);
  const [investigationDialogOpen, setInvestigationDialogOpen] = useState(false);
  const [investigationStep, setInvestigationStep] = useState(1);
  const [investigationTarget, setInvestigationTarget] = useState<any | null>(null);
  const [periodRowCount, setPeriodRowCount] = useState(1);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [editingWorkHistory, setEditingWorkHistory] = useState<any>(null);
  const [consentAction, setConsentAction] = useState<'email' | 'whatsapp' | 'copy' | null>(null);

  const { data: candidate, isLoading } = trpc.candidates.getById.useQuery({ id: candidateId });
  const { data: workHistory = [] } = trpc.workHistory.getByCandidate.useQuery({ candidatoId: candidateId });
  const { data: comments = [] } = trpc.candidateComments.getByCandidate.useQuery({ candidatoId: candidateId });
  const { data: documents = [] } = trpc.documents.getByCandidate.useQuery({ candidatoId: candidateId });
  const { data: procesos = [] } = trpc.processes.getByCandidate.useQuery({ candidatoId: candidateId });
  const { data: consent, refetch: refetchConsent } = trpc.candidateConsent.getConsentByCandidateId.useQuery({ candidateId: candidateId });

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
    onSuccess: () => {
      toast.success("Psicométrica asignada");
      utils.candidates.getById.invalidate({ id: candidateId });
    },
    onError: (e:any) => toast.error("Error: "+e.message)
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

  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");

  // Work History mutations
  const createWorkHistoryMutation = trpc.workHistory.create.useMutation({
    onSuccess: () => {
      utils.workHistory.getByCandidate.invalidate();
      setWorkHistoryDialogOpen(false);
      toast.success("Historial laboral agregado");
    },
    onError: (error: any) => {
      toast.error("Error: " + error.message);
    },
  });

  const updateWorkHistoryMutation = trpc.workHistory.update.useMutation({
    onSuccess: () => {
      utils.workHistory.getByCandidate.invalidate();
      setWorkHistoryDialogOpen(false);
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

  const handleWorkHistorySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const causalRH = formData.get("causalSalidaRH") as string;
    const causalJefe = formData.get("causalSalidaJefeInmediato") as string;
    const fechaInicio = formData.get("fechaInicio") as string || undefined;
    const fechaFin = (formData.get("fechaFin") as string) || undefined;
    const tiempoTrabajadoEmpresa = (formData.get("tiempoTrabajadoEmpresa") as string) || undefined;
    const estatusInvestigacion = formData.get("estatusInvestigacion") as EstatusInvestigacionType | null;
    const comentarioInvestigacion = formData.get("comentarioInvestigacion") as string | null;
    
    // Calcular tiempo trabajado automáticamente
    const tiempoTrabajado = calcularTiempoTrabajado(fechaInicio, fechaFin);
    
    const data = {
      candidatoId: candidateId,
      empresa: formData.get("empresa") as string,
      puesto: formData.get("puesto") as string || undefined,
      fechaInicio,
      fechaFin,
      tiempoTrabajado: tiempoTrabajado || undefined,
      tiempoTrabajadoEmpresa: tiempoTrabajadoEmpresa || undefined,
      causalSalidaRH: (causalRH && causalRH !== "") ? causalRH as CausalSalidaType : undefined,
      causalSalidaJefeInmediato: (causalJefe && causalJefe !== "") ? causalJefe as CausalSalidaType : undefined,
      observaciones: formData.get("observaciones") as string || undefined,
      estatusInvestigacion: (estatusInvestigacion || undefined) as EstatusInvestigacionType | undefined,
      comentarioInvestigacion: comentarioInvestigacion || undefined,
    };

    if (editingWorkHistory) {
      updateWorkHistoryMutation.mutate({ id: editingWorkHistory.id, data });
    } else {
      createWorkHistoryMutation.mutate(data);
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
    setWorkHistoryDialogOpen(true);
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
          <p className="text-muted-foreground mt-1">Detalle del candidato</p>
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
          </div>
        </CardContent>
      </Card>

      {/* Data Consent */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Consentimiento de Datos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Estado del Consentimiento</p>
              {(() => {
                if (consent?.isGiven) {
                  return <p className="text-sm text-green-600">Otorgado el {new Date(consent.givenAt!).toLocaleString()}</p>;
                }
                if (consent) {
                  return <p className="text-sm text-yellow-600">Enlace enviado, pendiente de firma.</p>;
                }
                return <p className="text-sm text-gray-500">Pendiente de envío.</p>;
              })()}
            </div>
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button disabled={sendConsentLink.isPending}>
                      {sendConsentLink.isPending ? "Generando..." : "Obtener Enlace"}
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  Genera o regenera un enlace único para que el candidato lea y firme el aviso de privacidad.
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onSelect={() => {
                    setConsentAction("email");
                    if (candidate?.email) {
                      sendConsentLink.mutate({
                        candidateId: candidate.id,
                        candidateEmail: candidate.email,
                        candidateName: candidate.nombreCompleto,
                      });
                    } else {
                      toast.error("El candidato no tiene un email registrado.");
                    }
                  }}
                >
                  Enviar por Email
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    setConsentAction("whatsapp");
                    if (candidate?.email) {
                      sendConsentLink.mutate({
                        candidateId: candidate.id,
                        candidateEmail: candidate.email, // email is still needed for the record
                        candidateName: candidate.nombreCompleto,
                      });
                    } else {
                      toast.error(
                        "El candidato no tiene un email para registrar el envío."
                      );
                    }
                  }}
                >
                  Enviar por WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    setConsentAction("copy");
                    if (candidate?.email) {
                      sendConsentLink.mutate({
                        candidateId: candidate.id,
                        candidateEmail: candidate.email,
                        candidateName: candidate.nombreCompleto,
                      });
                    } else {
                      toast.error(
                        "El candidato no tiene un email para registrar el envío."
                      );
                    }
                  }}
                >
                  Copiar Enlace
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Work History */}
      <Card>
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
                  setWorkHistoryDialogOpen(true);
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
                        {item.fechaInicio ? new Date(item.fechaInicio).toLocaleDateString() : "-"} -{" "}
                        {item.fechaFin ? new Date(item.fechaFin).toLocaleDateString() : "Actual"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tiempo trabajado:{" "}
                        {item.tiempoTrabajadoEmpresa ||
                          item.tiempoTrabajado ||
                          calcularTiempoTrabajado(item.fechaInicio, item.fechaFin) ||
                          "-"}
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
                    if (existingPdf) {
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
                  disabled={!candidate.psicometricos?.clavePsicometricas}
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
                    reenviarInvitacion.mutate({ asignacionId: clave });
                  }}
                  disabled={
                    !candidate.psicometricos?.clavePsicometricas ||
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

      {/* Work History Dialog */}
    <Dialog open={workHistoryDialogOpen} onOpenChange={setWorkHistoryDialogOpen}>
      <DialogContent className="max-w-2xl" aria-describedby="workhistory-desc">
        <DialogHeader>
          <DialogTitle>
            {editingWorkHistory ? "Editar Historial Laboral" : "Agregar Historial Laboral"}
          </DialogTitle>
        </DialogHeader>
        <p id="workhistory-desc" className="sr-only">Formulario para capturar o editar el historial laboral del candidato.</p>
        <form onSubmit={handleWorkHistorySubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="empresa">Empresa *</Label>
                <Input
                  id="empresa"
                  name="empresa"
                  defaultValue={editingWorkHistory?.empresa}
                  required
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="puesto">Puesto</Label>
                <Input
                  id="puesto"
                  name="puesto"
                  defaultValue={editingWorkHistory?.puesto}
                />
              </div>
              <div>
                <Label htmlFor="fechaInicio">Fecha de Inicio</Label>
                <Input
                  id="fechaInicio"
                  name="fechaInicio"
                  type="date"
                  defaultValue={
                    editingWorkHistory?.fechaInicio
                      ? new Date(editingWorkHistory.fechaInicio).toISOString().split("T")[0]
                      : ""
                  }
                />
              </div>
              <div>
                <Label htmlFor="fechaFin">Fecha de Fin</Label>
                <Input
                  id="fechaFin"
                  name="fechaFin"
                  type="date"
                  defaultValue={
                    editingWorkHistory?.fechaFin
                      ? new Date(editingWorkHistory.fechaFin).toISOString().split("T")[0]
                      : ""
                  }
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="tiempoTrabajadoEmpresa">
                  Tiempo informado por la empresa
                </Label>
                <Input
                  id="tiempoTrabajadoEmpresa"
                  name="tiempoTrabajadoEmpresa"
                  placeholder="Ej. 3 años 2 meses"
                  defaultValue={editingWorkHistory?.tiempoTrabajadoEmpresa || ""}
                />
              </div>
              <div>
                <Label htmlFor="causalSalidaRH">Causal de Salida por parte de RH</Label>
                <select
                  id="causalSalidaRH"
                  name="causalSalidaRH"
                  defaultValue={editingWorkHistory?.causalSalidaRH ?? ""}
                  className="mt-1 block w-full border rounded-md h-10 px-3"
                >
                  <option value="">Sin especificar</option>
                  {CAUSALES_SALIDA.map((causal) => (
                    <option key={causal} value={causal}>{causal}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="causalSalidaJefeInmediato">Causal de Salida por parte del Jefe Inmediato</Label>
                <select
                  id="causalSalidaJefeInmediato"
                  name="causalSalidaJefeInmediato"
                  defaultValue={editingWorkHistory?.causalSalidaJefeInmediato ?? ""}
                  className="mt-1 block w-full border rounded-md h-10 px-3"
                >
                  <option value="">Sin especificar</option>
                  {CAUSALES_SALIDA.map((causal) => (
                    <option key={causal} value={causal}>{causal}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea
                  id="observaciones"
                  name="observaciones"
                  defaultValue={editingWorkHistory?.observaciones}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="estatusInvestigacion">Estatus de verificación</Label>
                <select
                  id="estatusInvestigacion"
                  name="estatusInvestigacion"
                  defaultValue={editingWorkHistory?.estatusInvestigacion || "en_revision"}
                  className="mt-1 block w-full border rounded-md h-10 px-3"
                >
                  {ESTATUS_INVESTIGACION.map((status) => (
                    <option key={status} value={status}>
                      {ESTATUS_INVESTIGACION_LABELS[status]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="comentarioInvestigacion">Comentario de verificación</Label>
                <Textarea
                  id="comentarioInvestigacion"
                  name="comentarioInvestigacion"
                  defaultValue={editingWorkHistory?.comentarioInvestigacion || ""}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setWorkHistoryDialogOpen(false);
                  setEditingWorkHistory(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  createWorkHistoryMutation.isPending || updateWorkHistoryMutation.isPending
                }
              >
                {editingWorkHistory ? "Actualizar" : "Agregar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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



