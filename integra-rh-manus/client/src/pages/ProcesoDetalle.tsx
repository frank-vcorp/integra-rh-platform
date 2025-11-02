import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, FileText, Save, FilePlus2, CalendarClock } from "lucide-react";
import { Link, useParams } from "wouter";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { useState } from "react";

export default function ProcesoDetalle() {
  const params = useParams();
  const processId = parseInt(params.id || "0");
  const { data: process, isLoading } = trpc.processes.getById.useQuery({ id: processId });
  const { isClientAuth } = useClientAuth();
  const utils = trpc.useUtils();
  const updateStatus = trpc.processes.updateStatus.useMutation({
    onSuccess: () => {
      utils.processes.getById.invalidate({ id: processId });
    }
  });
  const updateCalif = trpc.processes.updateCalificacion.useMutation({
    onSuccess: () => utils.processes.getById.invalidate({ id: processId }),
  });
  const genDictamen = trpc.processes.generarDictamen.useMutation({
    onSuccess: () => utils.processes.getById.invalidate({ id: processId }),
  });
  // Llamar hooks siempre en el mismo orden. Evitar condicionales.
  const { data: surveyors = [] } = trpc.surveyors.listActive.useQuery(undefined as any, {
    // initialData asegura data consistente mientras carga
    initialData: [],
  } as any);
  const visitAssign = trpc.processes.visitAssign.useMutation({ onSuccess: () => utils.processes.getById.invalidate({ id: processId }) });
  const visitSchedule = trpc.processes.visitSchedule.useMutation({ onSuccess: () => utils.processes.getById.invalidate({ id: processId }) });
  const visitUpdate = trpc.processes.visitUpdate.useMutation({ onSuccess: () => utils.processes.getById.invalidate({ id: processId }) });
  const visitDone = trpc.processes.visitMarkDone.useMutation({ onSuccess: () => utils.processes.getById.invalidate({ id: processId }) });
  const visitCancel = trpc.processes.visitCancel.useMutation({ onSuccess: () => utils.processes.getById.invalidate({ id: processId }) });
  const ESTATUS = [
    { value: 'en_recepcion', label: 'En recepción' },
    { value: 'asignado', label: 'Asignado' },
    { value: 'en_verificacion', label: 'En verificación' },
    { value: 'visita_programada', label: 'Visita programada' },
    { value: 'visita_realizada', label: 'Visita realizada' },
    { value: 'en_dictamen', label: 'En dictamen' },
    { value: 'finalizado', label: 'Finalizado' },
    { value: 'entregado', label: 'Entregado' },
  ];
  const CALIF = [
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'recomendable', label: 'Recomendable' },
    { value: 'con_reservas', label: 'Con reservas' },
    { value: 'no_recomendable', label: 'No recomendable' },
  ];
  const { data: clients = [] } = trpc.clients.list.useQuery();
  const { data: candidates = [] } = trpc.candidates.list.useQuery();
  const { data: posts = [] } = trpc.posts.list.useQuery();
  const { data: documents = [] } = trpc.documents.getByProcess.useQuery({ procesoId: processId });
  const createClientLink = trpc.clientAccess.create.useMutation({
    onSuccess: (res:any) => {
      const url = res.url;
      try { navigator.clipboard?.writeText(url); } catch {}
      toast.success('Enlace de acceso generado y copiado');
    },
    onError: (e:any)=> toast.error('Error: '+e.message)
  });
  const revokeClientLink = trpc.clientAccess.revoke.useMutation({
    onSuccess: () => {
      if (process?.clienteId) {
        utils.clientAccess.listActiveTokens.invalidate({ clientId: process.clienteId });
      }
      toast.success('Enlace revocado');
    },
  });
  const { data: activeTokens = [] } = trpc.clientAccess.listActiveTokens.useQuery(
    { clientId: process?.clienteId ?? 0 } as any,
    {
      enabled: Boolean(process?.clienteId),
      initialData: [],
    } as any
  );

  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const uploadProcessDoc = trpc.documents.upload.useMutation({
    onSuccess: () => {
      utils.documents.getByProcess.invalidate({ procesoId: processId });
      toast.success('Documento del proceso cargado');
    }
  });
  const deleteDoc = trpc.documents.delete.useMutation({
    onSuccess: () => utils.documents.getByProcess.invalidate({ procesoId: processId })
  });
  const { data: comments = [] } = trpc.processComments.getByProcess.useQuery({ procesoId: processId });
  const createComment = trpc.processComments.create.useMutation({
    onSuccess: () => {
      utils.processComments.getByProcess.invalidate({ procesoId: processId });
      setCommentOpen(false);
      (document.getElementById('form-proceso-comentario') as HTMLFormElement | null)?.reset();
      toast.success('Comentario agregado');
    },
    onError: (e:any) => toast.error('Error: '+e.message),
  });
  const [commentOpen, setCommentOpen] = useState(false);

  const findName = (id: number | null | undefined, arr: any[], field: string) => {
    if (!id) return "-";
    const item = arr.find(x => x.id === id);
    return item?.[field] || "-";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  if (!process) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Proceso no encontrado</p>
        <Link href="/procesos">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Volver a Procesos
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/procesos">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Proceso {process.clave}</h1>
          <p className="text-muted-foreground mt-1">Detalle del proceso</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Proceso a realizar</p>
              <p className="font-medium">{process.tipoProducto}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Medio de recepción</p>
              <p className="font-medium">{process.medioDeRecepcion || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Calificación final</p>
              <div className="flex items-center gap-2">
                <select id="calificacionFinal" defaultValue={process.calificacionFinal || 'pendiente'} className="border rounded-md h-9 px-2">
                  {CALIF.map(c => (<option key={c.value} value={c.value}>{c.label}</option>))}
                </select>
                <Button size="sm" disabled={updateCalif.isPending} onClick={()=>{
                  const el = document.getElementById('calificacionFinal') as HTMLSelectElement | null;
                  const v = (el?.value || 'pendiente') as any;
                  updateCalif.mutate({ id: processId, calificacionFinal: v });
                }}>
                  <Save className="h-4 w-4 mr-1"/> Guardar
                </Button>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estatus</p>
              <div className="flex items-center gap-2">
                <select
                  defaultValue={process.estatusProceso}
                  id="estatusProceso"
                  className="border rounded-md h-9 px-2"
                >
                  {ESTATUS.map(e => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  disabled={updateStatus.isPending}
                  onClick={() => {
                    const el = document.getElementById('estatusProceso') as HTMLSelectElement | null;
                    const value = el?.value || process.estatusProceso;
                    updateStatus.mutate({ id: processId, estatusProceso: value });
                  }}
                >
                  <Save className="h-4 w-4 mr-1"/> Guardar
                </Button>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cliente</p>
              <p className="font-medium">{findName(process.clienteId, clients, 'nombreEmpresa')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Candidato</p>
              <p className="font-medium">{findName(process.candidatoId, candidates, 'nombreCompleto')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Puesto</p>
              <p className="font-medium">{findName(process.puestoId, posts, 'nombreDelPuesto')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fecha Recepción</p>
              <p className="font-medium">{new Date(process.fechaRecepcion).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between flex-row">
          <CardTitle>Documentos</CardTitle>
          {process?.clienteId && !isClientAuth && (
            <>
              <Button size="sm" variant="outline" onClick={()=>{
                setEmailTo("");
                setEmailDialogOpen(true);
              }}>Generar enlace de acceso</Button>
              <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Enviar enlace de acceso al cliente</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="emailTo">Correo del cliente</Label>
                      <Input id="emailTo" type="email" value={emailTo} onChange={e=>setEmailTo(e.target.value)} placeholder="cliente@empresa.com" />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={()=>setEmailDialogOpen(false)}>Cancelar</Button>
                      <Button onClick={()=>{
                        const baseUrl = window.location.origin;
                        createClientLink.mutate({
                          clientId: process!.clienteId!,
                          procesoId: processId,
                          ttlDays: 14,
                          baseUrl,
                          sendEmailTo: emailTo || undefined,
                          emailContext: { claveProceso: process?.clave }
                        } as any);
                        setEmailDialogOpen(false);
                      }}>Generar y enviar</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </CardHeader>
        <CardContent>
          {!isClientAuth && (
          <form onSubmit={async (e)=>{
            e.preventDefault();
            const fd = new FormData(e.currentTarget as HTMLFormElement);
            const file = fd.get('file') as File | null;
            const tipo = (fd.get('tipoDocumento') as string) || 'OTRO';
            if (!file) return;
            const arrayBuf = await file.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuf)));
            uploadProcessDoc.mutate({ procesoId: processId, tipoDocumento: tipo, fileName: file.name, contentType: file.type || 'application/octet-stream', base64 } as any);
            (e.currentTarget as HTMLFormElement).reset();
          }} className="space-y-2 mb-4">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-sm text-muted-foreground" htmlFor="tipoDocumento">Tipo</label>
                <select name="tipoDocumento" id="tipoDocumento" className="mt-1 block w-full border rounded-md h-9 px-2">
                  <option value="DICTAMEN">Dictamen</option>
                  <option value="VISITA_EVIDENCIA">Evidencia de visita</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm text-muted-foreground" htmlFor="file">Archivo</label>
                <input type="file" name="file" id="file" className="mt-1 block w-full" required />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={uploadProcessDoc.isPending}>Subir</Button>
            </div>
          </form>
          )}

          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin documentos</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Archivo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((d:any) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.tipoDocumento}</TableCell>
                    <TableCell>
                      <a href={d.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600">
                        <FileText className="h-4 w-4"/> {d.nombreArchivo}
                      </a>
                    </TableCell>
                    <TableCell>{new Date(d.createdAt).toLocaleString()}</TableCell>
                    {!isClientAuth && (
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={()=> deleteDoc.mutate({ id: d.id })}>Eliminar</Button>
                      </TableCell>
                    )}
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




