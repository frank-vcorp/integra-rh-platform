# DICTAMEN TÉCNICO: Análisis de funciones auxiliares en Procesos.tsx

- **ID:** FIX-20260217-02
- **Fecha:** 2026-02-17
- **Solicitante:** User
- **Estado:** ✅ VALIDADO

### A. Análisis de Causa Raíz
Se ha realizado una búsqueda exhaustiva en el archivo `client/src/pages/Procesos.tsx` y se confirma que las funciones `getClientName`, `getSiteName` y `getResponsableName` **NO existen** en la versión actual del archivo.

El código actual (líneas ~534-546) accede a estos valores directamente desde el objeto `process` haciendo un cast a `any`:
- `(process as any).clientName`
- `(process as any).siteName`
- `(process as any).responsableName`

Esto explica por qué las funciones helper no se encuentran en el código: fueron sustituidas por acceso directo a propiedades (probablemente agregadas en el backend).

### B. Justificación de la Solución
Para responder a la solicitud del usuario de "insertar/reemplazar" en esa zona, se provee el contexto exacto donde *deberían* estar estas funciones (entre `getCandidateName` y `getStatusLabel`), donde actualmente solo reside `getPostName`.

### C. Instrucciones de Handoff
El bloque de código **exacto** existente entre `getCandidateName` y `getStatusLabel` es:

```tsx
  const getCandidateName = (candidatoId: number) => {
    const candidate = candidates.find((c) => c.id === candidatoId);
    return candidate?.nombreCompleto || "-";
  };


  const getPostName = (puestoId: number) => {
    const post = allPosts.find((p) => p.id === puestoId);
    return post?.nombreDelPuesto || "-";
  };


  const getStatusLabel = (status: string): string => {
```
