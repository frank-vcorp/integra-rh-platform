# Documentación INTEGRA-RH

Bienvenido a la documentación técnica completa del proyecto INTEGRA-RH.

## 📚 Índice de Documentos

### Documentación Principal

**[DOCUMENTACION_TECNICA.md](../DOCUMENTACION_TECNICA.md)** - Documento maestro que contiene:
- Resumen ejecutivo del proyecto
- Arquitectura completa del sistema
- Stack tecnológico detallado
- Estructura de base de datos
- Arquitectura de backend y frontend
- Integraciones externas
- Metodología de desarrollo
- Estado actual y bugs conocidos
- Próximos pasos y roadmap
- Guía completa para continuar el desarrollo

**Audiencia:** Desarrolladores que se incorporan al proyecto, gerentes técnicos, stakeholders.

**Tiempo de lectura:** 60-90 minutos

---

### Documentos Específicos

#### [DATABASE_DIAGRAM.md](./DATABASE_DIAGRAM.md)
Diagrama entidad-relación completo de la base de datos con:
- Diagrama ER en formato Mermaid
- Descripción detallada de cada tabla
- Relaciones entre entidades
- Enumeraciones y tipos
- Índices recomendados
- Consideraciones de diseño

**Audiencia:** Desarrolladores backend, DBAs, arquitectos de datos.

**Tiempo de lectura:** 20-30 minutos

---

#### [WORKFLOWS.md](./WORKFLOWS.md)
Flujos de trabajo del sistema con diagramas de secuencia:
- Flujo de autenticación de administradores
- Flujo completo de creación (Cliente → Candidato → Puesto → Proceso)
- Flujo rápido de creación
- Flujo de asignación de psicométricas
- Flujo de portal de clientes
- Flujo de visita domiciliaria (propuesto)
- Flujo de generación de dictamen (propuesto)

**Audiencia:** Desarrolladores fullstack, diseñadores UX, product managers.

**Tiempo de lectura:** 40-50 minutos

---

## 🚀 Inicio Rápido

Si eres una nueva IA o desarrollador incorporándote al proyecto, sigue estos pasos:

### 1. Lee el Documento Principal (2 horas)
Comienza leyendo **[DOCUMENTACION_TECNICA.md](../DOCUMENTACION_TECNICA.md)** de principio a fin. Este documento te dará una visión completa del proyecto.

### 2. Configura tu Entorno (30 minutos)
```bash
# Clonar repositorio
gh repo clone integra-rh

# Instalar dependencias
cd integra-rh
pnpm install

# Iniciar servidor de desarrollo
pnpm dev
```

Las variables de entorno ya están configuradas en Manus. No necesitas crear archivos `.env`.

### 3. Explora el Código (1 hora)
Revisa los archivos clave en este orden:
1. `drizzle/schema.ts` - Esquema de base de datos
2. `server/routers.ts` - Endpoints de API
3. `client/src/App.tsx` - Rutas del frontend
4. `client/src/pages/Home.tsx` - Dashboard principal

### 4. Resuelve el Bug Crítico (2-4 horas)
Lee la sección "12.1 Bug Crítico: Validación de Tokens de Clientes" en el documento principal y resuélvelo.

### 5. Continúa con Prioridades Altas (1-2 días por tarea)
Sigue la lista de "13.1 Prioridad Alta" en el documento principal.

---

## 📊 Estado del Proyecto

| Métrica | Valor |
|---------|-------|
| **Completitud Fase 1** | ~75% |
| **Líneas de código** | ~15,000 |
| **Componentes React** | ~30 |
| **Tablas de BD** | 12 |
| **Integraciones** | 4 (OAuth, Psico, Email, Storage) |
| **Días de desarrollo** | 12 |

### Funcionalidades Completadas ✅
- Sistema administrativo completo
- CRUD de todas las entidades
- Flujos de trabajo integrados
- Integración con psicométricas
- Integración con email
- Historial laboral con cálculo automático

### Funcionalidades Pendientes ⏳
- Edición de procesos
- Visitas domiciliarias completas
- Generación de dictámenes
- Gestión de documentos
- Portal de clientes (bug pendiente)

---

## 🐛 Bugs Conocidos

### Bug Crítico: Validación de Tokens de Clientes
**Prioridad:** 🔴 Alta

**Descripción:** Los tokens de acceso de clientes no se validan correctamente debido a un problema de timezone/comparación de fechas.

**Estado:** Identificado, solución propuesta, pendiente de implementación.

**Detalles:** Ver sección 12.1 del documento principal.

---

## 🛠️ Comandos Útiles

```bash
# Desarrollo
pnpm dev                    # Iniciar servidor de desarrollo
pnpm build                  # Build para producción

# Base de datos
pnpm db:push                # Aplicar cambios de schema
pnpm db:studio              # Abrir Drizzle Studio

# Scripts personalizados
pnpm exec tsx scripts/test-client-token.ts    # Generar token de prueba
pnpm exec tsx scripts/create-demo-data.ts     # Crear datos de demo
```

---

## 📖 Recursos Adicionales

### Documentación Oficial
- [React 19](https://react.dev)
- [TypeScript](https://www.typescriptlang.org/docs/)
- [tRPC](https://trpc.io/docs)
- [Drizzle ORM](https://orm.drizzle.team/docs/overview)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)

### APIs Externas
- [Evaluar.Online API](https://api.evaluar.online/docs)
- [SendGrid API](https://docs.sendgrid.com)
- [Google Gemini API](https://ai.google.dev/docs)

---

## 📝 Convenciones de Código

### Nomenclatura
- **Archivos:** camelCase para componentes, kebab-case para utilidades
- **Componentes:** PascalCase
- **Funciones:** camelCase
- **Variables:** camelCase
- **Constantes:** UPPER_SNAKE_CASE
- **Tipos:** PascalCase

### Estructura de Componentes
```typescript
// 1. Imports
import { useState } from 'react';
import { trpc } from '@/lib/trpc';

// 2. Tipos
interface Props {
  id: number;
}

// 3. Componente
export default function MiComponente({ id }: Props) {
  // 3.1 Estado
  const [loading, setLoading] = useState(false);
  
  // 3.2 Queries
  const { data } = trpc.clients.getById.useQuery({ id });
  
  // 3.3 Handlers
  const handleClick = () => {
    // ...
  };
  
  // 3.4 Render
  return <div>...</div>;
}
```

---

## 🤝 Contribución

### Checklist de Entrega
Antes de marcar una feature como completada:

- [ ] Código sigue convenciones del proyecto
- [ ] TypeScript sin errores
- [ ] Funcionalidad probada manualmente
- [ ] UI responsive
- [ ] Manejo de errores implementado
- [ ] Loading states implementados
- [ ] Validación de inputs
- [ ] `todo.md` actualizado
- [ ] Checkpoint guardado
- [ ] Documentación actualizada

### Flujo de Trabajo
1. Leer documentación relacionada
2. Revisar código existente similar
3. Implementar siguiendo convenciones
4. Probar manualmente
5. Actualizar `todo.md`
6. Guardar checkpoint con descripción clara

---

## 📞 Contacto

**Cliente:** Dra. Paula León  
**Proyecto:** INTEGRA-RH  
**Repositorio:** GitHub (integrado con Manus)

Para preguntas técnicas:
1. Revisar esta documentación primero
2. Buscar en código existente patrones similares
3. Consultar documentación oficial de las tecnologías
4. En caso de duda, preguntar al usuario

---

## 📄 Licencia

Este proyecto es propiedad de la Dra. Paula León y está protegido por derechos de autor.

---

**Documentación generada por:** Manus AI  
**Fecha:** 31 de Octubre, 2025  
**Versión del proyecto:** 111d5294  
**Última actualización:** 31 de Octubre, 2025
