/**
 * estudiosocioPdf.ts
 * Generador de PDF para el Estudio Socioeconómico Domiciliario.
 * Usa pdf-lib (ya instalado). Patrón reutilizado de candidateConsent.ts.
 * @intervention IMPL-20260313-05
 */

import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";
import https from "node:https";
import http from "node:http";

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
  encuestadorNombre?: string | null;
}

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

  // ── PORTADA ──────────────────────────────────────────────────────────────
  ctx.page.drawRectangle({ x: 0, y: A4_H - 70, width: A4_W, height: 70, color: rgb(0.22, 0.38, 0.57) });
  ctx.page.drawText("ESTUDIO SOCIOECONÓMICO DOMICILIARIO", {
    x: MARGIN_X, y: A4_H - 28, size: 14, font: fontBold, color: rgb(1, 1, 1),
  });
  ctx.page.drawText("Integra RH · Confidencial", {
    x: MARGIN_X, y: A4_H - 46, size: 9, font, color: rgb(0.8, 0.88, 1),
  });
  ctx.y = A4_H - 90;

  field(ctx, "Candidato", candidato.nombreCompleto);
  if (candidato.telefono) field(ctx, "Teléfono", candidato.telefono);
  if (candidato.curp) field(ctx, "CURP", candidato.curp);
  if (proceso.clave) field(ctx, "Proceso", proceso.clave);
  if (proceso.encuestadorNombre) field(ctx, "Encuestador", proceso.encuestadorNombre);
  if (proceso.scheduledDateTime) {
    const d = new Date(proceso.scheduledDateTime);
    field(ctx, "Fecha de visita", d.toLocaleString("es-MX", { timeZone: "America/Mexico_City" }));
  }
  field(ctx, "Generado", new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" }));

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
    if (proceso.direccion) field(ctx, "Dirección programada", proceso.direccion);
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
      const mark = val ? "☑" : "☐";
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
  if (fams.length > 0) {
    sectionHeader(ctx, "§4  DATOS FAMILIARES");
    for (const f of fams) {
      ensureSpace(ctx, LINE_H * 2);
      fieldPair(ctx, f.parentesco || "Familiar", f.nombre, "Edad", f.edad ? String(f.edad) : null);
      fieldPair(ctx, "Escolaridad", f.escolaridad, "Ocupación", f.ocupacion);
      if (!f.habitaEnDomicilio) field(ctx, "Lugar de residencia", f.lugarResidencia);
      ctx.y -= 3;
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
      let totalIngresos = 0;
      for (const ing of ingresos) {
        const nombre = ing.nombre || "";;
        const monto = ing.ingreso ? `$${ing.ingreso.toLocaleString("es-MX")}` : "";
        const aporte = ing.aportacionTotal ? ` → Aportación: $${ing.aportacionTotal.toLocaleString("es-MX")}` : "";
        text(ctx, `  ${nombre}${ing.parentesco ? ` (${ing.parentesco})` : ""}: ${monto}${aporte}`, { size: 8 });
        totalIngresos += Number(ing.aportacionTotal ?? ing.ingreso ?? 0);
      }
      if (totalIngresos > 0) text(ctx, `  Total ingresos: $${totalIngresos.toLocaleString("es-MX")}`, { bold: true, size: 8 });
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
      let totalEgresos = 0;
      for (const [label, val] of egMap) {
        if (!val) continue;
        text(ctx, `  ${label}: $${Number(val).toLocaleString("es-MX")}`, { size: 8 });
        totalEgresos += Number(val);
      }
      if (totalEgresos > 0) text(ctx, `  Total egresos: $${totalEgresos.toLocaleString("es-MX")}`, { bold: true, size: 8 });
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
    boolField(ctx, "Enf. hereditarias", salud.enfermedadesHereditarias, salud.enfermedadesHereditariasCuales);
    boolField(ctx, "Toma medicamentos", salud.medicamentos, salud.medicamentosCuales);
    boolField(ctx, "Drogas", salud.drogas, salud.drogasCuales);
    if (salud.fuma !== undefined) field(ctx, "Fuma", salud.fuma ? `Sí (${salud.cigarrosDiarios || "?"} cigarros/día)` : "No");
    if (salud.toma !== undefined) field(ctx, "Consume alcohol", salud.toma ? `Sí — ${salud.tomaTipoBebida || ""} (${salud.tomaCadaCuando || ""})` : "No");
  }

  // ── §8 INFORMACIÓN SOCIAL ────────────────────────────────────────────────
  const social = detalle.social ?? {};
  if (Object.keys(social).length > 0) {
    sectionHeader(ctx, "§8  INFORMACIÓN SOCIAL");
    if (social.pasatiempos) field(ctx, "Pasatiempos", social.pasatiempos);
    if (social.deporte !== undefined) field(ctx, "Deporte", social.deporte ? `Sí: ${social.deporteCual || ""} (${social.deporteFrecuencia || ""})` : "No");
    if (social.discotecas !== undefined) field(ctx, "Antros/Discotecas", social.discotecas ? `Sí: ${social.discotecasCual || ""} (${social.discotecasFrecuencia || ""})` : "No");
    boolField(ctx, "Grupo deportivo", social.grupoDeportivo, social.grupoDeportivoCual);
    boolField(ctx, "Partido político", social.partidoPolitico, social.partidoPoliticoCual);
    if (social.tatuajesPiercings !== undefined) field(ctx, "Tatuajes/Piercings", social.tatuajesPiercings ? "Sí" : "No");
  }

  // ── §9 ÁREA JURÍDICA ─────────────────────────────────────────────────────
  const jur = detalle.juridica ?? {};
  if (Object.keys(jur).length > 0) {
    sectionHeader(ctx, "§9  ÁREA JURÍDICA");
    boolField(ctx, "Proceso legal", jur.procesoLegal, jur.procesoLegalPorQue);
    if (jur.procesoLegal && jur.procesoLegalQuien) field(ctx, "  ¿Quién?", jur.procesoLegalQuien);
    boolField(ctx, "Privado de libertad", jur.privadoLibertad, jur.privadoLibertadPorQue);
    if (jur.privadoLibertad && jur.privadoLibertadQuien) field(ctx, "  ¿Quién?", jur.privadoLibertadQuien);
    boolField(ctx, "Problemas laborales", jur.problemasLaborales, jur.problemasLaboralesPorQue);
    boolField(ctx, "Sindicato", jur.sindicato, jur.sindicatoCual);
    boolField(ctx, "Puestos políticos", jur.puestosPoliticos, jur.puestosPoliticosCual);
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
    if (dv.rutasForaneas !== undefined) field(ctx, "Disponible rutas foráneas", dv.rutasForaneas ? "Sí" : "No");
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
  }

  // ── §15a REFERENCIAS VECINALES ───────────────────────────────────────────
  const refVec = detalle.referenciasVecinales ?? [];
  if (refVec.length > 0) {
    sectionHeader(ctx, "§15  REFERENCIAS VECINALES");
    for (const rv of refVec) {
      ensureSpace(ctx, LINE_H * 4);
      fieldPair(ctx, "Nombre", rv.nombre, "Teléfono", rv.telefono);
      fieldPair(ctx, "Ocupación", rv.ocupacion, "Tiempo de conocerlo", rv.tiempoDeConocerlo);
      if (rv.comentarios) field(ctx, "Comentarios", rv.comentarios);
      ctx.y -= 3;
    }
  }

  // ── §15b REFERENCIAS PERSONALES ─────────────────────────────────────────
  const refPer = detalle.referenciasPersonales ?? [];
  if (refPer.length > 0) {
    sectionHeader(ctx, "§15b  REFERENCIAS PERSONALES");
    for (const rp of refPer) {
      ensureSpace(ctx, LINE_H * 3);
      fieldPair(ctx, "Nombre", rp.nombre, "Teléfono", rp.telefono);
      fieldPair(ctx, "Ocupación", rp.ocupacion, "Tiempo de conocerlo", rp.tiempoDeConocerlo);
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
  const fotos = detalle.fotos ?? {};
  const fotoEntries: [string, string][] = [
    ["Comedor", fotos.comedor],
    ["Cocina", fotos.cocina],
    ["Sala", fotos.sala],
    ["Fachada desde el patio", fotos.fachadaPatio],
    ["Vista fachada desde la calle", fotos.fachadaCalle],
  ].filter((e): e is [string, string] => !!e[1]);

  if (fotoEntries.length > 0) {
    sectionHeader(ctx, "§11  FOTOGRAFÍAS DEL DOMICILIO");
    // Embebemos en pares (2 por fila)
    let fotoIdx = 0;
    while (fotoIdx < fotoEntries.length) {
      ensureSpace(ctx, 150);
      const startY = ctx.y;
      const f1 = fotoEntries[fotoIdx];
      const f2 = fotoEntries[fotoIdx + 1];

      // Etiqueta izquierda
      ctx.page.drawText(f1[0], { x: MARGIN_X, y: startY, size: 7, font: ctx.fontBold, color: rgb(0.3, 0.3, 0.3) });
      // Etiqueta derecha
      if (f2) ctx.page.drawText(f2[0], { x: COL_RIGHT, y: startY, size: 7, font: ctx.fontBold, color: rgb(0.3, 0.3, 0.3) });

      ctx.y -= LINE_H;

      // Embeber imagen izquierda
      const buf1 = await fetchBuffer(f1[1]);
      if (buf1 && buf1.length > 100) {
        try {
          const img = isPng(buf1) ? await pdfDoc.embedPng(buf1) : await pdfDoc.embedJpg(buf1);
          const maxW = 220; const maxH = 130;
          const scale = Math.min(maxW / img.width, maxH / img.height, 1);
          ctx.page.drawImage(img, { x: MARGIN_X, y: ctx.y - img.height * scale, width: img.width * scale, height: img.height * scale });
        } catch { /* skip */ }
      }

      // Embeber imagen derecha
      if (f2) {
        const buf2 = await fetchBuffer(f2[1]);
        if (buf2 && buf2.length > 100) {
          try {
            const img2 = isPng(buf2) ? await pdfDoc.embedPng(buf2) : await pdfDoc.embedJpg(buf2);
            const maxW = 220; const maxH = 130;
            const scale2 = Math.min(maxW / img2.width, maxH / img2.height, 1);
            ctx.page.drawImage(img2, { x: COL_RIGHT, y: ctx.y - img2.height * scale2, width: img2.width * scale2, height: img2.height * scale2 });
          } catch { /* skip */ }
        }
      }

      ctx.y -= 135;
      fotoIdx += 2;
    }
  }

  // ── §12 RESUMEN Y FIRMA ──────────────────────────────────────────────────
  const cierre = detalle.cierre ?? {};
  if (cierre.observaciones || cierre.firmaUrl) {
    sectionHeader(ctx, "§12  RESUMEN Y FIRMA DEL ENCUESTADOR");
    if (cierre.observaciones) {
      text(ctx, "Observaciones:", { bold: true, size: 8 });
      text(ctx, cierre.observaciones, { size: 8 });
      ctx.y -= 6;
    }
    if (cierre.firmaUrl) {
      text(ctx, "Firma autógrafa del encuestador:", { bold: true, size: 8 });
      ctx.y -= 4;
      await embedImage(ctx, cierre.firmaUrl, 200, 100);
    }
  }

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
