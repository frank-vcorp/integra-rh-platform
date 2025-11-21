/**
 * Constantes compartidas de la aplicación
 */

export const TIPOS_PROCESO = [
  "ILA",
  "ESE LOCAL",
  "ESE FORANEO",
  "VISITA LOCAL",
  "VISITA FORANEA",
  "ILA CON BURÓ DE CRÉDITO",
  "ESE LOCAL CON BURÓ DE CRÉDITO",
  "ESE FORANEO CON BURÓ DE CRÉDITO",
  "ILA CON INVESTIGACIÓN LEGAL",
  "ESE LOCAL CON INVESTIGACIÓN LEGAL",
  "ESE FORANEO CON INVESTIGACIÓN LEGAL",
  "BURÓ DE CRÉDITO",
  "INVESTIGACIÓN LEGAL",
  "SEMANAS COTIZADAS",
] as const;

export type TipoProcesoType = typeof TIPOS_PROCESO[number];

export const CAUSALES_SALIDA = [
  "RENUNCIA VOLUNTARIA",
  "TÉRMINO DE CONTRATO",
  "CIERRE DE LA EMPRESA",
  "JUVILACIÓN",
  "ABANDONO DE TRABAJO",
  "ACUMULACIÓN DE FALTAS",
  "BAJO DESEMPEÑO",
  "FALTA DE PROBIDAD",
  "VIOLACIÓN AL CÓDIGO DE CONDUCTA",
  "ABUSO DE CONFIANZA",
  "INCUMPLIMIENTO A POLÍTICAS Y PROCESOS",
] as const;

export type CausalSalidaType = typeof CAUSALES_SALIDA[number];

export const ESTATUS_INVESTIGACION = [
  "en_revision",
  "revisado",
  "terminado",
] as const;

export type EstatusInvestigacionType = typeof ESTATUS_INVESTIGACION[number];

export const ESTATUS_INVESTIGACION_LABELS: Record<EstatusInvestigacionType, string> = {
  en_revision: "En investigación",
  revisado: "Revisado",
  terminado: "Finalizado",
};

// Psicométricas — baterías disponibles (ajustar según proveedor)
export const BATERIAS_PSICOMETRICAS = [
  "BATERIA_BASICA",
  "BATERIA_ADMINISTRATIVA",
  "BATERIA_VENTAS",
  "BATERIA_OPERATIVA",
  "BATERIA_IT",
  "BATERIA_GERENCIAL",
  "BATERIA_FINANZAS",
  "BATERIA_RECURSOS_HUMANOS",
  "BATERIA_LOGISTICA",
  "BATERIA_SERVICIO_CLIENTE",
  "BATERIA_PRODUCCION",
  "BATERIA_SEGURIDAD",
  "BATERIA_CALIDAD",
  "BATERIA_LIDERAZGO",
  "BATERIA_CREDITO_COBRANZA",
  "BATERIA_PERSONALIZADA",
] as const;
export type BateriaPsicometricaType = typeof BATERIAS_PSICOMETRICAS[number];
