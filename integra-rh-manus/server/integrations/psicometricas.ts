/**
 * Integración con API de Psicométricas
 * Documentación: Ver /context/Fichas_tecnicas/psicometricas API/
 */

const PSICOMETRICAS_API_URL = "https://admin.psicometricas.mx/api";
const PSICOMETRICAS_TOKEN = process.env.PSICOMETRICAS_TOKEN || "";
const PSICOMETRICAS_PASSWORD = process.env.PSICOMETRICAS_PASSWORD || "";

interface AsignarBateriaParams {
  nombre: string;
  email: string;
  telefono?: string;
  bateria?: string; // Nombre batería (opcional)
  testsCsv: string; // IDs de pruebas
  vacante?: string;
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
    const form = new URLSearchParams();
    form.set("Token", PSICOMETRICAS_TOKEN);
    form.set("Password", PSICOMETRICAS_PASSWORD);
    form.set("Candidate", params.nombre);
    if (params.email) form.set("Email", params.email);
    if (params.vacante) form.set("Vacancy", params.vacante);
    form.set("Tests", params.testsCsv);
    if (params.bateria) form.set("Battery", params.bateria);

    const response = await fetch(`${PSICOMETRICAS_API_URL}/agregaCandidato`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Error API Psicométricas: ${error}`);
    }
    const data = await response.json();
    const clave = data.clave as string;
    const invitacionUrl = `https://evaluacion.psicometrica.mx/login/${clave}`;
    return { id: clave, invitacionUrl };
  } catch (error) {
    console.error("[Psicométricas] Error al asignar candidato:", error);
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
    const form = new URLSearchParams();
    form.set("Token", PSICOMETRICAS_TOKEN);
    form.set("Password", PSICOMETRICAS_PASSWORD);
    form.set("Clave", asignacionId);
    const response = await fetch(`${PSICOMETRICAS_API_URL}/reenviarInvitacion`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    if (!response.ok) throw new Error("Error al reenviar invitación");
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
    const url = new URL(`${PSICOMETRICAS_API_URL}/consultaResultado`);
    url.searchParams.set("Token", PSICOMETRICAS_TOKEN);
    url.searchParams.set("Password", PSICOMETRICAS_PASSWORD);
    url.searchParams.set("Clave", asignacionId);
    url.searchParams.set("Pdf", "false");
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error("Error al consultar resultados");
    const data = await response.json();
    return data as any;
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
    const url = new URL(`${PSICOMETRICAS_API_URL}/consultaResultado`);
    url.searchParams.set("Token", PSICOMETRICAS_TOKEN);
    url.searchParams.set("Password", PSICOMETRICAS_PASSWORD);
    url.searchParams.set("Clave", asignacionId);
    url.searchParams.set("Pdf", "true");
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error("Error al descargar reporte PDF");
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("[Psicométricas] Error al descargar PDF:", error);
    throw error;
  }
}

/**
 * Obtiene el catálogo de baterías disponibles desde la API
 * Endpoint de referencia: /consultaBateria
 */
let bateriasCache: any[] | null = null;
let bateriasCacheTs = 0;
export async function listarBaterias(): Promise<any[]> {
  try {
    // Cache simple en memoria por 10 minutos
    const now = Date.now();
    if (bateriasCache && now - bateriasCacheTs < 10 * 60 * 1000) {
      return bateriasCache;
    }

    const url = new URL(`${PSICOMETRICAS_API_URL}/consultaBateria`);
    url.searchParams.set("Token", PSICOMETRICAS_TOKEN);
    url.searchParams.set("Password", PSICOMETRICAS_PASSWORD);

    const response = await fetch(url.toString());
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Error al consultar baterías (${response.status}): ${text}`);
    }
    const data = await response.json();
    // La forma exacta depende de la API; devolvemos tal cual y dejamos adaptación al cliente
    bateriasCache = Array.isArray(data) ? data : (data?.baterias || data?.data || []);
    bateriasCacheTs = now;
    return bateriasCache;
  } catch (error) {
    console.error("[Psicométricas] Error al listar baterías:", error);
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

    const evento: string = (payload?.evento || payload?.event || payload?.status || "").toString().toLowerCase();
    const clave: string = payload?.asignacion_id || payload?.Clave || payload?.clave || payload?.id || "";
    if (!clave) {
      console.warn("[Psicométricas] Webhook sin clave de asignación identificable");
      return;
    }

    const db = await import("../db");
    const candidate: any = await db.getCandidateByPsicoClave(clave);
    if (!candidate) {
      console.warn("[Psicométricas] No se encontró candidato con clave", clave);
      return;
    }

    const estatusFromEvent = evento.includes("complet")
      ? "Completado"
      : evento.includes("inici") || evento.includes("start")
      ? "En progreso"
      : candidate.psicometricos?.estatus || "Asignado";

    // Guardar resultados JSON básicos si vienen en el payload
    const newPsico = {
      ...(candidate.psicometricos || {}),
      clavePsicometricas: clave,
      estatus: estatusFromEvent,
      resultadosJson: payload?.resultados || payload?.datos || payload || undefined,
    } as any;
    await db.updateCandidate(candidate.id, { psicometricos: newPsico } as any);

    // Si parece completado, intentamos descargar y guardar el PDF como documento
    if (estatusFromEvent === "Completado") {
      try {
        // Idempotencia: si ya generamos PDF para esta clave, no repetir
        if ((candidate.psicometricos as any)?.lastPdfAsignacionId === clave) {
          console.log("[Psicométricas] PDF ya registrado para", clave);
          return;
        }
        const buffer = await descargarReportePDF(clave);
        const { storage } = await import("../firebase");
        const key = `candidates/${candidate.id}/psicometria-${Date.now()}.pdf`;
        const bucket = storage.bucket();
        const file = bucket.file(key);
        await file.save(buffer, { contentType: "application/pdf", resumable: false });
        const [signedUrl] = await file.getSignedUrl({ action: "read", expires: new Date(Date.now() + 365*24*60*60*1000) });
        await db.createDocument({
          candidatoId: candidate.id,
          tipoDocumento: "PSICOMETRICO",
          nombreArchivo: `reporte-psicometrico.pdf`,
          url: signedUrl,
          fileKey: key,
          mimeType: "application/pdf",
          uploadedBy: "Webhook Psicométricas",
        } as any);
        // Marcar última asignación con PDF generado para idempotencia futura
        try {
          await db.updateCandidate(candidate.id, {
            psicometricos: {
              ...(candidate.psicometricos || {}),
              lastPdfAsignacionId: clave,
            } as any,
          } as any);
        } catch {}
      } catch (err) {
        console.error("[Psicométricas] Error guardando PDF por webhook:", err);
      }
    }
  } catch (error) {
    console.error("[Psicométricas] Error en webhook:", error);
    throw error;
  }
}
