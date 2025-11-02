import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Building2, Users, FileText, CheckCircle2, Clock, AlertCircle, Zap } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isClient = user?.role === "client";

  // Cargar datos
  const { data: clients = [] } = trpc.clients.list.useQuery(undefined, { enabled: isAdmin });
  const { data: allCandidates = [] } = trpc.candidates.list.useQuery();
  const { data: allProcesses = [] } = trpc.processes.list.useQuery();

  // Filtrar datos según rol
  const candidates = isClient 
    ? allCandidates.filter(c => c.clienteId === user?.clientId)
    : allCandidates;
  const processes = isClient
    ? allProcesses.filter(p => p.clienteId === user?.clientId)
    : allProcesses;

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

      {/* Quick Actions - Solo para admin */}
      {isAdmin && (
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Flujo Completo
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Cliente → Candidato → Puesto → Proceso
                </p>
              </div>
              <Link href="/flujo-completo">
                <Button size="lg" className="w-full">
                  Iniciar Flujo Completo
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Flujo Rápido
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Candidato → Puesto → Proceso
                </p>
              </div>
              <Link href="/flujo-candidato">
                <Button size="lg" className="w-full">
                  Iniciar Flujo Rápido
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      )}

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
