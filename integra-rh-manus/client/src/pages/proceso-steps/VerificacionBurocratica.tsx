/**
 * @file VerificacionBurocratica.tsx
 * @description Paso 2: Verificación Documental de Escritorio (Doc/Desk).
 * IMPL-20260311-01 | SPEC-003-CAPTURA-ANALISTA-REORDEN
 * SKELETON — Solo layout visual. Lógica de guardado en ProcesoDetalle.tsx.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, BriefcaseBusiness, ShieldAlert, CreditCard } from "lucide-react";

interface Props {
  process: any;
}

export default function VerificacionBurocratica({ process: _process }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="bg-purple-100 text-purple-700 rounded-full p-2 mt-0.5">
          <FolderOpen className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Paso 2: Verificación Documental</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Trabajo de escritorio: consulta de semanas cotizadas, buró de crédito y antecedentes penales.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BriefcaseBusiness className="h-4 w-4 text-muted-foreground" />
              Semanas IMSS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="text-xs">Pendiente</Badge>
            <p className="text-xs text-muted-foreground mt-3 italic">
              Captura de semanas cotizadas, NSS y resumen de historial IMSS.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              Buró de Crédito
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="text-xs">Pendiente</Badge>
            <p className="text-xs text-muted-foreground mt-3 italic">
              Resultado de consulta, score declarado y archivos adjuntos.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              Antecedentes Penales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="text-xs">Pendiente</Badge>
            <p className="text-xs text-muted-foreground mt-3 italic">
              Validación estatal/federal y evidencias gráficas.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex items-center gap-3 py-4">
          <FolderOpen className="h-5 w-5 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground italic">
            <strong>Próximamente:</strong> Formularios inline con carga de documentos, alertas automáticas por inconsistencias y resumen de semáforos por módulo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
