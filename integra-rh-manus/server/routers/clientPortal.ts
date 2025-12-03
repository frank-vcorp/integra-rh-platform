import { router, publicProcedure } from "../trpc.ts";
import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import { logAuditEvent } from "../_core/audit";

function parseUserAgent(ua: string | undefined) {
  if (!ua) return { device: "unknown", os: "unknown" };
  const lower = ua.toLowerCase();
  const isMobile = /mobile|iphone|ipad|android/.test(lower);
  let os = "unknown";
  if (lower.includes("android")) os = "android";
  else if (lower.includes("iphone") || lower.includes("ipad") || lower.includes("ios")) os = "ios";
  else if (lower.includes("windows")) os = "windows";
  else if (lower.includes("macintosh") || lower.includes("mac os")) os = "macos";
  else if (lower.includes("linux")) os = "linux";
  return { device: isMobile ? "mobile" : "desktop", os };
}

export const clientPortalRouter = router({
  listDataByToken: publicProcedure
    .input(z.object({ token: z.string().min(10) }))
    .query(async ({ input, ctx }) => {
      const { validateClientToken } = await import("../auth/clientTokens");
      const client = await validateClientToken(input.token);

      if (!client) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or expired token" });
      }

      const [processes, candidates] = await Promise.all([
        db.getProcessesByClient(client.id),
        db.getCandidatesByClient(client.id),
      ]);

      const ua = ctx.req.headers["user-agent"] as string | undefined;
      const deviceInfo = parseUserAgent(ua);

      await logAuditEvent(ctx as any, {
        action: "client_link_access",
        entityType: "client_portal",
        entityId: client.id,
        details: {
          token: input.token,
          device: deviceInfo.device,
          os: deviceInfo.os,
          userAgent: ua,
        },
      });

      return {
        client,
        processes,
        candidates,
      };
    }),
});
