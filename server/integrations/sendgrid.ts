/**
 * Integración con SendGrid para envío de correos
 */

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";
const FROM_EMAIL = "noreply@integra-rh.com"; // TODO: Configurar dominio real
const FROM_NAME = "INTEGRA-RH";

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
        content: [
          {
            type: "text/html",
            value: params.html,
          },
          ...(params.text
            ? [
                {
                  type: "text/plain",
                  value: params.text,
                },
              ]
            : []),
        ],
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
      <p>Evaluación Psicométrica</p>
    </div>
    <div class="content">
      <p>Hola <strong>${params.candidatoNombre}</strong>,</p>
      
      <p>Has sido seleccionado(a) para continuar con el proceso de evaluación para el puesto de <strong>${params.nombrePuesto}</strong> en <strong>${params.nombreEmpresa}</strong>.</p>
      
      <p>Como parte del proceso, te invitamos a completar una batería de pruebas psicométricas. Este proceso tomará aproximadamente 45-60 minutos.</p>
      
      <p style="text-align: center;">
        <a href="${params.invitacionUrl}" class="button">Iniciar Evaluación</a>
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
