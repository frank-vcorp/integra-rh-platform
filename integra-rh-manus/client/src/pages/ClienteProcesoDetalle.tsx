import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, FileText, User, Briefcase, Calendar, Award, Shield, Landmark, Home, UserCheck } from "lucide-react";
import { useParams, Link } from "wouter";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { Loader2 } from "lucide-react";

/**
 * Vista de detalle de proceso para clientes
 * Solo muestra información si el proceso pertenece al cliente autenticado
 */
export default function ClienteProcesoDetalle() {
  const params = useParams();
  const procesoId = parseInt(params.id || "0");
  const { clientId } = useClientAuth();

  const { data: process, isLoading: processLoading } = trpc.processes.getById.useQuery({ id: procesoId });
  const { data: candidate } = trpc.candidates.getById.useQuery(
    { id: process?.candidatoId || 0 },
    { enabled: !!process?.candidatoId }
  );
  // Obtener puesto desde la lista
  const { data: allPosts = [] } = trpc.posts.list.useQuery();
  const post = allPosts.find(p => p.id === process?.puestoId);

  if (processLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  // Verificar que el proceso pertenece al cliente
  if (!process || process.clienteId !== clientId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No tienes permiso para ver este proceso</p>
          <Link href="/cliente/dashboard">
            <Button>Volver al Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const estatusLabels: Record<string, string> = {
    en_recepcion: "En Recepción",
    asignado: "Asignado",
    en_verificacion: "En Verificación",
    visita_programada: "Visita Programada",
    visita_realizada: "Visita Realizada",
    en_dictamen: "En Dictamen",
    finalizado: "Finalizado",
    entregado: "Entregado",
  };

  const calificacionLabels: Record<string, string> = {
    pendiente: "Pendiente",
    recomendable: "Recomendable",
    con_reservas: "Con Reservas",
    no_recomendable: "No Recomendable",
  };

  const calificacionColors: Record<string, string> = {
    pendiente: "text-gray-600",
    recomendable: "text-green-600",
    con_reservas: "text-yellow-600",
    no_recomendable: "text-red-600",
  };

  const blocks = [
    {
      key: "investigacionLaboral",
      label: "Investigación Laboral",
      icon: <Shield className="h-4 w-4 text-blue-600" />,
      data: (process as any)?.investigacionLaboral as any,
      render: (d: any) => ({
        estado: d?.resultado || "Sin resultado",
        detalle: d?.detalles,
        flag: d?.completado ? "completo" : "pendiente",
      }),
    },
    {
      key: "investigacionLegal",
      label: "Investigación Legal",
      icon: <Landmark className="h-4 w-4 text-indigo-600" />,
      data: (process as any)?.investigacionLegal as any,
      render: (d: any) => ({
        estado: d?.antecedentes || "Sin antecedentes registrados",
        detalle: d?.flagRiesgo ? "Con riesgo" : undefined,
        link: d?.archivoAdjuntoUrl,
        flag: d ? "en curso" : "pendiente",
      }),
    },
    {
      key: "buroCredito",
      label: "Buró de Crédito",
      icon: <FileText className="h-4 w-4 text-amber-600" />,
      data: (process as any)?.buroCredito as any,
      render: (d: any) => ({
        estado: d?.estatus || "Sin registro",
        detalle: d?.score ? `Score: ${d.score}` : undefined,
        flag: d?.aprobado === true ? "aprobado" : d?.aprobado === false ? "rechazado" : "pendiente",
      }),
    },
    {
      key: "visitaDetalle",
      label: "Visita Domiciliaria/Virtual",
      icon: <Home className="h-4 w-4 text-emerald-600" />,
      data: (process as any)?.visitaDetalle || (process as any)?.visitStatus,
      render: (d: any) => ({
        estado: d?.tipo ? d.tipo.toUpperCase() : d?.status || "No asignada",
        detalle: d?.comentarios || d?.observaciones,
        fecha: d?.fechaRealizacion || d?.scheduledDateTime,
        link: d?.enlaceReporteUrl,
      }),
    },
  ];

  const calcAvance = () => {
    const considered = blocks.length;
    const completed = blocks.reduce((acc, b) => {
      const d: any = b.data;
      if (!d) return acc;
      if (b.key === "investigacionLaboral" && d?.completado) return acc + 1;
      if (b.key === "investigacionLegal" && d?.antecedentes) return acc + 1;
      if (b.key === "buroCredito" && (d?.aprobado === true || d?.aprobado === false)) return acc + 1;
      if (b.key === "visitaDetalle" && (d?.fechaRealizacion || d?.status === "realizada")) return acc + 1;
      return acc;
    }, 0);
    return Math.round((completed / considered) * 100);
  };

  const avance = calcAvance();

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
          <h1 className="text-3xl font-bold text-gray-900">Detalle del Proceso</h1>
          <p className="text-gray-600 mt-1">Información completa del proceso de evaluación</p>
        </div>

        {/* Información General */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Información General
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Clave del Proceso</p>
                <p className="font-semibold text-lg">{process.clave}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tipo de Proceso</p>
                <p className="font-semibold">{process.tipoProducto}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Fecha de Recepción</p>
                <p className="font-semibold">
                  {new Date(process.fechaRecepcion).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              {process.fechaCierre && (
                <div>
                  <p className="text-sm text-gray-600">Fecha de Cierre</p>
                  <p className="font-semibold">
                    {new Date(process.fechaCierre).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              )}
              {(process as any)?.especialistaAtraccionNombre && (
                <div>
                  <p className="text-sm text-gray-600">Especialista de Atracción</p>
                  <p className="font-semibold flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-blue-600" />
                    {(process as any).especialistaAtraccionNombre}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">Estatus Actual</p>
                <p className="font-semibold">
                  <span className={`inline-block px-3 py-1 rounded text-sm ${
                    process.estatusProceso === 'finalizado' || process.estatusProceso === 'entregado'
                      ? 'bg-green-100 text-green-800'
                      : process.estatusProceso === 'en_recepcion'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {estatusLabels[process.estatusProceso] || process.estatusProceso}
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calificación Final */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Calificación Final
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <p className={`text-4xl font-bold ${calificacionColors[process.calificacionFinal || 'pendiente']}`}>
                {calificacionLabels[process.calificacionFinal || 'pendiente']}
              </p>
              {process.calificacionFinal === 'pendiente' && (
                <p className="text-sm text-gray-500 mt-2">
                  La calificación estará disponible una vez finalizado el proceso
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Avance y bloques de investigación (solo lectura) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Avance por Bloque (solo lectura)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Estatus visual</p>
                <p className="font-semibold capitalize">
                  {(process as any)?.estatusVisual?.replace(/_/g, " ") || "en proceso"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Avance estimado</p>
                <p className="text-2xl font-bold">{isNaN(avance) ? "0" : avance}%</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {blocks.map((block) => {
                const info = block.render(block.data || {});
                return (
                  <div key={block.key} className="rounded-lg border p-3 bg-white shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {block.icon}
                        <p className="font-semibold text-gray-900">{block.label}</p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                        {info.estado || "Sin datos"}
                      </span>
                    </div>
                    {info.detalle && (
                      <p className="text-sm text-gray-600 mb-1">{info.detalle}</p>
                    )}
                    {info.fecha && (
                      <p className="text-xs text-gray-500">Fecha: {new Date(info.fecha).toLocaleString()}</p>
                    )}
                    {info.link && (
                      <a
                        href={info.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 underline block mt-1"
                      >
                        Ver adjunto
                      </a>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="text-xs text-gray-500">
              Vista solo lectura para clientes. La edición se realiza por el equipo de Paula.
            </div>
          </CardContent>
        </Card>

        {/* Información del Candidato */}
        {candidate && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información del Candidato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Nombre Completo</p>
                <p className="font-semibold">{candidate.nombreCompleto}</p>
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
            </CardContent>
          </Card>
        )}

        {/* Información del Puesto */}
        {post && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Puesto Solicitado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Nombre del Puesto</p>
                <p className="font-semibold">{post.nombreDelPuesto}</p>
              </div>
              {post.descripcion && (
                <div>
                  <p className="text-sm text-gray-600">Descripción</p>
                  <p className="text-gray-700">{post.descripcion}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Dictamen (si está disponible) */}
        {process.archivoDictamenUrl && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Dictamen Final
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                El dictamen final está disponible para descarga
              </p>
              <a
                href={process.archivoDictamenUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
              >
                <Button>
                  <FileText className="h-4 w-4 mr-2" />
                  Descargar Dictamen
                </Button>
              </a>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
