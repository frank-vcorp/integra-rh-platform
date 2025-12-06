# Especificación de Roles Internos – Integra RH / Sinergia RH

Este documento define los roles internos propuestos para el sistema, su propósito y el nivel de permisos esperado. Servirá como base para configurar el módulo de **Roles y permisos** (RBAC) y para futuras decisiones de seguridad.

## Objetivos generales

- Tener responsables claros para cada etapa del proceso (recepción, análisis, administración).
- Minimizar riesgos de borrado o modificación accidental de información sensible.
- Permitir que la operación siga funcionando si alguien se ausenta (no depender de una sola persona).

## Roles internos propuestos

### 1. Superadmin

- **Quién lo usa:** propietario del sistema (actualmente Paula / tú).
- **Propósito:** control total de la plataforma y su configuración.
- **Alcance de permisos (alto nivel):**
  - Ver, crear, editar y eliminar en **todos los módulos**.
  - Gestionar **usuarios** (crear, desactivar, cambiar rol, resetear accesos).
  - Gestionar **roles y permisos** (crear/editar/eliminar perfiles de permisos).
  - Aprobar o ejecutar tareas de alto riesgo:
    - Backups y restauración de base de datos.
    - Cambios de configuración global (dominio, integración con IA, correos, etc.).
  - Acceso total a **registros/auditoría**.
- **Justificación:**
  - Se necesita una figura con visibilidad completa y capacidad de corregir cualquier problema, sin depender de Google Cloud o de terceros.

### 2. Administrador

- **Quién lo usa:** coordinadores o personas de confianza que supervisan la operación diaria.
- **Propósito:** administrar el flujo operativo sin tocar configuración estructural.
- **Alcance de permisos (alto nivel):**
  - Ver todo el sistema: clientes, puestos, candidatos, procesos, visitas, encuestadores, pagos, registros.
  - Crear y editar en todos los módulos operativos.
  - **Eliminar** registros operativos (candidatos, procesos, historial, documentos) solo cuando sea necesario y controlado.
  - Ver, pero no modificar, la configuración de roles y permisos.
  - Invitar/activar usuarios, pero no cambiar sus roles avanzados si así se decide.
- **Justificación:**
  - Permite que la operación siga funcionando aunque el Superadmin no esté disponible.
  - Separa la administración del día a día de la configuración estratégica.

### 3. Recepcionista

- **Quién lo usa:** persona que recibe solicitudes y da de alta los casos.
- **Propósito:** capturar la información inicial y asignar a quién dará seguimiento.
- **Alcance de permisos (alto nivel):**
  - **Clientes / Puestos / Candidatos:**
    - Crear registros nuevos y actualizar datos básicos (contactos, medios de recepción, etc.).
    - Sin permisos de eliminación.
  - **Procesos:**
    - Crear un proceso nuevo para un candidato/cliente/puesto.
    - Definir el tipo de proceso y los datos de recepción.
    - **Asignar o reasignar el Analista asignado** (responsable interno).
    - Cambiar estatus solo en la etapa inicial (ej. de “en recepción” a “asignado”).
  - **Visitas / Encuestadores / Pagos:** solo lectura o acceso muy limitado (según se ajuste después).
  - **Usuarios / Roles / Configuración:** sin acceso.
- **Justificación:**
  - Centraliza la alta de información y evita que cada analista capture procesos a su manera.
  - Mantiene control de quién puede cambiar la asignación de responsables.

### 4. Analista

- **Quién lo usa:** quien realiza la investigación y documenta resultados.
- **Propósito:** trabajar el caso a detalle sin alterar configuraciones ni procesos ajenos.
- **Alcance de permisos (alto nivel):**
  - **Procesos:**
    - Ver todos los procesos para contexto general.
    - **Editar solo los procesos donde es “Analista asignado”**:
      - Estatus del proceso (en verificación, en dictamen, finalizado, entregado).
      - Información de investigación laboral, legal, buró, visitas, dictamen.
      - Comentarios internos y carga de documentos asociados.
    - Otros procesos: modo lectura únicamente.
  - **Candidatos / Historial laboral:**
    - Editar el historial laboral y la información de investigación ligada a sus procesos.
    - No eliminar candidatos completos (solo actualizar).
  - **Clientes / Puestos / Usuarios / Roles / Pagos:** solo lectura o sin acceso, según se refine.
- **Justificación:**
  - Garantiza trazabilidad: cada cambio en un proceso tiene un responsable claro.
  - Evita que un analista modifique casos que no le corresponden.

### 5. Cliente (rol ya existente)

- **Quién lo usa:** usuarios de las empresas clientes.
- **Propósito:** consultar el avance y resultados de sus procesos/candidatos.
- **Alcance de permisos (alto nivel):**
  - Ver sus propios procesos y candidatos.
  - Ver dictámenes y documentos que se compartan explícitamente.
  - Sin permisos de edición ni eliminación.
- **Justificación:**
  - Mantener la transparencia con el cliente sin exponer datos de otras empresas ni permitir cambios en la investigación.

## Resumen para implementación futura

- El sistema de roles y permisos ya puede almacenar:
  - Roles (`roles`), permisos por módulo/acción (`role_permissions`) y asignación de roles a usuarios (`user_roles`).
- Falta:
  - Definir la matriz concreta de permisos para cada uno de estos roles.
  - Adaptar los routers y la UI para que respeten:
    - `view` vs `create` vs `edit` vs `delete` por módulo.
    - Reglas especiales como “Analista solo edita procesos asignados”.

Este documento será la referencia principal para llenar esa matriz en la pantalla de **Roles y permisos** y para ajustar los checks en backend/frontend.

