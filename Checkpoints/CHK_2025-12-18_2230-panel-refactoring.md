# Checkpoint: Refactorización de Paneles (Buró y Legal)

## Cambios Realizados
1. **Frontend (`ProcesoDetalle.tsx`)**:
   - **Buró de Crédito**: Se eliminaron los campos de captura manual (Estatus, Score, Aprobado). Se reemplazaron por un área de carga de PDF único. Si existe un PDF cargado, se muestra el enlace y opción de eliminar.
   - **Investigación Legal**: Se eliminó "Observaciones IMSS". Se agregó un área de captura de imagen vía portapapeles (Paste) que sube automáticamente la imagen como evidencia. Se integró la visualización de la evidencia cargada.

2. **Backend (`server/routers/processes.ts`)**:
   - Se actualizó el esquema Zod de `updatePanelDetail` para permitir los nuevos campos:
     - `investigacionLegal.evidenciaImgUrl`
     - `buroCredito.pdfUrl`

3. **Base de Datos**:
   - No se requirieron migraciones SQL ya que los cambios ocurrieron dentro de columnas tipo JSON existente.

## Estado
- Código actualizado y validado estáticamente.
- Listo para despliegue.

## Siguientes Pasos
- Desplegar a Cloud Run.
- Verificar funcionalidad en ambiente productivo.
