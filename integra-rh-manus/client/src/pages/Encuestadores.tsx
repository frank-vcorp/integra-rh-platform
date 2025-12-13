import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Plus, UserCheck, Pencil, Trash2, Phone, Eye } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useHasPermission } from "@/_core/hooks/usePermission";

export default function Encuestadores() {
  const { user } = useAuth();
  const isClient = user?.role === "client";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSurveyor, setEditingSurveyor] = useState<any>(null);
  const [selectedActivo, setSelectedActivo] = useState<boolean>(true);
  const [cobertura, setCobertura] = useState<'local'|'foraneo'|'ambos'>('local');
  const [ciudadBase, setCiudadBase] = useState('');
  const [estadosCobertura, setEstadosCobertura] = useState(''); // CSV simple
  const [radioKm, setRadioKm] = useState<string>('');
  const [vehiculo, setVehiculo] = useState<boolean>(false);
  const [tarifaLocal, setTarifaLocal] = useState<string>('');
  const [tarifaForanea, setTarifaForanea] = useState<string>('');
  const [notas, setNotas] = useState<string>('');

  const { data: surveyors = [], isLoading } = trpc.surveyors.list.useQuery();
  const { data: processes = [] } = trpc.processes.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.surveyors.create.useMutation({
    onSuccess: () => {
      utils.surveyors.list.invalidate();
      setDialogOpen(false);
      toast.success("Encuestador creado exitosamente");
    },
    onError: (error) => {
      toast.error("Error al crear encuestador: " + error.message);
    },
  });

  const updateMutation = trpc.surveyors.update.useMutation({
    onSuccess: () => {
      utils.surveyors.list.invalidate();
      setDialogOpen(false);
      setEditingSurveyor(null);
      toast.success("Encuestador actualizado exitosamente");
    },
    onError: (error) => {
      toast.error("Error al actualizar encuestador: " + error.message);
    },
  });

  const deleteMutation = trpc.surveyors.delete.useMutation({
    onSuccess: () => {
      utils.surveyors.list.invalidate();
      toast.success("Encuestador eliminado");
    },
    onError: (error) => {
      toast.error("Error al eliminar: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      nombre: formData.get("nombre") as string,
      telefono: formData.get("telefono") as string || undefined,
      email: formData.get("email") as string || undefined,
      cobertura,
      ciudadBase: ciudadBase || undefined,
      estadosCobertura: estadosCobertura ? estadosCobertura.split(',').map(s=>s.trim()).filter(Boolean) : undefined,
      radioKm: radioKm ? parseInt(radioKm) : undefined,
      vehiculo,
      tarifaLocal: tarifaLocal ? Math.round(parseFloat(tarifaLocal) * 100) : undefined,
      tarifaForanea: tarifaForanea ? Math.round(parseFloat(tarifaForanea) * 100) : undefined,
      notas: notas || undefined,
      activo: selectedActivo,
    };

    if (editingSurveyor) {
      updateMutation.mutate({ id: editingSurveyor.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (surveyor: any) => {
    setEditingSurveyor(surveyor);
    setSelectedActivo(surveyor.activo);
    setCobertura(surveyor.cobertura ?? 'local');
    setCiudadBase(surveyor.ciudadBase ?? '');
    setEstadosCobertura(((surveyor.estadosCobertura as string[] | undefined)?.join(', ')) ?? '');
    setRadioKm(surveyor.radioKm != null ? String(surveyor.radioKm) : '');
    setVehiculo(Boolean(surveyor.vehiculo));
    setTarifaLocal(surveyor.tarifaLocal != null ? (surveyor.tarifaLocal/100).toFixed(2) : '');
    setTarifaForanea(surveyor.tarifaForanea != null ? (surveyor.tarifaForanea/100).toFixed(2) : '');
    setNotas(surveyor.notas ?? '');
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Seguro que deseas eliminar este encuestador? Esta acción no se puede deshacer.")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleToggleActive = (surveyor: any) => {
    const next = !surveyor.activo;
    if (!next && !confirm("¿Desactivar este encuestador?")) return;
    updateMutation.mutate({ id: surveyor.id, data: { activo: next } });
    if (next) toast.success("Encuestador activado");
    else toast.success("Encuestador desactivado");
  };

  const handleOpenDialog = () => {
    setEditingSurveyor(null);
    setSelectedActivo(true);
    setDialogOpen(true);
  };

  const canCreateSurveyor = useHasPermission("encuestadores", "create");
  const canEditSurveyor = useHasPermission("encuestadores", "edit");
  const canDeleteSurveyor = useHasPermission("encuestadores", "delete");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Encuestadores</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los encuestadores del sistema
          </p>
        </div>
        {!isClient && canCreateSurveyor && (
          <Button onClick={handleOpenDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Encuestador
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Lista de Encuestadores
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Consulta disponibilidad y datos clave de los encuestadores de campo.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {surveyors.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay encuestadores registrados</p>
              {canCreateSurveyor && (
                <Button onClick={handleOpenDialog} variant="outline" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primer encuestador
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Escritorio: tabla */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Visitas</TableHead>
                      <TableHead>Comentarios</TableHead>
                      <TableHead>Cobertura</TableHead>
                      <TableHead>Base</TableHead>
                      <TableHead>Estatus</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {surveyors.map((surveyor) => (
                      <TableRow key={surveyor.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/encuestadores/${surveyor.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {surveyor.nombre}
                          </Link>
                        </TableCell>
                        <TableCell>{surveyor.telefono || "-"}</TableCell>
                        <TableCell>{surveyor.email || "-"}</TableCell>
                        <TableCell className="text-xs">
                          {(() => {
                            const visits = (processes as any[]).filter(
                              (p: any) =>
                                p.visitStatus &&
                                p.visitStatus.encuestadorId === surveyor.id,
                            );
                            if (visits.length === 0)
                              return (
                                <span className="text-muted-foreground">
                                  —
                                </span>
                              );
                            const upcoming = visits
                              .filter(
                                (v: any) =>
                                  v.visitStatus?.scheduledDateTime,
                              )
                              .sort(
                                (a: any, b: any) =>
                                  new Date(
                                    a.visitStatus.scheduledDateTime,
                                  ).getTime() -
                                  new Date(
                                    b.visitStatus.scheduledDateTime,
                                  ).getTime(),
                              )[0];
                            return (
                              <span>
                                {visits.length}{" "}
                                {visits.length === 1 ? "visita" : "visitas"}
                                {upcoming
                                  ? ` • Próx: ${new Date(
                                      upcoming.visitStatus
                                        .scheduledDateTime,
                                    ).toLocaleString()}`
                                  : ""}
                              </span>
                            );
                          })()}
                        </TableCell>
                        <TableCell
                          className="max-w-xs truncate"
                          title={(surveyor as any).notas || ""}
                        >
                          {(surveyor as any).notas || "—"}
                        </TableCell>
                        <TableCell>{surveyor.cobertura || "local"}</TableCell>
                        <TableCell>{surveyor.ciudadBase || "-"}</TableCell>
                        <TableCell>
                          <span
                            className={`badge ${
                              surveyor.activo
                                ? "badge-success"
                                : "badge-neutral"
                            }`}
                          >
                            {surveyor.activo ? "Activo" : "Inactivo"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {surveyor.telefono && (
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label="WhatsApp"
                                onClick={() => {
                                  const digits = String(
                                    surveyor.telefono,
                                  ).replace(/[^0-9+]/g, "");
                                  const msg = `Hola ${surveyor.nombre}, me contacto de Integra RH.`;
                                  const url = `https://api.whatsapp.com/send?phone=${encodeURIComponent(
                                    digits,
                                  )}&text=${encodeURIComponent(msg)}`;
                                  window.open(url, "_blank");
                                }}
                              >
                                <Phone className="h-4 w-4" />
                              </Button>
                            )}
                            <Link
                              href={`/encuestadores/${surveyor.id}?section=visitas`}
                            >
                              <Button variant="ghost" size="sm">
                                Ver
                              </Button>
                            </Link>
                            {!isClient && (canEditSurveyor || canDeleteSurveyor) && (
                              <>
                                {canEditSurveyor && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleToggleActive(surveyor)}
                                    >
                                      {surveyor.activo ? "Inactivar" : "Activar"}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEdit(surveyor)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                {canDeleteSurveyor && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(surveyor.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Móvil: tarjetas */}
              <div className="space-y-3 md:hidden">
                {surveyors.map((surveyor) => (
                  <div
                    key={surveyor.id}
                    className="rounded-lg border p-3 bg-white shadow-sm text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/encuestadores/${surveyor.id}`}
                          className="font-semibold text-sm text-blue-600"
                        >
                          {surveyor.nombre}
                        </Link>
                        <p className="text-[11px] text-muted-foreground">
                          {surveyor.ciudadBase || "Sin ciudad base"}
                        </p>
                      </div>
                      <span
                        className={`badge text-[10px] ${
                          surveyor.activo
                            ? "badge-success"
                            : "badge-neutral"
                        }`}
                      >
                        {surveyor.activo ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                    <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                      <div>
                        <span className="font-semibold">Tel: </span>
                        {surveyor.telefono || "-"}
                      </div>
                      <div>
                        <span className="font-semibold">Email: </span>
                        {surveyor.email || "-"}
                      </div>
                      <div>
                        <span className="font-semibold">Cobertura: </span>
                        {surveyor.cobertura || "local"}
                      </div>
                      <div>
                        <span className="font-semibold">Comentarios: </span>
                        {(surveyor as any).notas || "—"}
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end gap-1">
                      {surveyor.telefono && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            const digits = String(
                              surveyor.telefono,
                            ).replace(/[^0-9+]/g, "");
                            const msg = `Hola ${surveyor.nombre}, me contacto de Integra RH.`;
                            const url = `https://api.whatsapp.com/send?phone=${encodeURIComponent(
                              digits,
                            )}&text=${encodeURIComponent(msg)}`;
                            window.open(url, "_blank");
                          }}
                        >
                          <Phone className="h-3 w-3" />
                        </Button>
                      )}
                      <Link
                        href={`/encuestadores/${surveyor.id}?section=visitas`}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </Link>
                      {!isClient && (canEditSurveyor || canDeleteSurveyor) && (
                        <>
                          {canEditSurveyor && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleToggleActive(surveyor)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleEdit(surveyor)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          {canDeleteSurveyor && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleDelete(surveyor.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      {!isClient && canEditSurveyor && (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSurveyor ? "Editar Encuestador" : "Nuevo Encuestador"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  name="nombre"
                  defaultValue={editingSurveyor?.nombre}
                  required
                />
              </div>
              <div>
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  name="telefono"
                  defaultValue={editingSurveyor?.telefono}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={editingSurveyor?.email}
                />
              </div>
              <div>
                <Label>Cobertura</Label>
                <select className="mt-1 block w-full border rounded-md h-9 px-2" value={cobertura} onChange={e=> setCobertura(e.target.value as any)}>
                  <option value="local">Local</option>
                  <option value="foraneo">Foránea</option>
                  <option value="ambos">Ambas</option>
                </select>
              </div>
              <div>
                <Label>Ciudad base</Label>
                <Input value={ciudadBase} onChange={e=> setCiudadBase(e.target.value)} placeholder="Ej. Monterrey, NL" />
              </div>
              <div>
                <Label>Estados de cobertura (CSV)</Label>
                <Input value={estadosCobertura} onChange={e=> setEstadosCobertura(e.target.value)} placeholder="Ej. NL, TAMPS, COAH" />
              </div>
              <div>
                <Label>Radio (km)</Label>
                <Input type="number" min="0" value={radioKm} onChange={e=> setRadioKm(e.target.value)} placeholder="Ej. 50" />
              </div>
              <div>
                <Label>Vehículo propio</Label>
                <div className="mt-1"><input type="checkbox" checked={vehiculo} onChange={e=> setVehiculo(e.target.checked)} /> <span className="text-sm">Sí</span></div>
              </div>
              <div>
                <Label>Tarifa local (MXN)</Label>
                <Input type="number" min="0" step="0.01" value={tarifaLocal} onChange={e=> setTarifaLocal(e.target.value)} placeholder="Ej. 500.00" />
              </div>
              <div>
                <Label>Tarifa foránea (MXN)</Label>
                <Input type="number" min="0" step="0.01" value={tarifaForanea} onChange={e=> setTarifaForanea(e.target.value)} placeholder="Ej. 800.00" />
              </div>
              <div className="col-span-2">
                <Label>Comentarios</Label>
                <Textarea value={notas} onChange={e=> setNotas(e.target.value)} placeholder="Información adicional (horarios, restricciones, etc.)" rows={3} />
              </div>
              <div className="col-span-2">
                <Label htmlFor="activo">Estatus</Label>
                <Select 
                  value={selectedActivo ? "true" : "false"} 
                  onValueChange={(v) => setSelectedActivo(v === "true")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Activo</SelectItem>
                    <SelectItem value="false">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setEditingSurveyor(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingSurveyor ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}
