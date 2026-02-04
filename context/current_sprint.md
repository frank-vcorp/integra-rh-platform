## 📋 MICRO-SPRINT: Gestión de Múltiples Periodos Laborales
**Fecha:** 2026-02-03
**Proyecto:** Integra RH - Módulo Candidatos
**Duración estimada:** 3-4 horas

### 🎯 Entregable Demostrable
> El usuario podrá agregar, editar y visualizar múltiples periodos de contratación dentro de una misma tarjeta de Experiencia Laboral (Empresa), manejando reingresos (bajas y altas) sin duplicar la empresa.

### ✅ Tareas Técnicas
- [ ] (ARCH) Definir estructura de datos para múltiples periodos (Array JSON vs Sub-tabla)
- [ ] (BACK) Adaptar endpoint `workHistory` para soportar lista de periodos
- [ ] (FRONT) Modificar modal de "Investigación Laboral" para gestionar N periodos
- [ ] (FRONT) Actualizar visualización en tarjeta de resumen (mostrar todos los rangos)

### 🧪 Cómo Demostrar
1. Abrir perfil de candidato
2. Editar una experiencia laboral existente (ej: "Panadería Nati")
3. Clic en "Agregar Periodo" -> Definir puesto y fechas (2020-2021)
4. Clic en "Agregar Periodo" -> Definir otro puesto y fechas (2023-2024)
5. Guardar y verificar que ambos periodos se muestran agrupados bajo la misma empresa
