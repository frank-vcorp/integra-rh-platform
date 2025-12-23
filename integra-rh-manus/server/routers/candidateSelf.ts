import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { candidates, workHistory } from "../../drizzle/schema";
import * as db from "../db";
import { normalizeWorkDateInput } from "../_core/workDate";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { storage as firebaseStorage } from "../firebase";

export const candidateSelfRouter = router({
  /**
   * Genera un enlace de captura self-service para un candidato.
   * Solo para usuarios internos con permisos de edición de candidatos.
   */
  createToken: protectedProcedure
    .input(
      z.object({
        candidateId: z.number().int(),
        ttlHours: z.number().int().min(1).max(48).default(6),
        baseUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { candidateId, ttlHours } = input;

      const candidate = await db.getCandidateById(candidateId);
      if (!candidate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Candidato no encontrado",
        });
      }

      const { token, expiresAt } = await db.createCandidateSelfToken(
        candidateId,
        ttlHours,
      );

      const base =
        input.baseUrl ??
        (process.env.PUBLIC_BASE_URL || "https://integra-rh.web.app");
      const url = `${base.replace(/\/$/, "")}/pre-registro/${token}`;

      return { token, url, expiresAt };
    }),

  /**
   * Obtiene los datos básicos necesarios para el formulario público
   * a partir de un token self-service.
   */
  getByToken: publicProcedure
    .input(z.object({ token: z.string().min(10) }))
    .query(async ({ input }) => {
      const tokenRow = await db.getCandidateSelfToken(input.token);
      if (!tokenRow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Enlace inválido",
        });
      }

      if (tokenRow.revoked) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Este enlace ya no está activo",
        });
      }

      const now = new Date();
      if (tokenRow.expiresAt <= now) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Este enlace ha expirado",
        });
      }

      const candidate = await db.getCandidateById(tokenRow.candidateId);
      if (!candidate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Candidato no encontrado",
        });
      }

      const history = await db.getWorkHistoryByCandidate(candidate.id);
      const allDocs = await db.getDocumentsByCandidate(candidate.id);
      const selfDocs = allDocs.filter(
        (d: any) => d.uploadedBy === "candidate-self-service",
      );

      return {
        candidate: {
          id: candidate.id,
          nombreCompleto: candidate.nombreCompleto,
          email: candidate.email,
          telefono: candidate.telefono,
          medioDeRecepcion: candidate.medioDeRecepcion,
          perfilDetalle: (candidate as any).perfilDetalle ?? null,
        },
        workHistory: history.map((h) => ({
          id: h.id,
          empresa: h.empresa,
          puesto: h.puesto,
          fechaInicio: h.fechaInicio,
          fechaFin: h.fechaFin,
          tiempoTrabajado: h.tiempoTrabajado,
          tiempoTrabajadoEmpresa: h.tiempoTrabajadoEmpresa,
        })),
        documents: selfDocs.map((d: any) => ({
          id: d.id,
          tipoDocumento: d.tipoDocumento,
          nombreArchivo: d.nombreArchivo,
          url: d.url,
          mimeType: d.mimeType,
          tamanio: d.tamanio,
        })),
        expiresAt: tokenRow.expiresAt,
      };
    }),

  /**
   * Autosave: guarda el perfil completo como borrador (draft).
   * Solo persiste los datos, sin marcar como completado.
   */
  autosave: publicProcedure
    .input(
      z.object({
        token: z.string().min(10),
        candidate: z
          .object({
            email: z.string().email().optional(),
            telefono: z.string().optional(),
          })
          .optional(),
        perfil: z.any().optional(), // Estructura anidada: { generales, domicilio, etc. }
        workHistory: z
          .array(
            z.object({
              id: z.number().int().optional(),
              empresa: z.string().min(1),
              puesto: z.string().optional(),
              fechaInicio: z.string().optional(),
              fechaFin: z.string().optional(),
              tiempoTrabajado: z.string().optional(),
              esActual: z.boolean().optional(),
            }),
          )
          .optional(),
        aceptoAvisoPrivacidad: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const tokenRow = await db.getCandidateSelfToken(input.token);
      if (!tokenRow || tokenRow.revoked) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Enlace inválido",
        });
      }

      const now = new Date();
      if (tokenRow.expiresAt <= now) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Este enlace ha expirado",
        });
      }

      const database = await getDb();
      if (!database) throw new Error("Database not available");

      // Leer perfilDetalle existente para preservar datos anteriores
      const candidate = await db.getCandidateById(tokenRow.candidateId);
      const existingPerfil = (candidate as any)?.perfilDetalle || {};

      // CAMBIO 2: Construir perfilDetalle como draft, mergeando EXPLÍCITAMENTE
      // solo las secciones que se envían, para preservar campos vaciados (strings vacíos)
      const draftPerfil: any = {
        ...existingPerfil, // Preservar campos no modificados
      };

      // Mergear secciones enviadas explícitamente
      if (input.perfil?.generales) {
        draftPerfil.generales = {
          ...existingPerfil?.generales,
          ...input.perfil.generales,
        };
      }
      if (input.perfil?.domicilio) {
        draftPerfil.domicilio = {
          ...existingPerfil?.domicilio,
          ...input.perfil.domicilio,
        };
      }
      if (input.perfil?.redesSociales) {
        draftPerfil.redesSociales = {
          ...existingPerfil?.redesSociales,
          ...input.perfil.redesSociales,
        };
      }
      if (input.perfil?.situacionFamiliar) {
        draftPerfil.situacionFamiliar = {
          ...existingPerfil?.situacionFamiliar,
          ...input.perfil.situacionFamiliar,
        };
      }
      if (input.perfil?.parejaNoviazgo) {
        draftPerfil.parejaNoviazgo = {
          ...existingPerfil?.parejaNoviazgo,
          ...input.perfil.parejaNoviazgo,
        };
      }
      if (input.perfil?.contactoEmergencia) {
        draftPerfil.contactoEmergencia = {
          ...existingPerfil?.contactoEmergencia,
          ...input.perfil.contactoEmergencia,
        };
      }
      if (input.perfil?.financieroAntecedentes) {
        draftPerfil.financieroAntecedentes = {
          ...existingPerfil?.financieroAntecedentes,
          ...input.perfil.financieroAntecedentes,
        };
      }


      // Agregar consentimiento si se proporciona
      if (input.aceptoAvisoPrivacidad !== undefined) {
        draftPerfil.consentimiento = {
          aceptoAvisoPrivacidad: input.aceptoAvisoPrivacidad,
          aceptoAvisoPrivacidadAt: input.aceptoAvisoPrivacidad ? new Date().toISOString() : undefined,
        };
      }

      // Guardar datos del candidato con perfilDetalle como draft
      if (input.candidate) {
        await database
          .update(candidates)
          .set({
            email: input.candidate.email,
            telefono: input.candidate.telefono,
            perfilDetalle: draftPerfil as any,
          } as any)
          .where(eq(candidates.id, tokenRow.candidateId));
      } else {
        await database
          .update(candidates)
          .set({
            perfilDetalle: draftPerfil as any,
          } as any)
          .where(eq(candidates.id, tokenRow.candidateId));
      }

      // Guardar historial laboral
      if (input.workHistory && input.workHistory.length > 0) {
        for (const item of input.workHistory) {
          const fechaInicioValue = normalizeWorkDateInput(item.fechaInicio) ?? "";
          const fechaFinValueRaw = item.esActual === true ? "" : (item.fechaFin ?? "");
          const fechaFinValue = fechaFinValueRaw ? (normalizeWorkDateInput(fechaFinValueRaw) ?? "") : "";

          if (item.id) {
            // Actualizar
            await database
              .update(workHistory)
              .set({
                empresa: item.empresa,
                puesto: item.puesto,
                fechaInicio: fechaInicioValue,
                fechaFin: fechaFinValue,
                tiempoTrabajado: item.tiempoTrabajado,
              })
              .where(
                and(
                  eq(workHistory.id, item.id),
                  eq(workHistory.candidatoId, tokenRow.candidateId),
                ),
              );
          } else {
            // Insertar nuevo
            await database.insert(workHistory).values({
              candidatoId: tokenRow.candidateId,
              empresa: item.empresa,
              puesto: item.puesto,
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

      console.log(`[candidateSelf.autosave] Draft guardado para candidato ${tokenRow.candidateId}`);
      return { ok: true };
    }),

  /**
   * Subida de documentos por el candidato usando el enlace self-service.
   * Los archivos se guardan asociados al candidato y marcados como
   * uploadedBy = "candidate-self-service".
   */
  uploadDocument: publicProcedure
    .input(
      z.object({
        token: z.string().min(10),
        tipoDocumento: z.string().min(1),
        fileName: z.string().min(1),
        contentType: z.string().optional(),
        base64: z.string(), // contenido en base64 sin prefijo data:
      }),
    )
    .mutation(async ({ input }) => {
      const tokenRow = await db.getCandidateSelfToken(input.token);
      if (!tokenRow || tokenRow.revoked) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Enlace inválido",
        });
      }

      const now = new Date();
      if (tokenRow.expiresAt <= now) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Este enlace ha expirado",
        });
      }

      const buffer = Buffer.from(input.base64, "base64");
      const maxBytes = 8 * 1024 * 1024; // ~8MB
      if (buffer.length > maxBytes) {
        throw new TRPCError({
          code: "PAYLOAD_TOO_LARGE",
          message: "El archivo es demasiado grande (máx. 8 MB).",
        });
      }

      const folder = `candidates/${tokenRow.candidateId}`;
      const key = `${folder}/${Date.now()}-${input.fileName}`;
      const bucket = firebaseStorage.bucket();
      const file = bucket.file(key);

      const contentType =
        input.contentType && input.contentType.length > 0
          ? input.contentType
          : "application/octet-stream";

      await file.save(buffer, {
        contentType,
        resumable: false,
        metadata: { contentType },
      });

      const [signedUrl] = await file.getSignedUrl({
        action: "read",
        expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      const id = await db.createDocument({
        candidatoId: tokenRow.candidateId,
        procesoId: undefined,
        tipoDocumento: input.tipoDocumento,
        nombreArchivo: input.fileName,
        url: signedUrl,
        fileKey: key,
        mimeType: contentType,
        tamanio: buffer.length,
        uploadedBy: "candidate-self-service",
      } as any);

      return { id, url: signedUrl };
    }),

  /**
   * Submit final – marca la captura como recibida.
   * La lógica completa de consentimiento y autosave detallado
   * se irá extendiendo sobre esta base.
   */
  submit: publicProcedure
    .input(
      z.object({
        token: z.string().min(10),
        aceptoAvisoPrivacidad: z.boolean(),
        candidate: z
          .object({
            email: z.string().email().optional(),
            telefono: z.string().optional(),
          })
          .optional(),
        perfil: z.any().optional(), // Permite cualquier estructura de perfil
        workHistory: z
          .array(
            z.object({
              id: z.number().int().optional(),
              empresa: z.string().min(1),
              puesto: z.string().optional(),
              fechaInicio: z.string().optional(),
              fechaFin: z.string().optional(),
              tiempoTrabajado: z.string().optional(),
              esActual: z.boolean().optional(),
            }),
          )
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      if (!input.aceptoAvisoPrivacidad) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Debes aceptar el aviso de privacidad para continuar",
        });
      }

      const tokenRow = await db.getCandidateSelfToken(input.token);
      if (!tokenRow || tokenRow.revoked) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Enlace inválido",
        });
      }

      const now = new Date();
      if (tokenRow.expiresAt <= now) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Este enlace ha expirado",
        });
      }

      const database = await getDb();
      if (!database) throw new Error("Database not available");

      // Leer perfilDetalle existente para preservar datos anteriores
      const candidate = await db.getCandidateById(tokenRow.candidateId);
      const existingPerfil = (candidate as any)?.perfilDetalle || {};

      // El frontend envía perfil ya estructurado: { generales, domicilio, etc. }
      // Mergeamos con datos anteriores y agregamos consentimiento actualizado
      const updatedPerfil: any = {
        ...existingPerfil, // Preservar datos anteriores
        generales: { ...existingPerfil.generales, ...(input.perfil?.generales || {}) },
        domicilio: { ...existingPerfil.domicilio, ...(input.perfil?.domicilio || {}) },
        redesSociales: { ...existingPerfil.redesSociales, ...(input.perfil?.redesSociales || {}) },
        situacionFamiliar: { ...existingPerfil.situacionFamiliar, ...(input.perfil?.situacionFamiliar || {}) },
        parejaNoviazgo: { ...existingPerfil.parejaNoviazgo, ...(input.perfil?.parejaNoviazgo || {}) },
        contactoEmergencia: { ...existingPerfil.contactoEmergencia, ...(input.perfil?.contactoEmergencia || {}) },
        financieroAntecedentes: { ...existingPerfil.financieroAntecedentes, ...(input.perfil?.financieroAntecedentes || {}) },
        consentimiento: {
          aceptoAvisoPrivacidad: input.aceptoAvisoPrivacidad,
          aceptoAvisoPrivacidadAt: new Date().toISOString(),
        },
      };
      
      // Log para debugging
      console.log(`[candidateSelf.submit] Guardando perfilDetalle para candidato ${tokenRow.candidateId}:`, JSON.stringify(updatedPerfil, null, 2));

      // Guardar datos del candidato
      if (input.candidate) {
        await database
          .update(candidates)
          .set({
            email: input.candidate.email,
            telefono: input.candidate.telefono,
            perfilDetalle: updatedPerfil as any,
            selfFilledStatus: "recibido",
            selfFilledAt: new Date(),
          } as any)
          .where(eq(candidates.id, tokenRow.candidateId));
      } else {
        await database
          .update(candidates)
          .set({
            perfilDetalle: updatedPerfil as any,
            selfFilledStatus: "recibido",
            selfFilledAt: new Date(),
          } as any)
          .where(eq(candidates.id, tokenRow.candidateId));
      }

      // Guardar historial laboral
      if (input.workHistory && input.workHistory.length > 0) {
        for (const item of input.workHistory) {
          const fechaInicioValue = normalizeWorkDateInput(item.fechaInicio) ?? "";
          const fechaFinValueRaw = item.esActual === true ? "" : (item.fechaFin ?? "");
          const fechaFinValue = fechaFinValueRaw ? (normalizeWorkDateInput(fechaFinValueRaw) ?? "") : "";

          if (item.id) {
            // Actualizar
            await database
              .update(workHistory)
              .set({
                empresa: item.empresa,
                puesto: item.puesto,
                fechaInicio: fechaInicioValue,
                fechaFin: fechaFinValue,
                tiempoTrabajado: item.tiempoTrabajado,
              })
              .where(
                and(
                  eq(workHistory.id, item.id),
                  eq(workHistory.candidatoId, tokenRow.candidateId),
                ),
              );
          } else {
            // Insertar nuevo
            await database.insert(workHistory).values({
              candidatoId: tokenRow.candidateId,
              empresa: item.empresa,
              puesto: item.puesto,
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

      await db.touchCandidateSelfTokenUsed(tokenRow.id);

      // Crear o actualizar registro de consentimiento
      const consent = await db.getLatestConsentByCandidateId(
        tokenRow.candidateId,
      );
      const nowMx = new Date();
      const ipAddress = "";
      const userAgent = "";

      if (!consent) {
        await db.createCandidateConsent({
          candidatoId: tokenRow.candidateId,
          token: tokenRow.token,
          expiresAt: tokenRow.expiresAt,
          isGiven: true,
          givenAt: nowMx,
          ipAddress,
          userAgent,
          signatureStoragePath: "",
          privacyPolicyVersion: "1.0.0",
        } as any);
      } else if (!consent.isGiven) {
        await db.updateCandidateConsent(consent.id, {
          isGiven: true,
          givenAt: nowMx,
          ipAddress,
          userAgent,
        });
      }

      // Notificar al analista
      const processes = await db.getProcessesByCandidate(
        tokenRow.candidateId,
      );
      if (processes && processes.length > 0) {
        const latest = processes[0];
        try {
          await db.createProcessComment({
            procesoId: latest.id as number,
            text:
              "El candidato completó su formulario de datos iniciales vía self-service.",
            author: "system:candidate-self-service",
          } as any);
        } catch (err) {
          console.error(
            "[candidateSelf.submit] no se pudo crear comentario automático",
            err,
          );
        }
      }

      return { ok: true };
    }),
});
