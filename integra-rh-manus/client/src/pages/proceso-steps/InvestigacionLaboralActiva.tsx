/**
 * @file InvestigacionLaboralActiva.tsx
 * @description Paso 3: Investigación Laboral Activa — llamadas a referencias.
 * IMPL-20260311-01 | SPEC-003-CAPTURA-ANALISTA-REORDEN
 * SKELETON — Solo layout visual. Lógica de guardado en ProcesoDetalle.tsx.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhoneCall, ClipboardList, Star } from "lucide-react";

interface Props {
  process: any;
}

export default function InvestigacionLaboralActiva({ process: _process }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="bg-amber-100 text-amber-700 rounded-full p-2 mt-0.5">
          <PhoneCall className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Paso 3: Investigación Laboral Activa</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Contacto directo con empresas del historial laboral del candidato. Evaluación de desempeño y causal de salida.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-muted-foreground" />
              Referencias a Verificar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="text-xs">0 / 0 contactadas</Badge>
            <p className="text-xs text-muted-foreground mt-3 italic">
              Lista de empleos y jefes directos del historial laboral del candidato para llamar.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4 text-muted-foreground" />
              Matriz de Evaluación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="text-xs">Sin calificaciones</Badge>
            <p className="text-xs text-muted-foreground mt-3 italic">
              Calificación por empresa (Puntualidad, Actitud, Desempeño, Causal de salida, etc.).
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            Conclusión del Analista
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-muted/40 rounded-md flex items-center justify-center">
            <p className="text-sm text-muted-foreground italic">
              Campo de texto: Observaciones finales y recomendación (Sí/No/Condicionado)
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex items-center gap-3 py-4">
          <PhoneCall className="h-5 w-5 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground italic">
            <strong>Próximamente:</strong> Vista de historial laboral integrada, marcación de llamadas con resultado y calificación por eje de evaluación.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
