import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Building2, Users, CheckCircle2, Clock, AlertCircle, Zap, TrendingUp, ArrowRight, ChevronRight, CalendarPlus, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

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

  // ============================================================================
  // IMPL-20260312-10: Lógica Local Diaria — Centro de Mando Operativo
  // ============================================================================
  const today = new Date();
  const todayStr = today.toDateString();

  // Procesos ingresados hoy (por fechaRecepcion)
  const procesosIngresadosHoy = processes.filter(
    (p) => new Date(p.fechaRecepcion).toDateString() === todayStr
  );

  // KPIs operativos
  const stats = {
    totalClients: clients.length,
    // Activos = en flujo de trabajo (excl. recepción y finalizados)
    procesosActivos: processes.filter(
      (p) => !["en_recepcion", "finalizado", "entregado"].includes(p.estatusProceso)
    ).length,
    procesosCompletados: processes.filter(
      (p) => p.estatusProceso === "finalizado" || p.estatusProceso === "entregado"
    ).length,
    procesosPendientes: processes.filter(
      (p) => p.estatusProceso === "en_recepcion"
    ).length,
    procesosIngresadosHoy: procesosIngresadosHoy.length,
  };

  // Candidatos recientes (últimos 5, en reversa)
  // TODO: Filtrar por createdAt === hoy cuando el volumen diario sea significativo
  const candidatosRecientes = [...candidates].reverse().slice(0, 5);

  // Procesos atascados en recepción (los más recientes primero)
  const procesosAtascados = processes
    .filter((p) => p.estatusProceso === "en_recepcion")
    .slice(-5)
    .reverse();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Bienvenido, {user?.name || user?.email}
        </p>
      </div>

      {/* Acciones Rápidas - IMPL-20260312-05 */}
      {isAdmin && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Acciones Rápidas</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Link href="/flujo-completo" className="block">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:shadow-lg transition-all cursor-pointer hover:-translate-y-1">
                <CardContent className="pt-6">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Flujo Completo</h3>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="secondary">Cliente</Badge>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      <Badge variant="secondary">Candidato</Badge>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      <Badge variant="secondary">Puesto</Badge>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      <Badge variant="secondary">Proceso</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Ideal para iniciar operaciones con un cliente nuevo
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/flujo-candidato" className="block">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:shadow-lg transition-all cursor-pointer hover:-translate-y-1">
                <CardContent className="pt-6">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Flujo Rápido</h3>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="secondary">Candidato</Badge>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      <Badge variant="secondary">Puesto</Badge>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      <Badge variant="secondary">Proceso</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Para asignar candidatos a clientes existentes
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      )}

      {/* KPIs Operativos — IMPL-20260312-10 */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Métricas del Día</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* KPI 1: Procesos Activos */}
          <Link href="/procesos">
            <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer border-blue-200 hover:border-blue-400">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Procesos Activos</CardTitle>
                <Clock className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.procesosActivos}</div>
                <p className="text-xs text-muted-foreground mt-1">En flujo de trabajo</p>
              </CardContent>
            </Card>
          </Link>

          {/* KPI 2: Procesos Completados */}
          <Link href="/procesos">
            <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer border-green-200 hover:border-green-400">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Procesos Completados</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.procesosCompletados}</div>
                <p className="text-xs text-muted-foreground mt-1">Finalizados / Entregados</p>
              </CardContent>
            </Card>
          </Link>

          {/* KPI 3: Pendientes en Recepción */}
          <Link href="/procesos">
            <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer border-amber-200 hover:border-amber-400">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{stats.procesosPendientes}</div>
                <p className="text-xs text-muted-foreground mt-1">En recepción sin asignar</p>
              </CardContent>
            </Card>
          </Link>

          {/* KPI 4: Ingresados Hoy */}
          <Link href="/procesos">
            <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer border-purple-200 hover:border-purple-400">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresados Hoy</CardTitle>
                <CalendarPlus className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{stats.procesosIngresadosHoy}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {today.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short" })}
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>



      {/* Tabla de Monitoreo Rápido — IMPL-20260312-10 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Columna 1: Candidatos Recientes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Candidatos Recientes
            </CardTitle>
            <Link href="/candidatos" className="text-xs text-primary hover:underline">
              Ver todos
            </Link>
          </CardHeader>
          <CardContent>
            {candidatosRecientes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sin candidatos registrados</p>
            ) : (
              <div className="space-y-2">
                {candidatosRecientes.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-accent transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{c.nombreCompleto}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <Badge
                        variant={c.selfFilledStatus === "revisado" ? "default" : c.selfFilledStatus === "recibido" ? "secondary" : "outline"}
                        className="text-xs capitalize"
                      >
                        {c.selfFilledStatus ?? "pendiente"}
                      </Badge>
                      <Link href={`/candidatos/${c.id}`}>
                        <ChevronRight className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors cursor-pointer" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Columna 2: Procesos Atascados en Recepción */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Procesos Atascados
            </CardTitle>
            <Link href="/procesos" className="text-xs text-primary hover:underline">
              Ver todos
            </Link>
          </CardHeader>
          <CardContent>
            {procesosAtascados.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No hay procesos en recepción</p>
            ) : (
              <div className="space-y-2">
                {procesosAtascados.map((p) => (
                  <Link
                    key={p.id}
                    href={`/procesos/${p.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-amber-100 hover:bg-amber-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{p.clave}</p>
                      <p className="text-xs text-muted-foreground">
                        Recibido: {new Date(p.fechaRecepcion).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                        En Recepción
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
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
