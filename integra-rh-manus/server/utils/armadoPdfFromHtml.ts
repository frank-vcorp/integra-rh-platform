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

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Escanea el cache de ms-playwright buscando cualquier revisión de Chromium instalada.
 * Retorna el path del ejecutable si lo encuentra, o null.
 */
function findChromiumInPlaywrightCache(): string | null {
  try {
    const baseDir = join(process.env.HOME ?? "", ".cache", "ms-playwright");
    if (!existsSync(baseDir)) return null;
    const entries = readdirSync(baseDir);
    for (const entry of entries) {
      if (!entry.startsWith("chromium-")) continue;
      const candidate = join(baseDir, entry, "chrome-linux", "chrome");
      if (existsSync(candidate)) return candidate;
    }
  } catch {
    // Ignorado — el fallback maneja esto
  }
  return null;
}

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
    // playwright-core es dependency de producción (no devDep).
    // Usamos import dinámico para no romper entornos donde el módulo no esté instalado.
    // @intervention IMPL-20260408-03
    const pw = await import("playwright-core");
    playwrightChromium = pw.chromium as unknown as {
      launch: Function;
      executablePath: () => string;
    };
  } catch {
    console.warn("[armadoPdfFromHtml] playwright-core no disponible — usando renderer fallback.");
    return null;
  }

  if (!playwrightChromium) return null;

  // Resolver el ejecutable de Chromium:
  // 1) Env var CHROMIUM_EXECUTABLE_PATH (producción Docker — Chromium del sistema)
  // 2) PLAYWRIGHT_EXECUTABLE_PATH (override manual)
  // 3) Rutas conocidas del sistema (Alpine /usr/bin/chromium-browser, Debian /usr/bin/chromium)
  // 4) playwright-core.executablePath() (cache ms-playwright en dev/CI)
  let executablePath: string | null =
    process.env.CHROMIUM_EXECUTABLE_PATH ??
    process.env.PLAYWRIGHT_EXECUTABLE_PATH ??
    (() => {
      if (existsSync("/usr/bin/chromium-browser")) return "/usr/bin/chromium-browser";
      if (existsSync("/usr/bin/chromium")) return "/usr/bin/chromium";
      return null;
    })();

  if (!executablePath) {
    // Último recurso: escanear cache de ms-playwright (funciona en dev/CI con browsers instalados)
    // Escaneo dinámico de revisiones para evitar hardcodear número de revisión.
    executablePath = findChromiumInPlaywrightCache();
  }

  if (!executablePath || !existsSync(executablePath)) {
    console.warn(
      `[armadoPdfFromHtml] Binario de Chromium no encontrado${executablePath ? ` en "${executablePath}"` : ""} — usando fallback.`,
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

    /**
     * @intervention ARCH-20260408-01
     * @respaldo context/SPECs/SPEC-pdf-dinamico-estudio-cliente.md
     */
    await page.emulateMedia({ media: "screen" });

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
    // Env var de producción Docker (Chromium del sistema Alpine)
    const envPath = process.env.CHROMIUM_EXECUTABLE_PATH ?? process.env.PLAYWRIGHT_EXECUTABLE_PATH;
    if (envPath && existsSync(envPath)) return true;

    // Rutas conocidas del sistema
    if (existsSync("/usr/bin/chromium-browser")) return true;
    if (existsSync("/usr/bin/chromium")) return true;

    // Fallback: escanear cache de ms-playwright (cualquier revisión instalada)
    if (findChromiumInPlaywrightCache()) return true;
    return false;
  } catch {
    return false;
  }
}
