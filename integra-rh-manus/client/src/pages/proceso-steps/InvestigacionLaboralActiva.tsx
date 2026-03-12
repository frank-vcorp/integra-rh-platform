/**
 * @file InvestigacionLaboralActiva.tsx
 * @description Paso 3: Investigación Laboral Activa — matriz interactiva de verificación de
 *              referencias laborales. Lee el historial via tRPC y permite al analista capturar
 *              notas, motivo de salida confirmado y estado de la referencia por cada empleo.
 * IMPL-20260311-03 | SPEC-003-CAPTURA-ANALISTA-REORDEN
 */

import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  PhoneCall,
  Save,
  User,
  XCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/** IMPL-20260311-03 | SPEC-003-CAPTURA-ANALISTA-REORDEN */
interface Props {
  process: any;
}

type EstadoReferencia = "pendiente" | "recomendable" | "con_reservas" | "no_recomendable";

interface DraftCaptura {
  comentarioInvestigacion: string;
  causalSalidaJefeInmediato: string;
  resultadoVerificacion: EstadoReferencia;
}

const ESTADO_CONFIG: Record<
  EstadoReferencia,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
    Icon: React.ElementType;
    colorClass: string;
  }
> = {
  pendiente:       { label: "Sin contactar",             variant: "secondary",    Icon: Clock,        colorClass: "text-muted-foreground" },
  recomendable:    { label: "Aprobado",                  variant: "default",      Icon: CheckCircle2, colorClass: "text-green-600" },
  con_reservas:    { label: "Incontactable / Reservas",  variant: "outline",      Icon: AlertCircle,  colorClass: "text-amber-600" },
  no_recomendable: { label: "Rechazado",                 variant: "destructive",  Icon: XCircle,      colorClass: "text-destructive" },
};

/** Causales aceptadas por el router tRPC (CAUSALES_SALIDA del servidor) */
const CAUSALES_SALIDA = [
  "RENUNCIA VOLUNTARIA",
  "VIGENTE",
  "RECORTE DE PERSONAL",
  "TÉRMINO DE CONTRATO",
  "TERMINACIÓN DE PROYECTO",
  "TÉRMINO DE PERIODO DE PRUEBA",
  "REESTRUCTURACIÓN",
  "CAMBIO DE ADMINISTRACIÓN",
  "CIERRE DE EMPRESA",
  "POR ANTIGÜEDAD NO HAY INFORMACIÓN EN SISTEMA",
  "POR POLÍTICAS DE PRIVACIDAD NO DAN REFERENCIAS LABORALES",
  "BAJO DESEMPEÑO",
  "AUSENTISMO",
  "ABANDONO DE EMPLEO",
  "ACUMULACIÓN DE FALTAS INJUSTIFICADAS",
  "INCUMPLIMIENTO DE POLÍTICAS INTERNAS",
  "NO APEGO A POLÍTICAS Y PROCESOS",
  "CONDUCTA INADECUADA",
  "CONFLICTIVO",
  "VIOLACIÓN AL CODIGO DE CONDUCTA Y ÉTICA (DESHONESTIDAD)",
  "FALTA DE PROBIDAD",
  "PERDIDA DE CONFIANZA",
  "NO RENOVACIÓN DE CONTRATO",
  "BAJA CON CAUSAL",
  "BAJA ADMINISTRATIVA",
  "ABUSO DE CONFIANZA",
  "FALSIFICACIÓN DE DOCUMENTOS",
  "SUSTRACCIÓN DE COMBUSTIBLE",
  "ALCOHOLISMO",
  "PERDIDA DE RECURSOS / MATERIAL DE LA EMPRESA",
  "DAÑO A UNIDAD VEHICULAR",
] as const;

function EstadoBadge({ estado }: { estado: EstadoReferencia }) {
  const { label, variant, Icon } = ESTADO_CONFIG[estado];
  return (
    <Badge variant={variant} className="text-xs flex items-center gap-1 shrink-0">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function DataRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between items-start gap-2 py-1.5 border-b border-border/30 last:border-0">
      <span className="text-muted-foreground text-xs font-medium shrink-0">{label}</span>
      <span className="text-xs text-right break-words max-w-[60%]">{value || "—"}</span>
    </div>
  );
}

export default function InvestigacionLaboralActiva({ process }: Props) {
  const candidatoId: number | undefined = process?.candidatoId;

  const [drafts, setDrafts] = useState<Record<number, DraftCaptura>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

  const utils = trpc.useUtils();

  const { data: historiales, isLoading } = trpc.workHistory.getByCandidate.useQuery(
    { candidatoId: candidatoId ?? 0 },
    { enabled: !!candidatoId },
  );

  const updateMutation = trpc.workHistory.update.useMutation({
    onSuccess: (_, variables) => {
      utils.workHistory.getByCandidate.invalidate({ candidatoId });
      setSavedIds((prev) => new Set(prev).add(variables.id));
      setSavingId(null);
      toast.success("Referencia actualizada correctamente");
    },
    onError: (error: any) => {
      setSavingId(null);
      toast.error("Error al guardar: " + error.message);
    },
  });

  const totalEmpleos     = historiales?.length ?? 0;
  const contactadasCount = historiales?.filter((h) => h.resultadoVerificacion !== "pendiente").length ?? 0;
  const aprobadasCount   = historiales?.filter((h) => h.resultadoVerificacion === "recomendable").length ?? 0;
  const rechazadasCount  = historiales?.filter((h) => h.resultadoVerificacion === "no_recomendable").length ?? 0;

  function getDraft(id: number, item: any): DraftCaptura {
    return (
      drafts[id] ?? {
        comentarioInvestigacion: item.comentarioInvestigacion ?? "",
        causalSalidaJefeInmediato: item.causalSalidaJefeInmediato ?? "",
        resultadoVerificacion: (item.resultadoVerificacion ?? "pendiente") as EstadoReferencia,
      }
    );
  }

  function patchDraft(id: number, item: any, patch: Partial<DraftCaptura>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...getDraft(id, item), ...patch } }));
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function handleGuardar(id: number, item: any) {
    const draft = getDraft(id, item);
    setSavingId(id);
    updateMutation.mutate({
      id,
      data: {
        resultadoVerificacion: draft.resultadoVerificacion,
        causalSalidaJefeInmediato: (draft.causalSalidaJefeInmediato as any) || undefined,
        comentarioInvestigacion: draft.comentarioInvestigacion || undefined,
      },
    });
  }

  if (!candidatoId) {
    return (
      <Alert variant="destructive">
        <AlertDescription>No hay candidato asociado a este proceso.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Encabezado del paso ── */}
      <div className="flex items-start gap-3">
        <div className="bg-amber-100 text-amber-700 rounded-full p-2 mt-0.5">
          <PhoneCall className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Paso 3: Investigación Laboral Activa</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Contacto directo con empresas del historial laboral. Registra tus notas, el motivo de
            salida confirmado y el estado de cada referencia.
          </p>
        </div>
      </div>

      {/* ── Contadores de progreso ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total empleos", value: totalEmpleos,     colorClass: "text-foreground" },
          { label: "Contactadas",   value: contactadasCount, colorClass: "text-blue-600" },
          { label: "Aprobadas",     value: aprobadasCount,   colorClass: "text-green-600" },
          { label: "Rechazadas",    value: rechazadasCount,  colorClass: "text-destructive" },
        ].map(({ label, value, colorClass }) => (
          <div key={label} className="rounded-lg border bg-card px-4 py-3 text-center shadow-sm">
            <p className={cn("text-2xl font-bold", colorClass)}>{isLoading ? "—" : value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Lista de empleos ── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : !historiales || historiales.length === 0 ? (
        <Alert>
          <PhoneCall className="h-4 w-4" />
          <AlertDescription>
            El candidato aún no tiene historial laboral registrado. Solicita que complete el
            Self-Service o agrega los empleos manualmente desde el expediente.
          </AlertDescription>
        </Alert>
      ) : (
        <Accordion type="multiple" className="space-y-3">
          {historiales.map((item, idx) => {
            const draft     = getDraft(item.id, item);
            const isSaving  = savingId === item.id;
            const wasSaved  = savedIds.has(item.id);

            return (
              <AccordionItem
                key={item.id}
                value={`empleo-${item.id}`}
                className="border rounded-lg bg-card shadow-sm overflow-hidden"
              >
                {/* ─ Encabezado del acordeón ─ */}
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center gap-3 w-full mr-4">
                    <div className="bg-amber-100 text-amber-700 rounded-full p-1.5 shrink-0">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-semibold text-sm truncate">{item.empresa}</p>
                      {item.puesto && (
                        <p className="text-xs text-muted-foreground truncate">{item.puesto}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground hidden sm:block">#{idx + 1}</span>
                      <EstadoBadge estado={draft.resultadoVerificacion} />
                    </div>
                  </div>
                </AccordionTrigger>

                {/* ─ Contenido expandido ─ */}
                <AccordionContent className="px-4 pb-5">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                    {/* Columna izquierda: datos declarados por el candidato */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5" />
                        Datos declarados por el candidato
                      </p>
                      <DataRow label="Empresa"    value={item.empresa} />
                      <DataRow label="Puesto"     value={item.puesto} />
                      <DataRow
                        label="Periodo"
                        value={
                          item.fechaInicio || item.fechaFin
                            ? `${item.fechaInicio ?? "?"} → ${item.fechaFin ?? "actual"}`
                            : item.tiempoTrabajado ?? null
                        }
                      />
                      <DataRow label="Jefe inmediato"       value={item.contactoReferencia} />
                      <DataRow label="Teléfono referencia"  value={item.telefonoReferencia} />
                      <DataRow label="Motivo salida (candidato)" value={item.causalSalidaRH} />
                    </div>

                    {/* Columna derecha: captura del analista */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        Captura del analista
                      </p>

                      <div className="space-y-4">
                        {/* Estado de la referencia */}
                        <div className="space-y-1.5">
                          <Label className="text-xs">Estado de la referencia</Label>
                          <Select
                            value={draft.resultadoVerificacion}
                            onValueChange={(val) =>
                              patchDraft(item.id, item, {
                                resultadoVerificacion: val as EstadoReferencia,
                              })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendiente">📵 Sin contactar</SelectItem>
                              <SelectItem value="recomendable">✅ Aprobado / Recomendable</SelectItem>
                              <SelectItem value="con_reservas">⚠️ Incontactable / Con Reservas</SelectItem>
                              <SelectItem value="no_recomendable">❌ Rechazado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Motivo de salida confirmado */}
                        <div className="space-y-1.5">
                          <Label className="text-xs">Motivo de salida confirmado por empresa</Label>
                          <Select
                            value={draft.causalSalidaJefeInmediato || "__none__"}
                            onValueChange={(val) =>
                              patchDraft(item.id, item, {
                                causalSalidaJefeInmediato: val === "__none__" ? "" : val,
                              })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Selecciona causal..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__" className="text-muted-foreground text-xs">
                                — Sin definir —
                              </SelectItem>
                              {CAUSALES_SALIDA.map((causal) => (
                                <SelectItem key={causal} value={causal} className="text-xs">
                                  {causal}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Notas de validación */}
                        <div className="space-y-1.5">
                          <Label className="text-xs">Notas de validación</Label>
                          <Textarea
                            placeholder="Ej: Habló con RRHH, confirmaron fecha de salida y causal. Sin incidencias reportadas..."
                            value={draft.comentarioInvestigacion}
                            onChange={(e) =>
                              patchDraft(item.id, item, {
                                comentarioInvestigacion: e.target.value,
                              })
                            }
                            className="text-xs min-h-[80px] resize-none"
                          />
                        </div>

                        <Separator />

                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => handleGuardar(item.id, item)}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            "Guardando..."
                          ) : wasSaved ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-1.5" />
                              Guardado
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-1.5" />
                              Guardar referencia
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}


