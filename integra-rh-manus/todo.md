# INTEGRA-RH - Lista de Tareas del Proyecto

## 🎯 Objetivo
Desarrollar plataforma completa de gestión de RRHH para la consultora Paula León con todas las funcionalidades de la Fase 1.

---

## 📋 Funcionalidades Principales

### 1. Autenticación y Roles
- [x] Sistema de login con Manus Auth
- [x] Roles: Admin (Paula) y Cliente Empresarial
- [x] Diferenciación de roles en backend
- [x] Protección de rutas por rol
- [x] Logout funcional

### 2. Estructura de Datos (Base de Datos)
- [x] Tabla `clients` (Clientes empresariales)
- [x] Tabla `posts` (Puestos de trabajo)
- [x] Tabla `candidates` (Candidatos)
- [x] Tabla `processes` (Procesos de evaluación)
- [x] Tabla `workHistory` (Historial laboral por candidato)
- [x] Tabla `candidateComments` (Comentarios por candidato)
- [x] Tabla `processComments` (Comentarios por proceso)
- [x] Tabla `surveyors` (Encuestadores)
- [x] Tabla `payments` (Pagos a encuestadores)
- [x] Tabla `documents` (Documentos adjuntos)
- [x] Tabla `clientAccessTokens` (Tokens de acceso único para clientes)

### 3. Dashboard Administrativo (Paula)
- [x] Vista principal con navegación
- [x] Estadísticas generales del dashboard
- [x] Menú lateral con todas las secciones
- [x] Panel de Clientes (lista y detalles)
- [x] Panel de Candidatos (lista y detalles)
- [x] Panel de Procesos (lista y detalles)
- [x] Panel de Puestos (lista y detalles)
- [x] Panel de Encuestadores (lista y detalles)
- [x] Panel de Pagos (lista y detalles)

### 4. Formularios de Creación (CRUD)
- [x] Formulario: Crear Cliente
- [x] Formulario: Editar Cliente
- [x] Formulario: Crear Puesto
- [x] Formulario: Editar Puesto
- [x] Formulario: Crear Candidato
- [x] Formulario: Editar Candidato
- [x] Formulario: Crear Proceso (con generación automática de clave ILA/ESE)
- [ ] Formulario: Editar Proceso
- [ ] Generación automática de clave de proceso (ILA-2025-XXX, ESE-2025-XXX)
- [ ] Cálculo automático de consecutivo

### 5. Gestión de Candidatos
- [x] Vista de detalle de candidato
- [x] Sección: Información personal
- [x] Sección: Historial laboral
- [x] Formulario: Añadir empleo al historial
- [x] Formulario: Editar empleo del historial
- [x] Sección: Comentarios internos
- [ ] Sección: Procesos asociados
- [ ] Sección: Pruebas psicométricas
- [ ] Sección: Documentos

### 6. Integración con API de Psicométricas
- [x] Función: Asignar batería de pruebas
- [x] Función: Reenviar invitación
- [x] Función: Webhook para recibir resultados
- [x] Endpoint: Consultar resultados (JSON)
- [x] Endpoint: Descargar reporte PDF
- [ ] Almacenamiento de PDFs en S3 Storage
- [ ] Visualización de resultados en dashboard

### 7. Integración con SendGrid
- [x] Función: Enviar correo de invitación a candidato
- [x] Template de correo profesional
- [x] Envío de notificaciones a clientes
- [x] Confirmaciones de proceso
- [x] Envío de enlaces de acceso único a clientes

### 8. Portal para Clientes Empresariales
- [x] Sistema de enlaces únicos (sin contraseñas)
- [x] Ruta pública `/cliente/:token` para validar acceso
- [x] Validación de tokens con expiración de 30 días
- [ ] Dashboard de cliente (solo lectura)
- [ ] Vista: Mis candidatos
- [ ] Vista: Mis procesos
- [ ] Vista: Detalle de candidato (información limitada)
- [ ] Vista: Detalle de proceso
- [ ] Descarga de dictámenes finalizados
- [ ] Visualización de estatus en tiempo real
- [ ] Reglas de seguridad: Solo ver sus propios datos

### 9. Generación Automática de Dictámenes
- [ ] Template HTML profesional para dictamen
- [ ] Cloud Function: Generar dictamen en PDF
- [ ] Integración con Gemini AI para análisis
- [ ] Sección: Datos del candidato
- [ ] Sección: Datos del cliente
- [ ] Sección: Resultados de verificación laboral
- [ ] Sección: Resultados de visita domiciliaria
- [ ] Sección: Resultados de pruebas psicométricas
- [ ] Sección: Calificación final
- [ ] Sección: Recomendaciones
- [ ] Almacenamiento en Firebase Storage
- [ ] Preview antes de generar
- [ ] Opción de editar antes de finalizar

### 10. Asistente con Gemini AI
- [ ] Análisis automático de datos del candidato
- [ ] Generación de recomendaciones
- [ ] Sugerencia de calificación final
- [ ] Redacción asistida de secciones del dictamen
- [ ] Detección de inconsistencias en datos
- [ ] Resumen de información compleja

### 11. Gestión de Encuestadores
- [ ] Formulario: Registrar encuestador
- [ ] Lista de encuestadores
- [ ] Asignación de visitas domiciliarias
- [ ] Registro de resultados de visita
- [ ] Historial de asignaciones por encuestador

### 12. Gestión de Pagos
- [ ] Formulario: Registrar pago a encuestador
- [ ] Lista de pagos (pendientes y realizados)
- [ ] Vinculación pago-proceso-encuestador
- [ ] Reportes de pagos por período
- [ ] Estatus de pagos

### 13. Sistema de Comentarios y Seguimiento
- [ ] Añadir comentarios internos a candidatos
- [ ] Añadir comentarios a procesos
- [ ] Bitácora de cambios por proceso
- [ ] Historial de acciones
- [ ] Autor y fecha de cada comentario

### 14. Gestión de Documentos
- [ ] Subir CV del candidato
- [ ] Subir identificaciones
- [ ] Subir comprobantes
- [ ] Subir evidencias fotográficas de visitas
- [ ] Visualización de documentos
- [ ] Descarga de documentos
- [ ] Almacenamiento en Firebase Storage

### 15. Mejoras de UI/UX
- [ ] Diseño responsivo (móvil, tablet, desktop)
- [ ] Paleta de colores profesional
- [ ] Tipografía moderna
- [ ] Animaciones y transiciones suaves
- [ ] Notificaciones toast
- [ ] Loaders y spinners
- [ ] Estados vacíos informativos
- [ ] Mensajes de error claros
- [ ] Confirmaciones de acciones críticas

### 16. Búsqueda y Filtros
- [ ] Búsqueda global de candidatos
- [ ] Filtros por cliente
- [ ] Filtros por estatus de proceso
- [ ] Filtros por fecha
- [ ] Filtros por puesto
- [ ] Ordenamiento de listas

### 17. Estadísticas y Reportes
- [ ] Dashboard con KPIs principales
- [ ] Total de candidatos
- [ ] Total de procesos activos
- [ ] Total de procesos finalizados
- [ ] Procesos por cliente
- [ ] Gráficas de tendencias
- [ ] Exportación de datos

### 18. Seguridad
- [ ] Reglas de Firestore por rol
- [ ] Validación en Cloud Functions
- [ ] Sanitización de inputs
- [ ] Protección contra inyección
- [ ] Rate limiting en APIs
- [ ] Logs de auditoría

### 19. Testing y Validación
- [ ] Datos de ejemplo cargados
- [ ] Pruebas de flujos principales
- [ ] Validación de integraciones
- [ ] Pruebas de seguridad
- [ ] Pruebas de performance

### 20. Documentación
- [ ] Manual de usuario para Paula (admin)
- [ ] Manual de usuario para clientes
- [ ] Documentación técnica del sistema
- [ ] Guía de deployment
- [ ] Comentarios en código
- [ ] README del proyecto

---

## 🚀 Prioridades

### Alta Prioridad (Semana 1-2)
- Autenticación y roles
- Estructura de datos
- Dashboard administrativo
- Formularios de creación
- Gestión de candidatos

### Media Prioridad (Semana 2-3)
- Portal de clientes
- Integración con Psicométricas
- Integración con SendGrid
- Generación de dictámenes

### Baja Prioridad (Semana 3-4)
- Asistente Gemini AI
- Gestión de encuestadores
- Mejoras de UI/UX avanzadas
- Estadísticas y reportes

---

## 📝 Notas
- Usar credenciales reales de APIs proporcionadas
- Implementar datos de ejemplo para demostración
- Priorizar funcionalidad sobre estética en primera iteración
- Validar con usuario después de cada módulo importante

### 21. Mejoras de UX - Formularios Integrados
- [x] Desde Alta de Cliente: poder crear Candidato, Puesto y Proceso en una sola ventana
- [x] Desde Alta de Candidato: poder crear Puesto y Proceso en una sola ventana
- [x] Validación de flujo completo sin cambiar de ventana
- [x] Botones de acceso rápido en Dashboard

### 22. Mejoras de UX - Flujos Integrados en Formularios Existentes
- [x] Desde formulario de Cliente: opción "Continuar con Candidato" después de crear
- [x] Desde formulario de Candidato: opción "Continuar con Puesto" después de crear
- [x] Modal/Dialog para continuar el flujo sin salir de la página actual
- [x] Flujo Puesto → Proceso con datos pre-cargados

### 23. Portal de Clientes Empresariales
- [x] Dashboard para clientes (solo sus estadísticas)
- [x] Vista "Mis Candidatos" (filtrada por cliente)
- [x] Vista "Mis Procesos" (filtrada por cliente)
- [x] Sistema de gestión de usuarios clientes
- [x] Vincular usuario cliente con empresa específica
- [x] Menú lateral adaptado según rol (admin vs client)
- [x] Página de gestión de usuarios (CRUD completo)

### 24. Sistema de Enlaces Únicos para Clientes
- [x] Crear tabla `clientAccessTokens` en base de datos
- [x] Generar token único al crear proceso
- [x] Helpers de backend para generar y validar tokens (server/lib/clientAccessTokens.ts)
- [x] Router tRPC clientAccess con validateToken y getClientData
- [x] Enviar email automático con enlace de acceso (sendClientAccessLink)
- [x] Ruta pública `/cliente/:token` para validar acceso
- [x] Página ClienteAcceso.tsx para manejar acceso mediante token
- [x] Token temporal válido por 30 días
- [x] Restaurar Manus OAuth para administradores
- [ ] Dashboard filtrado por clientId desde token (pendiente)
- [ ] Botón "Reenviar enlace" en panel de admin (pendiente)
- [ ] Integrar validación de token con DashboardLayout para mostrar menú filtrado


### 25. Mejoras Solicitadas por Paula
- [x] Ampliar opciones de tipos de procesos (14 opciones totales)
- [x] Agregar campo "Causal de Salida por parte de RH" en historial laboral
- [x] Agregar campo "Causal de Salida por parte del Jefe Inmediato" en historial laboral
- [x] Agregar 11 opciones de causales de salida
- [x] Cambiar etiqueta "Tipo de Producto" por "Proceso a Realizar"
- [x] Implementar cálculo automático de tiempo trabajado en historial laboral


### 26. Portal de Clientes - Urgente para HOY
- [x] Completar página ClienteAcceso.tsx con redirección al dashboard
- [x] Crear contexto de autenticación para clientes (ClientAuthContext)
- [x] Dashboard de cliente filtrado mostrando solo sus procesos
- [x] Vista de lista de procesos del cliente
- [x] Vista de detalle de proceso para cliente
- [x] Vista de lista de candidatos del cliente
- [x] Vista de detalle de candidato para cliente
- [x] Protección de rutas: solo ver datos propios
- [x] Rutas configuradas en App.tsx
- [ ] Probar flujo completo: enlace → dashboard → ver procesos


### 27. Bugs Conocidos
- [ ] Portal de clientes: Bug en validación de tokens - problema con comparación de fechas/timezone
  - Token existe en BD pero validación falla por comparación de fechas
  - Necesita ajuste en lógica de comparación de fechas en validateClientToken
  - Logs muestran: "No se encontró token válido" aunque el token existe en BD
