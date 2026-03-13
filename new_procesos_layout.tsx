        <TabsContent value="procesos" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Columna Principal: Procesos */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex items-center justify-between flex-row">
                  <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5"/> Procesos
                  </CardTitle>
                  <div className="flex gap-2">
                    {!isClientAuth && (
                      <Button size="sm" onClick={() => setCreateProcessOpen(true)}>
                        <Plus className="h-4 w-4 mr-2"/> Crear Proceso
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {procesos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin procesos</p>
                  ) : (
                    <div className="space-y-2">
                      {procesos.map((p:any) => (
                        <div key={p.id} className="border rounded p-3 bg-white shadow-sm space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{p.clave} — {p.tipoProducto}</div>
                              <div className="text-xs text-muted-foreground flex gap-2 flex-wrap">
                                <span>Estatus: {p.estatusProceso}</span>
                                {p.estatusVisual && <span>• Estatus visual: {p.estatusVisual}</span>}
                                {p.fechaCierre && <span>• Cierre: {new Date(p.fechaCierre).toLocaleDateString()}</span>}
                              </div>
                            </div>
                            <Link href={`/procesos/${p.id}`}>
                              <Button size="sm" variant="outline">Ver</Button>
                            </Link>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-muted-foreground">
                            <div className="border rounded p-2">
                              <div className="font-semibold text-gray-900 text-sm">Especialista</div>
                              <div>{p.especialistaAtraccionNombre || "Sin asignar"}</div>
                            </div>
                            <div className="border rounded p-2">
                              <div className="font-semibold text-gray-900 text-sm">Investigación Legal</div>
                              <div>{p.investigacionLegal?.antecedentes || "Sin datos"}</div>
                              {p.investigacionLegal?.flagRiesgo && <div className="text-red-600 font-semibold">Con riesgo</div>}
                            </div>
                            <div className="border rounded p-2">
                              <div className="font-semibold text-gray-900 text-sm">Buró de Crédito</div>
                              <div>{p.buroCredito?.estatus || "Sin datos"}</div>
                              {p.buroCredito?.score && <div>Score: {p.buroCredito.score}</div>}
                            </div>
                            <div className="border rounded p-2 md:col-span-3">
                              <div className="font-semibold text-gray-900 text-sm">Visita</div>
                              <div className="flex gap-2 flex-wrap">
                                <span>Tipo: {p.visitaDetalle?.tipo || "Sin datos"}</span>
                                {p.visitaDetalle?.fechaRealizacion && <span>• {new Date(p.visitaDetalle.fechaRealizacion).toLocaleDateString()}</span>}
                                {p.visitaDetalle?.comentarios && <span className="text-gray-700">• {p.visitaDetalle.comentarios}</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Columna Lateral: Visitas */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5"/> Visitas domiciliarias
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const visitas = (procesos || []).filter((p:any)=> p.visitStatus && (p.visitStatus.status || p.visitStatus.scheduledDateTime));
                    if (visitas.length === 0) {
                      return <p className="text-sm text-muted-foreground">Sin visitas asignadas</p>;
                    }
                    const surv = (surveyors as any).data || [];
                    const nombreEncuestador = (id?: number) => (surv.find((s:any)=> s.id===id)?.nombre) || '-';
                    return (
                      <div className="space-y-2">
                        {visitas.map((p:any)=> (
                          <div key={p.id} className="border rounded p-2 flex items-center justify-between bg-white text-sm">
                            <div>
                            <div className="font-medium flex items-center gap-2 text-xs">
                              {p.clave}
                              <span className="text-[10px] bg-slate-100 px-1 rounded border">{p.tipoProducto}</span>
                            </div>
                              <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                <div><span className="font-semibold">Estatus:</span> {p.visitStatus?.status || 'no_asignada'}</div>
                                {p.visitStatus?.scheduledDateTime && <div>📅 {new Date(p.visitStatus.scheduledDateTime).toLocaleString()}</div>}
                                {p.visitStatus?.encuestadorId && <div>👤 {nombreEncuestador(p.visitStatus.encuestadorId)}</div>}
                                {p.visitStatus?.direccion && <div className="truncate w-40" title={p.visitStatus.direccion}>📍 {p.visitStatus.direccion}</div>}
                              </div>
                            </div>
                            <Link href={`/procesos/${p.id}`}>
                              <Button size="icon" variant="ghost" className="h-6 w-6"><ExternalLink className="h-3 w-3"/></Button>
                            </Link>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Sheet para Crear Proceso */}
          <Sheet open={createProcessOpen} onOpenChange={setCreateProcessOpen}>
            <SheetContent className="sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Crear nuevo proceso</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                {!candidate?.clienteId ? (
                  <div className="text-sm text-red-600 bg-red-50 p-4 rounded border border-red-200">
                    Este candidato no tiene un cliente asignado. Asigna un cliente para poder crear un proceso.
                  </div>
                ) : (
                  <form id="form-crear-proceso" className="space-y-4" onSubmit={(e)=>{
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget as HTMLFormElement);
                    const puestoId = parseInt(String(fd.get('puestoId')||'0'));
                    const tipoProducto = String(fd.get('tipoProducto')||'');
                    const medioDeRecepcion = (fd.get('medioDeRecepcion') as string) || undefined;
                    if (!puestoId || !tipoProducto) { toast.error('Completa los campos obligatorios'); return; }
                    createProcessMutation.mutate({
                      candidatoId: candidateId,
                      clienteId: candidate!.clienteId!,
                      puestoId,
                      tipoProducto: tipoProducto as any,
                      medioDeRecepcion: medioDeRecepcion as any,
                    } as any);
                  }}>
                    <div>
                      <Label>Cliente</Label>
                      <div className="mt-1 text-sm font-medium bg-slate-100 p-2 rounded">{candidate.clienteId} — (asignado)</div>
                    </div>
                    <div>
                      <Label htmlFor="medioDeRecepcion">¿Cómo llegó el proceso?</Label>
                      <select id="medioDeRecepcion" name="medioDeRecepcion" className="mt-1 block w-full border rounded-md h-8 px-2 text-xs bg-white">
                        <option value="">Selecciona una opción</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="correo">Correo</option>
                        <option value="telefono">Teléfono</option>
                        <option value="boca_a_boca">Boca a boca</option>
                        <option value="portal">Portal</option>
                        <option value="presencial">Presencial</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="puestoId">Puesto</Label>
                      <select id="puestoId" name="puestoId" className="mt-1 block w-full border rounded-md h-8 px-2 text-xs bg-white" required>
                        <option value="">Selecciona un puesto</option>
                        {(postsByClient.data || []).map((p:any)=> (
                          <option key={p.id} value={p.id}>{p.nombreDelPuesto}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="tipoProducto">Proceso a realizar</Label>
                      <select id="tipoProducto" name="tipoProducto" className="mt-1 block w-full border rounded-md h-8 px-2 text-xs bg-white" required>
                        <option value="">Selecciona tipo</option>
                        <option value="ese_completo">ESE Completo</option>
                        <option value="ese_parcial">ESE Parcial</option>
                        <option value="visita_domiciliaria">Visita Domiciliaria</option>
                        <option value="referencias">Solo Referencias</option>
                        <option value="legal">Solo Legal</option>
                        <option value="buro">Solo Buró</option>
                        <option value="medico">Médico</option>
                        <option value="toxicologico">Antidoping</option>
                        <option value="psicometria">Psicometría</option>
                      </select>
                    </div>
                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                      <Button type="button" variant="outline" onClick={()=>setCreateProcessOpen(false)}>Cancelar</Button>
                      <Button type="submit" disabled={createProcessMutation.isPending}>
                        {createProcessMutation.isPending ? <span className="animate-spin mr-2">⏳</span> : <Plus className="h-4 w-4 mr-2"/>}
                        Crear proceso
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </TabsContent>
