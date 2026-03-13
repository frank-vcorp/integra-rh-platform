const fs = require('fs');

let content = fs.readFileSync('src/pages/CandidatoDetalle.tsx', 'utf8');

// Eliminar Comentarios Card
const commentStart = content.indexOf('{/* Comentarios (ubicado al final por solicitud del usuario) */}');
const closeTab = content.indexOf('</TabsContent>', commentStart);
content = content.substring(0, commentStart) + content.substring(closeTab);

// Reemplazar la forma de Crear Proceso de Card a Sheet
let crearProcesoRegex = /{createProcessOpen && !isClientAuth && \([\s\S]*?<\/Card>\n\s*\)}/m;

const sheetCrearProceso = `
      {/* Drawer Crear Proceso */}
      <Sheet open={createProcessOpen} onOpenChange={setCreateProcessOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md w-full p-6">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Crear nuevo proceso
            </SheetTitle>
            <SheetDescription>
              Abre un nuevo proceso de investigación o evaluación para este candidato.
            </SheetDescription>
          </SheetHeader>

          {!candidate?.clienteId ? (
            <div className="text-sm bg-red-50 text-red-600 rounded-md p-3 border border-red-100">
              Este candidato no tiene un cliente asignado. Asigna un cliente primero en la pestaña Perfil.
            </div>
          ) : (
            <form id="form-crear-proceso" className="space-y-4" onSubmit={(e)=>{
              e.preventDefault();
              const fd = new FormData(e.currentTarget as HTMLFormElement);
              const puestoId = parseInt(String(fd.get('puestoId')||'0'));
              const tipoProducto = String(fd.get('tipoProducto')||'');
              const medioDeRecepcion = (fd.get('medioDeRecepcion') as string) || undefined;
              if (!puestoId || !tipoProducto) { toast.error('Completa los campos obligatorios'); return; }
              const payload = {
                candidatoId: parseInt(id!),
                puestoId,
                clienteId: candidate.clienteId,
                tipoProducto,
                medioDeRecepcion,
                estatusValidador: "PENDIENTE",
                fechaSolicitud: new Date().toISOString()
              };
              createProcessMutation.mutate(payload);
            }}>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-500 uppercase">Puesto destino</Label>
                <Select name="puestoId" required>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecciona un puesto" />
                  </SelectTrigger>
                  <SelectContent>
                    {(puestos||[]).filter(p=>p.clienteId === candidate.clienteId).map(p=>(
                      <SelectItem key={p.id} value={String(p.id)} className="text-xs">{p.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-500 uppercase">Servicio a realizar</Label>
                <Select name="tipoProducto" required>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecciona el servicio" />
                  </SelectTrigger>
                  <SelectContent>
                     {(() => {
                        const types = ["SOCIOECONOMICO", "LABORAL", "PSICOMETRIA", "POLIGRAFO"];
                        return types.map(t=>(
                          <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                        ));
                     })()}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-500 uppercase">Medio de Recepción</Label>
                <Select name="medioDeRecepcion">
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Ej. PLATAFORMA" />
                  </SelectTrigger>
                  <SelectContent>
                    {["PLATAFORMA","CORREO ELECTRONICO","WHATSAPP","OTRO"].map(m=>(
                      <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 mt-8 pt-4 border-t">
                <Button type="button" variant="outline" size="sm" onClick={()=>setCreateProcessOpen(false)}>Cancelar</Button>
                <Button type="submit" size="sm" disabled={createProcessMutation.isPending}>Abrir Proceso</Button>
              </div>
            </form>
          )}
        </SheetContent>
      </Sheet>
`;

content = content.replace(crearProcesoRegex, sheetCrearProceso);
fs.writeFileSync('src/pages/CandidatoDetalle.tsx', content);

