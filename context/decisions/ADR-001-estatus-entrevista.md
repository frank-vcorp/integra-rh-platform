# ADR-001: Inclusión de Estatus de Entrevista en Flujo Principal

**ID:** ARCH-20260210-01
**Fecha:** 2026-02-10
**Estado:** Aceptado

## Contexto
El flujo principal de procesos (`estatusProceso`) carecía de estados explícitos para la etapa de entrevista, relegándolos a `estatusVisual`. El usuario operativo requiere poder gestionar estos estados directamente en el ciclo de vida principal del proceso.

## Decisión
Se modificó el esquema de la base de datos (`drizzle/schema.ts`) para expandir el enum `estatusProceso`.

Valores agregados:
- `entrevistado`
- `no_entrevistado`

La posición de estos estados en el flujo lógico es después de `asignado` y antes de `en_verificacion`.

## Consecuencias
1. **Base de Datos:** Se requiere actualizar la definición de la columna ENUM en la tabla `processes`.
2. **UI:** Los componentes que consumen el enum `estatusProceso` mostrarán las nuevas opciones automáticamente.
3. **Migración:** Es necesario ejecutar `npx drizzle-kit push` o generar una migración para aplicar el cambio en MySQL.
