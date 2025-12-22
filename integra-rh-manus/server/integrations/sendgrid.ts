/**
 * Integración con SendGrid para envío de correos
 */

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@integra-rh.com";
const FROM_NAME = process.env.SENDGRID_FROM_NAME || "INTEGRA-RH";

interface EmailParams {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Envía un correo electrónico usando SendGrid
 */
export async function enviarCorreo(params: EmailParams): Promise<boolean> {
  try {
    if (!SENDGRID_API_KEY) {
      console.warn("[SendGrid] No API key configured; skipping send.");
      return false;
    }
    const content = params.text
      ? [
          { type: "text/plain", value: params.text },
          { type: "text/html", value: params.html },
        ]
      : [
          { type: "text/html", value: params.html },
        ];

    const response = await fetch(SENDGRID_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SENDGRID_API_KEY}`,
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [
              {
                email: params.to,
                name: params.toName || params.to,
              },
            ],
            subject: params.subject,
          },
        ],
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME,
        },
        tracking_settings: {
          click_tracking: {
            enable: false,
            enable_text: false,
          },
        },
        content,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[SendGrid] Error:", error);
      return false;
    }

    console.log(`[SendGrid] Correo enviado a ${params.to}`);
    return true;
  } catch (error) {
    console.error("[SendGrid] Error al enviar correo:", error);
    return false;
  }
}

/**
 * Envía invitación a candidato para pruebas psicométricas
 */
export async function enviarInvitacionPsicometrica(params: {
  candidatoNombre: string;
  candidatoEmail: string;
  invitacionUrl: string;
  nombrePuesto: string;
  nombreEmpresa: string;
}): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px 20px; background: #f9fafb; }
    .button { 
      display: inline-block; 
      padding: 12px 30px; 
      background: #2563eb; 
      color: #ffffff !important;
      text-decoration: none; 
      border-radius: 5px;
      margin: 20px 0;
    }
    a.button, a.button:visited, a.button:hover, a.button:active { color: #ffffff !important; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>INTEGRA-RH</h1>
      <p>Evaluación Psicométrica</p>
    </div>
    <div class="content">
      <p>Hola <strong>${params.candidatoNombre}</strong>,</p>
      
      <p>Has sido seleccionado(a) para continuar con el proceso de evaluación para el puesto de <strong>${params.nombrePuesto}</strong> en <strong>${params.nombreEmpresa}</strong>.</p>
      
      <p>Como parte del proceso, te invitamos a completar una batería de pruebas psicométricas. Este proceso tomará aproximadamente 45-60 minutos.</p>
      
      <p style="text-align: center;">
        <a href="${params.invitacionUrl}" class="button" style="color:#ffffff !important;">Iniciar Evaluación</a>
      </p>
      
      <p><strong>Instrucciones importantes:</strong></p>
      <ul>
        <li>Asegúrate de contar con tiempo suficiente para completar las pruebas sin interrupciones</li>
        <li>Busca un lugar tranquilo y sin distracciones</li>
        <li>Utiliza una computadora o tablet (no se recomienda usar teléfono móvil)</li>
        <li>Responde con honestidad, no hay respuestas correctas o incorrectas</li>
      </ul>
      
      <p>Si tienes alguna duda o problema técnico, no dudes en contactarnos.</p>
      
      <p>¡Mucho éxito!</p>
      
      <p>Saludos cordiales,<br>
      <strong>Equipo INTEGRA-RH</strong></p>
    </div>
    <div class="footer">
      <p>Este es un correo automático, por favor no responder directamente.</p>
      <p>&copy; ${new Date().getFullYear()} INTEGRA-RH. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Hola ${params.candidatoNombre},

Has sido seleccionado(a) para continuar con el proceso de evaluación para el puesto de ${params.nombrePuesto} en ${params.nombreEmpresa}.

Como parte del proceso, te invitamos a completar una batería de pruebas psicométricas.

Accede aquí: ${params.invitacionUrl}

Instrucciones importantes:
- Asegúrate de contar con tiempo suficiente (45-60 minutos)
- Busca un lugar tranquilo
- Utiliza una computadora o tablet
- Responde con honestidad

¡Mucho éxito!

Equipo INTEGRA-RH
  `;

  return enviarCorreo({
    to: params.candidatoEmail,
    toName: params.candidatoNombre,
    subject: `Invitación a Evaluación Psicométrica - ${params.nombrePuesto}`,
    html,
    text,
  });
}

/**
 * Envía email con enlace de acceso único al cliente empresarial
 */
export async function enviarEnlaceAccesoCliente(
  clienteEmail: string,
  nombreEmpresa: string,
  nombreCandidato: string,
  claveProceso: string,
  enlaceAcceso: string
): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px 20px; background: #f9fafb; }
    .info-box { background: white; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0; }
    .button { 
      display: inline-block; 
      padding: 12px 30px; 
      background: #2563eb; 
      color: white; 
      text-decoration: none; 
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>INTEGRA-RH</h1>
      <p>Acceso al Portal de Cliente</p>
    </div>
    <div class="content">
      <p>Estimado/a representante de <strong>${nombreEmpresa}</strong>,</p>
      
      <p>Se ha iniciado un nuevo proceso de evaluación para el candidato <strong>${nombreCandidato}</strong>.</p>
      
      <div class="info-box">
        <p><strong>Clave del Proceso:</strong> ${claveProceso}</p>
        <p><strong>Candidato:</strong> ${nombreCandidato}</p>
      </div>
      
      <p>Puede dar seguimiento al proceso y consultar los resultados a través del siguiente enlace:</p>
      
      <p style="text-align: center;">
        <a href="${enlaceAcceso}" class="button">Acceder al Portal de Cliente</a>
      </p>
      
      <p><strong>Nota importante:</strong> Este enlace es único y personal. Es válido por 30 días. Si necesita un nuevo enlace, contáctenos.</p>
      
      <p>Saludos cordiales,<br>
      <strong>Equipo INTEGRA-RH</strong></p>
    </div>
    <div class="footer">
      <p>Este es un correo automático, por favor no responder directamente.</p>
      <p>&copy; ${new Date().getFullYear()} INTEGRA-RH. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
  `;

  return enviarCorreo({
    to: clienteEmail,
    toName: nombreEmpresa,
    subject: `Acceso a Proceso ${claveProceso} - ${nombreCandidato}`,
    html,
  });
}

/**
 * Envía notificación a cliente cuando un proceso está completado
 */
export async function notificarProcesoCompletado(params: {
  clienteNombre: string;
  clienteEmail: string;
  candidatoNombre: string;
  nombrePuesto: string;
  claveProceso: string;
}): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px 20px; background: #f9fafb; }
    .info-box { background: white; padding: 15px; border-left: 4px solid #10b981; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>INTEGRA-RH</h1>
      <p>Proceso Completado</p>
    </div>
    <div class="content">
      <p>Estimado(a) <strong>${params.clienteNombre}</strong>,</p>
      
      <p>Le informamos que el proceso de evaluación ha sido completado exitosamente.</p>
      
      <div class="info-box">
        <p><strong>Clave del Proceso:</strong> ${params.claveProceso}</p>
        <p><strong>Candidato:</strong> ${params.candidatoNombre}</p>
        <p><strong>Puesto:</strong> ${params.nombrePuesto}</p>
      </div>
      
      <p>El dictamen final está disponible en su portal de cliente. Puede acceder para revisar los resultados completos.</p>
      
      <p>Si tiene alguna pregunta o requiere información adicional, no dude en contactarnos.</p>
      
      <p>Saludos cordiales,<br>
      <strong>Equipo INTEGRA-RH</strong></p>
    </div>
    <div class="footer">
      <p>Este es un correo automático, por favor no responder directamente.</p>
      <p>&copy; ${new Date().getFullYear()} INTEGRA-RH. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
  `;

  return enviarCorreo({
    to: params.clienteEmail,
    toName: params.clienteNombre,
    subject: `Proceso Completado - ${params.claveProceso}`,
    html,
  });
}

/**
 * Envía email con enlace para otorgar consentimiento de uso de datos
 */
export async function enviarCorreoConsentimiento(params: {
  candidatoEmail: string;
  candidatoNombre: string;
  consentUrl: string;
}): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px 20px; background: #f9fafb; }
    .button { 
      display: inline-block; 
      padding: 12px 30px; 
      background: #2563eb; 
      color: white; 
      text-decoration: none; 
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>INTEGRA-RH</h1>
      <p>Consentimiento de Uso de Datos</p>
    </div>
    <div class="content">
      <p>Hola <strong>${params.candidatoNombre}</strong>,</p>
      
      <p>Para continuar con tu proceso, es necesario que nos autorices el tratamiento de tus datos personales de acuerdo con la legislación vigente.</p>
      
      <p>Por favor, haz clic en el siguiente enlace para revisar nuestro aviso de privacidad y otorgar tu consentimiento:</p>
      
      <p style="text-align: center;">
        <a href="${params.consentUrl}" class="button">Revisar y Firmar Consentimiento</a>
      </p>
      
      <p><strong>Nota importante:</strong> Este enlace es único y personal. Si tienes alguna duda, por favor, contacta a tu reclutador.</p>
      
      <p>Saludos cordiales,<br>
      <strong>Equipo INTEGRA-RH</strong></p>
    </div>
    <div class="footer">
      <p>Este es un correo automático, por favor no responder directamente.</p>
      <p>&copy; ${new Date().getFullYear()} INTEGRA-RH. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
  `;

  return enviarCorreo({
    to: params.candidatoEmail,
    toName: params.candidatoNombre,
    subject: `Acción Requerida: Consentimiento de Uso de Datos Personales`,
    html,
  });
}
