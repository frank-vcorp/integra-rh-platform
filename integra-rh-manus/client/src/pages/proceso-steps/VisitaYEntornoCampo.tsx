/**
 * @file VisitaYEntornoCampo.tsx
 * @description Paso 4: Visita Domiciliaria y Verificación del Entorno (Campo).
 * IMPL-20260311-04 | SPEC-003-CAPTURA-ANALISTA-REORDEN
 *
 * Funcionalidades:
 *  - Lectura de domicilio y entorno familiar desde perfilDetalle (trpc.candidates.getById)
 *  - Carga fotográfica Paste-to-Upload (fachada, interiores, doc. domicilio, INE, mapa)
 *  - Bloque de notas sociodemográficas (vivienda y condiciones de vida del encuestador)
 *  - Selector de evaluación final del encuestador (4 opciones)
 *  - Persistencia mediante trpc.processes.updatePanelDetail vía buildPayload
 */

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Home, Camera, MapPin, Users, Save, Upload, X,
  Loader2, CheckCircle2, AlertTriangle, XCircle,
  ClipboardX, ChevronDown, ChevronUp,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** IMPL-20260311-04 | SPEC-003-CAPTURA-ANALISTA-REORDEN */
interface Props {
  process: any;
}

const EVALUACION_OPTIONS = [
  { value: "aprobado",            label: "Aprobado",             emoji: "✅", badge: "bg-green-100 text-green-700 border-green-300" },
  { value: "riesgoso",            label: "Riesgoso",             emoji: "⚠️", badge: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  { value: "rechazado",           label: "Rechazado",            emoji: "❌", badge: "bg-red-100 text-red-700 border-red-300" },
  { value: "visita_no_realizada", label: "Visita No Realizada",  emoji: "🚫", badge: "bg-gray-100 text-gray-600 border-gray-300" },
] as const;

type EvaluacionValue = typeof EVALUACION_OPTIONS[number]["value"] | "";

const TIPO_VISITA_OPTIONS = [
  { value: "presencial", label: "🏠 Presencial" },
  { value: "virtual",    label: "💻 Virtual" },
];

/** Fila de lectura clave-valor */
function DataField({ label, value }: { label: string; value?: string | null }) {
  const hasVal = value !== undefined && value !== null && String(value).trim() !== "";
  return (
    <div className="flex justify-between items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-muted-foreground text-xs font-medium shrink-0">{label}</span>
      <span className="text-xs text-right max-w-[60%] break-words">
        {hasVal ? String(value) : <span className="italic text-muted-foreground/50">—</span>}
      </span>
    </div>
  );
}

export default function VisitaYEntornoCampo({ process }: Props) {
  const candidatoId: number | undefined = process?.candidatoId;

  // ── Estado del formulario local (inicializado desde props) ──────────────────
  const [localForm, setLocalForm] = useState({
    tipo: (process?.visitaDetalle?.tipo as string) ?? "",
    comentarios: (process?.visitaDetalle?.comentarios as string) ?? "",
    evaluacionEncuestador: (process?.visitaDetalle?.evaluacionEncuestador as EvaluacionValue) ?? "" as EvaluacionValue,
    fechaRealizacion: process?.visitaDetalle?.fechaRealizacion
      ? new Date(process.visitaDetalle.fechaRealizacion).toISOString().split("T")[0]
      : "",
  });

  const [photos, setPhotos] = useState<string[]>(
    Array.isArray(process?.visitaDetalle?.evidenciasGraficas)
      ? process.visitaDetalle.evidenciasGraficas
      : []
  );
  const [uploading, setUploading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [entornoExpanded, setEntornoExpanded] = useState(false);

  // ── tRPC ────────────────────────────────────────────────────────────────────
  const utils = trpc.useUtils();

  const { data: candidate, isLoading: loadingCandidate } = trpc.candidates.getById.useQuery(
    { id: candidatoId ?? 0 },
    { enabled: !!candidatoId }
  );

  const uploadDocMutation = trpc.documents.upload.useMutation({
    onError: (e: any) => toast.error("Error al subir foto: " + e.message),
  });

  const updatePanelDetail = trpc.processes.updatePanelDetail.useMutation({
    onSuccess: () => {
      utils.processes.getById.invalidate({ id: process.id });
      toast.success("Visita guardada correctamente");
    },
    onError: (e: any) => toast.error("Error al guardar: " + e.message),
  });

  // ── buildPayload: construye el payload para updatePanelDetail ───────────────
  const buildPayload = useCallback(
    (overridePhotos?: string[]) => ({
      id: process.id as number,
      estatusVisual: (process.estatusVisual ?? "en_proceso") as any,
      visitaDetalle: {
        tipo: (localForm.tipo as "virtual" | "presencial") || undefined,
        comentarios: localForm.comentarios || undefined,
        evaluacionEncuestador: (localForm.evaluacionEncuestador as any) || undefined,
        fechaRealizacion: localForm.fechaRealizacion || undefined,
        evidenciasGraficas: (overridePhotos ?? photos).filter(Boolean),
      },
    }),
    [process.id, process.estatusVisual, localForm, photos]
  );

  const handleSave = () => {
    updatePanelDetail.mutate(buildPayload());
  };

  // ── Helper: convierte Blob → base64 y sube al storage ──────────────────────
  const uploadBlob = useCallback(
    async (blob: Blob, suffix = ""): Promise<string> => {
      const arrayBuf = await blob.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(arrayBuf);
      for (let j = 0; j < bytes.byteLength; j++) binary += String.fromCharCode(bytes[j]);
      const base64 = btoa(binary);
      const res = await uploadDocMutation.mutateAsync({
        procesoId: process.id,
        tipoDocumento: "VISITA_FOTOGRAFIA",
        fileName: `visita-${suffix}-${Date.now()}.png`,
        contentType: blob.type || "image/png",
        base64,
      });
      return res.url;
    },
    [process.id, uploadDocMutation]
  );

  // ── Paste-to-upload ─────────────────────────────────────────────────────────
  const handlePaste = useCallback(
    async (e: React.ClipboardEvent<HTMLDivElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (!items[i].type.startsWith("image/")) continue;
        const blob = items[i].getAsFile();
        if (!blob) continue;
        try {
          setUploading(true);
          const url = await uploadBlob(blob, "paste");
          const newPhotos = [...photos, url];
          setPhotos(newPhotos);
          // Auto-guardar evidencias al pegar
          await updatePanelDetail.mutateAsync(buildPayload(newPhotos));
          toast.success("Foto añadida y guardada");
        } catch (err: any) {
          toast.error("Error al subir imagen: " + err.message);
        } finally {
          setUploading(false);
        }
      }
    },
    [photos, uploadBlob, updatePanelDetail, buildPayload]
  );

  // ── File input handler ──────────────────────────────────────────────────────
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.currentTarget.files;
      const inputEl = e.currentTarget;
      if (!files || files.length === 0) return;
      setUploading(true);
      const uploaded: string[] = [];
      for (let i = 0; i < files.length; i++) {
        try {
          const url = await uploadBlob(files[i], "file");
          uploaded.push(url);
        } catch (err: any) {
          toast.error(`Error con ${files[i].name}: ` + err.message);
        }
      }
      if (uploaded.length > 0) {
        const newPhotos = [...photos, ...uploaded];
        setPhotos(newPhotos);
        await updatePanelDetail.mutateAsync(buildPayload(newPhotos));
        toast.success(`${uploaded.length} foto(s) añadida(s) y guardada(s)`);
      }
      inputEl.value = "";
      setUploading(false);
    },
    [photos, uploadBlob, updatePanelDetail, buildPayload]
  );

  const handleRemovePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Datos derivados ─────────────────────────────────────────────────────────
  const perfil: any = (candidate as any)?.perfilDetalle ?? {};
  const domicilio = perfil.domicilio ?? {};
  const familia = perfil.situacionFamiliar ?? {};
  const visitStatus: any = process?.visitStatus ?? {};
  const evaluacionActual = EVALUACION_OPTIONS.find((o) => o.value === localForm.evaluacionEncuestador);

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <div className="bg-green-100 text-green-700 rounded-full p-2 mt-0.5">
          <Home className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Paso 4: Visita y Entorno en Campo</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Registro fotográfico de la visita domiciliaria, datos del entorno familiar y evaluación final del encuestador.
          </p>
        </div>
      </div>

      {/* ── A: Dirección + Entorno familiar (solo lectura desde perfilDetalle) ─ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Dirección del candidato */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-green-500" />
              Dirección del Candidato
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingCandidate ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Cargando perfil...</span>
              </div>
            ) : (
              <>
                <DataField label="Calle y Núm." value={[domicilio.calle, domicilio.numero].filter(Boolean).join(" ")} />
                <DataField label="Interior" value={domicilio.interior} />
                <DataField label="Colonia" value={domicilio.colonia} />
                <DataField label="Municipio / Estado" value={[domicilio.municipio, domicilio.estado].filter(Boolean).join(", ")} />
                <DataField label="C.P." value={domicilio.cp} />
                {domicilio.mapLink && (
                  <a
                    href={domicilio.mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                  >
                    <MapPin className="h-3.5 w-3.5" /> Ver en Google Maps
                  </a>
                )}
              </>
            )}
            {visitStatus.encuestadorId && (
              <div className="mt-3 pt-2 border-t border-border/40">
                <span className="text-xs text-muted-foreground font-medium">Encuestador: </span>
                <Badge variant="outline" className="text-xs ml-1">#{visitStatus.encuestadorId}</Badge>
                {visitStatus.scheduledDateTime && (
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    Agendado: {new Date(visitStatus.scheduledDateTime).toLocaleDateString("es-MX", { dateStyle: "medium" })}
                  </span>
                )}
                {visitStatus.status && (
                  <Badge variant="secondary" className="text-xs mt-1">{visitStatus.status.replace(/_/g, " ")}</Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Entorno familiar */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-green-500" />
                Entorno Familiar
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1"
                onClick={() => setEntornoExpanded((v) => !v)}
              >
                {entornoExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {entornoExpanded ? "Ocultar" : "Ver más"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingCandidate ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Cargando...</span>
              </div>
            ) : (
              <>
                <DataField label="Estado civil" value={familia.estadoCivil} />
                <DataField
                  label="Hijos"
                  value={
                    familia.tieneHijos === "sí"
                      ? `Sí (${familia.cantidadHijos ?? "?"} hijo${(familia.cantidadHijos ?? 0) !== 1 ? "s" : ""})`
                      : familia.tieneHijos
                  }
                />
                <DataField label="Tipo de vivienda" value={familia.vivienda} />
                {entornoExpanded && (
                  <>
                    <DataField label="Edades de hijos" value={familia.edadesHijos} />
                    <DataField label="Quién cuida a los hijos" value={familia.quienCuidaHijos} />
                    <DataField label="Dónde viven cuidadores" value={familia.dondeVivenCuidadores} />
                    <DataField label="Pareja de acuerdo con trabajo" value={familia.parejaDeAcuerdoConTrabajo} />
                    <DataField label="Pensión alimenticia" value={familia.pensionAlimenticia} />
                    <DataField label="Fecha matrimonio/unión" value={familia.fechaMatrimonioUnion} />
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── B: Carga fotográfica Paste-to-Upload ────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-4 w-4 text-green-500" />
            Evidencias Fotográficas de la Visita
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Fachada · Interiores · Comprobante de domicilio · INE · Mapa de ubicación
          </p>
        </CardHeader>
        <CardContent>
          {/* Zona paste-to-upload */}
          <div
            tabIndex={0}
            className={cn(
              "min-h-[88px] border-2 border-dashed rounded-lg p-3 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
              uploading
                ? "border-green-400 bg-green-50"
                : "border-muted-foreground/30 hover:border-green-400 hover:bg-green-50/40"
            )}
            onPaste={handlePaste}
            aria-label="Zona de pegado de imágenes"
          >
            {uploading ? (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="h-5 w-5 animate-spin text-green-600" />
                <span className="text-sm text-green-700">Subiendo imagen...</span>
              </div>
            ) : photos.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {photos.map((url, idx) => (
                    <div key={idx} className="relative group aspect-square">
                      <img
                        src={url}
                        alt={`Foto visita ${idx + 1}`}
                        className="h-full w-full object-cover rounded shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setLightboxIndex(idx)}
                      />
                      <button
                        type="button"
                        title="Eliminar foto"
                        onClick={(e) => { e.stopPropagation(); handleRemovePhoto(idx); }}
                        className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs leading-none"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {photos.length} foto(s) · Haz clic aquí y presiona <kbd className="font-mono bg-muted px-1 rounded">Ctrl+V</kbd> para añadir más
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-1.5 py-4 text-center">
                <Camera className="h-7 w-7 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">Haz clic aquí y presiona <kbd className="font-mono bg-muted px-1 rounded text-xs">Ctrl+V</kbd></p>
                <p className="text-xs text-muted-foreground/60">para pegar imágenes directamente del portapapeles</p>
              </div>
            )}
          </div>

          {/* Alternativa: selección de archivos */}
          <div className="mt-2 flex items-center gap-2">
            <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
            <label className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
              O selecciona archivos desde tu equipo (JPG, PNG, PDF)
              <input
                type="file"
                multiple
                accept="image/*,.pdf"
                className="sr-only"
                onChange={handleFileChange}
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* ── C: Datos sociodemográficos del encuestador ───────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Home className="h-4 w-4 text-green-500" />
            Observaciones Sociodemográficas (Encuestador)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium" htmlFor="tipoVisita">Tipo de visita realizada</Label>
              <Select
                value={localForm.tipo}
                onValueChange={(v) => setLocalForm((f) => ({ ...f, tipo: v }))}
              >
                <SelectTrigger id="tipoVisita" className="text-sm h-8">
                  <SelectValue placeholder="Seleccionar tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_VISITA_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium" htmlFor="fechaRealizacion">Fecha de realización</Label>
              <input
                id="fechaRealizacion"
                type="date"
                className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={localForm.fechaRealizacion}
                onChange={(e) => setLocalForm((f) => ({ ...f, fechaRealizacion: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium" htmlFor="comentarios">
              Notas sobre la vivienda y condiciones de vida
            </Label>
            <Textarea
              id="comentarios"
              placeholder="Describe el estado general de la vivienda, servicios disponibles, condiciones de vida observadas, número de habitantes, estado de la fachada y entorno inmediato..."
              className="text-sm resize-none min-h-[100px]"
              value={localForm.comentarios}
              onChange={(e) => setLocalForm((f) => ({ ...f, comentarios: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground/70">
              Campo libre para observaciones del encuestador local. Se guarda en el expediente.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── D: Evaluación final del encuestador ─────────────────────────────── */}
      <Card
        className={cn(
          "border-2 transition-colors",
          localForm.evaluacionEncuestador === "aprobado"            && "border-green-300 bg-green-50/30",
          localForm.evaluacionEncuestador === "riesgoso"            && "border-yellow-300 bg-yellow-50/30",
          localForm.evaluacionEncuestador === "rechazado"           && "border-red-300 bg-red-50/30",
          localForm.evaluacionEncuestador === "visita_no_realizada" && "border-gray-300 bg-gray-50/30",
          !localForm.evaluacionEncuestador                          && "border-dashed"
        )}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            {localForm.evaluacionEncuestador === "aprobado"            && <CheckCircle2  className="h-4 w-4 text-green-600" />}
            {localForm.evaluacionEncuestador === "riesgoso"            && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
            {localForm.evaluacionEncuestador === "rechazado"           && <XCircle       className="h-4 w-4 text-red-600" />}
            {localForm.evaluacionEncuestador === "visita_no_realizada" && <ClipboardX    className="h-4 w-4 text-gray-500" />}
            {!localForm.evaluacionEncuestador                          && <AlertTriangle className="h-4 w-4 text-muted-foreground" />}
            Evaluación Final del Encuestador
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Selecciona el resultado global de la visita domiciliaria.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {EVALUACION_OPTIONS.map((opt) => {
              const isSelected = localForm.evaluacionEncuestador === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setLocalForm((f) => ({
                      ...f,
                      evaluacionEncuestador: isSelected ? "" : opt.value,
                    }))
                  }
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg px-3 py-3 text-xs font-medium border-2 transition-all select-none",
                    isSelected
                      ? `${opt.badge} font-semibold scale-[1.02] shadow-sm`
                      : "border-border/60 hover:border-muted-foreground/40 bg-background"
                  )}
                >
                  <span className="text-xl leading-none">{opt.emoji}</span>
                  <span className="text-center leading-tight">{opt.label}</span>
                </button>
              );
            })}
          </div>

          {evaluacionActual && (
            <div className="mt-3 flex items-center gap-2">
              <Badge className={cn("text-xs", evaluacionActual.badge)}>
                {evaluacionActual.emoji} {evaluacionActual.label}
              </Badge>
              <span className="text-xs text-muted-foreground">seleccionada — se guardará con los datos de la visita</span>
            </div>
          )}
          {!localForm.evaluacionEncuestador && (
            <p className="mt-2 text-xs text-muted-foreground/60 italic">
              Sin evaluación seleccionada aún.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Footer: Botón guardar ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          Los cambios se guardan al pulsar el botón. Las fotos se auto-guardan al pegarlas.
        </p>
        <Button
          onClick={handleSave}
          disabled={updatePanelDetail.isPending}
          className="gap-2 bg-green-600 hover:bg-green-700 text-white"
        >
          {updatePanelDetail.isPending
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Save className="h-4 w-4" />
          }
          {updatePanelDetail.isPending ? "Guardando..." : "Guardar Visita"}
        </Button>
      </div>

      {/* ── Lightbox básico ─────────────────────────────────────────────────── */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={photos[lightboxIndex]}
              alt={`Foto ${lightboxIndex + 1}`}
              className="max-h-[80vh] max-w-full rounded-lg shadow-2xl object-contain"
            />
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full h-8 w-8 flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
              {lightboxIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setLightboxIndex((i) => (i ?? 1) - 1)}
                  className="bg-black/50 text-white rounded-full h-8 w-8 flex items-center justify-center hover:bg-black/70 transition-colors text-sm"
                >←</button>
              )}
              <span className="bg-black/50 text-white rounded-full h-8 px-3 flex items-center text-xs">
                {lightboxIndex + 1} / {photos.length}
              </span>
              {lightboxIndex < photos.length - 1 && (
                <button
                  type="button"
                  onClick={() => setLightboxIndex((i) => (i ?? 0) + 1)}
                  className="bg-black/50 text-white rounded-full h-8 w-8 flex items-center justify-center hover:bg-black/70 transition-colors text-sm"
                >→</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
