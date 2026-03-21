/**
 * @intervention ARCH-20260321-18
 * Tests de trazabilidad y merge del flujo encuestador → visitaDetalle.
 * Cubre: saveProgress (merge), complete (cierre), sin tocar UI ni Storage.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@shared/const.ts", () => ({
  NOT_ADMIN_ERR_MSG: "You do not have required permission (10002)",
  UNAUTHED_ERR_MSG: "Unauthorized",
}));

vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

// surveyorPortal.ts usa Drizzle query builder directamente; el schema y el ORM
// deben mockearse para que eq(), and() y las columnas no lancen en test.
vi.mock("../../drizzle/schema", () => ({
  surveyorTokens: {
    id: "col:st_id",
    token: "col:st_token",
    processId: "col:st_processId",
    status: "col:st_status",
    expiresAt: "col:st_expiresAt",
    surveyorId: "col:st_surveyorId",
  },
  processes: {
    id: "col:p_id",
    visitaDetalle: "col:p_visitaDetalle",
    estatusProceso: "col:p_estatusProceso",
  },
  candidates: {
    id: "col:c_id",
    nombreCompleto: "col:c_nombreCompleto",
    telefono: "col:c_telefono",
    perfilDetalle: "col:c_perfilDetalle",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(() => "sql:eq"),
  and: vi.fn(() => "sql:and"),
  desc: vi.fn(() => "sql:desc"),
}));

vi.mock("../_core/audit", () => ({
  logAuditEvent: vi.fn(async () => undefined),
}));

vi.mock("../firebase", () => ({
  storage: {
    bucket: vi.fn(() => ({
      file: vi.fn(() => ({
        save: vi.fn(async () => undefined),
        makePublic: vi.fn(async () => undefined),
        getSignedUrl: vi.fn(async () => ["https://fake-storage.local/estudio.pdf"]),
      })),
    })),
  },
}));

vi.mock("../utils/estudiosocioPdf", () => ({
  generarEstudioSocioeconomicoPDF: vi.fn(async () => Buffer.from("fake-pdf")),
}));

import { getDb } from "../db";
import { logAuditEvent } from "../_core/audit";
import { surveyorPortalRouter } from "./surveyorPortal";

// ── Helpers ────────────────────────────────────────────────────────────────

/** Construye una cadena mock para select().from().where().limit() */
function buildSelectChain(result: any[]) {
  const chain: any = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn().mockResolvedValue(result),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  return chain;
}

/** Captura el payload pasado a .set() y resuelve en .where() */
function buildUpdateChain(captured?: { payloads: any[] }) {
  const chain: any = {
    set: vi.fn().mockImplementation((payload: any) => {
      if (captured) captured.payloads.push(payload);
      return chain;
    }),
    where: vi.fn().mockResolvedValue([]),
  };
  return chain;
}

const futureDate = new Date(Date.now() + 60_000);
const baseToken = {
  id: 10,
  token: "tok-abc",
  processId: 101,
  status: "EN_CURSO",
  expiresAt: futureDate,
};

// Contexto público (sin usuario autenticado), suficiente para publicProcedure
const pubCtx: any = {
  req: { headers: {} },
  res: {},
  user: null,
  requestId: "test-req",
  permissions: [],
  isSuperadmin: false,
};

// ── saveProgress ───────────────────────────────────────────────────────────

describe("surveyorPortalRouter.saveProgress", () => {
  beforeEach(() => vi.clearAllMocks());

  it("hace merge de datos nuevos con la captura existente del encuestador", async () => {
    const updateCapture = { payloads: [] as any[] };

    const existingVisita = {
      foto_fachada: "https://storage.example.com/foto1.jpg",
      datos_generales: { nombre: "Juan", ocupacion: "Empleado" },
    };

    const mockDb = {
      select: vi.fn()
        // 1ª llamada: valida el token
        .mockReturnValueOnce(buildSelectChain([baseToken]))
        // 2ª llamada: obtiene visitaDetalle existente
        .mockReturnValueOnce(buildSelectChain([{ visitaDetalle: existingVisita }])),
      update: vi.fn().mockImplementation(() => buildUpdateChain(updateCapture)),
    };

    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const caller = surveyorPortalRouter.createCaller(pubCtx);
    const result = await caller.saveProgress({
      token: "tok-abc",
      data: { referencias: [{ nombre: "María", parentesco: "Hermana" }] },
    });

    expect(result.ok).toBe(true);

    // El update de visitaDetalle debe preservar foto_fachada y datos_generales
    const visitaUpdate = updateCapture.payloads.find((p) => "visitaDetalle" in p);
    expect(visitaUpdate?.visitaDetalle).toMatchObject({
      foto_fachada: "https://storage.example.com/foto1.jpg",
      datos_generales: { nombre: "Juan", ocupacion: "Empleado" },
      referencias: [{ nombre: "María", parentesco: "Hermana" }],
    });
  });

  it("no reemplaza campos existentes cuando el input.data omite claves previas", async () => {
    const updateCapture = { payloads: [] as any[] };

    const existingVisita = {
      seccion_a: "valor_original",
      seccion_b: "conservar_esto",
    };

    const mockDb = {
      select: vi.fn()
        .mockReturnValueOnce(buildSelectChain([baseToken]))
        .mockReturnValueOnce(buildSelectChain([{ visitaDetalle: existingVisita }])),
      update: vi.fn().mockImplementation(() => buildUpdateChain(updateCapture)),
    };

    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const caller = surveyorPortalRouter.createCaller(pubCtx);
    await caller.saveProgress({
      token: "tok-abc",
      data: { seccion_c: "nueva" }, // solo envía seccion_c, omite a y b
    });

    const visitaUpdate = updateCapture.payloads.find((p) => "visitaDetalle" in p);
    expect(visitaUpdate?.visitaDetalle.seccion_b).toBe("conservar_esto");
    expect(visitaUpdate?.visitaDetalle.seccion_c).toBe("nueva");
  });

  it("llama logAuditEvent con entityType correcto", async () => {
    const mockDb = {
      select: vi.fn()
        .mockReturnValueOnce(buildSelectChain([baseToken]))
        .mockReturnValueOnce(buildSelectChain([{ visitaDetalle: {} }])),
      update: vi.fn().mockImplementation(() => buildUpdateChain()),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const caller = surveyorPortalRouter.createCaller(pubCtx);
    await caller.saveProgress({ token: "tok-abc", data: { x: 1 } });

    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        entityType: "surveyorPortal_saveProgress",
        entityId: 101,
      }),
    );
  });

  it("rechaza token expirado", async () => {
    const expiredToken = { ...baseToken, expiresAt: new Date(Date.now() - 1000) };
    const mockDb = {
      select: vi.fn().mockReturnValue(buildSelectChain([expiredToken])),
      update: vi.fn().mockImplementation(() => buildUpdateChain()),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const caller = surveyorPortalRouter.createCaller(pubCtx);
    await expect(caller.saveProgress({ token: "tok-abc", data: {} })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("rechaza token ya COMPLETADO", async () => {
    const completedToken = { ...baseToken, status: "COMPLETADO" };
    const mockDb = {
      select: vi.fn().mockReturnValue(buildSelectChain([completedToken])),
      update: vi.fn().mockImplementation(() => buildUpdateChain()),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const caller = surveyorPortalRouter.createCaller(pubCtx);
    await expect(caller.saveProgress({ token: "tok-abc", data: {} })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

// ── complete ───────────────────────────────────────────────────────────────

describe("surveyorPortalRouter.complete", () => {
  beforeEach(() => vi.clearAllMocks());

  it("guarda el payload final y marca token como COMPLETADO", async () => {
    const updateCapture = { payloads: [] as any[] };

    const finalData = { section_fin: "ok", foto_url: "https://storage.example.com/f.jpg" };

    const mockDb = {
      select: vi.fn().mockReturnValue(buildSelectChain([baseToken])),
      update: vi.fn().mockImplementation(() => buildUpdateChain(updateCapture)),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const caller = surveyorPortalRouter.createCaller(pubCtx);
    const result = await caller.complete({ token: "tok-abc", data: finalData });

    expect(result.ok).toBe(true);
    expect(result.completedAt).toBeDefined();

    // visitaDetalle recibe el payload final completo
    const visitaUpdate = updateCapture.payloads.find((p) => "visitaDetalle" in p);
    expect(visitaUpdate?.visitaDetalle).toEqual(finalData);

    // El token se marca COMPLETADO
    const tokenStatusUpdate = updateCapture.payloads.find((p) => p.status === "COMPLETADO");
    expect(tokenStatusUpdate).toBeDefined();

    // El proceso se marca visita_realizada
    const estatusUpdate = updateCapture.payloads.find((p) => p.estatusProceso === "visita_realizada");
    expect(estatusUpdate).toBeDefined();
  });

  it("llama logAuditEvent con entityType surveyorPortal_complete", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue(buildSelectChain([baseToken])),
      update: vi.fn().mockImplementation(() => buildUpdateChain()),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const caller = surveyorPortalRouter.createCaller(pubCtx);
    await caller.complete({ token: "tok-abc", data: { campo: "valor" } });

    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        entityType: "surveyorPortal_complete",
        entityId: 101,
      }),
    );
  });

  it("rechaza si ya fue COMPLETADO", async () => {
    const completedToken = { ...baseToken, status: "COMPLETADO" };
    const mockDb = {
      select: vi.fn().mockReturnValue(buildSelectChain([completedToken])),
      update: vi.fn().mockImplementation(() => buildUpdateChain()),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const caller = surveyorPortalRouter.createCaller(pubCtx);
    await expect(caller.complete({ token: "tok-abc", data: {} })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
