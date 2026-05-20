# DICTAMEN TÉCNICO: Bucle de render en pantalla de usuarios
- **ID:** FIX-20260520-01
- **Fecha:** 2026-05-20
- **Solicitante:** INTEGRA
- **Estado:** ✅ VALIDADO

### A. Análisis de Causa Raíz
Síntoma reportado: la ruta /usuarios dispara `Minified React error #185`, que corresponde a `Maximum update depth exceeded`.

Hallazgos forenses en código relevante:

1. En [integra-rh-manus/client/src/pages/Usuarios.tsx](../..//integra-rh-manus/client/src/pages/Usuarios.tsx) la query `trpc.roles.getUserRoles.useQuery(...)` se desestructura con valor por defecto `[]`.
2. Ese valor por defecto crea un arreglo nuevo en cada render mientras la query aún no entrega datos.
3. El `useEffect` dependía de `editingUser` y `userRolesForEditing`, y al entrar en modo edición ejecutaba `setSelectedRoleIds([])` incluso cuando la respuesta real todavía no existía.
4. Como el arreglo por defecto cambiaba de identidad en cada render, React volvía a ejecutar el efecto y a disparar otro `setState`, creando el bucle de profundidad máxima.

### B. Justificación de la Solución
La corrección mínima consiste en:

1. Dejar de usar un arreglo por defecto recreado en cada render para `userRolesForEditing`.
2. Sincronizar `selectedRoleIds` solo cuando la query de roles del usuario ya terminó correctamente.
3. Evitar `setState` redundantes comparando el estado actual contra el nuevo arreglo calculado.

Esto ataca la causa raíz sin alterar el contrato del formulario ni la UI de permisos.

### C. Instrucciones de Handoff para SOFIA
1. Mantener la sincronización de roles derivada de la query únicamente cuando exista respuesta válida.
2. Evitar valores por defecto no estables en hooks cuyos resultados alimentan `useEffect` con `setState`.
3. Validar con build y una prueba manual del flujo: abrir /usuarios, editar un usuario, abrir/cerrar el sheet y confirmar que no reaparece el error 185.
