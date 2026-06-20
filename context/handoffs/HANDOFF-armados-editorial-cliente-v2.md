# HANDOFF: Armados Editoriales Cliente v2

**Fecha:** 2026-04-08  
**Owner:** INTEGRA  
**Implementación:** SOFIA  
**Revisión:** GEMINI  
**ID Owner:** ARCH-20260408-12

---

## Objetivo

Implementar Armados Cliente v2 para que el documento dinámico por secciones deje de salir incompleto o amontonado, use toda la data moderna del expediente, incluya índice navegable, y presente un bloque de ubicación fuerte con mapa clicable y foto principal de fachada.

---

## Decisión Técnica

- El snapshot editorial ya existente sigue siendo la única fuente de verdad.
- La composición canónica debe pasar a HTML-first.
- El PDF publicado debe derivarse de la misma composición HTML revisada por analista.
- El bloque de ubicación debe combinar:
  - `visitaDetalle.ubicacion.mapaCapturaUrl`
  - `visitaDetalle.ubicacion.gps`
  - `visitaDetalle.fotos.fachadaCalle`
  - `visitaDetalle.fotos.fachadaPatio` como fallback

Referencia principal: `/home/frank/proyectos/integra-rh/context/SPECs/SPEC-armados-editorial-proceso-82.md`

---

## Variables de Entorno

| Variable | Descripción | Entorno |
|----------|-------------|---------|
| `GOOGLE_APPLICATION_CREDENTIALS` | Acceso a Storage para borradores/publicados | Server |
| `DATABASE_URL` | Lectura y persistencia de versiones de armado | Server |

**Notas:**
- No introducir nuevas variables de entorno para esta fase.
- No loggear contenido sensible del expediente.

---

## Seguridad

- [x] Endpoint accesible solo para roles internos con permiso de edición de procesos.
- [x] Mantener versionado y publicación controlada existente.
- [x] No exponer borradores al portal cliente.
- [x] No loggear payload completo del snapshot editorial.

---

## Endpoints / Cambios

### TRPC `processes.createLegacyReportDraft`
- Mantener contrato actual de entrada (`id`, `sections`, `snapshot`).
- Cambiar internamente la generación para converger a HTML-first según la SPEC.

### TRPC `processes.publishReportVersion`
- No cambiar contrato público.
- Garantizar que publique la versión renderizada desde el mismo snapshot ya revisado.

### Cambios principales de implementación
- `/home/frank/proyectos/integra-rh/integra-rh-manus/server/utils/armadoHtmlRenderer.ts`
- `/home/frank/proyectos/integra-rh/integra-rh-manus/server/utils/armadoPdfFromHtml.ts`
- `/home/frank/proyectos/integra-rh/integra-rh-manus/server/utils/estudiosocioPdf.ts`
- `/home/frank/proyectos/integra-rh/integra-rh-manus/server/utils/estudiosocioPdf.test.ts`
- `/home/frank/proyectos/integra-rh/integra-rh-manus/server/utils/armadoPdfFromHtml.test.ts`
- Ajustes menores opcionales en `/home/frank/proyectos/integra-rh/integra-rh-manus/client/src/pages/ProcesoDetalle.tsx` si se requiere claridad visual del preview.

---

## UI/UX

- Mostrar componente solo si existen secciones seleccionadas en Armados.
- Estados mínimos:
  - `idle`: sin borrador activo
  - `loading`: generando preview/PDF
  - `error`: fallo de render o almacenamiento
  - `success`: borrador generado / publicado
- Al completar:
  - El preview HTML debe reflejar exactamente lo que se publicará.
  - El PDF publicado debe abrir con índice clicable y mapa navegable.

### Reglas visuales obligatorias

1. Índice visible y navegable.
2. Portada con anchor válido.
3. Bloque hero de ubicación:
   - mapa grande arriba,
   - línea de apoyo con dirección/GPS,
   - foto de fachada principal debajo.
4. Evidencias visuales en spreads de media página, no en mini-grid de 220 px.

---

## Criterios de Aceptación

- [ ] CA-01: El proceso 82 renderiza completo sin huecos por mapeos legacy rotos.
- [ ] CA-02: El índice navega correctamente a portada, resumen y secciones activas.
- [ ] CA-03: El PDF publicado conserva clicabilidad en índice y enlace a Google Maps.
- [ ] CA-04: La visita domiciliaria muestra mapa grande y fachada principal debajo usando `fachadaCalle` preferentemente.
- [ ] CA-05: El preview HTML y el PDF final tienen la misma narrativa y orden.
- [ ] CA-06: Las pruebas del renderer y del flujo HTML-first pasan sin errores nuevos.

---

## Ejecución por Micro-Sprints

### Fase 1
- `/home/frank/proyectos/integra-rh/context/micro-sprints/MS-2026-04-08-armados-v2-fase-1.md`

### Fase 2
- `/home/frank/proyectos/integra-rh/context/micro-sprints/MS-2026-04-08-armados-v2-fase-2.md`

---

## Instrucción Operativa para SOFIA

Implementa estrictamente contra la SPEC y estos micro-sprints. Usa `qodo self-review` antes de cerrar. No cambies seguridad ni contratos públicos salvo que sea estrictamente necesario para converger al flujo HTML-first. Si encuentras una ambigüedad de datos, prioriza la key moderna y deja fallback legacy centralizado.

---

## Fase 2 (posterior)

- QA visual con GEMINI sobre muestras cliente reales.
- Ajustes finos de composición editorial por tipo de proceso si se detectan variantes recurrentes.