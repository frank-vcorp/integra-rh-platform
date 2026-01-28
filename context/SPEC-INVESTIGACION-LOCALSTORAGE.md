# SPEC: Borrador Local (Investigación Laboral)

**ID:** ARCH-20260128-09  
**Ruta:** context/SPEC-INVESTIGACION-LOCALSTORAGE.md  
**Fecha:** 2026-01-28  
**Alcance:** Modal de Investigación Laboral en CandidatoDetalle

---

## Objetivo
Evitar pérdida de información en el modal de Investigación Laboral cuando el usuario cambia de pestaña o cierra el modal antes de guardar, mediante persistencia local en el navegador.

## Decisión
Implementar **borradores en localStorage** por empleo (workHistoryId) y candidato, sin tocar backend.

## Requisitos
- Guardar un borrador por empleo usando `localStorage`.
- Restaurar el borrador automáticamente al abrir el modal.
- Mantener el borrador si el usuario cancela o cierra el modal.
- **Limpiar borrador** al guardar exitosamente en backend.
- No modificar el schema ni rutas tRPC.

## Clave de almacenamiento
Formato sugerido:
```
investigationDraft:v1:{candidateId}:{workHistoryId}
```

## Datos a persistir
- Mapa plano `campo -> valor` usando los `name` de inputs/textarea/select.
- Se guardan cadenas (`string`), incluyendo cadenas vacías.

## Restauración
- Al abrir el modal, leer el borrador y aplicar valores a los campos existentes.
- Ajustar dinámicamente el número de filas de periodos si el borrador incluye índices mayores.

## Limpieza
- En `onSuccess` de guardado de investigación, eliminar el borrador correspondiente.

## Consideraciones
- Persistencia local es **por navegador** y no reemplaza autosave backend.
- No hay auditoría ni compartición entre dispositivos.

## Archivos a modificar
- integra-rh-manus/client/src/pages/CandidatoDetalle.tsx
