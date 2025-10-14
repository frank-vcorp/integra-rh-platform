// Herramientas de Firebase
const {onCall, HttpsError, onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");

// Herramientas externas
const axios = require("axios");
const { URLSearchParams } = require("url");
const sgMail = require('@sendgrid/mail');

// Inicializamos el Admin SDK de Firebase
initializeApp();

/**
 * Asigna pruebas a un candidato, lo registra en Psicométricas y le envía el correo de invitación.
 */
exports.asignarPruebasPsicometricas = onCall(async (request) => {
  try {
    // 1. VERIFICAMOS Y CONFIGURAMOS SENDGRID
    if (!process.env.SENDGRID_API_KEY) {
      throw new HttpsError('internal', 'La API Key de SendGrid no está configurada en el servidor.');
    }
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const { candidatoId, tests } = request.data;
    if (!candidatoId || !tests) {
      throw new HttpsError('invalid-argument', 'Falta el ID del candidato o las pruebas.');
    }

    const db = getFirestore();
    const candidatoRef = db.collection("candidates").doc(candidatoId);

    // 2. LEEMOS DATOS DEL CANDIDATO DESDE FIRESTORE
    const doc = await candidatoRef.get();
    if (!doc.exists) {
      throw new HttpsError('not-found', 'No se encontró el candidato en la base de datos.');
    }
    const candidatoData = doc.data();

    // 3. LLAMAMOS A LA API DE PSICOMÉTRICAS
    const datosParaAPI = {
      Token: process.env.PSICOMETRICAS_TOKEN,
      Password: process.env.PSICOMETRICAS_PASSWORD,
      Candidate: candidatoData.nombreCompleto,
      Email: candidatoData.email,
      Vacancy: candidatoData.puestoAplicado,
      Tests: tests,
      Lang: "mx",
    };
    const formBody = new URLSearchParams(datosParaAPI).toString();
    const apiResponse = await axios.post("https://admin.psicometricas.mx/api/agregaCandidato", formBody, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const clavePsicometricas = apiResponse.data.clave;

    // 4. PRIMERA ACTUALIZACIÓN: GUARDAMOS LA CLAVE Y EL ESTATUS "ASIGNADO"
    await candidatoRef.set({
      psicometricos: {
        clavePsicometricas: clavePsicometricas,
        estatus: "Asignado",
        fechaAsignacion: new Date().toISOString(),
        pruebasAsignadas: tests.split(',').map(id => ({ idPrueba: id, estatus: 'Asignado' }))
      }
    }, { merge: true });
    logger.info(`Pruebas asignadas para ${candidatoData.email}. Clave: ${clavePsicometricas}`);

    // 5. ENVIAR CORREO DE INVITACIÓN
    const urlPrueba = `https://evaluacion.psicometrica.mx/login/${clavePsicometricas}`;
    const emailHtml = `<h4><strong>Buenas tardes ${candidatoData.nombreCompleto}</strong></h4><p>Le han asignado unas pruebas psicométricas. Por favor, contéstelas dando clic en el siguiente botón:</p><br><a style="background: #f20; text-decoration: none; color: #FFF; padding: 10px 15px;" href="${urlPrueba}" target="_blank">Contestar evaluación psicométrica</a><br><br><p>También puede ingresar con la siguiente clave:</p><h3>Clave: <b>${clavePsicometricas}</b></h3><p>Asegúrese de estar en un lugar tranquilo. ¡Mucho éxito!</p>`;
    
    const msg = {
      to: candidatoData.email,
      from: 'frank@vcorp.mx', // Tu correo verificado en SendGrid
      subject: `Invitación a Pruebas Psicométricas para ${candidatoData.puestoAplicado}`,
      html: emailHtml,
    };
    await sgMail.send(msg);
    logger.info(`Correo de invitación enviado exitosamente a ${candidatoData.email}`);

    // 6. SEGUNDA ACTUALIZACIÓN: CAMBIAMOS EL ESTATUS A "INVITACIÓN ENVIADA"
    await candidatoRef.set({
      psicometricos: {
        estatus: "Invitación Enviada",
        fechaEnvio: new Date().toISOString()
      }
    }, { merge: true });

    // 7. DEVOLVER RESPUESTA DE ÉXITO
    return { success: true, message: "Pruebas asignadas y correo enviado.", data: apiResponse.data };

  } catch (error) {
    const errorMsg = error.message || "Error desconocido";
    logger.error("¡FALLO EL PROCESO!", error);
    throw new HttpsError('unknown', errorMsg, error);
  }
});

/**
 * Reenvía el correo de invitación a un candidato que ya tiene pruebas asignadas.
 */
exports.reenviarInvitacion = onCall(async (request) => {
  const { candidatoId } = request.data;
  if (!candidatoId) {
    throw new HttpsError('invalid-argument', 'Falta el ID del candidato.');
  }

  const db = getFirestore();
  const candidatoRef = db.collection("candidates").doc(candidatoId);

  try {
    const doc = await candidatoRef.get();
    if (!doc.exists || !doc.data().psicometricos) {
      throw new HttpsError('not-found', 'No se encontró el candidato o no tiene pruebas asignadas.');
    }
    const candidatoData = doc.data();
    const clavePsicometricas = candidatoData.psicometricos.clavePsicometricas;

    if (!process.env.SENDGRID_API_KEY) {
      throw new HttpsError('internal', 'La API Key de SendGrid no está configurada.');
    }
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const urlPrueba = `https://evaluacion.psicometrica.mx/login/${clavePsicometricas}`;
    const emailHtml = `<h4><strong>Recordatorio: Buenas tardes ${candidatoData.nombreCompleto}</strong></h4><p>Le reenviamos la invitación para sus pruebas psicométricas.</p><a href="${urlPrueba}">Contestar evaluación</a><p>Clave: <b>${clavePsicometricas}</b></p>`;
    
    const msg = {
      to: candidatoData.email,
      from: 'frank@vcorp.mx',
      subject: `Recordatorio: Invitación a Pruebas Psicométricas`,
      html: emailHtml,
    };
    await sgMail.send(msg);

    logger.info(`Correo de invitación REENVIADO exitosamente a ${candidatoData.email}`);
    return { success: true, message: `Correo reenviado a ${candidatoData.email}` };

  } catch (error) {
    logger.error("FALLO el reenvío de correo:", error);
    throw new HttpsError('unknown', 'Ocurrió un error al reenviar el correo.', error);
  }
});

/**
 * Webhook que Psicométricas llamará cuando un candidato termine.
 */
exports.webhookResultadosPsicometricas = onRequest(async (request, response) => {
  const { clave } = request.body;

  if (!clave) {
    logger.error("Llamada a Webhook sin 'clave'. Body recibido:", request.body);
    return response.status(400).send("Falta la clave del candidato.");
  }

  logger.info(`Webhook recibido para la clave: ${clave}.`);

  const db = getFirestore();

  try {
    const snapshot = await db.collection("candidates").where("psicometricos.clavePsicometricas", "==", clave).limit(1).get();

    if (snapshot.empty) {
      throw new Error(`No se encontró ningún candidato con la clave: ${clave}`);
    }

    const candidatoDoc = snapshot.docs[0];
    logger.info(`Candidato encontrado con ID: ${candidatoDoc.id}`);

    const datosParaAPI = {
      token: process.env.PSICOMETRICAS_TOKEN,
      password: process.env.PSICOMETRICAS_PASSWORD,
      clave: clave,
    };

    const formBody = new URLSearchParams(datosParaAPI).toString();
    const apiResponse = await axios.post("https://admin.psicometricas.mx/api/consultaResultado", formBody, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    logger.info("Resultados obtenidos de la API:", apiResponse.data);

    await db.collection("candidates").doc(candidatoDoc.id).set({
      psicometricos: {
        estatus: "Finalizado",
        fechaFinalizacion: new Date().toISOString(),
        resultados: apiResponse.data 
      }
    }, { merge: true });

    logger.info(`¡Éxito! Resultados guardados para el candidato ${candidatoDoc.id}.`);

    return response.status(200).send("Notificación procesada correctamente.");

  } catch (error) {
    // --- LOGGING MEJORADO ---
    // Imprimimos el error completo para tener todos los detalles.
    logger.error(`FALLO el procesamiento del webhook para la clave ${clave}. ERROR COMPLETO:`, error);
    return response.status(500).send("Error al procesar la notificación.");
  }
});