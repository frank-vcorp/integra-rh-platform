import { router, publicProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { add } from "date-fns";
import * as sendgrid from '../integrations/sendgrid';
import { storage as firebaseStorage } from "../firebase";

const PRIVACY_POLICY_VERSION = "1.0.0";
const PRIVACY_POLICY_TEXT = `
  <h1>Aviso de Privacidad Integral</h1>
  <p><strong>SINERGIA RH - SOLUCIONES DE RECURSOS HUMANOS (PAULA LEON)</strong>, con domicilio en [Domicilio Completo], es el responsable del uso y protección de sus datos personales, y al respecto le informamos lo siguiente:</p>
  <h2>¿Para qué fines utilizaremos sus datos personales?</h2>
  <p>Los datos personales que recabamos de usted, los utilizaremos para las siguientes finalidades que son necesarias para el servicio que solicita:</p>
  <ul>
    <li>Procesos de reclutamiento, evaluación y selección de personal.</li>
    <li>Realización de estudios socioeconómicos y validación de referencias laborales.</li>
    <li>Verificación de antecedentes laborales y personales.</li>
    <li>Generación de dictámenes de viabilidad para contratación.</li>
    <li>Contacto para seguimiento de procesos de selección.</li>
  </ul>
  <p>De manera adicional, utilizaremos su información personal para las siguientes finalidades que no son necesarias para el servicio solicitado, pero que nos permiten y facilitan brindarle una mejor atención:</p>
  <ul>
    <li>Fines estadísticos y de mejora de nuestros servicios.</li>
  </ul>
  <p>En caso de que no desee que sus datos personales sean tratados para estos fines adicionales, desde este momento usted nos puede comunicar lo anterior.</p>
  <h2>¿Qué datos personales utilizaremos para estos fines?</h2>
  <p>Para llevar a cabo las finalidades descritas en el presente aviso de privacidad, utilizaremos los siguientes datos personales: nombre completo, domicilio, fecha de nacimiento, nacionalidad, estado civil, correo electrónico, teléfono, historial académico, historial laboral, referencias personales y laborales, y datos contenidos en su CV.</p>
  <p>...</p>
  <p>Al firmar a continuación, usted confirma que ha leído, entiende y acepta los términos de este aviso de privacidad y otorga su consentimiento expreso para el tratamiento de sus datos personales en los términos aquí descritos.</p>
  <p>Última actualización: ${PRIVACY_POLICY_VERSION}</p>
`;

export const candidateConsentRouter = router({

  /**
   * Generates a consent link and sends it to the candidate.
   * Only accessible by admins.
   */
  sendConsentLink: adminProcedure
    .input(z.object({ 
      candidateId: z.number(),
      candidateEmail: z.string().email(),
      candidateName: z.string(),
    }))
    .mutation(async ({ input }) => {
      const token = nanoid(32);
      const expiresAt = add(new Date(), { days: 7 });

      await db.createCandidateConsent({
        candidatoId: input.candidateId,
        token,
        expiresAt,
        privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      });

      const consentUrl = `${process.env.VITE_APP_URL}/consentir/${token}`;

      await sendgrid.enviarCorreoConsentimiento({
        candidatoEmail: input.candidateEmail,
        candidatoNombre: input.candidateName,
        consentUrl,
      });

      return { success: true, consentUrl };
    }),

  /**
   * Retrieves the necessary data for a candidate to give consent.
   * This is a public procedure, accessible via the unique token.
   */
  getConsentDataByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const consent = await db.getLatestPendingConsentByToken(input.token);

      if (!consent || consent.isGiven || consent.expiresAt < new Date()) {
        throw new TRPCError({ code: "NOT_FOUND", message: "El enlace es inválido o ha expirado." });
      }
      
      const candidate = await db.getCandidateById(consent.candidatoId);
      if (!candidate) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo encontrar al candidato asociado." });
      }

      return {
        candidateName: candidate.nombreCompleto,
        privacyPolicyVersion: consent.privacyPolicyVersion,
        privacyPolicyText: PRIVACY_POLICY_TEXT,
      };
    }),

  /**
   * Retrieves the latest consent status for a given candidate.
   * Only accessible by admins.
   */
  getConsentByCandidateId: adminProcedure
    .input(z.object({ candidateId: z.number() }))
    .query(async ({ input }) => {
      const consent = await db.getLatestConsentByCandidateId(input.candidateId);
      return consent || null;
    }),
  
  /**
   * Submits the consent from the candidate.
   * This is a public procedure.
   */
  submitConsent: publicProcedure
    .input(z.object({
      token: z.string(),
      signature: z.string(), // base64 encoded image string (without data prefix)
    }))
    .mutation(async ({ input, ctx }) => {
      const consent = await db.getLatestPendingConsentByToken(input.token);

      if (!consent || consent.isGiven || consent.expiresAt < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "El enlace es inválido o ha expirado." });
      }
      
      // Upload signature to storage
      const buffer = Buffer.from(input.signature, 'base64');
      const signaturePath = `consents/${consent.candidatoId}/signature-${consent.id}-${Date.now()}.png`;
      
      const bucket = firebaseStorage.bucket();
      const file = bucket.file(signaturePath);
      
      await file.save(buffer, {
        contentType: 'image/png',
        resumable: false,
      });

      // Update consent record in DB
      await db.updateCandidateConsent(consent.id, {
        isGiven: true,
        givenAt: new Date(),
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers['user-agent'],
        signatureStoragePath: signaturePath,
      });

      return { success: true };
    }),
});
