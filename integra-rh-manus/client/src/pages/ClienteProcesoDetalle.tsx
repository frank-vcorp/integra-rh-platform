import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { VisitCapturePanel } from "@/components/VisitCapturePanel";
import { ArrowLeft, FileText, User, Briefcase, Calendar, Award, Shield, Landmark, Home, UserCheck, Sparkles, CheckCircle2, Clock, AlertTriangle, Download, ExternalLink, Paperclip, ImageIcon } from "lucide-react";
import { useParams, Link } from "wouter";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { Loader2 } from "lucide-react";
import { getCalificacionLabel, getCalificacionTextClass } from "@/lib/dictamen";
import { getServiciosIncluidos } from "@/lib/procesoTipo";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

/**
 * Vista de detalle de proceso para clientes
 * Reestructurada con diseño Grid + Tabs (Estilo Dashboard)
 * @intervention ARCH-20260320-01
 * @respaldo context/SPECs/SPEC-pdf-dinamico-estudio-cliente.md
 */

/** Detecta si una URL apunta a una imagen por extensión. @intervention IMPL-20260408-01 */
function isImageUrl(url: string): boolean {
  return /\.(jpe?g|png|gif|webp|svg)(\?.*)?$/i.test(url);
}

/** Formatea bytes a unidad legible. @intervention IMPL-20260408-01 */
function formatBytes(bytes?: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function ClienteProcesoDetalle() {
  const params = useParams();
  const procesoId = parseInt(params.id || "0");
  const { clientId, clientData } = useClientAuth();
  const [visitCaptureOpen, setVisitCaptureOpen] = useState(false);

  const { data: process, isLoading: processLoading } = trpc.processes.getById.useQuery({ id: procesoId });
  const { data: candidate } = trpc.candidates.getById.useQuery(
    { id: process?.candidatoId || 0 },
    { enabled: !!process?.candidatoId }
  );
  const { data: publishedReportSummary } = trpc.processes.getPublishedReportSummary.useQuery(
    { id: procesoId },
    { enabled: Number.isFinite(procesoId) && procesoId > 0 }
  );
  const openPublishedReport = trpc.processes.getPublishedReportAccess.useMutation({
    onSuccess: (data) => {
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    },
  });
  // IMPL-20260408-01: documentos del expediente en solo lectura
  const { data: processDocs = [] } = trpc.documents.getByProcess.useQuery(
    { procesoId },
    { enabled: Number.isFinite(procesoId) && procesoId > 0 }
  );
  // Obtener puesto desde la lista
  const { data: allPosts = [] } = trpc.posts.list.useQuery();
  const post = allPosts.find((p: { id: number }) => p.id === process?.puestoId);

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
      data: (process as any)?.investigacionLaboral || {},
      render: (d: any) => ({
        estado: getCalificacionLabel((candidate as any)?.dictamenLaboral?.resultado || d?.resultado || "pendiente"),
        detalle: [
          (candidate as any)?.dictamenLaboral?.observacionResultado
            ? `Observación: ${(candidate as any).dictamenLaboral.observacionResultado}`
            : null,
          (candidate as any)?.dictamenLaboral?.comentariosGenerales || d?.detalles || null,
        ].filter(Boolean).join("\n\n") || "Sin comentarios o resultados definidos",
        flag: (candidate as any)?.dictamenLaboral?.completado ? "completo" : d?.completado ? "completo" : "pendiente",
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
      data: { ...((process as any)?.visitStatus || {}), ...((process as any)?.visitaDetalle || {}) },
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
  const surveyorPortalAccess = (process as any)?.surveyorPortalAccess;
  const surveyorPortalUrl = surveyorPortalAccess?.url || null;
  const surveyorPortalStatus = surveyorPortalAccess?.status || null;
  const visitCaptureData = ((process as any)?.visitaDetalle || {}) as Record<string, unknown>;
  const hasCapturedVisitData = Object.keys(visitCaptureData).length > 0;
  const processIsVisitCompleted = process.estatusProceso === 'visita_realizada' || process.visitStatus?.status === 'realizada' || surveyorPortalStatus === 'COMPLETADO';
  const hasPublishedClientReport = !!publishedReportSummary;
  const visitBlock = blocks.find((block) => block.key === 'visitaDetalle');
  const resultBlocks = blocks.filter((block) => block.key !== 'visitaDetalle');
  const visitInfo = visitBlock
    ? (visitBlock.render(visitBlock.data || {}) as {
        estado?: string;
        detalle?: string;
        flag?: string;
        fecha?: string;
        link?: string;
      })
    : null;

  // IMPL-20260408-06: secciones documentales del proceso agrupadas por fuente (reemplaza lista plana)
  type DocItem = {
    label: string;
    url: string;
    kind: 'auto' | 'image' | 'file';
  };

  type DocSection = {
    key: string;
    label: string;
    icon: JSX.Element;
    notes?: string;
    items: DocItem[];
  };
  const docSections: DocSection[] = [];

  const _invLegal = (process as any)?.investigacionLegal;
  const _invLegalItems: DocItem[] = [];
  if (_invLegal?.archivoAdjuntoUrl) _invLegalItems.push({ label: 'Archivo adjunto legal', url: _invLegal.archivoAdjuntoUrl, kind: 'auto' });
  if (_invLegal?.evidenciaImgUrl) _invLegalItems.push({ label: 'Imagen legal', url: _invLegal.evidenciaImgUrl, kind: 'image' });
  (_invLegal?.evidenciasGraficas || []).forEach((u: string, i: number) => { if (u) _invLegalItems.push({ label: `Evidencia gráfica ${i + 1}`, url: u, kind: 'image' }); });
  const _invLegalNotes: string | undefined = [_invLegal?.notasPeriodisticas, _invLegal?.observacionesImss].filter(Boolean).join('\n\n') || undefined;
  if (_invLegalItems.length > 0 || _invLegalNotes)
    docSections.push({ key: 'invLegal', label: 'Investigación Legal', icon: <Landmark className="h-4 w-4 text-indigo-500" />, notes: _invLegalNotes, items: _invLegalItems });

  const _semanas = (process as any)?.semanasDetalle;
  const _semanasItems: DocItem[] = [];
  (_semanas?.evidenciasGraficas || []).forEach((u: string, i: number) => { if (u) _semanasItems.push({ label: `Evidencia IMSS/Semanas ${i + 1}`, url: u, kind: 'image' }); });
  const _semanasNotes: string | undefined = _semanas?.comentario || undefined;
  if (_semanasItems.length > 0 || _semanasNotes)
    docSections.push({ key: 'semanas', label: 'Semanas Cotizadas', icon: <Calendar className="h-4 w-4 text-blue-500" />, notes: _semanasNotes, items: _semanasItems });

  const _antPenales = (process as any)?.antecedentesPenales;
  const _antPenalesItems: DocItem[] = [];
  (_antPenales?.evidenciasGraficas || []).forEach((u: string, i: number) => { if (u) _antPenalesItems.push({ label: `Evidencia Antecedentes ${i + 1}`, url: u, kind: 'image' }); });
  const _antPenalesNotes: string | undefined = _antPenales?.comentarios || undefined;
  if (_antPenalesItems.length > 0 || _antPenalesNotes)
    docSections.push({ key: 'antPenales', label: 'Antecedentes Penales', icon: <Shield className="h-4 w-4 text-red-500" />, notes: _antPenalesNotes, items: _antPenalesItems });

  const _buro = (process as any)?.buroCredito;
  const _buroItems: DocItem[] = [];
  if (_buro?.pdfUrl) _buroItems.push({ label: 'PDF Buró de Crédito', url: _buro.pdfUrl, kind: 'file' });
  (_buro?.archivosAdicionales || []).forEach((u: string, i: number) => { if (u) _buroItems.push({ label: `Archivo adicional Buró ${i + 1}`, url: u, kind: 'auto' }); });
  if (_buroItems.length > 0)
    docSections.push({ key: 'buro', label: 'Buró de Crédito', icon: <FileText className="h-4 w-4 text-amber-500" />, items: _buroItems });

  const _visitDet = (process as any)?.visitaDetalle;
  const _visitDetItems: DocItem[] = [];
  if (_visitDet?.enlaceReporteUrl) _visitDetItems.push({ label: 'Reporte de visita', url: _visitDet.enlaceReporteUrl, kind: 'file' });
  (_visitDet?.evidenciasGraficas || []).forEach((u: string, i: number) => { if (u) _visitDetItems.push({ label: `Evidencia Visita ${i + 1}`, url: u, kind: 'image' }); });
  if (_visitDetItems.length > 0)
    docSections.push({ key: 'visita', label: 'Visita Domiciliaria', icon: <Home className="h-4 w-4 text-emerald-500" />, items: _visitDetItems });

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
                  <Button
                    className="w-full mt-6 bg-green-600 hover:bg-green-700"
                    disabled={!hasPublishedClientReport || openPublishedReport.isPending}
                    onClick={() => openPublishedReport.mutate({ id: procesoId })}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {openPublishedReport.isPending ? "Abriendo reporte..." : "Descargar Reporte PDF"}
                  </Button>
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
               <TabsList className="w-full h-12 p-1 bg-white border shadow-sm rounded-lg grid grid-cols-3 mb-6">
                 <TabsTrigger value="resultados" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                   <CheckCircle2 className="h-4 w-4 mr-2" /> Resultados
                 </TabsTrigger>
                 <TabsTrigger value="documentos" className="data-[state=active]:bg-slate-50 data-[state=active]:text-slate-700">
                   <Paperclip className="h-4 w-4 mr-2" /> Documentos
                 </TabsTrigger>
                 <TabsTrigger value="inteligencia" disabled={!puedeVerIa} className="data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 disabled:opacity-50">
                   <Sparkles className="h-4 w-4 mr-2" /> Inteligencia IA
                 </TabsTrigger>
               </TabsList>

               {/* TAB: RESULTADOS */}
               <TabsContent value="resultados" className="space-y-6">
                 {visitBlock && (
                   <Card className="border-emerald-200 shadow-sm overflow-hidden">
                     <CardHeader className="bg-emerald-50/70 border-b border-emerald-100">
                       <div className="flex flex-wrap items-center justify-between gap-3">
                         <div>
                           <CardTitle className="text-base font-semibold text-emerald-900 flex items-center gap-2">
                             <Home className="h-5 w-5 text-emerald-600" /> Visita (Resumen)
                           </CardTitle>
                           <CardDescription className="text-emerald-800/80 mt-1">
                             Seguimiento del cuestionario compartido con el encuestador y recuperación del estudio.
                           </CardDescription>
                         </div>
                         <Badge variant="outline" className="bg-white border-emerald-200 text-emerald-800">
                           {surveyorPortalStatus || process.visitStatus?.status || 'sin enlace'}
                         </Badge>
                       </div>
                     </CardHeader>
                     <CardContent className="pt-5 space-y-4">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                         <div className="rounded-lg border bg-white p-4 space-y-2">
                           <p className="text-xs font-semibold uppercase text-gray-500">Resultado</p>
                           <p className="font-medium text-gray-900">{visitInfo?.estado || 'Sin registro'}</p>
                           <p className="text-gray-700 whitespace-pre-wrap">{visitInfo?.detalle || 'Sin comentarios disponibles'}</p>
                         </div>
                         <div className="rounded-lg border bg-white p-4 space-y-2">
                           <p className="text-xs font-semibold uppercase text-gray-500">Programación</p>
                           <p className="text-gray-900">{visitInfo?.fecha || process.visitStatus?.scheduledDateTime || 'Sin fecha programada'}</p>
                           <p className="text-gray-700">{process.visitStatus?.direccion || 'Sin dirección registrada'}</p>
                         </div>
                       </div>

                       <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
                         <div>
                           <p className="text-xs font-semibold uppercase text-emerald-800">URL del cuestionario</p>
                           <p className="text-sm break-all text-emerald-950">
                             {surveyorPortalUrl || 'La visita aún no tiene una URL generada.'}
                           </p>
                         </div>
                         <div className="flex flex-wrap gap-2">
                           {hasCapturedVisitData && (
                             <Button variant="outline" size="sm" onClick={() => setVisitCaptureOpen(true)}>
                               <FileText className="h-4 w-4 mr-2" /> Ver captura registrada
                             </Button>
                           )}
                           {processIsVisitCompleted && (
                             <Button
                               variant="outline"
                               size="sm"
                              disabled={!publishedReportSummary || openPublishedReport.isPending}
                              onClick={() => openPublishedReport.mutate({ id: procesoId })}
                             >
                               <Download className="h-4 w-4 mr-2" />
                              {openPublishedReport.isPending
                                ? 'Abriendo PDF...'
                                : publishedReportSummary
                                  ? `Abrir PDF publicado v${publishedReportSummary.versionNumber}`
                                  : 'PDF pendiente de publicación'}
                             </Button>
                           )}
                         </div>
                         <p className="text-xs text-emerald-900/80">
                           {processIsVisitCompleted
                            ? publishedReportSummary
                              ? 'La visita ya fue concluida. El cliente solo puede abrir la última versión publicada por el equipo interno.'
                              : 'La visita ya fue concluida. El reporte final aparecerá aquí cuando el equipo interno publique una versión de Armados.'
                             : 'Mientras la visita siga programada o en curso, este es el acceso que recibió el encuestador para capturar la información.'}
                         </p>
                       </div>
                     </CardContent>
                   </Card>
                 )}

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {resultBlocks.map((block) => {
                      const info = block.render(block.data || {}) as {
                        estado?: string;
                        detalle?: string;
                        flag?: string;
                        fecha?: string;
                        link?: string;
                      };
                      const infoFlag = info.flag ?? "pendiente";
                      return (
                        <Card key={block.key} className="hover:shadow-md transition-shadow">
                          <CardHeader className="pb-2 bg-gray-50/50 border-b">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {block.icon}
                                <CardTitle className="text-base font-semibold text-gray-700">{block.label}</CardTitle>
                              </div>
                              <Badge variant="outline" className="bg-white">
                                {infoFlag === 'completo' || infoFlag === 'aprobado' || infoFlag === 'en curso' ? (
                                  <CheckCircle2 className="h-3 w-3 text-green-500 mr-1" />
                                ) : (
                                  <Clock className="h-3 w-3 text-amber-500 mr-1" />
                                )}
                                <span className="text-xs">{infoFlag}</span>
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
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{info.detalle}</p>
                              </div>
                            )}

                            {info.fecha && (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase">Fecha / Horario</p>
                                <p className="text-sm text-gray-700">{info.fecha}</p>
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

               {/* TAB: DOCUMENTOS — IMPL-20260408-01 */}
               <TabsContent value="documentos" className="space-y-6">
                 {/* Documentos del expediente (BD) */}
                 <Card className="shadow-sm">
                   <CardHeader className="bg-gray-50/50 border-b pb-3">
                     <div className="flex items-center justify-between">
                       <CardTitle className="text-base font-semibold text-gray-700 flex items-center gap-2">
                         <Paperclip className="h-5 w-5 text-gray-500" /> Documentos del Expediente
                       </CardTitle>
                       {processDocs.length > 0 && (
                         <Badge variant="secondary">{processDocs.length}</Badge>
                       )}
                     </div>
                   </CardHeader>
                   <CardContent className="pt-4">
                     {processDocs.length === 0 ? (
                       <p className="text-sm text-gray-400 text-center py-6">No hay documentos adjuntos al expediente en este momento.</p>
                     ) : (
                       <ul className="divide-y divide-gray-100">
                         {processDocs.map((doc) => (
                           <li key={doc.id} className="flex items-center justify-between py-3 gap-3">
                             <div className="flex items-center gap-3 min-w-0">
                               <FileText className="h-5 w-5 shrink-0 text-blue-400" />
                               <div className="min-w-0">
                                 <p className="text-sm font-medium text-gray-900 truncate">{doc.nombreArchivo}</p>
                                 <p className="text-xs text-gray-400">
                                   {doc.tipoDocumento}{doc.tamanio ? ` · ${formatBytes(doc.tamanio)}` : ''}
                                   {doc.uploadedBy ? ` · ${doc.uploadedBy}` : ''}
                                 </p>
                               </div>
                             </div>
                             <a href={doc.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                               <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-blue-600">
                                 <Download className="h-4 w-4" />
                               </Button>
                             </a>
                           </li>
                         ))}
                       </ul>
                     )}
                   </CardContent>
                 </Card>

                 {/* Secciones documentales por fuente — IMPL-20260408-06 */}
                 {docSections.map((section) => (
                   <Card key={section.key} className="shadow-sm">
                     <CardHeader className="bg-gray-50/50 border-b pb-3">
                       <div className="flex items-center justify-between">
                         <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                           {section.icon} {section.label}
                         </CardTitle>
                         {section.items.length > 0 && (
                           <Badge variant="secondary" className="text-xs">{section.items.length}</Badge>
                         )}
                       </div>
                     </CardHeader>
                     <CardContent className="pt-4 space-y-3">
                       {section.notes && (
                         <p className="text-sm text-gray-600 bg-gray-50 rounded-md p-3 border whitespace-pre-wrap">{section.notes}</p>
                       )}
                       {section.items.length > 0 ? (
                         <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                           {section.items.map((ev, idx) =>
                             (ev.kind === 'image' || (ev.kind === 'auto' && isImageUrl(ev.url))) ? (
                               <a key={idx} href={ev.url} target="_blank" rel="noopener noreferrer"
                                 className="group block rounded-md overflow-hidden border bg-gray-50 hover:border-blue-300 transition-colors">
                                 <img
                                   src={ev.url}
                                   alt={ev.label}
                                   className="w-full h-28 object-cover"
                                   onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                 />
                                 <div className="px-2 py-1.5">
                                   <p className="text-xs text-gray-600 truncate group-hover:text-blue-600">{ev.label}</p>
                                 </div>
                               </a>
                             ) : (
                               <a key={idx} href={ev.url} target="_blank" rel="noopener noreferrer"
                                 className="flex items-start gap-2 p-3 rounded-md border bg-gray-50 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                                 <Paperclip className="h-4 w-4 shrink-0 text-gray-400 mt-0.5" />
                                 <p className="text-xs text-gray-700 truncate">{ev.label}</p>
                               </a>
                             )
                           )}
                         </div>
                       ) : (
                         section.notes && <p className="text-xs text-gray-400 italic mt-1">Solo notas en esta sección, sin archivos adjuntos.</p>
                       )}
                     </CardContent>
                   </Card>
                 ))}
                 {docSections.length === 0 && processDocs.length === 0 && (
                   <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
                     <Paperclip className="h-10 w-10 opacity-30" />
                     <p className="text-sm">Aún no hay evidencias ni documentos registrados en este proceso.</p>
                   </div>
                 )}
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

            <Dialog open={visitCaptureOpen} onOpenChange={setVisitCaptureOpen}>
              <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden" aria-describedby="client-visit-capture-desc">
                <DialogHeader>
                  <DialogTitle>Captura del cuestionario de visita</DialogTitle>
                </DialogHeader>
                <p id="client-visit-capture-desc" className="sr-only">Vista de solo lectura con la información capturada en el cuestionario de visita.</p>
                <div className="space-y-3 overflow-auto pr-1">
                  <VisitCapturePanel
                    data={visitCaptureData}
                    portalUrl={surveyorPortalUrl}
                    portalStatus={surveyorPortalStatus}
                  />
                </div>
              </DialogContent>
            </Dialog>

          </div>
        </div>
      </main>
    </div>
  );
}
