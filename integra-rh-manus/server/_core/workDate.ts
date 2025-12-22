export function normalizeWorkDateInput(value?: string | null): string | undefined {
  const v = (value ?? "").trim();
  if (!v) return undefined;

  // YYYY -> YYYY-01-01
  if (/^\d{4}$/.test(v)) {
    return `${v}-01-01`;
  }

  // YYYY-MM -> YYYY-MM-01
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(v)) {
    return `${v}-01`;
  }

  // YYYY-MM-DD -> dejar igual
  if (/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v)) {
    return v;
  }

  // Compatibilidad: no romper si llega algo distinto.
  return v;
}
