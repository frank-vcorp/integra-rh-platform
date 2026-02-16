# DICTAMEN TÉCNICO: Error 500 en saveInvestigation — ctx is not defined

- **ID:** FIX-20260210-01
- **Fecha:** 2026-02-10
- **Solicitante:** Frank (reporte directo)
- **Estado:** ✅ VALIDADO

---

## A. Análisis de Causa Raíz

| Elemento | Detalle |
|----------|---------|
| **Síntoma** | Error 500 al guardar Investigación Laboral: `TRPCClientError: ctx is not defined` |
| **Endpoint** | `workHistory.saveInvestigation` |
| **Archivo** | `server/routers/workHistory.ts` línea 541 (pre-fix) |
| **Hallazgo forense** | El callback de `.mutation()` desestructuraba únicamente `{ input }`, omitiendo `ctx`. Sin embargo, en la línea 603 se accede a `ctx.user?.name` para registrar el audit trail. Esto produce un `ReferenceError: ctx is not defined` en runtime. |
| **Causa** | Variable `ctx` fuera de scope: no fue incluida en la desestructuración del argumento del callback de la mutation. Probablemente se introdujo el bloque de audit trail en un commit posterior sin actualizar la firma. |
| **Contraste** | El procedimiento `generateIaDictamen` (línea 636) SÍ desestructura `{ input, ctx }` correctamente —confirma que es un descuido puntual. |

## B. Justificación de la Solución

**Cambio aplicado:** Se agregó `ctx` a la desestructuración del argumento:

```diff
- .mutation(async ({ input }) => {
+ .mutation(async ({ input, ctx }) => {
+   /** FIX REFERENCE: FIX-20260210-01 — ctx no estaba desestructurado, causaba ReferenceError */
```

**Por qué este cambio es correcto:**
1. `protectedProcedure` ya inyecta `ctx` con `user`, `requestId`, etc. Solo faltaba recibirlo.
2. No se modifica lógica de negocio, esquema Zod ni respuesta del endpoint.
3. El audit trail ahora registra correctamente `ctx.user?.name`.
4. Validación TypeScript: compila sin errores nuevos (errores pre-existentes son de leaflet, sin relación).

**Riesgo:** Nulo. Es una corrección de scope pura, sin efectos colaterales.

## C. Instrucciones de Handoff

1. **Desplegar** el cambio con `pnpm run build && firebase deploy` o el pipeline habitual.
2. **Verificar** en producción: abrir un candidato → pestaña Investigación Laboral → modificar cualquier campo → Guardar. Debe retornar éxito sin error 500.
3. **Los warnings de accesibilidad** (`Missing Description`) mencionados por el usuario son UI/UX y no están relacionados con este fix.
