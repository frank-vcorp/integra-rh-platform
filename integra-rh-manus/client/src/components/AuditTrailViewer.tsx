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
    <div className="space-y-2 text-xs">
      {entries.map((entry, idx) => (
        <div key={idx} className="border-l-2 border-slate-300 pl-3 py-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-700 capitalize">
              {entry.action}
            </span>
            <span className="text-muted-foreground">
              por {entry.changedBy || "sistema"}
            </span>
          </div>
          <div className="text-muted-foreground">
            {new Date(entry.timestamp).toLocaleString()}
          </div>
          {entry.changedFields && Object.keys(entry.changedFields).length > 0 && (
            <div className="mt-1 text-[10px] text-slate-600 space-y-0.5">
              {Object.entries(entry.changedFields).map(([field, value]) => (
                <Tooltip key={field}>
                  <TooltipTrigger asChild>
                    <div className="truncate cursor-help">
                      <span className="font-mono bg-slate-100 px-1 rounded">
                        {field}
                      </span>
                      {value?.old !== undefined && (
                        <>
                          {" "}
                          <span className="text-slate-500">
                            {String(value.old || "-").substring(0, 20)}
                          </span>
                          <span className="text-muted-foreground"> → </span>
                        </>
                      )}
                      {value?.new !== undefined && (
                        <span className="text-emerald-600">
                          {String(value.new || "-").substring(0, 20)}
                        </span>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    <div className="space-y-1">
                      <div>
                        <span className="text-muted-foreground">Anterior:</span>{" "}
                        {String(value?.old || "-")}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Nuevo:</span>{" "}
                        {String(value?.new || "-")}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
