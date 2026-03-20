# DICTAMEN TÉCNICO: Auditoría de Mapeo de Archivo Excel
- **ID:** FIX-20260313-01
- **Fecha:** 2026-03-13
- **Solicitante:** INTEGRA
- **Estado:** ✅ VALIDADO (con advertencias de faltantes)

### A. Análisis de Causa Raíz
He cruzado el volcado total del archivo Excel (`/tmp/excel_fields.json`) contra la arquitectura declarada en `context/armado/SPEC_MAPEO_EXCEL.md` y `context/armado/SPEC_MAPEO_ENCUESTADOR.md`.

**Hallazgo forense:**
Hay una brecha significativa entre lo esperado por el cliente en el Excel original y lo mapeado en los documentos de SPEC. Se cubrieron las bases fundamentales (Generales, Historial Laboral, Estado de Salud, Fotos), pero **la mayor parte del tejido blando del Estudio Socioeconómico ha quedado fuera de la arquitectura actual**.

**Secciones importantes cubiertas:**
- I. Generales / Documentos (Parcial)
- II. Patrones en el IMSS
- III. Historial Laboral
- Entrevista: Familia (Breve cubierta) y Salud 
- Fotografías esenciales y Resumen

**Secciones/Campos NO mapeados en las SPECs (HUECOS CRÍTICOS):**
1. **Información Académica:** Todos los campos de grados, instituciones, periodo, cursos, programas que domina y equipos. (Ausente)
2. **Información Social y Pasatiempos:** Deportes, eventos, afiliación a grupos/partidos, tatuajes/piercings. (Ausente)
3. **Área Jurídica:** Preguntas sobre problemas legales, privación de la libertad, pertenencia a partidos/sindicatos. (Ausente)
4. **Datos Familiares Detallados:** La tabla de cohabitantes (Madre, Padre, Esposo/a, Hijo/a, edad, escolaridad, ocupación). (Ausente)
5. **Referencias Económicas (Ingresos y Egresos):** Ingresos de la familia, otros ingresos. Desglose extenso de gastos (Agua, luz, teléfono, gas, renta/hipoteca, ropa, recreación, gastos médicos), créditos (Infonavit, Fonacot) y propiedades/vehículos. (Ausente por completo)
6. **Datos del Inmueble:** Tabla pormenorizada (Valor, superficie, fachadas, recámaras, muebles, electrodomésticos, servicios públicos formales). (Ausente)
7. **Referencias Vecinales / Personales:** Tabla de información de vecinos (Nombre, ocupación, domicilio, testimonios sobre cómo consideran al candidato). (Ausente)
8. **Sub-Datos de Documentos / Fotos:** Falta mapear "Croquis", "Foto Google Maps", "Dictamen de Afiliaciones (Afore)", "Tipos de Créditos", variables de "Tipo de Sangre", entre otros menores.

### B. Justificación de la Solución
Este diagnóstico evidencia que ambos SPECs requieren una "Fase 2" expansiva para inyectar estos grupos al JSON estructurado de la App del Encuestador (ya que toda la indagatoria económica, de vivienda, académica, judicial y familiar se realiza en campo). 

### C. Instrucciones de Handoff para INTEGRA - Arquitecto
1. **Evaluar el alcance:** Revisa los puntos faltantes mencionados en la Sección A. Decide si estos se abordarán de inmediato y cómo encajarán orgánicamente en el `visitaDetalle` de la base de datos (seguramente ampliando el JSON).
2. **Actualizar el SPEC de Campo:** Modificar `context/armado/SPEC_MAPEO_ENCUESTADOR.md` y añadir las categorías faltantes como sub-formularios en la PWA (Académico, Vivienda, Finanzas, Familiar, Jurídico).
3. **Actualizar Reporte Final:** Asegurar que el backend que generará el Excel exporte este árbol completo extraído del JSON.
