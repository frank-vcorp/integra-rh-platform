# Checkpoint: Arquitectura de Dictamen Laboral Global
**Fecha**: 2026-03-13
**ID**: ARCH-20260313-01

## 🎯 Resumen de la Sesión
- Se corrigió el enlace del botón "Ver" (Ojo) en el dashboard del cliente para redireccionar al perfil completo del candidato (`/cliente/candidato/[id]`) en lugar de al proceso.
- Se restauró la pestaña "Candidatos" en el menú lateral.
- Se amplió la tarjeta de "Historial Laboral" en la vista del cliente para mostrar datos clave: Motivo de Salida, Desempeño, Recomendable, Razones.
- **Refactorización de Arquitectura**: Se migró la propiedad de los datos de la "Investigación Laboral" (el dictamen o conclusión) para que pertenezca al `Candidato` y no al `Proceso`. Esto asegura que los procesos subsiguientes hereden el historial.
- Se resolvió un error de base de datos aplicando una migración manual directa en MySQL para añadir la columna JSON `dictamenLaboral`.

## 📦 Despliegues
- Frontend: Desplegado en Firebase Hosting (`integra-rh.web.app`).
- Backend: Empujado a master (Cloud Build).
