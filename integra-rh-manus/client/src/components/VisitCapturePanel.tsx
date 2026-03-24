/**
 * Panel compartido para visualizar y auditar la captura de visita.
 * @intervention IMPL-20260323-20
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
import { CheckCircle2, Clock3, Code2, ExternalLink, FileImage, History, LayoutList, PencilLine, ZoomIn } from "lucide-react";

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

/** True si el string es una imagen (URL HTTP o data URL base64). */
function isImageSrc(value: string): boolean {
  return isImageDataUrl(value) || (isUrl(value) && isImageUrl(value));
}

function formatPrimitive(value: Primitive) {
  if (value === null || value === undefined || value === "") return "Sin registro";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return String(value);
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

function renderPrimitiveValue(value: Primitive, onImageClick?: (src: string) => void): JSX.Element {
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
            onImageClick ? (src) => onImageClick(src, label) : undefined
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-slate-600">{label}</Label>
      {multiline ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[72px] text-sm resize-y"
          placeholder={`${label}...`}
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-sm"
          placeholder={`${label}...`}
        />
      )}
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

  // ── Estado del editor JSON (fallback de soporte) ─────────────────────
  const [editorText, setEditorText] = useState("");
  const [editorError, setEditorError] = useState<string | null>(null);

  // ── Estado del editor estructurado ───────────────────────────────────
  type DeepPartial<T> = { [K in keyof T]?: DeepPartial<T[K]> };
  const [structuredDraft, setStructuredDraft] = useState<Record<string, any>>({});

  useEffect(() => {
    setEditorText(JSON.stringify(data || {}, null, 2));
    setEditorError(null);
    // Inicializar el draft estructurado con los datos actuales
    setStructuredDraft({
      ubicacion: { ...(data?.ubicacion as Record<string, any> || {}) },
      academica: { ...(data?.academica as Record<string, any> || {}) },
      inmueble: { ...(data?.inmueble as Record<string, any> || {}) },
      salud: { ...(data?.salud as Record<string, any> || {}) },
      conclusion: (data?.conclusion as string) || "",
      comentarios: (data?.comentarios as string) || "",
      cierre: { observaciones: (data?.cierre as Record<string, any>)?.observaciones || "" },
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

  // ── Guardar desde editor estructurado ─────────────────────────────
  const handleSaveStructured = () => {
    if (!onSave) return;
    // Fusiona el draft sobre los datos originales para no perder campos no editados
    const merged: Record<string, unknown> = { ...(data || {}) };
    for (const [section, val] of Object.entries(structuredDraft)) {
      if (val !== null && typeof val === "object" && !Array.isArray(val)) {
        merged[section] = { ...(merged[section] as Record<string, unknown> || {}), ...(val as Record<string, unknown>) };
      } else {
        if (val !== "") merged[section] = val;
      }
    }
    onSave(merged);
  };

  // ── Guardar desde editor JSON ─────────────────────────────────────
  const handleSaveJson = () => {
    if (!onSave) return;
    try {
      const parsed = JSON.parse(editorText) as Record<string, unknown>;
      if (!isPlainObject(parsed)) {
        setEditorError("La captura debe ser un objeto JSON válido.");
        return;
      }
      setEditorError(null);
      onSave(parsed);
    } catch {
      setEditorError("El JSON contiene un error de formato.");
    }
  };

  return (
    <>
    <Tabs defaultValue="vista" className="w-full">
      {/* Pestañas disponibles según rol */}
      <TabsList className={canEdit ? "grid w-full grid-cols-4" : "grid w-full grid-cols-1"}>
        <TabsTrigger value="vista">Vista</TabsTrigger>
        {canEdit && (
          <TabsTrigger value="formulario">
            <LayoutList className="h-3.5 w-3.5 mr-1.5" />
            Formulario
          </TabsTrigger>
        )}
        {canEdit && <TabsTrigger value="historial"><History className="h-3.5 w-3.5 mr-1.5" />Historial</TabsTrigger>}
        {canEdit && (
          <TabsTrigger value="json">
            <Code2 className="h-3.5 w-3.5 mr-1.5" />
            JSON
          </TabsTrigger>
        )}
      </TabsList>

      {/* ── PESTAÑA: VISTA ─────────────────────────────────────────────── */}
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
              {topLevelEntries.map(([sectionKey, sectionValue]) => renderNode(humanizeKey(sectionKey), sectionValue, sectionKey, handleImageClick))}
            </div>
          </ScrollArea>
        )}
      </TabsContent>

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

                {/* Sección: Ubicación y domicilio */}
                <StructuredSection title="Ubicación y domicilio">
                  <FieldRow>
                    <StructuredField
                      label="Domicilio"
                      value={(structuredDraft.ubicacion as any)?.domicilio || ""}
                      onChange={(v) => setField("ubicacion", "domicilio", v)}
                    />
                    <StructuredField
                      label="Código postal"
                      value={(structuredDraft.ubicacion as any)?.cp || ""}
                      onChange={(v) => setField("ubicacion", "cp", v)}
                    />
                  </FieldRow>
                  <FieldRow>
                    <StructuredField
                      label="Colonia / Municipio"
                      value={(structuredDraft.ubicacion as any)?.coloniaMunicipio || ""}
                      onChange={(v) => setField("ubicacion", "coloniaMunicipio", v)}
                    />
                    <StructuredField
                      label="Estado"
                      value={(structuredDraft.ubicacion as any)?.estado || ""}
                      onChange={(v) => setField("ubicacion", "estado", v)}
                    />
                  </FieldRow>
                </StructuredSection>

                {/* Sección: Académica */}
                <StructuredSection title="Información académica">
                  <FieldRow>
                    <StructuredField
                      label="Último grado"
                      value={(structuredDraft.academica as any)?.ultimoGrado || ""}
                      onChange={(v) => setField("academica", "ultimoGrado", v)}
                    />
                    <StructuredField
                      label="Institución"
                      value={(structuredDraft.academica as any)?.institucion || ""}
                      onChange={(v) => setField("academica", "institucion", v)}
                    />
                  </FieldRow>
                  <FieldRow>
                    <StructuredField
                      label="Periodo"
                      value={(structuredDraft.academica as any)?.periodo || ""}
                      onChange={(v) => setField("academica", "periodo", v)}
                    />
                    <StructuredField
                      label="Documento obtenido"
                      value={(structuredDraft.academica as any)?.documentoObtenido || ""}
                      onChange={(v) => setField("academica", "documentoObtenido", v)}
                    />
                  </FieldRow>
                  <StructuredField
                    label="Otros conocimientos"
                    value={(structuredDraft.academica as any)?.otrosConocimientos || ""}
                    onChange={(v) => setField("academica", "otrosConocimientos", v)}
                    multiline
                  />
                </StructuredSection>

                {/* Sección: Inmueble / Vivienda */}
                <StructuredSection title="Inmueble / Vivienda">
                  <FieldRow>
                    <StructuredField
                      label="Tipo de inmueble"
                      value={(structuredDraft.inmueble as any)?.tipoInmueble || ""}
                      onChange={(v) => setField("inmueble", "tipoInmueble", v)}
                    />
                    <StructuredField
                      label="Estado de la vivienda"
                      value={(structuredDraft.inmueble as any)?.estadoVivienda || ""}
                      onChange={(v) => setField("inmueble", "estadoVivienda", v)}
                    />
                  </FieldRow>
                  <FieldRow>
                    <StructuredField
                      label="Orden y limpieza"
                      value={(structuredDraft.inmueble as any)?.ordenLimpieza || ""}
                      onChange={(v) => setField("inmueble", "ordenLimpieza", v)}
                    />
                    <StructuredField
                      label="Zona"
                      value={(structuredDraft.inmueble as any)?.zona || ""}
                      onChange={(v) => setField("inmueble", "zona", v)}
                    />
                  </FieldRow>
                  <FieldRow>
                    <StructuredField
                      label="Medio de transporte"
                      value={(structuredDraft.inmueble as any)?.medioTransporte || ""}
                      onChange={(v) => setField("inmueble", "medioTransporte", v)}
                    />
                    <StructuredField
                      label="Tiempo de traslado"
                      value={(structuredDraft.inmueble as any)?.tiempoTraslado || ""}
                      onChange={(v) => setField("inmueble", "tiempoTraslado", v)}
                    />
                  </FieldRow>
                </StructuredSection>

                {/* Sección: Salud */}
                <StructuredSection title="Salud y hábitos">
                  <FieldRow>
                    <StructuredField
                      label="Estado de salud"
                      value={(structuredDraft.salud as any)?.estadoSalud || ""}
                      onChange={(v) => setField("salud", "estadoSalud", v)}
                    />
                    <StructuredField
                      label="Servicio médico"
                      value={(structuredDraft.salud as any)?.servicioMedico || ""}
                      onChange={(v) => setField("salud", "servicioMedico", v)}
                    />
                  </FieldRow>
                </StructuredSection>

                {/* Sección: Conclusión */}
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

                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                  <strong>Nota:</strong> Los campos de familiares, referencias, ingresos/egresos detallados y listas complejas se editan desde la pestaña <strong>JSON</strong>. Este editor cubre los campos operativos más frecuentes.
                </div>
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
            {auditEntries.length === 0 ? (
              <div className="text-sm text-slate-500">Aún no hay cambios auditados para esta captura.</div>
            ) : (
              <div className="space-y-4">
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
                          <div key={`${entry.id}-${index}`} className="rounded-md bg-slate-50 p-3 text-sm space-y-1">
                            <div className="font-medium text-slate-900">{change.path || "captura"}</div>
                            <div className="text-slate-600">Antes: {typeof change.before === "object" ? JSON.stringify(change.before) : formatPrimitive(change.before as Primitive)}</div>
                            <div className="text-slate-600">Después: {typeof change.after === "object" ? JSON.stringify(change.after) : formatPrimitive(change.after as Primitive)}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      )}

      {/* ── PESTAÑA: JSON (soporte técnico) ──────────────────────────── */}
      {canEdit && (
        <TabsContent value="json" className="space-y-4 pt-4">
          <div className="rounded-lg border bg-white p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Editor JSON — soporte técnico</div>
                <div className="text-xs text-slate-500">
                  Edición directa del JSON completo. Usa esta pestaña para campos no disponibles en el editor principal. Cada guardado genera registro de auditoría.
                </div>
              </div>
              <Button onClick={handleSaveJson} disabled={isSaving} variant="outline">
                <PencilLine className="h-4 w-4 mr-2" />
                {isSaving ? "Guardando..." : "Guardar JSON"}
              </Button>
            </div>
            <Separator />
            <Textarea value={editorText} onChange={(event) => setEditorText(event.target.value)} className="min-h-[420px] font-mono text-xs" />
            {editorError && <div className="text-sm text-red-600">{editorError}</div>}
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