-- ARCH-20260324-02
-- Respaldo: context/SPECs/SPEC-indice-fecha-recepcion-procesos.md
ALTER TABLE `processes`
ADD INDEX `idx_processes_fechaRecepcion` (`fechaRecepcion`);
