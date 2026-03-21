/**
 * armadoPdfFromHtml.ts
 * Renderer headless HTML → PDF usando Playwright/Chromium.
 *
 * Estrategia (HTML-first):
 *   1. Import dinámico de playwright-core para no romper entornos sin devDeps.
 *   2. Verifica que el binario de Chromium exista en disco.
 *   3. Renderiza el HTML autocontenido con page.pdf() en A4 con fondo.
 *   4. Si cualquier paso falla, retorna null → el caller usa el fallback pdf-lib.
 *
 * Trazabilidad:
 *   - El campo `rendererUsed` permite al caller registrar qué renderer se utilizó.
 *   - Todos los errores se loguean con el prefijo [armadoPdfFromHtml] para grep.
 *
 * @intervention IMPL-20260321-01
 * @respaldo context/SPECs/SPEC-pdf-dinamico-estudio-cliente.md
 */

import { existsSync } from "node:fs";

/** Tiempo máximo de espera para Playwright (ms). */
const PLAYWRIGHT_TIMEOUT_MS = 45_000;

/**
 * Intenta convertir un HTML autocontenido a PDF usando Playwright/Chromium headless.
 *
 * @returns `Uint8Array` con el PDF generado, o `null` si Playwright/Chromium no
 *          está disponible o si ocurre algún error irrecuperable.
 *          En caso de `null`, el caller DEBE usar el fallback (pdf-lib).
 */
export async function renderHtmlToPdf(html: string): Promise<Uint8Array | null> {
  // Import dinámico: no lanza en producción si playwright-core no está instalado.
  let playwrightChromium: { launch: Function; executablePath: () => string } | undefined;
  try {
    // Importamos desde @playwright/test que es devDep declarada.
    // En producción sin devDeps, este import fallará graciosamente → null → fallback.
    const pw = await import("@playwright/test");
    playwrightChromium = pw.chromium as unknown as {
      launch: Function;
      executablePath: () => string;
    };
  } catch {
    console.warn("[armadoPdfFromHtml] playwright-core no disponible — usando renderer fallback.");
    return null;
  }

  if (!playwrightChromium) return null;

  // Verificar binario de Chromium en disco antes de intentar launch.
  let executablePath: string;
  try {
    executablePath = playwrightChromium.executablePath();
  } catch {
    console.warn("[armadoPdfFromHtml] No se pudo obtener executablePath de Chromium — usando fallback.");
    return null;
  }

  if (!existsSync(executablePath)) {
    console.warn(
      `[armadoPdfFromHtml] Binario de Chromium no encontrado en "${executablePath}" — usando fallback.`,
    );
    return null;
  }

  let browser: { newPage: Function; close: Function } | undefined;
  try {
    browser = await playwrightChromium.launch({
      executablePath,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--run-all-compositor-stages-before-draw",
      ],
      timeout: PLAYWRIGHT_TIMEOUT_MS,
    });

    const page = await (browser as any).newPage();

    await page.setContent(html, {
      waitUntil: "networkidle",
      timeout: PLAYWRIGHT_TIMEOUT_MS,
    });

    const pdfBuffer: Buffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });

    console.info(
      `[armadoPdfFromHtml] PDF generado desde HTML headless — ${pdfBuffer.byteLength} bytes.`,
    );
    return new Uint8Array(pdfBuffer);
  } catch (err) {
    console.error(
      "[armadoPdfFromHtml] Error en renderer headless:",
      (err as Error).message ?? String(err),
    );
    return null;
  } finally {
    await (browser as any)?.close().catch(() => {});
  }
}

/**
 * Detecta de forma sincrónica si el binario de Chromium está disponible
 * en el entorno actual (sin lanzar el navegador).
 * Útil para logs de diagnóstico o para decorar respuestas con capacidades del servidor.
 */
export function isChromiumAvailable(): boolean {
  try {
    // require síncrono no aplica en ESM; usamos una cache lazy via import.meta
    // En ESM no podemos usar require(), así que confiamos en el existsSync sobre las
    // rutas conocidas de Playwright. Esto cubre el caso común de desarrollo y CI.
    const knownPaths = [
      // Linux (ms-playwright cache)
      `${process.env.HOME}/.cache/ms-playwright/chromium-1194/chrome-linux/chrome`,
      // Fallback genérico por si se actualizó la versión
      `${process.env.PLAYWRIGHT_BROWSERS_PATH ?? ""}/chromium-1194/chrome-linux/chrome`,
    ];
    return knownPaths.some((p) => p && existsSync(p));
  } catch {
    return false;
  }
}
