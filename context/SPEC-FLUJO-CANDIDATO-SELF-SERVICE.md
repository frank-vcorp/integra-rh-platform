# SPEC – Flujo Self‑Service de Candidato

Este documento define el flujo donde el candidato captura sus propios datos (perfil personal, domicilios y empleos), acepta el aviso de privacidad y el sistema integra esa información al expediente, minimizando la captura manual del analista y conservando trazabilidad completa.

Se basa en la estructura maestra de `context/formatos/campos_unificados.md`.

---

## 1. Objetivos

- Que el candidato capture desde su teléfono la mayor parte de la información necesaria:
  - Datos personales y de contacto.
  - Domicilio y entorno básico.
  - Historial de empleos (lado “declarado por candidato”).
  - Subida opcional de documentos.
  - Aceptación del aviso de privacidad / manejo de datos.
- Reducir al mínimo la captura manual por parte del equipo de Paula.
- Mantener trazabilidad clara de:
  - Qué capturó el candidato vs qué capturó/verificó el analista.
  - Quién revisó y cuándo se revisó la captura del candidato.
  - Cambios posteriores (historial de cambios).
- Evitar retrabajos: todo lo que capture el candidato se reutiliza directamente en los módulos internos (candidato, historial laboral, investigación).

No son objetivos en esta primera etapa:

- Implementar edición avanzada por parte del candidato después de enviar (solo podrá completar mientras el enlace esté vigente).
- Manejo multi‑idioma (el flujo será en español).

---

## 2. Cambios de modelo de datos

### 2.1. Tabla `candidates`

Campos nuevos propuestos:

- `selfFilledStatus` – `ENUM('pendiente','recibido','revisado')` (por defecto `'pendiente'`).
- `selfFilledAt` – `TIMESTAMP NULL` – Fecha/hora en que el candidato terminó y envió su captura inicial.
- `selfFilledReviewedBy` – `INT NULL` – `users.id` del analista que revisó la captura del candidato.
- `selfFilledReviewedAt` – `TIMESTAMP NULL` – Fecha/hora de esa revisión.

Uso:

- `pendiente`: nunca ha hecho captura self‑service.
- `recibido`: el candidato envió su formulario (aunque el analista aún no lo revisa).
- `revisado`: el analista marcó la captura como revisada.

### 2.2. Tabla `workHistory`

Campo nuevo:

- `capturadoPor` – `ENUM('candidato','analista')` – indica el origen de ese registro de empleo.
  - Empleos capturados desde el formulario público: `"candidato"`.
  - Empleos capturados desde la UI interna: `"analista"`.

`investigacionDetalle` se mantiene como JSON, pero se usará para separar:

- Sub‑secciones declaradas por el candidato (referencia conceptual a la sección IV.A de `campos_unificados.md`).
- Sub‑secciones verificadas por el analista (IV.B, IV.C, IV.D).

### 2.3. Tokens de acceso self‑service

Nueva tabla (o reutilizar infraestructura de tokens tipo `clientAccessTokens` con distinto `tipo`):

- Tabla sugerida: `candidateSelfTokens`
  - `id` – PK.
  - `candidateId` – FK a `candidates.id`.
  - `token` – string aleatorio seguro.
  - `expiresAt` – `TIMESTAMP` (por defecto `NOW() + INTERVAL 6 HOUR`).
  - `createdAt` / `updatedAt` – timestamps.
  - `usedAt` – `TIMESTAMP NULL` – última vez que se recibió un “submit” exitoso.
  - `revoked` – `BOOLEAN` – para invalidar enlaces antes de tiempo si es necesario.

Restricciones:

- Un candidato puede tener varios tokens históricos, pero solo uno activo a la vez para captura (`revoked = false` y `expiresAt > NOW()`).

### 2.4. Audit log (historial de cambios)

Reutilizar `audit_logs` con convenciones adicionales:

- `entityType`: `"candidate" | "workHistory" | "candidate_self_capture"`.
- `entityId`: `candidates.id` o `workHistory.id` según corresponda.
- `actorType`: `"user" | "system" | "candidate"` (puede ir en `details` si no añadimos columna).
- `action`: `"create" | "update" | "autosave" | "review" | "consent_given"`.
- `details` (JSON):
  - `changes`: objeto `{ campo: { before, after } }` solo para campos que cambiaron.
  - `tokenId` (si viene de self‑service).

---

## 3. Flujo público del candidato

### 3.1. Generación del enlace

Desde `CandidatoDetalle` (UI interna):

- Botón: **“Generar enlace de pre‑registro”** (o reutilizar el de consentimiento actual, pero con texto actualizado).
- Acciones backend:
  1. Crear un registro en `candidateSelfTokens` con `expiresAt = NOW() + 6 horas`.
  2. Devolver URL pública: `https://integra-rh.web.app/pre-registro/:token` (dominio actual).
  3. (Opcional) Invalidar tokens anteriores para ese candidato (`revoked = true`).

El analista puede copiar el enlace o enviarlo por email/WhatsApp como hoy se hace con el consentimiento.

### 3.2. Página pública `/pre-registro/:token`

Al cargar la página:

1. El frontend llama a `candidateSelf.getByToken(token)`.
2. El backend valida:
   - Que el token exista.
   - Que no esté `revoked`.
   - Que `expiresAt > NOW()`.
3. Si es inválido/expirado → mostrar pantalla de error:
   - Mensaje claro (“Este enlace ha expirado”) y recomendación de contactarse con Integra RH.
4. Si es válido → devolver:
   - Datos actuales del candidato (`candidates`).
   - Empleos actuales (`workHistory` con `capturadoPor = "candidato"` preferentemente).
   - `expiresAt` para la cuenta regresiva.

### 3.3. Estructura de pasos (wizard móvil)

Pensado para celular, con pasos tipo “1 de 5”:

1. **Datos personales básicos** (corresponde a secciones I y II simplificadas de `campos_unificados.md`):
   - Nombre completo (solo lectura si ya está capturado).
   - Puesto solicitado (texto o select si viene del proceso).
   - Plaza (CEDI) asociada (solo lectura si ya está).
   - Fecha de nacimiento, CURP, RFC, NSS.
   - Teléfono celular, teléfono recados, email.
2. **Domicilio y entorno básico**:
   - Calle, número, colonia, municipio, estado, CP.
   - Estado civil, hijos/edades, contacto de emergencia (nombre, teléfono, parentesco).
3. **Historial laboral**:
   - Lista de empleos declarados por el candidato con botón `Editar` y `+ Agregar empleo`.
   - Para cada empleo (campos de sección IV.A):
     - Empresa, giro, dirección, teléfono oficina.
     - Puesto inicial/final.
     - Fechas inicio/fin (declaradas) y campo adicional `Tiempo trabajado` por si solo sabe la duración.
     - Sueldo inicial/final (opcional).
     - Jefe inmediato y teléfono.
     - Actividades principales.
     - Vehículo que manejaba (si aplica).
     - Motivo de separación (declarado).
4. **Documentos opcionales**:
   - Subida de archivos (INE, comprobante de domicilio, CV, etc.).
   - UI muy simple: tipo de documento + archivo.
5. **Aviso de privacidad y consentimiento**:
   - Mostrar el texto del aviso de privacidad / manejo de datos.
   - Casilla “He leído y acepto el aviso de privacidad”.
   - Campo de firma:
     - Mínimo: caja de texto donde escriba su nombre completo a modo de firma.
     - Opcional futuro: firma dibujada (canvas).
   - Botón **“Enviar”**.

### 3.4. Comportamiento del envío final

Al pulsar **Enviar**:

- Validar que:
  - Campos obligatorios mínimos estén completos (teléfono, email, al menos un empleo, consentimiento marcado).
  - El token siga vigente (`expiresAt > NOW()`).
- Backend:
  1. Actualizar `candidates` con los datos capturados en pasos 1 y 2.
  2. Crear/actualizar registros en `workHistory` para los empleos que venga del candidato, con `capturadoPor = "candidato"`.
  3. Subir y asociar documentos.
  4. Crear/actualizar registro en `candidate_consents` marcando `is_given = true`, `givenAt = NOW()`, `privacy_policy_version` actual.
  5. Actualizar `candidate.selfFilledStatus = 'recibido'` y `selfFilledAt = NOW()`.
  6. Registrar en `candidateSelfTokens.usedAt = NOW()`.
  7. Registrar entrada en `audit_logs` (`entityType = "candidate_self_capture"`, `action = "submit"`).
  8. Insertar un comentario interno automático en el proceso más reciente del candidato (si existe):
     - Texto sugerido: “El candidato completó el formulario de datos iniciales el [fecha/hora].”

Frontend:

- Mostrar pantalla de agradecimiento (“Tus datos se han enviado correctamente”) y mensaje de que el equipo revisará la información.

---

## 4. Autoguardado (autosave)

### 4.1. Comportamiento general

- Cada vez que el candidato cambia de bloque o cada X segundos de inactividad (ej. 10–15 segundos después de escribir) se dispara un autosave.
- El autosave:
  - Envía solo los campos modificados y el `token`.
  - Actualiza datos en `candidates` y/o `workHistory` sin cambiar `selfFilledStatus` (se mantiene `pendiente` hasta que envíe).

### 4.2. Endpoint sugerido

- `candidateSelf.autosave(token, payload)`:
  - Valida vigencia del token.
  - Aplica parches a:
    - `candidates` (datos personales y domicilio).
    - `workHistory` (empleos con una clave temporal o ID si ya existen).
  - Registra en `audit_logs`:
    - `entityType`: `"candidate"` o `"workHistory"`.
    - `action`: `"autosave"`.
    - `details.changes`: solo campos que cambiaron.

Esto permite recuperar el formulario si el candidato cierra la ventana y vuelve a entrar mientras el enlace siga vigente.

---

## 5. Caducidad del enlace y cuenta regresiva

### 5.1. Caducidad (6 horas)

- Al crear el token se fija `expiresAt = NOW() + INTERVAL 6 HOUR`.
- Todos los endpoints self‑service validan `NOW() < expiresAt` y `!revoked`.
- Si se intenta autosave o submit con el token expirado:
  - Responder error de “enlace expirado”.
  - El frontend muestra un mensaje amigable y bloquea el formulario.

### 5.2. Reloj de cuenta regresiva

En la UI pública:

- Se muestra un indicador en la parte superior del formulario:
  - “Tienes X horas Y minutos para completar tu registro.”
- Cálculo:
  - Tiempo restante = `expiresAt` (servidor) − `now` (cliente).
  - Actualizado con un `setInterval` cada 30–60 segundos (no hace falta precisión de segundos).
- Cuando el tiempo llega a 0:
  - Se deshabilitan los botones de navegación/envío.
  - Se muestra mensaje de enlace expirado.

---

## 6. Flujo interno del analista

### 6.1. Indicadores en `CandidatoDetalle`

- En el encabezado, junto al nombre del candidato:
  - Badge: `Captura inicial: Pendiente / Completada por candidato / Revisada`.
  - Se basa en `selfFilledStatus`.

- En la tarjeta de “Información General” o en una nueva sección “Captura inicial”:
  - Mostrar resumen: fecha de envío (`selfFilledAt`), quién revisó (`selfFilledReviewedBy`).
  - Botón **“Marcar captura como revisada”**:
    - Solo visible para usuarios con permiso adecuado.
    - Al hacer clic:
      - Actualizar `selfFilledStatus = 'revisado'`.
      - `selfFilledReviewedBy = user.id`, `selfFilledReviewedAt = NOW()`.
      - Registrar en `audit_logs` (`action = "review"`).

### 6.2. Historial laboral

- En la lista de `workHistory` del candidato:
  - Mostrar etiqueta pequeña (badge) en cada empleo:
    - “Capturado por CANDIDATO” o “Capturado por ANALISTA” según `capturadoPor`.
  - La investigación laboral detallada (bloques) se sigue capturando desde el modal interno, aprovechando los datos base que el candidato ya proporcionó (empresa, fechas, motivos declarados).

### 6.3. Historial de cambios visible

Opcional pero recomendado:

- En `CandidatoDetalle`, sección colapsable “Historial de cambios”:
  - Lista con:
    - Fecha/hora.
    - Actor (Candidato / Analista + nombre).
    - Resumen del cambio (“Actualizó domicilio”, “Agregó empleo X”, “Modificó motivo de salida en empleo X”, “Marcó captura como revisada”).
  - Detalle ampliado muestra `before/after` por campo (utilizando `audit_logs.details.changes`).

---

## 7. Integración con consentimiento de datos

- El formulario público ya incluye el paso de aceptación de aviso de privacidad.
- Al enviar:
  - Se usa el mismo backend actual de `candidate_consents` con estos parámetros:
    - `candidateId`.
    - `token` de consentimiento (interno, no visible).
    - `privacy_policy_version` actual.
    - `ip_address`, `user_agent` (si están disponibles).
    - `signature_storage_path` (si en el futuro guardamos firma como imagen).
  - Se considera **consentimiento válido** para el resto del sistema (no hace falta un enlace separado).

En `CandidatoDetalle` la tarjeta de “Consentimiento de datos”:

- Muestra el estado proveniente de `candidate_consents`.
- Puede incluir una nota “Aceptado vía formulario self‑service” si el registro viene de este flujo (por ejemplo, usando un campo `source` en la tabla o en `details` de audit).

---

## 8. Permisos y seguridad

- Solo usuarios internos con permisos de `candidatos:create` / `candidatos:edit` pueden generar enlaces de self‑service.
- El formulario público:
  - No requiere autenticación explícita, pero depende del token seguro.
  - Solo permite operar sobre el `candidateId` vinculado al token.
- Todos los accesos se auditan en `audit_logs` con `actorType = "candidate"` para diagnósticos futuros.

---

## 9. Resumen de impacto

**Tablas afectadas:**

- `candidates`: +4 campos (`selfFilledStatus`, `selfFilledAt`, `selfFilledReviewedBy`, `selfFilledReviewedAt`).
- `workHistory`: +1 campo (`capturadoPor`), uso más estructurado de `investigacionDetalle`.
- `candidateSelfTokens` (nueva) o reutilización de `clientAccessTokens` con tipo distinto.
- `candidate_consents`: se reutiliza, sin cambios estructurales.
- `audit_logs`: mismo esquema, con nuevas convenciones para `entityType`, `action` y `details.changes`.

**Frontend afectado:**

- Nueva página pública `/pre-registro/:token` (wizard móvil).
- `CandidatoDetalle`: nuevos badges/etiquetas, botón de “Marcar captura como revisada”, indicador de origen de cada empleo, historial de cambios (si se implementa).
- Ajustes menores en la tarjeta de consentimiento para reflejar que el consentimiento puede venir del flujo self‑service.

Con esto, el flujo de captura self‑service queda completamente especificado y alineado con el formato maestro de investigación laboral, evitando retrabajos y preservando trazabilidad.

