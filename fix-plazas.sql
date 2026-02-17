-- FIX-20260217-01: Poblar clientSiteId en procesos que no lo tienen
-- Este script asigna una plaza (clientSite) a cada proceso que no la tenga
-- Selecciona la primera plaza disponible del cliente
-- IMPORTANTE: Ejecutar en producción después de respaldar la DB

-- Opción 1: Asignar la primera plaza disponible para cada cliente
UPDATE processes p
SET clientSiteId = (
  SELECT MIN(cs.id)
  FROM clientSites cs
  WHERE cs.clientId = p.clienteId
  AND cs.activo = true
  LIMIT 1
)
WHERE p.clientSiteId IS NULL
AND EXISTS (
  SELECT 1
  FROM clientSites cs
  WHERE cs.clientId = p.clienteId
  AND cs.activo = true
);

-- Verificar cuántos procesos se actualizaron
SELECT COUNT(*) as procesos_actualizados FROM processes WHERE clientSiteId IS NOT NULL;

-- Verificar qué procesos quedan sin plaza (sin clientSites disponibles)
SELECT 
  p.id,
  p.clave,
  c.nombreEmpresa,
  COUNT(cs.id) as plazas_disponibles
FROM processes p
LEFT JOIN clients c ON p.clienteId = c.id
LEFT JOIN clientSites cs ON p.clienteId = cs.clientId AND cs.activo = true
WHERE p.clientSiteId IS NULL
GROUP BY p.id, p.clave, c.nombreEmpresa;
