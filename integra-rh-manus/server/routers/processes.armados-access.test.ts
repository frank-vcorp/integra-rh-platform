/**
 * @intervention ARCH-20260319-01 | IMPL-20260408-01
 * @respaldo context/SPECs/SPEC-pdf-dinamico-estudio-cliente.md
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(
  "@shared/const.ts",
  () => ({
    NOT_ADMIN_ERR_MSG: "You do not have required permission (10002)",
    UNAUTHED_ERR_MSG: "Unauthorized",
  }),
  { virtual: true },
);

vi.mock("../db", () => ({
  getProcessById: vi.fn(),
  getLatestPublishedProcessReportVersion: vi.fn(),
  getProcessReportVersions: vi.fn(),
  getProcessReportVersionById: vi.fn(),
}));

const mockDownload = vi.fn(async () => [Buffer.from("<html>STUB</html>")]);
const mockGetSignedUrl = vi.fn(async () => ["https://fake-storage.local/report.pdf"]);

vi.mock("../firebase", () => ({
  storage: {
    bucket: vi.fn(() => ({
      file: vi.fn(() => ({
        getSignedUrl: mockGetSignedUrl,
        download: mockDownload,
      })),
    })),
  },
}));

vi.mock("../_core/audit", () => ({
  logAuditEvent: vi.fn(async () => undefined),
}));

// Mock del renderer HTML para tests de regeneración on-demand
vi.mock("../utils/armadoHtmlRenderer.js", () => ({
  renderArmadoHtml: vi.fn(async () => "<html>REGENERATED</html>"),
}));

import * as db from "../db";
import { processesRouter } from "./processes";

const baseProcess = {
  id: 83,
  clienteId: 77,
};

const publishedVersion = {
  id: 12,
  procesoId: 83,
  versionNumber: 2,
  status: "published",
  pdfStoragePath: "estudios/83/report.pdf",
  pdfFileName: "armado-ESE-83.pdf",
  publishedAt: new Date("2026-03-19T22:00:00.000Z"),
  reportScope: "armado_manual",
  sections: ["generales_candidato"],
  snapshot: { candidate: {}, client: {}, post: {}, process: { id: 83 } },
};

function buildClientContext(clientId: number) {
  return {
    req: { headers: {} },
    res: {},
    user: {
      id: 501,
      openId: `client-${clientId}`,
      name: "Cliente QA",
      email: null,
      role: "client",
      clientId,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      loginMethod: "manual",
      whatsapp: null,
    },
    requestId: "test-armados-client-access",
    permissions: [],
    isSuperadmin: false,
  } as any;
}

function buildAdminContext() {
  return {
    req: { headers: {} },
    res: {},
    user: {
      id: 1,
      openId: "admin-1",
      name: "Admin QA",
      email: "admin@qa.local",
      role: "admin",
      clientId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      loginMethod: "manual",
      whatsapp: null,
    },
    requestId: "test-armados-admin",
    permissions: [{ resource: "procesos", action: "view" }, { resource: "procesos", action: "edit" }],
    isSuperadmin: true,
  } as any;
}

describe("processesRouter Armados client access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getProcessById).mockResolvedValue(baseProcess as any);
    vi.mocked(db.getLatestPublishedProcessReportVersion).mockResolvedValue(publishedVersion as any);
    vi.mocked(db.getProcessReportVersionById).mockResolvedValue(publishedVersion as any);
    vi.mocked(db.getProcessReportVersions).mockResolvedValue([
      publishedVersion,
      { ...publishedVersion, id: 13, versionNumber: 3, status: "draft" },
    ] as any);
  });

  it("permite al cliente dueño consultar y abrir la versión publicada", async () => {
    const caller = processesRouter.createCaller(buildClientContext(77));

    const summary = await caller.getPublishedReportSummary({ id: 83 });
    const access = await caller.getPublishedReportAccess({ id: 83 });
    const versions = await caller.listReportVersions({ id: 83 });
    const versionAccess = await caller.getReportVersionAccess({ versionId: 12 });

    expect(summary?.status).toBe("published");
    expect(access?.url).toContain("fake-storage.local");
    expect(versions).toHaveLength(1);
    expect(versions[0]?.status).toBe("published");
    expect(versionAccess?.status).toBe("published");
  });

  it("rechaza al cliente que no es dueño del proceso", async () => {
    const caller = processesRouter.createCaller(buildClientContext(999));

    await expect(caller.getPublishedReportSummary({ id: 83 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(caller.getPublishedReportAccess({ id: 83 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(caller.listReportVersions({ id: 83 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

// ── IMPL-20260408-01: getReportVersionHtml ─────────────────────────────────────

describe("processesRouter getReportVersionHtml", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getProcessById).mockResolvedValue(baseProcess as any);
  });

  it("retorna HTML desde Storage cuando la versión tiene htmlStoragePath", async () => {
    const versionWithHtml = {
      ...publishedVersion,
      htmlStoragePath: "estudios/83/armado-draft-12345.html",
    };
    vi.mocked(db.getProcessReportVersionById).mockResolvedValue(versionWithHtml as any);
    mockDownload.mockResolvedValueOnce([Buffer.from("<html>ALMACENADO</html>")]);

    const caller = processesRouter.createCaller(buildAdminContext());
    const result = await caller.getReportVersionHtml({ versionId: 12 });

    expect(result.html).toBe("<html>ALMACENADO</html>");
    expect(result.source).toBe("storage");
    expect(mockDownload).toHaveBeenCalledTimes(1);
  });

  it("regenera HTML on-demand cuando la versión no tiene htmlStoragePath (versiones antiguas)", async () => {
    const versionWithoutHtml = {
      ...publishedVersion,
      htmlStoragePath: null,
    };
    vi.mocked(db.getProcessReportVersionById).mockResolvedValue(versionWithoutHtml as any);

    const caller = processesRouter.createCaller(buildAdminContext());
    const result = await caller.getReportVersionHtml({ versionId: 12 });

    expect(result.html).toBe("<html>REGENERATED</html>");
    expect(result.source).toBe("regenerated");
    expect(mockDownload).not.toHaveBeenCalled();
  });

  it("rechaza al cliente (FORBIDDEN) — preview HTML es exclusivo interno", async () => {
    vi.mocked(db.getProcessReportVersionById).mockResolvedValue(publishedVersion as any);

    const caller = processesRouter.createCaller(buildClientContext(77));
    await expect(caller.getReportVersionHtml({ versionId: 12 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("retorna NOT_FOUND si la versión no existe", async () => {
    vi.mocked(db.getProcessReportVersionById).mockResolvedValue(undefined);

    const caller = processesRouter.createCaller(buildAdminContext());
    await expect(caller.getReportVersionHtml({ versionId: 9999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});