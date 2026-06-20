# SPEC ARCH-20260520-06

## Titulo
Pipeline de deploy por push con cobertura explicita de Firebase Functions heredadas

## Contexto
- El estado real verificado en [cloudbuild.yaml](../../cloudbuild.yaml) despliega Cloud Run `api` y Firebase Hosting.
- El backlog/documentacion operativa describe un pipeline que tambien publica Firebase Functions, pero esa parte hoy no esta alineada con la configuracion real.
- Siguen existiendo funciones heredadas activas para flujos puntuales, por lo que dejar Functions fuera del push mantiene riesgo de drift entre backend moderno y endpoints legacy.

## Problema
Un `git push` a `master` no garantiza hoy la publicacion de Firebase Functions heredadas. Eso obliga a deploy manual, rompe la expectativa operativa del equipo y deja una inconsistencia entre documentacion y runtime.

## Objetivo
Asegurar que el pipeline disparado por push a `master` publique en una sola ejecucion:
- Cloud Run `api`
- Firebase Hosting
- Firebase Functions heredadas requeridas por rewrites o integraciones activas

## Alcance
- Ajustar el paso final de [cloudbuild.yaml](../../cloudbuild.yaml) para incluir Functions en el deploy automatico.
- Validar que la service account usada por Cloud Build tenga permisos suficientes sobre Firebase Functions y recursos asociados.
- Actualizar la documentacion operativa que hoy refleja un estado distinto al pipeline real.

## No Alcance
- Migrar Functions heredadas a Cloud Run.
- Redisenar triggers de GitHub o dividir el pipeline por ambientes.
- Cambiar logica de negocio de las funciones.

## Archivos Esperados
- [cloudbuild.yaml](../../cloudbuild.yaml)
- [PROYECTO.md](../../PROYECTO.md)
- Checkpoint o dictamen de entrega en `context/checkpoints/`

## Criterios de Aceptacion
1. El paso de Firebase en [cloudbuild.yaml](../../cloudbuild.yaml) ejecuta deploy automatico de Hosting y Functions dentro del pipeline del push.
2. Un build manual o automatico del trigger de `master` finaliza en estado `SUCCESS` sin requerir pasos manuales posteriores para publicar Functions.
3. La salida del deploy muestra publicacion correcta de Hosting y Functions, o en su defecto evidencia clara de permisos faltantes para corregir IAM.
4. La documentacion operativa deja de contradecir la configuracion real del pipeline.
5. Se genera checkpoint con evidencia del build usado para validacion.

## Riesgos y Controles
- Riesgo: permisos insuficientes de la service account de Cloud Build para publicar Functions.
  - Control: validar IAM antes o durante la primera corrida y documentar cualquier permiso faltante.
- Riesgo: el deploy de Functions aumente el tiempo total del pipeline.
  - Control: medir tiempo final del build y registrar impacto.
- Riesgo: fallas en Functions bloqueen despliegues de Hosting/API.
  - Control: decidir explicitamente si el pipeline debe fallar completo o separar la etapa en una fase posterior; por defecto, fallar completo para evitar estados inconsistentes.

## Handoff a SOFIA
Implementar el ajuste minimo en [cloudbuild.yaml](../../cloudbuild.yaml), validar con una corrida del pipeline sobre `master` y registrar checkpoint con evidencia del build y de las Functions publicadas.