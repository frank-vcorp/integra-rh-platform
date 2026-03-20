---
name: generar-micro-sprint
description: "Genera un plan de Micro-Sprint para una sesión de trabajo de 2-4 horas con entregable demostrable. USE FOR: inicio de sesión de trabajo, planificar qué se va a construir en esta sesión, definir scope acotado con criterios de aceptación. DO NOT USE FOR: planificación de largo plazo (usar generar-spec), sprint completo de varios días."
---

# Skill: Generar Micro-Sprint

## Instrucciones

### Paso 1: Definir el Entregable Demostrable
La regla más importante: **¿Qué VERÁ el usuario funcionando al final de esta sesión?**
- Debe ser algo concreto y verificable
- No vale "refactorizar X" — debe ser "el usuario puede hacer Y"
- Si no cabe en 2-4 horas, reducir scope

### Paso 2: Estimar con Budget de Puntos
- Budget máximo: **6 puntos** por Micro-Sprint
- 1 punto ≈ tarea simple (renombrar, ajustar config)
- 2 puntos ≈ tarea media (nuevo componente, endpoint CRUD)
- 3 puntos ≈ tarea compleja (integración externa, lógica de negocio compleja)
- Si las tareas suman >6, cortar y mover al siguiente Micro-Sprint

### Paso 3: Definir Criterio de Corte
Decidir de antemano: si una tarea se complica, ¿se abandona o se simplifica?
- Regla: **NO se entrega funcionalidad a medias**

### Paso 4: Escribir Acceptance Criteria
Debe ser ejecutable paso a paso:
1. Ir a [lugar]
2. Hacer [acción]
3. Verificar [resultado]

### Paso 5: Ubicación
- Guardar en: `context/micro-sprints/MS-YYYY-MM-DD.md`

---

## Plantilla

```markdown
# 📋 MICRO-SPRINT: [Nombre Descriptivo]

**Fecha:** YYYY-MM-DD  
**Proyecto:** [Nombre del proyecto]  
**Duración estimada:** [2-4] horas  
**Budget:** [X]/6 puntos  

---

## 🎯 Entregable Demostrable

> **En una frase:** [Qué VERÁ el usuario funcionando al final de esta sesión]

---

## ✅ Tareas Técnicas

| Pts | Tarea | Estado |
|-----|-------|--------|
| (2) | Tarea 1 - [descripción] | [ ] |
| (2) | Tarea 2 - [descripción] | [ ] |
| (1) | Tarea 3 - [descripción] | [ ] |

**Total:** X/6 puntos

---

## ⚠️ Criterio de Corte

> Si alguna tarea no cabe en esta sesión → pasa al siguiente Micro-Sprint.
> **NO se entrega funcionalidad a medias.**

---

## 🧪 Cómo Demostrar (Acceptance Criteria)

1. Ir a `[URL/pantalla]`
2. Hacer `[acción específica]`
3. Verificar que `[resultado esperado]`
4. El usuario confirma: "Sí, esto funciona"

---

## 📝 Notas de Sesión

*(Completar durante la sesión)*

### Decisiones Tomadas
- 

### Obstáculos Encontrados
- 

### Aprendizajes
- 

---

## 🏁 CIERRE MICRO-SPRINT

**Resultado:** ⏳ Pendiente | ✅ Completado | ⚠️ Parcial | ❌ Bloqueado

### Mini-Demo Realizada
- [ ] Funcionalidad demostrada
- [ ] Usuario validó que funciona

### Tareas Completadas
- [x] Tarea 1
- [x] Tarea 2
- [ ] Tarea 3 → Pasa al siguiente Micro-Sprint

### Checkpoint Generado
`Checkpoints/CHK_YYYY-MM-DD_HHMM.md`

### Próximo Micro-Sprint (Preview)
> [Descripción breve de lo que sigue]
```
