/**
 * @file VisitaYEntornoCampo.tsx
 * @description Paso 4: Visita Domiciliaria y Verificación del Entorno (Campo).
 * IMPL-20260311-01 | SPEC-003-CAPTURA-ANALISTA-REORDEN
 * SKELETON — Solo layout visual. Lógica de guardado en ProcesoDetalle.tsx.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home, Camera, UserCog, MapPin } from "lucide-react";

interface Props {
  process: any;
}

export default function VisitaYEntornoCampo({ process: _process }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="bg-green-100 text-green-700 rounded-full p-2 mt-0.5">
          <Home className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Paso 4: Visita y Entorno en Campo</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Asignación de encuestador, agendamiento de visita domiciliaria, registro fotográfico y validación de vivienda.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCog className="h-4 w-4 text-muted-foreground" />
              Encuestador Asignado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="text-xs">Sin asignar</Badge>
            <p className="text-xs text-muted-foreground mt-3 italic">
              Selección de encuestador y fecha/hora de visita agendada.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Dirección de Visita
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-12 bg-muted/40 rounded-md flex items-center justify-center">
              <p className="text-xs text-muted-foreground italic">Dirección del candidato (desde perfil)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-4 w-4 text-muted-foreground" />
            Evidencias y Resultado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-28 border-2 border-dashed border-muted rounded-md flex flex-col items-center justify-center gap-2">
            <Camera className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground italic">
              Galería de fotos de la visita (pendiente)
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex items-center gap-3 py-4">
          <Home className="h-5 w-5 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground italic">
            <strong>Próximamente:</strong> Integración con módulo de Visitas, galería de fotos, mapa de ubicación y calificación del entorno socioeconómico.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
