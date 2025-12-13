import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const ACTION_OPTIONS = [
  "login",
  "logout",
  "create",
  "update",
  "delete",
  "assign_psychometrics",
  "client_link_created",
  "client_link_access",
];

export default function UsuariosRegistros() {
  const [actionFilter, setActionFilter] = useState<string>("");
  const [entityFilter, setEntityFilter] = useState<string>("");

  const { data: logs = [], isLoading, refetch } = trpc.audit.list.useQuery(
    { limit: 200, action: actionFilter || undefined, entityType: entityFilter || undefined },
    { refetchOnWindowFocus: false }
  );

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Registros de actividad</CardTitle>
          <div className="flex gap-2 items-center">
            <Select
              value={actionFilter}
              onValueChange={(v) => setActionFilter(v === "all" ? "" : v)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las acciones</SelectItem>
                {ACTION_OPTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Filtrar por entidad (ej. candidate)"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="w-64"
            />
            <Button size="sm" variant="outline" onClick={handleRefresh}>
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              Cargando registros...
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              No hay registros que coincidan con los filtros.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead>Detalle</TableHead>
                  <TableHead>Req ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {log.timestamp
                        ? new Date(log.timestamp).toLocaleString()
                        : "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {log.userName || log.userEmail || log.actorType}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {log.action}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {log.entityType}
                      {log.entityId ? ` #${log.entityId}` : ""}
                    </TableCell>
                    <TableCell className="text-xs max-w-sm">
                      <pre className="whitespace-pre-wrap break-words text-[10px] bg-muted/60 rounded p-1">
                        {log.details ? JSON.stringify(log.details, null, 2) : "-"}
                      </pre>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-[10px]">
                      {log.requestId || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
