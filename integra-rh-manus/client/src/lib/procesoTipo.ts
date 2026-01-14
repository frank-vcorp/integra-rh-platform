import type { TipoProcesoType } from "./constants";

export type ProcesoBaseType =
  | "ILA"
  | "ESE"
  | "VISITA"
  | "BURO"
  | "LEGAL"
  | "SEMANAS";

export type AmbitoType = "LOCAL" | "FORANEO";

export type ExtraType = "NINGUNO" | "BURO" | "LEGAL";

export type IlaModoType = "NORMAL" | "BURO" | "LEGAL";

export type ProcesoConfig =
  | {
      base: "ILA";
      modo: IlaModoType;
    }
  | {
      base: "ESE";
      ambito: AmbitoType;
      extra: ExtraType;
    }
  | {
      base: "VISITA";
      ambito: AmbitoType;
    }
  | { base: "BURO" }
  | { base: "LEGAL" }
  | { base: "SEMANAS" };

export function mapProcesoConfigToTipoProducto(
  config: ProcesoConfig
): TipoProcesoType {
  switch (config.base) {
    case "ILA": {
      if (config.modo === "BURO") return "ILA CON BURÓ DE CRÉDITO";
      if (config.modo === "LEGAL") return "ILA CON INVESTIGACIÓN LEGAL";
      return "ILA";
    }
    case "ESE": {
      const prefix =
        config.ambito === "LOCAL" ? "ESE LOCAL" : "ESE FORANEO";
      if (config.extra === "BURO") {
        return `${prefix} CON BURÓ DE CRÉDITO` as TipoProcesoType;
      }
      if (config.extra === "LEGAL") {
        return `${prefix} CON INVESTIGACIÓN LEGAL` as TipoProcesoType;
      }
      return prefix as TipoProcesoType;
    }
    case "VISITA": {
      return (config.ambito === "LOCAL"
        ? "VISITA LOCAL"
        : "VISITA FORANEA") as TipoProcesoType;
    }
    case "BURO":
      return "BURÓ DE CRÉDITO";
    case "LEGAL":
      return "INVESTIGACIÓN LEGAL";
    case "SEMANAS":
      return "SEMANAS COTIZADAS";
  }
}

export const PROCESO_BASE_OPTIONS: {
  value: ProcesoBaseType;
  label: string;
}[] = [
  { value: "ILA", label: "ILA (INVESTIGACION LABORAL)" },
  { value: "ESE", label: "ESE (Estudio socioeconómico)" },
  { value: "VISITA", label: "Visita domiciliaria" },
  { value: "BURO", label: "Buró de crédito" },
  { value: "LEGAL", label: "Investigación legal" },
  { value: "SEMANAS", label: "Semanas cotizadas IMSS" },
];

export function parseTipoProductoToConfig(
  tipo: TipoProcesoType
): ProcesoConfig {
  switch (tipo) {
    case "ILA":
      return { base: "ILA", modo: "NORMAL" };
    case "ILA CON BURÓ DE CRÉDITO":
      return { base: "ILA", modo: "BURO" };
    case "ILA CON INVESTIGACIÓN LEGAL":
      return { base: "ILA", modo: "LEGAL" };
    case "ESE LOCAL":
      return { base: "ESE", ambito: "LOCAL", extra: "NINGUNO" };
    case "ESE FORANEO":
      return { base: "ESE", ambito: "FORANEO", extra: "NINGUNO" };
    case "ESE LOCAL CON BURÓ DE CRÉDITO":
      return { base: "ESE", ambito: "LOCAL", extra: "BURO" };
    case "ESE FORANEO CON BURÓ DE CRÉDITO":
      return { base: "ESE", ambito: "FORANEO", extra: "BURO" };
    case "ESE LOCAL CON INVESTIGACIÓN LEGAL":
      return { base: "ESE", ambito: "LOCAL", extra: "LEGAL" };
    case "ESE FORANEO CON INVESTIGACIÓN LEGAL":
      return { base: "ESE", ambito: "FORANEO", extra: "LEGAL" };
    case "VISITA LOCAL":
      return { base: "VISITA", ambito: "LOCAL" };
    case "VISITA FORANEA":
      return { base: "VISITA", ambito: "FORANEO" };
    case "BURÓ DE CRÉDITO":
      return { base: "BURO" };
    case "INVESTIGACIÓN LEGAL":
      return { base: "LEGAL" };
    case "SEMANAS COTIZADAS":
      return { base: "SEMANAS" };
    default:
      return { base: "ILA", modo: "NORMAL" };
  }
}

export function formatTipoProductoDisplay(value?: string | null): string {
  if (!value) return "";

  let normalized = value;
  normalized = normalized.replace(
    /integral\s+de\s+antecedentes/gi,
    "Investigacion Laboral",
  );

  return normalized;
}

/**
 * Determina qué servicios/bloques están incluidos en un tipo de proceso.
 * Esto es útil para mostrar solo los bloques relevantes en el portal de cliente.
 * 
 * La visita es OPCIONAL para todos los tipos de proceso (ILA, ESE, etc.)
 * Por eso se requiere pasar los datos de visita para determinar si mostrarla.
 */
export interface ServiciosIncluidos {
  laboral: boolean;
  legal: boolean;
  buro: boolean;
  visita: boolean;
  semanas: boolean;
}

export interface DatosVisita {
  visitStatus?: {
    status?: string;
    scheduledDateTime?: string;
    encuestadorId?: number;
    direccion?: string;
    observaciones?: string;
  } | null;
  visitaDetalle?: {
    tipo?: string;
    comentarios?: string;
    fechaRealizacion?: string;
    enlaceReporteUrl?: string;
  } | null;
}

export function getServiciosIncluidos(
  tipoProducto?: string | null,
  datosVisita?: DatosVisita
): ServiciosIncluidos {
  if (!tipoProducto) {
    return { laboral: false, legal: false, buro: false, visita: false, semanas: false };
  }

  const tipo = tipoProducto.toUpperCase();

  // Determinar si hay visita contratada/registrada:
  // 1. Si el tipo de proceso es específicamente "VISITA LOCAL" o "VISITA FORANEA"
  // 2. O si hay datos en visitStatus (status, scheduledDateTime, encuestadorId)
  // 3. O si hay datos en visitaDetalle (tipo, fechaRealizacion)
  const esProcesoSoloVisita = tipo === "VISITA LOCAL" || tipo === "VISITA FORANEA";
  const tieneVisitStatus = !!(
    datosVisita?.visitStatus?.status ||
    datosVisita?.visitStatus?.scheduledDateTime ||
    datosVisita?.visitStatus?.encuestadorId
  );
  const tieneVisitaDetalle = !!(
    datosVisita?.visitaDetalle?.tipo ||
    datosVisita?.visitaDetalle?.fechaRealizacion
  );
  const tieneVisita = esProcesoSoloVisita || tieneVisitStatus || tieneVisitaDetalle;

  // Mapeo basado en el tipo de proceso
  return {
    // Laboral: ILA y ESE siempre incluyen investigación laboral
    laboral: tipo.includes("ILA") || tipo.includes("ESE"),
    
    // Legal: solo si explícitamente dice "LEGAL" o "INVESTIGACIÓN LEGAL"
    legal: tipo.includes("LEGAL"),
    
    // Buró: solo si explícitamente dice "BURÓ" o "BURO"
    buro: tipo.includes("BUR"),
    
    // Visita: OPCIONAL - solo si hay datos registrados o es tipo VISITA específico
    visita: tieneVisita,
    
    // Semanas cotizadas
    semanas: tipo.includes("SEMANAS"),
  };
}

