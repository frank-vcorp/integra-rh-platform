/**
 * Helpers para normalizar nombres de archivo antes de usarlos como
 * segmentos de object path en Firebase Storage / Google Cloud Storage.
 *
 * @intervention IMPL-ARCH-20260622-01
 * @respaldo context/SPECs/SPEC-ARCH-20260622-01-fix-storage-upload-no-such-key.md
 * @respaldo context/decisions/ADR-ARCH-20260622-01-fix-storage-upload-no-such-key.md
 */

/**
 * Normaliza un filename para usarlo como segmento de path en Firebase Storage.
 *
 * Comportamiento:
 * - Decodifica entidades HTML/URL existentes (%XX) iterativamente (hasta 3 veces)
 *   para resolver doble/triple encoding de forma robusta.
 * - Quita caracteres no permitidos en object path: ? # [ ] *.
 *   Tambien reemplaza ¿ / ¡ (lookalikes Unicode de ? / !) para defensa adicional
 *   al firmar URL en clientes externos.
 * - Reemplaza separadores (/ \ : ;) por guion bajo.
 * - Colapsa espacios y guiones repetidos.
 * - Quita puntos al inicio (ocultan archivos en algunos sistemas).
 * - Trunca a 200 chars preservando extensión (Firebase permite hasta 1024 en path completo).
 * - Aplica NFC Unicode normalization.
 * - Si el filename queda vacio o solo con simbolos tras sanitizar, retorna "file".
 *
 * Nota: NO modifica el `nombreArchivo` que se persiste en la base de datos.
 * Solo transforma el segmento para construir el `fileKey` del bucket.
 */
export function sanitizeStorageKeySegment(raw: string): string {
  if (!raw || typeof raw !== "string") return "file";

  let s = raw.normalize("NFC").trim();

  // Detectar y corregir doble/triple encoding iterando hasta estabilizar.
  // Limitamos a 3 pasadas para evitar loops infinitos con strings patológicos.
  for (let i = 0; i < 3; i++) {
    try {
      const decoded = decodeURIComponent(s);
      if (decoded === s) break;
      s = decoded;
    } catch {
      break;
    }
  }

  // Quitar caracteres prohibidos en GCS object path.
  // También reemplazamos ¿ / ¡ (lookalikes de ? / !) para evitar
  // resultados inesperados al firmar URL en clientes externos.
  s = s.replace(/[?#[\]*¿¡]/g, "_");

  // Reemplazar separadores por guion bajo
  s = s.replace(/[\/\\:;]/g, "_");

  // Colapsar espacios y guiones repetidos
  s = s.replace(/\s+/g, " ").replace(/_{2,}/g, "_").replace(/[\u2010\u2011\-]{2,}/g, "-");

  // Quitar puntos al inicio (ocultan archivos en algunos sistemas)
  s = s.replace(/^\.+/, "");

  // Truncar preservando extensión
  if (s.length > 200) {
    const ext = s.includes(".") ? s.slice(s.lastIndexOf(".")) : "";
    const maxBase = 200 - ext.length;
    s = (maxBase > 0 ? s.slice(0, maxBase) : "") + ext;
  }

  // Si tras sanitizar no quedó ningún carácter alfanumérico/Unicode útil
  // (caso "???" → "___" o "..." → ""), devolver el fallback "file".
  // Consideramos "útil" cualquier letra (ASCII o Latin-1+Unicode BMP) o dígito.
  if (!/[a-zA-Z0-9\u00C0-\u024F\u00A1\u00BF]/.test(s)) return "file";

  return s || "file";
}