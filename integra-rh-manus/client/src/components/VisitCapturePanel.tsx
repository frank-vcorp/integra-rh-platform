/**
 * Panel compartido para visualizar y auditar la captura de visita.
 * Alineado con EncuestadorPortal: documentos anidados, mapa GPS, ingresos del portal.
 * @intervention IMPL-20260324-02
 * @respaldo PROYECTO.md
 */

import type { JSX } from "react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Clock3, Download, ExternalLink, FileImage, History, PencilLine, ZoomIn } from "lucide-react";

type Primitive = string | number | boolean | null | undefined;

type VisitCaptureAuditEntry = {
  id: number;
  timestamp: string | Date;
  userId: number | null;
  userName?: string | null;
  userEmail?: string | null;
  details?: {
    changedFields?: Array<{
      path: string;
      before: unknown;
      after: unknown;
    }>;
  } | null;
};

type VisitCapturePanelProps = {
  data: Record<string, unknown>;
  portalUrl?: string | null;
  portalStatus?: string | null;
  canEdit?: boolean;
  isSaving?: boolean;
  onSave?: (nextValue: Record<string, unknown>) => void;
  auditEntries?: VisitCaptureAuditEntry[];
};

const LABELS: Record<string, string> = {
  _privacyAcceptedAt: "Aviso de privacidad aceptado",
  _sessionStartedAt: "Inicio de sesión",
  _sessionStartGps: "GPS de inicio",
  _sessionEndedAt: "Fin de sesión",
  _sessionEndGps: "GPS de cierre",
  _deviceInfo: "Dispositivo",
  ubicacion: "Ubicación y domicilio",
  gps: "Geolocalización",
  domicilio: "Domicilio",
  cp: "Código postal",
  coloniaMunicipio: "Colonia / municipio",
  estado: "Estado",
  academica: "Información académica",
  ultimoGrado: "Último grado",
  institucion: "Institución",
  ciudad: "Ciudad",
  periodo: "Periodo",
  documentoObtenido: "Documento obtenido",
  folioDocumento: "Folio del documento",
  estudiaActualmente: "Estudia actualmente",
  cursos: "Cursos",
  equiposMaquinas: "Equipos y máquinas",
  programas: "Programas",
  funcionesAdministrativas: "Funciones administrativas",
  otrosConocimientos: "Otros conocimientos",
  documentos: "Cotejo de documentos",
  familiares: "Familiares",
  otrasPersonasDomicilio: "Otras personas en el domicilio",
  vivienda: "Vivienda",
  patrimonio: "Patrimonio e ingresos",
  ingresosEgresos: "Ingresos y egresos",
  salud: "Salud",
  habitos: "Hábitos",
  referenciaPersonal: "Referencias personales",
  refPersonales: "Referencias personales",
  refVecinales: "Referencias vecinales",
  referenciasVecinales: "Referencias vecinales",
  conclusion: "Conclusión",
  firma: "Firma",
  comentarios: "Comentarios",
  observaciones: "Observaciones",
  tipo: "Tipo",
  fechaRealizacion: "Fecha de realización",
  enlaceReporteUrl: "Enlace de reporte",
  evidenciasGraficas: "Evidencias gráficas",
  lat: "Latitud",
  lon: "Longitud",
  accuracy: "Precisión",
  locked: "Bloqueado",
  nombre: "Nombre",
  parentesco: "Parentesco",
  edad: "Edad",
  escolaridad: "Escolaridad",
  ocupacion: "Ocupación",
  lugarResidencia: "Lugar de residencia",
  ingreso: "Ingreso",
  comoSeAnuncia: "Cómo se anuncia",
  desempleoActividad: "Actividad",
  // ── Secciones completas proceso 82 ────────────────────────────────────
  dinamicaFamiliar: "Dinámica familiar",
  dinamicaVivienda: "Dinámica de vivienda",
  afore: "AFORE",
  tipoSangre: "Tipo de sangre",
  actaNacimiento: "Acta de nacimiento",
  cartillaMilitar: "Cartilla militar",
  credencialElector: "Credencial de elector",
  comprobanteDomicilio: "Comprobante de domicilio",
  trabajoEUA: "Trabajó en EE.UU.",
  vivenSolos: "¿Viven solos?",
  tieneDeudas: "¿Tiene deudas?",
  acuerdoPareja: "Pareja de acuerdo",
  esposaEmbarazada: "Esposa embarazada",
  institucionDeuda: "Institución de deuda",
  pensionAlimenticia: "Pensión alimenticia",
  zona: "Zona",
  fachada: "Fachada",
  muebles: "Muebles",
  niveles: "Niveles",
  numBanos: "N.º de baños",
  tipoCasa: "Tipo de casa",
  tieneSala: "Tiene sala",
  superficie: "Superficie",
  tienePatio: "Tiene patio",
  valorAprox: "Valor aproximado",
  tieneCocina: "Tiene cocina",
  tieneJardin: "Tiene jardín",
  numRecamaras: "N.º de recámaras",
  precioPasaje: "Precio de pasaje",
  tieneCochera: "Tiene cochera",
  tieneComedor: "Tiene comedor",
  estadoMuebles: "Estado de muebles",
  pisosMaterial: "Material de pisos",
  paredesMaterial: "Material de paredes",
  tiempoResidenciaActual: "Tiempo en residencia actual",
  tiempoResidenciaAnterior: "Tiempo en residencia anterior",
  fuma: "¿Fuma?",
  toma: "¿Consume alcohol?",
  alergias: "¿Tiene alergias?",
  causaCita: "Causa de última cita médica",
  accidentes: "Accidentes",
  tipoBebida: "Tipo de bebida",
  ultimaCita: "Última cita médica",
  cigarrosDia: "Cigarros por día",
  cadaCuandoToma: "Frecuencia de consumo",
  cualesAlergias: "¿Cuáles alergias?",
  cuidadosMedicos: "Cuidados médicos",
  cualesEnfermedades: "¿Cuáles enfermedades?",
  enfermedadesCronicas: "Enfermedades crónicas",
  tatuajes: "Tatuajes",
  asisteBares: "Asiste a bares",
  deporteCual: "¿Cuál deporte?",
  partidoCual: "¿Cuál partido político?",
  pasatiempos: "Pasatiempos",
  religiosoCual: "¿Cuál religión?",
  afiliadoPartido: "Afiliado a partido político",
  asisteReligioso: "Asiste a servicios religiosos",
  practicaDeporte: "Practica deporte",
  actividadFamiliar: "Actividad familiar",
  deporteFrecuencia: "Frecuencia deportiva",
  religiosoFrecuencia: "Frecuencia religiosa",
  actividadFamiliarCual: "¿Cuál actividad familiar?",
  actividadFamiliarFrecuencia: "Frecuencia de actividad familiar",
  procesoLegal: "¿En proceso legal?",
  procesoLegalQuien: "¿Quién en proceso legal?",
  procesoLegalPorQue: "¿Por qué proceso legal?",
  trabajoGrupo: "¿Trabajó en el grupo?",
  fotos: "Fotos del domicilio",
  sala: "Sala",
  cocina: "Cocina",
  comedor: "Comedor",
  fachadaCalle: "Fachada (calle)",
  fachadaPatio: "Fachada (patio)",
  ingresosArray: "Ingresos familiares",
  egresos: "Egresos familiares",
  creditos: "Créditos",
  bienesRaices: "Bienes raíces",
  vehiculos: "Vehículos",
  negocios: "Negocios",
  folio: "Folio del documento",
  equipos: "Equipos y maquinaria",
  otrasPersonas: "Otras personas en domicilio",
  fotoFrente: "Foto frente",
  fotoReverso: "Foto reverso",
  foto: "Foto",
  tiene: "Presentó",
  nombreTitular: "Nombre del titular",
  parentescoTitular: "Parentesco con el titular",
  texto: "Número / dato del documento",
  habitaDomicilio: "Habita en el domicilio",
  sueldo: "Sueldo mensual ($)",
  otrosIngresos: "Otros ingresos ($)",
  intervencionQuirurgica: "Intervención quirúrgica",
  consumeMedicamento: "Consume medicamento",
  consumeDroga: "Consume droga",
  enfermedadesHereditarias: "Enfermedades hereditarias",
  creditoInfonavit: "Crédito Infonavit",
  licenciaConducir: "Licencia de conducir",
  certificadoTitulo: "Certificado o título",
  pasaporte: "Pasaporte",
  visaAmericana: "Visa americana",
  cartasRecomendacion: "Cartas de recomendación",
};

function humanizeKey(key: string) {
  if (LABELS[key]) return LABELS[key];
  return key
    .replace(/^_+/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (value) => value.toUpperCase());
}

function isPrimitive(value: unknown): value is Primitive {
  return value === null || value === undefined || ["string", "number", "boolean"].includes(typeof value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/** Detecta extensión de imagen ignorando query-params y encoding (ej. Firebase Storage URLs). */
function isImageUrl(value: string): boolean {
  const path = value.split("?")[0].split("#")[0];
  try {
    return /\.(png|jpe?g|webp|gif|svg)$/i.test(decodeURIComponent(path));
  } catch {
    return /\.(png|jpe?g|webp|gif|svg)$/i.test(path);
  }
}

/** Detecta data URLs de imagen (ej. data:image/png;base64,...). */
function isImageDataUrl(value: string): boolean {
  return /^data:image\//i.test(value);
}

/** Detecta URLs de Firebase Storage — pueden omitir extensión en la ruta visible. */
function isFirebaseStorageUrl(value: string): boolean {
  try {
    const { hostname } = new URL(value);
    return (
      hostname === "firebasestorage.googleapis.com" ||
      hostname.endsWith(".firebasestorage.googleapis.com") ||
      hostname === "storage.googleapis.com"
    );
  } catch {
    return false;
  }
}

/** Detecta URLs de Google Static Maps — siempre son imágenes aunque no tengan extensión. */
function isGoogleStaticMapsUrl(value: string): boolean {
  try {
    const { hostname, pathname } = new URL(value);
    return hostname === "maps.googleapis.com" && pathname.startsWith("/maps/api/staticmap");
  } catch {
    return false;
  }
}

/** True si el string es una imagen (URL HTTP con extensión, Firebase Storage, Google Static Maps o data URL base64). */
function isImageSrc(value: string): boolean {
  return isImageDataUrl(value) || (isUrl(value) && (isImageUrl(value) || isFirebaseStorageUrl(value) || isGoogleStaticMapsUrl(value)));
}

/** Detecta data URLs no-imagen (PDF, Office, etc.) que deben mostrarse como adjunto descargable. */
function isNonImageDataUrl(value: string): boolean {
  return /^data:(?!image\/).+;base64,/i.test(value);
}

/** Etiqueta legible del mime type de un data URL (ej. "application/pdf" → "PDF"). */
function mimeLabel(dataUrl: string): string {
  const m = dataUrl.match(/^data:([^;]+);/);
  if (!m) return "Adjunto";
  const mime = m[1].toLowerCase();
  if (mime === "application/pdf") return "PDF";
  if (mime.startsWith("application/")) return mime.replace("application/", "").toUpperCase();
  return mime.split("/").pop()?.toUpperCase() ?? "Adjunto";
}

/**
 * Tarjeta de adjunto no-imagen (PDF, etc.) — permite abrir o descargar sin mostrar base64 crudo.
 * @intervention IMPL-20260324-01
 */
function AttachmentCard({ value, label }: { value: string; label: string }) {
  const fileLabel = mimeLabel(value);
  const handleOpen = () => {
    const win = window.open();
    if (win) {
      win.document.write(
        `<iframe src="${value}" style="width:100%;height:100vh;border:none;margin:0;padding:0;" title="${label}"></iframe>`
      );
      win.document.title = label || "Adjunto";
    }
  };
  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = value;
    a.download = `${label || "adjunto"}.${fileLabel.toLowerCase()}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  return (
    <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
      <FileImage className="h-8 w-8 text-slate-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-700">{label || "Adjunto"}</div>
        <div className="text-xs text-slate-500">{fileLabel} — adjunto capturado en campo</div>
      </div>
      <div className="flex gap-3 shrink-0">
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center gap-1 text-xs text-blue-700 underline hover:text-blue-900"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Abrir
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-1 text-xs text-blue-700 underline hover:text-blue-900"
        >
          <Download className="h-3.5 w-3.5" /> Descargar
        </button>
      </div>
    </div>
  );
}

function formatPrimitive(value: Primitive) {
  if (value === null || value === undefined || value === "") return "Sin registro";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return String(value);
}

/**
 * Normaliza GPS y mapa de ubicación para el panel de analista.
 * @intervention ARCH-20260323-01
 * @respaldo PROYECTO.md
 */
function extractGpsCoordinates(value: unknown): { lat: number; lon: number; accuracy?: number } | null {
  if (isPlainObject(value)) {
    const lat = Number(value.lat);
    const lon = Number(value.lon);
    const accuracy = value.accuracy !== undefined ? Number(value.accuracy) : undefined;
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return {
        lat,
        lon,
        ...(Number.isFinite(accuracy) ? { accuracy } : {}),
      };
    }
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("{")) {
      try {
        return extractGpsCoordinates(JSON.parse(trimmed));
      } catch {
        return null;
      }
    }

    const matches = trimmed.match(/-?\d+(?:\.\d+)?/g);
    if (matches && matches.length >= 2) {
      const lat = Number(matches[0]);
      const lon = Number(matches[1]);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        return { lat, lon };
      }
    }
  }

  return null;
}

function formatGpsDisplay(value: unknown): string {
  const gps = extractGpsCoordinates(value);
  if (!gps) {
    return typeof value === "string" ? value : "Sin GPS capturado";
  }

  const accuracyLabel = Number.isFinite(gps.accuracy)
    ? ` (±${Number(gps.accuracy).toFixed(0)} m)`
    : "";

  return `${gps.lat.toFixed(6)}, ${gps.lon.toFixed(6)}${accuracyLabel}`;
}

function getLocationMapAssets(ubicacion: unknown): {
  staticMapUrl: string | null;
  embedUrl: string | null;
  openUrl: string | null;
  gps: { lat: number; lon: number; accuracy?: number } | null;
} {
  const location = isPlainObject(ubicacion) ? ubicacion : {};
  const gps = extractGpsCoordinates(location.gps);
  const staticMapUrl = typeof location.mapaCapturaUrl === "string" && location.mapaCapturaUrl.trim()
    ? location.mapaCapturaUrl.trim()
    : null;

  if (!gps) {
    return {
      staticMapUrl,
      embedUrl: null,
      openUrl: null,
      gps: null,
    };
  }

  const coordinates = `${gps.lat},${gps.lon}`;

  return {
    staticMapUrl,
    embedUrl: `https://maps.google.com/maps?q=${coordinates}&z=17&output=embed`,
    openUrl: `https://www.google.com/maps?q=${coordinates}`,
    gps,
  };
}

function buildVisitCapturePatch(beforeValue: unknown, afterValue: unknown): unknown {
  if (Array.isArray(beforeValue) || Array.isArray(afterValue)) {
    return JSON.stringify(beforeValue ?? null) === JSON.stringify(afterValue ?? null)
      ? undefined
      : afterValue;
  }

  if (isPlainObject(afterValue)) {
    const beforeObject = isPlainObject(beforeValue) ? beforeValue : {};
    const patchEntries = Object.entries(afterValue)
      .map(([key, value]) => [key, buildVisitCapturePatch(beforeObject[key], value)] as const)
      .filter(([, value]) => value !== undefined);

    return patchEntries.length > 0 ? Object.fromEntries(patchEntries) : undefined;
  }

  return JSON.stringify(beforeValue ?? null) === JSON.stringify(afterValue ?? null)
    ? undefined
    : afterValue;
}

function mergeVisitCapture(baseValue: unknown, patchValue: unknown): unknown {
  if (patchValue === undefined) {
    return baseValue;
  }

  if (isPlainObject(baseValue) && isPlainObject(patchValue)) {
    const merged: Record<string, unknown> = { ...baseValue };
    for (const [key, value] of Object.entries(patchValue)) {
      merged[key] = mergeVisitCapture((baseValue as Record<string, unknown>)[key], value);
    }
    return merged;
  }

  return patchValue;
}

function humanizeAuditPath(path: string): string {
  if (!path) return "Captura";

  return path
    .split(".")
    .filter((segment) => segment !== "captura")
    .map((segment) => (/^\d+$/.test(segment) ? `#${Number(segment) + 1}` : humanizeKey(segment)))
    .join(" > ");
}

function formatAuditValue(value: unknown): { tone: "neutral" | "added" | "removed"; text: string } {
  if (value === null || value === undefined || value === "") {
    return { tone: "removed", text: "Sin registro" };
  }

  if (typeof value === "string") {
    if (isImageDataUrl(value)) {
      return { tone: "added", text: "Imagen capturada" };
    }
    if (isNonImageDataUrl(value)) {
      return { tone: "added", text: `Adjunto ${mimeLabel(value)}` };
    }
    if (isUrl(value)) {
      return { tone: "added", text: isImageSrc(value) ? "Imagen por URL" : "Enlace registrado" };
    }
    if (value.length > 140) {
      return { tone: "neutral", text: `${value.slice(0, 140)}...` };
    }
    return { tone: "neutral", text: value };
  }

  if (typeof value === "boolean") {
    return { tone: value ? "added" : "removed", text: value ? "Sí" : "No" };
  }

  if (typeof value === "number") {
    return { tone: "neutral", text: String(value) };
  }

  if (Array.isArray(value)) {
    return {
      tone: value.length > 0 ? "added" : "removed",
      text: value.length > 0 ? `${value.length} elemento(s)` : "Sin elementos",
    };
  }

  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    return {
      tone: keys.length > 0 ? "added" : "neutral",
      text: keys.length > 0 ? `Registro actualizado (${keys.length} campo(s))` : "Objeto vacío",
    };
  }

  return { tone: "neutral", text: String(value) };
}

function AuditValuePill({ label, value }: { label: string; value: unknown }) {
  const formatted = formatAuditValue(value);
  const toneClass = formatted.tone === "added"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : formatted.tone === "removed"
      ? "border-slate-200 bg-slate-50 text-slate-600"
      : "border-blue-200 bg-blue-50 text-blue-800";

  return (
    <div className={`rounded-md border px-3 py-2 ${toneClass}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-sm">{formatted.text}</div>
    </div>
  );
}

/**
 * Miniatura clicable para imágenes. onImageClick recibe la src; el label se inyecta desde el contexto padre.
 * @intervention IMPL-20260323-21
 */
function ImageThumbnail({ src, label, onClick }: { src: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative overflow-hidden rounded border border-slate-200 bg-slate-50 hover:border-blue-400 transition-colors cursor-zoom-in"
      title={`Ampliar: ${label || "imagen"}`}
    >
      <img
        src={src}
        alt={label || "Imagen"}
        className="h-20 w-28 object-cover group-hover:opacity-90 transition-opacity"
      />
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity">
        <ZoomIn className="h-5 w-5 text-white drop-shadow" />
      </div>
    </button>
  );
}

/**
 * Editor de imagen para analistas: acepta URL o archivo local.
 * @intervention ARCH-20260323-02
 * @respaldo PROYECTO.md
 */
function ImageValueEditor({
  label,
  value,
  onChange,
  onPreview,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onPreview: (src: string, label: string) => void;
}) {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onChange(reader.result);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return (
    <div className="space-y-2">
      {value && isImageSrc(value) && (
        <ImageThumbnail src={value} label={label} onClick={() => onPreview(value, label)} />
      )}
      {value && isNonImageDataUrl(value) && <AttachmentCard value={value} label={label} />}
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="text-xs"
        placeholder="URL de la imagen..."
      />
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs text-red-600 underline hover:text-red-800"
          >
            Quitar imagen
          </button>
        )}
      </div>
    </div>
  );
}

function renderPrimitiveValue(value: Primitive, onImageClick?: (src: string) => void, label = ""): JSX.Element {
  if (typeof value === "boolean") {
    return <Badge variant="outline">{value ? "Sí" : "No"}</Badge>;
  }

  if (typeof value === "string" && isImageSrc(value)) {
    if (onImageClick) {
      return (
        <ImageThumbnail
          src={value}
          label={isImageDataUrl(value) ? "imagen base64" : value}
          onClick={() => onImageClick(value)}
        />
      );
    }
    // Sin callback: link de respaldo
    return (
      <a href={value} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-700 underline break-all">
        <FileImage className="h-4 w-4" />
        {isImageDataUrl(value) ? "[imagen base64]" : value}
      </a>
    );
  }

  // Adjuntos no-imagen (PDF, etc.): mostrar tarjeta de descarga, nunca base64 crudo
  if (typeof value === "string" && isNonImageDataUrl(value)) {
    return <AttachmentCard value={value} label={label} />;
  }

  if (typeof value === "string" && isUrl(value)) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-700 underline break-all">
        <ExternalLink className="h-4 w-4" />
        {value}
      </a>
    );
  }

  return <span className="text-sm text-slate-800 whitespace-pre-wrap break-words">{formatPrimitive(value)}</span>;
}

function renderNode(
  label: string,
  value: unknown,
  path: string,
  onImageClick?: (src: string, label: string) => void,
  depth = 0
): JSX.Element {
  if (isPrimitive(value)) {
    return (
      <div key={path} className="space-y-1 rounded-md border bg-white p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
        <div>
          {renderPrimitiveValue(
            value,
            onImageClick ? (src) => onImageClick(src, label) : undefined,
            label
          )}
        </div>
      </div>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <div key={path} className="space-y-1 rounded-md border bg-white p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
          <div className="text-sm text-slate-500">Sin registros</div>
        </div>
      );
    }

    const allPrimitive = value.every((item) => isPrimitive(item));
    if (allPrimitive) {
      // Si todos los items son imágenes, renderizar grilla de miniaturas
      const allImages = !!onImageClick && value.every((item) => typeof item === "string" && isImageSrc(item));
      if (allImages) {
        return (
          <div key={path} className="space-y-2 rounded-md border bg-white p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {value.map((item, index) => {
                const imgLabel = `${label} ${index + 1}`;
                return (
                  <ImageThumbnail
                    key={`${path}.${index}`}
                    src={item as string}
                    label={imgLabel}
                    onClick={() => onImageClick!(item as string, imgLabel)}
                  />
                );
              })}
            </div>
          </div>
        );
      }

      return (
        <div key={path} className="space-y-2 rounded-md border bg-white p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
          <div className="flex flex-col gap-2">
            {value.map((item, index) => (
              <div key={`${path}.${index}`} className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2">
                {renderPrimitiveValue(
                  item as Primitive,
                  onImageClick ? (src) => onImageClick(src, `${label} ${index + 1}`) : undefined
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div key={path} className="space-y-3 rounded-md border bg-slate-50/70 p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
        <div className="space-y-3">
          {value.map((item, index) => (
            <Card key={`${path}.${index}`} className="shadow-none border-slate-200">
              <CardHeader className="py-3">
                <CardTitle className="text-sm">{humanizeKey(label)} {index + 1}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {isPlainObject(item)
                  ? Object.entries(item).map(([childKey, childValue]) =>
                      renderNode(humanizeKey(childKey), childValue, `${path}.${index}.${childKey}`, onImageClick, depth + 1)
                    )
                  : renderNode(`${humanizeKey(label)} ${index + 1}`, item, `${path}.${index}`, onImageClick, depth + 1)}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return (
        <div key={path} className="space-y-1 rounded-md border bg-white p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
          <div className="text-sm text-slate-500">Sin registros</div>
        </div>
      );
    }

    return (
      <Card key={path} className={depth === 0 ? "border-slate-200 shadow-sm" : "shadow-none border-slate-200"}>
        <CardHeader className={depth === 0 ? "pb-3 bg-slate-50/70" : "pb-3"}>
          <CardTitle className={depth === 0 ? "text-base text-slate-900" : "text-sm text-slate-800"}>{label}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {entries.map(([childKey, childValue]) => renderNode(humanizeKey(childKey), childValue, `${path}.${childKey}`, onImageClick, depth + 1))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div key={path} className="rounded-md border bg-white p-3 text-sm text-slate-500">
      {label}: sin visualización disponible
    </div>
  );
}

// ── Componentes de apoyo para el editor estructurado ─────────────────────────

function StructuredSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-slate-200 overflow-hidden">
      <div className="bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">{title}</div>
      <div className="p-4 grid gap-3">{children}</div>
    </div>
  );
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-3">{children}</div>;
}

function StructuredField({
  label,
  value,
  onChange,
  multiline = false,
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-slate-600">{label}</Label>
      {multiline ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          className="min-h-[72px] text-sm resize-y"
          placeholder={readOnly ? undefined : `${label}...`}
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          className="text-sm"
          placeholder={readOnly ? undefined : `${label}...`}
        />
      )}
    </div>
  );
}

function StructuredSelectField({
  label,
  value,
  onChange,
  options = ["Sí", "No"],
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options?: string[];
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-slate-600">{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">— seleccionar —</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

export function VisitCapturePanel({
  data,
  portalUrl,
  portalStatus,
  canEdit = false,
  isSaving = false,
  onSave,
  auditEntries = [],
}: VisitCapturePanelProps) {
  // ── Estado lightbox de imágenes ──────────────────────────────────────
  const [lightbox, setLightbox] = useState<{ open: boolean; src: string; label: string }>({ open: false, src: "", label: "" });

  const handleImageClick = useCallback((src: string, label: string) => {
    setLightbox({ open: true, src, label });
  }, []);

  // ── Estado del editor estructurado ───────────────────────────────────
  type DeepPartial<T> = { [K in keyof T]?: DeepPartial<T[K]> };
  const [structuredDraft, setStructuredDraft] = useState<Record<string, any>>({});

  const sourceLocation = useMemo(() => {
    const draftLocation = isPlainObject(structuredDraft.ubicacion) ? structuredDraft.ubicacion : null;
    if (draftLocation && Object.keys(draftLocation).length > 0) return draftLocation;
    return isPlainObject(data?.ubicacion) ? data.ubicacion : {};
  }, [data, structuredDraft.ubicacion]);

  const mapAssets = useMemo(() => getLocationMapAssets(sourceLocation), [sourceLocation]);
  const gpsDisplay = useMemo(() => formatGpsDisplay(sourceLocation.gps), [sourceLocation]);

  useEffect(() => {
    // Inicializar el draft estructurado con los datos actuales
    const mkArr = <T extends object>(key: string, n: number, empty: T): T[] => {
      const existing = Array.isArray(data?.[key]) ? (data?.[key] as T[]) : [];
      const deficit = Math.max(0, n - existing.length);
      return [...existing, ...Array.from({ length: deficit }, () => ({ ...empty }))];
    };
    setStructuredDraft({
      ubicacion: { cp: "", gps: "", estado: "", domicilio: "", coloniaMunicipio: "", ...(data?.ubicacion as Record<string, any> || {}) },
      academica: { gradoEstudios: "", institucion: "", ciudad: "", periodo: "", documento: "", folio: "", equipos: "", programas: "", funcionesAdmin: "", otrosConocimientos: "", ...(data?.academica as Record<string, any> || {}) },
      documentos: {
        tipoSangre: "",
        actaNacimiento: { tiene: false, foto: "" },
        credencialElector: { tiene: false, fotoFrente: "", fotoReverso: "" },
        comprobanteDomicilio: { tiene: false, foto: "", nombreTitular: "", parentescoTitular: "" },
        cartillaMilitar: { tiene: false, foto: "" },
        pasaporte: { tiene: false, foto: "" },
        visaAmericana: { tiene: false, foto: "" },
        cartasRecomendacion: { tiene: false, foto: "" },
        creditoInfonavit: { texto: "", foto: "" },
        afore: { nombre: "", foto: "" },
        licenciaConducir: { tiene: false, fotoFrente: "", fotoReverso: "" },
        certificadoTitulo: { tiene: false, foto: "" },
        ...(data?.documentos as Record<string, any> || {}),
      },
      dinamicaFamiliar: { trabajoEUA: "", vivenSolos: "", tieneDeudas: "", acuerdoPareja: "", esposaEmbarazada: "", institucionDeuda: "", pensionAlimenticia: "", ...(data?.dinamicaFamiliar as Record<string, any> || {}) },
      inmueble: { zona: "", fachada: "", muebles: "", niveles: "", numBanos: "", tipoCasa: "", superficie: "", tieneSala: "", tienePatio: "", tieneCocina: "", tieneJardin: "", tieneCochera: "", tieneComedor: "", valorAprox: "", numRecamaras: "", precioPasaje: "", estadoMuebles: "", ordenLimpieza: "", pisosMaterial: "", estadoVivienda: "", tiempoTraslado: "", medioTransporte: "", paredesMaterial: "", tiempoResidenciaActual: "", tiempoResidenciaAnterior: "", ...(data?.inmueble as Record<string, any> || {}) },
      salud: { fuma: "", toma: "", alergias: "", causaCita: "", accidentes: "", tipoBebida: "", ultimaCita: "", cigarrosDia: "", estadoSalud: "", cadaCuandoToma: "", cualesAlergias: "", servicioMedico: "", cuidadosMedicos: "", cualesEnfermedades: "", enfermedadesCronicas: "", ...(data?.salud as Record<string, any> || {}) },
      social: { tatuajes: "", asisteBares: "", deporteCual: "", partidoCual: "", pasatiempos: "", religiosoCual: "", afiliadoPartido: "", asisteReligioso: "", practicaDeporte: "", actividadFamiliar: "", deporteFrecuencia: "", religiosoFrecuencia: "", actividadFamiliarCual: "", actividadFamiliarFrecuencia: "", ...(data?.social as Record<string, any> || {}) },
      juridica: { procesoLegal: "", procesoLegalQuien: "", procesoLegalPorQue: "", ...(data?.juridica as Record<string, any> || {}) },
      otrosDatos: { trabajoGrupo: "", ...(data?.otrosDatos as Record<string, any> || {}) },
      egresos: { alimentacion: "", vestido: "", colegiaturas: "", tarjetas: "", transporte: "", renta: "", gastosMedicos: "", recreaciones: "", otrosGastos: "", servicios: { agua: "", luz: "", telefono: "", gas: "", tvPaga: "", internet: "" }, ...(data?.egresos as Record<string, any> || {}) },
      fotos: { sala: "", cocina: "", comedor: "", fachadaCalle: "", fachadaPatio: "", ...(data?.fotos as Record<string, any> || {}) },
      evidenciasGraficas: Array.isArray(data?.evidenciasGraficas) ? [...(data.evidenciasGraficas as string[])] : [],
      cursos: (data?.cursos as string) || "",
      conclusion: (data?.conclusion as string) || "",
      comentarios: (data?.comentarios as string) || "",
      cierre: { observaciones: (data?.cierre as Record<string, any>)?.observaciones || "", ...(data?.cierre as Record<string, any> || {}) },
      familiares: mkArr("familiares", 2, { nombre: "", parentesco: "", edad: "", escolaridad: "", ocupacion: "", lugarResidencia: "", habitaDomicilio: "" }),
      creditos: mkArr("creditos", 0, { institucion: "", monto: "", mensualidad: "", adeudo: "" }),
      refPersonales: mkArr("refPersonales", 1, { nombre: "", ocupacion: "", telefono: "", lugarResidencia: "", comoSeAnuncia: "" }),
      refVecinales: mkArr("refVecinales", 1, { nombre: "", ocupacion: "", telefono: "", lugarResidencia: "", comoSeAnuncia: "" }),
      // Ingresos: lee del portal (clave 'ingresos', campos sueldo/otrosIngresos) o del editor legacy (ingresosArray)
      ingresos: (() => {
        const fromPortal = Array.isArray(data?.ingresos) ? (data.ingresos as any[]) : [];
        const fromLegacy = Array.isArray((data as any)?.ingresosArray) ? ((data as any).ingresosArray as any[]) : [];
        if (fromPortal.length > 0) return fromPortal;
        if (fromLegacy.length > 0) return fromLegacy;
        return [
          { nombre: "", parentesco: "", sueldo: "", otrosIngresos: "" },
          { nombre: "", parentesco: "", sueldo: "", otrosIngresos: "" },
        ];
      })(),
      otrasPersonas: mkArr("otrasPersonas", 0, { parentesco: "", nombre: "", edad: "", escolaridad: "", ocupacion: "", lugarResidencia: "", habitaDomicilio: "" }),
      vivienda: { personasDiscapacidad: "", discapacidadQuien: "", discapacidadTipo: "", numDependientes: "", detalleDependientes: "", matrimoniosAnteriores: "", hijosMatrimoniosAnteriores: "", cuantosHijosAnteriores: "", proporcionaPension: "", cantidadPension: "", quienCuida: "", dondeViveCuida: "", acuerdoParejaVivienda: "", comprendeActividades: "", sabeForaneas: "", inconvenienteAusencia: "", ...(data?.vivienda as Record<string, any> || {}) },
      patrimonio: { desempleoActividad: "", desempleoIngreso: "", desempleoAnuncio: "", ...(data?.patrimonio as Record<string, any> || {}) },
      bienesRaices: mkArr("bienesRaices", 0, { tipo: "", ubicacion: "", valor: "", aNombreDe: "" }),
      vehiculos: mkArr("vehiculos", 0, { marcaModelo: "", valorComercial: "", saldo: "", aNombreDe: "" }),
      negocios: mkArr("negocios", 0, { tipoNombre: "", ubicacion: "", propietario: "" }),
    });
  }, [data]);

  const topLevelEntries = useMemo(() => Object.entries(data || {}), [data]);

  // ── Helpers de cambio para editor estructurado ─────────────────────
  function setField(section: string, key: string, value: string) {
    setStructuredDraft((prev) => ({
      ...prev,
      [section]: { ...(prev[section] || {}), [key]: value },
    }));
  }

  function setTopField(key: string, value: string) {
    setStructuredDraft((prev) => ({ ...prev, [key]: value }));
  }

  function setArrayField(section: string, index: number, key: string, value: string) {
    setStructuredDraft((prev) => {
      const arr = Array.isArray(prev[section]) ? [...(prev[section] as any[])] : [];
      arr[index] = { ...(arr[index] || {}), [key]: value };
      return { ...prev, [section]: arr };
    });
  }

  function addArrayItem(section: string, emptyItem: Record<string, string>) {
    setStructuredDraft((prev) => ({
      ...prev,
      [section]: [...(Array.isArray(prev[section]) ? (prev[section] as any[]) : []), { ...emptyItem }],
    }));
  }

  function removeArrayItem(section: string, index: number) {
    setStructuredDraft((prev) => ({
      ...prev,
      [section]: (Array.isArray(prev[section]) ? (prev[section] as any[]) : []).filter((_, j) => j !== index),
    }));
  }

  function setStringArrayItem(section: string, index: number, value: string) {
    setStructuredDraft((prev) => {
      const arr = Array.isArray(prev[section]) ? [...(prev[section] as string[])] : [];
      arr[index] = value;
      return { ...prev, [section]: arr };
    });
  }

  function addStringArrayItem(section: string, initialValue = "") {
    setStructuredDraft((prev) => ({
      ...prev,
      [section]: [...(Array.isArray(prev[section]) ? (prev[section] as string[]) : []), initialValue],
    }));
  }

  /** Actualiza un subcampo dentro de un documento anidado en documentos (ej: credencialElector.fotoFrente). */
  function setDocSubField(docKey: string, subKey: string, value: string) {
    setStructuredDraft((prev) => {
      const docs = (prev.documentos as Record<string, any>) || {};
      const doc = (typeof docs[docKey] === "object" && docs[docKey] !== null) ? docs[docKey] : {};
      return {
        ...prev,
        documentos: { ...docs, [docKey]: { ...doc, [subKey]: value } },
      };
    });
  }

  // ── Guardar desde editor estructurado ─────────────────────────────
  const handleSaveStructured = () => {
    if (!onSave) return;
    const patch = buildVisitCapturePatch(data || {}, structuredDraft) as Record<string, unknown> | undefined;
    const merged = mergeVisitCapture(data || {}, patch || {}) as Record<string, unknown>;
    onSave(merged);
  };

  return (
    <>
    <Tabs defaultValue={canEdit ? "formulario" : "vista"} className="w-full">
      {/* Pestañas disponibles según rol */}
      <TabsList className={canEdit ? "grid w-full grid-cols-2" : "grid w-full grid-cols-1"}>
        {!canEdit && <TabsTrigger value="vista">Vista</TabsTrigger>}
        {canEdit && (
          <TabsTrigger value="formulario">Formulario</TabsTrigger>
        )}
        {canEdit && <TabsTrigger value="historial"><History className="h-3.5 w-3.5 mr-1.5" />Historial</TabsTrigger>}
      </TabsList>

      {/* ── PESTAÑA: VISTA ─────────────────────────────────────────────── */}
      {!canEdit && (
      <TabsContent value="vista" className="space-y-4 pt-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-white p-4 space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Estado del acceso</div>
            <div className="flex items-center gap-2 text-sm text-slate-900">
              {portalStatus === "COMPLETADO" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Clock3 className="h-4 w-4 text-amber-600" />}
              <span>{portalStatus || "Sin enlace generado"}</span>
            </div>
          </div>
          <div className="rounded-lg border bg-white p-4 space-y-1 md:col-span-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Referencia del acceso original</div>
            <div className="text-sm text-slate-800 break-all">{portalUrl || "Sin URL registrada"}</div>
          </div>
        </div>

        {topLevelEntries.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-slate-50 p-8 text-center text-sm text-slate-500">
            Aún no hay captura registrada para esta visita.
          </div>
        ) : (
          <ScrollArea className="h-[58vh] pr-3">
            <div className="space-y-4">
              {/* Mapa guardado con el pin del domicilio visitado */}
              {(mapAssets.staticMapUrl || mapAssets.embedUrl) && (
                <div className="rounded-lg border bg-white p-4 space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Mapa — pin del domicilio visitado</div>
                  {mapAssets.staticMapUrl ? (
                    <img
                      src={mapAssets.staticMapUrl}
                      alt="Mapa del domicilio visitado"
                      className="w-full rounded border border-slate-200 object-cover"
                      style={{ maxHeight: 220 }}
                    />
                  ) : (
                    <iframe
                      src={mapAssets.embedUrl || undefined}
                      title="Mapa del domicilio visitado"
                      className="h-[220px] w-full rounded border border-slate-200"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  )}
                  {mapAssets.gps && (
                    <p className="text-xs text-slate-600">
                      GPS: {mapAssets.gps.lat.toFixed(6)}, {mapAssets.gps.lon.toFixed(6)}
                      {Number.isFinite(mapAssets.gps.accuracy) ? ` (±${Number(mapAssets.gps.accuracy).toFixed(0)} m)` : ""}
                    </p>
                  )}
                  {mapAssets.openUrl && (
                    <a
                      href={mapAssets.openUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs text-blue-700 underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Abrir mapa en Google Maps
                    </a>
                  )}
                </div>
              )}
              {topLevelEntries.map(([sectionKey, sectionValue]) => renderNode(humanizeKey(sectionKey), sectionValue, sectionKey, handleImageClick))}
            </div>
          </ScrollArea>
        )}
      </TabsContent>
      )}

      {/* ── PESTAÑA: FORMULARIO (editor estructurado para analistas) ────── */}
      {canEdit && (
        <TabsContent value="formulario" className="space-y-4 pt-4">
          <div className="rounded-lg border bg-white p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Editor estructurado — analistas</div>
                <div className="text-xs text-slate-500">
                  Edita los campos operativos del formulario. Los cambios se fusionan con la captura original preservando datos no mostrados aquí.
                </div>
              </div>
              <Button onClick={handleSaveStructured} disabled={isSaving}>
                <PencilLine className="h-4 w-4 mr-2" />
                {isSaving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
            <Separator />

            <ScrollArea className="h-[60vh] pr-2">
              <div className="space-y-5">

                {/* ── Ubicación ─────────────────────────────────────────── */}
                <StructuredSection title="Ubicación y domicilio">
                  <FieldRow>
                    <StructuredField label="Domicilio" value={(structuredDraft.ubicacion as any)?.domicilio || ""} onChange={(v) => setField("ubicacion", "domicilio", v)} />
                    <StructuredField label="Código postal" value={(structuredDraft.ubicacion as any)?.cp || ""} onChange={(v) => setField("ubicacion", "cp", v)} />
                  </FieldRow>
                  <FieldRow>
                    <StructuredField label="Colonia / Municipio" value={(structuredDraft.ubicacion as any)?.coloniaMunicipio || ""} onChange={(v) => setField("ubicacion", "coloniaMunicipio", v)} />
                    <StructuredField label="Estado" value={(structuredDraft.ubicacion as any)?.estado || ""} onChange={(v) => setField("ubicacion", "estado", v)} />
                  </FieldRow>
                  <StructuredField label="GPS (coordenadas)" value={gpsDisplay} onChange={() => {}} readOnly />
                  {/* Mapa guardado por el encuestador (solo lectura en el panel de analista) */}
                  {(mapAssets.staticMapUrl || mapAssets.embedUrl) && (
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-600">Mapa capturado en visita</Label>
                      {mapAssets.staticMapUrl ? (
                        <img
                          src={mapAssets.staticMapUrl}
                          alt="Mapa del domicilio"
                          className="w-full rounded border border-slate-200"
                          style={{ maxHeight: 180 }}
                        />
                      ) : (
                        <iframe
                          src={mapAssets.embedUrl || undefined}
                          title="Mapa del domicilio"
                          className="h-[180px] w-full rounded border border-slate-200"
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      )}
                      {mapAssets.gps && (
                        <p className="text-xs text-slate-500">
                          {mapAssets.gps.lat.toFixed(6)}, {mapAssets.gps.lon.toFixed(6)}
                        </p>
                      )}
                      {mapAssets.openUrl && (
                        <a
                          href={mapAssets.openUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-xs text-blue-700 underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Abrir mapa en Google Maps
                        </a>
                      )}
                    </div>
                  )}
                </StructuredSection>

                {/* ── Académica ─────────────────────────────────────────── */}
                <StructuredSection title="Información académica">
                  <FieldRow>
                    <StructuredField label="Grado de estudios" value={(structuredDraft.academica as any)?.gradoEstudios || ""} onChange={(v) => setField("academica", "gradoEstudios", v)} />
                    <StructuredField label="Institución" value={(structuredDraft.academica as any)?.institucion || ""} onChange={(v) => setField("academica", "institucion", v)} />
                  </FieldRow>
                  <FieldRow>
                    <StructuredField label="Ciudad" value={(structuredDraft.academica as any)?.ciudad || ""} onChange={(v) => setField("academica", "ciudad", v)} />
                    <StructuredField label="Periodo" value={(structuredDraft.academica as any)?.periodo || ""} onChange={(v) => setField("academica", "periodo", v)} />
                  </FieldRow>
                  <FieldRow>
                    <StructuredField label="Documento obtenido" value={(structuredDraft.academica as any)?.documento || ""} onChange={(v) => setField("academica", "documento", v)} />
                    <StructuredField label="Folio del documento" value={(structuredDraft.academica as any)?.folio || ""} onChange={(v) => setField("academica", "folio", v)} />
                  </FieldRow>
                  <FieldRow>
                    <StructuredField label="Programas" value={(structuredDraft.academica as any)?.programas || ""} onChange={(v) => setField("academica", "programas", v)} />
                    <StructuredField label="Equipos y maquinaria" value={(structuredDraft.academica as any)?.equipos || ""} onChange={(v) => setField("academica", "equipos", v)} />
                  </FieldRow>
                  <StructuredField label="Funciones administrativas" value={(structuredDraft.academica as any)?.funcionesAdmin || ""} onChange={(v) => setField("academica", "funcionesAdmin", v)} multiline />
                  <StructuredField label="Otros conocimientos" value={(structuredDraft.academica as any)?.otrosConocimientos || ""} onChange={(v) => setField("academica", "otrosConocimientos", v)} multiline />
                </StructuredSection>

                {/* ── Documentos (estructura real del portal encuestador) ── */}
                <StructuredSection title="Cotejo de documentos">
                  {/* Tipo de sangre y AFORE-nombre (campos escalares simples) */}
                  <FieldRow>
                    <StructuredField label="Tipo de sangre" value={(structuredDraft.documentos as any)?.tipoSangre || ""} onChange={(v) => setField("documentos", "tipoSangre", v)} />
                    <StructuredField label="AFORE (afiliado en)" value={typeof (structuredDraft.documentos as any)?.afore === "object" ? ((structuredDraft.documentos as any).afore?.nombre ?? "") : ""} onChange={(v) => setDocSubField("afore", "nombre", v)} />
                  </FieldRow>
                  {/* Foto AFORE */}
                  {(() => {
                    const doc = (structuredDraft.documentos as any)?.afore ?? {};
                    const foto: string = typeof doc === "object" ? (doc.foto ?? "") : "";
                    return (
                      <div className="pl-1">
                        <div className="text-[10px] text-slate-500 mb-1">Foto AFORE</div>
                        <ImageValueEditor
                          label="AFORE"
                          value={foto}
                          onChange={(value) => setDocSubField("afore", "foto", value)}
                          onPreview={handleImageClick}
                        />
                      </div>
                    );
                  })()}

                  {/* Documentos con foto única: tiene + foto */}
                  {(([
                    { key: "actaNacimiento", label: "Acta de nacimiento" },
                    { key: "cartillaMilitar", label: "Cartilla militar" },
                    { key: "pasaporte", label: "Pasaporte" },
                    { key: "visaAmericana", label: "Visa americana" },
                    { key: "cartasRecomendacion", label: "Cartas de recomendación" },
                    { key: "certificadoTitulo", label: "Certificado o título" },
                  ]) as { key: string; label: string }[]).map(({ key, label }) => {
                    const doc = (structuredDraft.documentos as any)?.[key] ?? {};
                    const foto: string = typeof doc === "object" ? (doc.foto ?? "") : "";
                    const tiene: boolean = typeof doc === "object" ? !!doc.tiene : false;
                    return (
                      <div key={key} className="rounded border border-slate-100 bg-slate-50 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-700">{label}</span>
                          <Badge variant={tiene ? "default" : "outline"} className="text-[10px]">{tiene ? "Presentó" : "No presentó"}</Badge>
                        </div>
                        <ImageValueEditor
                          label={label}
                          value={foto}
                          onChange={(value) => setDocSubField(key, "foto", value)}
                          onPreview={handleImageClick}
                        />
                      </div>
                    );
                  })}

                  {/* Credencial de elector (INE) — frente y reverso */}
                  {(() => {
                    const doc = (structuredDraft.documentos as any)?.credencialElector ?? {};
                    const tiene: boolean = typeof doc === "object" ? !!doc.tiene : false;
                    const fotoFrente: string = typeof doc === "object" ? (doc.fotoFrente ?? "") : "";
                    const fotoReverso: string = typeof doc === "object" ? (doc.fotoReverso ?? "") : "";
                    return (
                      <div className="rounded border border-slate-100 bg-slate-50 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-700">Credencial de elector (INE)</span>
                          <Badge variant={tiene ? "default" : "outline"} className="text-[10px]">{tiene ? "Presentó" : "No presentó"}</Badge>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-0.5">
                            <div className="text-[10px] text-slate-500">Frente</div>
                            <ImageValueEditor
                              label="INE Frente"
                              value={fotoFrente}
                              onChange={(value) => setDocSubField("credencialElector", "fotoFrente", value)}
                              onPreview={handleImageClick}
                            />
                          </div>
                          <div className="space-y-0.5">
                            <div className="text-[10px] text-slate-500">Reverso</div>
                            <ImageValueEditor
                              label="INE Reverso"
                              value={fotoReverso}
                              onChange={(value) => setDocSubField("credencialElector", "fotoReverso", value)}
                              onPreview={handleImageClick}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Licencia de conducir — frente y reverso */}
                  {(() => {
                    const doc = (structuredDraft.documentos as any)?.licenciaConducir ?? {};
                    const tiene: boolean = typeof doc === "object" ? !!doc.tiene : false;
                    const fotoFrente: string = typeof doc === "object" ? (doc.fotoFrente ?? "") : "";
                    const fotoReverso: string = typeof doc === "object" ? (doc.fotoReverso ?? "") : "";
                    return (
                      <div className="rounded border border-slate-100 bg-slate-50 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-700">Licencia de conducir</span>
                          <Badge variant={tiene ? "default" : "outline"} className="text-[10px]">{tiene ? "Presentó" : "No presentó"}</Badge>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-0.5">
                            <div className="text-[10px] text-slate-500">Frente</div>
                            <ImageValueEditor
                              label="Licencia Frente"
                              value={fotoFrente}
                              onChange={(value) => setDocSubField("licenciaConducir", "fotoFrente", value)}
                              onPreview={handleImageClick}
                            />
                          </div>
                          <div className="space-y-0.5">
                            <div className="text-[10px] text-slate-500">Reverso</div>
                            <ImageValueEditor
                              label="Licencia Reverso"
                              value={fotoReverso}
                              onChange={(value) => setDocSubField("licenciaConducir", "fotoReverso", value)}
                              onPreview={handleImageClick}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Comprobante de domicilio — foto + campos editables */}
                  {(() => {
                    const doc = (structuredDraft.documentos as any)?.comprobanteDomicilio ?? {};
                    const tiene: boolean = typeof doc === "object" ? !!doc.tiene : false;
                    const foto: string = typeof doc === "object" ? (doc.foto ?? "") : "";
                    const nombreTitular: string = typeof doc === "object" ? (doc.nombreTitular ?? "") : "";
                    const parentescoTitular: string = typeof doc === "object" ? (doc.parentescoTitular ?? "") : "";
                    return (
                      <div className="rounded border border-slate-100 bg-slate-50 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-700">Comprobante de domicilio</span>
                          <Badge variant={tiene ? "default" : "outline"} className="text-[10px]">{tiene ? "Presentó" : "No presentó"}</Badge>
                        </div>
                        <ImageValueEditor
                          label="Comprobante de domicilio"
                          value={foto}
                          onChange={(value) => setDocSubField("comprobanteDomicilio", "foto", value)}
                          onPreview={handleImageClick}
                        />
                        <FieldRow>
                          <StructuredField label="A nombre de" value={nombreTitular} onChange={(v) => setDocSubField("comprobanteDomicilio", "nombreTitular", v)} />
                          <StructuredField label="Parentesco con titular" value={parentescoTitular} onChange={(v) => setDocSubField("comprobanteDomicilio", "parentescoTitular", v)} />
                        </FieldRow>
                      </div>
                    );
                  })()}

                  {/* Crédito Infonavit — número/monto editable + foto */}
                  {(() => {
                    const doc = (structuredDraft.documentos as any)?.creditoInfonavit ?? {};
                    const foto: string = typeof doc === "object" ? (doc.foto ?? "") : "";
                    const texto: string = typeof doc === "object" ? (doc.texto ?? "") : "";
                    return (
                      <div className="rounded border border-slate-100 bg-slate-50 p-3 space-y-2">
                        <span className="text-xs font-semibold text-slate-700 block">Crédito Infonavit (número y monto)</span>
                        <StructuredField label="Número / monto" value={texto} onChange={(v) => setDocSubField("creditoInfonavit", "texto", v)} />
                        <ImageValueEditor
                          label="Crédito Infonavit"
                          value={foto}
                          onChange={(value) => setDocSubField("creditoInfonavit", "foto", value)}
                          onPreview={handleImageClick}
                        />
                      </div>
                    );
                  })()}
                </StructuredSection>

                {/* ── Familiares (array 2) ──────────────────────────────── */}
                <StructuredSection title="Familiares en el domicilio">
                  {((structuredDraft.familiares as any[]) || []).map((fam: any, i: number) => (
                    <div key={i} className="rounded border border-slate-200 p-3 space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="text-xs font-semibold text-slate-500 uppercase">Familiar {i + 1}</div>
                        <button type="button" onClick={() => removeArrayItem("familiares", i)} className="text-xs text-red-500 hover:text-red-700">Eliminar</button>
                      </div>
                      <FieldRow>
                        <StructuredField label="Nombre" value={fam.nombre || ""} onChange={(v) => setArrayField("familiares", i, "nombre", v)} />
                        <StructuredSelectField label="Parentesco" value={fam.parentesco || ""} onChange={(v) => setArrayField("familiares", i, "parentesco", v)} options={["Candidato", "Padre", "Madre", "Esposo/a", "Hijo/a", "Hermano/a", "Otro"]} />
                      </FieldRow>
                      <FieldRow>
                        <StructuredField label="Edad" value={fam.edad || ""} onChange={(v) => setArrayField("familiares", i, "edad", v)} />
                        <StructuredSelectField label="Escolaridad" value={fam.escolaridad || ""} onChange={(v) => setArrayField("familiares", i, "escolaridad", v)} options={["Sin estudios", "Primaria", "Secundaria", "Preparatoria", "Técnico", "Licenciatura", "Maestría", "Doctorado"]} />
                      </FieldRow>
                      <StructuredField label="Ocupación" value={fam.ocupacion || ""} onChange={(v) => setArrayField("familiares", i, "ocupacion", v)} />
                      <FieldRow>
                        <StructuredField label="Lugar de residencia" value={fam.lugarResidencia || ""} onChange={(v) => setArrayField("familiares", i, "lugarResidencia", v)} />
                        <StructuredSelectField label="¿Habita en el domicilio?" value={fam.habitaDomicilio === true || fam.habitaDomicilio === "Sí" ? "Sí" : fam.habitaDomicilio === false || fam.habitaDomicilio === "No" ? "No" : ""} onChange={(v) => setArrayField("familiares", i, "habitaDomicilio", v)} />
                      </FieldRow>
                    </div>
                  ))}
                  <button type="button" onClick={() => addArrayItem("familiares", { parentesco: "", nombre: "", edad: "", escolaridad: "", ocupacion: "", lugarResidencia: "", habitaDomicilio: "" })} className="text-xs text-blue-600 hover:text-blue-800 border border-dashed border-blue-300 rounded px-3 py-1.5 w-full">+ Agregar familiar</button>
                </StructuredSection>

                {/* ── Otras personas en el domicilio (array) ───────────── */}
                <StructuredSection title="Otras personas en el domicilio (no familiares directos)">
                  {((structuredDraft.otrasPersonas as any[]) || []).length === 0 && (
                    <div className="text-xs text-slate-500 italic">Sin otras personas registradas.</div>
                  )}
                  {((structuredDraft.otrasPersonas as any[]) || []).map((p: any, i: number) => (
                    <div key={i} className="rounded border border-slate-200 p-3 space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="text-xs font-semibold text-slate-500 uppercase">Persona {i + 1}</div>
                        <button type="button" onClick={() => removeArrayItem("otrasPersonas", i)} className="text-xs text-red-500 hover:text-red-700">Eliminar</button>
                      </div>
                      <FieldRow>
                        <StructuredField label="Nombre" value={p.nombre || ""} onChange={(v) => setArrayField("otrasPersonas", i, "nombre", v)} />
                        <StructuredSelectField label="Parentesco" value={p.parentesco || ""} onChange={(v) => setArrayField("otrasPersonas", i, "parentesco", v)} options={["Candidato", "Padre", "Madre", "Esposo/a", "Hijo/a", "Hermano/a", "Otro"]} />
                      </FieldRow>
                      <FieldRow>
                        <StructuredField label="Edad" value={p.edad || ""} onChange={(v) => setArrayField("otrasPersonas", i, "edad", v)} />
                        <StructuredSelectField label="Escolaridad" value={p.escolaridad || ""} onChange={(v) => setArrayField("otrasPersonas", i, "escolaridad", v)} options={["Sin estudios", "Primaria", "Secundaria", "Preparatoria", "Técnico", "Licenciatura", "Maestría", "Doctorado"]} />
                      </FieldRow>
                      <FieldRow>
                        <StructuredField label="Ocupación" value={p.ocupacion || ""} onChange={(v) => setArrayField("otrasPersonas", i, "ocupacion", v)} />
                        <StructuredField label="Lugar de residencia" value={p.lugarResidencia || ""} onChange={(v) => setArrayField("otrasPersonas", i, "lugarResidencia", v)} />
                      </FieldRow>
                      <StructuredSelectField label="¿Habita en el domicilio?" value={p.habitaDomicilio === true || p.habitaDomicilio === "Sí" ? "Sí" : p.habitaDomicilio === false || p.habitaDomicilio === "No" ? "No" : ""} onChange={(v) => setArrayField("otrasPersonas", i, "habitaDomicilio", v)} />
                    </div>
                  ))}
                  <button type="button" onClick={() => addArrayItem("otrasPersonas", { parentesco: "", nombre: "", edad: "", escolaridad: "", ocupacion: "", lugarResidencia: "", habitaDomicilio: "" })} className="text-xs text-blue-600 hover:text-blue-800 border border-dashed border-blue-300 rounded px-3 py-1.5 w-full">+ Agregar persona</button>
                </StructuredSection>

                {/* ── Dinámica familiar ────────────────────────────────── */}
                <StructuredSection title="Dinámica familiar">
                  <FieldRow>
                    <StructuredSelectField label="¿Viven solos?" value={(structuredDraft.dinamicaFamiliar as any)?.vivenSolos || ""} onChange={(v) => setField("dinamicaFamiliar", "vivenSolos", v)} />
                    <StructuredSelectField label="Pareja de acuerdo" value={(structuredDraft.dinamicaFamiliar as any)?.acuerdoPareja || ""} onChange={(v) => setField("dinamicaFamiliar", "acuerdoPareja", v)} />
                  </FieldRow>
                  <FieldRow>
                    <StructuredSelectField label="Esposa embarazada" value={(structuredDraft.dinamicaFamiliar as any)?.esposaEmbarazada || ""} onChange={(v) => setField("dinamicaFamiliar", "esposaEmbarazada", v)} />
                    <StructuredSelectField label="¿Tiene deudas?" value={(structuredDraft.dinamicaFamiliar as any)?.tieneDeudas || ""} onChange={(v) => setField("dinamicaFamiliar", "tieneDeudas", v)} />
                  </FieldRow>
                  <FieldRow>
                    <StructuredField label="Institución de deuda" value={(structuredDraft.dinamicaFamiliar as any)?.institucionDeuda || ""} onChange={(v) => setField("dinamicaFamiliar", "institucionDeuda", v)} />
                    <StructuredSelectField label="Pensión alimenticia" value={(structuredDraft.dinamicaFamiliar as any)?.pensionAlimenticia || ""} onChange={(v) => setField("dinamicaFamiliar", "pensionAlimenticia", v)} />
                  </FieldRow>
                  <FieldRow>
                    <StructuredSelectField label="Trabajó en EE.UU." value={(structuredDraft.dinamicaFamiliar as any)?.trabajoEUA || ""} onChange={(v) => setField("dinamicaFamiliar", "trabajoEUA", v)} />
                    <StructuredField label="¿Quién cuida a sus hijos?" value={(structuredDraft.dinamicaFamiliar as any)?.quienCuidaHijos || ""} onChange={(v) => setField("dinamicaFamiliar", "quienCuidaHijos", v)} />
                  </FieldRow>
                  <FieldRow>
                    <StructuredField label="¿Dónde vive quien cuida?" value={(structuredDraft.dinamicaFamiliar as any)?.dondeViveCuidador || ""} onChange={(v) => setField("dinamicaFamiliar", "dondeViveCuidador", v)} />
                    <StructuredField label="Edad de sus hijos" value={(structuredDraft.dinamicaFamiliar as any)?.edadHijos || ""} onChange={(v) => setField("dinamicaFamiliar", "edadHijos", v)} />
                  </FieldRow>
                </StructuredSection>

                {/* ── Dinámica y estructura de la vivienda (Sec 10) ────── */}
                <StructuredSection title="Dinámica y estructura de la vivienda">
                  <FieldRow>
                    <StructuredSelectField label="¿Personas con discapacidad en casa?" value={(structuredDraft.vivienda as any)?.personasDiscapacidad || ""} onChange={(v) => setField("vivienda", "personasDiscapacidad", v)} />
                    <StructuredField label="¿Quién?" value={(structuredDraft.vivienda as any)?.discapacidadQuien || ""} onChange={(v) => setField("vivienda", "discapacidadQuien", v)} />
                  </FieldRow>
                  <FieldRow>
                    <StructuredField label="Tipo de discapacidad" value={(structuredDraft.vivienda as any)?.discapacidadTipo || ""} onChange={(v) => setField("vivienda", "discapacidadTipo", v)} />
                    <StructuredField label="N.º dependientes económicos" value={(structuredDraft.vivienda as any)?.numDependientes || ""} onChange={(v) => setField("vivienda", "numDependientes", v)} />
                  </FieldRow>
                  <StructuredField label="Detalle de dependientes (quiénes)" value={(structuredDraft.vivienda as any)?.detalleDependientes || ""} onChange={(v) => setField("vivienda", "detalleDependientes", v)} />
                  <FieldRow>
                    <StructuredSelectField label="¿Matrimonios / uniones anteriores?" value={(structuredDraft.vivienda as any)?.matrimoniosAnteriores || ""} onChange={(v) => setField("vivienda", "matrimoniosAnteriores", v)} />
                    <StructuredSelectField label="¿Hijos en esos matrimonios?" value={(structuredDraft.vivienda as any)?.hijosMatrimoniosAnteriores || ""} onChange={(v) => setField("vivienda", "hijosMatrimoniosAnteriores", v)} />
                  </FieldRow>
                  <FieldRow>
                    <StructuredField label="¿Cuántos hijos anteriores?" value={(structuredDraft.vivienda as any)?.cuantosHijosAnteriores || ""} onChange={(v) => setField("vivienda", "cuantosHijosAnteriores", v)} />
                    <StructuredSelectField label="¿Proporciona pensión alimenticia?" value={(structuredDraft.vivienda as any)?.proporcionaPension || ""} onChange={(v) => setField("vivienda", "proporcionaPension", v)} />
                  </FieldRow>
                  <FieldRow>
                    <StructuredField label="Cantidad de pensión mensual ($)" value={(structuredDraft.vivienda as any)?.cantidadPension || ""} onChange={(v) => setField("vivienda", "cantidadPension", v)} />
                    <StructuredField label="¿Quién cuida a sus hijos?" value={(structuredDraft.vivienda as any)?.quienCuida || ""} onChange={(v) => setField("vivienda", "quienCuida", v)} />
                  </FieldRow>
                  <FieldRow>
                    <StructuredField label="¿Dónde vive quien cuida?" value={(structuredDraft.vivienda as any)?.dondeViveCuida || ""} onChange={(v) => setField("vivienda", "dondeViveCuida", v)} />
                    <StructuredSelectField label="Pareja de acuerdo que trabaje" value={(structuredDraft.vivienda as any)?.acuerdoParejaVivienda || ""} onChange={(v) => setField("vivienda", "acuerdoParejaVivienda", v)} />
                  </FieldRow>
                  <StructuredField label="Comprende actividades (esposa/padre/hijo)" value={(structuredDraft.vivienda as any)?.comprendeActividades || ""} onChange={(v) => setField("vivienda", "comprendeActividades", v)} multiline />
                  <FieldRow>
                    <StructuredSelectField label="¿Sabe de rutas foráneas (L-S)?" value={(structuredDraft.vivienda as any)?.sabeForaneas || ""} onChange={(v) => setField("vivienda", "sabeForaneas", v)} />
                    <StructuredSelectField label="¿Inconveniente por ausencia semanal?" value={(structuredDraft.vivienda as any)?.inconvenienteAusencia || ""} onChange={(v) => setField("vivienda", "inconvenienteAusencia", v)} />
                  </FieldRow>
                </StructuredSection>

                {/* ── Inmueble / Vivienda (completo) ───────────────────── */}
                <StructuredSection title="Características del inmueble">
                  <FieldRow>
                    <StructuredField label="Tipo de casa" value={(structuredDraft.inmueble as any)?.tipoCasa || ""} onChange={(v) => setField("inmueble", "tipoCasa", v)} />
                    <StructuredSelectField label="Estado de la vivienda" value={(structuredDraft.inmueble as any)?.estadoVivienda || ""} onChange={(v) => setField("inmueble", "estadoVivienda", v)} options={["Muy bueno", "Bueno", "Regular", "Deteriorado", "Muy deteriorado"]} />
                  </FieldRow>
                  <FieldRow>
                    <StructuredSelectField label="Orden y limpieza" value={(structuredDraft.inmueble as any)?.ordenLimpieza || ""} onChange={(v) => setField("inmueble", "ordenLimpieza", v)} options={["Muy bueno", "Bueno", "Regular", "Malo", "Muy malo"]} />
                    <StructuredField label="Zona" value={(structuredDraft.inmueble as any)?.zona || ""} onChange={(v) => setField("inmueble", "zona", v)} />
                  </FieldRow>
                  <FieldRow>
                    <StructuredField label="Niveles" value={(structuredDraft.inmueble as any)?.niveles || ""} onChange={(v) => setField("inmueble", "niveles", v)} />
                    <StructuredField label="N.º de recámaras" value={(structuredDraft.inmueble as any)?.numRecamaras || ""} onChange={(v) => setField("inmueble", "numRecamaras", v)} />
                  </FieldRow>
                  <FieldRow>
                    <StructuredField label="N.º de baños" value={(structuredDraft.inmueble as any)?.numBanos || ""} onChange={(v) => setField("inmueble", "numBanos", v)} />
                    <StructuredField label="Superficie (m²)" value={(structuredDraft.inmueble as any)?.superficie || ""} onChange={(v) => setField("inmueble", "superficie", v)} />
                  </FieldRow>
                  <FieldRow>
                    <StructuredField label="Valor aproximado ($)" value={(structuredDraft.inmueble as any)?.valorAprox || ""} onChange={(v) => setField("inmueble", "valorAprox", v)} />
                    <StructuredField label="Precio de pasaje" value={(structuredDraft.inmueble as any)?.precioPasaje || ""} onChange={(v) => setField("inmueble", "precioPasaje", v)} />
                  </FieldRow>
                  <FieldRow>
                    <StructuredField label="Material de pisos" value={(structuredDraft.inmueble as any)?.pisosMaterial || ""} onChange={(v) => setField("inmueble", "pisosMaterial", v)} />
                    <StructuredField label="Material de paredes" value={(structuredDraft.inmueble as any)?.paredesMaterial || ""} onChange={(v) => setField("inmueble", "paredesMaterial", v)} />
                  </FieldRow>
                  <FieldRow>
                    <StructuredField label="Fachada" value={(structuredDraft.inmueble as any)?.fachada || ""} onChange={(v) => setField("inmueble", "fachada", v)} />
                    <StructuredSelectField label="Estado de muebles" value={(structuredDraft.inmueble as any)?.estadoMuebles || ""} onChange={(v) => setField("inmueble", "estadoMuebles", v)} options={["Muy bueno", "Bueno", "Regular", "Malo", "Sin muebles"]} />
                  </FieldRow>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <StructuredSelectField label="Tiene sala" value={(structuredDraft.inmueble as any)?.tieneSala || ""} onChange={(v) => setField("inmueble", "tieneSala", v)} />
                    <StructuredSelectField label="Tiene comedor" value={(structuredDraft.inmueble as any)?.tieneComedor || ""} onChange={(v) => setField("inmueble", "tieneComedor", v)} />
                    <StructuredSelectField label="Tiene cocina" value={(structuredDraft.inmueble as any)?.tieneCocina || ""} onChange={(v) => setField("inmueble", "tieneCocina", v)} />
                    <StructuredSelectField label="Tiene jardín" value={(structuredDraft.inmueble as any)?.tieneJardin || ""} onChange={(v) => setField("inmueble", "tieneJardin", v)} />
                    <StructuredSelectField label="Tiene patio" value={(structuredDraft.inmueble as any)?.tienePatio || ""} onChange={(v) => setField("inmueble", "tienePatio", v)} />
                    <StructuredSelectField label="Tiene cochera" value={(structuredDraft.inmueble as any)?.tieneCochera || ""} onChange={(v) => setField("inmueble", "tieneCochera", v)} />
                  </div>
                  <FieldRow>
                    <StructuredField label="Medio de transporte" value={(structuredDraft.inmueble as any)?.medioTransporte || ""} onChange={(v) => setField("inmueble", "medioTransporte", v)} />
                    <StructuredField label="Tiempo de traslado" value={(structuredDraft.inmueble as any)?.tiempoTraslado || ""} onChange={(v) => setField("inmueble", "tiempoTraslado", v)} />
                  </FieldRow>
                  <FieldRow>
                    <StructuredField label="Tiempo en residencia actual" value={(structuredDraft.inmueble as any)?.tiempoResidenciaActual || ""} onChange={(v) => setField("inmueble", "tiempoResidenciaActual", v)} />
                    <StructuredField label="Tiempo en residencia anterior" value={(structuredDraft.inmueble as any)?.tiempoResidenciaAnterior || ""} onChange={(v) => setField("inmueble", "tiempoResidenciaAnterior", v)} />
                  </FieldRow>
                </StructuredSection>

                {/* ── Salud y hábitos (completa) ───────────────────────── */}
                <StructuredSection title="Salud y hábitos">
                  <FieldRow>
                    <StructuredField label="Estado de salud" value={(structuredDraft.salud as any)?.estadoSalud || ""} onChange={(v) => setField("salud", "estadoSalud", v)} />
                    <StructuredField label="Servicio médico" value={(structuredDraft.salud as any)?.servicioMedico || ""} onChange={(v) => setField("salud", "servicioMedico", v)} />
                  </FieldRow>
                  <FieldRow>
                    <StructuredSelectField label="¿Fuma?" value={(structuredDraft.salud as any)?.fuma || ""} onChange={(v) => setField("salud", "fuma", v)} />
                    <StructuredField label="Cigarros por día" value={(structuredDraft.salud as any)?.cigarrosDia || ""} onChange={(v) => setField("salud", "cigarrosDia", v)} />
                  </FieldRow>
                  <FieldRow>
                    <StructuredSelectField label="¿Consume alcohol?" value={(structuredDraft.salud as any)?.toma || ""} onChange={(v) => setField("salud", "toma", v)} />
                    <StructuredField label="Tipo de bebida" value={(structuredDraft.salud as any)?.tipoBebida || ""} onChange={(v) => setField("salud", "tipoBebida", v)} />
                  </FieldRow>
                  <FieldRow>
                    <StructuredField label="Frecuencia de consumo" value={(structuredDraft.salud as any)?.cadaCuandoToma || ""} onChange={(v) => setField("salud", "cadaCuandoToma", v)} />
                    <StructuredField label="Última cita médica" value={(structuredDraft.salud as any)?.ultimaCita || ""} onChange={(v) => setField("salud", "ultimaCita", v)} />
                  </FieldRow>
                  <FieldRow>
                    <StructuredField label="Causa de cita médica" value={(structuredDraft.salud as any)?.causaCita || ""} onChange={(v) => setField("salud", "causaCita", v)} />
                    <StructuredField label="Accidentes" value={(structuredDraft.salud as any)?.accidentes || ""} onChange={(v) => setField("salud", "accidentes", v)} />
                  </FieldRow>
                  <FieldRow>
                    <StructuredSelectField label="¿Tiene alergias?" value={(structuredDraft.salud as any)?.alergias || ""} onChange={(v) => setField("salud", "alergias", v)} />
                    <StructuredField label="¿Cuáles alergias?" value={(structuredDraft.salud as any)?.cualesAlergias || ""} onChange={(v) => setField("salud", "cualesAlergias", v)} />
                  </FieldRow>
                  <StructuredField label="Cuidados médicos" value={(structuredDraft.salud as any)?.cuidadosMedicos || ""} onChange={(v) => setField("salud", "cuidadosMedicos", v)} multiline />
                  <StructuredField label="Enfermedades que padece" value={(structuredDraft.salud as any)?.cualesEnfermedades || ""} onChange={(v) => setField("salud", "cualesEnfermedades", v)} multiline />
                  <StructuredField label="Enfermedades crónicas" value={(structuredDraft.salud as any)?.enfermedadesCronicas || ""} onChange={(v) => setField("salud", "enfermedadesCronicas", v)} multiline />
                </StructuredSection>

                {/* ── Vida social ───────────────────────────────────────── */}
                <StructuredSection title="Vida social y pasatiempos">
                  <FieldRow>
                    <StructuredSelectField label="Tatuajes" value={(structuredDraft.social as any)?.tatuajes || ""} onChange={(v) => setField("social", "tatuajes", v)} />
                    <StructuredSelectField label="Asiste a bares" value={(structuredDraft.social as any)?.asisteBares || ""} onChange={(v) => setField("social", "asisteBares", v)} />
                  </FieldRow>
                  <FieldRow>
                    <StructuredSelectField label="Practica deporte" value={(structuredDraft.social as any)?.practicaDeporte || ""} onChange={(v) => setField("social", "practicaDeporte", v)} />
                    <StructuredField label="¿Cuál deporte?" value={(structuredDraft.social as any)?.deporteCual || ""} onChange={(v) => setField("social", "deporteCual", v)} />
                  </FieldRow>
                  <FieldRow>
                    <StructuredSelectField label="Frecuencia deportiva" value={(structuredDraft.social as any)?.deporteFrecuencia || ""} onChange={(v) => setField("social", "deporteFrecuencia", v)} options={["Diario", "Semanal", "Quincenal", "Mensual", "Eventual"]} />
                    <StructuredSelectField label="Asiste a servicios religiosos" value={(structuredDraft.social as any)?.asisteReligioso || ""} onChange={(v) => setField("social", "asisteReligioso", v)} />
                  </FieldRow>
                  <FieldRow>
                    <StructuredField label="¿Cuál religión?" value={(structuredDraft.social as any)?.religiosoCual || ""} onChange={(v) => setField("social", "religiosoCual", v)} />
                    <StructuredSelectField label="Frecuencia religiosa" value={(structuredDraft.social as any)?.religiosoFrecuencia || ""} onChange={(v) => setField("social", "religiosoFrecuencia", v)} options={["Semanal", "Quincenal", "Mensual", "Eventual"]} />
                  </FieldRow>
                  <FieldRow>
                    <StructuredSelectField label="Afiliado a partido político" value={(structuredDraft.social as any)?.afiliadoPartido || ""} onChange={(v) => setField("social", "afiliadoPartido", v)} />
                    <StructuredField label="¿Cuál partido?" value={(structuredDraft.social as any)?.partidoCual || ""} onChange={(v) => setField("social", "partidoCual", v)} />
                  </FieldRow>
                  <FieldRow>
                    <StructuredField label="¿Cuál actividad familiar?" value={(structuredDraft.social as any)?.actividadFamiliarCual || ""} onChange={(v) => setField("social", "actividadFamiliarCual", v)} />
                    <StructuredSelectField label="Frecuencia actividad familiar" value={(structuredDraft.social as any)?.actividadFamiliarFrecuencia || ""} onChange={(v) => setField("social", "actividadFamiliarFrecuencia", v)} options={["Diario", "Semanal", "Quincenal", "Mensual", "Eventual"]} />
                  </FieldRow>
                  <StructuredField label="Pasatiempos" value={(structuredDraft.social as any)?.pasatiempos || ""} onChange={(v) => setField("social", "pasatiempos", v)} multiline />
                </StructuredSection>

                {/* ── Situación jurídica ────────────────────────────────── */}
                <StructuredSection title="Situación jurídica">
                  <StructuredSelectField label="¿En proceso legal?" value={(structuredDraft.juridica as any)?.procesoLegal || ""} onChange={(v) => setField("juridica", "procesoLegal", v)} />
                  <FieldRow>
                    <StructuredField label="¿Quién involucrado?" value={(structuredDraft.juridica as any)?.procesoLegalQuien || ""} onChange={(v) => setField("juridica", "procesoLegalQuien", v)} />
                    <StructuredField label="¿Por qué motivo?" value={(structuredDraft.juridica as any)?.procesoLegalPorQue || ""} onChange={(v) => setField("juridica", "procesoLegalPorQue", v)} />
                  </FieldRow>
                </StructuredSection>

                {/* ── Otros datos ───────────────────────────────────────── */}
                <StructuredSection title="Otros datos">
                  <StructuredSelectField label="¿Trabajó en el grupo?" value={(structuredDraft.otrosDatos as any)?.trabajoGrupo || ""} onChange={(v) => setField("otrosDatos", "trabajoGrupo", v)} />
                </StructuredSection>

                {/* ── Cursos ────────────────────────────────────────────── */}
                <StructuredSection title="Cursos y capacitaciones">
                  <StructuredField
                    label="Cursos tomados"
                    value={typeof structuredDraft.cursos === "string" ? structuredDraft.cursos : ""}
                    onChange={(v) => setTopField("cursos", v)}
                    multiline
                  />
                </StructuredSection>

                {/* ── Ingresos familiares ─────────────────────────────── */}
                <StructuredSection title="Ingresos familiares">
                  {((structuredDraft.ingresos as any[]) || []).map((ing: any, i: number) => (
                    <div key={i} className="rounded border border-slate-200 p-3 space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="text-xs font-semibold text-slate-500 uppercase">Aportante {i + 1}</div>
                        <button type="button" onClick={() => removeArrayItem("ingresos", i)} className="text-xs text-red-500 hover:text-red-700">Eliminar</button>
                      </div>
                      <FieldRow>
                        <StructuredField label="Nombre" value={ing.nombre || ""} onChange={(v) => setArrayField("ingresos", i, "nombre", v)} />
                        <StructuredSelectField label="Parentesco" value={ing.parentesco || ""} onChange={(v) => setArrayField("ingresos", i, "parentesco", v)} options={["Candidato", "Padre", "Madre", "Esposo/a", "Hijo/a", "Hermano/a", "Otro"]} />
                      </FieldRow>
                      <FieldRow>
                        <StructuredField label="Sueldo mensual ($)" value={ing.sueldo || ""} onChange={(v) => setArrayField("ingresos", i, "sueldo", v)} />
                        <StructuredField label="Otros ingresos ($)" value={ing.otrosIngresos || ""} onChange={(v) => setArrayField("ingresos", i, "otrosIngresos", v)} />
                      </FieldRow>
                    </div>
                  ))}
                  <button type="button" onClick={() => addArrayItem("ingresos", { nombre: "", parentesco: "", sueldo: "", otrosIngresos: "" })} className="text-xs text-blue-600 hover:text-blue-800 border border-dashed border-blue-300 rounded px-3 py-1.5 w-full">+ Agregar aportante</button>
                </StructuredSection>

                {/* ── Egresos familiares ────────────────────────────────── */}
                <StructuredSection title="Egresos familiares">
                  <div className="text-xs font-semibold text-slate-500 uppercase pt-1">Servicios</div>
                  <FieldRow>
                    <StructuredField label="Agua ($)" value={(structuredDraft.egresos as any)?.servicios?.agua || ""} onChange={(v) => setStructuredDraft((prev) => ({ ...prev, egresos: { ...(prev.egresos as any), servicios: { ...((prev.egresos as any)?.servicios || {}), agua: v } } }))} />
                    <StructuredField label="Luz ($)" value={(structuredDraft.egresos as any)?.servicios?.luz || ""} onChange={(v) => setStructuredDraft((prev) => ({ ...prev, egresos: { ...(prev.egresos as any), servicios: { ...((prev.egresos as any)?.servicios || {}), luz: v } } }))} />
                  </FieldRow>
                  <FieldRow>
                    <StructuredField label="Gas ($)" value={(structuredDraft.egresos as any)?.servicios?.gas || ""} onChange={(v) => setStructuredDraft((prev) => ({ ...prev, egresos: { ...(prev.egresos as any), servicios: { ...((prev.egresos as any)?.servicios || {}), gas: v } } }))} />
                    <StructuredField label="Teléfono ($)" value={(structuredDraft.egresos as any)?.servicios?.telefono || ""} onChange={(v) => setStructuredDraft((prev) => ({ ...prev, egresos: { ...(prev.egresos as any), servicios: { ...((prev.egresos as any)?.servicios || {}), telefono: v } } }))} />
                  </FieldRow>
                  <FieldRow>
                    <StructuredField label="TV de paga ($)" value={(structuredDraft.egresos as any)?.servicios?.tvPaga || ""} onChange={(v) => setStructuredDraft((prev) => ({ ...prev, egresos: { ...(prev.egresos as any), servicios: { ...((prev.egresos as any)?.servicios || {}), tvPaga: v } } }))} />
                    <StructuredField label="Internet ($)" value={(structuredDraft.egresos as any)?.servicios?.internet || ""} onChange={(v) => setStructuredDraft((prev) => ({ ...prev, egresos: { ...(prev.egresos as any), servicios: { ...((prev.egresos as any)?.servicios || {}), internet: v } } }))} />
                  </FieldRow>
                  <div className="text-xs font-semibold text-slate-500 uppercase pt-1">Gastos generales</div>
                  <FieldRow>
                    <StructuredField label="Alimentación / Despensa ($)" value={(structuredDraft.egresos as any)?.alimentacion || ""} onChange={(v) => setField("egresos", "alimentacion", v)} />
                    <StructuredField label="Vestido / Calzado ($)" value={(structuredDraft.egresos as any)?.vestido || ""} onChange={(v) => setField("egresos", "vestido", v)} />
                  </FieldRow>
                  <FieldRow>
                    <StructuredField label="Renta / Hipoteca / INFONAVIT ($)" value={(structuredDraft.egresos as any)?.renta || ""} onChange={(v) => setField("egresos", "renta", v)} />
                    <StructuredField label="Transportación ($)" value={(structuredDraft.egresos as any)?.transporte || ""} onChange={(v) => setField("egresos", "transporte", v)} />
                  </FieldRow>
                  <FieldRow>
                    <StructuredField label="Tarjetas de crédito ($)" value={(structuredDraft.egresos as any)?.tarjetas || ""} onChange={(v) => setField("egresos", "tarjetas", v)} />
                    <StructuredField label="Colegiaturas ($)" value={(structuredDraft.egresos as any)?.colegiaturas || ""} onChange={(v) => setField("egresos", "colegiaturas", v)} />
                  </FieldRow>
                  <FieldRow>
                    <StructuredField label="Gastos médicos ($)" value={(structuredDraft.egresos as any)?.gastosMedicos || ""} onChange={(v) => setField("egresos", "gastosMedicos", v)} />
                    <StructuredField label="Recreaciones ($)" value={(structuredDraft.egresos as any)?.recreaciones || ""} onChange={(v) => setField("egresos", "recreaciones", v)} />
                  </FieldRow>
                  <StructuredField label="Otros gastos ($)" value={(structuredDraft.egresos as any)?.otrosGastos || ""} onChange={(v) => setField("egresos", "otrosGastos", v)} />
                </StructuredSection>

                {/* ── Créditos (array dinámico) ─────────────────────────── */}
                <StructuredSection title="Créditos institucionales y departamentales">
                  {((structuredDraft.creditos as any[]) || []).length === 0 && (
                    <div className="text-xs text-slate-500 italic">Sin créditos registrados.</div>
                  )}
                  {((structuredDraft.creditos as any[]) || []).map((cred: any, i: number) => (
                    <div key={i} className="rounded border border-slate-200 p-3 space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="text-xs font-semibold text-slate-500 uppercase">Crédito {i + 1}{cred.fijo ? " (fijo)" : ""}</div>
                        {!cred.fijo && (
                          <button type="button" onClick={() => removeArrayItem("creditos", i)} className="text-xs text-red-500 hover:text-red-700">Eliminar</button>
                        )}
                      </div>
                      <FieldRow>
                        <StructuredField label="Institución / Tienda" value={cred.institucion || ""} onChange={(v) => setArrayField("creditos", i, "institucion", v)} />
                        <StructuredField label="Monto del crédito ($)" value={cred.monto || ""} onChange={(v) => setArrayField("creditos", i, "monto", v)} />
                      </FieldRow>
                      <FieldRow>
                        <StructuredField label="Mensualidad ($)" value={cred.mensualidad || ""} onChange={(v) => setArrayField("creditos", i, "mensualidad", v)} />
                        <StructuredField label="Adeudo restante ($)" value={cred.adeudo || ""} onChange={(v) => setArrayField("creditos", i, "adeudo", v)} />
                      </FieldRow>
                    </div>
                  ))}
                  <button type="button" onClick={() => addArrayItem("creditos", { institucion: "", monto: "", mensualidad: "", adeudo: "" })} className="text-xs text-blue-600 hover:text-blue-800 border border-dashed border-blue-300 rounded px-3 py-1.5 w-full">+ Agregar crédito</button>
                </StructuredSection>

                {/* ── Bienes raíces (array dinámico) ────────────────────── */}
                <StructuredSection title="Bienes raíces (casas, terrenos, etc.)">
                  {((structuredDraft.bienesRaices as any[]) || []).length === 0 && (
                    <div className="text-xs text-slate-500 italic">Sin bienes raíces registrados.</div>
                  )}
                  {((structuredDraft.bienesRaices as any[]) || []).map((b: any, i: number) => (
                    <div key={i} className="rounded border border-slate-200 p-3 space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="text-xs font-semibold text-slate-500 uppercase">Propiedad {i + 1}</div>
                        <button type="button" onClick={() => removeArrayItem("bienesRaices", i)} className="text-xs text-red-500 hover:text-red-700">Eliminar</button>
                      </div>
                      <FieldRow>
                        <StructuredField label="Tipo de propiedad" value={b.tipo || ""} onChange={(v) => setArrayField("bienesRaices", i, "tipo", v)} />
                        <StructuredField label="Ubicación" value={b.ubicacion || ""} onChange={(v) => setArrayField("bienesRaices", i, "ubicacion", v)} />
                      </FieldRow>
                      <FieldRow>
                        <StructuredField label="Valor aprox. ($)" value={b.valor || ""} onChange={(v) => setArrayField("bienesRaices", i, "valor", v)} />
                        <StructuredField label="A nombre de" value={b.aNombreDe || ""} onChange={(v) => setArrayField("bienesRaices", i, "aNombreDe", v)} />
                      </FieldRow>
                    </div>
                  ))}
                  <button type="button" onClick={() => addArrayItem("bienesRaices", { tipo: "", ubicacion: "", valor: "", aNombreDe: "" })} className="text-xs text-blue-600 hover:text-blue-800 border border-dashed border-blue-300 rounded px-3 py-1.5 w-full">+ Agregar propiedad</button>
                </StructuredSection>

                {/* ── Vehículos (array dinámico) ────────────────────────── */}
                <StructuredSection title="Vehículos">
                  {((structuredDraft.vehiculos as any[]) || []).length === 0 && (
                    <div className="text-xs text-slate-500 italic">Sin vehículos registrados.</div>
                  )}
                  {((structuredDraft.vehiculos as any[]) || []).map((v: any, i: number) => (
                    <div key={i} className="rounded border border-slate-200 p-3 space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="text-xs font-semibold text-slate-500 uppercase">Vehículo {i + 1}</div>
                        <button type="button" onClick={() => removeArrayItem("vehiculos", i)} className="text-xs text-red-500 hover:text-red-700">Eliminar</button>
                      </div>
                      <FieldRow>
                        <StructuredField label="Marca y modelo" value={v.marcaModelo || ""} onChange={(vv) => setArrayField("vehiculos", i, "marcaModelo", vv)} />
                        <StructuredField label="Valor comercial ($)" value={v.valorComercial || ""} onChange={(vv) => setArrayField("vehiculos", i, "valorComercial", vv)} />
                      </FieldRow>
                      <FieldRow>
                        <StructuredField label="Saldo ($)" value={v.saldo || ""} onChange={(vv) => setArrayField("vehiculos", i, "saldo", vv)} />
                        <StructuredField label="A nombre de" value={v.aNombreDe || ""} onChange={(vv) => setArrayField("vehiculos", i, "aNombreDe", vv)} />
                      </FieldRow>
                    </div>
                  ))}
                  <button type="button" onClick={() => addArrayItem("vehiculos", { marcaModelo: "", valorComercial: "", saldo: "", aNombreDe: "" })} className="text-xs text-blue-600 hover:text-blue-800 border border-dashed border-blue-300 rounded px-3 py-1.5 w-full">+ Agregar vehículo</button>
                </StructuredSection>

                {/* ── Negocios (array dinámico) ─────────────────────────── */}
                <StructuredSection title="Negocios">
                  {((structuredDraft.negocios as any[]) || []).length === 0 && (
                    <div className="text-xs text-slate-500 italic">Sin negocios registrados.</div>
                  )}
                  {((structuredDraft.negocios as any[]) || []).map((n: any, i: number) => (
                    <div key={i} className="rounded border border-slate-200 p-3 space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="text-xs font-semibold text-slate-500 uppercase">Negocio {i + 1}</div>
                        <button type="button" onClick={() => removeArrayItem("negocios", i)} className="text-xs text-red-500 hover:text-red-700">Eliminar</button>
                      </div>
                      <FieldRow>
                        <StructuredField label="Tipo / Nombre comercial" value={n.tipoNombre || ""} onChange={(v) => setArrayField("negocios", i, "tipoNombre", v)} />
                        <StructuredField label="Ubicación" value={n.ubicacion || ""} onChange={(v) => setArrayField("negocios", i, "ubicacion", v)} />
                      </FieldRow>
                      <StructuredField label="Propietario" value={n.propietario || ""} onChange={(v) => setArrayField("negocios", i, "propietario", v)} />
                    </div>
                  ))}
                  <button type="button" onClick={() => addArrayItem("negocios", { tipoNombre: "", ubicacion: "", propietario: "" })} className="text-xs text-blue-600 hover:text-blue-800 border border-dashed border-blue-300 rounded px-3 py-1.5 w-full">+ Agregar negocio</button>
                </StructuredSection>

                {/* ── Actividad en desempleo / Patrimonio ───────────────── */}
                <StructuredSection title="Actividad en período de desempleo">
                  <StructuredField label="¿A qué se dedica sin empleo formal?" value={(structuredDraft.patrimonio as any)?.desempleoActividad || ""} onChange={(v) => setField("patrimonio", "desempleoActividad", v)} />
                  <FieldRow>
                    <StructuredField label="Ingreso estimado ($)" value={(structuredDraft.patrimonio as any)?.desempleoIngreso || ""} onChange={(v) => setField("patrimonio", "desempleoIngreso", v)} />
                    <StructuredField label="¿Cómo se anuncia?" value={(structuredDraft.patrimonio as any)?.desempleoAnuncio || ""} onChange={(v) => setField("patrimonio", "desempleoAnuncio", v)} />
                  </FieldRow>
                </StructuredSection>

                {/* ── Referencias personales (array 1) ─────────────────── */}
                <StructuredSection title="Referencias personales">
                  {((structuredDraft.refPersonales as any[]) || []).map((ref: any, i: number) => (
                    <div key={i} className="rounded border border-slate-200 p-3 space-y-3">
                      <div className="text-xs font-semibold text-slate-500 uppercase">Referencia {i + 1}</div>
                      <FieldRow>
                        <StructuredField label="Nombre" value={ref.nombre || ""} onChange={(v) => setArrayField("refPersonales", i, "nombre", v)} />
                        <StructuredField label="Ocupación" value={ref.ocupacion || ""} onChange={(v) => setArrayField("refPersonales", i, "ocupacion", v)} />
                      </FieldRow>
                      <FieldRow>
                        <StructuredField label="Teléfono" value={ref.telefono || ""} onChange={(v) => setArrayField("refPersonales", i, "telefono", v)} />
                        <StructuredField label="Lugar de residencia" value={ref.lugarResidencia || ""} onChange={(v) => setArrayField("refPersonales", i, "lugarResidencia", v)} />
                      </FieldRow>
                      <StructuredField label="¿Cómo se anuncia?" value={ref.comoSeAnuncia || ""} onChange={(v) => setArrayField("refPersonales", i, "comoSeAnuncia", v)} />
                    </div>
                  ))}
                </StructuredSection>

                {/* ── Referencias vecinales (array 1) ──────────────────── */}
                <StructuredSection title="Referencias vecinales">
                  {((structuredDraft.refVecinales as any[]) || []).map((ref: any, i: number) => (
                    <div key={i} className="rounded border border-slate-200 p-3 space-y-3">
                      <div className="text-xs font-semibold text-slate-500 uppercase">Referencia {i + 1}</div>
                      <FieldRow>
                        <StructuredField label="Nombre" value={ref.nombre || ""} onChange={(v) => setArrayField("refVecinales", i, "nombre", v)} />
                        <StructuredField label="Ocupación" value={ref.ocupacion || ""} onChange={(v) => setArrayField("refVecinales", i, "ocupacion", v)} />
                      </FieldRow>
                      <FieldRow>
                        <StructuredField label="Teléfono" value={ref.telefono || ""} onChange={(v) => setArrayField("refVecinales", i, "telefono", v)} />
                        <StructuredField label="Lugar de residencia" value={ref.lugarResidencia || ""} onChange={(v) => setArrayField("refVecinales", i, "lugarResidencia", v)} />
                      </FieldRow>
                      <StructuredField label="¿Cómo se anuncia?" value={ref.comoSeAnuncia || ""} onChange={(v) => setArrayField("refVecinales", i, "comoSeAnuncia", v)} />
                    </div>
                  ))}
                </StructuredSection>

                {/* ── Fotos del domicilio ───────────────────────────────── */}
                <StructuredSection title="Fotos del domicilio">
                  {(["sala", "cocina", "comedor", "fachadaCalle", "fachadaPatio"] as const).map((key) => {
                    const fotoVal: string = (structuredDraft.fotos as any)?.[key] || "";
                    return (
                      <div key={key} className="space-y-1">
                        <Label className="text-xs font-medium text-slate-600">{LABELS[key] || humanizeKey(key)}</Label>
                        <ImageValueEditor
                          label={LABELS[key] || key}
                          value={fotoVal}
                          onChange={(value) => setField("fotos", key, value)}
                          onPreview={handleImageClick}
                        />
                      </div>
                    );
                  })}
                </StructuredSection>

                <StructuredSection title="Evidencias gráficas adicionales">
                  {((structuredDraft.evidenciasGraficas as string[]) || []).length === 0 && (
                    <div className="text-xs text-slate-500 italic">Sin evidencias adicionales registradas.</div>
                  )}
                  {((structuredDraft.evidenciasGraficas as string[]) || []).map((evidencia, index) => (
                    <div key={`evidencia-${index}`} className="rounded border border-slate-200 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold uppercase text-slate-500">Evidencia {index + 1}</div>
                        <button
                          type="button"
                          onClick={() => removeArrayItem("evidenciasGraficas", index)}
                          className="text-xs text-red-600 underline hover:text-red-800"
                        >
                          Eliminar
                        </button>
                      </div>
                      <ImageValueEditor
                        label={`Evidencia ${index + 1}`}
                        value={evidencia || ""}
                        onChange={(value) => setStringArrayItem("evidenciasGraficas", index, value)}
                        onPreview={handleImageClick}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addStringArrayItem("evidenciasGraficas")}
                    className="text-xs text-blue-600 hover:text-blue-800 border border-dashed border-blue-300 rounded px-3 py-1.5 w-full"
                  >
                    + Agregar evidencia gráfica
                  </button>
                </StructuredSection>

                {/* ── Conclusión / Cierre ───────────────────────────────── */}
                <StructuredSection title="Conclusión / Observaciones del encuestador">
                  <StructuredField
                    label="Observaciones de cierre"
                    value={(structuredDraft.cierre as any)?.observaciones || ""}
                    onChange={(v) =>
                      setStructuredDraft((prev) => ({
                        ...prev,
                        cierre: { ...(prev.cierre as Record<string, any> || {}), observaciones: v },
                      }))
                    }
                    multiline
                  />
                  <StructuredField
                    label="Comentarios generales"
                    value={(structuredDraft as any).comentarios || ""}
                    onChange={(v) => setTopField("comentarios", v)}
                    multiline
                  />
                </StructuredSection>

              </div>
            </ScrollArea>
          </div>
        </TabsContent>
      )}

      {/* ── PESTAÑA: HISTORIAL ─────────────────────────────────────────── */}
      {canEdit && (
        <TabsContent value="historial" className="space-y-4 pt-4">
          <div className="rounded-lg border bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-4">
              <History className="h-4 w-4" /> Historial de ajustes del analista
            </div>
            <ScrollArea className="h-[60vh] pr-2">
              {auditEntries.length === 0 ? (
                <div className="text-sm text-slate-500">Aún no hay cambios auditados para esta captura.</div>
              ) : (
                <div className="space-y-4 pr-2">
                  {auditEntries.map((entry) => (
                    <div key={entry.id} className="rounded-lg border border-slate-200 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-medium text-slate-900">{entry.userName || entry.userEmail || `Usuario ${entry.userId ?? "interno"}`}</div>
                        <Badge variant="outline">{new Date(entry.timestamp).toLocaleString()}</Badge>
                      </div>
                      <div className="space-y-2">
                        {(entry.details?.changedFields || []).length === 0 ? (
                          <div className="text-sm text-slate-500">Cambio registrado sin detalle granular.</div>
                        ) : (
                          (entry.details?.changedFields || []).map((change, index) => (
                            <div key={`${entry.id}-${index}`} className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-2">
                              <div className="text-sm font-medium text-slate-900">{humanizeAuditPath(change.path || "captura")}</div>
                              <div className="grid gap-2 md:grid-cols-2">
                                <AuditValuePill label="Antes" value={change.before} />
                                <AuditValuePill label="Después" value={change.after} />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </TabsContent>
      )}
    </Tabs>

      {/* ── LIGHTBOX de imágenes ──────────────────────────────────────── */}
      <Dialog open={lightbox.open} onOpenChange={(open) => setLightbox((prev) => ({ ...prev, open }))}>
        <DialogContent
          className="max-w-3xl p-2 gap-2"
          aria-describedby="visit-lightbox-desc"
        >
          <DialogHeader className="px-4 pt-4 pb-1">
            <DialogTitle className="text-sm truncate">
              {lightbox.label || "Imagen"}
            </DialogTitle>
          </DialogHeader>
          <p id="visit-lightbox-desc" className="sr-only">Visor ampliado de imagen de la visita de campo</p>
          <div className="flex items-center justify-center bg-slate-100 rounded overflow-hidden" style={{ minHeight: "12rem", maxHeight: "72vh" }}>
            {lightbox.src && (
              <img
                src={lightbox.src}
                alt={lightbox.label || "Imagen ampliada"}
                className="max-w-full object-contain"
                style={{ maxHeight: "72vh" }}
              />
            )}
          </div>
          {lightbox.src && isUrl(lightbox.src) && !isImageDataUrl(lightbox.src) && (
            <div className="flex justify-end px-2 pb-2">
              <a
                href={lightbox.src}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-700 underline"
              >
                <ExternalLink className="h-3 w-3" />
                Abrir en nueva pestaña
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}