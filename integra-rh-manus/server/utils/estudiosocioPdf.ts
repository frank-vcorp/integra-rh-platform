/**
 * estudiosocioPdf.ts
 * Generador de PDF para el Estudio Socioeconómico Domiciliario.
 * Usa pdf-lib (ya instalado). Patrón reutilizado de candidateConsent.ts.
 * @intervention ARCH-20260320-01
 * @respaldo context/armado/excel-preview.json
 */

import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage, PDFName, PDFString } from "pdf-lib";
import https from "node:https";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ── Tipos básicos ────────────────────────────────────────────────────────────

export interface PdfCandidato {
  nombreCompleto: string;
  telefono?: string | null;
  curp?: string | null;
}

export interface PdfProceso {
  id: number;
  clave?: string | null;
  direccion?: string | null;
  scheduledDateTime?: string | null;
  observaciones?: string | null;
}

/** ARCH-20260320-07 | Respaldo: PROYECTO.md */
const pdfCalificacionLabels: Record<string, string> = {
  pendiente: "Pendiente",
  recomendable: "Recomendable",
  con_reservas: "Con Reservas",
  no_recomendable: "No Recomendable",
  recomendable_con_observacion: "Recomendable con Observación",
  con_reservas_con_observacion: "Con Reservas con Observación",
};

/**
 * @intervention FIX-20260323-02
 * @respaldo context/interconsultas/DICTAMEN_FIX-20260323-02.md
 */
const pdfAsciiSafeLabels = {
  googleMapsLink: "-> Ver en Google Maps",
  checked: "[X]",
  unchecked: "[ ]",
} as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Descarga una URL y devuelve el Buffer. Soporta http/https. */
async function fetchBuffer(url: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    try {
      const lib = url.startsWith("https") ? https : http;
      lib.get(url, (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", () => resolve(null));
      }).on("error", () => resolve(null));
    } catch {
      resolve(null);
    }
  });
}

/** Detecta si es PNG por magic bytes. */
function isPng(buf: Buffer): boolean {
  return buf[0] === 0x89 && buf[1] === 0x50;
}

function formatDictamenValue(value?: string | null): string | null {
  if (!value) return null;
  return pdfCalificacionLabels[value] || value;
}

/** Lee el logo local de Sinergia RH desde el sistema de archivos. */
function loadLocalLogo(): Buffer | null {
  try {
    const here = fileURLToPath(import.meta.url);
    const logoPath = path.resolve(path.dirname(here), "../../client/public/sinergia-rh-logo-2026.png");
    if (fs.existsSync(logoPath)) return fs.readFileSync(logoPath);
  } catch { /* skip */ }
  return null;
}

/** Devuelve el color RGB de acento según la calificación final. */
function getCalificacionAccent(cal?: string | null): [number, number, number] {
  if (!cal) return [0.45, 0.45, 0.45];
  if (cal.startsWith("recomendable")) return [0.13, 0.63, 0.36];
  if (cal.startsWith("con_reservas")) return [0.93, 0.56, 0.13];
  if (cal.startsWith("no_recomendable")) return [0.86, 0.20, 0.18];
  return [0.45, 0.45, 0.45];
}

/** Dibuja un banner visual prominente con la calificación final del dictamen. */
function drawCalificacionBanner(ctx: Ctx, calificacion: string, comentario: string | null): void {
  const label = pdfCalificacionLabels[calificacion] || calificacion;
  const [r, g, b] = getCalificacionAccent(calificacion);
  const bannerH = comentario ? 70 : 58;
  ensureSpace(ctx, bannerH + 16);
  ctx.y -= 6;
  const bannerY = ctx.y - bannerH;
  // Fondo con tinte suave del color de calificación
  ctx.page.drawRectangle({
    x: MARGIN_X - 3,
    y: bannerY,
    width: A4_W - MARGIN_X * 2 + 6,
    height: bannerH,
    color: rgb(r * 0.08 + 0.92, g * 0.08 + 0.92, b * 0.08 + 0.92),
    borderColor: rgb(r, g, b),
    borderWidth: 1.5,
  });
  // Franja lateral izquierda
  ctx.page.drawRectangle({
    x: MARGIN_X - 3,
    y: bannerY,
    width: 8,
    height: bannerH,
    color: rgb(r, g, b),
  });
  // Etiqueta superior
  ctx.page.drawText("DICTAMEN FINAL", {
    x: MARGIN_X + 14,
    y: bannerY + bannerH - 16,
    size: 7,
    font: ctx.fontBold,
    color: rgb(0.35, 0.35, 0.35),
  });
  // Calificación en tamaño grande
  ctx.page.drawText(label.toUpperCase(), {
    x: MARGIN_X + 14,
    y: bannerY + (comentario ? 34 : 24),
    size: comentario ? 18 : 20,
    font: ctx.fontBold,
    color: rgb(r, g, b),
  });
  // Comentario de calificación
  if (comentario) {
    const maxLen = 98;
    const commentText = comentario.length > maxLen ? `${comentario.substring(0, maxLen)}…` : comentario;
    ctx.page.drawText(commentText, {
      x: MARGIN_X + 14,
      y: bannerY + 13,
      size: 7.5,
      font: ctx.font,
      color: rgb(0.22, 0.22, 0.22),
    });
  }
  ctx.y -= bannerH + 12;
}

/** Descarga el mapa estático de Google Maps para la dirección dada. */
async function fetchMapImage(address: string): Promise<Buffer | null> {
  const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || "";
  if (!apiKey || !address.trim()) return null;
  const encoded = encodeURIComponent(address);
  const url = `https://maps.googleapis.com/maps/api/staticmap?center=${encoded}&zoom=15&size=500x200&maptype=roadmap&markers=color:red%7C${encoded}&key=${apiKey}`;
  const buf = await fetchBuffer(url);
  return buf && buf.length > 1000 ? buf : null;
}

/**
 * Construye URL de Google Maps priorizando coordenadas GPS sobre dirección de texto.
 * @intervention IMPL-20260323-05
 */
function buildGoogleMapsUrl(
  gps?: { lat?: number; lon?: number } | null,
  address?: string | null,
): string | null {
  if (gps?.lat != null && gps?.lon != null) {
    return `https://www.google.com/maps?q=${gps.lat},${gps.lon}`;
  }
  if (address?.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
  }
  return null;
}

/**
 * Extrae la URL de captura del mapa del encuestador.
 * `mapaCapturaUrl` es el campo canónico (IMPL-20260323-02): generado en
 * EncuestadorPortal a partir de coordenadas GPS vía Google Static Maps API.
 * Las variantes restantes se conservan solo por compatibilidad con registros
 * históricos anteriores a IMPL-20260323-02.
 * @intervention IMPL-20260323-05 / ARCH-20260323-02
 */
function extractMapScreenshotUrl(ubicacion: Record<string, any>): string | null {
  const variants = [
    "mapaCapturaUrl",   // ← canónico (IMPL-20260323-02): URL estable de Google Static Maps
    "mapaCaptura",      // legado
    "mapScreenshotUrl", // legado
    "mapScreenshot",    // legado
    "capturaMapaUrl",   // legado
    "capturaMapa",      // legado
  ];
  for (const key of variants) {
    const val = ubicacion[key];
    if (typeof val === "string" && val.startsWith("http")) return val;
  }
  return null;
}

/**
 * Agrega una anotación URI clicable (enlace externo) sobre un rectángulo de página PDF.
 * Usa la API de anotaciones de pdf-lib 1.17.x. Falla silenciosamente.
 * @intervention IMPL-20260323-05
 */
function addUriAnnotation(
  pdfDoc: PDFDocument,
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  url: string,
): void {
  try {
    const annotRef = pdfDoc.context.register(
      pdfDoc.context.obj({
        Type: PDFName.of("Annot"),
        Subtype: PDFName.of("Link"),
        Rect: [x, y, x + width, y + height],
        Border: [0, 0, 0],
        A: {
          Type: PDFName.of("Action"),
          S: PDFName.of("URI"),
          URI: PDFString.of(url),
        },
      }),
    );
    page.node.addAnnot(annotRef);
  } catch { /* fail silently — viewer sin soporte de anotaciones */ }
}

/**
 * Agrega una anotación GoTo para navegación interna entre páginas del PDF.
 * Al hacer click navega a targetPage con vista FitPage.
 * @intervention IMPL-20260323-05
 */
function addGotoAnnotation(
  pdfDoc: PDFDocument,
  sourcePage: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  targetPage: PDFPage,
): void {
  try {
    const annotRef = pdfDoc.context.register(
      pdfDoc.context.obj({
        Type: PDFName.of("Annot"),
        Subtype: PDFName.of("Link"),
        Rect: [x, y, x + width, y + height],
        Border: [0, 0, 0],
        A: {
          Type: PDFName.of("Action"),
          S: PDFName.of("GoTo"),
          D: [targetPage.ref, PDFName.of("Fit")],
        },
      }),
    );
    sourcePage.node.addAnnot(annotRef);
  } catch { /* fail silently */ }
}

// ── Motor de renderizado ─────────────────────────────────────────────────────

const A4_W = 595.28;
const A4_H = 841.89;
const MARGIN_X = 45;
const MARGIN_BOTTOM = 50;
const LINE_H = 13;
const SECTION_GAP = 10;
const COL_RIGHT = A4_W / 2;

interface Ctx {
  pdfDoc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  fontBold: PDFFont;
  y: number;
  addPage: () => void;
}

function createCtx(pdfDoc: PDFDocument, font: PDFFont, fontBold: PDFFont): Ctx {
  const page = pdfDoc.addPage([A4_W, A4_H]);
  const ctx: Ctx = {
    pdfDoc,
    page,
    font,
    fontBold,
    y: A4_H - 45,
    addPage: () => {
      ctx.page = pdfDoc.addPage([A4_W, A4_H]);
      ctx.y = A4_H - 45;
    },
  };
  return ctx;
}

function ensureSpace(ctx: Ctx, needed = LINE_H * 2) {
  if (ctx.y - needed < MARGIN_BOTTOM) ctx.addPage();
}

function text(
  ctx: Ctx,
  str: string,
  opts: { x?: number; bold?: boolean; size?: number; color?: [number, number, number] } = {},
) {
  if (!str) return;
  const size = opts.size ?? 9;
  const usedFont = opts.bold ? ctx.fontBold : ctx.font;
  const [r, g, b] = opts.color ?? [0, 0, 0];
  const maxW = A4_W - MARGIN_X * 2;
  const x = opts.x ?? MARGIN_X;
  const availW = A4_W - x - MARGIN_X;

  // Word-wrap manual
  const words = str.split(/\s+/);
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (usedFont.widthOfTextAtSize(test, size) > (opts.x ? availW : maxW) && line) {
      ensureSpace(ctx, LINE_H + 4);
      ctx.page.drawText(line, { x, y: ctx.y, size, font: usedFont, color: rgb(r, g, b) });
      ctx.y -= LINE_H;
      line = word;
    } else {
      line = test;
    }
  }
  if (line) {
    ensureSpace(ctx, LINE_H + 4);
    ctx.page.drawText(line, { x, y: ctx.y, size, font: usedFont, color: rgb(r, g, b) });
    ctx.y -= LINE_H;
  }
}

function sectionHeader(ctx: Ctx, title: string) {
  ctx.y -= SECTION_GAP;
  ensureSpace(ctx, LINE_H * 3);
  // Fondo gris
  ctx.page.drawRectangle({
    x: MARGIN_X - 3,
    y: ctx.y - 2,
    width: A4_W - MARGIN_X * 2 + 6,
    height: LINE_H + 4,
    color: rgb(0.22, 0.38, 0.57),
  });
  ctx.page.drawText(title, {
    x: MARGIN_X,
    y: ctx.y,
    size: 9,
    font: ctx.fontBold,
    color: rgb(1, 1, 1),
  });
  ctx.y -= LINE_H + SECTION_GAP;
}

function field(ctx: Ctx, label: string, value?: string | number | boolean | null, col?: "left" | "right") {
  if (value === undefined || value === null || value === "") return;
  const strVal = typeof value === "boolean" ? (value ? "Sí" : "No") : String(value);
  const x = col === "right" ? COL_RIGHT : MARGIN_X;
  ensureSpace(ctx, LINE_H + 4);
  const labelW = ctx.fontBold.widthOfTextAtSize(`${label}: `, 8);
  ctx.page.drawText(`${label}: `, { x, y: ctx.y, size: 8, font: ctx.fontBold, color: rgb(0.3, 0.3, 0.3) });
  ctx.page.drawText(strVal, { x: x + labelW, y: ctx.y, size: 8, font: ctx.font, color: rgb(0, 0, 0) });
  if (col !== "right") ctx.y -= LINE_H;
}

function fieldPair(ctx: Ctx, l1: string, v1: string | null | undefined, l2: string, v2: string | null | undefined) {
  if (!v1 && !v2) return;
  const savedY = ctx.y;
  if (v1) field(ctx, l1, v1, "left");
  ctx.y = savedY;
  if (v2) field(ctx, l2, v2, "right");
  if (v1 || v2) ctx.y -= LINE_H;
}

function boolField(ctx: Ctx, label: string, val?: boolean | null, detail?: string | null) {
  if (val === undefined || val === null) return;
  field(ctx, label, val ? "Sí" : "No");
  if (val && detail) field(ctx, "  Detalle", detail);
}

function divider(ctx: Ctx) {
  ctx.y -= 4;
  ensureSpace(ctx);
  ctx.page.drawLine({
    start: { x: MARGIN_X, y: ctx.y },
    end: { x: A4_W - MARGIN_X, y: ctx.y },
    thickness: 0.4,
    color: rgb(0.75, 0.75, 0.75),
  });
  ctx.y -= 6;
}

function formatCurrency(value?: number | null): string | null {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return null;
  return `$${Number(value).toLocaleString("es-MX")}`;
}

function formatDateTime(value?: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString("es-MX", { timeZone: "America/Mexico_City" });
}

function drawMetricCard(
  ctx: Ctx,
  title: string,
  value: string,
  opts: { x: number; y: number; width: number; height: number; accent: [number, number, number] },
) {
  const [r, g, b] = opts.accent;
  ctx.page.drawRectangle({
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.height,
    color: rgb(0.95, 0.97, 0.99),
    borderColor: rgb(0.84, 0.89, 0.94),
    borderWidth: 1,
  });
  ctx.page.drawRectangle({
    x: opts.x,
    y: opts.y + opts.height - 5,
    width: opts.width,
    height: 5,
    color: rgb(r, g, b),
  });
  ctx.page.drawText(title.toUpperCase(), {
    x: opts.x + 10,
    y: opts.y + opts.height - 18,
    size: 7,
    font: ctx.fontBold,
    color: rgb(0.33, 0.42, 0.52),
  });
  ctx.page.drawText(value, {
    x: opts.x + 10,
    y: opts.y + 12,
    size: 10,
    font: ctx.fontBold,
    color: rgb(0.16, 0.23, 0.31),
  });
}

async function embedImage(ctx: Ctx, url: string, maxW = 120, maxH = 100): Promise<void> {
  try {
    const buf = await fetchBuffer(url);
    if (!buf || buf.length < 100) return;
    if (isPng(buf)) {
      const img = await ctx.pdfDoc.embedPng(buf);
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = img.width * scale;
      const h = img.height * scale;
      ensureSpace(ctx, h + LINE_H);
      ctx.y -= h;
      ctx.page.drawImage(img, { x: MARGIN_X, y: ctx.y, width: w, height: h });
      ctx.y -= LINE_H;
    } else {
      // Asumir JPEG
      const img = await ctx.pdfDoc.embedJpg(buf);
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = img.width * scale;
      const h = img.height * scale;
      ensureSpace(ctx, h + LINE_H);
      ctx.y -= h;
      ctx.page.drawImage(img, { x: MARGIN_X, y: ctx.y, width: w, height: h });
      ctx.y -= LINE_H;
    }
  } catch {
    // No bloquear si falla la imagen
  }
}

/**
 * Dibuja evidencias gráficas en dos columnas con etiqueta debajo de cada imagen.
 * @param ctx Contexto de renderizado PDF
 * @param items Array de tuplas [label, url] de las imágenes a dibujar
 * @param maxW Ancho máximo por imagen (default 220)
 * @param maxH Alto máximo por imagen (default 130)
 */
async function drawImagesGrid(
  ctx: Ctx,
  items: Array<[string, string]>,
  maxW = 220,
  maxH = 130,
): Promise<void> {
  const gap = 10;
  const colW = (A4_W - MARGIN_X * 2 - gap) / 2;
  for (let i = 0; i < items.length; i += 2) {
    const [label1, url1] = items[i];
    const pair = items[i + 1];
    ensureSpace(ctx, maxH + LINE_H * 2 + 10);
    const rowY = ctx.y;
    // Imagen izquierda
    const buf1 = await fetchBuffer(url1);
    let img1H = 0;
    if (buf1 && buf1.length > 100) {
      try {
        const img = isPng(buf1) ? await ctx.pdfDoc.embedPng(buf1) : await ctx.pdfDoc.embedJpg(buf1);
        const scale = Math.min(colW / img.width, maxH / img.height, 1);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.page.drawImage(img, { x: MARGIN_X, y: rowY - h, width: w, height: h });
        img1H = h;
      } catch { /* skip */ }
    }
    // Etiqueta izquierda debajo de la imagen
    ctx.page.drawText(label1, {
      x: MARGIN_X,
      y: rowY - img1H - LINE_H,
      size: 7,
      font: ctx.fontBold,
      color: rgb(0.3, 0.3, 0.3),
    });
    // Imagen derecha (si existe)
    let img2H = 0;
    if (pair) {
      const [label2, url2] = pair;
      const buf2 = await fetchBuffer(url2);
      if (buf2 && buf2.length > 100) {
        try {
          const img2 = isPng(buf2) ? await ctx.pdfDoc.embedPng(buf2) : await ctx.pdfDoc.embedJpg(buf2);
          const scale2 = Math.min(colW / img2.width, maxH / img2.height, 1);
          const w2 = img2.width * scale2;
          const h2 = img2.height * scale2;
          ctx.page.drawImage(img2, { x: MARGIN_X + colW + gap, y: rowY - h2, width: w2, height: h2 });
          img2H = h2;
        } catch { /* skip */ }
      }
      // Etiqueta derecha
      ctx.page.drawText(label2, {
        x: MARGIN_X + colW + gap,
        y: rowY - img2H - LINE_H,
        size: 7,
        font: ctx.fontBold,
        color: rgb(0.3, 0.3, 0.3),
      });
    }
    ctx.y -= Math.max(img1H, img2H, maxH) + LINE_H + 8;
  }
}

// ── Cuestionario completo (helper compartido) ──────────────────────────────
/**
 * Renderiza en el contexto PDF las secciones completas del cuestionario del
 * encuestador (§1-§12 del estudio domiciliario). Se comparte entre el PDF
 * interno del encuestador y el PDF cliente para evitar duplicación de lógica.
 * @intervention IMPL-20260323-01
 */
async function drawCuestionarioCompleto(ctx: Ctx, detalle: Record<string, any>): Promise<void> {
  // ── §1 UBICACIÓN Y DOMICILIO ─────────────────────────────────────────────
  const ub = detalle.ubicacion ?? {};
  if (Object.keys(ub).length > 0) {
    divider(ctx);
    sectionHeader(ctx, "§1  UBICACIÓN Y DOMICILIO");
    if (ub.gps?.lat) {
      field(ctx, "GPS", `${ub.gps.lat.toFixed(6)}, ${ub.gps.lon.toFixed(6)} (precisión: ${Math.round(ub.gps.accuracy ?? 0)}m)`);
      if (ub.gps.locked) field(ctx, "GPS bloqueado", "Sí");
    }
    field(ctx, "Domicilio", ub.domicilio);
    fieldPair(ctx, "C.P.", ub.cp, "Colonia/Municipio", ub.coloniaMunicipio);
    field(ctx, "Estado", ub.estado);
    // IMPL-20260323-05: Captura de mapa del encuestador si existe, con enlace clicable a Google Maps
    const screenshotUrlQ = extractMapScreenshotUrl(ub);
    if (screenshotUrlQ) {
      const mapBufQ = await fetchBuffer(screenshotUrlQ);
      if (mapBufQ && mapBufQ.length > 1000) {
        try {
          const mapImgQ = isPng(mapBufQ) ? await ctx.pdfDoc.embedPng(mapBufQ) : await ctx.pdfDoc.embedJpg(mapBufQ);
          const mapMaxWQ = A4_W - MARGIN_X * 2;
          const mapScaleQ = Math.min(mapMaxWQ / mapImgQ.width, 100 / mapImgQ.height, 1);
          const mapWQ = mapImgQ.width * mapScaleQ;
          const mapHQ = mapImgQ.height * mapScaleQ;
          ensureSpace(ctx, mapHQ + 20);
          ctx.y -= 4;
          const mapImgYQ = ctx.y - mapHQ;
          ctx.page.drawImage(mapImgQ, { x: MARGIN_X, y: mapImgYQ, width: mapWQ, height: mapHQ });
          const mapsUrlQ = buildGoogleMapsUrl(ub.gps?.lat != null ? ub.gps : null, ub.domicilio);
          if (mapsUrlQ) {
            addUriAnnotation(ctx.pdfDoc, ctx.page, MARGIN_X, mapImgYQ, mapWQ, mapHQ, mapsUrlQ);
            ctx.page.drawText(pdfAsciiSafeLabels.googleMapsLink, {
              x: MARGIN_X, y: mapImgYQ - 10, size: 7, font: ctx.font, color: rgb(0.10, 0.37, 0.75),
            });
            ctx.y -= mapHQ + 18;
          } else {
            ctx.y -= mapHQ + 8;
          }
        } catch { /* skip si falla la imagen del mapa */ }
      }
    }
  }

  // ── §2 INFORMACIÓN ACADÉMICA ─────────────────────────────────────────────
  const ac = detalle.academica ?? {};
  if (Object.keys(ac).length > 0) {
    sectionHeader(ctx, "§2  INFORMACIÓN ACADÉMICA");
    fieldPair(ctx, "Último grado", ac.ultimoGrado, "Institución", ac.institucion);
    fieldPair(ctx, "Ciudad", ac.ciudad, "Periodo", ac.periodo);
    fieldPair(ctx, "Documento obtenido", ac.documentoObtenido, "Folio", ac.folioDocumento);
    if (ac.estudiaActualmente !== undefined) field(ctx, "Estudia actualmente", ac.estudiaActualmente ? "Sí" : "No");
    if (ac.cursos?.length > 0) {
      field(ctx, "Cursos adicionales", `${ac.cursos.length} registrado(s)`);
      for (const c of ac.cursos) {
        text(ctx, `  • ${c.titulo || "—"} | ${c.institucion || ""} | ${c.periodo || ""}`, { size: 8 });
      }
    }
    if (ac.equiposMaquinas) field(ctx, "Equipos/Maquinaria", ac.equiposMaquinas);
    if (ac.programas) field(ctx, "Programas", ac.programas);
    if (ac.funcionesAdministrativas) field(ctx, "Funciones administrativas", ac.funcionesAdministrativas);
    if (ac.otrosConocimientos) field(ctx, "Otros conocimientos", ac.otrosConocimientos);
  }

  // ── §3 COTEJO DE DOCUMENTOS ──────────────────────────────────────────────
  const docs = detalle.documentos ?? {};
  if (Object.keys(docs).length > 0) {
    sectionHeader(ctx, "§3  COTEJO DE DOCUMENTOS");
    const docMap: [string, string][] = [
      ["Acta de nacimiento", docs.actaNacimiento?.tiene],
      ["Credencial de elector", docs.credencialElector?.tiene],
      ["Comprobante de domicilio", docs.comprobanteDomicilio?.tiene],
      ["Cartilla militar", docs.cartillaMilitar?.tiene],
      ["Pasaporte", docs.pasaporte?.tiene],
      ["Visa americana", docs.visaAmericana?.tiene],
      ["Cartas de recomendación", docs.cartasRecomendacion?.tiene],
      ["Licencia de conducir", docs.licenciaConducir?.tiene],
      ["Certificado/Título", docs.certificadoTitulo?.tiene],
    ];
    let col = 0;
    let rowStartY = ctx.y;
    for (const [label, val] of docMap) {
      if (val === undefined) continue;
      const x = col === 0 ? MARGIN_X : COL_RIGHT;
      const mark = val ? pdfAsciiSafeLabels.checked : pdfAsciiSafeLabels.unchecked;
      ctx.page.drawText(`${mark} ${label}`, { x, y: rowStartY, size: 8, font: ctx.font, color: rgb(0,0,0) });
      if (col === 1) { rowStartY -= LINE_H; col = 0; } else { col = 1; }
    }
    if (col === 1) rowStartY -= LINE_H;
    ctx.y = rowStartY - 4;
    if (docs.comprobanteDomicilio?.nombreTitular) field(ctx, "Titular comprobante", docs.comprobanteDomicilio.nombreTitular);
    if (docs.creditoInfonavit?.numero) field(ctx, "No. Infonavit", docs.creditoInfonavit.numero);
    if (docs.afore?.nombre) field(ctx, "AFORE", docs.afore.nombre);
    if (docs.tipoSangre) field(ctx, "Tipo de sangre", docs.tipoSangre);
  }

  // ── §4 DATOS FAMILIARES ──────────────────────────────────────────────────
  const fams = detalle.familiares ?? [];
  const otrasPersonasDomicilio = detalle.otrasPersonasDomicilio ?? [];
  if (fams.length > 0 || otrasPersonasDomicilio.length > 0) {
    sectionHeader(ctx, "§4  DATOS FAMILIARES");
    for (const f of fams) {
      ensureSpace(ctx, LINE_H * 2);
      fieldPair(ctx, f.parentesco || "Familiar", f.nombre, "Edad", f.edad ? String(f.edad) : null);
      fieldPair(ctx, "Escolaridad", f.escolaridad, "Ocupación", f.ocupacion);
      if (!f.habitaEnDomicilio) field(ctx, "Lugar de residencia", f.lugarResidencia);
      ctx.y -= 3;
    }
    if (otrasPersonasDomicilio.length > 0) {
      text(ctx, "Otras personas registradas en el domicilio:", { bold: true, size: 8 });
      for (const persona of otrasPersonasDomicilio) {
        fieldPair(ctx, persona.parentesco || "Relación", persona.nombre, "Edad", persona.edad ? String(persona.edad) : null);
        fieldPair(ctx, "Escolaridad", persona.escolaridad, "Ocupación", persona.ocupacion);
        if (!persona.habitaEnDomicilio) field(ctx, "Lugar de residencia", persona.lugarResidencia);
        ctx.y -= 3;
      }
    }
  }

  // ── §5 DINÁMICA FAMILIAR ─────────────────────────────────────────────────
  const din = detalle.dinamicaFamiliar ?? {};
  if (Object.keys(din).length > 0) {
    sectionHeader(ctx, "§5  DINÁMICA FAMILIAR");
    if (din.vivenSolos) field(ctx, "Viven solos", din.vivenSolos);
    if (din.quienCuidaHijos) field(ctx, "¿Quién cuida a los hijos?", din.quienCuidaHijos);
    if (din.dondeViveQuienCuida) field(ctx, "¿Dónde vive?", din.dondeViveQuienCuida);
    if (din.edadHijos) field(ctx, "Edades de hijos", din.edadHijos);
    if (din.parejaDacuerdo) field(ctx, "Pareja de acuerdo", din.parejaDacuerdo);
    if (din.esposaEmbarazada) field(ctx, "Esposa embarazada", din.esposaEmbarazada);
    boolField(ctx, "Tiene deudas", din.tieneDeudas, din.institucionDeuda);
    if (din.pensionAlimenticia !== undefined) field(ctx, "Pensión alimenticia", din.pensionAlimenticia ? "Sí" : "No");
    if (din.trabajoEstadosUnidos !== undefined) field(ctx, "Trabajó en EE.UU.", din.trabajoEstadosUnidos ? "Sí" : "No");
  }

  // ── §6 REFERENCIAS ECONÓMICAS (INGRESOS Y EGRESOS) ──────────────────────
  const ingresos = detalle.ingresosArray ?? [];
  const egresos = detalle.egresos ?? {};
  if (ingresos.length > 0 || Object.keys(egresos).length > 0) {
    sectionHeader(ctx, "§6  REFERENCIAS ECONÓMICAS");
    if (ingresos.length > 0) {
      text(ctx, "Ingresos familiares:", { bold: true, size: 8 });
      let totalIng = 0;
      for (const ing of ingresos) {
        const nombre = ing.nombre || "";
        const monto = ing.ingreso ? `$${ing.ingreso.toLocaleString("es-MX")}` : "";
        const aporte = ing.aportacionTotal ? ` / Aportacion: $${ing.aportacionTotal.toLocaleString("es-MX")}` : "";
        text(ctx, `  ${nombre}${ing.parentesco ? ` (${ing.parentesco})` : ""}: ${monto}${aporte}`, { size: 8 });
        totalIng += Number(ing.aportacionTotal ?? ing.ingreso ?? 0);
      }
      if (totalIng > 0) text(ctx, `  Total ingresos: $${totalIng.toLocaleString("es-MX")}`, { bold: true, size: 8 });
      ctx.y -= 4;
    }
    if (Object.keys(egresos).length > 0) {
      text(ctx, "Egresos:", { bold: true, size: 8 });
      const egMap: [string, number | undefined][] = [
        ["Servicios (agua/luz/gas/tel)", (egresos.servicios ? Object.values(egresos.servicios).reduce((a: number, v) => a + (Number(v) || 0), 0) : 0) || undefined],
        ["Alimentación/Despensa", egresos.alimentacionDespensa],
        ["Vestido/Calzado", egresos.vestidoCalzado],
        ["Colegiaturas", egresos.colegiaturas],
        ["Tarjetas de crédito", egresos.tarjetasCredito],
        ["Transportación", egresos.transportacion],
        ["Renta/Hipoteca/Infonavit", egresos.rentaHipotecaInfonavit],
        ["Gastos médicos", egresos.gastosMedicos],
        ["Recreaciones", egresos.recreaciones],
        ["Otros gastos", egresos.otrosGastos],
      ];
      let totalEg = 0;
      for (const [label, val] of egMap) {
        if (!val) continue;
        text(ctx, `  ${label}: $${Number(val).toLocaleString("es-MX")}`, { size: 8 });
        totalEg += Number(val);
      }
      if (totalEg > 0) text(ctx, `  Total egresos: $${totalEg.toLocaleString("es-MX")}`, { bold: true, size: 8 });
    }
  }

  // ── §7 ESTADO DE SALUD ───────────────────────────────────────────────────
  const salud = detalle.salud ?? {};
  if (Object.keys(salud).length > 0) {
    sectionHeader(ctx, "§7  ESTADO DE SALUD");
    fieldPair(ctx, "Servicio médico", salud.servicioMedico, "Estado de salud", salud.estadoSalud);
    fieldPair(ctx, "Última cita", salud.ultimaCitaFecha, "Causa", salud.ultimaCitaCausa);
    boolField(ctx, "Enfermedades crónicas", salud.enfermedadesCronicas, salud.enfermedadesCuales);
    boolField(ctx, "Int. quirúrgica", salud.intervencionQuirurgica, salud.intervencionCual);
    boolField(ctx, "Alergias", salud.alergias, salud.alergiasCuales);
    boolField(ctx, "Enf. hereditarias", salud.enfermedadesHereditarias, salud.enfermedadesHereditariasCuales ? `${salud.enfermedadesHereditariasCuales}${salud.enfermedadesHereditariasQuien ? ` | ¿Quién?: ${salud.enfermedadesHereditariasQuien}` : ""}` : salud.enfermedadesHereditariasQuien);
    boolField(ctx, "Toma medicamentos", salud.medicamentos, salud.medicamentosCuales);
    boolField(ctx, "Drogas", salud.drogas, salud.drogasCuales);
    boolField(ctx, "Accidentes relevantes", salud.accidentes, salud.cuidadosMedicos);
    if (salud.fuma !== undefined) field(ctx, "Fuma", salud.fuma ? `Sí (${salud.cigarrosDiarios || "?"} cigarros/día)` : "No");
    if (salud.toma !== undefined) field(ctx, "Consume alcohol", salud.toma ? `Sí — ${salud.tomaTipoBebida || ""} (${salud.tomaCadaCuando || ""})` : "No");
  }

  // ── §8 INFORMACIÓN SOCIAL ────────────────────────────────────────────────
  const social = detalle.social ?? {};
  if (Object.keys(social).length > 0) {
    sectionHeader(ctx, "§8  INFORMACIÓN SOCIAL");
    if (social.pasatiempos) field(ctx, "Pasatiempos", social.pasatiempos);
    if (social.deporte !== undefined) field(ctx, "Deporte", social.deporte ? `Sí: ${social.deporteCual || ""} (${social.deporteFrecuencia || ""})` : "No");
    if (social.actividadFamiliar !== undefined) field(ctx, "Actividad familiar", social.actividadFamiliar ? `Sí: ${social.actividadFamiliarCual || ""} (${social.actividadFamiliarFrecuencia || ""})` : "No");
    if (social.discotecas !== undefined) field(ctx, "Antros/Discotecas", social.discotecas ? `Sí: ${social.discotecasCual || ""} (${social.discotecasFrecuencia || ""})` : "No");
    if (social.eventosReligiosos !== undefined) field(ctx, "Eventos religiosos", social.eventosReligiosos ? `Sí: ${social.eventosReligiososCual || ""} (${social.eventosReligiososFrecuencia || ""})` : "No");
    boolField(ctx, "Grupo deportivo", social.grupoDeportivo, social.grupoDeportivoCual);
    boolField(ctx, "Partido político", social.partidoPolitico, social.partidoPoliticoCual);
    if (social.tatuajesPiercings !== undefined) field(ctx, "Tatuajes/Piercings", social.tatuajesPiercings ? "Sí" : "No");
  }

  // ── §9 ÁREA JURÍDICA (DECLARACIÓN DEL CANDIDATO) ─────────────────────────
  const jur = detalle.juridica ?? {};
  if (Object.keys(jur).length > 0) {
    sectionHeader(ctx, "§9  ÁREA JURÍDICA");
    boolField(ctx, "Proceso legal", jur.procesoLegal, jur.procesoLegalPorQue);
    if (jur.procesoLegal && jur.procesoLegalQuien) field(ctx, "  ¿Quién?", jur.procesoLegalQuien);
    boolField(ctx, "Privado de libertad", jur.privadoLibertad, jur.privadoLibertadPorQue);
    if (jur.privadoLibertad && jur.privadoLibertadQuien) field(ctx, "  ¿Quién?", jur.privadoLibertadQuien);
    boolField(ctx, "Problemas laborales", jur.problemasLaborales, jur.problemasLaboralesPorQue);
    if (jur.problemasLaborales && jur.problemasLaboralesQuien) field(ctx, "  ¿Quién?", jur.problemasLaboralesQuien);
    boolField(ctx, "Partido político", jur.partidoPolitico, jur.partidoPoliticoCual);
    if (jur.partidoPolitico && jur.partidoPoliticoQuien) field(ctx, "  ¿Quién?", jur.partidoPoliticoQuien);
    boolField(ctx, "Sindicato", jur.sindicato, jur.sindicatoCual);
    if (jur.sindicato && jur.sindicatoQuien) field(ctx, "  ¿Quién?", jur.sindicatoQuien);
    boolField(ctx, "Puestos políticos", jur.puestosPoliticos, jur.puestosPoliticosCual);
    if (jur.puestosPoliticos && jur.puestosPoliticosQuien) field(ctx, "  ¿Quién?", jur.puestosPoliticosQuien);
  }

  // ── §10 DINÁMICA DE VIVIENDA ─────────────────────────────────────────────
  const dv = detalle.dinamicaVivienda ?? {};
  if (Object.keys(dv).length > 0) {
    sectionHeader(ctx, "§10  DINÁMICA DE VIVIENDA");
    boolField(ctx, "Personas con discapacidad", dv.personasDiscapacidad, dv.discapacidadQuien && `${dv.discapacidadQuien} — ${dv.discapacidadTipo || ""}`);
    if (dv.numeroDependientes) field(ctx, "N° dependientes económicos", String(dv.numeroDependientes));
    if (dv.dependientesDetalle) field(ctx, "Detalle dependientes", dv.dependientesDetalle);
    if (dv.matrimoniosAnteriores !== undefined) field(ctx, "Matrimonios anteriores", dv.matrimoniosAnteriores ? "Sí" : "No");
    boolField(ctx, "Hijos de matrimonios anteriores", dv.hijosMatrimoniosAnteriores, dv.hijosMatrimoniosCuantos ? String(dv.hijosMatrimoniosCuantos) : null);
    if (dv.pensionAlimenticia !== undefined) field(ctx, "Pensión alimenticia", dv.pensionAlimenticia ? `Sí ($${dv.pensionMonto || "?"})` : "No");
    if (dv.quienCuidaHijos) field(ctx, "¿Quién cuida hijos?", dv.quienCuidaHijos);
    if (dv.quienCuidaDonde) field(ctx, "¿Dónde vive quien cuida?", dv.quienCuidaDonde);
    if (dv.parejaDeAcuerdo !== undefined) field(ctx, "Pareja de acuerdo", dv.parejaDeAcuerdo ? "Sí" : "No");
    if (dv.esposaEmbarazada !== undefined) field(ctx, "Esposa embarazada", dv.esposaEmbarazada ? "Sí" : "No");
    if (dv.rutasForaneas !== undefined) field(ctx, "Disponible rutas foráneas", dv.rutasForaneas ? "Sí" : "No");
    if (dv.inconvenienteAusencia !== undefined) field(ctx, "Inconveniente por ausencia", dv.inconvenienteAusencia ? "Sí" : "No");
    if (dv.comprendActividades) field(ctx, "Comprende las actividades", dv.comprendActividades);
  }

  // ── §14 DATOS DEL INMUEBLE ───────────────────────────────────────────────
  const inm = detalle.inmueble ?? {};
  if (Object.keys(inm).length > 0) {
    sectionHeader(ctx, "§14  DATOS DEL INMUEBLE");
    fieldPair(ctx, "Tipo de inmueble", inm.tipoInmueble, "Valor aprox.", inm.valorAprox ? `$${Number(inm.valorAprox).toLocaleString("es-MX")}` : null);
    fieldPair(ctx, "Superficie", inm.superficie, "Fachada", inm.fachada);
    fieldPair(ctx, "Baños", inm.numeroBanos ? String(inm.numeroBanos) : null, "Pisos", inm.pisos);
    fieldPair(ctx, "Paredes", inm.paredes, "Niveles", inm.niveles ? String(inm.niveles) : null);
    fieldPair(ctx, "Recámaras", inm.numeroRecamaras ? String(inm.numeroRecamaras) : null, "Estado vivienda", inm.estadoVivienda);
    fieldPair(ctx, "Orden/Limpieza", inm.ordenLimpieza, "Zona", inm.zona);
    fieldPair(ctx, "Predial", inm.predial, "Tiempo residencia actual", inm.tiempoResidenciaActual);
    if (inm.serviciosPublicos?.length) field(ctx, "Servicios públicos", inm.serviciosPublicos.join(", "));
    if (inm.muebles?.length) field(ctx, "Muebles", inm.muebles.join(", "));
    if (inm.estadoMuebles) field(ctx, "Estado de muebles", inm.estadoMuebles);
    fieldPair(ctx, "Medio transporte", inm.medioTransporte, "Tiempo traslado", inm.tiempoTraslado);
    if (inm.precioPasaje) field(ctx, "Precio pasaje", `$${inm.precioPasaje}`);
    const cuartos = [
      inm.tieneSala && "Sala",
      inm.tieneComedor && "Comedor",
      inm.tieneCocina && "Cocina",
      inm.tieneJardin && "Jardín",
      inm.tienePatio && "Patio",
      inm.tieneCochera && "Cochera",
    ].filter(Boolean);
    if (cuartos.length) field(ctx, "Espacios", cuartos.join(", "));
    if (inm.tiempoResidenciaAnterior) field(ctx, "Tiempo residencia anterior", inm.tiempoResidenciaAnterior);
  }

  // ── §13 CRÉDITOS, PROPIEDADES Y PATRIMONIO ───────────────────────────────
  const creds = detalle.creditos ?? [];
  const bienes = detalle.bienesRaices ?? [];
  const vehs = detalle.vehiculos ?? [];
  const negs = detalle.negocios ?? [];
  if (creds.length || bienes.length || vehs.length || negs.length) {
    sectionHeader(ctx, "§13  CRÉDITOS, PROPIEDADES Y PATRIMONIO");
    if (creds.length) {
      text(ctx, "Créditos:", { bold: true, size: 8 });
      for (const c of creds) {
        const parts = [c.institucion, c.montoCredito ? `Monto: $${c.montoCredito}` : "", c.mensualidad ? `Mensualidad: $${c.mensualidad}` : "", c.adeudo ? `Adeudo: $${c.adeudo}` : ""].filter(Boolean);
        text(ctx, `  • ${parts.join(" | ")}`, { size: 8 });
      }
    }
    if (bienes.length) {
      text(ctx, "Bienes raíces:", { bold: true, size: 8 });
      for (const b of bienes) {
        text(ctx, `  • ${b.tipoPropiedad || "—"} | ${b.ubicacion || ""} | Valor: $${b.valorAprox?.toLocaleString("es-MX") || "?"} | A nombre de: ${b.aNombreDe || ""}`, { size: 8 });
      }
    }
    if (vehs.length) {
      text(ctx, "Vehículos:", { bold: true, size: 8 });
      for (const v of vehs) {
        text(ctx, `  • ${v.marcaModelo || "—"} | Valor: $${v.valorComercial?.toLocaleString("es-MX") || "?"} | Saldo: $${v.saldo || 0} | A nombre de: ${v.aNombreDe || ""}`, { size: 8 });
      }
    }
    if (negs.length) {
      text(ctx, "Negocios:", { bold: true, size: 8 });
      for (const n of negs) {
        text(ctx, `  • ${n.tipoNegocio || "—"} | ${n.ubicacion || ""} | Propietario: ${n.propietario || ""}`, { size: 8 });
      }
    }
    if (detalle.actividadDesempleo?.ingreso || detalle.actividadDesempleo?.comoSeAnuncia) {
      text(ctx, "Actividad en periodos de desempleo:", { bold: true, size: 8 });
      fieldPair(ctx, "Ingreso generado", detalle.actividadDesempleo?.ingreso, "Cómo se anuncia", detalle.actividadDesempleo?.comoSeAnuncia);
    }
  }

  // ── §15a REFERENCIAS VECINALES ───────────────────────────────────────────
  const refVec = detalle.referenciasVecinales ?? [];
  if (refVec.length > 0) {
    sectionHeader(ctx, "§15  REFERENCIAS VECINALES");
    for (const rv of refVec) {
      ensureSpace(ctx, LINE_H * 4);
      fieldPair(ctx, "Nombre", rv.nombre, "Teléfono", rv.telefono);
      fieldPair(ctx, "Ocupación", rv.ocupacion, "Tiempo de conocerlo", rv.tiempoDeConocerlo);
      fieldPair(ctx, "Domicilio", rv.domicilio, "Candidato vive ahí", rv.candidatoViveAhi === undefined ? null : rv.candidatoViveAhi ? "Sí" : "No");
      fieldPair(ctx, "Número de hijos", rv.cuantosHijos, "Quién cuida hijos", rv.quienCuidaHijos);
      if (rv.empleosAnteriores) field(ctx, "Empleos anteriores referidos", rv.empleosAnteriores);
      if (rv.comentarios) field(ctx, "Comentarios", rv.comentarios);
      ctx.y -= 3;
    }
  }

  // ── §15b REFERENCIAS PERSONALES ─────────────────────────────────────────
  const refPer = detalle.referenciasPersonales ?? (detalle.refPersonales ?? []);
  if (refPer.length > 0) {
    sectionHeader(ctx, "§15b  REFERENCIAS PERSONALES");
    for (const rp of refPer) {
      ensureSpace(ctx, LINE_H * 3);
      fieldPair(ctx, "Nombre", rp.nombre, "Teléfono", rp.telefono);
      fieldPair(ctx, "Ocupación", rp.ocupacion, "Tiempo de conocerlo", rp.tiempoDeConocerlo);
      if (rp.domicilio) field(ctx, "Domicilio", rp.domicilio);
      if (rp.referencia) field(ctx, "Referencia", rp.referencia);
      ctx.y -= 3;
    }
  }

  // ── §16 OTROS DATOS ──────────────────────────────────────────────────────
  const otros = detalle.otrosDatos ?? {};
  if (Object.keys(otros).length > 0) {
    sectionHeader(ctx, "§16  OTROS DATOS");
    boolField(ctx, "Trabajó en grupo (empresa)", otros.trabajoEnGrupo, otros.trabajoEnGrupoCual && `${otros.trabajoEnGrupoCual} | ${otros.trabajoEnGrupoPeriodo || ""} | Motivo salida: ${otros.trabajoEnGrupoMotivoSalida || ""}`);
    boolField(ctx, "Familiares en empresa", otros.familiaresEnGrupo, otros.familiarNombre && `${otros.familiarNombre} — ${otros.familiarPuestoDepto || ""}`);
  }

  // ── §11 FOTOGRAFÍAS DEL DOMICILIO ────────────────────────────────────────
  const fotosD = detalle.fotos ?? {};
  const evidGrafD: string[] = Array.isArray(detalle.evidenciasGraficas)
    ? detalle.evidenciasGraficas.filter((u: unknown) => typeof u === "string" && u.startsWith("http"))
    : [];
  const fotoEntriesD: [string, string][] = [
    ["Comedor", fotosD.comedor],
    ["Cocina", fotosD.cocina],
    ["Sala", fotosD.sala],
    ["Fachada desde el patio", fotosD.fachadaPatio],
    ["Vista fachada desde la calle", fotosD.fachadaCalle],
  ].filter((e): e is [string, string] => !!e[1]);
  const grafEntriesD: [string, string][] = evidGrafD.map((url, idx) => [`Evidencia ${idx + 1}`, url]);
  const allImgsD = [...fotoEntriesD, ...grafEntriesD];
  if (allImgsD.length > 0) {
    sectionHeader(ctx, "§11  FOTOGRAFÍAS DEL DOMICILIO");
    await drawImagesGrid(ctx, allImgsD);
  }

  // ── §12 OBSERVACIONES DE VISITA (DEL ENCUESTADOR) ────────────────────────
  const cierre = detalle.cierre ?? {};
  const conclusionDirecta = (detalle.conclusion as string) || (detalle.comentarios as string) || null;
  const textoObservaciones = cierre.observaciones || conclusionDirecta;
  if (textoObservaciones) {
    sectionHeader(ctx, "§12  OBSERVACIONES DEL ENCUESTADOR");
    text(ctx, textoObservaciones, { size: 8 });
    ctx.y -= 6;
  }
}

// ── Generador principal ──────────────────────────────────────────────────────

export async function generarEstudioSocioeconomicoPDF(
  candidato: PdfCandidato,
  proceso: PdfProceso,
  detalle: Record<string, any>,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const ctx = createCtx(pdfDoc, font, fontBold);

  const totalIngresos = Array.isArray(detalle.ingresosArray)
    ? detalle.ingresosArray.reduce((acc: number, item: Record<string, unknown>) => acc + Number(item.aportacionTotal ?? item.ingreso ?? 0), 0)
    : 0;
  const totalEgresos = detalle.egresos
    ? Object.values(detalle.egresos as Record<string, unknown>).reduce((acc: number, item) => {
        if (!item) return acc;
        if (typeof item === "object") {
          return acc + Object.values(item as Record<string, unknown>).reduce((subAcc: number, subItem) => subAcc + Number(subItem ?? 0), 0);
        }
        return acc + Number(item ?? 0);
      }, 0)
    : 0;
  const domicilioEjecutivo = detalle.ubicacion?.domicilio || proceso.direccion || "Sin dirección registrada";
  const fechaVisita = formatDateTime(proceso.scheduledDateTime) || "Pendiente de programación";

  // ── PORTADA EJECUTIVA ───────────────────────────────────────────────────
  ctx.page.drawRectangle({ x: 0, y: A4_H - 92, width: A4_W, height: 92, color: rgb(0.13, 0.24, 0.36) });
  ctx.page.drawRectangle({ x: 0, y: A4_H - 98, width: A4_W, height: 6, color: rgb(0.84, 0.67, 0.29) });
  ctx.page.drawText("ESTUDIO SOCIOECONÓMICO DOMICILIARIO", {
    x: MARGIN_X, y: A4_H - 34, size: 15, font: fontBold, color: rgb(1, 1, 1),
  });
  ctx.page.drawText("Portada ejecutiva de consulta rápida", {
    x: MARGIN_X, y: A4_H - 55, size: 9, font: fontBold, color: rgb(0.84, 0.9, 0.96),
  });
  ctx.page.drawText("Integra RH · Documento confidencial para revisión operativa", {
    x: MARGIN_X, y: A4_H - 71, size: 8, font, color: rgb(0.75, 0.84, 0.92),
  });

  drawMetricCard(ctx, "Proceso", proceso.clave || `Proceso ${proceso.id}`, {
    x: MARGIN_X,
    y: A4_H - 175,
    width: 155,
    height: 58,
    accent: [0.23, 0.51, 0.76],
  });
  drawMetricCard(ctx, "Fecha de visita", fechaVisita, {
    x: MARGIN_X + 170,
    y: A4_H - 175,
    width: 160,
    height: 58,
    accent: [0.17, 0.61, 0.53],
  });
  drawMetricCard(ctx, "Generado", formatDateTime(new Date().toISOString()) || "", {
    x: MARGIN_X + 345,
    y: A4_H - 175,
    width: 160,
    height: 58,
    accent: [0.84, 0.67, 0.29],
  });

  ctx.y = A4_H - 205;

  sectionHeader(ctx, "RESUMEN EJECUTIVO");
  fieldPair(ctx, "Candidato", candidato.nombreCompleto, "Teléfono", candidato.telefono);
  fieldPair(ctx, "CURP", candidato.curp, "Último grado", detalle.academica?.ultimoGrado);
  field(ctx, "Domicilio visitado", domicilioEjecutivo);
  fieldPair(ctx, "Tipo de inmueble", detalle.inmueble?.tipoInmueble, "Estado vivienda", detalle.inmueble?.estadoVivienda);
  fieldPair(ctx, "Orden y limpieza", detalle.inmueble?.ordenLimpieza, "Medio transporte", detalle.inmueble?.medioTransporte);
  fieldPair(ctx, "Tiempo de traslado", detalle.inmueble?.tiempoTraslado, "Disponibilidad foránea", detalle.dinamicaVivienda?.rutasForaneas === undefined ? null : detalle.dinamicaVivienda?.rutasForaneas ? "Sí" : "No");
  fieldPair(ctx, "Ingresos familiares", formatCurrency(totalIngresos), "Egresos familiares", formatCurrency(totalEgresos));
  fieldPair(ctx, "Estado de salud", detalle.salud?.estadoSalud, "Servicio médico", detalle.salud?.servicioMedico);
  if (proceso.observaciones) field(ctx, "Observaciones logísticas", proceso.observaciones);
  text(ctx, "Nota: la aceptación de términos, confidencialidad y demás evidencias internas del levantamiento se resguardan en el expediente operativo y no forman parte de este PDF.", { size: 8, color: [0.35, 0.41, 0.47] });
  divider(ctx);

  // ── §1-§12 CUESTIONARIO COMPLETO DEL ENCUESTADOR ────────────────────────
  // La lógica de render vive en drawCuestionarioCompleto (helper compartido).
  await drawCuestionarioCompleto(ctx, detalle);
  // Dato del sistema (no del formulario): dirección programada del proceso
  if (proceso.direccion) field(ctx, "Dirección programada", proceso.direccion);

  // ── PIE DE PÁGINA EN CADA PÁGINA ─────────────────────────────────────────
  const pageCount = pdfDoc.getPageCount();
  for (let i = 0; i < pageCount; i++) {
    const pg = pdfDoc.getPage(i);
    pg.drawText(`Página ${i + 1} de ${pageCount}  ·  Folio: ES-${proceso.id}-${Date.now()}`, {
      x: MARGIN_X, y: 18, size: 7, font, color: rgb(0.55, 0.55, 0.55),
    });
    pg.drawText("DOCUMENTO CONFIDENCIAL — Integra RH", {
      x: A4_W - MARGIN_X - 145, y: 18, size: 7, font, color: rgb(0.55, 0.55, 0.55),
    });
  }

  return pdfDoc.save();
}

function addPdfFooter(pdfDoc: PDFDocument, font: PDFFont, folioBase: string) {
  const pageCount = pdfDoc.getPageCount();
  for (let i = 0; i < pageCount; i++) {
    const pg = pdfDoc.getPage(i);
    pg.drawText(`Página ${i + 1} de ${pageCount}  ·  Folio: ${folioBase}`, {
      x: MARGIN_X, y: 18, size: 7, font, color: rgb(0.55, 0.55, 0.55),
    });
    pg.drawText("DOCUMENTO CONFIDENCIAL — Integra RH", {
      x: A4_W - MARGIN_X - 145, y: 18, size: 7, font, color: rgb(0.55, 0.55, 0.55),
    });
  }
}

function formatSectionLabel(section: string) {
  const map: Record<string, string> = {
    generales_candidato: "Generales del candidato",
    documentos: "Documentos",
    investigacion_laboral: "Historial laboral verificado",
    investigacion_legal: "Investigación legal",
    semanas_cotizadas: "Semanas cotizadas",
    buro_credito: "Buró de crédito",
    visita_domiciliaria: "Visita domiciliaria",
    captura_visita: "Cuestionario socioeconómico domiciliario",
    observaciones_conclusion: "Conclusión del analista",
  };
  return map[section] || section;
}

function safeJoin(values: Array<string | null | undefined>, separator = " · ") {
  return values.map((value) => String(value || "").trim()).filter(Boolean).join(separator) || null;
}

export async function generarArmadoClientePDF(
  snapshot: Record<string, any>,
  sections: string[],
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const ctx = createCtx(pdfDoc, font, fontBold);

  const candidate = snapshot.candidate || {};
  const client = snapshot.client || {};
  const post = snapshot.post || {};
  const process = snapshot.process || {};
  const perfil = candidate.perfilDetalle || {};
  const generales = perfil.generales || {};
  const workHistory = Array.isArray(snapshot.workHistory) ? snapshot.workHistory : [];
  const documents = Array.isArray(snapshot.documents) ? snapshot.documents : [];
  const generatedAt = formatDateTime(snapshot.generatedAt) || formatDateTime(new Date().toISOString()) || "";
  const folioBase = `ARM-${process.id || "NA"}-${Date.now()}`;

  // ── PORTADA ─────────────────────────────────────────────────────────────
  ctx.page.drawRectangle({ x: 0, y: A4_H - 92, width: A4_W, height: 92, color: rgb(0.13, 0.24, 0.36) });
  ctx.page.drawRectangle({ x: 0, y: A4_H - 98, width: A4_W, height: 6, color: rgb(0.84, 0.67, 0.29) });
  // Logo de Sinergia RH
  const logoBuf = loadLocalLogo();
  if (logoBuf) {
    try {
      const logoImg = await pdfDoc.embedPng(logoBuf);
      const logoScale = Math.min(110 / logoImg.width, 44 / logoImg.height, 1);
      const logoW = logoImg.width * logoScale;
      const logoH = logoImg.height * logoScale;
      ctx.page.drawImage(logoImg, { x: A4_W - MARGIN_X - logoW, y: A4_H - 16 - logoH, width: logoW, height: logoH });
    } catch { /* skip */ }
  }
  ctx.page.drawText("REPORTE DE ESTUDIO", {
    x: MARGIN_X, y: A4_H - 34, size: 15, font: fontBold, color: rgb(1, 1, 1),
  });
  if (client.nombreEmpresa) {
    ctx.page.drawText(client.nombreEmpresa, {
      x: MARGIN_X, y: A4_H - 55, size: 10, font: fontBold, color: rgb(0.84, 0.9, 0.96),
    });
  }
  const headerSubtitle = [post.nombreDelPuesto || post.nombre, candidate.nombreCompleto].filter(Boolean).join("  ·  ");
  if (headerSubtitle) {
    ctx.page.drawText(headerSubtitle, {
      x: MARGIN_X, y: A4_H - 71, size: 8, font, color: rgb(0.75, 0.84, 0.92),
    });
  }

  drawMetricCard(ctx, "Proceso", process.clave || `Proceso ${process.id || "—"}`, {
    x: MARGIN_X,
    y: A4_H - 175,
    width: 155,
    height: 58,
    accent: [0.23, 0.51, 0.76],
  });
  drawMetricCard(ctx, "Candidato", candidate.nombreCompleto || "—", {
    x: MARGIN_X + 170,
    y: A4_H - 175,
    width: 160,
    height: 58,
    accent: [0.17, 0.61, 0.53],
  });
  drawMetricCard(ctx, "Puesto", post.nombreDelPuesto || post.nombre || "—", {
    x: MARGIN_X + 345,
    y: A4_H - 175,
    width: 160,
    height: 58,
    accent: [0.84, 0.67, 0.29],
  });

  ctx.y = A4_H - 205;

  // ── Calificación final: protagonismo visual fuerte ──────────────────────
  if (process.calificacionFinal) {
    drawCalificacionBanner(ctx, process.calificacionFinal, process.comentarioCalificacion || null);
  }

  // ── ÍNDICE DINÁMICO ─────────────────────────────────────────────────────
  // @intervention IMPL-20260323-20 | Índice visual de secciones incluidas
  // @intervention IMPL-20260323-05 | Tracking para anotaciones GoTo clicables
  const PDF_INDEX_SECTION_LABELS: Record<string, string> = {
    generales_candidato: "Generales del candidato",
    documentos: "Documentos",
    investigacion_laboral: "Historial laboral verificado",
    investigacion_legal: "Investigación legal",
    semanas_cotizadas: "Semanas cotizadas",
    buro_credito: "Buró de crédito",
    visita_domiciliaria: "Visita domiciliaria",
    captura_visita: "Cuestionario socioeconómico domiciliario",
    observaciones_conclusion: "Conclusión del analista",
  };
  const PDF_SECTION_ORDER = [
    "generales_candidato",
    "documentos",
    "investigacion_laboral",
    "investigacion_legal",
    "semanas_cotizadas",
    "buro_credito",
    "visita_domiciliaria",
    "captura_visita",
    "observaciones_conclusion",
  ];
  const includedSections = PDF_SECTION_ORDER.filter((s) => sections.includes(s));
  // Tracking para anotaciones clicables del índice — se resuelven al final del render
  type IndexAnnotEntry = { sectionKey: string; page: PDFPage; x: number; y: number; w: number; h: number };
  type SectionTarget = { sectionKey: string; targetPage: PDFPage };
  const indexAnnotsPending: IndexAnnotEntry[] = [];
  const sectionPageStarts: SectionTarget[] = [];
  if (includedSections.length > 0) {
    const indexBlockH = 18 + includedSections.length * 14 + 12;
    ensureSpace(ctx, indexBlockH + 10);
    ctx.y -= 4;
    const idxPage = ctx.page; // Página donde se dibuja el índice
    ctx.page.drawRectangle({
      x: MARGIN_X - 3,
      y: ctx.y - indexBlockH,
      width: A4_W - MARGIN_X * 2 + 6,
      height: indexBlockH,
      color: rgb(0.96, 0.97, 0.98),
      borderColor: rgb(0.84, 0.89, 0.94),
      borderWidth: 0.8,
    });
    ctx.page.drawText("CONTENIDO DE ESTE REPORTE", {
      x: MARGIN_X + 6,
      y: ctx.y - 14,
      size: 7,
      font: fontBold,
      color: rgb(0.33, 0.42, 0.52),
    });
    let idxY = ctx.y - 26;
    includedSections.forEach((sec, i) => {
      const label = PDF_INDEX_SECTION_LABELS[sec] || sec;
      const num = `§ ${i + 1}`;
      ctx.page.drawText(num, {
        x: MARGIN_X + 6,
        y: idxY,
        size: 8,
        font: fontBold,
        color: rgb(0.22, 0.38, 0.57),
      });
      ctx.page.drawText(label, {
        x: MARGIN_X + 28,
        y: idxY,
        size: 8,
        font,
        color: rgb(0.16, 0.23, 0.31),
      });
      // Puntos guía
      const dotStart = MARGIN_X + 28 + font.widthOfTextAtSize(label, 8) + 6;
      const dotEnd = A4_W - MARGIN_X - 6;
      let dotX = dotStart;
      while (dotX < dotEnd) {
        ctx.page.drawText(".", { x: dotX, y: idxY, size: 8, font, color: rgb(0.8, 0.8, 0.8) });
        dotX += 4;
      }
      // IMPL-20260323-05: guardar bounding box para anotación GoTo (resuelta al final)
      indexAnnotsPending.push({
        sectionKey: sec,
        page: idxPage,
        x: MARGIN_X + 6,
        y: idxY - 2,
        w: A4_W - MARGIN_X * 2 - 12,
        h: 12,
      });
      idxY -= 14;
    });
    ctx.y -= indexBlockH + 10;
  }

  if (sections.includes("generales_candidato")) {
    sectionHeader(ctx, "GENERALES DEL CANDIDATO");
    sectionPageStarts.push({ sectionKey: "generales_candidato", targetPage: ctx.page });
    fieldPair(ctx, "Nombre completo", candidate.nombreCompleto, "Teléfono", candidate.telefono);
    fieldPair(ctx, "Correo", candidate.email, "Puesto", post.nombreDelPuesto || post.nombre || null);
    fieldPair(ctx, "CURP", generales.curp, "RFC", generales.rfc);
    fieldPair(ctx, "NSS", generales.nss, "Edad", generales.edad ? String(generales.edad) : null);
    fieldPair(ctx, "Fecha nacimiento", generales.fechaNacimiento, "Lugar nacimiento", generales.lugarNacimiento);
    fieldPair(ctx, "Estado civil", generales.estadoCivil, "Escolaridad", generales.escolaridad);
    field(ctx, "Domicilio", safeJoin([
      generales.domicilio,
      generales.colonia,
      generales.municipio,
      generales.estado,
      generales.cp,
    ], ", ") || process.visitStatus?.direccion || null);
    field(ctx, "Redes sociales", safeJoin([generales.facebook, generales.instagram, generales.linkedin], " | "));
  }

  if (sections.includes("documentos")) {
    sectionHeader(ctx, "DOCUMENTOS");
    sectionPageStarts.push({ sectionKey: "documentos", targetPage: ctx.page });
    if (documents.length === 0) {
      text(ctx, "Sin documentos adjuntados.", { size: 8 });
    } else {
      for (const doc of documents) {
        ensureSpace(ctx, LINE_H * 2);
        fieldPair(ctx, "Tipo", doc.tipoDocumento, "Archivo", doc.nombreArchivo);
        // Embeber imagen si el documento tiene URL y es formato de imagen
        const docUrl: string | undefined = doc.url ?? doc.downloadUrl ?? doc.fileUrl;
        if (docUrl) {
          const fileName = (doc.nombreArchivo || "").toLowerCase();
          const isImgDoc = fileName.endsWith(".png") || fileName.endsWith(".jpg") || fileName.endsWith(".jpeg");
          if (isImgDoc) {
            await embedImage(ctx, docUrl, 200, 140);
          }
        }
        ctx.y -= 3;
      }
    }
  }

  if (sections.includes("investigacion_laboral")) {
    sectionHeader(ctx, "INVESTIGACIÓN LABORAL");
    sectionPageStarts.push({ sectionKey: "investigacion_laboral", targetPage: ctx.page });
    field(ctx, "Resultado global", formatDictamenValue(process.investigacionLaboral?.resultado || candidate.dictamenLaboral?.resultado || null));
    field(ctx, "Observación del estatus", candidate.dictamenLaboral?.observacionResultado || null);
    field(ctx, "Detalle general", process.investigacionLaboral?.detalles || candidate.dictamenLaboral?.comentariosGenerales || null);
    if (workHistory.length === 0) {
      text(ctx, "Sin historial laboral registrado en el snapshot.", { size: 8 });
    } else {
      for (const item of workHistory) {
        ensureSpace(ctx, LINE_H * 3);
        fieldPair(ctx, "Empresa", item.empresa, "Puesto", item.puesto);
        fieldPair(ctx, "Periodo", safeJoin([item.fechaInicio, item.fechaFin], " a "), "Resultado", item.resultadoVerificacion || item.estatusInvestigacion || null);
        field(ctx, "Comentario", item.comentarioInvestigacion || item.observaciones || null);
        ctx.y -= 3;
      }
    }
  }

  if (sections.includes("investigacion_legal")) {
    sectionHeader(ctx, "INVESTIGACIÓN LEGAL");
    sectionPageStarts.push({ sectionKey: "investigacion_legal", targetPage: ctx.page });
    field(ctx, "Antecedentes", process.investigacionLegal?.antecedentes || null);
    field(ctx, "Riesgo detectado", process.investigacionLegal?.flagRiesgo === undefined ? null : process.investigacionLegal?.flagRiesgo ? "Sí" : "No");
    field(ctx, "Notas periodísticas", process.investigacionLegal?.notasPeriodisticas || null);
    field(ctx, "Observaciones", process.antecedentesPenales?.comentarios || null);
  }

  if (sections.includes("semanas_cotizadas")) {
    sectionHeader(ctx, "SEMANAS COTIZADAS");
    sectionPageStarts.push({ sectionKey: "semanas_cotizadas", targetPage: ctx.page });
    // IMPL-20260320-01: disposición global del candidato (no de cada empleo)
    field(ctx, "Disposición IMSS (global)", candidate.dictamenLaboral?.disposicionSemanasCotizadas || null);
    field(ctx, "Motivo disposición", candidate.dictamenLaboral?.motivoDisposicion || null);
    field(ctx, "Comentario de cotejo", process.semanasDetalle?.comentario || null);
    const evidencias = Array.isArray(process.semanasDetalle?.evidenciasGraficas) ? process.semanasDetalle.evidenciasGraficas.length : 0;
    field(ctx, "Evidencias relacionadas", evidencias ? `${evidencias} archivo(s)` : null);
  }

  if (sections.includes("buro_credito")) {
    sectionHeader(ctx, "BURÓ DE CRÉDITO");
    sectionPageStarts.push({ sectionKey: "buro_credito", targetPage: ctx.page });
    fieldPair(ctx, "Estatus", process.buroCredito?.estatus || null, "Score", process.buroCredito?.score || null);
    field(ctx, "Resultado", process.buroCredito?.aprobado === undefined ? null : process.buroCredito?.aprobado ? "Aprobado" : "No aprobado");
    const adicionales = Array.isArray(process.buroCredito?.archivosAdicionales) ? process.buroCredito.archivosAdicionales.length : 0;
    field(ctx, "Archivos adicionales", adicionales ? `${adicionales} archivo(s)` : null);
  }

  if (sections.includes("visita_domiciliaria")) {
    sectionHeader(ctx, "VISITA DOMICILIARIA");
    sectionPageStarts.push({ sectionKey: "visita_domiciliaria", targetPage: ctx.page });
    fieldPair(ctx, "Estatus", process.visitStatus?.status || process.estatusProceso || null, "Fecha", formatDateTime(process.visitStatus?.scheduledDateTime));
    const visitDir: string | null = process.visitStatus?.direccion || process.visitaDetalle?.ubicacion?.domicilio || null;
    field(ctx, "Dirección", visitDir);
    // IMPL-20260323-05: Mapa con soporte de captura del encuestador + enlace clicable a Google Maps
    const visitGps = process.visitaDetalle?.ubicacion?.gps ?? null;
    const mapsClickUrl = buildGoogleMapsUrl(visitGps, visitDir);
    const ubicVD: Record<string, any> = process.visitaDetalle?.ubicacion ?? {};
    const screenshotUrl = extractMapScreenshotUrl(ubicVD);
    // Prioridad: captura del encuestador → mapa estático por API
    let mapBuf: Buffer | null = null;
    if (screenshotUrl) {
      const raw = await fetchBuffer(screenshotUrl);
      if (raw && raw.length > 1000) mapBuf = raw;
    }
    if (!mapBuf && visitDir) mapBuf = await fetchMapImage(visitDir);
    if (mapBuf) {
      try {
        ensureSpace(ctx, 115);
        ctx.y -= 4;
        const mapImg = isPng(mapBuf) ? await pdfDoc.embedPng(mapBuf) : await pdfDoc.embedJpg(mapBuf);
        const mapMaxW = A4_W - MARGIN_X * 2;
        const mapScale = Math.min(mapMaxW / mapImg.width, 100 / mapImg.height, 1);
        const mapW = mapImg.width * mapScale;
        const mapH = mapImg.height * mapScale;
        const mapImgY = ctx.y - mapH;
        ctx.page.drawImage(mapImg, { x: MARGIN_X, y: mapImgY, width: mapW, height: mapH });
        // Anotación URI clicable hacia Google Maps
        if (mapsClickUrl) {
          addUriAnnotation(pdfDoc, ctx.page, MARGIN_X, mapImgY, mapW, mapH, mapsClickUrl);
          ctx.page.drawText(pdfAsciiSafeLabels.googleMapsLink, {
            x: MARGIN_X, y: mapImgY - 10, size: 7, font, color: rgb(0.10, 0.37, 0.75),
          });
          ctx.y -= mapH + 18;
        } else {
          ctx.y -= mapH + 8;
        }
      } catch { /* skip si falla el mapa */ }
    }
    field(ctx, "Observaciones logísticas", process.visitStatus?.observaciones || null);
  }

  if (sections.includes("captura_visita")) {
    // IMPL-20260323-01: Cuestionario completo del encuestador.
    // Se reutiliza drawCuestionarioCompleto (helper compartido con generarEstudioSocioeconomicoPDF).
    // Evita duplicación y garantiza paridad editorial entre ambos PDFs.
    sectionHeader(ctx, "CUESTIONARIO SOCIOECONÓMICO DOMICILIARIO");
    sectionPageStarts.push({ sectionKey: "captura_visita", targetPage: ctx.page });
    const vd = process.visitaDetalle || {};
    // Excluir claves de metadatos internos de captura (_*) y trazabilidad
    const vdPublico: Record<string, any> = {};
    for (const [k, v] of Object.entries(vd)) {
      if (!k.startsWith("_")) vdPublico[k] = v;
    }
    if (Object.keys(vdPublico).length === 0) {
      text(ctx, "Sin captura registrada para esta visita.", { size: 8, color: [0.5, 0.5, 0.5] });
    } else {
      await drawCuestionarioCompleto(ctx, vdPublico);
    }
  }

  if (sections.includes("observaciones_conclusion")) {
    sectionHeader(ctx, "CONCLUSIÓN");
    sectionPageStarts.push({ sectionKey: "observaciones_conclusion", targetPage: ctx.page });
    field(ctx, "Resumen ejecutivo", process.investigacionLaboral?.iaDictamenCliente?.resumenEjecutivoCliente || null);
    if (Array.isArray(process.investigacionLaboral?.iaDictamenCliente?.recomendacionesCliente) && process.investigacionLaboral.iaDictamenCliente.recomendacionesCliente.length > 0) {
      text(ctx, "Recomendaciones:", { bold: true, size: 8 });
      for (const recommendation of process.investigacionLaboral.iaDictamenCliente.recomendacionesCliente) {
        text(ctx, `  • ${recommendation}`, { size: 8 });
      }
    }
  }

  addPdfFooter(pdfDoc, font, folioBase);
  // IMPL-20260323-05: Resolver anotaciones GoTo del índice ahora que se conocen las páginas destino
  for (const pending of indexAnnotsPending) {
    const target = sectionPageStarts.find((s) => s.sectionKey === pending.sectionKey);
    if (target) {
      addGotoAnnotation(pdfDoc, pending.page, pending.x, pending.y, pending.w, pending.h, target.targetPage);
    }
  }
  return pdfDoc.save();
}
