---
name: auditar-calidad
description: "Ejecuta una auditoría de calidad end-to-end del proyecto usando la checklist INTEGRA. USE FOR: antes de releases, en PRs importantes, cuando GEMINI revisa código, al cerrar un sprint. DO NOT USE FOR: revisiones menores de un solo archivo (usar los Soft Gates directamente)."
---

# Skill: Auditar Calidad (End-to-End)

## Instrucciones

### Paso 1: Determinar Alcance
Antes de auditar, definir:
- ¿Es auditoría completa (pre-release) o parcial (PR)?
- ¿Qué secciones aplican? (si no hay API, saltar "API")
- ¿Qué nivel de cobertura se espera?

### Paso 2: Ejecutar Checklist
Revisar cada categoría y marcar explícitamente lo cumplido.
Para cada item NO cumplido, documentar:
- Qué falta
- Impacto (Alto/Medio/Bajo)
- Acción requerida

### Paso 3: Resultado
Generar un resumen con: cumplido / no cumplido / no aplica.
Si hay items críticos no cumplidos, recomendar bloquear el release.

### Paso 4: Ubicación del Reporte
- Guardar en: `context/auditorias/AUDITORIA-YYYY-MM-DD.md`
- O incluir en el Checkpoint de entrega

---

## Checklist de Calidad

### Arquitectura y Diseño
- [ ] Separación de responsabilidades (dominio / aplicación / infraestructura)
- [ ] Modularidad y principios SOLID; dependencias explícitas
- [ ] Configuración por entorno (12-factor); .env no se commitea
- [ ] Contratos claros entre capas (interfaces/puertos)
- [ ] Decisiones registradas en context/ (ADRs/decisiones técnicas)

### Código y Mantenibilidad
- [ ] Tipado fuerte (TypeScript) en superficies públicas
- [ ] Linter y formateo consistentes (ESLint/Prettier)
- [ ] Revisiones de código (PRs) con criterios mínimos aceptados
- [ ] Documentación mínima por módulo (README/Docstrings)

### Pruebas y Cobertura
- [ ] Unitarias para lógica crítica (target >= 70%)
- [ ] Integración/contract tests para adaptadores externos
- [ ] E2E en flujos core (cuando aplique)
- [ ] Datos de prueba realistas y no sensibles

### Seguridad
- [ ] Gestión de secretos vía variables de entorno (nunca en repo)
- [ ] Dependabot o escaneo de vulnerabilidades
- [ ] Autenticación/Autorización con principio de menor privilegio
- [ ] Validación y saneamiento de inputs (OWASP Top 10)
- [ ] Logs sin datos sensibles (PII/secretos)

### Rendimiento y Confiabilidad
- [ ] Presupuestos de rendimiento (TTFB/LCP en web)
- [ ] Caching, paginación y lazy loading donde aplique
- [ ] Timeouts, reintentos e idempotencia en clientes HTTP
- [ ] Escalabilidad básica considerada (stateless)

### Observabilidad
- [ ] Logging estructurado con niveles
- [ ] Métricas clave (negocio y técnicas)
- [ ] Dashboards y alertas mínimas configuradas

### API (si aplica)
- [ ] Especificación OpenAPI/contrato versionado
- [ ] Modelo de errores consistente
- [ ] Rate limiting y protección contra abuso

### Frontend Web (UI/UX)
- [ ] Accesibilidad: WCAG 2.1 AA, navegación por teclado
- [ ] Responsive (móvil/desktop)
- [ ] Estados de carga/skeletons y manejo de errores visibles

### DevOps / CI-CD
- [ ] Ramas protegidas y revisiones requeridas
- [ ] Pipelines: lint + test + build en PR/main
- [ ] Reproducibilidad del build

### Documentación
- [ ] README con "Primeros pasos"
- [ ] Dossier técnico actualizado (context/dossier_tecnico.md)

---

**Cómo usar:**
- Revisar esta lista en cada PR importante y antes de releases.
- Marcar explícitamente lo cumplido y registrar desviaciones con justificación.
