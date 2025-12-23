import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export interface ReviewAndCompleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workHistoryItem: any;
  onSave: (data: any) => Promise<void>;
  isPending: boolean;
}

/**
 * Dialog "Revisar y Completar"
 * 
 * Reemplaza los 2 dialogs anteriores con uno unificado con 2 secciones claras:
 * - SECCIÓN A: "Candidato declaró" (readonly - datos que el candidato llenó)
 * - SECCIÓN B: "Yo verifiqué" (editable - lo que el analista verifica/completa)
 */
export function ReviewAndCompleteDialog({
  open,
  onOpenChange,
  workHistoryItem,
  onSave,
  isPending,
}: ReviewAndCompleteDialogProps) {
  const [activeTab, setActiveTab] = useState<"candidato" | "analista">("candidato");
  const [showCandidateEdit, setShowCandidateEdit] = useState(false);

  const [formData, setFormData] = useState({
    // Sección A: Candidato
    empresa: workHistoryItem?.empresa || "",
    puesto: workHistoryItem?.puesto || "",
    fechaInicio: workHistoryItem?.fechaInicio || "",
    fechaFin: workHistoryItem?.fechaFin || "",
    tiempoTrabajado: workHistoryItem?.tiempoTrabajado || "",

    // Sección B: Analista
    empresaVerificada: workHistoryItem?.investigacionDetalle?.empresa?.nombreComercial || "",
    puestoVerificado: workHistoryItem?.investigacionDetalle?.puesto?.puestoFinal || "",
    causalSalidaRH: workHistoryItem?.causalSalidaRH || "",
    causalSalidaJefeInmediato: workHistoryItem?.causalSalidaJefeInmediato || "",
    observaciones: workHistoryItem?.observaciones || "",
    tiempoTrabajadoEmpresa: workHistoryItem?.tiempoTrabajadoEmpresa || "",
    estatusInvestigacion: workHistoryItem?.estatusInvestigacion || "en_revision",
    comentarioInvestigacion: workHistoryItem?.comentarioInvestigacion || "",
  });

  const handleSave = async () => {
    const payload = {
      ...workHistoryItem,
      empresa: formData.empresa,
      puesto: formData.puesto,
      fechaInicio: formData.fechaInicio,
      fechaFin: formData.fechaFin,
      tiempoTrabajado: formData.tiempoTrabajado,
      causalSalidaRH: formData.causalSalidaRH,
      causalSalidaJefeInmediato: formData.causalSalidaJefeInmediato,
      observaciones: formData.observaciones,
      tiempoTrabajadoEmpresa: formData.tiempoTrabajadoEmpresa,
      estatusInvestigacion: formData.estatusInvestigacion,
      comentarioInvestigacion: formData.comentarioInvestigacion,
      capturadoPor: "analista", // ← NUEVO: Marcar que analista editó
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
    onOpenChange(false);
  };

  const CAUSALES_SALIDA = [
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
  ];

  const ESTATUS_INVESTIGACION = ["en_revision", "revisado", "terminado"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" aria-describedby="review-desc">
        <DialogHeader>
          <DialogTitle>
            Revisar y Completar — {formData.empresa || "Sin empresa"}
          </DialogTitle>
        </DialogHeader>
        <p id="review-desc" className="sr-only">
          Dialog para revisar datos del candidato y completar verificación.
        </p>

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
                <Label>Fecha de Inicio</Label>
                <Input
                  type="text"
                  placeholder="YYYY-MM o YYYY"
                  value={formData.fechaInicio}
                  onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                  disabled={!showCandidateEdit}
                  className={!showCandidateEdit ? "bg-gray-50" : ""}
                />
              </div>

              <div>
                <Label>Fecha de Fin</Label>
                <Input
                  type="text"
                  placeholder="YYYY-MM o YYYY"
                  value={formData.fechaFin}
                  onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
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

              <div>
                <Label htmlFor="estatus">Estatus de verificación</Label>
                <select
                  id="estatus"
                  value={formData.estatusInvestigacion}
                  onChange={(e) => setFormData({ ...formData, estatusInvestigacion: e.target.value })}
                  className="mt-1 block w-full border rounded-md h-10 px-3 bg-white"
                >
                  <option value="en_revision">En revisión</option>
                  <option value="revisado">Revisado</option>
                  <option value="terminado">Terminado</option>
                </select>
              </div>

              <div>
                <Label htmlFor="resultado">Resultado</Label>
                <select
                  id="resultado"
                  className="mt-1 block w-full border rounded-md h-10 px-3 bg-white"
                >
                  <option value="">Pendiente</option>
                  <option value="recomendable">Recomendable</option>
                  <option value="con_reservas">Con reservas</option>
                  <option value="no_recomendable">No recomendable</option>
                </select>
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
            disabled={isPending}
          >
            {isPending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
