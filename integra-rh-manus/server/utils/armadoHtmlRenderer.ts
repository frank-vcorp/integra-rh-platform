/**
 * armadoHtmlRenderer.ts
 * Renderer HTML editorial standalone para Armados de cliente.
 * Genera un documento HTML autocontenido (CSS inline, sin dependencias externas)
 * desde el editorialSnapshot inmutable. Comparte la misma estructura editorial
 * que el PDF — ambos salen del mismo snapshot, ninguno lee datos vivos.
 *
 * @intervention IMPL-20260320-01
 * @respaldo context/SPECs/SPEC-pdf-dinamico-estudio-cliente.md
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ── Constantes ────────────────────────────────────────────────────────────────

const CALIFICACION_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  recomendable: "Recomendable",
  con_reservas: "Con Reservas",
  no_recomendable: "No Recomendable",
  recomendable_con_observacion: "Recomendable con Observación",
  con_reservas_con_observacion: "Con Reservas con Observación",
};

interface SectionMeta {
  title: string;
  anchor: string;
}

const ALL_SECTION_META: Record<string, SectionMeta> = {
  generales_candidato: { title: "Generales del candidato", anchor: "sec-generales" },
  documentos: { title: "Documentos", anchor: "sec-documentos" },
  investigacion_laboral: { title: "Investigación laboral", anchor: "sec-laboral" },
  investigacion_legal: { title: "Investigación legal", anchor: "sec-legal" },
  semanas_cotizadas: { title: "Semanas cotizadas", anchor: "sec-semanas" },
  buro_credito: { title: "Buró de crédito", anchor: "sec-buro" },
  visita_domiciliaria: { title: "Visita domiciliaria", anchor: "sec-visita" },
  captura_visita: { title: "Formulario del encuestador", anchor: "sec-captura" },
  observaciones_conclusion: { title: "Observaciones y conclusión", anchor: "sec-conclusiones" },
  documentos_adicionales: { title: "Documentos adicionales", anchor: "sec-docs-adicionales" },
};

// ── Helpers internos ──────────────────────────────────────────────────────────

/** Escapa HTML básico para prevenir XSS en el output. */
function esc(str?: unknown): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeText(value: unknown): string {
  if (value === null || value === undefined) return "—";
  const str = String(value).trim();
  return str || "—";
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("es-MX", {
      timeZone: "America/Mexico_City",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("es-MX", {
      timeZone: "America/Mexico_City",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return String(value);
  }
}

function formatCurrency(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return "—";
  return `$${Number(value).toLocaleString("es-MX")}`;
}

interface CalColors {
  bg: string;
  text: string;
  border: string;
  accent: string;
}

function calificacionColors(cal?: string | null): CalColors {
  if (!cal || cal === "pendiente") {
    return { bg: "#f8fafc", text: "#64748b", border: "#cbd5e1", accent: "#64748b" };
  }
  if (cal.startsWith("recomendable")) {
    return { bg: "#f0fdf4", text: "#14532d", border: "#86efac", accent: "#16a34a" };
  }
  if (cal.startsWith("con_reservas")) {
    return { bg: "#fffbeb", text: "#78350f", border: "#fcd34d", accent: "#d97706" };
  }
  if (cal.startsWith("no_recomendable")) {
    return { bg: "#fef2f2", text: "#7f1d1d", border: "#fca5a5", accent: "#dc2626" };
  }
  return { bg: "#f8fafc", text: "#374151", border: "#d1d5db", accent: "#6b7280" };
}

/** Carga el logo local de Sinergia RH como base64 para embeber en HTML. */
function loadLogoBase64(): string | null {
  try {
    const here = fileURLToPath(import.meta.url);
    const logoPath = path.resolve(
      path.dirname(here),
      "../../client/public/sinergia-rh-logo-2026.png",
    );
    if (fs.existsSync(logoPath)) {
      return fs.readFileSync(logoPath).toString("base64");
    }
  } catch {
    // sin logo: no bloquear el render
  }
  return null;
}

// ── Micro-helpers de HTML ─────────────────────────────────────────────────────

function field(label: string, value?: unknown): string {
  const val = value === null || value === undefined ? null : String(value).trim();
  if (!val) return "";
  return `
    <div class="field-row">
      <span class="field-label">${esc(label)}</span>
      <span class="field-value">${esc(val)}</span>
    </div>`;
}

function fieldPair(
  l1: string,
  v1: unknown,
  l2: string,
  v2: unknown,
): string {
  const a = field(l1, v1);
  const b = field(l2, v2);
  if (!a && !b) return "";
  return `<div class="field-pair">${a || `<div class="field-row"></div>`}${b || `<div class="field-row"></div>`}</div>`;
}

function sectionBlock(
  anchor: string,
  numLabel: string,
  title: string,
  body: string,
): string {
  return `
  <section id="${anchor}" class="doc-section">
    <div class="section-header">
      <span class="section-num">${esc(numLabel)}</span>
      <h2 class="section-title">${esc(title)}</h2>
    </div>
    <div class="section-body">
      ${body || '<p class="empty-note">Sin datos registrados para esta sección.</p>'}
    </div>
  </section>`;
}

function badgeChip(text: string, color = "#1e3a5f"): string {
  return `<span style="display:inline-block;background:${color}14;color:${color};border:1px solid ${color}40;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600;margin:2px">${esc(text)}</span>`;
}

function infoCard(label: string, value: string, accentColor = "#1e3a5f"): string {
  return `
  <div class="metric-card" style="border-top:4px solid ${accentColor}">
    <div class="metric-label">${esc(label)}</div>
    <div class="metric-value">${esc(value)}</div>
  </div>`;
}

// ── Construcción de secciones ─────────────────────────────────────────────────

/**
 * Extrae la URL de captura del mapa del encuestador priorizando la key canónica.
 * Variantes legacy se conservan como fallback para registros históricos.
 * @intervention IMPL-20260408-01 | ARCH-20260408-12
 */
function extractMapUrl(ubicacion: Record<string, any>): string | null {
  const variants = [
    "mapaCapturaUrl",   // canónico (IMPL-20260323-02)
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
 * Construye URL de Google Maps priorizando coordenadas GPS sobre dirección de texto.
 * @intervention IMPL-20260408-01 | ARCH-20260408-12
 */
function buildMapsUrl(
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

// ── Clasificación editorial de documentos ──────────────────────────────────
// @intervention IMPL-20260408-02 | ARCH-20260408-13

type DocCategory = "legal" | "semanas" | "buro" | "general" | "adicional";

/**
 * Clasifica un documento de la tabla por su tipo para ubicarlo en la sección
 * editorial correcta en lugar de la tabla global de Documentos.
 */
function classifyDoc(tipoDocumento: string): DocCategory {
  const t = String(tipoDocumento || "")
    .toUpperCase()
    .replace(/[ÁÉÍÓÚ]/g, (c) => ({Á:"A",É:"E",Í:"I",Ó:"O",Ú:"U"}[c] ?? c));
  if (/ANTECEDENTES|PENALES|INV[A-Z]*LEGAL|JURIDIC/.test(t)) return "legal";
  if (/SEMANAS|IMSS|COTIZADA/.test(t)) return "semanas";
  if (/BURO|CREDITO/.test(t)) return "buro";
  // Identificadores básicos del candidato → generales del expediente
  if (/^(CV|CURRICULUM|INE|IFE|CREDENCIAL|CURP|RFC|NSS|CONSENTIMIENTO|ACTA|COMPROBANTE|DOMICILIO|CARTILLA|PASAPORTE|LICENCIA|TITULO|CERTIFICADO|IDENTIFICACION|CARTA|PSICOMETRICO|DICTAMEN|FOTO|REFERENCIA)/.test(t)) return "general";
  return "adicional";
}

/**
 * Renderiza una mini-tabla de documentos con URLs clicables.
 * Usada dentro de secciones temáticas para mostrar sus adjuntos.
 */
function renderDocumentLinksBlock(docs: any[]): string {
  if (docs.length === 0) return "";
  const rows = docs
    .map((d: any) => {
      const hasUrl = typeof d.url === "string" && d.url.startsWith("http");
      const nombre = esc(d.nombreArchivo || d.tipoDocumento || "—");
      const tipo = esc(d.tipoDocumento || "—");
      return `
    <tr>
      <td>${tipo}</td>
      <td>${hasUrl ? `<a href="${esc(d.url)}" target="_blank" rel="noopener noreferrer" style="color:#0369a1;font-weight:600">${nombre} ↗</a>` : nombre}</td>
    </tr>`;
    })
    .join("");
  return `
  <table class="data-table" style="margin-top:8px">
    <thead><tr><th>Tipo</th><th>Archivo</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

/**
 * Renderiza imágenes en formato spread editorial (media página).
 * Usada para las evidencias de legal, semanas y el encuestador.
 * @intervention IMPL-20260408-02 | ARCH-20260408-13
 */
function renderEvidenceSpread(urls: string[], baseLabel = "Evidencia"): string {
  const valid = urls.filter((u) => typeof u === "string" && u.startsWith("http"));
  if (valid.length === 0) return "";
  return valid
    .map(
      (url, idx) => `
  <div class="evidence-spread">
    <img src="${esc(url)}" alt="${esc(`${baseLabel} ${idx + 1}`)}" class="evidence-spread-img"
      onerror="this.closest('.evidence-spread').style.display='none'" />
    <div class="evidence-caption">${esc(`${baseLabel} ${idx + 1}`)}</div>
  </div>`,
    )
    .join("");
}

// ── Construcción de secciones ─────────────────────────────────────────────────

function buildGeneralesCandidato(snapshot: Record<string, any>): string {
  const candidate = snapshot.candidate || {};
  const post = snapshot.post || {};
  const process = snapshot.process || {};
  const perfil = candidate.perfilDetalle || {};
  const generales = perfil.generales || {};

  const domicilio = [
    generales.domicilio,
    generales.colonia,
    generales.municipio,
    generales.estado,
    generales.cp ? `C.P. ${generales.cp}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return `
  <div class="metrics-row">
    ${infoCard("Candidato", candidate.nombreCompleto || "—", "#1e3a5f")}
    ${infoCard("Puesto solicitado", post.nombreDelPuesto || post.nombre || "—", "#0369a1")}
    ${infoCard("Tipo de estudio", process.tipoProducto || "—", "#0d9488")}
  </div>
  ${field("Nombre completo", candidate.nombreCompleto)}
  ${field("Teléfono", candidate.telefono)}
  ${field("Correo electrónico", candidate.email)}
  ${fieldPair("CURP", generales.curp, "RFC", generales.rfc)}
  ${fieldPair("NSS", generales.nss, "Edad", generales.edad ? `${generales.edad} años` : null)}
  ${fieldPair("Fecha de nacimiento", formatDate(generales.fechaNacimiento), "Lugar de nacimiento", generales.lugarNacimiento)}
  ${fieldPair("Estado civil", generales.estadoCivil, "Escolaridad", generales.escolaridad)}
  ${field("Domicilio", domicilio || null)}
  ${generales.facebook || generales.instagram || generales.linkedin ? `
    <div class="subsection-title">Redes sociales</div>
    ${field("Facebook", generales.facebook)}
    ${field("Instagram", generales.instagram)}
    ${field("LinkedIn", generales.linkedin)}
  ` : ""}`;
}

/**
 * Sección Documentos: muestra únicamente documentos generales/transversales
 * del expediente. Los temáticos (legal, semanas, buró) viven en su sección.
 * @intervention IMPL-20260408-02 | ARCH-20260408-13
 */
function buildDocumentos(snapshot: Record<string, any>): string {
  const allDocs: any[] = Array.isArray(snapshot.documents) ? snapshot.documents : [];
  const generalDocs = allDocs.filter((d) => classifyDoc(d.tipoDocumento) === "general");
  const tematicos = allDocs.filter((d) => {
    const cat = classifyDoc(d.tipoDocumento);
    return cat === "legal" || cat === "semanas" || cat === "buro";
  });

  let body = "";

  if (generalDocs.length === 0 && tematicos.length === 0) {
    return '<p class="empty-note">No se adjuntaron documentos en este armado.</p>';
  }

  if (generalDocs.length > 0) {
    body += renderDocumentLinksBlock(generalDocs);
  } else {
    body += '<p class="empty-note">Sin documentos generales adjuntos. Los adjuntos temáticos aparecen en su sección correspondiente.</p>';
  }

  if (tematicos.length > 0) {
    body += `<div class="info-banner" style="margin-top:12px">ℹ Los adjuntos de investigación legal, semanas cotizadas y buró de crédito (${tematicos.length}) se muestran dentro de su sección correspondiente en este reporte.</div>`;
  }

  return body;
}

function buildInvestigacionLaboral(snapshot: Record<string, any>): string {
  const process = snapshot.process || {};
  const candidate = snapshot.candidate || {};
  const workHistory: any[] = Array.isArray(snapshot.workHistory) ? snapshot.workHistory : [];
  const dictamen = candidate.dictamenLaboral || {};
  const inv = process.investigacionLaboral || {};
  const resultado = dictamen.resultado || inv.resultado || null;

  let body = "";

  if (resultado) {
    const calColors = calificacionColors(resultado);
    body += `
    <div class="cal-banner" style="background:${calColors.bg};border-color:${calColors.border};border-left:6px solid ${calColors.accent}">
      <div class="cal-label">RESULTADO LABORAL GLOBAL</div>
      <div class="cal-value" style="color:${calColors.text}">${esc(CALIFICACION_LABELS[resultado] || resultado)}</div>
      ${dictamen.observacionResultado ? `<div class="cal-comment">${esc(dictamen.observacionResultado)}</div>` : ""}
    </div>`;
  }

  body += field("Comentario general", dictamen.comentariosGenerales || inv.detalles || null);

  if (workHistory.length === 0) {
    body += '<p class="empty-note">Sin historial laboral registrado en este snapshot.</p>';
  } else {
    body += '<div class="subsection-title">Historial laboral verificado</div>';
    body += '<div class="work-history-list">';
    for (const item of workHistory) {
      const periodo =
        item.fechaInicio && item.fechaFin
          ? `${item.fechaInicio} — ${item.fechaFin}`
          : item.fechaInicio || item.fechaFin || null;
      const resultadoItem = item.resultadoVerificacion || item.estatusInvestigacion || null;
      let resultBadge = "";
      if (resultadoItem) {
        const col = resultadoItem.toLowerCase().includes("no") ? "#dc2626" : "#16a34a";
        resultBadge = badgeChip(resultadoItem, col);
      }
      // Causal de baja: dato principal. Periodo: secundario.
      // @intervention IMPL-20260408-02 | ARCH-20260408-13
      const causalBaja =
        item.causalSalidaRH ||
        item.causalSalidaJefeInmediato ||
        (item.investigacionDetalle as any)?.incidencias?.motivoSeparacionEmpresa ||
        (item.investigacionDetalle as any)?.incidencias?.motivoSeparacionCandidato ||
        null;
      const puestoFinal =
        (item.investigacionDetalle as any)?.puesto?.puestoFinal ||
        (item.investigacionDetalle as any)?.puesto?.puestoInicial ||
        item.puesto ||
        "";
      body += `
      <div class="work-item">
        <div class="work-item-header">
          <strong>${esc(item.empresa || "—")}</strong>
          <span class="work-puesto">${esc(puestoFinal)}</span>
          ${resultBadge}
        </div>
        ${causalBaja ? `<div class="work-causal"><span class="work-causal-label">Causal de baja:</span> ${esc(causalBaja)}</div>` : ""}
        ${periodo ? `<div class="work-periodo">${esc(periodo)}</div>` : ""}
        ${item.comentarioInvestigacion ? `<div class="work-comment">${esc(item.comentarioInvestigacion)}</div>` : ""}
      </div>`;
    }
    body += "</div>";
  }

  return body;
}

/**
 * Investigación legal + antecedentes penales con adjuntos integrados.
 * @intervention IMPL-20260408-02 | ARCH-20260408-13
 */
function buildInvestigacionLegal(snapshot: Record<string, any>): string {
  const process = snapshot.process || {};
  const inv = process.investigacionLegal || {};
  const penales = process.antecedentesPenales || {};
  const allDocs: any[] = Array.isArray(snapshot.documents) ? snapshot.documents : [];
  const legalDocs = allDocs.filter((d) => classifyDoc(d.tipoDocumento) === "legal");

  let body = "";

  if (inv.flagRiesgo) {
    body += `<div class="alert-banner">⚠ Se detectó riesgo en investigación legal</div>`;
  }

  body += field("Antecedentes / Hallazgos", inv.antecedentes || null);
  body += field("Notas periodísticas", inv.notasPeriodisticas || null);
  body += field("Observaciones IMSS", inv.observacionesImss || null);
  body += field("Comentarios adicionales", penales.comentarios || null);

  // Adjuntos y evidencias gráficas dentro del apartado
  const legalImgs: string[] = [
    ...(Array.isArray(inv.evidenciasGraficas) ? inv.evidenciasGraficas : []),
    ...(inv.evidenciaImgUrl ? [inv.evidenciaImgUrl] : []),
  ].filter((u): u is string => typeof u === "string" && u.startsWith("http"));

  const penalesImgs: string[] = Array.isArray(penales.evidenciasGraficas)
    ? penales.evidenciasGraficas.filter((u: unknown): u is string => typeof u === "string" && u.startsWith("http"))
    : [];

  if (inv.archivoAdjuntoUrl) {
    body += `<div style="margin:10px 0">
      <a href="${esc(inv.archivoAdjuntoUrl)}" target="_blank" rel="noopener noreferrer" class="maps-link">Ver documento adjunto de investigación legal ↗</a>
    </div>`;
  }

  if (legalImgs.length > 0) {
    body += `<div class="subsection-title">Evidencias de investigación legal (${legalImgs.length})</div>`;
    body += renderEvidenceSpread(legalImgs, "Evidencia legal");
  }

  if (penalesImgs.length > 0) {
    body += `<div class="subsection-title">Evidencias de antecedentes penales (${penalesImgs.length})</div>`;
    body += renderEvidenceSpread(penalesImgs, "Evidencia penales");
  }

  if (legalDocs.length > 0) {
    body += `<div class="subsection-title">Documentos adjuntos (${legalDocs.length})</div>`;
    body += renderDocumentLinksBlock(legalDocs);
  }

  if (!body.trim()) {
    body = '<p class="empty-note">Sin hallazgos legales registrados.</p>';
  }

  return body;
}

/**
 * Semanas cotizadas con evidencias gráficas integradas.
 * @intervention IMPL-20260408-02 | ARCH-20260408-13
 */
function buildSemanasWotizadas(snapshot: Record<string, any>): string {
  const process = snapshot.process || {};
  const candidate = snapshot.candidate || {};
  const dictamen = candidate.dictamenLaboral || {};
  const semanas = process.semanasDetalle || {};
  const allDocs: any[] = Array.isArray(snapshot.documents) ? snapshot.documents : [];
  const semanasDocs = allDocs.filter((d) => classifyDoc(d.tipoDocumento) === "semanas");

  let body = "";

  if (dictamen.disposicionSemanasCotizadas) {
    body += `
    <div class="info-banner">
      <strong>Disposición IMSS (global):</strong> ${esc(dictamen.disposicionSemanasCotizadas)}
      ${dictamen.motivoDisposicion ? `<br><strong>Motivo:</strong> ${esc(dictamen.motivoDisposicion)}` : ""}
    </div>`;
  }

  body += field("Comentario de cotejo", semanas.comentario || null);

  // Evidencias gráficas integradas en el apartado
  const semanasImgs: string[] = Array.isArray(semanas.evidenciasGraficas)
    ? semanas.evidenciasGraficas.filter((u: unknown): u is string => typeof u === "string" && u.startsWith("http"))
    : [];

  if (semanasImgs.length > 0) {
    body += `<div class="subsection-title">Evidencias de semanas cotizadas (${semanasImgs.length})</div>`;
    body += renderEvidenceSpread(semanasImgs, "Evidencia IMSS");
  }

  if (semanasDocs.length > 0) {
    body += `<div class="subsection-title">Documentos adjuntos (${semanasDocs.length})</div>`;
    body += renderDocumentLinksBlock(semanasDocs);
  }

  if (!body.trim()) {
    body = '<p class="empty-note">Sin datos de semanas cotizadas registrados.</p>';
  }

  return body;
}

/**
 * Buró de crédito con PDF principal + archivos adicionales integrados.
 * @intervention IMPL-20260408-02 | ARCH-20260408-13
 */
function buildBuroCredito(snapshot: Record<string, any>): string {
  const process = snapshot.process || {};
  const buro = process.buroCredito || {};
  const allDocs: any[] = Array.isArray(snapshot.documents) ? snapshot.documents : [];
  const buroDocs = allDocs.filter((d) => classifyDoc(d.tipoDocumento) === "buro");

  if (!buro || Object.keys(buro).length === 0) {
    return '<p class="empty-note">Sin reporte de buró de crédito registrado.</p>';
  }

  let body = "";

  const aprobadoText =
    buro.aprobado === true ? "Aprobado" : buro.aprobado === false ? "No aprobado" : null;

  const calColors = aprobadoText === "Aprobado"
    ? { text: "#14532d", bg: "#f0fdf4", border: "#86efac", accent: "#16a34a" }
    : aprobadoText === "No aprobado"
    ? { text: "#7f1d1d", bg: "#fef2f2", border: "#fca5a5", accent: "#dc2626" }
    : null;

  if (calColors && aprobadoText) {
    body += `
    <div class="cal-banner" style="background:${calColors.bg};border-color:${calColors.border};border-left:6px solid ${calColors.accent}">
      <div class="cal-label">RESULTADO BURÓ</div>
      <div class="cal-value" style="color:${calColors.text}">${esc(aprobadoText)}</div>
    </div>`;
  }

  body += fieldPair("Estatus", buro.estatus || null, "Score crediticio", buro.score || null);

  // PDF principal del buró
  if (typeof buro.pdfUrl === "string" && buro.pdfUrl.startsWith("http")) {
    body += `<div style="margin:12px 0">
      <a href="${esc(buro.pdfUrl)}" target="_blank" rel="noopener noreferrer" class="maps-link">Ver reporte de Buró de Crédito (PDF) ↗</a>
    </div>`;
  }

  // Archivos adicionales del buró
  const archAdic: string[] = Array.isArray(buro.archivosAdicionales)
    ? buro.archivosAdicionales.filter((u: unknown): u is string => typeof u === "string" && u.startsWith("http"))
    : [];

  if (archAdic.length > 0) {
    body += `<div class="subsection-title">Archivos adicionales (${archAdic.length})</div>`;
    // Imprimir como lista de imágenes si son imágenes, o como enlaces
    const imgExts = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i;
    const imgs = archAdic.filter((u) => imgExts.test(u));
    const links = archAdic.filter((u) => !imgExts.test(u));
    if (imgs.length > 0) body += renderEvidenceSpread(imgs, "Archivo buró");
    if (links.length > 0) {
      body += links
        .map(
          (url, idx) =>
            `<div style="margin:4px 0"><a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="maps-link">Archivo adicional ${idx + 1} ↗</a></div>`,
        )
        .join("");
    }
  }

  // Documentos del expediente clasificados como buró
  if (buroDocs.length > 0) {
    body += `<div class="subsection-title">Documentos adjuntos (${buroDocs.length})</div>`;
    body += renderDocumentLinksBlock(buroDocs);
  }

  return body;
}

/**
 * Renderiza visita domiciliaria con bloque hero editorial:
 * mapa grande clicable → link Google Maps → fachada principal.
 * @intervention IMPL-20260408-01 | ARCH-20260408-12
 */
function buildVisitaDomiciliaria(snapshot: Record<string, any>): string {
  const process = snapshot.process || {};
  const visitStatus = process.visitStatus || {};
  const vd: Record<string, any> = process.visitaDetalle || {};
  const ub: Record<string, any> = vd.ubicacion || {};
  const fotos: Record<string, any> = vd.fotos || {};

  let body = "";

  const fechaVisita = visitStatus.scheduledDateTime
    ? formatDateTime(visitStatus.scheduledDateTime)
    : "—";
  const direccion = visitStatus.direccion || ub.domicilio || null;

  body += `
  <div class="metrics-row">
    ${infoCard("Estatus visita", visitStatus.status || process.estatusProceso || "—", "#0d9488")}
    ${infoCard("Fecha programada", fechaVisita, "#0369a1")}
  </div>`;

  body += field("Dirección visitada", direccion);
  body += field("Observaciones logísticas", visitStatus.observaciones || null);

  // ── Bloque hero de ubicación: mapa grande + link Google Maps + fachada ─
  const mapaUrl = extractMapUrl(ub);
  const gps = ub.gps ?? null;
  const mapsUrl = buildMapsUrl(gps, direccion);
  const gpsText =
    gps?.lat != null && gps?.lon != null
      ? `${Number(gps.lat).toFixed(6)}, ${Number(gps.lon).toFixed(6)}`
      : null;

  // Fachada: preferentemente fachadaCalle, fallback fachadaPatio
  const fachadaUrl =
    typeof fotos.fachadaCalle === "string" && fotos.fachadaCalle.startsWith("http")
      ? fotos.fachadaCalle
      : typeof fotos.fachadaPatio === "string" && fotos.fachadaPatio.startsWith("http")
      ? fotos.fachadaPatio
      : null;
  const fachadaLabel =
    typeof fotos.fachadaCalle === "string" && fotos.fachadaCalle.startsWith("http")
      ? "Fachada principal (calle)"
      : "Fachada del domicilio";

  if (mapaUrl || mapsUrl || fachadaUrl) {
    body += '<div class="location-hero">';

    if (mapaUrl) {
      body += '<div class="hero-map-wrap">';
      if (mapsUrl) {
        body += `<a href="${esc(mapsUrl)}" target="_blank" rel="noopener noreferrer" class="hero-map-link">`;
      }
      body += `<img src="${esc(mapaUrl)}" alt="Mapa del domicilio visitado" class="hero-map-img" onerror="this.closest('.hero-map-wrap').style.display='none'" />`;
      if (mapsUrl) {
        body += `<div class="hero-map-overlay">Ver en Google Maps ↗</div>`;
        body += `</a>`;
      }
      body += '</div>';
    } else if (mapsUrl) {
      // Sin captura de mapa pero sí coordenadas: mostrar sólo link
      body += `<div class="hero-geo-line">`;
      if (gpsText) body += `<span class="hero-gps">${esc(gpsText)}</span> · `;
      body += `<a href="${esc(mapsUrl)}" target="_blank" rel="noopener noreferrer" class="maps-link">Ver domicilio en Google Maps ↗</a>`;
      body += `</div>`;
    }

    // Línea de apoyo con GPS y dirección
    if (mapaUrl && (gpsText || mapsUrl)) {
      body += `<div class="hero-geo-line">`;
      if (gpsText) body += `<span class="hero-gps">${esc(gpsText)}</span>`;
      if (gpsText && mapsUrl) body += ` · `;
      if (mapsUrl) body += `<a href="${esc(mapsUrl)}" target="_blank" rel="noopener noreferrer" class="maps-link">Abrir en Google Maps ↗</a>`;
      body += `</div>`;
    }

    if (fachadaUrl) {
      body += `<div class="hero-fachada-wrap">
        <img src="${esc(fachadaUrl)}" alt="${esc(fachadaLabel)}" class="hero-fachada-img" onerror="this.closest('.hero-fachada-wrap').style.display='none'" />
        <div class="hero-fachada-caption">${esc(fachadaLabel)}</div>
      </div>`;
    }

    body += '</div>';
  }

  return body;
}

/**
 * Renderiza de forma ejecutiva y legible el formulario completo capturado
 * por el encuestador en sitio. Muestra todas las subsecciones relevantes
 * con los datos recibidos, indicando "Sin registro" cuando aplique.
 * @intervention IMPL-20260323-20
 */
function buildCapturaVisita(snapshot: Record<string, any>): string {
  const process = snapshot.process || {};
  const vd: Record<string, any> = process.visitaDetalle || {};

  if (Object.keys(vd).filter((k) => !k.startsWith("_")).length === 0) {
    return '<p class="empty-note">Sin captura registrada. El encuestador aún no ha enviado el formulario o no se ha sincronizado.</p>';
  }

  let body = "";

  // ── Ubicación y domicilio ──────────────────────────────────────────────
  const ub: Record<string, any> = vd.ubicacion || {};
  if (Object.keys(ub).length > 0) {
    body += '<div class="subsection-title">Ubicación y domicilio</div>';
    body += field("Domicilio", ub.domicilio);
    body += fieldPair("C.P.", ub.cp, "Colonia / Municipio", ub.coloniaMunicipio);
    body += field("Estado", ub.estado);
    if (ub.gps?.lat) body += field("GPS (lat, lon)", `${ub.gps.lat.toFixed(6)}, ${ub.gps.lon.toFixed(6)}`);
  }

  // ── Información académica ───────────────────────────────────────────────
  const ac: Record<string, any> = vd.academica || {};
  if (Object.keys(ac).length > 0) {
    body += '<div class="subsection-title">Información académica</div>';
    // Normalización modern/legacy: gradoEstudios (moderno) || ultimoGrado (legado)
    body += fieldPair("Último grado", ac.gradoEstudios ?? ac.ultimoGrado, "Institución", ac.institucion);
    // Normalización modern/legacy: documento (moderno) || documentoObtenido (legado)
    body += fieldPair("Periodo", ac.periodo, "Documento obtenido", ac.documento ?? ac.documentoObtenido);
    if (ac.estudiaActualmente !== undefined) body += field("Estudia actualmente", ac.estudiaActualmente ? "Sí" : "No");
    if (ac.equiposMaquinas) body += field("Equipos/Maquinaria", ac.equiposMaquinas);
    if (ac.programas) body += field("Programas", ac.programas);
    if (ac.otrosConocimientos) body += field("Otros conocimientos", ac.otrosConocimientos);
  }

  // ── Cotejo de documentos ───────────────────────────────────────────────
  // Muestra resumen compacto de estado y las fotos reales capturadas por el encuestador.
  // @intervention IMPL-20260408-03 | ARCH-20260408-14
  const docs: Record<string, any> = vd.documentos || {};
  if (Object.keys(docs).length > 0) {
    body += '<div class="subsection-title">Cotejo de documentos</div>';

    // Definición de tipos de documentos y sus campos de foto
    const docDefs: Array<{ key: string; label: string; photoFields: string[] }> = [
      { key: "actaNacimiento",      label: "Acta de nacimiento",       photoFields: ["foto"] },
      { key: "credencialElector",   label: "Credencial de elector",    photoFields: ["fotoFrente", "fotoReverso"] },
      { key: "comprobanteDomicilio",label: "Comprobante de domicilio", photoFields: ["foto"] },
      { key: "cartillaMilitar",     label: "Cartilla militar",         photoFields: ["foto"] },
      { key: "pasaporte",           label: "Pasaporte",                photoFields: ["fotoFrente", "fotoReverso", "foto"] },
      { key: "cartasRecomendacion", label: "Cartas de recomendación",  photoFields: ["foto"] },
      { key: "licenciaConducir",    label: "Licencia de conducir",     photoFields: ["fotoFrente", "fotoReverso"] },
      { key: "certificadoTitulo",   label: "Certificado / Título",     photoFields: ["foto"] },
      { key: "afore",               label: "AFORE",                    photoFields: ["foto"] },
      { key: "creditoInfonavit",    label: "Crédito Infonavit",        photoFields: ["foto"] },
    ];

    // Resumen compacto de estado (presentó / no presentó)
    const docStatuses = docDefs
      .filter((d) => docs[d.key] && docs[d.key].tiene !== undefined)
      .map((d) => ({ label: d.label, tiene: docs[d.key].tiene as boolean }));

    if (docStatuses.length > 0) {
      const presented = docStatuses.filter((d) => d.tiene).map((d) => d.label);
      const notPresented = docStatuses.filter((d) => !d.tiene).map((d) => d.label);
      if (presented.length > 0) {
        body += `<div class="field-row"><span class="field-label">✓ Presentó</span><span class="field-value" style="color:#16a34a;font-weight:600">${esc(presented.join(", "))}</span></div>`;
      }
      if (notPresented.length > 0) {
        body += `<div class="field-row"><span class="field-label">✗ No presentó</span><span class="field-value" style="color:#dc2626;font-weight:600">${esc(notPresented.join(", "))}</span></div>`;
      }
    }

    // Galería de fotos de documentos
    const docPhotos: Array<{ label: string; url: string }> = [];
    for (const def of docDefs) {
      const docData = docs[def.key];
      if (!docData) continue;
      for (const field_ of def.photoFields) {
        const url = docData[field_];
        if (typeof url === "string" && url.startsWith("http")) {
          const suffix = field_.replace("foto", "").replace("Frente", " — frente").replace("Reverso", " — reverso");
          docPhotos.push({ label: `${def.label}${suffix}`, url });
        }
      }
    }

    if (docPhotos.length > 0) {
      body += `<div class="subsection-title" style="margin-top:12px;font-size:12px">Imágenes de documentos (${docPhotos.length})</div>`;
      body += '<div class="doc-photos-grid">';
      for (const { label, url } of docPhotos) {
        body += `<div class="doc-photo-item">
          <img src="${esc(url)}" alt="${esc(label)}" class="doc-photo-img"
            onerror="this.closest('.doc-photo-item').style.display='none'" />
          <div class="doc-photo-caption">${esc(label)}</div>
        </div>`;
      }
      body += "</div>";
    }
  }

  // ── Familiares ─────────────────────────────────────────────────────────
  const fams: any[] = Array.isArray(vd.familiares) ? vd.familiares : [];
  // Normalización modern/legacy: otrasPersonas (moderno) || otrasPersonasDomicilio (legado)
  const otrasPersonas: any[] = Array.isArray(vd.otrasPersonas)
    ? vd.otrasPersonas
    : (Array.isArray(vd.otrasPersonasDomicilio) ? vd.otrasPersonasDomicilio : []);
  if (fams.length > 0 || otrasPersonas.length > 0) {
    body += '<div class="subsection-title">Familiares y personas en el domicilio</div>';
    if (fams.length > 0) {
      body += `<table class="data-table"><thead><tr><th>Parentesco</th><th>Nombre</th><th>Edad</th><th>Escolaridad</th><th>Ocupación</th></tr></thead><tbody>`;
      for (const f of fams) {
        body += `<tr><td>${esc(f.parentesco || "—")}</td><td>${esc(f.nombre || "—")}</td><td>${esc(f.edad || "—")}</td><td>${esc(f.escolaridad || "—")}</td><td>${esc(f.ocupacion || "—")}</td></tr>`;
      }
      body += "</tbody></table>";
    }
    if (otrasPersonas.length > 0) {
      body += '<div class="field-row" style="margin-top:8px"><span class="field-label">Otras personas en domicilio</span><span class="field-value">' + esc(String(otrasPersonas.length)) + " persona(s)" + "</span></div>";
    }
  }

  // ── §5 Dinámica familiar ───────────────────────────────────────────────
  const din: Record<string, any> = vd.dinamicaFamiliar || {};
  if (Object.keys(din).length > 0) {
    body += '<div class="subsection-title">Dinámica familiar</div>';
    if (din.vivenSolos) body += field("¿Viven solos?", din.vivenSolos);
    if (din.quienCuidaHijos) body += field("¿Quién cuida a los hijos?", din.quienCuidaHijos);
    if (din.dondeViveQuienCuida) body += field("¿Dónde vive quien cuida?", din.dondeViveQuienCuida);
    if (din.edadHijos) body += field("Edades de hijos", din.edadHijos);
    if (din.parejaDacuerdo) body += field("Pareja de acuerdo con el trabajo", din.parejaDacuerdo);
    if (din.esposaEmbarazada) body += field("Esposa embarazada", din.esposaEmbarazada);
    if (din.tieneDeudas !== undefined) body += field("Tiene deudas", din.tieneDeudas ? `Sí${din.institucionDeuda ? ` — ${din.institucionDeuda}` : ""}` : "No");
    if (din.pensionAlimenticia !== undefined) body += field("Pensión alimenticia", din.pensionAlimenticia ? "Sí" : "No");
    if (din.trabajoEstadosUnidos !== undefined) body += field("Trabajó en EE.UU.", din.trabajoEstadosUnidos ? "Sí" : "No");
  }

  // ── Inmueble / Vivienda ────────────────────────────────────────────────
  const inm: Record<string, any> = vd.inmueble || {};
  if (Object.keys(inm).length > 0) {
    body += '<div class="subsection-title">Características del inmueble</div>';
    body += fieldPair("Tipo de inmueble", inm.tipoInmueble, "Estado de la vivienda", inm.estadoVivienda);
    body += fieldPair("Orden y limpieza", inm.ordenLimpieza, "Zona", inm.zona);
    body += fieldPair("Superficie", inm.superficie, "Fachada", inm.fachada);
    body += fieldPair("Recámaras", inm.numeroRecamaras ? String(inm.numeroRecamaras) : null, "Baños", inm.numeroBanos ? String(inm.numeroBanos) : null);
    body += fieldPair("Pisos", inm.pisos, "Niveles", inm.niveles ? String(inm.niveles) : null);
    body += fieldPair("Paredes", inm.paredes, "Predial", inm.predial);
    body += fieldPair("Medio de transporte", inm.medioTransporte, "Tiempo de traslado", inm.tiempoTraslado);
    body += fieldPair("Valor aproximado", inm.valorAprox ? `$${Number(inm.valorAprox).toLocaleString("es-MX")}` : null, "Tiempo residencia actual", inm.tiempoResidenciaActual);
    if (Array.isArray(inm.serviciosPublicos) && inm.serviciosPublicos.length > 0) {
      body += field("Servicios públicos", inm.serviciosPublicos.join(", "));
    }
    const cuartos = [
      inm.tieneSala && "Sala",
      inm.tieneComedor && "Comedor",
      inm.tieneCocina && "Cocina",
      inm.tieneJardin && "Jardín",
      inm.tienePatio && "Patio",
      inm.tieneCochera && "Cochera",
    ].filter(Boolean);
    if (cuartos.length > 0) body += field("Espacios", cuartos.join(", "));
    if (inm.estadoMuebles) body += field("Estado de muebles", inm.estadoMuebles);
    if (inm.precioPasaje) body += field("Precio de pasaje", `$${inm.precioPasaje}`);
  }

  // ── §10 Dinámica de vivienda ───────────────────────────────────────────
  // Normalización modern/legacy: vivienda (moderno) || dinamicaVivienda (legado)
  const dv: Record<string, any> = vd.vivienda || vd.dinamicaVivienda || {};
  if (Object.keys(dv).length > 0) {
    body += '<div class="subsection-title">Dinámica de vivienda</div>';
    if (dv.personasDiscapacidad !== undefined) {
      body += field("Personas con discapacidad", dv.personasDiscapacidad ? `Sí — ${dv.discapacidadQuien || ""}${dv.discapacidadTipo ? ` (${dv.discapacidadTipo})` : ""}` : "No");
    }
    if (dv.numeroDependientes) body += field("N° dependientes económicos", String(dv.numeroDependientes));
    if (dv.dependientesDetalle) body += field("Detalle dependientes", dv.dependientesDetalle);
    if (dv.matrimoniosAnteriores !== undefined) body += field("Matrimonios anteriores", dv.matrimoniosAnteriores ? "Sí" : "No");
    if (dv.hijosMatrimoniosAnteriores !== undefined) body += field("Hijos de relaciones anteriores", dv.hijosMatrimoniosAnteriores ? `Sí (${dv.hijosMatrimoniosCuantos || "?"})` : "No");
    if (dv.pensionAlimenticia !== undefined) body += field("Pensión alimenticia", dv.pensionAlimenticia ? `Sí ($${dv.pensionMonto || "?"} mensuales)` : "No");
    if (dv.quienCuidaHijos) body += field("¿Quién cuida hijos?", dv.quienCuidaHijos);
    if (dv.quienCuidaDonde) body += field("¿Dónde vive quien cuida?", dv.quienCuidaDonde);
    if (dv.parejaDeAcuerdo !== undefined) body += field("Pareja de acuerdo", dv.parejaDeAcuerdo ? "Sí" : "No");
    if (dv.esposaEmbarazada !== undefined) body += field("Esposa embarazada", dv.esposaEmbarazada ? "Sí" : "No");
    if (dv.rutasForaneas !== undefined) body += field("Disponible para rutas foráneas", dv.rutasForaneas ? "Sí" : "No");
    if (dv.inconvenienteAusencia !== undefined) body += field("Inconveniente por ausencia", dv.inconvenienteAusencia ? "Sí" : "No");
    if (dv.comprendActividades) body += field("Comprende las actividades del puesto", dv.comprendActividades);
  }

  // ── Patrimonio e ingresos ──────────────────────────────────────────────
  // Normalización modern/legacy: ingresos (moderno) || ingresosArray (legado)
  const ingresos: any[] = Array.isArray(vd.ingresos)
    ? vd.ingresos
    : (Array.isArray(vd.ingresosArray) ? vd.ingresosArray : []);
  const egresos: Record<string, any> = vd.egresos || {};
  if (ingresos.length > 0 || Object.keys(egresos).length > 0) {
    body += '<div class="subsection-title">Referencias económicas (ingresos y egresos)</div>';
    if (ingresos.length > 0) {
      let totalIng = 0;
      body += `<table class="data-table"><thead><tr><th>Nombre</th><th>Parentesco</th><th>Ingreso</th><th>Aportación</th></tr></thead><tbody>`;
      for (const ing of ingresos) {
        // Normalización modern/legacy: sueldo/otrosIngresos (moderno) || ingreso/aportacionTotal (legado)
        const sueldoAmt = ing.sueldo ?? ing.ingreso;
        const otrosAmt = ing.otrosIngresos ?? ing.aportacionTotal;
        const monto = sueldoAmt ? formatCurrency(sueldoAmt) : "—";
        const aporte = otrosAmt ? formatCurrency(otrosAmt) : "—";
        totalIng += Number(otrosAmt ?? sueldoAmt ?? 0);
        body += `<tr><td>${esc(ing.nombre || "—")}</td><td>${esc(ing.parentesco || "—")}</td><td>${esc(monto)}</td><td>${esc(aporte)}</td></tr>`;
      }
      body += "</tbody></table>";
      if (totalIng > 0) body += field("Total ingresos familiares", formatCurrency(totalIng));
    }
    if (Object.keys(egresos).length > 0) {
      const egMap: Array<[string, number | undefined]> = [
        ["Alimentación / Despensa", egresos.alimentacionDespensa],
        ["Vestido / Calzado", egresos.vestidoCalzado],
        ["Colegiaturas", egresos.colegiaturas],
        ["Tarjetas de crédito", egresos.tarjetasCredito],
        ["Transportación", egresos.transportacion],
        ["Renta / Hipoteca / Infonavit", egresos.rentaHipotecaInfonavit],
        ["Gastos médicos", egresos.gastosMedicos],
        ["Recreaciones", egresos.recreaciones],
        ["Otros gastos", egresos.otrosGastos],
      ];
      if (egresos.servicios && typeof egresos.servicios === "object") {
        const totalServicios = Object.values(egresos.servicios as Record<string, unknown>).reduce<number>((a, v) => a + (Number(v) || 0), 0);
        if (totalServicios > 0) egMap.unshift(["Servicios (agua/luz/gas/tel)", totalServicios]);
      }
      let totalEg = 0;
      const egRows = egMap.filter(([, v]) => v).map(([label, val]) => {
        totalEg += Number(val);
        return `<tr><td>${esc(label)}</td><td>${esc(formatCurrency(Number(val)))}</td></tr>`;
      });
      if (egRows.length > 0) {
        body += `<table class="data-table" style="margin-top:8px"><thead><tr><th>Concepto egreso</th><th>Monto mensual</th></tr></thead><tbody>${egRows.join("")}</tbody></table>`;
        body += field("Total egresos familiares", formatCurrency(totalEg));
      }
    }
  }

  // ── §13 Créditos, propiedades y patrimonio ─────────────────────────────
  const creds: any[] = Array.isArray(vd.creditos) ? vd.creditos : [];
  const bienes: any[] = Array.isArray(vd.bienesRaices) ? vd.bienesRaices : [];
  const vehs: any[] = Array.isArray(vd.vehiculos) ? vd.vehiculos : [];
  const negs: any[] = Array.isArray(vd.negocios) ? vd.negocios : [];
  if (creds.length > 0 || bienes.length > 0 || vehs.length > 0 || negs.length > 0) {
    body += '<div class="subsection-title">Créditos, propiedades y patrimonio</div>';
    if (creds.length > 0) {
      body += `<table class="data-table"><thead><tr><th>Institución</th><th>Monto</th><th>Mensualidad</th><th>Adeudo</th></tr></thead><tbody>`;
      for (const c of creds) {
        body += `<tr><td>${esc(c.institucion || "—")}</td><td>${esc(c.montoCredito ? `$${c.montoCredito}` : "—")}</td><td>${esc(c.mensualidad ? `$${c.mensualidad}` : "—")}</td><td>${esc(c.adeudo ? `$${c.adeudo}` : "—")}</td></tr>`;
      }
      body += "</tbody></table>";
    }
    if (bienes.length > 0) {
      body += '<div class="field-row"><span class="field-label">Bienes raíces</span><span class="field-value">';
      body += bienes.map((b) => `${esc(b.tipoPropiedad || "—")} — ${esc(b.ubicacion || "")} — A nombre de: ${esc(b.aNombreDe || "")}`).join("; ");
      body += "</span></div>";
    }
    if (vehs.length > 0) {
      body += '<div class="field-row"><span class="field-label">Vehículos</span><span class="field-value">';
      body += vehs.map((v) => `${esc(v.marcaModelo || "—")} — A nombre de: ${esc(v.aNombreDe || "")}`).join("; ");
      body += "</span></div>";
    }
    if (negs.length > 0) {
      body += '<div class="field-row"><span class="field-label">Negocios</span><span class="field-value">';
      body += negs.map((n) => `${esc(n.tipoNegocio || "—")} — ${esc(n.ubicacion || "")}`).join("; ");
      body += "</span></div>";
    }
  }

  // ── Salud y hábitos ────────────────────────────────────────────────────
  const salud: Record<string, any> = vd.salud || {};
  if (Object.keys(salud).length > 0) {
    body += '<div class="subsection-title">Salud y hábitos</div>';
    body += fieldPair("Estado de salud", salud.estadoSalud, "Servicio médico", salud.servicioMedico);
    if (salud.fuma !== undefined) body += field("Fuma", salud.fuma ? `Sí (${salud.cigarrosDiarios || "?"} cigarros/día)` : "No");
    if (salud.toma !== undefined) body += field("Consume alcohol", salud.toma ? `Sí — ${salud.tomaTipoBebida || ""} (${salud.tomaCadaCuando || ""})` : "No");
    if (salud.drogas !== undefined) body += field("Consumo de drogas", salud.drogas ? `Sí: ${salud.drogasCuales || ""}` : "No");
  }

  // ── §8 Información social y pasatiempos ───────────────────────────────
  const social: Record<string, any> = vd.social || {};
  if (Object.keys(social).length > 0) {
    body += '<div class="subsection-title">Información social y pasatiempos</div>';
    if (social.pasatiempos) body += field("Pasatiempos", social.pasatiempos);
    if (social.deporte !== undefined) body += field("Deporte", social.deporte ? `Sí — ${social.deporteCual || ""}${social.deporteFrecuencia ? ` (${social.deporteFrecuencia})` : ""}` : "No");
    if (social.actividadFamiliar !== undefined) body += field("Actividad familiar", social.actividadFamiliar ? `Sí — ${social.actividadFamiliarCual || ""}${social.actividadFamiliarFrecuencia ? ` (${social.actividadFamiliarFrecuencia})` : ""}` : "No");
    if (social.discotecas !== undefined) body += field("Antros / Discotecas", social.discotecas ? `Sí — ${social.discotecasCual || ""}${social.discotecasFrecuencia ? ` (${social.discotecasFrecuencia})` : ""}` : "No");
    if (social.eventosReligiosos !== undefined) body += field("Eventos religiosos", social.eventosReligiosos ? `Sí (${social.eventosReligiososFrecuencia || ""})` : "No");
    if (social.grupoDeportivo !== undefined) body += field("Grupo deportivo", social.grupoDeportivo ? `Sí — ${social.grupoDeportivoCual || ""}` : "No");
    if (social.partidoPolitico !== undefined) body += field("Partido político", social.partidoPolitico ? `Sí — ${social.partidoPoliticoCual || ""}` : "No");
    if (social.tatuajesPiercings !== undefined) body += field("Tatuajes / Piercings", social.tatuajesPiercings ? "Sí" : "No");
  }

  // ── §9 Área jurídica ──────────────────────────────────────────────────
  const jur: Record<string, any> = vd.juridica || {};
  if (Object.keys(jur).length > 0) {
    body += '<div class="subsection-title">Área jurídica (declaración del candidato)</div>';
    if (jur.procesoLegal !== undefined) body += field("Proceso legal", jur.procesoLegal ? `Sí — ${jur.procesoLegalPorQue || ""}${jur.procesoLegalQuien ? ` | ¿Quién?: ${jur.procesoLegalQuien}` : ""}` : "No");
    if (jur.privadoLibertad !== undefined) body += field("Privado de libertad", jur.privadoLibertad ? `Sí — ${jur.privadoLibertadPorQue || ""}${jur.privadoLibertadQuien ? ` | ¿Quién?: ${jur.privadoLibertadQuien}` : ""}` : "No");
    if (jur.problemasLaborales !== undefined) body += field("Problemas laborales", jur.problemasLaborales ? `Sí — ${jur.problemasLaboralesPorQue || ""}` : "No");
    if (jur.partidoPolitico !== undefined) body += field("Afiliación política", jur.partidoPolitico ? `Sí — ${jur.partidoPoliticoCual || ""}` : "No");
    if (jur.sindicato !== undefined) body += field("Sindicato", jur.sindicato ? `Sí — ${jur.sindicatoCual || ""}` : "No");
    if (jur.puestosPoliticos !== undefined) body += field("Puestos políticos o sindicales", jur.puestosPoliticos ? `Sí — ${jur.puestosPoliticosCual || ""}` : "No");
  }

  // ── §16 Otros datos ────────────────────────────────────────────────────
  const otros: Record<string, any> = vd.otrosDatos || {};
  if (Object.keys(otros).length > 0) {
    body += '<div class="subsection-title">Otros datos</div>';
    if (otros.trabajoEnGrupo !== undefined) {
      body += field("Trabajó en empresa del grupo", otros.trabajoEnGrupo ? `Sí — ${otros.trabajoEnGrupoCual || ""}${otros.trabajoEnGrupoPeriodo ? ` | Periodo: ${otros.trabajoEnGrupoPeriodo}` : ""}${otros.trabajoEnGrupoMotivoSalida ? ` | Motivo salida: ${otros.trabajoEnGrupoMotivoSalida}` : ""}` : "No");
    }
    if (otros.familiaresEnGrupo !== undefined) {
      body += field("Familiares en la empresa", otros.familiaresEnGrupo ? `Sí — ${otros.familiarNombre || ""}${otros.familiarPuestoDepto ? ` — ${otros.familiarPuestoDepto}` : ""}` : "No");
    }
  }

  // ── Referencias personales ─────────────────────────────────────────────
  const refPer: any[] = Array.isArray(vd.referenciasPersonales) ? vd.referenciasPersonales
    : (Array.isArray(vd.refPersonales) ? vd.refPersonales : []);
  if (refPer.length > 0) {
    body += `<div class="subsection-title">Referencias personales (${refPer.length})</div>`;
    body += `<table class="data-table"><thead><tr><th>Nombre</th><th>Teléfono</th><th>Ocupación</th><th>Tiempo de conocerlo</th></tr></thead><tbody>`;
    for (const rp of refPer) {
      body += `<tr><td>${esc(rp.nombre || "—")}</td><td>${esc(rp.telefono || "—")}</td><td>${esc(rp.ocupacion || "—")}</td><td>${esc(rp.tiempoDeConocerlo || "—")}</td></tr>`;
    }
    body += "</tbody></table>";
  }

  // ── Referencias vecinales ──────────────────────────────────────────────
  const refVec: any[] = Array.isArray(vd.referenciasVecinales) ? vd.referenciasVecinales
    : (Array.isArray(vd.refVecinales) ? vd.refVecinales : []);
  if (refVec.length > 0) {
    body += `<div class="subsection-title">Referencias vecinales (${refVec.length})</div>`;
    body += `<table class="data-table"><thead><tr><th>Nombre</th><th>Teléfono</th><th>Ocupación</th><th>Tiempo de conocerlo</th></tr></thead><tbody>`;
    for (const rv of refVec) {
      body += `<tr><td>${esc(rv.nombre || "—")}</td><td>${esc(rv.telefono || "—")}</td><td>${esc(rv.ocupacion || "—")}</td><td>${esc(rv.tiempoDeConocerlo || "—")}</td></tr>`;
    }
    body += "</tbody></table>";
  }

  // ── Conclusión del encuestador ─────────────────────────────────────────
  const conclusion = (vd.conclusion as string) || null;
  const comentarios = (vd.comentarios as string) || null;
  const cierreObs = (vd.cierre as Record<string, any>)?.observaciones || null;
  if (conclusion || comentarios || cierreObs) {
    body += '<div class="subsection-title">Conclusión del encuestador</div>';
    const texto = cierreObs || conclusion || comentarios || "";
    body += `<div class="narrative-block">${esc(texto)}</div>`;
  }

  // ── Evidencias gráficas (spreads editoriales) ─────────────────────────
  // Nota: fachadaCalle y fachadaPatio se muestran en el hero de visita_domiciliaria.
  // Aquí solo se incluyen las fotos complementarias del interior y evidencias graficas.
  const fotos: Record<string, string> = vd.fotos || {};
  const fotoEntries: Array<[string, string]> = [
    ["Comedor", fotos.comedor],
    ["Cocina", fotos.cocina],
    ["Sala", fotos.sala],
  ].filter((e): e is [string, string] => typeof e[1] === "string" && e[1].startsWith("http"));

  const evidGraf: string[] = Array.isArray(vd.evidenciasGraficas)
    ? vd.evidenciasGraficas.filter((u: unknown) => typeof u === "string" && (u as string).startsWith("http"))
    : [];
  const grafEntries: Array<[string, string]> = evidGraf.map((url, idx) => [`Evidencia ${idx + 1}`, url]);
  const allImgs = [...fotoEntries, ...grafEntries];

  if (allImgs.length > 0) {
    body += `<div class="subsection-title">Evidencias gráficas del encuestador (${allImgs.length} imagen${allImgs.length !== 1 ? "es" : ""})</div>`;
    // Spreads editoriales de media página — cada imagen ocupa el ancho completo
    // @intervention IMPL-20260408-02 | ARCH-20260408-13
    for (const [label, url] of allImgs) {
      body += `<div class="evidence-spread">
        <img src="${esc(url)}" alt="${esc(label)}" class="evidence-spread-img"
          onerror="this.closest('.evidence-spread').style.display='none'" />
        <div class="evidence-caption">${esc(label)}</div>
      </div>`;
    }
  } else {
    body += field("Evidencias gráficas", "Sin imágenes complementarias adjuntas");
  }

  if (!body.trim()) {
    body = '<p class="empty-note">Sin información detallada capturada por el encuestador.</p>';
  }

  return body;
}

/**
 * Bloque final de documentos adicionales (no clasificados en ninguna sección temática).
 * Se agrega al final del reporte incluso si el usuario no seleccionó esta sección.
 * @intervention IMPL-20260408-02 | ARCH-20260408-13
 */
function buildDocumentosAdicionales(snapshot: Record<string, any>): string {
  const allDocs: any[] = Array.isArray(snapshot.documents) ? snapshot.documents : [];
  const adicionales = allDocs.filter((d) => classifyDoc(d.tipoDocumento) === "adicional");

  if (adicionales.length === 0) return "";

  let body = `
  <div class="info-banner">
    Los siguientes ${adicionales.length} documento(s) no corresponden a ninguna sección temática específica del estudio y se listan aquí como referencia del expediente.
  </div>`;
  body += renderDocumentLinksBlock(adicionales);
  return body;
}

function buildObservacionesConclusion(snapshot: Record<string, any>): string {
  const process = snapshot.process || {};
  const cal = process.calificacionFinal || null;
  const inv = process.investigacionLaboral || {};
  const iaDictamen = inv.iaDictamenCliente || {};

  let body = "";

  if (iaDictamen.resumenEjecutivoCliente) {
    body += '<div class="subsection-title">Resumen ejecutivo</div>';
    body += `<div class="narrative-block">${esc(iaDictamen.resumenEjecutivoCliente)}</div>`;
  }

  const recomendaciones: string[] = Array.isArray(iaDictamen.recomendacionesCliente)
    ? iaDictamen.recomendacionesCliente
    : [];
  if (recomendaciones.length > 0) {
    body += '<div class="subsection-title">Recomendaciones</div>';
    body += '<ul class="recommendation-list">';
    for (const rec of recomendaciones) {
      body += `<li>${esc(rec)}</li>`;
    }
    body += "</ul>";
  }

  if (!body.trim()) {
    if (cal === "pendiente" || !cal) {
      body = '<p class="empty-note">Calificación final pendiente de asignar.</p>';
    } else {
      body = '<p class="empty-note">Sin observaciones adicionales para esta versión.</p>';
    }
  }

  return body;
}

// ── CSS del documento ─────────────────────────────────────────────────────────

/**
 * @intervention ARCH-20260408-01
 * @respaldo context/SPECs/SPEC-pdf-dinamico-estudio-cliente.md
 */
const DOCUMENT_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  html { font-size: 14px; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    color: #111827;
    background: #f1f5f9;
    margin: 0;
    padding: 0;
    line-height: 1.6;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Layout del documento */
  .page-wrapper {
    max-width: 900px;
    margin: 0 auto;
    background: #fff;
    box-shadow: 0 0 40px rgba(0,0,0,0.08);
  }

  /* Portada */
  .cover {
    background: linear-gradient(135deg, #1e3a5f 0%, #0c2442 100%);
    padding: 48px 56px 40px;
    color: #fff;
    position: relative;
    overflow: hidden;
  }
  .cover::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 6px;
    background: linear-gradient(90deg, #d0a832, #f0c84a, #d0a832);
  }
  .cover-logo {
    position: absolute;
    top: 32px;
    right: 48px;
    max-height: 52px;
    max-width: 160px;
    object-fit: contain;
    filter: brightness(1.1);
  }
  .cover-badge {
    display: inline-block;
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.25);
    border-radius: 4px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 2px;
    padding: 3px 10px;
    margin-bottom: 16px;
    text-transform: uppercase;
    color: #d0a832;
  }
  .cover-title {
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.5px;
    margin: 0 0 8px;
    line-height: 1.2;
  }
  .cover-subtitle {
    font-size: 14px;
    color: rgba(255,255,255,0.7);
    margin: 0 0 32px;
  }
  .cover-client {
    font-size: 16px;
    font-weight: 600;
    color: #a8d4f5;
    margin-bottom: 4px;
  }
  .cover-candidate {
    font-size: 22px;
    font-weight: 800;
    margin-bottom: 4px;
  }
  .cover-post {
    font-size: 14px;
    color: rgba(255,255,255,0.65);
  }
  .cover-meta {
    margin-top: 40px;
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
  }
  .cover-meta-item {
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 8px;
    padding: 12px 18px;
    flex: 1;
    min-width: 160px;
  }
  .cover-meta-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: rgba(255,255,255,0.5);
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .cover-meta-value {
    font-size: 14px;
    font-weight: 600;
    color: #fff;
  }

  /* Calificación banner en portada */
  .cover-cal {
    margin-top: 28px;
    padding: 16px 20px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.2);
    display: flex;
    align-items: center;
    gap: 20px;
    background: rgba(255,255,255,0.06);
  }
  .cover-cal-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: rgba(255,255,255,0.5);
    text-transform: uppercase;
  }
  .cover-cal-value {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.3px;
  }
  .cover-cal-comment {
    font-size: 12px;
    color: rgba(255,255,255,0.65);
    margin-top: 3px;
  }

  /* Cuerpo del documento */
  .doc-body {
    padding: 40px 56px 56px;
  }

  /* Índice */
  .toc {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 24px 28px;
    margin-bottom: 40px;
  }
  .toc-title {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #475569;
    margin: 0 0 16px;
    padding-bottom: 10px;
    border-bottom: 1px solid #e2e8f0;
  }
  .toc-list { list-style: none; margin: 0; padding: 0; }
  .toc-item {
    display: flex;
    align-items: center;
    padding: 6px 0;
    border-bottom: 1px solid #f1f5f9;
  }
  .toc-item:last-child { border-bottom: none; }
  .toc-num {
    font-size: 11px;
    font-weight: 700;
    color: #1e3a5f;
    width: 28px;
    flex-shrink: 0;
  }
  .toc-item a {
    color: #334155;
    text-decoration: none;
    font-size: 13px;
    font-weight: 500;
    flex: 1;
  }
  .toc-item a:hover { color: #1e3a5f; text-decoration: underline; }
  .toc-dot {
    flex: 1;
    border-bottom: 1px dotted #cbd5e1;
    margin: 0 8px;
    height: 1px;
    align-self: flex-end;
    margin-bottom: 8px;
  }
  .toc-always {
    font-size: 11px;
    color: #64748b;
    font-style: italic;
    padding: 4px 0;
  }

  /* Resumen ejecutivo */
  .exec-summary {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-left: 5px solid #2563eb;
    border-radius: 8px;
    padding: 20px 24px;
    margin-bottom: 40px;
  }
  .exec-summary-title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #1d4ed8;
    margin-bottom: 12px;
  }
  .exec-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 6px;
    font-size: 13px;
  }
  .exec-key { font-weight: 600; color: #1e40af; min-width: 120px; }
  .exec-val { color: #1e3a5f; }

  /* Secciones */
  .doc-section {
    margin-bottom: 36px;
    break-inside: auto;
    page-break-inside: auto;
  }
  .section-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
  }
  .section-num {
    background: #1e3a5f;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 4px;
    letter-spacing: 1px;
    text-transform: uppercase;
    flex-shrink: 0;
  }
  .section-title {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: #1e3a5f;
    border-bottom: 2px solid #d0a832;
    padding-bottom: 4px;
    flex: 1;
  }
  .section-body {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 16px 20px;
    font-size: 13px;
  }

  /* Campos */
  .field-row {
    display: flex;
    gap: 8px;
    padding: 5px 0;
    border-bottom: 1px solid #f3f4f6;
  }
  .field-row:last-child { border-bottom: none; }
  .field-label {
    font-weight: 600;
    color: #374151;
    min-width: 180px;
    flex-shrink: 0;
    font-size: 12px;
  }
  .field-value { color: #111827; font-size: 13px; word-break: break-word; }
  .field-pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0 24px;
  }

  /* Metric cards */
  .metrics-row {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }
  .metric-card {
    flex: 1;
    min-width: 140px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 16px;
    border-top-width: 4px;
  }
  .metric-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: #64748b;
    margin-bottom: 4px;
  }
  .metric-value {
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.3;
  }

  /* Calificación banner */
  .cal-banner {
    border: 1px solid;
    border-radius: 8px;
    padding: 14px 18px;
    margin-bottom: 16px;
    border-left-width: 6px;
  }
  .cal-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #64748b;
    margin-bottom: 4px;
  }
  .cal-value { font-size: 18px; font-weight: 800; }
  .cal-comment { font-size: 12px; margin-top: 5px; color: #374151; }

  /* Alertas */
  .alert-banner {
    background: #fef2f2;
    border: 1px solid #fca5a5;
    border-left: 5px solid #dc2626;
    border-radius: 6px;
    padding: 10px 14px;
    font-size: 13px;
    font-weight: 600;
    color: #7f1d1d;
    margin-bottom: 12px;
  }
  .info-banner {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-left: 4px solid #2563eb;
    border-radius: 6px;
    padding: 10px 14px;
    font-size: 12px;
    color: #1e40af;
    margin-bottom: 12px;
  }

  /* Tabla de datos */
  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  .data-table th {
    background: #1e3a5f;
    color: #fff;
    text-align: left;
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.5px;
  }
  .data-table td {
    padding: 8px 12px;
    border-bottom: 1px solid #f1f5f9;
    color: #374151;
  }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:nth-child(even) td { background: #fafafa; }

  /* Historial laboral */
  .work-history-list { display: flex; flex-direction: column; gap: 10px; }
  .work-item {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px 14px;
  }
  .work-item-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    flex-wrap: wrap;
  }
  .work-puesto { font-size: 12px; color: #64748b; }
  /* Causal de baja: dato prioritario, encima del periodo */
  .work-causal {
    font-size: 13px;
    font-weight: 700;
    color: #1e3a5f;
    background: #eff6ff;
    border-left: 3px solid #3b82f6;
    padding: 4px 10px;
    border-radius: 0 4px 4px 0;
    margin-bottom: 4px;
  }
  .work-causal-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: #3b82f6;
    margin-right: 6px;
  }
  .work-periodo { font-size: 11px; color: #94a3b8; margin-bottom: 4px; }
  .work-comment { font-size: 12px; color: #475569; margin-top: 4px; }

  /* Subtítulos internos */
  .subsection-title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #64748b;
    margin: 14px 0 8px;
    padding-top: 10px;
    border-top: 1px solid #f1f5f9;
  }

  /* Textos narrativos */
  .narrative-block {
    background: #f8fafc;
    border-left: 3px solid #d0a832;
    padding: 10px 14px;
    font-size: 13px;
    color: #374151;
    border-radius: 0 6px 6px 0;
    white-space: pre-wrap;
    line-height: 1.7;
  }

  /* Recomendaciones */
  .recommendation-list {
    margin: 0;
    padding-left: 20px;
  }
  .recommendation-list li {
    padding: 4px 0;
    font-size: 13px;
    color: #374151;
  }

  /* Vacío */
  .empty-note {
    color: #9ca3af;
    font-size: 12px;
    font-style: italic;
    margin: 0;
  }

  /* Footer */
  .doc-footer {
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    padding: 20px 56px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: #94a3b8;
  }
  .footer-brand { font-weight: 700; color: #475569; }
  .footer-confidential { color: #dc2626; font-weight: 600; font-size: 10px; letter-spacing: 1px; }

  /* ── Hero bloque de ubicación ──────────────────────────────────────────── */
  .location-hero { margin: 16px 0; }

  .hero-map-wrap {
    position: relative;
    display: block;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e2e8f0;
    margin-bottom: 6px;
    text-decoration: none;
  }
  .hero-map-link { display: block; text-decoration: none; color: inherit; }
  .hero-map-img {
    width: 100%;
    max-height: 520px;
    min-height: 180px;
    object-fit: cover;
    display: block;
  }
  .hero-map-overlay {
    position: absolute;
    bottom: 10px;
    right: 10px;
    background: rgba(30,58,95,0.85);
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    padding: 5px 12px;
    border-radius: 4px;
    letter-spacing: 0.5px;
  }
  .hero-geo-line {
    font-size: 12px;
    color: #475569;
    margin: 4px 0 10px;
    padding: 6px 10px;
    background: #f8fafc;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
  }
  .hero-gps { font-family: monospace; color: #0369a1; }
  .hero-fachada-wrap { margin-top: 10px; }
  .hero-fachada-img {
    width: 100%;
    max-height: 440px;
    object-fit: cover;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    display: block;
  }
  .hero-fachada-caption {
    font-size: 11px;
    color: #64748b;
    font-weight: 600;
    margin-top: 5px;
    text-align: center;
    padding: 3px 0;
  }
  .maps-link {
    color: #0369a1;
    text-decoration: none;
    font-weight: 600;
  }
  .maps-link:hover { text-decoration: underline; }

  /* ── Spreads editoriales de evidencias gráficas ─────────────────────── */
  .evidence-spread { width: 100%; margin: 12px 0; break-inside: avoid; }
  .evidence-spread-img {
    width: 100%;
    max-height: 500px;
    object-fit: cover;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    display: block;
  }
  .evidence-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin: 12px 0;
  }
  .evidence-grid-item { break-inside: avoid; }
  .evidence-grid-item img {
    width: 100%;
    max-height: 300px;
    object-fit: cover;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    display: block;
  }
  .evidence-caption {
    font-size: 11px;
    font-weight: 600;
    color: #475569;
    margin-top: 4px;
    padding: 3px 6px;
    background: #f8fafc;
    border-radius: 0 0 5px 5px;
    text-align: center;
  }

  /* ── Galería de fotos de documentos del encuestador ─────────────────── */
  /* @intervention IMPL-20260408-03 | ARCH-20260408-14 */
  .doc-photos-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin: 10px 0 16px;
  }
  .doc-photo-item { break-inside: avoid; }
  .doc-photo-img {
    width: 100%;
    max-height: 280px;
    object-fit: contain;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    display: block;
  }
  .doc-photo-caption {
    font-size: 10px;
    font-weight: 600;
    color: #64748b;
    text-align: center;
    margin-top: 3px;
    padding: 2px 4px;
  }

  /* Print styles */
  @media print {
    body { background: #fff; }
    .page-wrapper { box-shadow: none; max-width: 100%; }
    .cover { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .cover,
    .toc,
    .doc-section,
    .section-body {
      break-inside: auto;
      page-break-inside: auto;
      break-after: auto;
      page-break-after: auto;
    }
    @page { margin: 1.5cm; }
  }

  @media (max-width: 600px) {
    .doc-body { padding: 20px 16px; }
    .cover { padding: 28px 20px 24px; }
    .cover-logo { position: static; margin-bottom: 16px; max-height: 36px; }
    .cover-title { font-size: 20px; }
    .cover-meta { flex-direction: column; }
    .field-pair { grid-template-columns: 1fr; }
    .metrics-row { flex-direction: column; }
    .doc-footer { flex-direction: column; gap: 4px; padding: 16px; text-align: center; }
    .hero-map-img { max-height: 220px; }
    .hero-fachada-img { max-height: 240px; }
    .evidence-spread-img { max-height: 260px; }
    .evidence-grid-2 { grid-template-columns: 1fr; }
  }
`;

// ── Función principal de renderizado ──────────────────────────────────────────

interface RenderOptions {
  versionNumber?: number;
  status?: string;
  folio?: string;
}

/**
 * Genera un documento HTML editorial standalone desde el snapshot inmutable.
 * No lee datos vivos del proceso; opera exclusivamente sobre el snapshot.
 *
 * @intervention IMPL-20260320-01
 */
export async function renderArmadoHtml(
  snapshot: Record<string, any>,
  sections: string[],
  opts: RenderOptions = {},
): Promise<string> {
  const logoBuf = loadLogoBase64();
  const logoTag = logoBuf
    ? `<img src="data:image/png;base64,${logoBuf}" alt="Sinergia RH" class="cover-logo" />`
    : "";

  const candidate = snapshot.candidate || {};
  const client = snapshot.client || {};
  const post = snapshot.post || {};
  const process = snapshot.process || {};

  const candidateName = esc(candidate.nombreCompleto || "—");
  const clientName = esc(client.nombreEmpresa || "");
  const postName = esc(post.nombreDelPuesto || post.nombre || "—");
  const processKey = esc(process.clave || `Proc. ${process.id || "—"}`);
  const generatedAt = formatDateTime(snapshot.generatedAt);
  const cal = process.calificacionFinal || null;
  const comentarioCal = process.comentarioCalificacion || null;
  const calColors = calificacionColors(cal);
  const calLabel = cal ? (CALIFICACION_LABELS[cal] || cal) : null;
  const folio = opts.folio || `ARM-${process.id || "NA"}-v${opts.versionNumber || 1}`;

  // ── Portada ──────────────────────────────────────────────────────────────────

  let coverCalHtml = "";
  if (calLabel && cal !== "pendiente") {
    coverCalHtml = `
    <div class="cover-cal" style="border-color:${calColors.accent}40">
      <div>
        <div class="cover-cal-label">Dictamen final</div>
        <div class="cover-cal-value" style="color:${calColors.accent === "#64748b" ? "#fff" : calColors.accent}">${esc(calLabel)}</div>
        ${comentarioCal ? `<div class="cover-cal-comment">${esc(comentarioCal)}</div>` : ""}
      </div>
    </div>`;
  }

  const coverHtml = `
  <div class="cover" id="cover">
    ${logoTag}
    <div class="cover-badge">Reporte de estudio · Confidencial</div>
    <div class="cover-title">Estudio de candidato</div>
    <div class="cover-subtitle">Sinergia RH — Documento editorial para cliente</div>
    ${clientName ? `<div class="cover-client">${clientName}</div>` : ""}
    <div class="cover-candidate">${candidateName}</div>
    <div class="cover-post">${postName}</div>
    ${coverCalHtml}
    <div class="cover-meta">
      <div class="cover-meta-item">
        <div class="cover-meta-label">Proceso</div>
        <div class="cover-meta-value">${processKey}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">Versión</div>
        <div class="cover-meta-value">v${opts.versionNumber || 1} · ${esc(opts.status || "draft")}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">Generado</div>
        <div class="cover-meta-value">${generatedAt}</div>
      </div>
    </div>
  </div>`;

  // ── Índice dinámico ───────────────────────────────────────────────────────────

  // Secciones siempre presentes (no opcionales)
  const alwaysPresent = [
    { label: "Portada", anchor: "#cover" },
    { label: "Resumen ejecutivo", anchor: "#exec-summary" },
  ];

  // Secciones opcionales seleccionadas en orden editorial
  const sectionOrder = [
    "generales_candidato",
    "documentos",
    "investigacion_laboral",
    "investigacion_legal",
    "semanas_cotizadas",
    "buro_credito",
    "visita_domiciliaria",
    "captura_visita",
    "observaciones_conclusion",
    // documentos_adicionales se renderiza siempre al final, fuera del loop de secciones seleccionadas
  ];

  const selectedOrdered = sectionOrder.filter((s) => sections.includes(s));
  let secCounter = 1;
  const sectionNumbers: Record<string, string> = {};
  for (const sec of selectedOrdered) {
    sectionNumbers[sec] = String(secCounter++);
  }

  const tocAlwaysItems = alwaysPresent
    .map(
      (item) => `
    <li class="toc-item">
      <span class="toc-num">—</span>
      <a href="${item.anchor}">${esc(item.label)}</a>
    </li>`,
    )
    .join("");

  const tocOptionalItems = selectedOrdered
    .map((key) => {
      const meta = ALL_SECTION_META[key];
      if (!meta) return "";
      return `
    <li class="toc-item">
      <span class="toc-num">${sectionNumbers[key]}</span>
      <a href="#${meta.anchor}">${esc(meta.title)}</a>
      <span class="toc-dot"></span>
    </li>`;
    })
    .join("");

  const tocHtml = `
  <nav class="toc" id="toc">
    <div class="toc-title">Índice de contenido</div>
    <ul class="toc-list">
      ${tocAlwaysItems}
      ${tocOptionalItems}
    </ul>
  </nav>`;

  // ── Resumen ejecutivo ─────────────────────────────────────────────────────────

  const perfil = (candidate.perfilDetalle || {}).generales || {};
  const execHtml = `
  <div class="exec-summary" id="exec-summary">
    <div class="exec-summary-title">Resumen ejecutivo</div>
    <div class="exec-row"><span class="exec-key">Tipo de estudio</span><span class="exec-val">${esc(process.tipoProducto || "—")}</span></div>
    ${perfil.escolaridad ? `<div class="exec-row"><span class="exec-key">Escolaridad</span><span class="exec-val">${esc(perfil.escolaridad)}</span></div>` : ""}
    <div class="exec-row">
      <span class="exec-key">Secciones incluidas</span>
      <span class="exec-val">${selectedOrdered.map((k) => esc(ALL_SECTION_META[k]?.title || k)).join(" · ") || "—"}</span>
    </div>
  </div>`;

  // ── Cuerpo de secciones ────────────────────────────────────────────────────────

  const sectionBuilders: Record<string, () => string> = {
    generales_candidato: () => buildGeneralesCandidato(snapshot),
    documentos: () => buildDocumentos(snapshot),
    investigacion_laboral: () => buildInvestigacionLaboral(snapshot),
    investigacion_legal: () => buildInvestigacionLegal(snapshot),
    semanas_cotizadas: () => buildSemanasWotizadas(snapshot),
    buro_credito: () => buildBuroCredito(snapshot),
    visita_domiciliaria: () => buildVisitaDomiciliaria(snapshot),
    captura_visita: () => buildCapturaVisita(snapshot),
    observaciones_conclusion: () => buildObservacionesConclusion(snapshot),
  };

  // Bloque de documentos adicionales: siempre al final si existen docs no clasificados
  const docsAdicionalesBody = buildDocumentosAdicionales(snapshot);
  const docsAdicionalesMeta = ALL_SECTION_META["documentos_adicionales"]!;
  const docsAdicionalesHtml = docsAdicionalesBody
    ? sectionBlock(
        docsAdicionalesMeta.anchor,
        "∓",
        docsAdicionalesMeta.title,
        docsAdicionalesBody,
      )
    : "";

  const sectionsHtml = selectedOrdered
    .map((key) => {
      const meta = ALL_SECTION_META[key];
      if (!meta) return "";
      const builder = sectionBuilders[key];
      const body = builder ? builder() : "";
      return sectionBlock(
        meta.anchor,
        `§ ${sectionNumbers[key]}`,
        meta.title,
        body,
      );
    })
    .join("\n");

  // Agregar documentos adicionales al final (fuera de secciones seleccionadas)
  const fullSectionsHtml = sectionsHtml + (docsAdicionalesHtml ? "\n" + docsAdicionalesHtml : "");

  // ── HTML final ────────────────────────────────────────────────────────────────

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reporte de estudio — ${esc(candidate.nombreCompleto || "Candidato")} — ${esc(processKey)}</title>
  <style>${DOCUMENT_CSS}</style>
</head>
<body>
<div class="page-wrapper">
  ${coverHtml}
  <main class="doc-body" id="body-start">
    ${tocHtml}
    ${execHtml}
    ${fullSectionsHtml}
  </main>
  <footer class="doc-footer">
    <div>
      <span class="footer-brand">Sinergia RH</span>
      &nbsp;·&nbsp;
      Folio: ${esc(folio)}
    </div>
    <div>
      <span class="footer-confidential">DOCUMENTO CONFIDENCIAL</span>
    </div>
  </footer>
</div>
</body>
</html>`;
}
