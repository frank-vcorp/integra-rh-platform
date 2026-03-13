import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, FileText, User, Briefcase, Calendar, Award, Shield, Landmark, Home, UserCheck, Sparkles, CheckCircle2, Clock, AlertTriangle, Download, ExternalLink } from "lucide-react";
import { useParams, Link } from "wouter";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { Loader2 } from "lucide-react";
import { getCalificacionLabel, getCalificacionTextClass } from "@/lib/dictamen";
import { getServiciosIncluidos } from "@/lib/procesoTipo";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

/**
 * Vista de detalle de proceso para clientes
 * Reestructurada con diseño Grid + Tabs (Estilo Dashboard)
 */
export default function ClienteProcesoDetalle() {
  const params = useParams();
  const procesoId = parseInt(params.id || "0");
  const { clientId, clientData } = useClientAuth();

  const { data: process, isLoading: processLoading } = trpc.processes.getById.useQuery({ id: procesoId });
  const { data: candidate } = trpc.candidates.getById.useQuery(
    { id: process?.candidatoId || 0 },
    { enabled: !!process?.candidatoId }
  );
  // Obtener puesto desde la lista
  const { data: allPosts = [] } = trpc.posts.list.useQuery();
  const post = allPosts.find(p => p.id === process?.puestoId);

  if (processLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  // Verificar que el proceso pertenece al cliente
  if (!process || process.clienteId !== clientId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Acceso denegado</h2>
          <p className="text-gray-600 mb-6">No tienes permiso para ver este proceso.</p>
          <Link href="/cliente/dashboard">
            <Button className="w-full">Volver al Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const estatusLabels: Record<string, string> = {
    en_recepcion: "EN RECEPCIÓN",
    asignado: "ASIGNADO",
    entrevistado: "ENTREVISTADO",
    no_entrevistado: "NO ENTREVISTADO",
    en_verificacion: "EN VERIFICACIÓN",
    visita_programada: "VISITA PROGRAMADA",
    visita_realizada: "VISITA REALIZADA",
    en_dictamen: "EN DICTAMEN",
    finalizado: "FINALIZADO",
    entregado: "ENTREGADO",
  };

  // Determinar qué servicios incluye este tipo de proceso
  const servicios = getServiciosIncluidos(process?.tipoProducto, {
    visitStatus: (process as any)?.visitStatus,
    visitaDetalle: (process as any)?.visitaDetalle,
  });

  // Definir todos los bloques posibles
  const allBlocks = [
    {
      key: "investigacionLaboral",
      label: "Investigación Laboral",
      description: "Validación de referencias y antecedentes laborales",
      icon: <Briefcase className="h-5 w-5 text-blue-600" />,
      colorClass: "bg-blue-50 text-blue-700 border-blue-200",
      data: (process as any)?.investigacionLaboral as any,
      render: (d: any) => ({
        estado: d?.resultado || "Sin resultado",
        detalle: d?.detalles,
        flag: d?.completado ? "completo" : "pendiente",
      }),
      visible: servicios.laboral,
    },
    {
      key: "investigacionLegal",
      label: "Investigación Legal",
      description: "Búsqueda de incidencias legales y administrativas",
      icon: <Landmark className="h-5 w-5 text-indigo-600" />,
      colorClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
      data: (process as any)?.investigacionLegal as any,
      render: (d: any) => ({
        estado: d?.antecedentes || "Sin antecedentes registrados",
        detalle:
          d?.flagRiesgo
            ? "Con riesgo detectado"
            : d?.notasPeriodisticas || d?.observacionesImss || "Sin observaciones adicionales",
        link: d?.archivoAdjuntoUrl,
        flag: d ? "en curso" : "pendiente",
      }),
      visible: servicios.legal,
    },
    {
      key: "buroCredito",
      label: "Buró de Crédito",
      description: "Historial crediticio y comportamiento financiero",
      icon: <FileText className="h-5 w-5 text-amber-600" />,
      colorClass: "bg-amber-50 text-amber-700 border-amber-200",
      data: (process as any)?.buroCredito as any,
      render: (d: any) => ({
        estado: d?.estatus || "Sin registro",
        detalle: d?.score ? `Score crediticio: ${d.score}` : undefined,
        flag: d?.aprobado === true ? "aprobado" : d?.aprobado === false ? "rechazado" : "pendiente",
      }),
      visible: servicios.buro,
    },
    {
      key: "visitaDetalle",
      label: "Visita Domiciliaria",
      description: "Verificación socioeconómica en sitio",
      icon: <Home className="h-5 w-5 text-emerald-600" />,
      colorClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      data: (process as any)?.visitaDetalle || (process as any)?.visitStatus,
      render: (d: any) => ({
        estado: d?.tipo ? d.tipo.toUpperCase() : d?.status || "No asignada",
        detalle: d?.comentarios || d?.observaciones || "Sin comentarios",
        fecha: d?.fechaRealizacion || d?.scheduledDateTime,
        link: d?.enlaceReporteUrl,
      }),
      visible: servicios.visita,
    },
  ];

  // Filtrar solo los bloques que aplican al tipo de proceso contratado
  const blocks = allBlocks.filter(b => b.visible);

  const calcAvance = () => {
    const considered = blocks.length;
    if (considered === 0) return 0;
    const completed = blocks.reduce((acc, b) => {
      const d: any = b.data;
      if (!d) return acc;
      if (b.key === "investigacionLaboral" && d?.completado) return acc + 1;
      if (b.key === "investigacionLegal" && d?.antecedentes) return acc + 1;
      if (b.key === "buroCredito" && (d?.aprobado === true || d?.aprobado === false)) return acc + 1;
      if (b.key === "visitaDetalle" && (d?.fechaRealizacion || d?.status === "realizada")) return acc + 1;
      return acc;
    }, 0);
    return Math.round((completed / considered) * 100);
  };

  const avance = calcAvance();

  const iaDictamenCliente: any =
    (process as any)?.investigacionLaboral?.iaDictamenCliente || null;

  const puedeVerIa =
    !!clientData?.iaSuggestionsEnabled &&
    !!iaDictamenCliente &&
    process.calificacionFinal &&
    process.calificacionFinal !== "pendiente" &&
    process.calificacionFinal !== "no_recomendable";
  
  const isFinished = process.estatusProceso === 'finalizado' || process.estatusProceso === 'entregado';

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Compacto */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/cliente/candidato/${process.candidatoId}`}>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowLeft className="h-5 w-5 text-gray-500" />
              </Button>
            </Link>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Proceso {process.clave}</h1>
              <span className="text-xs text-gray-500">Detalle de Investigación</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
              {process.tipoProducto}
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sidebar - Resumen del Proceso (Cols 4) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Tarjeta de Estatus */}
            <Card className="border-t-4 border-t-blue-600 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wide">Estatus Actual</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Badge className={`text-sm px-3 py-1 mb-2 ${
                    isFinished
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                  }`}>
                    {estatusLabels[process.estatusProceso] || process.estatusProceso}
                  </Badge>
                  <div className="space-y-1 mt-2">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Progreso</span>
                      <span>{avance}%</span>
                    </div>
                    <Progress value={avance} className="h-2" />
                  </div>
                </div>

                <div className="border-t pt-4 mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Fecha Recepción</span>
                    <span className="text-sm font-medium">
                       {new Date(process.fechaRecepcion).toLocaleDateString('es-MX')}
                    </span>
                  </div>
                  {process.fechaCierre && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Fecha Cierre</span>
                      <span className="text-sm font-medium">
                         {new Date(process.fechaCierre).toLocaleDateString('es-MX')}
                      </span>
                    </div>
                  )}
                </div>

                {isFinished && (
                  <a href={process.archivoDictamenUrl || "#"} target="_blank" rel="noopener noreferrer" className={!process.archivoDictamenUrl ? "pointer-events-none" : ""}> 
                    <Button className="w-full mt-6 bg-green-600 hover:bg-green-700" disabled={!process.archivoDictamenUrl}>
                      <Download className="mr-2 h-4 w-4" /> Descargar Reporte PDF
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>

            {/* Tarjeta de Candidato */}
            <Card>
              <CardHeader className="pb-3 border-b bg-gray-50/50">
                <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <User className="h-4 w-4" /> Candidato
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {candidate?.nombreCompleto || "Cargando..."}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {post?.nombreDelPuesto || "Puesto no especificado"}
                    </p>
                  </div>
                </div>
                <Link href={`/cliente/candidato/${process.candidatoId}`}>
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    Ver Expediente Completo
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Calificación Final */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wide">Dictamen Final</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center text-center py-4">
                  <div className={`text-2xl font-bold px-4 py-2 rounded-lg border-2 mb-2 ${getCalificacionTextClass(process.calificacionFinal)} border-current bg-opacity-10`}>
                    {getCalificacionLabel(process.calificacionFinal)}
                  </div>
                  <p className="text-xs text-gray-500 max-w-[200px]">
                    {process.calificacionFinal === 'pendiente' 
                      ? "La calificación se asignará al finalizar la evaluación."
                      : "Resultado final basado en la investigación integral."}
                  </p>
                </div>
                
                {(process as any)?.comentarioCalificacion && (
                   <div className="mt-4 bg-slate-50 p-3 rounded-md border text-sm text-slate-700 italic">
                     "{(process as any).comentarioCalificacion}"
                   </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Área Principal (Cols 8) */}
          <div className="lg:col-span-8 space-y-6">
            
            <Tabs defaultValue="resultados" className="w-full">
               <TabsList className="w-full h-12 p-1 bg-white border shadow-sm rounded-lg grid grid-cols-2 mb-6">
                 <TabsTrigger value="resultados" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                   <CheckCircle2 className="h-4 w-4 mr-2" /> Resultados de Investigación
                 </TabsTrigger>
                 <TabsTrigger value="inteligencia" disabled={!puedeVerIa} className="data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 disabled:opacity-50">
                   <Sparkles className="h-4 w-4 mr-2" /> Inteligencia Artificial
                 </TabsTrigger>
               </TabsList>

               {/* TAB: RESULTADOS */}
               <TabsContent value="resultados" className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {blocks.map((block) => {
                      const info = block.render(block.data || {});
                      return (
                        <Card key={block.key} className="hover:shadow-md transition-shadow">
                          <CardHeader className="pb-2 bg-gray-50/50 border-b">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {block.icon}
                                <CardTitle className="text-base font-semibold text-gray-700">{block.label}</CardTitle>
                              </div>
                              <Badge variant="outline" className="bg-white">
                                {info.flag === 'completo' || info.flag === 'aprobado' || info.flag === 'en curso' ? (
                                  <CheckCircle2 className="h-3 w-3 text-green-500 mr-1" />
                                ) : (
                                  <Clock className="h-3 w-3 text-amber-500 mr-1" />
                                )}
                                <span className="text-xs">{info.flag}</span>
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-4 space-y-3">
                            <div>
                               <p className="text-xs font-semibold text-gray-500 uppercase">Resultado</p>
                               <p className="font-medium text-gray-900">{info.estado}</p>
                            </div>
                            
                            {info.detalle && (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase">Detalles</p>
                                <p className="text-sm text-gray-700 line-clamp-3">{info.detalle}</p>
                              </div>
                            )}

                            {info.link && (
                              <div className="pt-2">
                                <a href={info.link} target="_blank" rel="noopener noreferrer">
                                  <Button variant="outline" size="sm" className="w-full h-8 text-xs">
                                    <ExternalLink className="h-3 w-3 mr-2" /> Ver Evidencia
                                  </Button>
                                </a>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                   })}
                 </div>
               </TabsContent>

               {/* TAB: INTELIGENCIA ARTIFICIAL */}
               <TabsContent value="inteligencia">
                 <Card className="border-purple-100 shadow-sm">
                   <CardHeader className="bg-gradient-to-r from-purple-50 to-white border-b border-purple-100">
                     <CardTitle className="text-purple-800 flex items-center gap-2">
                       <Sparkles className="h-5 w-5" /> Análisis Impulsado por IA
                     </CardTitle>
                     <CardDescription>
                       Resumen ejecutivo generado automáticamente basado en los hallazgos.
                     </CardDescription>
                   </CardHeader>
                   <CardContent className="pt-6 space-y-6">
                      {iaDictamenCliente?.resumenEjecutivoCliente && (
                        <div className="bg-white p-4 rounded-lg border shadow-sm">
                          <h4 className="font-semibold text-gray-900 mb-2">Resumen Ejecutivo</h4>
                          <p className="text-gray-700 leading-relaxed">
                            {iaDictamenCliente.resumenEjecutivoCliente}
                          </p>
                        </div>
                      )}

                      {iaDictamenCliente?.recomendacionesCliente && iaDictamenCliente.recomendacionesCliente.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" /> Puntos clave para la contratación
                          </h4>
                          <ul className="space-y-2">
                            {iaDictamenCliente.recomendacionesCliente.map((rec: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-3 bg-gray-50 p-3 rounded-md text-sm text-gray-700">
                                <span className="font-bold text-gray-400 select-none">{idx + 1}.</span>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-800 rounded-md text-xs">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <p>Este análisis es una herramienta de apoyo y no sustituye la revisión final del reclutador humano.</p>
                      </div>
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
