/**
 * @file RecepcionValidacion.tsx
 * @description Paso 1: Recepción y Validación — entorno del proceso, datos demográficos
 *              del candidato (editable) y checklist de completitud.
 * IMPL-20260311-01 | SPEC-003-CAPTURA-ANALISTA-REORDEN
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Inbox, Building2, User, FileCheck, CheckCircle2, AlertCircle,
  Pencil, Save, X, Phone, MapPin, CreditCard, Shield, CircleDot,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** IMPL-20260311-01 | SPEC-003-CAPTURA-ANALISTA-REORDEN */
interface Props {
  process: any;
}

const MEDIO_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  correo: "Correo electrónico",
  telefono: "Teléfono",
  boca_a_boca: "Boca a boca",
  portal: "Portal web",
  presencial: "Presencial",
  otro: "Otro",
};

const STATUS_LABELS: Record<string, string> = {
  en_recepcion: "En recepción",
  asignado: "Asignado",
  entrevistado: "Entrevistado",
  no_entrevistado: "No entrevistado",
  en_verificacion: "En investigación",
  visita_programada: "Visita programada",
  visita_realizada: "Visita realizada",
  en_dictamen: "En revisión final",
  finalizado: "Finalizado",
  entregado: "Entregado",
};

const SELF_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  pendiente: { label: "Self-Service: Pendiente", variant: "secondary" },
  recibido:  { label: "Self-Service: Recibido ⚠", variant: "default" },
  revisado:  { label: "Self-Service: Revisado ✓", variant: "outline" },
};

/** Fila de lectura con etiqueta + valor. Resalta en rojo si `missing` y sin valor. */
function DataField({
  label,
  value,
  missing = false,
}: {
  label: string;
  value?: string | null;
  missing?: boolean;
}) {
  const hasVal = value !== undefined && value !== null && String(value).trim() !== "";
  return (
    <div className="flex justify-between items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-muted-foreground text-xs font-medium shrink-0">{label}</span>
      <span
        className={cn(
          "text-xs text-right max-w-[58%] break-words",
          !hasVal && missing && "text-destructive/70 italic"
        )}
      >
        {hasVal ? String(value) : missing ? "Sin datos" : "—"}
      </span>
    </div>
  );
}

/** Título de sub-sección dentro de una Card */
function SectionTitle({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </p>
  );
}

export default function RecepcionValidacion({ process }: Props) {
  const [editing, setEditing] = useState(false);
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");

  const utils = trpc.useUtils();
  const candidatoId: number | undefined = process?.candidatoId;

  const { data: candidate, isLoading: loadingCandidate } = trpc.candidates.getById.useQuery(
    { id: candidatoId ?? 0 },
    { enabled: !!candidatoId }
  );

  const updateMutation = trpc.candidates.update.useMutation({
    onSuccess: () => {
      utils.candidates.getById.invalidate({ id: candidatoId });
      setEditing(false);
      toast.success("Datos del candidato actualizados");
    },
    onError: (e: any) => toast.error("Error al guardar: " + e.message),
  });

  const markReviewedMutation = trpc.candidates.markSelfFilledReviewed.useMutation({
    onSuccess: () => {
      utils.candidates.getById.invalidate({ id: candidatoId });
      toast.success("Captura self-service marcada como revisada");
    },
    onError: (e: any) => toast.error("Error: " + e.message),
  });

  const handleStartEdit = () => {
    setNombreCompleto(candidate?.nombreCompleto ?? "");
    setEmail(candidate?.email ?? "");
    setTelefono(candidate?.telefono ?? "");
    setEditing(true);
  };

  const handleSave = () => {
    if (!candidatoId || !nombreCompleto.trim()) return;
    updateMutation.mutate({
      id: candidatoId,
      data: {
        nombreCompleto: nombreCompleto.trim(),
        email: email.trim() || undefined,
        telefono: telefono.trim() || undefined,
      },
    });
  };

  // Datos derivados del perfilDetalle (JSON)
  const perfil: any = (candidate as any)?.perfilDetalle ?? {};
  const generales = perfil.generales ?? {};
  const domicilio  = perfil.domicilio  ?? {};
  const emergency  = perfil.contactoEmergencia ?? {};
  const selfStatus = (candidate?.selfFilledStatus ?? "pendiente") as keyof typeof SELF_BADGE;

  /** Retorna true si el valor es no-vacío */
  const hasVal = (v: unknown) =>
    v !== undefined && v !== null && String(v).trim() !== "";

  // Ítems del checklist de completitud
  const checkItems = [
    { label: "Nombre completo", ok: hasVal(candidate?.nombreCompleto) },
    { label: "Email o teléfono", ok: hasVal(candidate?.email) || hasVal(candidate?.telefono) },
    { label: "CURP", ok: hasVal(generales.curp) },
    { label: "RFC", ok: hasVal(generales.rfc) },
    { label: "NSS (IMSS)", ok: hasVal(generales.nss) },
    { label: "Domicilio (calle + municipio)", ok: hasVal(domicilio.calle) && hasVal(domicilio.municipio) },
    { label: "Contacto de emergencia", ok: hasVal(emergency.nombre) },
  ];
  const completedCount = checkItems.filter((i) => i.ok).length;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <div className="bg-blue-100 text-blue-700 rounded-full p-2 mt-0.5">
          <Inbox className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Paso 1: Recepción y Validación</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Confirma que el proceso fue recibido correctamente y que los datos demográficos del candidato están completos antes de continuar.
          </p>
        </div>
      </div>

      {/* ── A: Entorno + Cliente (solo lectura) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Entorno del Proceso */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CircleDot className="h-4 w-4 text-blue-500" />
              Entorno del Proceso
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <DataField label="Clave" value={process?.clave} />
            <DataField label="Tipo de servicio" value={process?.tipoProducto} />
            <DataField
              label="Estatus"
              value={STATUS_LABELS[process?.status] ?? process?.status}
            />
            <DataField
              label="Medio de recepción"
              value={MEDIO_LABELS[process?.medioDeRecepcion] ?? process?.medioDeRecepcion}
            />
            <DataField
              label="Fecha de recepción"
              value={
                process?.fechaRecepcion
                  ? new Date(process.fechaRecepcion).toLocaleDateString("es-MX", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : undefined
              }
            />
            <DataField label="Responsable" value={process?.responsableName} />
          </CardContent>
        </Card>

        {/* Cliente Vinculado */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Cliente Vinculado
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <DataField label="Empresa" value={process?.clientName} missing />
            <DataField label="Sede / Plaza" value={process?.siteName} />
            <DataField
              label="ID Cliente"
              value={process?.clienteId ? String(process.clienteId) : undefined}
            />
          </CardContent>
        </Card>
      </div>

      {/* ── B: Datos del Candidato ── */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Datos del Candidato
          </CardTitle>
          <div className="flex items-center gap-2">
            {selfStatus !== "pendiente" && (
              <Badge
                variant={SELF_BADGE[selfStatus]?.variant ?? "secondary"}
                className="text-xs"
              >
                {SELF_BADGE[selfStatus]?.label ?? selfStatus}
              </Badge>
            )}
            {!editing && !loadingCandidate && candidate && (
              <Button variant="ghost" size="sm" onClick={handleStartEdit}>
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Editar
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {loadingCandidate ? (
            <div className="space-y-2 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-4 bg-muted rounded w-full" />
              ))}
            </div>
          ) : (
            <>
              {/* ── B.1 Identificación y contacto ── */}
              <div>
                <SectionTitle icon={User} label="Identificación y Contacto" />
                {editing ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2 space-y-1">
                      <Label htmlFor="nombreCompleto" className="text-xs">
                        Nombre completo *
                      </Label>
                      <Input
                        id="nombreCompleto"
                        value={nombreCompleto}
                        onChange={(e) => setNombreCompleto(e.target.value)}
                        placeholder="Nombre completo del candidato"
                        className="h-8 text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="email" className="text-xs">
                        Correo electrónico
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="correo@ejemplo.com"
                        className="h-8 text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="telefono" className="text-xs">
                        Teléfono móvil
                      </Label>
                      <Input
                        id="telefono"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        placeholder="10 dígitos"
                        maxLength={15}
                        className="h-8 text-sm"
                      />
                    </div>

                    <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditing(false)}
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={updateMutation.isPending || !nombreCompleto.trim()}
                      >
                        <Save className="h-3.5 w-3.5 mr-1" />
                        {updateMutation.isPending ? "Guardando…" : "Guardar cambios"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <DataField label="Nombre completo" value={candidate?.nombreCompleto} missing />
                    <DataField label="Correo electrónico" value={candidate?.email} />
                    <DataField label="Teléfono móvil" value={candidate?.telefono} />
                    <DataField label="Teléfono de casa" value={generales.telefonoCasa} />
                    <DataField label="Teléfono recados" value={generales.telefonoRecados} />
                  </div>
                )}
              </div>

              <Separator />

              {/* ── B.2 Documentos de Identidad (solo lectura) ── */}
              <div>
                <SectionTitle icon={CreditCard} label="Documentos de Identidad" />
                <div className="grid sm:grid-cols-2 gap-x-8">
                  <DataField label="CURP" value={generales.curp} missing />
                  <DataField label="RFC" value={generales.rfc} missing />
                  <DataField label="NSS (IMSS)" value={generales.nss} missing />
                  <DataField label="Fecha de nacimiento" value={generales.fechaNacimiento} />
                  <DataField label="Lugar de nacimiento" value={generales.lugarNacimiento} />
                  <DataField label="Ciudad de residencia" value={generales.ciudadResidencia} />
                </div>
              </div>

              <Separator />

              {/* ── B.3 Domicilio (solo lectura) ── */}
              <div>
                <SectionTitle icon={MapPin} label="Domicilio" />
                <DataField
                  label="Calle y número"
                  value={
                    [domicilio.calle, domicilio.numero, domicilio.interior]
                      .filter(Boolean)
                      .join(" ") || undefined
                  }
                  missing
                />
                <DataField label="Colonia" value={domicilio.colonia} />
                <DataField label="Municipio / Alcaldía" value={domicilio.municipio} missing />
                <DataField label="Estado" value={domicilio.estado} />
                <DataField label="C.P." value={domicilio.cp} />
              </div>

              <Separator />

              {/* ── B.4 Contacto de Emergencia (solo lectura) ── */}
              <div>
                <SectionTitle icon={Phone} label="Contacto de Emergencia" />
                <DataField label="Nombre" value={emergency.nombre} missing />
                <DataField label="Parentesco" value={emergency.parentesco} />
                <DataField label="Teléfono" value={emergency.telefono} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── C: Checklist de Recepción ── */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-muted-foreground" />
            Checklist de Recepción
          </CardTitle>
          <Badge variant="outline" className="text-xs font-normal">
            {completedCount}/{checkItems.length} completos
          </Badge>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-2">
            {checkItems.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm">
                {item.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                )}
                <span className={item.ok ? "text-foreground" : "text-muted-foreground"}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          {/* Acción: revisar self-service si fue recibido */}
          {selfStatus === "recibido" && (
            <>
              <Separator />
              <Alert className="border-blue-200 bg-blue-50">
                <Shield className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm">
                  El candidato completó su captura self-service.{" "}
                  <strong>Valida el contenido</strong> en las secciones superiores y a continuación
                  marca como revisado.
                  {candidate?.selfFilledAt && (
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      Enviado:{" "}
                      {new Date((candidate as any).selfFilledAt).toLocaleString("es-MX")}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => candidatoId && markReviewedMutation.mutate({ id: candidatoId })}
                  disabled={markReviewedMutation.isPending || !candidatoId}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  {markReviewedMutation.isPending ? "Procesando…" : "Marcar como Revisado"}
                </Button>
              </div>
            </>
          )}

          {selfStatus === "pendiente" && (
            <>
              <Separator />
              <p className="text-xs text-muted-foreground">
                El candidato aún no ha completado su captura self-service. Los campos de
                identidad (CURP, RFC, NSS, domicilio) permanecerán vacíos hasta que lo haga.
              </p>
            </>
          )}

          {selfStatus === "revisado" && (
            <>
              <Separator />
              <p className="text-xs text-green-600 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Datos self-service revisados y aprobados por un analista.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
