/**
 * ClienteCandidatoDetalle.tsx
 * Vista Drill-Down de candidato para el cliente final.
 * SOLO LECTURA — sin inputs ni botones de guardado.
 *
 * @module pages/cliente
 * @id IMPL-20260311-07
 * @spec context/SPECs/SPEC-dashboard-cliente.md
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { calcularTiempoTrabajado, formatearFecha } from "@/lib/dateUtils";
import { getCalificacionLabel } from "@/lib/dictamen";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Home,
  Landmark,
  Layers,
  Loader2,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  User,
} from "lucide-react";
import { Link, useParams } from "wouter";

// ─── Helpers visuales ────────────────────────────────────────────────────────

const formatDate = (value?: string | null) =>
  value ? formatearFecha(value) : "—";

function CalificacionBadge({ value }: { value?: string | null }) {
  const label = getCalificacionLabel(value);
  if (!value || value === "pendiente") {
    return (
      <Badge variant="secondary" className="gap-1 text-xs">
        <Clock className="h-3 w-3" />
        {label}
      </Badge>
    );
  }
  if (value === "recomendable") {
    return (
      <Badge className="gap-1 bg-emerald-600 text-white text-xs hover:bg-emerald-700">
        <CheckCircle2 className="h-3 w-3" />
        {label}
      </Badge>
    );
  }
  if (value === "recomendable_con_observacion") {
    return (
      <Badge className="gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs">
        <CheckCircle2 className="h-3 w-3" />
        {label}
      </Badge>
    );
  }
  if (value === "con_reservas" || value === "con_reservas_con_observacion") {
    return (
      <Badge className="gap-1 bg-amber-100 text-amber-800 border border-amber-300 text-xs">
        <AlertCircle className="h-3 w-3" />
        {label}
      </Badge>
    );
  }
  if (value === "no_recomendable") {
    return (
      <Badge variant="destructive" className="gap-1 text-xs">
        <AlertCircle className="h-3 w-3" />
        {label}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs">
      {label}
    </Badge>
  );
}

function InvestigacionBadge({ estatus }: { estatus?: string | null }) {
  if (estatus === "terminado") {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Verificado
      </Badge>
    );
  }
  if (estatus === "revisado") {
    return (
      <Badge className="bg-blue-100 text-blue-800 border border-blue-200 text-xs gap-1">
        <Clock className="h-3 w-3" />
        En revisión
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-xs gap-1">
      <Clock className="h-3 w-3" />
      Pendiente
    </Badge>
  );
}

function RatingChip({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  const colorMap: Record<string, string> = {
    EXCELENTE: "bg-emerald-100 text-emerald-800",
    BUENO: "bg-blue-100 text-blue-800",
    REGULAR: "bg-amber-100 text-amber-800",
    MALO: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${colorMap[value] ?? "bg-gray-100 text-gray-700"}`}
    >
      {label}: {value}
    </span>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

/**
 * Vista de detalle de candidato para clientes (solo lectura).
 * Expone: calificación final, dictamen IA, buró, visita, historial laboral.
 * Oculta: comentarios internos del analista (comentarioInvestigacion, notaInternaAnalista).
 */
export default function ClienteCandidatoDetalle() {
  const params = useParams();
  const candidatoId = parseInt(params.id || "0");
  const { clientId } = useClientAuth();

  const { data: candidate, isLoading: candidateLoading } =
    trpc.candidates.getById.useQuery({ id: candidatoId });

  const { data: candidateProcesses = [] } =
    trpc.processes.getByCandidate.useQuery({ candidatoId });

  const { data: workHistory = [], isLoading: workHistoryLoading } =
    trpc.workHistory.getByCandidate.useQuery({ candidatoId });

  // ── Estados de carga ────────────────────────────────────────────────────────
  if (candidateLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  // ── Verificación de acceso ──────────────────────────────────────────────────
  if (!candidate || candidate.clienteId !== clientId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto" />
          <p className="text-gray-600">No tienes permiso para ver este candidato.</p>
          <Link href="/cliente/dashboard">
            <Button variant="outline">Volver al Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Datos derivados ─────────────────────────────────────────────────────────

  // Proceso más relevante: último por fecha de recepción
  const mainProcess = candidateProcesses.length > 0 ? candidateProcesses[0] : null;

  // Calificación general: del proceso principal
  const calificacionGeneral = mainProcess?.calificacionFinal ?? "pendiente";
  const esApto =
    calificacionGeneral === "recomendable" ||
    calificacionGeneral === "recomendable_con_observacion";

  // Dictamen IA para cliente (del proceso principal, campo investigacionLaboral)
  const iaDictamenCliente: any =
    (mainProcess as any)?.investigacionLaboral?.iaDictamenCliente ?? null;
  const resumenIA: string | null =
    typeof iaDictamenCliente?.resumenEjecutivoCliente === "string"
      ? iaDictamenCliente.resumenEjecutivoCliente
      : null;
  const recomendacionesIA: string[] = Array.isArray(
    iaDictamenCliente?.recomendacionesCliente,
  )
    ? iaDictamenCliente.recomendacionesCliente
    : [];

  // URL de PDF del Buró (si aplica)
  const buroPdfUrl: string | null =
    (mainProcess as any)?.buroCredito?.pdfUrl ?? null;

  // Contar empresas verificadas (historial terminado)
  const empresasVerificadas = workHistory.filter(
    (w: any) => w.estatusInvestigacion === "terminado",
  ).length;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/cliente/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Volver al Dashboard
            </Button>
          </Link>

          {/* Acción PDF: solo si el candidato es apto o hay PDF disponible */}
          {(esApto || buroPdfUrl) && (
            <a
              href={buroPdfUrl ?? `/cliente/proceso/${mainProcess?.id}`}
              target={buroPdfUrl ? "_blank" : undefined}
              rel={buroPdfUrl ? "noopener noreferrer" : undefined}
            >
              <Button size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Descargar Dictamen (PDF)
              </Button>
            </a>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6 max-w-5xl">
        {/* ── Hero: nombre y calificación ──────────────────────────────────── */}
        <section className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-gray-900">
                {candidate.nombreCompleto}
              </h1>
              <CalificacionBadge value={calificacionGeneral} />
            </div>
            <p className="text-gray-500 mt-1 text-sm">
              Informe de Investigación — Generado para su revisión
            </p>
          </div>

          {/* KPIs compactos */}
          <div className="flex gap-3 flex-wrap">
            <div className="bg-white border rounded-lg px-4 py-3 text-center min-w-[90px]">
              <p className="text-2xl font-bold text-gray-900">
                {candidateProcesses.length}
              </p>
              <p className="text-xs text-gray-500">
                {candidateProcesses.length === 1 ? "Proceso" : "Procesos"}
              </p>
            </div>
            <div className="bg-white border rounded-lg px-4 py-3 text-center min-w-[90px]">
              <p className="text-2xl font-bold text-emerald-600">
                {empresasVerificadas}
              </p>
              <p className="text-xs text-gray-500">
                {empresasVerificadas === 1 ? "Empresa verificada" : "Emp. verificadas"}
              </p>
            </div>
            <div className="bg-white border rounded-lg px-4 py-3 text-center min-w-[90px]">
              <p className="text-2xl font-bold text-blue-600">
                {workHistory.length}
              </p>
              <p className="text-xs text-gray-500">
                {workHistory.length === 1 ? "Empleo" : "Empleos"}
              </p>
            </div>
          </div>
        </section>

        <Separator />

        {/* ── Resumen Ejecutivo IA ────────────────────────────────────────── */}
        {resumenIA && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-blue-800">
                <Sparkles className="h-4 w-4 text-blue-600" />
                Resumen Ejecutivo
              </CardTitle>
              <CardDescription className="text-blue-700/70 text-xs">
                Síntesis del perfil del candidato basada en la investigación
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-700 leading-relaxed">{resumenIA}</p>

              {recomendacionesIA.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                    Puntos a considerar
                  </p>
                  <ul className="space-y-1.5">
                    {recomendacionesIA.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <Star className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Resultados de Investigaciones ────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-slate-600" />
              Resultados de Investigación
            </CardTitle>
            <CardDescription>
              Estado de cada módulo del proceso contratado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {candidateProcesses.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                Sin procesos asociados
              </p>
            ) : (
              <div className="space-y-5">
                {candidateProcesses.map((process: any) => {
                  const buro = process.buroCredito || null;
                  const visita =
                    process.visitaDetalle || process.visitStatus || null;
                  const legal = process.investigacionLegal || null;
                  const invLab = process.investigacionLaboral || null;

                  return (
                    <div
                      key={process.id}
                      className="border rounded-xl p-4 space-y-4 bg-white"
                    >
                      {/* Cabecera del proceso */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900">
                              {process.clave}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {process.tipoProducto}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Recepción:{" "}
                            {formatDate(process.fechaRecepcion)}
                          </p>
                        </div>
                        <CalificacionBadge value={process.calificacionFinal} />
                      </div>

                      {/* Módulos de investigación */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Investigación Laboral */}
                        {invLab && (
                          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border">
                            <Briefcase className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-gray-700">
                                Investigación Laboral
                              </p>
                              <p className="text-sm text-gray-600 mt-0.5">
                                {invLab.resultado || "En proceso"}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Buró de Crédito */}
                        {buro && (
                          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
                            <FileText className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-gray-700">
                                Buró de Crédito
                              </p>
                              {buro.score && (
                                <p className="text-sm font-medium text-gray-800">
                                  Score:{" "}
                                  <span className="text-amber-700">{buro.score}</span>
                                </p>
                              )}
                              {buro.estatus && (
                                <p className="text-xs text-gray-600">
                                  {buro.estatus}
                                </p>
                              )}
                              {typeof buro.aprobado === "boolean" && (
                                <Badge
                                  className={
                                    buro.aprobado
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs"
                                      : "bg-red-100 text-red-800 border border-red-200 text-xs"
                                  }
                                >
                                  {buro.aprobado ? "Aprobado" : "No aprobado"}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Investigación Legal */}
                        {legal && (
                          <div className="flex items-start gap-3 p-3 rounded-lg bg-indigo-50 border border-indigo-100">
                            <Landmark className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-gray-700">
                                Investigación Legal
                              </p>
                              {legal.antecedentes && (
                                <p className="text-sm text-gray-600">
                                  {legal.antecedentes}
                                </p>
                              )}
                              {typeof legal.flagRiesgo === "boolean" && (
                                <Badge
                                  className={
                                    !legal.flagRiesgo
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs"
                                      : "bg-red-100 text-red-800 border border-red-200 text-xs"
                                  }
                                >
                                  {legal.flagRiesgo
                                    ? "Con riesgo"
                                    : "Sin antecedentes"}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Visita Domiciliaria/Virtual */}
                        {visita && (
                          <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                            <Home className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-gray-700">
                                Visita{" "}
                                {visita.tipo ? `(${visita.tipo})` : ""}
                              </p>
                              {(visita.fechaRealizacion ||
                                visita.scheduledDateTime) && (
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(
                                    visita.fechaRealizacion ||
                                      visita.scheduledDateTime,
                                  )}
                                </p>
                              )}
                              {visita.status && (
                                <Badge
                                  className={
                                    visita.status === "realizada"
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs"
                                      : "bg-yellow-100 text-yellow-800 border border-yellow-200 text-xs"
                                  }
                                >
                                  {visita.status}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Enlace a detalle del proceso */}
                      <div className="flex justify-end pt-1">
                        <Link href={`/cliente/proceso/${process.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            Ver detalle completo del proceso →
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Historial Laboral Verificado ──────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4 text-slate-600" />
              Historial Laboral Verificado
            </CardTitle>
            <CardDescription>
              Empleos registrados e investigados por el analista
            </CardDescription>
          </CardHeader>
          <CardContent>
            {workHistoryLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              </div>
            ) : workHistory.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Sin registros de historial laboral</p>
              </div>
            ) : (
              <div className="space-y-4">
                {workHistory.map((item: any) => {
                  const det: any = item.investigacionDetalle || {};
                  const periodo = det.periodo || {};
                  const desempeno = det.desempeno || {};
                  const semanasCotizadas: string | null =
                    periodo.semanasCotizadas || null;
                  const disposicion: string | null =
                    periodo.disposicionSemanasCotizadas || null;

                  // Solo mostrar evaluaciones de desempeño si está terminado
                  const mostrarDesempeno =
                    item.estatusInvestigacion === "terminado";

                  return (
                    <div
                      key={item.id}
                      className="border rounded-xl p-4 space-y-3 bg-white"
                    >
                      {/* Cabecera empresa */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-gray-900">
                              {item.empresa}
                            </h4>
                            <InvestigacionBadge
                              estatus={item.estatusInvestigacion}
                            />
                          </div>
                          <p className="text-sm text-gray-500">
                            {item.puesto || "Puesto no especificado"}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(item.fechaInicio)} —{" "}
                            {item.fechaFin
                              ? formatDate(item.fechaFin)
                              : "Actual"}
                            {(item.tiempoTrabajado ||
                              calcularTiempoTrabajado(
                                item.fechaInicio,
                                item.fechaFin,
                              )) && (
                              <span className="ml-1 text-gray-500">
                                (
                                {item.tiempoTrabajado ||
                                  calcularTiempoTrabajado(
                                    item.fechaInicio,
                                    item.fechaFin,
                                  )}
                                )
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Score de desempeño */}
                        {typeof item.desempenoScore === "number" &&
                          item.desempenoScore > 0 && (
                            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 shrink-0">
                              <TrendingUp className="h-4 w-4 text-blue-500" />
                              <div>
                                <p className="text-xs text-gray-500">Desempeño</p>
                                <p className="text-lg font-bold text-blue-700 leading-none">
                                  {item.desempenoScore}
                                  <span className="text-xs font-normal text-gray-400">
                                    /100
                                  </span>
                                </p>
                              </div>
                            </div>
                          )}
                      </div>

                      {/* Semanas Cotizadas */}
                      {semanasCotizadas && (
                        <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                          <Shield className="h-4 w-4 text-slate-500 shrink-0" />
                          <span>
                            <span className="font-medium">
                              Semanas cotizadas:
                            </span>{" "}
                            {semanasCotizadas}
                            {disposicion && (
                              <span className="text-gray-500 ml-1">
                                ({disposicion})
                              </span>
                            )}
                          </span>
                        </div>
                      )}

                      {/* Causal de salida */}
                      {item.causalSalidaRH && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium text-gray-700">
                            Motivo de separación:{" "}
                          </span>
                          {item.causalSalidaRH}
                        </div>
                      )}

                      {/* Evaluaciones de desempeño (solo si terminado) */}
                      {mostrarDesempeno && desempeno.evaluacionGeneral && (
                        <div className="pt-1">
                          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">
                            Evaluación de desempeño
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            <RatingChip
                              label="General"
                              value={desempeno.evaluacionGeneral}
                            />
                            <RatingChip
                              label="Puntualidad"
                              value={desempeno.puntualidad}
                            />
                            <RatingChip
                              label="Colaboración"
                              value={desempeno.colaboracion}
                            />
                            <RatingChip
                              label="Responsabilidad"
                              value={desempeno.responsabilidad}
                            />
                            <RatingChip
                              label="Calidad"
                              value={desempeno.calidadTrabajo}
                            />
                            {desempeno.honradezIntegridad && (
                              <RatingChip
                                label="Honradez"
                                value={desempeno.honradezIntegridad}
                              />
                            )}
                          </div>
                        </div>
                      )}

                      {/* Resultado de verificación público (si terminado) */}
                      {item.estatusInvestigacion === "terminado" &&
                        item.resultadoVerificacion &&
                        item.resultadoVerificacion !== "pendiente" && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Resultado:
                            </span>
                            <Badge
                              className={
                                item.resultadoVerificacion === "positivo"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs"
                                  : item.resultadoVerificacion === "negativo"
                                    ? "bg-red-100 text-red-800 border border-red-200 text-xs"
                                    : "bg-amber-100 text-amber-800 border border-amber-200 text-xs"
                              }
                            >
                              {item.resultadoVerificacion
                                .charAt(0)
                                .toUpperCase() +
                                item.resultadoVerificacion.slice(1)}
                            </Badge>
                          </div>
                        )}

                      {/*
                       * CAMPOS INTERNOS OMITIDOS INTENCIONALMENTE:
                       * - comentarioInvestigacion (nota privada del analista)
                       * - observaciones (uso interno)
                       * - iaDictamen.notaInternaAnalista
                       * - incidencias detalladas (dato operativo interno)
                       */}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Información General del Perfil ────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-slate-600" />
              Perfil del Candidato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                  Nombre
                </p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  {candidate.nombreCompleto}
                </p>
              </div>
              {candidate.medioDeRecepcion && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                    Canal de ingreso
                  </p>
                  <p className="text-sm text-gray-700 mt-0.5">
                    {candidate.medioDeRecepcion}
                  </p>
                </div>
              )}
              {/*
               * CAMPOS OMITIDOS:
               * - email y teléfono (datos personales sensibles, no relevantes para el cliente)
               */}
            </div>
          </CardContent>
        </Card>

        {/* ── Acción PDF al pie (por si el header no es visible) ───────────── */}
        {(esApto || buroPdfUrl) && (
          <div className="flex justify-center pb-4">
            <a
              href={buroPdfUrl ?? `/cliente/proceso/${mainProcess?.id}`}
              target={buroPdfUrl ? "_blank" : undefined}
              rel={buroPdfUrl ? "noopener noreferrer" : undefined}
            >
              <Button className="gap-2">
                <Download className="h-4 w-4" />
                Descargar Dictamen (PDF)
              </Button>
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
