import { router, publicProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { add } from "date-fns";
import * as sendgrid from '../integrations/sendgrid';
import { storage as firebaseStorage } from "../firebase";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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

function buildConsentUrl(token: string): string {
  // Soportar configuraciones donde APP_BASE_URL/VITE_APP_URL puedan venir como "undefined"/"null"
  const rawBase =
    process.env.APP_BASE_URL ??
    process.env.VITE_APP_URL ??
    "";
  const safeBase =
    !rawBase || rawBase === "undefined" || rawBase === "null"
      ? "https://integra-rh.web.app"
      : rawBase;
  const normalizedBase = safeBase.replace(/\/$/, "");
  return `${normalizedBase}/consentir/${token}`;
}

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

      const consentUrl = buildConsentUrl(token);

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
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "El enlace es inválido o ha expirado.",
        });
      }

      const candidate = await db.getCandidateById(consent.candidatoId);
      if (!candidate) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No se encontró al candidato asociado.",
        });
      }

      // Upload signature image to storage
      const signatureBuffer = Buffer.from(input.signature, "base64");
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, "-");
      const signaturePath = `consents/${consent.candidatoId}/signature-${consent.id}-${timestamp}.png`;

      const bucket = firebaseStorage.bucket();
      const signatureFile = bucket.file(signaturePath);

      await signatureFile.save(signatureBuffer, {
        contentType: "image/png",
        resumable: false,
      });

      // Generate a simple unique digital signature code for this consent
      const digitalSignatureCode = `CONS-${consent.id}-${consent.token.slice(
        0,
        8,
      )}`;

      // Build a PDF with the privacy policy, candidate data and embedded signature image
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const { width, height } = page.getSize();

      let cursorY = height - 50;
      const marginX = 50;
      const lineHeight = 14;

      const drawText = (
        text: string,
        options: { bold?: boolean; size?: number } = {},
      ) => {
        const size = options.size ?? 12;
        const usedFont = options.bold ? fontBold : font;
        const maxWidth = width - marginX * 2;

        const words = text.split(/\s+/);
        let line = "";

        for (const word of words) {
          const testLine = line ? `${line} ${word}` : word;
          const textWidth = usedFont.widthOfTextAtSize(testLine, size);
          if (textWidth > maxWidth && line) {
            page.drawText(line, {
              x: marginX,
              y: cursorY,
              size,
              font: usedFont,
              color: rgb(0, 0, 0),
            });
            cursorY -= lineHeight;
            line = word;
          } else {
            line = testLine;
          }
        }

        if (line) {
          page.drawText(line, {
            x: marginX,
            y: cursorY,
            size,
            font: usedFont,
            color: rgb(0, 0, 0),
          });
          cursorY -= lineHeight;
        }
      };

      // Header
      drawText("Consentimiento para uso de datos personales", {
        bold: true,
        size: 16,
      });
      cursorY -= 10;

      drawText(`Candidato: ${candidate.nombreCompleto}`, { bold: true });
      if (candidate.email) {
        drawText(`Correo: ${candidate.email}`);
      }
      if (candidate.telefono) {
        drawText(`Teléfono: ${candidate.telefono}`);
      }
      drawText(
        `Fecha y hora de consentimiento: ${now.toLocaleString("es-MX", {
          timeZone: "America/Mexico_City",
        })}`,
      );
      drawText(
        `Firma digital única: ${digitalSignatureCode}`,
      );

      const ipAddress =
        (ctx.req.ip as string | undefined) ||
        (ctx.req.headers["x-forwarded-for"] as string | undefined) ||
        "";
      const userAgent =
        (ctx.req.headers["user-agent"] as string | undefined) || "";

      if (ipAddress) {
        drawText(`IP de origen: ${ipAddress}`);
      }
      if (userAgent) {
        drawText(`Navegador/Dispositivo: ${userAgent}`);
      }

      cursorY -= 10;
      drawText("Aviso de privacidad (versión " + PRIVACY_POLICY_VERSION + "):", {
        bold: true,
      });

      // Simple HTML-to-text conversion for the privacy policy
      const plainPolicy = PRIVACY_POLICY_TEXT.replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      drawText(plainPolicy);

      // Space for signature image
      cursorY -= 20;
      drawText("Firma autógrafa del candidato:", { bold: true });
      cursorY -= 10;

      try {
        const pngImage = await pdfDoc.embedPng(signatureBuffer);
        const pngDims = pngImage.scale(0.4);
        const sigWidth = Math.min(pngDims.width, width - marginX * 2);
        const scale = sigWidth / pngDims.width;
        const sigHeight = pngDims.height * scale;
        const sigY = Math.max(cursorY - sigHeight, 80);

        page.drawImage(pngImage, {
          x: marginX,
          y: sigY,
          width: sigWidth,
          height: sigHeight,
        });
      } catch {
        // Si falla la incrustación, continuamos; la imagen sigue en Storage
      }

      const pdfBytes = await pdfDoc.save();

      const pdfKey = `consents/${consent.candidatoId}/consent-${consent.id}-${timestamp}.pdf`;
      const pdfFile = bucket.file(pdfKey);
      await pdfFile.save(Buffer.from(pdfBytes), {
        contentType: "application/pdf",
        resumable: false,
      });

      const [signedUrl] = await pdfFile.getSignedUrl({
        action: "read",
        expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      // Register the PDF as a candidate document so it appears in the expediente
      try {
        await db.createDocument({
          candidatoId: consent.candidatoId,
          tipoDocumento: "CONSENTIMIENTO_DATOS_PERSONALES",
          nombreArchivo: `Consentimiento-datos-personales-${consent.candidatoId}.pdf`,
          url: signedUrl,
          fileKey: pdfKey,
          mimeType: "application/pdf",
          uploadedBy: candidate.nombreCompleto || "Candidato",
        } as any);
      } catch (err) {
        // No bloqueamos el flujo de consentimiento si falla solo el registro del documento
        console.error(
          "[CandidateConsent] Failed to create consent document record",
          err,
        );
      }

      // Update consent record in DB
      await db.updateCandidateConsent(consent.id, {
        isGiven: true,
        givenAt: now,
        ipAddress,
        userAgent,
        signatureStoragePath: signaturePath,
      });

      return {
        success: true,
        digitalSignature: digitalSignatureCode,
        pdfUrl: signedUrl,
      } as const;
    }),
});
