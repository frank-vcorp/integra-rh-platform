---
applyTo: '**/*.{ts,tsx,js,jsx,css,sql,php,py}'
---
# Convenciones y Estándares de Código — Metodología INTEGRA v3.1.0

Estas reglas aplican automáticamente a todo archivo de código en el proyecto.

## I. Principios Rectores

1. **Código Auto-Documentado > Comentarios** — "El mejor comentario es el que no necesitas escribir porque el código habla por sí mismo."
2. **Principio del Cañón y la Mosca** — "Usa la herramienta más simple que resuelva el problema eficientemente."
3. **Claridad > Brevedad** — "Prefiere nombres largos y claros sobre abreviaciones crípticas."
4. **Consistencia > Preferencia Personal** — "El equipo sigue un estándar, no opiniones individuales."

## II. Convenciones de Nombres

### TypeScript/JavaScript

- **Variables y funciones:** `camelCase` descriptivo — `clientRentalHistory`, no `clRH`
- **Interfaces y tipos:** `PascalCase` sin prefijo `I` — `Cliente`, no `IClient`
- **Constantes globales:** `UPPER_SNAKE_CASE` — `MAX_RENTAL_DURATION_DAYS`
- **Constantes locales:** `camelCase` — `defaultPageSize`
- **Archivos:** `kebab-case` — `firebase-config.ts`, no `firebaseConfig.ts`
- **Type alias:** Específicos — `type RentaEstatus = 'activa' | 'completada'`, no `type Status = string`

## III. Política de Comentarios

### SÍ comentar:
- Decisiones técnicas no obvias (ej: "Firebase tiene límite de 1 write/seg, usamos debounce")
- Workarounds temporales con TODO y ID de intervención: `// TODO(FIX-YYYYMMDD-NN): razón`
- Referencias a documentación: `@see context/interconsultas/DICTAMEN_FIX-*.md`

### NO comentar:
- Código que parafrasea lo obvio (`// Incrementa el contador`)
- Código muerto comentado (eliminar, no comentar)
- Lo que el nombre de la función ya dice

## IV. Estructura de Componentes React

Orden obligatorio:
1. Imports externos (`react`, `next`)
2. Imports internos (`@/components`, `@/lib`)
3. Tipos locales (`interface Props`)
4. Componente con: Hooks → Handlers → Early returns → Render

## V. TypeScript

### Obligatorio tipar:
- Parámetros de funciones públicas
- Valores de retorno de funciones públicas
- Props de componentes

### Evitar:
- `any` → usar `unknown` + type guards
- `as` innecesarios → preferir type guards
- `!` non-null assertion → validar primero

## VI. Manejo de Errores

```typescript
// ✅ Error con contexto
throw new Error(`[ClientService] Cliente ${id} no encontrado`);

// ✅ Try-catch con logging
try {
  await saveClient(data);
} catch (error) {
  console.error('[ClientService] Error guardando cliente:', error);
  throw error;
}
```

## VII. Imports

### Orden: externos → proyecto (`@/`) → tipos → estilos
### Siempre usar alias `@/` para imports internos, nunca rutas relativas profundas (`../../../`)

## VIII. Checklist Pre-Commit

- [ ] ESLint pasa sin errores
- [ ] TypeScript compila sin errores
- [ ] No hay `console.log` de debug
- [ ] No hay código comentado
- [ ] Nombres descriptivos
- [ ] Imports ordenados
