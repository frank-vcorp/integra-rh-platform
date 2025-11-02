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
      try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        // Try to load user from DB if available
        const openId = decoded.uid;
        const existing = await db.getUserByOpenId(openId);
        if (existing) {
          user = existing as unknown as User;
        } else {
          // Upsert (best-effort) and create a minimal user object
          await db.upsertUser({
            openId,
            email: decoded.email ?? null,
            name: (decoded as any).name ?? null,
            loginMethod: "google",
          } as any);
          const fetched = await db.getUserByOpenId(openId);
          user = (fetched ?? {
            id: 0,
            openId,
            email: decoded.email ?? null,
            name: (decoded as any).name ?? null,
            role: "admin",
            clientId: null,
          }) as unknown as User;
        }
      } catch (err) {
        console.warn("[Auth] Firebase verifyIdToken failed", err);
        // keep user as null
      }
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}


