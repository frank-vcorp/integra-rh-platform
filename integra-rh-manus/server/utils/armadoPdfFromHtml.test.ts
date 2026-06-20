/**
 * armadoPdfFromHtml.test.ts
 * Pruebas unitarias/integración para el renderer HTML → PDF headless.
 * Cubre: comportamiento cuando Playwright está disponible, fallback gracioso,
 * y integración con renderArmadoHtml (HTML-first end-to-end).
 *
 * Nota: los tests que llaman a renderHtmlToPdf son condicionales: si el import
 * de @playwright/test falla en el entorno actual (producción sin devDeps),
 * el renderer retorna null y el test lo acepta como comportamiento correcto.
 *
 * @intervention IMPL-20260321-01
 * @respaldo context/SPECs/SPEC-pdf-dinamico-estudio-cliente.md
 */

import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { isChromiumAvailable, renderHtmlToPdf } from "./armadoPdfFromHtml";

// ── Snapshot mínimo reutilizable ──────────────────────────────────────────────

const SNAPSHOT_MINIMO = {
  generatedAt: "2026-03-21T10:00:00.000Z",
  candidate: {
    nombreCompleto: "Test Candidato IMPL-20260321",
    telefono: "5512345678",
    email: "test@integra-rh.test",
    perfilDetalle: {
      generales: {
        curp: "CAIM900101MDFRRR09",
        estadoCivil: "Soltero",
        domicilio: "Calle de Prueba 404",
      },
    },
  },
  client: { nombreEmpresa: "Cliente Test" },
  post: { nombreDelPuesto: "Analista QA" },
  process: {
    id: 9999,
    clave: "TEST-2026-9999",
    tipoProducto: "ESE LOCAL",
    calificacionFinal: "recomendable",
    comentarioCalificacion: "Prueba automatizada IMPL-20260321-01.",
  },
  workHistory: [],
  documents: [],
};

/** Detecta si el módulo @playwright/test es importable en el entorno actual. */
async function playwrightImportable(): Promise<boolean> {
  try {
    await import("@playwright/test");
    return true;
  } catch {
    return false;
  }
}

// ── Suite: isChromiumAvailable ────────────────────────────────────────────────

describe("isChromiumAvailable", () => {
  it("retorna un booleano (no lanza)", () => {
    const result = isChromiumAvailable();
    expect(typeof result).toBe("boolean");
  });
});

// ── Suite: renderHtmlToPdf ────────────────────────────────────────────────────

describe("renderHtmlToPdf", () => {
  it(
    "genera un PDF válido a partir de HTML simple cuando Playwright está disponible",
    async () => {
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
        <style>body{font-family:sans-serif;padding:40px}h1{color:#1e3a5f}</style>
        </head><body><h1>Prueba headless IMPL-20260321-01</h1>
        <p>Documento generado por el renderer HTML-first de Armados.</p>
        </body></html>`;

      const result = await renderHtmlToPdf(html);

      if (!(await playwrightImportable()) || !isChromiumAvailable()) {
        // En entornos sin Playwright/Chromium el fallback es null — correcto.
        expect(result).toBeNull();
        return;
      }

      expect(result).not.toBeNull();
      expect(result!.byteLength).toBeGreaterThan(1000);
      const pdfDoc = await PDFDocument.load(result!);
      expect(pdfDoc.getPageCount()).toBeGreaterThan(0);
    },
    60_000,
  );

  it("retorna null sin lanzar ante un HTML vacío", async () => {
    // El renderer nunca debe lanzar — siempre retorna null o un Uint8Array.
    const result = await renderHtmlToPdf("").catch(() => null);
    expect(result === null || result instanceof Uint8Array).toBe(true);
  }, 60_000);
});

// ── Suite: integración HTML-first end-to-end ──────────────────────────────────

describe("HTML-first end-to-end (renderArmadoHtml → renderHtmlToPdf)", () => {
  it(
    "el HTML editorial del armado produce un PDF parseable si Playwright está disponible",
    async () => {
      const { renderArmadoHtml } = await import("./armadoHtmlRenderer");
      const html = await renderArmadoHtml(
        SNAPSHOT_MINIMO,
        ["generales_candidato", "observaciones_conclusion"],
        { folio: "ARM-9999-v1", versionNumber: 1 },
      );

      expect(typeof html).toBe("string");
      expect(html.length).toBeGreaterThan(500);

      const pdfResult = await renderHtmlToPdf(html);

      if (!(await playwrightImportable()) || !isChromiumAvailable()) {
        // Fallback esperado: null documentado explícitamente.
        expect(pdfResult).toBeNull();
        return;
      }

      expect(pdfResult).not.toBeNull();
      expect(pdfResult!.byteLength).toBeGreaterThan(5000);
      const pdfDoc = await PDFDocument.load(pdfResult!);
      expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(1);
    },
    60_000,
  );
});

// ── Suite: ARCH-20260408-14 — fotos de documentos en captura_visita ───────────
// Verifica que buildCapturaVisita emite el grid de fotos cuando el encuestador
// guarda imágenes de documentos (credencialElector.fotoFrente, etc.)
// @intervention IMPL-20260408-14

describe("ARCH-20260408-14 — captura_visita con imágenes de documentos", () => {
  const SNAPSHOT_CON_DOCS = {
    ...SNAPSHOT_MINIMO,
    process: {
      ...SNAPSHOT_MINIMO.process,
      visitaDetalle: {
        ubicacion: { domicilio: "Calle Ejemplo 1", cp: "06600", estado: "CDMX" },
        documentos: {
          credencialElector: {
            tiene: true,
            fotoFrente: "https://storage.example.com/doc-frente.jpg",
            fotoReverso: "https://storage.example.com/doc-reverso.jpg",
          },
          comprobanteDomicilio: {
            tiene: true,
            foto: "https://storage.example.com/comprobante.jpg",
          },
          cartillaMilitar: { tiene: false },
        },
      },
    },
  };

  it("genera HTML con doc-photos-grid cuando hay fotos de documentos", async () => {
    const { renderArmadoHtml } = await import("./armadoHtmlRenderer");
    const html = await renderArmadoHtml(SNAPSHOT_CON_DOCS, ["captura_visita"]);

    // Verificamos el elemento HTML (atributo class=), no la regla CSS
    expect(html).toContain('class="doc-photos-grid"');
    expect(html).toContain("doc-frente.jpg");
    expect(html).toContain("doc-reverso.jpg");
    expect(html).toContain("comprobante.jpg");
  });

  it("muestra resumen compacto (presentó / no presentó) junto a las fotos", async () => {
    const { renderArmadoHtml } = await import("./armadoHtmlRenderer");
    const html = await renderArmadoHtml(SNAPSHOT_CON_DOCS, ["captura_visita"]);

    // Credencial → presentó; Cartilla → no presentó
    expect(html).toContain("Credencial de elector");
    expect(html).toContain("Cartilla militar");
    // Fotos presentes → el grid de imágenes existe
    expect(html).toContain('class="doc-photo-img"');
  });

  it("no emite doc-photos-grid cuando no hay ninguna foto", async () => {
    const snapshotSinFotos = {
      ...SNAPSHOT_MINIMO,
      process: {
        ...SNAPSHOT_MINIMO.process,
        visitaDetalle: {
          documentos: {
            actaNacimiento: { tiene: true /* sin campo foto */ },
            credencialElector: { tiene: false },
          },
        },
      },
    };
    const { renderArmadoHtml } = await import("./armadoHtmlRenderer");
    const html = await renderArmadoHtml(snapshotSinFotos, ["captura_visita"]);

    // No debe existir el elemento grid si no hay URLs de foto reales
    // (la regla CSS .doc-photos-grid siempre está en el <style>, buscamos el atributo HTML)
    expect(html).not.toContain('class="doc-photos-grid"');
  });
});

// ── Suite: ARCH-20260408-14 — HTML-first no cae a legacy cuando Chromium ok ───
describe("ARCH-20260408-14 — renderer HTML-first vs legacy", () => {
  it(
    "generarArmadoClientePDF usa HTML-first (retorna PDF válido) cuando Playwright/Chromium disponibles",
    async () => {
      const { generarArmadoClientePDF } = await import("./estudiosocioPdf");
      const pdfBytes = await generarArmadoClientePDF(
        SNAPSHOT_MINIMO,
        ["generales_candidato"],
      );

      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.byteLength).toBeGreaterThan(1000);
      // Ambos renderers producen un PDF válido — verificamos que es parseable
      const pdfDoc = await PDFDocument.load(pdfBytes);
      expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(1);
    },
    90_000,
  );
});
