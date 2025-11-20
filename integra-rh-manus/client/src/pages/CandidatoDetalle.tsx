import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { arrayBufferToBase64 } from "@/lib/base64";
import { ArrowLeft, Plus, Pencil, Trash2, Briefcase, MessageSquare, Paperclip, ExternalLink, File as FileIcon, FileText, FileSpreadsheet, FileImage, FileArchive, FileCode, RefreshCcw, Eye, FolderOpen } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "wouter";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CAUSALES_SALIDA, CausalSalidaType } from "@/lib/constants";
import { calcularTiempoTrabajado } from "@/lib/dateUtils";

export default function CandidatoDetalle() {
  const params = useParams();
  const candidateId = parseInt(params.id || "0");

  const [workHistoryDialogOpen, setWorkHistoryDialogOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [editingWorkHistory, setEditingWorkHistory] = useState<any>(null);

  const { data: candidate, isLoading } = trpc.candidates.getById.useQuery({ id: candidateId });
  const { data: workHistory = [] } = trpc.workHistory.getByCandidate.useQuery({ candidatoId: candidateId });
  const { data: comments = [] } = trpc.candidateComments.getByCandidate.useQuery({ candidatoId: candidateId });
  const { data: documents = [] } = trpc.documents.getByCandidate.useQuery({ candidatoId: candidateId });
  const { data: procesos = [] } = trpc.processes.getByCandidate.useQuery({ candidatoId: candidateId });
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
      utils.documents.getByCandidate.invalidate();
      toast.success("Reporte guardado en Documentos");
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
  const consultarResultados = trpc.psicometricas.consultarResultados.useQuery(
    { asignacionId: candidate?.psicometricos?.clavePsicometricas || "" },
    {
      enabled: false,
      retry: false,
      onSuccess: (data:any) => {
        setResultadosData(data);
        setResultadosOpen(true);
        utils.candidates.getById.invalidate({ id: candidateId });
      },
      onError: (e:any) => toast.error("Error: "+(e.message || "No se pudieron consultar los resultados")),
    }
  );
  const updateCandidate = trpc.candidates.update.useMutation({
    onSuccess: () => {
      utils.candidates.getById.invalidate({ id: candidateId });
      toast.success("Resultados guardados en el expediente");
    },
    onError: (e:any) => toast.error("Error guardando resultados: "+e.message),
  });

  const [resultadosOpen, setResultadosOpen] = useState(false);
  const [resultadosData, setResultadosData] = useState<any>(null);
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
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuf)));
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
    const fechaFin = formData.get("fechaFin") as string || undefined;
    
    // Calcular tiempo trabajado automáticamente
    const tiempoTrabajado = calcularTiempoTrabajado(fechaInicio, fechaFin);
    
    const data = {
      candidatoId: candidateId,
      empresa: formData.get("empresa") as string,
      puesto: formData.get("puesto") as string || undefined,
      fechaInicio,
      fechaFin,
      tiempoTrabajado: tiempoTrabajado || undefined,
      causalSalidaRH: (causalRH && causalRH !== "") ? causalRH as CausalSalidaType : undefined,
      causalSalidaJefeInmediato: (causalJefe && causalJefe !== "") ? causalJefe as CausalSalidaType : undefined,
      observaciones: formData.get("observaciones") as string || undefined,
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
        <Link href="/candidatos">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
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

      {/* Work History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Historial Laboral
          </CardTitle>
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
                        Tiempo trabajado: {item.tiempoTrabajado || calcularTiempoTrabajado(item.fechaInicio, item.fechaFin) || "-"}
                      </p>
                      {item.observaciones && (
                        <p className="text-sm mt-2">
                          <span className="text-muted-foreground">Observaciones:</span> {item.observaciones}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditWorkHistory(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteWorkHistory(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
          <CardTitle className="flex items-center gap-2">Psicométricas</CardTitle>
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
              <Button type="submit" disabled={asignarPsico.isPending}>Asignar</Button>
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
            <Button
              variant="outline"
              onClick={() => {
                const asignacionId = candidate.psicometricos?.clavePsicometricas || '';
                if (!asignacionId) { toast.error('No hay clave de asignación registrada'); return; }
                guardarReportePsico.mutate({ candidatoId: candidateId, asignacionId, fileName: `psicometrico-${candidateId}.pdf` });
              }}
              disabled={!candidate.psicometricos?.clavePsicometricas}
            >
              Guardar reporte PDF
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                const clave = candidate.psicometricos?.clavePsicometricas || '';
                if (!clave) { toast.error('No hay clave de asignación registrada'); return; }
                reenviarInvitacion.mutate({ asignacionId: clave });
              }}
              disabled={!candidate.psicometricos?.clavePsicometricas || reenviarInvitacion.isPending}
            >
              <RefreshCcw className="h-4 w-4 mr-2"/> Reenviar invitación
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                const clave = candidate.psicometricos?.clavePsicometricas || '';
                if (!clave) { toast.error('No hay clave de asignación registrada'); return; }
                consultarResultados.refetch();
              }}
              disabled={!candidate.psicometricos?.clavePsicometricas || consultarResultados.isFetching}
            >
              <Eye className="h-4 w-4 mr-2"/> Ver resultados
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                if (!resultadosData) { toast.error('Primero consulta resultados'); return; }
                updateCandidate.mutate({ id: candidateId, data: { psicometricos: { ...(candidate.psicometricos || {}), resultadosJson: resultadosData } } as any });
              }}
              disabled={!resultadosData || updateCandidate.isPending}
            >
              Guardar resultados en expediente
            </Button>
          </div>
          {/* Modal resultados JSON */}
          <Dialog open={resultadosOpen} onOpenChange={setResultadosOpen}>
            <DialogContent className="max-w-3xl" aria-describedby="resultados-desc">
              <DialogHeader>
                <DialogTitle>Resultados Psicométricos</DialogTitle>
              </DialogHeader>
              <p id="resultados-desc" className="sr-only">Vista de resultados psicométricos en formato JSON.</p>
              <pre className="text-xs bg-slate-100 p-3 rounded max-h-[60vh] overflow-auto">
                {JSON.stringify(resultadosData, null, 2)}
              </pre>
            </DialogContent>
          </Dialog>
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
    </div>
  );
}



