Definición y Propósito de esta Plantilla (Instrucciones para la IA)

Qué es: Este archivo es la plantilla maestra para crear un Dossier de Checkpoint Técnico.

Tu Propósito: Tu función como IA es rellenar esta plantilla con los detalles específicos de nuestra sesión de trabajo. Debes ser precisa, técnica y seguir la estructura definida.

Objetivo Final: El documento resultante debe ser un "snapshot" autocontenido del estado de un módulo. Debe permitir a cualquier otro agente (sea humano u otra IA) entender el trabajo realizado y continuar el desarrollo de forma inmediata, incluso sin el contexto previo de nuestra conversación.

Convención de nombres y uso
- Archivo: `Checkpoints/CHK_YYYY-MM-DD_HHMM.md` usando la fecha y hora local (24h, sin segundos) al momento de crear el checkpoint.
- El campo "ID del Checkpoint" dentro del archivo DEBE coincidir exactamente con `YYYY-MM-DD_HHMM` del nombre del archivo.
- Las tareas deben referir líneas de `PROYECTO.md` como “Tareas PROYECTO.md Asociadas”.

Dossier de Checkpoint: [Nombre del Proyecto]

ID del Checkpoint: [Generar AAAA-MM-DD_HHMM] <!-- Rellena con la fecha y hora actual. -->

Módulo/Componente: [Nombre del Módulo o Componente trabajado] <!-- Ej: API de Autenticación, Formulario de Perfil, Script de Migración -->

Agente Principal: [Nombre del Agente que lideró la sesión] <!-- Ej: Gemini-Backend, Frank-Director, Copilot-Frontend -->

Tareas PROYECTO.md Asociadas: [Copiar los títulos/IDs de líneas en PROYECTO.md y su estado] <!-- Ej: [✓] PVM-DB-01: Drizzle — Migraciones iniciales -->

1. Resumen Ejecutivo (Para el Director de Proyecto)

Objetivo de la Sesión: [Describe aquí en una frase clara el objetivo principal que se buscaba en esta sesión de trabajo.]

Estado al Finalizar: [Indica el estado del módulo.] <!-- Ej: Completado, Funcional pero requiere pruebas, A medias, Bloqueado. -->

2. Snapshot Técnico (Para Continuidad de IA)

2.1. Descripción Funcional

[Describe aquí la responsabilidad de este módulo en el sistema. ¿Qué problema resuelve y cómo encaja con el resto de la aplicación?]

2.2. Checklist de Tareas Técnicas Completadas

<!-- Lista las acciones técnicas específicas que se realizaron para cumplir el objetivo. -->

[ ] [Describe la Tarea Técnica 1 completada.]

[ ] [Describe la Tarea Técnica 2 completada.]

[ ] ...

2.3. Archivos Clave Modificados o Creados

<!-- Enumera los archivos más importantes que se tocaron. Indica la acción (CREATE, MODIFY, DELETE) y la ruta completa. -->

[ACCIÓN]: [ruta/completa/al/archivo_1]

[ACCIÓN]: [ruta/completa/al/archivo_2]

...

3. Arquitectura y Contratos (Para Trabajo en Paralelo)

3.1. Dependencias Nuevas o Críticas

<!-- Lista cualquier nueva librería, paquete o dependencia añadida. Indica la versión exacta. -->

[nombre_de_la_dependencia]: "[versión]"

3.2. Estructuras de Datos / Modelos / Schemas

<!-- Pega aquí el código relevante de cualquier nuevo schema, tipo, modelo o interfaz de datos que se haya definido. -->

// ruta/al/archivo/de/definicion.js
[Pega aquí el código del schema, tipo, interfaz, etc.]


3.3. Interfaces y Contratos de API (Si aplica)

<!-- Documenta cualquier endpoint de API, función exportada o interfaz pública que otros módulos necesiten consumir. -->

Interfaz/Endpoint: [Método HTTP] [ruta/del/endpoint] o [nombreDeLaFuncionExportada]

Descripción: [Explica qué hace y cómo se usa.]

Parámetros/Request Body: [Describe la estructura de la entrada o pega un ejemplo JSON.]

Valor de Retorno/Response: [Describe la estructura de la salida o pega un ejemplo JSON.]

4. Estado y Próximos Pasos

4.1. Bloqueos y Decisiones Pendientes

<!-- Anota cualquier impedimento o pregunta que deba resolverse antes de continuar. -->

Bloqueo: [Describe si hay algo que impide el progreso.]

Decisión Pendiente: [Anota cualquier pregunta o decisión que deba tomarse.]

4.2. Contexto para Otros Módulos/Agentes

<!-- Deja un mensaje o instrucción clara para otros agentes que dependan de este trabajo. -->

Para el Agente [Nombre del Agente/Módulo Dependiente]: [Ej: "Ya puedes consumir el endpoint definido en 3.3 para la UI."]

Para el Agente [Otro Agente]: [Otra instrucción.]

4.3. Siguientes Pasos para ESTE Módulo

<!-- Lista las próximas 1-3 tareas inmediatas para este mismo módulo, basadas en PROYECTO.md (orden de prioridad). Usa el mismo formato de estado: [ ], [>], [✓], [X]. -->

[Próxima tarea inmediata.]

[Siguiente tarea.]

...
