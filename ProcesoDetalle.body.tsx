  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/procesos">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Proceso {process.clave}</h1>
          <p className="text-muted-foreground mt-1">Detalle del proceso - {process.tipoProducto}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Content (Cols 1-8) */}
        <div className="lg:col-span-8 space-y-6">
          <Tabs defaultValue="expediente" className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="expediente">Expediente</TabsTrigger>
              <TabsTrigger value="configuracion">Configuración</TabsTrigger>
              <TabsTrigger value="documentos">Documentos</TabsTrigger>
              <TabsTrigger value="observaciones">Observaciones</TabsTrigger>
            </TabsList>

            <TabsContent value="expediente" className="mt-4 space-y-6">
              
              {/* Bloque Investigacion Laboral */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-600"/> Investigación Laboral
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Resultado</Label>
                      <Input
                        value={panelForm.investigacionLaboral.resultado}
                        onChange={e => setPanelForm(f => ({ ...f, investigacionLaboral: { ...f.investigacionLaboral, resultado: e.target.value } }))}
                        disabled={isClientAuth || !canEditProcess}
                      />
                    </div>
                    <div className="flex items-end pb-2">
                      <div className="flex items-center gap-2 text-sm">
                        <input
                          id="invLabDone"
                          type="checkbox"
                          checked={panelForm.investigacionLaboral.completado}
                          onChange={e => setPanelForm(f => ({ ...f, investigacionLaboral: { ...f.investigacionLaboral, completado: e.target.checked } }))}
                          disabled={isClientAuth || !canEditProcess}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="invLabDone">Marcado como completo</Label>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Detalles</Label>
                      <Textarea
                        value={panelForm.investigacionLaboral.detalles}
                        onChange={e => setPanelForm(f => ({ ...f, investigacionLaboral: { ...f.investigacionLaboral, detalles: e.target.value } }))}
                        rows={3}
                        disabled={isClientAuth || !canEditProcess}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bloque Investigacion Legal */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Landmark className="h-5 w-5 text-indigo-600"/> Investigación Legal y Documental
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs">Antecedentes</Label>
                    <Input
                      value={panelForm.investigacionLegal.antecedentes}
                      onChange={e => setPanelForm(f => ({ ...f, investigacionLegal: { ...f.investigacionLegal, antecedentes: e.target.value } }))}
                      disabled={isClientAuth || !canEditProcess}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Notas periodísticas / búsqueda en medios</Label>
                    <Textarea
                      value={panelForm.investigacionLegal.notasPeriodisticas}
                      onChange={e => setPanelForm(f => ({ ...f, investigacionLegal: { ...f.investigacionLegal, notasPeriodisticas: e.target.value } }))}
                      rows={2}
                      disabled={isClientAuth || !canEditProcess}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      id="invLegalRiesgo"
                      type="checkbox"
                      checked={panelForm.investigacionLegal.flagRiesgo}
                      onChange={e => setPanelForm(f => ({ ...f, investigacionLegal: { ...f.investigacionLegal, flagRiesgo: e.target.checked } }))}
                      disabled={isClientAuth || !canEditProcess}
                      className="h-4 w-4 accent-red-600"
                    />
                    <Label htmlFor="invLegalRiesgo" className="text-red-700 font-medium">Con riesgo legal detectado</Label>
                  </div>
                  
                  {/* Evidencia Legal */}
                  <div className="mt-4 pt-4 border-t">
                    <Label className="text-xs font-semibold mb-2 block">Evidencia Gráfica (Pegar screenshots aquí)</Label>
                    <div
                      className="border-2 border-dashed rounded min-h-[80px] flex flex-col items-center justify-center p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                      tabIndex={0}
                      onPaste={async (e) => {
                        if (isClientAuth || !canEditProcess) return;
                        e.preventDefault();
                        const items = e.clipboardData.items;
                        let blob: File | null = null;
                        for (let i = 0; i < items.length; i++) {
                          if (items[i].type.indexOf("image") !== -1) {
                            blob = items[i].getAsFile();
                            break;
                          }
                        }
                        if (!blob) { toast.error("No hay imagen"); return; }
                        try {
                          toast.info("Subiendo...");
                          const arrayBuf = await blob.arrayBuffer();
                          let binary = '';
                          const bytes = new Uint8Array(arrayBuf);
                          for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
                          const base64 = btoa(binary);
                          const res = await uploadProcessDoc.mutateAsync({ procesoId: processId, tipoDocumento: 'EVIDENCIA_LEGAL', fileName: `paste-${Date.now()}.png`, contentType: blob.type, base64 } as any);
                          setPanelForm(curr => {
                            const newForm = { ...curr, investigacionLegal: { ...curr.investigacionLegal, evidenciasGraficas: [...(curr.investigacionLegal as any).evidenciasGraficas, res.url] } };
                            updatePanelDetail.mutate(getPanelPayload(newForm));
                            return newForm;
                          });
                          toast.success("OK");
                        } catch (err: any) { toast.error(err.message); }
                      }}
                    >
                      {(panelForm.investigacionLegal as any).evidenciasGraficas?.length > 0 ? (
                        <div className="grid grid-cols-4 gap-2 w-full">
                          {(panelForm.investigacionLegal as any).evidenciasGraficas.map((url: string, idx: number) => (
                            <div key={idx} className="relative group aspect-square">
                              <img src={url} className="w-full h-full object-cover rounded shadow-sm" onClick={() => { setLightboxSection("legal"); setLightboxIndex(idx); setLightboxOpen(true); }} />
                              <button className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => {
                                e.stopPropagation();
                                setPanelForm(f => ({ ...f, investigacionLegal: { ...f.investigacionLegal, evidenciasGraficas: (f.investigacionLegal as any).evidenciasGraficas.filter((_: string, i: number) => i !== idx) } }));
                              }}>×</button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">Clic aquí + Ctrl+V para pegar imagen</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

            </TabsContent> {/* End Expediente */}

            <TabsContent value="configuracion">
              <Card>
                <CardHeader><CardTitle>Configuración del Proceso</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Analista asignado</Label>
                    <p className="font-semibold">{process.responsableName || "Sin asignar"}</p>
                  </div>
                  <div>
                    <Label>Tipo de Producto (Configuración)</Label>
                    <div className="border p-4 rounded-md space-y-4 bg-slate-50">
                      <select
                        className="border rounded-md h-9 px-2 w-full text-sm"
                        value={baseTipo}
                        onChange={(e) => setBaseTipo(e.target.value as ProcesoBaseType)}
                        disabled={!canEditProcess || isClientAuth}
                      >
                        {PROCESO_BASE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>

                      {baseTipo === "ILA" && (
                        <select
                          className="border rounded-md h-9 px-2 w-full text-sm"
                          value={ilaModo}
                          onChange={(e) => setIlaModo(e.target.value as IlaModoType)}
                          disabled={!canEditProcess || isClientAuth}
                        >
                          <option value="NORMAL">Normal (sin buró ni legal)</option>
                          <option value="BURO">Con buró de crédito</option>
                          <option value="LEGAL">Con investigación legal</option>
                        </select>
                      )}

                      {/* ... other selects for ESE/VISITA would go here ... */}
                      
                      <div className="flex justify-end pt-2">
                         <Button size="sm" onClick={handleSavePanel} disabled={updatePanelDetail.isPending}>
                           Actualizar Configuración
                         </Button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <Label>Medio de recepción</Label>
                       <p className="border p-2 rounded bg-gray-50 text-sm">{process.medioDeRecepcion || '-'}</p>
                     </div>
                     <div>
                       <Label>Fecha Recepción</Label>
                       <p className="border p-2 rounded bg-gray-50 text-sm">{new Date(process.fechaRecepcion).toLocaleDateString()}</p>
                     </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>

        {/* Sidebar (Cols 9-12) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Status Card */}
          <Card className="border-l-4 border-l-blue-500 shadow-sm sticky top-4">
            <CardHeader className="bg-blue-50 py-3">
              <CardTitle className="text-lg text-blue-900">Estado</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <Label className="text-xs font-semibold text-gray-500">ESTATUS PROCESO</Label>
                <div className="flex gap-2">
                  <select
                    defaultValue={process.estatusProceso}
                    id="estatusProcesoSide"
                    className="flex-1 border rounded h-9 px-2 text-sm"
                    disabled={!canEditProcess}
                  >
                    {ESTATUS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                  </select>
                  <Button size="sm" onClick={() => {
                     const val = (document.getElementById('estatusProcesoSide') as HTMLSelectElement).value;
                     updateStatus.mutate({ id: processId, estatusProceso: val });
                  }}>
                    <Save className="h-4 w-4"/>
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-500">CALIFICACIÓN FINAL</Label>
                <select
                  value={calificacion}
                  onChange={(e) => setCalificacion(e.target.value)}
                  className="w-full border rounded h-9 px-2 text-sm mb-2"
                  disabled={!canEditProcess}
                >
                  {CALIF.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                {calificacion !== 'pendiente' && (
                  <Textarea
                    placeholder="Justificación..."
                    value={comentarioCalificacion}
                    onChange={(e) => setComentarioCalificacion(e.target.value)}
                    rows={3}
                    className="text-xs mb-2"
                  />
                )}
                <Button className="w-full" size="sm" onClick={() => {
                   updateCalif.mutate({ id: processId, calificacionFinal: calificacion as any, comentarioCalificacion });
                }}>
                  Guardar Calificación
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Candidate Card */}
          <Card>
            <CardHeader className="py-3 border-b bg-gray-50">
               <CardTitle className="text-sm uppercase text-gray-500">Candidato</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
               <div className="flex items-center gap-3">
                 <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold">
                   {/* Initials */}
                   {(findName(process.candidatoId, candidates, 'nombreCompleto') || '?').substring(0,2).toUpperCase()}
                 </div>
                 <div>
                   <p className="font-bold text-sm">{findName(process.candidatoId, candidates, 'nombreCompleto')}</p>
                   <p className="text-xs text-muted-foreground">{findName(process.puestoId, posts, 'nombreDelPuesto')}</p>
                 </div>
               </div>
               <div className="mt-4 pt-4 border-t text-sm space-y-1">
                 <p><span className="font-semibold">Cliente:</span> {findName(process.clienteId, clients, 'nombreEmpresa')}</p>
               </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
