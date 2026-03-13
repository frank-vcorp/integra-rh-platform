# DICTAMEN TÉCNICO: Limpieza de Deuda Técnica "Antigravity" en Front-End
- **ID:** FIX-20260312-01
- **Fecha:** 2026-03-12
- **Solicitante:** INTEGRA
- **Estado:** ✅ VALIDADO

### A. Análisis de Causa Raíz
Tras la reciente refactorización de modales y diseño responsivo, se ha detectado acumulación de deuda técnica ("basura" en el código base del cliente) en `client/src/pages/`. Específicamente:

1. **Variables y Hooks Importados pero No Usados:** 
   Debido a los cambios de interfaz, se detectaron imports huérfanos de componentes UI antiguos o hooks no utilizados tras cambiar a modales/diseños a dos columnas.
2. **Logs de Desarrollo (`console.log`):**
   Se han identificado más de 25 llamadas a `console.log` en distintas páginas. Muchos de estos incluyen la impresión de payloads o datos de estado interno que exponen lógica sensible en producción:
   - `src/pages/ProcesoDetalle.tsx`: Múltiples logs en las cargas y guardado de investigación legal / semanas detalle.
   - `src/pages/CandidatoSelfService.tsx`: Trazas exhaustivas del flujo del candidato (`[CLIENT] Draft saved...`, payloads expuestos).
   - `src/pages/PuestoProcesoFlow.tsx` y `CandidatoFormularioIntegrado.tsx`: Logs de debugueo exponiendo IDs en el flujo de creación.
3. **Manejo Inconsistente de Excepciones (`try/catch`):**
   En operaciones de actualización con validaciones y subida de archivos, existen bloques que silencian errores vía `console.error` u omiten reportar fallos a la interfaz, lo cual degrada la UX (al no presentar `toast.error`).

### B. Justificación de la Solución
Dejar los `console.log` puede causar problemas de seguridad la exposición de la data de candidatos y procesos, y un impacto menor en el rendimiento de la aplicación cliente en producción.
Es imperativo limpiar los flujos para cumplir con el estándar. Reducir la contaminación visual y técnica del proyecto hace el mantenimiento futuro más predictivo y ayuda a no inflar los build logs. El manejo silencioso de errores imposibilita una respuesta adecuada del usuario final en fallos esperables.

### C. Instrucciones de Handoff para SOFIA
1. Ejecuta una revisión con el linter, por ejemplo: `npx eslint "src/pages/**/*.tsx" --fix` para eliminar o detectar automáticamente variables no utilizadas y los imports sobrantes en estas rutas.
2. Purgar todos los `console.log` listados, con especial atención a `ProcesoDetalle.tsx`, `CandidatoSelfService.tsx`, y `CandidatoFormularioIntegrado.tsx`.
3. Revisa los catch locales asociados a las funciones de guardar de `CandidatoSelfService.tsx` y en uploads de `ProcesoDetalle.tsx`, asegurándote de reemplazar o acompañar silencios o logs de error con `toast.error("Ocurrió un error al procesar tu solicitud")` para retroalimentación en UI.
4. Genera el checkpoint conforme se concluya cada parte de esta limpieza.