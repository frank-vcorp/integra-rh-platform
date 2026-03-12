# 📋 MICRO-SPRINT: Estructura Base del Stepper para Analistas
**Fecha:** 2026-03-11  
**Proyecto:** Integra RH  
**Duración estimada:** 2-4 horas  

### 🎯 Entregable Demostrable
> Como analista, veré la pantalla de "Detalle de Proceso" transformada en un Asistente Visual (Stepper) con los 5 contenedores vacíos (Recepción, Validación, Laboral, Entorno, Dictamen) listos para recibir los formularios, sin que esto rompa la conectividad de la base de datos actual.

### ✅ Tareas Técnicas
- [ ] (2) Refactorizar `ProcesoDetalle.tsx` para reemplazar el layout de "pestañas masivas" por un UI Component de `<Stepper />`.
- [ ] (2) Aislamiento de componentes: Crear 5 archivos vacíos (esqueletos) en `client/src/components/procesos/steps/` correspondientes a las fases de la recolección de información.
- [ ] (1) Conectar el estado global del formulario principal al nuevo Stepper para asegurar que los datos no se pierdan al avanzar y retroceder de paso.

### 🧪 Cómo Demostrar
1. Ir a la ruta de detalle de un proceso en el entorno local (ej. `/procesos/1`).
2. Observar la barra de progreso que indica en qué fase de validación se encuentra el candidato.
3. Navegar entre los pasos *"Volver / Siguiente"* verificando que el UI cargue los esqueletos correctos para campo, validación de escritorio, etc.