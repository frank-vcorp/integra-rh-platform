# 📑 SPEC-MAP: Generación Reporte Final Excel/PDF (Datos de Oficina)

**Objetivo:** Identificar de qué campo exacto de la base de datos (`drizzle/schema.ts`) se extraerá cada etiqueta del Excel que le corresponde llenar a Sinergia RH, para ensamblar el documento final.

Ambos mundos (Back-Office y Field-Work) convergerán al generar el reporte final que se mandará al cliente, preservando intactas las etiquetas originales solicitadas.

---

### 👤 1. GENERALES DEL CANDIDATO (Heredados del Perfil Base)
*Estos datos se toman directo de la tabla de candidatos y de la relación con la vacante. El analista los capturó al crear al candidato.*

| Etiqueta Orig. (Excel) | Tabla / Campo en Base de Datos (Sistema) | Notas / Transformación |
| :--- | :--- | :--- |
| `"NOMBRE DEL CANDIDATO:"` | `candidates.nombres` + `apellidos` | Se concatenan. |
| `"FECHA"` | `processes.createdAt` | Fecha en que se originó la investigación. |
| `"PUESTO:"` | `posts.titulo` | Vía join: `processes` -> `posts.id` |
| `"CEDI /PLAZA"` | `clientSites.nombre` / `posts.ubicacion` | Vía join a la plaza de la vacante. |
| `"FECHA Y LUGAR DE NACIMIENTO:"` | `candidates.fechaNacimiento` / `candidates.lugarNacimiento`| |
| `"SEXO:"` | `candidates.genero` | |
| `"EDAD:"` | `candidates.fechaNacimiento` | (Se calcula al vuelo para el PDF). |
| `"CURP:"` / `"RFC:"` / `"NSS:"` | `candidates.curp`, `candidates.rfc`, `candidates.nss` | |
| `"ESTADO CIVIL:"` | `candidates.estadoCivil` | |
| `"CORREO ELECTRÓNICO:"` | `candidates.correo` | |
| `"CELULAR:"` / `"TEL CASA:"` | `candidates.celular` / `candidates.telefono` | |

---

### 🕵️‍♀️ 2. INVESTIGACIÓN IMSS Y BURÓ (Captura Back-Office de Sinergia)
*Todo el módulo legal y de fondo que Sinergia hace desde su escritorio. Se almacena en los metadatos JSON del proceso.*

| Etiqueta Orig. (Excel) | Tabla / Campo en Base de Datos (Sistema) | Notas / Transformación |
| :--- | :--- | :--- |
| `"DISPOSICIÓN DE SEMANAS COTIZADAS?:"` | `processes.semanasDetalle -> { archivoUrl }` o similar | De la pestaña de Semanas Cotizadas. |
| `"BURÓ DE CRÉDITO?"` | `processes.buroCredito -> { completado, detalles }` | |
| `"STATUS DEL CANDIDATO"` | `processes.status` / `dictamenLaboral` | (RECOMENDABLE = "aprobado", NO RECOMENDABLE = "descartado"). |
| `"II. PATRONES EN EL IMSS"` | `processes.semanasDetalle -> { reporteSemanas }` o los historiales dados de alta. | Se extrae la lista de patrones de la constancia. |

---

### 🏢 3. HISTORIAL LABORAL (Entrevistas de Referencias)
*El Excel original destina una página entera a que se comparen empresas y jefes. Todo esto existe estructurado maravillosamente en la tabla de `workHistory` asociada al candidato.*

| Etiqueta Orig. (Excel) | Tabla / Campo en Base de Datos (Sistema) | Notas / Transformación |
| :--- | :--- | :--- |
| `"EMPRESA (NOMBRE COMERCIAL...)"` | `workHistory.empresa` | Es un registro por cada empleo. |
| `"PUESTO INICIAL/ PUESTO FINAL"` | `workHistory.puesto` | |
| `"PERIODO LABORADO CANDIDATO / PERIODO EMPRESA"` | `workHistory.fechaInicio` a `workHistory.fechaFin` | (Lo que declaró el candidato vs empresa). |
| `"TELÉFONO"` | `workHistory.telefonoJefe` | |
| `"JEFE INMEDIATO"` | `workHistory.nombreJefe` + `workHistory.puestoJefe`| |
| `"EVALUACIÓN DEL DESEMPEÑO..."` | `workHistory.investigacionDetalle -> { desempeño }` | Llenado por analista de Sinergia tras llamar. |
| `"MOTIVO DE SEPARACIÓN..."` | `workHistory.investigacionDetalle -> { motivoSalidaConfirmado }` | |
| `"¿CUÁNTAS FALTAS? ¿INCAPACIDADES?"`| `workHistory.investigacionDetalle -> { comentariosAsistencia }`| |
| `"¿DEMANDÓ? CANDIDATO / EMPRESA"` | `workHistory.investigacionDetalle -> { huboDemanda, comentariosLegal }`| |
| `"LO CONSIDERA RECOMENDABLE?"` | `workHistory.investigacionDetalle -> { esRecomendable }` | Booleano que llena analista. |
| `"¿LO RECONTRATARÍA? ¿POR QUÉ?"` | `workHistory.investigacionDetalle -> { loRecontrataria, motivoNoRecontratacion }` | Booleano y string de soporte. |
| `"COMENTARIOS ADICIONALES"` | `workHistory.investigacionDetalle -> { observacionesAdicionales }` | |
