---
name: generar-dictamen
description: "Genera un Dictamen Técnico para documentar el análisis y resolución de un error o bug. USE FOR: bugs complejos, errores recurrentes, problemas que requieren análisis forense, fallos en producción, debugging que necesita documentación. DO NOT USE FOR: errores triviales de sintaxis, decisiones de arquitectura (usar generar-adr), planificación de features (usar generar-spec)."
---

# Skill: Generar Dictamen Técnico

## Instrucciones

### Paso 1: Reproducir y Documentar el Síntoma
Antes de escribir el dictamen:
1. Reproducir el error (o documentar por qué no es reproducible)
2. Capturar el mensaje de error exacto, stack trace y contexto
3. Identificar desde cuándo ocurre (commit, deploy, configuración)

### Paso 2: Análisis Forense
1. Buscar la causa raíz, no solo el síntoma
2. Identificar TODOS los archivos afectados
3. Verificar si hay otros lugares con el mismo patrón vulnerable

### Paso 3: Generar ID
- Formato: `FIX-YYYYMMDD-NN`
- Este ID debe ir en el commit del fix

### Paso 4: Documentar la Solución
- Incluir código ANTES y DESPUÉS
- Explicar POR QUÉ la solución funciona, no solo QUÉ se cambió
- Definir cómo se validó que funciona

### Paso 5: Prevención
Todo dictamen debe incluir al menos una acción preventiva (test, lint rule, validación).

### Paso 6: Ubicación
- Guardar en: `context/interconsultas/DICTAMEN-FIX-YYYYMMDD-NN.md`

---

## Plantilla

```markdown
# DICTAMEN TÉCNICO: [Título del Problema]

- **ID:** FIX-YYYYMMDD-NN
- **Fecha:** YYYY-MM-DD
- **Solicitante:** [SOFIA/GEMINI/INTEGRA]
- **Estado:** [EN ANÁLISIS / ✅ VALIDADO / ❌ REQUIERE MÁS CONTEXTO]

---

## A. Análisis de Causa Raíz

### Síntoma
[Qué se observó - mensaje de error, comportamiento inesperado]

### Hallazgo Forense
[Qué se descubrió al investigar]

### Causa
[La razón técnica del problema]

---

## B. Justificación de la Solución

### Acción Tomada
[Qué se hizo para resolver el problema]

### Código Afectado
// Antes
[código problemático]

// Después
[código corregido]

### Validación
[Cómo se verificó que funciona]

---

## C. Instrucciones de Handoff para [AGENTE]

1. [Paso específico 1]
2. [Paso específico 2]
3. [Paso específico 3]

---

## D. Prevención Futura

- [ ] Agregar test para este caso
- [ ] Actualizar documentación
- [ ] Considerar lint rule

---

## Referencias
- Archivos modificados: `path/to/file.ts`
- Commit: [hash]
- Relacionado: [otros IDs si aplica]

---

*Dictamen generado bajo Metodología INTEGRA v3.1.0*
```
