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
import { trpc } from "@/lib/trpc";
import { Building2, Users, FileText, Eye, LogOut } from "lucide-react";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";

/**
 * Dashboard para clientes empresariales
 * Muestra solo los procesos y candidatos del cliente autenticado
 */
export default function ClienteDashboard() {
  const { clientId, clientData, isLoading: authLoading, logout } = useClientAuth();

  const { data: allProcesses = [], isLoading: processesLoading } = trpc.processes.list.useQuery();
  const { data: allCandidates = [], isLoading: candidatesLoading } = trpc.candidates.list.useQuery();

  // Filtrar solo los datos del cliente
  const processes = allProcesses.filter(p => p.clienteId === clientId);
  const candidates = allCandidates.filter(c => c.clienteId === clientId);

  // Calcular estadísticas
  const processesActive = processes.filter(p => 
    p.estatusProceso !== 'finalizado' && p.estatusProceso !== 'entregado'
  ).length;
  const processesCompleted = processes.filter(p => 
    p.estatusProceso === 'finalizado' || p.estatusProceso === 'entregado'
  ).length;
  const processesPending = processes.filter(p => 
    p.estatusProceso === 'en_recepcion'
  ).length;

  if (authLoading || processesLoading || candidatesLoading) {
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
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{clientData.nombreEmpresa}</h1>
              <p className="text-sm text-gray-600">Portal de Cliente</p>
            </div>
          </div>
          <Button variant="outline" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesión
          </Button>
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
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Procesos</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidates.slice(0, 10).map((candidate) => {
                      const candidateProcesses = processes.filter(p => p.candidatoId === candidate.id);
                      return (
                        <TableRow key={candidate.id}>
                          <TableCell className="font-medium">{candidate.nombreCompleto}</TableCell>
                          <TableCell>{candidate.email || 'N/A'}</TableCell>
                          <TableCell>{candidate.telefono || 'N/A'}</TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600">
                              {candidateProcesses.length} {candidateProcesses.length === 1 ? 'proceso' : 'procesos'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/cliente/candidato/${candidate.id}`}>
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
      </main>
    </div>
  );
}
