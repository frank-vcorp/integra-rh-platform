# 📋 MICRO-SPRINT: Armados Cliente v2 — Fase 1 Base Editorial

**Fecha:** 2026-04-08  
**Proyecto:** Integra RH  
**Duración estimada:** 3-4 horas  
**Budget:** 6/6 puntos

---

## 🎯 Entregable Demostrable

> **En una frase:** La analista puede generar un borrador de Armados con índice navegable, estructura moderna alineada al proceso 82 y un bloque de ubicación fuerte con mapa clicable y fachada principal.

---

## ✅ Tareas Técnicas

| Pts | Tarea | Estado |
|-----|-------|--------|
| (2) | Normalizar llaves modernas vs legacy en captura de visita y secciones críticas | [ ] |
| (1) | Corregir anchors base y hacer consistente el índice editorial | [ ] |
| (2) | Implementar bloque hero de ubicación con mapa + Google Maps + fachada principal | [ ] |
| (1) | Validar preview HTML con proceso 82 y ajustar captions/jerarquía mínima | [ ] |

**Total:** 6/6 puntos

---

## ⚠️ Criterio de Corte

> Si no queda funcional el bloque completo de mapa + fachada + índice, la fase no se considera terminada.
> **No se entrega funcionalidad a medias.**

---

## 🧪 Cómo Demostrar (Acceptance Criteria)

1. Ir a la tab Armados en el proceso 82.
2. Generar un borrador con `Visita domiciliaria` y `Formulario del encuestador` seleccionados.
3. Abrir la vista previa HTML.
4. Verificar que el índice navega a portada, resumen y secciones activas.
5. Verificar que la sección de ubicación muestra un mapa grande y debajo la fachada principal del domicilio.
6. Dar clic en el mapa y comprobar que abre Google Maps con el punto o query correcto.

---

## 📝 Notas de Sesión

### Decisiones Tomadas
- La foto principal de fachada será `fotos.fachadaCalle`.
- `fotos.fachadaPatio` se usa como fallback o evidencia secundaria.
- El mapa se renderiza desde `ubicacion.mapaCapturaUrl` y el enlace se arma con `ubicacion.gps`.

### Obstáculos Encontrados
- Pendiente durante ejecución.

### Aprendizajes
- Pendiente durante ejecución.

---

## 🏁 CIERRE MICRO-SPRINT

**Resultado:** ⏳ Pendiente

### Mini-Demo Realizada
- [ ] Funcionalidad demostrada
- [ ] Usuario validó que funciona

### Tareas Completadas
- [ ] Normalización moderna/legacy
- [ ] Índice navegable
- [ ] Bloque hero de ubicación
- [ ] Preview validado

### Checkpoint Generado
`context/checkpoints/CHK_2026-04-08_ARMADOS-V2-F1.md`

### Próximo Micro-Sprint (Preview)
> Publicación HTML-first, spreads visuales de evidencias y pruebas de navegación PDF.