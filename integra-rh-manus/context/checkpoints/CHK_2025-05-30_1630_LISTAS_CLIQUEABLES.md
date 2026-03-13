# Checkpoint: Listas Cliqueables

## Contexto
El usuario solicitó que "todas las listas" sean cliqueables en lugar de depender únicamente de los iconos de detalle o enlaces específicos en celdas, para mejorar la usabilidad (mayor área de clic).

## Cambios Realizados

### 1. `client/src/pages/Procesos.tsx`
- **Tabla (Desktop):** Se agregó `onClick` a cada `TableRow` para navegar a `/candidatos/${id}?tab=empleos`.
  - Se añadió `cursor-pointer` y `hover:bg-muted/50` para feedback visual.
  - Se agregó `e.stopPropagation()` al contenedor del `DropdownMenu` para evitar navegación accidental al abrir el menú de acciones.
- **Lista (Móvil):** Se agregó `onClick` al contenedor principal de la tarjeta de cada proceso.

### 2. `client/src/pages/Clientes.tsx`
- **Tabla (Desktop):** Se agregó `onClick` a cada `TableRow` con la misma lógica de redirección y estilos.
  - Se eliminó el `Link` explícito en la celda de "Clave", ya que ahora toda la fila es el enlace.
- **Lista (Móvil):** Se agregó `onClick` a las tarjetas individuales.

## Archivos Afectados
- `client/src/pages/Procesos.tsx`
- `client/src/pages/Clientes.tsx`

## Validación
- [x] Clic en cualquier parte de la fila redirige al expediente.
- [x] Clic en el menú de acciones NO redirige (gracias a `stopPropagation`).
- [x] Feedback visual (cursor pointer y hover) implementado.

## Estado
Vistas de lista principales actualizadas para soportar row-click navigation.
