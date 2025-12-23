import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import cors from "cors";
import { appRouter } from "../routers/index";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { handleWebhookPsicometricas } from "../integrations/psicometricas";
import { logger } from "./logger";
import { randomUUID } from "crypto";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();

  // Asignar un requestId a cada petición y loguear entrada.
  app.use((req, res, next) => {
    const existingId =
      (req.headers["x-request-id"] as string | undefined) ?? undefined;
    const requestId = logger.ensureRequestId(existingId);
    (req as any).requestId = requestId;
    res.setHeader("x-request-id", requestId);
    logger.info("incoming_request", {
      requestId,
      method: req.method,
      path: req.path,
    });
    next();
  });

  app.use(
    cors({
      origin: 'https://integra-rh.web.app',
      methods: ['GET', 'POST', 'OPTIONS'],
      // No fijamos allowedHeaders para que CORS refleje los headers
      // solicitados (incluyendo x-client-token) automáticamente.
      credentials: true,
    })
  );
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // OAuth routes disabled: using Firebase Auth only in this environment
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError({ error, path, type, ctx }) {
        try {
          logger.error("trpc_error", {
            requestId: ctx?.requestId,
            path,
            type,
            code: error.code,
            message: error.message,
          });
        } catch {
          // no-op
        }
      },
    })
  );
  // Webhooks externos
  app.post("/api/webhooks/psicometricas", async (req, res) => {
    try {
      const secret = process.env.PSICOMETRICAS_WEBHOOK_SECRET || "";
      if (secret) {
        const hdrSecret = (req.header("x-psico-secret") || req.header("x-psicometricas-secret") || "").toString();
        if (!hdrSecret || hdrSecret !== secret) {
          logger.warn("[Webhook] psicometricas unauthorized: bad secret", {
            requestId: (req as any).requestId,
          });
          return res.status(401).json({ ok: false });
        }
      }
      await handleWebhookPsicometricas(req.body);
      res.status(200).json({ ok: true });
    } catch (err) {
      logger.error("[Webhook] psicometricas failed", {
        requestId: (req as any).requestId,
        error: err instanceof Error ? err.message : String(err),
      });
      res.status(500).json({ ok: false });
    }
  });
  
  // REST endpoint para autosave simple (DEBE estar ANTES de setupVite/serveStatic)
  app.post("/api/candidate-autosave", async (req, res) => {
    try {
      const { token, email, telefono } = req.body;
      
      if (!token || typeof token !== "string") {
        return res.status(400).json({ error: "Invalid token" });
      }

      const tokenRow = await (await import("../db")).getCandidateSelfToken(token);
      if (!tokenRow || tokenRow.revoked) {
        return res.status(403).json({ error: "Invalid token" });
      }

      const now = new Date();
      if (tokenRow.expiresAt <= now) {
        return res.status(403).json({ error: "Token expired" });
      }

      const { getDb } = await import("../db");
      const database = await getDb();
      if (!database) {
        return res.status(500).json({ error: "Database unavailable" });
      }

      const { candidates } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      // Update candidate email/phone if provided
      if (email || telefono) {
        await database
          .update(candidates)
          .set({
            ...(email && { email }),
            ...(telefono && { telefono }),
          })
          .where(eq(candidates.id, tokenRow.candidateId));
      }

      res.status(200).json({ ok: true });
    } catch (error: any) {
      console.error("autosave error:", error);
      res.status(500).json({ error: error.message || "Internal error" });
    }
  });

  // REST endpoint para guardar TODOS los datos del formulario (draft completo)
  app.post("/api/candidate-save-full-draft", async (req, res) => {
    try {
      const { token, candidate, perfil, workHistory, aceptoAvisoPrivacidad } = req.body;
      
      if (!token || typeof token !== "string") {
        return res.status(400).json({ error: "Invalid token" });
      }

      const db = await import("../db");
      const tokenRow = await db.getCandidateSelfToken(token);
      if (!tokenRow || tokenRow.revoked) {
        return res.status(403).json({ error: "Invalid token" });
      }

      const now = new Date();
      if (tokenRow.expiresAt <= now) {
        return res.status(403).json({ error: "Token expired" });
      }

      const { getDb } = await import("../db");
      const database = await getDb();
      if (!database) {
        return res.status(500).json({ error: "Database unavailable" });
      }

      const { candidates, workHistory: workHistoryTable } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      const { normalizeWorkDateInput } = await import("../_core/workDate");

      // Transformar perfil plano en estructura anidada para CandidatoDetalle
      const perfilPlano = perfil || {};
      const updatedPerfil: any = {
        generales: {
          fechaNacimiento: perfilPlano.fechaNacimiento,
          nss: perfilPlano.nss,
          curp: perfilPlano.curp,
          rfc: perfilPlano.rfc,
          ciudadResidencia: perfilPlano.ciudadResidencia,
          lugarNacimiento: perfilPlano.lugarNacimiento,
          puestoSolicitado: perfilPlano.puestoSolicitado,
          plaza: perfilPlano.plaza,
          telefonoCasa: perfilPlano.telefonoCasa,
          telefonoRecados: perfilPlano.telefonoRecados,
        },
        domicilio: {
          calle: perfilPlano.calle,
          numero: perfilPlano.numero,
          interior: perfilPlano.interior,
          colonia: perfilPlano.colonia,
          municipio: perfilPlano.municipio,
          estado: perfilPlano.estado,
          cp: perfilPlano.cp,
          mapLink: perfilPlano.mapLink,
        },
        redesSociales: {
          facebook: perfilPlano.facebook,
          instagram: perfilPlano.instagram,
          twitterX: perfilPlano.twitterX,
          tiktok: perfilPlano.tiktok,
        },
        situacionFamiliar: {
          estadoCivil: perfilPlano.estadoCivil,
          fechaMatrimonioUnion: perfilPlano.fechaMatrimonioUnion,
          parejaDeAcuerdoConTrabajo: perfilPlano.parejaDeAcuerdoConTrabajo,
          esposaEmbarazada: perfilPlano.esposaEmbarazada,
          hijosDescripcion: perfilPlano.hijosDescripcion,
          quienCuidaHijos: perfilPlano.quienCuidaHijos,
          dondeVivenCuidadores: perfilPlano.dondeVivenCuidadores,
          pensionAlimenticia: perfilPlano.pensionAlimenticia,
          vivienda: perfilPlano.vivienda,
          tieneNovio: perfilPlano.tieneNovio,
          nombreNovio: perfilPlano.nombreNovio,
          ocupacionNovio: perfilPlano.ocupacionNovio,
          domicilioNovio: perfilPlano.domicilioNovio,
          apoyoEconomicoMutuo: perfilPlano.apoyoEconomicoMutuo,
          negocioEnConjunto: perfilPlano.negocioEnConjunto,
        },
        contactoEmergencia: {
          nombre: perfilPlano.contactoNombre,
          parentesco: perfilPlano.contactoParentesco,
          telefono: perfilPlano.contactoTelefono,
        },
        financieroAntecedentes: {
          tieneDeudas: perfilPlano.tieneDeudas,
          institucionDeuda: perfilPlano.institucionDeuda,
          buroCreditoDeclarado: perfilPlano.buroCreditoDeclarado,
          haSidoSindicalizado: perfilPlano.haSidoSindicalizado,
          haEstadoAfianzado: perfilPlano.haEstadoAfianzado,
          accidentesVialesPrevios: perfilPlano.accidentesVialesPrevios,
          accidentesTrabajoPrevios: perfilPlano.accidentesTrabajoPrevios,
        },
        consentimiento: {
          aceptoAvisoPrivacidad: aceptoAvisoPrivacidad,
          aceptoAvisoPrivacidadAt: new Date().toISOString(),
        },
      };

      // Guardar datos del candidato
      if (candidate) {
        await database
          .update(candidates)
          .set({
            email: candidate.email || undefined,
            telefono: candidate.telefono || undefined,
            perfilDetalle: updatedPerfil || undefined,
          } as any)
          .where(eq(candidates.id, tokenRow.candidateId));
      } else {
        await database
          .update(candidates)
          .set({
            perfilDetalle: updatedPerfil || undefined,
          } as any)
          .where(eq(candidates.id, tokenRow.candidateId));
      }

      // Guardar historial laboral (SOLO campos que captura el candidato)
      if (workHistory && Array.isArray(workHistory)) {
        for (const item of workHistory) {
          const fechaInicioValue = normalizeWorkDateInput(item.fechaInicio) ?? "";
          const fechaFinValueRaw = item.esActual === true ? "" : (item.fechaFin ?? "");
          const fechaFinValue = fechaFinValueRaw ? (normalizeWorkDateInput(fechaFinValueRaw) ?? "") : "";

          if (item.id && item.id > 0) {
            // Actualizar (solo campos del candidato)
            await database
              .update(workHistoryTable)
              .set({
                empresa: item.empresa,
                puesto: item.puesto,
                fechaInicio: fechaInicioValue,
                fechaFin: fechaFinValue,
                tiempoTrabajado: item.tiempoTrabajado,
              })
              .where(
                and(
                  eq(workHistoryTable.id, item.id),
                  eq(workHistoryTable.candidatoId, tokenRow.candidateId),
                ),
              );
          } else if (item.empresa && item.empresa.trim()) {
            // Insertar nuevo (solo campos del candidato, sin causales)
            await database.insert(workHistoryTable).values({
              candidatoId: tokenRow.candidateId,
              empresa: item.empresa,
              puesto: item.puesto || "",
              fechaInicio: fechaInicioValue,
              fechaFin: fechaFinValue,
              tiempoTrabajado: item.tiempoTrabajado ?? "",
              tiempoTrabajadoEmpresa: "",
              estatusInvestigacion: "en_revision",
              resultadoVerificacion: "pendiente",
              capturadoPor: "candidato",
            } as any);
          }
        }
      }

      res.status(200).json({ ok: true });
    } catch (error: any) {
      console.error("save-full-draft error:", error);
      res.status(500).json({ error: error.message || "Internal error" });
    }
  });
  
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    logger.warn("port_busy", {
      preferredPort,
      port,
    });
  }

  server.listen(port, () => {
    logger.info("server_started", {
      port,
      url: `http://localhost:${port}/`,
    });
  });
}

startServer().catch(err => {
  logger.error("server_fatal_error", {
    error: err instanceof Error ? err.message : String(err),
  });
});
