---
name: generar-handoff
description: "Genera un documento Handoff para transferir una feature de un agente a otro con toda la información necesaria. USE FOR: pasar implementación de INTEGRA a SOFIA, solicitar revisión de GEMINI, delegar tareas entre agentes con contexto completo. DO NOT USE FOR: bugs (usar generar-dictamen), documentación interna (usar generar-checkpoint)."
---

# Skill: Generar Handoff de Feature

## Instrucciones

### Paso 1: Definir Roles
- **Owner**: Quién define la feature (normalmente INTEGRA)
- **Implementación**: Quién construye (normalmente SOFIA)
- **Revisión**: Quién valida (normalmente GEMINI)

### Paso 2: Ser Explícito en Seguridad
- Listar TODOS los endpoints con sus roles de acceso
- Documentar variables de entorno necesarias (sin valores reales)
- Marcar validaciones de input requeridas

### Paso 3: Definir UI/UX
Para cada pantalla o componente:
- Estados: idle / loading / error / success
- Condiciones de visibilidad
- Acciones al completar

### Paso 4: Criterios de Aceptación
Cada CA debe ser:
- **Verificable**: se puede probar con un paso concreto
- **Independiente**: no depende de otro CA para validarse
- **Completo**: cubre el happy path y los edge cases principales

### Paso 5: Ubicación
- Guardar en: `context/handoffs/HANDOFF-[nombre-feature].md`

---

## Plantilla

```markdown
# HANDOFF: [Nombre de la Feature]

**Fecha:** YYYY-MM-DD  
**Owner:** [INTEGRA/CODEX]  
**Implementación:** SOFIA  
**Revisión:** GEMINI  

---

## Objetivo
[Descripción clara de qué se va a implementar]

---

## Decisión Técnica
[Tecnología/enfoque elegido y por qué]

---

## Variables de Entorno
| Variable | Descripción | Entorno |
|----------|-------------|---------|
| `NOMBRE_VAR` | [Descripción] | Production |

**Notas:**
- NO usar `NEXT_PUBLIC_` para secretos
- Configurar en Vercel/Render Project Settings

---

## Seguridad
- [ ] Endpoint accesible solo para roles: [roles]
- [ ] Validación de input con Zod
- [ ] No loggear datos sensibles

---

## Endpoints / Cambios

### `POST /api/recurso`
**Request:**
```json
{
  "campo": "valor"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {}
}
```

**Errores:**
- `401`: No autenticado
- `403`: Rol no permitido
- `422`: Body inválido

---

## UI/UX
- Mostrar componente solo si: [condiciones]
- Estados: idle / loading / error / success
- Al completar: [acción]

---

## Criterios de Aceptación
- [ ] CA-01: [Criterio verificable]
- [ ] CA-02: [Criterio verificable]

---

## Fase 2 (posterior)
- [Mejora futura 1]
- [Mejora futura 2]
```
