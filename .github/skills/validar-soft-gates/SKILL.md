---
name: validar-soft-gates
description: "Valida los 4 Soft Gates (Compilación, Testing, Revisión, Documentación) antes de marcar una tarea como completada. USE FOR: al cerrar una tarea, antes de marcar [✓], cuando GEMINI audita código, al generar checkpoint. DO NOT USE FOR: auditoría completa del proyecto (usar auditar-calidad)."
---

# Skill: Validar Soft Gates

## Instrucciones

Los Soft Gates son 4 puertas de calidad obligatorias. Ninguna tarea puede marcarse como `[✓]` sin pasarlas todas.

> "No puedes marcar una tarea como completada si alguno de los gates falla."

### Flujo

```
Gate 1 (Compilación) → Gate 2 (Testing) → Gate 3 (Revisión) → Gate 4 (Documentación) → [✓]
```

Si alguno falla, la tarea vuelve a `[/]` para corrección.

---

## Gate 1: Compilación ✅

### Qué verificar
1. **TypeScript** compila sin errores: `pnpm tsc --noEmit` → 0 errors
2. **ESLint** pasa sin errores críticos: `pnpm lint` → 0 errors (warnings < 5)

### Criterios
- ❌ 0 errores (obligatorio)
- ⚠️ Warnings permitidos pero documentados

### Responsable: SOFIA (o quien implementó)

---

## Gate 2: Testing 🧪

### Qué verificar
1. **Tests unitarios**: 100% pasan
2. **Coverage mínimo**: 80% funciones nuevas, 60% global
3. **Tests de integración**: si existen, todos pasan

### Excepciones permitidas
- **Prototipo rápido (Spike)**: Skip con deuda técnica registrada (`DEBT-NNN`)
- **Solo documentación**: N/A (no requiere tests)
- **Hotfix crítico**: Solo Gate 1, tests después

### Responsable: SOFIA

---

## Gate 3: Revisión de Código 👁️

### Checklist de revisión

**Convenciones:**
- [ ] Cumple convenciones de nombres (camelCase, PascalCase, kebab-case)
- [ ] Sin código comentado (dead code)
- [ ] Imports organizados

**Calidad:**
- [ ] No hay código duplicado
- [ ] Funciones < 50 líneas (preferiblemente < 30)
- [ ] Complejidad ciclomática aceptable
- [ ] Principios SOLID aplicados

**Seguridad:**
- [ ] No hay secretos hardcoded
- [ ] Validación de inputs en APIs públicas
- [ ] Manejo de errores no expone stack traces
- [ ] Sin vulnerabilidades OWASP

**Performance:**
- [ ] Sin loops O(n²) innecesarios
- [ ] Queries a BD optimizadas
- [ ] Sin memory leaks

**Mantenibilidad:**
- [ ] Lógica clara y fácil de entender
- [ ] Sin acoplamiento excesivo
- [ ] Fácil de testear

### Resultados posibles
- **PASSED ✅**: Aprobado, proceder a Gate 4
- **CONDITIONAL PASS ⚠️**: Cambios menores, sin volver a [/]
- **FAILED ❌**: Cambios mayores, volver a [/]

### Responsable: GEMINI

---

## Gate 4: Documentación 📚

### Qué verificar
- [ ] README.md actualizado (si aplica: nueva feature, módulo o API)
- [ ] Decisiones técnicas en dossier_tecnico.md o context/decisions/
- [ ] JSDoc en funciones públicas (solo si la lógica no es obvia)
- [ ] PROYECTO.md actualizado con estado [✓]
- [ ] Checkpoint generado

### Cuándo NO aplica
- Cambios internos sin cambio de API
- Bugfixes menores
- Refactorización sin cambios funcionales

### Responsable: INTEGRA

---

## Matriz de Decisión

| Gates | Estado | Acción |
|-------|--------|--------|
| ✅✅✅✅ | `[✓]` Completado | Generar checkpoint |
| ❌... | `[/]` En progreso | Corregir compilación |
| ✅❌.. | `[/]` En progreso | Corregir tests |
| ✅✅❌. | `[/]` En progreso | Refactorizar según revisión |
| ✅✅✅❌ | `[/]` En progreso | Completar documentación |
| ⏭️⏭️⏭️⏭️ | `[!]` Bloqueado | Spike/hotfix, registrar deuda |

## Excepciones

| Caso | Gates aplicados | Condición |
|------|----------------|-----------|
| Prototipo (Spike) | Todos skipped | Registrar como `DEBT-NNN`, resolver antes de producción |
| Hotfix crítico | Solo Gate 1 | Frank autoriza bypass. Tests/docs después |
| Solo documentación | Solo Gate 4 | Cambios en archivos .md |
