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
    })
  );
  // Webhooks externos
  app.post("/api/webhooks/psicometricas", async (req, res) => {
    try {
      const secret = process.env.PSICOMETRICAS_WEBHOOK_SECRET || "";
      if (secret) {
        const hdrSecret = (req.header("x-psico-secret") || req.header("x-psicometricas-secret") || "").toString();
        if (!hdrSecret || hdrSecret !== secret) {
          console.warn("[Webhook] psicometricas unauthorized: bad secret");
          return res.status(401).json({ ok: false });
        }
      }
      await handleWebhookPsicometricas(req.body);
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("[Webhook] psicometricas failed", err);
      res.status(500).json({ ok: false });
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
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
