import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { invokeLLM } from "./llm";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  improveText: adminProcedure
    .input(z.object({ text: z.string() }))
    .mutation(async ({ input }) => {
      if (!input.text.trim()) {
        return { improvedText: input.text };
      }
      try {
        const result = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "Eres un asistente de redacción experto. Corrige la ortografía, gramática y coherencia del siguiente texto. Mantén el tono profesional. No agregues saludos, explicaciones ni notas adicionales. Devuelve ÚNICAMENTE el texto corregido. Si el texto ya es correcto, devuélvelo tal cual."
            },
            { role: "user", content: input.text }
          ]
        });

        const response = result.choices[0]?.message?.content;
        let improvedText = "";
        
        if (Array.isArray(response)) {
          improvedText = response
            .map(c => typeof c === 'string' ? c : (c.type === 'text' ? c.text : ''))
            .join('');
        } else {
          improvedText = response || "";
        }

        return { improvedText: improvedText.trim() };
      } catch (err) {
        console.error("Error al mejorar redacción con IA:", err);
        throw new Error("No se pudo mejorar la redacción. Intente nuevamente más tarde.");
      }
    }),
});
