---
name: generar-adr
description: "Genera un ADR (Architectural Decision Record) para documentar una decisión técnica o de arquitectura. USE FOR: elegir entre tecnologías, definir patrones de diseño, justificar trade-offs técnicos, documentar decisiones de stack. DO NOT USE FOR: planificar implementación completa (usar generar-spec), documentar bugs (usar generar-dictamen)."
---

# Skill: Generar ADR (Architectural Decision Record)

## Instrucciones

### Paso 1: Identificar la Decisión
Un ADR se necesita cuando hay:
- Múltiples opciones técnicas viables
- Un trade-off significativo que justificar
- Una decisión que afecta la arquitectura a largo plazo
- Algo que un desarrollador futuro podría cuestionar ("¿por qué hicieron esto así?")

### Paso 2: Generar ID
- Formato ADR: `ADR-NNN` (secuencial del proyecto)
- Formato intervención: `ARCH-YYYYMMDD-NN`
- Verificar en `context/decisions/` que no exista duplicado

### Paso 3: Evaluar Opciones
Para cada opción:
1. Describir qué implica implementarla
2. Listar al menos 2 pros y 2 contras
3. Marcar la opción elegida con ✅

### Paso 4: Documentar Consecuencias
Ser honesto sobre los trade-offs. Un buen ADR reconoce lo que se pierde, no solo lo que se gana.

### Paso 5: Ubicación
- Guardar en: `context/decisions/ADR-NNN-[nombre-decisión].md`

---

## Plantilla

```markdown
# ADR-NNN: [Título de la Decisión]

**ID:** ARCH-YYYYMMDD-NN  
**Fecha:** YYYY-MM-DD  
**Estado:** [Propuesto/Aceptado/Deprecado/Reemplazado]  
**Decisor:** INTEGRA

---

## Contexto
[Describe la situación que requiere una decisión. ¿Qué problema estamos tratando de resolver?]

---

## Decisión
[La decisión tomada, en forma clara y directa]

**Elegimos [opción X] porque [razón principal].**

---

## Opciones Consideradas

### Opción A: [Nombre]
**Descripción:** [Qué implica esta opción]

| Pros | Contras |
|------|---------|
| [Pro 1] | [Contra 1] |
| [Pro 2] | [Contra 2] |

### Opción B: [Nombre]
**Descripción:** [Qué implica esta opción]

| Pros | Contras |
|------|---------|
| [Pro 1] | [Contra 1] |
| [Pro 2] | [Contra 2] |

### Opción C: [Nombre] ✅ (Elegida)
**Descripción:** [Qué implica esta opción]

| Pros | Contras |
|------|---------|
| [Pro 1] | [Contra 1] |
| [Pro 2] | [Contra 2] |

---

## Consecuencias

### Positivas
- [Beneficio 1]
- [Beneficio 2]

### Negativas
- [Trade-off 1]
- [Trade-off 2]

### Riesgos
- [Riesgo 1] → Mitigación: [estrategia]

---

## Implementación

### Tareas Derivadas
- [ ] [Tarea 1]
- [ ] [Tarea 2]

### Handoff
- **Implementación:** SOFIA
- **Revisión:** GEMINI

---

## Referencias
- [Documento relacionado]
- [Link externo]
```
