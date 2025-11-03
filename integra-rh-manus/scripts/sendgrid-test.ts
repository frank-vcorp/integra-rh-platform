import 'dotenv/config';
import { enviarCorreo } from '../server/integrations/sendgrid';

async function main() {
  const to = process.argv[2] || process.env.SENDGRID_TEST_TO || process.env.SENDGRID_FROM_EMAIL;
  if (!to) {
    console.error('Usage: tsx scripts/sendgrid-test.ts <toEmail>');
    process.exit(1);
  }

  const html = `<!doctype html><html><body>
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
      <h2>INTEGRA-RH • Prueba de envío</h2>
      <p>Este es un correo de verificación de integración SendGrid enviado desde el entorno local.</p>
      <p>Fecha: ${new Date().toISOString()}</p>
    </div>
  </body></html>`;

  const ok = await enviarCorreo({ to, subject: 'INTEGRA-RH • Verificación SendGrid', html, text: 'Prueba de envío SendGrid' });
  if (!ok) {
    console.error('Fallo el envío. Revisa API key, remitente verificado y actividad en SendGrid.');
    process.exit(2);
  }
  console.log('Correo de prueba enviado a', to);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

