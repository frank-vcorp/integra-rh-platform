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

