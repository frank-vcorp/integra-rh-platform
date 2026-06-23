/**
 * armadoHtmlRenderer.test.ts
 * Tests unitarios del renderer HTML editorial por builder.
 * Cubre los 4 builders modificados en el micro-sprint FIX-ARMADOS-COVERAGE-01
 * (3 casos por builder = 12 tests).
 *
 * Estrategia: cada test arma un snapshot mínimo y verifica que el HTML
 * producido contiene los marcadores esperados (texto o clases CSS de bloque).
 * No se valida estilo visual — eso queda para QA visual de GEMINI.
 *
 * @intervention FIX-20260622-01 | FIX-ARMADOS-COVERAGE-01
 * @respaldo context/SPECs/SPEC-FIX-20260622-01-cobertura-armados.md §4.3
 */

import { describe, expect, it } from "vitest";
import { renderArmadoHtml } from "./armadoHtmlRenderer";

// ── Snapshots mínimos reutilizables ───────────────────────────────────────────

const SNAPSHOT_BASE = {
  generatedAt: "2026-06-22T10:00:00.000Z",
  candidate: {
    nombreCompleto: "Candidata Test FIX-20260622",
    perfilDetalle: {
      generales: { curp: "CAIM900101MDFRRR09" },
    },
    dictamenLaboral: {},
  },
  client: { nombreEmpresa: "Cliente Test" },
  post: { nombreDelPuesto: "Analista QA" },
  process: {
    id: 8201,
    clave: "FIX-20260622-01",
    tipoProducto: "ESE LOCAL",
  },
  workHistory: [],
  documents: [],
};

// ── T2: buildGeneralesCandidato ───────────────────────────────────────────────

describe("buildGeneralesCandidato — cobertura FIX-20260622-01", () => {
  it("incluye situacionFamiliar cuando está presente en perfilDetalle", async () => {
    const snapshot = {
      ...SNAPSHOT_BASE,
      candidate: {
        ...SNAPSHOT_BASE.candidate,
        perfilDetalle: {
          ...SNAPSHOT_BASE.candidate.perfilDetalle,
          situacionFamiliar: {
            estadoCivil: "Casada",
            hijos: 2,
            viveCon: "Cónyuge e hijos",
            personasACargo: 1,
          },
        },
      },
    };
    const html = await renderArmadoHtml(snapshot, ["generales_candidato"]);
    expect(html).toContain("Situación familiar");
    expect(html).toContain("Casada");
    expect(html).toContain("Cónyuge e hijos");
  });

  it("incluye financieroAntecedentes cuando está presente en perfilDetalle", async () => {
    const snapshot = {
      ...SNAPSHOT_BASE,
      candidate: {
        ...SNAPSHOT_BASE.candidate,
        perfilDetalle: {
          ...SNAPSHOT_BASE.candidate.perfilDetalle,
          financieroAntecedentes: {
            ingresosMensuales: 28000,
            deudasVigentes: 1,
            tarjetasCredito: 2,
            observaciones: "Sin moratorios",
          },
        },
      },
    };
    const html = await renderArmadoHtml(snapshot, ["generales_candidato"]);
    expect(html).toContain("Antecedentes financieros declarativos");
    expect(html).toContain("Ingresos mensuales declarados");
    expect(html).toContain("Sin moratorios");
  });

  it("incluye siteName (plaza/CEDI) cuando process.siteName existe", async () => {
    const snapshot = {
      ...SNAPSHOT_BASE,
      process: { ...SNAPSHOT_BASE.process, siteName: "CEDI Norte CDMX" },
    };
    const html = await renderArmadoHtml(snapshot, ["generales_candidato"]);
    expect(html).toContain("Plaza / CEDI");
    expect(html).toContain("CEDI Norte CDMX");
  });
});

// ── T3: buildInvestigacionLaboral ─────────────────────────────────────────────

describe("buildInvestigacionLaboral — cobertura FIX-20260622-01", () => {
  it("muestra tiempoTrabajadoEmpresa por cada empleo", async () => {
    const snapshot = {
      ...SNAPSHOT_BASE,
      workHistory: [
        {
          empresa: "Empresa A",
          fechaInicio: "2020-01",
          fechaFin: "2022-06",
          puesto: "Operador",
          tiempoTrabajadoEmpresa: "2 años 5 meses",
        },
      ],
    };
    const html = await renderArmadoHtml(snapshot, ["investigacion_laboral"]);
    expect(html).toContain("Tiempo trabajado:");
    expect(html).toContain("2 años 5 meses");
  });

  it("muestra contacto/teléfono/correo de referencia cuando existen", async () => {
    const snapshot = {
      ...SNAPSHOT_BASE,
      workHistory: [
        {
          empresa: "Empresa B",
          fechaInicio: "2018-03",
          fechaFin: "2020-01",
          contactoReferencia: "Lic. Pérez",
          telefonoReferencia: "5512345678",
          correoReferencia: "perez@empresab.test",
        },
      ],
    };
    const html = await renderArmadoHtml(snapshot, ["investigacion_laboral"]);
    expect(html).toContain("work-ref-contacto");
    expect(html).toContain("Lic. Pérez");
    expect(html).toContain("5512345678");
    expect(html).toContain("perez@empresab.test");
  });

  it("muestra desempenoScore cuando existe", async () => {
    const snapshot = {
      ...SNAPSHOT_BASE,
      workHistory: [
        {
          empresa: "Empresa C",
          fechaInicio: "2015-01",
          fechaFin: "2017-12",
          desempenoScore: 4,
        },
      ],
    };
    const html = await renderArmadoHtml(snapshot, ["investigacion_laboral"]);
    expect(html).toContain("Desempeño:");
    expect(html).toContain("4/5");
  });
});

// ── T4: buildSemanasCotizadas ──────────────────────────────────────────────────

describe("buildSemanasCotizadas — cobertura FIX-20260622-01", () => {
  it("muestra el número de semanas cotizadas si está en semanasDetalle", async () => {
    const snapshot = {
      ...SNAPSHOT_BASE,
      process: {
        ...SNAPSHOT_BASE.process,
        semanasDetalle: { semanasCotizadas: 312 },
      },
    };
    const html = await renderArmadoHtml(snapshot, ["semanas_cotizadas"]);
    expect(html).toContain("Semanas cotizadas:");
    expect(html).toContain("312");
  });

  it("muestra el número si solo está en dictamenLaboral (cascada)", async () => {
    const snapshot = {
      ...SNAPSHOT_BASE,
      candidate: {
        ...SNAPSHOT_BASE.candidate,
        dictamenLaboral: { semanasCotizadas: 187 },
      },
    };
    const html = await renderArmadoHtml(snapshot, ["semanas_cotizadas"]);
    expect(html).toContain("Semanas cotizadas:");
    expect(html).toContain("187");
  });

  it("omite el bloque si no hay dato en ninguna fuente", async () => {
    const snapshot = {
      ...SNAPSHOT_BASE,
      process: { ...SNAPSHOT_BASE.process, semanasDetalle: { comentario: "sin número" } },
    };
    const html = await renderArmadoHtml(snapshot, ["semanas_cotizadas"]);
    expect(html).not.toContain("<strong>Semanas cotizadas:</strong>");
  });
});

// ── T1: buildObservacionesConclusion ───────────────────────────────────────────

describe("buildObservacionesConclusion — cobertura FIX-20260622-01", () => {
  it("muestra dictamen final con calificacionFinal + fechaCierre", async () => {
    const snapshot = {
      ...SNAPSHOT_BASE,
      process: {
        ...SNAPSHOT_BASE.process,
        calificacionFinal: "recomendable",
        fechaCierre: "2026-06-20T00:00:00.000Z",
      },
    };
    const html = await renderArmadoHtml(snapshot, ["observaciones_conclusion"]);
    expect(html).toContain("DICTAMEN FINAL");
    expect(html).toContain("Recomendable");
    expect(html).toContain("Fecha de cierre:");
  });

  it("muestra comentarioCalificacion de la analista", async () => {
    const snapshot = {
      ...SNAPSHOT_BASE,
      process: {
        ...SNAPSHOT_BASE.process,
        calificacionFinal: "con_reservas",
        comentarioCalificacion: "Candidato requiere seguimiento a 90 días.",
      },
    };
    const html = await renderArmadoHtml(snapshot, ["observaciones_conclusion"]);
    expect(html).toContain("Comentario de calificación");
    expect(html).toContain("Candidato requiere seguimiento a 90 días.");
  });

  it("muestra estado de dictamen laboral cuando completado=true", async () => {
    const snapshot = {
      ...SNAPSHOT_BASE,
      candidate: {
        ...SNAPSHOT_BASE.candidate,
        dictamenLaboral: {
          completado: true,
          completadoAt: "2026-06-15T12:00:00.000Z",
        },
      },
      process: { ...SNAPSHOT_BASE.process, calificacionFinal: "recomendable" },
    };
    const html = await renderArmadoHtml(snapshot, ["observaciones_conclusion"]);
    expect(html).toContain("Estado del dictamen laboral");
    expect(html).toContain("Completado");
  });
});