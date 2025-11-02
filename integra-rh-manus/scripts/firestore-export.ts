import fs from 'fs/promises';
import path from 'path';
import { db as firestore } from '../server/firebase';

type AnyRecord = Record<string, unknown>;

async function exportCollection(colName: string, outDir: string) {
  const snapshot = await firestore.collection(colName).get();
  const rows: AnyRecord[] = [];
  snapshot.forEach(doc => {
    const data = doc.data() as AnyRecord;
    rows.push({ id: doc.id, ...data });
  });

  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `${colName}.json`);
  await fs.writeFile(outPath, JSON.stringify(rows, null, 2), 'utf8');
  console.log(`[export] ${colName}: ${rows.length} registros → ${outPath}`);
}

async function main() {
  const outDir = path.join(process.cwd(), 'data', 'exports');
  await exportCollection('clients', outDir);
  await exportCollection('posts', outDir);
  await exportCollection('candidates', outDir); // Añadido para PVM-DATA-02
  console.log('[export] Finalizado');
}

main()
  .catch(err => {
    console.error('[export] Error:', err);
    process.exit(1);
  })
  .finally(() => {
    console.log('[export] Proceso terminado.');
    process.exit(0); // Asegura que el script termine y no se quede colgado
  });

