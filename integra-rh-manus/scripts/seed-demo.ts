import "dotenv/config";
import { sql } from "drizzle-orm";
import {
  getDb,
  createClient,
  createPost,
  createCandidate,
  createWorkHistory,
  createCandidateComment,
  createProcess,
  createProcessComment,
  createDocument,
  createUser,
  updateCandidate,
} from "../server/db";

async function ensureRecord<T>(
  finder: () => Promise<T | undefined>,
  creator: () => Promise<T>
) {
  const existing = await finder();
  if (existing) return existing;
  return creator();
}

function firstRow<T = any>(rows: any): T | undefined {
  if (!rows) return undefined;
  if (Array.isArray(rows)) {
    if (rows.length === 0) return undefined;
    const first = rows[0];
    if (Array.isArray(first)) {
      return first.length > 0 ? (first[0] as T) : undefined;
    }
    return first as T;
  }
  return rows as T;
}

async function main() {
  const db = await getDb();
  if (!db) throw new Error("No database connection");

  const psicoEmail = "frank.saavedra.marin@gmail.com";
  const psicoJsonUrl = "https://storage.googleapis.com/integra-rh-demo/candidates/psicometria-demo.json";
  const psicoJsonKey = "demo/psicometricos/psicometria-demo.json";
  const psicoPdfUrl = "https://storage.googleapis.com/integra-rh-demo/candidates/psicometria-demo.pdf";
  const psicoPdfKey = "demo/psicometricos/psicometria-demo.pdf";
  const psicometricResults = {
    bateria: "Wonderlic Demo",
    puntaje: 78,
    interpretacion: "Perfil analítico con excelente criterio.",
    conclusiones: [
      "Capacidad sobresaliente para resolución de problemas.",
      "Alto nivel de juicio frente a situaciones operativas.",
    ],
    estatus: "Completado",
    fechaReporte: new Date().toISOString(),
  };

  const demoClientName = "Sycom Demo Corp";
  const demoClient = await ensureRecord(
    async () => {
      const rows = await (db as any).execute(
        sql`SELECT * FROM clients WHERE nombreEmpresa = ${demoClientName} LIMIT 1`
      );
      return firstRow(rows);
    },
    async () => {
      const id = await createClient({
        nombreEmpresa: demoClientName,
        ubicacionPlaza: "CDMX",
        reclutador: "Paula León",
        contacto: "Gerente Recursos Humanos",
        telefono: "+52 55 1234 5678",
        email: "contacto@sycom-demo.com",
      });
      return await (db as any).execute(
        sql`SELECT * FROM clients WHERE id = ${id} LIMIT 1`
      ).then((rows: any) => firstRow(rows));
    }
  );

  const demoPostTitle = "Gerente de Operaciones Demo";
  const demoPost = await ensureRecord(
    async () => {
      const rows = await (db as any).execute(
        sql`SELECT * FROM posts WHERE nombreDelPuesto = ${demoPostTitle} LIMIT 1`
      );
      return firstRow(rows);
    },
    async () => {
      const id = await createPost({
        nombreDelPuesto: demoPostTitle,
        clienteId: demoClient.id,
        descripcion: "Responsable de coordinar evaluaciones, visitas y reportes.",
        estatus: "activo",
      });
      return await (db as any).execute(
        sql`SELECT * FROM posts WHERE id = ${id} LIMIT 1`
      ).then((rows: any) => firstRow(rows));
    }
  );

  const demoCandidateName = "Mariana Rodríguez Demo";
  const demoCandidate = await ensureRecord(
    async () => {
      const rows = await (db as any).execute(
        sql`SELECT * FROM candidates WHERE nombreCompleto = ${demoCandidateName} LIMIT 1`
      );
      return firstRow(rows);
    },
    async () => {
      const id = await createCandidate({
        nombreCompleto: demoCandidateName,
        email: psicoEmail,
        telefono: "+52 55 9876 5432",
        medioDeRecepcion: "Portal Integra RH",
        clienteId: demoClient.id,
        puestoId: demoPost.id,
        psicometricos: {
          clavePsicometricas: "DEM-PSICO-001",
          estatus: "Completado",
          fechaAsignacion: new Date().toISOString(),
          fechaEnvio: new Date().toISOString(),
          fechaFinalizacion: new Date().toISOString(),
          resultadosJson: psicometricResults,
          resultadoPdfUrl: psicoPdfUrl,
          resultadoPdfPath: psicoPdfKey,
        },
      } as any);
      await createWorkHistory({
        candidatoId: id,
        empresa: "Consultora XYZ",
        puesto: "Coordinadora de Evaluaciones",
        fechaInicio: "2019-01",
        fechaFin: "2024-08",
        tiempoTrabajado: "5 años 7 meses",
        causalSalidaRH: "RENUNCIA VOLUNTARIA",
        causalSalidaJefeInmediato: "RENUNCIA VOLUNTARIA",
        contactoReferencia: "Laura Torres",
        telefonoReferencia: "+52 55 1111 2222",
        correoReferencia: "laura.torres@example.com",
        resultadoVerificacion: "recomendable",
        observaciones: "Excelente desempeño y seguimiento.",
        estatusInvestigacion: "terminado",
        comentarioInvestigacion: "Referencias confirmadas por Paula sin observaciones.",
      } as any);
      await createCandidateComment({
        candidatoId: id,
        text: "Demostración: Paula revisó el expediente y agregó observaciones.",
        author: "Paula León",
        visibility: "internal",
      });
      await createDocument({
        candidatoId: id,
        tipoDocumento: "CV",
        nombreArchivo: "CV-Mariana-Rodriguez.pdf",
        url: "https://storage.googleapis.com/download/storage/v1/b/integra-rh-demo/o/cv-demo?alt=media",
        fileKey: "demo/cv-mariana.pdf",
        mimeType: "application/pdf",
        uploadedBy: "Demo Seeder",
      } as any);
      return await (db as any).execute(
        sql`SELECT * FROM candidates WHERE id = ${id} LIMIT 1`
      ).then((rows: any) => firstRow(rows));
    }
  );

  const demoCandidateId = Number((demoCandidate as any).id);
  if (!demoCandidateId) {
    throw new Error("Demo candidate does not have a valid ID");
  }

  if (demoCandidate.email !== psicoEmail || !demoCandidate.psicometricos?.resultadosJson) {
    await updateCandidate(demoCandidateId, {
      email: psicoEmail,
      psicometricos: {
        ...(demoCandidate.psicometricos || {}),
        clavePsicometricas: demoCandidate.psicometricos?.clavePsicometricas || "DEM-PSICO-001",
        estatus: "Completado",
        fechaAsignacion: demoCandidate.psicometricos?.fechaAsignacion || new Date().toISOString(),
        fechaEnvio: demoCandidate.psicometricos?.fechaEnvio || new Date().toISOString(),
        fechaFinalizacion: demoCandidate.psicometricos?.fechaFinalizacion || new Date().toISOString(),
        resultadosJson: psicometricResults,
        resultadoPdfUrl: psicoPdfUrl,
        resultadoPdfPath: psicoPdfKey,
      } as any,
    } as any);
  }

  await ensureRecord(
    async () => {
      const rows = await (db as any).execute(
        sql`SELECT * FROM documents WHERE candidatoId = ${demoCandidateId} AND tipoDocumento = ${"PSICOMETRICO_JSON"} LIMIT 1`
      );
      return firstRow(rows);
    },
    async () => {
      const id = await createDocument({
        candidatoId: demoCandidateId,
        tipoDocumento: "PSICOMETRICO_JSON",
        nombreArchivo: "psicometria-demo.json",
        url: psicoJsonUrl,
        fileKey: psicoJsonKey,
        mimeType: "application/json",
        uploadedBy: "Demo Seeder",
      } as any);
      return await (db as any).execute(
        sql`SELECT * FROM documents WHERE id = ${id} LIMIT 1`
      ).then((rows: any) => firstRow(rows));
    }
  );

  await ensureRecord(
    async () => {
      const rows = await (db as any).execute(
        sql`SELECT * FROM documents WHERE candidatoId = ${demoCandidateId} AND tipoDocumento = ${"PSICOMETRICO"} LIMIT 1`
      );
      return firstRow(rows);
    },
    async () => {
      const id = await createDocument({
        candidatoId: demoCandidateId,
        tipoDocumento: "PSICOMETRICO",
        nombreArchivo: "psicometria-demo.pdf",
        url: psicoPdfUrl,
        fileKey: psicoPdfKey,
        mimeType: "application/pdf",
        uploadedBy: "Demo Seeder",
      } as any);
      return await (db as any).execute(
        sql`SELECT * FROM documents WHERE id = ${id} LIMIT 1`
      ).then((rows: any) => firstRow(rows));
    }
  );

  const processClave = "DEM-2025-001";
  const demoProcess = await ensureRecord(
    async () => {
      const rows = await (db as any).execute(
        sql`SELECT * FROM processes WHERE clave = ${processClave} LIMIT 1`
      );
      return firstRow(rows);
    },
    async () => {
      const id = await createProcess({
        candidatoId: demoCandidateId,
        clienteId: demoClient.id,
        puestoId: demoPost.id,
        especialistaAtraccionNombre: "Mariana Miramontes",
        clave: processClave,
        tipoProducto: "ILA",
        consecutivo: 1,
        fechaRecepcion: new Date(),
        fechaCierre: new Date(),
        medioDeRecepcion: "portal",
        estatusProceso: "en_dictamen",
        calificacionFinal: "pendiente",
        estatusVisual: "en_proceso",
        investigacionLaboral: {
          resultado: "Concluido",
          detalles: "Sin incidencias, referencias positivas.",
          completado: true,
        },
        investigacionLegal: {
          antecedentes: "Sin antecedentes",
          flagRiesgo: false,
        },
        buroCredito: {
          estatus: "Historial positivo",
          aprobado: true,
        },
        visitaDetalle: {
          tipo: "presencial",
          comentarios: "Visita realizada sin novedades.",
          fechaRealizacion: new Date().toISOString(),
        },
        visitStatus: {
          status: "realizada",
          scheduledDateTime: new Date().toISOString(),
          direccion: "Av. Reforma 123, CDMX",
          observaciones: "Domicilio verificado y en orden.",
        },
      } as any);
      await createProcessComment({
        procesoId: id,
        text: "El cliente solicitó dictamen para el viernes.",
        author: "Paula León",
        processStatusAtTime: "en_dictamen",
      });
      await createDocument({
        procesoId: id,
        tipoDocumento: "DICTAMEN",
        nombreArchivo: "dictamen-demo.pdf",
        url: "https://storage.googleapis.com/download/storage/v1/b/integra-rh-demo/o/dictamen-demo?alt=media",
        fileKey: "demo/dictamen.pdf",
        mimeType: "application/pdf",
        uploadedBy: "Demo Seeder",
      } as any);
      return await (db as any).execute(
        sql`SELECT * FROM processes WHERE id = ${id} LIMIT 1`
      ).then((rows: any) => firstRow(rows));
    }
  );

  await ensureRecord(
    async () => {
      const rows = await (db as any).execute(
        sql`SELECT * FROM users WHERE email = ${"demo.admin@integra-rh.com"} LIMIT 1`
      );
      return firstRow(rows);
    },
    async () => {
      const id = await createUser({
        name: "Administrador Demo",
        email: "demo.admin@integra-rh.com",
        role: "admin" as any,
        whatsapp: "+52 55 4444 5555",
      } as any);
      return { id };
    }
  );

  await ensureRecord(
    async () => {
      const rows = await (db as any).execute(
        sql`SELECT * FROM users WHERE email = ${"cliente.demo@sycom.com"} LIMIT 1`
      );
      return firstRow(rows);
    },
    async () => {
      const id = await createUser({
        name: "Cliente Demo Sycom",
        email: "cliente.demo@sycom.com",
        role: "client" as any,
        clientId: demoClient.id,
      } as any);
      return { id };
    }
  );

  console.log("Demo client:", demoClient);
  console.log("Demo post:", demoPost);
  console.log("Demo candidate:", demoCandidate);
  console.log("Demo process:", demoProcess);
  console.log("Usuarios demo creados: demo.admin@integra-rh.com, cliente.demo@sycom.com");
}

main().then(() => {
  console.log("Seed demo completed");
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
