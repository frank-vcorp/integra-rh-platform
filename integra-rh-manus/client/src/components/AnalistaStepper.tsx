/**
 * @file AnalistaStepper.tsx
 * @description Wizard de 5 pasos para el flujo guiado del analista.
 * IMPL-20260311-01 | SPEC-003-CAPTURA-ANALISTA-REORDEN
 * Layout visual demo — No modifica lógica de guardado en base de datos.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Inbox,
  FolderOpen,
  PhoneCall,
  Home,
  Scale,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import RecepcionValidacion from "@/pages/proceso-steps/RecepcionValidacion";
import VerificacionBurocratica from "@/pages/proceso-steps/VerificacionBurocratica";
import InvestigacionLaboralActiva from "@/pages/proceso-steps/InvestigacionLaboralActiva";
import VisitaYEntornoCampo from "@/pages/proceso-steps/VisitaYEntornoCampo";
import DictamenConsolidado from "@/pages/proceso-steps/DictamenConsolidado";

interface Props {
  process: any;
}

const PASOS = [
  {
    id: 0,
    titulo: "Recepción",
    descripcion: "Validación inicial",
    icono: Inbox,
    color: "text-blue-600",
    bg: "bg-blue-100",
    bgActive: "bg-blue-600",
  },
  {
    id: 1,
    titulo: "Documental",
    descripcion: "IMSS / Buró / Penales",
    icono: FolderOpen,
    color: "text-purple-600",
    bg: "bg-purple-100",
    bgActive: "bg-purple-600",
  },
  {
    id: 2,
    titulo: "Laboral",
    descripcion: "Referencias activas",
    icono: PhoneCall,
    color: "text-amber-600",
    bg: "bg-amber-100",
    bgActive: "bg-amber-600",
  },
  {
    id: 3,
    titulo: "Entorno",
    descripcion: "Visita domiciliaria",
    icono: Home,
    color: "text-green-600",
    bg: "bg-green-100",
    bgActive: "bg-green-600",
  },
  {
    id: 4,
    titulo: "Dictamen",
    descripcion: "Cierre y entrega",
    icono: Scale,
    color: "text-rose-600",
    bg: "bg-rose-100",
    bgActive: "bg-rose-600",
  },
] as const;

const COMPONENTES = [
  RecepcionValidacion,
  VerificacionBurocratica,
  InvestigacionLaboralActiva,
  VisitaYEntornoCampo,
  DictamenConsolidado,
];

export default function AnalistaStepper({ process }: Props) {
  const [pasoActual, setPasoActual] = useState(0);
  const progreso = ((pasoActual) / (PASOS.length - 1)) * 100;
  const ComponentePaso = COMPONENTES[pasoActual];

  return (
    <div className="space-y-6">
      {/* ── Barra de progreso superior ── */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Paso {pasoActual + 1} de {PASOS.length}</span>
          <span>{Math.round(progreso)}% completado</span>
        </div>
        <Progress value={progreso} className="h-2" />
      </div>

      {/* ── Indicadores de pasos ── */}
      <nav aria-label="Progreso del flujo analista">
        <ol className="flex items-start justify-between gap-1 sm:gap-2">
          {PASOS.map((paso, idx) => {
            const Icono = paso.icono;
            const esActual = idx === pasoActual;
            const esCompletado = idx < pasoActual;

            return (
              <li
                key={paso.id}
                className="flex flex-1 flex-col items-center gap-1.5 cursor-pointer"
                onClick={() => setPasoActual(idx)}
                title={`Ir a: ${paso.titulo}`}
              >
                <div
                  className={cn(
                    "relative flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all",
                    esCompletado
                      ? "border-transparent bg-primary text-primary-foreground"
                      : esActual
                      ? `border-current ${paso.color} ${paso.bg}`
                      : "border-muted bg-background text-muted-foreground"
                  )}
                >
                  {esCompletado ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icono className="h-4 w-4" />
                  )}
                  {/* Conector entre pasos */}
                  {idx < PASOS.length - 1 && (
                    <div
                      className={cn(
                        "absolute left-full top-1/2 h-0.5 w-full -translate-y-1/2 transition-colors",
                        esCompletado ? "bg-primary" : "bg-muted"
                      )}
                      style={{ width: "calc(100% + 0.5rem)" }}
                    />
                  )}
                </div>
                <div className="text-center hidden sm:block">
                  <p className={cn("text-xs font-medium leading-none", esActual ? paso.color : "text-muted-foreground")}>
                    {paso.titulo}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                    {paso.descripcion}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* ── Separador ── */}
      <div className="border-t" />

      {/* ── Contenido del paso activo ── */}
      <div className="min-h-[320px]">
        <ComponentePaso process={process} />
      </div>

      {/* ── Navegación ── */}
      <div className="flex items-center justify-between border-t pt-4">
        <Button
          variant="outline"
          size="sm"
          disabled={pasoActual === 0}
          onClick={() => setPasoActual((p) => Math.max(0, p - 1))}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Atrás
        </Button>

        <span className="text-sm text-muted-foreground font-medium">
          {PASOS[pasoActual].titulo} — {PASOS[pasoActual].descripcion}
        </span>

        <Button
          size="sm"
          disabled={pasoActual === PASOS.length - 1}
          onClick={() => setPasoActual((p) => Math.min(PASOS.length - 1, p + 1))}
        >
          Siguiente
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
