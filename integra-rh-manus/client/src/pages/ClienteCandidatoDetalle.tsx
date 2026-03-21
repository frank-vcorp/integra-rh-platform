import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, User, Briefcase, FileText, Layers, Mail, Phone, MapPin, Calendar, Clock, CheckCircle2, AlertCircle, History } from "lucide-react";
import { useParams, Link } from "wouter";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { Loader2 } from "lucide-react";
import { ESTATUS_INVESTIGACION_LABELS, EstatusInvestigacionType } from "@/lib/constants";
import { calcularTiempoTrabajado, formatearFecha } from "@/lib/dateUtils";
import { getCalificacionLabel, getCalificacionTextClass } from "@/lib/dictamen";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

const INVESTIGACION_BADGE: Record<EstatusInvestigacionType, string> = {
  en_revision: "bg-yellow-100 text-yellow-800 border-yellow-200",
  revisado: "bg-blue-100 text-blue-800 border-blue-200",
  terminado: "bg-green-100 text-green-800 border-green-200",
};

const getInvestigacionLabel = (estatus?: string) =>
  estatus && estatus in ESTATUS_INVESTIGACION_LABELS
    ? ESTATUS_INVESTIGACION_LABELS[estatus as EstatusInvestigacionType]
    : ESTATUS_INVESTIGACION_LABELS["en_revision"];

const getInvestigacionClass = (estatus?: string) =>
  estatus && estatus in INVESTIGACION_BADGE
    ? INVESTIGACION_BADGE[estatus as EstatusInvestigacionType]
    : INVESTIGACION_BADGE["en_revision"];

const formatDate = (value?: string | null) => (value ? formatearFecha(value) : "-");

/**
 * Vista de detalle de candidato para clientes
 * Reestructurada con diseño Grid + Tabs para mejor organización
 */
export default function ClienteCandidatoDetalle() {
  const params = useParams();
  const candidatoId = parseInt(params.id || "0");
  const { clientId } = useClientAuth();

  const { data: candidate, isLoading: candidateLoading } = trpc.candidates.getById.useQuery({ id: candidatoId });
  const { data: candidateProcesses = [] } = trpc.processes.getByCandidate.useQuery({ candidatoId });
  const { data: workHistory = [], isLoading: workHistoryLoading } = trpc.workHistory.getByCandidate.useQuery({ candidatoId });

  if (candidateLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  // Verificar permisos
  if (!candidate || candidate.clienteId !== clientId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Acceso denegado</h2>
          <p className="text-gray-600 mb-6">No tienes permisos para visualizar este expediente.</p>
          <Link href="/cliente/dashboard">
            <Button className="w-full">Volver al Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Compacto */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/cliente/dashboard">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowLeft className="h-5 w-5 text-gray-500" />
              </Button>
            </Link>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold text-gray-900 leading-tight">{candidate.nombreCompleto}</h1>
              <span className="text-xs text-gray-500">Expediente Digital</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {candidateProcesses.length} Procesos
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sidebar - Ficha de Identidad (Sticky) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="sticky top-24 space-y-6">
              {/* Tarjeta de Perfil */}
              <Card className="border-t-4 border-t-blue-600 shadow-sm overflow-hidden">
                <div className="h-24 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-center">
                   <div className="h-20 w-20 rounded-full bg-white p-1 border-4 border-white shadow-sm -mb-12 z-10">
                     <div className="h-full w-full rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                       <User className="h-8 w-8" />
                     </div>
                   </div>
                </div>
                <CardContent className="pt-14 pb-6 text-center">
                  <h2 className="text-xl font-bold text-gray-900">{candidate.nombreCompleto}</h2>
                  <p className="text-sm text-gray-500 mt-1">Candidato registrado</p>
                  
                  <Separator className="my-6" />
                  
                  <div className="space-y-4 text-left">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                        <Mail className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">Correo Electrónico</p>
                        <p className="text-sm font-medium truncate" title={candidate.email || ""}>
                          {candidate.email || "No registrado"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                        <Phone className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Teléfono</p>
                        <p className="text-sm font-medium">
                          {candidate.telefono || "No registrado"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                        <Calendar className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Fecha de Alta</p>
                        <p className="text-sm font-medium">
                          {new Date(candidate.createdAt).toLocaleDateString('es-MX')}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tarjeta de Resumen */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b bg-gray-50">
                   <CardTitle className="text-sm font-medium text-gray-700">Estado General</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Procesos Totales</span>
                        <span className="font-semibold">{candidateProcesses.length}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: '100%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Empleos Verificados</span>
                        <span className="font-semibold">{workHistory.length}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Área Principal - Tabs */}
          <div className="lg:col-span-8">
            <Tabs defaultValue="procesos" className="w-full">
              <TabsList className="w-full h-12 p-1 bg-white border shadow-sm rounded-lg grid grid-cols-2 mb-6">
                <TabsTrigger value="procesos" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                  <Briefcase className="h-4 w-4 mr-2" /> Procesos de Evaluación
                </TabsTrigger>
                <TabsTrigger value="trayectoria" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                  <History className="h-4 w-4 mr-2" /> Trayectoria Laboral
                </TabsTrigger>
                {/* Futuro: TabsTrigger value="documentos" */}
              </TabsList>

              {/* TAB: PROCESOS */}
              <TabsContent value="procesos" className="space-y-6">
                {candidateProcesses.length === 0 ? (
                  <Card className="border-dashed bg-gray-50/50">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <FileText className="h-8 w-8 text-gray-300" />
                      </div>
                      <h3 className="font-semibold text-gray-900">Sin procesos iniciados</h3>
                      <p className="text-gray-500 mt-1 max-w-sm">
                        Solicita un nuevo estudio para este candidato desde tu dashboard principal.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {candidateProcesses.map((process: any) => (
                      <Card key={process.id} className="group hover:shadow-md transition-all border-l-4 border-l-transparent hover:border-l-blue-600">
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row gap-6">
                            <div className="flex-1 space-y-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-bold text-lg text-gray-900">{process.clave}</h3>
                                    <Badge variant="secondary" className="font-normal text-xs bg-gray-100 text-gray-600">
                                      {process.tipoProducto}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-500">
                                    Iniciado el {new Date(process.fechaRecepcion).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                                  </p>
                                </div>
                                
                                <Badge className={`${
                                  process.estatusProceso === 'finalizado' || process.estatusProceso === 'entregado'
                                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                    : process.estatusProceso === 'en_recepcion'
                                    ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                    : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                  } border-0 px-3 py-1 font-medium capitalize`}>
                                  {process.estatusProceso.replace(/_/g, ' ')}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Calificación</p>
                                  <p className={`font-medium ${getCalificacionTextClass(process.calificacionFinal)}`}>
                                    {getCalificacionLabel(process.calificacionFinal)}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reporte</p>
                                  <p className="text-sm text-gray-700">
                                    {process.estatusProceso === 'finalizado' || process.estatusProceso === 'entregado' 
                                      ? "Disponible para descarga" 
                                      : "En elaboración"}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center border-l pl-6">
                              <Link href={`/cliente/proceso/${process.id}`}>
                                <Button className="w-full md:w-auto bg-slate-900 hover:bg-slate-800">
                                  Ver Detalle <CheckCircle2 className="ml-2 h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* TAB: TRAYECTORIA */}
              <TabsContent value="trayectoria">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-gray-500" />
                      Historial Laboral Verificado
                    </CardTitle>
                    <CardDescription>Resumen de empleos anteriores y validación de referencias</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {workHistoryLoading ? (
                      <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
                    ) : workHistory.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">Sin historial registrado</div>
                    ) : (
                      <div className="relative border-l-2 border-slate-200 ml-3 space-y-8 py-4">
                        {workHistory.map((job: any) => (
                          <div key={job.id} className="relative pl-8">
                            {/* Punto de línea de tiempo */}
                            <div className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white shadow-sm ${
                              job.estatusInvestigacion === 'terminado' ? 'bg-green-500' : 'bg-slate-300'
                            }`} />
                            
                            <div className="group bg-white rounded-lg border p-4 hover:shadow-md transition-all">
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                                <div>
                                  <h4 className="font-bold text-gray-900 text-base">{job.empresa}</h4>
                                  <p className="text-sm font-medium text-gray-600">{job.puesto || "Puesto no especificado"}</p>
                                </div>
                                <Badge variant="outline" className={`${getInvestigacionClass(job.estatusInvestigacion)}`}>
                                  {getInvestigacionLabel(job.estatusInvestigacion)}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(job.fechaInicio)} — {job.fechaFin ? formatDate(job.fechaFin) : "Actual"}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {job.tiempoTrabajado || calcularTiempoTrabajado(job.fechaInicio, job.fechaFin) || "S/D"}
                                </span>
                              </div>

                              {job.comentarioInvestigacion && (
                                <div className="bg-slate-50 p-3 rounded text-sm text-slate-700 italic border-l-2 border-slate-300 mb-3">
                                  "{job.comentarioInvestigacion}"
                                </div>
                              )}

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm border-t pt-3 border-slate-100">
                                <div>
                                  <span className="block text-xs text-gray-500 font-medium">Motivo de salida</span>
                                  <span className="text-gray-800">{job.causalSalidaRH || job.investigacionDetalle?.incidencias?.motivoSeparacionEmpresa || "No especificado"}</span>
                                </div>
                                <div>
                                  <span className="block text-xs text-gray-500 font-medium">Desempeño</span>
                                  <span className="text-gray-800 capitalize">{job.investigacionDetalle?.desempeno?.evaluacionGeneral?.toLowerCase() || "No evaluado"}</span>
                                </div>
                                <div>
                                  <span className="block text-xs text-gray-500 font-medium">¿Es recomendable?</span>
                                  <span className="text-gray-800 capitalize">{job.investigacionDetalle?.conclusion?.esRecomendable?.toLowerCase() || "No especificado"}</span>
                                </div>
                                <div>
                                  <span className="block text-xs text-gray-500 font-medium">¿Lo recontratarían?</span>
                                  <span className="text-gray-800 capitalize">{job.investigacionDetalle?.conclusion?.loRecontrataria?.toLowerCase() || "No especificado"}</span>
                                </div>
                                {(job.investigacionDetalle?.conclusion?.razonRecontratacion) && (
                                  <div className="col-span-2 md:col-span-4 mt-1">
                                    <span className="block text-xs text-gray-500 font-medium">Razones / Motivos (Recontratación)</span>
                                    <span className="text-gray-800">{job.investigacionDetalle.conclusion.razonRecontratacion}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
