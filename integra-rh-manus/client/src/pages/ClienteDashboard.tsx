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
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { ESTATUS_INVESTIGACION_LABELS, EstatusInvestigacionType } from "@/lib/constants";
import { calcularTiempoTrabajado, formatearFecha } from "@/lib/dateUtils";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { Link, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { getCalificacionLabel, getCalificacionTextClass } from "@/lib/dictamen";
import { getServiciosIncluidos } from "@/lib/procesoTipo";

/**
 * Dashboard para clientes empresariales
 * Muestra solo los procesos y candidatos del cliente autenticado
 */
export default function ClienteDashboard() {
  const [, setLocation] = useLocation();
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
  const processesActive = processes.filter((p: any) => 
    p.estatusProceso !== 'finalizado' && p.estatusProceso !== 'entregado'
  ).length;
  const processesCompleted = processes.filter((p: any) => 
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
      {/* Header — responsive: IMPL-20260320-08 */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <img
              src="/sinergia-rh-logo-2026.png"
              alt="Sinergia RH"
              className="h-10 w-auto flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wider text-gray-500 hidden sm:block">Portal empresarial</p>
              <h1 className="text-base sm:text-2xl md:text-3xl font-bold text-gray-900 truncate leading-tight">
                {clientData.nombreEmpresa}
              </h1>
              <p className="text-xs text-gray-500 hidden sm:block">Powered by Sinergia RH</p>
            </div>
            <div className="flex items-center gap-2 md:gap-6 ml-auto flex-shrink-0">
              <div className="hidden md:block text-right">
                <p className="text-xs text-gray-500">Soportado por</p>
                <div className="flex items-center gap-2 text-cyan-700 font-semibold">
                  <ShieldCheck className="h-4 w-4" />
                  Sinergia RH
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="border-cyan-200 text-cyan-800 hover:bg-cyan-50 whitespace-nowrap"
              >
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Bienvenida */}
        <div className="bg-gradient-to-r from-sky-700 to-cyan-600 rounded-lg p-6 text-white shadow-sm">
          <h2 className="text-2xl font-bold mb-2">Bienvenido a SINERGIA RH</h2>
          <p className="text-sky-100">
            Aquí puedes consultar el estatus de tus procesos de evaluación y candidatos en tiempo real.
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              <>
                {/* DESKTOP: tabla — IMPL-20260320-08 */}
                <div className="hidden md:block overflow-x-auto">
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
                      {processes.slice(0, 10).map((process: any) => {
                        const candidate = candidates.find((c: any) => c.id === process.candidatoId);
                        return (
                          <TableRow
                            key={process.id}
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => {
                              if (process.candidatoId) {
                                setLocation(`/cliente/candidato/${process.candidatoId}?tab=empleos`);
                              }
                            }}
                          >
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
                                  <Link href={`/cliente/candidato/${process.candidatoId}`}>
                                    <Button variant="ghost" size="sm">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Ver expediente completo
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* MÓVIL: lista de cards por proceso — IMPL-20260320-08 */}
                <div className="block md:hidden space-y-3">
                  {processes.slice(0, 10).map((process: any) => {
                    const candidate = candidates.find((c: any) => c.id === process.candidatoId);
                    return (
                      <div
                        key={process.id}
                        className="border rounded-lg p-4 bg-white shadow-sm space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-gray-900 text-sm">{process.clave}</span>
                          <span className={`text-xs px-2 py-1 rounded font-medium shrink-0 ${
                            process.estatusProceso === 'finalizado' || process.estatusProceso === 'entregado'
                              ? 'bg-green-100 text-green-800'
                              : process.estatusProceso === 'en_recepcion'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {process.estatusProceso.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-gray-800">
                          {candidate?.nombreCompleto || 'N/A'}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {process.tipoProducto}
                          </span>
                          <span className={`text-xs font-medium ${getCalificacionTextClass(process.calificacionFinal)}`}>
                            {getCalificacionLabel(process.calificacionFinal)}
                          </span>
                        </div>
                        {(process as any)?.comentarioCalificacion && (
                          <p className="text-xs text-gray-500 line-clamp-2">
                            {(process as any).comentarioCalificacion}
                          </p>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <span className="text-xs text-gray-400">
                            {new Date(process.fechaRecepcion).toLocaleDateString('es-MX')}
                          </span>
                          {process.candidatoId && (
                            <Link href={`/cliente/candidato/${process.candidatoId}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-cyan-200 text-cyan-800 hover:bg-cyan-50 text-xs h-8"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Ver expediente
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

