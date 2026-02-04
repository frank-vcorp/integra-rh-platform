# Checkpoint: Múltiples Periodos Laborales con Puesto

**ID:** CHK_2026-02-03_MULTIPLE-PERIODOS-PUESTO
**Fecha:** 2026-02-03
**Autor:** GitHub Copilot (Agente INTEGRA)

## 📋 Resumen
Se implementó la funcionalidad para registrar múltiples periodos laborales dentro de una misma empresa, permitiendo especificar el puesto para cada periodo. Esto cubre casos de reingresos donde el trabajador regresa al mismo puesto o a uno diferente.

## 🛠 Cambios Técnicos

### Backend (`workHistory.ts`)
- Se actualizó el esquema Zod de `saveInvestigation` para que el objeto dentro del array `periodos` incluya el campo opcional `puesto` (string).
- Se actualizó la generación del prompt para la IA (`periodosTexto`), incluyendo el puesto en la descripción del contexto si está disponible.

### Frontend (`CandidatoDetalle.tsx`)
- **Lógica de Formulario (`handleInvestigationSubmit`)**: Se actualizó la recolección de datos dinámicos para extraer `puesto_${index}` y enviarlo al backend dentro de la propiedad `periodos`.
- **Gestión de Borradores (Drafts)**: Se actualizó la expresión regular que detecta campos dinámicos para incluir `puesto` (`/^(?:periodo(?:Empresa|Candidato)|puesto)_(\d+)$/`), asegurando que la persistencia local funcione para estos nuevos campos.
- **Interfaz de Usuario (Modal)**: Se agregó un campo `Input` para "Puesto en el periodo" dentro del bucle de periodos dinámicos.
- **Visualización (Tarjeta Resumen)**: Se modificó la vista de detalle de "Historial Laboral" (Card) para priorizar la visualización de la lista de `periodos` validados (concatenados con `+`) sobre los campos legacy de fechas.

## 🧪 Pruebas de Impacto
- **Compatibilidad**: Los registros antiguos sin `periodos` (o sin `puesto` en `periodos`) se seguirán visualizando correctamente usando los fallbacks.
- **Persistencia**: El borrador local (localStorage) ahora guarda y restaura los puestos de cada periodo dinámico.
- **Visualización**: La tarjeta muestra "Periodo 1 [Puesto] + Periodo 2 [Puesto]" si existen múltiples registros.

## 📝 Notas
- La sección "Perfil del puesto" (Bloque 1) sigue existiendo como resumen general (Puesto Inicial / Final global), mientras que los puestos en los periodos (Bloque 2) permiten granularidad por contrato.

---
**Estado:** `[✓] Implementado`
