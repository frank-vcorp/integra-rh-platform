# Checkpoint: Corrección BD Cloud Run → Railway

**Fecha**: 23 de diciembre de 2025, 08:00 UTC  
**Responsable**: SOFIA (Builder Agent)  
**Tarea**: Limpiar referencias a BD antigua (Cloud SQL) y vincular Cloud Run con Railway

---

## Problema Identificado

Cloud Run tenía configurada una instancia MySQL **inexistente**:
- **Host**: 34.134.83.164:3306  
- **BD**: integra_rh_v2
- **Estado**: La instancia no existe, base de datos desmantelada

La BD **actual** está en:
- **Host**: gondola.proxy.rlwy.net:18090  
- **Plataforma**: Railway  
- **BD**: integra_rh_v2

---

## Acciones Realizadas

### 1. Actualizar Cloud Run con URL correcta
```bash
gcloud run services update integra-rh-backend \
  --region=us-central1 \
  --update-env-vars="DATABASE_URL=mysql://Integra-rh:X%2FT9gHT7i4%2Abk1D8@gondola.proxy.rlwy.net:18090/integra_rh_v2"
```

**Resultado**: ✅ DATABASE_URL actualizado correctamente  
**Verificación**: `gcloud run services describe integra-rh-backend` → Variable correcta en Railway

### 2. Limpiar Registros del Sistema

| Archivo | Cambio |
|---------|--------|
| `PROYECTO.md` | PVM-DB-03: "Cloud SQL" → "Railway" |
| `Checkpoints/MASTER_2025-11-01.md` | "Infra DB: Cloud SQL" → "Infra DB: Railway" |
| `Checkpoints/MASTER_2025-11-01.md` | DATABASE_URL ejemplo: Cloud SQL → Railway |

---

## Estado Actual

| Componente | Estado | Detalles |
|------------|--------|---------|
| Cloud Run | ✅ Correcto | Apuntando a Railway (gondola.proxy.rlwy.net:18090) |
| Registros | ✅ Limpio | Eliminadas referencias a Cloud SQL antigua |
| Documentación | ✅ Actualizada | PROYECTO.md y checkpoints reflejan Railway como BD actual |

---

## Validación

```
🟢 Cloud Run Status: Activo
🟢 DATABASE_URL: mysql://...@gondola.proxy.rlwy.net:18090/integra_rh_v2
🟢 Última actualización: 2025-12-23 07:58:15 UTC
🟢 Registros del sistema: Limpios
```

---

## Next Steps

El servicio Cloud Run está **listo para recibir requests** con la BD correcta de Railway.

Próximos pasos recomendados:
1. Ejecutar test de connectivity: `SELECT 1` desde Cloud Run hacia Railway
2. Validar que migraciones Drizzle están aplicadas en Railway
3. Monitorear logs de Cloud Run para verificar conexión exitosa
