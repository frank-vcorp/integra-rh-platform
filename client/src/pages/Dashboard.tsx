import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Building2, Users, FileText, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // Cargar datos
  const { data: clients = [] } = trpc.clients.list.useQuery();
  const { data: candidates = [] } = trpc.candidates.list.useQuery();
  const { data: processes = [] } = trpc.processes.list.useQuery();

  // Calcular estadísticas
  const stats = {
    totalClients: clients.length,
    totalCandidates: candidates.length,
    totalProcesses: processes.length,
    activeProcesses: processes.filter(p => 
      !["finalizado", "entregado"].includes(p.estatusProceso)
    ).length,
    completedProcesses: processes.filter(p => 
      p.estatusProceso === "finalizado" || p.estatusProceso === "entregado"
    ).length,
    pendingProcesses: processes.filter(p => 
      p.estatusProceso === "en_recepcion"
    ).length,
  };

  // Procesos recientes
  const recentProcesses = processes.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Bienvenido, {user?.name || user?.email}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isAdmin && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClients}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Empresas registradas
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Candidatos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCandidates}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Candidatos en sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Procesos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProcesses}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Procesos de evaluación
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Procesos Activos</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProcesses}</div>
            <p className="text-xs text-muted-foreground mt-1">
              En progreso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Procesos Completados</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedProcesses}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Finalizados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingProcesses}</div>
            <p className="text-xs text-muted-foreground mt-1">
              En recepción
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Processes */}
      <Card>
        <CardHeader>
          <CardTitle>Procesos Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentProcesses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay procesos registrados
            </p>
          ) : (
            <div className="space-y-3">
              {recentProcesses.map((process) => (
                <Link key={process.id} href={`/procesos/${process.id}`}>
                  <a className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{process.clave}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(process.fechaRecepcion).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className={`badge ${getStatusBadgeClass(process.estatusProceso)}`}>
                        {getStatusLabel(process.estatusProceso)}
                      </span>
                    </div>
                  </a>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    en_recepcion: "En Recepción",
    asignado: "Asignado",
    en_verificacion: "En Verificación",
    visita_programada: "Visita Programada",
    visita_realizada: "Visita Realizada",
    en_dictamen: "En Dictamen",
    finalizado: "Finalizado",
    entregado: "Entregado",
  };
  return labels[status] || status;
}

function getStatusBadgeClass(status: string): string {
  const classes: Record<string, string> = {
    en_recepcion: "badge-info",
    asignado: "badge-info",
    en_verificacion: "badge-warning",
    visita_programada: "badge-warning",
    visita_realizada: "badge-warning",
    en_dictamen: "badge-warning",
    finalizado: "badge-success",
    entregado: "badge-success",
  };
  return classes[status] || "badge-neutral";
}
