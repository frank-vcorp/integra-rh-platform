import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AuditEntry {
  timestamp: string;
  changedBy: string;
  action: "create" | "update" | "submit";
  changedFields?: Record<string, any>;
}

interface AuditTrailViewerProps {
  entries?: AuditEntry[];
}

export function AuditTrailViewer({ entries = [] }: AuditTrailViewerProps) {
  if (!entries || entries.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic">
        Sin cambios registrados
      </div>
    );
  }

  return (
    <div className="space-y-4 text-xs">
      {entries.map((entry, idx) => (
        <div key={idx} className="border-l-2 border-slate-300 pl-3 py-1 bg-white">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 capitalize">
              {entry.action === "update" ? "Actualización" : entry.action === "create" ? "Creación" : entry.action}
            </span>
            <span className="text-muted-foreground text-[10px]">
              por <span className="font-medium">{entry.changedBy || "sistema"}</span>
            </span>
            <span className="text-muted-foreground text-[10px] ml-auto">
              {new Date(entry.timestamp).toLocaleString()}
            </span>
          </div>
          
          {entry.changedFields && Object.keys(entry.changedFields).length > 0 && (
            <div className="mt-2 text-[10px] space-y-2">
              {Object.entries(entry.changedFields).map(([field, value]) => (
                <div key={field} className="bg-slate-50 border border-slate-100 rounded p-1.5 shadow-sm">
                  <div className="font-mono text-slate-500 mb-1 font-semibold">{field}</div>
                  
                  {value?.old !== undefined && value?.new !== undefined ? (
                    <div className="flex flex-col sm:flex-row gap-1">
                      <div className="flex-1 bg-red-50 text-red-700 p-1.5 rounded line-through decoration-red-300/50 break-all whitespace-pre-wrap">
                        {String(value.old || "(vacío)")}
                      </div>
                      <div className="flex-none flex items-center justify-center text-slate-400 sm:rotate-0 rotate-90">
                        →
                      </div>
                      <div className="flex-1 bg-emerald-50 text-emerald-700 font-medium p-1.5 rounded break-all whitespace-pre-wrap">
                        {String(value.new || "(vacío)")}
                      </div>
                    </div>
                  ) : (
                    <div>
                      {value?.old !== undefined && (
                        <div className="bg-red-50 text-red-700 p-1 rounded line-through decoration-red-300 break-all whitespace-pre-wrap">
                          {String(value.old || "(vacío)")}
                        </div>
                      )}
                      {value?.new !== undefined && (
                         <div className="bg-emerald-50 text-emerald-700 p-1 rounded font-medium break-all whitespace-pre-wrap">
                          {String(value.new || "(vacío)")}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
