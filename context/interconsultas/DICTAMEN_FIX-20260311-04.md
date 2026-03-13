# DICTAMEN TÉCNICO: Análisis Forense Estructural de UX y Captura de Datos
- **ID:** FIX-20260311-04
- **Fecha:** 2026-03-11
- **Solicitante:** INTEGRA
- **Estado:** ✅ VALIDADO

### A. Análisis de Causa Raíz
Tras una inspección exhaustiva de `src/pages/` y `src/components/`, se detectó una deuda técnica crítica originada por la sobresaturación y el anidamiento inmanejable de componentes tipo `Dialog` o Modales para operaciones CRUD complejas y flujos multi-paso.

**1. Modales Sobrepoblados y Amontonados:**
El patrón de diseño "Single-Page Todo-Modals" ha colapsado. Archivos monolíticos encapsulan la lista, el detalle y la edición entera de las entidades usando incontables tags `<Dialog>` y `<DialogContent>`.
- `CandidatoDetalle.tsx` (3,392 líneas) 
- `ProcesoDetalle.tsx` (2,053 líneas)
- `Clientes.tsx` (1,118 líneas)
- `ClienteFormularioIntegrado.tsx` (692 líneas)
El anidamiento provoca colisiones de z-index, fallos de estado si el modal se cierra accidentalmente (pérdida de datos ingresados), y estados de UI inmanejables por renderizados secundarios.

**2. Fragilidad en la Modificación Base por Analistas (Back-office):**
Actualmente la asignación de visitas y actualización de perfil se realiza dentro de modales mutantes. El analista interactúa con formularios que mutan de tamaño según el contenido, perdiendo la ergonomía visual. La fragilidad radica en la gestión de estado centralizada en un solo componente gigante: un solo error de validación en una pestaña del modal bloquea todo el ciclo de acción.

**3. Captura de datos de Empresas (Clientes) y Plazas:**
La creación/edición en `Clientes.tsx` o los procesos integrados están acoplando la lógica de negocio, reglas de validación y la presentación UI en un mismo bloque de código (`ClienteFormularioIntegrado.tsx`). Se carece de una separación de la entrada por "Steps" lógicos (Ej: Datos Básicos -> Plazas/Sedes -> Contactos). Las Plazas parecen agregarse iterativamente de forma manual dentro de campos anidados en la misma vista, provocando un scroll interminable y difícil revisión.

### B. Justificación de la Solución (Zonas Críticas a Rediseñar)
Se identifican 4 zonas de Deuda Técnica de UX que urgen ser extraídas de *Modales* a *Wizards / Páginas Dedicadas*:

1. **Gestión de Cliente y sus Plazas (Wizard Multi-Paso):**
   - **Problema:** `Clientes.tsx` y `ClienteFormularioIntegrado.tsx` sufren de congestión de inputs.
   - **Mitigación:** Desglosar en un Wizard a pantalla completa: `Paso 1: Info Base` -> `Paso 2: Direcciones y Plazas` -> `Paso 3: SLA Comercial`.

2. **Onboarding / Detalle Central del Candidato (Página Formulario Dividida):**
   - **Problema:** `CandidatoDetalle.tsx` de +3300 líneas y sus múltiples ediciones encimadas.
   - **Mitigación:** Migrar a una arquitectura de "Pestañas en Página Dedicada" sin modales. Cada segmento de datos (Personal, Médico, Laboral) se guarda asíncronamente con formularios independientes o *Clean Forms* modulares, no en una transacción masiva.

3. **Arquitectura de Asignación de Visitas/Análisis (Kanban/Split View):**
   - **Problema:** El analista entra a procesos (`ProcesoDetalle.tsx`) y levanta más modales para asignar investigadores o agendar fechas.
   - **Mitigación:** Transformar en un *Split View Form* (Mitad de pantalla con los detalles del proceso y la otra mitad estática para hacer la asignación de analistas, sin abrir popups que bloquean la lectura contextal).

4. **Flujos Secundarios Entrelazados (Back-office settings):**
   - Extraer maestros dependientes (Sedes, Evaluadores/Encuestadores) a un Dashboard de Ajustes tradicional, evitando que se carguen como *Drawers* o popups infinitos desde las pantallas principales.

### C. Instrucciones de Handoff para INTEGRA
1. **Planificación de Sprints:** Crea tickets individuales (Wizards de Clientes, Refactor Detalle Candidato, Split View Asignaciones).
2. **Definir SPECs:** Para cada ticket, se debe aprobar las reglas de validación en pasos discretos (Step-by-step validation) antes de delegar el código a `SOFIA - Builder`.
3. Notificar a `SOFIA` de iniciar la construcción del enrutamiento dedicado (Ej: `/clientes/:id/editar/plazas`) en vez de reciclar componentes `Dialog`.
