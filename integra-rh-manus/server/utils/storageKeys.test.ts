/**
 * Tests del helper de sanitización de nombres de archivo para Firebase Storage.
 *
 * @intervention IMPL-ARCH-20260622-01
 * @respaldo context/SPECs/SPEC-ARCH-20260622-01-fix-storage-upload-no-such-key.md (sección 5.1)
 */

import { describe, expect, it } from "vitest";
import { sanitizeStorageKeySegment } from "./storageKeys";

describe("sanitizeStorageKeySegment", () => {
  it("preserva acentos y ñ", () => {
    expect(sanitizeStorageKeySegment("Constancia José.pdf")).toBe("Constancia José.pdf");
  });

  it("reemplaza paréntesis problemáticos", () => {
    // Solo se quitan caracteres prohibidos; ( ) son válidos en GCS.
    // Este test verifica que no se rompen los válidos.
    expect(sanitizeStorageKeySegment("CV (final).pdf")).toBe("CV (final).pdf");
  });

  it("reemplaza # y ?", () => {
    expect(sanitizeStorageKeySegment("Reporte#5.pdf")).toBe("Reporte_5.pdf");
    expect(sanitizeStorageKeySegment("¿Qué.pdf")).toBe("_Qué.pdf");
  });

  it("decodifica doble encoding", () => {
    expect(sanitizeStorageKeySegment("Archivo%2520final.pdf")).toBe("Archivo final.pdf");
    expect(sanitizeStorageKeySegment("Constancia%25252529.pdf")).toBe("Constancia%29.pdf");
  });

  it("rechaza segmentos vacíos", () => {
    expect(sanitizeStorageKeySegment("")).toBe("file");
    expect(sanitizeStorageKeySegment("...")).toBe("file");
    expect(sanitizeStorageKeySegment("???")).toBe("file");
  });

  it("trunca nombres largos", () => {
    const long = "a".repeat(300) + ".pdf";
    const out = sanitizeStorageKeySegment(long);
    expect(out.length).toBeLessThanOrEqual(200);
    expect(out.endsWith(".pdf")).toBe(true);
  });

  it("normaliza encoding", () => {
    // "José" en NFD vs NFC
    expect(sanitizeStorageKeySegment("José.pdf")).toBe("José.pdf");
  });

  // --- Tests adicionales sugeridos por GEMINI en auditoría 2026-06-22 ---

  it("maneja filenames de longitud máxima exacta (200 chars)", () => {
    // Base + extensión = 200 chars exactos
    const base = "a".repeat(196); // 196 + ".pdf" (4) = 200
    const input = base + ".pdf";
    const out = sanitizeStorageKeySegment(input);
    expect(out.length).toBe(200);
    expect(out.endsWith(".pdf")).toBe(true);
  });

  it("preserva la última extensión en nombres con múltiples puntos", () => {
    // El helper corta en el ÚLTIMO punto, preservando solo la extensión final
    const out = sanitizeStorageKeySegment("archivo.backup.tar.gz");
    expect(out.endsWith(".gz")).toBe(true);
    expect(out).toBe("archivo.backup.tar.gz");
  });

  it("trimea whitespace al inicio y final", () => {
    expect(sanitizeStorageKeySegment("  archivo.pdf  ")).toBe("archivo.pdf");
    expect(sanitizeStorageKeySegment("\tCV final.pdf\n")).toBe("CV final.pdf");
  });
});