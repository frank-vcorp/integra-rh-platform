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
    ? allCandidates.filter((c: any) => c.clienteId === user?.clientId)
    : allCandidates;
  const processes = isClient
    ? allProcesses.filter((p: any) => p.clienteId === user?.clientId)
    : allProcesses;

  // ============================================================================
  // IMPL-20260312-10: Lógica Local Diaria — Centro de Mando Operativo
  // ============================================================================
  const today = new Date();
  const todayStr = today.toDateString();

  // Procesos ingresados hoy (por fechaRecepcion)
  const procesosIngresadosHoy = processes.filter(
    (p: any) => new Date(p.fechaRecepcion).toDateString() === todayStr
  );

  // KPIs operativos
  const stats = {
    totalClients: clients.length,
    // Activos = en flujo de trabajo (excl. recepción y finalizados)
    procesosActivos: processes.filter(
      (p: any) => !["en_recepcion", "finalizado", "entregado"].includes(p.estatusProceso)
    ).length,
    procesosCompletados: processes.filter(
      (p: any) => p.estatusProceso === "finalizado" || p.estatusProceso === "entregado"
    ).length,
    procesosPendientes: processes.filter(
      (p: any) => p.estatusProceso === "en_recepcion"
    ).length,
    procesosIngresadosHoy: procesosIngresadosHoy.length,
  };

  // Candidatos recientes (últimos 5, en reversa)
  // TODO: Filtrar por createdAt === hoy cuando el volumen diario sea significativo
  const candidatosRecientes = [...candidates].reverse().slice(0, 5);

  // Procesos atascados en recepción (los más recientes primero)
  const procesosAtascados = processes
    .filter((p: any) => p.estatusProceso === "en_recepcion")
    .slice(-5)
    .reverse();

  return (
    // IMPL-20260312-11: Compactación HUD — sin scroll, todo en 1 pantalla
    // IMPL-20260312-12: space-y responsivo para laptops con escalas 125%-150%
    <div className="space-y-4 xl:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <span className="text-xs text-muted-foreground">Bienvenido, {user?.name || user?.email}</span>
      </div>

      {/* Acciones Rápidas - IMPL-20260312-05 */}
      {isAdmin && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Acciones Rápidas</p>
          <div className="grid gap-2 md:grid-cols-2">
            <Link href="/flujo-completo" className="block">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:shadow-lg transition-all cursor-pointer hover:-translate-y-1">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-1 md:gap-2">
                    <Zap className="h-4 w-4 text-primary shrink-0" />
                    <h3 className="text-sm font-semibold shrink-0">Flujo Completo</h3>
                    <span className="text-[10px] md:text-xs font-medium text-slate-600">Cliente</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] md:text-xs font-medium text-slate-600">Candidato</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] md:text-xs font-medium text-slate-600">Puesto</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] md:text-xs font-medium text-slate-600">Proceso</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Ideal para iniciar operaciones con un cliente nuevo</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/flujo-candidato" className="block">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:shadow-lg transition-all cursor-pointer hover:-translate-y-1">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-1 md:gap-2">
                    <Zap className="h-4 w-4 text-primary shrink-0" />
                    <h3 className="text-sm font-semibold shrink-0">Flujo Rápido</h3>
                    <span className="text-[10px] md:text-xs font-medium text-slate-600">Candidato</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] md:text-xs font-medium text-slate-600">Puesto</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] md:text-xs font-medium text-slate-600">Proceso</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Para asignar candidatos a clientes existentes</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      )}

      {/* KPIs Operativos — IMPL-20260312-10 */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Métricas del Día</p>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          {/* KPI 1: Procesos Activos */}
          <Link href="/procesos">
            <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer border-blue-200 hover:border-blue-400">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
                <CardTitle className="text-sm font-medium">Procesos Activos</CardTitle>
                <Clock className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent className="pb-3 pt-0">
                <div className="text-2xl font-bold text-blue-600">{stats.procesosActivos}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">En flujo de trabajo</p>
              </CardContent>
            </Card>
          </Link>

          {/* KPI 2: Procesos Completados */}
          <Link href="/procesos">
            <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer border-green-200 hover:border-green-400">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
                <CardTitle className="text-sm font-medium">Completados</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent className="pb-3 pt-0">
                <div className="text-2xl font-bold text-green-600">{stats.procesosCompletados}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Finalizados / Entregados</p>
              </CardContent>
            </Card>
          </Link>

          {/* KPI 3: Pendientes en Recepción */}
          <Link href="/procesos">
            <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer border-amber-200 hover:border-amber-400">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
                <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent className="pb-3 pt-0">
                <div className="text-2xl font-bold text-amber-600">{stats.procesosPendientes}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">En recepción sin asignar</p>
              </CardContent>
            </Card>
          </Link>

          {/* KPI 4: Ingresados Hoy */}
          <Link href="/procesos">
            <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer border-purple-200 hover:border-purple-400">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
                <CardTitle className="text-sm font-medium">Ingresados Hoy</CardTitle>
                <CalendarPlus className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent className="pb-3 pt-0">
                <div className="text-2xl font-bold text-purple-600">{stats.procesosIngresadosHoy}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {today.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short" })}
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>



      {/* Tabla de Monitoreo Rápido — IMPL-20260312-10 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">

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
              <p className="text-sm text-muted-foreground text-center py-4">Sin candidatos registrados</p>
            ) : (
              <div>
                {candidatosRecientes.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-1.5 border-b last:border-0 hover:bg-accent/50 transition-colors px-1">
                    <p className="font-medium text-xs truncate flex-1">{c.nombreCompleto}</p>
                    <span className="text-[10px] text-muted-foreground mx-2 shrink-0">
                      {new Date(c.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge
                        variant={c.selfFilledStatus === "revisado" ? "default" : c.selfFilledStatus === "recibido" ? "secondary" : "outline"}
                        className="text-[10px] capitalize py-0 px-1.5"
                      >
                        {c.selfFilledStatus ?? "pendiente"}
                      </Badge>
                      <Link href={`/candidatos/${c.id}`}>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors cursor-pointer" />
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
              <p className="text-sm text-muted-foreground text-center py-4">No hay procesos en recepción</p>
            ) : (
              <div>
                {procesosAtascados.map((p: any) => (
                  <Link
                    key={p.id}
                    href={`/candidatos/${p.candidatoId}?tab=empleos`}
                    className="flex items-center justify-between py-1.5 border-b last:border-0 hover:bg-amber-50/50 transition-colors px-1"
                  >
                    <p className="font-medium text-xs flex-1">{p.clave}</p>
                    <span className="text-[10px] text-muted-foreground mx-2 shrink-0">
                      {new Date(p.fechaRecepcion).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 py-0 px-1.5">
                        Recepción
                      </Badge>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
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
