# Checkpoint: Firebase Functions Compilation Blocked - Missing Source Files

## Problema a Resolver:
El directorio `functions/` del proyecto, que contiene las Firebase Functions, no puede compilar TypeScript. La causa principal es que los archivos fuente `.ts` de este directorio parecen estar perdidos o no rastreados por Git, lo que impide cualquier desarrollo o despliegue adicional de las funciones.

## Información Técnica para la Resolución:

1.  **Pérdida de Archivos Fuente TypeScript en `functions/`:**
    *   Durante un intento de depuración anterior, se ejecutó un comando `git clean -fdx functions/` de manera agresiva.
    *   Los intentos posteriores para restaurar estos archivos utilizando `git restore functions/` y `git reset --hard` no lograron recuperar los archivos `.ts` en el directorio `functions/`.
    *   Una búsqueda con `glob` de `**/*.ts` dentro de `functions/` confirmó consistentemente que "No se encontraron archivos".
    *   Esto sugiere fuertemente que los archivos fuente TypeScript (`.ts`) para el directorio `functions/` **nunca fueron rastreados por Git** en este repositorio, y fueron eliminados permanentemente por `git clean -fdx`.
    *   Sin estos archivos `.ts`, la compilación es imposible y las funciones no pueden desarrollarse, depurarse ni desplegarse.

2.  **Errores de Compilación (Último Estado Conocido Antes de la Pérdida de Archivos):**
    Antes de la pérdida de archivos, la compilación presentaba varios errores:
    *   `_core/index.ts` (el original, antes de renombrarse) reportaba `TS2307: Cannot find module './vite'`. Este módulo estaba relacionado con una configuración de servidor de desarrollo local y estaba destinado a ser excluido. El error persistió debido a problemas de caché o inclusión inesperada.
    *   `db.ts` reportaba errores `TS2322` relacionados con la incompatibilidad de tipos de `Pool` de `mysql2` con `drizzle-orm`. Esto se debía a una falta de coincidencia estructural en las definiciones de tipo de `Pool`, incluso después de alinear las versiones de `mysql2` y `drizzle-orm` e intentar un "type casting" explícito.
    *   `index.ts` (el punto de entrada principal de Firebase Function) y otros archivos de router reportaban errores `TS2322` (desajuste de tipo de usuario `TrpcContext`). El mensaje de error indicaba que `createContext` estaba devolviendo un `user: DecodedIdToken | null` en lugar de `user: schema.User | null` como se define en `TrpcContext`, y que el contexto devuelto carecía de `req`, `res` y `requestId`.
    *   `../integra-rh-manus/drizzle/schema.ts` reportaba `TS2307: Cannot find module 'drizzle-orm/mysql-core'`. Esto indicaba un problema de resolución de módulos interno dentro del contexto de compilación del proyecto `integra-rh-manus`.

3.  **Contexto de la Estructura del Proyecto:**
    *   El proyecto utiliza `functions/` para las Firebase Cloud Functions.
    *   También tiene `integra-rh-manus/`, que parece ser una biblioteca/módulo separado pero relacionado (potencialmente una estructura de monorepo sin un `package.json` raíz).
    *   Las dependencias (`drizzle-orm`, `mysql2`, `@trpc/server`, etc.) se gestionan dentro del `package.json` de cada subproyecto.

## Estrategia de Resolución del Problema (para Gemini):

1.  **Recuperación de Archivos Fuente (Crítico):** El paso principal y más crítico es recuperar los archivos fuente `.ts` faltantes para el directorio `functions/`. Sin estos, no se puede avanzar. Si hay disponible una copia de seguridad reciente o un historial de control de versiones (más allá de `git reset --hard` a HEAD), debe utilizarse.
2.  **Reconstruir el Proyecto `functions/`:** Una vez recuperados los archivos fuente, se debe realizar una configuración limpia del proyecto `functions/`. Esto incluirá reinstalar dependencias y reconstruir los archivos de configuración (`tsconfig.json`, etc.).
3.  **Resolver Errores de Compilación de TypeScript:** Abordar los errores de compilación de forma sistemática, centrándose en:
    *   Alineación del tipo `TrpcContext` con las expectativas de `createExpressMiddleware`.
    *   Compatibilidad del tipo `Pool` de `mysql2` con `drizzle-orm`.
    *   Resolución de módulos para las dependencias del subproyecto `@integra-rh-manus`.
    *   Resolución del error `drizzle-orm/mysql-core` dentro de `integra-rh-manus`.
