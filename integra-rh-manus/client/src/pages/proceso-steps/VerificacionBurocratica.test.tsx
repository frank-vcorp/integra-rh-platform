import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import VerificacionBurocratica from "@/pages/proceso-steps/VerificacionBurocratica";

// --- Mocks ---
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Minimal mock for className concatenation helper
vi.mock("@/lib/utils", () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

type MutationMock<TInput = any> = {
  isPending: boolean;
  mutate: (input: TInput) => void;
  mutateAsync: (input: TInput) => Promise<any>;
};

// NOTE: vi.mock() factories are hoisted; use vi.hoisted() to create shared spies safely.
const spies = vi.hoisted(() => ({
  updatePanelMutate: vi.fn(),
  uploadMutateAsync: vi.fn(),
  invalidateById: vi.fn(),
  invalidateDocs: vi.fn(),
}));

const updatePanelMutate = spies.updatePanelMutate;
const uploadMutateAsync = spies.uploadMutateAsync;
const invalidateById = spies.invalidateById;
const invalidateDocs = spies.invalidateDocs;

vi.mock("@/lib/trpc", () => {

  const useUtils = () => ({
    processes: { getById: { invalidate: spies.invalidateById } },
    documents: { getByProcess: { invalidate: spies.invalidateDocs } },
  });

  const updatePanelDetail: MutationMock = {
    isPending: false,
    mutate: spies.updatePanelMutate,
    mutateAsync: vi.fn(),
  };

  const upload: MutationMock = {
    isPending: false,
    mutate: vi.fn(),
    mutateAsync: spies.uploadMutateAsync,
  };

  return {
    trpc: {
      useUtils,
      processes: {
        updatePanelDetail: {
          useMutation: vi.fn(() => updatePanelDetail),
        },
      },
      documents: {
        upload: {
          useMutation: vi.fn(() => upload),
        },
      },
    },
  };
});

// --- Helpers ---
const makeProcess = (overrides: any = {}) => ({
  id: 123,
  estatusVisual: "en_proceso",
  semanasDetalle: {
    comentario: "",
    evidenciasGraficas: [],
  },
  investigacionLegal: {
    antecedentes: "",
    flagRiesgo: undefined,
  },
  antecedentesPenales: {
    evidenciasGraficas: [],
  },
  buroCredito: {
    score: "",
    aprobado: undefined,
    pdfUrl: "",
    archivosAdicionales: [],
  },
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("VerificacionBurocratica", () => {
  it("inicializa estatus y comentarios desde el proceso (incluye parseo de prefijos)", async () => {
    render(
      <VerificacionBurocratica
        process={
          makeProcess({
            semanasDetalle: { comentario: "[APROBADO] 234 semanas", evidenciasGraficas: [] },
            investigacionLegal: { antecedentes: "OK", flagRiesgo: false },
            buroCredito: { aprobado: false, score: "680", pdfUrl: "", archivosAdicionales: [] },
          })
        }
      />
    );

    // Resumen semáforo
    expect(await screen.findByText(/IMSS:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Aprobado/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Rechazado/i).length).toBeGreaterThan(0);

    // Textarea IMSS debería estar "limpio" sin prefijo
    const imss = screen.getByLabelText(/Observaciones \/ Semanas detectadas/i);
    expect(imss).toHaveValue("234 semanas");

    // Input buró
    const buroScore = screen.getByLabelText(/Score declarado/i);
    expect(buroScore).toHaveValue("680");
  });

  it("al guardar IMSS envía comentario con prefijo [APROBADO] cuando el estatus no es pendiente", async () => {
    const user = userEvent.setup();

    render(<VerificacionBurocratica process={makeProcess()} />);

    // Cambiar a aprobado y capturar comentario
    await user.click(
      screen
        .getAllByRole("button", { name: /Aprobado/i })
        // el primero corresponde a IMSS
        [0]
    );

    const imss = screen.getByLabelText(/Observaciones \/ Semanas detectadas/i);
    await user.clear(imss);
    await user.type(imss, "234 semanas");

    await user.click(screen.getByRole("button", { name: /Guardar IMSS/i }));

    expect(updatePanelMutate).toHaveBeenCalledTimes(1);
    const payload = updatePanelMutate.mock.calls[0][0];

    expect(payload).toMatchObject({
      id: 123,
      semanasDetalle: {
        comentario: "[APROBADO] 234 semanas",
      },
    });
  });

  it("si IMSS queda en pendiente, guarda comentario sin prefijo", async () => {
    const user = userEvent.setup();

    render(<VerificacionBurocratica process={makeProcess()} />);

    const imss = screen.getByLabelText(/Observaciones \/ Semanas detectadas/i);
    await user.clear(imss);
    await user.type(imss, "texto libre");

    await user.click(screen.getByRole("button", { name: /Guardar IMSS/i }));

    const payload = updatePanelMutate.mock.calls[0][0];
    expect(payload.semanasDetalle.comentario).toBe("texto libre");
  });

  it("al guardar Buró, mapea el estatus a aprobado=true/false y persiste score", async () => {
    const user = userEvent.setup();

    render(<VerificacionBurocratica process={makeProcess()} />);

    // Cambiar estatus Buró a Rechazado (2do panel)
    await user.click(screen.getAllByRole("button", { name: /Rechazado/i })[1]);

    const buroScore = screen.getByLabelText(/Score declarado/i);
    await user.clear(buroScore);
    await user.type(buroScore, "600");

    await user.click(screen.getByRole("button", { name: /Guardar Buró de Crédito/i }));

    const payload = updatePanelMutate.mock.calls[0][0];
    expect(payload).toMatchObject({
      buroCredito: {
        score: "600",
        aprobado: false,
      },
    });
  });

  it("al guardar Antecedentes, mapea estatus a flagRiesgo true/false preservando otros campos del proceso", async () => {
    const user = userEvent.setup();

    render(
      <VerificacionBurocratica
        process={
          makeProcess({
            investigacionLegal: {
              antecedentes: "prev",
              flagRiesgo: undefined,
              archivoAdjuntoUrl: "keep.pdf",
              notasPeriodisticas: "keep",
              observacionesImss: "keep",
              evidenciaImgUrl: "keep.png",
              evidenciasGraficas: ["keep1"],
            },
          })
        }
      />
    );

    // Tercer panel: set Aprobado
    await user.click(screen.getAllByRole("button", { name: /Aprobado/i })[2]);

    await user.click(screen.getByRole("button", { name: /Guardar Antecedentes/i }));

    const payload = updatePanelMutate.mock.calls[0][0];
    expect(payload.investigacionLegal.flagRiesgo).toBe(false);
    expect(payload.investigacionLegal.archivoAdjuntoUrl).toBe("keep.pdf");
    expect(payload.investigacionLegal.evidenciasGraficas).toEqual(["keep1"]);
  });

  it("muestra alerta cuando antecedentes está en Rechazado", async () => {
    const user = userEvent.setup();

    render(<VerificacionBurocratica process={makeProcess()} />);

    // Cambiar a Rechazado en el panel de antecedentes (3er panel)
    await user.click(screen.getAllByRole("button", { name: /Rechazado/i })[2]);

    expect(
      await screen.findByText(/Se han detectado antecedentes o demandas/i)
    ).toBeInTheDocument();
  });
});
