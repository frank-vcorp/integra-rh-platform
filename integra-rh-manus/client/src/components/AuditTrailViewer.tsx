import type { JSX } from "react";
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

/**
 * ARCH-20260320-17 | Respaldo: PROYECTO.md
 */
function formatAuditLabel(field: string): string {
  return field
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (value) => value.toUpperCase());
}

/**
 * ARCH-20260320-17 | Respaldo: PROYECTO.md
 */
function renderAuditValue(value: unknown, path = "root"): JSX.Element {
  if (value === null || value === undefined || value === "") {
    return <span className="italic text-slate-400">(vacío)</span>;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return <span>{String(value)}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="italic text-slate-400">(sin elementos)</span>;
    }

    return (
      <div className="space-y-1">
        {value.map((item, index) => (
          <div key={`${path}-${index}`} className="rounded border border-slate-200 bg-white/70 px-2 py-1">
            {renderAuditValue(item, `${path}-${index}`)}
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return <span className="italic text-slate-400">(sin datos)</span>;
    }

    return (
      <div className="space-y-1">
        {entries.map(([nestedKey, nestedValue]) => (
          <div key={`${path}-${nestedKey}`} className="rounded border border-slate-200 bg-white/70 px-2 py-1">
            <div className="font-medium text-slate-600">{formatAuditLabel(nestedKey)}</div>
            <div className="mt-0.5 break-all whitespace-pre-wrap text-slate-700">
              {renderAuditValue(nestedValue, `${path}-${nestedKey}`)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <span>{String(value)}</span>;
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
                  <div className="font-mono text-slate-500 mb-1 font-semibold">{formatAuditLabel(field)}</div>
                  
                  {value?.old !== undefined && value?.new !== undefined ? (
                    <div className="flex flex-col sm:flex-row gap-1">
                      <div className="flex-1 bg-red-50 text-red-700 p-1.5 rounded line-through decoration-red-300/50 break-all whitespace-pre-wrap">
                        {renderAuditValue(value.old, `${field}-old`)}
                      </div>
                      <div className="flex-none flex items-center justify-center text-slate-400 sm:rotate-0 rotate-90">
                        →
                      </div>
                      <div className="flex-1 bg-emerald-50 text-emerald-700 font-medium p-1.5 rounded break-all whitespace-pre-wrap">
                        {renderAuditValue(value.new, `${field}-new`)}
                      </div>
                    </div>
                  ) : (
                    <div>
                      {value?.old !== undefined && (
                        <div className="bg-red-50 text-red-700 p-1 rounded line-through decoration-red-300 break-all whitespace-pre-wrap">
                          {renderAuditValue(value.old, `${field}-old-legacy`)}
                        </div>
                      )}
                      {value?.new !== undefined && (
                         <div className="bg-emerald-50 text-emerald-700 p-1 rounded font-medium break-all whitespace-pre-wrap">
                          {renderAuditValue(value.new, `${field}-new-legacy`)}
                        </div>
                      )}
                      {value?.old === undefined && value?.new === undefined && (
                        <div className="bg-white p-1 rounded break-all whitespace-pre-wrap text-slate-700">
                          {renderAuditValue(value, `${field}-plain`)}
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
