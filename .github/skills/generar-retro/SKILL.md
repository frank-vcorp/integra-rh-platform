---
name: generar-retro
description: "Genera una Retrospectiva de Sprint para evaluar qué funcionó, qué no, y definir acciones de mejora. USE FOR: al final de un sprint o ciclo de trabajo, cuando se quiere evaluar el proceso, para identificar mejoras a la metodología. DO NOT USE FOR: reportes de estado (usar CRONISTA), análisis de bugs (usar generar-dictamen)."
---

# Skill: Generar Retrospectiva de Sprint

## Instrucciones

### Paso 1: Recopilar Métricas
Revisar `PROYECTO.md` y `context/checkpoints/` para obtener:
- Tareas planificadas vs completadas
- Bugs encontrados vs resueltos
- Interconsultas a Deby realizadas
- Rollbacks ejecutados

### Paso 2: Análisis Honesto
Para cada sección (Funcionó/No Funcionó):
- Ser específico — no "la comunicación fue buena" sino "el handoff INTEGRA→SOFIA incluyó toda la info necesaria"
- Incluir evidencia concreta (IDs de tareas, commits, situaciones)

### Paso 3: Lecciones Accionables
Cada lección debe tener:
- Descripción del aprendizaje
- Cómo aplicarlo en el próximo sprint
- Si requiere cambio en la metodología, marcarlo

### Paso 4: Acciones con Responsable
Toda acción de mejora necesita:
- Responsable (agente específico)
- Deadline concreto
- Prioridad (Alta/Media/Baja)

### Paso 5: Ubicación
- Guardar en: `context/retros/RETRO-Sprint-[N].md`
- Notificar a CRONISTA para actualizar `PROYECTO.md`

---

## Plantilla

```markdown
# Retrospectiva: Sprint [N] - [Nombre]

**Fecha:** YYYY-MM-DD  
**Facilitador:** CRONISTA  
**Participantes:** INTEGRA, SOFIA, GEMINI, Deby

---

## 📊 Métricas del Sprint

| Métrica | Valor | Tendencia |
|---------|-------|-----------|
| Tareas planificadas | X | - |
| Tareas completadas | Y | ↑/↓/= |
| Bugs encontrados | Z | ↑/↓/= |
| Bugs resueltos | W | ↑/↓/= |
| Deuda técnica agregada | N items | ↑/↓/= |
| Deuda técnica resuelta | M items | ↑/↓/= |
| Interconsultas a Deby | P | ↑/↓/= |
| Rollbacks | R | ↑/↓/= |

---

## ✅ Lo que Funcionó Bien

### Procesos
- [Qué proceso funcionó bien]

### Técnico
- [Qué decisión técnica fue acertada]

### Colaboración
- [Qué funcionó bien entre agentes]

---

## ❌ Lo que No Funcionó

### Procesos
- [Qué proceso falló o fue ineficiente]

### Técnico
- [Qué decisión técnica causó problemas]

### Colaboración
- [Qué falló en la comunicación entre agentes]

---

## 🤔 Lecciones Aprendidas

1. **[Lección 1]:** [Descripción y cómo aplicarla]
2. **[Lección 2]:** [Descripción y cómo aplicarla]

---

## 🎯 Acciones de Mejora

| Acción | Responsable | Deadline | Prioridad |
|--------|-------------|----------|-----------|
| [Acción 1] | [AGENTE] | [Fecha] | Alta/Media/Baja |
| [Acción 2] | [AGENTE] | [Fecha] | Alta/Media/Baja |

---

## 📝 Ajustes a la Metodología

### Propuestos
- [ ] [Ajuste 1 a INTEGRA]
- [ ] [Ajuste 2 a prompts]

### Aprobados (por Frank)
- [X] [Ajuste ya implementado]

---

## 🔮 Próximo Sprint

### Foco Principal
[Objetivo principal del próximo sprint]
```
