---
id: ARCH-20260311-01
target: Dashboard del Cliente Final (Solo Lectura)
---

# SPEC: Dashboard del Cliente Final

## 1. Contexto y Objetivo
**Problema:** El usuario final (cliente/empresa) debe poder consultar el estado de sus procesos, candidatos y resultados dictaminados por el analista sin posibilidad de edición, manteniendo un entorno 100% de solo lectura.
**Solución:** Consolidar una serie de vistas (Dashboard, Proceso Detalle, Candidato Detalle) diseñadas con un perfil "executive-view", donde el cliente pueda acceder a toda la información generada, graficas radiales de match, estatus de pruebas y dictamenes del analista.

## 2. Alcance
- Perfil: Cliente Final (solo lectura)
- Vistas a refinar/crear:
  - `ClienteDashboard.tsx`: Vista general de procesos y candidatos recientes.
  - `ClienteProcesoDetalle.tsx`: Detalle del proceso, funnel de candidatos, y match profile.
  - `ClienteCandidatoDetalle.tsx`: Vista detallada del candidato con resultados psicosociales, referencias y el dictamen final.
- **Fuera de alcance:** Acciones de modificación, asignación de pruebas, o alta de requerimientos directos por esta vía en la V1.

## 3. Experiencia de Usuario (UX)
### 3.1 Diseño Visual
- Dashboard ejecutivo con KPIs y gráficas (shadcn cards y tremor/recharts).
- Esquema de colores neutral para lectura fácil.
- Badges de colores para el estatus de candidatos (Aprobado, Pendiente, Rechazado).
- Protección de rutas exclusiva para el rol `cliente`.

### 3.2 Flujo de Usuario
1. El cliente inicia sesión.
2. Es redirigido a `/cliente/dashboard`.
3. Selecciona un proceso activo.
4. Explora los candidatos en etapa de dictamen o final.
5. Abre el detalle de un candidato y visualiza el reporte completo generado por el analista.

### 3.3 Arquitectura
[Cliente] -> [UI Frontend (Dashboard)] -> [tRPC Router: `dashboardRouter` y `clientesRouter`] -> [Drizzle DB] (Queries de solo lectura).

## 4. Requisitos
### 4.1 Funcionales
- [ ] RF-01: El cliente puede ver una lista de sus procesos abiertos/cerrados.
- [ ] RF-02: El cliente puede ver la lista de candidatos asociados a sus procesos.
- [ ] RF-03: El cliente puede ver el detalle de un candidato, excluyendo campos de uso interno o notas privadas no marcadas para cliente.
- [ ] RF-04: El cliente puede descargar un reporte PDF (o vista imprimible) del candidato.

### 4.2 No Funcionales
- [ ] RNF-01: Rendimiento: La carga inicial del dashboard debe ser < 1s.
- [ ] RNF-02: Seguridad: Solo clientes pueden acceder. Si un analista entra a su URL no es su flujo o un cliente no puede acceder a `/procesos`.

## 5. Diseño Técnico
### 5.1 Endpoints
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `trpc.clientes.clientDashboard` | Obtener métricas y procesos recientes |
| GET | `trpc.clientes.getProcesoDetalle` | Obtener detalle incluyendo candidatos visibles |
| GET | `trpc.clientes.getCandidatoReporte` | Obtener reporte completo del candidato |

## 6. Plan de Implementación
| # | Tarea | Estimación | Asignado |
|---|-------|------------|----------|
| 1 | Revisión y setup UI base (Layout & Cards) | 2 pts | SOFIA |
| 2 | Refactorización de queries tRPC Client | 2 pts | SOFIA |
| 3 | Mapeo de datos del reporte analista a vista Cliente | 2 pts | SOFIA |

## 7. Criterios de Aceptación
- [ ] CA-01: Si un usuario logueado como cliente ingresa al sistema, ve solo sus datos y dashboard.
- [ ] CA-02: Ninguna vista del cliente presenta botones de edición o guardado.
- [ ] CA-03: Los resultados y el dictamen de los candidatos se muestran formateados y legibles.
