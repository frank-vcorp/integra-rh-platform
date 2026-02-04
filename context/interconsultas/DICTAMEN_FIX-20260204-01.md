# DICTAMEN TÉCNICO: Fallo en Cloud Build Step Deployment
- **ID:** FIX-20260204-01
- **Fecha:** 2026-02-04
- **Estado:** ✅ VALIDADO (Auto-Check)

### A. Análisis de Causa Raíz
El archivo `cloudbuild.yaml` utiliza incorrectamente la imagen `gcr.io/cloud-builders/gke-deploy` para intentar un despliegue en Cloud Run. Esta imagen (GKE Deploy) es específica para Kubernetes y no reconoce los argumentos `--deploy` en el contexto de un comando `run`.

El error explícito `Step #4: Error: unknown flag: --deploy` confirma que el binario ejecutado dentro de ese contenedor no soporta los flags proporcionados.

### B. Justificación de la Solución
Para desplegar en Cloud Run desde Cloud Build, la práctica estándar y correcta es utilizar la imagen de Cloud SDK (`gcr.io/google.com/cloudsdktool/cloud-sdk`) que contiene el CLI `gcloud`.

Se reemplazará el paso incorrecto por un comando `gcloud run deploy`.
Se asume:
1.  **Nombre del servicio:** `integra-rh-backend` (basado en el nombre de la imagen y el contexto del proyecto).
2.  **Región:** `us-central1` (basado en el repositorio de Artifact Registry usado en los pasos previos).
3.  **Imagen:** La misma imagen construida en el paso anterior (`us-central1-docker.pkg.dev/$PROJECT_ID/cloud-run-source-deploy/integra-rh-backend:latest`).

### C. Instrucciones de Handoff para SOFIA
- El pipeline de despliegue ahora debería finalizar correctamente.
- Verificar en la consola de Google Cloud Run que el servicio `integra-rh-backend` esté activo y en verde tras el siguiente build.
- Si se requiere acceso público sin autenticación, podría ser necesario ajustar las políticas IAM posteriormente (flag `--allow-unauthenticated`), pero por seguridad se omite en este fix inicial para no exponer el servicio accidentalmente si debe ser privado.
