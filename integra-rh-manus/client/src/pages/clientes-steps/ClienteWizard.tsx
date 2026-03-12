/**
 * ClienteWizard — B2B Onboarding Stepper (3 pasos)
 * @id IMPL-20260312-01
 * @doc context/SPEC-B2B-ONBOARDING.md
 */
import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Building2,
  MapPin,
  Share2,
  Copy,
  Mail,
  MessageCircle,
} from "lucide-react";

// ─── Configuración de pasos ───────────────────────────────────────────────────
const STEPS = [
  { label: "Datos de Empresa", icon: Building2 },
  { label: "Plazas / Sedes", icon: MapPin },
  { label: "Link Mágico", icon: Share2 },
];

// ─── Indicador visual de pasos ────────────────────────────────────────────────
function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${
                  done
                    ? "border-primary bg-primary text-primary-foreground"
                    : active
                    ? "border-primary bg-background text-primary"
                    : "border-muted-foreground/30 bg-background text-muted-foreground"
                }`}
              >
                {done ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={`mt-1 text-[10px] font-medium ${
                  active || done ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 w-14 mx-1 mb-4 transition-colors ${
                  i < current ? "bg-primary" : "bg-muted-foreground/20"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Paso 1: Datos Base de Empresa ────────────────────────────────────────────
interface Step1Props {
  onSuccess: (clientId: number, clientName: string) => void;
}

function Step1DatosBase({ onSuccess }: Step1Props) {
  const utils = trpc.useUtils();
  const [plazasText, setPlazasText] = useState("");
  const pendingNameRef = useRef("");

  const createSitesMutation = trpc.clientSites.create.useMutation();

  const createMutation = trpc.clients.create.useMutation({
    onSuccess: async (data) => {
      utils.clients.list.invalidate();
      toast.success("¡Cliente creado exitosamente!");

      // Crear plazas iniciales si se ingresaron
      const plazas = plazasText
        .split(/\r?\n|,/g)
        .map((s) => s.trim())
        .filter(Boolean);
      const uniquePlazas = Array.from(new Set(plazas));

      if (uniquePlazas.length > 0) {
        try {
          await Promise.all(
            uniquePlazas.map((nombrePlaza) =>
              createSitesMutation.mutateAsync({ clientId: data.id, nombrePlaza })
            )
          );
          await utils.clientSites.listByClient.invalidate({ clientId: data.id });
        } catch {
          toast.error(
            "Cliente creado, pero no se pudieron registrar todas las plazas iniciales."
          );
        }
      }

      onSuccess(data.id, pendingNameRef.current);
    },
    onError: (error) => {
      toast.error("Error al crear cliente: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nombreEmpresa = fd.get("nombreEmpresa") as string;
    pendingNameRef.current = nombreEmpresa;
    createMutation.mutate({
      nombreEmpresa,
      reclutador: (fd.get("reclutador") as string) || undefined,
      contacto: (fd.get("contacto") as string) || undefined,
      telefono: (fd.get("telefono") as string) || undefined,
      email: (fd.get("email") as string) || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="nombreEmpresa">Nombre de la Empresa *</Label>
          <Input
            id="nombreEmpresa"
            name="nombreEmpresa"
            required
            autoFocus
            placeholder="Ej. Logística del Norte S.A."
          />
        </div>
        <div>
          <Label htmlFor="reclutador">Reclutador</Label>
          <Input id="reclutador" name="reclutador" />
        </div>
        <div>
          <Label htmlFor="contacto">Contacto</Label>
          <Input id="contacto" name="contacto" />
        </div>
        <div>
          <Label htmlFor="telefono">Teléfono</Label>
          <Input id="telefono" name="telefono" />
        </div>
        <div className="col-span-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" />
        </div>
        <div className="col-span-2">
          <Label htmlFor="plazas">Plazas / CEDIs iniciales (opcional)</Label>
          <Textarea
            id="plazas"
            value={plazasText}
            onChange={(e) => setPlazasText(e.target.value)}
            placeholder="Una por línea o separadas por coma. Ej: XALAPA, CEDIS OAXACA"
            rows={3}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Puedes agregar más plazas en el siguiente paso.
          </p>
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Creando..." : "Siguiente"}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </form>
  );
}

// ─── Paso 2: Plazas / Sedes ───────────────────────────────────────────────────
interface Step2Props {
  clientId: number;
  onNext: () => void;
}

function Step2Plazas({ clientId, onNext }: Step2Props) {
  const utils = trpc.useUtils();
  const [siteName, setSiteName] = useState("");
  const [siteCity, setSiteCity] = useState("");
  const [siteState, setSiteState] = useState("");

  const { data: sites = [], isLoading } = trpc.clientSites.listByClient.useQuery(
    { clientId },
    { enabled: !!clientId }
  );

  const createSiteMutation = trpc.clientSites.create.useMutation({
    onSuccess: () => {
      utils.clientSites.listByClient.invalidate({ clientId });
      setSiteName("");
      setSiteCity("");
      setSiteState("");
      toast.success("Plaza agregada");
    },
    onError: (e) => toast.error("Error al agregar plaza: " + e.message),
  });

  const handleAddSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName.trim()) return;
    createSiteMutation.mutate({
      clientId,
      nombrePlaza: siteName.trim(),
      ciudad: siteCity.trim() || undefined,
      estado: siteState.trim() || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Registra las plazas, sucursales o CEDIs asociados a este cliente.
        Podrás seleccionarlas al crear candidatos y procesos.
      </p>

      {/* Lista de plazas existentes */}
      <div className="border rounded-md p-3 min-h-[80px] max-h-60 overflow-auto">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando plazas...</p>
        ) : sites.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay plazas registradas. Agrega la primera abajo.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {sites.map((site: any) => (
              <li
                key={site.id}
                className="flex items-center justify-between rounded border bg-white px-2 py-1"
              >
                <div>
                  <p className="font-medium">{site.nombrePlaza}</p>
                  {(site.ciudad || site.estado) && (
                    <p className="text-xs text-muted-foreground">
                      {[site.ciudad, site.estado].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Formulario para agregar plaza */}
      <form onSubmit={handleAddSite} className="space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="md:col-span-3">
            <Label htmlFor="site-name">Plaza / CEDI *</Label>
            <Input
              id="site-name"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="Ej. XALAPA, CEDIS OAXACA..."
            />
          </div>
          <div>
            <Label htmlFor="site-city">Ciudad</Label>
            <Input
              id="site-city"
              value={siteCity}
              onChange={(e) => setSiteCity(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="site-state">Estado</Label>
            <Input
              id="site-state"
              value={siteState}
              onChange={(e) => setSiteState(e.target.value)}
            />
          </div>
        </div>
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={createSiteMutation.isPending || !siteName.trim()}
        >
          Agregar plaza
        </Button>
      </form>

      <div className="flex justify-end pt-2 border-t">
        <Button onClick={onNext}>
          Siguiente <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// ─── Paso 3: Link Mágico y Finalización ──────────────────────────────────────
interface Step3Props {
  clientId: number;
  clientName: string;
  onFinish: () => void;
}

function Step3LinkMagico({ clientId, clientName, onFinish }: Step3Props) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");

  const shareLinkMutation = trpc.clientAccess.create.useMutation({
    onSuccess: (res: any) => {
      setGeneratedLink(res.url);
      toast.success("Enlace generado");
      try {
        navigator.clipboard?.writeText(res.url);
        toast.info("Enlace copiado al portapapeles");
      } catch {
        // ignore — clipboard puede no estar disponible en HTTP
      }
    },
    onError: (e) => toast.error("No se pudo generar el enlace: " + e.message),
  });

  const buildMessage = (url: string) =>
    `Integra RH - Seguimiento de procesos\n\nHola ${clientName}, te compartimos el portal para dar seguimiento en tiempo real a tus procesos y candidatos:\n${url}\n\nPuedes consultarlo cuando gustes para revisar avances, visitas y dictámenes.`;

  const handleGenerateLink = () => {
    shareLinkMutation.mutate({
      clientId,
      ttlDays: 14,
      baseUrl: window.location.origin,
    });
  };

  const copyMessage = () => {
    if (!generatedLink) return;
    navigator.clipboard
      ?.writeText(buildMessage(generatedLink))
      .then(() => toast.success("Mensaje copiado"))
      .catch(() => toast.error("No se pudo copiar el mensaje"));
  };

  const sendMail = () => {
    if (!generatedLink || !email) {
      toast.error("Necesitas capturar un correo y generar el enlace");
      return;
    }
    const subject = "Integra RH - Seguimiento de procesos y candidatos";
    window.open(
      `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(buildMessage(generatedLink))}`
    );
  };

  const sendWhatsapp = () => {
    if (!generatedLink || !phone) {
      toast.error("Necesitas capturar un teléfono y generar el enlace");
      return;
    }
    const digits = phone.replace(/[^0-9+]/g, "");
    if (!digits) {
      toast.error("Teléfono no válido");
      return;
    }
    window.open(
      `https://api.whatsapp.com/send?phone=${encodeURIComponent(digits)}&text=${encodeURIComponent(buildMessage(generatedLink))}`,
      "_blank"
    );
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Este enlace permite a <strong>{clientName}</strong> dar seguimiento a
        todos sus procesos y candidatos en Integra RH.
      </p>

      <div>
        <Label htmlFor="link-email">Correo del cliente (para enviar mensaje)</Label>
        <Input
          id="link-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="cliente@empresa.com"
        />
      </div>

      <div>
        <Label htmlFor="link-phone">WhatsApp</Label>
        <Input
          id="link-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+52 55 0000 0000"
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button onClick={handleGenerateLink} disabled={shareLinkMutation.isPending}>
          {generatedLink ? "Regenerar enlace" : "Generar enlace"}
        </Button>
        {generatedLink && (
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard?.writeText(generatedLink);
              toast.success("Enlace copiado");
            }}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copiar enlace
          </Button>
        )}
      </div>

      {generatedLink && (
        <div className="space-y-3">
          <div className="bg-muted rounded p-3 text-sm break-all">
            {generatedLink}
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="secondary" onClick={copyMessage}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar mensaje completo
            </Button>
            <Button variant="outline" onClick={sendMail} disabled={!email}>
              <Mail className="h-4 w-4 mr-2" />
              Enviar por correo
            </Button>
            <Button variant="outline" onClick={sendWhatsapp} disabled={!phone}>
              <MessageCircle className="h-4 w-4 mr-2" />
              Compartir por WhatsApp
            </Button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center pt-2 border-t">
        <p className="text-xs text-muted-foreground">
          Puedes generar el enlace más tarde desde la lista de clientes.
        </p>
        <Button onClick={onFinish}>
          <Check className="h-4 w-4 mr-2" />
          Finalizar
        </Button>
      </div>
    </div>
  );
}

// ─── Wizard Principal ─────────────────────────────────────────────────────────
export default function ClienteWizard() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const [clientId, setClientId] = useState<number | null>(null);
  const [clientName, setClientName] = useState("");

  const handleStep1Success = (id: number, name: string) => {
    setClientId(id);
    setClientName(name);
    setStep(1);
  };

  const handleFinish = () => {
    setLocation("/clientes");
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Encabezado */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/clientes")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nuevo Cliente</h1>
          <p className="text-muted-foreground text-sm">
            Registro de cliente B2B en 3 pasos
          </p>
        </div>
      </div>

      {/* Indicador de paso */}
      <div className="flex justify-center py-2">
        <StepIndicator current={step} />
      </div>

      {/* Paso activo */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[step].label}</CardTitle>
        </CardHeader>
        <CardContent>
          {step === 0 && <Step1DatosBase onSuccess={handleStep1Success} />}
          {step === 1 && clientId !== null && (
            <Step2Plazas clientId={clientId} onNext={() => setStep(2)} />
          )}
          {step === 2 && clientId !== null && (
            <Step3LinkMagico
              clientId={clientId}
              clientName={clientName}
              onFinish={handleFinish}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
