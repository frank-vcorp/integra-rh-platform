# FORMATO MAESTRO UNIFICADO DE INVESTIGACIÓN LABORAL
> **Leyenda de Actores:**
> ✅ **[CANDIDATO]:** Campos que llena el postulante en el formulario inicial (Frontend).
> 🕵️ **[ANALISTA]:** Campos que llena el equipo de validación en el sistema (Backend/Admin).

---

## 0. CONTROL INTERNO
- 🕵️ **STATUS DEL CANDIDATO:** (Select: RECOMENDABLE | CON RESERVAS | NO RECOMENDABLE)
- 🕵️ **FECHA DEL REPORTE:** (Date: Auto)
- 🕵️ **ANALISTA ASIGNADO:** (User ID)

---

## I. DATOS GENERALES (IDENTIFICACIÓN)
*Sección 100% llenada por el candidato.*

- ✅ **NOMBRE DEL CANDIDATO:** (Texto Completo)
- ✅ **PUESTO SOLICITADO:** (Texto)
- ✅ **CEDI / PLAZA:** (Texto o Select)
- ✅ **CIUDAD DE RESIDENCIA:** (Texto)
- ✅ **FECHA DE NACIMIENTO:** (Date)
- ✅ **LUGAR DE NACIMIENTO:** (Texto)
- ✅ **EDAD:** (Numérico - Calculado automático idealmente)
- ✅ **NSS (IMSS):** (Numérico 11 dígitos)
- ✅ **CURP:** (Alfanumérico)
- ✅ **RFC:** (Alfanumérico)
- ✅ **DOMICILIO:** (Calle, Número, Interior)
- ✅ **COLONIA Y MUNICIPIO:** (Texto)
- ✅ **ESTADO:** (Select)
- ✅ **CELULAR:** (Numérico)
- ✅ **TELÉFONO CASA:** (Numérico)
- ✅ **TELÉFONO RECADOS:** (Numérico)
- ✅ **CORREO ELECTRÓNICO:** (Email)

---

## II. ENTORNO SOCIOECONÓMICO Y PERSONAL
*Información declarativa del candidato. El analista solo edita si detecta inconsistencias.*

### Redes Sociales
- ✅ **FACEBOOK:** (¿Cómo apareces?)
- ✅ **INSTAGRAM:** (Usuario)
- ✅ **TWITTER / X:** (Usuario)
- ✅ **TIKTOK:** (Usuario)

### Situación Familiar
- ✅ **ESTADO CIVIL:** (Select: Soltero, Casado, Unión Libre, Divorciado)
- ✅ **FECHA MATRIMONIO/UNIÓN:** (Date - Si aplica)
- ✅ **¿PAREJA DE ACUERDO CON TRABAJO?:** (Boolean: Sí/No)
- ✅ **¿ESPOSA EMBARAZADA?:** (Boolean: Sí/No/No Aplica)
- ✅ **HIJOS:** (Tabla o Texto: Edades)
- ✅ **¿QUIÉN CUIDA A LOS HIJOS?:** (Nombre y Parentesco)
- ✅ **¿DÓNDE VIVEN LOS CUIDADORES?:** (Texto)
- ✅ **PENSIÓN ALIMENTICIA:** (Texto: ¿Da o Recibe?)
- ✅ **VIVIENDA:** (Select: Vive solo, Con Padres, Con Pareja, Con Familiares)

### Datos de Pareja / Noviazgo (Lógica para Solteros)
- ✅ **¿TIENE NOVIO(A)?:** (Boolean)
- ✅ **NOMBRE NOVIO(A):** (Texto)
- ✅ **OCUPACIÓN NOVIO(A):** (Texto)
- ✅ **DOMICILIO NOVIO(A):** (Texto)
- ✅ **¿APOYO ECONÓMICO MUTUO?:** (Texto)
- ✅ **¿NEGOCIO EN CONJUNTO?:** (Boolean)

### Financiero y Antecedentes Personales
- ✅ **¿TIENE DEUDAS?:** (Boolean)
- ✅ **INSTITUCIÓN (DEUDA):** (Texto)
- ✅ **¿BURÓ DE CRÉDITO?:** (Boolean - Declarado)
- ✅ **¿HA SIDO SINDICALIZADO?:** (Texto: Sindicato y Cargo)
- ✅ **¿HA ESTADO AFIANZADO?:** (Texto: Afianzadora)
- ✅ **¿ACCIDENTES VIALES PREVIOS?:** (Texto)
- ✅ **¿ACCIDENTES DE TRABAJO PREVIOS?:** (Texto)

---

## III. INVESTIGACIÓN DOCUMENTAL (SOLO ANALISTA)
*Esta sección es invisible para el candidato.*

- 🕵️ **INVESTIGACIÓN LEGAL:** (Texto Largo: Incidencias legales, demandas, boletines)
- 🕵️ **NOTAS PERIODÍSTICAS:** (Texto Largo: Búsqueda en Google/Medios)
- 🕵️ **OBSERVACIONES IMSS:** (Texto: Disparidad en semanas cotizadas)
- 🕵️ **COTEJO SEMANAS COTIZADAS:** (Archivo Adjunto o Tabla)
- 🕵️ **BURÓ DE CRÉDITO (VALIDADO):** (Texto: Resultado real de la investigación)

---

## IV. HISTORIAL LABORAL (REPETIBLE POR EMPRESA)
*Estructura relacional: Un Candidato tiene N Empleos.*

### A. Datos Declarados (Fuente: ✅ CANDIDATO)
- ✅ **NOMBRE EMPRESA:**
- ✅ **GIRO DE LA EMPRESA:**
- ✅ **DIRECCIÓN:**
- ✅ **TELÉFONO OFICINA:**
- ✅ **PUESTO INICIAL:**
- ✅ **PUESTO FINAL:**
- ✅ **FECHA INICIO (DECLARADA):**
- ✅ **FECHA FIN (DECLARADA):**
- ✅ **SUELDO INICIAL:**
- ✅ **SUELDO FINAL:**
- ✅ **JEFE INMEDIATO (NOMBRE):**
- ✅ **ACTIVIDADES REALIZADAS:**
- ✅ **VEHÍCULO QUE MANEJABA:** (Si aplica)
- ✅ **MOTIVO DE SEPARACIÓN (DECLARADO):**

### B. Validación de Referencias (Fuente: 🕵️ ANALISTA)
*El sistema debe permitir contrastar "Declarado" vs "Validado".*

- 🕵️ **FECHA INICIO (VALIDADA):**
- 🕵️ **FECHA FIN (VALIDADA):**
- 🕵️ **PUESTO (VALIDADO):**
- 🕵️ **MOTIVO DE SEPARACIÓN (REAL):**
- 🕵️ **¿HUBO INCAPACIDADES?:** (Cantidad y Motivo)
- 🕵️ **¿HUBO FALTAS?:** (Cantidad y Motivo)
- 🕵️ **¿DEMANDÓ A LA EMPRESA?:** (Sí/No)

### C. Evaluación Cualitativa (Fuente: 🕵️ ANALISTA - Entrevista con Referencia)
- 🕵️ **EVALUACIÓN DESEMPEÑO:** (Escala: Excelente, Bueno, Regular, Malo)
- 🕵️ **PUNTUALIDAD:** (Texto/Escala)
- 🕵️ **SENTIDO DE COLABORACIÓN:** (Texto)
- 🕵️ **RESPONSABILIDAD:** (Texto)
- 🕵️ **HONRADEZ E INTEGRIDAD:** (Texto)
- 🕵️ **¿CONFLICTIVO?:** (Texto: Explicación)
- 🕵️ **¿LO CONSIDERA RECOMENDABLE?:** (Sí/No/Reservas)
- 🕵️ **¿POR QUÉ?:** (Texto)
- 🕵️ **¿LO RECONTRATARÍA?:** (Sí/No y Causa)

### D. Datos del Informante
- 🕵️ **REFERENCIA OTORGADA POR (JEFE):** (Nombre, Cargo, Teléfono)
- 🕵️ **REFERENCIA OTORGADA POR (RH):** (Nombre, Cargo, Teléfono)
- 🕵️ **COMENTARIOS ADICIONALES DEL ANALISTA:** (Texto libre)

---

## V. CIERRE DEL REPORTE
- 🕵️ **OBSERVACIONES GENERALES:** (Resumen final del analista)
- 🕵️ **CONCLUSIONES:** (Veredicto final)