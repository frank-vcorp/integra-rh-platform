/**
 * @file DictamenConsolidado.tsx
 * @description Paso 5: Dictamen consolidado — IA + revisión experta del analista.
 * IMPL-20260311-01 | SPEC-003-CAPTURA-ANALISTA-REORDEN
 * SKELETON — Solo layout visual. Lógica de guardado en ProcesoDetalle.tsx.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale, Sparkles, FileText, CheckCircle2 } from "lucide-react";

interface Props {
  process: any;
}

export default function DictamenConsolidado({ process: _process }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="bg-rose-100 text-rose-700 rounded-full p-2 mt-0.5">
          <Scale className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Paso 5: Dictamen Consolidado</h2>
          <p className="text-sm text-muted-foreground mt-1">
            La IA procesa los módulos verificados y genera una pre-sugerencia. El analista valida, ajusta y aprueba el dictamen final para el cliente.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-800">
              <Sparkles className="h-4 w-4" />
              Pre-análisis por IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">En espera de datos</Badge>
            <p className="text-xs text-muted-foreground mt-3 italic">
              Resumen automático de hallazgos: laboral, documental y entorno. Incluye semáforo de riesgo y recomendación sugerida.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Dictamen del Analista
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-24 bg-muted/40 rounded-md flex items-center justify-center">
              <p className="text-xs text-muted-foreground italic text-center px-4">
                Área de texto: Evaluación experta, ajustes y conclusión final (Recomendado / No Recomendado / Condicionado)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            Cierre y Entrega al Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
            <div>
              <p className="text-sm font-medium">Reporte Final PDF</p>
              <p className="text-xs text-muted-foreground">Generación automática del informe ejecutivo</p>
            </div>
            <Badge variant="outline" className="text-xs">No disponible aún</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex items-center gap-3 py-4">
          <Scale className="h-5 w-5 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground italic">
            <strong>Próximamente:</strong> Integración con módulo de generación de dictamen por IA, panel de aprobación del analista y envío directo al cliente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
