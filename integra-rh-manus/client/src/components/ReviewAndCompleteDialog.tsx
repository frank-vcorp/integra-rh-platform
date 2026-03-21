import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CAUSALES_SALIDA } from "@/lib/constants";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle2, Plus } from "lucide-react";

/**
 * ARCH-20260321-01 | Respaldo: PROYECTO.md
 */
const monthAliases: Record<string, string> = {
  enero: "01",
  febrero: "02",
  marzo: "03",
  abril: "04",
  mayo: "05",
  junio: "06",
  julio: "07",
  agosto: "08",
  septiembre: "09",
  setiembre: "09",
  octubre: "10",
  noviembre: "11",
  diciembre: "12",
};

const normalizeText = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

const normalizeWorkDateDraft = (value: string): string | null => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return "";
  }

  if (/^\d{4}$/.test(trimmedValue) || /^\d{4}-\d{2}$/.test(trimmedValue) || /^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
    return trimmedValue;
  }

  const monthSlashYearMatch = /^(\d{1,2})\/(\d{4})$/.exec(trimmedValue);
  if (monthSlashYearMatch) {
    const month = Number(monthSlashYearMatch[1]);
    const year = monthSlashYearMatch[2];
    if (month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, "0")}`;
    }
    return null;
  }

  const dayMonthYearMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmedValue);
  if (dayMonthYearMatch) {
    const day = Number(dayMonthYearMatch[1]);
    const month = Number(dayMonthYearMatch[2]);
    const year = dayMonthYearMatch[3];
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
    return null;
  }

  const normalizedText = normalizeText(trimmedValue);
  const monthNameYearMatch = /^([a-z]+)\s+(\d{4})$/.exec(normalizedText);
  if (!monthNameYearMatch) {
    return null;
  }

  const month = monthAliases[monthNameYearMatch[1]];
  if (!month) {
    return null;
  }

  return `${monthNameYearMatch[2]}-${month}`;
};

const formatWorkDateForInput = (value: string): string => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return "";
  }

  const normalizedValue = normalizeWorkDateDraft(trimmedValue);
  const displayValue = normalizedValue ?? trimmedValue;

  if (/^\d{4}-\d{2}$/.test(displayValue)) {
    const [year, month] = displayValue.split("-");
    return `${month}/${year}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(displayValue)) {
    const [year, month, day] = displayValue.split("-");
    return `${day}/${month}/${year}`;
  }

  return displayValue;
};

const maskMonthYearInput = (value: string): string => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return "";
  }

  if (/[a-zA-Z]/.test(trimmedValue) || trimmedValue.includes("-")) {
    return trimmedValue;
  }

  const digitsOnly = trimmedValue.replace(/\D/g, "").slice(0, 6);
  if (digitsOnly.length <= 2) {
    return digitsOnly;
  }

  return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`;
};

const normalizeDateFieldForPayload = (
  value: string,
  label: string,
): { normalizedValue?: string; error?: string } => {
  const normalizedValue = normalizeWorkDateDraft(value);
  if (normalizedValue === null) {
    return {
      error: `${label} debe capturarse como YYYY, YYYY-MM, YYYY-MM-DD, MM/YYYY o MES YYYY.`,
    };
  }

  if (!normalizedValue) {
    return {};
  }

  return { normalizedValue };
};

const calculateTiempoTrabajadoFormat = (fechaInicio: string, fechaFin: string): string => {
  if (!fechaInicio || !fechaFin) return "";
  
  const start = normalizeWorkDateDraft(fechaInicio);
  const end = normalizeWorkDateDraft(fechaFin);
  if (!start || !end) return "";

  const parseDate = (d: string) => {
    const parts = d.split('-');
    const year = parseInt(parts[0], 10);
    const month = parts[1] ? parseInt(parts[1], 10) : 1;
    return new Date(year, month - 1, 1);
  };

  const startDate = parseDate(start);
  const endDate = parseDate(end);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return "";

  let months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());

  if (months < 0) return "";
  if (months === 0) return "Menos de 1 mes";

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  let result = [];
  if (years === 1) result.push("1 año");
  else if (years > 1) result.push(`${years} años`);

  if (remainingMonths === 1) result.push("1 mes");
  else if (remainingMonths > 1) result.push(`${remainingMonths} meses`);

  return result.join(" ");
};

export interface ReviewAndCompleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workHistoryItem: any;
  onSave: (data: any) => Promise<void>;
  isPending: boolean;
  candidatoId?: number; // Necesario para crear nuevo empleo
}

/**
 * Dialog "Revisar y Completar" / "Agregar Historial Laboral"
 * 
 * Dos modos:
 * - MODO CREAR (workHistoryItem === null): Formulario simple para agregar nuevo empleo
 * - MODO REVISAR (workHistoryItem existe): Tabs "Candidato declaró / Yo verifiqué"
 */
export function ReviewAndCompleteDialog({
  open,
  onOpenChange,
  workHistoryItem,
  onSave,
  isPending,
  candidatoId,
}: ReviewAndCompleteDialogProps) {
  const isCreateMode = !workHistoryItem;

  const buildInitialFormData = (item: any) => ({
    empresa: item?.empresa || "",
    puesto: item?.puesto || "",
    fechaInicio: formatWorkDateForInput(item?.fechaInicio || ""),
    fechaFin: formatWorkDateForInput(item?.fechaFin || ""),
    tiempoTrabajado: item?.tiempoTrabajado || "",
    empresaVerificada: item?.investigacionDetalle?.empresa?.nombreComercial || "",
    puestoVerificado: item?.investigacionDetalle?.puesto?.puestoFinal || "",
    causalSalidaRH: item?.causalSalidaRH || "",
    causalSalidaJefeInmediato: item?.causalSalidaJefeInmediato || "",
    observaciones: item?.observaciones || "",
    tiempoTrabajadoEmpresa: item?.tiempoTrabajadoEmpresa || "",
    comentarioInvestigacion: item?.comentarioInvestigacion || "",
  });
  
  const [activeTab, setActiveTab] = useState<"candidato" | "analista">("candidato");
  const [showCandidateEdit, setShowCandidateEdit] = useState(false);
  const [esActual, setEsActual] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [formData, setFormData] = useState(buildInitialFormData(workHistoryItem));

  // Actualizar formData cuando cambia workHistoryItem
  useEffect(() => {
    if (workHistoryItem) {
      setFormData(buildInitialFormData(workHistoryItem));
      setEsActual(!workHistoryItem.fechaFin);
      setValidationError(null);
    } else {
      // Reset para modo crear
      setFormData(buildInitialFormData(null));
      setEsActual(false);
      setShowCandidateEdit(false);
      setValidationError(null);
    }
  }, [workHistoryItem]);

  // Recalcular tiempo trabajado automáticamente cuando cambian las fechas
  useEffect(() => {
    if (!esActual && formData.fechaInicio && formData.fechaFin) {
      const startNorm = normalizeWorkDateDraft(formData.fechaInicio);
      const endNorm = normalizeWorkDateDraft(formData.fechaFin);
      if (startNorm && endNorm) {
        const calculated = calculateTiempoTrabajadoFormat(formData.fechaInicio, formData.fechaFin);
        if (calculated && calculated !== formData.tiempoTrabajado) {
          setFormData(prev => ({ ...prev, tiempoTrabajado: calculated }));
        }
      }
    }
  }, [formData.fechaInicio, formData.fechaFin, esActual]);

  const handleDateBlur = (field: "fechaInicio" | "fechaFin") => {
    setFormData((currentData) => ({
      ...currentData,
      [field]: formatWorkDateForInput(currentData[field]),
    }));
  };

  const handleDateChange = (field: "fechaInicio" | "fechaFin", nextValue: string) => {
    setFormData((currentData) => ({
      ...currentData,
      [field]: maskMonthYearInput(nextValue),
    }));
  };

  const handleSave = async () => {
    setValidationError(null);

    const normalizedStartDate = normalizeDateFieldForPayload(formData.fechaInicio, "Fecha de inicio");
    if (normalizedStartDate.error) {
      setValidationError(normalizedStartDate.error);
      return;
    }

    const normalizedEndDate = normalizeDateFieldForPayload(formData.fechaFin, "Fecha de fin");
    if (normalizedEndDate.error) {
      setValidationError(normalizedEndDate.error);
      return;
    }

    if (isCreateMode) {
      // Modo crear: payload simple
      const payload = {
        candidatoId,
        empresa: formData.empresa,
        puesto: formData.puesto || undefined,
        fechaInicio: normalizedStartDate.normalizedValue,
        fechaFin: esActual ? undefined : normalizedEndDate.normalizedValue,
        tiempoTrabajado: formData.tiempoTrabajado || undefined,
      };
      await onSave(payload);
    } else {
      // Modo revisar: payload completo
      const payload = {
        ...workHistoryItem,
        empresa: formData.empresa,
        puesto: formData.puesto,
        fechaInicio: normalizedStartDate.normalizedValue,
        fechaFin: esActual ? undefined : normalizedEndDate.normalizedValue,
        tiempoTrabajado: formData.tiempoTrabajado,
        causalSalidaRH: formData.causalSalidaRH,
        causalSalidaJefeInmediato: formData.causalSalidaJefeInmediato,
        observaciones: formData.observaciones,
        tiempoTrabajadoEmpresa: formData.tiempoTrabajadoEmpresa,
        comentarioInvestigacion: formData.comentarioInvestigacion,
        capturadoPor: "analista",
        investigacionDetalle: {
          ...workHistoryItem?.investigacionDetalle,
          empresa: {
            ...workHistoryItem?.investigacionDetalle?.empresa,
            nombreComercial: formData.empresaVerificada,
          },
          puesto: {
            ...workHistoryItem?.investigacionDetalle?.puesto,
            puestoFinal: formData.puestoVerificado,
          },
        },
      };
      await onSave(payload);
    }
    onOpenChange(false);
  };

  const ESTATUS_INVESTIGACION = ["en_revision", "revisado", "terminado"];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-xl md:max-w-3xl" aria-describedby="review-desc">
        <SheetHeader>
          <SheetTitle>
            {isCreateMode ? (
              <span className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Agregar Historial Laboral
              </span>
            ) : (
              `Revisar y Completar — ${formData.empresa || "Sin empresa"}`
            )}
          </SheetTitle>
        </SheetHeader>
        <p id="review-desc" className="sr-only">
          {isCreateMode 
            ? "Formulario para agregar un nuevo empleo al historial laboral."
            : "Dialog para revisar datos del candidato y completar verificación."}
        </p>

        {validationError ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {validationError}
          </div>
        ) : null}

        {/* MODO CREAR: Formulario simple */}
        {isCreateMode ? (
          <div className="space-y-4">
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-sky-700">
                Captura los datos básicos del empleo. El equipo de investigación completará la verificación posteriormente.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="empresa-new">Empresa *</Label>
                <Input
                  id="empresa-new"
                  value={formData.empresa}
                  onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                  placeholder="Nombre de la empresa"
                  required
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="puesto-new">Puesto</Label>
                <Input
                  id="puesto-new"
                  value={formData.puesto}
                  onChange={(e) => setFormData({ ...formData, puesto: e.target.value })}
                  placeholder="Título del puesto"
                />
              </div>

              <div>
                <Label htmlFor="fecha-inicio-new">Mes / Año de Inicio</Label>
                <Input
                  id="fecha-inicio-new"
                  type="text"
                  placeholder="MM/YYYY o MES YYYY"
                  value={formData.fechaInicio}
                  onChange={(e) => handleDateChange("fechaInicio", e.target.value)}
                  onBlur={() => handleDateBlur("fechaInicio")}
                />
              </div>

              <div>
                <Label htmlFor="fecha-fin-new">Mes / Año de Fin</Label>
                <Input
                  id="fecha-fin-new"
                  type="text"
                  placeholder="MM/YYYY o MES YYYY"
                  value={formData.fechaFin}
                  onChange={(e) => handleDateChange("fechaFin", e.target.value)}
                  onBlur={() => handleDateBlur("fechaFin")}
                  disabled={esActual}
                  className={esActual ? "bg-gray-100" : ""}
                />
              </div>

              <div className="col-span-2 flex items-center gap-2">
                <input
                  id="es-actual-new"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={esActual}
                  onChange={(e) => {
                    setEsActual(e.target.checked);
                    if (e.target.checked) {
                      setFormData({ ...formData, fechaFin: "" });
                    }
                  }}
                />
                <Label htmlFor="es-actual-new" className="text-sm font-normal">
                  Este es el empleo actual
                </Label>
              </div>

              <div className="col-span-2">
                <Label htmlFor="tiempo-new">Tiempo trabajado</Label>
                <Input
                  id="tiempo-new"
                  placeholder="Ej. 2 años 3 meses"
                  value={formData.tiempoTrabajado}
                  onChange={(e) => setFormData({ ...formData, tiempoTrabajado: e.target.value })}
                />
              </div>
            </div>
          </div>
        ) : (
          /* MODO REVISAR: Tabs Candidato/Analista */
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="candidato" className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Candidato declaró
              </TabsTrigger>
              <TabsTrigger value="analista" className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Yo verifiqué
              </TabsTrigger>
            </TabsList>

            {/* SECCIÓN A: Candidato declaró (readonly por defecto) */}
            <TabsContent value="candidato" className="space-y-4 mt-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-blue-900">Datos declarados por el candidato</p>
                    <p className="text-sm text-blue-700 mt-1">
                      {showCandidateEdit
                        ? "Estás editando los datos del candidato. Usa esto si el candidato cometió un error."
                        : "Estos son los datos que el candidato reportó en su formulario inicial."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="empresa-cand">Empresa *</Label>
                  <Input
                    id="empresa-cand"
                    value={formData.empresa}
                    onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                    disabled={!showCandidateEdit}
                    className={!showCandidateEdit ? "bg-gray-50" : ""}
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="puesto-cand">Puesto</Label>
                  <Input
                    id="puesto-cand"
                    value={formData.puesto}
                    onChange={(e) => setFormData({ ...formData, puesto: e.target.value })}
                    disabled={!showCandidateEdit}
                    className={!showCandidateEdit ? "bg-gray-50" : ""}
                  />
                </div>

                <div>
                  <Label>Mes / Año de Inicio</Label>
                  <Input
                    type="text"
                    placeholder="MM/YYYY o MES YYYY"
                    value={formData.fechaInicio}
                    onChange={(e) => handleDateChange("fechaInicio", e.target.value)}
                    onBlur={() => handleDateBlur("fechaInicio")}
                    disabled={!showCandidateEdit}
                    className={!showCandidateEdit ? "bg-gray-50" : ""}
                  />
                </div>

                <div>
                  <Label>Mes / Año de Fin</Label>
                  <Input
                    type="text"
                    placeholder="MM/YYYY o MES YYYY"
                    value={formData.fechaFin}
                    onChange={(e) => handleDateChange("fechaFin", e.target.value)}
                    onBlur={() => handleDateBlur("fechaFin")}
                    disabled={!showCandidateEdit}
                    className={!showCandidateEdit ? "bg-gray-50" : ""}
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="tiempo-cand">Tiempo trabajado</Label>
                  <Input
                    id="tiempo-cand"
                    placeholder="Ej. 3 años 2 meses"
                    value={formData.tiempoTrabajado}
                    onChange={(e) => setFormData({ ...formData, tiempoTrabajado: e.target.value })}
                    disabled={!showCandidateEdit}
                    className={!showCandidateEdit ? "bg-gray-50" : ""}
                  />
                </div>
              </div>

              {!showCandidateEdit && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowCandidateEdit(true)}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Datos incorrectos, quiero corregir
                </Button>
              )}

              {showCandidateEdit && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowCandidateEdit(false)}
                >
                  Listo, cancelar edición
                </Button>
              )}
            </TabsContent>

            {/* SECCIÓN B: Yo verifiqué (editable) */}
            <TabsContent value="analista" className="space-y-4 mt-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-amber-900">Tu verificación</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Completa estos campos con la información que verificaste durante la llamada telefónica.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="empresa-verif">Empresa (según verificación)</Label>
                  <Input
                    id="empresa-verif"
                    value={formData.empresaVerificada}
                    onChange={(e) => setFormData({ ...formData, empresaVerificada: e.target.value })}
                    placeholder="Nombre comercial de la empresa"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="puesto-verif">Puesto (según verificación)</Label>
                  <Input
                    id="puesto-verif"
                    value={formData.puestoVerificado}
                    onChange={(e) => setFormData({ ...formData, puestoVerificado: e.target.value })}
                    placeholder="Puesto final verificado"
                  />
                </div>

                <div>
                  <Label htmlFor="causal-rh">Causal RH</Label>
                  <select
                    id="causal-rh"
                    value={formData.causalSalidaRH}
                    onChange={(e) => setFormData({ ...formData, causalSalidaRH: e.target.value })}
                    className="mt-1 block w-full border rounded-md h-10 px-3 bg-white"
                  >
                    <option value="">Sin especificar</option>
                    {CAUSALES_SALIDA.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="causal-jefe">Causal Jefe</Label>
                  <select
                    id="causal-jefe"
                    value={formData.causalSalidaJefeInmediato}
                    onChange={(e) => setFormData({ ...formData, causalSalidaJefeInmediato: e.target.value })}
                    className="mt-1 block w-full border rounded-md h-10 px-3 bg-white"
                  >
                    <option value="">Sin especificar</option>
                    {CAUSALES_SALIDA.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <Label htmlFor="tiempo-empresa">Tiempo según empresa</Label>
                  <Input
                    id="tiempo-empresa"
                    placeholder="Ej. 3 años 2 meses"
                    value={formData.tiempoTrabajadoEmpresa}
                    onChange={(e) => setFormData({ ...formData, tiempoTrabajadoEmpresa: e.target.value })}
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="observaciones">Observaciones</Label>
                  <Textarea
                    id="observaciones"
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="comentario-verif">Comentario de verificación</Label>
                  <Textarea
                    id="comentario-verif"
                    value={formData.comentarioInvestigacion}
                    onChange={(e) => setFormData({ ...formData, comentarioInvestigacion: e.target.value })}
                    rows={3}
                    placeholder="Resultado de la llamada, incidencias, datos adicionales..."
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isPending || (isCreateMode && !formData.empresa.trim())}
          >
            {isPending ? "Guardando..." : isCreateMode ? "Agregar empleo" : "Guardar cambios"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
