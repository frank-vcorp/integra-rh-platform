# Checkpoint: Fixes de Email, UI y Diagnóstico WAF Psicométricas

**Fecha:** 16 de diciembre de 2025
**Estado:** Código corregido y desplegado. Operación bloqueada por WAF externo.

## 1. Cambios Realizados

### Backend (`server/`)
- **Corrección de consulta DB (`db.ts`):** Se arregló la normalización de `db.execute` en `getCandidateByPsicoClave`. Antes devolvía una estructura incorrecta (array anidado) que hacía que `candidate.email` fuera `undefined`, provocando errores 500 falsos.
- **Manejo de Errores (`routers/psicometricas.ts`):** Se reemplazaron `throw new Error` por `throw new TRPCError` (BAD_REQUEST/NOT_FOUND) para evitar respuestas 500 genéricas en casos de validación.
- **Integración Psicométricas (`integrations/psicometricas.ts`):**
  - Se agregaron headers estándar (`User-Agent`, `Accept`, `Accept-Language`) a las peticiones salientes para intentar mitigar bloqueos de bots.
  - Se implementó detección de respuestas HTML (Cloudflare Challenges) para lanzar errores descriptivos en lugar de "JSON inválido".
- **Estilos de Correo (`integrations/sendgrid.ts`):** Se forzó el color de texto blanco (`#ffffff !important`) en el botón "Iniciar Evaluación" para garantizar legibilidad en clientes de correo (Gmail/Outlook).

### Frontend (`client/`)
- **Validación UI (`CandidatoDetalle.tsx`):** El botón "Reenviar invitación" ahora verifica si el candidato tiene email antes de llamar a la API, deshabilitándose y mostrando un toast de error si falta el dato.

## 2. Diagnóstico de Bloqueo (WAF)

A pesar de las correcciones de código, las peticiones a la API de Psicométricas (`/agregaCandidato`, `/reenviarInvitacion`) están fallando con **Error 500** en Cloud Run.

- **Causa:** El proveedor (Psicométricas/Cloudflare) está respondiendo con un **Challenge HTML** ("One moment, please...") en lugar de JSON.
- **Evidencia:** Logs de Cloud Run muestran el HTML de espera de Cloudflare.
- **Prueba de Control:** Una petición `curl` desde IP local (residencial) **funciona correctamente** (200 OK), confirmando que no es un problema de credenciales ni de la API en sí, sino un **bloqueo por reputación de IP** hacia el rango de IPs compartidas de Google Cloud Run (`us-central1`).

## 3. Estado del Despliegue

- **API:** Desplegada revisión `api-00046-llk` en `us-central1`.
- **Hosting:** Desplegado en Firebase Hosting.

## 4. Próximos Pasos

1.  **Esperar:** Verificar mañana si el bloqueo de IP era temporal (cuarentena de 24h).
2.  **Mitigación (Si persiste):**
    - **Opción A (Gratis):** Redesplegar el servicio en otra región (ej. `us-east1`) para obtener una nueva IP de salida.
    - **Opción B (Definitiva):** Configurar **Cloud NAT** con IP Estática en GCP y solicitar whitelist al proveedor.

## 5. Resolución (Actualización 16/12/2025)

El bloqueo de IP por parte de Cloudflare fue **temporal**. El servicio se restableció automáticamente sin necesidad de cambios de infraestructura. Las peticiones desde Cloud Run vuelven a funcionar correctamente.

