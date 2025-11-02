/**
 * Utilidades para cálculos de fechas
 */

/**
 * Calcula el tiempo trabajado entre dos fechas
 * @param fechaInicio Fecha de inicio en formato YYYY-MM-DD
 * @param fechaFin Fecha de fin en formato YYYY-MM-DD (opcional, usa fecha actual si no se proporciona)
 * @returns String con el tiempo trabajado en formato "X años Y meses"
 */
export function calcularTiempoTrabajado(fechaInicio?: string, fechaFin?: string): string {
  if (!fechaInicio) {
    return "";
  }

  const inicio = new Date(fechaInicio);
  const fin = fechaFin ? new Date(fechaFin) : new Date();

  // Validar fechas
  if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
    return "";
  }

  // Calcular diferencia en meses
  let años = fin.getFullYear() - inicio.getFullYear();
  let meses = fin.getMonth() - inicio.getMonth();

  // Ajustar si los meses son negativos
  if (meses < 0) {
    años--;
    meses += 12;
  }

  // Construir string de resultado
  const partes: string[] = [];
  
  if (años > 0) {
    partes.push(`${años} ${años === 1 ? 'año' : 'años'}`);
  }
  
  if (meses > 0) {
    partes.push(`${meses} ${meses === 1 ? 'mes' : 'meses'}`);
  }

  // Si no hay años ni meses, calcular días
  if (partes.length === 0) {
    const diffTime = Math.abs(fin.getTime() - inicio.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
  }

  return partes.join(' ');
}

/**
 * Formatea una fecha en formato legible en español
 * @param fecha Fecha en formato YYYY-MM-DD o Date
 * @returns String con la fecha formateada (ej: "Enero 2023")
 */
export function formatearFecha(fecha?: string | Date): string {
  if (!fecha) return "";
  
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
  if (isNaN(date.getTime())) return "";

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  return `${meses[date.getMonth()]} ${date.getFullYear()}`;
}
