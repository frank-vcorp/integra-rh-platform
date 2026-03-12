---
name: generar-discovery
description: "Genera un Discovery de proyecto para mapear la estructura, stack tecnológico y estado de un proyecto existente o nuevo. USE FOR: primera vez en un proyecto, onboarding a un codebase desconocido, auditoría inicial de proyecto, entender qué hay antes de planificar. DO NOT USE FOR: proyectos donde ya existe `context/00_ARQUITECTURA.md` actualizado."
---

# Skill: Generar Discovery de Proyecto

## Instrucciones

### Paso 1: Explorar el Proyecto
1. Listar la estructura de carpetas principales (máximo 3 niveles)
2. Identificar archivos de configuración (`package.json`, `tsconfig.json`, `docker-compose.yml`, etc.)
3. Buscar documentación existente (`README.md`, docs/, etc.)

### Paso 2: Identificar Stack
Para cada capa (Frontend, Backend, DB, Hosting, CI/CD):
1. Detectar la tecnología desde archivos de configuración
2. Verificar versiones desde lockfiles o configs
3. No adivinar — si no es claro, marcarlo como "Por confirmar"

### Paso 3: Validar Estado
Ejecutar en terminal:
- Build: `npm run build` / `pnpm build` / equivalente
- Tests: `npm test` / `pnpm test` / equivalente
- Linting: `npm run lint` si existe
- Documentar errores o warnings encontrados

### Paso 4: Formular Preguntas
Generar preguntas específicas para el humano — solo las que NO puedes responder con el código.

### Paso 5: Actualizar copilot-instructions.md
Con los datos recopilados, actualizar `.github/copilot-instructions.md` con:
1. Stack real detectado (Frontend, Backend, DB, Hosting)
2. Comandos verificados (build, test, dev — solo los que funcionaron en Paso 3)
3. Contexto de negocio (preguntar al humano si no es evidente)
4. Archivos "No Tocar" (si el humano indicó restricciones)

> Si el archivo no existe, crearlo. Si existe con placeholders, reemplazarlos con datos reales.

### Paso 6: Ubicación del Discovery
- Guardar en: `context/00_ARQUITECTURA.md` (documento principal)
- O como discovery temporal en: `context/DISCOVERY-[nombre-proyecto].md`

---

## Plantilla

```markdown
# 🔍 DISCOVERY: [Nombre del Proyecto]

**Fecha:** YYYY-MM-DD  
**Agente:** INTEGRA  
**ID:** ARCH-YYYYMMDD-01

---

## 1. Estructura del Proyecto

- **Carpetas principales:** [listar]
- **Tipo de proyecto:** [monorepo / single-app / library]
- **Frameworks detectados:** [Next.js, React, Express, etc.]

---

## 2. Stack Tecnológico

| Capa | Tecnología | Versión |
|------|------------|---------|
| Frontend | | |
| Backend | | |
| Base de datos | | |
| ORM | | |
| Hosting | | |
| CI/CD | | |

---

## 3. Archivos Clave Identificados

### Configuración
- `package.json` - Dependencias y scripts
- `tsconfig.json` - Configuración TypeScript
- `.env.example` - Variables de entorno requeridas

### Entry Points
- [path] - Descripción
- [path] - Descripción

### Documentación Existente
- `README.md` - Descripción general
- [otros docs si existen]

---

## 4. Estado Actual

- [ ] Compila sin errores
- [ ] Tests existentes pasan
- [ ] Documentación actualizada
- [ ] Variables de entorno configuradas

### Errores/Warnings Detectados
[pegar output si hay errores]

---

## 5. Dependencias Principales

### Producción
| Paquete | Versión | Propósito |
|---------|---------|-----------|
| | | |

### Desarrollo
| Paquete | Versión | Propósito |
|---------|---------|-----------|
| | | |

---

## 6. Preguntas para el Humano

1. ¿Cuál es el **objetivo principal** de este proyecto?
2. ¿Hay **features en progreso** que deba conocer?
3. ¿Existe **deuda técnica conocida**?
4. ¿**Quién más trabaja** en esto? (humanos u otros agentes)
```
