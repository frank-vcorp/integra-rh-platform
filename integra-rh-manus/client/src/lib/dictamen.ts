export type CalificacionFinalType =
  | "pendiente"
  | "recomendable"
  | "con_reservas"
  | "no_recomendable"
  | (string & {});

export const CALIFICACION_LABELS: Record<CalificacionFinalType, string> = {
  pendiente: "Pendiente",
  recomendable: "Recomendable",
  con_reservas: "Con Reservas",
  no_recomendable: "No Recomendable",
};

export function getCalificacionLabel(value?: string | null): string {
  if (!value) return CALIFICACION_LABELS.pendiente;
  return (
    CALIFICACION_LABELS[value as CalificacionFinalType] ??
    CALIFICACION_LABELS.pendiente
  );
}

export function getCalificacionTextClass(value?: string | null): string {
  switch (value as CalificacionFinalType) {
    case "recomendable":
      return "text-emerald-600";
    case "con_reservas":
      return "text-amber-600";
    case "no_recomendable":
      return "text-red-600";
    case "pendiente":
    default:
      return "text-gray-500";
  }
}

