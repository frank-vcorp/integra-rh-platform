/**
 * @intervention: IMPL-20260311-06
 * @desc: Dashboard del Cliente — Modelo Híbrido con Semáforo de Módulos (Tarea 1 y 2)
 * @backup: context/SPECs/SPEC-dashboard-cliente.md
 */
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";
import { getCalificacionLabel, getCalificacionTextClass } from "@/lib/dictamen";
import { getServiciosIncluidos } from "@/lib/procesoTipo";

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
              <h1 className="text-3xl font-bold text-gray-900">{clientData.nombreEmpresa}</h1>
              <p className="text-xs text-gray-500">Powered by Sinergia RH</p>
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
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Clave</TableHead>
                      <TableHead>Candidato</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estatus</TableHead>
                      <TableHead>Calificación</TableHead>
                      <TableHead>Observaciones</TableHead>
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
                            <span
                              className={`font-medium ${getCalificacionTextClass(
                                process.calificacionFinal,
                              )}`}
                            >
                              {getCalificacionLabel(process.calificacionFinal)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-gray-600 line-clamp-2">
                              {(process as any)?.comentarioCalificacion || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {new Date(process.fechaRecepcion).toLocaleDateString('es-MX')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link href={`/cliente/proceso/${process.id}`}>
                                  <Button variant="ghost" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent>
                                Ver detalle del proceso y su avance.
                              </TooltipContent>
                            </Tooltip>
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

        {/* Candidatos en Proceso — Modelo Híbrido con Semáforo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              Candidatos en Proceso
            </CardTitle>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span>Avance por módulo en tiempo real:</span>
              <span className="flex items-center gap-1"><span className="text-emerald-600 text-base leading-none">●</span> Completado</span>
              <span className="flex items-center gap-1"><span className="text-amber-500 text-base leading-none">●</span> En progreso</span>
              <span className="flex items-center gap-1"><span className="text-red-600 text-base leading-none">●</span> Requiere atención</span>
              <span className="flex items-center gap-1"><span className="text-gray-300 text-base leading-none">●</span> Pendiente / N/A</span>
            </div>
          </CardHeader>
          <CardContent>
            {candidates.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No hay candidatos registrados</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidato</TableHead>
                      <TableHead>Proceso</TableHead>
                      <TableHead>Estatus</TableHead>
                      <TableHead className="text-center">Laboral</TableHead>
                      <TableHead className="text-center">Visita</TableHead>
                      <TableHead className="text-center">Documental</TableHead>
                      <TableHead>Dictamen</TableHead>
                      <TableHead className="text-right">Ver</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidates.map((candidate) => {
                      const candidateProcesses = processes
                        .filter((p) => p.candidatoId === candidate.id)
                        .sort((a, b) => new Date(b.fechaRecepcion).getTime() - new Date(a.fechaRecepcion).getTime());
                      const proc = candidateProcesses[0];

                      const servicios = getServiciosIncluidos(proc?.tipoProducto, {
                        visitStatus: proc?.visitStatus,
                        visitaDetalle: proc?.visitaDetalle,
                      });

                      return (
                        <TableRow key={candidate.id}>
                          <TableCell>
                            <div>
                              <p className="font-semibold text-gray-900">{candidate.nombreCompleto}</p>
                              {proc && (
                                <p className="text-xs text-gray-400">{proc.tipoProducto}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {proc ? (
                              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                {proc.clave}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">Sin proceso</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {proc ? (
                              <Badge className={
                                proc.estatusProceso === 'finalizado' || proc.estatusProceso === 'entregado'
                                  ? 'bg-green-100 text-green-800 hover:bg-green-100'
                                  : proc.estatusProceso === 'en_recepcion'
                                  ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
                                  : proc.estatusProceso === 'en_dictamen'
                                  ? 'bg-purple-100 text-purple-800 hover:bg-purple-100'
                                  : 'bg-blue-100 text-blue-800 hover:bg-blue-100'
                              }>
                                {proc.estatusProceso.replace(/_/g, ' ')}
                              </Badge>
                            ) : '—'}
                          </TableCell>

                          {/* Semáforo Laboral */}
                          <TableCell className="text-center">
                            {servicios.laboral ? (
                              <SemaforoBadge
                                color={getSemaforoLaboral(proc?.investigacionLaboral)}
                                label="Laboral"
                                tooltipVerde="Investigación laboral completada"
                                tooltipAmarillo="Investigación laboral en progreso"
                                tooltipGris="Pendiente de iniciar"
                              />
                            ) : (
                              <span className="text-xs text-gray-300">N/A</span>
                            )}
                          </TableCell>

                          {/* Semáforo Visita */}
                          <TableCell className="text-center">
                            {servicios.visita ? (
                              <SemaforoBadge
                                color={getSemaforoVisita(proc?.visitStatus)}
                                label="Visita"
                                tooltipVerde="Visita domiciliaria realizada"
                                tooltipAmarillo="Visita programada / asignada"
                                tooltipGris="Visita pendiente"
                              />
                            ) : (
                              <span className="text-xs text-gray-300">N/A</span>
                            )}
                          </TableCell>

                          {/* Semáforo Documental */}
                          <TableCell className="text-center">
                            {servicios.legal ? (
                              <SemaforoBadge
                                color={getSemaforoDocumental(proc?.investigacionLegal)}
                                label="Documental"
                                tooltipVerde="Antecedentes legales verificados"
                                tooltipAmarillo="En revisión documental"
                                tooltipGris="Pendiente"
                                tooltipRojo="Requiere atención — posible riesgo"
                              />
                            ) : (
                              <span className="text-xs text-gray-300">N/A</span>
                            )}
                          </TableCell>

                          <TableCell>
                            {proc ? (
                              <span className={`text-sm font-medium ${getCalificacionTextClass(proc.calificacionFinal)}`}>
                                {getCalificacionLabel(proc.calificacionFinal)}
                              </span>
                            ) : '—'}
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Link href={`/cliente/candidato/${candidate.id}`}>
                                    <Button variant="ghost" size="sm">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                </TooltipTrigger>
                                <TooltipContent>Ver expediente</TooltipContent>
                              </Tooltip>
                              {proc && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Link href={`/cliente/proceso/${proc.id}`}>
                                      <Button variant="ghost" size="sm">
                                        <FileText className="h-4 w-4" />
                                      </Button>
                                    </Link>
                                  </TooltipTrigger>
                                  <TooltipContent>Ver proceso</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
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
      </main>
    </div>
  );
}

// ============================================================================
// SEMÁFORO — IMPL-20260311-06: Modelo Híbrido de Avance por Módulo
// ============================================================================

type SemaforoColor = "verde" | "amarillo" | "rojo" | "gris";

function getSemaforoLaboral(inv?: any): SemaforoColor {
  if (!inv) return "gris";
  if (inv.completado) return "verde";
  if (inv.resultado || inv.detalles) return "amarillo";
  return "gris";
}

function getSemaforoVisita(vs?: any): SemaforoColor {
  if (!vs?.status || vs.status === "no_asignada") return "gris";
  if (vs.status === "realizada") return "verde";
  if (vs.status === "programada" || vs.status === "asignada") return "amarillo";
  return "gris";
}

function getSemaforoDocumental(leg?: any): SemaforoColor {
  if (!leg) return "gris";
  if (leg.flagRiesgo) return "rojo";
  if (leg.antecedentes) return "verde";
  return "gris";
}

interface SemaforoBadgeProps {
  color: SemaforoColor;
  label: string;
  tooltipVerde: string;
  tooltipAmarillo: string;
  tooltipGris: string;
  tooltipRojo?: string;
}

function SemaforoBadge({ color, label, tooltipVerde, tooltipAmarillo, tooltipGris, tooltipRojo }: SemaforoBadgeProps) {
  const config: Record<SemaforoColor, { className: string; tooltip: string }> = {
    verde:    { className: "text-emerald-600", tooltip: tooltipVerde },
    amarillo: { className: "text-amber-500",   tooltip: tooltipAmarillo },
    rojo:     { className: "text-red-600",     tooltip: tooltipRojo ?? "Requiere atención" },
    gris:     { className: "text-gray-300",    tooltip: tooltipGris },
  };
  const { className, tooltip } = config[color];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`text-xl leading-none cursor-default select-none ${className}`}
          aria-label={`${label}: ${tooltip}`}
        >
          ●
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-semibold text-xs">{label}</p>
        <p className="text-xs text-gray-300">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// TODO IMPL-20260311-06: WorkHistoryPreview movida a ClienteCandidatoDetalle.
// Esta implementación reducida evita dependencias no utilizadas en este módulo.
function WorkHistoryPreview({ candidatoId: _c }: { candidatoId: number }) {
  // Lógica movida a ClienteCandidatoDetalle para mantener separación de concerns.
  void _c;
  return null as any;
}
