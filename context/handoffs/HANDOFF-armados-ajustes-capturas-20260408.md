# HANDOFF: Ajustes de Armados a partir de capturas reales

**Fecha:** 2026-04-08  
**Owner:** INTEGRA  
**Implementación:** SOFIA  
**ID Owner:** ARCH-20260408-13

---

## Contexto

Las capturas del HTML generado en producción confirman que la base editorial nueva ya está activa y mejoró la estructura general, pero todavía hay brechas claras entre el resultado actual y lo solicitado por negocio.

Esto ya no es un problema de deploy. Es un problema de:

- cobertura incompleta de datos por sección,
- composición editorial insuficiente en adjuntos e imágenes,
- y separación incorrecta entre documentos generales y evidencia contextual de cada apartado.

---

## Diagnóstico Sintetizado

### 1. Sección Documentos

Problema actual:

- Se está renderizando como una tabla global de archivos.
- Mezcla evidencias de semanas cotizadas, antecedentes, buró e investigación legal en una sola bolsa.
- Duplica información porque luego esos mismos apartados vuelven a aparecer más abajo sin sus adjuntos realmente integrados.

Decisión:

- Cada documento debe vivir en su propia sección temática cuando ya pertenece claramente a un apartado.
- La sección Documentos debe reservarse para:
  - documentos generales del expediente que no pertenecen a un apartado específico,
  - documentos de identidad o soporte transversal,
  - y adjuntos adicionales no clasificados.

Regla editorial:

- Los documentos importantes deben ocupar media página útil cuando sean visuales o anexos relevantes.
- Si existen documentos adicionales no contemplados por una sección específica, deben ir al final del documento en un bloque tipo “Documentos adicionales”, con su título y una acotación clara.

### 2. Investigación laboral

Problema actual:

- En historial laboral verificado sigue faltando la causal de baja como dato visible prioritario.
- El periodo sigue teniendo demasiada presencia relativa para la intención operativa.

Decisión:

- La causal de baja debe ser el dato principal del resumen por empleo, por encima del tiempo trabajado.
- El tiempo o periodo puede quedar como dato secundario.

### 3. Investigación legal, semanas cotizadas y buró de crédito

Problema actual:

- Estas secciones aparecen demasiado resumidas o casi vacías visualmente.
- Sus imágenes o adjuntos no están ligados al apartado correspondiente.

Decisión:

- Cada una debe integrar sus propias evidencias en la misma sección:
  - Investigación legal: imágenes/evidencias legales dentro del apartado.
  - Semanas cotizadas: PDFs o imágenes de semanas dentro del apartado.
  - Buró de crédito: archivo principal y anexos dentro del apartado.

Regla editorial:

- No mandar estos adjuntos a una tabla genérica de documentos si ya tienen apartado natural.

### 4. Visita domiciliaria

Problema actual:

- El bloque de mapa y fachada mejoró mucho.
- Falta el render visual del mapa capturado como pieza protagonista cuando exista captura utilizable, no solo la línea con coordenadas y enlace.

Decisión:

- Mantener fachada principal debajo.
- Reforzar el render visual del mapa dentro del bloque hero, con prioridad a la captura del encuestador cuando exista.

### 5. Evidencias gráficas del encuestador

Problema actual:

- Las imágenes del encuestador siguen viéndose pequeñas para la importancia que tienen.

Decisión:

- Deben crecer a composición de media carta / media página útil.
- Debe evitarse la sensación de mini-galería de soporte.

---

## Instrucciones de Implementación para SOFIA

1. Reestructurar el renderer para que los documentos contextuales se rendericen dentro de su sección natural y no en la tabla global.
2. Dejar en “Documentos” solo lo general/no clasificado.
3. Añadir un bloque final “Documentos adicionales” para restos no clasificados.
4. En investigación laboral, mostrar causal de baja como resumen principal por empleo.
5. En investigación legal, semanas cotizadas y buró, integrar los adjuntos/imágenes en su propio apartado.
6. En visita domiciliaria, reforzar el render visual del mapa capturado dentro del hero.
7. Escalar las evidencias gráficas del encuestador a layout de media carta/media página.
8. Validar el resultado con la misma muestra de producción que originó estas capturas.

---

## Criterios de Aceptación

- [ ] La tabla global de documentos deja de mezclar evidencia temática que ya tiene sección propia.
- [ ] La causal de baja aparece visible y prioritaria en investigación laboral.
- [ ] Investigación legal, semanas cotizadas y buró muestran sus adjuntos dentro del apartado correspondiente.
- [ ] El bloque de visita domiciliaria muestra mapa renderizado + fachada con jerarquía correcta.
- [ ] Las evidencias gráficas del encuestador ya no se ven pequeñas y usan composición editorial de media carta.
- [ ] Los documentos adicionales quedan al final del reporte, separados y titulados.
