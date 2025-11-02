# INTEGRA-RH - Documentación Técnica Completa

**Proyecto:** INTEGRA-RH - Plataforma de Gestión de Recursos Humanos  
**Cliente:** Dra. Paula León - Consultora de RRHH  
**Versión Actual:** 111d5294  
**Fecha:** 31 de Octubre, 2025  
**Autor:** Manus AI

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Stack Tecnológico](#stack-tecnológico)
4. [Estructura de Base de Datos](#estructura-de-base-de-datos)
5. [Arquitectura de Backend](#arquitectura-de-backend)
6. [Arquitectura de Frontend](#arquitectura-de-frontend)
7. [Integraciones Externas](#integraciones-externas)
8. [Flujos de Trabajo Implementados](#flujos-de-trabajo-implementados)
9. [Sistema de Autenticación](#sistema-de-autenticación)
10. [Metodología de Desarrollo](#metodología-de-desarrollo)
11. [Estado Actual del Proyecto](#estado-actual-del-proyecto)
12. [Bugs Conocidos](#bugs-conocidos)
13. [Próximos Pasos](#próximos-pasos)
14. [Guía para Continuar el Desarrollo](#guía-para-continuar-el-desarrollo)

---

## 1. Resumen Ejecutivo

**INTEGRA-RH** es una plataforma web completa para la gestión de procesos de recursos humanos desarrollada específicamente para la consultora de la Dra. Paula León. El sistema permite gestionar clientes empresariales, candidatos, puestos de trabajo y procesos de evaluación (Investigación Laboral y Análisis - ILA, Estudio Socioeconómico - ESE, entre otros).

La plataforma se encuentra en **Fase 1 de desarrollo** con aproximadamente **75% de completitud** de las funcionalidades core. El sistema administrativo está completamente funcional, con CRUD completo de todas las entidades, flujos de trabajo integrados, y dos integraciones externas operativas (Psicométricas y SendGrid). El portal de clientes está implementado pero tiene un bug crítico pendiente de resolución.

**Características principales implementadas:**

- Sistema administrativo completo con dashboard, navegación lateral y gestión de todas las entidades
- CRUD completo de clientes, candidatos, puestos y procesos
- Flujos de trabajo integrados (Completo y Rápido) que permiten crear múltiples entidades en una sola sesión
- Historial laboral de candidatos con cálculo automático de tiempo trabajado
- 14 tipos diferentes de procesos con generación automática de claves únicas
- Integración con API de Psicométricas (Evaluar.Online) para asignación y recepción de resultados
- Integración con SendGrid para envío de emails automáticos
- Sistema de enlaces únicos para acceso de clientes (infraestructura completa, con bug pendiente)
- Base de datos MySQL/TiDB con 12 tablas relacionales

**Tecnologías core:** React 19, TypeScript, Tailwind CSS 4, tRPC 11, Express 4, Drizzle ORM, MySQL/TiDB.

---

## 2. Arquitectura del Sistema

### 2.1 Visión General

INTEGRA-RH sigue una arquitectura **cliente-servidor moderna** con separación clara entre frontend y backend, comunicándose mediante **tRPC** para type-safety end-to-end. El sistema está desplegado en la infraestructura de Manus con auto-scaling y CDN global.

```
┌─────────────────────────────────────────────────────────────┐
│                      INTEGRA-RH                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────┐         ┌────────────────────┐     │
│  │                    │         │                    │     │
│  │   React Frontend   │◄───────►│  Express Backend   │     │
│  │   (Client SPA)     │  tRPC   │   (API Server)     │     │
│  │                    │         │                    │     │
│  └────────────────────┘         └──────────┬─────────┘     │
│           │                                 │                │
│           │                                 │                │
│           ▼                                 ▼                │
│  ┌────────────────────┐         ┌────────────────────┐     │
│  │   Tailwind CSS 4   │         │   Drizzle ORM      │     │
│  │   shadcn/ui        │         │                    │     │
│  └────────────────────┘         └──────────┬─────────┘     │
│                                             │                │
│                                             ▼                │
│                                  ┌────────────────────┐     │
│                                  │   MySQL / TiDB     │     │
│                                  │   (Database)       │     │
│                                  └────────────────────┘     │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                   Integraciones Externas                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Evaluar.    │  │   SendGrid   │  │   Manus      │     │
│  │  Online      │  │   (Email)    │  │   OAuth      │     │
│  │  (Psico)     │  │              │  │   (Auth)     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Capas de la Aplicación

El sistema está organizado en **cuatro capas principales**:

**Capa de Presentación (Frontend):**
- Componentes React con TypeScript
- Gestión de estado mediante React Query (integrado en tRPC)
- Routing con Wouter
- UI components de shadcn/ui
- Estilos con Tailwind CSS 4

**Capa de Lógica de Negocio (Backend):**
- Routers tRPC con procedimientos tipados
- Validación de datos con Zod
- Helpers de base de datos en `server/db.ts`
- Middlewares de autenticación y autorización

**Capa de Acceso a Datos:**
- Drizzle ORM para queries type-safe
- Esquema definido en `drizzle/schema.ts`
- Migraciones automáticas con `drizzle-kit`

**Capa de Integración:**
- Wrappers para APIs externas
- Webhooks para recepción de datos
- Helpers de email y autenticación

### 2.3 Patrones de Diseño Utilizados

El proyecto implementa varios patrones de diseño estándar de la industria:

**Repository Pattern:** Los helpers en `server/db.ts` actúan como repositorios que encapsulan la lógica de acceso a datos. Cada entidad tiene funciones específicas como `getUserByOpenId()`, `upsertUser()`, etc.

**Procedure Pattern (tRPC):** Toda la comunicación cliente-servidor se realiza mediante procedimientos tipados definidos en `server/routers.ts`. Esto garantiza type-safety end-to-end y elimina la necesidad de definir contratos manualmente.

**Context Pattern:** React Context se utiliza para gestión de estado global, específicamente en `ClientAuthContext` para autenticación de clientes y `ThemeContext` para temas visuales.

**Compound Component Pattern:** Los componentes de shadcn/ui siguen este patrón, permitiendo composición flexible de UI elements.

**Custom Hooks Pattern:** Hooks personalizados como `useAuth()` encapsulan lógica reutilizable de autenticación y estado.

---

## 3. Stack Tecnológico

### 3.1 Frontend

El frontend está construido con tecnologías modernas de React y herramientas de desarrollo de última generación.

| Tecnología | Versión | Propósito |
|-----------|---------|-----------|
| **React** | 19 | Framework principal de UI |
| **TypeScript** | 5.x | Type safety y mejor DX |
| **Vite** | 5.x | Build tool y dev server |
| **Tailwind CSS** | 4.x | Utility-first CSS framework |
| **shadcn/ui** | Latest | Componentes UI pre-construidos |
| **tRPC Client** | 11.x | Cliente para comunicación type-safe |
| **React Query** | 5.x | Data fetching y caching (integrado en tRPC) |
| **Wouter** | 3.x | Router ligero para SPA |
| **Lucide React** | Latest | Iconos SVG |
| **Streamdown** | Latest | Renderizado de Markdown |

**Decisiones técnicas clave:**

La elección de **React 19** permite aprovechar las últimas características como Server Components (aunque no se usan en este proyecto) y mejoras de performance. **TypeScript** es fundamental para mantener la integridad del código en un proyecto de esta escala.

**Tailwind CSS 4** fue seleccionado por su productividad y consistencia visual. La customización en `client/src/index.css` define variables CSS para temas (dark/light) y tokens de diseño reutilizables.

**shadcn/ui** proporciona componentes accesibles y bien diseñados que se pueden customizar completamente. A diferencia de librerías como Material-UI, shadcn/ui copia los componentes al proyecto, permitiendo modificaciones sin limitaciones.

**tRPC** es la pieza central de la comunicación cliente-servidor. Elimina la necesidad de definir tipos manualmente para requests/responses, y proporciona autocomplete en el cliente para todos los endpoints del servidor.

### 3.2 Backend

El backend utiliza Node.js con Express y tRPC para crear una API type-safe y escalable.

| Tecnología | Versión | Propósito |
|-----------|---------|-----------|
| **Node.js** | 22.x | Runtime de JavaScript |
| **Express** | 4.x | Framework de servidor HTTP |
| **tRPC Server** | 11.x | Framework de API type-safe |
| **Drizzle ORM** | Latest | ORM type-safe para MySQL |
| **Zod** | 3.x | Validación de schemas |
| **MySQL2** | Latest | Driver de MySQL |
| **JWT** | Latest | Tokens de autenticación |
| **Superjson** | 2.x | Serialización avanzada (Dates, Maps, etc.) |

**Decisiones técnicas clave:**

**Express** fue elegido por su simplicidad y madurez. Aunque frameworks más modernos como Fastify ofrecen mejor performance, Express tiene un ecosistema más amplio y mejor documentación.

**Drizzle ORM** es una alternativa moderna a Prisma que genera queries SQL más eficientes y tiene mejor performance. Su API es más cercana a SQL raw, lo que facilita optimizaciones cuando sea necesario.

**Zod** se integra perfectamente con tRPC para validación de inputs. Los schemas de Zod se convierten automáticamente en tipos de TypeScript, eliminando duplicación de código.

**Superjson** permite serializar tipos complejos como `Date`, `Map`, `Set`, etc., que JSON estándar no soporta. Esto es especialmente útil para retornar objetos de Drizzle directamente sin transformaciones.

### 3.3 Base de Datos

| Tecnología | Versión | Propósito |
|-----------|---------|-----------|
| **MySQL / TiDB** | 8.x / Compatible | Base de datos relacional |
| **Drizzle Kit** | Latest | Herramienta de migraciones |

**TiDB** es una base de datos compatible con MySQL que ofrece escalabilidad horizontal. Para este proyecto, la compatibilidad con MySQL estándar es suficiente, pero TiDB permite escalar en el futuro sin cambios de código.

### 3.4 Integraciones y Servicios

| Servicio | Propósito | Estado |
|----------|-----------|--------|
| **Manus OAuth** | Autenticación de administradores | ✅ Funcional |
| **Evaluar.Online API** | Pruebas psicométricas | ✅ Funcional |
| **SendGrid API** | Envío de emails | ✅ Funcional |
| **Manus Storage (S3)** | Almacenamiento de archivos | ⏳ Configurado pero no usado |
| **Google Gemini API** | Análisis con IA | ⏳ Configurado pero no usado |

### 3.5 Herramientas de Desarrollo

| Herramienta | Propósito |
|-------------|-----------|
| **pnpm** | Gestor de paquetes |
| **ESLint** | Linter de código |
| **Prettier** | Formateador de código |
| **TypeScript Compiler** | Verificación de tipos |
| **Git** | Control de versiones |
| **GitHub** | Repositorio remoto |

---

## 4. Estructura de Base de Datos

### 4.1 Diagrama de Entidades

La base de datos consta de **12 tablas principales** con relaciones bien definidas:

```
┌─────────────┐       ┌──────────────┐       ┌─────────────┐
│   clients   │───┐   │  candidates  │───┐   │    posts    │
│             │   │   │              │   │   │             │
│ - id (PK)   │   │   │ - id (PK)    │   │   │ - id (PK)   │
│ - nombre    │   │   │ - nombre     │   │   │ - titulo    │
│ - rfc       │   │   │ - email      │   │   │ - cliente   │
│ - contacto  │   │   │ - telefono   │   │   │             │
└─────────────┘   │   │ - clienteId  │   │   └─────────────┘
                  │   │   (FK)       │   │
                  │   └──────────────┘   │
                  │          │            │
                  │          │            │
                  │          ▼            │
                  │   ┌──────────────┐   │
                  │   │ workHistory  │   │
                  │   │              │   │
                  │   │ - id (PK)    │   │
                  │   │ - candidateId│   │
                  │   │ - empresa    │   │
                  │   │ - puesto     │   │
                  │   │ - fechaInicio│   │
                  │   │ - fechaFin   │   │
                  │   └──────────────┘   │
                  │                       │
                  ▼                       ▼
           ┌─────────────────────────────────┐
           │         processes               │
           │                                 │
           │ - id (PK)                       │
           │ - clave (UNIQUE)                │
           │ - clienteId (FK)                │
           │ - candidatoId (FK)              │
           │ - puestoId (FK)                 │
           │ - tipoProducto                  │
           │ - estatusProceso                │
           │ - calificacionFinal             │
           └─────────────────────────────────┘
                  │              │
                  │              │
        ┌─────────┴──────┐      └──────────┐
        ▼                ▼                  ▼
┌───────────────┐ ┌──────────────┐ ┌──────────────┐
│processComments│ │  documents   │ │  surveyors   │
│               │ │              │ │              │
│ - id (PK)     │ │ - id (PK)    │ │ - id (PK)    │
│ - processId   │ │ - processId  │ │ - nombre     │
│ - comentario  │ │ - url        │ │ - telefono   │
└───────────────┘ └──────────────┘ └──────────────┘

┌──────────────────┐       ┌─────────────┐
│candidateComments │       │   payments  │
│                  │       │             │
│ - id (PK)        │       │ - id (PK)   │
│ - candidateId    │       │ - surveyorId│
│ - comentario     │       │ - monto     │
└──────────────────┘       └─────────────┘

┌──────────────────┐       ┌─────────────┐
│clientAccessTokens│       │    users    │
│                  │       │             │
│ - id (PK)        │       │ - id (PK)   │
│ - token          │       │ - openId    │
│ - clientId (FK)  │       │ - email     │
│ - expiresAt      │       │ - role      │
└──────────────────┘       └─────────────┘
```

### 4.2 Descripción Detallada de Tablas

#### 4.2.1 Tabla `users`

Almacena usuarios administradores autenticados mediante Manus OAuth.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT (PK, AI) | Identificador único |
| `openId` | VARCHAR(64) UNIQUE | ID de Manus OAuth |
| `name` | TEXT | Nombre completo |
| `email` | VARCHAR(320) | Email del usuario |
| `loginMethod` | VARCHAR(64) | Método de login (google, github, etc.) |
| `role` | ENUM('user', 'admin') | Rol del usuario |
| `createdAt` | TIMESTAMP | Fecha de creación |
| `updatedAt` | TIMESTAMP | Última actualización |
| `lastSignedIn` | TIMESTAMP | Último inicio de sesión |

**Notas importantes:**
- El campo `openId` es único y se usa para identificar usuarios de Manus OAuth
- El rol `admin` se asigna automáticamente al owner del proyecto (Paula)
- El sistema usa `id` numérico para relaciones internas, no `openId`

#### 4.2.2 Tabla `clients`

Almacena información de clientes empresariales que contratan los servicios de evaluación.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT (PK, AI) | Identificador único |
| `nombreEmpresa` | TEXT | Nombre de la empresa |
| `rfc` | VARCHAR(13) | RFC de la empresa |
| `direccion` | TEXT | Dirección física |
| `telefono` | VARCHAR(20) | Teléfono principal |
| `email` | VARCHAR(320) | Email de contacto |
| `nombreContacto` | TEXT | Nombre del contacto principal |
| `puestoContacto` | TEXT | Puesto del contacto |
| `createdAt` | TIMESTAMP | Fecha de registro |
| `updatedAt` | TIMESTAMP | Última actualización |

**Relaciones:**
- Un cliente puede tener múltiples candidatos (`candidates.clienteId`)
- Un cliente puede tener múltiples puestos (`posts.clienteId`)
- Un cliente puede tener múltiples procesos (`processes.clienteId`)
- Un cliente puede tener múltiples tokens de acceso (`clientAccessTokens.clientId`)

#### 4.2.3 Tabla `candidates`

Almacena información de candidatos a evaluar.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT (PK, AI) | Identificador único |
| `nombre` | TEXT | Nombre completo |
| `email` | VARCHAR(320) | Email del candidato |
| `telefono` | VARCHAR(20) | Teléfono de contacto |
| `direccion` | TEXT | Dirección actual |
| `fechaNacimiento` | DATE | Fecha de nacimiento |
| `curp` | VARCHAR(18) | CURP del candidato |
| `nss` | VARCHAR(11) | Número de Seguro Social |
| `clienteId` | INT (FK) | Cliente asociado |
| `createdAt` | TIMESTAMP | Fecha de registro |
| `updatedAt` | TIMESTAMP | Última actualización |

**Relaciones:**
- Pertenece a un cliente (`clienteId` → `clients.id`)
- Puede tener múltiples empleos en historial (`workHistory.candidateId`)
- Puede tener múltiples comentarios (`candidateComments.candidateId`)
- Puede estar en múltiples procesos (`processes.candidatoId`)

#### 4.2.4 Tabla `workHistory`

Almacena el historial laboral de cada candidato.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT (PK, AI) | Identificador único |
| `candidateId` | INT (FK) | Candidato asociado |
| `empresa` | TEXT | Nombre de la empresa |
| `puesto` | TEXT | Puesto desempeñado |
| `fechaInicio` | DATE | Fecha de inicio |
| `fechaFin` | DATE | Fecha de fin (NULL si actual) |
| `tiempoTrabajado` | TEXT | Tiempo calculado (ej: "2 años 3 meses") |
| `motivoSalida` | TEXT | Motivo de salida |
| `causalSalidaRH` | ENUM | Causal según RH |
| `causalSalidaJefe` | ENUM | Causal según jefe inmediato |
| `sueldoInicial` | DECIMAL(10,2) | Sueldo al inicio |
| `sueldoFinal` | DECIMAL(10,2) | Sueldo al final |
| `nombreJefe` | TEXT | Nombre del jefe inmediato |
| `telefonoJefe` | VARCHAR(20) | Teléfono del jefe |
| `createdAt` | TIMESTAMP | Fecha de registro |
| `updatedAt` | TIMESTAMP | Última actualización |

**Enums de causales:**
- RENUNCIA VOLUNTARIA
- TÉRMINO DE CONTRATO
- CIERRE DE LA EMPRESA
- JUBILACIÓN
- ABANDONO DE TRABAJO
- ACUMULACIÓN DE FALTAS
- BAJO DESEMPEÑO
- FALTA DE PROBIDAD
- VIOLACIÓN AL CÓDIGO DE CONDUCTA
- ABUSO DE CONFIANZA
- INCUMPLIMIENTO A POLÍTICAS Y PROCESOS

**Nota:** El campo `tiempoTrabajado` se calcula automáticamente en el frontend usando la función `calculateWorkDuration()` de `client/src/lib/dateUtils.ts`.

#### 4.2.5 Tabla `posts`

Almacena puestos de trabajo ofrecidos por los clientes.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT (PK, AI) | Identificador único |
| `titulo` | TEXT | Título del puesto |
| `descripcion` | TEXT | Descripción detallada |
| `requisitos` | TEXT | Requisitos del puesto |
| `salario` | DECIMAL(10,2) | Salario ofrecido |
| `ubicacion` | TEXT | Ubicación del trabajo |
| `clienteId` | INT (FK) | Cliente que ofrece el puesto |
| `createdAt` | TIMESTAMP | Fecha de creación |
| `updatedAt` | TIMESTAMP | Última actualización |

**Relaciones:**
- Pertenece a un cliente (`clienteId` → `clients.id`)
- Puede tener múltiples procesos asociados (`processes.puestoId`)

#### 4.2.6 Tabla `processes`

**Esta es la tabla central del sistema.** Almacena los procesos de evaluación que vinculan cliente, candidato y puesto.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT (PK, AI) | Identificador único |
| `clave` | VARCHAR(50) UNIQUE | Clave única (ej: ILA-2025-001) |
| `clienteId` | INT (FK) | Cliente solicitante |
| `candidatoId` | INT (FK) | Candidato a evaluar |
| `puestoId` | INT (FK) | Puesto al que aplica |
| `tipoProducto` | ENUM | Tipo de proceso (14 opciones) |
| `estatusProceso` | ENUM | Estado actual |
| `calificacionFinal` | ENUM | Calificación final |
| `fechaInicio` | DATE | Fecha de inicio |
| `fechaFinalizacion` | DATE | Fecha de finalización |
| `observaciones` | TEXT | Observaciones generales |
| `encuestadorAsignado` | INT (FK) | Encuestador asignado |
| `fechaVisita` | DATE | Fecha programada de visita |
| `resultadoVisita` | TEXT | Resultado de visita domiciliaria |
| `psicometricasId` | VARCHAR(100) | ID en sistema de psicométricas |
| `psicometricasStatus` | VARCHAR(50) | Estado en psicométricas |
| `psicometricasResultUrl` | TEXT | URL del resultado |
| `dictamenUrl` | TEXT | URL del dictamen final |
| `createdAt` | TIMESTAMP | Fecha de creación |
| `updatedAt` | TIMESTAMP | Última actualización |

**Enum `tipoProducto` (14 opciones):**
- ILA
- ESE LOCAL
- ESE FORANEO
- VISITA LOCAL
- VISITA FORANEA
- ILA CON BURÓ DE CRÉDITO
- ESE LOCAL CON BURÓ DE CRÉDITO
- ESE FORANEO CON BURÓ DE CRÉDITO
- ILA CON INVESTIGACIÓN LEGAL
- ESE LOCAL CON INVESTIGACIÓN LEGAL
- ESE FORANEO CON INVESTIGACIÓN LEGAL
- BURÓ DE CRÉDITO
- INVESTIGACIÓN LEGAL
- SEMANAS COTIZADAS

**Enum `estatusProceso`:**
- en_recepcion
- en_verificacion
- en_proceso
- en_visita
- en_revision
- finalizado
- entregado
- cancelado

**Enum `calificacionFinal`:**
- recomendable
- recomendable_con_reservas
- no_recomendable
- pendiente

**Generación de clave:**
La clave se genera automáticamente usando el patrón `{TIPO}-{AÑO}-{CONSECUTIVO}`. Por ejemplo:
- ILA-2025-001
- ESE LOCAL-2025-002
- ILA CON BURÓ DE CRÉDITO-2025-003

El consecutivo es único por tipo de proceso y año, gestionado por la función `getNextConsecutive()` en `server/db.ts`.

#### 4.2.7 Tabla `candidateComments`

Comentarios internos sobre candidatos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT (PK, AI) | Identificador único |
| `candidateId` | INT (FK) | Candidato asociado |
| `userId` | INT (FK) | Usuario que comenta |
| `comentario` | TEXT | Contenido del comentario |
| `createdAt` | TIMESTAMP | Fecha del comentario |
| `updatedAt` | TIMESTAMP | Última actualización |

#### 4.2.8 Tabla `processComments`

Comentarios y bitácora de procesos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT (PK, AI) | Identificador único |
| `processId` | INT (FK) | Proceso asociado |
| `userId` | INT (FK) | Usuario que comenta |
| `tipo` | ENUM | Tipo de comentario |
| `comentario` | TEXT | Contenido del comentario |
| `createdAt` | TIMESTAMP | Fecha del comentario |
| `updatedAt` | TIMESTAMP | Última actualización |

**Enum `tipo`:**
- comentario
- cambio_estatus
- asignacion
- resultado

#### 4.2.9 Tabla `surveyors`

Encuestadores que realizan visitas domiciliarias.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT (PK, AI) | Identificador único |
| `nombre` | TEXT | Nombre completo |
| `telefono` | VARCHAR(20) | Teléfono de contacto |
| `email` | VARCHAR(320) | Email |
| `zona` | TEXT | Zona de cobertura |
| `activo` | BOOLEAN | Si está activo |
| `createdAt` | TIMESTAMP | Fecha de registro |
| `updatedAt` | TIMESTAMP | Última actualización |

#### 4.2.10 Tabla `payments`

Pagos realizados a encuestadores.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT (PK, AI) | Identificador único |
| `surveyorId` | INT (FK) | Encuestador que recibe el pago |
| `processId` | INT (FK) | Proceso asociado |
| `monto` | DECIMAL(10,2) | Monto del pago |
| `concepto` | TEXT | Concepto del pago |
| `fechaPago` | DATE | Fecha del pago |
| `metodoPago` | VARCHAR(50) | Método de pago |
| `comprobante` | TEXT | URL del comprobante |
| `estatus` | ENUM | Estado del pago |
| `createdAt` | TIMESTAMP | Fecha de registro |
| `updatedAt` | TIMESTAMP | Última actualización |

**Enum `estatus`:**
- pendiente
- pagado
- cancelado

#### 4.2.11 Tabla `documents`

Documentos adjuntos a procesos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT (PK, AI) | Identificador único |
| `processId` | INT (FK) | Proceso asociado |
| `candidateId` | INT (FK) | Candidato asociado (opcional) |
| `tipo` | ENUM | Tipo de documento |
| `nombre` | TEXT | Nombre del archivo |
| `url` | TEXT | URL en S3 |
| `fileKey` | TEXT | Key en S3 |
| `mimeType` | VARCHAR(100) | Tipo MIME |
| `size` | INT | Tamaño en bytes |
| `uploadedBy` | INT (FK) | Usuario que subió |
| `createdAt` | TIMESTAMP | Fecha de subida |
| `updatedAt` | TIMESTAMP | Última actualización |

**Enum `tipo`:**
- cv
- identificacion
- comprobante_domicilio
- evidencia_visita
- dictamen
- otro

#### 4.2.12 Tabla `clientAccessTokens`

Tokens de acceso único para clientes empresariales.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT (PK, AI) | Identificador único |
| `token` | VARCHAR(64) UNIQUE | Token hexadecimal |
| `clientId` | INT (FK) | Cliente asociado |
| `expiresAt` | TIMESTAMP | Fecha de expiración |
| `createdAt` | TIMESTAMP | Fecha de creación |
| `lastUsedAt` | TIMESTAMP | Último uso |

**Notas:**
- Los tokens se generan con `crypto.randomBytes(32).toString('hex')`
- Tienen una validez de 30 días desde su creación
- Se actualizan `lastUsedAt` cada vez que se validan
- Un cliente puede tener múltiples tokens activos

### 4.3 Índices y Optimizaciones

Actualmente el esquema no tiene índices adicionales más allá de las primary keys y foreign keys. Para mejorar performance en producción, se recomienda agregar:

```sql
-- Índice para búsqueda de procesos por cliente
CREATE INDEX idx_processes_clienteId ON processes(clienteId);

-- Índice para búsqueda de candidatos por cliente
CREATE INDEX idx_candidates_clienteId ON candidates(clienteId);

-- Índice para búsqueda de procesos por candidato
CREATE INDEX idx_processes_candidatoId ON processes(candidatoId);

-- Índice para búsqueda de procesos por estatus
CREATE INDEX idx_processes_estatusProceso ON processes(estatusProceso);

-- Índice para búsqueda de tokens válidos
CREATE INDEX idx_tokens_expiresAt ON clientAccessTokens(expiresAt);
```

---

## 5. Arquitectura de Backend

### 5.1 Estructura de Archivos

```
server/
├── _core/                    # Infraestructura del framework
│   ├── context.ts           # Contexto de tRPC con usuario autenticado
│   ├── cookies.ts           # Helpers de cookies de sesión
│   ├── env.ts               # Variables de entorno tipadas
│   ├── imageGeneration.ts   # Helper de generación de imágenes
│   ├── index.ts             # Entry point del servidor
│   ├── llm.ts               # Helper de integración con LLM
│   ├── notification.ts      # Helper de notificaciones al owner
│   ├── oauth.ts             # Integración con Manus OAuth
│   ├── systemRouter.ts      # Router de sistema (notificaciones)
│   ├── trpc.ts              # Configuración de tRPC
│   └── voiceTranscription.ts # Helper de transcripción de audio
├── auth/                     # Lógica de autenticación
│   └── clientTokens.ts      # Gestión de tokens de clientes
├── lib/                      # Helpers y utilidades
│   ├── psicometricas.ts     # Integración con Evaluar.Online
│   └── sendgrid.ts          # Integración con SendGrid
├── db.ts                     # Helpers de base de datos
├── routers.ts                # Routers principales de tRPC
└── storage.ts                # Helpers de S3 Storage

drizzle/
├── schema.ts                 # Esquema de base de datos
└── migrations/               # Migraciones SQL generadas
    ├── 0000_*.sql
    ├── 0001_*.sql
    └── ...

shared/
└── const.ts                  # Constantes compartidas frontend/backend
```

### 5.2 Configuración de tRPC

El archivo `server/_core/trpc.ts` configura el servidor tRPC con middleware de autenticación y contexto.

**Contexto de tRPC:**

Cada request a tRPC tiene acceso a un contexto que incluye:
- `req`: Request de Express
- `res`: Response de Express
- `user`: Usuario autenticado (si existe)

El contexto se crea en `server/_core/context.ts`:

```typescript
export async function createContext({ req, res }: CreateContextOptions) {
  // Extraer token JWT de cookies
  const token = req.cookies[COOKIE_NAME];
  
  let user: User | undefined = undefined;
  
  if (token) {
    try {
      // Verificar y decodificar token
      const decoded = jwt.verify(token, ENV.jwtSecret) as { openId: string };
      
      // Buscar usuario en base de datos
      user = await getUserByOpenId(decoded.openId);
    } catch (error) {
      // Token inválido o expirado
      console.error('[Context] Invalid token:', error);
    }
  }
  
  return { req, res, user };
}
```

**Procedimientos públicos y protegidos:**

```typescript
// Procedimiento público (no requiere autenticación)
export const publicProcedure = t.procedure;

// Procedimiento protegido (requiere autenticación)
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // TypeScript sabe que user existe aquí
    },
  });
});
```

### 5.3 Routers de tRPC

El archivo `server/routers.ts` define todos los endpoints de la API mediante routers de tRPC.

**Estructura general:**

```typescript
export const appRouter = router({
  // Router de autenticación
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME);
      return { success: true };
    }),
  }),
  
  // Router de clientes
  clients: router({
    list: protectedProcedure.query(async () => {
      // Lógica para listar clientes
    }),
    create: protectedProcedure
      .input(z.object({ nombreEmpresa: z.string(), ... }))
      .mutation(async ({ input }) => {
        // Lógica para crear cliente
      }),
    // ... más procedimientos
  }),
  
  // Router de candidatos
  candidates: router({ ... }),
  
  // Router de procesos
  processes: router({ ... }),
  
  // Router de acceso de clientes (público)
  clientAccess: router({
    validateToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const client = await validateClientToken(input.token);
        return {
          valid: !!client,
          clientId: client?.id,
        };
      }),
    // ... más procedimientos
  }),
});

export type AppRouter = typeof appRouter;
```

**Validación con Zod:**

Todos los inputs se validan con Zod antes de llegar a la lógica del procedimiento:

```typescript
create: protectedProcedure
  .input(z.object({
    nombreEmpresa: z.string().min(1, 'Nombre requerido'),
    rfc: z.string().regex(/^[A-Z]{3,4}\d{6}[A-Z0-9]{3}$/, 'RFC inválido'),
    email: z.string().email('Email inválido'),
    telefono: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    // input está validado y tipado
  })
```

### 5.4 Helpers de Base de Datos

El archivo `server/db.ts` contiene funciones helper para operaciones comunes de base de datos.

**Patrón Repository:**

Cada entidad tiene funciones específicas que encapsulan queries de Drizzle:

```typescript
// Obtener usuario por OpenID
export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  
  return result[0];
}

// Upsert de usuario (crear o actualizar)
export async function upsertUser(user: InsertUser): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(users)
    .values(user)
    .onDuplicateKeyUpdate({ set: { ...user } });
}

// Obtener siguiente consecutivo para claves de procesos
export async function getNextConsecutive(
  tipoProducto: TipoProducto,
  year: number
): Promise<number> {
  const db = await getDb();
  if (!db) return 1;
  
  const result = await db
    .select({ clave: processes.clave })
    .from(processes)
    .where(
      and(
        like(processes.clave, `${tipoProducto}-${year}-%`),
        eq(processes.tipoProducto, tipoProducto)
      )
    )
    .orderBy(desc(processes.clave))
    .limit(1);
  
  if (result.length === 0) return 1;
  
  const lastClave = result[0].clave;
  const consecutivo = parseInt(lastClave.split('-')[2]);
  return consecutivo + 1;
}
```

**Lazy initialization de base de datos:**

La conexión a la base de datos se crea de forma lazy para permitir que herramientas locales funcionen sin conexión:

```typescript
let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn('[Database] Failed to connect:', error);
      _db = null;
    }
  }
  return _db;
}
```

### 5.5 Autenticación de Clientes

El sistema implementa dos métodos de autenticación:

**1. Manus OAuth (para administradores):**
- Flujo OAuth estándar
- Callback en `/api/oauth/callback`
- Cookie de sesión con JWT
- Implementado en `server/_core/oauth.ts`

**2. Tokens únicos (para clientes empresariales):**
- Tokens hexadecimales de 64 caracteres
- Validez de 30 días
- Sin contraseñas
- Implementado en `server/auth/clientTokens.ts`

**Funciones de gestión de tokens:**

```typescript
// Crear token de acceso
export async function createClientAccessToken(clientId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 días
  
  await db.insert(clientAccessTokens).values({
    token,
    clientId,
    expiresAt,
    createdAt: new Date(),
    lastUsedAt: new Date(),
  });
  
  return token;
}

// Validar token y retornar cliente
export async function validateClientToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  
  const now = new Date();
  
  const result = await db
    .select({ token: clientAccessTokens, client: clients })
    .from(clientAccessTokens)
    .innerJoin(clients, eq(clientAccessTokens.clientId, clients.id))
    .where(
      and(
        eq(clientAccessTokens.token, token),
        gt(clientAccessTokens.expiresAt, now)
      )
    )
    .limit(1);
  
  if (result.length === 0) return null;
  
  // Actualizar lastUsedAt
  await db
    .update(clientAccessTokens)
    .set({ lastUsedAt: now })
    .where(eq(clientAccessTokens.token, token));
  
  return result[0].client;
}
```

---

## 6. Arquitectura de Frontend

### 6.1 Estructura de Archivos

```
client/
├── public/                   # Assets estáticos
│   └── (vacío por ahora)
├── src/
│   ├── _core/               # Infraestructura del framework
│   │   └── hooks/
│   │       └── useAuth.ts   # Hook de autenticación
│   ├── components/          # Componentes reutilizables
│   │   ├── ui/             # Componentes de shadcn/ui
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   └── ...
│   │   ├── DashboardLayout.tsx        # Layout principal
│   │   ├── DashboardLayoutSkeleton.tsx # Skeleton de loading
│   │   ├── ErrorBoundary.tsx          # Manejo de errores
│   │   └── AIChatBox.tsx              # Chat con IA (no usado)
│   ├── contexts/            # Contextos de React
│   │   ├── ThemeContext.tsx          # Tema dark/light
│   │   └── ClientAuthContext.tsx     # Auth de clientes
│   ├── hooks/               # Custom hooks
│   │   └── (vacío por ahora)
│   ├── lib/                 # Utilidades
│   │   ├── trpc.ts         # Cliente tRPC
│   │   ├── utils.ts        # Helpers generales
│   │   ├── constants.ts    # Constantes compartidas
│   │   └── dateUtils.ts    # Utilidades de fechas
│   ├── pages/               # Páginas de la aplicación
│   │   ├── Home.tsx                        # Dashboard principal
│   │   ├── Clientes.tsx                    # Lista de clientes
│   │   ├── ClienteDetalle.tsx              # Detalle de cliente
│   │   ├── ClienteFormularioIntegrado.tsx  # Flujo completo
│   │   ├── Candidatos.tsx                  # Lista de candidatos
│   │   ├── CandidatoDetalle.tsx            # Detalle de candidato
│   │   ├── CandidatoFormularioIntegrado.tsx # Flujo rápido
│   │   ├── Puestos.tsx                     # Lista de puestos
│   │   ├── PuestoDetalle.tsx               # Detalle de puesto
│   │   ├── PuestoProcesoFlow.tsx           # Crear proceso desde puesto
│   │   ├── Procesos.tsx                    # Lista de procesos
│   │   ├── ProcesoDetalle.tsx              # Detalle de proceso
│   │   ├── Encuestadores.tsx               # Lista de encuestadores
│   │   ├── Pagos.tsx                       # Lista de pagos
│   │   ├── Usuarios.tsx                    # Gestión de usuarios
│   │   ├── ClienteAcceso.tsx               # Validación de token
│   │   ├── ClienteDashboard.tsx            # Dashboard de cliente
│   │   ├── ClienteProcesoDetalle.tsx       # Detalle para cliente
│   │   ├── ClienteCandidatoDetalle.tsx     # Detalle para cliente
│   │   └── NotFound.tsx                    # Página 404
│   ├── App.tsx              # Router principal
│   ├── main.tsx             # Entry point
│   ├── index.css            # Estilos globales
│   └── const.ts             # Constantes del cliente
└── index.html               # HTML base
```

### 6.2 Cliente tRPC

El archivo `client/src/lib/trpc.ts` configura el cliente tRPC con React Query:

```typescript
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../server/routers";

export const trpc = createTRPCReact<AppRouter>();
```

**Uso en componentes:**

```typescript
function MiComponente() {
  // Query (GET)
  const { data, isLoading, error } = trpc.clients.list.useQuery();
  
  // Mutation (POST/PUT/DELETE)
  const createClient = trpc.clients.create.useMutation({
    onSuccess: () => {
      // Invalidar cache para refrescar lista
      trpc.useUtils().clients.list.invalidate();
    },
  });
  
  const handleSubmit = (data) => {
    createClient.mutate(data);
  };
  
  return (
    <div>
      {isLoading && <p>Cargando...</p>}
      {error && <p>Error: {error.message}</p>}
      {data && <ul>{data.map(client => <li key={client.id}>{client.nombreEmpresa}</li>)}</ul>}
    </div>
  );
}
```

**Optimistic updates:**

Para operaciones que deben sentirse instantáneas, se usan optimistic updates:

```typescript
const deleteClient = trpc.clients.delete.useMutation({
  onMutate: async (deletedId) => {
    // Cancelar queries en progreso
    await trpc.useUtils().clients.list.cancel();
    
    // Snapshot del estado actual
    const previousClients = trpc.useUtils().clients.list.getData();
    
    // Actualizar cache optimísticamente
    trpc.useUtils().clients.list.setData(undefined, (old) =>
      old?.filter((c) => c.id !== deletedId)
    );
    
    // Retornar snapshot para rollback
    return { previousClients };
  },
  onError: (err, deletedId, context) => {
    // Rollback en caso de error
    trpc.useUtils().clients.list.setData(undefined, context?.previousClients);
  },
  onSettled: () => {
    // Refrescar siempre al final
    trpc.useUtils().clients.list.invalidate();
  },
});
```

### 6.3 Sistema de Rutas

El archivo `client/src/App.tsx` define todas las rutas de la aplicación usando Wouter:

```typescript
function Router() {
  return (
    <Switch>
      {/* Dashboard principal */}
      <Route path="/" component={Home} />
      
      {/* Rutas administrativas */}
      <Route path="/clientes" component={Clientes} />
      <Route path="/clientes/:id" component={ClienteDetalle} />
      <Route path="/candidatos" component={Candidatos} />
      <Route path="/candidatos/:id" component={CandidatoDetalle} />
      <Route path="/procesos" component={Procesos} />
      <Route path="/procesos/:id" component={ProcesoDetalle} />
      
      {/* Flujos integrados */}
      <Route path="/flujo-completo" component={ClienteFormularioIntegrado} />
      <Route path="/flujo-rapido" component={CandidatoFormularioIntegrado} />
      
      {/* Portal de clientes */}
      <Route path="/cliente/:token" component={ClienteAcceso} />
      <Route path="/cliente/dashboard" component={ClienteDashboard} />
      <Route path="/cliente/proceso/:id" component={ClienteProcesoDetalle} />
      <Route path="/cliente/candidato/:id" component={ClienteCandidatoDetalle} />
      
      {/* 404 */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}
```

### 6.4 Layout Principal

El componente `DashboardLayout` proporciona el layout estándar con sidebar y header:

```typescript
<DashboardLayout>
  <div className="p-6">
    {/* Contenido de la página */}
  </div>
</DashboardLayout>
```

**Características:**
- Sidebar con navegación a todas las secciones
- Header con título y usuario autenticado
- Responsive (colapsa en móvil)
- Skeleton de loading mientras se autentica
- Redirección automática a login si no está autenticado

**Menú lateral:**
- Dashboard
- Clientes
- Puestos
- Candidatos
- Procesos
- Encuestadores
- Pagos
- Usuarios

### 6.5 Componentes de shadcn/ui

Todos los componentes UI están en `client/src/components/ui/` y son totalmente customizables.

**Componentes principales usados:**

| Componente | Uso |
|-----------|------|
| `Button` | Botones con variantes (default, outline, ghost, destructive) |
| `Card` | Contenedores de contenido |
| `Dialog` | Modales y diálogos |
| `Input` | Campos de texto |
| `Select` | Selectores dropdown |
| `Table` | Tablas de datos |
| `Tabs` | Pestañas de navegación |
| `Toast` | Notificaciones temporales |
| `Badge` | Etiquetas de estado |
| `Skeleton` | Placeholders de loading |

**Ejemplo de uso:**

```typescript
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function MiFormulario() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear Cliente</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <Input placeholder="Nombre de empresa" />
          <Input placeholder="RFC" />
          <Button type="submit">Guardar</Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

### 6.6 Sistema de Temas

El archivo `client/src/contexts/ThemeContext.tsx` maneja el tema dark/light:

```typescript
<ThemeProvider defaultTheme="light">
  <App />
</ThemeProvider>
```

Los colores se definen mediante CSS variables en `client/src/index.css`:

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    /* ... más variables */
  }
  
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    /* ... más variables */
  }
}
```

**Uso en componentes:**

```typescript
<div className="bg-background text-foreground">
  <h1 className="text-primary">Título</h1>
</div>
```

### 6.7 Manejo de Formularios

Los formularios usan estado local de React y validación manual (no se usa React Hook Form para mantener simplicidad):

```typescript
function FormularioCliente() {
  const [formData, setFormData] = useState({
    nombreEmpresa: '',
    rfc: '',
    email: '',
  });
  
  const createClient = trpc.clients.create.useMutation({
    onSuccess: () => {
      toast.success('Cliente creado exitosamente');
      setLocation('/clientes');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createClient.mutate(formData);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <Input
        value={formData.nombreEmpresa}
        onChange={(e) => setFormData({ ...formData, nombreEmpresa: e.target.value })}
        placeholder="Nombre de empresa"
      />
      {/* ... más campos */}
      <Button type="submit" disabled={createClient.isPending}>
        {createClient.isPending ? 'Guardando...' : 'Guardar'}
      </Button>
    </form>
  );
}
```

---

## 7. Integraciones Externas

### 7.1 Manus OAuth

**Propósito:** Autenticación de administradores (Paula y futuros usuarios admin).

**Flujo:**
1. Usuario hace clic en "Iniciar Sesión"
2. Redirige a `getLoginUrl()` que apunta al portal de Manus OAuth
3. Usuario se autentica con Google/GitHub/etc.
4. Manus redirige a `/api/oauth/callback` con código de autorización
5. Backend intercambia código por token de acceso
6. Backend obtiene información del usuario (openId, email, nombre)
7. Backend crea/actualiza usuario en base de datos
8. Backend genera JWT y lo guarda en cookie de sesión
9. Frontend redirige a dashboard

**Implementación:**

El callback está en `server/_core/oauth.ts`:

```typescript
app.get('/api/oauth/callback', async (req, res) => {
  const { code } = req.query;
  
  // Intercambiar código por token
  const tokenResponse = await fetch(`${OAUTH_SERVER_URL}/oauth/token`, {
    method: 'POST',
    body: JSON.stringify({ code, ... }),
  });
  
  const { access_token } = await tokenResponse.json();
  
  // Obtener información del usuario
  const userResponse = await fetch(`${OAUTH_SERVER_URL}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  
  const userData = await userResponse.json();
  
  // Crear/actualizar usuario en BD
  await upsertUser({
    openId: userData.openId,
    name: userData.name,
    email: userData.email,
    loginMethod: userData.loginMethod,
    lastSignedIn: new Date(),
  });
  
  // Generar JWT
  const token = jwt.sign({ openId: userData.openId }, ENV.jwtSecret);
  
  // Guardar en cookie
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
  });
  
  // Redirigir a dashboard
  res.redirect('/');
});
```

**Hook de autenticación:**

```typescript
export function useAuth() {
  const { data: user, isLoading, error } = trpc.auth.me.useQuery();
  const logout = trpc.auth.logout.useMutation();
  
  return {
    user,
    loading: isLoading,
    error,
    isAuthenticated: !!user,
    logout: () => logout.mutate(),
  };
}
```

### 7.2 Evaluar.Online (Psicométricas)

**Propósito:** Asignación y recepción de resultados de pruebas psicométricas.

**API Base URL:** `https://api.evaluar.online/v1`

**Credenciales:**
- Token: Almacenado en `PSICOMETRICAS_TOKEN`
- Password: Almacenado en `PSICOMETRICAS_PASSWORD`

**Endpoints utilizados:**

| Endpoint | Método | Propósito |
|----------|--------|-----------|
| `/evaluaciones` | POST | Asignar batería de pruebas |
| `/evaluaciones/{id}` | GET | Consultar estado |
| `/evaluaciones/{id}/resultados` | GET | Obtener resultados JSON |
| `/evaluaciones/{id}/reporte` | GET | Descargar PDF |
| `/evaluaciones/{id}/reenviar` | POST | Reenviar invitación |

**Implementación:**

El archivo `server/lib/psicometricas.ts` contiene wrappers para cada endpoint:

```typescript
export async function asignarBateria(data: {
  candidatoNombre: string;
  candidatoEmail: string;
  candidatoTelefono: string;
  bateria: string; // ID de la batería
  empresaNombre: string;
  puestoNombre: string;
}) {
  const response = await fetch(`${API_BASE_URL}/evaluaciones`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PSICOMETRICAS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      nombre: data.candidatoNombre,
      email: data.candidatoEmail,
      telefono: data.candidatoTelefono,
      bateria_id: data.bateria,
      empresa: data.empresaNombre,
      puesto: data.puestoNombre,
      password: PSICOMETRICAS_PASSWORD,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Error al asignar batería: ${response.statusText}`);
  }
  
  const result = await response.json();
  return result.id; // ID de la evaluación
}

export async function obtenerResultados(evaluacionId: string) {
  const response = await fetch(
    `${API_BASE_URL}/evaluaciones/${evaluacionId}/resultados`,
    {
      headers: { 'Authorization': `Bearer ${PSICOMETRICAS_TOKEN}` },
    }
  );
  
  if (!response.ok) {
    throw new Error(`Error al obtener resultados: ${response.statusText}`);
  }
  
  return response.json();
}

export async function descargarReporte(evaluacionId: string): Promise<Buffer> {
  const response = await fetch(
    `${API_BASE_URL}/evaluaciones/${evaluacionId}/reporte`,
    {
      headers: { 'Authorization': `Bearer ${PSICOMETRICAS_TOKEN}` },
    }
  );
  
  if (!response.ok) {
    throw new Error(`Error al descargar reporte: ${response.statusText}`);
  }
  
  return Buffer.from(await response.arrayBuffer());
}
```

**Webhook de resultados:**

Evaluar.Online envía un webhook cuando los resultados están listos:

```typescript
// En server/routers.ts
app.post('/api/webhooks/psicometricas', async (req, res) => {
  const { evaluacion_id, estado } = req.body;
  
  if (estado === 'completado') {
    // Buscar proceso por psicometricasId
    const proceso = await db
      .select()
      .from(processes)
      .where(eq(processes.psicometricasId, evaluacion_id))
      .limit(1);
    
    if (proceso.length > 0) {
      // Actualizar estado
      await db
        .update(processes)
        .set({
          psicometricasStatus: 'completado',
          psicometricasResultUrl: `${API_BASE_URL}/evaluaciones/${evaluacion_id}/reporte`,
        })
        .where(eq(processes.id, proceso[0].id));
    }
  }
  
  res.json({ success: true });
});
```

### 7.3 SendGrid (Email)

**Propósito:** Envío de emails automáticos (invitaciones, notificaciones, enlaces de acceso).

**API Key:** Almacenada en `SENDGRID_API_KEY`

**Implementación:**

El archivo `server/lib/sendgrid.ts` contiene helpers para envío de emails:

```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}) {
  try {
    await sgMail.send({
      to: options.to,
      from: options.from || 'noreply@integra-rh.com',
      subject: options.subject,
      html: options.html,
    });
    return { success: true };
  } catch (error) {
    console.error('[SendGrid] Error:', error);
    return { success: false, error };
  }
}

export async function sendCandidateInvitation(data: {
  candidatoEmail: string;
  candidatoNombre: string;
  empresaNombre: string;
  puestoNombre: string;
  linkEvaluacion: string;
}) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button { 
            display: inline-block;
            padding: 12px 24px;
            background: #2563eb;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>INTEGRA-RH</h1>
          </div>
          <div class="content">
            <h2>Hola ${data.candidatoNombre},</h2>
            <p>
              Has sido invitado a completar una evaluación psicométrica para el puesto de
              <strong>${data.puestoNombre}</strong> en <strong>${data.empresaNombre}</strong>.
            </p>
            <p>
              Por favor, haz clic en el siguiente botón para iniciar tu evaluación:
            </p>
            <a href="${data.linkEvaluacion}" class="button">Iniciar Evaluación</a>
            <p>
              Si tienes alguna pregunta, no dudes en contactarnos.
            </p>
            <p>Saludos cordiales,<br>Equipo INTEGRA-RH</p>
          </div>
        </div>
      </body>
    </html>
  `;
  
  return sendEmail({
    to: data.candidatoEmail,
    subject: `Invitación a Evaluación - ${data.puestoNombre}`,
    html,
  });
}

export async function sendClientAccessLink(data: {
  clienteEmail: string;
  clienteNombre: string;
  empresaNombre: string;
  accessLink: string;
}) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button { 
            display: inline-block;
            padding: 12px 24px;
            background: #2563eb;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
          }
          .info-box {
            background: #eff6ff;
            border-left: 4px solid #2563eb;
            padding: 15px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>INTEGRA-RH</h1>
          </div>
          <div class="content">
            <h2>Hola ${data.clienteNombre},</h2>
            <p>
              Hemos iniciado un nuevo proceso de evaluación para <strong>${data.empresaNombre}</strong>.
            </p>
            <p>
              Puedes acceder a tu portal de cliente para ver el progreso y los resultados:
            </p>
            <a href="${data.accessLink}" class="button">Acceder a Mi Portal</a>
            <div class="info-box">
              <strong>Nota:</strong> Este enlace es único y personal. Tiene una validez de 30 días.
              No lo compartas con terceros.
            </div>
            <p>
              En tu portal podrás:
            </p>
            <ul>
              <li>Ver el estado de tus procesos de evaluación</li>
              <li>Consultar información de candidatos</li>
              <li>Descargar dictámenes finalizados</li>
            </ul>
            <p>Saludos cordiales,<br>Equipo INTEGRA-RH</p>
          </div>
        </div>
      </body>
    </html>
  `;
  
  return sendEmail({
    to: data.clienteEmail,
    subject: `Acceso a Portal de Cliente - ${data.empresaNombre}`,
    html,
  });
}
```

**Uso en routers:**

```typescript
// Al asignar psicométricas
const evaluacionId = await asignarBateria({
  candidatoNombre: candidato.nombre,
  candidatoEmail: candidato.email,
  candidatoTelefono: candidato.telefono,
  bateria: 'bateria-basica',
  empresaNombre: cliente.nombreEmpresa,
  puestoNombre: puesto.titulo,
});

// Enviar email de invitación
await sendCandidateInvitation({
  candidatoEmail: candidato.email,
  candidatoNombre: candidato.nombre,
  empresaNombre: cliente.nombreEmpresa,
  puestoNombre: puesto.titulo,
  linkEvaluacion: `https://evaluar.online/e/${evaluacionId}`,
});
```

### 7.4 Manus Storage (S3)

**Propósito:** Almacenamiento de archivos (CVs, documentos, evidencias, dictámenes).

**Estado:** Configurado pero no utilizado actualmente.

**Implementación:**

El archivo `server/storage.ts` contiene helpers pre-configurados:

```typescript
import { ENV } from './_core/env';

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType?: string
): Promise<{ key: string; url: string }> {
  // Implementación usando AWS SDK
  // Las credenciales están pre-inyectadas por Manus
}

export async function storageGet(
  relKey: string,
  expiresIn?: number
): Promise<{ key: string; url: string }> {
  // Genera URL pre-firmada para descarga
}
```

**Uso recomendado:**

```typescript
// Subir CV de candidato
const fileBuffer = await req.file.buffer;
const fileKey = `candidatos/${candidatoId}/cv-${Date.now()}.pdf`;

const { url } = await storagePut(fileKey, fileBuffer, 'application/pdf');

// Guardar URL en base de datos
await db.insert(documents).values({
  processId,
  candidateId: candidatoId,
  tipo: 'cv',
  nombre: 'Curriculum Vitae',
  url,
  fileKey,
  mimeType: 'application/pdf',
  size: fileBuffer.length,
});
```

### 7.5 Google Gemini API

**Propósito:** Análisis de candidatos y generación de recomendaciones con IA.

**Estado:** Configurado pero no utilizado actualmente.

**API Key:** Almacenada en `GEMINI_API_KEY`

**Implementación:**

El archivo `server/_core/llm.ts` contiene helper pre-configurado:

```typescript
export async function invokeLLM(options: {
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
}) {
  // Implementación usando Google Generative AI SDK
}
```

**Uso recomendado para análisis:**

```typescript
// Analizar historial laboral de candidato
const prompt = `
Analiza el siguiente historial laboral y proporciona un resumen profesional:

${workHistory.map(job => `
- ${job.puesto} en ${job.empresa}
- Período: ${job.fechaInicio} a ${job.fechaFin}
- Motivo de salida: ${job.motivoSalida}
`).join('\n')}

Proporciona:
1. Resumen de experiencia
2. Fortalezas identificadas
3. Áreas de atención
4. Recomendación (recomendable, con reservas, no recomendable)
`;

const response = await invokeLLM({
  messages: [
    { role: 'system', content: 'Eres un experto en recursos humanos.' },
    { role: 'user', content: prompt },
  ],
  temperature: 0.3, // Respuestas más consistentes
});

const analisis = response.choices[0].message.content;
```

---

## 8. Flujos de Trabajo Implementados

### 8.1 Flujo Completo (Cliente → Candidato → Puesto → Proceso)

**Propósito:** Crear todas las entidades necesarias en una sola sesión, ideal para nuevos clientes.

**Ruta:** `/flujo-completo`

**Componente:** `ClienteFormularioIntegrado.tsx`

**Pasos:**

1. **Paso 1: Información del Cliente**
   - Formulario con todos los campos de cliente
   - Validación en tiempo real
   - Botón "Siguiente"

2. **Paso 2: Información del Candidato**
   - Formulario con campos básicos de candidato
   - Pre-carga `clienteId` del paso anterior
   - Botón "Siguiente"

3. **Paso 3: Información del Puesto**
   - Formulario con campos de puesto
   - Pre-carga `clienteId` del paso 1
   - Botón "Siguiente"

4. **Paso 4: Información del Proceso**
   - Formulario con campos de proceso
   - Selector de tipo de proceso (14 opciones)
   - Pre-carga `clienteId`, `candidatoId`, `puestoId`
   - Generación automática de clave
   - Botón "Crear Proceso"

5. **Confirmación**
   - Muestra resumen de todas las entidades creadas
   - Botón "Ir al Dashboard"

**Implementación técnica:**

```typescript
function ClienteFormularioIntegrado() {
  const [step, setStep] = useState(1);
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [candidatoId, setCandidatoId] = useState<number | null>(null);
  const [puestoId, setPuestoId] = useState<number | null>(null);
  
  const createClient = trpc.clients.create.useMutation({
    onSuccess: (data) => {
      setClienteId(data.id);
      setStep(2);
    },
  });
  
  const createCandidate = trpc.candidates.create.useMutation({
    onSuccess: (data) => {
      setCandidatoId(data.id);
      setStep(3);
    },
  });
  
  const createPost = trpc.posts.create.useMutation({
    onSuccess: (data) => {
      setPuestoId(data.id);
      setStep(4);
    },
  });
  
  const createProcess = trpc.processes.create.useMutation({
    onSuccess: () => {
      setStep(5);
    },
  });
  
  return (
    <div>
      {step === 1 && <ClienteForm onSubmit={createClient.mutate} />}
      {step === 2 && <CandidatoForm clienteId={clienteId!} onSubmit={createCandidate.mutate} />}
      {step === 3 && <PuestoForm clienteId={clienteId!} onSubmit={createPost.mutate} />}
      {step === 4 && (
        <ProcesoForm
          clienteId={clienteId!}
          candidatoId={candidatoId!}
          puestoId={puestoId!}
          onSubmit={createProcess.mutate}
        />
      )}
      {step === 5 && <Confirmacion />}
    </div>
  );
}
```

### 8.2 Flujo Rápido (Candidato → Puesto → Proceso)

**Propósito:** Crear proceso para cliente existente, omitiendo la creación de cliente.

**Ruta:** `/flujo-rapido`

**Componente:** `CandidatoFormularioIntegrado.tsx`

**Pasos:**

1. **Selección de Cliente**
   - Dropdown con clientes existentes
   - Búsqueda por nombre

2. **Información del Candidato**
   - Formulario con campos de candidato
   - Pre-carga `clienteId` seleccionado

3. **Información del Puesto**
   - Formulario con campos de puesto
   - Pre-carga `clienteId`

4. **Información del Proceso**
   - Formulario con campos de proceso
   - Pre-carga `clienteId`, `candidatoId`, `puestoId`

5. **Confirmación**
   - Resumen y redirección

### 8.3 Flujo desde Puesto (Puesto → Proceso)

**Propósito:** Crear proceso para puesto existente.

**Ruta:** `/puestos/:id/crear-proceso`

**Componente:** `PuestoProcesoFlow.tsx`

**Pasos:**

1. **Selección de Candidato**
   - Dropdown con candidatos del mismo cliente
   - Opción "Crear nuevo candidato"

2. **Información del Proceso**
   - Formulario con campos de proceso
   - Pre-carga `clienteId`, `puestoId`, `candidatoId`

3. **Confirmación**

### 8.4 Flujo de Portal de Clientes

**Propósito:** Permitir a clientes empresariales ver el progreso de sus procesos sin autenticación tradicional.

**Ruta:** `/cliente/:token`

**Componente:** `ClienteAcceso.tsx` → `ClienteDashboard.tsx`

**Pasos:**

1. **Validación de Token**
   - Cliente recibe enlace por email: `https://app.com/cliente/{token}`
   - Frontend extrae token de URL
   - Llama a `trpc.clientAccess.validateToken.useQuery({ token })`
   - Si válido, guarda `clientId` y `token` en `sessionStorage`
   - Redirige a `/cliente/dashboard`

2. **Dashboard de Cliente**
   - Muestra estadísticas: total candidatos, procesos activos, completados
   - Tabla de procesos con clave, candidato, tipo, estatus
   - Tabla de candidatos con nombre, email, teléfono
   - Botón "Ver detalle" en cada fila

3. **Detalle de Proceso**
   - Ruta: `/cliente/proceso/:id`
   - Muestra información completa del proceso
   - Calificación final con colores
   - Datos del candidato y puesto
   - Botón "Descargar dictamen" (si disponible)

4. **Detalle de Candidato**
   - Ruta: `/cliente/candidato/:id`
   - Muestra información personal
   - Lista de procesos asociados
   - Navegación a detalle de procesos

**Seguridad:**

Todas las queries filtran por `clientId` para asegurar que los clientes solo vean sus propios datos:

```typescript
const { data: processes } = trpc.processes.list.useQuery();
const clientProcesses = processes?.filter(p => p.clienteId === clientId);
```

---

## 9. Sistema de Autenticación

### 9.1 Autenticación Dual

El sistema implementa **dos métodos de autenticación independientes**:

| Método | Usuario | Tecnología | Duración | Propósito |
|--------|---------|-----------|----------|-----------|
| **Manus OAuth** | Administradores | JWT en cookie | 30 días | Gestión completa |
| **Tokens únicos** | Clientes | Token en sessionStorage | 30 días | Solo lectura |

### 9.2 Flujo de Manus OAuth

```
┌─────────┐                ┌─────────┐                ┌─────────┐
│ Usuario │                │ Frontend│                │ Backend │
└────┬────┘                └────┬────┘                └────┬────┘
     │                          │                          │
     │ 1. Clic "Iniciar Sesión" │                          │
     ├─────────────────────────>│                          │
     │                          │                          │
     │ 2. Redirige a Manus OAuth│                          │
     │<─────────────────────────┤                          │
     │                          │                          │
     │ 3. Autentica con Google  │                          │
     ├─────────────────────────>│                          │
     │                          │                          │
     │ 4. Redirige con código   │                          │
     │<─────────────────────────┤                          │
     │                          │                          │
     │ 5. GET /api/oauth/callback?code=XXX                 │
     ├─────────────────────────────────────────────────────>│
     │                          │                          │
     │                          │ 6. Intercambia código    │
     │                          │    por access_token      │
     │                          │<─────────────────────────┤
     │                          │                          │
     │                          │ 7. Obtiene info usuario  │
     │                          │<─────────────────────────┤
     │                          │                          │
     │                          │ 8. Upsert en BD          │
     │                          │<─────────────────────────┤
     │                          │                          │
     │                          │ 9. Genera JWT            │
     │                          │<─────────────────────────┤
     │                          │                          │
     │ 10. Set-Cookie + Redirect a /                       │
     │<─────────────────────────────────────────────────────┤
     │                          │                          │
     │ 11. Navega a /           │                          │
     ├─────────────────────────>│                          │
     │                          │                          │
     │                          │ 12. GET / con cookie     │
     │                          ├─────────────────────────>│
     │                          │                          │
     │                          │ 13. Valida JWT           │
     │                          │<─────────────────────────┤
     │                          │                          │
     │ 14. Renderiza dashboard  │                          │
     │<─────────────────────────┤                          │
```

### 9.3 Flujo de Tokens Únicos

```
┌─────────┐                ┌─────────┐                ┌─────────┐
│ Cliente │                │ Frontend│                │ Backend │
└────┬────┘                └────┬────┘                └────┬────┘
     │                          │                          │
     │ 1. Recibe email con link │                          │
     │<─────────────────────────┤                          │
     │                          │                          │
     │ 2. Clic en link          │                          │
     ├─────────────────────────>│                          │
     │                          │                          │
     │ 3. GET /cliente/:token   │                          │
     ├─────────────────────────>│                          │
     │                          │                          │
     │                          │ 4. validateToken(token)  │
     │                          ├─────────────────────────>│
     │                          │                          │
     │                          │ 5. Query BD con token    │
     │                          │<─────────────────────────┤
     │                          │                          │
     │                          │ 6. Retorna clientId      │
     │                          │<─────────────────────────┤
     │                          │                          │
     │                          │ 7. Guarda en sessionStorage
     │                          │    - clientId            │
     │                          │    - token               │
     │                          │                          │
     │                          │ 8. Redirige a /cliente/dashboard
     │                          │                          │
     │ 9. Renderiza dashboard   │                          │
     │<─────────────────────────┤                          │
     │                          │                          │
     │ 10. Queries filtradas    │                          │
     │    por clientId          │                          │
     │<─────────────────────────┤                          │
```

### 9.4 Protección de Rutas

**Rutas administrativas (requieren Manus OAuth):**

```typescript
// En DashboardLayout.tsx
const { user, loading } = useAuth();

if (loading) {
  return <DashboardLayoutSkeleton />;
}

if (!user) {
  window.location.href = getLoginUrl();
  return null;
}

return (
  <div>
    {/* Contenido del dashboard */}
  </div>
);
```

**Rutas de clientes (requieren token válido):**

```typescript
// En ClienteDashboard.tsx
const { clientId, isLoading } = useClientAuth();

if (isLoading) {
  return <Loader2 className="animate-spin" />;
}

if (!clientId) {
  return <Navigate to="/" />;
}

return (
  <div>
    {/* Contenido del portal de cliente */}
  </div>
);
```

### 9.5 Contexto de Autenticación de Clientes

El archivo `client/src/contexts/ClientAuthContext.tsx` maneja el estado de autenticación de clientes:

```typescript
export function ClientAuthProvider({ children }: { children: ReactNode }) {
  const [clientId, setClientId] = useState<number | null>(null);
  const [token, setToken] = useState<string | null>(null);
  
  useEffect(() => {
    const loadFromStorage = () => {
      const storedClientId = sessionStorage.getItem('clientId');
      const storedToken = sessionStorage.getItem('clientAccessToken');
      
      if (storedClientId && storedToken) {
        setClientId(parseInt(storedClientId));
        setToken(storedToken);
      }
    };
    
    loadFromStorage();
    
    // Escuchar evento personalizado cuando se guarda token
    window.addEventListener('clientAuthChanged', loadFromStorage);
    
    return () => {
      window.removeEventListener('clientAuthChanged', loadFromStorage);
    };
  }, []);
  
  const { data: clientData } = trpc.clientAccess.getClientData.useQuery(
    { token: token! },
    { enabled: !!token }
  );
  
  const logout = () => {
    sessionStorage.removeItem('clientId');
    sessionStorage.removeItem('clientAccessToken');
    setClientId(null);
    setToken(null);
    window.location.href = '/';
  };
  
  return (
    <ClientAuthContext.Provider value={{ clientId, clientData, logout }}>
      {children}
    </ClientAuthContext.Provider>
  );
}
```

---

## 10. Metodología de Desarrollo

### 10.1 Enfoque Iterativo

El desarrollo del proyecto siguió un enfoque **iterativo e incremental**, priorizando funcionalidad core sobre features avanzadas.

**Fases de desarrollo:**

1. **Fase 0: Configuración (Día 1)**
   - Inicialización del proyecto con template tRPC
   - Configuración de base de datos
   - Configuración de OAuth
   - Estructura de carpetas

2. **Fase 1: CRUD Básico (Días 2-4)**
   - Esquema de base de datos inicial
   - CRUD de clientes
   - CRUD de candidatos
   - CRUD de puestos
   - CRUD de procesos básico

3. **Fase 2: Historial Laboral (Día 5)**
   - Tabla `workHistory`
   - Formulario de añadir empleo
   - Formulario de editar empleo
   - Vista de historial en detalle de candidato

4. **Fase 3: Integraciones (Días 6-7)**
   - Integración con Evaluar.Online
   - Integración con SendGrid
   - Webhook de psicométricas
   - Envío de invitaciones

5. **Fase 4: Flujos Integrados (Día 8)**
   - Flujo Completo
   - Flujo Rápido
   - Flujo desde Puesto

6. **Fase 5: Mejoras de UX (Días 9-10)**
   - Ampliación de tipos de procesos
   - Causales de salida
   - Cálculo automático de tiempo trabajado
   - Mejoras visuales

7. **Fase 6: Portal de Clientes (Días 11-12)**
   - Sistema de tokens únicos
   - Contexto de autenticación
   - Dashboard de cliente
   - Vistas de detalle
   - **Bug pendiente de resolución**

### 10.2 Principios de Diseño

**1. Type Safety First:**
- TypeScript en todo el stack
- tRPC para type-safety end-to-end
- Drizzle ORM para queries tipadas
- Zod para validación de schemas

**2. DRY (Don't Repeat Yourself):**
- Helpers reutilizables en `server/db.ts`
- Componentes UI de shadcn/ui
- Constantes compartidas en `lib/constants.ts`
- Hooks personalizados para lógica común

**3. Separation of Concerns:**
- Backend: lógica de negocio y acceso a datos
- Frontend: presentación y UX
- Integraciones: wrappers aislados
- Base de datos: esquema normalizado

**4. Progressive Enhancement:**
- Funcionalidad básica primero
- Features avanzadas después
- No bloquear desarrollo por features secundarias

**5. User-Centric Design:**
- Flujos de trabajo optimizados para Paula
- Reducción de clics y navegación
- Feedback visual inmediato
- Mensajes de error claros

### 10.3 Convenciones de Código

**Nomenclatura:**

- **Archivos:** camelCase para componentes (`ClienteDetalle.tsx`), kebab-case para utilidades (`date-utils.ts`)
- **Componentes:** PascalCase (`DashboardLayout`)
- **Funciones:** camelCase (`getUserByOpenId`)
- **Variables:** camelCase (`clientId`)
- **Constantes:** UPPER_SNAKE_CASE (`API_BASE_URL`)
- **Tipos:** PascalCase (`User`, `InsertUser`)
- **Interfaces:** PascalCase con sufijo `Interface` si es necesario (`ClientAuthContextInterface`)

**Estructura de componentes:**

```typescript
// 1. Imports
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';

// 2. Tipos e interfaces
interface MiComponenteProps {
  id: number;
  nombre: string;
}

// 3. Componente principal
export default function MiComponente({ id, nombre }: MiComponenteProps) {
  // 3.1 Hooks de estado
  const [loading, setLoading] = useState(false);
  
  // 3.2 Queries y mutations
  const { data } = trpc.clients.getById.useQuery({ id });
  const updateClient = trpc.clients.update.useMutation();
  
  // 3.3 Handlers
  const handleSubmit = () => {
    // ...
  };
  
  // 3.4 Effects
  useEffect(() => {
    // ...
  }, []);
  
  // 3.5 Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}

// 4. Componentes auxiliares (si son pequeños)
function SubComponente() {
  return <div>...</div>;
}
```

**Comentarios:**

```typescript
// ✅ Buenos comentarios (explican el "por qué")
// Usamos setTimeout para evitar race condition con sessionStorage
setTimeout(() => setLocation('/dashboard'), 100);

// Generamos clave única con formato TIPO-AÑO-CONSECUTIVO
const clave = `${tipo}-${year}-${consecutivo.toString().padStart(3, '0')}`;

// ❌ Malos comentarios (repiten el código)
// Incrementar contador
contador++;

// Llamar a la API
fetch('/api/data');
```

### 10.4 Gestión de Estado

**Estado local (useState):**
- Formularios
- UI state (modales abiertos, tabs activos)
- Estado temporal

**Estado global (React Context):**
- Autenticación de clientes (`ClientAuthContext`)
- Tema dark/light (`ThemeContext`)

**Estado del servidor (React Query via tRPC):**
- Datos de base de datos
- Resultados de APIs
- Cache automático

**Regla general:** Preferir estado del servidor sobre estado local cuando sea posible.

### 10.5 Manejo de Errores

**Backend:**

```typescript
// Errores de tRPC con códigos HTTP
throw new TRPCError({
  code: 'UNAUTHORIZED', // 401
  message: 'Debes iniciar sesión',
});

throw new TRPCError({
  code: 'NOT_FOUND', // 404
  message: 'Cliente no encontrado',
});

throw new TRPCError({
  code: 'BAD_REQUEST', // 400
  message: 'RFC inválido',
});
```

**Frontend:**

```typescript
const createClient = trpc.clients.create.useMutation({
  onSuccess: () => {
    toast.success('Cliente creado exitosamente');
    setLocation('/clientes');
  },
  onError: (error) => {
    toast.error(error.message);
  },
});
```

**Error Boundary:**

```typescript
// En ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('Error capturado:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <div>Algo salió mal. Por favor, recarga la página.</div>;
    }
    return this.props.children;
  }
}
```

---

## 11. Estado Actual del Proyecto

### 11.1 Funcionalidades Completadas (✅)

**Sistema Administrativo:**
- ✅ Autenticación con Manus OAuth
- ✅ Dashboard principal con estadísticas
- ✅ Navegación lateral completa
- ✅ CRUD completo de clientes
- ✅ CRUD completo de candidatos
- ✅ CRUD completo de puestos
- ✅ CRUD de procesos (crear y listar, falta editar)
- ✅ Historial laboral de candidatos con CRUD completo
- ✅ Cálculo automático de tiempo trabajado
- ✅ 14 tipos de procesos diferentes
- ✅ Generación automática de claves (ILA-2025-001, etc.)
- ✅ 11 opciones de causales de salida (RH y Jefe)

**Flujos de Trabajo:**
- ✅ Flujo Completo (Cliente → Candidato → Puesto → Proceso)
- ✅ Flujo Rápido (Candidato → Puesto → Proceso)
- ✅ Flujo desde Puesto (Puesto → Proceso)

**Integraciones:**
- ✅ Evaluar.Online (asignar, consultar, descargar)
- ✅ SendGrid (invitaciones, notificaciones)
- ✅ Webhook de psicométricas

**Portal de Clientes (Infraestructura):**
- ✅ Tabla `clientAccessTokens`
- ✅ Helpers de generación y validación de tokens
- ✅ Router tRPC `clientAccess`
- ✅ Contexto de autenticación (`ClientAuthContext`)
- ✅ Página de validación (`ClienteAcceso.tsx`)
- ✅ Dashboard de cliente (`ClienteDashboard.tsx`)
- ✅ Vista de detalle de proceso (`ClienteProcesoDetalle.tsx`)
- ✅ Vista de detalle de candidato (`ClienteCandidatoDetalle.tsx`)
- ✅ Rutas configuradas en `App.tsx`
- ✅ Función de envío de email con enlace

### 11.2 Funcionalidades Parcialmente Implementadas (⏳)

**Procesos:**
- ⏳ Editar proceso (falta formulario de edición)
- ⏳ Cambiar estatus de proceso (falta UI)
- ⏳ Cambiar calificación final (falta UI)

**Visitas Domiciliarias:**
- ⏳ Asignar encuestador (campo existe en BD, falta UI)
- ⏳ Programar fecha de visita (campo existe en BD, falta UI)
- ⏳ Registrar resultados (campo existe en BD, falta UI)

**Documentos:**
- ⏳ Tabla existe en BD
- ⏳ Helpers de S3 configurados
- ⏳ Falta UI de subida y visualización

**Portal de Clientes:**
- ⏳ Bug de validación de tokens (timezone/fechas)
- ⏳ Falta probar flujo completo
- ⏳ Falta botón "Reenviar enlace" en admin
- ⏳ Falta activar envío automático de emails

### 11.3 Funcionalidades No Implementadas (❌)

**Generación de Dictámenes:**
- ❌ Template HTML de dictamen
- ❌ Generación de PDF
- ❌ Integración con Gemini AI para análisis
- ❌ Almacenamiento en S3
- ❌ Preview antes de generar

**Gestión de Encuestadores:**
- ❌ Formulario de registro
- ❌ Lista de encuestadores
- ❌ Asignación de visitas
- ❌ Historial de asignaciones

**Gestión de Pagos:**
- ❌ Formulario de registro de pago
- ❌ Lista de pagos
- ❌ Vinculación pago-proceso-encuestador
- ❌ Reportes de pagos

**Comentarios y Seguimiento:**
- ❌ Añadir comentarios a candidatos
- ❌ Añadir comentarios a procesos
- ❌ Bitácora de cambios
- ❌ Historial de acciones

**Búsqueda y Filtros:**
- ❌ Búsqueda global
- ❌ Filtros por cliente
- ❌ Filtros por estatus
- ❌ Filtros por fecha
- ❌ Ordenamiento de listas

**Estadísticas Avanzadas:**
- ❌ Gráficas de tendencias
- ❌ Reportes exportables
- ❌ KPIs detallados

### 11.4 Métricas del Proyecto

| Métrica | Valor |
|---------|-------|
| **Líneas de código** | ~15,000 |
| **Archivos TypeScript** | ~50 |
| **Componentes React** | ~30 |
| **Routers tRPC** | 8 |
| **Tablas de BD** | 12 |
| **Integraciones externas** | 4 (OAuth, Psico, Email, Storage) |
| **Días de desarrollo** | 12 |
| **Completitud Fase 1** | ~75% |

---

## 12. Bugs Conocidos

### 12.1 Bug Crítico: Validación de Tokens de Clientes

**Descripción:**

Cuando un cliente intenta acceder mediante un enlace único (`/cliente/:token`), el sistema muestra "Enlace Inválido o Expirado" aunque el token existe en la base de datos y no ha expirado.

**Síntomas:**

1. Script de prueba genera token correctamente
2. Token se guarda en base de datos con `expiresAt` 30 días en el futuro
3. Query SQL directa encuentra el token: `SELECT * FROM clientAccessTokens WHERE token = '...'` retorna 1 fila
4. Función `validateClientToken()` retorna `null`
5. Logs muestran: "No se encontró token válido"

**Causa raíz identificada:**

La comparación de fechas en la query de Drizzle falla:

```typescript
const result = await db
  .select(...)
  .from(clientAccessTokens)
  .where(
    and(
      eq(clientAccessTokens.token, token),
      gt(clientAccessTokens.expiresAt, now) // ← Esta comparación falla
    )
  );
```

**Hipótesis:**

- **Timezone mismatch:** `now` se crea con `new Date()` en timezone del servidor, pero `expiresAt` puede estar en UTC
- **Formato de fecha:** TiDB puede estar almacenando fechas en un formato diferente al esperado
- **Comparación de tipos:** Drizzle puede estar comparando strings en lugar de timestamps

**Evidencia:**

```sql
-- Query directa funciona
SELECT * FROM clientAccessTokens 
WHERE token = 'da1435d3effe326053f39bfe7c3f14bfd8af829b5062361be80dd34388cd370d';
-- Retorna: 1 fila

-- Query con comparación de fecha falla
SELECT * FROM clientAccessTokens 
WHERE token = '...' AND expiresAt > NOW();
-- Retorna: 0 filas
```

**Archivos afectados:**

- `server/auth/clientTokens.ts` (función `validateClientToken`)
- `client/src/pages/ClienteAcceso.tsx` (página de validación)
- `client/src/contexts/ClientAuthContext.tsx` (contexto de autenticación)

**Workarounds intentados:**

1. ✅ Agregar delay antes de redirigir (no resolvió)
2. ✅ Evento personalizado para sincronizar sessionStorage (no resolvió)
3. ✅ Logs de depuración (confirmaron que el problema está en la query)
4. ❌ Normalizar timezone (pendiente)
5. ❌ Cambiar comparación de fechas (pendiente)

**Solución propuesta:**

```typescript
export async function validateClientToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  
  // Opción 1: Usar UNIX timestamp en lugar de TIMESTAMP
  const nowUnix = Math.floor(Date.now() / 1000);
  
  const result = await db
    .select(...)
    .from(clientAccessTokens)
    .where(
      and(
        eq(clientAccessTokens.token, token),
        gt(clientAccessTokens.expiresAtUnix, nowUnix)
      )
    );
  
  // Opción 2: Hacer la comparación en JavaScript
  const allTokens = await db
    .select(...)
    .from(clientAccessTokens)
    .where(eq(clientAccessTokens.token, token));
  
  if (allTokens.length === 0) return null;
  
  const tokenData = allTokens[0];
  const now = new Date();
  const expiresAt = new Date(tokenData.token.expiresAt);
  
  if (expiresAt < now) return null;
  
  return tokenData.client;
}
```

**Prioridad:** 🔴 Alta (bloquea funcionalidad completa del portal de clientes)

**Tiempo estimado de resolución:** 2-4 horas

---

## 13. Próximos Pasos

### 13.1 Prioridad Alta (Semana 1)

**1. Arreglar bug de validación de tokens**
- Investigar diferencia de timezone
- Implementar solución (UNIX timestamp o comparación en JS)
- Probar flujo completo de portal de clientes
- Verificar que tokens se validan correctamente

**2. Completar portal de clientes**
- Activar envío automático de emails al crear proceso
- Agregar botón "Reenviar enlace" en panel de admin
- Probar con datos reales
- Documentar flujo para Paula

**3. Formulario de edición de procesos**
- Crear `ProcesoEditar.tsx`
- Permitir actualizar todos los campos
- Permitir cambiar estatus
- Permitir cambiar calificación final
- Agregar validaciones

**4. Gestión básica de visitas domiciliarias**
- UI para asignar encuestador
- UI para programar fecha de visita
- UI para registrar resultados
- Actualizar estatus del proceso automáticamente

### 13.2 Prioridad Media (Semana 2)

**5. Generación de dictámenes**
- Diseñar template HTML profesional
- Implementar generación de PDF con WeasyPrint o Puppeteer
- Integrar con Gemini AI para análisis automático
- Almacenar en S3
- Permitir preview antes de generar
- Botón de descarga en portal de clientes

**6. Gestión de documentos**
- UI de subida de archivos (drag & drop)
- Integración con S3 Storage
- Visualizador de documentos
- Categorización por tipo
- Descarga de documentos

**7. Sistema de comentarios**
- Formulario de añadir comentario a candidato
- Formulario de añadir comentario a proceso
- Lista de comentarios con autor y fecha
- Bitácora automática de cambios de estatus

### 13.3 Prioridad Baja (Semana 3)

**8. Gestión de encuestadores**
- CRUD completo de encuestadores
- Asignación de zonas de cobertura
- Historial de asignaciones
- Estadísticas por encuestador

**9. Gestión de pagos**
- CRUD completo de pagos
- Vinculación con procesos y encuestadores
- Reportes de pagos por período
- Exportación a Excel

**10. Búsqueda y filtros**
- Búsqueda global por nombre, RFC, email
- Filtros por cliente en todas las listas
- Filtros por estatus de proceso
- Filtros por fecha de creación
- Ordenamiento por columnas

**11. Estadísticas avanzadas**
- Dashboard con gráficas (Chart.js o Recharts)
- Tendencias de procesos por mes
- Distribución de calificaciones
- Tiempo promedio de finalización
- Exportación de reportes

### 13.4 Mejoras Técnicas

**12. Testing**
- Unit tests con Vitest
- Integration tests de routers tRPC
- E2E tests con Playwright
- Coverage mínimo del 70%

**13. Performance**
- Agregar índices a base de datos
- Implementar paginación en listas
- Lazy loading de imágenes
- Code splitting de rutas

**14. Seguridad**
- Rate limiting en APIs
- Sanitización de inputs
- Validación de archivos subidos
- Logs de auditoría

**15. DevOps**
- CI/CD con GitHub Actions
- Deployment automático
- Monitoreo de errores (Sentry)
- Backups automáticos de BD

---

## 14. Guía para Continuar el Desarrollo

### 14.1 Onboarding para Nueva IA

**Paso 1: Familiarización con el código (2 horas)**

1. Leer este documento completo
2. Explorar estructura de archivos
3. Revisar esquema de base de datos en `drizzle/schema.ts`
4. Revisar routers principales en `server/routers.ts`
5. Revisar páginas principales en `client/src/pages/`

**Paso 2: Configuración del entorno (30 minutos)**

1. Clonar repositorio: `gh repo clone integra-rh`
2. Instalar dependencias: `pnpm install`
3. Verificar variables de entorno (ya están configuradas en Manus)
4. Iniciar servidor de desarrollo: `pnpm dev`
5. Verificar que el sistema carga correctamente

**Paso 3: Resolver bug crítico (2-4 horas)**

1. Leer sección "12.1 Bug Crítico: Validación de Tokens de Clientes"
2. Reproducir el bug ejecutando `pnpm exec tsx scripts/demo-client-portal.ts`
3. Implementar una de las soluciones propuestas
4. Probar que el flujo completo funciona
5. Guardar checkpoint con la solución

**Paso 4: Continuar con prioridades altas (1-2 días por tarea)**

1. Seguir la lista de "13.1 Prioridad Alta"
2. Para cada tarea:
   - Leer documentación relacionada en este documento
   - Revisar código existente similar
   - Implementar siguiendo las convenciones establecidas
   - Probar manualmente
   - Actualizar `todo.md`
   - Guardar checkpoint

### 14.2 Comandos Útiles

```bash
# Desarrollo
pnpm dev                    # Iniciar servidor de desarrollo
pnpm build                  # Build para producción
pnpm preview                # Preview de build

# Base de datos
pnpm db:push                # Aplicar cambios de schema
pnpm db:studio              # Abrir Drizzle Studio (GUI de BD)

# Testing
pnpm test                   # Ejecutar tests (cuando existan)
pnpm test:watch             # Tests en modo watch

# Linting
pnpm lint                   # Ejecutar ESLint
pnpm lint:fix               # Arreglar errores automáticamente

# Scripts personalizados
pnpm exec tsx scripts/demo-client-portal.ts  # Generar token de prueba
pnpm exec tsx scripts/create-demo-data.ts    # Crear datos de demostración
```

### 14.3 Recursos Adicionales

**Documentación oficial:**

- [React 19 Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [tRPC Documentation](https://trpc.io/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team/docs/overview)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)

**APIs externas:**

- [Evaluar.Online API](https://api.evaluar.online/docs)
- [SendGrid API](https://docs.sendgrid.com)
- [Google Gemini API](https://ai.google.dev/docs)

**Herramientas:**

- [Drizzle Studio](https://orm.drizzle.team/drizzle-studio/overview) - GUI de base de datos
- [tRPC Panel](https://github.com/iway1/trpc-panel) - GUI de testing de tRPC

### 14.4 Contacto y Soporte

**Cliente:** Dra. Paula León  
**Email:** (proporcionado por el usuario)  
**Proyecto:** INTEGRA-RH  
**Repositorio:** GitHub (integrado con Manus)

**Para preguntas técnicas:**
- Revisar este documento primero
- Buscar en código existente patrones similares
- Consultar documentación oficial de las tecnologías
- En caso de duda, preguntar al usuario

### 14.5 Checklist de Entrega de Features

Antes de marcar una feature como completada, verificar:

- [ ] Código implementado siguiendo convenciones del proyecto
- [ ] TypeScript sin errores
- [ ] Funcionalidad probada manualmente
- [ ] UI responsive (móvil, tablet, desktop)
- [ ] Manejo de errores implementado
- [ ] Loading states implementados
- [ ] Mensajes de éxito/error con toasts
- [ ] Validación de inputs
- [ ] Actualizado `todo.md` marcando tarea como completada
- [ ] Checkpoint guardado con descripción clara
- [ ] Documentación actualizada si es necesario

### 14.6 Patrones de Implementación

**Para agregar un nuevo CRUD:**

1. **Definir esquema en `drizzle/schema.ts`:**
```typescript
export const miEntidad = mysqlTable('mi_entidad', {
  id: int('id').autoincrement().primaryKey(),
  nombre: text('nombre').notNull(),
  // ... más campos
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
});

export type MiEntidad = typeof miEntidad.$inferSelect;
export type InsertMiEntidad = typeof miEntidad.$inferInsert;
```

2. **Aplicar migración:**
```bash
pnpm db:push
```

3. **Crear helpers en `server/db.ts`:**
```typescript
export async function getMiEntidadById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(miEntidad)
    .where(eq(miEntidad.id, id))
    .limit(1);
  
  return result[0];
}
```

4. **Crear router en `server/routers.ts`:**
```typescript
miEntidad: router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    return db?.select().from(miEntidad) || [];
  }),
  
  create: protectedProcedure
    .input(z.object({ nombre: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const result = await db?.insert(miEntidad).values(input);
      return { id: result?.insertId };
    }),
  
  // ... más procedimientos
}),
```

5. **Crear página de lista en `client/src/pages/MiEntidades.tsx`:**
```typescript
export default function MiEntidades() {
  const { data, isLoading } = trpc.miEntidad.list.useQuery();
  
  return (
    <DashboardLayout>
      <div className="p-6">
        <h1>Mi Entidad</h1>
        {isLoading && <p>Cargando...</p>}
        <Table>
          {/* ... */}
        </Table>
      </div>
    </DashboardLayout>
  );
}
```

6. **Agregar ruta en `client/src/App.tsx`:**
```typescript
<Route path="/mi-entidad" component={MiEntidades} />
```

7. **Agregar al menú en `DashboardLayout.tsx`:**
```typescript
<Link href="/mi-entidad">
  <Icon className="w-5 h-5" />
  Mi Entidad
</Link>
```

---

## Conclusión

Este documento proporciona una visión completa del proyecto INTEGRA-RH en su estado actual. El sistema está aproximadamente **75% completo** para la Fase 1, con funcionalidades core operativas y un bug crítico pendiente de resolución.

La arquitectura está bien establecida, las convenciones son claras, y el código sigue patrones consistentes. Una nueva IA puede continuar el desarrollo siguiendo esta documentación y los patrones existentes en el código.

**Puntos clave para recordar:**

1. **Type safety es fundamental** - Usar TypeScript y tRPC en todo momento
2. **Seguir convenciones establecidas** - Revisar código existente antes de implementar
3. **Priorizar funcionalidad sobre estética** - Fase 1 se enfoca en features core
4. **Probar manualmente cada feature** - No hay tests automatizados aún
5. **Documentar cambios importantes** - Actualizar `todo.md` y guardar checkpoints
6. **Resolver bug crítico primero** - Portal de clientes está bloqueado por este bug

**Próximo checkpoint esperado:** Resolución del bug de validación de tokens y portal de clientes completamente funcional.

---

**Documento generado por:** Manus AI  
**Fecha:** 31 de Octubre, 2025  
**Versión del proyecto:** 111d5294  
**Última actualización:** 31 de Octubre, 2025 20:57 CST

