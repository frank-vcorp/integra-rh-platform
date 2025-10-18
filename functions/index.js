// Herramientas de Firebase
const {onCall, HttpsError, onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {getStorage} = require("firebase-admin/storage");

// Herramientas externas
const axios = require("axios");
const { URLSearchParams } = require("url");
const sgMail = require('@sendgrid/mail');

// Inicializamos los servicios de Firebase Admin
initializeApp();

/**
 * Asigna pruebas, registra en Psicométricas y envía la invitación por correo.
 */
exports.asignarPruebasPsicometricas = onCall(async (request) => {
  try {
    if (!process.env.SENDGRID_API_KEY) { throw new HttpsError('internal', 'La API Key de SendGrid no está configurada.'); }
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const { candidatoId, tests } = request.data;
    if (!candidatoId || !tests) { throw new HttpsError('invalid-argument', 'Falta ID de candidato o tests.'); }

    const db = getFirestore();
    const candidatoRef = db.collection("candidates").doc(candidatoId);
    const doc = await candidatoRef.get();
    if (!doc.exists) { throw new HttpsError('not-found', 'Candidato no encontrado.'); }
    
    const candidatoData = doc.data();
    const datosParaAPI = {
      Token: process.env.PSICOMETRICAS_TOKEN, Password: process.env.PSICOMETRICAS_PASSWORD,
      Candidate: candidatoData.nombreCompleto, Email: candidatoData.email,
      Vacancy: candidatoData.puestoAplicado, Tests: tests, Lang: "mx",
    };

    const formBody = new URLSearchParams(datosParaAPI).toString();
    const apiResponse = await axios.post("https://admin.psicometricas.mx/api/agregaCandidato", formBody, { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
    
    const clavePsicometricas = apiResponse.data.clave;
    await candidatoRef.set({ psicometricos: { clavePsicometricas, estatus: "Asignado", fechaAsignacion: new Date().toISOString() } }, { merge: true });
    
    const urlPrueba = `https://evaluacion.psicometrica.mx/login/${clavePsicometricas}`;
    const emailHtml = `<h4><strong>Buenas tardes ${candidatoData.nombreCompleto}</strong></h4><p>Le han asignado unas pruebas psicométricas. Por favor, contéstelas dando clic en el siguiente botón:</p><br><a style="background: #f20; text-decoration: none; color: #FFF; padding: 10px 15px;" href="${urlPrueba}" target="_blank">Contestar evaluación psicométrica</a><br><br><p>También puede ingresar con la siguiente clave:</p><h3>Clave: <b>${clavePsicometricas}</b></h3><p>Asegúrese de estar en un lugar tranquilo. ¡Mucho éxito!</p>`;
    
    const msg = { to: candidatoData.email, from: 'frank@vcorp.mx', subject: `Invitación a Pruebas Psicométricas`, html: emailHtml };
    await sgMail.send(msg);

    await candidatoRef.set({ psicometricos: { estatus: "Invitación Enviada", fechaEnvio: new Date().toISOString() } }, { merge: true });
    
    return { success: true, message: "Pruebas asignadas y correo enviado.", data: apiResponse.data };
  } catch (error) {
    const errorMsg = error.message || "Error desconocido.";
    logger.error("¡FALLO EL PROCESO DE ASIGNACIÓN!", error);
    throw new HttpsError('unknown', errorMsg, error);
  }
});

/**
 * Reenvía el correo de invitación a un candidato.
 */
exports.reenviarInvitacion = onCall(async (request) => {
  const { candidatoId } = request.data;
  if (!candidatoId) { throw new HttpsError('invalid-argument', 'Falta el ID del candidato.'); }

  const db = getFirestore();
  const candidatoRef = db.collection("candidates").doc(candidatoId);

  try {
    if (!process.env.SENDGRID_API_KEY) { throw new HttpsError('internal', 'La API Key de SendGrid no está configurada.'); }
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const doc = await candidatoRef.get();
    if (!doc.exists || !doc.data().psicometricos) { throw new HttpsError('not-found', 'Candidato no encontrado o sin pruebas asignadas.'); }
    
    const candidatoData = doc.data();
    const clavePsicometricas = candidatoData.psicometricos.clavePsicometricas;

    const urlPrueba = `https://evaluacion.psicometrica.mx/login/${clavePsicometricas}`;
    const emailHtml = `<h4><strong>Recordatorio: Buenas tardes ${candidatoData.nombreCompleto}</strong></h4><p>Le reenviamos la invitación para sus pruebas psicométricas.</p><a href="${urlPrueba}">Contestar evaluación</a><p>Clave: <b>${clavePsicometricas}</b></p>`;
    
    const msg = { to: candidatoData.email, from: 'frank@vcorp.mx', subject: `Recordatorio: Invitación a Pruebas Psicométricas`, html: emailHtml };
    await sgMail.send(msg);

    logger.info(`Correo de invitación REENVIADO a ${candidatoData.email}`);
    return { success: true, message: `Correo reenviado a ${candidatoData.email}` };
  } catch (error) {
    logger.error("FALLO el reenvío de correo:", error);
    throw new HttpsError('unknown', 'Ocurrió un error al reenviar el correo.', error);
  }
});

/**
 * Webhook que recibe la notificación de Psicométricas cuando un candidato termina.
 */
exports.webhookResultadosPsicometricas = onRequest(async (request, response) => {
    const { clave, practica } = request.body;

    if (!clave) {
        logger.error("Llamada a Webhook sin 'clave'. Body:", request.body);
        return response.status(400).send("Falta la clave.");
    }

    if (practica === true) {
        logger.info(`Webhook de práctica ignorado para la clave: ${clave}.`);
        return response.status(200).send("Notificación de práctica recibida e ignorada.");
    }

    logger.info(`Webhook REAL recibido para la clave: ${clave}. Procesando...`);

    const db = getFirestore();
    const bucket = getStorage().bucket();

    try {
        const snapshot = await db.collection("candidates").where("psicometricos.clavePsicometricas", "==", clave).limit(1).get();
        if (snapshot.empty) { throw new Error(`Candidato no encontrado con clave: ${clave}`); }
        const candidatoDoc = snapshot.docs[0];

        const jsonResponse = await axios.get("https://admin.psicometricas.mx/api/consultaResultado", {
            params: { Token: process.env.PSICOMETRICAS_TOKEN, Password: process.env.PSICOMETRICAS_PASSWORD, Clave: clave, Pdf: "false" }
        });

        const pdfResponse = await axios.get("https://admin.psicometricas.mx/api/consultaResultado", {
            params: { Token: process.env.PSICOMETRICAS_TOKEN, Password: process.env.PSICOMETRICAS_PASSWORD, Clave: clave, Pdf: "true" },
            responseType: 'arraybuffer'
        });

        const filePath = `resultados/${candidatoDoc.id}/${clave}.pdf`;
        const file = bucket.file(filePath);
        await file.save(pdfResponse.data, { metadata: { contentType: 'application/pdf' } });

        await candidatoDoc.ref.set({
            psicometricos: {
                estatus: "Finalizado",
                fechaFinalizacion: new Date().toISOString(),
                resultadosJson: jsonResponse.data,
                resultadoPdfPath: filePath
            }
        }, { merge: true });

        logger.info(`¡Éxito total! Proceso completado para el candidato ${candidatoDoc.id}.`);
        return response.status(200).send("Notificación procesada correctamente.");

    } catch (error) {
        const errorData = error.response?.data || error.message;
        logger.error(`FALLO el procesamiento del webhook para la clave ${clave}. Causa:`, errorData);
        return response.status(500).send("Error al procesar la notificación.");
    }
});