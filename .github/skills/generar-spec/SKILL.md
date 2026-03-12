---
name: generar-spec
description: "Genera una SPEC (especificación técnica) para una funcionalidad o feature. USE FOR: planificar una nueva funcionalidad, documentar requisitos técnicos, definir arquitectura de una feature, crear plan de implementación. DO NOT USE FOR: bugs (usar generar-dictamen), decisiones de arquitectura sin implementación (usar generar-adr)."
---

# Skill: Generar SPEC de Funcionalidad

## Instrucciones

### Paso 1: Recopilar Contexto
Antes de generar la SPEC, necesitas:
1. Leer `PROYECTO.md` para entender el estado actual del backlog
2. Si existe `context/00_ARQUITECTURA.md`, revisarlo para alinearse con la arquitectura
3. Preguntar al usuario si falta información crítica (objetivo, usuarios, restricciones)

### Paso 2: Generar ID
- Formato: `ARCH-YYYYMMDD-NN` (donde NN es secuencial del día)
- Verificar en `context/SPECs/` que no exista un ID duplicado

### Paso 3: Completar la SPEC
Usa la plantilla de abajo. **NO dejes secciones vacías** — si no aplica, escribe "N/A" con justificación.

### Paso 4: Ubicación del Archivo
- Guardar en: `context/SPECs/SPEC-[nombre-feature].md`
- Notificar a CRONISTA para actualizar `PROYECTO.md`

### Paso 5: Validación
Antes de entregar, verificar:
- [ ] Todos los requisitos funcionales son verificables (tienen criterio de aceptación)
- [ ] El plan de implementación tiene tareas concretas con estimaciones
- [ ] Los riesgos tienen estrategia de mitigación
- [ ] No hay dependencias circulares

---

## Plantilla

```markdown
# SPEC: [Nombre de la Funcionalidad]

**ID:** ARCH-YYYYMMDD-NN  
**Autor:** INTEGRA  
**Fecha:** YYYY-MM-DD  
**Estado:** [Borrador/En Revisión/Aprobado]

---

## 1. Resumen Ejecutivo
[Descripción breve de qué se va a construir y por qué]

---

## 2. Contexto y Problema
### 2.1 Situación Actual
[Cómo funciona actualmente o por qué no existe]

### 2.2 Problema a Resolver
[Pain points específicos]

### 2.3 Usuarios Afectados
[Quiénes se benefician]

---

## 3. Solución Propuesta

### 3.1 Descripción General
[Qué se va a construir]

### 3.2 Flujo de Usuario
1. [Paso 1]
2. [Paso 2]
3. [Paso 3]

### 3.3 Arquitectura
[Diagrama ASCII o descripción de componentes]

---

## 4. Requisitos

### 4.1 Funcionales
- [ ] RF-01: [Requisito]
- [ ] RF-02: [Requisito]

### 4.2 No Funcionales
- [ ] RNF-01: Performance - [Métrica]
- [ ] RNF-02: Seguridad - [Requisito]

---

## 5. Diseño Técnico

### 5.1 Modelo de Datos
[Interfaces, esquemas de DB, tipos]

### 5.2 Endpoints (si aplica)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/recurso | Crear recurso |
| GET | /api/recurso/:id | Obtener recurso |

### 5.3 Componentes UI (si aplica)
- `NuevoComponente.tsx` - [Propósito]

---

## 6. Plan de Implementación

### 6.1 Tareas
| # | Tarea | Estimación | Asignado |
|---|-------|------------|----------|
| 1 | [Tarea] | 2h | SOFIA |
| 2 | [Tarea] | 4h | SOFIA |

### 6.2 Dependencias
- [Dependencia 1]

### 6.3 Riesgos
| Riesgo | Mitigación |
|--------|------------|
| [Riesgo] | [Estrategia] |

---

## 7. Criterios de Aceptación
- [ ] CA-01: [Criterio verificable]
- [ ] CA-02: [Criterio verificable]
```
