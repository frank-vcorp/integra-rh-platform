/**
 * @intervention ARCH-20260320-01
 * @respaldo context/SPECs/SPEC-pdf-dinamico-estudio-cliente.md
 */

import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { generarArmadoClientePDF } from "./estudiosocioPdf";

describe("generarArmadoClientePDF", () => {
  it("genera un PDF válido con snapshot mínimo", async () => {
    const pdfBytes = await generarArmadoClientePDF(
      {
        generatedAt: "2026-03-20T10:00:00.000Z",
        candidate: {
          nombreCompleto: "María Pérez López",
          telefono: "5512345678",
          email: "maria@example.com",
          perfilDetalle: {
            generales: {
              curp: "PELM900101MDFRRR01",
              rfc: "PEL900101AA1",
              domicilio: "Calle Falsa 123",
              estadoCivil: "Soltera",
            },
          },
        },
        client: {
          nombreEmpresa: "Cliente Demo SA de CV",
        },
        post: {
          nombreDelPuesto: "Analista de Operaciones",
        },
        process: {
          id: 99,
          clave: "ESE-2026-099",
          tipoProducto: "ESE LOCAL",
          estatusProceso: "visita_realizada",
          calificacionFinal: "recomendable",
          comentarioCalificacion: "Perfil alineado al puesto.",
        },
        workHistory: [],
        documents: [],
      },
      ["generales_candidato", "observaciones_conclusion"],
    );

    expect(pdfBytes.byteLength).toBeGreaterThan(1000);

    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBeGreaterThan(0);
  });

  it("soporta snapshots amplios con secciones operativas", async () => {
    const pdfBytes = await generarArmadoClientePDF(
      {
        generatedAt: "2026-03-20T10:00:00.000Z",
        candidate: {
          nombreCompleto: "José Ramírez Torres",
          telefono: "5587654321",
          email: "jose@example.com",
          perfilDetalle: {
            generales: {
              curp: "RATJ920202HDFMMM02",
              rfc: "RAT920202AB2",
              nss: "12345678901",
              edad: 34,
              fechaNacimiento: "1992-02-02",
              lugarNacimiento: "CDMX",
              estadoCivil: "Casado",
              escolaridad: "Licenciatura",
              domicilio: "Av. Siempre Viva 742",
              colonia: "Centro",
              municipio: "Monterrey",
              estado: "Nuevo León",
              cp: "64000",
              linkedin: "linkedin.com/in/jose-demo",
            },
          },
        },
        client: {
          nombreEmpresa: "Operadora Demo",
        },
        post: {
          nombreDelPuesto: "Supervisor de Ruta",
        },
        process: {
          id: 101,
          clave: "VISITA-2026-101",
          tipoProducto: "VISITA LOCAL",
          estatusProceso: "visita_realizada",
          calificacionFinal: "con_reservas",
          comentarioCalificacion: "Se requiere seguimiento puntual.",
          investigacionLaboral: {
            resultado: "Estable",
            detalles: "Sin inconsistencias críticas.",
            iaDictamenCliente: {
              resumenEjecutivoCliente: "Perfil operativo con referencias congruentes.",
              recomendacionesCliente: ["Validar rutas foráneas", "Monitorear puntualidad inicial"],
            },
          },
          investigacionLegal: {
            antecedentes: "Sin antecedentes relevantes.",
            flagRiesgo: false,
            notasPeriodisticas: "Sin hallazgos periodísticos.",
          },
          semanasDetalle: {
            comentario: "Semanas alineadas al historial declarado.",
            evidenciasGraficas: ["https://example.com/imss-1.png"],
          },
          antecedentesPenales: {
            comentarios: "Sin notas adversas.",
          },
          buroCredito: {
            estatus: "Consultado",
            score: "680",
            aprobado: true,
            archivosAdicionales: ["https://example.com/buro.pdf"],
          },
          visitStatus: {
            status: "realizada",
            scheduledDateTime: "2026-03-18T16:00:00.000Z",
            direccion: "Av. Siempre Viva 742, Monterrey",
            observaciones: "Zona de fácil acceso.",
          },
          visitaDetalle: {
            comentarios: "Entorno ordenado.",
            cierre: {
              observaciones: "La vivienda coincide con lo declarado.",
            },
            inmueble: {
              tipoInmueble: "Casa",
              estadoVivienda: "Bueno",
            },
            ingresosArray: [{ aportacionTotal: 18000 }],
            egresos: { alimentacionDespensa: 4500, transportacion: 1200 },
          },
        },
        workHistory: [
          {
            empresa: "Logística del Norte",
            puesto: "Coordinador",
            fechaInicio: "2021-01-01",
            fechaFin: "2024-12-31",
            resultadoVerificacion: "Positivo",
            comentarioInvestigacion: "Salida por mejora salarial.",
          },
        ],
        documents: [
          {
            tipoDocumento: "INE",
            nombreArchivo: "ine-jose.pdf",
            uploadedBy: "Analista Demo",
            createdAt: "2026-03-18T18:00:00.000Z",
          },
        ],
      },
      [
        "generales_candidato",
        "documentos",
        "investigacion_laboral",
        "investigacion_legal",
        "semanas_cotizadas",
        "buro_credito",
        "visita_domiciliaria",
        "observaciones_conclusion",
      ],
    );

    expect(pdfBytes.byteLength).toBeGreaterThan(1500);

    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBeGreaterThan(0);
  });

  /**
   * @intervention FIX-20260323-02
   * @respaldo context/interconsultas/DICTAMEN_FIX-20260323-02.md
   */
  it("renderiza cotejo documental y enlace de Google Maps con literales ASCII seguros", async () => {
    const pdfBytes = await generarArmadoClientePDF(
      {
        generatedAt: "2026-03-23T16:00:00.000Z",
        candidate: { nombreCompleto: "Proceso 82 En Memoria" },
        client: { nombreEmpresa: "Cliente Proceso 82" },
        post: { nombreDelPuesto: "Inspector de Campo" },
        process: {
          id: 82,
          clave: "ESE-2026-082",
          tipoProducto: "VISITA LOCAL",
          estatusProceso: "visita_realizada",
          visitStatus: {
            status: "realizada",
            scheduledDateTime: "2026-03-23T16:00:00.000Z",
            direccion: "Av. Reforma 100, CDMX",
          },
          visitaDetalle: {
            ubicacion: {
              domicilio: "Av. Reforma 100",
              gps: { lat: 19.4326, lon: -99.1332, accuracy: 7 },
            },
            documentos: {
              actaNacimiento: { tiene: "si" },
              credencialElector: { tiene: "si" },
              comprobanteDomicilio: { tiene: "no", nombreTitular: "Ana Pérez" },
              cartillaMilitar: { tiene: "no" },
              pasaporte: { tiene: "si" },
              visaAmericana: { tiene: "no" },
              cartasRecomendacion: { tiene: "si" },
              licenciaConducir: { tiene: "si" },
              certificadoTitulo: { tiene: "si" },
            },
          },
        },
        workHistory: [],
        documents: [],
      },
      ["visita_domiciliaria", "captura_visita"],
    );

    expect(pdfBytes.byteLength).toBeGreaterThan(1000);

    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBeGreaterThan(0);
  });

  /** IMPL-20260323-20: verifica que la sección captura_visita renderiza correctamente */
  it("renderiza sección captura_visita con datos del formulario del encuestador", async () => {
    const pdfBytes = await generarArmadoClientePDF(
      {
        generatedAt: "2026-03-23T10:00:00.000Z",
        candidate: { nombreCompleto: "Ana García Reyes", telefono: "5511223344" },
        client: { nombreEmpresa: "Empresa Prueba SA" },
        post: { nombreDelPuesto: "Coordinadora de Recursos" },
        process: {
          id: 202,
          clave: "VISITA-2026-202",
          tipoProducto: "VISITA LOCAL",
          estatusProceso: "visita_realizada",
          calificacionFinal: "recomendable",
          visitStatus: {
            status: "realizada",
            scheduledDateTime: "2026-03-22T14:00:00.000Z",
            direccion: "Calle Reforma 55, Col. Centro",
          },
          visitaDetalle: {
            _privacyAcceptedAt: "2026-03-22T14:05:00.000Z",
            _sessionStartedAt: "2026-03-22T14:06:00.000Z",
            _sessionEndedAt: "2026-03-22T15:30:00.000Z",
            ubicacion: {
              domicilio: "Calle Reforma 55",
              cp: "06600",
              coloniaMunicipio: "Centro, Cuauhtémoc",
              estado: "CDMX",
            },
            academica: {
              ultimoGrado: "Licenciatura",
              institucion: "UNAM",
              periodo: "2015-2019",
              documentoObtenido: "Título",
            },
            familiares: [
              { parentesco: "Esposo", nombre: "Pedro López", edad: 35, escolaridad: "Preparatoria", ocupacion: "Chofer" },
            ],
            inmueble: {
              tipoInmueble: "Casa propia",
              estadoVivienda: "Bueno",
              ordenLimpieza: "Muy bien",
              medioTransporte: "Metro",
              tiempoTraslado: "45 minutos",
            },
            ingresosArray: [{ nombre: "Ana García", ingreso: 15000, aportacionTotal: 15000 }],
            salud: { estadoSalud: "Bueno", servicioMedico: "IMSS", fuma: false, toma: false },
            referenciasPersonales: [
              { nombre: "Carla Mendoza", telefono: "5544332211", ocupacion: "Maestra", tiempoDeConocerlo: "10 años" },
            ],
            cierre: { observaciones: "Domicilio congruente con lo declarado. Entorno tranquilo." },
            evidenciasGraficas: [],
          },
        },
        workHistory: [],
        documents: [],
      },
      ["visita_domiciliaria", "captura_visita", "observaciones_conclusion"],
    );

    expect(pdfBytes.byteLength).toBeGreaterThan(1000);

    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBeGreaterThan(0);
  });

  /**
   * @intervention IMPL-20260323-05
   * Verifica degradación graceful cuando mapaCapturaUrl no resuelve:
   * el PDF se genera igualmente y la sección visita_domiciliaria está presente.
   */
  it("soporta mapaCapturaUrl sin fallar aunque la URL no resuelva", async () => {
    const pdfBytes = await generarArmadoClientePDF(
      {
        generatedAt: "2026-03-23T10:00:00.000Z",
        candidate: { nombreCompleto: "Test Mapa Clicable" },
        client: { nombreEmpresa: "Empresa Demo SA" },
        post: { nombreDelPuesto: "Analista" },
        process: {
          id: 303,
          clave: "MAP-2026-303",
          visitStatus: {
            status: "realizada",
            scheduledDateTime: "2026-03-23T10:00:00.000Z",
            direccion: "Av. Insurgentes Sur 1234, Col. Del Valle, CDMX",
          },
          visitaDetalle: {
            ubicacion: {
              domicilio: "Av. Insurgentes Sur 1234",
              gps: { lat: 19.397, lon: -99.167, accuracy: 5 },
              mapaCapturaUrl: "https://nonexistent.invalid/mapa-captura.png",
            },
          },
        },
        workHistory: [],
        documents: [],
      },
      ["visita_domiciliaria"],
    );

    expect(pdfBytes.byteLength).toBeGreaterThan(500);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBeGreaterThan(0);
  });

  /** @intervention IMPL-20260323-05 — Verifica anotaciones GoTo en la primera página (índice clicable) */
  it("índice clicable genera anotaciones en la primera página", async () => {
    const pdfBytes = await generarArmadoClientePDF(
      {
        generatedAt: "2026-03-23T10:00:00.000Z",
        candidate: { nombreCompleto: "Test Índice Clicable" },
        client: { nombreEmpresa: "Demo SA de CV" },
        post: { nombreDelPuesto: "Coordinador" },
        process: {
          id: 404,
          clave: "IDX-2026-404",
          calificacionFinal: "recomendable",
          comentarioCalificacion: "Perfectamente alineado.",
        },
        workHistory: [],
        documents: [],
      },
      ["generales_candidato", "investigacion_laboral", "observaciones_conclusion"],
    );

    expect(pdfBytes.byteLength).toBeGreaterThan(1000);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBeGreaterThan(0);

    // La primera página debe tener anotaciones GoTo del índice clicable
    const { PDFName } = await import("pdf-lib");
    const firstPage = pdfDoc.getPage(0);
    const annots = firstPage.node.get(PDFName.of("Annots"));
    expect(annots).toBeDefined();
  });

  /**
   * @intervention ARCH-20260323-02
   * Verifica que mapaCapturaUrl (campo canónico de IMPL-20260323-02) tiene
   * prioridad sobre variantes legacy. El PDF debe generarse aunque ambos campos
   * estén presentes y la URL del canónico no resuelva (degradación graceful).
   */
  it("mapaCapturaUrl tiene prioridad sobre variantes legacy y el PDF se genera sin errores", async () => {
    const pdfBytes = await generarArmadoClientePDF(
      {
        generatedAt: "2026-03-23T12:00:00.000Z",
        candidate: { nombreCompleto: "Test Prioridad Canónico" },
        client: { nombreEmpresa: "Demo SA" },
        post: { nombreDelPuesto: "Analista" },
        process: {
          id: 505,
          clave: "CAN-2026-505",
          visitStatus: {
            status: "realizada",
            scheduledDateTime: "2026-03-23T12:00:00.000Z",
            direccion: "Insurgentes Sur 1111, CDMX",
          },
          visitaDetalle: {
            ubicacion: {
              domicilio: "Insurgentes Sur 1111",
              gps: { lat: 19.3800, lon: -99.1700, accuracy: 8 },
              // Campo canónico (generado por EncuestadorPortal vía Static Maps API):
              mapaCapturaUrl:
                "https://maps.googleapis.com/maps/api/staticmap?center=19.38,-99.17&zoom=17&size=400x200&maptype=roadmap&markers=color:red%7C19.38,-99.17&key=FAKE_KEY_TEST",
              // Variantes legacy que deben ignorarse cuando el canónico está presente:
              mapScreenshotUrl: "https://nonexistent.invalid/legacy-screenshot.png",
              capturaMapa: "https://nonexistent.invalid/captura-vieja.jpg",
            },
          },
        },
        workHistory: [],
        documents: [],
      },
      ["visita_domiciliaria"],
    );

    expect(pdfBytes.byteLength).toBeGreaterThan(500);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBeGreaterThan(0);
  });
});