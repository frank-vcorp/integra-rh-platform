# 📋 MICRO-SPRINT 2: Migración del Paso 1 (Recepción y Perfil del Candidato) al Stepper
**Fecha:** 2026-03-12  
**Proyecto:** Integra RH  
**Duración estimada:** 2 horas  

### 🎯 Entregable Demostrable
> Al encender el "Flujo Guiado" dentro del detalle de un proceso, el analista podrá ver y usar **totalmente funcional el Paso 1: Recepción y Validación del Perfil**. Todo el formulario de "Datos Básicos", "Domicilio" y "Familia" que antes vivía en el tab de Candidato, ahora vive aquí de forma limpia, y guarda en la base de datos sin romperse.

### ✅ Tareas Técnicas
- [ ] Mudar la `Card` visual que muestra en el Head del proceso (Nombre del Puesto, Nombre de Plaza y Empresa) hacia la parte superior fija del Stepper (ReadOnly) para que el analista nunca olvide qué vacante está evaluando.
- [ ] Tomar el componente interno que renderizaba los datos Demográficos de `CandidatoDetalle.tsx` y montarlo dentro de `RecepcionValidacion.tsx`.
- [ ] Asegurarse de que el uso del hook global del formulario mantenga guardados los cambios aunque el usuario cambie del Paso 1 al Paso 2 interactuando en la pantalla.

### 🧪 Cómo Demostrar
1. Entra a un proceso en el local. Activa "Flujo guiado".
2. En el primer paso verás toda la captura de datos personales del candidato.
3. Modifica el número telefónico, guárdalo y corrobora que la base de datos respondió correctamente.