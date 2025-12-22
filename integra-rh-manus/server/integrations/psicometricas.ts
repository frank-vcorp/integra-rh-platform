/**
 * Integración con API de Psicométricas
 * Documentación: Ver /context/Fichas_tecnicas/psicometricas API/
 */

import https from "https";

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

function truncateForLog(input: string, maxLen = 400) {
  const text = (input || "").toString();
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "…";
}

function looksLikeCloudflareChallenge(body: string) {
  const t = (body || "").toLowerCase();
  return (
    t.includes("one moment, please") ||
    t.includes("your request is being verified") ||
    t.includes("cf-browser-verification") ||
    t.includes("cloudflare")
  );
}

async function requestFormEncoded(
  path: string,
  form: URLSearchParams,
  method: "POST" | "PUT" = "POST"
): Promise<{ status: number; body: string }> {
  const body = form.toString();
  const url = new URL(`${PSICOMETRICAS_API_URL}${path}`);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        protocol: url.protocol,
        method,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          // Algunos WAF/anti-bot bloquean requests sin User-Agent.
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      },
      res => {
        const chunks: Buffer[] = [];
        res.on("data", c => chunks.push(c as Buffer));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf-8");
          // Si la respuesta parece challenge HTML (Cloudflare), devolvemos el body
          // para que el caller emita un mensaje de error más claro y sin volcar HTML completo.
          resolve({ status: res.statusCode ?? 0, body: text });
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function postFormEncoded(
  path: string,
  form: URLSearchParams
): Promise<{ status: number; body: string }> {
  return requestFormEncoded(path, form, "POST");
}

/**
 * Actualiza pruebas de un candidato existente (misma Clave)
 * Doc: PUT /actualizaCandidato
 */
export async function actualizaCandidatoPruebas(params: {
  clave: string;
  nombre: string;
  email: string;
  testsCsv: string;
  vacante?: string;
  lang?: "Mx" | "Es";
}): Promise<{ success: boolean }> {
  try {
    const form = new URLSearchParams();
    form.set("Token", PSICOMETRICAS_TOKEN);
    form.set("Password", PSICOMETRICAS_PASSWORD);
    form.set("Clave", params.clave);
    form.set("Candidate", params.nombre);
    if (params.email) form.set("Email", params.email);
    if (params.vacante) form.set("Vacancy", params.vacante);
    form.set("Tests", params.testsCsv);
    if (params.lang) form.set("Lang", params.lang);

    const { status, body } = await requestFormEncoded(
      "/actualizaCandidato",
      form,
      "PUT"
    );
    if (status !== 200) {
      throw new Error(`Error al actualizar candidato (Psicométricas): ${body}`);
    }
    return { success: true };
  } catch (error) {
    console.error("[Psicométricas] Error al actualizar candidato:", error);
    throw error;
  }
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

    const { status, body } = await postFormEncoded("/agregaCandidato", form);
    if (looksLikeCloudflareChallenge(body)) {
      throw new Error(
        `Error API Psicométricas: el proveedor devolvió un challenge HTML (Cloudflare/WAF). ` +
          `Esto requiere whitelist de IP de salida (ideal: IP estática vía Cloud NAT) o que el proveedor desactive el challenge para /api. ` +
          `Respuesta (truncada): ${truncateForLog(body)}`
      );
    }
    if (status !== 200) {
      throw new Error(`Error API Psicométricas: ${truncateForLog(body)}`);
    }

    let data: any;
    try {
      data = JSON.parse(body);
    } catch {
      throw new Error(
        `Error API Psicométricas (JSON inválido). Respuesta (truncada): ${truncateForLog(
          body
        )}`
      );
    }
    const clave = (data as any)?.clave as string | undefined;

    // Si la API responde 200 pero no entrega una clave, tratamos el caso como error
    // para que el frontend vea el detalle y no se marque "Asignado" sin poder rastrear.
    if (!clave) {
      console.error("[Psicométricas] Respuesta sin clave válida:", data);
      throw new Error(
        `[Psicométricas] Respuesta sin clave. Verifica Token/Password, Tests y vacante. Respuesta cruda: ${JSON.stringify(
          data
        )}`
      );
    }

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
    const { status, body } = await postFormEncoded(
      "/reenviarInvitacion",
      form
    );
    if (status !== 200) {
      throw new Error(
        `Error al reenviar invitación (Psicométricas): ${body}`
      );
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
