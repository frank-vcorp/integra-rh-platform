# DICTAMEN TÉCNICO: Falla WinAnsi por checkbox Unicode en PDF de estudio socioeconómico
- **ID:** FIX-20260323-01
- **Fecha:** 2026-03-23
- **Solicitante:** SOFIA
- **Estado:** ✅ VALIDADO

### A. Análisis de Causa Raíz
El fallo no proviene de los datos del proceso 82. La causa raíz está en el renderer de PDF que dibuja glifos Unicode fuera del set WinAnsi usando fuentes estándar de pdf-lib.

Hallazgo forense principal:
- En [integra-rh-manus/server/utils/estudiosocioPdf.ts](integra-rh-manus/server/utils/estudiosocioPdf.ts#L633) se construye `const mark = val ? "☑" : "☐";` y luego se envía a `drawText` en [integra-rh-manus/server/utils/estudiosocioPdf.ts](integra-rh-manus/server/utils/estudiosocioPdf.ts#L634).
- El documento usa `StandardFonts.Helvetica` y `StandardFonts.HelveticaBold` en [integra-rh-manus/server/utils/estudiosocioPdf.ts](integra-rh-manus/server/utils/estudiosocioPdf.ts#L935) y [integra-rh-manus/server/utils/estudiosocioPdf.ts](integra-rh-manus/server/utils/estudiosocioPdf.ts#L1062), lo que deja al render atado a WinAnsi.
- `pdf-lib` intenta codificar el texto con esa tabla y falla al encontrar `☑` (`U+2611`) o `☐` (`U+2610`), porque esos caracteres no pertenecen a WinAnsi.

Otros glifos del mismo renderer con riesgo similar:
- `↗ Ver en Google Maps` en [integra-rh-manus/server/utils/estudiosocioPdf.ts](integra-rh-manus/server/utils/estudiosocioPdf.ts#L581) y [integra-rh-manus/server/utils/estudiosocioPdf.ts](integra-rh-manus/server/utils/estudiosocioPdf.ts#L1349). `↗` tampoco es WinAnsi.

Glifos no ASCII presentes pero de menor riesgo inmediato con Helvetica/WinAnsi:
- `•` en [integra-rh-manus/server/utils/estudiosocioPdf.ts](integra-rh-manus/server/utils/estudiosocioPdf.ts#L604), [integra-rh-manus/server/utils/estudiosocioPdf.ts](integra-rh-manus/server/utils/estudiosocioPdf.ts#L832), [integra-rh-manus/server/utils/estudiosocioPdf.ts](integra-rh-manus/server/utils/estudiosocioPdf.ts#L838), [integra-rh-manus/server/utils/estudiosocioPdf.ts](integra-rh-manus/server/utils/estudiosocioPdf.ts#L844), [integra-rh-manus/server/utils/estudiosocioPdf.ts](integra-rh-manus/server/utils/estudiosocioPdf.ts#L850), [integra-rh-manus/server/utils/estudiosocioPdf.ts](integra-rh-manus/server/utils/estudiosocioPdf.ts#L1387)
- `—` en [integra-rh-manus/server/utils/estudiosocioPdf.ts](integra-rh-manus/server/utils/estudiosocioPdf.ts#L739), [integra-rh-manus/server/utils/estudiosocioPdf.ts](integra-rh-manus/server/utils/estudiosocioPdf.ts#L778), [integra-rh-manus/server/utils/estudiosocioPdf.ts](integra-rh-manus/server/utils/estudiosocioPdf.ts#L894), [integra-rh-manus/server/utils/estudiosocioPdf.ts](integra-rh-manus/server/utils/estudiosocioPdf.ts#L1017), [integra-rh-manus/server/utils/estudiosocioPdf.ts](integra-rh-manus/server/utils/estudiosocioPdf.ts#L1032)
- `·` en [integra-rh-manus/server/utils/estudiosocioPdf.ts](integra-rh-manus/server/utils/estudiosocioPdf.ts#L963), [integra-rh-manus/server/utils/estudiosocioPdf.ts](integra-rh-manus/server/utils/estudiosocioPdf.ts#L1014), [integra-rh-manus/server/utils/estudiosocioPdf.ts](integra-rh-manus/server/utils/estudiosocioPdf.ts#L1029), [integra-rh-manus/server/utils/estudiosocioPdf.ts](integra-rh-manus/server/utils/estudiosocioPdf.ts#L1053), [integra-rh-manus/server/utils/estudiosocioPdf.ts](integra-rh-manus/server/utils/estudiosocioPdf.ts#L1099)

### B. Justificación de la Solución
La reparación mínima segura no requiere rediseñar el PDF ni cambiar de librería. Basta con sustituir los checkbox Unicode por equivalentes ASCII antes de llamar a `drawText`.

Recomendación mínima:
- Reemplazar `☑` por `[X]` o `[SI]`.
- Reemplazar `☐` por `[ ]` o `[NO]`.
- Reemplazar `↗ Ver en Google Maps` por `Ver en Google Maps` o `-> Ver en Google Maps`.

Riesgo de regresión:
- **Bajo** si el cambio se limita al bloque de cotejo documental y a las dos etiquetas de Google Maps.
- **Medio-bajo** si se introduce una función global de normalización ASCII, porque podría alterar texto de negocio o nombres propios si se aplica indiscriminadamente a todo el contenido.

### C. Instrucciones de Handoff para SOFIA
1. Corregir solo los literales de presentación en el bloque `§3 COTEJO DE DOCUMENTOS` y las dos etiquetas `Ver en Google Maps`.
2. No tocar `boolField`, porque ese helper ya renderiza `Sí/No` y no es la fuente del error.
3. Mantener Helvetica estándar si se busca el fix más corto; no es necesario incrustar una fuente Unicode para este caso.
4. Si se desea endurecimiento adicional, aplicar una política ASCII solo a adornos visuales (`☑`, `☐`, `↗`, opcionalmente `•`, `—`, `·`) y no a texto de datos.

### Nota Operativa
Se intentó segunda opinión con Qodo, pero la CLI ya no está disponible en el entorno actual. El análisis quedó sustentado con inspección directa del renderer y del punto de embedding de fuentes.