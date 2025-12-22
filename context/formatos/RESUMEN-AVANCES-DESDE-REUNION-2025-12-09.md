# Resumen de avances desde la reunión del 9 dic 2025

Este documento resume los cambios realizados en Integra RH a partir de la lista de tareas acordada en la reunión del **9 de diciembre de 2025** (Notas de Gemini) y sirve como guía para que el equipo valide el funcionamiento.

---

## 1. Registro de candidatos y procesos

- **Eliminado campo “Descripción de puesto”** en:
  - Flujo completo de registro.
  - Flujos rápidos desde el dashboard.
- **Correcciones en flujo directo** (crear candidato + proceso para cliente existente):
  - Se revisó el error que sacaba a Paola al registrar candidatos.
  - El flujo ahora reutiliza cliente y puesto existentes; solo se capturan los datos realmente necesarios.

**Qué deben revisar las analistas**

- Crear un candidato nuevo desde:
  - Flujo completo.
  - Flujo rápido desde el dashboard.
- Confirmar que:
  - Ya no aparezca el campo “Descripción de puesto”.
  - El alta no marque errores y el proceso quede ligado al cliente y puesto correctos.

---

## 2. Listados, scroll y colores

- **Scroll horizontal corregido**:
  - Se eliminó la barra horizontal interna en Clientes, Candidatos, Procesos, Usuarios, etc.
  - El desplazamiento horizontal lo maneja el navegador, no un “frame” interno.
- **Encabezados alineados**:
  - Columnas revisadas en Procesos (la columna “Puesto” ya no se recorre a otra posición).
  - Columna “Plaza” movida después de “Cliente”.
- **Colores alternados de filas**:
  - Todos los listados tienen franjas alternadas para facilitar lectura.
- **Colores por estatus de proceso**:
  - La fila completa de cada proceso usa color suave según estatus (en recepción, en verificación, en dictamen, finalizado, entregado).

**Qué deben revisar las analistas**

- En **Clientes, Candidatos, Procesos, Usuarios, Encuestadores**:
  - Probar scroll horizontal con muchas columnas.
  - Confirmar que las filas no se salgan del recuadro, y que las cabeceras coinciden con los datos.
  - Verificar que las filas alternan color y que el color por estatus en Procesos se ve claro pero no estorba.

---

## 3. Investigación laboral (formulario interno)

- **Formulario reestructurado en bloques**:
  - *Datos de la empresa*.
  - *Tiempo e incidencias*.
  - *Desempeño y recomendación*.
- **Campos faltantes incorporados** (según formatos y notas):
  - Tiempo informado por la empresa (además de fechas).
  - Motivo de salida por candidato y por empresa.
  - Incapacidades declaradas por candidato y por jefe.
  - Inasistencias/faltas.
  - Antecedentes legales.
- **Compatibilidad con múltiples periodos trabajados**:
  - Se pueden capturar varios periodos (periodo empresa / periodo candidato).
- **Nuevo campo “tiempoTrabajadoEmpresa”**:
  - Cuando solo dan antigüedad aproximada, el sistema guarda ese texto explícitamente.

**Qué deben revisar las analistas**

- Abrir la investigación de un empleo en Historial laboral y confirmar que:
  - Están todos los campos que usan actualmente en la llamada telefónica.
  - Pueden agregar más de un periodo trabajado.
  - Pueden escribir el tiempo aproximado cuando la empresa no da fechas.

---

## 4. Historial laboral: matriz de desempeño y estatus

- **Matriz de desempeño unificada**:
  - Evaluación general, puntualidad, colaboración, responsabilidad, actitud, honradez, calidad, liderazgo, conflictividad.
  - Se calcula automáticamente un **puntaje 0–100** (`desempenoScore`).
- **Etiquetas de estatus** por empleo:
  - `En revisión`, `Revisado`, `Terminado`, con “badge” de color.
- **Origen del registro**:
  - Cada empleo muestra si fue **capturado por CANDIDATO** o por **ANALISTA**.
- **Comparativo “Declarado vs validado”**:
  - Fechas, puesto y motivo de salida: lo que dijo el candidato vs lo que confirmó la empresa.

**Qué deben revisar las analistas**

- En un candidato con historial capturado:
  - Ver la etiqueta de estatus del empleo y el puntaje de desempeño al guardar la investigación.
  - Ver claramente el bloque “Declarado vs validado” con fechas, puesto y motivo de salida.

---

## 5. Self‑service del candidato y perfil unificado

- **Formulario público de pre‑registro** (`/pre-registro/:token`):
  - El candidato llena su información personal desde el celular.
  - Incluye datos de identificación, domicilio, situación familiar, contacto de emergencia, etc. según `campos_unificados.md`.
  - Soporta subida de documentos (INE, comprobante, etc.).
  - Tiene autosalvado y límite de tiempo configurado vía token.
- **Token de auto‑registro de candidato**:
  - Desde el detalle de candidato se genera un enlace único con vigencia (6 horas por defecto).
  - El enlace se puede copiar o enviar por WhatsApp/correo.
- **Perfil unificado en el candidato interno**:
  - Nueva tarjeta **“Perfil extendido del candidato”** con secciones:
    - Generales (puesto solicitado, plaza, ciudad, NSS, CURP, RFC, teléfonos).
    - Domicilio (incluye link a Google Maps).
    - Situación familiar / pareja / financiero / contacto de emergencia.
  - Pequeños puntos verdes indican campos llenados por el candidato.
- **Estatus de captura self‑service**:
  - `pendiente`, `recibido`, `revisado` con acción para marcar **Revisado** por el analista.

**Qué deben revisar las analistas**

- Para un candidato de prueba:
  - Generar enlace de auto‑registro y llenarlo desde un celular.
  - Confirmar que la información aparece en el “Perfil extendido del candidato” y que se marca como **completado por el candidato**.
  - Revisar los datos y marcar la captura como **Revisada**.

---

## 6. Consentimiento de datos personales

- **Enlace de consentimiento** desde ficha de candidato:
  - Botón **“Obtener enlace”** genera URL única con vencimiento.
  - Puede enviarse por correo, WhatsApp o copiarse.
- **Pantalla de consentimiento para candidato**:
  - Muestra el aviso de privacidad.
  - Permite marcar casilla de aceptación y firmar en pantalla.
  - La respuesta queda ligada al candidato con fecha/hora, IP y versión de política.
- **Integración con estado del consentimiento** en la ficha:
  - “Pendiente de envío”, “Otorgado el …”, etc.

**Qué deben revisar las analistas**

- En un candidato sin consentimiento:
  - Usar “Obtener enlace” y probar envío por correo/WhatsApp.
  - Completar el consentimiento como candidato y verificar el cambio de estado en la ficha.

---

## 7. Asignación de analista y seguimiento de procesos

- **Campo “Analista asignado”** en el bloque Información del proceso:
  - Desplegable con usuarios internos.
  - Indicador del número de procesos que ya tiene cada analista.
  - Botón **“Guardar asignación”** dentro del bloque.
- **Roles y permisos (RBAC)**:
  - Definidos roles base: Superadmin, Administrador, Recepción, Analista, Cliente.
  - Pantalla de **Roles y permisos** para crear/editar roles y asignar acciones por módulo (ver, crear, editar, eliminar).
  - Tabla intermedia `user_roles` para asignar varios roles a cada usuario.
- **Proceso visible solo para cliente propietario** en portal cliente.

**Qué deben revisar las analistas**

- Desde un proceso interno:
  - Asignar un analista y guardar.
  - Confirmar que la asignación se refleja en el listado de procesos (columna Responsable) y en la ficha.

---

## 8. Buscador general y mejoras de UX

- **Buscador superior tipo “Google”**:
  - Ahora busca en **clientes, candidatos, procesos, encuestadores** usando nombre, correo, clave, etc.
  - Ajustado el error de JS (“Cannot access 'be' before initialization”). 
- **Botón Salir y menú lateral**:
  - Menú lateral colapsable, siempre visible, adaptado tanto para escritorio como móvil.
  - Botón de salir reubicado para mayor consistencia.

**Qué deben revisar las analistas**

- Probar el buscador con:
  - Nombre de candidato.
  - Nombre de cliente.
  - Clave de proceso.
  - Nombre de encuestador.
  - Confirmar que no hay errores en consola y que los resultados son útiles.

---

## 9. IA en historial laboral (mini‑dictamen por empleo)

- **Mini‑dictamen IA interno por empleo**:
  - Se genera a partir de:
    - Datos del empleo, matriz de desempeño, incidencias y resultado de verificación humano.
  - Se guarda en `workHistory.investigacionDetalle.iaDictamen`.
  - Se muestra dentro de cada empleo como:
    - **“Sugerencia IA (apoyo al analista)”** con:
      - Resumen corto.
      - Fortalezas.
      - Riesgos.
      - Recomendación.
- **Botón dedicado por empleo**:
  - Nuevo botón con ícono de chispas `✦` junto al de la investigación.
  - Genera o regenera el mini‑dictamen IA bajo demanda.
  - Valida que el empleo esté en **estatus Investigación = Terminado** y con dictamen humano distinto de “Pendiente”.

**Qué deben revisar las analistas**

- En un candidato con historial terminado:
  - Dar clic en el botón de IA de un empleo y verificar que aparece la sección de “Sugerencia IA” debajo del bloque “Declarado vs validado”.
  - Probar también qué mensaje aparece si el empleo no está en terminado o le falta dictamen humano.

---

## 10. IA en dictamen general del proceso (cliente)

- **Resumen IA para el cliente** (opcional por cliente):
  - Campo nuevo en `clients`: `iaSuggestionsEnabled` (activado desde pantalla de Clientes).
  - Cuando está activo y el proceso tiene calificación final distinta de “pendiente” y “no recomendable”:
    - Se genera un resumen IA general en `processes.investigacionLaboral.iaDictamenCliente`:
      - `resumenEjecutivoCliente`.
      - `recomendacionesCliente`.
      - `notaInternaAnalista` (solo interna).
      - `dictamenFinal` (copiado del dictamen humano).
- **Portal cliente – Vista de proceso**:
  - Si el cliente tiene IA activada y el proceso es recomendable o con reservas:
    - Aparece un card “Sugerencias de IA sobre este proceso” con:
      - Resumen ejecutivo.
      - Lista de recomendaciones de seguimiento.
    - Nunca se muestra para dictámenes “no recomendables”.
- **Vista interna de proceso**:
  - Debajo de “Calificación final” se muestra la **nota IA para el analista** (campo `notaInternaAnalista`), sólo para usuarios internos.

**Qué deben revisar las analistas / Paula**

- Para un cliente con IA activada:
  - Cerrar un proceso con calificación final “Recomendable” o “Con reservas”.
  - Desde el portal cliente, abrir el detalle de ese proceso y confirmar la presencia del card de IA.
- Desde vista interna de proceso:
  - Ver “Nota IA para el analista” debajo de la calificación final.

---

## 11. Roles, permisos y seguridad

- **Módulo “Roles y permisos”** dentro de Usuarios:
  - Crear roles con nombre y descripción.
  - Asignar permisos por módulo (`clientes`, `candidatos`, `procesos`, `visitas`, `usuarios`, etc.) y acción (`view`, `create`, `edit`, `delete`).
- **Asignación de roles a usuarios**:
  - Tabla `user_roles`; un usuario puede tener más de un rol.
  - Permisos efectivos se calculan a partir de los roles.

**Qué deben revisar las analistas / administración**

- Crear o ajustar algún rol de prueba (por ejemplo, “Recepción”) y verificar que:
  - Sólo ve/edita lo que corresponde al perfil.
  - El cliente no tiene acceso a pantallas internas.

---

## 12. Pendientes principales (no implementados aún)

Estos puntos siguen abiertos o requieren insumos del equipo:

- **Unificación completa de formatos**:
  - Terminar de mapear todos los campos de cada cliente a un formato genérico único (investigación laboral, legal y visita).
  - Diseñar la tarjeta de “Información complementaria” para clientes exigentes.
- **Dashboard**:
  - Definir, por parte de las analistas, qué indicadores y tarjetas necesita Paula ver (por rol): recepción, analistas, encuestadores, administración.
  - Implementar el dashboard una vez definidos los indicadores.
- **Botón “Información revisada para armado”**:
  - Marcar explícitamente cuando el expediente está listo para armado de dictamen para el cliente.

---

## 13. Recomendación de verificación general

Para la revisión con el equipo, se sugiere:

1. Elegir un **candidato nuevo de prueba** y seguir el flujo completo:
   - Alta de cliente/plaza (si aplica) → candidato → proceso.
   - Enviar enlace de self‑service y de consentimiento al candidato.
   - Cargar documentos básicos.
   - Llenar la investigación laboral de al menos un empleo y usar el botón de mini‑dictamen IA.
   - Cerrar el proceso con calificación final y revisar el resumen IA para cliente.

2. Verificar que desde el **portal cliente**:
   - Puedan entrar con el enlace de seguimiento.
   - Vean los procesos, estatus con colores, dictamen final, archivos y, si está activado, el bloque de IA.

3. Anotar cualquier detalle de flujo raro, campo faltante o texto confuso directamente sobre este documento o en un nuevo archivo de notas para la siguiente iteración.

