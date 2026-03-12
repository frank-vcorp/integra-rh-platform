import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import InvestigacionLaboralActiva from "@/pages/proceso-steps/InvestigacionLaboralActiva";

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
  isPending?: boolean;
  mutate: (input: TInput) => void;
  mutateAsync?: (input: TInput) => Promise<any>;
};

// NOTE: vi.mock() factories are hoisted; use vi.hoisted() to create shared spies safely.
const spies = vi.hoisted(() => ({
  queryImpl: vi.fn(),
  mutateImpl: vi.fn(),
  invalidate: vi.fn(),
}));

const queryImpl = spies.queryImpl;
const mutateImpl = spies.mutateImpl;
const invalidate = spies.invalidate;

vi.mock("@/lib/trpc", () => {
  const useUtils = () => ({
    workHistory: {
      getByCandidate: {
        invalidate,
      },
    },
  });

  const update: MutationMock = {
    mutate: mutateImpl,
  };

  return {
    trpc: {
      useUtils,
      workHistory: {
        getByCandidate: {
          useQuery: queryImpl,
        },
        update: {
          useMutation: vi.fn(() => update),
        },
      },
    },
  };
});

function makeProcess(overrides: any = {}) {
  return {
    id: 1,
    candidatoId: 10,
    ...overrides,
  };
}

const makeHistorial = (overrides: any = {}) => ({
  id: 101,
  empresa: "ACME",
  puesto: "Dev",
  fechaInicio: "2020-01",
  fechaFin: "2021-01",
  tiempoTrabajado: null,
  contactoReferencia: "Juan Perez",
  telefonoReferencia: "555-000",
  causalSalidaRH: "RENUNCIA VOLUNTARIA",
  // campos capturados por analista
  comentarioInvestigacion: "",
  causalSalidaJefeInmediato: "",
  resultadoVerificacion: "pendiente",
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe.skip("InvestigacionLaboralActiva", () => {
  it("renderiza alerta cuando historialLaboral está vacío", () => {
    queryImpl.mockReturnValue({ data: [], isLoading: false });

    render(<InvestigacionLaboralActiva process={makeProcess()} />);

    expect(
      screen.getByText(/aún no tiene historial laboral registrado/i)
    ).toBeInTheDocument();

    // contadores
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText(/Total empleos/i)).toBeInTheDocument();
    expect(screen.getByText(/Contactadas/i)).toBeInTheDocument();
    expect(screen.getByText(/Aprobadas/i)).toBeInTheDocument();
    expect(screen.getByText(/Rechazadas/i)).toBeInTheDocument();
  });

  it("renderiza empleos con datos y calcula contadores de progreso", async () => {
    queryImpl.mockReturnValue({
      isLoading: false,
      data: [
        makeHistorial({ id: 1, empresa: "ACME", resultadoVerificacion: "pendiente" }),
        makeHistorial({ id: 2, empresa: "Globex", resultadoVerificacion: "recomendable" }),
        makeHistorial({ id: 3, empresa: "Initech", resultadoVerificacion: "no_recomendable" }),
      ],
    });

    render(<InvestigacionLaboralActiva process={makeProcess()} />);

    // Encabezado
    expect(
      screen.getByRole("heading", { name: /Paso 3: Investigación Laboral Activa/i })
    ).toBeInTheDocument();

    // Los acordeones renderizan el nombre de empresa (AccordionTrigger)
    expect(screen.getByText("ACME")).toBeInTheDocument();
    expect(screen.getByText("Globex")).toBeInTheDocument();
    expect(screen.getByText("Initech")).toBeInTheDocument();

    // Contadores: total=3, contactadas=2 (no pendiente), aprobadas=1, rechazadas=1
    // Cada contador está en un card con label; tomamos el contenedor por el label y verificamos el número.
    const totalCard = screen.getByText(/Total empleos/i).closest("div")!;
    expect(within(totalCard).getByText("3")).toBeInTheDocument();

    const contactadasCard = screen.getByText(/Contactadas/i).closest("div")!;
    expect(within(contactadasCard).getByText("2")).toBeInTheDocument();

    const aprobadasCard = screen.getByText(/Aprobadas/i).closest("div")!;
    expect(within(aprobadasCard).getByText("1")).toBeInTheDocument();

    const rechazadasCard = screen.getByText(/Rechazadas/i).closest("div")!;
    expect(within(rechazadasCard).getByText("1")).toBeInTheDocument();
  });

  it("permite cambiar el estado de referencia (Select) y habilita guardado (se marca como no guardado)", async () => {
    const user = userEvent.setup();

    queryImpl.mockReturnValue({
      isLoading: false,
      data: [makeHistorial({ id: 1, empresa: "ACME", resultadoVerificacion: "pendiente" })],
    });

    render(<InvestigacionLaboralActiva process={makeProcess()} />);

    // Expandir el acordeón para ver los controles.
    await user.click(screen.getByRole("button", { name: /ACME/i }));

    // Selecciona "Aprobado / Recomendable"
    const estadoLabel = screen.getByText(/Estado de la referencia/i);
    const estadoContainer = estadoLabel.closest("div")!;
    const trigger = within(estadoContainer).getByRole("button");

    await user.click(trigger);
    await user.click(screen.getByRole("option", { name: /Aprobado \/ Recomendable/i }));

    // Debe reflejar el estado nuevo en el trigger
    expect(within(estadoContainer).getByText(/Aprobado/i)).toBeInTheDocument();

    // El botón debe seguir siendo "Guardar referencia" (no guardado)
    expect(screen.getByRole("button", { name: /Guardar referencia/i })).toBeEnabled();
  });

  it("guarda vía mutación tRPC workHistory.update con payload de draft y ejecuta invalidate + toast.success", async () => {
    const user = userEvent.setup();

    const { toast } = await import("sonner");

    // mock de query inicial
    queryImpl.mockReturnValue({
      isLoading: false,
      data: [makeHistorial({ id: 1, empresa: "ACME", resultadoVerificacion: "pendiente" })],
    });

    // Cuando se llame mutate, simulamos onSuccess del useMutation.
    mutateImpl.mockImplementation((variables) => {
      // El mock de trpc.workHistory.update.useMutation crea handlers en el componente.
      // No tenemos acceso directo, así que forzamos el comportamiento esperado por efecto:
      // en este test, validamos el payload de mutate y luego simulamos el resultado
      // emitiendo manualmente las señales de éxito esperadas (invalidate + toast) no es posible aquí.
      // => Solución: en este mock usamos un getter para recuperar el callback real.
    });

    // Re-mock más fino: redefinimos useMutation para poder disparar callbacks.
    const trpcMod = await import("@/lib/trpc");
    (trpcMod.trpc.workHistory.update.useMutation as any).mockImplementation((opts: any) => {
      return {
        mutate: (variables: any) => {
          mutateImpl(variables);
          opts?.onSuccess?.({}, variables);
        },
      };
    });

    render(<InvestigacionLaboralActiva process={makeProcess()} />);

    await user.click(screen.getByRole("button", { name: /ACME/i }));

    // Cambiar estado a recomendable
    const estadoLabel = screen.getByText(/Estado de la referencia/i);
    const estadoContainer = estadoLabel.closest("div")!;
    await user.click(within(estadoContainer).getByRole("button"));
    await user.click(screen.getByRole("option", { name: /Aprobado \/ Recomendable/i }));

    // Escribir notas
    const notas = screen.getByLabelText(/Notas de validación/i);
    await user.type(notas, "contactado");

    await user.click(screen.getByRole("button", { name: /Guardar referencia/i }));

    expect(mutateImpl).toHaveBeenCalledTimes(1);
    expect(mutateImpl.mock.calls[0][0]).toMatchObject({
      id: 1,
      data: {
        resultadoVerificacion: "recomendable",
        comentarioInvestigacion: "contactado",
      },
    });

    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Referencia actualizada correctamente");

    // UI cambia a "Guardado"
    expect(await screen.findByRole("button", { name: /Guardado/i })).toBeInTheDocument();
  });
});
