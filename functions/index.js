// Herramientas de Firebase
const functions = require("firebase-functions");
const logger = require("firebase-functions/logger");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {getAuth} = require("firebase-admin/auth");
const {getStorage} = require("firebase-admin/storage");

const {randomUUID} = require("crypto");
// Herramientas externas
const axios = require("axios");
const { URLSearchParams } = require("url");
const sgMail = require('@sendgrid/mail');

// En el entorno de Cloud Functions, initializeApp() sin argumentos
// usa automáticamente las credenciales del entorno de ejecución.
// El archivo serviceAccountKey.json solo es necesario para scripts locales.
initializeApp();

/**
 * Asigna pruebas, registra en Psicométricas y envía la invitación por correo.
 */
exports.asignarPruebasPsicometricas = functions.https.onCall(async (data, context) => {
  // La data en v1 viene directamente en el objeto, no en request.data
  const { candidatoId, tests } = data;
  try {
    if (!process.env.SENDGRID_API_KEY) { throw new functions.https.HttpsError('internal', 'La API Key de SendGrid no está configurada.'); }
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    if (!candidatoId || !tests) { throw new functions.https.HttpsError('invalid-argument', 'Falta ID de candidato o tests.'); }

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
    throw new functions.https.HttpsError('unknown', errorMsg, error);
  }
});

/**
 * Reenvía el correo de invitación a un candidato.
 */
exports.reenviarInvitacion = functions.https.onCall(async (data, context) => {
  // La data en v1 viene directamente en el objeto, no en request.data
  const { candidatoId } = data;
  if (!candidatoId) { throw new functions.https.HttpsError('invalid-argument', 'Falta el ID del candidato.'); }

  const db = getFirestore();
  const candidatoRef = db.collection("candidates").doc(candidatoId);

  try {
    if (!process.env.SENDGRID_API_KEY) { throw new functions.https.HttpsError('internal', 'La API Key de SendGrid no está configurada.'); }
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
    throw new functions.https.HttpsError('unknown', 'Ocurrió un error al reenviar el correo.', error);
  }
});

/**
 * Gestiona los roles de los usuarios (superAdmin, admin, client).
 * Solo puede ser llamada por un 'superAdmin'.
 */
exports.manageUserRole = functions.https.onCall(async (data, context) => {
  // 1. Verificación de que el llamador es un superAdmin
  if (!context.auth || !context.auth.token) {
    throw new functions.https.HttpsError(
        "unauthenticated", "La petición debe ser autenticada.",
    );
  }
  if (context.auth.token.role !== "superAdmin") {
    throw new functions.https.HttpsError(
        "permission-denied",
        "Esta acción requiere privilegios de Super Administrador.",
    );
  }
  const {uid, role, clientId} = data; // La data en v1 viene directamente en el objeto
  if (!uid || !role) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Se requiere el UID del usuario y el rol a asignar.",
    );
  }

  try {
    const auth = getAuth();
    let claims = {};

    // 2. Construir el objeto de claims según el rol
    switch (role) {
      case "superAdmin":
        claims = {role: "superAdmin"};
        break;
      case "admin":
        claims = {role: "admin"};
        break;
      case "client":
        if (!clientId) {
          throw new functions.https.HttpsError("invalid-argument", "Para el rol 'client', se requiere un 'clientId'.");
        }
        claims = {role: "client", clientId: clientId};
        break;
      case "none": // Para quitar todos los roles
        claims = {};
        break;
      default:
        throw new functions.https.HttpsError("invalid-argument", `El rol '${role}' no es válido.`);
    }

    // 3. Asignar los claims al usuario
    await auth.setCustomUserClaims(uid, claims);

    logger.info(`Rol '${role}' asignado al usuario ${uid} por ${context.auth.token.email}`);
    return {success: true, message: `Rol '${role}' asignado correctamente al usuario ${uid}.`};
  } catch (error) {
    logger.error("Error en manageUserRole:", error);
    throw new functions.https.HttpsError("internal", "Ocurrió un error interno al gestionar el rol.");
  }
});

/**
 * Lista todos los usuarios de Firebase Authentication.
 * Solo puede ser llamada por un 'superAdmin'.
 */
exports.listUsers = functions.https.onCall(async (data, context) => {
  // Diagnóstico del contexto recibido
  logger.info('listUsers invoked', {
    hasAuth: !!context.auth,
    hasToken: !!(context.auth && context.auth.token),
    authUid: context.auth && context.auth.uid ? context.auth.uid : null,
    authEmail: context.auth && context.auth.token && context.auth.token.email ? context.auth.token.email : null,
    hasApp: !!context.app,
  });

  // 1. Verificación de que el llamador es un superAdmin
  if (!context.auth || !context.auth.token) {
    logger.warn('listUsers unauthenticated: missing auth or token', {
      hasAuth: !!context.auth,
      hasToken: !!(context.auth && context.auth.token),
    });
    throw new functions.https.HttpsError(
        "unauthenticated", "La petición debe ser autenticada.",
    );
  }
  if (context.auth.token.role !== "superAdmin") {
    throw new functions.https.HttpsError(
        "permission-denied",
        "Esta acción requiere privilegios de Super Administrador.",
    );
  }

  try {
    const auth = getAuth();
    const userRecords = await auth.listUsers(1000); // Obtiene hasta 1000 usuarios

    // 2. Mapear los resultados a un formato más limpio para el frontend
    const users = userRecords.users.map(user => ({
      uid: user.uid,
      email: user.email,
      role: user.customClaims?.role || 'none', // Extraer el rol del claim
      clientId: user.customClaims?.clientId || null, // Extraer el clientId si existe
    }));

    logger.info(`Listado de usuarios solicitado por ${context.auth.token.email}`);
    return { success: true, users: users };

  } catch (error) {
    // Log mejorado para diagnóstico de permisos
    logger.error("Error crítico en listUsers. Probable problema de permisos de IAM.", {
      errorMessage: error.message,
      errorCode: error.code,
    });
    throw new functions.https.HttpsError("internal", "Ocurrió un error interno al listar los usuarios.");
  }
});

/**
 * Variante HTTP de listUsers que verifica el token manualmente.
 * Útil como fallback cuando https.onCall no propaga context.auth.
 */
exports.listUsersHttp = functions.https.onRequest(async (req, res) => {
  // CORS básico y preflight
  const origin = req.headers.origin || '*';
  res.set('Access-Control-Allow-Origin', origin);
  res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Firebase-AppCheck');
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  try {
    // Extraer Bearer token
    const authHeader = req.headers.authorization || "";
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({ success: false, error: "missing-authorization", message: "Falta cabecera Authorization Bearer." });
    }
    const idToken = parts[1];

    const auth = getAuth();
    const decoded = await auth.verifyIdToken(idToken);

    if (decoded.role !== "superAdmin") {
      return res.status(403).json({ success: false, error: "permission-denied", message: "Requiere rol superAdmin." });
    }

    const userRecords = await auth.listUsers(1000);
    const users = userRecords.users.map(user => ({
      uid: user.uid,
      email: user.email,
      role: user.customClaims?.role || 'none',
      clientId: user.customClaims?.clientId || null,
    }));

    logger.info(`Listado de usuarios (HTTP) solicitado por ${decoded.email || decoded.uid}`);
    return res.status(200).json({ success: true, users });
  } catch (err) {
    logger.error("Error en listUsersHttp:", { message: err.message, code: err.code });
    return res.status(500).json({ success: false, error: "internal", message: "Error interno listando usuarios." });
  }
});

/**
 * Webhook que recibe la notificación de Psicométricas cuando un candidato termina.
 */
exports.webhookResultadosPsicometricas = functions.https.onRequest(async (request, response) => {
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

/**
 * Genera una página HTML pública para ver el estatus de un proceso.
 */
exports.viewSocioeconomicStatus = functions.https.onRequest(async (req, res) => {
    // MODO ENSEÑANZA: Usamos req.query.id para obtener el parámetro de la URL,
    // por ejemplo: .../viewSocioeconomicStatus?id=b1a2c3d4...
    const shareableId = req.query.id;

    if (!shareableId) {
        return res.status(400).send("<h1>Error: Falta el identificador del proceso.</h1>");
    }

    const db = getFirestore();

    try {
        // 1. Buscar el proceso usando el ID compartible.
        const processQuery = await db.collection("processes").where("shareableId", "==", shareableId).limit(1).get();

        if (processQuery.empty) {
            return res.status(404).send("<h1>Proceso no encontrado.</h1><p>El enlace puede ser incorrecto o el proceso ha sido eliminado.</p>");
        }

        const processDoc = processQuery.docs[0];
        const processData = processDoc.data();

        // 2. Obtener los datos relacionados (Candidato, Puesto, Cliente).
        const candidateSnap = await db.collection("candidates").doc(processData.candidatoId).get();
        const postSnap = await db.collection("posts").doc(processData.puestoId).get();
        const workHistoryQuery = await db.collection("candidates").doc(processData.candidatoId).collection("workHistory").orderBy("createdAt", "desc").limit(5).get();

        const candidateData = candidateSnap.exists ? candidateSnap.data() : null;
        const postData = postSnap.exists ? postSnap.data() : null;
        const workHistoryData = workHistoryQuery.docs.map(doc => doc.data());

        // 3. Renderizar la página HTML con los datos.
        // (Aquí irá la lógica para construir el HTML bonito)
        // MODO ENSEÑANZA: Hemos mejorado significativamente este HTML.
        // 1. Se añadió CSS para un diseño profesional y responsivo.
        // 2. Se agregó un botón "Compartir" en la cabecera.
        // 3. Se incluyó un script que usa la Web Share API para compartir en móviles
        //    y tiene un fallback para copiar el enlace en escritorio.
        const htmlPage = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Estatus del Proceso</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f0f2f5; margin: 0; padding: 20px; color: #333; }
                    .container { max-width: 800px; margin: auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden; }
                    header { background-color: #007bff; color: white; padding: 20px; display: flex; justify-content: space-between; align-items: center; }
                    header h1 { margin: 0; font-size: 1.5em; }
                    main { padding: 20px; }
                    .card { border: 1px solid #e0e0e0; border-radius: 6px; padding: 15px; margin-bottom: 20px; }
                    .card h2 { margin-top: 0; border-bottom: 2px solid #007bff; padding-bottom: 10px; font-size: 1.2em; }
                    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
                    .info-item p { margin: 5px 0; }
                    .info-item strong { color: #555; }
                    #share-button { background-color: #fff; color: #007bff; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-weight: bold; transition: background-color 0.2s; }
                    #share-button:hover { background-color: #e9ecef; }
                    hr { border: none; border-top: 1px solid #eee; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <header>
                        <h1>Seguimiento de Proceso</h1>
                        <button id="share-button">Compartir</button>
                    </header>
                    <main>
                        <div class="card">
                            <h2>Detalles del Candidato</h2>
                            <div class="info-grid">
                                <div class="info-item"><p><strong>Candidato:</strong> ${candidateData ? candidateData.nombreCompleto : 'N/A'}</p></div>
                                <div class="info-item"><p><strong>Puesto:</strong> ${postData ? postData.nombreDelPuesto : 'N/A'}</p></div>
                                <div class="info-item"><p><strong>Estatus Actual:</strong> ${processData.estatusProceso || 'N/A'}</p></div>
                                <div class="info-item"><p><strong>Estatus Visita:</strong> ${processData.visitStatus ? processData.visitStatus.status : 'N/A'}</p></div>
                            </div>
                        </div>
                        <div class="card">
                            <h2>Historial Laboral (Últimos 5)</h2>
                            ${workHistoryData.length > 0 ? workHistoryData.map(job => `<div class="info-item"><p><strong>${job.puesto || 'N/A'}</strong> en ${job.empresa || 'N/A'}</p></div>`).join('') : '<p>No hay historial laboral registrado.</p>'}
                        </div>
                    </main>
                </div>
                <script>
                    const shareButton = document.getElementById('share-button');
                    const shareData = {
                        title: 'Estatus del Proceso: ${candidateData ? candidateData.nombreCompleto.replace(/'/g, "\\'") : 'Candidato'}',
                        text: 'Consulta el estatus actualizado del proceso de selección para ${candidateData ? candidateData.nombreCompleto.replace(/'/g, "\\'") : 'el candidato'}.',
                        url: window.location.href
                    };

                    shareButton.addEventListener('click', async () => {
                        // Si el navegador soporta la Web Share API (móviles)
                        if (navigator.share) {
                            try {
                                await navigator.share(shareData);
                                shareButton.textContent = '¡Compartido!';
                            } catch (err) {
                                console.error("Error al compartir:", err);
                            }
                        } else {
                            // Fallback para navegadores de escritorio: copiar al portapapeles
                            try {
                                await navigator.clipboard.writeText(window.location.href);
                                shareButton.textContent = '¡Enlace Copiado!';
                            } catch (err) {
                                console.error('Error al copiar enlace:', err);
                                alert('No se pudo copiar el enlace.');
                            }
                        }
                        // Resetear el texto del botón después de un momento
                        setTimeout(() => { shareButton.textContent = 'Compartir'; }, 2000);
                    });
                <\/script>
            </body>
            </html>
        `;

        return res.status(200).send(htmlPage);

    } catch (error) {
        logger.error(`Error al generar la vista pública para el ID ${shareableId}:`, error);
        return res.status(500).send("<h1>Error interno</h1><p>Ocurrió un problema al intentar cargar la información. Por favor, intente más tarde.</p>");
    }
});

/**
 * Genera (si no existe) y devuelve la URL compartible para un proceso.
 */
exports.generateShareableLink = functions.https.onCall(async (data, context) => {
    // MODO ENSEÑANZA: Usamos una función onCall para seguridad.
    // Solo usuarios autenticados pueden generar estos enlaces.
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "La petición debe ser autenticada.");
    }

    const { processId } = data;
    if (!processId) {
        throw new functions.https.HttpsError("invalid-argument", "Falta el ID del proceso.");
    }

    const db = getFirestore();
    const processRef = db.collection("processes").doc(processId);

    try {
        const processDoc = await processRef.get();
        if (!processDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Proceso no encontrado.");
        }

        let shareableId = processDoc.data().shareableId;

        // Si no tiene un ID compartible, lo creamos y guardamos.
        if (!shareableId) {
            shareableId = randomUUID(); // Genera un ID único y criptográficamente seguro.
            await processRef.update({ shareableId: shareableId });
        }

        const functionUrl = `https://us-central1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/viewSocioeconomicStatus`;
        return { success: true, url: `${functionUrl}?id=${shareableId}` };

    } catch (error) {
        logger.error(`Error al generar enlace para el proceso ${processId}:`, error);
        throw new functions.https.HttpsError("internal", "Ocurrió un error al generar el enlace.");
    }
});
