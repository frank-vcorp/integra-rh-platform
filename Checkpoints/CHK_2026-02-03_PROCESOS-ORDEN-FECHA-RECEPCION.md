# Checkpoint: Ordenamiento de Procesos por Fecha de Recepción

**ID:** CHK_2026-02-03_PROCESOS-ORDEN-FECHA-RECEPCION
**Fecha:** 2026-02-03
**Autor:** GitHub Copilot (Agente INTEGRA)

## 📋 Resumen
Se modificó el criterio de ordenamiento predeterminado en los listados de procesos. Ahora se ordenan descendentemente por la columna `Fecha de Recepción` en lugar de la fecha de creación del registro.

## 🛠 Cambios Técnicos

### Backend (`server/db.ts`)
- `getAllProcesses`: `orderBy(desc(processes.createdAt))` -> `orderBy(desc(processes.fechaRecepcion))`
- `getProcessesByClient`: `orderBy(desc(processes.createdAt))` -> `orderBy(desc(processes.fechaRecepcion))`
- `getProcessesByCandidate`: `orderBy(desc(processes.createdAt))` -> `orderBy(desc(processes.fechaRecepcion))`

## 🧪 Pruebas de Impacto
- **Listado General**: Al entrar al módulo de Procesos, los ítems aparecen ordenados cronológicamente según cuando fueron recibidos/solicitados.
- **Portal Cliente**: Los clientes verán sus procesos ordenados de la misma manera.
- **Historial Candidato**: Los procesos asociados a un candidato también respetan este orden.

---
**Estado:** `[✓] Implementado`
