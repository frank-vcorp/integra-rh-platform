import { router, publicProcedure } from "../trpc.ts";
import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

export const clientPortalRouter = router({
  listDataByToken: publicProcedure
    .input(z.object({ token: z.string().min(10) }))
    .query(async ({ input }) => {
      const { validateClientToken } = await import("../auth/clientTokens");
      const client = await validateClientToken(input.token);

      if (!client) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or expired token" });
      }

      const [processes, candidates] = await Promise.all([
        db.getProcessesByClient(client.id),
        db.getCandidatesByClient(client.id),
      ]);

      return {
        client,
        processes,
        candidates,
      };
    }),
});

