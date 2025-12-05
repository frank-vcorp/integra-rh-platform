import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, User, Briefcase, FileText, Layers } from "lucide-react";
import { useParams, Link } from "wouter";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { Loader2 } from "lucide-react";
import { ESTATUS_INVESTIGACION_LABELS, EstatusInvestigacionType } from "@/lib/constants";
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

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString("es-MX") : "-");

/**
 * Vista de detalle de candidato para clientes
 * Solo muestra información si el candidato pertenece al cliente autenticado
 */
export default function ClienteCandidatoDetalle() {
  const params = useParams();
  const candidatoId = parseInt(params.id || "0");
  const { clientId } = useClientAuth();

  const { data: candidate, isLoading: candidateLoading } = trpc.candidates.getById.useQuery({ id: candidatoId });
  const { data: allProcesses = [] } = trpc.processes.list.useQuery();
  const { data: workHistory = [], isLoading: workHistoryLoading } = trpc.workHistory.getByCandidate.useQuery({ candidatoId });
  
  // Filtrar procesos del candidato que pertenecen al cliente
  const candidateProcesses = allProcesses.filter(
    p => p.candidatoId === candidatoId && p.clienteId === clientId
  );

  if (candidateLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  // Verificar que el candidato pertenece al cliente
  if (!candidate || candidate.clienteId !== clientId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No tienes permiso para ver este candidato</p>
          <Link href="/cliente/dashboard">
            <Button>Volver al Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/cliente/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Dashboard
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Título */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Información del Candidato</h1>
          <p className="text-gray-600 mt-1">Detalles y procesos asociados</p>
        </div>

        {/* Información Personal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información Personal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Nombre Completo</p>
                <p className="font-semibold text-lg">{candidate.nombreCompleto}</p>
              </div>
              {candidate.email && (
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold">{candidate.email}</p>
                </div>
              )}
              {candidate.telefono && (
                <div>
                  <p className="text-sm text-gray-600">Teléfono</p>
                  <p className="font-semibold">{candidate.telefono}</p>
                </div>
              )}
              {candidate.medioDeRecepcion && (
                <div>
                  <p className="text-sm text-gray-600">Medio de Recepción</p>
                  <p className="font-semibold">{candidate.medioDeRecepcion}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Procesos Asociados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Procesos de Evaluación
            </CardTitle>
          </CardHeader>
          <CardContent>
            {candidateProcesses.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No hay procesos asociados a este candidato</p>
              </div>
            ) : (
              <div className="space-y-4">
                {candidateProcesses.map((process) => (
                  <div key={process.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{process.clave}</h3>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {process.tipoProducto}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-gray-600">Estatus</p>
                            <p className="font-medium">
                              <span className={`inline-block px-2 py-1 rounded text-xs ${
                                process.estatusProceso === 'finalizado' || process.estatusProceso === 'entregado'
                                  ? 'bg-green-100 text-green-800'
                                  : process.estatusProceso === 'en_recepcion'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {process.estatusProceso.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-gray-600">Calificación</p>
                            <p className={`font-medium ${
                              process.calificacionFinal === 'recomendable'
                                ? 'text-green-600'
                                : process.calificacionFinal === 'no_recomendable'
                                ? 'text-red-600'
                                : process.calificacionFinal === 'con_reservas'
                                ? 'text-yellow-600'
                                : 'text-gray-400'
                            }`}>
                              {process.calificacionFinal === 'pendiente' 
                                ? 'Pendiente' 
                                : process.calificacionFinal?.replace(/_/g, ' ').toUpperCase()}
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-gray-600">Fecha de Recepción</p>
                            <p className="font-medium">
                              {new Date(process.fechaRecepcion).toLocaleDateString('es-MX')}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link href={`/cliente/proceso/${process.id}`}>
                            <Button variant="outline" size="sm">
                              Ver Detalle
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>
                          Abrir el detalle del proceso y su dictamen.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Historial laboral */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Historial Laboral
            </CardTitle>
          </CardHeader>
          <CardContent>
            {workHistoryLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              </div>
            ) : workHistory.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <p>Sin registros de historial laboral</p>
              </div>
            ) : (
              <div className="space-y-4">
                {workHistory.map((item: any) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-lg">{item.empresa}</h4>
                        <p className="text-sm text-gray-600">{item.puesto || "Sin puesto registrado"}</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(item.fechaInicio)} — {item.fechaFin ? formatDate(item.fechaFin) : "Actual"} •{" "}
                          {item.tiempoTrabajado || calcularTiempoTrabajado(item.fechaInicio, item.fechaFin) || "-"}
                        </p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${getInvestigacionClass(item.estatusInvestigacion)}`}>
                        {getInvestigacionLabel(item.estatusInvestigacion)}
                      </span>
                    </div>
                    {item.comentarioInvestigacion && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium text-gray-600">Comentario de verificación:</span>{" "}
                        {item.comentarioInvestigacion}
                      </p>
                    )}
                    {item.observaciones && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium text-gray-600">Observaciones:</span> {item.observaciones}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
