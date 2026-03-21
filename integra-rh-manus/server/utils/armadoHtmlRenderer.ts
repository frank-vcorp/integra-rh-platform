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
  observaciones_conclusion: { title: "Observaciones y conclusión", anchor: "sec-conclusiones" },
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

function buildDocumentos(snapshot: Record<string, any>): string {
  const docs: any[] = Array.isArray(snapshot.documents) ? snapshot.documents : [];
  if (docs.length === 0) {
    return '<p class="empty-note">No se adjuntaron documentos en este armado.</p>';
  }
  const rows = docs
    .map(
      (doc: any) => `
    <tr>
      <td>${esc(doc.tipoDocumento || "—")}</td>
      <td>${esc(doc.nombreArchivo || "—")}</td>
      <td>${esc(doc.uploadedBy || "—")}</td>
      <td>${esc(formatDateTime(doc.createdAt))}</td>
    </tr>`,
    )
    .join("");
  return `
  <table class="data-table">
    <thead>
      <tr>
        <th>Tipo</th><th>Archivo</th><th>Cargado por</th><th>Fecha</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
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
      body += `
      <div class="work-item">
        <div class="work-item-header">
          <strong>${esc(item.empresa || "—")}</strong>
          <span class="work-puesto">${esc(item.puesto || "")}</span>
          ${resultBadge}
        </div>
        ${periodo ? `<div class="work-periodo">${esc(periodo)}</div>` : ""}
        ${item.comentarioInvestigacion ? `<div class="work-comment">${esc(item.comentarioInvestigacion)}</div>` : ""}
      </div>`;
    }
    body += "</div>";
  }

  return body;
}

function buildInvestigacionLegal(snapshot: Record<string, any>): string {
  const process = snapshot.process || {};
  const inv = process.investigacionLegal || {};
  const penales = process.antecedentesPenales || {};

  let body = "";

  if (inv.flagRiesgo) {
    body += `<div class="alert-banner">⚠ Se detectó riesgo en investigación legal</div>`;
  }

  body += field("Antecedentes / Hallazgos", inv.antecedentes || null);
  body += field("Notas periodísticas", inv.notasPeriodisticas || null);
  body += field("Observaciones IMSS", inv.observacionesImss || null);
  body += field("Comentarios adicionales", penales.comentarios || null);

  if (!body.trim()) {
    body = '<p class="empty-note">Sin hallazgos legales registrados.</p>';
  }

  return body;
}

function buildSemanasWotizadas(snapshot: Record<string, any>): string {
  const process = snapshot.process || {};
  const candidate = snapshot.candidate || {};
  const dictamen = candidate.dictamenLaboral || {};
  const semanas = process.semanasDetalle || {};

  let body = "";

  if (dictamen.disposicionSemanasCotizadas) {
    body += `
    <div class="info-banner">
      <strong>Disposición IMSS (global):</strong> ${esc(dictamen.disposicionSemanasCotizadas)}
      ${dictamen.motivoDisposicion ? `<br><strong>Motivo:</strong> ${esc(dictamen.motivoDisposicion)}` : ""}
    </div>`;
  }

  body += field("Comentario de cotejo", semanas.comentario || null);

  const numEvidencias = Array.isArray(semanas.evidenciasGraficas) ? semanas.evidenciasGraficas.length : 0;
  if (numEvidencias > 0) {
    body += field("Evidencias adjuntas", `${numEvidencias} archivo(s) en el expediente operativo`);
  }

  if (!body.trim()) {
    body = '<p class="empty-note">Sin datos de semanas cotizadas registrados.</p>';
  }

  return body;
}

function buildBuroCredito(snapshot: Record<string, any>): string {
  const process = snapshot.process || {};
  const buro = process.buroCredito || {};

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

  const adicionales = Array.isArray(buro.archivosAdicionales) ? buro.archivosAdicionales.length : 0;
  if (adicionales > 0) {
    body += field("Archivos adicionales", `${adicionales} archivo(s) en el expediente operativo`);
  }

  return body;
}

function buildVisitaDomiciliaria(snapshot: Record<string, any>): string {
  const process = snapshot.process || {};
  const visitStatus = process.visitStatus || {};
  const visitaDetalle = process.visitaDetalle || {};
  const inmueble = visitaDetalle.inmueble || {};

  let body = "";

  const fechaVisita = visitStatus.scheduledDateTime
    ? formatDateTime(visitStatus.scheduledDateTime)
    : "—";
  const direccion = visitStatus.direccion || visitaDetalle.ubicacion?.domicilio || null;

  body += `
  <div class="metrics-row">
    ${infoCard("Estatus visita", visitStatus.status || process.estatusProceso || "—", "#0d9488")}
    ${infoCard("Fecha programada", fechaVisita, "#0369a1")}
  </div>`;

  body += field("Dirección visitada", direccion);
  body += field("Observaciones logísticas", visitStatus.observaciones || null);
  body += field("Observaciones de visita", visitaDetalle.cierre?.observaciones || visitaDetalle.comentarios || null);

  if (inmueble && Object.keys(inmueble).length > 0) {
    body += '<div class="subsection-title">Características del inmueble</div>';
    body += fieldPair("Tipo de inmueble", inmueble.tipoInmueble || null, "Estado de la vivienda", inmueble.estadoVivienda || null);
    body += fieldPair("Orden y limpieza", inmueble.ordenLimpieza || null, "Medio de transporte", inmueble.medioTransporte || null);
    body += field("Tiempo de traslado", inmueble.tiempoTraslado || null);
  }

  // Resumen económico si existe la captura
  const ingresos: any[] = Array.isArray(visitaDetalle.ingresosArray) ? visitaDetalle.ingresosArray : [];
  const egresos = visitaDetalle.egresos || {};
  if (ingresos.length > 0 || Object.keys(egresos).length > 0) {
    body += '<div class="subsection-title">Resumen económico del hogar</div>';
    const totalIngresos = ingresos.reduce(
      (acc: number, item: any) => acc + Number(item.aportacionTotal ?? item.ingreso ?? 0),
      0,
    );
    const totalEgresos = Object.values(egresos as Record<string, unknown>).reduce((acc: number, item) => {
      if (!item) return acc;
      if (typeof item === "object") {
        return (
          acc +
          Object.values(item as Record<string, unknown>).reduce(
            (subAcc: number, subItem) => subAcc + Number(subItem ?? 0),
            0,
          )
        );
      }
      return acc + Number(item ?? 0);
    }, 0);

    body += fieldPair(
      "Ingresos familiares",
      totalIngresos > 0 ? formatCurrency(totalIngresos) : null,
      "Egresos familiares",
      totalEgresos > 0 ? formatCurrency(totalEgresos) : null,
    );
  }

  return body;
}

function buildObservacionesConclusion(snapshot: Record<string, any>): string {
  const process = snapshot.process || {};
  const inv = process.investigacionLaboral || {};
  const iaDictamen = inv.iaDictamenCliente || {};
  const cal = process.calificacionFinal || null;
  const comentarioCal = process.comentarioCalificacion || null;

  let body = "";

  if (cal && cal !== "pendiente") {
    const calColors = calificacionColors(cal);
    body += `
    <div class="cal-banner" style="background:${calColors.bg};border-color:${calColors.border};border-left:6px solid ${calColors.accent}">
      <div class="cal-label">DICTAMEN FINAL</div>
      <div class="cal-value" style="color:${calColors.text};font-size:20px">${esc(CALIFICACION_LABELS[cal] || cal)}</div>
      ${comentarioCal ? `<div class="cal-comment">${esc(comentarioCal)}</div>` : ""}
    </div>`;
  }

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
    break-inside: avoid-page;
    page-break-inside: avoid;
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

  /* Print styles */
  @media print {
    body { background: #fff; }
    .page-wrapper { box-shadow: none; max-width: 100%; }
    .cover { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .doc-section { page-break-inside: avoid; }
    .cover { page-break-after: always; }
    .toc { page-break-after: always; }
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
  <div class="cover">
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
    "observaciones_conclusion",
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
    <div class="exec-row"><span class="exec-key">Candidato</span><span class="exec-val">${candidateName}</span></div>
    ${clientName ? `<div class="exec-row"><span class="exec-key">Empresa cliente</span><span class="exec-val">${clientName}</span></div>` : ""}
    <div class="exec-row"><span class="exec-key">Puesto solicitado</span><span class="exec-val">${postName}</span></div>
    <div class="exec-row"><span class="exec-key">Tipo de estudio</span><span class="exec-val">${esc(process.tipoProducto || "—")}</span></div>
    ${perfil.escolaridad ? `<div class="exec-row"><span class="exec-key">Escolaridad</span><span class="exec-val">${esc(perfil.escolaridad)}</span></div>` : ""}
    ${calLabel ? `<div class="exec-row"><span class="exec-key">Dictamen final</span><span class="exec-val" style="font-weight:700;color:${calColors.accent}">${esc(calLabel)}</span></div>` : ""}
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
    observaciones_conclusion: () => buildObservacionesConclusion(snapshot),
  };

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
    ${sectionsHtml}
  </main>
  <footer class="doc-footer">
    <div>
      <span class="footer-brand">Sinergia RH</span>
      &nbsp;·&nbsp;
      Folio: ${esc(folio)}
      &nbsp;·&nbsp;
      Generado: ${generatedAt}
    </div>
    <div>
      <span class="footer-confidential">CONFIDENCIAL — USO INTERNO</span>
    </div>
  </footer>
</div>
</body>
</html>`;
}
