# DICTAMEN TÉCNICO: VisitCapturePanel — miniaturas vs formulario estructurado
- **ID:** FIX-20260323-03
- **Fecha:** 2026-03-23
- **Solicitante:** SOFIA
- **Estado:** ✅ VALIDADO

### A. Análisis de Causa Raíz

#### 1. Miniaturas en Vista: probable problema de despliegue, no del código actual
- En el código fuente actual de [integra-rh-manus/client/src/components/VisitCapturePanel.tsx](/home/frank/proyectos/integra-rh/integra-rh-manus/client/src/components/VisitCapturePanel.tsx#L148) ya existe la detección de imágenes (`isImageSrc`) y la miniatura clicable (`ImageThumbnail`).
- La pestaña Vista renderiza todos los nodos usando `renderNode(..., handleImageClick)`, por lo que las URLs de imagen compatibles deberían mostrarse como miniaturas y no como texto en [integra-rh-manus/client/src/components/VisitCapturePanel.tsx](/home/frank/proyectos/integra-rh/integra-rh-manus/client/src/components/VisitCapturePanel.tsx#L520).
- El artefacto compilado local que sirve Hosting también contiene esa lógica y los textos `Ampliar:` y `Editor estructurado`, lo que confirma que el `dist/public` actual ya incluye esta versión del componente.
- Firebase Hosting publica desde [firebase.json](/home/frank/proyectos/integra-rh/firebase.json#L16), específicamente `integra-rh-manus/dist/public`.
- Los scripts rápidos disponibles en [deploy.sh](/home/frank/proyectos/integra-rh/deploy.sh) y [deploy-functions.sh](/home/frank/proyectos/integra-rh/deploy-functions.sh#L72) están orientados a funciones y no garantizan rebuild ni deploy de Hosting.

**Conclusión forense:** si en producción todavía se ven URLs en lugar de miniaturas, la causa más probable es **Hosting sirviendo un dist viejo o un deploy que no incluyó rebuild/deploy de Hosting**. Con la evidencia actual, **no parece un bug del código fuente vigente**.

**Reserva técnica:** el detector actual reconoce imágenes por `data:image/...` o por extensión en la URL. Si las URLs reales de producción no incluyen extensión visible, podría haber un caso residual de código. No encontré evidencia local que apunte a eso como causa principal.

#### 2. Formulario incompleto: problema real de cobertura parcial del editor estructurado
- El estado `structuredDraft` solo inicializa un subconjunto del payload: `ubicacion`, `academica`, `inmueble`, `salud`, `conclusion`, `comentarios` y `cierre` en [integra-rh-manus/client/src/components/VisitCapturePanel.tsx](/home/frank/proyectos/integra-rh/integra-rh-manus/client/src/components/VisitCapturePanel.tsx#L420).
- La pestaña Formulario solo renderiza esas secciones en [integra-rh-manus/client/src/components/VisitCapturePanel.tsx](/home/frank/proyectos/integra-rh/integra-rh-manus/client/src/components/VisitCapturePanel.tsx#L526).
- El propio componente admite explícitamente que `familiares`, `referencias`, `ingresos/egresos detallados` y `listas complejas` quedan relegados a JSON en [integra-rh-manus/client/src/components/VisitCapturePanel.tsx](/home/frank/proyectos/integra-rh/integra-rh-manus/client/src/components/VisitCapturePanel.tsx#L687).
- El shape real de `visitaDetalle` es bastante más amplio; está reflejado, por ejemplo, en el render del PDF y sus pruebas: `documentos`, `familiares`, `dinamicaFamiliar`, `dinamicaVivienda`, `ingresosArray`, `egresos`, `creditos`, `bienesRaices`, `vehiculos`, `negocios`, `social`, `juridica`, `otrosDatos`, `referenciasPersonales`, `referenciasVecinales`, `evidenciasGraficas`, etc., en [integra-rh-manus/server/utils/armadoHtmlRenderer.ts](/home/frank/proyectos/integra-rh/integra-rh-manus/server/utils/armadoHtmlRenderer.ts#L433) y [integra-rh-manus/server/utils/estudiosocioPdf.test.ts](/home/frank/proyectos/integra-rh/integra-rh-manus/server/utils/estudiosocioPdf.test.ts#L227).

**Conclusión forense:** el problema del formulario incompleto **sí es de código actual**. No hay pérdida de datos; hay **cobertura funcional insuficiente del editor estructurado**.

### B. Justificación de la Solución
- Para miniaturas, tocar código antes de verificar el artefacto desplegado sería atacar el síntoma equivocado. La prioridad correcta es validar `build -> hosting deploy -> bundle servido`.
- Para el formulario, el editor estructurado se diseñó como cobertura parcial y fallback a JSON. Mientras siga así, el reclamo del usuario es válido y esperable.
- Sobre la pestaña JSON: **no conviene eliminarla todavía**. Solo conviene **ocultarla al usuario analista** cuando el editor estructurado cubra de forma real todas las ediciones necesarias. Incluso en ese punto, la recomendación es **mantener JSON como fallback técnico/admin**, no borrarlo de inmediato.

### C. Instrucciones de Handoff para SOFIA
1. **Verificar primero despliegue de Hosting.** Confirmar si el bundle servido en producción contiene los textos `Ampliar:` y `Editor estructurado — analistas`. Si no aparecen, el sitio está sirviendo un artefacto viejo.
2. **Rehacer build y deploy de Hosting explícitamente.** Usar el pipeline que incluya `pnpm --dir integra-rh-manus build` y deploy de Hosting. No confiar en [deploy.sh](/home/frank/proyectos/integra-rh/deploy.sh) ni en [deploy-functions.sh](/home/frank/proyectos/integra-rh/deploy-functions.sh) para este caso.
3. **Solo si el problema persiste tras rebuild/deploy**, inspeccionar una URL real de `visitaDetalle.evidenciasGraficas` en producción. Si no trae extensión visible, ampliar la heurística de imagen para soportar URLs firmadas/proxy sin extensión.
4. **Ampliar el editor estructurado por fases, sin pedir JSON al analista.** Prioridad recomendada:
   - `documentos`
   - `familiares` y `otrasPersonasDomicilio`
   - `referenciasPersonales` y `referenciasVecinales`
   - `ingresosArray` y `egresos`
   - `dinamicaFamiliar` y `dinamicaVivienda`
   - `social`, `juridica`, `otrosDatos`
   - `creditos`, `bienesRaices`, `vehiculos`, `negocios`
   - `evidenciasGraficas` con UI estructurada o al menos visor/gestor controlado
5. **Añadir pruebas del componente** que fallen si existen secciones del `visitaDetalle` representadas en PDF/render pero ausentes del editor estructurado.
6. **Decisión sobre JSON:** cuando el editor estructurado cubra toda la edición operativa, **ocultar JSON para analistas** y dejarlo solo para soporte técnico/admin. **No eliminarlo** hasta comprobar al menos una iteración estable sin huecos funcionales.

### Nota Forense
- Se intentó obtener segunda opinión con Qodo CLI, pero la herramienta ya no está disponible en este entorno (`Qodo Command has been sunset`). No afecta la conclusión porque la evidencia de código, build local y configuración de Hosting es suficiente.