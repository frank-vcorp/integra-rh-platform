# Escenario de prueba UX/E2E para Integra RH (agente externo)

Este documento define un flujo completo para que un agente (por ejemplo, Comet u otra herramienta similar) navegue Integra RH como **analista** y **candidato**, capture datos demo rastreables y entregue hallazgos de UX.

## 0. Datos base

- URL principal del sistema: `https://integra-rh.web.app`
- Rol interno con el que debe entrar: **Analista / Admin**
  - Usuario / correo y contraseña: los definirá Frank para este escenario (por ejemplo un usuario específico de pruebas).
- Nombre del cliente demo: **SINERGIA RH DEMO – CASINO SKAMPA**
- Plaza demo principal: **CASINO SKAMPA – SUCURSAL CENTRO**
- Puesto demo: **Cajero de salón de juegos**

**Candidato demo** (usar siempre estos datos o variaciones consistentes):

- Nombre completo: **MARIO ALBERTO SANDOVAL LUNA**
- Email: `mario.sandoval.demo+integra@example.com`
- Teléfono celular: `5512345678`
- Medio de recepción: **WhatsApp**
- Ciudad de residencia: **Guadalajara, Jalisco**
- RFC demo: `SAML900101XXX`
- CURP demo: `SAML900101HDFNNR09`
- NSS demo: `98765432101`

## 1. Objetivo general

Ejecutar un flujo **completo** de evaluación para este candidato, incluyendo:

1. Alta de cliente, plaza y puesto.
2. Alta de candidato y proceso.
3. Envío y uso del enlace self‑service para pre‑llenado del candidato.
4. Aceptación de manejo de datos / consentimiento.
5. Captura de historial laboral completo (varios empleos) + investigación laboral extendida.
6. Generación de mini‑dictámenes por historial con IA.
7. Generación de dictamen general del proceso y vista cliente con IA (si está habilitada).
8. Uso de links externos (mapa, documentos) y subida de al menos un archivo demo.

Mientras se ejecuta el flujo, el agente debe registrar todo lo que observe sobre UX / claridad de flujo.

## 2. Flujo paso a paso (rol ANALISTA / interno)

1. **Iniciar sesión**
   - Entrar a `https://integra-rh.web.app`.
   - Autenticarse con el usuario interno de pruebas que proporcione Frank.
   - Verificar que se llega al Dashboard principal.

2. **Crear cliente demo**
   - Ir al módulo **Clientes**.
   - Crear un nuevo cliente con:
     - Empresa: `SINERGIA RH DEMO – CASINO SKAMPA`
     - Contacto: `Gerardo Lugo Demo`
     - Teléfono: `5599988877`
     - Email: `contacto.casino.demo@example.com`
   - Si existe opción de IA para el cliente, dejarla **habilitada**.

3. **Crear plaza / CEDI demo (clientSite)**
   - Desde el detalle del cliente, abrir la gestión de plazas / sucursales.
   - Crear una plaza:
     - Nombre de plaza: `CASINO SKAMPA – SUCURSAL CENTRO`
     - Ciudad: `Guadalajara`
     - Estado: `Jalisco`

4. **Crear puesto demo**
   - Ir a **Puestos** (o desde el cliente si hay acceso rápido).
   - Crear el puesto:
     - Nombre del puesto: `Cajero de salón de juegos`
     - Asociar el puesto al cliente `SINERGIA RH DEMO – CASINO SKAMPA`.

5. **Crear candidato demo (captura inicial por analista)**
   - Ir a **Candidatos** → **Nuevo candidato**.
   - Capturar los datos del candidato demo:
     - Nombre completo, email, teléfono, medio de recepción.
     - Cliente y puesto: usar el cliente demo y el puesto recién creado.
   - Guardar y entrar al detalle del candidato.

6. **Crear proceso para el candidato**
   - Desde el candidato, crear un **nuevo proceso**:
     - Tipo de producto: por ejemplo `ILA` (investigación laboral).
     - Cliente y plaza: cliente demo y `CASINO SKAMPA – SUCURSAL CENTRO`.
   - Asignar un **Analista** al proceso (el usuario de pruebas) y cambiar estatus a “En dictamen” o “En investigación”, según opciones disponibles.

7. **Generar enlace self‑service para el candidato**
   - En el detalle del candidato, ubicar la sección **Captura inicial del candidato** o similar.
   - Generar el enlace de self‑service / pre‑registro.
   - Copiar la URL generada para usarla en una pestaña nueva (rol candidato).

## 3. Flujo SELF‑SERVICE (rol CANDIDATO)

8. **Abrir enlace self‑service**
   - Abrir el enlace copiado en una nueva pestaña, sin sesión interna.
   - Completar todos los campos posibles usando los datos demo y criterio razonable, incluyendo:
     - Datos generales: fecha y lugar de nacimiento, CURP, RFC, teléfonos secundarios.
     - Domicilio completo: calle, número, colonia, municipio, estado, CP.
     - Contacto de emergencia: nombre, parentesco, teléfono.
     - Redes sociales: enlaces o usuarios demo (Facebook, Instagram, Twitter/X, TikTok).
     - Situación familiar y económica: estado civil, hijos, vivienda, deudas, etc.
     - Link de mapa: añadir un enlace real de Google Maps a un domicilio en Guadalajara.
   - Verificar mensajes de validación y campos obligatorios.

9. **Historial laboral capturado por el candidato**
   - Registrar al menos **3 empleos** previos:
     1. Empleo A: 2–3 años, salida normal.
     2. Empleo B: 6–8 meses, salida por cierre de empresa.
     3. Empleo C: empleo actual (marcarlo como actual).
   - Para cada empleo capturar empresa, puesto, periodo, tiempos, motivos de salida, sueldo aproximado y horario.

10. **Consentimiento / manejo de datos**
    - Aceptar el aviso de privacidad o términos que muestre la página.
    - Si se solicita firma manuscrita, realizarla sobre la pantalla.
    - Verificar que aparezca mensaje de confirmación al finalizar.

11. **Subida de documentos y links externos**
    - Si el self‑service permite subida de archivos (INE, comprobante de domicilio, CV, etc.), subir al menos un archivo demo pequeño (texto o imagen).

## 4. De vuelta al ANALISTA

12. **Revisar captura del candidato**
    - Regresar a la pestaña del sistema interno y abrir el detalle del candidato.
    - Revisar la sección **Captura inicial del candidato** y el **Perfil extendido**.
    - Confirmar que los campos llenados por el candidato se distinguen visualmente (etiquetas, color, icono).
    - Marcar el perfil como **revisado** si existe un botón u opción para ello.

13. **Historial laboral – investigación telefónica extendida**
    - En el historial laboral, seleccionar uno de los empleos y abrir el modal de **Investigación laboral**.
    - Completar cada bloque:
      - Datos de la empresa (giro, contacto, dirección, teléfono).
      - Perfil del puesto (posición inicial/final, jefe, principales actividades, recursos asignados, horario).
      - Tiempo e incidencias (fechas, antigüedad, motivo de salida empresa vs candidato, incapacidades, inasistencias, antecedentes legales).
      - Matriz de desempeño (evaluación general, puntualidad, colaboración, responsabilidad, etc., incluida conflictividad con comentario).
      - Conclusión e informante (nombre, cargo, teléfono, email, comentarios adicionales).
    - Adjuntar, si es posible, un documento que represente el cotejo de semanas IMSS.

14. **Mini‑dictamen IA por empleo**
    - Cambiar el estatus de ese empleo a “Terminado” y el resultado de verificación a `recomendable` o `con_reservas`.
    - Usar el botón de **generar mini‑dictamen IA** (si existe).
    - Verificar que aparezca un bloque con:
      - Resumen corto.
      - Fortalezas.
      - Riesgos.
      - Sugerencias de seguimiento.

15. **Dictamen general del proceso + IA para cliente**
    - En la vista del proceso:
      - Completar en lo posible investigación legal, buró y visita (con textos demo).
      - Asignar una calificación final (por ejemplo `RECOMENDABLE`).
    - Generar el dictamen general del proceso (si hay botón) y guardar.
    - Entrar a la vista del proceso desde el portal de cliente (si aplica) y revisar el bloque de **Sugerencias de IA para el cliente**:
      - Confirmar que exista texto de IA solo si el cliente tiene la opción habilitada.

## 5. Qué debe analizar y reportar el agente

Durante todo el flujo, el agente debe anotar y al final reportar:

- Problemas de UX / flujo:
  - Campos o pasos confusos.
  - Momentos en que no queda claro si la información se guardó.
  - Botones importantes poco visibles o lejos del foco natural.
  - Scrolls internos raros (horizontal/vertical) o tarjetas demasiado largas.
- Oportunidades de mejora:
  - Mensajes más claros (microcopy).
  - Agrupación más lógica de campos o bloques.
  - Lugares donde un tooltip de ayuda sería útil.
- Evaluación específica de:
  - Claridad del self‑service para el candidato (idealmente probar también en móvil).
  - Claridad para el analista de qué llenó el candidato vs qué llenó el analista.
  - Uso de IA como apoyo (que no confunda con el dictamen final).

**Formato de reporte sugerido:**

- Lista numerada de problemas (1 = más grave).
- Para cada problema:
  - Pantalla / módulo.
  - Descripción clara del problema.
  - Por qué afecta (error, fricción, riesgo).
  - Propuesta concreta de mejora.

