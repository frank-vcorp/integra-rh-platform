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
});