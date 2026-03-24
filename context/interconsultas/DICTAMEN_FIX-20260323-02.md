# DICTAMEN TÉCNICO: Reparación mínima WinAnsi en renderer PDF de armado cliente
- **ID:** FIX-20260323-02
- **Fecha:** 2026-03-23
- **Solicitante:** SOFIA
- **Estado:** ✅ VALIDADO

### A. Análisis de Causa Raíz
El renderer de PDF seguía enviando a pdf-lib literales Unicode fuera de WinAnsi mientras el documento usa fuentes estándar Helvetica. El punto de ruptura operativo estaba en el bloque de cotejo documental, donde se construía un checkbox visual con `☑` y `☐`, y existía además el mismo riesgo en la etiqueta `↗ Ver en Google Maps`.

Hallazgos confirmados:
- Se reemplazó el origen directo del error en `§3 COTEJO DE DOCUMENTOS` sin tocar el mapeo de datos ni el layout.
- También se sustituyó la flecha Unicode usada en las dos etiquetas clicables de Google Maps.
- La validación en memoria se ejecutó con un snapshot sintético del proceso `id: 82`, suficiente para recorrer el mismo bloque que detonaba la excepción.

Segunda opinión forense:
- `qodo self-review` no pudo completarse porque la configuración local de Qodo intenta usar un modelo inexistente en el entorno (`claude-4.5-sonnet`). Esto no afecta el fix aplicado, pero deja la revisión automática externa inconclusa.

### B. Justificación de la Solución
Se aplicó la corrección mínima y segura recomendada por el dictamen previo:
- `☑` → `[X]`
- `☐` → `[ ]`
- `↗ Ver en Google Maps` → `-> Ver en Google Maps`

La solución se encapsuló en constantes ASCII seguras para evitar repetir literales y mantener el cambio estrictamente limitado a presentación. No se modificó lógica de negocio, estructura del PDF, selección de fuentes ni flujo de datos.

Validación ejecutada:
- Suite: `pnpm vitest run server/utils/estudiosocioPdf.test.ts`
- Resultado: `7/7` pruebas OK
- Se añadió una prueba de regresión que genera el PDF con `process.id = 82`, `visita_domiciliaria` y `captura_visita`, incluyendo el bloque `documentos`, para verificar que el renderer ya no revienta por glifos no WinAnsi.

### C. Instrucciones de Handoff para SOFIA
1. Puedes continuar con el flujo de generación de PDFs sin cambiar fuentes ni rediseñar el armado cliente.
2. Si después aparece otro fallo WinAnsi, revisar primero adornos visuales Unicode en el mismo renderer antes de tocar datos o fuentes.
3. Si necesitas una validación contra datos reales del proceso 82, hace falta localizar o reconstruir un snapshot persistido fuera de los tests; no apareció uno reutilizable en el workspace durante esta intervención.
