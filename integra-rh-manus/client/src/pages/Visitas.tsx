import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";

export default function Visitas() {
  const { data: visits = [] } = trpc.processes.listVisits.useQuery();
  const surveyors = (trpc as any).surveyors?.listActive?.useQuery ? (trpc as any).surveyors.listActive.useQuery() : { data: [] };
  const { data: clients = [] } = trpc.clients.list.useQuery();
  const [selected, setSelected] = useState<Date | undefined>(new Date());
  const [surveyorFilter, setSurveyorFilter] = useState<string>("");
  const [clientFilter, setClientFilter] = useState<string>("");

  const byDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    (visits || [])
      .filter((v:any)=> !surveyorFilter || v.visitStatus?.encuestadorId === parseInt(surveyorFilter))
      .filter((v:any)=> !clientFilter || v.clienteId === parseInt(clientFilter))
      .forEach((v:any)=>{
      const d = v.visitStatus?.scheduledDateTime ? new Date(v.visitStatus.scheduledDateTime) : undefined;
      if (!d) return;
      const key = d.toISOString().slice(0,10);
      map[key] = map[key] || [];
      map[key].push(v);
    });
    return map;
  }, [visits]);

  const modifiers = {
    hasVisit: Object.keys(byDate).map(k => new Date(k+'T00:00:00')),
  } as any;

  const selectedKey = selected ? selected.toISOString().slice(0,10) : undefined;
  const dayVisits = (selectedKey && byDate[selectedKey]) || [];

  return (
    <div className="grid grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Calendario de visitas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <Label>Encuestador</Label>
              <select className="mt-1 block w-full border rounded-md h-9 px-2" value={surveyorFilter} onChange={(e)=> setSurveyorFilter(e.target.value)}>
                <option value="">Todos</option>
                {((surveyors as any).data || []).map((s:any)=> (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Cliente</Label>
              <select className="mt-1 block w-full border rounded-md h-9 px-2" value={clientFilter} onChange={(e)=> setClientFilter(e.target.value)}>
                <option value="">Todos</option>
                {(clients || []).map((c:any)=> (
                  <option key={c.id} value={c.id}>{c.nombreEmpresa}</option>
                ))}
              </select>
            </div>
          </div>
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={setSelected}
            modifiersClassNames={{ hasVisit: "rdp-day_selected rdp-day_today" }}
            modifiers={modifiers}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Visitas {selectedKey}</CardTitle>
        </CardHeader>
        <CardContent>
          {dayVisits.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin visitas programadas</p>
          ) : (
            <div className="space-y-3">
              {dayVisits.map((v:any)=> (
                <div key={v.id} className="border rounded p-3">
                  <div className="text-sm font-medium">{v.clave} — {v.tipoProducto}</div>
                  <div className="text-xs text-muted-foreground">Estatus: {v.visitStatus?.status || '-'} | Hora: {new Date(v.visitStatus?.scheduledDateTime).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
