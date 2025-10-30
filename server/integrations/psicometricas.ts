/**
 * Integración con API de Psicométricas
 * Documentación: Ver /context/Fichas_tecnicas/psicometricas API/
 */

const PSICOMETRICAS_API_URL = "https://api.psicometricas.mx/v1";
const PSICOMETRICAS_TOKEN = process.env.PSICOMETRICAS_TOKEN || "";
const PSICOMETRICAS_PASSWORD = process.env.PSICOMETRICAS_PASSWORD || "";

interface AsignarBateriaParams {
  nombre: string;
  email: string;
  telefono?: string;
  bateria: string; // ID de la batería de pruebas
}

interface ResultadoPsicometrico {
  id: string;
  candidato: string;
  bateria: string;
  estatus: "pendiente" | "en_progreso" | "completado";
  fechaAsignacion: string;
  fechaCompletado?: string;
  resultados?: any;
  pdfUrl?: string;
}

/**
 * Asigna una batería de pruebas psicométricas a un candidato
 */
export async function asignarBateriaPsicometrica(
  params: AsignarBateriaParams
): Promise<{ id: string; invitacionUrl: string }> {
  try {
    const response = await fetch(`${PSICOMETRICAS_API_URL}/asignar-bateria`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PSICOMETRICAS_TOKEN}`,
        "X-API-Password": PSICOMETRICAS_PASSWORD,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Error API Psicométricas: ${error}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      invitacionUrl: data.invitacion_url,
    };
  } catch (error) {
    console.error("[Psicométricas] Error al asignar batería:", error);
    throw error;
  }
}

/**
 * Reenvía la invitación a un candidato
 */
export async function reenviarInvitacion(
  asignacionId: string
): Promise<{ success: boolean }> {
  try {
    const response = await fetch(
      `${PSICOMETRICAS_API_URL}/reenviar-invitacion/${asignacionId}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${PSICOMETRICAS_TOKEN}`,
          "X-API-Password": PSICOMETRICAS_PASSWORD,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Error al reenviar invitación");
    }

    return { success: true };
  } catch (error) {
    console.error("[Psicométricas] Error al reenviar invitación:", error);
    throw error;
  }
}

/**
 * Consulta los resultados de una batería de pruebas
 */
export async function consultarResultados(
  asignacionId: string
): Promise<ResultadoPsicometrico> {
  try {
    const response = await fetch(
      `${PSICOMETRICAS_API_URL}/resultados/${asignacionId}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${PSICOMETRICAS_TOKEN}`,
          "X-API-Password": PSICOMETRICAS_PASSWORD,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Error al consultar resultados");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("[Psicométricas] Error al consultar resultados:", error);
    throw error;
  }
}

/**
 * Descarga el PDF del reporte de resultados
 */
export async function descargarReportePDF(
  asignacionId: string
): Promise<Buffer> {
  try {
    const response = await fetch(
      `${PSICOMETRICAS_API_URL}/reporte-pdf/${asignacionId}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${PSICOMETRICAS_TOKEN}`,
          "X-API-Password": PSICOMETRICAS_PASSWORD,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Error al descargar reporte PDF");
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("[Psicométricas] Error al descargar PDF:", error);
    throw error;
  }
}

/**
 * Webhook handler para recibir notificaciones de la API
 * Debe ser llamado desde un endpoint POST /api/webhooks/psicometricas
 */
export async function handleWebhookPsicometricas(payload: any): Promise<void> {
  try {
    console.log("[Psicométricas] Webhook recibido:", payload);

    // Aquí se procesaría el webhook según el tipo de evento
    // Ejemplos: bateria_completada, bateria_iniciada, etc.
    
    const { evento, asignacion_id, datos } = payload;

    switch (evento) {
      case "bateria_completada":
        // Actualizar el proceso en la base de datos
        // Descargar y almacenar el PDF
        console.log(`Batería completada: ${asignacion_id}`);
        break;
      
      case "bateria_iniciada":
        console.log(`Batería iniciada: ${asignacion_id}`);
        break;

      default:
        console.log(`Evento no manejado: ${evento}`);
    }
  } catch (error) {
    console.error("[Psicométricas] Error en webhook:", error);
    throw error;
  }
}
