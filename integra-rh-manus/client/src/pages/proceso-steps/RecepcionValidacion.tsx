/**
 * @file RecepcionValidacion.tsx
 * @description Paso 1: Recepción y Validación del proceso entrante.
 * IMPL-20260311-01 | SPEC-003-CAPTURA-ANALISTA-REORDEN
 * SKELETON — Solo layout visual. Lógica de guardado en ProcesoDetalle.tsx.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Inbox, Building2, User, FileCheck } from "lucide-react";

interface Props {
  process: any;
}

export default function RecepcionValidacion({ process }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="bg-blue-100 text-blue-700 rounded-full p-2 mt-0.5">
          <Inbox className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Paso 1: Recepción y Validación</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Confirma que el proceso fue recibido correctamente y que los datos del candidato y cliente están completos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Entorno del Proceso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Clave</span>
              <span className="font-medium">{process?.clave ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo de proceso</span>
              <Badge variant="outline">{process?.tipoProducto ?? "—"}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge>{process?.status ?? "—"}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Candidato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nombre</span>
              <span className="font-medium">{process?.candidatoNombre ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID Candidato</span>
              <span className="font-mono text-xs">{process?.candidatoId ?? "—"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex items-center gap-3 py-4">
          <FileCheck className="h-5 w-5 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground italic">
            <strong>Próximamente:</strong> Checklist de validación de datos mínimos, medio de recepción y asignación de analista responsable.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
