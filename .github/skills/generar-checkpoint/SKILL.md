---
name: generar-checkpoint
description: "Genera un Checkpoint de entrega para documentar el estado actual del trabajo realizado. USE FOR: al completar una tarea o grupo de tareas, antes de hacer handoff a otro agente, al final de una sesión de trabajo, cuando se necesita punto de restauración. DO NOT USE FOR: documentar bugs (usar generar-dictamen), planificar trabajo (usar generar-spec o generar-micro-sprint)."
---

# Skill: Generar Checkpoint de Entrega

## Instrucciones

### Paso 1: Inventariar Cambios
1. Ejecutar `git diff --stat` para ver archivos modificados
2. Verificar `git status` para archivos nuevos no trackeados
3. Clasificar cada archivo como: Creado / Modificado / Eliminado

### Paso 2: Documentar Decisiones
Para cada decisión técnica tomada durante la implementación:
- ¿Qué opciones había?
- ¿Por qué se eligió esta?
- ¿Qué trade-offs implica?

### Paso 3: Verificar Soft Gates
Antes de cerrar el checkpoint, validar:
- [ ] **Gate 1 — Compilación**: El proyecto compila sin errores
- [ ] **Gate 2 — Testing**: Los tests pasan (o se documentan los que fallan)
- [ ] **Gate 3 — Revisión**: Código revisado o pendiente de QA
- [ ] **Gate 4 — Documentación**: Cambios documentados

### Paso 4: Identificar Riesgos
Listar riesgos activos con probabilidad, impacto y mitigación.

### Paso 5: Ubicación
- Guardar en: `context/checkpoints/CHK_YYYY-MM-DD_HHMM.md`

---

## Plantilla

```markdown
# Checkpoint: [Título Breve]

**Fecha:** YYYY-MM-DD HH:MM  
**Agente:** [SOFIA/INTEGRA/GEMINI]  
**ID:** [IMPL/ARCH/INFRA]-YYYYMMDD-NN  
**Estado del Proyecto:** [En Progreso/Bloqueado/Completado]  

---

## Tarea(s) Abordada(s)
- [ID-TAREA-1]: [Descripción breve]

---

## Cambios Realizados

### Archivos Creados
- `path/to/file1.ts` - [Propósito]

### Archivos Modificados
- `path/to/existing.ts` - [Qué se cambió]

### Archivos Eliminados
- `path/to/deprecated.js` - [Razón]

---

## Decisiones Técnicas

### [Decisión 1: Título]
**Contexto:** [Por qué se tomó esta decisión]  
**Opciones Consideradas:**
- Opción A: [Pros/Contras]
- Opción B: [Pros/Contras]

**Decisión Final:** [Opción elegida]  
**Justificación:** [Razón de la elección]

---

## Supuestos
- [Supuesto 1]: [Descripción y validación necesaria]

---

## Riesgos Identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| [Riesgo 1] | Alta/Media/Baja | Alto/Medio/Bajo | [Estrategia] |

---

## Soft Gates

- [ ] Compilación sin errores
- [ ] Tests pasando
- [ ] Revisión de código/QA
- [ ] Documentación actualizada
```
