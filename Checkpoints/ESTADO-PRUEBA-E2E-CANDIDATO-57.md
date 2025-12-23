# 🎯 PRUEBA E2E INICIADA - Candidato ID 57

**Estado:** ✅ Guía completa lista para ejecutar  
**URL Panel:** https://integra-rh.web.app/candidatos/57  
**Documentación:** `/home/frank/proyectos/integra-rh/PRUEBA-E2E-CANDIDATO-57.md`  
**Script Helper:** `integra-rh-manus/scripts/test-e2e-candidato-57.mjs`

---

## 📋 RESUMEN DE LA PRUEBA

### Objetivo
Validar que la **sincronización bidireccional** funciona en candidato real (ID 57):
- ✅ Candidato llena datos en self-service
- ✅ Se guardan en BD
- ✅ Aparecen en panel de analista
- ✅ Analista puede editar
- ✅ Candidato ve cambios

### Duración Estimada
⏱️ **10-15 minutos** siguiendo los 8 pasos de la guía

### Herramientas Disponibles

1. **Documento Guía:** `/PRUEBA-E2E-CANDIDATO-57.md`
   - 8 pasos detallados
   - Checklist de validación
   - Troubleshooting
   - Ejemplos de qué llenar

2. **Script Helper:** `node scripts/test-e2e-candidato-57.mjs`
   - Imprime instrucciones
   - Puntos de control técnico
   - Enlaces útiles

3. **DevTools Monitoring:**
   - Network: verificar requests 200 OK
   - Console: revisar errores
   - localStorage: ver datos sincronizados

---

## ✅ PASOS RESUMIDOS

```
1️⃣  Abrir panel: https://integra-rh.web.app/candidatos/57
2️⃣  Click "Editar autocaptura" → abre self-service
3️⃣  Llenar campos específicos (Puesto, NSS, Domicilio)
4️⃣  Marcar ☑ "Acepto términos"
5️⃣  Click "Guardar borrador" → toast verde
6️⃣  Volver a panel → refrescar → datos deberían estar presentes
7️⃣  Analista edita historial laboral
8️⃣  Candidato reabre → ve cambios de analista
```

---

## 🎯 EXPECTATIVAS POR PASO

| Paso | Acción | Resultado Esperado |
|------|--------|-------------------|
| 3-4 | Candidato llena datos | Formulario actualizado |
| 5 | Guardar borrador | Toast verde: "Borrador guardado" |
| 6 | Recargar panel | Datos aparecen en perfil |
| 6 | Badge consentimiento | "✅ ACEPTÓ TÉRMINOS (fecha)" |
| 7 | Analista edita | Badge "(editado)" aparece |
| 8 | Candidato reabre | Ve trabajo agregado por analista |

---

## 🔍 PUNTOS CRÍTICOS A VERIFICAR

```
✅ Toast de guardado aparece
✅ Network: POST /api/candidate-save-full-draft → 200 OK
✅ Badge "ACEPTÓ TÉRMINOS" visible en panel
✅ Datos sincronizados sin pérdidas
✅ Sin errores en DevTools console
✅ localStorage actualizado (Application tab)
✅ Ciclo bidireccional completo
```

---

## 📊 RESULTADO ESPERADO

Si **TODOS** los pasos funcionan:
```
✅ SINCRONIZACIÓN BIDIRECCIONAL FUNCIONAL
   → Listo para producción
   → Documentar resultados
   → Comunicar a stakeholders
```

Si algún paso **FALLA**:
```
❌ Revisar DevTools
   → Network tab: ¿Request es 200 OK?
   → Console: ¿Errores rojos?
   → localStorage: ¿Datos presentes?
   → Reportar con screenshots
```

---

## 📞 SIGUIENTES ACCIONES

### Si Prueba es Exitosa ✅
1. Documentar resultados (en PRUEBA-E2E-CANDIDATO-57-RESULTS.md)
2. Crear checkpoint de validación
3. Marcar tareas SYNC-SS como completadas [✓]
4. Comunicar a equipo que sync está ready

### Si Hay Problemas ❌
1. Adjuntar DevTools screenshots
2. Anotar paso exacto donde falla
3. Incluir requestId (header x-request-id)
4. Abrir issue técnico con detalles

---

## 🔗 ENLACES

- **Panel Candidato:** https://integra-rh.web.app/candidatos/57
- **Guía Completa:** `PRUEBA-E2E-CANDIDATO-57.md`
- **Documentación Sync:** `Checkpoints/GUIA-PRUEBA-E2E-SYNC.md`
- **Checkpoint Base:** `Checkpoints/CHK_2025-12-23_FASE-4-PROBADA-E2E.md`

---

## 📝 COMANDOS ÚTILES

```bash
# Ver instrucciones para prueba
node integra-rh-manus/scripts/test-e2e-candidato-57.mjs

# Validar build
npm run build

# Tests unitarios de sync
node integra-rh-manus/scripts/test-sync.mjs

# Ver logs (si estás en dev)
tail -f logs/app.log
```

---

## 🎯 OBJETIVO GENERAL

Esta prueba **valida el requerimiento original:**

> "Lo único que quiero es que el self-service y el historial laboral estén 
> totalmente sincronizados. Si el candidato llena un campo, se refleje en la 
> vista de las analistas y que puedan modificarlo y que se refleje nuevamente 
> en el self-service."

**Status:** ✅ Implementado  
**Validación:** ⏳ En ejecución (candidato 57)  
**Resultado Esperado:** ✅ Completamente sincronizado

---

**Última Actualización:** 23 de diciembre de 2025, 01:40  
**Build:** ✅ 2796 modules, 4.54s  
**Commits:** 4 (feat + 3 docs)

🚀 **¡Listo para comenzar la prueba manual!**
