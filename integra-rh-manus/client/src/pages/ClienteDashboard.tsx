import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Users, FileText, Eye, LogOut, ShieldCheck } from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { ESTATUS_INVESTIGACION_LABELS, EstatusInvestigacionType } from "@/lib/constants";
import { calcularTiempoTrabajado } from "@/lib/dateUtils";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";

/**
 * Dashboard para clientes empresariales
 * Muestra solo los procesos y candidatos del cliente autenticado
 */
export default function ClienteDashboard() {
  const { clientId, clientData, isLoading: authLoading, logout } = useClientAuth();

  const token = typeof window !== "undefined" ? sessionStorage.getItem("clientAccessToken") : null;

  const {
    data: portalData,
    isLoading: portalLoading,
  } = trpc.clientPortal.listDataByToken.useQuery(
    { token: token || "" },
    { enabled: !!token }
  );

  const processes = portalData?.processes ?? [];
  const candidates = portalData?.candidates ?? [];

  // Calcular estadísticas
  const processesActive = processes.filter(p => 
    p.estatusProceso !== 'finalizado' && p.estatusProceso !== 'entregado'
  ).length;
  const processesCompleted = processes.filter(p => 
    p.estatusProceso === 'finalizado' || p.estatusProceso === 'entregado'
  ).length;

  if (authLoading || portalLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!clientId || !clientData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No se pudo cargar la información del cliente</p>
          <Button onClick={() => window.location.href = '/'}>Volver al inicio</Button>
        </div>
      </div>
    );
  }

  const getInvestigacionLabel = (estatus?: string) => {
    if (!estatus) return ESTATUS_INVESTIGACION_LABELS.en_revision;
    return ESTATUS_INVESTIGACION_LABELS[estatus as EstatusInvestigacionType] ?? ESTATUS_INVESTIGACION_LABELS.en_revision;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/sinergia-rh-logo.png"
              alt="Sinergia RH"
              className="h-12 w-auto"
            />
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">Portal empresarial</p>
              <h1 className="text-2xl font-bold text-gray-900">Sinergia RH</h1>
              <p className="text-sm text-gray-600">Bienvenido {clientData.nombreEmpresa}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs text-gray-500">Soportado por</p>
              <div className="flex items-center gap-2 text-indigo-600 font-semibold">
                <ShieldCheck className="h-4 w-4" />
                Integra RH
              </div>
            </div>
            <Button variant="outline" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Bienvenida */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
          <h2 className="text-2xl font-bold mb-2">Bienvenido a INTEGRA-RH</h2>
          <p className="text-blue-100">
            Aquí puedes consultar el estatus de tus procesos de evaluación y candidatos en tiempo real.
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Candidatos
              </CardTitle>
              <Users className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{candidates.length}</div>
              <p className="text-xs text-gray-500 mt-1">En evaluación</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Procesos
              </CardTitle>
              <FileText className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{processes.length}</div>
              <p className="text-xs text-gray-500 mt-1">Procesos iniciados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Procesos Activos
              </CardTitle>
              <FileText className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{processesActive}</div>
              <p className="text-xs text-gray-500 mt-1">En progreso</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Completados
              </CardTitle>
              <FileText className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{processesCompleted}</div>
              <p className="text-xs text-gray-500 mt-1">Finalizados</p>
            </CardContent>
          </Card>
        </div>

        {/* Procesos Recientes */}
        <Card>
          <CardHeader>
            <CardTitle>Mis Procesos</CardTitle>
          </CardHeader>
          <CardContent>
            {processes.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No hay procesos registrados</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Clave</TableHead>
                      <TableHead>Candidato</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estatus</TableHead>
                      <TableHead>Calificación</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processes.slice(0, 10).map((process) => {
                      const candidate = candidates.find(c => c.id === process.candidatoId);
                      return (
                        <TableRow key={process.id}>
                          <TableCell className="font-medium">{process.clave}</TableCell>
                          <TableCell>{candidate?.nombreCompleto || 'N/A'}</TableCell>
                          <TableCell>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {process.tipoProducto}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-1 rounded ${
                              process.estatusProceso === 'finalizado' || process.estatusProceso === 'entregado'
                                ? 'bg-green-100 text-green-800'
                                : process.estatusProceso === 'en_recepcion'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {process.estatusProceso.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </TableCell>
                          <TableCell>
                            {process.calificacionFinal === 'pendiente' ? (
                              <span className="text-gray-400">Pendiente</span>
                            ) : (
                              <span className={`font-medium ${
                                process.calificacionFinal === 'recomendable'
                                  ? 'text-green-600'
                                  : process.calificacionFinal === 'no_recomendable'
                                  ? 'text-red-600'
                                  : 'text-yellow-600'
                              }`}>
                                {process.calificacionFinal?.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(process.fechaRecepcion).toLocaleDateString('es-MX')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/cliente/proceso/${process.id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Candidatos */}
        <Card>
          <CardHeader>
            <CardTitle>Mis Candidatos</CardTitle>
            <p className="text-sm text-gray-500">Revisa el avance de cada investigación y accede al expediente completo.</p>
          </CardHeader>
          <CardContent>
            {candidates.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No hay candidatos registrados</p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full space-y-3">
                {candidates.map((candidate) => {
                  const candidateProcesses = processes
                    .filter((p) => p.candidatoId === candidate.id)
                    .sort((a, b) => new Date(b.fechaRecepcion).getTime() - new Date(a.fechaRecepcion).getTime());
                  const latestProcess = candidateProcesses[0];
                  const laboral = latestProcess?.investigacionLaboral;
                  const legal = latestProcess?.investigacionLegal;
                  const buro = latestProcess?.buroCredito;

                  return (
                    <AccordionItem key={candidate.id} value={`candidate-${candidate.id}`} className="border rounded-lg px-3">
                      <AccordionTrigger className="flex flex-col items-start gap-1 py-4 text-left">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-lg">{candidate.nombreCompleto}</span>
                          {latestProcess && (
                            <Badge className="bg-blue-100 text-blue-800">
                              {latestProcess.estatusProceso.replace(/_/g, " ").toUpperCase()}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 flex flex-wrap gap-3">
                          {laboral && (
                            <span>Investigación laboral: <strong>{laboral?.resultado || getInvestigacionLabel(laboral?.estatus)}</strong></span>
                          )}
                          {legal && (
                            <span>Investigación legal: <strong>{legal?.antecedentes || "Sin antecedentes"}</strong></span>
                          )}
                          {buro && (
                            <span>Buró de crédito: <strong>{buro?.estatus || "Por revisar"}</strong></span>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-semibold">Investigaciones</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm text-gray-600">
                              <div>
                                <p className="font-semibold text-gray-800">Laboral</p>
                                <p>{laboral?.detalles || "En investigación"}</p>
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800">Legal</p>
                                <p>{legal?.antecedentes || "Sin antecedentes reportados"}</p>
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800">Buró de crédito</p>
                                <p>{buro?.estatus || "Pendiente"}</p>
                              </div>
                            </CardContent>
                          </Card>

                          <WorkHistoryPreview candidatoId={candidate.id} />
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <Link href={`/cliente/candidato/${candidate.id}`}>
                            <Button variant="outline" size="sm">
                              Ver expediente completo
                            </Button>
                          </Link>
                          {latestProcess && (
                            <Link href={`/cliente/proceso/${latestProcess.id}`}>
                              <Button variant="ghost" size="sm">
                                Detalle del proceso
                              </Button>
                            </Link>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function WorkHistoryPreview({ candidatoId }: { candidatoId: number }) {
  const { data: workHistory = [], isLoading } = trpc.workHistory.getByCandidate.useQuery({ candidatoId });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  if (workHistory.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Historial laboral</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-500">
          No hay historial registrado aún.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Historial laboral</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {workHistory.slice(0, 3).map((job: any) => (
          <div key={job.id} className="border rounded-md p-3 text-sm text-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{job.empresa}</p>
                <p>{job.puesto || "—"}</p>
                <p className="text-xs text-gray-500">
                  {job.fechaInicio ? new Date(job.fechaInicio).toLocaleDateString("es-MX") : "—"} -{" "}
                  {job.fechaFin ? new Date(job.fechaFin).toLocaleDateString("es-MX") : "Actual"} •{" "}
                  {job.tiempoTrabajado || calcularTiempoTrabajado(job.fechaInicio, job.fechaFin) || "Tiempo no disponible"}
                </p>
              </div>
              <Badge className="bg-indigo-100 text-indigo-800">
                {job.estatusInvestigacion
                  ? ESTATUS_INVESTIGACION_LABELS[job.estatusInvestigacion as EstatusInvestigacionType]
                  : ESTATUS_INVESTIGACION_LABELS.en_revision}
              </Badge>
            </div>
            {job.comentarioInvestigacion && (
              <p className="mt-2 text-xs text-gray-500">
                Comentario: {job.comentarioInvestigacion}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
