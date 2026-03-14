/** @intervention IMPL-20260313-03b */
/**
 * EncuestadorPortal.tsx
 * PWA móvil para encuestadores en campo — Ruta pública /e/:token
 * @intervention IMPL-20260313-03b
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// ──────────────────────────────────────────────
// IndexedDB helpers
// ──────────────────────────────────────────────
const DB_NAME = "encuestador_portal";
const STORE = "drafts";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveToIndexedDB(key: string, data: any): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const req = store.put(data, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function loadFromIndexedDB(key: string): Promise<any | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function clearFromIndexedDB(key: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function deepSet(obj: any, path: string, value: any): any {
  const keys = path.split(".");
  const result = { ...obj };
  let cur: any = result;
  for (let i = 0; i < keys.length - 1; i++) {
    cur[keys[i]] = { ...(cur[keys[i]] || {}) };
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
  return result;
}

// ──────────────────────────────────────────────
// Tipos auxiliares
// ──────────────────────────────────────────────
type StepType = "loading" | "error" | "privacy" | "form" | "done";
type SyncStatus = "idle" | "saving" | "saved" | "offline";

const ESCOLARIDAD_OPTS = [
  "Sin estudios",
  "Primaria",
  "Secundaria",
  "Preparatoria",
  "Técnico",
  "Licenciatura",
  "Maestría",
  "Doctorado",
];

const PARENTESCO_OPTS = [
  "Candidato",
  "Padre",
  "Madre",
  "Esposo/a",
  "Hijo/a",
  "Hermano/a",
  "Otro",
];

const SECTION_TITLES: Record<number, string> = {
  1: "Ubicación y Domicilio",
  2: "Información Académica",
  3: "Cotejo de Documentos",
  4: "Datos Familiares",
  5: "Dinámica Familiar",
  6: "Referencias Económicas",
  7: "Estado de Salud y Hábitos",
  8: "Información Social y Pasatiempos",
  9: "Área Jurídica",
  10: "Estructura y Dinámica de la Vivienda",
  11: "Fotografías del Entorno",
  12: "Resumen y Firma",
  13: "Créditos, Propiedades y Patrimonio",
  14: "Inmueble",
  15: "Referencias Vecinales",
  16: "Referencias Personales",
  17: "Otros Datos",
};
const TOTAL_SECTIONS = 17;

// ──────────────────────────────────────────────
// Sub-componente: Acordeón de Sección (wizard)
// ──────────────────────────────────────────────
function SectionAccordion({
  active,
  children,
}: {
  index: number;
  title: string;
  active: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  if (!active) return null;
  return <div className="space-y-4">{children}</div>;
}

// ──────────────────────────────────────────────
// Sub-componente: Campo con Label
// ──────────────────────────────────────────────
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
        {label}
      </Label>
      {children}
    </div>
  );
}

// ──────────────────────────────────────────────
// Sub-componente: Switch con Label
// ──────────────────────────────────────────────
function SwitchField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Switch checked={value} onCheckedChange={onChange} />
        <Label className="text-sm font-medium text-gray-700">{label}</Label>
      </div>
      {value && children && (
        <div className="ml-9 space-y-2 border-l-2 border-blue-200 pl-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Sub-componente: Selector nativo
// ──────────────────────────────────────────────
function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <Field label={label}>
      <select
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Seleccionar...</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </Field>
  );
}

// ──────────────────────────────────────────────
// Sub-componente: Botón de cámara con preview
// ──────────────────────────────────────────────
function CameraField({
  label,
  value,
  onChange,
  size = 64,
}: {
  label: string;
  value?: string;
  onChange: (b64: string) => void;
  size?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex items-center gap-3">
      <div>
        <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1">
          {label}
        </Label>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="px-3 py-1.5 rounded border border-dashed border-blue-400 text-blue-600 text-sm hover:bg-blue-50 transition-colors"
        >
          📷 Foto
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFile}
        />
      </div>
      {value && (
        <img
          src={value}
          alt={label}
          width={size}
          height={size}
          className="rounded border border-gray-300 object-cover"
          style={{ width: size, height: size }}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────
export default function EncuestadorPortal() {
  const { token } = useParams<{ token: string }>();

  const [step, setStep] = useState<StepType>("loading");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [activeSection, setActiveSection] = useState<number>(1);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");

  // Dynamic arrays per section
  const [familiares, setFamiliares] = useState<any[]>([]);
  const [otrasPersonas, setOtrasPersonas] = useState<any[]>([]);
  const [cursos, setCursos] = useState<any[]>([]);
  const [ingresos, setIngresos] = useState<any[]>([]);
  const [creditos, setCreditos] = useState<any[]>([
    { institucion: "INFONAVIT", monto: "", mensualidad: "", adeudo: "", fijo: true },
    { institucion: "FONACOT", monto: "", mensualidad: "", adeudo: "", fijo: true },
  ]);
  const [bienesRaices, setBienesRaices] = useState<any[]>([]);
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [negocios, setNegocios] = useState<any[]>([]);
  const [refVecinales, setRefVecinales] = useState<any[]>([]);
  const [refPersonales, setRefPersonales] = useState<any[]>([]);

  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const contextQuery = trpc.surveyorPortal.getContext.useQuery(
    { token: token! },
    { enabled: !!token, retry: false, refetchOnWindowFocus: false, staleTime: Infinity }
  );
  const saveProgressMutation = trpc.surveyorPortal.saveProgress.useMutation();
  const completeMutation = trpc.surveyorPortal.complete.useMutation();
  const uploadPhotoMutation = trpc.surveyorPortal.uploadPhoto.useMutation();

  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // ── Transición loading → privacy | error ──
  useEffect(() => {
    if (contextQuery.isLoading) return;
    if (contextQuery.error) {
      setStep("error");
      return;
    }
    if (contextQuery.data) {
      loadFromIndexedDB(token!).then((saved) => {
        if (saved) setFormData(saved);
        setStep("privacy");
      });
    }
  }, [contextQuery.isLoading, contextQuery.error, contextQuery.data, token]);

  // ── Online / offline ──
  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      autoSave(formData, true);
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  // ── beforeunload guard ──
  useEffect(() => {
    if (step !== "form") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [step]);

  // ── Helpers de actualización ──
  const update = useCallback((path: string, value: any) => {
    setFormData((prev) => {
      const next = deepSet(prev, path, value);
      scheduleAutoSave(next);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scheduleAutoSave = (data: Record<string, any>) => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => autoSave(data, isOnline), 2000);
  };

  const autoSave = async (data: Record<string, any>, online: boolean) => {
    setSyncStatus("saving");
    await saveToIndexedDB(token!, data);
    if (online) {
      try {
        await saveProgressMutation.mutateAsync({ token: token!, data });
        setSyncStatus("saved");
      } catch {
        setSyncStatus("offline");
      }
    } else {
      setSyncStatus("offline");
    }
  };

  // Shorthand para campos simples
  const val = (path: string, fallback: any = "") =>
    path.split(".").reduce((o, k) => (o ?? {})[k], formData as any) ?? fallback;

  // ── Captura GPS helper ──
  const captureGPS = (): Promise<{ lat: number; lon: number; accuracy: number } | null> =>
    new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
        () => resolve(null),
        { timeout: 8000 }
      );
    });

  // ── Progreso de secciones ──
  const sectionCount = TOTAL_SECTIONS;
  const filledSections = [
    val("ubicacion.domicilio"),
    val("academica.gradoEstudios"),
    val("documentos"),
    familiares.length > 0,
    val("dinamicaFamiliar.vivenSolos"),
    ingresos.length > 0 || val("egresos.alimentacion"),
    val("salud.servicioMedico"),
    val("social.pasatiempos"),
    val("juridica.procesoLegal"),
    val("vivienda.personasDiscapacidad"),
    val("fotos"),
    val("cierre.observaciones"),
    creditos.length > 0 || bienesRaices.length > 0,
    val("inmueble.tipoCasa"),
    refVecinales.length > 0,
    val("otrosDatos.trabajoGrupo"),
  ].filter(Boolean).length;

  const progressPct = Math.round((filledSections / sectionCount) * 100);

  // ── Canvas de firma ──
  const startDraw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    setIsDrawing(true);
    const canvas = sigCanvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();
    let x: number, y: number;
    if ("touches" in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const drawMove = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    const canvas = sigCanvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();
    let x: number, y: number;
    if ("touches" in e) {
      e.preventDefault();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = sigCanvasRef.current!;
    const dataUrl = canvas.toDataURL("image/png");
    update("cierre.firmaUrl", dataUrl);
  };

  const clearSignature = () => {
    const canvas = sigCanvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    update("cierre.firmaUrl", null);
  };

  // ── Envío final ──
  const handleComplete = async () => {
    const gps = await captureGPS();

    // ── Fase 1: Recopilar todos los campos con base64 ──────────────────────
    // Recorre recursivamente formData buscando strings base64 (data:image/...)
    type PhotoEntry = { path: string; base64: string; mimeType: string };

    function extractPhotoFields(obj: any, prefix = ""): PhotoEntry[] {
      const results: PhotoEntry[] = [];
      if (!obj || typeof obj !== "object") return results;
      for (const [key, val] of Object.entries(obj)) {
        const currentPath = prefix ? `${prefix}.${key}` : key;
        if (typeof val === "string" && val.startsWith("data:image/")) {
          const mimeMatch = val.match(/^data:(image\/[a-z]+);base64,/);
          const mimeType  = mimeMatch ? mimeMatch[1] : "image/jpeg";
          results.push({ path: currentPath, base64: val, mimeType });
        } else if (Array.isArray(val)) {
          val.forEach((item, i) => results.push(...extractPhotoFields(item, `${currentPath}.${i}`)));
        } else if (typeof val === "object") {
          results.push(...extractPhotoFields(val, currentPath));
        }
      }
      return results;
    }

    let finalData = deepSet(
      deepSet(formData, "_sessionEndedAt", new Date().toISOString()),
      "_sessionEndGps",
      gps
    );

    const photos = extractPhotoFields(finalData);

    // ── Fase 2: Subir fotos a Firebase Storage ────────────────────────────
    if (photos.length > 0) {
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        setUploadStatus(`Subiendo fotos... ${i + 1}/${photos.length}`);
        try {
          const { url } = await uploadPhotoMutation.mutateAsync({
            token: token!,
            fieldPath: photo.path,
            base64: photo.base64,
            mimeType: photo.mimeType,
          });
          // Reemplazar base64 con URL en finalData usando deepSet
          finalData = deepSet(finalData, photo.path, url);
        } catch (err) {
          // Si falla la subida de una foto, continúa con las demás (no bloquear el envío)
          console.warn(`[EncuestadorPortal] No se pudo subir foto ${photo.path}:`, err);
        }
      }
    }

    setUploadStatus(null);
    setFormData(finalData);

    // ── Fase 3: Enviar datos finales ──────────────────────────────────────
    completeMutation.mutate(
      { token: token!, data: finalData },
      {
        onSuccess: async () => {
          await clearFromIndexedDB(token!);
          setStep("done");
        },
      }
    );
  };;

  // ──────────────────────────────────────────────────────────────────
  // RENDER: Loading
  // ──────────────────────────────────────────────────────────────────
  if (step === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-600 text-sm">Cargando formulario...</p>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // RENDER: Error
  // ──────────────────────────────────────────────────────────────────
  if (step === "error") {
    const msg = (contextQuery.error as any)?.message ?? "";
    let friendlyMsg = "Ocurrió un error al cargar el formulario.";
    if (msg.includes("completado") || msg.includes("COMPLETED")) {
      friendlyMsg = "Este formulario ya fue completado anteriormente.";
    } else if (msg.includes("expirado") || msg.includes("EXPIRED")) {
      friendlyMsg = "Este link ha expirado.";
    } else if (msg.includes("inválido") || msg.includes("NOT_FOUND") || msg.includes("invalid")) {
      friendlyMsg = "Link inválido. Verifica que el enlace sea correcto.";
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">⛔</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">No se puede abrir el formulario</h1>
          <p className="text-gray-600 text-sm">{friendlyMsg}</p>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // RENDER: Done
  // ──────────────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50 p-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            ¡Formulario enviado exitosamente!
          </h1>
          <p className="text-gray-600">
            Gracias por completar el estudio socioeconómico.
          </p>
        </div>
      </div>
    );
  }

  const candidateName = (contextQuery.data as any)?.candidateName ?? "Candidato";

  // ──────────────────────────────────────────────────────────────────
  // RENDER: Privacy
  // ──────────────────────────────────────────────────────────────────
  if (step === "privacy") {
    const handleStartSurvey = async () => {
      const gps = await captureGPS();
      const startData = deepSet(
        deepSet(
          deepSet(
            deepSet(formData, "_privacyAcceptedAt", new Date().toISOString()),
            "_sessionStartedAt",
            new Date().toISOString()
          ),
          "_sessionStartGps",
          gps
        ),
        "_deviceInfo",
        { userAgent: navigator.userAgent, platform: navigator.platform }
      );
      setFormData(startData);
      await saveToIndexedDB(token!, startData);
      setStep("form");
    };

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-blue-700 text-white px-6 py-4">
            <h1 className="text-lg font-bold">Sinergia RH</h1>
            <p className="text-sm text-blue-200">
              Estudio Socioeconómico — {candidateName}
            </p>
          </div>
          <div className="p-6 space-y-4">
            <h2 className="font-bold text-gray-800 text-base">
              Aviso de Privacidad
            </h2>
            <div
              className="text-xs text-gray-600 leading-relaxed max-h-64 overflow-y-auto border border-gray-200 rounded p-3 bg-gray-50"
            >
              <p className="font-semibold mb-2">AVISO DE PRIVACIDAD SINERGIA RH</p>
              <p className="mb-2">
                En cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de
                los Particulares (LFPDPPP), Sinergia RH, responsable del tratamiento de sus datos
                personales, le informa que los datos que proporcione en este formulario serán
                utilizados exclusivamente con las siguientes finalidades:
              </p>
              <ul className="list-disc ml-4 space-y-1 mb-2">
                <li>Realizar el estudio socioeconómico del candidato.</li>
                <li>Verificar la información proporcionada en el proceso de selección.</li>
                <li>Cumplir con las obligaciones derivadas del proceso de contratación.</li>
              </ul>
              <p className="mb-2">
                Sus datos personales serán tratados con estricta confidencialidad y no serán
                transferidos a terceros sin su consentimiento, salvo en los casos previstos por la
                ley. Usted tiene el derecho de Acceso, Rectificación, Cancelación y Oposición
                (derechos ARCO) respecto a sus datos personales.
              </p>
              <p>
                Para ejercer sus derechos ARCO o revocar su consentimiento, puede contactarnos en:
                privacidad@sinergiarhmexico.com
              </p>
            </div>

            <div className="flex items-start gap-3 pt-2">
              <input
                id="privacy-check"
                type="checkbox"
                className="mt-0.5 w-4 h-4 accent-blue-600"
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
              />
              <label
                htmlFor="privacy-check"
                className="text-sm text-gray-700 cursor-pointer"
              >
                He leído y acepto el Aviso de Privacidad
              </label>
            </div>

            <Button
              className="w-full"
              disabled={!privacyAccepted}
              onClick={handleStartSurvey}
            >
              Comenzar encuesta →
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // RENDER: Form
  // ──────────────────────────────────────────────────────────────────

  const syncIcon =
    syncStatus === "saving"
      ? "💾 Guardando..."
      : syncStatus === "saved"
      ? "✅ Sincronizado"
      : syncStatus === "offline"
      ? "🔴 Sin conexión — guardado local"
      : "";

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header fijo */}
      <div className="sticky top-0 z-20 bg-blue-700 text-white shadow-md">
        <div className="flex items-center justify-between px-4 py-2">
          <div>
            <span className="font-bold text-sm">Sinergia RH</span>
            <span className="mx-2 text-blue-300">·</span>
            <span className="text-xs text-blue-200 truncate max-w-[160px] inline-block align-middle">
              {candidateName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                isOnline
                  ? "bg-green-400 text-green-900"
                  : "bg-red-400 text-white"
              }`}
            >
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
        </div>
        {/* Barra de progreso */}
        <div className="px-4 pb-2">
          <div className="flex items-center justify-between text-xs text-blue-200 mb-1">
            <span>Progreso</span>
            <span>{progressPct}%</span>
          </div>
          <div className="w-full bg-blue-900 rounded-full h-1.5">
            <div
              className="bg-green-400 h-1.5 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        {syncIcon && (
          <div className="px-4 pb-1 text-xs text-blue-200">{syncIcon}</div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 pb-28">
        {/* Encabezado de sección */}
        <div className="mb-5 flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-sm shrink-0 shadow">
            {activeSection}
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-800 leading-tight truncate">{SECTION_TITLES[activeSection]}</h2>
            <p className="text-xs text-gray-400">Sección {activeSection} de {TOTAL_SECTIONS}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">

        {/* ─────────────────────────────────────────── */}
        {/* SECCIÓN 1 — UBICACIÓN Y DOMICILIO */}
        {/* ─────────────────────────────────────────── */}
        <SectionAccordion
          index={1}
          title="Ubicación y Domicilio"
          active={activeSection === 1}
          onToggle={() => setActiveSection(activeSection === 1 ? 0 : 1)}
        >
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                const gps = await captureGPS();
                if (gps) {
                  update("ubicacion.gps", { ...gps, locked: true });
                } else {
                  alert("⚠️ No se pudo obtener el GPS. Continúa sin él.");
                }
              }}
            >
              📍 Obtener GPS
            </Button>
            {val("ubicacion.gps.lat") ? (
              <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
                ✅ GPS: {Number(val("ubicacion.gps.lat")).toFixed(5)},{" "}
                {Number(val("ubicacion.gps.lon")).toFixed(5)}
              </p>
            ) : (
              <p className="text-xs text-amber-600">⚠️ Sin GPS</p>
            )}
            <Field label="DOMICILIO (CALLE Y ENTRE CALLES)">
              <Textarea
                value={val("ubicacion.domicilio")}
                onChange={(e) => update("ubicacion.domicilio", e.target.value)}
                rows={2}
              />
            </Field>
            <Field label="C.P:">
              <Input
                type="number"
                value={val("ubicacion.cp")}
                onChange={(e) => update("ubicacion.cp", e.target.value)}
              />
            </Field>
            <Field label="COLONIA Y MUNICIPIO:">
              <Input
                value={val("ubicacion.coloniaMunicipio")}
                onChange={(e) => update("ubicacion.coloniaMunicipio", e.target.value)}
              />
            </Field>
            <Field label="ESTADO:">
              <Input
                value={val("ubicacion.estado")}
                onChange={(e) => update("ubicacion.estado", e.target.value)}
              />
            </Field>
          </div>
        </SectionAccordion>

        {/* ─────────────────────────────────────────── */}
        {/* SECCIÓN 2 — INFORMACIÓN ACADÉMICA */}
        {/* ─────────────────────────────────────────── */}
        <SectionAccordion
          index={2}
          title="Información Académica"
          active={activeSection === 2}
          onToggle={() => setActiveSection(activeSection === 2 ? 0 : 2)}
        >
          <SelectField
            label="ÚLTIMO GRADO DE ESTUDIOS:"
            value={val("academica.gradoEstudios")}
            onChange={(v) => update("academica.gradoEstudios", v)}
            options={ESCOLARIDAD_OPTS}
          />
          <Field label="INSTITUCIÓN:">
            <Input
              value={val("academica.institucion")}
              onChange={(e) => update("academica.institucion", e.target.value)}
            />
          </Field>
          <Field label="CIUDAD:">
            <Input
              value={val("academica.ciudad")}
              onChange={(e) => update("academica.ciudad", e.target.value)}
            />
          </Field>
          <Field label="PERÍODO:">
            <Input
              value={val("academica.periodo")}
              onChange={(e) => update("academica.periodo", e.target.value)}
            />
          </Field>
          <SelectField
            label="DOCUMENTO OBTENIDO:"
            value={val("academica.documento")}
            onChange={(v) => update("academica.documento", v)}
            options={["Certificado", "Título", "Carta Pasante", "Trunco", "Ninguno"]}
          />
          <Field label="(DOCUMENTO PRESENTADO Y FOLIO)">
            <Input
              value={val("academica.folio")}
              onChange={(e) => update("academica.folio", e.target.value)}
            />
          </Field>

          <SwitchField
            label="ESTUDIA ACTUALMENTE:"
            value={!!val("academica.estudiaActualmente")}
            onChange={(v) => update("academica.estudiaActualmente", v)}
          >
            <Field label="Institución actual">
              <Input
                value={val("academica.institucionActual")}
                onChange={(e) => update("academica.institucionActual", e.target.value)}
              />
            </Field>
            <Field label="Carrera">
              <Input
                value={val("academica.carreraActual")}
                onChange={(e) => update("academica.carreraActual", e.target.value)}
              />
            </Field>
          </SwitchField>

          {/* CURSOS */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-700 uppercase">
              CURSOS O CAPACITACIONES CON VALIDEZ CURRICULAR:
            </Label>
            {cursos.map((c, i) => (
              <div key={i} className="border rounded p-2 space-y-2 bg-gray-50">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-600">Curso {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => setCursos((prev) => prev.filter((_, j) => j !== i))}
                    className="text-red-500 text-sm hover:text-red-700"
                  >
                    ✕
                  </button>
                </div>
                <Field label="INSTITUCIÓN">
                  <Input
                    value={c.institucion ?? ""}
                    onChange={(e) =>
                      setCursos((prev) =>
                        prev.map((x, j) =>
                          j === i ? { ...x, institucion: e.target.value } : x
                        )
                      )
                    }
                  />
                </Field>
                <Field label="PERIODO">
                  <Input
                    value={c.periodo ?? ""}
                    onChange={(e) =>
                      setCursos((prev) =>
                        prev.map((x, j) =>
                          j === i ? { ...x, periodo: e.target.value } : x
                        )
                      )
                    }
                  />
                </Field>
                <Field label="TITULO">
                  <Input
                    value={c.titulo ?? ""}
                    onChange={(e) =>
                      setCursos((prev) =>
                        prev.map((x, j) =>
                          j === i ? { ...x, titulo: e.target.value } : x
                        )
                      )
                    }
                  />
                </Field>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCursos((prev) => [...prev, {}])}
            >
              + Agregar curso
            </Button>
          </div>

          <Field label="EQUIPOS Y MÁQUINAS QUE DOMINA:">
            <Textarea
              value={val("academica.equipos")}
              onChange={(e) => update("academica.equipos", e.target.value)}
              rows={2}
            />
          </Field>
          <Field label="PROGRAMAS QUE DOMINA:">
            <Textarea
              value={val("academica.programas")}
              onChange={(e) => update("academica.programas", e.target.value)}
              rows={2}
            />
          </Field>
          <Field label="FUNCIONES ADMINISTRATIVAS QUE DOMINA:">
            <Textarea
              value={val("academica.funcionesAdmin")}
              onChange={(e) => update("academica.funcionesAdmin", e.target.value)}
              rows={2}
            />
          </Field>
          <Field label="OTROS CONOCIMIENTOS:">
            <Textarea
              value={val("academica.otrosConocimientos")}
              onChange={(e) => update("academica.otrosConocimientos", e.target.value)}
              rows={2}
            />
          </Field>
        </SectionAccordion>

        {/* ─────────────────────────────────────────── */}
        {/* SECCIÓN 3 — COTEJO DE DOCUMENTOS */}
        {/* ─────────────────────────────────────────── */}
        <SectionAccordion
          index={3}
          title="Cotejo de Documentos"
          active={activeSection === 3}
          onToggle={() => setActiveSection(activeSection === 3 ? 0 : 3)}
        >
          {/* Helper local para fila de documento */}
          {[
            { key: "actaNacimiento", label: "ACTA DE NACIMIENTO:" },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-2 py-2 border-b border-gray-100">
              <SwitchField
                label={label}
                value={!!val(`documentos.${key}.tiene`)}
                onChange={(v) => update(`documentos.${key}.tiene`, v)}
              >
                <CameraField
                  label="Foto"
                  value={val(`documentos.${key}.foto`)}
                  onChange={(b) => update(`documentos.${key}.foto`, b)}
                />
              </SwitchField>
            </div>
          ))}

          {/* Credencial de elector — 2 fotos */}
          <div className="space-y-2 py-2 border-b border-gray-100">
            <SwitchField
              label="CREDENCIAL DE ELECTOR:"
              value={!!val("documentos.credencialElector.tiene")}
              onChange={(v) => update("documentos.credencialElector.tiene", v)}
            >
              <CameraField
                label="Frente"
                value={val("documentos.credencialElector.fotoFrente")}
                onChange={(b) => update("documentos.credencialElector.fotoFrente", b)}
              />
              <CameraField
                label="Reverso"
                value={val("documentos.credencialElector.fotoReverso")}
                onChange={(b) => update("documentos.credencialElector.fotoReverso", b)}
              />
            </SwitchField>
          </div>

          {/* Comprobante de domicilio con condicionales */}
          <div className="space-y-2 py-2 border-b border-gray-100">
            <SwitchField
              label="COMPROBANTE DE DOMICILIO:"
              value={!!val("documentos.comprobanteDomicilio.tiene")}
              onChange={(v) => update("documentos.comprobanteDomicilio.tiene", v)}
            >
              <CameraField
                label="Foto"
                value={val("documentos.comprobanteDomicilio.foto")}
                onChange={(b) => update("documentos.comprobanteDomicilio.foto", b)}
              />
              <Field label="RECIBO DE CFE... A NOMBRE DE:">
                <Input
                  value={val("documentos.comprobanteDomicilio.nombreTitular")}
                  onChange={(e) =>
                    update("documentos.comprobanteDomicilio.nombreTitular", e.target.value)
                  }
                />
              </Field>
              <Field label="PARENTESCO CON EL TITULAR...">
                <Input
                  value={val("documentos.comprobanteDomicilio.parentescoTitular")}
                  onChange={(e) =>
                    update(
                      "documentos.comprobanteDomicilio.parentescoTitular",
                      e.target.value
                    )
                  }
                />
              </Field>
            </SwitchField>
          </div>

          {[
            { key: "cartillaMilitar", label: "CARTILLA MILITAR:" },
            { key: "pasaporte", label: "PASAPORTE:" },
            { key: "visaAmericana", label: "VISA AMERICANA:" },
            { key: "cartasRecomendacion", label: "CARTAS DE RECOMENDACIÓN:" },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-2 py-2 border-b border-gray-100">
              <SwitchField
                label={label}
                value={!!val(`documentos.${key}.tiene`)}
                onChange={(v) => update(`documentos.${key}.tiene`, v)}
              >
                <CameraField
                  label="Foto"
                  value={val(`documentos.${key}.foto`)}
                  onChange={(b) => update(`documentos.${key}.foto`, b)}
                />
              </SwitchField>
            </div>
          ))}

          {/* Crédito INFONAVIT */}
          <div className="space-y-2 py-2 border-b border-gray-100">
            <Label className="text-xs font-medium text-gray-600 uppercase">
              CRÉDITO INFONAVIT (NUMERO Y MONTO):
            </Label>
            <Input
              value={val("documentos.creditoInfonavit.texto")}
              onChange={(e) => update("documentos.creditoInfonavit.texto", e.target.value)}
            />
            <CameraField
              label="Foto"
              value={val("documentos.creditoInfonavit.foto")}
              onChange={(b) => update("documentos.creditoInfonavit.foto", b)}
            />
          </div>

          {/* Tipo de sangre */}
          <Field label="TIPO DE SANGRE:">
            <Input
              value={val("documentos.tipoSangre")}
              onChange={(e) => update("documentos.tipoSangre", e.target.value)}
            />
          </Field>

          {/* AFORE */}
          <div className="space-y-2 py-2 border-b border-gray-100">
            <Field label="AFILIADO EN LA AFORE:">
              <Input
                value={val("documentos.afore.nombre")}
                onChange={(e) => update("documentos.afore.nombre", e.target.value)}
              />
            </Field>
            <CameraField
              label="Foto AFORE"
              value={val("documentos.afore.foto")}
              onChange={(b) => update("documentos.afore.foto", b)}
            />
          </div>

          {/* Licencia de conducir — 2 fotos */}
          <div className="space-y-2 py-2 border-b border-gray-100">
            <SwitchField
              label="LICENCIA DE CONDUCIR:"
              value={!!val("documentos.licenciaConducir.tiene")}
              onChange={(v) => update("documentos.licenciaConducir.tiene", v)}
            >
              <CameraField
                label="Frente"
                value={val("documentos.licenciaConducir.fotoFrente")}
                onChange={(b) => update("documentos.licenciaConducir.fotoFrente", b)}
              />
              <CameraField
                label="Reverso"
                value={val("documentos.licenciaConducir.fotoReverso")}
                onChange={(b) => update("documentos.licenciaConducir.fotoReverso", b)}
              />
            </SwitchField>
          </div>

          {/* Certificado o título */}
          <div className="space-y-2 py-2">
            <SwitchField
              label="CERTIFICADO O TITULO RECIBIDO:"
              value={!!val("documentos.certificadoTitulo.tiene")}
              onChange={(v) => update("documentos.certificadoTitulo.tiene", v)}
            >
              <CameraField
                label="Foto"
                value={val("documentos.certificadoTitulo.foto")}
                onChange={(b) => update("documentos.certificadoTitulo.foto", b)}
              />
            </SwitchField>
          </div>
        </SectionAccordion>

        {/* ─────────────────────────────────────────── */}
        {/* SECCIÓN 4 — DATOS FAMILIARES */}
        {/* ─────────────────────────────────────────── */}
        <SectionAccordion
          index={4}
          title="Datos Familiares"
          active={activeSection === 4}
          onToggle={() => setActiveSection(activeSection === 4 ? 0 : 4)}
        >
          <Label className="text-xs font-semibold text-gray-700 uppercase">DATOS FAMILIARES</Label>
          {familiares.map((f, i) => (
            <div key={i} className="border rounded p-2 space-y-2 bg-gray-50 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium">Familiar {i + 1}</span>
                <button
                  type="button"
                  onClick={() => setFamiliares((prev) => prev.filter((_, j) => j !== i))}
                  className="text-red-500 text-sm"
                >
                  ✕
                </button>
              </div>
              {[
                { key: "parentesco", label: "PARENTESCO", type: "select", opts: PARENTESCO_OPTS },
                { key: "nombre", label: "NOMBRE", type: "text" },
                { key: "edad", label: "EDAD", type: "number" },
                { key: "escolaridad", label: "ESCOLARIDAD", type: "select", opts: ESCOLARIDAD_OPTS },
                { key: "ocupacion", label: "OCUPACIÓN", type: "text" },
                { key: "lugarResidencia", label: "LUGAR DE RESIDENCIA", type: "text" },
              ].map(({ key, label, type, opts }) => (
                <div key={key}>
                  {type === "select" ? (
                    <SelectField
                      label={label}
                      value={f[key] ?? ""}
                      onChange={(v) =>
                        setFamiliares((prev) =>
                          prev.map((x, j) => (j === i ? { ...x, [key]: v } : x))
                        )
                      }
                      options={opts!}
                    />
                  ) : (
                    <Field label={label}>
                      <Input
                        type={type}
                        value={f[key] ?? ""}
                        onChange={(e) =>
                          setFamiliares((prev) =>
                            prev.map((x, j) => (j === i ? { ...x, [key]: e.target.value } : x))
                          )
                        }
                      />
                    </Field>
                  )}
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Switch
                  checked={!!f.habitaDomicilio}
                  onCheckedChange={(v) =>
                    setFamiliares((prev) =>
                      prev.map((x, j) => (j === i ? { ...x, habitaDomicilio: v } : x))
                    )
                  }
                />
                <Label className="text-sm">HABITA EN DOMICILIO</Label>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFamiliares((prev) => [...prev, {}])}
          >
            + Agregar familiar
          </Button>

          <div className="mt-4 pt-3 border-t border-gray-200">
            <Label className="text-xs font-semibold text-gray-700 uppercase">
              OTRAS PERSONAS QUE HABITAN EN EL DOMICILIO
            </Label>
            {otrasPersonas.map((p, i) => (
              <div key={i} className="border rounded p-2 space-y-2 bg-gray-50 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium">Persona {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => setOtrasPersonas((prev) => prev.filter((_, j) => j !== i))}
                    className="text-red-500 text-sm"
                  >
                    ✕
                  </button>
                </div>
                {[
                  { key: "parentesco", label: "PARENTESCO", type: "select", opts: PARENTESCO_OPTS },
                  { key: "nombre", label: "NOMBRE", type: "text" },
                  { key: "edad", label: "EDAD", type: "number" },
                  { key: "escolaridad", label: "ESCOLARIDAD", type: "select", opts: ESCOLARIDAD_OPTS },
                  { key: "ocupacion", label: "OCUPACIÓN", type: "text" },
                  { key: "lugarResidencia", label: "LUGAR DE RESIDENCIA", type: "text" },
                ].map(({ key, label, type, opts }) => (
                  <div key={key}>
                    {type === "select" ? (
                      <SelectField
                        label={label}
                        value={p[key] ?? ""}
                        onChange={(v) =>
                          setOtrasPersonas((prev) =>
                            prev.map((x, j) => (j === i ? { ...x, [key]: v } : x))
                          )
                        }
                        options={opts!}
                      />
                    ) : (
                      <Field label={label}>
                        <Input
                          type={type}
                          value={p[key] ?? ""}
                          onChange={(e) =>
                            setOtrasPersonas((prev) =>
                              prev.map((x, j) =>
                                j === i ? { ...x, [key]: e.target.value } : x
                              )
                            )
                          }
                        />
                      </Field>
                    )}
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!!p.habitaDomicilio}
                    onCheckedChange={(v) =>
                      setOtrasPersonas((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, habitaDomicilio: v } : x))
                      )
                    }
                  />
                  <Label className="text-sm">HABITA EN DOMICILIO</Label>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setOtrasPersonas((prev) => [...prev, {}])}
            >
              + Agregar persona
            </Button>
          </div>
        </SectionAccordion>

        {/* ─────────────────────────────────────────── */}
        {/* SECCIÓN 5 — DINÁMICA FAMILIAR */}
        {/* ─────────────────────────────────────────── */}
        <SectionAccordion
          index={5}
          title="Dinámica Familiar"
          active={activeSection === 5}
          onToggle={() => setActiveSection(activeSection === 5 ? 0 : 5)}
        >
          <SelectField
            label='VIVEN SOLOS CON TU FAMILIA...'
            value={val("dinamicaFamiliar.vivenSolos")}
            onChange={(v) => update("dinamicaFamiliar.vivenSolos", v)}
            options={["Sí", "No"]}
          />
          <SelectField
            label="ESPOSA EMBARAZADA?:"
            value={val("dinamicaFamiliar.esposaEmbarazada")}
            onChange={(v) => update("dinamicaFamiliar.esposaEmbarazada", v)}
            options={["Sí", "No", "No Aplica"]}
          />
          <Field label="QUIEN CUIDA A TUS HIJOS?">
            <Input
              value={val("dinamicaFamiliar.quienCuidaHijos")}
              onChange={(e) => update("dinamicaFamiliar.quienCuidaHijos", e.target.value)}
            />
          </Field>
          <Field label="DONDE VIVE QUIEN CUIDA...">
            <Input
              value={val("dinamicaFamiliar.dondeViveCuidador")}
              onChange={(e) => update("dinamicaFamiliar.dondeViveCuidador", e.target.value)}
            />
          </Field>
          <Field label="EDAD DE TUS HIJOS:">
            <Input
              value={val("dinamicaFamiliar.edadHijos")}
              onChange={(e) => update("dinamicaFamiliar.edadHijos", e.target.value)}
            />
          </Field>
          <SelectField
            label="ESTÁ DE ACUERDO TU PAREJA..."
            value={val("dinamicaFamiliar.acuerdoPareja")}
            onChange={(v) => update("dinamicaFamiliar.acuerdoPareja", v)}
            options={["Sí", "No", "No Aplica"]}
          />
          <SwitchField
            label="TIENE DEUDAS:"
            value={!!val("dinamicaFamiliar.tieneDeudas")}
            onChange={(v) => update("dinamicaFamiliar.tieneDeudas", v)}
          >
            <Field label="INSTITUCIÓN:">
              <Input
                value={val("dinamicaFamiliar.institucionDeuda")}
                onChange={(e) =>
                  update("dinamicaFamiliar.institucionDeuda", e.target.value)
                }
              />
            </Field>
          </SwitchField>
          <SwitchField
            label="PENSIÓN ALIMENTICIA?"
            value={!!val("dinamicaFamiliar.pensionAlimenticia")}
            onChange={(v) => update("dinamicaFamiliar.pensionAlimenticia", v)}
          />
          <SwitchField
            label="HAZ TRABAJADO EN ESTADOS UNIDOS?"
            value={!!val("dinamicaFamiliar.trabajoEUA")}
            onChange={(v) => update("dinamicaFamiliar.trabajoEUA", v)}
          />
        </SectionAccordion>

        {/* ─────────────────────────────────────────── */}
        {/* SECCIÓN 6 — REFERENCIAS ECONÓMICAS */}
        {/* ─────────────────────────────────────────── */}
        <SectionAccordion
          index={6}
          title="Referencias Económicas"
          active={activeSection === 6}
          onToggle={() => setActiveSection(activeSection === 6 ? 0 : 6)}
        >
          {/* Ingreso familiar */}
          <Label className="text-xs font-semibold text-gray-700 uppercase block mb-2">
            INGRESO FAMILIAR MENSUAL
          </Label>
          {ingresos.map((ing, i) => (
            <div key={i} className="border rounded p-2 space-y-2 bg-gray-50 mb-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium">Ingreso {i + 1}</span>
                <button
                  type="button"
                  onClick={() => setIngresos((prev) => prev.filter((_, j) => j !== i))}
                  className="text-red-500 text-sm"
                >
                  ✕
                </button>
              </div>
              <Field label="NOMBRE">
                <Input
                  value={ing.nombre ?? ""}
                  onChange={(e) =>
                    setIngresos((prev) =>
                      prev.map((x, j) => (j === i ? { ...x, nombre: e.target.value } : x))
                    )
                  }
                />
              </Field>
              <SelectField
                label="PARENTESCO"
                value={ing.parentesco ?? ""}
                onChange={(v) =>
                  setIngresos((prev) =>
                    prev.map((x, j) => (j === i ? { ...x, parentesco: v } : x))
                  )
                }
                options={PARENTESCO_OPTS}
              />
              <Field label="INGRESO (SUELDO) $">
                <Input
                  type="number"
                  value={ing.sueldo ?? ""}
                  onChange={(e) =>
                    setIngresos((prev) =>
                      prev.map((x, j) => (j === i ? { ...x, sueldo: e.target.value } : x))
                    )
                  }
                />
              </Field>
              <Field label="OTROS INGRESOS $">
                <Input
                  value={ing.otrosIngresos ?? ""}
                  onChange={(e) =>
                    setIngresos((prev) =>
                      prev.map((x, j) =>
                        j === i ? { ...x, otrosIngresos: e.target.value } : x
                      )
                    )
                  }
                />
              </Field>
              <p className="text-xs text-gray-500">
                APORTACIÓN TOTAL MENSUAL: ${Number(ing.sueldo || 0).toLocaleString()}
              </p>
            </div>
          ))}
          <div className="flex items-center justify-between mb-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIngresos((prev) => [...prev, {}])}
            >
              + Agregar ingreso
            </Button>
            <span className="text-sm font-semibold">
              TOTAL INGRESOS: $
              {ingresos
                .reduce((sum, x) => sum + Number(x.sueldo || 0), 0)
                .toLocaleString()}
            </span>
          </div>

          {/* Egreso familiar */}
          <div className="border-t pt-3 mt-2">
            <Label className="text-xs font-semibold text-gray-700 uppercase block mb-2">
              EGRESO FAMILIAR MENSUAL
            </Label>
            <div className="space-y-2">
              {/* Servicios desglosados */}
              <p className="text-xs font-semibold text-gray-600">SERVICIOS:</p>
              {[
                ["AGUA", "egresos.servicios.agua"],
                ["LUZ", "egresos.servicios.luz"],
                ["TELÉFONO", "egresos.servicios.telefono"],
                ["GAS", "egresos.servicios.gas"],
                ["TV DE PAGA", "egresos.servicios.tvPaga"],
                ["INTERNET", "egresos.servicios.internet"],
              ].map(([label, path]) => (
                <div key={path} className="flex items-center gap-2 ml-3">
                  <Label className="text-xs w-32 shrink-0">{label}</Label>
                  <Input
                    type="number"
                    className="h-7 text-sm"
                    value={val(path)}
                    onChange={(e) => update(path, e.target.value)}
                  />
                </div>
              ))}

              {[
                ["ALIMENTACIÓN Y DESPENSA", "egresos.alimentacion"],
                ["VESTIDO Y CALZADO", "egresos.vestido"],
                ["COLEGIATURAS", "egresos.colegiaturas"],
                ["TARJETAS DE CRÉDITO U OTROS CRÉDITOS", "egresos.tarjetas"],
                ["TRANSPORTACIÓN (PASAJES O GASOLINA)", "egresos.transporte"],
                ["RENTA, HIPOTECA, INFONAVIT", "egresos.renta"],
                ["GASTOS MÉDICOS", "egresos.gastosMedicos"],
                ["RECREACIONES", "egresos.recreaciones"],
                ["OTROS GASTOS", "egresos.otrosGastos"],
              ].map(([label, path]) => (
                <Field key={path} label={label}>
                  <Input
                    type="number"
                    value={val(path)}
                    onChange={(e) => update(path, e.target.value)}
                  />
                </Field>
              ))}

              {(() => {
                const e = formData.egresos ?? {};
                const s = e.servicios ?? {};
                const totalServicios =
                  Number(s.agua || 0) +
                  Number(s.luz || 0) +
                  Number(s.telefono || 0) +
                  Number(s.gas || 0) +
                  Number(s.tvPaga || 0) +
                  Number(s.internet || 0);
                const totalEgresos =
                  totalServicios +
                  Number(e.alimentacion || 0) +
                  Number(e.vestido || 0) +
                  Number(e.colegiaturas || 0) +
                  Number(e.tarjetas || 0) +
                  Number(e.transporte || 0) +
                  Number(e.renta || 0) +
                  Number(e.gastosMedicos || 0) +
                  Number(e.recreaciones || 0) +
                  Number(e.otrosGastos || 0);
                const totalIngresos = ingresos.reduce(
                  (sum, x) => sum + Number(x.sueldo || 0),
                  0
                );
                const diferencia = totalIngresos - totalEgresos;
                return (
                  <div className="space-y-1 border-t pt-2 mt-2">
                    <p className="text-sm font-semibold">
                      TOTAL EGRESOS: ${totalEgresos.toLocaleString()}
                    </p>
                    <p
                      className={`text-sm font-bold ${
                        diferencia < 0 ? "text-red-600" : "text-green-700"
                      }`}
                    >
                      DIFERENCIA TOTAL: ${diferencia.toLocaleString()}
                      {diferencia < 0 && " ⚠️ Déficit"}
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        </SectionAccordion>

        {/* ─────────────────────────────────────────── */}
        {/* SECCIÓN 7 — ESTADO DE SALUD Y HÁBITOS */}
        {/* ─────────────────────────────────────────── */}
        <SectionAccordion
          index={7}
          title="Estado de Salud y Hábitos"
          active={activeSection === 7}
          onToggle={() => setActiveSection(activeSection === 7 ? 0 : 7)}
        >
          <SelectField
            label="SERVICIO MÉDICO:"
            value={val("salud.servicioMedico")}
            onChange={(v) => update("salud.servicioMedico", v)}
            options={["IMSS", "ISSSTE", "INSABI", "PARTICULAR", "OTRO"]}
          />
          <Field label="ULTIMA CITA CON EL MÉDICO (FECHA)">
            <Input
              type="date"
              value={val("salud.ultimaCita")}
              onChange={(e) => update("salud.ultimaCita", e.target.value)}
            />
          </Field>
          <Field label="CAUSA:">
            <Input
              value={val("salud.causaCita")}
              onChange={(e) => update("salud.causaCita", e.target.value)}
            />
          </Field>
          <SwitchField
            label="ENFERMEDADES CRÓNICAS O ACTUALES:"
            value={!!val("salud.enfermedadesCronicas")}
            onChange={(v) => update("salud.enfermedadesCronicas", v)}
          >
            <Field label="CUÁL?:">
              <Input
                value={val("salud.cualesEnfermedades")}
                onChange={(e) => update("salud.cualesEnfermedades", e.target.value)}
              />
            </Field>
          </SwitchField>
          <SwitchField
            label="INTERVENCIÓN QUIRÚRGICA?"
            value={!!val("salud.intervencionQuirurgica")}
            onChange={(v) => update("salud.intervencionQuirurgica", v)}
          >
            <Field label="CUÁL?:">
              <Input
                value={val("salud.cualesIntervencion")}
                onChange={(e) => update("salud.cualesIntervencion", e.target.value)}
              />
            </Field>
          </SwitchField>
          <SwitchField
            label="ALERGIAS?"
            value={!!val("salud.alergias")}
            onChange={(v) => update("salud.alergias", v)}
          >
            <Field label="CUÁL?:">
              <Input
                value={val("salud.cualesAlergias")}
                onChange={(e) => update("salud.cualesAlergias", e.target.value)}
              />
            </Field>
          </SwitchField>
          <SwitchField
            label="ENFERMEDADES CRÓNICAS O HEREDITARIAS EN TU FAMILIA..."
            value={!!val("salud.enfermedadesHereditarias")}
            onChange={(v) => update("salud.enfermedadesHereditarias", v)}
          >
            <Field label="CUÁLES?:">
              <Input
                value={val("salud.cualesHereditarias")}
                onChange={(e) => update("salud.cualesHereditarias", e.target.value)}
              />
            </Field>
            <Field label="QUIEN LOS PADECE?">
              <Input
                value={val("salud.quienPadece")}
                onChange={(e) => update("salud.quienPadece", e.target.value)}
              />
            </Field>
          </SwitchField>
          <SwitchField
            label="CONSUME ALGÚN MEDICAMENTO?"
            value={!!val("salud.consumeMedicamento")}
            onChange={(v) => update("salud.consumeMedicamento", v)}
          >
            <Field label="CUÁL?:">
              <Input
                value={val("salud.cualesMedicamentos")}
                onChange={(e) => update("salud.cualesMedicamentos", e.target.value)}
              />
            </Field>
          </SwitchField>
          <SwitchField
            label="CONSUME ALGUNA DROGA?"
            value={!!val("salud.consumeDroga")}
            onChange={(v) => update("salud.consumeDroga", v)}
          >
            <Field label="CUÁL?:">
              <Input
                value={val("salud.cualesDrogas")}
                onChange={(e) => update("salud.cualesDrogas", e.target.value)}
              />
            </Field>
          </SwitchField>
          <SelectField
            label="¿CÓMO CONSIDERA SU ESTADO DE SALUD?"
            value={val("salud.estadoSalud")}
            onChange={(v) => update("salud.estadoSalud", v)}
            options={["EXCELENTE", "BUENO", "REGULAR", "MALO"]}
          />
          <SwitchField
            label="HA SUFRIDO ACCIDENTES?"
            value={!!val("salud.accidentes")}
            onChange={(v) => update("salud.accidentes", v)}
          />
          <Field label="CUIDADOS MÉDICOS ESPECIALES:">
            <Textarea
              value={val("salud.cuidadosMedicos")}
              onChange={(e) => update("salud.cuidadosMedicos", e.target.value)}
              rows={2}
            />
          </Field>
          <SwitchField
            label="FUMA?"
            value={!!val("salud.fuma")}
            onChange={(v) => update("salud.fuma", v)}
          >
            <Field label="CUÁNTOS CIGARROS FUMA DIARIO?">
              <Input
                type="number"
                value={val("salud.cigarrosDia")}
                onChange={(e) => update("salud.cigarrosDia", e.target.value)}
              />
            </Field>
          </SwitchField>
          <SwitchField
            label="TOMA?"
            value={!!val("salud.toma")}
            onChange={(v) => update("salud.toma", v)}
          >
            <Field label="CADA CUÁNDO?">
              <Input
                value={val("salud.cadaCuandoToma")}
                onChange={(e) => update("salud.cadaCuandoToma", e.target.value)}
              />
            </Field>
            <Field label="QUÉ TIPO DE BEBIDA?">
              <Input
                value={val("salud.tipoBebida")}
                onChange={(e) => update("salud.tipoBebida", e.target.value)}
              />
            </Field>
          </SwitchField>
        </SectionAccordion>

        {/* ─────────────────────────────────────────── */}
        {/* SECCIÓN 8 — INFORMACIÓN SOCIAL Y PASATIEMPOS */}
        {/* ─────────────────────────────────────────── */}
        <SectionAccordion
          index={8}
          title="Información Social y Pasatiempos"
          active={activeSection === 8}
          onToggle={() => setActiveSection(activeSection === 8 ? 0 : 8)}
        >
          <Field label="QUÉ PASATIEMPOS TIENE?">
            <Input
              value={val("social.pasatiempos")}
              onChange={(e) => update("social.pasatiempos", e.target.value)}
            />
          </Field>
          {[
            {
              swKey: "practica Deporte",
              swPath: "social.practicaDeporte",
              label: "¿PRACTICA ALGÚN DEPORTE?",
              sub: [
                { label: "¿CUÁL?", path: "social.deporteCual" },
                { label: "¿CON QUÉ FRECUENCIA?", path: "social.deporteFrecuencia" },
              ],
            },
            {
              swKey: "actividadFamiliar",
              swPath: "social.actividadFamiliar",
              label: "REALIZA ALGUNA ACTIVIDAD FAMILIAR?",
              sub: [
                { label: "¿CUÁL?", path: "social.actividadFamiliarCual" },
                { label: "¿CON QUÉ FRECUENCIA?", path: "social.actividadFamiliarFrecuencia" },
              ],
            },
            {
              swKey: "bars",
              swPath: "social.asisteBares",
              label: "ASISTE A DISCOS, BARES, RESTAURANTES?",
              sub: [
                { label: "¿CUÁL?", path: "social.baresCual" },
                { label: "¿CON QUÉ FRECUENCIA?", path: "social.baresFrecuencia" },
              ],
            },
            {
              swKey: "religioso",
              swPath: "social.asisteReligioso",
              label: "¿ASISTE A EVENTOS RELIGIOSOS O POLÍTICOS?",
              sub: [
                { label: "¿CUÁL?", path: "social.religiosoCual" },
                { label: "¿CON QUÉ FRECUENCIA?", path: "social.religiosoFrecuencia" },
              ],
            },
            {
              swKey: "partido",
              swPath: "social.afiliadoPartido",
              label: "¿ESTÁ AFILIADO A ALGÚN PARTIDO POLÍTICO?",
              sub: [{ label: "¿CUÁL?", path: "social.partidoCual" }],
            },
            {
              swKey: "grupo",
              swPath: "social.afiliadoGrupo",
              label: "¿ESTÁ AFILIADO A ALGÚN GRUPO DEPORTIVO, SOCIAL O RELIGIOSO?",
              sub: [{ label: "¿CUÁL?", path: "social.grupoCual" }],
            },
          ].map(({ swPath, label, sub }) => (
            <SwitchField
              key={swPath}
              label={label}
              value={!!val(swPath)}
              onChange={(v) => update(swPath, v)}
            >
              {sub.map(({ label: sl, path }) => (
                <Field key={path} label={sl}>
                  <Input
                    value={val(path)}
                    onChange={(e) => update(path, e.target.value)}
                  />
                </Field>
              ))}
            </SwitchField>
          ))}
          <SwitchField
            label="¿TIENE TATUAJES O PIERCINGS?"
            value={!!val("social.tatuajes")}
            onChange={(v) => update("social.tatuajes", v)}
          />
        </SectionAccordion>

        {/* ─────────────────────────────────────────── */}
        {/* SECCIÓN 9 — ÁREA JURÍDICA */}
        {/* ─────────────────────────────────────────── */}
        <SectionAccordion
          index={9}
          title="Área Jurídica"
          active={activeSection === 9}
          onToggle={() => setActiveSection(activeSection === 9 ? 0 : 9)}
        >
          {[
            {
              path: "juridica.procesoLegal",
              label: "USTED O ALGÚN FAMILIAR HA ESTADO INVOLUCRADO EN ALGÚN PROCESO LEGAL",
            },
            {
              path: "juridica.privadoLibertad",
              label: "UD. O ALGÚN FAMILIAR HA SIDO PRIVADO DE SU LIBERTAD",
            },
            {
              path: "juridica.problemasLaborales",
              label: "UD. O ALGÚN FAMILIAR HA ESTADO INVOLUCRADO EN PROBLEMAS LABORALES",
            },
            {
              path: "juridica.partidoPolitico",
              label: "UD. O ALGÚN FAMILIAR HA PERTENECIDO O PERTENECE A ALGÚN PARTIDO POLÍTICO",
            },
            {
              path: "juridica.sindicato",
              label: "UD. O ALGÚN FAMILIAR HA PERTENECIDO O PERTENECE A ALGÚN SINDICATO",
            },
            {
              path: "juridica.puestoPolitico",
              label: "UD O ALGÚN FAMILIAR HA DESEMPEÑADO PUESTOS POLÍTICOS O SINDICALES",
            },
          ].map(({ path, label }) => (
            <SwitchField
              key={path}
              label={label}
              value={!!val(path)}
              onChange={(v) => update(path, v)}
            >
              <Field label="¿POR QUÉ?:">
                <Input
                  value={val(`${path}PorQue`)}
                  onChange={(e) => update(`${path}PorQue`, e.target.value)}
                />
              </Field>
              <Field label="¿QUIÉN?">
                <Input
                  value={val(`${path}Quien`)}
                  onChange={(e) => update(`${path}Quien`, e.target.value)}
                />
              </Field>
            </SwitchField>
          ))}
        </SectionAccordion>

        {/* ─────────────────────────────────────────── */}
        {/* SECCIÓN 10 — ESTRUCTURA Y DINÁMICA DE LA VIVIENDA */}
        {/* ─────────────────────────────────────────── */}
        <SectionAccordion
          index={10}
          title="Estructura y Dinámica de la Vivienda"
          active={activeSection === 10}
          onToggle={() => setActiveSection(activeSection === 10 ? 0 : 10)}
        >
          <SwitchField
            label="¿PERSONAS EN CASA CON DISCAPACIDAD?"
            value={!!val("vivienda.personasDiscapacidad")}
            onChange={(v) => update("vivienda.personasDiscapacidad", v)}
          >
            <Field label="¿QUIÉN?">
              <Input
                value={val("vivienda.discapacidadQuien")}
                onChange={(e) => update("vivienda.discapacidadQuien", e.target.value)}
              />
            </Field>
            <Field label="¿DE QUÉ TIPO?">
              <Input
                value={val("vivienda.discapacidadTipo")}
                onChange={(e) => update("vivienda.discapacidadTipo", e.target.value)}
              />
            </Field>
          </SwitchField>
          <Field label="NÚMERO DE DEPENDIENTES ECONÓMICOS">
            <Input
              type="number"
              value={val("vivienda.numDependientes")}
              onChange={(e) => update("vivienda.numDependientes", e.target.value)}
            />
          </Field>
          <Field label="(CUANTOS Y QUIENES)">
            <Input
              value={val("vivienda.detalleDependientes")}
              onChange={(e) => update("vivienda.detalleDependientes", e.target.value)}
            />
          </Field>
          <SwitchField
            label="¿EXISTIERON MATRIMONIOS O UNIONES LIBRES ANTERIORES?"
            value={!!val("vivienda.matrimoniosAnteriores")}
            onChange={(v) => update("vivienda.matrimoniosAnteriores", v)}
          />
          <SwitchField
            label="¿TUVO HIJOS EN DICHOS MATRIMONIOS?"
            value={!!val("vivienda.hijosMatrimoniosAnteriores")}
            onChange={(v) => update("vivienda.hijosMatrimoniosAnteriores", v)}
          >
            <Field label="¿CUÁNTOS?">
              <Input
                type="number"
                value={val("vivienda.cuantosHijosAnteriores")}
                onChange={(e) =>
                  update("vivienda.cuantosHijosAnteriores", e.target.value)
                }
              />
            </Field>
          </SwitchField>
          <SwitchField
            label="¿PROPORCIONA PENSIÓN ALIMENTICIA?"
            value={!!val("vivienda.proporcionaPension")}
            onChange={(v) => update("vivienda.proporcionaPension", v)}
          >
            <Field label="CANTIDAD MENSUAL">
              <Input
                type="number"
                value={val("vivienda.cantidadPension")}
                onChange={(e) => update("vivienda.cantidadPension", e.target.value)}
              />
            </Field>
          </SwitchField>
          <Field label="¿QUIÉN CUIDA A SUS HIJOS? (NOMBRE Y PARENTESCO)">
            <Input
              value={val("vivienda.quienCuida")}
              onChange={(e) => update("vivienda.quienCuida", e.target.value)}
            />
          </Field>
          <Field label="DONDE VIVE?">
            <Input
              value={val("vivienda.dondeViveCuida")}
              onChange={(e) => update("vivienda.dondeViveCuida", e.target.value)}
            />
          </Field>
          <SwitchField
            label="¿ESTA DE ACUERDO SU PAREJA QUE TRABAJE?"
            value={!!val("vivienda.acuerdoParejaVivienda")}
            onChange={(v) => update("vivienda.acuerdoParejaVivienda", v)}
          />
          <Field label="DIRIGIDO PARA LAS ESPOSAS (OS) / PADRES: ¿COMPRENDE LAS ACTIVIDADES QUE REALIZARÁ SU PAREJA/HIJO (A)?">
            <Textarea
              value={val("vivienda.comprendeActividades")}
              onChange={(e) => update("vivienda.comprendeActividades", e.target.value)}
              rows={2}
            />
          </Field>
          <SwitchField
            label="¿SU ESPOSA ESTÁ EMBARAZADA?"
            value={!!val("vivienda.esposaEmbarazada")}
            onChange={(v) => update("vivienda.esposaEmbarazada", v)}
          />
          <div className="border-t pt-3 mt-2">
            <p className="text-xs font-semibold text-gray-600 mb-2">
              SOLO APLICA PARA CHOFERES, VENDEDORES O SUS AUXILIARES:
            </p>
            <SwitchField
              label="¿SABE QUE DE ACUERDO A LA OPERACIÓN SE LE PUEDE REQUERIR PARA RUTAS FORÁNEAS DE LUNES A SÁBADO?"
              value={!!val("vivienda.sabe Foraneas")}
              onChange={(v) => update("vivienda.sabeForaneas", v)}
            />
            <SwitchField
              label="¿TENDRÍAN ALGÚN INCONVENIENTE COMO FAMILIA POR LA AUSENCIA DE SU ESPOSO(A) / HIJO(A) TODA LA SEMANA?"
              value={!!val("vivienda.inconvenienteAusencia")}
              onChange={(v) => update("vivienda.inconvenienteAusencia", v)}
            />
          </div>
        </SectionAccordion>

        {/* ─────────────────────────────────────────── */}
        {/* SECCIÓN 11 — FOTOGRAFÍAS DEL ENTORNO */}
        {/* ─────────────────────────────────────────── */}
        <SectionAccordion
          index={11}
          title="Fotografías del Entorno"
          active={activeSection === 11}
          onToggle={() => setActiveSection(activeSection === 11 ? 0 : 11)}
        >
          <p className="text-xs text-gray-500 mb-2">
            Tomar las fotos directamente en el domicilio (no desde carrete).
          </p>
          {[
            ["COMEDOR", "fotos.comedor"],
            ["COCINA", "fotos.cocina"],
            ["SALA", "fotos.sala"],
            ["FACHADA VISTA DESDE EL PATIO", "fotos.fachadaPatio"],
            ["VISTA FACHADA DESDE LA CALLE", "fotos.fachadaCalle"],
          ].map(([label, path]) => (
            <div key={path} className="py-2 border-b border-gray-100 last:border-0">
              <CameraField
                label={label}
                value={val(path)}
                onChange={(b) => update(path, b)}
                size={100}
              />
            </div>
          ))}
        </SectionAccordion>

        {/* ─────────────────────────────────────────── */}
        {/* SECCIÓN 12 — RESUMEN Y FIRMA */}
        {/* ─────────────────────────────────────────── */}
        <SectionAccordion
          index={12}
          title="Resumen y Firma"
          active={activeSection === 12}
          onToggle={() => setActiveSection(activeSection === 12 ? 0 : 12)}
        >
          <Field label="OBSERVACIONES / RESUMEN...">
            <Textarea
              value={val("cierre.observaciones")}
              onChange={(e) => update("cierre.observaciones", e.target.value)}
              rows={4}
            />
          </Field>
          <div className="border border-gray-200 rounded p-3 bg-gray-50 text-xs text-gray-600 leading-relaxed">
            DE CONFORMIDAD CON EL ARTÍCULO 47 FRACCIÓN 1 DE LA LEY FEDERAL DEL TRABAJO, DECLARO QUE
            LA INFORMACIÓN QUE PROPORCIONÉ EN EL PRESENTE ESTUDIO ES EXACTA Y VERÍDICA; QUEDANDO EN
            ENTENDIDO QUE CUALQUIER DECLARACIÓN FALSA EN CASO DE SER CONTRATADO, SERÁ CAUSA DE
            RESCISIÓN DE MI CONTRATO DE TRABAJO.
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-600 uppercase">FIRMA CANDIDATO</Label>
            <div className="border border-gray-300 rounded overflow-hidden inline-block">
              <canvas
                ref={sigCanvasRef}
                width={300}
                height={150}
                style={{ background: "#fff", display: "block", touchAction: "none" }}
                onMouseDown={startDraw}
                onMouseMove={drawMove}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={drawMove}
                onTouchEnd={endDraw}
              />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={clearSignature}>
              Limpiar firma
            </Button>
          </div>
          <CameraField
            label="📷 Foto del documento firmado (alternativa)"
            value={val("cierre.fotoDocumento")}
            onChange={(b) => update("cierre.fotoDocumento", b)}
            size={80}
          />
        </SectionAccordion>

        {/* ─────────────────────────────────────────── */}
        {/* SECCIÓN 13 — CRÉDITOS, PROPIEDADES Y PATRIMONIO */}
        {/* ─────────────────────────────────────────── */}
        <SectionAccordion
          index={13}
          title="Créditos, Propiedades y Patrimonio"
          active={activeSection === 13}
          onToggle={() => setActiveSection(activeSection === 13 ? 0 : 13)}
        >
          <Label className="text-xs font-semibold uppercase block mb-2">
            CRÉDITOS INSTITUCIONALES Y / O DEPARTAMENTALES:
          </Label>
          {creditos.map((c, i) => (
            <div key={i} className="border rounded p-2 space-y-2 bg-gray-50 mb-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium">
                  {c.fijo ? (
                    <span className="text-blue-600">
                      {c.institucion} <span className="text-gray-400">(fijo)</span>
                    </span>
                  ) : (
                    `Crédito ${i + 1}`
                  )}
                </span>
                {!c.fijo && (
                  <button
                    type="button"
                    onClick={() => setCreditos((prev) => prev.filter((_, j) => j !== i))}
                    className="text-red-500 text-sm"
                  >
                    ✕
                  </button>
                )}
              </div>
              {!c.fijo && (
                <Field label="INSTITUCIÓN Y/O TIENDA">
                  <Input
                    value={c.institucion ?? ""}
                    onChange={(e) =>
                      setCreditos((prev) =>
                        prev.map((x, j) =>
                          j === i ? { ...x, institucion: e.target.value } : x
                        )
                      )
                    }
                  />
                </Field>
              )}
              {[
                { key: "monto", label: "MONTO DEL CRÉDITO" },
                { key: "mensualidad", label: "MENSUALIDAD" },
                { key: "adeudo", label: "ADEUDO" },
              ].map(({ key, label }) => (
                <Field key={key} label={label}>
                  <Input
                    type="number"
                    value={(c as any)[key] ?? ""}
                    onChange={(e) =>
                      setCreditos((prev) =>
                        prev.map((x, j) =>
                          j === i ? { ...x, [key]: e.target.value } : x
                        )
                      )
                    }
                  />
                </Field>
              ))}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCreditos((prev) => [...prev, {}])}
          >
            + Agregar crédito
          </Button>

          {/* Bienes raíces */}
          <div className="border-t pt-3 mt-3">
            <Label className="text-xs font-semibold uppercase block mb-2">
              BIENES RAÍCES (Casas, Terrenos, etc.):
            </Label>
            <p className="text-xs text-gray-500 mb-2">
              Anotar propiedad aun no esté a nombre del candidato.
            </p>
            {bienesRaices.map((b, i) => (
              <div key={i} className="border rounded p-2 space-y-2 bg-gray-50 mb-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium">Propiedad {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => setBienesRaices((prev) => prev.filter((_, j) => j !== i))}
                    className="text-red-500 text-sm"
                  >
                    ✕
                  </button>
                </div>
                {[
                  { key: "tipo", label: "TIPO DE PROPIEDAD" },
                  { key: "ubicacion", label: "UBICACIÓN" },
                  { key: "valor", label: "VALOR APROX. $" },
                  { key: "aNombreDe", label: "A NOMBRE DE:" },
                ].map(({ key, label }) => (
                  <Field key={key} label={label}>
                    <Input
                      type={key === "valor" ? "number" : "text"}
                      value={(b as any)[key] ?? ""}
                      onChange={(e) =>
                        setBienesRaices((prev) =>
                          prev.map((x, j) =>
                            j === i ? { ...x, [key]: e.target.value } : x
                          )
                        )
                      }
                    />
                  </Field>
                ))}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBienesRaices((prev) => [...prev, {}])}
            >
              + Agregar bien raíz
            </Button>
          </div>

          {/* Vehículos */}
          <div className="border-t pt-3 mt-3">
            <Label className="text-xs font-semibold uppercase block mb-2">VEHÍCULOS:</Label>
            <p className="text-xs text-gray-500 mb-2">
              Anotar vehículo aun no esté a nombre del candidato.
            </p>
            {vehiculos.map((v, i) => (
              <div key={i} className="border rounded p-2 space-y-2 bg-gray-50 mb-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium">Vehículo {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => setVehiculos((prev) => prev.filter((_, j) => j !== i))}
                    className="text-red-500 text-sm"
                  >
                    ✕
                  </button>
                </div>
                {[
                  { key: "marcaModelo", label: "MARCA Y MODELO" },
                  { key: "valorComercial", label: "VALOR COMERCIAL $" },
                  { key: "saldo", label: "SALDO $" },
                  { key: "aNombreDe", label: "A NOMBRE DE:" },
                ].map(({ key, label }) => (
                  <Field key={key} label={label}>
                    <Input
                      type={["valorComercial", "saldo"].includes(key) ? "number" : "text"}
                      value={(v as any)[key] ?? ""}
                      onChange={(e) =>
                        setVehiculos((prev) =>
                          prev.map((x, j) =>
                            j === i ? { ...x, [key]: e.target.value } : x
                          )
                        )
                      }
                    />
                  </Field>
                ))}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setVehiculos((prev) => [...prev, {}])}
            >
              + Agregar vehículo
            </Button>
          </div>

          {/* Negocios */}
          <div className="border-t pt-3 mt-3">
            <Label className="text-xs font-semibold uppercase block mb-2">NEGOCIOS:</Label>
            {negocios.map((n, i) => (
              <div key={i} className="border rounded p-2 space-y-2 bg-gray-50 mb-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium">Negocio {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => setNegocios((prev) => prev.filter((_, j) => j !== i))}
                    className="text-red-500 text-sm"
                  >
                    ✕
                  </button>
                </div>
                {[
                  { key: "tipoNombre", label: "TIPO DE NEGOCIO / NOMBRE COMERCIAL" },
                  { key: "ubicacion", label: "UBICACIÓN" },
                  { key: "propietario", label: "PROPIETARIO:" },
                ].map(({ key, label }) => (
                  <Field key={key} label={label}>
                    <Input
                      value={(n as any)[key] ?? ""}
                      onChange={(e) =>
                        setNegocios((prev) =>
                          prev.map((x, j) =>
                            j === i ? { ...x, [key]: e.target.value } : x
                          )
                        )
                      }
                    />
                  </Field>
                ))}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setNegocios((prev) => [...prev, {}])}
            >
              + Agregar negocio
            </Button>
          </div>

          {/* Actividad en desempleo */}
          <div className="border-t pt-3 mt-3">
            <Label className="text-xs font-semibold uppercase block mb-2">
              A QUE TE DEDICAS CUANDO NO TIENES EMPLEO FORMAL:
            </Label>
            <Field label="INGRESO:">
              <Input
                value={val("patrimonio.desempleoIngreso")}
                onChange={(e) => update("patrimonio.desempleoIngreso", e.target.value)}
              />
            </Field>
            <Field label="COMO TE ANUNCIAS:">
              <Input
                value={val("patrimonio.desempleoAnuncio")}
                onChange={(e) => update("patrimonio.desempleoAnuncio", e.target.value)}
              />
            </Field>
          </div>
        </SectionAccordion>

        {/* ─────────────────────────────────────────── */}
        {/* SECCIÓN 14 — DATOS DEL INMUEBLE */}
        {/* ─────────────────────────────────────────── */}
        <SectionAccordion
          index={14}
          title="Datos del Inmueble"
          active={activeSection === 14}
          onToggle={() => setActiveSection(activeSection === 14 ? 0 : 14)}
        >
          <SelectField
            label="LA CASA QUE HABITA ES:"
            value={val("inmueble.tipoCasa")}
            onChange={(v) => update("inmueble.tipoCasa", v)}
            options={["PROPIA", "RENTADA", "PRESTADA"]}
          />
          <Field label="VALOR APROXIMADO">
            <Input
              type="number"
              value={val("inmueble.valorAprox")}
              onChange={(e) => update("inmueble.valorAprox", e.target.value)}
            />
          </Field>
          <Field label="SUPERFICIE">
            <Input
              value={val("inmueble.superficie")}
              onChange={(e) => update("inmueble.superficie", e.target.value)}
            />
          </Field>
          <Field label="FACHADA">
            <Input
              value={val("inmueble.fachada")}
              onChange={(e) => update("inmueble.fachada", e.target.value)}
            />
          </Field>
          <Field label="NÚMERO DE BAÑOS">
            <Input
              type="number"
              value={val("inmueble.numBanos")}
              onChange={(e) => update("inmueble.numBanos", e.target.value)}
            />
          </Field>
          <Field label="PISOS (MATERIAL)">
            <Input
              value={val("inmueble.pisosMaterial")}
              onChange={(e) => update("inmueble.pisosMaterial", e.target.value)}
            />
          </Field>
          <Field label="PAREDES (MATERIAL)">
            <Input
              value={val("inmueble.paredesMaterial")}
              onChange={(e) => update("inmueble.paredesMaterial", e.target.value)}
            />
          </Field>
          <Field label="NIVELES DEL INMUEBLE">
            <div className="flex gap-3">
              {["1", "2", "3"].map((n) => (
                <label key={n} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="niveles"
                    value={n}
                    checked={val("inmueble.niveles") === n}
                    onChange={() => update("inmueble.niveles", n)}
                    className="accent-blue-600"
                  />
                  {n}
                </label>
              ))}
            </div>
          </Field>

          {/* Muebles */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-600 uppercase">MUEBLES QUE POSEE</Label>
            <div className="grid grid-cols-2 gap-1">
              {[
                "SALA", "ESTUFA", "LAVADORA", "REFRIGERADOR", "ELECTRODOMÉSTICOS",
                "AIRE ACONDICIONADO", "TV", "COMEDOR", "COMPUTADORA",
                "CENTRO DE ENTRETENIMIENTO", "CAFETERA", "LIBRERO",
              ].map((m) => {
                const checked = (val("inmueble.muebles") || []).includes(m);
                return (
                  <label key={m} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-blue-600"
                      checked={checked}
                      onChange={() => {
                        const current: string[] = val("inmueble.muebles") || [];
                        update(
                          "inmueble.muebles",
                          checked ? current.filter((x) => x !== m) : [...current, m]
                        );
                      }}
                    />
                    {m}
                  </label>
                );
              })}
            </div>
          </div>

          <Field label="ESTADO DE LOS MUEBLES">
            <div className="flex gap-3">
              {["BUENO", "REGULAR", "MALO"].map((n) => (
                <label key={n} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="estadoMuebles"
                    value={n}
                    checked={val("inmueble.estadoMuebles") === n}
                    onChange={() => update("inmueble.estadoMuebles", n)}
                    className="accent-blue-600"
                  />
                  {n}
                </label>
              ))}
            </div>
          </Field>

          {/* Servicios públicos */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-600 uppercase">
              ¿SERVICIOS PÚBLICOS?
            </Label>
            <div className="flex flex-wrap gap-2">
              {["AGUA", "DRENAJE", "ELECTRICIDAD", "GAS", "TELÉFONO"].map((s) => {
                const checked = (val("inmueble.servicios") || []).includes(s);
                return (
                  <label key={s} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-blue-600"
                      checked={checked}
                      onChange={() => {
                        const current: string[] = val("inmueble.servicios") || [];
                        update(
                          "inmueble.servicios",
                          checked ? current.filter((x) => x !== s) : [...current, s]
                        );
                      }}
                    />
                    {s}
                  </label>
                );
              })}
            </div>
          </div>

          {[
            {
              label: "ESTADO DE LA VIVIENDA:",
              path: "inmueble.estadoVivienda",
              opts: ["BUENO", "REGULAR", "MALO"],
            },
            {
              label: "ORDEN Y LIMPIEZA:",
              path: "inmueble.ordenLimpieza",
              opts: ["BUENO", "REGULAR", "MALO"],
            },
            {
              label: "ZONA EN LA QUE ESTÁ UBICADA:",
              path: "inmueble.zona",
              opts: ["INDUSTRIAL", "RESIDENCIAL", "MEDIA", "POPULAR", "RURAL"],
            },
          ].map(({ label, path, opts }) => (
            <Field key={path} label={label}>
              <div className="flex flex-wrap gap-2">
                {opts.map((o) => (
                  <label key={o} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name={path}
                      value={o}
                      checked={val(path) === o}
                      onChange={() => update(path, o)}
                      className="accent-blue-600"
                    />
                    {o}
                  </label>
                ))}
              </div>
            </Field>
          ))}

          <Field label="PREDIAL">
            <Input
              value={val("inmueble.predial")}
              onChange={(e) => update("inmueble.predial", e.target.value)}
            />
          </Field>
          <Field label="NÚMERO DE RECÁMARAS">
            <Input
              type="number"
              value={val("inmueble.numRecamaras")}
              onChange={(e) => update("inmueble.numRecamaras", e.target.value)}
            />
          </Field>

          {/* Habitaciones - switches */}
          {[
            ["¿CUENTA CON SALA?", "inmueble.tieneSala"],
            ["¿CUENTA CON JARDÍN?", "inmueble.tieneJardin"],
            ["¿CUENTA CON COMEDOR?", "inmueble.tieneComedor"],
            ["¿CUENTA CON COCHERA?", "inmueble.tieneCochera"],
            ["¿CUENTA CON COCINA?", "inmueble.tieneCocina"],
            ["¿CUENTA CON PATIO?", "inmueble.tienePatio"],
          ].map(([label, path]) => (
            <SwitchField
              key={path}
              label={label}
              value={!!val(path)}
              onChange={(v) => update(path, v)}
            />
          ))}

          <Field label="MEDIO DE TRANSPORTE DISPONIBLE DE TU DOMICILIO AL LUGAR DE TRABAJO EN SIGMA?">
            <Input
              value={val("inmueble.medioTransporte")}
              onChange={(e) => update("inmueble.medioTransporte", e.target.value)}
            />
          </Field>
          <Field label="TIEMPO DE TRASLADO?">
            <Input
              value={val("inmueble.tiempoTraslado")}
              onChange={(e) => update("inmueble.tiempoTraslado", e.target.value)}
            />
          </Field>
          <Field label="PRECIO, PASAJE?">
            <Input
              type="number"
              value={val("inmueble.precioPasaje")}
              onChange={(e) => update("inmueble.precioPasaje", e.target.value)}
            />
          </Field>
          <Field label="TIEMPO DE RESIDIR EN EL DOMICILIO ACTUAL:">
            <Input
              value={val("inmueble.tiempoResidenciaActual")}
              onChange={(e) => update("inmueble.tiempoResidenciaActual", e.target.value)}
            />
          </Field>
          <Field label="TIEMPO DE RESIDIR EN DOMICILIO ANTERIOR:">
            <Input
              value={val("inmueble.tiempoResidenciaAnterior")}
              onChange={(e) => update("inmueble.tiempoResidenciaAnterior", e.target.value)}
            />
          </Field>
        </SectionAccordion>

        {/* ─────────────────────────────────────────── */}
        {/* SECCIÓN 15 — REFERENCIAS VECINALES */}
        {/* ─────────────────────────────────────────── */}
        <SectionAccordion
          index={15}
          title="Referencias Vecinales"
          active={activeSection === 15}
          onToggle={() => setActiveSection(activeSection === 15 ? 0 : 15)}
        >
          {refVecinales.map((rv, i) => (
            <div key={i} className="border rounded p-2 space-y-2 bg-gray-50 mb-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium">Vecino {i + 1}</span>
                <button
                  type="button"
                  onClick={() => setRefVecinales((prev) => prev.filter((_, j) => j !== i))}
                  className="text-red-500 text-sm"
                >
                  ✕
                </button>
              </div>
              {[
                { key: "nombre", label: "NOMBRE", type: "text" },
                { key: "ocupacion", label: "OCUPACIÓN", type: "text" },
                { key: "telefono", label: "TELÉFONO", type: "tel" },
                { key: "domicilio", label: "DOMICILIO", type: "text" },
                { key: "tiempoConocerlo", label: "TIEMPO DE CONOCERLO", type: "text" },
                { key: "sabeHijos", label: "¿SABE CUÁNTOS HIJOS TIENE?", type: "text" },
                {
                  key: "sabeCuidaHijos",
                  label: "¿SABE QUIEN CUIDA A SUS HIJOS CUANDO TRABAJA?",
                  type: "text",
                },
                {
                  key: "empleosAnteriores",
                  label: "LE CONOCE EMPLEOS ANTERIORES (¿CUÁLES?)",
                  type: "textarea",
                },
                {
                  key: "comentarios",
                  label: "COMENTARIOS SOBRE EL CANDIDATO, ¿CÓMO LO CONSIDERA?",
                  type: "textarea",
                },
              ].map(({ key, label, type }) => (
                <Field key={key} label={label}>
                  {type === "textarea" ? (
                    <Textarea
                      value={(rv as any)[key] ?? ""}
                      rows={2}
                      onChange={(e) =>
                        setRefVecinales((prev) =>
                          prev.map((x, j) =>
                            j === i ? { ...x, [key]: e.target.value } : x
                          )
                        )
                      }
                    />
                  ) : (
                    <Input
                      type={type}
                      value={(rv as any)[key] ?? ""}
                      onChange={(e) =>
                        setRefVecinales((prev) =>
                          prev.map((x, j) =>
                            j === i ? { ...x, [key]: e.target.value } : x
                          )
                        )
                      }
                    />
                  )}
                </Field>
              ))}
              <div className="flex items-center gap-2">
                <Switch
                  checked={!!rv.candidatoViveAhi}
                  onCheckedChange={(v) =>
                    setRefVecinales((prev) =>
                      prev.map((x, j) => (j === i ? { ...x, candidatoViveAhi: v } : x))
                    )
                  }
                />
                <Label className="text-sm">EL CANDIDATO VIVE AHÍ?</Label>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRefVecinales((prev) => [...prev, {}])}
          >
            + Agregar Referencia Vecinal
          </Button>
        </SectionAccordion>

        {/* ─────────────────────────────────────────── */}
        {/* SECCIÓN 15b — REFERENCIAS PERSONALES */}
        {/* ─────────────────────────────────────────── */}
        <SectionAccordion
          index={16}
          title="15b. Referencias Personales"
          active={activeSection === 16}
          onToggle={() => setActiveSection(activeSection === 16 ? 0 : 16)}
        >
          <p className="text-xs text-gray-500 mb-2">
            PERSONALES (NO FAMILIARES DIRECTOS NI JEFES ANTERIORES)
          </p>
          {refPersonales.map((rp, i) => (
            <div key={i} className="border rounded p-2 space-y-2 bg-gray-50 mb-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium">Referencia Personal {i + 1}</span>
                <button
                  type="button"
                  onClick={() => setRefPersonales((prev) => prev.filter((_, j) => j !== i))}
                  className="text-red-500 text-sm"
                >
                  ✕
                </button>
              </div>
              {[
                { key: "nombre", label: "NOMBRE", type: "text" },
                { key: "telefono", label: "TELÉFONO", type: "tel" },
                { key: "ocupacion", label: "OCUPACIÓN", type: "text" },
                { key: "domicilio", label: "DOMICILIO", type: "text" },
                { key: "tiempoConocerlo", label: "TIEMPO DE CONOCERLO", type: "text" },
                { key: "referencia", label: "REFERENCIA", type: "textarea" },
              ].map(({ key, label, type }) => (
                <Field key={key} label={label}>
                  {type === "textarea" ? (
                    <Textarea
                      value={(rp as any)[key] ?? ""}
                      rows={2}
                      onChange={(e) =>
                        setRefPersonales((prev) =>
                          prev.map((x, j) =>
                            j === i ? { ...x, [key]: e.target.value } : x
                          )
                        )
                      }
                    />
                  ) : (
                    <Input
                      type={type}
                      value={(rp as any)[key] ?? ""}
                      onChange={(e) =>
                        setRefPersonales((prev) =>
                          prev.map((x, j) =>
                            j === i ? { ...x, [key]: e.target.value } : x
                          )
                        )
                      }
                    />
                  )}
                </Field>
              ))}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRefPersonales((prev) => [...prev, {}])}
          >
            + Agregar Referencia Personal
          </Button>
        </SectionAccordion>

        {/* ─────────────────────────────────────────── */}
        {/* SECCIÓN 16 — OTROS DATOS */}
        {/* ─────────────────────────────────────────── */}
        <SectionAccordion
          index={17}
          title="16. Otros Datos"
          active={activeSection === 17}
          onToggle={() => setActiveSection(activeSection === 17 ? 0 : 17)}
        >
          <SwitchField
            label="HA TRABAJADO EN ALGUNA EMPRESA DEL GRUPO?"
            value={!!val("otrosDatos.trabajoGrupo")}
            onChange={(v) => update("otrosDatos.trabajoGrupo", v)}
          >
            <Field label="CUAL?">
              <Input
                value={val("otrosDatos.trabajoGrupoCual")}
                onChange={(e) => update("otrosDatos.trabajoGrupoCual", e.target.value)}
              />
            </Field>
            <Field label="PERIODO:">
              <Input
                value={val("otrosDatos.trabajoGrupoPeriodo")}
                onChange={(e) => update("otrosDatos.trabajoGrupoPeriodo", e.target.value)}
              />
            </Field>
            <Field label="MOTIVO DE SALIDA:">
              <Textarea
                value={val("otrosDatos.motivoSalida")}
                onChange={(e) => update("otrosDatos.motivoSalida", e.target.value)}
                rows={2}
              />
            </Field>
          </SwitchField>

          <SwitchField
            label="TIENE FAMILIARES TRABAJANDO EN EL GRUPO?"
            value={!!val("otrosDatos.familiaresGrupo")}
            onChange={(v) => update("otrosDatos.familiaresGrupo", v)}
          >
            <Field label="NOMBRE:">
              <Input
                value={val("otrosDatos.familiaresGrupoNombre")}
                onChange={(e) => update("otrosDatos.familiaresGrupoNombre", e.target.value)}
              />
            </Field>
            <Field label="PUESTO Y DEPARTAMENTO:">
              <Input
                value={val("otrosDatos.familiaresGrupoPuesto")}
                onChange={(e) => update("otrosDatos.familiaresGrupoPuesto", e.target.value)}
              />
            </Field>
          </SwitchField>
        </SectionAccordion>
        </div>{/* /card */}
      </div>{/* /outer */}

      {/* ── NAVEGACIÓN WIZARD ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-3 flex gap-3">
          {activeSection > 1 && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => { setActiveSection((s) => s - 1); window.scrollTo(0, 0); }}
            >
              ← Anterior
            </Button>
          )}
          {activeSection < TOTAL_SECTIONS ? (
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => { setActiveSection((s) => s + 1); window.scrollTo(0, 0); }}
            >
              Siguiente →
            </Button>
          ) : (
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
              onClick={handleComplete}
              disabled={completeMutation.isPending || uploadPhotoMutation.isPending}
            >
              {uploadStatus ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  {uploadStatus}
                </span>
              ) : completeMutation.isPending ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Enviando...
                </span>
              ) : (
                "✅ Enviar y Finalizar"
              )}
            </Button>
          )}
        </div>
        {completeMutation.isError && (
          <p className="text-red-600 text-xs text-center pb-2">
            Error al enviar. Verifica tu conexión e inténtalo de nuevo.
          </p>
        )}
      </div>
    </div>
  );
}
