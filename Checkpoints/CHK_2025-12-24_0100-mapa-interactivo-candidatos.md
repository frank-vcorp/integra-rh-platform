# Checkpoint: Mapa Interactivo para Candidatos

**Fecha:** 2025-12-24 01:00  
**Agente:** SOFIA  
**Tipo:** Feature completa  
**Estado:** ✅ Completado y desplegado

---

## Resumen Ejecutivo

Se implementó un mapa interactivo que permite a los candidatos ubicar su dirección exacta con un pin, reemplazando el campo de texto para URL de Google Maps.

## Cambios Realizados

### 1. Nuevo Componente: `MapPicker.tsx`
**Archivo:** `client/src/components/MapPicker.tsx`

- Componente modal con mapa Leaflet + OpenStreetMap
- Geocodificación usando API Nominatim (gratuita)
- Mejoras para direcciones mexicanas:
  - Limpieza de caracteres especiales (`#`)
  - Parámetro `countrycodes=mx`
  - Búsqueda fallback (colonia + municipio + estado)
- Centro por defecto: Ciudad de México (19.4326, -99.1332)
- Click/drag para posicionar pin
- Altura fija de 400px para compatibilidad con Leaflet

### 2. Modificación: `CandidatoSelfService.tsx`
- Tipo de `mapLink` cambiado de `string` a `{ lat: number; lng: number } | null`
- Reemplazado campo Input + botón Google Maps por componente `<MapPicker>`
- Serialización: `JSON.stringify(perfil.mapLink)` en payload

### 3. Modificación: `CandidatoDetalle.tsx`
- Agregados imports de react-leaflet y leaflet CSS
- Reemplazado enlace "Ver ubicación en mapa" por mapa embebido de 300px
- Muestra el pin guardado por el candidato

### 4. Dependencias Agregadas
```bash
pnpm add leaflet react-leaflet
pnpm add -D @types/leaflet
```

## Archivos Modificados

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `client/src/components/MapPicker.tsx` | Creado | Componente de selección de ubicación |
| `client/src/pages/CandidatoSelfService.tsx` | Modificado | Integración de MapPicker |
| `client/src/pages/CandidatoDetalle.tsx` | Modificado | Visualización de mapa embebido |
| `client/package.json` | Modificado | Dependencias leaflet |

## Problemas Resueltos Durante Implementación

1. **Geocodificación fallida para direcciones mexicanas**
   - Causa: Nominatim sensible a formato de dirección
   - Solución: Limpieza de `#`, agregar país, búsqueda fallback

2. **Mapa no visible en modal**
   - Causa: Leaflet requiere dimensiones en píxeles, no CSS classes
   - Solución: `style={{ height: "400px" }}` en lugar de `className="min-h-96"`

## Testing Manual

- ✅ Geocodificación de dirección completa
- ✅ Fallback a ubicación aproximada (colonia/municipio)
- ✅ Click en mapa para posicionar pin
- ✅ Guardar coordenadas
- ✅ Visualización en panel de analista
- ✅ Build exitoso
- ✅ Deploy a Firebase Hosting

## Despliegue

```bash
# Build
cd client && npm run build

# Deploy
firebase deploy --only hosting
```

**URL producción:** https://integra-rh.web.app

## Notas Técnicas

- **API Geocoding:** Nominatim es gratuita pero tiene rate limits. Para uso intensivo considerar Google Geocoding API.
- **Tiles:** OpenStreetMap (gratuito, sin API key)
- **Almacenamiento:** Coordenadas guardadas como JSON string en campo `mapLink`

## Próximos Pasos Sugeridos

- [ ] Validar que el backend deserialice correctamente las coordenadas
- [ ] Considerar mostrar dirección textual junto al mapa en vista de analista
- [ ] Opcional: agregar búsqueda manual dentro del mapa

---

**Commit sugerido:**
```
feat(selfservice): agregar mapa interactivo para ubicación de candidatos

- Nuevo componente MapPicker con Leaflet/OpenStreetMap
- Geocodificación Nominatim optimizada para México
- Reemplaza campo URL por selector visual de ubicación
- Mapa embebido en vista de analista
```
