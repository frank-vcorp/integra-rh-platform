import { randomUUID } from "crypto";

export type LogLevel = "info" | "warn" | "error";

export type LogMeta = Record<string, unknown> | undefined;

function base(line: {
  level: LogLevel;
  msg: string;
  requestId?: string;
  [key: string]: unknown;
}) {
  const payload = {
    ts: new Date().toISOString(),
    ...line,
  };
  const text = JSON.stringify(payload);
  switch (line.level) {
    case "error":
      // eslint-disable-next-line no-console
      console.error(text);
      break;
    case "warn":
      // eslint-disable-next-line no-console
      console.warn(text);
      break;
    default:
      // eslint-disable-next-line no-console
      console.log(text);
  }
}

function mergeMeta(meta: LogMeta): Record<string, unknown> {
  if (!meta) return {};
  return meta;
}

export const logger = {
  info(message: string, meta?: LogMeta) {
    base({ level: "info", msg: message, ...mergeMeta(meta) });
  },
  warn(message: string, meta?: LogMeta) {
    base({ level: "warn", msg: message, ...mergeMeta(meta) });
  },
  error(message: string, meta?: LogMeta) {
    base({ level: "error", msg: message, ...mergeMeta(meta) });
  },
  /**
   * Convenience to ensure we always have a requestId available.
   */
  ensureRequestId(value?: string | null): string {
    if (value && typeof value === "string" && value.length > 0) return value;
    return randomUUID();
  },
};

