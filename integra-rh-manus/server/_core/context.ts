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
  // Firebase ID token via Authorization: Bearer <token>
  {
    const authHeader = opts.req.headers["authorization"] || opts.req.headers["Authorization" as any];
    const header = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    if (typeof header === "string" && header.startsWith("Bearer ")) {
      const idToken = header.slice("Bearer ".length);
      let decoded: any | null = null;
      // 1) Verificar token (aislado de DB)
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
        // 2) Intentar cargar de DB (no derribar auth si falla DB)
        try {
          const existing = await db.getUserByOpenId(openId);
          if (existing) {
            user = existing as unknown as User;
          }
        } catch (e) {
          try {
            console.warn("[Auth] DB getUserByOpenId failed; continuing with token claims", (e as any)?.message || e);
          } catch {}
        }

        if (!user) {
          // 3) Intentar upsert best‑effort (ignorar fallo)
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
              console.warn("[Auth] DB upsertUser failed; falling back to ephemeral user", (e as any)?.message || e);
            } catch {}
          }
        }

        if (!user) {
          // 4) Fallback efímero con claims del token (no persiste)
          const role = (decoded as any)?.role ?? "admin";
          const clientId = typeof (decoded as any)?.clientId === "number" ? (decoded as any).clientId : null;
          user = {
            id: 0,
            openId,
            email: decoded.email ?? null,
            name: (decoded as any).name ?? null,
            role,
            clientId,
            // Campos requeridos por el tipo; valores de relleno
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

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}


