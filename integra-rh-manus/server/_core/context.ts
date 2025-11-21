import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { auth as adminAuth } from "../firebase";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // -------------------------------------------------------------------------
  // 1) Autenticación vía Firebase ID token (usuarios internos)
  // -------------------------------------------------------------------------
  {
    const authHeader =
      opts.req.headers["authorization"] ||
      (opts.req.headers["Authorization" as any] as string | string[] | undefined);
    const header = Array.isArray(authHeader) ? authHeader[0] : authHeader;

    if (typeof header === "string" && header.startsWith("Bearer ")) {
      const idToken = header.slice("Bearer ".length);
      let decoded: any | null = null;
      // Verificar token con Firebase
      try {
        decoded = await adminAuth.verifyIdToken(idToken);
      } catch (err) {
        try {
          const msg = (err as any)?.message || String(err);
          console.warn("[Auth] Firebase verifyIdToken failed:", msg);
        } catch {}
        decoded = null;
      }

      if (decoded) {
        const openId = decoded.uid as string;
        // Intentar cargar desde DB (no romper si falla)
        try {
          const existing = await db.getUserByOpenId(openId);
          if (existing) {
            user = existing as unknown as User;
          }
        } catch (e) {
          try {
            console.warn(
              "[Auth] DB getUserByOpenId failed; continuing with token claims",
              (e as any)?.message || e
            );
          } catch {}
        }

        if (!user) {
          // Upsert best‑effort
          try {
            await db.upsertUser({
              openId,
              email: decoded.email ?? null,
              name: (decoded as any).name ?? null,
              loginMethod: "google",
            } as any);
            const fetched = await db.getUserByOpenId(openId);
            if (fetched) user = fetched as unknown as User;
          } catch (e) {
            try {
              console.warn(
                "[Auth] DB upsertUser failed; falling back to ephemeral user",
                (e as any)?.message || e
              );
            } catch {}
          }
        }

        if (!user) {
          // Fallback efímero con claims del token (no persiste)
          const role = (decoded as any)?.role ?? "admin";
          const clientId =
            typeof (decoded as any)?.clientId === "number"
              ? (decoded as any).clientId
              : null;
          user = {
            id: 0,
            openId,
            email: decoded.email ?? null,
            name: (decoded as any).name ?? null,
            role,
            clientId,
            createdAt: new Date() as any,
            updatedAt: new Date() as any,
            lastSignedIn: new Date() as any,
            loginMethod: "google" as any,
            whatsapp: null as any,
          } as unknown as User;
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // 2) Autenticación vía token de acceso de cliente (enlace sin login)
  //    Solo se evalúa si no se autenticó por Firebase.
  // -------------------------------------------------------------------------
  if (!user) {
    const authHeader =
      opts.req.headers["authorization"] ||
      (opts.req.headers["Authorization" as any] as string | string[] | undefined);
    const header = Array.isArray(authHeader) ? authHeader[0] : authHeader;

    if (typeof header === "string" && header.startsWith("ClientToken ")) {
      const token = header.slice("ClientToken ".length).trim();
      try {
        const { validateClientToken } = await import("../auth/clientTokens");
        const client = await validateClientToken(token);

        if (client) {
          user = {
            id: 0,
            openId: `client-token:${client.id}`,
            email: (client as any).email ?? null,
            name: (client as any).nombreEmpresa ?? null,
            role: "client" as any,
            clientId: client.id as any,
            createdAt: new Date() as any,
            updatedAt: new Date() as any,
            lastSignedIn: new Date() as any,
            loginMethod: "client_token" as any,
            whatsapp: null as any,
          } as unknown as User;
        }
      } catch (e) {
        try {
          console.warn(
            "[Auth] validateClientToken failed; treating as anonymous",
            (e as any)?.message || e
          );
        } catch {}
      }
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
