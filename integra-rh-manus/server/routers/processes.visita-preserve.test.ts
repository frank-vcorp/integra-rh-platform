/**
 * @intervention ARCH-20260321-18
 * Verifica que updatePanelDetail preserve la captura completa del encuestador
 * cuando el panel interno solo envía el subconjunto de campos que edita.
 * @see ARCH-20260321-10 en processes.ts (merge explícito)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@shared/const.ts", () => ({
  NOT_ADMIN_ERR_MSG: "You do not have required permission (10002)",
  UNAUTHED_ERR_MSG: "Unauthorized",
}));

vi.mock("../db", () => ({
  getProcessById: vi.fn(),
  updateProcess: vi.fn(async () => undefined),
  // resto de exports que el router puede cargar en top-level
  getLatestPublishedProcessReportVersion: vi.fn(),
  getProcessReportVersions: vi.fn(),
  getProcessReportVersionById: vi.fn(),
  createAuditLog: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

vi.mock("../firebase", () => ({
  storage: {
    bucket: vi.fn(() => ({
      file: vi.fn(() => ({
        getSignedUrl: vi.fn(async () => ["https://fake-storage.local/report.pdf"]),
        save: vi.fn(async () => undefined),
      })),
    })),
  },
  auth: { verifyIdToken: vi.fn() },
}));

vi.mock("../_core/audit", () => ({
  logAuditEvent: vi.fn(async () => undefined),
}));

vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn(async () => ""),
}));

vi.mock("../_core/env", () => ({
  ENV: { NODE_ENV: "test", DATABASE_URL: "mysql://x" },
}));

vi.mock("../utils/estudiosocioPdf", () => ({
  generarArmadoClientePDF: vi.fn(async () => Buffer.from("fake-pdf")),
  generarEstudioSocioeconomicoPDF: vi.fn(async () => Buffer.from("fake-pdf")),
}));

import * as db from "../db";
import { processesRouter } from "./processes";

// ── Helpers ────────────────────────────────────────────────────────────────

function buildAdminContext(extra: Partial<{ isSuperadmin: boolean }> = {}) {
  return {
    req: { headers: {} },
    res: {},
    user: {
      id: 1,
      openId: "admin-1",
      name: "Admin QA",
      email: "admin@test.local",
      role: "admin",
      clientId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      loginMethod: "manual",
      whatsapp: null,
    },
    requestId: "test-visita-preserve",
    permissions: [
      { module: "procesos", action: "edit" },
      { module: "procesos", action: "view" },
    ],
    isSuperadmin: extra.isSuperadmin ?? false,
  } as any;
}

// Captura completa del encuestador (muchos campos, incluyendo fotos)
const fullEncuestadorCapture = {
  datos_domicilio: { calle: "Av. Siempre Viva 123", colonia: "Centro" },
  referencias_personales: [
    { nombre: "María López", parentesco: "Hermana", telefono: "5551234567" },
  ],
  foto_fachada: "https://storage.example.com/enc/foto_fachada.jpg",
  foto_interior: "https://storage.example.com/enc/foto_interior.jpg",
  verificacion_empleo: { empresa: "TechCorp", cargo: "Analista" },
};

const baseProcess = {
  id: 77,
  clienteId: 10,
  visitaDetalle: fullEncuestadorCapture,
  tipoProducto: "estudio_socieconomico",
  estatusVisual: "en_proceso",
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe("processesRouter.updatePanelDetail — preservación de visitaDetalle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getProcessById).mockResolvedValue(baseProcess as any);
    vi.mocked(db.updateProcess).mockResolvedValue(undefined as any);
  });

  it("preserva la captura completa del encuestador cuando el panel envía solo campos de resumen", async () => {
    const caller = processesRouter.createCaller(buildAdminContext());

    await caller.updatePanelDetail({
      id: 77,
      estatusVisual: "en_proceso",
      visitaDetalle: {
        tipo: "presencial",
        comentarios: "Visita realizada sin incidencias",
        fechaRealizacion: "2026-03-21",
      },
    });

    expect(db.updateProcess).toHaveBeenCalledOnce();
    const [, payload] = vi.mocked(db.updateProcess).mock.calls[0];

    // Campos del encuestador deben sobrevivir intactos
    expect(payload.visitaDetalle).toMatchObject({
      datos_domicilio: fullEncuestadorCapture.datos_domicilio,
      referencias_personales: fullEncuestadorCapture.referencias_personales,
      foto_fachada: fullEncuestadorCapture.foto_fachada,
      foto_interior: fullEncuestadorCapture.foto_interior,
      verificacion_empleo: fullEncuestadorCapture.verificacion_empleo,
    });

    // Campos del panel también deben estar presentes
    expect(payload.visitaDetalle).toMatchObject({
      tipo: "presencial",
      comentarios: "Visita realizada sin incidencias",
      fechaRealizacion: "2026-03-21",
    });
  });

  it("cuando no se envía visitaDetalle desde el panel, preserva toda la captura del encuestador", async () => {
    const caller = processesRouter.createCaller(buildAdminContext());

    await caller.updatePanelDetail({
      id: 77,
      estatusVisual: "entrevistado",
      // sin visitaDetalle
    });

    const [, payload] = vi.mocked(db.updateProcess).mock.calls[0];

    expect(payload.visitaDetalle).toMatchObject({
      foto_fachada: fullEncuestadorCapture.foto_fachada,
      datos_domicilio: fullEncuestadorCapture.datos_domicilio,
    });
  });

  it("las URLs de fotos del encuestador no son sobreescritas por el panel", async () => {
    const caller = processesRouter.createCaller(buildAdminContext());

    await caller.updatePanelDetail({
      id: 77,
      estatusVisual: "en_proceso",
      visitaDetalle: {
        // el panel no envía fotos (no tiene ese campo en su UI)
        comentarios: "Revisado",
      },
    });

    const [, payload] = vi.mocked(db.updateProcess).mock.calls[0];

    const visitaDetalle = payload.visitaDetalle as any;

    expect(visitaDetalle.foto_fachada).toBe(
      "https://storage.example.com/enc/foto_fachada.jpg",
    );
    expect(visitaDetalle.foto_interior).toBe(
      "https://storage.example.com/enc/foto_interior.jpg",
    );
  });
});
