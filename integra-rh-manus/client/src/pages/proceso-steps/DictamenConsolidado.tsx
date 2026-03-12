/**
 * @file DictamenConsolidado.tsx
 * @description Paso 5: Dictamen Consolidado — panel ejecutivo de semáforos por área,
 *              selector de calificación final, dictamen textual del analista y
 *              acción de generación de reporte PDF para el cliente.
 * IMPL-20260311-05 | SPEC-003-CAPTURA-ANALISTA-REORDEN
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Scale, CheckCircle2, XCircle, Clock,
  CreditCard, ShieldAlert, Building2, Home, FileText,
  Loader2, Send, Save, AlertTriangle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** IMPL-20260311-05 | SPEC-003-CAPTURA-ANALISTA-REORDEN */
interface Props {
  process: any;
}

type CalificacionFinal =
  | "pendiente"
  | "recomendable"
  | "con_reservas"
  | "no_recomendable";

type SemaforoStatus = "ok" | "riesgo" | "pendiente";

interface SemaforoItem {
  key: string;
  label: string;
  Icon: React.ElementType;
  status: SemaforoStatus;
  detalle: string;
}

const DICTAMEN_OPCIONES: {
  value: CalificacionFinal;
  label: string;
  selectedClass: string;
  idleClass: string;
}[] = [
  {
    value: "recomendable",
    label: "✓  Apto",
    selectedClass: "border-green-500 bg-green-500 text-white shadow-sm",
    idleClass: "border-green-400 text-green-700 hover:bg-green-50",
  },
  {
    value: "con_reservas",
    label: "⚠  Riesgoso",
    selectedClass: "border-yellow-500 bg-yellow-500 text-white shadow-sm",
    idleClass: "border-yellow-400 text-yellow-700 hover:bg-yellow-50",
  },
  {
    value: "no_recomendable",
    label: "✕  No Recomendable",
    selectedClass: "border-red-500 bg-red-500 text-white shadow-sm",
    idleClass: "border-red-400 text-red-700 hover:bg-red-50",
  },
  {
    value: "pendiente",
    label: "○  Pendiente",
    selectedClass: "border-gray-400 bg-gray-500 text-white shadow-sm",
    idleClass: "border-gray-300 text-gray-600 hover:bg-gray-50",
  },
];

const STATUS_ICON: Record<SemaforoStatus, React.ElementType> = {
  ok: CheckCircle2,
  riesgo: XCircle,
  pendiente: Clock,
};

const STATUS_COLORS: Record<
  SemaforoStatus,
  { text: string; bg: string; border: string }
> = {
  ok:       { text: "text-green-700",  bg: "bg-green-50",  border: "border-green-200"  },
  riesgo:   { text: "text-red-700",    bg: "bg-red-50",    border: "border-red-200"    },
  pendiente:{ text: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200" },
};

/** Deriva los 4 semáforos a partir del objeto `process` */
function derivarSemaforos(process: any): SemaforoItem[] {
  const laboral = process?.investigacionLaboral ?? {};
  const legal   = process?.investigacionLegal   ?? {};
  const buro    = process?.buroCredito           ?? {};
  const visita  = process?.visitaDetalle         ?? {};

  // ── Laboral ──────────────────────────────────────────────────
  let laboralStatus: SemaforoStatus = "pendiente";
  let laboralDetalle = "No iniciado";
  if (laboral.completado === true) {
    laboralStatus  = "ok";
    laboralDetalle = laboral.resultado ?? "Completado";
  } else if (laboral.resultado || laboral.detalles) {
    laboralDetalle = "En proceso";
  }

  // ── Buró de Crédito ──────────────────────────────────────────
  let buroStatus: SemaforoStatus = "pendiente";
  let buroDetalle = "Sin consultar";
  if (buro.aprobado === true) {
    buroStatus  = "ok";
    buroDetalle = buro.score ? `Score: ${buro.score}` : "Aprobado";
  } else if (buro.aprobado === false) {
    buroStatus  = "riesgo";
    buroDetalle = buro.score ? `Score: ${buro.score}` : "Con observaciones";
  } else if (buro.estatus) {
    buroDetalle = buro.estatus;
  }

  // ── Antecedentes / Penales ───────────────────────────────────
  let legalStatus: SemaforoStatus = "pendiente";
  let legalDetalle = "Sin verificar";
  if (legal.flagRiesgo === true) {
    legalStatus  = "riesgo";
    legalDetalle = "Alerta de riesgo registrada";
  } else if (legal.flagRiesgo === false) {
    legalStatus  = "ok";
    legalDetalle = legal.antecedentes ?? "Sin antecedentes";
  }

  // ── Visita Domiciliaria ──────────────────────────────────────
  const evalMap: Record<string, SemaforoStatus> = {
    aprobado:           "ok",
    riesgoso:           "riesgo",
    rechazado:          "riesgo",
    visita_no_realizada:"pendiente",
  };
  const evalLabel: Record<string, string> = {
    aprobado:            "Entorno aprobado",
    riesgoso:            "Entorno con riesgo",
    rechazado:           "Entorno rechazado",
    visita_no_realizada: "Visita no realizada",
  };
  let visitaStatus: SemaforoStatus = "pendiente";
  let visitaDetalle = "No programada";
  const eval_ = visita.evaluacionEncuestador as string | undefined;
  if (eval_) {
    visitaStatus  = evalMap[eval_]   ?? "pendiente";
    visitaDetalle = evalLabel[eval_] ?? eval_;
  } else if (visita.tipo) {
    visitaDetalle = "Visita en progreso";
  }

  return [
    { key: "laboral", label: "Verificación Laboral",    Icon: Building2,  status: laboralStatus, detalle: laboralDetalle },
    { key: "buro",    label: "Buró de Crédito",         Icon: CreditCard, status: buroStatus,    detalle: buroDetalle    },
    { key: "legal",   label: "Antecedentes / Penales",  Icon: ShieldAlert,status: legalStatus,   detalle: legalDetalle   },
    { key: "visita",  label: "Visita Domiciliaria",     Icon: Home,       status: visitaStatus,  detalle: visitaDetalle  },
  ];
}

export default function DictamenConsolidado({ process }: Props) {
  const processId: number = process?.id ?? 0;

  const [calificacion, setCalificacion] = useState<CalificacionFinal>(
    (process?.calificacionFinal ?? "pendiente") as CalificacionFinal,
  );
  const [comentario, setComentario] = useState<string>(
    process?.comentarioCalificacion ?? "",
  );

  const utils = trpc.useUtils();

  const updateCalificacionMutation = trpc.processes.updateCalificacion.useMutation({
    onSuccess: () => {
      utils.processes.getById.invalidate({ id: processId });
      toast.success("Dictamen guardado correctamente");
    },
    onError: (e: any) => toast.error("Error al guardar: " + e.message),
  });

  const generarDictamenMutation = trpc.processes.generarDictamen.useMutation({
    onSuccess: (data: { url: string; path: string }) => {
      utils.processes.getById.invalidate({ id: processId });
      toast.success("Reporte PDF generado y liberado al cliente");
      if (data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      }
    },
    onError: (e: any) => toast.error("Error al generar dictamen: " + e.message),
  });

  const semaforos = derivarSemaforos(process);
  const okCount    = semaforos.filter((s) => s.status === "ok").length;
  const riesgoCount= semaforos.filter((s) => s.status === "riesgo").length;
  const isPending  = updateCalificacionMutation.isPending || generarDictamenMutation.isPending;

  const handleGuardar = () => {
    if (!processId) return;
    updateCalificacionMutation.mutate({
      id: processId,
      calificacionFinal: calificacion,
      comentarioCalificacion: comentario.trim() || undefined,
    });
  };

  const handleGenerarPdf = async () => {
    if (!processId) return;
    if (calificacion === "pendiente") {
      toast.warning("Define la calificación final antes de generar el reporte");
      return;
    }
    // Guardar siempre la calificación fresca antes de generar el PDF
    try {
      await updateCalificacionMutation.mutateAsync({
        id: processId,
        calificacionFinal: calificacion,
        comentarioCalificacion: comentario.trim() || undefined,
      });
    } catch {
      // el error ya se muestra en onError
      return;
    }
    generarDictamenMutation.mutate({ id: processId });
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <div className="bg-rose-100 text-rose-700 rounded-full p-2 mt-0.5">
          <Scale className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Paso 5: Dictamen Consolidado</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Consolida los resultados de todas las áreas verificadas, refina el análisis experto y genera el dictamen final para el cliente.
          </p>
        </div>
      </div>

      {/* ── A: Panel ejecutivo de semáforos ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            Resumen Ejecutivo de Verificación
            <div className="ml-auto flex gap-2">
              {okCount > 0 && (
                <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">
                  {okCount} OK
                </Badge>
              )}
              {riesgoCount > 0 && (
                <Badge className="bg-red-100 text-red-800 border-red-300 text-xs">
                  {riesgoCount} Riesgo
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {semaforos.map((item) => {
              const StatusIcon = STATUS_ICON[item.status];
              const colors     = STATUS_COLORS[item.status];
              const ItemIcon   = item.Icon;
              return (
                <div
                  key={item.key}
                  className={cn(
                    "flex items-center justify-between rounded-md border px-4 py-3",
                    colors.bg,
                    colors.border,
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <ItemIcon className={cn("h-4 w-4 shrink-0", colors.text)} />
                    <div>
                      <p className="text-sm font-medium leading-none">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.detalle}</p>
                    </div>
                  </div>
                  <StatusIcon className={cn("h-5 w-5 shrink-0", colors.text)} />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── B: Selector de calificación final ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-4 w-4 text-muted-foreground" />
            Calificación Final del Proceso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {DICTAMEN_OPCIONES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCalificacion(opt.value)}
                className={cn(
                  "rounded-md border-2 px-3 py-4 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                  calificacion === opt.value
                    ? opt.selectedClass
                    : opt.idleClass + " bg-white",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── C: Dictamen textual del analista ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Dictamen Final del Analista
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="comentario-dictamen" className="text-sm text-muted-foreground">
            Evaluación experta, conclusión y observaciones relevantes para el cliente
          </Label>
          <Textarea
            id="comentario-dictamen"
            placeholder="Ej: El candidato cuenta con historial laboral consistente y antecedentes limpios. Se detecta una observación menor en buró de crédito (pago tardío 2022) que no representa riesgo significativo. Se recomienda su incorporación con seguimiento durante los primeros 3 meses..."
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={6}
            className="resize-y min-h-[120px] text-sm"
          />
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGuardar}
              disabled={isPending}
            >
              {updateCalificacionMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1.5" />
              )}
              Guardar Dictamen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── D: Acción principal — Generar PDF y Liberar ── */}
      <Card className="border-rose-200 bg-rose-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-rose-800">
            <Send className="h-4 w-4" />
            Cierre y Entrega al Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Al confirmar, se genera el reporte PDF del dictamen y queda disponible para el cliente en su portal. Esta acción guarda automáticamente la calificación y el texto.
          </p>

          {process?.archivoDictamenUrl && (
            <div className="flex items-center justify-between rounded-md bg-white border border-rose-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Reporte generado anteriormente</p>
                <p className="text-xs text-muted-foreground">
                  {process.archivoDictamenPath ?? "Disponible en Firebase Storage"}
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={process.archivoDictamenUrl} target="_blank" rel="noopener noreferrer">
                  Ver PDF
                </a>
              </Button>
            </div>
          )}

          <Button
            className="w-full bg-rose-600 hover:bg-rose-700 text-white"
            size="lg"
            onClick={handleGenerarPdf}
            disabled={isPending || calificacion === "pendiente"}
          >
            {generarDictamenMutation.isPending ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Send className="h-5 w-5 mr-2" />
            )}
            Generar PDF y Liberar al Cliente
          </Button>

          {calificacion === "pendiente" && (
            <p className="text-xs text-center text-muted-foreground italic">
              Selecciona una calificación final para habilitar la generación del reporte.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
