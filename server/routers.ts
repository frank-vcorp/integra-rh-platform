import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";

// ============================================================================
// HELPER: Admin-only procedure
// ============================================================================

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ 
      code: 'FORBIDDEN',
      message: 'Solo administradores pueden realizar esta acción'
    });
  }
  return next({ ctx });
});

// ============================================================================
// HELPER: Client procedure (admin or client viewing their own data)
// ============================================================================

const clientProcedure = protectedProcedure.use(({ ctx, next }) => {
  return next({ ctx });
});

// ============================================================================
// ROUTERS
// ============================================================================

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ==========================================================================
  // CLIENTES
  // ==========================================================================
  
  clients: router({
    list: clientProcedure.query(async ({ ctx }) => {
      // Si es admin, ver todos. Si es cliente, solo ver el suyo
      if (ctx.user.role === 'admin') {
        return db.getAllClients();
      } else if (ctx.user.clientId) {
        const client = await db.getClientById(ctx.user.clientId);
        return client ? [client] : [];
      }
      return [];
    }),

    getById: clientProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const client = await db.getClientById(input.id);
        
        // Verificar permisos
        if (ctx.user.role === 'client' && ctx.user.clientId !== input.id) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        
        return client;
      }),

    create: adminProcedure
      .input(z.object({
        nombreEmpresa: z.string().min(1),
        ubicacionPlaza: z.string().optional(),
        reclutador: z.string().optional(),
        contacto: z.string().optional(),
        telefono: z.string().optional(),
        email: z.string().email().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createClient(input);
        return { id };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          nombreEmpresa: z.string().min(1).optional(),
          ubicacionPlaza: z.string().optional(),
          reclutador: z.string().optional(),
          contacto: z.string().optional(),
          telefono: z.string().optional(),
          email: z.string().email().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await db.updateClient(input.id, input.data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteClient(input.id);
        return { success: true };
      }),
  }),

  // ==========================================================================
  // PUESTOS
  // ==========================================================================
  
  posts: router({
    list: clientProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === 'admin') {
        return db.getAllPosts();
      } else if (ctx.user.clientId) {
        return db.getPostsByClient(ctx.user.clientId);
      }
      return [];
    }),

    getByClient: clientProcedure
      .input(z.object({ clienteId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role === 'client' && ctx.user.clientId !== input.clienteId) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        return db.getPostsByClient(input.clienteId);
      }),

    create: adminProcedure
      .input(z.object({
        nombreDelPuesto: z.string().min(1),
        clienteId: z.number(),
        descripcion: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createPost(input);
        return { id };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          nombreDelPuesto: z.string().min(1).optional(),
          clienteId: z.number().optional(),
          descripcion: z.string().optional(),
          estatus: z.enum(["activo", "cerrado", "pausado"]).optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await db.updatePost(input.id, input.data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deletePost(input.id);
        return { success: true };
      }),
  }),

  // ==========================================================================
  // CANDIDATOS
  // ==========================================================================
  
  candidates: router({
    list: clientProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === 'admin') {
        return db.getAllCandidates();
      } else if (ctx.user.clientId) {
        return db.getCandidatesByClient(ctx.user.clientId);
      }
      return [];
    }),

    getById: clientProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const candidate = await db.getCandidateById(input.id);
        
        if (ctx.user.role === 'client' && candidate?.clienteId !== ctx.user.clientId) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        
        return candidate;
      }),

    create: adminProcedure
      .input(z.object({
        nombreCompleto: z.string().min(1),
        email: z.string().email().optional(),
        telefono: z.string().optional(),
        medioDeRecepcion: z.string().optional(),
        clienteId: z.number().optional(),
        puestoId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createCandidate(input);
        return { id };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          nombreCompleto: z.string().min(1).optional(),
          email: z.string().email().optional(),
          telefono: z.string().optional(),
          medioDeRecepcion: z.string().optional(),
          clienteId: z.number().optional(),
          puestoId: z.number().optional(),
          psicometricos: z.any().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await db.updateCandidate(input.id, input.data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCandidate(input.id);
        return { success: true };
      }),
  }),

  // ==========================================================================
  // HISTORIAL LABORAL
  // ==========================================================================
  
  workHistory: router({
    getByCandidate: clientProcedure
      .input(z.object({ candidatoId: z.number() }))
      .query(async ({ input, ctx }) => {
        // Verificar que el cliente tenga acceso al candidato
        if (ctx.user.role === 'client') {
          const candidate = await db.getCandidateById(input.candidatoId);
          if (candidate?.clienteId !== ctx.user.clientId) {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
        }
        return db.getWorkHistoryByCandidate(input.candidatoId);
      }),

    create: adminProcedure
      .input(z.object({
        candidatoId: z.number(),
        empresa: z.string().min(1),
        puesto: z.string().optional(),
        fechaInicio: z.string().optional(),
        fechaFin: z.string().optional(),
        tiempoTrabajado: z.string().optional(),
        contactoReferencia: z.string().optional(),
        telefonoReferencia: z.string().optional(),
        correoReferencia: z.string().email().optional(),
        resultadoVerificacion: z.enum(["pendiente", "recomendable", "con_reservas", "no_recomendable"]).optional(),
        observaciones: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createWorkHistory(input);
        return { id };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          empresa: z.string().min(1).optional(),
          puesto: z.string().optional(),
          fechaInicio: z.string().optional(),
          fechaFin: z.string().optional(),
          tiempoTrabajado: z.string().optional(),
          contactoReferencia: z.string().optional(),
          telefonoReferencia: z.string().optional(),
          correoReferencia: z.string().email().optional(),
          resultadoVerificacion: z.enum(["pendiente", "recomendable", "con_reservas", "no_recomendable"]).optional(),
          observaciones: z.string().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await db.updateWorkHistory(input.id, input.data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteWorkHistory(input.id);
        return { success: true };
      }),
  }),

  // ==========================================================================
  // COMENTARIOS DE CANDIDATOS
  // ==========================================================================
  
  candidateComments: router({
    getByCandidate: clientProcedure
      .input(z.object({ candidatoId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role === 'client') {
          const candidate = await db.getCandidateById(input.candidatoId);
          if (candidate?.clienteId !== ctx.user.clientId) {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
        }
        return db.getCandidateComments(input.candidatoId);
      }),

    create: adminProcedure
      .input(z.object({
        candidatoId: z.number(),
        text: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createCandidateComment({
          ...input,
          author: ctx.user.name || ctx.user.email || 'Admin',
        });
        return { id };
      }),
  }),

  // ==========================================================================
  // PROCESOS
  // ==========================================================================
  
  processes: router({
    list: clientProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === 'admin') {
        return db.getAllProcesses();
      } else if (ctx.user.clientId) {
        return db.getProcessesByClient(ctx.user.clientId);
      }
      return [];
    }),

    getById: clientProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const process = await db.getProcessById(input.id);
        
        if (ctx.user.role === 'client' && process?.clienteId !== ctx.user.clientId) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        
        return process;
      }),

    getByCandidate: clientProcedure
      .input(z.object({ candidatoId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role === 'client') {
          const candidate = await db.getCandidateById(input.candidatoId);
          if (candidate?.clienteId !== ctx.user.clientId) {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
        }
        return db.getProcessesByCandidate(input.candidatoId);
      }),

    create: adminProcedure
      .input(z.object({
        candidatoId: z.number(),
        clienteId: z.number(),
        puestoId: z.number(),
        tipoProducto: z.enum(["ILA", "ESE"]),
        fechaRecepcion: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        const fechaRecepcion = input.fechaRecepcion || new Date();
        const year = fechaRecepcion.getFullYear();
        
        // Generar consecutivo automático
        const consecutivo = await db.getNextConsecutive(input.tipoProducto, year);
        
        // Generar clave (ej: ILA-2025-001)
        const clave = `${input.tipoProducto}-${year}-${String(consecutivo).padStart(3, '0')}`;
        
        const id = await db.createProcess({
          ...input,
          fechaRecepcion,
          consecutivo,
          clave,
        });
        
        return { id, clave };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          estatusProceso: z.enum([
            "en_recepcion",
            "asignado",
            "en_verificacion",
            "visita_programada",
            "visita_realizada",
            "en_dictamen",
            "finalizado",
            "entregado"
          ]).optional(),
          calificacionFinal: z.enum(["pendiente", "recomendable", "con_reservas", "no_recomendable"]).optional(),
          fechaEnvio: z.date().optional(),
          quienEnvio: z.string().optional(),
          archivoDictamenUrl: z.string().optional(),
          archivoDictamenPath: z.string().optional(),
          visitStatus: z.any().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await db.updateProcess(input.id, input.data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteProcess(input.id);
        return { success: true };
      }),
  }),

  // ==========================================================================
  // COMENTARIOS DE PROCESOS
  // ==========================================================================
  
  processComments: router({
    getByProcess: clientProcedure
      .input(z.object({ procesoId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role === 'client') {
          const process = await db.getProcessById(input.procesoId);
          if (process?.clienteId !== ctx.user.clientId) {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
        }
        return db.getProcessComments(input.procesoId);
      }),

    create: adminProcedure
      .input(z.object({
        procesoId: z.number(),
        text: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const process = await db.getProcessById(input.procesoId);
        const id = await db.createProcessComment({
          ...input,
          author: ctx.user.name || ctx.user.email || 'Admin',
          processStatusAtTime: process?.estatusProceso || '',
        });
        return { id };
      }),
  }),

  // ==========================================================================
  // ENCUESTADORES
  // ==========================================================================
  
  surveyors: router({
    list: adminProcedure.query(() => db.getAllSurveyors()),
    
    listActive: adminProcedure.query(() => db.getActiveSurveyors()),

    create: adminProcedure
      .input(z.object({
        nombre: z.string().min(1),
        telefono: z.string().optional(),
        email: z.string().email().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createSurveyor(input);
        return { id };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          nombre: z.string().min(1).optional(),
          telefono: z.string().optional(),
          email: z.string().email().optional(),
          activo: z.boolean().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await db.updateSurveyor(input.id, input.data);
        return { success: true };
      }),
  }),

  // ==========================================================================
  // PAGOS
  // ==========================================================================
  
  payments: router({
    list: adminProcedure.query(() => db.getAllPayments()),

    getByProcess: adminProcedure
      .input(z.object({ procesoId: z.number() }))
      .query(({ input }) => db.getPaymentsByProcess(input.procesoId)),

    getBySurveyor: adminProcedure
      .input(z.object({ encuestadorId: z.number() }))
      .query(({ input }) => db.getPaymentsBySurveyor(input.encuestadorId)),

    create: adminProcedure
      .input(z.object({
        procesoId: z.number(),
        encuestadorId: z.number(),
        monto: z.number(),
        metodoPago: z.string().optional(),
        observaciones: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createPayment(input);
        return { id };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          fechaPago: z.date().optional(),
          estatusPago: z.enum(["pendiente", "pagado"]).optional(),
          metodoPago: z.string().optional(),
          observaciones: z.string().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await db.updatePayment(input.id, input.data);
        return { success: true };
      }),
  }),

  // ==========================================================================
  // DOCUMENTOS
  // ==========================================================================
  
  documents: router({
    getByCandidate: clientProcedure
      .input(z.object({ candidatoId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role === 'client') {
          const candidate = await db.getCandidateById(input.candidatoId);
          if (candidate?.clienteId !== ctx.user.clientId) {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
        }
        return db.getDocumentsByCandidate(input.candidatoId);
      }),

    getByProcess: clientProcedure
      .input(z.object({ procesoId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role === 'client') {
          const process = await db.getProcessById(input.procesoId);
          if (process?.clienteId !== ctx.user.clientId) {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
        }
        return db.getDocumentsByProcess(input.procesoId);
      }),

    create: adminProcedure
      .input(z.object({
        candidatoId: z.number().optional(),
        procesoId: z.number().optional(),
        tipoDocumento: z.string(),
        nombreArchivo: z.string(),
        url: z.string(),
        fileKey: z.string(),
        mimeType: z.string().optional(),
        tamanio: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createDocument({
          ...input,
          uploadedBy: ctx.user.name || ctx.user.email || 'Admin',
        });
        return { id };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDocument(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
