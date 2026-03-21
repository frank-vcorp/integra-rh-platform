/**
 * Panel compartido para visualizar y auditar la captura de visita.
 * @intervention ARCH-20260319-04
 * @respaldo PROYECTO.md
 */

import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Clock3, ExternalLink, FileImage, FileText, History, PencilLine } from "lucide-react";

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

function isUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function isImageUrl(value: string) {
  return /\.(png|jpe?g|webp|gif)$/i.test(value);
}

function formatPrimitive(value: Primitive) {
  if (value === null || value === undefined || value === "") return "Sin registro";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return String(value);
}

function renderPrimitiveValue(value: Primitive) {
  if (typeof value === "boolean") {
    return <Badge variant="outline">{value ? "Sí" : "No"}</Badge>;
  }

  if (typeof value === "string" && isUrl(value)) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-700 underline break-all">
        {isImageUrl(value) ? <FileImage className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
        {value}
      </a>
    );
  }

  return <span className="text-sm text-slate-800 whitespace-pre-wrap break-words">{formatPrimitive(value)}</span>;
}

function renderNode(label: string, value: unknown, path: string, depth = 0): JSX.Element {
  if (isPrimitive(value)) {
    return (
      <div key={path} className="space-y-1 rounded-md border bg-white p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
        <div>{renderPrimitiveValue(value)}</div>
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
      return (
        <div key={path} className="space-y-2 rounded-md border bg-white p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
          <div className="flex flex-col gap-2">
            {value.map((item, index) => (
              <div key={`${path}.${index}`} className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2">
                {renderPrimitiveValue(item as Primitive)}
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
                      renderNode(humanizeKey(childKey), childValue, `${path}.${index}.${childKey}`, depth + 1)
                    )
                  : renderNode(`${humanizeKey(label)} ${index + 1}`, item, `${path}.${index}`, depth + 1)}
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
          {entries.map(([childKey, childValue]) => renderNode(humanizeKey(childKey), childValue, `${path}.${childKey}`, depth + 1))}
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

export function VisitCapturePanel({
  data,
  portalUrl,
  portalStatus,
  canEdit = false,
  isSaving = false,
  onSave,
  auditEntries = [],
}: VisitCapturePanelProps) {
  const [editorText, setEditorText] = useState("");
  const [editorError, setEditorError] = useState<string | null>(null);

  useEffect(() => {
    setEditorText(JSON.stringify(data || {}, null, 2));
    setEditorError(null);
  }, [data]);

  const topLevelEntries = useMemo(() => Object.entries(data || {}), [data]);

  const handleSave = () => {
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
    <Tabs defaultValue="vista" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="vista">Vista</TabsTrigger>
        <TabsTrigger value="editor" disabled={!canEdit}>Editor</TabsTrigger>
        <TabsTrigger value="historial" disabled={!canEdit}>Historial</TabsTrigger>
      </TabsList>

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
              {topLevelEntries.map(([sectionKey, sectionValue]) => renderNode(humanizeKey(sectionKey), sectionValue, sectionKey))}
            </div>
          </ScrollArea>
        )}
      </TabsContent>

      <TabsContent value="editor" className="space-y-4 pt-4">
        <div className="rounded-lg border bg-white p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Edición controlada de la captura</div>
              <div className="text-xs text-slate-500">Cada guardado genera un registro de auditoría con el usuario y los campos modificados.</div>
            </div>
            <Button onClick={handleSave} disabled={!canEdit || isSaving}>
              <PencilLine className="h-4 w-4 mr-2" />
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
          <Separator />
          <Textarea value={editorText} onChange={(event) => setEditorText(event.target.value)} className="min-h-[420px] font-mono text-xs" />
          {editorError && <div className="text-sm text-red-600">{editorError}</div>}
        </div>
      </TabsContent>

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
    </Tabs>
  );
}